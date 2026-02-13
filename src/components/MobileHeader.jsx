/**
 * MobileHeader – 2026 Mobile Edition
 * Replaces the desktop header on mobile with:
 * - Left: Hamburger menu → navigation dropdown
 * - Center: Spectre AI logo
 * - Right: Tools dropdown (cinema/terminal, crypto/stocks, day/night, search)
 *
 * Clean, Apple-level design with glass morphism dropdowns
 * NO emoticons – SVG icons only
 */
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { LANGUAGE_LIST } from '../lib/currencyConfig'
import './MobileHeader.css'

/* ── Compact SVG icon components ── */
const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', strokeWidth = 1.8, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}
    {children}
  </svg>
)

const NAV_ICONS = {
  'research-platform': (
    <Icon><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>
  ),
  discover: (
    <Icon><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></Icon>
  ),
  watchlists: (
    <Icon><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>
  ),
  'research-zone': (
    <Icon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></Icon>
  ),
  'ai-screener': (
    <Icon><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h0" /><path d="M15 9h0" /><path d="M9 15c.6.6 1.5 1 3 1s2.4-.4 3-1" /></Icon>
  ),
  'fear-greed': (
    <Icon><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /><path d="M12 6v6l4 2" /></Icon>
  ),
  heatmaps: (
    <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>
  ),
  bubbles: (
    <Icon><circle cx="12" cy="12" r="4" /><circle cx="19" cy="7" r="3" /><circle cx="6" cy="18" r="2.5" /></Icon>
  ),
  'gm-dashboard': (
    <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></Icon>
  ),
  'roi-calculator': (
    <Icon><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Icon>
  ),
  'social-zone': (
    <Icon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Icon>
  ),
  glossary: (
    <Icon><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></Icon>
  ),
  'search-engine': (
    <Icon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>
  ),
  'ai-media-center': (
    <Icon><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></Icon>
  ),
  'x-dash': (
    <Icon><path d="M4 4l16 16" /><path d="M20 4L4 20" /></Icon>
  ),
  'x-bubbles': (
    <Icon><circle cx="12" cy="12" r="4" /><circle cx="19" cy="6" r="3" /><circle cx="5" cy="18" r="2.5" /><path d="M4 4l3 3" /><path d="M17 17l3 3" /></Icon>
  ),
  'ai-charts': (
    <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>
  ),
  'ai-charts-lab': (
    <Icon><path d="M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.869 1.45h12.822a1 1 0 00.87-1.45l-5.069-10.127A2 2 0 0114 9.527V2" /><path d="M8.5 2h7" /></Icon>
  ),
  categories: (
    <Icon><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>
  ),
  'ai-market-analysis': (
    <Icon><path d="M21 21H4.6c-.56 0-.84 0-1.05-.11a1 1 0 01-.44-.44C3 20.24 3 19.96 3 19.4V3" /><path d="M7 14l4-4 4 4 6-6" /></Icon>
  ),
  'market-analytics': (
    <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>
  ),
  'user-dashboard': (
    <Icon><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>
  ),
  'structure-guide': (
    <Icon><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon>
  ),
}

const MobileHeader = ({
  appDisplayMode,
  onAppDisplayModeChange,
  marketMode,
  onMarketModeChange,
  dayMode,
  onDayModeChange,
  onSearchOpen,
  onVoiceSearch,
  onLogoClick,
  onPageChange,
  currentPage,
  profile,
}) => {
  const { t } = useTranslation()
  const { language, setLanguage } = useCurrency()
  const [leftMenuOpen, setLeftMenuOpen] = useState(false)
  const [rightMenuOpen, setRightMenuOpen] = useState(false)
  const [langPickerOpen, setLangPickerOpen] = useState(false)
  const headerRef = useRef(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setLeftMenuOpen(false)
        setRightMenuOpen(false)
      }
    }
    if (leftMenuOpen || rightMenuOpen) {
      document.addEventListener('touchstart', handleClick)
      document.addEventListener('mousedown', handleClick)
    }
    return () => {
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [leftMenuOpen, rightMenuOpen])

  // Close menus on page change
  useEffect(() => {
    setLeftMenuOpen(false)
    setRightMenuOpen(false)
  }, [currentPage])

  // Reset lang picker when settings dropdown closes
  useEffect(() => {
    if (!rightMenuOpen) setLangPickerOpen(false)
  }, [rightMenuOpen])

  const NAV_ITEMS = [
    // Core
    { id: 'research-platform', label: 'Home' },
    { id: 'discover', label: 'Discover' },
    { id: 'watchlists', label: 'Watchlists' },
    { id: 'search-engine', label: 'Search Engine' },
    { id: 'categories', label: 'Categories' },
    // Research & AI
    { id: 'research-zone', label: 'Research Zone', section: 'Research & AI' },
    { id: 'ai-screener', label: 'AI Screener' },
    { id: 'ai-market-analysis', label: 'AI Market Analysis' },
    { id: 'ai-media-center', label: 'AI Media Center' },
    // Charts & Markets
    { id: 'ai-charts', label: 'AI Charts', section: 'Charts & Markets' },
    { id: 'ai-charts-lab', label: 'AI Charts Lab' },
    { id: 'heatmaps', label: 'Heatmaps' },
    { id: 'bubbles', label: 'Bubbles' },
    { id: 'fear-greed', label: 'Fear & Greed' },
    { id: 'market-analytics', label: 'Market Analytics' },
    // Social & Tools
    { id: 'social-zone', label: 'Social Zone', section: 'Social & Tools' },
    { id: 'x-dash', label: 'X Dash' },
    { id: 'x-bubbles', label: 'X Bubbles' },
    { id: 'gm-dashboard', label: 'GM Dashboard' },
    { id: 'roi-calculator', label: 'ROI Calculator' },
    // Reference
    { id: 'glossary', label: 'Glossary', section: 'Reference' },
    { id: 'structure-guide', label: 'Structure Guide' },
    { id: 'user-dashboard', label: 'User Dashboard' },
  ]

  return (
    <header className="mobile-header" ref={headerRef}>
      {/* Backdrop when menu open */}
      {(leftMenuOpen || rightMenuOpen) && (
        <div
          className="mobile-header-backdrop"
          onClick={() => { setLeftMenuOpen(false); setRightMenuOpen(false) }}
        />
      )}

      <div className="mobile-header-inner">
        {/* Left: Hamburger */}
        <button
          type="button"
          className={`mobile-header-btn mobile-header-hamburger ${leftMenuOpen ? 'is-open' : ''}`}
          onClick={() => { setLeftMenuOpen(!leftMenuOpen); setRightMenuOpen(false) }}
          aria-label="Navigation menu"
          aria-expanded={leftMenuOpen}
        >
          <div className="mobile-header-hamburger-lines">
            <span />
            <span />
            <span />
          </div>
        </button>

        {/* Center: Logo */}
        <button
          className="mobile-header-logo"
          onClick={() => { onLogoClick?.(); setLeftMenuOpen(false); setRightMenuOpen(false) }}
          aria-label="Spectre AI Home"
        >
          <img
            src="/logo-text-dark.png"
            alt=""
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
          <span className="mobile-header-logo-text" style={{ display: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            Spectre AI
          </span>
        </button>

        {/* Right: Voice + Search + Tools */}
        <div className="mobile-header-right">
          {/* Voice Search */}
          <button
            type="button"
            className="mobile-header-btn mobile-header-voice"
            onClick={() => { onVoiceSearch?.(); setLeftMenuOpen(false); setRightMenuOpen(false) }}
            aria-label="Voice Search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Search */}
          <button
            type="button"
            className="mobile-header-btn mobile-header-search"
            onClick={() => { onSearchOpen?.(); setLeftMenuOpen(false); setRightMenuOpen(false) }}
            aria-label="Search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          <button
            type="button"
            className={`mobile-header-btn mobile-header-tools ${rightMenuOpen ? 'is-open' : ''}`}
            onClick={() => { setRightMenuOpen(!rightMenuOpen); setLeftMenuOpen(false) }}
            aria-label="Settings & Modes"
            aria-expanded={rightMenuOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Left Dropdown: Navigation */}
      {leftMenuOpen && (
        <div className="mobile-header-dropdown mobile-header-dropdown-left">
          <div className="mobile-header-dropdown-inner">
            <div className="mobile-header-dropdown-title">Navigate</div>
            <div className="mobile-header-nav-list">
              {NAV_ITEMS.map((item) => (
                <React.Fragment key={item.id}>
                  {item.section && (
                    <div className="mobile-header-nav-section">{item.section}</div>
                  )}
                  <button
                    type="button"
                    className={`mobile-header-nav-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => {
                      onPageChange?.(item.id)
                      setLeftMenuOpen(false)
                    }}
                  >
                    <span className="mobile-header-nav-icon">{NAV_ICONS[item.id]}</span>
                    <span className="mobile-header-nav-label">{item.label}</span>
                    {currentPage === item.id && (
                      <span className="mobile-header-nav-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right Dropdown: Mode Toggles */}
      {rightMenuOpen && (
        <div className="mobile-header-dropdown mobile-header-dropdown-right">
          <div className="mobile-header-dropdown-inner">
            <div className="mobile-header-dropdown-title">Settings</div>

            {/* Cinema / Terminal Toggle */}
            {onAppDisplayModeChange && (
              <div className="mobile-header-toggle-row">
                <div className="mobile-header-toggle-info">
                  <span className="mobile-header-toggle-icon">
                    {appDisplayMode === 'cinema' ? (
                      <Icon size={18}><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></Icon>
                    ) : (
                      <Icon size={18}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></Icon>
                    )}
                  </span>
                  <span className="mobile-header-toggle-label">
                    {appDisplayMode === 'cinema' ? 'Cinema Mode' : 'Terminal Mode'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`mobile-header-pill-toggle ${appDisplayMode === 'cinema' ? 'active' : ''}`}
                  onClick={() => onAppDisplayModeChange(appDisplayMode === 'terminal' ? 'cinema' : 'terminal')}
                  role="switch"
                  aria-checked={appDisplayMode === 'cinema'}
                  aria-label="Toggle cinema mode"
                >
                  <span className="mobile-header-pill-thumb" />
                  <span className="mobile-header-pill-label-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </span>
                  <span className="mobile-header-pill-label-right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="10 8 16 12 10 16 10 8" />
                    </svg>
                  </span>
                </button>
              </div>
            )}

            {/* Crypto / Stocks Toggle */}
            {onMarketModeChange && (
              <div className="mobile-header-toggle-row">
                <div className="mobile-header-toggle-info">
                  <span className="mobile-header-toggle-icon">
                    {marketMode === 'crypto' ? (
                      <Icon size={18} d="M12 2a10 10 0 100 20 10 10 0 000-20zM9.5 8h2a2.5 2.5 0 010 5h-2m0-5v8m0-3h3a2.5 2.5 0 010 5H9.5" />
                    ) : (
                      <Icon size={18}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></Icon>
                    )}
                  </span>
                  <span className="mobile-header-toggle-label">
                    {marketMode === 'crypto' ? 'Crypto' : 'Stocks'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`mobile-header-pill-toggle ${marketMode === 'stocks' ? 'active' : ''}`}
                  onClick={() => onMarketModeChange(marketMode === 'crypto' ? 'stocks' : 'crypto')}
                  role="switch"
                  aria-checked={marketMode === 'stocks'}
                  aria-label="Toggle market mode"
                >
                  <span className="mobile-header-pill-thumb" />
                  <span className="mobile-header-pill-label-left">B</span>
                  <span className="mobile-header-pill-label-right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    </svg>
                  </span>
                </button>
              </div>
            )}

            {/* Day / Night Toggle */}
            {onDayModeChange && (
              <div className="mobile-header-toggle-row">
                <div className="mobile-header-toggle-info">
                  <span className="mobile-header-toggle-icon">
                    {dayMode ? (
                      <Icon size={18}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></Icon>
                    ) : (
                      <Icon size={18} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    )}
                  </span>
                  <span className="mobile-header-toggle-label">
                    {dayMode ? 'Day Mode' : 'Night Mode'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`mobile-header-pill-toggle ${dayMode ? 'active' : ''}`}
                  onClick={() => onDayModeChange(!dayMode)}
                  role="switch"
                  aria-checked={dayMode}
                  aria-label="Toggle day mode"
                >
                  <span className="mobile-header-pill-thumb" />
                  <span className="mobile-header-pill-label-left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  </span>
                  <span className="mobile-header-pill-label-right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                    </svg>
                  </span>
                </button>
              </div>
            )}

            {/* Language Selector */}
            <div className="mobile-header-toggle-row mobile-header-lang-row">
              <button
                type="button"
                className="mobile-header-lang-trigger"
                onClick={() => setLangPickerOpen(!langPickerOpen)}
                aria-expanded={langPickerOpen}
              >
                <span className="mobile-header-toggle-icon">
                  <Icon size={18}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </Icon>
                </span>
                <span className="mobile-header-toggle-label">
                  {LANGUAGE_LIST.find(l => l.code === language)?.nativeName || 'English'}
                </span>
                <span className={`mobile-header-lang-chevron ${langPickerOpen ? 'open' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              {langPickerOpen && (
                <div className="mobile-header-lang-grid">
                  {LANGUAGE_LIST.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`mobile-header-lang-btn ${language === l.code ? 'active' : ''}`}
                      onClick={() => {
                        setLanguage(l.code)
                        setLangPickerOpen(false)
                      }}
                    >
                      <span className="mobile-header-lang-flag">{l.flag}</span>
                      <span className="mobile-header-lang-name">{l.nativeName}</span>
                      {language === l.code && (
                        <span className="mobile-header-lang-check">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Brief shortcut — scrolls to cinema AI brief on home */}
            {appDisplayMode === 'cinema' && currentPage === 'research-platform' && (
              <div className="mobile-header-toggle-row">
                <button
                  type="button"
                  className="mobile-header-brief-btn"
                  onClick={() => {
                    setRightMenuOpen(false)
                    // Scroll to the AI brief section
                    const briefEl = document.querySelector('.cab-container')
                    if (briefEl) briefEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  <span className="mobile-header-toggle-icon">
                    <Icon size={18}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </Icon>
                  </span>
                  <span className="mobile-header-toggle-label">{t('cinemaBrief.title')}</span>
                  <span className="mobile-header-brief-live">
                    <span className="mobile-header-brief-pulse" />
                    {t('ticker.live')}
                  </span>
                </button>
              </div>
            )}

            {/* Profile section */}
            <div className="mobile-header-profile-row">
              <div className="mobile-header-profile-avatar">
                {profile?.imageUrl ? (
                  <img src={profile.imageUrl} alt="" />
                ) : (
                  <span>{(profile?.name || 'T')[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="mobile-header-profile-info">
                <span className="mobile-header-profile-name">{profile?.name || 'Trader'}</span>
                <span className="mobile-header-profile-balance">$2,195</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default MobileHeader
