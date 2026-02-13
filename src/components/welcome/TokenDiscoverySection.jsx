/**
 * TokenDiscoverySection Component
 * Contains: Top Coins, On-Chain, Predictions tabs with table/grid views
 * CODE-SPLIT: This is the heaviest section - loaded via React.lazy()
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../hooks/useCurrency'
import { getTopCoinsMarketsPage } from '../../services/coinGeckoApi'
import { resolveTradingViewSymbol } from '../../lib/tradingViewSymbols'
import TradingChart from '../TradingChart'

// Constants
const TOP_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', networkId: 1 },
  { symbol: 'ETH', name: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', networkId: 1 },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', networkId: 1 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', networkId: 1 },
  { symbol: 'BNB', name: 'BNB', address: '0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', networkId: 56 },
  { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', networkId: 1399811149 },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', networkId: 42161 },
  { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', networkId: 10 },
  { symbol: 'MATIC', name: 'Polygon', address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', networkId: 1 },
  { symbol: 'AVAX', name: 'Avalanche', address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', networkId: 43114 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', networkId: 1 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', networkId: 1 },
]

const TOKEN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
}

const ONCHAIN_CHAINS = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'eth', label: 'Ethereum' },
  { id: 'bsc', label: 'BSC' },
  { id: 'sol', label: 'Solana' },
  { id: 'arb', label: 'Arbitrum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'avax', label: 'Avalanche' },
  { id: 'base', label: 'Base' },
]

const ONCHAIN_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'meme', label: 'Meme' },
  { id: 'dex', label: 'DEX' },
  { id: 'lending', label: 'Lending' },
  { id: 'nft', label: 'NFT' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'staking', label: 'Staking' },
  { id: 'gaming', label: 'Gaming' },
]

// Mock on-chain data
const ONCHAIN_MOCK = [
  { id: 1, symbol: 'PEPE', name: 'Pepe', pair: '/ETH', networkId: 'eth', category: 'Meme', price: 0.00000852, age: '1y', txns: 125000, volume: 45000000, makers: 8200, change5m: 0.2, change1h: -1.5, change6h: 2.1, change24h: 5.8, liquidity: 8900000, mcap: 3500000000, boost: null },
  { id: 2, symbol: 'WIF', name: 'Dogwifhat', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 1.85, age: '8mo', txns: 45000, volume: 28000000, makers: 5200, change5m: 1.2, change1h: 3.4, change6h: 8.2, change24h: 12.5, liquidity: 12400000, mcap: 1800000000, boost: 50 },
  { id: 3, symbol: 'JUP', name: 'Jupiter', pair: '/SOL', networkId: 'sol', category: 'DEX', price: 0.82, age: '4mo', txns: 95000, volume: 192000000, makers: 22000, change5m: 0.2, change1h: 2.1, change6h: 5.4, change24h: 18.2, liquidity: 45000000, mcap: 1100000000, boost: null },
  { id: 4, symbol: 'BONK', name: 'Bonk', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.0000234, age: '1y', txns: 62000, volume: 28000000, makers: 8200, change5m: -0.5, change1h: 1.2, change6h: 4.5, change24h: 8.9, liquidity: 12500000, mcap: 1500000000, boost: 100 },
  { id: 5, symbol: 'AAVE', name: 'Aave', pair: '/ETH', networkId: 'eth', category: 'Lending', price: 95.5, age: '3y', txns: 12000, volume: 85000000, makers: 3500, change5m: 0.1, change1h: 0.8, change6h: 1.2, change24h: 3.4, liquidity: 180000000, mcap: 1400000000, boost: null },
  { id: 6, symbol: 'GMX', name: 'GMX', pair: '/ARB', networkId: 'arb', category: 'DEX', price: 28.5, age: '1y', txns: 22000, volume: 18000000, makers: 6400, change5m: 0.3, change1h: 4.1, change6h: 12.2, change24h: 22.1, liquidity: 72000000, mcap: 280000000, boost: null },
  { id: 7, symbol: 'RAY', name: 'Raydium', pair: '/SOL', networkId: 'sol', category: 'DEX', price: 1.24, age: '2y', txns: 44000, volume: 31000000, makers: 9200, change5m: 0.5, change1h: 2.8, change6h: 8.2, change24h: 11.2, liquidity: 85000000, mcap: 320000000, boost: null },
  { id: 8, symbol: 'CAKE', name: 'PancakeSwap', pair: '/BNB', networkId: 'bsc', category: 'DEX', price: 2.18, age: '3y', txns: 38000, volume: 42000000, makers: 11200, change5m: -0.2, change1h: 0.8, change6h: 2.4, change24h: 5.8, liquidity: 95000000, mcap: 480000000, boost: null },
]

const PREDICTIONS_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
  { id: 'science', label: 'Science' },
  { id: 'other', label: 'Other' },
]

const PREDICTIONS_MOCK = [
  { id: 1, question: 'Will BTC be above $100k by end of 2025?', category: 'Crypto', yesPct: 62, volume: 1240000, liquidity: 890000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 2, question: 'Will ETH hit $5k before Jan 2026?', category: 'Crypto', yesPct: 48, volume: 890000, liquidity: 620000, endDate: 'Jan 1, 2026', resolution: 'Polymarket' },
  { id: 3, question: 'S&P 500 above 6000 by Q2 2025?', category: 'Stocks', yesPct: 71, volume: 2100000, liquidity: 1500000, endDate: 'Jun 30, 2025', resolution: 'Kalshi' },
  { id: 4, question: 'Fed rate cut in March 2025?', category: 'Politics', yesPct: 55, volume: 560000, liquidity: 380000, endDate: 'Mar 31, 2025', resolution: 'Polymarket' },
  { id: 5, question: 'Will crypto market cap hit $5T in 2025?', category: 'Crypto', yesPct: 42, volume: 780000, liquidity: 520000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 6, question: 'AI model passes bar exam by 2026?', category: 'Science', yesPct: 82, volume: 310000, liquidity: 220000, endDate: 'Dec 31, 2026', resolution: 'Manifold' },
]

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'defi', label: 'DeFi' },
  { id: 'ai', label: 'AI' },
  { id: 'meme', label: 'Meme' },
  { id: 'rwa', label: 'RWA' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'privacy', label: 'Privacy' },
]

const TOKEN_CATEGORY = {
  BTC: 'defi', ETH: 'defi', USDT: 'defi', USDC: 'defi', BNB: 'defi', SOL: 'defi',
  ARB: 'defi', OP: 'defi', MATIC: 'defi', AVAX: 'defi', LINK: 'defi', UNI: 'defi',
  AAVE: 'defi', CRV: 'defi', MKR: 'defi', LDO: 'defi',
  FET: 'ai', RENDER: 'ai', TAO: 'ai', OCEAN: 'ai', GRT: 'ai',
  PEPE: 'meme', WIF: 'meme', BONK: 'meme', DOGE: 'meme', SHIB: 'meme',
}

// Icons
const icons = {
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  heartFilled: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
}

const TokenDiscoverySection = ({
  // Market mode
  marketMode = 'crypto',
  isStocks = false,
  // Price data
  topCoinPrices = {},
  stockPrices = {},
  // Event handlers
  onOpenResearchZone,
  onOpenAIScreener,
  onSelectToken,
  // Watchlist
  isInWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  // Layout
  dayMode = false,
  tabsOn = false,
  setTabsOn,
}) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge, fmtPriceShort } = useCurrency()
  
  // Top section tab state
  const [topSectionTab, setTopSectionTab] = useState('topcoins') // 'topcoins' | 'onchain' | 'predictions'
  
  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  // View mode (grid/list)
  const [viewMode, setViewMode] = useState('list')
  
  // Pagination for Top Coins
  const TOP_COINS_PAGE_SIZE = 25
  const TOTAL_TOP_COINS_PAGES = 40
  const [topCoinsPage, setTopCoinsPage] = useState(1)
  const [topCoinsTokens, setTopCoinsTokens] = useState([])
  const [topCoinsLoading, setTopCoinsLoading] = useState(false)
  
  // On-chain filters
  const [onChainChainFilter, setOnChainChainFilter] = useState('mixed')
  const [onChainCategoryFilter, setOnChainCategoryFilter] = useState('all')
  const [onChainTimeframe, setOnChainTimeframe] = useState('24h')
  const [onChainViewMode, setOnChainViewMode] = useState('list')
  
  // Predictions filter
  const [predictionsCategoryFilter, setPredictionsCategoryFilter] = useState('all')
  
  // Chart panel state
  const [chartPanelToken, setChartPanelToken] = useState(null)
  const [chartOverlayTimeframe, setChartOverlayTimeframe] = useState('24h')
  const [chartOverlaySubTab, setChartOverlaySubTab] = useState('tradingview')
  
  // ESC key to close chart
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setChartPanelToken(null)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])
  
  // Reset chart when switching away from topcoins
  useEffect(() => {
    if (topSectionTab !== 'topcoins') {
      setChartPanelToken(null)
    }
  }, [topSectionTab])
  
  // Fetch Top Coins from CoinGecko
  useEffect(() => {
    if (topSectionTab !== 'topcoins' || isStocks) return
    let cancelled = false
    setTopCoinsLoading(true)
    getTopCoinsMarketsPage(topCoinsPage, TOP_COINS_PAGE_SIZE)
      .then((markets) => {
        if (cancelled) return
        const baseRank = (topCoinsPage - 1) * TOP_COINS_PAGE_SIZE
        const list = (markets || []).map((coin, index) => ({
          rank: coin.market_cap_rank || baseRank + index + 1,
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          logo: coin.image || TOKEN_LOGOS[(coin.symbol || '').toUpperCase()],
          price: Number(coin.current_price) || 0,
          change: Number(coin.price_change_percentage_24h) || 0,
          change1h: Number(coin.price_change_percentage_1h_in_currency) || 0,
          change7d: Number(coin.price_change_percentage_7d_in_currency) || 0,
          change30d: Number(coin.price_change_percentage_30d_in_currency) || 0,
          volume: Number(coin.total_volume) || 0,
          marketCap: Number(coin.market_cap) || 0,
          sparkline_7d: coin.sparkline_in_7d?.price || null,
        }))
        setTopCoinsTokens(list)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Top Coins fetch failed:', err)
          setTopCoinsTokens([])
        }
      })
      .finally(() => {
        if (!cancelled) setTopCoinsLoading(false)
      })
    return () => { cancelled = true }
  }, [topSectionTab, topCoinsPage, isStocks])
  
  // Filter tokens by category
  const filteredTopCoins = useMemo(() => {
    let tokens = isStocks ? [] : topCoinsTokens
    if (!isStocks && topCoinsTokens.length === 0) {
      // Fallback to TOP_COINS with price data
      tokens = TOP_COINS.map((coin, index) => {
        const data = topCoinPrices?.[coin.symbol]
        return {
          rank: index + 1,
          symbol: coin.symbol,
          name: coin.name,
          logo: TOKEN_LOGOS[coin.symbol],
          price: data?.price || 0,
          change: data?.change || 0,
          volume: data?.volume || 0,
          marketCap: data?.marketCap || 0,
        }
      })
    }
    
    if (categoryFilter === 'all') return tokens
    return tokens.filter(token => TOKEN_CATEGORY[token.symbol] === categoryFilter)
  }, [topCoinsTokens, categoryFilter, isStocks, topCoinPrices])
  
  // Filter on-chain data
  const filteredOnChain = useMemo(() => {
    let rows = ONCHAIN_MOCK
    if (onChainChainFilter !== 'mixed') {
      rows = rows.filter(r => r.networkId === onChainChainFilter)
    }
    if (onChainCategoryFilter !== 'all') {
      rows = rows.filter(r => r.category?.toLowerCase() === onChainCategoryFilter)
    }
    return rows
  }, [onChainChainFilter, onChainCategoryFilter])
  
  // Filter predictions
  const filteredPredictions = useMemo(() => {
    if (predictionsCategoryFilter === 'all') return PREDICTIONS_MOCK
    return PREDICTIONS_MOCK.filter(p => p.category?.toLowerCase() === predictionsCategoryFilter)
  }, [predictionsCategoryFilter])
  
  // Handlers
  const handleTopCoinClick = (token) => {
    if (onOpenResearchZone) {
      onOpenResearchZone(token)
    } else if (onSelectToken) {
      onSelectToken(token)
    }
    
    // Open inline chart panel if tabs are on
    if (tabsOn && setTabsOn) {
      setChartPanelToken(token)
    }
  }
  
  const handleOnChainClick = (row) => {
    const token = {
      symbol: row.symbol,
      name: row.name,
      address: row.address,
      networkId: row.networkId,
      price: row.price,
      change: row.change24h,
      logo: TOKEN_LOGOS[row.symbol],
    }
    
    if (tabsOn) {
      setChartPanelToken(token)
    } else if (onOpenAIScreener) {
      onOpenAIScreener(token)
    }
  }
  
  // Helpers
  const getTokenInitials = (symbol) => (symbol || '').slice(0, 2).toUpperCase()
  
  const formatChange = (change) => {
    const value = typeof change === 'number' ? change : parseFloat(change) || 0
    return value.toFixed(2)
  }
  
  const checkIsInWatchlist = (token) => {
    return isInWatchlist ? isInWatchlist(token) : false
  }
  
  // Render charts panel
  const renderChartPanel = (inline = false) => {
    if (!chartPanelToken) return null
    
    return (
      <div className={`chart-panel ${inline ? 'chart-panel-inline' : 'chart-panel-overlay'}`}>
        <div className="chart-panel-header">
          <div className="chart-panel-token-info">
            {chartPanelToken.logo && (
              <img src={chartPanelToken.logo} alt="" className="chart-panel-logo" />
            )}
            <div>
              <span className="chart-panel-symbol">{chartPanelToken.symbol}</span>
              <span className="chart-panel-name">{chartPanelToken.name}</span>
            </div>
          </div>
          <button
            type="button"
            className="chart-panel-close"
            onClick={() => setChartPanelToken(null)}
            aria-label="Close chart"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="chart-panel-tabs">
          <button
            className={chartOverlaySubTab === 'tradingview' ? 'active' : ''}
            onClick={() => setChartOverlaySubTab('tradingview')}
          >
            TradingView
          </button>
          <button
            className={chartOverlaySubTab === 'screener' ? 'active' : ''}
            onClick={() => setChartOverlaySubTab('screener')}
          >
            Screener
          </button>
        </div>
        
        <div className="chart-panel-content">
          {chartOverlaySubTab === 'tradingview' ? (
            <TradingChart
              symbol={chartPanelToken.symbol}
              isStock={isStocks}
              showHeader={false}
            />
          ) : (
            <div className="screener-placeholder">
              <p>AI Screener for {chartPanelToken.symbol}</p>
              <p>Price: {fmtPrice(chartPanelToken.price)}</p>
              <p>24h Change: {formatChange(chartPanelToken.change)}%</p>
            </div>
          )}
        </div>
        
        {onSelectToken && (
          <button
            className="chart-panel-details-btn"
            onClick={() => {
              setChartPanelToken(null)
              onSelectToken(chartPanelToken)
            }}
          >
            View Full Details
          </button>
        )}
      </div>
    )
  }

  if (isStocks) {
    return (
      <section className="token-discovery-section">
        <div className="discovery-header">
          <h2>Stock Discovery</h2>
          <p>Stock market data coming soon. Switch to Crypto mode for full token discovery.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="token-discovery-section">
      {/* Section Tabs */}
      <div className="discovery-tabs">
        <button
          className={topSectionTab === 'topcoins' ? 'active' : ''}
          onClick={() => setTopSectionTab('topcoins')}
        >
          {t('discovery.topCoins')}
        </button>
        <button
          className={topSectionTab === 'onchain' ? 'active' : ''}
          onClick={() => setTopSectionTab('onchain')}
        >
          {t('discovery.onChain')}
        </button>
        <button
          className={topSectionTab === 'predictions' ? 'active' : ''}
          onClick={() => setTopSectionTab('predictions')}
        >
          {t('discovery.predictions')}
        </button>
        
        {/* Toggle Tabs Mode */}
        <div className="tabs-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={tabsOn}
              onChange={() => setTabsOn && setTabsOn(!tabsOn)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">Tabs</span>
          </label>
        </div>
        
        {/* View Mode Toggle */}
        {topSectionTab === 'topcoins' && (
          <div className="view-toggle">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              {icons.list}
            </button>
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              {icons.grid}
            </button>
          </div>
        )}
      </div>

      {/* Category Filters (Top Coins only) */}
      {topSectionTab === 'topcoins' && (
        <div className="category-filters">
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat.id}
              className={categoryFilter === cat.id ? 'active' : ''}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* On-Chain Filters */}
      {topSectionTab === 'onchain' && (
        <div className="onchain-filters">
          <select
            value={onChainChainFilter}
            onChange={(e) => setOnChainChainFilter(e.target.value)}
          >
            {ONCHAIN_CHAINS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            value={onChainCategoryFilter}
            onChange={(e) => setOnChainCategoryFilter(e.target.value)}
          >
            {ONCHAIN_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={onChainViewMode === 'list' ? 'active' : ''}
              onClick={() => setOnChainViewMode('list')}
            >
              {icons.list}
            </button>
            <button
              className={onChainViewMode === 'grid' ? 'active' : ''}
              onClick={() => setOnChainViewMode('grid')}
            >
              {icons.grid}
            </button>
          </div>
        </div>
      )}

      {/* Predictions Filters */}
      {topSectionTab === 'predictions' && (
        <div className="predictions-filters">
          {PREDICTIONS_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={predictionsCategoryFilter === cat.id ? 'active' : ''}
              onClick={() => setPredictionsCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={`discovery-content ${tabsOn && chartPanelToken ? 'split-view' : ''}`}>
        <div className="discovery-main">
          {/* TOP COINS */}
          {topSectionTab === 'topcoins' && (
            <>
              {topCoinsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>{t('discovery.loading')}</span>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="token-grid">
                  {filteredTopCoins.map((token, index) => (
                    <div
                      key={`${token.symbol}-${index}`}
                      className="token-card"
                      onClick={() => handleTopCoinClick(token)}
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <div className="token-rank">{token.rank}</div>
                      <div className="token-header">
                        <div className="token-avatar">
                          {token.logo ? (
                            <img src={token.logo} alt={token.symbol} />
                          ) : (
                            <span>{getTokenInitials(token.symbol)}</span>
                          )}
                        </div>
                        <div className="token-info">
                          <span className="token-symbol">{token.symbol}</span>
                          <span className="token-name">{token.name}</span>
                          {addToWatchlist && (
                            <button
                              type="button"
                              className={`favorite-btn ${checkIsInWatchlist(token) ? 'in-watchlist' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (checkIsInWatchlist(token)) {
                                  removeFromWatchlist?.(token.symbol)
                                } else {
                                  addToWatchlist?.({
                                    symbol: token.symbol,
                                    name: token.name,
                                    logo: token.logo,
                                    price: token.price,
                                    change: token.change,
                                    marketCap: token.marketCap,
                                  })
                                }
                              }}
                            >
                              {checkIsInWatchlist(token) ? icons.heartFilled : icons.heart}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="token-price">
                        <span className="price-value">{fmtPrice(token.price)}</span>
                        <span className={`price-change ${token.change >= 0 ? 'positive' : 'negative'}`}>
                          {token.change >= 0 ? '+' : ''}{formatChange(token.change)}%
                        </span>
                      </div>
                      <div className="token-metrics">
                        <div className="metric">
                          <span className="metric-label">Market Cap</span>
                          <span className="metric-value">{fmtLarge(token.marketCap)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Volume 24h</span>
                          <span className="metric-value">{fmtLarge(token.volume)}</span>
                        </div>
                      </div>
                      <div className="token-action">
                        <span>{t('discovery.viewDetails')}</span>
                        {icons.arrow}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="token-list">
                  <div className="token-list-header">
                    <span className="col-rank">#</span>
                    <span className="col-name">{t('discovery.name')}</span>
                    <span className="col-price">{t('discovery.price')}</span>
                    <span className="col-change">{t('discovery.change24h')}</span>
                    <span className="col-7d">{t('discovery.change7d')}</span>
                    <span className="col-mcap">{t('discovery.marketCap')}</span>
                    <span className="col-volume">{t('discovery.volume')}</span>
                    <span className="col-chart">{t('discovery.last7')}</span>
                  </div>
                  {filteredTopCoins.map((token) => (
                    <div
                      key={token.symbol}
                      className="token-list-row"
                      onClick={() => handleTopCoinClick(token)}
                    >
                      <span className="col-rank">{token.rank}</span>
                      <div className="col-name">
                        <div className="token-avatar-sm">
                          {token.logo ? <img src={token.logo} alt={token.symbol} /> : <span>{getTokenInitials(token.symbol)}</span>}
                        </div>
                        <div className="token-info-sm">
                          <span className="token-name-main">{token.name}</span>
                          <span className="token-symbol-sub">{token.symbol}</span>
                        </div>
                        {addToWatchlist && (
                          <button
                            type="button"
                            className={`favorite-btn-sm ${checkIsInWatchlist(token) ? 'in-watchlist' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (checkIsInWatchlist(token)) {
                                removeFromWatchlist?.(token.symbol)
                              } else {
                                addToWatchlist?.({
                                  symbol: token.symbol,
                                  name: token.name,
                                  logo: token.logo,
                                  price: token.price,
                                  change: token.change,
                                  marketCap: token.marketCap,
                                })
                              }
                            }}
                          >
                            {checkIsInWatchlist(token) ? icons.heartFilled : icons.heart}
                          </button>
                        )}
                      </div>
                      <span className="col-price">{fmtPrice(token.price)}</span>
                      <span className={`col-change ${token.change >= 0 ? 'positive' : 'negative'}`}>
                        {token.change >= 0 ? '+' : ''}{formatChange(token.change)}%
                      </span>
                      <span className={`col-7d ${(token.change7d || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(token.change7d || 0) >= 0 ? '+' : ''}{formatChange(token.change7d || 0)}%
                      </span>
                      <span className="col-mcap">{fmtLarge(token.marketCap)}</span>
                      <span className="col-volume">{fmtLarge(token.volume)}</span>
                      <div className="col-chart">
                        <Sparkline data={token.sparkline_7d || generateSparkline(token.change)} positive={token.change >= 0} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              <div className="pagination">
                <button
                  disabled={topCoinsPage <= 1 || topCoinsLoading}
                  onClick={() => setTopCoinsPage(p => Math.max(1, p - 1))}
                >
                  {t('discovery.prev')}
                </button>
                <span>Page {topCoinsPage} of {TOTAL_TOP_COINS_PAGES}</span>
                <button
                  disabled={topCoinsPage >= TOTAL_TOP_COINS_PAGES || topCoinsLoading}
                  onClick={() => setTopCoinsPage(p => Math.min(TOTAL_TOP_COINS_PAGES, p + 1))}
                >
                  {t('discovery.next')}
                </button>
              </div>
            </>
          )}

          {/* ON-CHAIN */}
          {topSectionTab === 'onchain' && (
            onChainViewMode === 'grid' ? (
              <div className="onchain-grid">
                {filteredOnChain.map((row, index) => (
                  <div
                    key={row.id}
                    className="onchain-card"
                    onClick={() => handleOnChainClick(row)}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className="onchain-card-header">
                      <div className="onchain-token-avatar">
                        {TOKEN_LOGOS[row.symbol] ? (
                          <img src={TOKEN_LOGOS[row.symbol]} alt="" />
                        ) : (
                          <span>{row.symbol?.slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="onchain-token-meta">
                        <span className="onchain-symbol">{row.symbol}</span>
                        <span className="onchain-name">{row.name}</span>
                      </div>
                      <span className="onchain-network">{row.networkId}</span>
                    </div>
                    <div className="onchain-card-price">
                      <span>{fmtPrice(row.price)}</span>
                      <span className={row.change24h >= 0 ? 'positive' : 'negative'}>
                        {row.change24h >= 0 ? '+' : ''}{formatChange(row.change24h)}%
                      </span>
                    </div>
                    <div className="onchain-metrics">
                      <div><span>Vol</span><span>{fmtLarge(row.volume)}</span></div>
                      <div><span>MCap</span><span>{fmtLarge(row.mcap)}</span></div>
                      <div><span>Liq</span><span>{fmtLarge(row.liquidity)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="onchain-table">
                <div className="onchain-table-header">
                  <span>#</span>
                  <span>Token</span>
                  <span>Price</span>
                  <span>Age</span>
                  <span>Volume</span>
                  <span>5m</span>
                  <span>1h</span>
                  <span>24h</span>
                  <span>MCap</span>
                  <span>Chart</span>
                </div>
                {filteredOnChain.map((row, index) => (
                  <div
                    key={row.id}
                    className="onchain-table-row"
                    onClick={() => handleOnChainClick(row)}
                  >
                    <span>{index + 1}</span>
                    <div className="onchain-token-cell">
                      <div className="onchain-token-avatar-sm">
                        {TOKEN_LOGOS[row.symbol] ? <img src={TOKEN_LOGOS[row.symbol]} alt="" /> : <span>{row.symbol?.slice(0, 2)}</span>}
                      </div>
                      <span className="onchain-symbol">{row.symbol}</span>
                    </div>
                    <span>{fmtPrice(row.price)}</span>
                    <span>{row.age}</span>
                    <span>{fmtLarge(row.volume)}</span>
                    <span className={row.change5m >= 0 ? 'positive' : 'negative'}>
                      {formatChange(row.change5m)}%
                    </span>
                    <span className={row.change1h >= 0 ? 'positive' : 'negative'}>
                      {formatChange(row.change1h)}%
                    </span>
                    <span className={row.change24h >= 0 ? 'positive' : 'negative'}>
                      {formatChange(row.change24h)}%
                    </span>
                    <span>{fmtLarge(row.mcap)}</span>
                    <button
                      className="onchain-chart-btn"
                      onClick={(e) => { e.stopPropagation(); handleOnChainClick(row); }}
                    >
                      {icons.chart}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* PREDICTIONS */}
          {topSectionTab === 'predictions' && (
            <div className="predictions-table">
              <div className="predictions-table-header">
                <span>#</span>
                <span>Market</span>
                <span>Category</span>
                <span>Yes %</span>
                <span>No %</span>
                <span>Volume</span>
                <span>Ends</span>
                <span>Source</span>
              </div>
              {filteredPredictions.map((row, index) => {
                const noPct = 100 - (row.yesPct || 0)
                return (
                  <div key={row.id} className="predictions-table-row">
                    <span>{index + 1}</span>
                    <span className="predictions-question">{row.question}</span>
                    <span className="predictions-category">{row.category}</span>
                    <span className="predictions-yes">
                      <span className="yes-bar" style={{ width: `${row.yesPct}%` }} />
                      <span>{row.yesPct}%</span>
                    </span>
                    <span>{noPct}%</span>
                    <span>{fmtLarge(row.volume)}</span>
                    <span>{row.endDate}</span>
                    <span>{row.resolution}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Chart Panel (when tabs on) */}
        {tabsOn && chartPanelToken && (
          <div className="discovery-chart-side">
            {renderChartPanel(true)}
          </div>
        )}
      </div>

      {/* Chart Overlay (when tabs off) */}
      {!tabsOn && chartPanelToken && (
        <div className="chart-overlay" onClick={() => setChartPanelToken(null)}>
          {renderChartPanel(false)}
        </div>
      )}
    </section>
  )
}

// Sparkline Component
const Sparkline = React.memo(({ data, positive }) => {
  if (!data || !Array.isArray(data) || data.length < 2) {
    return <span className="sparkline-empty">—</span>
  }
  
  const width = 80
  const height = 30
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  
  const color = positive ? '#00e676' : '#ff1744'
  const areaPoints = `0,${height} ${points} ${width},${height}`
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline">
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#grad-${positive})`} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
})

// Generate sparkline data
const generateSparkline = (change) => {
  const points = 12
  const trend = change >= 0 ? 1 : -1
  const data = []
  let value = 50
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const trendInfluence = trend * progress * 20
    const noise = Math.sin(i * 0.8) * 6
    value = Math.max(10, Math.min(90, 50 + trendInfluence + noise))
    data.push(value)
  }
  
  return data
}

export default TokenDiscoverySection
