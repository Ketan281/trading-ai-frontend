# Graph Report - trading-ai-frontend  (2026-06-19)

## Corpus Check
- 8 files · ~5,507 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 30 nodes · 48 edges · 4 communities (2 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1af3d22f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]

## God Nodes (most connected - your core abstractions)
1. `useWallet()` - 7 edges
2. `fmt()` - 5 edges
3. `fmtUsd()` - 5 edges
4. `useCandles()` - 5 edges
5. `WalletPanel()` - 3 edges
6. `LiveEquityBar()` - 3 edges
7. `PnlMiniChart()` - 3 edges
8. `Dashboard()` - 3 edges
9. `OptionsView()` - 3 edges
10. `FuturesView()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Dashboard()` --calls--> `useWallet()`  [EXTRACTED]
  src/App.jsx → src/App.jsx  _Bridges community 1 → community 3_
- `ForexView()` --calls--> `useWallet()`  [EXTRACTED]
  src/App.jsx → src/App.jsx  _Bridges community 1 → community 2_

## Import Cycles
- None detected.

## Communities (4 total, 2 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.53
Nodes (6): EquityView(), FuturesView(), OptionsView(), RecoView(), useCandles(), useWallet()

### Community 2 - "Community 2"
Cohesion: 0.38
Nodes (7): fmt(), fmtUsd(), ForexView(), HistRow(), LiveEquityBar(), PnlMiniChart(), WalletPanel()

## Knowledge Gaps
- **1 isolated node(s):** `NAV`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useWallet()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `fmt()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `fmtUsd()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `NAV` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._