/**
 * Header Component - Apple Modern Style
 * Figma Reference: Top bar with weather widget, time, search
 * Logo: Phoenix/circuit design from logo.png
 * 
 * NOW WITH REAL-TIME SEARCH FROM CODEX API
 */
import React, { useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { useCopyToast } from '../App'
import { useTokenSearch } from '../hooks/useCodexData'
import { useStockSearch } from '../hooks/useStockData'
// formatLargeNumber/formatPrice now from useCurrency hook
import { getStockLogo } from '../constants/stockData'
import CryptoMemoryGame from './CryptoMemoryGame'
import SettingsPanel from './SettingsPanel'
import { useCurrency } from '../hooks/useCurrency'
import { useTranslation } from 'react-i18next'
import WhisperResults from './WhisperResults'
import { useWhisperSearch } from '../hooks/useWhisperSearch'
import './Header.css'

const DEFAULT_HEADER_PROFILE = { name: 'Daryl Wilson', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face' }

// Isolated clock component - prevents entire Header from re-rendering every second
const HeaderClock = memo(({ timeFormat, onToggleFormat }) => {
  const [time, setTime] = useState(new Date())
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dayName = time.toLocaleDateString('en-US', { weekday: 'long' })
  const timeStr = timeFormat === '24h'
    ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const toggleLabel = timeFormat === '12h' ? '24' : '12'

  return (
    <div
      className="datetime-card"
      onClick={onToggleFormat}
      title={t('header.toggleTimeFormat', { format: toggleLabel })}
      style={{ cursor: 'pointer' }}
    >
      <span className="datetime-date">{t('header.today')}{time.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
      <div className="datetime-row">
        <span className="datetime-time">{timeStr}</span>
        <span className="datetime-day">{dayName}</span>
      </div>
    </div>
  )
})

const Header = ({ profile: profileProp, marketMode: marketModeProp, onMarketModeChange, onOpenGM, onOpenROI, addToWatchlist, removeFromWatchlist, isInWatchlist, selectToken, onSelectTokenAndOpen, onLogoClick, tradingModeActive, onTradingModeClick, researchZoneActive, researchZoneDayMode, onResearchZoneDayModeChange, welcomeActive, welcomeDayMode, onWelcomeDayModeChange, appDisplayMode, onAppDisplayModeChange }) => {
  // Use prop when provided so header always matches welcome widget (name + avatar)
  const profile = profileProp != null && typeof profileProp === 'object' ? profileProp : DEFAULT_HEADER_PROFILE
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  // Time state moved to HeaderClock component to prevent entire header re-renders
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [whisperMode, setWhisperMode] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const recognitionRef = React.useRef(null)
  const whisperSearchRef = React.useRef(null)
  // Store full token data in history instead of just symbols
  const [recentTokens, setRecentTokens] = useState(() => {
    const saved = localStorage.getItem('searchHistoryTokens')
    return saved ? JSON.parse(saved) : []
  })
  const { triggerCopyToast } = useCopyToast()

  // Crypto / Stocks mode: controlled from App when props provided
  const [marketModeInternal, setMarketModeInternal] = useState(() => {
    const saved = localStorage.getItem('spectre-market-mode')
    return saved === 'stocks' ? 'stocks' : 'crypto'
  })
  const marketMode = marketModeProp !== undefined ? marketModeProp : marketModeInternal
  const setMarketMode = onMarketModeChange || setMarketModeInternal
  useEffect(() => {
    if (marketModeProp === undefined) localStorage.setItem('spectre-market-mode', marketMode)
  }, [marketMode, marketModeProp])

  // Weather state
  const [weather, setWeather] = useState(() => {
    const saved = localStorage.getItem('spectre-weather')
    return saved ? JSON.parse(saved) : null
  })
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [memoryGameOpen, setMemoryGameOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false)
  const [calendarHidden, setCalendarHidden] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimModalDay, setClaimModalDay] = useState(null) // day just claimed for congrats modal
  // Gamification (persist in localStorage for demo)
  const [gamification, setGamification] = useState(() => {
    try {
      const s = localStorage.getItem('spectre-gamification')
      if (s) return JSON.parse(s)
    } catch (_) {}
    return { daysClaimed: 0, points: 0, spectreTokens: 0, streak: 0, challengeDaysCompleted: 0, claimedDays: [] }
  })
  useEffect(() => {
    try {
      localStorage.setItem('spectre-gamification', JSON.stringify(gamification))
    } catch (_) {}
  }, [gamification])

  // Next day that can be claimed (first 1–30 not in claimedDays)
  const nextClaimableDay = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].find((d) => !gamification.claimedDays.includes(d)) ?? null

  const handleClaimDay = (day) => {
    if (day == null || gamification.claimedDays.includes(day)) return
    const newClaimed = [...gamification.claimedDays, day].sort((a, b) => a - b)
    setGamification((prev) => ({
      ...prev,
      claimedDays: newClaimed,
      daysClaimed: prev.daysClaimed + 1,
      points: prev.points + 1,
      challengeDaysCompleted: newClaimed.length,
      streak: prev.streak + 1,
    }))
    setClaimModalDay(day)
    setClaimModalOpen(true)
  }

  const closeClaimModal = () => {
    setClaimModalOpen(false)
    setClaimModalDay(null)
  }

  useEffect(() => {
    if (!claimModalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeClaimModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [claimModalOpen])
  
  // Temperature unit: 'celsius' or 'fahrenheit'
  const [tempUnit, setTempUnit] = useState(() => {
    const saved = localStorage.getItem('spectre-temp-unit')
    return saved || 'celsius'
  })
  
  // Time format: '12h' or '24h'
  const [timeFormat, setTimeFormat] = useState(() => {
    const saved = localStorage.getItem('spectre-time-format')
    return saved || '12h'
  })
  
  // Convert Celsius to Fahrenheit
  const cToF = (c) => Math.round((c * 9/5) + 32)
  
  // Convert Fahrenheit to Celsius
  const fToC = (f) => Math.round((f - 32) * 5/9)
  
  // Toggle temperature unit
  const toggleTempUnit = () => {
    const newUnit = tempUnit === 'celsius' ? 'fahrenheit' : 'celsius'
    setTempUnit(newUnit)
    localStorage.setItem('spectre-temp-unit', newUnit)
  }
  
  // Toggle time format
  const toggleTimeFormat = () => {
    const newFormat = timeFormat === '12h' ? '24h' : '12h'
    setTimeFormat(newFormat)
    localStorage.setItem('spectre-time-format', newFormat)
  }
  
  // Weather code to icon/description mapping
  const getWeatherInfo = (code) => {
    // WMO Weather interpretation codes
    const weatherCodes = {
      0: { icon: 'clear', desc: 'Clear sky' },
      1: { icon: 'partly-cloudy', desc: 'Mainly clear' },
      2: { icon: 'partly-cloudy', desc: 'Partly cloudy' },
      3: { icon: 'cloudy', desc: 'Overcast' },
      45: { icon: 'fog', desc: 'Foggy' },
      48: { icon: 'fog', desc: 'Icy fog' },
      51: { icon: 'drizzle', desc: 'Light drizzle' },
      53: { icon: 'drizzle', desc: 'Drizzle' },
      55: { icon: 'drizzle', desc: 'Heavy drizzle' },
      61: { icon: 'rain', desc: 'Light rain' },
      63: { icon: 'rain', desc: 'Rain' },
      65: { icon: 'rain', desc: 'Heavy rain' },
      71: { icon: 'snow', desc: 'Light snow' },
      73: { icon: 'snow', desc: 'Snow' },
      75: { icon: 'snow', desc: 'Heavy snow' },
      80: { icon: 'rain', desc: 'Rain showers' },
      81: { icon: 'rain', desc: 'Heavy showers' },
      95: { icon: 'storm', desc: 'Thunderstorm' },
    }
    return weatherCodes[code] || { icon: 'clear', desc: 'Unknown' }
  }
  
  // Fetch weather based on user location
  useEffect(() => {
    const fetchWeather = async (lat, lon, cityName = null) => {
      try {
        setWeatherLoading(true)
        
        // Get weather data from Open-Meteo (using Celsius for international users)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto`
        )
        const weatherData = await weatherRes.json()
        
        // Try to get location name from timezone if not provided
        let locationName = cityName
        if (!locationName && weatherData.timezone) {
          // Extract city from timezone (e.g., "America/New_York" -> "New York")
          const parts = weatherData.timezone.split('/')
          locationName = parts[parts.length - 1].replace(/_/g, ' ')
        }
        locationName = locationName || t('header.yourLocation')
        
        const newWeather = {
          location: locationName,
          temp: Math.round(weatherData.current?.temperature_2m || 0),
          high: Math.round(weatherData.daily?.temperature_2m_max?.[0] || 0),
          low: Math.round(weatherData.daily?.temperature_2m_min?.[0] || 0),
          code: weatherData.current?.weather_code || 0,
          unit: 'celsius',
          lastUpdated: Date.now()
        }
        
        setWeather(newWeather)
        localStorage.setItem('spectre-weather', JSON.stringify(newWeather))
      } catch (error) {
        console.error('Weather fetch error:', error)
      } finally {
        setWeatherLoading(false)
      }
    }
    
    // Check if we need to refresh weather (every 30 min or if unit changed)
    const shouldRefresh = !weather || (Date.now() - (weather.lastUpdated || 0)) > 30 * 60 * 1000 || weather.unit !== 'celsius'
    
    if (shouldRefresh) {
      // Try browser geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeather(position.coords.latitude, position.coords.longitude)
          },
          (error) => {
            console.log('Geolocation error:', error.message)
            // Fallback to IP-based location using ip-api.com (supports CORS)
            fetch('http://ip-api.com/json/?fields=lat,lon,city')
              .then(res => res.json())
              .then(data => {
                if (data.lat && data.lon) {
                  fetchWeather(data.lat, data.lon, data.city)
                }
              })
              .catch(() => {
                console.log('IP geolocation failed, using default location')
                // Default to New York if all else fails
                fetchWeather(40.7128, -74.0060)
              })
          },
          { timeout: 5000, maximumAge: 30 * 60 * 1000 }
        )
      } else {
        // No geolocation support, use IP-based
        fetch('http://ip-api.com/json/?fields=lat,lon,city')
          .then(res => res.json())
          .then(data => {
            if (data.lat && data.lon) {
              fetchWeather(data.lat, data.lon, data.city)
            }
          })
          .catch(() => {
            // Default to New York
            fetchWeather(40.7128, -74.0060)
          })
      }
    }
  }, [])
  
  // Real-time token search from Codex API (crypto mode) — disabled in whisper mode
  const { results: liveSearchResults, loading: cryptoSearchLoading, error: searchError } = useTokenSearch(
    !whisperMode && marketMode === 'crypto' ? searchQuery : '',
    300
  )

  // Real-time stock search (stock mode) — disabled in whisper mode
  const { results: stockSearchResults, loading: stockSearchLoading } = useStockSearch(
    !whisperMode && marketMode === 'stocks' ? searchQuery : '',
    300
  )

  // Whisper Search (AI natural language)
  const { data: whisperData, loading: whisperLoading, error: whisperError, search: whisperSearch, clear: whisperClear } = useWhisperSearch()
  whisperSearchRef.current = whisperSearch // Keep ref fresh for event handler closures

  // Combined loading state
  const searchLoading = whisperMode ? whisperLoading : (marketMode === 'stocks' ? stockSearchLoading : cryptoSearchLoading)

  // Debug logging
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      console.log('Search query:', searchQuery, 'Mode:', marketMode);
      console.log('Live results:', marketMode === 'stocks' ? stockSearchResults : liveSearchResults);
      console.log('Loading:', searchLoading);
    }
  }, [searchQuery, liveSearchResults, stockSearchResults, searchLoading, marketMode])
  
  // Parse market cap string to number (e.g., "42.5M" -> 42500000)
  const parseMcap = (mcapStr) => {
    if (!mcapStr) return 0
    if (typeof mcapStr === 'number') return mcapStr
    const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
    const match = mcapStr.match(/^[\$]?([\d.]+)([KMBT])?$/)
    if (match) {
      const num = parseFloat(match[1])
      const suffix = match[2]
      return suffix ? num * multipliers[suffix] : num
    }
    return parseFloat(mcapStr) || 0
  }

  // Extended token database for local search
  const allTokens = [
    { symbol: 'SPECTRE', name: 'Spectre AI', logo: '/round-logo.png', price: 1.276, change: 12.4, mcap: '42.5M', liquidity: '2.1M', network: 'ETH', ca: '0x9cf7a8c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5dad6' },
    { symbol: 'AAVE', name: 'Aave', logo: 'https://cryptologos.cc/logos/aave-aave-logo.png', price: 268.45, change: -1.8, mcap: '4.1B', liquidity: '320M', network: 'ETH', ca: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 3245, change: 2.8, mcap: '389B', liquidity: '8.2B', network: 'ETH', ca: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    { symbol: 'WETH', name: 'Wrapped Ether', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 3245, change: 2.8, mcap: '12B', liquidity: '8.2B', network: 'ETH', ca: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
    { symbol: 'SOL', name: 'Solana', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 178.5, change: -3.2, mcap: '82B', liquidity: '1.2B', network: 'SOL', ca: 'So11111111111111111111111111111111111111112' },
    { symbol: 'ARB', name: 'Arbitrum', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', price: 1.12, change: 8.7, mcap: '4.2B', liquidity: '180M', network: 'ARB', ca: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
    { symbol: 'PEPE', name: 'Pepe', logo: 'https://cryptologos.cc/logos/pepe-pepe-logo.png', price: 0.0000089, change: 45.2, mcap: '3.8B', liquidity: '45M', network: 'ETH', ca: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
    { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', price: 0.324, change: 8.21, mcap: '46.2B', liquidity: '890M', network: 'ETH', ca: '0x4206931337dc273a630d328dA6441786BfaD668f' },
    { symbol: 'SHIB', name: 'Shiba Inu', logo: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png', price: 0.0000234, change: 5.67, mcap: '13.8B', liquidity: '120M', network: 'ETH', ca: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
    { symbol: 'FLOKI', name: 'Floki', logo: 'https://cryptologos.cc/logos/floki-inu-floki-logo.png', price: 0.000187, change: 6.12, mcap: '1.8B', liquidity: '45M', network: 'ETH', ca: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E' },
    { symbol: 'UNI', name: 'Uniswap', logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png', price: 12.34, change: 4.56, mcap: '9.3B', liquidity: '420M', network: 'ETH', ca: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    { symbol: 'LINK', name: 'Chainlink', logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png', price: 18.92, change: 3.45, mcap: '11.2B', liquidity: '380M', network: 'ETH', ca: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
    { symbol: 'GRT', name: 'The Graph', logo: 'https://cryptologos.cc/logos/the-graph-grt-logo.png', price: 0.287, change: 9.23, mcap: '2.7B', liquidity: '89M', network: 'ETH', ca: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7' },
    { symbol: 'MKR', name: 'Maker', logo: 'https://cryptologos.cc/logos/maker-mkr-logo.png', price: 1876.50, change: -1.23, mcap: '1.7B', liquidity: '95M', network: 'ETH', ca: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' },
    { symbol: 'CRV', name: 'Curve DAO', logo: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png', price: 0.892, change: 11.34, mcap: '1.1B', liquidity: '78M', network: 'ETH', ca: '0xD533a949740bb3306d119CC777fa900bA034cd52' },
    { symbol: 'SUSHI', name: 'SushiSwap', logo: 'https://cryptologos.cc/logos/sushiswap-sushi-logo.png', price: 1.45, change: -2.34, mcap: '380M', liquidity: '42M', network: 'ETH', ca: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2' },
    { symbol: 'MATIC', name: 'Polygon', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png', price: 0.89, change: 4.12, mcap: '8.9B', liquidity: '340M', network: 'MATIC', ca: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0' },
    { symbol: 'AVAX', name: 'Avalanche', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png', price: 42.15, change: 6.78, mcap: '16.8B', liquidity: '520M', network: 'AVAX', ca: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' },
    { symbol: 'OP', name: 'Optimism', logo: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png', price: 2.87, change: 8.45, mcap: '3.1B', liquidity: '180M', network: 'OP', ca: '0x4200000000000000000000000000000000000042' },
    { symbol: 'BASE', name: 'Base', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 0, change: 0, mcap: '0', liquidity: '0', network: 'BASE', ca: '0x4200000000000000000000000000000000000006' },
    { symbol: 'BTC', name: 'Bitcoin', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', price: 98450, change: 1.24, mcap: '1.9T', liquidity: '45B', network: 'BTC', ca: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', logo: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', price: 98420, change: 1.22, mcap: '12.4B', liquidity: '890M', network: 'ETH', ca: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    { symbol: 'USDT', name: 'Tether', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1.00, change: 0.01, mcap: '95B', liquidity: '12B', network: 'ETH', ca: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', price: 1.00, change: 0.00, mcap: '42B', liquidity: '8.5B', network: 'ETH', ca: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'DAI', name: 'Dai Stablecoin', logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', price: 1.00, change: 0.02, mcap: '5.3B', liquidity: '1.2B', network: 'ETH', ca: '0x6B175474E89094C44Da98b954EescdeCB5f2F' },
    { symbol: 'LDO', name: 'Lido DAO', logo: 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png', price: 2.34, change: 5.67, mcap: '2.1B', liquidity: '120M', network: 'ETH', ca: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32' },
    { symbol: 'APE', name: 'ApeCoin', logo: 'https://cryptologos.cc/logos/apecoin-ape-logo.png', price: 1.87, change: 12.34, mcap: '687M', liquidity: '45M', network: 'ETH', ca: '0x4d224452801ACEd8B2F0aebE155379bb5D594381' },
    { symbol: 'SAND', name: 'The Sandbox', logo: 'https://cryptologos.cc/logos/the-sandbox-sand-logo.png', price: 0.67, change: 3.21, mcap: '1.5B', liquidity: '78M', network: 'ETH', ca: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0' },
    { symbol: 'MANA', name: 'Decentraland', logo: 'https://cryptologos.cc/logos/decentraland-mana-logo.png', price: 0.52, change: 2.45, mcap: '1.1B', liquidity: '56M', network: 'ETH', ca: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942' },
    { symbol: 'AXS', name: 'Axie Infinity', logo: 'https://cryptologos.cc/logos/axie-infinity-axs-logo.png', price: 8.92, change: 7.89, mcap: '1.2B', liquidity: '67M', network: 'ETH', ca: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b' },
    { symbol: 'PALM', name: 'PalmAI', logo: 'https://via.placeholder.com/40/22c55e/FFFFFF?text=P', price: 0.0234, change: 45.67, mcap: '12.4M', liquidity: '890K', network: 'ETH', ca: '0xf1df7305e4bab3885cab5b1e4dfc338452a67891' },
  ]
  
  // Check if search is a contract address
  const isContractSearch = searchQuery.trim().startsWith('0x') && searchQuery.trim().length === 42
  
  // Map live search results to our token format - ALWAYS use real API data
  const getSearchResults = () => {
    const query = searchQuery.trim().toLowerCase()

    // If search is in progress, return empty to avoid stale results
    if (searchLoading && query.length >= 1) {
      return [];
    }

    // STOCK MODE: Use stock search results
    if (marketMode === 'stocks') {
      if (stockSearchResults && stockSearchResults.length > 0) {
        console.log('Using stock search results:', stockSearchResults.length);
        return stockSearchResults.map(result => ({
          symbol: result.symbol,
          name: result.name || result.description || result.symbol,
          logo: getStockLogo(result.symbol, result.sector),
          price: result.price || 0,
          change: result.change || result.changePercent || 0,
          mcap: result.marketCap ? fmtLarge(result.marketCap) : 'N/A',
          liquidity: result.volume ? fmtLarge(result.volume) : 'N/A',
          network: result.exchange || result.type || 'NYSE',
          networkId: null, // Stocks don't have network IDs
          ca: null, // Stocks don't have contract addresses
          ticker: result.symbol,
          sector: result.sector || '',
          exchange: result.exchange || result.type || 'NYSE',
          isStock: true,
          // Ensure we have real numeric values
          marketCap: result.marketCap || 0,
          volume: result.volume || 0,
        }))
      }

      // No stock results found
      if (query.length >= 1 && !searchLoading && (!stockSearchResults || stockSearchResults.length === 0)) {
        console.log('No stock search results - showing empty');
        return []
      }

      return []
    }

    // CRYPTO MODE: If we have live results from API, use ONLY those (real data from Codex)
    if (liveSearchResults && liveSearchResults.length > 0) {
      console.log('Using ONLY live API results:', liveSearchResults.length);
      return liveSearchResults.map(result => ({
        symbol: result.symbol,
        name: result.name,
        logo: result.logo || `https://via.placeholder.com/40/8B5CF6/FFFFFF?text=${result.symbol?.charAt(0) || '?'}`,
        price: result.price || result.priceUSD || 0, // Support both field names
        change: result.change || result.change24 || 0, // Support both field names
        mcap: result.formattedMcap || fmtLarge(result.marketCap) || 'N/A',
        liquidity: result.formattedLiquidity || fmtLarge(result.liquidity) || 'N/A',
        network: result.network || result.networkName || 'ETH',
        networkId: result.networkId || 1,
        ca: result.address,
        isStock: false,
        // Ensure we have real numeric values
        marketCap: result.marketCap || 0,
        volume: result.volume || result.volume24 || 0,
      }))
    }

    // No local fallback - only show API results
    // If API returns nothing, show empty (user can try different search)
    if (query.length >= 1 && !searchLoading && (!liveSearchResults || liveSearchResults.length === 0)) {
      console.log('No live results from API - showing empty');
      return []
    }

    // No search query - return empty (don't show hardcoded tokens)
    if (query.length < 1) {
      return []
    }

    return []
  }
  
  const tokens = getSearchResults()
  
  // Add full token data to search history
  const addToHistory = (token) => {
    const tokenData = {
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      price: token.price,
      change: token.change,
      mcap: token.mcap,
      liquidity: token.liquidity,
      network: token.network,
      ca: token.ca,
      networkId: token.networkId
    }
    // Remove any existing entry with same address or symbol, then prepend
    const updated = [
      tokenData,
      ...recentTokens.filter(t => t.ca !== token.ca && t.symbol !== token.symbol)
    ].slice(0, 8) // Keep last 8 recent tokens
    setRecentTokens(updated)
    localStorage.setItem('searchHistoryTokens', JSON.stringify(updated))
  }
  
  // Clear search history
  const clearHistory = () => {
    setRecentTokens([])
    localStorage.removeItem('searchHistoryTokens')
  }
  
  // State for recent tokens with live data
  const [recentTokensWithLiveData, setRecentTokensWithLiveData] = useState([])
  const [recentTokensLoading, setRecentTokensLoading] = useState(false)

  // Fetch live data for recent tokens when search is open and no query
  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length > 0 || recentTokens.length === 0) {
      setRecentTokensWithLiveData([])
      return
    }

    // Fetch live prices for recent tokens
    const fetchRecentTokenData = async () => {
      setRecentTokensLoading(true)
      try {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        const apiBase = isDev ? 'http://localhost:3001/api' : '/api/codex'

        // Fetch live data for each recent token by address
        const updatedTokens = await Promise.all(
          recentTokens.map(async (token) => {
            try {
              // Use token details endpoint to get current price, mcap, etc.
              const response = await fetch(
                `${apiBase}/token/details?address=${encodeURIComponent(token.ca)}&networkId=${token.networkId || 1}`
              )
              const data = await response.json()

              if (data && data.price !== undefined) {
                return {
                  ...token,
                  price: data.price || 0,
                  change: data.change24 || 0,
                  mcap: fmtLarge(data.marketCap || 0),
                  liquidity: fmtLarge(data.liquidity || 0),
                  marketCap: data.marketCap || 0,
                  volume: data.volume24 || 0,
                }
              }
              // If API fails, return token with existing data
              return token
            } catch (err) {
              console.log(`Failed to fetch live data for ${token.symbol}:`, err.message)
              // Return token with existing data if API fails
              return token
            }
          })
        )

        setRecentTokensWithLiveData(updatedTokens)
      } catch (err) {
        console.error('Failed to fetch recent token data:', err)
        // Fallback to cached recent tokens
        setRecentTokensWithLiveData(recentTokens)
      } finally {
        setRecentTokensLoading(false)
      }
    }

    fetchRecentTokenData()
  }, [searchOpen, searchQuery, recentTokens])

  // Filter tokens based on search or show recent (with live data)
  const filteredTokens = searchQuery.trim().length >= 1
    ? tokens // Search results (live API data)
    : (recentTokensWithLiveData.length > 0 ? recentTokensWithLiveData : recentTokens) // Show recently viewed tokens with live data

  // Time interval moved to HeaderClock component

  // Keyboard shortcuts
  // Close search and clear the input
  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setVoiceListening(false)
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported')
      return
    }
    stopVoice()
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onstart = () => setVoiceListening(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      setSearchQuery(transcript)
      // If final result and whisper mode, auto-search
      if (event.results[0].isFinal && transcript.trim().length >= 3) {
        if (whisperMode) {
          whisperSearch(transcript.trim())
        }
      }
    }
    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      setVoiceListening(false)
    }
    recognition.onend = () => setVoiceListening(false)
    recognition.start()
  }

  const toggleVoice = () => {
    if (voiceListening) {
      stopVoice()
    } else {
      // Auto-enable whisper mode when using voice
      if (!whisperMode) setWhisperMode(true)
      startVoice()
    }
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setWhisperMode(false)
    whisperClear()
    stopVoice()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘⇧K or Ctrl+Shift+K to toggle whisper mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setWhisperMode(prev => !prev)
        return
      }
      // ⌘K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      // ESC to close search
      if (e.key === 'Escape') {
        closeSearch()
      }
    }
    // Custom event from MobileHeader search button
    const handleOpenSearch = () => setSearchOpen(true)
    // Custom event from MobileHeader voice button — opens search + starts voice
    // IMPORTANT: Start voice synchronously to preserve user gesture chain on mobile.
    // setTimeout breaks the gesture requirement on iOS/Android.
    const handleOpenVoiceSearch = () => {
      setSearchOpen(true)
      setWhisperMode(true)
      // Start voice recognition immediately — synchronous call preserves user gesture
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        stopVoice()
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        recognition.continuous = false
        recognitionRef.current = recognition
        recognition.onstart = () => setVoiceListening(true)
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(r => r[0].transcript)
            .join('')
          setSearchQuery(transcript)
          if (event.results[0].isFinal && transcript.trim().length >= 3) {
            // Use ref to avoid stale closure from empty deps useEffect
            whisperSearchRef.current?.(transcript.trim())
          }
        }
        recognition.onerror = (e) => {
          console.warn('Speech recognition error:', e.error)
          setVoiceListening(false)
        }
        recognition.onend = () => setVoiceListening(false)
        try {
          recognition.start()
        } catch (err) {
          console.warn('Failed to start speech recognition:', err)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-search', handleOpenSearch)
    window.addEventListener('open-voice-search', handleOpenVoiceSearch)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-search', handleOpenSearch)
      window.removeEventListener('open-voice-search', handleOpenVoiceSearch)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Add body class when search is open
  useEffect(() => {
    if (searchOpen) {
      document.body.classList.add('search-open')
    } else {
      document.body.classList.remove('search-open')
    }
    return () => document.body.classList.remove('search-open')
  }, [searchOpen])

  // dayName and timeStr moved to HeaderClock component

  // Format temperature based on unit
  const formatTemp = (tempC) => {
    if (tempC == null) return '--'
    const temp = tempUnit === 'fahrenheit' ? cToF(tempC) : tempC
    return `${temp}°`
  }

  const isDayMode = welcomeActive ? welcomeDayMode : researchZoneActive ? researchZoneDayMode : false

  return (
    <header className="header">
      <div className="header-inner">
        {/* Left: Logo + Weather + Time */}
        <div className="header-left">
          <button className={`logo ${isDayMode ? 'logo-day' : 'logo-dark'}`} onClick={onLogoClick} title="Discover Tokens">
            <img src="/logo-text-dark.png" alt="Spectre AI" className="logo-full" />
          </button>

          <div className="header-spacer"></div>

          {/* Weather Widget - Apple Style with Real Data */}
          <div 
            className="weather-card" 
            onClick={toggleTempUnit}
            title={weather ? `${getWeatherInfo(weather.code).desc} • ${t('header.toggleTempUnit', { unit: tempUnit === 'celsius' ? 'Fahrenheit' : 'Celsius' })}` : t('header.loadingWeather')}
            style={{ cursor: 'pointer' }}
          >
            <div className={`weather-icon-large ${weather ? getWeatherInfo(weather.code).icon : 'loading'}`}>
              {(!weather || getWeatherInfo(weather.code).icon === 'clear') && (
              <div className="sun"></div>
              )}
              {weather && ['partly-cloudy', 'cloudy', 'fog'].includes(getWeatherInfo(weather.code).icon) && (
                <div className="cloud"></div>
              )}
              {weather && ['rain', 'drizzle', 'storm'].includes(getWeatherInfo(weather.code).icon) && (
              <div className="cloud">
                <div className="rain-drops">
                  <span></span><span></span><span></span>
                </div>
              </div>
              )}
              {weather && getWeatherInfo(weather.code).icon === 'snow' && (
                <div className="cloud">
                  <div className="snow-flakes">
                    <span>❄</span><span>❄</span><span>❄</span>
                  </div>
                </div>
              )}
              {weatherLoading && <div className="weather-spinner"></div>}
            </div>
            <div className="weather-info">
              <span className="weather-location">{weather?.location || t('common.loading')}</span>
              <div className="weather-temps">
                <span className="temp-high">{formatTemp(weather?.high)}</span>
                <span className="temp-divider">/</span>
                <span className="temp-low">{formatTemp(weather?.low)}</span>
                <span className="temp-unit" style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '2px' }}>
                  {tempUnit === 'celsius' ? 'C' : 'F'}
                </span>
              </div>
            </div>
          </div>

          {/* Date/Time Widget - Apple Style (isolated to prevent full header re-renders) */}
          <HeaderClock timeFormat={timeFormat} onToggleFormat={toggleTimeFormat} />

          {/* GM + ROI buttons - always visible together */}
          <div className="header-gm-roi-wrap">
            <button
              type="button"
              className="header-gm-btn"
              onClick={() => onOpenGM ? onOpenGM() : triggerCopyToast?.('GM! Have a great one.')}
              title="Good morning — open dashboard"
              aria-label="GM, open dashboard"
            >
              <span className="header-gm-text">{t('header.gm')}</span>
            </button>
            <button
              type="button"
              className="header-roi-btn"
              onClick={() => onOpenROI?.()}
              title="ROI calculator — current to ATH"
              aria-label="ROI calculator"
            >
              <span className="header-roi-text">{t('header.roiPercent')}</span>
            </button>
          </div>
        </div>

        {/* Center: Search Trigger - Compact */}
        <div className="header-center">
          <button className="search-trigger" onClick={() => setSearchOpen(true)}>
            <div className="search-icon-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <span>{t('common.search')}</span>
            <div className="search-shortcut">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </div>
          </button>
        </div>

        {/* Right: Actions + Profile */}
        <div className="header-right">
          {/* Crypto / Stocks toggle – in right section so it doesn't overlay search or % */}
          <div className="header-market-toggle" role="tablist" aria-label="Market type">
            <button
              type="button"
              role="tab"
              aria-selected={marketMode === 'crypto'}
              className={marketMode === 'crypto' ? 'active' : ''}
              onClick={() => setMarketMode('crypto')}
            >
              {t('nav.crypto')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={marketMode === 'stocks'}
              className={marketMode === 'stocks' ? 'active' : ''}
              onClick={() => setMarketMode('stocks')}
            >
              {t('nav.stocks')}
            </button>
          </div>

          {/* Terminal / Cinema Mode Toggle */}
          {onAppDisplayModeChange && (
            <div
              className={`header-mode-toggle ${appDisplayMode === 'cinema' ? 'cinema-active' : 'terminal-active'}`}
              onClick={() => onAppDisplayModeChange(appDisplayMode === 'terminal' ? 'cinema' : 'terminal')}
              title={appDisplayMode === 'terminal' ? t('header.switchToCinema') : t('header.switchToTerminal')}
              role="switch"
              aria-checked={appDisplayMode === 'cinema'}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onAppDisplayModeChange(appDisplayMode === 'terminal' ? 'cinema' : 'terminal')
                }
              }}
            >
              <div className="header-mode-toggle-track">
                <div className="header-mode-toggle-thumb"></div>
                <div className="header-mode-toggle-icon terminal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <div className="header-mode-toggle-icon cinema-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Screener */}
          <div className="header-screener-mobile-wrap">
            <button
              type="button"
              className={`btn-degen ${tradingModeActive ? 'is-active' : ''}`}
              onClick={onTradingModeClick}
            >
              <span className="degen-glow"></span>
              <span className="degen-content">
                <svg className="degen-bolt header-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                {t('header.screener')}
              </span>
            </button>
          </div>

          {/* Day/Night Toggle – pill style with both icons visible */}
          {((researchZoneActive && onResearchZoneDayModeChange) || (welcomeActive && onWelcomeDayModeChange)) && (
            <div
              className={`header-theme-toggle ${(researchZoneActive ? researchZoneDayMode : welcomeDayMode) ? 'day-active' : 'night-active'}`}
              onClick={() => researchZoneActive ? onResearchZoneDayModeChange(!researchZoneDayMode) : onWelcomeDayModeChange(!welcomeDayMode)}
              title={(researchZoneActive ? researchZoneDayMode : welcomeDayMode) ? t('header.switchToNight') : t('header.switchToDay')}
              role="switch"
              aria-checked={researchZoneActive ? researchZoneDayMode : welcomeDayMode}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); researchZoneActive ? onResearchZoneDayModeChange(!researchZoneDayMode) : onWelcomeDayModeChange(!welcomeDayMode) }}}
            >
              <div className="header-theme-toggle-track">
                <div className="header-theme-toggle-thumb"></div>
                <div className="header-theme-toggle-icon header-theme-toggle-moon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                </div>
                <div className="header-theme-toggle-icon header-theme-toggle-sun">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <button type="button" className="btn-deposit btn-play" onClick={() => setMemoryGameOpen(true)}>
            <svg className="header-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>
            </svg>
            {t('header.play')}
          </button>

          <div className="header-icons">
            <button className="icon-btn" title={t('header.notifications')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="notification-dot"></span>
            </button>

            <button className={`icon-btn${settingsPanelOpen ? ' is-open' : ''}`} title={t('header.settings')} onClick={() => { setSettingsPanelOpen(o => !o); setProfileDropdownOpen(false) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <SettingsPanel open={settingsPanelOpen} onClose={() => setSettingsPanelOpen(false)} dayMode={isDayMode} />

          <div className="profile-dropdown-wrap">
            <button type="button" className={`profile profile-trigger ${profileDropdownOpen ? 'is-open' : ''}`} onClick={() => { setProfileDropdownOpen((o) => !o); setSettingsPanelOpen(false) }} aria-expanded={profileDropdownOpen} aria-haspopup="true">
              <div className="avatar">
                <img src={profile.imageUrl} alt="Profile" />
              </div>
              <div className="profile-info">
                <span className="name">{profile.name}</span>
                <span className="balance">{fmtPrice(2195)}</span>
              </div>
              <svg className="profile-chevron" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {profileDropdownOpen && (
              <>
                <div className="profile-dropdown-backdrop" onClick={() => setProfileDropdownOpen(false)} aria-hidden />
                <div className="profile-dropdown-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-user">
                      <img src={profile.imageUrl} alt="" className="profile-dropdown-avatar" />
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{profile.name}</span>
                        <span className="profile-dropdown-balance">{fmtPrice(2195)}</span>
                      </div>
                    </div>
                    <button type="button" className="profile-dropdown-close" onClick={() => setProfileDropdownOpen(false)} aria-label="Close">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="profile-dropdown-actions">
                    <button type="button" className="profile-dropdown-deposit">{t('header.deposit')}</button>
                    <button type="button" className="profile-dropdown-withdraw">{t('header.withdraw')}</button>
                  </div>
                  <div className="profile-dropdown-section">
                    <h3 className="profile-dropdown-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 00-2 2c0 1.1.9 2 2 2h4v-4h-2z" /></svg>
                      {t('header.dailyRewards')}
                    </h3>
                    <p className="profile-dropdown-section-sub">{t('header.loginTimes', { count: 4 })}</p>
                    <div className="profile-dropdown-stats">
                      <div className="profile-dropdown-stat">
                        <span className="profile-dropdown-stat-value">{gamification.daysClaimed} {t('header.daysClaimed')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></svg>
                      </div>
                      <div className="profile-dropdown-stat">
                        <span className="profile-dropdown-stat-value">{gamification.points} {t('header.points')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      </div>
                      <div className="profile-dropdown-stat">
                        <span className="profile-dropdown-stat-value">{gamification.spectreTokens} {t('header.spectreTokens')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
                      </div>
                      <div className="profile-dropdown-stat">
                        <span className="profile-dropdown-stat-value">{gamification.streak} {t('header.dayStreak')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="profile-dropdown-section">
                    <h3 className="profile-dropdown-section-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></svg>
                      {t('header.thirtyDayChallenge')}
                    </h3>
                    <div className="profile-dropdown-challenge-bar">
                      <div className="profile-dropdown-challenge-fill" style={{ width: `${(gamification.challengeDaysCompleted / 30) * 100}%` }} />
                    </div>
                    <p className="profile-dropdown-challenge-text">{t('header.daysCompleted', { completed: gamification.challengeDaysCompleted })}</p>
                  </div>
                  <div className="profile-dropdown-section">
                    <div className="profile-dropdown-section-row">
                      <h3 className="profile-dropdown-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 00-2 2c0 1.1.9 2 2 2h4v-4h-2z" /></svg>
                        {t('header.claimYourRewards')}
                      </h3>
                      <button type="button" className="profile-dropdown-calendar-toggle" onClick={() => setCalendarHidden((h) => !h)}>
                        {calendarHidden ? t('header.showCalendar') : t('header.hideCalendar')}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={calendarHidden ? '' : 'chevron-up'}><path d="M18 15l-6-6-6 6" /></svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="profile-dropdown-claim-today"
                      onClick={() => nextClaimableDay != null && handleClaimDay(nextClaimableDay)}
                      disabled={nextClaimableDay == null}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 00-2 2c0 1.1.9 2 2 2h4v-4h-2z" /></svg>
                      {t('header.claimReward')}
                    </button>
                    {!calendarHidden && (
                      <div className="profile-dropdown-calendar">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                          const isClaimed = gamification.claimedDays.includes(day)
                          const isNextClaimable = day === nextClaimableDay
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`profile-dropdown-calendar-day ${isClaimed ? 'claimed' : ''} ${isNextClaimable ? 'claimable' : ''}`}
                              onClick={() => isNextClaimable && handleClaimDay(day)}
                              disabled={!isNextClaimable}
                              title={isNextClaimable ? t('header.claimDay', { day }) : isClaimed ? t('header.dayClaimed', { day }) : t('header.claimInOrder')}
                            >
                              {isClaimed ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                              )}
                              <span>{day}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reward Claimed! congrats modal – portal to body */}
      {claimModalOpen && claimModalDay != null && createPortal(
        <div className="reward-claimed-overlay" onClick={closeClaimModal}>
          <div className="reward-claimed-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="reward-claimed-close" onClick={closeClaimModal} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <div className="reward-claimed-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 00-2 2c0 1.1.9 2 2 2h4v-4h-2z" /></svg>
            </div>
            <h2 className="reward-claimed-title">Reward Claimed!</h2>
            <p className="reward-claimed-day">Day {claimModalDay} of 30</p>
            <div className="reward-claimed-badges">
              <span className="reward-claimed-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                +1 Point
              </span>
              <span className="reward-claimed-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2z" /></svg>
                {gamification.challengeDaysCompleted}/30 Days
              </span>
            </div>
            <p className="reward-claimed-message">Keep it up! Claim your reward every day to earn 100 SPECTRE Tokens!</p>
            <p className="reward-claimed-hint">Press Escape or click outside to close</p>
          </div>
        </div>,
        document.body
      )}

      {/* Crypto Memory Game modal – portal to body so it centers above everything */}
      {memoryGameOpen && createPortal(
        <CryptoMemoryGame onClose={() => setMemoryGameOpen(false)} />,
        document.body
      )}

      {/* Search Modal - Portal to body so it escapes header stacking context */}
      {searchOpen && createPortal(
        <div className={`search-portal-root${isDayMode ? ' search-day-mode' : ''}`}>
          <div className="search-modal-overlay" onClick={closeSearch} />
          <div className="search-modal-v2" onClick={(e) => e.stopPropagation()}>
            {/* Search Input Bar */}
            <div className={`search-input-bar${whisperMode ? ' whisper-glow' : ''}`}>
              {/* Search icon (left side) */}
              <div className="search-input-icon-wrap">
                {whisperMode ? (
                  <svg className="search-input-icon whisper-icon-active" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.27 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
                  </svg>
                ) : (
                  <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                )}
              </div>

              {/* Whisper badges — inline before input */}
              {whisperMode && (
                <div className="whisper-badges">
                  <span className="whisper-ai-badge">AI</span>
                  {whisperData && (
                    <span className={`whisper-asset-pill ${whisperData.assetClass === 'stocks' ? 'stocks' : 'crypto'}`}>
                      {whisperData.assetClass === 'stocks' ? t('nav.stocks') : t('nav.crypto')}
                    </span>
                  )}
                </div>
              )}

              <input
                type="text"
                placeholder={whisperMode
                  ? t('header.searchAI')
                  : (marketMode === 'stocks' ? t('header.searchStocks') : t('header.search'))}
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Enter in whisper mode triggers AI search
                  if (whisperMode && e.key === 'Enter' && searchQuery.trim().length >= 3) {
                    e.preventDefault()
                    whisperSearch(searchQuery)
                  }
                  // Tab toggles mode when input is empty
                  if (e.key === 'Tab' && !searchQuery.trim()) {
                    e.preventDefault()
                    setWhisperMode(prev => !prev)
                    whisperClear()
                  }
                }}
                className="search-input-v2"
              />
              <div className="search-input-actions">
                {/* Whisper AI toggle — replaces old advanced search button */}
                <button
                  className={`search-whisper-toggle${whisperMode ? ' active' : ''}`}
                  type="button"
                  onClick={() => {
                    setWhisperMode(prev => !prev)
                    whisperClear()
                    setSearchQuery('')
                    stopVoice()
                  }}
                  title={whisperMode ? 'Switch to standard search' : 'Whisper AI Search'}
                  aria-label={whisperMode ? 'Switch to standard search' : 'Whisper AI Search'}
                >
                  <svg viewBox="0 0 24 24" fill={whisperMode ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={whisperMode ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.09 6.26L20.18 9.27l-5.09 3.9L16.18 20 12 16.27 7.82 20l1.09-6.83L3.82 9.27l6.09-1.01L12 2z" />
                  </svg>
                </button>

                {/* Voice mic button — visible in whisper mode */}
                {whisperMode && (
                  <button
                    className={`search-voice-btn${voiceListening ? ' listening' : ''}`}
                    type="button"
                    onClick={toggleVoice}
                    title={voiceListening ? 'Stop listening' : 'Voice search'}
                    aria-label={voiceListening ? 'Stop listening' : 'Voice search'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    {voiceListening && <span className="voice-pulse-ring" />}
                  </button>
                )}

                {searchQuery && (
                  <button className="search-action-btn" onClick={() => { setSearchQuery(''); stopVoice() }} title="Clear search" aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                <button className="search-close-btn" onClick={closeSearch} title="Close (ESC)" aria-label="Close">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Results Section — Whisper AI or Standard */}
            {whisperMode ? (
              <div className="search-results-v2 whisper-results-wrap">
                <WhisperResults
                  data={whisperData}
                  loading={whisperLoading}
                  error={whisperError}
                  onSelectToken={(token) => {
                    const tokenData = {
                      symbol: token.symbol,
                      name: token.name,
                      address: null,
                      networkId: 1,
                      price: token.price,
                      change: token.change24h || token.change,
                      logo: token.logo,
                      isStock: false,
                    }
                    if (onSelectTokenAndOpen) onSelectTokenAndOpen(tokenData)
                    else if (selectToken) selectToken(tokenData)
                    closeSearch()
                  }}
                  onSelectStock={(stock) => {
                    const stockData = {
                      symbol: stock.symbol,
                      name: stock.name,
                      price: stock.price,
                      change: stock.change24h || stock.change,
                      logo: null,
                      exchange: stock.exchange,
                      sector: stock.sector,
                      marketCap: stock.marketCap,
                      volume: stock.volume,
                      isStock: true,
                    }
                    if (onSelectTokenAndOpen) onSelectTokenAndOpen(stockData)
                    else if (selectToken) selectToken(stockData)
                    closeSearch()
                  }}
                />
              </div>
            ) : (
            <div className="search-results-v2">
              <div className="search-section-header">
                <div className="section-label-v2">
                  {searchLoading || recentTokensLoading ? (
                    <>
                      <svg className="search-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                      </svg>
                      <span>{searchLoading ? (isContractSearch ? 'Looking up contract...' : t('common.searching')) : t('common.refreshing')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>
                        {searchQuery.trim().length >= 1
                          ? `Results (${filteredTokens.length})`
                          : `Recent (Live)`
                        }
                      </span>
                    </>
                  )}
                </div>
                {!searchQuery.trim() && recentTokens.length > 0 && (
                  <button className="clear-btn-v2" onClick={clearHistory}>
                    {t('common.clear')}
                  </button>
                )}
              </div>

              <div className="search-tokens-list">
                {filteredTokens.length > 0 ? (
                  filteredTokens.map((token, index) => (
                    <div
                      key={`${token.symbol}-${token.ca || index}`}
                      className="token-card-v2"
                      onClick={() => {
                        addToHistory(token)
                        if (token.isStock) {
                          // Stock data
                          const stockData = {
                            symbol: token.symbol,
                            name: token.name,
                            price: token.price,
                            change: token.change,
                            logo: token.logo,
                            exchange: token.exchange,
                            sector: token.sector,
                            marketCap: token.marketCap,
                            volume: token.volume,
                            isStock: true
                          }
                          if (onSelectTokenAndOpen) {
                            onSelectTokenAndOpen(stockData)
                          } else if (selectToken) {
                            selectToken(stockData)
                          }
                        } else {
                          // Crypto token data
                          const tokenData = {
                            symbol: token.symbol,
                            name: token.name,
                            address: token.address ?? token.ca,
                            networkId: token.networkId || 1,
                            price: token.price,
                            change: token.change,
                            logo: token.logo,
                            isStock: false
                          }
                          if (onSelectTokenAndOpen) {
                            onSelectTokenAndOpen(tokenData)
                          } else if (selectToken) {
                            selectToken(tokenData)
                          }
                        }
                        closeSearch()
                      }}
                    >
                      {/* Left highlight strip with heart (watchlist) */}
                      <div className="token-card-left-strip">
                        <button
                          className={`token-favorite-btn ${isInWatchlist && isInWatchlist(token.ca || token.symbol) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const tokenId = token.ca || token.symbol
                            if (isInWatchlist && isInWatchlist(tokenId)) {
                              removeFromWatchlist(tokenId)
                            } else {
                              addToWatchlist({
                                symbol: token.symbol,
                                name: token.name,
                                price: token.price,
                                change: token.change,
                                marketCap: parseMcap(token.mcap),
                                logo: token.logo,
                                address: token.ca,
                                networkId: token.networkId || 1,
                                pinned: false,
                                isStock: token.isStock || false,
                                sector: token.sector,
                                exchange: token.exchange,
                              })
                            }
                          }}
                          title={isInWatchlist && isInWatchlist(token.ca || token.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                          aria-label={isInWatchlist && isInWatchlist(token.ca || token.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          <svg viewBox="0 0 24 24" fill={isInWatchlist && isInWatchlist(token.ca || token.symbol) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        </button>
                      </div>

                      {/* Token Logo */}
                      <img src={token.logo} alt={token.symbol} className="token-logo-v2" />

                      {/* Token Info */}
                      <div className="token-info-v2">
                        <div className="token-header-row">
                          <span className="token-symbol-v2">{token.symbol}</span>
                          <span className="token-network-badge">{token.isStock ? token.exchange : token.network}</span>
                        </div>
                        <span className="token-name-v2">{token.name}</span>
                        {token.isStock ? (
                          token.sector && (
                            <span className="token-address-v2">
                              <span className="token-address-dot" aria-hidden>·</span>
                              {token.sector}
                            </span>
                          )
                        ) : (
                          token.ca && (
                            <span
                              className="token-address-v2"
                              title="Click to copy"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(token.ca)
                                triggerCopyToast()
                              }}
                            >
                              <span className="token-address-dot" aria-hidden>·</span>
                              {token.ca.substring(0, 5)}...{token.ca.slice(-4)}
                            </span>
                          )
                        )}
                      </div>

                      {/* Token Stats */}
                      <div className="token-stats-v2">
                        <div className="token-price-row">
                          <span className="token-price-v2">{fmtPrice(token.price)}</span>
                          <span className={`token-change-badge ${(token.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {(token.change || 0) >= 0 ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 19V5M5 12l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12l7 7 7-7" />
                              </svg>
                            )}
                            {(() => {
                              const change = token.change || 0;
                              const isPercentForm = Math.abs(change) > 1;
                              const pct = isPercentForm ? change : change * 100;
                              return Math.abs(pct).toFixed(2);
                            })()}%
                          </span>
                        </div>
                        <div className="token-meta-row">
                          <span className="token-meta-item">MC {typeof token.mcap === 'string' ? token.mcap : (token.mcap != null ? fmtLarge(token.mcap) : 'N/A')}</span>
                          <span className="token-meta-sep" aria-hidden>·</span>
                          <span className="token-meta-item">{token.isStock ? 'Vol' : 'Liq'} {typeof token.liquidity === 'string' ? token.liquidity : (token.liquidity != null ? fmtLarge(token.liquidity) : 'N/A')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="search-empty-state">
                    {searchQuery.trim() ? (
                      <>
                        <div className="empty-icon-container">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                        </div>
                        <span className="empty-title">{marketMode === 'stocks' ? t('welcome.noStocksFound') : t('welcome.noTokensFound')}</span>
                        {isContractSearch && (
                          <span className="empty-hint">{t('welcome.tokenNotIndexed')}</span>
                        )}
                        {searchError && (
                          <span className="empty-hint error">API Error: {searchError}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="empty-icon-container">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                        </div>
                        <span className="empty-title">{t('welcome.noRecentSearches')}</span>
                        <span className="empty-hint">{marketMode === 'stocks' ? 'Search for stocks to get started' : 'Search for tokens to get started'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}

export default Header
