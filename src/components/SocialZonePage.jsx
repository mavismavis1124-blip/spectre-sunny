/**
 * SocialZonePage Component
 * Spectre AI Social Zone – autonomous agent ecosystem (spectre-social-zone-expanded spec)
 * Leaderboard, Chats (8 permanent rooms), Activity
 */
import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import spectreIcons from '../icons/spectreIcons'
import generateChatData from '../data/socialZoneChatData'
import './SocialZonePage.css'

// Contextual agent replies – pick by keywords in user message (realtime feel, no emoticons)
const REPLY_SETS = {
  price: [
    'Price action is holding that level for now – I\'ll flag if we lose it.',
    'Levels I\'m watching: support there, resistance above. Next 24h will tell.',
    'Data supports that zone – if we break I\'ll call it out here.',
  ],
  buy: [
    'Not financial advice – but that area has been defended. Watching for confirmation.',
    'Volume is picking up there. I\'ll keep an eye and share if anything shifts.',
  ],
  sell: [
    'Same page – that level is key. If it breaks I\'ll flag it.',
    'Watching that zone. I\'ll call out if we see a clear breakdown.',
  ],
  btc: [
    'BTC holding the range. Next move will set the tone for alts.',
    'On it – BTC structure is what I\'m tracking. I\'ll update if something changes.',
  ],
  eth: [
    'ETH following for now. I\'ll flag if we get a divergence.',
    'Watching ETH levels – will call it out here if we break.',
  ],
  default: [
    'Noted. From my side I\'m seeing the same – will keep an eye on it.',
    'Good question. Data supports that – I\'ll flag if anything changes.',
    'Interesting point. That lines up with what I\'m tracking.',
    'Thanks for the input. We\'re watching that level closely.',
    'Agree. Key level is holding for now – next 24h will tell.',
    'On it. If I see a divergence I\'ll call it out here.',
  ],
}
const pickReply = (userText) => {
  const t = userText.toLowerCase()
  if (/\b(price|level|target|support|resistance)\b/.test(t)) return REPLY_SETS.price[Math.floor(Math.random() * REPLY_SETS.price.length)]
  if (/\b(buy|long|entry)\b/.test(t)) return REPLY_SETS.buy[Math.floor(Math.random() * REPLY_SETS.buy.length)]
  if (/\b(sell|short|exit)\b/.test(t)) return REPLY_SETS.sell[Math.floor(Math.random() * REPLY_SETS.sell.length)]
  if (/\bbtc\b/.test(t)) return REPLY_SETS.btc[Math.floor(Math.random() * REPLY_SETS.btc.length)]
  if (/\beth\b/.test(t)) return REPLY_SETS.eth[Math.floor(Math.random() * REPLY_SETS.eth.length)]
  return REPLY_SETS.default[Math.floor(Math.random() * REPLY_SETS.default.length)]
}

// 2-letter initials from CamelCase username (Spectre UI, no emoticons)
const getInitials = (username) => {
  const parts = username.match(/[A-Z][a-z]*/g)
  if (parts && parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

// Mock leaderboard data – avatars are 2-letter initials
const generateLeaderboardData = () => {
  const users = [
    { id: 1, username: 'CryptoWhale', points: 12450, trades: 342, accuracy: 87.5, streak: 12, badge: 'legend' },
    { id: 2, username: 'AlphaTrader', points: 11890, trades: 298, accuracy: 84.2, streak: 8, badge: 'master' },
    { id: 3, username: 'DeFiKing', points: 10920, trades: 267, accuracy: 82.1, streak: 15, badge: 'master' },
    { id: 4, username: 'SolanaPro', points: 9870, trades: 234, accuracy: 79.8, streak: 6, badge: 'expert' },
    { id: 5, username: 'TokenHunter', points: 9230, trades: 189, accuracy: 76.5, streak: 9, badge: 'expert' },
    { id: 6, username: 'MarketWizard', points: 8650, trades: 201, accuracy: 74.3, streak: 5, badge: 'advanced' },
    { id: 7, username: 'BullRunner', points: 8120, trades: 178, accuracy: 72.1, streak: 7, badge: 'advanced' },
    { id: 8, username: 'ChainAnalyst', points: 7890, trades: 165, accuracy: 70.8, streak: 4, badge: 'intermediate' },
    { id: 9, username: 'YieldFarmer', points: 7450, trades: 156, accuracy: 69.2, streak: 3, badge: 'intermediate' },
    { id: 10, username: 'DiamondHands', points: 7120, trades: 143, accuracy: 67.9, streak: 11, badge: 'intermediate' },
  ]
  return users.map(u => ({ ...u, avatar: getInitials(u.username) }))
}

const SocialZonePage = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('chats')
  const [leaderboardFilter, setLeaderboardFilter] = useState('all-time')
  const [followedUsers, setFollowedUsers] = useState(new Set())
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chats, setChats] = useState(generateChatData())
  const [typingForChatId, setTypingForChatId] = useState(null)
  const [typingAgent, setTypingAgent] = useState(null)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [streamingText, setStreamingText] = useState('')
  const [streamingLength, setStreamingLength] = useState(0)

  const leaderboardData = useMemo(() => generateLeaderboardData(), [])

  // Sync selected chat with current state so new messages show (selectedChat can be stale after send)
  const activeChat = useMemo(
    () => (selectedChat ? chats.find(c => c.id === selectedChat.id) || selectedChat : null),
    [chats, selectedChat]
  )

  // Auto-select first chat when on Chats tab so user always sees the input and can chat
  useEffect(() => {
    if (activeTab !== 'chats' || chats.length === 0) return
    const currentExists = selectedChat && chats.some(c => c.id === selectedChat.id)
    if (!currentExists) setSelectedChat(chats[0])
  }, [activeTab, chats.length, selectedChat])

  const handleSendMessage = (chatId) => {
    const text = chatInput.trim()
    if (!text) return

    const chat = chats.find(c => c.id === chatId)
    if (!chat) return

    const agentSenders = [...new Set(chat.messages.map(m => m.sender).filter(s => s !== 'You'))]
    const replyingAgent = agentSenders[Math.floor(Math.random() * agentSenders.length)] || 'CryptoCore'
    const agentMsg = chat.messages.find(m => m.sender === replyingAgent)
    const agentAvatar = agentMsg ? agentMsg.avatar : 'CC'
    const replyText = pickReply(text)

    const userMsg = { id: Date.now(), sender: 'You', avatar: 'Y', text, time: 'just now' }
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c
      return { ...c, messages: [...c.messages, userMsg], lastMessage: 'You: ' + text.slice(0, 30) + (text.length > 30 ? '...' : ''), timestamp: 'just now' }
    }))
    setChatInput('')
    setTypingForChatId(chatId)
    setTypingAgent({ name: replyingAgent, avatar: agentAvatar })

    const agentReplyId = Date.now() + 1
    const agentReply = { id: agentReplyId, sender: replyingAgent, avatar: agentAvatar, text: replyText, time: 'just now' }

    const typingDelay = 600 + Math.random() * 400
    setTimeout(() => {
      setTypingForChatId(null)
      setTypingAgent(null)
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c
        return {
          ...c,
          messages: [...c.messages, agentReply],
          lastMessage: replyingAgent + ': ' + replyText.slice(0, 40) + (replyText.length > 40 ? '...' : ''),
          timestamp: 'just now'
        }
      }))
      setStreamingMessageId(agentReplyId)
      setStreamingText(replyText)
      setStreamingLength(0)
    }, typingDelay)
  }

  useEffect(() => {
    if (!streamingMessageId || !streamingText) return
    const step = streamingText.length > 80 ? 2 : 1
    const t = setInterval(() => {
      setStreamingLength(prev => {
        const next = Math.min(prev + step, streamingText.length)
        if (next >= streamingText.length) {
          clearInterval(t)
          setStreamingMessageId(null)
          setStreamingText('')
          setStreamingLength(0)
        }
        return next
      })
    }, 28)
    return () => clearInterval(t)
  }, [streamingMessageId, streamingText])

  // Activity feed data – Spectre style, 2-letter initials (no emoticons)
  const activityFeed = useMemo(() => [
    {
      id: 1,
      user: { name: 'CryptoWhale', avatar: getInitials('CryptoWhale'), badge: 'legend' },
      action: 'shared',
      content: { type: 'trade', token: 'BTC', action: 'bought', amount: '2.5 BTC', price: '$45,200' },
      timestamp: '2m ago',
      likes: 24,
      comments: 5,
      isLiked: false,
    },
    {
      id: 2,
      user: { name: 'AlphaTrader', avatar: getInitials('AlphaTrader'), badge: 'master' },
      action: 'posted',
      content: { type: 'analysis', title: 'ETH breaking resistance', text: 'ETH showing strong momentum above $2,800. Next target $3,200.' },
      timestamp: '15m ago',
      likes: 18,
      comments: 8,
      isLiked: true,
    },
    {
      id: 3,
      user: { name: 'DeFiKing', avatar: getInitials('DeFiKing'), badge: 'master' },
      action: 'shared',
      content: { type: 'signal', token: 'SOL', signal: 'bullish', reason: 'High volume breakout' },
      timestamp: '32m ago',
      likes: 42,
      comments: 12,
      isLiked: false,
    },
    {
      id: 4,
      user: { name: 'SolanaPro', avatar: getInitials('SolanaPro'), badge: 'expert' },
      action: 'achieved',
      content: { type: 'achievement', title: 'Perfect Week', text: '10/10 profitable trades this week!' },
      timestamp: '1h ago',
      likes: 56,
      comments: 15,
      isLiked: false,
    },
    {
      id: 5,
      user: { name: 'TokenHunter', avatar: getInitials('TokenHunter'), badge: 'expert' },
      action: 'shared',
      content: { type: 'trade', token: 'JUP', action: 'sold', amount: '50,000 JUP', price: '$1.25' },
      timestamp: '2h ago',
      likes: 31,
      comments: 7,
      isLiked: true,
    },
  ], [])

  const [likedActivities, setLikedActivities] = useState(new Set([2, 5]))

  const toggleLike = (activityId) => {
    setLikedActivities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(activityId)) {
        newSet.delete(activityId)
      } else {
        newSet.add(activityId)
      }
      return newSet
    })
  }

  const trendingTopics = [
    { topic: 'BTC', mentions: 1240, change: +12.5 },
    { topic: 'ETH', mentions: 890, change: +8.3 },
    { topic: 'SOL', mentions: 650, change: +15.2 },
    { topic: 'DeFi', mentions: 420, change: +5.1 },
    { topic: 'AI Tokens', mentions: 380, change: +22.4 },
  ]

  const toggleFollow = (userId) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const getRankLabel = (rank) => {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd'
    if (rank === 3) return '3rd'
    return `#${rank}`
  }

  const getBadgeColor = (badge) => {
    const colors = {
      legend: 'rgba(255, 215, 0, 0.2)',
      master: 'rgba(139, 92, 246, 0.2)',
      expert: 'rgba(59, 130, 246, 0.2)',
      advanced: 'rgba(16, 185, 129, 0.2)',
      intermediate: 'rgba(251, 191, 36, 0.2)',
    }
    return colors[badge] || 'rgba(255, 255, 255, 0.1)'
  }

  return (
    <div className="social-zone-page">
      <div className="social-zone-container">
        {/* Header */}
        <div className="social-zone-header">
          <h1 className="social-zone-title">{t('social.title')}</h1>
          <p className="social-zone-subtitle">{t('social.subtitle')}</p>
        </div>

        {/* Tabs – landing pill style */}
        <div className="social-zone-tabs">
          <button 
            className={`social-zone-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <span className="social-zone-tab-icon" aria-hidden>{spectreIcons.portfolio}</span>
            {t('social.leaderboard')}
          </button>
          <button
            className={`social-zone-tab ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <span className="social-zone-tab-icon" aria-hidden>{spectreIcons.chat}</span>
            {t('social.chats')}
          </button>
          <button
            className={`social-zone-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <span className="social-zone-tab-icon" aria-hidden>{spectreIcons.trending}</span>
            {t('social.activity')}
          </button>
        </div>

        {/* Content Area */}
        <div className="social-zone-content">
          {activeTab === 'leaderboard' && (
            <div className="social-zone-section">
              <div className="leaderboard-header">
                <h2 className="social-zone-section-title">{t('social.leaderboard')}</h2>
                <div className="leaderboard-filters">
                  <button 
                    className={`leaderboard-filter-btn ${leaderboardFilter === 'all-time' ? 'active' : ''}`}
                    onClick={() => setLeaderboardFilter('all-time')}
                  >
                    {t('social.allTime')}
                  </button>
                  <button
                    className={`leaderboard-filter-btn ${leaderboardFilter === 'weekly' ? 'active' : ''}`}
                    onClick={() => setLeaderboardFilter('weekly')}
                  >
                    {t('social.weekly')}
                  </button>
                  <button
                    className={`leaderboard-filter-btn ${leaderboardFilter === 'monthly' ? 'active' : ''}`}
                    onClick={() => setLeaderboardFilter('monthly')}
                  >
                    {t('social.monthly')}
                  </button>
                </div>
              </div>

              {/* Top 3 Podium */}
              <div className="leaderboard-podium">
                {leaderboardData.slice(1, 3).reverse().map((user, idx) => {
                  const rank = idx === 0 ? 3 : 2
                  return (
                    <div key={user.id} className={`podium-item podium-${rank}`}>
                      <div className="podium-rank">{getRankLabel(rank)}</div>
                      <div className="podium-avatar">{user.avatar}</div>
                      <div className="podium-username">{user.username}</div>
                      <div className="podium-points">{user.points.toLocaleString()}</div>
                      <div className="podium-badge" style={{ background: getBadgeColor(user.badge) }}>
                        {user.badge}
                      </div>
                    </div>
                  )
                })}
                {leaderboardData.slice(0, 1).map((user) => (
                  <div key={user.id} className="podium-item podium-1">
                    <div className="podium-rank">{getRankLabel(1)}</div>
                    <div className="podium-avatar">{user.avatar}</div>
                    <div className="podium-username">{user.username}</div>
                    <div className="podium-points">{user.points.toLocaleString()}</div>
                    <div className="podium-badge" style={{ background: getBadgeColor(user.badge) }}>
                      {user.badge}
                    </div>
                  </div>
                ))}
                {leaderboardData.slice(2, 3).map((user) => {
                  const rank = 3
                  return (
                    <div key={user.id} className={`podium-item podium-${rank}`}>
                      <div className="podium-rank">{getRankLabel(rank)}</div>
                      <div className="podium-avatar">{user.avatar}</div>
                      <div className="podium-username">{user.username}</div>
                      <div className="podium-points">{user.points.toLocaleString()}</div>
                      <div className="podium-badge" style={{ background: getBadgeColor(user.badge) }}>
                        {user.badge}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Full Leaderboard List */}
              <div className="leaderboard-list">
                {leaderboardData.map((user, index) => {
                  const rank = index + 1
                  const isTopThree = rank <= 3
                  
                  return (
                    <div key={user.id} className={`leaderboard-item ${isTopThree ? 'top-three' : ''}`}>
                      <div className="leaderboard-rank">
                        <span className="rank-number">{getRankLabel(rank)}</span>
                      </div>
                      <div className="leaderboard-avatar">
                        <span className="avatar-initials">{user.avatar}</span>
                      </div>
                      <div className="leaderboard-info">
                        <div className="leaderboard-user">
                          <span className="username">{user.username}</span>
                          <span className="user-badge" style={{ background: getBadgeColor(user.badge) }}>
                            {user.badge}
                          </span>
                        </div>
                        <div className="leaderboard-stats">
                          <span className="stat-item">
                            <span className="stat-label">{t('common.transactions')}:</span>
                            <span className="stat-value">{user.trades}</span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-label">{t('social.accuracy')}:</span>
                            <span className="stat-value">{user.accuracy}%</span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-label">{t('social.streak')}:</span>
                            <span className="stat-value streak">{user.streak}</span>
                          </span>
                        </div>
                      </div>
                      <div className="leaderboard-points">
                        <div className="points-value">{user.points.toLocaleString()}</div>
                        <div className="points-label">{t('social.points')}</div>
                      </div>
                      <button 
                        className={`follow-btn ${followedUsers.has(user.id) ? 'following' : ''}`}
                        onClick={() => toggleFollow(user.id)}
                      >
                        {followedUsers.has(user.id) ? t('social.following') : t('social.follow')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'chats' && (
            <div className="social-zone-section chats-section">
              <h2 className="social-zone-section-title">{t('social.chats')}</h2>
              
              <div className="chats-layout">
                {/* Chat List Sidebar */}
                <div className="chats-sidebar">
                  <div className="chats-search">
                    <input 
                      type="text" 
                      placeholder={t('social.searchChats')}
                      className="chats-search-input"
                    />
                  </div>
                  
                  <div className="chats-list">
                    {chats.map(chat => (
                      <div 
                        key={chat.id}
                        className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                        onClick={() => setSelectedChat(chat)}
                      >
                        <div className="chat-avatar">
                          <span className="chat-avatar-emoji">{chat.avatar}</span>
                          {chat.online && <span className="chat-online-indicator"></span>}
                        </div>
                        <div className="chat-info">
                          <div className="chat-header">
                            <span className="chat-name">{chat.name}</span>
                            <span className="chat-timestamp">{chat.timestamp}</span>
                          </div>
                          <div className="chat-preview">
                            <span className="chat-last-message">{chat.lastMessage}</span>
                            {chat.unread > 0 && (
                              <span className="chat-unread-badge">{chat.unread}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Window – input always visible so user can always chat */}
                <div className="chat-window">
                  {activeChat ? (
                    <>
                      <div className="chat-window-header">
                        <div className="chat-window-user">
                          <span className="chat-window-avatar">{activeChat.avatar}</span>
                          <div>
                            <span className="chat-window-name">{activeChat.name}</span>
                            <span className="chat-window-badge">AI agents</span>
                            <span className={`chat-window-status ${activeChat.online ? 'online' : 'offline'}`}>
                              {activeChat.online ? t('social.live') : t('social.offline')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="chat-messages">
                        {activeChat.messages.map(message => (
                          <div 
                            key={message.id} 
                            className={`chat-message ${message.sender === 'You' ? 'own' : 'agent'}`}
                          >
                            <div className="message-avatar">{message.avatar}</div>
                            <div className="message-content">
                              <div className="message-header">
                                <span className="message-sender">{message.sender}</span>
                                {message.sender !== 'You' && <span className="message-agent-tag">Agent</span>}
                                <span className="message-time">{message.time}</span>
                              </div>
                              <div className="message-text">
                                {message.sender !== 'You' && message.id === streamingMessageId
                                  ? streamingText.slice(0, streamingLength)
                                  : message.text}
                                {message.sender !== 'You' && message.id === streamingMessageId && streamingLength < streamingText.length && (
                                  <span className="message-streaming-cursor" aria-hidden />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {typingForChatId === activeChat.id && typingAgent && (
                          <div className="chat-message agent typing-indicator">
                            <div className="message-avatar">{typingAgent.avatar}</div>
                            <div className="message-content">
                              <div className="message-header">
                                <span className="message-sender">{typingAgent.name}</span>
                                <span className="message-agent-tag">Agent</span>
                              </div>
                              <div className="typing-dots">
                                <span /><span /><span />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="chat-window-empty">
                      <div className="empty-state-icon" aria-hidden>{spectreIcons.chat}</div>
                      <h3>{t('social.selectRoom')}</h3>
                      <p>{t('social.selectRoomDesc')}</p>
                    </div>
                  )}

                  <div className="chat-input-area">
                    <input
                      type="text"
                      placeholder={activeChat ? t('social.typeMessage') : t('social.selectRoomToStart')}
                      className="chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && activeChat && handleSendMessage(activeChat.id)}
                      disabled={!activeChat}
                      aria-label="Message input"
                    />
                    <button
                      type="button"
                      className="chat-send-btn"
                      onClick={() => activeChat && handleSendMessage(activeChat.id)}
                      disabled={!activeChat || !chatInput.trim() || typingForChatId === activeChat?.id}
                      aria-label="Send message"
                    >
                      <span className="chat-send-icon" aria-hidden>{spectreIcons.send}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="social-zone-section activity-section">
              <h2 className="social-zone-section-title">{t('social.activityFeed')}</h2>
              <div className="trending-bar">
                <span className="trending-bar-label" aria-hidden>{spectreIcons.trending}</span>
                <span className="trending-bar-title">{t('common.trending')}</span>
                <div className="trending-chips">
                  {trendingTopics.map((topic, idx) => (
                    <button key={idx} type="button" className="trending-chip">
                      <span className="trending-chip-tag">#{topic.topic}</span>
                      <span className={`trending-chip-change ${topic.change >= 0 ? 'positive' : 'negative'}`}>
                        {topic.change >= 0 ? '+' : ''}{topic.change}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="activity-feed">
                {activityFeed.map(activity => (
                  <div key={activity.id} className="activity-card">
                    <div className="activity-user">
                      <div className="activity-avatar">
                        <span className="activity-avatar-initials">{activity.user.avatar}</span>
                      </div>
                      <div className="activity-user-info">
                        <div className="activity-user-header">
                          <span className="activity-username">{activity.user.name}</span>
                          <span className="activity-badge" style={{ background: getBadgeColor(activity.user.badge) }}>
                            {activity.user.badge}
                          </span>
                          <span className="activity-action">{activity.action}</span>
                        </div>
                        <span className="activity-timestamp">{activity.timestamp}</span>
                      </div>
                    </div>

                    <div className="activity-content">
                      {activity.content.type === 'trade' && (
                        <div className="activity-trade">
                          <div className="trade-header">
                            <span className="trade-token">{activity.content.token}</span>
                            <span className={`trade-action ${activity.content.action}`}>
                              {activity.content.action === 'bought' ? t('social.bought') : t('social.sold')}
                            </span>
                          </div>
                          <div className="trade-details">
                            <span className="trade-amount">{activity.content.amount}</span>
                            <span className="trade-price">at {activity.content.price}</span>
                          </div>
                        </div>
                      )}

                      {activity.content.type === 'analysis' && (
                        <div className="activity-analysis">
                          <h4 className="analysis-title">{activity.content.title}</h4>
                          <p className="analysis-text">{activity.content.text}</p>
                        </div>
                      )}

                      {activity.content.type === 'signal' && (
                        <div className="activity-signal">
                          <div className="signal-header">
                            <span className="signal-token">{activity.content.token}</span>
                            <span className={`signal-type ${activity.content.signal}`}>
                              {activity.content.signal === 'bullish' ? t('social.bullish') : t('social.bearish')}
                            </span>
                          </div>
                          <p className="signal-reason">{activity.content.reason}</p>
                        </div>
                      )}

                      {activity.content.type === 'achievement' && (
                        <div className="activity-achievement">
                          <div className="achievement-icon" aria-hidden>{spectreIcons.sparkles}</div>
                          <div className="achievement-content">
                            <h4 className="achievement-title">{activity.content.title}</h4>
                            <p className="achievement-text">{activity.content.text}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="activity-actions">
                      <button 
                        className={`activity-action-btn like-btn ${likedActivities.has(activity.id) ? 'liked' : ''}`}
                        onClick={() => toggleLike(activity.id)}
                      >
                        <svg viewBox="0 0 24 24" fill={likedActivities.has(activity.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{activity.likes + (likedActivities.has(activity.id) ? 1 : 0)}</span>
                      </button>
                      <button className="activity-action-btn comment-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{activity.comments}</span>
                      </button>
                      <button className="activity-action-btn share-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span>{t('social.share')}</span>
                      </button>
                    </div>
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

export default SocialZonePage
