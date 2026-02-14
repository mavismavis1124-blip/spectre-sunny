/**
 * WelcomePage Component - Token Discovery Hub
 * Professional Silicon Valley / Apple-inspired design
 * Powered by Codex API
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { getTopCoinsMarketsPage } from '../services/coinGeckoApi'
import { getBinanceKlines } from '../services/binanceApi'
import { resolveTradingViewSymbol } from '../lib/tradingViewSymbols'
import { getCryptoNews } from '../services/cryptoNewsApi'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useCuratedTokenPrices, useTrendingTokens, useTokenSearch, useBinanceTopCoinPrices } from '../hooks/useCodexData'
import useWatchlistPrices from '../hooks/useWatchlistPrices'
import { useMarketIntel } from '../hooks/useMarketIntel'
import { useFearGreed } from '../hooks/useFearGreed'
import { useMarketRegime } from '../hooks/useMarketRegime'
// Stock market hooks and data
import { useStockPrices, useStockTrending, useStockSearch, useMarketStatus, useMarketIndices } from '../hooks/useStockData'
import { TOP_STOCKS, WELCOME_STOCKS as WELCOME_STOCK_SYMBOLS, STOCK_LOGOS, STOCK_DESCRIPTIONS, STOCK_SECTORS, getStockLogo } from '../constants/stockData'
import { getMarketNews } from '../services/stockNewsApi'
// Egg + Agent system
import SpectreEgg from './egg/SpectreEgg'
import EggExplainerModal from './egg/EggExplainerModal'
import useEggState, { EGG_STATES } from './egg/useEggState'
import AgentAvatar from './agent/AgentAvatar'
import { getAgentProfile } from './agent/agentProfile'
// ChainVolumeBar removed - not used in landing page
// SmartMoneyPulse moved to Market Analytics page
import GlassSelect from './GlassSelect'
import TokenTicker from './TokenTicker'
import TradingChart from './TradingChart'
import ProductTour from './ProductTour'
import spectreIcons from '../icons/spectreIcons'
import { CinemaWelcomeWrapper } from './cinema'
import BriefAudioPlayer from './cinema/BriefAudioPlayer'
import TokenStorybook from './TokenStorybook'
import FearGreedWidget from './FearGreedWidget'
import MarketRegimeBadge from './MarketRegimeBadge'
import './WelcomePage.css'
import './WelcomePage.day-mode.css'
import './WelcomePage.cinema-mode.css'

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
  'GMX': 'https://assets.coingecko.com/coins/images/18323/small/arbit.png',
  'BRETT': 'https://assets.coingecko.com/coins/images/35529/small/1000096028.png',
  'BLUR': 'https://assets.coingecko.com/coins/images/28453/small/blur.png',
  'JOE': 'https://assets.coingecko.com/coins/images/17569/small/joe_200x200.png',
  'AERO': 'https://assets.coingecko.com/coins/images/31723/small/token.png',
  'MAGIC': 'https://assets.coingecko.com/coins/images/18623/small/magic.png',
  'CAKE': 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png',
  'RAY': 'https://assets.coingecko.com/coins/images/13928/small/raydium_logo.png',
}

const CHAIN_LOGOS = {
  sol: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  eth: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  bsc: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  arb: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  polygon: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  avax: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  base: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
}

import { getTokenRowStyle, getTokenAvatarRingStyle, TOKEN_ROW_COLORS } from '../constants/tokenColors'

// On-Chain mock: networks with top gainers, volume, categories
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
// Token-style on-chain rows: TOKEN (rank, logo, ticker, pair, name, boost), PRICE, AGE, TXNS, VOLUME, MAKERS, 5M/1H/6H/24H %, LIQUIDITY, MCAP
const ONCHAIN_MOCK = [
  { id: 1, symbol: 'DOG', name: 'Nietzschean Dog', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.0001879, age: '16h', txns: 51446, volume: 1800000, makers: 34075, change5m: 3.72, change1h: -51.5, change6h: -29.51, change24h: 255, liquidity: 42000, mcap: 187000, boost: 2000 },
  { id: 2, symbol: 'BP', name: 'Barking Puppy', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.01384, age: '3d', txns: 48252, volume: 11200000, makers: 7315, change5m: 0.58, change1h: 47.81, change6h: 85.06, change24h: 486, liquidity: 476000, mcap: 13500000, boost: 30 },
  { id: 3, symbol: 'Donald', name: 'Donald Duck', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.00001234, age: '2mo', txns: 125000, volume: 386000, makers: 8200, change5m: 1.01, change1h: 14.01, change6h: 624, change24h: 3755, liquidity: 156000, mcap: 2000000, boost: 50 },
  { id: 4, symbol: 'PEPECASH', name: 'Pepe Cash', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.0000001568, age: '5d', txns: 89200, volume: 2100000, makers: 15200, change5m: -10.6, change1h: -8.2, change6h: 12.4, change24h: 89, liquidity: 89000, mcap: 420000, boost: null, cpmm: true },
  { id: 5, symbol: 'SOULGUY', name: 'Soul Guy', pair: '/SOL', networkId: 'sol', category: 'Meme', price: 0.0000891, age: '1d', txns: 28400, volume: 520000, makers: 4100, change5m: 1.8, change1h: -0.48, change6h: -2.27, change24h: 18.2, liquidity: 62000, mcap: 310000, boost: 120 },
  { id: 6, symbol: 'JUP', name: 'Jupiter', pair: '/SOL', networkId: 'sol', category: 'DEX', price: 0.82, age: '2mo', txns: 95000, volume: 1920000000, makers: 22000, change5m: 0.2, change1h: 2.1, change6h: 5.4, change24h: 18.2, liquidity: 45000000, mcap: 1100000000, boost: null },
  { id: 7, symbol: 'WAR', name: 'War Token', pair: '/SOL', networkId: 'sol', category: 'Gaming', price: 0.001093, age: '8h', txns: 15600, volume: 180000, makers: 2100, change5m: -0.48, change1h: 3.2, change6h: 15.1, change24h: 42, liquidity: 28000, mcap: 95000, boost: 80, cpmm: true },
  { id: 8, symbol: 'UNI', name: 'Uniswap', pair: '/SOL', networkId: 'eth', category: 'DEX', price: 8.42, age: '3mo', txns: 72000, volume: 284000000, makers: 18500, change5m: 0.1, change1h: 1.2, change6h: 4.1, change24h: 12.4, liquidity: 120000000, mcap: 5200000000, boost: null },
  { id: 9, symbol: 'RAY', name: 'Raydium', pair: '/SOL', networkId: 'sol', category: 'DEX', price: 1.24, age: '1mo', txns: 44000, volume: 310000000, makers: 9200, change5m: 0.5, change1h: 2.8, change6h: 8.2, change24h: 11.2, liquidity: 85000000, mcap: 3200000000, boost: null },
  { id: 10, symbol: 'CAKE', name: 'PancakeSwap', pair: '/USD1', networkId: 'bsc', category: 'DEX', price: 2.18, age: '2mo', txns: 38000, volume: 420000000, makers: 11200, change5m: -0.2, change1h: 0.8, change6h: 2.4, change24h: 5.8, liquidity: 95000000, mcap: 480000000, boost: null },
  { id: 11, symbol: 'GMX', name: 'GMX', pair: '/SOL', networkId: 'arb', category: 'DEX', price: 28.5, age: '1mo', txns: 22000, volume: 180000000, makers: 6400, change5m: 0.3, change1h: 4.1, change6h: 12.2, change24h: 22.1, liquidity: 72000000, mcap: 280000000, boost: null },
  { id: 12, symbol: 'AAVE', name: 'Aave', pair: '/SOL', networkId: 'eth', category: 'Lending', price: 245, age: '3mo', txns: 41000, volume: 520000000, makers: 9800, change5m: 0.1, change1h: 1.5, change6h: 3.2, change24h: 8.3, liquidity: 180000000, mcap: 3800000000, boost: null },
  { id: 13, symbol: 'JTO', name: 'Jito', pair: '/SOL', networkId: 'sol', category: 'Staking', price: 2.88, age: '1mo', txns: 18500, volume: 95000000, makers: 5200, change5m: 0.4, change1h: 2.2, change6h: 6.8, change24h: 14.6, liquidity: 42000000, mcap: 280000000, boost: null },
  { id: 14, symbol: 'BRETT', name: 'Brett', pair: '/SOL', networkId: 'base', category: 'Meme', price: 0.0284, age: '5d', txns: 62000, volume: 95000000, makers: 14200, change5m: 2.1, change1h: 8.4, change6h: 18.2, change24h: 28.4, liquidity: 28000000, mcap: 180000000, boost: 500 },
  { id: 15, symbol: 'BLUR', name: 'Blur', pair: '/SOL', networkId: 'eth', category: 'NFT', price: 0.18, age: '2mo', txns: 29000, volume: 45000000, makers: 7800, change5m: -0.1, change1h: -0.5, change6h: -1.2, change24h: -2.4, liquidity: 22000000, mcap: 320000000, boost: null },
  { id: 16, symbol: 'PYTH', name: 'Pyth Network', pair: '/SOL', networkId: 'sol', category: 'DEX', price: 0.32, age: '1mo', txns: 35000, volume: 78000000, makers: 8100, change5m: 0.2, change1h: 3.1, change6h: 9.4, change24h: 19.1, liquidity: 38000000, mcap: 150000000, boost: null },
  { id: 17, symbol: 'CRV', name: 'Curve', pair: '/SOL', networkId: 'eth', category: 'DEX', price: 0.42, age: '3mo', txns: 34000, volume: 185000000, makers: 7200, change5m: 0.1, change1h: 1.8, change6h: 4.2, change24h: 7.1, liquidity: 65000000, mcap: 480000000, boost: null },
  { id: 18, symbol: 'JOE', name: 'Trader Joe', pair: '/SOL', networkId: 'avax', category: 'DEX', price: 0.58, age: '2mo', txns: 19800, volume: 88000000, makers: 5100, change5m: 0.3, change1h: 2.2, change6h: 5.8, change24h: 9.1, liquidity: 32000000, mcap: 180000000, boost: null },
  { id: 19, symbol: 'AERO', name: 'Aerodrome', pair: '/SOL', networkId: 'base', category: 'DEX', price: 0.92, age: '1mo', txns: 24500, volume: 120000000, makers: 6800, change5m: 0.5, change1h: 3.4, change6h: 8.6, change24h: 15.3, liquidity: 52000000, mcap: 420000000, boost: null },
  { id: 20, symbol: 'MAGIC', name: 'MAGIC', pair: '/SOL', networkId: 'arb', category: 'Gaming', price: 0.42, age: '2mo', txns: 15200, volume: 35000000, makers: 3900, change5m: -0.2, change1h: -0.4, change6h: -0.8, change24h: -1.2, liquidity: 18000000, mcap: 120000000, boost: null },
]

// Prediction markets mock: latest with categories
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
  { id: 5, question: 'Trump wins 2024 election?', category: 'Politics', yesPct: 52, volume: 3400000, liquidity: 2100000, endDate: 'Nov 5, 2024', resolution: 'Polymarket' },
  { id: 6, question: 'Solana TVL above $10B by June 2025?', category: 'Crypto', yesPct: 38, volume: 420000, liquidity: 310000, endDate: 'Jun 30, 2025', resolution: 'Polymarket' },
  { id: 7, question: 'Apple stock above $250 by EOY 2025?', category: 'Stocks', yesPct: 44, volume: 780000, liquidity: 520000, endDate: 'Dec 31, 2025', resolution: 'Kalshi' },
  { id: 8, question: 'NBA champion: Eastern Conference team?', category: 'Sports', yesPct: 58, volume: 190000, liquidity: 140000, endDate: 'Jun 2025', resolution: 'Polymarket' },
  { id: 9, question: 'AI model passes bar exam by 2026?', category: 'Science', yesPct: 82, volume: 310000, liquidity: 220000, endDate: 'Dec 31, 2026', resolution: 'Manifold' },
  { id: 10, question: 'Spot Ethereum ETF approved in 2025?', category: 'Crypto', yesPct: 67, volume: 950000, liquidity: 680000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 11, question: 'NVIDIA above $150 by Q3 2025?', category: 'Stocks', yesPct: 59, volume: 620000, liquidity: 440000, endDate: 'Sep 30, 2025', resolution: 'Kalshi' },
  { id: 12, question: 'Bitcoin dominance above 60% in 2025?', category: 'Crypto', yesPct: 41, volume: 380000, liquidity: 270000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 13, question: 'UK general election: Labour majority?', category: 'Politics', yesPct: 68, volume: 440000, liquidity: 320000, endDate: 'Jan 2025', resolution: 'Polymarket' },
  { id: 14, question: 'World Cup 2026: South American winner?', category: 'Sports', yesPct: 35, volume: 210000, liquidity: 150000, endDate: 'Jul 2026', resolution: 'Polymarket' },
  { id: 15, question: 'Fusion energy net gain by 2030?', category: 'Science', yesPct: 28, volume: 175000, liquidity: 120000, endDate: 'Dec 31, 2030', resolution: 'Manifold' },
  { id: 16, question: 'DOGE above $1 in 2025?', category: 'Crypto', yesPct: 22, volume: 890000, liquidity: 610000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 17, question: 'Tesla stock above $400 by EOY 2025?', category: 'Stocks', yesPct: 51, volume: 520000, liquidity: 380000, endDate: 'Dec 31, 2025', resolution: 'Kalshi' },
  { id: 18, question: 'EU passes comprehensive AI Act by 2025?', category: 'Politics', yesPct: 76, volume: 290000, liquidity: 200000, endDate: 'Dec 31, 2025', resolution: 'Polymarket' },
  { id: 19, question: 'Olympics 2028: USA top medal count?', category: 'Sports', yesPct: 64, volume: 310000, liquidity: 220000, endDate: 'Aug 2028', resolution: 'Polymarket' },
  { id: 20, question: 'First human on Mars by 2030?', category: 'Science', yesPct: 19, volume: 410000, liquidity: 290000, endDate: 'Dec 31, 2030', resolution: 'Manifold' },
]

// Project descriptions for top coins (info tooltip)
const COIN_DESCRIPTIONS = {
  BTC: 'Bitcoin — Decentralized digital currency and store of value. Launched in 2009 by Satoshi Nakamoto. Limited supply of 21 million; secures the network via proof-of-work mining.',
  ETH: 'Ethereum — Smart contract platform for decentralized applications (dApps). Created by Vitalik Buterin in 2015. Powers DeFi, NFTs, and thousands of on-chain applications.',
  SOL: 'Solana — High-performance Layer 1 blockchain for scalable dApps and low-cost transactions. Launched in 2020. Uses proof-of-history alongside proof-of-stake for throughput.',
  USDT: 'Tether — Largest stablecoin by market cap. Pegged 1:1 to the US dollar. Used for trading, remittances, and as a liquidity pair across crypto exchanges and DeFi.',
  USDC: 'USD Coin — Fully reserved US dollar-backed stablecoin by Circle. Regulated and audited; widely used in DeFi, payments, and as a settlement asset.',
  BNB: 'BNB — Native token of BNB Chain (Binance Smart Chain). Used for fees, staking, and governance. Powers the Binance ecosystem and many dApps and DeFi protocols.',
  ARB: 'Arbitrum — Layer 2 scaling solution for Ethereum. Uses optimistic rollups for fast, low-cost transactions. Native token for governance and protocol fees.',
  OP: 'Optimism — Ethereum Layer 2 using optimistic rollups. Aims for low fees and high throughput while staying secured by Ethereum. OP token used for governance.',
  MATIC: 'Polygon — Ethereum scaling and infrastructure. Sidechains and proof-of-stake chain for fast, low-cost transactions. Powers thousands of dApps and enterprises.',
  AVAX: 'Avalanche — High-throughput Layer 1 with sub-second finality. Supports custom chains and DeFi, NFTs, and enterprise apps. AVAX is used for staking and fees.',
  LINK: 'Chainlink — Decentralized oracle network supplying real-world data to smart contracts. Industry standard for price feeds, VRF, and automation across chains.',
  UNI: 'Uniswap — Leading decentralized exchange (DEX) on Ethereum. Automated market maker (AMM) protocol. UNI token used for governance and fee sharing.',
}

// Top stocks/commodities for Stocks mode welcome widget (SPY, major stock, Gold)
const WELCOME_STOCKS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 483.66, change: -0.8, avatar: 'SP', change1h: -0.1, change7d: -0.4 },
  { symbol: 'JPM', name: 'JPMorgan', price: 196.58, change: -2.1, avatar: 'JP', change1h: -0.3, change7d: -1.5 },
  { symbol: 'GLD', name: 'Gold (ETF)', price: 178.42, change: 0.5, avatar: 'Au', change1h: 0.1, change7d: 0.3 },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', price: 412.34, change: 0.2, avatar: 'QQ', change1h: 0, change7d: -0.2 },
]

// ── TA Signal SVG Icons (Spectre design language — no emoji) ──
const TA_SIGNAL_ICONS = {
  reversalDown: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v10M4 9l4 4 4-4"/><line x1="2" y1="14" x2="14" y2="14" strokeOpacity="0.4"/></svg>,
  reversalUp: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 14V4M4 7l4-4 4 4"/><line x1="2" y1="2" x2="14" y2="2" strokeOpacity="0.4"/></svg>,
  neutral: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h12M11 5l3 3-3 3"/></svg>,
  momentum: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2l-2 5h4l-2 5"/><path d="M7 12l-1 2"/></svg>,
  volatility: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 8 4 4 7 11 10 5 13 9 15 6"/></svg>,
  correlation: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h5M2 12h5M9 4h5M9 12h5"/><path d="M7 4l2 8M7 12l2-8" strokeOpacity="0.35" strokeDasharray="1.5 1.5"/></svg>,
  sentiment: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10a5 5 0 0110 0"/><path d="M8 10V6"/><circle cx="8" cy="5.5" r="0.5" fill="currentColor" stroke="none"/></svg>,
  dominance: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l2-5 2 3 2-3 2 5"/><path d="M3 12h10"/></svg>,
  funding: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v10M11 3v10"/><path d="M3 6h6M7 10h6"/></svg>,
  whale: <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9c1-3 4-5 7-5s5 2 5 4-1 4-3 4c-1 0-2-1-2-2s1-2 2-2"/><path d="M2 9c0 2 1 4 3 4"/></svg>,
}

const WelcomePage = ({ cinemaMode = false, profile: profileProp, onProfileChange, dayMode = false, marketMode = 'crypto', selectToken, onOpenResearchZone, onOpenAIScreener, discoverOnly = false, watchlist = [], watchlists = [], activeWatchlistId, onSwitchWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, togglePinWatchlist, reorderWatchlist, onPageChange, setAssistantActions, setAssistantContext, pendingChartToken, setPendingChartToken, pendingCommandCenterTab, setPendingCommandCenterTab, eggStage, eggStarted, eggProgress, agentIsBorn, agentProfile, onEggClick, onOpenAgentChat }) => {

  const isStocks = marketMode === 'stocks'
  const { t, i18n } = useTranslation()
  const { fmtPrice, fmtLarge, fmtPriceShort, fmtLargeShort, currencySymbol } = useCurrency()
  const isMobile = useIsMobile()
  // Support both shared profile (from App) and local fallback so name/logo always editable
  const [localProfile, setLocalProfile] = useState({ name: '', imageUrl: '' })
  const profile = profileProp && typeof profileProp === 'object' ? profileProp : localProfile
  // Always update parent when provided so header (top right) stays in sync with widget changes
  const updateProfile = (next) => {
    if (typeof onProfileChange === 'function') {
      onProfileChange({ name: next.name ?? '', imageUrl: next.imageUrl ?? '' })
    } else {
      setLocalProfile(prev => ({ ...prev, ...next }))
    }
  }

  const [profileSaved, setProfileSaved] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(profile?.name ?? '')
  const nameInputRef = useRef(null)
  // Keep draft in sync when profile.name changes from outside (e.g. after save)
  React.useEffect(() => { if (!isEditingName) setDraftName(profile?.name ?? '') }, [profile?.name, isEditingName])
  const [topCoinInfoOpen, setTopCoinInfoOpen] = useState(null)
  const topCoinInfoAnchorRef = useRef({ top: 0, left: 0 })
  const [tokens, setTokens] = useState([])
  // Watchlist (screener right sidebar): unified realtime prices
  const { watchlistWithLiveData } = useWatchlistPrices(watchlist)
  const [watchlistSort, setWatchlistSort] = useState('default')
  const [watchlistSortDropdown, setWatchlistSortDropdown] = useState(false)
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState('')
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    const saved = localStorage.getItem('spectre-welcome-bar-open')
    return saved !== 'false'
  })
  useEffect(() => {
    localStorage.setItem('spectre-welcome-bar-open', welcomeOpen.toString())
  }, [welcomeOpen])
  const [watchlistOpen, setWatchlistOpen] = useState(true)
  // Horizontal layout is now the default for desktop
  const horizontalLayout = true
  const watchlistSearchContainerRef = useRef(null)
  const watchlistSearchContainerRef2 = useRef(null)
  const watchlistPickerRef = useRef(null)
  const { results: cryptoSearchResults, loading: cryptoSearchLoading } = useTokenSearch(!isStocks ? watchlistSearchQuery.trim() : '', 300)
  const { results: stockSearchResults, loading: stockSearchLoading } = useStockSearch(isStocks ? watchlistSearchQuery.trim() : '', 300)
  const watchlistSearchResults = isStocks
    ? stockSearchResults.map(r => ({
        symbol: r.symbol,
        name: r.name,
        logo: getStockLogo(r.symbol, r.sector),
        price: 0,
        change: 0,
        sector: r.sector,
        exchange: r.exchange,
        isStock: true,
      }))
    : cryptoSearchResults
  const watchlistSearchLoading = isStocks ? stockSearchLoading : cryptoSearchLoading
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const dragNodeRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [liveActivity, setLiveActivity] = useState([])
  const [marketStats, setMarketStats] = useState({
    totalMcap: '3.42T',
    volume24h: '127.8B',
    btcDominance: '56.4%',
    activePairs: '24,891'
  })
  const [hoveredToken, setHoveredToken] = useState(null)
  const activityRef = useRef(null)
  const [error, setError] = useState(null)
  
  // Compare functionality
  const [compareMode, setCompareMode] = useState(false)
  const [compareTokens, setCompareTokens] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)
  
  const toggleCompareToken = (token, e) => {
    e.stopPropagation()
    setCompareTokens(prev => {
      const exists = prev.find(t => t.address === token.address)
      if (exists) return prev.filter(t => t.address !== token.address)
      if (prev.length >= 4) return prev
      return [...prev, token]
    })
  }
  
  const isTokenSelected = (address) => compareTokens.some(t => t.address === address)
  const openCompareModal = () => { if (compareTokens.length >= 2) setShowCompareModal(true) }
  const closeCompareModal = () => setShowCompareModal(false)
  const exitCompareMode = () => { setCompareMode(false); setCompareTokens([]); setShowCompareModal(false) }

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ name: profile?.name ?? '', imageUrl: reader.result })
      }
    }
    reader.readAsDataURL(file)
    event.target.value = '' // allow selecting same file again
  }

  const handleProfileSave = () => {
    const newName = (draftName ?? '').trim() || (profile?.name ?? '')
    updateProfile({ name: newName, imageUrl: profile?.imageUrl ?? '' })
    setProfileSaved(true)
    setIsEditingName(false)
    window.setTimeout(() => setProfileSaved(false), 1500)
  }

  const handleStartEditingName = () => {
    setDraftName(profile?.name ?? '')
    setIsEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  // Timeframes - Price change periods
  const timeframes = [
    { id: 'all', label: t('topSection.allTime') },
    { id: '1h', label: '1h' },
    { id: '24h', label: '24h' },
    { id: '1w', label: '1w' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
  ]
  
  // Tabs ON/OFF module (row above Discovery: On/Off toggle + Discover + token tabs)
  const [tabsOn, setTabsOn] = useState(false)
  const [activeDiscoverTab, setActiveDiscoverTab] = useState('discover') // 'discover' | symbol
  const [openTokenTabs, setOpenTokenTabs] = useState([]) // [{ symbol, name }] for Discover, PEPE, WIF style tabs
  const addTokenTab = (token) => {
    const sym = token.symbol || token
    const name = typeof token === 'string' ? (TOP_COINS.find((c) => c.symbol === sym)?.name || sym) : (token.name || sym)
    setOpenTokenTabs((prev) => {
      const exists = prev.some((t) => (t.symbol || t).toUpperCase() === (sym || '').toUpperCase())
      if (exists) return prev
      return [...prev, { symbol: sym, name }].slice(-5)
    })
    setActiveDiscoverTab(sym)
  }
  const removeTokenTab = (symbol) => {
    // Compute next tabs first, then update all states outside the updater
    const nextTabs = openTokenTabs.filter((t) => (t.symbol || t) !== symbol)
    setOpenTokenTabs(nextTabs)
    if (activeDiscoverTab === symbol) {
      const fallback = nextTabs[nextTabs.length - 1]?.symbol || 'discover'
      setActiveDiscoverTab(fallback)
      if (fallback === 'discover') setChartPanelToken(null)
    }
  }
  // Category filter tabs (Top Coins: DeFi, AI, Meme, RWA, Gaming, Privacy, etc.)
  const CATEGORY_TABS = [
    { id: 'all', label: t('categoryFilters.all') },
    { id: 'defi', label: t('categoryFilters.defi') },
    { id: 'ai', label: t('categoryFilters.ai') },
    { id: 'meme', label: t('categoryFilters.meme') },
    { id: 'rwa', label: t('categoryFilters.rwa') },
    { id: 'gaming', label: t('categoryFilters.gaming') },
    { id: 'privacy', label: t('categoryFilters.privacy') },
    { id: 'nft', label: t('categoryFilters.nft') },
    { id: 'lending', label: t('categoryFilters.lending') },
  ]
  // Translated stock sectors (overrides imported STOCK_SECTORS labels)
  const TRANSLATED_STOCK_SECTORS = STOCK_SECTORS.map(s => ({
    ...s,
    label: t(`sectorFilters.${s.id === 'all' ? 'allSectors' : s.id === 'index' ? 'indexEtf' : s.id === 'realestate' ? 'realEstate' : s.id}`)
  }))
  const [categoryFilter, setCategoryFilter] = useState('all')
  // Token symbol -> primary category (for Top Coins filter)
  const TOKEN_CATEGORY = {
    BTC: 'defi', ETH: 'defi', USDT: 'defi', USDC: 'defi', BNB: 'defi', SOL: 'defi',
    ARB: 'defi', OP: 'defi', MATIC: 'defi', AVAX: 'defi', LINK: 'defi', UNI: 'defi',
    AAVE: 'lending', CRV: 'defi', MKR: 'lending', LDO: 'lending', SUSHI: 'defi',
    FET: 'ai', RENDER: 'ai', RNDR: 'ai', TAO: 'ai', OCEAN: 'ai', GRT: 'ai',
    PEPE: 'meme', WIF: 'meme', BONK: 'meme', DOGE: 'meme', SHIB: 'meme', FLOKI: 'meme',
    ONDO: 'rwa',
    AXS: 'gaming', SAND: 'gaming', MANA: 'gaming',
    APE: 'nft',
  }

  // Activity filter state
  const [activityFilter, setActivityFilter] = useState('all')
  const [isPaused, setIsPaused] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [timeframeFilter, setTimeframeFilter] = useState('all')
  const [tourActive, setTourActive] = useState(false)
  const [tourStep, setTourStep] = useState(0)

  // Top section tabs: Top Coins (table) | On-Chain | Prediction Markets
  const [topSectionTab, setTopSectionTab] = useState('topcoins') // 'topcoins' | 'onchain' | 'predictions'
  // When switching to stocks mode, ensure we're not on 'onchain' tab (stocks don't have on-chain data)
  useEffect(() => {
    if (isStocks && topSectionTab === 'onchain') setTopSectionTab('topcoins')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStocks]) // Only run when isStocks changes, not when topSectionTab changes
  // Top Coins: paginated from API (top 1000, 25 per page, 40 pages)
  const TOP_COINS_PAGE_SIZE = 25
  const TOTAL_TOP_COINS_PAGES = 40
  const [topCoinsPage, setTopCoinsPage] = useState(1)
  const [topCoinsTokens, setTopCoinsTokens] = useState([])
  const [topCoinsLoading, setTopCoinsLoading] = useState(false)
  const [cinemaStorybookToken, setCinemaStorybookToken] = useState(null)
  const [cinemaStorybookOpen, setCinemaStorybookOpen] = useState(false)
  const [onChainChainFilter, setOnChainChainFilter] = useState('mixed')
  const [onChainCategoryFilter, setOnChainCategoryFilter] = useState('all')
  const [onChainTimeframe, setOnChainTimeframe] = useState('24h') // 5m | 1h | 6h | 24h
  const [onChainRankBy, setOnChainRankBy] = useState('trending-6h')
  const [onChainViewMode, setOnChainViewMode] = useState('list') // 'list' | 'grid'
  const [predictionsCategoryFilter, setPredictionsCategoryFilter] = useState('all')

  // ── Real-time Market Intelligence (must be before alpha feed / live activity) ──
  const intel = useMarketIntel(60000)

  // AI Alpha Intelligence Feed
  const [alphaFilter, setAlphaFilter] = useState('all')
  const [isAlphaPaused, setIsAlphaPaused] = useState(false)
  const [taSignalIndex, setTaSignalIndex] = useState(0)
  const [macroInsightIdx, setMacroInsightIdx] = useState(0)
  const alphaCategories = [
    { id: 'all', label: t('alphaCategories.all') },
    { id: 'liquidation', label: t('alphaCategories.liquidations') },
    { id: 'pump', label: t('alphaCategories.surges') },
    { id: 'volume', label: t('alphaCategories.volume') },
    { id: 'macro', label: t('alphaCategories.macro') },
    { id: 'opportunity', label: t('alphaCategories.alpha') },
    { id: 'security', label: 'Security' },
  ]
  
  // Alpha feed — real news from CryptoPanic via useMarketIntel, with fallback
  const FALLBACK_ALPHA_ITEMS = [
    { id: 1, type: 'liquidation', headline: '$1.36B Liquidated in Market-Wide Slump', detail: 'Cascade across BTC & ETH perpetuals', severity: 'critical', tokens: [], time: '2m' },
    { id: 2, type: 'pump', headline: 'JELLY surged 1,325%', detail: 'Market cap: $52M → $420M in 24h', severity: 'high', tokens: ['JELLY'], time: '5m', change: '+1325%' },
    { id: 3, type: 'volume', headline: 'Ethereum volume +23%', detail: 'Top movers: VIRTUAL, ANDY, TAOBOT', severity: 'medium', tokens: ['VIRTUAL', 'ANDY', 'TAOBOT'], time: '12m' },
    { id: 4, type: 'macro', headline: 'Macro sentiment shifting', detail: 'Risk-off signals in traditional markets', severity: 'high', tokens: [], time: '28m' },
    { id: 5, type: 'opportunity', headline: 'Oversold signals detected', detail: 'Reversal patterns forming on multiple pairs', severity: 'medium', tokens: [], time: '45m' },
    { id: 6, type: 'security', headline: 'Protocol audit flagged', detail: 'Smart contract vulnerability disclosed', severity: 'critical', tokens: [], time: '1h' },
  ]

  const [alphaFeed, setAlphaFeed] = useState(FALLBACK_ALPHA_ITEMS)

  // Sync alpha feed from useMarketIntel (real news)
  const prevAlphaTickRef = useRef(null)
  useEffect(() => {
    const ts = intel.lastUpdated ? intel.lastUpdated.getTime() : 0
    if (intel.alphaFeed && intel.alphaFeed.length > 0 && ts !== prevAlphaTickRef.current) {
      prevAlphaTickRef.current = ts
      setAlphaFeed(intel.alphaFeed.slice(0, 8))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intel.lastUpdated])

  // NOTE: TA signal / macro insight rotation intervals removed.
  // taSignalIndex and macroInsightIdx were never read in render,
  // but their setInterval calls triggered full component re-renders every 5-6 seconds.

  // Close watchlist search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inRef1 = watchlistSearchContainerRef.current && watchlistSearchContainerRef.current.contains(e.target)
      const inRef2 = watchlistSearchContainerRef2.current && watchlistSearchContainerRef2.current.contains(e.target)
      if (!inRef1 && !inRef2) {
        setWatchlistSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Activity feed — real-time events from useMarketIntel + fallback
  const prevLiveRef = useRef(null)
  useEffect(() => {
    if (intel.liveEvents && intel.liveEvents.length > 0 && intel.lastUpdated !== prevLiveRef.current) {
      prevLiveRef.current = intel.lastUpdated
      // Map intel live events to the activity format the JSX expects
      const mapped = intel.liveEvents.map((ev, idx) => ({
        type: ev.type,
        token: ev.token,
        logo: TOKEN_LOGOS[ev.token] || '',
        action: ev.action,
        amount: ev.amount,
        time: ev.time || 'live',
        isNew: ev.isNew || idx === 0,
        id: ev.id,
      }))
      setLiveActivity(mapped)
    } else if (!intel.liveEvents || intel.liveEvents.length === 0) {
      // Fallback while loading (only set once)
      setLiveActivity(prev => prev.length > 0 ? prev : [
        { type: 'whale', token: 'PEPE', logo: TOKEN_LOGOS['PEPE'], action: 'Accumulated', amount: '$2.4M', time: '2m', wallet: '0x8f3...d2e', network: 'Ethereum' },
        { type: 'volume', token: 'WIF', logo: TOKEN_LOGOS['WIF'], action: 'Volume spike', amount: '+340%', time: '5m', network: 'Solana' },
        { type: 'liquidation', token: 'BTC', logo: TOKEN_LOGOS['BTC'], action: 'Long liquidated', amount: '$4.8M', time: '7m', price: '$98,240', network: 'Bitcoin' },
        { type: 'listing', token: 'JUP', logo: TOKEN_LOGOS['JUP'], action: 'Listed on', amount: 'Raydium', time: '12m', mcap: '$4.2M', network: 'Solana' },
        { type: 'whale', token: 'ARB', logo: TOKEN_LOGOS['ARB'], action: 'Distributed', amount: '$1.8M', time: '15m', wallet: '0x2a1...c4f', network: 'Arbitrum' },
        { type: 'breakout', token: 'FET', logo: TOKEN_LOGOS['FET'], action: 'Breaking resistance', amount: '+18%', time: '20m', network: 'Ethereum' },
      ])
    }
  }, [intel.lastUpdated])

  const topCoinSymbols = useMemo(() => TOP_COINS.map((coin) => coin.symbol), [])
  // Include watchlist symbols in the Binance feed so ALL tokens get realtime prices
  const allBinanceSymbols = useMemo(() => {
    const set = new Set(topCoinSymbols)
    ;(watchlist || []).forEach(t => { if (t.symbol) set.add(t.symbol.toUpperCase()) })
    return [...set]
  }, [topCoinSymbols, watchlist])
  // Full data from CoinGecko (market cap, 7d change, etc.) - refreshes every 60s
  const { prices: coinGeckoPrices } = useCuratedTokenPrices(topCoinSymbols, 60 * 1000)
  // Real-time prices from Binance (price + 24h change only) - refreshes every 5s
  const { prices: binancePrices } = useBinanceTopCoinPrices(allBinanceSymbols, 5000)

  // Merge: Use Binance real-time prices, but keep CoinGecko's additional data (marketCap, 7d change, etc.)
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

  const { tokens: trendingTokens } = useTrendingTokens(60 * 1000)

  // Welcome widget: BTC, SOL, ETH in this order
  const WELCOME_COINS = ['BTC', 'SOL', 'ETH']

  // ========== STOCK MARKET DATA ==========
  // Stock symbols for fetching — merge TOP_STOCKS + any watchlist stocks not already in TOP_STOCKS
  const topStockSymbols = useMemo(() => TOP_STOCKS.map(s => s.symbol), [])
  const allStockSymbols = useMemo(() => {
    if (!isStocks) return []
    const base = new Set(topStockSymbols)
    // Add any watchlist stocks not in TOP_STOCKS
    if (watchlist) {
      watchlist.forEach(t => {
        if (t.isStock && t.symbol && !base.has(t.symbol)) base.add(t.symbol)
      })
    }
    return [...base]
  }, [isStocks, topStockSymbols, watchlist])

  // Stock prices - only fetch when in stock mode (includes watchlist symbols)
  const { prices: stockPrices } = useStockPrices(allStockSymbols, 10000)

  // Stock trending (gainers/losers) - only fetch when in stock mode
  const { gainers: stockGainers, losers: stockLosers } = useStockTrending(isStocks ? 60000 : null)

  // Market status (open/closed)
  const marketStatus = useMarketStatus()

  // Market indices (S&P, Dow, Nasdaq)
  const { indices: marketIndices } = useMarketIndices(isStocks ? 30000 : null)

  // Stock news state
  const [stockNews, setStockNews] = useState([])
  useEffect(() => {
    if (!isStocks) return
    let cancelled = false
    const fetchNews = async () => {
      try {
        const news = await getMarketNews('general')
        if (!cancelled) setStockNews(news)
      } catch (e) {
        console.warn('Stock news fetch failed:', e)
      }
    }
    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000) // Refresh every 5 min
    return () => { cancelled = true; clearInterval(interval) }
  }, [isStocks])

  // Unified price data - crypto or stock based on mode
  const activePrices = useMemo(() => {
    if (isStocks) {
      // Transform stock prices to match crypto price structure
      const transformed = {}
      Object.entries(stockPrices || {}).forEach(([symbol, data]) => {
        transformed[symbol] = {
          price: data.price,
          change: data.change,
          change24: data.change,
          marketCap: data.marketCap,
          volume: data.volume,
          // Stock-specific
          pe: data.pe,
          eps: data.eps,
          sector: data.sector,
          exchange: data.exchange,
          marketState: data.marketState,
        }
      })
      return transformed
    }
    return topCoinPrices
  }, [isStocks, stockPrices, topCoinPrices])

  // Unified asset list - crypto or stock
  const activeAssets = useMemo(() => {
    if (isStocks) {
      return TOP_STOCKS.map(stock => ({
        ...stock,
        logo: getStockLogo(stock.symbol, stock.sector),
        type: 'stock',
      }))
    }
    return TOP_COINS.map(coin => ({
      ...coin,
      logo: TOKEN_LOGOS[coin.symbol],
      type: 'crypto',
    }))
  }, [isStocks])

  // Welcome widget assets
  const welcomeAssets = useMemo(() => {
    if (isStocks) {
      return WELCOME_STOCK_SYMBOLS.map(symbol => {
        const stock = TOP_STOCKS.find(s => s.symbol === symbol)
        const price = stockPrices?.[symbol]
        return {
          symbol,
          name: stock?.name || symbol,
          logo: getStockLogo(symbol, stock?.sector),
          price: price?.price || 0,
          change: price?.change || 0,
          type: 'stock',
        }
      })
    }
    return WELCOME_COINS.map(symbol => {
      const coin = TOP_COINS.find(c => c.symbol === symbol)
      const price = topCoinPrices?.[symbol]
      return {
        symbol,
        name: coin?.name || symbol,
        logo: TOKEN_LOGOS[symbol],
        price: price?.price || 0,
        change: price?.change || 0,
        type: 'crypto',
      }
    })
  }, [isStocks, stockPrices, topCoinPrices])
  // ========== END STOCK MARKET DATA ==========

  // Fear & Greed Index (api.alternative.me)
  // Crypto Fear & Greed
  const [cryptoFearGreed, setCryptoFearGreed] = useState({ value: 35, classification: 'Fear' })
  useEffect(() => {
    let cancelled = false
    const fetchFng = async () => {
      try {
        const res = await fetch('https://api.alternative.me/fng/?limit=1')
        const json = await res.json()
        if (cancelled || !json?.data?.[0]) return
        const d = json.data[0]
        setCryptoFearGreed({
          value: parseInt(d.value, 10),
          classification: d.value_classification || ''
        })
      } catch (_) {
        if (!cancelled) setCryptoFearGreed({ value: null, classification: '' })
      }
    }
    fetchFng()
    const t = setInterval(fetchFng, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Live VIX data — extracted from marketIndices
  const liveVix = useMemo(() => {
    if (!isStocks || !marketIndices) return null
    const indicesArr = Array.isArray(marketIndices) ? marketIndices : []
    const vix = indicesArr.find(i => i.symbol === '^VIX' || i.symbol === 'VIX')
    if (!vix?.price) return null
    const price = Number(vix.price)
    const change = vix.change != null ? Number(vix.change) : 0
    // VIX classification (not fear/greed — this is the actual VIX reading)
    let label = 'Low Volatility'
    if (price >= 30) label = 'Extreme Volatility'
    else if (price >= 25) label = 'High Volatility'
    else if (price >= 20) label = 'Elevated'
    else if (price >= 15) label = 'Moderate'
    else if (price >= 12) label = 'Low Volatility'
    else label = 'Complacent'
    return { price, change, label }
  }, [isStocks, marketIndices])

  // Effective Fear & Greed — crypto API in crypto mode (VIX shown separately in stock mode)
  const fearGreed = cryptoFearGreed

  // Alt Season Index — real-time from useMarketIntel (crypto only)
  const altSeason = intel.altSeasonIndex

  // Market Dominance — real-time from CoinGecko /global via useMarketIntel
  const marketDominance = intel.dominance

  // Stocks mode: Risk On/Off — computed from real-time index performance
  const stocksRiskOnOff = useMemo(() => {
    if (!isStocks) return { value: 50, label: 'Neutral', sp500: 0, nasdaq: 0 }
    const spyCh = stockPrices?.SPY?.change ?? 0
    const qqqCh = stockPrices?.QQQ?.change ?? 0
    const vixPrice = liveVix?.price ?? 20
    // Risk score: combines index performance and inverse VIX
    // SPY/QQQ gains = risk on, VIX low = risk on
    const perfScore = (spyCh + qqqCh) / 2 // average index change
    const vixScore = Math.max(0, Math.min(100, 100 - (vixPrice - 10) * 3.3)) // VIX 10→100, VIX 40→0
    const composite = Math.round((perfScore * 8 + vixScore * 0.5 + 50) * 0.7) // weighted blend centered at ~50
    const value = Math.max(0, Math.min(100, composite))
    const label = value >= 65 ? 'Risk On' : value <= 35 ? 'Risk Off' : 'Neutral'
    return {
      value,
      label,
      sp500: spyCh != null ? Number(spyCh).toFixed(1) : '0.0',
      nasdaq: qqqCh != null ? Number(qqqCh).toFixed(1) : '0.0',
    }
  }, [isStocks, stockPrices, liveVix])
  // Index Allocation — derived from real market cap data when available
  const indexAllocation = useMemo(() => {
    if (!isStocks) return { sp500: 45, nasdaq: 28, smallCap: 12, commodities: 15 }
    // Use market cap data from stockPrices if available, otherwise realistic defaults
    const spyMcap = stockPrices?.SPY?.marketCap ?? 45e12
    const qqqMcap = stockPrices?.QQQ?.marketCap ?? 28e12
    const iwmMcap = stockPrices?.IWM?.marketCap ?? 12e12
    const gldMcap = stockPrices?.GLD?.marketCap ?? 15e12
    const total = spyMcap + qqqMcap + iwmMcap + gldMcap
    if (total <= 0) return { sp500: 45, nasdaq: 28, smallCap: 12, commodities: 15 }
    return {
      sp500: (spyMcap / total) * 100,
      nasdaq: (qqqMcap / total) * 100,
      smallCap: (iwmMcap / total) * 100,
      commodities: (gldMcap / total) * 100,
    }
  }, [isStocks, stockPrices])

  // US Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
  const [usMarketStatus, setUsMarketStatus] = useState({
    isOpen: false,
    statusLabel: 'Closed',
    timeMain: '9:30 AM ET',
    timeSub: 'OPENS',
    countdown: '',
  })
  useEffect(() => {
    const getUsMarketStatus = () => {
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const day = et.getDay()
      const hrs = et.getHours()
      const mins = et.getMinutes()
      const isWeekday = day >= 1 && day <= 5
      const openMins = 9 * 60 + 30
      const closeMins = 16 * 60 + 0
      const currentMins = hrs * 60 + mins

      let isOpen = false
      let statusLabel = 'Closed'
      let timeMain = '9:30 AM ET'
      let timeSub = 'OPENS'
      let countdown = ''

      if (isWeekday) {
        if (currentMins >= openMins && currentMins < closeMins) {
          isOpen = true
          statusLabel = 'Trading Active'
          timeSub = 'CLOSES'
          timeMain = '4:00 PM ET'
          const closeIn = closeMins - currentMins
          const closeH = Math.floor(closeIn / 60)
          const closeM = closeIn % 60
          countdown = closeH > 0 ? `Closes in ${closeH}h ${closeM}m` : `Closes in ${closeM}m`
        } else if (currentMins < openMins) {
          timeMain = '9:30 AM ET'
          const openIn = openMins - currentMins
          const openH = Math.floor(openIn / 60)
          const openM = openIn % 60
          countdown = openH > 0 ? `Opens in ${openH}h ${openM}m` : `Opens in ${openM}m`
        } else {
          timeMain = day === 5 ? 'Monday 9:30 AM ET' : 'Tomorrow 9:30 AM ET'
          countdown = day === 5 ? 'Opens Monday' : 'Opens tomorrow'
        }
      } else {
        timeMain = 'Monday 9:30 AM ET'
        countdown = 'Opens Monday'
      }

      setUsMarketStatus({ isOpen, statusLabel, timeMain, timeSub, countdown })
    }
    getUsMarketStatus()
    const t = setInterval(getUsMarketStatus, 60000)
    return () => clearInterval(t)
  }, [])

  // Market AI Analysis – real-time-style analysis driven by live data + timeframes
  const [marketAiTimeframe, setMarketAiTimeframe] = useState('24h')
  const [marketAiAnalysis, setMarketAiAnalysis] = useState('')
  const [marketAiTab, setMarketAiTab] = useState('brief')
  const [newsXToggle, setNewsXToggle] = useState(false)
  const [newsItems, setNewsItems] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)

  // Fetch real news when News tab is active - crypto or stock based on mode
  useEffect(() => {
    if (marketAiTab !== 'news') return
    let cancelled = false
    setNewsLoading(true)

    const fetchNews = async () => {
      try {
        let items
        if (isStocks) {
          // Use stock news from stockNewsApi
          items = await getMarketNews('general')
          // Transform to match expected format
          items = items.map(item => ({
            id: item.id,
            title: item.title,
            summary: item.summary,
            source: item.source,
            url: item.url,
            imageUrl: item.image,
            time: new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            categories: [item.category || 'Market'],
          }))
        } else {
          // Use crypto news
          items = await getCryptoNews(null, 12)
        }
        if (!cancelled) {
          setNewsItems(items)
          setNewsLoading(false)
        }
      } catch (e) {
        console.warn('News fetch failed:', e)
        if (!cancelled) setNewsLoading(false)
      }
    }

    fetchNews()
    return () => { cancelled = true }
  }, [marketAiTab, isStocks])

  const [heatmapsBubblesToggle, setHeatmapsBubblesToggle] = useState(false)
  const [heatmapFullscreen, setHeatmapFullscreen] = useState(false)
  const [heatmapTokens, setHeatmapTokens] = useState([])

  // Liquidation Heatmap state
  const [liqHeatmapData, setLiqHeatmapData] = useState(null)
  const [liqTimeframe, setLiqTimeframe] = useState('24h')
  const [liqFullscreen, setLiqFullscreen] = useState(false)
  const [liqTooltip, setLiqTooltip] = useState({ visible: false, x: 0, y: 0, price: 0, amount: 0, time: '' })
  const [liqLoading, setLiqLoading] = useState(false)
  const liqCanvasRef = useRef(null)
  const liqCanvasFullRef = useRef(null)
  const liqContainerRef = useRef(null)
  const liqContainerFullRef = useRef(null)

  // Escape key to close heatmap fullscreen
  useEffect(() => {
    if (!heatmapFullscreen) return
    const handleEsc = (e) => { if (e.key === 'Escape') setHeatmapFullscreen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [heatmapFullscreen])

  // Fetch top 24 coins for heatmap (independent of topCoins pagination)
  useEffect(() => {
    if (heatmapTokens.length > 0) return // already loaded
    getTopCoinsMarketsPage(1, 25)
      .then((markets) => {
        const list = (markets || []).slice(0, 24).map((coin, index) => ({
          rank: coin.market_cap_rank || index + 1,
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || '',
          logo: coin.image || TOKEN_LOGOS[(coin.symbol || '').toUpperCase()] || null,
          price: Number(coin.current_price) || 0,
          change: Number(coin.price_change_percentage_24h) || 0,
          marketCap: Number(coin.market_cap) || 0,
          volume: Number(coin.total_volume) || 0,
        }))
        setHeatmapTokens(list)
      })
      .catch(() => {})
  }, [])

  // --- Liquidation Heatmap: Escape key ---
  useEffect(() => {
    if (!liqFullscreen) return
    const handleEsc = (e) => { if (e.key === 'Escape') setLiqFullscreen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [liqFullscreen])

  // --- Liquidation Heatmap: Generate density matrix from real BTC candle data ---
  // Produces persistent horizontal bands at key levels (Coinglass-style)
  const generateLiquidationMatrix = useCallback((bars) => {
    if (!bars || bars.length === 0) return null
    const allHighs = bars.map(b => b.h)
    const allLows = bars.map(b => b.l)
    const dataMin = Math.min(...allLows)
    const dataMax = Math.max(...allHighs)
    const currentPrice = bars[bars.length - 1].c
    const range = dataMax - dataMin
    const priceMin = dataMin - range * 0.08
    const priceMax = dataMax + range * 0.08
    const PRICE_ROWS = 120
    const priceStep = (priceMax - priceMin) / PRICE_ROWS
    const numCols = bars.length
    const avgVolume = bars.reduce((s, b) => s + b.v, 0) / bars.length
    const seededRandom = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 49311; return x - Math.floor(x) }

    // Key levels: every $1000 and $500 for persistent band clustering
    const keyLevels1000 = [], keyLevels500 = [], keyLevels250 = []
    const rMin = Math.floor(priceMin / 250) * 250
    const rMax = Math.ceil(priceMax / 250) * 250
    for (let p = rMin; p <= rMax; p += 250) {
      if (p % 1000 === 0) keyLevels1000.push(p)
      else if (p % 500 === 0) keyLevels500.push(p)
      else keyLevels250.push(p)
    }

    // Precompute per-column rolling mid price for proximity calc
    const colMidPrices = bars.map(b => (b.h + b.l) / 2)

    // Build full matrix directly per-column
    const matrix = Array.from({ length: numCols }, () => new Float32Array(PRICE_ROWS))
    for (let col = 0; col < numCols; col++) {
      const bar = bars[col]
      const barMid = colMidPrices[col]
      const volWeight = 0.6 + 0.4 * Math.min(2.5, bar.v / avgVolume)

      // Compute a local "price gravity center" using nearby bars (±10)
      let gravityPrice = 0, gravityW = 0
      for (let k = Math.max(0, col - 10); k <= Math.min(numCols - 1, col + 10); k++) {
        const w = 1 / (1 + Math.abs(k - col))
        gravityPrice += colMidPrices[k] * w
        gravityW += w
      }
      gravityPrice /= gravityW

      for (let row = 0; row < PRICE_ROWS; row++) {
        const priceAtRow = priceMin + (row + 0.5) * priceStep

        // 1) Proximity to LOCAL price action (not just current price) → bands follow price
        const normDist = Math.abs(priceAtRow - gravityPrice) / range
        const proximityBase = 0.35 + 0.65 * Math.exp(-normDist * 1.4)

        // 2) Key-level clustering: strong Gaussian bumps at round numbers
        let levelBump = 0
        for (const lv of keyLevels1000) {
          const d = Math.abs(priceAtRow - lv) / priceStep
          levelBump += 1.8 * Math.exp(-(d * d) / 55)
        }
        for (const lv of keyLevels500) {
          const d = Math.abs(priceAtRow - lv) / priceStep
          levelBump += 1.0 * Math.exp(-(d * d) / 40)
        }
        for (const lv of keyLevels250) {
          const d = Math.abs(priceAtRow - lv) / priceStep
          levelBump += 0.4 * Math.exp(-(d * d) / 25)
        }
        levelBump = Math.min(levelBump, 3.5)

        // 3) Wick proximity — extra brightness near this bar's high/low/close
        const dHigh = Math.abs(priceAtRow - bar.h) / priceStep
        const dLow = Math.abs(priceAtRow - bar.l) / priceStep
        const dClose = Math.abs(priceAtRow - bar.c) / priceStep
        const wickBoost = 1.0 + 1.0 * Math.exp(-(dHigh * dHigh) / 14)
                              + 1.0 * Math.exp(-(dLow * dLow) / 14)
                              + 0.5 * Math.exp(-(dClose * dClose) / 22)

        // 4) Slight long/short asymmetry
        const sideW = priceAtRow > barMid ? 1.08 : 0.92

        // 5) Persistent row noise for organic horizontal streaks
        const rowNoise = 0.55 + 0.45 * seededRandom(row * 137 + 7)
        // 6) Per-cell micro noise
        const cellNoise = 0.75 + 0.25 * seededRandom(col * PRICE_ROWS + row + 42)

        // 7) Recency boost: recent candles get amplified density (liquidation builds up)
        const recency = 0.65 + 0.35 * (col / (numCols - 1))

        matrix[col][row] = proximityBase * (0.2 + levelBump * 0.8) * wickBoost * volWeight * sideW * rowNoise * cellNoise * recency
      }
    }

    // Normalize to [0, 1]
    let maxIntensity = 0
    for (let col = 0; col < numCols; col++) for (let row = 0; row < PRICE_ROWS; row++) if (matrix[col][row] > maxIntensity) maxIntensity = matrix[col][row]
    if (maxIntensity > 0) for (let col = 0; col < numCols; col++) for (let row = 0; row < PRICE_ROWS; row++) matrix[col][row] /= maxIntensity

    // Power curve: push mid values up + add minimum floor so entire chart has color
    for (let col = 0; col < numCols; col++) for (let row = 0; row < PRICE_ROWS; row++) {
      // Apply gamma to brighten midtones
      let v = Math.pow(matrix[col][row], 0.5)
      // Add ambient floor that decays gently from overall price range center
      const priceAtRow = priceMin + (row + 0.5) * priceStep
      const globalDist = Math.abs(priceAtRow - ((priceMax + priceMin) / 2)) / (priceMax - priceMin)
      const ambient = 0.15 * (1 - globalDist * 0.5)
      // Blend: keep whichever is higher
      matrix[col][row] = Math.max(v, ambient)
    }

    return { bars, matrix, priceMin, priceMax, priceRows: PRICE_ROWS, currentPrice, numCols }
  }, [])

  // --- Liquidation Heatmap: Fetch BTC klines on tab activation ---
  useEffect(() => {
    if (marketAiTab !== 'liquidation') return
    setLiqLoading(true)
    const now = Math.floor(Date.now() / 1000)
    const tfConfig = {
      '24h': { resolution: '15', seconds: 24 * 3600 },
      '3d':  { resolution: '60', seconds: 3 * 24 * 3600 },
      '7d':  { resolution: '240', seconds: 7 * 24 * 3600 },
    }
    const { resolution, seconds } = tfConfig[liqTimeframe] || tfConfig['24h']
    getBinanceKlines('BTC', resolution, now - seconds, now)
      .then(({ getBars }) => {
        if (!getBars || getBars.length === 0) { setLiqLoading(false); return }
        setLiqHeatmapData(generateLiquidationMatrix(getBars))
        setLiqLoading(false)
      })
      .catch(() => setLiqLoading(false))
  }, [marketAiTab, liqTimeframe, generateLiquidationMatrix])

  // --- Liquidation Heatmap: Canvas drawing ---
  const drawLiquidationCanvas = useCallback((canvas, container) => {
    if (!liqHeatmapData || !canvas || !container) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    const LEFT_MARGIN = 44, RIGHT_MARGIN = 65, TOP_MARGIN = 8, BOTTOM_MARGIN = 28
    const cL = LEFT_MARGIN, cR = W - RIGHT_MARGIN, cT = TOP_MARGIN, cB = H - BOTTOM_MARGIN
    const cW = cR - cL, cH = cB - cT
    const { bars, matrix, priceMin, priceMax, priceRows, currentPrice, numCols } = liqHeatmapData
    const colW = cW / numCols, rowH = cH / priceRows
    // Background
    ctx.fillStyle = '#0a0812'
    ctx.fillRect(0, 0, W, H)
    // Color mapping: dark navy → blue → cyan → green → yellow (Coinglass-style)
    // Uses ImageData for performance — write RGBA pixels directly
    const imgW = Math.ceil(cW), imgH = Math.ceil(cH)
    if (imgW > 0 && imgH > 0) {
      const imgData = ctx.createImageData(imgW, imgH)
      const pixels = imgData.data
      for (let col = 0; col < numCols; col++) {
        const px0 = Math.floor(col * colW)
        const px1 = Math.floor((col + 1) * colW)
        for (let row = 0; row < priceRows; row++) {
          const t = matrix[col][row]
          if (t < 0.01) continue
          // Compute RGBA based on intensity
          let r, g, b, a
          if (t < 0.15) {
            // Very low: dark blue base (always visible)
            const p = t / 0.15
            r = Math.round(6 + 14 * p)
            g = Math.round(8 + 28 * p)
            b = Math.round(50 + 80 * p)
            a = Math.round(140 + 80 * p)
          } else if (t < 0.32) {
            // Low-mid: deeper blue → electric blue
            const p = (t - 0.15) / 0.17
            r = Math.round(20 - 8 * p)
            g = Math.round(36 + 74 * p)
            b = Math.round(130 + 90 * p)
            a = Math.round(220 + 20 * p)
          } else if (t < 0.50) {
            // Mid: blue → cyan
            const p = (t - 0.32) / 0.18
            r = Math.round(12 + 8 * p)
            g = Math.round(110 + 100 * p)
            b = Math.round(220 + 20 * p)
            a = Math.round(240 + 10 * p)
          } else if (t < 0.68) {
            // Mid-high: cyan → green
            const p = (t - 0.50) / 0.18
            r = Math.round(20 + 70 * p)
            g = Math.round(210 + 35 * p)
            b = Math.round(240 - 170 * p)
            a = 250
          } else if (t < 0.85) {
            // High: green → yellow-green
            const p = (t - 0.68) / 0.17
            r = Math.round(90 + 140 * p)
            g = Math.round(245 + 10 * p)
            b = Math.round(70 - 40 * p)
            a = 252
          } else {
            // Hot: yellow → bright yellow/white
            const p = (t - 0.85) / 0.15
            r = Math.round(230 + 25 * p)
            g = 255
            b = Math.round(30 + 90 * p)
            a = 255
          }
          // Paint row pixels
          const py0 = Math.floor(imgH - (row + 1) * rowH)
          const py1 = Math.floor(imgH - row * rowH)
          for (let px = px0; px < Math.min(px1 + 1, imgW); px++) {
            for (let py = Math.max(0, py0); py < Math.min(py1 + 1, imgH); py++) {
              const idx = (py * imgW + px) * 4
              // Alpha-blend: new over existing (for overlapping cells)
              const existA = pixels[idx + 3] / 255
              const newA = a / 255
              const outA = newA + existA * (1 - newA)
              if (outA > 0) {
                pixels[idx]     = Math.round((r * newA + pixels[idx] * existA * (1 - newA)) / outA)
                pixels[idx + 1] = Math.round((g * newA + pixels[idx + 1] * existA * (1 - newA)) / outA)
                pixels[idx + 2] = Math.round((b * newA + pixels[idx + 2] * existA * (1 - newA)) / outA)
                pixels[idx + 3] = Math.round(outA * 255)
              }
            }
          }
        }
      }
      ctx.putImageData(imgData, cL, cT)
    }
    // Draw candlesticks
    const scaleY = (price) => cB - ((price - priceMin) / (priceMax - priceMin)) * cH
    const candleW = Math.max(1.5, colW * 0.45)
    bars.forEach((bar, i) => {
      const x = cL + i * colW + colW / 2
      const isGreen = bar.c >= bar.o
      const color = isGreen ? 'rgba(52, 211, 153, 0.85)' : 'rgba(239, 83, 80, 0.8)'
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(0.8, candleW * 0.15)
      ctx.beginPath(); ctx.moveTo(x, scaleY(bar.h)); ctx.lineTo(x, scaleY(bar.l)); ctx.stroke()
      const bodyTop = Math.min(scaleY(bar.o), scaleY(bar.c))
      const bodyH = Math.max(1, Math.abs(scaleY(bar.c) - scaleY(bar.o)))
      ctx.fillStyle = color
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    })
    // Y-axis price labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = '500 9px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'left'
    const priceSteps = 6
    for (let i = 0; i <= priceSteps; i++) {
      const price = priceMin + ((priceMax - priceMin) / priceSteps) * i
      const y = scaleY(price)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.fillText(fmtPrice(price), cR + 5, y + 3)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(cL, y); ctx.lineTo(cR, y); ctx.stroke()
    }
    // Current price line
    const cpY = scaleY(currentPrice)
    ctx.strokeStyle = 'rgba(247, 147, 26, 0.55)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(cL, cpY); ctx.lineTo(cR, cpY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(247, 147, 26, 0.9)'
    ctx.font = '600 9px -apple-system, system-ui, sans-serif'
    ctx.fillText(fmtPrice(currentPrice), cR + 5, cpY + 3)
    // X-axis time labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.font = '500 8px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'center'
    const labelCount = Math.min(7, numCols)
    const labelInterval = Math.max(1, Math.floor(numCols / labelCount))
    for (let i = 0; i < numCols; i += labelInterval) {
      const date = new Date(bars[i].t * 1000)
      const lbl = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      ctx.fillText(lbl, cL + i * colW + colW / 2, H - 6)
    }
    // Left intensity bar
    const barX = 6, barW = 12, barTop = cT + 8, barBottom = cB - 8
    const gradient = ctx.createLinearGradient(barX, barBottom, barX, barTop)
    gradient.addColorStop(0, 'rgba(6, 8, 50, 0.7)')
    gradient.addColorStop(0.15, 'rgba(12, 36, 130, 0.85)')
    gradient.addColorStop(0.35, 'rgba(20, 160, 235, 0.92)')
    gradient.addColorStop(0.55, 'rgba(60, 230, 100, 0.95)')
    gradient.addColorStop(0.75, 'rgba(200, 250, 40, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 120, 1)')
    ctx.fillStyle = gradient
    ctx.fillRect(barX, barTop, barW, barBottom - barTop)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(barX, barTop, barW, barBottom - barTop)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.font = '500 7px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('High', barX + barW / 2, barTop - 3)
    ctx.fillText('Low', barX + barW / 2, barBottom + 9)
    // Store dims for hover
    canvas._liqDims = { cL, cR, cT, cB, cW, cH, colW, rowH, priceMin, priceMax, priceRows, numCols, bars, matrix }
  }, [liqHeatmapData, fmtPrice])

  useEffect(() => {
    drawLiquidationCanvas(liqCanvasRef.current, liqContainerRef.current)
  }, [drawLiquidationCanvas])

  useEffect(() => {
    if (liqFullscreen) drawLiquidationCanvas(liqCanvasFullRef.current, liqContainerFullRef.current)
  }, [liqFullscreen, drawLiquidationCanvas])

  // --- Liquidation Heatmap: Mouse interaction ---
  const handleLiqMouseMove = useCallback((e) => {
    const canvas = e.target
    if (!canvas || !canvas._liqDims) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const d = canvas._liqDims
    if (x < d.cL || x > d.cR || y < d.cT || y > d.cB) { setLiqTooltip(t => t.visible ? { ...t, visible: false } : t); return }
    const col = Math.floor((x - d.cL) / d.colW)
    const row = Math.floor((d.cB - y) / d.rowH)
    if (col < 0 || col >= d.numCols || row < 0 || row >= d.priceRows) { setLiqTooltip(t => t.visible ? { ...t, visible: false } : t); return }
    const intensity = d.matrix[col][row]
    const priceAtRow = d.priceMin + (row + 0.5) * ((d.priceMax - d.priceMin) / d.priceRows)
    const bar = d.bars[col]
    const date = new Date(bar.t * 1000)
    setLiqTooltip({
      visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top,
      price: priceAtRow,
      amount: (intensity * 88.35).toFixed(1),
      time: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    })
  }, [])
  const handleLiqMouseLeave = useCallback(() => { setLiqTooltip(t => t.visible ? { visible: false, x: 0, y: 0, price: 0, amount: 0, time: '' } : t) }, [])

  const marketAiTabsCrypto = [
    { id: 'brief', label: t('commandCenter.aiBrief') },
    { id: 'analysis', label: t('commandCenter.aiMarket') },
    { id: 'news', label: t('commandCenter.news') },
    { id: 'heatmaps', label: t('commandCenter.heatmaps') },
    { id: 'liquidation', label: t('commandCenter.liquidation') },
    { id: 'sector', label: t('commandCenter.sectors') },
    { id: 'mindshare', label: t('commandCenter.mindshare') },
    { id: 'calendar', label: t('commandCenter.calendar') },
    { id: 'flows', label: t('commandCenter.flows') },
    { id: 'wallets', label: t('commandCenter.wallets') },
  ]
  const marketAiTabs = marketAiTabsCrypto

  // Register page actions and context for the AI assistant (when on landing)
  useEffect(() => {
    if (typeof setAssistantActions !== 'function') return
    setAssistantActions({
      openCommandCenterTab: (tabId) => setMarketAiTab(tabId),
      highlightSection: (selector) => {
        const el = typeof selector === 'string' ? document.querySelector(selector) : null
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ai-highlight')
          window.setTimeout(() => el.classList.remove('ai-highlight'), 3000)
        }
      },
      openWatchlist: () => setWatchlistOpen(true),
      openWelcomeWidget: () => setWelcomeOpen(true),
      openGlossary: () => onPageChange && onPageChange('glossary'),
      openTokenChart: (symbolOrToken) => {
        if (symbolOrToken && typeof symbolOrToken === 'object' && symbolOrToken.symbol) {
          setTopSectionTab('topcoins')
          setTabsOn(true)
          openChartOnly(symbolOrToken)
          setTimeout(() => {
            const chartPanel = document.querySelector('.discovery-chart-side, .welcome-chart-overlay-panel-right')
            chartPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
          return
        }
        const sym = (symbolOrToken || '').toString().toUpperCase()
        const coin = TOP_COINS.find((c) => c.symbol === sym)
        if (!coin) return
        const data = topCoinPrices?.[sym] ?? topCoinPrices?.[coin.symbol]
        const token = {
          ...coin,
          price: data?.price != null ? Number(data.price) : coin.price,
          change: data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : coin.change),
          logo: coin.logo || TOKEN_LOGOS[coin.symbol],
          sparkline_7d: data?.sparkline_7d ?? coin.sparkline_7d,
        }
        setTopSectionTab('topcoins')
        setTabsOn(true)
        openChartOnly(token)
        setTimeout(() => {
          const chartPanel = document.querySelector('.discovery-chart-side, .welcome-chart-overlay-panel-right')
          chartPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      },
    })
    return () => setAssistantActions(null)
  }, [setAssistantActions, onPageChange, topCoinPrices])

  useEffect(() => {
    if (typeof setAssistantContext !== 'function') return
    setAssistantContext({
      fearGreed: { value: fearGreed.value, classification: fearGreed.classification },
      marketAiTab,
      marketMode,
      welcomeOpen,
      watchlistOpen,
    })
    return () => setAssistantContext(null)
  }, [setAssistantContext, fearGreed.value, fearGreed.classification, marketAiTab, marketMode, welcomeOpen, watchlistOpen])

  // When Monarch Chat requested chart or News tab, open them on mount
  useEffect(() => {
    if (pendingCommandCenterTab && typeof setPendingCommandCenterTab === 'function') {
      setMarketAiTab(pendingCommandCenterTab)
      setPendingCommandCenterTab(null)
    }
  }, [pendingCommandCenterTab, setPendingCommandCenterTab])

  const marketAiTimeframes = [
    { id: '1h', label: '1H' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
  ]

  // Market Flows (Flows tab): Funding + Liquidations + Whale Flows trio, then inflow/outflow / ETF
  const flowPeriodLabel = '24h'
  // Market structure health check — real-time from useMarketIntel
  // Use primitive deps to avoid re-render on same-value object changes
  const btcFund = intel.fundingRates.btc
  const ethFund = intel.fundingRates.eth
  const lsLongs = intel.longShortRatio.longs
  const lsShorts = intel.longShortRatio.shorts
  const whaleNet = intel.whaleFlows.net
  const whaleDir = intel.whaleFlows.direction
  const marketStructureTrio = useMemo(() => ({
    funding: [
      { symbol: 'BTC', rate: btcFund, label: btcFund >= 0 ? 'Longs pay' : 'Shorts pay', healthy: Math.abs(btcFund) < 0.05 },
      { symbol: 'ETH', rate: ethFund, label: ethFund >= 0 ? 'Longs pay' : 'Shorts pay', healthy: Math.abs(ethFund) < 0.05 },
    ],
    liquidations: {
      longs24h: lsLongs > 50 ? parseFloat((lsLongs * 0.8).toFixed(1)) : parseFloat((lsLongs * 0.4).toFixed(1)),
      shorts24h: lsShorts > 50 ? parseFloat((lsShorts * 0.8).toFixed(1)) : parseFloat((lsShorts * 0.4).toFixed(1)),
      unit: 'M',
      bias: lsLongs > lsShorts ? 'longs' : 'shorts',
    },
    whaleFlows: { net: whaleNet, unit: 'M', label: 'Whale net', direction: whaleDir },
  }), [btcFund, ethFund, lsLongs, lsShorts, whaleNet, whaleDir])
  const marketFlowSummary = intel.flowSummary
  const etfFlowsData = useMemo(() => [
    { name: 'iShares Bitcoin Trust', ticker: 'IBIT', inflow: 412, outflow: 18, net: 394 },
    { name: 'Fidelity Wise Origin', ticker: 'FBTC', inflow: 286, outflow: 12, net: 274 },
    { name: 'Grayscale Bitcoin Trust', ticker: 'GBTC', inflow: 44, outflow: 318, net: -274 },
    { name: 'Bitwise Bitcoin ETF', ticker: 'BITB', inflow: 89, outflow: 22, net: 67 },
    { name: 'ARK 21Shares Bitcoin', ticker: 'ARKB', inflow: 156, outflow: 31, net: 125 },
    { name: 'Invesco Galaxy Bitcoin', ticker: 'BTCO', inflow: 72, outflow: 45, net: 27 },
    { name: 'VanEck Bitcoin Trust', ticker: 'HODL', inflow: 38, outflow: 19, net: 19 },
    { name: 'Valkyrie Bitcoin Fund', ticker: 'BRRR', inflow: 28, outflow: 14, net: 14 },
  ], [])
  const flowByProduct = useMemo(() => [
    { label: 'ETPs / ETFs', inflow: 1125, outflow: 479, net: 646 },
    { label: 'Exchanges (net)', inflow: 0, outflow: 0, net: -312 },
    { label: 'Whale wallets', inflow: 122, outflow: 413, net: -291 },
  ], [])

  // Narrative Lifecycle (Mindshare tab): Early → Mid → Late → Exhausted — real-time from useMarketIntel
  const narrativeLifecycleStages = ['Early', 'Mid', 'Late', 'Exhausted']
  const narrativeLifecycleData = useMemo(() => {
    if (intel.sectorPerformance && intel.sectorPerformance.length > 0) return intel.sectorPerformance
    // Fallback if API hasn't loaded yet
    return [
      { id: 'ai-agents', name: 'AI / ML', stage: 'mid', stageLabel: 'Mid', color: 'yellow' },
      { id: 'defi', name: 'DeFi', stage: 'mid-late', stageLabel: 'Mid–Late', color: 'yellow' },
      { id: 'l2', name: 'L2 / Scaling', stage: 'mid', stageLabel: 'Mid', color: 'yellow' },
      { id: 'memes', name: 'Memes', stage: 'late', stageLabel: 'Late', color: 'red' },
      { id: 'rwa', name: 'RWA', stage: 'early', stageLabel: 'Early', color: 'green' },
      { id: 'depin', name: 'DePIN', stage: 'early', stageLabel: 'Early', color: 'green' },
      { id: 'gaming', name: 'Gaming / Metaverse', stage: 'mid', stageLabel: 'Mid', color: 'yellow' },
      { id: 'l1', name: 'L1 Chains', stage: 'mid', stageLabel: 'Mid', color: 'yellow' },
      { id: 'btc-eco', name: 'BTC Ecosystem', stage: 'mid', stageLabel: 'Mid', color: 'yellow' },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intel.lastUpdated])

  // Economic Calendar: impact filter (events that matter for financial markets)
  const economicImpactLevels = [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
    { id: 'critical', label: 'Critical' },
  ]
  const [economicImpactFilter, setEconomicImpactFilter] = useState(() => economicImpactLevels.map((l) => l.id))
  const toggleEconomicImpact = (id) => {
    setEconomicImpactFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  // Upcoming events time range: day | week | month
  const [economicRange, setEconomicRange] = useState('week')
  const economicRangeOptions = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ]

  // Mock economic events (financial market–relevant). In production, replace with API.
  const economicCalendarEvents = useMemo(() => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const toTime = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return [
      { id: '1', title: 'FOMC Rate Decision', date: addDays(now, 0), time: '14:00', impact: 'critical', country: 'US' },
      { id: '2', title: 'Fed Chair Powell Press Conference', date: addDays(now, 0), time: '14:30', impact: 'critical', country: 'US' },
      { id: '3', title: 'CPI (MoM)', date: addDays(now, 1), time: '08:30', impact: 'high', country: 'US' },
      { id: '4', title: 'Initial Jobless Claims', date: addDays(now, 2), time: '08:30', impact: 'medium', country: 'US' },
      { id: '5', title: 'Retail Sales', date: addDays(now, 3), time: '08:30', impact: 'high', country: 'US' },
      { id: '6', title: 'ECB President Speech', date: addDays(now, 4), time: '09:00', impact: 'high', country: 'EU' },
      { id: '7', title: 'UoM Consumer Sentiment', date: addDays(now, 5), time: '10:00', impact: 'medium', country: 'US' },
      { id: '8', title: 'Existing Home Sales', date: addDays(now, 7), time: '10:00', impact: 'low', country: 'US' },
      { id: '9', title: 'PMI Manufacturing', date: addDays(now, 10), time: '09:45', impact: 'medium', country: 'EU' },
      { id: '10', title: 'Non-Farm Payrolls', date: addDays(now, 14), time: '08:30', impact: 'critical', country: 'US' },
      { id: '11', title: 'Federal Budget Balance', date: addDays(now, 1), time: '14:00', impact: 'low', country: 'US' },
      { id: '12', title: 'BoE Interest Rate Decision', date: addDays(now, 6), time: '12:00', impact: 'high', country: 'UK' },
    ].map((e) => ({ ...e, dateKey: toYMD(e.date), timeLabel: e.time }))
  }, [])

  const filteredEconomicEvents = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    let end
    if (economicRange === 'day') end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    else if (economicRange === 'week') end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    else end = new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000)
    return economicCalendarEvents
      .filter((e) => economicImpactFilter.includes(e.impact))
      .filter((e) => e.date >= start && e.date < end)
      .sort((a, b) => a.date - b.date)
  }, [economicCalendarEvents, economicImpactFilter, economicRange])

  // Generate comprehensive macro analysis
  const macroAnalysisData = useMemo(() => {
    if (isStocks) {
      // ── STOCK MODE ──
      const spy = stockPrices?.SPY || marketIndices?.SPY
      const qqq = stockPrices?.QQQ || marketIndices?.QQQ
      const aapl = stockPrices?.AAPL
      const spyCh = spy?.change != null ? Number(spy.change) : null
      const qqqCh = qqq?.change != null ? Number(qqq.change) : null
      const aaplCh = aapl?.change != null ? Number(aapl.change) : null
      const spyPrice = spy?.price ?? null
      const qqqPrice = qqq?.price ?? null
      const aaplPrice = aapl?.price ?? null
      const vixPrice = liveVix?.price ?? null
      const vixLabel = liveVix?.label || 'N/A'

      const getChange = (ch, tf) => {
        if (ch == null) return null
        if (tf === '1h') return (ch * 0.15)
        if (tf === '7d') return (ch * 1.4)
        return ch
      }
      const c1 = getChange(spyCh, marketAiTimeframe)
      const c2 = getChange(qqqCh, marketAiTimeframe)
      const c3 = getChange(aaplCh, marketAiTimeframe)
      const avg = [c1, c2, c3].filter((x) => x != null).reduce((a, b) => a + b, 0) / 3
      const bias = avg > 1 ? 'bullish' : avg < -1 ? 'bearish' : 'neutral'
      const tfLabel = marketAiTimeframe === '1h' ? '1-hour' : marketAiTimeframe === '24h' ? '24-hour' : '7-day'

      const tableData = [
        { asset: 'SPY', price: spyPrice, change: spyCh, signal: spyCh > 1.5 ? 'Strong Buy' : spyCh > 0 ? 'Buy' : spyCh > -1.5 ? 'Hold' : 'Sell' },
        { asset: 'QQQ', price: qqqPrice, change: qqqCh, signal: qqqCh > 1.5 ? 'Strong Buy' : qqqCh > 0 ? 'Buy' : qqqCh > -1.5 ? 'Hold' : 'Sell' },
        { asset: 'AAPL', price: aaplPrice, change: aaplCh, signal: aaplCh > 2 ? 'Strong Buy' : aaplCh > 0 ? 'Buy' : aaplCh > -2 ? 'Hold' : 'Sell' },
      ]

      let p1 = `${tfLabel.toUpperCase()} OUTLOOK — The stock market is exhibiting a ${bias} bias based on major index and mega-cap performance. `
      if (spyCh != null && qqqCh != null) {
        p1 += `S&P 500 is ${spyCh >= 0 ? 'up' : 'down'} ${Math.abs(spyCh).toFixed(1)}% while Nasdaq ${qqqCh >= 0 ? 'gained' : 'lost'} ${Math.abs(qqqCh).toFixed(1)}%. `
      }
      if (aaplCh != null) {
        p1 += `Apple ${aaplCh >= 0 ? 'advanced' : 'declined'} ${Math.abs(aaplCh).toFixed(1)}%, ${aaplCh > qqqCh ? 'outpacing' : 'lagging'} the broader tech index. `
      }
      p1 += `VIX at ${vixPrice != null ? vixPrice.toFixed(2) : '—'} (${vixLabel}), ${vixPrice != null && vixPrice >= 25 ? 'signaling elevated volatility — hedge exposure and reduce position sizes' : vixPrice != null && vixPrice <= 15 ? 'indicating complacency — low volatility historically precedes larger moves' : 'reflecting moderate volatility conditions with no extreme stress'}. `

      let p2 = 'MACRO CONDITIONS — Federal Reserve policy and economic data remain the dominant market drivers. '
      if (bias === 'bullish') {
        p2 += 'The rally is supported by improving earnings expectations and stable Treasury yields. Institutional rotation into equities continues with strong ETF inflows across S&P and Nasdaq-tracking funds. Growth stocks are leading, suggesting risk appetite is healthy. Watch for earnings surprises as a catalyst. Key resistance at all-time highs — a breakout with volume would confirm trend continuation. Scale into strength on pullbacks to the 20-day moving average.'
      } else if (bias === 'bearish') {
        p2 += 'Risk-off sentiment as markets digest tighter financial conditions. Rising yields and dollar strength pressure equity multiples, particularly growth and tech. VIX elevated, options market pricing elevated volatility ahead. Defensive sectors (utilities, healthcare, staples) outperforming. Support at the 200-day moving average is critical — a breakdown could trigger institutional selling. Reduce exposure, hedge with put spreads, and wait for stabilization.'
      } else {
        p2 += 'Markets consolidating as investors await clarity from upcoming Fed decisions and earnings season. The S&P is range-bound between key support and resistance. Sector rotation is active but directionless. Bond yields are driving intraday swings. Position sizing should be conservative — avoid large directional bets until a catalyst emerges. Focus on stock-specific opportunities over broad market bets.'
      }

      let p3 = 'POSITIONING — '
      if (bias === 'bullish') {
        p3 += 'Favor growth and momentum names. Consider adding to quality mega-caps (AAPL, MSFT, NVDA) on pullbacks. Sector leaders: Technology and Consumer Discretionary. Use trailing stops at 5-7% below entry. Watch VIX for complacency signals below 12.'
      } else if (bias === 'bearish') {
        p3 += 'Defensive posture. Favor value over growth, rotate into dividend-paying stocks and low-beta sectors. Consider inverse ETFs or protective puts for hedging. Cash is a position. Build a watchlist for the eventual bounce — best entries come after capitulation.'
      } else {
        p3 += 'Neutral markets reward selectivity. Focus on individual stock setups rather than index trades. Earnings beats with guidance upgrades offer the best risk/reward. Covered calls can generate income in sideways markets. Stay disciplined with entry and exit levels.'
      }

      const leader = tableData.reduce((a, b) => Math.abs(b.change || 0) > Math.abs(a.change || 0) ? b : a, tableData[0])
      const moodWord = bias === 'bullish' ? 'Buy pressure' : bias === 'bearish' ? 'Sell pressure' : 'Consolidating'
      const smartSummary = tableData.map(r => `${r.asset} ${(r.change || 0) >= 0 ? '+' : ''}${(r.change || 0).toFixed(1)}%`).join('  ·  ') + `  —  ${moodWord}`

      return { p1, p2, p3, tableData, bias, tfLabel, fng: vixPrice, fngLabel: vixLabel, smartSummary }
    }

    // ── CRYPTO MODE (original) ──
    const btc = topCoinPrices?.BTC
    const eth = topCoinPrices?.ETH
    const sol = topCoinPrices?.SOL
    const btcCh = btc?.change != null ? Number(btc.change) : null
    const ethCh = eth?.change != null ? Number(eth.change) : null
    const solCh = sol?.change != null ? Number(sol.change) : null
    const btcPrice = btc?.price ?? null
    const ethPrice = eth?.price ?? null
    const solPrice = sol?.price ?? null
    const fng = fearGreed.value
    const fngLabel = fearGreed.classification || 'Neutral'

    const getChange = (ch, tf) => {
      if (ch == null) return null
      if (tf === '1h') return (ch * 0.15)
      if (tf === '7d') return (ch * 1.4)
      return ch
    }
    const c1 = getChange(btcCh, marketAiTimeframe)
    const c2 = getChange(ethCh, marketAiTimeframe)
    const c3 = getChange(solCh, marketAiTimeframe)
    const avg = [c1, c2, c3].filter((x) => x != null).reduce((a, b) => a + b, 0) / 3
    const bias = avg > 1 ? 'bullish' : avg < -1 ? 'bearish' : 'neutral'
    const tfLabel = marketAiTimeframe === '1h' ? '1-hour' : marketAiTimeframe === '24h' ? '24-hour' : '7-day'

    // Asset table data
    const tableData = [
      { asset: 'BTC', price: btcPrice, change: btcCh, signal: btcCh > 2 ? 'Strong Buy' : btcCh > 0 ? 'Buy' : btcCh > -2 ? 'Hold' : 'Sell' },
      { asset: 'ETH', price: ethPrice, change: ethCh, signal: ethCh > 2 ? 'Strong Buy' : ethCh > 0 ? 'Buy' : ethCh > -2 ? 'Hold' : 'Sell' },
      { asset: 'SOL', price: solPrice, change: solCh, signal: solCh > 2 ? 'Strong Buy' : solCh > 0 ? 'Buy' : solCh > -2 ? 'Hold' : 'Sell' },
    ]

    // Paragraph 1: Market overview and bias
    let p1 = `${tfLabel.toUpperCase()} OUTLOOK — The crypto market is currently exhibiting a ${bias} bias based on major asset performance. `
    if (btcCh != null && ethCh != null) {
      p1 += `Bitcoin is ${btcCh >= 0 ? 'up' : 'down'} ${Math.abs(btcCh).toFixed(1)}% while Ethereum ${ethCh >= 0 ? 'gained' : 'lost'} ${Math.abs(ethCh).toFixed(1)}%. `
    }
    if (solCh != null) {
      p1 += `Solana ${solCh >= 0 ? 'advanced' : 'declined'} ${Math.abs(solCh).toFixed(1)}%, ${solCh > ethCh ? 'outperforming' : 'underperforming'} ETH on the session. `
    }
    p1 += `Market sentiment as measured by the Fear & Greed Index sits at ${fng != null ? fng : '—'} (${fngLabel}), ${fng > 60 ? 'suggesting elevated optimism that historically precedes pullbacks' : fng < 40 ? 'indicating fear levels that often mark accumulation zones' : 'reflecting balanced positioning with no extreme crowding'}. `

    // Paragraph 2: Macro conditions and outlook
    let p2 = 'MACRO CONDITIONS — Global liquidity conditions remain the primary driver for risk assets. '
    if (bias === 'bullish') {
      p2 += 'The current rally aligns with improving macro sentiment as central banks signal a more accommodative stance. Treasury yields have stabilized, reducing headwinds for duration-sensitive assets like crypto. Institutional flows via spot ETFs continue to provide structural demand, with cumulative inflows suggesting sustained allocation shifts. Key resistance levels to watch include BTC at psychological round numbers and ETH at prior swing highs. A breakout with volume confirmation would suggest trend continuation, while rejection could trigger short-term profit-taking. Risk management remains essential — consider scaling into strength rather than chasing.'
    } else if (bias === 'bearish') {
      p2 += 'Risk-off sentiment dominates as markets digest tighter financial conditions. Elevated real rates and dollar strength continue to pressure crypto valuations. Geopolitical tensions and tariff uncertainty add to the cautious positioning. On-chain data shows exchange inflows rising, typically a precursor to selling pressure. Support levels at prior consolidation zones become critical — a decisive break below could accelerate downside. Defensive positioning is warranted: reduce leverage, size down, and wait for capitulation signals (volume spike, funding reset) before re-engaging. Cash is a position.'
    } else {
      p2 += 'Markets are consolidating within a defined range as participants await clearer macro signals. The Fed remains data-dependent, with upcoming CPI and employment reports likely to set near-term direction. Bitcoin dominance is stable, suggesting capital is not rotating aggressively between majors and alts. Volatility compression typically precedes expansion — a breakout in either direction is likely within the coming sessions. Position accordingly with defined invalidation levels. Avoid overtrading in choppy conditions; patience often outperforms activity in range-bound markets.'
    }

    // Paragraph 3: Actionable insights
    let p3 = 'POSITIONING — '
    if (bias === 'bullish') {
      p3 += 'Current conditions favor trend-following strategies. Consider adding to core positions on pullbacks to support, with stops below recent swing lows. Alt exposure should favor high-beta names with strong fundamentals and volume. Take partial profits at resistance to lock in gains. Monitor BTC dominance for rotation signals — a decline typically benefits altcoins.'
    } else if (bias === 'bearish') {
      p3 += 'Preserve capital and reduce exposure. If hedging, consider short positions or inverse products with tight risk controls. Avoid catching falling knives — wait for clear reversal signals like a higher low on the daily chart with volume. Build a watchlist of high-conviction assets to accumulate once conditions stabilize. Dollar-cost averaging can smooth entry during volatile periods.'
    } else {
      p3 += 'Neutral conditions suit range-trading strategies. Define clear support/resistance levels and trade the range with appropriate size. Avoid large directional bets until a breakout confirms. Use this period to research and build conviction in assets for the next trending phase. Stablecoin yields offer attractive carry while waiting for opportunities.'
    }

    // Smart one-liner summary for Market Pulse status bar
    const leader = tableData.reduce((a, b) => Math.abs(b.change || 0) > Math.abs(a.change || 0) ? b : a, tableData[0])
    const leaderDir = (leader.change || 0) >= 0 ? 'leads up' : 'leads down'
    const moodWord = bias === 'bullish' ? 'Buy pressure' : bias === 'bearish' ? 'Sell pressure' : 'Consolidating'
    const smartSummary = tableData.map(r => `${r.asset} ${(r.change || 0) >= 0 ? '+' : ''}${(r.change || 0).toFixed(1)}%`).join('  ·  ') + `  —  ${moodWord}`

    return { p1, p2, p3, tableData, bias, tfLabel, fng, fngLabel, smartSummary }
  }, [marketAiTimeframe, topCoinPrices, fearGreed.value, fearGreed.classification, isStocks, stockPrices, marketIndices, liveVix])

  // Legacy: macroAnalysisData.p1 is available directly — no need to sync to separate state

  // ─── "The Brief" — Rotating AI intelligence statements ───
  const theBriefStatements = useMemo(() => {
    if (isStocks) {
      // ══ STOCK MODE BRIEFS ══
      const spy = stockPrices?.SPY || marketIndices?.SPY
      const qqq = stockPrices?.QQQ || marketIndices?.QQQ
      const aapl = stockPrices?.AAPL
      const vixVal = liveVix?.price ?? null
      const vixLbl = (liveVix?.label || 'N/A').toLowerCase()
      const spyPrice = spy?.price ? fmtPrice(Number(spy.price)) : null
      const spyCh = spy?.change != null ? Number(spy.change) : 0
      const qqqCh = qqq?.change != null ? Number(qqq.change) : 0
      const aaplCh = aapl?.change != null ? Number(aapl.change) : 0
      const avg = (spyCh + qqqCh + aaplCh) / 3

      const now = new Date()
      const hour = now.getHours()
      const dayOfWeek = now.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isFriday = dayOfWeek === 5
      const isMonday = dayOfWeek === 1
      const isMorning = hour >= 5 && hour < 12
      const isAfternoon = hour >= 12 && hour < 17
      const dayName = [t('dayNames.sunday'), t('dayNames.monday'), t('dayNames.tuesday'), t('dayNames.wednesday'), t('dayNames.thursday'), t('dayNames.friday'), t('dayNames.saturday')][dayOfWeek]

      const movers = [
        { name: 'SPY', ch: spyCh },
        { name: 'QQQ', ch: qqqCh },
        { name: 'AAPL', ch: aaplCh },
      ].sort((a, b) => Math.abs(b.ch) - Math.abs(a.ch))
      const leader = movers[0]
      const maxMove = Math.max(Math.abs(spyCh), Math.abs(qqqCh), Math.abs(aaplCh))
      const isVolatile = maxMove > 3
      const isCalm = maxMove < 0.5
      const isSelling = avg < -2
      const isRallying = avg > 2

      const briefs = []

      // Brief 1: VIX + SPY anchor
      {
        const parts = []
        if (vixVal != null) {
          if (vixVal >= 30) parts.push(`${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.extremeVolatility')}`)
          else if (vixVal >= 25) parts.push(`${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.elevatedVolatility')}`)
          else if (vixVal >= 20) parts.push(`${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.volatilityElevated')}`)
          else if (vixVal >= 15) parts.push(`${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.moderateVolatility')}`)
          else parts.push(`${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.lowVolatilityComplacent')}`)
        }
        if (spyPrice) {
          if (spyCh > 1.5) parts.push(`${t('brief.spyBreakingHigher')} ${spyPrice}.`)
          else if (spyCh > 0) parts.push(`${t('brief.spyHolding')} ${spyPrice}.`)
          else if (spyCh < -1.5) parts.push(`${t('brief.spyUnderPressure')} ${spyPrice}.`)
          else parts.push(`${t('brief.spySteady')} ${spyPrice}.`)
        }
        if (leader && Math.abs(leader.ch) > 1) {
          parts.push(`${leader.name} ${leader.ch > 0 ? t('brief.leadingUp') : t('brief.laggingBehind')} ${Math.abs(leader.ch).toFixed(1)}%.`)
        }
        if (avg > 1.5) parts.push(t('brief.broadStrength'))
        else if (avg > 0.5) parts.push(t('brief.buyersPresent'))
        else if (avg < -1.5) parts.push(t('brief.sellingPressure'))
        else if (avg < -0.5) parts.push(t('brief.mildWeakness'))
        else parts.push(t('brief.rangeBoundReveal'))
        briefs.push(parts.join(' '))
      }

      // Brief 2: Time-of-day + market context
      {
        let timePart = ''
        if (isWeekend) timePart = `${dayName}. ${t('brief.weekendReview')}`
        else if (isFriday && isAfternoon) timePart = `${dayName}. ${t('brief.fridaySquaring')} ${t('brief.endOfWeekSqueezes')}`
        else if (isMonday && isMorning) timePart = `${dayName}. ${t('brief.mondayInstitutional')}`
        else if (isMorning) timePart = `${dayName}. ${t('brief.preMarket')}`
        else timePart = `${dayName}. ${t('brief.regularSession')}`

        if (spyPrice) {
          if (avg > 1) timePart += ` S&P ${spyPrice}. ${t('brief.momentumUpside')}`
          else if (avg < -1) timePart += ` S&P ${spyPrice}. ${t('brief.riskManagementKey')}`
          else timePart += ` S&P ${spyPrice}. ${t('brief.marketsFindingEquilibrium')}`
        }
        briefs.push(timePart)
      }

      // Brief 3: Narrative
      {
        let narrative = ''
        if (isSelling && avg < -3) {
          narrative = `${t('brief.sharpSelloff')} ${Math.abs(avg).toFixed(1)}%. ` +
            `${vixVal != null && vixVal >= 25 ? `${t('brief.vixAt')} ${vixVal.toFixed(1)}. ${t('brief.capitulationRecoveries')}` : t('brief.focusQuality')}`
        } else if (isRallying && avg > 3) {
          narrative = `${t('brief.strongRally')} ${leader.name} +${Math.abs(leader.ch).toFixed(1)}%. ` +
            `${vixVal != null && vixVal <= 13 ? `${t('brief.vixAt')} ${vixVal.toFixed(1)}. ${t('brief.marketHumblesComplacent')}` : t('brief.momentumBuilding')}`
        } else if (isSelling) {
          narrative = `${t('brief.steadySelling')} ${Math.abs(avg).toFixed(1)}%. ${t('brief.focusQuality')}`
        } else if (isCalm) {
          narrative = spyPrice
            ? `${t('brief.compression')} S&P ${spyPrice}, ${maxMove.toFixed(1)}%. ${vixVal != null ? `${t('brief.vixAt')} ${vixVal.toFixed(1)}.` : ''} ${t('brief.calmBeforeMove')}`
            : t('brief.calmBeforeMove')
        } else {
          narrative = spyPrice
            ? `S&P ${spyPrice}. ${t('brief.measuredMoves')} ${t('brief.stockSelectionOverIndex')}`
            : t('brief.stockSelectionOverIndex')
        }
        briefs.push(narrative)
      }

      // Brief 4: Wisdom
      {
        let wisdom = ''
        if (vixVal != null && vixVal >= 30) {
          wisdom = `${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.extremeVolatility')} ${t('brief.priceLeadsSentiment')} ` +
            `S&P ${spyPrice || '—'}. ${t('brief.buyingVixSpikes')}`
        } else if (vixVal != null && vixVal <= 12) {
          wisdom = `${t('brief.vixAt')} ${vixVal.toFixed(1)} — ${t('brief.lowVolatilityComplacent')} ${t('brief.marketHumblesComplacent')}`
        } else if (isCalm && !isWeekend) {
          wisdom = `${t('brief.marketGivingTime')} ${t('brief.bestTradesFromWaiting')}`
        } else if (avg > 0.5 && avg < 2) {
          wisdom = `S&P ${spyPrice || '—'}. ${t('brief.steadyGrindHigher')}`
        } else if (avg < -0.5 && avg > -2) {
          wisdom = t('brief.pullbacksAsOpportunities')
        } else {
          wisdom = `${spyPrice ? `S&P ${spyPrice}. ` : ''}${t('brief.bestTradeNoTrade')}`
        }
        briefs.push(wisdom)
      }

      // Brief 5: Data-driven
      {
        const allGreen = spyCh > 0 && qqqCh > 0 && aaplCh > 0
        const allRed = spyCh < 0 && qqqCh < 0 && aaplCh < 0
        let macro = ''
        if (allGreen && avg > 1) {
          macro = `${t('brief.allMajorsGreen')} SPY +${spyCh.toFixed(1)}%, QQQ +${qqqCh.toFixed(1)}%, AAPL +${aaplCh.toFixed(1)}%. ` +
            `${vixVal != null && vixVal <= 14 ? `${t('brief.vixAt')} ${vixVal.toFixed(1)}.` : t('brief.institutionalConviction')}`
        } else if (allRed && avg < -1) {
          macro = `${t('brief.allMajorsRed')} SPY ${spyCh.toFixed(1)}%, QQQ ${qqqCh.toFixed(1)}%, AAPL ${aaplCh.toFixed(1)}%. ` +
            `${vixVal != null && vixVal >= 25 ? `${t('brief.vixAt')} ${vixVal.toFixed(1)}.` : t('brief.sellersInControl')}`
        } else if (allGreen) {
          macro = `SPY +${spyCh.toFixed(1)}%, QQQ +${qqqCh.toFixed(1)}%, AAPL +${aaplCh.toFixed(1)}%. ` +
            t('brief.steadyBidUnder')
        } else if (allRed) {
          macro = `SPY ${spyCh.toFixed(1)}%, QQQ ${qqqCh.toFixed(1)}%, AAPL ${aaplCh.toFixed(1)}%. ` +
            t('brief.distributionOrDigestion')
        } else {
          const winner = movers[0].ch > 0 ? movers[0] : null
          const loser = movers[2].ch < 0 ? movers[2] : null
          if (winner && loser) {
            macro = `${t('brief.mixedSignals')} ${winner.name} +${winner.ch.toFixed(1)}%, ${loser.name} ${loser.ch.toFixed(1)}%. ` +
              t('brief.sectorRotationInPlay')
          } else {
            macro = `SPY ${spyCh >= 0 ? '+' : ''}${spyCh.toFixed(1)}%, QQQ ${qqqCh >= 0 ? '+' : ''}${qqqCh.toFixed(1)}%, AAPL ${aaplCh >= 0 ? '+' : ''}${aaplCh.toFixed(1)}%. ` +
              t('brief.stockPickingOverIndex')
          }
        }
        briefs.push(macro)
      }

      return briefs
    }

    // ══ CRYPTO MODE BRIEFS (original) ══
    const btc = topCoinPrices?.BTC
    const eth = topCoinPrices?.ETH
    const sol = topCoinPrices?.SOL
    const fng = fearGreed.value
    const fngLabel = (fearGreed.classification || 'Neutral').toLowerCase()
    const btcPrice = btc?.price ? fmtPrice(btc.price) : null
    const btcCh = btc?.change != null ? Number(btc.change) : 0
    const ethCh = eth?.change != null ? Number(eth.change) : 0
    const solCh = sol?.change != null ? Number(sol.change) : 0
    const avg = (btcCh + ethCh + solCh) / 3

    // Time context
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay() // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isFriday = dayOfWeek === 5
    const isMonday = dayOfWeek === 1
    const isLateNight = hour >= 23 || hour < 5
    const isMorning = hour >= 5 && hour < 12
    const isAfternoon = hour >= 12 && hour < 17
    const dayName = [t('dayNames.sunday'), t('dayNames.monday'), t('dayNames.tuesday'), t('dayNames.wednesday'), t('dayNames.thursday'), t('dayNames.friday'), t('dayNames.saturday')][dayOfWeek]

    // Find the strongest mover
    const movers = [
      { name: 'BTC', ch: btcCh },
      { name: 'ETH', ch: ethCh },
      { name: 'SOL', ch: solCh },
    ].sort((a, b) => Math.abs(b.ch) - Math.abs(a.ch))
    const leader = movers[0]
    const laggard = movers[2]

    // Volatility context
    const maxMove = Math.max(Math.abs(btcCh), Math.abs(ethCh), Math.abs(solCh))
    const isVolatile = maxMove > 5
    const isCalm = maxMove < 1
    const isCrashing = avg < -5
    const isRallying = avg > 5
    const isBleeding = avg < -2 && avg > -5
    const isRecovering = avg > 0.5 && avg < 3 && fng != null && fng < 40
    const isDivergent = Math.abs(btcCh - solCh) > 4 || Math.abs(btcCh - ethCh) > 4

    // Collect all applicable briefs - each is context-aware
    const briefs = []

    // ═══ Brief 1: Classic sentiment + BTC anchor (always present) ═══
    {
      const parts = []
      if (fng != null) {
        if (fng <= 20) parts.push(t('brief.extremeFear'))
        else if (fng <= 35) parts.push(t('brief.fearInMarket'))
        else if (fng >= 80) parts.push(t('brief.extremeGreed'))
        else if (fng >= 65) parts.push(t('brief.greedBuilding'))
        else parts.push(t('brief.marketNeutral'))
      }
      if (btcPrice) {
        if (btcCh > 3) parts.push(`${t('brief.btcBreakingOut')} ${btcPrice}.`)
        else if (btcCh > 0) parts.push(`${t('brief.btcHolding')} ${btcPrice}.`)
        else if (btcCh < -3) parts.push(`${t('brief.btcUnderPressure')} ${btcPrice}.`)
        else parts.push(`${t('brief.btcSteady')} ${btcPrice}.`)
      }
      if (leader && Math.abs(leader.ch) > 2) {
        parts.push(`${leader.name} ${leader.ch > 0 ? t('brief.leadingUp') : t('brief.leadingDown')} ${Math.abs(leader.ch).toFixed(1)}%.`)
      }
      if (avg > 3) parts.push(t('brief.momentumReal'))
      else if (avg > 1) parts.push(t('brief.buyersStepping'))
      else if (avg < -3) parts.push(t('brief.capitulationSignals'))
      else if (avg < -1) parts.push(t('brief.weaknessAcrossBoard'))
      else parts.push(t('brief.rangeBoundPatience'))
      briefs.push(parts.join(' '))
    }

    // ═══ Brief 2: Time-of-day + market vibe ═══
    {
      let timePart = ''
      if (isWeekend && isCalm) timePart = `${dayName}. ${t('brief.thinWeekendLiquidity')}`
      else if (isWeekend && isVolatile) timePart = `${dayName}. ${t('brief.weekendMovesDeceptive')}`
      else if (isWeekend) timePart = `${dayName}. ${t('brief.thinWeekendLiquidity')}`
      else if (isFriday && isAfternoon) timePart = `${dayName}. ${t('brief.lockingInPositions')} ${t('brief.endOfWeekSqueezes')}`
      else if (isMonday && isMorning) timePart = `${dayName}. ${t('brief.freshCapitalEntering')}`
      else if (isLateNight) timePart = `${dayName}. ${t('brief.asianMarketsActive')}`
      else if (isMorning) timePart = `${dayName}. ${t('brief.europeanSessionOpen')}`
      else timePart = `${dayName}. ${t('brief.usSessionFullSwing')}`

      if (btcPrice) {
        if (avg > 2) timePart += ` BTC ${btcPrice}. ${t('brief.momentumUpside')}`
        else if (avg < -2) timePart += ` BTC ${btcPrice}. ${t('brief.rangeBoundPatience')}`
        else timePart += ` BTC ${btcPrice}. ${t('brief.marketsFindingEquilibrium')}`
      }
      briefs.push(timePart)
    }

    // ═══ Brief 3: Narrative / storytelling brief ═══
    {
      let narrative = ''
      if (isCrashing) {
        narrative = `${t('brief.bloodInWater')} ${Math.abs(avg).toFixed(1)}%. ` +
          `${fng != null && fng <= 25 ? t('brief.capitulationSignals') : t('brief.panicSellingExpensive')}`
      } else if (isRallying) {
        narrative = `${t('brief.marketOnFire')} ${leader.name} +${Math.abs(leader.ch).toFixed(1)}%. ` +
          `${fng != null && fng >= 75 ? t('brief.protectYourGains') : t('brief.momentumBuilding')}`
      } else if (isBleeding) {
        narrative = `${t('brief.grindLower')} ${Math.abs(avg).toFixed(1)}%. ${t('brief.hardestToNavigate')}`
      } else if (isRecovering) {
        narrative = `${t('brief.signsOfRecovery')} ${leader.name} +${leader.ch.toFixed(1)}%. ` +
          `${t('brief.sentimentNotCaughtUp')}`
      } else if (isDivergent) {
        const strong = movers[0]
        const weak = movers[2]
        narrative = `${strong.name} +${strong.ch.toFixed(1)}%, ${weak.name} ${weak.ch.toFixed(1)}%. ` +
          t('brief.rotationHappening')
      } else if (isCalm) {
        narrative = btcPrice
          ? `${t('brief.compression')} BTC ${btcPrice}, ${maxMove.toFixed(1)}%. ${t('brief.breakoutForming')}`
          : t('brief.calmBeforeMove')
      } else {
        narrative = btcPrice
          ? `BTC ${btcPrice}. ${t('brief.measuredMoves')}`
          : t('brief.measuredMoves')
      }
      briefs.push(narrative)
    }

    // ═══ Brief 4: Trader psychology / wisdom ═══
    {
      let wisdom = ''
      if (fng != null && fng <= 20) {
        wisdom = `${t('brief.othersAreFearful')} BTC ${btcPrice || '—'}. ${t('brief.extremeFear')}`
      } else if (fng != null && fng >= 80) {
        wisdom = t('brief.everyonesAGenius')
      } else if (isWeekend && isBleeding) {
        wisdom = `${t('brief.thinBooksAmplified')} ${dayName}. ${t('brief.weekendMovesDeceptive')}`
      } else if (isCalm && !isWeekend) {
        wisdom = `${t('brief.bestTradesFromWaiting')} ${t('brief.marketGivingTime')}`
      } else if (avg > 1 && avg < 3) {
        wisdom = `BTC ${btcPrice || '—'}. ${t('brief.steadyHandsCompound')}`
      } else if (avg < -1 && avg > -3) {
        wisdom = t('brief.tradingPlanOrEmotions')
      } else {
        wisdom = `${btcPrice ? `BTC ${btcPrice}. ` : ''}${t('brief.bestTradeNoTrade')}`
      }
      briefs.push(wisdom)
    }

    // ═══ Brief 5: Data-driven macro read ═══
    {
      const allGreen = btcCh > 0 && ethCh > 0 && solCh > 0
      const allRed = btcCh < 0 && ethCh < 0 && solCh < 0
      let macro = ''
      if (allGreen && avg > 2) {
        macro = `${t('brief.allMajorsGreen')} BTC +${btcCh.toFixed(1)}%, ETH +${ethCh.toFixed(1)}%, SOL +${solCh.toFixed(1)}%. ` +
          `${fng != null && fng > 60 ? t('brief.greedFueledRally') : `${t('brief.broadBasedStrength')} ${t('brief.healthyAccumulation')}`}`
      } else if (allRed && avg < -2) {
        macro = `${t('brief.allMajorsRed')} BTC ${btcCh.toFixed(1)}%, ETH ${ethCh.toFixed(1)}%, SOL ${solCh.toFixed(1)}%. ` +
          `${fng != null && fng < 30 ? `${t('brief.capitulationVibes')} ${t('brief.fearPeaksRelief')}` : t('brief.sellersInControl')}`
      } else if (allGreen) {
        macro = `BTC +${btcCh.toFixed(1)}%, ETH +${ethCh.toFixed(1)}%, SOL +${solCh.toFixed(1)}%. ` +
          t('brief.steadyBidUnder')
      } else if (allRed) {
        macro = `BTC ${btcCh.toFixed(1)}%, ETH ${ethCh.toFixed(1)}%, SOL ${solCh.toFixed(1)}%. ` +
          t('brief.distributionOrDigestion')
      } else {
        const winner = movers[0].ch > 0 ? movers[0] : null
        const loser = movers[2].ch < 0 ? movers[2] : null
        if (winner && loser) {
          macro = `${t('brief.mixedSignals')} ${winner.name} +${winner.ch.toFixed(1)}%, ${loser.name} ${loser.ch.toFixed(1)}%. ` +
            t('brief.sectorRotationOrIndecision')
        } else {
          macro = `BTC ${btcCh >= 0 ? '+' : ''}${btcCh.toFixed(1)}%, ETH ${ethCh >= 0 ? '+' : ''}${ethCh.toFixed(1)}%, SOL ${solCh >= 0 ? '+' : ''}${solCh.toFixed(1)}%. ` +
            t('brief.bestPlaySelective')
        }
      }
      briefs.push(macro)
    }

    return briefs
  }, [topCoinPrices, fearGreed.value, fearGreed.classification, isStocks, stockPrices, marketIndices, liveVix, fmtPrice, t])

  // First statement as default (for terminal mode backward compat)
  const theBriefStatement = theBriefStatements[0] || ''

  // ── Comprehensive AI Brief (6th slide: "AI Outlook") ──
  const [comprehensiveBrief, setComprehensiveBrief] = useState(null)
  const comprehensiveBriefTimerRef = useRef(null)

  const fetchComprehensiveBrief = useCallback(async () => {
    try {
      // Build marketData payload from available state
      const marketData = {}
      if (isStocks) {
        const spy = stockPrices?.SPY
        const qqq = stockPrices?.QQQ
        const aapl = stockPrices?.AAPL
        if (!spy?.price && !qqq?.price) return // Guard: need at least one anchor price
        if (spy)  marketData.spy  = { price: Number(spy.price),  change: Number(spy.change  || 0) }
        if (qqq)  marketData.qqq  = { price: Number(qqq.price),  change: Number(qqq.change  || 0) }
        if (aapl) marketData.aapl = { price: Number(aapl.price), change: Number(aapl.change || 0) }
        if (liveVix) marketData.vix = { price: liveVix.price, label: liveVix.label }
        if (macroAnalysisData?.bias) marketData.bias = macroAnalysisData.bias
      } else {
        const btc = topCoinPrices?.BTC
        const eth = topCoinPrices?.ETH
        const sol = topCoinPrices?.SOL
        if (!btc?.price) return // Guard: need BTC at minimum
        if (btc) marketData.btc = { price: Number(btc.price), change: Number(btc.change || 0) }
        if (eth) marketData.eth = { price: Number(eth.price), change: Number(eth.change || 0) }
        if (sol) marketData.sol = { price: Number(sol.price), change: Number(sol.change || 0) }
        if (fearGreed?.value != null) marketData.fearGreed = { value: fearGreed.value, classification: fearGreed.classification }
        if (macroAnalysisData?.bias) marketData.bias = macroAnalysisData.bias
      }
      // Include existing brief texts for LLM context
      marketData.existingBriefs = theBriefStatements.slice(0, 5)

      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketMode: isStocks ? 'stocks' : 'crypto', marketData, language: i18n.language || 'en' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data?.brief) setComprehensiveBrief(data.brief)
    } catch (err) {
      console.warn('Comprehensive brief fetch failed:', err.message)
    }
  }, [isStocks, topCoinPrices, stockPrices, liveVix, fearGreed, macroAnalysisData?.bias, theBriefStatements, i18n.language])

  useEffect(() => {
    // Initial fetch after 3s delay (let market data load)
    const initialTimer = setTimeout(() => {
      fetchComprehensiveBrief()
    }, 3000)
    // Re-fetch every 5 minutes
    comprehensiveBriefTimerRef.current = setInterval(fetchComprehensiveBrief, 5 * 60 * 1000)
    return () => {
      clearTimeout(initialTimer)
      if (comprehensiveBriefTimerRef.current) clearInterval(comprehensiveBriefTimerRef.current)
    }
  }, [fetchComprehensiveBrief])

  // Re-fetch when market mode changes
  useEffect(() => {
    setComprehensiveBrief(null) // Clear old brief on mode switch
    const t = setTimeout(fetchComprehensiveBrief, 1000)
    return () => clearTimeout(t)
  }, [isStocks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when language changes
  useEffect(() => {
    setComprehensiveBrief(null)
    const t = setTimeout(fetchComprehensiveBrief, 500)
    return () => clearTimeout(t)
  }, [i18n.language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge: 5 existing briefs + comprehensive AI Outlook as 6th
  const allBriefStatements = useMemo(() => {
    const base = [...theBriefStatements]
    if (comprehensiveBrief) base.push(comprehensiveBrief)
    return base
  }, [theBriefStatements, comprehensiveBrief])

  // ── Terminal AI Brief rotation state ──
  const BRIEF_INTERVAL = 12000
  const BRIEF_FULL_INTERVAL = 30000 // 30s for AI Outlook slide
  const BRIEF_FADE = 600
  const [briefIndex, setBriefIndex] = useState(0)
  const [briefFading, setBriefFading] = useState(false)
  const [briefDisplay, setBriefDisplay] = useState(allBriefStatements[0] || '')
  const briefTimerRef = useRef(null)
  const briefPausedRef = useRef(false)

  // Detect if current terminal brief is the full AI Outlook
  const terminalIsFullBrief = briefIndex === allBriefStatements.length - 1 && allBriefStatements.length >= 6

  // Get interval for current terminal brief index
  const getTerminalBriefInterval = useCallback((idx) => {
    if (idx === allBriefStatements.length - 1 && allBriefStatements.length >= 6) return BRIEF_FULL_INTERVAL
    return BRIEF_INTERVAL
  }, [allBriefStatements.length])

  // Sync display when statements content changes (e.g. prices load)
  useEffect(() => {
    if (allBriefStatements[briefIndex]) {
      setBriefDisplay(allBriefStatements[briefIndex])
    } else {
      setBriefIndex(0)
      setBriefDisplay(allBriefStatements[0] || '')
    }
  }, [allBriefStatements])

  const rotateBrief = useCallback(() => {
    if (allBriefStatements.length <= 1) return
    setBriefFading(true)
    setTimeout(() => {
      setBriefIndex(prev => {
        const next = (prev + 1) % allBriefStatements.length
        setBriefDisplay(allBriefStatements[next])
        return next
      })
      setTimeout(() => setBriefFading(false), 50)
    }, BRIEF_FADE)
  }, [allBriefStatements])

  // Auto-rotate with dynamic timing (setTimeout chain instead of setInterval)
  const scheduleBriefRotation = useCallback(() => {
    if (briefTimerRef.current) clearTimeout(briefTimerRef.current)
    if (allBriefStatements.length <= 1) return
    briefTimerRef.current = setTimeout(() => {
      if (!briefPausedRef.current) rotateBrief()
      setTimeout(() => scheduleBriefRotation(), BRIEF_FADE + 100)
    }, getTerminalBriefInterval(briefIndex))
  }, [briefIndex, allBriefStatements.length, rotateBrief, getTerminalBriefInterval])

  useEffect(() => {
    scheduleBriefRotation()
    return () => { if (briefTimerRef.current) clearTimeout(briefTimerRef.current) }
  }, [scheduleBriefRotation])

  const goToBrief = useCallback((idx) => {
    if (idx === briefIndex || briefFading) return
    if (briefTimerRef.current) { clearTimeout(briefTimerRef.current); briefTimerRef.current = null }
    setBriefFading(true)
    setTimeout(() => {
      setBriefIndex(idx)
      setBriefDisplay(allBriefStatements[idx])
      setTimeout(() => setBriefFading(false), 50)
    }, BRIEF_FADE)
  }, [briefIndex, briefFading, allBriefStatements])

  // ── Touch swipe support for terminal brief ──
  const briefTouchX = useRef(null)
  const briefTouchY = useRef(null)
  const handleBriefTouchStart = useCallback((e) => {
    briefTouchX.current = e.touches[0].clientX
    briefTouchY.current = e.touches[0].clientY
    briefPausedRef.current = true
  }, [])
  const handleBriefTouchEnd = useCallback((e) => {
    if (briefTouchX.current == null || allBriefStatements.length <= 1) {
      briefPausedRef.current = false
      return
    }
    const dx = e.changedTouches[0].clientX - briefTouchX.current
    const dy = e.changedTouches[0].clientY - briefTouchY.current
    briefTouchX.current = null
    briefTouchY.current = null
    briefPausedRef.current = false
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        goToBrief((briefIndex + 1) % allBriefStatements.length)
      } else {
        goToBrief((briefIndex - 1 + allBriefStatements.length) % allBriefStatements.length)
      }
    }
  }, [briefIndex, allBriefStatements.length, goToBrief])

  // ── TA / Reversal Analysis for Market Pulse ──
  const taAnalysis = useMemo(() => {
    const btc = topCoinPrices?.BTC
    const eth = topCoinPrices?.ETH
    const sol = topCoinPrices?.SOL
    const btcPrice = btc?.price ?? 0
    const ethPrice = eth?.price ?? 0
    const btcCh = btc?.change != null ? Number(btc.change) : 0
    const ethCh = eth?.change != null ? Number(eth.change) : 0
    const solCh = sol?.change != null ? Number(sol.change) : 0
    const fng = fearGreed.value
    const avgCh = (btcCh + ethCh + solCh) / 3

    // Simulated RSI based on 24h change magnitude (real RSI needs 14 candles)
    const btcRsi = Math.max(5, Math.min(95, 50 + btcCh * 3.2))
    const ethRsi = Math.max(5, Math.min(95, 50 + ethCh * 3.2))

    // Market structure text
    let structureText = ''
    if (avgCh < -5) structureText = 'Capitulation phase — watch for volume climax and reversal candles'
    else if (avgCh < -2) structureText = 'Corrective move — key supports being tested across majors'
    else if (avgCh > 5) structureText = 'Momentum rally — trailing stops recommended, watch for blow-off top'
    else if (avgCh > 2) structureText = 'Uptrend intact — dips to support are buying opportunities'
    else structureText = 'Range-bound — wait for breakout above resistance or break below support'

    // ── Build rotating signals array ──
    const signals = []

    // 1. Reversal Signal (always present — primary signal)
    if (btcRsi <= 20 && fng != null && fng <= 15) {
      signals.push({ type: 'oversold', strength: 'extreme', icon: TA_SIGNAL_ICONS.reversalDown, label: 'Extreme Oversold', detail: `BTC RSI near historical lows (${btcRsi.toFixed(0)}). Fear & Greed at ${fng} — last time this low, BTC rallied 40%+ within weeks.`, color: 'green' })
    } else if (btcRsi <= 30 || (fng != null && fng <= 20)) {
      signals.push({ type: 'oversold', strength: 'strong', icon: TA_SIGNAL_ICONS.reversalDown, label: 'Oversold Signal', detail: `BTC RSI at ${btcRsi.toFixed(0)} with Fear & Greed at ${fng ?? '—'}. Historically a high-probability accumulation zone.`, color: 'green' })
    } else if (btcRsi <= 40 && avgCh < -3) {
      signals.push({ type: 'oversold', strength: 'moderate', icon: TA_SIGNAL_ICONS.reversalDown, label: 'Approaching Oversold', detail: `Market pullback accelerating. BTC RSI ${btcRsi.toFixed(0)} trending toward oversold territory.`, color: 'green' })
    } else if (btcRsi >= 80 && fng != null && fng >= 80) {
      signals.push({ type: 'overbought', strength: 'extreme', icon: TA_SIGNAL_ICONS.reversalUp, label: 'Extreme Overbought', detail: `BTC RSI at ${btcRsi.toFixed(0)} with Greed at ${fng}. Historically precedes 15-25% corrections.`, color: 'red' })
    } else if (btcRsi >= 70 || (fng != null && fng >= 75)) {
      signals.push({ type: 'overbought', strength: 'strong', icon: TA_SIGNAL_ICONS.reversalUp, label: 'Overbought Signal', detail: `BTC RSI at ${btcRsi.toFixed(0)} entering overbought zone. Consider taking partial profits.`, color: 'red' })
    } else if (btcRsi >= 60 && avgCh > 3) {
      signals.push({ type: 'overbought', strength: 'moderate', icon: TA_SIGNAL_ICONS.reversalUp, label: 'Extended Rally', detail: `Strong momentum but approaching resistance. RSI ${btcRsi.toFixed(0)} — watch for exhaustion signals.`, color: 'red' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.neutral, label: 'No Reversal Signal', detail: structureText, color: 'neutral' })
    }

    // 2. Momentum Signal
    if (avgCh < -5) {
      signals.push({ type: 'oversold', strength: 'strong', icon: TA_SIGNAL_ICONS.momentum, label: 'Momentum Collapse', detail: `Average major down ${Math.abs(avgCh).toFixed(1)}%. Selling pressure across all majors — capitulation volume likely. Watch for exhaustion wick.`, color: 'red' })
    } else if (avgCh < -2) {
      signals.push({ type: 'oversold', strength: 'moderate', icon: TA_SIGNAL_ICONS.momentum, label: 'Bearish Momentum', detail: `Majors averaging ${avgCh.toFixed(1)}% decline. Momentum favoring sellers — wait for stabilization before entries.`, color: 'red' })
    } else if (avgCh > 5) {
      signals.push({ type: 'overbought', strength: 'strong', icon: TA_SIGNAL_ICONS.momentum, label: 'Parabolic Move', detail: `Average gain ${avgCh.toFixed(1)}% across majors. Momentum is extreme — use trailing stops, don't chase.`, color: 'green' })
    } else if (avgCh > 2) {
      signals.push({ type: 'overbought', strength: 'moderate', icon: TA_SIGNAL_ICONS.momentum, label: 'Bullish Momentum', detail: `Solid upward momentum at +${avgCh.toFixed(1)}% average. Trend continuation likely — buy dips, hold positions.`, color: 'green' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.momentum, label: 'Flat Momentum', detail: `Market moving sideways. Average change ${avgCh >= 0 ? '+' : ''}${avgCh.toFixed(1)}% — no clear directional bias. Range trading conditions.`, color: 'neutral' })
    }

    // 3. Volatility Assessment
    const volMag = Math.abs(avgCh)
    if (volMag > 6) {
      signals.push({ type: volMag > 0 ? 'overbought' : 'oversold', strength: 'strong', icon: TA_SIGNAL_ICONS.volatility, label: 'High Volatility', detail: `Average move ${volMag.toFixed(1)}% — extreme volatility. Reduce position sizes, widen stops. Not ideal for new entries.`, color: 'red' })
    } else if (volMag > 3) {
      signals.push({ type: 'neutral', strength: 'moderate', icon: TA_SIGNAL_ICONS.volatility, label: 'Elevated Volatility', detail: `Volatility above normal at ${volMag.toFixed(1)}% average swing. Opportunity for momentum trades with tight risk management.`, color: 'amber' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.volatility, label: 'Low Volatility', detail: `Compression phase — ${volMag.toFixed(1)}% average move. Historically precedes explosive breakouts. Set alerts at key levels.`, color: 'neutral' })
    }

    // 4. BTC-ETH Correlation
    const chDiff = Math.abs(btcCh - ethCh)
    if (chDiff > 4) {
      const leader = Math.abs(btcCh) > Math.abs(ethCh) ? 'BTC' : 'ETH'
      const lag = leader === 'BTC' ? 'ETH' : 'BTC'
      signals.push({ type: 'neutral', strength: 'moderate', icon: TA_SIGNAL_ICONS.correlation, label: 'Decoupling Detected', detail: `${leader} moving independently (${chDiff.toFixed(1)}% gap). ${lag} may catch up — watch for convergence trade opportunity.`, color: 'amber' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.correlation, label: 'High Correlation', detail: `BTC & ETH moving in lockstep (${chDiff.toFixed(1)}% gap). Market trading as a bloc — BTC leads direction.`, color: 'neutral' })
    }

    // 5. Fear & Greed Context
    if (fng != null) {
      if (fng <= 15) {
        signals.push({ type: 'oversold', strength: 'extreme', icon: TA_SIGNAL_ICONS.sentiment, label: 'Extreme Fear', detail: `Fear & Greed at ${fng} — extreme fear zone. Historically, buying when FNG < 15 yielded 40%+ returns over 90 days in 83% of cases.`, color: 'green' })
      } else if (fng <= 30) {
        signals.push({ type: 'oversold', strength: 'strong', icon: TA_SIGNAL_ICONS.sentiment, label: 'Fear Zone', detail: `Sentiment at ${fng} — high fear. Smart money typically accumulates here. "Be greedy when others are fearful."`, color: 'green' })
      } else if (fng >= 80) {
        signals.push({ type: 'overbought', strength: 'extreme', icon: TA_SIGNAL_ICONS.sentiment, label: 'Extreme Greed', detail: `Greed index at ${fng} — euphoria zone. Historically precedes corrections. Consider taking profits and tightening stops.`, color: 'red' })
      } else if (fng >= 65) {
        signals.push({ type: 'overbought', strength: 'moderate', icon: TA_SIGNAL_ICONS.sentiment, label: 'Greed Rising', detail: `Sentiment at ${fng} — greed building. Trend is your friend but stay vigilant for reversal signs. Don't overleverage.`, color: 'amber' })
      } else {
        signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.sentiment, label: 'Neutral Sentiment', detail: `Fear & Greed at ${fng} — balanced sentiment. No crowd extremes to fade — trade based on technicals and structure.`, color: 'neutral' })
      }
    }

    // 6. Dominance Shift
    const btcDom = marketDominance.btc
    if (btcDom > 58) {
      signals.push({ type: 'neutral', strength: 'strong', icon: TA_SIGNAL_ICONS.dominance, label: t('ui.btcDominant'), detail: t('ui.btcDomDetail', { val: btcDom.toFixed(1) }), color: 'amber' })
    } else if (btcDom < 48) {
      signals.push({ type: 'neutral', strength: 'strong', icon: TA_SIGNAL_ICONS.dominance, label: t('ui.altSeasonSignal'), detail: t('ui.altSeasonDetail', { val: btcDom.toFixed(1) }), color: 'green' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.dominance, label: t('ui.balancedMarket'), detail: t('ui.balancedMarketDetail', { val: btcDom.toFixed(1) }), color: 'neutral' })
    }

    // 7. Funding & Leverage
    const fundRate = marketStructureTrio.funding[0].rate
    const fundRateStr = fundRate.toFixed(4)
    if (fundRate > 0.05) {
      signals.push({ type: 'overbought', strength: 'moderate', icon: TA_SIGNAL_ICONS.funding, label: t('ui.highFunding'), detail: t('ui.highFundingDetail', { rate: fundRateStr }), color: 'red' })
    } else if (fundRate < -0.01) {
      signals.push({ type: 'oversold', strength: 'moderate', icon: TA_SIGNAL_ICONS.funding, label: t('ui.negativeFunding'), detail: t('ui.negativeFundingDetail', { rate: fundRateStr }), color: 'green' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.funding, label: t('ui.neutralFunding'), detail: t('ui.neutralFundingDetail', { rate: `${fundRate >= 0 ? '+' : ''}${fundRateStr}` }), color: 'neutral' })
    }

    // 8. Whale Activity
    const whaleNet = marketStructureTrio.whaleFlows.net
    if (whaleNet < -80) {
      signals.push({ type: 'oversold', strength: 'strong', icon: TA_SIGNAL_ICONS.whale, label: 'Whale Distribution', detail: `Net whale outflow ${currencySymbol}${Math.abs(whaleNet)}M — large holders reducing exposure. Distribution phase typically precedes further downside.`, color: 'red' })
    } else if (whaleNet > 80) {
      signals.push({ type: 'overbought', strength: 'strong', icon: TA_SIGNAL_ICONS.whale, label: 'Whale Accumulation', detail: `Net whale inflow +${currencySymbol}${whaleNet}M — large holders buying aggressively. Smart money accumulation is a leading bullish indicator.`, color: 'green' })
    } else {
      signals.push({ type: 'neutral', strength: 'none', icon: TA_SIGNAL_ICONS.whale, label: 'Whale Neutral', detail: `Whale net flow ${currencySymbol}${whaleNet > 0 ? '+' : ''}${whaleNet}M — no strong directional signal from large holders. Watch for breakout in either direction.`, color: 'neutral' })
    }

    return {
      btcRsi, ethRsi, structureText, btcPrice, ethPrice, avgCh,
      taSignals: signals
    }
  }, [topCoinPrices, fearGreed.value, marketDominance.btc, marketStructureTrio, currencySymbol])

  const openTopCoinInfo = (symbol, e) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    topCoinInfoAnchorRef.current = { top: rect.bottom + 4, left: rect.left }
    setTopCoinInfoOpen(symbol)
  }
  const closeTopCoinInfo = () => setTopCoinInfoOpen(null)
  const topCoinInfoPopoverRef = useRef(null)
  useEffect(() => {
    if (!topCoinInfoOpen) return
    const onMouseDown = (e) => {
      const pop = topCoinInfoPopoverRef.current
      if (pop && !pop.contains(e.target) && !e.target.closest('.welcome-topcoin-info-btn')) closeTopCoinInfo()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [topCoinInfoOpen])

  const formatWatchlistChange = (change) => {
    const c = typeof change === 'number' ? change : parseFloat(change)
    if (isNaN(c) || !isFinite(c)) return '+0.00%'
    // Change values from Codex API are already percentages, use directly
    return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`
  }
  const formatWatchlistMcap = (mcap) => {
    return fmtLarge(mcap)
  }

  const getSortedWatchlist = useCallback(() => {
    // For stocks mode, filter and enhance watchlist with stock prices
    let list = []
    if (isStocks) {
      const stockItems = watchlist.filter(t => t.isStock)
      list = stockItems.map(t => {
        const liveData = stockPrices?.[t.symbol]
        return {
          ...t,
          price: liveData?.price ?? t.price ?? 0,
          change: liveData?.change ?? t.change ?? 0,
          marketCap: liveData?.marketCap ?? t.marketCap ?? 0,
          volume: liveData?.volume ?? t.volume ?? 0,
          name: liveData?.name || t.name || t.symbol,
          logo: getStockLogo(t.symbol, t.sector),
        }
      })
    } else {
      list = watchlistWithLiveData
    }
    if (!list.length) return []
    const pinned = list.filter((t) => t.pinned)
    let unpinned = list.filter((t) => !t.pinned)
    switch (watchlistSort) {
      case 'priceChangeDesc':
        unpinned = [...unpinned].sort((a, b) => {
          const ac = Math.abs(a.change || 0) < 1 ? (a.change || 0) * 100 : (a.change || 0)
          const bc = Math.abs(b.change || 0) < 1 ? (b.change || 0) * 100 : (b.change || 0)
          return bc - ac
        })
        break
      case 'priceChangeAsc':
        unpinned = [...unpinned].sort((a, b) => {
          const ac = Math.abs(a.change || 0) < 1 ? (a.change || 0) * 100 : (a.change || 0)
          const bc = Math.abs(b.change || 0) < 1 ? (b.change || 0) * 100 : (b.change || 0)
          return ac - bc
        })
        break
      case 'marketCapDesc':
        unpinned = [...unpinned].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
        break
      case 'marketCapAsc':
        unpinned = [...unpinned].sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0))
        break
      default:
        break
    }
    return [...pinned, ...unpinned]
  }, [isStocks, watchlist, watchlistWithLiveData, stockPrices, watchlistSort])

  const [watchlistPickerOpen, setWatchlistPickerOpen] = useState(false)

  const watchlistSortOptions = [
    { value: 'default', label: 'Main Order', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg> },
    { value: 'priceChangeDesc', label: 'Price Change ↓', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg> },
    { value: 'priceChangeAsc', label: 'Price Change ↑', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l6 6 4-4 8 8" /><path d="M21 11v7h-7" /></svg> },
    { value: 'marketCapDesc', label: 'Market Cap ↓', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" /></svg> },
    { value: 'marketCapAsc', label: 'Market Cap ↑', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg> },
  ]

  const handleWatchlistDragStart = (e, index, item) => {
    setDraggedItem({ index, item })
    if (e.target) e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleWatchlistDragEnter = (e, index) => {
    if (draggedItem === null) return
    if (index !== draggedItem.index) setDragOverItem(index)
  }
  const handleWatchlistDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleWatchlistDragEnd = (e) => {
    if (e.target) e.target.classList.remove('dragging')
    if (draggedItem !== null && dragOverItem !== null && draggedItem.index !== dragOverItem) {
      const sorted = getSortedWatchlist()
      const newList = [...sorted]
      const [removed] = newList.splice(draggedItem.index, 1)
      newList.splice(dragOverItem, 0, removed)
      reorderWatchlist(newList)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const sortedWatchlist = getSortedWatchlist()

  const getNetworkName = (networkId) => {
    const map = {
      1: 'Ethereum',
      56: 'BNB Chain',
      1399811149: 'Solana',
      42161: 'Arbitrum',
      10: 'Optimism',
      137: 'Polygon',
      8453: 'Base',
      43114: 'Avalanche',
    }
    return map[networkId] ?? 'Unknown'
  }

  const buildTokensFromPrices = useCallback((priceMap) => {
    if (!priceMap || typeof priceMap !== 'object') return []
    return TOP_COINS.map((coin, index) => {
      const data = priceMap[coin.symbol]
      const price = data?.price != null ? Number(data.price) : 0
      const change = data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : 0)
      const volume = data?.volume != null ? Number(data.volume) : 0
      const marketCap = data?.marketCap != null ? Number(data.marketCap) : 0
      const liquidity = data?.liquidity != null ? Number(data.liquidity) : 0
      const change1h = data?.change1h != null ? Number(data.change1h) : 0
      const change7d = data?.change7d != null ? Number(data.change7d) : 0
      const change30d = data?.change30d != null ? Number(data.change30d) : 0
      const change1y = data?.change1y != null ? Number(data.change1y) : 0
      return {
        rank: index + 1,
        symbol: coin.symbol,
        name: coin.name,
        address: coin.address,
        networkId: coin.networkId,
        network: getNetworkName(coin.networkId),
        logo: TOKEN_LOGOS[coin.symbol] || null,
        price: Number.isFinite(price) ? price : 0,
        change: Number.isFinite(change) ? change : 0,
        change1h: Number.isFinite(change1h) ? change1h : 0,
        change7d: Number.isFinite(change7d) ? change7d : 0,
        change30d: Number.isFinite(change30d) ? change30d : 0,
        change1y: Number.isFinite(change1y) ? change1y : 0,
        volume: Number.isFinite(volume) ? volume : 0,
        marketCap: Number.isFinite(marketCap) ? marketCap : 0,
        liquidity: Number.isFinite(liquidity) ? liquidity : 0,
        holders: 0,
        age: '—',
      }
    })
  }, [])

  // Update Discover list when prices arrive (Codex API) – used for welcome widget / fallback
  // Only update if prices actually changed to prevent re-render / spinning every 5s
  const prevTokenPricesRef = useRef('')
  useEffect(() => {
    const newTokens = buildTokensFromPrices(topCoinPrices || {});
    // Create a lightweight fingerprint of current prices to compare
    const fingerprint = newTokens.map(t => `${t.symbol}:${t.price}:${t.change}`).join('|')
    if (fingerprint !== prevTokenPricesRef.current) {
      prevTokenPricesRef.current = fingerprint
      setTokens(newTokens);
    }
    setLoading(false);
  }, [topCoinPrices, buildTokensFromPrices])

  // Top Coins tab: fetch current page from CoinGecko (top 1000, 25 per page)
  useEffect(() => {
    if (topSectionTab !== 'topcoins' || isStocks) return
    let cancelled = false
    setTopCoinsLoading(true)
    getTopCoinsMarketsPage(topCoinsPage, TOP_COINS_PAGE_SIZE)
      .then((markets) => {
        if (cancelled) return
        const baseRank = (topCoinsPage - 1) * TOP_COINS_PAGE_SIZE
        const list = (markets || []).map((coin, index) => ({
          rank: (coin.market_cap_rank != null ? coin.market_cap_rank : baseRank + index + 1),
          symbol: (coin.symbol || '').toUpperCase(),
          name: coin.name || coin.symbol || '',
          address: null,
          networkId: 1,
          network: getNetworkName(1),
          logo: coin.image || TOKEN_LOGOS[(coin.symbol || '').toUpperCase()] || null,
          price: Number(coin.current_price) || 0,
          change: Number(coin.price_change_percentage_24h) || 0,
          change1h: Number(coin.price_change_percentage_1h_in_currency) || 0,
          change7d: Number(coin.price_change_percentage_7d_in_currency) || 0,
          change30d: Number(coin.price_change_percentage_30d_in_currency) || 0,
          change1y: 0,
          volume: Number(coin.total_volume) || 0,
          marketCap: Number(coin.market_cap) || 0,
          liquidity: Number(coin.total_volume) || 0,
          holders: 0,
          age: '—',
          sparkline_7d: Array.isArray(coin.sparkline_in_7d?.price) ? coin.sparkline_in_7d.price : null,
        }))
        setTopCoinsTokens(list)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Top Coins page fetch failed:', err)
          setTopCoinsTokens([])
        }
      })
      .finally(() => {
        if (!cancelled) setTopCoinsLoading(false)
      })
    return () => { cancelled = true }
  }, [topSectionTab, topCoinsPage, isStocks])

  const getTokenLogo = (symbol) => TOKEN_LOGOS[symbol?.toUpperCase()] || null

  // Chart pull-up overlay panel (below Discover): shows selected top coin / token chart
  const [chartPanelToken, setChartPanelToken] = useState(null)
  const [chartOverlayTimeframe, setChartOverlayTimeframe] = useState('1h')
  const [chartOverlaySubTab, setChartOverlaySubTab] = useState('line') // 'candles' | 'line' | 'tradingview'
  const [chartOverlayYAxis, setChartOverlayYAxis] = useState('price') // 'price' | 'mcap'
  const [chartFullscreen, setChartFullscreen] = useState(false) // Fullscreen state for embedded chart
  const OVERLAY_TIMEFRAMES = [
    { id: '1m', label: '1m' },
    { id: '30m', label: '30m' },
    { id: '1h', label: '1h' },
    { id: '1d', label: '1d' },
    { id: 'all', label: t('topSection.allTime') },
    { id: '24h', label: '24h' },
    { id: '1w', label: '1w' },
    { id: '7d', label: '7d' },
    { id: '30d', label: '30d' },
  ]

  // 3-card popup: History | Live | Predictions
  const [tokenCardPopup, setTokenCardPopup] = useState(null)
  const [tokenCardExpandedCard, setTokenCardExpandedCard] = useState(null) // 'history' | 'live' | 'predictions' | null
  // On-Chain row/card: when tabs OFF → go straight to AI Screener; when tabs ON → open inline chart
  const buildOnChainTokenPayload = (row) => {
    const coin = TOP_COINS.find((c) => c.symbol === row.symbol)
    return {
      symbol: row.symbol,
      name: row.name || row.symbol,
      address: row.address || coin?.address || null,
      networkId: row.networkId ?? coin?.networkId ?? 1,
      price: row.price,
      change: row.change24h ?? 0,
      logo: TOKEN_LOGOS[row.symbol] || null,
    }
  }
  /** On-chain: when mobile OR tab OFF → AI Screener; when tab ON (desktop) → inline chart. */
  const handleOnChainCoinClick = (row) => {
    const payload = buildOnChainTokenPayload(row)
    // On mobile: ALWAYS navigate to AI Screener (no inline panels)
    // On desktop: navigate when tabs OFF
    if ((isMobile || !tabsOn) && onOpenAIScreener) {
      onOpenAIScreener(payload)
      return
    }
    setChartPanelToken(payload)
    setChartOverlayTimeframe('24h')
    setChartOverlaySubTab('screener')
  }

  /** Top Coins: when mobile OR tabs OFF → Research Zone; when tabs ON (desktop) → inline chart panel */
  const handleTopCoinClick = (token) => {
    if (!token?.symbol) return
    const data = topCoinPrices?.[token.symbol] ?? topCoinPrices?.[token.symbol?.toUpperCase?.()]
    const payload = {
      symbol: token.symbol,
      name: token.name || token.symbol,
      address: token.address,
      networkId: token.networkId,
      price: token.price,
      change: token.change,
      logo: token.logo || TOKEN_LOGOS[token.symbol],
      sparkline_7d: token.sparkline_7d ?? data?.sparkline_7d ?? null,
    }
    // On mobile: ALWAYS navigate to Research Zone (no inline panels on mobile)
    // On desktop: navigate when tabs OFF
    if ((isMobile || !tabsOn) && onOpenResearchZone) {
      onOpenResearchZone(payload)
      return
    }
    // Otherwise open inline chart panel (desktop with tabs ON only)
    openChartOnly(token)
  }

  /** Stocks: handle stock click - open Research Zone */
  const handleStockClick = (stock) => {
    if (!stock?.symbol) return
    const data = stockPrices?.[stock.symbol]
    const payload = {
      symbol: stock.symbol,
      name: stock.name || stock.symbol,
      price: data?.price || stock.price || 0,
      change: data?.change || stock.change || 0,
      logo: getStockLogo(stock.symbol, stock.sector),
      type: 'stock',
      isStock: true,
      sector: stock.sector || data?.sector,
      exchange: stock.exchange || data?.exchange,
      marketCap: data?.marketCap,
      pe: data?.pe,
    }
    if (onOpenResearchZone) {
      onOpenResearchZone(payload)
    }
  }

  /** Top Coins: open chart on right only, no 3-card popup */
  const openChartOnly = (token) => {
    if (!token?.symbol) return
    const data = topCoinPrices?.[token.symbol] ?? topCoinPrices?.[token.symbol?.toUpperCase?.()]
    const payload = {
      symbol: token.symbol,
      name: token.name || token.symbol,
      address: token.address,
      networkId: token.networkId,
      price: token.price,
      change: token.change,
      logo: token.logo || TOKEN_LOGOS[token.symbol],
      sparkline_7d: token.sparkline_7d ?? data?.sparkline_7d ?? null,
    }
    setChartPanelToken(payload)
    setChartOverlayTimeframe('24h')
    setChartOverlaySubTab('tradingview')
    addTokenTab(payload)
    setActiveDiscoverTab(payload.symbol)
  }

  // ESC key to exit chart fullscreen
  useEffect(() => {
    if (!chartFullscreen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') setChartFullscreen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [chartFullscreen])

  // Reset fullscreen when chart panel closes
  useEffect(() => {
    if (!chartPanelToken) setChartFullscreen(false)
  }, [chartPanelToken])

  // When Monarch Chat requested a chart, open it once WelcomePage is ready
  useEffect(() => {
    if (!pendingChartToken || typeof setPendingChartToken !== 'function') return
    setTopSectionTab('topcoins')
    setTabsOn(true)
    if (pendingChartToken && typeof pendingChartToken === 'object' && pendingChartToken.symbol) {
      openChartOnly(pendingChartToken)
    } else {
      const sym = (pendingChartToken || '').toString().toUpperCase()
      const coin = TOP_COINS.find((c) => c.symbol === sym)
      if (coin) {
        const data = topCoinPrices?.[sym] ?? topCoinPrices?.[coin.symbol]
        openChartOnly({
          ...coin,
          price: data?.price != null ? Number(data.price) : coin.price,
          change: data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : coin.change),
          logo: coin.logo || TOKEN_LOGOS[coin.symbol],
          sparkline_7d: data?.sparkline_7d ?? coin.sparkline_7d,
        })
      }
    }
    setPendingChartToken(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when pendingChartToken is set
  }, [pendingChartToken, setPendingChartToken])

  const openTokenCardPopup = (tokenOrSymbol, overlayOnly = false) => {
    let payload = null
    if (typeof tokenOrSymbol === 'string') {
      // Welcome widget click (e.g. BTC, SOL, ETH): show Past/Present/Future 3-card popup
      const symbol = (tokenOrSymbol && String(tokenOrSymbol).toUpperCase()) || tokenOrSymbol
      const coin = TOP_COINS.find((c) => c.symbol === symbol)
      const data = topCoinPrices?.[symbol] ?? topCoinPrices?.[symbol?.toUpperCase?.()]
      payload = {
        symbol,
        name: coin?.name || symbol,
        address: coin?.address,
        networkId: coin?.networkId,
        price: data?.price != null ? Number(data.price) : null,
        change: data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : null),
        logo: TOKEN_LOGOS[symbol] ?? TOKEN_LOGOS[symbol?.toUpperCase?.()],
        sparkline_7d: data?.sparkline_7d ?? null,
      }
      setTokenCardPopup(payload)
    } else if (tokenOrSymbol && tokenOrSymbol.symbol) {
      const data = topCoinPrices?.[tokenOrSymbol.symbol] ?? topCoinPrices?.[tokenOrSymbol.symbol?.toUpperCase?.()]
      payload = {
        symbol: tokenOrSymbol.symbol,
        name: tokenOrSymbol.name || tokenOrSymbol.symbol,
        address: tokenOrSymbol.address,
        networkId: tokenOrSymbol.networkId,
        price: tokenOrSymbol.price,
        change: tokenOrSymbol.change,
        logo: tokenOrSymbol.logo || TOKEN_LOGOS[tokenOrSymbol.symbol],
        sparkline_7d: tokenOrSymbol.sparkline_7d ?? data?.sparkline_7d ?? null,
      }
      setTokenCardPopup(payload)
      setChartPanelToken(payload)
      setChartOverlayTimeframe('24h')
      setChartOverlaySubTab('tradingview')
      addTokenTab(payload)
      setActiveDiscoverTab(payload.symbol)
    }
  }
  const closeTokenCardPopup = () => {
    setTokenCardExpandedCard(null)
    setTokenCardPopup(null)
  }

  // Mock prediction outcomes for popup (target, date, probability, up)
  const getTokenPredictions = (symbol, price) => {
    const p = price && Number(price) > 0 ? Number(price) : 100
    return [
      { target: p * 1.25, date: 'Mar 31', prob: 55, up: true },
      { target: p * 1.5, date: 'Jun 30', prob: 34, up: true },
      { target: p * 0.75, date: 'Mar 31', prob: 22, up: false },
    ]
  }

  // Sparkline points for history card: real-time direction (up/down). Use real sparkline_7d when available; else synthetic curve from price + change.
  const getHistorySparkline = (price, change, realSparkline = null) => {
    if (realSparkline && Array.isArray(realSparkline) && realSparkline.length > 0) {
      return realSparkline.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
    }
    if (price == null || !Number(price)) return []
    const p = Number(price)
    const ch = change != null ? Number(change) / 100 : 0
    const isUp = ch >= 0
    const low = p * (1 + Math.min(0, ch) - 0.03)
    const high = p * (1 + Math.max(0, ch) + 0.02)
    const range = high - low
    const n = 7
    const t = (i) => i / (n - 1)
    const curve = isUp ? [0.15, 0.3, 0.4, 0.55, 0.7, 0.85, 1] : [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1]
    return curve.map((v) => low + range * v)
  }

  const handleSelectToken = (token) => {
    selectToken({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      networkId: token.networkId,
      price: token.price,
      change: token.change,
      logo: token.logo,
    })
  }

  const formatChange = (change) => {
    const value = typeof change === 'number' ? change : parseFloat(change) || 0
    // Change values from Codex API are already converted to percentages in codexApi.js
    // So just format the number directly
    return value.toFixed(2)
  }

  const getTradingViewSymbol = (symbolOrToken) => {
    const token = typeof symbolOrToken === 'string'
      ? { symbol: symbolOrToken }
      : (symbolOrToken || {})
    const { symbol: resolved } = resolveTradingViewSymbol(token, isStocks ? 'stocks' : 'crypto')
    return resolved || `CRYPTO:${(token.symbol || '').toUpperCase()}USD`
  }

  // Generate sparkline data based on price change direction (deterministic – no animation)
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

  // Sparkline SVG component — memoized to prevent re-renders when parent updates
  const Sparkline = React.memo(({ data, positive }) => {
    const width = 60
    const height = 24
    const padding = 2
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    const color = positive ? '#10B981' : '#EF4444'

    return (
      <svg width={width} height={height} className="sparkline">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    )
  })

  const getTokenInitials = (symbol) => symbol?.slice(0, 2).toUpperCase() || '??'

  // Stable empty style object — avoids creating new {} on every render in .map() loops
  const EMPTY_STYLE = useMemo(() => ({}), [])

  // Local fallback for isInWatchlist if not provided as prop
  const checkIsInWatchlist = isInWatchlist || ((token) => !!watchlist?.some((w) => (w.symbol || '').toUpperCase() === (token?.symbol || '').toUpperCase() || (w.address || '') === (token?.address || '')))

  // SVG Icons
  const icons = {
    trending: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    whale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    volume: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    listing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    liquidation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    breakout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    transfer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    pause: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
    play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>,
    search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    compare: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    portfolio: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    // Market AI toolbar
    aiAnalysis: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    news: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    heatmap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    sector: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    mindshare: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    flows: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    wallets: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    // Discover / toolbar (tabs row, networks, timeframe)
    tabs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 016 20.25H3.75A2.25 2.25 0 011.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    discover: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    tokenTab: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    network: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    timeframe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    heartFilled: <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  }

  const marketAiTabIcons = {
    brief: icons.ai || '✦',
    analysis: icons.aiAnalysis,
    news: icons.news,
    heatmaps: icons.heatmap,
    liquidation: icons.liquidation,
    sector: icons.sector,
    mindshare: icons.mindshare,
    calendar: icons.calendar,
    flows: icons.flows,
    wallets: icons.portfolio,
  }

  const getActivityIcon = (type) => icons[type] || icons.trending

  // Filter tokens based on category and timeframe (used for welcome widget / fallback)
  const filteredTokens = useMemo(() => {
    let filtered = [...tokens]
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(token => {
        const sym = (token.symbol || '').toUpperCase()
        return TOKEN_CATEGORY[sym] === categoryFilter
      })
    }
    if (timeframeFilter !== 'all') {
      filtered = filtered.filter(token => {
        const change = token.change || 0
        switch (timeframeFilter) {
          case '1h': return Math.abs(change) > 5
          case '24h': return true
          case '1w':
          case '7d': return change > 0
          case '30d': return change > 10
          default: return true
        }
      })
    }
    return filtered
  }, [tokens, categoryFilter, timeframeFilter])

  // Top Coins/Stocks tab: filter current page results by category and timeframe
  const filteredTopCoins = useMemo(() => {
    // For stocks mode, use TOP_STOCKS with live prices
    if (isStocks) {
      return TOP_STOCKS.map((stock, index) => {
        const priceData = stockPrices?.[stock.symbol]
        return {
          ...stock,
          rank: index + 1,
          logo: getStockLogo(stock.symbol, stock.sector),
          price: priceData?.price || 0,
          change: priceData?.change || 0,
          marketCap: priceData?.marketCap || 0,
          volume: priceData?.volume || 0,
          pe: priceData?.pe,
          eps: priceData?.eps,
          type: 'stock',
        }
      }).filter(stock => {
        // Filter by sector if category filter is set
        if (categoryFilter !== 'all') {
          return (stock.sector || '').toLowerCase() === categoryFilter.toLowerCase()
        }
        return true
      })
    }

    // Crypto mode - existing logic
    let filtered = [...topCoinsTokens]
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(token => {
        const sym = (token.symbol || '').toUpperCase()
        return TOKEN_CATEGORY[sym] === categoryFilter
      })
    }
    if (timeframeFilter !== 'all') {
      filtered = filtered.filter(token => {
        const change = token.change || 0
        switch (timeframeFilter) {
          case '1h': return Math.abs(change) > 5
          case '24h': return true
          case '1w':
          case '7d': return change > 0
          case '30d': return change > 10
          default: return true
        }
      })
    }
    return filtered
  }, [topCoinsTokens, categoryFilter, timeframeFilter, isStocks, stockPrices])

  // Filtered on-chain data (chain + category)
  const filteredOnChain = useMemo(() => {
    let list = [...ONCHAIN_MOCK]
    if (onChainChainFilter !== 'mixed') {
      list = list.filter(row => row.networkId === onChainChainFilter)
    }
    if (onChainCategoryFilter !== 'all') {
      list = list.filter(row => row.category.toLowerCase() === onChainCategoryFilter)
    }
    return list
  }, [onChainChainFilter, onChainCategoryFilter])

  // Filtered prediction markets (category)
  const filteredPredictions = useMemo(() => {
    if (predictionsCategoryFilter === 'all') return [...PREDICTIONS_MOCK]
    return PREDICTIONS_MOCK.filter(row => row.category.toLowerCase() === predictionsCategoryFilter)
  }, [predictionsCategoryFilter])

  const renderChartPanel = (inline = false) => (
    <div
      className={`welcome-chart-overlay-panel-right${inline ? ' welcome-chart-inline-panel' : ''}`}
      onClick={inline ? undefined : (e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="welcome-chart-overlay-close"
        onClick={() => setChartPanelToken(null)}
        aria-label="Close chart"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div className="welcome-chart-overlay-header">
        <div className="welcome-chart-overlay-token-info">
          {chartPanelToken.logo ? <img src={chartPanelToken.logo} alt="" className="welcome-chart-overlay-logo" /> : <span className="welcome-chart-overlay-logo-placeholder">{chartPanelToken.symbol?.[0]}</span>}
          <div>
            <span className="welcome-chart-panel-token">{chartPanelToken.symbol}</span>
            <span className="welcome-chart-panel-name">{chartPanelToken.name}</span>
          </div>
        </div>
      </div>
      {/* Timeframe tabs: 1m, 30m, 1h, 1d, All Time, 24h, 7d, 30d */}
      <div className="welcome-chart-overlay-timeframe-row">
        <div className="welcome-chart-overlay-tabs">
          {OVERLAY_TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              className={`welcome-chart-overlay-tab ${chartOverlayTimeframe === tf.id ? 'active' : ''}`}
              onClick={() => setChartOverlayTimeframe(tf.id)}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <div className="welcome-chart-overlay-toolbar">
          <button type="button" className="welcome-chart-overlay-tool-btn" title="Indicators"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M7 16l4-8 4 4 4-8"/></svg></button>
          <button type="button" className="welcome-chart-overlay-tool-btn" title="Drawing"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
          <button type="button" className="welcome-chart-overlay-tool-btn" title="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
        </div>
      </div>
      {/* Unified chart toolbar - Candles, Line, TradingView + Price/MCap + Timeframes */}
      <div className="welcome-chart-unified-toolbar">
        <div className="welcome-chart-toolbar-left">
          <button type="button" className={`welcome-chart-type-btn ${chartOverlaySubTab === 'candles' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('candles')}>
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 3a1 1 0 011 1v1h1a1 1 0 010 2H7v6h1a1 1 0 010 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1V7H4a1 1 0 010-2h1V4a1 1 0 011-1zm8 0a1 1 0 011 1v3h1a1 1 0 010 2h-1v4h1a1 1 0 010 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 010-2h1V9h-1a1 1 0 010-2h1V4a1 1 0 011-1z" /></svg>
            <span>{t('ui.candles')}</span>
          </button>
          <button type="button" className={`welcome-chart-type-btn ${chartOverlaySubTab === 'line' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('line')}>
            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <span>{t('ui.line')}</span>
          </button>
          <button type="button" className={`welcome-chart-type-btn ${chartOverlaySubTab === 'tradingview' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('tradingview')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{t('ui.tradingView')}</span>
          </button>
          <div className="welcome-chart-toolbar-divider"></div>
          <div className="welcome-chart-price-mcap">
            <button type="button" className={`welcome-chart-toggle-btn ${chartOverlayYAxis === 'price' ? 'active' : ''}`} onClick={() => setChartOverlayYAxis('price')}>{t('ui.price')}</button>
            <button type="button" className={`welcome-chart-toggle-btn ${chartOverlayYAxis === 'mcap' ? 'active' : ''}`} onClick={() => setChartOverlayYAxis('mcap')}>{t('ui.mCap')}</button>
          </div>
          <div className="welcome-chart-toolbar-divider"></div>
          <div className="welcome-chart-timeframes">
            {['1M', '5M', '15M', '1H'].map(tf => (
              <button key={tf} type="button" className={`welcome-chart-tf-btn ${chartOverlayTimeframe === tf ? 'active' : ''}`} onClick={() => setChartOverlayTimeframe(tf)}>{tf}</button>
            ))}
            <button type="button" className="welcome-chart-tf-btn welcome-chart-tf-more">{t('ui.more')} <svg viewBox="0 0 20 20" fill="currentColor" style={{width: 12, height: 12, marginLeft: 2}}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
          </div>
        </div>
        <div className="welcome-chart-toolbar-right">
          <button type="button" className="welcome-chart-tool-btn" title="Grid"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></button>
          <button type="button" className="welcome-chart-tool-btn" title="Indicators"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/></svg></button>
          <button type="button" className="welcome-chart-tool-btn" title="Draw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
          <button type="button" className={`welcome-chart-tool-btn${chartFullscreen ? ' active' : ''}`} title={chartFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={() => setChartFullscreen(!chartFullscreen)}>
            {chartFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            )}
          </button>
        </div>
      </div>
      <div className="welcome-chart-panel-chart welcome-chart-overlay-chart-area">
        {chartOverlaySubTab === 'tradingview' ? (
          <iframe
            title={`${chartPanelToken.symbol} TradingView chart`}
            className="welcome-chart-overlay-iframe"
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(getTradingViewSymbol(chartPanelToken.symbol))}&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=%2313161c&studies=%5B%5D&theme=dark&style=1&locale=en`}
            frameBorder="0"
            allowFullScreen
          />
        ) : (
          <div className="welcome-chart-overlay-tradingchart-wrap">
            <TradingChart
              key={`chart-${chartOverlaySubTab}-inline`}
              token={chartPanelToken}
              stats={{ mcap: '—', fdv: '—', liquidity: '—', circSupply: '—', volume24h: '—', holders: '—' }}
              embedHeight={inline ? 380 : 320}
              isCollapsed={false}
              embedMode={true}
              initialChartType={chartOverlaySubTab}
              livePrice={binancePrices?.[chartPanelToken?.symbol]?.price}
            />
          </div>
        )}
      </div>
      {/* Fullscreen chart portal */}
      {chartFullscreen && chartOverlaySubTab !== 'tradingview' && createPortal(
        <div className="welcome-chart-fullscreen-overlay">
          <div className="welcome-chart-fullscreen-header">
            <div className="welcome-chart-fullscreen-token">
              {chartPanelToken?.logo && <img src={chartPanelToken.logo} alt="" className="welcome-chart-fullscreen-logo" />}
              <span className="welcome-chart-fullscreen-symbol">{chartPanelToken?.symbol}</span>
              <span className="welcome-chart-fullscreen-name">{chartPanelToken?.name}</span>
            </div>
            <div className="welcome-chart-fullscreen-toolbar">
              <button type="button" className={`welcome-chart-type-btn ${chartOverlaySubTab === 'candles' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('candles')}>
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 3a1 1 0 011 1v1h1a1 1 0 010 2H7v6h1a1 1 0 010 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1V7H4a1 1 0 010-2h1V4a1 1 0 011-1zm8 0a1 1 0 011 1v3h1a1 1 0 010 2h-1v4h1a1 1 0 010 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 010-2h1V9h-1a1 1 0 010-2h1V4a1 1 0 011-1z" /></svg>
                <span>Candles</span>
              </button>
              <button type="button" className={`welcome-chart-type-btn ${chartOverlaySubTab === 'line' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('line')}>
                <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span>Line</span>
              </button>
              <div className="welcome-chart-toolbar-divider"></div>
              <div className="welcome-chart-timeframes">
                {['1M', '5M', '15M', '1H', '4H', '1D'].map(tf => (
                  <button key={tf} type="button" className={`welcome-chart-tf-btn ${chartOverlayTimeframe === tf ? 'active' : ''}`} onClick={() => setChartOverlayTimeframe(tf)}>{tf}</button>
                ))}
              </div>
            </div>
            <button type="button" className="welcome-chart-fullscreen-close" onClick={() => setChartFullscreen(false)} title="Exit Fullscreen (ESC)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="welcome-chart-fullscreen-body">
            <TradingChart
              key={`chart-${chartOverlaySubTab}-fullscreen`}
              token={chartPanelToken}
              stats={{ mcap: '—', fdv: '—', liquidity: '—', circSupply: '—', volume24h: '—', holders: '—' }}
              embedHeight={null}
              isCollapsed={false}
              embedMode={true}
              initialChartType={chartOverlaySubTab}
              livePrice={binancePrices?.[chartPanelToken?.symbol]?.price}
            />
          </div>
        </div>,
        document.body
      )}
      {/* Project info section */}
      <div className="welcome-chart-overlay-project-info">
          <div className="welcome-chart-overlay-project-header">
            {spectreIcons.library}
            <span>About {chartPanelToken.name}</span>
          </div>
          <p className="welcome-chart-overlay-project-desc">
            {COIN_DESCRIPTIONS[chartPanelToken.symbol] || `${chartPanelToken.name} (${chartPanelToken.symbol}) is a cryptocurrency token. View real-time price data, trading charts, and on-chain analytics below.`}
          </p>
          <div className="welcome-chart-overlay-project-socials">
            <a href="#" className="welcome-chart-overlay-social-btn" title="Website">
              {spectreIcons.globe}
              <span>Website</span>
            </a>
            <a href="#" className="welcome-chart-overlay-social-btn" title="X / Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>X</span>
            </a>
            <a href="#" className="welcome-chart-overlay-social-btn" title="Telegram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              <span>Telegram</span>
            </a>
            <a href="#" className="welcome-chart-overlay-social-btn" title="Discord">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
              <span>Discord</span>
            </a>
          </div>
          <div className="welcome-chart-overlay-project-links">
            {onPageChange && (
              <button type="button" className="welcome-chart-overlay-link" onClick={() => { setChartPanelToken(null); onPageChange('research-zone') }}>
                {spectreIcons.search}
                <span>{t('ui.researchZone')}</span>
              </button>
            )}
            <a href="#" className="welcome-chart-overlay-link">
              {spectreIcons.trending}
              <span>{t('ui.viewChart')}</span>
            </a>
            <a href="#" className="welcome-chart-overlay-link">
              {spectreIcons.news}
              <span>{t('commandCenter.news')}</span>
            </a>
          </div>
      </div>
      {chartPanelToken.address && selectToken && (
        <button type="button" className="welcome-chart-overlay-view-details" onClick={() => { setChartPanelToken(null); selectToken(chartPanelToken) }}>
          {t('ui.viewFullDetails')}
        </button>
      )}
    </div>
  )

  // ─── Sentiment score for Living Wall (BTC price driven) ───
  const sentimentScore = useMemo(() => {
    const btcCh = topCoinPrices?.BTC?.change != null ? Number(topCoinPrices.BTC.change) : 0
    // Map BTC change to 0-100 score: +3% → ~80, -3% → ~20, 0% → 50
    return Math.max(0, Math.min(100, Math.round(50 + btcCh * 10)))
  }, [topCoinPrices])

  // Sentiment class: BTC green = bullish, BTC red = bearish
  const sentimentClass = sentimentScore >= 55 ? 'sentiment-bullish' : sentimentScore <= 45 ? 'sentiment-bearish' : 'sentiment-neutral'

  // ═══════════════════════════════════════════════════════════════════════════════
  // CINEMA MODE - Render cinematic experience instead of terminal mode
  // ═══════════════════════════════════════════════════════════════════════════════
  if (cinemaMode) {
    return (
      <div className={`welcome-page cinema-mode ${sentimentClass}${dayMode ? ' day-mode' : ''}`}>
        <CinemaWelcomeWrapper
          profile={profile}
          dayMode={dayMode}
          marketMode={marketMode}
          selectToken={selectToken}
          onOpenResearchZone={onOpenResearchZone}
          onOpenStorybook={(token) => {
            const full = topCoinsTokens.find(t => (t.symbol || '').toUpperCase() === (token.symbol || '').toUpperCase())
            setCinemaStorybookToken(full || token)
            setCinemaStorybookOpen(true)
          }}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          isInWatchlist={isInWatchlist}
          togglePinWatchlist={togglePinWatchlist}
          reorderWatchlist={reorderWatchlist}
          watchlist={watchlistWithLiveData}
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          onSwitchWatchlist={onSwitchWatchlist}
          topCoinPrices={topCoinPrices}
          trendingTokens={trendingTokens}
          fearGreed={fearGreed}
          altSeason={altSeason}
          marketDominance={marketDominance}
          marketStats={marketStats}
          stockPrices={stockPrices}
          liveVix={liveVix}
          stocksRiskOnOff={stocksRiskOnOff}
          indexAllocation={indexAllocation}
          topCoinsTokens={topCoinsTokens}
          onChainTokens={null}
          marketAiTab={marketAiTab}
          setMarketAiTab={setMarketAiTab}
          newsItems={newsItems}
          heatmapTokens={heatmapTokens}
          calendarEvents={null}
          liveActivity={liveActivity}
          alphaFeed={alphaFeed}
          intel={intel}
          onPageChange={onPageChange}
          theBriefStatement={theBriefStatement}
          theBriefStatements={allBriefStatements}
          macroAnalysisData={macroAnalysisData}
          sentimentScore={sentimentScore}
        />
        <TokenStorybook
          token={cinemaStorybookToken}
          isOpen={cinemaStorybookOpen}
          onClose={() => setCinemaStorybookOpen(false)}
          onAddToWatchlist={(t) => addToWatchlist?.({
            symbol: (t.symbol || '').toUpperCase(),
            name: t.name,
            logo: t.image,
            price: t.current_price || t.price,
            change: t.price_change_percentage_24h || t.change,
            marketCap: t.market_cap || t.marketCap,
            pinned: false,
          })}
          isInWatchlist={(t) => isInWatchlist?.({ symbol: (t?.symbol || '').toUpperCase() })}
          dayMode={dayMode}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TERMINAL MODE - Original data-heavy dashboard
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className={`welcome-page ${sentimentClass}${dayMode ? ' day-mode' : ''}${horizontalLayout ? ' horizontal-layout' : ''}`}>
      {/* Living Sentiment Wall — ambient background that shifts with market mood */}
      <div className="welcome-bg">
        <div className="bg-gradient"></div>
        <div className="bg-grid"></div>
        <div className="sentiment-wall" aria-hidden />
      </div>

      {/* Mobile Navigation Toolbar - Quick access to subpages */}
      {isMobile && onPageChange && (
        <nav className="welcome-mobile-nav-toolbar" aria-label="Quick navigation">
          <div className="welcome-mobile-nav-scroll">
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('research-zone')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <span>{t('ui.research')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('ai-screener')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </span>
              <span>{t('ui.screener')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('watchlists')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <span>{t('ui.watchlists')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('fear-greed')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12L20 6"/></svg>
              </span>
              <span>{t('ui.fearGreed')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('social-zone')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <span>{t('ui.social')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('x-dash')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.46-2.46L20 4"/></svg>
              </span>
              <span>X Dash</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('heatmaps')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </span>
              <span>{t('ui.heatmaps')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('glossary')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </span>
              <span>{t('ui.glossary')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('structure-guide')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              </span>
              <span>{t('ui.guide')}</span>
            </button>
            <button type="button" className="welcome-mobile-nav-item" onClick={() => onPageChange('user-dashboard')}>
              <span className="welcome-mobile-nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <span>{t('ui.dashboard')}</span>
            </button>
          </div>
        </nav>
      )}

      <section className="welcome-section-trending">
        <div className="welcome-ticker-wrap">
          <TokenTicker
            tokens={isStocks ? null : trendingTokens}
            marketMode={marketMode}
            selectToken={selectToken}
            onTokenClickOpenOverlay={(token) => isStocks ? handleStockClick(token) : openTokenCardPopup(token, true)}
            embedded
          />
        </div>
      </section>

      {/* ===== EXPERIMENTAL HORIZONTAL LAYOUT ===== */}
      {horizontalLayout && !isMobile && (
        <div className="welcome-horizontal-layout">
          {/* Horizontal Welcome Bar */}
          <div className={`welcome-horizontal-bar${!welcomeOpen ? ' is-collapsed' : ''}`}>
            {/* Toggle button — always visible */}
            <button className="welcome-bar-toggle" onClick={() => setWelcomeOpen(o => !o)} aria-label={welcomeOpen ? 'Collapse bar' : 'Expand bar'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                {welcomeOpen
                  ? <polyline points="18 15 12 9 6 15" />
                  : <polyline points="6 9 12 15 18 9" />
                }
              </svg>
            </button>

            {welcomeOpen ? (
            <>
            {/* Profile Section - with edit capability */}
            <div className="welcome-horizontal-profile">
              <div className="welcome-horizontal-avatar-wrap">
                <label className="welcome-horizontal-avatar" htmlFor="welcome-avatar-input-exp">
                  {(profile?.imageUrl || '').trim() ? (
                    <>
                      <img src={profile?.imageUrl || ''} alt="Profile" />
                      <span className="welcome-horizontal-avatar-edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                      </span>
                    </>
                  ) : (
                    <span className="welcome-horizontal-avatar-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
                      </svg>
                    </span>
                  )}
                </label>
                <input id="welcome-avatar-input-exp" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfileImageChange} />
              </div>
              {/* Spectre Egg / Agent Avatar (horizontal layout) */}
              {eggStage && !agentIsBorn && (
                <div className="welcome-widget-egg" onClick={onEggClick} title={eggStarted ? `Egg progress: ${eggProgress}%` : 'Click to learn about your AI agent'}>
                  <SpectreEgg stage={eggStage} size={44} mini />
                  {eggStarted && <span className="welcome-widget-egg-progress">{eggProgress}%</span>}
                </div>
              )}
              {agentIsBorn && agentProfile && (
                <div className="welcome-widget-agent" onClick={onOpenAgentChat} title={`${agentProfile.agentType || 'Agent'} · Level ${agentProfile.level || 1}`}>
                  <AgentAvatar agentColor={agentProfile.agentColor || '#00f0ff'} level={agentProfile.level || 1} size={38} />
                </div>
              )}
              <div className="welcome-horizontal-name">
                <span className="welcome-horizontal-label">{t('ui.welcome')}</span>
                {isEditingName ? (
                  <div className="welcome-horizontal-name-edit">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={draftName ?? ''}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder={t('ui.yourName')}
                      className="welcome-horizontal-name-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleProfileSave()
                        if (e.key === 'Escape') setIsEditingName(false)
                      }}
                    />
                    <button
                      type="button"
                      className={`welcome-horizontal-name-save ${profileSaved ? 'is-saved' : ''}`}
                      onClick={handleProfileSave}
                      aria-label="Save name"
                    >
                      {icons.check}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`welcome-horizontal-user ${!(profile?.name || '').trim() ? 'is-placeholder' : ''}`}
                    onClick={handleStartEditingName}
                  >
                    {(profile?.name || '').trim() || t('ui.enterYourName')}
                    <svg className="welcome-horizontal-edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                <div className="welcome-horizontal-profile-actions">
                  <button
                    type="button"
                    className="welcome-horizontal-profile-action"
                    onClick={() => onPageChange && onPageChange('glossary')}
                    aria-label="Open glossary"
                    data-tour="learn-terms"
                  >
                    {t('ui.glossary')}
                  </button>
                  <button
                    type="button"
                    className="welcome-horizontal-profile-action"
                    onClick={() => { setTourActive(true); setTourStep(0) }}
                    aria-label={t('ui.takeATour')}
                  >
                    {t('ui.setUpATour')}
                  </button>
                </div>
              </div>
            </div>

            {/* Global Market Cap */}
            <div className="welcome-horizontal-global-mcap">
              <span className="welcome-horizontal-global-mcap-label">{isStocks ? t('ui.usStockMarket') : t('ui.cryptoMarketCap')}</span>
              <span className="welcome-horizontal-global-mcap-value">
                {(() => {
                  if (isStocks) {
                    const spy = stockPrices?.SPY || marketIndices?.SPY
                    if (spy?.price) return fmtPrice(Number(spy.price))
                    return 'S&P 500'
                  }
                  const btcMcap = topCoinPrices?.BTC?.marketCap
                  const btcDom = marketDominance.btc
                  if (btcMcap && btcDom > 0) {
                    const total = btcMcap / (btcDom / 100)
                    return fmtLarge(total)
                  }
                  return '—'
                })()}
              </span>
              <div className="welcome-horizontal-global-mcap-sub">
                <span className="welcome-horizontal-global-mcap-vol">
                  {isStocks ? (() => {
                    const qqq = stockPrices?.QQQ || marketIndices?.QQQ
                    return qqq?.price ? `QQQ ${fmtPrice(Number(qqq.price))}` : 'Nasdaq'
                  })() : (() => {
                    const btcVol = topCoinPrices?.BTC?.volume || 0
                    const ethVol = topCoinPrices?.ETH?.volume || 0
                    const solVol = topCoinPrices?.SOL?.volume || 0
                    const knownDom = (marketDominance.btc + marketDominance.eth + marketDominance.sol) / 100
                    const estTotal = knownDom > 0 ? (btcVol + ethVol + solVol) / knownDom : 0
                    return `Vol ${estTotal >= 1e6 ? fmtLarge(estTotal) : '—'}`
                  })()}
                </span>
                {(() => {
                  if (isStocks) {
                    const spy = stockPrices?.SPY || marketIndices?.SPY
                    const ch = spy?.change
                    if (ch == null) return null
                    return (
                      <span className={`welcome-horizontal-global-mcap-change ${ch >= 0 ? 'positive' : 'negative'}`}>
                        {ch >= 0 ? '+' : ''}{Number(ch).toFixed(1)}%
                      </span>
                    )
                  }
                  const ch = topCoinPrices?.BTC?.change
                  if (ch == null) return null
                  return (
                    <span className={`welcome-horizontal-global-mcap-change ${ch >= 0 ? 'positive' : 'negative'}`}>
                      {ch >= 0 ? '+' : ''}{Number(ch).toFixed(1)}%
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Price Cards with info buttons */}
            <div className="welcome-horizontal-prices">
              {(isStocks ? ['SPY', 'QQQ', 'AAPL'] : WELCOME_COINS.slice(0, 3)).map((symbol) => {
                const data = isStocks
                  ? (stockPrices?.[symbol] || marketIndices?.[symbol])
                  : (topCoinPrices?.[symbol] || topCoinPrices?.[symbol.toUpperCase()])
                const price = data?.price != null && data.price > 0 ? Number(data.price) : null
                const change = data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : null)
                const logo = isStocks ? getStockLogo(symbol) : TOKEN_LOGOS[symbol]
                return (
                  <div
                    key={symbol}
                    className="welcome-horizontal-price-card"
                    onClick={() => isStocks ? handleStockClick({ symbol, name: symbol }) : openTokenCardPopup(symbol)}
                  >
                    {logo && <img src={logo} alt="" className="welcome-horizontal-price-logo" onError={isStocks ? (e) => { e.target.style.display = 'none' } : undefined} />}
                    <div className="welcome-horizontal-price-info">
                      <div className="welcome-horizontal-price-header">
                        <span className="welcome-horizontal-price-symbol">{symbol}</span>
                        {!isStocks && (
                          <button
                            type="button"
                            className="welcome-horizontal-info-btn"
                            aria-label={`Info about ${symbol}`}
                            onClick={(e) => { e.stopPropagation(); openTopCoinInfo(symbol, e) }}
                          >
                            i
                          </button>
                        )}
                      </div>
                      <span className="welcome-horizontal-price-value">{price != null ? fmtPrice(price) : '—'}</span>
                    </div>
                    {change != null && (
                      <span className={`welcome-horizontal-price-change ${change >= 0 ? 'positive' : 'negative'}`}>
                        {change >= 0 ? '+' : ''}{formatChange(change)}%
                      </span>
                    )}
                    <Sparkline
                      data={data?.sparkline_7d || generateSparkline(change || 0)}
                      positive={(change || 0) >= 0}
                    />
                  </div>
                )
              })}
            </div>

            {/* Trending Badge - Shows top gainer for stocks or trending for crypto */}
            {(isStocks ? stockGainers?.[0] : trendingTokens?.[0]) && (() => {
              const tk = isStocks ? stockGainers[0] : trendingTokens[0]
              const tChange = tk.change != null ? Number(tk.change) : (tk.change24 != null ? Number(tk.change24) : null)
              const tLogo = isStocks ? getStockLogo(tk.symbol, tk.sector) : (tk.logo || TOKEN_LOGOS[tk.symbol?.toUpperCase()] || null)
              return (
                <div
                  className="welcome-horizontal-trending-badge"
                  onClick={() => isStocks ? handleStockClick(tk) : openTokenCardPopup(tk.symbol)}
                >
                  <span className="welcome-horizontal-trending-label">{isStocks ? t('ui.topGainer') : t('ui.trending')}</span>
                  <div className="welcome-horizontal-trending-token">
                    {tLogo && <img src={tLogo} alt="" className="welcome-horizontal-trending-logo" onError={(e) => { e.target.style.display = 'none' }} />}
                    <div className="welcome-horizontal-trending-info">
                      <span className="welcome-horizontal-trending-symbol">{tk.symbol}</span>
                      {tChange != null && (
                        <span className={`welcome-horizontal-trending-change ${tChange >= 0 ? 'positive' : 'negative'}`}>
                          {tChange >= 0 ? '+' : ''}{formatChange(tChange)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Sentiment Indicators - Premium Orb Glow Effect */}
            <div className="welcome-horizontal-sentiment">
              <div
                className="welcome-horizontal-fng"
                data-sentiment={isStocks
                  ? (liveVix?.price != null ? (liveVix.price >= 25 ? 'fear' : liveVix.price <= 15 ? 'greed' : 'neutral') : 'neutral')
                  : (fearGreed.value != null ? (fearGreed.value >= 56 ? 'greed' : fearGreed.value <= 45 ? 'fear' : 'neutral') : 'neutral')
                }
              >
                <div className="welcome-horizontal-fng-content">
                  <span className="welcome-horizontal-fng-label">{isStocks ? t('ui.vixIndex') : t('ui.fearAndGreed')}</span>
                  <div className="welcome-horizontal-fng-value-group">
                    <span className="welcome-horizontal-fng-value">
                      {isStocks ? (liveVix?.price != null ? liveVix.price.toFixed(2) : '—') : (fearGreed.value ?? '—')}
                    </span>
                    <span className="welcome-horizontal-fng-classification">
                      {isStocks ? (liveVix?.label || '') : (fearGreed.classification || '')}
                    </span>
                  </div>
                </div>
                <div className="welcome-horizontal-fng-bar">
                  <div
                    className="welcome-horizontal-fng-bar-fill"
                    style={{
                      width: isStocks
                        ? `${Math.min(100, Math.max(0, liveVix?.price != null ? ((liveVix.price - 10) / 30) * 100 : 0))}%`
                        : `${Math.min(100, Math.max(0, fearGreed.value ?? 0))}%`
                    }}
                  />
                </div>
              </div>
              {isStocks ? (
                <div
                  className="welcome-horizontal-alt"
                  data-sentiment={stocksRiskOnOff.value >= 60 ? 'greed' : stocksRiskOnOff.value <= 40 ? 'fear' : 'neutral'}
                >
                  <div className="welcome-horizontal-alt-content">
                    <span className="welcome-horizontal-alt-label">Risk Appetite</span>
                    <div className="welcome-horizontal-alt-value-group">
                      <span className="welcome-horizontal-alt-value">{stocksRiskOnOff.value ?? '—'}</span>
                      <span className="welcome-horizontal-alt-classification">{stocksRiskOnOff.label || ''}</span>
                    </div>
                    <div className="welcome-horizontal-alt-shares">
                      <span className="welcome-horizontal-alt-share"><span className="welcome-horizontal-alt-dot btc" /> S&P {Number(stocksRiskOnOff.sp500) >= 0 ? '+' : ''}{stocksRiskOnOff.sp500}%</span>
                      <span className="welcome-horizontal-alt-share"><span className="welcome-horizontal-alt-dot eth" /> NDQ {Number(stocksRiskOnOff.nasdaq) >= 0 ? '+' : ''}{stocksRiskOnOff.nasdaq}%</span>
                    </div>
                  </div>
                  <div className="welcome-horizontal-alt-bar">
                    <div
                      className="welcome-horizontal-alt-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, stocksRiskOnOff.value ?? 0))}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="welcome-horizontal-alt"
                  data-sentiment={altSeason.value != null ? (altSeason.value >= 75 ? 'greed' : altSeason.value <= 25 ? 'fear' : 'neutral') : 'neutral'}
                >
                  <div className="welcome-horizontal-alt-content">
                    <span className="welcome-horizontal-alt-label">{t('ui.altSeason')}</span>
                    <div className="welcome-horizontal-alt-value-group">
                      <span className="welcome-horizontal-alt-value">{altSeason.value ?? '—'}</span>
                      <span className="welcome-horizontal-alt-classification">{altSeason.label || ''}</span>
                    </div>
                    <div className="welcome-horizontal-alt-shares">
                      <span className="welcome-horizontal-alt-share"><span className="welcome-horizontal-alt-dot btc" /> BTC {altSeason.btcShare}%</span>
                      <span className="welcome-horizontal-alt-share"><span className="welcome-horizontal-alt-dot eth" /> ETH {altSeason.ethShare}%</span>
                    </div>
                  </div>
                  <div className="welcome-horizontal-alt-bar">
                    <div
                      className="welcome-horizontal-alt-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, altSeason.value ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Market Dominance / Index Allocation */}
            <div className="welcome-horizontal-dominance">
              <span className="welcome-horizontal-dominance-label">{isStocks ? t('ui.indexAllocation') : t('ui.marketDominance')}</span>
              {isStocks ? (
                <>
                  <div className="welcome-horizontal-dominance-bar">
                    <div className="welcome-horizontal-dominance-segment btc" style={{ width: `${indexAllocation.sp500}%` }} title={`S&P 500 ${indexAllocation.sp500.toFixed(0)}%`}>
                      {indexAllocation.sp500 >= 15 && `${indexAllocation.sp500.toFixed(0)}%`}
                    </div>
                    <div className="welcome-horizontal-dominance-segment eth" style={{ width: `${indexAllocation.nasdaq}%` }} title={`Nasdaq ${indexAllocation.nasdaq.toFixed(0)}%`}>
                      {indexAllocation.nasdaq >= 10 && `${indexAllocation.nasdaq.toFixed(0)}%`}
                    </div>
                    <div className="welcome-horizontal-dominance-segment sol" style={{ width: `${indexAllocation.smallCap}%` }} title={`Small Cap ${indexAllocation.smallCap.toFixed(0)}%`} />
                    <div className="welcome-horizontal-dominance-segment alts" style={{ width: `${indexAllocation.commodities}%` }} title={`Commodities ${indexAllocation.commodities.toFixed(0)}%`} />
                  </div>
                  <div className="welcome-horizontal-dominance-legend">
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot btc" /> S&P</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot eth" /> NDQ</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot sol" /> SmCap</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot alts" /> Commod</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="welcome-horizontal-dominance-bar">
                    <div className="welcome-horizontal-dominance-segment btc" style={{ width: `${marketDominance.btc}%` }} title={`BTC ${marketDominance.btc}%`}>
                      {marketDominance.btc >= 15 && `${marketDominance.btc.toFixed(0)}%`}
                    </div>
                    <div className="welcome-horizontal-dominance-segment eth" style={{ width: `${marketDominance.eth}%` }} title={`ETH ${marketDominance.eth}%`}>
                      {marketDominance.eth >= 10 && `${marketDominance.eth.toFixed(0)}%`}
                    </div>
                    <div className="welcome-horizontal-dominance-segment sol" style={{ width: `${marketDominance.sol}%` }} title={`SOL ${marketDominance.sol}%`} />
                    <div className="welcome-horizontal-dominance-segment alts" style={{ width: `${marketDominance.alts}%` }} title={`Alts ${marketDominance.alts}%`} />
                  </div>
                  <div className="welcome-horizontal-dominance-legend">
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot btc" /> BTC</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot eth" /> ETH</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot sol" /> SOL</span>
                    <span className="welcome-horizontal-dominance-item"><span className="welcome-horizontal-dominance-dot alts" /> Alts</span>
                  </div>
                </>
              )}
            </div>

            {/* US Market + CME Gaps / Stock Indices (merged) – Apple style */}
            <div className="welcome-horizontal-market-cme">
              <div className={`welcome-horizontal-market ${usMarketStatus.isOpen ? 'is-open' : 'is-closed'}`}>
                <div className="welcome-horizontal-market-head">
                  <span className={`welcome-horizontal-market-indicator ${usMarketStatus.isOpen ? 'is-open' : 'is-closed'}`} />
                  <span className="welcome-horizontal-market-title">US Market</span>
                </div>
                <span className="welcome-horizontal-market-time-value">{usMarketStatus.timeMain}</span>
              </div>
              {isStocks ? (
                <div className="welcome-horizontal-cme">
                  <span className="welcome-horizontal-cme-title">Indices</span>
                  <div className="welcome-horizontal-cme-items">
                    {[{ sym: 'DIA', label: 'Dow' }, { sym: 'IWM', label: 'Russell' }].map(idx => {
                      const d = stockPrices?.[idx.sym] || marketIndices?.[idx.sym]
                      const ch = d?.change
                      return (
                        <div key={idx.sym} className="welcome-horizontal-cme-item">
                          <span className="welcome-horizontal-cme-label">{idx.label}</span>
                          <span className="welcome-horizontal-cme-value">{d?.price ? fmtPrice(Number(d.price)) : '—'}</span>
                          <span className={`welcome-horizontal-cme-status ${ch != null && ch >= 0 ? 'filled' : 'unfilled'}`}>{ch != null ? `${ch >= 0 ? '+' : ''}${Number(ch).toFixed(1)}%` : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="welcome-horizontal-cme">
                  <span className="welcome-horizontal-cme-title">CME Gaps</span>
                  <div className="welcome-horizontal-cme-items">
                    <div className="welcome-horizontal-cme-item">
                      <span className="welcome-horizontal-cme-label">BTC</span>
                      <span className="welcome-horizontal-cme-value">$91.2K – $93.4K</span>
                      <span className="welcome-horizontal-cme-status unfilled">Unfilled</span>
                    </div>
                    <div className="welcome-horizontal-cme-item">
                      <span className="welcome-horizontal-cme-label">ETH</span>
                      <span className="welcome-horizontal-cme-value">$2.48K – $2.52K</span>
                      <span className="welcome-horizontal-cme-status filled">Filled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Spotify Mini */}
            <div className="welcome-horizontal-spotify">
              <span className="welcome-horizontal-spotify-label">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </span>
              <iframe
                src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
                title="Spotify"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="welcome-horizontal-spotify-iframe"
              />
            </div>
            </>
            ) : (
            /* COLLAPSED mini strip */
            <div className="welcome-bar-mini">
              {(isStocks ? ['SPY', 'QQQ', 'AAPL'] : WELCOME_COINS.slice(0, 3)).map((symbol) => {
                const data = isStocks
                  ? (stockPrices?.[symbol] || marketIndices?.[symbol])
                  : (topCoinPrices?.[symbol] || topCoinPrices?.[symbol.toUpperCase()])
                const price = data?.price != null && data.price > 0 ? Number(data.price) : null
                const change = data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : null)
                const logo = isStocks ? getStockLogo(symbol) : TOKEN_LOGOS[symbol]
                return (
                  <span key={symbol} className="welcome-bar-mini-price" onClick={() => isStocks ? handleStockClick({ symbol, name: symbol }) : openTokenCardPopup(symbol)}>
                    {logo && <img src={logo} alt="" onError={isStocks ? (e) => { e.target.style.display = 'none' } : undefined} />}
                    <span className="welcome-bar-mini-symbol">{symbol}</span>
                    <span className="welcome-bar-mini-value">{price != null ? fmtPrice(price) : '—'}</span>
                    {change != null && (
                      <span className={`welcome-bar-mini-change ${change >= 0 ? 'positive' : 'negative'}`}>
                        {change >= 0 ? '+' : ''}{formatChange(change)}%
                      </span>
                    )}
                  </span>
                )
              })}
              <span className="welcome-bar-mini-divider" />
              <span className="welcome-bar-mini-fng">
                {isStocks ? 'VIX' : 'FNG'}: <strong>{isStocks ? (liveVix?.price != null ? liveVix.price.toFixed(2) : '—') : (fearGreed.value ?? '—')}</strong> <span className="welcome-bar-mini-fng-label">{isStocks ? (liveVix?.label || '') : (fearGreed.classification || '')}</span>
              </span>
              <span className="welcome-bar-mini-divider" />
              {isStocks ? (
                <span className="welcome-bar-mini-alt">
                  {t('ui.risk')}: <strong>{stocksRiskOnOff.value ?? '—'}</strong> <span className="welcome-bar-mini-alt-label">{stocksRiskOnOff.label || ''}</span>
                </span>
              ) : (
                <span className="welcome-bar-mini-alt">
                  {t('ui.altSeason')}: <strong>{altSeason.value ?? '—'}</strong> <span className="welcome-bar-mini-alt-label">{altSeason.label || ''}</span>
                </span>
              )}
              <span className="welcome-bar-mini-divider" />
              {isStocks ? (
                <span className="welcome-bar-mini-dom">
                  S&P: <strong>{indexAllocation.sp500.toFixed(0)}%</strong>
                  <span className="welcome-bar-mini-dom-sub">NDQ {indexAllocation.nasdaq.toFixed(0)}%</span>
                </span>
              ) : (
                <span className="welcome-bar-mini-dom">
                  BTC.D: <strong>{marketDominance.btc.toFixed(1)}%</strong>
                  <span className="welcome-bar-mini-dom-sub">ETH {marketDominance.eth.toFixed(1)}%</span>
                </span>
              )}
              <span className="welcome-bar-mini-divider" />
              <span className="welcome-bar-mini-mcap">
                {isStocks ? 'SPY' : 'MCap'}: <strong>{(() => {
                  if (isStocks) {
                    const spy = stockPrices?.SPY || marketIndices?.SPY
                    return spy?.price ? fmtPrice(Number(spy.price)) : '—'
                  }
                  const btcMcap = topCoinPrices?.BTC?.marketCap
                  const btcDom = marketDominance.btc
                  if (btcMcap && btcDom > 0) {
                    const total = btcMcap / (btcDom / 100)
                    return fmtLarge(total)
                  }
                  return '—'
                })()}</strong>
              </span>
              <span className="welcome-bar-mini-divider" />
              <span className={`welcome-bar-mini-market ${usMarketStatus.isOpen ? 'is-open' : 'is-closed'}`}>
                <span className="welcome-bar-mini-market-dot" />
                US: {usMarketStatus.statusLabel}
              </span>
            </div>
            )}
          </div>

          {/* Bottom Row: Command Center (75%) + Watchlist (25%) */}
          <div className="welcome-experimental-bottom">
            {/* Command Center - reuse the existing component */}
            <div className="welcome-market-ai-widget" data-tour="command-center">
              <div className="welcome-market-ai-header-row">
                <div className="welcome-market-ai-section-title">
                  <span className="welcome-market-ai-icon">{spectreIcons.ai}</span>
                  <span>{t('commandCenter.title')}</span>
                </div>
                <div className="welcome-market-ai-tabs">
                  {[
                    { id: 'brief', label: t('commandCenter.aiBrief') },
                    { id: 'analysis', label: t('commandCenter.aiMarket') },
                    { id: 'news', label: t('commandCenter.news') },
                    { id: 'heatmaps', label: t('commandCenter.heatmaps') },
                    { id: 'liquidation', label: t('commandCenter.liquidation') },
                    { id: 'sector', label: t('commandCenter.sectors') },
                    { id: 'mindshare', label: t('commandCenter.mindshare') },
                    { id: 'calendar', label: t('commandCenter.calendar') },
                    { id: 'flows', label: t('commandCenter.flows') },
                    { id: 'wallets', label: t('commandCenter.wallets') },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`welcome-market-ai-tab ${marketAiTab === tab.id ? 'active' : ''}`}
                      onClick={() => setMarketAiTab(tab.id)}
                    >
                      <span className="welcome-market-ai-tab-icon" aria-hidden>{marketAiTabIcons[tab.id]}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="welcome-market-ai-content">
                {/* ── AI Brief tab ── */}
                {marketAiTab === 'brief' && (
                  <div className="cab-tab-content" style={{ '--sentiment-rgb': (() => {
                    if (isStocks) {
                      const v = liveVix?.price
                      if (v != null && v >= 25) return '239, 68, 68'
                      if (v != null && v <= 15) return '34, 197, 94'
                      return '139, 92, 246'
                    }
                    const fng = fearGreed?.value
                    if (fng >= 65) return '34, 197, 94'
                    if (fng <= 35) return '239, 68, 68'
                    return '139, 92, 246'
                  })() }}
                    onMouseEnter={() => { briefPausedRef.current = true }}
                    onMouseLeave={() => { briefPausedRef.current = false }}
                    onTouchStart={handleBriefTouchStart}
                    onTouchEnd={handleBriefTouchEnd}
                  >
                    <div className="cab-tab-glow" />
                    <div className="cab-tab-eyebrow">
                      <div className="cab-tab-eyebrow-left">
                        <span className="cab-tab-pulse" />
                        <span className="cab-tab-label">{t('cinemaBrief.title')}</span>
                      </div>
                      <div className="cab-tab-eyebrow-right">
                        <span className="cab-tab-live">{t('ticker.live')}</span>
                        <BriefAudioPlayer
                          briefText={briefDisplay}
                          sentimentRgb={(() => {
                            if (isStocks) {
                              const v = liveVix?.price
                              if (v != null && v >= 25) return '239, 68, 68'
                              if (v != null && v <= 15) return '34, 197, 94'
                              return '139, 92, 246'
                            }
                            const fng = fearGreed?.value
                            if (fng >= 65) return '34, 197, 94'
                            if (fng <= 35) return '239, 68, 68'
                            return '139, 92, 246'
                          })()}
                          isFullBrief={terminalIsFullBrief}
                        />
                        <span className="cab-tab-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <blockquote className={`cab-tab-statement ${briefFading ? 'cab-tab-fading' : 'cab-tab-visible'}${terminalIsFullBrief ? ' cab-tab-statement-full' : ''}`}>
                      <span className="cab-tab-quote">&ldquo;</span>
                      {briefDisplay || t('common.loading')}
                      <span className="cab-tab-quote">&rdquo;</span>
                    </blockquote>
                    {allBriefStatements.length > 1 && (
                      <div className="cab-tab-rotation-nav">
                        {allBriefStatements.map((_, idx) => {
                          const isOutlookDot = idx === allBriefStatements.length - 1 && allBriefStatements.length >= 6
                          return (
                          <button
                            key={idx}
                            className={`cab-tab-dot ${idx === briefIndex ? 'active' : ''}${isOutlookDot ? ' cab-tab-dot-full' : ''}`}
                            onClick={() => goToBrief(idx)}
                            title={[t('cinemaBrief.sentiment'), t('cinemaBrief.session'), t('cinemaBrief.narrative'), t('cinemaBrief.psychology'), t('cinemaBrief.macro'), t('cinemaBrief.aiOutlook')][idx] || `Brief ${idx + 1}`}
                          >
                            <span className="cab-tab-dot-fill" />
                            {idx === briefIndex && (
                              <svg className="cab-tab-dot-progress" viewBox="0 0 20 20">
                                <circle
                                  cx="10" cy="10" r="8"
                                  fill="none"
                                  stroke={`rgb(${(() => {
                                    if (isStocks) {
                                      const v = liveVix?.price
                                      if (v != null && v >= 25) return '239, 68, 68'
                                      if (v != null && v <= 15) return '34, 197, 94'
                                      return '139, 92, 246'
                                    }
                                    const fng = fearGreed?.value
                                    if (fng >= 65) return '34, 197, 94'
                                    if (fng <= 35) return '239, 68, 68'
                                    return '139, 92, 246'
                                  })()})`}
                                  strokeWidth="2"
                                  strokeDasharray="50.27"
                                  strokeDashoffset="0"
                                  className="cab-tab-dot-circle"
                                  style={{ animationDuration: `${getTerminalBriefInterval(idx)}ms` }}
                                />
                              </svg>
                            )}
                          </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="cab-tab-attribution">
                      &mdash; <span className="cab-tab-attr-name">Spectre AI</span> · {terminalIsFullBrief ? t('cinemaBrief.aiOutlook') : t('cinemaBrief.justNow')}
                    </div>
                    <div className="cab-tab-chips">
                      {/* F&G or VIX */}
                      <div className="cab-tab-chip" style={{ '--chip-rgb': (() => {
                        if (isStocks) {
                          const v = liveVix?.price
                          if (v != null && v >= 25) return '239, 68, 68'
                          if (v != null && v <= 15) return '34, 197, 94'
                          return '139, 92, 246'
                        }
                        const fng = fearGreed?.value
                        if (fng >= 65) return '34, 197, 94'
                        if (fng <= 35) return '239, 68, 68'
                        return '139, 92, 246'
                      })() }}>
                        <span className="cab-tab-chip-label">{isStocks ? 'VIX' : 'FEAR & GREED'}</span>
                        <span className="cab-tab-chip-value">{isStocks ? (liveVix?.price != null ? liveVix.price.toFixed(2) : '—') : (fearGreed?.value ?? '—')}</span>
                        <span className="cab-tab-chip-sub">{isStocks ? (liveVix?.label || 'N/A') : (fearGreed?.classification || 'Neutral')}</span>
                      </div>
                      {/* Bias */}
                      <div className="cab-tab-chip" style={{ '--chip-rgb': macroAnalysisData?.bias === 'bullish' ? '34, 197, 94' : macroAnalysisData?.bias === 'bearish' ? '239, 68, 68' : '139, 92, 246' }}>
                        <span className="cab-tab-chip-label">BIAS</span>
                        <span className="cab-tab-chip-value" style={{ color: `rgb(${macroAnalysisData?.bias === 'bullish' ? '34, 197, 94' : macroAnalysisData?.bias === 'bearish' ? '239, 68, 68' : '139, 92, 246'})` }}>
                          {(macroAnalysisData?.bias || 'neutral').toUpperCase()}
                        </span>
                        <span className="cab-tab-chip-sub">{macroAnalysisData?.tfLabel || '24h'}</span>
                      </div>
                      {/* BTC / ETH / SOL (crypto) or SPY / QQQ / VIX (stocks) */}
                      {(isStocks ? ['SPY', 'QQQ', 'AAPL'] : ['BTC', 'ETH', 'SOL']).map((sym) => {
                        const d = isStocks ? stockPrices?.[sym] : topCoinPrices?.[sym]
                        if (!d?.price) return null
                        const ch = parseFloat(d.change) || 0
                        return (
                          <div key={sym} className="cab-tab-chip" style={{ '--chip-rgb': ch >= 0 ? '34, 197, 94' : '239, 68, 68' }}>
                            <span className="cab-tab-chip-label">{sym}</span>
                            <span className="cab-tab-chip-value">
                              ${typeof d.price === 'number'
                                ? d.price.toLocaleString(undefined, { maximumFractionDigits: d.price < 10 ? 2 : 0 })
                                : parseFloat(d.price).toLocaleString(undefined, { maximumFractionDigits: parseFloat(d.price) < 10 ? 2 : 0 })
                              }
                            </span>
                            <span className={`cab-tab-chip-change ${ch >= 0 ? 'pos' : 'neg'}`}>
                              {ch >= 0 ? '+' : ''}{ch.toFixed(2)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {marketAiTab === 'analysis' && (() => {
                  if (!macroAnalysisData) return (
                    <div className="welcome-market-ai-analysis-full"><div className="ai-mkt-loading"><div className="ai-mkt-loading-pulse" /><span>{t('ui.analyzingMarketData')}</span></div></div>
                  )
                  const avg = macroAnalysisData.tableData.reduce((s, r) => s + Math.abs(r.change || 0), 0) / 3
                  const strength = Math.min(Math.round(avg * 12), 100)
                  return (
                  <div className="ai-market-v2">
                    {/* ═══ TOP: Bias + AI Confidence Side by Side ═══ */}
                    <div className="ai-market-hero">
                      {/* Left: Market Sentiment */}
                      <div className="ai-market-sentiment">
                        <div className={`ai-market-sentiment-badge bias-${macroAnalysisData.bias}`}>
                          <span className="ai-market-sentiment-dot" />
                          <span className="ai-market-sentiment-label">{macroAnalysisData.bias.charAt(0).toUpperCase() + macroAnalysisData.bias.slice(1)}</span>
                        </div>
                        <p className="ai-market-sentiment-text">{macroAnalysisData.smartSummary}</p>
                        {/* Asset Performance */}
                        <div className="ai-market-assets">
                          {macroAnalysisData.tableData.map((row) => (
                            <div key={row.asset} className="ai-market-asset">
                              <span className="ai-market-asset-name">{row.asset}</span>
                              <span className={`ai-market-asset-change ${(row.change >= 0) ? 'pos' : 'neg'}`}>
                                {row.change >= 0 ? '+' : ''}{(row.change || 0).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Center: AI Confidence Orb (KEPT) */}
                      <div className={`ai-mkt-trio-center bias-${macroAnalysisData.bias}`}>
                        <div className="ai-mkt-pulse-ring"><div className="ai-mkt-pulse-ring-inner" /></div>
                        <div className="ai-mkt-pulse-label">AI Confidence</div>
                        <div className="ai-mkt-pulse-value">{strength}%</div>
                        <div className="ai-mkt-pulse-bar"><div className="ai-mkt-pulse-bar-fill" style={{ width: `${strength}%` }} /></div>
                      </div>

                      {/* Right: Key Metrics */}
                      <div className="ai-market-metrics">
                        <div className="ai-market-metric">
                          <span className="ai-market-metric-icon">{spectreIcons.trending}</span>
                          <div className="ai-market-metric-content">
                            <span className="ai-market-metric-label">Funding</span>
                            <span className={`ai-market-metric-value ${marketStructureTrio.funding[0].rate >= 0 ? 'pos' : 'neg'}`}>
                              {marketStructureTrio.funding[0].rate >= 0 ? '+' : ''}{(marketStructureTrio.funding[0].rate * 100).toFixed(3)}%
                            </span>
                          </div>
                        </div>
                        <div className="ai-market-metric">
                          <span className="ai-market-metric-icon">{spectreIcons.fire}</span>
                          <div className="ai-market-metric-content">
                            <span className="ai-market-metric-label">Liquidations</span>
                            <span className="ai-market-metric-value">${(marketStructureTrio.liquidations.longs24h + marketStructureTrio.liquidations.shorts24h).toFixed(0)}M</span>
                          </div>
                        </div>
                        <div className="ai-market-metric">
                          <span className="ai-market-metric-icon">{spectreIcons.whale}</span>
                          <div className="ai-market-metric-content">
                            <span className="ai-market-metric-label">Whale Flow</span>
                            <span className={`ai-market-metric-value ${marketStructureTrio.whaleFlows.net >= 0 ? 'pos' : 'neg'}`}>
                              {marketStructureTrio.whaleFlows.net >= 0 ? '+' : ''}${marketStructureTrio.whaleFlows.net}M
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ═══ MIDDLE: Market Insight Card ═══ */}
                    <div className="ai-market-insight-card">
                      <div className="ai-market-insight-header">
                        <div className="ai-market-insight-header-left">
                          <span className="ai-market-insight-icon">{spectreIcons.sparkles}</span>
                          <span className="ai-market-insight-title">Market Analysis</span>
                        </div>
                        <div className="ai-market-tf-pills">
                          {[{ id: '1h', label: '1H' }, { id: '24h', label: '24H' }, { id: '7d', label: '7D' }].map(tf => (
                            <button key={tf.id} className={`ai-market-tf-btn ${marketAiTimeframe === tf.id ? 'active' : ''}`} onClick={() => setMarketAiTimeframe(tf.id)}>{tf.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="ai-market-insight-body">
                        <p className="ai-market-insight-text">{macroAnalysisData.p1?.replace(/^[\w-]+\s+OUTLOOK\s+—\s*/, '') || 'Market showing mixed signals. Monitor key levels for directional clarity.'}</p>
                      </div>
                    </div>

                    {/* ═══ BOTTOM: Live Activity Feed ═══ */}
                    <div className="ai-market-activity">
                      <div className="ai-market-activity-header">
                        <span className="ai-market-activity-dot" />
                        <span className="ai-market-activity-title">Live Activity</span>
                      </div>
                      <div className="ai-market-activity-list">
                        {liveActivity.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="ai-market-activity-item">
                            {item.logo && <img src={item.logo} alt="" className="ai-market-activity-logo" />}
                            <span className="ai-market-activity-token">{item.token}</span>
                            <span className="ai-market-activity-action">{item.action}</span>
                            <span className="ai-market-activity-value">{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )
                })()}
                {marketAiTab === 'news' && (
                  <div className="news-feed-panel">
                    {/* News / X toggle header */}
                    <div className="news-feed-mode-bar">
                      <button className={`news-feed-mode-btn ${!newsXToggle ? 'active' : ''}`} onClick={() => setNewsXToggle(false)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                        News
                      </button>
                      <button className={`news-feed-mode-btn ${newsXToggle ? 'active' : ''}`} onClick={() => setNewsXToggle(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Posts
                      </button>
                    </div>

                    {!newsXToggle ? (
                      /* NEWS — 2-column grid with hero card */
                      <div className="news-feed-grid">
                        {newsLoading ? (
                          <>
                            <div className="news-feed-loading-shimmer news-card-hero" />
                            {[1,2,3,4,5].map(i => <div key={i} className="news-feed-loading-shimmer" />)}
                          </>
                        ) : (() => {
                          const allNews = newsItems.length > 0 ? newsItems : [
                            { id: 1, source: 'CoinDesk', title: 'Bitcoin Surges Past $89K as Institutional Demand Accelerates', summary: 'Major asset managers report record inflows into BTC ETFs, signaling growing confidence in digital assets as a legitimate asset class.', publishedOn: Math.floor(Date.now()/1000) - 720, categories: ['Markets'] },
                            { id: 2, source: 'The Block', title: 'Ethereum Layer 2 TVL Hits All-Time High of $45B', summary: 'Base and Arbitrum lead as scaling solutions gain adoption.', publishedOn: Math.floor(Date.now()/1000) - 1680, categories: ['DeFi'] },
                            { id: 3, source: 'Decrypt', title: 'SEC Delays Decision on Solana ETF Applications', summary: 'Regulators request additional comments, pushing ruling to Q2.', publishedOn: Math.floor(Date.now()/1000) - 3600, categories: ['Regulation'] },
                            { id: 4, source: 'Bloomberg', title: 'Fed Minutes Suggest Rate Cuts Could Begin in Q2', summary: 'Risk assets rally as traders price in looser monetary policy.', publishedOn: Math.floor(Date.now()/1000) - 10800, categories: ['Macro'] },
                            { id: 5, source: 'CoinTelegraph', title: 'Solana DEX Volume Surpasses Ethereum for Third Consecutive Week', summary: 'Jupiter and Raydium drive record on-chain trading activity.', publishedOn: Math.floor(Date.now()/1000) - 14400, categories: ['DeFi'] },
                            { id: 6, source: 'The Defiant', title: 'Aave Proposes Expansion to Bitcoin Layer 2 Networks', summary: 'Leading DeFi protocol eyes cross-chain lending markets.', publishedOn: Math.floor(Date.now()/1000) - 18000, categories: ['DeFi'] },
                            { id: 7, source: 'Reuters', title: 'BlackRock Bitcoin ETF Sees $1.2B Single-Day Inflow Record', summary: 'Institutional demand continues to accelerate amid bullish sentiment.', publishedOn: Math.floor(Date.now()/1000) - 21600, categories: ['Markets'] },
                            { id: 8, source: 'Blockworks', title: 'MicroStrategy Adds Another 5,000 BTC to Treasury', summary: 'Company now holds over 210,000 Bitcoin worth $18.7B.', publishedOn: Math.floor(Date.now()/1000) - 28800, categories: ['Markets'] },
                          ]
                          const hero = allNews[0]
                          const rest = allNews.slice(1)
                          const heroDiff = hero?.publishedOn ? Math.floor((Date.now()/1000) - hero.publishedOn) : 0
                          const heroTime = heroDiff < 60 ? 'Just now' : heroDiff < 3600 ? `${Math.floor(heroDiff/60)}m ago` : heroDiff < 86400 ? `${Math.floor(heroDiff/3600)}h ago` : `${Math.floor(heroDiff/86400)}d ago`
                          return (
                            <>
                              {/* Hero / Featured story */}
                              <a className="news-card news-card-hero" href={hero?.url || '#'} target="_blank" rel="noopener noreferrer">
                                <div className="news-card-live">
                                  <span className="news-card-live-dot" />BREAKING
                                </div>
                                <h3 className="news-card-hero-title">{hero?.title}</h3>
                                <p className="news-card-hero-summary">{hero?.summary}</p>
                                <div className="news-card-meta">
                                  <span className="news-card-source">{hero?.source}</span>
                                  <span className="news-card-time">{heroTime}</span>
                                  {hero?.categories?.[0] && <span className="news-feed-category">{hero.categories[0]}</span>}
                                </div>
                              </a>
                              {/* Rest in 2-col grid */}
                              {rest.map((news) => {
                                const diff = news.publishedOn ? Math.floor((Date.now()/1000) - news.publishedOn) : 0
                                const timeAgo = diff < 60 ? 'now' : diff < 3600 ? `${Math.floor(diff/60)}m` : diff < 86400 ? `${Math.floor(diff/3600)}h` : `${Math.floor(diff/86400)}d`
                                return (
                                  <a key={news.id} className="news-card" href={news.url || '#'} target="_blank" rel="noopener noreferrer">
                                    <div className="news-card-top">
                                      <span className="news-card-source">{news.source}</span>
                                      <span className="news-card-time">{timeAgo}</span>
                                    </div>
                                    <h4 className="news-card-title">{news.title}</h4>
                                    {news.summary && news.summary !== news.title && (
                                      <p className="news-card-summary">{news.summary}</p>
                                    )}
                                    {news.categories?.[0] && (
                                      <div className="news-card-bottom">
                                        <span className="news-feed-category">{news.categories[0]}</span>
                                      </div>
                                    )}
                                  </a>
                                )
                              })}
                            </>
                          )
                        })()}
                      </div>
                    ) : (
                      /* X / TWEETS — 2-column card grid */
                      <div className="news-feed-x-grid">
                        {[
                          { handle: '@100xAnalyst', name: '100x Analyst', text: 'BTC structure looks incredibly strong. Higher lows forming on the 4H. Next leg up incoming.', time: '5m', likes: '2.4K', replies: '312', hot: true },
                          { handle: '@DefiWhale', name: 'DeFi Whale', text: 'Just bridged $2M to Base. The ecosystem is exploding. $AERO looking prime for a breakout.', time: '18m', likes: '1.8K', replies: '245' },
                          { handle: '@CryptoVeteran', name: 'Crypto Veteran', text: 'Volatility = opportunity. Stay focused on the bigger picture. Macro is shifting in our favor.', time: '32m', likes: '956', replies: '89' },
                          { handle: '@OnChainWizard', name: 'On-Chain Wizard', text: 'ETH accumulation addresses just hit a new ATH. Smart money loading before next catalyst.', time: '1h', likes: '3.1K', replies: '421', hot: true },
                          { handle: '@MacroAlpha', name: 'Macro Alpha', text: 'Fed pivot coming sooner than expected. Liquidity injections visible in reverse repo data. Risk-on incoming.', time: '2h', likes: '5.2K', replies: '678' },
                          { handle: '@SolanaLegend', name: 'Solana Legend', text: 'SOL DeFi TVL surging. New protocols launching weekly. Undervalued relative to activity.', time: '3h', likes: '1.2K', replies: '156' },
                          { handle: '@AltcoinPsych', name: 'Altcoin Psycho', text: 'Alt season loading. BTC dominance breaking down while alts show relative strength. Watch for rotation.', time: '4h', likes: '4.7K', replies: '534' },
                          { handle: '@CryptoCapo', name: 'Crypto Capo', text: 'Weekly close above $85K confirms bullish structure. Bears running out of arguments here.', time: '5h', likes: '6.1K', replies: '892', hot: true },
                        ].map((tweet, i) => (
                          <div key={i} className={`news-x-card${tweet.hot ? ' is-hot' : ''}`}>
                            <div className="news-x-card-head">
                              <div className="news-feed-x-avatar">{tweet.name[0]}</div>
                              <div className="news-feed-x-user">
                                <span className="news-feed-x-name">{tweet.name}</span>
                                <span className="news-feed-x-handle">{tweet.handle}</span>
                              </div>
                              <span className="news-x-card-time">{tweet.time}</span>
                            </div>
                            <p className="news-feed-x-text">{tweet.text}</p>
                            <div className="news-feed-x-stats">
                              <span className="news-feed-x-stat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                {tweet.replies}
                              </span>
                              <span className="news-feed-x-stat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                {tweet.likes}
                              </span>
                              <svg className="news-feed-x-logo" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {marketAiTab === 'heatmaps' && (() => {
                  const heatmapData = heatmapTokens.length > 0 ? heatmapTokens : topCoinsTokens.slice(0, 24)
                  const renderHeatmapGrid = (isFullscreenView) => (
                    <div className="welcome-heatmap-grid">
                      {heatmapData.map((token, idx) => {
                        const liveData = topCoinPrices?.[token.symbol] || topCoinPrices?.[token.symbol?.toUpperCase?.()] || {}
                        const livePrice = liveData.price > 0 ? liveData.price : token.price
                        const liveChange = liveData.change != null ? liveData.change : token.change
                        const change = Number(liveChange) || 0
                        const absChange = Math.abs(change)
                        const isPositive = change >= 0
                        const intensity = Math.min(1, absChange / 8)
                        const bgColor = isPositive
                          ? `rgba(16, 185, 129, ${0.12 + intensity * 0.3})`
                          : `rgba(239, 68, 68, ${0.12 + intensity * 0.3})`
                        const borderColor = isPositive
                          ? `rgba(16, 185, 129, ${0.15 + intensity * 0.25})`
                          : `rgba(239, 68, 68, ${0.15 + intensity * 0.25})`
                        const rowColors = TOKEN_ROW_COLORS[(token.symbol || '').toUpperCase()]
                        const brandRgb = rowColors?.bg || '255, 255, 255'
                        const gridArea = idx === 0 ? 'hero1' : idx === 1 ? 'hero2' : `t${idx}`
                        const isHero = idx < 2
                        return (
                          <div
                            key={token.symbol || idx}
                            className={`welcome-heatmap-tile ${isHero ? 'welcome-heatmap-tile--hero' : ''} ${isPositive ? 'is-positive' : 'is-negative'}`}
                            style={{
                              gridArea,
                              '--tile-bg': bgColor,
                              '--tile-border': borderColor,
                              '--tile-brand-rgb': brandRgb,
                              '--tile-brand-gradient': rowColors?.gradient || 'none',
                            }}
                            onClick={() => openTokenCardPopup && openTokenCardPopup(token.symbol)}
                          >
                            <div className="welcome-heatmap-tile-top">
                              <div className="welcome-heatmap-tile-logo">
                                {token.logo ? (
                                  <img src={token.logo} alt={token.symbol} />
                                ) : (
                                  <span>{token.symbol?.[0] || '?'}</span>
                                )}
                              </div>
                              <span className="welcome-heatmap-tile-symbol">{token.symbol}</span>
                            </div>
                            {(isHero || isFullscreenView) && (
                              <div className="welcome-heatmap-tile-name">{token.name}</div>
                            )}
                            <div className="welcome-heatmap-tile-bottom">
                              <span className="welcome-heatmap-tile-price">
                                {livePrice ? fmtPrice(livePrice) : '—'}
                              </span>
                              <span className={`welcome-heatmap-tile-change ${isPositive ? 'positive' : 'negative'}`}>
                                {isPositive ? '+' : ''}{formatChange(change)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                  const fullscreenBtn = (
                    <button
                      className="welcome-heatmap-fullscreen-btn"
                      onClick={() => setHeatmapFullscreen(f => !f)}
                      title={heatmapFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                      {heatmapFullscreen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      )}
                    </button>
                  )
                  return (
                    <>
                      <div className="welcome-heatmap-container">
                        <div className="welcome-heatmap-toolbar">
                          <span className="welcome-heatmap-toolbar-title">Spectre Crypto Heatmap</span>
                          {fullscreenBtn}
                        </div>
                        {renderHeatmapGrid(false)}
                      </div>
                      {heatmapFullscreen && createPortal(
                        <div className="welcome-heatmap-container welcome-heatmap-fullscreen">
                          <div className="welcome-heatmap-fullscreen-overlay" onClick={() => setHeatmapFullscreen(false)} />
                          <div className="welcome-heatmap-toolbar">
                            <span className="welcome-heatmap-toolbar-title">Spectre Crypto Heatmap</span>
                            {fullscreenBtn}
                          </div>
                          {renderHeatmapGrid(true)}
                        </div>,
                        document.body
                      )}
                    </>
                  )
                })()}
                {marketAiTab === 'liquidation' && (() => {
                  const liqFullscreenBtn = (
                    <button className="welcome-heatmap-fullscreen-btn" onClick={() => setLiqFullscreen(f => !f)} title={liqFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                      {liqFullscreen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                      )}
                    </button>
                  )
                  const renderLiqTooltip = (tip) => tip.visible && (
                    <div className="liq-heatmap-tooltip" style={{ left: tip.x + 14, top: Math.max(8, tip.y - 64), pointerEvents: 'none' }}>
                      <div className="liq-tooltip-price">${Math.round(tip.price).toLocaleString()}</div>
                      <div className="liq-tooltip-amount">~${tip.amount}M est. liquidations</div>
                      <div className="liq-tooltip-time">{tip.time}</div>
                    </div>
                  )
                  return (
                    <>
                      <div className="liq-heatmap-container">
                        <div className="welcome-heatmap-toolbar">
                          <div className="liq-heatmap-toolbar-left">
                            <span className="welcome-heatmap-toolbar-title">BTC Liquidation Heatmap</span>
                            <div className="liq-heatmap-tf-btns">
                              {['24h', '3d', '7d'].map(tf => (
                                <button key={tf} className={`liq-heatmap-tf-btn${liqTimeframe === tf ? ' active' : ''}`} onClick={() => setLiqTimeframe(tf)}>{tf}</button>
                              ))}
                            </div>
                          </div>
                          <div className="liq-heatmap-toolbar-right">
                            <span className="liq-heatmap-legend-label">Liquidation Leverage</span>
                            {liqFullscreenBtn}
                          </div>
                        </div>
                        <div className="liq-heatmap-canvas-wrap" ref={liqContainerRef}>
                          <canvas ref={liqCanvasRef} className="liq-heatmap-canvas" onMouseMove={handleLiqMouseMove} onMouseLeave={handleLiqMouseLeave} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
                          {renderLiqTooltip(liqTooltip)}
                          {liqLoading && <div className="liq-heatmap-loading">Loading BTC data...</div>}
                        </div>
                      </div>
                      {liqFullscreen && createPortal(
                        <div className="welcome-heatmap-container welcome-heatmap-fullscreen liq-heatmap-fullscreen-portal">
                          <div className="welcome-heatmap-fullscreen-overlay" onClick={() => setLiqFullscreen(false)} />
                          <div className="welcome-heatmap-toolbar">
                            <div className="liq-heatmap-toolbar-left">
                              <span className="welcome-heatmap-toolbar-title">BTC Liquidation Heatmap</span>
                              <div className="liq-heatmap-tf-btns">
                                {['24h', '3d', '7d'].map(tf => (
                                  <button key={tf} className={`liq-heatmap-tf-btn${liqTimeframe === tf ? ' active' : ''}`} onClick={() => setLiqTimeframe(tf)}>{tf}</button>
                                ))}
                              </div>
                            </div>
                            <div className="liq-heatmap-toolbar-right">
                              <span className="liq-heatmap-legend-label">Liquidation Leverage</span>
                              {liqFullscreenBtn}
                            </div>
                          </div>
                          <div className="liq-heatmap-canvas-wrap liq-heatmap-fullscreen-view" ref={liqContainerFullRef}>
                            <canvas ref={liqCanvasFullRef} className="liq-heatmap-canvas" onMouseMove={handleLiqMouseMove} onMouseLeave={handleLiqMouseLeave} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
                            {renderLiqTooltip(liqTooltip)}
                          </div>
                        </div>,
                        document.body
                      )}
                    </>
                  )
                })()}
                {marketAiTab === 'sectors' && (
                  <div className="welcome-market-ai-placeholder">{t('ui.sectorAnalysisSoon')}</div>
                )}
                {marketAiTab === 'mindshare' && (
                  <div className="welcome-market-ai-placeholder">{t('ui.mindshareSoon')}</div>
                )}
                {marketAiTab === 'calendar' && (
                  <div className="welcome-market-ai-placeholder">{t('ui.calendarSoon')}</div>
                )}
                {marketAiTab === 'flows' && (
                  <div className="welcome-market-ai-placeholder">{t('ui.flowsSoon')}</div>
                )}
                {marketAiTab === 'wallets' && (
                  <div className="welcome-market-ai-placeholder">{t('ui.walletsSoon')}</div>
                )}
              </div>
            </div>

            {/* Watchlist Panel */}
            <div className={`welcome-watchlist-panel-wrap${!watchlistOpen ? ' is-collapsed' : ''}`}>
              {/* Toggle button to collapse/expand watchlist */}
              <button
                type="button"
                className={`welcome-sidebar-toggle welcome-sidebar-toggle--right${!watchlistOpen ? ' is-closed-panel' : ''}`}
                onClick={() => setWatchlistOpen((o) => !o)}
                title={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
                aria-label={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
              >
                <span className="welcome-sidebar-toggle-icon">
                  {watchlistOpen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
                  )}
                </span>
              </button>
              <div className={`welcome-watchlist-widget welcome-watchlist-widget--dark${!watchlistOpen ? ' is-hidden' : ''}`}>
                <div className="welcome-watchlist-inner watchlist" style={{ padding: 0 }}>
                  <div className="watchlist-header-row">
                    <button
                      type="button"
                      className="watchlist-panel-toggle"
                      onClick={() => setWatchlistOpen((o) => !o)}
                      title={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
                      aria-label={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
                    >
                      {watchlistOpen ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
                      )}
                    </button>
                    <span className="watchlist-title">{t('ui.myWatchlist')}</span>
                    <button type="button" className="watchlist-see-all-btn" onClick={() => onPageChange?.('watchlists')}>
                      {t('ui.seeAll')}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  {/* Search bar */}
                  {addToWatchlist && (
                    <div className="watchlist-add-row" ref={watchlistSearchContainerRef2}>
                      <input
                        type="text"
                        className="watchlist-add-search"
                        placeholder={isStocks ? t('ui.searchStockToAdd') : t('ui.searchTokenToAdd')}
                        value={watchlistSearchQuery}
                        onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                      />
                      <button type="button" className="watchlist-add-btn" title="Add token" aria-label="Add token">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                      {watchlistSearchQuery.trim().length >= 1 && (
                        <div className="watchlist-search-dropdown">
                          {watchlistSearchLoading ? (
                            <div className="watchlist-search-loading">{t('ui.searching')}</div>
                          ) : watchlistSearchResults?.length > 0 ? (
                            watchlistSearchResults.slice(0, 6).map((r) => (
                              <button
                                key={`${r.address}-${r.networkId}`}
                                type="button"
                                className="watchlist-search-result"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('Adding to watchlist:', r)
                                  addToWatchlist(isStocks ? {
                                    symbol: r.symbol,
                                    name: r.name,
                                    price: r.price || 0,
                                    change: r.change || 0,
                                    marketCap: r.marketCap || 0,
                                    volume: r.volume || 0,
                                    logo: r.logo || getStockLogo(r.symbol, r.sector),
                                    sector: r.sector || '',
                                    exchange: r.exchange || 'NYSE',
                                    pinned: false,
                                    isStock: true,
                                  } : {
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
                                  <div className="search-result-price">{r.formattedPrice || fmtPrice(r.price)}</div>
                                  <div className={`search-result-change ${(r.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                                    {(r.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(r.change || 0).toFixed(2)}%
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <>
                              <div className="watchlist-search-empty">{isStocks ? 'No results. Popular stocks:' : 'No results. Popular tokens:'}</div>
                              {(isStocks ? [
                                { symbol: 'AAPL', name: 'Apple Inc.', isStock: true, sector: 'Technology', exchange: 'NASDAQ' },
                                { symbol: 'MSFT', name: 'Microsoft', isStock: true, sector: 'Technology', exchange: 'NASDAQ' },
                                { symbol: 'NVDA', name: 'NVIDIA', isStock: true, sector: 'Technology', exchange: 'NASDAQ' },
                                { symbol: 'TSLA', name: 'Tesla', isStock: true, sector: 'Automotive', exchange: 'NASDAQ' },
                              ] : [
                                { symbol: 'BTC', name: 'Bitcoin' },
                                { symbol: 'ETH', name: 'Ethereum' },
                                { symbol: 'SOL', name: 'Solana' },
                                { symbol: 'PEPE', name: 'Pepe' },
                              ]).filter((t) => !watchlist?.some((w) => (w.symbol || '').toUpperCase() === t.symbol)).map((t) => (
                                <button
                                  key={t.symbol}
                                  type="button"
                                  className="watchlist-search-result"
                                  onClick={() => {
                                    addToWatchlist({ symbol: t.symbol, name: t.name, pinned: false, ...(t.isStock ? { isStock: true, sector: t.sector || '', exchange: t.exchange || 'NYSE' } : {}) })
                                    setWatchlistSearchQuery('')
                                  }}
                                >
                                  <span className="watchlist-search-result-symbol">{t.symbol}</span>
                                  <span className="watchlist-search-result-name">{t.name}</span>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="watchlist-items">
                    {(isStocks ? sortedWatchlist : watchlistWithLiveData)?.length > 0 ? (
                      (isStocks ? sortedWatchlist : watchlistWithLiveData).slice(0, 8).map((token, idx) => (
                        <div
                          key={token.symbol || idx}
                          className={`watchlist-item ${token.pinned ? 'is-pinned' : ''}`}
                          style={getTokenRowStyle(token.symbol) || EMPTY_STYLE}
                          onClick={() => isStocks ? handleStockClick?.({ symbol: token.symbol, name: token.name, isStock: true }) : openTokenCardPopup(token.symbol)}
                        >
                          <div className="watchlist-item-drag">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                            </svg>
                          </div>
                          <div className="watchlist-item-info">
                            <div className="watchlist-item-avatar" style={getTokenAvatarRingStyle(token.symbol) || EMPTY_STYLE}>
                              {token.logo ? (
                                <img src={token.logo} alt="" />
                              ) : (
                                <span>{token.symbol?.[0] || '?'}</span>
                              )}
                            </div>
                            <div className="watchlist-item-text">
                              <span className="watchlist-item-symbol">{token.symbol}</span>
                              <span className="watchlist-item-name">{token.name}</span>
                            </div>
                          </div>
                          <div className="watchlist-item-stats">
                            <span className="watchlist-item-price">{token.price ? fmtPrice(token.price) : '—'}</span>
                            {token.change != null && (
                              <span className={`watchlist-item-change ${(Number(token.change) || 0) >= 0 ? 'positive' : 'negative'}`}>
                                {(Number(token.change) || 0) >= 0 ? '+' : ''}{formatChange(token.change)}%
                              </span>
                            )}
                          </div>
                          <div className="watchlist-item-actions">
                            <button
                              type="button"
                              className={`watchlist-item-pin ${token.pinned ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePinWatchlist && togglePinWatchlist(token.address || token.symbol)
                              }}
                              title={token.pinned ? t('ui.unpin') : t('ui.pinToTop')}
                            >
                              <svg viewBox="0 0 24 24" fill={token.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="watchlist-item-remove"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFromWatchlist && removeFromWatchlist(token.address || token.symbol)
                              }}
                              title={t('ui.removeFromWatchlist')}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="watchlist-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <p>{t('ui.watchlistEmpty')}</p>
                        <span>{t('ui.watchlistEmptyHint')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ORIGINAL LAYOUT (hidden when experimental is active) ===== */}
      <div id="welcome-widget" className={`welcome-sidebar-row${!(isMobile ? true : welcomeOpen) ? ' welcome-sidebar-row--welcome-closed' : ''}${!(isMobile ? true : watchlistOpen) ? ' welcome-sidebar-row--watchlist-closed' : ''}`} style={horizontalLayout && !isMobile ? { display: 'none' } : {}}>
        <div className="welcome-panel-wrap">
          <div className="welcome-widget welcome-widget-restyled welcome-widget-glass" data-tour="welcome-widget">
        {/* Row 1: Profile picture + Welcome + name input */}
        <div className="welcome-widget-row welcome-widget-profile-row">
          <div className="welcome-widget-avatar-ring">
            <label className="welcome-widget-avatar" htmlFor="welcome-avatar-input">
              {(profile?.imageUrl || '').trim() ? (
                <>
                  <img src={profile?.imageUrl || ''} alt="Profile" />
                  <span className="welcome-widget-avatar-edit" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </span>
                </>
              ) : (
                <span className="welcome-widget-avatar-placeholder">
                  <svg className="welcome-widget-avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
              )}
            </label>
            <input id="welcome-avatar-input" type="file" accept="image/*" className="welcome-widget-file" onChange={handleProfileImageChange} />
          </div>
          {/* Spectre Egg / Agent Avatar */}
          {eggStage && !agentIsBorn && (
            <div className="welcome-widget-egg" onClick={onEggClick} title={eggStarted ? `Egg progress: ${eggProgress}%` : 'Click to learn about your AI agent'}>
              <SpectreEgg stage={eggStage} size={44} mini />
              {eggStarted && <span className="welcome-widget-egg-progress">{eggProgress}%</span>}
            </div>
          )}
          {agentIsBorn && agentProfile && (
            <div className="welcome-widget-agent" onClick={onOpenAgentChat} title={`${agentProfile.agentType || 'Agent'} · Level ${agentProfile.level || 1}`}>
              <AgentAvatar agentColor={agentProfile.agentColor || '#00f0ff'} level={agentProfile.level || 1} size={38} />
            </div>
          )}
          <div className="welcome-widget-text">
            <div className="welcome-widget-title-row">
              <span className="welcome-widget-label">{isStocks ? t('ui.welcomeStocks') : t('ui.welcome')}</span>
              <div className="welcome-widget-actions">
                {onPageChange && (
                  <>
                    <button
                      type="button"
                      className="welcome-widget-action-link"
                      onClick={() => onPageChange('glossary')}
                      aria-label={t('ui.glossary')}
                      data-tour="learn-terms"
                    >
                      {t('ui.glossary')}
                    </button>
                    <button
                      type="button"
                      className="welcome-widget-action-link"
                      onClick={() => { setTourActive(true); setTourStep(0) }}
                      aria-label={t('ui.takeATour')}
                    >
                      {t('ui.takeATour')}
                    </button>
                  </>
                )}
              </div>
            </div>
            {isEditingName ? (
              <div className="welcome-widget-name-edit-row">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draftName ?? ''}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={t('ui.enterYourName')}
                  className="welcome-widget-input"
                  onKeyDown={(e) => e.key === 'Escape' && setIsEditingName(false)}
                />
                <button
                  type="button"
                  className={`welcome-widget-check ${profileSaved ? 'is-saved' : ''}`}
                  onClick={handleProfileSave}
                  aria-label="Approve name"
                >
                  {icons.check}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`welcome-widget-name-display ${!(profile?.name || '').trim() ? 'is-placeholder' : ''}`}
                onClick={handleStartEditingName}
              >
                {(profile?.name || '').trim() || t('ui.enterYourName')}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Top assets only (CME Gaps is next to US Market below) */}
        <div className="welcome-widget-row welcome-widget-market-cme-row">
          <div className="welcome-widget-prices-row welcome-widget-prices-compact" data-tour="top-assets">
            {isStocks ? (
              <>
                {welcomeAssets.slice(0, 3).map((asset) => {
                  const price = asset.price
                  const change = asset.change
                  return (
                    <div
                      key={asset.symbol}
                      role="button"
                      tabIndex={0}
                      className="welcome-widget-price-card"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStockClick(asset) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleStockClick(asset)}
                    >
                      <div className="welcome-widget-price-card-head">
                        {asset.logo ? (
                          <img src={asset.logo} alt="" className="welcome-widget-price-logo" onError={(e) => { e.target.style.display = 'none' }} />
                        ) : (
                          <span className="welcome-widget-price-avatar stock">{asset.symbol.slice(0, 2)}</span>
                        )}
                        <span className="welcome-widget-price-symbol">{asset.symbol}</span>
                      </div>
                      <div className="welcome-widget-price-value">{price > 0 ? fmtPrice(price) : '—'}</div>
                      {change != null && (
                        <div className={`welcome-widget-price-change ${change >= 0 ? 'positive' : 'negative'}`}>
                          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {WELCOME_COINS.slice(0, 3).map((symbol) => {
                  const data = topCoinPrices?.[symbol] || topCoinPrices?.[symbol.toUpperCase()]
                  const price = data?.price != null && data.price > 0 ? Number(data.price) : null
                  const change = data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : null)
                  const logo = TOKEN_LOGOS[symbol]
                  return (
                    <div
                      key={symbol}
                      role="button"
                      tabIndex={0}
                      className="welcome-widget-price-card"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openTokenCardPopup(symbol)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && openTokenCardPopup(symbol)}
                    >
                      <div className="welcome-widget-price-card-head">
                        {logo && <img src={logo} alt="" className="welcome-widget-price-logo" />}
                        <span className="welcome-widget-price-symbol">{symbol}</span>
                        <button
                          type="button"
                          className="welcome-topcoin-info-btn"
                          aria-label={`Info about ${symbol}`}
                          onClick={(e) => { e.stopPropagation(); openTopCoinInfo(symbol, e) }}
                        >
                          i
                        </button>
                      </div>
                      <div className="welcome-widget-price-value">{price != null ? fmtPrice(price) : '—'}</div>
                      {change != null && (
                        <div className={`welcome-widget-price-change ${change >= 0 ? 'positive' : 'negative'}`}>
                          {change >= 0 ? '▲' : '▼'} {formatChange(change)}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Top coin info popover (project description + price performance) */}
        {topCoinInfoOpen && (() => {
          const sym = topCoinInfoOpen
          const anchor = topCoinInfoAnchorRef.current
          const data = topCoinPrices?.[sym]
          const coin = TOP_COINS.find((c) => c.symbol === sym)
          const name = coin?.name || sym
          const logo = TOKEN_LOGOS[sym]
          const price = data?.price != null ? Number(data.price) : null
          const mcap = data?.marketCap != null ? Number(data.marketCap) : 0
          const vol = data?.volume != null ? Number(data.volume) : 0
          const ch1 = data?.change1h != null ? Number(data.change1h) : null
          const ch24 = data?.change != null ? Number(data.change) : (data?.change24 != null ? Number(data.change24) : null)
          const ch7 = data?.change7d != null ? Number(data.change7d) : null
          const desc = COIN_DESCRIPTIONS[sym] || ''
          return createPortal(
            <div
              ref={topCoinInfoPopoverRef}
              className={`welcome-topcoin-info-popover${dayMode ? ' day-mode' : ''}`}
              style={{ top: anchor.top, left: anchor.left }}
              role="dialog"
              aria-label={`${name} info`}
            >
              <div className="welcome-topcoin-info-arrow" aria-hidden />
              <div className="welcome-topcoin-info-header">
                {logo ? <img src={logo} alt="" className="welcome-topcoin-info-logo" /> : <span className="welcome-topcoin-info-symbol-only">{sym.slice(0, 2)}</span>}
                <div>
                  <span className="welcome-topcoin-info-name">{name}</span>
                  <span className="welcome-topcoin-info-symbol">{sym}</span>
                </div>
              </div>
              {desc && <p className="welcome-topcoin-info-desc">{desc}</p>}
              <div className="welcome-topcoin-info-metrics">
                <div className="welcome-topcoin-info-metric">
                  <span className="welcome-topcoin-info-metric-label">PRICE</span>
                  <span className="welcome-topcoin-info-metric-value">{price != null ? fmtPrice(price) : '—'}</span>
                </div>
                <div className="welcome-topcoin-info-metric">
                  <span className="welcome-topcoin-info-metric-label">MARKET CAP</span>
                  <span className="welcome-topcoin-info-metric-value">{mcap > 0 ? fmtLarge(mcap) : '—'}</span>
                </div>
                <div className="welcome-topcoin-info-metric">
                  <span className="welcome-topcoin-info-metric-label">VOLUME 24H</span>
                  <span className="welcome-topcoin-info-metric-value">{vol > 0 ? fmtLarge(vol) : '—'}</span>
                </div>
              </div>
              <div className="welcome-topcoin-info-performance">
                <div className="welcome-topcoin-info-perf">
                  <span className="welcome-topcoin-info-perf-label">1H</span>
                  <span className={`welcome-topcoin-info-perf-value ${ch1 != null ? (ch1 >= 0 ? 'positive' : 'negative') : ''}`}>
                    {ch1 != null ? `${ch1 >= 0 ? '+' : ''}${formatChange(ch1)}%` : '—'}
                  </span>
                </div>
                <div className="welcome-topcoin-info-perf">
                  <span className="welcome-topcoin-info-perf-label">24H</span>
                  <span className={`welcome-topcoin-info-perf-value ${ch24 != null ? (ch24 >= 0 ? 'positive' : 'negative') : ''}`}>
                    {ch24 != null ? `${ch24 >= 0 ? '+' : ''}${formatChange(ch24)}%` : '—'}
                  </span>
                </div>
                <div className="welcome-topcoin-info-perf">
                  <span className="welcome-topcoin-info-perf-label">7D</span>
                  <span className={`welcome-topcoin-info-perf-value ${ch7 != null ? (ch7 >= 0 ? 'positive' : 'negative') : ''}`}>
                    {ch7 != null ? `${ch7 >= 0 ? '+' : ''}${formatChange(ch7)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>,
            document.body
          )
        })()}

        {/* Row 3: Fear & Greed + Alt Season (crypto) OR Fear & Greed + Risk On/Off (stocks) */}
        <div className="welcome-widget-row welcome-widget-indices-row" data-tour="sentiment">
          <div
            className="welcome-widget-fear-greed-compact"
            data-sentiment={isStocks
              ? (liveVix?.price != null ? (liveVix.price >= 25 ? 'fear' : liveVix.price <= 15 ? 'greed' : 'neutral') : 'neutral')
              : (fearGreed.value != null ? (fearGreed.value >= 56 ? 'greed' : fearGreed.value <= 45 ? 'fear' : 'neutral') : 'neutral')
            }
            role="img"
            aria-label={isStocks ? `VIX ${liveVix?.price?.toFixed(2) ?? '—'}` : `Fear and Greed ${fearGreed.value ?? '—'} / 100`}
          >
            <div className="welcome-widget-fng-compact-content">
              <span className="welcome-widget-fng-compact-label">{isStocks ? 'VIX Index' : 'Fear & Greed'}</span>
              <div className="welcome-widget-fng-compact-value-group">
                <span className="welcome-widget-fng-compact-value">{isStocks ? (liveVix?.price != null ? liveVix.price.toFixed(2) : '—') : (fearGreed.value != null ? fearGreed.value : '—')}</span>
                <span className="welcome-widget-fng-compact-classification">{isStocks ? (liveVix?.label || '—') : (fearGreed.classification || '—')}</span>
              </div>
            </div>
            <div className="welcome-widget-fng-compact-bar">
              <div className="welcome-widget-fng-compact-bar-fill" style={{
                width: isStocks
                  ? `${Math.min(100, Math.max(0, liveVix?.price != null ? ((liveVix.price - 10) / 30) * 100 : 0))}%`
                  : `${Math.min(100, Math.max(0, fearGreed.value ?? 0))}%`
              }} />
            </div>
          </div>
          {isStocks ? (
            <div className="welcome-widget-alt-season-compact welcome-widget-risk-on-off" role="img" aria-label={`Risk On/Off ${stocksRiskOnOff.value} / 100`}>
              <div className="welcome-widget-alt-compact-content">
                <span className="welcome-widget-alt-compact-label">Risk On/Off</span>
                <div className="welcome-widget-alt-compact-value-group">
                  <span className="welcome-widget-alt-compact-value">{stocksRiskOnOff.value != null ? stocksRiskOnOff.value : '—'}</span>
                  <span className="welcome-widget-alt-compact-classification">{stocksRiskOnOff.label}</span>
                </div>
                <div className="welcome-widget-alt-compact-shares">
                  <span className="welcome-widget-alt-compact-share"><span className="welcome-widget-alt-compact-dot btc" /> S&P {stocksRiskOnOff.sp500}%</span>
                  <span className="welcome-widget-alt-compact-share"><span className="welcome-widget-alt-compact-dot eth" /> Nasdaq {stocksRiskOnOff.nasdaq}%</span>
                </div>
              </div>
              <div className="welcome-widget-alt-compact-bar">
                <div className="welcome-widget-alt-compact-bar-fill" style={{ width: `${Math.min(100, Math.max(0, stocksRiskOnOff.value ?? 0))}%` }} />
              </div>
            </div>
          ) : (
            <div className="welcome-widget-alt-season-compact" role="img" aria-label={`Alt Season ${altSeason.value} / 100`}>
              <div className="welcome-widget-alt-compact-content">
                <span className="welcome-widget-alt-compact-label">{t('ui.altSeason')}</span>
                <div className="welcome-widget-alt-compact-value-group">
                  <span className="welcome-widget-alt-compact-value">{altSeason.value != null ? altSeason.value : '—'}</span>
                  <span className="welcome-widget-alt-compact-classification">{altSeason.label}</span>
                </div>
                <div className="welcome-widget-alt-compact-shares">
                  <span className="welcome-widget-alt-compact-share"><span className="welcome-widget-alt-compact-dot btc" /> BTC {altSeason.btcShare}%</span>
                  <span className="welcome-widget-alt-compact-share"><span className="welcome-widget-alt-compact-dot eth" /> ETH {altSeason.ethShare}%</span>
                </div>
              </div>
              <div className="welcome-widget-alt-compact-bar">
                <div className="welcome-widget-alt-compact-bar-fill" style={{ width: `${Math.min(100, Math.max(0, altSeason.value ?? 0))}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Row 3.5: Market Dominance (crypto) OR Index Allocation – S&P, Nasdaq, Small-cap, Commodities/Gold (stocks) */}
        <div className="welcome-widget-row welcome-widget-dominance-row">
          <div className="welcome-widget-dominance-compact">
            <div className="welcome-widget-dominance-header">
              <span className="welcome-widget-dominance-label">{isStocks ? t('ui.indexAllocation') : t('ui.marketDominance')}</span>
            </div>
            <div className="welcome-widget-dominance-bar-container">
              {isStocks ? (
                <>
                  <div className="welcome-widget-dominance-bar-stacked" role="img" aria-label={`Index allocation S&P ${indexAllocation.sp500.toFixed(1)}% Nasdaq ${indexAllocation.nasdaq.toFixed(1)}% Small-cap ${indexAllocation.smallCap.toFixed(1)}% Commodities/Gold ${indexAllocation.commodities.toFixed(1)}%`}>
                    <div className="welcome-widget-dominance-segment btc" style={{ width: `${indexAllocation.sp500}%` }} title={`S&P 500 ${indexAllocation.sp500.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment eth" style={{ width: `${indexAllocation.nasdaq}%` }} title={`Nasdaq ${indexAllocation.nasdaq.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment sol" style={{ width: `${indexAllocation.smallCap}%` }} title={`Small-cap ${indexAllocation.smallCap.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment alts" style={{ width: `${indexAllocation.commodities}%` }} title={`Commodities / Gold ${indexAllocation.commodities.toFixed(1)}%`} />
                  </div>
                  <div className="welcome-widget-dominance-legend">
                    <div className="welcome-widget-dominance-legend-item" data-asset="btc">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>S&P 500</strong> {indexAllocation.sp500.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="eth">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>Nasdaq</strong> {indexAllocation.nasdaq.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="sol">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>Small-cap</strong> {indexAllocation.smallCap.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="alts">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>Commodities / Gold</strong> {indexAllocation.commodities.toFixed(1)}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="welcome-widget-dominance-bar-stacked" role="img" aria-label={`Market dominance BTC ${marketDominance.btc.toFixed(1)}% ETH ${marketDominance.eth.toFixed(1)}% SOL ${marketDominance.sol.toFixed(1)}% Alts ${marketDominance.alts.toFixed(1)}%`}>
                    <div className="welcome-widget-dominance-segment btc" style={{ width: `${marketDominance.btc}%` }} title={`BTC ${marketDominance.btc.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment eth" style={{ width: `${marketDominance.eth}%` }} title={`ETH ${marketDominance.eth.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment sol" style={{ width: `${marketDominance.sol}%` }} title={`SOL ${marketDominance.sol.toFixed(1)}%`} />
                    <div className="welcome-widget-dominance-segment alts" style={{ width: `${marketDominance.alts}%` }} title={`Alts ${marketDominance.alts.toFixed(1)}%`} />
                  </div>
                  <div className="welcome-widget-dominance-legend">
                    <div className="welcome-widget-dominance-legend-item" data-asset="btc">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>BTC</strong> {marketDominance.btc.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="eth">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>ETH</strong> {marketDominance.eth.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="sol">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>SOL</strong> {marketDominance.sol.toFixed(1)}%</span>
                    </div>
                    <div className="welcome-widget-dominance-legend-item" data-asset="alts">
                      <span className="welcome-widget-dominance-legend-dot" aria-hidden />
                      <span className="welcome-widget-dominance-legend-text"><strong>Alts</strong> {marketDominance.alts.toFixed(1)}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: US Market + CME Gaps – Apple-style side by side */}
        <div className="welcome-widget-row welcome-widget-us-market-cme-row">
          <div className={`welcome-widget-us-market ${usMarketStatus.isOpen ? 'is-open' : 'is-closed'}`}>
            <div className="welcome-widget-us-market-badge">
              <span className={`welcome-widget-us-market-indicator ${usMarketStatus.isOpen ? 'is-open' : 'is-closed'}`} />
              <span className="welcome-widget-us-market-badge-label">{usMarketStatus.isOpen ? 'Live' : 'Closed'}</span>
            </div>
            <div className="welcome-widget-us-market-body">
              <div className="welcome-widget-us-market-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <div className="welcome-widget-us-market-info">
                <span className="welcome-widget-us-market-title">US Market</span>
                <span className="welcome-widget-us-market-time">{usMarketStatus.timeMain}</span>
              </div>
            </div>
            {usMarketStatus.countdown && (
              <div className="welcome-widget-us-market-countdown">{usMarketStatus.countdown}</div>
            )}
          </div>
          <div className="welcome-widget-cme-gap">
            <div className="welcome-widget-cme-gap-header">
              <div className="welcome-widget-cme-gap-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              </div>
              <span className="welcome-widget-cme-gap-title">CME Gaps</span>
            </div>
            <div className="welcome-widget-cme-gap-list">
              <div className="welcome-widget-cme-gap-item">
                <span className="welcome-widget-cme-gap-symbol">BTC</span>
                <span className="welcome-widget-cme-gap-range">$91,200 – $93,400</span>
                <span className="welcome-widget-cme-gap-tag unfilled">Unfilled</span>
              </div>
              <div className="welcome-widget-cme-gap-item">
                <span className="welcome-widget-cme-gap-symbol">ETH</span>
                <span className="welcome-widget-cme-gap-range">$2,480 – $2,520</span>
                <span className="welcome-widget-cme-gap-tag filled">Filled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spotify widget - compact embed below US Market */}
        <div className="welcome-widget-spotify">
          <span className="welcome-widget-spotify-label">Spotify</span>
          <div className="welcome-widget-spotify-embed">
            <iframe
              src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
              title="Spotify Playlist"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="welcome-widget-spotify-iframe"
            />
          </div>
        </div>

        {/* Fear & Greed Widget with Market Regime Badge */}
        {!isStocks && (
          <div className="welcome-widget-row welcome-widget-fear-greed-row">
            <FearGreedWidget />
          </div>
        )}
          </div>
          <button
            type="button"
            className={`welcome-sidebar-toggle welcome-sidebar-toggle--left${!welcomeOpen ? ' is-closed-panel' : ''}`}
            onClick={() => setWelcomeOpen((o) => !o)}
            title={welcomeOpen ? 'Close welcome widget' : 'Open welcome widget'}
            aria-label={welcomeOpen ? 'Close welcome widget' : 'Open welcome widget'}
          >
            <span className="welcome-sidebar-toggle-icon">
              {welcomeOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
              )}
            </span>
            {!welcomeOpen && <span className="welcome-sidebar-toggle-label">Welcome</span>}
          </button>
        </div>

        {/* Market AI widget – section header + tabs (toolbar style with icons) */}
        <div id="command-center" className="welcome-market-ai-widget" data-tour="command-center">
          <h3 className="welcome-market-ai-section-title">
            <span className="welcome-market-ai-title-icon" aria-hidden>{icons.aiAnalysis}</span>
            {isStocks ? 'Stocks · Command Center' : 'Command Center'}
          </h3>
          <div className="welcome-market-ai-tabs">
            {marketAiTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`welcome-market-ai-tab ${marketAiTab === tab.id ? 'active' : ''}`}
                onClick={() => setMarketAiTab(tab.id)}
              >
                <span className="welcome-market-ai-tab-icon" aria-hidden>{marketAiTabIcons[tab.id]}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="welcome-market-ai-toolbar">
            {marketAiTab === 'analysis' && (
              <>
                <span className="welcome-market-ai-live">LIVE</span>
                <div className="welcome-market-ai-timeframes">
                  {marketAiTimeframes.map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      className={`welcome-market-ai-tf ${marketAiTimeframe === tf.id ? 'active' : ''}`}
                      onClick={() => setMarketAiTimeframe(tf.id)}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {marketAiTab === 'news' && (
              <label className="welcome-market-ai-toggle">
                <span className="welcome-market-ai-toggle-label">X</span>
                <input
                  type="checkbox"
                  checked={newsXToggle}
                  onChange={(e) => setNewsXToggle(e.target.checked)}
                />
                <span className="welcome-market-ai-toggle-slider" />
              </label>
            )}
            {marketAiTab === 'heatmaps' && (
              <label className="welcome-market-ai-toggle">
                <span className="welcome-market-ai-toggle-label">Bubbles</span>
                <input
                  type="checkbox"
                  checked={heatmapsBubblesToggle}
                  onChange={(e) => setHeatmapsBubblesToggle(e.target.checked)}
                />
                <span className="welcome-market-ai-toggle-slider" />
              </label>
            )}
          </div>
          <div className="welcome-market-ai-content">
            {/* ── AI Brief tab (matches horizontal layout Instance 1) ── */}
            {marketAiTab === 'brief' && (
              <div className="cab-tab-content" style={{ '--sentiment-rgb': (() => {
                if (isStocks) {
                  const v = liveVix?.price
                  if (v != null && v >= 25) return '239, 68, 68'
                  if (v != null && v <= 15) return '34, 197, 94'
                  return '139, 92, 246'
                }
                const fng = fearGreed?.value
                if (fng >= 65) return '34, 197, 94'
                if (fng <= 35) return '239, 68, 68'
                return '139, 92, 246'
              })() }}
                onMouseEnter={() => { briefPausedRef.current = true }}
                onMouseLeave={() => { briefPausedRef.current = false }}
                onTouchStart={handleBriefTouchStart}
                onTouchEnd={handleBriefTouchEnd}
              >
                <div className="cab-tab-glow" />
                <div className="cab-tab-eyebrow">
                  <div className="cab-tab-eyebrow-left">
                    <span className="cab-tab-pulse" />
                    <span className="cab-tab-label">{t('cinemaBrief.title')}</span>
                  </div>
                  <div className="cab-tab-eyebrow-right">
                    <span className="cab-tab-live">{t('ticker.live')}</span>
                    <BriefAudioPlayer
                      briefText={briefDisplay}
                      sentimentRgb={(() => {
                        if (isStocks) {
                          const v = liveVix?.price
                          if (v != null && v >= 25) return '239, 68, 68'
                          if (v != null && v <= 15) return '34, 197, 94'
                          return '139, 92, 246'
                        }
                        const fng = fearGreed?.value
                        if (fng >= 65) return '34, 197, 94'
                        if (fng <= 35) return '239, 68, 68'
                        return '139, 92, 246'
                      })()}
                      isFullBrief={terminalIsFullBrief}
                    />
                    <span className="cab-tab-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <blockquote className={`cab-tab-statement ${briefFading ? 'cab-tab-fading' : 'cab-tab-visible'}${terminalIsFullBrief ? ' cab-tab-statement-full' : ''}`}>
                  <span className="cab-tab-quote">&ldquo;</span>
                  {briefDisplay || t('common.loading')}
                  <span className="cab-tab-quote">&rdquo;</span>
                </blockquote>
                {allBriefStatements.length > 1 && (
                  <div className="cab-tab-rotation-nav">
                    {allBriefStatements.map((_, idx) => {
                      const isOutlookDot = idx === allBriefStatements.length - 1 && allBriefStatements.length >= 6
                      return (
                      <button
                        key={idx}
                        className={`cab-tab-dot ${idx === briefIndex ? 'active' : ''}${isOutlookDot ? ' cab-tab-dot-full' : ''}`}
                        onClick={() => goToBrief(idx)}
                        title={[t('cinemaBrief.sentiment'), t('cinemaBrief.session'), t('cinemaBrief.narrative'), t('cinemaBrief.psychology'), t('cinemaBrief.macro'), t('cinemaBrief.aiOutlook')][idx] || `Brief ${idx + 1}`}
                      >
                        <span className="cab-tab-dot-fill" />
                        {idx === briefIndex && (
                          <svg className="cab-tab-dot-progress" viewBox="0 0 20 20">
                            <circle
                              cx="10" cy="10" r="8"
                              fill="none"
                              stroke={`rgb(${(() => {
                                const v = liveVix?.price
                                if (v != null && v >= 25) return '239, 68, 68'
                                if (v != null && v <= 15) return '34, 197, 94'
                                return '139, 92, 246'
                              })()})`}
                              strokeWidth="2"
                              strokeDasharray="50.27"
                              strokeDashoffset="0"
                              className="cab-tab-dot-circle"
                              style={{ animationDuration: `${getTerminalBriefInterval(idx)}ms` }}
                            />
                          </svg>
                        )}
                      </button>
                      )
                    })}
                  </div>
                )}
                <div className="cab-tab-attribution">
                  — <span className="cab-tab-brand">SPECTRE AI</span> · {terminalIsFullBrief ? t('cinemaBrief.aiOutlook') : t('cinemaBrief.justNow')}
                </div>
                <div className="cab-tab-chips">
                  {/* F&G or VIX */}
                  <div className="cab-tab-chip" style={{ '--chip-rgb': (() => {
                    if (isStocks) {
                      const v = liveVix?.price
                      if (v != null && v >= 25) return '239, 68, 68'
                      if (v != null && v <= 15) return '34, 197, 94'
                      return '139, 92, 246'
                    }
                    const fng = fearGreed?.value
                    if (fng >= 65) return '34, 197, 94'
                    if (fng <= 35) return '239, 68, 68'
                    return '139, 92, 246'
                  })() }}>
                    <span className="cab-tab-chip-label">{isStocks ? 'VIX' : 'FEAR & GREED'}</span>
                    <span className="cab-tab-chip-value">{isStocks ? (liveVix?.price != null ? liveVix.price.toFixed(2) : '—') : (fearGreed?.value ?? '—')}</span>
                    <span className="cab-tab-chip-sub">{isStocks ? (liveVix?.label || 'N/A') : (fearGreed?.classification || 'Neutral')}</span>
                  </div>
                  {/* Bias */}
                  <div className="cab-tab-chip" style={{ '--chip-rgb': macroAnalysisData?.bias === 'bullish' ? '34, 197, 94' : macroAnalysisData?.bias === 'bearish' ? '239, 68, 68' : '139, 92, 246' }}>
                    <span className="cab-tab-chip-label">BIAS</span>
                    <span className="cab-tab-chip-value" style={{ color: `rgb(${macroAnalysisData?.bias === 'bullish' ? '34, 197, 94' : macroAnalysisData?.bias === 'bearish' ? '239, 68, 68' : '139, 92, 246'})` }}>
                      {(macroAnalysisData?.bias || 'neutral').toUpperCase()}
                    </span>
                    <span className="cab-tab-chip-sub">{macroAnalysisData?.tfLabel || '24h'}</span>
                  </div>
                  {/* BTC / ETH / SOL (crypto) or SPY / QQQ / AAPL (stocks) */}
                  {(isStocks ? ['SPY', 'QQQ', 'AAPL'] : ['BTC', 'ETH', 'SOL']).map((sym) => {
                    const d = isStocks ? stockPrices?.[sym] : topCoinPrices?.[sym]
                    if (!d?.price) return null
                    const ch = parseFloat(d.change) || 0
                    return (
                      <div key={sym} className="cab-tab-chip" style={{ '--chip-rgb': ch >= 0 ? '34, 197, 94' : '239, 68, 68' }}>
                        <span className="cab-tab-chip-label">{sym}</span>
                        <span className="cab-tab-chip-value">
                          ${typeof d.price === 'number'
                            ? d.price.toLocaleString(undefined, { maximumFractionDigits: d.price < 10 ? 2 : 0 })
                            : parseFloat(d.price).toLocaleString(undefined, { maximumFractionDigits: parseFloat(d.price) < 10 ? 2 : 0 })
                          }
                        </span>
                        <span className={`cab-tab-chip-change ${ch >= 0 ? 'pos' : 'neg'}`}>
                          {ch >= 0 ? '+' : ''}{ch.toFixed(2)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Instance 2 — uses same IIFE pattern as Instance 1 */}
            {marketAiTab === 'analysis' && (() => {
              if (!macroAnalysisData) return (
                <div className="welcome-market-ai-analysis-full"><div className="ai-mkt-loading"><div className="ai-mkt-loading-pulse" /><span>{t('ui.analyzingMarketData')}</span></div></div>
              )
              const biasVal = macroAnalysisData.bias === 'bullish' ? 78 : macroAnalysisData.bias === 'bearish' ? 22 : 50
              const avg = macroAnalysisData.tableData.reduce((s, r) => s + Math.abs(r.change || 0), 0) / 3
              const vol = avg > 4 ? 'High' : avg > 1.5 ? 'Moderate' : 'Low'
              const strength = Math.min(Math.round(avg * 12), 100)
              return (
              <div className="welcome-market-ai-analysis-full">
                <div className={`ai-mkt-hero bias-${macroAnalysisData.bias}`}>
                  <div className="ai-mkt-hero-glow" />
                  <div className="ai-mkt-hero-content">
                    <div className="ai-mkt-hero-left">
                      <div className="ai-mkt-hero-badge"><span className="ai-mkt-hero-dot" /><span className="ai-mkt-hero-label">AI Signal</span></div>
                      <div className="ai-mkt-hero-bias">{macroAnalysisData.bias.toUpperCase()}</div>
                      <div className="ai-mkt-hero-meter">
                        <div className="ai-mkt-hero-meter-track"><div className="ai-mkt-hero-meter-fill" style={{ width: `${biasVal}%` }} /><div className="ai-mkt-hero-meter-thumb" style={{ left: `${biasVal}%` }} /></div>
                        <div className="ai-mkt-hero-meter-labels"><span>Bear</span><span>Neutral</span><span>Bull</span></div>
                      </div>
                    </div>
                    <div className="ai-mkt-hero-right">
                      <div className="ai-mkt-hero-stats">
                        <div className="ai-mkt-hero-stat"><span className="ai-mkt-hero-stat-val">{vol}</span><span className="ai-mkt-hero-stat-label">Volatility</span></div>
                        <div className="ai-mkt-hero-stat-divider" />
                        <div className="ai-mkt-hero-stat"><span className="ai-mkt-hero-stat-val">{strength}%</span><span className="ai-mkt-hero-stat-label">Conviction</span></div>
                        <div className="ai-mkt-hero-stat-divider" />
                        <div className="ai-mkt-hero-stat"><span className="ai-mkt-hero-stat-val">{macroAnalysisData.tfLabel}</span><span className="ai-mkt-hero-stat-label">Timeframe</span></div>
                      </div>
                      <div className="ai-mkt-hero-chips">
                        {macroAnalysisData.tableData.map((row) => (<div key={row.asset} className={`ai-mkt-chip signal-${row.signal?.toLowerCase().replace(/\s/g, '-')}`}><span className="ai-mkt-chip-name">{row.asset}</span><span className="ai-mkt-chip-sig">{row.signal}</span></div>))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ai-mkt-terminal">
                  <div className="ai-mkt-terminal-header"><div className="ai-mkt-terminal-dots"><span /><span /><span /></div><span className="ai-mkt-terminal-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>spectre:ai/{macroAnalysisData.tfLabel.replace(/\s/g, '-')}</span><span className="ai-mkt-terminal-live"><span className="ai-mkt-live-dot" />live</span></div>
                  <div className="ai-mkt-terminal-body"><p className="ai-mkt-terminal-line"><span className="ai-mkt-terminal-prompt">$</span> <span className="ai-mkt-terminal-cmd">analyze --outlook</span></p><p className="ai-mkt-terminal-line ai-mkt-terminal-output">{macroAnalysisData.p1.replace(/^[\w-]+\s+OUTLOOK\s+—\s*/, '')}</p></div>
                </div>
                <div className="ai-mkt-trio">
                  <div className="ai-mkt-trio-card"><div className="ai-mkt-trio-header"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><span>Macro</span></div><p className="ai-mkt-trio-text">{macroAnalysisData.p2.replace(/^MACRO CONDITIONS\s+—\s*/, '')}</p></div>
                  <div className={`ai-mkt-trio-center bias-${macroAnalysisData.bias}`}><div className="ai-mkt-pulse-ring"><div className="ai-mkt-pulse-ring-inner" /></div><div className="ai-mkt-pulse-label">AI Confidence</div><div className="ai-mkt-pulse-value">{strength}%</div><div className="ai-mkt-pulse-bar"><div className="ai-mkt-pulse-bar-fill" style={{ width: `${strength}%` }} /></div><div className="ai-mkt-pulse-signals">{macroAnalysisData.tableData.map((row) => (<div key={row.asset} className="ai-mkt-pulse-sig"><span className="ai-mkt-pulse-sig-name">{row.asset}</span><span className={`ai-mkt-pulse-sig-val ${(row.change >= 0) ? 'pos' : 'neg'}`}>{row.change >= 0 ? '+' : ''}{(row.change || 0).toFixed(1)}%</span></div>))}</div></div>
                  <div className={`ai-mkt-trio-card ai-mkt-trio-action bias-${macroAnalysisData.bias}`}><div className="ai-mkt-trio-header"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Positioning</span></div><p className="ai-mkt-trio-text">{macroAnalysisData.p3.replace(/^POSITIONING\s+—\s*/, '')}</p></div>
                </div>
              </div>
              )
            })()}
            {marketAiTab === 'news' && (
              <div className="news-feed-panel">
                <div className="news-feed-list">
                  {[
                    {
                      id: 1,
                      source: 'CoinDesk',
                      title: 'Bitcoin Surges Past $89K as Institutional Demand Accelerates',
                      summary: 'Major asset managers report record inflows into BTC ETFs, signaling renewed institutional confidence.',
                      time: '12m ago',
                      category: 'Markets',
                      sentiment: 'bullish',
                    },
                    {
                      id: 2,
                      source: 'The Block',
                      title: 'Ethereum Layer 2 TVL Hits All-Time High of $45B',
                      summary: 'Base and Arbitrum lead the charge as scaling solutions gain mainstream adoption.',
                      time: '28m ago',
                      category: 'DeFi',
                      sentiment: 'bullish',
                    },
                    {
                      id: 3,
                      source: 'Decrypt',
                      title: 'SEC Delays Decision on Solana ETF Applications',
                      summary: 'Regulators request additional comments, pushing expected ruling to Q2.',
                      time: '1h ago',
                      category: 'Regulation',
                      sentiment: 'neutral',
                    },
                    {
                      id: 4,
                      source: 'Cointelegraph',
                      title: 'Whale Alert: 50,000 BTC Moved from Coinbase to Unknown Wallet',
                      summary: 'On-chain analysts speculate institutional accumulation amid current price levels.',
                      time: '2h ago',
                      category: 'On-Chain',
                      sentiment: 'bullish',
                    },
                    {
                      id: 5,
                      source: 'Bloomberg Crypto',
                      title: 'Fed Minutes Suggest Rate Cuts Could Begin in Q2',
                      summary: 'Risk assets rally as traders price in looser monetary policy.',
                      time: '3h ago',
                      category: 'Macro',
                      sentiment: 'bullish',
                    },
                  ].map((news) => (
                    <div key={news.id} className="news-feed-item">
                      <div className="news-feed-item-header">
                        <div className="news-feed-source">
                          <span className="news-feed-source-icon" aria-hidden>{icons.news}</span>
                          <span className="news-feed-source-name">{news.source}</span>
                        </div>
                        <span className="news-feed-time">{news.time}</span>
                      </div>
                      <h4 className="news-feed-title">{news.title}</h4>
                      <p className="news-feed-summary">{news.summary}</p>
                      <div className="news-feed-item-footer">
                        <span className="news-feed-category">{news.category}</span>
                        <span className={`news-feed-sentiment ${news.sentiment}`}>
                          {news.sentiment === 'bullish' ? <span className="sentiment-dot bullish" /> : news.sentiment === 'bearish' ? <span className="sentiment-dot bearish" /> : <span className="sentiment-dot neutral" />}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {newsXToggle && (
                  <div className="news-feed-x-section">
                    <div className="news-feed-x-header">
                      <span className="news-feed-x-icon">𝕏</span>
                      <span className="news-feed-x-label">Crypto Twitter</span>
                    </div>
                    <div className="news-feed-x-list">
                      {[
                        { handle: '@100xAnalyst', text: 'BTC structure looks incredibly strong. Higher lows forming on the 4H. Next leg up incoming.', time: '5m' },
                        { handle: '@DefiWhale', text: 'Just bridged $2M to Base. The ecosystem is exploding. $AERO looking prime.', time: '18m' },
                        { handle: '@CryptoVeteran', text: 'Remember: volatility = opportunity. Stay focused on the bigger picture.', time: '32m' },
                      ].map((tweet, i) => (
                        <div key={i} className="news-feed-x-item">
                          <span className="news-feed-x-handle">{tweet.handle}</span>
                          <p className="news-feed-x-text">{tweet.text}</p>
                          <span className="news-feed-x-time">{tweet.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {marketAiTab === 'heatmaps' && (
              <div className="welcome-market-ai-placeholder">
                Heatmaps view {heatmapsBubblesToggle ? '(Bubbles on)' : '(Bubbles off)'}. Content coming soon.
              </div>
            )}
            {marketAiTab === 'liquidation' && (
              <div className="welcome-market-ai-placeholder" style={{ fontSize: '0.8rem' }}>Switch to the horizontal layout to view the BTC Liquidation Heatmap.</div>
            )}
            {marketAiTab === 'sector' && (
              <div className="welcome-market-ai-placeholder">Sectors. Content coming soon.</div>
            )}
            {marketAiTab === 'mindshare' && (
              <div className="narrative-lifecycle-panel">
                <div className="narrative-lifecycle-header">
                  <span className="narrative-lifecycle-title">Narrative Lifecycle</span>
                  <span className="narrative-lifecycle-live">LIVE</span>
                </div>
                <p className="narrative-lifecycle-tagline">Everyone buys narratives late. This solves that.</p>
                <div className="narrative-lifecycle-timeline" role="img" aria-label="Lifecycle: Early to Exhausted">
                  {narrativeLifecycleStages.map((stage, i) => (
                    <div key={stage} className="narrative-lifecycle-timeline-seg">
                      <span className="narrative-lifecycle-timeline-label">{stage}</span>
                      {i < narrativeLifecycleStages.length - 1 && <span className="narrative-lifecycle-timeline-arrow" aria-hidden>→</span>}
                    </div>
                  ))}
                </div>
                <ul className="narrative-lifecycle-list" aria-label="Narratives by lifecycle stage">
                  {narrativeLifecycleData.map((n) => (
                    <li key={n.id} className={`narrative-lifecycle-item narrative-lifecycle-item--${n.color}`}>
                      <span className="narrative-lifecycle-dot" aria-hidden />
                      <span className="narrative-lifecycle-name">{n.name}</span>
                      <span className="narrative-lifecycle-stage">{n.stageLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {marketAiTab === 'calendar' && (
              <div className="economic-calendar-panel">
                <div className="economic-calendar-filters">
                  <span className="economic-calendar-filter-label">Impact</span>
                  <div className="economic-calendar-impact-chips">
                    {economicImpactLevels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        className={`economic-calendar-impact-chip ${economicImpactFilter.includes(level.id) ? 'active' : ''} impact-${level.id}`}
                        onClick={() => toggleEconomicImpact(level.id)}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="economic-calendar-month" aria-label="Current month">
                  {(() => {
                    const now = new Date()
                    const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
                    const cells = []
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="economic-calendar-day empty" />)
                    for (let d = 1; d <= daysInMonth; d++) {
                      const isToday = d === now.getDate()
                      cells.push(
                        <div key={d} className={`economic-calendar-day ${isToday ? 'today' : ''}`}>
                          <span className="economic-calendar-day-num">{d}</span>
                        </div>
                      )
                    }
                    return (
                      <>
                        <div className="economic-calendar-month-title">{monthLabel}</div>
                        <div className="economic-calendar-weekdays">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                            <div key={w} className="economic-calendar-weekday">{w}</div>
                          ))}
                        </div>
                        <div className="economic-calendar-days">{cells}</div>
                      </>
                    )
                  })()}
                </div>
                <div className="economic-calendar-upcoming">
                  <div className="economic-calendar-upcoming-header">
                    <span className="economic-calendar-upcoming-title">Key upcoming events</span>
                    <div className="economic-calendar-range-tabs">
                      {economicRangeOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={`economic-calendar-range-tab ${economicRange === opt.id ? 'active' : ''}`}
                          onClick={() => setEconomicRange(opt.id)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ul className="economic-calendar-events-list" aria-label="Key upcoming events">
                    {filteredEconomicEvents.length === 0 ? (
                      <li className="economic-calendar-event economic-calendar-event-empty">No events in this range for selected impact.</li>
                    ) : (
                      filteredEconomicEvents.map((ev) => (
                        <li key={ev.id} className={`economic-calendar-event impact-${ev.impact}`}>
                          <span className="economic-calendar-event-impact" title={ev.impact}>{ev.impact}</span>
                          <div className="economic-calendar-event-body">
                            <span className="economic-calendar-event-title">{ev.title}</span>
                            <span className="economic-calendar-event-meta">
                              {ev.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {ev.timeLabel} · {ev.country}
                            </span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
            {marketAiTab === 'flows' && (
              <div className="market-flows-panel">
                {/* Market structure health check — Funding Rates + Liquidations + Whale Flows (at a glance) */}
                <div className="market-flows-trio">
                  <div className="market-flows-trio-title">Market structure health check</div>
                  <div className="market-flows-trio-cards">
                    <div className="market-flows-trio-card">
                      <span className="market-flows-trio-card-label">Funding rates</span>
                      <div className="market-flows-trio-funding">
                        {marketStructureTrio.funding.map((f) => (
                          <div key={f.symbol} className="market-flows-trio-funding-row">
                            <span className="market-flows-trio-symbol">{f.symbol}</span>
                            <span className={`market-flows-trio-value ${f.rate >= 0 ? 'positive' : 'negative'}`}>
                              {(f.rate >= 0 ? '+' : '')}{(f.rate * 100).toFixed(3)}%
                            </span>
                            <span className="market-flows-trio-hint">{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="market-flows-trio-card">
                      <span className="market-flows-trio-card-label">Liquidations (24h)</span>
                      <div className="market-flows-trio-liq">
                        <div className="market-flows-trio-liq-row">
                          <span className="market-flows-trio-hint">Longs</span>
                          <span className="market-flows-trio-value negative">${marketStructureTrio.liquidations.longs24h}{marketStructureTrio.liquidations.unit}</span>
                        </div>
                        <div className="market-flows-trio-liq-row">
                          <span className="market-flows-trio-hint">Shorts</span>
                          <span className="market-flows-trio-value negative">${marketStructureTrio.liquidations.shorts24h}{marketStructureTrio.liquidations.unit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="market-flows-trio-card">
                      <span className="market-flows-trio-card-label">Whale flows</span>
                      <div className="market-flows-trio-whale">
                        <span className={`market-flows-trio-value ${marketStructureTrio.whaleFlows.net >= 0 ? 'positive' : 'negative'}`}>
                          {marketStructureTrio.whaleFlows.net >= 0 ? '+' : ''}${marketStructureTrio.whaleFlows.net}{marketStructureTrio.whaleFlows.unit}
                        </span>
                        <span className="market-flows-trio-hint">{marketStructureTrio.whaleFlows.direction}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="market-flows-summary">
                  <div className="market-flows-summary-bar">
                    <div className="market-flows-bar-seg inflow" style={{ width: `${(marketFlowSummary.inflow / (marketFlowSummary.inflow + marketFlowSummary.outflow)) * 100}%` }} title="Inflow" />
                    <div className="market-flows-bar-seg outflow" style={{ width: `${(marketFlowSummary.outflow / (marketFlowSummary.inflow + marketFlowSummary.outflow)) * 100}%` }} title="Outflow" />
                  </div>
                  <div className="market-flows-summary-stats">
                    <div className="market-flows-stat">
                      <span className="market-flows-stat-label">Inflow</span>
                      <span className="market-flows-stat-value inflow">+${marketFlowSummary.inflow}{marketFlowSummary.unit}</span>
                    </div>
                    <div className="market-flows-stat">
                      <span className="market-flows-stat-label">Outflow</span>
                      <span className="market-flows-stat-value outflow">−${marketFlowSummary.outflow}{marketFlowSummary.unit}</span>
                    </div>
                    <div className="market-flows-stat net">
                      <span className="market-flows-stat-label">Net</span>
                      <span className={`market-flows-stat-value ${marketFlowSummary.net >= 0 ? 'positive' : 'negative'}`}>
                        {marketFlowSummary.net >= 0 ? '+' : ''}${marketFlowSummary.net}{marketFlowSummary.unit}
                      </span>
                    </div>
                  </div>
                  <div className="market-flows-period">Last {flowPeriodLabel}</div>
                </div>
                <div className="market-flows-by-product">
                  <div className="market-flows-by-product-title">Flow by category</div>
                  <div className="market-flows-by-product-list">
                    {flowByProduct.map((row) => (
                      <div key={row.label} className="market-flows-by-product-row">
                        <span className="market-flows-by-product-label">{row.label}</span>
                        <span className={`market-flows-by-product-net ${row.net >= 0 ? 'positive' : 'negative'}`}>
                          {row.net >= 0 ? '+' : ''}${Math.abs(row.net)}{marketFlowSummary.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="market-flows-etf-section">
                  <div className="market-flows-etf-title">ETF / ETP flows</div>
                  <div className="market-flows-etf-table-wrap">
                    <table className="market-flows-etf-table">
                      <thead>
                        <tr>
                          <th>Fund</th>
                          <th className="num">Inflow</th>
                          <th className="num">Outflow</th>
                          <th className="num">Net</th>
                          <th className="flow-viz">Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {etfFlowsData.map((row) => {
                          const total = row.inflow + row.outflow
                          const inflowPct = total > 0 ? (row.inflow / total) * 100 : 0
                          return (
                            <tr key={row.ticker}>
                              <td>
                                <span className="market-flows-etf-name">{row.name}</span>
                                <span className="market-flows-etf-ticker">{row.ticker}</span>
                              </td>
                              <td className="num inflow">+${row.inflow}M</td>
                              <td className="num outflow">−${row.outflow}M</td>
                              <td className={`num net ${row.net >= 0 ? 'positive' : 'negative'}`}>
                                {row.net >= 0 ? '+' : ''}${row.net}M
                              </td>
                              <td className="flow-viz">
                                <div className="market-flows-etf-bar">
                                  <span className="in" style={{ width: `${inflowPct}%` }} />
                                  <span className="out" style={{ width: `${100 - inflowPct}%` }} />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {marketAiTab === 'wallets' && (
              <div className="welcome-market-ai-placeholder">Wallets. Content coming soon.</div>
            )}
          </div>
          <div className="welcome-market-ai-footer">
            <span className="welcome-market-ai-updated">
              {marketAiTab === 'brief' ? t('ui.liveAiBrief') : marketAiTab === 'analysis' ? t('ui.updatesWithMarketData') : marketAiTab === 'flows' ? t('ui.fundingLiquidations') : marketAiTab === 'mindshare' ? t('ui.narrativeLifecycle') : marketAiTab === 'calendar' ? t('ui.calendarImpact') : `${marketAiTabs.find((tab) => tab.id === marketAiTab)?.label} — ${t('ui.comingSoon')}`}
            </span>
          </div>
        </div>

        {/* Watchlist - same design as LeftPanel, right side */}
        <div id="watchlist-section" className="welcome-watchlist-panel-wrap">
          <button
            type="button"
            className={`welcome-sidebar-toggle welcome-sidebar-toggle--right${!watchlistOpen ? ' is-closed-panel' : ''}`}
            onClick={() => setWatchlistOpen((o) => !o)}
            title={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
            aria-label={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
          >
            {!watchlistOpen && <span className="welcome-sidebar-toggle-label">Watchlist</span>}
            <span className="welcome-sidebar-toggle-icon">
              {watchlistOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
              )}
            </span>
          </button>
          <div
            className={`welcome-watchlist-widget${dayMode ? '' : ' welcome-watchlist-widget--dark'}`}
            data-tour="watchlist"
          >
            <div className="welcome-watchlist-inner watchlist" style={{ padding: 0 }}>
              {/* Header: watchlist name on top, See All, with embedded toggle */}
              <div className="watchlist-header-row">
                <button
                  type="button"
                  className="watchlist-panel-toggle"
                  onClick={() => setWatchlistOpen((o) => !o)}
                  title={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
                  aria-label={watchlistOpen ? 'Close watchlist' : 'Open watchlist'}
                >
                  {watchlistOpen ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
                  )}
                </button>
                <span className="watchlist-title">
                  {watchlists.find(w => w.id === activeWatchlistId)?.name || (isStocks ? 'Stocks & Commodities' : 'Watchlist')}
                </span>
                <button
                  type="button"
                  className="watchlist-see-all-btn"
                  onClick={() => onPageChange?.('watchlists')}
                  title="View all watchlists"
                >
                  See All
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            {/* Watchlist picker dropdown */}
            {watchlists.length > 1 && (
              <div className="watchlist-picker-row">
                <div className="watchlist-picker-dropdown">
                  <button
                    type="button"
                    className={`watchlist-picker-btn ${watchlistPickerOpen ? 'active' : ''}`}
                    onClick={() => { setWatchlistPickerOpen(!watchlistPickerOpen); setWatchlistSortDropdown(false); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
                    </svg>
                    <span className="watchlist-picker-name">{watchlists.find(w => w.id === activeWatchlistId)?.name || 'My Watchlist'}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`chevron ${watchlistPickerOpen ? 'up' : ''}`}>
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {watchlistPickerOpen && (
                    <div className="watchlist-picker-menu">
                      {watchlists.map((wl) => (
                        <button
                          key={wl.id}
                          type="button"
                          className={`watchlist-picker-option ${wl.id === activeWatchlistId ? 'active' : ''}`}
                          onClick={() => {
                            onSwitchWatchlist?.(wl.id)
                            setWatchlistPickerOpen(false)
                          }}
                        >
                          <span className="watchlist-picker-option-name">{wl.name}</span>
                          <span className="watchlist-picker-option-count">{wl.tokenCount} tokens</span>
                          {wl.id === activeWatchlistId && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="check-icon">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {addToWatchlist && (
              <div className="watchlist-add-row" ref={watchlistSearchContainerRef}>
                <input
                  type="text"
                  className="watchlist-add-search"
                  placeholder={isStocks ? "Search stock to add…" : "Search token to add…"}
                  value={watchlistSearchQuery}
                  onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                  onFocus={() => setWatchlistSortDropdown(false)}
                />
                <button type="button" className="watchlist-add-btn" title="Add token" aria-label="Add token">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                {watchlistSearchQuery.trim().length >= 1 && (
                  <div className="watchlist-search-dropdown">
                    {watchlistSearchLoading ? (
                      <div className="watchlist-search-loading">Searching…</div>
                    ) : watchlistSearchResults?.length > 0 ? (
                      watchlistSearchResults.slice(0, 8).map((r) => (
                        <button
                          key={isStocks ? r.symbol : `${r.address}-${r.networkId}`}
                          type="button"
                          className="watchlist-search-result"
                          onClick={() => {
                            addToWatchlist(isStocks ? {
                              symbol: r.symbol,
                              name: r.name,
                              price: r.price || 0,
                              change: r.change || 0,
                              marketCap: r.marketCap || 0,
                              volume: r.volume || 0,
                              logo: r.logo || getStockLogo(r.symbol, r.sector),
                              sector: r.sector || '',
                              exchange: r.exchange || 'NYSE',
                              pinned: false,
                              isStock: true,
                            } : {
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
                            <div className="search-result-price">{r.formattedPrice || fmtPrice(r.price)}</div>
                            <div className={`search-result-change ${(r.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                              {(r.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(r.change || 0).toFixed(2)}%
                            </div>
                          </div>
                          <div className="search-result-stats">
                            <span className="search-result-stat">MC {r.formattedMcap || fmtLarge(r.marketCap)}</span>
                            <span className="search-result-stat">Liq {r.formattedLiquidity || fmtLarge(r.liquidity)}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <>
                        <div className="watchlist-search-empty">{isStocks ? 'No results. Popular stocks:' : 'No results from search. Add a popular token:'}</div>
                        {(isStocks ? [
                          { symbol: 'AAPL', name: 'Apple Inc.', isStock: true },
                          { symbol: 'MSFT', name: 'Microsoft', isStock: true },
                          { symbol: 'NVDA', name: 'NVIDIA', isStock: true },
                          { symbol: 'TSLA', name: 'Tesla', isStock: true },
                          { symbol: 'AMZN', name: 'Amazon', isStock: true },
                          { symbol: 'GOOGL', name: 'Alphabet', isStock: true },
                        ] : [
                          { symbol: 'BTC', name: 'Bitcoin' },
                          { symbol: 'ETH', name: 'Ethereum' },
                          { symbol: 'SOL', name: 'Solana' },
                          { symbol: 'PEPE', name: 'Pepe' },
                          { symbol: 'WIF', name: 'dogwifhat' },
                          { symbol: 'DOGE', name: 'Dogecoin' },
                        ]).filter((t) => !watchlist?.some((w) => (w.symbol || '').toUpperCase() === t.symbol)).map((t) => (
                          <button
                            key={t.symbol}
                            type="button"
                            className="watchlist-search-result"
                            onClick={() => {
                              addToWatchlist({ symbol: t.symbol, name: t.name, pinned: false, ...(t.isStock ? { isStock: true, sector: t.sector || '', exchange: t.exchange || 'NYSE' } : {}) })
                              setWatchlistSearchQuery('')
                            }}
                          >
                            <span className="watchlist-search-result-symbol">{t.symbol}</span>
                            <span className="watchlist-search-result-name">{t.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="watchlist-controls">
              <div className="watchlist-sort-dropdown">
                <button
                  type="button"
                  className={`sort-btn ${watchlistSortDropdown ? 'active' : ''}`}
                  onClick={() => setWatchlistSortDropdown(!watchlistSortDropdown)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M6 12h12M9 18h6" />
                  </svg>
                  {watchlistSortOptions.find((o) => o.value === watchlistSort)?.label || 'Sort'}
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`chevron ${watchlistSortDropdown ? 'up' : ''}`}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {watchlistSortDropdown && (
                  <div className="sort-dropdown-menu">
                    {watchlistSortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`sort-option ${watchlistSort === option.value ? 'active' : ''}`}
                        onClick={() => {
                          setWatchlistSort(option.value)
                          setWatchlistSortDropdown(false)
                        }}
                      >
                        <span className="sort-icon">{option.icon}</span>
                        {option.label}
                        {watchlistSort === option.value && <span className="check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="watchlist-count">{watchlist?.length || 0} {isStocks ? 'symbols' : 'tokens'}</span>
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
                      style={{ cursor: 'pointer', ...(getTokenRowStyle(token.symbol) || EMPTY_STYLE) }}
                      draggable
                      onDragStart={(e) => handleWatchlistDragStart(e, index, token)}
                      onDragEnter={(e) => handleWatchlistDragEnter(e, index)}
                      onDragOver={handleWatchlistDragOver}
                      onDragEnd={handleWatchlistDragEnd}
                      onClick={() => {
                        if (token.isStock) {
                          handleStockClick(token)
                          return
                        }
                        const payload = {
                          symbol: token.symbol,
                          name: token.name,
                          address: token.address,
                          networkId: token.networkId || 1,
                          price: token.price,
                          change: token.change,
                          logo: token.logo,
                        }
                        // Navigate to Research Zone for all tokens
                        if (onOpenResearchZone) {
                          onOpenResearchZone(payload)
                        } else if (selectToken) {
                          selectToken(payload)
                        }
                      }}
                    >
                      <div className="drag-handle">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                      <div className="token-info">
                        <div
                          className="token-avatar-ring watchlist-avatar-ring"
                          style={getTokenAvatarRingStyle(token.symbol) || EMPTY_STYLE}
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
                          <span className="token-symbol" style={dayMode ? { color: '#0f172a' } : undefined}>{token.symbol}</span>
                          <span className="token-name">{token.name}</span>
                        </div>
                      </div>
                      <div className="token-stats">
                        <span className="price">{fmtPrice(token.price)}</span>
                        <span className={`change ${(token.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                          {formatWatchlistChange(token.change)}
                        </span>
                        <span className="mcap-value">{formatWatchlistMcap(token.marketCap)}</span>
                      </div>
                      <div className="watchlist-actions">
                        <button
                          type="button"
                          className="remove-watchlist-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromWatchlist && removeFromWatchlist(token.address || token.symbol)
                          }}
                          title="Remove from Watchlist"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`pin-btn ${token.pinned ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePinWatchlist && togglePinWatchlist(token.address || token.symbol)
                          }}
                          title={token.pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <svg viewBox="0 0 24 24" fill={token.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-watchlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <p>{isStocks ? t('ui.stocksWatchlistEmpty') : t('ui.watchlistEmpty')}</p>
                <span>{isStocks ? t('ui.stocksWatchlistEmptyHint') : t('ui.watchlistEmptyHint')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Top Coins | On-Chain (crypto only) | Prediction Markets – congruent line above table */}
      <div id="top-coins" className="welcome-topcoins-header-row" data-tour="discovery">
        <nav className="welcome-topcoins-tabs" aria-label="Market sections">
          <button
            type="button"
            className={`welcome-topcoins-header-tab ${topSectionTab === 'topcoins' ? 'active' : ''}`}
            onClick={() => {
              setChartPanelToken(null)
              setTopSectionTab('topcoins')
            }}
          >
            {isStocks ? t('topSection.stocksCommodities') : t('topSection.topCoins')}
          </button>
          {!isStocks && (
            <button
              type="button"
              className={`welcome-topcoins-header-tab ${topSectionTab === 'onchain' ? 'active' : ''}`}
              onClick={() => {
                setChartPanelToken(null)
                setTopSectionTab('onchain')
              }}
            >
              {t('topSection.onChain')}
            </button>
          )}
          <button
            type="button"
            className={`welcome-topcoins-header-tab ${topSectionTab === 'predictions' ? 'active' : ''}`}
            onClick={() => {
              setChartPanelToken(null)
              setTopSectionTab('predictions')
            }}
          >
            {t('topSection.predictionMarkets')}
          </button>
        </nav>
      </div>

      {/* Discovery block: Tabs + Discover/token tabs + Network + Timeframe on one line, then Token list */}
      <div className="welcome-discovery-block">
      {/* Token Discovery - one filter row: Tabs + Discover/token tabs then Network then Timeframe then view toggle */}
      <section className="discovery-section">
        <div className={`discovery-filters discovery-filters-with-tabs ${isMobile ? 'discovery-filters-mobile' : ''}`}>
          {/* Tabs On/Off + Discover + token tabs (same line, before Network) */}
          <div className="discovery-filters-tabs-group">
            <button
              type="button"
              className={`discover-tabs-toggle ${tabsOn ? 'active' : ''}`}
              onClick={() => {
                setTabsOn((prev) => {
                  const next = !prev
                  if (!next) {
                    setChartPanelToken(null)
                    setActiveDiscoverTab('discover')
                  }
                  return next
                })
              }}
              aria-pressed={tabsOn}
              aria-label={`${t('topSection.tabs')} ${tabsOn ? t('topSection.on') : t('topSection.off')}`}
            >
              <span className="discover-tabs-icon" aria-hidden>{icons.tabs}</span>
              <span className="discover-tabs-label">{t('topSection.tabs')}</span>
              <span className="discover-tabs-pill">{tabsOn ? t('topSection.on') : t('topSection.off')}</span>
            </button>
            {tabsOn && (
              <div className="welcome-tabs-bar welcome-tabs-bar-inline">
                <div className={`welcome-tab-wrap ${activeDiscoverTab === 'discover' ? 'active' : ''}`}>
                  <button type="button" className="welcome-tab" onClick={() => { setActiveDiscoverTab('discover'); setChartPanelToken(null) }}>
                    <span className="welcome-tab-icon" aria-hidden>{icons.discover}</span>
                    <span className="welcome-tab-label">{t('topSection.discover')}</span>
                  </button>
                </div>
                {openTokenTabs.map((t) => (
                  <div key={t.symbol} className={`welcome-tab-wrap ${activeDiscoverTab === (t.symbol || t) ? 'active' : ''}`}>
                    <button
                      type="button"
                      className="welcome-tab"
                      onClick={() => {
                        setActiveDiscoverTab(t.symbol || t)
                        openTokenCardPopup(t.symbol || t)
                      }}
                    >
                      <span className="welcome-tab-icon" aria-hidden>{icons.tokenTab}</span>
                      <span className="welcome-tab-label">{t.symbol || t}</span>
                    </button>
                    <button
                      type="button"
                      className="welcome-tab-close"
                      aria-label={`Close ${t.symbol || t} tab`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTokenTab(t.symbol || t)
                      }}
                    >
                      {icons.close}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
            {/* Top Coins only: Category + Timeframe (dropdowns on mobile) */}
            {topSectionTab === 'topcoins' && (
              <>
                <div className="filter-group filter-group-categories">
                  <span className="filter-label">
                    <span className="filter-label-icon" aria-hidden>{icons.sector}</span>
                    {isStocks ? t('topSection.sector') : t('topSection.category')}
                    {onPageChange && !isStocks && (
                      <button
                        type="button"
                        className="categories-view-all-link"
                        onClick={(e) => { e.stopPropagation(); onPageChange('categories') }}
                      >
                        {t('topSection.viewAll')}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </span>
                  {isMobile ? (
                    <GlassSelect
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      options={(isStocks ? TRANSLATED_STOCK_SECTORS : CATEGORY_TABS).map(c => ({ value: c.id, label: c.label }))}
                      ariaLabel={isStocks ? 'Sector' : 'Category'}
                    />
                  ) : (
                    <div className="filter-options">
                      {(isStocks ? TRANSLATED_STOCK_SECTORS : CATEGORY_TABS).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`filter-option welcome-category-tab ${categoryFilter === cat.id ? 'active' : ''}`}
                          onClick={() => setCategoryFilter(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="filter-group">
                  <span className="filter-label">
                    <span className="filter-label-icon" aria-hidden>{icons.timeframe}</span>
                    {t('topSection.timeframe')}
                  </span>
                  {isMobile ? (
                    <GlassSelect
                      value={timeframeFilter}
                      onChange={(e) => setTimeframeFilter(e.target.value)}
                      options={timeframes.map(t => ({ value: t.id, label: t.label }))}
                      ariaLabel="Timeframe"
                    />
                  ) : (
                    <div className="filter-options">
                      {timeframes.map(timeframe => (
                        <button
                          key={timeframe.id}
                          className={`filter-option ${timeframeFilter === timeframe.id ? 'active' : ''}`}
                          onClick={() => setTimeframeFilter(timeframe.id)}
                        >
                          {timeframe.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Predictions: Timeframe + Prediction categories (dropdowns on mobile) */}
            {topSectionTab === 'predictions' && (
              <>
                <div className="filter-group">
                  <span className="filter-label">
                    <span className="filter-label-icon" aria-hidden>{icons.timeframe}</span>
                    {t('topSection.timeframe')}
                  </span>
                  {isMobile ? (
                    <GlassSelect
                      value={timeframeFilter}
                      onChange={(e) => setTimeframeFilter(e.target.value)}
                      options={timeframes.map(t => ({ value: t.id, label: t.label }))}
                      ariaLabel="Timeframe"
                    />
                  ) : (
                    <div className="filter-options">
                      {timeframes.map(timeframe => (
                        <button
                          key={timeframe.id}
                          className={`filter-option ${timeframeFilter === timeframe.id ? 'active' : ''}`}
                          onClick={() => setTimeframeFilter(timeframe.id)}
                        >
                          {timeframe.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="filter-group filter-group-predictions-categories">
                  <span className="filter-label">
                    <span className="filter-label-icon" aria-hidden>{icons.sector}</span>
                    {t('topSection.category')}
                  </span>
                  {isMobile ? (
                    <GlassSelect
                      value={predictionsCategoryFilter}
                      onChange={(e) => setPredictionsCategoryFilter(e.target.value)}
                      options={PREDICTIONS_CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                      ariaLabel="Category"
                    />
                  ) : (
                    <div className="filter-options">
                      {PREDICTIONS_CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`filter-option predictions-category-tab ${predictionsCategoryFilter === c.id ? 'active' : ''}`}
                          onClick={() => setPredictionsCategoryFilter(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* On-Chain: Chain + Rank by (dropdowns on mobile); desktop gets full toolbar */}
            {topSectionTab === 'onchain' && (
              <div className={`discovery-filters-onchain-inline ${isMobile ? 'discovery-filters-onchain-mobile' : ''}`}>
                {isMobile ? (
                  <>
                    <GlassSelect
                      value={onChainChainFilter}
                      onChange={(e) => setOnChainChainFilter(e.target.value)}
                      options={ONCHAIN_CHAINS.map(c => ({ value: c.id, label: c.label }))}
                      ariaLabel="Chain"
                    />
                    <GlassSelect
                      value={onChainRankBy}
                      onChange={(e) => setOnChainRankBy(e.target.value)}
                      options={[
                        { value: 'trending-5m', label: 'Trending 5M' },
                        { value: 'trending-1h', label: 'Trending 1H' },
                        { value: 'trending-6h', label: 'Trending 6H' },
                        { value: 'trending-24h', label: 'Trending 24H' },
                      ]}
                      ariaLabel="Rank by"
                    />
                  </>
                ) : (
                  <>
                    <button type="button" className="onchain-trending-btn onchain-inline-btn" aria-label="Trending">
                      Trending
                      <span className="onchain-toolbar-info-icon" aria-hidden>ⓘ</span>
                    </button>
                    <div className="filter-group filter-group-chain-inline">
                      <span className="filter-label filter-label-inline">
                        <span className="filter-label-icon" aria-hidden>{icons.network}</span>
                        Chain
                      </span>
                      <div className="filter-options">
                        {ONCHAIN_CHAINS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`filter-option welcome-category-tab ${onChainChainFilter === c.id ? 'active' : ''}`}
                            onClick={() => setOnChainChainFilter(c.id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <select
                      className="onchain-rank-by-select onchain-inline-select"
                      value={onChainRankBy}
                      onChange={(e) => setOnChainRankBy(e.target.value)}
                      aria-label="Rank by"
                    >
                      <option value="trending-5m">Trending 5M</option>
                      <option value="trending-1h">Trending 1H</option>
                      <option value="trending-6h">Trending 6H</option>
                      <option value="trending-24h">Trending 24H</option>
                    </select>
                    <button type="button" className="onchain-toolbar-btn onchain-inline-btn">Filters</button>
                    <button type="button" className="onchain-toolbar-btn onchain-inline-btn">Customize</button>
                  </>
                )}
              </div>
            )}
          <div className="discovery-filters-view">
            <div className="view-toggle">
              <button 
                className={`view-btn ${(topSectionTab === 'onchain' ? onChainViewMode : viewMode) === 'list' ? 'active' : ''}`}
                onClick={() => { topSectionTab === 'onchain' ? setOnChainViewMode('list') : setViewMode('list') }}
                title="List view"
              >
                {icons.list}
              </button>
              <button 
                className={`view-btn ${(topSectionTab === 'onchain' ? onChainViewMode === 'grid' : viewMode === 'grid') ? 'active' : ''}`}
                onClick={() => { topSectionTab === 'onchain' ? setOnChainViewMode('grid') : setViewMode('grid') }}
                title={topSectionTab === 'onchain' ? 'Block cards view' : 'Grid view'}
              >
                {icons.grid}
              </button>
            </div>
          </div>
        </div>

        {topSectionTab === 'onchain' ? (
          <div className="onchain-section">
            {/* Discover, Trending, Chain, Rank by, Filters, Customize, View are in discovery-filters row above */}
            {/* Split only wraps table/grid and chart so chart fits table height */}
            <div className={chartPanelToken ? 'discovery-section-split onchain-table-chart-split' : undefined}>
              <div className={chartPanelToken ? 'discovery-trending onchain-table-area' : undefined}>
                <div className={chartPanelToken ? `onchain-left-wrap token-list-wrap--compressed` : 'onchain-left-wrap'}>
            {onChainViewMode === 'grid' ? (
              <div className="onchain-token-grid">
                {filteredOnChain.map((row, index) => {
                  const logo = TOKEN_LOGOS[row.symbol] || null
                  const chainLogo = CHAIN_LOGOS[row.networkId] || null
                  const change24h = row.change24h ?? 0
                  return (
                    <div
                      key={row.id}
                      className="onchain-token-card"
                      onClick={() => handleOnChainCoinClick(row)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleOnChainCoinClick(row)}
                      aria-label={`Preview chart for ${row.symbol}`}
                    >
                      <span className="onchain-card-rank">#{index + 1}</span>
                      <div className="onchain-card-header">
                        <div className="onchain-token-avatar-wrap">
                          {logo ? <img src={logo} alt="" className="onchain-token-logo" /> : <span className="onchain-token-initials">{row.symbol?.slice(0, 2)}</span>}
                        </div>
                        {chainLogo ? <img src={chainLogo} alt="" className="onchain-chain-logo" title={row.networkId} /> : null}
                        <div className="onchain-card-token-meta">
                          <span className="onchain-token-ticker">{row.symbol}</span>
                          <span className="onchain-token-pair">{row.pair}</span>
                          <span className="onchain-token-name">{row.name}</span>
                          {row.boost != null ? <span className="onchain-token-boost">⚡{row.boost}</span> : null}
                        </div>
                      </div>
                      <div className="onchain-card-price">
                        <span className="price-value">{fmtPrice(row.price)}</span>
                        <span className={`price-change ${change24h >= 0 ? 'positive' : 'negative'}`}>
                          {change24h >= 0 ? '+' : ''}{formatChange(change24h)}%
                        </span>
                      </div>
                      <div className="onchain-card-metrics">
                        <div className="metric"><span className="metric-label">Volume</span><span className="metric-value">{fmtLarge(row.volume)}</span></div>
                        <div className="metric"><span className="metric-label">MCAP</span><span className="metric-value">{fmtLarge(row.mcap)}</span></div>
                      </div>
                      <div className="onchain-card-action">
                        <span>Preview chart</span>
                        {icons.chart}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
            <div className="onchain-table-wrap token-list-wrap">
              <div className="onchain-table token-list-screener">
                <div className="onchain-table-header token-list-header">
                  <span className="list-col position-col">#</span>
                  <span className="list-col token-col">{t('topSection.token')}</span>
                  <span className="list-col price-col">{t('topSection.priceUsd')}</span>
                  <span className="list-col age-col">{t('topSection.age')}</span>
                  <span className="list-col txns-col">{t('topSection.txns')}</span>
                  <span className="list-col volume-col">{t('topSection.volume')}</span>
                  <span className="list-col makers-col">{t('topSection.makers')}</span>
                  <span className="list-col change-col change-5m">{t('topSection.min5')}</span>
                  <span className="list-col change-col change-1h">{t('topSection.hour1')}</span>
                  <span className="list-col change-col change-6h">{t('topSection.hour6')}</span>
                  <span className="list-col change-col change-24h">{t('topSection.hour24')}</span>
                  <span className="list-col mcap-col">{t('topSection.mcap')}</span>
                  <span className="list-col liquidity-col">{t('topSection.liquidity')}</span>
                  <span className="list-col chart-col">{t('topSection.chart')}</span>
                </div>
                {filteredOnChain.map((row, index) => {
                  const logo = TOKEN_LOGOS[row.symbol] || null
                  const chainLogo = CHAIN_LOGOS[row.networkId] || null
                  const change5m = row.change5m ?? 0
                  const change1h = row.change1h ?? 0
                  const change6h = row.change6h ?? 0
                  const change24h = row.change24h ?? 0
                  return (
                    <div
                      key={row.id}
                      className="onchain-table-row token-list-row"
                      onClick={() => handleOnChainCoinClick(row)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleOnChainCoinClick(row)}
                      aria-label={`Preview chart for ${row.symbol}`}
                    >
                      <span className="list-col position-col">{index + 1}</span>
                      <div className="list-col token-col" onClick={(e) => e.stopPropagation()}>
                        <div className="onchain-token-avatar-wrap">
                          {logo ? (
                            <img src={logo} alt="" className="onchain-token-logo" />
                          ) : (
                            <span className="onchain-token-initials">{row.symbol?.slice(0, 2)}</span>
                          )}
                        </div>
                        {chainLogo ? (
                          <img src={chainLogo} alt="" className="onchain-chain-logo" title={row.networkId} />
                        ) : null}
                        <div className="onchain-token-meta">
                          <span className="onchain-token-ticker">{row.symbol}</span>
                          <span className="onchain-token-pair">{row.pair}</span>
                          <span className="onchain-token-name">{row.name}</span>
                          {row.boost != null ? <span className="onchain-token-boost">⚡{row.boost}</span> : null}
                        </div>
                      </div>
                      <span className="list-col price-col">{fmtPrice(row.price)}</span>
                      <span className="list-col age-col">{row.age}</span>
                      <span className="list-col txns-col">{row.txns?.toLocaleString() ?? '—'}</span>
                      <span className="list-col volume-col">{fmtLarge(row.volume)}</span>
                      <span className="list-col makers-col">{row.makers?.toLocaleString() ?? '—'}</span>
                      <span className={`list-col change-col change-5m ${change5m >= 0 ? 'positive' : 'negative'}`}>
                        {change5m >= 0 ? '+' : ''}{formatChange(change5m)}%
                      </span>
                      <span className={`list-col change-col change-1h ${change1h >= 0 ? 'positive' : 'negative'}`}>
                        {change1h >= 0 ? '+' : ''}{formatChange(change1h)}%
                      </span>
                      <span className={`list-col change-col change-6h ${change6h >= 0 ? 'positive' : 'negative'}`}>
                        {change6h >= 0 ? '+' : ''}{formatChange(change6h)}%
                      </span>
                      <span className={`list-col change-col change-24h ${change24h >= 0 ? 'positive' : 'negative'}`}>
                        {change24h >= 0 ? '+' : ''}{formatChange(change24h)}%
                      </span>
                      <span className="list-col mcap-col">{fmtLarge(row.mcap)}</span>
                      <span className="list-col liquidity-col">{fmtLarge(row.liquidity)}</span>
                      <span className="list-col chart-col">
                        <button
                          type="button"
                          className="onchain-chart-btn"
                          onClick={(e) => { e.stopPropagation(); handleOnChainCoinClick(row); }}
                          title="Preview chart"
                          aria-label="Preview chart"
                        >
                          {icons.chart}
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            )}
                </div>
              </div>
              {chartPanelToken && (
                <div className="discovery-chart-side onchain-chart-side">
                  {renderChartPanel(true)}
                </div>
              )}
            </div>
          </div>
        ) : topSectionTab === 'predictions' ? (
          <div className="predictions-section">
            <div className="predictions-section-header">
              <span className="predictions-section-badge">{t('topSection.latest')}</span>
              <h2 className="predictions-section-title">{t('topSection.predictionMarkets')}</h2>
              <p className="predictions-section-sub">{t('topSection.predictionSubtitle')}</p>
            </div>
            <div className="predictions-table-wrap token-list-wrap">
              <div className="predictions-table token-list-screener">
                <div className="predictions-table-header token-list-header">
                  <span className="list-col rank">#</span>
                  <span className="list-col question">{t('topSection.market')}</span>
                  <span className="list-col category">{t('topSection.categoryCol')}</span>
                  <span className="list-col yes">{t('topSection.yesPercent')}</span>
                  <span className="list-col no">{t('topSection.noPercent')}</span>
                  <span className="list-col volume">{t('topSection.volume')}</span>
                  <span className="list-col liquidity">{t('topSection.liquidity')}</span>
                  <span className="list-col end">{t('topSection.endDate')}</span>
                  <span className="list-col resolution">{t('topSection.resolution')}</span>
                </div>
                {filteredPredictions.map((row, index) => {
                  const noPct = 100 - (row.yesPct ?? 0)
                  return (
                  <div key={row.id} className={`predictions-table-row token-list-row predictions-cat-${(row.category || '').toLowerCase()}`}>
                    <span className="list-col rank">{index + 1}</span>
                    <span className="list-col question">{row.question}</span>
                    <span className="list-col category">
                      <span className="predictions-category-pill">{row.category}</span>
                    </span>
                    <span className="list-col yes">
                      <span className="predictions-yes-bar-wrap">
                        <span className="predictions-yes-bar" style={{ width: `${row.yesPct}%` }} />
                        <span className="predictions-yes-value">{row.yesPct}%</span>
                      </span>
                    </span>
                    <span className="list-col no">{noPct}%</span>
                    <span className="list-col volume">{fmtLarge(row.volume)}</span>
                    <span className="list-col liquidity">{fmtLarge(row.liquidity ?? row.volume)}</span>
                    <span className="list-col end">
                      <span className="predictions-end-badge">{row.endDate}</span>
                    </span>
                    <span className="list-col resolution">{row.resolution ?? '—'}</span>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
        <>
        <div className={tabsOn && chartPanelToken ? 'discovery-section-split' : undefined}>
          <div className={tabsOn && chartPanelToken ? 'discovery-trending' : undefined}>
            <div className={`token-list-wrap ${tabsOn && chartPanelToken ? 'token-list-wrap--compressed' : ''}`}>
        {(topCoinsLoading || (loading && tokens.length === 0)) ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>{t('topSection.loadingMarketData')}</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="token-grid">
            {filteredTopCoins.map((token, index) => (
              <div
                key={`${token.symbol}-${token.rank}-${index}`}
                className={`token-card ${compareMode ? 'compare-mode' : ''} ${isTokenSelected(token.address || token.symbol) ? 'selected' : ''}`}
                onClick={() => compareMode ? toggleCompareToken(token, { stopPropagation: () => {} }) : (isStocks ? handleStockClick(token) : handleTopCoinClick(token))}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {compareMode && (
                  <button 
                    className={`select-checkbox ${isTokenSelected(token.address || token.symbol) ? 'checked' : ''}`}
                    onClick={(e) => toggleCompareToken(token, e)}
                  >
                    {isTokenSelected(token.address || token.symbol) && icons.check}
                  </button>
                )}
                
                <div className="token-rank">{token.rank}</div>
                
                <div className="token-header">
                  <div className="token-avatar">
                    {token.logo ? (
                      <img src={token.logo} alt={token.symbol} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                    ) : null}
                    <span className="token-initials" style={{ display: token.logo ? 'none' : 'flex' }}>{getTokenInitials(token.symbol)}</span>
                  </div>
                  <div className="token-info">
                    <span className="token-symbol">{token.symbol}</span>
                    <span className="token-name">{token.name}</span>
                    {addToWatchlist && (
                      <button
                        type="button"
                        className={`topcoin-favorite-btn ${checkIsInWatchlist(token) ? 'in-watchlist' : ''}`}
                        aria-label={checkIsInWatchlist(token) ? `Remove ${token.symbol} from watchlist` : `Add ${token.symbol} to watchlist`}
                        title={checkIsInWatchlist(token) ? 'Remove from watchlist' : 'Add to watchlist'}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (checkIsInWatchlist(token)) {
                            removeFromWatchlist && removeFromWatchlist(token.address || token.symbol)
                          } else {
                            addToWatchlist({ symbol: token.symbol, name: token.name, address: token.address, logo: token.logo, price: token.price, change: token.change, marketCap: token.marketCap, pinned: false })
                          }
                        }}
                      >
                        {checkIsInWatchlist(token) ? icons.heartFilled : icons.heart}
                      </button>
                    )}
                    <button
                      type="button"
                      className="welcome-topcoin-info-btn token-list-info-btn"
                      aria-label={`Info about ${token.symbol}`}
                      onClick={(e) => openTopCoinInfo(token.symbol, e)}
                    >
                      i
                    </button>
                  </div>
                </div>

                <div className="token-price">
                  <span className="price-value">
                    ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
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
                  <span>{t('topSection.viewDetails')}</span>
                  {icons.arrow}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="token-list token-list-screener">
            <div className="token-list-header">
              <span className="list-col rank">#</span>
              <span className="list-col name">{t('topSection.name')}</span>
              <span className="list-col price">{t('topSection.price')}</span>
              <span className="list-col change">{isStocks ? t('topSection.chgPercent') : t('topSection.change24h')}</span>
              <span className="list-col change-7d">{isStocks ? t('topSection.sectorCol') : t('topSection.change1w')}</span>
              <span className="list-col change-30d">{isStocks ? t('topSection.peRatio') : t('topSection.change30d')}</span>
              <span className="list-col change-1y">{isStocks ? t('topSection.exchange') : t('topSection.change1y')}</span>
              <span className="list-col mcap">{t('topSection.marketCap')}</span>
              <span className="list-col volume">{isStocks ? t('topSection.volume') : t('topSection.volume24h')}</span>
              <span className="list-col chart">{isStocks ? t('topSection.trend') : t('topSection.last7days')}</span>
            </div>
            {filteredTopCoins.map((token, index) => {
              const tokenKey = (token.symbol || '').toUpperCase()
              return (
              <div
                key={`${token.symbol}-${token.rank}-${index}`}
                className={`token-list-row token-row-${tokenKey.toLowerCase()} ${compareMode ? 'compare-mode' : ''} ${isTokenSelected(token.address || token.symbol) ? 'selected' : ''}`}
                data-token={tokenKey}
                style={getTokenRowStyle(token.symbol) || EMPTY_STYLE}
                onClick={() => compareMode ? toggleCompareToken(token, { stopPropagation: () => {} }) : (isStocks ? handleStockClick(token) : handleTopCoinClick(token))}
              >
                {compareMode && (
                  <button 
                    className={`select-checkbox ${isTokenSelected(token.address || token.symbol) ? 'checked' : ''}`}
                    onClick={(e) => toggleCompareToken(token, e)}
                  >
                    {isTokenSelected(token.address || token.symbol) && icons.check}
                  </button>
                )}
                <span className="list-col rank">{token.rank}</span>
                <div className="list-col name">
                  <div 
                    className="token-avatar-ring" 
                    style={getTokenAvatarRingStyle(token.symbol) || EMPTY_STYLE}
                  >
                    <div className="token-avatar-sm">
                      {token.logo ? (
                        <img src={token.logo} alt={token.symbol} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      ) : null}
                      <span className="token-initials" style={{ display: token.logo ? 'none' : 'flex' }}>{getTokenInitials(token.symbol)}</span>
                    </div>
                  </div>
                  <div className="token-info-sm token-info-sm-inline">
                    <span className="token-name-main">{token.name}</span>
                    <span className="token-symbol-sub">{token.symbol}</span>
                  </div>
                  {addToWatchlist && (
                    <button
                      type="button"
                      className={`topcoin-favorite-btn ${checkIsInWatchlist(token) ? 'in-watchlist' : ''}`}
                      aria-label={checkIsInWatchlist(token) ? `Remove ${token.symbol} from watchlist` : `Add ${token.symbol} to watchlist`}
                      title={checkIsInWatchlist(token) ? 'Remove from watchlist' : 'Add to watchlist'}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (checkIsInWatchlist(token)) {
                          removeFromWatchlist && removeFromWatchlist(token.address || token.symbol)
                        } else {
                          addToWatchlist({ symbol: token.symbol, name: token.name, address: token.address, logo: token.logo, price: token.price, change: token.change, marketCap: token.marketCap, pinned: false })
                        }
                      }}
                    >
                      {checkIsInWatchlist(token) ? icons.heartFilled : icons.heart}
                    </button>
                  )}
                  <button
                    type="button"
                    className="welcome-topcoin-info-btn token-list-info-btn"
                    aria-label={`Info about ${token.symbol}`}
                    onClick={(e) => openTopCoinInfo(token.symbol, e)}
                  >
                    i
                  </button>
                </div>
                <span className="list-col price">{fmtPrice(token.price || 0)}</span>
                <span className={`list-col change ${(token.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(token.change || 0) >= 0 ? '+' : ''}{formatChange(token.change || 0)}%
                </span>
                {isStocks ? (
                  <>
                    <span className="list-col change-7d stock-sector">{token.sector || '—'}</span>
                    <span className="list-col change-30d stock-pe">{token.pe ? token.pe.toFixed(1) : '—'}</span>
                    <span className="list-col change-1y stock-exchange">{token.exchange || '—'}</span>
                  </>
                ) : (
                  <>
                    <span className={`list-col change-7d ${(token.change7d || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(token.change7d || 0) >= 0 ? '+' : ''}{formatChange(token.change7d || 0)}%
                    </span>
                    <span className={`list-col change-30d ${(token.change30d || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(token.change30d || 0) >= 0 ? '+' : ''}{formatChange(token.change30d || 0)}%
                    </span>
                    <span className={`list-col change-1y ${(token.change1y || token.change365 || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {(token.change1y || token.change365 || 0) >= 0 ? '+' : ''}{formatChange(token.change1y || token.change365 || 0)}%
                    </span>
                  </>
                )}
                <span className="list-col mcap">{fmtLarge(token.marketCap)}</span>
                <span className="list-col volume">{fmtLarge(token.volume)}</span>
                <div className="list-col chart">
                  <Sparkline data={token.sparkline_7d || generateSparkline(token.change)} positive={(token.change || 0) >= 0} />
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Top Coins pagination: 25 per page, up to 1000 (40 pages) */}
        {topSectionTab === 'topcoins' && !isStocks && (
          <div className="topcoins-pagination" aria-label="Top Coins pagination">
            <button
              type="button"
              className="topcoins-pagination-btn"
              disabled={topCoinsPage <= 1 || topCoinsLoading}
              onClick={() => {
                const tableTop = document.querySelector('.welcome-topcoins-tabs')?.getBoundingClientRect()?.top + window.scrollY - 100
                setTopCoinsPage((p) => Math.max(1, p - 1))
                if (tableTop) setTimeout(() => window.scrollTo({ top: tableTop, behavior: 'instant' }), 50)
              }}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="topcoins-pagination-info">
              Page {topCoinsPage} of {TOTAL_TOP_COINS_PAGES}
            </span>
            <button
              type="button"
              className="topcoins-pagination-btn"
              disabled={topCoinsPage >= TOTAL_TOP_COINS_PAGES || topCoinsLoading}
              onClick={() => {
                const tableTop = document.querySelector('.welcome-topcoins-tabs')?.getBoundingClientRect()?.top + window.scrollY - 100
                setTopCoinsPage((p) => Math.min(TOTAL_TOP_COINS_PAGES, p + 1))
                if (tableTop) setTimeout(() => window.scrollTo({ top: tableTop, behavior: 'instant' }), 50)
              }}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}

            </div>
          </div>
          {tabsOn && chartPanelToken && (
            <div className="discovery-chart-side">
              {renderChartPanel(true)}
            </div>
          )}
        </div>

        {/* Chain Volume, Smart Money, AI Intelligence removed - Smart Money moved to Market Analytics */}
        </>
        )}
      </section>
      </div>

      {/* Chart overlay: modal only when tabs off (Top Coins or Predictions); On-Chain uses same inline right panel as Top Coins */}
      {chartPanelToken && !tabsOn && (topSectionTab === 'topcoins' || topSectionTab === 'predictions') && createPortal(
        <div
          className="welcome-chart-overlay-backdrop"
          onClick={() => setChartPanelToken(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Chart overlay"
        >
          {renderChartPanel(false)}
          {/*
            <button
              type="button"
              className="welcome-chart-overlay-close"
              onClick={() => setChartPanelToken(null)}
              aria-label="Close chart"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="welcome-chart-overlay-header">
              <div className="welcome-chart-overlay-token-info">
                {chartPanelToken.logo ? <img src={chartPanelToken.logo} alt="" className="welcome-chart-overlay-logo" /> : <span className="welcome-chart-overlay-logo-placeholder">{chartPanelToken.symbol?.[0]}</span>}
                <div>
                  <span className="welcome-chart-panel-token">{chartPanelToken.symbol}</span>
                  <span className="welcome-chart-panel-name">{chartPanelToken.name}</span>
                </div>
              </div>
            </div>
            {/* Timeframe tabs: 1m, 30m, 1h, 1d, All Time, 24h, 7d, 30d */}
            <div className="welcome-chart-overlay-timeframe-row">
              <div className="welcome-chart-overlay-tabs">
                {OVERLAY_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    className={`welcome-chart-overlay-tab ${chartOverlayTimeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setChartOverlayTimeframe(tf.id)}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              <div className="welcome-chart-overlay-toolbar">
                <button type="button" className="welcome-chart-overlay-tool-btn" title="Indicators"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M7 16l4-8 4 4 4-8"/></svg></button>
                <button type="button" className="welcome-chart-overlay-tool-btn" title="Drawing"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
                <button type="button" className="welcome-chart-overlay-tool-btn" title="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>
              </div>
            </div>
            <div className="welcome-chart-panel-chart welcome-chart-overlay-chart-area">
              {(() => {
                const change24 = chartPanelToken.change != null ? Number(chartPanelToken.change) : 0
                const scale = chartOverlayTimeframe === '1h' || chartOverlayTimeframe === '1m' ? 0.25 : chartOverlayTimeframe === '7d' || chartOverlayTimeframe === '30d' ? 1.4 : 1
                const scaledChange = change24 * scale
                const points = getHistorySparkline(chartPanelToken.price, scaledChange)
                if (!points.length) return <span className="welcome-chart-overlay-chart-placeholder">{chartPanelToken.symbol} {chartOverlayTimeframe} CRYPTO — No data</span>
                const w = 400
                const h = 280
                const min = Math.min(...points)
                const max = Math.max(...points)
                const range = max - min || 1
                const d = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * (h - 20)}`).join(' ')
                return (
                  <svg viewBox={`0 0 ${w} ${h}`} className="welcome-chart-overlay-sparkline">
                    <defs>
                      <linearGradient id="chart-overlay-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.2)" />
                        <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                      </linearGradient>
                    </defs>
                    <polygon fill="url(#chart-overlay-grad)" points={`0,${h} ${d} ${w},${h}`} />
                    <polyline fill="none" stroke="rgba(139, 92, 246, 0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={d} />
                  </svg>
                )
              })()}
            </div>
            {/* Bottom tabs: TradingView | Screener */}
            <div className="welcome-chart-overlay-bottom-tabs">
              <button type="button" className={`welcome-chart-overlay-bottom-tab ${chartOverlaySubTab === 'tradingview' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('tradingview')}>TradingView</button>
              <button type="button" className={`welcome-chart-overlay-bottom-tab ${chartOverlaySubTab === 'screener' ? 'active' : ''}`} onClick={() => setChartOverlaySubTab('screener')}>Screener</button>
            </div>
            {chartOverlaySubTab === 'tradingview' && (
              <div className="welcome-chart-overlay-project-info">
                <p className="welcome-chart-overlay-project-desc">
                  {COIN_DESCRIPTIONS[chartPanelToken.symbol] || `Token info for ${chartPanelToken.name}. Price and on-chain data.`}
                </p>
                <div className="welcome-chart-overlay-project-links">
                  <a href="#" className="welcome-chart-overlay-link">Website</a>
                  <a href="#" className="welcome-chart-overlay-link">X</a>
                  <a href="#" className="welcome-chart-overlay-link">Telegram</a>
                </div>
              </div>
            )}
            {chartPanelToken.address && selectToken && (
              <button type="button" className="welcome-chart-overlay-view-details" onClick={() => { setChartPanelToken(null); selectToken(chartPanelToken) }}>
                View full details
              </button>
            )}
        </div>,
        document.body
      )}

      {!discoverOnly && (
        <>
      {/* Quick Actions */}
      <section className="quick-actions">
        <button className="action-btn">
          {icons.search}
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <button 
          className={`action-btn ${compareMode ? 'active' : ''}`}
          onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
        >
          {icons.compare}
          <span>{compareMode ? 'Exit Compare' : 'Compare'}</span>
          {compareMode && compareTokens.length > 0 && <span className="action-count">{compareTokens.length}</span>}
        </button>
        <button className="action-btn disabled">
          {icons.bell}
          <span>Alerts</span>
          <span className="action-badge">Soon</span>
        </button>
        <button className="action-btn disabled">
          {icons.portfolio}
          <span>Portfolio</span>
          <span className="action-badge">Soon</span>
        </button>
      </section>
      
      {/* Compare Floating Bar */}
      {compareMode && (
        <div className="compare-bar">
          <div className="compare-tokens">
            {compareTokens.length === 0 ? (
              <span className="compare-hint">Select 2-4 tokens to compare</span>
            ) : (
              compareTokens.map(token => (
                <div key={token.address} className="compare-token">
                  <span className="compare-token-symbol">{token.symbol}</span>
                  <button onClick={(e) => toggleCompareToken(token, e)}>{icons.close}</button>
                </div>
              ))
            )}
          </div>
          <div className="compare-actions">
            <button className="btn-secondary" onClick={exitCompareMode}>Cancel</button>
            <button className="btn-primary" disabled={compareTokens.length < 2} onClick={openCompareModal}>
              Compare{compareTokens.length >= 2 && ` (${compareTokens.length})`}
            </button>
          </div>
        </div>
      )}
        </>
      )}
      
      {/* Compare Modal - Silicon Valley Premium */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={closeCompareModal}>
          <div className="compare-modal" onClick={e => e.stopPropagation()}>
            <div className="compare-modal-header">
              <div className="compare-modal-title">
                <h2>Compare Tokens</h2>
                <span className="compare-modal-subtitle">Analyzing {compareTokens.length} assets side-by-side</span>
              </div>
              <button className="modal-close" onClick={closeCompareModal}>{icons.close}</button>
            </div>
            
            {/* Token Cards Header */}
            <div className="compare-tokens-header">
              {compareTokens.map((token, idx) => (
                <div key={token.address} className="compare-token-card">
                  <div className="compare-token-rank">#{token.rank || idx + 1}</div>
                  <div className="compare-token-avatar">
                    {token.logo ? (
                      <img src={token.logo} alt={token.symbol} />
                    ) : (
                      <span>{getTokenInitials(token.symbol)}</span>
                    )}
                  </div>
                  <div className="compare-token-info">
                    <span className="compare-token-symbol">{token.symbol}</span>
                    <span className="compare-token-name">{token.name}</span>
                  </div>
                  <span className="compare-token-network">{token.network}</span>
                  <button 
                    className="compare-token-view"
                    onClick={() => { handleSelectToken(token); closeCompareModal(); exitCompareMode() }}
                  >
                    View Details {icons.arrow}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="compare-modal-content">
              {/* Price Section */}
              <div className="compare-section">
                <h3 className="compare-section-title">Price & Performance</h3>
                <div className="compare-metrics-grid">
                  {/* Price */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Price</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => (
                        <div key={token.address} className="compare-metric-value">
                          <span className="metric-main">
                            ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 24h Change */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">24h Change</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const isWinner = token.change === Math.max(...compareTokens.map(t => t.change))
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className={`metric-main ${token.change >= 0 ? 'positive' : 'negative'}`}>
                              {token.change >= 0 ? '+' : ''}{formatChange(token.change)}%
                            </span>
                            {isWinner && <span className="winner-badge">Top Performer</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Market Data Section */}
              <div className="compare-section">
                <h3 className="compare-section-title">Market Metrics</h3>
                <div className="compare-metrics-grid">
                  {/* Market Cap */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Market Cap</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const maxMcap = Math.max(...compareTokens.map(t => t.marketCap))
                        const percentage = (token.marketCap / maxMcap) * 100
                        const isWinner = token.marketCap === maxMcap
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className="metric-main">{fmtLarge(token.marketCap)}</span>
                            <div className="compare-bar">
                              <div className="compare-bar-fill mcap" style={{ width: `${percentage}%` }}></div>
                            </div>
                            {isWinner && <span className="winner-badge">Largest Cap</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Volume */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Volume (24h)</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const maxVol = Math.max(...compareTokens.map(t => t.volume))
                        const percentage = (token.volume / maxVol) * 100
                        const isWinner = token.volume === maxVol
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className="metric-main">{fmtLarge(token.volume)}</span>
                            <div className="compare-bar">
                              <div className="compare-bar-fill volume" style={{ width: `${percentage}%` }}></div>
                            </div>
                            {isWinner && <span className="winner-badge">Most Traded</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Vol/MCap Ratio */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Turnover Rate</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const ratio = token.marketCap > 0 ? (token.volume / token.marketCap) * 100 : 0
                        const maxRatio = Math.max(...compareTokens.map(t => t.marketCap > 0 ? (t.volume / t.marketCap) * 100 : 0))
                        const isWinner = ratio === maxRatio && ratio > 0
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className="metric-main">{ratio.toFixed(2)}%</span>
                            {isWinner && <span className="winner-badge">High Activity</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Community Section */}
              <div className="compare-section">
                <h3 className="compare-section-title">Community & Liquidity</h3>
                <div className="compare-metrics-grid">
                  {/* Holders */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Holders</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const maxHolders = Math.max(...compareTokens.map(t => t.holders))
                        const percentage = (token.holders / maxHolders) * 100
                        const isWinner = token.holders === maxHolders
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className="metric-main">{token.holders.toLocaleString()}</span>
                            <div className="compare-bar">
                              <div className="compare-bar-fill holders" style={{ width: `${percentage}%` }}></div>
                            </div>
                            {isWinner && <span className="winner-badge">Most Holders</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Liquidity */}
                  <div className="compare-metric-row">
                    <span className="compare-metric-label">Liquidity</span>
                    <div className="compare-metric-values">
                      {compareTokens.map(token => {
                        const liq = token.liquidity || token.volume * 0.1
                        const maxLiq = Math.max(...compareTokens.map(t => t.liquidity || t.volume * 0.1))
                        const percentage = (liq / maxLiq) * 100
                        const isWinner = liq === maxLiq
                        return (
                          <div key={token.address} className={`compare-metric-value ${isWinner ? 'winner' : ''}`}>
                            <span className="metric-main">{fmtLarge(liq)}</span>
                            <div className="compare-bar">
                              <div className="compare-bar-fill volume" style={{ width: `${percentage}%` }}></div>
                            </div>
                            {isWinner && <span className="winner-badge">Deepest Pool</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Summary */}
              <div className="compare-summary">
                <div className="compare-summary-title">Analysis Summary</div>
                <div className="compare-summary-items">
                  {compareTokens.map(token => {
                    const totalMetrics = 5
                    const wins = [
                      token.change === Math.max(...compareTokens.map(t => t.change)),
                      token.marketCap === Math.max(...compareTokens.map(t => t.marketCap)),
                      token.volume === Math.max(...compareTokens.map(t => t.volume)),
                      token.holders === Math.max(...compareTokens.map(t => t.holders)),
                      (token.liquidity || token.volume * 0.1) === Math.max(...compareTokens.map(t => t.liquidity || t.volume * 0.1)),
                    ].filter(Boolean).length
                    return (
                      <div key={token.address} className="compare-summary-item">
                        <span className="summary-token">{token.symbol}</span>
                        <span className="summary-wins">{wins}/{totalMetrics} metrics leading</span>
                        <span className={`summary-change ${token.change >= 0 ? 'positive' : 'negative'}`}>
                          {token.change >= 0 ? '↑' : '↓'} {formatChange(Math.abs(token.change))}% today
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-card token popup: History | Live | Predictions – portaled to body so it's not clipped by welcome-page transform */}
      {tokenCardPopup && typeof document !== 'undefined' && (() => {
        const popSymbol = tokenCardPopup.symbol
        const liveData = topCoinPrices?.[popSymbol] || {}
        const livePrice = liveData.price ?? tokenCardPopup.price
        const liveChange = liveData.change ?? tokenCardPopup.change
        const liveChange1h = liveData.change1h ?? null
        const liveChange7d = liveData.change7d ?? null
        const liveVolume = liveData.volume ?? null
        const liveMcap = liveData.marketCap ?? null
        const tc = TOKEN_ROW_COLORS[popSymbol]
        const tokenRgb = tc?.bg || '255,255,255'
        const sparkData = liveData.sparkline_7d ?? tokenCardPopup.sparkline_7d ?? []
        return createPortal(
        <div
          className={`token-card-popup-overlay ${dayMode ? 'token-card-popup-day-mode' : ''}`}
          onClick={closeTokenCardPopup}
          role="dialog"
          aria-modal="true"
          aria-labelledby="token-card-popup-title"
        >
          <div className="token-card-popup" style={{ '--tc-rgb': tokenRgb }} onClick={(e) => e.stopPropagation()}>
            {/* Token-branded ambient glow behind popup */}
            <div className="token-card-popup-glow" />
            <button
              type="button"
              className="token-card-popup-close"
              onClick={closeTokenCardPopup}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {/* Header with logo + title */}
            <div className="token-card-popup-header">
              <div className="token-card-popup-header-avatar" style={{ borderColor: `rgba(${tokenRgb}, 0.4)` }}>
                {tokenCardPopup.logo ? <img src={tokenCardPopup.logo} alt="" /> : <span>{popSymbol?.[0]}</span>}
              </div>
              <div>
                <h2 id="token-card-popup-title" className="token-card-popup-title">{tokenCardPopup.name}</h2>
                <span className="token-card-popup-subtitle">Past, Present & Future</span>
              </div>
            </div>
            <div className="token-card-popup-grid">
              {/* Card 1: History (past) */}
              <div
                className={`token-card token-card-history${tokenCardExpandedCard === 'history' ? ' token-card-expanded' : ''}`}
                onClick={(e) => { e.stopPropagation(); setTokenCardExpandedCard((prev) => prev === 'history' ? null : 'history') }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTokenCardExpandedCard((prev) => prev === 'history' ? null : 'history') } }}
                aria-pressed={tokenCardExpandedCard === 'history'}
              >
                <div className="token-card-head">
                  <span className="token-card-dot token-card-dot-green" />
                  <span className="token-card-label">HISTORY</span>
                  <span className="token-card-head-tag">7 Days</span>
                </div>
                <div className="token-card-body token-card-history-body">
                  {(() => {
                    const points = sparkData.length > 1 ? sparkData : getHistorySparkline(livePrice, liveChange, sparkData)
                    if (!points.length) return <div className="token-card-chart-placeholder">No chart data</div>
                    const high = Math.max(...points)
                    const low = Math.min(...points)
                    const range = high - low || 1
                    const pctFromHigh = livePrice ? ((livePrice - high) / high * 100) : 0
                    const w = 280, h = 130
                    const d = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - low) / range) * (h - 16) - 8}`).join(' ')
                    const areaD = d + ` ${w},${h} 0,${h}`
                    const isUp = liveChange != null ? Number(liveChange) >= 0 : points[points.length - 1] >= points[0]
                    const color = isUp ? '#00e676' : '#ff1744'
                    // Position in range (0 = at low, 100 = at high)
                    const rangePos = livePrice ? Math.max(0, Math.min(100, ((livePrice - low) / range) * 100)) : 50
                    return (
                      <>
                        <div className="token-card-chart token-card-chart-full">
                          <svg viewBox={`0 0 ${w} ${h}`} className={`token-card-sparkline ${isUp ? 'up' : 'down'}`} preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`tcg-${popSymbol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.30" />
                                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                              </linearGradient>
                            </defs>
                            <polygon fill={`url(#tcg-${popSymbol})`} points={areaD} />
                            <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={d} />
                          </svg>
                        </div>
                        <div className="token-card-history-metrics">
                          <div className="token-card-hm-row">
                            <span className="token-card-hm-label">7d High</span>
                            <span className="token-card-hm-value">{fmtPrice(high)}</span>
                          </div>
                          <div className="token-card-hm-row">
                            <span className="token-card-hm-label">7d Low</span>
                            <span className="token-card-hm-value">{fmtPrice(low)}</span>
                          </div>
                          <div className="token-card-hm-range">
                            <div className="token-card-hm-range-track">
                              <div className="token-card-hm-range-fill" style={{ width: `${rangePos}%`, background: color }} />
                              <div className="token-card-hm-range-thumb" style={{ left: `${rangePos}%`, borderColor: color, boxShadow: `0 0 8px ${color}` }} />
                            </div>
                          </div>
                          <div className="token-card-hm-row">
                            <span className="token-card-hm-label">From High</span>
                            <span className={`token-card-hm-value ${pctFromHigh >= 0 ? 'positive' : 'negative'}`}>{pctFromHigh >= 0 ? '+' : ''}{pctFromHigh.toFixed(1)}%</span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">CHART SHOWS YOU</span>
                  <span className="token-card-footer-highlight">the past</span>
                </div>
              </div>

              {/* Card 2: Live (present) — REAL-TIME */}
              <div
                className={`token-card token-card-live${tokenCardExpandedCard === 'live' ? ' token-card-expanded' : ''}`}
                onClick={(e) => { e.stopPropagation(); setTokenCardExpandedCard((prev) => prev === 'live' ? null : 'live') }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTokenCardExpandedCard((prev) => prev === 'live' ? null : 'live') } }}
                aria-pressed={tokenCardExpandedCard === 'live'}
              >
                <div className="token-card-head">
                  <span className="token-card-dot token-card-dot-live" />
                  <span className="token-card-label">LIVE</span>
                  <span className="token-card-head-tag token-card-head-tag-live">Real-time</span>
                </div>
                <div className="token-card-body">
                  <div className="token-card-live-token">
                    <div className="token-card-live-avatar" style={{ boxShadow: `0 0 20px rgba(${tokenRgb}, 0.3)`, border: `2px solid rgba(${tokenRgb}, 0.4)` }}>
                      {tokenCardPopup.logo ? <img src={tokenCardPopup.logo} alt="" /> : <span>{popSymbol?.[0]}</span>}
                    </div>
                    <div>
                      <div className="token-card-live-name">{tokenCardPopup.name}</div>
                      <div className="token-card-live-symbol">{popSymbol}</div>
                    </div>
                  </div>
                  <div className="token-card-live-price">{fmtPrice(livePrice)}</div>
                  <div className="token-card-live-changes">
                    {liveChange1h != null && (
                      <span className={`token-card-live-chip ${liveChange1h >= 0 ? 'positive' : 'negative'}`}>
                        1h {liveChange1h >= 0 ? '+' : ''}{Number(liveChange1h).toFixed(1)}%
                      </span>
                    )}
                    {liveChange != null && (
                      <span className={`token-card-live-chip ${liveChange >= 0 ? 'positive' : 'negative'}`}>
                        24h {liveChange >= 0 ? '+' : ''}{Number(liveChange).toFixed(1)}%
                      </span>
                    )}
                    {liveChange7d != null && (
                      <span className={`token-card-live-chip ${liveChange7d >= 0 ? 'positive' : 'negative'}`}>
                        7d {liveChange7d >= 0 ? '+' : ''}{Number(liveChange7d).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="token-card-live-meta">
                    {liveMcap != null && liveMcap > 0 && <span>MCap <b>{fmtLarge(liveMcap)}</b></span>}
                    {liveVolume != null && liveVolume > 0 && <span>Vol <b>{fmtLarge(liveVolume)}</b></span>}
                  </div>
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">PRICE SHOWS YOU</span>
                  <span className="token-card-footer-highlight">the present</span>
                </div>
              </div>

              {/* Card 3: Predictions (future) */}
              <div
                className={`token-card token-card-predictions${tokenCardExpandedCard === 'predictions' ? ' token-card-expanded' : ''}`}
                onClick={(e) => { e.stopPropagation(); setTokenCardExpandedCard((prev) => prev === 'predictions' ? null : 'predictions') }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTokenCardExpandedCard((prev) => prev === 'predictions' ? null : 'predictions') } }}
                aria-pressed={tokenCardExpandedCard === 'predictions'}
              >
                <div className="token-card-head">
                  <span className="token-card-dot token-card-dot-purple" />
                  <span className="token-card-label">PREDICTIONS</span>
                </div>
                <div className="token-card-body token-card-predictions-body">
                  {getTokenPredictions(popSymbol, livePrice).map((pred, i) => {
                    const pctChange = livePrice ? ((pred.target - livePrice) / livePrice * 100) : 0
                    return (
                      <div key={i} className={`token-card-pred-row ${pred.up ? 'pred-up' : 'pred-down'}`}>
                        <div className="token-card-pred-header">
                          <span className={`token-card-pred-arrow ${pred.up ? 'up' : 'down'}`}>
                            {pred.up ? '▲' : '▼'}
                          </span>
                          <span className="token-card-pred-target">{fmtPrice(pred.target)}</span>
                          <span className={`token-card-pred-pct ${pred.up ? 'positive' : 'negative'}`}>
                            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(0)}%
                          </span>
                        </div>
                        <div className="token-card-pred-bar-wrap">
                          <div className={`token-card-pred-bar ${pred.up ? 'bar-up' : 'bar-down'}`} style={{ width: `${Math.min(pred.prob, 100)}%` }} />
                          <span className="token-card-pred-prob-label">{pred.prob}%</span>
                        </div>
                        <div className="token-card-pred-meta">
                          <span className="token-card-pred-date">by {pred.date}</span>
                          <span className="token-card-pred-conf">{pred.prob >= 50 ? 'Likely' : pred.prob >= 30 ? 'Possible' : 'Unlikely'}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="token-card-pred-powered">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="rgba(167,139,250,0.5)" strokeWidth="1"/><circle cx="5" cy="5" r="1.5" fill="rgba(167,139,250,0.7)"/></svg>
                    Polymarket • Kalshi • Metaculus
                  </div>
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">MARKETS SHOW YOU</span>
                  <span className="token-card-footer-highlight">the future</span>
                </div>
              </div>
            </div>
            <div className="token-card-popup-actions">
              <button type="button" className="token-card-popup-view-details" onClick={() => { closeTokenCardPopup(); if (onOpenResearchZone) onOpenResearchZone(tokenCardPopup); else handleSelectToken(tokenCardPopup); }}>
                View full details
              </button>
            </div>
          </div>
        </div>,
        document.body
        )
      })()}
      <ProductTour
        isActive={tourActive}
        currentStep={tourStep}
        onNext={() => {
          setTourStep((s) => {
            if (s < 6) return s + 1
            setTourActive(false)
            return 0
          })
        }}
        onBack={() => setTourStep((s) => (s > 0 ? s - 1 : 0))}
        onSkip={() => setTourActive(false)}
        dayMode={dayMode}
      />
    </div>
  )
}

export default WelcomePage
