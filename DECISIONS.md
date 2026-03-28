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

## 2026-03-19 — Câmara legislative agenda wired to real APIs (propositions + voting sessions)

**Context:** The `/camara/pautas/` pages used mock data. The Câmara API provides `GET /proposicoes` and `GET /votacoes` endpoints with paginated data for legislative propositions and voting sessions, but with non-obvious limitations.

**Decision:** Nine new fetcher functions were added to `camara.ts` covering propositions (list, detail, authors, themes, progress) and voting sessions (list, detail, votes, orientations). Key API quirks required workarounds: (1) `/votacoes` only accepts `ordenarPor=id`, not `dataHoraRegistro`; (2) date ranges on `/votacoes` are limited to 3 months, requiring a `splitDateRangeIntoQuarters()` helper; (3) list vs detail endpoints for voting sessions return different response shapes (`proposicaoObjeto` string vs `proposicoesAfetadas` array), requiring separate raw types and mapping functions; (4) propositions are capped at `maxPages=5` (500 items) to avoid thousands of API calls, filtering to main types `PL,PEC,PLP,MP,PDL`. Seven new types were added to `proposition.ts` (CamaraProposition, CamaraVotingSession, CamaraIndividualVote, CamaraVoteOrientation, etc.).

**Consequences:** The Pautas section is now fully functional with real data: overview page with charts, proposition listing with search/filters, proposition detail with authors/themes/tramitação timeline, voting sessions listing, and voting session detail with individual votes and party orientations. The quarterly date splitting pattern should be reused for any future endpoint with date range limits.

---

## 2026-03-19 — Deputy voting history via composite fetcher pattern

**Context:** The `GET /deputados/{id}/votacoes` endpoint was removed by the Câmara API (returns 405 since at least March 2026). There is no direct way to get a deputy's voting record.

**Decision:** A composite fetcher `getDeputyVotingHistory(deputyId, startDate, endDate)` was created that: (1) fetches all voting sessions in the date range via `getVotingSessions()`; (2) for each session, fetches individual votes via `getVotingSessionVotes()`; (3) filters for the target deputy's vote. Sessions are fetched in batches of 10 to avoid overwhelming the API. A `maxSessions` parameter (default 50) caps the number of API calls. A new `DeputyVotingRecord` type combines session metadata with the individual vote.

**Consequences:** This is an N+1 API call pattern (1 session list call + up to 50 individual vote calls). Performance is acceptable due to aggressive caching: session list has 3h TTL, individual session votes have 12h TTL. After first load, all subsequent views are cache hits. The "alignment" metric (how often the deputy voted with the winning side) is a derived value computed server-side. This pattern can be reused for any future composite queries that need to cross-reference paginated data.

---

## 2026-03-19 — Individual expense detail pages instead of expandable rows

**Context:** The expenses listing originally used expandable rows in the DataTable to show expense details inline. This was cluttered and limited the amount of information that could be displayed (receipt preview, value breakdowns, internal reference fields).

**Decision:** Each expense now links to a dedicated detail page at `/camara/{id}/despesas/{docId}`. The page fetches the full year's expenses and finds the matching record by `documentCode` (there is no single-expense API endpoint). The `DeputyExpense` type was extended with all available fields from the raw API: `grossValue`, `deductedValue`, `documentUrl`, `documentType`, `documentCode`, `reimbursementNumber`, `batchNumber`, `installment`, `year`, `month`. The detail page shows: header with expense type as title (sentence case), deputy name with link, value StatCards, info panel, internal reference, and an embedded receipt viewer (iframe, 900px tall) as the last section.

**Consequences:** Users get a full-page view of each expense with the receipt document prominently displayed. The trade-off is an extra API call to fetch the full year's expenses for a single record, but caching (6h TTL) mitigates this. The `documentCode` serves as the unique identifier in the URL. The sentence-case conversion of expense types (API returns ALL CAPS) is done via a simple `toSentenceCase()` helper.

---

## 2026-03-20 — Toast-based error handling with graceful degradation for all API calls

**Context:** Pages that fetch from multiple API endpoints would crash entirely if any single fetch failed (e.g. rate-limited, 403, or 500). Users had no visibility into what went wrong.

**Decision:** A three-part error handling system was introduced: (1) `ApiError` class in `packages/fetchers/lib/cache.ts` — extends `Error` with `status`, `url`, and a `userMessage` getter that returns Portuguese-language messages per HTTP status (429 = rate limit, 403 = blocked, 404 = not found, etc.); (2) `collectErrors()` utility in `apps/web/lib/error-utils.ts` — wraps fetcher calls, catches failures into an array and returns a fallback value via `emptySourced()` so the page renders with partial data; (3) `ToastTrigger` + `ToastProvider` in `apps/web/components/ui/Toast.tsx` — server pages pass collected errors to the client trigger, which fires toasts on mount. `ToastProvider` wraps `AppShell` in `layout.tsx`.

**Consequences:** Pages degrade gracefully — a failed expense fetch shows empty charts but the profile still renders. All 9 Câmara pages were updated with this pattern. The `collectErrors(fn, fallback, errors, label)` pattern is the standard for all future pages. Primary data (e.g. deputy profile) still uses try/catch → `notFound()` for hard failures.

---

## 2026-03-20 — Voting session detail enriched with additional API payload fields

**Context:** The voting session detail page showed minimal information. The Câmara API detail endpoint (`GET /votacoes/{id}`) returns significantly more data than the list endpoint — including `objetosPossiveis`, `descUltimaAberturaVotacao`, `dataHoraUltimaAberturaVotacao`, `ultimaApresentacaoProposicao`, and `idOrgao`. Meanwhile, voting tables in listings should keep showing the description (not proposition info) because votes aren't always about a specific proposition — they can be urgency requests, amendments, procedural motions, etc.

**Decision:** The `CamaraVotingSession` type was extended with `organ?`, `openingDescription?`, `openingDate?`, `lastPresentation?`, and `votingObjects[]`. The detail page now shows: organ, opening date, opening description, last presentation text, affected propositions (with links), and voting objects (with links) — all in addition to the existing stats, orientations, and individual votes. Listing tables across all pages continue to show the `description` field.

**Consequences:** The detail page is now comprehensive. The raw detail endpoint fields are mapped in `mapRawToVotingSessionDetail()` in the fetcher. This distinction between list-level summary and detail-level enrichment should be followed for all future detail pages.

---

## 2026-03-20 — ChartCard action prop for "see all" navigation on truncated charts

**Context:** Charts showing top N items (e.g. "top 12 parties", "top 15 states") gave no indication that more data existed or how to see the full listing.

**Decision:** `ChartCard` now accepts an optional `action` prop (`{ label: string; href: string }`) that renders a navigation link to the right of the title. Used on the Câmara overview charts: "Ver todos os partidos" → `/partidos`, "Ver todos os estados" → `/estados`.

**Consequences:** Minor UI addition. All future charts showing truncated data should use this prop to link to the full listing page.

---

## 2026-03-20 — Deputy comparison page with shared useTransition

**Context:** Users wanted to compare deputies side by side. The comparison page involves multiple independent controls (year selector, deputy picker with 3 slots) that all trigger server-side navigation, creating a fragmented loading experience when each control had its own `useTransition`.

**Decision:** A `ComparisonControls.tsx` wrapper component owns a single `useTransition` and passes `loading` + `navigate` callback props down to both the year selector and `DeputyPicker`. All URL changes (year, add/remove deputy) funnel through the same `startTransition`, so all picker slots show loading simultaneously. The comparison table always renders 4 columns (1 label + 3 deputy slots) with empty padding cells, matching the 3-slot picker grid above. The table uses `min-w-[480px]` with horizontal scroll on mobile.

**Consequences:** Unified loading UX — changing the year shows loading on all picker slots, not just a spinner next to the dropdown. The URL is fully shareable (`?ids=204554,178957&ano=2025`). The `navigate` callback pattern is reusable for any page that needs multiple controls to share a single loading state.

---

## 2026-03-20 — Umami Cloud analytics with type-safe event tracking

**Context:** The project needed analytics to understand usage patterns (which pages are visited, what users search for, which source pills are clicked). Traditional analytics tools (Google Analytics) conflict with the project's privacy-first principles.

**Decision:** Umami Cloud was chosen as the analytics provider — privacy-focused, no cookies, LGPD compliant. The tracking script is injected via Next.js `Script` component in `layout.tsx`, controlled by `NEXT_PUBLIC_UMAMI_WEBSITE_ID` env var. A type-safe wrapper in `lib/analytics.ts` defines all events with their payloads (`AnalyticsEvents` interface). The `track()` function is a silent no-op when Umami is unavailable (SSR, ad-blockers, missing env). Client components that need tracking (SourcePill, GameCard, Sidebar, SearchableList, etc.) import `track()` and call it on user interactions. Search tracking is debounced at 800ms.

**Consequences:** Analytics requires `"use client"` on any component that calls `track()` — this forced SourcePill and GitHubLink to become client components. The type-safe wrapper prevents typos in event names and ensures consistent payload shapes. No personal data is collected.

---

## 2026-03-20 — About page with runtime TTL values from fetchers package

**Context:** The user requested an About page explaining the project's data sources, cache methodology, and infrastructure. Cache TTL values needed to be accurate and not go stale.

**Decision:** The `/sobre` page imports TTL constants directly from `@imposterio/fetchers` and formats them at render time using a `formatTtl()` helper. The page is structured: hero → principles → data sources → bulk processing → cache methodology → open source → infrastructure. Data sources use a responsive layout: card-based on mobile, table on `sm+`. The "Sobre o projeto" link is a regular nav item in the sidebar, pinned to the bottom via `mt-auto`, styled consistently with other nav items but visually separated.

**Consequences:** TTL values on the About page always match the actual runtime configuration. The responsive data sources layout avoids cramped tables on mobile. Infrastructure cards (Vercel, Neon, Upstash, Umami, Railway) document the full deployment stack.

---

## 2026-03-20 — Mobile-first responsive overhaul for all components

**Context:** Mobile devices are the primary platform for Imposterio's target audience. Many components had fixed layouts that broke on small screens: headers with `flex justify-between` overflowed, tables were too wide, padding was too generous, and detail page headers pushed back links off-screen.

**Decision:** Systematic mobile-first pass across all shared components and Câmara/Sobre pages: (1) All page headers changed from `flex justify-between` to `flex-col sm:flex-row sm:justify-between` — title and controls stack vertically on mobile; (2) `StatCard` reduced padding (`p-4 sm:p-5`), smaller text (`text-xs sm:text-sm` for labels, `text-xl sm:text-2xl` for values), badges wrap via `flex-wrap`; (3) `DataTable` uses `px-3 sm:px-4` cell padding; (4) `ProfileHeader` stacks photo/name vertically on mobile; (5) `SectionHeader` uses `flex-wrap` to prevent action links from overflowing; (6) `ChartCard` and `InfoPanel` reduced mobile padding; (7) Expense receipt iframe responsive heights (`h-[400px] sm:h-[600px] lg:h-[900px]`); (8) Comparison table gets `min-w-[480px]` with horizontal scroll; (9) About page data sources use stacked cards on mobile instead of table; (10) Party orientations grid `grid-cols-1 sm:2 lg:4`.

**Consequences:** All UI components now follow a mobile-first approach. This pattern (responsive padding, stacking layouts, `flex-wrap`, responsive text sizes) must be applied to all future pages. The `sm:` breakpoint is the primary transition point from mobile to tablet layout.

---

## 2026-03-20 — SourcePill removed from page titles on multi-source pages

**Context:** Overview pages like `/camara` and `/camara/pautas` fetch data from multiple APIs (deputies, propositions, voting sessions, attendance). Placing a single SourcePill next to the page title was misleading because it only linked to one of several data sources.

**Decision:** On pages that fetch from multiple data sources, the SourcePill is NOT placed next to the page title. Instead, each section has its own source attribution via `SectionHeader sourceUrl` or `ChartCard sourceUrl`. Single-source pages (e.g., listing pages like `/camara/deputados`) keep the SourcePill inline with the title.

**Consequences:** Every section on multi-source pages must explicitly receive its `sourceUrl` prop. The per-section approach is more accurate since each section links to the exact endpoint that generated its data.

---

## 2026-03-20 — Standardized section spacing across all Câmara pages

**Context:** Section spacing was inconsistent — headers used `mb-4`, `mb-6`, or `pb-6` depending on page type; content sections used `mb-6`, `mb-8`, or `mb-10`. This created a visually uneven rhythm.

**Decision:** Two spacing rules: (1) `<header>` elements use `mb-10` (40px), providing a larger gap from page header to first content; (2) `<section>` elements use `mb-8` (32px), providing uniform spacing between all content sections. Mid-page dividers (e.g., deputy detail year selector) use `mt-10 mb-10`.

**Consequences:** All 17 Câmara pages were updated. New pages must follow this spacing convention.

---

## 2026-03-20 — Year selector redesigned as "Ver dados de" box with contextual alignment

**Context:** The year selector was a bare dropdown with an "Ano:" label crammed into the header row next to back links. The user found this hard to discover and visually unpolished.

**Decision:** The year selector in page headers is now wrapped in a card-like box (`rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2.5`) with a "Ver dados de" label. Placement depends on context: (1) In page headers, the box sits in the right column of a flex row, below the back link when present — `header flex-col sm:flex-row sm:items-end sm:justify-between`; (2) In mid-page dividers (deputy detail), the box is on the same line as the section title — `flex sm:items-center sm:justify-between`. The inline variant (inside SearchableList filter rows) remains unchanged.

**Consequences:** The year selector is now more discoverable and visually distinct from surrounding text. Pages with back links stack: back link on top, year box below, both right-aligned. The `YearSelector` component itself was not changed — only how it's wrapped and positioned in page layouts.

---

## 2026-03-18 — Estados section expanded with comprehensive fiscal data

**Context:** The Estados section initially focused only on governors. Using impostometro.org as reference, the user requested expanding it to include state-level fiscal data — tax revenue, ICMS/IPVA/ITCMD breakdown, federal transfers, budget execution, debt indicators, and CAPAG ratings. This aligns with the project's core mission of tax transparency.

**Decision:** The Estados section was restructured into a fiscal-first section with its own sidebar category (separate from "Outros"). Three page types: (1) overview page with fiscal StatCards, charts (tax ranking, composition pie, per capita, transfers trend), and a states table with fiscal columns; (2) `/estados/arrecadacao` listing page with full tax breakdown for all 27 states; (3) `/estados/[uf]` detail page with tax breakdown table, budget execution by category (with constitutional minimums), federal transfers table, and fiscal health indicators panel. Primary data sources: SICONFI API (RREO Anexo 03 for ICMS/IPVA/ITCMD, Anexo 08 for budget, RGF for debt/personnel), IBGE (population, GDP), Tesouro Transparente (CAPAG, federal transfers, debt data).

**Consequences:** The estados section is now the most data-dense section in the app. When real API integration happens, SICONFI RREO endpoints will be the primary fetcher — they provide bimestral data for all 27 states plus DF. The CAPAG rating (A/B/C/D) is color-coded using the same Badge component variant system (green/amber/red) used elsewhere. Constitutional minimums (e.g. 25% education, 12% health, 60% personnel cap) are displayed alongside actual percentages to enable citizens to verify compliance.

---

## 2026-03-25 — Redis optimization: singleton, cache validation, and combined-result caching

**Context:** Upstash Redis free tier was hitting limits (~10 MB storage, ~29k commands in 2 days). Three root causes: (1) five bulk fetchers each created `new Redis()` instances on every call, inflating connection and command counts; (2) paginated fetchers like `getDeputyExpenses` made N Redis GETs per request (one per page); (3) failed or error-shaped API responses were being cached, causing persistent tooltip errors until TTL expiry.

**Decision:** Three changes to `packages/fetchers/lib/cache.ts` and `packages/fetchers/camara.ts`:

1. **Shared Redis singleton** — `cache.ts` now exports the `redis` client instance. All five bulk fetchers (`getDeputyAttendanceBulk`, `getDeputyAttendanceDetail`, `getStaffBulk`, `getProcurementBulk`, `getProcurementDetail`) were refactored to import and use this singleton instead of creating `new Redis()` per call. Bulk fetcher cache reads were changed from `cachedFetch` (which would re-fetch the raw 5MB file on summary key miss) to direct `redis.get` on the summary key.

2. **Cache validation** — `cachedFetch()` now validates data before writing (rejects null, primitives, error-shaped responses) and on read (rejects non-object values, evicts corrupt entries via `redis.del()`). Both read and write are wrapped in try-catch — cache failures are non-fatal.

3. **Combined-result caching for expenses** — `getDeputyExpenses` stores the final merged+sorted expense array under a short key (`cam:exp:{id}:{year}` or `cam:exp:{id}:{year}:{month}`). On cache hit, returns in 1 Redis GET instead of N per-page lookups. Individual pages are still cached by `cachedFetch` for granular invalidation.

**Consequences:** Redis command count drops significantly for repeat page views (1 GET vs N for expenses, 1 connection vs 5+ for bulk fetchers). Storage is slightly reduced by avoiding raw 5MB files cached under summary keys. Error responses no longer persist in cache. The `redis` singleton is now an architectural constraint — `new Redis()` must never be used in fetcher code. The combined-result caching pattern (`cam:` prefix keys) should be extended to other paginated fetchers (speeches, events, voting sessions) as needed.

---

## 2026-03-27 — HTML scraping for Verba de Gabinete data

**Context:** The Verba de Gabinete (office allowance / parliamentary secretary payroll) is a critical transparency data point — it shows how much each deputy spends on staff salaries. However, unlike CEAP expenses (available via the Open Data API at `dadosabertos.camara.leg.br`), this data has **no official API endpoint**. The only public source is the HTML transparency page at `camara.leg.br/transparencia/gastos-parlamentares`, which returns pre-rendered HTML tables with monthly spending per deputy.

**Decision:** Created a server-side HTML scraper at `apps/web/lib/scrapers/verba-gabinete.ts` that fetches the transparency page with query parameters (`legislatura`, `ano`, `deputado`) and parses monthly spending data (staff count, total spent, ceiling) from the HTML table rows using regex. Results are cached in Redis under `verba-gabinete:{id}:{year}` with a 24h TTL. The scraper follows the same cache validation and `_source` injection patterns as `cachedFetch()` but operates on raw HTML instead of JSON API responses.

**Consequences:** This is the first and only scraper in the codebase — all other data comes from structured JSON APIs. HTML scraping is inherently fragile: if the Câmara redesigns the transparency page or changes the table structure, this scraper will silently fail or return incorrect data. Mitigations: (1) the parser throws explicitly when no data rows are found, rather than returning empty results; (2) error responses are never cached; (3) the `_source` URL is preserved so users can manually verify at the official page. If the Câmara ever publishes this data via their Open Data API, this scraper should be replaced with a standard `cachedFetch()` fetcher.

---

## 2026-03-28 — Removed Lideranças (leadership history) feature

**Context:** The `GET /deputados/{id}/historicoLideres` endpoint on the Câmara Open Data API has been returning 404 consistently since at least March 2026. The endpoint is no longer listed in the current Swagger documentation, suggesting it was intentionally removed by the API maintainers rather than being temporarily unavailable.

**Decision:** The Lideranças feature was fully removed from the codebase: fetcher function `getDeputadoHistoricoLideres`, its raw type `CamaraLeaderHistoryRaw`, mapper `mapRawToLeaderHistory`, public type `DeputyLeadershipHistory`, endpoint constant `CAMARA_DEPUTY_LEADER_HISTORY`, TTL constant, barrel export, and all UI references in the deputy detail page (timeline in "Carreira política" section). No fallback or alternative data source was introduced — the data simply does not exist anymore.

**Consequences:** The "Cargos de liderança" subsection no longer appears on the deputy detail page. If the Câmara reinstates the endpoint in the future, the feature can be re-added following the standard fetcher → type → page pattern. The removal is clean — no dead code or commented-out references remain.

---

## 2026-03-28 — Graceful degradation for Mandatos endpoint

**Context:** The `GET /deputados/{id}/mandatos` endpoint on the Câmara Open Data API is intermittently unavailable, returning errors for some deputies. Unlike the Lideranças endpoint (fully removed), this endpoint still appears in the Swagger documentation and works for many deputies, so removing it entirely would lose valuable data.

**Decision:** The `getDeputadoMandatos` call is wrapped in a standalone try/catch that returns `null` on failure, rather than using the `collectErrors()` pattern which would show a toast. When the result is `null`, the "Mandatos na Câmara" subsection within "Carreira política" is silently hidden — no error message is shown since the data is supplementary and its absence does not meaningfully degrade the page. A JSDoc warning was added to the fetcher function documenting the endpoint's unreliability. The deputy's current legislature is still shown via `ultimoStatus` (from the reliable detail endpoint), so the most important mandate information remains available.

**Consequences:** Users see a slightly shorter "Carreira política" section when the endpoint fails, but no error toasts or broken UI. The section condition check still shows the section if other data (previous mandates, occupations, status history) is available. If the endpoint stabilizes, the data will automatically reappear with no code changes needed.

---

## 2026-03-28 — cachedFetch uses cache: 'no-store' to bypass Next.js fetch cache

**Context:** Pages were loading slowly on every request as if Redis caching was not working. Investigation confirmed that cache keys are deterministic, TTLs are correct, and the Redis singleton is properly shared. The root cause was Next.js 14's patched `fetch()` — in the App Router, `fetch()` is intercepted with its own data cache layer. Without explicit `cache: 'no-store'`, Next.js may apply its own caching heuristics that interfere with the Redis cache layer, causing unpredictable behavior where sometimes the external API is called redundantly and other times stale Next.js-cached data is served, bypassing Redis TTL expiry.

**Decision:** Added `cache: 'no-store'` to the `fetch()` call inside `cachedFetch()`. This disables Next.js's built-in fetch data cache, ensuring that caching is handled exclusively by Redis with its well-defined TTLs. Also added development-only `[cache HIT]` / `[cache MISS]` console logging to make cache behavior visible during development, so future regressions are immediately detectable.

**Consequences:** All API calls go through the Redis cache layer exclusively. Next.js still handles route-level caching (ISR, dynamic segments), but individual `fetch()` calls are always fresh when Redis misses. The `cache: 'no-store'` is set on every `cachedFetch` call, including those that already had custom `options` — the spread ensures user-provided options take precedence if needed. Debug logging is gated behind `NODE_ENV === "development"` and does not affect production.
