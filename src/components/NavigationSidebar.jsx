/**
 * NavigationSidebar Component
 * Left sidebar navigation - always visible with two modes:
 * 1. Collapsed: icons only (56px)
 * 2. Expanded: icons + full labels (240px)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './NavigationSidebar.css'

const NavigationSidebar = ({ currentPage, onPageChange, onCollapsedChange }) => {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('spectre-nav-sidebar-collapsed')
    return saved === 'true'
  })
  const [tooltip, setTooltip] = useState({ text: '', top: 0, left: 0, visible: false })
  const tooltipTimerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('spectre-nav-sidebar-collapsed', isCollapsed.toString())
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed)
    }
  }, [isCollapsed, onCollapsedChange])

  const showTooltip = useCallback((e, label) => {
    if (!isCollapsed) return
    clearTimeout(tooltipTimerRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      text: label,
      top: rect.top + rect.height / 2,
      left: rect.right + 14,
      visible: true,
    })
  }, [isCollapsed])

  const hideTooltip = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }))
    }, 50)
  }, [])

  const getIcon = (id) => {
    const icons = {
      'research-platform': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      'discover': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      ),
      'research-zone': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      'defi-yields': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      ),
      'search-engine': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      ),
      'ai-screener': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <circle cx="12" cy="10" r="2" />
          <path d="M8 10a4 4 0 018 0" />
        </svg>
      ),
      'watchlists': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      'x-dash': (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      'x-bubbles': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
        </svg>
      ),
      'ai-charts': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      'ai-charts-lab': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3L9 11L4 19C3.3 20.1 4.1 21.5 5.4 21.5H18.6C19.9 21.5 20.7 20.1 20 19L15 11V3" />
          <line x1="9" y1="3" x2="15" y2="3" />
          <circle cx="10" cy="16" r="1" fill="currentColor" />
          <circle cx="14" cy="14" r="1" fill="currentColor" />
        </svg>
      ),
      'heatmaps': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="9" height="11" rx="1" />
          <rect x="13" y="2" width="9" height="6" rx="1" />
          <rect x="13" y="10" width="9" height="12" rx="1" />
          <rect x="2" y="15" width="9" height="7" rx="1" />
        </svg>
      ),
      'funding-rates': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      'bubbles': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7" />
          <circle cx="18" cy="8" r="4" />
          <circle cx="16" cy="18" r="3.5" />
        </svg>
      ),
      'ai-market-analysis': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      'market-analytics': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 6 13.5 14.5 8.5 9.5 2 18" />
          <polyline points="16 6 22 6 22 12" />
        </svg>
      ),
      'user-dashboard': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      'structure-guide': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          <path d="M8 7h8M8 11h8M8 15h4" />
        </svg>
      ),
      'glossary': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          <path d="M8 10h.01M8 14h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01" />
        </svg>
      ),
      'fear-greed': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
      'token-unlocks': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      'social-zone': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      'ai-media-center': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
          <path d="M17 8h.01" />
        </svg>
      ),
      'categories': (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    }
    return icons[id] || null
  }

  const navigationItems = [
    { id: 'research-platform', label: t('nav.researchPlatform'), isActive: true },
    { id: 'discover', label: t('nav.discover') },
    { id: 'research-zone', label: t('nav.researchZone') },
    { id: 'defi-yields', label: t('nav.defiYields', 'DeFi Yields') },
    { id: 'search-engine', label: t('nav.searchEngine') },
    { id: 'ai-screener', label: t('nav.aiScreener') },
    { id: 'watchlists', label: t('nav.watchlists') },
    { id: 'glossary', label: t('nav.glossary') },
    { id: 'fear-greed', label: t('nav.fearGreed') },
    { id: 'social-zone', label: t('nav.socialZone') },
    { id: 'ai-media-center', label: t('nav.aiMediaCenter') },
    { id: 'x-dash', label: t('nav.xDash') },
    { id: 'x-bubbles', label: t('nav.xBubbles') },
    { id: 'ai-charts', label: t('nav.aiCharts') },
    { id: 'ai-charts-lab', label: t('nav.aiChartsLab') },
    { id: 'heatmaps', label: t('nav.heatmaps') },
    { id: 'funding-rates', label: t('nav.fundingRates') },
    { id: 'bubbles', label: t('nav.bubbles') },
    { id: 'categories', label: t('nav.categories') },
    { id: 'ai-market-analysis', label: t('nav.aiMarketAnalysis') },
    { id: 'market-analytics', label: t('nav.marketAnalytics') },
    { id: 'user-dashboard', label: t('nav.userDashboard') },
    { id: 'structure-guide', label: t('nav.structureGuide') },
  ]

  const handleItemClick = (itemId) => {
    if (onPageChange) {
      onPageChange(itemId)
    }
  }

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      <aside className={`navigation-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="navigation-sidebar-content">
          {/* Toggle button - above the navigation list */}
          <div className="navigation-sidebar-toggle-wrapper">
            <button
              className="navigation-sidebar-toggle"
              onClick={toggleCollapsed}
              title={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              aria-label={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? (
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
              {!isCollapsed && <span className="navigation-sidebar-toggle-label">{t('nav.collapse')}</span>}
            </button>
          </div>

          <nav className="navigation-sidebar-nav" aria-label="Main navigation">
            <ul className="navigation-sidebar-list">
              {navigationItems.map((item) => {
                const isActive = currentPage === item.id || (item.id === 'research-platform' && !currentPage)
                return (
                  <li key={item.id} className="navigation-sidebar-item">
                    <button
                      type="button"
                      className={`navigation-sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item.id)}
                      onMouseEnter={(e) => showTooltip(e, item.label)}
                      onMouseLeave={hideTooltip}
                    >
                      <span className="navigation-sidebar-icon" aria-hidden="true">
                        {getIcon(item.id)}
                      </span>
                      <span className="navigation-sidebar-label">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Fixed-position tooltip via portal - escapes all overflow clipping */}
      {isCollapsed && tooltip.text && createPortal(
        <div
          className={`navigation-sidebar-tooltip ${tooltip.visible ? 'visible' : ''}`}
          style={{
            top: tooltip.top,
            left: tooltip.left,
            transform: `translateY(-50%) ${tooltip.visible ? 'translateX(0)' : 'translateX(-4px)'}`,
          }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}
    </>
  )
}

export default NavigationSidebar
