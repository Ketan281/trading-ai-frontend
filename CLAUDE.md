# CLAUDE.md — Trading-AI Frontend

## Critical Rules

- **DO NOT git add/commit/push** — the user handles all commits and pushes manually.
- **Backend repo**: `C:\Users\KetanMohite\OneDrive - INTELLINUM\Desktop\git\allGit\trading-ai` — read its CLAUDE.md and PROGRESS.md for full project context.
- For full project architecture, ML models, API endpoints, and deployment details, read the backend's CLAUDE.md.

## Overview

React frontend for Trading-AI platform. Deployed to Vercel at https://trading-ai-frontend-iota.vercel.app/

Backend API: `ketan-trading.duckdns.org` (Oracle Cloud)

## Tech Stack

- React 18, Vite, lightweight-charts (candlestick)
- No component library — plain CSS with dark theme
- API client in `src/api.js` (apiGet, apiPost with JWT auth)

## Structure

```
src/
├── App.jsx                 # Main app, nav, shared hooks (useWallet, useCandles, useLiveStream)
├── CandleChart.jsx         # Lightweight candlestick chart component
├── api.js                  # API client — apiGet, apiPost, JWT token management
├── index.css               # Global dark theme styles
└── components/
    ├── DailyBrief.jsx          # HOME PAGE — wall selling signals, auto-trader summary, risk overview
    ├── AutoTrader.jsx          # Auto Trader tab — ML mode dashboard, wall signals, trade history
    ├── Portfolio.jsx           # Positions, wallet, deposit, trade modes (custom/ml), mode persistence
    ├── OptionsHub.jsx          # Options chain analysis (NIFTY/BANKNIFTY)
    ├── EquityHub.jsx           # Equity screener + stock analysis
    ├── SwingHub.jsx            # Swing trading ideas
    ├── Performance.jsx         # Performance analytics + charts
    ├── RiskDashboard.jsx       # Risk metrics dashboard
    ├── Alerts.jsx              # Alert management
    ├── RegimeStrip.jsx         # Market regime status bar (always visible)
    └── TradeExplainer.jsx      # Trade explanation modal
```

## Nav Views (in App.jsx)

`home` (DailyBrief) | `options` (OptionsHub) | `equity` (EquityHub) | `swing` (SwingHub) | `portfolio` (Portfolio) | `auto` (AutoTrader) | `performance` (Performance) | `risk` (RiskDashboard) | `alerts` (Alerts)

## Key API Endpoints Used

| Frontend Component | API Endpoint |
|-------------------|-------------|
| DailyBrief | `/portfolio/brief`, `/portfolio/risk`, `/phase2/regime`, `/phase2/auto/dashboard`, `/phase2/auto/wall-signals` |
| AutoTrader | `/phase2/auto/dashboard`, `/phase2/auto/wall-signals`, `/phase2/auto/trade`, `/phase2/auto/close`, `/phase2/auto/reset` |
| Portfolio | `/me/wallet`, `/me/trade`, `/me/mode`, `/me/wallet/deposit`, `/me/wallet/reset` |
| OptionsHub | `/options/NIFTY`, `/options/BANKNIFTY` |
| App (candles) | `/candles/{symbol}?interval=5m&period=1d` |

## Polling Intervals

- Wallet: 60s
- Candles: 120s
- DailyBrief: 120s
- AutoTrader: 120s

Keep these slow — backend is 1 worker on 1GB server. Aggressive polling causes 504s.

## Important Patterns

- **LTP for open positions**: comes from `pnl_series[-1][1]` (last tick price). If empty, falls back to entry price.
- **Trade mode persistence**: stored in localStorage as `indianMode` (custom/ml)
- **Wall signal display format**: `{symbol} SELL {CE/PE} at {strike}` with win_pct, premium, target, stoploss, funds_required, score, tier
- **Currency formatting**: `fmt()` uses `toLocaleString('en-IN')` for ₹ formatting
