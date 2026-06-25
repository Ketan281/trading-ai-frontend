# Graph Report - trading-ai-frontend  (2026-06-25)

## Corpus Check
- 20 files · ~16,189 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 45 nodes · 101 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0da9d30`
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

## God Nodes (most connected - your core abstractions)
1. `apiPost()` - 17 edges
2. `apiGet()` - 11 edges
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

## Communities (7 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.31
Nodes (9): apiGet(), AdminView(), ForexBetaDashboard(), FuturesView(), HistoryView(), RecoView(), useCandles(), useLiveStream() (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.47
Nodes (5): AutoTrader(), fmt(), pct(), TIER_COLORS, TIER_LABELS

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (6): apiPost(), AskView(), AuthGate(), ChangePassword(), Positions(), SettingsView()

### Community 4 - "Community 4"
Cohesion: 0.39
Nodes (7): apiDelete(), getToken(), isLocal, _onAuthFail(), req(), setAuthFailHandler(), setToken()

### Community 5 - "Community 5"
Cohesion: 0.50
Nodes (4): fmt(), HistRow(), LiveEquityBar(), WalletPanel()

### Community 6 - "Community 6"
Cohesion: 0.50
Nodes (4): fmtUsd(), ForexView(), ForexWalletPanel(), PnlMiniChart()

## Knowledge Gaps
- **4 isolated node(s):** `NAV`, `TIER_COLORS`, `TIER_LABELS`, `isLocal`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiPost()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `AutoTrader()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `NAV`, `TIER_COLORS`, `TIER_LABELS` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._