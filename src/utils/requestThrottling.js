/**
 * Request Batching and Throttling Utilities
 * Reduces API load by batching requests and limiting concurrency
 */

/**
 * Execute array of async functions with concurrency limit and delays
 * @param {Array<Function>} tasks - Array of functions that return promises
 * @param {number} concurrency - Max concurrent tasks (default: 3)
 * @param {number} delayMs - Delay between batches in ms (default: 200)
 * @returns {Promise<Array>} Results in same order as tasks
 */
export async function batchRequests(tasks, concurrency = 3, delayMs = 200) {
  const results = new Array(tasks.length);
  let index = 0;

  async function runBatch() {
    const batch = [];
    while (batch.length < concurrency && index < tasks.length) {
      const currentIndex = index++;
      batch.push(
        tasks[currentIndex]().then(
          result => ({ status: 'fulfilled', value: result, index: currentIndex }),
          error => ({ status: 'rejected', reason: error, index: currentIndex })
        )
      );
    }

    if (batch.length === 0) return;

    const batchResults = await Promise.all(batch);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results[result.index] = result.value;
      } else {
        results[result.index] = null; // or throw depending on requirements
        console.warn(`Batch request failed at index ${result.index}:`, result.reason?.message);
      }
    });

    // Add delay between batches if there are more tasks
    if (index < tasks.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Process all batches
  while (index < tasks.length) {
    await runBatch();
  }

  return results;
}

/**
 * Request deduplication cache
 * Prevents duplicate in-flight requests
 */
const pendingRequests = new Map();
const pendingRequestTimeouts = new Map();

/**
 * Execute a request with deduplication
 * @param {string} key - Unique key for this request type
 * @param {Function} requestFn - Function that returns a promise
 * @param {number} ttlMs - How long to cache the pending promise (default: 5000)
 * @returns {Promise} Same promise for identical concurrent requests
 */
export function deduplicatedRequest(key, requestFn, ttlMs = 5000) {
  // If there's a pending request with this key, return it
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Execute the request
  const promise = requestFn().then(
    result => {
      // Clean up after completion
      pendingRequests.delete(key);
      if (pendingRequestTimeouts.has(key)) {
        clearTimeout(pendingRequestTimeouts.get(key));
        pendingRequestTimeouts.delete(key);
      }
      return result;
    },
    error => {
      // Clean up on error too
      pendingRequests.delete(key);
      if (pendingRequestTimeouts.has(key)) {
        clearTimeout(pendingRequestTimeouts.get(key));
        pendingRequestTimeouts.delete(key);
      }
      throw error;
    }
  );

  // Store the pending request
  pendingRequests.set(key, promise);

  // Set timeout to clean up if request takes too long
  const timeoutId = setTimeout(() => {
    pendingRequests.delete(key);
    pendingRequestTimeouts.delete(key);
  }, ttlMs);
  pendingRequestTimeouts.set(key, timeoutId);

  return promise;
}

/**
 * Clear all pending request caches (useful for testing or logout)
 */
export function clearPendingRequests() {
  pendingRequestTimeouts.forEach(timeout => clearTimeout(timeout));
  pendingRequestTimeouts.clear();
  pendingRequests.clear();
}

/**
 * Throttle function execution
 * @param {Function} fn - Function to throttle
 * @param {number} limitMs - Minimum time between executions
 * @returns {Function} Throttled function
 */
export function throttle(fn, limitMs) {
  let lastRun = 0;
  let timeoutId = null;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= limitMs) {
      // Execute immediately
      lastRun = now;
      return fn.apply(this, args);
    } else {
      // Schedule for later
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastRun = Date.now();
        fn.apply(this, args);
      }, limitMs - timeSinceLastRun);
    }
  };
}

/**
 * Debounce function execution
 * @param {Function} fn - Function to debounce
 * @param {number} waitMs - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, waitMs) {
  let timeoutId = null;

  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), waitMs);
  };
}
