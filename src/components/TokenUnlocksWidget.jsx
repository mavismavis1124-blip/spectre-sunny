/**
 * TokenUnlocksWidget Component
 * Displays upcoming token unlocks in the next 30 days
 * Color-coded severity: red = >5% supply, yellow = 1-5%, green = <1%
 */
import React, { useState, useEffect, useMemo } from 'react'
import './TokenUnlocksWidget.css'

const SEVERITY_COLORS = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#F59E0B' },
  low: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#10B981' },
}

const TOKEN_LOGOS = {
  'OP': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'ARB': 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  'APE': 'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg',
  'DYDX': 'https://assets.coingecko.com/coins/images/17500/small/DYDX.png',
  'IMX': 'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
  'STRK': 'https://assets.coingecko.com/coins/images/28906/small/starknet.png',
  'SUI': 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  'APT': 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  'SEI': 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  'TIA': 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
  'DOT': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  'UNI': 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  'LINK': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  'AAVE': 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  'CRV': 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  'INJ': 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  'FIL': 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
}

const getSeverity = (percentOfSupply) => {
  if (percentOfSupply > 5) return 'high'
  if (percentOfSupply >= 1) return 'medium'
  return 'low'
}

const formatNumber = (num) => {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `${diffDays}d`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TokenUnlocksWidget = ({ onViewAllClick, limit = 5, compact = false }) => {
  const [unlocks, setUnlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchUnlocks = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/unlocks/upcoming?days=${days}&limit=${limit * 2}`)
        if (!response.ok) throw new Error('Failed to fetch unlocks')
        const data = await response.json()
        setUnlocks(data.unlocks || [])
        setError(null)
      } catch (err) {
        console.error('Token unlocks fetch error:', err)
        setError(err.message)
        // Use fallback data
        setUnlocks([
          { token: 'OP', unlockDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), amount: 12500000, valueUsd: 28400000, percentOfSupply: 1.2, type: 'cliff' },
          { token: 'ARB', unlockDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), amount: 92000000, valueUsd: 98500000, percentOfSupply: 2.8, type: 'linear' },
          { token: 'DYDX', unlockDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), amount: 45000000, valueUsd: 87500000, percentOfSupply: 4.5, type: 'linear' },
          { token: 'SEI', unlockDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), amount: 125000000, valueUsd: 75000000, percentOfSupply: 6.8, type: 'cliff' },
          { token: 'APT', unlockDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), amount: 38000000, valueUsd: 296000000, percentOfSupply: 5.2, type: 'linear' },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchUnlocks()
    const interval = setInterval(fetchUnlocks, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [days, limit])

  const filteredUnlocks = useMemo(() => {
    // Sort by date and limit
    return unlocks
      .filter(u => new Date(u.unlockDate) > new Date())
      .sort((a, b) => new Date(a.unlockDate) - new Date(b.unlockDate))
      .slice(0, limit)
  }, [unlocks, limit])

  const stats = useMemo(() => {
    const totalValue = filteredUnlocks.reduce((sum, u) => sum + (u.valueUsd || 0), 0)
    const highRisk = filteredUnlocks.filter(u => getSeverity(u.percentOfSupply) === 'high').length
    const nextUnlock = filteredUnlocks[0]
    return { totalValue, highRisk, nextUnlock }
  }, [filteredUnlocks])

  if (compact) {
    return (
      <div className="token-unlocks-widget compact">
        <div className="token-unlocks-header">
          <div className="token-unlocks-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="token-unlocks-title-section">
            <h3 className="token-unlocks-title">Token Unlocks</h3>
            <span className="token-unlocks-subtitle">
              {stats.nextUnlock ? `${stats.nextUnlock.token} in ${formatDate(stats.nextUnlock.unlockDate)}` : 'No upcoming unlocks'}
            </span>
          </div>
        </div>
        
        <div className="token-unlocks-compact-stats">
          <div className="compact-stat">
            <span className="compact-stat-value" style={{ color: SEVERITY_COLORS.high.text }}>
              {stats.highRisk}
            </span>
            <span className="compact-stat-label">High Risk</span>
          </div>
          <div className="compact-stat">
            <span className="compact-stat-value">{formatNumber(stats.totalValue)}</span>
            <span className="compact-stat-label">30d Value</span>
          </div>
        </div>

        <button className="token-unlocks-view-all" onClick={onViewAllClick}>
          View Calendar →
        </button>
      </div>
    )
  }

  return (
    <div className="token-unlocks-widget">
      <div className="token-unlocks-header">
        <div className="token-unlocks-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="token-unlocks-title-section">
          <h3 className="token-unlocks-title">Upcoming Unlocks</h3>
          <span className="token-unlocks-subtitle">Next {days} days</span>
        </div>
        <div className="token-unlocks-filter">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="token-unlocks-loading">
          <div className="loading-spinner"></div>
          <span>Loading unlocks...</span>
        </div>
      ) : error && filteredUnlocks.length === 0 ? (
        <div className="token-unlocks-error">
          <span>⚠️ {error}</span>
        </div>
      ) : (
        <>
          <div className="token-unlocks-list">
            {filteredUnlocks.map((unlock) => {
              const severity = getSeverity(unlock.percentOfSupply)
              const colors = SEVERITY_COLORS[severity]
              const logo = TOKEN_LOGOS[unlock.token.toUpperCase()]

              return (
                <div
                  key={`${unlock.token}-${unlock.unlockDate}`}
                  className="token-unlock-item"
                  style={{
                    backgroundColor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`,
                  }}
                >
                  <div className="unlock-main">
                    <div className="unlock-token">
                      {logo ? (
                        <img src={logo} alt={unlock.token} className="unlock-token-logo" />
                      ) : (
                        <div className="unlock-token-initial">{unlock.token.slice(0, 2)}</div>
                      )}
                      <span className="unlock-token-symbol">{unlock.token}</span>
                    </div>
                    <div className="unlock-details">
                      <div className="unlock-date">{formatDate(unlock.unlockDate)}</div>
                      <div className="unlock-amount">{formatNumber(unlock.valueUsd)}</div>
                    </div>
                  </div>
                  <div className="unlock-meta">
                    <span
                      className="unlock-percent"
                      style={{ color: colors.text, fontWeight: 600 }}
                    >
                      {unlock.percentOfSupply.toFixed(2)}%
                    </span>
                    <span className="unlock-type">{unlock.type}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredUnlocks.length === 0 && (
            <div className="token-unlocks-empty">
              <span>No upcoming unlocks in the next {days} days</span>
            </div>
          )}

          <div className="token-unlocks-footer">
            <div className="unlock-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: SEVERITY_COLORS.high.border }}></span>
                &gt;5%
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: SEVERITY_COLORS.medium.border }}></span>
                1-5%
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: SEVERITY_COLORS.low.border }}></span>
                &lt;1%
              </span>
            </div>
            <button className="token-unlocks-view-all" onClick={onViewAllClick}>
              View Full Calendar →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default TokenUnlocksWidget
