/**
 * Spectre AI Trading Platform - Main entry point
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './i18n'
import './index.css'
import './styles/app-store-ready.css'
import './styles/mobile-2026.css'
import './styles/performance.css'

class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App failed to render:', error, info)
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error
      const message = err?.message || String(err)
      const stack = err?.stack || ''
      return (
        <div style={{
          minHeight: '100vh',
          background: '#fef3c7',
          color: '#1f2937',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          zIndex: 99999,
        }}>
          <h1 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#374151', marginBottom: 8 }}>
            The app failed to load. Try refreshing the page.
          </p>
          {message && (
            <pre style={{ fontSize: 12, background: 'rgba(0,0,0,0.06)', padding: 12, borderRadius: 8, maxWidth: '90%', overflow: 'auto', marginBottom: 16, textAlign: 'left' }}>
              {message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#8B5CF6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Document visibility tracking for animation control
document.addEventListener('visibilitychange', () => {
  document.body.setAttribute('data-document-hidden', String(document.hidden))
})
// Initialize state
document.body.setAttribute('data-document-hidden', 'false')

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0c;color:#fff;font-family:system-ui">No #root element. Check index.html.</div>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <AppErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AppErrorBoundary>
      </React.StrictMode>
    )
  } catch (err) {
    console.error('App failed to mount:', err)
    rootEl.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fef3c7;color:#1f2937;font-family:system-ui;padding:24;text-align:center;">
      <h1 style="margin-bottom:8;">Failed to start app</h1>
      <p style="margin-bottom:16;">${(err && err.message) || String(err)}</p>
      <button onclick="location.reload()" style="padding:12px 24px;background:#8B5CF6;border:none;border-radius:8;color:#fff;font-weight:600;cursor:pointer;">Reload</button>
    </div>`
  }
}
