/**
 * Agent Responses — Pre-written contextual responses for before Claude API is connected
 */

// Birth conversation contextual responses
export const birthResponses = {
  motivation: {
    '100x': 'A hunter. I respect that. I\'ll focus on finding you early-stage gems and momentum plays before the crowd catches on.',
    'research': 'Smart. The best traders do their homework. I\'ll make sure you never miss a key data point.',
    'informed': 'Knowledge is edge. I\'ll keep you updated on everything that matters — and filter out everything that doesn\'t.',
    'portfolio': 'Builder mindset. I\'ll help you construct and monitor a portfolio that actually makes sense for your goals.',
  },
  markets: {
    'majors': 'BTC and ETH — the blue chips. I\'ll track macro trends, whale movements, and key levels for you.',
    'altcoins': 'Altcoin territory. That\'s where the real alpha is. I\'ll scan for accumulation patterns and catalyst events.',
    'memecoins': 'The casino floor. I\'ll help you play it smart — find the ones with real momentum before the rugs.',
    'stocks_crypto': 'Cross-market player. I\'ll watch correlations and flag when crypto and equities diverge — that\'s often where the edge is.',
    'new': 'No problem. I\'ll start broad and narrow down as I learn what interests you. Just explore — I\'m watching.',
  },
  infoStyle: {
    'quick': 'Noted. Short and sharp. No fluff. You\'ll get the headline, not the essay.',
    'deep': 'You want the full picture. I\'ll give you context, history, and the data behind every call.',
    'action': 'Direct. I like it. I\'ll tell you what I think you should do and why. You decide.',
    'visual': 'Charts first, words second. I\'ll lead with the data you can see.',
  },
  riskProfile: {
    'conservative': 'Protecting capital is priority one. I\'ll always flag downside before upside.',
    'moderate': 'Balanced. I\'ll find you calculated risks where the math makes sense.',
    'aggressive': 'You want to move fast. I\'ll match that energy — but I\'ll still tell you when something looks off.',
    'degen': 'Full send. I\'m with you in the trenches. But I\'m the smart voice in your ear when things get wild.',
  },
}

// Agent type final birth message
export const agentTypeDescs = {
  Phantom: 'I specialize in finding what nobody else has found yet. Stealth signals. Hidden alpha. The invisible edge.',
  Oracle: 'I read the crowd. Sentiment shifts. Social signals. I know what the market feels before it moves.',
  Cipher: 'Numbers don\'t lie. I find statistical edges, patterns, and quantitative setups that repeat.',
  Herald: 'Speed is everything. I intercept news and developments before they hit your feed.',
  Titan: 'I protect the portfolio. Risk management. Exposure analysis. I make sure you survive to play tomorrow.',
  Wraith: 'I\'m a generalist — good at everything, great at adapting. I\'ll develop my specialty as I learn more about you.',
}

export function getBirthFinalMessage(profile) {
  const desc = agentTypeDescs[profile.agentType] || agentTypeDescs.Wraith
  return `Got it. I know enough to start. I'm a ${profile.agentType} — ${desc} Let's find some alpha.`
}

// Greetings by risk profile x info style
export const greetings = {
  'aggressive_quick': [
    'What are we hunting today?',
    'Markets are moving. What caught your eye?',
    'I\'ve been scanning. Got a few things. What do you want first?',
  ],
  'aggressive_deep': [
    'I\'ve been running through the charts. A few setups look interesting — want the full breakdown?',
    'There\'s been some unusual on-chain activity overnight. Let me walk you through it.',
  ],
  'aggressive_action': [
    'Three setups on my radar. Want me to rank them by conviction?',
    'I\'ve got a play. Want to hear it?',
  ],
  'aggressive_visual': [
    'Charts are telling a story today. Want to see the setups?',
    'Volume patterns shifted. I\'ll pull up the visuals.',
  ],
  'conservative_quick': [
    'Markets are steady. Nothing urgent in your portfolio.',
    'All positions look healthy. Want a quick scan of anything?',
  ],
  'conservative_deep': [
    'I\'ve been monitoring your positions. Everything\'s within tolerance. Want the detailed breakdown?',
    'Some macro developments worth watching. Nothing actionable yet, but I want you to be aware.',
  ],
  'conservative_action': [
    'No urgent moves needed. Portfolio is well-positioned.',
    'A couple of small adjustments could improve risk exposure. Want details?',
  ],
  'conservative_visual': [
    'Your portfolio chart is trending steady. Want to see the breakdown?',
    'Risk metrics look good. I\'ll show you the numbers.',
  ],
  'moderate_quick': [
    'Good to see you. A few things on my radar today.',
    'Markets are interesting today. Want the highlights?',
  ],
  'moderate_deep': [
    'I\'ve been tracking a few developments. Some worth acting on, some worth watching. Let me break it down.',
    'Market structure shifted slightly overnight. Here\'s what I think it means.',
  ],
  'moderate_action': [
    'One solid setup today. Risk/reward checks out. Want details?',
    'Market is giving mixed signals. I\'d hold tight on new positions. Here\'s why.',
  ],
  'moderate_visual': [
    'Charts are showing some interesting patterns. Want the visual breakdown?',
    'Key levels to watch today — I\'ll pull them up.',
  ],
  'degen_quick': [
    'Something\'s cooking. You\'re going to want to see this.',
    'Whale alert. Big wallet just loaded up. Interested?',
  ],
  'degen_deep': [
    'New meta forming. I\'ve been digging into the on-chain data and there\'s a pattern emerging.',
    'Five contracts deployed in the last hour from connected wallets. Could be something.',
  ],
  'degen_action': [
    'Found a setup. 10x potential but it\'s sketchy. Want the details?',
    'New token launch. Team is anon but the contract looks clean. Worth a small bag?',
  ],
  'degen_visual': [
    'Chart just printed the setup. This looks like early stage breakout.',
    'Liquidity flow chart shows accumulation. I\'ll show you.',
  ],
}

// Get a greeting based on the user's profile
export function getGreeting(profile) {
  if (!profile) return 'Hey. What are you looking at today?'
  const key = `${profile.riskProfile}_${profile.infoStyle}`
  const options = greetings[key] || greetings['moderate_quick']
  return options[Math.floor(Math.random() * options.length)]
}

// Proactive messages
export const proactiveMessages = {
  first_search: {
    quick: 'I see you\'re looking into {token}. Want me to keep tracking it?',
    deep: 'Interesting — {token}. I can pull on-chain data, recent sentiment shifts, and whale activity if you want the full picture.',
    action: '{token} — my take: worth watching. Want entry levels?',
    visual: 'Here\'s what {token} looks like right now — let me pull up the chart.',
  },
  returning_user: {
    quick: 'You were away for a bit. Here\'s what moved.',
    deep: 'Welcome back. A few things happened while you were away.',
    action: 'You missed a move. Still time to enter? Let me check.',
  },
}

// ─── Context-aware suggestions & greeting ───

const PAGE_LABELS = {
  'research-platform': 'Research Platform',
  'discover': 'Discover',
  'research-zone': 'Research Zone',
  'search-engine': 'Search Engine',
  'ai-screener': 'AI Screener',
  'watchlists': 'Watchlists',
  'glossary': 'Glossary',
  'fear-greed': 'Fear & Greed',
  'social-zone': 'Social Zone',
  'ai-media-center': 'Media Center',
  'x-dash': 'X Dash',
  'x-bubbles': 'X Bubbles',
  'ai-charts': 'AI Charts',
  'heatmaps': 'Heatmaps',
  'bubbles': 'Bubbles',
  'categories': 'Categories',
  'ai-market-analysis': 'AI Market Analysis',
  'market-analytics': 'Market Analytics',
}

/**
 * Generate a smart context-aware greeting when the agent opens
 */
export function getContextGreeting(profile, ctx) {
  if (!profile || !ctx) return getGreeting(profile)
  const { currentPage, selectedToken, watchlist, currentView } = ctx
  const isQuick = profile.infoStyle === 'quick' || profile.infoStyle === 'action'
  const sym = selectedToken?.symbol || 'BTC'
  const pageName = PAGE_LABELS[currentPage] || currentPage

  // On Research Zone viewing a token
  if (currentPage === 'research-zone') {
    return isQuick
      ? `You're looking at ${sym}. Need a quick take?`
      : `I see you're researching ${sym}. I've been tracking it — want my analysis or are you comparing something?`
  }
  // On the main dashboard
  if (currentPage === 'research-platform' && currentView === 'welcome') {
    if (watchlist && watchlist.length > 0) {
      const syms = watchlist.slice(0, 3).map(t => t.symbol).join(', ')
      return isQuick
        ? `Your watchlist: ${syms}. Want updates or looking at something new?`
        : `I've been monitoring your watchlist — ${syms}. A few things moved. Want the rundown, or are you exploring something new?`
    }
    return isQuick
      ? 'What are you tracking today?'
      : 'Hey. Markets are open. Want a quick brief, or are you looking for something specific?'
  }
  // On token detail page
  if (currentView === 'token') {
    return isQuick
      ? `${sym} — want levels, sentiment, or something else?`
      : `You've got ${sym} open. I can break down the chart, give you sentiment data, or check for whale activity. What do you need?`
  }
  // On Fear & Greed
  if (currentPage === 'fear-greed') {
    return 'Sentiment matters. Want me to break down what the Fear & Greed index means for your positions right now?'
  }
  // On Heatmaps / Bubbles / Charts
  if (['heatmaps', 'bubbles', 'ai-charts'].includes(currentPage)) {
    return isQuick
      ? 'Visuals up. Seeing anything interesting?'
      : `You're on ${pageName}. I can help interpret what you're seeing — or suggest what to look for.`
  }
  // On watchlists
  if (currentPage === 'watchlists') {
    return 'Your portfolio view. Want me to scan your holdings for anything notable?'
  }
  // Default
  return getGreeting(profile)
}

/**
 * Generate context-aware suggestion chips
 * Returns array of { label, action, icon? }
 */
export function getContextSuggestions(profile, ctx) {
  if (!ctx) return getDefaultSuggestions(profile)
  const { currentPage, selectedToken, watchlist, currentView, marketMode } = ctx
  const sym = selectedToken?.symbol || 'BTC'
  const suggestions = []

  // Always-available suggestions based on profile
  if (profile?.riskProfile === 'degen' || profile?.riskProfile === 'aggressive') {
    suggestions.push({ label: '🔥 What\'s pumping?', action: 'whats_pumping', id: 'pumping' })
  }

  // Token-aware suggestions
  if (currentPage === 'research-zone' || currentView === 'token') {
    suggestions.push(
      { label: `📊 Analyze ${sym}`, action: 'analyze_token', id: 'analyze' },
      { label: `📈 Key levels for ${sym}`, action: 'key_levels', id: 'levels' },
      { label: '🐋 Whale activity', action: 'whale_activity', id: 'whales' },
    )
  }

  // Dashboard suggestions
  if (currentPage === 'research-platform' && currentView === 'welcome') {
    suggestions.push(
      { label: '📋 Market brief', action: 'market_brief', id: 'brief' },
      { label: '🔍 Find a token', action: 'find_token', id: 'find' },
    )
    if (watchlist && watchlist.length > 0) {
      suggestions.push({ label: '👀 Watchlist check', action: 'watchlist_check', id: 'wl_check' })
    }
    if (profile?.riskProfile !== 'conservative') {
      suggestions.push({ label: '💎 Hidden gems', action: 'hidden_gems', id: 'gems' })
    }
  }

  // Watchlist page
  if (currentPage === 'watchlists' && watchlist && watchlist.length > 0) {
    suggestions.push(
      { label: '📊 Portfolio scan', action: 'portfolio_scan', id: 'scan' },
      { label: '⚠️ Any risks?', action: 'risk_check', id: 'risks' },
      { label: '📈 Best performer', action: 'best_performer', id: 'best' },
    )
  }

  // Fear & Greed
  if (currentPage === 'fear-greed') {
    suggestions.push(
      { label: '🧠 What does this mean?', action: 'explain_fg', id: 'explain_fg' },
      { label: '📊 Historical context', action: 'fg_history', id: 'fg_hist' },
    )
  }

  // Charts / Heatmaps
  if (['heatmaps', 'bubbles', 'ai-charts'].includes(currentPage)) {
    suggestions.push(
      { label: '👁️ What am I seeing?', action: 'explain_visual', id: 'explain_vis' },
      { label: '📊 Sector breakdown', action: 'sector_breakdown', id: 'sectors' },
    )
  }

  // Social Zone
  if (currentPage === 'social-zone' || currentPage === 'x-dash') {
    suggestions.push(
      { label: '📡 Trending narratives', action: 'trending_narratives', id: 'narratives' },
      { label: '🗣️ Social sentiment', action: 'social_sentiment', id: 'social' },
    )
  }

  // Discover
  if (currentPage === 'discover') {
    suggestions.push(
      { label: '🆕 What\'s new?', action: 'whats_new', id: 'new' },
      { label: '🏷️ Trending categories', action: 'trending_categories', id: 'categories' },
    )
  }

  // General fallbacks to ensure at least 3 suggestions
  if (suggestions.length < 2) {
    suggestions.push(...getDefaultSuggestions(profile))
  }

  // Deduplicate and limit to 4
  const seen = new Set()
  return suggestions.filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  }).slice(0, 4)
}

function getDefaultSuggestions(profile) {
  const isAggressive = profile?.riskProfile === 'aggressive' || profile?.riskProfile === 'degen'
  return [
    { label: '📋 Market brief', action: 'market_brief', id: 'brief' },
    isAggressive
      ? { label: '🔥 What\'s pumping?', action: 'whats_pumping', id: 'pumping' }
      : { label: '🔍 Find a token', action: 'find_token', id: 'find' },
    { label: '❓ What can you do?', action: 'capabilities', id: 'help' },
  ]
}

/**
 * Get a response for a suggestion chip click
 */
export function getSuggestionResponse(actionId, profile, ctx) {
  const sym = ctx?.selectedToken?.symbol || 'BTC'
  const isQuick = profile?.infoStyle === 'quick' || profile?.infoStyle === 'action'
  const wlSyms = (ctx?.watchlist || []).slice(0, 5).map(t => t.symbol).join(', ')

  const responses = {
    analyze_token: isQuick
      ? `${sym}: Structure looks intact. Key support holding. Volume is average. No red flags — watching for a catalyst.`
      : `${sym} analysis: Price structure is maintaining higher lows. Volume has been consolidating, which typically precedes a move. On-chain metrics show steady accumulation from smart money wallets. Sentiment is neutral-to-bullish. Key thing to watch: if volume picks up with a break above recent resistance, that's your signal.`,

    key_levels: isQuick
      ? `${sym} — watching the 20-day MA as support. Resistance at recent highs. Break either way and we move.`
      : `Key levels for ${sym}: I'm tracking the 20-day and 50-day moving averages as dynamic support zones. The major horizontal resistance is at the recent swing high. If price holds above the 20-day MA on any pullback, the trend stays intact. A break below the 50-day would shift me cautious.`,

    whale_activity: isQuick
      ? 'Large wallets have been steady — no major dumps or accumulation spikes in the last 24h.'
      : 'Whale activity report: Large holders (1000+ BTC wallets) have been net accumulators over the past week. Exchange inflows remain low, suggesting holders aren\'t looking to sell. One wallet moved a significant amount to cold storage — usually a bullish signal.',

    market_brief: isQuick
      ? 'BTC holding key levels. ETH outperforming slightly. Altcoin market mixed — a few sectors showing strength. Fear & Greed is low, which historically has been a buying zone.'
      : 'Market brief: Bitcoin is consolidating near key levels with declining volatility — a setup that usually resolves with a sharp move. Ethereum is showing relative strength with increasing L2 activity. The broader altcoin market is mixed, with AI and DePIN tokens outperforming. Fear & Greed index is in fear territory, which contrasts with the accumulation patterns I\'m seeing on-chain.',

    find_token: 'Tell me what you\'re looking for — a specific token, a sector (like AI, DePIN, L2s), or a setup (like tokens near support, breakout candidates). I\'ll help you narrow it down.',

    watchlist_check: wlSyms
      ? `Watchlist scan — ${wlSyms}: All positions are within normal ranges. No unusual volume spikes or whale movements detected. I'll flag anything that changes.`
      : 'Your watchlist is empty. Start adding tokens and I\'ll keep an eye on them for you.',

    whats_pumping: 'Top movers right now: Check the heatmaps for the full picture. Memecoins are seeing volume spikes, and a few AI tokens are breaking out of ranges. Want me to focus on any sector?',

    hidden_gems: 'I\'m tracking a few low-cap tokens with increasing holder counts and developer activity. These are early-stage — high risk but the fundamentals are building. Want me to flag them as they hit key technical levels?',

    portfolio_scan: wlSyms
      ? `Portfolio scan for ${wlSyms}: Overall exposure looks balanced. No single position is dominating risk. I'd watch for correlation — if the market dips, most of these will move together.`
      : 'Add tokens to your watchlist and I\'ll analyze your portfolio exposure, risk distribution, and correlation.',

    risk_check: 'Risk assessment: Market volatility is moderate. No major liquidation cascades detected. Your positions look healthy, but keep an eye on leverage across the market — high open interest can amplify moves.',

    best_performer: wlSyms
      ? 'Checking your watchlist for the strongest performer on multiple timeframes... Check the 24H and 7D columns in your watchlist for a quick comparison. I\'ll alert you when any token makes a significant move.'
      : 'Add tokens to your watchlist first — I\'ll track performance across timeframes.',

    explain_fg: 'The Fear & Greed Index measures market sentiment from 0 (Extreme Fear) to 100 (Extreme Greed). Low readings historically correlate with buying opportunities — when everyone is scared, that\'s often when smart money accumulates. But it\'s not a timing tool on its own. Combine it with price action and volume.',

    fg_history: 'Historically, readings below 20 have preceded major rallies within 1-3 months. Readings above 80 have preceded corrections. The tricky part is timing — fear can persist longer than you expect. Use it as one signal among many.',

    explain_visual: 'You\'re looking at market visualization data. Green = positive performance, Red = negative. Bigger = higher market cap. Look for clusters of green in specific sectors — that tells you where money is rotating. Isolated red in a green market could be a specific problem or a buying opportunity.',

    sector_breakdown: 'Sector overview: Layer 1s are mixed — BTC and ETH stable, smaller L1s lagging. DeFi is seeing renewed interest with TVL climbing. AI tokens continue to outperform as the narrative stays strong. Memecoins are volatile as always — pick your spots carefully.',

    trending_narratives: 'Top narratives right now: AI integration in crypto is still the dominant theme. Real World Assets (RWA) tokenization is gaining institutional attention. DePIN projects are showing real user growth. The memecoin meta rotates fast — don\'t chase, wait for setups.',

    social_sentiment: 'Social pulse: Crypto Twitter is cautiously bullish. The loudest voices are focused on AI tokens and a few memecoin plays. Contrarian signal: when everyone agrees on direction, be careful. The best opportunities are often in what nobody\'s talking about.',

    whats_new: 'New on the radar: Several token launches this week worth watching. A few established projects have major upgrades coming. Check the Discover page for categorized listings — I\'ll highlight anything that matches your profile.',

    trending_categories: 'Trending categories: AI & Machine Learning tokens, Real World Assets (RWA), Liquid Staking Derivatives (LSD), and Gaming/Metaverse tokens are all seeing increased volume. DePIN is the sleeper category with strong fundamentals.',

    capabilities: `Here's what I can help with:\n\n• Analyze any token — price action, sentiment, whale activity\n• Market brief — quick overview of what's happening\n• Watchlist monitoring — I track your tokens\n• Find opportunities — based on your ${profile?.riskProfile || 'moderate'} risk style\n• Explain what you're seeing on any page\n\nJust ask, or tap a suggestion.`,
  }

  return responses[actionId] || 'Let me look into that. What specifically do you want to know?'
}

// Static chat responses based on user input keywords
export function getStaticResponse(userMessage, profile) {
  const msg = (userMessage || '').toLowerCase()
  const isAggressive = profile?.riskProfile === 'aggressive' || profile?.riskProfile === 'degen'
  const isQuick = profile?.infoStyle === 'quick' || profile?.infoStyle === 'action'

  if (msg.includes('bitcoin') || msg.includes('btc')) {
    return isQuick
      ? 'BTC is king. Watching the key levels — I\'ll flag if anything breaks.'
      : 'Bitcoin is holding its structure well. On-chain data shows accumulation from large wallets. Key support and resistance levels haven\'t changed — I\'m watching for a decisive move.'
  }
  if (msg.includes('ethereum') || msg.includes('eth')) {
    return isQuick
      ? 'ETH looking stable. Network activity picking up.'
      : 'Ethereum has solid fundamentals right now. Gas fees are reasonable, staking yield is attractive, and L2 activity continues to grow. Macro correlation with BTC is high — if BTC breaks out, ETH should follow with leverage.'
  }
  if (msg.includes('market') || msg.includes('overview')) {
    return isAggressive
      ? 'Market\'s coiling. Something big is coming. I\'m positioned for the move.'
      : 'Markets are in a consolidation phase. Volume is below average. Patience is the play right now.'
  }
  if (msg.includes('help') || msg.includes('what can you do')) {
    return 'I can track tokens, analyze charts, monitor your watchlist, and surface opportunities based on your style. Just ask about any token or market topic.'
  }
  if (msg.includes('hello') || msg.includes('hey') || msg.includes('hi')) {
    return getGreeting(profile)
  }

  // Default response
  const defaults = isQuick
    ? ['I don\'t have data on that yet. But I\'m learning.', 'Noted. I\'ll keep that on my radar.', 'Not enough signal there yet. I\'ll dig deeper.']
    : ['I don\'t have comprehensive data on that topic yet, but I\'m tracking it. As I learn more about your interests, I\'ll be able to provide more relevant insights.', 'That\'s outside my current data set. I\'m focused on the areas that match your trading style right now, but I\'m always expanding.']

  return defaults[Math.floor(Math.random() * defaults.length)]
}
