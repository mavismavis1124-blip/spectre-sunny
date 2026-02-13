/**
 * TradingChart Component
 * Figma Reference: Chart with type buttons above timeframes
 * Professional candlestick chart
 * 
 * NOW WITH REAL-TIME DATA FROM CODEX API
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { useChartData, useTokenDetails } from '../hooks/useCodexData'
import { resolveTradingViewSymbol, resolveDexTradingViewSymbol, searchTradingViewSymbol } from '../lib/tradingViewSymbols'
import './TradingChart.css'

// Custom comparison function for TradingChart props
const areChartPropsEqual = (prevProps, nextProps) => {
  // Always re-render if view mode changes
  if (prevProps.chartViewMode !== nextProps.chartViewMode) return false
  if (prevProps.isCollapsed !== nextProps.isCollapsed) return false
  if (prevProps.dayMode !== nextProps.dayMode) return false
  if (prevProps.embedMode !== nextProps.embedMode) return false
  if (prevProps.embedHeight !== nextProps.embedHeight) return false
  if (prevProps.initialChartType !== nextProps.initialChartType) return false
  
  // Deep compare token - only re-render if address or network changes
  if (prevProps.token?.address !== nextProps.token?.address) return false
  if (prevProps.token?.networkId !== nextProps.token?.networkId) return false
  if (prevProps.token?.symbol !== nextProps.token?.symbol) return false
  
  // Live price changes should NOT trigger full re-render (handled internally)
  // Stats comparison - only if mcap/volume/athPrice changed
  const prevStats = prevProps.stats || {}
  const nextStats = nextProps.stats || {}
  if (prevStats.mcap !== nextStats.mcap) return false
  if (prevStats.volume !== nextStats.volume) return false
  if (prevStats.athPrice !== nextStats.athPrice) return false
  
  // Function refs - always treat as equal (useCallback in parent)
  return true
}

const TradingChart = React.memo(({ chartViewMode = 'trading', setChartViewMode, token, stats, isCollapsed = false, embedHeight, dayMode, livePrice, initialChartType, embedMode = false }) => {
  const { t } = useTranslation()
  const { fmtPrice: hookFmtPrice, fmtLarge: hookFmtLarge, currencySymbol } = useCurrency()
  // Fetch real token data including circulating supply
  const { tokenData: liveTokenData } = useTokenDetails(
    token?.address,
    token?.networkId || 1,
    15000 // Refresh every 15 seconds for real-time price
  )
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  // Persist timeframe and chartType in localStorage
  const [timeframe, setTimeframeState] = useState(() => {
    const saved = localStorage.getItem('spectre-timeframe')
    return saved || '1H'
  })
  const [chartType, setChartTypeState] = useState(() => {
    if (initialChartType) return initialChartType
    const saved = localStorage.getItem('spectre-chartType')
    // Force candles for tokens that need async resolution (DEX or TV search)
    if (saved === 'tradingview' && token?.address) {
      const res = resolveTradingViewSymbol(token)
      if (res.source === 'needs-dex-resolution' || res.source === 'needs-tv-search') return 'candles'
    }
    return saved || 'candles'
  })
  
  // Wrapper functions to save to localStorage
  const setTimeframe = (tf) => {
    setTimeframeState(tf)
    localStorage.setItem('spectre-timeframe', tf)
  }
  const setChartType = (type) => {
    setChartTypeState(type)
    localStorage.setItem('spectre-chartType', type)
  }
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [yAxisMode, setYAxisMode] = useState('price') // 'price' or 'mcap'
  const [showATHLines, setShowATHLines] = useState(false) // Show ATH and local ATH lines
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null })
  const [crosshair, setCrosshair] = useState({ visible: false, x: 0, y: 0, price: null, time: null, candle: null, candleX: 0 })
  const [redrawTrigger, setRedrawTrigger] = useState(0)
  const [tfDropdownOpen, setTfDropdownOpen] = useState(false)
  const [tfDropdownPos, setTfDropdownPos] = useState({ top: 0, right: 0 })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1400)
  const chartDimensionsRef = useRef(null)
  const tfDropdownBtnRef = useRef(null)
  const [hoveredMention, setHoveredMention] = useState(null)
  
  // Resizable chart height — smaller on mobile to prevent overflow
  const [chartHeight, setChartHeight] = useState(window.innerWidth < 768 ? 300 : 580)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartY = useRef(0)
  const resizeStartHeight = useRef(0)
  
  // Zoom and axis scaling - DexTools-like behavior
  // Default zoom shows ~100 candles (DexTools style - see more data, thinner candles)
  const [zoomLevel, setZoomLevel] = useState(() => {
    // Calculate initial zoom to show ~100 candles - DexTools style
    return Math.max(1, Math.ceil(1441 / 100)) // ~14x zoom for 1441 bars
  })
  const [priceZoom, setPriceZoom] = useState(1) // 1 = 100% (vertical/price zoom)
  const [autoFitPrice, setAutoFitPrice] = useState(true) // Auto-fit price to visible candles
  const [priceAxisWidth] = useState(75) // Slightly wider price axis for readability
  const [timeAxisHeight] = useState(50) // Reduced time axis for more chart space
  const [isDraggingPriceAxis, setIsDraggingPriceAxis] = useState(false)
  const [isDraggingTimeAxis, setIsDraggingTimeAxis] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, value: 0 })
  
  // Chart panning (horizontal + vertical scroll) with momentum - TradingView style
  const [panOffset, setPanOffset] = useState(0) // Horizontal offset in candles (positive = looking at older data)
  const [priceOffset, setPriceOffset] = useState(0) // Vertical offset as percentage of price range
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, offset: 0, priceOff: 0 })
  const panVelocityRef = useRef({ x: 0, y: 0 }) // Momentum velocity (x and y)
  const lastPanXRef = useRef(0) // Last pan position for velocity calculation
  const lastPanYRef = useRef(0) // Last pan Y position
  const lastPanTimeRef = useRef(0) // Last pan time
  const momentumAnimationRef = useRef(null) // Animation frame for momentum

  // X Mentions data - KOL and community mentions mapped to price action
  const xMentions = [
    { id: 1, user: 'Crypto Banter', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CryptoBanter&backgroundColor=ff6b35', candleIndex: 8, sentiment: 'bullish', content: 'Just reviewed @Spectre__AI - legit project!', likes: 2341 },
    { id: 2, user: 'Lark Davis', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LarkDavis&backgroundColor=2563eb', candleIndex: 15, sentiment: 'bullish', content: 'AI-assisted trading is the future 👀', likes: 1892 },
    { id: 3, user: 'CryptoWhale', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale&backgroundColor=6366f1', candleIndex: 22, sentiment: 'bullish', content: 'Accumulated more $SPECTRE 🔥', likes: 567 },
    { id: 4, user: 'Altcoin Daily', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AltcoinDaily&backgroundColor=dc2626', candleIndex: 28, sentiment: 'bullish', content: 'Bloomberg Terminal for crypto!', likes: 3456 },
    { id: 5, user: 'DeFi Marcus', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=8b5cf6', candleIndex: 35, sentiment: 'neutral', content: 'Saved me from a rug pull', likes: 423 },
    { id: 6, user: 'Coin Bureau', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CoinBureau&backgroundColor=0ea5e9', candleIndex: 42, sentiment: 'bullish', content: 'Rug pull detection is impressive!', likes: 4521 },
    { id: 7, user: 'Spectre AI', avatar: '/round-logo.png', candleIndex: 48, sentiment: 'announcement', content: '🚀 New feature: AI analytics live!', likes: 1247 },
    { id: 8, user: 'AlphaSeeker', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alpha&backgroundColor=06b6d4', candleIndex: 52, sentiment: 'bullish', content: '4 out of 5 trades profitable 📈', likes: 312 },
  ]

  // X Bubbles initial data - KOL network connections
  // Categories: 'main' (green), 'project' (pink), 'top5' (yellow), 'kol100k' (orange), 'kolUnder100k' (purple)
  const initialBubblesData = [
    { id: 0, user: 'Spectre AI', handle: '@Spectre__AI', avatar: '/logo.png', followers: '125K', followersNum: 125000, size: 'center', x: 50, y: 50, category: 'main', timestamp: Date.now() - 3600000 },
    { id: 1, user: 'Crypto Banter', handle: '@CryptoBanter', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CryptoBanter&backgroundColor=ff6b35', followers: '892K', followersNum: 892000, size: 'large', x: 75, y: 25, category: 'top5', timestamp: Date.now() - 7200000 },
    { id: 2, user: 'Lark Davis', handle: '@TheCryptoLark', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LarkDavis&backgroundColor=2563eb', followers: '456K', followersNum: 456000, size: 'large', x: 85, y: 55, category: 'top5', timestamp: Date.now() - 1800000 },
    { id: 3, user: 'Altcoin Daily', handle: '@AltcoinDailyio', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AltcoinDaily&backgroundColor=dc2626', followers: '1.2M', followersNum: 1200000, size: 'xlarge', x: 70, y: 75, category: 'top5', timestamp: Date.now() - 86400000 },
    { id: 4, user: 'Coin Bureau', handle: '@coinbureau', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CoinBureau&backgroundColor=0ea5e9', followers: '2.1M', followersNum: 2100000, size: 'xlarge', x: 25, y: 70, category: 'top5', timestamp: Date.now() - 172800000 },
    { id: 5, user: 'CryptoWhale', handle: '@cryptowhale_io', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale&backgroundColor=6366f1', followers: '234K', followersNum: 234000, size: 'medium', x: 15, y: 40, category: 'kol100k', timestamp: Date.now() - 3600000 },
    { id: 6, user: 'DeFi Marcus', handle: '@defi_marcus', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=8b5cf6', followers: '87K', followersNum: 87000, size: 'small', x: 20, y: 15, category: 'kolUnder100k', timestamp: Date.now() - 300000 },
    { id: 7, user: 'AlphaSeeker', handle: '@alpha_seeker', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alpha&backgroundColor=06b6d4', followers: '156K', followersNum: 156000, size: 'medium', x: 40, y: 20, category: 'kol100k', timestamp: Date.now() - 600000 },
    { id: 8, user: 'Trader Joe', handle: '@traderjoe_eth', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joe&backgroundColor=10b981', followers: '45K', followersNum: 45000, size: 'small', x: 90, y: 80, category: 'kolUnder100k', timestamp: Date.now() - 1800000 },
    { id: 9, user: 'Wizz', handle: '@WizzCrypto', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Wizz&backgroundColor=f59e0b', followers: '14.1K', followersNum: 14100, size: 'small', x: 60, y: 85, category: 'kolUnder100k', timestamp: Date.now() - 2592000000 },
    { id: 10, user: 'Palm AI', handle: '@PalmAI_', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=PalmAI&backgroundColor=22c55e', followers: '67K', followersNum: 67000, size: 'medium', x: 35, y: 80, category: 'project', timestamp: Date.now() - 604800000 },
  ]
  
  // X Bubbles Filter State
  const [legendFilter, setLegendFilter] = useState({
    main: true,
    project: true,
    top5: true,
    kol100k: true,
    kolUnder100k: true
  })
  const [timeFilter, setTimeFilter] = useState('all')
  const [followersRange, setFollowersRange] = useState({ min: '', max: '' })
  const [legendDropdownOpen, setLegendDropdownOpen] = useState(false)
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false)
  const [followersDropdownOpen, setFollowersDropdownOpen] = useState(false)
  
  // Time filter options
  const timeFilterOptions = [
    { value: 'all', label: t('chart.allTime'), ms: null },
    { value: '5m', label: t('chart.last5min'), ms: 5 * 60 * 1000 },
    { value: '30m', label: t('chart.last30min'), ms: 30 * 60 * 1000 },
    { value: '1h', label: t('chart.last1hour'), ms: 60 * 60 * 1000 },
    { value: '6h', label: t('chart.last6hours'), ms: 6 * 60 * 60 * 1000 },
    { value: '24h', label: t('chart.last24hours'), ms: 24 * 60 * 60 * 1000 },
    { value: '1w', label: t('chart.last1week'), ms: 7 * 24 * 60 * 60 * 1000 },
    { value: '1M', label: t('chart.last1month'), ms: 30 * 24 * 60 * 60 * 1000 },
    { value: '3M', label: t('chart.last3months'), ms: 90 * 24 * 60 * 60 * 1000 },
    { value: '6M', label: t('chart.last6months'), ms: 180 * 24 * 60 * 60 * 1000 },
    { value: '1y', label: t('chart.last1year'), ms: 365 * 24 * 60 * 60 * 1000 },
  ]

  // Connections between bubbles [from, to]
  const bubbleConnections = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], // All connect to center
    [1, 2], // Crypto Banter <-> Lark Davis
    [1, 7], // Crypto Banter <-> AlphaSeeker
    [2, 3], // Lark Davis <-> Altcoin Daily
    [3, 4], // Altcoin Daily <-> Coin Bureau
    [4, 5], // Coin Bureau <-> CryptoWhale
    [5, 6], // CryptoWhale <-> DeFi Marcus
    [6, 7], // DeFi Marcus <-> AlphaSeeker
    [8, 9], // Trader Joe <-> Wizz
    [9, 10], // Wizz <-> Palm AI
    [3, 9], // Altcoin Daily <-> Wizz
    [4, 10], // Coin Bureau <-> Palm AI
  ]

  // Physics simulation state - bubbles are stable by default
  // Spread bubbles across a larger 3D space for space flight experience
  const [bubblePhysics, setBubblePhysics] = useState(() => 
    initialBubblesData.map((b, index) => ({
      ...b,
      vx: 0, // velocity x - starts at 0 (stable)
      vy: 0, // velocity y - starts at 0 (stable)
      vz: 0, // velocity z - for 3D mode
      // Spread bubbles in a sphere around center, with center bubble at origin
      z: b.size === 'center' ? 0 : (Math.random() - 0.5) * 800,
      // Also randomize x/y slightly for 3D mode
      x3d: b.x + (b.size === 'center' ? 0 : (Math.random() - 0.5) * 20),
      y3d: b.y + (b.size === 'center' ? 0 : (Math.random() - 0.5) * 20),
    }))
  )
  
  // Filter bubbles based on all filters
  const getFilteredBubbles = useCallback(() => {
    if (!bubblePhysics || bubblePhysics.length === 0) return []
    
    return bubblePhysics.filter(bubble => {
      // Category filter - if category doesn't exist, show the bubble
      const category = bubble.category || 'kolUnder100k'
      if (legendFilter[category] === false) return false
      
      // Time filter - skip if 'all' time selected
      if (timeFilter && timeFilter !== 'all') {
        const timeOption = timeFilterOptions.find(opt => opt.value === timeFilter)
        if (timeOption && timeOption.ms && bubble.timestamp) {
          const now = Date.now()
          if (now - bubble.timestamp > timeOption.ms) return false
        }
      }
      
      // Followers range filter - skip if not set
      if (followersRange.min !== '' || followersRange.max !== '') {
        const followerCount = bubble.followersNum || 0
        const minFollowers = followersRange.min !== '' ? parseInt(followersRange.min) : 0
        const maxFollowers = followersRange.max !== '' ? parseInt(followersRange.max) : Infinity
        if (followerCount < minFollowers || followerCount > maxFollowers) return false
      }
      
      return true
    })
  }, [bubblePhysics, legendFilter, timeFilter, followersRange, timeFilterOptions])
  
  // Get category color for bubble border
  const getCategoryColor = (category) => {
    const colors = {
      main: '#22c55e',      // Green
      project: '#ec4899',   // Pink
      top5: '#eab308',      // Yellow
      kol100k: '#f97316',   // Orange
      kolUnder100k: '#a855f7' // Purple
    }
    return colors[category] || '#8b5cf6'
  }
  
  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Ignore clicks on share dropdown (rendered via portal)
      if (e.target.closest('.share-dropdown')) return
      
      if (!e.target.closest('.bubble-filter-dropdown')) {
        setLegendDropdownOpen(false)
        setTimeDropdownOpen(false)
        setFollowersDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  
  const [selectedBubble, setSelectedBubble] = useState(null)
  const [draggingBubble, setDraggingBubble] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [viewMode, setViewMode] = useState('3D') // '2D' or '3D'
  
  // 3D Camera state - expanded range for space flight
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 800, rotX: 0, rotY: 0 })
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationMode, setNavigationMode] = useState(null) // 'pan', 'rotate', 'forward'
  const [flightSpeed, setFlightSpeed] = useState(0) // Current forward velocity for smooth flight
  const [isWarpSpeed, setIsWarpSpeed] = useState(false) // Warp drive effect
  const [flightControlsCollapsed, setFlightControlsCollapsed] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const keysPressed = useRef(new Set())
  
  const bubblesContainerRef = useRef(null)
  const animationRef = useRef(null)
  const mousePos = useRef({ x: 0, y: 0 })
  
  // Physics constants - tuned to match Bubblemaps feel
  const SPRING_STRENGTH = 0.008    // How strongly connected bubbles pull together
  const SPRING_LENGTH = 120        // Ideal distance between connected bubbles
  const REPULSION_STRENGTH = 800   // How strongly bubbles push apart
  const DAMPING = 0.92             // Friction (0.9 = bouncy, 0.99 = sluggish)
  const CENTER_GRAVITY = 0.0005    // Gentle pull toward center
  const MAX_VELOCITY = 8           // Speed limit

  // Physics simulation - only runs when dragging or settling
  useEffect(() => {
    if (chartViewMode !== 'xBubbles') {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }

    // When not dragging, gently settle any remaining movement
    if (draggingBubble === null) {
      // Check if any bubbles are still moving
      const stillMoving = bubblePhysics.some(b => Math.abs(b.vx) > 0.01 || Math.abs(b.vy) > 0.01)
      
      if (stillMoving) {
        // Smooth settle animation
        const settleFrame = () => {
          setBubblePhysics(prev => {
            const hasMotion = prev.some(b => Math.abs(b.vx) > 0.01 || Math.abs(b.vy) > 0.01)
            if (!hasMotion) return prev
            
            return prev.map(b => ({
              ...b,
              vx: b.vx * 0.88, // Gradual slowdown
              vy: b.vy * 0.88,
              x: b.x + b.vx * 0.6,
              y: b.y + b.vy * 0.6,
            }))
          })
        }
        
        // Run settle animation for a few frames
        const settleInterval = setInterval(settleFrame, 16)
        setTimeout(() => clearInterval(settleInterval), 500)
      }
      return
    }

    const simulate = () => {
      setBubblePhysics(prev => {
        const newState = prev.map(bubble => {
          // If being dragged, follow mouse with smooth easing
          if (draggingBubble === bubble.id) {
            const targetX = mousePos.current.x - dragOffset.x
            const targetY = mousePos.current.y - dragOffset.y
            
            // Smooth easing - slower, more organic follow (0.12 = very smooth)
            const easing = 0.12
            const newX = bubble.x + (targetX - bubble.x) * easing
            const newY = bubble.y + (targetY - bubble.y) * easing
            
            return {
              ...bubble,
              x: newX,
              y: newY,
              vx: (newX - bubble.x) * 0.8, // Gentle momentum transfer
              vy: (newY - bubble.y) * 0.8,
            }
          }

          let fx = 0, fy = 0 // Forces

          // 1. Spring forces - gentle pull toward connected bubbles
          bubbleConnections.forEach(([from, to]) => {
            let other = null
            if (from === bubble.id) other = prev.find(b => b.id === to)
            else if (to === bubble.id) other = prev.find(b => b.id === from)
            
            if (other) {
              const dx = other.x - bubble.x
              const dy = other.y - bubble.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              
              // Gentler spring force for organic movement
              const isConnectedToDragged = other.id === draggingBubble
              const springMult = isConnectedToDragged ? 1.5 : 0.5
              const force = (dist - SPRING_LENGTH / 5) * SPRING_STRENGTH * 0.5 * springMult
              
              fx += (dx / dist) * force
              fy += (dy / dist) * force
            }
          })

          // 2. Soft repulsion - very gentle push apart
          prev.forEach(other => {
            if (other.id === bubble.id) return
            const dx = bubble.x - other.x
            const dy = bubble.y - other.y
            const distSq = dx * dx + dy * dy || 1
            const dist = Math.sqrt(distSq)
            const minDist = 6
            
            if (dist < minDist * 2) {
              const force = (REPULSION_STRENGTH * 0.15) / distSq
              fx += (dx / dist) * force
              fy += (dy / dist) * force
            }
          })

          // 3. Apply forces with heavy damping for smooth movement
          let vx = (bubble.vx * 0.92 + fx * 0.5) // Blend velocity with force
          let vy = (bubble.vy * 0.92 + fy * 0.5)

          // 4. Lower max velocity for slower movement
          const maxSpeed = 3
          const speed = Math.sqrt(vx * vx + vy * vy)
          if (speed > maxSpeed) {
            vx = (vx / speed) * maxSpeed
            vy = (vy / speed) * maxSpeed
          }
          
          // Stop tiny movements
          if (Math.abs(vx) < 0.005) vx = 0
          if (Math.abs(vy) < 0.005) vy = 0

          // 5. Update position smoothly
          let newX = bubble.x + vx
          let newY = bubble.y + vy

          // 6. Soft bounds (ease back instead of hard clamp)
          if (newX < 8) newX = newX + (8 - newX) * 0.1
          if (newX > 92) newX = newX - (newX - 92) * 0.1
          if (newY < 10) newY = newY + (10 - newY) * 0.1
          if (newY > 90) newY = newY - (newY - 90) * 0.1

          return { ...bubble, x: newX, y: newY, vx, vy }
        })

        return newState
      })

      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [chartViewMode, draggingBubble, dragOffset])

  // Handle bubble drag start
  const handleBubbleMouseDown = (e, bubbleId) => {
    e.preventDefault()
    e.stopPropagation()
    
    const bubble = bubblePhysics.find(b => b.id === bubbleId)
    if (!bubble || !bubblesContainerRef.current) return

    const rect = bubblesContainerRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100
    
    mousePos.current = { x: mouseX, y: mouseY }
    setDraggingBubble(bubbleId)
    setDragOffset({ x: mouseX - bubble.x, y: mouseY - bubble.y })
  }

  // Track mouse movement globally
  const handleGlobalMouseMove = (e) => {
    if (!bubblesContainerRef.current) return
    const rect = bubblesContainerRef.current.getBoundingClientRect()
    mousePos.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const handleBubbleDragEnd = () => {
    setDraggingBubble(null)
  }

  // Global mouse listeners
  useEffect(() => {
    if (draggingBubble !== null) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleBubbleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', handleBubbleDragEnd)
      }
    }
  }, [draggingBubble])

  // Get connected bubble IDs for styling
  const getConnectedBubbles = (bubbleId) => {
    const connected = new Set()
    bubbleConnections.forEach(([from, to]) => {
      if (from === bubbleId) connected.add(to)
      if (to === bubbleId) connected.add(from)
    })
    return connected
  }

  // Handle window resize for responsive timeframe selector
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1400)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle chart resize drag
  const handleResizeStart = (e) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartY.current = e.clientY
    resizeStartHeight.current = chartHeight
  }

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return
      const deltaY = e.clientY - resizeStartY.current
      const newHeight = Math.max(300, Math.min(900, resizeStartHeight.current + deltaY))
      setChartHeight(newHeight)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing, chartHeight])

  // Handle keyboard navigation for 3D mode + ESC for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        return
      }
      
      // 3D Navigation keys (only in 3D mode and xBubbles view)
      if (viewMode === '3D' && chartViewMode === 'xBubbles') {
        keysPressed.current.add(e.key.toLowerCase())
      }
    }
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isFullscreen, viewMode, chartViewMode])
  
  // 3D Space Flight animation loop
  useEffect(() => {
    if (viewMode !== '3D' || chartViewMode !== 'xBubbles') return
    
    let animId
    const baseSpeed = 2
    const rotSpeed = 0.4
    const acceleration = 0.3
    const deceleration = 0.95
    const maxSpeed = 25
    const warpMultiplier = 4
    
    let currentVelocity = { x: 0, y: 0, z: 0 }
    
    const animate = () => {
      const keys = keysPressed.current
      const isWarp = keys.has('shift')
      setIsWarpSpeed(isWarp)
      
      const speedMult = isWarp ? warpMultiplier : 1
      
      // Target velocities based on input
      let targetVx = 0, targetVy = 0, targetVz = 0
      
      // Forward/Back (W/S) - main flight controls
      if (keys.has('w')) targetVz = baseSpeed * speedMult * 3
      if (keys.has('s')) targetVz = -baseSpeed * speedMult * 2
      
      // Strafe (A/D)
      if (keys.has('a')) targetVx = -baseSpeed * speedMult
      if (keys.has('d')) targetVx = baseSpeed * speedMult
      
      // Up/Down (Q/E) 
      if (keys.has('q')) targetVy = -baseSpeed * speedMult
      if (keys.has('e')) targetVy = baseSpeed * speedMult
      
      // Boost forward/backward (R/F)
      if (keys.has('r')) targetVz = baseSpeed * speedMult * 5
      if (keys.has('f')) targetVz = -baseSpeed * speedMult * 3
      
      // Smooth acceleration toward target
      currentVelocity.x += (targetVx - currentVelocity.x) * acceleration
      currentVelocity.y += (targetVy - currentVelocity.y) * acceleration
      currentVelocity.z += (targetVz - currentVelocity.z) * acceleration
      
      // Decelerate when no input
      if (targetVx === 0) currentVelocity.x *= deceleration
      if (targetVy === 0) currentVelocity.y *= deceleration
      if (targetVz === 0) currentVelocity.z *= deceleration
      
      // Clamp velocity
      currentVelocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocity.x))
      currentVelocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, currentVelocity.y))
      currentVelocity.z = Math.max(-maxSpeed * 2, Math.min(maxSpeed * 2, currentVelocity.z))
      
      // Update flight speed for UI
      setFlightSpeed(Math.abs(currentVelocity.z))
      
      // Apply velocity and rotation
      const hasMovement = Math.abs(currentVelocity.x) > 0.01 || 
                          Math.abs(currentVelocity.y) > 0.01 || 
                          Math.abs(currentVelocity.z) > 0.01 ||
                          keys.size > 0
      
      if (hasMovement) {
        setCamera(prev => {
          let { x, y, z, rotX, rotY } = prev
          
          // Rotation with arrow keys (intuitive: arrow direction = look direction)
          if (keys.has('arrowleft')) rotY += rotSpeed
          if (keys.has('arrowright')) rotY -= rotSpeed
          if (keys.has('arrowup')) rotX -= rotSpeed
          if (keys.has('arrowdown')) rotX += rotSpeed
          
          // Clamp rotation (allow more freedom for space feel)
          rotX = Math.max(-80, Math.min(80, rotX))
          rotY = Math.max(-80, Math.min(80, rotY))
          
          // Convert rotation to radians for direction calculation
          const radX = (rotX * Math.PI) / 180
          const radY = (rotY * Math.PI) / 180
          
          // Transform velocity based on camera rotation (fly where you're looking)
          // W = fly toward center of screen, S = fly backward
          const forwardX = Math.sin(radY) * currentVelocity.z
          const forwardY = -Math.sin(radX) * currentVelocity.z
          const forwardZ = -Math.cos(radY) * Math.cos(radX) * currentVelocity.z
          
          // Strafe (X velocity) moves perpendicular to camera facing
          const strafeX = Math.cos(radY) * currentVelocity.x
          const strafeZ = Math.sin(radY) * currentVelocity.x
          
          // Up/down (Y velocity) stays in world space
          const verticalY = currentVelocity.y
          
          // Apply transformed velocity
          x += forwardX + strafeX
          y += forwardY + verticalY
          z += forwardZ + strafeZ
          
          // Extended Z range for deep space exploration
          z = Math.max(-500, Math.min(2000, z))
          
          // Extended X/Y range
          x = Math.max(-500, Math.min(500, x))
          y = Math.max(-500, Math.min(500, y))
          
          return { x, y, z, rotX, rotY }
        })
      }
      
      animId = requestAnimationFrame(animate)
    }
    
    animate()
    return () => cancelAnimationFrame(animId)
  }, [viewMode, chartViewMode])
  
  // 3D Mouse navigation handlers
  const handle3DMouseDown = (e) => {
    if (viewMode !== '3D') return
    
    e.preventDefault()
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    if (e.button === 0) { // Left click - rotate
      setNavigationMode('rotate')
    } else if (e.button === 2) { // Right click - pan
      setNavigationMode('pan')
    } else if (e.button === 1) { // Middle click - forward/back
      setNavigationMode('forward')
    }
    setIsNavigating(true)
  }
  
  const handle3DMouseMove = (e) => {
    if (!isNavigating || viewMode !== '3D') return
    
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    setCamera(prev => {
      let { x, y, z, rotX, rotY } = prev
      
      if (navigationMode === 'rotate') {
        // Intuitive: drag right = look right, drag up = look up
        rotY -= dx * 0.3
        rotX += dy * 0.3
        rotX = Math.max(-60, Math.min(60, rotX))
        rotY = Math.max(-60, Math.min(60, rotY))
      } else if (navigationMode === 'pan') {
        x -= dx * 0.5
        y -= dy * 0.5
      } else if (navigationMode === 'forward') {
        z -= dy * 2
        z = Math.max(100, Math.min(1500, z))
      }
      
      return { x, y, z, rotX, rotY }
    })
  }
  
  const handle3DMouseUp = () => {
    setIsNavigating(false)
    setNavigationMode(null)
  }
  
  const handle3DWheel = useCallback((e) => {
    if (viewMode !== '3D' || chartViewMode !== 'xBubbles') return
    
    e.preventDefault()
    e.stopPropagation()
    setCamera(prev => {
      let z = prev.z + e.deltaY * 1.5
      z = Math.max(-500, Math.min(2000, z))
      return { ...prev, z }
    })
  }, [viewMode, chartViewMode])
  
  // Attach wheel event to X Bubbles container with passive: false to prevent page scroll
  useEffect(() => {
    const container = bubblesContainerRef.current
    if (!container || chartViewMode !== 'xBubbles') return
    
    container.addEventListener('wheel', handle3DWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handle3DWheel)
    }
  }, [handle3DWheel, chartViewMode])
  
  // Reset 3D camera - return to starting position
  const resetCamera = () => {
    setCamera({ x: 0, y: 0, z: 800, rotX: 0, rotY: 0 })
    setFlightSpeed(0)
  }
  
  // Handle ESC key to exit fullscreen (kept for backwards compatibility)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Add/remove body class for fullscreen mode to hide other page elements
  useEffect(() => {
    if (isFullscreen) {
      if (chartViewMode === 'xBubbles') {
        document.body.classList.add('x-bubbles-fullscreen')
        document.body.classList.remove('chart-fullscreen')
      } else {
        document.body.classList.add('chart-fullscreen')
        document.body.classList.remove('x-bubbles-fullscreen')
      }
    } else {
      document.body.classList.remove('x-bubbles-fullscreen')
      document.body.classList.remove('chart-fullscreen')
    }
    return () => {
      document.body.classList.remove('x-bubbles-fullscreen')
      document.body.classList.remove('chart-fullscreen')
    }
  }, [isFullscreen, chartViewMode])

  // Force redraw after fullscreen transition
  useEffect(() => {
    // Immediate redraw
    setRedrawTrigger(prev => prev + 1)
    
    // Delayed redraw for CSS transition
    const timer = setTimeout(() => {
      setRedrawTrigger(prev => prev + 1)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isFullscreen])

  const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D', '1W']
  const chartTypes = [
    { id: 'candles', label: t('chart.candles') },
    { id: 'line', label: t('chart.line') },
    { id: 'tradingview', label: t('chart.tradingView') },
    { id: 'x', label: '𝕏' },
  ]

  // TradingView embed — universal symbol resolution via centralized resolver
  // Supports: major crypto (CRYPTO:BTCUSD), CEX tokens (BINANCE:XXXUSDT),
  //           stocks (NASDAQ:AAPL), DEX tokens (UNISWAP:SPECTREWETH_8A6D95.USD)
  const sym = (token?.symbol || 'BTC').toUpperCase()

  // Synchronous resolution (covers ~95% of cases instantly)
  const syncTvResolution = useMemo(() =>
    resolveTradingViewSymbol(token, token?.isStock ? 'stocks' : 'crypto'),
    [token?.symbol, token?.address, token?.networkId, token?.isStock, token?.exchange]
  )

  // Async resolution: DEX tokens (Codex API) + universal TV search (any asset worldwide)
  const [asyncTvSymbol, setAsyncTvSymbol] = useState(null)
  const [tvLoading, setTvLoading] = useState(false)
  const tvFetchedRef = useRef(null)

  useEffect(() => {
    const source = syncTvResolution.source

    // Already resolved confidently — no async needed
    if (source !== 'needs-dex-resolution' && source !== 'needs-tv-search') {
      setAsyncTvSymbol(null)
      tvFetchedRef.current = null
      return
    }

    // Unique key for this resolution (avoid duplicate fetches)
    const fetchKey = source === 'needs-dex-resolution'
      ? `dex:${token?.address}`
      : `tv:${sym}:${token?.isStock ? 'stock' : 'crypto'}`
    if (tvFetchedRef.current === fetchKey) return
    tvFetchedRef.current = fetchKey

    setTvLoading(true)

    if (source === 'needs-dex-resolution') {
      // DEX token: resolve via Codex API, fallback to TV search
      const addr = token?.address
      if (!addr) { setTvLoading(false); return }
      resolveDexTradingViewSymbol(addr, token?.networkId || 1, sym)
        .then(data => {
          if (data.supported && data.symbol) {
            setAsyncTvSymbol(data.symbol)
          } else {
            // DEX resolution failed — try universal TV search as fallback
            return searchTradingViewSymbol(sym, 'crypto').then(tv => {
              setAsyncTvSymbol(tv.found ? tv.symbol : null)
            })
          }
        })
        .catch(() => setAsyncTvSymbol(null))
        .finally(() => setTvLoading(false))
    } else {
      // Unknown token/stock: resolve via TradingView search API
      const type = token?.isStock ? 'stock' : 'crypto'
      searchTradingViewSymbol(sym, type)
        .then(data => setAsyncTvSymbol(data.found ? data.symbol : null))
        .catch(() => setAsyncTvSymbol(null))
        .finally(() => setTvLoading(false))
    }
  }, [token?.address, token?.networkId, token?.isStock, sym, syncTvResolution.source])

  const hasTradingViewSupport = syncTvResolution.confident || !!asyncTvSymbol
  const tradingViewSymbol = syncTvResolution.confident
    ? syncTvResolution.symbol
    : (asyncTvSymbol || syncTvResolution.symbol || `CRYPTO:${sym}USD`)
  const tradingViewTheme = dayMode ? 'light' : 'dark'
  const tradingViewToolbarBg = dayMode ? '%23f8fafc' : '%2313161c'
  const tradingViewEmbedUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tradingViewSymbol)}&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=${tradingViewToolbarBg}&studies=%5B%5D&theme=${tradingViewTheme}&style=1&locale=en`


  // Map timeframe to Codex resolution
  const timeframeToResolution = {
    '1M': '1',
    '5M': '5',
    '15M': '15',
    '1H': '60',
    '4H': '240',
    '1D': '1D',
    '1W': '1W',
  }
  
  // Map timeframe to hours of data to fetch
  // API has a 1500 datapoint limit per request, so we stay under that
  // Lazy loading will fetch more history when user scrolls left
  const timeframeToPeriod = {
    '1M': 24,       // 1 day (~1440 candles) - max safe is ~25 hours
    '5M': 115,      // ~4.8 days (~1380 candles) - max safe is ~125 hours  
    '15M': 350,     // ~14.5 days (~1400 candles) - max safe is ~375 hours
    '1H': 1400,     // ~58 days (~1400 candles) - max safe is ~1500 hours
    '4H': 5600,     // ~233 days (~1400 candles) - max safe is ~6000 hours
    '1D': 33600,    // ~3.8 years (~1400 candles) - max safe is ~36000 hours
    '1W': 235200,   // ~27 years (~1400 candles) - essentially all history
  }

  // Period length in ms (for congruent live candle: only update last bar if still in same period)
  const timeframeToPeriodMs = {
    '1M': 1 * 60 * 1000,
    '5M': 5 * 60 * 1000,
    '15M': 15 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '4H': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
  }
  
  // Get symbol/address for chart data - prefer address for dynamic pair lookup
  const chartSymbol = token?.address || token?.symbol || 'SPECTRE'
  const chartNetworkId = token?.networkId || 1
  
  // Fetch real chart data from Codex API using the selected token
  const { bars: liveBars, loading: chartLoading, loadingMore, hasMoreHistory, fetchMoreHistory, athPrice: trueATH, error: chartError } = useChartData(
    chartSymbol,
    timeframeToResolution[timeframe] || '60',
    chartNetworkId,
    timeframeToPeriod[timeframe] || 168
  )

  const [candleData, setCandleData] = useState([])
  
  // Track previous timeframe and symbol to detect actual changes vs lazy loading
  const prevTimeframeRef = useRef(timeframe)
  const prevSymbolRef = useRef(chartSymbol)
  const initialLoadDoneRef = useRef(false)
  
  // Track lazy loading state to prevent cascade fetches
  const lastFetchTimeRef = useRef(0)
  const initialDataLoadedRef = useRef(false)
  
  // Update candle data when timeframe, token, or live data changes
  useEffect(() => {
    // Detect if this is a timeframe/symbol change vs lazy loading more data
    const isTimeframeChange = prevTimeframeRef.current !== timeframe
    const isSymbolChange = prevSymbolRef.current !== chartSymbol
    const isActualChange = isTimeframeChange || isSymbolChange || !initialLoadDoneRef.current
    
    // Update refs
    prevTimeframeRef.current = timeframe
    prevSymbolRef.current = chartSymbol
    
    // Use live data if available and has sufficient data points
    if (liveBars && liveBars.length > 10) {
      console.log(`Chart: Using ${liveBars.length} live bars for ${chartSymbol}`)
      const formattedBars = liveBars.map(bar => ({
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: typeof bar.volume === 'number' ? bar.volume : 0,
        date: new Date(bar.time)
      }))
      setCandleData(formattedBars)
      
      // Only reset zoom and pan when timeframe or symbol actually changes
      // NOT when lazy loading adds more historical data
      if (isActualChange) {
        console.log(`Resetting zoom/pan due to ${isTimeframeChange ? 'timeframe' : isSymbolChange ? 'symbol' : 'initial'} change`)
        // Set zoom level to show ~70 candles by default for all timeframes
        // User can zoom out manually to see full history
        const targetVisible = 70
        const optimalZoom = Math.max(1, Math.ceil(formattedBars.length / targetVisible))
        setZoomLevel(optimalZoom)
        setPanOffset(0) // Reset pan position to show latest data
        setPriceOffset(0) // Reset vertical pan
        setAutoFitPrice(true) // Re-enable auto price fitting
        initialLoadDoneRef.current = true
        
        // Only reset lazy loading flags for ACTUAL user-triggered timeframe/symbol changes
        // NOT for initial page load - this prevents double fetching on startup
        if (isTimeframeChange || isSymbolChange) {
          initialDataLoadedRef.current = false
          lastFetchTimeRef.current = 0
        }
      }
    } else {
      // No data available - keep empty state (will show loading)
      console.log(`Chart: Waiting for live data for ${chartSymbol}...`)
    }
  }, [timeframe, liveBars, chartSymbol])

  // Real-time last candle: merge livePrice only when congruent with timeframe (same period as last bar, or append new forming candle)
  const displayCandleData = useMemo(() => {
    if (!candleData.length) return candleData
    const price = livePrice != null && Number.isFinite(livePrice) ? Number(livePrice) : null
    if (price == null || price <= 0) return candleData
    const periodMs = timeframeToPeriodMs[timeframe] ?? 60 * 60 * 1000
    const now = Date.now()
    const last = candleData[candleData.length - 1]
    const lastBarStart = last.date instanceof Date ? last.date.getTime() : last.time ?? 0
    const lastBarEnd = lastBarStart + periodMs
    const stillInLastPeriod = now < lastBarEnd
    if (stillInLastPeriod) {
      const updatedLast = {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
      }
      return [...candleData.slice(0, -1), updatedLast]
    }
    const currentPeriodStart = Math.floor(now / periodMs) * periodMs
    const open = last.close
    const formingCandle = {
      open,
      high: Math.max(open, price),
      low: Math.min(open, price),
      close: price,
      volume: 0,
      date: new Date(currentPeriodStart),
    }
    return [...candleData, formingCandle]
  }, [candleData, livePrice, timeframe])

  // Track previous bar count to adjust panOffset when new history is loaded
  const prevBarsCountRef = useRef(candleData.length)
  
  // When new historical data is prepended, adjust panOffset to keep view stable
  // BUT only if user has actually scrolled into history (not on initial load)
  useEffect(() => {
    const prevCount = prevBarsCountRef.current
    const newCount = candleData.length
    
    // Only adjust if bars were prepended (new count is larger and data was added to the beginning)
    if (newCount > prevCount && prevCount > 0) {
      const addedBars = newCount - prevCount
      
      // Only adjust panOffset if user has scrolled into history (viewing older data)
      // If panOffset is near 0 (current price), keep user at current price
      setPanOffset(prev => {
        // Threshold: only adjust if user has scrolled at least 20% into the visible data
        const visibleCount = Math.max(1, Math.floor(newCount / zoomLevel))
        const scrollThreshold = visibleCount * 0.2
        
        if (prev > scrollThreshold) {
          // User is viewing historical data - adjust to keep same candles in view
          console.log(`Adjusted panOffset by ${addedBars} after loading more history (was viewing history)`)
          return prev + addedBars
        } else {
          // User is near current price - stay at current price
          console.log(`Keeping panOffset at ${prev} after loading more history (near current price)`)
          return prev
        }
      })
    }
    
    prevBarsCountRef.current = newCount
  }, [candleData.length, zoomLevel])

  // Track when user is trying to scroll past the left edge
  const edgeScrollAttemptsRef = useRef(0)
  const lastPanOffsetRef = useRef(panOffset)
  
  // Auto-fetch more history when user scrolls to the left edge (oldest data)
  useEffect(() => {
    if (loadingMore || !hasMoreHistory || candleData.length === 0) return
    
    const visibleCount = Math.max(1, Math.floor(candleData.length / zoomLevel))
    const maxPossibleOffset = Math.max(0, candleData.length - visibleCount)
    
    // Only do initial data fill ONCE and only if we have very little data (mock data)
    if (!initialDataLoadedRef.current && candleData.length < 150) {
      console.log(`Initial data fill needed (candles: ${candleData.length})`)
      initialDataLoadedRef.current = true
      lastFetchTimeRef.current = Date.now()
      fetchMoreHistory()
      return
    }
    
    // Mark initial load as done once we have real data
    if (candleData.length >= 150) {
      initialDataLoadedRef.current = true
    }
    
    // Detect if user is at the left edge
    const atLeftEdge = panOffset >= maxPossibleOffset - 3
    
    // Track edge scroll attempts - if panOffset hasn't changed but user is at edge, count it
    if (atLeftEdge && panOffset === lastPanOffsetRef.current && panOffset > 0) {
      edgeScrollAttemptsRef.current += 1
    } else {
      edgeScrollAttemptsRef.current = 0
    }
    lastPanOffsetRef.current = panOffset
    
    // Trigger fetch if at left edge (either just arrived or been there trying to scroll)
    if (atLeftEdge && panOffset > 0 && maxPossibleOffset > 0) {
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchTimeRef.current
      const cooldownMs = 2000 // 2 second cooldown
      
      if (timeSinceLastFetch >= cooldownMs) {
        console.log(`At left edge, fetching more... (offset: ${panOffset}, max: ${maxPossibleOffset})`)
        lastFetchTimeRef.current = now
        edgeScrollAttemptsRef.current = 0
        fetchMoreHistory()
      }
    }
  }, [panOffset, candleData.length, zoomLevel, loadingMore, hasMoreHistory, fetchMoreHistory])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Don't render if no data
    if (candleData.length === 0) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // === CLEAN DARK BACKGROUND ===
    ctx.fillStyle = '#0c0c0f'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // === CHART LAYOUT - DexTools style: more space for price action, tiny volume ===
    const chartTop = 15 // Minimal top padding
    const volumeAreaHeight = Math.max(50, rect.height * 0.12) // 12% of height for volume bars
    const chartBottom = rect.height - timeAxisHeight - volumeAreaHeight - 8 // More space for candles
    const chartHeight = chartBottom - chartTop
    const chartLeft = 12
    const chartRight = rect.width - priceAxisWidth

    // === CANDLE DIMENSIONS - DexTools style ===
    // Dynamic minimum candle width based on data density:
    // - For full-history views (1D/1W with 500+ candles): allow 1px min for full overview
    // - For intraday: keep 3px min for readability
    const isFullHistoryView = candleData.length > 400
    const minCandleWidth = isFullHistoryView ? 1 : 3
    const maxCandleWidth = 25 // Max width for readability at high zoom
    
    // Calculate chart width
    const chartWidth = chartRight - chartLeft
    
    // Calculate how many candles the user wants to see based on zoom
    const requestedCandles = Math.max(1, Math.floor(candleData.length / Math.max(0.1, zoomLevel)))
    
    // Calculate the actual candle width for requested candles
    const rawCandleWidth = chartWidth / requestedCandles
    
    // Clamp candle width to min/max bounds
    const candleWidth = Math.max(minCandleWidth, Math.min(maxCandleWidth, rawCandleWidth))
    
    // IMPORTANT: Recalculate visible candle count based on ACTUAL candle width
    // This ensures candles always fill the chart width
    const visibleCandleCount = Math.floor(chartWidth / candleWidth)
    
    // Body width: 60% of candle slot (DexTools has thinner bodies with gaps)
    const bodyWidth = Math.max(1, candleWidth * 0.6)
    
    // Calculate visible range based on zoom and pan offset
    // panOffset = 0 means current price (newest data) is at right edge
    // panOffset > 0 means looking at older data (scroll left into history)
    // panOffset < 0 means showing empty space on right (scroll right past newest)
    
    // Clamp panOffset to valid range to prevent rendering issues
    // Max: can scroll until oldest candle is at right edge (no further)
    const maxAllowedOffset = Math.max(0, candleData.length - visibleCandleCount)
    const minAllowedOffset = -Math.floor(visibleCandleCount * 0.5) // 50% empty space on right (future)
    const clampedPanOffset = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, panOffset))
    
    // Calculate indices with clamped offset - ensures we always have valid data
    const rawEndIndex = candleData.length - Math.floor(clampedPanOffset)
    const endIndex = Math.max(visibleCandleCount, Math.min(candleData.length, rawEndIndex))
    const startIndex = Math.max(0, endIndex - visibleCandleCount)
    const actualEndIndex = Math.min(candleData.length, startIndex + visibleCandleCount)
    
    // Calculate empty space offsets for edge cases
    // Right empty: when scrolled past newest data (negative offset)
    const rightEmptyCandles = clampedPanOffset < 0 ? Math.abs(Math.floor(clampedPanOffset)) : 0
    // Left empty: when at oldest data and chart has room (shouldn't happen with proper clamping)
    const leftEmptyCandles = Math.max(0, visibleCandleCount - actualEndIndex + startIndex)
    
    // Get visible data slice (use displayCandleData so last candle reflects livePrice)
    const visibleData = displayCandleData.slice(startIndex, actualEndIndex)

    // === PRICE ACTION HEATMAP BACKGROUND (Optional) - Now uses VISIBLE data ===
    // Calculate the actual width where candles exist (excluding empty space on right)
    const actualCandleAreaWidth = visibleData.length * candleWidth
    const heatmapLeft = chartLeft
    // Heatmap should only cover where candles actually are
    const heatmapRight = Math.min(chartRight, chartLeft + actualCandleAreaWidth)
    const heatmapWidth = Math.max(0, heatmapRight - heatmapLeft)
    
    if (heatmapEnabled && visibleData.length > 0 && heatmapWidth > 0) {
      const segmentCount = Math.min(10, visibleData.length) // 10 segments across visible data
      const segmentSize = Math.ceil(visibleData.length / segmentCount)
      const totalCandles = visibleData.length
      
      // Store raw segment data
      const rawSegments = []
      
      for (let s = 0; s < segmentCount; s++) {
        const startIdx = s * segmentSize
        const endIdx = Math.min(startIdx + segmentSize, visibleData.length)
        const segmentData = visibleData.slice(startIdx, endIdx)
        
        if (segmentData.length < 1) continue
        
        // Calculate momentum for this segment
        const segStartPrice = segmentData[0].open
        const segEndPrice = segmentData[segmentData.length - 1].close
        const momentum = segStartPrice > 0 ? (segEndPrice - segStartPrice) / segStartPrice : 0
        
        // Calculate volatility (price range) for intensity
        const highs = segmentData.map(c => c.high)
        const lows = segmentData.map(c => c.low)
        const volatility = segStartPrice > 0 ? (Math.max(...highs) - Math.min(...lows)) / segStartPrice : 0
        const intensity = Math.min(0.12, volatility * 1.5)
        
        // Position - based on actual candle positions, matching how candles are drawn
        // Each segment corresponds to actual candle positions
        // Apply same offset as candles: leftEmptyCandles (at oldest) and rightEmptyCandles (past newest)
        const candlesBeforeThisSegment = startIdx
        const x = chartLeft + (leftEmptyCandles + candlesBeforeThisSegment) * candleWidth - (rightEmptyCandles * candleWidth)
        const segmentWidth = segmentData.length * candleWidth
        
        // Determine zone type
        let zoneType = 'neutral'
        if (momentum > 0.005) zoneType = 'bullish'
        else if (momentum < -0.005) zoneType = 'bearish'
        
        // Create vertical gradient based on momentum
        const gradient = ctx.createLinearGradient(x, 0, x, rect.height)
        
        if (zoneType === 'bullish') {
          gradient.addColorStop(0, `rgba(52, 211, 153, ${intensity * 0.2})`)
          gradient.addColorStop(0.4, `rgba(52, 211, 153, ${intensity * 0.4})`)
          gradient.addColorStop(0.8, `rgba(52, 211, 153, ${intensity * 0.15})`)
          gradient.addColorStop(1, 'rgba(52, 211, 153, 0)')
        } else if (zoneType === 'bearish') {
          gradient.addColorStop(0, `rgba(251, 113, 133, ${intensity * 0.2})`)
          gradient.addColorStop(0.4, `rgba(251, 113, 133, ${intensity * 0.4})`)
          gradient.addColorStop(0.8, `rgba(251, 113, 133, ${intensity * 0.15})`)
          gradient.addColorStop(1, 'rgba(251, 113, 133, 0)')
        } else {
          gradient.addColorStop(0, `rgba(139, 92, 246, ${intensity * 0.1})`)
          gradient.addColorStop(0.5, `rgba(139, 92, 246, ${intensity * 0.08})`)
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
        }
        
        // Only draw if segment is within visible chart area
        if (x + segmentWidth > chartLeft && x < chartRight) {
        ctx.fillStyle = gradient
          ctx.fillRect(
            Math.max(x, chartLeft), 
            0, 
            Math.min(segmentWidth + 1, chartRight - Math.max(x, chartLeft)), 
            rect.height - timeAxisHeight
          )
        }
        
        rawSegments.push({
          x,
          segmentWidth,
          candleCount: segmentData.length,
          startPrice: segStartPrice,
          endPrice: segEndPrice,
          momentum,
          zoneType,
          intensity
        })
      }
      
      // Merge consecutive zones of the same type
      const mergedZones = []
      let currentZone = null
      
      rawSegments.forEach((seg, idx) => {
        if (!currentZone || currentZone.zoneType !== seg.zoneType) {
          // Start a new zone
          if (currentZone) mergedZones.push(currentZone)
          currentZone = {
            zoneType: seg.zoneType,
            startX: seg.x,
            endX: seg.x + seg.segmentWidth,
            candleCount: seg.candleCount,
            startPrice: seg.startPrice,
            endPrice: seg.endPrice,
            segmentCount: 1
          }
        } else {
          // Extend current zone
          currentZone.endX = seg.x + seg.segmentWidth
          currentZone.candleCount += seg.candleCount
          currentZone.endPrice = seg.endPrice
          currentZone.segmentCount++
        }
      })
      if (currentZone) mergedZones.push(currentZone)
      
      // Store merged zones for drawing labels later (on top of chart)
      // Use chartLeft/chartRight for clipping labels to visible area
      window._heatmapMergedZones = { zones: mergedZones, totalCandles, heatmapLeft: chartLeft, heatmapRight: chartRight }
    } else {
      // Clear heatmap data when disabled
      window._heatmapMergedZones = null
    }

    // === CALCULATE RANGES (based on visible data with price zoom + vertical pan) ===
    const prices = visibleData.flatMap(d => [d.high, d.low])
    const dataMinPrice = Math.min(...prices)
    const dataMaxPrice = Math.max(...prices)
    const dataPriceRange = dataMaxPrice - dataMinPrice
    
    // Apply price zoom - zoom into the center of the price range
    const midPrice = (dataMaxPrice + dataMinPrice) / 2
    const zoomedRange = dataPriceRange / priceZoom
    
    // Apply vertical pan offset (priceOffset is percentage of zoomed range)
    // Positive priceOffset = seeing higher prices (panned up)
    const priceShift = (priceOffset / 100) * zoomedRange
    
    const minPrice = midPrice - zoomedRange / 2 + priceShift
    const maxPrice = midPrice + zoomedRange / 2 + priceShift
    const priceRange = maxPrice - minPrice

    const scaleY = (price) => chartTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    // === SUBTLE GRID ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.lineWidth = 1
    
    for (let i = 1; i < 5; i++) {
      const y = chartTop + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(chartRight, y)
      ctx.stroke()
    }

    // === MUTED TRADING COLORS ===
    const greenColor = 'rgba(52, 199, 89, 0.75)'   // Faded green
    const redColor = 'rgba(239, 83, 80, 0.7)'      // Faded red

    // === DRAW CHART BASED ON TYPE ===
    if (chartType === 'line') {
      // === STUNNING LINE CHART - PREMIUM GRADIENT ===
      
      // Build smooth curve points using closing prices (visible data only)
      // Offset x position: add leftEmptyCandles (if at oldest), subtract rightEmptyCandles (if past newest)
      const points = visibleData.map((candle, i) => ({
        x: chartLeft + (leftEmptyCandles + i) * candleWidth + candleWidth / 2 - (rightEmptyCandles * candleWidth),
        y: scaleY(candle.close)
      }))

      // Calculate if overall trend is up or down
      const startPrice = visibleData[0].close
      const endPrice = visibleData[visibleData.length - 1].close
      const isOverallUp = endPrice >= startPrice

      // === PREMIUM COLOR PALETTE - No traditional red/green ===
      // Up: Electric Cyan to Bright Teal (fresh, modern, positive)
      // Down: Soft Violet to Rose (elegant, warm, not alarming)
      
      const lineGradient = ctx.createLinearGradient(chartLeft, 0, chartRight, 0)
      if (isOverallUp) {
        // Electric Cyan → Bright Teal → Mint
        lineGradient.addColorStop(0, '#06b6d4')    // Cyan
        lineGradient.addColorStop(0.4, '#14b8a6')  // Teal
        lineGradient.addColorStop(0.7, '#2dd4bf')  // Bright teal
        lineGradient.addColorStop(1, '#5eead4')    // Mint
      } else {
        // Soft Violet → Rose → Peach
        lineGradient.addColorStop(0, '#8b5cf6')    // Violet
        lineGradient.addColorStop(0.4, '#a78bfa')  // Light violet
        lineGradient.addColorStop(0.7, '#c4b5fd')  // Lavender
        lineGradient.addColorStop(1, '#ddd6fe')    // Pale lavender
      }

      // === AREA FILL GRADIENT ===
      const areaGradient = ctx.createLinearGradient(0, chartTop, 0, chartBottom)
      if (isOverallUp) {
        areaGradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)')
        areaGradient.addColorStop(0.3, 'rgba(20, 184, 166, 0.2)')
        areaGradient.addColorStop(0.6, 'rgba(45, 212, 191, 0.1)')
        areaGradient.addColorStop(1, 'rgba(94, 234, 212, 0)')
      } else {
        areaGradient.addColorStop(0, 'rgba(139, 92, 246, 0.35)')
        areaGradient.addColorStop(0.3, 'rgba(167, 139, 250, 0.2)')
        areaGradient.addColorStop(0.6, 'rgba(196, 181, 253, 0.1)')
        areaGradient.addColorStop(1, 'rgba(221, 214, 254, 0)')
      }

      // === DRAW AREA FILL ===
      ctx.beginPath()
      ctx.moveTo(points[0].x, chartBottom)
      
      // Smooth bezier curve through all points for area
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i]
        const next = points[i + 1]
        const cpx = (current.x + next.x) / 2
        ctx.quadraticCurveTo(current.x, current.y, cpx, (current.y + next.y) / 2)
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
      ctx.lineTo(points[points.length - 1].x, chartBottom)
      ctx.closePath()
      ctx.fillStyle = areaGradient
      ctx.fill()

      // === SUBTLE GLOW EFFECT ===
      ctx.shadowColor = isOverallUp ? 'rgba(6, 182, 212, 0.5)' : 'rgba(139, 92, 246, 0.5)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // === DRAW MAIN LINE ===
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      
      // Smooth bezier curve through all points
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i]
        const next = points[i + 1]
        const cpx = (current.x + next.x) / 2
        ctx.quadraticCurveTo(current.x, current.y, cpx, (current.y + next.y) / 2)
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
      
      ctx.strokeStyle = lineGradient
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // === CURRENT POINT - CLEAN MODERN STYLE ===
      const lastPoint = points[points.length - 1]
      
      // Only render the current point indicator if coordinates are valid
      if (lastPoint && Number.isFinite(lastPoint.x) && Number.isFinite(lastPoint.y)) {
        const accentColor = isOverallUp ? '#14b8a6' : '#8b5cf6'
        const accentLight = isOverallUp ? '#2dd4bf' : '#a78bfa'
        
        // Subtle outer glow
        const outerGlow = ctx.createRadialGradient(lastPoint.x, lastPoint.y, 0, lastPoint.x, lastPoint.y, 18)
        outerGlow.addColorStop(0, isOverallUp ? 'rgba(20, 184, 166, 0.3)' : 'rgba(139, 92, 246, 0.3)')
        outerGlow.addColorStop(1, 'transparent')
        ctx.fillStyle = outerGlow
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, 18, 0, Math.PI * 2)
        ctx.fill()

        // Clean outer ring
        ctx.strokeStyle = accentLight
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Solid center dot with gradient
        const dotGradient = ctx.createRadialGradient(lastPoint.x - 1, lastPoint.y - 1, 0, lastPoint.x, lastPoint.y, 5)
        dotGradient.addColorStop(0, '#ffffff')
        dotGradient.addColorStop(0.4, accentLight)
        dotGradient.addColorStop(1, accentColor)
        ctx.fillStyle = dotGradient
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }

    } else {
      // === DRAW CANDLES - Classic TradingView/DexTools style ===
      // Use canvas clipping to prevent drawing outside chart area
      ctx.save()
      ctx.beginPath()
      ctx.rect(chartLeft, chartTop, chartRight - chartLeft, chartBottom - chartTop)
      ctx.clip()
      
      visibleData.forEach((candle, i) => {
        // Offset x position: add leftEmptyCandles (if at oldest), subtract rightEmptyCandles (if past newest)
        const x = chartLeft + (leftEmptyCandles + i) * candleWidth + candleWidth / 2 - (rightEmptyCandles * candleWidth)
        
        const isGreen = candle.close >= candle.open
        const color = isGreen ? greenColor : redColor

        const openY = scaleY(candle.open)
        const closeY = scaleY(candle.close)
        const highY = scaleY(candle.high)
        const lowY = scaleY(candle.low)
        const bodyTop = Math.min(openY, closeY)
        const bodyHeight = Math.max(1, Math.abs(closeY - openY))

        // Wick - thin line through the candle
        const wickWidth = Math.max(1, bodyWidth * 0.12)
        ctx.strokeStyle = color
        ctx.lineWidth = wickWidth
        ctx.lineCap = 'butt'
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(x, highY)
        ctx.lineTo(x, lowY)
        ctx.stroke()

        // Body - solid rectangle, no rounded corners for classic look
        ctx.fillStyle = color
        ctx.fillRect(x - bodyWidth/2, bodyTop, bodyWidth, Math.max(bodyHeight, 1))
        
        ctx.globalAlpha = 1
      })
      
      ctx.restore()
    }

    // === HELPER FUNCTIONS FOR MCAP MODE ===
    // Format large numbers for MCap display
    const formatMcap = (value) => hookFmtLarge(value)
    
    // Use REAL circulating supply from API (liveTokenData), not hardcoded stats
    // The API returns the actual number (e.g., 900000000 for 900M tokens)
    const circSupply = liveTokenData?.circulatingSupply ? parseFloat(liveTokenData.circulatingSupply) : 0
    
    // Debug log for MCap calculation
    if (yAxisMode === 'mcap' && circSupply > 0) {
      console.log('MCap mode - Circ Supply:', circSupply, 'Token:', liveTokenData?.symbol)
    }

    // === CURRENT PRICE LINE - ALWAYS SHOWS LIVE/LATEST PRICE ===
    // Use the actual latest candle from the FULL dataset, not just visible data
    // This ensures the current price line always shows the live price even when scrolled left
    const latestCandle = displayCandleData[displayCandleData.length - 1]
    const currentPrice = latestCandle?.close
    
    // Skip price line rendering if data is invalid
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      // Skip the entire price line section if price is invalid
    } else {
    const currentY = scaleY(currentPrice)
    const isUp = latestCandle.close >= latestCandle.open
    
    // Only draw the price line if it's within the visible price range (or close to it)
    const isPriceInView = currentY >= chartTop - 50 && currentY <= chartBottom + 50
    
    // Different color schemes for Line chart vs Candle chart
    let priceLineColor, badgeBgColor
    if (chartType === 'line') {
      // Line chart: Cyan/Teal for up, Violet for down
      priceLineColor = isUp ? '#14b8a6' : '#8b5cf6'
      badgeBgColor = isUp ? 'rgba(20, 184, 166, 0.9)' : 'rgba(139, 92, 246, 0.9)'
    } else {
      // Candle chart: Muted green/red
      priceLineColor = isUp ? 'rgba(52, 199, 89, 0.6)' : 'rgba(239, 83, 80, 0.55)'
      badgeBgColor = isUp ? 'rgba(52, 199, 89, 0.8)' : 'rgba(239, 83, 80, 0.75)'
    }

    // Simple, elegant dashed line - always visible
    ctx.strokeStyle = priceLineColor
    ctx.globalAlpha = isPriceInView ? 0.5 : 0.3
    ctx.lineWidth = 1
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    // Clamp Y position to visible area but still show the line
    const clampedY = Math.max(chartTop, Math.min(chartBottom, currentY))
    ctx.moveTo(chartLeft, clampedY)
    ctx.lineTo(chartRight, clampedY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // === PRICE BADGE - CLEAN MODERN STYLE ===
    const badgeWidth = 62
    const badgeHeight = 22
    const badgeX = chartRight + 6
    // Position badge at clamped Y, but also add arrow indicator if price is off-screen
    const badgeY = clampedY - badgeHeight/2

    // Clean solid background with slight transparency
    ctx.fillStyle = badgeBgColor
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5)
    ctx.fill()

    // Subtle top highlight for depth (only if values are finite)
    if (Number.isFinite(badgeX) && Number.isFinite(badgeY) && Number.isFinite(badgeHeight)) {
      const highlight = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight)
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
      highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
      highlight.addColorStop(1, 'rgba(0, 0, 0, 0.1)')
      ctx.fillStyle = highlight
      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5)
      ctx.fill()
    }

    // Clean text - show price or mcap based on mode
    ctx.fillStyle = '#ffffff'
    ctx.font = '500 11px "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
    ctx.textAlign = 'center'
    if (yAxisMode === 'mcap' && circSupply > 0) {
      const currentMcap = currentPrice * circSupply
      ctx.fillText(formatMcap(currentMcap), badgeX + badgeWidth/2, clampedY + 3.5)
    } else {
      ctx.fillText(hookFmtPrice(currentPrice), badgeX + badgeWidth/2, clampedY + 3.5)
    }
    
    // Add arrow indicator if price is off-screen
    if (currentY < chartTop) {
      // Price is above visible area - show up arrow
      ctx.fillStyle = priceLineColor
      ctx.beginPath()
      ctx.moveTo(badgeX + badgeWidth/2 - 4, badgeY - 2)
      ctx.lineTo(badgeX + badgeWidth/2 + 4, badgeY - 2)
      ctx.lineTo(badgeX + badgeWidth/2, badgeY - 8)
      ctx.closePath()
      ctx.fill()
    } else if (currentY > chartBottom) {
      // Price is below visible area - show down arrow
      ctx.fillStyle = priceLineColor
      ctx.beginPath()
      ctx.moveTo(badgeX + badgeWidth/2 - 4, badgeY + badgeHeight + 2)
      ctx.lineTo(badgeX + badgeWidth/2 + 4, badgeY + badgeHeight + 2)
      ctx.lineTo(badgeX + badgeWidth/2, badgeY + badgeHeight + 8)
      ctx.closePath()
      ctx.fill()
    }
    } // End of currentPrice validity check

    // === ATH LINES (All-Time High & Local High) ===
    if (showATHLines && displayCandleData.length > 0) {
      // For line chart, use close prices (what's actually drawn)
      // For candle chart, use high prices (wick tops)
      const priceField = chartType === 'line' ? 'close' : 'high'
      
      // Use trueATH from hook if available (fetched from all historical data)
      // Fall back to calculating from loaded candleData if not available yet
      let athPrice = trueATH
      if (!athPrice || athPrice <= 0) {
        const allHighs = displayCandleData.map(c => {
          const val = c[priceField]
          return typeof val === 'number' && Number.isFinite(val) ? val : 0
        }).filter(v => v > 0)
        athPrice = allHighs.length > 0 ? Math.max(...allHighs) : 0
      }
      const athY = scaleY(athPrice)
      
      // Calculate Local High (highest in visible data)
      const visibleHighs = visibleData.map(c => {
        const val = c[priceField]
        return typeof val === 'number' && Number.isFinite(val) ? val : 0
      }).filter(v => v > 0)
      
      const localHighPrice = visibleHighs.length > 0 ? Math.max(...visibleHighs) : 0
      const localHighY = scaleY(localHighPrice)
      
      
      // Format value based on yAxisMode (price or mcap)
      // Use adaptive decimal places for small prices
      const formatATHValue = (price) => {
        if (yAxisMode === 'mcap' && circSupply > 0) {
          const mcapValue = price * circSupply
          console.log(`ATH MCap calculation: price=${price}, circSupply=${circSupply}, mcap=${mcapValue}`)
          return formatMcap(mcapValue)
        }
        return hookFmtPrice(price)
      }
      
      // Draw ATH line (gold/yellow color)
      if (athY >= chartTop - 20 && athY <= chartBottom + 20) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)' // Amber/gold
        ctx.lineWidth = 1
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(chartLeft, athY)
        ctx.lineTo(chartRight, athY)
        ctx.stroke()
        ctx.setLineDash([])
        
        // ATH label on right side
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)'
        ctx.font = '600 11px "SF Pro Text", -apple-system, system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`ATH ${formatATHValue(athPrice)}`, chartRight - 8, athY - 5)
      }
      
      // Draw Local High line (cyan/teal color) - only if significantly different from ATH
      if (localHighPrice < athPrice * 0.995 && localHighY >= chartTop - 20 && localHighY <= chartBottom + 20) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)' // Cyan
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(chartLeft, localHighY)
        ctx.lineTo(chartRight, localHighY)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Local High label on right side
        ctx.fillStyle = 'rgba(34, 211, 238, 0.9)'
        ctx.font = '600 11px "SF Pro Text", -apple-system, system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`Local High ${formatATHValue(localHighPrice)}`, chartRight - 8, localHighY - 5)
      }
    }

    // === PRICE/MCAP LABELS (Y-axis) - RIGHT SIDE ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '500 11px "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
    ctx.textAlign = 'left'

    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceRange / 4) * (4 - i)
      const y = chartTop + (chartHeight / 4) * i
      
      if (yAxisMode === 'mcap' && circSupply > 0) {
        const mcap = price * circSupply
        ctx.fillText(formatMcap(mcap), chartRight + 10, y + 4)
      } else {
        ctx.fillText(hookFmtPrice(price), chartRight + 10, y + 4)
      }
    }

    // === VOLUME BARS - Professional purple style ===
    const volumeTop = chartBottom + 4
    const volumeHeight = volumeAreaHeight - 6
    // Filter out zero/undefined volumes when calculating max
    const volumeValues = visibleData.map(d => d.volume || 0).filter(v => v > 0)
    const maxVolume = volumeValues.length > 0 ? Math.max(...volumeValues) : 1

    // Use canvas clipping for volume bars too
    ctx.save()
    ctx.beginPath()
    ctx.rect(chartLeft, volumeTop, chartRight - chartLeft, volumeHeight)
    ctx.clip()
    
    visibleData.forEach((candle, i) => {
      const x = chartLeft + (leftEmptyCandles + i) * candleWidth + candleWidth / 2 - (rightEmptyCandles * candleWidth)
      
      // Skip if no volume data (API doesn't provide volume for older candles)
      const volume = candle.volume || 0
      if (volume <= 0) return
      
      const rawBarHeight = (volume / maxVolume) * volumeHeight
      const barHeight = Math.max(2, rawBarHeight)
      // Volume bar width matches candle body width for clean alignment
      const volBarWidth = Math.max(2, bodyWidth * 0.85)
      const barTop = volumeTop + volumeHeight - barHeight
      
      // Smooth, professional purple gradient - subtle and muted
      const volGradient = ctx.createLinearGradient(x, barTop + barHeight, x, barTop)
      volGradient.addColorStop(0, 'rgba(91, 63, 153, 0.6)')   // Muted deep purple at bottom
      volGradient.addColorStop(1, 'rgba(124, 93, 176, 0.45)') // Soft purple at top
      
      ctx.fillStyle = volGradient
      ctx.fillRect(x - volBarWidth/2, barTop, volBarWidth, barHeight)
    })
    
    ctx.restore() // Restore from volume bar clipping

    // === TIME LABELS (X-axis) - Now using actual candle dates ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '500 10px "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
    ctx.textAlign = 'center'

    // Format date/time based on timeframe
    const formatTimeLabel = (date, tf) => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const day = date.getDate()
      const month = date.toLocaleString('en', { month: 'short' })
      const year = date.getFullYear().toString().slice(-2)
      
      // For intraday timeframes (1M, 5M, 15M, 1H, 4H), show time
      // For daily/weekly, show date
      switch(tf) {
        case '1M':
        case '5M':
        case '15M':
          return `${hours}:${minutes}`
        case '1H':
        case '4H':
          return `${month} ${day} ${hours}:${minutes}`
        case '1D':
          return `${month} ${day}`
        case '1W':
          return `${month} ${day}, '${year}`
        default:
          return `${hours}:${minutes}`
      }
    }
    
    // Calculate how many labels to show (aim for 5-8 labels)
    const targetLabelCount = Math.min(7, Math.max(3, Math.floor(visibleData.length / 15)))
    const labelInterval = Math.max(1, Math.floor(visibleData.length / targetLabelCount))
    
    // Draw time labels from actual candle data
    for (let i = 0; i < visibleData.length; i += labelInterval) {
      const candle = visibleData[i]
      if (candle && candle.date) {
        const x = chartLeft + i * candleWidth + candleWidth / 2
        const label = formatTimeLabel(candle.date, timeframe)
        if (label) {
          ctx.fillText(label, x, rect.height - 6)
        }
      }
    }
    
    // Always show the last candle's time (most recent)
    if (visibleData.length > 0) {
      const lastCandle = visibleData[visibleData.length - 1]
      if (lastCandle && lastCandle.date) {
        const x = chartLeft + (visibleData.length - 1) * candleWidth + candleWidth / 2
        const label = formatTimeLabel(lastCandle.date, timeframe)
        if (label) {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.8)' // Highlight current time in purple
          ctx.fillText(label, x, rect.height - 6)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)' // Reset color
        }
      }
    }

    // === X CHART OVERLAY - Show social mentions on price chart ===
    if (chartViewMode === 'xChart') {
      // Draw line chart overlay first
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)'
      ctx.lineWidth = 2
      visibleData.forEach((candle, i) => {
        const x = chartLeft + i * candleWidth + candleWidth / 2
        const y = scaleY(candle.close)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Add glow effect to line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)'
      ctx.lineWidth = 6
      displayCandleData.forEach((candle, i) => {
        const x = chartLeft + i * candleWidth + candleWidth / 2
        const y = scaleY(candle.close)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Draw vertical lines at mention points
      xMentions.forEach(mention => {
        if (mention.candleIndex < displayCandleData.length) {
          const x = chartLeft + mention.candleIndex * candleWidth + candleWidth / 2
          const candle = displayCandleData[mention.candleIndex]
          const y = scaleY(candle.close)

          // Vertical dotted line
          ctx.strokeStyle = mention.sentiment === 'bullish' ? 'rgba(34, 197, 94, 0.4)' : 
                           mention.sentiment === 'announcement' ? 'rgba(139, 92, 246, 0.6)' : 
                           'rgba(255, 255, 255, 0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(x, chartTop)
          ctx.lineTo(x, y - 25)
          ctx.stroke()
          ctx.setLineDash([])

          // Glow behind avatar
          const glowColor = mention.sentiment === 'bullish' ? 'rgba(34, 197, 94, 0.3)' : 
                           mention.sentiment === 'announcement' ? 'rgba(139, 92, 246, 0.4)' : 
                           'rgba(255, 255, 255, 0.2)'
          ctx.fillStyle = glowColor
          ctx.beginPath()
          ctx.arc(x, y - 40, 22, 0, Math.PI * 2)
          ctx.fill()

          // Ring around avatar position
          ctx.strokeStyle = mention.sentiment === 'bullish' ? '#22c55e' : 
                           mention.sentiment === 'announcement' ? '#8b5cf6' : 
                           '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y - 40, 18, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
    }

    // === SPECTRE AI WATERMARK ===
    // Note: Watermark disabled by default. Enable showWatermark for chart sharing feature.
    const showWatermark = false // Set to true when user shares chart
    if (showWatermark && (chartType === 'candles' || chartType === 'line')) {
      ctx.save()
      
      // Center position
      const wmX = (chartLeft + chartRight) / 2
      const wmY = (chartTop + chartBottom) / 2
      
      // Premium Apple system font watermark (subtle)
      ctx.globalAlpha = 0.035
      ctx.font = '500 60px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      
      // Simple centered text
      ctx.fillText('Spectre AI', wmX, wmY)
      
      ctx.restore()
    }

    // === HEATMAP ZONE LABELS (drawn on top of everything) ===
    if (heatmapEnabled && window._heatmapMergedZones) {
      const { zones: mergedZones, totalCandles, heatmapLeft: hmLeft, heatmapRight: hmRight } = window._heatmapMergedZones
      
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      mergedZones.forEach((zone) => {
        const zoneWidth = zone.endX - zone.startX
        const centerX = zone.startX + zoneWidth / 2
        
        // Skip zones that are completely outside the visible area
        if (zone.endX < hmLeft || zone.startX > hmRight) return
        
        // Skip if center is outside visible area (label would be cut off)
        if (centerX < hmLeft + 30 || centerX > hmRight - 30) return
        
        const longevityPercent = ((zone.candleCount / totalCandles) * 100).toFixed(0)
        const priceChange = zone.startPrice > 0 
          ? ((zone.endPrice - zone.startPrice) / zone.startPrice * 100).toFixed(1) 
          : '0.0'
        const sign = parseFloat(priceChange) >= 0 ? '+' : ''
        
        // Zone colors
        let zoneColor, textColor
        if (zone.zoneType === 'bullish') {
          zoneColor = 'rgba(52, 211, 153, 0.95)'
          textColor = 'rgba(52, 211, 153, 1)'
        } else if (zone.zoneType === 'bearish') {
          zoneColor = 'rgba(251, 113, 133, 0.95)'
          textColor = 'rgba(251, 113, 133, 1)'
        } else {
          zoneColor = 'rgba(167, 139, 250, 0.8)'
          textColor = 'rgba(167, 139, 250, 0.9)'
        }
        
        // Position label in the upper portion of the chart area
        const labelY = 100
        const pillHeight = 44
        const pillWidth = Math.max(60, Math.min(zoneWidth - 16, 90))
        const pillX = centerX - pillWidth / 2
        const pillRadius = 8
        
        // Glassmorphic background
        const bgGradient = ctx.createLinearGradient(pillX, labelY, pillX, labelY + pillHeight)
        bgGradient.addColorStop(0, 'rgba(12, 12, 18, 0.92)')
        bgGradient.addColorStop(1, 'rgba(8, 8, 12, 0.95)')
        
        ctx.fillStyle = bgGradient
        ctx.beginPath()
        ctx.roundRect(pillX, labelY, pillWidth, pillHeight, pillRadius)
        ctx.fill()
        
        // Subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
        
        // Colored accent line at top
        ctx.strokeStyle = zoneColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(pillX + pillRadius, labelY + 1)
        ctx.lineTo(pillX + pillWidth - pillRadius, labelY + 1)
        ctx.stroke()
        
        // Longevity percentage (main number)
        ctx.font = '700 16px "SF Pro Display", -apple-system, sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillText(`${longevityPercent}%`, centerX, labelY + 16)
        
        // Price change (below)
        ctx.font = '600 11px "SF Pro Text", -apple-system, sans-serif'
        ctx.fillStyle = textColor
        ctx.fillText(`${sign}${priceChange}%`, centerX, labelY + 34)
        
        // If zone spans multiple segments, show a subtle range indicator below the pill
        if (zone.segmentCount > 1) {
          const rangeY = labelY + pillHeight + 6
          // Clamp line drawing to visible area
          const lineStartX = Math.max(zone.startX + 8, hmLeft)
          const lineEndX = Math.min(zone.endX - 8, hmRight)
          
          if (lineEndX > lineStartX) {
          ctx.strokeStyle = zoneColor
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 3])
          ctx.beginPath()
            ctx.moveTo(lineStartX, rangeY)
            ctx.lineTo(lineEndX, rangeY)
          ctx.stroke()
          ctx.setLineDash([])
          
            // Small dots at ends (only if within visible area)
          ctx.fillStyle = zoneColor
            if (zone.startX + 8 >= hmLeft && zone.startX + 8 <= hmRight) {
          ctx.beginPath()
          ctx.arc(zone.startX + 8, rangeY, 2, 0, Math.PI * 2)
          ctx.fill()
            }
            if (zone.endX - 8 >= hmLeft && zone.endX - 8 <= hmRight) {
          ctx.beginPath()
          ctx.arc(zone.endX - 8, rangeY, 2, 0, Math.PI * 2)
          ctx.fill()
            }
          }
        }
      })
    }

    // Store dimensions for hover detection
    chartDimensionsRef.current = {
      chartLeft,
      chartRight,
      chartTop,
      chartHeight,
      volumeTop,
      volumeHeight,
      candleWidth,
      bodyWidth,
      scaleY,
      minPrice,
      startIndex,
      visibleData,
      maxPrice,
      priceRange,
      rightEmptyCandles,
      leftEmptyCandles
    }

  }, [displayCandleData, candleData, timeframe, chartType, heatmapEnabled, isFullscreen, redrawTrigger, chartViewMode, xMentions, zoomLevel, priceZoom, priceAxisWidth, timeAxisHeight, panOffset, priceOffset, yAxisMode, stats, showATHLines, liveTokenData, trueATH])

  // Mouse move handler for volume bar hover and crosshair
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !chartDimensionsRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const { chartLeft, chartRight, chartTop, chartHeight, volumeTop, volumeHeight, candleWidth, bodyWidth, scaleY, priceRange, minPrice, maxPrice, visibleData: visData, rightEmptyCandles: emptyCandles = 0, leftEmptyCandles: leftEmpty = 0 } = chartDimensionsRef.current
    const dataToUse = visData || candleData
    const maxVolume = Math.max(...dataToUse.map(d => d.volume))

    // Update crosshair if in chart area - TradingView-style snap to candle
    if (x >= chartLeft && x <= chartRight && y >= chartTop && y <= volumeTop + volumeHeight) {
      // Calculate price at Y position
      const priceAtY = maxPrice - ((y - chartTop) / chartHeight) * priceRange
      
      // Calculate candle index at X position (within visible data)
      // Account for both left and right empty space offsets
      const adjustedX = x + (emptyCandles * candleWidth) - (leftEmpty * candleWidth)
      const candleIndex = Math.floor((adjustedX - chartLeft) / candleWidth)
      
      // Get candle data if valid index
      const candle = candleIndex >= 0 && candleIndex < dataToUse.length 
        ? dataToUse[candleIndex] 
        : null
      
      // Calculate snapped X position (center of candle)
      const snappedX = candle 
        ? chartLeft + candleIndex * candleWidth + candleWidth / 2 - (emptyCandles * candleWidth)
        : x
      
      setCrosshair({
        visible: true,
        x: snappedX, // Snap to candle center
        y,
        price: priceAtY,
        time: candle?.date || null,
        candle, // Include full candle data for OHLCV display
        candleX: snappedX
      })
    } else {
      setCrosshair({ visible: false, x: 0, y: 0, price: null, time: null, candle: null, candleX: 0 })
    }

    // Check if mouse is in volume area
    if (y >= volumeTop && y <= volumeTop + volumeHeight && x >= chartLeft && x <= chartRight) {
      // Find which bar we're over (within visible data)
      // Account for both left and right empty candle offsets
      const adjustedX = x + (emptyCandles * candleWidth) - (leftEmpty * candleWidth)
      const barIndex = Math.floor((adjustedX - chartLeft) / candleWidth)
      
      if (barIndex >= 0 && barIndex < dataToUse.length) {
        const candle = dataToUse[barIndex]
        const barX = chartLeft + (leftEmpty + barIndex) * candleWidth + candleWidth / 2 - (emptyCandles * candleWidth)
        const barHeight = (candle.volume / maxVolume) * volumeHeight
        const barTop = volumeTop + volumeHeight - barHeight
        const volBarWidth = Math.max(3, bodyWidth * 0.85)

        // Check if actually over the bar
        if (x >= barX - volBarWidth && x <= barX + volBarWidth && y >= barTop) {
          setTooltip({
            visible: true,
            x: barX,
            y: barTop - 10,
            data: {
              date: candle.date,
              volume: candle.volume
            }
          })
          return
        }
      }
    }
    
    setTooltip({ visible: false, x: 0, y: 0, data: null })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, data: null })
    setCrosshair({ visible: false, x: 0, y: 0, price: null, time: null, candle: null, candleX: 0 })
  }

  // Wheel handler for zoom - TradingView-style zoom centered on mouse position
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const chartRight = rect.width - priceAxisWidth
    const chartLeft = 12
    
    // Check if mouse is over the price axis (right side)
    if (x > chartRight) {
      // Scroll on price axis = zoom price scale (vertical zoom)
      setAutoFitPrice(false)
      const delta = e.deltaY > 0 ? -0.12 : 0.12
      setPriceZoom(prev => Math.max(0.1, Math.min(10, prev + delta)))
    } else {
      // Scroll on chart area = zoom time scale (horizontal zoom) centered on mouse
      // TradingView-like: smooth 15% zoom per scroll
      const zoomFactor = e.deltaY > 0 ? 0.85 : 1.18
      
      // Calculate zoom limits based on data length and timeframe
      // Min zoom: show at least 20 candles (zoomed in)
      // Max zoom: depends on timeframe - 1D can show ALL, others limited to ~400 candles
      const minVisibleCandles = 20
      const maxVisibleCandles = timeframe === '1D' 
        ? candleData.length // 1D: Allow showing ALL data for full history view
        : Math.min(400, candleData.length) // Other timeframes: max 400 candles visible
      const minZoom = candleData.length / maxVisibleCandles
      const maxZoom = candleData.length / minVisibleCandles
      
      // For 1D: allow zoom below 1 for full overview. Others: limit to minZoom
      const minAllowedZoom = timeframe === '1D' ? 0.5 : minZoom
      const newZoom = Math.max(minAllowedZoom, Math.min(maxZoom, zoomLevel * zoomFactor))
      
      // Calculate mouse position as percentage of chart width
      const chartWidth = chartRight - chartLeft
      const mouseRatio = Math.max(0, Math.min(1, (x - chartLeft) / chartWidth))
      
      // Use same calculation as rendering
      const isFullHistory = candleData.length > 400
      const minCandleW = isFullHistory ? 1 : 3
      const maxCandleW = 25
      
      const requestedBefore = Math.max(1, Math.floor(candleData.length / Math.max(0.1, zoomLevel)))
      const requestedAfter = Math.max(1, Math.floor(candleData.length / Math.max(0.1, newZoom)))
      const rawCandleWBefore = chartWidth / requestedBefore
      const rawCandleWAfter = chartWidth / requestedAfter
      const candleWBefore = Math.max(minCandleW, Math.min(maxCandleW, rawCandleWBefore))
      const candleWAfter = Math.max(minCandleW, Math.min(maxCandleW, rawCandleWAfter))
      const visibleCountBefore = Math.floor(chartWidth / candleWBefore)
      const visibleCountAfter = Math.floor(chartWidth / candleWAfter)
      const candleShift = (visibleCountAfter - visibleCountBefore) * mouseRatio
      
      // Update zoom and pan together for smooth centered zoom
      setZoomLevel(newZoom)
      setPanOffset(prev => {
        const maxOffset = Math.max(0, candleData.length - visibleCountAfter)
        const minOffset = -Math.floor(visibleCountAfter * 0.5)
        return Math.max(minOffset, Math.min(maxOffset, prev - candleShift))
      })
    }
  }, [priceAxisWidth, zoomLevel, candleData.length])

  // Attach wheel event with passive: false to prevent page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Chart panning handlers - TradingView-style with momentum/inertia (horizontal + vertical)
  const handlePanStart = useCallback((e) => {
    if (e.button !== 0) return
    if (e.target.classList.contains('axis-drag-handle')) return
    
    // Cancel any existing momentum animation
    if (momentumAnimationRef.current) {
      cancelAnimationFrame(momentumAnimationRef.current)
      momentumAnimationRef.current = null
    }
    
    // Disable auto-fit when manually panning vertically
    setAutoFitPrice(false)
    
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY, offset: panOffset, priceOff: priceOffset }
    lastPanXRef.current = e.clientX
    lastPanYRef.current = e.clientY
    lastPanTimeRef.current = performance.now()
    panVelocityRef.current = { x: 0, y: 0 }
  }, [panOffset, priceOffset])

  const handlePanMove = useCallback((e) => {
    if (!isPanning) return
    
    const currentX = e.clientX
    const currentY = e.clientY
    const currentTime = performance.now()
    const deltaX = currentX - panStartRef.current.x
    const deltaY = currentY - panStartRef.current.y
    const instantDeltaX = currentX - lastPanXRef.current
    const instantDeltaY = currentY - lastPanYRef.current
    const deltaTime = currentTime - lastPanTimeRef.current
    
    // Calculate velocity for momentum (pixels per ms) - both X and Y
    if (deltaTime > 0) {
      // Very smooth velocity with weighted average (current 50%, previous 50%)
      const instantVelocityX = instantDeltaX / deltaTime
      const instantVelocityY = instantDeltaY / deltaTime
      panVelocityRef.current = {
        x: panVelocityRef.current.x * 0.5 + instantVelocityX * 0.5,
        y: panVelocityRef.current.y * 0.5 + instantVelocityY * 0.5
      }
    }
    
    lastPanXRef.current = currentX
    lastPanYRef.current = currentY
    lastPanTimeRef.current = currentTime
    
    // HORIZONTAL PAN - Same as vertical: drag direction = chart moves direction
    // Drag LEFT = chart moves LEFT = see older data (what's on the left)
    // Drag RIGHT = chart moves RIGHT = see newer data (what's on the right)
    const chartWidth = containerRef.current?.clientWidth || 800
    const priceAxisW = 75
    const actualChartWidth = chartWidth - priceAxisW - 12 // Match rendering calculation
    
    // Use same calculation as rendering
    const isFullHistory = candleData.length > 400
    const minCandleW = isFullHistory ? 1 : 3
    const maxCandleW = 25
    const requestedCandles = Math.max(1, Math.floor(candleData.length / Math.max(0.1, zoomLevel)))
    const rawCandleW = actualChartWidth / requestedCandles
    const candleW = Math.max(minCandleW, Math.min(maxCandleW, rawCandleW))
    const visibleCount = Math.floor(actualChartWidth / candleW)
    
    const pixelsPerCandle = candleW
    
    // Match vertical behavior: drag direction = view direction
    const deltaCandlesFloat = deltaX / pixelsPerCandle
    
    const newOffset = panStartRef.current.offset + deltaCandlesFloat
    
    // Clamp with boundaries - allow full historical access
    const maxOffset = Math.max(0, candleData.length - visibleCount) // Can scroll to oldest data
    const minOffset = -Math.floor(visibleCount * 0.5) // 50% empty space on right
    
    // Detect if user is trying to scroll past the left edge (into older data)
    if (newOffset > maxOffset && hasMoreHistory && !loadingMore) {
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchTimeRef.current
      if (timeSinceLastFetch >= 2000) { // 2 second cooldown
        console.log(`Edge scroll detected, fetching more... (trying: ${newOffset.toFixed(0)}, max: ${maxOffset})`)
        lastFetchTimeRef.current = now
        fetchMoreHistory()
      }
    }
    
    // Hard clamp (no elastic - more stable)
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset))
    
    setPanOffset(clampedOffset)
    
    // VERTICAL PAN - Unlimited panning (can go beyond chart data)
    // Drag up = see higher prices (chart moves up)
    // Drag down = see lower prices (chart moves down)
    const priceSensitivity = 8 // Responsive vertical movement
    const deltaPricePercent = deltaY / priceSensitivity
    
    const newPriceOffset = panStartRef.current.priceOff + deltaPricePercent
    
    // Allow unlimited vertical panning (no limits!)
    setPriceOffset(newPriceOffset)
  }, [isPanning, candleData.length, zoomLevel])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
    
    // Apply gentle momentum animation for both X and Y
    // Only if velocity is significant (reduces jitter)
    const velocityX = panVelocityRef.current.x
    const velocityY = panVelocityRef.current.y
    const hasMomentum = Math.abs(velocityX) > 0.15 || Math.abs(velocityY) > 0.15 // Higher threshold
    
    if (hasMomentum) {
      // Use same calculation as rendering
      const chartWidth = containerRef.current?.clientWidth || 800
      const priceAxisW = 75
      const actualChartWidth = chartWidth - priceAxisW - 12
      const isFullHistory = candleData.length > 400
      const minCandleW = isFullHistory ? 1 : 3
      const maxCandleW = 25
      const requestedCandles = Math.max(1, Math.floor(candleData.length / Math.max(0.1, zoomLevel)))
      const rawCandleW = actualChartWidth / requestedCandles
      const candleW = Math.max(minCandleW, Math.min(maxCandleW, rawCandleW))
      const visibleCount = Math.floor(actualChartWidth / candleW)
      
      const maxOffset = Math.max(0, candleData.length - visibleCount)
      const minOffset = -Math.floor(visibleCount * 0.5)
      
      const pixelsPerCandle = candleW
      
      let currentVelocityX = velocityX * 0.5 // Reduce initial momentum by 50%
      let currentVelocityY = velocityY * 0.5 // Y momentum for vertical pan
      const friction = 0.92 // Faster deceleration (lower = stops quicker)
      
      const animateMomentum = () => {
        // Decelerate both axes
        currentVelocityX *= friction
        currentVelocityY *= friction
        
        // Stop when both velocities are negligible
        const xDone = Math.abs(currentVelocityX) < 0.02
        const yDone = Math.abs(currentVelocityY) < 0.02
        
        if (xDone && yDone) {
          momentumAnimationRef.current = null
          return
        }
        
        // Apply X velocity to pan offset (matching drag direction)
        if (!xDone) {
          const deltaCandles = (currentVelocityX * 16) / pixelsPerCandle
          
          setPanOffset(prev => {
            let newOffset = prev + deltaCandles
            
            // Hard stop at boundaries
            if (newOffset > maxOffset) {
              currentVelocityX = 0
              return maxOffset
            } else if (newOffset < minOffset) {
              currentVelocityX = 0
              return minOffset
            }
            
            return newOffset
          })
        }
        
        // Apply Y velocity to price offset (unlimited vertical pan)
        if (!yDone) {
          const deltaPricePercent = (currentVelocityY * 16) / 8
          
          setPriceOffset(prev => prev + deltaPricePercent) // No limits!
        }
        
        momentumAnimationRef.current = requestAnimationFrame(animateMomentum)
      }
      
      momentumAnimationRef.current = requestAnimationFrame(animateMomentum)
    }
  }, [candleData.length, zoomLevel])

  // Attach pan event listeners to document for smooth dragging
  useEffect(() => {
    if (isPanning) {
      const onMove = (e) => handlePanMove(e)
      const onUp = () => handlePanEnd()
      
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      
      return () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }
  }, [isPanning, handlePanMove, handlePanEnd])

  // Cleanup momentum animation on unmount
  useEffect(() => {
    return () => {
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current)
      }
    }
  }, [])

  // Double-click to reset chart view (like TradingView)
  const handleDoubleClick = useCallback((e) => {
    // 1D: reset to show all candles (zoomLevel=1), other timeframes: show ~100 candles
    const optimalZoom = timeframe === '1D' 
      ? 1 // Show all data for 1D
      : Math.max(1, Math.ceil(candleData.length / 100)) // ~100 candles for others
    setZoomLevel(optimalZoom)
    setPanOffset(0) // Reset to current price (newest data on right)
    setPriceOffset(0) // Reset vertical pan
    setPriceZoom(1)
    setAutoFitPrice(true)
  }, [candleData.length])

  // Price axis drag handlers - drag up/down to zoom price scale
  const handlePriceAxisDragStart = (e) => {
    e.preventDefault()
    setIsDraggingPriceAxis(true)
    setAutoFitPrice(false) // Disable auto-fit when manually adjusting
    dragStartRef.current = { x: 0, y: e.clientY, value: priceZoom }
    document.addEventListener('mousemove', handlePriceAxisDrag)
    document.addEventListener('mouseup', handlePriceAxisDragEnd)
  }

  const handlePriceAxisDrag = (e) => {
    const deltaY = e.clientY - dragStartRef.current.y
    // Drag up = zoom in (increase), drag down = zoom out (decrease) - more sensitive
    const sensitivity = 200
    const zoomDelta = -deltaY / sensitivity
    const newZoom = Math.max(0.1, Math.min(10, dragStartRef.current.value + zoomDelta))
    setPriceZoom(newZoom)
  }

  const handlePriceAxisDragEnd = () => {
    setIsDraggingPriceAxis(false)
    document.removeEventListener('mousemove', handlePriceAxisDrag)
    document.removeEventListener('mouseup', handlePriceAxisDragEnd)
  }

  // Time axis drag handlers - drag left/right to zoom time scale
  const handleTimeAxisDragStart = (e) => {
    e.preventDefault()
    setIsDraggingTimeAxis(true)
    dragStartRef.current = { x: e.clientX, y: 0, value: zoomLevel }
    document.addEventListener('mousemove', handleTimeAxisDrag)
    document.addEventListener('mouseup', handleTimeAxisDragEnd)
  }

  const handleTimeAxisDrag = (e) => {
    const deltaX = e.clientX - dragStartRef.current.x
    // Drag right = zoom out (see more candles), drag left = zoom in (see fewer candles)
    // Use exponential scaling for smoother feel
    const zoomMultiplier = Math.pow(1.005, -deltaX) // Exponential zoom
    
    // Calculate zoom limits based on timeframe
    const maxVisibleCandles = timeframe === '1D' ? candleData.length : Math.min(400, candleData.length)
    const minZoom = timeframe === '1D' ? 0.1 : candleData.length / maxVisibleCandles
    const maxZoom = candleData.length / 20 // At least 20 candles visible
    
    const newZoom = Math.max(minZoom, Math.min(maxZoom, dragStartRef.current.value * zoomMultiplier))
    setZoomLevel(newZoom)
  }

  const handleTimeAxisDragEnd = () => {
    setIsDraggingTimeAxis(false)
    document.removeEventListener('mousemove', handleTimeAxisDrag)
    document.removeEventListener('mouseup', handleTimeAxisDragEnd)
  }

  // Format volume value
  const formatVolume = (value) => hookFmtLarge(value)

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className={`trading-chart ${isFullscreen ? 'fullscreen' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Close button for fullscreen mode - top right */}
      {isFullscreen && chartViewMode !== 'xBubbles' && (
        <button 
          className="fullscreen-close-btn"
          onClick={() => setIsFullscreen(false)}
          title={t('ui.exitFullscreen')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {/* Chart Controls */}
      <div className="chart-controls">
        {/* Next Gen tabs: Trading | Chart Overlay | X Bubbles */}
        {setChartViewMode && (
          <div className="nextgen-tabs-wrap">
            <span className="nextgen-tabs-label">{t('ui.nextGen')}</span>
            <div className="nextgen-tabs">
              <button
                type="button"
                className={`nextgen-tab ${chartViewMode === 'trading' ? 'active' : ''}`}
                onClick={() => setChartViewMode('trading')}
              >
                {t('ui.trading')}
              </button>
              <button
                type="button"
                className={`nextgen-tab ${chartViewMode === 'xChart' ? 'active' : ''}`}
                onClick={() => setChartViewMode('xChart')}
                title={t('chart.socialOverlay')}
              >
                {t('ui.chartOverlay')}
              </button>
              <button
                type="button"
                className={`nextgen-tab ${chartViewMode === 'xBubbles' ? 'active' : ''}`}
                onClick={() => setChartViewMode('xBubbles')}
              >
                {t('ui.xBubbles')}
              </button>
            </div>
          </div>
        )}
        {/* Left side: Chart types and timeframes */}
        <div className="chart-controls-left">
          {/* Chart Type Buttons - Clicking switches back to trading view */}
          <div className="chart-types">
            <button
              className={`type-btn ${chartViewMode === 'trading' && chartType === 'candles' ? 'active' : ''}`}
              onClick={() => {
                setChartType('candles')
                // If in xBubbles mode, switch back to trading
                if (chartViewMode === 'xBubbles' && setChartViewMode) {
                  setChartViewMode('trading')
                }
              }}
            >
              <svg className="type-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 3a1 1 0 011 1v1h1a1 1 0 010 2H7v6h1a1 1 0 010 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1V7H4a1 1 0 010-2h1V4a1 1 0 011-1zm8 0a1 1 0 011 1v3h1a1 1 0 010 2h-1v4h1a1 1 0 010 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 010-2h1V9h-1a1 1 0 010-2h1V4a1 1 0 011-1z" />
              </svg>
              <span className="type-label">{t('chart.candles')}</span>
            </button>
            <button
              className={`type-btn ${chartViewMode === 'trading' && chartType === 'line' ? 'active' : ''}`}
              onClick={() => {
                setChartType('line')
                if (chartViewMode === 'xBubbles' && setChartViewMode) {
                  setChartViewMode('trading')
                }
              }}
            >
              <svg className="type-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="type-label">{t('chart.line')}</span>
            </button>
            <button
              className={`type-btn ${chartViewMode === 'trading' && chartType === 'tradingview' ? 'active' : ''} ${(!hasTradingViewSupport && !tvLoading) ? 'disabled' : ''}`}
              onClick={() => {
                if (!hasTradingViewSupport && !tvLoading) return
                setChartType('tradingview')
                if (chartViewMode === 'xBubbles' && setChartViewMode) {
                  setChartViewMode('trading')
                }
              }}
              title={tvLoading ? 'Resolving TradingView symbol...' : (hasTradingViewSupport ? 'TradingView chart' : 'TradingView not available for this token')}
              disabled={!hasTradingViewSupport && !tvLoading}
            >
              <svg className="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="type-label">{t('chart.tradingView')}</span>
            </button>
            
            {/* Price/MCap Toggle */}
            <div className="price-mcap-toggle">
              <button
                className={`toggle-btn ${yAxisMode === 'price' ? 'active' : ''}`}
                onClick={() => setYAxisMode('price')}
              >
                {t('chart.price')}
              </button>
              <button
                className={`toggle-btn ${yAxisMode === 'mcap' ? 'active' : ''}`}
                onClick={() => setYAxisMode('mcap')}
              >
                {t('chart.mCap')}
              </button>
            </div>
          </div>

          {/* Timeframe Selector - Show primary timeframes + dropdown for more */}
          <div className="timeframes">
            {/* Show first 4 timeframes as buttons */}
            {timeframes.slice(0, 4).map(tf => (
              <button
                key={tf}
                className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
            
            {/* Dropdown for remaining timeframes */}
            <div className="tf-more-dropdown">
              <button 
                ref={tfDropdownBtnRef}
                className={`tf-btn tf-more-trigger ${timeframes.slice(4).includes(timeframe) ? 'active' : ''}`}
                onClick={() => {
                  if (!tfDropdownOpen && tfDropdownBtnRef.current) {
                    const rect = tfDropdownBtnRef.current.getBoundingClientRect()
                    setTfDropdownPos({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right
                    })
                  }
                  setTfDropdownOpen(!tfDropdownOpen)
                }}
              >
                {timeframes.slice(4).includes(timeframe) ? timeframe : t('chart.more')}
                <svg viewBox="0 0 20 20" fill="currentColor" className={`tf-chevron ${tfDropdownOpen ? 'open' : ''}`}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {tfDropdownOpen && (
                <div 
                  className="tf-dropdown-menu tf-dropdown-fixed"
                  style={{ top: tfDropdownPos.top, right: tfDropdownPos.right }}
                >
                  {timeframes.slice(4).map(tf => (
                    <button
                      key={tf}
                      className={`tf-dropdown-item ${timeframe === tf ? 'active' : ''}`}
                      onClick={() => {
                        setTimeframe(tf)
                        setTfDropdownOpen(false)
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Tools (always visible) */}
        <div className="chart-controls-right">
          <div className="chart-tools">
            <button 
              className={`tool-btn heatmap-btn ${heatmapEnabled ? 'active' : ''}`} 
              data-tooltip={t('ui.heatmapView')}
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 0v4h4V3H5zm0 6v4h4V9H5zm6-6v4h4V3h-4zm0 6v4h4V9h-4z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              className={`tool-btn ath-btn ${showATHLines ? 'active' : ''}`} 
              data-tooltip={t('ui.athLocalHigh')}
              onClick={() => setShowATHLines(!showATHLines)}
            >
              <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1">
                <text x="12" y="6" fill="currentColor" stroke="none" fontSize="6" fontWeight="600" textAnchor="middle" fontFamily="system-ui, sans-serif">ATH</text>
                <line x1="0" y1="10" x2="24" y2="10" strokeDasharray="2,1.5" />
              </svg>
            </button>
            <button className="tool-btn" data-tooltip={t('chart.indicators')}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
            </button>
            <button className="tool-btn" data-tooltip={t('ui.drawingTools')}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button 
              className={`tool-btn ${isFullscreen ? 'active' : ''}`} 
              data-tooltip={isFullscreen ? t('ui.exitFullscreen') : t('chart.fullscreen')}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Zoom indicators */}
          {(zoomLevel !== 1 || priceZoom !== 1) && (
            <div className="zoom-indicators">
              {zoomLevel !== 1 && (
                <div className="zoom-indicator" onClick={() => setZoomLevel(1)} data-tooltip={t('ui.resetTimeZoom')}>
                  T: {Math.round(zoomLevel * 100)}%
                </div>
              )}
              {priceZoom !== 1 && (
                <div className="zoom-indicator" onClick={() => setPriceZoom(1)} data-tooltip={t('ui.resetPriceZoom')}>
                  P: {Math.round(priceZoom * 100)}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Content Area - maintains consistent height; embedHeight for overlay/compact (e.g. On-Chain panel) */}
      <div className="chart-content-area" style={{ minHeight: isFullscreen ? 'auto' : `${embedHeight ?? chartHeight}px` }}>
        {/* X Bubbles View */}
        {chartViewMode === 'xBubbles' && (
          <div 
            className={`x-bubbles-container ${isDarkMode ? 'dark-theme' : 'light-theme'} ${isFullscreen ? 'fullscreen-bubbles' : ''} mode-${viewMode.toLowerCase()} ${isNavigating ? 'navigating' : ''}`} 
            ref={bubblesContainerRef}
            onMouseDown={viewMode === '3D' ? handle3DMouseDown : undefined}
            onMouseMove={viewMode === '3D' ? handle3DMouseMove : undefined}
            onMouseUp={viewMode === '3D' ? handle3DMouseUp : undefined}
            onMouseLeave={viewMode === '3D' ? handle3DMouseUp : undefined}
            onContextMenu={(e) => e.preventDefault()}
          >
          {/* Space environment - particles and stars */}
          {viewMode === '3D' && (
            <>
              {/* Floating orbs - reduced count */}
              <div className="space-particles">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`space-particle sp-${(i % 4) + 1}`}
                    style={{
                      left: `${10 + (i * 15)}%`,
                      top: `${15 + (i * 12)}%`,
                      animationDelay: `${-i * 8}s`,
                    }}
                  />
                ))}
              </div>
              
              {/* Subtle stars */}
              <div className="space-stars-subtle">
                {[...Array(15)].map((_, i) => (
                  <div 
                    key={i} 
                    className="subtle-star"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${-Math.random() * 20}s`,
                      width: `${2 + Math.random() * 2}px`,
                      height: `${2 + Math.random() * 2}px`,
                    }}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Warp speed effect */}
          {isWarpSpeed && viewMode === '3D' && (
            <div className="warp-effect">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className="warp-line"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${0.3 + Math.random() * 0.3}s`,
                    animationDelay: `${Math.random() * 0.2}s`
                  }}
                />
              ))}
            </div>
          )}
          
          {/* 3D Scene wrapper */}
          <div 
            className="scene-3d"
            style={viewMode === '3D' ? {
              transform: `
                perspective(${2000}px)
                rotateX(${camera.rotX}deg)
                rotateY(${camera.rotY}deg)
                translateX(${-camera.x}px)
                translateY(${-camera.y}px)
                translateZ(${800 - camera.z}px)
              `,
              transformStyle: 'preserve-3d'
            } : {}}
          >
          
          {/* Floating energy particles */}
          <div className="energy-particles">
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
            <div className="energy-particle" />
          </div>
          
          {/* Zoomable content area */}
          <div 
            className="bubbles-zoom-area"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            {/* Background ambient bubbles - static positions for smooth effect */}
            <div className={`ambient-bubbles ${draggingBubble !== null ? 'is-dragging' : ''}`}>
              <div className="ambient-bubble ab-1" style={{ left: '8%', top: '15%', width: '80px', height: '80px' }} />
              <div className="ambient-bubble ab-2" style={{ left: '85%', top: '20%', width: '60px', height: '60px' }} />
              <div className="ambient-bubble ab-3" style={{ left: '75%', top: '70%', width: '100px', height: '100px' }} />
              <div className="ambient-bubble ab-4" style={{ left: '10%', top: '75%', width: '70px', height: '70px' }} />
              <div className="ambient-bubble ab-5" style={{ left: '45%', top: '5%', width: '50px', height: '50px' }} />
              <div className="ambient-bubble ab-6" style={{ left: '92%', top: '50%', width: '55px', height: '55px' }} />
              <div className="ambient-bubble ab-7" style={{ left: '5%', top: '45%', width: '45px', height: '45px' }} />
              <div className="ambient-bubble ab-8" style={{ left: '60%', top: '90%', width: '65px', height: '65px' }} />
            </div>
          
          {/* Drag trail effect */}
          {draggingBubble !== null && (
            <div className="drag-trail-container">
              <div className="drag-ripple ripple-1" style={{ 
                left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
              }} />
              <div className="drag-ripple ripple-2" style={{ 
                left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
              }} />
              <div className="drag-ripple ripple-3" style={{ 
                left: `${bubblePhysics.find(b => b.id === draggingBubble)?.x || 50}%`,
                top: `${bubblePhysics.find(b => b.id === draggingBubble)?.y || 50}%`
              }} />
            </div>
          )}

          {/* Connection lines (SVG) */}
          <svg className="bubble-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* Arrow marker - compact */}
              <marker
                id="arrowhead"
                markerWidth="2.5"
                markerHeight="2"
                refX="2"
                refY="1"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 2.5 1, 0 2" fill="url(#arrowGradient)" />
              </marker>
              <marker
                id="arrowheadLight"
                markerWidth="2.5"
                markerHeight="2"
                refX="2"
                refY="1"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 2.5 1, 0 2" fill="url(#arrowGradientLight)" />
              </marker>
              
              {/* Gradients */}
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#A855F7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="connectionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.15" />
              </linearGradient>
              
              {/* Light theme gradients */}
              <linearGradient id="connectionGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="arrowGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.6" />
              </linearGradient>
              
              {/* Glow filter */}
              <filter id="connectionGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {(() => {
              const visibleBubbles = getFilteredBubbles()
              const visibleIds = new Set(visibleBubbles.map(b => b.id))
              return bubbleConnections.map(([fromId, toId], index) => {
              // Only show connection if both bubbles are visible
              if (!visibleIds.has(fromId) || !visibleIds.has(toId)) return null
              const fromBubble = visibleBubbles.find(b => b.id === fromId)
              const toBubble = visibleBubbles.find(b => b.id === toId)
              if (!fromBubble || !toBubble) return null
              
              // Calculate direction and shorten line for arrow
              const dx = toBubble.x - fromBubble.x
              const dy = toBubble.y - fromBubble.y
              const length = Math.sqrt(dx * dx + dy * dy)
              const offsetRatio = 2.5 / length // Stop before bubble edge
              const endX = toBubble.x - dx * offsetRatio
              const endY = toBubble.y - dy * offsetRatio
              
              // Theme-based styles
              const gradientId = isDarkMode ? 'connectionGradient' : 'connectionGradientLight'
              const arrowId = isDarkMode ? 'arrowhead' : 'arrowheadLight'
              
              return (
                <g key={index} className="connection-group">
                  {/* Glow line (behind) */}
                  <line
                    x1={fromBubble.x}
                    y1={fromBubble.y}
                    x2={endX}
                    y2={endY}
                    stroke="url(#connectionGlow)"
                    strokeWidth="1.5"
                    className="connection-glow"
                  />
                  {/* Main connection line with arrow */}
                  <line
                    x1={fromBubble.x}
                    y1={fromBubble.y}
                    x2={endX}
                    y2={endY}
                    stroke={`url(#${gradientId})`}
                    strokeWidth="0.4"
                    strokeDasharray="1.5 0.8"
                    markerEnd={`url(#${arrowId})`}
                    className="connection-line"
                    filter="url(#connectionGlowFilter)"
                  />
                  {/* Animated particle along line */}
                  <circle r="0.4" fill={isDarkMode ? "#A855F7" : "#7C3AED"} className="connection-particle">
                    <animateMotion
                      dur={`${3 + index * 0.5}s`}
                      repeatCount="indefinite"
                      path={`M${fromBubble.x},${fromBubble.y} L${endX},${endY}`}
                    />
                  </circle>
                </g>
              )
            })
            })()}
          </svg>

          {/* All bubbles (including center) - rendered as planets in space */}
          {getFilteredBubbles().map(bubble => {
            const isCenter = bubble.size === 'center'
            const isDragging = draggingBubble === bubble.id
            const isConnectedToDragging = draggingBubble !== null && getConnectedBubbles(draggingBubble).has(bubble.id)
            const isMoving = Math.abs(bubble.vx) > 0.1 || Math.abs(bubble.vy) > 0.1
            const categoryColor = getCategoryColor(bubble.category)
            
            // 3D Space depth calculations - relative to camera
            const bubbleZ = bubble.z || 0
            const relativeZ = bubbleZ - (800 - camera.z) // Distance from camera
            
            // More dramatic scaling based on distance (like real perspective)
            const perspectiveScale = viewMode === '3D' 
              ? Math.max(0.1, Math.min(4, 400 / Math.max(100, 400 + relativeZ)))
              : 1
            
            // Opacity based on distance (far objects fade)
            const depthOpacity = viewMode === '3D' 
              ? Math.max(0.2, Math.min(1, 1 - Math.abs(relativeZ) / 1200))
              : 1
            
            // Blur only for very far objects (not close ones)
            const depthBlur = viewMode === '3D' && relativeZ < -200
              ? Math.max(0, Math.min(4, (-relativeZ - 200) / 200))
              : 0
            
            // Check if bubble is "behind" camera (don't render)
            if (viewMode === '3D' && relativeZ > 600) return null
            
            // Determine if this planet is close (for "passing by" effect)
            const isClose = viewMode === '3D' && Math.abs(relativeZ) < 150
            
            return (
              <div
                key={bubble.id}
                className={`kol-bubble ${bubble.size} ${selectedBubble === bubble.id ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isConnectedToDragging ? 'following' : ''} ${isMoving ? 'in-motion' : ''} ${isClose ? 'planet-close' : ''}`}
                data-category={bubble.category}
                style={{
                  left: `${viewMode === '3D' ? (bubble.x3d || bubble.x) : bubble.x}%`,
                  top: `${viewMode === '3D' ? (bubble.y3d || bubble.y) : bubble.y}%`,
                  cursor: isDragging ? 'grabbing' : (viewMode === '3D' ? 'default' : 'grab'),
                  zIndex: isDragging ? 100 : (isCenter ? 50 : (selectedBubble === bubble.id ? 60 : Math.round(500 - relativeZ))),
                  transition: isDragging ? 'none' : 'opacity 0.3s ease',
                  transform: viewMode === '3D' 
                    ? `translateZ(${bubbleZ}px) scale(${perspectiveScale})`
                    : undefined,
                  opacity: depthOpacity,
                  filter: depthBlur > 0.5 ? `blur(${depthBlur}px)` : undefined,
                  '--category-color': categoryColor,
                  pointerEvents: viewMode === '3D' ? 'none' : 'auto', // Disable drag in 3D flight mode
                }}
                onMouseDown={(e) => viewMode !== '3D' && handleBubbleMouseDown(e, bubble.id)}
                onClick={() => viewMode !== '3D' && !isDragging && setSelectedBubble(selectedBubble === bubble.id ? null : bubble.id)}
              >
                {/* Title above bubble */}
                <span className="kol-bubble-title">{bubble.user}</span>
                
                <div className="kol-bubble-glow" />
                <div className="kol-bubble-ring" />
                <div className="kol-bubble-inner">
                  <img src={bubble.avatar} alt={bubble.user} />
                </div>
                
                {selectedBubble === bubble.id && !isCenter && (
                  <div className="kol-bubble-tooltip">
                    <button className="tooltip-close" onClick={(e) => { e.stopPropagation(); setSelectedBubble(null); }}>×</button>
                    <div className="tooltip-header">
                      <img src={bubble.avatar} alt={bubble.user} className="tooltip-avatar" />
                      <div className="tooltip-info">
                        <span className="tooltip-name">{bubble.user}</span>
                        <span className="tooltip-followers">{bubble.followers} followers</span>
                      </div>
                    </div>
                    <div className="tooltip-socials">
                      <button className="social-btn">𝕏</button>
                      <button className="social-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      </button>
                      <button className="social-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      </button>
                      <button className="social-btn">🌐</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div> {/* End bubbles-zoom-area */}
          </div> {/* End scene-3d */}
          
          {/* Flight HUD */}
          {viewMode === '3D' && (
            <div className="flight-hud">
              {/* Crosshair */}
              <div className="hud-crosshair">
                <div className="crosshair-ring" />
                <div className="crosshair-dot" />
                <div className="crosshair-line crosshair-h" />
                <div className="crosshair-line crosshair-v" />
              </div>
              
              {/* Speed indicator - bottom center */}
              <div className="hud-speed-bottom">
                <div className={`speed-display ${isWarpSpeed ? 'warp' : ''}`}>
                  <span className="speed-value">{Math.round(flightSpeed * 10)}</span>
                  <span className="speed-unit">m/s</span>
                  {isWarpSpeed && <span className="warp-badge">WARP</span>}
                </div>
              </div>
              
              {/* Position indicator */}
              <div className="hud-position">
                <div className="pos-label">POSITION</div>
                <div className="pos-coords">
                  <span>X: {Math.round(camera.x)}</span>
                  <span>Y: {Math.round(camera.y)}</span>
                  <span>Z: {Math.round(camera.z)}</span>
                </div>
              </div>
              
              {/* Compass */}
              <div className="hud-compass">
                <div 
                  className="compass-ring"
                  style={{ transform: `rotate(${-camera.rotY}deg)` }}
                >
                  <span className="compass-n">N</span>
                  <span className="compass-e">E</span>
                  <span className="compass-s">S</span>
                  <span className="compass-w">W</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Flight Controls Help - Collapsible */}
          {viewMode === '3D' && (
            <div className={`nav-help-3d ${flightControlsCollapsed ? 'collapsed' : ''}`}>
              <div className="nav-help-header">
                <div className="nav-help-title">🚀 Flight Controls</div>
                <button 
                  className="nav-collapse-btn"
                  onClick={() => setFlightControlsCollapsed(!flightControlsCollapsed)}
                >
                  {flightControlsCollapsed ? '▶' : '◀'}
                </button>
              </div>
              {!flightControlsCollapsed && (
                <div className="nav-help-content">
                  <div className="nav-help-item"><kbd>W</kbd> Fly Forward</div>
                  <div className="nav-help-item"><kbd>S</kbd> Fly Backward</div>
                  <div className="nav-help-item"><kbd>A</kbd><kbd>D</kbd> Strafe</div>
                  <div className="nav-help-item"><kbd>Q</kbd><kbd>E</kbd> Up / Down</div>
                  <div className="nav-help-item"><kbd>R</kbd> Boost Forward</div>
                  <div className="nav-help-item"><kbd>Shift</kbd> Warp Speed</div>
                  <div className="nav-help-divider" />
                  <div className="nav-help-item"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Look Around</div>
                  <div className="nav-help-divider" />
                  <div className="nav-help-item">🖱️ Drag to look</div>
                  <div className="nav-help-item">🖱️ Scroll to zoom</div>
                  <button className="nav-reset-btn" onClick={resetCamera}>
                    🏠 Return to Base
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* 3D Depth Indicator */}
          {viewMode === '3D' && (
            <div className="depth-indicator">
              <div className="depth-label">DEPTH</div>
              <div className="depth-bar">
                <div 
                  className="depth-marker" 
                  style={{ bottom: `${Math.max(0, Math.min(100, ((2000 - camera.z) / 2500) * 100))}%` }}
                />
                {/* Planet markers on depth bar */}
                {bubblePhysics.slice(0, 5).map((bubble, i) => (
                  <div 
                    key={i}
                    className="depth-planet-marker"
                    style={{ 
                      bottom: `${Math.max(0, Math.min(100, ((2000 - (bubble.z || 0)) / 2500) * 100))}%`,
                      opacity: 0.6
                    }}
                    title={bubble.user}
                  />
                ))}
              </div>
              <div className="depth-value">{Math.round(camera.z)}m</div>
            </div>
          )}

          {/* Top Left Controls */}
          <div className="bubbles-controls-top">
            {/* Legend Filter Dropdown */}
            <div className="bubble-filter-dropdown">
              <button 
                className={`bubble-control-btn legend ${legendDropdownOpen ? 'active' : ''}`}
                onClick={() => {
                  setLegendDropdownOpen(!legendDropdownOpen)
                  setTimeDropdownOpen(false)
                  setFollowersDropdownOpen(false)
                }}
              >
                <span>🎨</span> X Bubbles Legend
                <svg viewBox="0 0 20 20" fill="currentColor" className={legendDropdownOpen ? 'rotated' : ''}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
            </button>
              {legendDropdownOpen && (
                <div className="filter-dropdown-menu legend-menu">
                  <div className="filter-legend-item">
                    <label className="toggle-switch-label">
                      <input 
                        type="checkbox" 
                        checked={legendFilter.main}
                        onChange={() => setLegendFilter(prev => ({ ...prev, main: !prev.main }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="legend-color" style={{ background: '#22c55e' }}></span>
                    <span className="legend-label"><strong>Green</strong> Main Project</span>
                  </div>
                  <div className="filter-legend-item">
                    <label className="toggle-switch-label">
                      <input 
                        type="checkbox" 
                        checked={legendFilter.project}
                        onChange={() => setLegendFilter(prev => ({ ...prev, project: !prev.project }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="legend-color" style={{ background: '#ec4899' }}></span>
                    <span className="legend-label"><strong>Pink</strong> Projects</span>
                  </div>
                  <div className="filter-legend-item">
                    <label className="toggle-switch-label">
                      <input 
                        type="checkbox" 
                        checked={legendFilter.top5}
                        onChange={() => setLegendFilter(prev => ({ ...prev, top5: !prev.top5 }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="legend-color" style={{ background: '#eab308' }}></span>
                    <span className="legend-label"><strong>Yellow</strong> TOP 5 KOLs by followers</span>
                  </div>
                  <div className="filter-legend-item">
                    <label className="toggle-switch-label">
                      <input 
                        type="checkbox" 
                        checked={legendFilter.kol100k}
                        onChange={() => setLegendFilter(prev => ({ ...prev, kol100k: !prev.kol100k }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="legend-color" style={{ background: '#f97316' }}></span>
                    <span className="legend-label"><strong>Orange</strong> KOLs with 100k+ followers</span>
                  </div>
                  <div className="filter-legend-item">
                    <label className="toggle-switch-label">
                      <input 
                        type="checkbox" 
                        checked={legendFilter.kolUnder100k}
                        onChange={() => setLegendFilter(prev => ({ ...prev, kolUnder100k: !prev.kolUnder100k }))}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="legend-color" style={{ background: '#a855f7' }}></span>
                    <span className="legend-label"><strong>Purple</strong> KOLs with less than 100k followers</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Time Filter Dropdown */}
            <div className="bubble-filter-dropdown">
              <button 
                className={`bubble-control-btn ${timeDropdownOpen ? 'active' : ''}`}
                onClick={() => {
                  setTimeDropdownOpen(!timeDropdownOpen)
                  setLegendDropdownOpen(false)
                  setFollowersDropdownOpen(false)
                }}
              >
                <span>🕐</span> {timeFilterOptions.find(opt => opt.value === timeFilter)?.label || t('chart.allTime')}
                <svg viewBox="0 0 20 20" fill="currentColor" className={timeDropdownOpen ? 'rotated' : ''}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
            </button>
              {timeDropdownOpen && (
                <div className="filter-dropdown-menu time-menu">
                  {timeFilterOptions.map(option => (
                    <div 
                      key={option.value}
                      className={`filter-time-item ${timeFilter === option.value ? 'active' : ''}`}
                      onClick={() => {
                        setTimeFilter(option.value)
                        setTimeDropdownOpen(false)
                      }}
                    >
                      {timeFilter === option.value && <span className="check-mark">✓</span>}
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Followers Range Filter Dropdown */}
            <div className="bubble-filter-dropdown">
              <button 
                className={`bubble-control-btn ${followersDropdownOpen ? 'active' : ''}`}
                onClick={() => {
                  setFollowersDropdownOpen(!followersDropdownOpen)
                  setLegendDropdownOpen(false)
                  setTimeDropdownOpen(false)
                }}
              >
                <span>≡</span> Followers range
                <svg viewBox="0 0 20 20" fill="currentColor" className={followersDropdownOpen ? 'rotated' : ''}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
            </button>
              {followersDropdownOpen && (
                <div className="filter-dropdown-menu followers-menu">
                  <div className="filter-followers-title">Filtering by followers range</div>
                  <div className="filter-followers-inputs">
                    <div className="follower-input-group">
                      <span className="input-icon">👤</span>
                      <input 
                        type="text" 
                        placeholder="Min"
                        value={followersRange.min}
                        onChange={(e) => setFollowersRange(prev => ({ ...prev, min: e.target.value.replace(/\D/g, '') }))}
                      />
                    </div>
                    <div className="follower-input-group">
                      <span className="input-icon">👤</span>
                      <input 
                        type="text" 
                        placeholder="Max"
                        value={followersRange.max}
                        onChange={(e) => setFollowersRange(prev => ({ ...prev, max: e.target.value.replace(/\D/g, '') }))}
                      />
                    </div>
                  </div>
                  <button 
                    className="filter-apply-btn"
                    onClick={() => setFollowersDropdownOpen(false)}
                  >
                    ✓ Apply
            </button>
                </div>
              )}
            </div>
          </div>

          {/* Top Right - Theme Toggle + Close (in fullscreen) */}
          <div className="bubbles-controls-top-right">
            {isFullscreen && (
              <button 
                className="close-fullscreen-btn"
                onClick={() => setIsFullscreen(false)}
                title={t('ui.exitFullscreen')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button 
                className={`view-mode-btn ${viewMode === '2D' ? 'active' : ''}`}
                onClick={() => setViewMode('2D')}
              >
                2D
              </button>
              <button 
                className={`view-mode-btn ${viewMode === '3D' ? 'active' : ''}`}
                onClick={() => setViewMode('3D')}
              >
                3D
              </button>
            </div>
            
            <div className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
              <span className={isDarkMode ? 'active' : ''}>dark</span>
              <div className={`toggle-switch ${isDarkMode ? '' : 'light-mode'}`}>
                <span className="toggle-dot" />
              </div>
              <span className={!isDarkMode ? 'active' : ''}>light</span>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bubbles-controls-bottom">
            <div className="bubbles-branding">
              <span>X Bubbles for <strong>Spectre</strong></span>
              <span className="divider">|</span>
              <span>powered by <strong>Spectre AI</strong></span>
            </div>
            <div className="zoom-controls">
              {viewMode === '2D' ? (
                <>
                  <button 
                    className="zoom-btn" 
                    onClick={() => setZoomLevel(prev => Math.min(prev * 1.3, candleData.length / 20))}
                    title="Zoom In"
                  >+</button>
                  <span className="zoom-level">{zoomLevel >= 1 ? `${Math.round(zoomLevel * 100)}%` : `${Math.round(candleData.length / zoomLevel)} bars`}</span>
                  <button 
                    className="zoom-btn" 
                    onClick={() => {
                      // 1D: allow full zoom out, other timeframes: limit to ~400 candles max
                      const maxVisibleCandles = timeframe === '1D' ? candleData.length : Math.min(400, candleData.length)
                      const minZoom = timeframe === '1D' ? 0.5 : candleData.length / maxVisibleCandles
                      setZoomLevel(prev => Math.max(prev * 0.7, minZoom))
                    }}
                    title="Zoom Out (show more data)"
                  >−</button>
                  <button 
                    className="fit-btn"
                    onClick={() => { 
                      // 1D: fit all data, other timeframes: fit to ~400 candles max
                      const maxVisibleCandles = timeframe === '1D' ? candleData.length : Math.min(400, candleData.length)
                      const targetZoom = timeframe === '1D' ? 1 : Math.max(1, candleData.length / maxVisibleCandles)
                      setZoomLevel(targetZoom)
                      setPanOffset(0)
                      setAutoFitPrice(true)
                    }}
                    title={timeframe === '1D' ? "Fit All Data on Screen" : "Fit to max view (drag to see more history)"}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    All
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="zoom-btn" 
                    onClick={() => setCamera(prev => ({ ...prev, z: Math.max(-500, prev.z - 100) }))}
                    title="Fly Forward"
                  >🚀</button>
                  <span className="zoom-level" style={{ minWidth: '80px' }}>
                    {Math.round(flightSpeed * 10)}m/s
                  </span>
                  <button 
                    className="zoom-btn" 
                    onClick={() => setCamera(prev => ({ ...prev, z: Math.min(2000, prev.z + 100) }))}
                    title="Fly Back"
                  >⬅️</button>
                  <button 
                    className="fit-btn"
                    onClick={resetCamera}
                    title="Return to Base"
                  >
                    🏠 Base
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas or TradingView embed */}
      <div 
        className={`chart-body ${chartViewMode === 'xBubbles' ? 'hidden' : ''} ${chartType === 'tradingview' ? 'chart-body-tradingview' : ''}`}
        ref={containerRef}
        onMouseMove={chartType === 'tradingview' ? undefined : handleMouseMove}
        onMouseLeave={chartType === 'tradingview' ? undefined : handleMouseLeave}
        onMouseDown={chartType === 'tradingview' ? undefined : handlePanStart}
        onDoubleClick={chartType === 'tradingview' ? undefined : handleDoubleClick}
        style={{ cursor: chartType === 'tradingview' ? 'default' : (isPanning ? 'grabbing' : 'crosshair') }}
      >
        {chartType === 'tradingview' ? (
          <iframe
            title="TradingView chart"
            src={tradingViewEmbedUrl}
            className="tradingview-chart-iframe"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
          />
        ) : (
          <>
        <canvas ref={canvasRef} className="chart-canvas" />
        
        {/* Initial loading state - waiting for data */}
        {candleData.length === 0 && (
          <div className="chart-loading-state">
            {!chartLoading && chartError ? (
              <>
                <div className="loading-text">
                  <span className="loading-title" style={{ color: 'rgba(255,255,255,0.5)' }}>Chart unavailable</span>
                  <span className="loading-subtitle">{chartError}</span>
                </div>
              </>
            ) : (
              <>
                {/* Pulsing rings */}
                <div className="pulse-ring" />
                <div className="pulse-ring" />
                <div className="pulse-ring" />

                {/* Rising particles */}
                <div className="particles">
                  <div className="particle" />
                  <div className="particle" />
                  <div className="particle" />
                  <div className="particle" />
                  <div className="particle" />
                  <div className="particle" />
                </div>

                {/* Chart visualization with scan effect */}
                <div className="loading-visual">
                  <div className="scan-line" />
                  <div className="loading-bars">
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                    <div className="loading-bar" />
                  </div>
                </div>

                {/* Text and progress */}
                <div className="loading-text">
                  <span className="loading-title">Loading chart</span>
                  <span className="loading-subtitle">Fetching market data</span>
                  <div className="progress-track">
                    <div className="progress-fill" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Loading more history indicator with left edge glow */}
        {loadingMore && (
          <>
            <div className="loading-edge-glow" />
            <div className="loading-more-indicator">
              <div className="loading-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="loading-text">
                <span className="loading-title">Loading History</span>
                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>
          </>
        )}
        
        {/* Price Axis Drag Handle - drag up/down to zoom price scale */}
        <div 
          className={`axis-drag-handle price-axis-handle ${isDraggingPriceAxis ? 'active' : ''}`}
          onMouseDown={handlePriceAxisDragStart}
          onDoubleClick={() => { setPriceZoom(1); setPriceOffset(0); setAutoFitPrice(true); }}
          title="Drag up/down to zoom price scale • Double-click to auto-fit"
        />
        
        {/* Time Axis Drag Handle - drag left/right to zoom time scale */}
        <div 
          className={`axis-drag-handle time-axis-handle ${isDraggingTimeAxis ? 'active' : ''}`}
          onMouseDown={handleTimeAxisDragStart}
          onDoubleClick={() => {
            // 1D: reset to show all, other timeframes: reset to optimal view (~100 candles)
            const optimalZoom = timeframe === '1D' ? 1 : Math.max(1, Math.ceil(candleData.length / 100))
            setZoomLevel(optimalZoom)
          }}
          title="Drag left/right to zoom time scale • Double-click to reset"
        />
        
        {/* Crosshair Overlay - TradingView style */}
        {crosshair.visible && chartDimensionsRef.current && (
          <div className="crosshair-overlay">
            {/* Vertical line - snapped to candle center */}
            <div 
              className="crosshair-line crosshair-vertical"
              style={{ left: crosshair.x }}
            />
            {/* Horizontal line */}
            <div 
              className="crosshair-line crosshair-horizontal"
              style={{ top: crosshair.y }}
            />
            {/* Price/MCap label on right axis */}
            <div 
              className="crosshair-label crosshair-price"
              style={{ top: crosshair.y, right: priceAxisWidth - 65 }}
            >
              {(() => {
                const price = crosshair.price || 0
                // Use REAL circulating supply from API
                const circSupply = liveTokenData?.circulatingSupply ? parseFloat(liveTokenData.circulatingSupply) : 0
                if (yAxisMode === 'mcap' && circSupply > 0) {
                  const mcap = price * circSupply
                  return hookFmtLarge(mcap)
                }
                return hookFmtPrice(price)
              })()}
            </div>
            {/* Time label on bottom axis */}
            {crosshair.time && (
              <div 
                className="crosshair-label crosshair-time"
                style={{ left: crosshair.x, bottom: timeAxisHeight - 15 }}
              >
                {typeof crosshair.time === 'string' ? crosshair.time : crosshair.time.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            )}
            {/* OHLCV Data Tooltip - TradingView style */}
            {crosshair.candle && (
              <div className="crosshair-ohlcv" style={{ left: 15, top: 8 }}>
                <span className="ohlcv-label">O</span>
                <span className={`ohlcv-value ${crosshair.candle.close >= crosshair.candle.open ? 'bullish' : 'bearish'}`}>
                  {hookFmtPrice(crosshair.candle.open)}
                </span>
                <span className="ohlcv-label">H</span>
                <span className={`ohlcv-value ${crosshair.candle.close >= crosshair.candle.open ? 'bullish' : 'bearish'}`}>
                  {hookFmtPrice(crosshair.candle.high)}
                </span>
                <span className="ohlcv-label">L</span>
                <span className={`ohlcv-value ${crosshair.candle.close >= crosshair.candle.open ? 'bullish' : 'bearish'}`}>
                  {hookFmtPrice(crosshair.candle.low)}
                </span>
                <span className="ohlcv-label">C</span>
                <span className={`ohlcv-value ${crosshair.candle.close >= crosshair.candle.open ? 'bullish' : 'bearish'}`}>
                  {hookFmtPrice(crosshair.candle.close)}
                </span>
                <span className="ohlcv-label">Vol</span>
                <span className="ohlcv-value volume">
                  {hookFmtLarge(crosshair.candle.volume)}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* X Chart Avatar Overlays */}
        {chartViewMode === 'xChart' && chartDimensionsRef.current && (
          <div className="x-chart-overlay">
            {xMentions.map(mention => {
              if (mention.candleIndex >= candleData.length) return null
              const { chartLeft, candleWidth, scaleY } = chartDimensionsRef.current
              const candle = candleData[mention.candleIndex]
              const x = chartLeft + mention.candleIndex * candleWidth + candleWidth / 2
              const y = scaleY(candle.close) - 40
              
              return (
                <div
                  key={mention.id}
                  className={`x-mention-avatar ${mention.sentiment} ${hoveredMention === mention.id ? 'hovered' : ''}`}
                  style={{
                    left: x,
                    top: y,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onMouseEnter={() => setHoveredMention(mention.id)}
                  onMouseLeave={() => setHoveredMention(null)}
                >
                  <img src={mention.avatar} alt={mention.user} />
                  {hoveredMention === mention.id && (
                    <div className="mention-tooltip">
                      <div className="mention-header">
                        <span className="mention-user">{mention.user}</span>
                        <span className="mention-likes">❤️ {mention.likes.toLocaleString()}</span>
                      </div>
                      <p className="mention-content">{mention.content}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        
        {/* Volume Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div 
            className="volume-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="tooltip-date">{formatDate(tooltip.data.date)}</div>
            <div className="tooltip-content">
              <div className="tooltip-accent"></div>
              <div className="tooltip-info">
                <span className="tooltip-label">Volume</span>
                <span className="tooltip-value">{formatVolume(tooltip.data.volume)}</span>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
      </div>

      {/* Resize Handle */}
      {!isFullscreen && (
        <div 
          className={`chart-resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
        >
          <div className="resize-handle-bar" />
        </div>
      )}
    </div>
  )
}, areChartPropsEqual)

export default TradingChart
