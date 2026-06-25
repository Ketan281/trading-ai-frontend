# Graph Report - trading-ai-frontend  (2026-06-25)

## Corpus Check
- 20 files · ~16,362 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 53 nodes · 114 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4edca1c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
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
9. `DailyBrief()` - 4 edges
10. `useCandles()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `WalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `ForexWalletPanel()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `Positions()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `FuturesView()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js
- `ForexView()` --calls--> `apiPost()`  [EXTRACTED]
  src/App.jsx → src/api.js

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.48
Nodes (7): apiGet(), ForexView(), FuturesView(), HistoryView(), RecoView(), useCandles(), useWallet()

### Community 2 - "Community 2"
Cohesion: 0.47
Nodes (5): AutoTrader(), fmt(), pct(), TIER_COLORS, TIER_LABELS

### Community 3 - "Community 3"
Cohesion: 0.40
Nodes (5): apiPost(), AdminView(), AskView(), ChangePassword(), Positions()

### Community 4 - "Community 4"
Cohesion: 0.23
Nodes (11): apiDelete(), getToken(), isLocal, _onAuthFail(), req(), setAuthFailHandler(), setToken(), AuthGate() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.38
Nodes (7): fmt(), fmtUsd(), ForexWalletPanel(), HistRow(), LiveEquityBar(), PnlMiniChart(), WalletPanel()

### Community 7 - "Community 7"
Cohesion: 0.32
Nodes (7): DailyBrief(), fmt(), pct(), STATE_COLORS, TIER_COLORS, WALL_TIER_COLORS, WALL_TIER_LABELS

## Knowledge Gaps
- **8 isolated node(s):** `TIER_COLORS`, `WALL_TIER_COLORS`, `WALL_TIER_LABELS`, `STATE_COLORS`, `NAV` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiPost()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `apiGet()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `AutoTrader()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `TIER_COLORS`, `WALL_TIER_COLORS`, `WALL_TIER_LABELS` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._