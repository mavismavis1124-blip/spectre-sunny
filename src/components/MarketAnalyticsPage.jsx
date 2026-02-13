/**
 * MarketAnalyticsPage Component
 * Market analytics dashboard with Smart Money Pulse
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import SmartMoneyPulse from './SmartMoneyPulse'
import './MarketAnalyticsPage.css'

const MarketAnalyticsPage = ({ dayMode, onBack, marketMode = 'crypto' }) => {
  const { t } = useTranslation()
  const isStocks = marketMode === 'stocks'
  return (
    <div className={`market-analytics-page${dayMode ? ' day-mode' : ''}`}>
      <div className="market-analytics-header">
        <button className="market-analytics-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        <h1 className="market-analytics-title">{t('analytics.title')}</h1>
      </div>

      <div className="market-analytics-content">
        <SmartMoneyPulse />
      </div>
    </div>
  )
}

export default MarketAnalyticsPage
