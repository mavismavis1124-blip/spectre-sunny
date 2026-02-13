/**
 * X Dash – Social media intelligence subpage (the alpha).
 * Heatmap of attention, trending tickers, mentions/new projects, sector momentum, sentiment.
 * Apple 4k style, design tokens, spectreIcons.
 */
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../hooks/useCurrency'
import spectreIcons from '../icons/spectreIcons'
import './XDashPage.css'

const TIME_OPTIONS = ['1H', '5H', '24H', '1W']

const SECTORS = [
  { id: 'stablecoins', labelKey: 'xDash.sectorStablecoins', level: 'low', icon: 'coin', mapX: 22, mapY: 28, mapZ: -24 },
  { id: 'ai', labelKey: 'xDash.sectorAI', level: 'high', icon: 'brain', mapX: 72, mapY: 22, mapZ: 12 },
  { id: 'nft', labelKey: 'xDash.sectorNFT', level: 'low', icon: 'image', mapX: 18, mapY: 68, mapZ: -12 },
  { id: 'l1', labelKey: 'xDash.sectorL1', level: 'low', icon: 'layer', mapX: 78, mapY: 58, mapZ: 0 },
  { id: 'rwa', labelKey: 'xDash.sectorRWA', level: 'high', icon: 'bank', mapX: 50, mapY: 48, mapZ: 22 },
  { id: 'pow', labelKey: 'xDash.sectorPoW', level: 'low', icon: 'mining', mapX: 32, mapY: 52, mapZ: -28 },
  { id: 'meme', labelKey: 'xDash.sectorMEME', level: 'low', icon: 'fire', mapX: 62, mapY: 72, mapZ: 6 },
  { id: 'defi', labelKey: 'xDash.sectorDeFi', level: 'hot', icon: 'whale', mapX: 48, mapY: 26, mapZ: 18 },
]

const TRENDING_TICKERS = [
  { symbol: 'SPECTRE', price: 1.92, change: 12.25, mentions: 56 },
  { symbol: 'PEPE', price: 0.000012, change: 8.5, mentions: 48 },
  { symbol: 'WIF', price: 2.14, change: -3.2, mentions: 42 },
  { symbol: 'BONK', price: 0.000023, change: 5.1, mentions: 38 },
]

const MENTIONS_ROWS = [
  { name: 'ETH', symbol: 'ETH', price: 4789.92, change1d: 12.25, mcap: 12 },
  { name: 'BTC', symbol: 'BTC', price: 32400.2, change1d: 3.4, mcap: 600 },
  { name: 'ETH', symbol: 'ETH', price: 1800.75, change1d: 5.25, mcap: 200 },
  { name: 'ADA', symbol: 'ADA', price: 0.55, change1d: 12.15, mcap: 18 },
  { name: 'XRP', symbol: 'XRP', price: 0.45, change1d: 7.8, mcap: 23 },
]

const SECTOR_MOMENTUM = [
  { rank: 12, name: 'MEME', mcap: '2.1B', change1d: 5.2, change1w: 12.4 },
  { rank: 13, name: 'DEFI', mcap: '18.2B', change1d: 3.1, change1w: 8.2 },
  { rank: 14, name: 'NFT', mcap: '1.2B', change1d: 2.8, change1w: 6.1 },
  { rank: 15, name: 'BLOCKCHAIN', mcap: '8.5B', change1d: 1.9, change1w: 4.3 },
  { rank: 16, name: 'STABLE', mcap: '140B', change1d: 0.1, change1w: 0.2 },
]

const HEATMAP_RANK_KEYS = ['xDash.top10', 'xDash.top11_20', 'xDash.top21_30', 'xDash.top31_40', 'xDash.top41_50']

function formatTime() {
  const d = new Date()
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const day = days[d.getDay()]
  const date = d.getDate()
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${day} ${date} ${h}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function XDashPage() {
  const { t } = useTranslation()
  const { fmtPrice, fmtLarge } = useCurrency()
  const [timeRange, setTimeRange] = useState('5H')
  const [heatmapRank, setHeatmapRank] = useState(0)
  const [zoomMode, setZoomMode] = useState(false)
  const [mentionsTab, setMentionsTab] = useState('new-projects') // 'mentions' | 'new-projects' | 'discovered'
  const [sentimentValue] = useState(0.09) // -1 to 1, display as gauge

  const sentimentPercent = useMemo(() => Math.round(sentimentValue * 100), [sentimentValue])
  const sentimentLabel = useMemo(() => {
    if (sentimentValue > 0.2) return t('xDash.positive')
    if (sentimentValue < -0.2) return t('xDash.negative')
    return t('xDash.neutral')
  }, [sentimentValue, t])

  return (
    <div className="xdash-page">
      {/* Hero – same Spectre glass as landing welcome widget */}
      <header className="xdash-hero">
        <div className="xdash-hero-inner">
          <div className="xdash-welcome-row">
            <h1 className="xdash-title">{t('xDash.title')}</h1>
            <span className="xdash-time">{formatTime()}</span>
          </div>
          <p className="xdash-tagline">{t('xDash.tagline')}</p>
          <div className="xdash-search-bar">
            <span className="xdash-search-icon">{spectreIcons.search}</span>
            <input type="text" className="xdash-search-input" placeholder={t('xDash.globalSearch')} aria-label={t('xDash.globalSearch')} />
            <button type="button" className="xdash-search-mic" aria-label={t('xDash.voiceSearch')}>{spectreIcons.mic}</button>
          </div>
        </div>
      </header>

      {/* Main grid: Heatmap + Trending */}
      <div className="xdash-grid">
        <section className="xdash-card xdash-heatmap-card">
          <div className="xdash-card-head">
            <h2 className="xdash-card-title">{t('xDash.heatmapAttention')}</h2>
            <div className="xdash-time-tabs">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`xdash-time-tab ${timeRange === t ? 'active' : ''}`}
                  onClick={() => setTimeRange(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="xdash-heatmap-controls">
            <button
              type="button"
              className={`xdash-zoom-btn ${zoomMode ? 'active' : ''}`}
              onClick={() => setZoomMode(!zoomMode)}
              title={t('xDash.zoomInMode')}
            >
              {spectreIcons.discover}
              <span>{t('xDash.zoomInMode')}</span>
            </button>
            <nav className="xdash-heatmap-breadcrumb" aria-label={t('xDash.rankRange')}>
              {HEATMAP_RANK_KEYS.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  className={`xdash-breadcrumb-item ${heatmapRank === i ? 'active' : ''}`}
                  onClick={() => setHeatmapRank(i)}
                >
                  {t(key)}
                </button>
              ))}
            </nav>
          </div>
          <div className="xdash-heatmap-viz" aria-label={t('xDash.heatmapAttention')}>
            <div className="xdash-heatmap-3d-stage">
              {SECTORS.map((s) => {
                const scale = 0.65 + (s.mapZ + 30) / 100
                return (
                  <div
                    key={s.id}
                    className={`xdash-sector-bubble xdash-sector--${s.level}`}
                    title={t(s.labelKey)}
                    style={{
                      left: `${s.mapX}%`,
                      top: `${s.mapY}%`,
                      transform: `translate(-50%, -50%) translateZ(${s.mapZ}px) scale(${scale})`,
                    }}
                  >
                    <span className="xdash-sector-label">{t(s.labelKey)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="xdash-card xdash-trending-card">
          <div className="xdash-card-head">
            <h2 className="xdash-card-title">{t('xDash.trendingTickers')}</h2>
            <div className="xdash-time-tabs">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`xdash-time-tab ${timeRange === t ? 'active' : ''}`}
                  onClick={() => setTimeRange(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ul className="xdash-trending-list">
            {TRENDING_TICKERS.map((row) => (
              <li key={row.symbol} className="xdash-trending-row">
                <div className="xdash-trending-ticker">
                  <span className="xdash-trending-symbol">{row.symbol}</span>
                  <span className="xdash-trending-price">{fmtPrice(row.price)}</span>
                  <span className={`xdash-trending-change ${row.change >= 0 ? 'positive' : 'negative'}`}>
                    {row.change >= 0 ? '+' : ''}{row.change}%
                  </span>
                </div>
                <div className="xdash-trending-influencers">
                  <span className="xdash-influencer-avatars">
                    <span className="xdash-avatar" /><span className="xdash-avatar" /><span className="xdash-avatar" />
                    <span className="xdash-avatar-plus">+</span>
                  </span>
                </div>
                <span className="xdash-trending-mentions">{row.mentions} {t('xDash.mentions')}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Second row: Mentions / Sector Momentum / Sentiment */}
      <div className="xdash-grid xdash-grid--bottom">
        <section className="xdash-card xdash-mentions-card">
          <div className="xdash-tabs">
            {['mentions', 'new-projects', 'discovered'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`xdash-tab ${mentionsTab === tab ? 'active' : ''}`}
                onClick={() => setMentionsTab(tab)}
              >
                {tab === 'mentions' ? t('xDash.tabMentions') : tab === 'new-projects' ? t('xDash.tabNewProjects') : t('xDash.tabDiscovered')}
              </button>
            ))}
          </div>
          <div className="xdash-table-wrap">
            <table className="xdash-table">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('common.price')}</th>
                  <th>{t('xDash.oneDay')}</th>
                  <th>{t('xDash.mc')}</th>
                </tr>
              </thead>
              <tbody>
                {MENTIONS_ROWS.map((row) => (
                  <tr key={`${row.symbol}-${row.price}`}>
                    <td>
                      <span className="xdash-table-name">{row.name}</span>
                    </td>
                    <td>{fmtPrice(row.price)}</td>
                    <td className={row.change1d >= 0 ? 'positive' : 'negative'}>{row.change1d >= 0 ? '+' : ''}{row.change1d}%</td>
                    <td>{fmtLarge(row.mcap * 1e9)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xdash-card xdash-momentum-card">
          <div className="xdash-card-head">
            <h2 className="xdash-card-title">{t('xDash.topSectorMomentum')}</h2>
            <div className="xdash-time-tabs">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`xdash-time-tab ${timeRange === t ? 'active' : ''}`}
                  onClick={() => setTimeRange(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="xdash-table-wrap">
            <table className="xdash-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('common.name')}</th>
                  <th>{t('xDash.mc')}</th>
                  <th>{t('xDash.oneDay')}</th>
                  <th>{t('xDash.oneWeek')}</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_MOMENTUM.map((row) => (
                  <tr key={row.rank}>
                    <td>{row.rank}</td>
                    <td>{row.name}</td>
                    <td>{row.mcap}</td>
                    <td className="positive">+{row.change1d}%</td>
                    <td className="positive">+{row.change1w}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xdash-card xdash-sentiment-card">
          <h2 className="xdash-card-title">{t('xDash.currentSentimentScore')}</h2>
          <div className="xdash-sentiment-gauge-wrap">
            <div className="xdash-sentiment-gauge" role="img" aria-label={`Sentiment ${sentimentLabel}, ${sentimentPercent}%`}>
              <div className="xdash-gauge-track" />
              <div
                className="xdash-gauge-fill"
                style={{ width: `${50 + sentimentPercent * 50}%` }}
              />
              <div className="xdash-gauge-needle" style={{ left: `${50 + sentimentPercent * 50}%` }} />
            </div>
          </div>
          <div className="xdash-sentiment-summary">
            <span className="xdash-sentiment-total">{t('xDash.totalAssets')} 34</span>
            <span className={`xdash-sentiment-delta ${sentimentPercent >= 0 ? 'positive' : 'negative'}`}>
              {sentimentPercent >= 0 ? '+' : ''}{sentimentPercent}%
            </span>
          </div>
          <div className="xdash-sentiment-legend">
            <span className="xdash-legend-dot neutral" /> {t('xDash.neutral')}
            <span className="xdash-legend-dot negative" /> {t('xDash.negative')}
            <span className="xdash-legend-dot positive" /> {t('xDash.positive')}
          </div>
        </section>
      </div>
    </div>
  )
}
