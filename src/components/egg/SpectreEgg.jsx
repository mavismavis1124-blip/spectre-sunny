/**
 * SpectreEgg Component
 * Animated SVG egg with neural network nodes inside.
 * Accepts stage prop: DORMANT | CRACKING | HATCHING | BORN | GROWING
 * Premium, dark, alive-feeling design.
 */
import React, { useMemo } from 'react'
import { EGG_STATES } from './EggStateManager'
import './SpectreEgg.css'

// Neural network node positions (relative to egg center, normalized 0-1)
const NEURAL_NODES = [
  { x: 0.50, y: 0.30 },
  { x: 0.35, y: 0.42 },
  { x: 0.65, y: 0.42 },
  { x: 0.42, y: 0.55 },
  { x: 0.58, y: 0.55 },
  { x: 0.50, y: 0.65 },
  { x: 0.30, y: 0.58 },
  { x: 0.70, y: 0.58 },
  { x: 0.50, y: 0.45 },
  { x: 0.38, y: 0.35 },
  { x: 0.62, y: 0.35 },
  { x: 0.45, y: 0.72 },
  { x: 0.55, y: 0.72 },
]

// Neural connections between nodes (index pairs)
const NEURAL_CONNECTIONS = [
  [0, 1], [0, 2], [0, 8],
  [1, 3], [1, 6], [1, 9],
  [2, 4], [2, 7], [2, 10],
  [3, 5], [3, 8],
  [4, 5], [4, 8],
  [5, 11], [5, 12],
  [6, 3], [7, 4],
  [8, 5], [9, 0], [10, 0],
]

// Crack line paths for each stage
const CRACK_LINES = {
  [EGG_STATES.CRACKING]: [
    'M 48 25 L 52 32 L 49 38',
  ],
  [EGG_STATES.HATCHING]: [
    'M 48 25 L 52 32 L 49 38 L 53 45',
    'M 55 28 L 58 35 L 54 40',
    'M 42 30 L 39 37 L 43 43',
    'M 50 42 L 46 48 L 50 54',
  ],
}

const SpectreEgg = ({
  stage = EGG_STATES.DORMANT,
  size = 200,
  agentColor = '#00f0ff',
  onClick,
  className = '',
  mini = false,
}) => {
  const isDormant = stage === EGG_STATES.DORMANT
  const isCracking = stage === EGG_STATES.CRACKING
  const isHatching = stage === EGG_STATES.HATCHING
  const isBorn = stage === EGG_STATES.BORN
  const isGrowing = stage === EGG_STATES.GROWING

  const stageClass = `spectre-egg--${stage.toLowerCase()}`
  const cracks = CRACK_LINES[stage] || []
  const showCracks = isCracking || isHatching

  // Node glow color based on stage
  const nodeColor = isDormant ? 'rgba(255,255,255,0.03)' : agentColor
  const nodeOpacity = isDormant ? 0.08 : isCracking ? 0.4 : isHatching ? 0.8 : 0
  const connectionOpacity = isDormant ? 0.04 : isCracking ? 0.2 : isHatching ? 0.5 : 0

  // During BORN/GROWING, don't render the egg shell
  if (isBorn || isGrowing) return null

  const eggSize = mini ? 48 : size

  return (
    <div
      className={`spectre-egg ${stageClass} ${mini ? 'spectre-egg--mini' : ''} ${className}`}
      style={{ width: eggSize, height: eggSize * 1.3 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label="Spectre AI Egg"
    >
      <svg
        viewBox="0 0 100 130"
        width={eggSize}
        height={eggSize * 1.3}
        className="spectre-egg__svg"
      >
        <defs>
          {/* Egg shell gradient */}
          <linearGradient id="eggShellGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="50%" stopColor="#0f0f1a" />
            <stop offset="100%" stopColor="#08080e" />
          </linearGradient>

          {/* Inner glow filter */}
          <radialGradient id="eggInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={agentColor} stopOpacity={isDormant ? 0.03 : isCracking ? 0.08 : 0.15} />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Crack glow filter */}
          <filter id="crackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>

          {/* Outer glow */}
          <filter id="eggOuterGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isDormant ? 2 : isCracking ? 3 : 5} />
          </filter>

          {/* Node glow */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>

          {/* Clip path for egg shape */}
          <clipPath id="eggClip">
            <ellipse cx="50" cy="68" rx="36" ry="48" />
          </clipPath>
        </defs>

        {/* Outer glow */}
        <ellipse
          cx="50" cy="68" rx="36" ry="48"
          fill={agentColor}
          opacity={isDormant ? 0.03 : isCracking ? 0.06 : 0.1}
          filter="url(#eggOuterGlow)"
          className="spectre-egg__outer-glow"
        />

        {/* Egg shell */}
        <ellipse
          cx="50" cy="68" rx="36" ry="48"
          fill="url(#eggShellGrad)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
          className="spectre-egg__shell"
        />

        {/* Inner glow */}
        <ellipse
          cx="50" cy="68" rx="34" ry="46"
          fill="url(#eggInnerGlow)"
          className="spectre-egg__inner-glow"
        />

        {/* Neural network inside egg (clipped) */}
        <g clipPath="url(#eggClip)" className="spectre-egg__neural">
          {/* Connections */}
          {NEURAL_CONNECTIONS.map(([a, b], i) => {
            const n1 = NEURAL_NODES[a]
            const n2 = NEURAL_NODES[b]
            return (
              <line
                key={`conn-${i}`}
                x1={n1.x * 100} y1={n1.y * 130}
                x2={n2.x * 100} y2={n2.y * 130}
                stroke={nodeColor}
                strokeWidth="0.4"
                opacity={connectionOpacity}
                className={`spectre-egg__connection spectre-egg__connection--${i}`}
              />
            )
          })}
          {/* Nodes */}
          {NEURAL_NODES.map((node, i) => (
            <g key={`node-${i}`}>
              {/* Glow behind node */}
              <circle
                cx={node.x * 100} cy={node.y * 130}
                r={isDormant ? 2 : 3}
                fill={nodeColor}
                opacity={nodeOpacity * 0.3}
                filter="url(#nodeGlow)"
                className={`spectre-egg__node-glow spectre-egg__node-glow--${i}`}
              />
              {/* Node */}
              <circle
                cx={node.x * 100} cy={node.y * 130}
                r={isDormant ? 1 : 1.5}
                fill={nodeColor}
                opacity={nodeOpacity}
                className={`spectre-egg__node spectre-egg__node--${i}`}
              />
            </g>
          ))}
        </g>

        {/* Crack lines */}
        {showCracks && cracks.map((path, i) => (
          <g key={`crack-${i}`}>
            {/* Glow behind crack */}
            <path
              d={path}
              fill="none"
              stroke={agentColor}
              strokeWidth="3"
              opacity={isHatching ? 0.4 : 0.2}
              filter="url(#crackGlow)"
              className={`spectre-egg__crack-glow spectre-egg__crack-glow--${i}`}
            />
            {/* Crack line */}
            <path
              d={path}
              fill="none"
              stroke={agentColor}
              strokeWidth="1"
              opacity={isHatching ? 0.8 : 0.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`spectre-egg__crack spectre-egg__crack--${i}`}
            />
          </g>
        ))}

        {/* Subtle top highlight */}
        <ellipse
          cx="44" cy="38"
          rx="10" ry="6"
          fill="rgba(255,255,255,0.02)"
          className="spectre-egg__highlight"
        />
      </svg>
    </div>
  )
}

export default SpectreEgg
