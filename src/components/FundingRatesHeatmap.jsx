import React, { useMemo } from 'react';
import './FundingRatesHeatmap.css';

function getFundingColor(rate) {
  // rate is in percentage (e.g., 0.01 = 0.01%)
  // Positive = longs pay shorts (red)
  // Negative = shorts pay longs (green)
  
  const absRate = Math.abs(rate);
  const maxIntensity = 0.5; // 0.5% is max intensity
  const intensity = Math.min(absRate / maxIntensity, 1);
  
  if (rate > 0) {
    // Red for positive rates (longs pay)
    return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
  } else if (rate < 0) {
    // Green for negative rates (shorts pay)
    return `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`;
  }
  return 'rgba(107, 114, 128, 0.3)';
}

function getFundingTextColor(rate) {
  const absRate = Math.abs(rate);
  if (absRate > 0.3) return '#ffffff';
  return rate > 0 ? '#fca5a5' : rate < 0 ? '#86efac' : '#9ca3af';
}

export default function FundingRatesHeatmap({ data, onSymbolClick }) {
  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    // Sort by absolute rate descending (most extreme first)
    return [...data].sort((a, b) => Math.abs(b.lastFundingRate) - Math.abs(a.lastFundingRate));
  }, [data]);

  if (!sortedData.length) {
    return (
      <div className="funding-heatmap-empty">
        <p>No funding rate data available</p>
      </div>
    );
  }

  return (
    <div className="funding-heatmap">
      <div className="funding-heatmap-grid">
        {sortedData.map((item) => {
          const bgColor = getFundingColor(item.lastFundingRate);
          const textColor = getFundingTextColor(item.lastFundingRate);
          const symbol = item.symbol.replace('USDT', '').replace('USD', '');
          
          return (
            <div
              key={item.symbol}
              className="funding-heatmap-cell"
              style={{ backgroundColor: bgColor }}
              onClick={() => onSymbolClick?.(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSymbolClick?.(item);
                }
              }}
            >
              <div className="funding-heatmap-symbol" style={{ color: textColor }}>
                {symbol}
              </div>
              <div className="funding-heatmap-rate" style={{ color: textColor }}>
                {item.lastFundingRate > 0 ? '+' : ''}{item.lastFundingRate.toFixed(4)}%
              </div>
              <div className="funding-heatmap-projections">
                <span className="funding-heatmap-8h" title="8-hour projection">
                  8h: {item.projection8h > 0 ? '+' : ''}{item.projection8h.toFixed(3)}%
                </span>
                <span className="funding-heatmap-annual" title="Annualized projection">
                  Ann: {item.annualizedRate > 0 ? '+' : ''}{item.annualizedRate.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="funding-heatmap-legend">
        <div className="funding-legend-item">
          <div className="funding-legend-color" style={{ background: 'rgba(34, 197, 94, 0.8)' }} />
          <span>High Negative (Shorts Pay)</span>
        </div>
        <div className="funding-legend-item">
          <div className="funding-legend-color" style={{ background: 'rgba(107, 114, 128, 0.5)' }} />
          <span>Neutral</span>
        </div>
        <div className="funding-legend-item">
          <div className="funding-legend-color" style={{ background: 'rgba(239, 68, 68, 0.8)' }} />
          <span>High Positive (Longs Pay)</span>
        </div>
      </div>
    </div>
  );
}
