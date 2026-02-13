/**
 * MarketOverviewSection Component
 * Contains: Market stats, Fear & Greed Index, TA signals, dominance metrics
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../hooks/useCurrency'
import { useMarketIntel } from '../../hooks/useMarketIntel'

// TA Signal SVG Icons
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

const MarketOverviewSection = ({
  marketMode = 'crypto',
  isStocks = false,
  topCoinPrices = {},
  stockPrices = {},
  marketIndices = {},
  marketStatus = {},
  fearGreed = { value: 50, classification: 'Neutral' },
  cryptoFearGreed = { value: 50, classification: 'Neutral' },
  liveVix = null,
  dayMode = false,
}) => {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge, currencySymbol } = useCurrency()
  
  // Market intel data
  const intel = useMarketIntel(60000)
  
  // TA Signal Index for rotation
  const [taSignalIndex, setTaSignalIndex] = useState(0)
  
  // Rotate through TA signals
  useEffect(() => {
    const interval = setInterval(() => {
      setTaSignalIndex(prev => (prev + 1) % 8)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Computed market data
  const btc = topCoinPrices?.BTC
  const eth = topCoinPrices?.ETH
  const sol = topCoinPrices?.SOL
  
  const btcPrice = btc?.price ?? 0
  const ethPrice = eth?.price ?? 0
  const btcCh = btc?.change != null ? Number(btc.change) : 0
  const ethCh = eth?.change != null ? Number(eth.change) : 0
  const solCh = sol?.change != null ? Number(sol.change) : 0
  const avgCh = (btcCh + ethCh + solCh) / 3
  const fng = fearGreed?.value ?? 50
  
  // Market dominance
  const marketDominance = useMemo(() => {
    return intel?.dominance || { btc: 56.4, eth: 18.2 }
  }, [intel?.dominance])
  
  // Alt season index
  const altSeason = intel?.altSeasonIndex || 35
  
  // Market structure data
  const marketStructureTrio = useMemo(() => ({
    funding: [
      { symbol: 'BTC', rate: intel?.fundingRates?.btc ?? 0.01, label: 'Longs pay', healthy: Math.abs(intel?.fundingRates?.btc ?? 0) < 0.05 },
      { symbol: 'ETH', rate: intel?.fundingRates?.eth ?? 0.008, label: 'Longs pay', healthy: Math.abs(intel?.fundingRates?.eth ?? 0) < 0.05 },
    ],
    liquidations: {
      longs24h: 12.5,
      shorts24h: 8.3,
      unit: 'M',
      bias: 'longs',
    },
    whaleFlows: { 
      net: intel?.whaleFlows?.net ?? 45, 
      unit: 'M', 
      label: 'Whale net', 
      direction: intel?.whaleFlows?.direction || 'in'
    },
  }), [intel])

  // TA Signals generation
  const taSignals = useMemo(() => {
    const signals = []
    const btcRsi = Math.max(5, Math.min(95, 50 + btcCh * 3.2))
    
    // 1. Reversal Signal
    if (btcRsi <= 20 && fng <= 15) {
      signals.push({ 
        type: 'oversold', 
        strength: 'extreme', 
        icon: TA_SIGNAL_ICONS.reversalDown, 
        label: 'Extreme Oversold', 
        detail: `BTC RSI near historical lows (${btcRsi.toFixed(0)}). Fear & Greed at ${fng}.`, 
        color: 'green' 
      })
    } else if (btcRsi <= 30 || fng <= 20) {
      signals.push({ 
        type: 'oversold', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.reversalDown, 
        label: 'Oversold Signal', 
        detail: `BTC RSI at ${btcRsi.toFixed(0)} with Fear & Greed at ${fng}.`, 
        color: 'green' 
      })
    } else if (btcRsi >= 80 && fng >= 80) {
      signals.push({ 
        type: 'overbought', 
        strength: 'extreme', 
        icon: TA_SIGNAL_ICONS.reversalUp, 
        label: 'Extreme Overbought', 
        detail: `BTC RSI at ${btcRsi.toFixed(0)} with Greed at ${fng}.`, 
        color: 'red' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.neutral, 
        label: 'No Reversal Signal', 
        detail: 'Market in neutral range. No extreme readings to fade.', 
        color: 'neutral' 
      })
    }
    
    // 2. Momentum Signal
    if (avgCh < -5) {
      signals.push({ 
        type: 'oversold', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.momentum, 
        label: 'Momentum Collapse', 
        detail: `Majors averaging ${Math.abs(avgCh).toFixed(1)}% down.`, 
        color: 'red' 
      })
    } else if (avgCh > 5) {
      signals.push({ 
        type: 'overbought', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.momentum, 
        label: 'Parabolic Move', 
        detail: `+Momentum extreme at +${avgCh.toFixed(1)}%.`, 
        color: 'green' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.momentum, 
        label: 'Flat Momentum', 
        detail: `Momentum at ${avgCh >= 0 ? '+' : ''}${avgCh.toFixed(1)}% — no clear bias.`, 
        color: 'neutral' 
      })
    }
    
    // 3. Volatility
    const volMag = Math.abs(avgCh)
    if (volMag > 6) {
      signals.push({ 
        type: volMag > 0 ? 'overbought' : 'oversold', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.volatility, 
        label: 'High Volatility', 
        detail: `Volatility at ${volMag.toFixed(1)}% — extreme moves.`, 
        color: 'red' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.volatility, 
        label: 'Low Volatility', 
        detail: `Compression at ${volMag.toFixed(1)}% — breakout brewing.`, 
        color: 'neutral' 
      })
    }
    
    // 4. Dominance
    const btcDom = marketDominance.btc
    if (btcDom > 58) {
      signals.push({ 
        type: 'neutral', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.dominance, 
        label: 'BTC Dominant', 
        detail: `BTC dominance at ${btcDom.toFixed(1)}% — alt season on hold.`, 
        color: 'amber' 
      })
    } else if (btcDom < 48) {
      signals.push({ 
        type: 'neutral', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.dominance, 
        label: 'Alt Season Signal', 
        detail: `BTC dominance at ${btcDom.toFixed(1)}% — alts gaining.`, 
        color: 'green' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.dominance, 
        label: 'Balanced Market', 
        detail: `BTC dominance at ${btcDom.toFixed(1)}% — equilibrium.`, 
        color: 'neutral' 
      })
    }
    
    // 5. Whale
    const whaleNet = marketStructureTrio.whaleFlows.net
    if (whaleNet < -80) {
      signals.push({ 
        type: 'oversold', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.whale, 
        label: 'Whale Distribution', 
        detail: `Net outflow ${currencySymbol}${Math.abs(whaleNet)}M — distribution.`, 
        color: 'red' 
      })
    } else if (whaleNet > 80) {
      signals.push({ 
        type: 'overbought', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.whale, 
        label: 'Whale Accumulation', 
        detail: `Net inflow +${currencySymbol}${whaleNet}M — smart money buying.`, 
        color: 'green' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.whale, 
        label: 'Whale Neutral', 
        detail: `Whale flow ${currencySymbol}${whaleNet}M — no directional bias.`, 
        color: 'neutral' 
      })
    }
    
    // 6. Sentiment
    if (fng <= 15) {
      signals.push({ 
        type: 'oversold', 
        strength: 'extreme', 
        icon: TA_SIGNAL_ICONS.sentiment, 
        label: 'Extreme Fear', 
        detail: `Fear at ${fng} — historically bullish accumulation zone.`, 
        color: 'green' 
      })
    } else if (fng <= 30) {
      signals.push({ 
        type: 'oversold', 
        strength: 'strong', 
        icon: TA_SIGNAL_ICONS.sentiment, 
        label: 'Fear Zone', 
        detail: `Sentiment at ${fng} — fear present, smart money accumulates.`, 
        color: 'green' 
      })
    } else if (fng >= 80) {
      signals.push({ 
        type: 'overbought', 
        strength: 'extreme', 
        icon: TA_SIGNAL_ICONS.sentiment, 
        label: 'Extreme Greed', 
        detail: `Greed at ${fng} — euphoria historically precedes corrections.`, 
        color: 'red' 
      })
    } else if (fng >= 65) {
      signals.push({ 
        type: 'overbought', 
        strength: 'moderate', 
        icon: TA_SIGNAL_ICONS.sentiment, 
        label: 'Greed Rising', 
        detail: `Sentiment at ${fng} — greed building, stay vigilant.`, 
        color: 'amber' 
      })
    } else {
      signals.push({ 
        type: 'neutral', 
        strength: 'none', 
        icon: TA_SIGNAL_ICONS.sentiment, 
        label: 'Neutral Sentiment', 
        detail: `Fear & Greed at ${fng} — balanced, trade on technicals.`, 
        color: 'neutral' 
      })
    }
    
    return signals
  }, [btcCh, ethCh, solCh, avgCh, fng, marketDominance.btc, marketStructureTrio.whaleFlows.net, currencySymbol])

  // Current TA signal for display
  const currentSignal = taSignals[taSignalIndex] || taSignals[0]

  // Alt season progress
  const altSeasonValue = altSeason?.value ?? 50
  const altSeasonProgress = Math.min(100, Math.max(0, (altSeasonValue / 75) * 100))

  // Market stats
  const marketStats = useMemo(() => ({
    totalMcap: fmtLarge(intel?.globalData?.totalMarketCap || 3.42e12),
    volume24h: fmtLarge(intel?.globalData?.totalVolume || 127.8e9),
    btcDominance: `${marketDominance.btc.toFixed(1)}%`,
    activePairs: '24,891',
  }), [intel?.globalData, marketDominance.btc, fmtLarge])

  return (
    <section className="market-overview-section">
      {/* Market Stats Cards */}
      <div className="market-stats-grid">
        <div className="market-stat-card">
          <span className="market-stat-label">{t('market.totalMcap')}</span>
          <span className="market-stat-value">{marketStats.totalMcap}</span>
        </div>
        <div className="market-stat-card">
          <span className="market-stat-label">{t('market.volume24h')}</span>
          <span className="market-stat-value">{marketStats.volume24h}</span>
        </div>
        <div className="market-stat-card">
          <span className="market-stat-label">{t('market.btcDominance')}</span>
          <span className="market-stat-value">{marketStats.btcDominance}</span>
        </div>
        <div className="market-stat-card">
          <span className="market-stat-label">{t('market.activePairs')}</span>
          <span className="market-stat-value">{marketStats.activePairs}</span>
        </div>
      </div>

      {/* Fear & Greed + Alt Season */}
      <div className="sentiment-overview">
        {/* Fear & Greed Gauge */}
        <div className="fear-greed-card">
          <div className="fear-greed-header">
            <span className="fear-greed-title">Fear & Greed Index</span>
            <span className={`fear-greed-badge ${fng <= 20 ? 'fear' : fng >= 75 ? 'greed' : 'neutral'}`}>
              {fearGreed.classification || 'Neutral'}
            </span>
          </div>
          <div className="fear-greed-gauge">
            <div className="fear-greed-track">
              <div 
                className="fear-greed-fill"
                style={{ width: `${fng}%`, background: fng <= 20 ? '#ff1744' : fng >= 75 ? '#00e676' : '#ffd600' }}
              />
            </div>
            <div className="fear-greed-markers">
              <span>Extreme Fear</span>
              <span>Neutral</span>
              <span>Extreme Greed</span>
            </div>
            <div className="fear-greed-value">{fng}</div>
          </div>
        </div>

        {/* Alt Season Indicator */}
        <div className="alt-season-card">
          <div className="alt-season-header">
            <span className="alt-season-title">Alt Season Index</span>
            <span className={`alt-season-badge ${altSeason >= 50 ? 'active' : 'dormant'}`}>
              {altSeason >= 50 ? 'Active' : 'Dormant'}
            </span>
          </div>
          <div className="alt-season-body">
            <div className="alt-season-ring">
              <svg viewBox="0 0 36 36" className="alt-season-chart">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={altSeason?.value >= 50 ? '#00e676' : '#ff9100'}
                  strokeWidth="3"
                  strokeDasharray={`${altSeasonProgress}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="alt-season-number">{altSeason?.value}</span>
            </div>
            <div className="alt-season-text">
              {altSeason?.value >= 50 
                ? 'Alts outperforming BTC — alt season in progress'
                : 'BTC leading — alt season not yet confirmed'}
            </div>
          </div>
        </div>

        {/* Live TA Signal */}
        <div className={`ta-signal-card ${currentSignal?.color || 'neutral'}`}>
          <div className="ta-signal-header">
            <span className="ta-signal-icon">{currentSignal?.icon}</span>
            <span className="ta-signal-title">Live Signal</span>
          </div>
          <div className="ta-signal-body">
            <span className="ta-signal-label">{currentSignal?.label}</span>
            <span className="ta-signal-detail">{currentSignal?.detail}</span>
          </div>
          <div className="ta-signal-dots">
            {taSignals.map((_, idx) => (
              <span key={idx} className={`ta-signal-dot ${idx === taSignalIndex ? 'active' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Market Structure Trio */}
      <div className="market-structure-overview">
        {/* Funding Rates */}
        <div className="structure-card">
          <span className="structure-title">Funding</span>
          <div className="structure-items">
            {marketStructureTrio.funding.map((item) => (
              <div key={item.symbol} className={`structure-item ${item.healthy ? 'healthy' : 'high'}`}>
                <span className="structure-symbol">{item.symbol}</span>
                <span className="structure-value">{(item.rate * 100).toFixed(3)}%</span>
                <span className="structure-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidations */}
        <div className="structure-card">
          <span className="structure-title">24h Liquidations</span>
          <div className="structure-liquidations">
            <div className="liq-bar longs">
              <span className="liq-label">Longs</span>
              <div className="liq-progress">
                <div className="liq-fill" style={{ width: `${Math.min(100, marketStructureTrio.liquidations.longs24h * 5)}%` }} />
              </div>
              <span className="liq-value">${marketStructureTrio.liquidations.longs24h}M</span>
            </div>
            <div className="liq-bar shorts">
              <span className="liq-label">Shorts</span>
              <div className="liq-progress">
                <div className="liq-fill" style={{ width: `${Math.min(100, marketStructureTrio.liquidations.shorts24h * 5)}%` }} />
              </div>
              <span className="liq-value">${marketStructureTrio.liquidations.shorts24h}M</span>
            </div>
          </div>
        </div>

        {/* Whale Flows */}
        <div className="structure-card">
          <span className="structure-title">Whale Flows</span>
          <div className={`structure-whale ${marketStructureTrio.whaleFlows.direction}`}>
            <span className="whale-icon">
              {marketStructureTrio.whaleFlows.direction === 'in' ? '↓' : '↑'}
            </span>
            <span className="whale-value">
              {marketStructureTrio.whaleFlows.direction === 'in' ? '+' : '-'}
              {currencySymbol}{Math.abs(marketStructureTrio.whaleFlows.net)}M
            </span>
            <span className="whale-label">
              {marketStructureTrio.whaleFlows.direction === 'in' ? 'Accumulation' : 'Distribution'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketOverviewSection
