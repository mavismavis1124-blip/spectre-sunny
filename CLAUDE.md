# Spectre AI - Netflix-Style Crypto Dashboard

## Project Overview
Building a Netflix-style crypto intelligence dashboard for Spectre AI. Dark theme, glassmorphic design, Apple-level aesthetics, 4K-ready UI.

## Tech Stack
- React + Next.js (or Vite)
- Remotion for programmatic video generation (price action previews, animated charts)
- ElevenLabs for AI-generated audio market briefs
- TailwindCSS for styling
- Framer Motion for animations

## Design System
- Dark background (#0a0a0f or similar deep black/navy)
- Glassmorphic cards with backdrop-blur, subtle borders, and gradient overlays
- Netflix-style horizontal scroll rows with hover-to-expand cards
- Smooth transitions, auto-playing video previews on hover
- Neon accent colors: cyan (#00f0ff), purple (#a855f7), green (#22c55e) for gains, red (#ef4444) for losses
- Typography: Inter or SF Pro Display

## Architecture

### Layout Structure
- Top nav: Spectre AI logo, search bar, user profile
- Hero section: Featured/trending crypto with large Remotion video background
- Horizontal scroll rows by category:
  - "Trending Now" (top volume/social buzz)
  - "Top Gainers" (24h price action)
  - "AI & DePIN Tokens"
  - "Layer 1s"
  - "DeFi Blue Chips"
  - "New Listings"
  - "Your Watchlist"
- Each card: token logo, name, ticker, sparkline, 24h %, market cap

### Card Behavior
- Default: static card with sparkline + key stats
- Hover: expand card, auto-play Remotion composition showing animated price chart
- Click: full detail modal with AI research summary, sentiment gauge, ElevenLabs audio brief

### Remotion Compositions
- `CryptoPriceAction`: Animated candlestick/line chart for each token (5-10 sec loop)
- `MarketOverview`: Hero section background showing market heatmap animation
- `SentimentPulse`: Animated sentiment gauge visualization
- Use @remotion/player for inline playback, not full renders

### ElevenLabs Integration
- Generate 30-60 sec audio market briefs per token
- Use voice ID for consistent "Spectre AI analyst" persona
- Cache audio files, regenerate daily or on significant price moves
- Play button on detail modal triggers audio

### Data Layer
- Crypto price data: CoinGecko or CoinMarketCap API
- Mock data is fine for initial build, use realistic crypto data
- Structure: { id, name, symbol, price, change24h, marketCap, volume, sparkline7d, sentiment, category[] }

## API Keys (set as env vars)
- ELEVEN_LABS_API_KEY - for voice generation
- COINGECKO_API_KEY - for market data (or use free tier)

## Commands
- `npm run dev` - start dev server
- `npx remotion studio` - open Remotion studio for composition preview
- `npx remotion render` - render video compositions

## Code Style
- Functional components with hooks
- TypeScript preferred
- Modular: separate components for Card, Row, HeroSection, DetailModal, RemotionCompositions
- Keep Remotion compositions in src/remotion/
- Keep API calls in src/lib/api/

## Git Workflow (MUST FOLLOW)
- Working branch: `prod`
- NEVER push directly to `main`
- When asked to "push", "commit and push", or "push to git":
  1. Commit changes on `prod`
  2. Merge latest `origin/main` into `prod` first (`git fetch origin main && git merge origin/main`)
  3. Push `prod` to remote (`git push origin prod`)
  4. Create a PR from `prod` → `main` using `gh pr create --base main --head prod`
- When asked to "update" or "pull latest":
  1. `git fetch origin main && git merge origin/main`
  2. Run `npm install` if package.json changed

## Priority
1. Layout + horizontal scroll rows with mock data
2. Card component with hover effects
3. Remotion price action compositions
4. Detail modal with full stats
5. ElevenLabs audio integration
6. Real API data connection
