/**
 * ResearchPage – GenTabs-style crypto research.
 * One view, your goal: hero + task cards (Trending / Compare / Market pulse / Deep dive) + modular blocks + sources.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCopyToast } from '../App'
import { getTokenPriceBySymbol, getTrendingTokens, getBars } from '../services/codexApi'
import { useCurrency } from '../hooks/useCurrency'
import './ResearchPage.css'

const TRENDING_NETWORKS = [1, 56, 137, 42161, 8453, 1399811149]
const TRENDING_LIMIT = 12
const TRENDING_REFRESH_MS = 5 * 60 * 1000
const CHART_SYMBOLS = ['BTC', 'ETH', 'SOL']
const CHART_DAYS = 7
const CHART_REFRESH_MS = 120000

/** Curated assets for Discover Digital Assets list (click opens research tab) */
const DISCOVERY_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
]

/** Crypto task goals (Disco-style: "Explore solar system" → our "Trending now", etc.)
 *  Labels/descriptions use i18n keys; rendered with t() inside the component. */
const RESEARCH_TASKS = [
  { id: 'trending', labelKey: 'researchPage.trendingNow', descKey: 'researchPage.seeWhatMoving' },
  { id: 'compare', labelKey: 'researchPage.compareTokens', descKey: 'researchPage.compareDesc' },
  { id: 'pulse', labelKey: 'researchPage.marketPulseLabel', descKey: 'researchPage.marketPulseDesc' },
  { id: 'deep', labelKey: 'researchPage.deepDive', descKey: 'researchPage.deepDiveDesc' },
]

const USERNAME_KEY = 'spectre-research-username'
const PROFILE_IMAGE_KEY = 'spectre-research-profile-image'
const SAVED_VIEWS_KEY = 'spectre-research-saved-views'
const TABS_STATE_KEY = 'spectre-research-tabs'
const PRICE_REFRESH_MS = 5 * 60 * 1000
const MAX_PROFILE_SIZE = 400
const MAX_PROFILE_KB = 200

const COIN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedColor_Complete.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
}

// formatPrice is now handled by fmtPrice from useCurrency hook (inside component)

const formatChange = (c) => {
  const n = typeof c === 'number' ? c : parseFloat(c) || 0
  if (n === 0 || isNaN(n)) return '0.0'
  const isDecimal = Math.abs(n) <= 1 && n !== 0
  const val = isDecimal ? n * 100 : n
  return (val >= 0 ? '' : '') + val.toFixed(1)
}

function ResearchSparkline({ bars, up }) {
  if (!bars?.length) return null
  const values = bars.map((b) => parseFloat(b.c) || 0).filter((n) => n > 0)
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 320
  const height = 100
  const pad = 4
  const w = (width - pad * 2) / (values.length - 1)
  const points = values.map((v, i) => {
    const x = pad + i * w
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })
  const pathD = `M ${points.join(' L ')}`
  const areaD = `${pathD} L ${pad + (values.length - 1) * w},${height - pad} L ${pad},${height - pad} Z`
  const stroke = up ? '#34d399' : '#f87171'
  const fill = up ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)'
  return (
    <svg className="research-chart-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dim = Math.min(img.width, img.height, MAX_PROFILE_SIZE)
      const canvas = document.createElement('canvas')
      canvas.width = dim
      canvas.height = dim
      const ctx = canvas.getContext('2d')
      const sx = Math.max(0, (img.width - dim) / 2)
      const sy = Math.max(0, (img.height - dim) / 2)
      ctx.drawImage(img, sx, sy, dim, dim, 0, 0, dim, dim)
      URL.revokeObjectURL(url)
      let q = 0.85
      const tryEmit = () => {
        const data = canvas.toDataURL('image/jpeg', q)
        if (data.length / 1024 <= MAX_PROFILE_KB || q <= 0.4) {
          resolve(data)
          return
        }
        q = Math.max(0.4, q - 0.15)
        tryEmit()
      }
      tryEmit()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })

const ResearchPage = ({ selectToken }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const { triggerCopyToast } = useCopyToast()
  const fileInputRef = useRef(null)
  const [savedName, setSavedName] = useState(() => {
    try {
      return localStorage.getItem(USERNAME_KEY) || ''
    } catch {
      return ''
    }
  })
  const [inputName, setInputName] = useState(savedName)
  const [justSaved, setJustSaved] = useState(false)
  const [learnOn, setLearnOn] = useState(false)
  const [profileImage, setProfileImage] = useState(() => {
    try {
      return localStorage.getItem(PROFILE_IMAGE_KEY) || null
    } catch {
      return null
    }
  })
  const [prices, setPrices] = useState({
    BTC: { price: null, change: null },
    ETH: { price: null, change: null },
    SOL: { price: null, change: null },
  })
  const [trendingCards, setTrendingCards] = useState([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [trendingError, setTrendingError] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [chartSymbol, setChartSymbol] = useState('BTC')
  const [chartNetworkId, setChartNetworkId] = useState(1)
  const [chartBars, setChartBars] = useState([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [researchTask, setResearchTask] = useState('trending')
  const [commandQuery, setCommandQuery] = useState('')
  const [activeRailItem, setActiveRailItem] = useState('current')
  const defaultTabs = [{ id: 'main', label: 'Research' }]
  const [tabs, setTabs] = useState(() => {
    try {
      const raw = localStorage.getItem(TABS_STATE_KEY)
      if (!raw) return defaultTabs
      const data = JSON.parse(raw)
      return Array.isArray(data.tabs) && data.tabs.length > 0 ? data.tabs : defaultTabs
    } catch {
      return defaultTabs
    }
  })
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const raw = localStorage.getItem(TABS_STATE_KEY)
      if (!raw) return 'main'
      const data = JSON.parse(raw)
      const ids = (data.tabs || []).map((t) => t.id)
      return ids.includes(data.activeTabId) ? data.activeTabId : (ids[0] ?? 'main')
    } catch {
      return 'main'
    }
  })
  const [savedViews, setSavedViews] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const trendingBlockRef = useRef(null)
  const chartBlockRef = useRef(null)
  const commandInputRef = useRef(null)
  const commandInputInlineRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(TABS_STATE_KEY, JSON.stringify({ tabs, activeTabId }))
    } catch (_) {}
  }, [tabs, activeTabId])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 900
        const el = isNarrow ? commandInputInlineRef.current : commandInputRef.current
        el?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const saveCurrentView = () => {
    const task = RESEARCH_TASKS.find((tk) => tk.id === researchTask)
    const taskLabel = task ? t(task.labelKey) : t('researchPage.research')
    const date = new Date()
    const label = `${taskLabel} – ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}`
    const next = { id: `saved-${Date.now()}`, label, task: researchTask }
    setSavedViews((prev) => {
      const list = [...prev, next]
      try {
        localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(list))
      } catch (_) {}
      return list
    })
  }

  const removeSavedView = (id, e) => {
    e.stopPropagation()
    setSavedViews((prev) => {
      const list = prev.filter((v) => v.id !== id)
      try {
        localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(list))
      } catch (_) {}
      return list
    })
  }

  const goToSavedView = (view) => {
    setResearchTask(view.task)
    if (view.task === 'trending') {
      setActiveRailItem('trending')
      setTimeout(() => trendingBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else if (view.task === 'pulse') {
      setActiveRailItem('pulse')
      setTimeout(() => chartBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else setActiveRailItem('current')
  }

  const confirmName = () => {
    const trimmed = inputName.trim()
    setSavedName(trimmed)
    if (trimmed) localStorage.setItem(USERNAME_KEY, trimmed)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 800)
  }

  const handleProfileUpload = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    try {
      const data = await resizeImage(file)
      setProfileImage(data)
      localStorage.setItem(PROFILE_IMAGE_KEY, data)
    } catch (err) {
      console.error('Profile image upload failed', err)
    }
    e.target.value = ''
  }

  const clearProfileImage = (ev) => {
    ev.stopPropagation()
    setProfileImage(null)
    try {
      localStorage.removeItem(PROFILE_IMAGE_KEY)
    } catch (_) {}
  }

  useEffect(() => {
    setInputName(savedName)
  }, [savedName])

  const fetchPrices = useCallback(async () => {
    try {
      const [btc, eth, sol] = await Promise.all([
        getTokenPriceBySymbol('BTC'),
        getTokenPriceBySymbol('ETH'),
        getTokenPriceBySymbol('SOL'),
      ])
      setPrices({
        BTC: { price: btc?.price, change: btc?.change ?? btc?.change24 },
        ETH: { price: eth?.price, change: eth?.change ?? eth?.change24 },
        SOL: { price: sol?.price, change: sol?.change ?? sol?.change24 },
      })
    } catch (e) {
      console.error('Research: price fetch failed', e)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    const t = setInterval(fetchPrices, PRICE_REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchPrices])

  const fetchTrending = useCallback(async () => {
    setLoadingTrending(true)
    setTrendingError(false)
    try {
      const data = await getTrendingTokens(TRENDING_NETWORKS, TRENDING_LIMIT)
      const raw = (data?.filterTokens?.results || []).filter((r) => {
        const t = r.token
        const sym = (t?.symbol || '').trim().replace(/\0/g, '')
        return t?.address && sym.length > 0 && sym.length <= 20
      })
      const cards = raw.slice(0, TRENDING_LIMIT).map((r) => {
        const t = r.token || {}
        const symbol = (t.symbol || '').trim().replace(/\0/g, '') || '?'
        return {
          symbol,
          name: (t.name || symbol).trim().replace(/\0/g, '') || symbol,
          address: t.address || '',
          networkId: t.networkId ?? 1,
          price: parseFloat(r.priceUSD) || 0,
          change: parseFloat(r.change24) || 0,
          marketCap: parseFloat(r.marketCap) || 0,
          logo: t.info?.imageThumbUrl || t.info?.imageLargeUrl || null,
        }
      })
      setTrendingCards(cards)
    } catch (e) {
      console.error('Research: trending fetch failed', e)
      setTrendingCards([])
      setTrendingError(true)
    } finally {
      setLoadingTrending(false)
    }
  }, [])

  useEffect(() => {
    fetchTrending()
    const t = setInterval(fetchTrending, TRENDING_REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchTrending])

  const fetchChart = useCallback(async () => {
    setLoadingChart(true)
    try {
      const to = Math.floor(Date.now() / 1000)
      const from = to - CHART_DAYS * 24 * 3600
      const { getBars: bars } = await getBars(chartSymbol, '1D', from, to, chartNetworkId)
      const list = Array.isArray(bars) ? bars : []
      setChartBars(list)
    } catch (e) {
      console.error('Research: chart fetch failed', e)
      setChartBars([])
    } finally {
      setLoadingChart(false)
    }
  }, [chartSymbol, chartNetworkId])

  useEffect(() => {
    fetchChart()
  }, [fetchChart])

  useEffect(() => {
    const t = setInterval(fetchChart, CHART_REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchChart])

  /** Parse command query and switch to matching task + scroll to block */
  const handleCommandSubmit = () => {
    const q = commandQuery.trim().toLowerCase()
    if (!q) return
    if (/\btrend|meme|moving|hot\b/.test(q)) {
      setResearchTask('trending')
      setActiveRailItem('trending')
      setTimeout(() => trendingBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else if (/\bcompare|vs\.?|versus\b/.test(q)) {
      setResearchTask('compare')
      setActiveRailItem('current')
    } else if (/\bpulse|chart|btc|eth|sol|7d|price\b/.test(q)) {
      setResearchTask('pulse')
      setActiveRailItem('pulse')
      setTimeout(() => chartBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else if (/\bdeep|token|detail|history\b/.test(q)) {
      setResearchTask('deep')
      setActiveRailItem('current')
    } else {
      setResearchTask('trending')
      setActiveRailItem('trending')
      setTimeout(() => trendingBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  const handleRailSelect = (id) => {
    setActiveRailItem(id)
    if (id === 'trending') {
      setResearchTask('trending')
      setTimeout(() => trendingBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else if (id === 'pulse') {
      setResearchTask('pulse')
      setTimeout(() => chartBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else {
      setResearchTask('trending')
    }
  }

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeAsset = activeTab?.asset ?? null

  useEffect(() => {
    if (activeAsset?.symbol) {
      setChartSymbol(activeAsset.symbol)
      setChartNetworkId(activeAsset.networkId ?? 1)
    }
  }, [activeTabId, activeAsset?.symbol, activeAsset?.networkId])

  useEffect(() => {
    if (!activeAsset?.symbol) return
    getTokenPriceBySymbol(activeAsset.symbol).then((data) => {
      setPrices((prev) => (prev[activeAsset.symbol] !== undefined ? prev : { ...prev, [activeAsset.symbol]: { price: data?.price ?? null, change: data?.change ?? data?.change24 ?? null } }))
    }).catch(() => {})
  }, [activeAsset?.symbol])

  const displayName = savedName || inputName
  const initial = (displayName || '?').charAt(0).toUpperCase()

  return (
    <div className="research-page">
      {tourOpen && (
        <div className="research-tour-overlay" role="dialog" aria-labelledby="research-tour-title" aria-modal="true">
          <div className="research-tour-backdrop" onClick={() => setTourOpen(false)} aria-hidden="true" />
          <div className="research-tour-card">
            <h2 id="research-tour-title" className="research-tour-title">{t('researchPage.quickTour')}</h2>
            <ol className="research-tour-steps">
              <li>Use the <strong>tabs</strong> above to switch between research contexts.</li>
              <li>Type in the <strong>command bar</strong> (left panel or top on mobile) to jump to a view — try “trending” or “btc chart”.</li>
              <li>Use <strong>Save this view</strong> in the left panel to add the current view to your Saved list.</li>
              <li>Press <kbd>Cmd+K</kbd> (Mac) or <kbd>Ctrl+K</kbd> (Windows) anytime to focus the research bar.</li>
            </ol>
            <button type="button" className="research-tour-dismiss" onClick={() => setTourOpen(false)}>
              {t('researchPage.gotIt')}
            </button>
          </div>
        </div>
      )}

      <div className="research-bg">
        <div className="research-bg-gradient" />
        <div className="research-bg-mesh" />
        <div className="research-bg-grid" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="research-profile-input"
        onChange={handleProfileUpload}
        aria-label="Upload profile picture"
      />

      <header className="research-top">
        <span className="research-badge">{t('researchPage.research')}</span>
        <div className="research-top-actions">
          <button
            type="button"
            className={`research-learn-toggle ${learnOn ? 'on' : ''}`}
            onClick={() => setLearnOn(!learnOn)}
            aria-pressed={learnOn}
            aria-label="Learn mode"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
            <span>{t('researchPage.learn')}</span>
          </button>
          <button
            type="button"
            className="research-tour-btn"
            aria-label="Start tour"
            onClick={() => setTourOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none" />
            </svg>
            <span>{t('researchPage.tour')}</span>
          </button>
        </div>
      </header>

      {/* Browser-style tabs on top (Disco/GenTabs idea) */}
      <div className="research-tabs-bar" role="tablist" aria-label="Research tabs">
        {tabs.map((tab) => (
          <div key={tab.id} className={`research-tab-wrap ${activeTabId === tab.id ? 'active' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTabId === tab.id}
              className="research-tab"
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="research-tab-label">{tab.label}</span>
            </button>
            {tabs.length > 1 && (
              <button
                type="button"
                className="research-tab-close"
                aria-label={`Close ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  const isClosingActive = activeTabId === tab.id
                  const idx = tabs.findIndex((t) => t.id === tab.id)
                  setTabs((prev) => {
                    const next = prev.filter((t) => t.id !== tab.id)
                    if (next.length === 0) return prev
                    if (isClosingActive) {
                      const newIdx = Math.min(idx, next.length - 1)
                      setActiveTabId(next[newIdx].id)
                    }
                    return next
                  })
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="research-tab research-tab-new"
          aria-label="New research tab"
          onClick={() => {
            const id = `tab-${Date.now()}`
            setTabs((prev) => [...prev, { id, label: t('researchPage.newResearch') }])
            setActiveTabId(id)
          }}
        >
          <span>+</span>
        </button>
        <button
          type="button"
          className="research-tab research-tab-copy-link"
          aria-label="Copy research link"
          onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.href : ''
            if (url && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(url).then(() => triggerCopyToast(t('common.copied'))).catch(() => {})
            }
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>

      <div className="research-body">
        {/* Far-left narrow column: Overall research + Research utilities (GenTabs-style rail) */}
        <aside className="research-rail-left" aria-label="Research navigation">
          <button
            type="button"
            className={`research-rail-left-btn research-rail-left-overall ${activeTabId === tabs[0]?.id ? 'active' : ''}`}
            title={t('researchPage.overallResearch')}
            aria-label={t('researchPage.overallResearch')}
            onClick={() => {
              const firstId = tabs[0]?.id
              if (firstId) setActiveTabId(firstId)
              setTimeout(() => document.getElementById('research-discovery-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <div className="research-rail-left-divider" aria-hidden="true" />
          <span className="research-rail-left-label">{t('researchPage.utilities')}</span>
          <button type="button" className="research-rail-left-btn" title={t('nav.heatmaps')} aria-label={t('nav.heatmaps')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button type="button" className="research-rail-left-btn" title={t('nav.aiCharts')} aria-label={t('nav.aiCharts')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </button>
          <button type="button" className="research-rail-left-btn" title={t('nav.bubbles')} aria-label={t('nav.bubbles')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </button>
          <button type="button" className="research-rail-left-btn" title={t('nav.aiMarketAnalysis')} aria-label={t('nav.aiMarketAnalysis')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
            </svg>
          </button>
          <button type="button" className="research-rail-left-btn research-rail-left-add" title={t('common.add')} aria-label={t('common.add')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </aside>

        <div className="research-main">
        {/* Disco-style left panel: command bar + Saved */}
        <aside className="research-panel" aria-label="Research panel">
          <div className="research-command-bar">
            <label htmlFor="research-intent-input" className="research-command-label">
              {t('researchPage.whatToResearch')}
            </label>
            <div className="research-command-wrap">
<input
              ref={commandInputRef}
              id="research-intent-input"
              type="text"
              className="research-command-input"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
              placeholder={t('researchPage.commandPlaceholder')}
              aria-label="Research goal or question"
            />
              <button
                type="button"
                className="research-command-submit"
                onClick={handleCommandSubmit}
                aria-label="Search or go to view"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <h3 className="research-panel-title">{t('researchPage.saved')}</h3>
          <ul className="research-panel-list">
            <li>
              <button
                type="button"
                className={`research-panel-item ${activeRailItem === 'current' ? 'active' : ''}`}
                onClick={() => handleRailSelect('current')}
                aria-current={activeRailItem === 'current'}
              >
                {t('researchPage.currentView')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`research-panel-item ${activeRailItem === 'trending' ? 'active' : ''}`}
                onClick={() => handleRailSelect('trending')}
                aria-current={activeRailItem === 'trending'}
              >
                {t('researchPage.trendingSnapshot')}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`research-panel-item ${activeRailItem === 'pulse' ? 'active' : ''}`}
                onClick={() => handleRailSelect('pulse')}
                aria-current={activeRailItem === 'pulse'}
              >
                {t('researchPage.marketPulse')}
              </button>
            </li>
          </ul>
          <h3 className="research-panel-title">{t('researchPage.discoverLabel')}</h3>
          <div className="research-panel-discovery">
            {DISCOVERY_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                className="research-panel-discovery-btn"
                onClick={() => {
                  const id = `asset-${asset.symbol}-${Date.now()}`
                  setTabs((prev) => [...prev, { id, label: asset.symbol, asset: { symbol: asset.symbol, name: asset.name } }])
                  setActiveTabId(id)
                }}
                title={`Open ${asset.symbol} research tab`}
              >
                {COIN_LOGOS[asset.symbol] ? (
                  <img src={COIN_LOGOS[asset.symbol]} alt="" className="research-panel-discovery-icon" />
                ) : (
                  <span className="research-panel-discovery-icon research-panel-discovery-icon-fallback">{asset.symbol.slice(0, 2)}</span>
                )}
                <span>{asset.symbol}</span>
              </button>
            ))}
          </div>
          <button type="button" className="research-panel-save-btn" onClick={saveCurrentView}>
            {t('researchPage.saveThisView')}
          </button>
          {savedViews.length > 0 && (
            <>
              <h3 className="research-panel-title">{t('researchPage.savedViews')}</h3>
              <ul className="research-panel-list">
                {savedViews.map((view) => (
                  <li key={view.id} className="research-panel-saved-item">
                    <button
                      type="button"
                      className="research-panel-item"
                      onClick={() => goToSavedView(view)}
                    >
                      {view.label}
                    </button>
                    <button
                      type="button"
                      className="research-panel-remove-saved"
                      onClick={(e) => removeSavedView(view.id, e)}
                      aria-label={`Remove ${view.label}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <div className="research-content">
        {/* Command bar repeated here when left panel is hidden (e.g. mobile) */}
        <div className="research-command-bar research-command-bar-inline">
          <label htmlFor="research-intent-input-inline" className="research-command-label">
            {t('researchPage.whatToResearch')}
          </label>
          <div className="research-command-wrap">
            <input
              ref={commandInputInlineRef}
              id="research-intent-input-inline"
              type="text"
              className="research-command-input"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
              placeholder={t('researchPage.commandPlaceholder')}
              aria-label="Research goal or question (mobile)"
            />
            <button
              type="button"
              className="research-command-submit"
              onClick={handleCommandSubmit}
              aria-label="Search or go to view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* GenTabs-style: hero headline + subline (crypto version of "Take the web for a fresh spin") */}
        <div className="research-hero-banner">
          <h1 className="research-hero-title">{t('researchPage.researchCrypto')}</h1>
          <p className="research-hero-subline">{t('researchPage.heroSubline')}</p>
        </div>

        {/* GenTabs-style: task cards (crypto version of Explore solar system / Plan a trip / etc.) */}
        <section className="research-tasks" aria-label="Research goals">
          {RESEARCH_TASKS.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`research-task-card ${researchTask === task.id ? 'active' : ''}`}
              onClick={() => setResearchTask(task.id)}
              aria-pressed={researchTask === task.id}
              aria-label={`${t(task.labelKey)}: ${t(task.descKey)}`}
            >
              <span className="research-task-label">{t(task.labelKey)}</span>
              <span className="research-task-desc">{t(task.descKey)}</span>
            </button>
          ))}
        </section>

        {/* Discover Digital Assets – from Codex (trending) or curated; click opens research tab */}
        <section className={`research-discovery-assets ${!activeAsset ? 'research-discovery-prominent' : ''}`} aria-labelledby="research-discovery-title">
          <h2 id="research-discovery-title" className="research-discovery-title">{t('researchPage.discoverDigitalAssets')}</h2>
          <p className="research-discovery-sub">
            {activeAsset ? t('researchPage.clickAnotherAsset') : t('researchPage.startByClicking')}
          </p>
          {loadingTrending ? (
            <p className="research-discovery-loading">{t('researchPage.loadingAssets')}</p>
          ) : (
          <div className="research-discovery-grid">
            {(trendingCards.length > 0 ? trendingCards.map((c) => ({ symbol: c.symbol, name: c.name, address: c.address, networkId: c.networkId, logo: c.logo })) : DISCOVERY_ASSETS.map((a) => ({ symbol: a.symbol, name: a.name, address: null, networkId: null, logo: null }))).map((asset) => (
              <div
                key={asset.address ? `${asset.address}-${asset.networkId}` : asset.symbol}
                className="research-discovery-card"
                role="button"
                tabIndex={0}
                aria-label={`Open ${asset.symbol} research tab`}
                onClick={() => {
                  const id = asset.address ? `asset-${asset.symbol}-${asset.networkId}-${Date.now()}` : `asset-${asset.symbol}-${Date.now()}`
                  setTabs((prev) => [...prev, { id, label: asset.symbol, asset: { symbol: asset.symbol, name: asset.name, address: asset.address || undefined, networkId: asset.networkId } }])
                  setActiveTabId(id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    const id = asset.address ? `asset-${asset.symbol}-${asset.networkId}-${Date.now()}` : `asset-${asset.symbol}-${Date.now()}`
                    setTabs((prev) => [...prev, { id, label: asset.symbol, asset: { symbol: asset.symbol, name: asset.name, address: asset.address || undefined, networkId: asset.networkId } }])
                    setActiveTabId(id)
                  }
                }}
              >
                {(asset.logo || COIN_LOGOS[asset.symbol]) ? (
                  <img src={asset.logo || COIN_LOGOS[asset.symbol]} alt="" className="research-discovery-logo" />
                ) : (
                  <span className="research-discovery-logo research-discovery-logo-fallback">{asset.symbol?.slice(0, 2)}</span>
                )}
                <div className="research-discovery-body">
                  <span className="research-discovery-symbol">{asset.symbol}</span>
                  <span className="research-discovery-name">{asset.name}</span>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>

        {/* When an asset tab is active, show asset-specific focus (price + chart uses this symbol) */}
        {activeAsset && (
          <section className="research-asset-focus" aria-labelledby="research-asset-focus-title">
            <h2 id="research-asset-focus-title" className="research-asset-focus-title">{t('researchPage.researchSymbol', { symbol: activeAsset.symbol })}</h2>
            <div className="research-asset-focus-card">
              {COIN_LOGOS[activeAsset.symbol] ? (
                <img src={COIN_LOGOS[activeAsset.symbol]} alt="" className="research-asset-focus-logo" />
              ) : (
                <span className="research-asset-focus-logo research-asset-focus-logo-fallback">{activeAsset.symbol.slice(0, 2)}</span>
              )}
              <div className="research-asset-focus-body">
                <span className="research-asset-focus-name">{activeAsset.name}</span>
                <span className="research-asset-focus-price">
                  {prices[activeAsset.symbol] ? fmtPrice(prices[activeAsset.symbol].price) : '—'}
                </span>
                {prices[activeAsset.symbol] && (
                  <span className={`research-asset-focus-change ${(prices[activeAsset.symbol].change || 0) >= 0 ? 'up' : 'down'}`}>
                    {(prices[activeAsset.symbol].change || 0) >= 0 ? '▲' : '▼'} {formatChange(prices[activeAsset.symbol].change)}%
                  </span>
                )}
              </div>
              {selectToken && (
                <button
                  type="button"
                  className="research-asset-focus-open-trading"
                  onClick={() => selectToken({ symbol: activeAsset.symbol, name: activeAsset.name, address: activeAsset.address, networkId: activeAsset.networkId ?? 1 })}
                >
                  {t('researchPage.openInTrading')}
                </button>
              )}
            </div>
          </section>
        )}

        <div className="research-hero">
          <aside className="research-hero-left">
            <button
              type="button"
              className="research-profile-pic"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              aria-label="Change profile picture"
            >
              <span className="research-profile-ring" />
              {profileImage ? (
                <img src={profileImage} alt="" className="research-profile-img" />
              ) : (
                <span className="research-profile-initial" aria-hidden>{initial}</span>
              )}
              <span className="research-profile-edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              {profileImage && (
                <button
                  type="button"
                  className="research-profile-clear"
                  onClick={clearProfileImage}
                  title="Remove photo"
                  aria-label="Remove profile picture"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </button>
            <div className="research-welcome-wrap">
              <span className="research-welcome-eyebrow">{t('researchPage.welcome')}</span>
              <div className="research-name-row">
                <div className="research-name-inline">
                  <input
                    type="text"
                    className="research-name-input"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmName()}
                    placeholder={t('researchPage.yourName')}
                    aria-label={t('researchPage.yourName')}
                  />
                  <span className="research-name-underline" />
                </div>
                <button
                  type="button"
                  className={`research-name-confirm ${justSaved ? 'saved' : ''}`}
                  onClick={confirmName}
                  title={justSaved ? t('researchPage.saved') : t('researchPage.saveName')}
                  aria-label={t('researchPage.saveName')}
                >
                  {justSaved ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </aside>
          <div className="research-widgets">
            {(['BTC', 'ETH', 'SOL']).map((sym) => {
              const up = (prices[sym].change || 0) >= 0
              return (
                <div key={sym} className={`research-widget research-widget-${sym.toLowerCase()}`}>
                  <img src={COIN_LOGOS[sym]} alt={sym} className="research-widget-logo" />
                  <div className="research-widget-body">
                    <span className="research-widget-symbol">{sym}</span>
                    <span className="research-widget-price">{fmtPrice(prices[sym].price)}</span>
                  </div>
                  <span className={`research-widget-change ${up ? 'up' : 'down'}`}>
                    {up ? '▲' : '▼'} {formatChange(prices[sym].change)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* GenTabs-style: modular blocks – task-linked for emphasis */}
        <section
          ref={trendingBlockRef}
          className={`research-cards ${researchTask === 'trending' ? 'research-block-focus' : ''}`}
          data-research-task="trending"
          aria-labelledby="research-cards-title"
        >
          <h2 id="research-cards-title" className="research-cards-title">{t('researchPage.trendingNow')}</h2>
          {loadingTrending ? (
            <p className="research-cards-loading">{t('common.loading')}</p>
          ) : trendingCards.length > 0 ? (
            <div className="research-cards-grid">
              {trendingCards.map((card) => {
                const up = (card.change || 0) >= 0
                return (
                  <article
                    key={`${card.address}-${card.networkId}`}
                    className="research-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => selectToken?.({
                      symbol: card.symbol,
                      name: card.name,
                      address: card.address,
                      networkId: card.networkId,
                      price: card.price,
                      change: card.change,
                      logo: card.logo,
                    })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectToken?.({
                          symbol: card.symbol,
                          name: card.name,
                          address: card.address,
                          networkId: card.networkId,
                          price: card.price,
                          change: card.change,
                          logo: card.logo,
                        })
                      }
                    }}
                    aria-label={`View ${card.symbol} chart and details`}
                  >
                    {card.logo ? (
                      <img src={card.logo} alt="" className="research-card-logo" />
                    ) : (
                      <span className="research-card-logo research-card-logo-fallback">{card.symbol?.slice(0, 2)}</span>
                    )}
                    <div className="research-card-body">
                      <span className="research-card-symbol">{card.symbol}</span>
                      <span className="research-card-price">{fmtPrice(card.price)}</span>
                      <span className="research-card-mcap">{fmtLarge(card.marketCap)}</span>
                    </div>
                    <span className={`research-card-change ${up ? 'up' : 'down'}`}>
                      {up ? '▲' : '▼'} {formatChange(card.change)}%
                    </span>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="research-cards-empty-state">
              <p className="research-cards-empty">
                {trendingError ? t('researchPage.couldntLoad') : t('researchPage.noTrendingData')}
              </p>
              <button type="button" className="research-cards-retry" onClick={() => fetchTrending()}>
                {trendingError ? t('common.retry') : t('researchPage.refresh')}
              </button>
            </div>
          )}
        </section>

        {/* GenTabs-style: chart block */}
        <section
          ref={chartBlockRef}
          className={`research-chart ${researchTask === 'pulse' ? 'research-block-focus' : ''}`}
          data-research-task="pulse"
          aria-labelledby="research-chart-title"
        >
          <h2 id="research-chart-title" className="research-chart-title">{t('researchPage.marketPulse7d')}</h2>
          <div className="research-chart-nav" role="tablist" aria-label="Chart asset">
            {CHART_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                role="tab"
                aria-selected={chartSymbol === sym}
                className={`research-chart-tab ${chartSymbol === sym ? 'active' : ''}`}
                onClick={() => setChartSymbol(sym)}
              >
                {sym}
              </button>
            ))}
          </div>
          <div className="research-chart-sparkline-wrap">
            {loadingChart ? (
              <p className="research-chart-loading">{t('researchPage.loadingChart')}</p>
            ) : chartBars.length > 0 ? (
              <ResearchSparkline bars={chartBars} up={(prices[chartSymbol]?.change ?? 0) >= 0} />
            ) : (
              <p className="research-chart-empty">{t('researchPage.noChartData')}</p>
            )}
          </div>
        </section>

        {/* GenTabs-style: source-linked block */}
        <footer className="research-sources">
          <span className="research-sources-label">{t('researchPage.dataFrom')}</span>
          <a
            href="https://codex.io"
            target="_blank"
            rel="noopener noreferrer"
            className="research-source-link"
          >
            Codex
          </a>
          <span className="research-sources-sep">·</span>
          <a
            href="https://www.coingecko.com/en/api"
            target="_blank"
            rel="noopener noreferrer"
            className="research-source-link"
          >
            CoinGecko
          </a>
        </footer>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchPage
