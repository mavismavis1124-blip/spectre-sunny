/**
 * Research Zone PRO - Comprehensive crypto research dashboard
 * 4-tab layout (Overview, Project, Sentiment, Technicals) with persistent sidebar
 * Glassmorphic dark theme with day-mode support and token brand colors
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import TradingChart from './TradingChart'
import { useChartData } from '../hooks/useCodexData'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import { getCoinDetails } from '../services/coinGeckoApi'
import spectreIcons from '../icons/spectreIcons'
import './ResearchZonePro.css'

const RZ_TOKEN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
}

// ────────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ────────────────────────────────────────────────────────────────────────────────

const MOCK_TWEETS = {
  BTC: [
    { id: 1, handle: '@CryptoBanter', name: 'Crypto Banter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=banter', text: 'Bitcoin holding key support. Institutional flow still positive. Next target if we break resistance could be significant.', sentimentScore: 7.8, time: '2h' },
    { id: 2, handle: '@DocumentingBTC', name: 'Documenting Bitcoin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=docbtc', text: 'BTC dominance elevated. Alt season waiting for a breakout. History suggests we could see rotation soon.', sentimentScore: 6.5, time: '4h' },
    { id: 3, handle: '@WillyWoo', name: 'Willy Woo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=woo', text: 'On-chain: long-term holders not selling. Supply shock narrative intact. Watching accumulation addresses closely.', sentimentScore: 8.2, time: '6h' },
    { id: 4, handle: '@glassnode', name: 'Glassnode', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=glass', text: 'Exchange reserves at multi-year lows. Fewer coins available for trading means potential upside pressure.', sentimentScore: 7.4, time: '8h' },
  ],
  ETH: [
    { id: 1, handle: '@VitalikButerin', name: 'Vitalik Buterin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vitalik', text: 'Ethereum roadmap update: PBS and full danksharding progress on track. Scaling remains the priority for the ecosystem.', sentimentScore: 8.5, time: '1h' },
    { id: 2, handle: '@econoar', name: 'Econoar', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=econoar', text: 'ETH/BTC ratio looking for a bounce. Historically a good risk/reward entry at these levels.', sentimentScore: 6.8, time: '3h' },
    { id: 3, handle: '@sassal0x', name: 'Sassal', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sassal', text: 'Ethereum L2s now processing more TPS than mainnet combined. The scaling thesis is playing out.', sentimentScore: 8.0, time: '5h' },
    { id: 4, handle: '@bankaborhood', name: 'Bankaborhood', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=banka', text: 'ETH staking yield steady. DeFi TVL growth showing renewed interest. Ecosystem fundamentals strong.', sentimentScore: 7.2, time: '7h' },
  ],
  SOL: [
    { id: 1, handle: '@aaboron', name: 'Ansem', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ansem', text: 'Solana ecosystem growth is impressive. Dev activity and TVL metrics tell the real story here.', sentimentScore: 8.1, time: '2h' },
    { id: 2, handle: '@SolanaOfficial', name: 'Solana', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=solana', text: 'Firedancer testnet milestones achieved. Next phase of network performance upgrades coming soon.', sentimentScore: 7.9, time: '5h' },
    { id: 3, handle: '@mert_finance', name: 'Mert', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mert', text: 'SOL showing strong relative strength vs BTC during this correction period. Healthy consolidation.', sentimentScore: 7.0, time: '7h' },
    { id: 4, handle: '@JupiterExchange', name: 'Jupiter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jupiter', text: 'Solana DEX volume hitting new records. Jupiter aggregator processing billions in weekly volume.', sentimentScore: 8.3, time: '9h' },
  ],
}

const MOCK_CATEGORIES = {
  BTC: ['Store of Value', 'Layer 1', 'Proof of Work', 'Bitcoin Ecosystem', 'Digital Gold'],
  ETH: ['Smart Contract Platform', 'Layer 1', 'Proof of Stake', 'Ethereum Ecosystem', 'DeFi'],
  SOL: ['Smart Contract Platform', 'Layer 1', 'Proof of History', 'Solana Ecosystem', 'DeFi'],
  DOGE: ['Meme', 'Proof of Work', 'Payments', 'Community'],
  XRP: ['Payments', 'Layer 1', 'Enterprise', 'Cross-border'],
  ADA: ['Smart Contract Platform', 'Layer 1', 'Proof of Stake', 'Research-driven'],
  AVAX: ['Smart Contract Platform', 'Layer 1', 'Subnets', 'DeFi'],
  LINK: ['Oracle', 'DeFi Infrastructure', 'Cross-chain', 'Data Feeds'],
  DOT: ['Layer 0', 'Parachains', 'Interoperability', 'Web3'],
  UNI: ['DEX', 'DeFi', 'Governance', 'AMM'],
}

const MOCK_MARKETS = {
  BTC: ['Binance', 'Bybit', 'Bitget', 'Coinbase', 'Kraken', 'MEXC'],
  ETH: ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX'],
  SOL: ['Binance', 'Bybit', 'Coinbase', 'Bitget', 'MEXC', 'Gate.io'],
  DEFAULT: ['Binance', 'Bybit', 'Coinbase', 'Kraken', 'Bitget', 'MEXC'],
}

const MOCK_PROJECT_DESCRIPTIONS = {
  BTC: 'Bitcoin is the first decentralized cryptocurrency, created in 2009 by an anonymous person or group using the pseudonym Satoshi Nakamoto. It operates on a peer-to-peer network using blockchain technology, enabling secure, transparent, and censorship-resistant transactions without intermediaries. Bitcoin uses a Proof of Work consensus mechanism where miners compete to validate transactions and add blocks to the chain. With a fixed supply cap of 21 million coins, Bitcoin is designed to be deflationary and is often referred to as "digital gold." It has become the largest cryptocurrency by market capitalization and serves as a store of value, medium of exchange, and benchmark for the broader crypto market.',
  ETH: 'Ethereum is a decentralized, open-source blockchain platform that enables smart contract functionality. Created by Vitalik Buterin and launched in 2015, Ethereum extends blockchain technology beyond simple value transfers. Its native cryptocurrency, Ether (ETH), is the second-largest by market capitalization. Ethereum transitioned from Proof of Work to Proof of Stake through "The Merge" in September 2022, significantly reducing its energy consumption. The platform supports a vast ecosystem of decentralized applications (dApps), decentralized finance (DeFi) protocols, NFT marketplaces, and Layer 2 scaling solutions. The Ethereum roadmap includes further upgrades for improved scalability, security, and sustainability.',
  SOL: 'Solana is a high-performance blockchain platform designed for decentralized applications and crypto-native projects. Founded by Anatoly Yakovenko in 2017 and launched in 2020, Solana introduces a novel Proof of History (PoH) consensus mechanism combined with Proof of Stake. This hybrid approach enables throughput capabilities exceeding thousands of transactions per second with sub-second finality and low transaction costs. The Solana ecosystem has grown rapidly, hosting DeFi protocols, NFT projects, and consumer applications. The upcoming Firedancer validator client, developed by Jump Crypto, aims to further increase network performance and decentralization.',
}

const MOCK_SENTIMENT_SCORES = {
  BTC: { overall: 7.2, summary: 'Market sentiment for Bitcoin is cautiously optimistic. Institutional accumulation continues while retail interest shows moderate engagement. On-chain metrics indicate long-term holders remain confident.', happenings: 'ETF inflows have been consistent. Major corporations continue to add Bitcoin to their treasury reserves. Mining difficulty at all-time highs signals strong network security.', futurePlans: 'Lightning Network adoption is accelerating for payments. Ordinals and BRC-20 tokens continue to expand the Bitcoin ecosystem use cases. Layer 2 solutions are gaining traction for scalability.' },
  ETH: { overall: 7.5, summary: 'Ethereum sentiment is positive, driven by ecosystem growth and protocol improvements. The shift to Proof of Stake has strengthened the deflationary narrative. L2 adoption continues to expand.', happenings: 'L2 ecosystem TVL growing rapidly. EIP-4844 (Proto-Danksharding) has dramatically reduced L2 transaction costs. Restaking protocols are gaining significant traction.', futurePlans: 'Full danksharding will further scale the network. Account abstraction (ERC-4337) is improving user experience. Verkle trees and statelessness are on the roadmap for enhanced performance.' },
  SOL: { overall: 7.8, summary: 'Solana sentiment is bullish, fueled by ecosystem expansion and strong developer activity. Network reliability has improved significantly and DeFi TVL is at all-time highs.', happenings: 'Firedancer validator client development progressing well. Jupiter DEX aggregator seeing record volumes. Compressed NFTs reducing costs for creators and consumers.', futurePlans: 'Firedancer mainnet deployment will dramatically increase throughput. Token extensions enabling new financial use cases. Saga mobile platform expanding crypto access to mobile users.' },
}

const MOCK_TECHNICAL_INDICATORS = [
  { name: 'RSI (14)', value: '52.4', signal: 'neutral', detail: 'The Relative Strength Index at 52.4 is in neutral territory, sitting between the oversold (30) and overbought (70) thresholds. This suggests balanced buying and selling pressure with no immediate directional bias.' },
  { name: 'MACD (12,26,9)', value: 'Bullish Cross', signal: 'bullish', detail: 'The MACD line has crossed above the signal line, generating a bullish crossover signal. Histogram bars are expanding, indicating strengthening upward momentum.' },
  { name: 'Bollinger Bands', value: 'Mid-Band', signal: 'neutral', detail: 'Price is trading near the middle Bollinger Band (20-period SMA), suggesting a period of consolidation. Band width is contracting, which often precedes a significant move.' },
  { name: 'EMA 20', value: 'Above', signal: 'bullish', detail: 'Price is trading above the 20-period Exponential Moving Average, indicating short-term bullish momentum. The EMA slope is positive, confirming the uptrend.' },
  { name: 'EMA 50', value: 'Above', signal: 'bullish', detail: 'Price remains above the 50-period EMA, maintaining the medium-term bullish structure. This level often acts as dynamic support during pullbacks.' },
  { name: 'EMA 200', value: 'Above', signal: 'bullish', detail: 'Trading above the 200-period EMA confirms the long-term bullish trend. The "golden cross" (50 EMA above 200 EMA) remains intact.' },
  { name: 'Stochastic (14,3)', value: '58.2', signal: 'neutral', detail: 'The Stochastic oscillator at 58.2 is in neutral zone. Neither overbought nor oversold, suggesting the current trend has room to continue in either direction.' },
  { name: 'ADX (14)', value: '28.5', signal: 'bullish', detail: 'The Average Directional Index at 28.5 indicates a moderately strong trend. Values above 25 suggest a trending market rather than ranging conditions.' },
  { name: 'CCI (20)', value: '+42', signal: 'neutral', detail: 'The Commodity Channel Index at +42 is within normal range (-100 to +100). No extreme overbought or oversold conditions detected.' },
  { name: 'Williams %R', value: '-38.5', signal: 'neutral', detail: 'Williams %R at -38.5 is in neutral territory. The indicator would need to drop below -80 for oversold or rise above -20 for overbought signals.' },
  { name: 'OBV', value: 'Rising', signal: 'bullish', detail: 'On-Balance Volume is trending upward, indicating that volume on up days exceeds volume on down days. This confirms the price trend with volume support.' },
  { name: 'VWAP', value: 'Above', signal: 'bullish', detail: 'Price is trading above the Volume Weighted Average Price, indicating institutional buying interest and bullish intraday bias.' },
  { name: 'Ichimoku Cloud', value: 'Above Cloud', signal: 'bullish', detail: 'Price is trading above the Ichimoku Cloud (Kumo), with the leading span A above leading span B. This is a strong bullish signal across multiple timeframes.' },
]

// Default fallback for any token without specific mock data
const getDefaultMockData = (sym) => ({
  tweets: MOCK_TWEETS[sym] || MOCK_TWEETS.BTC,
  categories: MOCK_CATEGORIES[sym] || MOCK_CATEGORIES.BTC || ['Cryptocurrency'],
  markets: MOCK_MARKETS[sym] || MOCK_MARKETS.DEFAULT,
  description: MOCK_PROJECT_DESCRIPTIONS[sym] || `${sym} is a cryptocurrency token traded on major exchanges. Research is ongoing for this project.`,
  sentiment: MOCK_SENTIMENT_SCORES[sym] || MOCK_SENTIMENT_SCORES.BTC,
})

// ────────────────────────────────────────────────────────────────────────────────
// ICONS (inline SVGs)
// ────────────────────────────────────────────────────────────────────────────────

// ChevronIcon removed — CollapsibleSection replaced with always-visible sections

const InfoIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="rz-pro-ta-item-info">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const ExternalLinkIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const GlobeIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
)

const TwitterXIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const BrainIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 015 5c0 1.5-.5 2.5-1.5 3.5L12 14l-3.5-3.5C7.5 9.5 7 8.5 7 7a5 5 0 015-5z" />
    <path d="M9 22v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
    <path d="M5 10c-1.5 1-2 3-2 5 0 3 2 5 5 5" /><path d="M19 10c1.5 1 2 3 2 5 0 3-2 5-5 5" />
  </svg>
)

const ChartIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const CandlestickIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="8" width="4" height="8" rx="0.5" /><line x1="7" y1="4" x2="7" y2="8" /><line x1="7" y1="16" x2="7" y2="20" />
    <rect x="15" y="6" width="4" height="10" rx="0.5" /><line x1="17" y1="2" x2="17" y2="6" /><line x1="17" y1="16" x2="17" y2="22" />
  </svg>
)

const LineChartIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 8 13 13 9 9 2 16" />
  </svg>
)

const SentimentIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

const TechnicalIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M18 20V4M6 20v-4" />
  </svg>
)

// ────────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────────

// fmtPrice and fmtLargeNumber removed — now provided by useCurrency hook

function fmtChange(n) {
  if (n == null || Number.isNaN(Number(n))) return '0.00'
  return Number(n).toFixed(2)
}

function fmtSupply(n) {
  if (n == null || !Number.isFinite(Number(n))) return '--'
  const num = Number(n)
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
}

function generateSparklineData(length = 20, trend = 'up') {
  const data = []
  let value = 50 + Math.random() * 20
  for (let i = 0; i < length; i++) {
    const direction = trend === 'up' ? 0.6 : trend === 'down' ? -0.6 : 0
    value += (Math.random() - 0.5 + direction) * 4
    value = Math.max(10, Math.min(90, value))
    data.push(value)
  }
  return data
}

// ────────────────────────────────────────────────────────────────────────────────
// SVG SPARKLINE COMPONENT
// ────────────────────────────────────────────────────────────────────────────────

const MiniSparkline = React.memo(({ data, width = 120, height = 40, color = '#22c55e', fillOpacity = 0.15 }) => {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const fillPoints = `0,${height} ${points} ${width},${height}`
  const gradId = `sparkGrad-${color.replace('#', '')}-${width}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

// ────────────────────────────────────────────────────────────────────────────────
// SECTION DIVIDER (replaces CollapsibleSection — always visible, no accordion)
// ────────────────────────────────────────────────────────────────────────────────

const SectionDivider = ({ title, icon }) => (
  <div className="rz-pro-section-divider">
    {icon && <span className="rz-pro-section-divider-icon">{icon}</span>}
    <span className="rz-pro-section-divider-label">{title}</span>
  </div>
)

// ────────────────────────────────────────────────────────────────────────────────
// SENTIMENT CHART (Canvas)
// ────────────────────────────────────────────────────────────────────────────────

const SentimentChart = React.memo(({ symbol, price, dayMode }) => {
  const { fmtPrice } = useCurrency()
  const { t } = useTranslation()
  const canvasRef = useRef(null)
  const [showPrice, setShowPrice] = useState(true)
  const [showSentiment, setShowSentiment] = useState(true)
  const [showEngagement, setShowEngagement] = useState(false)

  // Stable data per symbol
  const sentimentData = useMemo(() => generateSparklineData(50, 'up'), [symbol])
  const priceData = useMemo(() => generateSparklineData(50, 'up'), [symbol])
  const engagementData = useMemo(() => generateSparklineData(50, 'neutral'), [symbol])

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height

    ctx.clearRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = dayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i + 20
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    const drawLine = (data, color, opacity = 1) => {
      if (!data || data.length < 2) return
      const min = Math.min(...data)
      const max = Math.max(...data)
      const range = max - min || 1
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.globalAlpha = opacity
      ctx.lineWidth = 2
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - 20 - ((v - min) / range) * (h - 40)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (showPrice) drawLine(priceData, '#3b82f6', 0.9)
    if (showSentiment) drawLine(sentimentData, '#22c55e', 0.8)
    if (showEngagement) drawLine(engagementData, '#f59e0b', 0.7)
  }, [showPrice, showSentiment, showEngagement, dayMode, priceData, sentimentData, engagementData])

  useEffect(() => {
    drawChart()
    const handleResize = () => drawChart()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawChart])

  return (
    <div className="rz-pro-sentiment-chart">
      <div className="rz-pro-sentiment-header">
        <span className="rz-pro-sentiment-header-symbol">{symbol}</span>
        <span className="rz-pro-sentiment-header-price">{fmtPrice(price)}</span>
        <div className="rz-pro-sentiment-toggles">
          <button
            className={`rz-pro-sentiment-toggle ${showPrice ? 'active' : ''}`}
            onClick={() => setShowPrice(s => !s)}
          >
            <span className="rz-pro-sentiment-toggle-dot" style={{ background: '#3b82f6' }} />{t('researchPro.priceToggle')}
          </button>
          <button
            className={`rz-pro-sentiment-toggle ${showSentiment ? 'active' : ''}`}
            onClick={() => setShowSentiment(s => !s)}
          >
            <span className="rz-pro-sentiment-toggle-dot" style={{ background: '#22c55e' }} />{t('researchPro.sentimentToggle')}
          </button>
          <button
            className={`rz-pro-sentiment-toggle ${showEngagement ? 'active' : ''}`}
            onClick={() => setShowEngagement(s => !s)}
          >
            <span className="rz-pro-sentiment-toggle-dot" style={{ background: '#f59e0b' }} />{t('researchPro.engagementToggle')}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="rz-pro-sentiment-canvas" />
      <p className="rz-pro-sentiment-mock-text">
        {t('researchPro.mockSentimentData')}
      </p>
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────────

export default function ResearchZonePro({
  symbol = 'BTC',
  tokenData = {},
  dayMode = false,
  onTokenSelect,
  activeTokenInfo,
  onModeChange,
}) {
  const { fmtPrice, fmtLarge } = useCurrency()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [tweetSearch, setTweetSearch] = useState('')
  const [tweetsOpen, setTweetsOpen] = useState(true)
  const [coinDetails, setCoinDetails] = useState(null)
  const [coinDetailsLoading, setCoinDetailsLoading] = useState(false)

  const sym = (symbol || 'BTC').toUpperCase()
  const mockData = useMemo(() => getDefaultMockData(sym), [sym])
  const tokenColor = TOKEN_ROW_COLORS[sym] || { bg: '139, 92, 246', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }

  // Build effective token data (merge props with defaults)
  const td = useMemo(() => {
    const price = parseFloat(tokenData.price) || 0
    const change24h = parseFloat(tokenData.change24h) || 0
    return {
      price,
      change24h,
      marketCap: tokenData.marketCap || tokenData.mcap || 0,
      volume: tokenData.volume || tokenData.volume24h || 0,
      name: tokenData.name || sym,
      logo: tokenData.logo || `https://assets.coingecko.com/coins/images/1/small/bitcoin.png`,
      rank: tokenData.rank || null,
      fdv: tokenData.fdv || tokenData.marketCap || tokenData.mcap || 0,
      totalSupply: tokenData.totalSupply || tokenData.maxSupply || null,
      circulatingSupply: tokenData.circulatingSupply || tokenData.circulating || null,
    }
  }, [tokenData, sym])

  // Fetch coin details from CoinGecko for project links and description
  useEffect(() => {
    let cancelled = false
    setCoinDetailsLoading(true)
    getCoinDetails(sym).then(details => {
      if (!cancelled) {
        setCoinDetails(details)
        setCoinDetailsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setCoinDetailsLoading(false)
    })
    return () => { cancelled = true }
  }, [sym])

  // Generate performance percentages
  const performanceData = useMemo(() => {
    const ch24 = td.change24h
    return [
      { label: '24h', value: ch24 },
      { label: '7d', value: ch24 * 1.8 + (Math.random() - 0.5) * 4 },
      { label: '14d', value: ch24 * 2.2 + (Math.random() - 0.5) * 6 },
      { label: '30d', value: ch24 * 0.5 + (Math.random() - 0.5) * 10 },
      { label: '1y', value: ch24 * 8 + (Math.random() - 0.5) * 30 },
    ]
  }, [td.change24h])

  // AI analysis text
  const aiAnalysis = useMemo(() => {
    const p = td.price
    const ch = td.change24h
    const trend = ch >= 0 ? 'bullish' : 'bearish'
    const trendWord = ch >= 0 ? 'upward' : 'downward'
    const support = p * (1 - Math.abs(ch / 100) - 0.05)
    const resistance = p * (1 + Math.abs(ch / 100) + 0.03)
    return {
      trend: `${sym} is currently showing ${trend} momentum with a ${trendWord} trajectory over the last 24 hours. The price action at ${fmtPrice(p)} reflects ${ch >= 0 ? 'buying pressure from key support zones' : 'selling pressure testing key support levels'}. Volume analysis indicates ${Math.abs(ch) > 5 ? 'elevated' : 'moderate'} trading activity relative to the 30-day average.`,
      support: fmtPrice(support),
      resistance: fmtPrice(resistance),
      quickTA: `Moving averages are ${ch >= 0 ? 'aligning bullishly with the 20 EMA above the 50 EMA' : 'showing bearish crossover potential'}. RSI at the daily level is ${Math.abs(ch) > 5 ? (ch > 0 ? 'approaching overbought territory' : 'nearing oversold conditions') : 'in neutral territory around 50'}. Bollinger Bands are ${Math.abs(ch) > 3 ? 'expanding, signaling increased volatility' : 'contracting, suggesting an imminent breakout'}.`,
    }
  }, [sym, td.price, td.change24h])

  // Category sparkline data
  const categorySparklines = useMemo(() => ({
    sector: generateSparklineData(20, td.change24h >= 0 ? 'up' : 'down'),
    topToken: generateSparklineData(20, 'up'),
  }), [td.change24h])

  // Filtered tweets for sidebar
  const filteredTweets = useMemo(() => {
    const tweets = mockData.tweets
    if (!tweetSearch.trim()) return tweets
    const q = tweetSearch.toLowerCase()
    return tweets.filter(t =>
      t.text.toLowerCase().includes(q) ||
      t.handle.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    )
  }, [mockData.tweets, tweetSearch])

  // Tab definitions
  const TABS = [
    { id: 'overview', label: t('researchPro.overview'), icon: <ChartIcon /> },
    { id: 'project', label: t('researchPro.project'), icon: <GlobeIcon /> },
    { id: 'sentiment', label: t('researchPro.sentiment'), icon: <SentimentIcon /> },
    { id: 'technicals', label: t('researchPro.technicals'), icon: <TechnicalIcon /> },
  ]

  // ────────────────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Price Chart
  // ────────────────────────────────────────────────────────────────────────────

  const renderPriceChart = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.priceChart')} icon={<CandlestickIcon size={14} />} />
      <div className="rz-pro-chart-container">
        <TradingChart
          token={activeTokenInfo || { address: null, networkId: 1 }}
          stats={{ symbol: sym, name: td.name, price: td.price, logo: td.logo }}
          dayMode={dayMode}
          embedMode={true}
          embedHeight={420}
        />
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Performance Cards
  // ────────────────────────────────────────────────────────────────────────────

  const renderPerformanceCards = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.pricePerformance')} icon={<LineChartIcon size={14} />} />
      <div className="rz-pro-perf-cards">
        {performanceData.map(({ label, value }) => (
          <div key={label} className="rz-pro-perf-card">
            <div className="rz-pro-perf-label">{label}</div>
            <div className={`rz-pro-perf-value ${value >= 0 ? 'positive' : 'negative'}`}>
              {value >= 0 ? '+' : ''}{fmtChange(value)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: AI Analysis
  // ────────────────────────────────────────────────────────────────────────────

  const renderAIAnalysis = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.aiMarketAnalysis')} icon={<BrainIcon size={14} />} />
      <div className="rz-pro-ai-analysis">
        <div className="rz-pro-ai-label">{t('researchPro.trend')}</div>
        <p className="rz-pro-ai-text">{aiAnalysis.trend}</p>

        <div className="rz-pro-ai-label">{t('researchPro.keyLevels')}</div>
        <div className="rz-pro-ai-key-levels">
          <span className="rz-pro-ai-text">
            {t('researchPro.support')}: <span className="support">{aiAnalysis.support}</span>
          </span>
          <span className="rz-pro-ai-text">
            {t('researchPro.resistance')}: <span className="resistance">{aiAnalysis.resistance}</span>
          </span>
        </div>

        <div className="rz-pro-ai-label">{t('researchPro.technicalIndicatorsQuickTA')}</div>
        <p className="rz-pro-ai-text">{aiAnalysis.quickTA}</p>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Category Analysis
  // ────────────────────────────────────────────────────────────────────────────

  const renderCategoryAnalysis = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.categoryAnalysis')} icon={<ChartIcon />} />
      <div className="rz-pro-category-grid">
        <div className="rz-pro-category-panel">
          <div className="rz-pro-category-panel-title">{t('researchPro.sectorPerformance')}</div>
          <div className="rz-pro-category-chart">
            <MiniSparkline
              data={categorySparklines.sector}
              width={240}
              height={180}
              color={td.change24h >= 0 ? '#22c55e' : '#ef4444'}
              fillOpacity={0.1}
            />
          </div>
          <p className="rz-pro-category-ai-text">
            The {mockData.categories[0] || 'crypto'} sector is {td.change24h >= 0 ? 'outperforming' : 'underperforming'} the broader market with {td.change24h >= 0 ? 'positive' : 'negative'} momentum.
          </p>
        </div>
        <div className="rz-pro-category-panel">
          <div className="rz-pro-category-panel-title">{t('researchPro.topCategoryToken')}</div>
          <div className="rz-pro-category-chart">
            <MiniSparkline
              data={categorySparklines.topToken}
              width={240}
              height={180}
              color="#3b82f6"
              fillOpacity={0.1}
            />
          </div>
          <p className="rz-pro-category-ai-text">
            {sym} leads the {mockData.categories[0] || 'crypto'} category by market capitalization and trading volume.
          </p>
        </div>
        <div className="rz-pro-category-panel">
          <div className="rz-pro-category-panel-title">{t('researchPro.aiAnalysis')}</div>
          <p className="rz-pro-category-ai-text">
            Within the {mockData.categories.slice(0, 2).join(' & ')} categories, {sym} maintains a dominant position.
            Network effects and ecosystem growth continue to reinforce its market position against competitors.
            Sector rotation patterns suggest {td.change24h >= 0 ? 'continued strength' : 'potential recovery'} ahead.
          </p>
        </div>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Sentiment Analysis
  // ────────────────────────────────────────────────────────────────────────────

  const renderSentimentAnalysis = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.sentimentAnalysis')} icon={<SentimentIcon />} />
      <SentimentChart symbol={sym} price={td.price} dayMode={dayMode} />
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Influencer Tweets
  // ────────────────────────────────────────────────────────────────────────────

  const renderInfluencerTweets = () => (
    <div className="rz-pro-content-section">
      <SectionDivider title={t('researchPro.influencerTweets')} icon={<TwitterXIcon size={14} />} />
      <div className="rz-pro-influencer-tweets">
        {mockData.tweets.map(tweet => (
          <div key={tweet.id} className="rz-pro-tweet-card">
            <div className="rz-pro-tweet-header">
              <img src={tweet.avatar} alt="" className="rz-pro-tweet-avatar" />
              <div>
                <div className="rz-pro-tweet-handle">{tweet.name}</div>
                <div className="rz-pro-tweet-header-subtitle">{tweet.handle}</div>
              </div>
            </div>
            <p className="rz-pro-tweet-text">{tweet.text}</p>
            <div className="rz-pro-tweet-score">
              {t('researchPro.sentimentScore')}: <strong style={{ color: 'rgb(var(--rz-token-rgb))' }}>{tweet.sentimentScore}</strong>
              <div className="rz-pro-tweet-score-bar">
                <div className="rz-pro-tweet-score-fill" style={{ width: `${tweet.sentimentScore * 10}%` }} />
              </div>
            </div>
            <div className="rz-pro-tweet-actions">
              <button className="rz-pro-tweet-action" onClick={e => e.preventDefault()}>
                {t('researchPro.previewNews')}
              </button>
              <button className="rz-pro-tweet-action" onClick={e => e.preventDefault()}>
                {t('researchPro.readOnX')} <ExternalLinkIcon size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Sentiment Summary
  // ────────────────────────────────────────────────────────────────────────────

  const renderSentimentSummary = () => {
    const sentiment = mockData.sentiment
    return (
      <div className="rz-pro-content-section">
        <SectionDivider title={t('researchPro.sentimentSummary')} icon={<BrainIcon size={14} />} />
        <p className="rz-pro-sentiment-summary-note">
          {t('researchPro.partnerNote')}
        </p>
        <div className="rz-pro-sentiment-summary">
          <div className="rz-pro-sentiment-summary-card rz-pro-sentiment-score-card">
            <div className="rz-pro-sentiment-score-label">{t('researchPro.overallSentimentScore')}</div>
            <div className="rz-pro-sentiment-score">
              {sentiment.overall}<span className="rz-pro-sentiment-score-suffix">/10</span>
            </div>
          </div>
          <div className="rz-pro-sentiment-summary-card">
            <div className="rz-pro-summary-title">{t('researchPro.sentimentSummaryTitle')}</div>
            <p className="rz-pro-summary-text">{sentiment.summary}</p>
          </div>
          <div className="rz-pro-sentiment-summary-card">
            <div className="rz-pro-summary-title">{t('researchPro.currentHappenings')}</div>
            <p className="rz-pro-summary-text">{sentiment.happenings}</p>
          </div>
        </div>
        <div className="rz-pro-sentiment-summary-card">
          <div className="rz-pro-summary-title">{t('researchPro.futurePlans')}</div>
          <p className="rz-pro-summary-text">{sentiment.futurePlans}</p>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Technical Indicators (Technicals Tab)
  // ────────────────────────────────────────────────────────────────────────────

  const renderTechnicalIndicators = () => (
    <div className="rz-pro-ta-layout">
      <div>
        <h3 className="rz-pro-heading-sm">{t('researchPro.technicalIndicators1D')}</h3>
        <div className="rz-pro-indicators">
          {MOCK_TECHNICAL_INDICATORS.map((ind, i) => (
            <div key={i} className="rz-pro-indicator-row">
              <div className="rz-pro-indicator-left">
                <span className="rz-pro-indicator-num">{i + 1}.</span>
                <span className={`rz-pro-indicator-dot ${ind.signal}`} />
                <span className="rz-pro-indicator-name">{ind.name}</span>
              </div>
              <div className="rz-pro-indicator-right">
                <span className="rz-pro-indicator-value">{ind.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="rz-pro-heading-sm">{t('researchPro.taAiAnalysis')}</h3>
        <div className="rz-pro-ta-analysis">
          {MOCK_TECHNICAL_INDICATORS.map((ind, i) => (
            <div key={i} className="rz-pro-ta-item">
              <div className="rz-pro-ta-item-header">
                <span className="rz-pro-ta-item-num">{i + 1}</span>
                <span className="rz-pro-ta-item-name">{ind.name}</span>
                <InfoIcon size={14} />
              </div>
              <p className="rz-pro-ta-item-text">{ind.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Sidebar (persistent across tabs)
  // ────────────────────────────────────────────────────────────────────────────

  const renderSidebar = () => (
    <aside className="rz-pro-sidebar">
      {/* Token Price Card */}
      <div className="rz-pro-sidebar-card" style={{ '--sidebar-index': 0 }}>
        <div className="rz-pro-sidebar-token-header">
          <img
            src={td.logo}
            alt={sym}
            className="rz-pro-sidebar-token-logo"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div className="rz-pro-sidebar-token-info">
            <div className="rz-pro-sidebar-token-name">{td.name}</div>
            <div className="rz-pro-sidebar-token-symbol">{sym}{td.rank ? ` #${td.rank}` : ''}</div>
          </div>
        </div>
        <div className="rz-pro-sidebar-token-price">{fmtPrice(td.price)}</div>
        <div className={`rz-pro-sidebar-token-change ${td.change24h >= 0 ? 'positive' : 'negative'}`}>
          {td.change24h >= 0 ? '+' : ''}{fmtChange(td.change24h)}% (24h)
        </div>
        {coinDetailsLoading ? (
          <div className="rz-pro-shimmer-grid">
            <div className="rz-pro-shimmer rz-pro-shimmer-stat" />
            <div className="rz-pro-shimmer rz-pro-shimmer-stat" />
            <div className="rz-pro-shimmer rz-pro-shimmer-stat" />
            <div className="rz-pro-shimmer rz-pro-shimmer-stat" />
          </div>
        ) : (
          <div className="rz-pro-sidebar-stats">
            <div className="rz-pro-sidebar-stat">
              <div className="rz-pro-sidebar-stat-label">{t('common.marketCap').toUpperCase()}</div>
              <div className="rz-pro-sidebar-stat-value">{fmtLarge(td.marketCap)}</div>
            </div>
            <div className="rz-pro-sidebar-stat">
              <div className="rz-pro-sidebar-stat-label">{t('common.fdv').toUpperCase()}</div>
              <div className="rz-pro-sidebar-stat-value">{fmtLarge(td.fdv)}</div>
            </div>
            <div className="rz-pro-sidebar-stat">
              <div className="rz-pro-sidebar-stat-label">{t('common.totalSupply').toUpperCase()}</div>
              <div className="rz-pro-sidebar-stat-value">{fmtSupply(td.totalSupply)}</div>
            </div>
            <div className="rz-pro-sidebar-stat">
              <div className="rz-pro-sidebar-stat-label">{t('researchLite.circSupply').toUpperCase()}</div>
              <div className="rz-pro-sidebar-stat-value">{fmtSupply(td.circulatingSupply)}</div>
            </div>
            <div className="rz-pro-sidebar-stat">
              <div className="rz-pro-sidebar-stat-label">{t('common.volume').toUpperCase()} (24H)</div>
              <div className="rz-pro-sidebar-stat-value">{fmtLarge(td.volume)}</div>
            </div>
          </div>
        )}

        {/* Markets */}
        <div className="rz-pro-sidebar-markets">
          <div className="rz-pro-sidebar-section-title">{t('researchPro.tokenMarkets')}</div>
          <div className="rz-pro-sidebar-markets-list">
            {mockData.markets.map(exchange => (
              <span key={exchange} className="rz-pro-sidebar-market-pill">{exchange}</span>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="rz-pro-sidebar-categories">
          <div className="rz-pro-sidebar-section-title">{t('researchLite.categories').toUpperCase()}</div>
          <div className="rz-pro-sidebar-categories-list">
            {mockData.categories.map(cat => (
              <span key={cat} className="rz-pro-sidebar-category-pill">{cat}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Project Tweets */}
      <div className="rz-pro-sidebar-card" style={{ '--sidebar-index': 1 }}>
        <div className="rz-pro-sidebar-tweets">
          <div
            className={`rz-pro-sidebar-tweets-header ${tweetsOpen ? 'open' : ''}`}
            onClick={() => setTweetsOpen(o => !o)}
          >
            <span className="rz-pro-sidebar-section-title" style={{ margin: 0 }}>{t('researchLite.tweets').toUpperCase()}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', transform: tweetsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {tweetsOpen && (
            <>
              <input
                type="text"
                placeholder={t('researchPro.searchTweets')}
                value={tweetSearch}
                onChange={e => setTweetSearch(e.target.value)}
                className="rz-pro-sidebar-tweet-search"
              />
              <div>
                {filteredTweets.slice(0, 4).map(tweet => (
                  <div key={tweet.id} className="rz-pro-sidebar-tweet-card">
                    <div className="rz-pro-sidebar-tweet-top">
                      <img src={tweet.avatar} alt="" className="rz-pro-sidebar-tweet-avatar" />
                      <span className="rz-pro-sidebar-tweet-handle">{tweet.handle}</span>
                      <span className="rz-pro-sidebar-tweet-time">{tweet.time}</span>
                    </div>
                    <p className="rz-pro-sidebar-tweet-text">{tweet.text}</p>
                  </div>
                ))}
                {filteredTweets.length === 0 && (
                  <p className="rz-pro-sidebar-tweet-empty">{t('researchPro.noMatchingTweets')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN CONTENT per tab
  // ────────────────────────────────────────────────────────────────────────────

  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {renderPriceChart()}
            {renderPerformanceCards()}
            {renderAIAnalysis()}
            {renderCategoryAnalysis()}
            {renderSentimentAnalysis()}
            {renderInfluencerTweets()}
            {renderSentimentSummary()}
          </>
        )
      case 'project':
        return (
          <>
            <div className="rz-pro-content-section">
              <SectionDivider title={t('researchPro.projectDescription')} icon={<GlobeIcon />} />
              <div className="rz-pro-ai-analysis">
                <p className="rz-pro-ai-text">
                  {coinDetails?.description || mockData.description}
                </p>
              </div>
            </div>
            {renderAIAnalysis()}
            {renderCategoryAnalysis()}
          </>
        )
      case 'sentiment':
        return (
          <>
            {renderSentimentAnalysis()}
            {renderInfluencerTweets()}
            {renderSentimentSummary()}
          </>
        )
      case 'technicals':
        return (
          <>
            <div className="rz-pro-content-section">
              <SectionDivider title={t('researchPro.recentPerformance')} icon={<LineChartIcon size={14} />} />
              <div className="rz-pro-recent-perf">
                <p className="rz-pro-recent-perf-text">
                  The price is{' '}
                  <span className={td.change24h < 0 ? 'negative' : 'positive'}>
                    {td.change24h < 0 ? 'down' : 'up'} {Math.abs(td.change24h).toFixed(2)}%
                  </span>{' '}
                  {t('researchPro.overPast24h')}
                  {performanceData[3] && (
                    <>
                      {' '}and{' '}
                      <span className={performanceData[3].value < 0 ? 'negative' : 'positive'}>
                        {performanceData[3].value < 0 ? 'down' : 'up'} {Math.abs(performanceData[3].value).toFixed(2)}%
                      </span>{' '}
                      {t('researchPro.overPast30d')}
                    </>
                  )}.
                  {' '}{t('researchPro.currentPrice')}: {fmtPrice(td.price)}.
                </p>
              </div>
            </div>
            {renderPriceChart()}
            {renderTechnicalIndicators()}
          </>
        )
      default:
        return null
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ROOT RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const aboutLinks = coinDetails?.links || {}

  return (
    <div
      className={`rz-pro ${dayMode ? 'day-mode' : ''}`}
      style={{ '--rz-token-rgb': tokenColor.bg }}
    >
      {/* ── Hero Banner (Option A) ── */}
      <div className="rz-pro-hero" aria-label={`${td.name} overview`}>
        <div className="rz-pro-hero-glow" />
        <div className="rz-pro-hero-accent" />

        <div className="rz-pro-hero-left">
          <button type="button" className="rz-pro-hero-star" aria-label={t('token.addToWatchlist')} title={t('token.addToWatchlist')}>
            {spectreIcons.star}
          </button>

          <div className="rz-pro-hero-logo-wrap">
            {RZ_TOKEN_LOGOS[sym] ? (
              <img src={RZ_TOKEN_LOGOS[sym]} alt="" className="rz-pro-hero-logo" onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <span className="rz-pro-hero-logo-fallback">{sym.charAt(0)}</span>
            )}
            {td.rank && <span className="rz-pro-hero-rank">#{td.rank}</span>}
          </div>

          <div className="rz-pro-hero-identity">
            <span className="rz-pro-hero-name">{td.name}</span>
            <span className="rz-pro-hero-ticker">{sym} · {mockData.categories[0] || 'Cryptocurrency'}</span>
          </div>
        </div>

        <div className="rz-pro-hero-socials">
          {aboutLinks.twitter && (
            <a href={aboutLinks.twitter} target="_blank" rel="noopener noreferrer" className="rz-pro-hero-social" title="X (Twitter)">
              <TwitterXIcon size={15} />
            </a>
          )}
          {aboutLinks.reddit && (
            <a href={aboutLinks.reddit} target="_blank" rel="noopener noreferrer" className="rz-pro-hero-social" title="Reddit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
            </a>
          )}
          {aboutLinks.homepage && (
            <a href={aboutLinks.homepage} target="_blank" rel="noopener noreferrer" className="rz-pro-hero-social" title={t('research.website')}>
              <GlobeIcon size={15} />
            </a>
          )}
        </div>

        <div className="rz-pro-hero-price-block">
          <span className="rz-pro-hero-price">{fmtPrice(td.price)}</span>
          <span className={`rz-pro-hero-change ${td.change24h >= 0 ? 'up' : 'down'}`}>
            <span className="rz-pro-hero-change-pill">
              {td.change24h >= 0 ? '+' : ''}{fmtChange(td.change24h)}%
            </span>
            <span className="rz-pro-hero-change-label">24h</span>
          </span>
        </div>
      </div>

      {/* ── Tab Bar (below hero) ── */}
      <div className="rz-pro-tab-bar">
        <div className="rz-pro-tab-bar-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`rz-pro-tab-bar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {onModeChange && (
          <div className="rz-pro-tab-bar-mode" role="tablist" aria-label="Mode">
            <button type="button" role="tab" aria-selected={false} className="rz-pro-tab-bar-mode-btn" onClick={() => onModeChange('lite')}>
              LITE
            </button>
            <button type="button" role="tab" aria-selected={true} className="rz-pro-tab-bar-mode-btn active">
              PRO
            </button>
          </div>
        )}
      </div>

      {/* 2-column layout */}
      <div className="rz-pro-layout">
        <main className="rz-pro-main">
          {renderMainContent()}
        </main>
        {renderSidebar()}
      </div>
    </div>
  )
}
