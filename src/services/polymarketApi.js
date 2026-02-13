/**
 * Polymarket Gamma API – real-time prediction markets (crypto/BTC/ETH/SOL)
 * https://gamma-api.polymarket.com/events
 * No API key required; filter by token symbol for relevant markets.
 */

const GAMMA_EVENTS_URL = 'https://gamma-api.polymarket.com/events'

const CRYPTO_KEYWORDS = {
  BTC: ['bitcoin', 'btc', 'microstrategy', 'mstr', 'saylor', 'halving', 'etf bitcoin'],
  ETH: ['ethereum', 'eth', 'etf ethereum', 'merge', 'pos'],
  SOL: ['solana', 'sol', 'ftx', 'sbf'],
}

let eventsCache = []
let cacheTime = 0
const CACHE_TTL = 2 * 60 * 1000 // 2 min for "real-time" feel

/**
 * Fetch prediction markets related to the given token (BTC/ETH/SOL).
 * @param {string} symbol - e.g. 'BTC', 'ETH', 'SOL'
 * @param {number} limit - max rows to return
 * @returns {Promise<Array<{ id: string, question: string, yesPct: number, volume: number, volumeFormatted: string, endDate: string, platform: string, url: string }>>}
 */
export async function getPredictionMarketsForToken(symbol, limit = 15) {
  const sym = (symbol || 'BTC').toUpperCase()
  const keywords = CRYPTO_KEYWORDS[sym] || CRYPTO_KEYWORDS.BTC
  const now = Date.now()
  if (eventsCache.length && now - cacheTime < CACHE_TTL) {
    return filterAndFormat(eventsCache, keywords, sym, limit)
  }
  try {
    const res = await fetch(
      `${GAMMA_EVENTS_URL}?closed=false&limit=100&order=id&ascending=false`,
      { method: 'GET', headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const events = Array.isArray(data) ? data : []
    eventsCache = events
    cacheTime = now
    return filterAndFormat(events, keywords, sym, limit)
  } catch (err) {
    console.warn('Polymarket prediction markets fetch failed:', err)
    return eventsCache.length ? filterAndFormat(eventsCache, keywords, sym, limit) : []
  }
}

function filterAndFormat(events, keywords, symbol, limit) {
  const out = []
  const seen = new Set()
  for (const event of events) {
    const title = (event.title || '').toLowerCase()
    const hasKeyword = keywords.some((k) => title.includes(k))
    const tagSlugs = (event.tags || []).map((t) => (t.slug || '').toLowerCase())
    const hasCryptoTag = tagSlugs.some((s) => s === 'crypto' || s === 'bitcoin' || s === 'ethereum' || s === 'solana')
    if (!hasKeyword && !hasCryptoTag) continue
    const markets = event.markets || []
    for (const m of markets) {
      if (m.closed) continue
      const question = m.question || event.title || ''
      const key = question.slice(0, 80)
      if (seen.has(key)) continue
      seen.add(key)
      let yesPct = 50
      try {
        const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]')
        const yesPrice = parseFloat(prices[0])
        if (Number.isFinite(yesPrice)) yesPct = Math.round(yesPrice * 100)
      } catch (_) {}
      const vol = parseFloat(m.volume) || parseFloat(m.volumeNum) || 0
      const endDate = m.endDate || event.endDate || ''
      const endStr = endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' }) : '—'
      const slug = m.slug || event.slug || ''
      const url = slug ? `https://polymarket.com/event/${event.slug}` : 'https://polymarket.com'
      out.push({
        id: `${event.id}-${m.id}`,
        question,
        yesPct,
        volume: vol,
        volumeFormatted: formatVol(vol),
        endDate: endStr,
        platform: 'Polymarket',
        url,
      })
      if (out.length >= limit) break
    }
    if (out.length >= limit) break
  }
  return out.slice(0, limit)
}

function formatVol(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return n.toFixed(0)
}

export default { getPredictionMarketsForToken }
