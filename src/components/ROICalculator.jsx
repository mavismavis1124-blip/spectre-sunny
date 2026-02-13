/**
 * ROI Calculator – current price vs ATH, amount input, value at ATH.
 * Opened from header % button. Uses CoinGecko search + coin market data.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { searchCoinsForROI, getCoinROIData } from '../services/coinGeckoApi'
import { useCurrency } from '../hooks/useCurrency'
import spectreIcons from '../icons/spectreIcons'
import './ROICalculator.css'

function formatROIPct(roi) {
  if (roi == null || Number.isNaN(roi)) return '—'
  const n = Number(roi)
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function formatAthDate(athDate) {
  if (!athDate) return ''
  try {
    const d = new Date(athDate)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch (_) {
    return ''
  }
}

function ROICalculator({ onClose, dayMode, embedded = false }) {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [coinData, setCoinData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(1000)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setSuggestions([])
      return
    }
    const list = await searchCoinsForROI(q)
    setSuggestions(list)
    setShowSuggestions(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(query), 200)
    return () => clearTimeout(t)
  }, [query, fetchSuggestions])

  const selectCoin = useCallback(async (item) => {
    if (!item?.id) return
    setSelected(item)
    setQuery(`${item.name || ''} (${item.symbol || ''})`)
    setShowSuggestions(false)
    setSuggestions([])
    setLoading(true)
    setCoinData(null)
    try {
      const data = await getCoinROIData(item.id)
      setCoinData(data)
    } catch (_) {
      setCoinData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showSuggestions) setShowSuggestions(false)
        else onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, showSuggestions])

  const currentPrice = coinData?.currentPrice
  const marketCap = coinData?.marketCap
  const athPrice = coinData?.athPrice
  const athDate = coinData?.athDate
  const roiPct = currentPrice != null && currentPrice > 0 && athPrice != null
    ? ((athPrice / currentPrice) - 1) * 100
    : null
  const amountNum = Number(amount) || 0
  const valueAtAth = roiPct != null && amountNum > 0
    ? amountNum * (1 + roiPct / 100)
    : null

  const isStablecoin = selected && ['USDT', 'USDC', 'DAI', 'BUSD'].includes(selected.symbol?.toUpperCase())

  const content = (
    <div className={`roi-calculator ${dayMode ? 'day-mode' : ''} ${embedded ? 'roi-calculator-embedded' : ''}`} role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : 'true'} aria-label="ROI Calculator">
      {!embedded && <div className="roi-calculator-scrim" onClick={onClose} aria-hidden />}
      <div className="roi-calculator-glass">
        <div className="roi-calculator-header">
          <h2 className="roi-calculator-title">
            <span className="roi-calculator-title-icon-ring" aria-hidden>
              <span className="roi-calculator-title-icon">{spectreIcons.trending}</span>
            </span>
            {t('roi.title')}
          </h2>
          {!embedded && (
            <button
              type="button"
              className="roi-calculator-close"
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="roi-calculator-body">
          <label className="roi-calculator-label">Project</label>
          <div className="roi-calculator-search-wrap">
            <span className="roi-calculator-search-icon" aria-hidden>{spectreIcons.search}</span>
            <input
              ref={inputRef}
              type="text"
              className="roi-calculator-input"
              placeholder="Search by name or symbol (e.g. Spectre, BTC)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="roi-suggestions"
              id="roi-project-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id="roi-suggestions"
                ref={listRef}
                className="roi-calculator-suggestions"
                role="listbox"
              >
                {suggestions.map((item, i) => (
                  <li
                    key={item.id || `roi-suggestion-${i}`}
                    role="option"
                    className="roi-calculator-suggestion-item"
                    onClick={() => selectCoin(item)}
                  >
                    <span className="roi-calculator-suggestion-name">{item.name ?? '—'}</span>
                    <span className="roi-calculator-suggestion-symbol">{item.symbol ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {loading && (
            <p className="roi-calculator-loading">{t('common.loading')}</p>
          )}

          {coinData && !loading && (
            <>
              {isStablecoin && (
                <p className="roi-calculator-muted">Stablecoins have no meaningful ROI to ATH.</p>
              )}
              {!isStablecoin && (
                <>
                  <div className="roi-calculator-stats">
                    <div className="roi-calculator-stat">
                      <span className="roi-calculator-stat-label">{t('roi.currentPrice')}</span>
                      <span className="roi-calculator-stat-value">{fmtPrice(currentPrice)}</span>
                      <span className="roi-calculator-stat-mcap">{t('common.marketCap')} {fmtLarge(marketCap)}</span>
                    </div>
                    <div className="roi-calculator-stat">
                      <span className="roi-calculator-stat-label">{t('common.ath')}</span>
                      <span className="roi-calculator-stat-value">{fmtPrice(athPrice)}</span>
                      {athDate && <span className="roi-calculator-stat-date">{formatAthDate(athDate)}</span>}
                    </div>
                  </div>
                  {roiPct != null && (
                    <div className="roi-calculator-roi-line">
                      <span className="roi-calculator-roi-label">{t('roi.roiPercent')}</span>
                      <span className="roi-calculator-roi-value">{formatROIPct(roiPct)}</span>
                    </div>
                  )}

                  <label className="roi-calculator-label">Your amount (USD)</label>
                  <input
                    type="number"
                    className="roi-calculator-amount"
                    min={0}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    aria-label="Amount in USD to calculate ROI"
                  />
                  {amountNum > 0 && (
                    <div className="roi-calculator-result">
                      <div className="roi-calculator-result-row">
                        <span className="roi-calculator-result-label">You add now</span>
                        <span className="roi-calculator-result-amount">{fmtPrice(amountNum)}</span>
                      </div>
                      {valueAtAth != null && (
                        <>
                          <div className="roi-calculator-result-row roi-calculator-result-row-ath">
                            <span className="roi-calculator-result-label">Value at ATH</span>
                            <span className="roi-calculator-result-value">{fmtPrice(valueAtAth)}</span>
                          </div>
                          <div className="roi-calculator-result-pct">{formatROIPct(roiPct)} ROI</div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!coinData && !loading && selected && !isStablecoin && (
            <p className="roi-calculator-muted">No ATH data for this project.</p>
          )}
        </div>
      </div>
    </div>
  )

  if (embedded) return content
  if (typeof document === 'undefined' || !document.body) return null
  try {
    return createPortal(content, document.body)
  } catch (err) {
    console.error('ROICalculator portal error:', err)
    return null
  }
}

export default ROICalculator
