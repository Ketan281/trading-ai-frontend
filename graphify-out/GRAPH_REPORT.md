# Graph Report - trading-ai-frontend  (2026-06-22)

## Corpus Check
- 9 files · ~7,622 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 46 nodes · 109 edges · 6 communities (5 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8a92d72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `apiPost()` - 19 edges
2. `apiGet()` - 12 edges
3. `useWallet()` - 9 edges
4. `fmt()` - 7 edges
5. `req()` - 7 edges
6. `fmtUsd()` - 6 edges
7. `useCandles()` - 6 edges
8. `Dashboard()` - 5 edges
9. `EquityView()` - 5 edges
10. `ForexView()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `useLiveStream()` --calls--> `getToken()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `WalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `ForexWalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `Positions()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `Dashboard()` --calls--> `apiGet()`  [EXTRACTED]
  src/App.jsx → src/api.js

## Import Cycles
- None detected.

## Communities (6 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (10): apiGet(), AdminView(), EquityView(), FuturesView(), HistoryView(), OptionsView(), RecoView(), SettingsView() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.40
Nodes (5): fmt(), HistRow(), PnlMiniChart(), RecommendationsView(), SegCard()

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (8): apiPost(), AskView(), AuthGate(), ChangePassword(), Dashboard(), ForexBetaDashboard(), Positions(), useLiveStream()

### Community 4 - "Community 4"
Cohesion: 0.39
Nodes (7): apiDelete(), getToken(), isLocal, _onAuthFail(), req(), setAuthFailHandler(), setToken()

### Community 5 - "Community 5"
Cohesion: 0.40
Nodes (5): fmtUsd(), ForexView(), ForexWalletPanel(), LiveEquityBar(), WalletPanel()

## Knowledge Gaps
- **2 isolated node(s):** `NAV`, `isLocal`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiPost()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `req()` connect `Community 4` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `NAV`, `isLocal` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._