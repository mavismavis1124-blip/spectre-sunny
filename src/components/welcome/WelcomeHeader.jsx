/**
 * WelcomeHeader Component
 * Contains: Profile editing, Welcome Widget (BTC/SOL/ETH or stocks), AI Brief rotation
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../hooks/useCurrency'
import SpectreEgg from '../egg/SpectreEgg'
import EggExplainerModal from '../egg/EggExplainerModal'
import useEggState, { EGG_STATES } from '../egg/useEggState'
import AgentAvatar from '../agent/AgentAvatar'
import { getAgentProfile } from '../agent/agentProfile'
import { CinemaWelcomeWrapper } from '../cinema'
import BriefAudioPlayer from '../cinema/BriefAudioPlayer'

// Stock data imports
import { WELCOME_STOCKS as WELCOME_STOCK_SYMBOLS, getStockLogo } from '../../constants/stockData'

// Icon components for the welcome widget
const icons = {
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  heartFilled: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
}

const TOKEN_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}

const TOP_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', networkId: 1 },
  { symbol: 'ETH', name: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', networkId: 1 },
  { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112', networkId: 1399811149 },
]

const COIN_DESCRIPTIONS = {
  BTC: 'Bitcoin - Decentralized digital currency and store of value.',
  ETH: 'Ethereum - Smart contract platform for decentralized applications.',
  SOL: 'Solana - High-performance Layer 1 blockchain for scalable dApps.',
}

const WelcomeHeader = ({
  // Profile props
  profile: profileProp,
  onProfileChange,
  // Market mode
  marketMode = 'crypto',
  isStocks = false,
  // Prices data
  topCoinPrices = {},
  stockPrices = {},
  // Fear & Greed
  fearGreed = { value: 50, classification: 'Neutral' },
  // Egg/Agent system
  eggStage,
  eggStarted,
  eggProgress,
  agentIsBorn,
  agentProfile,
  onEggClick,
  onOpenAgentChat,
  // Cinema mode
  cinemaMode = false,
  dayMode = false,
  // Event handlers
  onOpenResearchZone,
  onTokenClick,
  isInWatchlist,
  addToWatchlist,
  removeFromWatchlist,
}) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLargeShort, currencySymbol } = useCurrency()
  
  // Local profile state
  const [localProfile, setLocalProfile] = useState({ name: '', imageUrl: '' })
  const profile = profileProp && typeof profileProp === 'object' ? profileProp : localProfile
  
  const updateProfile = (next) => {
    if (typeof onProfileChange === 'function') {
      onProfileChange({ name: next.name ?? '', imageUrl: next.imageUrl ?? '' })
    } else {
      setLocalProfile(prev => ({ ...prev, ...next }))
    }
  }

  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(profile?.name ?? '')
  const [profileSaved, setProfileSaved] = useState(false)
  const nameInputRef = useRef(null)
  
  useEffect(() => {
    if (!isEditingName) setDraftName(profile?.name ?? '')
  }, [profile?.name, isEditingName])

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
    event.target.value = ''
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

  // Welcome coins/stocks display
  const WELCOME_COINS = ['BTC', 'SOL', 'ETH']
  
  const welcomeAssets = useMemo(() => {
    if (isStocks) {
      return WELCOME_STOCK_SYMBOLS.map(symbol => {
        const stock = { symbol, name: symbol }
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

  // Generate AI brief statement
  const theBriefStatement = useMemo(() => {
    if (isStocks) {
      const spy = stockPrices?.SPY
      const spyCh = spy?.change != null ? Number(spy.change) : 0
      return `Market ${spyCh >= 0 ? 'up' : 'down'} ${Math.abs(spyCh).toFixed(1)}% today.`
    }
    const btc = topCoinPrices?.BTC
    const btcCh = btc?.change != null ? Number(btc.change) : 0
    const fng = fearGreed?.value ?? 50
    const sentiment = fng > 60 ? 'Greed' : fng < 40 ? 'Fear' : 'Neutral'
    return `BTC ${btcCh >= 0 ? 'up' : 'down'} ${Math.abs(btcCh).toFixed(1)}%. Fear & Greed: ${sentiment}`
  }, [isStocks, stockPrices, topCoinPrices, fearGreed])

  const handleCoinClick = (asset) => {
    if (onTokenClick) {
      onTokenClick(asset)
    } else if (onOpenResearchZone) {
      onOpenResearchZone(asset)
    }
  }

  const getTokenInitials = (symbol) => (symbol || '').slice(0, 2).toUpperCase()

  const formatChange = (change) => {
    const value = typeof change === 'number' ? change : parseFloat(change) || 0
    return value.toFixed(2)
  }

  const checkIsInWatchlist = (token) => {
    return isInWatchlist ? isInWatchlist(token) : false
  }

  return (
    <div className="welcome-header-section">
      {/* Horizontal Welcome Bar */}
      <div className="welcome-horizontal-bar">
        {/* Profile Section */}
        <div className="welcome-horizontal-profile">
          <div className="welcome-horizontal-avatar-wrap">
            <label className="welcome-horizontal-avatar">
              {profile?.imageUrl ? (
                <img src={profile.imageUrl} alt="" />
              ) : (
                <span className="welcome-horizontal-avatar-placeholder">
                  {icons.camera}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                style={{ display: 'none' }}
              />
              <span className="welcome-horizontal-avatar-edit">
                {icons.camera}
              </span>
            </label>
          </div>
          <div className="welcome-horizontal-name">
            <span className="welcome-horizontal-label">{t('welcome.trader')}</span>
            {isEditingName ? (
              <div className="welcome-horizontal-name-edit">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProfileSave()
                    if (e.key === 'Escape') {
                      setIsEditingName(false)
                      setDraftName(profile?.name ?? '')
                    }
                  }}
                  onBlur={handleProfileSave}
                  placeholder={t('welcome.enterName')}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={handleProfileSave}
                  className="welcome-horizontal-name-save"
                  disabled={profileSaved}
                >
                  {profileSaved ? icons.check : icons.edit}
                </button>
              </div>
            ) : (
              <div className="welcome-horizontal-user" onClick={handleStartEditingName}>
                <span className="welcome-horizontal-username">
                  {profile?.name || t('welcome.guest')}
                </span>
                <button type="button" className="welcome-horizontal-edit-btn" aria-label="Edit name">
                  {icons.edit}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="welcome-horizontal-divider" />

        {/* Price Cards */}
        {welcomeAssets.map((asset) => (
          <div
            key={asset.symbol}
            className="welcome-horizontal-coin"
            onClick={() => handleCoinClick(asset)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCoinClick(asset)}
          >
            <div className="welcome-coin-avatar">
              {asset.logo ? (
                <img src={asset.logo} alt={asset.symbol} />
              ) : (
                <span>{getTokenInitials(asset.symbol)}</span>
              )}
            </div>
            <div className="welcome-coin-meta">
              <span className="welcome-coin-symbol">{asset.symbol}</span>
              <span className="welcome-coin-name">{asset.name}</span>
            </div>
            <div className="welcome-coin-price-block">
              <span className="welcome-coin-price">{fmtPrice(asset.price)}</span>
              <span className={`welcome-coin-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                {asset.change >= 0 ? '+' : ''}{formatChange(asset.change)}%
              </span>
            </div>
            {addToWatchlist && (
              <button
                type="button"
                className={`welcome-coin-favorite ${checkIsInWatchlist(asset) ? 'in-watchlist' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (checkIsInWatchlist(asset)) {
                    removeFromWatchlist?.(asset.address || asset.symbol)
                  } else {
                    addToWatchlist?.({
                      symbol: asset.symbol,
                      name: asset.name,
                      address: asset.address,
                      logo: asset.logo,
                      price: asset.price,
                      change: asset.change,
                      pinned: false,
                    })
                  }
                }}
                aria-label={checkIsInWatchlist(asset) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {checkIsInWatchlist(asset) ? icons.heartFilled : icons.heart}
              </button>
            )}
            <button
              type="button"
              className="welcome-topcoin-info-btn"
              aria-label={`Info about ${asset.symbol}`}
              onClick={(e) => {
                e.stopPropagation()
                // Info tooltip logic would go here
              }}
            >
              i
            </button>
          </div>
        ))}

        {/* Divider */}
        <div className="welcome-horizontal-divider" />

        {/* AI Brief Terminal */}
        <div className="welcome-horizontal-terminal">
          <div className="welcome-terminal-header">
            <span className="welcome-terminal-dot" />
            <span className="welcome-terminal-label">AI BRIEF</span>
          </div>
          <div className="welcome-terminal-body">
            <span className="welcome-terminal-chevron">›</span>
            <span className="welcome-terminal-text">{theBriefStatement}</span>
          </div>
        </div>

        {/* Egg/Agent Section */}
        {eggStage && eggStage !== EGG_STATES.HIDDEN && (
          <div className="welcome-horizontal-egg">
            <SpectreEgg
              stage={eggStage}
              started={eggStarted}
              progress={eggProgress}
              onClick={onEggClick}
            />
          </div>
        )}
        {agentIsBorn && (
          <div className="welcome-horizontal-agent" onClick={onOpenAgentChat}>
            <AgentAvatar profile={getAgentProfile(agentProfile)} size="sm" />
            <span className="welcome-agent-label">{t('welcome.yourAgent')}</span>
          </div>
        )}
      </div>

      {/* Egg Explainer Modal */}
      <EggExplainerModal
        isOpen={eggStage === EGG_STATES.READY}
        onStart={onEggClick}
      />
    </div>
  )
}

export default WelcomeHeader
