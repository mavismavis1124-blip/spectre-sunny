/**
 * Fear & Greed Index page – gauge, chart, market mood, CT Crying Meter, contributing factors
 * "Is PA real?" – show divergence: CT crying vs whales buying with real inflows
 */
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import spectreIcons from '../icons/spectreIcons'
import { getMarketIndices } from '../services/stockApi'
import './FearGreedPage.css'

// VIX-to-Fear/Greed mapping for stock mode
// VIX < 15 = Extreme Greed (85-100), 15-20 = Greed (60-85), 20-25 = Neutral (40-60), 25-30 = Fear (15-40), >30 = Extreme Fear (0-15)
function vixToFearGreed(vix) {
  if (vix == null) return { value: 50, classification: 'Neutral' }
  if (vix <= 12) return { value: 95, classification: 'Extreme Greed' }
  if (vix <= 15) return { value: 80 + ((15 - vix) / 3) * 15, classification: 'Greed' }
  if (vix <= 20) return { value: 60 + ((20 - vix) / 5) * 20, classification: 'Greed' }
  if (vix <= 25) return { value: 40 + ((25 - vix) / 5) * 20, classification: 'Neutral' }
  if (vix <= 30) return { value: 15 + ((30 - vix) / 5) * 25, classification: 'Fear' }
  if (vix <= 40) return { value: 5 + ((40 - vix) / 10) * 10, classification: 'Extreme Fear' }
  return { value: 5, classification: 'Extreme Fear' }
}

// CT_CRYING_COPY moved to i18n key: fearGreed.ctCryingCopy

// Mock contributing factors (plug real APIs later)
// Labels/descriptions are i18n keys resolved inside the component via t()
const MOCK_FACTORS = {
  priceVolatility: { herdSentiment: 52, smartMoneyFlow: 48, tagKey: 'fearGreed.tagContrarian' },
  onChain: { value: 9, classKey: 'fear', descKey: 'fearGreed.descWhaleAccumulation' },
  derivatives: { value: 27, classKey: 'fear' },
  social: { value: 12, classKey: 'fear', descKey: 'fearGreed.descCtCrying' },
}
const CT_STATUS_KEY = 'neutral' // bearish | neutral | bullish

const TIMEFRAMES = [
  { id: '7D', label: '7D', days: 7 },
  { id: '30D', label: '30D', days: 30 },
  { id: '90D', label: '90D', days: 90 },
  { id: '1Y', label: '1Y', days: 365 },
]

const FearGreedPage = ({ dayMode = false, onBack, marketMode = 'crypto' }) => {
  const { t } = useTranslation()

  // Map English classification strings (from API / vixToFearGreed) to i18n keys
  const classMap = {
    'Extreme Greed': 'fearGreed.extremeGreed',
    'Greed': 'fearGreed.greed',
    'Neutral': 'fearGreed.neutral',
    'Fear': 'fearGreed.fear',
    'Extreme Fear': 'fearGreed.extremeFear',
  }
  const translateClass = (cls) => classMap[cls] ? t(classMap[cls]) : cls || '—'

  // Short classification key (for MOCK_FACTORS) → i18n key
  const shortClassMap = {
    fear: 'fearGreed.fear',
    neutral: 'fearGreed.neutral',
    greed: 'fearGreed.greed',
    extremeFear: 'fearGreed.extremeFear',
    extremeGreed: 'fearGreed.extremeGreed',
    bearish: 'fearGreed.ctBearish',
    bullish: 'fearGreed.ctBullish',
  }
  const tClass = (key) => shortClassMap[key] ? t(shortClassMap[key]) : key || '—'

  const isStocks = marketMode === 'stocks'
  const [fearGreed, setFearGreed] = useState({ value: null, classification: '', loading: true })
  const [history, setHistory] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [chartTimeframe, setChartTimeframe] = useState('30D')
  const [chartHover, setChartHover] = useState(null)
  const [vixValue, setVixValue] = useState(null)

  // Stock mode: VIX-based fear/greed
  useEffect(() => {
    if (!isStocks) return
    let cancelled = false
    const fetchVix = async () => {
      try {
        const indices = await getMarketIndices()
        if (cancelled) return
        const vix = indices?.find?.(i => i.symbol === '^VIX' || i.symbol === 'VIX')
        if (vix?.price) {
          setVixValue(vix.price)
          const fg = vixToFearGreed(vix.price)
          setFearGreed({ value: fg.value, classification: fg.classification, loading: false })
          setFetchError(null)
        } else {
          // Fallback VIX estimate
          const fg = vixToFearGreed(22)
          setVixValue(22)
          setFearGreed({ value: fg.value, classification: fg.classification, loading: false })
        }
      } catch (err) {
        console.error('VIX fetch error:', err)
        if (!cancelled) {
          const fg = vixToFearGreed(22)
          setVixValue(22)
          setFearGreed({ value: fg.value, classification: fg.classification, loading: false })
        }
      }
    }
    fetchVix()
    const t = setInterval(fetchVix, 2 * 60 * 1000) // refresh every 2 min
    return () => { cancelled = true; clearInterval(t) }
  }, [isStocks])

  // Crypto mode: Alternative.me Fear & Greed
  useEffect(() => {
    if (isStocks) return
    let cancelled = false
    const fetchCurrent = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1')
        const json = await res.json()
        if (cancelled || !json?.data?.[0]) return
        const d = json.data[0]
        setFetchError(null)
        setFearGreed((prev) => ({
          value: parseInt(d.value, 10),
          classification: d.value_classification || '',
          loading: prev.loading ? false : prev.loading,
        }))
      } catch (err) {
        console.error('Fear & Greed fetch error:', err)
        if (!cancelled) setFetchError('apiError')
      }
    }
    const fetchHistory = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=365')
        const json = await res.json()
        if (cancelled || !json?.data?.length) return
        setHistory(
          json.data.map((x) => ({
            value: parseInt(x.value, 10),
            classification: x.value_classification || '',
            timestamp: x.timestamp,
          })).reverse()
        )
        setFearGreed((prev) => (prev.loading ? { ...prev, loading: false } : prev))
      } catch (err) {
        console.error('Fear & Greed history error:', err)
        if (!cancelled) {
          setFearGreed((prev) => (prev.loading ? { ...prev, loading: false } : prev))
          setFetchError('Unable to load historical data')
        }
      }
    }
    fetchCurrent()
    fetchHistory()
    const tCurrent = setInterval(fetchCurrent, 5 * 60 * 1000)
    const tHistory = setInterval(fetchHistory, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(tCurrent); clearInterval(tHistory) }
  }, [isStocks])

  const value = fearGreed.value ?? 0
  const sentiment = value >= 56 ? 'greed' : value <= 45 ? 'fear' : 'neutral'

  // Vs yesterday / last week / last month (from history; history is oldest-first after reverse)
  const comparisons = useMemo(() => {
    if (!history.length || fearGreed.value == null) return { yesterday: null, week: null, month: null }
    const currentVal = fearGreed.value
    const prev = (i) => (history[Math.max(0, history.length - i)]?.value != null ? currentVal - history[history.length - i].value : null)
    return {
      yesterday: history.length >= 2 ? prev(2) : null,
      week: history.length >= 8 ? prev(8) : null,
      month: history.length >= 31 ? prev(31) : history.length >= 2 ? prev(2) : null,
    }
  }, [history, fearGreed.value])

  // Gauge: semi-circle 0–100, needle angle -90deg (0) to +90deg (100)
  const gaugeAngle = -90 + (value / 100) * 180

  // Filter history by selected timeframe (last N days)
  const filteredHistory = useMemo(() => {
    if (!history.length) return []
    const days = TIMEFRAMES.find((t) => t.id === chartTimeframe)?.days ?? 30
    const cutoff = (Date.now() / 1000) - days * 86400
    return history.filter((h) => h.timestamp && parseInt(h.timestamp, 10) >= cutoff)
  }, [history, chartTimeframe])

  // Chart dimensions (responsive) and points
  const chartH = 260
  const chartPadding = { top: 20, right: 20, bottom: 36, left: 44 }
  const chartPoints = useMemo(() => {
    if (!filteredHistory.length) return []
    const innerH = chartH - chartPadding.top - chartPadding.bottom
    const innerW = 560
    return filteredHistory.map((h, i) => {
      const x = chartPadding.left + (i / Math.max(1, filteredHistory.length - 1)) * innerW
      const y = chartPadding.top + innerH - (Math.min(100, Math.max(0, h.value)) / 100) * innerH
      return { x, y, ...h }
    })
  }, [filteredHistory, chartPadding.left, chartPadding.top, chartH])

  const chartInnerW = 560
  const chartW = chartPadding.left + chartInnerW + chartPadding.right
  const innerH = chartH - chartPadding.top - chartPadding.bottom

  // X-axis time labels (sample by timeframe)
  const timeLabels = useMemo(() => {
    if (!filteredHistory.length) return []
    const n = filteredHistory.length
    const count = chartTimeframe === '7D' ? 5 : chartTimeframe === '30D' ? 5 : chartTimeframe === '90D' ? 6 : 8
    const step = Math.max(1, Math.floor((n - 1) / (count - 1)))
    const labels = []
    for (let i = 0; i < n; i += step) {
      const h = filteredHistory[i]
      if (!h?.timestamp) continue
      const d = new Date(parseInt(h.timestamp, 10) * 1000)
      const x = chartPadding.left + (i / Math.max(1, n - 1)) * chartInnerW
      labels.push({
        x,
        label: chartTimeframe === '7D' ? d.toLocaleDateString(undefined, { weekday: 'short' }) : chartTimeframe === '1Y' ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })
    }
    if (filteredHistory.length > 0 && (labels.length === 0 || labels[labels.length - 1].x < chartPadding.left + chartInnerW - 20)) {
      const last = filteredHistory[filteredHistory.length - 1]
      if (last?.timestamp) {
        const d = new Date(parseInt(last.timestamp, 10) * 1000)
        labels.push({
          x: chartPadding.left + chartInnerW,
          label: chartTimeframe === '7D' ? d.toLocaleDateString(undefined, { weekday: 'short' }) : chartTimeframe === '1Y' ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        })
      }
    }
    return labels
  }, [filteredHistory, chartTimeframe, chartPadding.left, chartInnerW])

  const handleChartMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pxPixel = e.clientX - rect.left
    const px = (pxPixel / rect.width) * chartW
    let best = 0
    let bestD = Infinity
    chartPoints.forEach((p, i) => {
      const d = Math.abs(p.x - px)
      if (d < bestD) { bestD = d; best = i }
    })
    const pt = chartPoints[best]
    if (pt) setChartHover({ index: best, x: pxPixel, y: (pt.y / chartH) * rect.height, value: pt.value, timestamp: pt.timestamp })
  }
  const handleChartMouseLeave = () => setChartHover(null)

  return (
    <div className={`fear-greed-page ${dayMode ? 'day-mode' : ''}`}>
      <div className="fear-greed-header">
        <div className="fear-greed-header-inner">
          {onBack && (
            <button type="button" className="fear-greed-back" onClick={onBack} aria-label={t('common.back')}>
              <span className="fear-greed-back-icon" aria-hidden>{spectreIcons.chevronLeft}</span>
              {t('common.back')}
            </button>
          )}
          <h1 className="fear-greed-title">{isStocks ? t('fearGreed.vixTitle') : t('fearGreed.title')}</h1>
          <p className="fear-greed-subtitle">{isStocks
            ? `${t('fearGreed.vixSubtitle')}${vixValue != null ? ` — VIX: ${vixValue.toFixed(1)}` : ''}`
            : t('fearGreed.subtitle')
          }</p>
        </div>
      </div>

      <div className="fear-greed-content">
        {/* Hero: Compact Gauge (left) + Chart with timeframes (right) */}
        <div className="fear-greed-hero">
          <div className="fear-greed-gauge-card fear-greed-gauge-card--compact" data-sentiment={sentiment}>
            <div className="fear-greed-gauge-compact-head">
              <h2 className="fear-greed-gauge-title fear-greed-gauge-title--compact"><span className="fear-greed-section-icon" aria-hidden>{spectreIcons.trending}</span>{t('fearGreed.title')}</h2>
              {!fearGreed.loading && fearGreed.value != null && (
                <span className="fear-greed-value-pill">{fearGreed.value}/100</span>
              )}
            </div>
            {fearGreed.loading ? (
              <p className="fear-greed-loading">{t('common.loading')}</p>
            ) : fetchError && fearGreed.value == null ? (
              <p className="fear-greed-loading" style={{ color: 'rgba(239,68,68,0.8)' }}>{t('common.error')}</p>
            ) : (
              <>
                <div className="fear-greed-gauge-wrap fear-greed-gauge-wrap--compact">
                  <svg className="fear-greed-gauge-svg fear-greed-gauge-svg--compact" viewBox="0 0 160 88" preserveAspectRatio="xMidYMax meet">
                    <defs>
                      <linearGradient id="fear-greed-arc" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="25%" stopColor="#ea580c" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="75%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                    <path d="M 16 80 A 64 64 0 0 1 144 80" fill="none" stroke="url(#fear-greed-arc)" strokeWidth="10" strokeLinecap="round" />
                    <line x1="80" y1="80" x2={80 + 56 * Math.cos((gaugeAngle * Math.PI) / 180)} y2={80 - 56 * Math.sin((gaugeAngle * Math.PI) / 180)} stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round" />
                    <text x="80" y="84" textAnchor="middle" className="fear-greed-gauge-tick">0</text>
                    <text x="144" y="84" textAnchor="middle" className="fear-greed-gauge-tick">100</text>
                  </svg>
                </div>
                <div className="fear-greed-gauge-classification-only">{fearGreed.classification || '—'}</div>
                <div className="fear-greed-comparisons fear-greed-comparisons--compact">
                  {comparisons.yesterday != null && <span className="fear-greed-vs">1d {comparisons.yesterday >= 0 ? '+' : ''}{comparisons.yesterday}</span>}
                  {comparisons.week != null && <span className="fear-greed-vs">7d {comparisons.week >= 0 ? '+' : ''}{comparisons.week}</span>}
                  {comparisons.month != null && <span className="fear-greed-vs">30d {comparisons.month >= 0 ? '+' : ''}{comparisons.month}</span>}
                </div>
              </>
            )}
          </div>

          <div className="fear-greed-chart-card">
            <div className="fear-greed-chart-head">
              <h2 className="fear-greed-chart-title"><span className="fear-greed-section-icon" aria-hidden>{spectreIcons.aiAnalysis}</span>{isStocks ? t('fearGreed.vixSentiment') : t('fearGreed.title')}</h2>
              <div className="fear-greed-chart-timeframes">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    className={`fear-greed-timeframe-btn ${chartTimeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setChartTimeframe(tf.id)}
                    aria-pressed={chartTimeframe === tf.id}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            {chartPoints.length < 2 ? (
              <p className="fear-greed-loading">{t('common.loading')}</p>
            ) : (
              <div
                className="fear-greed-chart-wrap"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="fear-greed-chart-svg" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="chart-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#dc2626" />
                      <stop offset="30%" stopColor="#ea580c" />
                      <stop offset="50%" stopColor="#eab308" />
                      <stop offset="70%" stopColor="#84cc16" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={chartPadding.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <line x1={chartPadding.left} y1={chartPadding.top + innerH} x2={chartPadding.left + chartInnerW} y2={chartPadding.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  {[0, 25, 50, 75, 100].map((v) => (
                    <text key={v} x={chartPadding.left - 8} y={chartPadding.top + innerH - (v / 100) * innerH + 4} textAnchor="end" className="fear-greed-chart-tick">{v}</text>
                  ))}
                  {timeLabels.map((tl, i) => (
                    <text key={i} x={tl.x} y={chartH - 8} textAnchor="middle" className="fear-greed-chart-xlabel">{tl.label}</text>
                  ))}
                  <path
                    d={chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                    fill="none"
                    stroke="url(#chart-line-gradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartHover != null && chartPoints[chartHover.index] && (
                    <circle cx={chartPoints[chartHover.index].x} cy={chartPoints[chartHover.index].y} r="5" fill="rgba(255,255,255,0.9)" />
                  )}
                </svg>
                {chartHover != null && chartPoints[chartHover.index] && (
                  <div
                    className="fear-greed-chart-tooltip"
                    style={{ left: Math.min(chartHover.x, chartW - 140), top: chartHover.y - 12 }}
                  >
                    {chartPoints[chartHover.index].timestamp && (
                      <span className="fear-greed-tooltip-date">
                        {new Date(parseInt(chartPoints[chartHover.index].timestamp, 10) * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    <span className="fear-greed-tooltip-value">{t('fearGreed.value')}: {chartPoints[chartHover.index].value}</span>
                  </div>
                )}
                <span className="fear-greed-chart-live">{t('fearGreed.live')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Divergence: CT Crying Meter + Market Mood */}
        <div className="fear-greed-divergence-row">
          <div className="fear-greed-ct-card">
            <div className="fear-greed-ct-head">
              <h2 className="fear-greed-ct-title">{t('fearGreed.ctCryingMeter')}</h2>
              <span className={`fear-greed-tag fear-greed-tag--${CT_STATUS.toLowerCase()}`}>{CT_STATUS}</span>
            </div>
            <p className="fear-greed-ct-copy">{CT_CRYING_COPY}</p>
          </div>
          <div className="fear-greed-mood-card">
            <h2 className="fear-greed-mood-title">{t('fearGreed.marketMood')}</h2>
            <section className="fear-greed-mood-section">
              <h3 className="fear-greed-mood-head">{t('fearGreed.majors')}</h3>
              <ul className="fear-greed-mood-list">
                <li>Total crypto market cap down ~4.5% this month, signaling capital bleed.</li>
                <li>USDT dominance shows an overall uptrend, but recent data indicates a potential pullback.</li>
                <li>DXY printed a higher close, signaling potential USD strength.</li>
              </ul>
            </section>
            <section className="fear-greed-mood-section">
              <h3 className="fear-greed-mood-head">{t('fearGreed.micros')}</h3>
              <ul className="fear-greed-mood-list">
                <li>Altseason index at 20; momentum fading, signaling BTC dominance likely to continue.</li>
                <li>Strong bullish momentum across meme coins and AI suggests a risk-on environment.</li>
                <li>Layer 1s are showing strength, indicating a broad market rally.</li>
              </ul>
            </section>
            <section className="fear-greed-mood-section">
              <h3 className="fear-greed-mood-head">{t('fearGreed.ethBtc')}</h3>
              <ul className="fear-greed-mood-list">
                <li>Extreme fear persists; signals potential accumulation zone, but no immediate reversal.</li>
                <li>Volume and market cap show strong positive correlation, indicating healthy flow.</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Contributing factors: Price & Volatility, On-chain, Derivatives, Social */}
        <div className="fear-greed-factors-row">
          <div className="fear-greed-factor-card">
            <div className="fear-greed-factor-head">
              <h3 className="fear-greed-factor-title">{t('fearGreed.factorPrice')}</h3>
              <span className="fear-greed-tag fear-greed-tag--cautious">{MOCK_FACTORS.priceVolatility.tag}</span>
            </div>
            <div className="fear-greed-factor-meters">
              <div className="fear-greed-meter-row">
                <span className="fear-greed-meter-label">{t('fearGreed.factorHerd')}</span>
                <span className="fear-greed-meter-value">{MOCK_FACTORS.priceVolatility.herdSentiment}/100</span>
                <div className="fear-greed-meter-bar">
                  <div className="fear-greed-meter-fill" style={{ width: `${MOCK_FACTORS.priceVolatility.herdSentiment}%` }} />
                </div>
              </div>
              <div className="fear-greed-meter-row">
                <span className="fear-greed-meter-label">{t('fearGreed.factorSmartMoney')}</span>
                <span className="fear-greed-meter-value">{MOCK_FACTORS.priceVolatility.smartMoneyFlow}/100</span>
                <div className="fear-greed-meter-bar">
                  <div className="fear-greed-meter-fill" style={{ width: `${MOCK_FACTORS.priceVolatility.smartMoneyFlow}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="fear-greed-factor-card fear-greed-factor-card--small">
            <h3 className="fear-greed-factor-title">{t('fearGreed.factorOnChain')}</h3>
            <div className="fear-greed-factor-score">
              <span className="fear-greed-factor-value">{MOCK_FACTORS.onChain.value}</span>
              <span className="fear-greed-factor-label">{MOCK_FACTORS.onChain.label}</span>
            </div>
            {MOCK_FACTORS.onChain.desc && <p className="fear-greed-factor-desc">{MOCK_FACTORS.onChain.desc}</p>}
          </div>
          <div className="fear-greed-factor-card fear-greed-factor-card--small">
            <h3 className="fear-greed-factor-title">{t('fearGreed.factorDerivatives')}</h3>
            <div className="fear-greed-factor-score">
              <span className="fear-greed-factor-value">{MOCK_FACTORS.derivatives.value}</span>
              <span className="fear-greed-factor-label">{MOCK_FACTORS.derivatives.label}</span>
            </div>
          </div>
          <div className="fear-greed-factor-card fear-greed-factor-card--small">
            <h3 className="fear-greed-factor-title">{t('fearGreed.factorSocial')}</h3>
            <div className="fear-greed-factor-score">
              <span className="fear-greed-factor-value">{MOCK_FACTORS.social.value}</span>
              <span className="fear-greed-factor-label">{MOCK_FACTORS.social.label}</span>
            </div>
            {MOCK_FACTORS.social.desc && <p className="fear-greed-factor-desc">{MOCK_FACTORS.social.desc}</p>}
          </div>
        </div>

        <p className="fear-greed-source">{isStocks ? t('fearGreed.sourceVix') : t('fearGreed.sourceAlternative')}</p>
      </div>
    </div>
  )
}

export default FearGreedPage
