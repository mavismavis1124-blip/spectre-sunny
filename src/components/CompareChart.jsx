/**
 * CompareChart — Compare Chain / Sector / Token performance
 * Two-panel layout: form (left) + Canvas line chart (right)
 * Up to 3 entities, % change over time
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchCoinsForROI, getCategories } from '../services/coinGeckoApi'
import './CompareChart.css'

/* ── Color palette for compare lines ── */
const COMPARE_COLORS = [
  { color: '#00f0ff', rgb: '0,240,255' },
  { color: '#ff6b9d', rgb: '255,107,157' },
  { color: '#34d399', rgb: '52,211,153' },
]

/* ── Static chain list ── */
const CHAINS = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'solana', name: 'Solana' },
  { id: 'bsc', name: 'BNB Chain' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'base', name: 'Base' },
  { id: 'avalanche', name: 'Avalanche' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'fantom', name: 'Fantom' },
  { id: 'sui', name: 'Sui' },
  { id: 'aptos', name: 'Aptos' },
  { id: 'sei', name: 'Sei' },
  { id: 'injective', name: 'Injective' },
  { id: 'near', name: 'NEAR' },
  { id: 'mantle', name: 'Mantle' },
  { id: 'cronos', name: 'Cronos' },
  { id: 'ton', name: 'TON' },
  { id: 'berachain', name: 'Berachain' },
  { id: 'linea', name: 'Linea' },
  { id: 'zksync', name: 'zkSync' },
  { id: 'scroll', name: 'Scroll' },
  { id: 'blast', name: 'Blast' },
  { id: 'celo', name: 'Celo' },
  { id: 'tron', name: 'Tron' },
  { id: 'cosmos', name: 'Cosmos' },
]

/* ── Type icons (SVG) ── */
const TYPE_ICONS = {
  chain: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  sector: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
  token: <><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" /></>,
}

/* ── Timeframe options ── */
const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
]

/* ── Default rows ── */
const DEFAULT_ROWS = [
  { type: 'chain', query: '', selected: null },
  { type: 'sector', query: '', selected: null },
  { type: 'token', query: '', selected: null },
]

/* ── Chart drawing helpers ── */
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
export default function CompareChart({ dayMode = false }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const rootRef = useRef(null)
  const animFrameRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [timeframe, setTimeframe] = useState(30)
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [dimensions, setDimensions] = useState({ w: 0, h: 500 })
  const [categories, setCategories] = useState([])
  const [dropdownResults, setDropdownResults] = useState({}) // keyed by row index
  const [activeDropdown, setActiveDropdown] = useState(null) // index of open dropdown
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chartHeight, setChartHeight] = useState(500)
  const resizeDragRef = useRef(null)

  // Animation refs for opacity lerp
  const entityOpacityRef = useRef([1, 1, 1])
  const entityTargetRef = useRef([1, 1, 1])
  const isAnimatingRef = useRef(false)
  const yRangeAnimRef = useRef(null)

  /* ── Fetch categories on mount ── */
  useEffect(() => {
    getCategories().then(cats => {
      if (Array.isArray(cats)) setCategories(cats)
    }).catch(() => {})
  }, [])

  /* ── Resize ── */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) {
        const h = isFullscreen ? window.innerHeight - 140 : chartHeight
        setDimensions({ w, h })
      }
    }
    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFullscreen, chartHeight])

  /* ── Resize drag handle ── */
  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = chartHeight
    const onMove = (ev) => {
      const delta = ev.clientY - startY
      setChartHeight(Math.max(300, Math.min(startH + delta, 900)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [chartHeight])

  /* ── Fullscreen ── */
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  /* ── Search handler per row ── */
  const handleSearch = useCallback((rowIdx, query) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], query }
      return next
    })
    setActiveDropdown(rowIdx)

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const row = rows[rowIdx]
    const type = row?.type || 'token'
    const q = query.trim().toLowerCase()

    if (!q) {
      setDropdownResults(prev => ({ ...prev, [rowIdx]: [] }))
      return
    }

    if (type === 'chain') {
      const results = CHAINS.filter(c => c.name.toLowerCase().includes(q) || c.id.includes(q)).slice(0, 10)
      setDropdownResults(prev => ({ ...prev, [rowIdx]: results.map(c => ({ id: c.id, name: c.name, type: 'chain' })) }))
    } else if (type === 'sector') {
      const results = categories.filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 10)
      setDropdownResults(prev => ({ ...prev, [rowIdx]: results.map(c => ({ id: c.id, name: c.name, type: 'sector' })) }))
    } else {
      // Token — debounced API search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchCoinsForROI(query)
          setDropdownResults(prev => ({ ...prev, [rowIdx]: results.map(c => ({ id: c.id, name: `${c.name} (${c.symbol})`, type: 'token' })) }))
        } catch {
          setDropdownResults(prev => ({ ...prev, [rowIdx]: [] }))
        }
      }, 250)
    }
  }, [rows, categories])

  /* ── Select item from dropdown ── */
  const handleSelect = useCallback((rowIdx, item) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], query: item.name, selected: item }
      return next
    })
    setActiveDropdown(null)
    setDropdownResults(prev => ({ ...prev, [rowIdx]: [] }))
  }, [])

  /* ── Clear item ── */
  const handleClear = useCallback((rowIdx) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], query: '', selected: null }
      return next
    })
  }, [])

  /* ── Add row ── */
  const handleAddRow = useCallback(() => {
    if (rows.length >= 3) return
    setRows(prev => [...prev, { type: 'token', query: '', selected: null }])
  }, [rows.length])

  /* ── Remove row ── */
  const handleRemoveRow = useCallback((rowIdx) => {
    if (rows.length <= 1) return
    setRows(prev => prev.filter((_, i) => i !== rowIdx))
  }, [rows.length])

  /* ── Change row type ── */
  const handleTypeChange = useCallback((rowIdx, type) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { type, query: '', selected: null }
      return next
    })
    setDropdownResults(prev => ({ ...prev, [rowIdx]: [] }))
  }, [])

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.compare-row-input-wrap')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Fetch chart data when selections change ── */
  // Derive a stable key so fetch only triggers when actual selections change
  const fetchKey = useMemo(() => {
    const selected = rows.filter(r => r.selected).map(r => `${r.selected.type}:${r.selected.id}`)
    return selected.length > 0 ? selected.join('|') + '|' + timeframe : ''
  }, [rows, timeframe])

  useEffect(() => {
    if (!fetchKey) {
      setChartData(null)
      return
    }
    const selected = rows.filter(r => r.selected).map(r => r.selected)
    let cancelled = false
    setLoading(true)

    const entities = selected.map(s => ({ type: s.type, id: s.id, name: s.name }))
    const url = `/api/compare/chart?entities=${encodeURIComponent(JSON.stringify(entities))}&days=${timeframe}`

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { if (!cancelled) { setChartData(data); setLoading(false) } })
      .catch(err => {
        console.warn('Compare chart fetch error:', err.message)
        if (!cancelled) { setChartData(null); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Chart layout ── */
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  const PAD = useMemo(() => ({ top: 16, right: 80, bottom: 36, left: 16 }), [])
  const chart = useMemo(() => ({
    x: PAD.left, y: PAD.top,
    w: dimensions.w - PAD.left - PAD.right,
    h: dimensions.h - PAD.top - PAD.bottom,
  }), [dimensions, PAD])

  /* ── Y range — use true min/max so no lines go out of bounds ── */
  const targetYRange = useMemo(() => {
    if (!chartData?.entities) return { min: -5, max: 5 }
    let lo = Infinity, hi = -Infinity
    chartData.entities.forEach(ent => {
      if (!ent.data?.length) return
      ent.data.forEach(p => { if (p.pct < lo) lo = p.pct; if (p.pct > hi) hi = p.pct })
    })
    if (!isFinite(lo)) return { min: -5, max: 5 }
    const range = hi - lo || 4
    return { min: lo - range * 0.1, max: hi + range * 0.1 }
  }, [chartData])

  /* ── Timestamps ── */
  const xTs = useMemo(() => {
    if (!chartData?.entities) return []
    const all = new Set()
    chartData.entities.forEach(ent => ent.data?.forEach(p => all.add(p.ts)))
    return [...all].sort((a, b) => a - b)
  }, [chartData])

  const mapX = useCallback(ts => {
    if (xTs.length < 2) return chart.x
    const f = xTs[0], l = xTs[xTs.length - 1]
    return chart.x + ((ts - f) / (l - f || 1)) * chart.w
  }, [xTs, chart])

  /* ── Draw frame ── */
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.w === 0) return

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

    // Interpolate Y range
    if (!yRangeAnimRef.current) {
      yRangeAnimRef.current = { min: targetYRange.min, max: targetYRange.max }
    }
    const yr = yRangeAnimRef.current
    let needsAnim = false
    const LERP = 0.08
    const dyMin = targetYRange.min - yr.min
    const dyMax = targetYRange.max - yr.max
    if (Math.abs(dyMin) > 0.01 || Math.abs(dyMax) > 0.01) {
      yr.min += dyMin * LERP
      yr.max += dyMax * LERP
      needsAnim = true
    } else {
      yr.min = targetYRange.min
      yr.max = targetYRange.max
    }

    const mapY = pct => chart.y + chart.h - ((pct - yr.min) / (yr.max - yr.min)) * chart.h

    // No data empty state
    if (!chartData?.entities?.length || !xTs.length) {
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'
      ctx.font = '14px Inter, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Select items to compare', w / 2, h / 2)
      return
    }

    // Grid
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

    // Zero line
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

    // X-axis
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

    // Clip to chart area
    ctx.save()
    ctx.beginPath()
    ctx.rect(chart.x, chart.y, chart.w, chart.h)
    ctx.clip()

    // Draw entity lines
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.setLineDash([])

    chartData.entities.forEach((ent, idx) => {
      if (!ent.data?.length) return
      const sc = COMPARE_COLORS[idx % COMPARE_COLORS.length]

      // Glow
      ctx.beginPath()
      ent.data.forEach((pt, i) => {
        const x = mapX(pt.ts), y = mapY(pt.pct)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = `rgba(${sc.rgb}, 0.25)`
      ctx.lineWidth = 5
      ctx.stroke()

      // Main line
      ctx.beginPath()
      ent.data.forEach((pt, i) => {
        const x = mapX(pt.ts), y = mapY(pt.pct)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = sc.color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // End dot
      const last = ent.data[ent.data.length - 1]
      const ex = mapX(last.ts), ey = mapY(last.pct)
      ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${sc.rgb}, 0.2)`; ctx.fill()
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2)
      ctx.fillStyle = sc.color; ctx.fill()
    })

    ctx.restore()

    // End-of-line price labels (right side, outside clip)
    chartData.entities.forEach((ent, idx) => {
      if (!ent.data?.length) return
      const sc = COMPARE_COLORS[idx % COMPARE_COLORS.length]
      const last = ent.data[ent.data.length - 1]
      const ey = mapY(last.pct)
      // Clamp Y so label doesn't go outside chart vertically
      const labelY = Math.max(chart.y + 8, Math.min(ey, chart.y + chart.h - 8))
      const labelX = chart.x + chart.w + 6
      const pctText = `${last.pct >= 0 ? '+' : ''}${last.pct.toFixed(1)}%`

      ctx.font = `700 10px 'SF Mono', monospace`
      const tw = ctx.measureText(pctText).width
      const lblW = tw + 10
      const lblH = 18

      // Badge background
      ctx.beginPath()
      const bx = labelX, by = labelY - lblH / 2
      const br = 4
      ctx.moveTo(bx + br, by)
      ctx.lineTo(bx + lblW - br, by)
      ctx.quadraticCurveTo(bx + lblW, by, bx + lblW, by + br)
      ctx.lineTo(bx + lblW, by + lblH - br)
      ctx.quadraticCurveTo(bx + lblW, by + lblH, bx + lblW - br, by + lblH)
      ctx.lineTo(bx + br, by + lblH)
      ctx.quadraticCurveTo(bx, by + lblH, bx, by + lblH - br)
      ctx.lineTo(bx, by + br)
      ctx.quadraticCurveTo(bx, by, bx + br, by)
      ctx.closePath()
      ctx.fillStyle = `rgba(${sc.rgb}, 0.18)`
      ctx.fill()
      ctx.strokeStyle = `rgba(${sc.rgb}, 0.4)`
      ctx.lineWidth = 1
      ctx.stroke()

      // Badge text
      ctx.fillStyle = sc.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pctText, bx + lblW / 2, labelY)

      // Connecting dashed line from chart edge to badge
      ctx.save()
      ctx.setLineDash([2, 2])
      ctx.strokeStyle = `rgba(${sc.rgb}, 0.3)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(chart.x + chart.w, ey)
      ctx.lineTo(labelX, labelY)
      ctx.stroke()
      ctx.restore()
    })

    // Hover crosshair
    if (hoverInfo?.ts != null) {
      const hx = mapX(hoverInfo.ts)
      const isDarkMode = !dayMode
      const vGrad = ctx.createLinearGradient(0, chart.y, 0, chart.y + chart.h)
      vGrad.addColorStop(0, isDarkMode ? 'rgba(139,92,246,0)' : 'rgba(139,92,246,0)')
      vGrad.addColorStop(0.3, isDarkMode ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)')
      vGrad.addColorStop(0.7, isDarkMode ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)')
      vGrad.addColorStop(1, isDarkMode ? 'rgba(139,92,246,0)' : 'rgba(139,92,246,0)')
      ctx.strokeStyle = vGrad
      ctx.lineWidth = 1.5
      ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(hx, chart.y); ctx.lineTo(hx, chart.y + chart.h); ctx.stroke()

      // Dots on lines
      chartData.entities.forEach((ent, idx) => {
        if (!ent.data?.length) return
        const sc = COMPARE_COLORS[idx % COMPARE_COLORS.length]
        let closest = ent.data[0], minD = Infinity
        ent.data.forEach(pt => { const d = Math.abs(pt.ts - hoverInfo.ts); if (d < minD) { minD = d; closest = pt } })
        const dx = mapX(closest.ts), dy = mapY(closest.pct)
        ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${sc.rgb}, 0.35)`; ctx.fill()
        ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2)
        ctx.fillStyle = sc.color; ctx.fill()
        ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'; ctx.fill()
      })
    }

    // Watermark
    ctx.save()
    ctx.globalAlpha = isDark ? 0.025 : 0.04
    ctx.font = `italic 500 42px 'Playfair Display', serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isDark ? '#fff' : '#000'
    ctx.fillText('Spectre AI', w / 2, h / 2)
    ctx.restore()

    isAnimatingRef.current = needsAnim
    if (needsAnim) {
      animFrameRef.current = requestAnimationFrame(drawFrame)
    }
  }, [chartData, dimensions, dpr, dayMode, hoverInfo, chart, mapX, targetYRange, xTs])

  // Kick animation loop
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(drawFrame)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [drawFrame])

  /* ── Mouse hover ── */
  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current
    if (!canvas || !xTs.length) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    if (mx < chart.x || mx > chart.x + chart.w || my < chart.y || my > chart.y + chart.h) { setHoverInfo(null); return }
    const f = xTs[0], l = xTs[xTs.length - 1]
    const ts = f + ((mx - chart.x) / chart.w) * (l - f || 1)
    const values = {}
    chartData?.entities?.forEach((ent, idx) => {
      if (!ent.data?.length) return
      let cl = ent.data[0], md = Infinity
      ent.data.forEach(pt => { const d = Math.abs(pt.ts - ts); if (d < md) { md = d; cl = pt } })
      values[idx] = { name: ent.name, pct: cl.pct, color: COMPARE_COLORS[idx % COMPARE_COLORS.length].color }
    })
    setHoverInfo({ ts, x: mx, y: my, values })
  }, [xTs, chart, chartData])

  const handleMouseLeave = useCallback(() => setHoverInfo(null), [])

  /* ── Render ── */
  return (
    <div className={`compare-chart ${dayMode ? 'day-mode' : ''} ${isFullscreen ? 'fullscreen' : ''}`} ref={rootRef}>
      {/* Header */}
      <div className="compare-header">
        <div className="compare-header-left">
          <span className="compare-dot" />
          <div className="compare-titles">
            <h2 className="compare-title">Compare Chain / Sector / Token</h2>
            <p className="compare-subtitle">For compare, enter the Network, Sector and Token in the fields below</p>
          </div>
        </div>
        <div className="compare-header-right">
          {/* Timeframe pills */}
          <div className="compare-timeframes">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.days}
                className={`compare-tf-btn ${timeframe === tf.days ? 'active' : ''}`}
                onClick={() => setTimeframe(tf.days)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button className="compare-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? (
                <><polyline points="4 14 8 14 8 18" /><polyline points="20 10 16 10 16 6" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>
              ) : (
                <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="compare-body">
        {/* Left — Form */}
        <div className="compare-form">
          {rows.map((row, idx) => (
            <div key={idx} className="compare-row">
              <div className="compare-row-type">
                <span className="compare-row-icon" style={{ color: COMPARE_COLORS[idx % COMPARE_COLORS.length].color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {TYPE_ICONS[row.type]}
                  </svg>
                </span>
                <div className="compare-type-pills">
                  {['chain', 'sector', 'token'].map(t => (
                    <button
                      key={t}
                      className={`compare-type-pill ${row.type === t ? 'active' : ''}`}
                      onClick={() => handleTypeChange(idx, t)}
                      style={row.type === t ? { borderColor: `rgba(${COMPARE_COLORS[idx % COMPARE_COLORS.length].rgb}, 0.3)` } : undefined}
                    >
                      {t === 'chain' ? 'Chain' : t === 'sector' ? 'Sector' : 'Token'}
                    </button>
                  ))}
                </div>
                {rows.length > 1 && (
                  <button className="compare-row-remove" onClick={() => handleRemoveRow(idx)} title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
              <div className="compare-row-input-wrap">
                <input
                  className="compare-row-input"
                  type="text"
                  placeholder={`Enter the ${row.type} name`}
                  value={row.query}
                  onChange={e => handleSearch(idx, e.target.value)}
                  onFocus={() => { if (row.query) handleSearch(idx, row.query) }}
                />
                {row.selected && (
                  <button className="compare-row-clear" onClick={() => handleClear(idx)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
                {/* Dropdown */}
                {activeDropdown === idx && dropdownResults[idx]?.length > 0 && (
                  <div className="compare-dropdown">
                    {dropdownResults[idx].map((item, i) => (
                      <button
                        key={`${item.id}-${i}`}
                        className="compare-dropdown-item"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(idx, item) }}
                      >
                        <span className="compare-dropdown-name">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {rows.length < 3 && (
            <button className="compare-add-btn" onClick={handleAddRow}>
              + Add Token (max 3 Tokens)
            </button>
          )}
        </div>

        {/* Right — Chart */}
        <div className="compare-chart-area">
          {/* Legend */}
          {chartData?.entities?.length > 0 && (
            <div className="compare-legend">
              {chartData.entities.map((ent, idx) => {
                const sc = COMPARE_COLORS[idx % COMPARE_COLORS.length]
                const last = ent.data?.[ent.data.length - 1]
                return (
                  <div key={ent.id} className="compare-legend-item">
                    <span className="compare-legend-dot" style={{ background: sc.color }} />
                    <span className="compare-legend-name">{ent.name}</span>
                    {last && (
                      <span className="compare-legend-toggle" style={{ background: `rgba(${sc.rgb}, 0.15)` }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="compare-canvas-container" ref={containerRef} style={{ height: `${chartHeight}px` }}>
            {loading && (
              <div className="compare-loading-overlay">
                <div className="compare-loading-ring" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="compare-canvas"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />

            {/* Tooltip */}
            {hoverInfo && Object.keys(hoverInfo.values).length > 0 && (
              <div
                className="compare-tooltip"
                style={{
                  left: Math.min(
                    Math.max(8, hoverInfo.x > dimensions.w * 0.6 ? hoverInfo.x - 190 : hoverInfo.x + 16),
                    dimensions.w - 200
                  ),
                  top: Math.min(Math.max(hoverInfo.y - 20, 8), dimensions.h - 100),
                }}
              >
                <div className="compare-tooltip-header">{formatDateTime(hoverInfo.ts)}</div>
                <div className="compare-tooltip-sep" />
                {Object.entries(hoverInfo.values)
                  .sort((a, b) => b[1].pct - a[1].pct)
                  .map(([key, val]) => (
                    <div key={key} className="compare-tooltip-row">
                      <span className="compare-tooltip-color" style={{ background: val.color }} />
                      <span className="compare-tooltip-name">{val.name}</span>
                      <span className={`compare-tooltip-val ${val.pct >= 0 ? 'up' : 'dn'}`}>
                        {val.pct >= 0 ? '+' : ''}{val.pct.toFixed(2)}%
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Sector Chart title */}
          <div className="compare-chart-label">
            <span className="compare-chart-label-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            Sector Chart ({TIMEFRAMES.find(t => t.days === timeframe)?.label || '1M'})
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div className="compare-resize-handle" onMouseDown={handleResizeStart}>
        <div className="compare-resize-grip" />
      </div>
    </div>
  )
}
