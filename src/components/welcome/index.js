/**
 * Welcome Page Components - Index
 * Provides clean exports and React.lazy()-ready components for code splitting
 */

// Main orchestrator
export { default as WelcomePage } from '../WelcomePage'

// Sub-components (for direct import if needed)
export { default as WelcomeHeader } from './WelcomeHeader'
export { default as MarketOverviewSection } from './MarketOverviewSection'
export { default as TokenDiscoverySection } from './TokenDiscoverySection'
export { default as RecentActivitySection } from './RecentActivitySection'

// Lazy-loaded versions for code splitting (recommended)
import React from 'react'

export const LazyTokenDiscoverySection = React.lazy(() => 
  import('./TokenDiscoverySection').then(module => ({ 
    default: module.default 
  }))
)

export const LazyMarketOverviewSection = React.lazy(() => 
  import('./MarketOverviewSection').then(module => ({ 
    default: module.default 
  }))
)

export const LazyRecentActivitySection = React.lazy(() => 
  import('./RecentActivitySection').then(module => ({ 
    default: module.default 
  }))
)
