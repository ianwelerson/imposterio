# Architecture Decision Records

This file documents significant architectural decisions made during the development of Imposterio. Every non-obvious decision must be recorded here by Claude Code at the time it is made.

Format based on [ADR (Architecture Decision Records)](https://adr.github.io/).

---

## Template

```markdown
## YYYY-MM-DD — Short descriptive title

**Context:** Why was this decision needed? What problem was being solved?

**Decision:** What exactly was decided?

**Consequences:** What changes? What trade-offs were accepted?
```

---

## 2025-03-18 — English as the codebase language

**Context:** The project targets Brazilian users and the primary README is in Portuguese. However, choosing a language for the codebase itself is a separate decision with different trade-offs.

**Decision:** English is the mandatory language for all code, comments, JSDoc, test descriptions, commit messages, and AI-facing documents (`CLAUDE.md`, `DECISIONS.md`). The only exceptions are user-facing UI strings and `README.md` (Brazilian Portuguese).

**Consequences:** Any developer worldwide can read and contribute without a language barrier. AI tooling (Claude Code and others) produces higher-quality outputs when working in English, since models are trained predominantly on English-language code. The codebase stays consistent with the broader open-source ecosystem.

---

## 2025-03-18 — No proprietary storage of government data

**Context:** Imposterio aggregates data from dozens of public government APIs. Storing that data in a proprietary database would introduce stale data problems, synchronization complexity, accuracy responsibility, and potential legal grey areas around data redistribution.

**Decision:** No data originating from government APIs is persisted in a proprietary database. All data is fetched in real time and cached in Redis with a TTL calibrated per data type. The only documented exceptions are: (1) `game_cards` and `game_votes` — original Imposterio data from the "Fair or not?" game; (2) the Federal Revenue QSA bulk — required for partner-to-company graph traversal at scale.

**Consequences:** Imposterio depends on public API availability. When a source is down, the relevant section shows a graceful error state rather than stale data. The Redis cache mitigates most transient instability. Data freshness is bounded by the TTL, which is a feature rather than a limitation.

---

## 2025-03-18 — `_source` field injected into every API response

**Context:** The core value proposition of Imposterio is verifiability — users can confirm any number directly at the official source. Every piece of data displayed in the UI must carry the exact URL of the API call that generated it.

**Decision:** All fetchers return `WithSource<T>` — a type that extends the original data with `_source: string`, the full API URL including query parameters. The `<SourcePill>` component is mandatory alongside every data point. The `_source` field is injected once inside `cachedFetch()`, preventing duplication across fetchers.

**Consequences:** Minor typing overhead. For aggregated values (e.g. a deputy's total yearly spending), `_source` points to the root endpoint that produced the underlying records — an acceptable approximation, since users can follow the link and filter further.

---

## 2025-03-18 — Federal Revenue QSA bulk stored in proprietary PostgreSQL

**Context:** The company network feature requires reverse lookups: given a CPF (individual tax ID), find all companies where that person appears as a partner or administrator. No public API supports this query across the full universe of Brazilian companies (~60 million CNPJs).

**Decision:** The complete Federal Revenue QSA dataset (~85GB uncompressed) is imported monthly by a dedicated worker (Railway) into PostgreSQL (Neon) with appropriate indexes. This enables O(log n) CPF-to-company lookups. Data is sourced from the official Federal Revenue open data release and refreshed in the first days of each month after official publication.

**Consequences:** Infrastructure costs increase slightly. Partner data may lag the official source by up to one month. The `cnpj_cpf_socio` index on the `partner` table is performance-critical and must be created before the app serves traffic. This is the only government dataset stored in a proprietary database, justified exclusively by the impossibility of real-time traversal at this scale.

---

## 2025-03-18 — Game anti-flood via Redis only — IP never persisted in PostgreSQL

**Context:** The "Fair or not?" game allows anonymous voting. Without rate limiting, a single user could skew rankings by casting thousands of votes on the same card.

**Decision:** Flood control uses a Redis key `vote:{ip}:{cardId}` with a 30-day TTL. If the key exists, the vote is rejected with HTTP 429. The IP address is never written to PostgreSQL — it exists only as part of a transient Redis key that expires automatically.

**Consequences:** After 30 days, a user may vote on the same card again — an acceptable trade-off that avoids any long-term storage of personally identifiable information. This approach is compliant with LGPD (Brazil's data protection law) since no personal data is retained beyond the TTL window.

---

## 2026-03-18 — Mobile-first responsive layout with slide-in sidebar drawer

**Context:** The application was initially built with a desktop-only fixed sidebar layout. Mobile users saw an unusable layout with content overflowing the viewport.

**Decision:** The layout uses a dual-render sidebar approach. On desktop (`lg+`), the sidebar is a fixed left column always visible. On mobile (`< lg`), it becomes a slide-in drawer triggered by a hamburger button, with a semi-transparent backdrop overlay and body scroll lock. The `AppShell` client component manages the open/closed state. Content overflow is prevented with `min-w-0` on the flex child and `overflow-x-hidden` on the `<main>` and `<html>`/`<body>`.

**Consequences:** The sidebar component renders in both modes (desktop + mobile) within the same React tree, avoiding duplication. The mobile drawer auto-closes on route change. The `overflow-x-hidden` on `<html>`/`<body>` is a global constraint that prevents horizontal scroll everywhere — acceptable for this app since no page requires horizontal scrolling.

---

## 2026-03-18 — Collapsible sidebar sub-items for people listing pages

**Context:** People listing pages (deputies, senators, ministers, servants, magistrates, governors) were added as sub-routes under each branch. The sidebar needed to expose these without cluttering the navigation or losing direct access to the parent branch overview pages.

**Decision:** The `NavItem` interface supports an optional `children` array. Each parent item renders as a flex row: a clickable `<Link>` that navigates to the parent page, plus a separate chevron `<button>` that toggles the child list. Sub-items auto-expand when the current route matches any child href. Expanded state is tracked in a `useState<Set<string>>`.

**Consequences:** Users can navigate to the branch overview (e.g. `/camara`) by clicking the parent label, or expand/collapse the sub-items independently via the chevron. This avoids the common anti-pattern where clicking a parent item only toggles children without navigating. The trade-off is a slightly larger click target area, which is acceptable since the chevron button has adequate padding.

---

## 2026-03-18 — Recharts for data visualizations with per-page chart client components

**Context:** Each branch overview page needed data visualizations (bar charts, line charts, pie charts) to surface insights from the mapped API data — spending trends, party distributions, compensation comparisons, etc.

**Decision:** Recharts was chosen as the chart library. Three reusable chart primitives (`BarChart`, `LineChart`, `PieChart`) live in `components/charts/` and are wrapped in a `ChartCard` container. Each page has a dedicated `*Charts.tsx` client component (e.g. `CamaraCharts.tsx`) marked with `"use client"` that composes these primitives with page-specific mock data. Charts are rendered before tables/lists on every page.

**Consequences:** Chart components must be client components due to Recharts' DOM dependency, but they are isolated in dedicated files so the rest of the page can remain a server component. Currently all charts render static mock data — real data integration will replace the mock arrays with fetcher calls. The `ChartCard` wrapper ensures visual consistency across all pages.

---

## 2026-03-18 — People listing pages use mock data with "Ver mais" links instead of source pills

**Context:** Listing pages (e.g. all deputies, all senators) show tabular data with a link to each person's detail page. The `<SourcePill>` component is mandatory for verified data points, but listing pages currently render static mock data — not yet connected to real APIs.

**Decision:** Listing pages display a "Ver mais →" link in the last column instead of a `<SourcePill>`. The `<SourcePill>` will be added when these pages are connected to real API data via fetchers. Each listing shows a "Dados dos últimos 30 dias" subtitle instead of a period selector, since the data window is fixed.

**Consequences:** This is a temporary deviation from the `<SourcePill>` rule. When real API integration happens, every row must gain a `_source` field and the `<SourcePill>` must be added alongside each data point. The "Ver mais" link pattern is retained regardless, as it serves a different purpose (navigation to detail page).

---

## 2026-03-18 — Tax counter (Impostômetro) uses statistical interpolation, not a real-time API

**Context:** The user requested an Impostômetro-style tax collection counter on the home page. Research confirmed that no public real-time API exists for Brazilian tax collection. The original Impostômetro API (`apiv2.impostometro.com.br`) by IBPT/ACSP is token-gated and requires a partnership agreement. Sites like impostometro.org use the same interpolation approach over official data.

**Decision:** The `TaxCounter` component uses the same methodology as the original Impostômetro: take the previous year's actual tax collection (federal via ReceitaData + state via CONFAZ/SICONFI + municipal via SICONFI), apply the 3-year average growth rate, and interpolate the result using `requestAnimationFrame` in the browser. Currently a hardcoded annual estimate (R$ 5.52 tri for 2026) — will be replaced by a computed value from a daily worker job that fetches and caches the latest actuals.

**Consequences:** The counter is an estimate with a 2–3.5% error margin, not a verified data point. For this reason, the `<SourcePill>` is not attached to the counter value itself — instead, the component displays footnotes with the methodology and data sources. When real integration happens: (1) a daily worker fetches ReceitaData XLSX + SICONFI API and stores the computed annual estimate + per-second rate in Redis (TTL: 24h); (2) the frontend reads the cached rate and runs the animation; (3) as monthly official data is published, the estimate for that month is replaced with the actual, reducing the error margin progressively throughout the year.

---

## 2026-03-19 — URL-driven year selection with useTransition loading state

**Context:** Deputy expense data spans from 2008 to the current year. Users need to explore different years, but the year must be preserved across page navigations (detail page → expenses listing) and the data is fetched server-side.

**Decision:** Year selection is URL-driven via `?ano=YYYY` searchParams. A `YearSelector` client component uses `useRouter().push()` with `useTransition()` to show a loading spinner during navigation. The year is clamped to `[FIRST_CEAP_YEAR, currentYear]` and defaults to the current year. The expenses listing page reads `?ano=` from the URL and the deputy detail page passes it when linking to the full listing.

**Consequences:** Server-side data fetching is fully preserved — no client-side fetch required. The loading state via `useTransition` is non-blocking (the old UI stays visible while the new data loads). The pattern works for any section that needs time-period selection.

---

## 2026-03-19 — Treemap, Calendar Heatmap, and Stacked Bar charts for expense visualization

**Context:** The initial PieChart was insufficient for showing expense categories (too many categories with similar sizes, poor contrast). Users also wanted to see daily spending patterns and which suppliers dominate each category.

**Decision:** Three new chart components were created: (1) `TreemapChart` — proportional area visualization that replaces PieChart for categories with many items; (2) `CalendarHeatmap` — GitHub-style pure SVG heatmap showing daily spending intensity, responsive via `viewBox`; (3) `StackedBarChart` — horizontal stacked bars showing category × supplier cross-tabulation with top N suppliers individually + "Outros" grouping. All chart data is pre-aggregated server-side in `expense-utils.ts` and passed as props to the client component.

**Consequences:** The chart library is now 7 components. CalendarHeatmap is independent of Recharts (pure SVG), while TreemapChart and StackedBarChart use Recharts. The aggregation functions in `expense-utils.ts` are reusable for any section that has categorized financial data (future: contracts, travel, payment cards).

---

## 2026-03-19 — SourcePill on charts and section headers via sourceUrl prop

**Context:** Architecture rule §4 requires a SourcePill next to every data point. Charts and section headers were missing source attribution.

**Decision:** `ChartCard` and `SectionHeader` both accept an optional `sourceUrl` prop that renders a small "↗ fonte" pill inline next to the title. The pill is smaller than the standalone `SourcePill` (10px font, tighter padding) to avoid visual clutter on chart titles. The `DeputyExpenseCharts` client component receives `sourceUrl` and passes it to all ChartCards.

**Consequences:** Every chart and data section on the deputy page now links to the exact API call. This pattern must be replicated for all future sections.

---

## 2026-03-19 — Expense aggregation functions in a separate server-safe module

**Context:** Chart data needs to be computed from raw expense records. Initially, aggregation was done inside a `"use client"` component, which broke server-side imports.

**Decision:** All aggregation functions live in `expense-utils.ts` — a plain TypeScript module (no `"use client"` directive). Functions: `aggregateByMonth`, `aggregateByCategory`, `aggregateBySupplier`, `aggregateByDay`, `aggregateCategoryBySupplier`, `monthlyToBarData`. The server page component calls these functions and passes pre-aggregated results as props to the client chart component.

**Consequences:** Aggregation happens at build/request time on the server. The client component receives only the data it needs to render — no raw expense array shipped to the browser. This pattern should be followed for all future chart integrations.

---

## 2026-03-18 — Estados section expanded with comprehensive fiscal data

**Context:** The Estados section initially focused only on governors. Using impostometro.org as reference, the user requested expanding it to include state-level fiscal data — tax revenue, ICMS/IPVA/ITCMD breakdown, federal transfers, budget execution, debt indicators, and CAPAG ratings. This aligns with the project's core mission of tax transparency.

**Decision:** The Estados section was restructured into a fiscal-first section with its own sidebar category (separate from "Outros"). Three page types: (1) overview page with fiscal StatCards, charts (tax ranking, composition pie, per capita, transfers trend), and a states table with fiscal columns; (2) `/estados/arrecadacao` listing page with full tax breakdown for all 27 states; (3) `/estados/[uf]` detail page with tax breakdown table, budget execution by category (with constitutional minimums), federal transfers table, and fiscal health indicators panel. Primary data sources: SICONFI API (RREO Anexo 03 for ICMS/IPVA/ITCMD, Anexo 08 for budget, RGF for debt/personnel), IBGE (population, GDP), Tesouro Transparente (CAPAG, federal transfers, debt data).

**Consequences:** The estados section is now the most data-dense section in the app. When real API integration happens, SICONFI RREO endpoints will be the primary fetcher — they provide bimestral data for all 27 states plus DF. The CAPAG rating (A/B/C/D) is color-coded using the same Badge component variant system (green/amber/red) used elsewhere. Constitutional minimums (e.g. 25% education, 12% health, 60% personnel cap) are displayed alongside actual percentages to enable citizens to verify compliance.
