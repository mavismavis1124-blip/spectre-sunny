/**
 * CinemaWelcomeWrapper - Orchestrator for Cinema Mode
 *
 * Transforms WelcomePage into a Netflix/Higgsfield-style cinematic experience.
 * Receives all data from WelcomePage and distributes to cinema sub-components.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { TOKEN_ROW_COLORS } from '../../constants/tokenColors'
import CinemaWelcomeBar from './CinemaWelcomeBar'
import CinemaDiscovery from './CinemaDiscovery'
import CinemaWatchlistSidebar from './CinemaWatchlistSidebar'
import CinemaCommandCenter from './CinemaCommandCenter'
import CinemaAIBrief from './CinemaAIBrief'

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE CHART BACKGROUND - Animated canvas with breathing effect
// ═══════════════════════════════════════════════════════════════════════════════

const LiveChartBackground = React.memo(({ brandColor = '139, 92, 246', sparklineData = [], dayMode = false }) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const rgb = brandColor
    let time = 0
    const targetFPS = 30
    const frameInterval = 1000 / targetFPS
    let lastFrameTime = 0

    // Pre-compute sparkline bounds — always use chart mode, generate synthetic data if needed
    const data = sparklineData.length > 10
      ? sparklineData
      : (() => {
          const pts = []
          let v = 50
          for (let i = 0; i < 48; i++) {
            v += (Math.random() - 0.48) * 3
            v = Math.max(20, Math.min(80, v))
            pts.push(v)
          }
          return pts
        })()
    let minVal = Math.min(...data)
    let maxVal = Math.max(...data)
    let range = maxVal - minVal || 1

    const draw = (currentTime) => {
      animationRef.current = requestAnimationFrame(draw)

      const elapsed = currentTime - lastFrameTime
      if (elapsed < frameInterval) return
      lastFrameTime = currentTime - (elapsed % frameInterval)

      const w = window.innerWidth
      const h = window.innerHeight

      // Background fill
      ctx.fillStyle = dayMode ? '#f5f5f7' : '#0a0a0f'
      ctx.fillRect(0, 0, w, h)

      // Breathing effect
      time += 1
      const breathe = Math.sin(time * 0.015) * 0.08 + 1
      const verticalShift = Math.sin(time * 0.01) * 20

      ctx.save()
      ctx.translate(0, verticalShift)
      ctx.scale(1, breathe)

      // Draw chart — always realtime chart mode, never waves
      {
        const points = []
        const len = data.length
        for (let i = 0; i < len; i++) {
          const x = (i / (len - 1)) * w
          const normalized = (data[i] - minVal) / range
          const y = h - (normalized * h * 0.4 + h * 0.3)
          points.push({ x, y })
        }

        // Fill gradient
        const gradient = ctx.createLinearGradient(0, h * 0.3, 0, h)
        gradient.addColorStop(0, `rgba(${rgb}, 0.25)`)
        gradient.addColorStop(0.5, `rgba(${rgb}, 0.10)`)
        gradient.addColorStop(1, `rgba(${rgb}, 0)`)

        ctx.beginPath()
        ctx.moveTo(0, h)
        points.forEach((p, i) => {
          if (i === 0) ctx.lineTo(p.x, p.y)
          else {
            const prev = points[i - 1]
            const cpx = (prev.x + p.x) / 2
            ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + p.y) / 2)
          }
        })
        ctx.lineTo(w, points[points.length - 1].y)
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Line stroke with glow
        ctx.beginPath()
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else {
            const prev = points[i - 1]
            const cpx = (prev.x + p.x) / 2
            ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + p.y) / 2)
          }
        })
        ctx.strokeStyle = `rgba(${rgb}, 0.8)`
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Pulse dot at end
        const lastPoint = points[points.length - 1]
        const pulseSize = 8 + Math.sin(time * 0.1) * 3
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, pulseSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, 0.9)`
        ctx.fill()

        // Outer ring
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, pulseSize + 8, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${rgb}, 0.3)`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [brandColor, sparklineData, dayMode])

  return (
    <canvas
      ref={canvasRef}
      className="cinema-welcome-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WRAPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CinemaWelcomeWrapper = ({
  // Profile & UI
  profile,
  dayMode,
  marketMode,

  // Token actions
  selectToken,
  onOpenResearchZone,
  onOpenStorybook,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  togglePinWatchlist,
  reorderWatchlist,

  // Watchlist data
  watchlist,
  watchlists,
  activeWatchlistId,
  onSwitchWatchlist,

  // Market data (from WelcomePage hooks)
  topCoinPrices,
  trendingTokens,
  fearGreed,
  altSeason,
  marketDominance,
  marketStats,
  stockPrices,
  liveVix,
  stocksRiskOnOff,
  indexAllocation,

  // Discovery data
  topCoinsTokens,
  onChainTokens,

  // Command center data
  marketAiTab,
  setMarketAiTab,
  newsItems,
  heatmapTokens,
  calendarEvents,
  liveActivity,
  alphaFeed,
  intel,

  // Navigation
  onPageChange,

  // AI Brief data
  theBriefStatement,
  theBriefStatements,
  macroAnalysisData,
  sentimentScore,
}) => {
  // Determine primary brand color from sentiment (Living Sentiment Wall)
  const btcPrice = topCoinPrices?.BTC
  const btcChange = btcPrice?.change || 0
  const primaryRgb = useMemo(() => {
    if (sentimentScore != null) {
      if (sentimentScore >= 60) return '16, 185, 129'   // bullish emerald
      if (sentimentScore <= 35) return '185, 28, 28'     // bearish crimson
      return '89, 86, 213'                                // neutral indigo
    }
    // Fallback: BTC direction
    return btcChange >= 0 ? '16, 185, 129' : '185, 28, 28'
  }, [sentimentScore, btcChange])

  // Get BTC sparkline for background
  const btcSparkline = btcPrice?.sparkline_7d || btcPrice?.sparkline || []

  const isStocks = marketMode === 'stocks'

  // Featured tokens for rotating hero — prioritise user's watchlist for personalisation
  const featuredTokens = useMemo(() => {
    if (isStocks) {
      // Stock mode: build from stockPrices
      if (!stockPrices || Object.keys(stockPrices).length === 0) return []

      // Stock watchlist items first
      const stockWatchlist = (watchlist || [])
        .filter(item => item.isStock)
        .map(item => {
          const sym = (item.symbol || '').toUpperCase()
          const sp = stockPrices[sym]
          const price = sp?.price ?? parseFloat(item.price)
          if (!price || price <= 0) return null
          return {
            ...item,
            symbol: sym,
            name: item.name || sp?.name || sym,
            price,
            change: sp?.change ?? item.change,
            marketCap: sp?.marketCap || item.marketCap,
            isStock: true,
          }
        })
        .filter(Boolean)

      if (stockWatchlist.length >= 3) {
        return stockWatchlist
          .sort((a, b) => Math.abs(parseFloat(b.change) || 0) - Math.abs(parseFloat(a.change) || 0))
          .slice(0, 5)
      }

      // Pad with top stock movers
      const existing = new Set(stockWatchlist.map(t => t.symbol))
      const topStockMovers = Object.entries(stockPrices)
        .filter(([sym, data]) => data?.price && data?.change != null && !existing.has(sym))
        .sort((a, b) => Math.abs(parseFloat(b[1].change) || 0) - Math.abs(parseFloat(a[1].change) || 0))
        .slice(0, 5 - stockWatchlist.length)
        .map(([symbol, data]) => ({ symbol, name: data.name || symbol, ...data, isStock: true }))

      return [...stockWatchlist, ...topStockMovers].slice(0, 5)
    }

    // Crypto mode (original)
    if (!topCoinPrices) return []

    // 1. Build from watchlist first (already has live prices from useWatchlistPrices)
    const fromWatchlist = (watchlist || [])
      .filter(item => !item.isStock)
      .map(item => {
        const sym = (item.symbol || '').toUpperCase()
        // Use watchlist's own live price (from useWatchlistPrices), fallback to topCoinPrices
        const price = parseFloat(item.price) || topCoinPrices[sym]?.price
        if (!price || price <= 0) return null
        const change = item.change ?? topCoinPrices[sym]?.change
        return {
          ...item,
          symbol: sym,
          name: item.name || topCoinPrices[sym]?.name || sym,
          price,
          change,
          marketCap: item.marketCap || topCoinPrices[sym]?.marketCap,
          sparkline_7d: item.sparkline_7d || topCoinPrices[sym]?.sparkline_7d,
          logo: item.logo || topCoinPrices[sym]?.logo,
        }
      })
      .filter(Boolean)

    // If watchlist has enough tokens, use those (sorted by biggest move)
    if (fromWatchlist.length >= 3) {
      return fromWatchlist
        .sort((a, b) => Math.abs(parseFloat(b.change) || 0) - Math.abs(parseFloat(a.change) || 0))
        .slice(0, 5)
    }

    // 2. Fallback: pad with top movers from market data (skip dupes)
    const watchlistSymbols = new Set(fromWatchlist.map(t => t.symbol))
    const topMovers = Object.entries(topCoinPrices)
      .filter(([sym, data]) => data?.price && data?.change != null && !watchlistSymbols.has(sym))
      .sort((a, b) => Math.abs(parseFloat(b[1].change) || 0) - Math.abs(parseFloat(a[1].change) || 0))
      .slice(0, 5 - fromWatchlist.length)
      .map(([symbol, data]) => ({ symbol, ...data }))

    return [...fromWatchlist, ...topMovers].slice(0, 5)
  }, [topCoinPrices, watchlist, isStocks, stockPrices])

  // Sidebar open/close state (lifted so content can respond)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Auto-rotate hero every 10 seconds
  const [featuredIndex, setFeaturedIndex] = useState(0)

  useEffect(() => {
    if (featuredTokens.length <= 1) return
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featuredTokens.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [featuredTokens.length])

  const featuredToken = featuredTokens[featuredIndex] || featuredTokens[0] || null

  const handleHeroDotClick = useCallback((idx) => {
    setFeaturedIndex(idx)
  }, [])

  return (
    <div className={`cinema-welcome ${dayMode ? 'day-mode' : ''}`}>
      {/* Gradient overlay for readability */}
      <div className="cinema-welcome-overlay" />

      {/* Main content container */}
      <div className={`cinema-welcome-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {/* Top bar with profile, stats, prices */}
        <CinemaWelcomeBar
          profile={profile}
          dayMode={dayMode}
          marketMode={marketMode}
          topCoinPrices={topCoinPrices}
          fearGreed={fearGreed}
          altSeason={altSeason}
          marketDominance={marketDominance}
          marketStats={marketStats}
          selectToken={selectToken}
          stockPrices={stockPrices}
          liveVix={liveVix}
          stocksRiskOnOff={stocksRiskOnOff}
          indexAllocation={indexAllocation}
        />

        {/* Main grid: Hero → Command Center → Token Rows */}
        <div className="cinema-main-grid">
          {/* Hero + Top Movers */}
          <CinemaDiscovery
            renderMode="hero"
            dayMode={dayMode}
            marketMode={marketMode}
            topCoinPrices={topCoinPrices}
            topCoinsTokens={topCoinsTokens}
            trendingTokens={trendingTokens}
            onChainTokens={onChainTokens}
            selectToken={selectToken}
            onOpenResearchZone={onOpenResearchZone}
            onOpenStorybook={onOpenStorybook}
            addToWatchlist={addToWatchlist}
            isInWatchlist={isInWatchlist}
            featuredToken={featuredToken}
            featuredTokens={featuredTokens}
            featuredIndex={featuredIndex}
            onHeroDotClick={handleHeroDotClick}
            stockPrices={stockPrices}
          />

          {/* THE AI BRIEF — Cinematic intelligence statement */}
          <CinemaAIBrief
            dayMode={dayMode}
            marketMode={marketMode}
            theBriefStatement={theBriefStatement}
            theBriefStatements={theBriefStatements}
            macroAnalysisData={macroAnalysisData}
            topCoinPrices={topCoinPrices}
            fearGreed={fearGreed}
            stockPrices={stockPrices}
            liveVix={liveVix}
          />

          {/* Command center - above token rows */}
          <CinemaCommandCenter
            dayMode={dayMode}
            marketMode={marketMode}
            marketAiTab={marketAiTab}
            setMarketAiTab={setMarketAiTab}
            newsItems={newsItems}
            heatmapTokens={heatmapTokens}
            calendarEvents={calendarEvents}
            liveActivity={liveActivity}
            alphaFeed={alphaFeed}
            intel={intel}
            selectToken={selectToken}
            stockPrices={stockPrices}
            liveVix={liveVix}
          />

          {/* Category token rows - below command center */}
          <CinemaDiscovery
            renderMode="rows"
            dayMode={dayMode}
            marketMode={marketMode}
            topCoinPrices={topCoinPrices}
            topCoinsTokens={topCoinsTokens}
            trendingTokens={trendingTokens}
            onChainTokens={onChainTokens}
            selectToken={selectToken}
            onOpenResearchZone={onOpenResearchZone}
            onOpenStorybook={onOpenStorybook}
            addToWatchlist={addToWatchlist}
            isInWatchlist={isInWatchlist}
            featuredToken={featuredToken}
            featuredTokens={featuredTokens}
            featuredIndex={featuredIndex}
            onHeroDotClick={handleHeroDotClick}
            stockPrices={stockPrices}
          />
        </div>
      </div>

      {/* Watchlist sidebar */}
      <CinemaWatchlistSidebar
        dayMode={dayMode}
        watchlist={watchlist}
        watchlists={watchlists}
        activeWatchlistId={activeWatchlistId}
        onSwitchWatchlist={onSwitchWatchlist}
        addToWatchlist={addToWatchlist}
        removeFromWatchlist={removeFromWatchlist}
        isInWatchlist={isInWatchlist}
        togglePinWatchlist={togglePinWatchlist}
        reorderWatchlist={reorderWatchlist}
        selectToken={(tokenData) => {
          if (tokenData?.isStock && onOpenResearchZone) {
            onOpenResearchZone({ ...tokenData, type: 'stock', isStock: true })
          } else if (selectToken) {
            selectToken(tokenData)
          }
        }}
        topCoinPrices={topCoinPrices}
        onPageChange={onPageChange}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />
    </div>
  )
}

export default CinemaWelcomeWrapper
