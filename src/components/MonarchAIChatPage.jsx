/**
 * Monarch AI Chat – full-page chat with Spectre AI Monarch–style chatbot box
 */
import React, { useState, useRef, useEffect } from 'react'
import './MonarchAIChatPage.css'

const DEFAULT_GREETING = "Hi, I'm Monarch AI. Ask me about markets, tokens, or connect your Monarch account for personalized insights."

const MonarchAIChatPage = ({ onBack }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', content: DEFAULT_GREETING }
  ])
  const [input, setInput] = useState('')
  const [deepMode, setDeepMode] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasChatSequence = messages.length > 1
  const clearChat = () => setMessages([{ id: 1, type: 'ai', content: DEFAULT_GREETING }])

  const sendMessage = () => {
    if (!input.trim()) return
    const userText = input.trim()
    setMessages(prev => [...prev, { id: prev.length + 1, type: 'user', content: userText }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'ai',
        content: "Monarch AI is connected to this chat. Full integration coming soon — for now you can use the Spectre AI assistant (bottom right) for token search, roadmap, and more."
      }])
    }, 400)
  }

  return (
    <div className="monarch-ai-chat-page">
      <div className="monarch-ai-chat-header">
        <div className="monarch-ai-chat-header-inner">
          {onBack && (
            <button
              type="button"
              className="monarch-ai-chat-back"
              onClick={onBack}
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          )}
          {hasChatSequence && (
            <button
              type="button"
              className="monarch-ai-chat-clear"
              onClick={clearChat}
              aria-label="Clear chat"
              title="Clear chat"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden>
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.745-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5z" clipRule="evenodd" />
              </svg>
              Clear chat
            </button>
          )}
        </div>
      </div>

      <div className="monarch-ai-chat-hero">
        <div className="monarch-ai-chat-brand">
          <img src="/round-logo.png" alt="" className="monarch-ai-chat-brand-logo" onError={(e) => { e.target.onerror = null; e.target.src = '/round-logo.png' }} />
          <span className="monarch-ai-chat-brand-text">Spectre AI Monarch</span>
        </div>
        <p className="monarch-ai-chat-prompt">Enter the name or coin</p>

        <div className="monarch-ai-chat-box">
          <div className="monarch-ai-chat-box-inner">
            <button
              type="button"
              className={`monarch-ai-chat-deep-toggle ${deepMode ? 'on' : ''}`}
              onClick={() => setDeepMode(!deepMode)}
              aria-pressed={deepMode}
              aria-label="Deep search"
            >
              <span className="monarch-ai-chat-deep-label">Deep</span>
              <span className="monarch-ai-chat-deep-knob" aria-hidden />
            </button>
            <input
              type="text"
              className="monarch-ai-chat-input"
              placeholder="Start typing project name and question to search..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              aria-label="Project name and question"
            />
            <div className="monarch-ai-chat-box-actions">
              <button type="button" className="monarch-ai-chat-action" aria-label="Voice input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
              <button
                type="button"
                className="monarch-ai-chat-action monarch-ai-chat-send"
                onClick={sendMessage}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="monarch-ai-chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`monarch-ai-chat-msg monarch-ai-chat-msg--${msg.type}`}>
            {msg.type === 'ai' && (
              <div className="monarch-ai-chat-msg-avatar">
                <img src="/round-logo.png" alt="" className="monarch-ai-chat-msg-avatar-img" onError={(e) => { e.target.onerror = null; e.target.src = '/round-logo.png' }} />
              </div>
            )}
            <div className="monarch-ai-chat-msg-bubble">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default MonarchAIChatPage
