/**
 * Vercel Serverless Function - Codex API Proxy
 * Handles all token data requests
 */

// API Keys from environment variables (set in Vercel dashboard)
const CODEX_API_KEY = process.env.CODEX_API_KEY;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const CODEX_BASE_URL = 'https://graph.codex.io/graphql';
const COINGECKO_BASE_URL = COINGECKO_API_KEY
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';

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
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`;
    const opts = { headers: {} };
    if (COINGECKO_API_KEY) opts.headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data[id];
    if (!p || p.usd == null) return null;
    return {
      price: parseFloat(p.usd) || 0,
      change: parseFloat(p.usd_24h_change) || 0,
      change24: parseFloat(p.usd_24h_change) || 0,
    };
  } catch (e) {
    console.error(`CoinGecko fallback for ${symbol}:`, e.message);
    return null;
  }
}

// All supported Codex networks
const CODEX_NETWORKS = {
  1399811149: 'Solana',
  1: 'Ethereum',
  56: 'BNB Chain',
  137: 'Polygon',
  42161: 'Arbitrum',
  8453: 'Base',
  43114: 'Avalanche',
  10: 'Optimism',
  250: 'Fantom',
};

const ALL_NETWORK_IDS = Object.keys(CODEX_NETWORKS).map(n => parseInt(n));

// Popular Solana tokens - fetch directly by address for reliable results
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
  'sol': { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Wrapped SOL' },
};

async function executeCodexQuery(query, variables = {}) {
  const response = await fetch(CODEX_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': CODEX_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }

  return data.data;
}

/**
 * Smart quality scoring function - ranks tokens by legitimacy
 * Filters out scams, honeypots, and dead tokens
 */
function calculateQualityScore(result, searchTerm = '') {
  let score = 0;
  
  const mcap = parseFloat(result.marketCap) || 0;
  const liq = parseFloat(result.liquidity) || 0;
  const volume = parseFloat(result.volume24 || result.volume) || 0;
  const holders = parseInt(result.holders) || 0;
  const price = parseFloat(result.priceUSD) || 0;
  const symbol = (result.token?.symbol || '').toLowerCase();
  const name = (result.token?.name || '').toLowerCase();
  const search = (searchTerm || '').toLowerCase();
  
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
  const nameLower = (result.token?.name || '').toLowerCase();
  const symbolLower = (result.token?.symbol || '').toLowerCase();
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
}

/**
 * Calculate match tier for sorting - exact matches first
 */
function getMatchTier(result, searchTerm) {
  const symbol = (result.token?.symbol || '').toLowerCase();
  const name = (result.token?.name || '').toLowerCase();
  const symbolNoSpaces = symbol.replace(/\s+/g, '');
  const nameNoSpaces = name.replace(/\s+/g, '');
  const searchLower = (searchTerm || '').toLowerCase().trim();
  const searchNoSpaces = searchLower.replace(/\s+/g, '');
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
}

// Handler for token details
async function handleTokenDetails(address, networkId) {
  const netId = parseInt(networkId) || 1;
  const isSolanaNetwork = netId === 1399811149;
  const queryAddress = isSolanaNetwork ? address : address.toLowerCase();
  
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
        }
      }
    }
  `;
  
  const [tokenData, marketData] = await Promise.all([
    executeCodexQuery(tokenQuery, { address: queryAddress, networkId: netId }),
    executeCodexQuery(marketQuery, { networkFilter: [netId], phrase: queryAddress }),
  ]);
  
  const token = tokenData?.token;
  const market = marketData?.filterTokens?.results?.[0];
  
  if (!token) {
    return null;
  }
  
  return {
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    networkId: token.networkId,
    logo: token.info?.imageLargeUrl || token.info?.imageThumbUrl,
    description: token.info?.description || '',
    circulatingSupply: token.info?.circulatingSupply,
    totalSupply: token.info?.totalSupply,
    socials: {
      twitter: token.socialLinks?.twitter,
      discord: token.socialLinks?.discord,
      telegram: token.socialLinks?.telegram,
      website: token.socialLinks?.website,
    },
    price: parseFloat(market?.priceUSD) || 0,
    volume24: parseFloat(market?.volume24) || 0,
    liquidity: parseFloat(market?.liquidity) || 0,
    marketCap: parseFloat(market?.marketCap) || 0,
    change24: parseFloat(market?.change24) || 0,
    change1h: parseFloat(market?.change1) || 0,
    change4h: parseFloat(market?.change4) || 0,
    change12h: parseFloat(market?.change12) || 0,
    holders: parseInt(market?.holders) || 0,
  };
}

// Fetch a specific Solana token by address
async function fetchSolanaToken(tokenInfo) {
  const SOLANA_NETWORK_ID = 1399811149;
  
  const query = `
    query GetSolanaToken($phrase: String!, $networkFilter: [Int!]) {
      filterTokens(
        filters: { network: $networkFilter }
        phrase: $phrase
        limit: 1
        rankings: { attribute: liquidity, direction: DESC }
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
  
  try {
    const data = await executeCodexQuery(query, {
      phrase: tokenInfo.address,
      networkFilter: [SOLANA_NETWORK_ID],
    });
    
    const result = data?.filterTokens?.results?.[0];
    if (result) {
      return {
        ...result,
        qualityScore: 1000, // Boost popular tokens
        token: {
          ...result.token,
          networkName: 'Solana',
        },
      };
    }
  } catch (e) {
    console.error('Error fetching Solana token:', e);
  }
  return null;
}

// Handler for token search - comprehensive across all networks
async function handleTokenSearch(searchQuery, networkIds) {
  const isEVMAddress = searchQuery.startsWith('0x') && searchQuery.length === 42;
  const isSolanaAddress = searchQuery.length >= 32 && searchQuery.length <= 44 && !searchQuery.startsWith('0x');
  const isContractAddress = isEVMAddress || isSolanaAddress;
  
  const queryLower = searchQuery.toLowerCase().replace(/^\$/, '');
  const SOLANA_NETWORK_ID = 1399811149;
  const EVM_NETWORKS = [1, 56, 137, 42161, 8453, 43114, 10, 250];
  
  const searchQueryGQL = `
    query SearchTokens($phrase: String!, $networkFilter: [Int!], $limit: Int) {
      filterTokens(
        filters: { network: $networkFilter }
        phrase: $phrase
        limit: $limit
        rankings: { attribute: liquidity, direction: DESC }
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
  
  // Run parallel searches: EVM networks + Solana separately for better coverage
  const [evmData, solanaData] = await Promise.all([
    executeCodexQuery(searchQueryGQL, {
      phrase: searchQuery,
      networkFilter: networkIds || EVM_NETWORKS,
      limit: 30,
    }),
    executeCodexQuery(searchQueryGQL, {
      phrase: searchQuery,
      networkFilter: [SOLANA_NETWORK_ID],
      limit: 20,
    }),
  ]);
  
  // Combine results
  let allResults = [
    ...(evmData?.filterTokens?.results || []),
    ...(solanaData?.filterTokens?.results || []),
  ];
  
  // Check if searching for a popular Solana token that might not appear in search
  const popularSolanaToken = POPULAR_SOLANA_TOKENS[queryLower];
  if (popularSolanaToken) {
    console.log(`Also checking popular Solana token: ${popularSolanaToken.symbol}`);
    const popularResult = await fetchSolanaToken(popularSolanaToken);
    if (popularResult) {
      // Add to results if not already there
      const exists = allResults.some(r => 
        r.token?.address?.toLowerCase() === popularResult.token?.address?.toLowerCase()
      );
      if (!exists) {
        allResults.push(popularResult);
      }
    }
  }
  
  // Deduplicate by address (case-insensitive for EVM, case-sensitive for Solana)
  const seen = new Map();
  allResults = allResults.filter(r => {
    const addr = r.token?.address;
    if (!addr) return false;
    const isSolana = r.token?.networkId === SOLANA_NETWORK_ID;
    const key = isSolana ? addr : addr.toLowerCase();
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
  
  // Score results
  let results = allResults
    .map(r => ({
      ...r,
      volume: r.volume24 || 0,
      // Keep hardcoded score for popular tokens (score >= 200), otherwise calculate
      qualityScore: (r.qualityScore && r.qualityScore >= 200) ? r.qualityScore : calculateQualityScore(r, searchQuery),
      token: {
        ...r.token,
        networkName: CODEX_NETWORKS[r.token?.networkId] || 'Unknown',
      },
    }))
    // Filter out obvious scams (very negative score only)
    .filter(r => r.qualityScore > -100);
  
  console.log(`Search "${searchQuery}": API returned ${allResults.length}, after filter: ${results.length}`);
  
  // Sort results: EXACT MATCHES FIRST, then starts-with, then contains
  results.sort((a, b) => {
    const aTier = getMatchTier(a, searchQuery);
    const bTier = getMatchTier(b, searchQuery);
    
    // Different tiers: lower tier wins (exact match = tier 1)
    if (aTier !== bTier) {
      return aTier - bTier;
    }
    
    // Same tier: sort by quality score (liquidity/volume)
    return (b.qualityScore || 0) - (a.qualityScore || 0);
  });
  
  console.log(`Search "${searchQuery}" top results:`, results.slice(0, 3).map(r => 
    `${r.token?.symbol}(tier:${getMatchTier(r, searchQuery)},liq:${r.liquidity})`
  ).join(', '));
  
  return { results: results.slice(0, 15) };
}

// Handler for trending tokens
async function handleTrendingTokens(networkIds) {
  const searchNetworks = networkIds || [1, 56, 137, 42161, 8453];
  
  const query = `
    query GetTrending($networkFilter: [Int!], $limit: Int) {
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
          priceUSD
          volume24
          liquidity
          marketCap
          change24
        }
      }
    }
  `;
  
  const data = await executeCodexQuery(query, {
    networkFilter: searchNetworks,
    limit: 30,
  });
  
  let results = data?.filterTokens?.results || [];
  
  // Filter quality tokens
  results = results
    .filter(r => {
      const liquidity = parseFloat(r.liquidity) || 0;
      return liquidity >= 10000;
    })
    .slice(0, 20);
  
  return { results };
}

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

// Handler for token prices (for trending bar and crypto widgets)
async function handleTokenPrices(symbols) {
  const results = {};
  
  for (const symbol of symbols) {
    try {
      const upperSymbol = symbol.toUpperCase();
      
      // Check if this is a well-known token - use specific address for accuracy
      if (WELL_KNOWN_TOKENS[upperSymbol]) {
        const knownToken = WELL_KNOWN_TOKENS[upperSymbol];
        console.log(`Using well-known address for ${upperSymbol}: ${knownToken.address} on network ${knownToken.networkId}`);
        
        const addressQuery = `
          query GetTokenByAddress($address: String!, $networkId: Int!) {
            filterTokens(
              filters: { 
                network: [$networkId]
              }
              tokens: [$address]
              limit: 1
            ) {
              results {
                token {
                  address
                  symbol
                  name
                  networkId
                }
                priceUSD
                change24
                volume24
                marketCap
                liquidity
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
          const change = parseFloat(tokenData.change24) || 0;
          console.log(`${upperSymbol} price from well-known address: $${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`);
          
          results[upperSymbol] = {
            price: price,
            change: change,
            change24: change,
          };
          continue; // Skip fallback for well-known tokens
        }
      }
      
      // Fallback: Use symbol search for other tokens
      const query = `
        query GetPrice($phrase: String!, $limit: Int) {
          filterTokens(
            filters: { network: [1, 56, 137, 42161] }
            phrase: $phrase
            limit: $limit
            rankings: { attribute: liquidity, direction: DESC }
          ) {
            results {
              token {
                symbol
                address
              }
              priceUSD
              change24
              liquidity
            }
          }
        }
      `;
      
      const data = await executeCodexQuery(query, { phrase: symbol, limit: 5 });
      const tokenResults = data?.filterTokens?.results || [];
      
      // Find best match
      const match = tokenResults
        .filter(r => (parseFloat(r.liquidity) || 0) >= 1000)
        .sort((a, b) => (parseFloat(b.liquidity) || 0) - (parseFloat(a.liquidity) || 0))[0];
      
      if (match) {
        const price = parseFloat(match.priceUSD) || 0;
        results[upperSymbol] = {
          price,
          change: parseFloat(match.change24) || 0,
          change24: parseFloat(match.change24) || 0,
        };
        if (price > 0) continue;
      }
      // Codex had no result or price 0 – CoinGecko fallback
      const cg = await fetchCoinGeckoPrice(symbol);
      if (cg && cg.price > 0) {
        results[upperSymbol] = { price: cg.price, change: cg.change, change24: cg.change24 };
      }
    } catch (e) {
      console.error(`Price lookup error for ${symbol}:`, e.message);
      const cg = await fetchCoinGeckoPrice(symbol);
      if (cg && cg.price > 0) {
        results[(symbol || '').toUpperCase()] = { price: cg.price, change: cg.change, change24: cg.change24 };
      }
    }
  }
  
  return results;
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
  'PAAL': { address: '0x14fee680690900ba0cccfc76ad70fd1b95d10e16', networkId: 1 },
};

// Handler for chart bars (OHLCV data)
async function handleBars(symbol, from, to, resolution, networkId) {
  let tokenAddress;
  let netId = parseInt(networkId) || 1;
  
  // Check if symbol is already in "tokenAddress:networkId" format
  if (symbol.includes(':')) {
    const parts = symbol.split(':');
    tokenAddress = parts[0];
    netId = parseInt(parts[1]) || netId;
  }
  // If symbol is just a token symbol (not an address), look it up
  else if (!symbol.startsWith('0x') && symbol.length < 32) {
    const upperSymbol = symbol.toUpperCase();
    const tokenInfo = KNOWN_TOKEN_ADDRESSES[upperSymbol];
    
    if (tokenInfo) {
      tokenAddress = tokenInfo.address;
      netId = tokenInfo.networkId;
    } else {
      console.log(`Unknown token symbol for chart: ${upperSymbol}`);
      return { bars: [] };
    }
  }
  // It's a raw token address
  else {
    tokenAddress = symbol;
  }
  
  // Determine if it's a Solana address (base58, not starting with 0x)
  const isSolanaAddress = !tokenAddress.startsWith('0x') && tokenAddress.length >= 32 && tokenAddress.length <= 44;
  if (isSolanaAddress && netId === 1) {
    netId = 1399811149; // Solana network ID
  }
  
  // Format address correctly (lowercase for EVM, case-sensitive for Solana)
  const formattedAddress = isSolanaAddress ? tokenAddress : tokenAddress.toLowerCase();
  
  // Convert resolution to Codex format
  const resolutionMap = {
    '1': '1', '5': '5', '15': '15', '30': '30', '60': '60', '240': '240',
    '1D': '1D', 'D': '1D', '1W': '1W', 'W': '1W',
  };
  const codexResolution = resolutionMap[resolution] || resolution;
  
  // Symbol format: "tokenAddress:networkId"
  const tokenSymbol = `${formattedAddress}:${netId}`;
  
  console.log(`Fetching token bars: symbol=${tokenSymbol}, from=${from}, to=${to}, resolution=${codexResolution}`);
  
  const query = `
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
  
  const data = await executeCodexQuery(query, {
    symbol: tokenSymbol,
    from: parseInt(from),
    to: parseInt(to),
    resolution: String(codexResolution),
  });
  
  // Handle various response formats
  let rawBars = data?.getTokenBars;
  
  // Check if we got valid bars data
  if (!rawBars) {
    console.log(`No bars data returned for ${tokenSymbol}`);
    return { bars: [] };
  }
  
  // Handle parallel arrays format (API returns { o: [...], h: [...], ... })
  if (rawBars && typeof rawBars === 'object' && !Array.isArray(rawBars)) {
    if (rawBars.o && Array.isArray(rawBars.o)) {
      console.log(`Converting parallel arrays format for ${tokenSymbol}`);
      const bars = rawBars.t.map((t, i) => ({
        t: t,
        o: rawBars.o[i],
        h: rawBars.h[i],
        l: rawBars.l[i],
        c: rawBars.c[i],
        v: rawBars.volume?.[i] || rawBars.v?.[i] || 0
      }));
      console.log(`Fetched ${bars.length} bars for ${tokenSymbol}`);
      return { bars };
    }
    console.log(`Unexpected bars object format for ${tokenSymbol}`);
    return { bars: [] };
  }
  
  // Ensure we have an array
  if (!Array.isArray(rawBars)) {
    console.log(`Unexpected bars type for ${tokenSymbol}: ${typeof rawBars}`);
    return { bars: [] };
  }
  
  // Transform response to match expected format
  const bars = rawBars.map(bar => ({
    t: bar.t,
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.volume || bar.v || 0
  }));
  
  console.log(`Fetched ${bars.length} bars for ${tokenSymbol}`);
  return { bars };
}

// Handler for ATH (All-Time High) from CoinGecko
async function handleATH(address, networkId) {
  const platformMap = {
    1: 'ethereum',
    56: 'binance-smart-chain',
    137: 'polygon-pos',
    42161: 'arbitrum-one',
    8453: 'base',
    43114: 'avalanche',
    10: 'optimistic-ethereum',
    250: 'fantom',
    1399811149: 'solana',
  };
  
  const platform = platformMap[parseInt(networkId)] || 'ethereum';
  
  try {
    const cgUrl = `${COINGECKO_BASE_URL}/coins/${platform}/contract/${address.toLowerCase()}`;
    console.log(`Fetching ATH from CoinGecko: ${cgUrl}`);
    
    const response = await fetch(cgUrl, {
      headers: {
        'Accept': 'application/json',
        ...(COINGECKO_API_KEY ? { 'x-cg-pro-api-key': COINGECKO_API_KEY } : {})
      }
    });
    
    if (!response.ok) {
      console.log(`CoinGecko: Token not found for ${address} on ${platform}`);
      return { ath: null, athDate: null, source: 'coingecko', found: false };
    }
    
    const data = await response.json();
    
    const athPrice = data.market_data?.ath?.usd || null;
    const athDate = data.market_data?.ath_date?.usd || null;
    const athChangePercent = data.market_data?.ath_change_percentage?.usd || null;
    
    console.log(`CoinGecko ATH for ${data.symbol?.toUpperCase() || address}: $${athPrice} (${athDate})`);
    
    return {
      ath: athPrice,
      athDate: athDate,
      athChangePercent: athChangePercent,
      symbol: data.symbol?.toUpperCase(),
      name: data.name,
      source: 'coingecko',
      found: true,
    };
  } catch (error) {
    console.error('CoinGecko ATH error:', error);
    return { ath: null, athDate: null, source: 'coingecko', found: false, error: error.message };
  }
}

// Handler for token trades (fetches pairs first, then trades for each pair)
async function handleTrades(tokenAddress, networkId, limit) {
  const netId = parseInt(networkId) || 1;
  const isSolanaNetwork = netId === 1399811149;
  const queryAddress = isSolanaNetwork ? tokenAddress : tokenAddress.toLowerCase();
  
  try {
    // First, get the token's trading pairs (simplified query - token0/token1 are strings)
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
    
    const pairsData = await executeCodexQuery(pairsQuery, {
      tokenAddress: queryAddress,
      networkId: netId,
    });
    
    const pairs = pairsData?.listPairsForToken || [];
    
    if (pairs.length === 0) {
      console.log(`No pairs found for token ${queryAddress}`);
      return { trades: [], pairs: [] };
    }
    
    // Take first pair (can't sort by liquidity since field isn't available)
    const mainPair = pairs[0];
    console.log(`Found ${pairs.length} pairs, fetching trades from main pair: ${mainPair.address}`);
    
    // Fetch trades from the main pair
    const tradesQuery = `
      query GetTrades($pairAddress: String!, $networkId: Int!, $limit: Int!) {
        getTokenEvents(
          query: {
            address: $pairAddress
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
    
    const tradesData = await executeCodexQuery(tradesQuery, {
      pairAddress: mainPair.address.toLowerCase(),
      networkId: netId,
      limit: parseInt(limit) || 100,
    });
    
    const events = tradesData?.getTokenEvents?.items || [];
    
    // Determine which token is our target (token0 and token1 are address strings)
    const isToken0 = (mainPair.token0 || '').toLowerCase() === queryAddress.toLowerCase();
    
    // Convert from wei (18 decimals) to human-readable
    const WEI_DIVISOR = 1e18;
    
    // Transform events to trades format
    // Using same logic as local server (server/index.js) which works correctly
    const trades = events
      .filter(event => event.eventType === 'Swap' || event.eventType === 'swap' || event.data)
      .map(event => {
        // Get raw amounts (in wei) and convert to human-readable
        const amount0In = parseFloat(event.data?.amount0In || 0) / WEI_DIVISOR;
        const amount0Out = parseFloat(event.data?.amount0Out || 0) / WEI_DIVISOR;
        const amount1In = parseFloat(event.data?.amount1In || 0) / WEI_DIVISOR;
        const amount1Out = parseFloat(event.data?.amount1Out || 0) / WEI_DIVISOR;
        
        // Determine if buy or sell based on token flow
        // For our target token: if tokens going IN to the pair (user selling), it's a SELL
        // If tokens going OUT of the pair (user buying), it's a BUY
        let isBuy;
        let tokenAmount;
        
        if (isToken0) {
          // Target token is token0
          // amount0In > 0 means user sent target token to the pool (SELL)
          // amount0Out > 0 means user received target token from pool (BUY)
          isBuy = amount0Out > amount0In;
          // Use the non-zero value (the actual amount traded)
          tokenAmount = amount0In > 0 ? amount0In : amount0Out;
        } else {
          // Target token is token1
          isBuy = amount1Out > amount1In;
          tokenAmount = amount1In > 0 ? amount1In : amount1Out;
        }
        
        // Price per token from API
        const pricePerToken = parseFloat(event.data?.priceUsd || 0);
        
        // Calculate total USD value (amount * price)
        const totalUsd = tokenAmount * pricePerToken;
        
        return {
          timestamp: event.timestamp,
          type: isBuy ? 'Buy' : 'Sell',
          priceUSD: pricePerToken,
          amountToken: tokenAmount,
          amountUSD: totalUsd,
          maker: event.maker,
          txHash: event.transactionHash,
        };
      });
    
    console.log(`Fetched ${trades.length} trades for ${queryAddress}`);
    return { trades, pairs: [mainPair] };
    
  } catch (error) {
    console.error('Error fetching trades:', error);
    return { trades: [], pairs: [], error: error.message };
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'details': {
        const { address, networkId } = req.query;
        if (!address) {
          return res.status(400).json({ error: 'Address is required' });
        }
        const result = await handleTokenDetails(address, networkId);
        if (!result) {
          return res.status(404).json({ error: 'Token not found' });
        }
        return res.json(result);
      }
      
      case 'search': {
        const { q, networks } = req.query;
        if (!q) {
          return res.status(400).json({ error: 'Search query is required' });
        }
        const networkIds = networks ? networks.split(',').map(n => parseInt(n)) : null;
        const result = await handleTokenSearch(q, networkIds);
        return res.json(result);
      }
      
      case 'trending': {
        const { networks } = req.query;
        const networkIds = networks ? networks.split(',').map(n => parseInt(n)) : null;
        const result = await handleTrendingTokens(networkIds);
        return res.json(result);
      }
      
      case 'prices': {
        const { symbols } = req.query;
        if (!symbols) {
          return res.status(400).json({ error: 'Symbols are required' });
        }
        const symbolList = symbols.split(',');
        const result = await handleTokenPrices(symbolList);
        return res.json(result);
      }
      
      case 'bars': {
        const { symbol, from, to, resolution, networkId } = req.query;
        if (!symbol || !from || !to) {
          return res.status(400).json({ error: 'Missing required parameters: symbol, from, to' });
        }
        const result = await handleBars(symbol, from, to, resolution || '60', networkId || 1);
        return res.json(result);
      }
      
      case 'ath': {
        const { address, networkId } = req.query;
        if (!address) {
          return res.status(400).json({ error: 'Address is required' });
        }
        const result = await handleATH(address, networkId || 1);
        return res.json(result);
      }
      
      case 'trades': {
        const { address, networkId, limit } = req.query;
        if (!address) {
          return res.status(400).json({ error: 'Address is required' });
        }
        const result = await handleTrades(address, networkId || 1, limit || 50);
        return res.json(result);
      }
      
      case 'health':
      default:
        return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
