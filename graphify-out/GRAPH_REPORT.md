# Graph Report - trading-ai-frontend  (2026-06-18)

## Corpus Check
- 8 files · ~4,025 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 23 nodes · 33 edges · 3 communities (2 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5809ae6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]

## God Nodes (most connected - your core abstractions)
1. `useWallet()` - 6 edges
2. `useCandles()` - 5 edges
3. `fmt()` - 3 edges
4. `OptionsView()` - 3 edges
5. `FuturesView()` - 3 edges
6. `EquityView()` - 3 edges
7. `RecoView()` - 3 edges
8. `WalletPanel()` - 2 edges
9. `Dashboard()` - 2 edges
10. `HistRow()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (3 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.43
Nodes (7): Dashboard(), EquityView(), FuturesView(), OptionsView(), RecoView(), useCandles(), useWallet()

### Community 2 - "Community 2"
Cohesion: 0.67
Nodes (3): fmt(), HistRow(), WalletPanel()

## Knowledge Gaps
- **1 isolated node(s):** `NAV`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useWallet()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useCandles()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `fmt()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `NAV` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._