/**
 * Resolve @ project to socials/links (website, Twitter, Discord, Telegram).
 * Uses Codex token details (by address+networkId) and CoinGecko (BTC/ETH/SOL).
 * Crawl project site for roadmap or whitepaper (2 sentences max).
 */
import { getDetailedTokenInfo, searchTokens } from './codexApi'
import { getCoinDetails } from './coinGeckoApi'

/**
 * Crawl project URL for roadmap, whitepaper, or about (summary).
 * Uses /api/project/crawl (Vite proxy in dev, server or Vercel in prod).
 * @param {string} url - Project website (https only)
 * @param {'roadmap'|'whitepaper'|'about'} intent
 * @returns {Promise<{ text: string, intent: string }>}
 */
export async function fetchProjectCrawl(url, intent) {
  const u = `/api/project/crawl?url=${encodeURIComponent(url)}&intent=${encodeURIComponent(intent)}`
  const res = await fetch(u)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Crawl failed: ${res.status}`)
  }
  return res.json()
}

/**
 * Get latest-tweet message for a project's X/Twitter URL (MVP: returns link + message; no live fetch).
 * @param {string} twitterUrl - https://twitter.com/... or https://x.com/...
 * @returns {Promise<{ url: string, message: string }>}
 */
export async function fetchLatestTweet(twitterUrl) {
  const u = `/api/project/latest-tweet?twitterUrl=${encodeURIComponent(twitterUrl)}`
  const res = await fetch(u)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Latest tweet failed: ${res.status}`)
  }
  return res.json()
}

/**
 * AI Agent (Monarch): query + crawl/X/news context → LLM answer.
 * POST /api/ai/answer with { query, context: { name?, crawledText?, latestTweet?, twitterUrl?, website?, headlines? } }
 * @returns {Promise<{ text: string, usedLLM?: boolean }>}
 */
export async function fetchAiAnswer(query, context = {}) {
  const res = await fetch('/api/ai/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: String(query || '').trim(),
      context: {
        name: context.name || null,
        crawledText: context.crawledText || null,
        latestTweet: context.latestTweet || null,
        twitterUrl: context.twitterUrl || null,
        website: context.website || null,
        headlines: Array.isArray(context.headlines) ? context.headlines : null,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `AI answer failed: ${res.status}`)
  }
  return res.json()
}

/** CoinGecko supports details (links) for these symbols only */
const COIN_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' }

/**
 * Get project links for a token.
 * @param {string|{ symbol?: string, address?: string, networkId?: number }} input - Symbol string or { symbol, address, networkId }
 * @returns {Promise<{ website?: string, twitter?: string, discord?: string, telegram?: string, name?: string, symbol?: string } | null>}
 */
export async function getProjectLinks(input) {
  const symbol = typeof input === 'string' ? input?.trim() : input?.symbol?.trim()
  const address = typeof input === 'object' ? input?.address : undefined
  const networkId = typeof input === 'object' ? (input?.networkId ?? 1) : undefined

  // 1) We have address + networkId → Codex token details (has socials)
  if (address && networkId != null) {
    const info = await getDetailedTokenInfo(address, networkId)
    if (!info) return null
    return {
      website: info.socials?.website || null,
      twitter: info.socials?.twitter || null,
      discord: info.socials?.discord || null,
      telegram: info.socials?.telegram || null,
      name: info.name || null,
      symbol: info.symbol || null,
    }
  }

  // 2) Symbol only: try CoinGecko first for BTC/ETH/SOL
  const upper = (symbol || '').toUpperCase()
  if (upper && COIN_IDS[upper]) {
    const details = await getCoinDetails(upper)
    if (!details?.links) return null
    return {
      website: details.links.homepage || null,
      twitter: details.links.twitter || null,
      discord: null,
      telegram: null,
      name: upper,
      symbol: upper,
    }
  }

  // 3) Symbol/name: search Codex, then get details for first result
  if (!symbol) return null
  const searchResult = await searchTokens(symbol)
  const results = searchResult?.filterTokens?.results || []
  const first = results[0]
  const token = first?.token
  if (!token?.address || token.networkId == null) return null

  const info = await getDetailedTokenInfo(token.address, token.networkId)
  if (!info) return null
  return {
    website: info.socials?.website || null,
    twitter: info.socials?.twitter || null,
    discord: info.socials?.discord || null,
    telegram: info.socials?.telegram || null,
    name: info.name || null,
    symbol: info.symbol || null,
  }
}
