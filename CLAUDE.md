# Imposterio — Claude Code Instructions

## Project overview

A Brazilian public transparency platform that aggregates real-time data from dozens of official government APIs. Users open a link — no registration required — and get a complete picture of any Brazilian public official, with a direct link to the source of every single data point.

**Domain:** imposterio.com.br  
**Tagline:** "The mystery of where your tax money goes."

---

## Language policy

**English is the language of this codebase.** This applies to:
- All source code (variable names, function names, class names, file names)
- All JSDoc comments and inline comments
- All test descriptions (`describe`, `it`, `expect` messages)
- All commit messages
- This file and all AI-facing documents (`CLAUDE.md`, `DECISIONS.md`)

The only exceptions are:
- `README.md` — written in Brazilian Portuguese (primary audience)
- User-facing UI strings and labels — written in Brazilian Portuguese
- Error messages surfaced to end users — written in Brazilian Portuguese

---

## Architecture rules — never violate these

1. **No government data is stored in a proprietary database.** Everything comes from APIs in real time, cached in Redis. The only documented exceptions are:
   - Tables `game_cards` and `game_votes` — original Imposterio data from the "Fair or not?" game
   - Federal Revenue QSA bulk — required for partner→company graph traversal (85GB, impossible to query in real time)

2. **All public API calls must go through `cachedFetch()` in `packages/fetchers/lib/cache.ts`.** Never call `fetch()` directly inside components or API Routes.

3. **Every piece of data returned to the frontend MUST include a `_source` field** containing the exact API URL that generated it. No exceptions.

4. **The `<SourcePill url={_source} />` component must appear next to every data point displayed** in the UI. This is the core value proposition: any number can be verified at the official source with one click.

5. **Game anti-flood is handled via Redis** (`vote:{ip}:{cardId}` key, 30-day TTL). The IP address is never persisted in PostgreSQL.

---

## Stack

```
Frontend + API:   Next.js 14 App Router + TypeScript
Cache:            Redis via Upstash (serverless, no fixed cost)
Database:         PostgreSQL via Neon (game votes + QSA bulk only)
ORM:              Prisma
Styles:           Tailwind CSS
Charts:           Recharts (responsive, composable)
Monorepo:         Turborepo + pnpm workspaces
Web deploy:       Vercel
Worker deploy:    Railway
Analytics:        Umami Cloud (privacy-first, LGPD compliant)
Testing:          Vitest + Testing Library + MSW
```

---

## Folder structure

```
imposterio/
├── apps/
│   ├── web/                        # Next.js App Router
│   │   ├── app/
│   │   │   ├── (home)/             # Home dashboard with rankings
│   │   │   │   ├── page.tsx        # Dashboard page (StatCards, rankings, charts)
│   │   │   │   └── HomeCharts.tsx  # Client component — cost trend, branch pie, role bar
│   │   │   ├── camara/             # Chamber of Deputies ✅ WIRED TO REAL API
│   │   │   │   ├── page.tsx        # Overview — StatCards, charts, deputies/propositions/votes tables (real data)
│   │   │   │   ├── CamaraCharts.tsx # Client — party bar, UF bar, proposition type pie, vote result pie
│   │   │   │   ├── camara-utils.ts  # Server-safe aggregations: byParty, byUF, byType, byResult
│   │   │   │   ├── CamaraGameCard.tsx # Client — game card for chamber
│   │   │   │   ├── deputados/      # All deputies listing (real API)
│   │   │   │   │   ├── page.tsx    # Server: getDeputiesList() → real API
│   │   │   │   │   └── DeputiesSearchList.tsx # Client: SearchableList + DataTable with photos
│   │   │   │   ├── [id]/           # Individual deputy detail page (real API)
│   │   │   │   │   ├── page.tsx    # ProfileHeader, StatCards, InfoPanel, charts, expenses table
│   │   │   │   │   ├── DeputyExpenseCharts.tsx # Client: 6 chart types (area, bar, heatmap, treemap, stacked bar)
│   │   │   │   │   ├── DeputyOverviewCharts.tsx # Client: speech, event, committee, voting charts
│   │   │   │   │   ├── CompareButton.tsx # Client: "Comparar" button with analytics tracking
│   │   │   │   │   ├── YearSelector.tsx # Client: year picker with useTransition loading
│   │   │   │   │   ├── expense-utils.ts # Server-safe aggregation functions for chart data
│   │   │   │   │   ├── activity-utils.ts # Server-safe aggregation for speeches, events, committees, votes
│   │   │   │   │   ├── comissoes/  # Deputy committee memberships listing
│   │   │   │   │   │   ├── page.tsx # Server: getDeputyCommittees()
│   │   │   │   │   │   └── CommitteesList.tsx # Client: SearchableList
│   │   │   │   │   ├── frentes/    # Deputy parliamentary caucuses listing
│   │   │   │   │   │   ├── page.tsx # Server: getDeputyCaucuses()
│   │   │   │   │   │   └── CaucusesList.tsx # Client: SearchableList
│   │   │   │   │   ├── discursos/  # Deputy speeches listing
│   │   │   │   │   │   ├── page.tsx # Server: getDeputySpeeches()
│   │   │   │   │   │   └── SpeechesList.tsx # Client: SearchableList
│   │   │   │   │   ├── eventos/    # Deputy events listing
│   │   │   │   │   │   ├── page.tsx # Server: getDeputyEvents()
│   │   │   │   │   │   └── EventsList.tsx # Client: SearchableList
│   │   │   │   │   ├── votacoes/   # Deputy voting history listing (real API)
│   │   │   │   │   │   ├── page.tsx # Server: getDeputyVotingHistory() with year
│   │   │   │   │   │   └── VotingHistoryList.tsx # Client: SearchableList + vote/result filters
│   │   │   │   │   └── despesas/   # Full expenses listing with search + pagination
│   │   │   │   │       ├── page.tsx    # Server: getDeputyExpenses() with year from URL
│   │   │   │   │       ├── ExpensesList.tsx # Client: SearchableList + links to detail pages
│   │   │   │   │       └── [docId]/    # Individual expense detail page (real API)
│   │   │   │   │           └── page.tsx # Values StatCards, info panel, receipt iframe viewer
│   │   │   │   └── pautas/         # Legislative agenda ✅ WIRED TO REAL API
│   │   │   │       ├── page.tsx    # Overview — charts + latest propositions/votes tables
│   │   │   │       ├── PautasCharts.tsx # Client: proposition/voting chart groups
│   │   │   │       ├── pautas-utils.ts # Server-safe aggregation for propositions/votes
│   │   │   │       ├── lista/      # All propositions listing (real API)
│   │   │   │       │   ├── page.tsx # Server: getPropositions() with year + type filter
│   │   │   │       │   └── CamaraPautasList.tsx # Client: SearchableList + filters (type, status, organ)
│   │   │   │       ├── [id]/       # Individual proposition detail (real API)
│   │   │   │       │   └── page.tsx # InfoPanel, authors, themes, tramitação timeline
│   │   │   │       └── votacoes/   # Voting sessions (real API)
│   │   │   │           ├── page.tsx # Server: getVotingSessions() with year selector
│   │   │   │           ├── VotingSessionsList.tsx # Client: SearchableList + result filter
│   │   │   │           └── [id]/   # Individual voting session detail
│   │   │   │               ├── page.tsx # Stats, orientations, affected propositions
│   │   │   │               └── VotesList.tsx # Client: individual votes with party/UF filters
│   │   │   │   ├── comparar/      # Deputy comparison page (up to 3 side-by-side)
│   │   │   │   │   ├── page.tsx   # Server: fetch deputies + expenses + votes for each
│   │   │   │   │   ├── ComparisonControls.tsx # Client: shared useTransition for year + picker
│   │   │   │   │   ├── DeputyPicker.tsx # Client: 3-slot search/select picker
│   │   │   │   │   ├── ComparisonCharts.tsx # Client: multi-series expense/vote charts
│   │   │   │   │   └── comparison-utils.ts # Server-safe metrics + monthly merge
│   │   │   │   └── eventos/       # Chamber event detail pages
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx # Individual event detail
│   │   │   ├── sobre/             # About page
│   │   │   │   ├── page.tsx       # Project info, data sources, cache methodology, infra
│   │   │   │   └── GitHubLink.tsx # Client: GitHub button with analytics tracking
│   │   │   ├── senado/             # Federal Senate
│   │   │   │   ├── page.tsx        # Overview — charts + top senators table
│   │   │   │   ├── SenadoCharts.tsx # Client — bills trend, type pie, party attendance
│   │   │   │   ├── senadores/      # All senators listing
│   │   │   │   │   └── page.tsx    # DataTable: name, party, UF, bills, attendance, committees
│   │   │   │   └── [id]/           # Individual senator detail page
│   │   │   │       └── page.tsx
│   │   │   ├── executivo/          # Federal Executive branch
│   │   │   │   ├── page.tsx        # Overview — charts + ministers/servants tables
│   │   │   │   ├── ExecutivoCharts.tsx # Client — payroll trend, salary bar, agency pie
│   │   │   │   ├── ministros/      # Ministers listing + detail
│   │   │   │   │   ├── page.tsx    # DataTable: name, ministry, term, compensation, assets
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx # ProfileHeader, stats, bio, contracts, card spending
│   │   │   │   └── servidores/     # Civil servants listing + detail
│   │   │   │       ├── page.tsx    # DataTable: name, role, agency, gross/net comp, start
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx # ProfileHeader, stats, comp breakdown, monthly history
│   │   │   ├── judiciario/         # Judiciary branch
│   │   │   │   ├── page.tsx        # Overview — charts + magistrates table
│   │   │   │   ├── JudiciarioCharts.tsx # Client — case trend, area pie, court comp bar
│   │   │   │   ├── magistrados/    # Magistrates listing
│   │   │   │   │   └── page.tsx    # DataTable: name, court badge, rank, comp, cases, years
│   │   │   │   └── [id]/           # Individual magistrate detail page
│   │   │   │       └── page.tsx    # ProfileHeader, stats, comp breakdown, notable cases
│   │   │   ├── partidos/           # Political parties
│   │   │   │   ├── page.tsx        # Overview — charts + all parties table
│   │   │   │   ├── PartidosCharts.tsx # Client — fund distribution, caucus, election, trend
│   │   │   │   ├── lista/          # All parties listing
│   │   │   │   │   └── page.tsx    # DataTable: 20 parties with fund, caucus, elected, bloc
│   │   │   │   └── [sigla]/        # Individual party detail page
│   │   │   │       └── page.tsx    # ProfileHeader, info, members, funds, election results
│   │   │   ├── empresas/           # Companies and partner networks
│   │   │   │   ├── page.tsx        # Overview — charts + top suppliers table
│   │   │   │   ├── EmpresasCharts.tsx # Client — spending trend, sector pie, sanctions
│   │   │   │   └── [cnpj]/         # Individual company page
│   │   │   │       └── page.tsx
│   │   │   ├── estados/            # State governments and fiscal data
│   │   │   │   ├── page.tsx        # Overview — fiscal StatCards, charts, states fiscal table
│   │   │   │   ├── EstadosCharts.tsx # Client — tax revenue ranking, composition pie, per capita, transfers trend
│   │   │   │   ├── EstadosGameCard.tsx # Client — "Acha Justo?" game card for estados
│   │   │   │   ├── arrecadacao/    # Full tax revenue listing (all 27 states)
│   │   │   │   │   └── page.tsx    # DataTable: UF, state, region, revenue, ICMS, IPVA, ITCMD, per capita, CAPAG
│   │   │   │   ├── governadores/   # Governors listing
│   │   │   │   │   └── page.tsx    # DataTable: UF, name, party, comp, assets, term start
│   │   │   │   └── [uf]/           # Individual state detail page (fiscal + governor)
│   │   │   │       └── page.tsx    # ProfileHeader, fiscal StatCards, governor info, tax breakdown, budget, transfers, fiscal indicators
│   │   │   ├── jogo/               # "Fair or not?" game
│   │   │   │   └── page.tsx
│   │   │   ├── icon.svg           # Favicon — green "e" on white background
│   │   │   └── api/                # Next.js API Routes
│   │   │       └── game/           # Game endpoints (vote, rankings)
│   │   ├── lib/
│   │   │   └── analytics.ts       # Type-safe Umami tracking wrapper (silent no-op when unavailable)
│   │   └── components/
│   │       ├── ui/                 # Base components (barrel: @/components/ui)
│   │       │   ├── index.ts        # Barrel export for all UI components
│   │       │   ├── AppShell.tsx    # Client — layout shell with sidebar state, mobile header
│   │       │   ├── Sidebar.tsx     # Client — collapsible nav with sub-items, mobile drawer
│   │       │   ├── TopBar.tsx      # Page header with title, subtitle, optional action
│   │       │   ├── StatCard.tsx    # Metric card with label, value, optional trend
│   │       │   ├── DataTable.tsx   # Generic typed table with expandable rows support
│   │       │   ├── RankingList.tsx  # Numbered ranking with avatar + value
│   │       │   ├── SearchableList.tsx # Client — search + filters + extraControls + pagination
│   │       │   ├── SectionHeader.tsx # Section title with optional action link + sourceUrl pill
│   │       │   ├── SourcePill.tsx  # Clickable link to official data source URL
│   │       │   ├── Badge.tsx       # Colored label (red, green, amber variants)
│   │       │   ├── Acronym.tsx    # Inline abbreviation with CSS hover tooltip
│   │       │   ├── AvatarInitials.tsx # Circular avatar with initials fallback
│   │       │   ├── ProfileHeader.tsx # Detail page header with photo, name, role, stats
│   │       │   ├── InfoPanel.tsx   # Key-value breakdown panel
│   │       │   ├── TaxCounter.tsx  # Client — animated tax collection counter (Impostômetro)
│   │       │   ├── EmptyState.tsx  # Placeholder for empty data sections
│   │       │   ├── VoteBreakdown.tsx # Client — vote tally bar + individual votes table
│   │       │   └── Toast.tsx      # Client — ToastProvider + ToastTrigger + useToast hook
│   │       ├── charts/             # Data visualizations (barrel: @/components/charts)
│   │       │   ├── index.ts        # Barrel export for chart components + types
│   │       │   ├── ChartCard.tsx   # White card wrapper with title/subtitle + sourceUrl pill
│   │       │   ├── BarChart.tsx    # Vertical/horizontal bars, custom colors, truncated labels
│   │       │   ├── LineChart.tsx   # Multi-series line/area chart (uses AreaChart when area=true)
│   │       │   ├── PieChart.tsx    # Donut chart with high-contrast palette + custom tooltip
│   │       │   ├── TreemapChart.tsx # Proportional area chart (better than pie for many categories)
│   │       │   ├── CalendarHeatmap.tsx # GitHub-style daily heatmap, pure SVG, responsive
│   │       │   └── StackedBarChart.tsx # Horizontal stacked bars for cross-tabulation
│   │       └── game/               # Game-specific components
│   │           └── GameCard.tsx    # "Fair or not?" swipeable card
│   └── worker/                     # Monthly Federal Revenue QSA importer
│       └── src/
│           └── qsa-import.ts       # ETL pipeline for Receita Federal bulk
├── packages/
│   ├── fetchers/                   # Public API clients
│   │   ├── lib/
│   │   │   ├── cache.ts            # cachedFetch() — ONLY entry point for external calls
│   │   │   ├── endpoints.ts        # All API base URLs and endpoint path constants
│   │   │   └── ttl.ts              # Cache TTL values per data type
│   │   ├── mocks/
│   │   │   └── handlers.ts         # MSW handlers for all external APIs
│   │   ├── camara.ts               # Câmara dos Deputados API
│   │   ├── camara.test.ts
│   │   ├── senado.ts               # Senado Federal API
│   │   ├── senado.test.ts
│   │   ├── transparencia.ts        # Portal da Transparência API
│   │   ├── transparencia.test.ts
│   │   ├── tse.ts                  # TSE (electoral court) API
│   │   ├── tse.test.ts
│   │   ├── cnj.ts                  # DataJud / CNJ API
│   │   ├── cnj.test.ts
│   │   ├── cnpj.ts                 # CNPJá + OpenCNPJ
│   │   └── cnpj.test.ts
│   ├── db/                         # Prisma schema + typed queries
│   │   ├── schema.prisma
│   │   └── queries/
│   │       ├── game.ts             # game_cards + game_votes queries
│   │       └── qsa.ts              # QSA partner graph queries
│   └── types/                      # Shared TypeScript types
│       ├── index.ts                # Barrel export
│       ├── source.ts               # WithSource<T> utility type
│       ├── parliamentarian.ts
│       ├── company.ts
│       └── game.ts
├── CLAUDE.md
├── DECISIONS.md
├── INTEGRATION.md                  # Master integration checklist (14 phases, 114 items)
├── TODO.md                         # Pending items commented out during wiring phase
├── README.md                       # Brazilian Portuguese
└── README.en.md                    # English
```

---

## Established patterns — reference implementation (Câmara)

The Câmara dos Deputados section is fully wired to real APIs and serves as the **reference implementation** for all other sections. When implementing a new section (Senado, Executivo, etc.), follow these patterns exactly.

### Fetcher pattern (`packages/fetchers/camara.ts`)

```
1. Define raw API response types internally (not exported)
2. Define a mapping function: mapRawToCleanType()
3. Use cachedFetch() with the appropriate TTL constant
4. Handle HATEOAS pagination via extractLastPage() helper
5. Return WithSource<T> — _source is injected by cachedFetch()
6. Comprehensive JSDoc: file header + per-function docs
```

### Detail page pattern (`camara/[id]/page.tsx`)

```
Server component (page.tsx):
  1. Read params + searchParams (year from URL ?ano=YYYY)
  2. Fetch data with Promise.all([getDetail(), getExpenses(), ...])
  3. Compute aggregations server-side (expense-utils.ts)
  4. Render: ProfileHeader → Dados pessoais → Stats → Charts → Recent items

Sections order:
  - ProfileHeader (photo, name, tags, sourceUrl)
  - InfoPanel (dados pessoais)
  - StatCards grid (totals, counts, year-over-year variation)
  - YearSelector (useTransition for loading state)
  - Charts section (DeputyExpenseCharts client component)
  - Recent items table (DataTable with link to full listing)
```

### Chart integration pattern (`[id]/DeputyExpenseCharts.tsx`)

```
1. expense-utils.ts — pure server-safe aggregation functions (NOT "use client")
   - aggregateByMonth(), aggregateByCategory(), aggregateBySupplier()
   - aggregateByDay() — for CalendarHeatmap
   - aggregateCategoryBySupplier() — for StackedBarChart cross-tabulation
   - monthlyToBarData() — format for BarChart

2. DeputyExpenseCharts.tsx — "use client" component
   - Receives pre-aggregated data as props (computed server-side)
   - Composes ChartCard + chart primitives
   - All ChartCards receive sourceUrl prop for SourcePill
   - Layout: 2-col grid with lg:col-span-2 for full-width charts

3. Available chart types:
   - LineChart (area=true for filled) — year-over-year comparison
   - BarChart (horizontal=true) — monthly totals, top suppliers
   - TreemapChart — category proportions (replaces PieChart for many items)
   - CalendarHeatmap — daily intensity (pure SVG, responsive viewBox)
   - StackedBarChart — cross-tabulation (category × supplier)
   - PieChart — still available for simpler distributions
```

### Listing page pattern (`camara/deputados/`)

```
Server component (page.tsx):
  1. Fetch all items: const items = await getList()
  2. Pass to client component: <ItemsSearchList items={items} />

Client component (DeputiesSearchList.tsx):
  1. "use client"
  2. SearchableList wraps DataTable
  3. searchAccessor extracts searchable text
  4. filters[] for dropdown filtering
  5. extraControls slot for server-driven controls (e.g. YearSelector)
  6. DataTable supports expandedRowKey + renderExpanded for detail rows
```

### Expenses listing pattern (`camara/[id]/despesas/`)

```
Server page.tsx:
  1. Read ?ano= from searchParams, default to current year
  2. Fetch expenses + deputy detail
  3. Pass deputyId, selectedYear, yearSelector as ReactNode to client component

Client ExpensesList.tsx:
  1. SearchableList with filters (Tipo de despesa)
  2. yearSelector passed as extraControls
  3. Each row links to /camara/{id}/despesas/{docId}?ano={year} detail page

Expense detail page ([docId]/page.tsx):
  1. Fetches full year expenses, finds by documentCode (no single-expense API)
  2. Header: expense type in sentence case + CEAP badge + SourcePill
  3. Deputy name with link + month/year (prominent, text-base)
  4. Values section: StatCards (gross, net with "reembolso" badge, deducted with explanation)
  5. Info panel: supplier, CPF/CNPJ, document type/number, date, reference period
  6. Internal reference: document code, reimbursement number, batch, installment
  7. Receipt viewer (last section): iframe 900px tall + "Abrir documento" button
```

### Source attribution pattern

```
- Every data point → _source field from cachedFetch()
- ChartCard → sourceUrl prop → renders small "↗ fonte" pill next to title
- SectionHeader → sourceUrl prop → same pill pattern
- DataTable rows → SourcePill in expandable detail or last column
- ProfileHeader → sourceUrl prop → pill next to name

Multi-source pages (overview pages fetching from multiple APIs):
  - Do NOT place SourcePill next to the page title
  - Each section must have its own source attribution via SectionHeader/ChartCard sourceUrl

Single-source pages (listing pages with one API call):
  - SourcePill inline with the page title is OK
```

### Year selection pattern

```
- URL-driven: ?ano=YYYY in searchParams (server-side data fetching preserved)
- YearSelector client component with useTransition for loading state
- Clamped to valid range: max(FIRST_YEAR, min(currentYear, urlYear))
- Carries across pages: detail page → expenses page
- inline prop for matching SearchableList filter styling

Page header placement (box style):
  - Wrapped in: rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2.5
  - Label: "Ver dados de" + <YearSelector>
  - No back link: header flex-col sm:flex-row sm:items-end sm:justify-between
    → title/subtitle left, year box right
  - With back link: right column stacks back link above year box
    → flex-col items-end gap-2
  - Mid-page divider: flex sm:items-center sm:justify-between
    → title/description left, year box right on same line
```

### Section spacing pattern

```
- <header>  → mb-10 (larger gap from header to first content)
- <section> → mb-8  (uniform gap between content sections)
- Mid-page dividers (e.g. year selector on deputy detail) → mt-10 mb-10
```

---

## Public APIs — endpoints and documentation

### Câmara dos Deputados (Chamber of Deputies)
- **Base URL:** `https://dadosabertos.camara.leg.br/api/v2`
- **Swagger:** `https://dadosabertos.camara.leg.br/swagger/api.html`
- **Auth:** none
- **Key endpoints:**
  - `GET /deputados` — list of deputies currently serving
  - `GET /deputados/{id}` — full deputy profile
  - `GET /deputados/{id}/despesas` — CEAP expenses (params: `ano`, `mes`, `pagina`, `itens`)
  - ~~`GET /deputados/{id}/votacoes`~~ — **BROKEN** (returns 405 as of March 2026). Use `GET /votacoes` + `GET /votacoes/{id}/votos` instead
  - `GET /deputados/{id}/discursos` — floor speeches
  - `GET /deputados/{id}/frentes` — parliamentary caucuses
  - `GET /deputados/{id}/orgaos` — committee memberships
  - `GET /votacoes/{id}/votos` — how each deputy voted in a specific vote
- **Party endpoints:**
  - `GET /partidos` — list all parties (params: `sigla`, `dataInicio`, `dataFim`, `idLegislatura`)
  - `GET /partidos/{id}` — party detail: full name, abbreviation, logo, leader, status, website
  - `GET /partidos/{id}/membros` — deputies belonging to the party (params: `idLegislatura`, `dataInicio`, `dataFim`)
  - `GET /partidos/{id}/lideres` — current party leader(s) in the Chamber
  - `GET /blocos` — parliamentary blocs (coalition groups of parties)
  - `GET /blocos/{id}` — bloc detail and member parties
- **Bulk files (data without REST endpoints):**
  - Attendance: `http://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/json/eventosPresencaDeputados-{year}.json`
  - Staff/aides: `http://dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json`
  - CEAP historical expenses: `http://www.camara.leg.br/cotas/Ano-{year}.json.zip`

### Senado Federal (Federal Senate)
- **Base URL:** `https://legis.senado.leg.br/dadosabertos`
- **Swagger:** `https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html`
- **Docs:** `https://legis.senado.leg.br/dadosabertos/docs/index.html`
- **Auth:** none
- **Format:** append `.json` to URL or send header `Accept: application/json`
- **Key endpoints:**
  - `GET /senador/lista/atual.json` — senators currently serving
  - `GET /senador/{id}.json` — full senator profile
  - `GET /senador/{id}/historico.json` — full term history
  - `GET /senador/{id}/votacoes.json` — voting history
  - `GET /senador/{id}/autorias.json` — authored bills
  - `GET /senador/{id}/discursos.json` — speeches
  - `GET /senador/{id}/apartes.json` — interjections in sessions
  - `GET /materia/distribuicao/autoria.json` — authorship distribution
  - `GET /comissao/lista/permanente.json` — permanent committees
- **Party endpoints:**
  - `GET /senador/partidos.json` — list of parties with senators
  - `GET /dados/ListaBlocoParlamentar.json` — all parliamentary blocs with member parties
  - `GET /blocoParlamentar/{id}.json` — specific bloc composition
- **Admin API (compensation):** `https://adm.senado.gov.br/adm-dadosabertos/swagger-ui/index.html`

### Portal da Transparência (Federal Transparency Portal)
- **Base URL:** `https://api.portaldatransparencia.gov.br/api-de-dados`
- **Swagger:** `https://api.portaldatransparencia.gov.br/swagger-ui/index.html`
- **Auth:** free API key via email — header `chave-api-dados: {KEY}`
- **Rate limit:** 400 req/min (business hours), 700 req/min (overnight)
- **Registration:** `https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email`
- **Key endpoints:**
  - `GET /servidores` — federal executive civil servants
  - `GET /servidores/{id}/remuneracao` — detailed compensation breakdown
  - `GET /contratos` — federal contracts
  - `GET /licitacoes` — public procurement bids
  - `GET /convenios` — inter-governmental agreements
  - `GET /emendas` — parliamentary earmarks
  - `GET /despesas/recursos-recebidos` — spending by beneficiary
  - `GET /ceis` — blacklisted companies (CEIS)
  - `GET /cnep` — punished companies (CNEP)
  - `GET /viagens` — official government travel
  - `GET /cartoes` — government payment card spending
  - `GET /orgaos-siafi` — executive branch agencies
- **Integration note:** API key is free (register via email link above). Store as environment variable `TRANSPARENCIA_API_KEY` and inject via `chave-api-dados` header in `cachedFetch()`. Rate limits are generous (400–700 req/min) but should still use cache aggressively.

### CNJ / DataJud
- **Base URL:** `https://api-publica.datajud.cnj.jus.br`
- **Docs:** `https://datajud-wiki.cnj.jus.br/api-publica/`
- **Auth:** fixed public key available in the wiki (may rotate — always check before using)
- **Header:** `Authorization: APIKey {PUBLIC_KEY}`
- **Method:** POST with Elasticsearch query body
- **Per-court endpoints (examples):**
  - STF: `POST /api_publica_stf/_search`
  - STJ: `POST /api_publica_stj/_search`
  - TRF1: `POST /api_publica_trf1/_search`
  - TJSP: `POST /api_publica_tjsp/_search`
- **Judge compensation:** scraped from individual court transparency portals (no REST API)
  - STF: `https://portal.stf.jus.br/remuneracao/`
  - CNJ index: `https://www.cnj.jus.br/transparencia-cnj/remuneracao-dos-magistrados/`
  - Each court system (STF, STJ, TST, TRFs, TJs) has a different portal structure
  - Compensation data must be scraped or parsed from HTML — no centralized JSON API
- **Elasticsearch query patterns** (all DataJud queries are POST with ES body):
  - Count cases by legal area:
    ```json
    { "size": 0, "aggs": { "by_area": { "terms": { "field": "assunto.keyword", "size": 100 } } } }
    ```
  - Cases per magistrate (relator filter):
    ```json
    { "query": { "match": { "relatores.nome": "João Silva Neto" } }, "size": 100 }
    ```
  - Time series (case volume trend by year):
    ```json
    { "size": 0, "aggs": { "by_year": { "date_histogram": { "field": "dataRegistro", "calendar_interval": "year" } } } }
    ```
- **Integration note:** `cachedFetch()` must be extended to support POST requests with JSON bodies for DataJud. The ES response structure is nested (`hits.hits[]` for records, `aggregations` for aggregates) — requires custom response parsing in the CNJ fetcher.

### TSE (Superior Electoral Court)
- **Portal:** `https://dadosabertos.tse.jus.br/`
- **Asset declarations:** `https://divulgacandcontas.tse.jus.br`
- **Campaign finance:** CSV bulk files available per election cycle
- **CKAN API:** `https://dadosabertos.tse.jus.br/api/3/`
  - `GET /action/package_list` — list all datasets
  - `GET /action/package_show?id={name}` — dataset metadata + resources
  - `GET /action/datastore_search?resource_id={id}` — query dataset table
- **Party data group:** `https://dadosabertos.tse.jus.br/group/partidos`
  - Orgãos Partidários — party directory structure (national, state, municipal levels)
  - Delegados Partidários — delegate lists per party
  - Filiados — voter affiliations by party and state
- **Fundo Partidário:** `https://www.tse.jus.br/partidos/contas-partidarias/fundo-partidario-1`
  - Monthly CSV/XLS spreadsheets with fund distribution per party
- **Fundo Eleitoral (FEFC):** distributed per election cycle, published in TSE news/PDFs
- **Registered parties:** `https://www.tse.jus.br/partidos/partidos-registrados-no-tse`
  - All 29 registered parties with name, number, abbreviation, CNPJ
- **Election results (bulk):** `https://dadosabertos.tse.jus.br/dataset/resultados-{year}`
  - Candidates, votes, seats won per party — CSV, all elections since 1996
- **DivulgaCandContas (unofficial API):** `https://divulgacandcontas.tse.jus.br`
  - Candidate registrations and campaign finance, elections 2002+
  - Community Swagger docs: `https://github.com/augusto-herrmann/divulgacandcontas-doc`
  - Rate-limit your requests to avoid IP blocking

### CEPESP/FGV (Third-party REST API over TSE data)
- **Base URL:** `https://cepesp.io/api/consulta/athena/query`
- **Docs:** `https://cepesp.io/documentacao`
- **Auth:** none documented
- **Key tables:** `candidatos`, `legendas` (coalitions), `votos`, `bem_candidato` (assets), `filiados`
- **Example:** `?table=candidatos&anos=2022&cargo=6&c[]=SIGLA_PARTIDO&c[]=NOME_URNA_CANDIDATO`
- **Data:** candidate data by party, election results, campaign coalitions, candidate assets (1998–2022)
- **Quality:** maintained by FGV (university), REST API returning JSON/CSV

### Federal Revenue — QSA Bulk (monthly)
- **Official download:** `https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`
- **Faster mirror:** `https://dados-abertos-rf-cnpj.casadosdados.com.br/`
- **Schema layout:** `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf`
- **Size:** ~85GB uncompressed (~20GB in indexed PostgreSQL)
- **Frequency:** monthly import via worker (Railway)
- **Generated tables:** `company`, `establishment`, `partner`, `simples`
- **Required indexes:** `cnpj_basico` on all tables + `cnpj_cpf_socio` on partner table

### CNPJá (real-time individual CNPJ lookups)
- **Free base URL:** `https://open.cnpja.com/office/{cnpj}`
- **Auth:** none required
- **Rate limit:** 5 req/min per IP (anonymous) / 10 req/min (free account)
- **Returns:** company name, status, CNAE activity, address, partners (QSA), Simples Nacional, MEI

### IBGE (Brazilian Institute of Geography and Statistics)
- **Base URL:** `https://servicodados.ibge.gov.br/api/v3/`
- **Docs:** `https://servicodados.ibge.gov.br/api/docs`
- **Auth:** none required
- **Key endpoints:**
  - `GET /agregados/4714/periodos/-1/variaveis/93?localidades=N3[all]` — population estimates by state
  - `GET /agregados/5938/periodos/-1/variaveis/37?localidades=N3[all]` — GDP by state
  - `GET /agregados/4714/periodos/-1/variaveis/93?localidades=N6[all]` — population by municipality
  - `GET /localidades/estados` — list of all 27 states with IBGE codes
  - `GET /localidades/estados/{uf}/municipios` — municipalities by state
- **Data:** population estimates, GDP, demographic indicators, geographic data
- **Update frequency:** population estimates are annual (July), GDP is annual with ~2 year lag
- **Use case:** population and GDP data for states (per-capita calculations, demographic context)

### Tesouro Transparente — CAPAG and Fiscal Health
- **Base URL:** `https://apidatalake.tesouro.gov.br/ords/`
- **Docs:** `https://www.tesourotransparente.gov.br/`
- **Auth:** none required
- **Key data:**
  - CAPAG ratings (Capacidade de Pagamento) — annual A/B/C/D ratings for states and municipalities
  - Federal transfers to states and municipalities
  - State debt data (Dívida Consolidada Líquida / RCL)
  - Regime de Recuperação Fiscal (fiscal recovery program) status
- **Available via:** Tesouro Transparente portal downloads + SICONFI API
- **Use case:** fiscal health indicators, CAPAG badge on state pages, debt-to-revenue ratios
- **Integration note:** Governor compensation is NOT available from any centralized API. Each of the 27 states publishes executive compensation independently on their own transparency portal. Options: (1) scrape per-state portals, (2) use TSE asset declarations from `divulgacandcontas.tse.jus.br` for declared assets only, (3) hardcode known values with manual updates. Governor asset declarations are available from TSE but only for election years (2022, 2026).

### Tax Collection Data — Impostômetro sources

There is **no public real-time API** for Brazilian tax collection. The original Impostômetro (IBPT/ACSP) at `apiv2.impostometro.com.br` is token-gated and requires a partnership agreement. The "real-time" counter on sites like impostometro.com.br and impostometro.org uses **statistical interpolation**: previous year's actual collection × average 3-year growth rate ÷ milliseconds in a year × elapsed time since Jan 1st. Estimates are corrected as official monthly data is published. Error margin: 2–3.5%.

**Official sources for actual collection data (to feed the interpolation model):**

#### ReceitaData — Receita Federal (federal tax collection)
- **URL:** `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/receitadata/arrecadacao`
- **Also:** `https://dados.gov.br/dados/conjuntos-dados/resultado-da-arrecadacao`
- **Type:** File downloads (XLSX/ODS) — NOT a REST API
- **Auth:** none
- **Data:** historical collection series (1970–present), by state, by municipality, by CNAE, by entity type
- **Update frequency:** monthly, with 1–2 month lag
- **Use case:** authoritative source for federal tax actuals — base data for the interpolation model

#### SICONFI — Tesouro Nacional (state and municipal fiscal data)
- **Base URL:** `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/`
- **Docs:** `https://apidatalake.tesouro.gov.br/docs/siconfi/`
- **Type:** REST/JSON API (OData-like)
- **Auth:** none required
- **Key endpoints:**
  - `/rreo?an_exercicio={year}&nr_periodo={period}&co_tipo_demonstrativo={type}&no_anexo={annex}&id_ente={ibge_code}` — revenue execution (RREO)
  - `/rgf` — fiscal management reports (RGF)
  - `/dca` — annual accounts declarations (DCA)
  - `/msc` — accounting balances matrix (MSC)
- **Pagination:** 5,000 items per page by default
- **Data:** state and municipal tax collection (ICMS, IPVA, ISS, ITCMD, etc.) for all 5,570 municipalities
- **Update frequency:** bimestral/quarterly (as entities submit reports)
- **Use case:** essential for state + municipal portion of the tax counter

#### Portal da Transparência — Receitas (federal budget revenue)
- Already documented above under Portal da Transparência
- Endpoints for "receitas orçamentárias" provide federal revenue data from the budget execution side
- **Use case:** supplementary source for verified federal revenue, filterable by year/date range

#### Ipeadata — IPEA (macroeconomic fiscal data)
- **Base URL:** `http://www.ipeadata.gov.br/api/odata4/`
- **Metadata:** `http://www.ipeadata.gov.br/api/odata4/$metadata`
- **Type:** REST API (OData v4), returns JSON
- **Auth:** none
- **Libraries:** `ipeadatar` (R), `ipeadatapy` (Python)
- **Data:** macroeconomic time series — federal tax revenue, tax burden as % of GDP, fiscal indicators
- **Update frequency:** varies by series, most fiscal series are monthly
- **Use case:** historical context and macro validation (e.g. tax burden % GDP)

#### CONFAZ — State Tax Bulletin
- **URL:** `https://www.confaz.fazenda.gov.br/boletim-de-arrecadacao-dos-tributos-estaduais`
- **Also:** `https://dados.gov.br/dados/conjuntos-dados/boletim-de-arrecadacao-dos-tributos-estaduais`
- **Type:** Bulletin/file downloads — NOT a REST API
- **Data:** collection for all state-level taxes (ICMS, IPVA, ITCMD) for all 27 UFs
- **Update frequency:** monthly/quarterly with lag
- **Use case:** authoritative source for state tax actuals

#### Integration strategy for the Impostômetro
1. **Monthly worker job:** download ReceitaData XLSX (federal) + query SICONFI API (state/municipal) → store latest annual actual in Redis
2. **Interpolation:** annual actual × (1 + avg 3-year growth rate) = estimated current year total
3. **Frontend counter:** estimated total ÷ ms_per_year × elapsed_ms = current value (animated with `requestAnimationFrame`)
4. **Correction:** as each month's official data is published, replace the estimate for that month with the actual and recalculate
5. **Cache:** store the computed annual estimate + per-second rate in Redis with a TTL of 24h

---

## Cache TTL values

```typescript
// packages/fetchers/lib/ttl.ts

export const TTL = {
  // Chamber of Deputies
  CAMARA_DEPUTIES_LIST:     60 * 60 * 24,      // 24h
  CAMARA_DEPUTY_DETAIL:     60 * 60 * 24,      // 24h
  CAMARA_DEPUTY_EXPENSES:   60 * 60 * 6,       // 6h
  CAMARA_DEPUTY_VOTES:      60 * 60 * 3,       // 3h
  CAMARA_DEPUTY_ATTENDANCE: 60 * 60 * 6,       // 6h (yearly bulk file)
  CAMARA_STAFF:             60 * 60 * 24,      // 24h

  // Federal Senate
  SENADO_SENATORS_LIST:     60 * 60 * 24,      // 24h
  SENADO_SENATOR_DETAIL:    60 * 60 * 24,      // 24h
  SENADO_SENATOR_VOTES:     60 * 60 * 3,       // 3h
  SENADO_SENATOR_BILLS:     60 * 60 * 12,      // 12h

  // Transparency Portal
  TRANSP_CIVIL_SERVANTS:    60 * 60 * 24,      // 24h
  TRANSP_SERVANT_COMPENSATION: 60 * 60 * 24,   // 24h (per-servant detail)
  TRANSP_CONTRACTS:         60 * 60 * 12,      // 12h
  TRANSP_BIDS:              60 * 60 * 12,      // 12h
  TRANSP_EARMARKS:          60 * 60 * 24,      // 24h
  TRANSP_BLACKLIST:         60 * 60 * 24 * 7,  // 7d
  TRANSP_PUNISHED:          60 * 60 * 24 * 7,  // 7d (CNEP sanctioned)
  TRANSP_TRAVEL:            60 * 60 * 24,      // 24h
  TRANSP_PAYMENT_CARDS:     60 * 60 * 12,      // 12h
  TRANSP_AGREEMENTS:        60 * 60 * 24,      // 24h (convênios)

  // Political parties
  PARTIES_LIST:             60 * 60 * 24,      // 24h
  PARTY_DETAIL:             60 * 60 * 24,      // 24h
  PARTY_FUND:               60 * 60 * 24 * 7,  // 7d (monthly updates)
  PARTY_ELECTION_RESULTS:   60 * 60 * 24 * 30, // 30d (changes only after elections)

  // Companies
  CNPJ_DETAIL:              60 * 60 * 24 * 7,  // 7d

  // Judiciary (CNJ / DataJud)
  DATAJUD_CASES:            60 * 60 * 6,       // 6h (cases update continuously)
  DATAJUD_MAGISTRATE_CASES: 60 * 60 * 3,       // 3h (active workload)
  DATAJUD_CASE_TREND:       60 * 60 * 24,      // 24h (stable historical data)
  JUDGE_COMPENSATION:       60 * 60 * 24 * 7,  // 7d (scraped from court portals)

  // States (fiscal data)
  STATES_FISCAL_OVERVIEW:   60 * 60 * 24,      // 24h
  STATE_DETAIL:             60 * 60 * 24,      // 24h
  SICONFI_RREO:             60 * 60 * 24 * 7,  // 7d (bimestral source)
  SICONFI_RGF:              60 * 60 * 24 * 7,  // 7d (quadrimestral source)
  IBGE_POPULATION:          60 * 60 * 24 * 30, // 30d (annual estimates)
  IBGE_GDP:                 60 * 60 * 24 * 30, // 30d (annual data)
  CAPAG_RATINGS:            60 * 60 * 24 * 30, // 30d (annual ratings)

  // Tax counter (Impostômetro)
  TAX_COUNTER_ESTIMATE:     60 * 60 * 24,      // 24h (recalculated daily)
  SICONFI_REVENUE:          60 * 60 * 24 * 7,  // 7d (bimestral source)

  // Home dashboard aggregates
  HOME_RANKINGS:            60 * 60 * 2,       // 2h
} as const
```

---

## Database schema (PostgreSQL — Neon)

```prisma
// packages/db/schema.prisma

/// Card displayed in the "Fair or not?" game.
/// Each card represents a real expense, absence, vote, or salary from a public official.
model GameCard {
  id        String     @id @default(cuid())
  /// Card category — determines what data is shown before the reveal
  type      String     // 'expense' | 'attendance' | 'vote' | 'salary'
  /// ID of the item in the original API (used for deduplication)
  sourceId  String
  /// Minimal snapshot for display and rankings.
  /// Stored fields: name, party, state, value, expenseType, photoUrl, sourceUrl
  /// Never store the full raw API response here.
  payload   Json
  createdAt DateTime   @default(now())
  votes     GameVote[]

  @@index([type])
  @@index([sourceId])
}

/// A single vote cast by a user in the "Fair or not?" game.
model GameVote {
  id        String   @id @default(cuid())
  cardId    String
  card      GameCard @relation(fields: [cardId], references: [id])
  /// true = user considers this fair, false = user considers this unfair
  fair      Boolean
  createdAt DateTime @default(now())
  // IP address is NEVER stored here.
  // Flood control is handled exclusively via Redis.
}

// QSA bulk import tables are created dynamically by the worker.
// See DECISIONS.md entry: "Federal Revenue QSA bulk stored locally"
// Tables: Company, Establishment, Partner, Simples
```

---

## Documentation — mandatory for all new code

This project is also a study on AI-assisted software development. **All generated code must be thoroughly documented**, as if read by someone learning how to build data-driven civic tech systems.

### File-level header for every fetcher

```typescript
/**
 * @file camara.ts
 * @description Fetchers for the Câmara dos Deputados Open Data API.
 *
 * The Câmara dos Deputados is the lower house of Brazil's National Congress,
 * with 513 seats elected proportionally by state. It shares legislative power
 * with the Federal Senate (Senado Federal).
 *
 * Official docs: https://dadosabertos.camara.leg.br/swagger/api.html
 * Base URL:      https://dadosabertos.camara.leg.br/api/v2
 * Auth:          none required
 * Rate limit:    not officially documented — use cache generously
 *
 * All fetchers in this file inject the `_source` field automatically via
 * `cachedFetch()`, enabling the frontend to display a link to the exact
 * API call that generated each data point.
 */
```

### JSDoc for every non-trivial function

```typescript
/**
 * Fetches a deputy's CEAP expenses for a given year and optional month.
 *
 * CEAP (Cota para Exercício da Atividade Parlamentar) is the monthly
 * parliamentary allowance each deputy receives to cover mandate-related
 * costs — airfare, fuel, accommodation, meals, printing, etc.
 * The maximum quota amount varies by state (UF), since deputies from
 * more distant states incur higher travel costs to Brasília.
 *
 * @param id    - Deputy's numeric ID in the Câmara API
 * @param year  - Reference year (e.g. 2024). Data available since 2008.
 * @param month - Optional month filter (1–12). Omit to return the full year.
 * @returns List of expense records with `_source` injected for traceability
 * @throws {Error} When the API returns a non-2xx status
 *
 * @example
 * // All expenses for deputy 204554 in March 2024
 * const expenses = await getDeputyExpenses('204554', 2024, 3)
 * console.log(expenses[0]._source)
 * // → 'https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=3'
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__despesas
 */
export async function getDeputyExpenses(
  id: string,
  year: number,
  month?: number
): Promise<WithSource<Expense[]>> { ... }
```

### Inline comments for business logic

```typescript
// Real monthly cost = base salary + total CEAP spending in the period.
// Note: benefits such as housing allowance (auxílio-moradia) and travel
// reimbursements are tracked separately in getOfficialBenefits().
// This figure represents the minimum verifiable direct cost to taxpayers.
const realMonthlyCost = baseSalary + totalCeapThisPeriod

// Political ROI = total received from government ÷ total donated to campaigns.
// Capped at 999x to prevent misleading display when campaign donations ≈ 0.
// A ratio above 10x triggers a warning flag in the UI.
const politicalRoi = Math.min(totalReceived / Math.max(totalDonated, 1), 999)
```

### Component prop documentation

```tsx
interface SourcePillProps {
  /**
   * The exact URL of the API call that generated the associated data point.
   * Sourced from the `_source` field injected by `cachedFetch()`.
   * Clicking this pill opens the URL in a new tab so users can verify
   * the data directly at the official government source.
   */
  url: string
}
```

---

## Tests — mandatory coverage

**All new code must have unit tests in the same commit.** No PR without tests.

### Testing stack

```
Unit + integration tests:  Vitest
Component tests:           @testing-library/react
API mocking:               MSW (Mock Service Worker)
Coverage threshold:        80% (enforced in CI)
```

### Test file colocation

Tests live next to the files they cover:

```
packages/fetchers/
├── camara.ts
└── camara.test.ts       ← covers all exports from camara.ts

apps/web/components/ui/
├── SourcePill.tsx
└── SourcePill.test.tsx  ← covers rendering, link, accessibility
```

### What to test per layer

**Fetchers:**
```typescript
describe('getDeputyExpenses', () => {
  it('returns expenses with _source field injected', async () => { ... })
  it('serves from Redis cache on second call without hitting the API', async () => { ... })
  it('builds the correct URL with all provided parameters', async () => { ... })
  it('throws a descriptive error when the API responds with a non-ok status', async () => { ... })
  it('filters by month when the month parameter is provided', async () => { ... })
  it('returns the full year when month is omitted', async () => { ... })
})
```

**Business logic utilities:**
```typescript
describe('calculateRealDeputyCost', () => {
  it('correctly adds base salary and CEAP total for the period', () => { ... })
  it('returns zero for deputies with no expenses in the period', () => { ... })
  it('handles monetary values returned in different API formats', () => { ... })
})
```

**React components:**
```typescript
describe('SourcePill', () => {
  it('renders an anchor pointing to the provided URL', () => { ... })
  it('opens in a new tab via target="_blank"', () => { ... })
  it('includes rel="noopener noreferrer" for security', () => { ... })
  it('has a descriptive aria-label for screen readers', () => { ... })
})
```

**API Routes:**
```typescript
describe('POST /api/game/vote', () => {
  it('saves the vote and returns the full card reveal payload', async () => { ... })
  it('returns 429 when the same IP votes on the same card twice', async () => { ... })
  it('returns 400 for an invalid or unknown cardId', async () => { ... })
  it('never writes the IP address to the database', async () => { ... })
  it('increments the correct counter (fair vs unfair)', async () => { ... })
})
```

### Mandatory MSW setup

Tests never call real APIs. All external calls are intercepted by MSW:

```typescript
// packages/fetchers/mocks/handlers.ts
export const handlers = [
  http.get(
    'https://dadosabertos.camara.leg.br/api/v2/deputados/:id/despesas',
    ({ params }) => HttpResponse.json(mockExpenses[params.id as string] ?? { dados: [] })
  ),
  http.get(
    'https://api.portaldatransparencia.gov.br/api-de-dados/ceis',
    () => HttpResponse.json(mockBlacklist)
  ),
  // One handler per external endpoint used across all fetchers
]
```

---

## Maintenance — how Claude Code must behave

### Implementing a new feature

Follow this exact sequence:

1. **Read CLAUDE.md first** — always, every session, before writing any code
2. **Create the fetcher** in `packages/fetchers/` with complete JSDoc header and function docs
3. **Write fetcher tests** before the API Route (TDD preferred)
4. **Create the API Route** consuming the fetcher
5. **Create the component** consuming the API Route
6. **Write component tests**
7. **Update CLAUDE.md** if a new endpoint, constant, or pattern was introduced
8. **Update DECISIONS.md** if a non-obvious architectural choice was made

### Listing page pattern (mandatory for all new listings)

Every listing page MUST use `SearchableList` + `DataTable`. See the "Established patterns" section above for full details. Reference implementation: `camara/deputados/`.

```tsx
// Server page — fetch data, pass to client component
export default async function ListingPage() {
  const items = await getItemsList()
  return <ItemsSearchList items={items} />
}

// Client component — SearchableList wraps DataTable
"use client"
export function ItemsSearchList({ items }: { items: Item[] }) {
  return (
    <SearchableList
      items={items}
      searchAccessor={(i) => `${i.name} ${i.party} ${i.uf}`}
      filters={[
        { label: "Partido", accessor: (i) => i.party },
        { label: "UF", accessor: (i) => i.uf },
      ]}
      extraControls={/* optional server-driven controls */}
      pageSize={20}
      placeholder="Buscar por nome, partido ou estado..."
    >
      {(paged) => <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />}
    </SearchableList>
  )
}
```

### Detail page pattern (mandatory for all new detail pages)

Every detail page MUST follow the deputy detail pattern. See "Established patterns" section.

```tsx
// Server page.tsx — fetch + aggregate + render
export default async function DetailPage({ params, searchParams }) {
  const { id } = await params
  const query = await searchParams
  const year = parseYear(query.ano)

  const [detail, expenses] = await Promise.all([getDetail(id), getExpenses(id, year)])

  // Aggregate server-side, pass to client chart component
  const byCategory = aggregateByCategory(expenses)
  const dailyExpenses = aggregateByDay(expenses)

  return (
    <>
      <ProfileHeader ... sourceUrl={detail._source} />
      <InfoPanel fields={infoFields} />
      <StatCards ... />
      <SectionHeader title="Visualizações" sourceUrl={expenses._source} />
      <ExpenseCharts byCategory={byCategory} dailyExpenses={dailyExpenses} sourceUrl={expenses._source} />
      <SectionHeader title="Itens recentes" sourceUrl={expenses._source} action={...} />
      <DataTable ... />
    </>
  )
}
```

### Modifying existing code

- Run existing tests before and after the change to confirm nothing regressed
- Update JSDoc if the function's behaviour or signature changed
- If an endpoint URL changed, update the constant in `lib/endpoints.ts` and the TTL in `lib/ttl.ts`
- If the database schema changed, generate the migration and commit it alongside the code change

### Adding a new data source

1. Create `packages/fetchers/{source}.ts` with file-level header comment
2. Create `packages/fetchers/{source}.test.ts` with full coverage
3. Add MSW handlers in `packages/fetchers/mocks/handlers.ts`
4. Add the TTL constant in `packages/fetchers/lib/ttl.ts`
5. Add endpoint constants in `packages/fetchers/lib/endpoints.ts`
6. Add the source to the data table in both `README.md` and `README.en.md`
7. Document all endpoints in the "Public APIs" section of this file

### Recording architectural decisions

Every time a non-obvious decision is made, record it in `DECISIONS.md`:

```markdown
## YYYY-MM-DD — Short descriptive title

**Context:** Why was this decision needed?

**Decision:** What exactly was decided?

**Consequences:** What changes? What trade-offs were accepted?
```

---

## What NOT to do

- ❌ Store government data (deputies, senators, civil servants, companies, judges) in the database
- ❌ Call `fetch()` directly outside of `cachedFetch()`
- ❌ Display a data point without a `<SourcePill>` component next to it
- ❌ Create an API Route that does not inject `_source` into its response
- ❌ Persist IP addresses in PostgreSQL (Redis only, for flood control)
- ❌ Swallow API errors silently — always log with context and return a graceful fallback
- ❌ Hardcode API URLs inline — use constants from `packages/fetchers/lib/endpoints.ts`
- ❌ Write a non-trivial function without JSDoc
- ❌ Commit new code without tests covering it
- ❌ Call real external APIs in tests — always use MSW handlers
- ❌ Make a non-obvious architectural decision without recording it in `DECISIONS.md`
- ❌ Modify a fetcher without updating its corresponding test file
- ❌ Write code comments, variable names, or test descriptions in Portuguese
