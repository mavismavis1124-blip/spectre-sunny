import React from 'react';
import './LoadingSpinner.css';

/**
 * Minimal loading spinner with glass background
 * Used as Suspense fallback for lazy-loaded pages
 */
export default function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner-glass">
        <div className="loading-spinner"></div>
        <p className="loading-spinner-text">Loading...</p>
      </div>
    </div>
  );
}
