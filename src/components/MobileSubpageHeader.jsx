/**
 * MobileSubpageHeader - Navigation header for subpages on mobile
 * Shows back button, title, and optional actions
 */
import React from 'react'
import './MobileSubpageHeader.css'

const MobileSubpageHeader = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions = [], // [{icon, label, onClick}]
  transparent = false,
  className = '',
}) => {
  return (
    <header className={`mobile-subpage-header ${transparent ? 'transparent' : ''} ${className}`}>
      <div className="mobile-subpage-header-inner">
        {/* Back button */}
        {onBack && (
          <button
            type="button"
            className="mobile-subpage-back"
            onClick={onBack}
            aria-label={backLabel}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="mobile-subpage-back-label">{backLabel}</span>
          </button>
        )}

        {/* Title area */}
        <div className="mobile-subpage-title-area">
          <h1 className="mobile-subpage-title">{title}</h1>
          {subtitle && <span className="mobile-subpage-subtitle">{subtitle}</span>}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mobile-subpage-actions">
            {actions.map((action, i) => (
              <button
                key={i}
                type="button"
                className="mobile-subpage-action"
                onClick={action.onClick}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

export default MobileSubpageHeader
