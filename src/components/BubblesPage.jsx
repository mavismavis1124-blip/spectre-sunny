/**
 * BubblesPage — Market Bubblemap visualization.
 * Shows top tokens/stocks as circle-packed bubbles sized by market cap,
 * colored by price change, with glass tooltip and fullscreen mode.
 * Supports both Crypto and Stocks market modes.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getTopCoinsMarketsPage } from '../services/coinGeckoApi'
import { useBinanceTopCoinPrices } from '../hooks/useCodexData'
import { getStockQuotes, POPULAR_STOCKS, FALLBACK_STOCK_DATA, getStockLogoUrl } from '../services/stockApi'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import { useCurrency } from '../hooks/useCurrency'
import './BubblesPage.css'

const formatChange = (change) => {
  const value = typeof change === 'number' ? change : parseFloat(change) || 0
  return value.toFixed(2)
}

/* ── Sector colors for stocks ── */
const SECTOR_COLORS = {
  Technology: '59, 130, 246',      // blue
  Semiconductor: '0, 200, 220',    // cyan
  Financial: '168, 85, 247',       // purple
  Healthcare: '16, 185, 129',      // emerald
  Consumer: '251, 146, 60',        // orange
  Communication: '236, 72, 153',   // pink
  Energy: '234, 179, 8',           // yellow
  Industrial: '148, 163, 184',     // slate
  Automotive: '239, 68, 68',       // red
  RealEstate: '45, 212, 191',      // teal
  Commodity: '212, 175, 55',       // gold
  Index: '99, 102, 241',           // indigo
}
const DEFAULT_SECTOR_COLOR = '148, 163, 184' // slate

/* ── Constants ── */
const TIMEFRAMES = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
]
// Stocks only have today's change — show a single "Today" timeframe
const STOCK_TIMEFRAMES = [
  { id: 'today', labelKey: 'bubbles.today' },
]
const PAGE_RANGES = [
  { id: 1, labelKey: 'bubbles.range1to100', start: 1, end: 100 },
  { id: 2, labelKey: 'bubbles.range101to200', start: 101, end: 200 },
  { id: 3, labelKey: 'bubbles.range201to300', start: 201, end: 300 },
]
const STOCK_SECTOR_FILTERS = [
  { id: 'all', labelKey: 'bubbles.allSectors' },
  { id: 'Technology', labelKey: 'bubbles.tech' },
  { id: 'Semiconductor', labelKey: 'bubbles.chips' },
  { id: 'Financial', labelKey: 'bubbles.finance' },
  { id: 'Healthcare', labelKey: 'bubbles.health' },
  { id: 'Consumer', labelKey: 'bubbles.consumer' },
  { id: 'Energy', labelKey: 'bubbles.energy' },
  { id: 'Industrial', labelKey: 'bubbles.industrial' },
  { id: 'Communication', labelKey: 'bubbles.media' },
  { id: 'RealEstate', labelKey: 'bubbles.realEstate' },
  { id: 'Automotive', labelKey: 'bubbles.auto' },
  { id: 'Index', labelKey: 'bubbles.etfs' },
]
const SORT_OPTIONS = [
  { id: 'market_cap', labelKey: 'bubbles.sortMarketCap' },
  { id: 'change', labelKey: 'bubbles.sortChange' },
  { id: 'volume', labelKey: 'bubbles.sortVolume' },
]

/* ── Circle Packing Algorithm ── */
function packCircles(tokens, containerWidth, containerHeight) {
  if (!tokens.length || !containerWidth || !containerHeight) return []

  const mcaps = tokens.map(t => t.marketCap || 1)
  const maxMcap = Math.max(...mcaps)
  const minMcap = Math.min(...mcaps)
  const logMax = Math.log(maxMcap)
  const logMin = Math.log(minMcap)
  const logRange = logMax - logMin || 1

  const MIN_R = 22
  const MAX_R = Math.min(110, containerWidth * 0.085, containerHeight * 0.13)

  // Map tokens to { ...token, radius } sorted by radius desc
  const withRadius = tokens.map(t => {
    const logNorm = (Math.log(t.marketCap || 1) - logMin) / logRange
    const radius = MIN_R + Math.pow(logNorm, 0.55) * (MAX_R - MIN_R)
    return { ...t, radius: Math.round(radius * 10) / 10 }
  })
  withRadius.sort((a, b) => b.radius - a.radius)

  const cx = containerWidth / 2
  const cy = containerHeight / 2
  const placed = []
  const GAP = 2

  for (const token of withRadius) {
    if (placed.length === 0) {
      placed.push({ ...token, x: cx, y: cy })
      continue
    }

    let angle = 0
    let dist = 0
    let bestX = cx
    let bestY = cy
    let found = false
    const angleStep = 0.25
    const distStep = 2

    while (!found && dist < Math.max(containerWidth, containerHeight) * 0.6) {
      const tx = cx + Math.cos(angle) * dist
      const ty = cy + Math.sin(angle) * dist

      // Bounds check
      if (tx - token.radius >= 0 && tx + token.radius <= containerWidth &&
          ty - token.radius >= 0 && ty + token.radius <= containerHeight) {
        let overlaps = false
        for (const p of placed) {
          const dx = tx - p.x
          const dy = ty - p.y
          const minDist = token.radius + p.radius + GAP
          if (dx * dx + dy * dy < minDist * minDist) {
            overlaps = true
            break
          }
        }
        if (!overlaps) {
          bestX = tx
          bestY = ty
          found = true
        }
      }

      angle += angleStep
      dist += distStep * (angleStep / (2 * Math.PI))
    }

    if (!found) {
      // Fallback: place at spiral end, slightly toward center
      bestX = cx + Math.cos(angle) * dist * 0.7
      bestY = cy + Math.sin(angle) * dist * 0.7
    }

    placed.push({ ...token, x: bestX, y: bestY })
  }

  return placed
}

/* ══════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════ */

const BubblesPage = ({ dayMode = false, marketMode = 'crypto', onBack }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const isStocks = marketMode === 'stocks'

  const [allTokens, setAllTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageRange, setPageRange] = useState(PAGE_RANGES[0])
  const [timeframe, setTimeframe] = useState(isStocks ? 'today' : '24h')
  const [sortBy, setSortBy] = useState('market_cap')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [fullscreen, setFullscreen] = useState(false)
  const [hoveredToken, setHoveredToken] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [animateIn, setAnimateIn] = useState(false)
  const containerRef = useRef(null)
  const fullscreenArenaRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [fsSize, setFsSize] = useState({ width: 0, height: 0 })

  // Reset state when market mode switches
  useEffect(() => {
    setAllTokens([])
    setLoading(true)
    setError(null)
    setAnimateIn(false)
    setHoveredToken(null)
    setTimeframe(isStocks ? 'today' : '24h')
    setSectorFilter('all')
  }, [isStocks])

  // Live prices (crypto only — stocks refresh via fetch interval)
  const symbols = useMemo(() => {
    if (isStocks) return []
    return allTokens.map(t => (t.symbol || '').toUpperCase()).filter(Boolean)
  }, [allTokens, isStocks])
  const { prices: binancePrices } = useBinanceTopCoinPrices(symbols, isStocks ? null : 5000)

  /* ── Fetch CRYPTO data ── */
  useEffect(() => {
    if (isStocks) return
    let cancelled = false
    const fetchTokens = async () => {
      setLoading(true)
      setError(null)
      setAnimateIn(false)
      try {
        const startPage = Math.ceil(pageRange.start / 25)
        const promises = []
        for (let p = startPage; p < startPage + 4; p++) {
          promises.push(getTopCoinsMarketsPage(p, 25))
        }
        const results = await Promise.all(promises)
        if (cancelled) return
        const all = results.flat()
        const mapped = all.map((coin, index) => ({
          rank: coin.market_cap_rank || (pageRange.start + index),
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          logo: coin.image || null,
          price: Number(coin.current_price) || 0,
          change24h: Number(coin.price_change_percentage_24h) || 0,
          change1h: Number(coin.price_change_percentage_1h_in_currency) || 0,
          change7d: Number(coin.price_change_percentage_7d_in_currency) || 0,
          marketCap: Number(coin.market_cap) || 0,
          volume: Number(coin.total_volume) || 0,
          _type: 'crypto',
        }))
        setAllTokens(mapped)
        setLoading(false)
        requestAnimationFrame(() => setAnimateIn(true))
      } catch (err) {
        if (!cancelled) { setError(t('common.error')); setLoading(false) }
      }
    }
    fetchTokens()
    const iv = setInterval(fetchTokens, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [pageRange, isStocks])

  /* ── Helper: map quotes + POPULAR_STOCKS into display format ── */
  const mapStocksToTokens = useCallback((quotes) => {
    const mapped = POPULAR_STOCKS.map((stock, index) => {
      const quote = quotes[stock.symbol] || {}
      const fallback = FALLBACK_STOCK_DATA[stock.symbol]
      const price = quote.price || (fallback?.price || 0)
      const change = quote.change != null ? quote.change : (fallback?.change || 0)
      const mcap = quote.marketCap || (fallback?.marketCap || 0)
      const volume = quote.volume || (fallback?.volume || 0)
      if (price <= 0 && !fallback) return null
      return {
        rank: index + 1,
        symbol: stock.symbol,
        name: quote.name || stock.name,
        logo: getStockLogoUrl(stock.symbol),
        price,
        change24h: change,
        change1h: 0,
        change7d: 0,
        marketCap: mcap,
        volume,
        sector: quote.sector || stock.sector || '',
        exchange: quote.exchange || stock.exchange || '',
        pe: quote.pe || (fallback?.pe || null),
        week52High: quote.week52High || null,
        week52Low: quote.week52Low || null,
        marketState: quote.marketState || 'CLOSED',
        _type: 'stock',
      }
    }).filter(Boolean).filter(s => s.price > 0)
    mapped.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    mapped.forEach((s, i) => { s.rank = i + 1 })
    return mapped
  }, [])

  /* ── Fetch STOCK data — instant fallback + live upgrade ── */
  useEffect(() => {
    if (!isStocks) return
    let cancelled = false

    // 1. Show fallback data IMMEDIATELY (no loading spinner)
    const instant = mapStocksToTokens({})
    if (instant.length > 0) {
      setAllTokens(instant)
      setLoading(false)
      requestAnimationFrame(() => setAnimateIn(true))
    }

    // 2. Try to get live data in background
    const fetchLive = async () => {
      try {
        const stockSymbols = POPULAR_STOCKS.map(s => s.symbol)
        const quotes = await getStockQuotes(stockSymbols)
        if (cancelled) return
        if (Object.keys(quotes).length > 0) {
          const updated = mapStocksToTokens(quotes)
          if (updated.length > 0) {
            setAllTokens(updated)
          }
        }
      } catch (err) {
        // Fallback already displayed, just log
        console.warn('Live stock data unavailable:', err.message)
      }
    }
    fetchLive()
    // Refresh every 60s
    const iv = setInterval(fetchLive, 60 * 1000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [isStocks, mapStocksToTokens])

  // Escape closes fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const handleEsc = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [fullscreen])

  /* ── Container size measurement ── */
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ width: width - 24, height: height - 24 }) // subtract padding
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  // Fullscreen arena size
  useLayoutEffect(() => {
    const el = fullscreenArenaRef.current
    if (!el || !fullscreen) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setFsSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fullscreen])

  /* ── Computed data ── */
  const getChange = useCallback((token) => {
    if (isStocks) return token.change24h || 0
    if (timeframe === '1h') return token.change1h || 0
    if (timeframe === '7d') return token.change7d || 0
    return token.change24h || 0
  }, [timeframe, isStocks])

  // Apply sector filter for stocks
  const filteredTokens = useMemo(() => {
    if (!isStocks || sectorFilter === 'all') return allTokens
    return allTokens.filter(t => t.sector === sectorFilter)
  }, [allTokens, isStocks, sectorFilter])

  const sortedTokens = useMemo(() => {
    let tokens = [...filteredTokens]
    if (sortBy === 'change') {
      tokens.sort((a, b) => Math.abs(getChange(b)) - Math.abs(getChange(a)))
    } else if (sortBy === 'volume') {
      tokens.sort((a, b) => (b.volume || 0) - (a.volume || 0))
    }
    return tokens
  }, [filteredTokens, sortBy, getChange])

  const packedBubbles = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !sortedTokens.length) return []
    return packCircles(sortedTokens, containerSize.width, containerSize.height)
  }, [sortedTokens, containerSize])

  const fsBubbles = useMemo(() => {
    if (!fsSize.width || !fsSize.height || !sortedTokens.length) return []
    return packCircles(sortedTokens, fsSize.width, fsSize.height)
  }, [sortedTokens, fsSize])

  const stats = useMemo(() => {
    if (!sortedTokens.length) return null
    const total = sortedTokens.length
    const gains = sortedTokens.filter(t => getChange(t) > 0).length
    const losses = total - gains
    const avgChange = sortedTokens.reduce((s, t) => s + getChange(t), 0) / total
    const totalMcap = sortedTokens.reduce((s, t) => s + (t.marketCap || 0), 0)
    const totalVol = sortedTokens.reduce((s, t) => s + (t.volume || 0), 0)
    const best = [...sortedTokens].sort((a, b) => getChange(b) - getChange(a))[0]
    const worst = [...sortedTokens].sort((a, b) => getChange(a) - getChange(b))[0]
    const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'
    return { total, gains, losses, avgChange, totalMcap, totalVol, best, worst, sentiment }
  }, [sortedTokens, getChange])

  const activeTimeframes = isStocks ? STOCK_TIMEFRAMES : TIMEFRAMES
  const tfLabel = isStocks ? t('bubbles.today') : (TIMEFRAMES.find(tf => tf.id === timeframe)?.label || '24H')

  /* ── Get market state badge for stocks ── */
  const marketStateBadge = useMemo(() => {
    if (!isStocks || !allTokens.length) return null
    const state = allTokens[0]?.marketState || 'CLOSED'
    const labels = { REGULAR: t('bubbles.marketOpen'), PRE: t('bubbles.preMarket'), POST: t('bubbles.afterHours'), CLOSED: t('bubbles.marketClosed') }
    const colors = { REGULAR: 'val-green', PRE: 'val-yellow', POST: 'val-yellow', CLOSED: 'val-dim' }
    return { label: labels[state] || 'Closed', color: colors[state] || 'val-dim' }
  }, [isStocks, allTokens, t])

  /* ── Render bubbles ── */
  const renderBubbles = useCallback((bubbles, isFs) => {
    return (
      <div className="bubbles-arena">
        {bubbles.map((token, idx) => {
          // Live price: for crypto use Binance, for stocks use fetched data directly
          let livePrice, liveChange24h
          if (isStocks) {
            livePrice = token.price
            liveChange24h = token.change24h
          } else {
            const liveData = binancePrices?.[token.symbol] || binancePrices?.[token.symbol?.toUpperCase?.()] || {}
            livePrice = liveData.price > 0 ? liveData.price : token.price
            liveChange24h = liveData.change != null ? liveData.change : token.change24h
          }
          const change = (isStocks || timeframe === '24h') ? (Number(liveChange24h) || 0) : getChange(token)
          const absChange = Math.abs(change)
          const isPositive = change >= 0
          const intensity = Math.min(1, absChange / (isStocks ? 5 : 10)) // stocks move less, scale faster

          // Color logic
          let cr
          if (isStocks && token.sector) {
            // For stocks, use sector color as accent tint
            cr = isPositive ? '16, 185, 129' : '239, 68, 68'
          } else {
            cr = isPositive ? '16, 185, 129' : '239, 68, 68'
          }

          // Neumorphic glass orb color calc
          const baseAlpha = 0.10 + intensity * 0.35
          const topAlpha = Math.max(0.04, baseAlpha * 0.5)
          const bottomAlpha = baseAlpha + 0.08
          const bgColor = `rgba(${cr}, ${baseAlpha.toFixed(3)})`
          const bgTop = `rgba(${cr}, ${topAlpha.toFixed(3)})`
          const bgBottom = `rgba(${cr}, ${bottomAlpha.toFixed(3)})`
          const borderColor = isPositive
            ? `rgba(16, 185, 129, ${(0.14 + intensity * 0.26).toFixed(3)})`
            : `rgba(239, 68, 68, ${(0.14 + intensity * 0.26).toFixed(3)})`

          // Brand color: crypto uses token colors, stocks use sector colors
          let brandRgb
          if (isStocks) {
            brandRgb = SECTOR_COLORS[token.sector] || DEFAULT_SECTOR_COLOR
          } else {
            const rowColors = TOKEN_ROW_COLORS[(token.symbol || '').toUpperCase()]
            brandRgb = rowColors?.bg || '255, 255, 255'
          }

          const r = token.radius || 30
          const showLogo = r > 28
          const showChange = r > 32
          const showName = r > 55
          const showSector = isStocks && r > 65

          return (
            <div
              key={token.symbol || idx}
              className={`bubble-node ${isPositive ? 'positive' : 'negative'} ${animateIn ? 'animate-in' : ''} ${isStocks ? 'stock-bubble' : ''}`}
              style={{
                left: token.x - r,
                top: token.y - r,
                width: r * 2,
                height: r * 2,
                '--bubble-bg': bgColor,
                '--bubble-bg-top': bgTop,
                '--bubble-bg-bottom': bgBottom,
                '--bubble-border': borderColor,
                '--bubble-brand-rgb': brandRgb,
                animationDelay: `${idx * 18}ms`,
              }}
              onMouseEnter={(e) => {
                setHoveredToken({ ...token, livePrice, change })
                setTooltipPos({ x: e.clientX, y: e.clientY })
              }}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredToken(null)}
            >
              <div className="bubble-content">
                {showLogo && (
                  <div className="bubble-logo" style={{ width: Math.max(14, r * 0.38), height: Math.max(14, r * 0.38) }}>
                    {token.logo ? (
                      <img src={token.logo} alt={token.symbol} onError={(e) => { e.target.style.display = 'none' }} />
                    ) : (
                      <span className={isStocks ? 'stock-ticker-letter' : ''}>{token.symbol?.[0] || '?'}</span>
                    )}
                  </div>
                )}
                <span className="bubble-symbol" style={{ fontSize: Math.max(8, r * 0.2) }}>
                  {token.symbol}
                </span>
                {showName && (
                  <span className="bubble-name" style={{ fontSize: Math.max(7, r * 0.13) }}>
                    {token.name}
                  </span>
                )}
                {showSector && (
                  <span className="bubble-sector" style={{ fontSize: Math.max(6, r * 0.10), color: `rgb(${SECTOR_COLORS[token.sector] || DEFAULT_SECTOR_COLOR})` }}>
                    {token.sector}
                  </span>
                )}
                {showChange && (
                  <span className={`bubble-change ${isPositive ? 'pos' : 'neg'}`}
                        style={{ fontSize: Math.max(7, r * 0.17) }}>
                    {isPositive ? '+' : ''}{formatChange(change)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [binancePrices, timeframe, getChange, animateIn, isStocks])

  /* ── Tooltip ── */
  const renderTooltip = () => {
    if (!hoveredToken) return null
    const ht = hoveredToken
    const isPositive = (ht.change || 0) >= 0
    const priceFormatter = fmtPrice

    return createPortal(
      <div
        className={`bubble-tooltip ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stock-tooltip' : ''}`}
        style={{
          position: 'fixed',
          left: Math.min(tooltipPos.x + 16, window.innerWidth - 280),
          top: Math.min(tooltipPos.y - 10, window.innerHeight - 240),
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      >
        <div className="bubble-tooltip-header">
          {ht.logo && <img src={ht.logo} alt="" className="bubble-tooltip-logo" />}
          <div>
            <div className="bubble-tooltip-name">{ht.name}</div>
            <div className="bubble-tooltip-rank">
              {isStocks ? (
                <>{ht.symbol} · {ht.exchange || 'NYSE'}</>
              ) : (
                <>#{ht.rank} · {ht.symbol}</>
              )}
            </div>
          </div>
        </div>
        <div className="bubble-tooltip-grid">
          <div className="bubble-tooltip-row">
            <span>{t('common.price')}</span><span>{priceFormatter(ht.livePrice || ht.price)}</span>
          </div>
          <div className="bubble-tooltip-row">
            <span>{tfLabel} {t('heatmaps.change')}</span>
            <span className={isPositive ? 'pos' : 'neg'}>
              {isPositive ? '+' : ''}{formatChange(ht.change)}%
            </span>
          </div>
          <div className="bubble-tooltip-row">
            <span>{t('common.marketCap')}</span><span>{fmtLarge(ht.marketCap)}</span>
          </div>
          <div className="bubble-tooltip-row">
            <span>{isStocks ? t('common.volume') : t('common.volume24h')}</span><span>{fmtLarge(ht.volume)}</span>
          </div>
          {isStocks && ht.pe && (
            <div className="bubble-tooltip-row">
              <span>{t('bubbles.peRatio')}</span><span>{typeof ht.pe === 'number' ? ht.pe.toFixed(1) : '—'}</span>
            </div>
          )}
          {isStocks && ht.sector && (
            <div className="bubble-tooltip-row">
              <span>{t('heatmaps.sector')}</span>
              <span style={{ color: `rgb(${SECTOR_COLORS[ht.sector] || DEFAULT_SECTOR_COLOR})` }}>{ht.sector}</span>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  /* ── Fullscreen button ── */
  const fullscreenBtn = (
    <button className="bubble-fullscreen-btn" onClick={() => setFullscreen(f => !f)} title={fullscreen ? t('bubbles.exitFullscreen') : t('bubbles.fullscreen')}>
      {fullscreen ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  )

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */
  return (
    <div className={`bubbles-page ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`}>
      {/* Hero */}
      <div className="bubbles-hero">
        <div className="bubbles-hero-inner">
          <div className="bubbles-hero-left">
            <h1 className="bubbles-title">
              {isStocks ? t('bubbles.stockBubbles') : t('bubbles.cryptoBubbles')}
            </h1>
            <p className="bubbles-subtitle">
              {isStocks
                ? `${sectorFilter === 'all' ? t('bubbles.allSectors') : sectorFilter} · ${sortedTokens.length} ${t('nav.stocks').toLowerCase()} · ${t('bubbles.realTime')}`
                : `Top ${t(pageRange.labelKey)} tokens by market cap · ${tfLabel} performance`
              }
            </p>
          </div>
          {stats && (
            <div className="bubbles-hero-stats">
              {isStocks && marketStateBadge && (
                <div className={`bubbles-market-state ${marketStateBadge.color}`}>
                  <span className="bubbles-market-state-dot" />
                  {marketStateBadge.label}
                </div>
              )}
              {!isStocks && (
                <div className={`categories-header-sentiment bias-${stats.sentiment}`}>
                  <span className="categories-hero-sent-dot" />
                  {stats.sentiment.toUpperCase()}
                </div>
              )}
              <div className="bubbles-hero-stat">
                <span className="bubbles-hero-stat-val">{fmtLarge(stats.totalMcap)}</span>
                <span className="bubbles-hero-stat-lbl">{t('heatmaps.totalMcap')}</span>
              </div>
              <div className="bubbles-hero-stat">
                <span className={`bubbles-hero-stat-val ${stats.avgChange >= 0 ? 'val-green' : 'val-red'}`}>
                  {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                </span>
                <span className="bubbles-hero-stat-lbl">{t('heatmaps.avg')} {tfLabel}</span>
              </div>
              <div className="bubbles-hero-stat">
                <span className="bubbles-hero-stat-val val-green">{stats.gains}</span>
                <span className="bubbles-hero-stat-lbl">{t('common.gainers')}</span>
              </div>
              <div className="bubbles-hero-stat">
                <span className="bubbles-hero-stat-val val-red">{stats.losses}</span>
                <span className="bubbles-hero-stat-lbl">{t('common.losers')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bubbles-controls">
        <div className="bubbles-controls-left">
          {/* Timeframe — crypto: 1H/24H/7D, stocks: Today only */}
          <div className="bubbles-pill-group">
            <span className="bubbles-pill-label">{t('heatmaps.timeframe')}</span>
            <div className="bubbles-pills">
              {activeTimeframes.map(tf => (
                <button key={tf.id} className={`bubbles-pill ${timeframe === tf.id ? 'active' : ''}`}
                        onClick={() => setTimeframe(tf.id)}>{tf.labelKey ? t(tf.labelKey) : tf.label}</button>
              ))}
            </div>
          </div>

          {/* Range (crypto) or Sector filter (stocks) */}
          {isStocks ? (
            <div className="bubbles-pill-group">
              <span className="bubbles-pill-label">{t('heatmaps.sector')}</span>
              <div className="bubbles-pills">
                {STOCK_SECTOR_FILTERS.map(sf => (
                  <button key={sf.id} className={`bubbles-pill ${sectorFilter === sf.id ? 'active' : ''}`}
                          onClick={() => setSectorFilter(sf.id)}>{t(sf.labelKey)}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bubbles-pill-group">
              <span className="bubbles-pill-label">{t('bubbles.range')}</span>
              <div className="bubbles-pills">
                {PAGE_RANGES.map(pr => (
                  <button key={pr.id} className={`bubbles-pill ${pageRange.id === pr.id ? 'active' : ''}`}
                          onClick={() => setPageRange(pr)}>{t(pr.labelKey)}</button>
                ))}
              </div>
            </div>
          )}

          <div className="bubbles-pill-group">
            <span className="bubbles-pill-label">{t('heatmaps.sort')}</span>
            <div className="bubbles-pills">
              {SORT_OPTIONS.map(s => (
                <button key={s.id} className={`bubbles-pill ${sortBy === s.id ? 'active' : ''}`}
                        onClick={() => setSortBy(s.id)}>{t(s.labelKey)}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="bubbles-controls-right">
          {fullscreenBtn}
        </div>
      </div>

      {/* Bubble Visualization */}
      {loading ? (
        <div className="bubbles-loading">
          <div className="bubbles-loading-spinner" />
          <span>{t('common.loading')}</span>
        </div>
      ) : error ? (
        <div className="bubbles-error">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      ) : (
        <div className="bubbles-container" ref={containerRef}>
          {renderBubbles(packedBubbles, false)}
        </div>
      )}

      {/* Top Movers Strip */}
      {stats && stats.best && (
        <div className="bubbles-movers">
          <div className="bubbles-mover-item">
            <span className="bubbles-mover-label">{t('heatmaps.topGainer')}</span>
            <span className="bubbles-mover-token">
              {stats.best.logo && <img src={stats.best.logo} alt="" className="bubbles-mover-logo" />}
              {stats.best.symbol}
            </span>
            <span className="bubbles-mover-change pos">+{formatChange(getChange(stats.best))}%</span>
          </div>
          <div className="bubbles-movers-divider" />
          <div className="bubbles-mover-item">
            <span className="bubbles-mover-label">{t('heatmaps.topLoser')}</span>
            <span className="bubbles-mover-token">
              {stats.worst.logo && <img src={stats.worst.logo} alt="" className="bubbles-mover-logo" />}
              {stats.worst.symbol}
            </span>
            <span className="bubbles-mover-change neg">{formatChange(getChange(stats.worst))}%</span>
          </div>
          <div className="bubbles-movers-divider" />
          <div className="bubbles-mover-item">
            <span className="bubbles-mover-label">{isStocks ? t('common.volume') : t('common.volume24h')}</span>
            <span className="bubbles-mover-val">{fmtLarge(stats.totalVol)}</span>
          </div>
        </div>
      )}

      {/* Fullscreen Portal */}
      {fullscreen && createPortal(
        <div className="bubbles-fullscreen-overlay" onClick={() => setFullscreen(false)}>
          <div className={`bubbles-fullscreen-container ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="bubbles-fullscreen-toolbar">
              <span className="bubbles-fullscreen-title">
                {isStocks ? 'Spectre Stock Bubbles' : `Spectre Market Bubblemap · Top ${t(pageRange.labelKey)}`}
              </span>
              <div className="bubbles-fullscreen-controls">
                {activeTimeframes.map(tf => (
                  <button key={tf.id} className={`bubbles-pill ${timeframe === tf.id ? 'active' : ''}`}
                          onClick={() => setTimeframe(tf.id)}>{tf.labelKey ? t(tf.labelKey) : tf.label}</button>
                ))}
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                {isStocks ? (
                  STOCK_SECTOR_FILTERS.slice(0, 5).map(sf => (
                    <button key={sf.id} className={`bubbles-pill ${sectorFilter === sf.id ? 'active' : ''}`}
                            onClick={() => setSectorFilter(sf.id)}>{t(sf.labelKey)}</button>
                  ))
                ) : (
                  PAGE_RANGES.map(pr => (
                    <button key={pr.id} className={`bubbles-pill ${pageRange.id === pr.id ? 'active' : ''}`}
                            onClick={() => setPageRange(pr)}>{t(pr.labelKey)}</button>
                  ))
                )}
                {fullscreenBtn}
              </div>
            </div>
            <div className="bubbles-fullscreen-arena" ref={fullscreenArenaRef}>
              {fsBubbles.length > 0 && renderBubbles(fsBubbles, true)}
            </div>
          </div>
        </div>,
        document.body
      )}

      {renderTooltip()}
    </div>
  )
}

export default BubblesPage
