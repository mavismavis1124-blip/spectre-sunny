/**
 * LeftPanel Component
 * Figma Reference: Left sidebar with X/Watchlist tabs
 * Features: Tweets feed, Watchlist, Trending/AI Logs toggle
 */
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useTokenSearch } from '../hooks/useCodexData'
import useWatchlistPrices from '../hooks/useWatchlistPrices'
import { useCurrency } from '../hooks/useCurrency'
import { getTokenRowStyle, getTokenAvatarRingStyle } from '../constants/tokenColors'
import spectreIcons from '../icons/spectreIcons'
import './LeftPanel.css'

const LeftPanel = ({ marketMode = 'crypto', chartViewMode, setChartViewMode, watchlist, addToWatchlist, removeFromWatchlist, togglePinWatchlist, reorderWatchlist, selectToken }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const [mainTab, setMainTab] = useState('x')
  const [filter, setFilter] = useState('Project Posts')
  const [bottomTab, setBottomTab] = useState('ai')
  const [fullViewMode, setFullViewMode] = useState(false)
  const [selectedTweetId, setSelectedTweetId] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showScrollToTweet, setShowScrollToTweet] = useState(false)
  const [tweetInteractions, setTweetInteractions] = useState({}) // Track liked, retweeted, replied
  const [replyModal, setReplyModal] = useState({ open: false, tweet: null })
  const [replyText, setReplyText] = useState('')
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState('')
  const watchlistSearchContainerRef = useRef(null)
  const { results: watchlistSearchResults, loading: watchlistSearchLoading } = useTokenSearch(watchlistSearchQuery.trim(), 300)

  // Live watchlist: unified realtime prices
  const { watchlistWithLiveData, loading: watchlistLoading } = useWatchlistPrices(watchlist)
  
  // Close watchlist search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (watchlistSearchContainerRef.current && !watchlistSearchContainerRef.current.contains(e.target)) {
        setWatchlistSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const fullViewContentRef = React.useRef(null)
  
  // Toggle tweet interaction (like, retweet, reply)
  const toggleInteraction = (tweetId, type, e) => {
    e.stopPropagation()
    setTweetInteractions(prev => ({
      ...prev,
      [tweetId]: {
        ...prev[tweetId],
        [type]: !prev[tweetId]?.[type]
      }
    }))
  }
  
  // Open reply modal
  const openReplyModal = (tweet, e) => {
    e.stopPropagation()
    setReplyModal({ open: true, tweet })
    setReplyText('')
  }
  
  // Close reply modal
  const closeReplyModal = () => {
    setReplyModal({ open: false, tweet: null })
    setReplyText('')
  }
  
  // Submit reply
  const submitReply = () => {
    if (replyText.trim() && replyModal.tweet) {
      setTweetInteractions(prev => ({
        ...prev,
        [replyModal.tweet.id]: {
          ...prev[replyModal.tweet.id],
          replied: true
        }
      }))
      closeReplyModal()
    }
  }
  
  // ESC key to close full view
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && fullViewMode) {
        setFullViewMode(false)
        setSelectedTweetId(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [fullViewMode])

  // Lock body scroll when full view is open
  useEffect(() => {
    if (fullViewMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [fullViewMode])

  // Scroll to selected tweet when full view opens
  useEffect(() => {
    if (fullViewMode && selectedTweetId) {
      setTimeout(() => {
        const tweetElement = document.getElementById(`tweet-${selectedTweetId}`)
        if (tweetElement) {
          tweetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [fullViewMode, selectedTweetId])

  // Handle tweet click to open in full view
  const handleTweetClick = (tweetId) => {
    setSelectedTweetId(tweetId)
    setFullViewMode(true)
  }

  // Handle scroll in full view
  const handleFullViewScroll = (e) => {
    const scrollTop = e.target.scrollTop
    setShowScrollTop(scrollTop > 300)
    
    // Show scroll to tweet button only when at the top
    setShowScrollToTweet(scrollTop < 150 && selectedTweetId)
  }

  // Scroll to top
  const scrollToTop = () => {
    fullViewContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Scroll to selected tweet
  const scrollToSelectedTweet = () => {
    const tweetElement = document.getElementById(`tweet-${selectedTweetId}`)
    if (tweetElement) {
      tweetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  // Watchlist filter and sort state
  const [watchlistSort, setWatchlistSort] = useState('default') // 'default', 'priceChangeAsc', 'priceChangeDesc', 'marketCapAsc', 'marketCapDesc'
  const [watchlistSortDropdown, setWatchlistSortDropdown] = useState(false)
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const dragNodeRef = useRef(null)

  const filterKeys = ['Project Posts', 'Project Replies', 'Community', 'Influencers', 'All']
  const filterLabels = {
    'Project Posts': t('leftPanel.projectPosts'),
    'Project Replies': t('leftPanel.projectReplies'),
    'Community': t('leftPanel.community'),
    'Influencers': t('leftPanel.influencers'),
    'All': t('common.all'),
  }
  const filters = filterKeys

  // Spectre AI official posts - from @Spectre__AI
  const projectPosts = [
    {
      id: 1,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      content: '🚀 Introducing Spectre AI - Your intelligent crypto research companion. Advanced AI-powered analytics, real-time market insights, and smart trading tools. The future of crypto research is here.',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=220&fit=crop' },
      time: '2h',
      likes: 1247,
      retweets: 389,
      replies: 156
    },
    {
      id: 2,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      content: '📊 New Feature Alert: AI-powered rug pull detection is now live! Our machine learning models analyze contract code, liquidity patterns, and holder distribution in real-time. Stay safe out there. 🛡️',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=220&fit=crop' },
      time: '5h',
      likes: 892,
      retweets: 267,
      replies: 89
    },
    {
      id: 3,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      content: '🎯 Weekly Alpha Report:\n\n• 87% accuracy on swing trade signals\n• 12 successful whale movement predictions\n• 3 rug pulls detected before launch\n\nThis is what AI-powered research looks like. $SPECTRE',
      time: '8h',
      likes: 2341,
      retweets: 567,
      replies: 234
    },
    {
      id: 4,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      content: '🔮 The Research Zone is getting a major upgrade. Sneak peek:\n\n✅ Cross-chain analytics\n✅ Sentiment analysis dashboard\n✅ AI chat assistant integration\n\nBuilding the Bloomberg Terminal for Web3. Stay tuned.',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=220&fit=crop' },
      time: '12h',
      likes: 1567,
      retweets: 423,
      replies: 178
    },
    {
      id: 5,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      content: 'GM to everyone building in crypto! 🌅\n\nRemember: In a sea of noise, data is your compass. Let Spectre AI be your guide.\n\n#Crypto #DeFi #AI',
      time: '1d',
      likes: 756,
      retweets: 134,
      replies: 67
    },
  ]

  // Spectre AI replies to community members
  const projectReplies = [
    {
      id: 101,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      replyingTo: '@CryptoTrader_Mike',
      content: 'Great question! The AI signals update every 15 minutes during high volatility periods and every hour during stable markets. You can customize alert thresholds in Settings → Notifications. 🎯',
      time: '1h',
      likes: 45,
      retweets: 8,
      replies: 3
    },
    {
      id: 102,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      replyingTo: '@DeFi_Sarah',
      content: 'Thanks for the feedback! We\'re working on mobile app support - expected Q1 2026. For now, our web app is fully responsive and works great on mobile browsers. 📱',
      time: '3h',
      likes: 89,
      retweets: 12,
      replies: 7
    },
    {
      id: 103,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      replyingTo: '@whale_watcher',
      content: 'Absolutely! The whale tracking feature monitors wallets with >$1M in holdings. You\'ll get instant alerts when they make significant moves. It\'s saved our users from several dumps already. 🐋',
      time: '5h',
      likes: 156,
      retweets: 34,
      replies: 12
    },
    {
      id: 104,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      replyingTo: '@NewToDefi',
      content: 'Welcome aboard! 🙌 Start with the Research Zone - it\'s beginner-friendly and will help you understand token fundamentals before making any trades. DM us if you need help getting started!',
      time: '7h',
      likes: 234,
      retweets: 45,
      replies: 18
    },
    {
      id: 105,
      user: 'Spectre AI',
      handle: '@Spectre__AI',
      avatar: '/round-logo.png',
      verified: true,
      replyingTo: '@TokenAnalyst',
      content: 'Great catch! Yes, we\'re integrating with more DEXs next week. Uniswap V3, SushiSwap, and PancakeSwap data will all be available in the unified dashboard. Cross-chain is the future. 🔗',
      time: '9h',
      likes: 178,
      retweets: 56,
      replies: 23
    },
  ]

  // Community tweets about Spectre AI - Web3 style avatars
  const communityTweets = [
    {
      id: 201,
      user: 'CryptoWhale',
      handle: '@cryptowhale_io',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale&backgroundColor=6366f1',
      verified: true,
      content: 'Just accumulated more $SPECTRE. The team is building something special here. This is what real utility looks like in crypto. 🔥',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=220&fit=crop' },
      time: '4h',
      likes: 567,
      retweets: 89,
      replies: 34
    },
    {
      id: 202,
      user: 'DeFi Marcus',
      handle: '@defi_marcus',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=8b5cf6',
      verified: false,
      content: 'The @Spectre__AI research tools saved me from a rug pull yesterday. Flagged the contract 2 hours before it happened. Seriously undervalued platform.',
      time: '6h',
      likes: 423,
      retweets: 78,
      replies: 28
    },
    {
      id: 203,
      user: 'AlphaSeeker',
      handle: '@alpha_seeker',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alpha&backgroundColor=06b6d4',
      verified: true,
      content: 'Been using @Spectre__AI for 2 weeks now. The AI signals are genuinely impressive - 4 out of 5 trades profitable. This is the tool I\'ve been waiting for. 📈',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=220&fit=crop' },
      time: '8h',
      likes: 312,
      retweets: 67,
      replies: 19
    },
    {
      id: 204,
      user: 'Trader Joe',
      handle: '@traderjoe_eth',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joe&backgroundColor=10b981',
      verified: false,
      content: 'Finally a platform that actually uses AI for something useful. @Spectre__AI whale alerts are on point. Caught 3 big moves this week.',
      time: '10h',
      likes: 245,
      retweets: 34,
      replies: 12
    },
  ]

  // Influencer/KOL tweets - Using DiceBear lorelei style for attractive avatars
  const influencerTweets = [
    {
      id: 301,
      user: 'Crypto Banter',
      handle: '@CryptoBanter',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CryptoBanter&backgroundColor=ff6b35',
      verified: true,
      content: '🚨 Just reviewed @Spectre__AI on stream. The AI-powered research tools are actually legit. This could be a game-changer for retail traders trying to compete with institutions.',
      media: { type: 'video', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=220&fit=crop', duration: '12:34' },
      time: '3h',
      likes: 2341,
      retweets: 567,
      replies: 234
    },
    {
      id: 302,
      user: 'Lark Davis',
      handle: '@TheCryptoLark',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LarkDavis&backgroundColor=2563eb',
      verified: true,
      content: 'The future of crypto trading is AI-assisted. Projects like @Spectre__AI are making institutional-grade research accessible to everyone. Keep an eye on this one. 👀',
      time: '12h',
      likes: 1892,
      retweets: 423,
      replies: 156
    },
    {
      id: 303,
      user: 'Altcoin Daily',
      handle: '@AltcoinDailyio',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=AltcoinDaily&backgroundColor=dc2626',
      verified: true,
      content: '🔥 $SPECTRE is building the Bloomberg Terminal for crypto. AI-powered research, real-time analytics, whale tracking. This is the infrastructure we need.',
      media: { type: 'image', url: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=220&fit=crop' },
      time: '1d',
      likes: 3456,
      retweets: 789,
      replies: 345
    },
    {
      id: 304,
      user: 'Coin Bureau',
      handle: '@coinbureau',
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=CoinBureau&backgroundColor=0ea5e9',
      verified: true,
      content: 'Been testing @Spectre__AI for research. The rug pull detection is genuinely impressive - uses ML to analyze contract patterns. Could save a lot of people from scams.',
      media: { type: 'video', url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=220&fit=crop', duration: '8:21' },
      time: '2d',
      likes: 4521,
      retweets: 1023,
      replies: 412
    },
  ]

  // Get tweets based on current filter
  const getTweets = () => {
    switch (filter) {
      case 'Project Posts':
        return projectPosts
      case 'Project Replies':
        return projectReplies
      case 'Community':
        return communityTweets
      case 'Influencers':
        return influencerTweets
      case 'All':
        // Mix posts: project, community, influencer, project reply (alternating)
        const mixed = []
        const maxLen = Math.max(projectPosts.length, communityTweets.length, influencerTweets.length, projectReplies.length)
        for (let i = 0; i < maxLen; i++) {
          if (projectPosts[i]) mixed.push(projectPosts[i])
          if (communityTweets[i]) mixed.push(communityTweets[i])
          if (influencerTweets[i]) mixed.push(influencerTweets[i])
          if (projectReplies[i]) mixed.push(projectReplies[i])
        }
        return mixed
      default:
        return projectPosts
    }
  }

  const tweets = getTweets()

  // Format price for display (via useCurrency hook)

  // Format change for display (values from Codex API are already percentages)
  const formatChange = (change) => {
    const numChange = typeof change === 'number' ? change : parseFloat(change)
    if (isNaN(numChange) || !isFinite(numChange)) return '+0.00%'
    // Change values from Codex API are already percentages, use directly
    return `${numChange >= 0 ? '+' : ''}${numChange.toFixed(2)}%`
  }

  // Format market cap for display (via useCurrency hook)
  const formatMarketCap = (marketCap) => {
    if (!marketCap || marketCap === 0) return '-'
    return fmtLarge(marketCap)
  }

  // Get sorted watchlist - pinned items always first, with live data
  const getSortedWatchlist = () => {
    const watchlistWithLive = watchlistWithLiveData
    if (!watchlistWithLive || watchlistWithLive.length === 0) return []
    
    // Separate pinned and unpinned
    const pinned = watchlistWithLive.filter(t => t.pinned)
    const unpinned = watchlistWithLive.filter(t => !t.pinned)
    
    // Sort unpinned based on selected sort (using live data)
    let sortedUnpinned = [...unpinned]
    switch (watchlistSort) {
      case 'priceChangeDesc':
        sortedUnpinned.sort((a, b) => {
          // Convert change to percentage for proper sorting
          const aChange = Math.abs(a.change || 0) < 1 ? (a.change || 0) * 100 : (a.change || 0)
          const bChange = Math.abs(b.change || 0) < 1 ? (b.change || 0) * 100 : (b.change || 0)
          return bChange - aChange
        })
        break
      case 'priceChangeAsc':
        sortedUnpinned.sort((a, b) => {
          const aChange = Math.abs(a.change || 0) < 1 ? (a.change || 0) * 100 : (a.change || 0)
          const bChange = Math.abs(b.change || 0) < 1 ? (b.change || 0) * 100 : (b.change || 0)
          return aChange - bChange
        })
        break
      case 'marketCapDesc':
        sortedUnpinned.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
        break
      case 'marketCapAsc':
        sortedUnpinned.sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0))
        break
      default:
        break
    }
    
    return [...pinned, ...sortedUnpinned]
  }

  // Drag handlers
  const handleDragStart = (e, index, item) => {
    setDraggedItem({ index, item })
    dragNodeRef.current = e.target
    e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (e, index) => {
    if (draggedItem === null) return
    if (index !== draggedItem.index) {
      setDragOverItem(index)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging')
    
    if (draggedItem !== null && dragOverItem !== null && draggedItem.index !== dragOverItem) {
      const sortedList = getSortedWatchlist()
      const newList = [...sortedList]
      const [removed] = newList.splice(draggedItem.index, 1)
      newList.splice(dragOverItem, 0, removed)
      reorderWatchlist(newList)
    }
    
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const sortedWatchlist = getSortedWatchlist()

  const sortOptions = [
    { value: 'default', label: t('leftPanel.mainOrder'), icon: spectreIcons.list },
    { value: 'priceChangeDesc', label: t('leftPanel.priceChangeDown'), icon: spectreIcons.trending },
    { value: 'priceChangeAsc', label: t('leftPanel.priceChangeUp'), icon: spectreIcons.trending },
    { value: 'marketCapDesc', label: t('leftPanel.marketCapDown'), icon: spectreIcons.portfolio },
    { value: 'marketCapAsc', label: t('leftPanel.marketCapUp'), icon: spectreIcons.bank },
  ]

  const aiLogs = [
    { type: 'signal', title: 'Bullish Pattern Detected', message: 'SPECTRE/ETH showing ascending triangle', time: '2m ago', confidence: '87%' },
    { type: 'alert', title: 'Whale Alert', message: 'Large wallet accumulated 500K tokens', time: '15m ago', confidence: null },
    { type: 'info', title: 'Volume Spike', message: '+45% increase in last 15 minutes', time: '32m ago', confidence: null },
    { type: 'signal', title: 'Support Level', message: 'Strong support identified at $1.24', time: '1h ago', confidence: '92%' },
  ]

  return (
    <div className="left-panel">
      {/* Main Tabs - X/Watchlist */}
      <div className="panel-card main-feed">
        <div className="panel-tabs">
          <button
            className={`tab ${mainTab === 'x' ? 'active' : ''}`}
            onClick={() => setMainTab('x')}
          >
            <span className="tab-icon">𝕏</span>
          </button>
          <button
            className={`tab ${mainTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setMainTab('watchlist')}
          >
            <span className="tab-icon">
              <svg viewBox="0 0 24 24" fill={mainTab === 'watchlist' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            <span>{t('watchlist.title')}</span>
          </button>
        </div>

        {mainTab === 'x' && (
          <>
            <div className="filter-section">
              <div className="filter-row">
                {filters.slice(0, 4).map(f => (
                  <button
                    key={f}
                    className={`filter-chip ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {filterLabels[f] || f}
                  </button>
                ))}
              </div>
              <div className="filter-row-bottom">
                <button
                  className={`filter-chip all-chip ${filter === 'All' ? 'active' : ''}`}
                  onClick={() => setFilter('All')}
                >
                  {t('common.all')}
                </button>
                <div className="view-mode-buttons">
                  <button
                    className={`view-mode-btn ${fullViewMode ? 'active' : ''}`}
                    onClick={() => setFullViewMode(!fullViewMode)}
                    title={t('leftPanel.fullView')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {fullViewMode ? (
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                      ) : (
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      )}
                    </svg>
                  </button>
                  <button
                    className={`view-mode-btn ${chartViewMode === 'xChart' ? 'active' : ''}`}
                    onClick={() => setChartViewMode(chartViewMode === 'xChart' ? 'trading' : 'xChart')}
                    title={t('leftPanel.xChart')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v18h18" />
                      <path d="M18 9l-5 5-4-4-3 3" />
                    </svg>
                  </button>
                  <button
                    className={`view-mode-btn ${chartViewMode === 'xBubbles' ? 'active' : ''}`}
                    onClick={() => setChartViewMode(chartViewMode === 'xBubbles' ? 'trading' : 'xBubbles')}
                    title={t('leftPanel.xBubbles')}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="18" cy="8" r="4" />
                      <circle cx="10" cy="16" r="5" />
                      <circle cx="18" cy="18" r="2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Full View Mode Portal */}
            {fullViewMode && createPortal(
              <div className="tweets-full-view-overlay">
                <button 
                  className="full-view-close"
                  onClick={() => { setFullViewMode(false); setSelectedTweetId(null); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Scroll to Top Button */}
                <button 
                  className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
                  onClick={scrollToTop}
                  title={t('leftPanel.scrollToTop')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
                
                {/* Scroll to Selected Tweet Button */}
                {selectedTweetId && (
                  <button 
                    className={`scroll-to-tweet-btn ${showScrollToTweet ? 'visible' : ''}`}
                    onClick={scrollToSelectedTweet}
                    title={t('leftPanel.goToSelectedTweet')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </button>
                )}
                
                <div className="full-view-header">
                  <span>{t('leftPanel.xFeedFullView')}</span>
                  <span className="full-view-hint">{t('leftPanel.pressEscToClose')}</span>
                </div>
                <div 
                  className="full-view-content"
                  ref={fullViewContentRef}
                  onScroll={handleFullViewScroll}
                >
                  {/* Profile Preview Card */}
                  <div className="x-profile-card">
                    <div className="profile-banner">
                      <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=250&fit=crop" alt="Banner" />
                      <div className="banner-overlay"></div>
                    </div>
                    <div className="profile-main">
                      <div className="profile-header-row">
                        <div className="profile-avatar-wrapper">
                          <img src="/round-logo.png" alt="Spectre AI" className="profile-avatar" />
                          <div className="avatar-ring"></div>
                        </div>
                        {/* Profile Action Buttons */}
                        <div className="profile-actions">
                          <button className="profile-action-btn notification">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                          </button>
                          <button className="profile-action-btn follow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            <span>{t('leftPanel.follow')}</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="profile-info">
                        <div className="profile-name-row">
                          <h2 className="profile-name">Spectre AI</h2>
                          {/* Gold Verified Badge */}
                          <svg className="verified-badge gold" viewBox="0 0 24 24" fill="url(#goldGradient)" width="20" height="20" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', flexShrink: 0 }}>
                            <defs>
                              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F7B32B" />
                                <stop offset="50%" stopColor="#FFD700" />
                                <stop offset="100%" stopColor="#E5A00D" />
                              </linearGradient>
                            </defs>
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                          </svg>
                          <span className="account-type-badge project">Project</span>
                        </div>
                        <span className="profile-handle">@Spectre__AI</span>
                        <p className="profile-bio">AI-Powered Crypto Research Platform. Real-time analytics, smart signals, and market intelligence. Building the future of DeFi research. 🔮</p>
                        
                        {/* Meta Info Row */}
                        <div className="profile-meta">
                          <span className="meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Joined Jan 2024
                          </span>
                          <a href="https://spectre.ai" className="meta-item meta-link" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            spectre.ai
                          </a>
                        </div>
                      </div>
                      
                      {/* Main Stats */}
                      <div className="profile-stats">
                        <div className="profile-stat-item">
                          <div className="stat-main">
                            <span className="stat-number">247</span>
                            <span className="growth-badge positive">+12</span>
                          </div>
                          <span className="stat-label">{t('leftPanel.posts')}</span>
                        </div>
                        <div className="profile-stat-divider"></div>
                        <div className="profile-stat-item">
                          <div className="stat-main">
                            <span className="stat-number">156</span>
                            <span className="growth-badge positive">+3</span>
                          </div>
                          <span className="stat-label">{t('leftPanel.following')}</span>
                        </div>
                        <div className="profile-stat-divider"></div>
                        <div className="profile-stat-item">
                          <div className="stat-main">
                            <span className="stat-number">48.2K</span>
                            <span className="growth-badge positive">+2.4K</span>
                          </div>
                          <span className="stat-label">{t('leftPanel.followers')}</span>
                        </div>
                      </div>
                      
                      {/* Engagement Analytics - Premium Style */}
                      <div className="engagement-section">
                        <div className="engagement-header">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                            <path d="M21 21H3V3" />
                            <path d="M21 9l-6 6-4-4-6 6" />
                          </svg>
                          {t('leftPanel.engagementAnalytics')}
                        </div>
                        <div className="engagement-stats-row">
                          <div className="engagement-main">
                            <div className="engagement-rate">
                              <span className="rate-value">8.7%</span>
                              <span className="rate-label">{t('leftPanel.engagement')}</span>
                            </div>
                            <div className="engagement-bar-container">
                              <div className="engagement-bar-bg">
                                <div className="engagement-bar-fill" style={{ width: '87%' }}></div>
                              </div>
                              <span className="bar-label"><span className="bar-label-icon">{spectreIcons.sparkles}</span>{t('leftPanel.aboveAverage')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="engagement-metrics">
                          <div className="metric">
                            <span className="metric-icon">{spectreIcons.sparkles}</span>
                            <span className="metric-value">1.2K</span>
                            <span className="metric-label">{t('leftPanel.avgLikes')}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-icon">{spectreIcons.flows}</span>
                            <span className="metric-value">340</span>
                            <span className="metric-label">{t('leftPanel.avgRTs')}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-icon">{spectreIcons.chat}</span>
                            <span className="metric-value">98</span>
                            <span className="metric-label">{t('leftPanel.avgReplies')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <a 
                        href="https://x.com/Spectre__AI" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-profile-btn"
                      >
                        {t('leftPanel.viewFullProfile')}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  {tweets.map((tweet, index) => (
                    <div 
                      key={tweet.id}
                      id={`tweet-${tweet.id}`}
                      className={`tweet clickable ${selectedTweetId === tweet.id ? 'selected' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => setSelectedTweetId(tweet.id)}
                    >
                      <div className={`tweet-avatar ${tweet.avatar?.includes('round-logo') ? 'spectre-avatar' : ''}`}>
                        {tweet.avatar ? (
                          <img src={tweet.avatar} alt={tweet.user} />
                        ) : (
                          <span>{tweet.user[0]}</span>
                        )}
                      </div>
                      <div className="tweet-content">
                        <div className="tweet-header">
                          <span className="tweet-user">{tweet.user}</span>
                          {tweet.verified && (
                            <svg className="verified-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                            </svg>
                          )}
                          <span className="tweet-handle">{tweet.handle}</span>
                          <span className="tweet-dot">·</span>
                          <span className="tweet-time">{tweet.time}</span>
                        </div>
                        {tweet.replyingTo && (
                          <div className="replying-to">
                            {t('leftPanel.replyingTo')} <span className="reply-handle">{tweet.replyingTo}</span>
                          </div>
                        )}
                        <p className="tweet-text">{tweet.content}</p>
                        {tweet.media && (
                          <div className={`tweet-media ${tweet.media.type}`}>
                            <img src={tweet.media.url} alt="Tweet media" loading="lazy" />
                            {tweet.media.type === 'video' && (
                              <div className="video-overlay">
                                <div className="play-button">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                                {tweet.media.duration && (
                                  <span className="video-duration">{tweet.media.duration}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="tweet-actions">
                          <button className={`action-btn reply ${tweetInteractions[tweet.id]?.replied ? 'active' : ''}`} onClick={(e) => openReplyModal(tweet, e)}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z" />
                            </svg>
                            <span>{tweet.replies + (tweetInteractions[tweet.id]?.replied ? 1 : 0)}</span>
                          </button>
                          <button className={`action-btn retweet ${tweetInteractions[tweet.id]?.retweeted ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'retweeted', e)}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                            </svg>
                            <span>{tweet.retweets + (tweetInteractions[tweet.id]?.retweeted ? 1 : 0)}</span>
                          </button>
                          <button className={`action-btn like ${tweetInteractions[tweet.id]?.liked ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'liked', e)}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />
                            </svg>
                            <span>{tweet.likes + (tweetInteractions[tweet.id]?.liked ? 1 : 0)}</span>
                          </button>
                          <button className={`action-btn share ${tweetInteractions[tweet.id]?.shared ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'shared', e)}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
                            </svg>
                          </button>
                          <a 
                            href={`https://x.com/${tweet.handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-on-x-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{t('leftPanel.viewOnX')}</span>
                            <span className="x-logo">𝕏</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>,
              document.body
            )}

            <div className="tweets-feed">
              {tweets.map((tweet, index) => (
                <div 
                  key={tweet.id} 
                  className="tweet clickable"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleTweetClick(tweet.id)}
                >
                  <div className={`tweet-avatar ${tweet.avatar?.includes('round-logo') ? 'spectre-avatar' : ''}`}>
                    {tweet.avatar ? (
                      <img src={tweet.avatar} alt={tweet.user} />
                    ) : (
                      <span>{tweet.user[0]}</span>
                    )}
                  </div>
                  <div className="tweet-content">
                    <div className="tweet-header">
                      <span className="tweet-user">{tweet.user}</span>
                      {tweet.verified && (
                        <svg className="verified-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                        </svg>
                      )}
                      <span className="tweet-handle">{tweet.handle}</span>
                      <span className="tweet-dot">·</span>
                      <span className="tweet-time">{tweet.time}</span>
                    </div>
                    {tweet.replyingTo && (
                      <div className="replying-to">
                        Replying to <span className="reply-handle">{tweet.replyingTo}</span>
                      </div>
                    )}
                    <p className="tweet-text">{tweet.content}</p>
                    {tweet.media && (
                      <div className={`tweet-media ${tweet.media.type}`}>
                        <img src={tweet.media.url} alt="Tweet media" loading="lazy" />
                        {tweet.media.type === 'video' && (
                          <div className="video-overlay">
                            <div className="play-button">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                            {tweet.media.duration && (
                              <span className="video-duration">{tweet.media.duration}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="tweet-actions">
                      <button className={`action-btn reply ${tweetInteractions[tweet.id]?.replied ? 'active' : ''}`} onClick={(e) => openReplyModal(tweet, e)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z" />
                        </svg>
                        <span>{tweet.replies + (tweetInteractions[tweet.id]?.replied ? 1 : 0)}</span>
                      </button>
                      <button className={`action-btn retweet ${tweetInteractions[tweet.id]?.retweeted ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'retweeted', e)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                        </svg>
                        <span>{tweet.retweets + (tweetInteractions[tweet.id]?.retweeted ? 1 : 0)}</span>
                      </button>
                      <button className={`action-btn like ${tweetInteractions[tweet.id]?.liked ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'liked', e)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />
                        </svg>
                        <span>{tweet.likes + (tweetInteractions[tweet.id]?.liked ? 1 : 0)}</span>
                      </button>
                      <button className={`action-btn share ${tweetInteractions[tweet.id]?.shared ? 'active' : ''}`} onClick={(e) => toggleInteraction(tweet.id, 'shared', e)}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
                        </svg>
                      </button>
                      <a 
                        href={`https://x.com/${tweet.handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-on-x-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>{t('leftPanel.viewOnX')}</span>
                        <span className="x-logo">𝕏</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {mainTab === 'watchlist' && (
          <div className="watchlist">
            <h3 className="watchlist-title">{t('watchlist.title')}</h3>
            {addToWatchlist && (
              <div className="watchlist-add-row" ref={watchlistSearchContainerRef}>
                <input
                  type="text"
                  className="watchlist-add-search"
                  placeholder={t('leftPanel.searchTokenToAdd')}
                  value={watchlistSearchQuery}
                  onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                  onFocus={() => setWatchlistSortDropdown(false)}
                />
                <button type="button" className="watchlist-add-btn" title={t('leftPanel.addToken')} aria-label={t('leftPanel.addToken')}>
                  {spectreIcons.plus}
                </button>
                {watchlistSearchQuery.trim().length >= 1 && (
                  <div className="watchlist-search-dropdown">
                    {watchlistSearchLoading ? (
                      <div className="watchlist-search-loading">{t('common.searching')}</div>
                    ) : watchlistSearchResults?.length > 0 ? (
                      watchlistSearchResults.slice(0, 8).map((r) => (
                        <button
                          key={`${r.address}-${r.networkId}`}
                          type="button"
                          className="watchlist-search-result"
                          onClick={() => {
                            addToWatchlist({
                              symbol: r.symbol,
                              name: r.name,
                              address: r.address,
                              networkId: r.networkId || 1,
                              price: r.price,
                              change: r.change,
                              marketCap: r.marketCap,
                              logo: r.logo,
                              pinned: false,
                            })
                            setWatchlistSearchQuery('')
                          }}
                        >
                          <div className="search-result-left">
                            {r.logo && <img src={r.logo} alt="" className="watchlist-search-result-img" />}
                            <div className="search-result-info">
                              <div className="search-result-top">
                                <span className="watchlist-search-result-symbol">{r.symbol}</span>
                                {r.network && <span className="search-result-chain">{r.network}</span>}
                              </div>
                              <span className="watchlist-search-result-name">{r.name}</span>
                            </div>
                          </div>
                          <div className="search-result-right">
                            <div className="search-result-price">{r.formattedPrice}</div>
                            <div className={`search-result-change ${(r.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                              {(r.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(r.change || 0).toFixed(2)}%
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="watchlist-search-empty">{t('welcome.noTokensFound')}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Watchlist Filter/Sort Controls */}
            <div className="watchlist-controls">
              <div className="watchlist-sort-dropdown">
                <button 
                  className={`sort-btn ${watchlistSortDropdown ? 'active' : ''}`}
                  onClick={() => setWatchlistSortDropdown(!watchlistSortDropdown)}
                >
                  <span className="sort-btn-icon">{sortOptions.find(o => o.value === watchlistSort)?.icon || spectreIcons.list}</span>
                  {sortOptions.find(o => o.value === watchlistSort)?.label || t('leftPanel.sort')}
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`chevron ${watchlistSortDropdown ? 'up' : ''}`}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                {watchlistSortDropdown && (
                  <div className="sort-dropdown-menu">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        className={`sort-option ${watchlistSort === option.value ? 'active' : ''}`}
                        onClick={() => {
                          setWatchlistSort(option.value)
                          setWatchlistSortDropdown(false)
                        }}
                      >
                        <span className="sort-option-icon">{option.icon}</span>
                        {option.label}
                        {watchlistSort === option.value && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="watchlist-count">{t('leftPanel.tokensCount', { count: watchlist?.length || 0 })}</span>
            </div>

            {sortedWatchlist && sortedWatchlist.length > 0 ? (
              <div className="watchlist-items">
                {sortedWatchlist.map((token, index) => {
                  const symbol = (token.symbol || '').toUpperCase()
                  return (
                <div 
                  key={token.address || token.symbol} 
                    className={`watchlist-item token-row-${symbol.toLowerCase()} ${token.pinned ? 'pinned' : ''} ${dragOverItem === index ? 'drag-over' : ''}`}
                    data-token={symbol}
                    style={{ animationDelay: `${index * 50}ms`, cursor: 'pointer', ...(getTokenRowStyle(token.symbol) || {}) }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, token)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (selectToken) {
                        console.log('Watchlist click - token data:', {
                          symbol: token.symbol,
                          address: token.address,
                          networkId: token.networkId
                        });
                        selectToken({
                          symbol: token.symbol,
                          name: token.name,
                          address: token.address,
                          networkId: token.networkId || 1,
                          price: token.price,
                          change: token.change,
                          logo: token.logo
                        })
                      }
                    }}
                  >
                    <div className="drag-handle">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>
                  <div className="token-info">
                    <div 
                      className="token-avatar-ring watchlist-avatar-ring" 
                      style={getTokenAvatarRingStyle(token.symbol) || {}}
                    >
                      <div className={`token-avatar ${token.logo ? 'has-logo' : ''}`}>
                        {token.logo ? (
                          <img src={token.logo} alt={token.symbol} />
                        ) : (
                          <span>{token.symbol[0]}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="token-symbol">{token.symbol}</span>
                      <span className="token-name">{token.name}</span>
                    </div>
                  </div>
                    <div className="token-stats">
                    <span className="price">{fmtPrice(token.price)}</span>
                    <span className={`change ${token.change >= 0 ? 'positive' : 'negative'}`}>
                      {formatChange(token.change)}
                    </span>
                      <span className="mcap-value">{formatMarketCap(token.marketCap)}</span>
                  </div>
                    <div className="watchlist-actions">
                  <button 
                    className="remove-watchlist-btn"
                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(token.address || token.symbol); }}
                    title={t('leftPanel.removeFromWatchlist')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                      <button 
                        className={`pin-btn ${token.pinned ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); togglePinWatchlist(token.address || token.symbol); }}
                        title={token.pinned ? t('leftPanel.unpin') : t('leftPanel.pinToTop')}
                      >
                        <svg viewBox="0 0 24 24" fill={token.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                    </svg>
                  </button>
                </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="empty-watchlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <p>{t('watchlist.empty')}</p>
                <span>{marketMode === 'stocks' ? t('leftPanel.emptyWatchlistStocks') : t('leftPanel.emptyWatchlistCrypto')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: AI Logs */}
      <div className="panel-card bottom-section">
        <div className="bottom-tabs">
          <button
            className={`bottom-tab ${bottomTab === 'ai' ? 'active' : ''}`}
            onClick={() => setBottomTab('ai')}
          >
            <span className="tab-icon">{spectreIcons.chat}</span>
            {t('leftPanel.aiLogs')}
          </button>
        </div>

        <div className="bottom-content">
          {bottomTab === 'ai' && (
            <div className="ai-logs-list">
              {aiLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`log-item ${log.type}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="log-header">
                    <span className={`log-badge ${log.type}`}>
                      <span className="log-badge-icon">
                        {log.type === 'signal' ? spectreIcons.sector : log.type === 'alert' ? spectreIcons.liquidation : spectreIcons.news}
                      </span>
                      {log.type === 'signal' ? t('leftPanel.signal') : log.type === 'alert' ? t('leftPanel.alert') : t('leftPanel.info')}
                    </span>
                    <span className="log-time">{log.time}</span>
                  </div>
                  <div className="log-body">
                    <span className="log-title">{log.title}</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                  {log.confidence && (
                    <div className="log-confidence">
                      <span>{t('leftPanel.confidence')}</span>
                      <span className="confidence-value">{log.confidence}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Reply Modal */}
      {replyModal.open && createPortal(
        <div className="reply-modal-overlay" onClick={closeReplyModal}>
          <div className="reply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reply-modal-header">
              <span className="reply-modal-title">{t('leftPanel.replyTo', { handle: replyModal.tweet?.handle })}</span>
              <button className="reply-modal-close" onClick={closeReplyModal}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
                </svg>
              </button>
            </div>
            
            <div className="reply-modal-original">
              <img src={replyModal.tweet?.avatar} alt="" className="reply-tweet-avatar" />
              <div className="reply-tweet-content">
                <div className="reply-tweet-header">
                  <span className="reply-tweet-user">{replyModal.tweet?.user}</span>
                  <span className="reply-tweet-handle">{replyModal.tweet?.handle}</span>
                </div>
                <p className="reply-tweet-text">{replyModal.tweet?.content}</p>
              </div>
            </div>
            
            <div className="reply-input-area">
              <img src="/round-logo.png" alt="" className="reply-user-avatar" />
              <textarea
                className="reply-textarea"
                placeholder={t('leftPanel.postReply')}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={280}
                autoFocus
              />
            </div>
            
            <div className="reply-modal-footer">
              <span className="reply-char-count">{replyText.length}/280</span>
              <button 
                className="reply-submit-btn"
                onClick={submitReply}
                disabled={!replyText.trim()}
              >
                {t('leftPanel.reply')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default LeftPanel
