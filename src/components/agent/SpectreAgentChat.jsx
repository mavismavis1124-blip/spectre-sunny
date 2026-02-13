/**
 * SpectreAgentChat
 * The chat panel UI — slides up from bottom-right.
 * Handles both birth conversation and ongoing chat.
 * Context-aware: understands what page/token the user is viewing.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import AgentAvatar from './AgentAvatar'
import { getAgentProfile, saveAgentProfile, createAgentProfile, AGENT_COLORS } from './agentProfile'
import { birthResponses, getBirthFinalMessage, getContextGreeting, getContextSuggestions, getSuggestionResponse, getStaticResponse } from './agentResponses'
import { markGrowing } from '../egg/EggStateManager'
import './SpectreAgentChat.css'

// Birth conversation steps
const BIRTH_STEPS = [
  {
    id: 'intro',
    agentMessages: [
      "I'm alive. I've been watching you explore — now I need to ask a few things to really understand you.",
      "First — what brings you here?",
    ],
    options: [
      { label: "I want to find the next 100x", value: '100x' },
      { label: "I want to research before I trade", value: 'research' },
      { label: "I just want to stay informed", value: 'informed' },
      { label: "I'm building a portfolio", value: 'portfolio' },
    ],
    answerKey: 'motivation',
    responseKey: 'motivation',
  },
  {
    id: 'markets',
    agentQuestion: "What do you mostly trade or follow?",
    options: [
      { label: "Bitcoin & Ethereum — the majors", value: 'majors' },
      { label: "Altcoins — I like finding gems", value: 'altcoins' },
      { label: "Memecoins — high risk high reward", value: 'memecoins' },
      { label: "Stocks & crypto both", value: 'stocks_crypto' },
      { label: "I'm new — show me everything", value: 'new' },
    ],
    answerKey: 'markets',
    responseKey: 'markets',
  },
  {
    id: 'infoStyle',
    agentQuestion: "How do you like your info?",
    options: [
      { label: "Quick and to the point", value: 'quick' },
      { label: "Deep analysis with context", value: 'deep' },
      { label: "Just tell me what to do", value: 'action' },
      { label: "Visual — charts and data", value: 'visual' },
    ],
    answerKey: 'infoStyle',
    responseKey: 'infoStyle',
  },
  {
    id: 'risk',
    agentQuestion: "Last one — how much risk are you comfortable with?",
    options: [
      { label: "Conservative — protect what I have", value: 'conservative' },
      { label: "Moderate — calculated risks", value: 'moderate' },
      { label: "Aggressive — I'm here for big moves", value: 'aggressive' },
      { label: "Degen — let's go", value: 'degen' },
    ],
    answerKey: 'riskProfile',
    responseKey: 'riskProfile',
  },
]

const SpectreAgentChat = ({ open, onClose, isBirthFlow = false, onBirthComplete, appContext }) => {
  const [messages, setMessages] = useState([])
  const [birthStep, setBirthStep] = useState(0)
  const [birthAnswers, setBirthAnswers] = useState({})
  const [birthComplete, setBirthComplete] = useState(false)
  const [typing, setTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [agentProfile, setAgentProfile] = useState(() => getAgentProfile())
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const hasGreetedRef = useRef(false)

  const agentColor = agentProfile?.agentColor || AGENT_COLORS.Wraith
  const agentType = agentProfile?.agentType || 'Agent'
  const agentLevel = agentProfile?.level || 1

  // Context-aware suggestions
  const suggestions = useMemo(() => {
    if (isBirthFlow || !agentProfile) return []
    return getContextSuggestions(agentProfile, appContext)
  }, [agentProfile, appContext, isBirthFlow])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, showSuggestions])

  // Reset state when chat closes
  useEffect(() => {
    if (!open) {
      hasGreetedRef.current = false
      setMessages([])
      setShowSuggestions(true)
    }
  }, [open])

  // Add agent message with typing delay
  const addAgentMessage = useCallback((text, delay = 1000) => {
    return new Promise((resolve) => {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, { role: 'agent', text, time: new Date() }])
        resolve()
      }, delay)
    })
  }, [])

  // Start birth flow
  useEffect(() => {
    if (!open || !isBirthFlow || hasGreetedRef.current) return
    hasGreetedRef.current = true

    const runIntro = async () => {
      const step = BIRTH_STEPS[0]
      for (let i = 0; i < step.agentMessages.length; i++) {
        await addAgentMessage(step.agentMessages[i], i === 0 ? 1200 : 1000)
      }
    }
    runIntro()
  }, [open, isBirthFlow, addAgentMessage])

  // Start ongoing chat (non-birth) with context-aware greeting
  useEffect(() => {
    if (!open || isBirthFlow || hasGreetedRef.current || !agentProfile) return
    hasGreetedRef.current = true
    const greeting = getContextGreeting(agentProfile, appContext)
    addAgentMessage(greeting, 600)
  }, [open, isBirthFlow, agentProfile, addAgentMessage, appContext])

  // Handle birth option selection
  const handleBirthOption = async (option) => {
    const step = BIRTH_STEPS[birthStep]
    if (!step) return

    setMessages(prev => [...prev, { role: 'user', text: option.label, time: new Date() }])

    const newAnswers = { ...birthAnswers, [step.answerKey]: option.value }
    setBirthAnswers(newAnswers)

    const response = birthResponses[step.responseKey]?.[option.value]
    if (response) {
      await addAgentMessage(response, 900)
    }

    const nextStep = birthStep + 1

    if (nextStep < BIRTH_STEPS.length) {
      const nextStepData = BIRTH_STEPS[nextStep]
      await addAgentMessage(nextStepData.agentQuestion, 800)
      setBirthStep(nextStep)
    } else {
      const profile = createAgentProfile(newAnswers)
      saveAgentProfile(profile)
      setAgentProfile(profile)
      markGrowing()
      const finalMsg = getBirthFinalMessage(profile)
      await addAgentMessage(finalMsg, 1200)
      setBirthComplete(true)
      if (onBirthComplete) onBirthComplete(profile)
    }
  }

  // Handle suggestion chip click
  const handleSuggestionClick = async (suggestion) => {
    setMessages(prev => [...prev, { role: 'user', text: suggestion.label, time: new Date() }])
    setShowSuggestions(false)

    const response = getSuggestionResponse(suggestion.action, agentProfile, appContext)
    await addAgentMessage(response, 700 + Math.random() * 500)

    // Show new suggestions after response
    setTimeout(() => setShowSuggestions(true), 300)

    trackInteraction()
  }

  // Handle ongoing chat message send
  const handleSend = () => {
    const text = inputValue.trim()
    if (!text) return

    setMessages(prev => [...prev, { role: 'user', text, time: new Date() }])
    setInputValue('')
    setShowSuggestions(false)

    const response = getStaticResponse(text, agentProfile)
    addAgentMessage(response, 800 + Math.random() * 700).then(() => {
      setTimeout(() => setShowSuggestions(true), 300)
    })

    trackInteraction()
  }

  const trackInteraction = () => {
    try {
      const p = getAgentProfile()
      if (p) {
        p.interactions = (p.interactions || 0) + 2
        p.level = Math.floor(p.interactions / 50) + 1
        saveAgentProfile(p)
        setAgentProfile(p)
      }
    } catch (_) {}
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Current birth options
  const currentOptions = (!birthComplete && isBirthFlow && !typing)
    ? BIRTH_STEPS[birthStep]?.options || []
    : []

  // Show input only for ongoing chat (post-birth or non-birth flow)
  const showInput = !isBirthFlow || birthComplete

  // Show suggestion chips when: ongoing chat, not typing, and suggestions are enabled
  const showSuggestionChips = showInput && showSuggestions && !typing && suggestions.length > 0

  if (!open) return null

  return createPortal(
    <div className="agent-chat-panel" style={{ '--agent-color': agentColor }}>
      {/* Header */}
      <div className="agent-chat-header">
        <div className="agent-chat-header-left">
          <AgentAvatar agentColor={agentColor} level={agentLevel} size={32} />
          <div className="agent-chat-header-info">
            <span className="agent-chat-header-name">
              {agentProfile?.born ? agentType : 'Spectre Agent'}
            </span>
            {agentProfile?.born && (
              <span className="agent-chat-header-level" style={{ color: agentColor }}>
                Level {agentLevel}
              </span>
            )}
          </div>
        </div>
        <button className="agent-chat-close" onClick={onClose} aria-label="Close agent chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="agent-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`agent-chat-msg agent-chat-msg--${msg.role}`}>
            {msg.role === 'agent' && (
              <div className="agent-chat-msg-avatar">
                <AgentAvatar agentColor={agentColor} level={agentLevel} size={24} />
              </div>
            )}
            <div className={`agent-chat-msg-bubble ${msg.role === 'agent' ? 'agent-bubble' : 'user-bubble'}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="agent-chat-msg agent-chat-msg--agent">
            <div className="agent-chat-msg-avatar">
              <AgentAvatar agentColor={agentColor} level={agentLevel} size={24} />
            </div>
            <div className="agent-chat-typing">
              <span className="agent-chat-typing-dot" />
              <span className="agent-chat-typing-dot" />
              <span className="agent-chat-typing-dot" />
            </div>
          </div>
        )}

        {/* Birth options */}
        {currentOptions.length > 0 && (
          <div className="agent-chat-options">
            {currentOptions.map((opt) => (
              <button
                key={opt.value}
                className="agent-chat-option"
                onClick={() => handleBirthOption(opt)}
                style={{ '--agent-color': agentColor }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Context-aware suggestion chips */}
        {showSuggestionChips && (
          <div className="agent-chat-suggestions">
            {suggestions.map((s) => (
              <button
                key={s.id}
                className="agent-chat-suggestion"
                onClick={() => handleSuggestionClick(s)}
                style={{ '--agent-color': agentColor }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input (ongoing chat) */}
      {showInput && (
        <div className="agent-chat-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="agent-chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your agent anything..."
            autoFocus
          />
          <button
            className="agent-chat-send"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

export default SpectreAgentChat
