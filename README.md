# Spectre AI Trading Platform

A modern, production-ready cryptocurrency trading platform built with React. Features real-time token data from Codex API, interactive charts, transaction history, and an Apple-inspired dark theme.

![Spectre AI Trading Platform](https://img.shields.io/badge/React-18.2.0-blue) ![Vite](https://img.shields.io/badge/Vite-5.0.0-purple)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Codex API key (get one at [codex.io](https://codex.io))

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/spectre-ai-trading.git
cd spectre-ai-trading

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
# Create .env file
echo "CODEX_API_KEY=your_codex_api_key_here" > .env
```

Or manually create `.env` with:
```
CODEX_API_KEY=your_codex_api_key_here
```

> ⚠️ **Never commit your `.env` file!** It's already in `.gitignore`.

### 3. Set Team Password

Edit `src/components/AuthGate.jsx` and change the `TEAM_PASSWORD` on line 15:

```javascript
const TEAM_PASSWORD = 'your_secure_password_here'
```

### 4. Run Development Server

```bash
# Terminal 1: Start backend server
cd server
npm start

# Terminal 2: Start frontend
npm run dev
```

The app will be available at `http://localhost:5180`

### 5. Deploy to Vercel

**Option A – Deploy from Git (recommended)**

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for Vercel"
   git push origin main
   ```

2. **Connect Vercel to your repo:**
   - Go to [vercel.com](https://vercel.com) and sign in (or create an account).
   - Click **Add New… → Project**.
   - **Import** your GitHub repo (e.g. `Spectre-AI-Bot/Spectre-Sunny-Test`).
   - Vercel will detect **Vite** and use:
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - (These are also set in `vercel.json`.)

3. **Environment variables (if your app uses them):**
   - In the import screen or later: **Settings → Environment Variables**.
   - Add `CODEX_API_KEY` (and any other keys from `.env`) for **Production** (and Preview if you want).

4. **Deploy:** Click **Deploy**. Vercel will build and host the app and give you a URL (e.g. `your-project.vercel.app`).

**Option B – Deploy from your machine (CLI)**

```bash
# Install Vercel CLI once
npm i -g vercel

# From project root: first time (login + link project)
vercel

# Deploy to production
vercel --prod
```

**Important:** Add `CODEX_API_KEY` (and any other env vars) in the Vercel dashboard: **Project → Settings → Environment Variables**.

---

## ✨ Features

- **Real-time Token Data** - Live prices, market cap, volume, liquidity from Codex API
- **Multi-chain Support** - Ethereum, Solana, BSC, Polygon, Arbitrum, Base, and more
- **Interactive Charts** - Candlestick and line charts with multiple timeframes
- **Transaction History** - Real-time trades with filtering and infinite scroll
- **Token Search** - Search any token by name, symbol, or contract address
- **AI Assistant** - Chat interface for market analysis (coming soon)
- **Responsive Design** - Works on desktop and tablet

## 📁 Project Structure

```
spectre-ai-trading/
├── api/                    # Vercel serverless functions
│   └── codex.js           # Main API proxy for production
├── server/                 # Local development server
│   └── index.js           # Express server for Codex API proxy
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service layer
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── public/                # Static assets
├── .env                   # Environment variables (create this!)
├── .env.example           # Example env file
└── package.json
```

## 🔧 Configuration

### API Endpoints

| Environment | Frontend | Backend |
|------------|----------|---------|
| Development | `localhost:5180` | `localhost:3001` |
| Production | Vercel | `/api/codex` serverless function |

### Supported Networks

| Network | ID |
|---------|-----|
| Ethereum | 1 |
| Solana | 1399811149 |
| BSC | 56 |
| Polygon | 137 |
| Arbitrum | 42161 |
| Base | 8453 |
| Optimism | 10 |
| Avalanche | 43114 |

## 🛠 Tech Stack

- **Frontend:** React 18, Vite 5
- **Backend:** Express.js (dev), Vercel Serverless (prod)
- **API:** Codex GraphQL API
- **Styling:** CSS with CSS Variables
- **Charts:** Canvas API (native)

## 📄 License

MIT License - Feel free to use this project for your own trading platform.

---

**Built with ❤️ by the Spectre AI Team**
