# Graph Report - hackathon  (2026-08-14)

## Corpus Check
- 63 files · ~29,358 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 598 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d59073a`
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `getStats()` - 21 edges
2. `Config` - 19 edges
3. `getDb()` - 16 edges
4. `compilerOptions` - 16 edges
5. `registerParticipant()` - 12 edges
6. `requireAdmin()` - 11 edges
7. `formatZodError()` - 11 edges
8. `formatAmount()` - 10 edges
9. `scripts` - 10 edges
10. `runAdminAction()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AdminPage()` --calls--> `getCurrentAdmin()`  [EXTRACTED]
  app/admin/page.tsx → lib/auth.ts
- `AdminPage()` --calls--> `getStats()`  [EXTRACTED]
  app/admin/page.tsx → lib/stats.ts
- `GET()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/admin/export/route.ts → lib/auth.ts
- `POST()` --calls--> `setAdminCookie()`  [EXTRACTED]
  app/api/admin/login/route.ts → lib/auth.ts
- `POST()` --calls--> `verifyAdminCredentials()`  [EXTRACTED]
  app/api/admin/login/route.ts → lib/auth.ts

## Import Cycles
- None detected.

## Communities (16 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (31): Home(), About(), AdminLoginForm(), Domains, EventInfo(), Faq(), FAQS, FinalCta() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (29): checkOrigin(), requireAdmin(), buckets, getClientIp(), rateLimit(), RateLimitResult, ADMIN_ACTIONS, AdminAction (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): dependencies, @electric-sql/pglite, next, pg, qrcode, react, react-dom, zod (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (19): runAdminAction(), DbAdapter, broadcastStats(), mapDbError(), RegisterOptions, registerParticipant(), RegistrationResult, Settings (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (17): AdminDashboard(), EMPTY_ONSPOT, MODES, OnspotForm, Props, StatTile(), ConfirmationData, ConfirmationPanel() (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (17): AdminPage(), columns, GET(), ALLOWED_MODES, ALLOWED_STATUSES, getAdminSummary(), getAllForExport(), getTodayCount() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (13): createPgliteAdapter(), createTestAdapter(), getDb(), getSetting(), GlobalWithDb, QueryFn, QueryResultRow, runMigrations() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (11): b64url(), clearAdminCookie(), createSessionToken(), getCurrentAdmin(), requireSecret(), setAdminCookie(), sign(), verifyAdminCredentials() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, grotesk, metadata, viewport

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **97 isolated node(s):** `metadata`, `columns`, `geistSans`, `geistMono`, `grotesk` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Config` connect `Community 0` to `Community 3`, `Community 4`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `getStats()` connect `Community 0` to `Community 3`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `getDb()` connect `Community 7` to `Community 0`, `Community 3`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `metadata`, `columns`, `geistSans` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07570621468926554 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11587301587301588 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._