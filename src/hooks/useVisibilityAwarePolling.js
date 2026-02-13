/**
 * Visibility-Aware Polling Hook
 * Pauses polling when tab is hidden, reduces polling when window is backgrounded
 */
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that manages visibility-aware polling
 * @param {Function} fetchFn - Function to call for fresh data
 * @param {number} activeInterval - Polling interval when tab is active (ms)
 * @param {number} backgroundInterval - Polling interval when tab is backgrounded (ms)
 */
export function useVisibilityAwarePolling(fetchFn, activeInterval = 60000, backgroundInterval = 300000) {
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep ref updated
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    isActiveRef.current = !document.hidden;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isActiveRef.current = isVisible;

      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set new interval based on visibility
      const interval = isVisible ? activeInterval : backgroundInterval;
      
      // Immediately fetch if becoming visible again (but not on initial mount)
      if (isVisible && intervalRef.current !== null) {
        fetchFnRef.current();
      }

      intervalRef.current = setInterval(() => {
        fetchFnRef.current();
      }, interval);
    };

    // Initial setup
    handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeInterval, backgroundInterval]);

  // Return function to manually trigger refresh
  return useCallback(() => {
    fetchFnRef.current();
  }, []);
}

/**
 * Check if tab is currently visible
 */
export function isTabVisible() {
  return !document.hidden;
}

/**
 * Check if tab is backgrounded
 */
export function isTabBackgrounded() {
  return document.hidden;
}
