# Graph Report - trading-ai-frontend  (2026-06-25)

## Corpus Check
- 20 files · ~16,189 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 51 nodes · 112 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2cd9d389`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `apiPost()` - 18 edges
2. `apiGet()` - 12 edges
3. `req()` - 7 edges
4. `fmt()` - 6 edges
5. `fmtUsd()` - 6 edges
6. `useWallet()` - 6 edges
7. `RecoView()` - 6 edges
8. `ForexView()` - 5 edges
9. `useCandles()` - 4 edges
10. `WalletPanel()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `useLiveStream()` --calls--> `getToken()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `WalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `ForexWalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `Positions()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `FuturesView()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.36
Nodes (8): apiGet(), AdminView(), FuturesView(), HistoryView(), RecoView(), SettingsView(), useCandles(), useWallet()

### Community 2 - "Community 2"
Cohesion: 0.47
Nodes (5): AutoTrader(), fmt(), pct(), TIER_COLORS, TIER_LABELS

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (7): apiPost(), AskView(), AuthGate(), ChangePassword(), ForexBetaDashboard(), Positions(), useLiveStream()

### Community 4 - "Community 4"
Cohesion: 0.39
Nodes (7): apiDelete(), getToken(), isLocal, _onAuthFail(), req(), setAuthFailHandler(), setToken()

### Community 5 - "Community 5"
Cohesion: 0.50
Nodes (4): fmt(), HistRow(), LiveEquityBar(), WalletPanel()

### Community 6 - "Community 6"
Cohesion: 0.50
Nodes (4): fmtUsd(), ForexView(), ForexWalletPanel(), PnlMiniChart()

### Community 7 - "Community 7"
Cohesion: 0.47
Nodes (5): DailyBrief(), fmt(), pct(), STATE_COLORS, TIER_COLORS

## Knowledge Gaps
- **6 isolated node(s):** `NAV`, `TIER_COLORS`, `TIER_LABELS`, `TIER_COLORS`, `STATE_COLORS` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiPost()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `DailyBrief()` connect `Community 7` to `Community 0`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `NAV`, `TIER_COLORS`, `TIER_LABELS` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._