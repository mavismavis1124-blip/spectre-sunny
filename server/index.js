/**
 * Spectre AI Trading Platform - Backend Server
 * Proxies requests to Codex API to avoid CORS issues
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Codex API Configuration - from environment variable
const CODEX_API_KEY = process.env.CODEX_API_KEY;
const CODEX_BASE_URL = 'https://graph.codex.io/graphql';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
// When API key is set, use pro endpoint with pro header for higher rate limits
const COINGECKO_BASE = COINGECKO_API_KEY
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';
const COINGECKO_HEADER_KEY = 'x-cg-pro-api-key';

// Validate API key is present
if (!CODEX_API_KEY) {
  console.error('ERROR: CODEX_API_KEY environment variable is not set!');
  console.error('Create a .env file in the project root with: CODEX_API_KEY=your_key_here');
}

/** Symbol -> CoinGecko id for price fallback when Codex fails or returns no data */
const SYMBOL_TO_COINGECKO_ID = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  USDT: 'tether', USDC: 'usd-coin', DOGE: 'dogecoin', ADA: 'cardano', AVAX: 'avalanche-2',
  LINK: 'chainlink', DOT: 'polkadot', MATIC: 'matic-network', UNI: 'uniswap',
  LTC: 'litecoin', SHIB: 'shiba-inu', TRX: 'tron', BCH: 'bitcoin-cash',
  ARB: 'arbitrum', OP: 'optimism', PEPE: 'pepe', FLOKI: 'floki', WIF: 'dogwifhat',
  AAVE: 'aave', CRV: 'curve-dao-token', MKR: 'maker', LDO: 'lido-dao',
  GRT: 'the-graph', SUSHI: 'sushiswap', RENDER: 'render-token', RNDR: 'render-token',
  INJ: 'injective-protocol', FIL: 'filecoin', FET: 'fetch-ai', JUP: 'jupiter-exchange-solana',
  JTO: 'jito-governance-token', PYTH: 'pyth-network', BONK: 'bonk', TIA: 'celestia',
  SEI: 'sei-network', SUI: 'sui', APT: 'aptos',
};

async function fetchCoinGeckoPrice(symbol) {
  const upper = (symbol || '').toUpperCase();
  const id = SYMBOL_TO_COINGECKO_ID[upper];
  if (!id) return null;
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`;
    const opts = { headers: {} };
    if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data[id];
    if (!p || p.usd == null) return null;
    return {
      symbol: upper,
      price: parseFloat(p.usd) || 0,
      change: parseFloat(p.usd_24h_change) || 0,
      volume: 0,
      marketCap: 0,
      liquidity: 0,
      source: 'coingecko',
    };
  } catch (e) {
    console.error(`CoinGecko fallback for ${symbol}:`, e.message);
    return null;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

/**
 * In-memory cache for Codex API responses to reduce API usage.
 * TTL in ms; entries are pruned on read when expired.
 */
const CACHE_TTL_PRICES_MS = 30 * 1000;        // 30s for batch prices (real-time feel)
const CACHE_TTL_DETAILS_MS = 15 * 1000;       // 15s for token details (near real-time)
const CACHE_TTL_TRENDING_MS = 2 * 60 * 1000;  // 2 min for trending
// Stock cache TTLs
const CACHE_TTL_STOCK_QUOTES_MS = 30 * 1000;
const CACHE_TTL_STOCK_SEARCH_MS = 60 * 1000;
const CACHE_TTL_STOCK_CANDLES_MS = 5 * 60 * 1000;
const CACHE_TTL_STOCK_MOVERS_MS = 2 * 60 * 1000;
const CACHE_TTL_STOCK_NEWS_MS = 5 * 60 * 1000;
const CACHE_TTL_STOCK_SECTORS_MS = 5 * 60 * 1000;
const CACHE_TTL_WHISPER_MS = 5 * 60 * 1000;       // 5 min for whisper search LLM parse

const cache = {
  prices: new Map(),   // key: sorted symbols string -> { data, expires }
  details: new Map(),  // key: `${address.toLowerCase()}_${networkId}` -> { data, expires }
  trending: new Map(), // key: networks string -> { data, expires }
  // Stock caches
  stockQuotes: new Map(),
  stockSearch: new Map(),
  stockCandles: new Map(),
  stockMovers: new Map(),
  stockIndices: new Map(),
  stockNews: new Map(),
  stockSectors: new Map(),
  whisper: new Map(),        // Whisper Search LLM parse cache (5 min TTL)
  defiYields: new Map(),     // DeFi yields cache (5 min TTL)
  fundingRates: new Map(),   // Funding rates cache (60s TTL)
};

function getCached(map, key, ttlMs) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    map.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(map, key, data, ttlMs) {
  map.set(key, { data, expires: Date.now() + ttlMs });
}

/**
 * Execute GraphQL query against Codex API
 */
async function executeCodexQuery(query, variables = {}) {
  const response = await fetch(CODEX_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': CODEX_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`Codex API ${response.status} response:`, responseText);
    throw new Error(`Codex API error: ${response.status} ${response.statusText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse response:', responseText);
    throw new Error('Invalid JSON response from Codex API');
  }
  
  if (data.errors) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }

  return data.data;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'Spectre AI Trading API',
    status: 'running',
    endpoints: [
      'GET /api/health',
      'GET /api/tokens/search?q=',
      'GET /api/tokens/trending',
      'GET /api/token/details?address=&networkId=',
      'GET /api/tokens/price/:symbol',
    ]
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Spectre Posting API (v1) – generate and publish crypto content
const postingRouter = require('./routes/posting');
app.use('/api/v1', postingRouter);

/** Env sanity check – which Monarch/backend vars are set (values never exposed). Use in deployed env. */
const ENV_VARS_TO_CHECK = [
  'CODEX_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'TAVILY_API_KEY',
  'SERPAPI_KEY',
  'SERP_API_KEY',
  'TWITTER_BEARER_TOKEN',
  'X_BEARER_TOKEN',
  'COINGECKO_API_KEY',
  'CRYPTOCOMPARE_API_KEY',
];
function envCheck() {
  const out = {};
  for (const key of ENV_VARS_TO_CHECK) {
    const val = process.env[key];
    out[key] = val && String(val).trim().length > 0 ? 'set' : 'not set';
  }
  return out;
}
app.get('/api/env-check', (req, res) => {
  res.json({ env: envCheck(), timestamp: new Date().toISOString() });
});

/** Project crawl: roadmap or whitepaper (2 sentences max). GET /api/project/crawl?url=...&intent=roadmap|whitepaper */
const CRAWL_TIMEOUT_MS = 8000;
function stripHtmlCrawl(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function firstTwoSentencesCrawl(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?\.\s*.+?\.)(?:\s|$)/);
  return match ? match[1].trim() : trimmed.slice(0, 300).trim();
}
function extractRoadmapSnippetCrawl(text) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf('roadmap');
  if (idx < 0) return text.slice(0, 400).trim();
  const start = Math.max(0, idx - 80);
  return text.slice(start, start + 450).trim();
}
function extractMetaDescription(html) {
  if (!html || typeof html !== 'string') return '';
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  return match ? match[1].trim().slice(0, 500) : '';
}
app.get('/api/project/crawl', async (req, res) => {
  let url = (req.query.url || '').trim();
  const intent = ((req.query.intent || 'roadmap') + '').toLowerCase();
  if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
    return res.status(400).json({ error: 'Missing or invalid url (http/https required)' });
  }
  url = url.replace(/^http:\/\//i, 'https://');
  const validIntents = ['roadmap', 'whitepaper', 'about'];
  if (!validIntents.includes(intent)) {
    return res.status(400).json({ error: 'intent must be roadmap, whitepaper, or about' });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!response.ok) return res.status(502).json({ error: `Site returned ${response.status}` });
    const html = await response.text();
    const text = stripHtmlCrawl(html);
    if (intent === 'about') {
      const meta = extractMetaDescription(html);
      const snippet = (meta || text).trim().slice(0, 400);
      return res.json({ intent: 'about', text: snippet || 'No summary found on this page.' });
    }
    if (intent === 'roadmap') {
      const snippet = extractRoadmapSnippetCrawl(text) || text.slice(0, 400).trim();
      return res.json({ intent: 'roadmap', text: snippet || 'No roadmap text found.' });
    }
    const two = firstTwoSentencesCrawl(text);
    return res.json({
      intent: 'whitepaper',
      text: two || text.slice(0, 300).trim() || 'No whitepaper text found on this page. Try their /whitepaper or /docs.',
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Request timed out' });
    return res.status(502).json({ error: err.message || 'Crawl failed' });
  }
});

/** Project latest tweet: if TWITTER_BEARER_TOKEN set, fetch from X API v2; else return link. GET /api/project/latest-tweet?twitterUrl=... */
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN || '';
function isValidTwitterUrl(u) {
  if (!u || typeof u !== 'string') return false;
  const trimmed = u.trim();
  return (trimmed.startsWith('https://twitter.com/') || trimmed.startsWith('https://x.com/')) && trimmed.length < 500;
}
function usernameFromTwitterUrl(url) {
  const m = (url || '').trim().match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
  return m ? m[1] : null;
}
app.get('/api/project/latest-tweet', async (req, res) => {
  const twitterUrl = (req.query.twitterUrl || '').trim();
  if (!isValidTwitterUrl(twitterUrl)) {
    return res.status(400).json({ error: 'Valid twitterUrl (https://twitter.com/... or https://x.com/...) required' });
  }
  const username = usernameFromTwitterUrl(twitterUrl);
  if (TWITTER_BEARER_TOKEN && username) {
    try {
      const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`, {
        headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!userRes.ok) {
        const errBody = await userRes.text();
        console.warn('Twitter user lookup failed:', userRes.status, errBody);
        return res.json({ url: twitterUrl, message: `X profile: ${twitterUrl} — Open to see their latest posts. (Twitter API: ${userRes.status})` });
      }
      const userData = await userRes.json();
      const userId = userData.data?.id;
      if (!userId) return res.json({ url: twitterUrl, message: `X: ${twitterUrl} — Open to see their latest posts.` });
      const tweetsRes = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?max_results=1&tweet.fields=created_at,text`,
        { headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` }, signal: AbortSignal.timeout(5000) }
      );
      if (!tweetsRes.ok) {
        const errBody = await tweetsRes.text();
        console.warn('Twitter tweets fetch failed:', tweetsRes.status, errBody);
        return res.json({ url: twitterUrl, message: `X: ${twitterUrl} — Open to see their latest posts.` });
      }
      const tweetsData = await tweetsRes.json();
      const tweet = tweetsData.data?.[0];
      if (tweet && tweet.text) {
        return res.json({
          url: twitterUrl,
          message: tweet.text,
          createdAt: tweet.created_at,
        });
      }
    } catch (e) {
      console.warn('Twitter API error:', e.message);
    }
  }
  res.json({
    url: twitterUrl,
    message: `Here's their X (Twitter): ${twitterUrl} — Open the link to see their latest posts.`,
  });
});

/** Weather proxy (avoids CORS). GET /api/weather?lat=40.71&lon=-74.01 */
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 40.71;
    const lon = parseFloat(req.query.lon) || -74.01;
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return res.status(response.status).json({ error: 'Weather failed' });
    const data = await response.json();
    const parts = (data.timezone || '').split('/');
    const location = (parts[parts.length - 1] || 'Unknown').replace(/_/g, ' ');
    res.json({
      location,
      temp: Math.round(data.current?.temperature_2m ?? 0),
      high: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      low: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      code: data.current?.weather_code ?? 0,
    });
  } catch (e) {
    console.warn('Weather proxy error:', e.message);
    res.status(500).json({ location: '—', temp: 0, high: 0, low: 0, code: 0 });
  }
});

/** Ambient audio proxy for GM dashboard (avoids CORS). GET /api/ambient */
const AMBIENT_MP3_URL = 'https://cdn.pixabay.com/audio/2022/03/10/audio_345c2f1f2c.mp3';
app.get('/api/ambient', async (req, res) => {
  try {
    const response = await fetch(AMBIENT_MP3_URL, {
      signal: AbortSignal.timeout(15000),
      headers: { 'Accept': 'audio/mpeg,audio/*', 'User-Agent': 'SpectreVibe/1.0' },
    });
    if (!response.ok) return res.status(response.status).end();
    const buf = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buf));
  } catch (e) {
    console.warn('Ambient proxy error:', e.message);
    res.status(502).end();
  }
});

/** CryptoPanic news proxy. GET /api/cryptopanic?symbol=BTC&limit=10 – requires CRYPTOPANIC_API_KEY (get free at cryptopanic.com) */
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY || '';
const CRYPTOPANIC_NEWS = 'https://cryptopanic.com/api/v1/posts/';
app.get('/api/cryptopanic', async (req, res) => {
  try {
    if (!CRYPTOPANIC_API_KEY) {
      return res.json({ results: [] });
    }
    const symbol = (req.query.symbol || '').toUpperCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const currencies = symbol && ['BTC', 'ETH', 'SOL'].includes(symbol) ? symbol : '';
    const url = `${CRYPTOPANIC_NEWS}?auth_token=${CRYPTOPANIC_API_KEY}&filter=rising${currencies ? `&currencies=${currencies}` : ''}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.warn('CryptoPanic news:', response.status);
      return res.json({ results: [] });
    }
    const json = await response.json();
    const raw = Array.isArray(json.results) ? json.results : [];
    const items = raw.slice(0, limit).map((item) => ({
      id: String(item.id),
      title: item.title || '',
      url: item.url || '#',
      summary: (item.title || '').slice(0, 160) + (item.title && item.title.length > 160 ? '…' : ''),
      source: (item.source && item.source.title) || 'CryptoPanic',
      imageUrl: (item.image && item.image.original) || null,
      publishedOn: item.published_at ? new Date(item.published_at).getTime() / 1000 : 0,
      categories: (item.currencies || []).map((c) => (c.code || c).toUpperCase()),
    }));
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ results: items });
  } catch (e) {
    console.warn('CryptoPanic proxy error:', e.message);
    res.json({ results: [] });
  }
});

/** Crypto news proxy (avoids CORS; optional CRYPTOCOMPARE_API_KEY for higher limits). GET /api/news?symbol=BTC&limit=8 */
const CRYPTOCOMPARE_API_KEY = process.env.CRYPTOCOMPARE_API_KEY || '';
const CRYPTOCOMPARE_NEWS = 'https://min-api.cryptocompare.com/data/v2/news';
app.get('/api/news', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const url = `${CRYPTOCOMPARE_NEWS}?lang=EN`;
    const opts = { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) };
    if (CRYPTOCOMPARE_API_KEY) opts.headers['Authorization'] = `Apikey ${CRYPTOCOMPARE_API_KEY}`;
    const response = await fetch(url, opts);
    if (!response.ok) {
      console.warn('CryptoCompare news:', response.status);
      return res.json({ Data: [] });
    }
    const json = await response.json();
    let raw = Array.isArray(json.Data) ? json.Data : [];
    if (symbol && ['BTC', 'ETH', 'SOL'].includes(symbol)) {
      const symbolLower = symbol.toLowerCase();
      const cats = symbol === 'BTC' ? ['BTC', 'BITCOIN'] : symbol === 'ETH' ? ['ETH', 'ETHEREUM'] : ['SOL', 'SOLANA'];
      raw = raw.filter((item) => {
        const title = (item.title || '').toLowerCase();
        if (title.includes(symbolLower) || title.includes(symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : 'solana')) return true;
        const itemCats = ((item.categories || '').split('|').filter(Boolean)).map((c) => c.toUpperCase());
        return itemCats.some((c) => cats.includes(c));
      });
      if (raw.length < 3) raw = (Array.isArray(json.Data) ? json.Data : []).slice(0, limit * 2);
    }
    const items = raw.slice(0, limit).map((item) => ({
      id: String(item.id),
      title: item.title || '',
      url: item.url || item.guid || '#',
      summary: (item.body || '').replace(/<[^>]+>/g, '').slice(0, 160) + (item.body && item.body.length > 160 ? '…' : ''),
      source: (item.source_info && item.source_info.name) || item.source || 'Crypto',
      imageUrl: item.imageurl || null,
      publishedOn: item.published_on || 0,
      categories: (item.categories || '').split('|').filter(Boolean).map((c) => c.toUpperCase()),
    }));
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ Data: items });
  } catch (e) {
    console.warn('News proxy error:', e.message);
    res.json({ Data: [] });
  }
});

/** Market news RSS – real-time feed (no API key). GET /api/news/rss?symbol=BTC&limit=10 */
const RSS_FEEDS = [
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://cointelegraph.com/rss',
];
function parseRssXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([^<]*)<\/title>/i.exec(block) || [])[1] || (/<title>([^<]*)<\/title>/i.exec(block) || [])[1] || '';
    const link = (/<link>([^<]*)<\/link>|<link href="([^"]*)"/i.exec(block) || [])[1] || (/\s<link>([^<]+)<\/link>/i.exec(block) || [])[1] || '#';
    const pubDate = (/<pubDate>([^<]*)<\/pubDate>/i.exec(block) || [])[1] || '';
    const desc = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([^<]*)<\/description>/i.exec(block) || [])[1] || (/<description>([^<]*)<\/description>/i.exec(block) || [])[1] || '';
    const summary = (desc || '').replace(/<[^>]+>/g, '').trim().slice(0, 160) + ((desc || '').length > 160 ? '…' : '');
    const imgMatch = /<media:content[^>]*url="([^"]*)"|<enclosure[^>]*url="([^"]*)"/i.exec(block);
    const imageUrl = (imgMatch && (imgMatch[1] || imgMatch[2])) || null;
    if (title) items.push({ id: `rss-${items.length}-${Date.now()}`, title, url: link, summary, source: 'RSS', imageUrl, publishedOn: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : 0, categories: [] });
  }
  return items;
}
app.get('/api/news/rss', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const keyword = symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : symbol === 'SOL' ? 'solana' : '';
    let all = [];
    for (const feedUrl of RSS_FEEDS) {
      try {
        const response = await fetch(feedUrl, { headers: { Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'SpectreAI-Research/1.0' }, signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        const xml = await response.text();
        const items = parseRssXml(xml);
        all = all.concat(items);
      } catch (_) {}
    }
    if (keyword) {
      const filtered = all.filter((i) => (i.title || '').toLowerCase().includes(keyword));
      if (filtered.length >= 3) all = filtered;
    }
    const uniq = [];
    const seen = new Set();
    for (const i of all) {
      const key = (i.title || '').slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(i);
    }
    const result = uniq.slice(0, limit).map((item, idx) => ({ ...item, id: `rss-${idx}-${Date.now()}` }));
    res.setHeader('Cache-Control', 'public, max-age=90');
    res.json({ results: result });
  } catch (e) {
    console.warn('RSS news error:', e.message);
    res.json({ results: [] });
  }
});

/** Monarch AI – system prompt (embed-ready) */
const MONARCH_SYSTEM_PROMPT = `You are Monarch, Spectre AI's intelligence terminal. You are an elite crypto research agent with real-time data access, web crawling, and deep analytical capacity.

Your character: Direct and efficient. No fluff. You surface alpha. You speak like a senior analyst. Flag uncertainty explicitly ("unverified", "low confidence"). Proactively surface context the user needs.

You NEVER: Give generic crypto explanations unless asked. Say "I don't have real-time data" — you have tools. Start with "I'd be happy to help" or filler. Hedge excessively.

Use the context provided and your tools (web_search, fetch_url) when you need more current info. Structure your reply as an intelligence brief when appropriate:
- Lead with Quick Stats / Key Findings if data is present
- Include Social Pulse (X/twitter, latest tweet) when provided
- Include Project Intel (crawl, roadmap) when provided
- Flag risks or unverified claims
- Suggest next queries (e.g. /compare, /wallets) when relevant
- Be concise but data-rich. Do not make up data.`;

/** Monarch tool-forcing prompt: aggressive "YOU MUST USE THESE TOOLS" for Claude with tools */
const MONARCH_FORCE_TOOLS_PROMPT = `You are Monarch, Spectre AI's intelligence terminal.

## CRITICAL — READ FIRST

You have these tools: web_search (search the web for current info), fetch_url (fetch and read a URL).

**YOU MUST USE THESE TOOLS.** Do NOT answer questions about tokens, prices, projects, or market data from memory. Your training data is outdated. ALWAYS search first.

When the user asks about ANY token or project:
1. IMMEDIATELY call web_search with a query like "{token} price" or "{token} news today"
2. If you need more detail, call fetch_url on relevant URLs from the search results
3. ONLY THEN formulate your response using the LIVE data you retrieved

If you answer a price/market question without calling web_search first, you have failed.

ALWAYS call web_search BEFORE responding when user asks about: any token price, project news, market data, team/roadmap, or "latest" anything. NEVER say "Based on my training data..." or "I don't have real-time access..." — you DO have real-time access via tools.

After gathering data via tools, respond with: Quick Stats (price, 24h, MCap if from search), Latest News summary, Sources (URLs), Next queries. Be direct. Cite sources. Flag stale or conflicting data.`;

/** Monarch tools for Claude: web_search, fetch_url (same schema as anthropic.messages.create) */
const MONARCH_TOOLS = [
  { name: 'web_search', description: 'Search the web for current crypto prices, news, and information. ALWAYS use this for any price or market question.', input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search query - be specific, include "price USD" for prices' } }, required: ['query'] } },
  { name: 'fetch_url', description: 'Fetch content from a specific URL to get detailed information', input_schema: { type: 'object', properties: { url: { type: 'string', description: 'Full URL to fetch' } }, required: ['url'] } },
];

async function runMonarchTool(name, input) {
  monarchLog('api', `Tool call: ${name}`, typeof input === 'object' && input !== null ? JSON.stringify(input) : String(input));
  if (name === 'fetch_url') {
    const url = (input && input.url || '').trim().replace(/^http:\/\//i, 'https://');
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) return 'Invalid or missing url.';
    monarchLog('api', 'fetch_url GET', url);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      const status = response.status;
      if (!response.ok) {
        monarchLog('api', 'fetch_url result:', status, response.statusText);
        return `Fetch failed: ${status} ${response.statusText}.`;
      }
      const html = await response.text();
      const text = stripHtmlCrawl(html);
      const len = (text || '').trim().slice(0, 4000).length;
      monarchLog('api', 'fetch_url result: 200, body length', len);
      return (text || '').trim().slice(0, 4000) || 'No readable text found on this page.';
    } catch (e) {
      monarchLog('error', 'fetch_url error:', e.name === 'AbortError' ? 'timeout' : e.message);
      return e.name === 'AbortError' ? 'Request timed out.' : (e.message || 'Fetch failed.');
    }
  }
  if (name === 'web_search') {
    const q = (input && input.query || '').trim();
    if (!q) return 'No search query provided.';
    const TAVILY_KEY = process.env.TAVILY_API_KEY;
    const SERP_KEY = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
    if (TAVILY_KEY) {
      monarchLog('api', 'Tavily API request query=', q);
      try {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: TAVILY_KEY, query: q, search_depth: 'basic', max_results: 5 }),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          monarchLog('api', 'Tavily API response:', r.status);
          return `Tavily returned ${r.status}.`;
        }
        const data = await r.json();
        const results = (data.results || []).slice(0, 5).map(r => ({ title: r.title, snippet: r.content, url: r.url }));
        monarchLog('api', 'Tavily API response: 200, results=', results.length, results.length ? 'titles: ' + results.map(r => r.title).slice(0, 3).join(' | ') : '');
        return JSON.stringify(results);
      } catch (e) {
        monarchLog('error', 'Tavily API error:', e.message);
      }
    }
    if (SERP_KEY) {
      monarchLog('api', 'SerpAPI request query=', q);
      try {
        const r = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${SERP_KEY}`, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) {
          monarchLog('api', 'SerpAPI response:', r.status);
          return `Search returned ${r.status}.`;
        }
        const data = await r.json();
        const results = (data.organic_results || []).slice(0, 5).map(o => ({ title: o.title, snippet: o.snippet, url: o.link }));
        monarchLog('api', 'SerpAPI response: 200, results=', results.length, results.length ? 'titles: ' + results.map(o => o.title).slice(0, 3).join(' | ') : '');
        return JSON.stringify(results);
      } catch (e) {
        monarchLog('error', 'SerpAPI error:', e.message);
      }
    }
    monarchLog('info', 'No search API configured (TAVILY_API_KEY or SERPAPI_KEY)');
    return JSON.stringify({ error: 'No search API configured. Set TAVILY_API_KEY or SERPAPI_KEY in .env.' });
  }
  return 'Unknown tool.';
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOOL_ROUNDS = 5;

/** In-memory Monarch logs for GET /api/monarch-logs (last 300 lines) */
const MONARCH_LOGS_MAX = 300;
const monarchLogs = [];
function monarchLog(level, ...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  monarchLogs.push(line);
  if (monarchLogs.length > MONARCH_LOGS_MAX) monarchLogs.shift();
  if (level === 'error') console.error('[Monarch]', ...args);
  else if (level === 'api') console.log('[Monarch API]', ...args);
  else console.log('[Monarch]', ...args);
}

async function monarchClaudeWithTools(userMessage) {
  const messages = [{ role: 'user', content: userMessage }];
  let lastText = '';
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body = { model: ANTHROPIC_MODEL, max_tokens: 4096, system: MONARCH_FORCE_TOOLS_PROMPT, tools: MONARCH_TOOLS, messages };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data.content || [];
    const toolUses = content.filter(c => c.type === 'tool_use');
    for (const block of content) if (block.type === 'text') lastText = (block.text || '').trim();
    const textLen = lastText ? lastText.length : 0;
    monarchLog('api', `Anthropic round ${round + 1} response: stop_reason=${data.stop_reason || 'unknown'}, text_length=${textLen}, tool_uses=[${(toolUses.map(t => t.name)).join(', ')}]`);
    if (data.stop_reason === 'end_turn' || !toolUses.length) {
      if (toolUses.length === 0) monarchLog('info', 'NO TOOLS CALLED - Claude answered from memory');
      return lastText;
    }
    monarchLog('api', 'Anthropic requesting tools:', toolUses.map(t => `${t.name}(${JSON.stringify(t.input)})`).join('; '));
    messages.push({ role: 'assistant', content });
    const toolResults = [];
    for (const use of toolUses) {
      const out = await runMonarchTool(use.name, use.input);
      toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: typeof out === 'string' ? out : JSON.stringify(out) });
    }
    messages.push({ role: 'user', content: toolResults });
  }
  return lastText || 'Stopped after max tool rounds.';
}

/** AI Agent LLM: Monarch + crawl/X/news context → answer. Prefers Claude with tools when ANTHROPIC_API_KEY set. POST /api/ai/answer */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
app.post('/api/ai/answer', async (req, res) => {
  try {
    const body = req.body || {};
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
    const parts = [];
    if (context.name) parts.push(`Project: ${context.name}`);
    if (context.crawledText) parts.push(`Website crawl:\n${context.crawledText}`);
    if (context.latestTweet && typeof context.latestTweet === 'string') parts.push(`Latest from X/Twitter:\n${context.latestTweet}`);
    if (context.headlines && context.headlines.length) parts.push(`Recent headlines: ${context.headlines.join(' · ')}`);
    if (context.website) parts.push(`Website: ${context.website}`);
    if (context.twitterUrl) parts.push(`X/Twitter: ${context.twitterUrl}`);
    const contextBlock = parts.length ? parts.join('\n\n') : 'No web or X context provided.';
    const userMessage = `Context:\n${contextBlock}\n\nUser question: ${query}\n\nAnswer based on the context above. Use your tools (web_search, fetch_url) if you need more current information. Use intelligence brief style when appropriate.`;

    monarchLog('api', 'POST /api/ai/answer request query=', query.slice(0, 120) + (query.length > 120 ? '...' : ''), 'context keys:', Object.keys(context).join(', ') || 'none');

    if (ANTHROPIC_API_KEY) {
      monarchLog('api', 'Calling Anthropic API (model=', ANTHROPIC_MODEL, ')');
      try {
        const text = await monarchClaudeWithTools(userMessage);
        return res.status(200).json({ text: text || (context.latestTweet || context.crawledText || '').slice(0, 400) || 'No answer generated.', usedLLM: true });
      } catch (err) {
        monarchLog('error', 'Monarch Claude error:', err.message);
        monarchLog('info', 'Anthropic failed, falling back to OpenAI');
        if (OPENAI_API_KEY) {
          const resOpenAI = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, messages: [{ role: 'system', content: MONARCH_SYSTEM_PROMPT }, { role: 'user', content: userMessage }] }),
          });
          if (resOpenAI.ok) {
            const data = await resOpenAI.json();
            const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            return res.status(200).json({ text: text.trim() || (context.latestTweet || context.crawledText || '').slice(0, 400) || 'No answer generated.', usedLLM: true });
          }
        }
        const fallback = context.latestTweet ? `${context.name || 'Project'} — Latest: ${context.latestTweet.slice(0, 400)}…` : (context.crawledText || '').slice(0, 400) + (context.crawledText && context.crawledText.length > 400 ? '…' : '');
        return res.status(502).json({ text: fallback || 'AI request failed. Try again.', usedLLM: false });
      }
    }

    if (!OPENAI_API_KEY) {
      const fallback = context.latestTweet
        ? `${context.name || 'Project'} — Latest: ${context.latestTweet.slice(0, 400)}${context.latestTweet.length > 400 ? '…' : ''}${context.twitterUrl ? `\nX: ${context.twitterUrl}` : ''}`
        : (context.crawledText
          ? `${context.name || 'Project'} — ${context.crawledText.slice(0, 500)}${context.crawledText.length > 500 ? '…' : ''}${context.twitterUrl ? `\n\nX: ${context.twitterUrl}` : ''}`.trim()
          : `Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env to enable AI answers. Raw context: ${contextBlock.slice(0, 300)}…`);
      return res.status(200).json({ text: fallback.trim(), usedLLM: false });
    }

    monarchLog('api', 'Calling OpenAI API (ANTHROPIC_API_KEY not set) model=gpt-4o-mini');
    const resOpenAI = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [
          { role: 'system', content: MONARCH_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!resOpenAI.ok) {
      const errBody = await resOpenAI.text();
      monarchLog('error', 'OpenAI API error:', resOpenAI.status, errBody.slice(0, 200));
      const fallback = context.latestTweet
        ? `${context.name || 'Project'} — Latest: ${context.latestTweet.slice(0, 400)}…`
        : (context.crawledText || '').slice(0, 400) + (context.crawledText && context.crawledText.length > 400 ? '…' : '');
      return res.status(502).json({ text: fallback || 'AI request failed. Try again.', usedLLM: false });
    }
    const data = await resOpenAI.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    monarchLog('api', 'OpenAI API response: 200, text_length=', (text || '').length);
    return res.status(200).json({ text: text.trim() || (context.latestTweet || context.crawledText || '').slice(0, 400) || 'No answer generated.', usedLLM: true });
  } catch (err) {
    monarchLog('error', 'AI answer error:', err.message);
    res.status(500).json({ error: err.message, text: '' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WHISPER SEARCH — Natural-language search → LLM parse → data fetch + filter
// ═══════════════════════════════════════════════════════════════════════════════

const WHISPER_SYSTEM_PROMPT = `You are a financial search query parser. Given a natural language query, extract structured filters to search crypto or stock markets.

Return ONLY valid JSON (no markdown, no explanation) with this exact schema:
{
  "assetClass": "crypto" | "stocks",
  "interpretation": "short plain-English summary of what the user wants (1 sentence)",
  "filters": {
    "category": null | "meme-token" | "decentralized-finance-defi" | "layer-1" | "layer-2" | "artificial-intelligence" | "gaming" | "real-world-assets" | "decentralized-physical-infrastructure-networks" | "solana-ecosystem" | "ethereum-ecosystem" | "base-ecosystem",
    "sector": null | "Technology" | "Financial" | "Healthcare" | "Consumer" | "Energy" | "Communication" | "Automotive" | "Commodity" | "Index",
    "minPrice": null | number,
    "maxPrice": null | number,
    "minChange24h": null | number,
    "maxChange24h": null | number,
    "minMarketCap": null | number,
    "maxMarketCap": null | number,
    "minVolume": null | number,
    "sort": null | "price_asc" | "price_desc" | "change_asc" | "change_desc" | "market_cap_desc" | "market_cap_asc" | "volume_desc"
  },
  "symbols": []
}

Category mapping hints:
- "meme", "meme coins" → "meme-token"
- "defi", "DeFi" → "decentralized-finance-defi"
- "L1", "layer 1" → "layer-1"
- "L2", "layer 2" → "layer-2"
- "ai", "artificial intelligence" → "artificial-intelligence"
- "gaming", "gamefi" → "gaming"
- "rwa" → "real-world-assets"
- "depin" → "decentralized-physical-infrastructure-networks"
- "solana" → "solana-ecosystem"

If the user mentions specific coins or stocks by name/symbol, put them in "symbols".
If ambiguous between crypto and stocks, default to "crypto".
"pumping", "mooning", "gainers" → sort by change_desc, possibly minChange24h > 0
"dumping", "crashing", "losers" → sort by change_asc, possibly maxChange24h < 0
"cheap", "under $1" → maxPrice filter
"blue chip" crypto → minMarketCap of 1000000000 (1B)
"undervalued" stocks → low PE (mention in interpretation, use sort by market_cap_asc)
"high volume" → sort by volume_desc or minVolume filter
"top" → sort by market_cap_desc unless context says otherwise
"near ATH", "all time high" → mention in interpretation, sort by change_desc`;

/**
 * Parse a natural language query via LLM → structured JSON filters
 * Primary: Anthropic Claude, Fallback: OpenAI gpt-4o-mini
 */
async function whisperParseLLM(query) {
  const messages = [{ role: 'user', content: query }];

  // Detect Anthropic key: explicit ANTHROPIC_API_KEY, or OPENAI_API_KEY if it starts with sk-ant-
  const effectiveAnthropicKey = ANTHROPIC_API_KEY || (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-ant-') ? OPENAI_API_KEY : null);
  // Detect real OpenAI key (must start with sk- but NOT sk-ant-)
  const effectiveOpenAIKey = OPENAI_API_KEY && !OPENAI_API_KEY.startsWith('sk-ant-') ? OPENAI_API_KEY : null;

  // Try Anthropic first
  if (effectiveAnthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveAnthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: WHISPER_SYSTEM_PROMPT,
          messages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.content && data.content[0] && data.content[0].text) || '';
        const parsed = extractJSON(text);
        if (parsed) return parsed;
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Whisper: Anthropic returned', res.status, errText.slice(0, 200));
      }
    } catch (e) {
      console.error('Whisper: Anthropic parse failed:', e.message);
    }
  }

  // Fallback: OpenAI
  if (effectiveOpenAIKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveOpenAIKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: WHISPER_SYSTEM_PROMPT },
            { role: 'user', content: query },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
        const parsed = extractJSON(text);
        if (parsed) return parsed;
      } else {
        const errText = await res.text().catch(() => '');
        console.error('Whisper: OpenAI returned', res.status, errText.slice(0, 200));
      }
    } catch (e) {
      console.error('Whisper: OpenAI parse failed:', e.message);
    }
  }

  // Last resort: local keyword parser (no LLM needed)
  console.log('Whisper: All LLM attempts failed, using local keyword parser');
  return whisperLocalParse(query);
}

/**
 * Local keyword parser — no LLM needed, handles common patterns
 */
function whisperLocalParse(query) {
  const q = query.toLowerCase();
  const parsed = {
    assetClass: 'crypto',
    interpretation: '',
    filters: {
      category: null, sector: null,
      minPrice: null, maxPrice: null,
      minChange24h: null, maxChange24h: null,
      minMarketCap: null, maxMarketCap: null,
      minVolume: null, sort: null,
    },
    symbols: [],
  };

  // Detect stocks vs crypto
  if (/\b(stock|stocks|equity|equities|shares|nasdaq|nyse|s&p|dow)\b/.test(q)) {
    parsed.assetClass = 'stocks';
  }

  // Detect crypto categories
  const catMap = [
    [/\bmeme\b|memecoin/, 'meme-token'],
    [/\bdefi\b|decentralized finance/, 'decentralized-finance-defi'],
    [/\blayer.?1\b|\bl1\b/, 'layer-1'],
    [/\blayer.?2\b|\bl2\b/, 'layer-2'],
    [/\bai\b|artificial intelligence/, 'artificial-intelligence'],
    [/\bgaming\b|\bgamefi\b/, 'gaming'],
    [/\brwa\b|real.world/, 'real-world-assets'],
    [/\bdepin\b/, 'decentralized-physical-infrastructure-networks'],
    [/\bsolana\b|\bsol\b/, 'solana-ecosystem'],
    [/\bethereum\b|\beth\b/, 'ethereum-ecosystem'],
    [/\bbase\b/, 'base-ecosystem'],
  ];
  for (const [regex, cat] of catMap) {
    if (regex.test(q)) { parsed.filters.category = cat; break; }
  }

  // Detect stock sectors
  if (parsed.assetClass === 'stocks') {
    const sectorMap = [
      [/\btech/, 'Technology'], [/\bfinance|\bbank/, 'Financial'],
      [/\bhealth|\bpharma|\bbiotech/, 'Healthcare'], [/\bconsumer|\bretail/, 'Consumer'],
      [/\benergy|\boil|\bgas/, 'Energy'],
    ];
    for (const [regex, sector] of sectorMap) {
      if (regex.test(q)) { parsed.filters.sector = sector; break; }
    }
  }

  // Price filters
  const underMatch = q.match(/under\s*\$?(\d+(?:\.\d+)?)/);
  if (underMatch) parsed.filters.maxPrice = parseFloat(underMatch[1]);
  const overMatch = q.match(/over\s*\$?(\d+(?:\.\d+)?)/);
  if (overMatch) parsed.filters.minPrice = parseFloat(overMatch[1]);
  if (/\bcheap\b|\bpenny\b/.test(q)) parsed.filters.maxPrice = parsed.filters.maxPrice || 1;

  // Momentum
  if (/\bpump|\bmoon|\bgain|\bbull|\bgreen|\brally|\brise|\bsurg/.test(q)) {
    parsed.filters.minChange24h = 0;
    parsed.filters.sort = 'change_desc';
  }
  if (/\bdump|\bcrash|\blos|\bbear|\bred\b|\bdrop|\bfall/.test(q)) {
    parsed.filters.maxChange24h = 0;
    parsed.filters.sort = 'change_asc';
  }

  // Sort/size
  if (/\btop\b|\bbiggest\b|\blargest\b/.test(q) && !parsed.filters.sort) {
    parsed.filters.sort = 'market_cap_desc';
  }
  if (/\bvolume\b|\bmost traded\b/.test(q)) parsed.filters.sort = 'volume_desc';
  if (/\bblue.?chip/.test(q)) parsed.filters.minMarketCap = 1000000000;
  if (/\bsmall.?cap|\bmicro.?cap/.test(q)) parsed.filters.maxMarketCap = 500000000;

  // Build interpretation
  const parts = [];
  if (parsed.filters.sort === 'change_desc') parts.push('top gainers');
  else if (parsed.filters.sort === 'change_asc') parts.push('biggest losers');
  else if (parsed.filters.sort === 'volume_desc') parts.push('highest volume');
  else if (parsed.filters.sort === 'market_cap_desc') parts.push('top by market cap');

  const catLabels = { 'meme-token': 'Meme', 'decentralized-finance-defi': 'DeFi', 'layer-1': 'Layer 1', 'layer-2': 'Layer 2', 'artificial-intelligence': 'AI', 'gaming': 'Gaming', 'solana-ecosystem': 'Solana', 'ethereum-ecosystem': 'Ethereum' };
  if (parsed.filters.category) parts.push((catLabels[parsed.filters.category] || parsed.filters.category) + ' tokens');
  if (parsed.filters.sector) parts.push(parsed.filters.sector + ' stocks');
  if (parsed.filters.maxPrice) parts.push('under $' + parsed.filters.maxPrice);
  if (parsed.filters.minPrice) parts.push('over $' + parsed.filters.minPrice);
  if (parsed.filters.minMarketCap) parts.push('blue chip');

  parsed.interpretation = parts.length > 0
    ? 'Showing ' + parts.join(', ') + ' in ' + parsed.assetClass
    : 'Searching ' + parsed.assetClass + ' markets';

  return parsed;
}

/** Extract JSON object from LLM text (handles markdown fences, leading text, etc.) */
function extractJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Try regex extraction
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* noop */ }
    }
  }
  return null;
}

/**
 * Fetch crypto data from CoinGecko based on parsed whisper filters
 */
async function whisperFetchCrypto(parsed) {
  const filters = parsed.filters || {};
  const symbols = parsed.symbols || [];

  // If specific symbols requested, fetch those directly
  if (symbols.length > 0) {
    const ids = symbols
      .map(s => SYMBOL_TO_COINGECKO_ID[s.toUpperCase()])
      .filter(Boolean);

    if (ids.length > 0) {
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(',')}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
      const opts = { headers: {} };
      if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
      try {
        const res = await fetch(url, opts);
        if (res.ok) {
          const data = await res.json();
          return data.map(normalizeCryptoResult);
        }
      } catch (e) {
        console.error('Whisper: CoinGecko specific fetch failed:', e.message);
      }
    }
  }

  // General market fetch — optionally with category
  let url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  if (filters.category) {
    url += `&category=${encodeURIComponent(filters.category)}`;
  }

  const opts = { headers: {} };
  if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;

  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    let data = await res.json();

    // Apply numeric filters
    if (filters.minPrice != null) data = data.filter(c => (c.current_price || 0) >= filters.minPrice);
    if (filters.maxPrice != null) data = data.filter(c => (c.current_price || 0) <= filters.maxPrice);
    if (filters.minChange24h != null) data = data.filter(c => (c.price_change_percentage_24h || 0) >= filters.minChange24h);
    if (filters.maxChange24h != null) data = data.filter(c => (c.price_change_percentage_24h || 0) <= filters.maxChange24h);
    if (filters.minMarketCap != null) data = data.filter(c => (c.market_cap || 0) >= filters.minMarketCap);
    if (filters.maxMarketCap != null) data = data.filter(c => (c.market_cap || 0) <= filters.maxMarketCap);
    if (filters.minVolume != null) data = data.filter(c => (c.total_volume || 0) >= filters.minVolume);

    // Sort
    if (filters.sort) {
      const sortMap = {
        price_asc: (a, b) => (a.current_price || 0) - (b.current_price || 0),
        price_desc: (a, b) => (b.current_price || 0) - (a.current_price || 0),
        change_asc: (a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0),
        change_desc: (a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0),
        market_cap_desc: (a, b) => (b.market_cap || 0) - (a.market_cap || 0),
        market_cap_asc: (a, b) => (a.market_cap || 0) - (b.market_cap || 0),
        volume_desc: (a, b) => (b.total_volume || 0) - (a.total_volume || 0),
      };
      if (sortMap[filters.sort]) data.sort(sortMap[filters.sort]);
    }

    return data.slice(0, 15).map(normalizeCryptoResult);
  } catch (e) {
    console.error('Whisper: CoinGecko markets fetch failed:', e.message);
    return [];
  }
}

function normalizeCryptoResult(c) {
  return {
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name || '',
    logo: c.image || '',
    price: c.current_price || 0,
    change1h: c.price_change_percentage_1h_in_currency || null,
    change24h: c.price_change_percentage_24h || 0,
    change7d: c.price_change_percentage_7d_in_currency || null,
    marketCap: c.market_cap || 0,
    volume: c.total_volume || 0,
    rank: c.market_cap_rank || null,
    sparkline: c.sparkline_in_7d ? c.sparkline_in_7d.price : null,
    id: c.id || '',
  };
}

/**
 * Fetch stock data from Yahoo Finance based on parsed whisper filters
 */
async function whisperFetchStocks(parsed) {
  const filters = parsed.filters || {};
  const symbols = parsed.symbols || [];

  // If specific symbols requested, fetch those
  const targetSymbols = symbols.length > 0
    ? symbols.map(s => s.toUpperCase())
    : POPULAR_STOCK_SYMBOLS;

  try {
    const quotes = await fetchYahooQuotes(targetSymbols);
    let results = Object.values(quotes).filter(q => q && q.symbol);

    // Apply filters
    if (filters.minPrice != null) results = results.filter(s => (s.price || 0) >= filters.minPrice);
    if (filters.maxPrice != null) results = results.filter(s => (s.price || 0) <= filters.maxPrice);
    if (filters.minChange24h != null) results = results.filter(s => (s.change || 0) >= filters.minChange24h);
    if (filters.maxChange24h != null) results = results.filter(s => (s.change || 0) <= filters.maxChange24h);
    if (filters.minMarketCap != null) results = results.filter(s => (s.marketCap || 0) >= filters.minMarketCap);
    if (filters.maxMarketCap != null) results = results.filter(s => (s.marketCap || 0) <= filters.maxMarketCap);
    if (filters.sector) results = results.filter(s => (s.sector || '').toLowerCase() === filters.sector.toLowerCase());

    // Sort
    if (filters.sort) {
      const sortMap = {
        price_asc: (a, b) => (a.price || 0) - (b.price || 0),
        price_desc: (a, b) => (b.price || 0) - (a.price || 0),
        change_asc: (a, b) => (a.change || 0) - (b.change || 0),
        change_desc: (a, b) => (b.change || 0) - (a.change || 0),
        market_cap_desc: (a, b) => (b.marketCap || 0) - (a.marketCap || 0),
        market_cap_asc: (a, b) => (a.marketCap || 0) - (b.marketCap || 0),
        volume_desc: (a, b) => (b.volume || 0) - (a.volume || 0),
      };
      if (sortMap[filters.sort]) results.sort(sortMap[filters.sort]);
    } else {
      // Default: sort by market cap descending
      results.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }

    return results.slice(0, 15).map(s => ({
      symbol: s.symbol || '',
      name: s.name || s.symbol || '',
      price: s.price || 0,
      change24h: s.change || 0,
      marketCap: s.marketCap || 0,
      volume: s.volume || 0,
      sector: s.sector || '',
      exchange: s.exchange || '',
      pe: s.pe || null,
    }));
  } catch (e) {
    console.error('Whisper: Stock fetch failed:', e.message);
    return [];
  }
}

/** POST /api/search/whisper — Natural language search */
app.post('/api/search/whisper', async (req, res) => {
  try {
    const query = (req.body && typeof req.body.query === 'string') ? req.body.query.trim() : '';
    if (query.length < 3) {
      return res.status(400).json({ error: 'Query must be at least 3 characters' });
    }

    // Check cache
    const cacheKey = query.toLowerCase().replace(/\s+/g, ' ');
    const cached = getCached(cache.whisper, cacheKey, CACHE_TTL_WHISPER_MS);
    if (cached) {
      console.log('Whisper: cache hit for', cacheKey.slice(0, 60));
      return res.json(cached);
    }

    // Parse query with LLM
    console.log('Whisper: parsing query:', query.slice(0, 100));
    const parsed = await whisperParseLLM(query);
    if (!parsed) {
      return res.status(502).json({ error: 'Failed to parse query — no LLM available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' });
    }

    console.log('Whisper: parsed →', JSON.stringify({ assetClass: parsed.assetClass, interpretation: parsed.interpretation, filters: parsed.filters, symbols: parsed.symbols }).slice(0, 300));

    // Fetch data based on asset class
    const assetClass = parsed.assetClass || 'crypto';
    let results = [];
    if (assetClass === 'stocks') {
      results = await whisperFetchStocks(parsed);
    } else {
      results = await whisperFetchCrypto(parsed);
    }

    const response = {
      interpretation: parsed.interpretation || '',
      assetClass,
      filters: parsed.filters || {},
      symbols: parsed.symbols || [],
      results,
    };

    // Cache the full response
    setCached(cache.whisper, cacheKey, response, CACHE_TTL_WHISPER_MS);
    console.log('Whisper: returning', results.length, 'results for', assetClass);
    res.json(response);
  } catch (err) {
    console.error('Whisper search error:', err.message);
    res.status(500).json({ error: 'Whisper search failed: ' + err.message });
  }
});

/** Monarch logs – in-memory buffer for debugging tool use */
app.get('/api/monarch-logs', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ logs: [...monarchLogs] });
});

/** Binance 24h ticker handler – reuse for both paths */
async function binanceTickerHandler(req, res) {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (!response.ok) throw new Error(`Binance ${response.status}`);
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.json(data);
  } catch (err) {
    console.error('Binance proxy error:', err.message);
    res.status(502).json({ error: 'Binance ticker unavailable' });
  }
}

app.get('/api/binance/ticker/24hr', binanceTickerHandler);
app.get('/api/binance-ticker', binanceTickerHandler);

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN EXCHANGES — Real exchange data from CoinGecko + DexScreener
// Never return fabricated exchange listings
// ═══════════════════════════════════════════════════════════════════════════════

const exchangeCache = new Map(); // symbol -> { data, ts }
const EXCHANGE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// CoinGecko ID lookup — same as frontend majorTokens.js
const SYMBOL_TO_CG_ID = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', AVAX: 'avalanche-2',
  DOT: 'polkadot', LINK: 'chainlink', UNI: 'uniswap', MATIC: 'matic-network',
  ARB: 'arbitrum', OP: 'optimism', NEAR: 'near', APT: 'aptos', SUI: 'sui',
  INJ: 'injective-protocol', AAVE: 'aave', MKR: 'maker', PEPE: 'pepe',
  WIF: 'dogwifcoin', BONK: 'bonk', SHIB: 'shiba-inu', FET: 'fetch-ai',
  RNDR: 'render-token', RENDER: 'render-token', TAO: 'bittensor',
  SPECTRE: 'spectre-ai', LTC: 'litecoin', ATOM: 'cosmos', FIL: 'filecoin',
  GRT: 'the-graph', CRV: 'curve-dao-token', LDO: 'lido-dao',
};

// Token address lookup for DexScreener fallback
const SYMBOL_TO_ADDRESS = {
  SPECTRE: '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6',
};

/**
 * GET /api/token-exchanges?symbol=BTC
 * Returns { exchanges: ['Binance', 'Coinbase', ...], source: 'coingecko'|'dexscreener' }
 */
app.get('/api/token-exchanges', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  // Check cache
  const cached = exchangeCache.get(symbol);
  if (cached && (Date.now() - cached.ts) < EXCHANGE_CACHE_TTL) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(cached.data);
  }

  try {
    let exchanges = [];
    let source = '';

    // 1. Try CoinGecko /coins/{id}/tickers (has CEX data)
    const cgId = SYMBOL_TO_CG_ID[symbol];
    if (cgId) {
      try {
        const url = `${COINGECKO_BASE}/coins/${cgId}/tickers?include_exchange_logo=false&depth=false&order=trust_score_desc`;
        const opts = { headers: { Accept: 'application/json' } };
        if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
        const cgRes = await fetch(url, opts);
        if (cgRes.ok) {
          const data = await cgRes.json();
          const tickers = data.tickers || [];
          // Well-known exchanges get priority (tier 1 CEXes + major DEXes)
          const knownExchanges = new Set([
            'Binance', 'Coinbase Exchange', 'Kraken', 'OKX', 'Bybit',
            'KuCoin', 'Bitfinex', 'Bitstamp', 'Crypto.com Exchange',
            'HTX', 'Gate.io', 'Upbit', 'MEXC', 'Bitget',
            'Uniswap V2 (Ethereum)', 'Uniswap V3 (Ethereum)', 'Uniswap V3 (Arbitrum One)',
            'Jupiter', 'Raydium', 'PancakeSwap V2 (BSC)', 'PancakeSwap V3 (BSC)',
            'Trader Joe', 'Curve (Ethereum)', 'SushiSwap',
          ]);
          // Sort: known exchanges first, then by trust_score, then volume
          const trustOrder = { green: 0, yellow: 1, red: 2 };
          const sorted = [...tickers].sort((a, b) => {
            const aKnown = knownExchanges.has(a.market?.name) ? 0 : 1;
            const bKnown = knownExchanges.has(b.market?.name) ? 0 : 1;
            if (aKnown !== bKnown) return aKnown - bKnown;
            const ta = trustOrder[a.trust_score] ?? 3;
            const tb = trustOrder[b.trust_score] ?? 3;
            if (ta !== tb) return ta - tb;
            return (b.converted_volume?.usd || 0) - (a.converted_volume?.usd || 0);
          });
          // Deduplicate exchange names, prefer known/high-trust first
          const seen = new Set();
          for (const t of sorted) {
            let name = t.market?.name;
            if (!name || seen.has(name)) continue;
            seen.add(name);
            // Shorten verbose exchange names for display
            name = name.replace(' Exchange', '').replace(' (Ethereum)', '').replace(' (BSC)', '').replace(' (Arbitrum One)', '');
            exchanges.push(name);
          }
          if (exchanges.length > 0) source = 'coingecko';
        }
      } catch (e) {
        console.warn(`CoinGecko tickers for ${symbol}:`, e.message);
      }
    }

    // 2. Fallback: DexScreener (DEX data, works for any on-chain token)
    if (exchanges.length === 0) {
      const address = SYMBOL_TO_ADDRESS[symbol];
      if (address) {
        try {
          const dsRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
          if (dsRes.ok) {
            const data = await dsRes.json();
            const pairs = data.pairs || [];
            const seen = new Set();
            for (const p of pairs) {
              // Capitalise DEX name nicely
              const dex = p.dexId;
              if (dex && !seen.has(dex)) {
                seen.add(dex);
                const name = dex.charAt(0).toUpperCase() + dex.slice(1).replace(/v(\d)/, ' V$1');
                exchanges.push(name);
              }
            }
            if (exchanges.length > 0) source = 'dexscreener';
          }
        } catch (e) {
          console.warn(`DexScreener tickers for ${symbol}:`, e.message);
        }
      }
    }

    // Take top 5 exchanges max
    const result = { exchanges: exchanges.slice(0, 5), source };

    // Only cache non-empty results — empty means API was rate-limited, retry next time
    if (exchanges.length > 0) {
      exchangeCache.set(symbol, { data: result, ts: Date.now() });
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(result);
  } catch (err) {
    console.error('Token exchanges error:', err.message);
    res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFI YIELDS — DeFiLlama yields API aggregator (no API key needed)
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_DEFI_YIELDS_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/defi/yields
 * Fetch yield opportunities from DeFiLlama, with filtering and sorting.
 * Query params:
 *   - chain: filter by chain name (e.g., ethereum, solana, arbitrum)
 *   - minTvl: minimum TVL in USD (e.g., 1000000)
 *   - sort: 'apy' (default, high to low) | 'tvl' (high to low)
 *   - stablecoin: 'true' to only show stablecoin pools
 *   - limit: max results (default 50, max 100)
 */
app.get('/api/defi/yields', async (req, res) => {
  try {
    const chain = (req.query.chain || '').toLowerCase().trim();
    const minTvl = parseFloat(req.query.minTvl) || 0;
    const sort = (req.query.sort || 'apy').toLowerCase();
    const stablecoinOnly = req.query.stablecoin === 'true';
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const cacheKey = `yields-${chain || 'all'}-${minTvl}-${sort}-${stablecoinOnly}-${limit}`;
    const cached = getCached(cache.defiYields, cacheKey, CACHE_TTL_DEFI_YIELDS_MS);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }

    // Fetch from DeFiLlama yields API (public, no key)
    const response = await fetch('https://yields.llama.fi/pools', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error('DeFiLlama yields API error:', response.status);
      return res.status(502).json({ error: 'DeFiLlama API unavailable' });
    }

    const data = await response.json();
    let pools = Array.isArray(data.data) ? data.data : [];

    // Apply filters
    if (chain) {
      pools = pools.filter(p => (p.chain || '').toLowerCase() === chain);
    }
    if (minTvl > 0) {
      pools = pools.filter(p => (p.tvlUsd || 0) >= minTvl);
    }
    if (stablecoinOnly) {
      pools = pools.filter(p => p.stablecoin === true);
    }

    // Sort
    if (sort === 'tvl') {
      pools.sort((a, b) => (b.tvlUsd || 0) - (a.tvlUsd || 0));
    } else {
      // Default: APY high to low
      pools.sort((a, b) => (b.apy || 0) - (a.apy || 0));
    }

    // Format response
    const formatted = pools.slice(0, limit).map(p => ({
      protocol: p.project || 'Unknown',
      chain: p.chain || 'Unknown',
      symbol: p.symbol || 'Unknown',
      apy: p.apy || 0,
      apyBase: p.apyBase || null,
      apyReward: p.apyReward || null,
      tvlUsd: p.tvlUsd || 0,
      stablecoin: p.stablecoin || false,
      poolId: p.pool || null,
      url: p.url || null,
    }));

    const result = {
      count: formatted.length,
      filters: { chain: chain || null, minTvl, sort, stablecoin: stablecoinOnly },
      data: formatted,
      timestamp: new Date().toISOString(),
    };

    // Cache result
    setCached(cache.defiYields, cacheKey, result, CACHE_TTL_DEFI_YIELDS_MS);

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (err) {
    console.error('DeFi yields error:', err.message);
    res.status(500).json({ error: 'Failed to fetch DeFi yields: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COINGECKO PROXY — Routes frontend CoinGecko calls through server with API key
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/coingecko/*', async (req, res) => {
  const path = req.params[0]; // everything after /api/coingecko/
  const qs = new URLSearchParams(req.query).toString();
  const url = `${COINGECKO_BASE}/${path}${qs ? '?' + qs : ''}`;

  try {
    const opts = { headers: { Accept: 'application/json' } };
    if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
    const cgRes = await fetch(url, opts);
    const data = await cgRes.text();
    res.setHeader('Cache-Control', 'public, max-age=15');
    res.setHeader('Content-Type', cgRes.headers.get('content-type') || 'application/json');
    res.status(cgRes.status).send(data);
  } catch (err) {
    console.error('CoinGecko proxy error:', err.message);
    res.status(502).json({ error: 'CoinGecko unavailable' });
  }
});

/** DexScreener chainId -> our networkId (Codex) */
const DEXSCREENER_CHAIN_TO_NETWORK = {
  solana: 1399811149,
  ethereum: 1,
  bsc: 56,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  avalanche: 43114,
  optimism: 10,
  fantom: 250,
  pulsechain: 369,
  ton: 607,
  cronos: 25,
  sui: 784,
  aptos: 637,
  sei: 1329,
  injective: 6900,
  'near-protocol': 397,
  linea: 59144,
  zksync: 324,
  scroll: 534352,
  mantle: 5000,
  blast: 81457,
  'polygon-zkevm': 1101,
  mode: 34443,
  treos: 606,
  berachain: 80094,
};

/**
 * GET /api/dexscreener-watchlist/:id
 * Fetch a DexScreener shared watchlist by ID (from URL .../watchlist/ID).
 * DexScreener does not document a public watchlist API; we try internal endpoints and HTML parsing.
 */
app.get('/api/dexscreener-watchlist/:id', async (req, res) => {
  try {
    const id = (req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Watchlist ID is required' });
    }

    console.log(`DexScreener import: Trying to fetch watchlist ID "${id}"`);
    
    // Try undocumented API patterns first
    const apiUrls = [
      `https://api.dexscreener.com/watchlists/v1/${id}`,
      `https://api.dexscreener.com/watchlist/${id}`,
      `https://api.dexscreener.com/latest/dex/watchlist/${id}`,
    ];
    for (const url of apiUrls) {
      try {
        console.log(`DexScreener: Trying API ${url}`);
        const r = await fetch(url, {
          headers: { 
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });
        console.log(`DexScreener API ${url}: status ${r.status}`);
        if (r.ok) {
          const data = await r.json();
          console.log(`DexScreener API response keys:`, Object.keys(data || {}));
          const pairs = data.pairs || data.watchlist?.pairs || data.items || data.tokens || (Array.isArray(data) ? data : []);
          if (pairs.length > 0) {
            console.log(`DexScreener: Found ${pairs.length} pairs from API`);
            const tokens = pairs.map((p) => {
              const base = p.baseToken || p.token || {};
              const chainId = (p.chainId || base.chainId || 'ethereum').toLowerCase();
              const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
              return {
                symbol: base.symbol || p.symbol || '?',
                name: base.name || p.name || base.symbol || 'Unknown',
                address: base.address || p.address || p.pairAddress,
                networkId,
                price: parseFloat(p.priceUsd || p.priceUSD || 0) || 0,
                change: parseFloat(p.priceChange?.h24 || p.priceChange?.h24 || 0) || 0,
                marketCap: parseFloat(p.fdv || p.marketCap || 0) || 0,
                logo: p.info?.imageUrl || base.info?.imageUrl,
              };
            }).filter((t) => t.address || t.symbol);
            return res.json({ tokens, source: 'api' });
          }
        }
      } catch (e) {
        console.log(`DexScreener API error for ${url}:`, e.message);
        // try next
      }
    }

    // Fetch watchlist page HTML and try to parse embedded data (e.g. __NEXT_DATA__)
    const pageUrl = `https://dexscreener.com/watchlist/${id}`;
    const pageRes = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Spectre/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) {
      return res.status(404).json({
        error: 'Watchlist not found or DexScreener is unavailable',
        hint: 'Paste the full URL: https://dexscreener.com/watchlist/YOUR_ID',
      });
    }
    const html = await pageRes.text();

    // Next.js: <script id="__NEXT_DATA__">...</script>
    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const props = nextData.props?.pageProps || nextData.props || {};
        const pairs = props.pairs || props.watchlist?.pairs || props.initialPairs || [];
        if (pairs.length > 0) {
          const tokens = pairs.map((p) => {
            const base = p.baseToken || p.token || {};
            const chainId = (p.chainId || base.chainId || 'ethereum').toLowerCase();
            const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
            return {
              symbol: base.symbol || p.symbol || '?',
              name: base.name || p.name || base.symbol || 'Unknown',
              address: base.address || p.address || p.pairAddress,
              networkId,
              price: parseFloat(p.priceUsd || p.priceUSD || 0) || 0,
              change: parseFloat(p.priceChange?.h24 || 0) || 0,
              marketCap: parseFloat(p.fdv || p.marketCap || 0) || 0,
              logo: p.info?.imageUrl || base.info?.imageUrl,
            };
          }).filter((t) => t.address || t.symbol);
          return res.json({ tokens, source: 'html' });
        }
      } catch (e) {
        console.error('DexScreener __NEXT_DATA__ parse error:', e.message);
      }
    }

    // Fallback: look for window.__INITIAL_STATE__ or similar
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
    if (stateMatch) {
      try {
        const state = JSON.parse(stateMatch[1]);
        const pairs = state.pairs || state.watchlist?.pairs || [];
        if (pairs.length > 0) {
          const tokens = pairs.map((p) => {
            const base = p.baseToken || p.token || {};
            const chainId = (p.chainId || base.chainId || 'ethereum').toLowerCase();
            const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
            return {
              symbol: base.symbol || p.symbol || '?',
              name: base.name || p.name || base.symbol || 'Unknown',
              address: base.address || p.address || p.pairAddress,
              networkId,
              price: parseFloat(p.priceUsd || p.priceUSD || 0) || 0,
              change: parseFloat(p.priceChange?.h24 || 0) || 0,
              marketCap: parseFloat(p.fdv || p.marketCap || 0) || 0,
              logo: p.info?.imageUrl || base.info?.imageUrl,
            };
          }).filter((t) => t.address || t.symbol);
          return res.json({ tokens, source: 'html' });
        }
      } catch (e) {
        console.error('DexScreener __INITIAL_STATE__ parse error:', e.message);
      }
    }

    // Try to find any JSON data in script tags that might contain pairs
    const scriptDataMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of scriptDataMatches) {
      const scriptContent = match[1];
      // Look for JSON objects with pairs array
      const jsonMatches = scriptContent.matchAll(/(\{[^{}]*"pairs"\s*:\s*\[[^\]]*\][^{}]*\})/g);
      for (const jsonMatch of jsonMatches) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          if (data.pairs && data.pairs.length > 0) {
            console.log(`DexScreener: Found ${data.pairs.length} pairs in script JSON`);
            const tokens = data.pairs.map((p) => {
              const base = p.baseToken || p.token || {};
              const chainId = (p.chainId || base.chainId || 'ethereum').toLowerCase();
              const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
              return {
                symbol: base.symbol || p.symbol || '?',
                name: base.name || p.name || base.symbol || 'Unknown',
                address: base.address || p.address || p.pairAddress,
                networkId,
                price: parseFloat(p.priceUsd || p.priceUSD || 0) || 0,
                change: parseFloat(p.priceChange?.h24 || 0) || 0,
                marketCap: parseFloat(p.fdv || p.marketCap || 0) || 0,
                logo: p.info?.imageUrl || base.info?.imageUrl,
              };
            }).filter((t) => t.address || t.symbol);
            return res.json({ tokens, source: 'script-json' });
          }
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    }

    // Try to extract pair addresses from the HTML and look them up via the pairs API
    const pairAddressMatches = html.matchAll(/\/(solana|ethereum|bsc|polygon|arbitrum|base|avalanche|fantom|optimism)\/([a-zA-Z0-9]{32,})/gi);
    const foundPairs = [];
    for (const match of pairAddressMatches) {
      const chain = match[1].toLowerCase();
      const pairAddress = match[2];
      if (!foundPairs.some(p => p.address === pairAddress)) {
        foundPairs.push({ chain, address: pairAddress });
      }
    }
    
    if (foundPairs.length > 0) {
      console.log(`DexScreener: Found ${foundPairs.length} pair addresses in HTML, fetching via pairs API...`);
      const tokens = [];
      
      // Fetch each pair (limit to first 20 to avoid rate limits)
      for (const pair of foundPairs.slice(0, 20)) {
        try {
          const pairUrl = `https://api.dexscreener.com/latest/dex/pairs/${pair.chain}/${pair.address}`;
          const pairRes = await fetch(pairUrl, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          });
          if (pairRes.ok) {
            const pairData = await pairRes.json();
            const p = pairData.pair || (pairData.pairs && pairData.pairs[0]);
            if (p) {
              const base = p.baseToken || {};
              const chainId = (p.chainId || pair.chain).toLowerCase();
              const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
              tokens.push({
                symbol: base.symbol || '?',
                name: base.name || base.symbol || 'Unknown',
                address: base.address,
                networkId,
                price: parseFloat(p.priceUsd || 0) || 0,
                change: parseFloat(p.priceChange?.h24 || 0) || 0,
                marketCap: parseFloat(p.fdv || p.marketCap || 0) || 0,
                liquidity: parseFloat(p.liquidity?.usd || 0) || 0,
                volume24: parseFloat(p.volume?.h24 || 0) || 0,
                logo: p.info?.imageUrl || base.info?.imageUrl,
              });
            }
          }
        } catch (e) {
          console.log(`DexScreener: Failed to fetch pair ${pair.chain}/${pair.address}:`, e.message);
        }
      }
      
      if (tokens.length > 0) {
        // Remove duplicates by address
        const uniqueTokens = tokens.filter((t, i, arr) => 
          arr.findIndex(x => x.address === t.address) === i
        );
        console.log(`DexScreener: Retrieved ${uniqueTokens.length} tokens via pairs API`);
        return res.json({ tokens: uniqueTokens, source: 'pairs-api' });
      }
    }

    console.log('DexScreener: All methods failed for watchlist import');
    console.log('HTML length:', html.length, 'Sample:', html.substring(0, 500));
    return res.status(404).json({
      error: 'Could not read this DexScreener watchlist. They may not expose shared watchlist data.',
      hint: 'Try copying individual pair addresses and adding them via search.',
    });
  } catch (error) {
    console.error('DexScreener watchlist error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch DexScreener watchlist',
    });
  }
});

/**
 * GET /api/dexscreener-pair/:chain/:address
 * Fetch a single token from DexScreener pair page using their public API.
 * Example: /api/dexscreener-pair/solana/abc123
 */
app.get('/api/dexscreener-pair/:chain/:address', async (req, res) => {
  try {
    const { chain, address } = req.params;
    if (!chain || !address) {
      return res.status(400).json({ error: 'Chain and address are required' });
    }
    
    console.log(`DexScreener pair lookup: ${chain}/${address}`);
    
    // Use DexScreener's documented public API for pairs
    const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${address}`;
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!r.ok) {
      return res.status(404).json({ error: 'Pair not found on DexScreener' });
    }
    
    const data = await r.json();
    const pair = data.pair || (data.pairs && data.pairs[0]);
    
    if (!pair) {
      return res.status(404).json({ error: 'Pair data not found' });
    }
    
    const base = pair.baseToken || {};
    const chainId = (pair.chainId || chain).toLowerCase();
    const networkId = DEXSCREENER_CHAIN_TO_NETWORK[chainId] || 1;
    
    const token = {
      symbol: base.symbol || '?',
      name: base.name || base.symbol || 'Unknown',
      address: base.address,
      networkId,
      price: parseFloat(pair.priceUsd || 0) || 0,
      change: parseFloat(pair.priceChange?.h24 || 0) || 0,
      marketCap: parseFloat(pair.fdv || pair.marketCap || 0) || 0,
      liquidity: parseFloat(pair.liquidity?.usd || 0) || 0,
      volume24: parseFloat(pair.volume?.h24 || 0) || 0,
      logo: pair.info?.imageUrl || base.info?.imageUrl,
    };
    
    console.log(`DexScreener pair found: ${token.symbol} on ${chainId}`);
    res.json({ token, source: 'dexscreener-pairs-api' });
    
  } catch (error) {
    console.error('DexScreener pair error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch pair' });
  }
});

/**
 * Get detailed token info including price, socials, description
 * Used for the main token banner section
 */
app.get('/api/token/details', async (req, res) => {
  try {
    const { address, networkId = 1 } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const netId = parseInt(networkId);
    const cacheKey = `${address.toLowerCase()}_${netId}`;
    const cached = getCached(cache.details, cacheKey, CACHE_TTL_DETAILS_MS);
    if (cached) {
      return res.json(cached);
    }
    
    // Query for token details including socials and description
    const tokenQuery = `
      query GetTokenInfo($address: String!, $networkId: Int!) {
        token(input: { address: $address, networkId: $networkId }) {
          address
          name
          symbol
          decimals
          networkId
          info {
            imageThumbUrl
            imageLargeUrl
            circulatingSupply
            totalSupply
            description
          }
          socialLinks {
            twitter
            discord
            telegram
            website
          }
        }
      }
    `;
    
    // Query for market data including on-chain metrics
    const marketQuery = `
      query GetMarketData($networkFilter: [Int!], $phrase: String!) {
        filterTokens(
          filters: { network: $networkFilter }
          phrase: $phrase
          limit: 1
        ) {
          results {
            priceUSD
            volume24
            liquidity
            marketCap
            change24
            change1
            change4
            change12
            holders
            txnCount24
            createdAt
            token {
              createdAt
            }
          }
        }
      }
    `;
    
    // Determine if this is a Solana address (case-sensitive, don't lowercase)
    const isSolanaNetwork = netId === 1399811149;
    const queryAddress = isSolanaNetwork ? address : address.toLowerCase();
    
    // Fetch both in parallel
    const [tokenData, marketData] = await Promise.all([
      executeCodexQuery(tokenQuery, { address: queryAddress, networkId: netId }),
      executeCodexQuery(marketQuery, { networkFilter: [netId], phrase: queryAddress }),
    ]);
    
    const token = tokenData?.token;
    const market = marketData?.filterTokens?.results?.[0];
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // Initial liquidity from filterTokens (may be just one pair)
    let liquidity = parseFloat(market?.liquidity) || 0;
    const marketCap = parseFloat(market?.marketCap) || 0;
    
    // Check if liquidity seems suspiciously low for the market cap
    // Normal ratio is usually 1:10 to 1:100 (mcap/liq)
    // If ratio is > 500, likely multiple pairs not aggregated
    const mcapToLiqRatio = marketCap > 0 && liquidity > 0 ? marketCap / liquidity : 0;
    
    if (mcapToLiqRatio > 500 && marketCap > 1000000) {
      // Use liquidityMetadataByToken for aggregated liquidity across all pools
      console.log(`${token.symbol}: High mcap/liq ratio (${mcapToLiqRatio.toFixed(0)}x), fetching aggregated liquidity...`);
      
      try {
        const liquidityQuery = `
          query GetLiquidityMetadata($tokenAddress: String!, $networkId: Int!) {
            liquidityMetadataByToken(
              tokenAddress: $tokenAddress
              networkId: $networkId
            ) {
              totalLiquidityUsd
              lockedLiquidityUsd
            }
          }
        `;
        
        const liquidityData = await executeCodexQuery(liquidityQuery, {
          tokenAddress: queryAddress,
          networkId: netId,
        });
        
        const metadata = liquidityData?.liquidityMetadataByToken;
        
        if (metadata && metadata.totalLiquidityUsd) {
          const totalLiquidity = parseFloat(metadata.totalLiquidityUsd) || 0;
          console.log(`${token.symbol}: Aggregated liquidity: $${totalLiquidity.toLocaleString()} (was $${liquidity.toLocaleString()})`);
          liquidity = totalLiquidity;
        }
      } catch (liqErr) {
        console.log(`Failed to fetch aggregated liquidity for ${token.symbol}:`, liqErr.message);
        // Keep original liquidity
      }
    }
    
    // Parse price and supplies
    const price = parseFloat(market?.priceUSD) || 0;
    const circulatingSupply = parseFloat(token.info?.circulatingSupply) || 0;
    const totalSupply = parseFloat(token.info?.totalSupply) || 0;
    
    // Calculate market cap ourselves instead of trusting API value
    // The API's marketCap field can be incorrect (e.g., for PAAL it shows $38.9M instead of correct value)
    // Our calculation: price × circulatingSupply
    let calculatedMarketCap = 0;
    if (price > 0 && circulatingSupply > 0) {
      calculatedMarketCap = price * circulatingSupply;
      console.log(`${token.symbol}: Calculated MCap = $${calculatedMarketCap.toLocaleString()} (price: $${price}, circSupply: ${circulatingSupply.toLocaleString()})`);
    } else if (marketCap > 0) {
      // Fallback to API value if we can't calculate
      calculatedMarketCap = marketCap;
      console.log(`${token.symbol}: Using API MCap = $${marketCap.toLocaleString()} (no circulating supply available)`);
    }
    
    // Calculate token age from createdAt
    const createdAt = market?.createdAt || market?.token?.createdAt;
    let ageInDays = null;
    if (createdAt) {
      const createdDate = new Date(createdAt * 1000); // Unix timestamp
      const now = new Date();
      ageInDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    }
    
    // Combine the data
    const result = {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      networkId: token.networkId,
      logo: token.info?.imageLargeUrl || token.info?.imageThumbUrl,
      description: token.info?.description || '',
      circulatingSupply: circulatingSupply > 0 ? circulatingSupply : token.info?.circulatingSupply,
      totalSupply: totalSupply > 0 ? totalSupply : token.info?.totalSupply,
      socials: {
        twitter: token.socialLinks?.twitter,
        discord: token.socialLinks?.discord,
        telegram: token.socialLinks?.telegram,
        website: token.socialLinks?.website,
      },
      price: price,
      volume24: parseFloat(market?.volume24) || 0,
      liquidity: liquidity,
      marketCap: calculatedMarketCap,
      apiMarketCap: marketCap, // Keep the original API value for debugging
      change24: parseFloat(market?.change24) || 0,
      change1h: parseFloat(market?.change1) || 0,
      change4h: parseFloat(market?.change4) || 0,
      change12h: parseFloat(market?.change12) || 0,
      holders: parseInt(market?.holders) || 0,
      // On-chain metrics
      txnCount24: parseInt(market?.txnCount24) || 0,
      createdAt: createdAt,
      age: ageInDays, // Age in days
    };
    
    setCached(cache.details, cacheKey, result, CACHE_TTL_DETAILS_MS);
    res.json(result);
    
  } catch (error) {
    console.error('Token details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// All supported Codex networks
const CODEX_NETWORKS = {
  // Solana
  1399811149: 'Solana',
  // EVM Networks
  1: 'Ethereum',
  56: 'BNB Chain',
  137: 'Polygon',
  42161: 'Arbitrum',
  8453: 'Base',
  43114: 'Avalanche',
  10: 'Optimism',
  250: 'Fantom',
  42220: 'Celo',
  1284: 'Moonbeam',
  1285: 'Moonriver',
  100: 'Gnosis',
  1101: 'Polygon zkEVM',
  324: 'zkSync Era',
  59144: 'Linea',
  534352: 'Scroll',
  5000: 'Mantle',
  169: 'Manta Pacific',
  81457: 'Blast',
  7777777: 'Zora',
  666666666: 'Degen',
  2222: 'Kava',
  1088: 'Metis',
  288: 'Boba',
  25: 'Cronos',
  1313161554: 'Aurora',
  122: 'Fuse',
  40: 'Telos',
  592: 'Astar',
  1666600000: 'Harmony',
  128: 'HECO',
  66: 'OKX Chain',
  321: 'KCC',
};

// Get all network IDs
const ALL_NETWORK_IDS = Object.keys(CODEX_NETWORKS).map(n => parseInt(n));

// Popular Solana tokens that may not show in search (Codex API limitation)
const POPULAR_SOLANA_TOKENS = {
  'wif': { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: '$WIF', name: 'dogwifhat' },
  '$wif': { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: '$WIF', name: 'dogwifhat' },
  'dogwifhat': { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: '$WIF', name: 'dogwifhat' },
  'bonk': { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk' },
  'jup': { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', name: 'Jupiter' },
  'jupiter': { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', name: 'Jupiter' },
  'pyth': { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH', name: 'Pyth Network' },
  'jito': { address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', symbol: 'JTO', name: 'Jito' },
  'jto': { address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL', symbol: 'JTO', name: 'Jito' },
  'render': { address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', symbol: 'RENDER', name: 'Render' },
  'rndr': { address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof', symbol: 'RENDER', name: 'Render' },
  'popcat': { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT', name: 'Popcat' },
  'wen': { address: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk', symbol: 'WEN', name: 'Wen' },
  'bome': { address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', symbol: 'BOME', name: 'Book of Meme' },
  'moodeng': { address: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY', symbol: 'MOODENG', name: 'Moo Deng' },
  'moo deng': { address: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY', symbol: 'MOODENG', name: 'Moo Deng' },
};

/**
 * Search tokens by name, symbol, or address
 */
app.get('/api/tokens/search', async (req, res) => {
  try {
    const { q, networks } = req.query;
    
    console.log(`Search request: q="${q}", networks="${networks}"`);
    
    if (!q || q.length < 2) {
      console.log('Search query too short');
      return res.json({ results: [] });
    }

    // Use provided networks or default to all
    const networkIds = networks 
      ? networks.split(',').map(n => parseInt(n))
      : ALL_NETWORK_IDS;
    
    const searchQuery = q.trim();
    console.log(`Searching for: "${searchQuery}" on ${networkIds.length} networks`);
    
    // Check if searching by contract address
    const isEvmAddress = searchQuery.startsWith('0x') && searchQuery.length === 42;
    const isSolanaAddress = !searchQuery.startsWith('0x') && searchQuery.length >= 32 && searchQuery.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(searchQuery);
    const isContractSearch = isEvmAddress || isSolanaAddress;
    
    if (isContractSearch) {
      console.log(`Searching for ${isSolanaAddress ? 'Solana' : 'EVM'} contract ${searchQuery} across ${networkIds.length} networks...`);
      
      // Search by address across ALL networks in parallel for speed
      const tokenQuery = `
        query GetTokenByAddress($address: String!, $networkId: Int!) {
          token(input: { address: $address, networkId: $networkId }) {
            address
            name
            symbol
            decimals
            networkId
            info {
              imageThumbUrl
              imageLargeUrl
              circulatingSupply
            }
          }
        }
      `;
      
      // Try networks in batches for faster response
      const foundTokens = [];
      const batchSize = 10;
      
      for (let i = 0; i < networkIds.length; i += batchSize) {
        const batch = networkIds.slice(i, i + batchSize);
        const promises = batch.map(async (networkId) => {
          try {
            // Solana addresses are case-sensitive, EVM addresses should be lowercase
            const queryAddr = isSolanaAddress ? searchQuery : searchQuery.toLowerCase();
            const result = await executeCodexQuery(tokenQuery, { 
              address: queryAddr, 
              networkId 
            });
            
            if (result?.token) {
              return {
                token: result.token,
                networkId,
              };
            }
          } catch (err) {
            // Token not found on this network
          }
          return null;
        });
        
        const batchResults = await Promise.all(promises);
        foundTokens.push(...batchResults.filter(r => r !== null));
        
        // If we found results, break early
        if (foundTokens.length > 0) {
          break;
        }
      }
      
      if (foundTokens.length === 0) {
        console.log('Token not found on any network');
        return res.json({ results: [] });
      }
      
      console.log(`Found token on ${foundTokens.length} network(s), fetching market data...`);
      
      // Now fetch market data for found tokens
      const resultsWithMarketData = await Promise.all(foundTokens.map(async ({ token, networkId }) => {
        try {
          // Try filterTokens with token address to get market data
          const marketQuery = `
            query GetTokenMarketData($networkId: [Int!], $address: String!) {
              filterTokens(
                filters: { network: $networkId }
                tokens: [$address]
                limit: 1
              ) {
                results {
                  priceUSD
                  change24
                  volume24
                  liquidity
                  marketCap
                }
              }
            }
          `;
          
          let priceUSD = 0;
          let change24 = 0;
          let volume = 0;
          let liquidity = 0;
          let marketCap = 0;
          
          try {
            const queryAddr = isSolanaAddress ? searchQuery : searchQuery.toLowerCase();
            const marketData = await executeCodexQuery(marketQuery, {
              networkId: [networkId],
              address: queryAddr,
            });
            
            const stats = marketData?.filterTokens?.results?.[0];
            if (stats) {
              priceUSD = stats.priceUSD || 0;
              change24 = stats.change24 || 0;
              volume = stats.volume24 || 0;
              liquidity = stats.liquidity || 0;
              marketCap = stats.marketCap || 0;
            }
          } catch (filterErr) {
            console.log(`filterTokens failed for ${token.symbol}, trying pairs...`);
            
            // Fallback to pairs query
            const pairsQuery = `
              query GetTokenPairs($tokenAddress: String!, $networkId: Int!) {
                listPairsForToken(
                  tokenAddress: $tokenAddress
                  networkId: $networkId
                  limit: 1
                ) {
                  liquidity
                  volume24
                  priceUSD
                }
              }
            `;
            
            try {
              const queryAddr = isSolanaAddress ? searchQuery : searchQuery.toLowerCase();
              const pairsData = await executeCodexQuery(pairsQuery, {
                tokenAddress: queryAddr,
                networkId,
              });
              
              const mainPair = pairsData?.listPairsForToken?.[0];
              if (mainPair) {
                priceUSD = mainPair.priceUSD || 0;
                volume = mainPair.volume24 || 0;
                liquidity = mainPair.liquidity || 0;
              }
            } catch (pairsErr) {
              console.log(`Pairs query also failed for ${token.symbol}`);
            }
          }
          
          // Calculate market cap from circulating supply if available
          if (!marketCap && token.info?.circulatingSupply && priceUSD) {
            marketCap = parseFloat(token.info.circulatingSupply) * priceUSD;
          }
          
          console.log(`Market data for ${token.symbol}: price=$${priceUSD}, vol=$${volume}, liq=$${liquidity}, mcap=$${marketCap}`);
          
          return {
            token: {
              ...token,
              networkId,
              networkName: CODEX_NETWORKS[networkId] || `Network ${networkId}`,
            },
            priceUSD,
            change24,
            volume,
            liquidity,
            marketCap,
          };
        } catch (err) {
          console.error(`Failed to fetch market data for ${token.symbol}:`, err.message);
          // Return token without market data
          return {
            token: {
              ...token,
              networkId,
              networkName: CODEX_NETWORKS[networkId] || `Network ${networkId}`,
            },
            priceUSD: 0,
            change24: 0,
            volume: 0,
            liquidity: 0,
            marketCap: 0,
          };
        }
      }));
      
      return res.json({ results: resultsWithMarketData });
    }
    
    // Check if searching for a popular Solana token
    const searchLowerForPopular = searchQuery.toLowerCase();
    let popularSolanaResult = null;
    if (POPULAR_SOLANA_TOKENS[searchLowerForPopular]) {
      const popular = POPULAR_SOLANA_TOKENS[searchLowerForPopular];
      try {
        // Fetch token data directly by address
        const tokenQuery = `
          query GetToken($address: String!, $networkId: Int!) {
            token(input: { address: $address, networkId: $networkId }) {
              address
              symbol
              name
              networkId
              info {
                imageThumbUrl
                imageLargeUrl
              }
            }
          }
        `;
        const marketQuery = `
          query GetMarket($networkFilter: [Int!], $phrase: String!) {
            filterTokens(filters: { network: $networkFilter }, phrase: $phrase, limit: 1) {
              results {
                priceUSD
                volume24
                liquidity
                marketCap
                change24
                holders
              }
            }
          }
        `;
        
        const [tokenData, marketData] = await Promise.all([
          executeCodexQuery(tokenQuery, { address: popular.address, networkId: 1399811149 }),
          executeCodexQuery(marketQuery, { networkFilter: [1399811149], phrase: popular.address }),
        ]);
        
        if (tokenData?.token) {
          const market = marketData?.filterTokens?.results?.[0] || {};
          popularSolanaResult = {
            token: {
              ...tokenData.token,
              networkName: 'Solana',
            },
            priceUSD: market.priceUSD || 0,
            volume24: market.volume24 || 0,
            liquidity: market.liquidity || 0,
            marketCap: market.marketCap || 0,
            change24: market.change24 || 0,
            holders: market.holders || 0,
            volume: market.volume24 || 0,
            qualityScore: 200, // High score for known tokens
          };
          console.log(`Found popular Solana token: ${popular.symbol} - MC:${market.marketCap}, Liq:${market.liquidity}`);
        }
      } catch (e) {
        console.log(`Failed to fetch popular Solana token: ${e.message}`);
      }
    }
    
    // Text search - prioritize by LIQUIDITY (hardest to fake) not market cap
    const query = `
      query SearchTokens($search: String!, $networkFilter: [Int!], $limit: Int!) {
        filterTokens(
          filters: { network: $networkFilter }
          phrase: $search
          limit: $limit
          rankings: [
            { attribute: liquidity, direction: DESC }
          ]
        ) {
          results {
            token {
              address
              symbol
              name
              networkId
              info {
                imageThumbUrl
                imageLargeUrl
              }
            }
            volume24
            liquidity
            marketCap
            priceUSD
            change24
            holders
          }
        }
      }
    `;
    
    // For text search, use popular networks by default (including Solana!)
    const searchNetworks = networks 
      ? networkIds
      : [1399811149, 1, 56, 137, 42161, 8453, 43114, 10, 250, 324, 59144, 81457]; // Solana + Top EVM networks
    
    // Search with original query
    const result = await executeCodexQuery(query, { 
      search: searchQuery, 
      networkFilter: searchNetworks,
      limit: 50 // Fetch more to filter and sort
    });
    
    // Also search with $ prefix (many Solana tokens use $ in symbol)
    let dollarResults = { filterTokens: { results: [] } };
    if (!searchQuery.startsWith('$') && searchQuery.length <= 10) {
      try {
        dollarResults = await executeCodexQuery(query, { 
          search: `$${searchQuery}`, 
          networkFilter: searchNetworks,
          limit: 20
        });
      } catch (e) {
        // Ignore errors for dollar search
      }
    }
    
    // Combine results (include popular Solana token if found)
    const combinedResults = [
      ...(popularSolanaResult ? [popularSolanaResult] : []),
      ...(result?.filterTokens?.results || []),
      ...(dollarResults?.filterTokens?.results || [])
    ];
    
    // Deduplicate by address
    const seenAddresses = new Set();
    const rawResults = combinedResults.filter(r => {
      const addr = r.token?.address?.toLowerCase();
      if (!addr || seenAddresses.has(addr)) return false;
      seenAddresses.add(addr);
      return true;
    });
    
    // Smart quality scoring function - ranks tokens by legitimacy
    const calculateQualityScore = (r, searchTerm) => {
      let score = 0;
      
      const mcap = parseFloat(r.marketCap) || 0;
      const liq = parseFloat(r.liquidity) || 0;
      const volume = parseFloat(r.volume24) || 0;
      const holders = parseInt(r.holders) || 0;
      const price = parseFloat(r.priceUSD) || 0;
      const symbol = (r.token?.symbol || '').toLowerCase();
      const name = (r.token?.name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      // INSTANT DISQUALIFY: Obviously fake (trillion mcap with no liquidity)
      if (mcap > 100e9 && liq < 1000) return -1000;
      if (mcap > 1e12) return -1000; // No token is worth a trillion
      // Fake: huge mcap but zero/tiny liquidity
      if (mcap > 1e9 && liq < 100) return -1000;
      
      // MINIMUM REQUIREMENTS: Must have real liquidity AND market cap
      // Filter out micro tokens that are likely dead or scams
      if (liq < 1000) return -1000;  // Less than $1k liquidity = not tradeable
      if (mcap < 1000 && liq < 5000) return -1000;  // Tiny mcap with low liq = dead
      
      // RED FLAG: Liquidity much higher than market cap = fake/honeypot
      // Real tokens: mcap is usually 2-100x liquidity
      // Scam tokens often have huge fake liquidity but tiny mcap
      if (mcap > 0 && liq > 0) {
        const liqToMcapRatio = liq / mcap;
        if (liqToMcapRatio > 50) return -1000;  // Liquidity 50x+ market cap = scam
      }
      
      // Filter spam token names (common patterns in scam tokens)
      const nameLower = (r.token?.name || '').toLowerCase();
      const symbolLower = (r.token?.symbol || '').toLowerCase();
      const spamPatterns = ['spawn', 'test', 'scam', 'honeypot', 'rug', 'fake', 'airdrop'];
      for (const pattern of spamPatterns) {
        if (symbolLower.includes(pattern)) return -1000;
      }
      
      // Start with base score
      score = 10;
      
      // Liquidity scoring (most important - scams have $0)
      if (liq >= 1000000) score += 50;      // $1M+ liquidity = very legit
      else if (liq >= 100000) score += 40;  // $100k+
      else if (liq >= 10000) score += 30;   // $10k+
      else if (liq >= 5000) score += 20;    // $5k+
      else if (liq >= 1000) score += 10;    // $1k+
      
      // Volume scoring (real tokens are traded)
      if (volume >= 100000) score += 30;    // $100k+ daily volume
      else if (volume >= 10000) score += 20;
      else if (volume >= 1000) score += 10;
      else if (volume > 0) score += 5;
      
      // Market cap to liquidity ratio (should be reasonable)
      if (liq > 0 && mcap > 0) {
        const ratio = mcap / liq;
        if (ratio < 50) score += 15;        // Healthy ratio
        else if (ratio < 200) score += 5;
        else if (ratio > 10000) score -= 50; // Very suspicious
        else if (ratio > 5000) score -= 20;  // Suspicious
      }
      
      // Holder count (more holders = more legit)
      if (holders >= 10000) score += 15;
      else if (holders >= 1000) score += 10;
      else if (holders >= 100) score += 5;
      
      // Has a price (not dead)
      if (price > 0) score += 5;
      
      // Bonus for name/symbol match (helps find actual token user wants)
      // Handle $ prefix in symbols (e.g., $WIF should match WIF)
      const symbolClean = symbol.replace(/^\$/, '');
      const searchClean = search.replace(/^\$/, '');
      if (symbol === search || symbolClean === searchClean || name === search) score += 30;
      else if (symbol.startsWith(search) || symbolClean.startsWith(searchClean) || name.startsWith(search)) score += 15;
      else if (symbol.includes(search) || symbolClean.includes(searchClean) || name.includes(search)) score += 5;
      
      return score;
    };
    
    // Debug: log first few results before filtering
    if (rawResults.length > 0) {
      console.log(`Search "${searchQuery}" raw samples:`);
      rawResults.slice(0, 3).forEach(r => {
        const mcap = parseFloat(r.marketCap) || 0;
        const liq = parseFloat(r.liquidity) || 0;
        const vol = parseFloat(r.volume24) || 0;
        console.log(`  ${r.token?.symbol}: mcap=$${mcap.toExponential(2)}, liq=$${liq.toFixed(0)}, vol=$${vol.toFixed(0)}`);
      });
    }
    
    let resultsWithNames = rawResults
      .map(r => ({
        ...r,
        volume: r.volume24 || 0,
        // Keep hardcoded score for popular tokens (score >= 200), otherwise calculate
        qualityScore: (r.qualityScore && r.qualityScore >= 200) ? r.qualityScore : calculateQualityScore(r, searchQuery),
        token: {
          ...r.token,
          networkName: CODEX_NETWORKS[r.token.networkId] || `Network ${r.token.networkId}`,
        }
      }))
      // Filter out obvious scams (very negative score only)
      .filter(r => r.qualityScore > -100);
    
    console.log(`Search "${searchQuery}": API returned ${rawResults.length}, after filter: ${resultsWithNames.length}`);
    
    // Sort results: EXACT MATCHES FIRST, then starts-with, then contains
    const searchLower = searchQuery.toLowerCase().trim();
    const searchNoSpaces = searchLower.replace(/\s+/g, '');
    
    // Calculate match tier for each result
    const getMatchTier = (r) => {
      const symbol = (r.token.symbol || '').toLowerCase();
      const name = (r.token.name || '').toLowerCase();
      const symbolNoSpaces = symbol.replace(/\s+/g, '');
      const nameNoSpaces = name.replace(/\s+/g, '');
      // Handle $ prefix (e.g., "$WIF" should match "WIF")
      const symbolClean = symbol.replace(/^\$/, '');
      const searchClean = searchLower.replace(/^\$/, '');
      
      // TIER 1: Exact symbol or name match (e.g., "wif" matches "$WIF" or "WIF")
      if (symbol === searchLower || symbolNoSpaces === searchNoSpaces || symbolClean === searchClean) return 1;
      if (name === searchLower || nameNoSpaces === searchNoSpaces) return 2;
      
      // TIER 2: Symbol or name STARTS WITH search (e.g., "hash" matches "HashAI")
      if (symbol.startsWith(searchLower) || symbolNoSpaces.startsWith(searchNoSpaces) || symbolClean.startsWith(searchClean)) return 3;
      if (name.startsWith(searchLower) || nameNoSpaces.startsWith(searchNoSpaces)) return 4;
      
      // TIER 3: Symbol or name CONTAINS search
      if (symbol.includes(searchLower) || symbolNoSpaces.includes(searchNoSpaces) || symbolClean.includes(searchClean)) return 5;
      if (name.includes(searchLower) || nameNoSpaces.includes(searchNoSpaces)) return 6;
      
      // No match
      return 99;
    };
    
    resultsWithNames.sort((a, b) => {
      const aTier = getMatchTier(a);
      const bTier = getMatchTier(b);
      
      // Different tiers: lower tier wins (exact match = tier 1)
      if (aTier !== bTier) {
        return aTier - bTier;
      }
      
      // Same tier: sort by quality score (liquidity/volume)
      return (b.qualityScore || 0) - (a.qualityScore || 0);
    });
    
    console.log(`Search "${searchQuery}" top results:`, resultsWithNames.slice(0, 3).map(r => 
      `${r.token.symbol}(tier:${getMatchTier(r)},liq:${r.liquidity})`
    ).join(', '));
    
    // Limit to top 15 results
    resultsWithNames = resultsWithNames.slice(0, 15);
    
    console.log(`Search "${searchQuery}": ${resultsWithNames.length} quality results (top score: ${resultsWithNames[0]?.qualityScore || 0})`);
    
    console.log(`Text search for "${searchQuery}" returned ${resultsWithNames.length} results`);
    if (resultsWithNames.length > 0) {
      console.log('First result:', JSON.stringify(resultsWithNames[0], null, 2));
    }
    
    res.json({ results: resultsWithNames });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message, results: [] });
  }
});

/**
 * Get all supported networks
 */
app.get('/api/networks', (req, res) => {
  res.json({ 
    networks: Object.entries(CODEX_NETWORKS).map(([id, name]) => ({
      id: parseInt(id),
      name,
    }))
  });
});

/**
 * Well-known token addresses for major cryptocurrencies
 * These are the canonical wrapped versions on their primary networks
 */
const WELL_KNOWN_TOKENS = {
  // Bitcoin - use WBTC (Wrapped BTC) on Ethereum mainnet for accurate price
  BTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', networkId: 1, name: 'Bitcoin' },
  // Ethereum - use WETH on Ethereum mainnet
  ETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', networkId: 1, name: 'Ethereum' },
  // Solana - use wrapped SOL on Solana
  SOL: { address: 'So11111111111111111111111111111111111111112', networkId: 1399811149, name: 'Solana' },
};

/**
 * Internal: get price for one symbol (Codex first, CoinGecko fallback).
 * Returns { symbol, name?, address?, networkId?, price, change, volume, marketCap, liquidity } or null.
 */
async function getPriceForSymbol(symbol) {
  const upperSymbol = (symbol || '').toUpperCase();
  if (!upperSymbol) return null;
  try {
    if (WELL_KNOWN_TOKENS[upperSymbol]) {
      const knownToken = WELL_KNOWN_TOKENS[upperSymbol];
      const addressQuery = `
        query GetTokenByAddress($address: String!, $networkId: Int!) {
          filterTokens(
            filters: { network: [$networkId] }
            tokens: [$address]
            limit: 1
          ) {
            results {
              token { address symbol name networkId }
              priceUSD change24 change1 change4 change12 volume24 marketCap liquidity
            }
          }
        }
      `;
      const result = await executeCodexQuery(addressQuery, {
        address: knownToken.address,
        networkId: knownToken.networkId
      });
      const tokenData = result?.filterTokens?.results?.[0];
      if (tokenData) {
        const price = parseFloat(tokenData.priceUSD) || 0;
        return {
          symbol: upperSymbol,
          name: knownToken.name,
          address: knownToken.address,
          networkId: knownToken.networkId,
          price,
          change: parseFloat(tokenData.change24) || 0,
          change24: parseFloat(tokenData.change24) || 0,
          change1h: parseFloat(tokenData.change1) || 0,
          change7d: 0, // Codex doesn't provide 7d directly, would need separate query
          change30d: 0,
          change1y: 0,
          volume: parseFloat(tokenData.volume24) || 0,
          marketCap: parseFloat(tokenData.marketCap) || 0,
          liquidity: parseFloat(tokenData.liquidity) || 0,
        };
      }
    }
    const popularNetworks = [1, 56, 137, 42161, 8453, 43114, 10, 250];
    const query = `
      query GetTokenPrice($search: String!, $networkFilter: [Int!]) {
        filterTokens(
          filters: { network: $networkFilter }
          phrase: $search
          limit: 30
          rankings: [{ attribute: liquidity, direction: DESC }]
        ) {
          results {
            token { address symbol name networkId }
            priceUSD change24 volume24 marketCap liquidity holders
          }
        }
      }
    `;
    const result = await executeCodexQuery(query, {
      search: symbol,
      networkFilter: popularNetworks
    });
    const results = result?.filterTokens?.results || [];
    const getScore = (r) => {
      let score = 0;
      const liq = parseFloat(r.liquidity) || 0, vol = parseFloat(r.volume24) || 0;
      const mcap = parseFloat(r.marketCap) || 0, holders = parseInt(r.holders) || 0;
      if (mcap > 1e12 || (mcap > 100e9 && liq < 10000)) return -1000;
      score += Math.min(liq / 10000, 100) + Math.min(vol / 5000, 50) + Math.min(holders / 100, 30);
      if (liq > 0 && mcap > 0 && (mcap / liq) > 1000) score -= 50;
      return score;
    };
    const exactMatches = results
      .filter(r => r.token?.symbol?.toUpperCase() === upperSymbol)
      .map(r => ({ ...r, score: getScore(r) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
    if (exactMatches.length > 0) {
      const best = exactMatches[0];
      return {
        symbol: best.token.symbol,
        name: best.token.name,
        address: best.token.address,
        networkId: best.token.networkId,
        price: parseFloat(best.priceUSD) || 0,
        change: parseFloat(best.change24) || 0,
        change24: parseFloat(best.change24) || 0,
        change1h: parseFloat(best.change1) || 0,
        change7d: 0,
        change30d: 0,
        change1y: 0,
        volume: parseFloat(best.volume24) || 0,
        marketCap: parseFloat(best.marketCap) || 0,
        liquidity: parseFloat(best.liquidity) || 0,
      };
    }
    const cg = await fetchCoinGeckoPrice(upperSymbol);
    if (cg && cg.price > 0) {
      return {
        symbol: upperSymbol,
        name: upperSymbol,
        price: cg.price,
        change: cg.change,
        change24: cg.change || 0,
        change1h: 0,
        change7d: 0,
        change30d: 0,
        change1y: 0,
        volume: cg.volume || 0,
        marketCap: cg.marketCap || 0,
        liquidity: cg.liquidity || 0,
      };
    }
    return { symbol: upperSymbol, price: 0, change: 0, change24: 0, change1h: 0, change7d: 0, change30d: 0, change1y: 0, volume: 0, marketCap: 0, liquidity: 0 };
  } catch (err) {
    console.error(`Price lookup error for ${symbol}:`, err.message);
    const cg = await fetchCoinGeckoPrice(upperSymbol);
    if (cg && cg.price > 0) {
      return {
        symbol: upperSymbol,
        name: upperSymbol,
        price: cg.price,
        change: cg.change,
        change24: cg.change || 0,
        change1h: 0,
        change7d: 0,
        change30d: 0,
        change1y: 0,
        volume: cg.volume || 0,
        marketCap: cg.marketCap || 0,
        liquidity: cg.liquidity || 0,
      };
    }
    return { symbol: upperSymbol, price: 0, change: 0, change24: 0, change1h: 0, change7d: 0, change30d: 0, change1y: 0, volume: 0, marketCap: 0, liquidity: 0 };
  }
}

/** Batch: GET /api/tokens/prices?symbols=BTC,ETH,SOL – real-time Codex + CoinGecko fallback */
app.get('/api/tokens/prices', async (req, res) => {
  try {
    const raw = req.query.symbols || '';
    const symbols = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      return res.status(400).json({ error: 'symbols query required (e.g. symbols=BTC,ETH,SOL)' });
    }
    const cacheKey = [...symbols].sort((a, b) => a.localeCompare(b)).join(',').toUpperCase();
    const cached = getCached(cache.prices, cacheKey, CACHE_TTL_PRICES_MS);
    if (cached) {
      return res.json(cached);
    }
    const results = {};
    await Promise.all(symbols.map(async (s) => {
      const data = await getPriceForSymbol(s);
      if (data) results[data.symbol] = data;
    }));
    setCached(cache.prices, cacheKey, results, CACHE_TTL_PRICES_MS);
    res.json(results);
  } catch (e) {
    console.error('Batch prices error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** Single: GET /api/tokens/price/:symbol */
app.get('/api/tokens/price/:symbol', async (req, res) => {
  const data = await getPriceForSymbol(req.params.symbol);
  res.json(data || { symbol: req.params.symbol, price: 0, change: 0, volume: 0, marketCap: 0, liquidity: 0 });
});

/**
 * Get trending/top tokens by volume
 * Returns empty results if API fails - frontend will use fallback data
 */
app.get('/api/tokens/trending', async (req, res) => {
  try {
    const { limit = 20, networks = '1,56,137,42161,8453' } = req.query;
    const networkIds = networks.split(',').map(n => parseInt(n));
    const cacheKey = `${networks}_${limit}`;
    const cached = getCached(cache.trending, cacheKey, CACHE_TTL_TRENDING_MS);
    if (cached) {
      return res.json(cached);
    }
    
    // Use filterTokens with proper syntax
    const query = `
      query FilterTokens($networkFilter: [Int!], $limit: Int!) {
        filterTokens(
          filters: { network: $networkFilter }
          limit: $limit
          rankings: { attribute: volume24, direction: DESC }
        ) {
          results {
            token {
              address
              symbol
              name
              networkId
              info {
                imageThumbUrl
              }
            }
            volume24
            liquidity
            marketCap
            priceUSD
            change24
          }
        }
      }
    `;
    
    try {
      const result = await executeCodexQuery(query, { 
        networkFilter: networkIds, 
        limit: parseInt(limit) 
      });
      
      if (result?.filterTokens?.results) {
        // Map volume24 to volume for consistency
        const results = result.filterTokens.results.map(r => ({
          ...r,
          volume: r.volume24 || 0,
        }));
        const payload = { results };
        setCached(cache.trending, cacheKey, payload, CACHE_TTL_TRENDING_MS);
        return res.json(payload);
      }
    } catch (filterError) {
      console.log('filterTokens failed:', filterError.message);
    }
    
    // Return empty results - frontend will use fallback
    console.log('Trending: returning empty results, frontend will use fallback');
    res.json({ results: [] });
    
  } catch (error) {
    console.error('Trending error:', error);
    // Return empty results instead of error - prevents frontend crash
    res.json({ results: [] });
  }
});

/**
 * Get token details by address
 * If networkId is not provided, searches across all networks
 */
app.get('/api/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { networkId, searchAll } = req.query;
    
    const query = `
      query GetTokenInfo($address: String!, $networkId: Int!) {
        token(input: { address: $address, networkId: $networkId }) {
          address
          name
          symbol
          decimals
          totalSupply
          networkId
          info {
            circulatingSupply
            imageThumbUrl
            imageLargeUrl
          }
        }
      }
    `;
    
    // If specific network provided, just search that
    if (networkId && !searchAll) {
      const result = await executeCodexQuery(query, { 
        address: address.toLowerCase(), 
        networkId: parseInt(networkId) 
      });
      
      if (!result?.token) {
        return res.status(404).json({ error: 'Token not found' });
      }
      
      return res.json({
        ...result.token,
        networkName: CODEX_NETWORKS[result.token.networkId] || `Network ${result.token.networkId}`,
      });
    }
    
    // Search across all networks
    console.log(`Searching for token ${address} across all networks...`);
    
    const batchSize = 10;
    for (let i = 0; i < ALL_NETWORK_IDS.length; i += batchSize) {
      const batch = ALL_NETWORK_IDS.slice(i, i + batchSize);
      const promises = batch.map(async (netId) => {
        try {
          const result = await executeCodexQuery(query, { 
            address: address.toLowerCase(), 
            networkId: netId 
          });
          if (result?.token) {
            return {
              ...result.token,
              networkName: CODEX_NETWORKS[netId] || `Network ${netId}`,
            };
          }
        } catch (err) {
          // Not found on this network
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      const found = results.find(r => r !== null);
      
      if (found) {
        console.log(`Found token on ${found.networkName}`);
        return res.json(found);
      }
    }
    
    return res.status(404).json({ error: 'Token not found on any network' });
    
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get OHLCV bars for charting using getTokenBars (token-based, aggregated across all pairs)
 * Based on: https://docs.codex.io/recipes/charts
 * 
 * getTokenBars returns aggregated price data for a token across all valid pairs
 * No need to find specific pairs - works with any token address
 * 
 * Symbol can be:
 * 1. Already in "tokenAddress:networkId" format (e.g., "0x...:1")
 * 2. Just a token symbol (e.g., "SPECTRE") - will be looked up
 * 3. Just a token address (e.g., "0x...") - networkId from query param
 */
app.get('/api/bars', async (req, res) => {
  try {
    const { symbol, from, to, resolution = '60', networkId: reqNetworkId } = req.query;
    
    if (!symbol || !from || !to) {
      return res.status(400).json({ error: 'Missing required parameters: symbol, from, to' });
    }
    
    // Known tokens with their addresses (for symbol lookup)
    const KNOWN_TOKEN_ADDRESSES = {
      'SPECTRE': { address: '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6', networkId: 1 },
      'PEPE': { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', networkId: 1 },
      'DOGE': { address: '0x4206931337dc273a630d328dA6441786BfaD668f', networkId: 1 },
      'SHIB': { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', networkId: 1 },
      'FLOKI': { address: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E', networkId: 1 },
      'UNI': { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', networkId: 1 },
      'AAVE': { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', networkId: 1 },
      'LINK': { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', networkId: 1 },
      'GRT': { address: '0xc944E90C64B2c07662A292be6244BDf05Cda44a7', networkId: 1 },
      'MKR': { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', networkId: 1 },
      'CRV': { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', networkId: 1 },
      'SUSHI': { address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', networkId: 1 },
      'WIF': { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', networkId: 1399811149 },
      'BONK': { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', networkId: 1399811149 },
      'MOODENG': { address: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY', networkId: 1399811149 },
    };
    
    let tokenAddress;
    let networkId = parseInt(reqNetworkId) || 1;
    
    // Check if symbol is already in "tokenAddress:networkId" format
    if (symbol.includes(':')) {
      const parts = symbol.split(':');
      tokenAddress = parts[0];
      networkId = parseInt(parts[1]) || networkId;
      console.log(`Parsed symbol format: address=${tokenAddress}, networkId=${networkId}`);
    }
    // If symbol is just a token symbol (not an address), look it up
    else if (!symbol.startsWith('0x') && symbol.length < 32) {
      const upperSymbol = symbol.toUpperCase();
      const tokenInfo = KNOWN_TOKEN_ADDRESSES[upperSymbol];
      
      if (tokenInfo) {
        tokenAddress = tokenInfo.address;
        networkId = tokenInfo.networkId;
        console.log(`Looked up symbol ${upperSymbol}: address=${tokenAddress}, networkId=${networkId}`);
      } else {
        console.log(`Unknown token symbol for chart: ${upperSymbol}`);
        return res.json({ bars: [] });
      }
    }
    // It's a raw token address
    else {
      tokenAddress = symbol;
    }
    
    // Determine if it's a Solana address (base58, not starting with 0x)
    const isSolanaAddress = !tokenAddress.startsWith('0x') && tokenAddress.length >= 32 && tokenAddress.length <= 44;
    if (isSolanaAddress && networkId === 1) {
      networkId = 1399811149; // Solana network ID
    }
    
    // Format address correctly for API (lowercase for EVM, case-sensitive for Solana)
    const formattedAddress = isSolanaAddress ? tokenAddress : tokenAddress.toLowerCase();
    
    // Convert resolution to Codex format
    const resolutionMap = {
      '1': '1',
      '5': '5',
      '15': '15',
      '60': '60',
      '240': '240',
      '1D': '1D',
      '1W': '1W',
    };
    const codexResolution = resolutionMap[resolution] || resolution;
    
    // Use getTokenBars - aggregated chart data across all pairs for a token
    // Symbol format: "tokenAddress:networkId" (address first, then network)
    const tokenSymbol = `${formattedAddress}:${networkId}`;
    
    const barsQuery = `
      query GetTokenBars($symbol: String!, $from: Int!, $to: Int!, $resolution: String!) {
        getTokenBars(
          symbol: $symbol
          from: $from
          to: $to
          resolution: $resolution
        ) {
          o
          h
          l
          c
          t
          volume
        }
      }
    `;
    
    console.log(`Fetching token bars: symbol=${tokenSymbol}, from=${from}, to=${to}, resolution=${codexResolution}`);
    
    const result = await executeCodexQuery(barsQuery, { 
      symbol: tokenSymbol,
      from: parseInt(from), 
      to: parseInt(to), 
      resolution: codexResolution
    });
    
    // Response is in "table" format: { o: [], h: [], l: [], c: [], t: [], volume: [] }
    // Convert to array of bar objects for frontend
    const barsData = result?.getTokenBars;
    
    if (barsData && barsData.t && barsData.t.length > 0) {
      const bars = barsData.t.map((timestamp, i) => ({
        t: timestamp,
        o: barsData.o[i],
        h: barsData.h[i],
        l: barsData.l[i],
        c: barsData.c[i],
        v: parseFloat(barsData.volume?.[i]) || 0,
      }));
      
      console.log(`Got ${bars.length} bars for ${tokenSymbol}`);
      res.json({ bars });
    } else {
      console.log(`No bars data for ${tokenSymbol}`);
      res.json({ bars: [] });
    }
    
  } catch (error) {
    console.error('Bars error:', error);
    res.status(500).json({ error: error.message, bars: [] });
  }
});

/**
 * Get token pairs/pools
 */
app.get('/api/tokens/:address/pairs', async (req, res) => {
  try {
    const { address } = req.params;
    const { networkId = 1, limit = 10 } = req.query;
    
    const query = `
      query GetTokenPairs($tokenAddress: String!, $networkId: Int!, $limit: Int!) {
        listPairsForToken(
          tokenAddress: $tokenAddress
          networkId: $networkId
          limit: $limit
        ) {
          address
          token0
          token1
        }
      }
    `;
    
    const result = await executeCodexQuery(query, { 
      tokenAddress: address.toLowerCase(), 
      networkId: parseInt(networkId),
      limit: parseInt(limit)
    });
    
    res.json({ pairs: result?.listPairsForToken || [] });
    
  } catch (error) {
    console.error('Pairs error:', error);
    res.status(500).json({ error: error.message, pairs: [] });
  }
});

/**
 * Resolve TradingView symbol for any DEX token.
 * TradingView uses format: DEX:TOKEN0TOKEN1_POOLSUFFIX.USD
 * Example: UNISWAP:SPECTREWETH_8A6D95.USD
 * We query Codex for the token's top pair, then construct the TV symbol.
 */
app.get('/api/tradingview/symbol', async (req, res) => {
  try {
    const { address, networkId = 1, symbol: tokenSymbolParam = '' } = req.query;
    if (!address) return res.status(400).json({ error: 'Missing address parameter' });

    // Map networkId to DEX name for TradingView
    const DEX_NAMES = {
      1: 'UNISWAP',       // Ethereum → Uniswap
      56: 'PANCAKESWAP',   // BSC → PancakeSwap
      137: 'QUICKSWAP',    // Polygon → QuickSwap
      42161: 'CAMELOT',    // Arbitrum → Camelot
      8453: 'AERODROME',   // Base → Aerodrome
      43114: 'TRADERJOE',  // Avalanche → Trader Joe
      10: 'VELODROME',     // Optimism → Velodrome
      1399811149: 'RAYDIUM', // Solana → Raydium
    };

    const dexName = DEX_NAMES[parseInt(networkId)] || 'UNISWAP';
    const formattedAddress = address.startsWith('0x') ? address.toLowerCase() : address;

    // Query Codex for the token's pairs — minimal fields (Pair type only has address, token0, token1)
    const query = `
      query GetTokenPairs($tokenAddress: String!, $networkId: Int!) {
        listPairsForToken(
          tokenAddress: $tokenAddress
          networkId: $networkId
          limit: 5
        ) {
          address
          token0
          token1
        }
      }
    `;

    const result = await executeCodexQuery(query, {
      tokenAddress: formattedAddress,
      networkId: parseInt(networkId),
    });

    const pairs = result?.listPairsForToken || [];
    if (pairs.length === 0) {
      return res.json({ symbol: null, supported: false });
    }

    // Use the first pair (Codex returns them ordered by relevance)
    const topPair = pairs[0];

    // We need to resolve token0/token1 addresses to symbols
    // Common quote tokens with known symbols
    const KNOWN_QUOTES = {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
      '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'WBNB',
      '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
      'so11111111111111111111111111111111111111112': 'SOL',
    };

    // Determine which token is the target and which is the quote
    const isToken0 = topPair.token0?.toLowerCase() === formattedAddress.toLowerCase();
    const targetAddr = isToken0 ? topPair.token0 : topPair.token1;
    const quoteAddr = isToken0 ? topPair.token1 : topPair.token0;
    const targetSym = (tokenSymbolParam || address.slice(0, 6)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const quoteSym = KNOWN_QUOTES[quoteAddr?.toLowerCase()] || 'WETH';
    const poolSuffix = topPair.address.slice(-6).toUpperCase();

    // TradingView format: DEX:TOKEN0TOKEN1_POOLSUFFIX.USD
    const tvSymbol = `${dexName}:${targetSym}${quoteSym}_${poolSuffix}.USD`;

    console.log(`[TV] Resolved ${address} → ${tvSymbol} (pair: ${topPair.address})`);

    res.json({
      symbol: tvSymbol,
      supported: true,
      dex: dexName,
      pair: `${targetSym}/${quoteSym}`,
      pairAddress: topPair.address,
    });
  } catch (error) {
    console.error('TradingView symbol resolve error:', error);
    res.json({ symbol: null, supported: false, error: error.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   TradingView Universal Symbol Search — resolves ANY asset worldwide
   Uses TradingView's own symbol search API for stocks, crypto, forex, etc.
   Results are cached for 10 minutes to avoid rate-limiting.
   ═══════════════════════════════════════════════════════════════ */
const tvSearchCache = new Map();
const TV_SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.get('/api/tradingview/search', async (req, res) => {
  try {
    const { query, type = '' } = req.query;
    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'query parameter required' });
    }

    const cacheKey = `${query.toUpperCase()}:${type}`;
    const cached = tvSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < TV_SEARCH_CACHE_TTL) {
      return res.json(cached.data);
    }

    // Call TradingView's symbol search API
    const params = new URLSearchParams({
      text: query,
      hl: '1',
      exchange: '',
      lang: 'en',
      type: type, // 'stock', 'crypto', 'futures', 'forex', 'index', 'fund', '' for all
      domain: 'production',
    });

    const tvRes = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/?${params}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://www.tradingview.com',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!tvRes.ok) throw new Error(`TradingView search HTTP ${tvRes.status}`);
    const results = await tvRes.json();

    // Pick the best result — prioritize: spot > index > fund, primary_listing, USD pairs
    // For stocks: first result with is_primary_listing and type=stock
    // For crypto: first USDT spot on Binance, or first USD pair, or first spot
    let bestMatch = null;
    const sym = query.toUpperCase();

    if (type === 'stock') {
      // For stocks: prefer primary US listing
      bestMatch = results.find(r =>
        r.type === 'stock' && r.is_primary_listing && r.country === 'US'
      ) || results.find(r =>
        r.type === 'stock' && r.is_primary_listing
      ) || results.find(r =>
        r.type === 'stock'
      ) || results.find(r =>
        r.type === 'fund' && r.is_primary_listing
      );
    } else if (type === 'crypto') {
      // For crypto: prioritize Binance USDT, then major CEXes, then CRYPTO:XXXUSD
      const CEX_PRIORITY = ['BINANCE', 'BYBIT', 'OKX', 'COINBASE', 'KRAKEN', 'MEXC', 'BITGET'];
      const cleanSym = sym.replace(/<\/?em>/g, '');

      // 1. Exact match: Binance XXXUSDT spot
      bestMatch = results.find(r =>
        r.type === 'spot' && r.source_id === 'BINANCE' &&
        r.symbol.replace(/<\/?em>/g, '') === `${cleanSym}USDT`
      );
      // 2. Any Binance spot pair
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot' && r.source_id === 'BINANCE'
      );
      // 3. USDT spot on major CEX
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot' && r.currency_code === 'USDT' &&
        CEX_PRIORITY.includes(r.source_id)
      );
      // 4. USD spot on major CEX (Coinbase, Kraken often have USD pairs)
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot' && r.currency_code === 'USD' &&
        CEX_PRIORITY.includes(r.source_id)
      );
      // 5. CRYPTO:XXXUSD (TradingView's own aggregated data)
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot' && r.source_id === 'CRYPTO' &&
        r.symbol.replace(/<\/?em>/g, '').endsWith('USD')
      );
      // 6. Any USDT spot pair
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot' && r.currency_code === 'USDT'
      );
      // 7. Any spot pair at all
      if (!bestMatch) bestMatch = results.find(r =>
        r.type === 'spot'
      );
    } else {
      // General: just pick the first result
      bestMatch = results[0];
    }

    if (!bestMatch) {
      const data = { found: false, symbol: null, exchange: null, type: null };
      tvSearchCache.set(cacheKey, { ts: Date.now(), data });
      return res.json(data);
    }

    // Build the TradingView-formatted symbol
    const exchange = (bestMatch.prefix || bestMatch.source_id || bestMatch.exchange || '').toUpperCase();
    const tvSymbol = exchange ? `${exchange}:${bestMatch.symbol.replace(/<\/?em>/g, '')}` : bestMatch.symbol.replace(/<\/?em>/g, '');

    const data = {
      found: true,
      symbol: tvSymbol,
      exchange: exchange,
      description: (bestMatch.description || '').replace(/<\/?em>/g, ''),
      type: bestMatch.type,
      country: bestMatch.country || null,
      isPrimaryListing: bestMatch.is_primary_listing || false,
    };

    tvSearchCache.set(cacheKey, { ts: Date.now(), data });
    res.json(data);
  } catch (error) {
    console.error('TradingView search error:', error.message);
    res.json({ found: false, symbol: null, error: error.message });
  }
});

/**
 * Get latest trades for a pair
 */
app.get('/api/trades/:pairAddress', async (req, res) => {
  try {
    const { pairAddress } = req.params;
    const { networkId = 1, limit = 50 } = req.query;
    
    const query = `
      query GetLatestTrades($pairAddress: String!, $networkId: Int!, $limit: Int!) {
        getLatestTrades(
          pairAddress: $pairAddress
          networkId: $networkId
          limit: $limit
        ) {
          timestamp
          type
          priceUSD
          amountToken
          amountUSD
          maker
          txHash
        }
      }
    `;
    
    const result = await executeCodexQuery(query, { 
      pairAddress: pairAddress.toLowerCase(), 
      networkId: parseInt(networkId),
      limit: parseInt(limit)
    });
    
    res.json({ trades: result?.getLatestTrades || [] });
    
  } catch (error) {
    console.error('Trades error:', error);
    res.status(500).json({ error: error.message, trades: [] });
  }
});

/**
 * Get trades for a token by token address (finds pairs first, then fetches trades)
 */
app.get('/api/token/trades', async (req, res) => {
  try {
    const { address, networkId = 1, limit = 50 } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const netId = parseInt(networkId);
    const isSolana = netId === 1399811149;
    const queryAddress = isSolana ? address : address.toLowerCase();
    
    // First get the token's pairs (minimal query - just address and tokens)
    const pairsQuery = `
      query GetPairs($tokenAddress: String!, $networkId: Int!) {
        listPairsForToken(
          tokenAddress: $tokenAddress
          networkId: $networkId
          limit: 5
        ) {
          address
          token0
          token1
        }
      }
    `;
    
    const pairsResult = await executeCodexQuery(pairsQuery, {
      tokenAddress: queryAddress,
      networkId: netId,
    });
    
    const pairs = pairsResult?.listPairsForToken || [];
    
    if (pairs.length === 0) {
      console.log(`No pairs found for token ${queryAddress}`);
      return res.json({ trades: [], pairs: [] });
    }
    
    // Take first pair (we can't sort by liquidity since it's not available)
    const mainPair = pairs[0];
    console.log(`Found ${pairs.length} pairs, fetching trades from main pair: ${mainPair.address}`);
    
    // Fetch token events for the main pair
    const eventsQuery = `
      query GetTokenEvents($address: String!, $networkId: Int!, $limit: Int!) {
        getTokenEvents(
          query: {
            address: $address
            networkId: $networkId
          }
          limit: $limit
        ) {
          items {
            timestamp
            eventType
            token0SwapValueUsd
            token1SwapValueUsd
            maker
            transactionHash
            data {
              ... on SwapEventData {
                amount0In
                amount0Out
                amount1In
                amount1Out
                priceUsd
                amount0
                amount1
              }
            }
          }
        }
      }
    `;
    
    // Don't lowercase Solana addresses - they are Base58 and case-sensitive
    const pairAddress = isSolana ? mainPair.address : mainPair.address.toLowerCase();
    
    const eventsResult = await executeCodexQuery(eventsQuery, {
      address: pairAddress,
      networkId: netId,
      limit: parseInt(limit),
    });
    
    const events = eventsResult?.getTokenEvents?.items || [];
    
    // Find which token is our target token (token0 and token1 are addresses as strings)
    // For Solana, don't lowercase for comparison
    const isToken0 = isSolana 
      ? mainPair.token0 === queryAddress
      : (mainPair.token0 || '').toLowerCase() === queryAddress.toLowerCase();
    
    // For Solana, get token decimals to calculate correct USD values
    let tokenDecimals = 9; // Default for SOL
    if (isSolana) {
      try {
        const tokenInfoQuery = `
          query GetTokenInfo($address: String!, $networkId: Int!) {
            token(input: { address: $address, networkId: $networkId }) {
              decimals
            }
          }
        `;
        const tokenInfoResult = await executeCodexQuery(tokenInfoQuery, { 
          address: queryAddress, 
          networkId: netId 
        });
        tokenDecimals = tokenInfoResult?.token?.decimals || 9;
        console.log(`Token decimals for ${queryAddress}: ${tokenDecimals}`);
      } catch (e) {
        console.log('Could not fetch token decimals, using default:', e.message);
      }
    }
    
    // Transform events to trades
    // EVM chains use wei (18 decimals), Solana uses token-specific decimals
    const WEI_DIVISOR = 1e18;
    
    const trades = events
      .filter(event => event.eventType === 'Swap' || event.eventType === 'swap' || event.data)
      .map(event => {
        let isBuy;
        let tokenAmount;
        let otherTokenAmount;
        let totalUsd;
        const pricePerToken = parseFloat(event.data?.priceUsd || 0);
        
        if (isSolana) {
          // SOLANA: Uses amount0 and amount1 (positive = in, negative = out)
          const amount0 = parseFloat(event.data?.amount0 || 0);
          const amount1 = parseFloat(event.data?.amount1 || 0);
          
          // Determine direction and amounts based on which token is our target
          // Codex API convention for Solana: amounts are from POOL's perspective
          // Positive = tokens IN to pool (user SOLD to pool)
          // Negative = tokens OUT of pool (user BOUGHT from pool)
          if (isToken0) {
            // Our token is token0
            // If amount0 is negative, tokens went OUT of pool to user (BUY)
            // If amount0 is positive, tokens went IN to pool from user (SELL)
            isBuy = amount0 < 0;
            tokenAmount = Math.abs(amount0);
            otherTokenAmount = Math.abs(amount1);
          } else {
            // Our token is token1
            // If amount1 is negative, tokens went OUT of pool to user (BUY)
            // If amount1 is positive, tokens went IN to pool from user (SELL)
            isBuy = amount1 < 0;
            tokenAmount = Math.abs(amount1);
            otherTokenAmount = Math.abs(amount0);
          }
          
          // Calculate USD from token amount and price
          // tokenAmount is in raw units, pricePerToken is per human-readable token
          const humanReadableAmount = tokenAmount / Math.pow(10, tokenDecimals);
          totalUsd = humanReadableAmount * pricePerToken;
          
          // Also convert tokenAmount to human-readable for display
          tokenAmount = humanReadableAmount;
        } else {
          // EVM CHAINS: Uses amount0In/Out, amount1In/Out with 18 decimals
          const amount0In = parseFloat(event.data?.amount0In || 0) / WEI_DIVISOR;
          const amount0Out = parseFloat(event.data?.amount0Out || 0) / WEI_DIVISOR;
          const amount1In = parseFloat(event.data?.amount1In || 0) / WEI_DIVISOR;
          const amount1Out = parseFloat(event.data?.amount1Out || 0) / WEI_DIVISOR;
          
          // Determine if buy or sell based on token flow
          // For our target token: if tokens going IN to the pair (user selling), it's a SELL
          // If tokens going OUT of the pair (user buying), it's a BUY
          if (isToken0) {
            isBuy = amount0Out > amount0In;
            tokenAmount = amount0In > 0 ? amount0In : amount0Out;
            otherTokenAmount = amount1In > 0 ? amount1In : amount1Out;
          } else {
            isBuy = amount1Out > amount1In;
            tokenAmount = amount1In > 0 ? amount1In : amount1Out;
            otherTokenAmount = amount0In > 0 ? amount0In : amount0Out;
          }
          
          // Calculate total USD value (amount * price)
          totalUsd = tokenAmount * pricePerToken;
        }
        
        return {
          timestamp: event.timestamp,
          type: isBuy ? 'Buy' : 'Sell',
          priceUSD: pricePerToken,
          amountToken: tokenAmount,
          amountUSD: totalUsd,
          amountOther: otherTokenAmount,
          maker: event.maker,
          txHash: event.transactionHash,
          isSolana: isSolana, // Pass this to frontend for proper formatting
        };
      });
    
    console.log(`Fetched ${trades.length} trades for ${queryAddress}`);
    res.json({ trades, pairs: [mainPair] });
    
  } catch (error) {
    console.error('Token trades error:', error);
    res.status(500).json({ error: error.message, trades: [], pairs: [] });
  }
});

// ═══════════════════════════════════════════════════════════
// MARKET INTELLIGENCE PROXY ENDPOINTS (Binance Futures + CoinGecko Global)
// Used by useMarketIntel hook for real-time market structure data
// ═══════════════════════════════════════════════════════════

const marketCache = new Map();
const MARKET_CACHE_TTL = 60000; // 60 seconds

function getMarketCache(key) {
  const entry = marketCache.get(key);
  if (entry && Date.now() - entry.ts < MARKET_CACHE_TTL) return entry.data;
  return null;
}
function setMarketCache(key, data) {
  marketCache.set(key, { data, ts: Date.now() });
}

// Funding rates (BTC + ETH) from Binance Futures
app.get('/api/market/funding', async (req, res) => {
  try {
    const cached = getMarketCache('funding');
    if (cached) return res.json(cached);
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
      fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&limit=1'),
    ]);
    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const result = {
      btc: btcData[0] ? parseFloat(btcData[0].fundingRate) * 100 : 0,
      eth: ethData[0] ? parseFloat(ethData[0].fundingRate) * 100 : 0,
      btcTime: btcData[0]?.fundingTime,
      ethTime: ethData[0]?.fundingTime,
    };
    setMarketCache('funding', result);
    res.json(result);
  } catch (err) {
    console.error('Funding rate error:', err.message);
    const cached = getMarketCache('funding');
    res.json(cached || { btc: 0, eth: 0 });
  }
});

// Open Interest from Binance Futures
app.get('/api/market/oi', async (req, res) => {
  try {
    const cached = getMarketCache('oi');
    if (cached) return res.json(cached);
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=ETHUSDT'),
    ]);
    const [btcData, ethData] = await Promise.all([btcRes.json(), ethRes.json()]);
    const result = {
      btc: btcData.openInterest ? parseFloat(btcData.openInterest) : 0,
      eth: ethData.openInterest ? parseFloat(ethData.openInterest) : 0,
    };
    setMarketCache('oi', result);
    res.json(result);
  } catch (err) {
    console.error('OI error:', err.message);
    res.json(getMarketCache('oi') || { btc: 0, eth: 0 });
  }
});

// Long/Short Ratio from Binance Futures
app.get('/api/market/ls-ratio', async (req, res) => {
  try {
    const cached = getMarketCache('lsRatio');
    if (cached) return res.json(cached);
    const response = await fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1');
    const data = await response.json();
    const entry = data[0];
    const result = {
      ratio: entry ? parseFloat(entry.longShortRatio) : 1,
      longs: entry ? parseFloat(entry.longAccount) * 100 : 50,
      shorts: entry ? parseFloat(entry.shortAccount) * 100 : 50,
      timestamp: entry?.timestamp,
    };
    setMarketCache('lsRatio', result);
    res.json(result);
  } catch (err) {
    console.error('L/S ratio error:', err.message);
    res.json(getMarketCache('lsRatio') || { ratio: 1, longs: 50, shorts: 50 });
  }
});

// Global market data from CoinGecko (dominance, total mcap, volume)
app.get('/api/market/global', async (req, res) => {
  try {
    const cached = getMarketCache('global');
    if (cached) return res.json(cached);
    const url = `${COINGECKO_BASE}/global`;
    const opts = { headers: {} };
    if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
    const response = await fetch(url, opts);
    const json = await response.json();
    const d = json.data;
    const result = {
      totalMarketCap: d?.total_market_cap?.usd || 0,
      totalVolume: d?.total_volume?.usd || 0,
      btcDominance: d?.market_cap_percentage?.btc || 0,
      ethDominance: d?.market_cap_percentage?.eth || 0,
      marketCapChange24h: d?.market_cap_change_percentage_24h_usd || 0,
      activeCryptos: d?.active_cryptocurrencies || 0,
      updatedAt: d?.updated_at || 0,
    };
    setMarketCache('global', result);
    res.json(result);
  } catch (err) {
    console.error('Global market error:', err.message);
    res.json(getMarketCache('global') || { totalMarketCap: 0, btcDominance: 56, ethDominance: 10 });
  }
});

// Top gainers/losers from Binance for anomaly detection
app.get('/api/market/tickers', async (req, res) => {
  try {
    const cached = getMarketCache('tickers');
    if (cached) return res.json(cached);
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const data = await response.json();
    // Filter for USDT pairs, sort by absolute price change
    const usdtPairs = data
      .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 1000000)
      .map(t => ({
        symbol: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    // Always include BTC/ETH/SOL for scenario agent pricing
    const majorCoins = {};
    ['BTC', 'ETH', 'SOL'].forEach(sym => {
      const t = usdtPairs.find(p => p.symbol === sym);
      if (t) majorCoins[sym.toLowerCase()] = t;
    });
    const result = {
      topGainers: usdtPairs.filter(t => t.change > 0).slice(0, 10),
      topLosers: usdtPairs.filter(t => t.change < 0).slice(0, 10),
      majorCoins,
      totalPairs: usdtPairs.length,
    };
    setMarketCache('tickers', result);
    res.json(result);
  } catch (err) {
    console.error('Tickers error:', err.message);
    res.json(getMarketCache('tickers') || { topGainers: [], topLosers: [], totalPairs: 0 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STOCKS — Yahoo Finance + Finnhub server-side proxy (no CORS issues)
// ═══════════════════════════════════════════════════════════════════════════════

const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Fallback stock data when Yahoo is down
const FALLBACK_STOCK_DATA = {
  'SPY': { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 612.45, change: 0.82, marketCap: 565000000000, volume: 68500000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'QQQ': { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 538.32, change: 1.15, marketCap: 265000000000, volume: 42300000, pe: null, sector: 'Index', exchange: 'NASDAQ' },
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 247.85, change: 1.24, marketCap: 3780000000000, volume: 52400000, pe: 32.2, sector: 'Technology', exchange: 'NASDAQ' },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 482.18, change: 0.95, marketCap: 3580000000000, volume: 18200000, pe: 35.5, sector: 'Technology', exchange: 'NASDAQ' },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 198.92, change: 0.67, marketCap: 2450000000000, volume: 21500000, pe: 22.8, sector: 'Technology', exchange: 'NASDAQ' },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 245.45, change: 1.85, marketCap: 2550000000000, volume: 35800000, pe: 38.1, sector: 'Consumer', exchange: 'NASDAQ' },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 958.52, change: 2.34, marketCap: 2400000000000, volume: 245000000, pe: 55.2, sector: 'Technology', exchange: 'NASDAQ' },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 412.15, change: -1.45, marketCap: 1350000000000, volume: 82000000, pe: 85.5, sector: 'Automotive', exchange: 'NASDAQ' },
  'META': { symbol: 'META', name: 'Meta Platforms', price: 632.78, change: 1.12, marketCap: 1620000000000, volume: 14500000, pe: 26.4, sector: 'Technology', exchange: 'NASDAQ' },
  'JPM': { symbol: 'JPM', name: 'JPMorgan Chase', price: 272.45, change: 0.45, marketCap: 785000000000, volume: 8200000, pe: 11.8, sector: 'Financial', exchange: 'NYSE' },
  'V': { symbol: 'V', name: 'Visa Inc.', price: 338.92, change: 0.78, marketCap: 622000000000, volume: 5800000, pe: 29.2, sector: 'Financial', exchange: 'NYSE' },
  'JNJ': { symbol: 'JNJ', name: 'Johnson & Johnson', price: 162.35, change: -0.32, marketCap: 392000000000, volume: 6500000, pe: 14.4, sector: 'Healthcare', exchange: 'NYSE' },
  'WMT': { symbol: 'WMT', name: 'Walmart Inc.', price: 102.45, change: 0.55, marketCap: 822000000000, volume: 12500000, pe: 38.8, sector: 'Consumer', exchange: 'NYSE' },
  'UNH': { symbol: 'UNH', name: 'UnitedHealth Group', price: 525.62, change: -0.85, marketCap: 485000000000, volume: 3200000, pe: 17.2, sector: 'Healthcare', exchange: 'NYSE' },
  'HD': { symbol: 'HD', name: 'Home Depot', price: 432.85, change: 0.92, marketCap: 430000000000, volume: 3800000, pe: 24.4, sector: 'Consumer', exchange: 'NYSE' },
  'BAC': { symbol: 'BAC', name: 'Bank of America', price: 48.82, change: 0.65, marketCap: 382000000000, volume: 32000000, pe: 13.2, sector: 'Financial', exchange: 'NYSE' },
  'XOM': { symbol: 'XOM', name: 'Exxon Mobil', price: 118.45, change: -0.42, marketCap: 528000000000, volume: 14500000, pe: 13.8, sector: 'Energy', exchange: 'NYSE' },
  'DIS': { symbol: 'DIS', name: 'Walt Disney Co.', price: 122.35, change: 1.25, marketCap: 225000000000, volume: 8500000, pe: 45.4, sector: 'Communication', exchange: 'NYSE' },
  'NFLX': { symbol: 'NFLX', name: 'Netflix Inc.', price: 942.45, change: 2.15, marketCap: 408000000000, volume: 4200000, pe: 42.2, sector: 'Communication', exchange: 'NASDAQ' },
  'AMD': { symbol: 'AMD', name: 'Advanced Micro Devices', price: 178.45, change: 1.85, marketCap: 288000000000, volume: 42000000, pe: 48.2, sector: 'Technology', exchange: 'NASDAQ' },
  'INTC': { symbol: 'INTC', name: 'Intel Corp.', price: 32.15, change: -0.95, marketCap: 136000000000, volume: 38000000, pe: 125.0, sector: 'Technology', exchange: 'NASDAQ' },
  'CRM': { symbol: 'CRM', name: 'Salesforce Inc.', price: 342.78, change: 0.92, marketCap: 332000000000, volume: 5200000, pe: 52.4, sector: 'Technology', exchange: 'NYSE' },
  'MA': { symbol: 'MA', name: 'Mastercard Inc.', price: 528.92, change: 0.85, marketCap: 492000000000, volume: 2800000, pe: 38.2, sector: 'Financial', exchange: 'NYSE' },
  'GS': { symbol: 'GS', name: 'Goldman Sachs', price: 582.45, change: 0.72, marketCap: 185000000000, volume: 2200000, pe: 16.8, sector: 'Financial', exchange: 'NYSE' },
  'COIN': { symbol: 'COIN', name: 'Coinbase Global', price: 285.32, change: 3.85, marketCap: 72000000000, volume: 8500000, pe: 42.5, sector: 'Financial', exchange: 'NASDAQ' },
  'PG': { symbol: 'PG', name: 'Procter & Gamble', price: 178.25, change: 0.28, marketCap: 420000000000, volume: 5200000, pe: 26.5, sector: 'Consumer', exchange: 'NYSE' },
  'GLD': { symbol: 'GLD', name: 'SPDR Gold Trust', price: 242.85, change: 0.32, marketCap: 72000000000, volume: 8200000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'IWM': { symbol: 'IWM', name: 'iShares Russell 2000', price: 228.45, change: 0.95, marketCap: 72000000000, volume: 28000000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'LLY': { symbol: 'LLY', name: 'Eli Lilly & Co.', price: 812.50, change: 0.68, marketCap: 772000000000, volume: 2800000, pe: 65.2, sector: 'Healthcare', exchange: 'NYSE' },
  'ORCL': { symbol: 'ORCL', name: 'Oracle Corp.', price: 182.45, change: 0.68, marketCap: 505000000000, volume: 8500000, pe: 38.2, sector: 'Technology', exchange: 'NYSE' },
  'PYPL': { symbol: 'PYPL', name: 'PayPal Holdings', price: 82.35, change: 1.42, marketCap: 88000000000, volume: 12500000, pe: 22.4, sector: 'Financial', exchange: 'NASDAQ' },
  'ADBE': { symbol: 'ADBE', name: 'Adobe Inc.', price: 542.35, change: 0.45, marketCap: 242000000000, volume: 2800000, pe: 42.8, sector: 'Technology', exchange: 'NASDAQ' },
};

// Popular stock symbols for sector grouping
const POPULAR_STOCK_SYMBOLS = [
  'SPY','QQQ','IWM','DIA','GLD','SLV','VOO',
  'AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META',
  'AMD','INTC','CRM','ADBE','ORCL','NFLX',
  'JPM','V','MA','BAC','GS','MS','C','WFC','COIN','PYPL','SQ',
  'JNJ','UNH','PFE','ABBV','MRK','LLY',
  'WMT','HD','PG','KO','PEP','COST','MCD','NKE','SBUX',
  'DIS','VZ','T',
  'XOM','CVX','COP',
  'BA','CAT','GE','UPS','HON',
];

// Shared Yahoo quote parser
function parseYahooQuote(quote) {
  if (!quote || !quote.symbol) return null;
  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || quote.symbol,
    price: quote.regularMarketPrice || 0,
    change: quote.regularMarketChangePercent || 0,
    changeAbs: quote.regularMarketChange || 0,
    previousClose: quote.regularMarketPreviousClose || 0,
    open: quote.regularMarketOpen || 0,
    high: quote.regularMarketDayHigh || 0,
    low: quote.regularMarketDayLow || 0,
    volume: quote.regularMarketVolume || 0,
    marketCap: quote.marketCap || 0,
    pe: quote.trailingPE || null,
    eps: quote.epsTrailingTwelveMonths || null,
    week52High: quote.fiftyTwoWeekHigh || null,
    week52Low: quote.fiftyTwoWeekLow || null,
    avgVolume: quote.averageDailyVolume3Month || 0,
    exchange: quote.exchange || '',
    sector: quote.sector || '',
    marketState: quote.marketState || 'CLOSED',
  };
}

// Internal: fetch a single symbol's price via Yahoo v8 chart endpoint
async function fetchYahooChartPrice(symbol) {
  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 6000,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    const prevClose = meta.chartPreviousClose || meta.regularMarketPrice;
    const change = prevClose > 0 ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0;
    return {
      symbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || symbol,
      price: meta.regularMarketPrice,
      change: +change.toFixed(2),
      changeAbs: +(meta.regularMarketPrice - prevClose).toFixed(2),
      previousClose: prevClose,
      open: 0,
      high: meta.regularMarketDayHigh || 0,
      low: meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      marketCap: 0, // chart endpoint doesn't provide this
      pe: null,
      eps: null,
      week52High: meta.fiftyTwoWeekHigh || null,
      week52Low: meta.fiftyTwoWeekLow || null,
      avgVolume: 0,
      exchange: meta.exchangeName || '',
      sector: '',
      marketState: meta.currentTradingPeriod ? 'REGULAR' : 'CLOSED',
    };
  } catch (err) {
    return null;
  }
}

// Internal: fetch Yahoo quotes with caching — uses v8 chart endpoint (v7 quote is dead)
async function fetchYahooQuotes(symbols) {
  const cacheKey = symbols.slice().sort().join(',');
  const cached = getCached(cache.stockQuotes, cacheKey, CACHE_TTL_STOCK_QUOTES_MS);
  if (cached) return cached;

  try {
    // Batch fetch via chart endpoint (one per symbol, parallelized)
    const chunks = [];
    for (let i = 0; i < symbols.length; i += 15) {
      chunks.push(symbols.slice(i, i + 15));
    }

    const result = {};
    for (const chunk of chunks) {
      const promises = chunk.map(s => fetchYahooChartPrice(s));
      const responses = await Promise.all(promises);
      responses.forEach(quote => {
        if (quote) {
          // Enrich with fallback data for fields chart doesn't provide (sector, marketCap, pe)
          const fb = FALLBACK_STOCK_DATA[quote.symbol];
          if (fb) {
            if (!quote.sector) quote.sector = fb.sector || '';
            if (!quote.marketCap || quote.marketCap === 0) quote.marketCap = fb.marketCap || 0;
            if (!quote.pe) quote.pe = fb.pe || null;
            if (!quote.exchange) quote.exchange = fb.exchange || '';
          }
          result[quote.symbol] = quote;
        }
      });
    }

    if (Object.keys(result).length > 0) {
      setCached(cache.stockQuotes, cacheKey, result, CACHE_TTL_STOCK_QUOTES_MS);
      return result;
    }
  } catch (err) {
    console.warn('Yahoo Finance chart fetch failed:', err.message);
  }

  // Return fallback for requested symbols
  const fallback = {};
  symbols.forEach(s => {
    if (FALLBACK_STOCK_DATA[s]) {
      const fb = FALLBACK_STOCK_DATA[s];
      const variation = 1 + (Math.random() - 0.5) * 0.002;
      fallback[s] = { ...fb, price: +(fb.price * variation).toFixed(2), change: +(fb.change + (Math.random() - 0.5) * 0.3).toFixed(2) };
    }
  });
  return fallback;
}

// Route 1: Batch stock quotes
app.get('/api/stocks/quotes', async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').split(',').filter(Boolean).map(s => s.trim().toUpperCase());
    if (symbols.length === 0) return res.json({});
    const quotes = await fetchYahooQuotes(symbols);
    res.json(quotes);
  } catch (err) {
    console.error('Stock quotes error:', err.message);
    res.json({});
  }
});

// Route 2: Single stock quote
app.get('/api/stocks/quote/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!symbol) return res.json(null);
    const quotes = await fetchYahooQuotes([symbol]);
    res.json(quotes[symbol] || null);
  } catch (err) {
    console.error('Stock quote error:', err.message);
    res.json(null);
  }
});

// Route 3: Stock search
app.get('/api/stocks/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const cacheKey = q.toLowerCase();
    const cached = getCached(cache.stockSearch, cacheKey, CACHE_TTL_STOCK_SEARCH_MS);
    if (cached) return res.json(cached);

    const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 });
    if (!response.ok) throw new Error(`Yahoo search ${response.status}`);
    const data = await response.json();

    if (data?.quotes && data.quotes.length > 0) {
      const results = data.quotes
        .filter(r => r.quoteType === 'EQUITY' || r.quoteType === 'ETF')
        .map(r => ({
          symbol: r.symbol,
          name: r.shortname || r.longname || r.symbol,
          type: r.quoteType,
          exchange: r.exchange || r.exchDisp || '',
          sector: r.sector || '',
        }))
        .slice(0, 12);
      setCached(cache.stockSearch, cacheKey, results, CACHE_TTL_STOCK_SEARCH_MS);
      return res.json(results);
    }
    res.json([]);
  } catch (err) {
    console.warn('Stock search error:', err.message);
    // Fallback: filter from popular stocks
    const q = (req.query.q || '').toLowerCase();
    const results = POPULAR_STOCK_SYMBOLS
      .filter(s => s.toLowerCase().includes(q))
      .slice(0, 12)
      .map(s => ({ symbol: s, name: FALLBACK_STOCK_DATA[s]?.name || s, type: 'EQUITY', exchange: FALLBACK_STOCK_DATA[s]?.exchange || '' }));
    res.json(results);
  }
});

// Route 4: Stock candles (OHLCV)
app.get('/api/stocks/candles', async (req, res) => {
  try {
    const symbol = (req.query.symbol || '').toUpperCase();
    const interval = req.query.interval || '1h';
    const range = req.query.range || '1mo';
    if (!symbol) return res.json({ bars: [] });

    const cacheKey = `${symbol}_${interval}_${range}`;
    const cached = getCached(cache.stockCandles, cacheKey, CACHE_TTL_STOCK_CANDLES_MS);
    if (cached) return res.json(cached);

    const url = `${YAHOO_CHART_URL}/${symbol}?interval=${interval}&range=${range}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    if (!response.ok) throw new Error(`Yahoo chart ${response.status}`);
    const data = await response.json();

    if (data?.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const bars = timestamps.map((t, i) => ({
        t, o: quote.open?.[i] || 0, h: quote.high?.[i] || 0,
        l: quote.low?.[i] || 0, c: quote.close?.[i] || 0, v: quote.volume?.[i] || 0,
      })).filter(bar => bar.o > 0 && bar.c > 0);

      const result2 = { bars };
      setCached(cache.stockCandles, cacheKey, result2, CACHE_TTL_STOCK_CANDLES_MS);
      return res.json(result2);
    }
    res.json({ bars: [] });
  } catch (err) {
    console.warn('Stock candles error:', err.message);
    res.json({ bars: [] });
  }
});

// Route 5: Market movers (gainers, losers, most active)
app.get('/api/stocks/movers', async (req, res) => {
  try {
    const cached = getCached(cache.stockMovers, 'movers', CACHE_TTL_STOCK_MOVERS_MS);
    if (cached) return res.json(cached);

    const watchSymbols = [
      'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA',
      'JPM','V','JNJ','UNH','HD','PG','MA','DIS','NFLX','PYPL',
      'ADBE','CRM','INTC','AMD','PEP','KO','MRK','PFE',
      'BA','CAT','GS','WMT','CVX','XOM','BAC','COIN','LLY','ORCL',
    ];
    const quotes = await fetchYahooQuotes(watchSymbols);
    const stocks = Object.values(quotes).filter(q => q.price > 0);
    const sorted = [...stocks].sort((a, b) => b.change - a.change);

    const result = {
      gainers: sorted.filter(s => s.change > 0).slice(0, 10),
      losers: sorted.filter(s => s.change < 0).slice(-10).reverse(),
      mostActive: [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 10),
    };
    setCached(cache.stockMovers, 'movers', result, CACHE_TTL_STOCK_MOVERS_MS);
    res.json(result);
  } catch (err) {
    console.error('Stock movers error:', err.message);
    res.json({ gainers: [], losers: [], mostActive: [] });
  }
});

// Route 6: Market indices (S&P 500, Dow, Nasdaq, Russell, VIX)
app.get('/api/stocks/indices', async (req, res) => {
  try {
    const cached = getCached(cache.stockIndices, 'indices', CACHE_TTL_STOCK_QUOTES_MS);
    if (cached) return res.json(cached);

    const indexSymbols = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX'];
    const indexNames = { '^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^IXIC': 'Nasdaq', '^RUT': 'Russell 2000', '^VIX': 'VIX' };
    const quotes = await fetchYahooQuotes(indexSymbols);
    const result = Object.entries(quotes).map(([symbol, data]) => ({
      ...data,
      name: indexNames[symbol] || data.name,
    }));
    setCached(cache.stockIndices, 'indices', result, CACHE_TTL_STOCK_QUOTES_MS);
    res.json(result);
  } catch (err) {
    console.error('Stock indices error:', err.message);
    res.json([]);
  }
});

// Route 7: Market news (general)
app.get('/api/stocks/news/market', async (req, res) => {
  try {
    const cached = getCached(cache.stockNews, 'market', CACHE_TTL_STOCK_NEWS_MS);
    if (cached) return res.json(cached);

    const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, { timeout: 6000 });
    if (!response.ok) throw new Error(`Finnhub news ${response.status}`);
    const articles = await response.json();

    const result = (articles || []).slice(0, 20).map(a => ({
      id: a.id,
      title: a.headline || a.title || '',
      summary: a.summary || '',
      source: a.source || '',
      url: a.url || '',
      image: a.image || '',
      publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : '',
      category: a.category || 'general',
    }));
    setCached(cache.stockNews, 'market', result, CACHE_TTL_STOCK_NEWS_MS);
    res.json(result);
  } catch (err) {
    console.warn('Market news error:', err.message);
    // Fallback mock news
    res.json([
      { id: 1, title: 'S&P 500 reaches new highs as tech stocks rally', summary: 'Major indices posted gains...', source: 'Reuters', publishedAt: new Date().toISOString(), category: 'general' },
      { id: 2, title: 'Federal Reserve signals steady rate path', summary: 'The Federal Reserve...', source: 'Bloomberg', publishedAt: new Date().toISOString(), category: 'general' },
      { id: 3, title: 'AI chip demand drives semiconductor surge', summary: 'NVIDIA and AMD shares...', source: 'CNBC', publishedAt: new Date().toISOString(), category: 'technology' },
      { id: 4, title: 'Earnings season kicks off with strong bank results', summary: 'JPMorgan and Goldman Sachs...', source: 'WSJ', publishedAt: new Date().toISOString(), category: 'general' },
    ]);
  }
});

// Route 8: Stock-specific news
app.get('/api/stocks/news/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!symbol) return res.json([]);

    const cacheKey = `news_${symbol}`;
    const cached = getCached(cache.stockNews, cacheKey, CACHE_TTL_STOCK_NEWS_MS);
    if (cached) return res.json(cached);

    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const response = await fetch(url, { timeout: 6000 });
    if (!response.ok) throw new Error(`Finnhub company news ${response.status}`);
    const articles = await response.json();

    const result = (articles || []).slice(0, 15).map(a => ({
      id: a.id,
      title: a.headline || '',
      summary: a.summary || '',
      source: a.source || '',
      url: a.url || '',
      image: a.image || '',
      publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : '',
      related: a.related || symbol,
    }));
    setCached(cache.stockNews, cacheKey, result, CACHE_TTL_STOCK_NEWS_MS);
    res.json(result);
  } catch (err) {
    console.warn('Stock news error:', err.message);
    res.json([]);
  }
});

// Route 9: Stocks grouped by sector
app.get('/api/stocks/sectors', async (req, res) => {
  try {
    const cached = getCached(cache.stockSectors, 'sectors', CACHE_TTL_STOCK_SECTORS_MS);
    if (cached) return res.json(cached);

    const quotes = await fetchYahooQuotes(POPULAR_STOCK_SYMBOLS);
    const sectorMap = {};

    // Group stocks by sector
    Object.values(quotes).forEach(stock => {
      const sector = stock.sector || 'Other';
      if (!sectorMap[sector]) sectorMap[sector] = { name: sector, stocks: [], totalMarketCap: 0, totalVolume: 0, changes: [] };
      sectorMap[sector].stocks.push(stock);
      sectorMap[sector].totalMarketCap += stock.marketCap || 0;
      sectorMap[sector].totalVolume += stock.volume || 0;
      if (typeof stock.change === 'number') sectorMap[sector].changes.push(stock.change);
    });

    // Calculate averages
    const sectors = Object.values(sectorMap).map(s => ({
      name: s.name,
      stockCount: s.stocks.length,
      avgChange: s.changes.length > 0 ? +(s.changes.reduce((a, b) => a + b, 0) / s.changes.length).toFixed(2) : 0,
      totalMarketCap: s.totalMarketCap,
      totalVolume: s.totalVolume,
      stocks: s.stocks.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)),
    })).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

    const result = { sectors };
    setCached(cache.stockSectors, 'sectors', result, CACHE_TTL_STOCK_SECTORS_MS);
    res.json(result);
  } catch (err) {
    console.error('Stock sectors error:', err.message);
    res.json({ sectors: [] });
  }
});

console.log('  Stocks: Yahoo Finance + Finnhub proxy (server-side, no CORS)');

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET — Real-time price streaming for active tokens
// Polls Codex /token/details every 5s and pushes price changes to subscribers
// ═══════════════════════════════════════════════════════════════════════════════
const http = require('http');
const WebSocket = require('ws');
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

// Track subscriptions: { address_networkId: Set<ws clients> }
const priceSubscriptions = new Map();
// Track active polling intervals per token
const activePricePollers = new Map();
// Last known price per token (avoid sending duplicates)
const lastKnownPrices = new Map();

function startPricePoller(address, networkId) {
  const key = `${address.toLowerCase()}_${networkId}`;
  if (activePricePollers.has(key)) return;

  console.log(`[WS] Starting price poller for ${key}`);

  const poll = async () => {
    const subscribers = priceSubscriptions.get(key);
    if (!subscribers || subscribers.size === 0) {
      // No subscribers left, stop polling
      clearInterval(activePricePollers.get(key));
      activePricePollers.delete(key);
      lastKnownPrices.delete(key);
      console.log(`[WS] Stopped price poller for ${key} (no subscribers)`);
      return;
    }

    try {
      const formattedAddress = address.startsWith('0x') ? address.toLowerCase() : address;
      const tokenSymbol = `${formattedAddress}:${networkId}`;

      // Quick price query via Codex
      const priceQuery = `
        query GetTokenPrice($symbol: String!) {
          getTokenBars(
            symbol: $symbol
            from: ${Math.floor(Date.now() / 1000) - 120}
            to: ${Math.floor(Date.now() / 1000)}
            resolution: "1"
          ) {
            o h l c t volume
          }
        }
      `;

      const result = await executeCodexQuery(priceQuery, { symbol: tokenSymbol });
      const bars = result?.getTokenBars;

      if (bars && bars.t && bars.t.length > 0) {
        const lastIdx = bars.t.length - 1;
        const price = parseFloat(bars.c[lastIdx]);
        const volume = parseFloat(bars.volume?.[lastIdx]) || 0;
        const open = parseFloat(bars.o[0]);

        // Only send if price changed
        const lastPrice = lastKnownPrices.get(key);
        if (lastPrice !== price) {
          lastKnownPrices.set(key, price);

          const msg = JSON.stringify({
            type: 'price_update',
            address,
            networkId,
            price,
            volume,
            open,
            change: open > 0 ? ((price - open) / open) : 0,
            timestamp: bars.t[lastIdx],
          });

          subscribers.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(msg);
            }
          });
        }
      }
    } catch (err) {
      // Silently continue polling - occasional errors are expected
    }
  };

  // Poll every 5 seconds
  poll();
  activePricePollers.set(key, setInterval(poll, 5000));
}

// Keep-alive ping every 25s to prevent idle disconnect
const wsKeepAlive = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);
wss.on('close', () => clearInterval(wsKeepAlive));

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let subscribedKeys = new Set();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'subscribe' && msg.address) {
        const networkId = msg.networkId || 1;
        const key = `${msg.address.toLowerCase()}_${networkId}`;

        if (!priceSubscriptions.has(key)) {
          priceSubscriptions.set(key, new Set());
        }
        priceSubscriptions.get(key).add(ws);
        subscribedKeys.add(key);

        // Start polling for this token if not already
        startPricePoller(msg.address, networkId);

        ws.send(JSON.stringify({ type: 'subscribed', address: msg.address, networkId }));
      }

      if (msg.type === 'unsubscribe' && msg.address) {
        const networkId = msg.networkId || 1;
        const key = `${msg.address.toLowerCase()}_${networkId}`;
        const subs = priceSubscriptions.get(key);
        if (subs) {
          subs.delete(ws);
          subscribedKeys.delete(key);
        }
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    // Clean up all subscriptions for this client
    subscribedKeys.forEach(key => {
      const subs = priceSubscriptions.get(key);
      if (subs) subs.delete(ws);
    });
  });
});

// ══════════════════════════════════════════════
// Sector Chart Proxy (avoids CORS from browser)
// ══════════════════════════════════════════════
const SECTOR_CHART_BASE = 'https://charts-277369611639.us-central1.run.app';
const SECTOR_COMPARE_BASE = 'https://sector-compare-277369611639.us-central1.run.app';

let sectorLineCache = { data: null, ts: 0 };
app.get('/api/sector/lines', async (req, res) => {
  try {
    // Cache for 2 minutes
    if (sectorLineCache.data && Date.now() - sectorLineCache.ts < 120000) {
      return res.json(sectorLineCache.data);
    }
    const resp = await fetch(`${SECTOR_CHART_BASE}/price_line_sect`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    sectorLineCache = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    console.error('Sector lines proxy error:', e.message);
    if (sectorLineCache.data) return res.json(sectorLineCache.data);
    res.status(502).json({ error: 'Sector API unavailable' });
  }
});

let sectorCompareCache = {};
app.get('/api/sector/compare', async (req, res) => {
  try {
    const { token_ids, sector } = req.query;
    const cacheKey = `${token_ids}_${sector}`;
    if (sectorCompareCache[cacheKey] && Date.now() - sectorCompareCache[cacheKey].ts < 120000) {
      return res.json(sectorCompareCache[cacheKey].data);
    }
    const params = new URLSearchParams();
    if (token_ids) params.set('token_ids', token_ids);
    if (sector) params.set('sector', sector);
    const resp = await fetch(`${SECTOR_COMPARE_BASE}/market-data?${params.toString()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    sectorCompareCache[cacheKey] = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    console.error('Sector compare proxy error:', e.message);
    res.status(502).json({ error: 'Sector compare API unavailable' });
  }
});

// ══════════════════════════════════════════════
// Compare Chart API — multi-entity % performance
// ══════════════════════════════════════════════

const CHAIN_TO_NATIVE_COINGECKO = {
  ethereum: { id: 'ethereum', name: 'Ethereum' },
  bsc: { id: 'binancecoin', name: 'BNB Chain' },
  polygon: { id: 'matic-network', name: 'Polygon' },
  arbitrum: { id: 'arbitrum', name: 'Arbitrum' },
  base: { id: 'ethereum', name: 'Base' },
  avalanche: { id: 'avalanche-2', name: 'Avalanche' },
  optimism: { id: 'optimism', name: 'Optimism' },
  fantom: { id: 'fantom', name: 'Fantom' },
  solana: { id: 'solana', name: 'Solana' },
  sui: { id: 'sui', name: 'Sui' },
  aptos: { id: 'aptos', name: 'Aptos' },
  sei: { id: 'sei-network', name: 'Sei' },
  injective: { id: 'injective-protocol', name: 'Injective' },
  near: { id: 'near', name: 'NEAR' },
  mantle: { id: 'mantle', name: 'Mantle' },
  cronos: { id: 'crypto-com-chain', name: 'Cronos' },
  ton: { id: 'the-open-network', name: 'TON' },
  berachain: { id: 'berachain-bera', name: 'Berachain' },
  linea: { id: 'ethereum', name: 'Linea' },
  zksync: { id: 'ethereum', name: 'zkSync' },
  scroll: { id: 'ethereum', name: 'Scroll' },
  blast: { id: 'ethereum', name: 'Blast' },
  celo: { id: 'celo', name: 'Celo' },
  tron: { id: 'tron', name: 'Tron' },
  cosmos: { id: 'cosmos', name: 'Cosmos' },
};

const compareChartCache = {};
const COMPARE_CACHE_TTL = 2 * 60 * 1000;

async function fetchCoinGeckoMarketChart(coinId, days, retries = 2) {
  const url = `${COINGECKO_BASE}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`;
  const opts = { headers: { Accept: 'application/json' } };
  if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);
    if (res.status === 429 && attempt < retries) {
      const wait = 2000 * (attempt + 1);
      console.log(`CoinGecko 429 for ${coinId}, retry ${attempt + 1} in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    if (!data.prices || !data.prices.length) throw new Error('No price data');
    const basePrice = data.prices[0][1];
    if (basePrice <= 0) throw new Error('Invalid base price');
    return data.prices.map(([ts, price]) => ({
      ts: Math.floor(ts / 1000),
      pct: ((price - basePrice) / basePrice) * 100,
    }));
  }
}

async function fetchSectorChartData(categoryId, days) {
  // Get top 3 tokens in category
  const listUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&category=${encodeURIComponent(categoryId)}&order=market_cap_desc&per_page=3&page=1`;
  const opts = { headers: { Accept: 'application/json' } };
  if (COINGECKO_API_KEY) opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
  let listRes;
  for (let attempt = 0; attempt <= 2; attempt++) {
    listRes = await fetch(listUrl, opts);
    if (listRes.status === 429 && attempt < 2) {
      const wait = 2000 * (attempt + 1);
      console.log(`CoinGecko 429 for category ${categoryId}, retry ${attempt + 1} in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    break;
  }
  if (!listRes.ok) throw new Error(`CoinGecko categories ${listRes.status}`);
  const coins = await listRes.json();
  if (!Array.isArray(coins) || !coins.length) throw new Error('No coins in category');

  // Fetch market_chart for each sequentially with delay to avoid rate limits
  const charts = [];
  for (let i = 0; i < Math.min(coins.length, 3); i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 600));
    try {
      const chart = await fetchCoinGeckoMarketChart(coins[i].id, days);
      if (chart) charts.push(chart);
    } catch { /* skip failed token */ }
  }
  if (!charts.length) throw new Error('No chart data for category tokens');

  // Average % changes across tokens by timestamp
  const ref = charts[0];
  return ref.map((pt, idx) => {
    let sum = pt.pct;
    let count = 1;
    for (let c = 1; c < charts.length; c++) {
      if (charts[c][idx]) {
        sum += charts[c][idx].pct;
        count++;
      }
    }
    return { ts: pt.ts, pct: sum / count };
  });
}

app.get('/api/compare/chart', async (req, res) => {
  try {
    const { entities: entitiesJson, days: daysStr } = req.query;
    if (!entitiesJson) return res.status(400).json({ error: 'Missing entities param' });

    let entities;
    try { entities = JSON.parse(entitiesJson); } catch { return res.status(400).json({ error: 'Invalid entities JSON' }); }
    if (!Array.isArray(entities) || entities.length === 0 || entities.length > 3) {
      return res.status(400).json({ error: 'entities must be array of 1-3 items' });
    }

    const days = [7, 30, 90, 180, 365].includes(Number(daysStr)) ? Number(daysStr) : 30;

    // Check cache
    const cacheKey = JSON.stringify({ entities, days });
    const cached = compareChartCache[cacheKey];
    if (cached && Date.now() - cached.ts < COMPARE_CACHE_TTL) {
      return res.json(cached.data);
    }

    const results = await Promise.all(entities.map(async (ent, idx) => {
      try {
        let data, name;
        if (ent.type === 'token') {
          data = await fetchCoinGeckoMarketChart(ent.id, days);
          name = ent.name || ent.id;
        } else if (ent.type === 'chain') {
          const chain = CHAIN_TO_NATIVE_COINGECKO[ent.id];
          if (!chain) throw new Error(`Unknown chain: ${ent.id}`);
          data = await fetchCoinGeckoMarketChart(chain.id, days);
          name = ent.name || chain.name;
        } else if (ent.type === 'sector') {
          data = await fetchSectorChartData(ent.id, days);
          name = ent.name || ent.id;
        } else {
          throw new Error(`Unknown type: ${ent.type}`);
        }
        return { id: ent.id, name, type: ent.type, colorIndex: idx, data };
      } catch (e) {
        console.warn(`Compare chart entity error (${ent.type}:${ent.id}):`, e.message);
        return { id: ent.id, name: ent.name || ent.id, type: ent.type, colorIndex: idx, data: [], error: e.message };
      }
    }));

    const result = { entities: results };
    compareChartCache[cacheKey] = { data: result, ts: Date.now() };
    res.json(result);
  } catch (err) {
    console.error('Compare chart error:', err.message);
    res.status(500).json({ error: 'Compare chart API failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BRIEF AUDIO — ElevenLabs TTS for AI Intelligence Brief voice mode
// ═══════════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// Audio cache: hash(text) -> { buffer, contentType, expires }
const briefAudioCache = new Map();
const BRIEF_AUDIO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const BRIEF_AUDIO_MAX_CHARS = 2000;
const BRIEF_FULL_AUDIO_MAX_CHARS = 3000; // Full AI Outlook brief (longer narrative)

// Rate limiting: ip -> last request timestamp
const briefAudioRateLimit = new Map();
const BRIEF_AUDIO_RATE_LIMIT_MS = 10 * 1000; // 10 seconds

// ── TTS Normalization — ticker symbols → spoken names, numbers → speech ───────
const TTS_SYMBOLS = {
  BTC:'Bitcoin',ETH:'Ethereum',SOL:'Solana',XRP:'Ripple',ADA:'Cardano',
  DOGE:'Dogecoin',DOT:'Polkadot',AVAX:'Avalanche',MATIC:'Polygon',
  LINK:'Chainlink',UNI:'Uniswap',AAVE:'Aave',ATOM:'Cosmos',FIL:'Filecoin',
  ARB:'Arbitrum',OP:'Optimism',APT:'Aptos',SUI:'Sui',NEAR:'Near Protocol',
  FET:'Fetch AI',RENDER:'Render',INJ:'Injective',TIA:'Celestia',
  PEPE:'Pepe',SHIB:'Shiba Inu',WIF:'Dogwifhat',BONK:'Bonk',FLOKI:'Floki',
  AAPL:'Apple',MSFT:'Microsoft',NVDA:'Nvidia',GOOGL:'Alphabet',GOOG:'Alphabet',
  TSLA:'Tesla',AMZN:'Amazon',META:'Meta',NFLX:'Netflix',CRM:'Salesforce',
  AMD:'A M D',INTC:'Intel',ORCL:'Oracle',ADBE:'Adobe',PYPL:'PayPal',
  DIS:'Disney',BA:'Boeing',JPM:'J P Morgan',V:'Visa',MA:'Mastercard',
  WMT:'Walmart',KO:'Coca-Cola',PEP:'Pepsi',JNJ:'Johnson and Johnson',
  SPY:'the S and P 500',QQQ:'the Nasdaq 100',DIA:'the Dow Jones',
  IWM:'the Russell 2000',GLD:'the Gold ETF',VIX:'the VIX',
};
const TTS_SORTED = Object.entries(TTS_SYMBOLS).sort((a,b) => b[0].length - a[0].length);

function ttsNormalize(text) {
  if (!text) return '';
  let r = text;
  r = r.replace(/S&P\s*500/gi, 'the S and P 500');
  r = r.replace(/S&P/gi, 'the S and P');
  for (const [sym, name] of TTS_SORTED) {
    r = r.replace(new RegExp(`\\b${sym}\\b`, 'g'), name);
  }
  r = r.replace(/\+(\d+(?:\.\d+)?)\s*%/g, 'up $1 percent');
  r = r.replace(/-(\d+(?:\.\d+)?)\s*%/g, 'down $1 percent');
  r = r.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent');
  r = r.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, '$1 dollars');
  r = r.replace(/\$/g, '');
  r = r.replace(/&/g, 'and');
  r = r.replace(/[*_~`#]/g, '');
  r = r.replace(/\s*[—–]\s*/g, ', ');
  // Fix double-article from already-normalized text (e.g. "the the VIX" → "the VIX")
  r = r.replace(/\bthe the\b/gi, 'the');
  r = r.replace(/\s+/g, ' ').trim();
  return r;
}

function stripMarkdownHtml(text) {
  return text
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[#*_~`>\[\]()!]/g, '')  // strip markdown chars
    .replace(/\n+/g, ' ')             // newlines to spaces
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();
}

function truncateAtSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastSentenceEnd = Math.max(lastPeriod, lastExclaim, lastQuestion);
  if (lastSentenceEnd > maxLen * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }
  return truncated;
}

// --- TTS provider functions ---

// ── ElevenLabs Voice Roster ─────────────────────────────────────────────────
// Premade voices that work on free-tier API keys (no library subscription needed)
const ELEVENLABS_VOICES = {
  sam:    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    desc: 'Deep, raspy American — raw & authentic' },
  josh:   { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   desc: 'Deep, smooth American — confident narrator' },
  adam:   { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   desc: 'Deep American — warm & authoritative' },
  clyde:  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',  desc: 'Deep, gravelly American — rugged character' },
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Deep British — polished intelligence analyst' },
};
// Default voice — Sam: closest to "Austin — Deep, Raspy and Authentic"
const ELEVENLABS_DEFAULT_VOICE = 'sam';

async function elevenLabsTTS(text, voiceKey, lang = 'en') {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) return null;

  // Resolve voice: explicit key → env override → default
  let voice;
  if (voiceKey && ELEVENLABS_VOICES[voiceKey]) {
    voice = ELEVENLABS_VOICES[voiceKey];
  } else if (process.env.ELEVENLABS_VOICE_ID) {
    voice = { id: process.env.ELEVENLABS_VOICE_ID, name: 'custom', desc: 'env override' };
  } else {
    voice = ELEVENLABS_VOICES[ELEVENLABS_DEFAULT_VOICE];
  }

  // Use multilingual model for non-English languages, turbo for English
  const modelId = lang !== 'en' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,           // Expressive, natural cadence
          similarity_boost: 0.8,    // Strong voice match
          style: 0.45,              // Authentic, conversational feel
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      console.error(`ElevenLabs error ${response.status} (${voice.name}):`, errText);
      return null;
    }

    const chunks = [];
    for await (const chunk of response.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    console.log(`ElevenLabs TTS: ${buffer.length} bytes — voice: ${voice.name} (${voice.desc})`);
    return { buffer, contentType: 'audio/mpeg', source: 'elevenlabs', voice: voice.name };
  } catch (err) {
    console.error('ElevenLabs TTS error:', err.message);
    return null;
  }
}

// Edge TTS voice map by language code — deep, authoritative male voices
const EDGE_TTS_VOICES = {
  en: 'en-US-GuyNeural',
  fr: 'fr-FR-HenriNeural',
  es: 'es-ES-AlvaroNeural',
  zh: 'zh-CN-YunxiNeural',
  hi: 'hi-IN-MadhurNeural',
  ar: 'ar-SA-HamedNeural',
  ru: 'ru-RU-DmitryNeural',
  pt: 'pt-BR-AntonioNeural',
};

async function edgeTTS(text, voice = 'en-US-GuyNeural') {
  // Microsoft Edge TTS — free neural voices, no API key required
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);

  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', (chunk) => chunks.push(chunk));
    audioStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 100) {
        reject(new Error('Edge TTS returned empty audio'));
        return;
      }
      resolve({ buffer, contentType: 'audio/mpeg', source: 'edge-tts' });
    });
    audioStream.on('error', (e) => reject(e));

    // Safety timeout — 15 seconds
    setTimeout(() => reject(new Error('Edge TTS timeout')), 15000);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE AI BRIEF — Full market narrative (6th slide)
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_BRIEF_GENERATE_MS = 5 * 60 * 1000; // 5 min
const briefGenerateCache = new Map();

// ── Spoken number helpers ──────────────────────────────────────────────────
const ONES = ['','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function spokenInteger(n) {
  if (n === 0) return 'zero';
  if (n < 0) return 'negative ' + spokenInteger(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? ' ' + ONES[n%10] : '');
  if (n < 1000) return ONES[Math.floor(n/100)] + ' hundred' + (n%100 ? ' and ' + spokenInteger(n%100) : '');
  if (n < 10000 && n % 1000 >= 100) return spokenInteger(Math.floor(n/1000)) + ' thousand ' + spokenInteger(n%1000);
  if (n < 10000) return spokenInteger(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' ' + spokenInteger(n%1000) : '');
  if (n < 1e6) return spokenInteger(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' ' + spokenInteger(n%1000) : '');
  if (n < 1e9) return spokenInteger(Math.floor(n/1e6)) + ' million' + (n%1e6 ? ' ' + spokenInteger(n%1e6) : '');
  return spokenInteger(Math.floor(n/1e9)) + ' billion';
}

function spokenPrice(n, asset) {
  if (n == null || isNaN(n)) return 'unknown levels';
  n = Number(n);
  if (n >= 1000) return spokenInteger(Math.round(n));
  if (n >= 1) {
    const whole = Math.floor(n);
    const cents = Math.round((n - whole) * 100);
    if (cents === 0) return spokenInteger(whole);
    const c1 = Math.floor(cents / 10), c2 = cents % 10;
    if (c2 === 0) return `${spokenInteger(whole)} point ${ONES[c1]}`;
    return `${spokenInteger(whole)} point ${ONES[c1]} ${ONES[c2]}`;
  }
  if (n >= 0.01) return n.toFixed(2) + ' dollars';
  return 'fractional levels';
}

function spokenChange(n) {
  if (n == null || isNaN(n)) return 'flat';
  n = Number(n);
  const dir = n >= 0 ? 'up' : 'down';
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const dec = Math.round((abs - whole) * 10);
  if (abs < 0.1) return 'roughly flat';
  if (dec === 0) return `${dir} ${spokenInteger(whole)} percent`;
  if (whole === 0) return `${dir} zero point ${ONES[dec] || dec} percent`;
  return `${dir} ${spokenInteger(whole)} point ${ONES[dec] || dec} percent`;
}

function pickPhrase(pool) {
  // Deterministic-ish selection seeded by current hour + minute/10
  const idx = (new Date().getHours() * 3 + Math.floor(new Date().getMinutes() / 10)) % pool.length;
  return pool[idx];
}

// ── Comprehensive brief: template-based (no LLM needed) ───────────────────
function generateLocalBrief(marketMode, md) {
  const isStocks = marketMode === 'stocks';
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek];
  const session = hour >= 5 && hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'late session';

  let a1, a2, a3, a1Name, a2Name, a3Name;
  let sentLabel, sentVal, sentReading;

  if (isStocks) {
    a1 = md.spy || {}; a2 = md.qqq || {}; a3 = md.aapl || {};
    a1Name = 'the S and P 500'; a2Name = 'the Nasdaq 100'; a3Name = 'Apple';
    sentVal = md.vix?.price; sentLabel = 'the VIX';
    if (sentVal >= 30) sentReading = 'extreme volatility';
    else if (sentVal >= 25) sentReading = 'elevated fear';
    else if (sentVal >= 20) sentReading = 'above average caution';
    else if (sentVal >= 15) sentReading = 'moderate conditions';
    else if (sentVal != null) sentReading = 'low volatility and complacency';
    else sentReading = null;
  } else {
    a1 = md.btc || {}; a2 = md.eth || {}; a3 = md.sol || {};
    a1Name = 'Bitcoin'; a2Name = 'Ethereum'; a3Name = 'Solana';
    sentVal = md.fearGreed?.value; sentLabel = 'the Fear and Greed Index';
    if (sentVal <= 20) sentReading = 'extreme fear';
    else if (sentVal <= 35) sentReading = 'fear in the market';
    else if (sentVal >= 80) sentReading = 'extreme greed';
    else if (sentVal >= 65) sentReading = 'growing greed';
    else if (sentVal != null) sentReading = 'neutral territory';
    else sentReading = null;
  }

  const ch1 = Number(a1.change) || 0;
  const ch2 = Number(a2.change) || 0;
  const ch3 = Number(a3.change) || 0;
  const avg = (ch1 + ch2 + ch3) / 3;
  const maxMove = Math.max(Math.abs(ch1), Math.abs(ch2), Math.abs(ch3));
  const allGreen = ch1 > 0 && ch2 > 0 && ch3 > 0;
  const allRed = ch1 < 0 && ch2 < 0 && ch3 < 0;

  // Determine market mood
  let mood;
  if (avg > 3) mood = 'strong_rally';
  else if (avg > 1) mood = 'bullish';
  else if (avg > 0.3) mood = 'mild_green';
  else if (avg < -3) mood = 'sharp_sell';
  else if (avg < -1) mood = 'bearish';
  else if (avg < -0.3) mood = 'mild_red';
  else mood = 'neutral';

  const paragraphs = [];

  // ── Paragraph 1: Opening / Tone-setter ──
  {
    const openings = {
      strong_rally: [
        `This ${dayName} ${session} carries a wave of momentum across the markets.`,
        `A powerful current of buying pressure defines this ${dayName}.`,
        `The ${session} opens with unmistakable strength, and the markets are responding.`,
      ],
      bullish: [
        `A constructive tone sets the pace this ${dayName} ${session}.`,
        `Confidence threads through the tape this ${dayName}, with buyers quietly asserting control.`,
        `The ${session} unfolds with a steady bid beneath the surface.`,
      ],
      mild_green: [
        `Markets drift modestly higher this ${dayName} ${session}, seeking direction.`,
        `A calm ${dayName} ${session} with a gentle green tilt across the board.`,
        `The ${session} begins with quiet optimism, though conviction remains measured.`,
      ],
      sharp_sell: [
        `Selling pressure intensifies this ${dayName} ${session}, testing resolve across the board.`,
        `A difficult ${dayName}. The markets are under siege and discipline is the only shelter.`,
        `This ${session} demands attention. Sellers are in control and the tape is unforgiving.`,
      ],
      bearish: [
        `Caution colors this ${dayName} ${session} as sellers apply steady pressure.`,
        `The ${session} carries a cautious undertone, with markets leaning into the red.`,
        `A measured retreat defines this ${dayName}. The market is speaking, and patience is the answer.`,
      ],
      mild_red: [
        `A slight pullback marks this ${dayName} ${session}, nothing dramatic but worth noting.`,
        `The ${session} opens with a subtle lean to the downside.`,
        `Minor weakness this ${dayName}. The kind of day that separates the disciplined from the reactive.`,
      ],
      neutral: [
        `Markets hold steady this ${dayName} ${session}, caught between buyers and sellers.`,
        `Equilibrium defines this ${dayName}. The market is coiling, waiting for its next catalyst.`,
        `A balanced ${session}. No clear edge, no forced moves. The market rewards those who wait.`,
      ],
    };
    if (isWeekend) {
      paragraphs.push(isStocks
        ? `${dayName}. Traditional markets are closed, giving you space to review your positions and prepare for the week ahead.`
        : pickPhrase([
            `${dayName} ${session} in the crypto markets. Weekend liquidity is thinner, and moves can be deceptive. Read them with care.`,
            `The ${dayName} tape rolls on. Crypto never sleeps, but weekend volume tells a different story than weekday conviction.`,
          ])
      );
    } else {
      paragraphs.push(pickPhrase(openings[mood] || openings.neutral));
    }
  }

  // ── Paragraph 2: Price Action Read ──
  {
    const p1 = a1.price ? spokenPrice(a1.price) : null;
    const p2 = a2.price ? spokenPrice(a2.price) : null;
    const p3 = a3.price ? spokenPrice(a3.price) : null;

    let priceText = '';
    if (p1) {
      priceText += `${a1Name} trades at ${p1}, ${spokenChange(ch1)} on the day. `;
    }

    if (p2 && p3) {
      if (allGreen) {
        priceText += `${a2Name} follows at ${p2}, ${spokenChange(ch2)}, while ${a3Name} adds to the strength at ${p3}, ${spokenChange(ch3)}. `;
      } else if (allRed) {
        priceText += `${a2Name} sits at ${p2}, ${spokenChange(ch2)}, and ${a3Name} shares the weakness at ${p3}, ${spokenChange(ch3)}. `;
      } else {
        // Mixed
        const ch2Dir = ch2 >= 0 ? 'holding' : 'dipping';
        const ch3Dir = ch3 >= 0 ? 'pushing higher' : 'pulling back';
        priceText += `${a2Name} is ${ch2Dir} at ${p2}, ${spokenChange(ch2)}, and ${a3Name} ${ch3Dir} at ${p3}, ${spokenChange(ch3)}. `;
      }
    }

    // Add divergence note if applicable
    if (Math.abs(ch1 - ch3) > 3 || Math.abs(ch1 - ch2) > 3) {
      priceText += 'The divergence between names is notable, suggesting rotation rather than a broad directional move. ';
    }

    paragraphs.push(priceText.trim());
  }

  // ── Paragraph 3: Sentiment Landscape + Alpha ──
  {
    let sentText = '';
    if (sentReading && sentVal != null) {
      if (isStocks) {
        sentText += `${sentLabel} reads at ${sentVal.toFixed(1)}, signaling ${sentReading}. `;
      } else {
        sentText += `${sentLabel} sits at ${sentVal}, reflecting ${sentReading}. `;
      }
    }

    // Alpha insight based on conditions
    if (mood === 'strong_rally' && sentVal != null) {
      if (isStocks ? sentVal <= 13 : sentVal >= 75) {
        sentText += 'But momentum and euphoria are neighbors. When everyone is comfortable, the market loves to remind you that risk is never retired. Trail your stops and let the trend work, but protect what you have built.';
      } else {
        sentText += 'The strength here is broad and constructive. This is the kind of tape where you let your winners breathe and add on confirmed breakouts. Trend is your ally today.';
      }
    } else if (mood === 'sharp_sell' || mood === 'bearish') {
      if (isStocks ? (sentVal != null && sentVal >= 28) : (sentVal != null && sentVal <= 25)) {
        sentText += 'Fear is thick, but history reminds us that the darkest readings often precede the sharpest recoveries. This is not the time to panic. It is the time to prepare your buy list.';
      } else {
        sentText += 'The selling is persistent but orderly. This is distribution, not capitulation. Watch for volume to exhaust before stepping in with size. Patience pays in this environment.';
      }
    } else if (mood === 'neutral' || mood === 'mild_green' || mood === 'mild_red') {
      if (maxMove < 0.8) {
        sentText += 'Volatility compression continues. The market is coiling, and coils release. The direction is uncertain, but the energy is building. Stay light, stay nimble, and let the breakout declare itself.';
      } else {
        sentText += 'No extreme readings, no forced positions. This is a stock picker\'s market, where selective positioning outperforms broad directional bets. Focus on relative strength and quality setups.';
      }
    }

    paragraphs.push(sentText.trim());
  }

  // ── Paragraph 4: Closing / How to Approach the Day ──
  {
    const closings = {
      strong_rally: [
        `The takeaway this ${session}: ride the momentum, but never forget that the market gives and takes in cycles. Protect capital, stay disciplined, and let this strength work for you. This is Spectre AI, and the market favors the prepared.`,
        `Today's message is clear: the trend is alive. Honor it, but respect it. Size with conviction, manage with discipline. This is Spectre AI. Stay sharp.`,
      ],
      bullish: [
        `Approach this ${session} with measured confidence. The tape supports the upside, but always respect the levels. Position with intention, not emotion. This is Spectre AI, and patience is power.`,
        `The setup is constructive. Let the market come to you. Scale in where conviction meets confirmation, and always know your exit before you enter. This is your Spectre AI intelligence brief.`,
      ],
      bearish: [
        `In moments like these, cash is a position and patience is an edge. Don't catch falling knives, wait for the market to show you a base. This is Spectre AI. Discipline over impulse.`,
        `The path of least resistance points lower for now. Reduce exposure, tighten stops, and let the dust settle. Opportunity will come, but timing matters. This is Spectre AI.`,
      ],
      sharp_sell: [
        `When the market bleeds, the disciplined survive and the prepared thrive. This is not the day for heroes. It's the day for watchlists and patience. Spectre AI reminds you: your best trade might be no trade at all.`,
        `Capitulation tests conviction. If your thesis is intact, weather the storm. If not, step aside. There is no shame in waiting. This is Spectre AI, and survival comes before glory.`,
      ],
      neutral: [
        `No edge, no force. Let the market reveal its hand before committing capital. The best opportunities come to those who wait. This is Spectre AI, and stillness is a strategy.`,
        `Use this time wisely. Review your positions, sharpen your plan, and be ready when the market moves. Quiet days are for preparation. This is Spectre AI.`,
      ],
    };

    const pool = closings[mood] || closings[mood.includes('red') ? 'bearish' : mood.includes('green') ? 'bullish' : 'neutral'] || closings.neutral;
    paragraphs.push(pickPhrase(pool));
  }

  return paragraphs.join(' ');
}

// ── LLM-based brief generation (secondary path) ────────────────────────────
const BRIEF_GENERATE_SYSTEM_PROMPT = `You are Spectre AI, a poetic yet authoritative market intelligence narrator.
Write a 150-200 word flowing spoken narrative synthesizing the provided market conditions.

CRITICAL RULES:
- NEVER use ticker symbols. Use full names: Bitcoin (not BTC), Ethereum (not ETH), Solana (not SOL), Apple (not AAPL), the S and P 500 (not SPY), the Nasdaq 100 (not QQQ), Nvidia (not NVDA), Tesla (not TSLA), the VIX (not VIX).
- NEVER use bullet points, headers, markdown, or formatting.
- Write as if speaking on a premium morning market podcast. Authoritative, poetic, free-flowing.
- All numbers should sound natural when spoken aloud. Say "ninety-five thousand" not "$95,000".
- Include alpha insights: what divergences or patterns suggest, how to approach the day.
- End with a poetic sign-off mentioning "Spectre AI".
- The text will be read aloud by a TTS engine — write for the ear, not the eye.`;

const LANG_NAMES = { en: 'English', fr: 'French', es: 'Spanish', zh: 'Chinese (Simplified)', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', pt: 'Portuguese (Brazilian)' };

async function generateBriefLLM(marketMode, md, lang = 'en') {
  const effectiveAnthropicKey = ANTHROPIC_API_KEY || (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-ant-') ? OPENAI_API_KEY : null);
  const effectiveOpenAIKey = OPENAI_API_KEY && !OPENAI_API_KEY.startsWith('sk-ant-') ? OPENAI_API_KEY : null;

  const userContent = JSON.stringify({
    mode: marketMode,
    timeContext: `${new Date().toLocaleDateString('en-US', { weekday: 'long' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    ...md,
  });

  // Add language instruction to system prompt for non-English
  const langName = LANG_NAMES[lang] || 'English';
  const systemPrompt = lang === 'en'
    ? BRIEF_GENERATE_SYSTEM_PROMPT
    : BRIEF_GENERATE_SYSTEM_PROMPT + `\n\nCRITICAL: Write the ENTIRE brief in ${langName}. Every word must be in ${langName}. Do NOT use English. Asset names like Bitcoin, Ethereum, S&P 500 can remain in their original form.`;

  // Try Anthropic
  if (effectiveAnthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveAnthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Generate the comprehensive market brief in ${langName} based on this data:\n${userContent}` }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text && text.length > 100) {
          console.log('Brief generation: LLM (Anthropic) produced', text.length, 'chars');
          return text;
        }
      }
    } catch (e) {
      console.error('Brief LLM (Anthropic) error:', e.message);
    }
  }

  // Try OpenAI
  if (effectiveOpenAIKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveOpenAIKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate the comprehensive market brief in ${langName} based on this data:\n${userContent}` },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.length > 100) {
          console.log('Brief generation: LLM (OpenAI) produced', text.length, 'chars');
          return text;
        }
      }
    } catch (e) {
      console.error('Brief LLM (OpenAI) error:', e.message);
    }
  }

  return null; // fall through to local template
}

// ── Route: POST /api/brief/generate ─────────────────────────────────────────
app.post('/api/brief/generate', async (req, res) => {
  const { marketMode, marketData, language } = req.body;
  const lang = language || 'en';
  if (!marketMode || !marketData) {
    return res.status(400).json({ error: 'Missing marketMode or marketData' });
  }

  // Build stable cache key (round prices coarsely so minor ticks don't bust cache)
  const round = (n, step) => n != null ? Math.round(Number(n) / step) * step : 0;
  const keyParts = [
    marketMode,
    lang,
    new Date().getHours(), // changes hourly for session context
    round(marketData.btc?.price, 500),
    round(marketData.eth?.price, 50),
    round(marketData.sol?.price, 5),
    round(marketData.spy?.price, 5),
    round(marketData.qqq?.price, 5),
    round(marketData.fearGreed?.value, 5),
    round(marketData.vix?.price, 2),
    round((Number(marketData.btc?.change)||0) + (Number(marketData.spy?.change)||0), 0.5),
  ].join('|');
  const cacheKey = 'brief_' + keyParts;

  // Check cache
  const cached = getCached(briefGenerateCache, cacheKey, CACHE_TTL_BRIEF_GENERATE_MS);
  if (cached) {
    return res.json({ brief: cached.brief, source: cached.source, cached: true, generatedAt: cached.generatedAt });
  }

  try {
    // Try LLM first, fall back to local template
    let briefText = await generateBriefLLM(marketMode, marketData, lang).catch(() => null);
    let source = 'llm';

    if (!briefText) {
      // Local template is English-only; skip for non-English to avoid mixed-language UI
      if (lang !== 'en') {
        return res.json({ brief: null, source: 'skipped', reason: 'no-llm-for-language' });
      }
      briefText = generateLocalBrief(marketMode, marketData);
      source = 'template';
    }

    // Safety: run through ttsNormalize (English only — would corrupt translated text)
    if (lang === 'en') {
      briefText = ttsNormalize(briefText);
    }

    const result = { brief: briefText, source, generatedAt: Date.now() };
    setCached(briefGenerateCache, cacheKey, result, CACHE_TTL_BRIEF_GENERATE_MS);

    console.log(`Brief generate: ${source} | ${marketMode} | ${briefText.length} chars`);
    res.json({ ...result, cached: false });
  } catch (err) {
    console.error('Brief generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate brief' });
  }
});

// GET available voices for client-side voice picker
app.get('/api/brief/voices', (req, res) => {
  const voices = Object.entries(ELEVENLABS_VOICES).map(([key, v]) => ({
    key,
    name: v.name,
    description: v.desc,
    isDefault: key === ELEVENLABS_DEFAULT_VOICE,
  }));
  res.json({ voices, default: ELEVENLABS_DEFAULT_VOICE });
});

app.post('/api/brief/audio', async (req, res) => {
  const { text, voice: voiceKey, fullBrief, language } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return res.status(400).json({ error: 'Brief text too short or missing' });
  }

  const lang = language || 'en';

  // Clean and truncate — full briefs get a higher char limit
  const maxChars = fullBrief ? BRIEF_FULL_AUDIO_MAX_CHARS : BRIEF_AUDIO_MAX_CHARS;
  let cleanText = stripMarkdownHtml(text);
  cleanText = truncateAtSentence(cleanText, maxChars);

  // Cache key includes voice + language so different voices/languages get separate caches
  const voiceSuffix = voiceKey || ELEVENLABS_DEFAULT_VOICE;
  const hash = crypto.createHash('md5').update(cleanText + ':' + voiceSuffix + ':' + lang).digest('hex');
  const cached = briefAudioCache.get(hash);
  if (cached && Date.now() < cached.expires) {
    res.set('Content-Type', cached.contentType);
    res.set('X-Audio-Cached', 'true');
    res.set('X-Audio-Source', cached.source || 'cached');
    res.set('X-Audio-Voice', cached.voice || voiceSuffix);
    return res.send(cached.buffer);
  }

  // Rate limiting by IP (only for uncached/new TTS generation)
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const lastRequest = briefAudioRateLimit.get(clientIp);
  if (lastRequest && Date.now() - lastRequest < BRIEF_AUDIO_RATE_LIMIT_MS) {
    return res.status(429).json({ error: 'Rate limited. Try again in a few seconds.' });
  }
  briefAudioRateLimit.set(clientIp, Date.now());

  try {
    // Fallback chain: ElevenLabs → Edge TTS (language-matched voice)
    let result = await elevenLabsTTS(cleanText, voiceKey, lang).catch((e) => {
      console.error('ElevenLabs failed:', e.message);
      return null;
    });

    if (!result) {
      const edgeVoice = EDGE_TTS_VOICES[lang] || EDGE_TTS_VOICES.en;
      console.log(`Brief audio: falling back to Edge TTS (${edgeVoice})`);
      result = await edgeTTS(cleanText, edgeVoice).catch((e) => {
        console.error('Edge TTS failed:', e.message);
        return null;
      });
    }

    if (!result) {
      // Both failed — tell client to use Web Speech API
      return res.status(503).json({ error: 'All TTS providers unavailable', fallback: 'webspeech' });
    }

    // Cache it
    briefAudioCache.set(hash, {
      buffer: result.buffer,
      contentType: result.contentType,
      source: result.source,
      voice: result.voice || voiceSuffix,
      expires: Date.now() + BRIEF_AUDIO_CACHE_TTL,
    });

    // Clean old cache entries (keep max 50)
    if (briefAudioCache.size > 50) {
      const keys = [...briefAudioCache.keys()];
      for (let i = 0; i < keys.length - 50; i++) {
        briefAudioCache.delete(keys[i]);
      }
    }

    res.set('Content-Type', result.contentType);
    res.set('X-Audio-Source', result.source);
    res.set('X-Audio-Voice', result.voice || voiceSuffix);
    res.send(result.buffer);
  } catch (err) {
    console.error('Brief audio generation error:', err.message);
    res.status(500).json({ error: 'Audio generation failed' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN UNLOCKS API — Upcoming token unlocks calendar data
// ═══════════════════════════════════════════════════════════════════════════════

const TOKENUNLOCKS_API_KEY = process.env.TOKENUNLOCKS_API_KEY || '';
const TOKENUNLOCKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Mock data structure for token unlocks (ready for API key injection)
const MOCK_UNLOCKS_DATA = [
  { token: 'OP', unlockDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), amount: 12500000, valueUsd: 28400000, percentOfSupply: 1.2, type: 'cliff' },
  { token: 'ARB', unlockDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), amount: 92000000, valueUsd: 98500000, percentOfSupply: 2.8, type: 'linear' },
  { token: 'APE', unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), amount: 15600000, valueUsd: 12400000, percentOfSupply: 1.5, type: 'cliff' },
  { token: 'DYDX', unlockDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), amount: 45000000, valueUsd: 87500000, percentOfSupply: 4.5, type: 'linear' },
  { token: 'IMX', unlockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), amount: 28000000, valueUsd: 45200000, percentOfSupply: 1.9, type: 'cliff' },
  { token: 'STRK', unlockDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), amount: 75000000, valueUsd: 67200000, percentOfSupply: 3.7, type: 'linear' },
  { token: 'SUI', unlockDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), amount: 82000000, valueUsd: 98400000, percentOfSupply: 2.1, type: 'cliff' },
  { token: 'APT', unlockDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), amount: 38000000, valueUsd: 296000000, percentOfSupply: 5.2, type: 'linear' },
  { token: 'SEI', unlockDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), amount: 125000000, valueUsd: 75000000, percentOfSupply: 6.8, type: 'cliff' },
  { token: 'TIA', unlockDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(), amount: 45000000, valueUsd: 189000000, percentOfSupply: 2.3, type: 'linear' },
];

/**
 * GET /api/unlocks/upcoming — Fetch upcoming token unlocks
 * Query params: days=30 (default), limit=50 (default)
 * Returns: { unlocks: [{ token, unlockDate, amount, valueUsd, percentOfSupply, type }] }
 */
app.get('/api/unlocks/upcoming', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 90);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    
    // Check cache
    const cacheKey = `unlocks_${days}_${limit}`;
    const cached = getCached(cache, cacheKey, TOKENUNLOCKS_CACHE_TTL);
    if (cached) {
      return res.json({ unlocks: cached, source: 'cache' });
    }

    let unlocks = [];
    let source = 'mock';

    // Try to fetch from TokenUnlocks API if key is available
    if (TOKENUNLOCKS_API_KEY) {
      try {
        const response = await fetch(`https://api.tokenunlocks.com/v1/unlocks/upcoming?days=${days}&limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${TOKENUNLOCKS_API_KEY}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.unlocks)) {
            unlocks = data.unlocks.map(u => ({
              token: u.token_symbol || u.token || 'UNKNOWN',
              unlockDate: u.unlock_date || u.date,
              amount: parseFloat(u.amount) || 0,
              valueUsd: parseFloat(u.value_usd) || 0,
              percentOfSupply: parseFloat(u.percent_supply) || 0,
              type: u.type === 'linear' ? 'linear' : 'cliff',
            }));
            source = 'tokenunlocks';
          }
        }
      } catch (e) {
        console.warn('TokenUnlocks API fetch failed:', e.message);
      }
    }

    // Fallback to CoinGecko if TokenUnlocks failed and key available
    if (unlocks.length === 0 && COINGECKO_API_KEY) {
      try {
        // CoinGecko doesn't have a direct token unlocks endpoint, but we can try their events endpoint
        const url = `${COINGECKO_BASE}/events?upcoming_events_only=true&limit=${limit}`;
        const opts = { headers: { Accept: 'application/json' } };
        opts.headers[COINGECKO_HEADER_KEY] = COINGECKO_API_KEY;
        const response = await fetch(url, opts);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.data)) {
            unlocks = data.data
              .filter(e => e.type === 'token_unlock' || e.type === 'unlock')
              .map(e => ({
                token: e.coin_id || 'UNKNOWN',
                unlockDate: e.date,
                amount: parseFloat(e.amount) || 0,
                valueUsd: parseFloat(e.value_usd) || 0,
                percentOfSupply: parseFloat(e.percent_supply) || 0,
                type: e.unlock_type === 'linear' ? 'linear' : 'cliff',
              }));
            if (unlocks.length > 0) source = 'coingecko';
          }
        }
      } catch (e) {
        console.warn('CoinGecko unlocks fetch failed:', e.message);
      }
    }

    // Final fallback: use mock data
    if (unlocks.length === 0) {
      // Filter mock data by days
      const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      unlocks = MOCK_UNLOCKS_DATA
        .filter(u => new Date(u.unlockDate) <= cutoffDate)
        .slice(0, limit)
        .map(u => ({ ...u })); // Clone to avoid mutations
    }

    // Sort by unlock date
    unlocks.sort((a, b) => new Date(a.unlockDate) - new Date(b.unlockDate));

    // Cache the results
    setCached(cache, cacheKey, unlocks, TOKENUNLOCKS_CACHE_TTL);

    res.json({ unlocks, source, count: unlocks.length });
  } catch (err) {
    console.error('Token unlocks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch token unlocks', unlocks: MOCK_UNLOCKS_DATA.slice(0, 10) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB DEV ACTIVITY API — Repository commit activity
// ═══════════════════════════════════════════════════════════════════════════════

const GITHUB_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/github/activity?repo=owner/name — Fetch GitHub commit activity
 * Returns: { 
 *   repo: string,
 *   weeklyCommits: [{ week: timestamp, commits: number, add: number, del: number }],
 *   contributors: { total: number, active: number, new: number },
 *   trend: 'up' | 'down' | 'stable'
 * }
 */
app.get('/api/github/activity', async (req, res) => {
  try {
    const repo = (req.query.repo || '').trim();
    if (!repo || !repo.includes('/')) {
      return res.status(400).json({ error: 'repo parameter required (format: owner/name)' });
    }

    // Validate repo format
    const [owner, name] = repo.split('/');
    if (!owner || !name) {
      return res.status(400).json({ error: 'Invalid repo format. Use: owner/name' });
    }

    // Check cache
    const cacheKey = `github_${repo}`;
    const cached = getCached(cache, cacheKey, GITHUB_CACHE_TTL);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    // Fetch from GitHub API (public repos, no auth needed but rate limited)
    const commitActivityUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/stats/commit_activity`;
    const contributorsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/stats/contributors`;
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

    try {
      // Fetch commit activity (last 52 weeks)
      const [commitRes, contributorsRes, repoRes] = await Promise.all([
        fetch(commitActivityUrl, { 
          headers: { Accept: 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(15000),
        }),
        fetch(contributorsUrl, { 
          headers: { Accept: 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(15000),
        }),
        fetch(repoUrl, { 
          headers: { Accept: 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(10000),
        }),
      ]);

      let weeklyCommits = [];
      let contributorsData = { total: 0, active: 0, new: 0 };
      let repoInfo = {};

      // Parse commit activity
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        if (Array.isArray(commitData)) {
          // Get last 12 weeks only
          weeklyCommits = commitData.slice(-12).map(week => ({
            week: week.week * 1000, // Convert to milliseconds
            commits: week.total || 0,
            days: week.days || [],
          }));
        }
      }

      // Parse contributors
      if (contributorsRes.ok) {
        const contribData = await contributorsRes.json();
        if (Array.isArray(contribData)) {
          contributorsData.total = contribData.length;
          contributorsData.active = contribData.filter(c => {
            const recentWeeks = c.weeks?.slice(-4) || [];
            const recentCommits = recentWeeks.reduce((sum, w) => sum + (w.c || 0), 0);
            return recentCommits > 0;
          }).length;
          contributorsData.new = contribData.filter(c => {
            const weeks = c.weeks || [];
            const firstCommit = weeks.find(w => (w.c || 0) > 0);
            if (!firstCommit) return false;
            const firstCommitDate = firstCommit.w * 1000;
            const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
            return firstCommitDate > fourWeeksAgo;
          }).length;
        }
      }

      // Parse repo info
      if (repoRes.ok) {
        repoInfo = await repoRes.json();
      }

      // Calculate trend
      const recentCommits = weeklyCommits.slice(-4).reduce((sum, w) => sum + w.commits, 0);
      const previousCommits = weeklyCommits.slice(-8, -4).reduce((sum, w) => sum + w.commits, 0);
      let trend = 'stable';
      if (recentCommits > previousCommits * 1.1) trend = 'up';
      else if (recentCommits < previousCommits * 0.9) trend = 'down';

      const result = {
        repo,
        name: repoInfo.name || name,
        description: repoInfo.description || '',
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
        language: repoInfo.language || 'Unknown',
        weeklyCommits,
        contributors: contributorsData,
        trend,
        updatedAt: new Date().toISOString(),
      };

      // Cache results
      setCached(cache, cacheKey, result, GITHUB_CACHE_TTL);

      res.json({ ...result, source: 'github' });
    } catch (e) {
      console.error('GitHub API error:', e.message);
      
      // Return mock data on failure
      const mockResult = {
        repo,
        name,
        description: 'Mock data - GitHub API rate limited or unavailable',
        stars: 0,
        forks: 0,
        language: 'Unknown',
        weeklyCommits: Array.from({ length: 12 }, (_, i) => ({
          week: Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000,
          commits: Math.floor(Math.random() * 50) + 10,
          days: [],
        })),
        contributors: { total: 15, active: 8, new: 2 },
        trend: 'stable',
        updatedAt: new Date().toISOString(),
        source: 'mock',
      };
      res.json(mockResult);
    }
  } catch (err) {
    console.error('GitHub activity error:', err.message);
    res.status(500).json({ error: 'Failed to fetch GitHub activity' });
  }
});

/**
 * GET /api/github/activity/batch — Fetch activity for multiple repos
 * Query: repos=owner/name,owner/name2
 */
app.get('/api/github/activity/batch', async (req, res) => {
  try {
    const reposParam = (req.query.repos || '').trim();
    if (!reposParam) {
      return res.status(400).json({ error: 'repos parameter required (comma-separated owner/name pairs)' });
    }

    const repos = reposParam.split(',').map(r => r.trim()).filter(Boolean);
    if (repos.length === 0) {
      return res.status(400).json({ error: 'No valid repos provided' });
    }

    const results = await Promise.all(
      repos.map(async (repo) => {
        try {
          // Reuse single endpoint logic
          const [owner, name] = repo.split('/');
          if (!owner || !name) return { repo, error: 'Invalid format' };

          // Check cache
          const cacheKey = `github_${repo}`;
          const cached = getCached(cache, cacheKey, GITHUB_CACHE_TTL);
          if (cached) return { ...cached, source: 'cache' };

          const commitActivityUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/stats/commit_activity`;
          const commitRes = await fetch(commitActivityUrl, { 
            headers: { Accept: 'application/vnd.github.v3+json' },
            signal: AbortSignal.timeout(15000),
          });

          let weeklyCommits = [];
          if (commitRes.ok) {
            const commitData = await commitRes.json();
            if (Array.isArray(commitData)) {
              weeklyCommits = commitData.slice(-12).map(week => ({
                week: week.week * 1000,
                commits: week.total || 0,
              }));
            }
          }

          const totalCommits = weeklyCommits.reduce((sum, w) => sum + w.commits, 0);
          const recentCommits = weeklyCommits.slice(-4).reduce((sum, w) => sum + w.commits, 0);
          const previousCommits = weeklyCommits.slice(-8, -4).reduce((sum, w) => sum + w.commits, 0);
          let trend = 'stable';
          if (recentCommits > previousCommits * 1.1) trend = 'up';
          else if (recentCommits < previousCommits * 0.9) trend = 'down';

          const result = {
            repo,
            weeklyCommits: weeklyCommits.slice(-4), // Only last 4 weeks for batch
            totalCommits,
            trend,
            updatedAt: new Date().toISOString(),
          };

          setCached(cache, cacheKey, result, GITHUB_CACHE_TTL);
          return { ...result, source: 'github' };
        } catch (e) {
          return { repo, error: e.message, trend: 'unknown' };
        }
      })
    );

    res.json({ results, count: results.length });
  } catch (err) {
    console.error('GitHub batch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch batch GitHub activity' });
  }
});

/**
 * GET /api/funding-rates
 * Fetch funding rates from Binance Futures API
 * Returns: symbol, lastFundingRate (as %), markPrice, indexPrice
 * With calculated projections: 8-hour, 24-hour, annualized
 * Sorted by absolute funding rate (most extreme first)
 */
const CACHE_TTL_FUNDING_RATES_MS = 60 * 1000; // 60 seconds

app.get('/api/funding-rates', async (req, res) => {
  try {
    // Check cache
    const cacheKey = 'funding_rates';
    const cached = getCached(cache.fundingRates, cacheKey, CACHE_TTL_FUNDING_RATES_MS);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(cached);
    }

    // Fetch from Binance Futures API (no API key required)
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Binance API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from Binance');
    }

    // Parse and calculate projections
    const fundingRates = data
      .filter(item => item.symbol && item.symbol.endsWith('USDT')) // Filter USDT pairs
      .map(item => {
        const lastFundingRate = parseFloat(item.lastFundingRate) * 100; // Convert to percentage
        const markPrice = parseFloat(item.markPrice) || 0;
        const indexPrice = parseFloat(item.indexPrice) || 0;

        // Binance funding happens every 8 hours (3 times per day)
        // Calculate projections
        const projection8h = lastFundingRate; // Next 8h period
        const projection24h = lastFundingRate * 3; // 3 periods per day
        const annualizedRate = lastFundingRate * 3 * 365; // 3 periods per day * 365 days

        return {
          symbol: item.symbol,
          lastFundingRate,
          markPrice,
          indexPrice,
          projection8h,
          projection24h,
          annualizedRate,
          nextFundingTime: item.nextFundingTime,
          interestRate: parseFloat(item.interestRate) * 100 || 0,
        };
      })
      .filter(item => !isNaN(item.lastFundingRate))
      // Sort by absolute rate descending (most extreme first)
      .sort((a, b) => Math.abs(b.lastFundingRate) - Math.abs(a.lastFundingRate));

    // Cache the results
    setCached(cache.fundingRates, cacheKey, fundingRates, CACHE_TTL_FUNDING_RATES_MS);

    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(fundingRates);
  } catch (err) {
    console.error('Funding rates fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch funding rates', message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEAR & GREED INDEX — Proxy to alternative.me API
// ═══════════════════════════════════════════════════════════════════════════════

const FEAR_GREED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const fearGreedCache = new Map();

app.get('/api/fear-greed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const cacheKey = `fng_${limit}`;
    
    // Check cache
    const cached = getCached(fearGreedCache, cacheKey, FEAR_GREED_CACHE_TTL);
    if (cached) {
      return res.json(cached);
    }
    
    const response = await fetch(`https://api.alternative.me/fng/?limit=${limit}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`alternative.me API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from Fear & Greed API');
    }
    
    // Format and cache the response
    const result = {
      data: data.data.map(item => ({
        value: parseInt(item.value, 10),
        value_classification: item.value_classification,
        timestamp: parseInt(item.timestamp, 10),
        time_until_update: item.time_until_update,
      })),
      lastUpdated: new Date().toISOString(),
    };
    
    setCached(fearGreedCache, cacheKey, result, FEAR_GREED_CACHE_TTL);
    
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json(result);
  } catch (err) {
    console.error('Fear & Greed API error:', err.message);
    res.status(502).json({ 
      error: 'Failed to fetch Fear & Greed Index',
      message: err.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET REGIME DETECTION — Calculate from in-memory token prices
// ═══════════════════════════════════════════════════════════════════════════════

const REGIME_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const marketRegimeCache = new Map();

/**
 * Calculate market regime from token price data
 * Regimes: 'trending', 'ranging', 'volatile', 'accumulation'
 */
function calculateMarketRegime(priceData) {
  if (!priceData || Object.keys(priceData).length === 0) {
    return {
      regime: 'unknown',
      confidence: 0,
      volatility: 0,
      trendStrength: 0,
      direction: 'neutral',
    };
  }

  const changes = Object.values(priceData)
    .map(p => p.change || p.change24 || 0)
    .filter(c => typeof c === 'number');
  
  if (changes.length === 0) {
    return {
      regime: 'unknown',
      confidence: 0,
      volatility: 0,
      trendStrength: 0,
      direction: 'neutral',
    };
  }

  // Calculate mean change
  const meanChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  
  // Calculate volatility (standard deviation)
  const squaredDiffs = changes.map(c => Math.pow(c - meanChange, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / changes.length;
  const volatility = Math.sqrt(variance);
  
  // Calculate trend strength (absolute average change)
  const trendStrength = Math.abs(meanChange);
  
  // Direction of trend
  const direction = meanChange >= 0 ? 'up' : 'down';
  
  // Determine regime based on thresholds
  let regime;
  let confidence;
  
  // High volatility (> 8%) = Volatile market
  if (volatility > 8) {
    regime = 'volatile';
    confidence = Math.min(100, (volatility / 15) * 100);
  }
  // Very low volatility (< 2%) and low trend strength = Accumulation
  else if (volatility < 2 && trendStrength < 1) {
    regime = 'accumulation';
    confidence = Math.min(100, (2 - volatility) * 30 + (1 - trendStrength) * 20);
  }
  // Moderate trend strength with moderate volatility = Trending
  else if (trendStrength > 2 && volatility < 6) {
    regime = 'trending';
    confidence = Math.min(100, trendStrength * 15 + (6 - volatility) * 5);
  }
  // Everything else = Ranging
  else {
    regime = 'ranging';
    confidence = Math.min(100, 50 + volatility * 2);
  }
  
  return {
    regime,
    direction,
    confidence: Math.round(confidence),
    volatility: Math.round(volatility * 100) / 100,
    trendStrength: Math.round(trendStrength * 100) / 100,
    meanChange: Math.round(meanChange * 100) / 100,
    sampleSize: changes.length,
  };
}

app.get('/api/market-regime', async (req, res) => {
  try {
    const cacheKey = 'current_regime';
    
    // Check cache
    const cached = getCached(marketRegimeCache, cacheKey, REGIME_CACHE_TTL);
    if (cached) {
      return res.json(cached);
    }
    
    // Use existing price cache or fetch fresh data
    // We'll use the prices cache from our existing endpoints
    let priceData = {};
    
    // Try to get data from cache first
    const priceCacheKeys = Array.from(cache.prices.keys());
    if (priceCacheKeys.length > 0) {
      // Use the most recent price cache entry
      const latestKey = priceCacheKeys[priceCacheKeys.length - 1];
      const cachedPrices = cache.prices.get(latestKey);
      if (cachedPrices && Date.now() < cachedPrices.expires) {
        priceData = cachedPrices.data || {};
      }
    }
    
    // If no cached data, fetch major token prices
    if (Object.keys(priceData).length === 0) {
      const majorSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT'];
      const prices = await Promise.all(
        majorSymbols.map(async (symbol) => {
          const price = await getPriceForSymbol(symbol);
          return price ? { [symbol]: price } : null;
        })
      );
      priceData = Object.assign({}, ...prices.filter(Boolean));
    }
    
    const regime = calculateMarketRegime(priceData);
    
    const result = {
      ...regime,
      timestamp: new Date().toISOString(),
      pricesSample: Object.keys(priceData).slice(0, 5),
    };
    
    setCached(marketRegimeCache, cacheKey, result, REGIME_CACHE_TTL);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (err) {
    console.error('Market regime error:', err.message);
    res.status(500).json({ 
      error: 'Failed to calculate market regime',
      message: err.message,
    });
  }
});

// Start server (use httpServer for both HTTP + WebSocket)
httpServer.listen(PORT, () => {
  const hasCodex = !!CODEX_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasTavily = !!process.env.TAVILY_API_KEY;
  const hasSerp = !!(process.env.SERPAPI_KEY || process.env.SERP_API_KEY);
  const hasTwitter = !!(process.env.TWITTER_BEARER_TOKEN || process.env.X_BEARER_TOKEN);
  const hasPostingKey = !!(process.env.SPECTRE_POSTING_API_KEY || process.env.SPECTRE_API_KEY);
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  console.log(`
Spectre AI Backend – http://localhost:${PORT}
  Codex: ${hasCodex ? 'OK (search/prices/trending)' : 'MISSING – set CODEX_API_KEY in .env'}
  OpenAI: ${hasOpenAI ? 'OK' : 'optional – OPENAI_API_KEY'}
  Anthropic (Monarch): ${hasAnthropic ? 'OK (Claude + tools)' : 'optional – ANTHROPIC_API_KEY'}
  Tavily (web_search): ${hasTavily ? 'OK' : 'optional – TAVILY_API_KEY'}
  SerpAPI (web_search): ${hasSerp ? 'OK' : 'optional – SERPAPI_KEY'}
  X/Twitter: ${hasTwitter ? 'OK (latest tweet)' : 'optional – TWITTER_BEARER_TOKEN'}
  ElevenLabs (voice): ${hasElevenLabs ? 'OK (brief audio)' : 'optional – ELEVENLABS_API_KEY'}
  Posting API: GET /api/v1/health, POST /api/v1/posts, POST /api/v1/posts/dry-run (${hasPostingKey ? 'auth set' : 'optional – SPECTRE_POSTING_API_KEY'})
  News: proxy /api/news (optional CRYPTOCOMPARE_API_KEY)
  Env check: GET /api/env-check (values never exposed)
  See docs/SETUP_APIS.md for setup.
`);
});

module.exports = app;
