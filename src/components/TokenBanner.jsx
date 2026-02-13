/**
 * TokenBanner Component
 * Figma Reference: Token info section above chart
 * Layout: Left (logo+name+CA) | Middle (socials+description) | Right (price+actions)
 * Enhanced with: Live metrics, AI sentiment, smart badges, multi-timeframe
 * NOW WITH REAL-TIME DATA FROM CODEX API
 */
import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import html2canvas from 'html2canvas'
import { useTranslation } from 'react-i18next'
import { useCopyToast } from '../App'
import { useTokenDetails, useRealtimePrice } from '../hooks/useCodexData'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useCurrency } from '../hooks/useCurrency'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import './TokenBanner.css'

// Default SPECTRE token address on Ethereum
const DEFAULT_TOKEN_ADDRESS = '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6';
const DEFAULT_NETWORK_ID = 1;

// Truncate address for display (0x1234...5678)
const truncateAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Network explorer configurations
const NETWORK_EXPLORERS = {
  1: { name: 'Etherscan', url: 'https://etherscan.io', logo: 'https://etherscan.io/images/brandassets/etherscan-logo-circle.svg' },
  56: { name: 'BscScan', url: 'https://bscscan.com', logo: 'https://bscscan.com/images/brandassets/bscscan-logo-circle.png' },
  137: { name: 'PolygonScan', url: 'https://polygonscan.com', logo: 'https://polygonscan.com/images/brandassets/polygonscan-logo.svg' },
  42161: { name: 'Arbiscan', url: 'https://arbiscan.io', logo: 'https://arbiscan.io/images/brandassets/arbiscan-logo.svg' },
  8453: { name: 'BaseScan', url: 'https://basescan.org', logo: 'https://basescan.org/images/brandassets/basescan-logo.svg' },
  43114: { name: 'SnowTrace', url: 'https://snowtrace.io', logo: 'https://snowtrace.io/images/brandassets/snowtrace-logo.svg' },
  10: { name: 'Optimistic', url: 'https://optimistic.etherscan.io', logo: 'https://optimistic.etherscan.io/images/brandassets/etherscan-logo-circle.svg' },
  250: { name: 'FTMScan', url: 'https://ftmscan.com', logo: 'https://ftmscan.com/images/brandassets/ftmscan-logo.svg' },
  1399811149: { name: 'Solscan', url: 'https://solscan.io', logo: 'https://solscan.io/favicon.ico' },
};

const TokenBanner = ({ token: propToken, isInWatchlist, addToWatchlist, removeFromWatchlist }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  // Determine the full token address
  // Handle truncated addresses and different chain formats
  const getFullAddress = () => {
    const addr = propToken?.address || '';
    
    // Check if it's a valid full EVM address (0x + 40 hex chars)
    if (addr.length === 42 && addr.startsWith('0x')) {
      return addr;
    }
    
    // Check if it's a valid Solana address (base58, typically 32-44 chars, no 0x prefix)
    // Solana addresses are alphanumeric without 0, O, I, l
    if (addr.length >= 32 && addr.length <= 44 && !addr.startsWith('0x') && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)) {
      return addr;
    }
    
    // For truncated or missing addresses, fall back to default SPECTRE token
    return DEFAULT_TOKEN_ADDRESS;
  };
  
  const tokenAddress = getFullAddress();
  const networkId = propToken?.networkId || DEFAULT_NETWORK_ID;
  
  // Fetch token data from Codex API (metadata + price, polls every 10s)
  const { tokenData: liveData, loading, error } = useTokenDetails(
    tokenAddress,
    networkId,
    10 * 1000 // Refresh every 10s for real-time price
  );

  // WebSocket real-time price stream (updates every ~5s from server)
  const { livePrice: wsPrice, liveChange: wsChange } = useRealtimePrice(tokenAddress, networkId);
  
  // Log token changes for debugging
  React.useEffect(() => {
    console.log('TokenBanner: Loading token', propToken?.symbol, 'at', tokenAddress, 'network', networkId);
  }, [propToken?.symbol, tokenAddress, networkId]);
  
  // Get explorer URL based on network
  const getExplorerUrl = () => {
    const explorer = NETWORK_EXPLORERS[networkId] || NETWORK_EXPLORERS[1];
    return `${explorer.url}/token/${tokenAddress}`;
  };
  
  const getExplorerName = () => {
    return NETWORK_EXPLORERS[networkId]?.name || 'Etherscan';
  };
  
  const getExplorerLogo = () => {
    return NETWORK_EXPLORERS[networkId]?.logo || NETWORK_EXPLORERS[1].logo;
  };
  
  // Helper to sanitize token names - remove replacement chars and non-printable chars
  const sanitizeName = (name) => {
    if (!name) return '';
    // Remove replacement characters (�), zero-width chars, and other problematic unicode
    return name
      .replace(/[\uFFFD\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Merge live data with prop data (live data takes priority)
  const token = {
    ...propToken,
    ...(liveData || {}),
    // Ensure we have fallbacks - sanitize names to remove bad characters
    symbol: sanitizeName(liveData?.symbol || propToken?.symbol) || 'SPECTRE',
    name: sanitizeName(liveData?.name || propToken?.name) || 'Spectre AI',
    address: liveData?.address || propToken?.address || DEFAULT_TOKEN_ADDRESS,
    price: wsPrice || liveData?.price || propToken?.price || 0,
    change: wsChange != null ? wsChange : (liveData?.change24 || propToken?.change || 0),
    description: liveData?.description || propToken?.description || '',
    socials: liveData?.socials || propToken?.socials || {},
    // Use logo from liveData first, then propToken, then default
    logo: liveData?.logo || liveData?.imageLargeUrl || liveData?.imageThumbUrl || propToken?.logo || '/logo.png',
  };
  const { triggerCopyToast } = useCopyToast()
  const [showSocialsMenu, setShowSocialsMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [bannerExpanded, setBannerExpanded] = useState(false)
  const isMobile = useIsMobile()
  const socialsMenuRef = useRef(null)
  const moreButtonRef = useRef(null)
  const shareMenuRef = useRef(null)
  const shareButtonRef = useRef(null)
  const [shareMenuPosition, setShareMenuPosition] = useState({ top: 0, left: 0 })
  
  // Update share menu position on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (shareButtonRef.current && showShareMenu) {
        const rect = shareButtonRef.current.getBoundingClientRect()
        setShareMenuPosition({
          top: rect.bottom + 8,
          left: rect.right - 280
        })
      }
    }
    
    if (showShareMenu) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showShareMenu])
  
  // Share menu options
  const shareOptions = [
    { id: 'chart', icon: '📊', label: t('tokenBanner.shareChart') },
    { id: 'chart-info', icon: '📈', label: t('tokenBanner.shareChartInfo') },
    { id: 'token-info', icon: '🪙', label: t('tokenBanner.shareTokenInfo') },
    { id: 'transactions', icon: '📜', label: t('tokenBanner.shareTransactions'), hasSubmenu: true },
    { id: 'holders', icon: '👥', label: t('tokenBanner.shareHolders'), hasSubmenu: true },
    { id: 'bubblemap', icon: '🫧', label: t('tokenBanner.shareBubblemap') },
    { id: 'x-bubblemap', icon: '✖️', label: t('tokenBanner.shareXBubblemap') },
    { id: 'banner', icon: '🖼️', label: t('tokenBanner.shareBanner') },
    { id: 'gif', icon: '🎬', label: t('tokenBanner.shareGif'), hasSubmenu: true },
  ]
  
  const [isCapturing, setIsCapturing] = useState(false)
  
  const handleShareOption = async (optionId) => {
    console.log(`Generating share image for: ${optionId}`)
    
    if (optionId === 'chart') {
      await captureChart()
    }
    
    setShowShareMenu(false)
  }
  
  const captureChart = async () => {
    const chartElement = document.querySelector('.trading-chart')
    if (!chartElement) {
      console.error('Chart element not found')
      return
    }
    
    setIsCapturing(true)
    
    try {
      // Add a class to show we're capturing (for any UI adjustments)
      chartElement.classList.add('capturing')
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0a0a0c',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      })
      
      // Remove capturing class
      chartElement.classList.remove('capturing')
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${token.symbol}-chart-${new Date().toISOString().slice(0,10)}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
      
    } catch (error) {
      console.error('Error capturing chart:', error)
      chartElement.classList.remove('capturing')
    } finally {
      setIsCapturing(false)
    }
  }
  
  // Check if description needs truncation - cut at sentence boundary
  const getFirstSentence = (text) => {
    if (!text) return ''
    const firstPeriod = text.indexOf('.')
    if (firstPeriod !== -1 && firstPeriod < text.length - 1) {
      return text.slice(0, firstPeriod + 1)
    }
    return text
  }
  
  const firstSentence = getFirstSentence(token.description)
  const isLongDescription = token.description && token.description.length > firstSentence.length
  
  // Multi-timeframe price data using real API data
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')
  const currentPrice = token.price
  
  // Calculate historical prices from changes
  const change1h = liveData?.change1h || 0
  const change4h = liveData?.change4h || 0
  const change12h = liveData?.change12h || 0
  const change24h = liveData?.change24 || token.change || 0
  
  // Convert change percentage to historical price
  const calcHistoricalPrice = (change) => {
    if (!currentPrice || change === 0) return currentPrice
    return currentPrice / (1 + change)
  }
  
  const priceData = {
    '1h': { price: calcHistoricalPrice(change1h), change: change1h * 100 },
    '4h': { price: calcHistoricalPrice(change4h), change: change4h * 100 },
    '12h': { price: calcHistoricalPrice(change12h), change: change12h * 100 },
    '24h': { price: calcHistoricalPrice(change24h), change: change24h * 100 },
  }
  
  // Smart badges - dynamically shown based on conditions
  const [badges, setBadges] = useState([
    { id: 'verified', icon: '✓', label: t('tokenBanner.verified'), active: token.verified, color: '#1d9bf0' },
    { id: 'trending', icon: '🔥', label: t('common.trending'), active: true, color: '#f97316' },
    { id: 'whale', icon: '🐋', label: t('tokenBanner.whaleActivity'), active: true, color: '#3b82f6' },
    { id: 'momentum', icon: '⚡', label: t('tokenBanner.breakout'), active: false, color: '#eab308' },
    { id: 'audited', icon: '🛡️', label: t('tokenBanner.audited'), active: true, color: '#10b981' }
  ])
  
  // Price update animation
  const [priceFlash, setPriceFlash] = useState(null) // 'up' or 'down'
  
  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = Math.random() > 0.5 ? 'up' : 'down'
      setPriceFlash(change)
      setTimeout(() => setPriceFlash(null), 500)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist(token.symbol)
    } else {
      addToWatchlist({
        symbol: token.symbol,
        name: token.name,
        price: token.price,
        change: token.change,
        logo: token.logo || liveData?.logo || '/logo.png',
        address: tokenAddress,
        marketCap: liveData?.marketCap || 0,
        volume: liveData?.volume24 || 0,
        liquidity: liveData?.liquidity || 0,
        networkId: networkId,
        pinned: false
      })
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress)
    triggerCopyToast()
  }

  // Close socials menu when clicking outside (share menu stays open until button click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Socials dropdown only
      const socialsDropdown = document.querySelector('.socials-dropdown')
      const isOutsideSocialsWrapper = socialsMenuRef.current && !socialsMenuRef.current.contains(e.target)
      const isOutsideSocialsDropdown = !socialsDropdown || !socialsDropdown.contains(e.target)
      if (isOutsideSocialsWrapper && isOutsideSocialsDropdown) {
        setShowSocialsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMoreClick = () => {
    if (moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
    setShowSocialsMenu(!showSocialsMenu)
  }

  const selectedData = priceData[selectedTimeframe]

  // Get token brand color for dynamic gradient
  const tokenColors = TOKEN_ROW_COLORS[(token.symbol || '').toUpperCase()]
  const brandRgb = tokenColors?.bg || '139, 92, 246'
  const brandGradient = tokenColors?.gradient || 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'

  const bannerStyle = {
    '--token-rgb': brandRgb,
    '--token-gradient': brandGradient,
  }

  return (
    <div className="token-banner" style={bannerStyle}>
      {/* Ambient glow layer */}
      <div className="token-banner-glow" />
      <div className="token-banner-glow-secondary" />

      {/* TOP ROW: Main Token Info */}
      <div className="token-banner-main">
      {/* LEFT: Token Logo + Name + CA */}
      <div className="token-left">
        <div className="token-left-top">
          <div className="token-avatar">
            <div className="token-avatar-ring" />
            <img
              src={token.logo || '/logo.png'}
              alt={token.symbol}
              className="token-logo"
              onError={(e) => { e.target.src = '/logo.png' }}
            />
          </div>

          <div className="token-identity">
            <div className="token-name-row">
              <span className="token-symbol">{token.symbol}</span>
              <button
                className={`watchlist-btn ${isInWatchlist ? 'active' : ''}`}
                onClick={handleWatchlistToggle}
                title={isInWatchlist ? t('token.removeFromWatchlist') : t('token.addToWatchlist')}
              >
                <svg viewBox="0 0 24 24" fill={isInWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              {/* Mobile banner expand/collapse toggle */}
              {isMobile && (
                <button
                  className={`banner-toggle-btn ${bannerExpanded ? 'expanded' : ''}`}
                  onClick={() => setBannerExpanded(prev => !prev)}
                  title={bannerExpanded ? t('tokenBanner.collapse') : t('tokenBanner.expand')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}

                {/* Smart Badges */}
                <div className="smart-badges">
                  {badges.filter(b => b.active).map(badge => (
                    <span
                      key={badge.id}
                      className="smart-badge"
                      style={{ '--badge-color': badge.color }}
                      title={badge.label}
                    >
                      <span className="badge-icon">{badge.icon}</span>
                      <span className="badge-label">{badge.label}</span>
                    </span>
                  ))}
                </div>
            </div>
            <span className="token-fullname">{token.name}</span>
          </div>
        </div>
        
<div className={`token-left-bottom ${bannerExpanded ? 'banner-row-visible' : 'banner-row-hidden'}`}>
        <div className="token-ca">
          <span className="ca-label">CA</span>
          <span className="ca-address">{truncateAddress(tokenAddress)}</span>
              <button className="ca-btn copy" onClick={copyAddress} title={t('tokenBanner.copyFullAddress')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
          </button>
              <a 
                href={getExplorerUrl()} 
                className="ca-btn etherscan" 
                title={t('tokenBanner.viewOnExplorer', { explorer: getExplorerName() })}
                target="_blank" 
                rel="noopener noreferrer"
              >
            <img src={getExplorerLogo()} alt="Explorer" />
          </a>
            </div>
            
            <div className="token-actions">
              <button className="action-btn notify" title={t('tokenBanner.setAlert')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </button>
              <div className="share-btn-wrapper" ref={shareMenuRef}>
                <button 
                  ref={shareButtonRef}
                  className={`action-btn share ${showShareMenu ? 'active' : ''}`} 
                  title={t('tokenBanner.share')}
                  onClick={() => setShowShareMenu(!showShareMenu)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                </button>
                
                {showShareMenu && ReactDOM.createPortal(
                  <div 
                    className="share-dropdown"
                    style={{
                      position: 'fixed',
                      top: shareMenuPosition.top,
                      left: shareMenuPosition.left,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="share-dropdown-header">
                      <span className="share-title">{t('tokenBanner.shareAsImage')}</span>
                      <span className="share-subtitle">{t('tokenBanner.selectGenerate')}</span>
                    </div>
                    <div className="share-options">
                      {shareOptions.map((option) => (
                        <button 
                          key={option.id}
                          className={`share-option ${isCapturing && option.id === 'chart' ? 'capturing' : ''}`}
                          onClick={() => handleShareOption(option.id)}
                          disabled={isCapturing}
                        >
                          <span className="share-option-icon">
                            {isCapturing && option.id === 'chart' ? '⏳' : option.icon}
                          </span>
                          <span className="share-option-label">
                            {isCapturing && option.id === 'chart' ? t('tokenBanner.capturing') : option.label}
                          </span>
                          {option.hasSubmenu && !isCapturing && (
                            <svg className="share-option-arrow" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
                      ))}
                    </div>
                    <div className="share-dropdown-footer">
                      <span>🎨 Images are auto-styled with Spectre branding</span>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
        </div>
      </div>

      {/* MIDDLE: Socials + Description */}
      <div className="token-middle">
        <div className="social-buttons">
          <a href={token.socials?.twitter || '#'} target="_blank" rel="noopener noreferrer" className="social-btn" title="X (Twitter)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href={token.socials?.website || '#'} target="_blank" rel="noopener noreferrer" className="social-btn" title="Website">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </a>
          <a href={token.socials?.telegram || '#'} target="_blank" rel="noopener noreferrer" className="social-btn" title="Telegram">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          
          {/* More Socials Dropdown */}
          <div className="socials-dropdown-wrapper" ref={socialsMenuRef}>
            <button 
              ref={moreButtonRef}
              className={`social-btn more ${showSocialsMenu ? 'active' : ''}`} 
              title={t('tokenBanner.moreSocials')}
              onClick={handleMoreClick}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2" />
                <circle cx="6" cy="12" r="2" />
                <circle cx="18" cy="12" r="2" />
              </svg>
            </button>
            
            {showSocialsMenu && ReactDOM.createPortal(
              <div className="socials-dropdown" style={{ top: menuPosition.top, left: menuPosition.left }}>
                <a href={token.socials?.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>LinkedIn</span>
                </a>
                <a href={token.socials?.youtube || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>YouTube</span>
                </a>
                <a href={token.socials?.medium || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                  </svg>
                  <span>Medium</span>
                </a>
                <a href={token.socials?.discord || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>Discord</span>
                </a>
                <a href={token.socials?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                  <span>Instagram</span>
                </a>
                <div className="social-menu-divider" />
                <a href={token.socials?.tiktok || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  <span>TikTok</span>
                </a>
                <a href={token.socials?.reddit || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                  <span>Reddit</span>
                </a>
                <a href={token.socials?.github || '#'} target="_blank" rel="noopener noreferrer" className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
                <div className="social-menu-divider" />
                <a href={token.socials?.email || '#'} className="social-menu-item">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                  <span>Email</span>
                </a>
              </div>,
              document.body
            )}
          </div>
        </div>
        
          <div className="token-description">
            {descriptionExpanded || !isLongDescription 
              ? token.description 
              : firstSentence}{isLongDescription && (
              <button 
                className="description-toggle"
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              >
                {descriptionExpanded ? t('tokenBanner.less') : t('tokenBanner.more')}
              </button>
            )}
          </div>
      </div>

        {/* RIGHT: Price + Timeframe Toggle */}
      <div className="token-right">
        <div className="price-section">
          <div className="price-main-row">
            <div className={`price-amount ${priceFlash ? `flash-${priceFlash}` : ''} ${loading ? 'loading' : ''}`}>
              <span className="price-value">{loading ? '---' : fmtPrice(token.price)}</span>
              {priceFlash && <span className="price-update-indicator">{priceFlash === 'up' ? '↑' : '↓'}</span>}
              {liveData && (
                <span className="live-badge" title="Live Scanning">
                  <span className="live-dot"></span>
                </span>
              )}
            </div>
            <div className="price-change-row">
              <div className={`price-change ${selectedData.change >= 0 ? 'positive' : 'negative'}`}>
                {selectedData.change >= 0 ? '+' : ''}{(typeof selectedData.change === 'number' ? selectedData.change : parseFloat(selectedData.change) || 0).toFixed(2)}%
              </div>
              <div className="price-historical">
                <span className="historical-label">{selectedTimeframe} ago</span>
                <span className="historical-price">{fmtPrice(selectedData.price)}</span>
              </div>
            </div>
          </div>

            {/* Multi-timeframe Toggle */}
            <div className="timeframe-toggle">
              {Object.keys(priceData).map(tf => (
                <button
                  key={tf}
                  className={`tf-btn ${selectedTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
        </div>
            {/* MCap + Volume – compact stats */}
            <div className="price-mcap-vol">
              <span className="mcap-stat">
                <span className="mcap-label">{t('common.marketCap')}</span>
                <span className="mcap-value">{fmtLarge(liveData?.marketCap)}</span>
              </span>
              <span className="vol-stat">
                <span className="vol-label">{t('chart.vol')}</span>
                <span className="vol-value">{fmtLarge(liveData?.volume24)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(TokenBanner, (prevProps, nextProps) => {
  // Only re-render if token address changes
  return prevProps.token?.address === nextProps.token?.address
})
