/**
 * TokenTicker Component
 * Dynamic scrolling bar of top trading tokens
 * Apple-style premium design with unique wow effects
 *
 * NOW WITH REAL-TIME DATA FROM CODEX API
 * SUPPORTS BOTH CRYPTO AND STOCK MODES
 *
 * UNIQUE FEATURES:
 * - Mini sparkline charts for each token
 * - Glowing pulse effect for top gainers
 * - Holographic shimmer on hover
 * - Live market pulse indicator
 * - Sentiment-based background gradient
 * - Floating animation for gainers
 */
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCuratedTokenPrices, useBinanceTopCoinPrices } from '../hooks/useCodexData'
import { useStockPrices } from '../hooks/useStockData'
import { TOP_STOCKS, getStockLogo } from '../constants/stockData'
import { useCurrency } from '../hooks/useCurrency'
import './TokenTicker.css'

// Stock symbols for ticker display - use top 15 from centralized data
const TICKER_STOCKS = TOP_STOCKS.slice(0, 15).map(s => s.symbol)

// Build stock info from centralized data
const STOCK_INFO = TOP_STOCKS.reduce((acc, stock) => {
  acc[stock.symbol] = { name: stock.name, sector: stock.sector }
  return acc
}, {})

// Get or create animation start time (persists across remounts)
const getAnimationStartTime = () => {
  const stored = sessionStorage.getItem('ticker-start-time')
  if (stored) return parseInt(stored, 10)
  const now = Date.now()
  sessionStorage.setItem('ticker-start-time', now.toString())
  return now
}

const TokenTicker = ({ selectToken, selectedToken, onTokenClickOpenOverlay, embedded = false, tokens: tokensProp, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const { fmtPrice } = useCurrency()
  const [isPaused, setIsPaused] = useState(false)
  // Removed pulseIntensity state - now handled by CSS
  const trackRef = useRef(null)
  const contentRef = useRef(null) // Ref to measure single set of tokens
  const animationStartTime = useRef(getAnimationStartTime())
  const isPausedRef = useRef(isPaused)

  const isStocks = marketMode === 'stocks'

  // Keep isPausedRef in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // List of symbols to fetch prices for (including SPECTRE)
  const symbolsToFetch = useMemo(() => ['SPECTRE', 'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'UNI', 'AAVE', 'LINK', 'GRT', 'MKR', 'CRV', 'SUSHI'], [])

  // Fetch crypto prices from CoinGecko (full data, 60s refresh) - skip when using external tokens or in stock mode
  const { prices: coinGeckoPrices, loading, error } = useCuratedTokenPrices((tokensProp || isStocks) ? [] : symbolsToFetch, 60 * 1000)
  // Fetch real-time crypto prices from Binance (price + change only, 5s refresh) - skip when using external tokens or in stock mode
  const { prices: binancePrices } = useBinanceTopCoinPrices((tokensProp || isStocks) ? [] : symbolsToFetch, 5000)

  // Fetch stock prices when in stock mode
  const { prices: stockPrices, loading: stockLoading } = useStockPrices(isStocks && !tokensProp ? TICKER_STOCKS : [], 10000)

  // Merge: Binance real-time prices take priority, CoinGecko provides additional data
  const livePrices = useMemo(() => {
    const merged = { ...coinGeckoPrices }
    Object.keys(binancePrices || {}).forEach(symbol => {
      const binanceData = binancePrices[symbol]
      if (binanceData?.price > 0) {
        merged[symbol] = {
          ...merged[symbol],
          price: binanceData.price,
          change: binanceData.change ?? merged[symbol]?.change,
        }
      }
    })
    return merged
  }, [coinGeckoPrices, binancePrices])

  // Helper to generate Codex/Defined.fi logo URL
  const getCodexLogo = (address, networkId = 1) => 
    `https://token-media.defined.fi/${networkId}_${address.toLowerCase()}_large.png`

  // Curated tokens list - using Codex for most, cryptologos.cc for tokens where Codex has bad/missing logos
  const curatedTokens = [
    // SPECTRE - our own logo
    { symbol: 'SPECTRE', name: 'Spectre AI', price: 0, change: 0, logo: '/round-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], featured: true, address: '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6', networkId: 1 },
    // cryptologos.cc - Codex has bad/missing logos for these
    { symbol: 'DOGE', name: 'Dogecoin', price: 0, change: 0, logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x4206931337dc273a630d328dA6441786BfaD668f', networkId: 1 },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0, change: 0, logo: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', networkId: 1 },
    { symbol: 'AAVE', name: 'Aave', price: 0, change: 0, logo: 'https://cryptologos.cc/logos/aave-aave-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', networkId: 1 },
    { symbol: 'CRV', name: 'Curve', price: 0, change: 0, logo: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0xD533a949740bb3306d119CC777fa900bA034cd52', networkId: 1 },
    { symbol: 'SUSHI', name: 'SushiSwap', price: 0, change: 0, logo: 'https://cryptologos.cc/logos/sushiswap-sushi-logo.png', sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', networkId: 1 },
    // Codex logos - these have good quality logos on Codex
    { symbol: 'PEPE', name: 'Pepe', price: 0, change: 0, logo: getCodexLogo('0x6982508145454Ce325dDbE47a25d4ec3d2311933', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', networkId: 1 },
    { symbol: 'FLOKI', name: 'Floki', price: 0, change: 0, logo: getCodexLogo('0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E', networkId: 1 },
    { symbol: 'UNI', name: 'Uniswap', price: 0, change: 0, logo: getCodexLogo('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', networkId: 1 },
    { symbol: 'LINK', name: 'Chainlink', price: 0, change: 0, logo: getCodexLogo('0x514910771AF9Ca656af840dff83E8264EcF986CA', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', networkId: 1 },
    { symbol: 'GRT', name: 'The Graph', price: 0, change: 0, logo: getCodexLogo('0xc944E90C64B2c07662A292be6244BDf05Cda44a7', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', networkId: 1 },
    { symbol: 'MKR', name: 'Maker', price: 0, change: 0, logo: getCodexLogo('0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', 1), sparkline: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', networkId: 1 },
  ]

  // Generate sparkline from price change data
  const generateSparklineFromChange = (change) => {
    // Generate a realistic sparkline based on 24h change
    const points = []
    let current = 50
    
    for (let i = 0; i < 12; i++) {
      // Add some randomness but trend towards the final change
      const progress = i / 11
      const targetDelta = (change / 100) * 50 * progress
      const noise = (Math.random() - 0.5) * 10
      current = 50 + targetDelta + noise
      points.push(Math.max(10, Math.min(90, current)))
    }
    
    // Ensure the last point reflects the actual change direction
    points[11] = change >= 0 ? Math.max(points[10], 60 + change) : Math.min(points[10], 40 + change)
    
    return points
  }

  // When external tokens prop is provided (e.g. from WelcomePage), normalize and use those
  const tokensFromProp = useMemo(() => {
    if (!tokensProp || !Array.isArray(tokensProp) || tokensProp.length === 0) return null
    return tokensProp.map((t, i) => {
      const change = typeof t.change === 'number' ? t.change : parseFloat(t.change) || 0
      return {
        symbol: t.symbol,
        name: t.name || t.symbol,
        address: t.address,
        networkId: t.networkId ?? 1,
        logo: t.logo,
        price: typeof t.price === 'number' ? t.price : parseFloat(t.price) || 0,
        change,
        sparkline: generateSparklineFromChange(change),
        hasLiveData: true,
        featured: (t.symbol || '').toUpperCase() === 'SPECTRE',
        rank: i + 1,
      }
    })
  }, [tokensProp])

  // Merge curated tokens with live market data (when not using external tokens)
  const tokensCurated = useMemo(() => {
    // Map curated tokens with live price data when available
    const result = curatedTokens.map(token => {
      const liveData = livePrices[token.symbol.toUpperCase()]

      if (liveData) {
        const price = parseFloat(liveData.price) || 0
        const change = parseFloat(liveData.change) || 0

        if (price > 0) {
          console.log(`✓ Live data for ${token.symbol}: $${price}, ${change}%`)
          return {
            ...token,
            price: price,
            change: change,
            sparkline: generateSparklineFromChange(change),
            hasLiveData: true
          }
        }
      }

      // No live data found - use curated/fallback data
      return {
        ...token,
        hasLiveData: false
      }
    })

    const withLiveData = result.filter(t => t.hasLiveData).length
    if (withLiveData > 0) {
      console.log(`TokenTicker: ${withLiveData}/${result.length} tokens with live data`)
    }

    return result
  }, [livePrices])

  // Stock tokens with live price data
  const tokensStock = useMemo(() => {
    if (!isStocks) return []

    return TICKER_STOCKS.map((symbol, index) => {
      const priceData = stockPrices?.[symbol]
      const info = STOCK_INFO[symbol] || { name: symbol, sector: 'Unknown' }
      const price = priceData?.price || 0
      const change = priceData?.change || 0

      return {
        symbol,
        name: info.name,
        logo: getStockLogo(symbol, info.sector),
        price,
        change,
        sparkline: generateSparklineFromChange(change),
        hasLiveData: price > 0,
        featured: symbol === 'SPY', // Feature the S&P 500 ETF
        rank: index + 1,
        isStock: true,
        sector: info.sector,
      }
    })
  }, [isStocks, stockPrices])

  // Final tokens: external prop > stock mode > crypto mode
  // Use tokensFromProp only if it's a valid array with items
  const tokens = (tokensFromProp && tokensFromProp.length > 0) ? tokensFromProp : (isStocks ? tokensStock : tokensCurated)

  // Calculate overall market sentiment
  const marketSentiment = useMemo(() => {
    if (!tokens || tokens.length === 0) return 'neutral'
    const avgChange = tokens.reduce((sum, t) => sum + (t.change || 0), 0) / tokens.length
    return avgChange > 2 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'
  }, [tokens])

  // Pulse intensity now handled by CSS animation - no JS interval needed

  // JavaScript-based animation - optimized to stop when hidden
  useEffect(() => {
    const PIXELS_PER_SECOND = 50 // Speed: 50 pixels per second
    const startTime = animationStartTime.current
    let rafId = null
    let contentWidth = 0
    let currentDisplayPosition = 0 // What's currently shown
    let lastFrameTime = 0
    const MIN_FRAME_INTERVAL = 1000 / 30 // Cap at 30fps for performance

    const getTargetPosition = () => {
      const elapsed = Date.now() - startTime
      const pixelOffset = (elapsed / 1000) * PIXELS_PER_SECOND
      return contentWidth > 0 ? pixelOffset % contentWidth : 0
    }

    const animate = (timestamp) => {
      // Stop animation when document is hidden
      if (document.hidden) {
        rafId = requestAnimationFrame(animate)
        return
      }

      // Frame rate limiting - skip frames to reduce CPU usage
      if (timestamp - lastFrameTime < MIN_FRAME_INTERVAL) {
        rafId = requestAnimationFrame(animate)
        return
      }
      lastFrameTime = timestamp

      if (!isPausedRef.current && trackRef.current) {
        // Measure content width on first frame
        if (contentWidth === 0 && contentRef.current) {
          contentWidth = contentRef.current.offsetWidth
          currentDisplayPosition = getTargetPosition()
        }

        if (contentWidth > 0) {
          const targetPosition = getTargetPosition()

          // Calculate the difference (accounting for loop)
          let diff = targetPosition - currentDisplayPosition

          // Handle wrap-around
          if (diff > contentWidth / 2) {
            diff -= contentWidth
          } else if (diff < -contentWidth / 2) {
            diff += contentWidth
          }

          // If we're behind, catch up smoothly
          if (Math.abs(diff) > 5) {
            currentDisplayPosition += diff * 0.15 // Faster catch-up
          } else {
            currentDisplayPosition = targetPosition
          }

          // Keep position in bounds
          if (currentDisplayPosition < 0) currentDisplayPosition += contentWidth
          if (currentDisplayPosition >= contentWidth) currentDisplayPosition -= contentWidth

          trackRef.current.style.transform = `translateX(-${currentDisplayPosition}px)`
        }
      }
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, []) // Empty dependency - only run once on mount

  // Generate sparkline SVG path
  const generateSparklinePath = (data, width = 48, height = 20) => {
    if (!data || data.length === 0) return 'M0,10 L48,10'
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)
    
    const points = data.map((val, i) => {
      const x = i * step
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    
    return `M${points.join(' L')}`
  }

  // Track last click to prevent rapid re-clicks
  const lastClickRef = useRef({ symbol: null, time: 0 })
  
  // Handle token click - open overlay when onTokenClickOpenOverlay provided, else select token (navigate to screener)
  const handleTokenClick = (e, token) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Debounce: prevent clicking same token within 500ms
    const now = Date.now()
    if (lastClickRef.current.symbol === token.symbol && 
        now - lastClickRef.current.time < 500) {
      console.log('TokenTicker: Debounced click on', token.symbol)
      return
    }
    
    lastClickRef.current = { symbol: token.symbol, time: now }
    console.log('TokenTicker clicked:', token.symbol, 'address:', token.address)
    
    if (onTokenClickOpenOverlay) {
      onTokenClickOpenOverlay(token)
      return
    }
    if (selectToken) {
      selectToken({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        networkId: token.networkId,
        logo: token.logo,
        price: token.price,
        change: token.change,
      })
    }
  }

  // Token item renderer
  const renderToken = (token, index, isFirstSet) => {
    const isTopGainer = (token.change || 0) > 5
    const isLoser = (token.change || 0) < 0
    const rank = (index % tokens.length) + 1
    
    // Check if this token is currently selected (compare by address or symbol)
    const isSelected = selectedToken && (
      (token.address && selectedToken.address && 
       token.address.toLowerCase() === selectedToken.address.toLowerCase()) ||
      (!token.address && token.symbol === selectedToken.symbol)
    )
    
    return (
      <div 
        key={`${token.symbol}-${index}-${isFirstSet ? 'a' : 'b'}`} 
        className={`ticker-item ${isTopGainer ? 'top-gainer' : ''} ${token.featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleTokenClick(e, token)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTokenClick(e, token) }}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label={`Select ${token.symbol}`}
        tabIndex={0}
      >
        <div className="ticker-item-inner" style={{ pointerEvents: 'none' }}>
          <div className="holographic-shimmer" />
          {isTopGainer && <div className="gainer-glow" />}
          <div className={`ticker-rank ${rank <= 3 ? 'top-three' : ''}`}>
            #{rank}
          </div>
          <div className="ticker-logo">
            <img 
              src={token.logo} 
              alt={token.symbol} 
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/40/8B5CF6/FFFFFF?text=${token.symbol?.charAt(0) || '?'}`
              }}
            />
            {token.featured && <div className="featured-ring" />}
          </div>
          <div className="ticker-info">
            <span className="ticker-symbol">{token.symbol}</span>
            <span className="ticker-name">{token.name}</span>
          </div>
          <div className="ticker-sparkline">
            <svg viewBox="0 0 48 20" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`spark-grad-${token.symbol}-${index}-${isFirstSet ? 'a' : 'b'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isLoser ? '#ef4444' : '#10b981'} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={isLoser ? '#ef4444' : '#10b981'} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={`${generateSparklinePath(token.sparkline)} L48,20 L0,20 Z`}
                fill={`url(#spark-grad-${token.symbol}-${index}-${isFirstSet ? 'a' : 'b'})`}
              />
              <path 
                d={generateSparklinePath(token.sparkline)}
                fill="none"
                stroke={isLoser ? '#ef4444' : '#10b981'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="sparkline-path"
              />
              <circle 
                cx="48" 
                cy={token.sparkline ? 20 - ((token.sparkline[token.sparkline.length - 1] - Math.min(...token.sparkline)) / (Math.max(...token.sparkline) - Math.min(...token.sparkline) || 1)) * 20 : 10}
                r="2"
                fill={isLoser ? '#ef4444' : '#10b981'}
                className="sparkline-dot"
              />
            </svg>
          </div>
          <div className="ticker-price-section">
            <span className="ticker-price">
              {fmtPrice(token.price)}
              {token.hasLiveData && <span className="live-indicator" title={t('ticker.realTimeData')}>●</span>}
            </span>
            <span className={`ticker-change ${(parseFloat(token.change) || 0) >= 0 ? 'positive' : 'negative'}`}>
              <span className="change-arrow">{(parseFloat(token.change) || 0) >= 0 ? '▲' : '▼'}</span>
              {(() => {
                // API returns change as decimal (e.g., -0.0557 = -5.57%)
                const change = parseFloat(token.change) || 0;
                // If change is already > 1 or < -1, it's already in percentage form
                const isPercentForm = Math.abs(change) > 1;
                const pct = isPercentForm ? Math.abs(change) : Math.abs(change * 100);
                return pct.toFixed(2);
              })()}%
            </span>
          </div>
        </div>
        <div className="ticker-divider" />
      </div>
    )
  }

  const tickerContent = (
    <div 
      className={`token-ticker sentiment-${marketSentiment}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated gradient background based on sentiment */}
      <div className="ticker-sentiment-bg" />
      
      {/* Live market pulse indicator - LEFT */}
      <div className="market-pulse left">
        <div className="pulse-ring" />
        <div className="pulse-dot" />
        <span className="pulse-label">{tokensFromProp ? t('ticker.live') : ((loading || stockLoading) ? t('common.loading').toUpperCase() : t('ticker.live'))}</span>
      </div>
      
      {/* Trending indicator - RIGHT */}
      <div className="market-pulse right">
        <div className="trending-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 6l-9.5 9.5-5-5L1 18" />
            <path d="M17 6h6v6" />
          </svg>
        </div>
        <span className="pulse-label">{isStocks ? t('nav.stocks').toUpperCase() : t('nav.crypto').toUpperCase()} {tokens.length}</span>
      </div>
      
      <div className="ticker-glow-left" />
      <div className="ticker-glow-right" />
      
      <div
        ref={trackRef}
        className={`ticker-track ${isPaused ? 'paused' : ''}`}
      >
        {/* First set of tokens - with ref for measurement */}
        <div ref={contentRef} className="ticker-content-set">
          {(tokens || []).map((token, index) => renderToken(token, index, true))}
        </div>
        {/* Duplicate set for seamless loop */}
        <div className="ticker-content-set">
          {(tokens || []).map((token, index) => renderToken(token, index, false))}
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return <div className="token-ticker-embedded">{tickerContent}</div>
  }
  return tickerContent
}

export default TokenTicker
