/**
 * Research Zone LITE – CMC-style token page (plan: docs/RESEARCH_ZONE_LITE_PLAN.md)
 * Landing-page style icons and UI (aligned with WelcomePage).
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { getCryptoPanicNews, getCryptoNews, getRssMarketNews } from '../services/cryptoNewsApi'
import { getCoinDetails, getTopCoinsMarketsPage } from '../services/coinGeckoApi'
import { getBinancePrices } from '../services/binanceApi'
import { getPredictionMarketsForToken } from '../services/polymarketApi'
import { getStockQuote, getStockQuotes, getStockLogoUrl, getCompanyProfile, FALLBACK_STOCK_DATA } from '../services/stockApi'
import { resolveTradingViewSymbol } from '../lib/tradingViewSymbols'
import { getStockNews } from '../services/stockNewsApi'
import { useChartData } from '../hooks/useCodexData'
import TradingChart from './TradingChart'
import MobileTabBar from './MobileTabBar'
import { useIsMobile } from '../hooks/useMediaQuery'
import spectreIcons from '../icons/spectreIcons'
import { TOKEN_ROW_COLORS, getTokenDisplayColors } from '../constants/tokenColors'
import ResearchZonePro from './ResearchZonePro'
import CinemaResearchZone from './cinema/CinemaResearchZone'
import './ResearchZoneLite.css'
import './WelcomePage.css'

const DEFAULT_SYMBOL = 'BTC'

// Icons: landing Apple style – spectreIcons (same as WelcomePage)
const icons = {
  news: spectreIcons.news,
  info: spectreIcons.globe,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sector: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  timeframe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  filters: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 4.5zm0 7.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 7.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  twitter: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  retweet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  externalLink: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  rss: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 21a9 9 0 10-9-9m9 9c0 1.657-.39 3.215-1.07 4.62M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m-3 9a3 3 0 116 0 3 3 0 01-6 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

// Mock tweets with optional link preview (image, title, url, description)
const MOCK_TWEETS = {
  BTC: [
    { id: 1, handle: 'CryptoBanter', name: 'Crypto Banter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=banter', content: 'Bitcoin holding key support at $96K. Institutional flow still positive. Next target $100K if we break resistance.', time: '2h', likes: 1247, retweets: 89, preview: { title: 'Bitcoin On-Chain: Accumulation Phase', description: 'Long-term holders adding; exchange reserves at lows.', imageUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', url: 'https://example.com/btc-analysis' } },
    { id: 2, handle: 'DocumentingBTC', name: 'Documenting Bitcoin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=docbtc', content: 'BTC dominance at 56% – alt season waiting for a breakout. History suggests we could see rotation soon.', time: '4h', likes: 892, retweets: 156, preview: { title: 'Dominance & Alt Season Cycles', description: 'Historical rotation patterns and what to watch.', url: 'https://example.com/dominance' } },
    { id: 3, handle: 'WillyWoo', name: 'Willy Woo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=woo', content: 'On-chain: long-term holders not selling. Supply shock narrative intact. $BTC', time: '6h', likes: 2341, retweets: 312, preview: { title: 'LTH Supply & Exchange Outflows', description: 'Net unrealized profit/loss and holder behavior.', imageUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', url: 'https://example.com/onchain' } },
    { id: 4, handle: 'glassnode', name: 'Glassnode', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=glass', content: 'Bitcoin exchange reserves at multi-year lows. Fewer coins available = potential upside pressure.', time: '8h', likes: 567, retweets: 78 },
    { id: 5, handle: 'CryptoKaleo', name: 'Kaleo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kaleo', content: 'Still bullish on BTC. This pullback is healthy. Targeting 100K by EOM.', time: '10h', likes: 1892, retweets: 201, preview: { title: 'BTC Technicals: 100K Target', description: 'Key levels and invalidation zones.', url: 'https://example.com/btc-tech' } },
  ],
  ETH: [
    { id: 1, handle: 'VitalikButerin', name: 'Vitalik Buterin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik', content: 'Ethereum roadmap update: PBS and full danksharding progress. Scaling is the priority.', time: '1h', likes: 4521, retweets: 567, preview: { title: 'Ethereum Roadmap 2025', description: 'Proposer-builder separation and danksharding timeline.', imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', url: 'https://example.com/eth-roadmap' } },
    { id: 2, handle: 'econoar', name: 'Econoar', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=econoar', content: 'ETH/BTC ratio looking for a bounce. Historically a good risk/reward here.', time: '3h', likes: 678, retweets: 92 },
    { id: 3, handle: 'sassal0x', name: 'Sassal', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sassal', content: 'Ethereum L2s now processing more TPS than mainnet. The flippening is happening on L2.', time: '5h', likes: 1234, retweets: 189, preview: { title: 'L2 Activity Report', description: 'Base, Arbitrum, Optimism TPS and fees.', url: 'https://example.com/l2-report' } },
  ],
  SOL: [
    { id: 1, handle: 'aaboron', name: 'Ansem', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ansem', content: 'Solana ecosystem growth is insane. Dev activity and TVL tell the story.', time: '2h', likes: 2891, retweets: 345, preview: { title: 'Solana Dev & TVL Dashboard', description: 'Weekly active devs and total value locked.', imageUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', url: 'https://example.com/sol-dashboard' } },
    { id: 2, handle: 'SolanaOfficial', name: 'Solana', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=solana', content: 'Firedancer testnet milestones hit. Next phase of network performance upgrades incoming.', time: '5h', likes: 1567, retweets: 234, preview: { title: 'Firedancer Testnet Update', description: 'Throughput and latency improvements.', url: 'https://example.com/firedancer' } },
    { id: 3, handle: 'mert_finance', name: 'Mert', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mert', content: 'SOL holding up well vs BTC. Strong relative strength in this correction.', time: '7h', likes: 734, retweets: 67 },
  ],
}

const TOKEN_NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana' }

// Agent RSS Feed – signals from Spectre AI agents (rules.md)
// Agents: Orchestrator, Frontend, UX Designer, Creative Director, Backend, Platform, Security, Blockchain
const MOCK_AGENT_SIGNALS = {
  BTC: [
    { id: 1, agent: 'Lead Orchestrator', message: 'Synthesis: BTC at $77K after 8% flush. Coordinating all agents — Backend confirms exchange data reliable, Blockchain tracking whale wallets, Security flagging unusual API traffic patterns.', time: '5m ago' },
    { id: 2, agent: 'Backend Orchestrator', message: 'Data channels healthy. Codex API latency 45ms. TradingView WebSocket stable. Fallback to CoinGecko triggered 2x in last hour during volume spike. Cache hit rate 94%.', time: '12m ago' },
    { id: 3, agent: 'Blockchain Agent', message: 'On-chain: 5,200 BTC moved from dormant wallet (2019) to Coinbase. Gas fees elevated on ETH. Whale wallet 0x7a3...f2c accumulated 340 BTC in last 4h.', time: '18m ago' },
    { id: 4, agent: 'Security Agent', message: 'Alert: Unusual API request pattern detected — possible scraping attempt blocked. Rate limiting engaged. All user sessions secure. No anomalies in transaction signing.', time: '26m ago' },
    { id: 5, agent: 'Platform Specialist', message: 'Mobile users up 34% during volatility. Push notifications delivered 99.2%. iOS widget updates stable. Android memory usage optimized after patch.', time: '35m ago' },
    { id: 6, agent: 'UX Designer', message: 'Price display updated to handle 6-figure formatting. Red/green color contrast verified for accessibility. Loading skeletons performing well during data spikes.', time: '48m ago' },
    { id: 7, agent: 'Creative Director', message: 'User engagement spike: session duration +42% during volatility. Gamification: 1,247 users earned "Diamond Hands" badge holding through dip. Social sharing up 3x.', time: '1h ago' },
  ],
  ETH: [
    { id: 1, agent: 'Lead Orchestrator', message: 'ETH analysis coordinated. Blockchain Agent monitoring L2 bridges, Backend handling increased WebSocket load, Platform Specialist optimizing mobile chart rendering.', time: '6m ago' },
    { id: 2, agent: 'Blockchain Agent', message: 'L2 activity: Base bridge volume +$28M (24h). Arbitrum TVL stable. Blob usage at 78% capacity. Gas on mainnet averaging 35 gwei. Validator queue: 2,400 pending.', time: '14m ago' },
    { id: 3, agent: 'Backend Orchestrator', message: 'ETH price channel: 847 subscribers. Chart data cached at 5m TTL. Alchemy RPC healthy. TheGraph indexed to block 19,234,567. Social sentiment API responding.', time: '22m ago' },
    { id: 4, agent: 'Creative Director', message: 'User engagement: ETH token page avg session 4.2min (+18% vs yesterday). Chart interactions up during volatility. Social sharing of price alerts increased 3x.', time: '31m ago' },
    { id: 5, agent: 'Frontend Engineer', message: 'TradingView widget rendering optimized. Reduced re-renders on price updates. Error boundary caught 3 chart loading failures — graceful fallback displayed.', time: '42m ago' },
    { id: 6, agent: 'Security Agent', message: 'Wallet connection requests verified. No suspicious signing attempts. CSP headers validated. API keys rotation scheduled for next maintenance window.', time: '55m ago' },
    { id: 7, agent: 'UX Designer', message: 'L2 ecosystem cards redesigned with glassmorphism. Bridge flow simplified to 3 steps. Dark mode contrast ratios verified WCAG AA compliant.', time: '1h ago' },
  ],
  SOL: [
    { id: 1, agent: 'Lead Orchestrator', message: 'SOL monitoring active. Blockchain Agent tracking Helius RPC, Platform Specialist handling increased mobile traffic from SOL ecosystem users.', time: '7m ago' },
    { id: 2, agent: 'Blockchain Agent', message: 'Solana network: TPS at 3,200. No congestion. Helius RPC latency 12ms. Firedancer testnet block time improved to 380ms. Validator count stable at 1,847.', time: '15m ago' },
    { id: 3, agent: 'Backend Orchestrator', message: 'SOL data channels: Price updates 100ms interval. DeFi TVL aggregation from DefiLlama cached. Jupiter swap volume API integrated. Fallback to Solscan ready.', time: '24m ago' },
    { id: 4, agent: 'Platform Specialist', message: 'SOL page performance: LCP 1.2s mobile, 0.8s desktop. Virtualized token list handling 2,400 SPL tokens. Pull-to-refresh latency reduced to 180ms.', time: '33m ago' },
    { id: 5, agent: 'UX Designer', message: 'SOL ecosystem cards redesigned with glassmorphism. Token logos lazy-loading. Meme coin section using warmer accent colors per user feedback.', time: '45m ago' },
    { id: 6, agent: 'Creative Director', message: 'SOL users show 2.3x higher engagement with social features. Gamification: 847 users earned "Solana Explorer" badge this week. Retention up 12%.', time: '58m ago' },
    { id: 7, agent: 'Security Agent', message: 'Phantom wallet integration audited. Transaction simulation verified before signing. No malicious dApp connection attempts detected.', time: '1h ago' },
  ],
}

const RZ_TOKEN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}

// Mock token overview (price, change, market cap, volume, FDV, supply, ATH/ATL, score) – BTC at 77.6k
const MOCK_TOKEN_DATA = {
  BTC: { rank: 1, price: 77600, change24h: -5.5, change1m: -4.2, mcap: 1521000000000, volume24h: 32000000000, volMcapPct: 2.1, fdv: 1521000000000, circulating: 19600000, maxSupply: 21000000, ath: 126080, athDate: 'Mar 14, 2025', athChangePct: -38.42, atl: 67.81, atlDate: 'Jul 6, 2013', atlChangePct: 114317.55, score: 5.0, low24h: 75200, high24h: 82400 },
  ETH: { rank: 2, price: 2580, change24h: -4.8, change1m: -3.1, mcap: 310000000000, volume24h: 16800000000, volMcapPct: 5.4, fdv: 310000000000, circulating: 120000000, maxSupply: null, ath: 4878, athDate: 'Nov 10, 2021', athChangePct: -47.11, atl: 0.43, atlDate: 'Oct 20, 2015', atlChangePct: 599767.4, score: 5.2, low24h: 2520, high24h: 2720 },
  SOL: { rank: 3, price: 165, change24h: -5.2, change1m: -2.8, mcap: 75900000000, volume24h: 3800000000, volMcapPct: 5.0, fdv: 75900000000, circulating: 460000000, maxSupply: null, ath: 259, athDate: 'Nov 6, 2021', athChangePct: -36.29, atl: 0.5, atlDate: 'May 26, 2020', atlChangePct: 32900, score: 4.8, low24h: 158, high24h: 178 },
}

const MOCK_CATEGORIES = {
  BTC: ['Smart Contract Platform', 'Layer 1 (L1)', 'Proof of Work (PoW)', 'Bitcoin Ecosystem'],
  ETH: ['Smart Contract Platform', 'Layer 1 (L1)', 'Proof of Stake (PoS)', 'Ethereum Ecosystem'],
  SOL: ['Smart Contract Platform', 'Layer 1 (L1)', 'Proof of Stake (PoS)', 'Solana Ecosystem'],
}

// Mock markets table (Exchange, Pair, Price, ±2% Depth, Volume 24h, Volume %, Liquidity) – BTC at 77.6k
const MOCK_MARKETS = [
  { exchange: 'Binance', pair: 'BTC/USDT', price: 77598, depthPlus2: 1240000, depthMinus2: 1180000, volume24h: 9200000000, volumePct: 28.8, liquidity: 450000000 },
  { exchange: 'Coinbase', pair: 'BTC/USD', price: 77602, depthPlus2: 420000, depthMinus2: 398000, volume24h: 3500000000, volumePct: 10.9, liquidity: 180000000 },
  { exchange: 'OKX', pair: 'BTC/USDT', price: 77599, depthPlus2: 680000, depthMinus2: 650000, volume24h: 3200000000, volumePct: 10.2, liquidity: 220000000 },
  { exchange: 'Bybit', pair: 'BTC/USDT', price: 77601, depthPlus2: 520000, depthMinus2: 500000, volume24h: 2800000000, volumePct: 8.4, liquidity: 190000000 },
  { exchange: 'Kraken', pair: 'BTC/USD', price: 77600, depthPlus2: 280000, depthMinus2: 265000, volume24h: 1400000000, volumePct: 4.2, liquidity: 95000000 },
  { exchange: 'Bitget', pair: 'BTC/USDT', price: 77597, depthPlus2: 380000, depthMinus2: 360000, volume24h: 1100000000, volumePct: 3.4, liquidity: 140000000 },
  { exchange: 'Gate.io', pair: 'BTC/USDT', price: 77603, depthPlus2: 310000, depthMinus2: 295000, volume24h: 820000000, volumePct: 2.5, liquidity: 88000000 },
  { exchange: 'KuCoin', pair: 'BTC/USDT', price: 77596, depthPlus2: 290000, depthMinus2: 278000, volume24h: 720000000, volumePct: 2.3, liquidity: 76000000 },
  { exchange: 'Upbit', pair: 'BTC/KRW', price: 77604, depthPlus2: 190000, depthMinus2: 182000, volume24h: 620000000, volumePct: 1.9, liquidity: 62000000 },
]

const MARKET_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'cex', label: 'CEX' },
  { id: 'dex', label: 'DEX' },
  { id: 'spot', label: 'Spot' },
  { id: 'perpetual', label: 'Perpetual' },
  { id: 'futures', label: 'Futures' },
]

// Mock prediction markets (shown when API has no data or as example rows)
const MOCK_PREDICTION_MARKETS = {
  BTC: [
    { id: 'mock-btc-1', question: 'Will BTC hit $95,000 by March 5th?', yesPct: 62, volumeFormatted: '1.24M', endDate: 'Mar 5, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-btc-2', question: 'Will BTC be above $100k by end of 2025?', yesPct: 58, volumeFormatted: '2.18M', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-btc-3', question: 'Will BTC hit $120,000 before June 2025?', yesPct: 41, volumeFormatted: '890K', endDate: 'Jun 30, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-btc-4', question: 'Will MicroStrategy sell any Bitcoin in 2025?', yesPct: 6, volumeFormatted: '19.6M', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-btc-5', question: 'Will BTC drop below $80k in Q1 2025?', yesPct: 22, volumeFormatted: '540K', endDate: 'Mar 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
  ],
  ETH: [
    { id: 'mock-eth-1', question: 'Will ETH hit $4,000 by April 2025?', yesPct: 55, volumeFormatted: '1.02M', endDate: 'Apr 30, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-eth-2', question: 'Will ETH be above $5k by end of 2025?', yesPct: 48, volumeFormatted: '890K', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-eth-3', question: 'Spot Ethereum ETF approved in 2025?', yesPct: 67, volumeFormatted: '2.1M', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-eth-4', question: 'Will ETH/BTC ratio exceed 0.06 by June?', yesPct: 38, volumeFormatted: '420K', endDate: 'Jun 30, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-eth-5', question: 'Will ETH drop below $3,000 in Q1 2025?', yesPct: 28, volumeFormatted: '310K', endDate: 'Mar 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
  ],
  SOL: [
    { id: 'mock-sol-1', question: 'Will SOL hit $250 by June 2025?', yesPct: 52, volumeFormatted: '1.15M', endDate: 'Jun 30, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-sol-2', question: 'Will SOL be above $300 by end of 2025?', yesPct: 38, volumeFormatted: '720K', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-sol-3', question: 'Will Solana TVL exceed $10B by July 2025?', yesPct: 44, volumeFormatted: '380K', endDate: 'Jul 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-sol-4', question: 'Will SOL drop below $180 in Q1 2025?', yesPct: 31, volumeFormatted: '290K', endDate: 'Mar 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
    { id: 'mock-sol-5', question: 'Will SOL outperform BTC in 2025?', yesPct: 35, volumeFormatted: '510K', endDate: 'Dec 31, 2025', platform: 'Polymarket', url: 'https://polymarket.com' },
  ],
}

function formatChange (n) {
  if (n == null || Number.isNaN(n)) return '0.00'
  const x = Number(n)
  return x.toFixed(2)
}

function formatNewsTime (publishedOn) {
  if (!publishedOn) return ''
  const sec = Math.floor(Date.now() / 1000) - Number(publishedOn)
  if (sec < 60) return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`
  return `${Math.floor(sec / 604800)}w`
}

// formatCryptoPrice removed — use fmtPrice from useCurrency hook

function getHistorySparkline (price, change, realSparkline = null) {
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
  const curve = isUp ? [0.15, 0.3, 0.4, 0.55, 0.7, 0.85, 1] : [1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1]
  return curve.map((v) => low + range * v)
}

function getTokenPredictions (symbol, price) {
  const p = price && Number(price) > 0 ? Number(price) : 100
  return [
    { target: p * 1.25, date: 'Mar 31', prob: 55, up: true },
    { target: p * 1.5, date: 'Jun 30', prob: 34, up: true },
    { target: p * 0.75, date: 'Mar 31', prob: 22, up: false },
  ]
}

const ResearchZoneLite = ({ initialSymbol, initialToken, onTokenSelect, dayMode: dayModeProp, onDayModeChange, cinemaMode, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge, fmtPriceShort, currencySymbol } = useCurrency()
  const isStock = marketMode === 'stocks'
  const isMobile = useIsMobile()
  const [mode, setMode] = useState('lite')
  const [mobileMainTab, setMobileMainTab] = useState('chart') // 'chart' | 'info' | 'feed'
  const [dayModeLocal, setDayModeLocal] = useState(false)
  const dayMode = dayModeProp !== undefined ? dayModeProp : dayModeLocal
  const setDayMode = (value) => {
    if (onDayModeChange) onDayModeChange(value)
    else setDayModeLocal(value)
  }
  const [symbol, setSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const s = params.get('symbol')?.toUpperCase()
      if (s && s.length) return s
    }
    const fromProp = (initialSymbol || '').toString().trim().toUpperCase()
    if (fromProp) return fromProp
    return DEFAULT_SYMBOL
  })
  // Store the full token info (including address and networkId) for chart
  const [activeTokenInfo, setActiveTokenInfo] = useState(() => initialToken || null)

  // When navigating from Top Coins (tabs off), show the token that was clicked.
  useEffect(() => {
    const s = (initialSymbol || '').toString().trim().toUpperCase()
    if (s && s !== symbol) setSymbol(s)
    // Also update token info when a new token is passed
    if (initialToken) setActiveTokenInfo(initialToken)
  }, [initialSymbol, initialToken])

  // Track previous marketMode so we can reset symbol on toggle
  const prevMarketModeRef = React.useRef(marketMode)
  useEffect(() => {
    if (prevMarketModeRef.current === marketMode) return
    prevMarketModeRef.current = marketMode
    // Reset to sensible default when switching between crypto ↔ stocks
    if (marketMode === 'stocks') {
      setSymbol('AAPL')
      setActiveTokenInfo({ symbol: 'AAPL', name: 'Apple Inc.', isStock: true })
    } else {
      setSymbol('BTC')
      setActiveTokenInfo({ symbol: 'BTC', name: 'Bitcoin', address: '', networkId: 1 })
    }
    // Clear stale data so new symbol fetches fresh
    setNewsItems([])
    setLastNewsUpdate(null)
    setNewsSource(null)
  }, [marketMode])

  const [marketFilter, setMarketFilter] = useState('all')
  const [newsItems, setNewsItems] = useState([])
  const [lastNewsUpdate, setLastNewsUpdate] = useState(null)
  const [marketsSectionTab, setMarketsSectionTab] = useState('markets')
  const [predictionMarkets, setPredictionMarkets] = useState([])
  const [aboutDetails, setAboutDetails] = useState(null)
  const [tokenCardPopup, setTokenCardPopup] = useState(null)
  const [tokenCardExpandedCard, setTokenCardExpandedCard] = useState(null)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [rightFeedTab, setRightFeedTab] = useState('agent') // 'agent' | 'news' | 'tweets'

  // Chart drag-to-resize
  const [chartHeight, setChartHeight] = useState(480)
  const chartHeightRef = useRef(480)

  const onChartDragStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = chartHeightRef.current
    // Add a full-page overlay to prevent iframes from stealing mouse events
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:row-resize;'
    document.body.appendChild(overlay)
    const onMove = (ev) => {
      const newH = Math.max(250, Math.min(900, startH + (ev.clientY - startY)))
      chartHeightRef.current = newH
      setChartHeight(newH)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      overlay.remove()
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('symbol')?.toUpperCase() !== symbol) {
      const next = new URLSearchParams(window.location.search)
      next.set('symbol', symbol)
      const url = `${window.location.pathname}?${next.toString()}`
      window.history.replaceState({}, '', url)
    }
  }, [symbol])

  // Token-branded ambient background glow — with brightness-safe variants
  const displayColors = useMemo(() => getTokenDisplayColors(symbol), [symbol])
  const tokenAmbientStyle = useMemo(() => {
    const tc = TOKEN_ROW_COLORS[symbol]
    if (!tc) return {}
    return {
      '--rz-token-rgb': tc.bg,
      '--rz-token-rgb-accent': displayColors.accent,       // safe for dark bg text
      '--rz-token-rgb-accent-day': displayColors.accentDay, // safe for light bg text
      '--rz-token-gradient': tc.gradient,
      '--rz-glow-opacity': displayColors.glowOpacity,       // boosted for dark tokens
    }
  }, [symbol, displayColors])


  const [newsSource, setNewsSource] = useState(null) // 'CryptoPanic' | 'CryptoCompare' | 'RSS'

  const fetchNews = React.useCallback(() => {
    setNewsSource(null)
    if (isStock) {
      // Stock mode: fetch from stock news API
      getStockNews(symbol).then((items) => {
        if (items && items.length > 0) {
          setNewsItems(items.map(item => ({
            title: item.title,
            url: item.url,
            source: item.source || 'Market News',
            imageUrl: item.image,
            time: item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '',
          })))
          setLastNewsUpdate(Date.now())
          setNewsSource('Finnhub')
        }
      }).catch(() => {})
      return
    }
    getCryptoPanicNews(symbol, 10).then((list) => {
      if (list.length > 0) {
        setNewsItems(list)
        setLastNewsUpdate(Date.now())
        setNewsSource('CryptoPanic')
        return
      }
      getCryptoNews(symbol, 10).then((fallback) => {
        if (fallback.length > 0) {
          setNewsItems(fallback)
          setLastNewsUpdate(Date.now())
          setNewsSource('CryptoCompare')
          return
        }
        getRssMarketNews(symbol, 10).then((rss) => {
          setNewsItems(rss)
          setLastNewsUpdate(Date.now())
          setNewsSource('RSS')
        })
      })
    })
  }, [symbol, isStock])

  useEffect(() => {
    let cancelled = false
    setNewsItems([])
    setLastNewsUpdate(null)
    setNewsSource(null)
    if (isStock) {
      getStockNews(symbol).then((items) => {
        if (cancelled) return
        if (items && items.length > 0) {
          setNewsItems(items.map(item => ({
            title: item.title,
            url: item.url,
            source: item.source || 'Market News',
            imageUrl: item.image,
            time: item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '',
          })))
          setLastNewsUpdate(Date.now())
          setNewsSource('Finnhub')
        }
      }).catch(() => {})
    } else {
      getCryptoPanicNews(symbol, 10).then((list) => {
        if (cancelled) return
        if (list.length > 0) {
          setNewsItems(list)
          setLastNewsUpdate(Date.now())
          setNewsSource('CryptoPanic')
          return
        }
        getCryptoNews(symbol, 10).then((fallback) => {
          if (cancelled) return
          if (fallback.length > 0) {
            setNewsItems(fallback)
            setLastNewsUpdate(Date.now())
            setNewsSource('CryptoCompare')
            return
          }
          getRssMarketNews(symbol, 10).then((rss) => {
            if (!cancelled) {
              setNewsItems(rss)
              setLastNewsUpdate(Date.now())
              setNewsSource('RSS')
            }
          })
        })
      })
    }
    return () => { cancelled = true }
  }, [symbol, isStock])

  useEffect(() => {
    if (!symbol) return
    const interval = setInterval(fetchNews, 2.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [symbol, fetchNews])

  const fetchPredictionMarkets = React.useCallback(() => {
    if (isStock) return // No prediction markets for stocks
    getPredictionMarketsForToken(symbol, 15).then(setPredictionMarkets)
  }, [symbol, isStock])

  useEffect(() => {
    setPredictionMarkets([])
    if (!isStock) fetchPredictionMarkets()
  }, [symbol, fetchPredictionMarkets, isStock])

  useEffect(() => {
    if (!symbol || isStock) return
    const interval = setInterval(fetchPredictionMarkets, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [symbol, fetchPredictionMarkets, isStock])

  // Stock-specific data state
  const [stockData, setStockData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setAboutDetails(null)
    if (isStock) {
      // Fetch stock company profile instead of crypto details
      getCompanyProfile(symbol).then((profile) => {
        if (!cancelled && profile) {
          setStockData(profile)
          setAboutDetails({
            description: `${profile.name} (${profile.symbol}) trades on the ${profile.exchange || 'US'} exchange in the ${profile.sector || 'N/A'} sector.`,
            links: {}
          })
        }
      }).catch(() => {})
    } else {
      setStockData(null)
      getCoinDetails(symbol).then((details) => {
        if (!cancelled) setAboutDetails(details)
      })
    }
    return () => { cancelled = true }
  }, [symbol, isStock])

  // Trending tokens – fetch top coins from CoinGecko for the trending row (or stock movers)
  const [trendingTokens, setTrendingTokens] = useState([])
  useEffect(() => {
    let cancelled = false
    if (isStock) {
      // For stocks, show other popular stocks as trending
      const trendingSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'AMD', 'NFLX', 'DIS', 'BA', 'GS', 'COST']
        .filter(s => s !== symbol)
      getStockQuotes(trendingSymbols).then((quotes) => {
        if (cancelled) return
        const items = trendingSymbols.map(s => {
          const q = quotes[s]
          if (!q) return null
          return {
            id: s,
            symbol: s,
            name: q.name,
            image: getStockLogoUrl(s),
            current_price: q.price,
            price_change_percentage_24h: q.change,
            isStock: true
          }
        }).filter(Boolean)
        setTrendingTokens(items)
      }).catch(() => {})
    } else {
      getTopCoinsMarketsPage(1, 20).then((coins) => {
        if (!cancelled && Array.isArray(coins)) {
          setTrendingTokens(coins.filter(c => (c.symbol || '').toUpperCase() !== symbol.toUpperCase()))
        }
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [symbol, isStock])

  // Real-time price from Binance (TradingView-style) or stock quote – poll for chart/panel sync
  const [liveTickerPrice, setLiveTickerPrice] = useState(null)
  useEffect(() => {
    setLiveTickerPrice(null) // Reset on symbol/mode change to avoid stale price flash
    const sym = (symbol || '').toUpperCase()
    if (isStock) {
      // For stocks: fetch live price from stock API
      const fetchStockPrice = async () => {
        try {
          const quote = await getStockQuote(sym)
          if (quote?.price != null && Number.isFinite(quote.price)) {
            setLiveTickerPrice(quote.price)
            // Also update stockData with latest
            setStockData(prev => prev ? { ...prev, ...quote } : quote)
          }
        } catch (_) { /* ignore */ }
      }
      fetchStockPrice()
      const interval = setInterval(fetchStockPrice, 30 * 1000) // 30s for stocks
      return () => clearInterval(interval)
    }
    // Crypto mode
    if (!['BTC', 'ETH', 'SOL'].includes(sym)) return
    const fetchPrice = async () => {
      try {
        const prices = await getBinancePrices([sym])
        const p = prices[sym]?.price
        if (p != null && Number.isFinite(p)) setLiveTickerPrice(p)
      } catch (_) { /* ignore */ }
    }
    fetchPrice()
    // Increased from 10s to 60s for performance - prices don't need to update that fast
    const interval = setInterval(fetchPrice, 60 * 1000)
    return () => clearInterval(interval)
  }, [symbol, isStock])

  // Price from bars (1H, 48h) for 24h change when Binance not used
  const { bars: priceBars } = useChartData(symbol, '60', 1, 48)
  const livePriceAndChange = useMemo(() => {
    if (!priceBars || priceBars.length < 2) return null
    const lastBar = priceBars[priceBars.length - 1]
    const closeNow = lastBar?.close
    const idx24h = Math.max(0, priceBars.length - 25) // ~24 bars back for 1H = 24h
    const bar24hAgo = priceBars[idx24h]
    const close24h = bar24hAgo?.close
    if (closeNow == null || close24h == null || close24h === 0) return { price: closeNow, change24h: null }
    const change24h = ((Number(closeNow) - Number(close24h)) / Number(close24h)) * 100
    return { price: Number(closeNow), change24h }
  }, [priceBars])

  const baseTokenData = MOCK_TOKEN_DATA[symbol] || MOCK_TOKEN_DATA[DEFAULT_SYMBOL]
  const tokenData = useMemo(() => {
    if (isStock && stockData) {
      // Build token-like data from stock quote
      const fallback = FALLBACK_STOCK_DATA[symbol]
      const s = stockData
      return {
        rank: null,
        price: s.price || fallback?.price || 0,
        change24h: s.change != null ? s.change : (fallback?.change || 0),
        mcap: s.marketCap || fallback?.marketCap || 0,
        volume24h: s.volume || fallback?.volume || 0,
        pe: s.pe || fallback?.pe,
        eps: s.eps,
        sector: s.sector || fallback?.sector,
        exchange: s.exchange || fallback?.exchange,
        week52High: s.week52High,
        week52Low: s.week52Low,
        avgVolume: s.avgVolume,
        fdv: null,
        volMcapPct: s.marketCap ? ((s.volume || 0) / s.marketCap * 100).toFixed(1) : '—',
        circulating: null,
        maxSupply: null,
        ath: s.week52High,
        athDate: null,
        athChangePct: s.week52High && s.price ? ((s.price - s.week52High) / s.week52High * 100) : null,
        atl: s.week52Low,
        atlDate: null,
        atlChangePct: s.week52Low && s.price ? ((s.price - s.week52Low) / s.week52Low * 100) : null,
        score: null,
        low24h: null,
        high24h: null,
      }
    }
    if (isStock && !stockData) {
      // Use fallback stock data while loading
      const fallback = FALLBACK_STOCK_DATA[symbol]
      if (fallback) {
        return {
          rank: null, price: fallback.price, change24h: fallback.change, mcap: fallback.marketCap,
          volume24h: fallback.volume, pe: fallback.pe, eps: null, sector: fallback.sector, exchange: fallback.exchange,
          week52High: null, week52Low: null, avgVolume: null, fdv: null, volMcapPct: '—',
          circulating: null, maxSupply: null, ath: null, athDate: null, athChangePct: null,
          atl: null, atlDate: null, atlChangePct: null, score: null, low24h: null, high24h: null,
        }
      }
    }
    const data = { ...baseTokenData }
    // Prefer Binance live price (TradingView-style), then bar-derived price
    const price = liveTickerPrice != null && Number.isFinite(liveTickerPrice)
      ? liveTickerPrice
      : livePriceAndChange?.price
    if (price != null && Number.isFinite(price)) data.price = price
    if (livePriceAndChange?.change24h != null && Number.isFinite(livePriceAndChange.change24h)) {
      data.change24h = livePriceAndChange.change24h
    }
    return data
  }, [baseTokenData, liveTickerPrice, livePriceAndChange, isStock, stockData, symbol])

  // Sentiment-aware ambient glow — red/green wash based on daily performance
  const sentimentStyle = useMemo(() => {
    const change = tokenData?.change24h ?? 0
    const absChange = Math.abs(change)
    // Intensity scales with magnitude (capped at 5%)
    const intensity = Math.min(absChange / 5, 1)

    let sentimentRgb, sentimentMood
    if (change >= 0.1) {
      sentimentRgb = '34, 197, 94'    // green
      sentimentMood = 'bull'
    } else if (change <= -0.1) {
      sentimentRgb = '239, 68, 68'    // red
      sentimentMood = 'bear'
    } else {
      sentimentRgb = '139, 92, 246'   // purple (neutral)
      sentimentMood = 'neutral'
    }

    // Opacity: 0 at neutral, ramps 0.06 → 0.18 at ±5% change
    const sentimentOpacity = sentimentMood === 'neutral'
      ? 0
      : 0.06 + (intensity * 0.12)

    return {
      vars: {
        '--rz-sentiment-rgb': sentimentRgb,
        '--rz-sentiment-opacity': sentimentOpacity.toFixed(3),
      },
      mood: sentimentMood,
    }
  }, [tokenData?.change24h])

  const tokenName = isStock
    ? (stockData?.name || FALLBACK_STOCK_DATA[symbol]?.name || activeTokenInfo?.name || symbol)
    : (TOKEN_NAMES[symbol] || activeTokenInfo?.name || symbol)
  // Use centralized resolver for TradingView symbol (handles crypto, stocks, DEX tokens)
  const chartToken = isStock ? {
    symbol: resolveTradingViewSymbol({ symbol, isStock: true, exchange: tokenData.exchange }, 'stocks').symbol,
    networkId: null,
    address: null,
    isStock: true
  } : {
    symbol,
    networkId: activeTokenInfo?.networkId || 1,
    address: activeTokenInfo?.address || null
  }

  const openTokenCardPopup = () => {
    setTokenCardPopup({
      symbol,
      name: tokenName,
      price: tokenData.price,
      change: tokenData.change24h,
      logo: RZ_TOKEN_LOGOS[symbol] || null,
      sparkline_7d: null,
    })
    setTokenCardExpandedCard(null)
  }

  const closeTokenCardPopup = () => {
    setTokenCardExpandedCard(null)
    setTokenCardPopup(null)
  }

  // Mobile tab config for Research Zone
  const mobileTabs = [
    {
      id: 'chart',
      label: t('token.viewChart'),
      icon: icons.chart,
    },
    {
      id: 'info',
      label: t('research.tokenInfo'),
      icon: icons.info,
    },
    {
      id: 'feed',
      label: t('researchLite.news'),
      icon: icons.rss,
    },
  ]

  // ═══ Cinema Mode ═══
  if (cinemaMode) {
    const symbolOptions = isStock
      ? (['AAPL', 'MSFT', 'NVDA'].includes(symbol)
        ? ['AAPL', 'MSFT', 'NVDA']
        : [symbol, 'AAPL', 'MSFT', 'NVDA'])
      : (['BTC', 'ETH', 'SOL'].includes(symbol)
        ? ['BTC', 'ETH', 'SOL']
        : [symbol, 'BTC', 'ETH', 'SOL'])

    return (
      <CinemaResearchZone
        symbol={symbol}
        tokenName={tokenName}
        tokenData={tokenData}
        tokenLogos={RZ_TOKEN_LOGOS}
        chartToken={chartToken}
        liveTickerPrice={liveTickerPrice}
        dayMode={dayMode}
        newsItems={newsItems}
        agentSignals={MOCK_AGENT_SIGNALS[symbol] || MOCK_AGENT_SIGNALS.BTC}
        tweets={MOCK_TWEETS[symbol] || MOCK_TWEETS.BTC}
        rightFeedTab={rightFeedTab}
        setRightFeedTab={setRightFeedTab}
        fetchNews={fetchNews}
        newsSource={newsSource}
        lastNewsUpdate={lastNewsUpdate}
        formatNewsTime={formatNewsTime}
        markets={MOCK_MARKETS}
        marketFilter={marketFilter}
        setMarketFilter={setMarketFilter}
        marketFilters={MARKET_FILTERS}
        marketsSectionTab={marketsSectionTab}
        setMarketsSectionTab={setMarketsSectionTab}
        predictionMarkets={predictionMarkets}
        mockPredictionMarkets={MOCK_PREDICTION_MARKETS[symbol] || MOCK_PREDICTION_MARKETS.BTC}
        aboutDetails={aboutDetails}
        categories={MOCK_CATEGORIES[symbol] || MOCK_CATEGORIES.BTC}
        symbolOptions={symbolOptions}
        onSymbolChange={setSymbol}
        trendingTokens={trendingTokens}
        mockTokenData={MOCK_TOKEN_DATA}
      />
    )
  }

  return (
    <div className={`research-zone-lite ${dayMode ? 'day-mode' : ''} ${isMobile ? 'is-mobile' : ''}`} style={{ ...tokenAmbientStyle, ...sentimentStyle.vars }} data-sentiment={sentimentStyle.mood} data-mobile-tab={isMobile ? mobileMainTab : undefined}>
      {/* Sentiment-aware ambient overlay (red/green wash based on daily performance) */}
      <div className="rz-sentiment-wall" />
      {/* Mobile Tab Bar - shows on mobile only */}
      {isMobile && (
        <MobileTabBar
          tabs={mobileTabs}
          activeTab={mobileMainTab}
          onTabChange={setMobileMainTab}
          variant="default"
          className="research-zone-mobile-tabs"
        />
      )}

      {/* PRO mode — full Research Zone Pro component */}
      {mode === 'pro' && (
        <ResearchZonePro
          symbol={symbol}
          tokenData={tokenData}
          dayMode={dayMode}
          onTokenSelect={onTokenSelect}
          activeTokenInfo={activeTokenInfo}
          onModeChange={setMode}
        />
      )}

      {/* LITE mode — original 3-column layout */}
      {mode === 'lite' && <div className={`research-zone-lite-layout ${!leftPanelOpen ? 'research-zone-lite-left-collapsed' : ''} ${!rightPanelOpen ? 'research-zone-lite-right-collapsed' : ''}`}>
        {/* Left column – token overview (card-based) */}
        <aside
          className={`research-zone-lite-left symbol-${symbol.toLowerCase()} price-${tokenData.change24h >= 0 ? 'up' : 'down'}`}
          style={{ '--token-rgb': TOKEN_ROW_COLORS[symbol]?.bg || '139, 92, 246', '--token-rgb-accent': displayColors.accent, '--token-rgb-accent-day': displayColors.accentDay }}
        >
          <div className="research-zone-lite-overview">
            <div className="research-zone-lite-symbol-switcher">
              {(isStock
                ? (['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'].includes(symbol)
                  ? ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN']
                  : [symbol, 'AAPL', 'MSFT', 'NVDA', 'TSLA'])
                : (['BTC', 'ETH', 'SOL'].includes(symbol)
                  ? ['BTC', 'ETH', 'SOL']
                  : [symbol, 'BTC', 'ETH', 'SOL'])
              ).map((s) => {
                const data = isStock
                  ? (s === symbol && stockData ? stockData : FALLBACK_STOCK_DATA[s])
                  : (MOCK_TOKEN_DATA[s] || MOCK_TOKEN_DATA[DEFAULT_SYMBOL])
                const price = isStock ? (data?.price || 0) : data?.price
                const change = isStock ? (data?.change || 0) : data?.change24h
                const priceStr = price != null ? fmtPrice(price) : '—'
                const changeStr = change != null ? `${change >= 0 ? '+' : ''}${formatChange(change)}%` : '—'
                const logoUrl = isStock ? getStockLogoUrl(s) : RZ_TOKEN_LOGOS[s]
                return (
                  <button
                    key={s}
                    type="button"
                    className={`research-zone-lite-symbol-btn research-zone-lite-symbol-btn-${s.toLowerCase()} ${symbol === s ? 'active' : ''}`}
                    onClick={() => setSymbol(s)}
                  >
                    <span className={`research-zone-lite-symbol-btn-icon${isStock ? ' research-zone-lite-symbol-btn-icon--stock' : ''}`}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="" />
                      ) : (
                        <span className="research-zone-lite-symbol-btn-fallback">{s.charAt(0)}</span>
                      )}
                    </span>
                    <span className="research-zone-lite-symbol-btn-text">
                      <span className="research-zone-lite-symbol-btn-primary">{s}</span>
                      <span className="research-zone-lite-symbol-btn-secondary">{priceStr} · {changeStr}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="research-zone-lite-card research-zone-lite-price-card">
              <span className="research-zone-lite-card-label">{t('common.price')}</span>
              <div className="research-zone-lite-price-card-head">
                {isStock ? (
                  <img src={getStockLogoUrl(symbol)} alt="" className="research-zone-lite-price-logo research-zone-lite-price-logo--stock" />
                ) : RZ_TOKEN_LOGOS[symbol] && (
                  <img src={RZ_TOKEN_LOGOS[symbol]} alt="" className="research-zone-lite-price-logo" />
                )}
                <span className="research-zone-lite-price-symbol">{symbol}</span>
                {isStock ? (
                  <span className="research-zone-lite-price-rank">{tokenData.exchange || 'US'}</span>
                ) : (
                  <span className="research-zone-lite-price-rank">{t('common.rank')} {tokenData.rank}</span>
                )}
                <button
                  type="button"
                  className="research-zone-lite-info-btn"
                  title="Info"
                  aria-label="Token info - Past, Present, Future"
                  onClick={openTokenCardPopup}
                >
                  {icons.info}
                </button>
              </div>
              <div className="research-zone-lite-price-row">
                <span className="research-zone-lite-price">
                  <span className="rz-price-dollar">$</span>
                  <span className="rz-price-digits">{fmtPrice(tokenData.price).replace(currencySymbol, '')}</span>
                </span>
                <span className={`research-zone-lite-change ${tokenData.change24h >= 0 ? 'up' : 'down'}`}>
                  {tokenData.change24h >= 0 ? '+' : ''}{formatChange(tokenData.change24h)}%
                </span>
              </div>
            </div>

            <div className="research-zone-lite-metrics-grid">
              {(isStock ? [
                { label: t('common.marketCap'), raw: tokenData.mcap, accent: true },
                { label: t('common.volume24h'), raw: tokenData.volume24h, accent: true },
                { label: t('researchLite.peRatio'), raw: null, display: tokenData.pe != null ? tokenData.pe.toFixed(1) : '—' },
                { label: t('researchLite.eps'), raw: null, display: tokenData.eps != null ? fmtPrice(tokenData.eps) : '—' },
                { label: t('researchLite.sector'), raw: null, display: tokenData.sector || '—' },
                { label: t('researchLite.exchange'), raw: null, display: tokenData.exchange || '—' },
                ...(tokenData.avgVolume != null ? [{ label: t('researchLite.avgVolume'), raw: tokenData.avgVolume }] : []),
              ] : [
                { label: t('common.marketCap'), raw: tokenData.mcap, accent: true },
                { label: t('common.volume24h'), raw: tokenData.volume24h, accent: true },
                { label: t('researchLite.fdValuation'), raw: tokenData.fdv, accent: true },
                { label: t('researchLite.volMktCap'), raw: null, display: `${tokenData.volMcapPct}%` },
                { label: t('researchLite.circSupply'), raw: null, display: tokenData.circulating != null ? `${(tokenData.circulating / 1e6).toFixed(2)}M ${symbol}` : '—' },
                ...(tokenData.maxSupply != null ? [{ label: t('common.totalSupply'), raw: null, display: `${tokenData.maxSupply.toLocaleString()} ${symbol}` }] : []),
              ]).map((m) => {
                const formatted = m.raw != null ? fmtLarge(m.raw) : m.display
                const match = typeof formatted === 'string' ? formatted.match(/^(\$[\d,.\s]+)(B|M|K|T)$/) : null
                return (
                  <div key={m.label} className="research-zone-lite-card research-zone-lite-metric-card">
                    <span className="research-zone-lite-card-label">{m.label}</span>
                    <span className={`research-zone-lite-card-value${m.accent ? ' research-zone-lite-value-accent' : ''}`}>
                      {match ? (
                        <>{match[1]}<span className="rz-metric-suffix">{match[2]}</span></>
                      ) : formatted}
                    </span>
                  </div>
                )
              })}
            </div>

            {!isStock && tokenData.score != null && (
              <div className="research-zone-lite-card research-zone-lite-score-card">
                <span className="research-zone-lite-card-label">{t('common.score')}</span>
                <span className="research-zone-lite-card-value research-zone-lite-score-value">{tokenData.score}/10</span>
              </div>
            )}

            <h3 className="research-zone-lite-left-section-title">{isStock ? t('researchLite.sector') : t('researchLite.categories')}</h3>
            <div className="research-zone-lite-categories">
              {isStock ? (
                <span className="research-zone-lite-category-tag">{tokenData.sector || 'N/A'}</span>
              ) : (MOCK_CATEGORIES[symbol] || MOCK_CATEGORIES.BTC).map((cat) => (
                <span key={cat} className="research-zone-lite-category-tag">{cat}</span>
              ))}
            </div>

            <h3 className="research-zone-lite-left-section-title">{isStock ? t('researchLite.weekRange') : t('researchLite.pricePerformance')}</h3>
            <div className="research-zone-lite-card research-zone-lite-range-card">
              {isStock ? (
                <>
                  <div className="research-zone-lite-range-row">
                    <span className="research-zone-lite-card-label">{t('researchLite.week52Low')}</span>
                    <span className="research-zone-lite-card-value">{tokenData.week52Low ? fmtPrice(tokenData.week52Low) : '—'}</span>
                  </div>
                  <div className="research-zone-lite-range-row">
                    <span className="research-zone-lite-card-label">{t('researchLite.week52High')}</span>
                    <span className="research-zone-lite-card-value">{tokenData.week52High ? fmtPrice(tokenData.week52High) : '—'}</span>
                  </div>
                  {tokenData.week52Low && tokenData.week52High && tokenData.price && (
                    <div className="research-zone-lite-range-bar-wrap">
                      <div className="research-zone-lite-range-bar">
                        <div
                          className="research-zone-lite-range-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(0, ((tokenData.price - tokenData.week52Low) / (tokenData.week52High - tokenData.week52Low)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="research-zone-lite-range-row">
                    <span className="research-zone-lite-card-label">{t('common.low24h')}</span>
                    <span className="research-zone-lite-card-value">{fmtPrice(tokenData.low24h ?? tokenData.price * 0.97)}</span>
                  </div>
                  <div className="research-zone-lite-range-row">
                    <span className="research-zone-lite-card-label">{t('common.high24h')}</span>
                    <span className="research-zone-lite-card-value">{fmtPrice(tokenData.high24h ?? tokenData.price * 1.03)}</span>
                  </div>
                </>
              )}
            </div>

            {!isStock && (
              <>
                <h3 className="research-zone-lite-left-section-title">{t('researchLite.allTime')}</h3>
                <div className="research-zone-lite-card research-zone-lite-ath-card">
                  <div className="research-zone-lite-ath-row">
                    <span className="research-zone-lite-card-label">{t('researchLite.allTimeHigh')}</span>
                    <span className="research-zone-lite-card-value">{fmtPrice(tokenData.ath ?? tokenData.price * 1.3)}</span>
                    <span className="research-zone-lite-card-meta">{tokenData.athDate ?? '—'}</span>
                    <span className={`research-zone-lite-change research-zone-lite-change-small down`}>
                      {tokenData.athChangePct != null ? `${formatChange(tokenData.athChangePct)}%` : '—'}
                    </span>
                  </div>
                  <div className="research-zone-lite-ath-row">
                    <span className="research-zone-lite-card-label">{t('researchLite.allTimeLow')}</span>
                    <span className="research-zone-lite-card-value">{fmtPrice(tokenData.atl ?? tokenData.price * 0.01)}</span>
                    <span className="research-zone-lite-card-meta">{tokenData.atlDate ?? '—'}</span>
                    <span className={`research-zone-lite-change research-zone-lite-change-small up`}>
                      {tokenData.atlChangePct != null ? `+${formatChange(Math.min(tokenData.atlChangePct, 99999))}%` : '—'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Center – chart banner + chart + Markets section */}
        <main className="research-zone-lite-center">
          <div className="rz-lite-hero" aria-label={`${tokenName} overview`} style={{ '--token-rgb': TOKEN_ROW_COLORS[symbol]?.bg || '139, 92, 246', '--token-rgb-accent': displayColors.accent, '--token-rgb-accent-day': displayColors.accentDay }}>
            <div className="rz-lite-hero-glow" />
            <div className="rz-lite-hero-accent" />

            <div className="rz-lite-hero-left">
              <button type="button" className="rz-lite-hero-star" aria-label="Add to watchlist" title="Add to watchlist">
                {icons.star}
              </button>

              <div className="rz-lite-hero-logo-wrap">
                {isStock ? (
                  <img src={getStockLogoUrl(symbol)} alt="" className="rz-lite-hero-logo rz-lite-hero-logo--stock" />
                ) : RZ_TOKEN_LOGOS[symbol] ? (
                  <img src={RZ_TOKEN_LOGOS[symbol]} alt="" className="rz-lite-hero-logo" />
                ) : (
                  <span className="rz-lite-hero-logo-fallback">{symbol.charAt(0)}</span>
                )}
                {isStock ? (
                  <span className="rz-lite-hero-rank">{tokenData.exchange || 'US'}</span>
                ) : (
                  <span className="rz-lite-hero-rank">#{tokenData.rank}</span>
                )}
              </div>

              <div className="rz-lite-hero-identity">
                <span className="rz-lite-hero-name">{tokenName}</span>
                <span className="rz-lite-hero-ticker">{symbol} · {isStock ? (tokenData.sector || 'Stock') : (MOCK_CATEGORIES[symbol] || MOCK_CATEGORIES.BTC)[0]}</span>
              </div>
            </div>

            <div className="rz-lite-hero-socials">
              {aboutDetails?.links?.twitter && (
                <a href={aboutDetails.links.twitter} target="_blank" rel="noopener noreferrer" className="rz-lite-hero-social" title="X (Twitter)">
                  {icons.twitter}
                </a>
              )}
              {aboutDetails?.links?.homepage && (
                <a href={aboutDetails.links.homepage} target="_blank" rel="noopener noreferrer" className="rz-lite-hero-social" title="Website">
                  {icons.info}
                </a>
              )}
              {aboutDetails?.links?.reddit && (
                <a href={aboutDetails.links.reddit} target="_blank" rel="noopener noreferrer" className="rz-lite-hero-social" title="Reddit">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><circle cx="12" cy="12" r="10" /></svg>
                </a>
              )}
            </div>

            <div className="rz-lite-hero-price-block">
              <span className="rz-lite-hero-price">{fmtPrice(tokenData.price)}</span>
              <span className={`rz-lite-hero-change ${tokenData.change24h >= 0 ? 'up' : 'down'}`}>
                <span className="rz-lite-hero-change-pill">
                  {tokenData.change24h >= 0 ? '+' : ''}{formatChange(tokenData.change24h)}%
                </span>
                <span className="rz-lite-hero-change-label">24h</span>
              </span>
            </div>

            <div className="rz-lite-hero-mode-toggle" role="tablist" aria-label="Mode">
              <button type="button" role="tab" aria-selected={mode === 'lite'} className={`rz-lite-hero-mode-btn ${mode === 'lite' ? 'active' : ''}`} onClick={() => setMode('lite')}>
                LITE
              </button>
              <button type="button" role="tab" aria-selected={mode === 'pro'} className={`rz-lite-hero-mode-btn ${mode === 'pro' ? 'active' : ''}`} onClick={() => setMode('pro')}>
                PRO
              </button>
            </div>
          </div>
          {/* Trending Tokens – horizontal scroll row */}
          {trendingTokens.length > 0 && (
            <div className="rz-trending-section">
              <div className="rz-trending-header">
                <span className="rz-trending-dot" />
                <span className="rz-trending-label">{isStock ? t('discover.popularStocks') : t('welcome.trendingNow').toUpperCase()}</span>
              </div>
              <div className="rz-trending-scroll">
                {trendingTokens.slice(0, 15).map((coin, i) => {
                  const changeNum = typeof coin.price_change_percentage_24h === 'number' ? coin.price_change_percentage_24h : parseFloat(coin.price_change_percentage_24h) || 0
                  const isUp = changeNum >= 0
                  return (
                    <button
                      key={coin.id || coin.symbol || i}
                      type="button"
                      className={`rz-trending-chip ${isUp ? 'up' : 'down'}`}
                      onClick={() => {
                        const sym = (coin.symbol || '').toUpperCase()
                        if (sym) setSymbol(sym)
                      }}
                    >
                      {coin.image && <img src={coin.image} alt="" className={`rz-trending-chip-logo${coin.isStock ? ' rz-trending-chip-logo--stock' : ''}`} />}
                      <span className="rz-trending-chip-symbol">{(coin.symbol || '').toUpperCase()}</span>
                      <span className={`rz-trending-chip-change ${isUp ? 'up' : 'down'}`}>
                        {isUp ? '+' : ''}{changeNum.toFixed(1)}%
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="research-zone-lite-chart-wrap" style={{ minHeight: chartHeight + 18 }}>
            <TradingChart token={chartToken} isCollapsed={false} embedHeight={chartHeight} dayMode={dayMode} livePrice={liveTickerPrice ?? tokenData.price} initialChartType="tradingview" />
            <div
              className="research-zone-lite-chart-drag"
              onMouseDown={onChartDragStart}
              title="Drag to resize chart"
            >
              <span className="research-zone-lite-chart-drag-pill" />
            </div>
          </div>

          <section className="research-zone-lite-markets" aria-labelledby="markets-heading">
                <div className="research-zone-lite-markets-header">
                  <h2 id="markets-heading" className="research-zone-lite-markets-title">
                    <span className="research-zone-lite-markets-title-icon" aria-hidden>{icons.sector}</span>
                    {t('researchLite.markets')}
                  </h2>
                  <div className="research-zone-lite-markets-tabs" role="tablist" aria-label="Markets or Prediction markets">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketsSectionTab === 'markets'}
                      className={`research-zone-lite-markets-tab ${marketsSectionTab === 'markets' ? 'active' : ''}`}
                      onClick={() => setMarketsSectionTab('markets')}
                    >
                      {isStock ? t('researchLite.fundamentals') : t('researchLite.markets')}
                    </button>
                    {!isStock && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={marketsSectionTab === 'predictions'}
                        className={`research-zone-lite-markets-tab ${marketsSectionTab === 'predictions' ? 'active' : ''}`}
                        onClick={() => setMarketsSectionTab('predictions')}
                      >
                        {t('researchLite.predictionMarkets')}
                      </button>
                    )}
                  </div>
                </div>
                {marketsSectionTab === 'markets' && (
                  isStock ? (
                    <div className="research-zone-lite-stock-fundamentals">
                      <div className="research-zone-lite-stock-fundamentals-grid">
                        {[
                          { label: t('common.marketCap'), value: tokenData.mcap ? fmtLarge(tokenData.mcap) : '—' },
                          { label: t('researchLite.peRatio'), value: tokenData.pe != null ? tokenData.pe.toFixed(1) : '—' },
                          { label: t('researchLite.eps'), value: tokenData.eps != null ? fmtPrice(tokenData.eps) : '—' },
                          { label: t('common.volume'), value: tokenData.volume24h ? fmtLarge(tokenData.volume24h) : '—' },
                          { label: t('researchLite.avgVolume'), value: tokenData.avgVolume ? fmtLarge(tokenData.avgVolume) : '—' },
                          { label: t('researchLite.week52High'), value: tokenData.week52High ? fmtPrice(tokenData.week52High) : '—' },
                          { label: t('researchLite.week52Low'), value: tokenData.week52Low ? fmtPrice(tokenData.week52Low) : '—' },
                          { label: t('researchLite.sector'), value: tokenData.sector || '—' },
                          { label: t('researchLite.exchange'), value: tokenData.exchange || '—' },
                        ].map((item) => (
                          <div key={item.label} className="research-zone-lite-stock-fund-item">
                            <span className="research-zone-lite-stock-fund-label">{item.label}</span>
                            <span className="research-zone-lite-stock-fund-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="research-zone-lite-markets-filters">
                        {MARKET_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className={`research-zone-lite-market-filter ${marketFilter === f.id ? 'active' : ''}`}
                            onClick={() => setMarketFilter(f.id)}
                          >
                            {f.label}
                          </button>
                        ))}
                        <button type="button" className="research-zone-lite-filters-btn" title="Filters" aria-label="Filters">
                          <span className="research-zone-lite-filters-icon" aria-hidden>{icons.filters}</span>
                          {t('common.filters')}
                        </button>
                      </div>
                      <div className="research-zone-lite-markets-table-wrap">
                        <table className="research-zone-lite-markets-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>{t('researchLite.exchange')}</th>
                              <th>{t('common.pair')}</th>
                              <th>{t('common.price')}</th>
                              <th>{t('researchLite.depth')}</th>
                              <th>{t('common.volume24h')}</th>
                              <th>{t('researchLite.volumePercent')}</th>
                              <th>{t('common.liquidity')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MOCK_MARKETS.map((row, i) => (
                              <tr key={`${row.exchange}-${row.pair}`}>
                                <td>{i + 1}</td>
                                <td>{row.exchange}</td>
                                <td>{row.pair}</td>
                                <td>{fmtPrice(row.price)}</td>
                                <td>{fmtLarge(row.depthPlus2)} / {fmtLarge(row.depthMinus2)}</td>
                                <td>{fmtLarge(row.volume24h)}</td>
                                <td>{row.volumePct}%</td>
                                <td>{fmtLarge(row.liquidity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                )}
                {marketsSectionTab === 'predictions' && (
                  <div className="research-zone-lite-predictions-wrap">
                    <p className="research-zone-lite-predictions-desc">{t('researchLite.predictionDesc', { name: tokenName })}</p>
                    <div className="research-zone-lite-markets-table-wrap research-zone-lite-predictions-table-wrap">
                      <table className="research-zone-lite-markets-table research-zone-lite-predictions-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t('researchLite.question')}</th>
                            <th>{t('researchLite.yesPercent')}</th>
                            <th>{t('common.volume')}</th>
                            <th>{t('researchLite.endDate')}</th>
                            <th>{t('researchLite.platform')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(predictionMarkets.length > 0 ? predictionMarkets : (MOCK_PREDICTION_MARKETS[symbol] || MOCK_PREDICTION_MARKETS.BTC)).map((row, i) => (
                            <tr key={row.id}>
                              <td>{i + 1}</td>
                              <td className="research-zone-lite-predictions-question">{row.question}</td>
                              <td><span className={`research-zone-lite-predictions-yes ${row.yesPct >= 50 ? 'up' : 'down'}`}>{row.yesPct}%</span></td>
                              <td>{row.volumeFormatted}</td>
                              <td>{row.endDate}</td>
                              <td>
                                <a href={row.url} target="_blank" rel="noopener noreferrer" className="research-zone-lite-predictions-link">{row.platform}</a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
          </section>

        </main>

        {/* Panel toggles – on the seam between panels so they don’t overlap content */}
        <button
          type="button"
          className="research-zone-lite-panel-toggle research-zone-lite-panel-toggle-left"
          onClick={() => setLeftPanelOpen((o) => !o)}
          title={leftPanelOpen ? 'Close left panel' : 'Open left panel'}
          aria-label={leftPanelOpen ? 'Close left panel' : 'Open left panel'}
        >
          {leftPanelOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>

        <button
          type="button"
          className="research-zone-lite-panel-toggle research-zone-lite-panel-toggle-right"
          onClick={() => setRightPanelOpen((o) => !o)}
          title={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
          aria-label={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
        >
          {rightPanelOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>

        {/* Right column – Feed (Agent RSS | News | Tweets) tabs, then About */}
        <aside className="research-zone-lite-right">
          <section className="research-zone-lite-right-block research-zone-lite-right-feed-block">
            <div className="research-zone-lite-feed-header">
              <div className="research-zone-lite-feed-toggle" role="tablist" aria-label="Feed: Agent RSS, News, or Tweets">
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightFeedTab === 'agent'}
                  className={`research-zone-lite-feed-tab ${rightFeedTab === 'agent' ? 'active' : ''}`}
                  onClick={() => setRightFeedTab('agent')}
                >
                  <span className="research-zone-lite-feed-tab-icon" aria-hidden>{icons.rss}</span>
                  {t('researchLite.agentRss')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightFeedTab === 'news'}
                  className={`research-zone-lite-feed-tab ${rightFeedTab === 'news' ? 'active' : ''}`}
                  onClick={() => setRightFeedTab('news')}
                >
                  <span className="research-zone-lite-feed-tab-icon" aria-hidden>{icons.news}</span>
                  {t('researchLite.news')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightFeedTab === 'tweets'}
                  className={`research-zone-lite-feed-tab ${rightFeedTab === 'tweets' ? 'active' : ''}`}
                  onClick={() => setRightFeedTab('tweets')}
                >
                  <span className="research-zone-lite-feed-tab-icon" aria-hidden>{icons.twitter}</span>
                  {t('researchLite.tweets')}
                </button>
              </div>
              {rightFeedTab === 'news' && (
                <button type="button" className="research-zone-lite-news-refresh-btn" onClick={fetchNews} title="Refresh news" aria-label="Refresh news"><span className="research-zone-lite-news-refresh-icon" aria-hidden>{icons.refresh}</span></button>
              )}
            </div>
            {rightFeedTab === 'agent' && (
              <div className="research-zone-lite-feed-content research-zone-lite-feed-content-agent">
                <div className="research-zone-lite-agent-list" role="feed" aria-label={`Agent signals about ${tokenName}`}>
                  {(MOCK_AGENT_SIGNALS[symbol] || MOCK_AGENT_SIGNALS.BTC).map((signal) => (
                    <article key={signal.id} className="research-zone-lite-agent-item">
                      <div className="research-zone-lite-agent-item-body">
                        <span className="research-zone-lite-agent-item-agent">{signal.agent}</span>
                        <span className="research-zone-lite-agent-item-message">{signal.message}</span>
                        <span className="research-zone-lite-agent-item-time">{signal.time}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {rightFeedTab === 'news' && (
              <div className="research-zone-lite-feed-content research-zone-lite-feed-content-news">
                {lastNewsUpdate != null && (
                  <span className="research-zone-lite-feed-updated">
                    {newsSource === 'CryptoPanic' ? 'CryptoPanic' : newsSource === 'CryptoCompare' ? 'CryptoCompare' : newsSource === 'RSS' ? 'RSS' : 'News'} · {formatNewsTime(Math.floor(lastNewsUpdate / 1000)) === 'Just now' ? 'just now' : formatNewsTime(Math.floor(lastNewsUpdate / 1000)) + ' ago'}
                  </span>
                )}
                <div className="research-zone-lite-news-list" role="feed" aria-label={`News about ${tokenName}`}>
                  {newsItems.length === 0 ? (
                    <p className="research-zone-lite-news-empty">{t('researchLite.loadingNews')}</p>
                  ) : (
                    newsItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="research-zone-lite-news-item"
                        role="article"
                      >
                        {item.imageUrl && (
                          <div className="research-zone-lite-news-item-thumb">
                            <img src={item.imageUrl} alt="" loading="lazy" />
                          </div>
                        )}
                        <div className="research-zone-lite-news-item-body">
                          <span className="research-zone-lite-news-item-meta">
                            {item.source} · {formatNewsTime(item.publishedOn)}
                          </span>
                          <span className="research-zone-lite-news-item-title">{item.title}</span>
                          {item.summary && (
                            <span className="research-zone-lite-news-item-summary">{item.summary}</span>
                          )}
                        </div>
                        <span className="research-zone-lite-news-item-external" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            )}
            {rightFeedTab === 'tweets' && (
              <div className="research-zone-lite-feed-content research-zone-lite-feed-content-tweets">
                <div className="research-zone-lite-tweets-list research-zone-lite-feed-tweets-list" role="feed" aria-label={`Tweets about ${tokenName}`}>
                  {(MOCK_TWEETS[symbol] || MOCK_TWEETS.BTC).map((tweet) => (
                    <article key={tweet.id} className="research-zone-lite-tweet">
                      <div className="research-zone-lite-tweet-header">
                        <img src={tweet.avatar} alt="" className="research-zone-lite-tweet-avatar" />
                        <div className="research-zone-lite-tweet-meta">
                          <span className="research-zone-lite-tweet-name">{tweet.name}</span>
                          <span className="research-zone-lite-tweet-handle">@{tweet.handle}</span>
                          <span className="research-zone-lite-tweet-time">· {tweet.time}</span>
                        </div>
                      </div>
                      <p className="research-zone-lite-tweet-content">{tweet.content}</p>
                      {tweet.preview && (
                        <a href={tweet.preview.url || '#'} target="_blank" rel="noopener noreferrer" className="research-zone-lite-tweet-preview">
                          {tweet.preview.imageUrl && (
                            <img src={tweet.preview.imageUrl} alt="" className="research-zone-lite-tweet-preview-image" loading="lazy" />
                          )}
                          {tweet.preview.title && <span className="research-zone-lite-tweet-preview-title">{tweet.preview.title}</span>}
                          {tweet.preview.description && <span className="research-zone-lite-tweet-preview-desc">{tweet.preview.description}</span>}
                        </a>
                      )}
                      <div className="research-zone-lite-tweet-actions">
                        <span className="research-zone-lite-tweet-stat"><span className="research-zone-lite-tweet-stat-icon" aria-hidden>{icons.heart}</span>{tweet.likes}</span>
                        <span className="research-zone-lite-tweet-stat"><span className="research-zone-lite-tweet-stat-icon" aria-hidden>{icons.retweet}</span>{tweet.retweets}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="research-zone-lite-right-block research-zone-lite-right-about-block">
            <h3 className="research-zone-lite-right-block-title">
              <span className="research-zone-lite-right-block-icon" aria-hidden>{icons.info}</span>
              {t('researchLite.about', { name: tokenName })}
            </h3>
            <div className="research-zone-lite-right-block-body">
              {isStock ? (
                <div className="research-zone-lite-about-stock">
                  <p className="research-zone-lite-about-desc">
                    {stockData
                      ? `${stockData.name} (${stockData.symbol}) trades on the ${stockData.exchange || 'US'} exchange in the ${stockData.sector || 'N/A'} sector.`
                      : `${symbol} — loading stock details…`
                    }
                  </p>
                  {stockData && (
                    <div className="research-zone-lite-about-stock-quick">
                      {stockData.pe != null && <span>P/E: {stockData.pe.toFixed(1)}</span>}
                      {stockData.eps != null && <span>EPS: ${stockData.eps.toFixed(2)}</span>}
                      {stockData.marketCap && <span>Mkt Cap: {fmtLarge(stockData.marketCap)}</span>}
                    </div>
                  )}
                </div>
              ) : aboutDetails ? (
                <>
                  {aboutDetails.description && (
                    <p className="research-zone-lite-about-desc">{aboutDetails.description}</p>
                  )}
                  {(aboutDetails.links?.homepage || aboutDetails.links?.twitter || aboutDetails.links?.reddit || aboutDetails.links?.explorer) && (
                    <div className="research-zone-lite-about-links">
                      {aboutDetails.links.homepage && (
                        <a href={aboutDetails.links.homepage} target="_blank" rel="noopener noreferrer" className="research-zone-lite-about-link">{t('research.website')}</a>
                      )}
                      {aboutDetails.links.twitter && (
                        <a href={aboutDetails.links.twitter} target="_blank" rel="noopener noreferrer" className="research-zone-lite-about-link">{t('research.twitter')}</a>
                      )}
                      {aboutDetails.links.reddit && (
                        <a href={aboutDetails.links.reddit} target="_blank" rel="noopener noreferrer" className="research-zone-lite-about-link">{t('research.reddit')}</a>
                      )}
                      {aboutDetails.links.explorer && (
                        <a href={aboutDetails.links.explorer} target="_blank" rel="noopener noreferrer" className="research-zone-lite-about-link">{t('research.explorer')}</a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p>{t('common.loading')} {tokenName} details…</p>
              )}
            </div>
          </section>
        </aside>
      </div>}

      {/* 3-card token popup: Past, Present, Future – same as Welcome page */}
      {tokenCardPopup && typeof document !== 'undefined' && createPortal(
        <div
          className={`token-card-popup-overlay ${dayMode ? 'token-card-popup-day-mode' : ''}`}
          onClick={closeTokenCardPopup}
          role="dialog"
          aria-modal="true"
          aria-labelledby="token-card-popup-title-rz"
        >
          <div className="token-card-popup" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="token-card-popup-close"
              onClick={closeTokenCardPopup}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <h2 id="token-card-popup-title-rz" className="token-card-popup-title">{tokenCardPopup.name} - Past, Present, Future</h2>
            <div className="token-card-popup-grid">
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
                  <span className="token-card-label">{t('researchLite.history')}</span>
                </div>
                <div className="token-card-body">
                  <div className="token-card-chart">
                    {(() => {
                      const points = getHistorySparkline(tokenCardPopup.price, tokenCardPopup.change, tokenCardPopup.sparkline_7d)
                      if (!points.length) return <div className="token-card-chart-placeholder">{t('researchLite.noChartData')}</div>
                      const w = 200
                      const h = 80
                      const min = Math.min(...points)
                      const max = Math.max(...points)
                      const range = max - min || 1
                      const d = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * (h - 8)}`).join(' ')
                      const isUp = tokenCardPopup.change != null ? Number(tokenCardPopup.change) >= 0 : points[points.length - 1] >= points[0]
                      return (
                        <svg viewBox={`0 0 ${w} ${h}`} className={`token-card-sparkline ${isUp ? 'up' : 'down'}`}>
                          <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={d} />
                        </svg>
                      )
                    })()}
                  </div>
                  <div className="token-card-stats">
                    <span>7d High {fmtPrice((tokenCardPopup.price || 0) * 1.05)}</span>
                    <span>7d Low {fmtPrice((tokenCardPopup.price || 0) * 0.92)}</span>
                  </div>
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">{t('researchLite.chartShowsYou')}</span>
                  <span className="token-card-footer-highlight">{t('researchLite.thePast')}</span>
                </div>
              </div>

              <div
                className={`token-card token-card-live${tokenCardExpandedCard === 'live' ? ' token-card-expanded' : ''}`}
                onClick={(e) => { e.stopPropagation(); setTokenCardExpandedCard((prev) => prev === 'live' ? null : 'live') }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTokenCardExpandedCard((prev) => prev === 'live' ? null : 'live') } }}
                aria-pressed={tokenCardExpandedCard === 'live'}
              >
                <div className="token-card-head">
                  <span className="token-card-dot token-card-dot-green" />
                  <span className="token-card-label">{t('researchLite.live')}</span>
                </div>
                <div className="token-card-body">
                  <div className="token-card-live-token">
                    <div className="token-card-live-avatar">
                      {tokenCardPopup.logo ? <img src={tokenCardPopup.logo} alt="" /> : <span>{tokenCardPopup.symbol?.[0]}</span>}
                    </div>
                    <div>
                      <div className="token-card-live-name">{tokenCardPopup.name}</div>
                      <div className="token-card-live-symbol">{tokenCardPopup.symbol}</div>
                    </div>
                  </div>
                  <div className="token-card-live-price">{fmtPrice(tokenCardPopup.price)}</div>
                  {tokenCardPopup.change != null && (
                    <div className={`token-card-live-change ${tokenCardPopup.change >= 0 ? 'positive' : 'negative'}`}>
                      {formatChange(tokenCardPopup.change)} 24h
                    </div>
                  )}
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">{t('researchLite.priceShowsYou')}</span>
                  <span className="token-card-footer-highlight">{t('researchLite.thePresent')}</span>
                </div>
              </div>

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
                  <span className="token-card-label">{t('researchLite.predictions')}</span>
                </div>
                <div className="token-card-body">
                  {getTokenPredictions(tokenCardPopup.symbol, tokenCardPopup.price).map((pred, i) => (
                    <div key={i} className="token-card-prediction">
                      <span className={`token-card-pred-icon ${pred.up ? 'up' : 'down'}`}>
                        {pred.up ? '↑' : '↓'}
                      </span>
                      <span className="token-card-pred-text">{fmtPrice(pred.target)} by {pred.date}</span>
                      <span className="token-card-pred-prob" title={`${pred.prob}% probability`}>{pred.prob}%</span>
                    </div>
                  ))}
                  <div className="token-card-pred-powered">{t('researchLite.poweredBy')}</div>
                </div>
                <div className="token-card-footer">
                  <span className="token-card-footer-label">{t('researchLite.marketsShowYou')}</span>
                  <span className="token-card-footer-highlight">{t('researchLite.theFuture')}</span>
                </div>
              </div>
            </div>
            <div className="token-card-popup-actions">
              <button
                type="button"
                className="token-card-popup-view-details"
                onClick={() => {
                  closeTokenCardPopup()
                  if (onTokenSelect) onTokenSelect({ symbol: tokenCardPopup.symbol, name: tokenCardPopup.name, price: tokenCardPopup.price, change: tokenCardPopup.change, logo: tokenCardPopup.logo })
                }}
              >
                {t('researchLite.viewFullDetails')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ResearchZoneLite
