/**
 * ChainVolumeBar Component
 * 24h DeFi volume heatmap split by blockchain networks
 * Inspired by OKX Signals heatmap
 * 
 * Visual encoding:
 * - Horizontal bar = time (hourly segments)
 * - Vertical stacking = chain volume share (%)
 * - Color intensity = volume relative to chain's hourly average
 * - Current hour = emphasized/highlighted
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import './ChainVolumeBar.css'

// Chain configuration with professional brighter colors
const CHAINS = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#8B9AFF',
    colorLight: '#A8B5FF',
    colorDark: '#6B7FFF',
    gradient: 'linear-gradient(135deg, #8B9AFF 0%, #7A8AEF 50%, #6B7FFF 100%)',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    color: '#7DD3A0',
    colorLight: '#9AE3B8',
    colorDark: '#5DC385',
    gradient: 'linear-gradient(135deg, #7DD3A0 0%, #6DC390 50%, #5DC385 100%)',
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    symbol: 'BNB',
    color: '#E0983D',
    colorLight: '#F0A84D',
    colorDark: '#D4882F',
    gradient: 'linear-gradient(135deg, #E0983D 0%, #D4882F 50%, #C8781F 100%)',
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    color: '#6B8AFF',
    colorLight: '#8AA5FF',
    colorDark: '#5A7AEF',
    gradient: 'linear-gradient(135deg, #6B8AFF 0%, #5A7AEF 50%, #4A6ADF 100%)',
  },
}

const CHAIN_ORDER = ['ethereum', 'solana', 'bsc', 'base']

// Generate mock hourly volume data
const generateMockData = (hours) => {
  const data = []
  const now = new Date()
  
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourData = {
      hour: hour,
      hourLabel: hour.getHours().toString().padStart(2, '0') + ':00',
      isCurrentHour: i === 0,
      chains: {}
    }
    
    // Generate volume for each chain with realistic patterns
    // ETH dominates, SOL has spikes, BSC steady, Base growing
    const timeOfDay = hour.getHours()
    const isUSHours = timeOfDay >= 13 && timeOfDay <= 22 // 1pm-10pm UTC (US market hours)
    const isAsiaHours = timeOfDay >= 0 && timeOfDay <= 8 // Asia hours
    
    // Base volumes with time-based modifiers
    const ethBase = 2.5 + Math.random() * 1.5
    const solBase = 0.8 + Math.random() * 1.2
    const bscBase = 0.4 + Math.random() * 0.4
    const baseBase = 0.2 + Math.random() * 0.3
    
    // Apply time-of-day modifiers
    const ethVolume = ethBase * (isUSHours ? 1.4 : 1) * (1 + Math.random() * 0.3)
    const solVolume = solBase * (isUSHours ? 1.6 : 0.8) * (1 + Math.random() * 0.5) * (Math.random() > 0.9 ? 2.5 : 1) // occasional spikes
    const bscVolume = bscBase * (isAsiaHours ? 1.3 : 1) * (1 + Math.random() * 0.2)
    const baseVolume = baseBase * (isUSHours ? 1.5 : 1) * (1 + Math.random() * 0.4)
    
    hourData.chains = {
      ethereum: { volume: ethVolume * 1e9, raw: ethVolume },
      solana: { volume: solVolume * 1e9, raw: solVolume },
      bsc: { volume: bscVolume * 1e9, raw: bscVolume },
      base: { volume: baseVolume * 1e9, raw: baseVolume },
    }
    
    // Calculate total and percentages
    const total = ethVolume + solVolume + bscVolume + baseVolume
    hourData.totalVolume = total * 1e9
    
    Object.keys(hourData.chains).forEach(chain => {
      hourData.chains[chain].percentage = (hourData.chains[chain].raw / total) * 100
    })
    
    data.push(hourData)
  }
  
  return data
}

// Calculate chain averages for intensity mapping
const calculateChainAverages = (data) => {
  const averages = {}
  CHAIN_ORDER.forEach(chain => {
    const volumes = data.map(d => d.chains[chain].volume)
    averages[chain] = volumes.reduce((a, b) => a + b, 0) / volumes.length
  })
  return averages
}

// Calculate narrative rankings based on chain volume patterns
const calculateNarrativeRankings = (chainTotals, hourlyData) => {
  // Get momentum
  const recentHours = Math.min(6, Math.floor(hourlyData.length / 2))
  const recentData = hourlyData.slice(-recentHours)
  const olderData = hourlyData.slice(0, recentHours)
  
  const momentum = {}
  CHAIN_ORDER.forEach(chain => {
    const recentAvg = recentData.reduce((sum, h) => sum + h.chains[chain].volume, 0) / recentData.length
    const olderAvg = olderData.reduce((sum, h) => sum + h.chains[chain].volume, 0) / olderData.length
    momentum[chain] = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  })
  
  const solPct = chainTotals.solanaPct || 0
  const ethPct = chainTotals.ethereumPct || 0
  const basePct = chainTotals.basePct || 0
  const bscPct = chainTotals.bscPct || 0
  
  // Score each narrative
  const narratives = [
    { 
      id: 'memes', name: 'Memes', icon: '🐸', condition: 'High SOL activity',
      score: (solPct * 1.5) + Math.max(0, momentum.solana * 0.8)
    },
    { 
      id: 'defi', name: 'DeFi', icon: '🏛️', condition: 'ETH dominance',
      score: (ethPct * 1.2) + Math.max(0, momentum.ethereum * 0.5)
    },
    { 
      id: 'launches', name: 'New Launches', icon: '🚀', condition: 'Base gaining',
      score: (basePct * 3) + Math.max(0, momentum.base * 1.2)
    },
    { 
      id: 'gaming', name: 'Gaming', icon: '🎮', condition: 'BSC elevated',
      score: (bscPct * 2.5) + Math.max(0, momentum.bsc * 1)
    },
    { 
      id: 'ai', name: 'AI Agents', icon: '🤖', condition: 'SOL surge',
      score: (solPct * 0.8) + (momentum.solana > 15 ? momentum.solana * 1.2 : Math.max(0, momentum.solana * 0.3))
    },
    { 
      id: 'infra', name: 'Infra & RWA', icon: '🔧', condition: 'ETH momentum',
      score: (ethPct * 0.8) + (momentum.ethereum > 10 ? momentum.ethereum * 1.5 : Math.max(0, momentum.ethereum * 0.4))
    },
    { 
      id: 'bluechip', name: 'Blue Chips', icon: '💎', condition: 'ETH stable',
      score: ethPct > 55 ? (ethPct * 1.1) + (Math.abs(momentum.ethereum) < 10 ? 20 : 0) : ethPct * 0.5
    },
    { 
      id: 'highbeta', name: 'High Beta', icon: '⚡', condition: 'SOL share up',
      score: (solPct * 1.3) + Math.max(0, momentum.solana * 0.6)
    },
  ]
  
  // Sort by score and assign ranks
  narratives.sort((a, b) => b.score - a.score)
  return narratives.map((n, i) => ({ ...n, rank: i + 1 }))
}

// Generate simple AI insight for traders
const generateTraderInsight = (hourlyData, chainTotals, dominantChain) => {
  // Get recent vs older data for trend analysis
  const recentHours = Math.min(6, Math.floor(hourlyData.length / 2))
  const recentData = hourlyData.slice(-recentHours)
  const olderData = hourlyData.slice(0, recentHours)
  
  // Calculate momentum per chain
  const momentum = {}
  CHAIN_ORDER.forEach(chain => {
    const recentAvg = recentData.reduce((sum, h) => sum + h.chains[chain].volume, 0) / recentData.length
    const olderAvg = olderData.reduce((sum, h) => sum + h.chains[chain].volume, 0) / olderData.length
    momentum[chain] = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
  })
  
  // Find hottest chain
  const hottestChain = CHAIN_ORDER.reduce((a, b) => momentum[a] > momentum[b] ? a : b)
  const hottestMomentum = momentum[hottestChain]
  
  // Determine network recommendation
  let network = CHAINS[hottestChain].name
  let networkSymbol = CHAINS[hottestChain].symbol
  
  // Determine narrative based on chain activity patterns
  let narrative = ''
  let narrativeIcon = ''
  
  const solPct = chainTotals.solanaPct || 0
  const ethPct = chainTotals.ethereumPct || 0
  const basePct = chainTotals.basePct || 0
  const bscPct = chainTotals.bscPct || 0
  
  // Narrative detection logic
  if (solPct > 28 && momentum.solana > 10) {
    narrative = 'Memes'
    narrativeIcon = '🐸'
  } else if (ethPct > 58 && momentum.ethereum > 5) {
    narrative = 'DeFi / Utility'
    narrativeIcon = '🏛️'
  } else if (basePct > 12 && momentum.base > 15) {
    narrative = 'New Launches'
    narrativeIcon = '🚀'
  } else if (bscPct > 12 && momentum.bsc > 10) {
    narrative = 'Retail / Gaming'
    narrativeIcon = '🎮'
  } else if (momentum.solana > 20) {
    narrative = 'Memes & AI Agents'
    narrativeIcon = '🤖'
  } else if (momentum.ethereum > 15) {
    narrative = 'Infrastructure & RWA'
    narrativeIcon = '🔧'
  } else if (ethPct > 55) {
    narrative = 'Blue Chips'
    narrativeIcon = '💎'
  } else if (solPct > 25) {
    narrative = 'High Beta Plays'
    narrativeIcon = '⚡'
  } else {
    narrative = 'Mixed / Rotate'
    narrativeIcon = '🔄'
  }
  
  // Sentiment
  const overallMomentum = CHAIN_ORDER.reduce((sum, c) => sum + momentum[c], 0) / CHAIN_ORDER.length
  let sentiment = 'neutral'
  if (overallMomentum > 15) sentiment = 'bullish'
  else if (overallMomentum < -10) sentiment = 'bearish'
  
  return {
    network,
    networkSymbol,
    networkColor: CHAINS[hottestChain].color,
    momentum: hottestMomentum,
    narrative,
    narrativeIcon,
    sentiment
  }
}

const ChainVolumeBar = () => {
  const { t } = useTranslation()
  const { fmtLarge } = useCurrency()
  const [timeframe, setTimeframe] = useState(24)
  const [hoveredHour, setHoveredHour] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showRankings, setShowRankings] = useState(false)
  
  const timeframes = [
    { value: 6, label: '6h' },
    { value: 12, label: '12h' },
    { value: 24, label: '24h' },
    { value: 48, label: '48h' },
  ]
  
  // Generate data based on timeframe
  const hourlyData = useMemo(() => generateMockData(timeframe), [timeframe])
  
  // Calculate averages for intensity
  const chainAverages = useMemo(() => calculateChainAverages(hourlyData), [hourlyData])
  
  // Calculate current hour dominance
  const currentHourData = hourlyData[hourlyData.length - 1]
  const dominantChain = useMemo(() => {
    if (!currentHourData) return null
    let maxPercentage = 0
    let dominant = 'ethereum'
    CHAIN_ORDER.forEach(chain => {
      if (currentHourData.chains[chain].percentage > maxPercentage) {
        maxPercentage = currentHourData.chains[chain].percentage
        dominant = chain
      }
    })
    return { chain: dominant, percentage: maxPercentage }
  }, [currentHourData])
  
  // Calculate 24h totals per chain
  const chainTotals = useMemo(() => {
    const totals = {}
    CHAIN_ORDER.forEach(chain => {
      totals[chain] = hourlyData.reduce((sum, hour) => sum + hour.chains[chain].volume, 0)
    })
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)
    CHAIN_ORDER.forEach(chain => {
      totals[chain + 'Pct'] = (totals[chain] / grandTotal) * 100
    })
    totals.total = grandTotal
    return totals
  }, [hourlyData])
  
  // Generate trader insight
  const traderInsight = useMemo(() => {
    return generateTraderInsight(hourlyData, chainTotals, dominantChain)
  }, [hourlyData, chainTotals, dominantChain])
  
  // Calculate narrative rankings for legend
  const rankedNarratives = useMemo(() => {
    return calculateNarrativeRankings(chainTotals, hourlyData)
  }, [chainTotals, hourlyData])
  
  // Handle hover
  const handleHover = useCallback((hourData, event) => {
    setHoveredHour(hourData)
    const rect = event.currentTarget.getBoundingClientRect()
    const containerRect = event.currentTarget.parentElement.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top
    })
  }, [])
  
  // Get intensity (0-1) based on volume relative to chain average
  const getIntensity = (chainId, volume) => {
    const avg = chainAverages[chainId]
    if (avg === 0) return 0.5
    const ratio = volume / avg
    // Map ratio to intensity: 0.5x avg = 0.3, 1x avg = 0.6, 2x avg = 1.0
    return Math.min(1, Math.max(0.2, 0.3 + (ratio - 0.5) * 0.45))
  }
  
  return (
    <div className="chain-volume-bar">
      {/* Header */}
      <div className="cvb-header">
        <div className="cvb-title-group">
          <h3 className="cvb-title">{t('chainVolume.title')}</h3>
          <span className="cvb-subtitle">{t('chainVolume.subtitle')}</span>
        </div>
        
        {/* Current Hour Dominance Indicator */}
        {dominantChain && (
          <div className="cvb-dominance" style={{ '--chain-color': CHAINS[dominantChain.chain].color }}>
            <span className="dominance-label">{t('chainVolume.now')}:</span>
            <span className="dominance-chain">{CHAINS[dominantChain.chain].symbol}</span>
            <span className="dominance-pct">{dominantChain.percentage.toFixed(0)}%</span>
          </div>
        )}
        
        {/* Timeframe Toggle */}
        <div className="cvb-timeframes">
          {timeframes.map(tf => (
            <button
              key={tf.value}
              className={`cvb-tf-btn ${timeframe === tf.value ? 'active' : ''}`}
              onClick={() => setTimeframe(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chain Legend with Totals */}
      <div className="cvb-legend">
        {CHAIN_ORDER.map(chainId => (
          <div key={chainId} className="cvb-legend-item" style={{ '--chain-color': CHAINS[chainId].color }}>
            <span className="legend-dot"></span>
            <span className="legend-name">{CHAINS[chainId].symbol}</span>
            <span className="legend-value">{fmtLarge(chainTotals[chainId])}</span>
            <span className="legend-pct">{chainTotals[chainId + 'Pct'].toFixed(1)}%</span>
          </div>
        ))}
      </div>
      
      {/* Main Heatmap Bar */}
      <div className="cvb-container">
        <div className="cvb-bar">
          {hourlyData.map((hourData, index) => {
            const isHovered = hoveredHour === hourData
            const isCurrent = hourData.isCurrentHour
            
            return (
              <div
                key={index}
                className={`cvb-segment ${isCurrent ? 'current' : ''} ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={(e) => handleHover(hourData, e)}
                onMouseLeave={() => setHoveredHour(null)}
                style={{ '--segment-count': hourlyData.length }}
              >
                {/* Stacked chain bars - render bottom to top */}
                {[...CHAIN_ORDER].reverse().map(chainId => {
                  const chainData = hourData.chains[chainId]
                  const intensity = getIntensity(chainId, chainData.volume)
                  const chainConfig = CHAINS[chainId]
                  
                  return (
                    <div
                      key={chainId}
                      className="cvb-chain-slice"
                      style={{
                        '--chain-color': chainConfig.color,
                        '--chain-gradient': chainConfig.gradient,
                        '--chain-height': `${chainData.percentage}%`,
                        '--intensity': intensity,
                      }}
                    />
                  )
                })}
                
                {/* Current hour glow effect */}
                {isCurrent && <div className="current-glow"></div>}
              </div>
            )
          })}
        </div>
        
        {/* Time axis labels */}
        <div className="cvb-time-axis">
          {hourlyData.filter((_, i) => {
            // Show fewer labels for longer timeframes
            const interval = timeframe <= 12 ? 3 : timeframe <= 24 ? 4 : 6
            return i % interval === 0 || i === hourlyData.length - 1
          }).map((hourData, i) => (
            <span key={i} className={`time-label ${hourData.isCurrentHour ? 'current' : ''}`}>
              {hourData.isCurrentHour ? t('chainVolume.now') : hourData.hourLabel}
            </span>
          ))}
        </div>
        
        {/* Tooltip */}
        {hoveredHour && (
          <div 
            className="cvb-tooltip"
            style={{
              '--tooltip-x': `${tooltipPosition.x}px`,
              '--tooltip-y': `${tooltipPosition.y}px`,
            }}
          >
            <div className="tooltip-time">
              {hoveredHour.isCurrentHour ? t('chainVolume.currentHour') : hoveredHour.hourLabel}
            </div>
            <div className="tooltip-total">
              <span>{t('chainVolume.total')}:</span>
              <strong>{fmtLarge(hoveredHour.totalVolume)}</strong>
            </div>
            <div className="tooltip-chains">
              {CHAIN_ORDER.map(chainId => {
                const chainData = hoveredHour.chains[chainId]
                const chainConfig = CHAINS[chainId]
                return (
                  <div key={chainId} className="tooltip-chain" style={{ '--chain-color': chainConfig.color }}>
                    <span className="tc-dot"></span>
                    <span className="tc-name">{chainConfig.symbol}</span>
                    <span className="tc-volume">{fmtLarge(chainData.volume)}</span>
                    <span className="tc-pct">{chainData.percentage.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Narrative Rankings - Dropdown */}
      <div className={`cvb-narrative-rankings ${showRankings ? 'expanded' : 'collapsed'}`}>
        <button 
          className="rankings-toggle"
          onClick={() => setShowRankings(!showRankings)}
        >
          <span className="rankings-toggle-icon">🤖</span>
          <span className="rankings-toggle-label">{t('chainVolume.aiAnalysis')}</span>
          <span className="rankings-toggle-count">{rankedNarratives[0]?.name} {t('chainVolume.leading')}</span>
          <span className={`rankings-toggle-arrow ${showRankings ? 'up' : 'down'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        
        {showRankings && (
          <div className="rankings-content">
            {/* AI Trader Insight - Trade Signal */}
            <div className={`cvb-trader-insight ${traderInsight.sentiment}`}>
              <div className="insight-label">
                <span className="insight-ai-badge">AI</span>
                <span>{t('chainVolume.tradeSignal')}</span>
              </div>
              <div className="insight-content">
                <div className="insight-network" style={{ '--network-color': traderInsight.networkColor }}>
                  <span className="network-arrow">→</span>
                  <span className="network-name">{traderInsight.networkSymbol}</span>
                  {traderInsight.momentum > 10 && (
                    <span className="network-hot">+{traderInsight.momentum.toFixed(0)}%</span>
                  )}
                </div>
                <span className="insight-separator">•</span>
                <div className="insight-narrative">
                  <span className="narrative-icon">{traderInsight.narrativeIcon}</span>
                  <span className="narrative-name">{traderInsight.narrative}</span>
                  <span className="narrative-tag">{t('chainVolume.outperforming')}</span>
                </div>
              </div>
            </div>
            
            <div className="rankings-header">
              <span className="rankings-title">{t('chainVolume.narrativeRanking')}</span>
              <span className="rankings-subtitle">{t('chainVolume.basedOnVolume')}</span>
            </div>
            <div className="rankings-list">
              {rankedNarratives.map((n) => (
                <div key={n.id} className={`narrative-rank-item rank-${n.rank}`}>
                  <span className="rank-badge">#{n.rank}</span>
                  <span className="rank-icon">{n.icon}</span>
                  <span className="rank-name">{n.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChainVolumeBar
