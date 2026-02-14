import { useState, useEffect, useCallback } from 'react';

const API_BASE = '';
const REFRESH_INTERVAL = 60000; // 60 seconds

export function useFundingRates() {
  const [fundingRates, setFundingRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFundingRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/funding-rates`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch funding rates: ${response.status}`);
      }
      
      const data = await response.json();
      setFundingRates(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Funding rates fetch error:', err);
      setError(err.message || 'Failed to fetch funding rates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFundingRates();
  }, [fetchFundingRates]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFundingRates();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchFundingRates]);

  return {
    fundingRates,
    loading,
    error,
    lastUpdated,
    refresh: fetchFundingRates,
  };
}
