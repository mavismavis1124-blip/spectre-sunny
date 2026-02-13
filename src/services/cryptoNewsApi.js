/**
 * Crypto news – prefers CryptoPanic (cryptopanic.com) via /api/cryptopanic, fallback to /api/news (CryptoCompare).
 * https://cryptopanic.com/developers/ | https://min-api.cryptocompare.com/data/v2/news/
 */

const CRYPTOCOMPARE_NEWS = 'https://min-api.cryptocompare.com/data/v2/news'

/** Map symbol to CryptoCompare categories for filtering (optional) */
const SYMBOL_CATEGORIES = {
  BTC: ['BTC', 'BITCOIN', 'MARKET', 'CRYPTOCURRENCY'],
  ETH: ['ETH', 'ETHEREUM', 'MARKET', 'CRYPTOCURRENCY'],
  SOL: ['SOL', 'SOLANA', 'ALTCOIN', 'MARKET', 'CRYPTOCURRENCY'],
}

let newsCache = []
let newsCacheTime = 0
const NEWS_CACHE_TTL = 3 * 60 * 1000 // 3 min

/**
 * Fetch news from CryptoPanic (cryptopanic.com). Same shape as getCryptoNews.
 * @param {string} [symbol] - e.g. 'BTC', 'ETH', 'SOL'
 * @param {number} [limit=10] - max items
 * @returns {Promise<Array<{ id, title, url, summary, source, imageUrl, publishedOn, categories }>>}
 */
export async function getCryptoPanicNews(symbol, limit = 10) {
  try {
    const proxyUrl = `/api/cryptopanic?limit=${limit}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''}`
    const res = await fetch(proxyUrl, { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const json = await res.json()
    const raw = Array.isArray(json.results) ? json.results : []
    return raw.map((item) => ({
      id: String(item.id),
      title: item.title || '',
      url: item.url || '#',
      summary: item.summary || (item.title || '').slice(0, 160) + (item.title && item.title.length > 160 ? '…' : ''),
      source: item.source || 'CryptoPanic',
      imageUrl: item.imageUrl || null,
      publishedOn: item.publishedOn || 0,
      categories: item.categories || [],
    }))
  } catch (_) {
    return []
  }
}

/**
 * Fetch latest crypto news. Tries CryptoPanic first, then /api/news (CryptoCompare).
 * @param {string} [symbol] - e.g. 'BTC', 'ETH', 'SOL'
 * @param {number} [limit=8] - max items
 * @returns {Promise<Array<{ id: string, title: string, url: string, summary: string, source: string, imageUrl: string, time: string, categories: string }>>}
 */
export async function getCryptoNews(symbol, limit = 8) {
  const now = Date.now()
  if (newsCache.length && (now - newsCacheTime) < NEWS_CACHE_TTL) {
    return filterAndSlice(newsCache, symbol, limit)
  }
  try {
    const panic = await getCryptoPanicNews(symbol, limit)
    if (panic.length > 0) {
      newsCache = panic
      newsCacheTime = now
      return panic.slice(0, limit)
    }
  } catch (_) {}
  try {
    const proxyUrl = `/api/news?lang=EN&limit=${limit}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''}`
    const res = await fetch(proxyUrl, { method: 'GET', headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = await res.json()
      const raw = Array.isArray(json.Data) ? json.Data : []
      newsCache = raw.map((item) => ({
        id: String(item.id),
        title: item.title || '',
        url: item.url || item.guid || '#',
        summary: (item.summary != null ? item.summary : (item.body || '').replace(/<[^>]+>/g, '').slice(0, 160)) + (item.body && item.body.length > 160 ? '…' : ''),
        source: item.source || 'Crypto',
        imageUrl: item.imageUrl || item.imageurl || null,
        publishedOn: item.publishedOn ?? item.published_on ?? 0,
        categories: item.categories || (item.categories ? (item.categories || '').split('|').filter(Boolean).map((c) => c.toUpperCase()) : []),
      }))
      newsCacheTime = now
      return filterAndSlice(newsCache, symbol, limit)
    }
  } catch (_) {}
  try {
    const res = await fetch(`${CRYPTOCOMPARE_NEWS}?lang=EN`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return newsCache.length ? filterAndSlice(newsCache, symbol, limit) : []
    const json = await res.json()
    const raw = Array.isArray(json.Data) ? json.Data : []
    newsCache = raw.map((item) => ({
      id: String(item.id),
      title: item.title || '',
      url: item.url || item.guid || '#',
      summary: (item.body || '').replace(/<[^>]+>/g, '').slice(0, 160) + (item.body && item.body.length > 160 ? '…' : ''),
      source: (item.source_info && item.source_info.name) || item.source || 'Crypto',
      imageUrl: item.imageurl || null,
      publishedOn: item.published_on || 0,
      categories: (item.categories || '').split('|').filter(Boolean).map((c) => c.toUpperCase()),
    }))
    newsCacheTime = now
    return filterAndSlice(newsCache, symbol, limit)
  } catch (err) {
    console.warn('Crypto news fetch failed:', err)
    return newsCache.length ? filterAndSlice(newsCache, symbol, limit) : []
  }
}

function filterAndSlice(list, symbol, limit) {
  let out = list
  if (symbol && SYMBOL_CATEGORIES[symbol]) {
    const cats = SYMBOL_CATEGORIES[symbol]
    const symbolLower = symbol.toLowerCase()
    out = list.filter((item) => {
      const titleLower = (item.title || '').toLowerCase()
      const hasInTitle = titleLower.includes(symbolLower) || titleLower.includes(symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : 'solana')
      if (hasInTitle) return true
      return (item.categories || []).some((c) => cats.includes(c))
    })
    if (out.length < 3) out = list.slice(0, limit * 2)
  }
  return out.slice(0, limit)
}

/**
 * Fetch market news from RSS feeds (CoinDesk, Cointelegraph). No API key. Uses /api/news/rss.
 * @param {string} [symbol] - e.g. 'BTC', 'ETH', 'SOL'
 * @param {number} [limit=10] - max items
 * @returns {Promise<Array<{ id, title, url, summary, source, imageUrl, publishedOn, categories }>>}
 */
export async function getRssMarketNews(symbol, limit = 10) {
  try {
    const url = `/api/news/rss?limit=${limit}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''}`
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const json = await res.json()
    const raw = Array.isArray(json.results) ? json.results : []
    return raw.map((item) => ({
      id: String(item.id),
      title: item.title || '',
      url: item.url || '#',
      summary: item.summary || (item.title || '').slice(0, 160) + (item.title && item.title.length > 160 ? '…' : ''),
      source: item.source || 'RSS',
      imageUrl: item.imageUrl || null,
      publishedOn: item.publishedOn || 0,
      categories: item.categories || [],
    }))
  } catch (_) {
    return []
  }
}

export default { getCryptoNews, getRssMarketNews }
