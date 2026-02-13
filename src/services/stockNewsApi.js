/**
 * Stock News API Service
 * Fetches financial and stock market news
 * Primary: Server proxy at localhost:3001/api/stocks/news/*
 * Fallback: Direct Finnhub API → Mock data
 */

// Server proxy (primary)
const SERVER_BASE = 'http://localhost:3001'

// Finnhub news endpoint (fallback)
const FINNHUB_API_KEY = 'demo' // Replace with real key for production
const FINNHUB_NEWS_URL = 'https://finnhub.io/api/v1/news'
const FINNHUB_COMPANY_NEWS_URL = 'https://finnhub.io/api/v1/company-news'

/**
 * Fetch with timeout helper
 */
function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id))
}

/**
 * Try server proxy first
 */
async function serverFetch(endpoint, timeoutMs = 6000) {
  try {
    const res = await fetchWithTimeout(`${SERVER_BASE}${endpoint}`, {}, timeoutMs)
    if (res.ok) {
      const data = await res.json()
      if (data) return data
    }
  } catch (e) {
    // Server not running, fall through
  }
  return null
}

/**
 * Get general market news
 * Primary: server proxy → Fallback: Finnhub direct → Mock data
 * @param {string} category - News category: general, forex, crypto, merger
 * @returns {Promise<Array<NewsItem>>}
 */
export async function getMarketNews(category = 'general') {
  // 1. Try server proxy (cached 5 min)
  try {
    const data = await serverFetch('/api/stocks/news/market')
    if (Array.isArray(data) && data.length > 0) {
      console.log('Market news via server proxy:', data.length, 'articles')
      return data.slice(0, 20)
    }
  } catch (err) {
    console.warn('Server market news failed:', err.message)
  }

  // 2. Try Finnhub direct
  try {
    const url = `${FINNHUB_NEWS_URL}?category=${category}&token=${FINNHUB_API_KEY}`
    const res = await fetchWithTimeout(url, {}, 5000)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 20).map(item => ({
          id: item.id || Math.random().toString(36),
          title: item.headline || item.title || '',
          summary: item.summary || '',
          source: item.source || 'Unknown',
          url: item.url || '#',
          image: item.image || null,
          publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString(),
          category: item.category || category,
          related: item.related || '',
        }))
      }
    }
  } catch (err) {
    console.warn('Finnhub market news failed:', err.message)
  }

  // 3. Fallback: mock data
  return getMarketNewsFallback()
}

/**
 * Get news for a specific stock
 * Primary: server proxy → Fallback: Finnhub direct → Empty array
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array<NewsItem>>}
 */
export async function getStockNews(symbol) {
  if (!symbol) return []

  // 1. Try server proxy (cached 5 min)
  try {
    const data = await serverFetch(`/api/stocks/news/${encodeURIComponent(symbol)}`)
    if (Array.isArray(data) && data.length > 0) {
      console.log(`Stock news via server proxy: ${data.length} articles for ${symbol}`)
      return data.slice(0, 15)
    }
  } catch (err) {
    console.warn(`Server stock news failed for ${symbol}:`, err.message)
  }

  // 2. Try Finnhub direct
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const url = `${FINNHUB_COMPANY_NEWS_URL}?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    const res = await fetchWithTimeout(url, {}, 5000)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 15).map(item => ({
          id: item.id || Math.random().toString(36),
          title: item.headline || item.title || '',
          summary: item.summary || '',
          source: item.source || 'Unknown',
          url: item.url || '#',
          image: item.image || null,
          publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString(),
          symbol: symbol,
          related: item.related || symbol,
        }))
      }
    }
  } catch (err) {
    console.warn(`Finnhub stock news failed for ${symbol}:`, err.message)
  }

  return []
}

/**
 * Get trending/top financial news
 */
export async function getTrendingNews() {
  return getMarketNews('general')
}

/**
 * Fallback mock news data when all APIs fail
 */
function getMarketNewsFallback() {
  const now = Date.now()
  return [
    {
      id: '1',
      title: 'S&P 500 Reaches New All-Time High Amid Strong Earnings',
      summary: 'The S&P 500 index closed at a record high as tech giants reported better-than-expected quarterly earnings, boosting investor confidence.',
      source: 'Financial Times',
      url: '#',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
      publishedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      category: 'market',
    },
    {
      id: '2',
      title: 'Federal Reserve Signals Potential Rate Cut in Coming Months',
      summary: 'Fed officials indicated openness to lowering interest rates if inflation continues to cool, sending bond yields lower.',
      source: 'Reuters',
      url: '#',
      image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400',
      publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      category: 'economy',
    },
    {
      id: '3',
      title: 'Tech Stocks Rally on AI Optimism',
      summary: 'Major technology companies surged as investors bet on continued growth in artificial intelligence applications across industries.',
      source: 'Bloomberg',
      url: '#',
      image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400',
      publishedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      category: 'technology',
    },
    {
      id: '4',
      title: 'Oil Prices Decline on Demand Concerns',
      summary: 'Crude oil futures fell as economic data from China raised concerns about global energy demand.',
      source: 'Wall Street Journal',
      url: '#',
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
      publishedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      category: 'commodities',
    },
    {
      id: '5',
      title: 'Retail Sales Beat Expectations, Consumer Spending Remains Strong',
      summary: 'U.S. retail sales rose more than forecast, suggesting consumer spending continues to support economic growth.',
      source: 'CNBC',
      url: '#',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
      publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      category: 'economy',
    },
    {
      id: '6',
      title: 'Healthcare Stocks Outperform on Drug Approval News',
      summary: 'Pharmaceutical companies gained after FDA approvals for several new treatments boosted the healthcare sector.',
      source: 'MarketWatch',
      url: '#',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
      publishedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      category: 'healthcare',
    },
    {
      id: '7',
      title: 'Banking Sector Sees Mixed Results in Q4 Earnings',
      summary: 'Major banks reported quarterly results with varying outcomes, as net interest income trends diverged across institutions.',
      source: 'Financial Times',
      url: '#',
      image: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400',
      publishedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      category: 'financial',
    },
    {
      id: '8',
      title: 'Electric Vehicle Sales Continue to Grow Despite Headwinds',
      summary: 'EV manufacturers reported strong delivery numbers, though competition and pricing pressures remain concerns.',
      source: 'Reuters',
      url: '#',
      image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400',
      publishedAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      category: 'automotive',
    },
  ]
}

export default {
  getMarketNews,
  getStockNews,
  getTrendingNews,
}
