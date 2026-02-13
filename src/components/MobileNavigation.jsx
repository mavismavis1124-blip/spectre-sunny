/**
 * MobileNavigation - Central navigation controller for mobile
 * Manages subpage navigation state and provides context
 */
import React, { createContext, useContext, useState, useCallback } from 'react'

// Navigation context
const MobileNavContext = createContext(null)

// Navigation provider - wrap your app with this
export const MobileNavProvider = ({ children }) => {
  const [navStack, setNavStack] = useState([]) // Stack of {page, props}
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Push a new page onto the stack
  const navigate = useCallback((page, props = {}) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setNavStack(prev => [...prev, { page, props }])
      setIsTransitioning(false)
    }, 50)
  }, [])

  // Go back one page
  const goBack = useCallback(() => {
    if (navStack.length === 0) return false
    setIsTransitioning(true)
    setTimeout(() => {
      setNavStack(prev => prev.slice(0, -1))
      setIsTransitioning(false)
    }, 50)
    return true
  }, [navStack.length])

  // Go back to root
  const goToRoot = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setNavStack([])
      setIsTransitioning(false)
    }, 50)
  }, [])

  // Replace current page
  const replace = useCallback((page, props = {}) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setNavStack(prev => {
        if (prev.length === 0) return [{ page, props }]
        return [...prev.slice(0, -1), { page, props }]
      })
      setIsTransitioning(false)
    }, 50)
  }, [])

  const currentPage = navStack[navStack.length - 1] || null
  const canGoBack = navStack.length > 0

  return (
    <MobileNavContext.Provider value={{
      navStack,
      currentPage,
      canGoBack,
      isTransitioning,
      navigate,
      goBack,
      goToRoot,
      replace,
    }}>
      {children}
    </MobileNavContext.Provider>
  )
}

// Hook to use navigation
export const useMobileNav = () => {
  const context = useContext(MobileNavContext)
  if (!context) {
    // Return no-op functions if not wrapped in provider
    return {
      navStack: [],
      currentPage: null,
      canGoBack: false,
      isTransitioning: false,
      navigate: () => {},
      goBack: () => false,
      goToRoot: () => {},
      replace: () => {},
    }
  }
  return context
}

// Subpage definitions for the app
export const MOBILE_SUBPAGES = {
  // Watchlists subpages
  WATCHLIST_DETAIL: 'watchlist-detail',
  WATCHLIST_MANAGE: 'watchlist-manage',
  TOKEN_DETAIL: 'token-detail',

  // Research Zone subpages
  RESEARCH_CHART: 'research-chart',
  RESEARCH_INFO: 'research-info',
  RESEARCH_NEWS: 'research-news',
  RESEARCH_FEED: 'research-feed',

  // Settings subpages
  SETTINGS_PROFILE: 'settings-profile',
  SETTINGS_APPEARANCE: 'settings-appearance',
  SETTINGS_NOTIFICATIONS: 'settings-notifications',

  // Other
  SEARCH_RESULTS: 'search-results',
  TOKEN_ADD: 'token-add',
}

export default MobileNavProvider
