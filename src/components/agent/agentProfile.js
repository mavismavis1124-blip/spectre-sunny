/**
 * Agent Profile — Type assignment, colors, and profile management
 */

const AGENT_STORAGE_KEY = 'spectreAgent'

export const AGENT_TYPES = {
  Phantom: { color: '#00f0ff', desc: 'I specialize in finding what nobody else has found yet. Stealth signals. Hidden alpha. The invisible edge.' },
  Oracle:  { color: '#c084fc', desc: 'I read the crowd. Sentiment shifts. Social signals. I know what the market feels before it moves.' },
  Cipher:  { color: '#fbbf24', desc: 'Numbers don\'t lie. I find statistical edges, patterns, and quantitative setups that repeat.' },
  Herald:  { color: '#f87171', desc: 'Speed is everything. I intercept news and developments before they hit your feed.' },
  Titan:   { color: '#4ade80', desc: 'I protect the portfolio. Risk management. Exposure analysis. I make sure you survive to play tomorrow.' },
  Wraith:  { color: '#22d3ee', desc: 'I\'m a generalist — good at everything, great at adapting. I\'ll develop my specialty as I learn more about you.' },
}

export const AGENT_COLORS = {
  Phantom: '#00f0ff',
  Oracle: '#c084fc',
  Cipher: '#fbbf24',
  Herald: '#f87171',
  Titan: '#4ade80',
  Wraith: '#22d3ee',
}

/**
 * Assign agent type based on user's answers
 */
export function assignAgentType(answers) {
  const { motivation, markets, infoStyle, riskProfile } = answers

  // Phantom — the alpha hunter
  if (motivation === '100x' && (riskProfile === 'aggressive' || riskProfile === 'degen')) return 'Phantom'
  if (markets === 'altcoins' && infoStyle === 'quick') return 'Phantom'

  // Oracle — the sentiment reader
  if (motivation === 'informed' && infoStyle === 'deep') return 'Oracle'
  if (infoStyle === 'deep' && riskProfile === 'moderate') return 'Oracle'

  // Cipher — the quant
  if (motivation === 'portfolio' && infoStyle === 'visual') return 'Cipher'
  if (infoStyle === 'visual' && riskProfile === 'moderate') return 'Cipher'

  // Herald — the speed demon
  if (infoStyle === 'quick' && (motivation === 'informed' || motivation === '100x')) return 'Herald'
  if (markets === 'memecoins' && infoStyle === 'quick') return 'Herald'

  // Titan — the guardian
  if (riskProfile === 'conservative') return 'Titan'
  if (motivation === 'portfolio' && riskProfile === 'moderate') return 'Titan'

  // Wraith — the newcomer
  if (markets === 'new') return 'Wraith'

  // Default fallback based on risk
  if (riskProfile === 'degen') return 'Phantom'
  if (riskProfile === 'aggressive') return 'Herald'
  if (riskProfile === 'moderate') return 'Oracle'
  return 'Wraith'
}

/**
 * Get level from interactions count
 */
export function getLevel(interactions) {
  return Math.floor((interactions || 0) / 50) + 1
}

/**
 * Get level label
 */
export function getLevelLabel(level) {
  if (level >= 5) return 'Apex'
  if (level >= 4) return 'Ascended'
  if (level >= 3) return 'Mature'
  if (level >= 2) return 'Developing'
  return 'Hatchling'
}

/**
 * Create a full agent profile from birth answers
 */
export function createAgentProfile(answers) {
  const agentType = assignAgentType(answers)
  const agentColor = AGENT_COLORS[agentType]

  return {
    born: true,
    bornAt: new Date().toISOString(),
    motivation: answers.motivation,
    markets: answers.markets,
    infoStyle: answers.infoStyle,
    riskProfile: answers.riskProfile,
    agentType,
    agentColor,
    level: 1,
    interactions: 0,
  }
}

/**
 * Save agent profile to localStorage
 */
export function saveAgentProfile(profile) {
  try {
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(profile))
  } catch (e) {
    console.warn('Failed to save agent profile:', e)
  }
  return profile
}

/**
 * Get agent profile from localStorage
 */
export function getAgentProfile() {
  try {
    const raw = localStorage.getItem(AGENT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to read agent profile:', e)
  }
  return null
}

/**
 * Track interaction on agent profile
 */
export function trackAgentInteraction(type, weight = 1) {
  const profile = getAgentProfile()
  if (!profile) return null
  profile.interactions = (profile.interactions || 0) + weight
  profile.level = getLevel(profile.interactions)
  saveAgentProfile(profile)
  return profile
}
