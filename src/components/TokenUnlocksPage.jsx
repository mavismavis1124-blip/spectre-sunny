/**
 * TokenUnlocksPage Component
 * Full calendar view of upcoming token unlocks
 * Features: time range filter, sort by value/percent, severity color coding
 */
import React, { useState, useEffect, useMemo } from 'react'
import './TokenUnlocksPage.css'

const SEVERITY_COLORS = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', text: '#EF4444', label: 'High Risk' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#F59E0B', label: 'Medium' },
  low: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', text: '#10B981', label: 'Low Risk' },
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
  'MKR': 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  'LDO': 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
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

const formatLargeNumber = (num) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateFull = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const TokenUnlocksPage = () => {
  const [unlocks, setUnlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(60)
  const [sortBy, setSortBy] = useState('date') // date, value, percent, severity
  const [typeFilter, setTypeFilter] = useState('all') // all, cliff, linear
  const [severityFilter, setSeverityFilter] = useState('all') // all, high, medium, low

  useEffect(() => {
    const fetchUnlocks = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/unlocks/upcoming?days=${days}&limit=100`)
        if (!response.ok) throw new Error('Failed to fetch unlocks')
        const data = await response.json()
        setUnlocks(data.unlocks || [])
        setError(null)
      } catch (err) {
        console.error('Token unlocks fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUnlocks()
    const interval = setInterval(fetchUnlocks, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [days])

  const filteredAndSortedUnlocks = useMemo(() => {
    let filtered = unlocks.filter(u => {
      const severity = getSeverity(u.percentOfSupply)
      if (severityFilter !== 'all' && severity !== severityFilter) return false
      if (typeFilter !== 'all' && u.type !== typeFilter) return false
      return new Date(u.unlockDate) > new Date()
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.unlockDate) - new Date(b.unlockDate)
        case 'value':
          return (b.valueUsd || 0) - (a.valueUsd || 0)
        case 'percent':
          return (b.percentOfSupply || 0) - (a.percentOfSupply || 0)
        case 'severity':
          const severityOrder = { high: 3, medium: 2, low: 1 }
          return severityOrder[getSeverity(b.percentOfSupply)] - severityOrder[getSeverity(a.percentOfSupply)]
        default:
          return 0
      }
    })

    return filtered
  }, [unlocks, sortBy, typeFilter, severityFilter])

  const stats = useMemo(() => {
    const totalValue = filteredAndSortedUnlocks.reduce((sum, u) => sum + (u.valueUsd || 0), 0)
    const totalTokens = filteredAndSortedUnlocks.length
    const highRisk = filteredAndSortedUnlocks.filter(u => getSeverity(u.percentOfSupply) === 'high').length
    const cliffCount = filteredAndSortedUnlocks.filter(u => u.type === 'cliff').length
    return { totalValue, totalTokens, highRisk, cliffCount }
  }, [filteredAndSortedUnlocks])

  const groupedByMonth = useMemo(() => {
    const groups = {}
    filteredAndSortedUnlocks.forEach(u => {
      const date = new Date(u.unlockDate)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = { label, unlocks: [] }
      groups[key].unlocks.push(u)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredAndSortedUnlocks])

  return (
    <div className="token-unlocks-page">
      <div className="token-unlocks-page-header">
        <div className="token-unlocks-page-title-section">
          <h1 className="token-unlocks-page-title">
            <span className="title-icon">🔓</span>
            Token Unlocks Calendar
          </h1>
          <p className="token-unlocks-page-subtitle">
            Track upcoming token unlocks and vesting schedules. High-risk unlocks (&gt;5% of supply) marked in red.
          </p>
        </div>
      </div>

      <div className="token-unlocks-stats-bar">
        <div className="stat-card">
          <span className="stat-value">{formatNumber(stats.totalValue)}</span>
          <span className="stat-label">Total Value ({days}d)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalTokens}</span>
          <span className="stat-label">Unlocks</span>
        </div>
        <div className="stat-card high-risk">
          <span className="stat-value" style={{ color: SEVERITY_COLORS.high.text }}>{stats.highRisk}</span>
          <span className="stat-label">High Risk (&gt;5%)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.cliffCount}</span>
          <span className="stat-label">Cliff Unlocks</span>
        </div>
      </div>

      <div className="token-unlocks-filters">
        <div className="filter-group">
          <label>Time Range</label>
          <div className="filter-buttons">
            {[7, 30, 60, 90].map(d => (
              <button
                key={d}
                className={days === d ? 'active' : ''}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Unlock Date</option>
            <option value="value">Value (High → Low)</option>
            <option value="percent">Supply % (High → Low)</option>
            <option value="severity">Risk Level</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Unlock Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="cliff">Cliff</option>
            <option value="linear">Linear</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Risk Level</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="high">High (&gt;5%)</option>
            <option value="medium">Medium (1-5%)</option>
            <option value="low">Low (&lt;1%)</option>
          </select>
        </div>
      </div>

      <div className="token-unlocks-legend">
        <span className="legend-title">Risk Levels:</span>
        {Object.entries(SEVERITY_COLORS).map(([key, colors]) => (
          <span key={key} className="legend-item">
            <span className="legend-dot" style={{ background: colors.border }}></span>
            <span style={{ color: colors.text }}>{colors.label}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="token-unlocks-page-loading">
          <div className="loading-spinner-large"></div>
          <span>Loading unlock calendar...</span>
        </div>
      ) : error && filteredAndSortedUnlocks.length === 0 ? (
        <div className="token-unlocks-page-error">
          <span>⚠️ Failed to load unlocks. Please try again later.</span>
        </div>
      ) : (
        <div className="token-unlocks-calendar">
          {groupedByMonth.length === 0 ? (
            <div className="token-unlocks-empty-state">
              <div className="empty-icon">📭</div>
              <h3>No upcoming unlocks</h3>
              <p>No token unlocks match your current filters for the next {days} days.</p>
            </div>
          ) : (
            groupedByMonth.map(([key, { label, unlocks }]) => (
              <div key={key} className="calendar-month">
                <div className="month-header">
                  <h3>{label}</h3>
                  <span className="month-count">{unlocks.length} unlocks</span>
                </div>
                <div className="month-unlocks">
                  {unlocks.map((unlock) => {
                    const severity = getSeverity(unlock.percentOfSupply)
                    const colors = SEVERITY_COLORS[severity]
                    const logo = TOKEN_LOGOS[unlock.token.toUpperCase()]
                    const daysUntil = Math.ceil((new Date(unlock.unlockDate) - new Date()) / (1000 * 60 * 60 * 24))

                    return (
                      <div
                        key={`${unlock.token}-${unlock.unlockDate}`}
                        className="calendar-unlock-card"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeft: `4px solid ${colors.border}`,
                        }}
                      >
                        <div className="unlock-card-header">
                          <div className="unlock-card-token">
                            {logo ? (
                              <img src={logo} alt={unlock.token} className="unlock-card-logo" />
                            ) : (
                              <div className="unlock-card-initial">{unlock.token.slice(0, 2)}</div>
                            )}
                            <div className="unlock-card-token-info">
                              <span className="unlock-card-symbol">{unlock.token}</span>
                              <span className="unlock-card-type">{unlock.type}</span>
                            </div>
                          </div>
                          <div className="unlock-card-risk" style={{ color: colors.text }}>
                            {colors.label}
                          </div>
                        </div>

                        <div className="unlock-card-details">
                          <div className="unlock-card-date">
                            <span className="date-label">Unlock Date</span>
                            <span className="date-value">{formatDateFull(unlock.unlockDate)}</span>
                            <span className="days-until">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          </div>

                          <div className="unlock-card-metrics">
                            <div className="metric">
                              <span className="metric-label">Amount</span>
                              <span className="metric-value">{formatLargeNumber(unlock.amount)}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Value</span>
                              <span className="metric-value">{formatNumber(unlock.valueUsd)}</span>
                            </div>
                            <div className="metric highlight">
                              <span className="metric-label">% of Supply</span>
                              <span className="metric-value" style={{ color: colors.text }}>
                                {unlock.percentOfSupply.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="unlock-card-footer">
                          <div className="supply-bar">
                            <div 
                              className="supply-bar-fill" 
                              style={{ 
                                width: `${Math.min(unlock.percentOfSupply * 10, 100)}%`,
                                background: colors.border
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default TokenUnlocksPage
