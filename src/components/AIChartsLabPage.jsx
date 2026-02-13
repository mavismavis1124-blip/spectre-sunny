/**
 * AIChartsLabPage — Experimental AI-powered chart visualizations
 * 3 custom Canvas 2D charts: Support/Demand Zones, Event Timeline, Liquidity Heatmap
 * All use hardcoded mock BTC data — no live API dependency
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import SectorCompareChart from './SectorCompareChart'
import CompareChart from './CompareChart'
import { useCurrency } from '../hooks/useCurrency'
import './AIChartsLabPage.css'

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateMockBTCData() {
  const rand = seededRandom(42)
  const bars = []
  let price = 38500
  const startDate = new Date('2024-01-15')

  // Phases: accumulation → breakout → rally → correction → rally2
  const phases = [
    { len: 35, drift: 0.002, vol: 0.018 },   // slow grind up
    { len: 25, drift: 0.006, vol: 0.025 },   // ETF breakout
    { len: 20, drift: 0.001, vol: 0.022 },   // consolidation
    { len: 20, drift: -0.004, vol: 0.028 },  // correction
    { len: 25, drift: 0.005, vol: 0.02 },    // halving rally
    { len: 15, drift: 0.002, vol: 0.015 },   // consolidation
    { len: 15, drift: -0.006, vol: 0.032 },  // crash
    { len: 25, drift: 0.004, vol: 0.02 },    // recovery
  ]

  let barIdx = 0
  for (const phase of phases) {
    for (let i = 0; i < phase.len; i++) {
      const change = phase.drift + (rand() - 0.5) * phase.vol * 2
      const open = price
      const close = open * (1 + change)
      const high = Math.max(open, close) * (1 + rand() * 0.012)
      const low = Math.min(open, close) * (1 - rand() * 0.012)
      const volume = (800 + rand() * 1200) * 1e6 * (1 + Math.abs(change) * 20)

      const date = new Date(startDate)
      date.setDate(date.getDate() + barIdx)

      bars.push({
        time: date.getTime(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.round(volume),
      })

      price = close
      barIdx++
    }
  }

  return bars
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPORT_ZONES = [
  { low: 38200, high: 39800, labelKey: 'aiChartsLab.strongSupport', strength: 0.9 },
  { low: 43500, high: 45200, labelKey: 'aiChartsLab.demandZone', strength: 0.7 },
]

const RESISTANCE_ZONES = [
  { low: 63500, high: 65200, labelKey: 'aiChartsLab.supplyZone', strength: 0.75 },
  { low: 69800, high: 71500, labelKey: 'aiChartsLab.majorResistance', strength: 0.9 },
]

const EVENTS = [
  { barIndex: 28, labelKey: 'aiChartsLab.eventEtf', date: 'Jan 10', sentiment: 'bullish' },
  { barIndex: 52, labelKey: 'aiChartsLab.eventFedRates', date: 'Mar 20', sentiment: 'neutral' },
  { barIndex: 72, labelKey: 'aiChartsLab.eventMtGox', date: 'Apr 24', sentiment: 'bearish' },
  { barIndex: 98, labelKey: 'aiChartsLab.eventHalving', date: 'Apr 20', sentiment: 'bullish' },
  { barIndex: 122, labelKey: 'aiChartsLab.eventSecRipple', date: 'Jun 13', sentiment: 'bullish' },
  { barIndex: 138, labelKey: 'aiChartsLab.eventJapanCrash', date: 'Jul 31', sentiment: 'bearish' },
  { barIndex: 158, labelKey: 'aiChartsLab.eventChinaStimulus', date: 'Sep 24', sentiment: 'bullish' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  return { ctx, w: rect.width, h: rect.height }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function getMonthLabel(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART 1: SUPPORT & DEMAND ZONES
// ═══════════════════════════════════════════════════════════════════════════════

const SupportDemandChart = React.memo(({ bars }) => {
  const canvasRef = useRef(null)
  const { t } = useTranslation()
  const { fmtLarge, fmtPrice } = useCurrency()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !bars.length) return
    const { ctx, w, h } = setupCanvas(canvas)

    // Layout
    const pad = { top: 20, right: 80, bottom: 40, left: 20 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    // Price range
    const allHigh = Math.max(...bars.map(b => b.high), ...RESISTANCE_ZONES.map(z => z.high))
    const allLow = Math.min(...bars.map(b => b.low), ...SUPPORT_ZONES.map(z => z.low))
    const priceRange = allHigh - allLow
    const pricePad = priceRange * 0.05
    const minP = allLow - pricePad
    const maxP = allHigh + pricePad

    const priceToY = (p) => pad.top + chartH * (1 - (p - minP) / (maxP - minP))
    const barToX = (i) => pad.left + (i + 0.5) * (chartW / bars.length)

    // Background
    ctx.fillStyle = '#0c0c12'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    const priceStep = Math.ceil(priceRange / 6 / 1000) * 1000
    for (let p = Math.ceil(minP / priceStep) * priceStep; p <= maxP; p += priceStep) {
      const y = priceToY(p)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()

      // Price label
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '10px "SF Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(fmtLarge(p), w - pad.right + 8, y + 3)
    }

    // X-axis month labels
    let lastMonth = ''
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i < bars.length; i += 1) {
      const m = getMonthLabel(bars[i].time)
      if (m !== lastMonth) {
        ctx.fillText(m, barToX(i), h - pad.bottom + 20)
        lastMonth = m
      }
    }

    // ── Support zones ──
    for (const zone of SUPPORT_ZONES) {
      const y1 = priceToY(zone.high)
      const y2 = priceToY(zone.low)
      // Fill
      ctx.fillStyle = `rgba(34, 197, 94, ${0.08 + zone.strength * 0.06})`
      ctx.fillRect(pad.left, y1, chartW, y2 - y1)
      // Border
      ctx.strokeStyle = `rgba(34, 197, 94, ${0.15 + zone.strength * 0.15})`
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(pad.left, y1)
      ctx.lineTo(pad.left + chartW, y1)
      ctx.moveTo(pad.left, y2)
      ctx.lineTo(pad.left + chartW, y2)
      ctx.stroke()
      ctx.setLineDash([])
      // Label
      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)'
      ctx.font = 'bold 10px "SF Mono", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${t(zone.labelKey)} ${fmtLarge(zone.low)}–${fmtLarge(zone.high)}`, w - pad.right - 6, y1 + 13)
    }

    // ── Resistance zones ──
    for (const zone of RESISTANCE_ZONES) {
      const y1 = priceToY(zone.high)
      const y2 = priceToY(zone.low)
      ctx.fillStyle = `rgba(239, 68, 68, ${0.08 + zone.strength * 0.06})`
      ctx.fillRect(pad.left, y1, chartW, y2 - y1)
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 + zone.strength * 0.15})`
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(pad.left, y1)
      ctx.lineTo(pad.left + chartW, y1)
      ctx.moveTo(pad.left, y2)
      ctx.lineTo(pad.left + chartW, y2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
      ctx.font = 'bold 10px "SF Mono", monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${t(zone.labelKey)} ${fmtLarge(zone.low)}–${fmtLarge(zone.high)}`, w - pad.right - 6, y2 - 6)
    }

    // ── Candlesticks ──
    const candleW = Math.max(1, (chartW / bars.length) * 0.6)
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]
      const x = barToX(i)
      const isUp = b.close >= b.open

      // Wick
      ctx.strokeStyle = isUp ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, priceToY(b.high))
      ctx.lineTo(x, priceToY(b.low))
      ctx.stroke()

      // Body
      const bodyTop = priceToY(Math.max(b.open, b.close))
      const bodyBot = priceToY(Math.min(b.open, b.close))
      const bodyH = Math.max(1, bodyBot - bodyTop)

      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444'
      ctx.shadowColor = isUp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      ctx.shadowBlur = 4
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
      ctx.shadowBlur = 0
    }

    // ── Current price line ──
    const lastPrice = bars[bars.length - 1].close
    const cpY = priceToY(lastPrice)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, cpY)
    ctx.lineTo(w - pad.right, cpY)
    ctx.stroke()
    ctx.setLineDash([])

    // Current price badge
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(255,255,255,0.3)'
    ctx.shadowBlur = 8
    roundRect(ctx, w - pad.right + 2, cpY - 10, 70, 20, 4)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0c0c12'
    ctx.font = 'bold 11px "SF Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(fmtPrice(lastPrice), w - pad.right + 37, cpY + 4)
  }, [bars, t, fmtLarge, fmtPrice])

  useEffect(() => {
    draw()
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return <canvas ref={canvasRef} className="acl-canvas" />
})

// ═══════════════════════════════════════════════════════════════════════════════
// CHART 2: EVENT TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

const EventTimelineChart = React.memo(({ bars }) => {
  const canvasRef = useRef(null)
  const { t } = useTranslation()
  const { fmtLarge } = useCurrency()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !bars.length) return
    const { ctx, w, h } = setupCanvas(canvas)

    const pad = { top: 30, right: 60, bottom: 40, left: 20 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    const prices = bars.map(b => b.close)
    const minP = Math.min(...prices) * 0.97
    const maxP = Math.max(...prices) * 1.03

    const priceToY = (p) => pad.top + chartH * (1 - (p - minP) / (maxP - minP))
    const barToX = (i) => pad.left + (i / (bars.length - 1)) * chartW

    // Background
    ctx.fillStyle = '#0c0c12'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    const priceRange = maxP - minP
    const priceStep = Math.ceil(priceRange / 6 / 1000) * 1000
    for (let p = Math.ceil(minP / priceStep) * priceStep; p <= maxP; p += priceStep) {
      const y = priceToY(p)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '10px "SF Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(fmtLarge(p), w - pad.right + 6, y + 3)
    }

    // X-axis
    let lastMonth = ''
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i < bars.length; i++) {
      const m = getMonthLabel(bars[i].time)
      if (m !== lastMonth) {
        ctx.fillText(m, barToX(i), h - pad.bottom + 20)
        lastMonth = m
      }
    }

    // ── Area fill under line ──
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.2)')
    grad.addColorStop(1, 'rgba(168, 85, 247, 0.0)')

    ctx.beginPath()
    ctx.moveTo(barToX(0), priceToY(prices[0]))
    for (let i = 1; i < prices.length; i++) {
      const x0 = barToX(i - 1), y0 = priceToY(prices[i - 1])
      const x1 = barToX(i), y1 = priceToY(prices[i])
      const cpx = (x0 + x1) / 2
      ctx.quadraticCurveTo(cpx, y0, x1, y1)
    }
    ctx.lineTo(barToX(prices.length - 1), pad.top + chartH)
    ctx.lineTo(barToX(0), pad.top + chartH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // ── Smooth price line ──
    ctx.beginPath()
    ctx.moveTo(barToX(0), priceToY(prices[0]))
    for (let i = 1; i < prices.length; i++) {
      const x0 = barToX(i - 1), y0 = priceToY(prices[i - 1])
      const x1 = barToX(i), y1 = priceToY(prices[i])
      const cpx = (x0 + x1) / 2
      ctx.quadraticCurveTo(cpx, y0, x1, y1)
    }
    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(168, 85, 247, 0.5)'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // ── Event markers ──
    const sentimentColors = {
      bullish: { main: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)' },
      bearish: { main: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
      neutral: { main: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
    }

    for (let ei = 0; ei < EVENTS.length; ei++) {
      const ev = EVENTS[ei]
      if (ev.barIndex >= bars.length) continue
      const x = barToX(ev.barIndex)
      const priceY = priceToY(prices[ev.barIndex])
      const colors = sentimentColors[ev.sentiment]
      const above = ei % 2 === 0

      // Vertical dashed line
      ctx.strokeStyle = `${colors.main}44`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, pad.top)
      ctx.lineTo(x, pad.top + chartH)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot on price
      ctx.beginPath()
      ctx.arc(x, priceY, 5, 0, Math.PI * 2)
      ctx.fillStyle = colors.main
      ctx.shadowColor = colors.main
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0

      // Floating label card
      const cardW = 140
      const cardH = 38
      const cardX = Math.max(pad.left, Math.min(x - cardW / 2, w - pad.right - cardW))
      const cardY = above ? priceY - cardH - 20 : priceY + 20

      // Card background
      roundRect(ctx, cardX, cardY, cardW, cardH, 8)
      ctx.fillStyle = colors.bg
      ctx.fill()
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      ctx.stroke()

      // Left accent
      ctx.fillStyle = colors.main
      roundRect(ctx, cardX, cardY, 3, cardH, 2)
      ctx.fill()

      // Event text
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(t(ev.labelKey), cardX + 10, cardY + 15)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '9px "SF Mono", monospace'
      ctx.fillText(ev.date, cardX + 10, cardY + 28)

      // Connector line from dot to card
      ctx.strokeStyle = `${colors.main}66`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, priceY + (above ? -6 : 6))
      ctx.lineTo(x, above ? cardY + cardH : cardY)
      ctx.stroke()
    }
  }, [bars, t, fmtLarge])

  useEffect(() => {
    draw()
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return <canvas ref={canvasRef} className="acl-canvas" />
})

// ═══════════════════════════════════════════════════════════════════════════════
// CHART 3: LIQUIDITY HEATMAP
// ═══════════════════════════════════════════════════════════════════════════════

function interpolateHeatColor(v) {
  // 0 → dark, 0.3 → purple, 0.6 → blue, 0.85 → cyan, 1.0 → white
  v = Math.max(0, Math.min(1, v))
  if (v < 0.2) {
    const t = v / 0.2
    return `rgba(${Math.round(15 + t * 60)}, ${Math.round(10 + t * 10)}, ${Math.round(25 + t * 100)}, ${0.3 + t * 0.5})`
  } else if (v < 0.45) {
    const t = (v - 0.2) / 0.25
    return `rgba(${Math.round(75 - t * 60)}, ${Math.round(20 + t * 140)}, ${Math.round(125 + t * 80)}, ${0.8})`
  } else if (v < 0.7) {
    const t = (v - 0.45) / 0.25
    return `rgba(${Math.round(15 + t * 5)}, ${Math.round(160 + t * 50)}, ${Math.round(205 + t * 30)}, ${0.85})`
  } else if (v < 0.9) {
    const t = (v - 0.7) / 0.2
    return `rgba(${Math.round(20 + t * 200)}, ${Math.round(210 + t * 40)}, ${Math.round(235 + t * 20)}, ${0.9})`
  } else {
    const t = (v - 0.9) / 0.1
    return `rgba(${Math.round(220 + t * 35)}, ${Math.round(250 + t * 5)}, 255, ${0.95 + t * 0.05})`
  }
}

const LiquidityHeatmap = React.memo(({ bars }) => {
  const canvasRef = useRef(null)
  const { t } = useTranslation()
  const { fmtLarge, fmtPrice } = useCurrency()

  // Generate heatmap density matrix
  const heatData = useMemo(() => {
    if (!bars.length) return null
    const cols = bars.length
    const rows = 60
    const prices = bars.map(b => b.close)
    const minP = Math.min(...bars.map(b => b.low)) * 0.97
    const maxP = Math.max(...bars.map(b => b.high)) * 1.03
    const pStep = (maxP - minP) / rows

    const rand = seededRandom(777)
    const matrix = []

    // Liquidity pool levels (where big orders cluster)
    const pools = [39000, 42500, 44800, 52000, 58000, 64000, 68000, 71000]

    for (let col = 0; col < cols; col++) {
      const colData = []
      const closeP = prices[col]
      const recency = (col / cols) // newer = more liquidity

      for (let row = 0; row < rows; row++) {
        const priceLevel = minP + (row + 0.5) * pStep

        // Base: gaussian around current price (orders follow price)
        const dist = Math.abs(priceLevel - closeP) / (maxP - minP)
        let density = Math.exp(-dist * dist * 80) * 0.4

        // Boost at liquidity pool levels
        for (const pool of pools) {
          const poolDist = Math.abs(priceLevel - pool) / pStep
          if (poolDist < 3) {
            const poolStrength = Math.exp(-poolDist * poolDist * 0.5) * 0.6
            // Pools grow stronger when price is near
            const proxBoost = Math.exp(-Math.abs(closeP - pool) / 8000) * 0.3
            density += (poolStrength + proxBoost) * (0.5 + recency * 0.5)
          }
        }

        // Recency fade (older columns dimmer)
        density *= 0.3 + recency * 0.7

        // Random noise
        density += (rand() - 0.3) * 0.08

        colData.push(Math.max(0, Math.min(1, density)))
      }
      matrix.push(colData)
    }

    return { matrix, rows, cols, minP, maxP, pStep }
  }, [bars])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !heatData) return
    const { ctx, w, h } = setupCanvas(canvas)

    const pad = { top: 20, right: 80, bottom: 40, left: 20 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom
    const { matrix, rows, cols, minP, maxP, pStep } = heatData

    const cellW = chartW / cols
    const cellH = chartH / rows

    const priceToY = (p) => pad.top + chartH * (1 - (p - minP) / (maxP - minP))

    // Background
    ctx.fillStyle = '#08080e'
    ctx.fillRect(0, 0, w, h)

    // ── Draw heatmap cells ──
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const v = matrix[col][row]
        if (v < 0.05) continue // skip near-zero for perf
        const x = pad.left + col * cellW
        const y = pad.top + chartH - (row + 1) * cellH
        ctx.fillStyle = interpolateHeatColor(v)
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5)
      }
    }

    // ── Price line overlay ──
    ctx.beginPath()
    for (let i = 0; i < bars.length; i++) {
      const x = pad.left + (i + 0.5) * cellW
      const y = priceToY(bars[i].close)
      if (i === 0) ctx.moveTo(x, y)
      else {
        const px = pad.left + (i - 0.5) * cellW
        ctx.quadraticCurveTo((px + x) / 2, priceToY(bars[i - 1].close), x, y)
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)'
    ctx.shadowBlur = 6
    ctx.stroke()
    ctx.shadowBlur = 0

    // ── Current price horizontal line ──
    const lastPrice = bars[bars.length - 1].close
    const cpY = priceToY(lastPrice)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(pad.left, cpY)
    ctx.lineTo(w - pad.right, cpY)
    ctx.stroke()
    ctx.setLineDash([])

    // ── Y-axis price labels ──
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'left'
    const labelStep = Math.ceil((maxP - minP) / 8 / 1000) * 1000
    for (let p = Math.ceil(minP / labelStep) * labelStep; p <= maxP; p += labelStep) {
      ctx.fillText(fmtLarge(p), w - pad.right + 8, priceToY(p) + 3)
    }

    // ── X-axis time labels ──
    let lastMonth = ''
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.textAlign = 'center'
    for (let i = 0; i < bars.length; i++) {
      const m = getMonthLabel(bars[i].time)
      if (m !== lastMonth) {
        ctx.fillText(m, pad.left + (i + 0.5) * cellW, h - pad.bottom + 20)
        lastMonth = m
      }
    }

    // ── Current price badge ──
    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'
    ctx.shadowColor = 'rgba(0, 240, 255, 0.4)'
    ctx.shadowBlur = 8
    roundRect(ctx, w - pad.right + 2, cpY - 10, 70, 20, 4)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0c0c12'
    ctx.font = 'bold 11px "SF Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(fmtPrice(lastPrice), w - pad.right + 37, cpY + 4)

    // ── Legend gradient bar ──
    const legX = pad.left + 10
    const legY = pad.top + 10
    const legW = 120
    const legH = 8
    const legGrad = ctx.createLinearGradient(legX, 0, legX + legW, 0)
    legGrad.addColorStop(0, '#0f0a1a')
    legGrad.addColorStop(0.3, '#581c87')
    legGrad.addColorStop(0.6, '#06b6d4')
    legGrad.addColorStop(0.85, '#00f0ff')
    legGrad.addColorStop(1, '#ffffff')
    roundRect(ctx, legX, legY, legW, legH, 3)
    ctx.fillStyle = legGrad
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '9px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(t('aiChartsLab.low'), legX, legY + legH + 12)
    ctx.textAlign = 'right'
    ctx.fillText(t('aiChartsLab.highLiquidity'), legX + legW, legY + legH + 12)

    // ── Insight label ──
    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)'
    ctx.font = 'italic 11px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(t('aiChartsLab.liquidityInsight'), w - pad.right - 10, pad.top + 16)
  }, [bars, heatData, t, fmtLarge, fmtPrice])

  useEffect(() => {
    draw()
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return <canvas ref={canvasRef} className="acl-canvas" />
})

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const CHARTS = [
  {
    id: 'support-demand',
    titleKey: 'aiChartsLab.supportDemandTitle',
    descKey: 'aiChartsLab.supportDemandDesc',
    Component: SupportDemandChart,
  },
  {
    id: 'event-timeline',
    titleKey: 'aiChartsLab.eventTimelineTitle',
    descKey: 'aiChartsLab.eventTimelineDesc',
    Component: EventTimelineChart,
  },
  {
    id: 'liquidity-heatmap',
    titleKey: 'aiChartsLab.liquidityHeatmapTitle',
    descKey: 'aiChartsLab.liquidityHeatmapDesc',
    Component: LiquidityHeatmap,
  },
]

export default function AIChartsLabPage({ dayMode, onBack }) {
  const { t } = useTranslation()
  const bars = useMemo(() => generateMockBTCData(), [])

  return (
    <div className={`acl ${dayMode ? 'acl-day' : ''}`}>
      {/* Page header */}
      <header className="acl-header">
        <div className="acl-header-left">
          <h1 className="acl-page-title">{t('aiChartsLab.title')}</h1>
          <p className="acl-page-desc">{t('aiChartsLab.pageDesc')}</p>
        </div>
        <div className="acl-header-badge">
          <span className="acl-badge">{t('aiChartsLab.beta')}</span>
          <span className="acl-badge-token">BTC / USD</span>
        </div>
      </header>

      {/* Compare Chain / Sector / Token */}
      <CompareChart dayMode={dayMode} />

      {/* Sector Performance Chart */}
      <SectorCompareChart dayMode={dayMode} />

      {/* Chart cards */}
      {CHARTS.map(({ id, titleKey, descKey, Component }) => (
        <section key={id} className="acl-card">
          <div className="acl-card-header">
            <div className="acl-card-dot" />
            <div className="acl-card-titles">
              <h2 className="acl-card-title">{t(titleKey)}</h2>
              <p className="acl-card-desc">{t(descKey)}</p>
            </div>
          </div>
          <div className="acl-canvas-wrap">
            <Component bars={bars} />
          </div>
        </section>
      ))}
    </div>
  )
}
