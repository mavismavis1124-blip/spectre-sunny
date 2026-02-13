/**
 * Vercel Serverless – Binance 24h ticker proxy for Discover real-time prices.
 * No API key; free and high rate limit.
 */

const BINANCE_URL = 'https://api.binance.com/api/v3/ticker/24hr';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=10');
  try {
    const r = await fetch(BINANCE_URL);
    if (!r.ok) throw new Error(`Binance ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Binance ticker unavailable' });
  }
};
