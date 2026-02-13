/**
 * EggStateManager
 * State machine + localStorage persistence for the Spectre Egg system.
 * States: DORMANT → CRACKING → HATCHING → BORN → GROWING
 */

const STORAGE_KEY = 'spectreEgg'
const AGENT_STORAGE_KEY = 'spectreAgent'

// Egg states
export const EGG_STATES = {
  DORMANT: 'DORMANT',
  CRACKING: 'CRACKING',
  HATCHING: 'HATCHING',
  BORN: 'BORN',
  GROWING: 'GROWING',
}

// Interaction thresholds
const CRACKING_THRESHOLD = 3
const HATCHING_THRESHOLD = 8

// Interaction weights
export const INTERACTION_WEIGHTS = {
  search: 1,
  pageView: 0.5,
  chartInteraction: 1,
  agentChat: 2,
  watchlistAdd: 2,
  researchRead: 3,
  prediction: 5,
  shareContent: 3,
  dailyLogin: 5,
  settingsChange: 1,
}

// Default egg state
function getDefaultEggState() {
  return {
    state: EGG_STATES.DORMANT,
    started: false,
    interactions: {
      searches: 0,
      pageViews: 0,
      clicks: 0,
      total: 0,
    },
    createdAt: null,
    startedAt: null,
    crackedAt: null,
    hatchingAt: null,
    bornAt: null,
  }
}

// Read egg state from localStorage
export function getEggState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...getDefaultEggState(), ...parsed }
    }
  } catch (e) {
    console.warn('Failed to read egg state:', e)
  }
  return getDefaultEggState()
}

// Write egg state to localStorage
export function saveEggState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save egg state:', e)
  }
  return state
}

// Start the egg journey (user clicked "Start Hatching")
export function startEgg() {
  const current = getEggState()
  if (current.state !== EGG_STATES.DORMANT) return current

  const updated = {
    ...current,
    state: EGG_STATES.CRACKING,
    started: true,
    createdAt: current.createdAt || new Date().toISOString(),
    startedAt: new Date().toISOString(),
  }
  return saveEggState(updated)
}

// Track an interaction and potentially advance egg state
export function trackEggInteraction(type = 'clicks') {
  const current = getEggState()
  if (!current.started) return current
  if (current.state === EGG_STATES.BORN || current.state === EGG_STATES.GROWING) {
    // After birth, track interactions on the agent profile instead
    trackAgentInteraction(type)
    return current
  }

  const weight = INTERACTION_WEIGHTS[type] || 1
  const interactions = { ...current.interactions }

  // Increment the specific type
  if (type === 'search' || type === 'searches') interactions.searches += 1
  else if (type === 'pageView' || type === 'pageViews') interactions.pageViews += 1
  else interactions.clicks += 1

  interactions.total = (interactions.total || 0) + weight

  let newState = current.state
  const now = new Date().toISOString()
  const timestamps = {}

  // State transitions based on total weighted interactions
  if (current.state === EGG_STATES.CRACKING && interactions.total >= HATCHING_THRESHOLD) {
    newState = EGG_STATES.HATCHING
    timestamps.hatchingAt = now
  } else if (current.state === EGG_STATES.DORMANT && interactions.total >= CRACKING_THRESHOLD) {
    newState = EGG_STATES.CRACKING
    timestamps.crackedAt = now
  }

  // CRACKING check (for started eggs that haven't cracked yet)
  if (current.state === EGG_STATES.CRACKING && !current.crackedAt) {
    timestamps.crackedAt = now
  }

  const updated = {
    ...current,
    state: newState,
    interactions,
    ...timestamps,
  }
  return saveEggState(updated)
}

// Force egg to hatch (e.g., user answered first personalization question)
export function forceHatch() {
  const current = getEggState()
  if (current.state === EGG_STATES.BORN || current.state === EGG_STATES.GROWING) return current

  const updated = {
    ...current,
    state: EGG_STATES.HATCHING,
    started: true,
    hatchingAt: new Date().toISOString(),
  }
  return saveEggState(updated)
}

// Mark the egg as born (after hatch animation completes)
export function markBorn() {
  const current = getEggState()
  const updated = {
    ...current,
    state: EGG_STATES.BORN,
    bornAt: new Date().toISOString(),
  }
  return saveEggState(updated)
}

// Transition from BORN to GROWING (after birth conversation completes)
export function markGrowing() {
  const current = getEggState()
  const updated = {
    ...current,
    state: EGG_STATES.GROWING,
  }
  return saveEggState(updated)
}

// Track interaction on the agent profile (post-birth)
function trackAgentInteraction(type) {
  try {
    const raw = localStorage.getItem(AGENT_STORAGE_KEY)
    if (!raw) return
    const profile = JSON.parse(raw)
    const weight = INTERACTION_WEIGHTS[type] || 1
    profile.interactions = (profile.interactions || 0) + weight
    profile.level = Math.floor(profile.interactions / 50) + 1
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(profile))
  } catch (e) {
    console.warn('Failed to track agent interaction:', e)
  }
}

// Get progress percentage toward hatching
export function getEggProgress(eggState) {
  if (!eggState || !eggState.started) return 0
  if (eggState.state === EGG_STATES.BORN || eggState.state === EGG_STATES.GROWING) return 100
  const total = eggState.interactions?.total || 0
  return Math.min(Math.round((total / HATCHING_THRESHOLD) * 100), 100)
}

// Reset egg (for development/testing)
export function resetEgg() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(AGENT_STORAGE_KEY)
  return getDefaultEggState()
}
