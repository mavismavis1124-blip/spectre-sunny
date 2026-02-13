/**
 * AIChartsPage – Multi-Chart Dashboard
 * 17 TradingView-powered charts in a 3-per-row grid
 * Toggle between Spectre AI (clean area) and TradingView (candle) modes
 * Each card has its own timeframe selector
 */
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SectorCompareChart from './SectorCompareChart'
import './AIChartsPage.css'

/* ── Chart configuration ── */
const CRYPTO_CHARTS_CONFIG = [
  { label: 'BTC',          symbol: 'CRYPTO:BTCUSD',       badge: 'Crypto' },
  { label: 'ETH',          symbol: 'CRYPTO:ETHUSD',       badge: 'Crypto' },
  { label: 'SOL',          symbol: 'CRYPTO:SOLUSD',       badge: 'Crypto' },
  { label: 'ALTCOINS',     symbol: 'CRYPTOCAP:TOTAL2',    badge: 'Market Cap' },
  { label: 'ETH / BTC',    symbol: 'BINANCE:ETHBTC',      badge: 'Ratio' },
  { label: 'Fear & Greed', symbol: 'CRYPTOCAP:BTC',       badge: 'Sentiment' },
  { label: 'TOTAL 1',      symbol: 'CRYPTOCAP:TOTAL',     badge: 'Market Cap' },
  { label: 'TOTAL 2',      symbol: 'CRYPTOCAP:TOTAL2',    badge: 'Market Cap' },
  { label: 'TOTAL 3',      symbol: 'CRYPTOCAP:TOTAL3',    badge: 'Market Cap' },
  { label: 'OTHERS',       symbol: 'CRYPTOCAP:OTHERS',    badge: 'Market Cap' },
  { label: 'OTHERS.D',     symbol: 'CRYPTOCAP:OTHERS.D',  badge: 'Dominance' },
  { label: 'USDT.D',       symbol: 'CRYPTOCAP:USDT.D',    badge: 'Dominance' },
  { label: 'BTC.D',        symbol: 'CRYPTOCAP:BTC.D',     badge: 'Dominance' },
  { label: 'DXY',          symbol: 'INDEX:DXY',            badge: 'Macro' },
  { label: 'SPX',          symbol: 'FOREXCOM:SPXUSD',     badge: 'Macro' },
  { label: 'GOLD',         symbol: 'OANDA:XAUUSD',        badge: 'Commodity' },
  { label: 'SILVER',       symbol: 'OANDA:XAGUSD',        badge: 'Commodity' },
]

const STOCK_CHARTS_CONFIG = [
  { label: 'SPY',   symbol: 'AMEX:SPY',     badge: 'Index' },
  { label: 'QQQ',   symbol: 'NASDAQ:QQQ',   badge: 'Index' },
  { label: 'IWM',   symbol: 'AMEX:IWM',     badge: 'Index' },
  { label: 'AAPL',  symbol: 'NASDAQ:AAPL',  badge: 'Mag 7' },
  { label: 'MSFT',  symbol: 'NASDAQ:MSFT',  badge: 'Mag 7' },
  { label: 'GOOGL', symbol: 'NASDAQ:GOOGL', badge: 'Mag 7' },
  { label: 'AMZN',  symbol: 'NASDAQ:AMZN',  badge: 'Mag 7' },
  { label: 'NVDA',  symbol: 'NASDAQ:NVDA',  badge: 'AI / Semi' },
  { label: 'META',  symbol: 'NASDAQ:META',  badge: 'Mag 7' },
  { label: 'TSLA',  symbol: 'NASDAQ:TSLA',  badge: 'Mag 7' },
  { label: 'AMD',   symbol: 'NASDAQ:AMD',   badge: 'AI / Semi' },
  { label: 'JPM',   symbol: 'NYSE:JPM',     badge: 'Finance' },
  { label: 'VIX',   symbol: 'TVC:VIX',      badge: 'Volatility' },
  { label: 'DXY',   symbol: 'INDEX:DXY',    badge: 'Macro' },
  { label: 'GOLD',  symbol: 'OANDA:XAUUSD', badge: 'Commodity' },
  { label: 'TNX',   symbol: 'TVC:TNX',      badge: 'Bonds' },
  { label: 'NFLX',  symbol: 'NASDAQ:NFLX',  badge: 'Consumer' },
]

const TIMEFRAMES = [
  { label: '1H',  interval: '60' },
  { label: '4H',  interval: '240' },
  { label: '1D',  interval: 'D' },
  { label: '1W',  interval: 'W' },
  { label: '1M',  interval: 'M' },
]

/* ── TradingView candle URL builder (for TradingView mode) ── */
const buildCandleUrl = (symbol, interval, theme, toolbarBg) =>
  `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=${toolbarBg}&studies=%5B%5D&theme=${theme}&style=1&locale=en`

/* ── Spectre AI area URL builder (widgetembed style=3, sharp area with price scale) ── */
const buildSpectreUrl = (symbol, interval, theme, toolbarBg) =>
  `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=${toolbarBg}&studies=%5B%5D&hidevolume=1&theme=${theme}&style=3&locale=en&hide_legend=0&withdateranges=0&allow_symbol_change=0`

/* ── Unified Chart Card with per-card timeframe selector ── */
const ChartCard = React.memo(({ chart, mode, globalTfIndex, theme, toolbarBg }) => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [localTfIndex, setLocalTfIndex] = useState(null) // null = use global
  const cardRef = useRef(null)

  const tfIndex = localTfIndex !== null ? localTfIndex : globalTfIndex
  const interval = TIMEFRAMES[tfIndex].interval

  // Lazy loading
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Reset local override when global changes
  useEffect(() => { setLocalTfIndex(null) }, [globalTfIndex])

  const isSpectre = mode === 'spectre'
  const symbol = isSpectre ? (chart.spectreSymbol || chart.symbol) : chart.symbol
  const src = isVisible
    ? (isSpectre ? buildSpectreUrl(symbol, interval, theme, toolbarBg)
                 : buildCandleUrl(symbol, interval, theme, toolbarBg))
    : null

  return (
    <div className={`ai-chart-card ${isSpectre ? 'spectre-mode' : ''}`} ref={cardRef}>
      <div className="ai-chart-card-header">
        <span className="ai-chart-card-label">{chart.label}</span>
        <div className="ai-chart-card-tf">
          {TIMEFRAMES.map((tf, i) => (
            <button
              key={tf.label}
              className={`ai-chart-card-tf-btn ${tfIndex === i ? 'active' : ''}`}
              onClick={() => setLocalTfIndex(i)}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <span className="ai-chart-card-badge">{chart.badge}</span>
      </div>
      <div className={`ai-chart-card-body ${isSpectre ? 'spectre-body' : ''}`}>
        {src ? (
          <iframe
            title={`${chart.label} chart`}
            src={src}
            allow="autoplay; fullscreen"
            loading="lazy"
          />
        ) : (
          <div className="ai-chart-card-placeholder">{t('aiCharts.loading')}</div>
        )}
      </div>
    </div>
  )
})

/* ── Main page ── */
const AIChartsPage = ({ dayMode, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const isStocks = marketMode === 'stocks'
  const CHARTS_CONFIG = isStocks ? STOCK_CHARTS_CONFIG : CRYPTO_CHARTS_CONFIG
  const [mode, setMode] = useState('spectre')   // 'spectre' | 'tradingview'
  const [tfIndex, setTfIndex] = useState(2)      // default: 1D

  const theme = dayMode ? 'light' : 'dark'
  const toolbarBg = dayMode ? '%23f8fafc' : '%2313161c'

  return (
    <div className="ai-charts-page">
      {/* ── Header ── */}
      <div className="ai-charts-header">
        <div className="ai-charts-header-left">
          <h1 className="ai-charts-title">{isStocks ? 'Stock Charts' : 'AI Charts'}</h1>
        </div>

        <div className="ai-charts-header-controls">
          {/* Mode toggle */}
          <div className="ai-charts-mode-toggle">
            <button
              className={`ai-charts-mode-btn ${mode === 'spectre' ? 'active' : ''}`}
              onClick={() => setMode('spectre')}
            >
              Spectre AI
            </button>
            <button
              className={`ai-charts-mode-btn ${mode === 'tradingview' ? 'active' : ''}`}
              onClick={() => setMode('tradingview')}
            >
              TradingView
            </button>
          </div>

          {/* Global timeframe selector (sets all cards) */}
          <div className="ai-charts-timeframes">
            {TIMEFRAMES.map((tf, i) => (
              <button
                key={tf.label}
                className={`ai-charts-tf-btn ${tfIndex === i ? 'active' : ''}`}
                onClick={() => setTfIndex(i)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sector Performance Chart (crypto mode only) ── */}
      {!isStocks && (
        <SectorCompareChart dayMode={dayMode} />
      )}

      {/* ── Chart grid ── */}
      <div className="ai-charts-grid">
        {CHARTS_CONFIG.map((chart) => (
          <ChartCard
            key={chart.symbol}
            chart={chart}
            mode={mode}
            globalTfIndex={tfIndex}
            theme={theme}
            toolbarBg={toolbarBg}
          />
        ))}
      </div>
    </div>
  )
}

export default AIChartsPage
