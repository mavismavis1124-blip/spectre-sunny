# Spectre AI Trading Platform - API Architecture & Integration Patterns

## Executive Summary

The Spectre AI Trading Platform uses a **dual-tier API architecture** with a **backend Express proxy server** and **frontend API service layer**. This design solves CORS restrictions, enables API key security, implements intelligent caching, and provides fallback strategies for high availability.

---

## 1. API Service Layer Patterns

### 1.1 Service Structure Overview

Located in `~/clawd/spectre-sunny/src/services/`, the frontend API services follow consistent architectural patterns:

| Service | Primary API | Fallback Strategy | Purpose |
|---------|------------|-------------------|---------|
| `codexApi.js` | Codex GraphQL (via proxy) | CoinGecko, Binance | Token details, prices, search |
| `coinGeckoApi.js` | CoinGecko (via proxy) | Static fallback data | Major tokens, categories, market data |
| `binanceApi.js` | Binance 24hr ticker | CoinGecko direct | Real-time prices, top coins |
| `stockApi.js` | Server proxy → Yahoo Finance | Static `FALLBACK_STOCK_DATA` | Stock quotes, candles, search |
| `stockNewsApi.js` | Server proxy → Finnhub | Finnhub direct, mock data | Market news, company news |
| `cryptoNewsApi.js` | CryptoPanic (via proxy) | CryptoCompare direct | Crypto news aggregation |
| `polymarketApi.js` | Polymarket Gamma API | Cache only | Prediction markets |
| `projectLinksApi.js` | Codex + CoinGecko | N/A | Social links, AI answers |

### 1.2 Service Pattern Template

All services implement a consistent **three-tier fallback pattern**:

```javascript
// Pattern: Primary → Secondary Proxy → Static Fallback
async function fetchData() {
  // 1. Try primary API (usually through server proxy)
  try {
    const data = await serverFetch('/api/endpoint');
    if (data) return data;
  } catch (e) {
    console.warn('Primary failed:', e.message);
  }
  
  // 2. Try direct CORS proxy (allorigins, corsproxy.io)
  try {
    const data = await fetchViaCorsProxy(directUrl);
    if (data) return data;
  } catch (e) {
    console.warn('CORS proxy failed:', e.message);
  }
  
  // 3. Return static fallback data
  return getFallbackData();
}
```

### 1.3 Key Service Features

#### **Data Transformation Patterns**

- **Normalization**: All services normalize API responses to a consistent internal schema
- **Symbol Mapping**: Hardcoded mappings for common symbols (e.g., `PEPE` → `1000PEPEUSDT` for Binance)
- **Type Conversion**: Explicit `parseFloat()`, `Number()` conversions with defaults
- **Null Safety**: All fields have fallback values (e.g., `price || 0`, `volume || 0`)

Example from `codexApi.js`:
```javascript
const changePercent = Math.abs(changeNum) <= 1 && changeNum !== 0 
  ? changeNum * 100 
  : changeNum;
```

#### **Multi-API Aggregation Pattern**

The `binanceApi.js` service demonstrates parallel fetching with merge:

```javascript
export async function getTopCoinPrices(symbols) {
  const [fromCoinGecko, fromBinance] = await Promise.all([
    getCoinGeckoPrices(symbols).catch(() => ({})),
    getBinancePrices(symbols).catch(() => ({})),
  ]);
  // Merge: CoinGecko has richer data, Binance fills gaps
  return { ...fromBinance, ...fromCoinGecko, ...mergeMissing(fromCoinGecko, fromBinance) };
}
```

---

## 2. Backend Express Server Structure

### 2.1 Server Architecture (`~/clawd/spectre-sunny/server/`)

```
server/
├── index.js          # Main Express app (~5000+ lines)
├── routes/
│   └── posting.js    # Spectre Posting API v1
├── db/
│   └── (posts-store) # In-memory post storage
├── data/
│   └── (static data files)
└── package.json
```

### 2.2 Core Configuration

```javascript
// API endpoints (from environment)
const CODEX_API_KEY = process.env.CODEX_API_KEY;
const CODEX_BASE_URL = 'https://graph.codex.io/graphql';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const COINGECKO_BASE = COINGECKO_API_KEY 
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';

// Intelligent endpoint selection
const COINGECKO_HEADER_KEY = 'x-cg-pro-api-key';
```

### 2.3 Endpoint Categories

#### **Token/Crypto Endpoints (~25 endpoints)**

| Endpoint | Method | Purpose | Cache TTL |
|----------|--------|---------|-----------|
| `/api/tokens/search` | GET | Search tokens by name/address | 30s |
| `/api/tokens/prices` | GET | Batch price fetch | 30s |
| `/api/tokens/price/:symbol` | GET | Single token price | 30s |
| `/api/tokens/trending` | GET | Top volume tokens | 2min |
| `/api/token/details` | GET | Detailed token info | 15s |
| `/api/token/trades` | GET | Recent trades | 15s |
| `/api/bars` | GET | OHLCV chart data | 5min |
| `/api/coingecko/*` | GET | CoinGecko proxy | varies |
| `/api/binance-ticker` | GET | Binance price feed | 30s |

#### **Stock Market Endpoints (~10 endpoints)**

| Endpoint | Method | Purpose | Cache TTL |
|----------|--------|---------|-----------|
| `/api/stocks/quotes` | GET | Multi-stock quotes | 30s |
| `/api/stocks/search` | GET | Stock symbol search | 60s |
| `/api/stocks/candles` | GET | Stock OHLC data | 5min |
| `/api/stocks/movers` | GET | Gainers/losers | 2min |
| `/api/stocks/indices` | GET | Market indices | 5min |
| `/api/stocks/news/*` | GET | Market/company news | 5min |
| `/api/stocks/sectors` | GET | Sector performance | 5min |

#### **AI & Intelligence Endpoints (~8 endpoints)**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/answer` | POST | Monarch AI answers |
| `/api/project/crawl` | GET | Website crawling |
| `/api/project/latest-tweet` | GET | X/Twitter fetch |
| `/api/search/whisper` | POST | Natural language search |
| `/api/monarch-logs` | GET | AI agent logs |

#### **News & Content Endpoints (~5 endpoints)**

| Endpoint | Method | Source |
|----------|--------|--------|
| `/api/cryptopanic` | GET | CryptoPanic API |
| `/api/news` | GET | CryptoCompare |
| `/api/news/rss` | GET | RSS feeds (CoinDesk, Cointelegraph) |
| `/api/weather` | GET | Open-Meteo |
| `/api/ambient` | GET | Pixabay audio proxy |

#### **Admin & Utility Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/env-check` | GET | Environment sanity check |
| `/api/v1/posts` | POST | Publish content |
| `/api/v1/posts/dry-run` | POST | Generate draft |
| `/api/brief/generate` | POST | AI market brief |
| `/api/brief/audio` | POST | TTS generation |

---

## 3. API Proxy Pattern (Dev vs Production)

### 3.1 The Dual-Mode Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT MODE                              │
│  Frontend (Vite) → Vite Proxy (/api) → Express Server (:3001)    │
│                    ↓                                              │
│              External APIs (Codex, CoinGecko, etc.)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCTION MODE (Vercel)                        │
│  Frontend (Vercel) → API Routes (/api/*) → Direct API calls      │
│                      ↓                                            │
│              External APIs (with serverless functions)           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Frontend Service Proxy Detection

```javascript
// From codexApi.js - detects environment
const API_BASE = '/api';  // Relative → Vite proxy in dev
const isDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1');
const VERCEL_API_URL = '/api/codex';  // Vercel serverless

// Conditional routing
async function apiRequest(action, params) {
  let url;
  if (isDev) {
    url = `${API_BASE}/tokens/${action}?...`;  // → Express server
  } else {
    url = `${VERCEL_API_URL}?action=${action}...`;  // → Vercel function
  }
  // ...
}
```

### 3.3 Vite Proxy Configuration (Development)

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
```

### 3.4 Why This Pattern?

1. **CORS Avoidance**: Server-side API calls avoid browser CORS restrictions
2. **API Key Security**: Keys stored in server `.env`, never exposed to client
3. **Rate Limit Management**: Centralized caching and rate limit handling
4. **Request Aggregation**: Batch multiple API calls, reduce client requests
5. **Fallback Chain**: Server can retry with alternate APIs
6. **Development Parity**: Same `/api` paths work in both environments

---

## 4. Data Transformation Patterns

### 4.1 Response Normalization

All services transform external API responses to a consistent internal format:

```javascript
// External → Internal format example
{
  // CoinGecko format
  "current_price": 45000.50,
  "price_change_percentage_24h": 2.5,
  "market_cap": 890000000000,
  "total_volume": 28000000000
}

// Transformed to internal
{
  price: 45000.50,
  change: 2.5,           // normalized to percentage
  change24: 2.5,
  marketCap: 890000000000,
  volume: 28000000000,
  liquidity: 28000000000  // derived from volume
}
```

### 4.2 Symbol Standardization

```javascript
// Hardcoded symbol mappings for API inconsistencies
const BINANCE_SYMBOL_TO_PAIR = {
  PEPE: '1000PEPEUSDT',
  FLOKI: '1000FLOKIUSDT',
  SHIB: '1000SHIBUSDT',
  // ...
};

const SYMBOL_TO_COINGECKO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  // 30+ mappings
};
```

### 4.3 Number Formatting Utilities

```javascript
// Large number formatting (B/M/K)
export function formatLargeNumber(num) {
  if (absNum >= 1e9) return `$${(n / 1e9).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}B`;
  if (absNum >= 1e6) return `$${(n / 1e6).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}M`;
  // ...
}

// Price formatting by magnitude
export function formatPrice(price) {
  if (p >= 1000) return `$${p.toLocaleString('en-US', { 
    minimumFractionDigits: 2 
  })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}
```

---

## 5. Error Handling Strategies

### 5.1 Tiered Fallback Chain

```javascript
async function getCriticalData() {
  // Tier 1: Primary API with caching
  try {
    const cached = getCache('key');
    if (cached) return cached;
    
    const data = await fetchPrimary();
    setCache('key', data);
    return data;
  } catch (e) {
    log('Primary failed:', e);
  }
  
  // Tier 2: Secondary API
  try {
    return await fetchSecondary();
  } catch (e) {
    log('Secondary failed:', e);
  }
  
  // Tier 3: Stale cache
  const stale = getCache('key', { allowStale: true });
  if (stale) return stale;
  
  // Tier 4: Static fallback
  return FALLBACK_DATA;
}
```

### 5.2 Graceful Degradation Patterns

| Service | Primary Failure Behavior |
|---------|------------------------|
| `codexApi` | Falls back to CoinGecko → Binance → empty object |
| `coinGeckoApi` | Returns stale cache → static mock data (1000 coins) |
| `stockApi` | Falls back to static `FALLBACK_STOCK_DATA` with variation |
| `cryptoNewsApi` | Falls back to empty array |
| AI services | Returns raw context data without LLM processing |

### 5.3 Error Logging & Monitoring

```javascript
// Monarch AI logging pattern
const MONARCH_LOGS_MAX = 300;
const monarchLogs = [];

function monarchLog(level, ...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  monarchLogs.push(line);
  if (monarchLogs.length > MONARCH_LOGS_MAX) monarchLogs.shift();
  
  if (level === 'error') console.error('[Monarch]', ...args);
  else console.log('[Monarch]', ...args);
}
```

---

## 6. Caching Strategies

### 6.1 Server-Side Cache Configuration

```javascript
// Cache TTLs by data type
const CACHE_TTL_PRICES_MS = 30 * 1000;        // 30s - real-time prices
const CACHE_TTL_DETAILS_MS = 15 * 1000;       // 15s - token details
const CACHE_TTL_TRENDING_MS = 2 * 60 * 1000;  // 2min - trending
const CACHE_TTL_STOCK_QUOTES_MS = 30 * 1000;
const CACHE_TTL_STOCK_CANDLES_MS = 5 * 60 * 1000;  // 5min - chart data
const CACHE_TTL_WHISPER_MS = 5 * 60 * 1000;       // 5min - AI search parse

// Cache stores
const cache = {
  prices: new Map(),
  details: new Map(),
  trending: new Map(),
  stockQuotes: new Map(),
  // ...
};
```

### 6.2 Client-Side Caching

```javascript
// Service-level caches with TTL
let priceCache = {};
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000;

// Cache validation
const allCached = symbols.every(s => {
  const key = s.toUpperCase();
  return priceCache[key] && (now - lastFetchTime < CACHE_TTL);
});
```

### 6.3 Cache Strategies by Data Volatility

| Data Type | Cache Duration | Strategy |
|-----------|---------------|----------|
| Token prices | 30s | Time-based invalidation |
| Token details | 15s | Aggressive refresh |
| Trending tokens | 2min | Moderate staleness acceptable |
| Stock candles | 5min | Historical data = stable |
| News articles | 3-5min | Update periodically |
| AI search parse | 5min | LLM results expensive |
| Categories | 5min | Relatively static |

---

## 7. API Integration Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React Components (hooks: useTokenData, useStockData, etc.)   │  │
│  └────────────────────┬─────────────────────────────────────────┘  │
└───────────────────────┼────────────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────────────┐
│                    SERVICE LAYER (frontend)                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ codexApi   │ │coinGeckoApi│ │ binanceApi │ │  stockApi  │      │
│  │ cryptoNews │ │ stockNews  │ │ polymarket │ │ projectLinks│      │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘      │
└────────┼──────────────┼──────────────┼──────────────┼──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │         /api (relative URL)          │
         └──────────────────┬──────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────┐
│                    BACKEND LAYER (Express)                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Express Server (port 3001) - CORS Proxy & Aggregator       │  │
│  │                                                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ Token Routes│  │ Stock Routes│  │   AI/Intelligence   │  │  │
│  │  │ /api/tokens │  │ /api/stocks │  │   /api/ai/*         │  │  │
│  │  │ /api/bars   │  │ /api/stocks │  │   /api/search/*     │  │  │
│  │  └──────┬──────┘  │   /candles  │  │                     │  │  │
│  │         │         └──────┬──────┘  └─────────────────────┘  │  │
│  │         │                │                                  │  │
│  │  ┌──────▼────────────────▼──────────────────────────────┐  │  │
│  │  │           Cache Layer (in-memory Maps)               │  │  │
│  │  └──────────────────┬───────────────────────────────────┘  │  │
│  └─────────────────────┼──────────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼────┐  ┌───────────▼────────┐  ┌───────▼────────┐
│ Codex  │  │     CoinGecko      │  │    Binance     │
│ GraphQL│  │  (Pro/Free tier)   │  │  (Public API)  │
└────────┘  └────────────────────┘  └────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ CryptoPanic  │  │ CryptoCompare│  │    Yahoo     │
│   News API   │  │    News      │  │   Finance    │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────────────────────────────────┐
│              AI/LLM Services                     │
│  ┌──────────────┐      ┌──────────────┐         │
│  │  Anthropic   │──────│   Claude     │         │
│  │   (Tools)    │      │  (Monarch)   │         │
│  └──────────────┘      └──────────────┘         │
│  ┌──────────────┐      ┌──────────────┐         │
│  │    OpenAI    │──────│  GPT-4o-mini │         │
│  │  (Fallback)  │      │  (Fallback)  │         │
│  └──────────────┘      └──────────────┘         │
└──────────────────────────────────────────────────┘
```

---

## 8. Key Design Decisions

### 8.1 Why Express Proxy Instead of Direct API Calls?

| Concern | Solution |
|---------|----------|
| CORS | Server-side calls bypass browser restrictions |
| API Keys | Keys stored server-side in `.env` |
| Rate Limits | Server caching reduces API calls |
| Response Time | Batched requests, intelligent caching |
| Fallback Logic | Server can retry with alternate sources |

### 8.2 Why Multiple API Sources?

- **Codex**: Real-time DEX data, token details, socials
- **CoinGecko**: Reliable major token data, categories, market cap
- **Binance**: High-availability price feed, no API key needed
- **Yahoo Finance/Finnhub**: Stock market data
- **CryptoPanic/CryptoCompare**: News aggregation

### 8.3 Why GraphQL + REST Hybrid?

- **Codex (GraphQL)**: Efficient token detail queries, nested social data
- **CoinGecko (REST)**: Simple paginated market data, caching friendly
- **Binance (REST)**: Lightweight price tickers

---

## 9. Environment Variables

```bash
# Required for core functionality
CODEX_API_KEY=your_codex_api_key

# For higher rate limits
COINGECKO_API_KEY=your_coingecko_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_key
CRYPTOPANIC_API_KEY=your_cryptopanic_key

# For AI features
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# For search tools
TAVILY_API_KEY=your_tavily_key
SERPAPI_KEY=your_serpapi_key

# For X/Twitter integration
TWITTER_BEARER_TOKEN=your_twitter_token

# For posting API
SPECTRE_POSTING_API_KEY=your_posting_key
```

---

## 10. Conclusion

The Spectre AI API architecture demonstrates sophisticated **resilience patterns**:

1. **Multi-tier fallback chains** ensure data availability even when primary APIs fail
2. **Intelligent caching** balances freshness with API rate limits
3. **Service abstraction** allows swapping API providers without UI changes
4. **Dual-mode operation** (dev/prod) provides flexibility in deployment
5. **Graceful degradation** maintains functionality with static fallbacks

This architecture handles the volatility of both financial markets and third-party API reliability, providing users with consistent access to critical trading data.
