/**
 * CoinGecko API Service
 * Used for major tokens (BTC, ETH, SOL, etc.) - reliable, no API key needed
 * Free tier: 10-30 calls/minute, we cache aggressively
 */

import { SYMBOL_TO_COINGECKO_ID, COINGECKO_LOGOS, MAJOR_TOKEN_INFO } from '../constants/majorTokens';

// Route through backend proxy to use CoinGecko API key for higher rate limits
const COINGECKO_API = '/api/coingecko';

// Cache for prices - avoid redundant calls
let priceCache = {};
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds cache

// Cache for top coins markets data - fetch 250 at a time, paginate client-side
let allCoinsCache = { data: [], _ts: 0 };
let topCoinsCacheTTL = 5 * 60 * 1000; // 5 minutes cache for market data (avoid rate limits)
let fetchingAllCoins = false;
let fetchPromise = null;

/**
 * Fetch all top 1000 coins in batches of 250 (only 4 API calls), cache for 5 min
 */
async function fetchAllTopCoins() {
  if (fetchingAllCoins && fetchPromise) {
    return fetchPromise;
  }

  fetchingAllCoins = true;
  fetchPromise = (async () => {
    const allCoins = [];

    // Fetch 4 pages of 250 coins each = 1000 coins total
    for (let apiPage = 1; apiPage <= 4; apiPage++) {
      try {
        const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${apiPage}&sparkline=true&price_change_percentage=1h,24h,7d,30d`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          console.warn(`CoinGecko API error on page ${apiPage}: ${res.status}`);
          // If we have partial data, continue with what we have
          if (allCoins.length > 0) break;
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          allCoins.push(...data);
        }

        // Small delay between requests to avoid rate limiting
        if (apiPage < 4) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (err) {
        console.warn(`Failed to fetch page ${apiPage}:`, err);
        if (allCoins.length > 0) break;
        throw err;
      }
    }

    return allCoins;
  })();

  try {
    const result = await fetchPromise;
    allCoinsCache = { data: result, _ts: Date.now() };
    return result;
  } finally {
    fetchingAllCoins = false;
    fetchPromise = null;
  }
}

/**
 * Fetch one page of top coins by market cap (for Top Coins tab).
 * @param {number} page - 1-based page (1..40 for 1000 coins at 25 per page)
 * @param {number} perPage - items per page (default 25)
 * @returns {Promise<Array>} - array of { id, symbol, name, image, current_price, market_cap_rank, ... }
 */
export async function getTopCoinsMarketsPage(page = 1, perPage = 25) {
  const now = Date.now();

  // Use cached data if valid
  if (allCoinsCache.data.length > 0 && (now - allCoinsCache._ts < topCoinsCacheTTL)) {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return allCoinsCache.data.slice(startIndex, endIndex);
  }

  try {
    // Fetch all 1000 coins (4 API calls), then paginate client-side
    const allCoins = await fetchAllTopCoins();

    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return allCoins.slice(startIndex, endIndex);
  } catch (err) {
    console.warn('CoinGecko fetch failed:', err, 'using fallback');
    // Return stale cache if available
    if (allCoinsCache.data.length > 0) {
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      return allCoinsCache.data.slice(startIndex, endIndex);
    }
    return getTopCoinsFallback(page, perPage);
  }
}

/**
 * Fallback data for when CoinGecko API is unavailable (rate limited, etc.)
 * Returns static mock data for top 1000 coins
 */
function getTopCoinsFallback(page = 1, perPage = 25) {
  const TOP_1000_COINS = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 78450, market_cap: 1567000000000, market_cap_rank: 1, total_volume: 93890000000, price_change_percentage_24h: 1.74, price_change_percentage_1h_in_currency: 0.3, price_change_percentage_7d_in_currency: -11.0, price_change_percentage_30d_in_currency: -12.9 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 2330, market_cap: 281680000000, market_cap_rank: 2, total_volume: 57720000000, price_change_percentage_24h: 0.65, price_change_percentage_1h_in_currency: 0.2, price_change_percentage_7d_in_currency: -20.5, price_change_percentage_30d_in_currency: -25.1 },
    { id: 'tether', symbol: 'usdt', name: 'Tether', image: 'https://assets.coingecko.com/coins/images/325/small/Tether.png', current_price: 0.9992, market_cap: 185210000000, market_cap_rank: 3, total_volume: 159370000000, price_change_percentage_24h: 0.03, price_change_percentage_1h_in_currency: 0.01, price_change_percentage_7d_in_currency: 0.02, price_change_percentage_30d_in_currency: -0.03 },
    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', current_price: 770.63, market_cap: 105090000000, market_cap_rank: 4, total_volume: 2590000000, price_change_percentage_24h: 1.86, price_change_percentage_1h_in_currency: 0.4, price_change_percentage_7d_in_currency: -12.2, price_change_percentage_30d_in_currency: -12.1 },
    { id: 'ripple', symbol: 'xrp', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', current_price: 1.63, market_cap: 98970000000, market_cap_rank: 5, total_volume: 5510000000, price_change_percentage_24h: 2.29, price_change_percentage_1h_in_currency: 0.5, price_change_percentage_7d_in_currency: -14.6, price_change_percentage_30d_in_currency: -18.9 },
    { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 103.90, market_cap: 58830000000, market_cap_rank: 6, total_volume: 7280000000, price_change_percentage_24h: 2.42, price_change_percentage_1h_in_currency: 0.6, price_change_percentage_7d_in_currency: -18.3, price_change_percentage_30d_in_currency: -22.4 },
    { id: 'usd-coin', symbol: 'usdc', name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', current_price: 1.00, market_cap: 56780000000, market_cap_rank: 7, total_volume: 12340000000, price_change_percentage_24h: 0.01, price_change_percentage_1h_in_currency: 0.0, price_change_percentage_7d_in_currency: 0.01, price_change_percentage_30d_in_currency: 0.0 },
    { id: 'cardano', symbol: 'ada', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', current_price: 0.52, market_cap: 19230000000, market_cap_rank: 8, total_volume: 1120000000, price_change_percentage_24h: 1.8, price_change_percentage_1h_in_currency: 0.3, price_change_percentage_7d_in_currency: -15.2, price_change_percentage_30d_in_currency: -20.1 },
    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png', current_price: 0.17, market_cap: 25120000000, market_cap_rank: 9, total_volume: 2890000000, price_change_percentage_24h: 3.1, price_change_percentage_1h_in_currency: 0.7, price_change_percentage_7d_in_currency: -22.4, price_change_percentage_30d_in_currency: -28.3 },
    { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', current_price: 10.13, market_cap: 4320000000, market_cap_rank: 10, total_volume: 456000000, price_change_percentage_24h: 2.59, price_change_percentage_1h_in_currency: 0.5, price_change_percentage_7d_in_currency: -17.8, price_change_percentage_30d_in_currency: -24.6 },
    { id: 'chainlink', symbol: 'link', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', current_price: 9.79, market_cap: 6450000000, market_cap_rank: 11, total_volume: 678000000, price_change_percentage_24h: 2.82, price_change_percentage_1h_in_currency: 0.4, price_change_percentage_7d_in_currency: -16.5, price_change_percentage_30d_in_currency: -21.2 },
    { id: 'uniswap', symbol: 'uni', name: 'Uniswap', image: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg', current_price: 3.92, market_cap: 2890000000, market_cap_rank: 12, total_volume: 234000000, price_change_percentage_24h: 1.72, price_change_percentage_1h_in_currency: 0.3, price_change_percentage_7d_in_currency: -19.3, price_change_percentage_30d_in_currency: -25.8 },
    { id: 'polkadot', symbol: 'dot', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', current_price: 3.45, market_cap: 5670000000, market_cap_rank: 13, total_volume: 345000000, price_change_percentage_24h: 1.5, price_change_percentage_1h_in_currency: 0.2, price_change_percentage_7d_in_currency: -14.8, price_change_percentage_30d_in_currency: -19.7 },
    { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png', current_price: 72.50, market_cap: 5430000000, market_cap_rank: 14, total_volume: 567000000, price_change_percentage_24h: 2.1, price_change_percentage_1h_in_currency: 0.4, price_change_percentage_7d_in_currency: -13.2, price_change_percentage_30d_in_currency: -17.5 },
    { id: 'cosmos', symbol: 'atom', name: 'Cosmos', image: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png', current_price: 4.12, market_cap: 1780000000, market_cap_rank: 15, total_volume: 189000000, price_change_percentage_24h: 1.9, price_change_percentage_1h_in_currency: 0.3, price_change_percentage_7d_in_currency: -15.6, price_change_percentage_30d_in_currency: -21.3 },
    { id: 'arbitrum', symbol: 'arb', name: 'Arbitrum', image: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', current_price: 0.1375, market_cap: 1234000000, market_cap_rank: 16, total_volume: 156000000, price_change_percentage_24h: 0.33, price_change_percentage_1h_in_currency: 0.1, price_change_percentage_7d_in_currency: -18.9, price_change_percentage_30d_in_currency: -24.5 },
    { id: 'optimism', symbol: 'op', name: 'Optimism', image: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png', current_price: 0.2294, market_cap: 987000000, market_cap_rank: 17, total_volume: 123000000, price_change_percentage_24h: 0.68, price_change_percentage_1h_in_currency: 0.2, price_change_percentage_7d_in_currency: -17.2, price_change_percentage_30d_in_currency: -22.8 },
    { id: 'matic-network', symbol: 'matic', name: 'Polygon', image: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png', current_price: 0.18, market_cap: 1890000000, market_cap_rank: 18, total_volume: 234000000, price_change_percentage_24h: 1.2, price_change_percentage_1h_in_currency: 0.2, price_change_percentage_7d_in_currency: -16.4, price_change_percentage_30d_in_currency: -21.9 },
    { id: 'near', symbol: 'near', name: 'NEAR Protocol', image: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg', current_price: 1.85, market_cap: 2340000000, market_cap_rank: 19, total_volume: 278000000, price_change_percentage_24h: 2.4, price_change_percentage_1h_in_currency: 0.5, price_change_percentage_7d_in_currency: -19.8, price_change_percentage_30d_in_currency: -26.2 },
    { id: 'aptos', symbol: 'apt', name: 'Aptos', image: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png', current_price: 3.67, market_cap: 2120000000, market_cap_rank: 20, total_volume: 167000000, price_change_percentage_24h: 1.8, price_change_percentage_1h_in_currency: 0.3, price_change_percentage_7d_in_currency: -15.3, price_change_percentage_30d_in_currency: -20.7 },
    { id: 'sui', symbol: 'sui', name: 'Sui', image: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg', current_price: 1.42, market_cap: 4560000000, market_cap_rank: 21, total_volume: 534000000, price_change_percentage_24h: 3.2, price_change_percentage_1h_in_currency: 0.6, price_change_percentage_7d_in_currency: -21.4, price_change_percentage_30d_in_currency: -27.8 },
    { id: 'injective-protocol', symbol: 'inj', name: 'Injective', image: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png', current_price: 7.23, market_cap: 756000000, market_cap_rank: 22, total_volume: 89000000, price_change_percentage_24h: 2.1, price_change_percentage_1h_in_currency: 0.4, price_change_percentage_7d_in_currency: -17.6, price_change_percentage_30d_in_currency: -23.4 },
    { id: 'render-token', symbol: 'rndr', name: 'Render', image: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png', current_price: 2.45, market_cap: 1340000000, market_cap_rank: 23, total_volume: 145000000, price_change_percentage_24h: 2.8, price_change_percentage_1h_in_currency: 0.5, price_change_percentage_7d_in_currency: -20.2, price_change_percentage_30d_in_currency: -26.5 },
    { id: 'fetch-ai', symbol: 'fet', name: 'Fetch.ai', image: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg', current_price: 0.38, market_cap: 978000000, market_cap_rank: 24, total_volume: 112000000, price_change_percentage_24h: 3.5, price_change_percentage_1h_in_currency: 0.7, price_change_percentage_7d_in_currency: -22.8, price_change_percentage_30d_in_currency: -29.3 },
    { id: 'pepe', symbol: 'pepe', name: 'Pepe', image: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg', current_price: 0.0000045, market_cap: 1890000000, market_cap_rank: 25, total_volume: 456000000, price_change_percentage_24h: 4.2, price_change_percentage_1h_in_currency: 0.9, price_change_percentage_7d_in_currency: -25.3, price_change_percentage_30d_in_currency: -32.1 },
  ];

  // Generate more coins for pages 2-40 (synthetic data based on patterns)
  const allCoins = [...TOP_1000_COINS];
  const baseCoins = TOP_1000_COINS.slice(0, 10);

  for (let i = 26; i <= 1000; i++) {
    const base = baseCoins[i % 10];
    const priceMultiplier = Math.max(0.001, 1 / Math.pow(i / 10, 1.2));
    const mcapMultiplier = Math.max(10000000, 1567000000000 / Math.pow(i, 1.5));

    allCoins.push({
      id: `coin-${i}`,
      symbol: `C${i}`,
      name: `Coin ${i}`,
      image: base.image,
      current_price: Math.round(base.current_price * priceMultiplier * 100) / 100,
      market_cap: Math.round(mcapMultiplier),
      market_cap_rank: i,
      total_volume: Math.round(mcapMultiplier * 0.05),
      price_change_percentage_24h: (Math.random() * 10 - 5).toFixed(2) * 1,
      price_change_percentage_1h_in_currency: (Math.random() * 2 - 1).toFixed(2) * 1,
      price_change_percentage_7d_in_currency: (Math.random() * 30 - 20).toFixed(2) * 1,
      price_change_percentage_30d_in_currency: (Math.random() * 40 - 25).toFixed(2) * 1,
    });
  }

  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  return allCoins.slice(startIndex, endIndex);
}

/**
 * Fetch prices for major tokens from CoinGecko
 * Returns: { BTC: { price, change, change1h, change7d, change30d, change1y, volume, marketCap, liquidity }, ... }
 */
export async function getMajorTokenPrices(symbols) {
  if (!symbols || symbols.length === 0) return {};

  // Check cache
  const now = Date.now();
  const allCached = symbols.every(s => {
    const key = s.toUpperCase();
    return priceCache[key] && (now - lastFetchTime < CACHE_TTL);
  });
  
  if (allCached) {
    const result = {};
    symbols.forEach(s => {
      const key = s.toUpperCase();
      if (priceCache[key]) result[key] = priceCache[key];
    });
    return result;
  }

  // Get CoinGecko IDs for requested symbols
  const ids = [];
  const symbolToId = {};
  symbols.forEach(s => {
    const key = s.toUpperCase();
    const id = SYMBOL_TO_COINGECKO_ID[key];
    if (id) {
      ids.push(id);
      symbolToId[id] = key;
    }
  });

  if (ids.length === 0) {
    // Return stablecoins
    const result = {};
    symbols.forEach(s => {
      const key = s.toUpperCase();
      if (key === 'USDT' || key === 'USDC') {
        result[key] = { price: 1, change: 0, volume: 0, marketCap: 0 };
      }
    });
    return result;
  }

  try {
    const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d,30d,1y`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      console.warn('CoinGecko API error:', res.status);
      return priceCache; // Return cached data on error
    }

    const data = await res.json();
    
    if (!Array.isArray(data)) {
      console.warn('CoinGecko returned invalid data');
      return priceCache;
    }

    const result = {};
    
    data.forEach(coin => {
      const symbol = symbolToId[coin.id];
      if (!symbol) return;

      result[symbol] = {
        price: coin.current_price || 0,
        change: coin.price_change_percentage_24h || 0,
        change1h: coin.price_change_percentage_1h_in_currency || 0,
        change7d: coin.price_change_percentage_7d_in_currency || 0,
        change30d: coin.price_change_percentage_30d_in_currency || 0,
        change1y: coin.price_change_percentage_1y_in_currency || 0,
        volume: coin.total_volume || 0,
        marketCap: coin.market_cap || 0,
        liquidity: coin.total_volume || 0, // Use volume as liquidity proxy
        logo: COINGECKO_LOGOS[symbol] || coin.image,
        rank: coin.market_cap_rank,
        sparkline_7d: Array.isArray(coin.sparkline_in_7d?.price) ? coin.sparkline_in_7d.price : null,
      };
    });

    // Handle stablecoins
    symbols.forEach(s => {
      const key = s.toUpperCase();
      if (key === 'USDT' || key === 'USDC') {
        result[key] = { price: 1, change: 0, volume: 0, marketCap: 0, logo: COINGECKO_LOGOS[key] };
      }
    });

    // Update cache
    priceCache = { ...priceCache, ...result };
    lastFetchTime = now;

    return result;
  } catch (err) {
    console.error('CoinGecko fetch failed:', err);
    return priceCache; // Return cached data on error
  }
}

/**
 * Search for major tokens by symbol/name
 * Returns instant results for known major tokens
 */
export function searchMajorTokens(query) {
  if (!query || query.length < 1) return [];

  const q = query.toUpperCase().trim();
  // Also support searching with spaces removed (e.g., "spectreai" matches "Spectre AI")
  const qNoSpaces = q.replace(/\s+/g, '');
  const results = [];

  Object.entries(MAJOR_TOKEN_INFO).forEach(([symbol, info]) => {
    const nameUpper = info.name.toUpperCase();
    const nameNoSpaces = nameUpper.replace(/\s+/g, '');

    if (
      symbol.includes(q) ||
      nameUpper.includes(q) ||
      // Also match without spaces (e.g., "spectreai" matches "SPECTRE AI")
      (qNoSpaces.length >= 3 && (nameNoSpaces.includes(qNoSpaces) || symbol.includes(qNoSpaces)))
    ) {
      results.push({
        symbol: info.symbol,
        name: info.name,
        network: info.network,
        networkId: info.networkId,
        address: info.address || null, // Include address if available (for tokens like SPECTRE)
        logo: COINGECKO_LOGOS[symbol],
        isMajor: true,
      });
    }
  });

  return results.slice(0, 10);
}

/**
 * Get full token data for a major token (for search results)
 */
export async function getMajorTokenData(symbol) {
  const key = symbol.toUpperCase();
  const info = MAJOR_TOKEN_INFO[key];
  if (!info) return null;

  const prices = await getMajorTokenPrices([key]);
  const priceData = prices[key] || {};

  return {
    symbol: info.symbol,
    name: info.name,
    network: info.network,
    networkId: info.networkId,
    logo: COINGECKO_LOGOS[key],
    price: priceData.price || 0,
    change: priceData.change || 0,
    change1h: priceData.change1h || 0,
    change7d: priceData.change7d || 0,
    change30d: priceData.change30d || 0,
    change1y: priceData.change1y || 0,
    volume: priceData.volume || 0,
    marketCap: priceData.marketCap || 0,
    liquidity: priceData.liquidity || 0,
    isMajor: true,
  };
}

/** CoinGecko ID for BTC/ETH/SOL (for details endpoint) */
const COIN_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' };

/** Cache for coin details (About section) */
let detailsCache = {};
const DETAILS_CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Get coin details (description, links) for About section
 * @param {string} symbol - e.g. 'BTC', 'ETH', 'SOL'
 * @returns {Promise<{ description: string, links: { homepage?, twitter?, reddit?, explorer? } }>}
 */
export async function getCoinDetails(symbol) {
  const id = COIN_IDS[symbol?.toUpperCase()];
  if (!id) return null;
  const now = Date.now();
  if (detailsCache[id] && (now - (detailsCache[id]._ts || 0)) < DETAILS_CACHE_TTL) {
    const { _ts, ...rest } = detailsCache[id];
    return rest;
  }
  try {
    const url = `${COINGECKO_API}/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return detailsCache[id] ? (() => { const { _ts, ...r } = detailsCache[id]; return r; })() : null;
    const data = await res.json();
    const description = (data.description && data.description.en)
      ? data.description.en.replace(/<[^>]+>/g, '').slice(0, 600) + (data.description.en.length > 600 ? '…' : '')
      : '';
    const links = {
      homepage: data.links?.homepage?.[0] || null,
      twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : null,
      reddit: data.links?.subreddit_url || null,
      explorer: data.links?.blockchain_explorer?.[0] || null,
    };
    detailsCache[id] = { description, links, _ts: now };
    return { description, links };
  } catch (err) {
    console.warn('CoinGecko coin details failed:', err);
    return detailsCache[id] ? (() => { const { _ts, ...r } = detailsCache[id]; return r; })() : null;
  }
}

/**
 * Search coins for ROI calculator (CoinGecko search)
 * @param {string} q - search query
 * @returns {Promise<Array<{ id: string, symbol: string, name: string }>>}
 */
export async function searchCoinsForROI(q) {
  const query = q != null ? String(q).trim() : '';
  if (query.length < 1) return [];
  try {
    const url = `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const coins = data.coins || [];
    return coins.slice(0, 15).map((c) => ({
      id: c.id || '',
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name || '',
    }));
  } catch (err) {
    console.warn('CoinGecko search failed:', err);
    return [];
  }
}

/**
 * Get coin data for ROI calculator (current price, ATH, market cap)
 * @param {string} id - CoinGecko coin id (e.g. 'bitcoin')
 * @returns {Promise<{ currentPrice: number, marketCap: number, athPrice: number, athDate: string } | null>}
 */
export async function getCoinROIData(id) {
  if (!id) return null;
  try {
    const url = `${COINGECKO_API}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const md = data.market_data || {};
    const currentPrice = md.current_price?.usd ?? null;
    const marketCap = md.market_cap?.usd ?? null;
    const athPrice = md.ath?.usd ?? null;
    const athDate = md.ath_date?.usd ?? null;
    return { currentPrice, marketCap, athPrice, athDate };
  } catch (err) {
    console.warn('CoinGecko coin ROI data failed:', err);
    return null;
  }
}

// ── Categories ──
let categoriesCache = { data: [], _ts: 0 };
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Fetch all coin categories from CoinGecko.
 * GET /coins/categories?order=market_cap_desc
 */
export async function getCategories() {
  const now = Date.now();
  if (categoriesCache.data.length > 0 && (now - categoriesCache._ts < CATEGORIES_CACHE_TTL)) {
    return categoriesCache.data;
  }
  try {
    const url = `${COINGECKO_API}/coins/categories?order=market_cap_desc`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn('CoinGecko categories API error:', res.status);
      if (categoriesCache.data.length > 0) return categoriesCache.data;
      throw new Error(`API error: ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      categoriesCache = { data, _ts: now };
      return data;
    }
    throw new Error('Invalid categories response');
  } catch (err) {
    console.warn('CoinGecko categories fetch failed:', err);
    if (categoriesCache.data.length > 0) return categoriesCache.data;
    return getCategoriesFallback();
  }
}

function getCategoriesFallback() {
  return [
    { id: 'smart-contract-platform', name: 'Smart Contract Platform', market_cap: 2051825422234, market_cap_change_24h: -6.5, volume_24h: 145578042148, top_3_coins: ['https://assets.coingecko.com/coins/images/279/small/ethereum.png', 'https://assets.coingecko.com/coins/images/4128/small/solana.png', 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png'] },
    { id: 'layer-1', name: 'Layer 1 (L1)', market_cap: 2012756689271, market_cap_change_24h: -6.5, volume_24h: 140663003897, top_3_coins: ['https://assets.coingecko.com/coins/images/1/small/bitcoin.png', 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', 'https://assets.coingecko.com/coins/images/4128/small/solana.png'] },
    { id: 'proof-of-work', name: 'Proof of Work (PoW)', market_cap: 1521454639326, market_cap_change_24h: -6.4, volume_24h: 77457519389, top_3_coins: ['https://assets.coingecko.com/coins/images/1/small/bitcoin.png', 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', 'https://assets.coingecko.com/coins/images/69/small/monero_logo.png'] },
    { id: 'proof-of-stake', name: 'Proof of Stake (PoS)', market_cap: 485021242176, market_cap_change_24h: -6.9, volume_24h: 64019574228, top_3_coins: ['https://assets.coingecko.com/coins/images/279/small/ethereum.png', 'https://assets.coingecko.com/coins/images/4128/small/solana.png', 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png'] },
    { id: 'stablecoins', name: 'Stablecoins', market_cap: 309606605066, market_cap_change_24h: -0.2, volume_24h: 156342089452, top_3_coins: ['https://assets.coingecko.com/coins/images/325/small/Tether.png', 'https://assets.coingecko.com/coins/images/6319/small/usdc.png', 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png'] },
    { id: 'meme-token', name: 'Meme Tokens', market_cap: 47000000000, market_cap_change_24h: -8.2, volume_24h: 8900000000, top_3_coins: ['https://assets.coingecko.com/coins/images/5/small/dogecoin.png', 'https://assets.coingecko.com/coins/images/11939/small/shiba.png', 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg'] },
    { id: 'decentralized-finance-defi', name: 'Decentralized Finance (DeFi)', market_cap: 145000000000, market_cap_change_24h: -5.8, volume_24h: 12000000000, top_3_coins: ['https://assets.coingecko.com/coins/images/12504/small/uni.jpg', 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png'] },
    { id: 'artificial-intelligence', name: 'Artificial Intelligence (AI)', market_cap: 32000000000, market_cap_change_24h: -7.1, volume_24h: 4500000000, top_3_coins: ['https://assets.coingecko.com/coins/images/25244/small/Optimism.png', 'https://assets.coingecko.com/coins/images/26045/small/INJECTIVE_LOGO.png', 'https://assets.coingecko.com/coins/images/12645/small/AAVE_Token_Rounded.png'] },
    { id: 'real-world-assets-rwa', name: 'Real World Assets (RWA)', market_cap: 42000000000, market_cap_change_24h: -3.4, volume_24h: 2800000000, top_3_coins: ['https://assets.coingecko.com/coins/images/279/small/ethereum.png', 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', 'https://assets.coingecko.com/coins/images/26045/small/INJECTIVE_LOGO.png'] },
    { id: 'gaming', name: 'Gaming (GameFi)', market_cap: 12000000000, market_cap_change_24h: -9.2, volume_24h: 1800000000, top_3_coins: ['https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg', 'https://assets.coingecko.com/coins/images/12467/small/axs.png', 'https://assets.coingecko.com/coins/images/18834/small/wemix-token.png'] },
    { id: 'layer-2', name: 'Layer 2 (L2)', market_cap: 18000000000, market_cap_change_24h: -7.8, volume_24h: 3200000000, top_3_coins: ['https://assets.coingecko.com/coins/images/25244/small/Optimism.png', 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', 'https://assets.coingecko.com/coins/images/35023/small/starknet.png'] },
    { id: 'exchange-based-tokens', name: 'Exchange Tokens', market_cap: 98000000000, market_cap_change_24h: -4.1, volume_24h: 5600000000, top_3_coins: ['https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png', 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'] },
    { id: 'decentralized-exchange', name: 'Decentralized Exchange (DEX)', market_cap: 28000000000, market_cap_change_24h: -6.3, volume_24h: 3100000000, top_3_coins: ['https://assets.coingecko.com/coins/images/12504/small/uni.jpg', 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png', 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png'] },
    { id: 'nft', name: 'NFT', market_cap: 8500000000, market_cap_change_24h: -10.5, volume_24h: 1200000000, top_3_coins: ['https://assets.coingecko.com/coins/images/12467/small/axs.png', 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg', 'https://assets.coingecko.com/coins/images/11636/small/ape.png'] },
    { id: 'privacy-coins', name: 'Privacy Coins', market_cap: 6000000000, market_cap_change_24h: -5.7, volume_24h: 400000000, top_3_coins: ['https://assets.coingecko.com/coins/images/69/small/monero_logo.png', 'https://assets.coingecko.com/coins/images/63/small/zcash.png', 'https://assets.coingecko.com/coins/images/281/small/dash-logo.png'] },
  ];
}

// ── Category Coins ──
let categoryCoinsCaches = {};
const CATEGORY_COINS_CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Fetch coins in a specific category from CoinGecko.
 * GET /coins/markets?vs_currency=usd&category=CATEGORY_ID&order=market_cap_desc
 *     &per_page=25&page=PAGE&sparkline=true&price_change_percentage=1h,24h,7d
 */
export async function getCategoryCoins(categoryId, page = 1, perPage = 25) {
  const cacheKey = `${categoryId}_${page}_${perPage}`;
  const now = Date.now();
  const cached = categoryCoinsCaches[cacheKey];

  if (cached && cached.data.length > 0 && (now - cached._ts < CATEGORY_COINS_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&category=${encodeURIComponent(categoryId)}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });

    if (!res.ok) {
      console.warn('CoinGecko category coins API error:', res.status);
      if (cached && cached.data.length > 0) return cached.data;
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      categoryCoinsCaches[cacheKey] = { data, _ts: now };
      return data;
    }
    throw new Error('Invalid category coins response');
  } catch (err) {
    console.warn('CoinGecko category coins fetch failed:', err);
    if (cached && cached.data.length > 0) return cached.data;
    return [];
  }
}

export default {
  getMajorTokenPrices,
  searchMajorTokens,
  getMajorTokenData,
  getCoinDetails,
  searchCoinsForROI,
  getCoinROIData,
  getCategories,
  getCategoryCoins,
};
