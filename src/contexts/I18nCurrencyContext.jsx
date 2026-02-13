import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import i18n from 'i18next'
import { CURRENCIES, LANGUAGES } from '../lib/currencyConfig'
import { fetchExchangeRates, getRate } from '../lib/exchangeRates'
import {
  formatPrice as fmtP,
  formatLargeNumber as fmtL,
  formatPriceShort as fmtPS,
  formatLargeNumberShort as fmtLS,
  getCurrencySymbol,
} from '../lib/formatCurrency'

const I18nCurrencyContext = createContext()

export function I18nCurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('spectre-currency') || 'USD'
  })
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('spectre-language') || 'en'
  })
  const [rates, setRates] = useState(null)

  // Fetch exchange rates on mount and every 15 min
  useEffect(() => {
    let interval
    const load = async () => {
      const r = await fetchExchangeRates()
      setRates(r)
    }
    load()
    interval = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const exchangeRate = useMemo(() => getRate(currency, rates), [currency, rates])

  const setCurrency = useCallback((code) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code)
      localStorage.setItem('spectre-currency', code)
    }
  }, [])

  const setLanguage = useCallback(async (code) => {
    if (LANGUAGES[code]) {
      setLanguageState(code)
      localStorage.setItem('spectre-language', code)
      // Lazy-load language if not English
      if (code !== 'en') {
        try {
          if (!i18n.hasResourceBundle(code, 'translation')) {
            const mod = await import(`../i18n/locales/${code}.json`)
            i18n.addResourceBundle(code, 'translation', mod.default)
          }
        } catch (err) {
          console.warn(`Failed to load language ${code}:`, err)
        }
      }
      i18n.changeLanguage(code)
      // Set document direction for RTL languages
      document.documentElement.dir = LANGUAGES[code].dir || 'ltr'
      document.documentElement.lang = code
    }
  }, [])

  // Load saved non-English language on initial mount
  useEffect(() => {
    const lang = LANGUAGES[language]
    if (lang) {
      document.documentElement.dir = lang.dir || 'ltr'
      document.documentElement.lang = language
    }
    if (language !== 'en') {
      ;(async () => {
        try {
          if (!i18n.hasResourceBundle(language, 'translation')) {
            const mod = await import(`../i18n/locales/${language}.json`)
            i18n.addResourceBundle(language, 'translation', mod.default)
          }
          i18n.changeLanguage(language)
        } catch (err) {
          console.warn(`Failed to load saved language ${language}:`, err)
          i18n.changeLanguage('en')
        }
      })()
    }
  }, [])

  const fmtPrice = useCallback((usdValue) => fmtP(usdValue, currency, exchangeRate), [currency, exchangeRate])
  const fmtLarge = useCallback((usdValue) => fmtL(usdValue, currency, exchangeRate), [currency, exchangeRate])
  const fmtPriceShort = useCallback((usdValue) => fmtPS(usdValue, currency, exchangeRate), [currency, exchangeRate])
  const fmtLargeShort = useCallback((usdValue) => fmtLS(usdValue, currency, exchangeRate), [currency, exchangeRate])

  const currencySymbol = getCurrencySymbol(currency)
  const currencyConfig = CURRENCIES[currency] || CURRENCIES.USD
  const languageConfig = LANGUAGES[language] || LANGUAGES.en

  const value = useMemo(() => ({
    currency,
    setCurrency,
    language,
    setLanguage,
    exchangeRate,
    rates,
    fmtPrice,
    fmtLarge,
    fmtPriceShort,
    fmtLargeShort,
    currencySymbol,
    currencyConfig,
    languageConfig,
  }), [currency, setCurrency, language, setLanguage, exchangeRate, rates, fmtPrice, fmtLarge, fmtPriceShort, fmtLargeShort, currencySymbol, currencyConfig, languageConfig])

  return (
    <I18nCurrencyContext.Provider value={value}>
      {children}
    </I18nCurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(I18nCurrencyContext)
export default I18nCurrencyContext
