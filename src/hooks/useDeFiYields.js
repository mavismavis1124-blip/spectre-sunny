/**
 * useDeFiYields — Hook for DeFi yield data from DeFiLlama
 * Includes caching and auto-refresh every 5 minutes
 *
 * Returns: { data, loading, error, refetch, filters, setFilters }
 *   data: { count, filters, data[], timestamp } | null
 *   loading: boolean
 *   error: string | null
 *   refetch(): manually refresh data
 *   filters: current filter state
 *   setFilters(fn): update filters (triggers refetch)
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const API_URL = '/api/defi/yields'
const CACHE_KEY = 'defi-yields-cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes client-side cache

function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore storage errors
  }
}

export function useDeFiYields(initialFilters = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFiltersState] = useState({
    chain: initialFilters.chain || '',
    minTvl: initialFilters.minTvl || 0,
    sort: initialFilters.sort || 'apy',
    stablecoin: initialFilters.stablecoin || false,
    limit: initialFilters.limit || 50,
  })
  const abortRef = useRef(null)

  const fetchData = useCallback(async (force = false) => {
    // Check client cache first
    if (!force) {
      const cached = getCachedData()
      if (cached) {
        setData(cached)
        return
      }
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.chain) params.append('chain', filters.chain)
      if (filters.minTvl > 0) params.append('minTvl', filters.minTvl)
      if (filters.sort) params.append('sort', filters.sort)
      if (filters.stablecoin) params.append('stablecoin', 'true')
      if (filters.limit) params.append('limit', filters.limit)

      const url = `${API_URL}?${params.toString()}`
      const response = await fetch(url, {
        signal: controller.signal,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error || `Request failed (${response.status})`)
      }

      const result = await response.json()
      setData(result)
      setCachedData(result)
      setLoading(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('DeFi yields fetch error:', err.message)
      setError(err.message || 'Failed to fetch yields')
      setLoading(false)
    }
  }, [filters])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true)
    }, CACHE_TTL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  const setFilters = useCallback((updater) => {
    setFiltersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      return next
    })
  }, [])

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  }
}
