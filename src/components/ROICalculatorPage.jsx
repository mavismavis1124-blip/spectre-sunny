/**
 * ROI Calculator subpage – full-page view for ROI to ATH calculator.
 * Opened from header % button (not left nav).
 */
import React from 'react'
import ROICalculator from './ROICalculator'
import './ROICalculatorPage.css'

const ROICalculatorPage = ({ dayMode = false, onBack }) => {
  return (
    <div className={`roi-calculator-page ${dayMode ? 'day-mode' : ''}`}>
      <div className="roi-calculator-page-header">
        <div className="roi-calculator-page-header-inner">
          {onBack && (
            <button
              type="button"
              className="roi-calculator-page-back"
              onClick={onBack}
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          )}
          <h1 className="roi-calculator-page-title">ROI to ATH</h1>
          <p className="roi-calculator-page-subtitle">
            Compare current price to all-time high and see what your amount would be at ATH.
          </p>
        </div>
      </div>

      <div className="roi-calculator-page-content">
        <ROICalculator embedded dayMode={dayMode} onClose={onBack} />
      </div>
    </div>
  )
}

export default ROICalculatorPage
