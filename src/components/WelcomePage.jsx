/**
 * WelcomePage Component - THIN ORCHESTRATOR
 * Code-split version: delegates to sub-components for improved initial load performance
 * 
 * Architecture:
 * - WelcomeHeader: Always loaded (critical above-fold content)
 * - MarketOverviewSection: Lazy loaded (heavy, not immediately visible)
 * - TokenDiscoverySection: Lazy loaded (heaviest - table/grid with CoinGecko API)
 * - RecentActivitySection: Lazy loaded (sidebar, can defer)
 * 
 * Previous size: 7443 lines, ~445KB
 * New architecture: ~200 lines orchestrator + modular sub-components
 */
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'

// Data hooks (always needed)
import { useCuratedTokenPrices, useTrendingTokens, useTokenSearch, useBinanceTopCoinPrices } from '../hooks/useCodexData'
import useWatchlistPrices from '../hooks/useWatchlistPrices'
import { useMarketIntel } from '../hooks/useMarketIntel'
import { 
  useStockPrices, 
  useStockTrending, 
  useStockSearch, 
  useMarketStatus, 
  useMarketIndices 
} from '../hooks/useStockData'

// Heavy components - lazy loaded
const TokenDiscoverySection = React.lazy(() => 
  import('./welcome/TokenDiscoverySection').then(m => ({ default: m.default }))
)
const MarketOverviewSection = React.lazy(() => 
  import('./welcome/MarketOverviewSection').then(m => ({ default: m.default }))
)
const RecentActivitySection = React.lazy(() => 
  import('./welcome/RecentActivitySection').then(m => ({ default: m.default }))
)

// Always-loaded components
import WelcomeHeader from './welcome/WelcomeHeader'

// Styles (global - already split in CSS architecture)
import './WelcomePage.css'
import './WelcomePage.day-mode.css'
import './WelcomePage.cinema-mode.css'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & DATA (shared with sub-components)
// ═══════════════════════════════════════════════════════════════════════════

export const TOP_COINS = [
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

export const TOKEN_LOGOS = {
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

// Spinner for Suspense fallback
const SectionLoader = () => (
  <div className="section-loader">
    <div className="loading-spinner" />
    <span>Loading...</span>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const WelcomePage = ({
  // Mode flags
  cinemaMode = false,
  dayMode = false,
  marketMode = 'crypto',
  discoverOnly = false,
  
  // Profile
  profile: profileProp,
  onProfileChange,
  
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
  
  // Navigation
  onPageChange,
  onOpenResearchZone,
  onOpenAIScreener,
  selectToken,
  
  // Assistant
  setAssistantActions,
  setAssistantContext,
  
  // Pending chart/nav requests
  pendingChartToken,
  setPendingChartToken,
  pendingCommandCenterTab,
  setPendingCommandCenterTab,
  
  // Egg/Agent system
  eggStage,
  eggStarted,
  eggProgress,
  agentIsBorn,
  agentProfile,
  onEggClick,
  onOpenAgentChat,
}) => {
  const isStocks = marketMode === 'stocks'
  const { t, i18n } = useTranslation()
  const { fmtPrice, fmtLarge, currencySymbol } = useCurrency()

  // ═══════════════════════════════════════════════════════════════════════
  // DATA FETCHING (centralized in orchestrator, passed to children)
  // ═══════════════════════════════════════════════════════════════════════
  
  const topCoinSymbols = useMemo(() => TOP_COINS.map(c => c.symbol), [])
  
  // Real-time prices from Codex/Binance
  const { prices: coinGeckoPrices } = useCuratedTokenPrices(topCoinSymbols, 60 * 1000)
  const { prices: binancePrices } = useBinanceTopCoinPrices(topCoinSymbols, 5000)
  
  const topCoinPrices = useMemo(() => {
    const merged = { ...coinGeckoPrices }
    Object.keys(binancePrices || {}).forEach(symbol => {
      const binanceData = binancePrices[symbol]
      if (binanceData?.price > 0) {
        merged[symbol] = {
          ...merged[symbol],
          price: binanceData.price,
          change: binanceData.change ?? binanceData.change24 ?? merged[symbol]?.change,
        }
      }
    })
    return merged
  }, [coinGeckoPrices, binancePrices])
  
  // Stock data
  const { prices: stockPrices } = useStockPrices(isStocks ? topCoinSymbols : [], 10000)
  const marketStatus = useMarketStatus()
  const { indices: marketIndices } = useMarketIndices(isStocks ? 30000 : null)
  
  // Fear & Greed Index
  const [fearGreed, setFearGreed] = useState({ value: 50, classification: 'Neutral' })
  useEffect(() => {
    if (isStocks) return // Stocks use VIX, not Fear & Greed
    let cancelled = false
    const fetchFng = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1')
        const json = await res.json()
        if (cancelled || !json?.data?.[0]) return
        const d = json.data[0]
        setFearGreed({
          value: parseInt(d.value, 10),
          classification: d.value_classification || ''
        })
      } catch (_) {
        if (!cancelled) setFearGreed({ value: 50, classification: 'Neutral' })
      }
    }
    fetchFng()
    const t = setInterval(fetchFng, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [isStocks])

  // VIX for stocks mode
  const liveVix = useMemo(() => {
    if (!isStocks || !marketIndices) return null
    const indicesArr = Array.isArray(marketIndices) ? marketIndices : []
    const vix = indicesArr.find(i => i.symbol === '^VIX' || i.symbol === 'VIX')
    if (!vix?.price) return null
    const price = Number(vix.price)
    let label = 'Moderate'
    if (price >= 30) label = 'Extreme Volatility'
    else if (price >= 25) label = 'High Volatility'
    else if (price >= 20) label = 'Elevated'
    else if (price >= 15) label = 'Moderate'
    else label = 'Low Volatility'
    return { price, change: vix.change, label }
  }, [isStocks, marketIndices])

  // ═══════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT (shared across children)
  // ═══════════════════════════════════════════════════════════════════════
  
  const [tabsOn, setTabsOn] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')

  // ═══════════════════════════════════════════════════════════════════════
  // CALLBACK HANDLERS (passed to children)
  // ═══════════════════════════════════════════════════════════════════════

  const handleTokenClick = useCallback((token) => {
    if (selectToken) {
      selectToken(token)
    } else if (onOpenResearchZone) {
      onOpenResearchZone(token)
    }
  }, [selectToken, onOpenResearchZone])

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className={`welcome-page ${dayMode ? 'day-mode' : ''} ${cinemaMode ? 'cinema-mode' : ''}`}>
      {/* Header: Always loaded (critical) */}
      <WelcomeHeader
        profile={profileProp}
        onProfileChange={onProfileChange}
        marketMode={marketMode}
        isStocks={isStocks}
        topCoinPrices={topCoinPrices}
        stockPrices={stockPrices}
        fearGreed={fearGreed}
        eggStage={eggStage}
        eggStarted={eggStarted}
        eggProgress={eggProgress}
        agentIsBorn={agentIsBorn}
        agentProfile={agentProfile}
        onEggClick={onEggClick}
        onOpenAgentChat={onOpenAgentChat}
        cinemaMode={cinemaMode}
        dayMode={dayMode}
        onOpenResearchZone={onOpenResearchZone}
        onTokenClick={handleTokenClick}
        isInWatchlist={isInWatchlist}
        addToWatchlist={addToWatchlist}
        removeFromWatchlist={removeFromWatchlist}
      />

      {/* Main Content Grid */}
      <div className="welcome-content-grid">
        {/* Left/Primary Content: Market Overview (lazy) */}
        <Suspense fallback={<SectionLoader />}>
          <MarketOverviewSection
            marketMode={marketMode}
            isStocks={isStocks}
            topCoinPrices={topCoinPrices}
            stockPrices={stockPrices}
            marketIndices={marketIndices}
            marketStatus={marketStatus}
            fearGreed={fearGreed}
            liveVix={liveVix}
            dayMode={dayMode}
          />
        </Suspense>

        {/* Token Discovery: Heaviest section (lazy) */}
        <Suspense fallback={<SectionLoader />}>
          <TokenDiscoverySection
            marketMode={marketMode}
            isStocks={isStocks}
            topCoinPrices={topCoinPrices}
            stockPrices={stockPrices}
            onOpenResearchZone={onOpenResearchZone}
            onOpenAIScreener={onOpenAIScreener}
            onSelectToken={selectToken}
            isInWatchlist={isInWatchlist}
            addToWatchlist={addToWatchlist}
            removeFromWatchlist={removeFromWatchlist}
            dayMode={dayMode}
            tabsOn={tabsOn}
            setTabsOn={setTabsOn}
          />
        </Suspense>
      </div>

      {/* Right Sidebar: Activity + Watchlist (lazy) */}
      <Suspense fallback={<SectionLoader />}>
        <RecentActivitySection
          marketMode={marketMode}
          isStocks={isStocks}
          watchlist={watchlist}
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          onSwitchWatchlist={onSwitchWatchlist}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          isInWatchlist={isInWatchlist}
          togglePinWatchlist={togglePinWatchlist}
          reorderWatchlist={reorderWatchlist}
          stockPrices={stockPrices}
          onTokenClick={handleTokenClick}
          onOpenResearchZone={onOpenResearchZone}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          dayMode={dayMode}
        />
      </Suspense>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default WelcomePage
