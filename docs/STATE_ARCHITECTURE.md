# Spectre AI Trading Platform — State Architecture & Data Flow Analysis

## Executive Summary

The Spectre AI Trading Platform uses a **hybrid state management approach** combining:
- **React Context** for global application state (i18n/currency, mobile preview)
- **Custom React Hooks** for data fetching and domain-specific state
- **LocalStorage** for user preferences and persistent feature state (egg gamification)
- **No external state management library** (no Redux, Zustand, Jotai, etc.)

---

## 1. State Management Libraries

| Library | Usage | Purpose |
|---------|-------|---------|
| **React useState/useReducer** | Core | All component and hook local state |
| **React Context** | 2 contexts | I18n/Currency and Mobile Preview |
| **localStorage** | 3+ keys | Persistence for user preferences, egg state, agent profile |
| **None (Redux/Zustand/etc.)** | N/A | Not used — intentional lightweight approach |

### Dependencies (from package.json)
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^7.13.0",
  "i18next": "^25.8.6",
  "react-i18next": "^16.5.4"
}
```

---

## 2. Context Usage

### 2.1 I18nCurrencyContext (`src/contexts/I18nCurrencyContext.jsx`)

**Purpose:** Global currency and language state with real-time exchange rate fetching

```javascript
// Provides:
{
  currency, setCurrency,           // USD, EUR, GBP, etc.
  language, setLanguage,           // en, es, fr, etc.
  exchangeRate, rates,             // Live exchange rates
  fmtPrice, fmtLarge,              // Formatting functions
  fmtPriceShort, fmtLargeShort,
  currencySymbol, currencyConfig,
  languageConfig
}
```

**State Persistence:**
- `localStorage.getItem('spectre-currency')` — saved currency preference
- `localStorage.getItem('spectre-language')` — saved language preference

**Data Fetching:**
- Exchange rates fetched every 15 minutes via `fetchExchangeRates()`
- Lazy-loaded i18n bundles for non-English languages

**Used By:**
- `useMarketIntel` — for price formatting
- All components displaying prices/currencies

---

### 2.2 MobilePreviewContext (`src/contexts/MobilePreviewContext.js`)

**Purpose:** Simple boolean flag for iPhone frame preview mode

```javascript
const MobilePreviewContext = createContext(false)
```

**Usage:**
- Forces mobile layout when viewing inside iPhone preview frame
- Consumed by `useIsMobile()` hook

---

## 3. Custom Hooks Architecture

### 3.1 Hook Inventory (7 files, ~20+ hooks)

| File | Hooks | Domain |
|------|-------|--------|
| `useCodexData.js` | 9 hooks | Crypto/token data (Codex API, Binance, CoinGecko) |
| `useStockData.js` | 7 hooks | Stock market data (quotes, charts, movers) |
| `useWatchlistPrices.js` | 1 hook | Watchlist price aggregation (multi-source) |
| `useMarketIntel.js` | 1 hook | Market intelligence (funding, OI, sentiment) |
| `useWhisperSearch.js` | 1 hook | AI natural language search |
| `useMediaQuery.js` | 2 hooks | Responsive layout detection |
| `useCurrency.js` | 1 hook | Re-export from I18nCurrencyContext |

---

### 3.2 Hook Patterns Analysis

#### Pattern A: Data Fetching with Polling (`useStockPrices`, `useTrendingTokens`)

```javascript
export function useStockPrices(symbols, refreshInterval = 10000) {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPrices = useCallback(async () => { ... }, [symbolsKey])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchPrices, refreshInterval, symbolsKey])

  return { prices, loading, error, refresh: fetchPrices }
}
```

**Characteristics:**
- Initial fetch on mount
- Automatic polling with configurable interval
- Cleanup on unmount (prevents memory leaks)
- Manual `refresh()` function for forced updates
- Stable dependency keys for arrays (avoids infinite loops)

---

#### Pattern B: Debounced Search (`useStockSearch`, `useTokenSearch`)

```javascript
export function useStockSearch(query, debounceMs = 300) {
  const [results, setResults] = useState([])
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    timeoutRef.current = setTimeout(async () => {
      // API call
    }, debounceMs)

    return () => clearTimeout(timeoutRef.current)
  }, [query, debounceMs])

  return { results, loading, error }
}
```

**Characteristics:**
- `useRef` for timeout management
- Cleanup prevents stale API calls
- Shows instant results from cache (major tokens) while API loads

---

#### Pattern C: WebSocket + REST Fallback (`useRealtimePrice` in useCodexData.js)

```javascript
let wsInstance = null
let wsListeners = new Map()
let wsGaveUp = false

export function useRealtimePrice(address, networkId = 1) {
  const [data, setData] = useState({ price: null, change: null, volume: null })
  const restIntervalRef = useRef(null)

  // REST polling fallback (for Vercel/prod)
  useEffect(() => {
    if (!isWSUnavailable()) return
    fetchPrice()
    restIntervalRef.current = setInterval(fetchPrice, 10000)
    return () => clearInterval(restIntervalRef.current)
  }, [address, networkId])

  // WebSocket path (for local dev)
  useEffect(() => {
    if (isWSUnavailable()) return
    // Subscribe to singleton WS
  }, [address, networkId])

  return { livePrice, liveChange, liveVolume, connected }
}
```

**Characteristics:**
- **Singleton WebSocket** shared across all hook instances
- **Ref-counted subscriptions** — multiple components can subscribe to same token
- **Graceful degradation** — falls back to REST polling after 3 WS failures
- Environment detection (localhost vs Vercel)

---

#### Pattern D: Caching with localStorage (`useCuratedTokenPrices`)

```javascript
const PRICE_CACHE_KEY = 'spectre_token_prices_cache'

export function useCuratedTokenPrices(symbols, refreshInterval = 60000) {
  const [prices, setPrices] = useState(() => {
    const cached = localStorage.getItem(PRICE_CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data // Use cached prices immediately
      }
    }
    return {}
  })
  // ...
}
```

**Characteristics:**
- Initialize state from cache for instant display
- Validate cache age (5 minutes)
- Update cache after fresh fetch

---

#### Pattern E: Derived Data with Ref Pattern (`useMarketIntel`)

```javascript
export function useMarketIntel(refreshInterval = 60000) {
  const [tick, setTick] = useState(0) // Single re-render trigger
  const dataRef = useRef({ ...DEFAULTS })
  const prevTickersRef = useRef(null)

  const computeDerived = useCallback((funding, oi, lsRatio, global, tickerData) => {
    // Writes directly to dataRef (no re-renders during computation)
    dataRef.current.whaleFlows = {...}
    dataRef.current.altSeasonIndex = {...}
    dataRef.current.sectorPerformance = {...}
  }, [])

  const fetchAll = useCallback(async () => {
    // Fetch data...
    computeDerived(d.fundingRates, d.openInterest, d.longShortRatio, d.globalData, d.tickers)
    setTick(t => t + 1) // Single re-render trigger
  }, [])

  // useMemo returns stable object until tick changes
  return useMemo(() => ({
    fundingRates: d.fundingRates,
    // ... 15+ derived metrics
  }), [tick, loading, error])
}
```

**Characteristics:**
- **Single re-render** for multiple data updates (prevents cascading renders)
- **Ref-based mutable state** during computation
- **useMemo** for stable return object
- **Optimistic updates** from previous data

---

#### Pattern F: Multi-Source Data Aggregation (`useWatchlistPrices`)

```javascript
export default function useWatchlistPrices(watchlist = []) {
  const [liveData, setLiveData] = useState({})
  const [realtimePrices, setRealtimePrices] = useState({})

  // Strategy:
  // 1. Separate tokens by data source (CoinGecko vs Codex vs Unknown)
  // 2. Fetch from multiple APIs in parallel
  // 3. Batch requests with rate limiting (3 concurrent)
  // 4. DexScreener fallback for unpriced tokens
  // 5. Merge with real-time Binance prices

  const watchlistWithLiveData = useMemo(() => {
    return watchlist.map((token) => {
      const data = liveData[symbol] || liveData[addrKey]
      const realtime = realtimePrices[symbol]
      return {
        ...token,
        price: (realtime?.price > 0 ? realtime.price : null) ?? data?.price ?? token.price,
        // Merge multiple data sources...
      }
    })
  }, [watchlist, liveData, realtimePrices])

  return { watchlistWithLiveData, liveData, loading, lastUpdated, refresh }
}
```

**Characteristics:**
- **Multi-source aggregation** (CoinGecko, Codex, Binance, DexScreener)
- **Intelligent fallback** chain
- **Batching with delays** to avoid rate limits
- **Memory-efficient** price comparison to prevent unnecessary re-renders

---

## 4. Data Fetching Patterns

### 4.1 API Service Layer (`src/services/`)

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `codexApi.js` | On-chain token data | `getTrendingTokens`, `searchTokens`, `getBars`, `getDetailedTokenInfo` |
| `coinGeckoApi.js` | Major token prices | `getMajorTokenPrices`, `searchMajorTokens` |
| `binanceApi.js` | Real-time prices | `getBinancePrices`, `getTopCoinPrices`, `getBinanceKlines` |
| `stockApi.js` | Stock market data | `getStockQuotes`, `getStockCandles`, `getMarketMovers` |
| `cryptoNewsApi.js` | News feed | `getCryptoNews` |

### 4.2 API Request Pattern

```javascript
// All services use async/await with error handling
async function apiRequest(action, params = {}) {
  try {
    const response = await fetch(url, { headers: {...} })
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}
```

### 4.3 Backend Route Strategy

**Development:** Vite proxy (`/api` → `localhost:3001`)
**Production:** `/api/*` handled by Express server or Vercel serverless functions

---

## 5. State Persistence Strategy

### 5.1 localStorage Keys

| Key | Purpose | Managed By |
|-----|---------|------------|
| `spectre-currency` | User's selected currency (USD, EUR, etc.) | I18nCurrencyContext |
| `spectre-language` | User's selected language | I18nCurrencyContext |
| `spectreEgg` | Gamification egg state machine | EggStateManager |
| `spectreAgent` | Post-hatch agent profile | EggStateManager |
| `spectre_token_prices_cache` | Cached token prices | useCuratedTokenPrices |
| `spectre-nav-sidebar-collapsed` | UI layout preference | App.jsx |

### 5.2 State Machine Example (Egg System)

```javascript
// EggStateManager.js — localStorage-backed state machine
const EGG_STATES = {
  DORMANT: 'DORMANT',
  CRACKING: 'CRACKING',
  HATCHING: 'HATCHING',
  BORN: 'BORN',
  GROWING: 'GROWING'
}

// Transitions based on weighted interactions
export function trackEggInteraction(type) {
  const weight = INTERACTION_WEIGHTS[type] || 1
  interactions.total += weight
  
  if (state === CRACKING && total >= HATCHING_THRESHOLD) {
    newState = HATCHING
  } else if (state === DORMANT && total >= CRACKING_THRESHOLD) {
    newState = CRACKING
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
```

---

## 6. Data Flow Diagrams

### 6.1 Price Data Flow (Multi-Source)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CoinGecko API  │     │   Codex API     │     │  Binance API    │
│  (Major tokens) │     │  (On-chain)     │     │  (Real-time)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useWatchlistPrices Hook                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Separate tokens by source                            │   │
│  │  2. Batch requests (3 concurrent, 200ms delay)           │   │
│  │  3. DexScreener fallback for unpriced                    │   │
│  │  4. Merge: Binance realtime > CoinGecko > Codex          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Components                                │
│              (Watchlist cards, Token table, etc.)                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Context Provider Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.jsx                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    BrowserRouter                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                       App                           │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │           I18nCurrencyProvider                │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │      MobilePreviewContext               │  │  │  │  │
│  │  │  │  │  ┌───────────────────────────────────┐  │  │  │  │  │
│  │  │  │  │  │         CopyToastContext          │  │  │  │  │  │
│  │  │  │  │  │         (App.jsx level)           │  │  │  │  │  │
│  │  │  │  │  └───────────────────────────────────┘  │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Market Intel Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     useMarketIntel Hook                          │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ /funding     │  │ /oi          │  │ /ls-ratio    │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│   ┌──────────────┐  ┌──────────────┐                             │
│   │ /global      │  │ /tickers     │  ← All polled together     │
│   └──────────────┘  └──────────────┘                             │
│                                                                  │
│   dataRef.current (mutable during computation)                   │
│        │                                                         │
│        ▼                                                         │
│   computeDerived()                                               │
│   ├─ whaleFlows (from OI + funding)                              │
│   ├─ altSeasonIndex (from dominance + performance)               │
│   ├─ sectorPerformance (from ticker map + SECTOR_TAGS)           │
│   ├─ liveEvents (from gainers/losers/funding thresholds)         │
│   └─ scenario (AI-derived market thesis)                         │
│                                                                  │
│   setTick(t => t + 1)  ← Single re-render trigger                │
│        │                                                         │
│        ▼                                                         │
│   useMemo returns stable object                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Performance Optimizations

### 7.1 Implemented Strategies

| Strategy | Implementation | Benefit |
|----------|----------------|---------|
| **Stable dependency keys** | `symbolsKey = symbols.join(',')` | Prevents re-fetch when array reference changes but content same |
| **useMemo for expensive merges** | `watchlistWithLiveData` | Prevents re-computation when data unchanged |
| **Ref-based derived computation** | `dataRef.current` in useMarketIntel | 15+ metrics update with single re-render |
| **Price change detection** | Compare old/new before `setState` | Prevents logo flickering from unnecessary re-renders |
| **AbortController cleanup** | `useWhisperSearch`, `useTokenSearch` | Cancels in-flight requests on unmount/new query |
| **localStorage caching** | `PRICE_CACHE_KEY` | Instant display on page refresh |
| **Batching with delays** | 3 concurrent requests, 200ms delay | Avoids API rate limiting |
| **Singleton WebSocket** | Module-level `wsInstance` | Shared connection across components |

### 7.2 Anti-Patterns Avoided

- ❌ Prop drilling — solved with Context
- ❌ Redux for simple state — React Context sufficient
- ❌ Unnecessary re-renders — useMemo/useCallback throughout
- ❌ Memory leaks — all intervals/timeouts cleaned up
- ❌ Stale closures — refs used for mutable values

---

## 8. Key Architectural Decisions

### 8.1 Why No Redux/Zustand?

**Decision:** Use React built-in state management only

**Rationale:**
- Application state is relatively simple (no complex interdependent state)
- Data is primarily server-fetched (not client-generated)
- Context + Hooks pattern sufficient for 2 global concerns (i18n, mobile preview)
- Avoids bundle size increase (~5-15KB saved)

### 8.2 Why Multiple Data Sources?

**Decision:** Aggregate CoinGecko + Codex + Binance + DexScreener

**Rationale:**
- CoinGecko: Reliable historical data (7d, 30d, 1y), good for major tokens
- Binance: Real-time prices, no rate limit
- Codex: On-chain specific data (age, transaction count, makers)
- DexScreener: Ultimate fallback for obscure tokens

### 8.3 Why WebSocket + REST Hybrid?

**Decision:** WebSocket for dev, REST polling for production

**Rationale:**
- Vercel doesn't support persistent WebSocket connections
- Graceful degradation ensures reliability
- 10-second REST polling acceptable UX fallback

---

## 9. Testing & Debugging

### 9.1 Built-in Debugging

```javascript
// All hooks include console logging
console.log('useCuratedTokenPrices: Fetching prices for', symbols.length, 'symbols')
console.log('[WS] Connected to price stream')
console.log(`ATH fetch iteration ${iteration + 1}: ...`)
```

### 9.2 State Inspection

```javascript
// Egg state in browser console
JSON.parse(localStorage.getItem('spectreEgg'))

// Currency/rates
JSON.parse(localStorage.getItem('spectre-currency'))
```

---

## 10. Future Considerations

### Potential Improvements

1. **React Query/SWR** — Could replace manual polling hooks with automatic caching, refetching, and deduplication
2. **Zustand** — If global state grows beyond i18n/currency, lightweight alternative to Context
3. **Service Worker** — Cache API responses for offline support
4. **Streaming** — Server-sent events for real-time instead of polling

---

## Appendix: File Reference

```
src/
├── contexts/
│   ├── I18nCurrencyContext.jsx    # Global i18n + currency state
│   └── MobilePreviewContext.js    # Mobile preview flag
├── hooks/
│   ├── useCodexData.js            # 9 crypto/token hooks
│   ├── useStockData.js            # 7 stock market hooks
│   ├── useWatchlistPrices.js      # Multi-source price aggregation
│   ├── useMarketIntel.js          # Market intelligence (complex derived state)
│   ├── useWhisperSearch.js        # AI search with abort handling
│   ├── useMediaQuery.js           # Responsive detection
│   └── useCurrency.js             # Re-export from context
├── services/
│   ├── codexApi.js                # On-chain data
│   ├── coinGeckoApi.js            # Major token prices
│   ├── binanceApi.js              # Real-time prices
│   ├── stockApi.js                # Stock data
│   └── cryptoNewsApi.js           # News feed
└── components/egg/
    ├── EggStateManager.js         # localStorage state machine
    └── useEggState.js             # Hook for egg gamification
```

---

*Document generated: 2026-02-13*
*Analysis covers all hooks, contexts, and state management patterns in the Spectre AI Trading Platform*
