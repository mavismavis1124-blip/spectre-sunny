/**
 * Codex API Service
 * Real-time blockchain data via local server or Vercel serverless function
 */

// Use relative /api so Vite proxy (dev) or same-origin (prod) hits the backend. Start server for search/prices/trending.
const API_BASE = '/api';
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const VERCEL_API_URL = '/api/codex';

/**
 * Make request to API (relative /api → Vite proxy in dev → Express server)
 */
async function apiRequest(action, params = {}) {
  try {
    let url;
    // Prefer backend at /api (Express or Vite proxy to localhost:3001)
    if (action === 'search') {
      url = `${API_BASE}/tokens/search?q=${encodeURIComponent(params.q || '')}`;
      if (params.networks) url += `&networks=${params.networks}`;
    } else if (action === 'details') {
      url = `${API_BASE}/token/details?address=${encodeURIComponent(params.address || '')}&networkId=${params.networkId || 1}`;
    } else if (action === 'trending') {
      url = `${API_BASE}/tokens/trending`;
      if (params.networks) url += `?networks=${params.networks}`;
    } else if (action === 'prices') {
      const sym = params.symbols || '';
      if (sym.includes(',')) {
        url = `${API_BASE}/tokens/prices?symbols=${encodeURIComponent(sym)}`;
      } else {
        url = `${API_BASE}/tokens/price/${encodeURIComponent(sym)}`;
      }
    } else if (action === 'bars') {
      url = `${API_BASE}/bars?symbol=${encodeURIComponent(params.symbol || '')}&from=${params.from}&to=${params.to}&resolution=${params.resolution || '60'}`;
    } else if (action === 'trades') {
      url = `${API_BASE}/token/trades?address=${encodeURIComponent(params.address || '')}&networkId=${params.networkId || 1}&limit=${params.limit || 50}`;
    } else if (!isDev) {
      const searchParams = new URLSearchParams({ action, ...params });
      url = `${VERCEL_API_URL}?${searchParams}`;
    } else {
      url = `${API_BASE}/health`;
    }
    
    console.log('API Request:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Get token details by address
 */
export async function getTokenInfo(address, networkId = 1) {
  try {
    const result = await apiRequest('details', { address, networkId: String(networkId) });
    return { token: result };
  } catch (err) {
    console.error('Failed to get token info:', err);
    return null;
  }
}

/**
 * Get token price by exact symbol (for known/curated tokens).
 * Uses Codex API with CoinGecko fallback (handled by server/Vercel).
 */
export async function getTokenPriceBySymbol(symbol) {
  try {
    const result = await apiRequest('prices', { symbols: symbol });
    // Local server: single-symbol returns { price, change, ... } directly
    if (result.price !== undefined) {
      return {
        price: result.price || 0,
        change: result.change || 0,
        change24: result.change || 0,
        volume: result.volume || 0,
        marketCap: result.marketCap || 0,
      };
    }
    // Local batch or Vercel: keyed by symbol
    const key = (symbol || '').toUpperCase();
    const row = result[key] || result[symbol];
    const change = row?.change ?? row?.change24 ?? 0;
    return {
      price: row?.price ?? 0,
      change,
      change24: change,
      volume: row?.volume ?? 0,
      marketCap: row?.marketCap ?? 0,
    };
  } catch (err) {
    console.error(`Failed to get price for ${symbol}:`, err);
    return { price: 0, change24: 0 };
  }
}

// Binance pair name for symbols that don't match SYMBOLUSDT (e.g. PEPE -> 1000PEPEUSDT)
const BINANCE_SYMBOL_TO_PAIR = {
  PEPE: '1000PEPEUSDT',
  FLOKI: '1000FLOKIUSDT',
  BONK: 'BONKUSDT',
  WIF: 'WIFUSDT',
  SHIB: '1000SHIBUSDT',
};

/**
 * Get prices from Binance public API (no key, no rate limit for normal use).
 * Uses 24hr ticker – one request for all USDT pairs, then filter by symbols.
 * @param {string[]} symbols - e.g. ['BTC', 'ETH', 'SOL']
 * @returns {Promise<Record<string, { price: number, change: number, volume?: number, marketCap?: number }>>}
 */
export async function getTokenPricesFromBinance(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const list = [...new Set((Array.isArray(symbols) ? symbols : [symbols]).map((s) => (s || '').toUpperCase().trim()).filter(Boolean))];
  if (list.length === 0) return {};
  const symbolSet = new Set(list);
  const pairToSymbol = {};
  list.forEach((sym) => {
    const pair = BINANCE_SYMBOL_TO_PAIR[sym] || `${sym}USDT`;
    pairToSymbol[pair] = sym;
  });
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const tickers = await res.json();
    const out = {};
    for (const t of tickers || []) {
      const pair = (t.symbol || '').toUpperCase();
      if (!pair.endsWith('USDT')) continue;
      const sym = pairToSymbol[pair] ?? (symbolSet.has(pair.slice(0, -4)) ? pair.slice(0, -4) : null);
      if (!sym) continue;
      const price = parseFloat(t.lastPrice) || 0;
      const change = parseFloat(t.priceChangePercent) || 0;
      const volume = parseFloat(t.volume) || 0;
      out[sym] = { price, change, change24: change, volume, marketCap: 0, liquidity: 0 };
    }
    return out;
  } catch (err) {
    console.warn('getTokenPricesFromBinance failed:', err);
    return {};
  }
}

/**
 * Get prices for multiple symbols in one request (Codex + CoinGecko fallback).
 * @param {string[]} symbols - e.g. ['BTC', 'ETH', 'SOL']
 * @returns {Promise<Record<string, { price: number, change: number, volume?: number, marketCap?: number }>>}
 */
export async function getTokenPricesBatch(symbols) {
  if (!symbols || symbols.length === 0) {
    console.warn('getTokenPricesBatch: No symbols provided');
    return {};
  }
  try {
    const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : String(symbols);
    console.log('getTokenPricesBatch: Fetching prices for', symbolsStr);
    const result = await apiRequest('prices', { symbols: symbolsStr });
    console.log('getTokenPricesBatch: Raw API response:', result);
    
    // Local server batch returns { BTC: { price, change, ... }, ... } (keys may be mixed case)
    if (typeof result === 'object' && !result.price) {
      const out = {};
      const resultKeys = Object.keys(result || {});
      for (const sym of (Array.isArray(symbols) ? symbols : symbolsStr.split(','))) {
        const key = (sym || '').toUpperCase().trim();
        if (!key) continue;
        // Case-insensitive lookup (server may return "Btc" or "BTC")
        const resultKey = resultKeys.find((k) => (k || '').toUpperCase() === key);
        const row = resultKey != null ? result[resultKey] : (result[key] || result[sym] || null);
        if (!row || row.price == null) {
          if (!row) console.warn(`getTokenPricesBatch: No data for ${key}`);
          continue;
        }
        const change = row.change ?? row.change24 ?? 0;
        const changeNum = parseFloat(change) || 0;
        // Server/CoinGecko returns percentage (e.g. -2.5); Codex may return decimal - if |val| <= 1 assume decimal
        const changePercent = Math.abs(changeNum) <= 1 && changeNum !== 0 ? changeNum * 100 : changeNum;
        const toPercent = (val) => {
          const num = parseFloat(val) || 0;
          return Math.abs(num) <= 1 && num !== 0 ? num * 100 : num;
        };
        out[key] = {
          price: parseFloat(row.price) || 0,
          change: changePercent,
          change24: changePercent,
          change1h: toPercent(row.change1h ?? row.change1 ?? 0),
          change7d: toPercent(row.change7d ?? row.change7 ?? 0),
          change30d: toPercent(row.change30d ?? row.change30 ?? 0),
          change1y: toPercent(row.change1y ?? row.change365 ?? 0),
          volume: parseFloat(row.volume ?? row.volume24 ?? 0) || 0,
          marketCap: parseFloat(row.marketCap ?? 0) || 0,
          liquidity: parseFloat(row.liquidity ?? 0) || 0,
        };
      }
      console.log('getTokenPricesBatch: Processed prices:', Object.keys(out).length, 'tokens', out);
      return out;
    }
    // Single-symbol response shape (local server returns { price, change, ... } directly)
    const firstSym = Array.isArray(symbols) ? symbols[0] : (symbolsStr.split(',')[0] || symbols);
    const key = (firstSym || '').toString().toUpperCase().trim();
    return { [key]: { price: result.price || 0, change: result.change ?? result.change24 ?? 0, volume: result.volume ?? 0, marketCap: result.marketCap ?? 0 } };
  } catch (err) {
    console.error('getTokenPricesBatch failed:', err);
    return {};
  }
}

/**
 * Get detailed token info including price, socials, description
 * Used for the main token banner section
 */
export async function getDetailedTokenInfo(address, networkId = 1) {
  try {
    const result = await apiRequest('details', { address, networkId: String(networkId) });
    return result;
  } catch (err) {
    console.error('Failed to get detailed token info:', err);
    return null;
  }
}

/**
 * Look up token by contract address across multiple networks
 */
export async function lookupTokenByAddress(address) {
  try {
    const result = await apiRequest('search', { q: address });
    if (result?.results && result.results.length > 0) {
      const first = result.results[0];
      return {
        ...first.token,
        priceUSD: first.priceUSD,
        change24: first.change24,
        volume: first.volume24,
        liquidity: first.liquidity,
        marketCap: first.marketCap,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to lookup token:', err);
    return null;
  }
}

/**
 * Get token with price data by address
 */
export async function getTokenWithPrice(address, networkId = 1) {
  try {
    const result = await apiRequest('details', { address, networkId: String(networkId) });
    return result || null;
  } catch (err) {
    console.error('Failed to get token with price:', err);
    return null;
  }
}

/**
 * Get token price and stats
 */
export async function getTokenPrice(address, networkId = 1) {
  try {
    const result = await apiRequest('details', { address, networkId: String(networkId) });
    return { token: result };
  } catch (err) {
    console.error('Failed to get token price:', err);
    return null;
  }
}

/**
 * Get detailed token stats including price, volume, liquidity
 */
export async function getDetailedTokenStats(address, networkId = 1) {
  try {
    const result = await apiRequest('details', { address, networkId: String(networkId) });
    return { token: result };
  } catch (err) {
    console.error('Failed to get token stats:', err);
    return null;
  }
}

/**
 * Get price bars (OHLCV) for charting
 */
export async function getBars(symbol, resolution = '60', from, to, networkId = 1) {
  try {
    const result = await apiRequest('bars', { 
      symbol, 
      resolution, 
      from: from.toString(), 
      to: to.toString(),
      networkId: networkId.toString()
    });
    return { getBars: result?.bars || [] };
  } catch (err) {
    console.error('Failed to fetch bars:', err);
    return { getBars: [] };
  }
}

/**
 * Search for tokens by name or symbol
 */
export async function searchTokens(search, networkIds = [1, 56, 137, 42161, 8453]) {
  try {
    const isEvmAddress = search && search.startsWith('0x') && search.length === 42;
    const isSolanaAddress = search && !search.startsWith('0x') && search.length >= 32 && search.length <= 44;
    const isContractAddress = isEvmAddress || isSolanaAddress;
    
    const params = { q: search };
    if (!isContractAddress) {
      params.networks = networkIds.join(',');
    }
    
    const result = await apiRequest('search', params);
    return { filterTokens: { results: result?.results || [] } };
  } catch (err) {
    console.error('Failed to search tokens:', err);
    return { filterTokens: { results: [] } };
  }
}

/**
 * Get trending/top tokens by volume
 */
export async function getTrendingTokens(networkIds = [1, 56, 137, 42161, 8453], limit = 20) {
  try {
    const result = await apiRequest('trending', { networks: networkIds.join(',') });
    return { filterTokens: { results: result?.results || [] } };
  } catch (err) {
    console.error('Failed to get trending tokens:', err);
    return { filterTokens: { results: [] } };
  }
}

/**
 * Get token pairs/pools - returns empty for now
 */
export async function getTokenPairs(tokenAddress, networkId = 1) {
  return { listPairsForToken: [] };
}

/**
 * Get latest trades for a token
 */
export async function getLatestTrades(tokenAddress, networkId = 1, limit = 50) {
  try {
    const result = await apiRequest('trades', {
      address: tokenAddress,
      networkId: networkId.toString(),
      limit: limit.toString()
    });
    return result;
  } catch (err) {
    console.error('Failed to fetch trades:', err);
    return { trades: [], pairs: [] };
  }
}

/**
 * Get network name from ID
 */
export function getNetworkName(networkId) {
  const networks = {
    1: 'ETH',
    56: 'BSC',
    137: 'MATIC',
    42161: 'ARB',
    8453: 'BASE',
    43114: 'AVAX',
    10: 'OP',
    250: 'FTM',
    // Solana uses different addressing
  };
  return networks[networkId] || 'Unknown';
}

/**
 * Get network ID from name
 */
export function getNetworkId(networkName) {
  const networks = {
    'ETH': 1,
    'ETHEREUM': 1,
    'BSC': 56,
    'BINANCE': 56,
    'MATIC': 137,
    'POLYGON': 137,
    'ARB': 42161,
    'ARBITRUM': 42161,
    'BASE': 8453,
    'AVAX': 43114,
    'AVALANCHE': 43114,
    'OP': 10,
    'OPTIMISM': 10,
    'FTM': 250,
    'FANTOM': 250,
  };
  return networks[networkName.toUpperCase()] || 1;
}

/**
 * Format large numbers with comma separators (e.g., 1200 -> $1,200)
 */
export function formatLargeNumber(num) {
  // Convert to number and validate
  const n = typeof num === 'number' ? num : parseFloat(num);
  if (!n || isNaN(n) || !isFinite(n)) return '$0';
  
  const absNum = Math.abs(n);
  
  // For very large numbers, use abbreviated format
  if (absNum >= 1e9) return `$${(n / 1e9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
  if (absNum >= 1e6) return `$${(n / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  
  // For thousands, no decimals
  if (absNum >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  
  // For $100-$999, show 1 decimal
  if (absNum >= 100) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  
  // For smaller values, show 2 decimals
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format price based on magnitude
 */
export function formatPrice(price) {
  // Convert to number and validate
  const p = typeof price === 'number' ? price : parseFloat(price);
  if (!p || isNaN(p) || !isFinite(p)) return '$0.00';
  
  if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  return `$${p.toFixed(8)}`;
}

/**
 * Compact price for mobile: $97.2K, $1.2M, $3.4B or 2–4 decimals for small values
 */
export function formatPriceShort(price) {
  const p = typeof price === 'number' ? price : parseFloat(price);
  if (!p || isNaN(p) || !isFinite(p)) return '$0';
  const abs = Math.abs(p);
  if (abs >= 1e9) return `$${(p / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(p / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(p / 1e3).toFixed(1)}K`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

/**
 * Compact large number for mobile: $1.2M, $3.4B (1–2 decimals)
 */
export function formatLargeNumberShort(num) {
  const n = typeof num === 'number' ? num : parseFloat(num);
  if (!n || isNaN(n) || !isFinite(n)) return '$0';
  const absNum = Math.abs(n);
  if (absNum >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (absNum >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (absNum >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (absNum >= 1) return `$${n.toFixed(1)}`;
  return `$${n.toFixed(2)}`;
}

// Well-known token addresses for quick lookup
export const KNOWN_TOKENS = {
  // Ethereum Mainnet
  ETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', networkId: 1 }, // WETH
  USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', networkId: 1 },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', networkId: 1 },
  LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', networkId: 1 },
  UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', networkId: 1 },
  AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', networkId: 1 },
  PEPE: { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', networkId: 1 },
  SHIB: { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', networkId: 1 },
  // Arbitrum
  ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', networkId: 42161 },
  // Base
  BASE_ETH: { address: '0x4200000000000000000000000000000000000006', networkId: 8453 },
};

export default {
  getTokenInfo,
  getTokenPrice,
  getDetailedTokenStats,
  getBars,
  searchTokens,
  getTrendingTokens,
  getTokenPairs,
  getLatestTrades,
  getNetworkName,
  getNetworkId,
  formatLargeNumber,
  formatPrice,
  KNOWN_TOKENS,
};
