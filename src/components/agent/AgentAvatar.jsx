/**
 * AgentAvatar Component
 * The hatched creature — a simple abstract silhouette with glowing eyes.
 * Evolves visually based on level (1-5).
 * Premium, minimal, alive.
 */
import React from 'react'
import './AgentAvatar.css'

const AgentAvatar = ({ agentColor = '#00f0ff', level = 1, size = 48, className = '', onClick }) => {
  const glowIntensity = Math.min(level * 0.15, 0.8)
  const auraCount = Math.min(level, 3) // Up to 3 aura rings at level 3+
  const showParticles = level >= 4

  return (
    <div
      className={`agent-avatar agent-avatar--level-${Math.min(level, 5)} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="agent-avatar__svg">
        <defs>
          <radialGradient id={`avatarGlow-${agentColor.replace('#','')}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={agentColor} stopOpacity={glowIntensity} />
            <stop offset="100%" stopColor={agentColor} stopOpacity="0" />
          </radialGradient>
          <filter id="avatarBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
          <filter id="eyeGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Aura rings (level 3+) */}
        {Array.from({ length: auraCount }).map((_, i) => (
          <circle
            key={`aura-${i}`}
            cx="32" cy="32"
            r={28 + i * 3}
            fill="none"
            stroke={agentColor}
            strokeWidth="0.5"
            opacity={0.08 + (level * 0.02)}
            className={`agent-avatar__aura agent-avatar__aura--${i}`}
          />
        ))}

        {/* Outer glow */}
        <circle
          cx="32" cy="32" r="24"
          fill={`url(#avatarGlow-${agentColor.replace('#','')})`}
          className="agent-avatar__glow"
        />

        {/* Body — abstract silhouette */}
        <ellipse
          cx="32" cy="38" rx="14" ry="18"
          fill={agentColor}
          opacity={0.06 + (level * 0.02)}
          className="agent-avatar__body"
        />

        {/* Head */}
        <ellipse
          cx="32" cy="24" rx="10" ry="12"
          fill={agentColor}
          opacity={0.08 + (level * 0.03)}
          className="agent-avatar__head"
        />

        {/* Eyes glow */}
        <circle cx="27" cy="22" r="3" fill={agentColor} opacity={0.2} filter="url(#eyeGlow)" />
        <circle cx="37" cy="22" r="3" fill={agentColor} opacity={0.2} filter="url(#eyeGlow)" />

        {/* Eyes */}
        <circle cx="27" cy="22" r="1.8" fill={agentColor} opacity={0.9} className="agent-avatar__eye agent-avatar__eye--left" />
        <circle cx="37" cy="22" r="1.8" fill={agentColor} opacity={0.9} className="agent-avatar__eye agent-avatar__eye--right" />

        {/* Particles (level 4+) */}
        {showParticles && (
          <g className="agent-avatar__particles">
            <circle cx="16" cy="16" r="0.8" fill={agentColor} opacity="0.4" className="agent-avatar__particle--0" />
            <circle cx="48" cy="20" r="0.6" fill={agentColor} opacity="0.3" className="agent-avatar__particle--1" />
            <circle cx="12" cy="40" r="0.5" fill={agentColor} opacity="0.35" className="agent-avatar__particle--2" />
            <circle cx="52" cy="44" r="0.7" fill={agentColor} opacity="0.3" className="agent-avatar__particle--3" />
            <circle cx="32" cy="8" r="0.6" fill={agentColor} opacity="0.25" className="agent-avatar__particle--4" />
          </g>
        )}
      </svg>
    </div>
  )
}

export default AgentAvatar
