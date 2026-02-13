/**
 * RightPanel Component
 * Figma Reference: Right sidebar
 * Research Zone banner + Market Stats + Trading Panel
 * 
 * NOW WITH REAL-TIME DATA FROM CODEX API
 */
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTokenDetails } from '../hooks/useCodexData'
import { useCurrency } from '../hooks/useCurrency'
import './RightPanel.css'

// Generate a consistent color from any string (token symbol/address)
const generateColorFromString = (str) => {
  if (!str) return '#8B5CF6'
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash % 360)
  const saturation = 65 + (Math.abs(hash >> 8) % 20) // 65-85%
  const lightness = 50 + (Math.abs(hash >> 16) % 15) // 50-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Known token colors (for popular tokens)
const KNOWN_TOKEN_COLORS = {
  'SPECTRE': '#8B5CF6', 'ETH': '#627EEA', 'WETH': '#627EEA', 'BTC': '#F7931A', 
  'WBTC': '#F7931A', 'SOL': '#9945FF', 'USDT': '#26A17B', 'USDC': '#2775CA', 
  'PEPE': '#3D9E41', 'DOGE': '#C3A634', 'SHIB': '#F7931A', 'UNI': '#FF007A', 
  'LINK': '#2A5ADA', 'AAVE': '#B6509E', 'ARB': '#28A0F0', 'OP': '#FF0420', 
  'MATIC': '#8247E5', 'AVAX': '#E84142', 
  // Solana tokens
  'WIF': '#9945FF', '$WIF': '#9945FF', 'DOGWIFHAT': '#9945FF',
  'JUP': '#00D395', 'JUPITER': '#00D395',
  'BONK': '#FF9500', 
  'MOODENG': '#D4A5C9', 'MOO DENG': '#D4A5C9', // Soft dusty pink - matches baby hippo aesthetic
  'PYTH': '#6B4EE6',
  'JTO': '#14F195', 'JITO': '#14F195',
  'RENDER': '#00D395', 'RNDR': '#00D395',
  'POPCAT': '#FFD93D',
  'WEN': '#9945FF',
  'BOME': '#FF6B35',
  'RAY': '#4FC3F7', 'RAYDIUM': '#4FC3F7',
}

// Tokens known to have white/light logos - use white gradient
const WHITE_LOGO_TOKENS = new Set([
  'APE', 'APECHAIN', 'APT', 'APTOS', 'FIL', 'FILECOIN',
  'XRP', 'RIPPLE', 'LTC', 'LITECOIN', 'XLM', 'STELLAR',
  'DOT', 'POLKADOT', 'ALGO', 'ALGORAND', 'NEAR', 'NEAR PROTOCOL',
  'ATOM', 'COSMOS', 'VET', 'VECHAIN', 'EOS', 'HBAR', 'HEDERA',
  'ICP', 'INTERNET COMPUTER', 'FTM', 'FANTOM', 'SAND', 'MANA',
  'AXS', 'AXIE', 'ENS', 'GALA', 'IMX', 'IMMUTABLE', 'CRO', 'CRONOS',
])

// Get token color - uses known colors or generates from symbol/address
const getTokenColor = (symbol, address, forceWhite = false) => {
  // Check if token has a white logo - use white gradient
  if (forceWhite) {
    return '#FFFFFF'
  }
  if (symbol) {
    const upperSymbol = symbol.toUpperCase()
    const cleanSymbol = upperSymbol.replace(/^\$/, '')
    if (WHITE_LOGO_TOKENS.has(upperSymbol) || WHITE_LOGO_TOKENS.has(cleanSymbol)) {
      return '#FFFFFF'
    }
  }
  // Check known colors first (handle various formats)
  if (symbol) {
    const upperSymbol = symbol.toUpperCase()
    if (KNOWN_TOKEN_COLORS[upperSymbol]) {
      return KNOWN_TOKEN_COLORS[upperSymbol]
    }
    // Also check without $ prefix for tokens like $WIF
    const cleanSymbol = upperSymbol.replace(/^\$/, '')
    if (KNOWN_TOKEN_COLORS[cleanSymbol]) {
      return KNOWN_TOKEN_COLORS[cleanSymbol]
    }
  }
  // Generate consistent color from symbol or address
  return generateColorFromString(symbol || address || 'default')
}

// Check if token should use white gradient
const isWhiteLogoToken = (symbol) => {
  if (!symbol) return false
  const upperSymbol = symbol.toUpperCase().replace(/^\$/, '')
  return WHITE_LOGO_TOKENS.has(upperSymbol)
}

// Network name mapping
const getNetworkName = (networkId) => {
  const networks = {
    1: 'Ethereum',
    56: 'BNB Chain',
    137: 'Polygon',
    42161: 'Arbitrum',
    8453: 'Base',
    43114: 'Avalanche',
    10: 'Optimism',
    250: 'Fantom',
    1399811149: 'Solana',
  }
  return networks[networkId] || 'Unknown'
}

// Helper to sanitize token names - remove replacement chars and non-printable chars
const sanitizeName = (name) => {
  if (!name) return '';
  return name
    .replace(/[\uFFFD\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const RightPanel = ({ token }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge, currencySymbol } = useCurrency()

  // Debug: log token prop changes
  useEffect(() => {
    console.log('RightPanel token prop:', token?.symbol, 'address:', token?.address, 'networkId:', token?.networkId, 'logo:', token?.logo);
    console.log('Token color:', getTokenColor(token?.symbol, token?.address));
  }, [token]);

  // Fetch real-time token data from Codex API
  const { tokenData: liveTokenData, loading: tokenLoading } = useTokenDetails(
    token?.address,
    token?.networkId || 1,
    5 * 60 * 1000 // Refresh every 5 min to limit API usage
  )
  
  // Debug: log when liveTokenData changes
  useEffect(() => {
    console.log('RightPanel liveTokenData:', liveTokenData?.symbol, 'mcap:', liveTokenData?.marketCap);
  }, [liveTokenData]);
  const [mode, setMode] = useState('buy')
  const [payAmount, setPayAmount] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [activeInput, setActiveInput] = useState('pay')
  const [showVolumeDropdown, setShowVolumeDropdown] = useState(false)
  const [volumePeriod, setVolumePeriod] = useState('24H')
  const [showLiquidityDropdown, setShowLiquidityDropdown] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [swapSuccess, setSwapSuccess] = useState(false)
  const [swapRotation, setSwapRotation] = useState(0)
  const [selectedPayToken, setSelectedPayToken] = useState('ETH')
  const [showPayTokens, setShowPayTokens] = useState(false)
  const [isLightLogo, setIsLightLogo] = useState(false)
  
  // Reset isLightLogo when token changes
  useEffect(() => {
    setIsLightLogo(isWhiteLogoToken(token?.symbol))
  }, [token?.symbol])
  
  // Analyze logo brightness when it loads
  const handleLogoLoad = (e) => {
    const img = e.target
    try {
      // Create canvas to analyze image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const size = 20 // Sample size
      canvas.width = size
      canvas.height = size
      ctx.drawImage(img, 0, 0, size, size)
      
      const imageData = ctx.getImageData(0, 0, size, size).data
      let totalBrightness = 0
      let pixelCount = 0
      
      // Sample pixels and calculate average brightness
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i]
        const g = imageData[i + 1]
        const b = imageData[i + 2]
        const a = imageData[i + 3]
        
        // Skip transparent pixels
        if (a < 50) continue
        
        // Calculate perceived brightness
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
        totalBrightness += brightness
        pixelCount++
      }
      
      const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0
      // If average brightness > 200 (out of 255), consider it a light/white logo
      setIsLightLogo(avgBrightness > 200)
    } catch (err) {
      // CORS or other error - fallback to static detection
      console.log('Logo analysis failed, using static detection')
    }
  }

  // Available tokens for swapping
  const swapTokens = {
    ETH: { 
      symbol: 'ETH', 
      name: 'Ethereum', 
      icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      color: '#627eea',
      balance: 2.45,
      balanceUsd: 8125.50,
      price: 3316.53,
      decimals: 6
    },
    USDT: { 
      symbol: 'USDT', 
      name: 'Tether', 
      icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
      color: '#26A17B',
      balance: 5420.00,
      balanceUsd: 5420.00,
      price: 1.00,
      decimals: 2
    },
    USDC: { 
      symbol: 'USDC', 
      name: 'USD Coin', 
      icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      color: '#2775CA',
      balance: 3150.00,
      balanceUsd: 3150.00,
      price: 1.00,
      decimals: 2
    },
    SOL: { 
      symbol: 'SOL', 
      name: 'Solana', 
      icon: 'https://cryptologos.cc/logos/solana-sol-logo.png',
      color: '#000000',
      balance: 12.5,
      balanceUsd: 2228.75,
      price: 178.30,
      decimals: 6
    },
    BNB: { 
      symbol: 'BNB', 
      name: 'BNB', 
      icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      color: '#F3BA2F',
      balance: 3.2,
      balanceUsd: 1920.00,
      price: 600.00,
      decimals: 6
    },
  }

  const spectreToken = {
    symbol: 'SPECTRE',
    name: 'Spectre AI',
    icon: '/round-logo.png',
    color: '#8B5CF6',
    balance: 1234,
    balanceUsd: 1574.58,
    price: 1.276,
    decimals: 4
  }
  
  // Decimal validation helper
  const validateDecimalInput = (value, maxDecimals) => {
    // Allow empty string
    if (value === '') return ''
    
    // Only allow numbers and one decimal point
    const regex = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`)
    
    // Remove any non-numeric characters except decimal
    let cleaned = value.replace(/[^0-9.]/g, '')
    
    // Ensure only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Limit decimal places
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      cleaned = parts[0] + '.' + parts[1].slice(0, maxDecimals)
    }
    
    // Prevent leading zeros (except for decimals like 0.xx)
    if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
      cleaned = cleaned.slice(1)
    }
    
    return cleaned
  }
  
  // Format output with appropriate decimals
  const formatOutput = (value, decimals) => {
    if (!value || isNaN(value)) return ''
    const num = parseFloat(value)
    if (num === 0) return '0'
    
    // For very small numbers, show more decimals
    if (num < 0.0001) return num.toFixed(Math.min(decimals, 8))
    if (num < 1) return num.toFixed(Math.min(decimals, 6))
    if (num < 100) return num.toFixed(Math.min(decimals, 4))
    return num.toFixed(2)
  }

  const currentPayToken = swapTokens[selectedPayToken]

  // Get real volume from API (liveTokenData.volume24)
  const realVolume24 = liveTokenData?.volume24 || 0
  const realChange1h = liveTokenData?.change1h || 0
  const realChange4h = liveTokenData?.change4h || 0
  const realChange12h = liveTokenData?.change12h || 0
  const realChange24 = liveTokenData?.change24 || 0
  
  // Helper to format volume
  const formatVolume = (vol) => {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K'
    return vol.toFixed(0)
  }

  // Helper to format change percentage
  const formatChangePercent = (change) => {
    const pct = (change * 100).toFixed(2)
    return change >= 0 ? `+${pct}%` : `${pct}%`
  }

  // Estimate volume for different timeframes based on 24h volume
  // These are approximations - in production would come from API
  const volumeTimeframes = [
    { 
      period: '5M', 
      volume: formatVolume(realVolume24 * 0.004), // ~0.4% of 24h
      volumeRaw: realVolume24 * 0.004,
      change: formatChangePercent(realChange1h * 0.1), 
      positive: realChange1h >= 0, 
      buys: Math.floor(Math.random() * 10) + 5, 
      sells: Math.floor(Math.random() * 8) + 3, 
      buyVol: realChange1h >= 0 ? 55 + Math.floor(Math.random() * 15) : 35 + Math.floor(Math.random() * 15) 
    },
    { 
      period: '1H', 
      volume: formatVolume(realVolume24 * 0.042), // ~4.2% of 24h
      volumeRaw: realVolume24 * 0.042,
      change: formatChangePercent(realChange1h), 
      positive: realChange1h >= 0, 
      buys: Math.floor(Math.random() * 20) + 15, 
      sells: Math.floor(Math.random() * 18) + 12, 
      buyVol: realChange1h >= 0 ? 52 + Math.floor(Math.random() * 12) : 38 + Math.floor(Math.random() * 12) 
    },
    { 
      period: '4H', 
      volume: formatVolume(realVolume24 * 0.167), // ~16.7% of 24h
      volumeRaw: realVolume24 * 0.167,
      change: formatChangePercent(realChange4h), 
      positive: realChange4h >= 0, 
      buys: Math.floor(Math.random() * 60) + 50, 
      sells: Math.floor(Math.random() * 55) + 45, 
      buyVol: realChange4h >= 0 ? 50 + Math.floor(Math.random() * 10) : 40 + Math.floor(Math.random() * 10) 
    },
    { 
      period: '12H', 
      volume: formatVolume(realVolume24 * 0.5), // ~50% of 24h
      volumeRaw: realVolume24 * 0.5,
      change: formatChangePercent(realChange12h), 
      positive: realChange12h >= 0, 
      buys: Math.floor(Math.random() * 120) + 100, 
      sells: Math.floor(Math.random() * 110) + 90, 
      buyVol: realChange12h >= 0 ? 48 + Math.floor(Math.random() * 8) : 42 + Math.floor(Math.random() * 8) 
    },
    { 
      period: '24H', 
      volume: formatVolume(realVolume24), // Full 24h volume
      volumeRaw: realVolume24,
      change: formatChangePercent(realChange24), 
      positive: realChange24 >= 0, 
      buys: Math.floor(Math.random() * 250) + 200, 
      sells: Math.floor(Math.random() * 240) + 190, 
      buyVol: realChange24 >= 0 ? 46 + Math.floor(Math.random() * 8) : 44 + Math.floor(Math.random() * 8) 
    },
  ]

  const selectedTimeframe = volumeTimeframes.find(t => t.period === volumePeriod) || volumeTimeframes[4]

  // Get real liquidity from API
  const realLiquidity = liveTokenData?.liquidity || 0
  const tokenSymbol = liveTokenData?.symbol || token?.symbol || 'TOKEN'
  const tokenPrice = liveTokenData?.price || 0
  const networkId = liveTokenData?.networkId || token?.networkId || 1
  
  // Determine base token and DEX based on network
  const isEthereum = networkId === 1
  const isSolana = networkId === 1399811149
  const baseToken = isSolana ? 'SOL' : 'ETH'
  const baseDex = isSolana ? 'Raydium' : 'Uniswap V3'
  
  // Calculate pooled amounts (estimates based on liquidity / 2 for each side)
  const halfLiquidity = realLiquidity / 2
  const basePrice = isSolana ? 100 : 3200 // Approx SOL/ETH prices
  const pooledBaseAmount = halfLiquidity / basePrice
  const pooledTokenAmount = tokenPrice > 0 ? halfLiquidity / tokenPrice : 0

  // Format supply numbers
  const formatSupply = (value) => {
    if (!value || isNaN(value)) return '—'
    const num = parseFloat(value)
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toFixed(0)
  }

  // Liquidity data from API
  const liquidityData = {
    total: fmtLarge(realLiquidity),
    totalRaw: realLiquidity,
    pooledToken: `${formatSupply(pooledTokenAmount)} ${tokenSymbol}`,
    pooledBase: `${pooledBaseAmount.toFixed(2)} ${baseToken}`,
    dex: baseDex,
    dexLogo: isSolana 
      ? 'https://raydium.io/logo/logo.svg'
      : 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
    pair: `${tokenSymbol}/${baseToken}`,
    pairAddress: liveTokenData?.address?.slice(0, 10) + '...' + liveTokenData?.address?.slice(-4) || 'N/A',
    lpHolders: Math.floor(liveTokenData?.holders * 0.02) || 50, // Estimate ~2% of holders are LPs
    // Lock information (this would ideally come from a liquidity lock API like Unicrypt/Team.Finance)
    isLocked: realLiquidity > 100000, // Assume locked if liquidity > 100k
    lockPercentage: realLiquidity > 1000000 ? 85 : realLiquidity > 100000 ? 60 : 0,
    locks: realLiquidity > 100000 ? [
      { 
        platform: isSolana ? 'Streamflow' : 'Unicrypt', 
        amount: fmtLarge(realLiquidity * 0.6),
        percentage: 60, 
        unlockDate: '2027-01-15',
        daysLeft: 362,
        logo: '🔐'
      },
    ] : [],
    unlockedAmount: fmtLarge(realLiquidity * (realLiquidity > 100000 ? 0.4 : 1)),
    unlockedPercentage: realLiquidity > 100000 ? 40 : 100,
    // Pool depth - estimate based on price change direction
    depthBuy: realChange24 >= 0 ? 55 + Math.floor(Math.random() * 10) : 45 + Math.floor(Math.random() * 10),
    depthSell: 0, // Will be calculated
    // 24h changes
    change24h: formatChangePercent(realChange24 * 0.5), // Liquidity change ~half of price change
    changePositive: realChange24 >= 0,
    added24h: fmtLarge(realLiquidity * 0.02),
    removed24h: fmtLarge(realLiquidity * 0.015),
  }
  
  // Calculate sell depth
  liquidityData.depthSell = 100 - liquidityData.depthBuy

  // Mock exchange rate
  const exchangeRate = 784.52 // 1 ETH = 784.52 SPECTRE

  const handlePayChange = (e) => {
    const payToken = mode === 'buy' ? currentPayToken : spectreToken
    const receiveToken = mode === 'buy' ? spectreToken : currentPayToken
    
    // Validate and clean input
    const validated = validateDecimalInput(e.target.value, payToken.decimals)
    setActiveInput('pay')
    setPayAmount(validated)
    
    // Only calculate if there's a valid number
    if (validated && !isNaN(parseFloat(validated)) && parseFloat(validated) > 0) {
      const rate = mode === 'buy' ? exchangeRate : (1 / exchangeRate)
      const calculated = parseFloat(validated) * rate
      setReceiveAmount(formatOutput(calculated, receiveToken.decimals))
    } else {
      setReceiveAmount('')
    }
  }

  const handleReceiveChange = (e) => {
    const payToken = mode === 'buy' ? currentPayToken : spectreToken
    const receiveToken = mode === 'buy' ? spectreToken : currentPayToken
    
    // Validate and clean input
    const validated = validateDecimalInput(e.target.value, receiveToken.decimals)
    setActiveInput('receive')
    setReceiveAmount(validated)
    
    // Only calculate if there's a valid number
    if (validated && !isNaN(parseFloat(validated)) && parseFloat(validated) > 0) {
      const rate = mode === 'buy' ? (1 / exchangeRate) : exchangeRate
      const calculated = parseFloat(validated) * rate
      setPayAmount(formatOutput(calculated, payToken.decimals))
    } else {
      setPayAmount('')
    }
  }

  // Format large numbers for display
  const formatStatValue = (value) => {
    if (!value || isNaN(value)) return '—'
    return fmtLarge(value)
  }
  
  // Calculate FDV (Fully Diluted Valuation) = price * total supply
  const calculateFDV = () => {
    if (liveTokenData?.totalSupply && liveTokenData?.price) {
      const totalSupply = parseFloat(liveTokenData.totalSupply)
      // Validate that totalSupply is a reasonable number (not raw blockchain value with 18 decimals)
      // If totalSupply is much larger than circulatingSupply (like 1e18 times larger), it's likely raw
      const circSupply = liveTokenData.circulatingSupply ? parseFloat(liveTokenData.circulatingSupply) : 0
      
      // If totalSupply is more than 1000x circulatingSupply, it's probably a raw value - skip it
      if (circSupply > 0 && totalSupply > circSupply * 1000) {
        console.warn(`FDV: totalSupply (${totalSupply}) seems like raw blockchain value, skipping`)
        return null
      }
      
      // If totalSupply is smaller than circulatingSupply, something is wrong - skip it
      if (circSupply > 0 && totalSupply < circSupply * 0.99) {
        console.warn(`FDV: totalSupply (${totalSupply}) is less than circulatingSupply (${circSupply}), skipping`)
        return null
      }
      
      return liveTokenData.price * totalSupply
    }
    return null
  }
  
  // Build stats data from real-time token data
  const statsData = [
    {
      id: 'mcap',
      label: t('common.marketCap'),
      value: liveTokenData?.marketCap ? formatStatValue(liveTokenData.marketCap) : '—',
      color: '#8B5CF6',
      loading: tokenLoading
    },
    {
      id: 'fdv',
      label: t('common.fdv'),
      value: calculateFDV() ? formatStatValue(calculateFDV()) : '—',
      color: '#EC4899',
      loading: tokenLoading
    },
    {
      id: 'liquidity',
      label: t('common.liquidity'),
      value: liveTokenData?.liquidity ? formatStatValue(liveTokenData.liquidity) : '—',
      color: '#06B6D4',
      loading: tokenLoading
    },
    {
      id: 'circSupply',
      label: t('common.circulatingSupply'),
      value: liveTokenData?.circulatingSupply ? formatSupply(liveTokenData.circulatingSupply) : '—',
      color: '#059669',
      loading: tokenLoading
    },
    {
      id: 'volume24h',
      label: t('common.volume24h'),
      value: liveTokenData?.volume24 ? formatStatValue(liveTokenData.volume24) : '—',
      color: '#F59E0B',
      loading: tokenLoading
    },
    {
      id: 'holders',
      label: t('common.holders'),
      value: liveTokenData?.holders ? formatSupply(liveTokenData.holders) : '—',
      color: '#6366F1',
      loading: tokenLoading
    },
  ]

  return (
    <div className="right-panel">
      {/* Token Banner - Dynamic based on selected token */}
      <div className="token-banner-section">
        <div className="token-banner-dynamic">
          {/* Background with blurred logo */}
          <div 
            className="banner-bg-blur"
            style={{
              backgroundImage: `url(${liveTokenData?.logo || token?.logo || ''})`,
            }}
          />
          {/* Token-colored gradient overlay - uses white if logo is light */}
          <div className="banner-gradient-overlay" style={{
            background: isLightLogo
              ? `
                radial-gradient(ellipse at 0% 0%, rgba(255, 255, 255, 0.25) 0%, transparent 50%),
                radial-gradient(ellipse at 100% 100%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                linear-gradient(135deg, 
                  rgba(255, 255, 255, 0.12) 0%, 
                  rgba(10, 10, 15, 0.92) 35%,
                  rgba(8, 8, 12, 0.98) 100%)`
              : `
                radial-gradient(ellipse at 0% 0%, ${getTokenColor(token?.symbol, token?.address)}50 0%, transparent 50%),
                radial-gradient(ellipse at 100% 100%, ${getTokenColor(token?.symbol, token?.address)}30 0%, transparent 50%),
                linear-gradient(135deg, 
                  ${getTokenColor(token?.symbol, token?.address)}25 0%, 
                  rgba(10, 10, 15, 0.92) 35%,
                  rgba(8, 8, 12, 0.98) 100%)`
          }} />
          {/* Accent glow */}
          <div className="banner-accent-glow" style={{
            background: isLightLogo
              ? `radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`
              : `radial-gradient(circle at 20% 50%, ${getTokenColor(token?.symbol, token?.address)}20 0%, transparent 60%)`
          }} />
          
        <div className="banner-content">
            <div className="banner-logo-wrapper">
              <img 
                src={liveTokenData?.logo || token?.logo || `https://via.placeholder.com/80/8B5CF6/FFFFFF?text=${token?.symbol?.charAt(0) || '?'}`}
                alt={token?.symbol}
                className="banner-token-logo"
                crossOrigin="anonymous"
                onLoad={handleLogoLoad}
                onError={(e) => { e.target.src = `https://via.placeholder.com/80/8B5CF6/FFFFFF?text=${token?.symbol?.charAt(0) || '?'}` }}
              />
            </div>
            <div className="banner-info">
              <span className="banner-symbol">{sanitizeName(liveTokenData?.symbol || token?.symbol)}</span>
              <span className="banner-name">{sanitizeName(liveTokenData?.name || token?.name)}</span>
              <span className="banner-network">{getNetworkName(token?.networkId)}</span>
            </div>
          </div>
          
          {/* Customize Banner Button - Premium Feature */}
          <button className="banner-customize-btn" title="Customize your token banner (Premium)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="btn-text">{t('rightPanel.customize')}</span>
            <span className="premium-badge">{t('rightPanel.pro')}</span>
          </button>
          
          <div className="banner-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="particle" style={{ '--i': i }} />
            ))}
          </div>
        </div>
          </div>

      {/* Market Stats */}
      <div className="market-stats">
        {statsData.map((stat, i) => {
          // 24h Volume with dropdown
          if (stat.id === 'volume24h') {
            return (
              <div 
                key={i} 
                className={`stat-item has-dropdown ${showVolumeDropdown ? 'active' : ''}`}
                onClick={() => { setShowVolumeDropdown(!showVolumeDropdown); setShowLiquidityDropdown(false); }}
              >
                <div className="stat-indicator" style={{ backgroundColor: stat.color }}></div>
                <div className="stat-content">
                  <span className="stat-label">
                    {stat.label}
                    <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
                  </span>
                  <span className="stat-value">{stat.value}</span>
                </div>
                
                {/* Volume Dropdown */}
                {showVolumeDropdown && (
                  <div className="volume-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="vol-header">
                      <div className="vol-main">
                        <span className="vol-amount">{fmtLarge(selectedTimeframe.volumeRaw)}</span>
                        <span className={`vol-change ${selectedTimeframe.positive ? 'up' : 'down'}`}>
                          {selectedTimeframe.change}
                        </span>
                      </div>
                      <span className="vol-period-label">{t('rightPanel.volumePeriod', { period: volumePeriod })}</span>
          </div>

                    <div className="vol-timeframes">
                      {volumeTimeframes.map((tf) => (
                        <button
                          key={tf.period}
                          className={`tf-pill ${volumePeriod === tf.period ? 'active' : ''}`}
                          onClick={() => setVolumePeriod(tf.period)}
                        >
                          {tf.period}
          </button>
                      ))}
                    </div>

                    <div className="vol-pressure">
                      <div className="pressure-header">
                        <span className="pressure-title">{t('rightPanel.buySellPressure')}</span>
                        <span className="pressure-ratio">{selectedTimeframe.buyVol}% / {100 - selectedTimeframe.buyVol}%</span>
                      </div>
                      <div className="pressure-bar">
                        <div className="pressure-fill buy" style={{ width: `${selectedTimeframe.buyVol}%` }}>
                          <span className="pressure-label">{t('token.buy').toUpperCase()}</span>
                        </div>
                        <div className="pressure-fill sell" style={{ width: `${100 - selectedTimeframe.buyVol}%` }}>
                          <span className="pressure-label">{t('token.sell').toUpperCase()}</span>
                        </div>
        </div>
      </div>

                    <div className="vol-txns">
                      <div className="txn-box buy">
                        <span className="txn-count">{selectedTimeframe.buys}</span>
                        <span className="txn-label">{t('rightPanel.buys')}</span>
                      </div>
                      <div className="txn-box sell">
                        <span className="txn-count">{selectedTimeframe.sells}</span>
                        <span className="txn-label">{t('rightPanel.sells')}</span>
                      </div>
                      <div className="txn-box total">
                        <span className="txn-count">{selectedTimeframe.buys + selectedTimeframe.sells}</span>
                        <span className="txn-label">{t('rightPanel.totalTxns')}</span>
                      </div>
            </div>

                    <div className="vol-comparison">
                      <span className="comparison-title">{t('rightPanel.volumeByTimeframe')}</span>
                      <div className="comparison-bars">
                        {volumeTimeframes.map((tf) => (
                          <div 
                            key={tf.period} 
                            className={`comp-bar ${volumePeriod === tf.period ? 'active' : ''}`}
                            onClick={() => setVolumePeriod(tf.period)}
                          >
                            <div 
                              className="comp-fill"
                              style={{ 
                                height: `${(parseFloat(tf.volume) / 30) * 100}%`,
                                background: tf.positive 
                                  ? 'linear-gradient(180deg, #6EE7B7, #047857)' 
                                  : 'linear-gradient(180deg, #FCA5A5, #B91C1C)'
                              }}
                            ></div>
                            <span className="comp-label">{tf.period}</span>
          </div>
        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          // Liquidity with dropdown
          if (stat.id === 'liquidity') {
            return (
              <div 
                key={i} 
                className={`stat-item has-dropdown ${showLiquidityDropdown ? 'active' : ''}`}
                onClick={() => { setShowLiquidityDropdown(!showLiquidityDropdown); setShowVolumeDropdown(false); }}
              >
                <div className="stat-indicator" style={{ backgroundColor: stat.color }}></div>
                <div className="stat-content">
                  <span className="stat-label">
                    {stat.label}
                    <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="stat-value">{stat.value}</span>
                </div>
                
                {/* Liquidity Dropdown */}
                {showLiquidityDropdown && (
                  <div className="liquidity-dropdown" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="liq-header">
                      <div className="liq-main">
                        <span className="liq-amount">{liquidityData.total}</span>
                        <span className={`liq-change ${liquidityData.changePositive ? 'up' : 'down'}`}>
                          {liquidityData.change24h}
                        </span>
                      </div>
                      <span className="liq-subtitle">{t('rightPanel.totalLiquidity')}</span>
                    </div>

                    {/* Pool Info - Compact */}
                    <div className="liq-pool-info">
                      <div className="pool-header">
                        <span className="pool-dex">{liquidityData.dex}</span>
                        <span className="pool-pair">{liquidityData.pair}</span>
                      </div>
                      <div className="pool-amounts">
                        <div className="pool-token">
                          <span className="pool-value">{liquidityData.pooledToken}</span>
                        </div>
                        <div className="pool-divider">+</div>
                        <div className="pool-token">
                          <span className="pool-value">{liquidityData.pooledBase}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lock Status - Compact */}
                    <div className="liq-lock-status">
                      <div className="lock-header">
                        <span className="lock-title">
                          {liquidityData.isLocked ? `🔒 ${t('rightPanel.locked')}` : `🔓 ${t('rightPanel.unlocked')}`}
                        </span>
                        <span className={`lock-badge ${liquidityData.isLocked ? 'locked' : 'unlocked'}`}>
                          {liquidityData.lockPercentage}%
                        </span>
                      </div>
                      
                      <div className="lock-progress">
                        <div className="lock-fill locked" style={{ width: `${liquidityData.lockPercentage}%` }}></div>
                        <div className="lock-fill unlocked" style={{ width: `${liquidityData.unlockedPercentage}%` }}></div>
                      </div>

                      {/* Lock Details */}
                      {liquidityData.locks.map((lock, idx) => (
                        <div key={idx} className="lock-item">
                          <div className="lock-platform">
                            <span className="lock-icon">{lock.logo}</span>
                            <span className="lock-name">{lock.platform}</span>
                          </div>
                          <div className="lock-details">
                            <span className="lock-amount">{lock.amount}</span>
                            <span className="lock-countdown">{lock.daysLeft}d</span>
                          </div>
                        </div>
                      ))}

                      {/* Unlocked Liquidity */}
                      <div className="lock-item unlocked-item">
                        <div className="lock-platform">
                          <span className="lock-icon">🔓</span>
                          <span className="lock-name">{t('rightPanel.unlocked')}</span>
                        </div>
                        <div className="lock-details">
                          <span className="lock-amount">{liquidityData.unlockedAmount}</span>
                          <span className="lock-percent">{liquidityData.unlockedPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row - Depth & Activity */}
                    <div className="liq-bottom-row">
                      <div className="liq-depth">
                        <div className="depth-header">
                          <span className="depth-title">{t('rightPanel.depth')}</span>
                          <span className="depth-holders">{liquidityData.lpHolders} LPs</span>
                        </div>
                        <div className="depth-bar-main">
                          <div className="depth-fill buy" style={{ width: `${liquidityData.depthBuy}%` }}></div>
                          <div className="depth-fill sell" style={{ width: `${liquidityData.depthSell}%` }}></div>
                        </div>
                        <div className="depth-row buy">
                          <span className="depth-label">{t('token.buy')}</span>
                          <div className="depth-bar-single">
                            <div className="depth-fill-single buy" style={{ width: `${liquidityData.depthBuy}%` }}></div>
                          </div>
                          <span className="depth-percent">{liquidityData.depthBuy}%</span>
                        </div>
                        <div className="depth-row sell">
                          <span className="depth-label">{t('token.sell')}</span>
                          <div className="depth-bar-single">
                            <div className="depth-fill-single sell" style={{ width: `${liquidityData.depthSell}%` }}></div>
                          </div>
                          <span className="depth-percent">{liquidityData.depthSell}%</span>
                        </div>
                      </div>

                      <div className="liq-activity">
                        <span className="activity-title">{t('rightPanel.flow24h')}</span>
                        <div className="activity-grid">
                          <div className="activity-item added">
                            <span className="activity-icon">+</span>
                            <div className="activity-info">
                              <span className="activity-value">{liquidityData.added24h}</span>
                            </div>
                          </div>
                          <div className="activity-item removed">
                            <span className="activity-icon">−</span>
                            <div className="activity-info">
                              <span className="activity-value">{liquidityData.removed24h}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          // Default stat item (no dropdown)
          return (
            <div key={i} className="stat-item">
              <div className="stat-indicator" style={{ backgroundColor: stat.color }}></div>
              <div className="stat-content">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trading Panel */}
      <div className={`trading-compact ${isSwapping ? 'swapping' : ''} ${swapSuccess ? 'success' : ''}`}>
        {/* Mode Toggle */}
        <div className="trade-toggle">
          <button
            className={`toggle-btn ${mode === 'buy' ? 'active buy' : ''}`}
            onClick={() => setMode('buy')}
          >
            <div className="toggle-icon-wrapper buy-icon">
              <svg className="toggle-icon" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="buyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" stroke="url(#buyGradient)" strokeWidth="1.5" fill="none" />
                <path d="M12 8v8M8 12h8" stroke="url(#buyGradient)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="icon-glow buy"></div>
            </div>
            {t('token.buy')}
          </button>
          <button
            className={`toggle-btn ${mode === 'sell' ? 'active sell' : ''}`}
            onClick={() => setMode('sell')}
          >
            <div className="toggle-icon-wrapper sell-icon">
              <svg className="toggle-icon" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="sellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <circle cx="12" cy="12" r="10" stroke="url(#sellGradient)" strokeWidth="1.5" fill="none" />
                <path d="M8 12h8" stroke="url(#sellGradient)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="icon-glow sell"></div>
            </div>
            {t('token.sell')}
          </button>
          <div className={`toggle-slider ${mode}`}></div>
        </div>

        {/* Swap Container with Flow Animation */}
        <div className="swap-container">
          {/* Flow Lines */}
          <div className={`flow-line ${isSwapping ? 'animating' : ''}`}></div>
          
          {/* First Card - Changes based on mode */}
          <div className={`trade-card pay ${activeInput === 'pay' ? 'active' : ''}`}>
            <div className="card-header">
              <span className="card-label">{mode === 'buy' ? t('rightPanel.youPay') : t('rightPanel.youSell')}</span>
              <div className="balance-info">
                <span className="balance-amount">
                  {mode === 'buy' 
                    ? `${currentPayToken.balance} ${currentPayToken.symbol}`
                    : `${spectreToken.balance.toLocaleString()} ${spectreToken.symbol}`
                  }
                </span>
                <span className="balance-usd">
                  {fmtPrice(mode === 'buy' ? currentPayToken.balanceUsd : spectreToken.balanceUsd)}
                </span>
              </div>
          </div>
            <div className="card-content">
              <div className="input-wrapper">
            <input
              type="text"
              placeholder="0.00"
              value={payAmount}
              onChange={handlePayChange}
                  onFocus={() => { setActiveInput('pay'); setShowPayTokens(false); }}
                  className="amount-input"
                />
                {payAmount && (
                  <span className="input-usd">
                    ~{fmtPrice(parseFloat(payAmount || 0) * (mode === 'buy' ? currentPayToken.price : spectreToken.price))}
                  </span>
                )}
              </div>
              
              {mode === 'buy' ? (
                <div className="token-selector-wrapper">
                  <button 
                    className="token-selector"
                    onClick={() => setShowPayTokens(!showPayTokens)}
                    style={{ '--token-color': currentPayToken.color }}
                  >
                    <div className="token-icon" style={{ background: currentPayToken.color }}>
                      <img src={currentPayToken.icon} alt={currentPayToken.symbol} />
                    </div>
                    <span className="token-name">{currentPayToken.symbol}</span>
                    <svg className={`selector-arrow ${showPayTokens ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
                  
                  {/* Token Dropdown */}
                  {showPayTokens && (
                    <div className="token-dropdown">
                      {Object.values(swapTokens).map((t) => (
                        <button
                          key={t.symbol}
                          className={`token-option ${selectedPayToken === t.symbol ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPayToken(t.symbol);
                            setShowPayTokens(false);
                          }}
                        >
                          <div className="token-option-icon" style={{ background: t.color }}>
                            <img src={t.icon} alt={t.symbol} />
                          </div>
                          <div className="token-option-info">
                            <span className="token-option-symbol">{t.symbol}</span>
                            <span className="token-option-name">{t.name}</span>
                          </div>
                          <div className="token-option-balance">
                            <span className="token-option-amount">{t.balance}</span>
                            <span className="token-option-usd">{fmtPrice(t.balanceUsd)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button className="token-selector spectre-token">
                  <div className="token-icon spectre-icon">
                    <img src="/round-logo.png" alt="SPECTRE" />
                  </div>
                  <span className="token-name">SPECTRE</span>
                </button>
              )}
          </div>
          <div className="quick-amounts">
              {['25%', '50%', '75%', 'MAX'].map(amt => (
                <button 
                  key={amt} 
                  className="quick-btn"
                  onClick={() => {
                    const percent = amt === 'MAX' ? 100 : parseInt(amt);
                    const payToken = mode === 'buy' ? currentPayToken : spectreToken;
                    const receiveToken = mode === 'buy' ? spectreToken : currentPayToken;
                    const balance = payToken.balance;
                    const newPayAmount = formatOutput(balance * percent / 100, payToken.decimals);
                    setPayAmount(newPayAmount);
                    setActiveInput('pay');
                    // Calculate receive amount
                    const rate = mode === 'buy' ? exchangeRate : (1 / exchangeRate);
                    const calculated = parseFloat(newPayAmount) * rate;
                    setReceiveAmount(formatOutput(calculated, receiveToken.decimals));
                  }}
                >
                  {amt}
                </button>
            ))}
          </div>
        </div>

          {/* Swap Direction Button */}
          <div className="swap-direction">
            <button 
              className={`direction-btn ${isSwapping ? 'spinning' : ''}`}
              onClick={() => {
                setSwapRotation(prev => prev + 180);
                // Swap amounts
                const temp = payAmount;
                setPayAmount(receiveAmount);
                setReceiveAmount(temp);
                // Toggle mode
                setMode(prev => prev === 'buy' ? 'sell' : 'buy');
              }}
              style={{ transform: `rotate(${swapRotation}deg)` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4l4 4" />
                <path d="M17 8v12M17 20l4-4M17 20l-4-4" />
            </svg>
          </button>
            <div className="direction-glow"></div>
        </div>

          {/* Second Card - Changes based on mode */}
          <div className={`trade-card receive ${activeInput === 'receive' ? 'active' : ''}`}>
            <div className="card-header">
              <span className="card-label">{mode === 'buy' ? t('rightPanel.youReceive') : t('rightPanel.youGet')}</span>
              <div className="balance-info">
                <span className="balance-amount">
                  {mode === 'buy'
                    ? `${spectreToken.balance.toLocaleString()} ${spectreToken.symbol}`
                    : `${currentPayToken.balance} ${currentPayToken.symbol}`
                  }
                </span>
                <span className="balance-usd">
                  {fmtPrice(mode === 'buy' ? spectreToken.balanceUsd : currentPayToken.balanceUsd)}
                </span>
              </div>
          </div>
            <div className="card-content">
              <div className="input-wrapper">
            <input
              type="text"
              placeholder="0.00"
              value={receiveAmount}
              onChange={handleReceiveChange}
                  onFocus={() => { setActiveInput('receive'); setShowPayTokens(false); }}
                  className="amount-input"
                />
                {receiveAmount && (
                  <span className="input-usd">
                    ~{fmtPrice(parseFloat(receiveAmount || 0) * (mode === 'buy' ? spectreToken.price : currentPayToken.price))}
                  </span>
                )}
              </div>
              
              {mode === 'buy' ? (
                <button className="token-selector spectre-token">
                  <div className="token-icon spectre-icon">
                    <img src="/round-logo.png" alt="SPECTRE" />
                  </div>
                  <span className="token-name">SPECTRE</span>
                </button>
              ) : (
                <div className="token-selector-wrapper">
                  <button 
                    className="token-selector"
                    onClick={() => setShowPayTokens(!showPayTokens)}
                    style={{ '--token-color': currentPayToken.color }}
                  >
                    <div className="token-icon" style={{ background: currentPayToken.color }}>
                      <img src={currentPayToken.icon} alt={currentPayToken.symbol} />
                    </div>
                    <span className="token-name">{currentPayToken.symbol}</span>
                    <svg className={`selector-arrow ${showPayTokens ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
                  
                  {/* Token Dropdown */}
                  {showPayTokens && (
                    <div className="token-dropdown">
                      {Object.values(swapTokens).map((t) => (
                        <button
                          key={t.symbol}
                          className={`token-option ${selectedPayToken === t.symbol ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPayToken(t.symbol);
                            setShowPayTokens(false);
                          }}
                        >
                          <div className="token-option-icon" style={{ background: t.color }}>
                            <img src={t.icon} alt={t.symbol} />
                          </div>
                          <div className="token-option-info">
                            <span className="token-option-symbol">{t.symbol}</span>
                            <span className="token-option-name">{t.name}</span>
                          </div>
                          <div className="token-option-balance">
                            <span className="token-option-amount">{t.balance}</span>
                            <span className="token-option-usd">{fmtPrice(t.balanceUsd)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Details */}
        <div className="swap-details">
          <div className="detail-row">
            <span className="detail-label">{t('rightPanel.rate')}</span>
            <span className="detail-value rate">
              <span className="rate-pulse"></span>
              {mode === 'buy' 
                ? `1 ${currentPayToken.symbol} = ${exchangeRate.toLocaleString(undefined, {maximumFractionDigits: 2})} SPECTRE`
                : `1 SPECTRE = ${(1/exchangeRate).toFixed(6)} ${currentPayToken.symbol}`
              }
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('rightPanel.priceImpact')}</span>
            <span className="detail-value impact low">&lt; 0.01%</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('rightPanel.networkFee')}</span>
            <span className="detail-value">~{fmtPrice(2.45)}</span>
          </div>
        </div>

        {/* Swapping Overlay Effect */}
        {isSwapping && (
          <div className="swap-overlay">
            <div className="swap-particles">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="particle" style={{ '--i': i }}></div>
              ))}
            </div>
            <div className="swap-progress">
              <div className="progress-track">
                <div className="progress-fill"></div>
              </div>
              <span className="progress-text">{t('rightPanel.processing')}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {swapSuccess && (
          <div className="swap-success-alert">
            <div className="success-icon-wrapper">
              <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" className="success-circle" />
                <path d="M8 12l3 3 5-6" className="success-check-path" />
              </svg>
            </div>
            <div className="success-content">
              <span className="success-title">{t('rightPanel.swapSuccess')}</span>
              <div className="success-amounts">
                <span className="success-from">
                  <span className="success-value">{payAmount}</span>
                  <span className="success-symbol">{mode === 'buy' ? currentPayToken.symbol : 'SPECTRE'}</span>
                  <span className="success-usd">
                    ~{fmtPrice(parseFloat(payAmount || 0) * (mode === 'buy' ? currentPayToken.price : spectreToken.price))}
                  </span>
                </span>
                <span className="success-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </span>
                <span className="success-to">
                  <span className="success-value">{receiveAmount}</span>
                  <span className="success-symbol">{mode === 'buy' ? 'SPECTRE' : currentPayToken.symbol}</span>
                  <span className="success-usd">
                    ~{fmtPrice(parseFloat(receiveAmount || 0) * (mode === 'buy' ? spectreToken.price : currentPayToken.price))}
                  </span>
                </span>
              </div>
            </div>
            <div className="success-confetti">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="confetti-piece" style={{ '--i': i }}></div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button 
          className={`swap-action-btn ${mode} ${isSwapping ? 'loading' : ''} ${swapSuccess ? 'success' : ''}`}
          onClick={() => {
            if (!payAmount) return;
            setIsSwapping(true);
            setShowPayTokens(false);
            setTimeout(() => {
              setIsSwapping(false);
              setSwapSuccess(true);
              setTimeout(() => {
                setSwapSuccess(false);
                // Clear the fields after success
                setPayAmount('');
                setReceiveAmount('');
              }, 3000);
            }, 2000);
          }}
          disabled={!payAmount || isSwapping}
        >
          <span className="btn-content">
            {isSwapping ? (
              <>
                <div className="btn-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <span>{t('rightPanel.swapping')}</span>
              </>
            ) : swapSuccess ? (
              <>
                <svg className="btn-success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('rightPanel.completed')}</span>
              </>
            ) : (
              <>
                <span className="btn-icon">{mode === 'buy' ? '↓' : '↑'}</span>
                <span>{mode === 'buy' ? t('rightPanel.buyToken', { symbol: token.symbol }) : t('rightPanel.sellToken', { symbol: token.symbol })}</span>
              </>
            )}
          </span>
          <div className="btn-shine"></div>
          <div className="btn-glow"></div>
        </button>
      </div>
    </div>
  )
}

export default RightPanel
