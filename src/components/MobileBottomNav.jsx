/**
 * MobileBottomNav – 2026 Mobile Edition
 * 5-tab bottom navigation: Home, Discover, Watchlist, Markets, More
 * Apple-level glass morphism, haptic-feel press states
 * Touch-friendly (min 44px), safe-area aware, dropdown submenus
 */
import React, { useState, useEffect, useRef } from 'react'
import './MobileBottomNav.css'

const MobileBottomNav = ({
  activeId,
  onHome,
  onDiscover,
  onFavorites,
  onMarkets,
  // Subpage navigation handlers
  onResearchZone,
  onAIScreener,
  onGMDashboard,
  onROICalculator,
  onHeatmaps,
  onBubbles,
  onFearGreed,
}) => {
  const [expandedMenu, setExpandedMenu] = useState(null)
  const navRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setExpandedMenu(null)
      }
    }
    if (expandedMenu) {
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedMenu])

  const ITEMS = [
    {
      id: 'home',
      label: 'Home',
      ariaLabel: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      activeIcon: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: onHome,
    },
    {
      id: 'discover',
      label: 'Discover',
      ariaLabel: 'Discover',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      ),
      activeIcon: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#0a0a0f" />
        </svg>
      ),
      onClick: onDiscover,
    },
    {
      id: 'favorites',
      label: 'Watchlist',
      ariaLabel: 'Watchlist',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      activeIcon: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      onClick: onFavorites,
    },
    {
      id: 'command-center',
      label: 'Markets',
      ariaLabel: 'Market Tools',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      activeIcon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      subpages: [
        { id: 'fear-greed', label: 'Fear & Greed', onClick: onFearGreed },
        { id: 'heatmaps', label: 'Heatmaps', onClick: onHeatmaps },
        { id: 'bubbles', label: 'Bubbles', onClick: onBubbles },
        { id: 'gm-dashboard', label: 'GM Dashboard', onClick: onGMDashboard },
      ],
    },
    {
      id: 'more',
      label: 'More',
      ariaLabel: 'More Options',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      ),
      activeIcon: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      ),
      subpages: [
        { id: 'research-zone', label: 'Research Zone', onClick: onResearchZone },
        { id: 'ai-screener', label: 'AI Screener', onClick: onAIScreener },
        { id: 'roi-calculator', label: 'ROI Calculator', onClick: onROICalculator },
      ],
    },
  ]

  const handleItemClick = (item) => {
    if (item.subpages && item.subpages.length > 0) {
      setExpandedMenu(expandedMenu === item.id ? null : item.id)
    } else {
      item.onClick?.()
      setExpandedMenu(null)
    }
  }

  const handleSubpageClick = (subpage) => {
    subpage.onClick?.()
    setExpandedMenu(null)
  }

  const expandedItem = ITEMS.find(item => item.id === expandedMenu && item.subpages)
  const expandedItemIndex = expandedItem ? ITEMS.findIndex(i => i.id === expandedMenu) : -1

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation" ref={navRef}>
      {/* Dropdown menu - rendered above the nav bar */}
      {expandedItem && (
        <>
          {/* Backdrop overlay */}
          <div className="mobile-bottom-nav-backdrop" onClick={() => setExpandedMenu(null)} />
          <div
            className="mobile-bottom-nav-dropdown"
            style={{
              '--dropdown-x': `${(expandedItemIndex + 0.5) * 20}%`,
            }}
          >
            <div className="mobile-bottom-nav-dropdown-inner">
              {expandedItem.subpages.map((subpage) => (
                <button
                  key={subpage.id}
                  type="button"
                  className={`mobile-bottom-nav-dropdown-item ${activeId === subpage.id ? 'active' : ''}`}
                  onClick={() => handleSubpageClick(subpage)}
                >
                  {subpage.icon && (
                    <span className="mobile-bottom-nav-dropdown-emoji">{subpage.icon}</span>
                  )}
                  <span className="mobile-bottom-nav-dropdown-label">{subpage.label}</span>
                  {activeId === subpage.id && (
                    <span className="mobile-bottom-nav-dropdown-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mobile-bottom-nav-inner">
        {ITEMS.map((item) => {
          const isActive = activeId === item.id ||
            (item.subpages && item.subpages.some(sp => sp.id === activeId))
          const hasDropdown = item.subpages && item.subpages.length > 0
          const isExpanded = expandedMenu === item.id

          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''} ${hasDropdown ? 'has-dropdown' : ''}`}
              onClick={() => handleItemClick(item)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              aria-expanded={hasDropdown ? isExpanded : undefined}
              aria-haspopup={hasDropdown ? 'menu' : undefined}
            >
              <span className="mobile-bottom-nav-icon" aria-hidden>
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </span>
              <span className="mobile-bottom-nav-label">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
