/**
 * WatchlistsPage Component
 * Full-page table with watchlist data. Token column uses same style as landing (avatar ring, hover gradient).
 * Supports both crypto and stock market modes.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getNetworkName } from '../services/codexApi'
import { useCurrency } from '../hooks/useCurrency'
import { useTokenSearch } from '../hooks/useCodexData'
import { useStockSearch, useStockPrices } from '../hooks/useStockData'
import { getStockLogo } from '../constants/stockData'
import useWatchlistPrices from '../hooks/useWatchlistPrices'
import { getTokenRowStyle, getTokenAvatarRingStyle } from '../constants/tokenColors'
import MobileBottomSheet, { BottomSheetAction } from './MobileBottomSheet'
import SwipeableRow from './SwipeableRow'

const NETWORK_NAMES = {
  1: 'ETH',
  56: 'BSC',
  137: 'MATIC',
  42161: 'ARB',
  8453: 'BASE',
  43114: 'AVAX',
  10: 'OP',
  250: 'FTM',
  1399811149: 'SOL',
}
const getChainName = (networkId) => NETWORK_NAMES[networkId] ?? getNetworkName(networkId) ?? '—'

// Chain logos for display
const CHAIN_LOGOS = {
  1: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  56: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  137: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  42161: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  8453: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', // Base uses ETH
  43114: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  10: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  250: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  1399811149: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}
const getChainLogo = (networkId) => CHAIN_LOGOS[networkId] || CHAIN_LOGOS[1]

// Get pair quote token based on chain
const getPairQuote = (networkId, symbol) => {
  // For major tokens without real DEX pair, show USDT
  const upperSymbol = (symbol || '').toUpperCase()
  if (isMajorToken(upperSymbol)) {
    return '/USDT'
  }
  switch (networkId) {
    case 1399811149: return '/SOL'  // Solana
    case 56: return '/BNB'          // BSC
    case 137: return '/MATIC'       // Polygon
    case 43114: return '/AVAX'      // Avalanche
    case 250: return '/FTM'         // Fantom
    default: return '/WETH'         // ETH, ARB, BASE, OP
  }
}

// Get correct chain for token (majors use their native chain)
const getTokenChainInfo = (networkId, symbol) => {
  const upperSymbol = (symbol || '').toUpperCase()
  // Major tokens - use their native chain logo
  if (upperSymbol === 'BTC' || upperSymbol === 'WBTC') {
    return { logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', name: 'BTC' }
  }
  if (upperSymbol === 'ETH' || upperSymbol === 'WETH') {
    return { logo: CHAIN_LOGOS[1], name: 'ETH' }
  }
  if (upperSymbol === 'SOL') {
    return { logo: CHAIN_LOGOS[1399811149], name: 'SOL' }
  }
  // On-chain tokens - use actual network
  return { logo: getChainLogo(networkId), name: getChainName(networkId) }
}

const MAJOR_SYMBOLS = new Set(['BTC', 'ETH', 'SOL'])
const isMajorToken = (symbol) => MAJOR_SYMBOLS.has((symbol || '').toUpperCase())

import './WatchlistShared.css'
import './WatchlistsPage.css'

// Token logos - shared with WelcomePage for consistency
const TOKEN_LOGOS = {
  'BTC': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  'ETH': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  'SOL': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  'PEPE': 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  'WIF': 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
  'BONK': 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  'SHIB': 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  'DOGE': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  'ARB': 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  'OP': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'MATIC': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  'AVAX': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  'LINK': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  'UNI': 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  'AAVE': 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  'CRV': 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  'MKR': 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  'LDO': 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  'FET': 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg',
  'RENDER': 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  'RNDR': 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  'TAO': 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
  'OCEAN': 'https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.jpg',
  'GRT': 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
  'FIL': 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
  'INJ': 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  'SUI': 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  'APT': 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  'SEI': 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  'TIA': 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
  'ONDO': 'https://assets.coingecko.com/coins/images/26580/small/ONDO.png',
  'JUP': 'https://assets.coingecko.com/coins/images/34188/small/jup.png',
  'PYTH': 'https://assets.coingecko.com/coins/images/31924/small/pyth.png',
  'JTO': 'https://assets.coingecko.com/coins/images/33228/small/jto.png',
  'FLOKI': 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png',
  'USDT': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  'USDC': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  'BNB': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  'SPECTRE': '/round-logo.png',
  'M87': 'https://assets.coingecko.com/coins/images/35071/small/m87.png',
  'NPC': 'https://assets.coingecko.com/coins/images/31229/small/npc.png',
  'NEURAL': 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
  'PALM': 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
  'GRAY': 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
}

// Helper to get logo for a token symbol
const getTokenLogo = (symbol, tokenLogo) => {
  if (tokenLogo && !tokenLogo.includes('placeholder')) return tokenLogo
  const upperSymbol = (symbol || '').toUpperCase()
  return TOKEN_LOGOS[upperSymbol] || null
}

const WatchlistsPage = ({
  dayMode = false,
  watchlist = [],
  watchlistName = 'My Watchlist',
  watchlists = [],
  activeWatchlistId,
  onRenameWatchlist,
  onAddWatchlist,
  onRemoveWatchlist,
  onSwitchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  togglePinWatchlist,
  reorderWatchlist,
  onTokenClick, // (token, viewMode) => void - navigates to Research Zone (major) or On-chain chart (onchain)
  marketMode = 'crypto', // 'crypto' | 'stocks'
}) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const isStocks = marketMode === 'stocks'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState('rank')
  const [sortDirection, setSortDirection] = useState('asc')
  const [draggedRowIndex, setDraggedRowIndex] = useState(null)
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(watchlistName)
  const [manageListOpen, setManageListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState(null)
  const [editingListName, setEditingListName] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importDone, setImportDone] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewMode, setViewMode] = useState('onchain') // 'major' | 'onchain'

  // Mobile state
  const [isMobile, setIsMobile] = useState(false)
  const [selectedToken, setSelectedToken] = useState(null)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)

  const searchContainerRef = useRef(null)
  const searchInputRef = useRef(null)
  const nameInputRef = useRef(null)

  // Search - use stock search or crypto search based on mode
  const { results: cryptoSearchResults, loading: cryptoSearchLoading } = useTokenSearch(
    !isStocks ? searchQuery.trim() : '',
    300
  )
  const { results: stockSearchResults, loading: stockSearchLoading } = useStockSearch(
    isStocks ? searchQuery.trim() : '',
    300
  )
  const searchResults = isStocks ? stockSearchResults : cryptoSearchResults
  const searchLoading = isStocks ? stockSearchLoading : cryptoSearchLoading

  // Get stock watchlist symbols for price fetching
  const stockWatchlistSymbols = useMemo(() => {
    if (!isStocks) return []
    return watchlist.filter(t => t.isStock).map(t => t.symbol)
  }, [isStocks, watchlist])

  // Fetch stock prices for watchlist items
  const { prices: stockWatchlistPrices } = useStockPrices(stockWatchlistSymbols, 15000)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle token long-press/tap on mobile
  const handleTokenOptions = useCallback((token) => {
    setSelectedToken(token)
    setBottomSheetOpen(true)
  }, [])

  // Handle swipe actions
  const handleSwipeDelete = useCallback((token) => {
    removeFromWatchlist?.(token.address || token.symbol)
  }, [removeFromWatchlist])

  const handleSwipePin = useCallback((token) => {
    togglePinWatchlist?.(token.address || token.symbol)
  }, [togglePinWatchlist])

  // Get live watchlist data (same as landing page) - only for crypto
  const { watchlistWithLiveData, loading: pricesLoading, lastUpdated, refresh: refreshPrices } = useWatchlistPrices(
    isStocks ? [] : watchlist
  )

  // Table row data: map watchlist to full columns (placeholders for missing API fields)
  const tableTokens = useMemo(() => {
    // Stock mode: use watchlist with stock prices
    if (isStocks) {
      const stockItems = watchlist.filter(t => t.isStock)
      if (stockItems.length === 0) return []
      return stockItems.map((token, index) => {
        const livePrice = stockWatchlistPrices?.[token.symbol]
        const price = livePrice?.price ?? token.price ?? 0
        const change24h = livePrice?.change ?? token.change ?? 0
        const volume = livePrice?.volume ?? token.volume ?? 0
        const mcap = livePrice?.marketCap ?? token.marketCap ?? 0
        return {
          id: token.symbol || `stock-${index}`,
          rank: index + 1,
          symbol: token.symbol || 'UNKNOWN',
          name: token.name || token.symbol || 'Unknown Stock',
          logo: getStockLogo(token.symbol, token.sector),
          price,
          volume,
          change24h,
          mcap,
          sector: token.sector || livePrice?.sector || '',
          exchange: token.exchange || livePrice?.exchange || 'NYSE',
          pe: livePrice?.pe || token.pe || null,
          pinned: token.pinned || false,
          isStock: true,
        }
      })
    }

    // Crypto mode: use existing logic
    if (!watchlistWithLiveData || watchlistWithLiveData.length === 0) return []
    return watchlistWithLiveData.map((token, index) => {
      const price = token.price || 0
      const change24h = token.change || 0
      const volume = token.volume24 || token.volume || 0
      const mcap = token.marketCap || 0
      return {
        id: token.address || token.symbol || `token-${index}`,
        rank: index + 1,
        symbol: token.symbol || 'UNKNOWN',
        name: token.name || token.symbol || 'Unknown Token',
        logo: getTokenLogo(token.symbol, token.logo),
        price,
        age: token.age || '—',
        txns: token.txns ?? 0,
        volume,
        makers: token.makers ?? 0,
        holders: token.holders ?? 0,
        change5m: token.change5m ?? 0,
        change1h: token.change1h ?? (change24h * 0.04),
        change6h: token.change6h ?? (change24h * 0.25),
        change24h: change24h,
        change1w: token.change7d ?? 0,
        change1m: token.change30d ?? 0,
        change1y: token.change1y ?? 0,
        liquidity: token.liquidity ?? 0,
        mcap,
        address: token.address,
        networkId: token.networkId ?? 1,
        chain: getChainName(token.networkId ?? 1),
        pinned: token.pinned || false,
        isStock: false,
      }
    })
  }, [isStocks, watchlist, watchlistWithLiveData, stockWatchlistPrices])

  const formatChange = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '—'
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (isNaN(num)) return '—'
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
  }
  const formatAge = (age, symbol) => {
    const empty = age == null || age === '' || age === '—'
    if (isMajorToken(symbol) && empty) return '∞'
    return empty ? '—' : String(age)
  }
  const formatOptionalNumber = (value, symbol) => {
    const num = value != null ? Number(value) : 0
    const empty = num === 0 || isNaN(num)
    if (isMajorToken(symbol) && empty) return '∞'
    return num.toLocaleString()
  }
  const formatOptionalLarge = (value, symbol) => {
    const num = value != null ? Number(value) : 0
    const empty = !num || isNaN(num)
    if (isMajorToken(symbol) && empty) return '∞'
    return fmtLarge(value)
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sortedTokens = useMemo(() => {
    const list = [...tableTokens]
    if (list.length === 0) return []
    const pinned = list.filter((t) => t.pinned)
    const unpinned = list.filter((t) => !t.pinned)
    const parseAge = (age) => {
      if (age === '—' || age == null) return 0
      const s = String(age)
      if (s.includes('y')) return parseInt(s, 10) * 12
      if (s.includes('mo')) return parseInt(s, 10)
      return parseInt(s, 10) || 0
    }
    // When sort by rank (#), preserve manual/drag order; otherwise sort unpinned by column
    if (sortColumn !== 'rank') {
      unpinned.sort((a, b) => {
        let aVal = a[sortColumn]
        let bVal = b[sortColumn]
        if (sortColumn === 'age') {
          aVal = parseAge(a.age)
          bVal = parseAge(b.age)
        }
        if (sortColumn === 'chain') {
          aVal = (a.chain || '').toLowerCase()
          bVal = (b.chain || '').toLowerCase()
          return sortDirection === 'asc'
            ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
            : (bVal < aVal ? -1 : bVal > aVal ? 1 : 0)
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }
        return 0
      })
    }
    const combined = [...pinned, ...unpinned]
    return combined.map((t, i) => ({ ...t, rank: i + 1 }))
  }, [tableTokens, sortColumn, sortDirection])

  const handleDragStart = (e, index) => {
    setDraggedRowIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    if (e.target) e.target.closest('tr')?.classList.add('watchlists-row-dragging')
  }
  const handleDragEnter = (e, index) => {
    e.preventDefault()
    if (draggedRowIndex !== null && index !== draggedRowIndex) setDragOverRowIndex(index)
  }
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDragEnd = (e) => {
    e.target?.closest('tr')?.classList.remove('watchlists-row-dragging')
    setDraggedRowIndex(null)
    setDragOverRowIndex(null)
  }
  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedRowIndex === null || draggedRowIndex === dropIndex || !reorderWatchlist) return
    const reordered = [...sortedTokens]
    const [removed] = reordered.splice(draggedRowIndex, 1)
    reordered.splice(dropIndex, 0, removed)
    let newWatchlistOrder = reordered.map((t) =>
      watchlistWithLiveData.find((w) => (w.address && w.address === t.address) || (w.symbol && (w.symbol || '').toUpperCase() === (t.symbol || '').toUpperCase()))
    ).filter(Boolean)
    // Pin always wins: enforce pinned first so drag can't override pin
    const pinnedFirst = [...newWatchlistOrder.filter((t) => t.pinned), ...newWatchlistOrder.filter((t) => !t.pinned)]
    if (pinnedFirst.length === reordered.length) reorderWatchlist(pinnedFirst)
    setDraggedRowIndex(null)
    setDragOverRowIndex(null)
  }

  // Pull real-time prices when Watchlists page mounts (and when watchlist changes)
  useEffect(() => {
    if (watchlist && watchlist.length > 0) {
      refreshPrices()
    }
  }, [watchlist?.length, refreshPrices])

  useEffect(() => {
    setNameInput(watchlistName)
  }, [watchlistName])

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus()
  }, [editingName])

  const handleNameBlur = () => {
    setEditingName(false)
    const trimmed = (nameInput || '').trim()
    if (trimmed && trimmed !== watchlistName && onRenameWatchlist) onRenameWatchlist(activeWatchlistId, trimmed)
    else setNameInput(watchlistName)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur()
    }
  }

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setSearchQuery('')
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const formatUpdatedAt = (ts) => {
    if (!ts || typeof ts !== 'number') return '—'
    const diff = Date.now() - ts
    if (diff < 60 * 1000) return 'updated just now'
    if (diff < 60 * 60 * 1000) return `updated ${Math.floor(diff / 60000)} min ago`
    if (diff < 24 * 60 * 60 * 1000) return `updated ${Math.floor(diff / 3600000)} hours ago`
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `updated ${days} day${days !== 1 ? 's' : ''} ago`
  }

  const handleCreateList = () => {
    const name = newListName.trim()
    onAddWatchlist?.(name || undefined)
    setNewListName('')
    setManageListOpen(false)
  }

  const handleStartRename = (w) => {
    setEditingListId(w.id)
    setEditingListName(w.name || '')
  }

  const handleSaveRename = () => {
    if (editingListId != null) {
      onRenameWatchlist?.(editingListId, editingListName.trim() || 'Unnamed')
      setEditingListId(null)
      setEditingListName('')
    }
  }

  const extractDexScreenerWatchlistId = (urlOrId) => {
    const s = (urlOrId || '').trim()
    const m = s.match(/dexscreener\.com\/watchlist\/([a-zA-Z0-9_-]+)/i)
    if (m) return m[1]
    if (/^[a-zA-Z0-9_-]+$/.test(s)) return s
    return null
  }

  // Check if URL is a DexScreener pair URL (e.g., dexscreener.com/solana/abc123)
  const extractDexScreenerPair = (url) => {
    const s = (url || '').trim()
    const m = s.match(/dexscreener\.com\/([a-z]+)\/([a-zA-Z0-9]+)/i)
    if (m && m[1] !== 'watchlist') {
      return { chain: m[1], address: m[2] }
    }
    return null
  }

  const handleImportFromDexScreener = async () => {
    const url = (importUrl || '').trim()
    
    // Check if it's a pair URL first
    const pairInfo = extractDexScreenerPair(url)
    if (pairInfo) {
      setImportError(null)
      setImportDone(null)
      setImportLoading(true)
      try {
        const res = await fetch(`/api/dexscreener-pair/${pairInfo.chain}/${pairInfo.address}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setImportError(data.error || 'Failed to load pair')
          return
        }
        const t = data.token
        if (t && addToWatchlist) {
          addToWatchlist({
            symbol: t.symbol,
            name: t.name,
            address: t.address,
            networkId: t.networkId ?? 1,
            price: t.price,
            change: t.change,
            marketCap: t.marketCap,
            logo: t.logo,
            pinned: false,
          })
          setImportDone(`Imported ${t.symbol}.`)
          setImportUrl('')
          setTimeout(() => {
            setImportOpen(false)
            setImportDone(null)
          }, 1500)
        } else {
          setImportError('Could not extract token from pair.')
        }
      } catch (err) {
        setImportError(err.message || 'Import failed.')
      } finally {
        setImportLoading(false)
      }
      return
    }

    // Otherwise try watchlist import
    const id = extractDexScreenerWatchlistId(url)
    if (!id) {
      setImportError('Paste a DexScreener watchlist or pair link.')
      return
    }
    setImportError(null)
    setImportDone(null)
    setImportLoading(true)
    try {
      const res = await fetch(`/api/dexscreener-watchlist/${encodeURIComponent(id)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setImportError(data.error || data.hint || res.statusText || 'Failed to load watchlist')
        return
      }
      const tokens = data.tokens || []
      if (tokens.length === 0) {
        setImportError('No tokens found in this watchlist.')
        return
      }
      let added = 0
      tokens.forEach((t) => {
        if (addToWatchlist) {
          addToWatchlist({
            symbol: t.symbol,
            name: t.name,
            address: t.address,
            networkId: t.networkId ?? 1,
            price: t.price,
            change: t.change,
            marketCap: t.marketCap,
            logo: t.logo,
            pinned: false,
          })
          added += 1
        }
      })
      setImportDone(`Imported ${added} project${added !== 1 ? 's' : ''}.`)
      setImportUrl('')
      setTimeout(() => {
        setImportOpen(false)
        setImportDone(null)
      }, 1500)
    } catch (err) {
      const msg = err.message || ''
      setImportError(
        msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
          ? 'Could not reach the server. Start the backend (e.g. npm run dev in /server) and try again.'
          : msg || 'Import failed. Try again.'
      )
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className={`watchlists-page${dayMode ? ' day-mode' : ''}`} data-day-mode={dayMode ? 'true' : undefined}>
      <div className="watchlists-page-header">
        <div className="watchlists-header-content">
          <div>
            <h1 className="watchlists-page-title">{t('watchlist.title')}</h1>
            <p className="watchlists-page-subtitle">{t('watchlistPage.subtitle')}</p>
            <div className="watchlists-live-status">
              {pricesLoading ? (
                <span className="status-loading">
                  <span className="loading-dot" />
                  {t('watchlistPage.updatingPrices')}
                </span>
              ) : (
                <span className="status-live">
                  <span className="live-dot" />
                  {t('watchlistPage.liveScanning')}
                </span>
              )}
              {lastUpdated && (
                <span className="last-updated">
                  {Math.round((Date.now() - lastUpdated) / 1000)}s {t('time.ago')}
                </span>
              )}
              <button 
                type="button" 
                className="refresh-btn"
                onClick={refreshPrices}
                disabled={pricesLoading}
                title={t('watchlistPage.refreshPrices')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={pricesLoading ? 'spinning' : ''}>
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              </button>
            </div>
          </div>
          {addToWatchlist && (
            <div className="watchlists-search-container" ref={searchContainerRef}>
              <div className="watchlists-search-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="watchlists-search-input"
                  placeholder={isStocks ? t('watchlistPage.searchStockToAdd') : t('watchlistPage.searchTokenToAdd')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="watchlists-add-btn"
                  title={isStocks ? t('watchlistPage.addStock') : t('watchlist.addToken')}
                  aria-label={isStocks ? t('watchlistPage.addStock') : t('watchlist.addToken')}
                  onClick={() => {
                    if (searchQuery.trim().length >= 1 && searchResults.length > 0) {
                      const firstResult = searchResults[0]
                      if (isStocks) {
                        addToWatchlist({
                          symbol: firstResult.symbol,
                          name: firstResult.name || firstResult.symbol,
                          price: firstResult.price || 0,
                          change: firstResult.change || 0,
                          marketCap: firstResult.marketCap || 0,
                          volume: firstResult.volume || 0,
                          logo: getStockLogo(firstResult.symbol, firstResult.sector),
                          sector: firstResult.sector || '',
                          exchange: firstResult.exchange || 'NYSE',
                          pinned: false,
                          isStock: true,
                        })
                      } else {
                        addToWatchlist({
                          symbol: firstResult.symbol,
                          name: firstResult.name,
                          address: firstResult.address,
                          networkId: firstResult.networkId || 1,
                          price: firstResult.price,
                          change: firstResult.change,
                          marketCap: firstResult.marketCap,
                          logo: firstResult.logo,
                          pinned: false,
                          isStock: false,
                        })
                      }
                      setSearchQuery('')
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
              {searchQuery.trim().length >= 1 && (
                <div className="watchlists-search-dropdown">
                  {searchLoading ? (
                    <div className="watchlists-search-loading">{t('common.searching')}</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.slice(0, 8).map((result, idx) => (
                      <button
                        key={isStocks ? `${result.symbol}-${idx}` : `${result.address}-${result.networkId}`}
                        type="button"
                        className="watchlists-search-result"
                        onClick={() => {
                          if (isStocks) {
                            addToWatchlist({
                              symbol: result.symbol,
                              name: result.name || result.symbol,
                              price: result.price || 0,
                              change: result.change || 0,
                              marketCap: result.marketCap || 0,
                              volume: result.volume || 0,
                              logo: getStockLogo(result.symbol, result.sector),
                              sector: result.sector || '',
                              exchange: result.exchange || 'NYSE',
                              pinned: false,
                              isStock: true,
                            })
                          } else {
                            addToWatchlist({
                              symbol: result.symbol,
                              name: result.name,
                              address: result.address,
                              networkId: result.networkId || 1,
                              price: result.price,
                              change: result.change,
                              marketCap: result.marketCap,
                              logo: result.logo,
                              pinned: false,
                              isStock: false,
                            })
                          }
                          setSearchQuery('')
                        }}
                      >
                        <div className="search-result-left">
                          {(isStocks ? getStockLogo(result.symbol, result.sector) : result.logo) && (
                            <img src={isStocks ? getStockLogo(result.symbol, result.sector) : result.logo} alt="" className="watchlists-search-result-img" />
                          )}
                          <div className="search-result-info">
                            <div className="search-result-top">
                              <span className="watchlists-search-result-symbol">{result.symbol}</span>
                              {isStocks ? (
                                result.exchange && <span className="search-result-chain">{result.exchange}</span>
                              ) : (
                                result.network && <span className="search-result-chain">{result.network}</span>
                              )}
                            </div>
                            <span className="watchlists-search-result-name">{result.name}</span>
                          </div>
                        </div>
                        <div className="search-result-right">
                          <div className="search-result-price">{result.formattedPrice || fmtPrice(result.price)}</div>
                          <div className={`search-result-change ${(result.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {(result.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(result.change || 0).toFixed(2)}%
                          </div>
                        </div>
                        <div className="search-result-stats">
                          <span className="search-result-stat">MC {result.formattedMcap || fmtLarge(result.marketCap)}</span>
                          <span className="search-result-stat">{isStocks ? 'Vol' : 'Liq'} {isStocks ? fmtLarge(result.volume) : (result.formattedLiquidity || fmtLarge(result.liquidity))}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <>
                      <div className="watchlists-search-empty">{t('common.noResults')}. {t('watchlist.addToken')}:</div>
                      {[
                        { symbol: 'BTC', name: 'Bitcoin' },
                        { symbol: 'ETH', name: 'Ethereum' },
                        { symbol: 'SOL', name: 'Solana' },
                        { symbol: 'PEPE', name: 'Pepe' },
                        { symbol: 'WIF', name: 'dogwifhat' },
                        { symbol: 'DOGE', name: 'Dogecoin' },
                      ].filter((t) => !watchlist?.some((w) => (w.symbol || '').toUpperCase() === t.symbol)).map((t) => (
                        <button
                          key={t.symbol}
                          type="button"
                          className="watchlists-search-result"
                          onClick={() => {
                            addToWatchlist({ symbol: t.symbol, name: t.name, pinned: false })
                            setSearchQuery('')
                          }}
                        >
                          <span className="watchlists-search-result-symbol">{t.symbol}</span>
                          <span className="watchlists-search-result-name">{t.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name watchlist + add/remove watchlists */}
      <div className="watchlists-name-bar">
        <div className="watchlists-name-row">
          <div className="watchlists-name-cell">
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                className="watchlists-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                placeholder={t('watchlist.myWatchlist')}
              />
            ) : (
              <button
                type="button"
                className="watchlists-name-label"
                onClick={() => setEditingName(true)}
                title={t('watchlist.rename')}
              >
                <span className="watchlists-name-text">{watchlistName || 'My Watchlist'}</span>
                <svg className="watchlists-name-edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
          <div className="watchlists-name-actions">
            <button
              type="button"
              className="watchlists-manage-btn"
              onClick={() => { setManageListOpen(true); setNewListName(''); setEditingListId(null); }}
              title={t('watchlistPage.manageList')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>{t('watchlistPage.manageList')}</span>
            </button>
            <button
              type="button"
              className="watchlists-import-btn"
              onClick={() => { setImportError(null); setImportDone(null); setImportOpen(true); }}
              title={t('watchlistPage.importFromDex')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t('watchlistPage.import')}</span>
            </button>
            <button
              type="button"
              className="watchlists-add-list-btn"
              onClick={onAddWatchlist}
              title={t('watchlistPage.addWatchlist')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{t('watchlistPage.addWatchlist')}</span>
            </button>
            <button
              type="button"
              className="watchlists-remove-list-btn"
              onClick={() => watchlists.length > 1 && setDeleteConfirm({ id: activeWatchlistId, name: watchlistName || 'Unnamed' })}
              disabled={watchlists.length <= 1}
              title={watchlists.length <= 1 ? t('watchlistPage.keepAtLeastOne') : t('watchlistPage.removeWatchlist')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>{t('watchlistPage.removeWatchlist')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manage List Modal */}
      {manageListOpen && (
        <div
          className="manage-list-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setManageListOpen(false); setEditingListId(null); } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-list-title"
        >
          <div className="manage-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manage-list-header">
              <h2 id="manage-list-title" className="manage-list-title">{t('watchlistPage.manageLists')}</h2>
              <button
                type="button"
                className="manage-list-close"
                onClick={() => { setManageListOpen(false); setEditingListId(null); setNewListName(''); }}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="manage-list-new-row">
              <input
                type="text"
                className="manage-list-new-input"
                placeholder={t('watchlistPage.newList')}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); }}
              />
              <button
                type="button"
                className="manage-list-create-btn"
                onClick={handleCreateList}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{t('watchlistPage.createList')}</span>
              </button>
            </div>
            <ul className="manage-list-list">
              {watchlists.map((w) => (
                <li key={w.id} className="manage-list-item">
                  <div
                    className="manage-list-item-main"
                    onClick={() => { if (editingListId !== w.id) { onSwitchWatchlist?.(w.id); setManageListOpen(false); } }}
                  >
                    <span className="manage-list-item-drag" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="4" height="4" rx="0.5" />
                        <rect x="10" y="3" width="4" height="4" rx="0.5" />
                        <rect x="17" y="3" width="4" height="4" rx="0.5" />
                        <rect x="3" y="10" width="4" height="4" rx="0.5" />
                        <rect x="10" y="10" width="4" height="4" rx="0.5" />
                        <rect x="17" y="10" width="4" height="4" rx="0.5" />
                        <rect x="3" y="17" width="4" height="4" rx="0.5" />
                        <rect x="10" y="17" width="4" height="4" rx="0.5" />
                        <rect x="17" y="17" width="4" height="4" rx="0.5" />
                      </svg>
                    </span>
                    <div className="manage-list-item-info">
                      {editingListId === w.id ? (
                        <input
                          type="text"
                          className="manage-list-item-rename-input"
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onBlur={handleSaveRename}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditingListId(null); }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="manage-list-item-name">{w.name || 'Unnamed'}</span>
                      )}
                      <span className="manage-list-item-meta">
                        {w.tokenCount ?? 0} pair{(w.tokenCount ?? 0) !== 1 ? 's' : ''}, {formatUpdatedAt(w.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="manage-list-item-actions">
                    <button
                      type="button"
                      className="manage-list-item-btn manage-list-rename-btn"
                      onClick={(e) => { e.stopPropagation(); editingListId === w.id ? handleSaveRename() : handleStartRename(w); }}
                      title={t('watchlist.rename')}
                      aria-label={t('watchlist.rename')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="manage-list-item-btn manage-list-delete-btn"
                      onClick={(e) => { e.stopPropagation(); if (watchlists.length > 1) setDeleteConfirm({ id: w.id, name: w.name || 'Unnamed' }); }}
                      disabled={watchlists.length <= 1}
                      title={watchlists.length <= 1 ? t('watchlistPage.keepAtLeastOne') : t('watchlist.delete')}
                      aria-label={t('watchlistPage.delete')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Delete watchlist confirmation */}
      {deleteConfirm && (
        <div
          className="manage-list-overlay delete-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="delete-confirm-title" className="delete-confirm-title">{t('watchlistPage.deleteWatchlist')}</h2>
            <p className="delete-confirm-message">
              {t('watchlistPage.deleteConfirm', { name: deleteConfirm.name })}
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="delete-confirm-delete"
                onClick={() => {
                  onRemoveWatchlist?.(deleteConfirm.id)
                  setDeleteConfirm(null)
                  setManageListOpen(false)
                }}
              >
                {t('watchlistPage.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DexScreener Import Modal */}
      {importOpen && (
        <div
          className="watchlists-import-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setImportOpen(false); setImportError(null); setImportDone(null); setImportUrl(''); } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div className="watchlists-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="watchlists-import-modal-header">
              <h2 id="import-modal-title" className="watchlists-import-modal-title">{t('watchlistPage.importFromDex')}</h2>
              <button
                type="button"
                className="watchlists-import-modal-close"
                onClick={() => { setImportOpen(false); setImportError(null); setImportDone(null); setImportUrl(''); }}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="watchlists-import-modal-hint">
              {t('watchlistPage.importHint')}
            </p>
            <input
              type="text"
              className="watchlists-import-input"
              placeholder={t('watchlistPage.pasteLink')}
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleImportFromDexScreener(); }}
              disabled={importLoading}
              aria-describedby="import-error import-done"
            />
            {importError && (
              <p id="import-error" className="watchlists-import-message watchlists-import-error" role="alert">
                {importError}
              </p>
            )}
            {importDone && (
              <p id="import-done" className="watchlists-import-message watchlists-import-done" role="status">
                {importDone}
              </p>
            )}
            <div className="watchlists-import-modal-actions">
              <button
                type="button"
                className="watchlists-import-cancel-btn"
                onClick={() => { setImportOpen(false); setImportError(null); setImportDone(null); setImportUrl(''); }}
                disabled={importLoading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="watchlists-import-submit-btn"
                onClick={handleImportFromDexScreener}
                disabled={importLoading}
              >
                {importLoading ? (
                  <>
                    <span className="watchlists-import-spinner" aria-hidden />
                    {t('watchlistPage.importing')}
                  </>
                ) : (
                  t('watchlistPage.import')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Major / On-Chain toggle */}
      <div className="watchlists-view-mode-toggle" role="tablist" aria-label="View mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'major'}
          className={`watchlists-view-mode-btn ${viewMode === 'major' ? 'active' : ''}`}
          onClick={() => setViewMode('major')}
        >
          {t('watchlistPage.major')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'onchain'}
          className={`watchlists-view-mode-btn ${viewMode === 'onchain' ? 'active' : ''}`}
          onClick={() => setViewMode('onchain')}
        >
          {t('watchlistPage.onChain')}
        </button>
      </div>

      <div className={`watchlists-table-container welcome-watchlist-widget${sortedTokens.length === 0 ? ' watchlists-table-container--empty' : ''}${dayMode ? ' watchlists-table-container-day' : ''}`}>
        {sortedTokens.length === 0 ? (
          <div className="watchlists-empty-state-wrap">
            <div className="watchlists-empty-state-inner">
              <p className="watchlists-empty-state-text">{t('watchlistPage.noTokensInWatchlist')}</p>
              <button
                type="button"
                className="watchlists-empty-state-add-btn"
                onClick={() => searchInputRef.current?.focus()}
                title={t('watchlist.addToken')}
                aria-label={t('watchlist.addToken')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>{t('watchlist.addToken')}</span>
              </button>
            </div>
          </div>
        ) : (
        <table className="watchlists-table">
          <colgroup>
            {/* Major: 14 cols, On-Chain: 15 cols – distribute evenly */}
            <col style={{ width: '3%' }} />   {/* Actions */}
            <col style={{ width: '4%' }} />   {/* # */}
            <col style={{ width: '14%' }} />  {/* TOKEN */}
            <col style={{ width: '8%' }} />   {/* PRICE */}
            {viewMode === 'onchain' && <col style={{ width: '6%' }} />}  {/* CHAIN */}
            {viewMode === 'onchain' && <col style={{ width: '5%' }} />}  {/* AGE */}
            {viewMode === 'onchain' && <col style={{ width: '6%' }} />}  {/* TXNS */}
            <col style={{ width: '8%' }} />   {/* VOLUME */}
            {viewMode === 'onchain' && <col style={{ width: '6%' }} />}  {/* MAKERS */}
            {viewMode === 'onchain' && <col style={{ width: '6%' }} />}  {/* HOLDERS */}
            <col style={{ width: '6%' }} />   {/* 5M */}
            <col style={{ width: '6%' }} />   {/* 1H */}
            <col style={{ width: '6%' }} />   {/* 6H */}
            <col style={{ width: '6%' }} />   {/* 24H */}
            {viewMode === 'major' && <col style={{ width: '6%' }} />}   {/* 1W */}
            {viewMode === 'major' && <col style={{ width: '6%' }} />}   {/* 1M */}
            {viewMode === 'major' && <col style={{ width: '6%' }} />}   {/* 1Y */}
            <col style={{ width: '9%' }} />   {/* LIQUIDITY */}
            <col style={{ width: '9%' }} />   {/* MCAP */}
          </colgroup>
          <thead>
            <tr>
              <th className="watchlists-th-actions" aria-label="Actions" />
              <th onClick={() => handleSort('rank')}>
                # {sortColumn === 'rank' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('symbol')}>
                {t('common.token').toUpperCase()} {sortColumn === 'symbol' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('price')}>
                {t('common.price').toUpperCase()} {sortColumn === 'price' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              {viewMode === 'onchain' && (
                <>
                  <th onClick={() => handleSort('chain')}>
                    {t('common.chain').toUpperCase()} {sortColumn === 'chain' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th onClick={() => handleSort('age')}>
                    {t('common.age').toUpperCase()} {sortColumn === 'age' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th onClick={() => handleSort('txns')}>
                    TXNS {sortColumn === 'txns' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                </>
              )}
              <th onClick={() => handleSort('volume')}>
                {t('common.volume').toUpperCase()} {sortColumn === 'volume' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              {viewMode === 'onchain' && (
                <>
                  <th onClick={() => handleSort('makers')}>
                    {t('common.makers').toUpperCase()} {sortColumn === 'makers' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th onClick={() => handleSort('holders')}>
                    {t('common.holders').toUpperCase()} {sortColumn === 'holders' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                </>
              )}
              <th onClick={() => handleSort('change5m')}>
                5M {sortColumn === 'change5m' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('change1h')}>
                1H {sortColumn === 'change1h' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('change6h')}>
                6H {sortColumn === 'change6h' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('change24h')}>
                24H {sortColumn === 'change24h' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              {viewMode === 'major' && (
                <>
                  <th onClick={() => handleSort('change1w')}>
                    1W {sortColumn === 'change1w' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th onClick={() => handleSort('change1m')}>
                    1M {sortColumn === 'change1m' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th onClick={() => handleSort('change1y')}>
                    1Y {sortColumn === 'change1y' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                </>
              )}
              <th onClick={() => handleSort('liquidity')}>
                {t('common.liquidity').toUpperCase()} {sortColumn === 'liquidity' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th onClick={() => handleSort('mcap')}>
                {t('common.marketCap').toUpperCase()} {sortColumn === 'mcap' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTokens.map((token, index) => (
                <tr
                  key={token.id}
                  className={`watchlists-row ${token.pinned ? 'pinned' : ''} ${draggedRowIndex === index ? 'watchlists-row-dragging' : ''} ${dragOverRowIndex === index ? 'watchlists-row-drag-over' : ''}${onTokenClick ? ' watchlists-row-clickable' : ''}`}
                  style={getTokenRowStyle(token.symbol)}
                  draggable={!!reorderWatchlist}
                  onDragStart={reorderWatchlist ? (e) => handleDragStart(e, index) : undefined}
                  onDragEnter={reorderWatchlist ? (e) => handleDragEnter(e, index) : undefined}
                  onDragOver={reorderWatchlist ? handleDragOver : undefined}
                  onDragEnd={reorderWatchlist ? handleDragEnd : undefined}
                  onDrop={reorderWatchlist ? (e) => handleDrop(e, index) : undefined}
                  onClick={onTokenClick ? () => onTokenClick(token, viewMode) : undefined}
                >
                  <td className="watchlists-td-actions">
                    <div className="watchlists-row-actions">
                      <button
                        type="button"
                        className="watchlists-action-btn watchlists-action-remove"
                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist?.(token.address || token.symbol) }}
                        title={t('watchlistPage.removeFromWatchlist')}
                        aria-label={t('common.remove')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                      <div
                        className="watchlists-action-drag"
                        title={t('watchlistPage.dragToReorder')}
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                      <button
                        type="button"
                        className={`watchlists-action-btn watchlists-action-pin ${token.pinned ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); togglePinWatchlist?.(token.address || token.symbol) }}
                        title={token.pinned ? t('watchlist.unpin') : t('watchlistPage.pinToTop')}
                        aria-label={token.pinned ? t('watchlist.unpin') : t('watchlist.pin')}
                      >
                        <svg viewBox="0 0 24 24" fill={token.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td>{token.rank}</td>
                  <td>
                    <div className="token-info">
                      <div
                        className="token-avatar-ring watchlist-avatar-ring"
                        style={getTokenAvatarRingStyle(token.symbol) || {}}
                      >
                        <div className={`token-avatar ${token.logo ? 'has-logo' : ''}`}>
                          {token.logo ? (
                            <img src={token.logo} alt={token.symbol} />
                          ) : (
                            <span>{token.symbol?.[0] || '?'}</span>
                          )}
                        </div>
                      </div>
                      <div className="token-text-info">
                        <span className="token-name">{token.name}</span>
                        <span className="token-symbol" style={dayMode ? { color: '#0f172a', fontWeight: 600 } : undefined} data-ticker>{token.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td>{fmtPrice(token.price)}</td>
                  {viewMode === 'onchain' && (
                    <>
                      <td className="chain-cell">
                        <img 
                          src={getTokenChainInfo(token.networkId, token.symbol).logo} 
                          alt={getTokenChainInfo(token.networkId, token.symbol).name} 
                          className="chain-logo"
                          title={getTokenChainInfo(token.networkId, token.symbol).name}
                        />
                        <span className="pair-quote">{getPairQuote(token.networkId, token.symbol)}</span>
                      </td>
                      <td>{formatAge(token.age, token.symbol)}</td>
                      <td>{formatOptionalNumber(token.txns, token.symbol)}</td>
                    </>
                  )}
                  <td>{formatOptionalLarge(token.volume, token.symbol)}</td>
                  {viewMode === 'onchain' && (
                    <>
                      <td>{formatOptionalNumber(token.makers, token.symbol)}</td>
                      <td>{formatOptionalNumber(token.holders, token.symbol)}</td>
                    </>
                  )}
                  <td className={token.change5m >= 0 ? 'positive' : 'negative'}>{formatChange(token.change5m)}</td>
                  <td className={token.change1h >= 0 ? 'positive' : 'negative'}>{formatChange(token.change1h)}</td>
                  <td className={token.change6h >= 0 ? 'positive' : 'negative'}>{formatChange(token.change6h)}</td>
                  <td className={token.change24h >= 0 ? 'positive' : 'negative'}>{formatChange(token.change24h)}</td>
                  {viewMode === 'major' && (
                    <>
                      <td className={token.change1w >= 0 ? 'positive' : 'negative'}>{formatChange(token.change1w)}</td>
                      <td className={token.change1m >= 0 ? 'positive' : 'negative'}>{formatChange(token.change1m)}</td>
                      <td className={token.change1y >= 0 ? 'positive' : 'negative'}>{formatChange(token.change1y)}</td>
                    </>
                  )}
                  <td>{formatOptionalLarge(token.liquidity, token.symbol)}</td>
                  <td>{formatOptionalLarge(token.mcap, token.symbol)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        )}

        {/* Mobile Card View - Swipeable tokens */}
        {isMobile && sortedTokens.length > 0 && (
          <div className="watchlists-mobile-cards">
            {sortedTokens.map((token) => (
              <SwipeableRow
                key={token.id}
                onSwipeLeft={() => handleSwipeDelete(token)}
                onSwipeRight={() => handleSwipePin(token)}
                leftActions={[
                  {
                    label: token.pinned ? t('watchlist.unpin') : t('watchlist.pin'),
                    color: '#fbbf24',
                    icon: (
                      <svg viewBox="0 0 24 24" fill={token.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                      </svg>
                    ),
                    onClick: () => handleSwipePin(token),
                  },
                ]}
                rightActions={[
                  {
                    label: t('watchlistPage.delete'),
                    color: '#ef4444',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    ),
                    onClick: () => handleSwipeDelete(token),
                  },
                ]}
              >
                <div
                  className={`watchlists-mobile-card ${token.pinned ? 'pinned' : ''}`}
                  onClick={() => onTokenClick ? onTokenClick(token, viewMode) : handleTokenOptions(token)}
                  style={getTokenRowStyle(token.symbol)}
                >
                  {/* Pin indicator */}
                  {token.pinned && <div className="watchlists-mobile-card-pin-bar" />}

                  {/* Token Info */}
                  <div className="watchlists-mobile-card-main">
                    <div className="watchlists-mobile-card-avatar"
                      style={getTokenAvatarRingStyle(token.symbol) || {}}
                    >
                      {token.logo ? (
                        <img src={token.logo} alt={token.symbol} />
                      ) : (
                        <span>{token.symbol?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className="watchlists-mobile-card-info">
                      <span className="watchlists-mobile-card-symbol">{token.symbol}</span>
                      <span className="watchlists-mobile-card-name">{token.name}</span>
                    </div>
                  </div>

                  {/* Price & Change */}
                  <div className="watchlists-mobile-card-right">
                    <span className="watchlists-mobile-card-price">{fmtPrice(token.price)}</span>
                    <span className={`watchlists-mobile-card-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                      {formatChange(token.change24h)}
                    </span>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet - Token Options */}
      <MobileBottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => { setBottomSheetOpen(false); setSelectedToken(null); }}
        title={selectedToken ? `${selectedToken.symbol} ${t('watchlistPage.options')}` : t('watchlistPage.options')}
      >
        {selectedToken && (
          <>
            {/* Token summary */}
            <div className="watchlists-sheet-token-summary">
              <div className="watchlists-sheet-token-avatar"
                style={getTokenAvatarRingStyle(selectedToken.symbol) || {}}
              >
                {selectedToken.logo ? (
                  <img src={selectedToken.logo} alt={selectedToken.symbol} />
                ) : (
                  <span>{selectedToken.symbol?.[0] || '?'}</span>
                )}
              </div>
              <div className="watchlists-sheet-token-info">
                <span className="watchlists-sheet-token-name">{selectedToken.name}</span>
                <span className="watchlists-sheet-token-price">{fmtPrice(selectedToken.price)}</span>
              </div>
              <span className={`watchlists-sheet-token-change ${selectedToken.change24h >= 0 ? 'positive' : 'negative'}`}>
                {formatChange(selectedToken.change24h)}
              </span>
            </div>

            {/* Actions */}
            <BottomSheetAction
              icon={
                <svg viewBox="0 0 24 24" fill={selectedToken.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                </svg>
              }
              label={selectedToken.pinned ? t('watchlistPage.unpinFromTop') : t('watchlistPage.pinToTop')}
              description={selectedToken.pinned ? t('watchlistPage.removeFromPinned') : t('watchlistPage.alwaysShowTop')}
              onClick={() => {
                togglePinWatchlist?.(selectedToken.address || selectedToken.symbol)
                setBottomSheetOpen(false)
                setSelectedToken(null)
              }}
            />

            <BottomSheetAction
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              }
              label={t('watchlistPage.viewDetails')}
              description={t('watchlistPage.seeFullInfo')}
              onClick={() => {
                // TODO: Navigate to token detail page
                setBottomSheetOpen(false)
                setSelectedToken(null)
              }}
            />

            <BottomSheetAction
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              }
              label={t('watchlistPage.removeFromWatchlist')}
              description={t('watchlistPage.deleteFromList')}
              destructive
              onClick={() => {
                removeFromWatchlist?.(selectedToken.address || selectedToken.symbol)
                setBottomSheetOpen(false)
                setSelectedToken(null)
              }}
            />
          </>
        )}
      </MobileBottomSheet>
    </div>
  )
}

export default WatchlistsPage
