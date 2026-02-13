const normalizePath = (path = '/') => {
  const cleaned = (path || '/').replace(/\/+$/, '')
  return cleaned || '/'
}

export const PAGE_PATHS = {
  'research-platform': '/',
  discover: '/discover',
  'research-zone': '/research-zone',
  'search-engine': '/search-engine',
  'ai-screener': '/token',
  watchlists: '/watchlists',
  glossary: '/glossary',
  'fear-greed': '/fear-greed',
  'social-zone': '/social-zone',
  'ai-media-center': '/ai-media-center',
  'x-dash': '/x-dash',
  'x-bubbles': '/x-bubbles',
  'ai-charts': '/ai-charts',
  'ai-charts-lab': '/ai-charts-lab',
  heatmaps: '/heatmaps',
  bubbles: '/bubbles',
  categories: '/categories',
  'ai-market-analysis': '/ai-market-analysis',
  'market-analytics': '/market-analytics',
  'user-dashboard': '/user-dashboard',
  'structure-guide': '/structure-guide',
  logs: '/logs',
  'roi-calculator': '/roi-calculator',
  'gm-dashboard': '/gm-dashboard',
}

const PAGE_ID_BY_PATH = Object.entries(PAGE_PATHS).reduce((acc, [pageId, path]) => {
  acc[normalizePath(path)] = pageId
  return acc
}, {})

export const getPathForPageId = (pageId) => PAGE_PATHS[pageId] || PAGE_PATHS['research-platform']

export const getPageIdFromPath = (path) => PAGE_ID_BY_PATH[normalizePath(path)] || null

export const isTokenPath = (path) => normalizePath(path) === PAGE_PATHS['ai-screener']
