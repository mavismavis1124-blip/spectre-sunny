/**
 * SmartMoneyPulse Component
 * Real-time radar visualization of smart money flow
 * Shows where capital is moving BEFORE price action
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './SmartMoneyPulse.css'

// Professional SVG Icons - clean, monoline style
const SectorIcons = {
  memes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  defi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="5" r="3"/>
      <path d="M12 8v3"/>
      <line x1="8" y1="16" x2="8" y2="16.01"/>
      <line x1="16" y1="16" x2="16" y2="16.01"/>
    </svg>
  ),
  gaming: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="6" y1="12" x2="10" y2="12"/>
      <line x1="8" y1="10" x2="8" y2="14"/>
      <line x1="15" y1="11" x2="15" y2="11.01"/>
      <line x1="18" y1="13" x2="18" y2="13.01"/>
    </svg>
  ),
  infra: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="6" rx="1"/>
      <rect x="4" y="14" width="16" height="6" rx="1"/>
      <line x1="8" y1="7" x2="8" y2="7.01"/>
      <line x1="8" y1="17" x2="8" y2="17.01"/>
    </svg>
  ),
  rwa: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18"/>
      <path d="M5 21V7l8-4v18"/>
      <path d="M19 21V11l-6-4"/>
      <path d="M9 9v.01"/>
      <path d="M9 12v.01"/>
      <path d="M9 15v.01"/>
      <path d="M9 18v.01"/>
    </svg>
  ),
  layer2: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  nft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
}

// Narrative sectors positioned around radar
const SECTORS = [
  { id: 'memes', name: 'Memes', angle: 0 },
  { id: 'defi', name: 'DeFi', angle: 45 },
  { id: 'ai', name: 'AI Agents', angle: 90 },
  { id: 'gaming', name: 'Gaming', angle: 135 },
  { id: 'infra', name: 'Infrastructure', angle: 180 },
  { id: 'rwa', name: 'RWA', angle: 225 },
  { id: 'layer2', name: 'Layer 2', angle: 270 },
  { id: 'nft', name: 'NFT/Social', angle: 315 },
]

// Comprehensive DeFi token lists by sector
const TOKENS_BY_SECTOR = {
  memes: ['PEPE', 'WIF', 'BONK', 'DOGE', 'SHIB', 'FLOKI', 'MYRO', 'POPCAT', 'MEW', 'BOME', 'GME', 'TRUMP', 'BIDEN'],
  defi: ['UNI', 'AAVE', 'MKR', 'COMP', 'CRV', 'SNX', 'SUSHI', '1INCH', 'BAL', 'YFI', 'LDO', 'RPL', 'FXS', 'FRAX', 'LINK', 'UMA', 'ENS', 'RUNE'],
  ai: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO', 'AKT', 'AI16Z', 'GPT', 'NMR', 'VAI', 'COTI', 'AI'],
  gaming: ['IMX', 'GALA', 'AXS', 'SAND', 'MANA', 'ENJ', 'GMT', 'MAGIC', 'PIXEL', 'RON', 'YGG', 'ILV', 'ALICE'],
  infra: ['ARB', 'OP', 'MATIC', 'AVAX', 'ATOM', 'DOT', 'SOL', 'ETH', 'BNB', 'FTM', 'NEAR', 'APT', 'SUI', 'TIA', 'INJ', 'SEI', 'STRK'],
  rwa: ['ONDO', 'RIO', 'TRU', 'CFG', 'GFI', 'CPOOL', 'LAND', 'PROPS', 'LABS', 'TRADE'],
  layer2: ['ARB', 'OP', 'STRK', 'MNT', 'METIS', 'BOBA', 'IMX', 'ZKSYNC', 'SCROLL', 'BLAST', 'LINEA', 'MODE'],
  nft: ['BLUR', 'APE', 'LOOKS', 'X2Y2', 'MAGIC', 'DEGEN', 'FAR', 'PUDGY', 'MAYC', 'BAYC', 'AZUKI', 'PUNKS'],
}

// Chain distribution weights
const CHAIN_WEIGHTS = {
  'Ethereum': 0.45,
  'Solana': 0.25,
  'Base': 0.15,
  'Arbitrum': 0.10,
  'Optimism': 0.05,
}

// Generate mock smart money signals - randomly distributed within sectors
const generateSignals = () => {
  const signals = []
  const now = Date.now()
  let signalId = 0
  
  // Helper to check minimum distance between two points in polar coordinates
  const getDistance = (angle1, dist1, angle2, dist2) => {
    const rad1 = (angle1 * Math.PI) / 180
    const rad2 = (angle2 * Math.PI) / 180
    const x1 = dist1 * Math.cos(rad1)
    const y1 = dist1 * Math.sin(rad1)
    const x2 = dist2 * Math.cos(rad2)
    const y2 = dist2 * Math.sin(rad2)
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }
  
  // Generate signals for each sector
  SECTORS.forEach(sector => {
    const sectorTokens = TOKENS_BY_SECTOR[sector.id] || TOKENS_BY_SECTOR.defi
    // Generate 3-5 signals per sector
    const signalsPerSector = 3 + Math.floor(Math.random() * 3)
    const sectorSignals = [] // Track positions for spacing
    
    for (let i = 0; i < signalsPerSector; i++) {
      const isAccumulation = Math.random() > 0.4
      const intensity = 0.4 + Math.random() * 0.6
      const age = Math.random() * 100
      
      // Select chain based on weights
      const rand = Math.random()
      let chain = 'Ethereum'
      let cumulative = 0
      for (const [chainName, weight] of Object.entries(CHAIN_WEIGHTS)) {
        cumulative += weight
        if (rand <= cumulative) {
          chain = chainName
          break
        }
      }
      
      // Each sector spans 45°, but we keep dots within inner 35° to avoid dividing lines
      // Sector center is at sector.angle, so valid range is [sector.angle - 17.5, sector.angle + 17.5]
      // But we add 5° buffer from edges, so effective range is ±12.5°
      let angle, distance
      let attempts = 0
      const maxAttempts = 20
      const minSpacing = 8 // Minimum distance between dots
      
      do {
        // Fully random angle within safe sector range (±15° from center)
        const angleOffset = (Math.random() - 0.5) * 30 // Random between -15 and +15
        angle = ((sector.angle + angleOffset + 360) % 360)
        
        // Fully random distance across radial range (12-44)
        // Using square root for more even area distribution
        const randomRadius = Math.sqrt(Math.random())
        distance = 12 + randomRadius * 32
        
        // Check spacing from existing dots in this sector
        let tooClose = false
        for (const existing of sectorSignals) {
          if (getDistance(angle, distance, existing.angle, existing.distance) < minSpacing) {
            tooClose = true
            break
          }
        }
        
        attempts++
        if (!tooClose || attempts >= maxAttempts) break
      } while (true)
      
      sectorSignals.push({ angle, distance })
      
      signals.push({
        id: `signal-${signalId++}-${now}`,
        sector: sector.id,
        sectorName: sector.name,
        type: isAccumulation ? 'accumulation' : 'distribution',
        intensity,
        age,
        angle,
        distance,
        amount: (0.5 + Math.random() * 9.5).toFixed(2) + 'M',
        wallets: Math.floor(2 + Math.random() * 8),
        token: sectorTokens[Math.floor(Math.random() * sectorTokens.length)],
        chain: chain,
      })
    }
  })
  
  return signals
}

// Calculate accumulation score for each sector
const calculateSectorScores = (signals) => {
  const scores = {}
  
  SECTORS.forEach(sector => {
    const sectorSignals = signals.filter(s => s.sector === sector.id)
    const accumulation = sectorSignals.filter(s => s.type === 'accumulation')
    const distribution = sectorSignals.filter(s => s.type === 'distribution')
    
    const accScore = accumulation.reduce((sum, s) => sum + s.intensity * (1 - s.age/100), 0)
    const distScore = distribution.reduce((sum, s) => sum + s.intensity * (1 - s.age/100), 0)
    
    scores[sector.id] = {
      accumulation: accScore,
      distribution: distScore,
      net: accScore - distScore,
      total: sectorSignals.length,
      sentiment: accScore > distScore ? 'bullish' : accScore < distScore ? 'bearish' : 'neutral'
    }
  })
  
  return scores
}

// Get top alpha opportunities
const getAlphaOpportunities = (signals, sectorScores) => {
  const opportunities = SECTORS
    .map(sector => ({
      ...sector,
      score: sectorScores[sector.id],
      recentSignals: signals.filter(s => s.sector === sector.id && s.age < 30),
    }))
    .filter(s => s.score.net > 0.3 && s.recentSignals.length >= 1)
    .sort((a, b) => b.score.net - a.score.net)
    .slice(0, 3)
  
  return opportunities
}

const SmartMoneyPulse = () => {
  const [allSignals, setAllSignals] = useState([]) // All signals (generated upfront)
  const [revealedSignals, setRevealedSignals] = useState(new Set()) // IDs of revealed signals
  const [hoveredSignal, setHoveredSignal] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedSector, setSelectedSector] = useState(null)
  const [scanAngle, setScanAngle] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [currentActiveSector, setCurrentActiveSector] = useState(null)
  const radarRef = useRef(null)
  
  // Generate all signals upfront
  useEffect(() => {
    const signals = generateSignals()
    setAllSignals(signals)
    setRevealedSignals(new Set())
    setCurrentActiveSector(null)
  }, [])
  
  // Reset when manually selecting a sector
  useEffect(() => {
    if (selectedSector) {
      // Show all signals for selected sector
      const sectorSignals = allSignals.filter(s => s.sector === selectedSector)
      setRevealedSignals(new Set(sectorSignals.map(s => s.id)))
      setCurrentActiveSector(null)
    }
  }, [selectedSector, allSignals])
  
  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 0.25) % 360) // Slower rotation
    }, 40)
    return () => clearInterval(interval)
  }, [isPaused])
  
  const sectorScores = useMemo(() => calculateSectorScores(allSignals), [allSignals])
  const alphaOpportunities = useMemo(() => getAlphaOpportunities(allSignals, sectorScores), [allSignals, sectorScores])
  
  const polarToCartesian = useCallback((angle, distance) => {
    const radian = (angle - 90) * (Math.PI / 180)
    return {
      x: 50 + distance * Math.cos(radian) * 0.46,
      y: 50 + distance * Math.sin(radian) * 0.46,
    }
  }, [])
  
  // Calculate which sector the scan line is currently passing through
  const activeSectorByScan = useMemo(() => {
    if (selectedSector) return null // Manual selection overrides scan
    
    // Normalize scan angle to 0-360
    const normalizedAngle = ((scanAngle % 360) + 360) % 360
    
    // Find the sector closest to the scan line
    // Each sector spans ~45 degrees (360/8), so we check which sector the scan is in
    let closestSector = SECTORS[0]
    let minDiff = Infinity
    
    SECTORS.forEach(sector => {
      // Normalize sector angle
      const sectorAngle = ((sector.angle % 360) + 360) % 360
      
      // Calculate angular difference (considering wrap-around)
      let diff = Math.abs(normalizedAngle - sectorAngle)
      if (diff > 180) diff = 360 - diff
      
      // Check if scan is within ~25 degrees of sector center
      if (diff <= 25 && diff < minDiff) {
        minDiff = diff
        closestSector = sector
      }
    })
    
    return minDiff <= 25 ? closestSector.id : null
  }, [scanAngle, selectedSector])
  
  // Track sector changes and clear revealed signals when moving to new sector
  useEffect(() => {
    if (selectedSector || !activeSectorByScan) return
    
    if (currentActiveSector && currentActiveSector !== activeSectorByScan) {
      // Clear all revealed signals when moving to new sector
      setRevealedSignals(new Set())
    }
    
    setCurrentActiveSector(activeSectorByScan)
  }, [activeSectorByScan, currentActiveSector, selectedSector])
  
  // Reveal signals progressively one by one as scan passes through sector
  useEffect(() => {
    if (isPaused || selectedSector || !activeSectorByScan) return
    
    const interval = setInterval(() => {
      setRevealedSignals(prev => {
        const sectorSignals = allSignals.filter(s => s.sector === activeSectorByScan)
        const unrevealed = sectorSignals.filter(s => !prev.has(s.id))
        
        if (unrevealed.length > 0) {
          // Reveal one signal at a time
          const nextSignal = unrevealed[0]
          return new Set([...prev, nextSignal.id])
        }
        
        return prev
      })
    }, 250) // Reveal one signal every 250ms
    
    return () => clearInterval(interval)
  }, [isPaused, selectedSector, activeSectorByScan, allSignals])
  
  // Filter signals - only show revealed ones
  const displayedSignals = useMemo(() => {
    if (selectedSector) {
      // Show all signals for selected sector
      return allSignals.filter(s => s.sector === selectedSector)
    }
    // Only show revealed signals
    return allSignals.filter(s => revealedSignals.has(s.id))
  }, [allSignals, selectedSector, revealedSignals])
  
  const hottestSector = useMemo(() => {
    return SECTORS.reduce((best, sector) => {
      const score = sectorScores[sector.id]?.net || 0
      return score > (sectorScores[best.id]?.net || 0) ? sector : best
    }, SECTORS[0])
  }, [sectorScores])
  
  // Handle signal hover - position tooltip at dot center
  const handleSignalHover = useCallback((signal) => {
    if (!radarRef.current) return
    const rect = radarRef.current.getBoundingClientRect()
    const pos = polarToCartesian(signal.angle, signal.distance)
    
    // Convert SVG percentage coordinates to pixel position
    setHoveredSignal(signal)
    setTooltipPos({
      x: (pos.x / 100) * rect.width,
      y: (pos.y / 100) * rect.height
    })
  }, [polarToCartesian])
  
  return (
    <div className="smart-money-pulse">
      {/* Header */}
      <div className="smp-header">
        <div className="smp-title-row">
          <div className="smp-title-content">
            <div className="smp-title-with-icon">
              <div className="smp-title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" opacity="0.3"/>
                  <circle cx="12" cy="12" r="6" opacity="0.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <line x1="12" y1="2" x2="12" y2="6"/>
                  <line x1="12" y1="18" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="6" y2="12"/>
                  <line x1="18" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <h3 className="smp-title">Smart Money Pulse</h3>
            </div>
            <p className="smp-subtitle">Real-time whale & institutional capital flow detection</p>
          </div>
          <div className="smp-status">
            <div className={`smp-live-badge ${isPaused ? 'paused' : ''}`}>
              <span className="live-indicator"></span>
              <span className="live-text">{isPaused ? 'Paused' : 'Scanning'}</span>
            </div>
            <button 
              className="smp-control-btn"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume' : 'Pause'}
              title={isPaused ? 'Resume scanning' : 'Pause scanning'}
            >
              {isPaused ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Radar Visualization */}
      <div className="smp-radar-wrapper" ref={radarRef}>
        <svg className="smp-radar" viewBox="0 0 100 100">
          <defs>
            {/* Premium radar background gradient */}
            <radialGradient id="smpRadarBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.06)" />
              <stop offset="40%" stopColor="rgba(99, 102, 241, 0.025)" />
              <stop offset="70%" stopColor="rgba(59, 130, 246, 0.015)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            
            {/* Scan line gradient - more subtle */}
            <linearGradient id="smpScanLine" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="rgba(99, 102, 241, 0.3)" />
              <stop offset="70%" stopColor="rgba(129, 140, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.08)" />
            </linearGradient>
            
            {/* Outer ring gradient */}
            <linearGradient id="smpOuterRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.06)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.03)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.06)" />
            </linearGradient>
            
            {/* Accumulation dot gradient - emerald with glass effect */}
            <radialGradient id="accDotGradient" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </radialGradient>
            
            {/* Distribution dot gradient - coral with glass effect */}
            <radialGradient id="distDotGradient" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FCA5A5" />
              <stop offset="50%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#DC2626" />
            </radialGradient>
            
            {/* Accumulation outer glow */}
            <radialGradient id="accGlowGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
              <stop offset="60%" stopColor="rgba(16, 185, 129, 0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            
            {/* Distribution outer glow */}
            <radialGradient id="distGlowGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(248, 113, 113, 0.4)" />
              <stop offset="60%" stopColor="rgba(248, 113, 113, 0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            
            {/* Subtle glow filter */}
            <filter id="smpGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Stronger glow for hovered */}
            <filter id="smpGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feColorMatrix in="blur" type="saturate" values="1.5" result="saturated"/>
              <feMerge>
                <feMergeNode in="saturated" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Drop shadow for depth */}
            <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.3" stdDeviation="0.3" floodColor="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          
          {/* Background with subtle inner shadow effect */}
          <circle cx="50" cy="50" r="48" fill="url(#smpRadarBg)" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="url(#smpOuterRing)" strokeWidth="0.6" />
          
          {/* Concentric rings - refined spacing and opacity */}
          {[40, 32, 24, 16, 8].map((r, i) => (
            <circle 
              key={r}
              cx="50" 
              cy="50" 
              r={r} 
              fill="none" 
              stroke={`rgba(255, 255, 255, ${0.025 + i * 0.005})`}
              strokeWidth="0.3"
            />
          ))}
          
          {/* Cross lines - very subtle */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.025)" strokeWidth="0.3" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="rgba(255,255,255,0.025)" strokeWidth="0.3" />
          
          {/* Sector dividing lines - refined */}
          {SECTORS.map(sector => {
            const radian = ((sector.angle - 90) * Math.PI) / 180
            const endX = 50 + 48 * Math.cos(radian)
            const endY = 50 + 48 * Math.sin(radian)
            return (
              <line
                key={sector.id}
                x1="50"
                y1="50"
                x2={endX}
                y2={endY}
                stroke="rgba(255, 255, 255, 0.035)"
                strokeWidth="0.3"
              />
            )
          })}
          
          {/* Scan sweep - more elegant */}
          <g transform={`rotate(${scanAngle}, 50, 50)`}>
            <path
              d={`M 50 50 L 50 2 A 48 48 0 0 1 ${50 + 48 * Math.sin(20 * Math.PI / 180)} ${50 - 48 * Math.cos(20 * Math.PI / 180)} Z`}
              fill="rgba(99, 102, 241, 0.04)"
            />
            <line 
              x1="50" 
              y1="50" 
              x2="50" 
              y2="2" 
              stroke="url(#smpScanLine)" 
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          </g>
          
          {/* Signal blips - premium multi-layer design */}
          {displayedSignals.map(signal => {
            const pos = polarToCartesian(signal.angle, signal.distance)
            const isHovered = hoveredSignal?.id === signal.id
            const isRecent = signal.age < 25
            const isAcc = signal.type === 'accumulation'
            
            // Size based on intensity with better scaling
            const baseSize = 1.4 + signal.intensity * 1.2
            const size = isHovered ? baseSize * 1.4 : baseSize
            const glowSize = size * 2.5
            
            return (
              <g 
                key={signal.id} 
                className="smp-signal visible"
              >
                {/* Outer glow - soft radial gradient */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={glowSize}
                  fill={isAcc ? 'url(#accGlowGradient)' : 'url(#distGlowGradient)'}
                  className="signal-outer-glow"
                  style={{ opacity: isHovered ? 0.9 : 0.6 }}
                />
                
                {/* Ping animation for recent signals */}
                {isRecent && (
                  <>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={size}
                      fill="none"
                      stroke={isAcc ? '#10B981' : '#F87171'}
                      strokeWidth="0.25"
                      className="signal-ping-outer"
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={size * 0.7}
                      fill="none"
                      stroke={isAcc ? '#10B981' : '#F87171'}
                      strokeWidth="0.2"
                      className="signal-ping-inner"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </>
                )}
                
                {/* Main dot with gradient fill */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size}
                  fill={isAcc ? 'url(#accDotGradient)' : 'url(#distDotGradient)'}
                  filter={isHovered ? 'url(#smpGlowStrong)' : 'url(#dotShadow)'}
                  className={`signal-core ${isHovered ? 'hovered' : ''}`}
                />
                
                {/* Inner highlight - glass effect */}
                <circle
                  cx={pos.x - size * 0.25}
                  cy={pos.y - size * 0.25}
                  r={size * 0.4}
                  fill="rgba(255, 255, 255, 0.35)"
                  className="signal-highlight"
                  style={{ opacity: isHovered ? 0.5 : 0.3 }}
                />
                
                {/* Subtle border ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size}
                  fill="none"
                  stroke={isAcc ? 'rgba(52, 211, 153, 0.4)' : 'rgba(252, 165, 165, 0.4)'}
                  strokeWidth="0.15"
                  className="signal-border"
                />
                
                {/* Center bright spot */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size * 0.2}
                  fill={isAcc ? 'rgba(167, 243, 208, 0.6)' : 'rgba(254, 202, 202, 0.6)'}
                  className="signal-center"
                />
                
                {/* Invisible hit area */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size + 3}
                  fill="transparent"
                  stroke="transparent"
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onMouseEnter={() => handleSignalHover(signal)}
                  onMouseLeave={() => setHoveredSignal(null)}
                />
              </g>
            )
          })}
          
          {/* Center point - refined multi-layer */}
          <circle cx="50" cy="50" r="5" fill="rgba(99, 102, 241, 0.08)" />
          <circle cx="50" cy="50" r="3" fill="rgba(99, 102, 241, 0.15)" />
          <circle cx="50" cy="50" r="1.5" fill="rgba(129, 140, 248, 0.4)" />
          <circle cx="50" cy="50" r="0.8" fill="rgba(165, 180, 252, 0.7)" />
        </svg>
        
        {/* Sector labels around radar */}
        <div className="smp-sectors">
          {SECTORS.map(sector => {
            // Position labels at center of each sector's angular area (midpoint of the 45° wedge)
            // Each sector spans 45°, so center is at sector.angle + 22.5°
            // Position outside the circle (radius 47) - using 105 to ensure clear visibility
            const sectorCenterAngle = (sector.angle + 22.5) % 360
            const pos = polarToCartesian(sectorCenterAngle, 105)
            const score = sectorScores[sector.id]
            const isSelected = selectedSector === sector.id
            const isHot = sector.id === hottestSector.id && score?.net > 0.3
            const isActive = !isPaused && activeSectorByScan === sector.id
            
            return (
              <button
                key={sector.id}
                className={`smp-sector-btn ${score?.sentiment || ''} ${isSelected ? 'active' : ''} ${isHot ? 'hot' : ''} ${isActive ? 'scanning' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSelectedSector(isSelected ? null : sector.id)}
              >
                <span className="sector-icon">{SectorIcons[sector.id]}</span>
                <span className="sector-label">{sector.name}</span>
                {isActive && (
                  <span className="sector-live-indicator">
                    <span className="live-dot-pulse"></span>
                    <span className="live-text-small">Live</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Tooltip */}
        {hoveredSignal && (
          <div 
            className="smp-signal-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            <div className="tooltip-head">
              <span className={`tooltip-signal-type ${hoveredSignal.type}`}>
                {hoveredSignal.type === 'accumulation' ? 'Accumulation' : 'Distribution'}
              </span>
              <span className="tooltip-chain-badge">{hoveredSignal.chain}</span>
            </div>
            <div className="tooltip-main">
              <span className="tooltip-token-name">{hoveredSignal.token}</span>
              <span className="tooltip-sector-tag">
                <span className="tooltip-sector-icon">{SectorIcons[hoveredSignal.sector]}</span>
                {hoveredSignal.sectorName}
              </span>
            </div>
            <div className="tooltip-metrics">
              <div className="tooltip-metric">
                <span className="metric-key">Volume</span>
                <span className="metric-val">${hoveredSignal.amount}</span>
              </div>
              <div className="tooltip-metric">
                <span className="metric-key">Whales</span>
                <span className="metric-val">{hoveredSignal.wallets}</span>
              </div>
              <div className="tooltip-metric">
                <span className="metric-key">Strength</span>
                <span className="metric-val">{(hoveredSignal.intensity * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Alpha Opportunities */}
      <div className="smp-alpha">
        <div className="smp-alpha-header">
          <h4 className="smp-alpha-title">Emerging Opportunities</h4>
          <span className="smp-alpha-badge">{alphaOpportunities.length} signals</span>
        </div>
        
        <div className="smp-alpha-grid">
          {alphaOpportunities.length > 0 ? (
            alphaOpportunities.map((opp, i) => (
              <div key={opp.id} className={`smp-alpha-card rank-${i + 1}`}>
                <div className="alpha-card-top">
                  <span className="alpha-card-rank">#{i + 1}</span>
                  <span className="alpha-card-icon">{SectorIcons[opp.id]}</span>
                  <span className="alpha-card-name">{opp.name}</span>
                </div>
                <div className="alpha-card-stats">
                  <div className="alpha-stat">
                    <span className="alpha-stat-label">Flow</span>
                    <span className="alpha-stat-value positive">+{(opp.score.net * 100).toFixed(0)}%</span>
                  </div>
                  <div className="alpha-stat">
                    <span className="alpha-stat-label">Signals</span>
                    <span className="alpha-stat-value">{opp.recentSignals.length}</span>
                  </div>
                </div>
                <div className="alpha-card-tag">
                  <span>Net positive inflow detected</span>
                </div>
              </div>
            ))
          ) : (
            <div className="smp-alpha-empty">
              <span>Analyzing capital flows for emerging opportunities...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="smp-legend">
        <div className="smp-legend-item">
          <span className="legend-dot acc"></span>
          <svg className="legend-arrow up" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span>Accumulation</span>
        </div>
        <div className="smp-legend-item">
          <span className="legend-dot dist"></span>
          <svg className="legend-arrow down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          <span>Distribution</span>
        </div>
        <div className="smp-legend-divider"></div>
        <div className="smp-legend-item muted">
          <svg className="legend-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>Proximity to center indicates recency</span>
        </div>
      </div>
    </div>
  )
}

export default SmartMoneyPulse
