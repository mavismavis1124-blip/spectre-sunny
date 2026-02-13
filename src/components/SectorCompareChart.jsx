/**
 * SectorCompareChart – Cinematic multi-line sector performance chart
 * Full-width canvas, neon glow lines, smooth animated transitions
 * Data: charts-277369611639.us-central1.run.app/price_line_sect
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import './SectorCompareChart.css'

/* ── Sector colors (vibrant neon palette) ── */
const SECTOR_COLORS = {
  MEME:    { color: '#ff6b9d', rgb: '255,107,157', glow: '#ff6b9d' },
  L1:      { color: '#00f0ff', rgb: '0,240,255',   glow: '#00f0ff' },
  DEFI:    { color: '#a78bfa', rgb: '167,139,250', glow: '#a78bfa' },
  L2:      { color: '#f0abfc', rgb: '240,171,252', glow: '#f0abfc' },
  GAMING:  { color: '#fbbf24', rgb: '251,191,36',  glow: '#fbbf24' },
  AI:      { color: '#34d399', rgb: '52,211,153',  glow: '#34d399' },
  PRIVACY: { color: '#f87171', rgb: '248,113,113', glow: '#f87171' },
}

/* ── Sector icons (SVG paths) ── */
const SECTOR_ICONS = {
  MEME:    <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>,
  L1:      <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" /></>,
  DEFI:    <><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" /></>,
  L2:      <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></>,
  GAMING:  <><rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><circle cx="15" cy="11" r="1" /><circle cx="18" cy="13" r="1" /></>,
  AI:      <><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /><line x1="10" y1="21" x2="14" y2="21" /></>,
  PRIVACY: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
}

const SECTOR_ORDER = ['MEME', 'L1', 'DEFI', 'L2', 'GAMING', 'AI', 'PRIVACY']

/* ── API endpoint (proxied through backend) ── */
const SECTOR_API = 'http://localhost:3001/api/sector/lines'

/* ── Easing ── */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

/* ── Fallback mock data ── */
function generateMockData() {
  const now = Math.floor(Date.now() / 1000)
  const points = 168
  const data = []
  const tokens = {
    MEME:    [{ s: 'DOGE', p: 0.08 }, { s: 'SHIB', p: 0.000012 }, { s: 'PEPE', p: 0.0000045 }, { s: 'BONK', p: 0.000007 }],
    L1:      [{ s: 'BTC', p: 76000 }, { s: 'ETH', p: 2300 }, { s: 'SOL', p: 140 }, { s: 'AVAX', p: 22 }],
    DEFI:    [{ s: 'AAVE', p: 130 }, { s: 'UNI', p: 6.5 }, { s: 'MKR', p: 1500 }, { s: 'CRV', p: 0.45 }],
    L2:      [{ s: 'ARB', p: 0.35 }, { s: 'OP', p: 0.9 }, { s: 'POL', p: 0.2 }, { s: 'STRK', p: 0.15 }],
    GAMING:  [{ s: 'AXS', p: 3.5 }, { s: 'GALA', p: 0.015 }, { s: 'SAND', p: 0.28 }, { s: 'RONIN', p: 0.9 }],
    AI:      [{ s: 'FET', p: 0.5 }, { s: 'RENDER', p: 3.8 }, { s: 'TAO', p: 280 }, { s: 'NEAR', p: 2.5 }],
    PRIVACY: [{ s: 'XMR', p: 220 }, { s: 'ZEC', p: 28 }, { s: 'DASH', p: 22 }, { s: 'SCRT', p: 0.18 }],
  }
  const drifts = {}
  SECTOR_ORDER.forEach(sec => {
    drifts[sec] = []
    let d = 0
    for (let i = 0; i < points; i++) {
      d += (Math.random() - 0.52) * 0.8
      d = Math.max(-30, Math.min(15, d))
      drifts[sec].push(d)
    }
  })
  for (let i = 0; i < points; i++) {
    const ts = now - (points - i) * 3600
    SECTOR_ORDER.forEach(sec => {
      tokens[sec].forEach(t => {
        const pct = (drifts[sec][i] + (Math.random() - 0.5) * 2) / 100
        data.push([ts, t.s, t.p * (1 + pct), sec])
      })
    })
  }
  return data
}

/* ── Aggregate raw → sector % lines ── */
function aggregateSectorData(rawData) {
  const sectorTokens = {}
  rawData.forEach(([ts, sym, price, sector]) => {
    if (!sector || !price) return
    if (!sectorTokens[sector]) sectorTokens[sector] = {}
    if (!sectorTokens[sector][sym]) sectorTokens[sector][sym] = []
    sectorTokens[sector][sym].push({ ts, price })
  })
  const sectorLines = {}
  const allTs = new Set()
  Object.entries(sectorTokens).forEach(([sector, tokens]) => {
    const tokenPcts = {}
    Object.entries(tokens).forEach(([sym, series]) => {
      series.sort((a, b) => a.ts - b.ts)
      const base = series[0].price
      if (base <= 0) return
      tokenPcts[sym] = series.map(pt => ({ ts: pt.ts, pct: ((pt.price - base) / base) * 100 }))
      series.forEach(pt => allTs.add(pt.ts))
    })
    const timeMap = {}
    Object.values(tokenPcts).forEach(s => s.forEach(({ ts, pct }) => {
      if (!timeMap[ts]) timeMap[ts] = []
      timeMap[ts].push(pct)
    }))
    const sorted = Object.keys(timeMap).map(Number).sort((a, b) => a - b)
    sectorLines[sector] = sorted.map(ts => ({ ts, pct: timeMap[ts].reduce((a, b) => a + b, 0) / timeMap[ts].length }))
  })
  return { sectorLines, timestamps: [...allTs].sort((a, b) => a - b) }
}

function formatDate(ts) {
  const d = new Date(ts * 1000)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDateTime(ts) {
  const d = new Date(ts * 1000)
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${m[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/* ═══ COMPONENT ═══ */
const SectorCompareChart = ({ dayMode = false }) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rootRef = useRef(null)
  const animFrameRef = useRef(null)
  const [sectorData, setSectorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enabledSectors, setEnabledSectors] = useState(() => {
    const m = {}; SECTOR_ORDER.forEach(s => { m[s] = true }); return m
  })
  const [hoverInfo, setHoverInfo] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dimensions, setDimensions] = useState({ w: 0, h: 500 })

  // ── Animation state (per-sector opacity + y-range interpolation) ──
  const sectorOpacityRef = useRef({})
  const sectorTargetRef = useRef({})
  const yRangeAnimRef = useRef(null) // null = not initialized, snap on first data
  const isAnimatingRef = useRef(false)
  const hasInitializedYRange = useRef(false)

  // Initialize opacity refs
  useEffect(() => {
    SECTOR_ORDER.forEach(s => {
      if (sectorOpacityRef.current[s] === undefined) {
        sectorOpacityRef.current[s] = 1
        sectorTargetRef.current[s] = 1
      }
    })
  }, [])

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch(SECTOR_API)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        const raw = j.d || j.data || j
        if (!Array.isArray(raw) || !raw.length) throw new Error('Empty')
        if (!cancelled) { setSectorData(aggregateSectorData(raw)); setLoading(false) }
      } catch (e) {
        console.warn('Sector API failed, using mock:', e.message)
        if (!cancelled) { setSectorData(aggregateSectorData(generateMockData())); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [])

  /* ── Fullscreen ── */
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /* ── Resize — re-run when loading finishes (container mounts) or fullscreen changes ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) {
        const h = isFullscreen ? window.innerHeight - 140 : 500
        setDimensions({ w, h })
      }
    }
    measure() // sync read — no flash of wrong size
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFullscreen, loading])

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  const PAD = useMemo(() => ({ top: 16, right: 64, bottom: 36, left: 16 }), [])
  const chart = useMemo(() => ({
    x: PAD.left, y: PAD.top,
    w: dimensions.w - PAD.left - PAD.right,
    h: dimensions.h - PAD.top - PAD.bottom,
  }), [dimensions, PAD])

  // All sector lines (including disabled — we need them for animation)
  const allLines = useMemo(() => {
    if (!sectorData) return {}
    const r = {}
    SECTOR_ORDER.forEach(s => { if (sectorData.sectorLines[s]) r[s] = sectorData.sectorLines[s] })
    return r
  }, [sectorData])

  // Target Y range — use median-anchored range so the bulk of data fills the frame
  // Early 0% baseline points that fall outside will be clipped cleanly by canvas clip rect
  const targetYRange = useMemo(() => {
    const allPcts = []
    SECTOR_ORDER.forEach(s => {
      if (!enabledSectors[s] || !allLines[s]) return
      allLines[s].forEach(p => allPcts.push(p.pct))
    })
    if (!allPcts.length) return { min: -5, max: 5 }
    allPcts.sort((a, b) => a - b)
    // Use p3 and p97 — trims the extreme baseline start and any spike outliers
    const lo = allPcts[Math.floor(allPcts.length * 0.03)]
    const hi = allPcts[Math.floor(allPcts.length * 0.97)]
    const range = hi - lo || 4
    return { min: lo - range * 0.08, max: hi + range * 0.08 }
  }, [allLines, enabledSectors])

  const xTs = useMemo(() => sectorData?.timestamps || [], [sectorData])

  const mapX = useCallback(ts => {
    if (xTs.length < 2) return chart.x
    const f = xTs[0], l = xTs[xTs.length - 1]
    return chart.x + ((ts - f) / (l - f || 1)) * chart.w
  }, [xTs, chart])

  /* ── Animated draw loop ── */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !sectorData || dimensions.w === 0) return

    // ── Interpolate per-sector opacities ──
    let needsAnim = false
    const LERP_SPEED = 0.08
    SECTOR_ORDER.forEach(s => {
      const target = sectorTargetRef.current[s] ?? 1
      const current = sectorOpacityRef.current[s] ?? 1
      if (Math.abs(target - current) > 0.005) {
        sectorOpacityRef.current[s] = current + (target - current) * LERP_SPEED
        needsAnim = true
      } else {
        sectorOpacityRef.current[s] = target
      }
    })

    // ── Interpolate Y range (snap on first data, lerp after) ──
    if (!yRangeAnimRef.current || !hasInitializedYRange.current) {
      yRangeAnimRef.current = { min: targetYRange.min, max: targetYRange.max }
      hasInitializedYRange.current = true
    }
    const yr = yRangeAnimRef.current
    const dyMin = targetYRange.min - yr.min
    const dyMax = targetYRange.max - yr.max
    if (Math.abs(dyMin) > 0.01 || Math.abs(dyMax) > 0.01) {
      yr.min += dyMin * LERP_SPEED
      yr.max += dyMax * LERP_SPEED
      needsAnim = true
    } else {
      yr.min = targetYRange.min
      yr.max = targetYRange.max
    }

    const mapY = pct => chart.y + chart.h - ((pct - yr.min) / (yr.max - yr.min)) * chart.h

    const ctx = canvas.getContext('2d')
    const { w, h } = dimensions

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const isDark = !dayMode
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
    const textColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)'
    const zeroColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'

    // ── Grid ──
    const steps = 8
    const yStep = (yr.max - yr.min) / steps
    ctx.font = `500 11px 'SF Mono', 'Fira Code', monospace`
    for (let i = 0; i <= steps; i++) {
      const val = yr.min + yStep * i
      const y = mapY(val)
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(chart.x, y); ctx.lineTo(chart.x + chart.w, y); ctx.stroke()
      ctx.fillStyle = textColor
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${val >= 0 ? '+' : ''}${val.toFixed(0)}%`, chart.x + chart.w + 10, y)
    }

    // ── Zero line ──
    const zy = mapY(0)
    if (zy >= chart.y && zy <= chart.y + chart.h) {
      ctx.strokeStyle = zeroColor
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath(); ctx.moveTo(chart.x, zy); ctx.lineTo(chart.x + chart.w, zy); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
      ctx.font = `700 11px 'SF Mono', monospace`
      ctx.textAlign = 'left'
      ctx.fillText('0%', chart.x + chart.w + 10, zy)
    }

    // ── X-axis ──
    if (xTs.length > 0) {
      const count = Math.min(14, Math.floor(chart.w / 80))
      const step = Math.max(1, Math.floor(xTs.length / count))
      ctx.fillStyle = textColor
      ctx.font = `500 10px 'SF Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (let i = 0; i < xTs.length; i += step) {
        const x = mapX(xTs[i])
        ctx.strokeStyle = gridColor
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, chart.y + chart.h); ctx.lineTo(x, chart.y + chart.h + 6); ctx.stroke()
        ctx.fillText(formatDate(xTs[i]), x, chart.y + chart.h + 10)
      }
    }

    // ── Clip to chart area so out-of-range lines are hidden cleanly ──
    ctx.save()
    ctx.beginPath()
    ctx.rect(chart.x, chart.y, chart.w, chart.h)
    ctx.clip()

    // ── Sector lines with animated opacity ──
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.setLineDash([])

    SECTOR_ORDER.forEach(sector => {
      const line = allLines[sector]
      if (!line || line.length < 2) return
      const sc = SECTOR_COLORS[sector]
      if (!sc) return
      const opacity = sectorOpacityRef.current[sector] ?? 0
      if (opacity < 0.005) return  // fully hidden, skip

      ctx.save()
      ctx.globalAlpha = opacity

      // Glow layer
      ctx.beginPath()
      line.forEach((pt, i) => { const x = mapX(pt.ts), y = mapY(pt.pct); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
      ctx.strokeStyle = `rgba(${sc.rgb}, 0.25)`
      ctx.lineWidth = 5
      ctx.stroke()

      // Main line
      ctx.beginPath()
      line.forEach((pt, i) => { const x = mapX(pt.ts), y = mapY(pt.pct); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
      ctx.strokeStyle = sc.color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // End dot
      const last = line[line.length - 1]
      const ex = mapX(last.ts), ey = mapY(last.pct)
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${sc.rgb}, 0.2)`; ctx.fill()
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2)
      ctx.fillStyle = sc.color; ctx.fill()

      // Sector label at end
      ctx.fillStyle = sc.color
      ctx.font = `600 9px 'SF Mono', 'Fira Code', monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const labelX = ex + 10
      if (labelX < chart.x + chart.w - 20) {
        ctx.fillText(sector, labelX, ey)
      }

      ctx.restore()
    })

    // ── End clip region ──
    ctx.restore()

    // ── Hover crosshair ──
    if (hoverInfo?.ts != null) {
      const hx = mapX(hoverInfo.ts)
      const vGrad = ctx.createLinearGradient(0, chart.y, 0, chart.y + chart.h)
      vGrad.addColorStop(0, isDark ? 'rgba(139,92,246,0)' : 'rgba(139,92,246,0)')
      vGrad.addColorStop(0.3, isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)')
      vGrad.addColorStop(0.7, isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)')
      vGrad.addColorStop(1, isDark ? 'rgba(139,92,246,0)' : 'rgba(139,92,246,0)')
      ctx.strokeStyle = vGrad
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(hx, chart.y); ctx.lineTo(hx, chart.y + chart.h); ctx.stroke()

      // Dots on visible lines only
      SECTOR_ORDER.forEach(sector => {
        const line = allLines[sector]
        if (!line) return
        const opacity = sectorOpacityRef.current[sector] ?? 0
        if (opacity < 0.1) return
        const sc = SECTOR_COLORS[sector]
        if (!sc) return
        let closest = line[0], minD = Infinity
        line.forEach(pt => { const d = Math.abs(pt.ts - hoverInfo.ts); if (d < minD) { minD = d; closest = pt } })
        const dx = mapX(closest.ts), dy = mapY(closest.pct)
        ctx.save()
        ctx.globalAlpha = opacity
        ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sc.rgb}, 0.35)`; ctx.fill()
        ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2)
        ctx.fillStyle = sc.color; ctx.fill()
        ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'; ctx.fill()
        ctx.restore()
      })
    }

    // ── Watermark ──
    ctx.save()
    ctx.globalAlpha = isDark ? 0.025 : 0.04
    ctx.font = `italic 500 42px 'Playfair Display', serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? '#fff' : '#000'
    ctx.fillText('Spectre AI', w / 2, h / 2)
    ctx.restore()

    // Continue animation loop if needed
    isAnimatingRef.current = needsAnim
    if (needsAnim) {
      animFrameRef.current = requestAnimationFrame(drawFrame)
    }
  }, [sectorData, allLines, dimensions, dpr, dayMode, hoverInfo, chart, mapX, targetYRange, xTs])

  // Kick the animation loop when drawFrame deps change
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(drawFrame)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [drawFrame])

  /* ── Mouse ── */
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current
    if (!canvas || !xTs.length) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    if (mx < chart.x || mx > chart.x + chart.w || my < chart.y || my > chart.y + chart.h) { setHoverInfo(null); return }
    const f = xTs[0], l = xTs[xTs.length - 1]
    const ts = f + ((mx - chart.x) / chart.w) * (l - f || 1)
    const values = {}
    SECTOR_ORDER.forEach(sec => {
      const line = allLines[sec]
      if (!line || (sectorOpacityRef.current[sec] ?? 0) < 0.1) return
      let cl = line[0], md = Infinity
      line.forEach(pt => { const d = Math.abs(pt.ts - ts); if (d < md) { md = d; cl = pt } })
      values[sec] = cl.pct
    })
    setHoverInfo({ ts, x: mx, y: my, values })
  }, [xTs, chart, allLines])

  const handleMouseLeave = useCallback(() => setHoverInfo(null), [])

  const toggleSector = useCallback(sec => {
    setEnabledSectors(prev => {
      const next = { ...prev, [sec]: !prev[sec] }
      // Must keep at least one enabled
      if (!Object.values(next).some(Boolean)) return prev
      // Set animation targets
      SECTOR_ORDER.forEach(s => {
        sectorTargetRef.current[s] = next[s] ? 1 : 0
      })
      // Kick animation loop
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = requestAnimationFrame(drawFrame)
      }
      return next
    })
  }, [drawFrame])

  /* ── Render ── */
  if (loading) return (
    <div className="sector-compare-root">
      <div className="sector-compare-loading">
        <div className="sector-compare-loading-ring" />
        <span>Loading sector data…</span>
      </div>
    </div>
  )

  return (
    <div className={`sector-compare-root ${dayMode ? 'day-mode' : ''} ${isFullscreen ? 'fullscreen' : ''}`} ref={rootRef}>
      {/* Header */}
      <div className="sector-compare-header">
        <div className="sector-compare-header-left">
          <span className="sector-compare-dot" />
          <div className="sector-compare-titles">
            <h2 className="sector-compare-title">Sector Performance</h2>
            <p className="sector-compare-subtitle">Relative % change across 7 crypto sectors · averaged per token</p>
          </div>
        </div>
        <div className="sector-compare-header-right">
          <span className="sector-compare-live-dot" />
          <span className="sector-compare-live-text">LIVE</span>
          <button className="sector-compare-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 8 14 8 18" />
                <polyline points="20 10 16 10 16 6" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Sector pills with icons */}
      <div className="sector-compare-pills">
        {SECTOR_ORDER.map(sec => {
          const sc = SECTOR_COLORS[sec]
          const on = enabledSectors[sec]
          const last = allLines[sec]?.[allLines[sec]?.length - 1]?.pct
          return (
            <button
              key={sec}
              className={`sc-pill ${on ? 'on' : ''}`}
              onClick={() => toggleSector(sec)}
              style={{ '--sc': sc.color, '--scr': sc.rgb }}
            >
              <span className="sc-pill-accent" />
              <span className="sc-pill-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {SECTOR_ICONS[sec]}
                </svg>
              </span>
              <span className="sc-pill-name">{sec}</span>
              {on && last != null && (
                <span className={`sc-pill-pct ${last >= 0 ? 'up' : 'dn'}`}>
                  {last >= 0 ? '+' : ''}{last.toFixed(1)}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Canvas */}
      <div className="sector-compare-canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="sector-compare-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {hoverInfo && (
          <div
            className="sc-tooltip"
            style={{
              left: hoverInfo.x > dimensions.w * 0.65 ? hoverInfo.x - 180 : hoverInfo.x + 16,
              top: Math.max(hoverInfo.y - 20, 8),
            }}
          >
            <div className="sc-tooltip-header">{formatDateTime(hoverInfo.ts)}</div>
            <div className="sc-tooltip-sep" />
            {Object.entries(hoverInfo.values)
              .sort((a, b) => b[1] - a[1])
              .map(([sec, pct]) => (
                <div key={sec} className="sc-tooltip-row">
                  <span className="sc-tooltip-color" style={{ background: SECTOR_COLORS[sec]?.color }} />
                  <span className="sc-tooltip-name">{sec}</span>
                  <span className={`sc-tooltip-val ${pct >= 0 ? 'up' : 'dn'}`}>
                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

export default SectorCompareChart
