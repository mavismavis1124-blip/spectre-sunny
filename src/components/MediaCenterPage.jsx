/**
 * AI Media Center – YouTube crypto videos + live Twitch streams
 * Two tabs: YouTube (crypto) and Twitch (live)
 */
import React, { useState } from 'react'
import spectreIcons from '../icons/spectreIcons'
import './MediaCenterPage.css'

// Real crypto YouTube videos (embed IDs – Coin Bureau, etc.)
const YOUTUBE_VIDEOS = [
  { id: 'S6D3SjRU2Hw', title: 'Coin Bureau Portfolio Revealed: What We Hold For 2025' },
  { id: 'PCo4ritKQ3U', title: 'Coin Bureau CRYPTO Portfolio: Ultimate Investing Strategy' },
  { id: 'bw1piBAOG9s', title: 'How to DYOR Like a Pro in 2025' },
  { id: '6n3pFFPSlW4', title: 'Bitcoin & Crypto Market Analysis' },
  { id: '9AAcRuQyL_I', title: 'Crypto Market Overview' },
  { id: 'g6C3_OdQ1xM', title: 'DeFi & Altcoins' },
]

// Twitch channels that often stream crypto/finance (live when online)
const TWITCH_CHANNELS = [
  { channel: 'coindesk', label: 'CoinDesk' },
  { channel: 'cryptocom', label: 'Crypto.com' },
  { channel: 'theblock', label: 'The Block' },
  { channel: 'blockworks_', label: 'Blockworks' },
]

const MediaCenterPage = () => {
  const [activeTab, setActiveTab] = useState('youtube')
  const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  return (
    <div className="media-center-page">
      <div className="media-center-container">
        <div className="media-center-header">
          <h1 className="media-center-title">AI Media Center</h1>
          <p className="media-center-subtitle">Crypto videos and live streams in one place</p>
        </div>

        <div className="media-center-tabs">
          <button
            type="button"
            className={`media-center-tab ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <span className="media-center-tab-icon" aria-hidden>{spectreIcons.volume}</span>
            YouTube
          </button>
          <button
            type="button"
            className={`media-center-tab ${activeTab === 'twitch' ? 'active' : ''}`}
            onClick={() => setActiveTab('twitch')}
          >
            <span className="media-center-tab-icon" aria-hidden>{spectreIcons.sparkles}</span>
            Twitch Live
          </button>
        </div>

        <div className="media-center-content">
          {activeTab === 'youtube' && (
            <div className="media-center-section">
              <h2 className="media-center-section-title">Crypto videos</h2>
              <div className="media-center-grid">
                {YOUTUBE_VIDEOS.map((video) => (
                  <div key={video.id} className="media-center-card">
                    <div className="media-center-embed-wrap">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="media-center-iframe"
                      />
                    </div>
                    <p className="media-center-card-title">{video.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'twitch' && (
            <div className="media-center-section">
              <h2 className="media-center-section-title">Live Twitch streams</h2>
              <div className="media-center-grid media-center-grid-twitch">
                {TWITCH_CHANNELS.map(({ channel, label }) => (
                  <div key={channel} className="media-center-card media-center-card-twitch">
                    <div className="media-center-embed-wrap">
                      <iframe
                        src={`https://player.twitch.tv/?channel=${channel}&parent=${parentHost}&muted=false`}
                        title={`${label} live`}
                        allowFullScreen
                        className="media-center-iframe"
                      />
                    </div>
                    <p className="media-center-card-title">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaCenterPage
