/**
 * AgentFAB — Floating Action Button
 * Shows the agent avatar in bottom-right. Opens agent chat on click.
 * Only visible after the agent is born.
 */
import React from 'react'
import AgentAvatar from './AgentAvatar'
import './AgentFAB.css'

const AgentFAB = ({ agentColor = '#00f0ff', level = 1, onClick, hasNotification = false }) => {
  return (
    <button
      className="agent-fab"
      onClick={onClick}
      aria-label="Open AI agent chat"
      style={{ '--agent-color': agentColor }}
    >
      <AgentAvatar agentColor={agentColor} level={level} size={36} />
      {hasNotification && <span className="agent-fab-dot" />}
      <div className="agent-fab-ring" />
    </button>
  )
}

export default AgentFAB
