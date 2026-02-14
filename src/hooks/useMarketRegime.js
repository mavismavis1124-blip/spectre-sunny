/**
 * useMarketRegime.js - Custom hook for Market Regime Detection
 * Calculates market regime based on token price volatility and trend strength
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBinanceTopCoinPrices } from './useCodexData';

const REGIME_COLORS = {
  trending: '#8b5cf6', // Purple
  ranging: '#06b6d4', // Cyan/Teal
  volatile: '#ef4444', // Red
  accumulation: '#10b981', // Green
};

const REGIME_LABELS = {
  trending: 'Trending',
  ranging: 'Ranging',
  volatile: 'Volatile',
  accumulation: 'Accumulation',
};

const REGIME_DESCRIPTIONS = {
  trending: 'Clear directional movement with strong momentum',
  ranging: 'Sideways movement within defined boundaries',
  volatile: 'High volatility with sharp price swings',
  accumulation: 'Quiet period with building pressure',
};

const REGIME_ICONS = {
  trending: '↗️',
  ranging: '↔️',
  volatile: '📊',
  accumulation: '🏔️',
};

/**
 * Calculate market regime from price data
 * Uses volatility (standard deviation of returns) and trend strength
 */
function calculateRegime(prices) {
  if (!prices || Object.keys(prices).length === 0) {
    return {
      regime: 'unknown',
      confidence: 0,
      volatility: 0,
      trendStrength: 0,
    };
  }

  const symbols = Object.keys(prices);
  const changes = symbols.map(s => prices[s].change || 0).filter(c => c !== null && c !== undefined);
  
  if (changes.length === 0) {
    return {
      regime: 'unknown',
      confidence: 0,
      volatility: 0,
      trendStrength: 0,
    };
  }

  // Calculate mean change
  const meanChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  
  // Calculate volatility (standard deviation)
  const squaredDiffs = changes.map(c => Math.pow(c - meanChange, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / changes.length;
  const volatility = Math.sqrt(variance);
  
  // Calculate trend strength (absolute average change)
  const trendStrength = Math.abs(meanChange);
  
  // Direction of trend
  const direction = meanChange >= 0 ? 'up' : 'down';
  
  // Determine regime based on thresholds
  let regime;
  let confidence;
  
  // High volatility (> 8%) = Volatile market
  if (volatility > 8) {
    regime = 'volatile';
    confidence = Math.min(100, (volatility / 15) * 100);
  }
  // Very low volatility (< 2%) and low trend strength = Accumulation
  else if (volatility < 2 && trendStrength < 1) {
    regime = 'accumulation';
    confidence = Math.min(100, (2 - volatility) * 30 + (1 - trendStrength) * 20);
  }
  // Moderate trend strength with moderate volatility = Trending
  else if (trendStrength > 2 && volatility < 6) {
    regime = direction === 'up' ? 'trending' : 'trending';
    confidence = Math.min(100, trendStrength * 15 + (6 - volatility) * 5);
  }
  // Everything else = Ranging
  else {
    regime = 'ranging';
    confidence = Math.min(100, 50 + volatility * 2);
  }
  
  return {
    regime,
    direction,
    confidence: Math.round(confidence),
    volatility: Math.round(volatility * 100) / 100,
    trendStrength: Math.round(trendStrength * 100) / 100,
    meanChange: Math.round(meanChange * 100) / 100,
    sampleSize: changes.length,
  };
}

export function useMarketRegime(refreshInterval = 60000) {
  // Fetch major token prices for regime calculation
  const majorSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT'];
  const { prices } = useBinanceTopCoinPrices(majorSymbols, refreshInterval);
  
  const [regimeData, setRegimeData] = useState(() => {
    try {
      const cached = localStorage.getItem('spectre_market_regime_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  });
  
  useEffect(() => {
    if (!prices || Object.keys(prices).length === 0) return;
    
    const calculated = calculateRegime(prices);
    setRegimeData(calculated);
    
    // Cache the result
    try {
      localStorage.setItem('spectre_market_regime_cache', JSON.stringify({
        data: calculated,
        timestamp: Date.now(),
      }));
    } catch (e) {
      // Ignore storage errors
    }
  }, [prices]);

  const displayData = useMemo(() => {
    if (!regimeData) return null;
    
    return {
      ...regimeData,
      color: REGIME_COLORS[regimeData.regime] || '#6b7280',
      label: REGIME_LABELS[regimeData.regime] || 'Unknown',
      description: REGIME_DESCRIPTIONS[regimeData.regime] || 'Market regime unknown',
      icon: REGIME_ICONS[regimeData.regime] || '❓',
    };
  }, [regimeData]);

  return {
    data: displayData,
    raw: regimeData,
    loading: !displayData,
    prices,
  };
}

export { REGIME_COLORS, REGIME_LABELS, REGIME_DESCRIPTIONS, REGIME_ICONS };
export default useMarketRegime;
