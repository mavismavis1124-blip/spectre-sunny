/**
 * Watchlist prices hook
 * Shared realtime pricing across watchlist surfaces
 *
 * Strategy:
 * - Major tokens (BTC, ETH, SOL, etc.): CoinGecko API (reliable, has 1W/1M/1Y) + Binance (real-time prices)
 * - On-chain tokens: Codex API (on-chain data, age, txns, makers)
 *
 * Refresh: 60 seconds for full data, 5 seconds for real-time prices
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDetailedTokenInfo, searchTokens, getTokenPriceBySymbol } from '../services/codexApi';
import { getMajorTokenPrices } from '../services/coinGeckoApi';
import { getBinancePrices } from '../services/binanceApi';
import { isMajorToken, getMajorTokenAddress, usesCoinGecko, COINGECKO_LOGOS, MAJOR_TOKEN_INFO, SYMBOL_TO_COINGECKO_ID } from '../constants/majorTokens';
import { isTabVisible } from './useVisibilityAwarePolling';
import { batchRequests } from '../utils/requestThrottling';

const REFRESH_INTERVAL = 60 * 1000; // 60 seconds for full data
const REALTIME_INTERVAL = 5 * 1000; // 5 seconds for real-time prices
const BACKGROUND_REFRESH_INTERVAL = 300 * 1000; // 5 minutes when tab is hidden

// Get logo for a token
const getLogoForToken = (symbol, apiLogo) => {
  if (apiLogo && !apiLogo.includes('placeholder')) return apiLogo;
  const upperSymbol = (symbol || '').toUpperCase();
  return COINGECKO_LOGOS[upperSymbol] || null;
};

export default function useWatchlistPrices(watchlist = []) {
  const [liveData, setLiveData] = useState({});
  const [realtimePrices, setRealtimePrices] = useState({});
  const [loading, setLoading] = useState(false);
  const lastUpdatedRef = useRef(null);

  // Get major token symbols from watchlist for real-time updates
  // Use watchlist symbols string as key to avoid unnecessary recalculations
  const watchlistSymbolsKey = watchlist?.map(t => t.symbol || '').join(',') || ''
  const majorSymbolsInWatchlist = useMemo(() => {
    if (!watchlist) return [];
    return watchlist
      .map(token => (token.symbol || '').toUpperCase())
      .filter(symbol => isMajorToken(symbol));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbolsKey]);

  // Fetch real-time prices from Binance (every 5s)
  const majorSymbolsKey = majorSymbolsInWatchlist.join(',')
  const fetchRealtimePrices = useCallback(async () => {
    if (majorSymbolsInWatchlist.length === 0) return;

    try {
      const binancePrices = await getBinancePrices(majorSymbolsInWatchlist);
      if (binancePrices && Object.keys(binancePrices).length > 0) {
        setRealtimePrices(prev => {
          // Only update if prices actually changed — prevents unnecessary re-renders
          let changed = false;
          for (const sym of Object.keys(binancePrices)) {
            const old = prev[sym];
            const nw = binancePrices[sym];
            if (!old || old.price !== nw?.price || old.change !== nw?.change) {
              changed = true;
              break;
            }
          }
          if (!changed) return prev; // same ref → no re-render
          return { ...prev, ...binancePrices };
        });
      }
    } catch (err) {
      // Silent fail for real-time - main data still works
      console.debug('Binance real-time fetch failed:', err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorSymbolsKey]);

  const fetchWatchlistData = useCallback(async () => {
    if (!watchlist || watchlist.length === 0) {
      setLiveData({});
      return;
    }

    setLoading(true);

    try {
      // Separate tokens by data source:
      // - CoinGecko tokens: any token with a CoinGecko ID (BTC, ETH, SPECTRE, PEPE, etc.)
      // - On-chain tokens: tokens with addresses but NO CoinGecko ID (use Codex)
      // - Unknown tokens: tokens without addresses that need lookup
      const coinGeckoSymbols = [];
      const onChainTokens = [];
      const unknownTokens = [];

      watchlist.forEach(token => {
        const symbol = (token.symbol || '').toUpperCase();
        const hasCoinGeckoId = !!SYMBOL_TO_COINGECKO_ID[symbol];
        const majorTokenAddress = getMajorTokenAddress(symbol);
        const tokenAddress = token.address || majorTokenAddress;

        if (hasCoinGeckoId) {
          // Token has a CoinGecko ID - use CoinGecko for price data (most reliable)
          coinGeckoSymbols.push(symbol);
          // Also add to on-chain if it has an address (for extra data like age, txns)
          if (tokenAddress) {
            onChainTokens.push({
              ...token,
              address: tokenAddress,
              networkId: token.networkId || MAJOR_TOKEN_INFO[symbol]?.networkId || 1,
            });
          }
        } else if (tokenAddress) {
          // Token has an address but no CoinGecko ID - use Codex for price data
          onChainTokens.push({
            ...token,
            address: tokenAddress,
            networkId: token.networkId || MAJOR_TOKEN_INFO[symbol]?.networkId || 1,
          });
        } else {
          // Unknown token - need to search for it
          unknownTokens.push(token);
        }
      });

      const newData = {};

      // 1. Fetch CoinGecko prices for standard major tokens (BTC, ETH, etc.)
      if (coinGeckoSymbols.length > 0) {
        try {
          const coinGeckoPrices = await getMajorTokenPrices(coinGeckoSymbols);
          Object.entries(coinGeckoPrices).forEach(([symbol, data]) => {
            newData[symbol] = {
              price: data.price,
              change: data.change,
              change5m: 0, // Not available from CoinGecko
              change1h: data.change1h || 0,
              change6h: 0, // Not available
              change24h: data.change,
              change7d: data.change7d || 0,
              change30d: data.change30d || 0,
              change1y: data.change1y || 0,
              volume: data.volume,
              marketCap: data.marketCap,
              liquidity: data.liquidity,
              logo: data.logo || COINGECKO_LOGOS[symbol],
              isMajor: true,
            };
          });
        } catch (err) {
          console.warn('Failed to fetch CoinGecko prices:', err);
        }
      }

      // 2. For unknown tokens (no address), search Codex to find them
      if (unknownTokens.length > 0) {
        for (const token of unknownTokens) {
          try {
            const symbol = token.symbol || token.name;
            console.log(`Searching for unknown token: ${symbol}`);
            const searchResult = await searchTokens(symbol);
            if (searchResult?.filterTokens?.results?.length > 0) {
              const found = searchResult.filterTokens.results[0];
              // Add to on-chain tokens with found address
              onChainTokens.push({
                ...token,
                address: found.token?.address || found.address,
                networkId: found.token?.networkId || found.networkId || 1,
              });
            }
          } catch (err) {
            console.warn(`Failed to search for ${token.symbol}:`, err.message);
          }
        }
      }

      // 3. Fetch on-chain token data from Codex (individual requests, limited)
      if (onChainTokens.length > 0) {
        // Limit concurrent requests to avoid rate limiting
        const batchSize = 3;
        for (let i = 0; i < onChainTokens.length; i += batchSize) {
          const batch = onChainTokens.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (token) => {
              try {
                const info = await getDetailedTokenInfo(token.address, token.networkId || 1);
                if (info) {
                  const addrKey = token.address.toLowerCase();
                  const symKey = (token.symbol || '').toUpperCase();
                  // Format age as days/months/years
                  let ageDisplay = null;
                  const ageDays = info.age ?? (info.createdAt ? Math.floor((Date.now() / 1000 - info.createdAt) / (60 * 60 * 24)) : null);
                  if (ageDays != null && ageDays >= 0) {
                    if (ageDays >= 365) {
                      ageDisplay = `${Math.floor(ageDays / 365)}y`;
                    } else if (ageDays >= 30) {
                      ageDisplay = `${Math.floor(ageDays / 30)}mo`;
                    } else {
                      ageDisplay = `${ageDays}d`;
                    }
                  }
                  
                  const priceData = {
                    price: parseFloat(info.price ?? info.priceUSD ?? 0) || 0,
                    change: parseFloat(info.change24 ?? info.change ?? 0) || 0,
                    change5m: parseFloat(info.change5m ?? 0) || 0,
                    change1h: parseFloat(info.change1h ?? info.change1 ?? 0) || 0,
                    change6h: parseFloat(info.change6h ?? info.change6 ?? 0) || 0,
                    change24h: parseFloat(info.change24 ?? info.change ?? 0) || 0,
                    volume: info.volume24 ?? info.volume ?? 0,
                    marketCap: info.marketCap ?? info.calculatedMarketCap ?? 0,
                    liquidity: info.liquidity ?? 0,
                    logo: info.logo || info.info?.imageThumbUrl || info.token?.info?.imageThumbUrl || null,
                    age: ageDisplay,
                    txns: info.txnCount24 ?? info.txnCount ?? 0,
                    makers: info.uniqueWallets24 ?? 0,
                    holders: info.holders ?? 0,
                    isMajor: false,
                  };
                  // Store by both address and symbol for lookup
                  newData[addrKey] = priceData;
                  if (symKey) newData[symKey] = priceData;
                }
              } catch (err) {
                console.warn(`Failed to fetch on-chain data for ${token.symbol}:`, err.message);
              }
            })
          );
          // Small delay between batches to avoid rate limiting
          if (i + batchSize < onChainTokens.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      // 4. DexScreener fallback for on-chain tokens that Codex couldn't price
      const unpricedOnChain = onChainTokens.filter(t => {
        const sym = (t.symbol || '').toUpperCase();
        const addr = t.address?.toLowerCase();
        return !newData[sym]?.price && !newData[addr]?.price;
      });
      if (unpricedOnChain.length > 0) {
        for (const token of unpricedOnChain) {
          try {
            const addr = token.address;
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
            if (res.ok) {
              const json = await res.json();
              const pair = json?.pairs?.[0];
              if (pair?.priceUsd) {
                const symKey = (token.symbol || '').toUpperCase();
                const addrKey = addr.toLowerCase();
                const priceData = {
                  price: parseFloat(pair.priceUsd) || 0,
                  change: parseFloat(pair.priceChange?.h24 ?? 0) || 0,
                  change5m: parseFloat(pair.priceChange?.m5 ?? 0) || 0,
                  change1h: parseFloat(pair.priceChange?.h1 ?? 0) || 0,
                  change6h: parseFloat(pair.priceChange?.h6 ?? 0) || 0,
                  change24h: parseFloat(pair.priceChange?.h24 ?? 0) || 0,
                  volume: parseFloat(pair.volume?.h24 ?? 0) || 0,
                  marketCap: parseFloat(pair.marketCap ?? pair.fdv ?? 0) || 0,
                  liquidity: parseFloat(pair.liquidity?.usd ?? 0) || 0,
                  logo: pair.info?.imageUrl || null,
                  isMajor: false,
                };
                newData[addrKey] = priceData;
                if (symKey) newData[symKey] = priceData;
                console.log(`[DexScreener] ${symKey}: $${priceData.price}`);
              }
            }
          } catch (err) {
            console.warn(`DexScreener fallback failed for ${token.symbol}:`, err.message);
          }
        }
      }

      setLiveData(prev => ({ ...prev, ...newData }));
      lastUpdatedRef.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch watchlist prices:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbolsKey]);

  // Main watchlist data polling with visibility awareness
  useEffect(() => {
    const intervalRef = { current: null };
    
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Use longer interval when tab is hidden
      const interval = isTabVisible() ? REFRESH_INTERVAL : BACKGROUND_REFRESH_INTERVAL;
      intervalRef.current = setInterval(fetchWatchlistData, interval);
    };
    
    fetchWatchlistData();
    setupInterval();
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      setupInterval();
      // Fetch immediately when becoming visible
      if (isTabVisible()) {
        fetchWatchlistData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchWatchlistData]);

  // Real-time price updates with visibility awareness (pause when hidden)
  useEffect(() => {
    const intervalRef = { current: null };
    
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Only poll real-time prices when tab is visible
      if (isTabVisible()) {
        intervalRef.current = setInterval(fetchRealtimePrices, REALTIME_INTERVAL);
      }
    };
    
    fetchRealtimePrices();
    setupInterval();
    
    const handleVisibilityChange = () => {
      setupInterval();
      if (isTabVisible()) {
        fetchRealtimePrices();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchRealtimePrices]);

  // Merge live data with watchlist tokens (including real-time prices)
  const watchlistWithLiveData = useMemo(() => {
    if (!watchlist) return [];

    return watchlist.map((token) => {
      const symbol = (token.symbol || '').toUpperCase();
      const addrKey = token.address?.toLowerCase();

      // Check for data by symbol (majors) or address (on-chain)
      const data = liveData[symbol] || (addrKey ? liveData[addrKey] : null);

      // Get real-time price from Binance (for major tokens)
      const realtime = realtimePrices[symbol];

      if (!data && !realtime) {
        return {
          ...token,
          logo: getLogoForToken(token.symbol, token.logo),
          hasLiveData: false,
        };
      }

      return {
        ...token,
        // Use real-time price from Binance if available, otherwise use CoinGecko/Codex
        price: (realtime?.price > 0 ? realtime.price : null) ?? data?.price ?? token.price,
        change: realtime?.change ?? data?.change ?? token.change,
        change5m: data?.change5m ?? 0,
        change1h: data?.change1h ?? 0,
        change6h: data?.change6h ?? 0,
        change24h: data?.change24h ?? data?.change ?? token.change,
        change7d: data?.change7d ?? 0,
        change30d: data?.change30d ?? 0,
        change1y: data?.change1y ?? 0,
        volume: realtime?.volume ?? data?.volume ?? token.volume,
        marketCap: data?.marketCap ?? token.marketCap,
        liquidity: data?.liquidity ?? token.liquidity,
        logo: getLogoForToken(token.symbol, data?.logo || token.logo),
        age: data?.age,
        txns: data?.txns,
        makers: data?.makers,
        isMajor: data?.isMajor ?? isMajorToken(symbol),
        hasLiveData: true,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistSymbolsKey, liveData, realtimePrices]);

  return {
    watchlistWithLiveData,
    liveData,
    loading,
    lastUpdated: lastUpdatedRef.current,
    refresh: fetchWatchlistData,
  };
}
