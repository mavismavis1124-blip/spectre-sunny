/**
 * DeFiYieldsWidget — Compact widget showing top 10 DeFi yield opportunities
 * Displays in a table format with protocol, chain, APY%, TVL, and token symbol
 * Color-coded APY (green for high, red for low)
 */
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeFiYields } from '../hooks/useDeFiYields'
import './DeFiYieldsWidget.css'

// Chain icon mapping (using simple emoji/icons as fallback)
const CHAIN_ICONS = {
  ethereum: '⧫',
  solana: '◎',
  arbitrum: '🔷',
  optimism: '🔴',
  base: '🔵',
  polygon: '💜',
  avalanche: '🔺',
  bsc: '🟡',
  fantom: '👻',
  cronos: '🦁',
  linea: '📊',
  scroll: '📜',
  zksync: '⚡',
  mantle: '🟢',
  blast: '💥',
  metis: '🟣',
}

function getChainIcon(chain) {
  const key = chain?.toLowerCase()
  return CHAIN_ICONS[key] || '🌐'
}

// Format large numbers (e.g., 1.2M, 3.4B)
function formatCompact(num) {
  if (!num || num === 0) return '$0'
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

// Format APY with color coding
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

export default function DeFiYieldsWidget({ onViewAll }) {
  const { t } = useTranslation()
  const { data, loading, error } = useDeFiYields({ limit: 10, sort: 'apy' })

  const topYields = useMemo(() => {
    if (!data?.data) return []
    return data.data.slice(0, 10)
  }, [data])

  if (loading && !data) {
    return (
      <div className="defi-yields-widget">
        <div className="defi-yields-widget-header">
          <h3 className="defi-yields-widget-title">
            <span className="defi-yields-icon">🌾</span>
            {t('defiYields.widgetTitle', 'Top DeFi Yields')}
          </h3>
        </div>
        <div className="defi-yields-loading">
          <div className="defi-yields-spinner" />
          <span>{t('common.loading', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="defi-yields-widget">
        <div className="defi-yields-widget-header">
          <h3 className="defi-yields-widget-title">
            <span className="defi-yields-icon">🌾</span>
            {t('defiYields.widgetTitle', 'Top DeFi Yields')}
          </h3>
        </div>
        <div className="defi-yields-error">
          {t('defiYields.error', 'Failed to load yields')}
        </div>
      </div>
    )
  }

  return (
    <div className="defi-yields-widget">
      <div className="defi-yields-widget-header">
        <h3 className="defi-yields-widget-title">
          <span className="defi-yields-icon">🌾</span>
          {t('defiYields.widgetTitle', 'Top DeFi Yields')}
        </h3>
        {onViewAll && (
          <button
            type="button"
            className="defi-yields-view-all"
            onClick={onViewAll}
          >
            {t('common.viewAll', 'View All')}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      <div className="defi-yields-table-container">
        <table className="defi-yields-table">
          <thead>
            <tr>
              <th className="col-protocol">{t('defiYields.protocol', 'Protocol')}</th>
              <th className="col-chain">{t('defiYields.chain', 'Chain')}</th>
              <th className="col-apy">{t('defiYields.apy', 'APY%')}</th>
              <th className="col-tvl">{t('defiYields.tvl', 'TVL')}</th>
              <th className="col-token">{t('defiYields.token', 'Token')}</th>
            </tr>
          </thead>
          <tbody>
            {topYields.map((pool, index) => {
              const apy = formatApy(pool.apy)
              return (
                <tr key={pool.poolId || `${pool.protocol}-${index}`} className="defi-yields-row">
                  <td className="col-protocol">
                    <div className="defi-yields-protocol">
                      <span className="defi-yields-rank">#{index + 1}</span>
                      <span className="defi-yields-protocol-name">{pool.protocol}</span>
                      {pool.stablecoin && (
                        <span className="defi-yields-stable-badge" title="Stablecoin pool">
                          💲
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="col-chain">
                    <div className="defi-yields-chain">
                      <span className="defi-yields-chain-icon">{getChainIcon(pool.chain)}</span>
                      <span className="defi-yields-chain-name">{pool.chain}</span>
                    </div>
                  </td>
                  <td className="col-apy">
                    <span className={`defi-yields-apy ${apy.className}`}>
                      {apy.text}
                    </span>
                  </td>
                  <td className="col-tvl">
                    <span className="defi-yields-tvl">{formatCompact(pool.tvlUsd)}</span>
                  </td>
                  <td className="col-token">
                    <span className="defi-yields-symbol">{pool.symbol}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {topYields.length === 0 && !loading && (
        <div className="defi-yields-empty">
          {t('defiYields.noData', 'No yield opportunities found')}
        </div>
      )}
    </div>
  )
}
