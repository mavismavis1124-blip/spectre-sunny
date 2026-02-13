/**
 * DataTabs Component
 * Figma Reference: Tabs section below chart
 * Tabs: Transactions History, Holders, On-Chain Bubblemap, X Bubblemap
 * 
 * NOW WITH REAL-TIME TRADES FROM CODEX API
 */
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLatestTrades, useTokenDetails } from '../hooks/useCodexData'
import { getTokenPriceBySymbol } from '../services/codexApi'
import { useCurrency } from '../hooks/useCurrency'
import { useCopyToast } from '../App'
import './DataTabs.css'

// Format timestamp to relative time (age)
const formatAge = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) return '-'
  
  const now = new Date()
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  
  return `${Math.floor(diffDays / 30)}mo ago`
}

// Format timestamp to date string (4 Nov 19:12:28)
const formatDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) return '-'
  
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return `${day} ${month} ${hours}:${minutes}:${seconds}`
}

// Format token amount
const formatAmount = (amount) => {
  if (!amount || isNaN(amount)) return '-'
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`
  return amount.toFixed(2)
}

// Format percentage of supply traded (based on USD value / market cap)
const formatPercentage = (usdValue, marketCap) => {
  if (!usdValue || isNaN(usdValue) || !marketCap || marketCap <= 0) return '-'
  const pct = (usdValue / marketCap) * 100
  if (pct < 0.000001) return '<0.000001%'
  if (pct < 0.0001) return `${pct.toFixed(6)}%`
  if (pct < 0.01) return `${pct.toFixed(4)}%`
  if (pct < 1) return `${pct.toFixed(2)}%`
  return `${pct.toFixed(1)}%`
}

// formatMcap is now handled by fmtLarge from useCurrency hook (inside component)

// Format native token value (ETH, SOL, BNB, etc.)
const formatNativeToken = (value, symbol = 'ETH') => {
  if (!value || isNaN(value)) return '-'
  if (value >= 1000) return `${(value).toFixed(2)} ${symbol}`
  if (value >= 1) return `${value.toFixed(4)} ${symbol}`
  if (value >= 0.01) return `${value.toFixed(4)} ${symbol}`
  if (value >= 0.0001) return `${value.toFixed(6)} ${symbol}`
  return `${value.toExponential(2)} ${symbol}`
}

// Get native token symbol for a network
const getNativeTokenSymbol = (networkId) => {
  const nativeTokens = {
    1: 'ETH',           // Ethereum
    56: 'BNB',          // BSC
    137: 'MATIC',       // Polygon
    42161: 'ETH',       // Arbitrum
    8453: 'ETH',        // Base
    1399811149: 'SOL',  // Solana
  }
  return nativeTokens[networkId] || 'ETH'
}

// Truncate address for display
const truncateAddress = (address) => {
  if (!address) return '-'
  if (address.length <= 13) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Maker type labels based on behavior patterns with full descriptions
const BUY_TYPES = [
  { label: 'NEW', name: 'New Holder', color: '#10B981', desc: 'First buy of this token by this wallet.' },
  { label: 'DCA', name: 'Dollar-Cost Average', color: '#06B6D4', desc: 'Additional buy after initial purchase – averaging into position.' },
  { label: 'FOMO', name: 'Buy After Pump', color: '#F59E0B', desc: 'Buy after a significant price increase – chasing the pump.' },
  { label: 'BTD', name: 'Buy the Dip', color: '#8B5CF6', desc: 'Buy after a significant price decrease – buying the dip.' },
  { label: 'BB', name: 'Bundle Buy', color: '#EC4899', desc: 'Rebuy after bundle sell – tokens were initially bundled, sold, then rebought.' },
  { label: 'B', name: 'Buyback', color: '#14B8A6', desc: 'Tokens bought from deployer or tax wallet.' },
  { label: 'SB', name: 'Sniper Buy', color: '#F43F5E', desc: 'Tokens bought in the first blocks of launch – likely a sniper bot.' },
  { label: 'EHB', name: 'Early Holder Buy', color: '#22C55E', desc: 'Wallet that bought very early after token launch (time varies by token age).' },
]

// Dynamic top holder buy labels (T1B - T20B)
const getTopHolderBuyType = (rank) => ({
  label: `T${rank}B`,
  name: `Top ${rank} Holder Buy`,
  color: '#22C55E',
  desc: `Top ${rank} holder (out of top 20) is buying more tokens.`
})

const SELL_TYPES = [
  { label: 'TP', name: 'Take Profit', color: '#10B981', desc: 'Wallet sold tokens at a profit.' },
  { label: 'SAL', name: 'Sell at Loss', color: '#EF4444', desc: 'Wallet sold tokens at a loss.' },
  { label: 'PANIC', name: 'Panic Sell', color: '#DC2626', desc: 'Sell during or after a significant price increase – panic selling.' },
  { label: 'OUT', name: 'Full Exit', color: '#F97316', desc: 'Wallet sold ALL tokens – complete exit from position.' },
  { label: 'PART', name: 'Partial Exit', color: '#A855F7', desc: 'Wallet sold some tokens but still holds a portion.' },
  { label: 'REKT', name: 'Exit at Heavy Loss', color: '#991B1B', desc: 'Wallet sold all tokens at 70%+ loss – got rekt.' },
  { label: 'DS', name: 'Deployer Sell', color: '#BE123C', desc: 'Token sells directly from the deployer wallet – potential red flag.' },
  { label: 'DTS', name: 'Deployer Transfer & Sell', color: '#9F1239', desc: 'Tokens transferred from deployer to another wallet, then sold – obfuscated dev sell.' },
  { label: 'BS', name: 'Bundle Sell', color: '#EC4899', desc: 'Supply was initially bundled, then distributed and sold.' },
  { label: 'SS', name: 'Sniper Sell', color: '#F43F5E', desc: 'Sniper bot selling tokens after early buy.' },
  { label: 'EHS', name: 'Early Holder Sell', color: '#FB923C', desc: 'Early holder is selling their position.' },
]

// Dynamic top holder sell labels (T1S - T20S)
const getTopHolderSellType = (rank) => ({
  label: `T${rank}S`,
  name: `Top ${rank} Holder Sell`,
  color: '#FB923C',
  desc: `Top ${rank} holder (out of top 20) is selling tokens.`
})

// Get maker type based on address hash and transaction type (mock)
const getMakerType = (address, txType) => {
  if (!address) return null
  // Use address hash to get consistent type for same maker
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const types = txType === 'buy' ? BUY_TYPES : SELL_TYPES
  return types[hash % types.length]
}



const DataTabs = ({ token, isExpanded = false, setIsExpanded }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const [activeTab, setActiveTab] = useState('transactions')
  const [showDateMode, setShowDateMode] = useState(false) // false = Age (default), true = Date
  const [showAmountMode, setShowAmountMode] = useState(true) // true = Amount, false = Percentage
  const [showPriceMode, setShowPriceMode] = useState(true) // true = Price, false = MCap
  const [showUsdMode, setShowUsdMode] = useState(true) // true = USD, false = ETH
  
  // Scroll protection for bubblemap tab
  const [iframeReady, setIframeReady] = useState(false)
  const scrollPositionRef = useRef(0)
  const scrollProtectionRef = useRef({ active: false, rafId: null })
  
  // useLayoutEffect runs synchronously after DOM changes but BEFORE browser paint
  // This should prevent any visible flash
  useLayoutEffect(() => {
    if (activeTab === 'onchain' && scrollPositionRef.current > 0) {
      // Immediately restore scroll position before paint - this is synchronous
      window.scrollTo(0, scrollPositionRef.current)
    }
  }, [activeTab])
  
  // Set up ongoing scroll protection
  useEffect(() => {
    if (activeTab !== 'onchain') {
      setIframeReady(false)
      scrollProtectionRef.current.active = false
      if (scrollProtectionRef.current.rafId) {
        cancelAnimationFrame(scrollProtectionRef.current.rafId)
      }
    } else {
      const savedPosition = scrollPositionRef.current
      scrollProtectionRef.current.active = true
      
      // Continuous scroll protection using RAF
      const protectScroll = () => {
        if (!scrollProtectionRef.current.active) return
        
        // Restore if scroll jumped towards top
        if (window.scrollY < savedPosition - 30) {
          window.scrollTo(0, savedPosition)
        }
        
        scrollProtectionRef.current.rafId = requestAnimationFrame(protectScroll)
      }
      
      scrollProtectionRef.current.rafId = requestAnimationFrame(protectScroll)
      
      // Delay iframe render
      const timer = setTimeout(() => setIframeReady(true), 50)
      
      // Stop protection after 8 seconds (give iframe time to fully load)
      const timeout = setTimeout(() => {
        scrollProtectionRef.current.active = false
        if (scrollProtectionRef.current.rafId) {
          cancelAnimationFrame(scrollProtectionRef.current.rafId)
        }
      }, 8000)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(timeout)
        scrollProtectionRef.current.active = false
        if (scrollProtectionRef.current.rafId) {
          cancelAnimationFrame(scrollProtectionRef.current.rafId)
        }
      }
    }
  }, [activeTab])
  
  // Tick counter for live age updates (updates every second)
  const [, setTick] = useState(0)
  
  // Update age display every second when in Age mode
  useEffect(() => {
    if (showDateMode) return // Don't tick when showing date
    
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [showDateMode])
  
  const [typeFilter, setTypeFilter] = useState(null) // null = All, 'buy', 'sell', 'add', 'remove'
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [showAmountMenu, setShowAmountMenu] = useState(false)
  const [amountFilter, setAmountFilter] = useState({ min: '', max: '' }) // Applied filter
  const [pendingAmountFilter, setPendingAmountFilter] = useState({ min: '', max: '' }) // Input values
  const [showPriceMenu, setShowPriceMenu] = useState(false)
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '', minUnit: 1000000, maxUnit: 1000000 }) // Applied filter with units (default M)
  const [pendingPriceFilter, setPendingPriceFilter] = useState({ min: '', max: '', minUnit: 1000000, maxUnit: 1000000 }) // Input values
  const [showValueMenu, setShowValueMenu] = useState(false)
  const [valueFilter, setValueFilter] = useState({ min: '', max: '' }) // USD filter
  const [pendingValueFilter, setPendingValueFilter] = useState({ min: '', max: '' }) // USD input values
  const [ethFilter, setEthFilter] = useState({ min: '', max: '' }) // ETH filter
  const [pendingEthFilter, setPendingEthFilter] = useState({ min: '', max: '' }) // ETH input values
  const [showEthMenu, setShowEthMenu] = useState(false)
  const [showMakerMenu, setShowMakerMenu] = useState(false)
  const [makerFilter, setMakerFilter] = useState('') // Applied filter (maker address)
  const [pendingMakerFilter, setPendingMakerFilter] = useState('') // Input value
  const typeMenuRef = useRef(null)
  const amountMenuRef = useRef(null)
  const priceMenuRef = useRef(null)
  const valueMenuRef = useRef(null)
  const ethMenuRef = useRef(null)
  const makerMenuRef = useRef(null)
  const { triggerCopyToast } = useCopyToast()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) {
        setShowTypeMenu(false)
      }
      if (amountMenuRef.current && !amountMenuRef.current.contains(e.target)) {
        setShowAmountMenu(false)
      }
      if (priceMenuRef.current && !priceMenuRef.current.contains(e.target)) {
        setShowPriceMenu(false)
      }
      if (valueMenuRef.current && !valueMenuRef.current.contains(e.target)) {
        setShowValueMenu(false)
      }
      if (ethMenuRef.current && !ethMenuRef.current.contains(e.target)) {
        setShowEthMenu(false)
      }
      if (makerMenuRef.current && !makerMenuRef.current.contains(e.target)) {
        setShowMakerMenu(false)
      }
    }
    if (showTypeMenu || showAmountMenu || showPriceMenu || showValueMenu || showEthMenu || showMakerMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTypeMenu, showAmountMenu, showPriceMenu, showValueMenu, showEthMenu, showMakerMenu])
  
  // Fetch real trades for the current token
  const { trades, loading, loadingMore, error, hasMore, refresh, loadMore } = useLatestTrades(
    token?.address,
    token?.networkId || 1,
    100 // Initial limit
  )
  
  // Fetch detailed token data for circulatingSupply and marketCap
  const { tokenData: liveTokenData } = useTokenDetails(token?.address, token?.networkId || 1)
  const circulatingSupply = liveTokenData?.circulatingSupply ? parseFloat(liveTokenData.circulatingSupply) : 0
  const marketCap = liveTokenData?.marketCap ? parseFloat(liveTokenData.marketCap) : 0
  
  // Get native token symbol for current network
  const nativeTokenSymbol = getNativeTokenSymbol(token?.networkId || 1)
  const isSolana = (token?.networkId || 1) === 1399811149
  
  // Native token price for USD conversion (ETH, SOL, etc.)
  const [nativePrice, setNativePrice] = useState(isSolana ? 200 : 3500) // Default fallbacks
  
  useEffect(() => {
    const fetchNativePrice = async () => {
      try {
        // Fetch the correct native token price based on network
        const symbol = isSolana ? 'SOL' : 'ETH'
        const result = await getTokenPriceBySymbol(symbol)
        if (result?.price && result.price > 0) {
          setNativePrice(result.price)
        }
      } catch (err) {
        console.log(`Failed to fetch ${nativeTokenSymbol} price, using fallback`)
      }
    }
    fetchNativePrice()
    // Refresh price every 60 seconds
    const interval = setInterval(fetchNativePrice, 60000)
    return () => clearInterval(interval)
  }, [isSolana, nativeTokenSymbol])
  
  const tableWrapperRef = useRef(null)

  const dataTabsRef = useRef(null)
  const expandAccumulator = useRef(0)
  const collapseAccumulator = useRef(0)
  const lastScrollTime = useRef(0)
  
  // Scroll down → expand, Scroll up at top → collapse
  useEffect(() => {
    const wrapper = tableWrapperRef.current
    if (!wrapper || !setIsExpanded) return

    const handleWheel = (e) => {
      const now = Date.now()
      const isScrollingDown = e.deltaY > 0
      const isScrollingUp = e.deltaY < 0
      const isAtTop = wrapper.scrollTop === 0
      
      // Reset accumulators if user paused scrolling
      if (now - lastScrollTime.current > 400) {
        expandAccumulator.current = 0
        collapseAccumulator.current = 0
      }
      lastScrollTime.current = now
      
      // Scroll DOWN while NOT expanded → expand
      if (isScrollingDown && !isExpanded) {
        expandAccumulator.current += e.deltaY
        collapseAccumulator.current = 0
        if (expandAccumulator.current > 200) {
          setIsExpanded(true)
          expandAccumulator.current = 0
        }
      }
      // Scroll UP while expanded AND at top → collapse (open chart)
      else if (isScrollingUp && isExpanded && isAtTop) {
        collapseAccumulator.current += Math.abs(e.deltaY)
        expandAccumulator.current = 0
        if (collapseAccumulator.current > 150) {
          setIsExpanded(false)
          collapseAccumulator.current = 0
        }
      }
      // Reset when changing direction
      else if (isScrollingDown) {
        collapseAccumulator.current = 0
      } else if (isScrollingUp && !isAtTop) {
        collapseAccumulator.current = 0
      }
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: true })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [isExpanded, setIsExpanded])

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    const wrapper = tableWrapperRef.current
    if (!wrapper) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = wrapper
      
      // Load more when 100px from bottom
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore && !loading) {
        loadMore()
      }
    }

    wrapper.addEventListener('scroll', handleScroll)
    return () => wrapper.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadingMore, loading, loadMore])

  // Filter trades by type, amount, and price/mcap
  const filteredTrades = useMemo(() => {
    let result = trades
    
    // Filter by type
    if (typeFilter) {
      result = result.filter(t => t.type?.toLowerCase() === typeFilter)
    }
    
    // Filter by amount - USD when Amount mode, % of market cap when Percentage mode
    const minAmountVal = parseFloat(amountFilter.min)
    const maxAmountVal = parseFloat(amountFilter.max)
    
    if (!isNaN(minAmountVal) && minAmountVal > 0) {
      if (showAmountMode) {
        // Amount mode - filter by USD value
        result = result.filter(t => t.value >= minAmountVal)
      } else {
        // Percentage mode - filter by % of market cap (USD value / marketCap)
        result = result.filter(t => {
          if (!marketCap || marketCap <= 0) return true
          const pct = (t.value / marketCap) * 100
          return pct >= minAmountVal
        })
      }
    }
    if (!isNaN(maxAmountVal) && maxAmountVal > 0) {
      if (showAmountMode) {
        // Amount mode - filter by USD value
        result = result.filter(t => t.value <= maxAmountVal)
      } else {
        // Percentage mode - filter by % of market cap
        result = result.filter(t => {
          if (!marketCap || marketCap <= 0) return false
          const pct = (t.value / marketCap) * 100
          return pct <= maxAmountVal
        })
      }
    }
    
    // Filter by price or mcap depending on mode
    const minPriceVal = parseFloat(priceFilter.min) * (priceFilter.minUnit || 1)
    const maxPriceVal = parseFloat(priceFilter.max) * (priceFilter.maxUnit || 1)
    if (!isNaN(minPriceVal) && minPriceVal > 0) {
      if (showPriceMode) {
        // Filter by price
        result = result.filter(t => t.price >= minPriceVal)
      } else {
        // Filter by mcap (price * circulatingSupply)
        result = result.filter(t => (t.price * circulatingSupply) >= minPriceVal)
      }
    }
    if (!isNaN(maxPriceVal) && maxPriceVal > 0) {
      if (showPriceMode) {
        result = result.filter(t => t.price <= maxPriceVal)
      } else {
        result = result.filter(t => (t.price * circulatingSupply) <= maxPriceVal)
      }
    }
    
    // Filter by native token value (ETH, SOL, etc.)
    const minNativeVal = parseFloat(ethFilter.min)
    const maxNativeVal = parseFloat(ethFilter.max)
    if (!isNaN(minNativeVal) && minNativeVal > 0) {
      result = result.filter(t => (t.value / nativePrice) >= minNativeVal)
    }
    if (!isNaN(maxNativeVal) && maxNativeVal > 0) {
      result = result.filter(t => (t.value / nativePrice) <= maxNativeVal)
    }
    
    // Filter by USD value
    const minUsdVal = parseFloat(valueFilter.min)
    const maxUsdVal = parseFloat(valueFilter.max)
    if (!isNaN(minUsdVal) && minUsdVal > 0) {
      result = result.filter(t => t.value >= minUsdVal)
    }
    if (!isNaN(maxUsdVal) && maxUsdVal > 0) {
      result = result.filter(t => t.value <= maxUsdVal)
    }
    
    // Filter by maker address
    if (makerFilter) {
      result = result.filter(t => t.maker?.toLowerCase() === makerFilter.toLowerCase())
    }
    
    return result
  }, [trades, typeFilter, amountFilter, showAmountMode, priceFilter, showPriceMode, circulatingSupply, marketCap, ethFilter, valueFilter, nativePrice, makerFilter])

  // Check if amount filter is active
  const isAmountFilterActive = amountFilter.min !== '' || amountFilter.max !== ''

  // Apply amount filter
  const applyAmountFilter = () => {
    setAmountFilter(pendingAmountFilter)
    setShowAmountMenu(false)
  }

  // Sync pending filter with applied filter when menu opens
  const openAmountMenu = () => {
    setPendingAmountFilter(amountFilter)
    setShowAmountMenu(true)
  }

  // Clear amount filter
  const clearAmountFilter = () => {
    setPendingAmountFilter({ min: '', max: '' })
    setAmountFilter({ min: '', max: '' })
  }

  // Check if price filter is active
  const isPriceFilterActive = priceFilter.min !== '' || priceFilter.max !== ''

  // Apply price filter
  const applyPriceFilter = () => {
    setPriceFilter(pendingPriceFilter)
    setShowPriceMenu(false)
  }

  // Sync pending filter with applied filter when menu opens
  const openPriceMenu = () => {
    setPendingPriceFilter(priceFilter)
    setShowPriceMenu(true)
  }

  // Clear price filter
  const clearPriceFilter = () => {
    setPendingPriceFilter({ min: '', max: '', minUnit: 1000000, maxUnit: 1000000 })
    setPriceFilter({ min: '', max: '', minUnit: 1000000, maxUnit: 1000000 })
  }

  // Check if value filter is active
  const isValueFilterActive = valueFilter.min !== '' || valueFilter.max !== ''

  // Apply value filter
  const applyValueFilter = () => {
    setValueFilter(pendingValueFilter)
    setShowValueMenu(false)
  }

  // Sync pending filter with applied filter when menu opens
  const openValueMenu = () => {
    setPendingValueFilter(valueFilter)
    setShowValueMenu(true)
  }

  // Clear value filter
  const clearValueFilter = () => {
    setPendingValueFilter({ min: '', max: '' })
    setValueFilter({ min: '', max: '' })
  }

  // Check if ETH filter is active
  const isEthFilterActive = ethFilter.min !== '' || ethFilter.max !== ''

  // Apply ETH filter
  const applyEthFilter = () => {
    setEthFilter(pendingEthFilter)
    setShowEthMenu(false)
  }

  // Sync pending ETH filter with applied filter when menu opens
  const openEthMenu = () => {
    setPendingEthFilter(ethFilter)
    setShowEthMenu(true)
  }

  // Clear ETH filter
  const clearEthFilter = () => {
    setPendingEthFilter({ min: '', max: '' })
    setEthFilter({ min: '', max: '' })
  }

  // Check if maker filter is active
  const isMakerFilterActive = makerFilter !== ''

  // Apply maker filter
  const applyMakerFilter = () => {
    setMakerFilter(pendingMakerFilter)
    setShowMakerMenu(false)
  }

  // Sync pending filter with applied filter when menu opens
  const openMakerMenu = () => {
    setPendingMakerFilter(makerFilter)
    setShowMakerMenu(true)
  }

  // Clear maker filter
  const clearMakerFilter = () => {
    setPendingMakerFilter('')
    setMakerFilter('')
  }

  // Filter by specific maker (from row click)
  const filterByMaker = (address) => {
    setMakerFilter(address)
    setPendingMakerFilter(address)
  }

  // Get unique makers from trades for dropdown
  const uniqueMakers = useMemo(() => {
    const makers = new Map()
    trades.forEach(t => {
      if (t.maker && !makers.has(t.maker)) {
        makers.set(t.maker, trades.filter(tr => tr.maker === t.maker).length)
      }
    })
    // Sort by transaction count
    return Array.from(makers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 makers
  }, [trades])

  // Unit options for MCap filter
  const unitOptions = [
    { value: 1, label: '-' },
    { value: 1000, label: 'K' },
    { value: 1000000, label: 'M' },
    { value: 1000000000, label: 'B' },
  ]

  // Format filter value with unit for badge display
  const formatFilterValue = (value, unit) => {
    if (!value) return ''
    const unitLabel = unitOptions.find(u => u.value === unit)?.label || ''
    return unitLabel === '-' ? value : `${value}${unitLabel}`
  }

  // Type filter options
  const typeFilterOptions = [
    { value: null, label: t('common.all'), color: null },
    { value: 'buy', label: t('token.buy'), color: 'var(--bull)' },
    { value: 'sell', label: t('token.sell'), color: 'var(--bear)' },
    { value: 'add', label: t('common.add'), color: '#3B82F6' },
    { value: 'remove', label: t('common.remove'), color: '#F97316' },
  ]

  const getActiveFilterLabel = () => {
    const active = typeFilterOptions.find(o => o.value === typeFilter)
    return active ? active.label : 'All'
  }

  const tabs = [
    { id: 'transactions', label: t('common.transactions') },
    { id: 'holders', label: t('common.holders') },
    { id: 'onchain', label: t('dataTabs.onChain') },
    { id: 'xbubble', label: t('dataTabs.xBubblemap') },
  ]

  // Enhanced holders data with comprehensive analytics
  const holders = useMemo(() => [
    { rank: 1, address: '0x28C6c06298d514Db089934071355E5743bf21d60', label: 'Binance 14', balance: 2500000, percentage: 25.0, type: 'CEX', change24h: 2.5, lastActive: '2h ago', txCount: 1247 },
    { rank: 2, address: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549', label: 'Binance 15', balance: 1800000, percentage: 18.0, type: 'CEX', change24h: -1.2, lastActive: '45m ago', txCount: 892 },
    { rank: 3, address: '0x5a52E96BAcdaBb82fd05763E25335261B270Efcb', label: null, balance: 890000, percentage: 8.9, type: 'Whale', change24h: 15.3, lastActive: '1h ago', txCount: 156 },
    { rank: 4, address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', label: 'Binance 8', balance: 650000, percentage: 6.5, type: 'CEX', change24h: 0, lastActive: '3h ago', txCount: 2341 },
    { rank: 5, address: '0x8103683202Aa8dA10536036EDef04CDd865a225E', label: null, balance: 456000, percentage: 4.56, type: 'Whale', change24h: -5.7, lastActive: '12h ago', txCount: 89 },
    { rank: 6, address: '0xDFd5293D8e347dFe59E90eFd55b2956a1343963d', label: 'Uniswap V3', balance: 380000, percentage: 3.8, type: 'DEX', change24h: 0.8, lastActive: '5m ago', txCount: 15672 },
    { rank: 7, address: '0x1111111254EEB25477B68fb85Ed929f73A960582', label: '1inch', balance: 290000, percentage: 2.9, type: 'DEX', change24h: -0.3, lastActive: '2m ago', txCount: 8934 },
    { rank: 8, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB30', label: null, balance: 234000, percentage: 2.34, type: 'Whale', change24h: 45.2, lastActive: '30m ago', txCount: 23 },
    { rank: 9, address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', label: 'Binance 7', balance: 189000, percentage: 1.89, type: 'CEX', change24h: 0, lastActive: '6h ago', txCount: 1567 },
    { rank: 10, address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', label: null, balance: 156000, percentage: 1.56, type: 'Holder', change24h: 0, lastActive: '2d ago', txCount: 12 },
    { rank: 11, address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', label: 'Binance 1', balance: 134000, percentage: 1.34, type: 'CEX', change24h: -2.1, lastActive: '4h ago', txCount: 4521 },
    { rank: 12, address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', label: null, balance: 98000, percentage: 0.98, type: 'Holder', change24h: 0, lastActive: '5d ago', txCount: 3 },
    { rank: 13, address: '0xC098B2a3Aa256D2140208C3de6543aAEf5cd3A94', label: 'FTX', balance: 87000, percentage: 0.87, type: 'CEX', change24h: 0, lastActive: '1y ago', txCount: 234 },
    { rank: 14, address: '0x564286362092D8e7936f0549571a803B203aAceD', label: null, balance: 76000, percentage: 0.76, type: 'Holder', change24h: 12.4, lastActive: '1h ago', txCount: 45 },
    { rank: 15, address: '0xE92d1A43df510F82C66382592a047d288f85226f', label: null, balance: 65000, percentage: 0.65, type: 'Holder', change24h: -8.9, lastActive: '8h ago', txCount: 78 },
  ], [])
  
  // Calculate holder analytics
  const holderAnalytics = useMemo(() => {
    const top10Total = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0)
    const top20Total = holders.reduce((sum, h) => sum + h.percentage, 0)
    const whales = holders.filter(h => h.type === 'Whale').length
    const cexHolding = holders.filter(h => h.type === 'CEX').reduce((sum, h) => sum + h.percentage, 0)
    const dexHolding = holders.filter(h => h.type === 'DEX').reduce((sum, h) => sum + h.percentage, 0)
    const accumulating = holders.filter(h => h.change24h > 5).length
    const distributing = holders.filter(h => h.change24h < -5).length
    
    // Risk score based on concentration (lower is better)
    const concentrationRisk = top10Total > 70 ? 'High' : top10Total > 50 ? 'Medium' : 'Low'
    
    // Calculate distribution by type for ALL holders
    const typeDistribution = {
      CEX: holders.filter(h => h.type === 'CEX').reduce((sum, h) => sum + h.percentage, 0),
      DEX: holders.filter(h => h.type === 'DEX').reduce((sum, h) => sum + h.percentage, 0),
      Whale: holders.filter(h => h.type === 'Whale').reduce((sum, h) => sum + h.percentage, 0),
      Holder: holders.filter(h => h.type === 'Holder').reduce((sum, h) => sum + h.percentage, 0),
      Team: holders.filter(h => h.type === 'Team').reduce((sum, h) => sum + h.percentage, 0),
      VC: holders.filter(h => h.type === 'VC').reduce((sum, h) => sum + h.percentage, 0),
    }
    // Remaining percentage (not in our list)
    const trackedTotal = Object.values(typeDistribution).reduce((a, b) => a + b, 0)
    typeDistribution.Other = Math.max(0, 100 - trackedTotal)
    
    return { top10Total, top20Total, whales, cexHolding, dexHolding, accumulating, distributing, concentrationRisk, typeDistribution }
  }, [holders])
  
  // Holder type configurations - clean professional style
  const holderTypeConfig = {
    CEX: { color: '#3b82f6', label: 'CEX' },
    DEX: { color: '#8b5cf6', label: 'DEX' },
    Whale: { color: '#f59e0b', label: 'Whale' },
    Holder: { color: '#64748b', label: 'Holder' },
    Team: { color: '#10b981', label: 'Team' },
    VC: { color: '#ec4899', label: 'VC' },
  }
  
  // Get tier class based on percentage (for subtle row highlighting)
  const getTierClass = (percentage) => {
    if (percentage >= 10) return 'tier-major'
    if (percentage >= 5) return 'tier-significant'
    return ''
  }
  
  // Format large numbers
  const formatHolderBalance = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }
  
  // Copy address handler with toast notification
  const copyHolderAddress = (address) => {
    navigator.clipboard.writeText(address)
    triggerCopyToast(t('dataTabs.addressCopied'))
  }
  
  // State for holder filtering
  const [holderTypeFilter, setHolderTypeFilter] = useState('all')
  const [holderSortBy, setHolderSortBy] = useState('rank')
  
  // Filtered and sorted holders
  const displayHolders = useMemo(() => {
    let filtered = holderTypeFilter === 'all' 
      ? holders 
      : holders.filter(h => h.type === holderTypeFilter)
    
    if (holderSortBy === 'change') {
      return [...filtered].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    }
    return filtered
  }, [holders, holderTypeFilter, holderSortBy])

  // Get explorer URL for transaction or address
  const getExplorerUrl = (hash, networkId, type = 'tx') => {
    const baseUrls = {
      1: 'https://etherscan.io',
      56: 'https://bscscan.com',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      1399811149: 'https://solscan.io',
    }
    const base = baseUrls[networkId] || baseUrls[1]
    const path = type === 'address' ? '/address/' : '/tx/'
    return `${base}${path}${hash}`
  }

  return (
    <div className={`data-tabs ${isExpanded ? 'expanded' : ''}`} ref={dataTabsRef}>
      {/* Tab navigation */}
      <div className="tabs-nav">
        <div className="tabs-scroll">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Save scroll position BEFORE state change
                scrollPositionRef.current = window.scrollY
                setActiveTab(tab.id)
              }}
            >
{tab.label}
            </button>
          ))}
        </div>
        <div className="tabs-actions">
          {activeTab === 'transactions' && (
            <button 
              className="action-icon refresh-btn"
              onClick={refresh}
              title={t('dataTabs.refreshTrades')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={loading ? 'spinning' : ''}>
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button className="action-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
          {/* Expand/Collapse button */}
          <button 
            className={`action-icon expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? t('dataTabs.collapseTransactions') : t('dataTabs.expandTransactions')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              {isExpanded ? (
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="tabs-content">
        {activeTab === 'transactions' && (
          <div className="table-wrapper" ref={tableWrapperRef}>
            {loading && trades.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{t('dataTabs.loadingTrades')}</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{t('errors.failedToLoad')}</p>
                <button onClick={refresh}>{t('common.retry')}</button>
              </div>
            ) : trades.length === 0 ? (
              <div className="empty-state">
                <p>{t('dataTabs.noTransactions')}</p>
                <span>{t('dataTabs.tradesWillAppear')}</span>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="empty-state">
                <p>{t('dataTabs.noFilteredTransactions', { filter: typeFilter })}</p>
                <span>{t('dataTabs.tryDifferentFilter')}</span>
              </div>
            ) : (
              <>
            <table className="data-table">
              <thead>
                <tr>
                    <th>
                      <span className="th-content date-age-toggle">
                        <span
                          className={`toggle-option ${!showDateMode ? 'active' : ''}`}
                          onClick={() => setShowDateMode(false)}
                        >{t('common.age')}</span>
                        <span className="toggle-separator">/</span>
                        <span
                          className={`toggle-option ${showDateMode ? 'active' : ''}`}
                          onClick={() => setShowDateMode(true)}
                        >{t('common.date')}</span>
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        {t('dataTabs.type')}
                        <div className="filter-dropdown-wrapper" ref={typeMenuRef}>
                          <button
                            className={`filter-btn ${typeFilter ? 'active' : ''}`}
                            title={t('dataTabs.filterByType')}
                            onClick={() => setShowTypeMenu(!showTypeMenu)}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showTypeMenu && (
                            <div className="filter-dropdown-menu">
                              {typeFilterOptions.map(option => (
                                <button
                                  key={option.label}
                                  className={`filter-menu-item ${typeFilter === option.value ? 'active' : ''}`}
                                  onClick={() => {
                                    setTypeFilter(option.value)
                                    setShowTypeMenu(false)
                                  }}
                                  style={option.color ? { '--item-color': option.color } : {}}
                                >
                                  {option.value && (
                                    <span className="filter-menu-dot" style={{ backgroundColor: option.color }}></span>
                                  )}
                                  {option.label}
                                  {typeFilter === option.value && (
                                    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" className="check-icon">
                                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                                    </svg>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {typeFilter && (
                          <span className={`active-filter-badge ${typeFilter}`}>
                            {getActiveFilterLabel()}
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); setTypeFilter(null); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        <span className="date-age-toggle">
                          <span
                            className={`toggle-option ${showPriceMode ? 'active' : ''}`}
                            onClick={() => setShowPriceMode(true)}
                          >{t('common.price')}</span>
                          <span className="toggle-separator">/</span>
                          <span
                            className={`toggle-option ${!showPriceMode ? 'active' : ''}`}
                            onClick={() => setShowPriceMode(false)}
                          >MCap</span>
                        </span>
                        <div className="filter-dropdown-wrapper" ref={priceMenuRef}>
                          <button 
                            className={`filter-btn ${isPriceFilterActive ? 'active' : ''}`} 
                            title={`Filter by ${showPriceMode ? 'price' : 'market cap'}`}
                            onClick={() => showPriceMenu ? setShowPriceMenu(false) : openPriceMenu()}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showPriceMenu && (
                            <div className="filter-dropdown-menu amount-filter-menu">
                              <div className="amount-filter-inputs">
                                <div className="amount-input-group">
                                  <label>Min {showPriceMode ? '$' : 'MCap'}</label>
                                  <div className="input-with-unit">
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={pendingPriceFilter.min}
                                      onChange={(e) => setPendingPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                                    />
                                    {!showPriceMode && (
                                      <div className="unit-pills">
                                        {unitOptions.filter(u => u.label !== '-').map(opt => (
                                          <button
                                            key={opt.value}
                                            className={`unit-pill ${pendingPriceFilter.minUnit === opt.value ? 'active' : ''}`}
                                            onClick={() => setPendingPriceFilter(prev => ({ ...prev, minUnit: opt.value }))}
                                            type="button"
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="amount-input-group">
                                  <label>Max {showPriceMode ? '$' : 'MCap'}</label>
                                  <div className="input-with-unit">
                                    <input
                                      type="number"
                                      placeholder="∞"
                                      value={pendingPriceFilter.max}
                                      onChange={(e) => setPendingPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                                    />
                                    {!showPriceMode && (
                                      <div className="unit-pills">
                                        {unitOptions.filter(u => u.label !== '-').map(opt => (
                                          <button
                                            key={opt.value}
                                            className={`unit-pill ${pendingPriceFilter.maxUnit === opt.value ? 'active' : ''}`}
                                            onClick={() => setPendingPriceFilter(prev => ({ ...prev, maxUnit: opt.value }))}
                                            type="button"
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="amount-filter-actions">
                                <button className="clear-filter-btn" onClick={clearPriceFilter}>
                                  {t('common.clear')}
                                </button>
                                <button className="apply-filter-btn" onClick={applyPriceFilter}>
                                  {t('common.apply')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isPriceFilterActive && (
                          <span className="active-filter-badge price">
                            {showPriceMode 
                              ? `$${priceFilter.min || '0'}-${priceFilter.max || '∞'}`
                              : `${formatFilterValue(priceFilter.min, priceFilter.minUnit) || '0'}-${formatFilterValue(priceFilter.max, priceFilter.maxUnit) || '∞'}`
                            }
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); clearPriceFilter(); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        <span className="date-age-toggle">
                          <span
                            className={`toggle-option ${showAmountMode ? 'active' : ''}`}
                            onClick={() => setShowAmountMode(true)}
                          >{t('dataTabs.amount')}</span>
                          <span className="toggle-separator">/</span>
                          <span
                            className={`toggle-option ${!showAmountMode ? 'active' : ''}`}
                            onClick={() => setShowAmountMode(false)}
                          >%</span>
                        </span>
                        <div className="filter-dropdown-wrapper" ref={amountMenuRef}>
                          <button 
                            className={`filter-btn ${isAmountFilterActive ? 'active' : ''}`} 
                            title="Filter by amount"
                            onClick={() => showAmountMenu ? setShowAmountMenu(false) : openAmountMenu()}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showAmountMenu && (
                            <div className="filter-dropdown-menu amount-filter-menu">
                              <div className="amount-filter-inputs">
                                <div className="amount-input-group">
                                  <label>Min {showAmountMode ? '$' : '%'}</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={pendingAmountFilter.min}
                                    onChange={(e) => setPendingAmountFilter(prev => ({ ...prev, min: e.target.value }))}
                                  />
                                </div>
                                <div className="amount-input-group">
                                  <label>Max {showAmountMode ? '$' : '%'}</label>
                                  <input
                                    type="number"
                                    placeholder="∞"
                                    value={pendingAmountFilter.max}
                                    onChange={(e) => setPendingAmountFilter(prev => ({ ...prev, max: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="amount-filter-actions">
                                <button className="clear-filter-btn" onClick={clearAmountFilter}>
                                  {t('common.clear')}
                                </button>
                                <button className="apply-filter-btn" onClick={applyAmountFilter}>
                                  {t('common.apply')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isAmountFilterActive && (
                          <span className="active-filter-badge amount">
                            {showAmountMode ? '$' : ''}{amountFilter.min || '0'}-{amountFilter.max || '∞'}{!showAmountMode ? '%' : ''}
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); clearAmountFilter(); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        {nativeTokenSymbol}
                        <div className="filter-dropdown-wrapper" ref={ethMenuRef}>
                          <button 
                            className={`filter-btn ${isEthFilterActive ? 'active' : ''}`} 
                            title={`Filter by ${nativeTokenSymbol}`}
                            onClick={() => showEthMenu ? setShowEthMenu(false) : openEthMenu()}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showEthMenu && (
                            <div className="filter-dropdown-menu amount-filter-menu">
                              <div className="amount-filter-inputs">
                                <div className="amount-input-group">
                                  <label>Min {nativeTokenSymbol}</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={pendingEthFilter.min}
                                    onChange={(e) => setPendingEthFilter(prev => ({ ...prev, min: e.target.value }))}
                                  />
                                </div>
                                <div className="amount-input-group">
                                  <label>Max {nativeTokenSymbol}</label>
                                  <input
                                    type="number"
                                    placeholder="∞"
                                    value={pendingEthFilter.max}
                                    onChange={(e) => setPendingEthFilter(prev => ({ ...prev, max: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="amount-filter-actions">
                                <button className="apply-filter-btn" onClick={applyEthFilter}>{t('common.apply')}</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isEthFilterActive && (
                          <span className="active-filter-badge eth">
                            {ethFilter.min || '0'}-{ethFilter.max || '∞'} {nativeTokenSymbol}
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); clearEthFilter(); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        USD
                        <div className="filter-dropdown-wrapper" ref={valueMenuRef}>
                          <button 
                            className={`filter-btn ${isValueFilterActive ? 'active' : ''}`} 
                            title="Filter by USD"
                            onClick={() => showValueMenu ? setShowValueMenu(false) : openValueMenu()}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showValueMenu && (
                            <div className="filter-dropdown-menu amount-filter-menu">
                              <div className="amount-filter-inputs">
                                <div className="amount-input-group">
                                  <label>Min USD</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={pendingValueFilter.min}
                                    onChange={(e) => setPendingValueFilter(prev => ({ ...prev, min: e.target.value }))}
                                  />
                                </div>
                                <div className="amount-input-group">
                                  <label>Max USD</label>
                                  <input
                                    type="number"
                                    placeholder="∞"
                                    value={pendingValueFilter.max}
                                    onChange={(e) => setPendingValueFilter(prev => ({ ...prev, max: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="amount-filter-actions">
                                <button className="apply-filter-btn" onClick={applyValueFilter}>{t('common.apply')}</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isValueFilterActive && (
                          <span className="active-filter-badge usd">
                            ${valueFilter.min || '0'}-${valueFilter.max || '∞'}
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); clearValueFilter(); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                    <th>
                      <span className="th-content">
                        {t('dataTabs.maker')}
                        <div className="filter-dropdown-wrapper" ref={makerMenuRef}>
                          <button
                            className={`filter-btn ${isMakerFilterActive ? 'active' : ''}`}
                            title={t('dataTabs.filterByMaker')}
                            onClick={() => showMakerMenu ? setShowMakerMenu(false) : openMakerMenu()}
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                              <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                            </svg>
                          </button>
                          {showMakerMenu && (
                            <div className="filter-dropdown-menu maker-filter-menu">
                              <div className="maker-filter-input">
                                <label>{t('dataTabs.makerAddress')}</label>
                                <input
                                  type="text"
                                  placeholder="0x..."
                                  value={pendingMakerFilter}
                                  onChange={(e) => setPendingMakerFilter(e.target.value)}
                                />
                              </div>
                              {uniqueMakers.length > 0 && (
                                <div className="maker-quick-list">
                                  <label>{t('dataTabs.topMakers')}</label>
                                  {uniqueMakers.map(([address, count]) => (
                                    <button
                                      key={address}
                                      className={`maker-quick-item ${pendingMakerFilter === address ? 'active' : ''}`}
                                      onClick={() => setPendingMakerFilter(address)}
                                    >
                                      <span className="maker-quick-address">{truncateAddress(address)}</span>
                                      <span className="maker-quick-count">{count} txs</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="amount-filter-actions">
                                <button className="clear-filter-btn" onClick={clearMakerFilter}>
                                  {t('common.clear')}
                                </button>
                                <button className="apply-filter-btn" onClick={applyMakerFilter}>
                                  {t('common.apply')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isMakerFilterActive && (
                          <span className="active-filter-badge maker">
                            {truncateAddress(makerFilter)}
                            <button className="filter-badge-close" onClick={(e) => { e.stopPropagation(); clearMakerFilter(); }}>×</button>
                          </span>
                        )}
                      </span>
                    </th>
                </tr>
              </thead>
              <tbody>
                  {filteredTrades.map((tx, i) => {
                    // Determine trade size tier for styling
                    const usdValue = tx.value || 0;
                    let sizeTier = '';
                    if (usdValue >= 50000) sizeTier = 'whale';
                    else if (usdValue >= 10000) sizeTier = 'large';
                    else if (usdValue >= 1000) sizeTier = 'medium';
                    
                    return (
                    <tr key={`${tx.txHash}-${i}`} className={`${tx.type?.toLowerCase()} ${sizeTier}`}>
                      <td className="cell-date">{showDateMode ? formatDate(tx.timestamp) : formatAge(tx.timestamp)}</td>
                      <td className="cell-type">
                        <span className={`type-badge ${tx.type?.toLowerCase() || 'swap'}`}>
                          {tx.type || 'Swap'}
                      </span>
                    </td>
                      <td className="cell-price">
                        {showPriceMode
                          ? (tx.formattedPrice || fmtPrice(tx.price))
                          : fmtLarge(tx.price * circulatingSupply)
                        }
                      </td>
                      <td className="cell-amount">{showAmountMode ? formatAmount(tx.amount) : formatPercentage(tx.value, marketCap)}</td>
                      <td className="cell-eth">{formatNativeToken(tx.value / nativePrice, nativeTokenSymbol)}</td>
                      <td className="cell-usd">
                        {(() => {
                          const usdValue = tx.value || 0;
                          // Calculate impact percentage (relative to market cap)
                          // Scale: 0.001% = tiny, 0.01% = small, 0.1% = medium, 1%+ = huge
                          const impactPct = marketCap > 0 ? (usdValue / marketCap) * 100 : 0;
                          // Normalize to 0-100 scale for visual (log scale for better visibility)
                          // 0.0001% = 0, 0.001% = 25, 0.01% = 50, 0.1% = 75, 1%+ = 100
                          const logImpact = impactPct > 0 ? Math.log10(impactPct * 10000) : 0;
                          const barWidth = Math.min(100, Math.max(0, logImpact * 25));
                          const isBuy = tx.type?.toLowerCase() === 'buy';
                          
                          return (
                            <div className="usd-impact-container">
                              <div 
                                className={`impact-bar ${isBuy ? 'buy' : 'sell'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                              <span className="usd-value">{tx.formattedValue || fmtLarge(tx.value)}</span>
                            </div>
                          );
                        })()}
                      </td>
                    <td className="cell-maker">
                        {(() => {
                          const txCount = trades.filter(t => t.maker === tx.maker).length
                          const makerType = getMakerType(tx.maker, tx.type?.toLowerCase())
                          return (
                            <>
                              {makerType && (
                                <span 
                                  className="maker-type-badge" 
                                  style={{ backgroundColor: `${makerType.color}20`, color: makerType.color, borderColor: `${makerType.color}40` }}
                                >
                                  {makerType.label}
                                  <span className="maker-tooltip">
                                    <span className="tooltip-title" style={{ color: makerType.color }}>{makerType.name}</span>
                                    <span className="tooltip-desc">{makerType.desc}</span>
                      </span>
                                </span>
                              )}
                              <span className={`maker-tx-count ${txCount > 10 ? 'high' : ''}`}>
                                {txCount}
                              </span>
                              <span className="maker-address" title={tx.maker}>
                                {truncateAddress(tx.maker)}
                      </span>
                              <button
                                className="maker-action-btn copy-btn always-visible"
                                title={t('common.copyAddress')}
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.maker)
                                  triggerCopyToast()
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              </button>
                              <a 
                                href={getExplorerUrl(tx.maker, token?.networkId || 1, 'address')} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="maker-action-btn chart-btn"
                                title={t('dataTabs.viewOnExplorer')}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="11" cy="11" r="6"/>
                                  <path d="M21 21l-4.35-4.35"/>
                                </svg>
                              </a>
                              <button 
                                className={`maker-action-btn filter-btn-icon ${makerFilter === tx.maker ? 'active' : ''}`}
                                title={makerFilter === tx.maker ? t('dataTabs.clearFilter') : t('dataTabs.filterByThisMaker')}
                                onClick={() => makerFilter === tx.maker ? clearMakerFilter() : filterByMaker(tx.maker)}
                              >
                                <svg viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z"/>
                                </svg>
                              </button>
                            </>
                          )
                        })()}
                    </td>
                  </tr>
                    )
                  })}
              </tbody>
            </table>
              {hasMore && (
                <div className="load-more-container">
                  <button 
                    className="load-more-btn"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="spinner-small"></span>
                        {t('common.loading')}
                      </>
                    ) : (
                      <>{t('dataTabs.loadMore')}</>
                    )}
                  </button>
                  <span className="loaded-count">{t('dataTabs.transactionsLoaded', { count: trades.length })}</span>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className="holders-section pro">
            {/* Analytics Dashboard - Clean Professional Style */}
            <div className="holders-analytics pro">
              <div className="analytics-grid">
                <div className="stat-card">
                  <span className="stat-label">{t('dataTabs.top10Concentration')}</span>
                  <span className="stat-value">{holderAnalytics.top10Total.toFixed(1)}%</span>
                  <span className={`stat-badge ${holderAnalytics.concentrationRisk.toLowerCase()}`}>
                    {t(`dataTabs.${holderAnalytics.concentrationRisk.toLowerCase()}`)}
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">{t('dataTabs.exchangeHoldings')}</span>
                  <span className="stat-value">{holderAnalytics.cexHolding.toFixed(1)}%</span>
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: `${holderAnalytics.cexHolding}%` }} />
                  </div>
                </div>
                
                <div className="stat-card">
                  <span className="stat-label">{t('dataTabs.largeHolders')}</span>
                  <span className="stat-value">{holderAnalytics.whales}</span>
                  <span className="stat-sublabel">{t('dataTabs.aboveOnePercent')}</span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">{t('dataTabs.movement24h')}</span>
                  <div className="stat-movement">
                    <span className="movement-up">+{holderAnalytics.accumulating}</span>
                    <span className="movement-divider">/</span>
                    <span className="movement-down">-{holderAnalytics.distributing}</span>
                  </div>
                </div>
              </div>
              
              {/* Distribution Visualization - All Holders by Type */}
              <div className="distribution-section">
                <div className="distribution-header">
                  <span className="distribution-title">{t('dataTabs.tokenDistribution')}</span>
                  <span className="distribution-subtitle">{t('dataTabs.totalTracked', { pct: (100 - (holderAnalytics.typeDistribution.Other || 0)).toFixed(1) })}</span>
                </div>
                <div className="distribution-bar-pro">
                  {Object.entries(holderTypeConfig).map(([type, config]) => {
                    const pct = holderAnalytics.typeDistribution[type] || 0
                    if (pct <= 0) return null
                    const isHighlighted = holderTypeFilter === type
                    const isDimmed = holderTypeFilter !== 'all' && holderTypeFilter !== type
                    return (
                      <div 
                        key={type}
                        className={`dist-segment has-tooltip ${isHighlighted ? 'highlighted' : ''} ${isDimmed ? 'dimmed' : ''}`}
                        style={{ 
                          width: `${pct}%`,
                          background: config.color
                        }}
                        title={`${config.label}: ${pct.toFixed(2)}%`}
                        data-tooltip={`${config.label}: ${pct.toFixed(2)}%`}
                        onClick={() => setHolderTypeFilter(type)}
                      />
                    )
                  })}
                  {holderAnalytics.typeDistribution.Other > 0 && (
                    <div 
                      className={`dist-segment others has-tooltip ${holderTypeFilter === 'Other' ? 'highlighted' : ''} ${holderTypeFilter !== 'all' && holderTypeFilter !== 'Other' ? 'dimmed' : ''}`}
                      style={{ width: `${holderAnalytics.typeDistribution.Other}%` }}
                      title={`Other: ${holderAnalytics.typeDistribution.Other.toFixed(2)}%`}
                      data-tooltip={`Other: ${holderAnalytics.typeDistribution.Other.toFixed(2)}%`}
                      onClick={() => setHolderTypeFilter('Other')}
                    />
                  )}
                </div>
                <div className="distribution-legend-pro">
                  {Object.entries(holderTypeConfig).map(([type, config]) => {
                    const pct = holderAnalytics.typeDistribution[type] || 0
                    const isActive = holderTypeFilter === type
                    return (
                      <div 
                        key={type} 
                        className={`legend-item-pro ${isActive ? 'active' : ''}`}
                        onClick={() => setHolderTypeFilter(isActive ? 'all' : type)}
                      >
                        <span className="legend-dot" style={{ background: config.color }} />
                        <span>{config.label}</span>
                        <span className="legend-pct">{pct.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                  {holderAnalytics.typeDistribution.Other > 0 && (
                    <div 
                      className={`legend-item-pro ${holderTypeFilter === 'Other' ? 'active' : ''}`}
                      onClick={() => setHolderTypeFilter(holderTypeFilter === 'Other' ? 'all' : 'Other')}
                    >
                      <span className="legend-dot" style={{ background: '#374151' }} />
                      <span>{t('dataTabs.holderOther')}</span>
                      <span className="legend-pct">{holderAnalytics.typeDistribution.Other.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Filters - Clean Segmented Control */}
            <div className="holders-controls">
              <div className="segmented-control">
                <button className={`segment ${holderTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('all')}>
                  {t('common.all')}
                </button>
                <button className={`segment ${holderTypeFilter === 'CEX' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('CEX')}>
                  CEX
                </button>
                <button className={`segment ${holderTypeFilter === 'DEX' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('DEX')}>
                  DEX
                </button>
                <button className={`segment ${holderTypeFilter === 'Whale' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('Whale')}>
                  {t('dataTabs.holderWhale')}
                </button>
                <button className={`segment ${holderTypeFilter === 'Holder' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('Holder')}>
                  {t('dataTabs.holderHolder')}
                </button>
                <button className={`segment ${holderTypeFilter === 'Team' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('Team')}>
                  {t('dataTabs.holderTeam')}
                </button>
                <button className={`segment ${holderTypeFilter === 'VC' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('VC')}>
                  VC
                </button>
                <button className={`segment ${holderTypeFilter === 'Other' ? 'active' : ''}`} onClick={() => setHolderTypeFilter('Other')}>
                  {t('dataTabs.holderOther')}
                </button>
              </div>
              <div className="sort-control">
                <label>{t('dataTabs.sort')}</label>
                <select value={holderSortBy} onChange={(e) => setHolderSortBy(e.target.value)} className="sort-select">
                  <option value="rank">{t('dataTabs.rankSort')}</option>
                  <option value="change">{t('dataTabs.change24hSort')}</option>
                </select>
              </div>
            </div>
            
            {/* Holders Table */}
            <div className="table-wrapper holders-table-wrapper">
              <table className="data-table holders-table">
              <thead>
                <tr>
                    <th className="th-rank">#</th>
                    <th className="th-address">{t('dataTabs.holder')}</th>
                    <th className="th-balance">{t('dataTabs.supplyColumn')}</th>
                    <th className="th-value">{t('dataTabs.value')}</th>
                    <th className="th-share">{t('dataTabs.share')}</th>
                    <th className="th-change">{t('common.change24h')}</th>
                    <th className="th-activity">{t('dataTabs.lastActive')}</th>
                    <th className="th-actions">{t('dataTabs.actions')}</th>
                </tr>
              </thead>
              <tbody>
                  {displayHolders.map((h) => {
                    const tierClass = getTierClass(h.percentage)
                    const typeConfig = holderTypeConfig[h.type] || holderTypeConfig.Holder
                    return (
                      <tr key={h.address} className={`holder-row pro ${tierClass}`}>
                        <td className="cell-rank">
                          <span className="rank-number">{h.rank}</span>
                    </td>
                        <td className="cell-holder">
                          <div className="holder-info-pro">
                            <div className="holder-identity">
                              {h.label ? (
                                <span className="holder-name">{h.label}</span>
                              ) : (
                                <span className="holder-address">{h.address.slice(0, 6)}...{h.address.slice(-4)}</span>
                              )}
                              <span className="holder-tag" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>{typeConfig.label}</span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-balance">
                          <span className="balance-value">{formatHolderBalance(h.balance)}</span>
                        </td>
                        <td className="cell-value">
                          <span className="value-amount">
                            {(() => {
                              // Calculate USD value: balance * token price
                              const tokenPrice = circulatingSupply > 0 ? marketCap / circulatingSupply : 0
                              const usdValue = h.balance * tokenPrice
                              return usdValue > 0 ? fmtLarge(usdValue) : '-'
                            })()}
                      </span>
                    </td>
                        <td className="cell-share">
                          <div className="share-cell">
                            <div className="share-bar-bg">
                              <div className="share-bar-fill" style={{ width: `${Math.min(100, h.percentage * 4)}%` }} />
                            </div>
                            <span className="share-pct">{h.percentage.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td className="cell-change">
                          {h.change24h !== 0 ? (
                            <span className={`change-val ${h.change24h > 0 ? 'up' : 'down'}`}>
                              {h.change24h > 0 ? '+' : ''}{h.change24h.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="change-val neutral">—</span>
                          )}
                        </td>
                        <td className="cell-activity">
                          <span className="activity-time-pro">{h.lastActive}</span>
                        </td>
                        <td className="cell-actions">
                          <div className="action-btns">
                            <button className="action-btn copy-btn" onClick={() => copyHolderAddress(h.address)} title={t('dataTabs.copyAddress')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="9" y="9" width="13" height="13" rx="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                            <a href={getExplorerUrl(h.address, token?.networkId, 'address')} target="_blank" rel="noopener noreferrer" className="action-btn explorer-btn" title={t('dataTabs.viewOnExplorer')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </a>
                            <button className="action-btn track-btn" onClick={() => console.log('Track wallet:', h.address)} title={t('dataTabs.trackWallet')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                          </div>
                    </td>
                  </tr>
                    )
                  })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'onchain' && (
          <div className="bubblemap-container">
            {(() => {
              // Map networkId to Bubblemaps chain identifier
              const getBubblemapChain = (networkId) => {
                const chainMap = {
                  1: 'eth',           // Ethereum
                  56: 'bsc',          // BNB Chain
                  137: 'polygon',     // Polygon
                  43114: 'avax',      // Avalanche
                  250: 'ftm',         // Fantom
                  42161: 'arb',       // Arbitrum
                  10: 'op',           // Optimism
                  8453: 'base',       // Base
                  1399811149: 'sol',  // Solana
                };
                return chainMap[networkId] || null;
              };
              
              const chain = getBubblemapChain(token?.networkId);
              const tokenAddress = token?.address;
              const partnerId = 'F8kAsMCCp6tOfXKWyBNG';
              
              if (!chain || !tokenAddress) {
                return (
                  <div className="bubblemap-unsupported">
                    <p>{t('dataTabs.bubblemapUnavailable')}</p>
                    <span>{!chain ? t('dataTabs.chainNotSupported') : t('dataTabs.noTokenSelected')}</span>
            </div>
                );
              }
              
              // Use the official iframe.bubblemaps.io endpoint
              const iframeUrl = `https://iframe.bubblemaps.io/map?chain=${chain}&address=${tokenAddress}&partnerId=${partnerId}`;
              
              if (!iframeReady) {
                return (
                  <div className="bubblemap-loading">
                    <div className="loading-spinner"></div>
                    <span>{t('dataTabs.loadingBubblemap')}</span>
                  </div>
                );
              }
              
              return (
                <div className="bubblemap-iframe-wrapper">
                  <iframe
                    src={iframeUrl}
                    title="Bubblemaps On-Chain Analysis"
                    className="bubblemap-iframe"
                    allow="clipboard-write"
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="lazy"
                  />
                  <div className="bubblemap-fallback">
                    <span>{t('dataTabs.mapDoesntLoad')} </span>
                    <a
                      href={`https://app.bubblemaps.io/${chain}/token/${tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('dataTabs.viewOnBubblemaps')} →
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'xbubble' && (
          <div className="placeholder-content">
            <p>{tabs.find(tb => tb.id === activeTab)?.label}</p>
            <span>{t('dataTabs.comingSoon')}</span>
          </div>
        )}
      </div>
      
    </div>
  )
}

export default DataTabs
