/**
 * Major tokens configuration
 * These tokens use CoinGecko/Binance APIs instead of Codex for better reliability
 */

// Major token symbols - these get data from CoinGecko instead of Codex
export const MAJOR_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK',
  'MATIC', 'UNI', 'ATOM', 'LTC', 'ETC', 'FIL', 'ARB', 'OP', 'NEAR', 'APT',
  'SUI', 'INJ', 'TIA', 'SEI', 'AAVE', 'MKR', 'CRV', 'LDO', 'GRT', 'RENDER',
  'RNDR', 'FET', 'TAO', 'ONDO', 'JUP', 'PYTH', 'USDT', 'USDC',
  // Spectre AI token - always searchable
  'SPECTRE'
]);

// Check if a symbol is a major token
export const isMajorToken = (symbol) => {
  if (!symbol) return false;
  return MAJOR_SYMBOLS.has(symbol.toUpperCase().trim());
};

// Check if a major token has an address (needs Codex, not CoinGecko)
export const getMajorTokenAddress = (symbol) => {
  if (!symbol) return null;
  const info = MAJOR_TOKEN_INFO[symbol.toUpperCase().trim()];
  return info?.address || null;
};

// Check if a token uses CoinGecko (major token without custom address)
export const usesCoinGecko = (symbol) => {
  if (!symbol) return false;
  const upper = symbol.toUpperCase().trim();
  return MAJOR_SYMBOLS.has(upper) && !MAJOR_TOKEN_INFO[upper]?.address;
};

// CoinGecko ID mapping for major tokens
export const SYMBOL_TO_COINGECKO_ID = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  ETC: 'ethereum-classic',
  FIL: 'filecoin',
  ARB: 'arbitrum',
  OP: 'optimism',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  SEI: 'sei-network',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  GRT: 'the-graph',
  RENDER: 'render-token',
  RNDR: 'render-token',
  FET: 'fetch-ai',
  TAO: 'bittensor',
  ONDO: 'ondo-finance',
  JUP: 'jupiter-exchange-solana',
  PYTH: 'pyth-network',
  USDT: 'tether',
  USDC: 'usd-coin',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  SHIB: 'shiba-inu',
  FLOKI: 'floki',
  SPECTRE: 'spectre-ai',
};

// Major token metadata for search results (static, always available)
export const MAJOR_TOKEN_INFO = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', networkId: 0 },
  ETH: { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', networkId: 1 },
  SOL: { symbol: 'SOL', name: 'Solana', network: 'Solana', networkId: 1399811149 },
  BNB: { symbol: 'BNB', name: 'BNB', network: 'BSC', networkId: 56 },
  XRP: { symbol: 'XRP', name: 'XRP', network: 'XRP', networkId: 0 },
  ADA: { symbol: 'ADA', name: 'Cardano', network: 'Cardano', networkId: 0 },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', network: 'Dogecoin', networkId: 0 },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', network: 'Avalanche', networkId: 43114 },
  DOT: { symbol: 'DOT', name: 'Polkadot', network: 'Polkadot', networkId: 0 },
  LINK: { symbol: 'LINK', name: 'Chainlink', network: 'Ethereum', networkId: 1 },
  MATIC: { symbol: 'MATIC', name: 'Polygon', network: 'Polygon', networkId: 137 },
  UNI: { symbol: 'UNI', name: 'Uniswap', network: 'Ethereum', networkId: 1 },
  ATOM: { symbol: 'ATOM', name: 'Cosmos', network: 'Cosmos', networkId: 0 },
  LTC: { symbol: 'LTC', name: 'Litecoin', network: 'Litecoin', networkId: 0 },
  ARB: { symbol: 'ARB', name: 'Arbitrum', network: 'Arbitrum', networkId: 42161 },
  OP: { symbol: 'OP', name: 'Optimism', network: 'Optimism', networkId: 10 },
  APT: { symbol: 'APT', name: 'Aptos', network: 'Aptos', networkId: 0 },
  SUI: { symbol: 'SUI', name: 'Sui', network: 'Sui', networkId: 0 },
  INJ: { symbol: 'INJ', name: 'Injective', network: 'Injective', networkId: 0 },
  AAVE: { symbol: 'AAVE', name: 'Aave', network: 'Ethereum', networkId: 1 },
  MKR: { symbol: 'MKR', name: 'Maker', network: 'Ethereum', networkId: 1 },
  PEPE: { symbol: 'PEPE', name: 'Pepe', network: 'Ethereum', networkId: 1 },
  WIF: { symbol: 'WIF', name: 'dogwifhat', network: 'Solana', networkId: 1399811149 },
  BONK: { symbol: 'BONK', name: 'Bonk', network: 'Solana', networkId: 1399811149 },
  SHIB: { symbol: 'SHIB', name: 'Shiba Inu', network: 'Ethereum', networkId: 1 },
  FLOKI: { symbol: 'FLOKI', name: 'Floki', network: 'Ethereum', networkId: 1 },
  USDT: { symbol: 'USDT', name: 'Tether', network: 'Ethereum', networkId: 1 },
  USDC: { symbol: 'USDC', name: 'USD Coin', network: 'Ethereum', networkId: 1 },
  // Spectre AI - our token
  SPECTRE: { symbol: 'SPECTRE', name: 'Spectre AI', network: 'Ethereum', networkId: 1, address: '0x9cf0ed013e67db12ca3af8e7506fe401aa14dad6' },
};

// CoinGecko logos for major tokens
export const COINGECKO_LOGOS = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  ETC: 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
  FIL: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  APT: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  SUI: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  INJ: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  TIA: 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
  SEI: 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  MKR: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  CRV: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  LDO: 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  GRT: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
  RENDER: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  RNDR: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  FET: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg',
  TAO: 'https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg',
  ONDO: 'https://assets.coingecko.com/coins/images/26580/small/ONDO.png',
  JUP: 'https://assets.coingecko.com/coins/images/34188/small/jup.png',
  PYTH: 'https://assets.coingecko.com/coins/images/31924/small/pyth.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  WIF: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
  BONK: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  FLOKI: 'https://assets.coingecko.com/coins/images/16746/small/PNG_image.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  // Spectre AI - local logo
  SPECTRE: '/round-logo.png',
};

export default {
  MAJOR_SYMBOLS,
  isMajorToken,
  SYMBOL_TO_COINGECKO_ID,
  MAJOR_TOKEN_INFO,
  COINGECKO_LOGOS,
};
