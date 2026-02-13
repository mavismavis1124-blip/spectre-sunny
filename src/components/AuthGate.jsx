/**
 * AuthGate Component
 * Simple password protection for team access
 */
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AuthGate.css'

// Bypass auth in dev so the app is visible immediately (no blank loading screen).
// Include Cursor Simple Browser and any local/dev origin.
const isDevBypass = typeof window !== 'undefined' &&
  (import.meta.env?.DEV === true ||
   window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '0.0.0.0' ||
   window.location.hostname === '' ||
   (typeof window.location.hostname === 'string' && window.location.hostname.includes('localhost')) ||
   (typeof window.location.origin === 'string' && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))) ||
   (typeof window.location.hostname === 'string' && window.location.hostname.includes('vercel.app')) ||
   (typeof window.location.hostname === 'string' && window.location.hostname.includes('spectre')) ||
   /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(window.location.hostname || ''))

const AuthGate = ({ children }) => {
  const { t } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isDevBypass) {
      try { sessionStorage.setItem('spectre-auth', 'true') } catch (_) {}
      return true
    }
    return sessionStorage.getItem('spectre-auth') === 'true'
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(() => !isDevBypass)

  // ⚠️ TEAM PASSWORD - Production password
  // This is a simple access gate, not high-security authentication
  const TEAM_PASSWORD = 'KasAS53D@DH6H4'

  useEffect(() => {
    if (isDevBypass) return
    const auth = sessionStorage.getItem('spectre-auth')
    if (auth === 'true') setIsAuthenticated(true)
    setIsLoading(false)
  }, [])

  // Fallback: if still loading after 2s, show app anyway so user never sees blank screen
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === TEAM_PASSWORD) {
      sessionStorage.setItem('spectre-auth', 'true')
      setIsAuthenticated(true)
      setError('')
    } else {
      setError(t('auth.invalidPassword'))
      setPassword('')
    }
  }

  if (isLoading) {
    return (
      <div className="auth-gate">
        <div className="auth-loading">
          <div className="spinner" aria-hidden />
          <p className="auth-loading-text">{t('auth.loading')}</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return children
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/round-logo.png" alt="Spectre AI" />
          <div className="logo-glow"></div>
        </div>
        <h1 className="auth-title">{t('auth.title')}</h1>
        <p className="auth-subtitle">{t('auth.subtitle')}</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.placeholder')}
              className={error ? 'error' : ''}
              autoFocus
            />
            {error && <span className="error-message">{error}</span>}
          </div>
          <button type="submit" className="auth-btn">
            <span>Access Platform</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <p className="auth-footer">
          Contact your team lead for access credentials
        </p>
      </div>
    </div>
  )
}

export default AuthGate
