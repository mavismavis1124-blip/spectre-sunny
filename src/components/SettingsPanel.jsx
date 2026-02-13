import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import { CURRENCY_LIST, LANGUAGE_LIST } from '../lib/currencyConfig'
import './SettingsPanel.css'

export default function SettingsPanel({ open, onClose, dayMode }) {
  const { t } = useTranslation()
  const { currency, setCurrency, language, setLanguage } = useCurrency()

  // Pending selections — nothing applies until user clicks Apply
  const [pendingCurrency, setPendingCurrency] = useState(currency)
  const [pendingLanguage, setPendingLanguage] = useState(language)

  // Sync pending state when panel opens or external values change
  useEffect(() => {
    if (open) {
      setPendingCurrency(currency)
      setPendingLanguage(language)
    }
  }, [open, currency, language])

  if (!open) return null

  const hasChanges = pendingCurrency !== currency || pendingLanguage !== language

  const handleApply = () => {
    if (pendingCurrency !== currency) setCurrency(pendingCurrency)
    if (pendingLanguage !== language) setLanguage(pendingLanguage)
    onClose()
  }

  return (
    <>
      <div className="settings-panel-backdrop" onClick={onClose} aria-hidden />
      <div className={`settings-panel${dayMode ? ' day-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h3 className="settings-panel-title">{t('settings.title')}</h3>
          <button className="settings-panel-close" onClick={onClose} aria-label={t('settings.close')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-section">
          <label className="settings-section-label">{t('settings.currency')}</label>
          <div className="settings-currency-grid">
            {CURRENCY_LIST.map((c) => (
              <button
                key={c.code}
                className={`settings-option-btn${pendingCurrency === c.code ? ' active' : ''}`}
                onClick={() => setPendingCurrency(c.code)}
              >
                <span className="settings-option-flag">{c.flag}</span>
                <span className="settings-option-code">{c.code}</span>
                <span className="settings-option-symbol">{c.symbol}</span>
              </button>
            ))}
          </div>
          <p className="settings-note">{t('settings.currencyNote')}</p>
        </div>

        <div className="settings-divider" />

        <div className="settings-section">
          <label className="settings-section-label">{t('settings.language')}</label>
          <div className="settings-language-grid">
            {LANGUAGE_LIST.map((l) => (
              <button
                key={l.code}
                className={`settings-option-btn lang${pendingLanguage === l.code ? ' active' : ''}`}
                onClick={() => setPendingLanguage(l.code)}
              >
                <span className="settings-option-flag">{l.flag}</span>
                <span className="settings-option-native">{l.nativeName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-divider" />

        <button
          className={`settings-apply-btn${hasChanges ? ' has-changes' : ''}`}
          onClick={handleApply}
          disabled={!hasChanges}
        >
          {t('settings.apply')}
        </button>
      </div>
    </>
  )
}
