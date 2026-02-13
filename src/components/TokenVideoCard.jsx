/**
 * TokenVideoCard - Remotion-powered Token Card
 * Shows animated price chart on hover using @remotion/player
 */
import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { Player } from '@remotion/player'
import { CryptoPriceAction } from '../remotion/CryptoPriceAction'
import { TOKEN_ROW_COLORS } from '../constants/tokenColors'
import { useCurrency } from '../hooks/useCurrency'
import './TokenVideoCard.css'

const TokenVideoCard = ({
  token,
  index = 0,
  onClick,
  onAddToWatchlist,
  isInWatchlist,
  showVideo = true,
}) => {
  const { fmtPrice } = useCurrency()
  const [isHovered, setIsHovered] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const symbol = (token.symbol || '').toUpperCase()
  const colors = TOKEN_ROW_COLORS[symbol] || { bg: '139, 92, 246', gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }
  const change = token.price_change_percentage_24h || token.change || 0
  const isPositive = change >= 0

  // Brand color for Remotion
  const brandColor = useMemo(() => {
    const rgb = colors.bg.split(',').map(n => parseInt(n.trim()))
    return `rgb(${rgb.join(', ')})`
  }, [colors.bg])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const cardStyle = {
    '--card-index': index,
    '--card-brand-rgb': colors.bg,
  }

  return (
    <div
      className={`token-video-card ${isHovered ? 'hovered' : ''}`}
      style={cardStyle}
      onClick={() => onClick?.(token)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background layers */}
      <div className="token-video-card-bg" />
      <div className="token-video-card-glow" />

      {/* Video player (shows on hover) */}
      {showVideo && isHovered && (
        <div className="token-video-card-player">
          <Player
            component={CryptoPriceAction}
            inputProps={{
              symbol,
              brandColor,
              brandColorRGB: colors.bg,
            }}
            durationInFrames={300}
            compositionWidth={400}
            compositionHeight={300}
            fps={30}
            style={{
              width: '100%',
              height: '100%',
            }}
            autoPlay
            loop
            controls={false}
          />
        </div>
      )}

      {/* Static content (shows when not hovered) */}
      <div className={`token-video-card-static ${isHovered ? 'hidden' : ''}`}>
        {/* Logo */}
        <div className="token-video-card-logo-container">
          <div
            className="token-video-card-ring"
            style={{ background: colors.gradient }}
          />
          <img
            className="token-video-card-logo"
            src={token.image || token.logo}
            alt={symbol}
            loading="lazy"
            onError={(e) => { e.target.src = '/round-logo.png' }}
          />
        </div>

        {/* Info */}
        <div className="token-video-card-info">
          <span className="token-video-card-symbol">{symbol}</span>
          <span className="token-video-card-name">{token.name}</span>
          <div className="token-video-card-price-row">
            <span className="token-video-card-price">
              {fmtPrice(token.current_price || token.price)}
            </span>
            <span className={`token-video-card-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Hover overlay info */}
      {isHovered && (
        <div className="token-video-card-overlay">
          <div className="token-video-card-overlay-header">
            <img
              className="token-video-card-overlay-logo"
              src={token.image || token.logo}
              alt={symbol}
            />
            <div>
              <span className="token-video-card-overlay-symbol">{symbol}</span>
              <span className={`token-video-card-overlay-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="token-video-card-overlay-price">
            {fmtPrice(token.current_price || token.price)}
          </div>
        </div>
      )}

      {/* Rank badge */}
      {token.market_cap_rank && token.market_cap_rank <= 10 && (
        <div className="token-video-card-rank">#{token.market_cap_rank}</div>
      )}

      {/* Watchlist button */}
      <button
        className={`token-video-card-watchlist ${isInWatchlist?.(symbol) ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onAddToWatchlist?.(token)
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>
    </div>
  )
}

export default TokenVideoCard
