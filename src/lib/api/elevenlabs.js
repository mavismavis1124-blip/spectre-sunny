/**
 * ElevenLabs Integration - AI Voice Market Briefs
 * Generates audio market briefs for crypto tokens
 */

// ElevenLabs voice ID for Spectre AI analyst persona
const SPECTRE_VOICE_ID = 'pNInz6obpgDQGcFmaJgB' // Adam voice - professional, confident

// API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

// Cache for generated audio
const audioCache = new Map()

/**
 * Generate market brief text for a token
 */
export const generateBriefText = (token) => {
  const { symbol, name, price, change24h, marketCap, volume, sentiment } = token

  const changeDirection = change24h >= 0 ? 'up' : 'down'
  const changeAbs = Math.abs(change24h).toFixed(2)
  const sentimentLabel = sentiment >= 70 ? 'bullish' : sentiment <= 30 ? 'bearish' : 'neutral'

  const formatNumber = (num) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} trillion`
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} billion`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)} million`
    return num.toLocaleString()
  }

  return `
    ${name} Market Brief from Spectre AI.

    ${symbol} is currently trading at ${price < 1 ? price.toFixed(6) : price.toLocaleString()} dollars,
    ${changeDirection} ${changeAbs} percent over the last 24 hours.

    The market cap stands at ${formatNumber(marketCap)} dollars,
    with trading volume of ${formatNumber(volume)} in the past day.

    Market sentiment for ${symbol} is currently ${sentimentLabel},
    ${sentiment >= 70
      ? 'indicating strong buying pressure and positive momentum.'
      : sentiment <= 30
        ? 'suggesting caution as selling pressure dominates.'
        : 'with balanced buying and selling activity.'}

    ${change24h >= 5
      ? `Notable: ${symbol} is showing significant upward momentum today.`
      : change24h <= -5
        ? `Alert: ${symbol} is experiencing notable downward pressure.`
        : ''}

    This has been your Spectre AI market update.
  `.trim().replace(/\s+/g, ' ')
}

/**
 * Generate audio from text using ElevenLabs
 */
export const generateAudio = async (text, voiceId = SPECTRE_VOICE_ID) => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY

  if (!apiKey) {
    console.warn('ElevenLabs API key not configured')
    return null
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const audioBlob = await response.blob()
    return URL.createObjectURL(audioBlob)
  } catch (error) {
    console.error('Failed to generate audio:', error)
    return null
  }
}

/**
 * Get or generate market brief audio for a token
 */
export const getTokenBriefAudio = async (token) => {
  const cacheKey = `${token.symbol}-${Date.now().toString().slice(0, -5)}` // Cache for ~100 seconds

  // Check cache
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)
  }

  // Generate text and audio
  const briefText = generateBriefText(token)
  const audioUrl = await generateAudio(briefText)

  if (audioUrl) {
    audioCache.set(cacheKey, audioUrl)

    // Clean old cache entries (keep last 10)
    if (audioCache.size > 10) {
      const firstKey = audioCache.keys().next().value
      audioCache.delete(firstKey)
    }
  }

  return audioUrl
}

/**
 * Play audio brief for a token
 */
export const playTokenBrief = async (token, onStart, onEnd) => {
  const audioUrl = await getTokenBriefAudio(token)

  if (!audioUrl) {
    console.warn('No audio available for token brief')
    return null
  }

  const audio = new Audio(audioUrl)

  audio.addEventListener('play', () => onStart?.())
  audio.addEventListener('ended', () => onEnd?.())
  audio.addEventListener('error', () => onEnd?.())

  await audio.play()
  return audio
}

/**
 * Get available voices from ElevenLabs
 */
export const getVoices = async () => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY

  if (!apiKey) {
    return []
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const data = await response.json()
    return data.voices || []
  } catch (error) {
    console.error('Failed to fetch voices:', error)
    return []
  }
}

export default {
  generateBriefText,
  generateAudio,
  getTokenBriefAudio,
  playTokenBrief,
  getVoices,
}
