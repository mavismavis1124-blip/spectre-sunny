/**
 * AIMarketAnalysisPage — Full-page AI Market Analysis dashboard
 * Macro/micro analysis with live data, canvas sparklines, and computed signals
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCuratedTokenPrices, useBinanceTopCoinPrices } from '../hooks/useCodexData'
import { COINGECKO_LOGOS } from '../constants/majorTokens'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import { useCurrency } from '../hooks/useCurrency'
import './AIMarketAnalysisPage.css'

const TOP_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'LINK', 'UNI', 'ARB', 'OP', 'MATIC']

const formatPct = (pct) => {
  if (pct == null || isNaN(pct)) return '—'
  const sign = pct >= 0 ? '+' : ''
  return sign + pct.toFixed(1) + '%'
}

const AIMarketAnalysisPage = ({ dayMode, onBack }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()

  // ─── Live price data ───
  const { prices: geckoData } = useCuratedTokenPrices(TOP_SYMBOLS, 60000)
  const { prices: binanceData } = useBinanceTopCoinPrices(TOP_SYMBOLS, 5000)

  // Merge: Binance real-time price + CoinGecko enriched data (marketCap, 7d, sparkline)
  const prices = useMemo(() => {
    const merged = { ...geckoData }
    Object.keys(binanceData || {}).forEach(symbol => {
      const bd = binanceData[symbol]
      if (bd?.price > 0) {
        merged[symbol] = {
          ...merged[symbol],
          price: bd.price,
          change: bd.change ?? bd.change24 ?? merged[symbol]?.change,
        }
      }
    })
    return merged
  }, [geckoData, binanceData])

  // ─── Fear & Greed Index ───
  const [fearGreed, setFearGreed] = useState({ value: 35, classification: 'Fear' })
  useEffect(() => {
    let cancelled = false
    const fetchFng = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1')
        const json = await res.json()
        if (cancelled || !json?.data?.[0]) return
        const d = json.data[0]
        setFearGreed({ value: parseInt(d.value, 10), classification: d.value_classification || '' })
      } catch (_) {
        if (!cancelled) setFearGreed({ value: null, classification: '' })
      }
    }
    fetchFng()
    const t = setInterval(fetchFng, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // ─── Alt Season + Market Dominance (static mirrors from WelcomePage) ───
  const [altSeason] = useState({ value: 31, btcShare: 58.4, ethShare: 10.2, label: 'Rotation' })
  const [marketDom] = useState({ btc: 56.4, eth: 18.2, sol: 3.8, alts: 21.6 })

  // ─── Canvas refs ───
  const btcSparkRef = useRef(null)
  const miniSparkRefs = useRef({})

  // ─── Computed analysis ───
  const btcData = prices['BTC'] || {}
  const btcPrice = btcData.price || 0
  const btcChange24 = btcData.change || 0
  const btcChange7d = btcData.change7d || 0

  // Determine market bias
  const bias = useMemo(() => {
    const fng = fearGreed.value ?? 50
    const ch24 = btcChange24 || 0
    const ch7d = btcChange7d || 0
    const score = (ch24 * 0.4) + (ch7d * 0.3) + ((fng - 50) * 0.03 * 10)
    if (score > 4) return { labelKey: 'aiAnalysis.bullish', color: '#00e676', dotColor: '#00e676' }
    if (score > 1) return { labelKey: 'aiAnalysis.slightlyBullish', color: '#66ff99', dotColor: '#66ff99' }
    if (score > -1) return { labelKey: 'aiAnalysis.neutral', color: '#ffab40', dotColor: '#ffab40' }
    if (score > -4) return { labelKey: 'aiAnalysis.slightlyBearish', color: '#ff7043', dotColor: '#ff7043' }
    return { labelKey: 'aiAnalysis.bearish', color: '#ff1744', dotColor: '#ff1744' }
  }, [btcChange24, btcChange7d, fearGreed.value])

  // Short summary sentence
  const shortSummary = useMemo(() => {
    const fng = fearGreed.value ?? 50
    const cls = fearGreed.classification || ''
    const ch = btcChange24 || 0
    if (fng < 25) return `Risk-off mode. BTC ${formatPct(ch)}, F&G at ${fng} (${cls}). Capital preservation favored.`
    if (fng < 40) return `Cautious sentiment. BTC ${formatPct(ch)}, F&G at ${fng} (${cls}). Selective entries only.`
    if (fng < 60) return `Neutral zone. BTC ${formatPct(ch)}, F&G at ${fng} (${cls}). Range-bound action likely.`
    if (fng < 75) return `Greed building. BTC ${formatPct(ch)}, F&G at ${fng} (${cls}). Momentum favors bulls.`
    return `Extreme greed. BTC ${formatPct(ch)}, F&G at ${fng} (${cls}). Watch for overextension.`
  }, [btcChange24, fearGreed])

  // Total 24h volume across top 10
  const totalVolume = useMemo(() => {
    return TOP_SYMBOLS.reduce((sum, s) => sum + (prices[s]?.volume || 0), 0)
  }, [prices])

  // Asset table rows with signal scoring
  const tableRows = useMemo(() => {
    const nonStable = TOP_SYMBOLS.filter(s => s !== 'USDT' && s !== 'USDC')
    return nonStable.map(symbol => {
      const d = prices[symbol] || {}
      const ch1h = d.change1h || 0
      const ch24h = d.change || 0
      const ch7d = d.change7d || 0
      const score = ch1h * 0.2 + ch24h * 0.5 + ch7d * 0.3
      let signalKey, signalColor
      if (score > 3) { signalKey = 'aiAnalysis.strongBuy'; signalColor = '#00e676' }
      else if (score > 0.5) { signalKey = 'aiAnalysis.buy'; signalColor = '#66bb6a' }
      else if (score > -0.5) { signalKey = 'aiAnalysis.hold'; signalColor = '#ffab40' }
      else if (score > -3) { signalKey = 'aiAnalysis.sell'; signalColor = '#ff7043' }
      else { signalKey = 'aiAnalysis.strongSell'; signalColor = '#ff1744' }

      return {
        symbol,
        price: d.price || 0,
        change1h: ch1h,
        change24h: ch24h,
        change7d: ch7d,
        sparkline: d.sparkline_7d || [],
        signalKey,
        signalColor,
        logo: COINGECKO_LOGOS[symbol] || '',
        rowColor: TOKEN_ROW_COLORS[symbol]?.bg || '255,255,255',
      }
    })
  }, [prices])

  // AI Insights (auto-generated from data)
  const insights = useMemo(() => {
    const items = []
    const fng = fearGreed.value ?? 50

    // Key mover
    const sorted = [...tableRows].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    if (sorted[0]) {
      const top = sorted[0]
      items.push(`${top.symbol} leads moves at ${formatPct(top.change24h)} (24h) — ${top.change24h > 0 ? 'bullish momentum' : 'selling pressure'}.`)
    }

    // Fear & Greed
    if (fng < 25) items.push(`Extreme Fear (${fng}) — historically correlates with accumulation zones.`)
    else if (fng < 40) items.push(`Fear zone (${fng}) — smart money often buys here; retail exits.`)
    else if (fng > 75) items.push(`Extreme Greed (${fng}) — distribution risk elevated; tighten stops.`)
    else if (fng > 60) items.push(`Greed zone (${fng}) — momentum intact but watch for euphoria signals.`)
    else items.push(`Neutral sentiment (${fng}) — market waiting for catalyst.`)

    // Dominance
    if (marketDom.btc > 55) items.push(`BTC dominance high at ${marketDom.btc}% — alts lagging; rotation not yet confirmed.`)
    else if (marketDom.btc < 45) items.push(`BTC dominance low at ${marketDom.btc}% — alt season signal strengthening.`)
    else items.push(`BTC dominance at ${marketDom.btc}% — balanced market structure.`)

    // Positioning advice
    if (fng < 30 && btcChange24 < -2) items.push('Preserve capital. Wait for stabilization before adding risk.')
    else if (fng > 70 && btcChange24 > 2) items.push('Take partial profits. Elevated greed with extended price action.')
    else items.push('Monitor key levels. Set alerts at support/resistance zones.')

    return items
  }, [tableRows, fearGreed.value, marketDom.btc, btcChange24])

  // ─── BTC Sparkline Canvas ───
  const drawBtcSparkline = useCallback(() => {
    const canvas = btcSparkRef.current
    if (!canvas) return
    const sparkData = prices['BTC']?.sparkline_7d
    if (!sparkData || sparkData.length < 2) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const w = rect.width
    const h = rect.height
    const pts = sparkData
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const range = max - min || 1

    const isPositive = pts[pts.length - 1] >= pts[0]
    const lineColor = isPositive ? '#00e676' : '#ff1744'
    const fillTop = isPositive ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 23, 68, 0.25)'
    const fillBot = 'rgba(0,0,0,0)'

    // Draw area fill
    ctx.beginPath()
    pts.forEach((p, i) => {
      const x = (i / (pts.length - 1)) * w
      const y = h - ((p - min) / range) * (h - 8) - 4
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, fillTop)
    grad.addColorStop(1, fillBot)
    ctx.fillStyle = grad
    ctx.fill()

    // Draw line
    ctx.beginPath()
    pts.forEach((p, i) => {
      const x = (i / (pts.length - 1)) * w
      const y = h - ((p - min) / range) * (h - 8) - 4
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2
    ctx.stroke()
  }, [prices])

  // ─── Mini Sparklines ───
  const drawMiniSparkline = useCallback((canvas, data, isPositive) => {
    if (!canvas || !data || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = 80 * dpr
    canvas.height = 28 * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, 80, 28)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const color = isPositive ? '#00e676' : '#ff1744'

    ctx.beginPath()
    data.forEach((p, i) => {
      const x = (i / (data.length - 1)) * 80
      const y = 28 - ((p - min) / range) * 24 - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }, [])

  // Draw all sparklines on data change
  useEffect(() => {
    drawBtcSparkline()
    tableRows.forEach(row => {
      const canvas = miniSparkRefs.current[row.symbol]
      if (canvas && row.sparkline.length > 1) {
        drawMiniSparkline(canvas, row.sparkline, row.sparkline[row.sparkline.length - 1] >= row.sparkline[0])
      }
    })
  }, [drawBtcSparkline, drawMiniSparkline, tableRows])

  // ─── Fear & Greed bar color ───
  const fngBarColor = useMemo(() => {
    const v = fearGreed.value ?? 50
    if (v < 25) return 'linear-gradient(90deg, #ff1744, #ff5252)'
    if (v < 45) return 'linear-gradient(90deg, #ff5252, #ffab40)'
    if (v < 55) return 'linear-gradient(90deg, #ffab40, #ffd740)'
    if (v < 75) return 'linear-gradient(90deg, #ffd740, #69f0ae)'
    return 'linear-gradient(90deg, #69f0ae, #00e676)'
  }, [fearGreed.value])

  // ─── Render ───
  return (
    <div className={`ai-mkt-page${dayMode ? ' day-mode' : ''}`}>
      {/* Header */}
      <div className="ai-mkt-header">
        <button className="ai-mkt-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        <h1 className="ai-mkt-title">{t('aiAnalysis.title')}</h1>
        <span className="ai-mkt-live-badge">
          <span className="ai-mkt-live-dot" />
          {t('ticker.live')}
        </span>
      </div>

      <div className="ai-mkt-content">

        {/* S1: Verdict Hero */}
        <div className="ai-mkt-verdict" style={{ borderLeftColor: bias.color }}>
          <div className="ai-mkt-verdict-left">
            <span className="ai-mkt-verdict-dot" style={{ background: bias.dotColor }} />
            <span className="ai-mkt-verdict-label" style={{ color: bias.color }}>{t(bias.labelKey)}</span>
            <span className="ai-mkt-verdict-divider">|</span>
            <span className="ai-mkt-verdict-btc">
              BTC {fmtPrice(btcPrice)}
              <span className={`ai-mkt-verdict-change ${btcChange24 >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(btcChange24)}
              </span>
            </span>
          </div>
          <div className="ai-mkt-verdict-summary">{shortSummary}</div>
        </div>

        {/* S2: Metrics Strip */}
        <div className="ai-mkt-metrics-strip">
          {/* Fear & Greed */}
          <div className="ai-mkt-metric-card">
            <span className="ai-mkt-metric-label">{t('welcome.fearGreedIndex')}</span>
            <span className="ai-mkt-metric-value">{fearGreed.value ?? '—'}</span>
            <div className="ai-mkt-metric-bar-track">
              <div className="ai-mkt-metric-bar-fill" style={{ width: `${fearGreed.value ?? 0}%`, background: fngBarColor }} />
            </div>
            <span className="ai-mkt-metric-tag">{fearGreed.classification || '—'}</span>
          </div>

          {/* Alt Season */}
          <div className="ai-mkt-metric-card">
            <span className="ai-mkt-metric-label">{t('aiAnalysis.altSeason')}</span>
            <span className="ai-mkt-metric-value">{altSeason.value}</span>
            <div className="ai-mkt-metric-bar-track">
              <div className="ai-mkt-metric-bar-fill" style={{ width: `${altSeason.value}%`, background: 'linear-gradient(90deg, #ff6d00, #aa00ff)' }} />
            </div>
            <span className="ai-mkt-metric-tag">{altSeason.label}</span>
          </div>

          {/* BTC Dominance */}
          <div className="ai-mkt-metric-card">
            <span className="ai-mkt-metric-label">{t('aiAnalysis.btcDominance')}</span>
            <span className="ai-mkt-metric-value">{marketDom.btc}%</span>
            <div className="ai-mkt-dom-bar">
              <div className="ai-mkt-dom-seg" style={{ width: `${marketDom.btc}%`, background: '#f7931a' }} title={`BTC ${marketDom.btc}%`} />
              <div className="ai-mkt-dom-seg" style={{ width: `${marketDom.eth}%`, background: '#627eea' }} title={`ETH ${marketDom.eth}%`} />
              <div className="ai-mkt-dom-seg" style={{ width: `${marketDom.sol}%`, background: '#00ffa3' }} title={`SOL ${marketDom.sol}%`} />
              <div className="ai-mkt-dom-seg" style={{ width: `${marketDom.alts}%`, background: '#888' }} title={`Alts ${marketDom.alts}%`} />
            </div>
            <div className="ai-mkt-dom-labels">
              <span style={{ color: '#f7931a' }}>BTC</span>
              <span style={{ color: '#627eea' }}>ETH</span>
              <span style={{ color: '#00ffa3' }}>SOL</span>
              <span style={{ color: '#999' }}>Alts</span>
            </div>
          </div>

          {/* 24h Volume */}
          <div className="ai-mkt-metric-card">
            <span className="ai-mkt-metric-label">{t('common.volume24h')}</span>
            <span className="ai-mkt-metric-value">{fmtLarge(totalVolume)}</span>
            <div className="ai-mkt-metric-bar-track">
              <div className="ai-mkt-metric-bar-fill" style={{ width: `${Math.min(100, (totalVolume / 2e11) * 100)}%`, background: 'linear-gradient(90deg, #42a5f5, #7c4dff)' }} />
            </div>
            <span className="ai-mkt-metric-tag">{t('aiAnalysis.top10Coins')}</span>
          </div>
        </div>

        {/* S3: BTC Sparkline */}
        <div className="ai-mkt-btc-spark-card">
          <div className="ai-mkt-btc-spark-header">
            <span className="ai-mkt-btc-spark-title">BTC 7D</span>
            <span className={`ai-mkt-btc-spark-change ${btcChange7d >= 0 ? 'positive' : 'negative'}`}>
              {formatPct(btcChange7d)}
            </span>
          </div>
          <canvas ref={btcSparkRef} className="ai-mkt-btc-spark-canvas" />
        </div>

        {/* S4: Assets Table */}
        <div className="ai-mkt-table-card">
          <div className="ai-mkt-table-header-row">
            <span className="ai-mkt-th ai-mkt-th-asset">{t('aiAnalysis.asset')}</span>
            <span className="ai-mkt-th ai-mkt-th-price">{t('common.price')}</span>
            <span className="ai-mkt-th ai-mkt-th-change">1H</span>
            <span className="ai-mkt-th ai-mkt-th-change">24H</span>
            <span className="ai-mkt-th ai-mkt-th-change">7D</span>
            <span className="ai-mkt-th ai-mkt-th-chart">{t('aiAnalysis.chart7d')}</span>
            <span className="ai-mkt-th ai-mkt-th-signal">{t('aiAnalysis.signal')}</span>
          </div>
          {tableRows.map(row => (
            <div
              key={row.symbol}
              className="ai-mkt-table-row"
              style={{ '--row-bg-rgb': row.rowColor }}
            >
              <span className="ai-mkt-td ai-mkt-td-asset">
                {row.logo && <img src={row.logo} alt="" className="ai-mkt-token-logo" />}
                <span className="ai-mkt-token-sym">{row.symbol}</span>
              </span>
              <span className="ai-mkt-td ai-mkt-td-price">{fmtPrice(row.price)}</span>
              <span className={`ai-mkt-td ai-mkt-td-change ${row.change1h >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(row.change1h)}
              </span>
              <span className={`ai-mkt-td ai-mkt-td-change ${row.change24h >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(row.change24h)}
              </span>
              <span className={`ai-mkt-td ai-mkt-td-change ${row.change7d >= 0 ? 'positive' : 'negative'}`}>
                {formatPct(row.change7d)}
              </span>
              <span className="ai-mkt-td ai-mkt-td-chart">
                <canvas
                  ref={el => { miniSparkRefs.current[row.symbol] = el }}
                  className="ai-mkt-mini-spark"
                  width={80}
                  height={28}
                />
              </span>
              <span className="ai-mkt-td ai-mkt-td-signal">
                <span className="ai-mkt-signal-badge" style={{ color: row.signalColor, borderColor: row.signalColor }}>
                  {t(row.signalKey)}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* S5+S6: Insights + Dominance side-by-side */}
        <div className="ai-mkt-bottom-row">
          {/* AI Insights */}
          <div className="ai-mkt-insights-card">
            <div className="ai-mkt-insights-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aa00ff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              {t('aiAnalysis.aiInsights')}
            </div>
            <ul className="ai-mkt-insights-list">
              {insights.map((item, i) => (
                <li key={i} className="ai-mkt-insight-item">{item}</li>
              ))}
            </ul>
          </div>

          {/* Market Structure */}
          <div className="ai-mkt-structure-card">
            <div className="ai-mkt-structure-title">{t('aiAnalysis.marketDominance')}</div>
            <div className="ai-mkt-dom-visual">
              <div className="ai-mkt-dom-bar-large">
                <div style={{ width: `${marketDom.btc}%`, background: '#f7931a', borderRadius: '6px 0 0 6px' }} />
                <div style={{ width: `${marketDom.eth}%`, background: '#627eea' }} />
                <div style={{ width: `${marketDom.sol}%`, background: '#00ffa3' }} />
                <div style={{ width: `${marketDom.alts}%`, background: 'rgba(255,255,255,0.15)', borderRadius: '0 6px 6px 0' }} />
              </div>
              <div className="ai-mkt-dom-legend">
                <span><span className="ai-mkt-dom-dot" style={{ background: '#f7931a' }} />BTC {marketDom.btc}%</span>
                <span><span className="ai-mkt-dom-dot" style={{ background: '#627eea' }} />ETH {marketDom.eth}%</span>
                <span><span className="ai-mkt-dom-dot" style={{ background: '#00ffa3' }} />SOL {marketDom.sol}%</span>
                <span><span className="ai-mkt-dom-dot" style={{ background: '#888' }} />Alts {marketDom.alts}%</span>
              </div>
            </div>
            <div className="ai-mkt-alt-season-badge">
              <span className="ai-mkt-alt-label">{t('aiAnalysis.altSeasonIndex')}</span>
              <span className="ai-mkt-alt-value">{altSeason.value}</span>
              <span className="ai-mkt-alt-tag">{altSeason.label}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AIMarketAnalysisPage
