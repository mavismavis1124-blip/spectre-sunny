/**
 * Custom React Hooks for Codex API Data
 * Provides real-time blockchain data with caching and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrendingTokens,
  searchTokens,
  getDetailedTokenStats,
  getBars,
  getTokenPairs,
  getLatestTrades,
  getNetworkName,
  formatLargeNumber,
  formatPrice,
  lookupTokenByAddress,
  getDetailedTokenInfo,
  getTokenPriceBySymbol,
  getTokenPricesBatch,
} from '../services/codexApi';
import { getTopCoinPrices, getBinanceKlines } from '../services/binanceApi';
import { getMajorTokenPrices, searchMajorTokens } from '../services/coinGeckoApi';
import { COINGECKO_LOGOS } from '../constants/majorTokens';

/**
 * Singleton WebSocket connection to backend for real-time price streaming.
 * Multiple hooks share one connection with ref-counted subscriptions.
 * On Vercel/production (no WS server), this gracefully gives up after 3 failures
 * and individual hooks fall back to REST polling.
 */
let wsInstance = null;
let wsListeners = new Map(); // key -> Set<callback>
let wsReconnectTimer = null;
let wsFailCount = 0;
let wsGaveUp = false; // true when WS is permanently unavailable (e.g. Vercel)
const WS_MAX_FAILURES = 3; // Give up after this many consecutive failures

// Only attempt WS on localhost / dev — Vercel doesn't have a WS server
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const WS_URL = isLocalDev ? `ws://${window.location.hostname}:3001/ws` : null;

function getWS() {
  // Don't even try on production or if we already gave up
  if (!WS_URL || wsGaveUp) return null;

  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) return wsInstance;
  if (wsInstance && wsInstance.readyState === WebSocket.CONNECTING) return wsInstance;

  // Clean up old instance
  if (wsInstance) {
    try { wsInstance.close(); } catch(e) {}
  }

  try {
    wsInstance = new WebSocket(WS_URL);
  } catch(e) {
    wsGaveUp = true;
    console.log('[WS] WebSocket not available, using REST fallback');
    return null;
  }

  wsInstance.onopen = () => {
    console.log('[WS] Connected to price stream');
    wsFailCount = 0; // Reset on success
    // Re-subscribe all active tokens
    wsListeners.forEach((_, key) => {
      const [address, networkId] = key.split('_');
      wsInstance.send(JSON.stringify({ type: 'subscribe', address, networkId: parseInt(networkId) }));
    });
  };

  wsInstance.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'price_update' && msg.address) {
        const key = `${msg.address.toLowerCase()}_${msg.networkId || 1}`;
        const listeners = wsListeners.get(key);
        if (listeners) {
          listeners.forEach(cb => cb(msg));
        }
      }
    } catch(e) {}
  };

  wsInstance.onclose = () => {
    wsInstance = null;
    wsFailCount++;
    if (wsFailCount >= WS_MAX_FAILURES) {
      wsGaveUp = true;
      console.log(`[WS] Failed ${wsFailCount} times, switching to REST fallback permanently`);
      return;
    }
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = setTimeout(getWS, 5000);
  };

  wsInstance.onerror = () => {
    // onclose will fire after this
  };

  return wsInstance;
}

/** Returns true if WebSocket is permanently unavailable */
export function isWSUnavailable() {
  return wsGaveUp || !WS_URL;
}

/**
 * Hook: subscribe to real-time price updates for a token.
 * Strategy:
 *   1. Try WebSocket (localhost dev only — instant updates)
 *   2. If WS unavailable (Vercel/production), fall back to REST polling every 10s
 * Returns { livePrice, liveChange, liveVolume, connected }
 */
export function useRealtimePrice(address, networkId = 1) {
  const [data, setData] = useState({ price: null, change: null, volume: null });
  const [connected, setConnected] = useState(false);
  const restIntervalRef = useRef(null);

  // REST polling fallback
  useEffect(() => {
    if (!address) return;

    // If WS is available and working, skip REST polling
    if (!isWSUnavailable()) return;

    // REST fallback: poll every 10 seconds
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const info = await getDetailedTokenInfo(address, networkId);
        if (info && !cancelled) {
          setData({
            price: info.price || info.priceUSD || null,
            change: info.change24 != null ? info.change24 : (info.change || null),
            volume: info.volume24 || info.volume || null,
          });
          setConnected(true);
        }
      } catch (err) {
        // Silently fail — don't spam console on every poll
      }
    };

    // Fetch immediately
    fetchPrice();
    // Then poll every 10 seconds
    restIntervalRef.current = setInterval(fetchPrice, 10000);

    return () => {
      cancelled = true;
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
    };
  }, [address, networkId]);

  // WebSocket path (only for local dev)
  useEffect(() => {
    if (!address) return;
    if (isWSUnavailable()) return; // Skip WS, REST fallback handles it

    const key = `${address.toLowerCase()}_${networkId}`;
    const ws = getWS();

    if (!ws) return; // WS creation failed

    const handler = (msg) => {
      setData({ price: msg.price, change: msg.change, volume: msg.volume });
      setConnected(true);
    };

    // Register listener
    if (!wsListeners.has(key)) {
      wsListeners.set(key, new Set());
    }
    wsListeners.get(key).add(handler);

    // Subscribe on WS
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', address, networkId }));
    }

    return () => {
      // Unregister listener
      const listeners = wsListeners.get(key);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          wsListeners.delete(key);
          // Unsubscribe on WS
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(JSON.stringify({ type: 'unsubscribe', address, networkId }));
          }
        }
      }
    };
  }, [address, networkId]);

  return { livePrice: data.price, liveChange: data.change, liveVolume: data.volume, connected };
}

/**
 * Hook for fetching trending/top tokens
 * Returns empty array if API fails - components should use fallback data
 */
export function useTrendingTokens(refreshInterval = 60 * 1000) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTokens = useCallback(async () => {
    try {
      const data = await getTrendingTokens([1, 56, 137, 42161, 8453], 20);
      
      if (data?.filterTokens?.results && data.filterTokens.results.length > 0) {
        const formattedTokens = data.filterTokens.results
          .filter(result => result?.token?.symbol) // Filter out invalid entries
          .map((result, index) => ({
            symbol: result.token.symbol || 'UNKNOWN',
            name: result.token.name || 'Unknown Token',
            address: result.token.address || '',
            networkId: result.token.networkId || 1,
            network: getNetworkName(result.token.networkId),
            price: result.priceUSD || 0,
            change: result.change24 || 0,
            change1h: result.change1 || 0,
            change4h: result.change4 || 0,
            change12h: result.change12 || 0,
            volume24h: result.volume || result.volume24 || 0,
            liquidity: result.liquidity || 0,
            marketCap: result.marketCap || 0,
            logo: result.token.info?.imageThumbUrl || `https://via.placeholder.com/40?text=${(result.token.symbol || '?').charAt(0)}`,
            rank: index + 1,
          }));
        
        if (formattedTokens.length > 0) {
          setTokens(formattedTokens);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trending tokens:', err);
      setError(err.message);
      // Don't set tokens to empty - keep existing data or let component use fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
    
    const interval = setInterval(fetchTokens, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTokens, refreshInterval]);

  return { tokens, loading, error, refresh: fetchTokens };
}

const PRICE_CACHE_KEY = 'spectre_token_prices_cache';

/**
 * Hook for fetching prices for specific token symbols (top coins)
 * Uses CoinGecko directly for reliability - no rate limit issues
 * Caches prices in localStorage for instant loading on refresh
 */
export function useCuratedTokenPrices(symbols, refreshInterval = 60 * 1000) {
  // Initialize with cached prices from localStorage for instant display
  const [prices, setPrices] = useState(() => {
    try {
      const cached = localStorage.getItem(PRICE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 5 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          console.log('Loading cached prices:', Object.keys(parsed.data).length, 'tokens');
          return parsed.data;
        }
      }
    } catch (e) {
      console.log('No valid price cache found');
    }
    return {};
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use symbols string as dependency to avoid recreating callback when array reference changes
  const symbolsKey = symbols?.join(',') || ''
  const fetchPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) {
      console.warn('useCuratedTokenPrices: No symbols provided');
      return;
    }

    try {
      console.log('useCuratedTokenPrices: Fetching prices for', symbols.length, 'symbols via CoinGecko');
      // Use CoinGecko directly for top coins - reliable, no rate limit
      const priceMap = await getMajorTokenPrices(symbols);

      if (!priceMap || Object.keys(priceMap).length === 0) {
        console.warn('useCuratedTokenPrices: Empty price map received');
        return;
      }

      // Cache prices in localStorage with timestamp
      try {
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
          data: priceMap,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('useCuratedTokenPrices: Failed to cache prices', e);
      }

      console.log('useCuratedTokenPrices: Live prices updated:', Object.keys(priceMap).length, 'tokens');
      setPrices(priceMap);
      setError(null);
    } catch (err) {
      console.error('useCuratedTokenPrices: Failed to fetch curated token prices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  useEffect(() => {
    // Fetch immediately on mount
    fetchPrices();
    
    // Then refresh every 60 seconds
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refresh: fetchPrices };
}

/**
 * Check if string is a contract address (EVM or Solana)
 */
function isContractAddress(str) {
  if (!str) return false;
  
  // EVM address: 0x + 40 hex chars
  if (str.startsWith('0x') && str.length === 42) {
    return true;
  }
  
  // Solana address: base58, typically 32-44 chars, no 0x prefix
  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  if (str.length >= 32 && str.length <= 44 && !str.startsWith('0x')) {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (base58Regex.test(str)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Hook for searching tokens
 * Strategy: Show major tokens instantly, then fetch on-chain results from Codex
 */
export function useTokenSearch(query, debounceMs = 300) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (!query || query.trim().length < 1) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const searchQuery = query.trim();
    
    // Step 1: Instantly show major token matches (no API call)
    const majorMatches = searchMajorTokens(searchQuery);
    if (majorMatches.length > 0) {
      // Show major results immediately with placeholder prices
      const instantResults = majorMatches.map(m => ({
        ...m,
        price: 0,
        change: 0,
        formattedPrice: '...',
        formattedMcap: '...',
        formattedLiquidity: '...',
        logo: COINGECKO_LOGOS[m.symbol] || m.logo,
        isMajor: true,
      }));
      setResults(instantResults);
    } else {
      setResults([]);
    }
    
    setLoading(true);
    setError(null);
    
    // Debounce API calls
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    abortControllerRef.current = new AbortController();

    timeoutRef.current = setTimeout(async () => {
      try {
        let allResults = [];

        // Step 2: Fetch prices for major token matches
        if (majorMatches.length > 0) {
          // Separate tokens with addresses (need Codex) from those without (use CoinGecko)
          const tokensWithAddress = majorMatches.filter(m => m.address);
          const tokensWithoutAddress = majorMatches.filter(m => !m.address);

          // Fetch CoinGecko prices for standard major tokens
          let prices = {};
          if (tokensWithoutAddress.length > 0) {
            const symbols = tokensWithoutAddress.map(m => m.symbol);
            prices = await getMajorTokenPrices(symbols);
          }

          // Fetch Codex data for tokens with addresses (like SPECTRE)
          for (const token of tokensWithAddress) {
            try {
              const codexData = await getDetailedTokenInfo(token.address, token.networkId || 1);
              if (codexData) {
                prices[token.symbol] = {
                  price: codexData.price || codexData.priceUSD || 0,
                  change: codexData.change24 || codexData.change || 0,
                  volume: codexData.volume24 || codexData.volume || 0,
                  liquidity: codexData.liquidity || 0,
                  marketCap: codexData.marketCap || 0,
                  logo: codexData.logo || codexData.info?.imageThumbUrl || token.logo,
                };
              }
            } catch (err) {
              console.warn(`Failed to fetch Codex data for ${token.symbol}:`, err.message);
            }
          }

          const majorResults = majorMatches.map(m => {
            const priceData = prices[m.symbol] || {};
            return {
              ...m,
              price: priceData.price || 0,
              change: priceData.change || 0,
              volume: priceData.volume || 0,
              liquidity: priceData.liquidity || 0,
              marketCap: priceData.marketCap || 0,
              logo: priceData.logo || COINGECKO_LOGOS[m.symbol] || m.logo,
              formattedPrice: priceData.price ? formatPrice(priceData.price) : 'N/A',
              formattedMcap: priceData.marketCap ? formatLargeNumber(priceData.marketCap) : 'N/A',
              formattedLiquidity: priceData.liquidity ? formatLargeNumber(priceData.liquidity) : 'N/A',
              isMajor: true,
            };
          });
          allResults = [...majorResults];
        }

        // Step 3: For contract addresses or non-major searches, also query Codex
        if (isContractAddress(searchQuery) || majorMatches.length === 0) {
          console.log('Searching Codex for:', searchQuery);
          const data = await searchTokens(searchQuery);
          
          if (data?.filterTokens?.results && data.filterTokens.results.length > 0) {
            const codexResults = data.filterTokens.results.map(result => ({
              symbol: result.token.symbol,
              name: result.token.name,
              address: result.token.address,
              networkId: result.token.networkId,
              network: result.token.networkName || getNetworkName(result.token.networkId),
              price: result.priceUSD || 0,
              change: result.change24 || 0,
              volume: result.volume || 0,
              liquidity: result.liquidity || 0,
              marketCap: result.marketCap || 0,
              logo: result.token.info?.imageThumbUrl || COINGECKO_LOGOS[(result.token.symbol || '').toUpperCase()] || null,
              formattedMcap: result.marketCap ? formatLargeNumber(result.marketCap) : 'N/A',
              formattedLiquidity: result.liquidity ? formatLargeNumber(result.liquidity) : 'N/A',
              formattedPrice: result.priceUSD ? formatPrice(result.priceUSD) : 'N/A',
              isMajor: false,
            }));
            
            // Merge: majors first, then on-chain (avoid duplicates)
            const existingSymbols = new Set(allResults.map(r => r.symbol.toUpperCase()));
            codexResults.forEach(r => {
              if (!existingSymbols.has(r.symbol.toUpperCase())) {
                allResults.push(r);
              }
            });
          }
        }
        
        setResults(allResults);
        setError(null);
      } catch (err) {
        console.error('Token search failed:', err);
        // Keep major results on error
        if (majorMatches.length === 0) {
          setResults([]);
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs]);

  return { results, loading, error };
}

/**
 * Hook for fetching detailed token stats
 */
export function useTokenStats(address, networkId = 1) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const data = await getDetailedTokenStats(address, networkId);
      
      if (data?.token) {
        setStats({
          symbol: data.token.symbol,
          name: data.token.name,
          address: data.token.address,
          decimals: data.token.decimals,
          totalSupply: data.token.totalSupply,
          circulatingSupply: data.token.info?.circulatingSupply,
          logo: data.token.info?.imageLargeUrl || data.token.info?.imageThumbUrl,
        });
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch token stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, networkId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

/**
 * Hook for fetching OHLCV chart data
 * @param {string} symbol - Token symbol (e.g., "ETH", "SPECTRE")
 * @param {string} resolution - Candle resolution: "1", "5", "15", "60", "240", "D", "W"
 * @param {number} networkId - Network ID (1 for Ethereum, 1399811149 for Solana)
 * @param {number} periodHours - How many hours of data to fetch
 */
export function useChartData(symbol, resolution = '60', networkId = 1, periodHours = 168) {
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [athPrice, setAthPrice] = useState(null);
  const athFetchedRef = useRef(null); // Track which symbol we've fetched ATH for

  // Fetch ALL historical data to find true ATH
  const fetchATH = useCallback(async () => {
    if (!symbol || athFetchedRef.current === symbol) {
      return; // Already fetched for this symbol
    }

    try {
      console.log(`Fetching ALL historical data to calculate ATH for ${symbol}`);
      
      let allHighs = [];
      let oldestTimestamp = Math.floor(Date.now() / 1000);
      let hasMore = true;
      let iteration = 0;
      const MAX_ITERATIONS = 20; // Prevent infinite loops
      
      // Fetch daily data going back as far as possible
      while (hasMore && iteration < MAX_ITERATIONS) {
        const to = oldestTimestamp - 1;
        const from = to - (4 * 365 * 24 * 60 * 60); // ~4 years per request (stays under 1500 limit with daily)
        
        if (from < 0) {
          hasMore = false;
          break;
        }
        
        console.log(`ATH fetch iteration ${iteration + 1}: ${new Date(from * 1000).toISOString().split('T')[0]} to ${new Date(to * 1000).toISOString().split('T')[0]}`);
        
        const data = await getBars(symbol, '1D', from, to, networkId);
        
        if (data?.getBars && data.getBars.length > 0) {
          const highs = data.getBars.map(bar => parseFloat(bar.h) || 0);
          allHighs = [...allHighs, ...highs];
          
          // Update oldest timestamp for next iteration
          const oldestBarTime = Math.min(...data.getBars.map(bar => bar.t));
          oldestTimestamp = oldestBarTime;
          
          // If we got very few bars, we've probably reached the beginning
          hasMore = data.getBars.length >= 100;
          console.log(`Got ${data.getBars.length} daily bars, oldest: ${new Date(oldestBarTime * 1000).toISOString().split('T')[0]}`);
        } else {
          hasMore = false;
        }
        
        iteration++;
      }
      
      if (allHighs.length > 0) {
        const maxHigh = Math.max(...allHighs);
        console.log(`ATH for ${symbol}: $${maxHigh} (from ${allHighs.length} daily bars, ${iteration} requests)`);
        setAthPrice(maxHigh);
        athFetchedRef.current = symbol;
      } else {
        console.log(`Could not determine ATH for ${symbol}`);
        setAthPrice(null);
      }
    } catch (err) {
      console.error('Failed to fetch ATH data:', err);
      setAthPrice(null);
    }
  }, [symbol, networkId]);

  // Reset ATH when symbol changes
  useEffect(() => {
    if (symbol && athFetchedRef.current !== symbol) {
      setAthPrice(null);
      fetchATH();
    }
  }, [symbol, fetchATH]);

  const fetchBars = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Calculate time range based on resolution
      const to = Math.floor(Date.now() / 1000);
      const from = to - (periodHours * 60 * 60);
      
      console.log(`Fetching chart data for ${symbol}, resolution: ${resolution}, networkId: ${networkId}`);
      const data = await getBars(symbol, resolution, from, to, networkId);
      
      if (data?.getBars && data.getBars.length > 0) {
        const formattedBars = data.getBars.map(bar => ({
          time: bar.t * 1000, // Convert to milliseconds
          open: parseFloat(bar.o) || 0,
          high: parseFloat(bar.h) || 0,
          low: parseFloat(bar.l) || 0,
          close: parseFloat(bar.c) || 0,
          volume: parseFloat(bar.v) || 0,
        }));
        
        console.log(`Received ${formattedBars.length} bars for ${symbol}`);
        setBars(formattedBars);
        setError(null);
        setHasMoreHistory(true); // Reset - there might be more history
      } else {
        // Fallback: Try Binance klines for any symbol (Binance has 500+ USDT pairs)
        const upperSymbol = (symbol || '').toUpperCase();
        try {
          const binanceData = await getBinanceKlines(upperSymbol, resolution, from, to);
          if (binanceData?.getBars && binanceData.getBars.length > 0) {
            const formattedBars = binanceData.getBars.map(bar => ({
              time: bar.t * 1000,
              open: parseFloat(bar.o) || 0,
              high: parseFloat(bar.h) || 0,
              low: parseFloat(bar.l) || 0,
              close: parseFloat(bar.c) || 0,
              volume: parseFloat(bar.v) || 0,
            }));
            console.log(`Chart: Using Binance klines for ${upperSymbol} (${formattedBars.length} bars)`);
            setBars(formattedBars);
            setError(null);
            setHasMoreHistory(true);
          } else {
            console.log(`No chart data for ${symbol} (Codex + Binance both empty)`);
            setBars([]);
            setError('Chart data unavailable for this token');
          }
        } catch (fallbackErr) {
          console.warn('Binance klines fallback failed:', fallbackErr);
          setBars([]);
          setError('Chart data unavailable');
        }
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setError(err.message);
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, resolution, networkId, periodHours]);

  // Fetch MORE historical data (older than current oldest candle)
  const fetchMoreHistory = useCallback(async () => {
    if (!symbol || loadingMore || !hasMoreHistory || bars.length === 0) {
      return false;
    }
    
    try {
      setLoadingMore(true);
      
      // Get the oldest bar's timestamp and fetch data before it
      const oldestBar = bars[0];
      const to = Math.floor(oldestBar.time / 1000) - 1; // Just before oldest candle
      
      // Calculate fetch period based on resolution - stay under 1500 datapoint API limit
      // Each resolution: hours = target_candles * minutes_per_candle / 60
      const resolutionToHours = {
        '1': 24,       // 1 day (~1440 candles)
        '5': 115,      // ~4.8 days (~1380 candles)
        '15': 350,     // ~14.5 days (~1400 candles)
        '60': 1400,    // ~58 days (~1400 candles)
        '240': 5600,   // ~233 days (~1400 candles)
        '1D': 33600,   // ~3.8 years (~1400 candles)
        '1W': 235200,  // ~27 years (~1400 candles)
      };
      const fetchHours = resolutionToHours[resolution] || Math.min(periodHours, 1400);
      const from = to - (fetchHours * 60 * 60);
      
      console.log(`Fetching more history for ${symbol}, from ${new Date(from * 1000).toISOString()} to ${new Date(to * 1000).toISOString()} (${fetchHours}h)`);
      const data = await getBars(symbol, resolution, from, to, networkId);
      
      if (data?.getBars && data.getBars.length > 0) {
        const formattedBars = data.getBars.map(bar => ({
          time: bar.t * 1000,
          open: parseFloat(bar.o) || 0,
          high: parseFloat(bar.h) || 0,
          low: parseFloat(bar.l) || 0,
          close: parseFloat(bar.c) || 0,
          volume: parseFloat(bar.v) || 0,
        }));
        
        console.log(`Received ${formattedBars.length} additional historical bars`);
        
        // Prepend new bars to existing bars (older data goes first)
        setBars(prevBars => [...formattedBars, ...prevBars]);
        setHasMoreHistory(formattedBars.length > 5); // If we got very few bars, might be at the limit
        return true;
      }
      // Fallback: Binance klines for more history (BTC/ETH/SOL)
      const majorSymbol = (symbol || '').toUpperCase();
      if (['BTC', 'ETH', 'SOL'].includes(majorSymbol)) {
        try {
          const binanceData = await getBinanceKlines(majorSymbol, resolution, from, to);
          if (binanceData?.getBars && binanceData.getBars.length > 0) {
            const formattedBars = binanceData.getBars.map(bar => ({
              time: bar.t * 1000,
              open: parseFloat(bar.o) || 0,
              high: parseFloat(bar.h) || 0,
              low: parseFloat(bar.l) || 0,
              close: parseFloat(bar.c) || 0,
              volume: parseFloat(bar.v) || 0,
            }));
            setBars(prevBars => [...formattedBars, ...prevBars]);
            setHasMoreHistory(formattedBars.length >= 500);
            return true;
          }
        } catch (e) {
          console.warn('Binance klines (more history) failed:', e);
        }
      }
      console.log(`No more historical data available for ${symbol}`);
      setHasMoreHistory(false);
      return false;
    } catch (err) {
      console.error('Failed to fetch more history:', err);
      // Don't permanently disable - API might have temporary issues
      // setHasMoreHistory(false);
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [symbol, resolution, networkId, periodHours, bars, loadingMore, hasMoreHistory]);

  useEffect(() => {
    fetchBars();
    // Refresh every 10s for near real-time candle updates
    const interval = setInterval(fetchBars, 10 * 1000);
    return () => clearInterval(interval);
  }, [fetchBars]);

  return { bars, loading, loadingMore, error, hasMoreHistory, refresh: fetchBars, fetchMoreHistory, athPrice };
}

/**
 * Hook for fetching token pairs
 */
export function useTokenPairs(tokenAddress, networkId = 1) {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tokenAddress) return;
    
    async function fetchPairs() {
      try {
        setLoading(true);
        const data = await getTokenPairs(tokenAddress, networkId);
        
        if (data?.listPairsForToken) {
          setPairs(data.listPairsForToken.map(pair => ({
            address: pair.address,
            token0: pair.token0,
            token1: pair.token1,
            liquidity: pair.liquidity,
            volume24h: pair.volume24,
            price: pair.priceUSD,
            formattedLiquidity: formatLargeNumber(pair.liquidity),
            formattedVolume: formatLargeNumber(pair.volume24),
          })));
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch token pairs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPairs();
  }, [tokenAddress, networkId]);

  return { pairs, loading, error };
}

/**
 * Hook for fetching latest trades for a token
 */
export function useLatestTrades(tokenAddress, networkId = 1, initialLimit = 100) {
  const [trades, setTrades] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const currentLimitRef = useRef(initialLimit);

  const formatTradeData = (trade) => ({
    timestamp: new Date(trade.timestamp * 1000),
    type: trade.type || 'Swap',
    price: parseFloat(trade.priceUSD) || 0,
    amount: parseFloat(trade.amountToken) || 0,
    value: parseFloat(trade.amountUSD) || 0,
    maker: trade.maker || '',
    txHash: trade.txHash || '',
    symbol: trade.symbol || '',
    formattedPrice: formatPrice(trade.priceUSD),
    formattedValue: formatLargeNumber(trade.amountUSD),
  });

  const fetchTrades = useCallback(async (resetLimit = true) => {
    if (!tokenAddress) {
      setLoading(false);
      return;
    }
    
    try {
      if (resetLimit) {
        setLoading(true);
        currentLimitRef.current = initialLimit;
      }
      
      const data = await getLatestTrades(tokenAddress, networkId, currentLimitRef.current);
      
      if (data?.trades && data.trades.length > 0) {
        setTrades(data.trades.map(formatTradeData));
        // hasMore only if we got as many as requested AND we're under the max (200)
        setHasMore(data.trades.length >= currentLimitRef.current && currentLimitRef.current < 200);
        console.log(`Loaded ${data.trades.length} trades for ${tokenAddress}`);
        setError(null);
      } else {
        console.log(`No trades found for ${tokenAddress}`);
        if (resetLimit) {
          setTrades([]); // Only clear on initial load
        }
        setHasMore(false);
      }
      
      if (data?.pairs) {
        setPairs(data.pairs);
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError(err.message);
      if (resetLimit) {
        setTrades([]); // Only clear on initial load, keep existing on refresh errors
      }
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, networkId, initialLimit]);

  // Load more trades (capped at 200 due to API limits)
  const MAX_TRADES = 200;
  
  const loadMore = useCallback(async () => {
    if (!tokenAddress || loadingMore || !hasMore) return;
    
    // Check if we're at the max
    if (currentLimitRef.current >= MAX_TRADES) {
      console.log(`Reached maximum trades limit (${MAX_TRADES})`);
      setHasMore(false);
      return;
    }
    
    try {
      setLoadingMore(true);
      currentLimitRef.current = Math.min(currentLimitRef.current + 50, MAX_TRADES); // Load 50 more, capped at MAX
      const data = await getLatestTrades(tokenAddress, networkId, currentLimitRef.current);
      
      if (data?.trades && data.trades.length > 0) {
        setTrades(data.trades.map(formatTradeData));
        // Stop loading more if we've hit the max or API returned fewer than requested
        setHasMore(data.trades.length >= currentLimitRef.current && currentLimitRef.current < MAX_TRADES);
        console.log(`Loaded ${data.trades.length} total trades for ${tokenAddress}`);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more trades:', err);
      // On error, stop trying to load more (likely API limit reached)
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [tokenAddress, networkId, loadingMore, hasMore]);

  useEffect(() => {
    fetchTrades();
    
    // Refresh every 30 seconds for live trades (increased from 15s due to larger payload)
    const interval = setInterval(() => fetchTrades(false), 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  return { trades, pairs, loading, loadingMore, error, hasMore, refresh: fetchTrades, loadMore };
}

/**
 * Combined hook for all token data (stats + pairs + trades)
 */
export function useFullTokenData(tokenAddress, networkId = 1) {
  const { stats, loading: statsLoading, error: statsError } = useTokenStats(tokenAddress, networkId);
  const { pairs, loading: pairsLoading, error: pairsError } = useTokenPairs(tokenAddress, networkId);
  
  // Get the main pair for trades
  const mainPair = pairs[0];
  const { trades, loading: tradesLoading, error: tradesError } = useLatestTrades(
    mainPair?.address,
    networkId,
    50
  );

  return {
    stats,
    pairs,
    trades,
    mainPair,
    loading: statsLoading || pairsLoading || tradesLoading,
    error: statsError || pairsError || tradesError,
  };
}

// In-memory cache for token details (speeds up repeated lookups)
const tokenDetailsCache = new Map();
const CACHE_TTL = 10000; // 10s client cache — real-time price updates

/**
 * Hook for fetching detailed token info for the main banner
 * Includes price, socials, description, and price changes
 * Uses in-memory caching for faster subsequent lookups
 */
export function useTokenDetails(address, networkId = 1, refreshInterval = 60 * 1000) {
  const [tokenData, setTokenData] = useState(() => {
    // Try to get cached data immediately on mount
    const cacheKey = `${address}-${networkId}`;
    const cached = tokenDetailsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(!tokenData);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchDetails = useCallback(async (forceRefresh = false) => {
    if (!address) {
      setLoading(false);
      return;
    }
    
    const cacheKey = `${address}-${networkId}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = tokenDetailsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        if (isMounted.current) {
          setTokenData(cached.data);
          setLoading(false);
        }
        return;
      }
    }
    
    try {
      // Only show loading if we don't have any data
      if (!tokenData) {
        setLoading(true);
      }
      
      const data = await getDetailedTokenInfo(address, networkId);
      
      if (data && isMounted.current) {
        // Cache the result
        tokenDetailsCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        setTokenData(data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch token details:', err);
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [address, networkId, tokenData]);

  // Fetch when address/networkId changes
  useEffect(() => {
    isMounted.current = true;
    
    // Check cache immediately
    const cacheKey = `${address}-${networkId}`;
    const cached = tokenDetailsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      setTokenData(cached.data);
      setLoading(false);
    } else {
      // Only clear if we're fetching new data
      fetchDetails();
    }
    
    // Auto-refresh in background (don't show loading)
    const interval = setInterval(() => fetchDetails(true), refreshInterval);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [address, networkId, refreshInterval]);

  return { tokenData, loading, error, refresh: () => fetchDetails(true) };
}

/**
 * Real-time top coin prices from Binance only (no rate limit, no key).
 * Used by Discover for cross-chain top coins. Refreshes every 5s by default.
 */
export function useBinanceTopCoinPrices(symbols, refreshInterval = 3000) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use symbols?.join(',') as dependency to avoid recreating callback when array reference changes
  // but contents remain the same
  const symbolsKey = symbols?.join(',') || ''
  const fetchPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) return;
    let priceMap = {};
    try {
      const raw = await getTopCoinPrices(symbols);
      Object.entries(raw).forEach(([symbol, data]) => {
        priceMap[symbol] = {
          price: data.price,
          change: data.change,
          change24: data.change,
          change1h: data.change1h ?? 0,
          change7d: data.change7d ?? 0,
          change30d: data.change30d ?? 0,
          change1y: data.change1y ?? 0,
          volume: data.volume ?? 0,
          marketCap: data.marketCap ?? 0,
          liquidity: data.liquidity ?? data.volume ?? 0,
        };
      });
      if (Object.keys(priceMap).length > 0) {
        setPrices((prev) => {
          // Only update if prices actually changed — prevents unnecessary re-renders
          // that cause logo flickering / "spinning" on mobile every 5s
          let changed = false;
          for (const sym of Object.keys(priceMap)) {
            const old = prev[sym];
            const nw = priceMap[sym];
            if (!old || old.price !== nw.price || old.change !== nw.change) {
              changed = true;
              break;
            }
          }
          if (!changed) return prev; // same reference → no re-render
          return { ...prev, ...priceMap };
        });
        setError(null);
      }
    } catch (err) {
      console.warn('Top coin prices:', err.message);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refresh: fetchPrices };
}

export default {
  useTrendingTokens,
  useTokenSearch,
  useTokenStats,
  useChartData,
  useTokenPairs,
  useLatestTrades,
  useFullTokenData,
  useTokenDetails,
  useBinanceTopCoinPrices,
};
