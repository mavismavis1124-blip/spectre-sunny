/**
 * HeatmapsPage — Dual-mode crypto/stock heatmap.
 * Shows top tokens/stocks as color-coded tiles by performance,
 * with hero stats, timeframe/count filters, and fullscreen mode.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getTopCoinsMarketsPage } from '../services/coinGeckoApi'
import { getStockQuotes, getStockLogoUrl, POPULAR_STOCKS, FALLBACK_STOCK_DATA } from '../services/stockApi'
import { useBinanceTopCoinPrices } from '../hooks/useCodexData'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import { useCurrency } from '../hooks/useCurrency'
import './HeatmapsPage.css'

const formatChange = (change) => {
  const value = typeof change === 'number' ? change : parseFloat(change) || 0
  return value.toFixed(2)
}

/* ── Sector colors for stock mode ── */
const SECTOR_COLORS = {
  'Technology': '59, 130, 246',
  'Semiconductor': '0, 200, 220',
  'Financial': '234, 179, 8',
  'Healthcare': '16, 185, 129',
  'Consumer': '168, 85, 247',
  'Energy': '249, 115, 22',
  'Communication': '236, 72, 153',
  'Industrial': '107, 114, 128',
  'Automotive': '239, 68, 68',
  'RealEstate': '45, 212, 191',
  'Index': '139, 92, 246',
  'Commodity': '245, 158, 11',
}

/* ── Grid layout configs for different token counts ── */
const GRID_CONFIGS = {
  25: {
    cols: 6,
    areas: `
      "hero1 hero1 hero2 hero2 t2    t3"
      "hero1 hero1 hero2 hero2 t4    t5"
      "t6    t7    t8    t9    t10   t11"
      "t12   t13   t14   t15   t16   t17"
      "t18   t19   t20   t21   t22   t23"
      "t24   t24   .     .     .     ."`,
    minRows: 'repeat(6, minmax(80px, 1fr))',
  },
  50: {
    cols: 8,
    areas: null,
    minRows: null,
  },
  100: {
    cols: 10,
    areas: null,
    minRows: null,
  },
}

const TOKEN_COUNTS = [25, 50, 100]
const STOCK_COUNTS = [25, 50, 100]

const TIMEFRAMES = [
  { id: '1h', label: '1H', field: 'price_change_percentage_1h_in_currency' },
  { id: '24h', label: '24H', field: 'price_change_percentage_24h' },
  { id: '7d', label: '7D', field: 'price_change_percentage_7d_in_currency' },
]

const STOCK_TIMEFRAMES = [
  { id: '24h', labelKey: 'heatmaps.today', field: 'change24h' },
]

const HeatmapsPage = ({ dayMode = false, onBack, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const isStocks = marketMode === 'stocks'

  const [allTokens, setAllTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tokenCount, setTokenCount] = useState(isStocks ? 67 : 100)
  const [timeframe, setTimeframe] = useState('24h')
  const [fullscreen, setFullscreen] = useState(false)
  const [sortBy, setSortBy] = useState('market_cap') // market_cap | change | volume
  const containerRef = useRef(null)

  // Reset state when mode changes
  useEffect(() => {
    setTokenCount(isStocks ? 67 : 100)
    setTimeframe('24h')
    setSortBy('market_cap')
  }, [isStocks])

  // Get the symbols for live prices (crypto only)
  const visibleTokens = useMemo(() => allTokens.slice(0, tokenCount), [allTokens, tokenCount])
  const symbols = useMemo(() => isStocks ? [] : visibleTokens.map(t => (t.symbol || '').toUpperCase()).filter(Boolean), [visibleTokens, isStocks])
  const { prices: binancePrices } = useBinanceTopCoinPrices(isStocks ? [] : symbols, isStocks ? null : 5000)

  /* ── Fetch data based on mode ── */
  useEffect(() => {
    let cancelled = false

    const fetchCrypto = async () => {
      setLoading(true)
      setError(null)
      try {
        const page1 = await getTopCoinsMarketsPage(1, 25)
        const page2 = await getTopCoinsMarketsPage(2, 25)
        const page3 = await getTopCoinsMarketsPage(3, 25)
        const page4 = await getTopCoinsMarketsPage(4, 25)
        if (cancelled) return
        const all = [...(page1 || []), ...(page2 || []), ...(page3 || []), ...(page4 || [])]
        const mapped = all.map((coin, index) => ({
          rank: coin.market_cap_rank || index + 1,
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          logo: coin.image || null,
          price: Number(coin.current_price) || 0,
          change24h: Number(coin.price_change_percentage_24h) || 0,
          change1h: Number(coin.price_change_percentage_1h_in_currency) || 0,
          change7d: Number(coin.price_change_percentage_7d_in_currency) || 0,
          marketCap: Number(coin.market_cap) || 0,
          volume: Number(coin.total_volume) || 0,
        }))
        setAllTokens(mapped)
        setLoading(false)
      } catch (err) {
        if (!cancelled) { setError(t('common.error')); setLoading(false) }
      }
    }

    const fetchStocks = async () => {
      // Instant fallback: show static data immediately
      const fallbackMapped = POPULAR_STOCKS.map((stock, index) => {
        const fb = FALLBACK_STOCK_DATA[stock.symbol]
        return {
          rank: index + 1,
          symbol: stock.symbol,
          name: stock.name,
          logo: getStockLogoUrl(stock.symbol),
          price: fb?.price || 0,
          change24h: fb?.change || 0,
          change1h: 0,
          change7d: 0,
          marketCap: fb?.marketCap || 0,
          volume: fb?.volume || 0,
          sector: stock.sector || fb?.sector || '',
          isStock: true,
        }
      })
      setAllTokens(fallbackMapped)
      setLoading(false)

      // Then upgrade with live data
      try {
        const allSymbols = POPULAR_STOCKS.map(s => s.symbol)
        const quotes = await getStockQuotes(allSymbols)
        if (cancelled) return
        if (Object.keys(quotes).length > 0) {
          const liveMapped = POPULAR_STOCKS.map((stock, index) => {
            const q = quotes[stock.symbol]
            const fb = FALLBACK_STOCK_DATA[stock.symbol]
            return {
              rank: index + 1,
              symbol: stock.symbol,
              name: q?.name || stock.name,
              logo: getStockLogoUrl(stock.symbol),
              price: q?.price || fb?.price || 0,
              change24h: q?.change || fb?.change || 0,
              change1h: 0,
              change7d: 0,
              marketCap: q?.marketCap || fb?.marketCap || 0,
              volume: q?.volume || fb?.volume || 0,
              sector: q?.sector || stock.sector || fb?.sector || '',
              pe: q?.pe || fb?.pe || null,
              isStock: true,
            }
          })
          setAllTokens(liveMapped)
        }
      } catch (err) {
        console.warn('Stock heatmap live upgrade failed:', err.message)
      }
    }

    if (isStocks) {
      fetchStocks()
    } else {
      fetchCrypto()
    }

    const iv = setInterval(isStocks ? fetchStocks : fetchCrypto, isStocks ? 2 * 60 * 1000 : 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [isStocks])

  // Escape key closes fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const handleEsc = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [fullscreen])

  /* ── Get change value based on selected timeframe ── */
  const getChange = useCallback((token) => {
    if (isStocks) return token.change24h || 0
    if (timeframe === '1h') return token.change1h || 0
    if (timeframe === '7d') return token.change7d || 0
    return token.change24h || 0
  }, [timeframe, isStocks])

  /* ── Sorted + sized tokens ── */
  const heatmapTokens = useMemo(() => {
    let tokens = [...visibleTokens]
    if (sortBy === 'change') {
      tokens.sort((a, b) => Math.abs(getChange(b)) - Math.abs(getChange(a)))
    } else if (sortBy === 'volume') {
      tokens.sort((a, b) => (b.volume || 0) - (a.volume || 0))
    } else if (sortBy === 'sector' && isStocks) {
      tokens.sort((a, b) => (a.sector || '').localeCompare(b.sector || ''))
    }
    return tokens
  }, [visibleTokens, sortBy, getChange, isStocks])

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!heatmapTokens.length) return null
    const total = heatmapTokens.length
    const gains = heatmapTokens.filter(t => getChange(t) > 0).length
    const losses = total - gains
    const avgChange = heatmapTokens.reduce((s, t) => s + getChange(t), 0) / total
    const totalMcap = heatmapTokens.reduce((s, t) => s + (t.marketCap || 0), 0)
    const totalVol = heatmapTokens.reduce((s, t) => s + (t.volume || 0), 0)
    const best = [...heatmapTokens].sort((a, b) => getChange(b) - getChange(a))[0]
    const worst = [...heatmapTokens].sort((a, b) => getChange(a) - getChange(b))[0]
    const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'
    return { total, gains, losses, avgChange, totalMcap, totalVol, best, worst, sentiment }
  }, [heatmapTokens, getChange])

  /* ── Timeframe label ── */
  const activeTimeframes = isStocks ? STOCK_TIMEFRAMES : TIMEFRAMES
  const activeTf = activeTimeframes.find(tf => tf.id === timeframe)
  const tfLabel = activeTf?.labelKey ? t(activeTf.labelKey) : (activeTf?.label || 'Today')
  const activeCounts = isStocks ? STOCK_COUNTS : TOKEN_COUNTS

  /* ── Render heatmap grid ── */
  const renderHeatmapGrid = useCallback((isFullscreenView) => {
    const count = heatmapTokens.length
    const useNamedAreas = count <= 25
    const cols = count <= 25 ? 6 : count <= 50 ? 8 : 10

    const gridStyle = {
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
    }
    if (useNamedAreas) {
      gridStyle.gridTemplateAreas = GRID_CONFIGS[25].areas
      gridStyle.gridTemplateRows = isFullscreenView ? 'repeat(5, 1fr)' : 'repeat(5, minmax(90px, 1fr))'
    }

    return (
      <div
        className={`heatmap-grid ${isFullscreenView ? 'heatmap-grid--fullscreen' : ''} ${isStocks ? 'heatmap-grid--stocks' : ''}`}
        style={gridStyle}
      >
        {heatmapTokens.map((token, idx) => {
          const liveData = !isStocks ? (binancePrices?.[token.symbol] || binancePrices?.[token.symbol?.toUpperCase?.()] || {}) : {}
          const livePrice = isStocks ? token.price : (liveData.price > 0 ? liveData.price : token.price)
          const liveChange24h = !isStocks && liveData.change != null ? liveData.change : token.change24h
          const change = !isStocks && timeframe === '24h' ? (Number(liveChange24h) || 0) : getChange(token)
          const absChange = Math.abs(change)
          const isPositive = change >= 0
          const intensity = Math.min(1, absChange / 8)
          const bgColor = isPositive
            ? `rgba(16, 185, 129, ${0.12 + intensity * 0.3})`
            : `rgba(239, 68, 68, ${0.12 + intensity * 0.3})`
          const borderColor = isPositive
            ? `rgba(16, 185, 129, ${0.15 + intensity * 0.25})`
            : `rgba(239, 68, 68, ${0.15 + intensity * 0.25})`

          // Brand color: sector color for stocks, token color for crypto
          let brandRgb = '255, 255, 255'
          if (isStocks) {
            brandRgb = SECTOR_COLORS[token.sector] || '139, 92, 246'
          } else {
            const rowColors = TOKEN_ROW_COLORS[(token.symbol || '').toUpperCase()]
            brandRgb = rowColors?.bg || '255, 255, 255'
          }

          // Named grid areas only for first 25
          const gridArea = useNamedAreas
            ? (idx === 0 ? 'hero1' : idx === 1 ? 'hero2' : `t${idx}`)
            : undefined
          const isHero = useNamedAreas && idx < 2

          return (
            <div
              key={token.symbol || idx}
              className={`heatmap-tile ${isHero ? 'heatmap-tile--hero' : ''} ${isPositive ? 'is-positive' : 'is-negative'} ${isStocks ? 'heatmap-tile--stock' : ''}`}
              style={{
                gridArea,
                '--tile-bg': bgColor,
                '--tile-border': borderColor,
                '--tile-brand-rgb': brandRgb,
              }}
            >
              <div className="heatmap-tile-top">
                <div className={`heatmap-tile-logo ${isStocks ? 'heatmap-tile-logo--stock' : ''}`}>
                  {token.logo ? (
                    <img src={token.logo} alt={token.symbol} onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <span>{token.symbol?.[0] || '?'}</span>
                  )}
                </div>
                <span className="heatmap-tile-symbol">{token.symbol}</span>
                {isStocks && token.sector && (isHero || isFullscreenView || count <= 50) && (
                  <span className="heatmap-tile-sector" style={{ color: `rgb(${SECTOR_COLORS[token.sector] || '139,92,246'})` }}>
                    {token.sector}
                  </span>
                )}
              </div>
              {(isHero || isFullscreenView || count <= 50) && (
                <div className="heatmap-tile-name">{token.name}</div>
              )}
              <div className="heatmap-tile-bottom">
                <span className="heatmap-tile-price">
                  {livePrice ? fmtPrice(livePrice) : '—'}
                </span>
                <span className={`heatmap-tile-change ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '+' : ''}{formatChange(change)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [heatmapTokens, binancePrices, timeframe, getChange, isStocks, fmtPrice])

  /* ── Fullscreen button ── */
  const fullscreenBtn = (
    <button
      className="heatmap-fullscreen-btn"
      onClick={() => setFullscreen(f => !f)}
      title={fullscreen ? t('heatmaps.exitFullscreen') : t('heatmaps.fullscreen')}
    >
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

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <div className={`heatmaps-page ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`}>
      {/* Hero */}
      <div className="heatmaps-hero">
        <div className="heatmaps-hero-inner">
          <div className="heatmaps-hero-left">
            <h1 className="heatmaps-title">{isStocks ? t('heatmaps.stockHeatmap') : t('heatmaps.cryptoHeatmap')}</h1>
            <p className="heatmaps-subtitle">
              {isStocks
                ? `${tokenCount} stocks ${t('heatmaps.by')} ${t('heatmaps.marketCapSize')} · ${tfLabel} performance`
                : `Top ${tokenCount} tokens ${t('heatmaps.by')} ${t('heatmaps.marketCapSize')} · ${tfLabel} performance`
              }
            </p>
          </div>
          {stats && (
            <div className="heatmaps-hero-stats">
              <div className={`categories-header-sentiment bias-${stats.sentiment}`}>
                <span className="categories-hero-sent-dot" />
                {stats.sentiment.toUpperCase()}
              </div>
              <div className="heatmaps-hero-stat">
                <span className="heatmaps-hero-stat-val">{fmtLarge(stats.totalMcap)}</span>
                <span className="heatmaps-hero-stat-lbl">{t('heatmaps.totalMcap')}</span>
              </div>
              <div className="heatmaps-hero-stat-divider" />
              <div className="heatmaps-hero-stat">
                <span className={`heatmaps-hero-stat-val ${stats.avgChange >= 0 ? 'val-green' : 'val-red'}`}>
                  {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                </span>
                <span className="heatmaps-hero-stat-lbl">{t('heatmaps.avg')} {tfLabel}</span>
              </div>
              <div className="heatmaps-hero-stat-divider" />
              <div className="heatmaps-hero-stat">
                <span className="heatmaps-hero-stat-val val-green">{stats.gains}</span>
                <span className="heatmaps-hero-stat-lbl">{t('common.gainers')}</span>
              </div>
              <div className="heatmaps-hero-stat-divider" />
              <div className="heatmaps-hero-stat">
                <span className="heatmaps-hero-stat-val val-red">{stats.losses}</span>
                <span className="heatmaps-hero-stat-lbl">{t('common.losers')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="heatmaps-controls">
        <div className="heatmaps-controls-left">
          {/* Timeframe pills */}
          {!isStocks && (
            <div className="heatmaps-pill-group">
              <span className="heatmaps-pill-label">{t('heatmaps.timeframe')}</span>
              <div className="heatmaps-pills">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.id}
                    className={`heatmaps-pill ${timeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf.id)}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Token count pills */}
          <div className="heatmaps-pill-group">
            <span className="heatmaps-pill-label">{isStocks ? t('nav.stocks') : t('common.tokens')}</span>
            <div className="heatmaps-pills">
              {activeCounts.map(c => (
                <button
                  key={c}
                  className={`heatmaps-pill ${tokenCount === c ? 'active' : ''}`}
                  onClick={() => setTokenCount(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Sort pills */}
          <div className="heatmaps-pill-group">
            <span className="heatmaps-pill-label">{t('heatmaps.sort')}</span>
            <div className="heatmaps-pills">
              <button className={`heatmaps-pill ${sortBy === 'market_cap' ? 'active' : ''}`} onClick={() => setSortBy('market_cap')}>{t('common.marketCap')}</button>
              <button className={`heatmaps-pill ${sortBy === 'change' ? 'active' : ''}`} onClick={() => setSortBy('change')}>{t('heatmaps.change')}</button>
              <button className={`heatmaps-pill ${sortBy === 'volume' ? 'active' : ''}`} onClick={() => setSortBy('volume')}>{t('common.volume')}</button>
              {isStocks && (
                <button className={`heatmaps-pill ${sortBy === 'sector' ? 'active' : ''}`} onClick={() => setSortBy('sector')}>{t('heatmaps.sector')}</button>
              )}
            </div>
          </div>
        </div>

        <div className="heatmaps-controls-right">
          {fullscreenBtn}
        </div>
      </div>

      {/* Heatmap */}
      {loading ? (
        <div className="heatmaps-loading">
          <div className="heatmaps-loading-spinner" />
          <span>{t('common.loading')}</span>
        </div>
      ) : error ? (
        <div className="heatmaps-error">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      ) : (
        <div className="heatmaps-grid-container" ref={containerRef}>
          {renderHeatmapGrid(false)}
        </div>
      )}

      {/* Top movers strip */}
      {stats && stats.best && (
        <div className="heatmaps-movers">
          <div className="heatmaps-mover-item">
            <span className="heatmaps-mover-label">{t('heatmaps.topGainer')}</span>
            <span className="heatmaps-mover-token">
              {stats.best.logo && <img src={stats.best.logo} alt="" className={`heatmaps-mover-logo ${isStocks ? 'heatmaps-mover-logo--stock' : ''}`} />}
              {stats.best.symbol}
            </span>
            <span className="heatmaps-mover-change pos">+{formatChange(getChange(stats.best))}%</span>
          </div>
          <div className="heatmaps-movers-divider" />
          <div className="heatmaps-mover-item">
            <span className="heatmaps-mover-label">{t('heatmaps.topLoser')}</span>
            <span className="heatmaps-mover-token">
              {stats.worst.logo && <img src={stats.worst.logo} alt="" className={`heatmaps-mover-logo ${isStocks ? 'heatmaps-mover-logo--stock' : ''}`} />}
              {stats.worst.symbol}
            </span>
            <span className="heatmaps-mover-change neg">{formatChange(getChange(stats.worst))}%</span>
          </div>
          <div className="heatmaps-movers-divider" />
          <div className="heatmaps-mover-item">
            <span className="heatmaps-mover-label">{isStocks ? t('common.volume') : t('common.volume24h')}</span>
            <span className="heatmaps-mover-val">{fmtLarge(stats.totalVol)}</span>
          </div>
        </div>
      )}

      {/* Fullscreen portal */}
      {fullscreen && createPortal(
        <div className="heatmaps-fullscreen-overlay" onClick={() => setFullscreen(false)}>
          <div className={`heatmaps-fullscreen-container ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="heatmaps-fullscreen-toolbar">
              <span className="heatmaps-fullscreen-title">
                Spectre {isStocks ? t('heatmaps.stockHeatmap') : t('heatmaps.cryptoHeatmap')} · {isStocks ? '' : `${t('heatmaps.top')} `}{tokenCount}
              </span>
              <div className="heatmaps-fullscreen-controls">
                {!isStocks && TIMEFRAMES.map(tf => (
                  <button
                    key={tf.id}
                    className={`heatmaps-pill ${timeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf.id)}
                  >
                    {tf.label}
                  </button>
                ))}
                {!isStocks && <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />}
                {activeCounts.map(c => (
                  <button
                    key={c}
                    className={`heatmaps-pill ${tokenCount === c ? 'active' : ''}`}
                    onClick={() => setTokenCount(c)}
                  >
                    {c}
                  </button>
                ))}
                {fullscreenBtn}
              </div>
            </div>
            {renderHeatmapGrid(true)}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default HeatmapsPage
