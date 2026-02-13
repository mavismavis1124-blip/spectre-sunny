/**
 * MobileTabBar – Glass-morphism tab bar for subpage navigation
 * Used in Research Zone, Token pages, etc.
 * Floating pill design, touch-friendly
 */
import React from 'react'
import './MobileTabBar.css'

const MobileTabBar = ({
  tabs = [],
  activeTab,
  onTabChange,
  variant = 'default', // 'default' | 'compact' | 'pills'
  className = '',
}) => {
  if (!tabs.length) return null

  return (
    <div className={`mobile-tab-bar mobile-tab-bar--${variant} ${className}`}>
      <div className="mobile-tab-bar-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`mobile-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange?.(tab.id)}
            aria-label={tab.ariaLabel || tab.label}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.icon && (
              <span className="mobile-tab-icon" aria-hidden>
                {tab.icon}
              </span>
            )}
            <span className="mobile-tab-label">{tab.label}</span>
          </button>
        ))}
        {/* Active indicator pill */}
        <div
          className="mobile-tab-indicator"
          style={{
            '--tab-count': tabs.length,
            '--active-index': tabs.findIndex(t => t.id === activeTab),
          }}
        />
      </div>
    </div>
  )
}

export default MobileTabBar
