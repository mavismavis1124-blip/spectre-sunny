const BINANCE_BASE_URL = 'https://api.binance.com/api/v3'
const DEFAULT_QUOTE = 'USDT'
/**
 * Top coin prices: Binance first (proxy or CORS), then CoinGecko free API.
 * Same return shape so Discover always gets real-time prices.
 */
const BINANCE_TICKER_URL = '/api/binance-ticker'
const COINGECKO_SIMPLE_PRICE = 'https://api.coingecko.com/api/v3/simple/price'
const COINGECKO_COINS_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets'

/** Binance uses USDT pairs */
const SYMBOL_TO_PAIR = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  ARB: 'ARBUSDT',
  OP: 'OPUSDT',
  MATIC: 'MATICUSDT',
  AVAX: 'AVAXUSDT',
  LINK: 'LINKUSDT',
  UNI: 'UNIUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  DOT: 'DOTUSDT',
  PEPE: 'PEPEUSDT',
  SHIB: 'SHIBUSDT',
  WIF: 'WIFUSDT',
  BONK: 'BONKUSDT',
  FLOKI: 'FLOKIUSDT',
  NEAR: 'NEARUSDT',
  APT: 'APTUSDT',
  SUI: 'SUIUSDT',
  INJ: 'INJUSDT',
  AAVE: 'AAVEUSDT',
  FET: 'FETUSDT',
  TAO: 'TAOUSDT',
  RENDER: 'RENDERUSDT',
  GRT: 'GRTUSDT',
  USDT: null,
  USDC: null,
}

/** Symbol → CoinGecko id for fallback when Binance is blocked/unavailable */
const SYMBOL_TO_COINGECKO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
  INJ: 'injective-protocol',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  GRT: 'the-graph',
  RENDER: 'render-token',
  RNDR: 'render-token',
  FET: 'fetch-ai',
  TAO: 'bittensor',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  SHIB: 'shiba-inu',
  FLOKI: 'floki',
  SPECTRE: 'spectre-ai',
}

/**
 * Fetch 24h ticker for all symbols (one request), then map to requested symbols.
 * @param {string[]} symbols - e.g. ['BTC', 'ETH', 'SOL']
 * @returns {Promise<Record<string, { price: number, change: number, volume: number, marketCap?: number }>>}
 */
export async function getBinancePrices(symbols) {
  if (!symbols || symbols.length === 0) return {}

  const pairs = symbols
    .map((s) => (typeof s === 'string' ? s.toUpperCase() : s))
    .filter((s) => s && s !== 'USDT' && s !== 'USDC')
    .map((s) => SYMBOL_TO_PAIR[s] || `${s}USDT`)

  if (pairs.length === 0) {
    const out = {}
    if (symbols.map((s) => (typeof s === 'string' ? s : '').toUpperCase()).includes('USDT')) out['USDT'] = { price: 1, change: 0, volume: 0 }
    if (symbols.map((s) => (typeof s === 'string' ? s : '').toUpperCase()).includes('USDC')) out['USDC'] = { price: 1, change: 0, volume: 0 }
    return out
  }

  const parseTickers = (all) => {
    const byPair = {}
    if (Array.isArray(all)) {
      all.forEach((t) => { byPair[t.symbol] = t })
    }
    const result = {}
    symbols.forEach((sym) => {
      const S = typeof sym === 'string' ? sym.toUpperCase() : sym
      if (S === 'USDT' || S === 'USDC') {
        result[S] = { price: 1, change: 0, volume: 0 }
        return
      }
      const pair = SYMBOL_TO_PAIR[S] || `${S}USDT`
      const t = byPair[pair]
      if (!t || t.lastPrice == null) return
      const price = parseFloat(t.lastPrice) || 0
      const change = parseFloat(t.priceChangePercent) || 0
      const volume = parseFloat(t.quoteVolume) || 0
      result[S] = { price, change, volume }
    })
    return result
  }

  const tryFetch = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  try {
    return parseTickers(await tryFetch(BINANCE_TICKER_URL))
  } catch (err1) {
    try {
      const direct = 'https://api.binance.com/api/v3/ticker/24hr'
      const all = await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`)
      return parseTickers(all)
    } catch (err2) {
      console.warn('Binance prices failed:', err1.message, err2.message)
      return {}
    }
  }
}

/**
 * Fetch price, market_cap, total_volume from CoinGecko coins/markets (one request, all fields).
 * Same shape as getBinancePrices plus marketCap and liquidity (volume used as liquidity proxy).
 */
async function getCoinGeckoPrices(symbols) {
  if (!symbols || symbols.length === 0) return {}
  const ids = [...new Set(
    symbols
      .map((s) => (typeof s === 'string' ? s.toUpperCase() : s))
      .filter(Boolean)
      .map((s) => SYMBOL_TO_COINGECKO_ID[s])
      .filter(Boolean)
  )]
  if (ids.length === 0) {
    const out = {}
    symbols.forEach((sym) => {
      const S = typeof sym === 'string' ? sym.toUpperCase() : sym
      if (S === 'USDT' || S === 'USDC') out[S] = { price: 1, change: 0, volume: 0, marketCap: 0 }
    })
    return out
  }
  const url = `${COINGECKO_COINS_MARKETS}?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=1h,24h,7d,30d,1y`

  const parseMarkets = (data) => {
    if (!Array.isArray(data)) return null
    const result = {}
    symbols.forEach((sym) => {
      const S = typeof sym === 'string' ? sym.toUpperCase() : sym
      if (S === 'USDT' || S === 'USDC') {
        result[S] = { price: 1, change: 0, change1h: 0, change7d: 0, change30d: 0, change1y: 0, volume: 0, marketCap: 0, liquidity: 0 }
        return
      }
      const id = SYMBOL_TO_COINGECKO_ID[S]
      if (!id) return
      const row = data.find((c) => (c.id || '').toLowerCase() === id.toLowerCase())
      if (!row || row.current_price == null) return
      const price = Number(row.current_price) || 0
      const marketCap = Number(row.market_cap) || 0
      const volume = Number(row.total_volume) || 0
      const change = row.price_change_percentage_24h_in_currency != null ? Number(row.price_change_percentage_24h_in_currency) : (row.price_change_percentage_24h != null ? Number(row.price_change_percentage_24h) : 0)
      const change1h = row.price_change_percentage_1h_in_currency != null ? Number(row.price_change_percentage_1h_in_currency) : 0
      const change7d = row.price_change_percentage_7d_in_currency != null ? Number(row.price_change_percentage_7d_in_currency) : 0
      const change30d = row.price_change_percentage_30d_in_currency != null ? Number(row.price_change_percentage_30d_in_currency) : 0
      const change1y = row.price_change_percentage_1y_in_currency != null ? Number(row.price_change_percentage_1y_in_currency) : (row.price_change_percentage_1y != null ? Number(row.price_change_percentage_1y) : 0)
      result[S] = {
        price,
        change,
        change1h,
        change7d,
        change30d,
        change1y,
        volume,
        marketCap,
        liquidity: volume,
      }
    })
    return result
  }

  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const result = parseMarkets(data)
    if (result && Object.keys(result).length > 0) return result
  } catch (err) {
    console.warn('CoinGecko markets direct:', err.message)
  }

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const data = JSON.parse(text)
    const result = parseMarkets(data)
    if (result && Object.keys(result).length > 0) return result
  } catch (err) {
    console.warn('CoinGecko markets via proxy:', err.message)
  }
  return {}
}

/**
 * Top coin prices: CoinGecko for full data + Binance to fill gaps.
 * Always try both so meme coins/watchlist tokens get prices even when CoinGecko is rate-limited.
 */
export async function getTopCoinPrices(symbols) {
  // Fetch both in parallel
  const [fromCoinGecko, fromBinance] = await Promise.all([
    getCoinGeckoPrices(symbols).catch(() => ({})),
    getBinancePrices(symbols).catch(() => ({})),
  ])

  // Start with CoinGecko (richer data: marketCap, 7d change, etc.)
  const merged = { ...fromCoinGecko }

  // Fill in any missing symbols from Binance (handles rate limits, missing CoinGecko mappings)
  Object.entries(fromBinance).forEach(([symbol, data]) => {
    if (!merged[symbol] && data?.price > 0) {
      merged[symbol] = data
    }
  })

  return merged
}

/** Map Codex resolution to Binance kline interval */
const RESOLUTION_TO_BINANCE_INTERVAL = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  '1D': '1d',
  '1W': '1w',
}

/**
 * Fetch OHLCV klines from Binance for candle/line charts.
 * Used when Codex returns no data (e.g. Research Zone with symbol-only BTC/ETH/SOL).
 * @param {string} symbol - e.g. 'BTC', 'ETH', 'SOL'
 * @param {string} resolution - Codex-style: '1','5','15','60','240','1D','1W'
 * @param {number} from - Unix seconds
 * @param {number} to - Unix seconds
 * @returns {Promise<{ getBars: Array<{ t: number, o: number, h: number, l: number, c: number, v: number }> }>}
 */
export async function getBinanceKlines(symbol, resolution = '60', from, to) {
  const pair = SYMBOL_TO_PAIR[symbol?.toUpperCase()] || `${(symbol || '').toUpperCase()}USDT`
  const interval = RESOLUTION_TO_BINANCE_INTERVAL[resolution] || '1h'
  const startTime = from * 1000
  const endTime = to * 1000
  const limit = 1000
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return { getBars: [] }
    }
    const getBars = rows.map((row) => ({
      t: Math.floor(row[0] / 1000),
      o: parseFloat(row[1]) || 0,
      h: parseFloat(row[2]) || 0,
      l: parseFloat(row[3]) || 0,
      c: parseFloat(row[4]) || 0,
      v: parseFloat(row[5]) || 0,
    }))
    return { getBars }
  } catch (err) {
    console.warn('Binance klines failed:', err.message)
    return { getBars: [] }
  }
}
