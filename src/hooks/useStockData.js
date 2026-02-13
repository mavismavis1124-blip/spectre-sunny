/**
 * Stock Data Hooks
 * React hooks for fetching and managing stock market data
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getStockQuotes,
  getStockQuote,
  searchStocks,
  getStockCandles,
  getMarketMovers,
  getMarketStatus,
  getMarketIndices,
} from '../services/stockApi'
import { isTabVisible } from './useVisibilityAwarePolling'
import { deduplicatedRequest } from '../utils/requestThrottling'

/**
 * Hook for fetching real-time stock prices
 * @param {string[]} symbols - Array of stock symbols
 * @param {number} refreshInterval - Refresh interval in ms (default 60s)
 * @param {number} backgroundInterval - Interval when tab is hidden (default 5min)
 */
export function useStockPrices(symbols, refreshInterval = 60000, backgroundInterval = 300000) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  // Stable key for dependency tracking
  const symbolsKey = Array.isArray(symbols) && symbols.length > 0 ? symbols.join(',') : ''

  const fetchPrices = useCallback(async () => {
    // Skip if tab is hidden
    if (!isTabVisible()) {
      return
    }
    
    if (!symbolsKey) {
      setLoading(false)
      return
    }

    try {
      const syms = symbolsKey.split(',')
      const data = await deduplicatedRequest(`stock-prices-${symbolsKey}`, () => getStockQuotes(syms))
      if (data && Object.keys(data).length > 0) {
        setPrices(prev => ({ ...prev, ...data }))
        setError(null)
      }
    } catch (err) {
      console.warn('Stock prices fetch failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [symbolsKey])

  useEffect(() => {
    fetchPrices()
    if (!symbolsKey) return
    
    // Set up visibility-aware interval
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      const interval = isTabVisible() ? refreshInterval : backgroundInterval
      intervalRef.current = setInterval(fetchPrices, interval)
    }
    
    setupInterval()
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      setupInterval()
      if (isTabVisible()) {
        fetchPrices()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchPrices, refreshInterval, backgroundInterval, symbolsKey])

  return { prices, loading, error, refresh: fetchPrices }
}

/**
 * Hook for searching stocks
 * @param {string} query - Search query
 * @param {number} debounceMs - Debounce delay in ms
 */
export function useStockSearch(query, debounceMs = 300) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchStocks(query)
        setResults(data)
        setError(null)
      } catch (err) {
        console.warn('Stock search failed:', err.message)
        setError(err.message)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, debounceMs])

  return { results, loading, error }
}

/**
 * Hook for stock chart data (OHLC)
 * @param {string} symbol - Stock symbol
 * @param {string} resolution - Timeframe
 * @param {number} periodHours - How many hours of data to fetch
 */
export function useStockChartData(symbol, resolution = '1h', periodHours = 168) {
  const [bars, setBars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBars = useCallback(async () => {
    if (!symbol) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const to = Math.floor(Date.now() / 1000)
      const from = to - (periodHours * 60 * 60)

      const data = await getStockCandles(symbol, resolution, from, to)

      if (data?.getBars && data.getBars.length > 0) {
        const formattedBars = data.getBars.map(bar => ({
          time: bar.t * 1000,
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
        }))
        setBars(formattedBars)
        setError(null)
      } else {
        setBars([])
      }
    } catch (err) {
      console.warn('Stock chart data failed:', err.message)
      setError(err.message)
      setBars([])
    } finally {
      setLoading(false)
    }
  }, [symbol, resolution, periodHours])

  useEffect(() => {
    fetchBars()
  }, [fetchBars])

  return { bars, loading, error, refresh: fetchBars }
}

/**
 * Hook for market movers (top gainers/losers)
 * @param {number} refreshInterval - Refresh interval in ms
 * @param {number} backgroundInterval - Interval when tab is hidden (default 5min)
 */
export function useStockTrending(refreshInterval = 60000, backgroundInterval = 300000) {
  const [gainers, setGainers] = useState([])
  const [losers, setLosers] = useState([])
  const [mostActive, setMostActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchMovers = useCallback(async () => {
    // Skip if tab is hidden
    if (!isTabVisible()) {
      return
    }
    
    try {
      const data = await deduplicatedRequest('market-movers', () => getMarketMovers())
      setGainers(data.gainers || [])
      setLosers(data.losers || [])
      setMostActive(data.mostActive || [])
      setError(null)
    } catch (err) {
      console.warn('Market movers failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Skip if refreshInterval is null/falsy (disabled)
    if (!refreshInterval) {
      setLoading(false)
      return
    }
    
    fetchMovers()
    
    // Set up visibility-aware interval
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      const interval = isTabVisible() ? refreshInterval : backgroundInterval
      intervalRef.current = setInterval(fetchMovers, interval)
    }
    
    setupInterval()
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      setupInterval()
      if (isTabVisible()) {
        fetchMovers()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchMovers, refreshInterval, backgroundInterval])

  return { gainers, losers, mostActive, loading, error, refresh: fetchMovers }
}

/**
 * Hook for market status (open/closed)
 * Updates every minute
 */
export function useMarketStatus(refreshInterval = 60000) {
  const [status, setStatus] = useState(() => getMarketStatus())

  useEffect(() => {
    const updateStatus = () => setStatus(getMarketStatus())
    updateStatus()
    const interval = setInterval(updateStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return status
}

/**
 * Hook for market indices (S&P 500, Dow, Nasdaq, etc.)
 * @param {number} refreshInterval - Refresh interval in ms
 * @param {number} backgroundInterval - Interval when tab is hidden (default 5min)
 */
export function useMarketIndices(refreshInterval = 60000, backgroundInterval = 300000) {
  const [indices, setIndices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchIndices = useCallback(async () => {
    // Skip if tab is hidden
    if (!isTabVisible()) {
      return
    }
    
    try {
      const data = await deduplicatedRequest('market-indices', () => getMarketIndices())
      setIndices(data)
      setError(null)
    } catch (err) {
      console.warn('Market indices failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Skip if refreshInterval is null/falsy (disabled)
    if (!refreshInterval) {
      setLoading(false)
      return
    }
    
    fetchIndices()
    
    // Set up visibility-aware interval
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      const interval = isTabVisible() ? refreshInterval : backgroundInterval
      intervalRef.current = setInterval(fetchIndices, interval)
    }
    
    setupInterval()
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      setupInterval()
      if (isTabVisible()) {
        fetchIndices()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchIndices, refreshInterval, backgroundInterval])

  return { indices, loading, error, refresh: fetchIndices }
}

/**
 * Hook for single stock details
 * @param {number} refreshInterval - Refresh interval in ms
 * @param {number} backgroundInterval - Interval when tab is hidden (default 5min)
 */
export function useStockDetails(symbol, refreshInterval = 60000, backgroundInterval = 300000) {
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  const fetchDetails = useCallback(async () => {
    // Skip if tab is hidden
    if (!isTabVisible()) {
      return
    }
    
    if (!symbol) {
      setLoading(false)
      return
    }

    try {
      const data = await deduplicatedRequest(`stock-details-${symbol}`, () => getStockQuote(symbol))
      setStock(data)
      setError(null)
    } catch (err) {
      console.warn('Stock details failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchDetails()
    
    // Set up visibility-aware interval
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      const interval = isTabVisible() ? refreshInterval : backgroundInterval
      intervalRef.current = setInterval(fetchDetails, interval)
    }
    
    setupInterval()
    
    // Listen for visibility changes
    const handleVisibilityChange = () => {
      setupInterval()
      if (isTabVisible()) {
        fetchDetails()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchDetails, refreshInterval, backgroundInterval])

  return { stock, loading, error, refresh: fetchDetails }
}

export default {
  useStockPrices,
  useStockSearch,
  useStockChartData,
  useStockTrending,
  useMarketStatus,
  useMarketIndices,
  useStockDetails,
}
