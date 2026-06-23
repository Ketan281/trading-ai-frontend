# Graph Report - trading-ai-frontend  (2026-06-23)

## Corpus Check
- 15 files · ~10,807 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 39 nodes · 90 edges · 5 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db784eb5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `apiPost()` - 16 edges
2. `apiGet()` - 10 edges
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

## Communities (5 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (3): ForexBetaDashboard(), NAV, useLiveStream()

### Community 1 - "Community 1"
Cohesion: 0.36
Nodes (8): apiGet(), AdminView(), FuturesView(), HistoryView(), RecoView(), SettingsView(), useCandles(), useWallet()

### Community 3 - "Community 3"
Cohesion: 0.40
Nodes (5): apiPost(), AskView(), AuthGate(), ChangePassword(), Positions()

### Community 4 - "Community 4"
Cohesion: 0.39
Nodes (7): apiDelete(), getToken(), isLocal, _onAuthFail(), req(), setAuthFailHandler(), setToken()

### Community 5 - "Community 5"
Cohesion: 0.32
Nodes (8): fmt(), fmtUsd(), ForexView(), ForexWalletPanel(), HistRow(), LiveEquityBar(), PnlMiniChart(), WalletPanel()

## Knowledge Gaps
- **2 isolated node(s):** `NAV`, `isLocal`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiPost()` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `Community 1` to `Community 0`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `req()` connect `Community 4` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `NAV`, `isLocal` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._