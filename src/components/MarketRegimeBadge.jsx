/**
 * MarketRegimeBadge.jsx - Market Regime Detection Badge
 * Simple badge showing current market regime with icon and color
 */

import React from 'react';
import { useMarketRegime, REGIME_ICONS } from '../hooks/useMarketRegime';
import './MarketRegimeBadge.css';

const MarketRegimeBadge = ({ showDetails = false }) => {
  const { data, loading } = useMarketRegime();

  if (loading || !data) {
    return (
      <div className="market-regime-badge loading">
        <div className="badge-pulse" />
        <span>Analyzing...</span>
      </div>
    );
  }

  const { regime, label, color, icon, description, confidence, volatility, trendStrength, direction } = data;

  return (
    <div className="market-regime-badge-container">
      <div 
        className="market-regime-badge"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          borderColor: `${color}40`,
        }}
      >
        <span className="badge-icon" style={{ color }}>
          {icon}
        </span>
        <div className="badge-content">
          <span className="badge-label" style={{ color }}>
            {label}
          </span>
          {confidence > 0 && (
            <span className="badge-confidence">
              {confidence}% confidence
            </span>
          )}
        </div>
        <div 
          className="badge-indicator"
          style={{ background: color }}
        />
      </div>

      {showDetails && (
        <div className="regime-details glass-card">
          <p className="regime-description">{description}</p>
          
          <div className="regime-metrics">
            <div className="metric">
              <span className="metric-label">Volatility</span>
              <span className="metric-value" style={{ 
                color: volatility > 8 ? '#ef4444' : volatility < 2 ? '#10b981' : '#eab308'
              }}>
                {volatility}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Trend</span>
              <span className="metric-value" style={{
                color: direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#6b7280'
              }}>
                {trendStrength}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Direction</span>
              <span className="metric-value">
                {direction === 'up' ? '↑ Bullish' : direction === 'down' ? '↓ Bearish' : '→ Neutral'}
              </span>
            </div>
          </div>

          <div className="regime-insight">
            <strong>Insight:</strong>
            {regime === 'trending' && ' Strong directional momentum. Consider trend-following strategies.'}
            {regime === 'ranging' && ' Price is consolidating. Watch for breakout opportunities.'}
            {regime === 'volatile' && ' High volatility detected. Reduce position sizes and use tight stops.'}
            {regime === 'accumulation' && ' Quiet accumulation phase. Large moves may be building.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketRegimeBadge;
