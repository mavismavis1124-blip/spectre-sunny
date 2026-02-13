/**
 * Stock Market Constants
 * Default stocks, sectors, and logos for stock mode
 */

// Top stocks to show by default (equivalent to TOP_COINS) - 25 most watched
export const TOP_STOCKS = [
  // Major ETFs / Indices
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'Index', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', sector: 'Index', exchange: 'NASDAQ' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', sector: 'Index', exchange: 'NYSE' },
  { symbol: 'GLD', name: 'SPDR Gold Trust', sector: 'Commodity', exchange: 'NYSE' },
  // Magnificent 7
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', exchange: 'NASDAQ' },
  // Tech
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', exchange: 'NYSE' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', exchange: 'NASDAQ' },
  { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', exchange: 'NYSE' },
  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial', exchange: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financial', exchange: 'NYSE' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financial', exchange: 'NYSE' },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Financial', exchange: 'NASDAQ' },
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Financial', exchange: 'NASDAQ' },
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', exchange: 'NYSE' },
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', exchange: 'NYSE' },
  { symbol: 'HD', name: 'Home Depot', sector: 'Consumer', exchange: 'NYSE' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Communication', exchange: 'NYSE' },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer', exchange: 'NYSE' },
]

// Welcome widget stocks (like BTC, ETH, SOL for crypto) - top 3 most watched
export const WELCOME_STOCKS = ['SPY', 'AAPL', 'NVDA']

// Stock sectors (equivalent to crypto categories)
export const STOCK_SECTORS = [
  { id: 'all', label: 'All Sectors' },
  { id: 'index', label: 'Index/ETF' },
  { id: 'technology', label: 'Technology' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'financial', label: 'Financial' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'energy', label: 'Energy' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'communication', label: 'Communication' },
  { id: 'commodity', label: 'Commodity' },
  { id: 'materials', label: 'Materials' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'realestate', label: 'Real Estate' },
]

// Stock logos using Clearbit (free service)
export const STOCK_LOGOS = {
  // Indices / ETFs
  'SPY': 'https://logo.clearbit.com/ssga.com',
  'QQQ': 'https://logo.clearbit.com/invesco.com',
  'IWM': 'https://logo.clearbit.com/ishares.com',
  'DIA': 'https://logo.clearbit.com/ssga.com',
  'VOO': 'https://logo.clearbit.com/vanguard.com',
  'VTI': 'https://logo.clearbit.com/vanguard.com',
  'GLD': 'https://logo.clearbit.com/ssga.com',
  'SLV': 'https://logo.clearbit.com/ishares.com',

  // Technology
  'AAPL': 'https://logo.clearbit.com/apple.com',
  'MSFT': 'https://logo.clearbit.com/microsoft.com',
  'GOOGL': 'https://logo.clearbit.com/google.com',
  'GOOG': 'https://logo.clearbit.com/google.com',
  'AMZN': 'https://logo.clearbit.com/amazon.com',
  'NVDA': 'https://logo.clearbit.com/nvidia.com',
  'META': 'https://logo.clearbit.com/meta.com',
  'TSLA': 'https://logo.clearbit.com/tesla.com',
  'NFLX': 'https://logo.clearbit.com/netflix.com',
  'ADBE': 'https://logo.clearbit.com/adobe.com',
  'CRM': 'https://logo.clearbit.com/salesforce.com',
  'ORCL': 'https://logo.clearbit.com/oracle.com',
  'INTC': 'https://logo.clearbit.com/intel.com',
  'AMD': 'https://logo.clearbit.com/amd.com',
  'CSCO': 'https://logo.clearbit.com/cisco.com',
  'IBM': 'https://logo.clearbit.com/ibm.com',
  'PYPL': 'https://logo.clearbit.com/paypal.com',
  'SQ': 'https://logo.clearbit.com/squareup.com',
  'SHOP': 'https://logo.clearbit.com/shopify.com',
  'UBER': 'https://logo.clearbit.com/uber.com',
  'LYFT': 'https://logo.clearbit.com/lyft.com',
  'SNAP': 'https://logo.clearbit.com/snap.com',
  'TWTR': 'https://logo.clearbit.com/twitter.com',
  'SPOT': 'https://logo.clearbit.com/spotify.com',
  'ZM': 'https://logo.clearbit.com/zoom.us',
  'DOCU': 'https://logo.clearbit.com/docusign.com',
  'NOW': 'https://logo.clearbit.com/servicenow.com',
  'SNOW': 'https://logo.clearbit.com/snowflake.com',
  'PLTR': 'https://logo.clearbit.com/palantir.com',
  'COIN': 'https://logo.clearbit.com/coinbase.com',
  'HOOD': 'https://logo.clearbit.com/robinhood.com',

  // Financial
  'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
  'BAC': 'https://logo.clearbit.com/bankofamerica.com',
  'WFC': 'https://logo.clearbit.com/wellsfargo.com',
  'C': 'https://logo.clearbit.com/citi.com',
  'GS': 'https://logo.clearbit.com/goldmansachs.com',
  'MS': 'https://logo.clearbit.com/morganstanley.com',
  'V': 'https://logo.clearbit.com/visa.com',
  'MA': 'https://logo.clearbit.com/mastercard.com',
  'AXP': 'https://logo.clearbit.com/americanexpress.com',
  'BLK': 'https://logo.clearbit.com/blackrock.com',
  'SCHW': 'https://logo.clearbit.com/schwab.com',

  // Healthcare
  'JNJ': 'https://logo.clearbit.com/jnj.com',
  'UNH': 'https://logo.clearbit.com/unitedhealthgroup.com',
  'PFE': 'https://logo.clearbit.com/pfizer.com',
  'MRK': 'https://logo.clearbit.com/merck.com',
  'ABBV': 'https://logo.clearbit.com/abbvie.com',
  'LLY': 'https://logo.clearbit.com/lilly.com',
  'TMO': 'https://logo.clearbit.com/thermofisher.com',
  'ABT': 'https://logo.clearbit.com/abbott.com',
  'DHR': 'https://logo.clearbit.com/danaher.com',
  'BMY': 'https://logo.clearbit.com/bms.com',
  'MRNA': 'https://logo.clearbit.com/modernatx.com',

  // Consumer
  'WMT': 'https://logo.clearbit.com/walmart.com',
  'HD': 'https://logo.clearbit.com/homedepot.com',
  'PG': 'https://logo.clearbit.com/pg.com',
  'KO': 'https://logo.clearbit.com/coca-cola.com',
  'PEP': 'https://logo.clearbit.com/pepsico.com',
  'COST': 'https://logo.clearbit.com/costco.com',
  'DIS': 'https://logo.clearbit.com/disney.com',
  'NKE': 'https://logo.clearbit.com/nike.com',
  'MCD': 'https://logo.clearbit.com/mcdonalds.com',
  'SBUX': 'https://logo.clearbit.com/starbucks.com',
  'TGT': 'https://logo.clearbit.com/target.com',
  'LOW': 'https://logo.clearbit.com/lowes.com',

  // Industrial
  'BA': 'https://logo.clearbit.com/boeing.com',
  'CAT': 'https://logo.clearbit.com/caterpillar.com',
  'GE': 'https://logo.clearbit.com/ge.com',
  'MMM': 'https://logo.clearbit.com/3m.com',
  'HON': 'https://logo.clearbit.com/honeywell.com',
  'UPS': 'https://logo.clearbit.com/ups.com',
  'FDX': 'https://logo.clearbit.com/fedex.com',
  'LMT': 'https://logo.clearbit.com/lockheedmartin.com',
  'RTX': 'https://logo.clearbit.com/rtx.com',
  'DE': 'https://logo.clearbit.com/deere.com',

  // Energy
  'XOM': 'https://logo.clearbit.com/exxonmobil.com',
  'CVX': 'https://logo.clearbit.com/chevron.com',
  'COP': 'https://logo.clearbit.com/conocophillips.com',
  'SLB': 'https://logo.clearbit.com/slb.com',
  'EOG': 'https://logo.clearbit.com/eogresources.com',

  // Communication
  'T': 'https://logo.clearbit.com/att.com',
  'VZ': 'https://logo.clearbit.com/verizon.com',
  'TMUS': 'https://logo.clearbit.com/t-mobile.com',
  'CMCSA': 'https://logo.clearbit.com/comcast.com',
  'CHTR': 'https://logo.clearbit.com/charter.com',
}

// Sector colors for fallback logo generation
const SECTOR_COLORS = {
  'Technology': '#8B5CF6',
  'Financial': '#10B981',
  'Healthcare': '#EC4899',
  'Consumer': '#F59E0B',
  'Industrial': '#6366F1',
  'Energy': '#EF4444',
  'Materials': '#14B8A6',
  'Utilities': '#06B6D4',
  'Real Estate': '#84CC16',
  'Communication': '#3B82F6',
  'Index': '#6366F1',
  'default': '#8B5CF6',
}

// Get stock logo - uses FinancialModelingPrep CDN (free, no API key, 250x250 PNG)
// Clearbit logos are DEAD - always use FMP as primary source
export function getStockLogo(symbol, sector = null) {
  if (!symbol) return null
  const upper = symbol.toUpperCase()

  // Primary: FMP stock logo CDN (works for all US equities + ETFs)
  return `https://financialmodelingprep.com/image-stock/${upper}.png`
}

// Stock descriptions (like COIN_DESCRIPTIONS for crypto)
export const STOCK_DESCRIPTIONS = {
  'SPY': 'SPDR S&P 500 ETF Trust — Tracks the S&P 500 index, representing 500 of the largest U.S. companies. One of the most liquid ETFs in the world.',
  'QQQ': 'Invesco QQQ Trust — Tracks the Nasdaq-100 Index, heavily weighted towards large-cap technology companies including Apple, Microsoft, and Amazon.',
  'AAPL': 'Apple Inc. — World\'s largest company by market cap. Designs, manufactures, and markets consumer electronics, software, and services including iPhone, iPad, Mac, and Apple Watch.',
  'MSFT': 'Microsoft Corporation — Global technology leader in software, cloud computing (Azure), and productivity solutions. Creator of Windows, Office 365, and Xbox.',
  'GOOGL': 'Alphabet Inc. — Parent company of Google. Dominates internet search, digital advertising, and owns YouTube, Android, and Google Cloud Platform.',
  'AMZN': 'Amazon.com Inc. — World\'s largest e-commerce company and leading cloud computing provider (AWS). Also operates in digital streaming, AI, and logistics.',
  'NVDA': 'NVIDIA Corporation — Leading designer of graphics processing units (GPUs). Dominates AI chip market and gaming graphics. Key supplier for data centers.',
  'TSLA': 'Tesla Inc. — Electric vehicle manufacturer and clean energy company. Led by Elon Musk. Also produces energy storage systems and solar panels.',
  'META': 'Meta Platforms Inc. — Social media giant operating Facebook, Instagram, WhatsApp, and Messenger. Investing heavily in metaverse and VR/AR technology.',
  'JPM': 'JPMorgan Chase & Co. — Largest U.S. bank by assets. Provides investment banking, financial services, asset management, and commercial banking.',
  'V': 'Visa Inc. — Global payments technology company. Operates the world\'s largest retail electronic payments network connecting consumers, businesses, and banks.',
  'JNJ': 'Johnson & Johnson — Diversified healthcare conglomerate. Develops medical devices, pharmaceuticals, and consumer packaged goods.',
}

// Common stock indices
export const MARKET_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500', shortName: 'SPX' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', shortName: 'DOW' },
  { symbol: '^IXIC', name: 'Nasdaq Composite', shortName: 'NASDAQ' },
  { symbol: '^RUT', name: 'Russell 2000', shortName: 'RUT' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', shortName: 'VIX' },
]

export default {
  TOP_STOCKS,
  WELCOME_STOCKS,
  STOCK_SECTORS,
  STOCK_LOGOS,
  STOCK_DESCRIPTIONS,
  MARKET_INDICES,
  getStockLogo,
}
