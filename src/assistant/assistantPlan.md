# AI Assistant – Page-Aware Helper

## Goal
The assistant helps users operate on the landing page: open sections (e.g. News), highlight areas (e.g. Fear & Greed), and report current state (e.g. "Fear & Greed is at 72 – Greed").

## Page model (Welcome / landing)

| Area | Selector / state | Actions |
|------|------------------|--------|
| Welcome widget | `welcomeOpen` | Open/close panel |
| Top assets | `data-tour="top-assets"` | Highlight |
| Fear & Greed | `data-tour="sentiment"` | Highlight + report value/classification |
| Command Center | `marketAiTab` | Switch tab: analysis, news, flows, mindshare, calendar, heatmaps, etc. |
| Watchlist | `watchlistOpen`, `data-tour="watchlist"` | Open panel, highlight |
| Top Coins / Discovery | `data-tour="discovery"` | Highlight |
| Glossary | `onPageChange('glossary')` | Navigate to glossary |

## Actions API (from WelcomePage → App → AIAssistant)

- **openCommandCenterTab(tabId)** – e.g. `'news'`, `'analysis'`, `'flows'`, `'mindshare'`, `'calendar'`
- **highlightSection(selector)** – scroll into view, add `.ai-highlight` for 3s
- **openWatchlist()** – set `watchlistOpen` true
- **openWelcomeWidget()** – set `welcomeOpen` true
- **openGlossary()** – `onPageChange('glossary')`

## Context (for replies)

- **fearGreed** – `{ value, classification }`
- **marketAiTab** – current Command Center tab
- **marketMode** – `'crypto'` \| `'stocks'`

## Intent → action + reply (examples)

| User says | Action | Reply |
|-----------|--------|--------|
| "news" / "check news" / "open news" | openCommandCenterTab('news') | "Opened the News tab in Command Center." |
| "fear" / "fear and greed" / "sentiment" | highlightSection('[data-tour="sentiment"]') | "Fear & Greed is at {value} ({classification}). I've highlighted it on the page." |
| "watchlist" / "my watchlist" | openWatchlist() | "Opened your watchlist." |
| "analysis" / "market analysis" | openCommandCenterTab('analysis') | "Opened the Analysis tab." |
| "glossary" / "learn terms" | openGlossary() | "Opened the glossary." |
| "flows" / "mindshare" / "calendar" | openCommandCenterTab(id) | "Opened the {tab} tab." |
| Fallback | – | "I can open News, Analysis, Flows, or Mindshare; highlight Fear & Greed; open your Watchlist; or open the Glossary. What would you like?" |

## Implementation tasks

1. **App** – Hold `assistantActions` and `assistantContext` state; pass setters to WelcomePage and values to AIAssistant.
2. **WelcomePage** – Register actions (using setMarketAiTab, setWelcomeOpen, setWatchlistOpen, onPageChange, highlight helper) and context (fearGreed, marketAiTab, marketMode) via props.
3. **AIAssistant** – Accept `actions` and `context`; on user message, parse intent (keyword match), run action(s), append AI reply with state when relevant.
4. **Highlight** – CSS `.ai-highlight`; helper scrolls to selector and adds/removes class after 3s.
