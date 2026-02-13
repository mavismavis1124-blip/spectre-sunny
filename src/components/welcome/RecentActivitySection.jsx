/**
 * RecentActivitySection Component
 * Contains: Live activity feed, watchlist sidebar with real-time prices
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../hooks/useCurrency'
import useWatchlistPrices from '../../hooks/useWatchlistPrices'
import { useMarketIntel } from '../../hooks/useMarketIntel'
import { getStockLogo } from '../../constants/stockData'

// Icons
const icons = {
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  heartFilled: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  sort: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v8M6 10l6 6 6-6"/><path d="M12 16v6"/></svg>,
  drag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  whale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 14c2-6 8-10 14-10s10 4 10 8-2 8-6 8c-2 0-4-2-4-4s2-4 4-4"/></svg>,
  volume: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>,
  listing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  breakout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20"/></svg>,
}

const TOKEN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  WIF: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
  BONK: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  JUP: 'https://assets.coingecko.com/coins/images/34188/small/jup.png',
  FET: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg',
}

const RecentActivitySection = ({
  // Market mode
  marketMode = 'crypto',
  isStocks = false,
  // Watchlist
  watchlist = [],
  watchlists = [],
  activeWatchlistId,
  onSwitchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  togglePinWatchlist,
  reorderWatchlist,
  // Stock prices for watchlist
  stockPrices = {},
  // Event handlers
  onTokenClick,
  onOpenResearchZone,
  // Filter
  activityFilter = 'all',
  setActivityFilter,
  // Layout
  dayMode = false,
}) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLargeShort } = useCurrency()
  
  // Live watchlist prices
  const { watchlistWithLiveData } = useWatchlistPrices(watchlist)
  
  // Market intel for live activity
  const intel = useMarketIntel(30000)
  
  // Live activity feed
  const [liveActivity, setLiveActivity] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  
  // Watchlist UI state
  const [watchlistSort, setWatchlistSort] = useState('default')
  const [watchlistOpen, setWatchlistOpen] = useState(true)
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState('')
  const [watchlistPickerOpen, setWatchlistPickerOpen] = useState(false)
  
  // Drag and drop
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  
  // Sync live activity from market intel
  useEffect(() => {
    if (isPaused || !intel.liveEvents || intel.liveEvents.length === 0) return
    
    const mapped = intel.liveEvents.map((ev, idx) => ({
      type: ev.type,
      token: ev.token,
      logo: TOKEN_LOGOS[ev.token] || '',
      action: ev.action,
      amount: ev.amount,
      time: ev.time || 'live',
      isNew: ev.isNew || idx === 0,
      id: ev.id || `${ev.type}-${ev.token}-${Date.now()}`,
    }))
    
    setLiveActivity(mapped)
  }, [intel.liveEvents, intel.lastUpdated, isPaused])

  // Fallback activity if none from API
  useEffect(() => {
    if (liveActivity.length > 0) return
    
    setLiveActivity([
      { type: 'whale', token: 'PEPE', logo: TOKEN_LOGOS['PEPE'], action: 'Accumulated', amount: '$2.4M', time: '2m', isNew: false },
      { type: 'volume', token: 'WIF', logo: TOKEN_LOGOS['WIF'], action: 'Volume spike', amount: '+340%', time: '5m', isNew: false },
      { type: 'liquidation', token: 'BTC', logo: TOKEN_LOGOS['BTC'], action: 'Long liquidated', amount: '$4.8M', time: '7m', isNew: false },
      { type: 'listing', token: 'JUP', logo: TOKEN_LOGOS['JUP'], action: 'Listed on', amount: 'Raydium', time: '12m', isNew: false },
      { type: 'whale', token: 'ARB', logo: TOKEN_LOGOS['ARB'], action: 'Distributed', amount: '$1.8M', time: '15m', isNew: false },
      { type: 'breakout', token: 'FET', logo: TOKEN_LOGOS['FET'], action: 'Breaking resistance', amount: '+18%', time: '20m', isNew: false },
    ])
  }, [liveActivity.length])

  // Filtered activity
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return liveActivity
    return liveActivity.filter(a => {
      if (activityFilter === 'whale' && a.type === 'whale') return true
      if (activityFilter === 'volume' && (a.type === 'volume' || a.type === 'breakout')) return true
      if (activityFilter === 'liquidation' && a.type === 'liquidation') return true
      if (activityFilter === 'listing' && a.type === 'listing') return true
      return false
    })
  }, [liveActivity, activityFilter])

  // Watchlist with stock data
  const watchlistWithData = useMemo(() => {
    if (!isStocks) return watchlistWithLiveData
    
    const stockItems = watchlist.filter(t => t.isStock)
    return stockItems.map(t => {
      const liveData = stockPrices?.[t.symbol]
      return {
        ...t,
        price: liveData?.price ?? t.price ?? 0,
        change: liveData?.change ?? t.change ?? 0,
        marketCap: liveData?.marketCap ?? t.marketCap ?? 0,
        volume: liveData?.volume ?? t.volume ?? 0,
        logo: getStockLogo(t.symbol, t.sector),
      }
    })
  }, [isStocks, watchlist, watchlistWithLiveData, stockPrices])

  // Sorted watchlist
  const sortedWatchlist = useMemo(() => {
    let list = [...watchlistWithData]
    const pinned = list.filter(t => t.pinned)
    let unpinned = list.filter(t => !t.pinned)
    
    switch (watchlistSort) {
      case 'priceChangeDesc':
        unpinned.sort((a, b) => (b.change || 0) - (a.change || 0))
        break
      case 'priceChangeAsc':
        unpinned.sort((a, b) => (a.change || 0) - (b.change || 0))
        break
      case 'marketCapDesc':
        unpinned.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
        break
      case 'marketCapAsc':
        unpinned.sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0))
        break
      default:
        break
    }
    
    return [...pinned, ...unpinned]
  }, [watchlistWithData, watchlistSort])

  // Format change
  const formatChange = (change) => {
    const value = typeof change === 'number' ? change : parseFloat(change) || 0
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Activity icon
  const getActivityIcon = (type) => {
    switch (type) {
      case 'whale': return icons.whale
      case 'volume': return icons.volume
      case 'listing': return icons.listing
      case 'breakout': return icons.breakout
      case 'liquidation': return <span className="activity-icon-liq">!</span>
      default: return icons.volume
    }
  }

  // Activity color
  const getActivityColor = (type) => {
    switch (type) {
      case 'whale': return 'blue'
      case 'volume': return 'purple'
      case 'listing': return 'green'
      case 'breakout': return 'yellow'
      case 'liquidation': return 'red'
      default: return 'neutral'
    }
  }

  // Drag handlers
  const handleDragStart = (e, index, item) => {
    setDraggedItem({ index, item })
    e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (e, index) => {
    if (draggedItem === null || index === draggedItem.index) return
    setDragOverItem(index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    if (draggedItem !== null && dragOverItem !== null && draggedItem.index !== dragOverItem) {
      const newList = [...sortedWatchlist]
      const [removed] = newList.splice(draggedItem.index, 1)
      newList.splice(dragOverItem, 0, removed)
      reorderWatchlist?.(newList)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Handle token click
  const handleTokenClick = (token) => {
    if (onTokenClick) {
      onTokenClick(token)
    } else if (onOpenResearchZone) {
      onOpenResearchZone(token)
    }
  }

  // Watchlist sort options
  const sortOptions = [
    { value: 'default', label: 'Default', icon: icons.sort },
    { value: 'priceChangeDesc', label: 'Change ↓', icon: icons.arrow },
    { value: 'priceChangeAsc', label: 'Change ↑', icon: icons.arrow },
    { value: 'marketCapDesc', label: 'Market Cap ↓', icon: icons.arrow },
    { value: 'marketCapAsc', label: 'Market Cap ↑', icon: icons.arrow },
  ]

  return (
    <aside className="recent-activity-section">
      {/* Watchlist Header */}
      <div className="watchlist-header">
        <div 
          className="watchlist-title-bar"
          onClick={() => setWatchlistOpen(!watchlistOpen)}
        >
          <h3>Watchlist</h3>
          <span className={`chevron ${watchlistOpen ? 'open' : ''}`}>{icons.chevronDown}</span>
        </div>
        
        {watchlists && watchlists.length > 0 && (
          <div className="watchlist-picker">
            <button 
              className="watchlist-picker-btn"
              onClick={() => setWatchlistPickerOpen(!watchlistPickerOpen)}
            >
              {watchlists.find(w => w.id === activeWatchlistId)?.name || 'Default'}
              {icons.chevronDown}
            </button>
            {watchlistPickerOpen && (
              <div className="watchlist-picker-dropdown">
                {watchlists.map(w => (
                  <button
                    key={w.id}
                    className={activeWatchlistId === w.id ? 'active' : ''}
                    onClick={() => {
                      onSwitchWatchlist?.(w.id)
                      setWatchlistPickerOpen(false)
                    }}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Watchlist Content */}
      {watchlistOpen && (
        <div className="watchlist-content">
          {/* Search */}
          <div className="watchlist-search">
            <span className="search-icon">{icons.search}</span>
            <input
              type="text"
              placeholder="Search..."
              value={watchlistSearchQuery}
              onChange={(e) => setWatchlistSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="watchlist-sort">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                className={watchlistSort === opt.value ? 'active' : ''}
                onClick={() => setWatchlistSort(opt.value)}
                title={opt.label}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {/* Watchlist Items */}
          <div className="watchlist-items">
            {sortedWatchlist.length === 0 ? (
              <div className="watchlist-empty">
                <p>No items in watchlist</p>
                <span>Add tokens to track them here</span>
              </div>
            ) : (
              sortedWatchlist.map((item, index) => (
                <div
                  key={item.symbol + item.address}
                  className={`watchlist-item ${item.pinned ? 'pinned' : ''} ${dragOverItem === index ? 'drag-over' : ''}`}
                  draggable={watchlistSort === 'default'}
                  onDragStart={(e) => handleDragStart(e, index, item)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTokenClick(item)}
                >
                  {watchlistSort === 'default' && (
                    <span className="drag-handle">{icons.drag}</span>
                  )}
                  
                  <button
                    className={`pin-btn ${item.pinned ? 'pinned' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePinWatchlist?.(item.symbol || item.address)
                    }}
                  >
                    {icons.pin}
                  </button>
                  
                  <div className="watchlist-item-avatar">
                    {item.logo ? (
                      <img src={item.logo} alt={item.symbol} />
                    ) : (
                      <span>{item.symbol?.slice(0, 2)}</span>
                    )}
                  </div>
                  
                  <div className="watchlist-item-info">
                    <span className="watchlist-item-symbol">{item.symbol}</span>
                    <span className="watchlist-item-name">{item.name}</span>
                  </div>
                  
                  <div className="watchlist-item-price">
                    <span className="price">{fmtPrice(item.price)}</span>
                    <span className={`change ${(item.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {formatChange(item.change)}
                    </span>
                  </div>
                  
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromWatchlist?.(item.symbol || item.address)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Activity Feed Header */}
      <div className="activity-feed-header">
        <div className="activity-title-row">
          <h3>Live Activity</h3>
          <button
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
        
        {/* Activity Filters */}
        <div className="activity-filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'whale', label: 'Whales' },
            { id: 'volume', label: 'Volume' },
            { id: 'liquidation', label: 'Liqs' },
            { id: 'listing', label: 'Listings' },
          ].map(filter => (
            <button
              key={filter.id}
              className={activityFilter === filter.id ? 'active' : ''}
              onClick={() => setActivityFilter?.(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="activity-feed">
        {filteredActivity.length === 0 ? (
          <div className="activity-empty">
            <p>No recent activity</p>
          </div>
        ) : (
          filteredActivity.map((activity) => (
            <div
              key={activity.id}
              className={`activity-item ${activity.isNew ? 'new' : ''}`}
              onClick={() => handleTokenClick({ symbol: activity.token, name: activity.token })}
            >
              <div className={`activity-icon ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="activity-avatar">
                {activity.logo ? (
                  <img src={activity.logo} alt={activity.token} />
                ) : (
                  <span>{activity.token?.slice(0, 2)}</span>
                )}
              </div>
              
              <div className="activity-content">
                <div className="activity-main">
                  <span className="activity-token">{activity.token}</span>
                  <span className="activity-action">{activity.action}</span>
                  <span className="activity-amount">{activity.amount}</span>
                </div>
                <div className="activity-meta">
                  <span className="activity-type">{activity.type}</span>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

export default RecentActivitySection
