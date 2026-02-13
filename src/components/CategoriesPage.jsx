/**
 * CategoriesPage — Full-screen categories explorer with trending categories,
 * trending tokens, AI analysis widgets, and sortable data table.
 * Clicking a category shows a detail sub-view with tokens in that category.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { getCategories, getCategoryCoins } from '../services/coinGeckoApi'
import { getStockQuotes, getStockLogoUrl, POPULAR_STOCKS, FALLBACK_STOCK_DATA } from '../services/stockApi'
import './CategoriesPage.css'

/* ── Synthetic sparkline (for categories table) ── */
const CategorySparkline = ({ change }) => {
  const w = 80, h = 28, pad = 2
  const positive = (change || 0) >= 0
  const pts = 14
  const data = []
  let v = 50
  for (let i = 0; i < pts; i++) {
    const p = i / (pts - 1)
    const trend = positive ? 1 : -1
    v = Math.max(10, Math.min(90, 50 + trend * p * 22 + Math.sin(i * 0.9 + change) * 7 + Math.cos(i * 1.4) * 4))
    data.push(v)
  }
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((val - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const color = positive ? '#22c55e' : '#ef4444'
  return (
    <svg width={w} height={h} className="cat-sparkline-svg">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

/* ── Real sparkline from API price data ── */
const TokenSparkline = ({ prices, positive }) => {
  const w = 80, h = 28, pad = 2
  if (!prices || prices.length < 2) {
    return <MiniSparkline change={positive ? 5 : -5} width={w} height={h} />
  }
  const step = Math.max(1, Math.floor(prices.length / 20))
  const data = prices.filter((_, i) => i % step === 0)
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((val - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const color = positive ? '#22c55e' : '#ef4444'
  return (
    <svg width={w} height={h} className="cat-sparkline-svg">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

/* ── Mini sparkline for cards ── */
const MiniSparkline = ({ change, width = 60, height = 24 }) => {
  const positive = (change || 0) >= 0
  const pts = 10
  const data = []
  let v = 50
  for (let i = 0; i < pts; i++) {
    const p = i / (pts - 1)
    v = Math.max(15, Math.min(85, 50 + (positive ? 1 : -1) * p * 20 + Math.sin(i * 1.1 + (change || 0)) * 8))
    data.push(v)
  }
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((val, i) => {
    const x = 2 + (i / (data.length - 1)) * (width - 4)
    const y = height - 2 - ((val - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' ')
  const color = positive ? '#22c55e' : '#ef4444'
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`mg-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#mg-${positive ? 'g' : 'r'})`} points={`${points} ${width - 2},${height} 2,${height}`} />
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

/* ── Sort icon ── */
const SortIcon = ({ active, direction }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={`cat-sort-icon ${active ? 'active' : ''}`}>
    <path d="M5 1L8 4.5H2L5 1Z" fill={active && direction === 'asc' ? 'currentColor' : 'rgba(255,255,255,0.15)'} />
    <path d="M5 9L2 5.5H8L5 9Z" fill={active && direction === 'desc' ? 'currentColor' : 'rgba(255,255,255,0.15)'} />
  </svg>
)

const ITEMS_PER_PAGE = 25

const CategoriesPage = ({ dayMode = false, onBack, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const isStocks = marketMode === 'stocks'

  // ── Categories list state ──
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('market_cap')
  const [sortDirection, setSortDirection] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const trendingRef = useRef(null)
  const tableRef = useRef(null)

  // ── Category detail sub-view state ──
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryCoins, setCategoryCoins] = useState([])
  const [categoryCoinsLoading, setCategoryCoinsLoading] = useState(false)
  const [categoryCoinsError, setCategoryCoinsError] = useState(null)
  const [categoryCoinsPage, setCategoryCoinsPage] = useState(1)
  const [coinSearchQuery, setCoinSearchQuery] = useState('')
  const [coinSortField, setCoinSortField] = useState('market_cap')
  const [coinSortDir, setCoinSortDir] = useState('desc')
  const detailTableRef = useRef(null)

  /* ── Fetch categories (crypto) or build sectors (stocks) ── */
  useEffect(() => {
    let cancelled = false

    const fetchCryptoCategories = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getCategories()
        if (!cancelled) { setCategories(data); setLoading(false) }
      } catch (err) {
        if (!cancelled) { setError(t('errors.failedToLoad')); setLoading(false) }
      }
    }

    const fetchStockSectors = async () => {
      // Instant: build sectors from POPULAR_STOCKS + FALLBACK_STOCK_DATA
      const sectorMap = {}
      POPULAR_STOCKS.forEach(stock => {
        const sector = stock.sector || 'Other'
        if (!sectorMap[sector]) sectorMap[sector] = { stocks: [] }
        const fb = FALLBACK_STOCK_DATA[stock.symbol]
        sectorMap[sector].stocks.push({
          symbol: stock.symbol,
          name: stock.name,
          price: fb?.price || 0,
          change: fb?.change || 0,
          marketCap: fb?.marketCap || 0,
          volume: fb?.volume || 0,
          sector,
          logo: getStockLogoUrl(stock.symbol),
        })
      })

      const sectorCategories = Object.entries(sectorMap).map(([sector, data]) => {
        const stocks = data.stocks
        const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0)
        const totalVol = stocks.reduce((s, st) => s + (st.volume || 0), 0)
        const avgChange = stocks.length > 0
          ? stocks.reduce((s, st) => s + (st.change || 0), 0) / stocks.length
          : 0
        return {
          id: sector.toLowerCase().replace(/\s+/g, '-'),
          name: sector,
          market_cap: totalMcap,
          volume_24h: totalVol,
          market_cap_change_24h: avgChange,
          top_3_coins: stocks.slice(0, 3).map(s => getStockLogoUrl(s.symbol)),
          stockCount: stocks.length,
          stocks,
          isStockSector: true,
        }
      }).sort((a, b) => b.market_cap - a.market_cap)

      if (!cancelled) {
        setCategories(sectorCategories)
        setLoading(false)
      }

      // Upgrade with live prices
      try {
        const allSymbols = POPULAR_STOCKS.map(s => s.symbol)
        const quotes = await getStockQuotes(allSymbols)
        if (cancelled || Object.keys(quotes).length === 0) return

        const liveSectorMap = {}
        POPULAR_STOCKS.forEach(stock => {
          const sector = stock.sector || 'Other'
          if (!liveSectorMap[sector]) liveSectorMap[sector] = { stocks: [] }
          const q = quotes[stock.symbol]
          const fb = FALLBACK_STOCK_DATA[stock.symbol]
          liveSectorMap[sector].stocks.push({
            symbol: stock.symbol,
            name: q?.name || stock.name,
            price: q?.price || fb?.price || 0,
            change: q?.change || fb?.change || 0,
            marketCap: q?.marketCap || fb?.marketCap || 0,
            volume: q?.volume || fb?.volume || 0,
            sector,
            pe: q?.pe || fb?.pe || null,
            logo: getStockLogoUrl(stock.symbol),
          })
        })

        const liveSectorCategories = Object.entries(liveSectorMap).map(([sector, data]) => {
          const stocks = data.stocks
          const totalMcap = stocks.reduce((s, st) => s + (st.marketCap || 0), 0)
          const totalVol = stocks.reduce((s, st) => s + (st.volume || 0), 0)
          const avgChange = stocks.length > 0
            ? stocks.reduce((s, st) => s + (st.change || 0), 0) / stocks.length
            : 0
          return {
            id: sector.toLowerCase().replace(/\s+/g, '-'),
            name: sector,
            market_cap: totalMcap,
            volume_24h: totalVol,
            market_cap_change_24h: avgChange,
            top_3_coins: stocks.slice(0, 3).map(s => getStockLogoUrl(s.symbol)),
            stockCount: stocks.length,
            stocks,
            isStockSector: true,
          }
        }).sort((a, b) => b.market_cap - a.market_cap)

        setCategories(liveSectorCategories)
      } catch (err) {
        console.warn('Stock sectors live upgrade failed:', err.message)
      }
    }

    if (isStocks) {
      fetchStockSectors()
    } else {
      fetchCryptoCategories()
    }

    const iv = setInterval(isStocks ? fetchStockSectors : fetchCryptoCategories, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [isStocks])

  /* ── Fetch category coins when detail view active ── */
  useEffect(() => {
    if (!selectedCategory) return
    let cancelled = false

    if (isStocks && selectedCategory.isStockSector) {
      // Stock mode: stocks are already in the category object
      const stocks = selectedCategory.stocks || []
      const mapped = stocks.map((st, i) => ({
        id: st.symbol,
        symbol: st.symbol,
        name: st.name,
        image: st.logo || getStockLogoUrl(st.symbol),
        current_price: st.price,
        price_change_percentage_24h: st.change,
        price_change_percentage_7d_in_currency: 0,
        market_cap: st.marketCap,
        total_volume: st.volume,
        market_cap_rank: i + 1,
        pe: st.pe,
        sector: st.sector,
        sparkline_in_7d: null,
        isStock: true,
      }))
      setCategoryCoins(mapped)
      setCategoryCoinsLoading(false)
      return
    }

    const fetchCoins = async () => {
      setCategoryCoinsLoading(true)
      setCategoryCoinsError(null)
      try {
        const data = await getCategoryCoins(selectedCategory.id, categoryCoinsPage, 25)
        if (!cancelled) { setCategoryCoins(data); setCategoryCoinsLoading(false) }
      } catch (err) {
        if (!cancelled) { setCategoryCoinsError(t('errors.failedToLoad')); setCategoryCoinsLoading(false) }
      }
    }
    fetchCoins()
    return () => { cancelled = true }
  }, [selectedCategory, categoryCoinsPage, isStocks])

  // Reset coin page when category changes
  useEffect(() => {
    setCategoryCoinsPage(1)
    setCategoryCoins([])
    setCoinSearchQuery('')
    setCoinSortField('market_cap')
    setCoinSortDir('desc')
  }, [selectedCategory?.id])

  /* ── Category list sort handler ── */
  const handleSort = useCallback((field) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(d => d === 'desc' ? 'asc' : 'desc')
        return field
      }
      setSortDirection('desc')
      return field
    })
  }, [])

  /* ── Coin sort handler ── */
  const handleCoinSort = useCallback((field) => {
    setCoinSortField(prev => {
      if (prev === field) {
        setCoinSortDir(d => d === 'desc' ? 'asc' : 'desc')
        return field
      }
      setCoinSortDir('desc')
      return field
    })
  }, [])

  /* ── Filter + sort categories ── */
  const filteredCategories = useMemo(() => {
    let result = [...categories]
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(c => (c.name || '').toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '')
        return sortDirection === 'asc' ? cmp : -cmp
      }
      const aVal = a[sortField] || 0
      const bVal = b[sortField] || 0
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
    })
    return result
  }, [categories, searchQuery, sortField, sortDirection])

  /* ── Categories pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const paginatedCategories = filteredCategories.slice(pageStart, pageStart + ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortField, sortDirection])

  const goToPage = useCallback((page) => {
    const p = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(p)
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [totalPages])

  const getPageNumbers = useCallback(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, safeCurrentPage])

  /* ── Derived data for category list widgets ── */
  const trendingCategories = useMemo(() => {
    if (!categories.length) return []
    return [...categories]
      .filter(c => c.market_cap > 0)
      .sort((a, b) => Math.abs(b.market_cap_change_24h || 0) - Math.abs(a.market_cap_change_24h || 0))
      .slice(0, 12)
  }, [categories])

  const topGainers = useMemo(() => {
    if (!categories.length) return []
    return [...categories]
      .filter(c => (c.market_cap_change_24h || 0) > 0 && c.market_cap > 100000000)
      .sort((a, b) => (b.market_cap_change_24h || 0) - (a.market_cap_change_24h || 0))
      .slice(0, 5)
  }, [categories])

  const topLosers = useMemo(() => {
    if (!categories.length) return []
    return [...categories]
      .filter(c => (c.market_cap_change_24h || 0) < 0 && c.market_cap > 100000000)
      .sort((a, b) => (a.market_cap_change_24h || 0) - (b.market_cap_change_24h || 0))
      .slice(0, 5)
  }, [categories])

  const aiInsight = useMemo(() => {
    if (!categories.length) return null
    const total = categories.filter(c => c.market_cap > 0).length
    const bullish = categories.filter(c => (c.market_cap_change_24h || 0) > 0).length
    const bearish = total - bullish
    const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0
    const avgChange = categories.reduce((s, c) => s + (c.market_cap_change_24h || 0), 0) / (total || 1)
    const topCat = [...categories].filter(c => c.market_cap > 0).sort((a, b) => (b.market_cap_change_24h || 0) - (a.market_cap_change_24h || 0))[0]
    const bottomCat = [...categories].filter(c => c.market_cap > 0).sort((a, b) => (a.market_cap_change_24h || 0) - (b.market_cap_change_24h || 0))[0]
    const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'
    return { total, bullish, bearish, bullPct, avgChange, topCat, bottomCat, sentiment }
  }, [categories])

  /* ── Derived data for category detail view ── */
  const trendingInCategory = useMemo(() => {
    if (!categoryCoins.length) return []
    return [...categoryCoins]
      .filter(c => c.current_price > 0)
      .sort((a, b) => Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0))
      .slice(0, 10)
  }, [categoryCoins])

  const categoryAiInsight = useMemo(() => {
    if (!categoryCoins.length) return null
    const coins = categoryCoins.filter(c => c.current_price > 0)
    const total = coins.length
    const bullish = coins.filter(c => (c.price_change_percentage_24h || 0) > 0).length
    const bearish = total - bullish
    const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0
    const avgChange = coins.reduce((s, c) => s + (c.price_change_percentage_24h || 0), 0) / (total || 1)
    const topCoin = [...coins].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0]
    const bottomCoin = [...coins].sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))[0]
    const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'
    return { total, bullish, bearish, bullPct, avgChange, topCoin, bottomCoin, sentiment }
  }, [categoryCoins])

  const sortedCategoryCoins = useMemo(() => {
    let coins = [...categoryCoins]
    if (coinSearchQuery.trim()) {
      const q = coinSearchQuery.trim().toLowerCase()
      coins = coins.filter(c => (c.name || '').toLowerCase().includes(q) || (c.symbol || '').toLowerCase().includes(q))
    }
    coins.sort((a, b) => {
      if (coinSortField === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '')
        return coinSortDir === 'asc' ? cmp : -cmp
      }
      const aVal = a[coinSortField] || 0
      const bVal = b[coinSortField] || 0
      return coinSortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    return coins
  }, [categoryCoins, coinSearchQuery, coinSortField, coinSortDir])

  const isLastCoinPage = categoryCoins.length < 25

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <div className={`categories-page ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`}>

      {/* ═══════════════════════════════════════════════════
          CATEGORY DETAIL VIEW
          ═══════════════════════════════════════════════════ */}
      {selectedCategory ? (
        <>
          {/* Detail Hero */}
          <div className="catdetail-hero">
            <div className="catdetail-hero-inner">
              <div className="catdetail-hero-left">
                <button type="button" className="catdetail-back-btn" onClick={() => setSelectedCategory(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  {t('categories.allCategories')}
                </button>
                <div className="catdetail-title-row">
                  <div className="catdetail-logos">
                    {(selectedCategory.top_3_coins || []).slice(0, 3).map((img, i) => (
                      <img key={i} src={img} alt="" className="catdetail-logo" onError={(e) => { e.target.style.display = 'none' }} />
                    ))}
                  </div>
                  <h1 className="catdetail-title">{selectedCategory.name}</h1>
                </div>
              </div>
              <div className="catdetail-hero-stats">
                <div className="catdetail-hero-stat">
                  <span className="catdetail-hero-stat-val">{fmtLarge(selectedCategory.market_cap || 0)}</span>
                  <span className="catdetail-hero-stat-lbl">{t('common.marketCap')}</span>
                </div>
                <div className="catdetail-hero-stat-divider" />
                <div className="catdetail-hero-stat">
                  <span className={`catdetail-hero-stat-val ${(selectedCategory.market_cap_change_24h || 0) >= 0 ? 'val-green' : 'val-red'}`}>
                    {(selectedCategory.market_cap_change_24h || 0) >= 0 ? '+' : ''}{(selectedCategory.market_cap_change_24h || 0).toFixed(1)}%
                  </span>
                  <span className="catdetail-hero-stat-lbl">{t('common.change24h')}</span>
                </div>
                <div className="catdetail-hero-stat-divider" />
                <div className="catdetail-hero-stat">
                  <span className="catdetail-hero-stat-val">{fmtLarge(selectedCategory.volume_24h || 0)}</span>
                  <span className="catdetail-hero-stat-lbl">{t('common.volume24h')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trending tokens in category */}
          {trendingInCategory.length > 0 && (
            <div className="categories-widgets" style={{ marginBottom: 20 }}>
              <div className="cat-section">
                <h3 className="cat-section-title">{t('common.trending')} in {selectedCategory.name}</h3>
                <div className="cat-trending-scroll">
                  {trendingInCategory.map((coin) => {
                    const ch = coin.price_change_percentage_24h || 0
                    return (
                      <div key={coin.id} className="cat-trending-card catdetail-token-card">
                        <img src={coin.image} alt="" className="catdetail-token-card-logo" onError={(e) => { e.target.style.display = 'none' }} />
                        <div className="cat-trending-name">{coin.name}</div>
                        <div className="catdetail-token-card-symbol">{(coin.symbol || '').toUpperCase()}</div>
                        <div className="cat-trending-bottom">
                          <span className={`cat-trending-change ${ch >= 0 ? 'pos' : 'neg'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(1)}%</span>
                          <MiniSparkline change={ch} width={48} height={20} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis for this category */}
          {categoryAiInsight && (
            <div className="categories-widgets" style={{ marginBottom: 20 }}>
              <div className="cat-widgets-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="cat-widget cat-widget-ai">
                  <div className="cat-widget-header cat-header-ai">
                    <span className="cat-widget-header-title">{t('categories.aiAnalysis')}</span>
                    <span className="cat-ai-live"><span className="cat-ai-live-dot" />{t('ticker.live')}</span>
                  </div>
                  <div className="cat-ai-body">
                    <div className="cat-ai-terminal">
                      <p className="cat-ai-line"><span className="cat-ai-prompt">$</span> <span className="cat-ai-cmd">analyze --category &quot;{selectedCategory.name}&quot;</span></p>
                      <p className="cat-ai-output">
                        {categoryAiInsight.sentiment === 'bullish' ? t('categories.bullish') : categoryAiInsight.sentiment === 'bearish' ? t('categories.bearish') : t('categories.neutral')} {t('categories.sentimentAcross', { count: categoryAiInsight.total, type: t('categories.tokens') })}.
                        {' '}{t('categories.tokensPositive', { bullish: categoryAiInsight.bullish, bullPct: categoryAiInsight.bullPct, bearish: categoryAiInsight.bearish })}.
                        {' '}{t('categories.avgChange', { change: `${categoryAiInsight.avgChange >= 0 ? '+' : ''}${categoryAiInsight.avgChange.toFixed(2)}` })}.
                      </p>
                      {categoryAiInsight.topCoin && (
                        <p className="cat-ai-output">
                          <span className="cat-ai-highlight-green">{t('categories.topPerformer')}:</span> {categoryAiInsight.topCoin.name} ({(categoryAiInsight.topCoin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(categoryAiInsight.topCoin.price_change_percentage_24h || 0).toFixed(1)}%).
                          {' '}<span className="cat-ai-highlight-red">{t('categories.worstPerformer')}:</span> {categoryAiInsight.bottomCoin?.name} ({(categoryAiInsight.bottomCoin?.price_change_percentage_24h || 0).toFixed(1)}%).
                        </p>
                      )}
                    </div>
                    <div className="cat-ai-meter">
                      <div className="cat-ai-meter-labels"><span>Bear</span><span>Bull</span></div>
                      <div className="cat-ai-meter-track">
                        <div className="cat-ai-meter-fill" style={{ width: `${categoryAiInsight.bullPct}%` }} />
                        <div className="cat-ai-meter-thumb" style={{ left: `${categoryAiInsight.bullPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Token table */}
          <div className="categories-table-section">
            <div className="categories-controls">
              <div className="categories-search-wrap">
                <svg className="categories-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="categories-search"
                  type="text"
                  placeholder={`Search in ${selectedCategory.name}...`}
                  value={coinSearchQuery}
                  onChange={(e) => setCoinSearchQuery(e.target.value)}
                />
                {coinSearchQuery && (
                  <button type="button" className="categories-search-clear" onClick={() => setCoinSearchQuery('')} aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="categories-count">
                {sortedCategoryCoins.length} tokens · Page {categoryCoinsPage}
              </div>
            </div>

            {categoryCoinsLoading ? (
              <div className="categories-loading">
                <div className="categories-loading-spinner" />
                <span>{t('categories.loadingTokens')}</span>
              </div>
            ) : categoryCoinsError ? (
              <div className="categories-error">
                <span>{categoryCoinsError}</span>
                <button type="button" onClick={() => setCategoryCoinsPage(p => p)}>{t('common.retry')}</button>
              </div>
            ) : (
              <>
              <div className="categories-table-wrap" ref={detailTableRef}>
                <div className="categories-table">
                  <div className="categories-table-header catdetail-tokens-header">
                    <span className="cat-col catdetail-col-rank">#</span>
                    <span className="cat-col catdetail-col-name" onClick={() => handleCoinSort('name')}>
                      {t('common.name')} <SortIcon active={coinSortField === 'name'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-price" onClick={() => handleCoinSort('current_price')}>
                      {t('common.price')} <SortIcon active={coinSortField === 'current_price'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-change" onClick={() => handleCoinSort('price_change_percentage_24h')}>
                      24h % <SortIcon active={coinSortField === 'price_change_percentage_24h'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-change7d" onClick={() => handleCoinSort('price_change_percentage_7d_in_currency')}>
                      7d % <SortIcon active={coinSortField === 'price_change_percentage_7d_in_currency'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-mcap" onClick={() => handleCoinSort('market_cap')}>
                      {t('common.marketCap')} <SortIcon active={coinSortField === 'market_cap'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-vol" onClick={() => handleCoinSort('total_volume')}>
                      {t('common.volume24h')} <SortIcon active={coinSortField === 'total_volume'} direction={coinSortDir} />
                    </span>
                    <span className="cat-col catdetail-col-spark">{t('categories.last7Days')}</span>
                  </div>

                  {sortedCategoryCoins.map((coin, index) => {
                    const ch24 = coin.price_change_percentage_24h || 0
                    const ch7d = coin.price_change_percentage_7d_in_currency || 0
                    const sparkPrices = coin.sparkline_in_7d?.price || null
                    return (
                      <div key={coin.id} className="categories-table-row catdetail-tokens-row">
                        <span className="cat-col catdetail-col-rank">{coin.market_cap_rank || ((categoryCoinsPage - 1) * 25 + index + 1)}</span>
                        <div className="cat-col catdetail-col-name">
                          <img src={coin.image} alt="" className="catdetail-coin-logo" onError={(e) => { e.target.style.display = 'none' }} />
                          <div className="catdetail-coin-meta">
                            <span className="cat-name-text">{coin.name}</span>
                            <span className="catdetail-coin-symbol">{(coin.symbol || '').toUpperCase()}</span>
                          </div>
                        </div>
                        <span className="cat-col catdetail-col-price">{fmtPrice(coin.current_price)}</span>
                        <span className={`cat-col catdetail-col-change ${ch24 >= 0 ? 'positive' : 'negative'}`}>
                          {ch24 >= 0 ? '+' : ''}{ch24.toFixed(1)}%
                        </span>
                        <span className={`cat-col catdetail-col-change7d ${ch7d >= 0 ? 'positive' : 'negative'}`}>
                          {ch7d >= 0 ? '+' : ''}{ch7d.toFixed(1)}%
                        </span>
                        <span className="cat-col catdetail-col-mcap">{coin.market_cap ? fmtLarge(coin.market_cap) : '—'}</span>
                        <span className="cat-col catdetail-col-vol">{coin.total_volume ? fmtLarge(coin.total_volume) : '—'}</span>
                        <div className="cat-col catdetail-col-spark">
                          <TokenSparkline prices={sparkPrices} positive={ch7d >= 0} />
                        </div>
                      </div>
                    )
                  })}

                  {sortedCategoryCoins.length === 0 && !categoryCoinsLoading && (
                    <div className="categories-empty">No tokens found{coinSearchQuery ? ` for "${coinSearchQuery}"` : ''}</div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              <div className="categories-pagination">
                <button
                  className="cat-page-btn cat-page-nav"
                  disabled={categoryCoinsPage === 1}
                  onClick={() => { setCategoryCoinsPage(p => p - 1); detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                  title="Previous page"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="cat-page-num active" style={{ padding: '0 12px', minWidth: 'auto' }}>Page {categoryCoinsPage}</span>
                <button
                  className="cat-page-btn cat-page-nav"
                  disabled={isLastCoinPage}
                  onClick={() => { setCategoryCoinsPage(p => p + 1); detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                  title="Next page"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              </>
            )}
          </div>
        </>

      ) : (

        /* ═══════════════════════════════════════════════════
           CATEGORIES LIST VIEW (existing)
           ═══════════════════════════════════════════════════ */
        <>
          {/* Header row */}
          <div className="categories-header-row">
            <h1 className="categories-page-title">{isStocks ? t('categories.stockSectors') : t('categories.title')}</h1>
            {aiInsight && (
              <div className="categories-header-stats">
                <div className={`categories-header-sentiment bias-${aiInsight.sentiment}`}>
                  <span className="categories-hero-sent-dot" />
                  {aiInsight.sentiment.toUpperCase()}
                </div>
                <div className="categories-header-stat">
                  <span className="categories-header-stat-val">{aiInsight.bullPct}%</span>
                  <span className="categories-header-stat-lbl">{t('categories.bullish')}</span>
                </div>
                <div className="categories-header-stat-divider" />
                <div className="categories-header-stat">
                  <span className={`categories-header-stat-val ${aiInsight.avgChange >= 0 ? 'val-green' : 'val-red'}`}>{aiInsight.avgChange >= 0 ? '+' : ''}{aiInsight.avgChange.toFixed(1)}%</span>
                  <span className="categories-header-stat-lbl">{t('categories.avg24h')}</span>
                </div>
                <div className="categories-header-stat-divider" />
                <div className="categories-header-stat">
                  <span className="categories-header-stat-val">{aiInsight.total}</span>
                  <span className="categories-header-stat-lbl">{t('categories.total')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Widgets */}
          <div className="categories-widgets">
            {/* Trending Categories */}
            <div className="cat-section">
              <h3 className="cat-section-title">{t('common.trending')}</h3>
              <div className="cat-trending-scroll" ref={trendingRef}>
                {trendingCategories.map((cat) => {
                  const ch = cat.market_cap_change_24h || 0
                  return (
                    <div key={cat.id} className="cat-trending-card" onClick={() => setSelectedCategory(cat)}>
                      <div className="cat-trending-logos">
                        {(cat.top_3_coins || []).slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt="" className="cat-trending-logo" onError={(e) => { e.target.style.display = 'none' }} />
                        ))}
                      </div>
                      <div className="cat-trending-name">{cat.name}</div>
                      <div className="cat-trending-bottom">
                        <span className={`cat-trending-change ${ch >= 0 ? 'pos' : 'neg'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(1)}%</span>
                        <MiniSparkline change={ch} width={48} height={20} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gainers / Losers + AI Analysis */}
            <div className="cat-widgets-row">
              {/* Top Gainers */}
              <div className="cat-widget cat-widget-movers">
                <div className="cat-widget-header cat-header-gainers">
                  <span className="cat-widget-header-title">{t('welcome.topGainers')}</span>
                </div>
                <div className="cat-movers-list">
                  {topGainers.map((cat, i) => {
                    const ch = cat.market_cap_change_24h || 0
                    return (
                      <div key={cat.id} className="cat-mover-row" onClick={() => setSelectedCategory(cat)}>
                        <span className="cat-mover-rank">{i + 1}</span>
                        <div className="cat-mover-logos">
                          {(cat.top_3_coins || []).slice(0, 2).map((img, j) => (
                            <img key={j} src={img} alt="" className="cat-mover-logo" onError={(e) => { e.target.style.display = 'none' }} />
                          ))}
                        </div>
                        <span className="cat-mover-name">{cat.name}</span>
                        <span className="cat-mover-change pos">+{ch.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                  {topGainers.length === 0 && <div className="cat-movers-empty">No gainers</div>}
                </div>
              </div>

              {/* Top Losers */}
              <div className="cat-widget cat-widget-movers">
                <div className="cat-widget-header cat-header-losers">
                  <span className="cat-widget-header-title">{t('welcome.topLosers')}</span>
                </div>
                <div className="cat-movers-list">
                  {topLosers.map((cat, i) => {
                    const ch = cat.market_cap_change_24h || 0
                    return (
                      <div key={cat.id} className="cat-mover-row" onClick={() => setSelectedCategory(cat)}>
                        <span className="cat-mover-rank">{i + 1}</span>
                        <div className="cat-mover-logos">
                          {(cat.top_3_coins || []).slice(0, 2).map((img, j) => (
                            <img key={j} src={img} alt="" className="cat-mover-logo" onError={(e) => { e.target.style.display = 'none' }} />
                          ))}
                        </div>
                        <span className="cat-mover-name">{cat.name}</span>
                        <span className="cat-mover-change neg">{ch.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                  {topLosers.length === 0 && <div className="cat-movers-empty">No losers</div>}
                </div>
              </div>

              {/* AI Category Analysis */}
              <div className="cat-widget cat-widget-ai">
                <div className="cat-widget-header cat-header-ai">
                  <span className="cat-widget-header-title">{t('categories.aiAnalysis')}</span>
                  <span className="cat-ai-live"><span className="cat-ai-live-dot" />{t('ticker.live')}</span>
                </div>
                {aiInsight ? (
                  <div className="cat-ai-body">
                    <div className="cat-ai-terminal">
                      <p className="cat-ai-line"><span className="cat-ai-prompt">$</span> <span className="cat-ai-cmd">analyze --categories</span></p>
                      <p className="cat-ai-output">
                        Market shows {aiInsight.sentiment} sentiment across {aiInsight.total} categories.
                        {' '}{aiInsight.bullish} categories are positive ({aiInsight.bullPct}%), {aiInsight.bearish} are negative.
                        {' '}Average change is {aiInsight.avgChange >= 0 ? '+' : ''}{aiInsight.avgChange.toFixed(2)}%.
                      </p>
                      {aiInsight.topCat && (
                        <p className="cat-ai-output">
                          <span className="cat-ai-highlight-green">Best performer:</span> {aiInsight.topCat.name} ({aiInsight.topCat.market_cap_change_24h >= 0 ? '+' : ''}{(aiInsight.topCat.market_cap_change_24h || 0).toFixed(1)}%).
                          {' '}<span className="cat-ai-highlight-red">Worst performer:</span> {aiInsight.bottomCat?.name} ({(aiInsight.bottomCat?.market_cap_change_24h || 0).toFixed(1)}%).
                        </p>
                      )}
                    </div>
                    <div className="cat-ai-meter">
                      <div className="cat-ai-meter-labels"><span>Bear</span><span>Bull</span></div>
                      <div className="cat-ai-meter-track">
                        <div className="cat-ai-meter-fill" style={{ width: `${aiInsight.bullPct}%` }} />
                        <div className="cat-ai-meter-thumb" style={{ left: `${aiInsight.bullPct}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="cat-ai-body"><div className="categories-loading-spinner" /></div>
                )}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="categories-table-section">
            <div className="categories-controls">
              <div className="categories-search-wrap">
                <svg className="categories-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="categories-search"
                  type="text"
                  placeholder={isStocks ? t('categories.searchSectors') : t('categories.searchCategories')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" className="categories-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="categories-count">
                {filteredCategories.length} of {categories.length} {isStocks ? 'sectors' : 'categories'} · Page {safeCurrentPage} of {totalPages}
              </div>
            </div>

            {loading ? (
              <div className="categories-loading">
                <div className="categories-loading-spinner" />
                <span>{t('categories.loadingCategories')}</span>
              </div>
            ) : error ? (
              <div className="categories-error">
                <span>{error}</span>
                <button type="button" onClick={() => window.location.reload()}>{t('common.retry')}</button>
              </div>
            ) : (
              <>
              <div className="categories-table-wrap" ref={tableRef}>
                <div className="categories-table">
                  <div className="categories-table-header">
                    <span className="cat-col cat-col-rank">#</span>
                    <span className="cat-col cat-col-name" onClick={() => handleSort('name')}>
                      {isStocks ? t('heatmaps.sector') : t('categories.category')} <SortIcon active={sortField === 'name'} direction={sortDirection} />
                    </span>
                    <span className="cat-col cat-col-top">{t('categories.topCoins')}</span>
                    <span className="cat-col cat-col-change" onClick={() => handleSort('market_cap_change_24h')}>
                      24h % <SortIcon active={sortField === 'market_cap_change_24h'} direction={sortDirection} />
                    </span>
                    <span className="cat-col cat-col-mcap" onClick={() => handleSort('market_cap')}>
                      {t('common.marketCap')} <SortIcon active={sortField === 'market_cap'} direction={sortDirection} />
                    </span>
                    <span className="cat-col cat-col-vol" onClick={() => handleSort('volume_24h')}>
                      {t('common.volume24h')} <SortIcon active={sortField === 'volume_24h'} direction={sortDirection} />
                    </span>
                    <span className="cat-col cat-col-spark">{t('categories.last7Days')}</span>
                  </div>

                  {paginatedCategories.map((cat, index) => {
                    const change = cat.market_cap_change_24h || 0
                    return (
                      <div key={cat.id} className="categories-table-row" onClick={() => setSelectedCategory(cat)}>
                        <span className="cat-col cat-col-rank">{pageStart + index + 1}</span>
                        <div className="cat-col cat-col-name"><span className="cat-name-text">{cat.name}</span></div>
                        <div className="cat-col cat-col-top">
                          <div className="cat-top-coins-stack">
                            {(cat.top_3_coins || []).slice(0, 3).map((imgUrl, i) => (
                              <img key={i} src={imgUrl} alt="" className={`cat-top-coin-img ${isStocks ? 'cat-top-coin-img--stock' : ''}`} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />
                            ))}
                          </div>
                          {isStocks && cat.stockCount && (
                            <span className="cat-stock-count">{cat.stockCount} stocks</span>
                          )}
                        </div>
                        <span className={`cat-col cat-col-change ${change >= 0 ? 'positive' : 'negative'}`}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                        <span className="cat-col cat-col-mcap">{cat.market_cap ? fmtLarge(cat.market_cap) : '—'}</span>
                        <span className="cat-col cat-col-vol">{cat.volume_24h ? fmtLarge(cat.volume_24h) : '—'}</span>
                        <div className="cat-col cat-col-spark"><CategorySparkline change={change} /></div>
                      </div>
                    )
                  })}

                  {filteredCategories.length === 0 && !loading && (
                    <div className="categories-empty">No categories found{searchQuery ? ` for "${searchQuery}"` : ''}</div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="categories-pagination">
                  <button className="cat-page-btn cat-page-nav" disabled={safeCurrentPage === 1} onClick={() => goToPage(1)} title="First page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                    </svg>
                  </button>
                  <button className="cat-page-btn cat-page-nav" disabled={safeCurrentPage === 1} onClick={() => goToPage(safeCurrentPage - 1)} title="Previous page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  {getPageNumbers().map((page, i) =>
                    page === '...' ? (
                      <span key={`ellipsis-${i}`} className="cat-page-ellipsis">...</span>
                    ) : (
                      <button
                        key={page}
                        className={`cat-page-btn cat-page-num ${page === safeCurrentPage ? 'active' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button className="cat-page-btn cat-page-nav" disabled={safeCurrentPage === totalPages} onClick={() => goToPage(safeCurrentPage + 1)} title="Next page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button className="cat-page-btn cat-page-nav" disabled={safeCurrentPage === totalPages} onClick={() => goToPage(totalPages)} title="Last page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                    </svg>
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default CategoriesPage
