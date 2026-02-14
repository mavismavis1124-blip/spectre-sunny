/**
 * Spectre AI Trading Platform
 * Figma Reference: Frame 2085654846
 * Professional institutional investor platform
 */
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import i18n from './i18n'
import AuthGate from './components/AuthGate'
import Header from './components/Header'
import TokenTicker from './components/TokenTicker'
import LeftPanel from './components/LeftPanel'
import TokenBanner from './components/TokenBanner'
import TradingChart from './components/TradingChart'
import DataTabs from './components/DataTabs'
import RightPanel from './components/RightPanel'
// AIAssistant removed — Spectre Egg agent replaces Monarch
import ParticleBackground from './components/ParticleBackground'
import WelcomePage from './components/WelcomePage'
import NavigationSidebar from './components/NavigationSidebar'
import StructureGuidePage from './components/StructureGuidePage'
import GlossaryPage from './components/GlossaryPage'
import FearGreedPage from './components/FearGreedPage'
import SocialZonePage from './components/SocialZonePage'
import MediaCenterPage from './components/MediaCenterPage'
import XBubblesPage from './components/XBubblesPage'
import XDashPage from './components/XDashPage'
import WatchlistsPage from './components/WatchlistsPage'
import ROICalculatorPage from './components/ROICalculatorPage'
import LogsPage from './components/LogsPage'
import ResearchZoneLite from './components/ResearchZoneLite'
import GMDashboard from './components/GMDashboard'
import MarketAnalyticsPage from './components/MarketAnalyticsPage'
import AIMarketAnalysisPage from './components/AIMarketAnalysisPage'
import CategoriesPage from './components/CategoriesPage'
import HeatmapsPage from './components/HeatmapsPage'
import BubblesPage from './components/BubblesPage'
import AIChartsPage from './components/AIChartsPage'
import AIChartsLabPage from './components/AIChartsLabPage'
import DiscoverPage from './components/DiscoverPage'
import FundingRatesPage from './components/FundingRatesPage'
import DeFiYieldsPage from './components/DeFiYieldsPage'
// Spectre Egg & AI Agent system
import useEggState, { EGG_STATES } from './components/egg/useEggState'
import SpectreEgg from './components/egg/SpectreEgg'
import EggExplainerModal from './components/egg/EggExplainerModal'
import SpectreAgentChat from './components/agent/SpectreAgentChat'
import AgentFAB from './components/agent/AgentFAB'
import { getAgentProfile } from './components/agent/agentProfile'

class GMErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err, info) { console.error('GMDashboard error:', err, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24 }}>
          <p style={{ marginBottom: 16 }}>{i18n.t('errors.gmDashboardError')}</p>
          <button type="button" onClick={() => this.props.onClose()} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{i18n.t('common.close')}</button>
        </div>
      )
    }
    return this.props.children
  }
}

import spectreIcons from './icons/spectreIcons'
import { useIsMobile } from './hooks/useMediaQuery'
import MobileBottomNav from './components/MobileBottomNav'
import MobileHeader from './components/MobileHeader'
import MobilePreviewFrame from './components/MobilePreviewFrame'
import { MobilePreviewContext } from './contexts/MobilePreviewContext'
import { I18nCurrencyProvider } from './contexts/I18nCurrencyContext.jsx'
import { getPageIdFromPath, getPathForPageId } from './constants/pageRoutes'
import './App.css'

// Shared profile shown in header (top right) and welcome widget – single source of truth
const DEFAULT_PROFILE = {
  name: 'Daryl Wilson',
  imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
}

// Create context for copy toast
export const CopyToastContext = createContext()

export const useCopyToast = () => useContext(CopyToastContext)

function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [isDataTabsExpanded, setIsDataTabsExpanded] = useState(false)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  const [isNavigationSidebarCollapsed, setIsNavigationSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('spectre-nav-sidebar-collapsed')
    return saved === 'true'
  })
  const currentPage = useMemo(() => {
    const hash = (location.hash || '').replace(/^#+/, '')
    if (hash === 'token') return 'ai-screener'
    return getPageIdFromPath(location.pathname) || 'research-platform'
  }, [location.hash, location.pathname])

  const isMobile = useIsMobile()

  // Detect PWA standalone mode (iOS + standard) and add class for CSS targeting
  const [isPWAStandalone] = useState(() => {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches
  })

  // Unified day mode state - persists across all pages
  const [globalDayMode, setGlobalDayMode] = useState(() => {
    const saved = localStorage.getItem('spectre-day-mode')
    return saved === 'true'
  })
  // Sync day mode to localStorage
  useEffect(() => {
    localStorage.setItem('spectre-day-mode', globalDayMode.toString())
  }, [globalDayMode])
  // Use unified state for both pages
  const researchZoneDayMode = globalDayMode
  const setResearchZoneDayMode = setGlobalDayMode
  const welcomeDayMode = globalDayMode
  const setWelcomeDayMode = setGlobalDayMode

  // App display mode: 'terminal' (data-focused) or 'cinema' (immersive browse)
  const [appDisplayMode, setAppDisplayMode] = useState(() => {
    const saved = localStorage.getItem('spectre-app-display-mode')
    return saved === 'cinema' ? 'cinema' : 'terminal'
  })
  // Sync display mode to localStorage
  useEffect(() => {
    localStorage.setItem('spectre-app-display-mode', appDisplayMode)
  }, [appDisplayMode])

  const showGMDashboard = currentPage === 'gm-dashboard'
  const [showMobilePreview, setShowMobilePreview] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('mobile') === '1' || params.get('mobile') === 'true'
  })

  // AI Assistant: page actions and context (registered by WelcomePage when on landing)
  const [assistantActions, setAssistantActions] = useState(null)
  const [assistantContext, setAssistantContext] = useState(null)
  // When Monarch Chat asks for chart/news, navigate to Research and open there
  const [pendingChartToken, setPendingChartToken] = useState(null)
  const [pendingCommandCenterTab, setPendingCommandCenterTab] = useState(null)

  // Profile (name + avatar): shared between header and welcome widget; persist so changes survive refresh
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('spectre-profile')
      if (saved) {
        const p = JSON.parse(saved)
        if (p && (p.name != null || p.imageUrl != null)) return { name: p.name ?? DEFAULT_PROFILE.name, imageUrl: p.imageUrl ?? DEFAULT_PROFILE.imageUrl }
      }
    } catch (_) {}
    return { ...DEFAULT_PROFILE }
  })
  useEffect(() => {
    localStorage.setItem('spectre-profile', JSON.stringify(profile))
  }, [profile])

  // Stable callback so welcome widget name/logo changes always update header (top right)
  const handleProfileChange = useCallback((next) => {
    setProfile(prev => ({
      name: typeof next?.name === 'string' ? next.name : (prev?.name ?? DEFAULT_PROFILE.name),
      imageUrl: typeof next?.imageUrl === 'string' ? next.imageUrl : (prev?.imageUrl ?? DEFAULT_PROFILE.imageUrl),
    }))
  }, [])

  useEffect(() => {
    document.body.classList.toggle('mobile-preview-active', showMobilePreview)
    return () => document.body.classList.remove('mobile-preview-active')
  }, [showMobilePreview])
  
  const handleCollapsedChange = useCallback((collapsed) => {
    setIsNavigationSidebarCollapsed(collapsed)
  }, [])
  // View state derived from route.
  const currentView = currentPage === 'ai-screener' ? 'token' : 'welcome'
  const [discoverOnly, setDiscoverOnly] = useState(true)

  // ─── Spectre Egg & AI Agent ───
  const { eggState, stage: eggStage, started: eggStarted, progress: eggProgress, isPreBirth, isBorn: agentIsBorn, start: startEgg, track: trackEggInteraction, hatch: hatchEgg, born: markEggBorn, grow: markEggGrow } = useEggState()
  const [eggExplainerOpen, setEggExplainerOpen] = useState(false)
  const [agentChatOpen, setAgentChatOpen] = useState(false)
  const [agentBirthFlow, setAgentBirthFlow] = useState(false)
  const [agentProfile, setAgentProfile] = useState(() => getAgentProfile())

  // When egg reaches HATCHING, auto-trigger birth
  useEffect(() => {
    if (eggStage === EGG_STATES.HATCHING) {
      // Brief delay for hatch animation, then mark born and open chat
      const timer = setTimeout(() => {
        markEggBorn()
        setAgentBirthFlow(true)
        setAgentChatOpen(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [eggStage, markEggBorn])

  // Track page views for egg progress
  useEffect(() => {
    if (eggStarted && isPreBirth) {
      trackEggInteraction('pageView')
    }
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEggClick = useCallback(() => {
    if (!eggStarted) {
      setEggExplainerOpen(true)
    } else if (isPreBirth) {
      // Clicking egg during cracking/hatching = force hatch
      hatchEgg()
    }
  }, [eggStarted, isPreBirth, hatchEgg])

  const handleStartHatching = useCallback(() => {
    startEgg()
  }, [startEgg])

  const handleBirthComplete = useCallback((profile) => {
    setAgentProfile(profile)
    setAgentBirthFlow(false)
    markEggGrow()
  }, [markEggGrow])

  // Crypto vs Stocks mode (persisted in toolbar)
  const [marketMode, setMarketMode] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('spectre-market-mode') : null
    return saved === 'stocks' ? 'stocks' : 'crypto'
  })
  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('spectre-market-mode', marketMode)
  }, [marketMode])

  const navigateByPageId = useCallback((pageId, { replace = false } = {}) => {
    const targetPageId = pageId || 'research-platform'
    const targetPath = getPathForPageId(targetPageId)
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace })
    }
    if (targetPageId === 'ai-screener') setDiscoverOnly(false)
  }, [location.pathname, navigate])

  // Normalize legacy hash and unknown paths.
  useEffect(() => {
    const hash = (location.hash || '').replace(/^#+/, '')
    if (hash === 'token') {
      navigateByPageId('ai-screener', { replace: true })
      return
    }
    if (!getPageIdFromPath(location.pathname)) {
      navigateByPageId('research-platform', { replace: true })
    }
  }, [location.hash, location.pathname, navigateByPageId])

  // Backward-compatible navigation helper for existing handlers.
  const navigateTo = useCallback((target) => {
    if (target === 'token') {
      navigateByPageId('ai-screener')
      return
    }
    if (target === 'welcome') {
      navigateByPageId('research-platform')
      return
    }
    navigateByPageId(target)
  }, [navigateByPageId])

  // Default Bitcoin token for Research Zone — always the first token shown
  const defaultBTCToken = useMemo(() => ({
    symbol: 'BTC',
    name: 'Bitcoin',
    address: '',
    networkId: 1,
    description: '',
    price: 0,
    change: 0,
    verified: true,
    socials: {}
  }), [])

  // Research Zone always defaults to BTC unless a token was explicitly clicked
  const [researchZoneToken, setResearchZoneToken] = useState(() => ({
    symbol: 'BTC', name: 'Bitcoin', address: '', networkId: 1,
    description: '', price: 0, change: 0, verified: true, socials: {}
  }))

  const handlePageChange = useCallback((pageId) => {
    navigateByPageId(pageId)
  }, [navigateByPageId])
  
  const [copyToastMessage, setCopyToastMessage] = useState('CA copied to clipboard')
  
  const triggerCopyToast = (message = 'CA copied to clipboard') => {
    setCopyToastMessage(message)
    setShowCopyToast(true)
    setTimeout(() => setShowCopyToast(false), 2000) // 2 seconds
  }
  // Default SPECTRE token - can be changed when user searches
  const defaultToken = {
    symbol: 'SPECTRE',
    name: 'Spectre AI',
    address: '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6',
    networkId: 1,
    description: '',
    price: 0,
    change: 0,
    verified: true,
    socials: {}
  }
  
  const [token, setToken] = useState(() => {
    // Check if there's a saved selected token
    const saved = localStorage.getItem('spectre-selected-token')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return defaultToken
      }
    }
    return defaultToken
  })
  
  // Function to select a new token from search results
  const selectToken = (tokenData) => {
    const newToken = {
      symbol: tokenData.symbol || tokenData.token?.symbol,
      name: tokenData.name || tokenData.token?.name,
      address: tokenData.address || tokenData.token?.address,
      networkId: tokenData.networkId || tokenData.token?.networkId || 1,
      description: tokenData.description || '',
      price: tokenData.price || 0,
      change: tokenData.change || 0,
      verified: tokenData.verified || false,
      socials: tokenData.socials || {},
      logo: tokenData.logo || tokenData.token?.info?.imageThumbUrl
    }
    setToken(newToken)
    localStorage.setItem('spectre-selected-token', JSON.stringify(newToken))
    console.log('Selected token:', newToken.symbol, 'address:', newToken.address, 'networkId:', newToken.networkId)
    // Track egg interaction: search/select
    trackEggInteraction('search')
  }

  const [stats] = useState({
    mcap: '12.76M',
    fdv: '14.87M',
    liquidity: '237.16K',
    circSupply: '9.99M',
    volume24h: '27.84K',
    holders: '8925'
  })

  // Chart view mode: 'trading' (normal) or 'xChart' (social overlay) or 'xBubbles'
  // Persist in localStorage
  const [chartViewMode, setChartViewModeState] = useState(() => {
    const saved = localStorage.getItem('spectre-chartViewMode')
    return saved || 'trading'
  })
  
  const setChartViewMode = (mode) => {
    setChartViewModeState(mode)
    localStorage.setItem('spectre-chartViewMode', mode)
  }

  // Mobile token view tab: 'all' | 'chart' | 'charts-txns'
  const [mobileTokenTab, setMobileTokenTab] = useState('all')

  // ═══════════════════════════════════════════════════════════════════════════
  // WATCHLISTS — Separate crypto & stock watchlists, auto-switch on marketMode
  // ═══════════════════════════════════════════════════════════════════════════

  const DEFAULT_CRYPTO_TOKENS = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
  ]

  const DEFAULT_STOCK_TOKENS = [
    { symbol: 'AAPL', name: 'Apple Inc.', isStock: true },
    { symbol: 'MSFT', name: 'Microsoft Corp.', isStock: true },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', isStock: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', isStock: true },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', isStock: true },
  ]

  // Mode-keyed localStorage helpers
  const getWatchlistStorageKeys = (mode) => ({
    listKey: mode === 'stocks' ? 'spectre-stock-watchlists' : 'spectre-watchlists',
    activeKey: mode === 'stocks' ? 'spectre-stock-active-watchlist-id' : 'spectre-active-watchlist-id',
  })

  const persistWatchlistsForMode = (mode, list, activeId) => {
    const { listKey, activeKey } = getWatchlistStorageKeys(mode)
    localStorage.setItem(listKey, JSON.stringify(list))
    if (activeId != null) localStorage.setItem(activeKey, activeId)
  }

  const now = () => Date.now()

  const loadWatchlistsForMode = (mode) => {
    const { listKey } = getWatchlistStorageKeys(mode)
    const saved = localStorage.getItem(listKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(w => ({ ...w, updatedAt: w.updatedAt ?? now() }))
        }
      } catch { /* ignore */ }
    }
    // Crypto mode: migrate old single-watchlist format if present
    if (mode === 'crypto') {
      const old = localStorage.getItem('spectre-watchlist')
      if (old) {
        try {
          const tokens = JSON.parse(old)
          if (Array.isArray(tokens) && tokens.length > 0) {
            return [{ id: 'default', name: 'My Watchlist', tokens, updatedAt: now() }]
          }
        } catch { /* ignore */ }
      }
      return [{ id: 'default', name: 'My Watchlist', tokens: DEFAULT_CRYPTO_TOKENS, updatedAt: now() }]
    }
    // Stock mode: fresh defaults
    return [{ id: 'default', name: 'My Watchlist', tokens: DEFAULT_STOCK_TOKENS, updatedAt: now() }]
  }

  const loadActiveIdForMode = (mode) => {
    const { activeKey } = getWatchlistStorageKeys(mode)
    return localStorage.getItem(activeKey) || 'default'
  }

  // Dual state: crypto and stock watchlists persist independently
  const [cryptoWatchlists, setCryptoWatchlists] = useState(() => loadWatchlistsForMode('crypto'))
  const [cryptoActiveId, setCryptoActiveId] = useState(() => loadActiveIdForMode('crypto'))
  const [stockWatchlists, setStockWatchlists] = useState(() => loadWatchlistsForMode('stocks'))
  const [stockActiveId, setStockActiveId] = useState(() => loadActiveIdForMode('stocks'))

  // Mode-aware aliases — all downstream code uses these (identical interface as before)
  const isStocksMode = marketMode === 'stocks'
  const watchlists = isStocksMode ? stockWatchlists : cryptoWatchlists
  const setWatchlists = isStocksMode ? setStockWatchlists : setCryptoWatchlists
  const activeWatchlistId = isStocksMode ? stockActiveId : cryptoActiveId
  const setActiveWatchlistId = isStocksMode ? setStockActiveId : setCryptoActiveId

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0]

  // Memoize watchlist tokens to avoid creating new array reference on every render
  // This prevents infinite re-render loops in child components that depend on watchlist
  const watchlist = useMemo(() => activeWatchlist?.tokens ?? [], [activeWatchlist?.tokens])

  // Memoized watchlists summary for WelcomePage (avoids new array on every render)
  const watchlistsSummary = useMemo(() =>
    watchlists.map(w => ({ id: w.id, name: w.name, tokenCount: w.tokens?.length ?? 0 })),
    [watchlists]
  )

  const addWatchlist = (name) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wl-${Date.now()}`
    const listName = (name && String(name).trim()) || 'New list'
    const next = [...watchlists, { id, name: listName, tokens: [], updatedAt: now() }]
    setWatchlists(next)
    setActiveWatchlistId(id)
    persistWatchlistsForMode(marketMode, next, id)
  }

  const removeWatchlist = (id) => {
    const next = watchlists.filter(w => w.id !== id)
    if (next.length === 0) return
    setWatchlists(next)
    const newActive = activeWatchlistId === id ? next[0].id : activeWatchlistId
    setActiveWatchlistId(newActive)
    persistWatchlistsForMode(marketMode, next, newActive)
  }

  const renameWatchlist = (id, name) => {
    const trimmed = (name || '').trim() || 'Unnamed'
    setWatchlists(prev => {
      const next = prev.map(w => w.id === id ? { ...w, name: trimmed, updatedAt: now() } : w)
      persistWatchlistsForMode(marketMode, next, activeWatchlistId)
      return next
    })
  }

  const setActiveWatchlist = (id) => {
    setActiveWatchlistId(id)
    persistWatchlistsForMode(marketMode, watchlists, id)
  }

  const addToWatchlist = (tokenData) => {
    const tokenId = tokenData.address || tokenData.symbol
    setWatchlists(prev => {
      const next = prev.map(w => {
        if (w.id !== activeWatchlistId) return w
        if (w.tokens.some(t => (t.address || t.symbol) === tokenId)) return w
        return { ...w, tokens: [...w.tokens, tokenData], updatedAt: now() }
      })
      persistWatchlistsForMode(marketMode, next, activeWatchlistId)
      return next
    })
    trackEggInteraction('watchlistAdd')
  }

  const removeFromWatchlist = (identifier) => {
    setWatchlists(prev => {
      const next = prev.map(w => {
        if (w.id !== activeWatchlistId) return w
        return { ...w, tokens: w.tokens.filter(t => (t.address || t.symbol) !== identifier && t.symbol !== identifier), updatedAt: now() }
      })
      persistWatchlistsForMode(marketMode, next, activeWatchlistId)
      return next
    })
  }

  const isInWatchlist = (identifier) => {
    return watchlist.some(t => (t.address || t.symbol) === identifier || t.symbol === identifier)
  }

  const togglePinWatchlist = (identifier) => {
    setWatchlists(prev => {
      const next = prev.map(w => {
        if (w.id !== activeWatchlistId) return w
        const tokens = w.tokens.map(t =>
          (t.address || t.symbol) === identifier || t.symbol === identifier ? { ...t, pinned: !t.pinned } : t
        )
        return { ...w, tokens, updatedAt: now() }
      })
      persistWatchlistsForMode(marketMode, next, activeWatchlistId)
      return next
    })
  }

  const reorderWatchlist = (newOrder) => {
    setWatchlists(prev => {
      const next = prev.map(w => w.id === activeWatchlistId ? { ...w, tokens: newOrder, updatedAt: now() } : w)
      persistWatchlistsForMode(marketMode, next, activeWatchlistId)
      return next
    })
  }

  /* Chrome (header + nav) follows the visible page only: RZ uses RZ toggle, Welcome uses Welcome toggle */
  const effectiveDayMode = currentPage === 'research-zone'
    ? researchZoneDayMode
    : (currentPage === 'watchlists' || currentPage === 'roi-calculator' || currentView === 'welcome' ? welcomeDayMode : false)

  /* Only apply welcome-day-mode when Welcome page is actually visible (Research Platform), not when on Research Zone or other sidebar pages */
  const showWelcomeDayMode = currentPage === 'research-platform' && currentView === 'welcome' && welcomeDayMode

  const appClassName = `app nav-sidebar-open ${isNavigationSidebarCollapsed ? 'nav-sidebar-collapsed' : ''} ${showWelcomeDayMode ? 'welcome-day-mode' : ''} ${effectiveDayMode ? 'app-day-mode' : ''} ${appDisplayMode === 'cinema' ? 'cinema-mode' : 'terminal-mode'} ${isMobile ? 'mobile-bottom-nav-visible' : ''} ${isPWAStandalone ? 'pwa-standalone' : ''}`

  const appContent = (
    <div className={appClassName}>
          <ParticleBackground />
          {showGMDashboard && (
            <GMErrorBoundary onClose={() => navigateByPageId('research-platform')}>
              <GMDashboard profile={profile} onClose={() => navigateByPageId('research-platform')} />
            </GMErrorBoundary>
          )}
          <NavigationSidebar
            currentPage={currentPage}
            onPageChange={(pageId) => {
              if (pageId === 'research-zone') setResearchZoneToken(defaultBTCToken)
              handlePageChange(pageId)
            }}
            onCollapsedChange={handleCollapsedChange}
          />
          <Header 
            profile={profile}
            marketMode={marketMode}
            onMarketModeChange={setMarketMode}
            onOpenGM={() => navigateByPageId('gm-dashboard')}
            onOpenROI={() => handlePageChange('roi-calculator')}
            addToWatchlist={addToWatchlist}
            removeFromWatchlist={removeFromWatchlist}
            isInWatchlist={isInWatchlist}
            selectToken={selectToken}
            onSelectTokenAndOpen={(tokenData) => {
              selectToken(tokenData)
              navigateByPageId('ai-screener')
            }}
            onLogoClick={() => {
              if (currentPage === 'monarch-ai-chat') return
              navigateByPageId('research-platform')
            }}
            tradingModeActive={currentView === 'token'}
            onTradingModeClick={() => {
              setDiscoverOnly(false)
              navigateTo('token')
            }}
            researchZoneActive={currentPage === 'research-zone'}
            researchZoneDayMode={researchZoneDayMode}
            onResearchZoneDayModeChange={setResearchZoneDayMode}
            welcomeActive={currentView === 'welcome' || currentPage === 'watchlists'}
            welcomeDayMode={welcomeDayMode}
            onWelcomeDayModeChange={setWelcomeDayMode}
            appDisplayMode={appDisplayMode}
            onAppDisplayModeChange={setAppDisplayMode}
          />
          {/* Mobile Header – replaces desktop header on mobile */}
          {isMobile && (
            <MobileHeader
              appDisplayMode={appDisplayMode}
              onAppDisplayModeChange={setAppDisplayMode}
              marketMode={marketMode}
              onMarketModeChange={setMarketMode}
              dayMode={currentPage === 'research-zone' ? researchZoneDayMode : welcomeDayMode}
              onDayModeChange={currentPage === 'research-zone' ? setResearchZoneDayMode : setWelcomeDayMode}
              onSearchOpen={() => {
                // Trigger search modal via custom event
                window.dispatchEvent(new CustomEvent('open-search'))
              }}
              onVoiceSearch={() => {
                // Trigger search modal with voice mode via custom event
                window.dispatchEvent(new CustomEvent('open-voice-search'))
              }}
              onLogoClick={() => {
                if (currentPage === 'monarch-ai-chat') return
                navigateByPageId('research-platform')
              }}
              onPageChange={(pageId) => {
                if (pageId === 'research-zone') setResearchZoneToken(defaultBTCToken)
                handlePageChange(pageId)
              }}
              currentPage={currentPage}
              profile={profile}
            />
          )}
          {/* Conditionally show TokenTicker only on token page */}
          {currentView === 'token' && (
            <TokenTicker selectToken={selectToken} selectedToken={token} />
          )}
          
          {/* Main Content – fills remaining space when nav opens/closes */}
          <div className="app-main-content">
          {currentPage === 'research-zone' ? (
            <ResearchZoneLite
              initialSymbol={researchZoneToken?.symbol}
              initialToken={researchZoneToken}
              dayMode={researchZoneDayMode}
              onDayModeChange={setResearchZoneDayMode}
              cinemaMode={appDisplayMode === 'cinema'}
              marketMode={marketMode}
            />
          ) : currentPage === 'structure-guide' ? (
            <StructureGuidePage />
          ) : currentPage === 'glossary' ? (
            <GlossaryPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'fear-greed' ? (
            <FearGreedPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
              marketMode={marketMode}
            />
          ) : currentPage === 'discover' ? (
            <DiscoverPage
              dayMode={welcomeDayMode}
              marketMode={marketMode}
              selectToken={(tokenData) => {
                selectToken(tokenData)
                navigateTo('token')
              }}
              onOpenResearchZone={(tokenData) => {
                selectToken(tokenData)
                setResearchZoneToken(tokenData)
                handlePageChange('research-zone')
              }}
              addToWatchlist={addToWatchlist}
              isInWatchlist={isInWatchlist}
            />
          ) : currentPage === 'categories' ? (
            <CategoriesPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
              marketMode={marketMode}
            />
          ) : currentPage === 'heatmaps' ? (
            <HeatmapsPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
              marketMode={marketMode}
            />
          ) : currentPage === 'bubbles' ? (
            <BubblesPage
              dayMode={welcomeDayMode}
              marketMode={marketMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'funding-rates' ? (
            <FundingRatesPage
              dayMode={welcomeDayMode}
              marketMode={marketMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'defi-yields' ? (
            <DeFiYieldsPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'ai-charts' ? (
            <AIChartsPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
              marketMode={marketMode}
            />
          ) : currentPage === 'ai-charts-lab' ? (
            <AIChartsLabPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'logs' ? (
            <LogsPage onBack={() => handlePageChange('research-platform')} />
          ) : currentPage === 'social-zone' ? (
            <SocialZonePage />
          ) : currentPage === 'ai-media-center' ? (
            <MediaCenterPage />
          ) : currentPage === 'x-dash' ? (
            <XDashPage />
          ) : currentPage === 'x-bubbles' ? (
            <XBubblesPage />
          ) : currentPage === 'search-engine' ? (
            <div className="search-engine-page">
              <div className="search-engine-container">
                {/* Spectre logo & Title - AI coded style */}
                <div className="search-engine-header">
                  <div className="search-engine-logo">
                    <img src="/spectre-logo-dark.png" alt="Spectre" className="search-engine-logo-img" onError={(e) => { e.target.onerror = null; e.target.src = '/round-logo.png' }} />
                  </div>
                  <h1 className="search-engine-title">{t('searchEngine.title')}</h1>
                  <p className="search-engine-subtitle">{t('searchEngine.subtitle')}</p>
                </div>

                {/* Search Box */}
                <div className="search-engine-box">
                  <div className="search-engine-input-wrapper">
                    <span className="search-engine-input-icon">{spectreIcons.search}</span>
                    <input 
                      type="text" 
                      className="search-engine-input" 
                      placeholder="Search tokens, ask questions, or paste an address..."
                    />
                  </div>
                  <div className="search-engine-actions">
                    <button className="search-engine-attach" title="Attach file">
                      {spectreIcons.attach}
                    </button>
                    <button className="search-engine-btn">
                      {spectreIcons.send}
                    </button>
                  </div>
                </div>

                {/* Focus Areas */}
                <div className="search-engine-focus">
                  <span className="search-engine-focus-label">Focus</span>
                  <div className="search-engine-focus-chips">
                    <button className="search-engine-focus-chip active">
                      {spectreIcons.discover}
                      All
                    </button>
                    <button className="search-engine-focus-chip">
                      {spectreIcons.tokenTab}
                      Tokens
                    </button>
                    <button className="search-engine-focus-chip">
                      {spectreIcons.portfolio}
                      Wallets
                    </button>
                    <button className="search-engine-focus-chip">
                      {spectreIcons.whale}
                      DeFi
                    </button>
                    <button className="search-engine-focus-chip">
                      {spectreIcons.image}
                      NFTs
                    </button>
                    <button className="search-engine-focus-chip">
                      {spectreIcons.news}
                      News
                    </button>
                  </div>
                </div>

                {/* Trending Searches */}
                <div className="search-engine-trending">
                  <div className="search-engine-trending-header">
                    {spectreIcons.trending}
                    <span>Trending Now</span>
                  </div>
                  <div className="search-engine-trending-grid">
                    {[
                      { icon: spectreIcons.fire, query: 'Top gainers last 24h', category: 'Markets' },
                      { icon: spectreIcons.whale, query: 'Whale wallet movements', category: 'On-Chain' },
                      { icon: spectreIcons.listing, query: 'New Solana token launches', category: 'Discovery' },
                      { icon: spectreIcons.volume, query: 'ETH gas tracker', category: 'Tools' },
                      { icon: spectreIcons.sparkles, query: 'Undervalued DeFi gems', category: 'Alpha' },
                      { icon: spectreIcons.bank, query: 'Institutional flows today', category: 'Smart Money' },
                    ].map((item, i) => (
                      <button key={i} className="search-engine-trending-item">
                        <span className="search-engine-trending-icon">{item.icon}</span>
                        <div className="search-engine-trending-content">
                          <span className="search-engine-trending-query">{item.query}</span>
                          <span className="search-engine-trending-category">{item.category}</span>
                        </div>
                        <span className="search-engine-trending-arrow">{spectreIcons.chevronRight}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="search-engine-quick">
                  <button className="search-engine-quick-btn">
                    {spectreIcons.chat}
                    Start a Thread
                  </button>
                  <button className="search-engine-quick-btn">
                    {spectreIcons.grid}
                    Create Collection
                  </button>
                  <button className="search-engine-quick-btn">
                    {spectreIcons.library}
                    Explore Library
                  </button>
                </div>
              </div>
            </div>
          ) : currentPage === 'roi-calculator' ? (
            <ROICalculatorPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'market-analytics' ? (
            <MarketAnalyticsPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
              marketMode={marketMode}
            />
          ) : currentPage === 'ai-market-analysis' ? (
            <AIMarketAnalysisPage
              dayMode={welcomeDayMode}
              onBack={() => handlePageChange('research-platform')}
            />
          ) : currentPage === 'watchlists' ? (
            <WatchlistsPage
              dayMode={welcomeDayMode}
              marketMode={marketMode}
              watchlist={watchlist}
              watchlistName={activeWatchlist?.name ?? 'My Watchlist'}
              watchlists={watchlists.map(w => ({ id: w.id, name: w.name, tokenCount: w.tokens?.length ?? 0, updatedAt: w.updatedAt ?? Date.now() }))}
              activeWatchlistId={activeWatchlistId}
              onRenameWatchlist={renameWatchlist}
              onAddWatchlist={addWatchlist}
              onRemoveWatchlist={removeWatchlist}
              onSwitchWatchlist={setActiveWatchlist}
              addToWatchlist={addToWatchlist}
              removeFromWatchlist={removeFromWatchlist}
              togglePinWatchlist={togglePinWatchlist}
              reorderWatchlist={reorderWatchlist}
              onTokenClick={(tokenData, viewMode) => {
                // Select the token
                selectToken(tokenData)
                // Navigate based on view mode: majors → Research Zone, on-chain → AI Screener
                if (viewMode === 'major') {
                  setResearchZoneToken(tokenData)
                  handlePageChange('research-zone')
                } else {
                  // On-chain mode: go to AI Screener (token view)
                  handlePageChange('ai-screener')
                }
              }}
            />
          ) : currentView === 'welcome' ? (
            <WelcomePage
              cinemaMode={appDisplayMode === 'cinema'}
              profile={profile}
              onProfileChange={handleProfileChange}
              dayMode={welcomeDayMode}
              marketMode={marketMode}
              selectToken={(tokenData) => {
                selectToken(tokenData)
                navigateTo('token')
              }}
              onOpenResearchZone={(tokenData) => {
                selectToken(tokenData)
                setResearchZoneToken(tokenData)
                handlePageChange('research-zone')
              }}
              onOpenAIScreener={(tokenData) => {
                selectToken(tokenData)
                navigateTo('token')
              }}
              discoverOnly={discoverOnly}
              watchlist={watchlist}
              watchlists={watchlistsSummary}
              activeWatchlistId={activeWatchlistId}
              onSwitchWatchlist={setActiveWatchlist}
              addToWatchlist={addToWatchlist}
              removeFromWatchlist={removeFromWatchlist}
              isInWatchlist={isInWatchlist}
              togglePinWatchlist={togglePinWatchlist}
              reorderWatchlist={reorderWatchlist}
              onPageChange={handlePageChange}
              setAssistantActions={setAssistantActions}
              setAssistantContext={setAssistantContext}
              pendingChartToken={pendingChartToken}
              setPendingChartToken={setPendingChartToken}
              pendingCommandCenterTab={pendingCommandCenterTab}
              setPendingCommandCenterTab={setPendingCommandCenterTab}
              eggStage={eggStage}
              eggStarted={eggStarted}
              eggProgress={eggProgress}
              agentIsBorn={agentIsBorn}
              agentProfile={agentProfile}
              onEggClick={handleEggClick}
              onOpenAgentChat={() => { setAgentBirthFlow(false); setAgentChatOpen(true) }}
            />
          ) : (
            <>
              <main className={`main-layout ${isLeftPanelCollapsed ? 'left-collapsed' : ''} ${isRightPanelCollapsed ? 'right-collapsed' : ''}`}>
                {/* Left Panel - X/Watchlist + Trending/AI Logs */}
                <aside className={`panel-left ${isLeftPanelCollapsed ? 'collapsed' : ''}`}>
                  <button 
                    className="panel-toggle panel-toggle-left"
                    onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                    title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isLeftPanelCollapsed ? (
                        <path d="M9 18l6-6-6-6" />
                      ) : (
                        <path d="M15 18l-6-6 6-6" />
                      )}
                    </svg>
                  </button>
                  <div className="panel-content">
                    <LeftPanel 
                      marketMode={marketMode}
                      chartViewMode={chartViewMode} 
                      setChartViewMode={setChartViewMode}
                      watchlist={watchlist}
                      addToWatchlist={addToWatchlist}
                      removeFromWatchlist={removeFromWatchlist}
                      togglePinWatchlist={togglePinWatchlist}
                      reorderWatchlist={reorderWatchlist}
                      selectToken={selectToken}
                    />
                  </div>
                </aside>

                {/* Center - Token Banner + Chart + Data */}
                <section className={`content-main ${isDataTabsExpanded ? 'data-expanded' : ''}`}>
                  {/* Mobile-only view tabs: All / Chart / Charts & Txns — ABOVE banner */}
                  {isMobile && (
                    <div className="mobile-token-view-tabs">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'chart', label: 'Chart' },
                        { id: 'charts-txns', label: 'Charts & Txns' },
                        { id: 'txns', label: 'Txns' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          className={`mobile-token-view-tab ${mobileTokenTab === tab.id ? 'active' : ''}`}
                          onClick={() => setMobileTokenTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <TokenBanner
                    key={token.address || token.symbol}
                    token={token}
                    isInWatchlist={isInWatchlist(token.address || token.symbol)}
                    addToWatchlist={addToWatchlist}
                    removeFromWatchlist={removeFromWatchlist}
                  />
                  {(!isMobile || mobileTokenTab === 'all' || mobileTokenTab === 'chart' || mobileTokenTab === 'charts-txns') && (
                    <TradingChart chartViewMode={chartViewMode} setChartViewMode={setChartViewMode} token={token} stats={stats} isCollapsed={isDataTabsExpanded} />
                  )}
                  {(!isMobile || mobileTokenTab === 'all' || mobileTokenTab === 'charts-txns' || mobileTokenTab === 'txns') && (
                    <DataTabs token={token} isExpanded={isDataTabsExpanded} setIsExpanded={setIsDataTabsExpanded} />
                  )}
                </section>

                {/* Right Panel - Research Zone + Stats + Trading */}
                <aside className={`panel-right ${isRightPanelCollapsed ? 'collapsed' : ''}`}>
                  <button 
                    className="panel-toggle panel-toggle-right"
                    onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                    title={isRightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isRightPanelCollapsed ? (
                        <path d="M15 18l-6-6 6-6" />
                      ) : (
                        <path d="M9 18l6-6-6-6" />
                      )}
                    </svg>
                  </button>
                  <div className="panel-content">
                    <RightPanel key={token.address || token.symbol} token={token} />
                  </div>
                </aside>
              </main>
            </>
          )}
          </div>

          {/* Mobile bottom nav – show on ALL pages when mobile */}
          {isMobile && (
            <MobileBottomNav
              activeId={
                currentPage === 'watchlists' ? 'favorites' :
                currentPage === 'discover' ? 'discover' :
                currentPage === 'research-zone' ? 'research-zone' :
                currentPage === 'ai-screener' ? 'ai-screener' :
                currentPage === 'gm-dashboard' ? 'gm-dashboard' :
                currentPage === 'roi-calculator' ? 'roi-calculator' :
                currentPage === 'fear-greed' ? 'fear-greed' :
                currentPage === 'heatmaps' ? 'heatmaps' :
                currentPage === 'bubbles' ? 'bubbles' :
                'home'
              }
              onHome={() => {
                navigateByPageId('research-platform')
                setTimeout(() => {
                  const welcomePage = document.querySelector('.welcome-page')
                  if (welcomePage) welcomePage.scrollTo({ top: 0, behavior: 'smooth' })
                }, 100)
              }}
              onDiscover={() => {
                navigateByPageId('discover')
              }}
              onFavorites={() => {
                navigateByPageId('watchlists')
              }}
              onFearGreed={() => {
                navigateByPageId('fear-greed')
              }}
              onHeatmaps={() => {
                navigateByPageId('heatmaps')
              }}
              onBubbles={() => {
                navigateByPageId('bubbles')
              }}
              onGMDashboard={() => {
                navigateByPageId('gm-dashboard')
              }}
              onROICalculator={() => {
                navigateByPageId('roi-calculator')
              }}
              onResearchZone={() => {
                setResearchZoneToken(defaultBTCToken)
                navigateByPageId('research-zone')
              }}
              onAIScreener={() => {
                navigateByPageId('ai-screener')
              }}
            />
          )}

          {/* ─── Spectre Egg Explainer Modal ─── */}
          <EggExplainerModal
            open={eggExplainerOpen}
            onClose={() => setEggExplainerOpen(false)}
            onStartHatching={handleStartHatching}
          />

          {/* ─── Agent Chat Panel ─── */}
          <SpectreAgentChat
            open={agentChatOpen}
            onClose={() => { setAgentChatOpen(false); setAgentBirthFlow(false) }}
            isBirthFlow={agentBirthFlow}
            onBirthComplete={handleBirthComplete}
            appContext={{
              currentPage,
              currentView,
              selectedToken: token,
              researchZoneToken,
              watchlist,
              marketMode,
            }}
          />

          {/* ─── Agent FAB (post-birth) ─── */}
          {agentIsBorn && !agentChatOpen && (
            <AgentFAB
              agentColor={agentProfile?.agentColor || '#00f0ff'}
              level={agentProfile?.level || 1}
              onClick={() => { setAgentBirthFlow(false); setAgentChatOpen(true) }}
            />
          )}

          {/* Global Copy Toast */}
          {showCopyToast && (
            <div className="copy-toast">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {copyToastMessage}
            </div>
          )}
    </div>
  )

  return (
    <I18nCurrencyProvider>
      <CopyToastContext.Provider value={{ triggerCopyToast }}>
        <AuthGate>
          <MobilePreviewContext.Provider value={showMobilePreview}>
            {showMobilePreview ? (
              <MobilePreviewFrame onClose={() => setShowMobilePreview(false)}>
                {appContent}
              </MobilePreviewFrame>
            ) : (
              appContent
            )}
          </MobilePreviewContext.Provider>
        </AuthGate>
      </CopyToastContext.Provider>
    </I18nCurrencyProvider>
  )
}

export default App
