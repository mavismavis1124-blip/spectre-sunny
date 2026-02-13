/**
 * DiscoverPage - CINEMATIC EDITORIAL V3
 * Matches the TokenStorybook aesthetic
 *
 * Features:
 * - Full-screen breathing chart backgrounds
 * - Editorial typography (Playfair Display)
 * - Cinema mode cards that preview the storybook experience
 * - Immersive scrolling with parallax
 * - Documentary-style token presentations
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getTopCoinsMarketsPage } from '../services/coinGeckoApi'
import { getStockQuotes, getStockLogoUrl, POPULAR_STOCKS, FALLBACK_STOCK_DATA } from '../services/stockApi'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import spectreIcons from '../icons/spectreIcons'
import TokenStorybook from './TokenStorybook'
import { useCurrency } from '../hooks/useCurrency'
import './DiscoverPage.css'

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN STORIES DATA (subset for discover preview)
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_TAGLINES = {
  BTC: { tagline: 'discover.taglines.btcTag', description: 'discover.taglines.btcDesc' },
  ETH: { tagline: 'discover.taglines.ethTag', description: 'discover.taglines.ethDesc' },
  SOL: { tagline: 'discover.taglines.solTag', description: 'discover.taglines.solDesc' },
  XRP: { tagline: 'discover.taglines.xrpTag', description: 'discover.taglines.xrpDesc' },
  DOGE: { tagline: 'discover.taglines.dogeTag', description: 'discover.taglines.dogeDesc' },
  ADA: { tagline: 'discover.taglines.adaTag', description: 'discover.taglines.adaDesc' },
  AVAX: { tagline: 'discover.taglines.avaxTag', description: 'discover.taglines.avaxDesc' },
  DOT: { tagline: 'discover.taglines.dotTag', description: 'discover.taglines.dotDesc' },
  LINK: { tagline: 'discover.taglines.linkTag', description: 'discover.taglines.linkDesc' },
  MATIC: { tagline: 'discover.taglines.maticTag', description: 'discover.taglines.maticDesc' },
  UNI: { tagline: 'discover.taglines.uniTag', description: 'discover.taglines.uniDesc' },
  SHIB: { tagline: 'discover.taglines.shibTag', description: 'discover.taglines.shibDesc' },
  LTC: { tagline: 'discover.taglines.ltcTag', description: 'discover.taglines.ltcDesc' },
  ATOM: { tagline: 'discover.taglines.atomTag', description: 'discover.taglines.atomDesc' },
  ARB: { tagline: 'discover.taglines.arbTag', description: 'discover.taglines.arbDesc' },
  OP: { tagline: 'discover.taglines.opTag', description: 'discover.taglines.opDesc' },
  NEAR: { tagline: 'discover.taglines.nearTag', description: 'discover.taglines.nearDesc' },
  FIL: { tagline: 'discover.taglines.filTag', description: 'discover.taglines.filDesc' },
  APT: { tagline: 'discover.taglines.aptTag', description: 'discover.taglines.aptDesc' },
  INJ: { tagline: 'discover.taglines.injTag', description: 'discover.taglines.injDesc' },
}

const STOCK_TAGLINES = {
  AAPL: { tagline: 'discover.stockTaglines.aaplTag', description: 'discover.stockTaglines.aaplDesc' },
  MSFT: { tagline: 'discover.stockTaglines.msftTag', description: 'discover.stockTaglines.msftDesc' },
  GOOGL: { tagline: 'discover.stockTaglines.googlTag', description: 'discover.stockTaglines.googlDesc' },
  AMZN: { tagline: 'discover.stockTaglines.amznTag', description: 'discover.stockTaglines.amznDesc' },
  NVDA: { tagline: 'discover.stockTaglines.nvdaTag', description: 'discover.stockTaglines.nvdaDesc' },
  TSLA: { tagline: 'discover.stockTaglines.tslaTag', description: 'discover.stockTaglines.tslaDesc' },
  META: { tagline: 'discover.stockTaglines.metaTag', description: 'discover.stockTaglines.metaDesc' },
  JPM: { tagline: 'discover.stockTaglines.jpmTag', description: 'discover.stockTaglines.jpmDesc' },
  V: { tagline: 'discover.stockTaglines.vTag', description: 'discover.stockTaglines.vDesc' },
  MA: { tagline: 'discover.stockTaglines.maTag', description: 'discover.stockTaglines.maDesc' },
  AMD: { tagline: 'discover.stockTaglines.amdTag', description: 'discover.stockTaglines.amdDesc' },
  NFLX: { tagline: 'discover.stockTaglines.nflxTag', description: 'discover.stockTaglines.nflxDesc' },
  DIS: { tagline: 'discover.stockTaglines.disTag', description: 'discover.stockTaglines.disDesc' },
  JNJ: { tagline: 'discover.stockTaglines.jnjTag', description: 'discover.stockTaglines.jnjDesc' },
  WMT: { tagline: 'discover.stockTaglines.wmtTag', description: 'discover.stockTaglines.wmtDesc' },
  SPY: { tagline: 'discover.stockTaglines.spyTag', description: 'discover.stockTaglines.spyDesc' },
  QQQ: { tagline: 'discover.stockTaglines.qqqTag', description: 'discover.stockTaglines.qqqDesc' },
  XOM: { tagline: 'discover.stockTaglines.xomTag', description: 'discover.stockTaglines.xomDesc' },
  GS: { tagline: 'discover.stockTaglines.gsTag', description: 'discover.stockTaglines.gsDesc' },
  BA: { tagline: 'discover.stockTaglines.baTag', description: 'discover.stockTaglines.baDesc' },
}

const getTokenTagline = (symbol, isStock = false) => {
  if (isStock) {
    return STOCK_TAGLINES[symbol?.toUpperCase()] || {
      tagline: 'Public Company',
      description: 'NYSE / NASDAQ Listed'
    }
  }
  return TOKEN_TAGLINES[symbol?.toUpperCase()] || {
    tagline: 'Digital Asset',
    description: 'Cryptocurrency'
  }
}

const STOCK_DISCOVER_CATEGORIES = [
  {
    id: 'mag7',
    title: 'Magnificent 7',
    subtitle: 'The market\'s power players',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
  },
  {
    id: 'ai-semi',
    title: 'AI & Semiconductors',
    subtitle: 'The future of intelligence',
    symbols: ['NVDA', 'AMD', 'INTC', 'AVGO', 'CRM', 'ADBE', 'ORCL'],
  },
  {
    id: 'finance',
    title: 'Big Finance',
    subtitle: 'Wall Street heavyweights',
    symbols: ['JPM', 'V', 'MA', 'BAC', 'GS', 'MS', 'PYPL', 'COIN'],
  },
  {
    id: 'healthcare',
    title: 'Healthcare Giants',
    subtitle: 'Innovation in medicine',
    symbols: ['JNJ', 'UNH', 'PFE', 'LLY', 'ABBV', 'MRK'],
  },
  {
    id: 'consumer',
    title: 'Consumer Favorites',
    subtitle: 'Brands you know and love',
    symbols: ['WMT', 'COST', 'HD', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP'],
  },
  {
    id: 'energy',
    title: 'Energy & Commodities',
    subtitle: 'Power and resources',
    symbols: ['XOM', 'CVX', 'COP', 'GLD', 'SLV'],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED BREATHING CHART BACKGROUND - Matches storybook style
// ═══════════════════════════════════════════════════════════════════════════════

const BreathingChartBackground = React.memo(({ sparklineData, brandColor, isPositive }) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    let currentWidth = 0
    let currentHeight = 0

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) return false

      currentWidth = rect.width
      currentHeight = rect.height
      canvas.width = currentWidth * dpr
      canvas.height = currentHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return true
    }

    if (!resize()) {
      // Retry after a short delay if parent not ready
      const retryTimeout = setTimeout(() => resize(), 50)
      return () => clearTimeout(retryTimeout)
    }

    window.addEventListener('resize', resize)

    let time = 0
    const rgb = brandColor || (isPositive ? '34, 197, 94' : '239, 68, 68')

    // Always use chart mode — generate synthetic sparkline if real data is missing
    const chartData = sparklineData?.length > 10
      ? sparklineData
      : (() => {
          // Generate a realistic-looking synthetic sparkline (48 points)
          const points = []
          let val = 50
          for (let i = 0; i < 48; i++) {
            val += (Math.random() - 0.48) * 3
            val = Math.max(20, Math.min(80, val))
            points.push(val)
          }
          return points
        })()

    const draw = () => {
      const w = currentWidth
      const h = currentHeight
      if (w === 0 || h === 0) {
        animationRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      const breathe = Math.sin(time * 0.025) * 0.12 + 1
      const verticalShift = Math.sin(time * 0.018) * 10

      {
        const min = Math.min(...chartData)
        const max = Math.max(...chartData)
        const range = max - min || 1
        const padding = h * 0.12

        // Multiple glow passes for richer effect
        for (let pass = 0; pass < 3; pass++) {
          ctx.beginPath()
          chartData.forEach((val, i) => {
            const x = (i / (chartData.length - 1)) * w
            const normalizedY = (val - min) / range
            const y = h - padding - (normalizedY * (h * 0.65) * breathe) + verticalShift
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })

          if (pass === 0) {
            // Fill area under curve
            ctx.lineTo(w, h)
            ctx.lineTo(0, h)
            ctx.closePath()

            const gradient = ctx.createLinearGradient(0, h * 0.15, 0, h)
            gradient.addColorStop(0, `rgba(${rgb}, 0.35)`)
            gradient.addColorStop(0.4, `rgba(${rgb}, 0.15)`)
            gradient.addColorStop(0.7, `rgba(${rgb}, 0.05)`)
            gradient.addColorStop(1, `rgba(${rgb}, 0)`)
            ctx.fillStyle = gradient
            ctx.fill()
          } else {
            // Glow lines
            const alphas = [0.7, 0.45, 0.25]
            const widths = [4, 2.5, 1.5]
            ctx.strokeStyle = `rgba(${rgb}, ${alphas[pass - 1] || 0.3})`
            ctx.lineWidth = widths[pass - 1] || 1
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            if (pass === 1) {
              ctx.shadowColor = `rgba(${rgb}, 0.6)`
              ctx.shadowBlur = 25
            } else {
              ctx.shadowBlur = 0
            }
            ctx.stroke()
          }
        }

        // Animated pulse dot at current price
        const lastX = w - 15
        const lastY = h - padding - (((chartData[chartData.length - 1] - min) / range) * (h * 0.65) * breathe) + verticalShift
        const pulseSize = 5 + Math.sin(time * 0.1) * 3

        // Outer glow
        ctx.beginPath()
        ctx.arc(lastX, lastY, pulseSize + 12, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${0.15 + Math.sin(time * 0.1) * 0.08})`
        ctx.fill()

        // Middle ring
        ctx.beginPath()
        ctx.arc(lastX, lastY, pulseSize + 5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${0.3 + Math.sin(time * 0.1) * 0.12})`
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(lastX, lastY, pulseSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgb(${rgb})`
        ctx.shadowColor = `rgba(${rgb}, 0.7)`
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0

        // White center
        ctx.beginPath()
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      }

      time++
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [sparklineData, brandColor, isPositive])

  return <canvas ref={canvasRef} className="breathing-chart-canvas" />
})

// ═══════════════════════════════════════════════════════════════════════════════
// CINEMATIC HERO CARD - Editorial style featured token
// ═══════════════════════════════════════════════════════════════════════════════

const CinematicHeroCard = React.memo(({ token, onClick, brandColor }) => {
  const { fmtPrice } = useCurrency()
  const { t } = useTranslation()
  const symbol = (token?.symbol || '').toUpperCase()
  const isStock = token?.isStock || false
  const taglineData = getTokenTagline(symbol, isStock)
  const change = token?.price_change_percentage_24h ?? token?.change ?? 0
  const isPositive = change >= 0
  const rgb = brandColor || '139, 92, 246'

  return (
    <div
      className="cinematic-hero-card"
      onClick={() => onClick?.(token)}
      style={{ '--brand-rgb': rgb }}
    >
      {/* Breathing chart background */}
      <div className="cinematic-hero-chart-bg">
        <BreathingChartBackground
          sparklineData={token?.sparkline_in_7d?.price}
          brandColor={rgb}
          isPositive={isPositive}
        />
      </div>

      {/* Gradient overlay */}
      <div className="cinematic-hero-overlay" />

      {/* Content */}
      <div className="cinematic-hero-content">
        {/* Live badge */}
        <div className="cinematic-hero-live">
          <span className="live-dot" />
          {t('discover.live')}
        </div>

        {/* Logo */}
        <div className="cinematic-hero-logo-wrap">
          <div className="cinematic-hero-logo-glow" style={{ background: `rgb(${rgb})` }} />
          <img
            src={isStock ? (token?.logo || getStockLogoUrl(symbol)) : token?.image}
            alt={symbol}
            className={`cinematic-hero-logo ${isStock ? 'cinematic-hero-logo--stock' : ''}`}
          />
        </div>

        {/* Rank / Sector */}
        {isStock ? (
          token?.sector && (
            <div className="cinematic-hero-rank" style={{ color: `rgb(${rgb})` }}>
              {token.sector.toUpperCase()} · {token.exchange || 'NYSE'}
            </div>
          )
        ) : (
          token?.market_cap_rank && (
            <div className="cinematic-hero-rank" style={{ color: `rgb(${rgb})` }}>
              {t('common.rank').toUpperCase()} #{token.market_cap_rank}
            </div>
          )
        )}

        {/* Title - Editorial style */}
        <h1 className="cinematic-hero-title">{token?.name}</h1>
        <p className="cinematic-hero-tagline">{taglineData.tagline}</p>

        {/* Price */}
        <div className="cinematic-hero-price-section">
          <span className="cinematic-hero-price">{fmtPrice(isStock ? token?.price : token?.current_price)}</span>
          <span className={`cinematic-hero-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        </div>

        {/* Description */}
        <p className="cinematic-hero-description">{taglineData.description}</p>

        {/* CTA */}
        <button className="cinematic-hero-cta" style={{ background: `rgb(${rgb})` }}>
          {t('discover.exploreStory')} →
        </button>
      </div>

      {/* Corner accents */}
      <div className="cinematic-hero-corner tl" style={{ borderColor: `rgba(${rgb}, 0.4)` }} />
      <div className="cinematic-hero-corner br" style={{ borderColor: `rgba(${rgb}, 0.4)` }} />
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// CINEMA TOKEN CARD - Storybook preview style
// ═══════════════════════════════════════════════════════════════════════════════

const CinemaTokenCard = React.memo(({ token, index, onClick, onAddToWatchlist, isInWatchlist }) => {
  const { fmtPrice } = useCurrency()
  const { t } = useTranslation()
  const symbol = (token?.symbol || '').toUpperCase()
  const isStock = token?.isStock || false
  const colors = TOKEN_ROW_COLORS[symbol]
  const taglineData = getTokenTagline(symbol, isStock)
  const change = token?.price_change_percentage_24h ?? token?.change ?? 0
  const isPositive = change >= 0
  const rgb = colors?.bg || '139, 92, 246'
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`cinema-token-card ${isHovered ? 'hovered' : ''}`}
      style={{ '--brand-rgb': rgb, '--card-index': index }}
      onClick={() => onClick?.(token)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Breathing chart on hover */}
      <div className="cinema-card-chart">
        {isHovered && (
          <BreathingChartBackground
            sparklineData={token?.sparkline_in_7d?.price?.slice(-48)}
            brandColor={rgb}
            isPositive={isPositive}
          />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="cinema-card-overlay" />

      {/* Glow effect */}
      <div className="cinema-card-glow" />

      {/* Content */}
      <div className="cinema-card-content">
        {/* Logo with ring */}
        <div className="cinema-card-logo-section">
          <div className="cinema-card-ring" style={{ borderColor: `rgba(${rgb}, 0.5)` }} />
          <img
            src={isStock ? (token?.logo || getStockLogoUrl(symbol)) : token?.image}
            alt={symbol}
            className={`cinema-card-logo ${isStock ? 'cinema-card-logo--stock' : ''}`}
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="cinema-card-info">
          <span className="cinema-card-symbol">{symbol}</span>
          <span className="cinema-card-name">{token?.name}</span>
          {isHovered && (
            <span className="cinema-card-tagline">{taglineData.tagline}</span>
          )}
          {isStock && token?.sector && (
            <span className="cinema-card-sector">{token.sector}</span>
          )}
        </div>

        {/* Price section */}
        <div className="cinema-card-price-section">
          <span className="cinema-card-price">{fmtPrice(isStock ? token?.price : token?.current_price)}</span>
          <span className={`cinema-card-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{(typeof change === 'number' ? change : 0).toFixed(2)}%
          </span>
        </div>

        {/* Rank badge for top 10 */}
        {token?.market_cap_rank && token.market_cap_rank <= 10 && (
          <div className="cinema-card-rank">#{token.market_cap_rank}</div>
        )}

        {/* Hover reveal */}
        {isHovered && (
          <div className="cinema-card-hover-reveal">
            <span className="cinema-card-explore">{t('discover.viewStory')} →</span>
          </div>
        )}
      </div>

      {/* Watchlist button */}
      <button
        className={`cinema-card-watchlist ${isInWatchlist?.(symbol) ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onAddToWatchlist?.(token)
        }}
      >
        {spectreIcons.star}
      </button>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY ROW - Editorial section headers
// ═══════════════════════════════════════════════════════════════════════════════

const DISCOVER_CATEGORIES = [
  {
    id: 'trending',
    title: 'Trending Now',
    subtitle: 'Hottest movers today',
    filter: (tokens) => [...tokens].sort((a, b) =>
      Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
    ).slice(0, 12),
  },
  {
    id: 'layer1',
    title: 'Layer 1 Blockchains',
    subtitle: 'The foundation of crypto',
    symbols: ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'NEAR', 'APT', 'SUI', 'TON', 'DOT', 'ATOM'],
  },
  {
    id: 'defi',
    title: 'DeFi Protocols',
    subtitle: 'Decentralized finance',
    symbols: ['UNI', 'AAVE', 'MKR', 'CRV', 'LDO', 'LINK', 'INJ', 'GRT'],
  },
  {
    id: 'meme',
    title: 'Meme Season',
    subtitle: 'Community driven',
    symbols: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI'],
  },
  {
    id: 'ai',
    title: 'AI & Compute',
    subtitle: 'The future of intelligence',
    symbols: ['TAO', 'FET', 'RNDR', 'NEAR', 'GRT'],
  },
]

const CATEGORY_I18N_MAP = {
  trending: { title: 'welcome.trendingNow', subtitle: 'discover.hottestMovers' },
  layer1: { title: 'discover.layer1Blockchains', subtitle: 'discover.foundationOfCrypto' },
  defi: { title: 'discover.defiProtocols', subtitle: 'discover.decentralizedFinance' },
  meme: { title: 'discover.memeSeason', subtitle: 'discover.communityDriven' },
  ai: { title: 'discover.aiAndCompute', subtitle: 'discover.futureOfIntelligence' },
  mag7: { title: 'discover.magnificent7', subtitle: 'discover.magnificent7Sub' },
  'ai-semi': { title: 'discover.aiSemiconductors', subtitle: 'discover.aiSemiconductorsSub' },
  finance: { title: 'discover.bigFinance', subtitle: 'discover.bigFinanceSub' },
  healthcare: { title: 'discover.healthcareGiants', subtitle: 'discover.healthcareGiantsSub' },
  consumer: { title: 'discover.consumerFavorites', subtitle: 'discover.consumerFavoritesSub' },
  energy: { title: 'discover.energyCommodities', subtitle: 'discover.energyCommoditiesSub' },
}

const CategoryRow = ({ category, tokens, onTokenClick, onAddToWatchlist, isInWatchlist }) => {
  const { t } = useTranslation()
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 20)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20)
  }, [])

  useEffect(() => {
    checkScroll()
  }, [tokens, checkScroll])

  const scroll = (direction) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' })
  }

  return (
    <section className="category-row">
      <div className="category-header">
        <div className="category-title-group">
          <h2 className="category-title">{CATEGORY_I18N_MAP[category.id] ? t(CATEGORY_I18N_MAP[category.id].title) : category.title}</h2>
          <span className="category-subtitle">{CATEGORY_I18N_MAP[category.id] ? t(CATEGORY_I18N_MAP[category.id].subtitle) : category.subtitle}</span>
        </div>
        <div className="category-nav">
          <button
            className={`category-arrow ${!canScrollLeft ? 'disabled' : ''}`}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            ←
          </button>
          <button
            className={`category-arrow ${!canScrollRight ? 'disabled' : ''}`}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            →
          </button>
        </div>
      </div>

      <div
        className="category-scroll"
        ref={scrollRef}
        onScroll={checkScroll}
      >
        {tokens.map((token, idx) => (
          <CinemaTokenCard
            key={token.id || token.symbol}
            token={token}
            index={idx}
            onClick={onTokenClick}
            onAddToWatchlist={onAddToWatchlist}
            isInWatchlist={isInWatchlist}
          />
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DISCOVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const DiscoverPage = ({
  dayMode = false,
  selectToken,
  onOpenResearchZone,
  addToWatchlist,
  isInWatchlist,
  marketMode = 'crypto',
}) => {
  const isStocks = marketMode === 'stocks'
  const { t } = useTranslation()

  const [allTokens, setAllTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)

  // Storybook state
  const [storybookToken, setStorybookToken] = useState(null)
  const [isStorybookOpen, setIsStorybookOpen] = useState(false)

  // Fetch tokens — crypto or stock depending on mode
  useEffect(() => {
    let cancelled = false

    const fetchCrypto = async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const data = await getTopCoinsMarketsPage(1, 100)
        if (!cancelled) setAllTokens(data || [])
      } catch (err) {
        console.error('Failed to fetch tokens:', err)
        if (!cancelled && allTokens.length === 0) setFetchError('discover.unableToLoad')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const fetchStocks = async () => {
      // Instant fallback: show FALLBACK_STOCK_DATA immediately
      const fallbackTokens = POPULAR_STOCKS.map((stock, index) => {
        const fb = FALLBACK_STOCK_DATA[stock.symbol]
        return {
          id: stock.symbol,
          symbol: stock.symbol,
          name: stock.name,
          image: getStockLogoUrl(stock.symbol),
          logo: getStockLogoUrl(stock.symbol),
          current_price: fb?.price || 0,
          price: fb?.price || 0,
          price_change_percentage_24h: fb?.change || 0,
          change: fb?.change || 0,
          market_cap: fb?.marketCap || 0,
          marketCap: fb?.marketCap || 0,
          total_volume: fb?.volume || 0,
          market_cap_rank: index + 1,
          sector: stock.sector || fb?.sector || '',
          exchange: stock.exchange || fb?.exchange || '',
          isStock: true,
        }
      })
      if (!cancelled) {
        setAllTokens(fallbackTokens)
        setLoading(false)
      }

      // Upgrade with live data
      try {
        const allSymbols = POPULAR_STOCKS.map(s => s.symbol)
        const quotes = await getStockQuotes(allSymbols)
        if (cancelled) return
        if (Object.keys(quotes).length > 0) {
          const liveTokens = POPULAR_STOCKS.map((stock, index) => {
            const q = quotes[stock.symbol]
            const fb = FALLBACK_STOCK_DATA[stock.symbol]
            return {
              id: stock.symbol,
              symbol: stock.symbol,
              name: q?.name || stock.name,
              image: getStockLogoUrl(stock.symbol),
              logo: getStockLogoUrl(stock.symbol),
              current_price: q?.price || fb?.price || 0,
              price: q?.price || fb?.price || 0,
              price_change_percentage_24h: q?.change || fb?.change || 0,
              change: q?.change || fb?.change || 0,
              market_cap: q?.marketCap || fb?.marketCap || 0,
              marketCap: q?.marketCap || fb?.marketCap || 0,
              total_volume: q?.volume || fb?.volume || 0,
              market_cap_rank: index + 1,
              sector: q?.sector || stock.sector || '',
              exchange: q?.exchange || stock.exchange || '',
              pe: q?.pe || fb?.pe || null,
              isStock: true,
            }
          })
          setAllTokens(liveTokens)
        }
      } catch (err) {
        console.warn('Stock discover live upgrade failed:', err.message)
      }
    }

    if (isStocks) {
      fetchStocks()
    } else {
      fetchCrypto()
    }

    const interval = setInterval(isStocks ? fetchStocks : fetchCrypto, isStocks ? 2 * 60 * 1000 : 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [isStocks])

  // Featured tokens (top 5)
  const featuredTokens = useMemo(() => {
    if (isStocks) {
      // Featured stocks: AAPL, NVDA, MSFT, TSLA, AMZN
      const featured = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN']
      return featured.map(sym => allTokens.find(t => (t.symbol || '').toUpperCase() === sym)).filter(Boolean)
    }
    return allTokens.slice(0, 5)
  }, [allTokens, isStocks])
  const featuredToken = featuredTokens[featuredIndex % (featuredTokens.length || 1)]
  const featuredColors = TOKEN_ROW_COLORS[(featuredToken?.symbol || '').toUpperCase()]

  // Auto-rotate featured
  useEffect(() => {
    if (featuredTokens.length <= 1) return
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featuredTokens.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [featuredTokens.length])

  // Reset featured index on mode change
  useEffect(() => { setFeaturedIndex(0) }, [isStocks])

  // Build category data
  const activeCategories = isStocks ? STOCK_DISCOVER_CATEGORIES : DISCOVER_CATEGORIES

  const categoryData = useMemo(() => {
    if (!allTokens.length) return {}
    const result = {}
    activeCategories.forEach(cat => {
      if (cat.filter) {
        result[cat.id] = cat.filter(allTokens)
      } else if (cat.symbols) {
        result[cat.id] = cat.symbols
          .map(sym => allTokens.find(t => (t.symbol || '').toUpperCase() === sym))
          .filter(Boolean)
      }
    })
    return result
  }, [allTokens, activeCategories])

  // Token click -> open storybook
  const handleTokenClick = useCallback((token) => {
    setStorybookToken(token)
    setIsStorybookOpen(true)
  }, [])

  const handleStorybookClose = useCallback(() => {
    setIsStorybookOpen(false)
  }, [])

  const handleStorybookWatchlist = useCallback((token) => {
    const isStock = token?.isStock || false
    addToWatchlist?.({
      symbol: (token.symbol || '').toUpperCase(),
      name: token.name,
      logo: isStock ? (token.logo || getStockLogoUrl(token.symbol)) : token.image,
      price: isStock ? token.price : token.current_price,
      change: isStock ? token.change : token.price_change_percentage_24h,
      marketCap: isStock ? token.marketCap : token.market_cap,
      pinned: false,
      isStock,
      sector: token.sector || '',
    })
  }, [addToWatchlist])

  const checkIsInWatchlist = useCallback((token) => {
    if (!isInWatchlist) return false
    return isInWatchlist({ symbol: (token?.symbol || '').toUpperCase() })
  }, [isInWatchlist])

  const handleAddToWatchlist = useCallback((token) => {
    const isStock = token?.isStock || false
    addToWatchlist?.({
      symbol: (token.symbol || '').toUpperCase(),
      name: token.name,
      logo: isStock ? (token.logo || getStockLogoUrl(token.symbol)) : token.image,
      price: isStock ? token.price : token.current_price,
      change: isStock ? token.change : token.price_change_percentage_24h,
      marketCap: isStock ? token.marketCap : token.market_cap,
      pinned: false,
      isStock,
      sector: token.sector || '',
    })
  }, [addToWatchlist])

  if (loading) {
    return (
      <div className={`discover-page ${dayMode ? 'day-mode' : ''}`}>
        <div className="discover-loading">
          <div className="discover-loading-orb">
            <div className="discover-loading-ring ring-1" />
            <div className="discover-loading-ring ring-2" />
            <div className="discover-loading-core" />
          </div>
          <span className="discover-loading-text">{t('discover.discovering')}</span>
        </div>
      </div>
    )
  }

  if (fetchError && allTokens.length === 0) {
    return (
      <div className={`discover-page ${dayMode ? 'day-mode' : ''}`}>
        <div className="discover-loading">
          <span className="discover-loading-text" style={{ color: 'rgba(239,68,68,0.9)' }}>{t(fetchError)}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16, padding: '10px 24px', background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#a78bfa',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`discover-page ${dayMode ? 'day-mode' : ''} ${isStocks ? 'stocks-mode' : ''}`}>
      {/* ═══ CINEMATIC HERO ═══ */}
      <section className="discover-hero-section">
        <div className="discover-hero-header">
          <span className="discover-hero-label">SPECTRE AI</span>
          <h1 className="discover-hero-headline">{isStocks ? t('discover.stockDiscovery') : t('discover.title')}</h1>
          <p className="discover-hero-subheadline">
            {isStocks ? t('discover.exploreStockStories') : t('discover.exploreTokenStories')}
          </p>
        </div>

        {/* Featured token carousel */}
        <div className="discover-hero-carousel">
          {featuredToken && (
            <CinematicHeroCard
              token={featuredToken}
              onClick={handleTokenClick}
              brandColor={featuredColors?.bg}
            />
          )}

          {/* Navigation dots */}
          <div className="discover-hero-dots">
            {featuredTokens.map((t, idx) => (
              <button
                key={t.id}
                className={`hero-dot ${idx === featuredIndex ? 'active' : ''}`}
                onClick={() => setFeaturedIndex(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CATEGORY ROWS ═══ */}
      <section className="discover-categories">
        {activeCategories.map(category => {
          const tokens = categoryData[category.id] || []
          if (tokens.length === 0) return null
          return (
            <CategoryRow
              key={category.id}
              category={category}
              tokens={tokens}
              onTokenClick={handleTokenClick}
              onAddToWatchlist={handleAddToWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )
        })}
      </section>

      {/* ═══ TOKEN STORYBOOK ═══ */}
      <TokenStorybook
        token={storybookToken}
        isOpen={isStorybookOpen}
        onClose={handleStorybookClose}
        onAddToWatchlist={handleStorybookWatchlist}
        isInWatchlist={checkIsInWatchlist}
        dayMode={dayMode}
      />
    </div>
  )
}

export default DiscoverPage
