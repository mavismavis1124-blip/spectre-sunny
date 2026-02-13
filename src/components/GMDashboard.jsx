/**
 * GM full-screen zen dashboard: greeting, time/date, weather, top 5 crypto, top 5 stocks, top 5 news.
 * Glass style, rotating backgrounds. Close via X or Escape.
 */
import React, { useState, useEffect, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { getMajorTokenPrices } from '../services/coinGeckoApi'
import { useCurrency } from '../hooks/useCurrency'
import './GMDashboard.css'

// Isolated clock component - prevents full dashboard re-render every second
const GMClock = memo(({ name }) => {
  const { t } = useTranslation()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hour = time.getHours()
  const n = (name || '').trim() || 'there'
  let greeting
  if (hour >= 5 && hour < 12) greeting = t('gmDashboard.goodMorning', { name: n })
  else if (hour >= 12 && hour < 17) greeting = t('gmDashboard.goodAfternoon', { name: n })
  else if (hour >= 17 && hour < 22) greeting = t('gmDashboard.goodEvening', { name: n })
  else greeting = t('gmDashboard.goodNight', { name: n })

  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <h1 className="gm-dashboard-greeting">{greeting}</h1>
      <div className="gm-dashboard-glass gm-dashboard-time">
        <div className="gm-dashboard-time-value">{timeStr}</div>
        <div className="gm-dashboard-time-date">{dateStr}</div>
      </div>
    </>
  )
})

const TOP_CRYPTO = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP']
const TOP_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta' },
]

function getGreeting(hour, name, t) {
  const n = (name || '').trim() || 'there'
  if (hour >= 5 && hour < 12) return t('gmDashboard.goodMorning', { name: n })
  if (hour >= 12 && hour < 17) return t('gmDashboard.goodAfternoon', { name: n })
  if (hour >= 17 && hour < 22) return t('gmDashboard.goodEvening', { name: n })
  return t('gmDashboard.goodNight', { name: n })
}

function formatTimeAgo(publishedOn, t) {
  if (!publishedOn) return ''
  const sec = Math.floor(Date.now() / 1000) - (typeof publishedOn === 'number' ? publishedOn : parseInt(publishedOn, 10))
  if (sec < 60) return t ? t('time.justNow') : 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}${t ? t('time.minutes') : 'm'} ${t ? t('time.ago') : 'ago'}`
  if (sec < 86400) return `${Math.floor(sec / 3600)}${t ? t('time.hours') : 'h'} ${t ? t('time.ago') : 'ago'}`
  return `${Math.floor(sec / 86400)}${t ? t('time.days') : 'd'} ${t ? t('time.ago') : 'ago'}`
}

/** Open-Meteo WMO weather code → short label */
function getWeatherLabel(code, t) {
  if (code == null) return ''
  const c = Number(code)
  if (c === 0) return t ? t('gmDashboard.weatherClear') : 'Clear'
  if (c >= 1 && c <= 3) return t ? t('gmDashboard.weatherCloudy') : 'Cloudy'
  if (c === 45 || c === 48) return t ? t('gmDashboard.weatherFog') : 'Fog'
  if (c >= 51 && c <= 67) return t ? t('gmDashboard.weatherRain') : 'Rain'
  if (c >= 71 && c <= 77) return t ? t('gmDashboard.weatherSnow') : 'Snow'
  if (c >= 80 && c <= 82) return t ? t('gmDashboard.weatherShowers') : 'Showers'
  if (c >= 95 && c <= 99) return t ? t('gmDashboard.weatherStorm') : 'Storm'
  return t ? t('gmDashboard.weatherClear') : 'Clear'
}

const AMBIENT_FREQ = 220
const AMBIENT_GAIN = 0.08

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1920&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
]
const DEFAULT_WEATHER = { location: 'New York', temp: 10, high: 12, low: 8, code: 0 }

const MOCK_NEWS = [
  { id: 'mock-1', title: 'Bitcoin tests $78K support as markets correct', url: '#', source: 'Live', publishedOn: Math.floor(Date.now() / 1000) },
  { id: 'mock-2', title: 'Ethereum upgrade set to reduce gas fees by 90% in Q2', url: '#', source: 'The Block', publishedOn: Math.floor(Date.now() / 1000) - 7200 },
  { id: 'mock-3', title: 'Solana network activity hits all-time high amid meme coin surge', url: '#', source: 'Decrypt', publishedOn: Math.floor(Date.now() / 1000) - 14400 },
  { id: 'mock-4', title: 'SEC delays decision on spot Ethereum ETFs to May', url: '#', source: 'Reuters', publishedOn: Math.floor(Date.now() / 1000) - 21600 },
  { id: 'mock-5', title: 'Stablecoin supply grows 12% as crypto markets rally', url: '#', source: 'CryptoCompare', publishedOn: Math.floor(Date.now() / 1000) - 3600 },
]

function GMDashboard({ profile, onClose }) {
  const { t } = useTranslation()
  const { fmtPrice } = useCurrency()
  // Time state moved to GMClock component to prevent full dashboard re-renders
  const [weather, setWeather] = useState(() => ({ ...DEFAULT_WEATHER }))
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [news, setNews] = useState([])
  const [stockPrices, setStockPrices] = useState(() => ({
    AAPL: { price: 227.5, change: 0.3 },
    MSFT: { price: 418.2, change: -0.2 },
    GOOGL: { price: 170.1, change: 0.5 },
    AMZN: { price: 178.4, change: -0.1 },
    META: { price: 518.0, change: 0.8 },
  }))
  const [bgIndex, setBgIndex] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const audioContextRef = React.useRef(null)
  const oscillatorRef = React.useRef(null)
  const gainNodeRef = React.useRef(null)

  const [cryptoPrices, setCryptoPrices] = useState({})
  const name = profile?.name || 'there'

  // Time interval moved to GMClock component

  useEffect(() => {
    let cancelled = false
    const fetchCrypto = () => {
      getMajorTokenPrices(TOP_CRYPTO)
        .then((map) => {
          if (!cancelled && map && typeof map === 'object') setCryptoPrices(map)
        })
        .catch(() => {})
    }
    fetchCrypto()
    const interval = setInterval(fetchCrypto, 45 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    BG_IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    return () => {
      try {
        const osc = oscillatorRef.current
        if (osc) osc.stop()
      } catch (_) {}
      oscillatorRef.current = null
      gainNodeRef.current = null
    }
  }, [])

  useEffect(() => {
    const cycle = setInterval(() => {
      setBgIndex((i) => (i + 1) % BG_IMAGES.length)
    }, 12000)
    return () => clearInterval(cycle)
  }, [])

  useEffect(() => {
    let cancelled = false
    const defaultCoords = { lat: 40.71, lon: -74.01 }
    const applyWeather = (data, locationName) => {
      if (cancelled) return
      setWeather({
        location: locationName || data?.location || '—',
        temp: Math.round(data?.temp ?? 0),
        high: Math.round(data?.high ?? 0),
        low: Math.round(data?.low ?? 0),
        code: data?.code ?? 0,
      })
    }
    const stopLoading = () => {
      if (!cancelled) setWeatherLoading(false)
    }
    const fetchWeatherFromServer = (lat, lon) => {
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (cancelled) return
          if (data) applyWeather(data, data.location)
          else applyWeather({ ...DEFAULT_WEATHER }, DEFAULT_WEATHER.location)
        })
        .catch(() => applyWeather({ ...DEFAULT_WEATHER }, DEFAULT_WEATHER.location))
        .finally(stopLoading)
    }
    const timeoutId = setTimeout(() => {
      if (cancelled) return
      setWeatherLoading(false)
      setWeather((w) => w ?? { ...DEFAULT_WEATHER })
    }, 12000)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => fetchWeatherFromServer(p.coords.latitude, p.coords.longitude),
        () => fetchWeatherFromServer(defaultCoords.lat, defaultCoords.lon),
        { timeout: 6000, maximumAge: 300000 }
      )
    } else {
      fetchWeatherFromServer(defaultCoords.lat, defaultCoords.lon)
    }
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchNews = () => {
      fetch('/api/news?lang=EN&limit=8')
        .then((r) => r.ok ? r.json() : {})
        .then((json) => {
          if (cancelled) return
          const raw = Array.isArray(json?.Data) ? json.Data : []
          const list = raw.slice(0, 8).map((item) => ({
            id: String(item.id ?? item.guid ?? Math.random()),
            title: item.title || '',
            url: item.url || item.guid || '#',
            source: (item.source_info && item.source_info.name) || item.source || 'Crypto',
            publishedOn: item.published_on ?? item.publishedOn ?? 0,
          }))
          setNews(list)
        })
        .catch(() => {})
    }
    fetchNews()
    const interval = setInterval(fetchNews, 2 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/binance-ticker')
      .then((r) => r.ok ? r.json() : [])
      .then((arr) => {
        if (cancelled || !Array.isArray(arr)) return
        const bySymbol = {}
        arr.forEach((t) => {
          if (t.symbol && TOP_STOCKS.some((s) => s.symbol === t.symbol)) {
            bySymbol[t.symbol] = { price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent) || 0 }
          }
        })
        if (Object.keys(bySymbol).length > 0) setStockPrices(bySymbol)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.()
    },
    [onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Time display moved to GMClock component
  const displayNews = news.length > 0 ? news : MOCK_NEWS
  const btcPriceRaw = cryptoPrices?.BTC?.price
  const btcPriceStr = btcPriceRaw != null && !Number.isNaN(Number(btcPriceRaw)) ? fmtPrice(btcPriceRaw) : null
  const firstHeadline = btcPriceStr
    ? { id: 'live-btc', title: `Bitcoin at ${btcPriceStr}`, url: '#', source: 'Live', publishedOn: Math.floor(Date.now() / 1000) }
    : displayNews[0]
  const restNews = btcPriceStr ? displayNews.slice(0, 4) : displayNews.slice(1, 5)
  const newsToShow = [firstHeadline, ...restNews]

  const toggleSound = useCallback(() => {
    if (soundOn) {
      try {
        const osc = oscillatorRef.current
        if (osc) osc.stop()
      } catch (_) {}
      oscillatorRef.current = null
      gainNodeRef.current = null
      setSoundOn(false)
    } else {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) {
          setSoundOn(false)
          return
        }
        let ctx = audioContextRef.current
        if (!ctx) {
          ctx = new AudioContextClass()
          audioContextRef.current = ctx
        }
        if (ctx.state === 'suspended') ctx.resume()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(AMBIENT_FREQ, ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(AMBIENT_GAIN, ctx.currentTime + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime)
        oscillatorRef.current = osc
        gainNodeRef.current = gain
        setSoundOn(true)
      } catch (e) {
        console.warn('Ambient sound failed:', e)
        setSoundOn(false)
      }
    }
  }, [soundOn])

  const content = (
    <div className="gm-dashboard" role="dialog" aria-modal="true" aria-label="GM Dashboard">
      <div className="gm-dashboard-bg-base" aria-hidden />
      <div className="gm-dashboard-bg-wrap">
        {BG_IMAGES.map((_, i) => (
          <div
            key={i}
            className={`gm-dashboard-bg gm-dashboard-bg-${i}`}
            aria-hidden
            style={{ backgroundImage: `url(${BG_IMAGES[i]})`, opacity: i === bgIndex ? 1 : 0 }}
          />
        ))}
      </div>
      <div className="gm-dashboard-scrim" aria-hidden />

      <div className="gm-dashboard-top-actions gm-dashboard-glass">
        <button
          type="button"
          className="gm-dashboard-close gm-dashboard-escape-btn"
          onClick={onClose}
          aria-label={t('gmDashboard.closeDashboard')}
          title={t('gmDashboard.escKey')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="gm-dashboard-btn-label">Esc</span>
        </button>
        <button
          type="button"
          className="gm-dashboard-sound-toggle"
          onClick={toggleSound}
          aria-label={soundOn ? t('gmDashboard.soundOff') : t('gmDashboard.soundOn')}
          title={soundOn ? t('gmDashboard.soundOff') : t('gmDashboard.soundOn')}
        >
          {soundOn ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
          <span className="gm-dashboard-btn-label">{soundOn ? t('gmDashboard.soundOn') : t('gmDashboard.soundOff')}</span>
        </button>
      </div>

      <div className="gm-dashboard-inner">
        {/* GMClock is isolated to prevent full dashboard re-renders every second */}
        <GMClock name={name} />

        <div className="gm-dashboard-cards">
          <div className="gm-dashboard-glass gm-dashboard-weather">
            {weatherLoading ? (
              <span className="gm-dashboard-weather-loading">{t('common.loading')}</span>
            ) : weather ? (
              <>
                <span className="gm-dashboard-weather-location">{weather.location} - {weather.temp}°C</span>
                <span className="gm-dashboard-weather-range">{weather.high}° / {weather.low}°</span>
              </>
            ) : (
              <span className="gm-dashboard-weather-loading">{DEFAULT_WEATHER.location} - {DEFAULT_WEATHER.temp}°C</span>
            )}
          </div>
        </div>

        <div className="gm-dashboard-row">
          <div className="gm-dashboard-glass gm-dashboard-block">
            <h2 className="gm-dashboard-block-title">{t('gmDashboard.top5Crypto')}</h2>
            <ul className="gm-dashboard-list">
              {TOP_CRYPTO.map((sym) => {
                const p = cryptoPrices?.[sym]
                const price = p?.price ?? p?.priceUSD
                const change = p?.change ?? p?.change24 ?? 0
                return (
                  <li key={sym} className="gm-dashboard-list-item">
                    <span className="gm-dashboard-symbol">{sym}</span>
                    <span className="gm-dashboard-price">{price != null ? fmtPrice(price) : '—'}</span>
                    <span className={`gm-dashboard-change ${change >= 0 ? 'up' : 'down'}`}>
                      {price != null ? `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="gm-dashboard-glass gm-dashboard-block">
            <h2 className="gm-dashboard-block-title">{t('gmDashboard.top5Stocks')}</h2>
            <ul className="gm-dashboard-list">
              {TOP_STOCKS.map(({ symbol, name: stockName }) => {
                const p = stockPrices?.[symbol]
                const price = p?.price
                const change = p?.change ?? 0
                return (
                  <li key={symbol} className="gm-dashboard-list-item">
                    <span className="gm-dashboard-symbol">{symbol}</span>
                    <span className="gm-dashboard-price">{price != null ? fmtPrice(price) : '—'}</span>
                    <span className={`gm-dashboard-change ${change >= 0 ? 'up' : 'down'}`}>
                      {price != null ? `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="gm-dashboard-glass gm-dashboard-news">
          <h2 className="gm-dashboard-block-title">{t('gmDashboard.top5News')}</h2>
          <ul className="gm-dashboard-news-list">
            {newsToShow.map((item) => (
              <li key={item.id} className="gm-dashboard-news-item">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="gm-dashboard-news-link">
                  <span className="gm-dashboard-news-title">{item.title || t('gmDashboard.untitled')}</span>
                  <span className="gm-dashboard-news-meta">
                    {[item.source, formatTimeAgo(item.publishedOn, t)].filter(Boolean).join(' · ')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="gm-dashboard-footer">
          <p className="gm-dashboard-footer-text">{t('gmDashboard.footerText')}</p>
          <div className="gm-dashboard-glass gm-dashboard-footer-brand">Spectre AI</div>
        </div>
      </div>
    </div>
  )

  return content
}

export default GMDashboard
