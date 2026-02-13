/**
 * Monarch AI server logs viewer – fetches /api/monarch-logs and displays last N lines.
 */
import React, { useState, useEffect, useRef } from 'react'
import spectreIcons from '../icons/spectreIcons'
// Refresh icon: reuse timeframe (clock) for "refresh"
const refreshIcon = spectreIcons.timeframe
import './LogsPage.css'

const REFRESH_MS = 3000

export default function LogsPage({ onBack, title = 'Monarch AI Logs' }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/monarch-logs')
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const id = setInterval(fetchLogs, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (logs.length && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="logs-page">
      <header className="logs-page-header">
        <button type="button" className="logs-page-back" onClick={onBack} aria-label="Back">
          {spectreIcons.chevronLeft}
          <span>Back</span>
        </button>
        <h1 className="logs-page-title">{title}</h1>
        <button type="button" className="logs-page-refresh" onClick={() => { setLoading(true); fetchLogs(); }} aria-label="Refresh">
          {refreshIcon}
          <span>Refresh</span>
        </button>
      </header>
      <div className="logs-page-content" ref={containerRef}>
        {loading && logs.length === 0 && <div className="logs-page-loading">Loading logs…</div>}
        {error && <div className="logs-page-error">{error}</div>}
        <pre className="logs-page-pre">
          {logs.length === 0 && !loading && !error ? 'No Monarch logs yet. Use Monarch AI to generate activity.' : null}
          {logs.map((line, i) => (
            <div key={i} className={`logs-page-line ${line.includes('[error]') ? 'logs-page-line-error' : ''}`}>
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </pre>
      </div>
    </div>
  )
}
