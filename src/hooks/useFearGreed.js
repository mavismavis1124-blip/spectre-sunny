/**
 * useFearGreed.js - Custom hook for Fear & Greed Index data
 * Fetches from alternative.me API with caching
 */

import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'spectre_fear_greed_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useFearGreed(refreshInterval = 10 * 60 * 1000) {
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  const fetchFearGreed = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fear-greed');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const formatted = {
          current: result.data[0],
          history: result.data.slice(0, 30),
          lastUpdated: result.lastUpdated,
        };
        setData(formatted);
        setError(null);
        
        // Cache locally
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: formatted,
            timestamp: Date.now(),
          }));
        } catch (e) {
          // Ignore storage errors
        }
      }
    } catch (err) {
      console.error('Fear & Greed fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFearGreed();
    const interval = setInterval(fetchFearGreed, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchFearGreed, refreshInterval]);

  return { data, loading, error, refresh: fetchFearGreed };
}

export function getFearGreedColor(value) {
  if (value <= 20) return '#ef4444'; // Extreme Fear - Red
  if (value <= 40) return '#f97316'; // Fear - Orange
  if (value <= 60) return '#eab308'; // Neutral - Yellow
  if (value <= 80) return '#22c55e'; // Greed - Green
  return '#10b981'; // Extreme Greed - Teal
}

export function getFearGreedGradient(value) {
  if (value <= 20) return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  if (value <= 40) return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
  if (value <= 60) return 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
  if (value <= 80) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
  return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
}

export function getFearGreedLabel(value) {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
}

export function getFearGreedDescription(value) {
  if (value <= 20) return 'Investors are in a state of high anxiety. This could be a buying opportunity.';
  if (value <= 40) return 'Investors are cautious and fearful. Market sentiment is negative.';
  if (value <= 60) return 'Market sentiment is balanced between buyers and sellers.';
  if (value <= 80) return 'Investors are optimistic and bullish. Greed is driving the market.';
  return 'Euphoria in the market. High risk of correction. Be cautious.';
}
