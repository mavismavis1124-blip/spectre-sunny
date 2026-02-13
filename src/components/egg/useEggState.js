/**
 * useEggState Hook
 * React hook for egg state across components.
 */
import { useState, useCallback, useEffect } from 'react'
import {
  getEggState,
  startEgg,
  trackEggInteraction,
  forceHatch,
  markBorn,
  markGrowing,
  getEggProgress,
  resetEgg,
  EGG_STATES,
} from './EggStateManager'

export { EGG_STATES }

export default function useEggState() {
  const [eggState, setEggState] = useState(() => getEggState())

  // Re-sync from localStorage on storage events (cross-tab sync)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'spectreEgg') {
        setEggState(getEggState())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const start = useCallback(() => {
    const updated = startEgg()
    setEggState(updated)
    return updated
  }, [])

  const track = useCallback((type) => {
    const updated = trackEggInteraction(type)
    setEggState(updated)
    return updated
  }, [])

  const hatch = useCallback(() => {
    const updated = forceHatch()
    setEggState(updated)
    return updated
  }, [])

  const born = useCallback(() => {
    const updated = markBorn()
    setEggState(updated)
    return updated
  }, [])

  const grow = useCallback(() => {
    const updated = markGrowing()
    setEggState(updated)
    return updated
  }, [])

  const reset = useCallback(() => {
    const updated = resetEgg()
    setEggState(updated)
    return updated
  }, [])

  const progress = getEggProgress(eggState)

  return {
    eggState,
    stage: eggState.state,
    started: eggState.started,
    progress,
    isPreBirth: [EGG_STATES.DORMANT, EGG_STATES.CRACKING, EGG_STATES.HATCHING].includes(eggState.state),
    isBorn: eggState.state === EGG_STATES.BORN || eggState.state === EGG_STATES.GROWING,
    start,
    track,
    hatch,
    born,
    grow,
    reset,
  }
}
