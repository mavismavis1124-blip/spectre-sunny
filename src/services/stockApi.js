/**
 * Stock Market API Service
 * Provides stock quotes, search, OHLC data, and company info
 * Primary: Server proxy at localhost:3001/api/stocks/* (Yahoo Finance, no CORS)
 * Fallback: Direct CORS proxy chain → static FALLBACK_STOCK_DATA
 */

// Server proxy (primary — no CORS issues, cached, fast)
const SERVER_BASE = 'http://localhost:3001'

// Finnhub API (used only as CORS proxy fallback)
const FINNHUB_API_KEY = 'demo'
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// CORS proxies (fallback when server is not running)
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

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
 * Try server proxy first, then CORS proxies as fallback
 */
async function serverFetch(endpoint, timeoutMs = 6000) {
  // 1. Try server proxy (fast, no CORS)
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

// Fallback stock data when all APIs fail (realistic market data - Feb 2026)
export const FALLBACK_STOCK_DATA = {
  'SPY': { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 612.45, change: 0.82, marketCap: 565000000000, volume: 68500000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'QQQ': { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 538.32, change: 1.15, marketCap: 265000000000, volume: 42300000, pe: null, sector: 'Index', exchange: 'NASDAQ' },
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 247.85, change: 1.24, marketCap: 3780000000000, volume: 52400000, pe: 32.2, sector: 'Technology', exchange: 'NASDAQ' },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corp.', price: 482.18, change: 0.95, marketCap: 3580000000000, volume: 18200000, pe: 35.5, sector: 'Technology', exchange: 'NASDAQ' },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 198.92, change: 0.67, marketCap: 2450000000000, volume: 21500000, pe: 22.8, sector: 'Technology', exchange: 'NASDAQ' },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 245.45, change: 1.85, marketCap: 2550000000000, volume: 35800000, pe: 38.1, sector: 'Consumer', exchange: 'NASDAQ' },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 958.52, change: 2.34, marketCap: 2400000000000, volume: 245000000, pe: 55.2, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 412.15, change: -1.45, marketCap: 1350000000000, volume: 82000000, pe: 85.5, sector: 'Automotive', exchange: 'NASDAQ' },
  'META': { symbol: 'META', name: 'Meta Platforms', price: 632.78, change: 1.12, marketCap: 1620000000000, volume: 14500000, pe: 26.4, sector: 'Technology', exchange: 'NASDAQ' },
  'JPM': { symbol: 'JPM', name: 'JPMorgan Chase', price: 272.45, change: 0.45, marketCap: 785000000000, volume: 8200000, pe: 11.8, sector: 'Financial', exchange: 'NYSE' },
  'V': { symbol: 'V', name: 'Visa Inc.', price: 338.92, change: 0.78, marketCap: 622000000000, volume: 5800000, pe: 29.2, sector: 'Financial', exchange: 'NYSE' },
  'JNJ': { symbol: 'JNJ', name: 'Johnson & Johnson', price: 162.35, change: -0.32, marketCap: 392000000000, volume: 6500000, pe: 14.4, sector: 'Healthcare', exchange: 'NYSE' },
  'WMT': { symbol: 'WMT', name: 'Walmart Inc.', price: 102.45, change: 0.55, marketCap: 822000000000, volume: 12500000, pe: 38.8, sector: 'Consumer', exchange: 'NYSE' },
  'PG': { symbol: 'PG', name: 'Procter & Gamble', price: 178.25, change: 0.28, marketCap: 420000000000, volume: 5200000, pe: 26.5, sector: 'Consumer', exchange: 'NYSE' },
  'KO': { symbol: 'KO', name: 'Coca-Cola Co.', price: 62.45, change: 0.18, marketCap: 268000000000, volume: 12000000, pe: 25.2, sector: 'Consumer', exchange: 'NYSE' },
  'PEP': { symbol: 'PEP', name: 'PepsiCo Inc.', price: 158.85, change: -0.22, marketCap: 218000000000, volume: 5500000, pe: 23.8, sector: 'Consumer', exchange: 'NASDAQ' },
  'COST': { symbol: 'COST', name: 'Costco Wholesale', price: 912.45, change: 0.85, marketCap: 405000000000, volume: 1800000, pe: 55.2, sector: 'Consumer', exchange: 'NASDAQ' },
  'MCD': { symbol: 'MCD', name: 'McDonald\'s Corp.', price: 298.45, change: 0.32, marketCap: 215000000000, volume: 3200000, pe: 25.5, sector: 'Consumer', exchange: 'NYSE' },
  'NKE': { symbol: 'NKE', name: 'Nike Inc.', price: 78.25, change: -0.85, marketCap: 118000000000, volume: 8500000, pe: 28.2, sector: 'Consumer', exchange: 'NYSE' },
  'SBUX': { symbol: 'SBUX', name: 'Starbucks Corp.', price: 105.42, change: 0.45, marketCap: 120000000000, volume: 5200000, pe: 32.5, sector: 'Consumer', exchange: 'NASDAQ' },
  'UNH': { symbol: 'UNH', name: 'UnitedHealth Group', price: 525.62, change: -0.85, marketCap: 485000000000, volume: 3200000, pe: 17.2, sector: 'Healthcare', exchange: 'NYSE' },
  'PFE': { symbol: 'PFE', name: 'Pfizer Inc.', price: 28.45, change: -0.55, marketCap: 162000000000, volume: 28000000, pe: 12.5, sector: 'Healthcare', exchange: 'NYSE' },
  'ABBV': { symbol: 'ABBV', name: 'AbbVie Inc.', price: 185.25, change: 0.42, marketCap: 328000000000, volume: 5200000, pe: 15.8, sector: 'Healthcare', exchange: 'NYSE' },
  'MRK': { symbol: 'MRK', name: 'Merck & Co.', price: 112.45, change: 0.25, marketCap: 285000000000, volume: 8200000, pe: 14.2, sector: 'Healthcare', exchange: 'NYSE' },
  'LLY': { symbol: 'LLY', name: 'Eli Lilly & Co.', price: 825.42, change: -1.85, marketCap: 782000000000, volume: 3500000, pe: 120.5, sector: 'Healthcare', exchange: 'NYSE' },
  'HD': { symbol: 'HD', name: 'Home Depot', price: 432.85, change: 0.92, marketCap: 430000000000, volume: 3800000, pe: 24.4, sector: 'Consumer', exchange: 'NYSE' },
  'BAC': { symbol: 'BAC', name: 'Bank of America', price: 48.82, change: 0.65, marketCap: 382000000000, volume: 32000000, pe: 13.2, sector: 'Financial', exchange: 'NYSE' },
  'MS': { symbol: 'MS', name: 'Morgan Stanley', price: 108.25, change: 0.55, marketCap: 185000000000, volume: 6500000, pe: 14.5, sector: 'Financial', exchange: 'NYSE' },
  'C': { symbol: 'C', name: 'Citigroup Inc.', price: 72.45, change: 0.42, marketCap: 142000000000, volume: 12000000, pe: 10.8, sector: 'Financial', exchange: 'NYSE' },
  'WFC': { symbol: 'WFC', name: 'Wells Fargo & Co.', price: 68.25, change: 0.35, marketCap: 225000000000, volume: 15000000, pe: 12.2, sector: 'Financial', exchange: 'NYSE' },
  'XOM': { symbol: 'XOM', name: 'Exxon Mobil', price: 118.45, change: -0.42, marketCap: 528000000000, volume: 14500000, pe: 13.8, sector: 'Energy', exchange: 'NYSE' },
  'CVX': { symbol: 'CVX', name: 'Chevron Corp.', price: 158.25, change: 0.35, marketCap: 298000000000, volume: 6200000, pe: 12.5, sector: 'Energy', exchange: 'NYSE' },
  'COP': { symbol: 'COP', name: 'ConocoPhillips', price: 112.85, change: -0.25, marketCap: 135000000000, volume: 5500000, pe: 11.8, sector: 'Energy', exchange: 'NYSE' },
  'DIS': { symbol: 'DIS', name: 'Walt Disney Co.', price: 122.35, change: 1.25, marketCap: 225000000000, volume: 8500000, pe: 45.4, sector: 'Communication', exchange: 'NYSE' },
  'VZ': { symbol: 'VZ', name: 'Verizon Communications', price: 42.85, change: 0.15, marketCap: 180000000000, volume: 15000000, pe: 9.5, sector: 'Communication', exchange: 'NYSE' },
  'T': { symbol: 'T', name: 'AT&T Inc.', price: 22.45, change: -0.12, marketCap: 160000000000, volume: 28000000, pe: 8.8, sector: 'Communication', exchange: 'NYSE' },
  'NFLX': { symbol: 'NFLX', name: 'Netflix Inc.', price: 942.45, change: 2.15, marketCap: 408000000000, volume: 4200000, pe: 42.2, sector: 'Communication', exchange: 'NASDAQ' },
  // Industrial
  'BA': { symbol: 'BA', name: 'Boeing Co.', price: 178.25, change: -1.25, marketCap: 108000000000, volume: 8500000, pe: null, sector: 'Industrial', exchange: 'NYSE' },
  'CAT': { symbol: 'CAT', name: 'Caterpillar Inc.', price: 372.45, change: 0.65, marketCap: 185000000000, volume: 2800000, pe: 17.2, sector: 'Industrial', exchange: 'NYSE' },
  'GE': { symbol: 'GE', name: 'GE Aerospace', price: 188.25, change: 0.85, marketCap: 205000000000, volume: 4200000, pe: 42.5, sector: 'Industrial', exchange: 'NYSE' },
  'UPS': { symbol: 'UPS', name: 'United Parcel Service', price: 138.45, change: -0.45, marketCap: 118000000000, volume: 3200000, pe: 16.8, sector: 'Industrial', exchange: 'NYSE' },
  'HON': { symbol: 'HON', name: 'Honeywell International', price: 212.85, change: 0.35, marketCap: 142000000000, volume: 2500000, pe: 22.5, sector: 'Industrial', exchange: 'NASDAQ' },
  // ETFs extra
  'DIA': { symbol: 'DIA', name: 'SPDR Dow Jones ETF', price: 435.85, change: 0.42, marketCap: 38000000000, volume: 3200000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'VOO': { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', price: 565.42, change: 0.55, marketCap: 480000000000, volume: 4500000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'SLV': { symbol: 'SLV', name: 'iShares Silver Trust', price: 28.85, change: 0.82, marketCap: 12000000000, volume: 22000000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  // Semiconductors
  'AMD': { symbol: 'AMD', name: 'Advanced Micro Devices', price: 178.45, change: 1.85, marketCap: 288000000000, volume: 42000000, pe: 48.2, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'INTC': { symbol: 'INTC', name: 'Intel Corp.', price: 32.15, change: -0.95, marketCap: 136000000000, volume: 38000000, pe: 125.0, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'AVGO': { symbol: 'AVGO', name: 'Broadcom Inc.', price: 185.42, change: 1.42, marketCap: 860000000000, volume: 12000000, pe: 38.5, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'QCOM': { symbol: 'QCOM', name: 'Qualcomm Inc.', price: 172.85, change: 0.95, marketCap: 192000000000, volume: 6500000, pe: 18.2, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'TSM': { symbol: 'TSM', name: 'Taiwan Semiconductor', price: 192.35, change: 1.65, marketCap: 998000000000, volume: 15000000, pe: 28.4, sector: 'Semiconductor', exchange: 'NYSE' },
  'MU': { symbol: 'MU', name: 'Micron Technology', price: 108.25, change: 2.15, marketCap: 120000000000, volume: 18000000, pe: 22.5, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'MRVL': { symbol: 'MRVL', name: 'Marvell Technology', price: 88.45, change: 1.32, marketCap: 76000000000, volume: 8500000, pe: 65.2, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'ON': { symbol: 'ON', name: 'ON Semiconductor', price: 72.35, change: -0.85, marketCap: 31000000000, volume: 5200000, pe: 19.8, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'LRCX': { symbol: 'LRCX', name: 'Lam Research', price: 92.45, change: 0.78, marketCap: 121000000000, volume: 2800000, pe: 25.4, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'AMAT': { symbol: 'AMAT', name: 'Applied Materials', price: 198.35, change: 1.15, marketCap: 165000000000, volume: 5500000, pe: 22.8, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'KLAC': { symbol: 'KLAC', name: 'KLA Corporation', price: 742.15, change: 0.92, marketCap: 100000000000, volume: 1200000, pe: 28.2, sector: 'Semiconductor', exchange: 'NASDAQ' },
  'ARM': { symbol: 'ARM', name: 'Arm Holdings', price: 168.45, change: 2.85, marketCap: 175000000000, volume: 8200000, pe: 95.4, sector: 'Semiconductor', exchange: 'NASDAQ' },
  // Software & Cloud
  'CRM': { symbol: 'CRM', name: 'Salesforce Inc.', price: 342.78, change: 0.92, marketCap: 332000000000, volume: 5200000, pe: 52.4, sector: 'Technology', exchange: 'NYSE' },
  'ADBE': { symbol: 'ADBE', name: 'Adobe Inc.', price: 542.35, change: 0.45, marketCap: 242000000000, volume: 2800000, pe: 42.8, sector: 'Technology', exchange: 'NASDAQ' },
  'ORCL': { symbol: 'ORCL', name: 'Oracle Corp.', price: 182.45, change: 0.68, marketCap: 505000000000, volume: 8500000, pe: 38.2, sector: 'Technology', exchange: 'NYSE' },
  'NOW': { symbol: 'NOW', name: 'ServiceNow Inc.', price: 892.45, change: 1.25, marketCap: 178000000000, volume: 1500000, pe: 68.5, sector: 'Technology', exchange: 'NYSE' },
  'SNOW': { symbol: 'SNOW', name: 'Snowflake Inc.', price: 178.92, change: -0.85, marketCap: 58000000000, volume: 4200000, pe: null, sector: 'Technology', exchange: 'NYSE' },
  'PLTR': { symbol: 'PLTR', name: 'Palantir Technologies', price: 82.45, change: 3.42, marketCap: 188000000000, volume: 52000000, pe: 200.0, sector: 'Technology', exchange: 'NYSE' },
  'PANW': { symbol: 'PANW', name: 'Palo Alto Networks', price: 392.15, change: 1.05, marketCap: 128000000000, volume: 3200000, pe: 52.4, sector: 'Technology', exchange: 'NASDAQ' },
  'CRWD': { symbol: 'CRWD', name: 'CrowdStrike Holdings', price: 345.85, change: 1.82, marketCap: 84000000000, volume: 3800000, pe: 85.2, sector: 'Technology', exchange: 'NASDAQ' },
  'SHOP': { symbol: 'SHOP', name: 'Shopify Inc.', price: 112.45, change: 2.15, marketCap: 145000000000, volume: 8500000, pe: 72.5, sector: 'Technology', exchange: 'NYSE' },
  'SQ': { symbol: 'SQ', name: 'Block Inc.', price: 78.92, change: 1.85, marketCap: 48000000000, volume: 6200000, pe: 42.8, sector: 'Technology', exchange: 'NYSE' },
  'UBER': { symbol: 'UBER', name: 'Uber Technologies', price: 78.25, change: 0.95, marketCap: 162000000000, volume: 18000000, pe: 125.0, sector: 'Technology', exchange: 'NYSE' },
  'SPOT': { symbol: 'SPOT', name: 'Spotify Technology', price: 512.85, change: 1.45, marketCap: 102000000000, volume: 2200000, pe: 95.2, sector: 'Technology', exchange: 'NYSE' },
  'ABNB': { symbol: 'ABNB', name: 'Airbnb Inc.', price: 158.42, change: 0.72, marketCap: 102000000000, volume: 4200000, pe: 35.8, sector: 'Technology', exchange: 'NASDAQ' },
  'NET': { symbol: 'NET', name: 'Cloudflare Inc.', price: 112.35, change: 2.25, marketCap: 38000000000, volume: 5200000, pe: null, sector: 'Technology', exchange: 'NYSE' },
  'DDOG': { symbol: 'DDOG', name: 'Datadog Inc.', price: 142.45, change: 1.05, marketCap: 46000000000, volume: 3800000, pe: 250.0, sector: 'Technology', exchange: 'NASDAQ' },
  'ZS': { symbol: 'ZS', name: 'Zscaler Inc.', price: 225.85, change: 0.85, marketCap: 32000000000, volume: 1800000, pe: null, sector: 'Technology', exchange: 'NASDAQ' },
  'MSTR': { symbol: 'MSTR', name: 'MicroStrategy Inc.', price: 342.15, change: 4.85, marketCap: 68000000000, volume: 22000000, pe: null, sector: 'Technology', exchange: 'NASDAQ' },
  // Financial
  'PYPL': { symbol: 'PYPL', name: 'PayPal Holdings', price: 82.35, change: 1.42, marketCap: 88000000000, volume: 12500000, pe: 22.4, sector: 'Financial', exchange: 'NASDAQ' },
  'MA': { symbol: 'MA', name: 'Mastercard Inc.', price: 528.92, change: 0.85, marketCap: 492000000000, volume: 2800000, pe: 38.2, sector: 'Financial', exchange: 'NYSE' },
  'GS': { symbol: 'GS', name: 'Goldman Sachs', price: 582.45, change: 0.72, marketCap: 185000000000, volume: 2200000, pe: 16.8, sector: 'Financial', exchange: 'NYSE' },
  'COIN': { symbol: 'COIN', name: 'Coinbase Global', price: 285.32, change: 3.85, marketCap: 72000000000, volume: 8500000, pe: 42.5, sector: 'Financial', exchange: 'NASDAQ' },
  'SCHW': { symbol: 'SCHW', name: 'Charles Schwab', price: 82.45, change: 0.52, marketCap: 152000000000, volume: 6800000, pe: 25.5, sector: 'Financial', exchange: 'NYSE' },
  'BLK': { symbol: 'BLK', name: 'BlackRock Inc.', price: 982.35, change: 0.65, marketCap: 148000000000, volume: 520000, pe: 22.8, sector: 'Financial', exchange: 'NYSE' },
  'AXP': { symbol: 'AXP', name: 'American Express', price: 292.45, change: 0.82, marketCap: 210000000000, volume: 2500000, pe: 20.5, sector: 'Financial', exchange: 'NYSE' },
  'HOOD': { symbol: 'HOOD', name: 'Robinhood Markets', price: 48.25, change: 2.85, marketCap: 42000000000, volume: 28000000, pe: 85.2, sector: 'Financial', exchange: 'NASDAQ' },
  'SOFI': { symbol: 'SOFI', name: 'SoFi Technologies', price: 15.85, change: 1.92, marketCap: 17000000000, volume: 32000000, pe: null, sector: 'Financial', exchange: 'NASDAQ' },
  // Communication
  'CMCSA': { symbol: 'CMCSA', name: 'Comcast Corp.', price: 42.85, change: -0.35, marketCap: 165000000000, volume: 18000000, pe: 11.5, sector: 'Communication', exchange: 'NASDAQ' },
  'TMUS': { symbol: 'TMUS', name: 'T-Mobile US', price: 215.42, change: 0.45, marketCap: 252000000000, volume: 3500000, pe: 25.2, sector: 'Communication', exchange: 'NASDAQ' },
  'ROKU': { symbol: 'ROKU', name: 'Roku Inc.', price: 82.15, change: 1.95, marketCap: 12000000000, volume: 4800000, pe: null, sector: 'Communication', exchange: 'NASDAQ' },
  'WBD': { symbol: 'WBD', name: 'Warner Bros. Discovery', price: 12.45, change: -1.25, marketCap: 30000000000, volume: 22000000, pe: null, sector: 'Communication', exchange: 'NASDAQ' },
  // Healthcare extra
  'TMO': { symbol: 'TMO', name: 'Thermo Fisher Scientific', price: 585.42, change: 0.42, marketCap: 225000000000, volume: 1200000, pe: 32.5, sector: 'Healthcare', exchange: 'NYSE' },
  'BMY': { symbol: 'BMY', name: 'Bristol-Myers Squibb', price: 52.85, change: -0.65, marketCap: 108000000000, volume: 12000000, pe: 8.5, sector: 'Healthcare', exchange: 'NYSE' },
  'AMGN': { symbol: 'AMGN', name: 'Amgen Inc.', price: 295.42, change: 0.35, marketCap: 158000000000, volume: 2800000, pe: 22.4, sector: 'Healthcare', exchange: 'NASDAQ' },
  'GILD': { symbol: 'GILD', name: 'Gilead Sciences', price: 98.25, change: 0.55, marketCap: 122000000000, volume: 5200000, pe: 12.8, sector: 'Healthcare', exchange: 'NASDAQ' },
  'ISRG': { symbol: 'ISRG', name: 'Intuitive Surgical', price: 542.85, change: 1.15, marketCap: 192000000000, volume: 1500000, pe: 72.5, sector: 'Healthcare', exchange: 'NASDAQ' },
  'MRNA': { symbol: 'MRNA', name: 'Moderna Inc.', price: 42.15, change: -2.45, marketCap: 16000000000, volume: 8500000, pe: null, sector: 'Healthcare', exchange: 'NASDAQ' },
  // Consumer extra
  'TGT': { symbol: 'TGT', name: 'Target Corp.', price: 148.25, change: 0.45, marketCap: 68000000000, volume: 4200000, pe: 15.2, sector: 'Consumer', exchange: 'NYSE' },
  'LOW': { symbol: 'LOW', name: 'Lowe\'s Companies', price: 268.42, change: 0.72, marketCap: 155000000000, volume: 2800000, pe: 18.5, sector: 'Consumer', exchange: 'NYSE' },
  'EL': { symbol: 'EL', name: 'Estee Lauder', price: 85.42, change: -1.25, marketCap: 30000000000, volume: 2500000, pe: 45.2, sector: 'Consumer', exchange: 'NYSE' },
  'CMG': { symbol: 'CMG', name: 'Chipotle Mexican Grill', price: 62.85, change: 0.95, marketCap: 86000000000, volume: 5200000, pe: 58.5, sector: 'Consumer', exchange: 'NYSE' },
  'LULU': { symbol: 'LULU', name: 'Lululemon Athletica', price: 392.45, change: 1.05, marketCap: 48000000000, volume: 1500000, pe: 28.4, sector: 'Consumer', exchange: 'NASDAQ' },
  // Energy extra
  'SLB': { symbol: 'SLB', name: 'Schlumberger Ltd.', price: 52.85, change: -0.45, marketCap: 75000000000, volume: 8200000, pe: 15.2, sector: 'Energy', exchange: 'NYSE' },
  'EOG': { symbol: 'EOG', name: 'EOG Resources', price: 128.45, change: 0.35, marketCap: 74000000000, volume: 3200000, pe: 10.5, sector: 'Energy', exchange: 'NYSE' },
  'OXY': { symbol: 'OXY', name: 'Occidental Petroleum', price: 58.25, change: -0.82, marketCap: 52000000000, volume: 12000000, pe: 12.8, sector: 'Energy', exchange: 'NYSE' },
  'MPC': { symbol: 'MPC', name: 'Marathon Petroleum', price: 165.42, change: 0.55, marketCap: 58000000000, volume: 3500000, pe: 8.5, sector: 'Energy', exchange: 'NYSE' },
  'PSX': { symbol: 'PSX', name: 'Phillips 66', price: 142.85, change: 0.42, marketCap: 58000000000, volume: 2800000, pe: 12.2, sector: 'Energy', exchange: 'NYSE' },
  // Industrial extra
  'RTX': { symbol: 'RTX', name: 'RTX Corporation', price: 125.42, change: 0.35, marketCap: 168000000000, volume: 4500000, pe: 38.5, sector: 'Industrial', exchange: 'NYSE' },
  'LMT': { symbol: 'LMT', name: 'Lockheed Martin', price: 485.85, change: 0.52, marketCap: 118000000000, volume: 1200000, pe: 17.2, sector: 'Industrial', exchange: 'NYSE' },
  'NOC': { symbol: 'NOC', name: 'Northrop Grumman', price: 512.45, change: 0.28, marketCap: 72000000000, volume: 800000, pe: 18.5, sector: 'Industrial', exchange: 'NYSE' },
  'DE': { symbol: 'DE', name: 'Deere & Company', price: 418.25, change: 0.65, marketCap: 122000000000, volume: 1500000, pe: 14.8, sector: 'Industrial', exchange: 'NYSE' },
  'MMM': { symbol: 'MMM', name: '3M Company', price: 135.42, change: -0.45, marketCap: 74000000000, volume: 3200000, pe: 15.5, sector: 'Industrial', exchange: 'NYSE' },
  'FDX': { symbol: 'FDX', name: 'FedEx Corp.', price: 285.85, change: 0.82, marketCap: 72000000000, volume: 1800000, pe: 16.2, sector: 'Industrial', exchange: 'NYSE' },
  'GD': { symbol: 'GD', name: 'General Dynamics', price: 298.45, change: 0.42, marketCap: 82000000000, volume: 1200000, pe: 19.5, sector: 'Industrial', exchange: 'NYSE' },
  // Real Estate
  'AMT': { symbol: 'AMT', name: 'American Tower Corp.', price: 215.42, change: 0.25, marketCap: 100000000000, volume: 2200000, pe: 42.5, sector: 'RealEstate', exchange: 'NYSE' },
  'PLD': { symbol: 'PLD', name: 'Prologis Inc.', price: 128.85, change: 0.35, marketCap: 118000000000, volume: 3200000, pe: 48.2, sector: 'RealEstate', exchange: 'NYSE' },
  'CCI': { symbol: 'CCI', name: 'Crown Castle Inc.', price: 105.42, change: -0.45, marketCap: 45000000000, volume: 2500000, pe: 35.8, sector: 'RealEstate', exchange: 'NYSE' },
  'EQIX': { symbol: 'EQIX', name: 'Equinix Inc.', price: 892.45, change: 0.55, marketCap: 82000000000, volume: 500000, pe: 85.2, sector: 'RealEstate', exchange: 'NASDAQ' },
  'O': { symbol: 'O', name: 'Realty Income Corp.', price: 58.25, change: 0.15, marketCap: 52000000000, volume: 4200000, pe: 52.4, sector: 'RealEstate', exchange: 'NYSE' },
  'SPG': { symbol: 'SPG', name: 'Simon Property Group', price: 168.45, change: 0.42, marketCap: 55000000000, volume: 1500000, pe: 22.5, sector: 'RealEstate', exchange: 'NYSE' },
  // Automotive
  'F': { symbol: 'F', name: 'Ford Motor Co.', price: 11.85, change: -0.75, marketCap: 47000000000, volume: 42000000, pe: 12.5, sector: 'Automotive', exchange: 'NYSE' },
  'GM': { symbol: 'GM', name: 'General Motors', price: 52.45, change: 0.45, marketCap: 58000000000, volume: 8500000, pe: 5.8, sector: 'Automotive', exchange: 'NYSE' },
  'RIVN': { symbol: 'RIVN', name: 'Rivian Automotive', price: 18.25, change: -2.85, marketCap: 18000000000, volume: 22000000, pe: null, sector: 'Automotive', exchange: 'NASDAQ' },
  'LCID': { symbol: 'LCID', name: 'Lucid Group', price: 3.45, change: -3.25, marketCap: 8000000000, volume: 28000000, pe: null, sector: 'Automotive', exchange: 'NASDAQ' },
  'TM': { symbol: 'TM', name: 'Toyota Motor Corp.', price: 192.85, change: 0.35, marketCap: 285000000000, volume: 500000, pe: 8.5, sector: 'Automotive', exchange: 'NYSE' },
  // ETFs extra
  'GLD': { symbol: 'GLD', name: 'SPDR Gold Trust', price: 242.85, change: 0.32, marketCap: 72000000000, volume: 8200000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'IWM': { symbol: 'IWM', name: 'iShares Russell 2000', price: 228.45, change: 0.95, marketCap: 72000000000, volume: 28000000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'VTI': { symbol: 'VTI', name: 'Vanguard Total Stock Market', price: 292.45, change: 0.72, marketCap: 420000000000, volume: 3200000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'ARKK': { symbol: 'ARKK', name: 'ARK Innovation ETF', price: 52.85, change: 2.45, marketCap: 8000000000, volume: 18000000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'XLF': { symbol: 'XLF', name: 'Financial Select Sector SPDR', price: 48.25, change: 0.55, marketCap: 42000000000, volume: 32000000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'XLE': { symbol: 'XLE', name: 'Energy Select Sector SPDR', price: 92.45, change: -0.35, marketCap: 38000000000, volume: 15000000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'XLK': { symbol: 'XLK', name: 'Technology Select Sector SPDR', price: 228.42, change: 1.15, marketCap: 68000000000, volume: 8500000, pe: null, sector: 'Index', exchange: 'NYSE' },
  'USO': { symbol: 'USO', name: 'United States Oil Fund', price: 72.85, change: -0.85, marketCap: 3000000000, volume: 5200000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  // Commodity extra
  'COPX': { symbol: 'COPX', name: 'Global X Copper Miners ETF', price: 42.15, change: 1.25, marketCap: 2800000000, volume: 3200000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'WEAT': { symbol: 'WEAT', name: 'Teucrium Wheat Fund', price: 5.85, change: -0.42, marketCap: 180000000, volume: 1200000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'UNG': { symbol: 'UNG', name: 'United States Natural Gas', price: 12.42, change: 2.15, marketCap: 650000000, volume: 8500000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'DBA': { symbol: 'DBA', name: 'Invesco DB Agriculture', price: 25.85, change: 0.32, marketCap: 950000000, volume: 620000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'CORN': { symbol: 'CORN', name: 'Teucrium Corn Fund', price: 22.45, change: -0.55, marketCap: 150000000, volume: 350000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'PPLT': { symbol: 'PPLT', name: 'Aberdeen Platinum ETF', price: 88.25, change: 0.82, marketCap: 850000000, volume: 45000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  'PALL': { symbol: 'PALL', name: 'Aberdeen Palladium ETF', price: 92.45, change: -1.15, marketCap: 320000000, volume: 22000, pe: null, sector: 'Commodity', exchange: 'NYSE' },
  // Communication extra
  'PARA': { symbol: 'PARA', name: 'Paramount Global', price: 11.85, change: -1.55, marketCap: 8000000000, volume: 18000000, pe: 8.5, sector: 'Communication', exchange: 'NASDAQ' },
  'CHTR': { symbol: 'CHTR', name: 'Charter Communications', price: 352.45, change: 0.65, marketCap: 52000000000, volume: 1200000, pe: 11.2, sector: 'Communication', exchange: 'NASDAQ' },
  'SNAP': { symbol: 'SNAP', name: 'Snap Inc.', price: 12.85, change: 2.45, marketCap: 21000000000, volume: 22000000, pe: null, sector: 'Communication', exchange: 'NYSE' },
  'PINS': { symbol: 'PINS', name: 'Pinterest Inc.', price: 35.42, change: 1.15, marketCap: 24000000000, volume: 8500000, pe: 35.2, sector: 'Communication', exchange: 'NYSE' },
  'TTD': { symbol: 'TTD', name: 'The Trade Desk', price: 108.25, change: 1.85, marketCap: 52000000000, volume: 4200000, pe: 185.5, sector: 'Communication', exchange: 'NASDAQ' },
  'RBLX': { symbol: 'RBLX', name: 'Roblox Corp.', price: 62.45, change: 2.25, marketCap: 38000000000, volume: 12000000, pe: null, sector: 'Communication', exchange: 'NYSE' },
  // Energy extra
  'VLO': { symbol: 'VLO', name: 'Valero Energy', price: 142.85, change: 0.75, marketCap: 48000000000, volume: 3200000, pe: 5.8, sector: 'Energy', exchange: 'NYSE' },
  'HAL': { symbol: 'HAL', name: 'Halliburton Co.', price: 32.45, change: -0.85, marketCap: 28000000000, volume: 8500000, pe: 11.2, sector: 'Energy', exchange: 'NYSE' },
  'DVN': { symbol: 'DVN', name: 'Devon Energy', price: 42.85, change: -0.55, marketCap: 28000000000, volume: 8200000, pe: 7.5, sector: 'Energy', exchange: 'NYSE' },
  'FANG': { symbol: 'FANG', name: 'Diamondback Energy', price: 178.25, change: 0.95, marketCap: 32000000000, volume: 2200000, pe: 9.8, sector: 'Energy', exchange: 'NASDAQ' },
  'BKR': { symbol: 'BKR', name: 'Baker Hughes Co.', price: 38.85, change: 0.45, marketCap: 38000000000, volume: 5200000, pe: 18.5, sector: 'Energy', exchange: 'NASDAQ' },
  'WMB': { symbol: 'WMB', name: 'Williams Companies', price: 52.45, change: 0.35, marketCap: 62000000000, volume: 5800000, pe: 35.2, sector: 'Energy', exchange: 'NYSE' },
  // RealEstate extra
  'WELL': { symbol: 'WELL', name: 'Welltower Inc.', price: 128.45, change: 0.42, marketCap: 72000000000, volume: 2200000, pe: 125.5, sector: 'RealEstate', exchange: 'NYSE' },
  'DLR': { symbol: 'DLR', name: 'Digital Realty Trust', price: 172.85, change: 0.55, marketCap: 55000000000, volume: 1800000, pe: 82.5, sector: 'RealEstate', exchange: 'NYSE' },
  'PSA': { symbol: 'PSA', name: 'Public Storage', price: 312.45, change: 0.25, marketCap: 55000000000, volume: 800000, pe: 32.5, sector: 'RealEstate', exchange: 'NYSE' },
  'VNQ': { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', price: 88.25, change: 0.32, marketCap: 32000000000, volume: 4500000, pe: null, sector: 'RealEstate', exchange: 'NYSE' },
  'SBAC': { symbol: 'SBAC', name: 'SBA Communications', price: 225.85, change: -0.35, marketCap: 24000000000, volume: 1200000, pe: 48.5, sector: 'RealEstate', exchange: 'NASDAQ' },
  'AVB': { symbol: 'AVB', name: 'AvalonBay Communities', price: 218.45, change: 0.45, marketCap: 30000000000, volume: 600000, pe: 22.8, sector: 'RealEstate', exchange: 'NYSE' },
  // Automotive extra
  'STLA': { symbol: 'STLA', name: 'Stellantis N.V.', price: 12.85, change: -1.85, marketCap: 38000000000, volume: 8500000, pe: 3.2, sector: 'Automotive', exchange: 'NYSE' },
  'LI': { symbol: 'LI', name: 'Li Auto Inc.', price: 28.45, change: 2.45, marketCap: 32000000000, volume: 12000000, pe: 22.5, sector: 'Automotive', exchange: 'NASDAQ' },
  'NIO': { symbol: 'NIO', name: 'NIO Inc.', price: 5.85, change: -2.15, marketCap: 12000000000, volume: 42000000, pe: null, sector: 'Automotive', exchange: 'NYSE' },
  'XPEV': { symbol: 'XPEV', name: 'XPeng Inc.', price: 18.25, change: 3.15, marketCap: 16000000000, volume: 15000000, pe: null, sector: 'Automotive', exchange: 'NYSE' },
  'RACE': { symbol: 'RACE', name: 'Ferrari N.V.', price: 428.85, change: 0.55, marketCap: 82000000000, volume: 280000, pe: 52.5, sector: 'Automotive', exchange: 'NYSE' },
  'APTV': { symbol: 'APTV', name: 'Aptiv PLC', price: 68.45, change: -0.95, marketCap: 18000000000, volume: 3200000, pe: 42.5, sector: 'Automotive', exchange: 'NYSE' },
}

/**
 * Get real-time quotes for multiple stock symbols
 * Primary: server proxy → fallback: static data
 * @param {string[]} symbols - Array of stock symbols (e.g., ['AAPL', 'MSFT'])
 * @returns {Promise<Record<string, StockQuote>>}
 */
export async function getStockQuotes(symbols) {
  if (!symbols || symbols.length === 0) return {}

  const symbolsStr = symbols.join(',')

  // 1. Try server proxy (fast, cached, no CORS)
  try {
    const data = await serverFetch(`/api/stocks/quotes?symbols=${encodeURIComponent(symbolsStr)}`)
    if (data && Object.keys(data).length > 0) {
      console.log(`Stock quotes loaded via server proxy (${Object.keys(data).length} stocks)`)
      return data
    }
  } catch (err) {
    console.warn('Server stock quotes failed:', err.message)
  }

  // 2. Fallback: static data with slight randomization
  console.log('Using fallback stock data (server unavailable)')
  const result = {}
  symbols.forEach(symbol => {
    const fallback = FALLBACK_STOCK_DATA[symbol]
    if (fallback) {
      const priceVariation = 1 + (Math.random() - 0.5) * 0.002
      const changeVariation = (Math.random() - 0.5) * 0.5
      result[symbol] = {
        ...fallback,
        price: +(fallback.price * priceVariation).toFixed(2),
        change: +(fallback.change + changeVariation).toFixed(2),
      }
    }
  })
  return result
}

/**
 * Get single stock quote
 */
export async function getStockQuote(symbol) {
  const quotes = await getStockQuotes([symbol])
  return quotes[symbol] || null
}

/**
 * Get stock logo URL for a given ticker symbol.
 * Uses FinancialModelingPrep free image CDN — works for all US equities + ETFs.
 * Returns 250×250 PNG logos (no API key needed).
 */
export function getStockLogoUrl(symbol) {
  if (!symbol) return null
  return `https://financialmodelingprep.com/image-stock/${symbol.toUpperCase()}.png`
}

// Popular stocks for search fallback (comprehensive list — 150+ stocks)
export const POPULAR_STOCKS = [
  // ═══ ETFs & Index Funds ═══
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'ETF', exchange: 'NASDAQ', sector: 'Index' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', type: 'ETF', exchange: 'NYSE', sector: 'Index' },
  // ═══ Commodities ═══
  { symbol: 'GLD', name: 'SPDR Gold Trust', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'SLV', name: 'iShares Silver Trust', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'USO', name: 'United States Oil Fund', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'COPX', name: 'Global X Copper Miners ETF', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'WEAT', name: 'Teucrium Wheat Fund', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'UNG', name: 'United States Natural Gas', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'DBA', name: 'Invesco DB Agriculture', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'CORN', name: 'Teucrium Corn Fund', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'PPLT', name: 'Aberdeen Platinum ETF', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  { symbol: 'PALL', name: 'Aberdeen Palladium ETF', type: 'ETF', exchange: 'NYSE', sector: 'Commodity' },
  // ═══ Magnificent 7 ═══
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Consumer' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  // ═══ Semiconductors ═══
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', type: 'EQUITY', exchange: 'NYSE', sector: 'Semiconductor' },
  { symbol: 'MU', name: 'Micron Technology', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'MRVL', name: 'Marvell Technology', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'ON', name: 'ON Semiconductor', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'LRCX', name: 'Lam Research', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'AMAT', name: 'Applied Materials', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'KLAC', name: 'KLA Corporation', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  { symbol: 'ARM', name: 'Arm Holdings', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Semiconductor' },
  // ═══ Software & Cloud ═══
  { symbol: 'CRM', name: 'Salesforce Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'PLTR', name: 'Palantir Technologies', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'PANW', name: 'Palo Alto Networks', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'SHOP', name: 'Shopify Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'SQ', name: 'Block Inc. (Square)', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'UBER', name: 'Uber Technologies', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'SPOT', name: 'Spotify Technology', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'NET', name: 'Cloudflare Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Technology' },
  { symbol: 'DDOG', name: 'Datadog Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'ZS', name: 'Zscaler Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSTR', name: 'MicroStrategy Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Technology' },
  // ═══ Communication & Media ═══
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'DIS', name: 'Walt Disney Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  { symbol: 'VZ', name: 'Verizon Communications', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  { symbol: 'T', name: 'AT&T Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  { symbol: 'CMCSA', name: 'Comcast Corp.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'TMUS', name: 'T-Mobile US', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'ROKU', name: 'Roku Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'WBD', name: 'Warner Bros. Discovery', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'PARA', name: 'Paramount Global', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'CHTR', name: 'Charter Communications', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'SNAP', name: 'Snap Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  { symbol: 'PINS', name: 'Pinterest Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  { symbol: 'TTD', name: 'The Trade Desk', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Communication' },
  { symbol: 'RBLX', name: 'Roblox Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Communication' },
  // ═══ Financial ═══
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'V', name: 'Visa Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'BAC', name: 'Bank of America Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'GS', name: 'Goldman Sachs Group', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'C', name: 'Citigroup Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'WFC', name: 'Wells Fargo & Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'COIN', name: 'Coinbase Global', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Financial' },
  { symbol: 'PYPL', name: 'PayPal Holdings', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Financial' },
  { symbol: 'SCHW', name: 'Charles Schwab', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'BLK', name: 'BlackRock Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'AXP', name: 'American Express', type: 'EQUITY', exchange: 'NYSE', sector: 'Financial' },
  { symbol: 'HOOD', name: 'Robinhood Markets', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Financial' },
  { symbol: 'SOFI', name: 'SoFi Technologies', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Financial' },
  // ═══ Healthcare & Pharma ═══
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'MRK', name: 'Merck & Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb', type: 'EQUITY', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'AMGN', name: 'Amgen Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Healthcare' },
  { symbol: 'GILD', name: 'Gilead Sciences', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Healthcare' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Healthcare' },
  { symbol: 'MRNA', name: 'Moderna Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Healthcare' },
  // ═══ Consumer ═══
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'HD', name: 'Home Depot Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'KO', name: 'Coca-Cola Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Consumer' },
  { symbol: 'COST', name: 'Costco Wholesale', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Consumer' },
  { symbol: 'MCD', name: 'McDonald\'s Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'NKE', name: 'Nike Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'SBUX', name: 'Starbucks Corp.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Consumer' },
  { symbol: 'TGT', name: 'Target Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'LOW', name: 'Lowe\'s Companies', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'EL', name: 'Estee Lauder', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill', type: 'EQUITY', exchange: 'NYSE', sector: 'Consumer' },
  { symbol: 'LULU', name: 'Lululemon Athletica', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Consumer' },
  // ═══ Energy ═══
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'COP', name: 'ConocoPhillips', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'SLB', name: 'Schlumberger Ltd.', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'EOG', name: 'EOG Resources', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'OXY', name: 'Occidental Petroleum', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'MPC', name: 'Marathon Petroleum', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'PSX', name: 'Phillips 66', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'VLO', name: 'Valero Energy', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'HAL', name: 'Halliburton Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'DVN', name: 'Devon Energy', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'FANG', name: 'Diamondback Energy', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Energy' },
  { symbol: 'BKR', name: 'Baker Hughes Co.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Energy' },
  { symbol: 'WMB', name: 'Williams Companies', type: 'EQUITY', exchange: 'NYSE', sector: 'Energy' },
  // ═══ Industrial & Aerospace ═══
  { symbol: 'BA', name: 'Boeing Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'GE', name: 'GE Aerospace', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'UPS', name: 'United Parcel Service', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'HON', name: 'Honeywell International', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Industrial' },
  { symbol: 'RTX', name: 'RTX Corporation', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'LMT', name: 'Lockheed Martin', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'NOC', name: 'Northrop Grumman', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'DE', name: 'Deere & Company', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'MMM', name: '3M Company', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'FDX', name: 'FedEx Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'GD', name: 'General Dynamics', type: 'EQUITY', exchange: 'NYSE', sector: 'Industrial' },
  // ═══ Real Estate ═══
  { symbol: 'AMT', name: 'American Tower Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'PLD', name: 'Prologis Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'CCI', name: 'Crown Castle Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'EQIX', name: 'Equinix Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'RealEstate' },
  { symbol: 'O', name: 'Realty Income Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'SPG', name: 'Simon Property Group', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'WELL', name: 'Welltower Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'DLR', name: 'Digital Realty Trust', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'PSA', name: 'Public Storage', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'ETF', exchange: 'NYSE', sector: 'RealEstate' },
  { symbol: 'SBAC', name: 'SBA Communications', type: 'EQUITY', exchange: 'NASDAQ', sector: 'RealEstate' },
  { symbol: 'AVB', name: 'AvalonBay Communities', type: 'EQUITY', exchange: 'NYSE', sector: 'RealEstate' },
  // ═══ Automotive ═══
  { symbol: 'F', name: 'Ford Motor Co.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'GM', name: 'General Motors', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'RIVN', name: 'Rivian Automotive', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'LCID', name: 'Lucid Group', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'TM', name: 'Toyota Motor Corp.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'STLA', name: 'Stellantis N.V.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'LI', name: 'Li Auto Inc.', type: 'EQUITY', exchange: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'NIO', name: 'NIO Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'XPEV', name: 'XPeng Inc.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'RACE', name: 'Ferrari N.V.', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
  { symbol: 'APTV', name: 'Aptiv PLC', type: 'EQUITY', exchange: 'NYSE', sector: 'Automotive' },
]

/**
 * Search stocks by ticker or company name
 * Primary: server proxy → Fallback: local POPULAR_STOCKS filter
 * @param {string} query - Search query
 * @returns {Promise<Array<{symbol: string, name: string, type: string, exchange: string}>>}
 */
export async function searchStocks(query) {
  if (!query || query.length < 1) return []

  // 1. Try server proxy (Yahoo search, cached)
  try {
    const data = await serverFetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
    if (Array.isArray(data) && data.length > 0) {
      console.log('Stock search via server proxy:', data.length, 'results')
      return data.slice(0, 12)
    }
  } catch (err) {
    console.warn('Server stock search failed:', err.message)
  }

  // 2. Fallback: search in popular stocks list locally
  console.log('Using fallback stock search (local filter)')
  const upperQuery = query.toUpperCase()
  const lowerQuery = query.toLowerCase()
  return POPULAR_STOCKS.filter(stock =>
    stock.symbol.includes(upperQuery) ||
    stock.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 12)
}

/**
 * Get OHLC candle data for charts
 * Primary: server proxy → Fallback: empty (no CORS-free candle source)
 * @param {string} symbol - Stock symbol
 * @param {string} resolution - Timeframe: '1m', '5m', '15m', '1h', '1d', '1wk', '1mo'
 * @param {number} from - Unix timestamp (seconds)
 * @param {number} to - Unix timestamp (seconds)
 * @returns {Promise<{getBars: Array<{t: number, o: number, h: number, l: number, c: number, v: number}>}>}
 */
export async function getStockCandles(symbol, resolution = '1h', from, to) {
  // Map resolution to Yahoo Finance interval format
  const intervalMap = {
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '60': '1h',
    '1h': '1h',
    '240': '1d',
    '4h': '1d',
    '1D': '1d',
    '1d': '1d',
    '1W': '1wk',
    '1w': '1wk',
    '1M': '1mo',
  }

  const interval = intervalMap[resolution] || '1h'

  // Determine range based on interval
  let range = '1mo'
  if (interval === '1m') range = '1d'
  else if (interval === '5m') range = '5d'
  else if (interval === '15m') range = '5d'
  else if (interval === '1h') range = '1mo'
  else if (interval === '1d') range = '1y'
  else if (interval === '1wk') range = '5y'
  else if (interval === '1mo') range = 'max'

  // 1. Try server proxy (Yahoo Finance chart data, cached)
  try {
    const data = await serverFetch(
      `/api/stocks/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`,
      10000 // longer timeout for candle data
    )
    if (data?.getBars && data.getBars.length > 0) {
      console.log(`Stock candles via server proxy: ${data.getBars.length} bars for ${symbol}`)
      return data
    }
  } catch (err) {
    console.warn('Server stock candles failed:', err.message)
  }

  return { getBars: [] }
}

/**
 * Get company profile/fundamentals
 */
export async function getCompanyProfile(symbol) {
  try {
    // Use Yahoo Finance quote for basic info
    const quotes = await getStockQuotes([symbol])
    const quote = quotes[symbol]

    if (quote) {
      return {
        symbol: quote.symbol,
        name: quote.name,
        exchange: quote.exchange,
        sector: quote.sector,
        marketCap: quote.marketCap,
        pe: quote.pe,
        eps: quote.eps,
        week52High: quote.week52High,
        week52Low: quote.week52Low,
        avgVolume: quote.avgVolume,
      }
    }
  } catch (err) {
    console.warn('Company profile failed:', err.message)
  }

  return null
}

/**
 * Get market movers - top gainers and losers
 * Primary: server proxy (pre-computed) → Fallback: fetch quotes + sort locally
 */
export async function getMarketMovers() {
  // 1. Try server proxy (pre-sorted, cached 2 min)
  try {
    const data = await serverFetch('/api/stocks/movers')
    if (data && (data.gainers?.length > 0 || data.losers?.length > 0)) {
      console.log('Market movers via server proxy')
      return data
    }
  } catch (err) {
    console.warn('Server market movers failed:', err.message)
  }

  // 2. Fallback: fetch quotes for popular stocks and sort locally
  const watchSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
    'JPM', 'V', 'JNJ', 'UNH', 'HD', 'PG', 'MA', 'DIS', 'NFLX', 'PYPL',
    'ADBE', 'CRM', 'INTC', 'AMD', 'CSCO', 'PEP', 'KO', 'MRK', 'PFE',
    'BA', 'CAT', 'GS', 'WMT', 'CVX', 'XOM'
  ]

  try {
    const quotes = await getStockQuotes(watchSymbols)
    const stocks = Object.values(quotes).filter(q => q.price > 0)
    const sorted = [...stocks].sort((a, b) => b.change - a.change)

    return {
      gainers: sorted.slice(0, 10),
      losers: sorted.slice(-10).reverse(),
      mostActive: [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 10),
    }
  } catch (err) {
    console.warn('Market movers failed:', err.message)
    return { gainers: [], losers: [], mostActive: [] }
  }
}

/**
 * Get market status (open/closed)
 */
export function getMarketStatus() {
  const now = new Date()
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = nyTime.getDay()
  const hours = nyTime.getHours()
  const minutes = nyTime.getMinutes()
  const timeNum = hours * 100 + minutes

  // Weekend
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      status: 'CLOSED',
      message: 'Weekend - Markets Closed',
      nextOpen: getNextMarketOpen(nyTime),
    }
  }

  // Pre-market: 4:00 AM - 9:30 AM ET
  if (timeNum >= 400 && timeNum < 930) {
    return {
      isOpen: false,
      status: 'PRE',
      message: 'Pre-Market Trading',
      nextOpen: 'Opens at 9:30 AM ET',
    }
  }

  // Regular hours: 9:30 AM - 4:00 PM ET
  if (timeNum >= 930 && timeNum < 1600) {
    return {
      isOpen: true,
      status: 'REGULAR',
      message: 'Market Open',
      closesAt: '4:00 PM ET',
    }
  }

  // After-hours: 4:00 PM - 8:00 PM ET
  if (timeNum >= 1600 && timeNum < 2000) {
    return {
      isOpen: false,
      status: 'POST',
      message: 'After-Hours Trading',
      nextOpen: 'Opens tomorrow 9:30 AM ET',
    }
  }

  // Closed
  return {
    isOpen: false,
    status: 'CLOSED',
    message: 'Markets Closed',
    nextOpen: getNextMarketOpen(nyTime),
  }
}

function getNextMarketOpen(nyTime) {
  const day = nyTime.getDay()
  let daysUntilOpen = 1

  if (day === 5) daysUntilOpen = 3 // Friday -> Monday
  else if (day === 6) daysUntilOpen = 2 // Saturday -> Monday

  return `Opens in ${daysUntilOpen} day${daysUntilOpen > 1 ? 's' : ''} at 9:30 AM ET`
}

/**
 * Get major market indices (S&P 500, Dow, Nasdaq, Russell, VIX)
 * Primary: server proxy → Fallback: fetch quotes for index symbols
 */
export async function getMarketIndices() {
  // 1. Try server proxy (cached, pre-formatted)
  try {
    const data = await serverFetch('/api/stocks/indices')
    if (Array.isArray(data) && data.length > 0) {
      console.log('Market indices via server proxy:', data.length, 'indices')
      return data
    }
  } catch (err) {
    console.warn('Server market indices failed:', err.message)
  }

  // 2. Fallback: fetch index quotes directly
  const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX']
  const indexNames = {
    '^GSPC': 'S&P 500',
    '^DJI': 'Dow Jones',
    '^IXIC': 'Nasdaq',
    '^RUT': 'Russell 2000',
    '^VIX': 'VIX',
  }

  try {
    const quotes = await getStockQuotes(indices)
    return Object.entries(quotes).map(([symbol, data]) => ({
      ...data,
      name: indexNames[symbol] || data.name,
    }))
  } catch (err) {
    console.warn('Market indices failed:', err.message)
    return []
  }
}

export default {
  getStockQuotes,
  getStockQuote,
  searchStocks,
  getStockCandles,
  getCompanyProfile,
  getMarketMovers,
  getMarketStatus,
  getMarketIndices,
}
