/**
 * DeFiYieldsPage — Full page DeFi yield aggregator
 * Features: chain filter dropdown, min TVL slider, stablecoin toggle,
 * sortable table, pagination
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeFiYields } from '../hooks/useDeFiYields'
import './DeFiYieldsPage.css'

// Available chains (most popular from DeFiLlama)
const CHAINS = [
  { id: '', name: 'All Chains' },
  { id: 'ethereum', name: 'Ethereum', icon: '⧫' },
  { id: 'solana', name: 'Solana', icon: '◎' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'polygon', name: 'Polygon', icon: '💜' },
  { id: 'avalanche', name: 'Avalanche', icon: '🔺' },
  { id: 'bsc', name: 'BSC', icon: '🟡' },
  { id: 'fantom', name: 'Fantom', icon: '👻' },
  { id: 'linea', name: 'Linea', icon: '📊' },
  { id: 'scroll', name: 'Scroll', icon: '📜' },
  { id: 'zksync', name: 'zkSync', icon: '⚡' },
  { id: 'mantle', name: 'Mantle', icon: '🟢' },
  { id: 'blast', name: 'Blast', icon: '💥' },
  { id: 'metis', name: 'Metis', icon: '🟣' },
]

// TVL options for slider
const TVL_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 100000, label: '$100K' },
  { value: 500000, label: '$500K' },
  { value: 1000000, label: '$1M' },
  { value: 5000000, label: '$5M' },
  { value: 10000000, label: '$10M' },
  { value: 50000000, label: '$50M' },
  { value: 100000000, label: '$100M' },
]

const PAGE_SIZE = 20

function formatCompact(num) {
  if (!num || num === 0) return '$0'
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

function formatApy(apy) {
  const value = apy || 0
  let colorClass = 'apy-low'
  if (value >= 50) colorClass = 'apy-high'
  else if (value >= 20) colorClass = 'apy-medium'
  else if (value >= 10) colorClass = 'apy-moderate'

  return {
    text: `${value.toFixed(2)}%`,
    className: colorClass,
  }
}

export default function DeFiYieldsPage({ dayMode = false, onBack }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)

  const { data, loading, error, refetch, filters, setFilters } = useDeFiYields({
    limit: 100,
    sort: 'apy',
  })

  // Get unique chains from data for dynamic filter options
  const availableChains = useMemo(() => {
    if (!data?.data) return CHAINS
    const dataChains = [...new Set(data.data.map(p => p.chain))]
    return [
      { id: '', name: 'All Chains' },
      ...dataChains.map(chain => {
        const known = CHAINS.find(c => c.id === chain.toLowerCase())
        return {
          id: chain.toLowerCase(),
          name: known?.name || chain,
          icon: known?.icon || '🌐',
        }
      }),
    ]
  }, [data])

  const handleChainChange = useCallback((e) => {
    setFilters(prev => ({ ...prev, chain: e.target.value }))
    setPage(1)
  }, [setFilters])

  const handleTvlChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10)
    setFilters(prev => ({ ...prev, minTvl: value }))
    setPage(1)
  }, [setFilters])

  const handleStablecoinToggle = useCallback(() => {
    setFilters(prev => ({ ...prev, stablecoin: !prev.stablecoin }))
    setPage(1)
  }, [setFilters])

  const handleSortChange = useCallback((sortKey) => {
    setFilters(prev => ({ ...prev, sort: sortKey }))
    setPage(1)
  }, [setFilters])

  // Pagination
  const allPools = data?.data || []
  const totalPages = Math.ceil(allPools.length / PAGE_SIZE)
  const paginatedPools = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return allPools.slice(start, start + PAGE_SIZE)
  }, [allPools, page])

  const currentTvlLabel = TVL_OPTIONS.find(o => o.value === filters.minTvl)?.label || 'Any'

  return (
    <div className={`defi-yields-page ${dayMode ? 'day-mode' : ''}`}>
      <div className="defi-yields-header">
        <div className="defi-yields-header-left">
          {onBack && (
            <button type="button" className="defi-yields-back" onClick={onBack}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="defi-yields-title-group">
            <h1 className="defi-yields-title">
              <span className="defi-yields-title-icon">🌾</span>
              {t('defiYields.title', 'DeFi Yields')}
            </h1>
            <p className="defi-yields-subtitle">
              {t('defiYields.subtitle', 'Discover the best yield opportunities across DeFi')}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="defi-yields-refresh"
          onClick={refetch}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spinning' : ''}>
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="defi-yields-filters">
        <div className="defi-yields-filter-group">
          <label className="defi-yields-filter-label">
            {t('defiYields.chain', 'Chain')}
          </label>
          <div className="defi-yields-select-wrapper">
            <select
              value={filters.chain}
              onChange={handleChainChange}
              className="defi-yields-select"
            >
              {availableChains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.icon ? `${chain.icon} ` : ''}{chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="defi-yields-filter-group defi-yields-filter-tvl">
          <label className="defi-yields-filter-label">
            {t('defiYields.minTvl', 'Min TVL')}: <span className="defi-yields-filter-value">{currentTvlLabel}</span>
          </label>
          <input
            type="range"
            min="0"
            max={TVL_OPTIONS.length - 1}
            step="1"
            value={TVL_OPTIONS.findIndex(o => o.value === filters.minTvl)}
            onChange={handleTvlChange}
            className="defi-yields-slider"
          />
          <div className="defi-yields-slider-labels">
            <span>{TVL_OPTIONS[0].label}</span>
            <span>{TVL_OPTIONS[TVL_OPTIONS.length - 1].label}</span>
          </div>
        </div>

        <div className="defi-yields-filter-group">
          <label className="defi-yields-filter-label">
            {t('defiYields.stablecoin', 'Stablecoin Only')}
          </label>
          <button
            type="button"
            className={`defi-yields-toggle ${filters.stablecoin ? 'active' : ''}`}
            onClick={handleStablecoinToggle}
          >
            <span className="defi-yields-toggle-track">
              <span className="defi-yields-toggle-thumb" />
            </span>
            <span className="defi-yields-toggle-label">
              {filters.stablecoin ? t('common.yes', 'Yes') : t('common.no', 'No')}
            </span>
          </button>
        </div>

        <div className="defi-yields-filter-group">
          <label className="defi-yields-filter-label">
            {t('defiYields.sortBy', 'Sort By')}
          </label>
          <div className="defi-yields-sort-buttons">
            <button
              type="button"
              className={`defi-yields-sort-btn ${filters.sort === 'apy' ? 'active' : ''}`}
              onClick={() => handleSortChange('apy')}
            >
              {t('defiYields.highestApy', 'Highest APY')}
            </button>
            <button
              type="button"
              className={`defi-yields-sort-btn ${filters.sort === 'tvl' ? 'active' : ''}`}
              onClick={() => handleSortChange('tvl')}
            >
              {t('defiYields.highestTvl', 'Highest TVL')}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="defi-yields-error-banner">
          <span>{error}</span>
          <button type="button" onClick={refetch}>
            {t('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="defi-yields-stats">
        <div className="defi-yields-stat">
          <span className="defi-yields-stat-value">{allPools.length}</span>
          <span className="defi-yields-stat-label">{t('defiYields.pools', 'Pools')}</span>
        </div>
        {filters.chain && (
          <div className="defi-yields-stat">
            <span className="defi-yields-stat-value">{filters.chain}</span>
            <span className="defi-yields-stat-label">{t('defiYields.chain', 'Chain')}</span>
          </div>
        )}
        {filters.minTvl > 0 && (
          <div className="defi-yields-stat">
            <span className="defi-yields-stat-value">{formatCompact(filters.minTvl)}</span>
            <span className="defi-yields-stat-label">{t('defiYields.minTvl', 'Min TVL')}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="defi-yields-table-wrapper">
        <table className="defi-yields-full-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-protocol">{t('defiYields.protocol', 'Protocol')}</th>
              <th className="col-chain">{t('defiYields.chain', 'Chain')}</th>
              <th className="col-apy">
                <button
                  type="button"
                  className={`defi-yields-sort-header ${filters.sort === 'apy' ? 'active' : ''}`}
                  onClick={() => handleSortChange(filters.sort === 'apy' ? 'tvl' : 'apy')}
                >
                  {t('defiYields.apy', 'APY%')}
                  {filters.sort === 'apy' && <span className="sort-indicator">▼</span>}
                </button>
              </th>
              <th className="col-tvl">
                <button
                  type="button"
                  className={`defi-yields-sort-header ${filters.sort === 'tvl' ? 'active' : ''}`}
                  onClick={() => handleSortChange(filters.sort === 'tvl' ? 'apy' : 'tvl')}
                >
                  {t('defiYields.tvl', 'TVL')}
                  {filters.sort === 'tvl' && <span className="sort-indicator">▼</span>}
                </button>
              </th>
              <th className="col-token">{t('defiYields.token', 'Token')}</th>
              <th className="col-stable">{t('defiYields.stable', 'Stable')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && paginatedPools.length === 0 ? (
              <tr>
                <td colSpan={7} className="defi-yields-loading-cell">
                  <div className="defi-yields-spinner" />
                  <span>{t('common.loading', 'Loading...')}</span>
                </td>
              </tr>
            ) : paginatedPools.length === 0 ? (
              <tr>
                <td colSpan={7} className="defi-yields-empty-cell">
                  {t('defiYields.noPoolsFound', 'No pools match your filters')}
                </td>
              </tr>
            ) : (
              paginatedPools.map((pool, index) => {
                const apy = formatApy(pool.apy)
                const globalIndex = (page - 1) * PAGE_SIZE + index + 1
                return (
                  <tr key={pool.poolId || `${pool.protocol}-${globalIndex}`} className="defi-yields-pool-row">
                    <td className="col-rank">
                      <span className="defi-yields-rank-badge">{globalIndex}</span>
                    </td>
                    <td className="col-protocol">
                      <div className="defi-yields-protocol-info">
                        <span className="defi-yields-protocol-name">{pool.protocol}</span>
                        {pool.url && (
                          <a
                            href={pool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="defi-yields-external-link"
                            title={t('defiYields.visitProtocol', 'Visit protocol')}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="col-chain">
                      <div className="defi-yields-chain-cell">
                        <span className="defi-yields-chain-icon">
                          {CHAINS.find(c => c.id === pool.chain?.toLowerCase())?.icon || '🌐'}
                        </span>
                        <span className="defi-yields-chain-text">{pool.chain}</span>
                      </div>
                    </td>
                    <td className="col-apy">
                      <span className={`defi-yields-apy-value ${apy.className}`}>
                        {apy.text}
                      </span>
                      {pool.apyBase && pool.apyReward && (
                        <div className="defi-yields-apy-breakdown">
                          <span className="apy-base">{pool.apyBase.toFixed(1)}% base</span>
                          <span className="apy-reward">+{pool.apyReward.toFixed(1)}% reward</span>
                        </div>
                      )}
                    </td>
                    <td className="col-tvl">
                      <span className="defi-yields-tvl-value">{formatCompact(pool.tvlUsd)}</span>
                    </td>
                    <td className="col-token">
                      <span className="defi-yields-token-symbol">{pool.symbol}</span>
                    </td>
                    <td className="col-stable">
                      {pool.stablecoin ? (
                        <span className="defi-yields-stable-yes" title="Stablecoin pool">✓</span>
                      ) : (
                        <span className="defi-yields-stable-no">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="defi-yields-pagination">
          <button
            type="button"
            className="defi-yields-page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t('common.previous', 'Previous')}
          </button>
          <div className="defi-yields-page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`defi-yields-page-number ${pageNum === page ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="defi-yields-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            {t('common.next', 'Next')}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Footer note */}
      <div className="defi-yields-footer">
        <p className="defi-yields-disclaimer">
          {t('defiYields.disclaimer', 'Data provided by DeFiLlama. APYs are estimates and subject to change. DYOR.')} • {data?.timestamp ? new Date(data.timestamp).toLocaleString() : ''}
        </p>
      </div>
    </div>
  )
}
