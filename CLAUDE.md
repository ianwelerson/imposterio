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

## Folder structure (high-level)

```
imposterio/
├── apps/
│   ├── web/                        # Next.js App Router
│   │   ├── app/
│   │   │   ├── (home)/             # Home dashboard
│   │   │   ├── camara/             # Chamber of Deputies ✅ WIRED TO REAL API
│   │   │   ├── senado/             # Federal Senate
│   │   │   ├── executivo/          # Federal Executive branch
│   │   │   ├── judiciario/         # Judiciary branch
│   │   │   ├── partidos/           # Political parties
│   │   │   ├── empresas/           # Companies and partner networks
│   │   │   ├── estados/            # State governments and fiscal data
│   │   │   ├── jogo/               # "Fair or not?" game
│   │   │   ├── sobre/              # About page
│   │   │   └── api/game/           # Game API Routes
│   │   ├── lib/analytics.ts        # Umami tracking wrapper
│   │   └── components/
│   │       ├── ui/                  # Base components (barrel: @/components/ui)
│   │       ├── charts/              # Data visualizations (barrel: @/components/charts)
│   │       └── game/                # Game-specific components
│   └── worker/src/qsa-import.ts     # Monthly Federal Revenue QSA importer
├── packages/
│   ├── fetchers/                    # Public API clients
│   │   ├── lib/{cache,endpoints,ttl}.ts
│   │   ├── mocks/handlers.ts        # MSW handlers
│   │   └── {camara,senado,transparencia,tse,cnj,cnpj}.ts
│   ├── db/                          # Prisma schema + typed queries
│   └── types/                       # Shared TypeScript types
├── CLAUDE.md
├── API-REFERENCE.md                 # Full API endpoint documentation
├── DECISIONS.md
└── INTEGRATION.md                   # Master integration checklist
```

Key UI components: `AppShell`, `Sidebar`, `StatCard`, `DataTable`, `SearchableList`, `SectionHeader`, `SourcePill`, `Badge`, `ProfileHeader`, `InfoPanel`, `Toast`
Chart components: `ChartCard`, `BarChart`, `LineChart`, `PieChart`, `TreemapChart`, `CalendarHeatmap`, `StackedBarChart`

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
7. Bulk fetchers: use the shared `redis` singleton (from cache.ts) for
   direct cache reads/writes — never create new Redis() instances
8. Paginated fetchers: store the combined result under a short key
   (e.g. `cam:exp:{id}:{year}`) so repeat requests do 1 GET, not N
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

**Full API reference:** see [`API-REFERENCE.md`](./API-REFERENCE.md) for all endpoint URLs, auth details, rate limits, and bulk file paths.

**Quick reference — base URLs:**
- Câmara: `https://dadosabertos.camara.leg.br/api/v2` (no auth)
- Senado: `https://legis.senado.leg.br/dadosabertos` (no auth, append `.json`)
- Transparência: `https://api.portaldatransparencia.gov.br/api-de-dados` (header `chave-api-dados`)
- DataJud: `https://api-publica.datajud.cnj.jus.br` (POST, ES query body)
- TSE: `https://dadosabertos.tse.jus.br/api/3/` (CKAN)
- IBGE: `https://servicodados.ibge.gov.br/api/v3/` (no auth)
- SICONFI: `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/` (no auth)

**Important notes:**
- `GET /deputados/{id}/votacoes` is **BROKEN** (405 since March 2026) — use `GET /votacoes` + `GET /votacoes/{id}/votos`
- Portal da Transparência requires a free API key (register via email)
- DataJud uses POST with Elasticsearch query bodies
- Tax collection counter uses statistical interpolation (no real-time API exists)

---

## Cache TTL values

**Source of truth:** see [`packages/fetchers/lib/ttl.ts`](./packages/fetchers/lib/ttl.ts) for all TTL constants.

**General strategy:** current-year data uses shorter TTLs (3h–24h); historical/past-year data uses 30-day TTLs. Bulk file summaries are cached under custom Redis keys after server-side aggregation. Paginated fetchers (expenses, speeches, events) store their combined result under a short key (e.g. `cam:exp:{id}:{year}`) to avoid N per-page lookups on repeat requests.

**Redis singleton:** `cache.ts` exports a shared `redis` client instance. All direct cache operations (bulk fetcher reads/writes, combined-result caching) must use this singleton — never instantiate `new Redis()` elsewhere. This reduces connection overhead and command count on Upstash's metered free tier.

**Cache validation:** `cachedFetch()` validates data before writing (non-null object check) and on read (rejects primitives, nulls, corrupt entries). Invalid cache entries are automatically evicted via `redis.del()` to prevent persistent error states.

---

## Database schema (PostgreSQL — Neon)

**Source of truth:** `packages/db/schema.prisma`

Only two models: `GameCard` (expense/attendance/vote/salary cards for the game) and `GameVote` (user votes, IP never stored). QSA bulk tables (`Company`, `Establishment`, `Partner`, `Simples`) are created dynamically by the worker.

---

## Documentation — mandatory for all new code

All generated code must be thoroughly documented — this project doubles as a study in AI-assisted civic tech development. Follow the style already established in `packages/fetchers/camara.ts`:

- **Every fetcher file:** `@file` + `@description` header with institutional context, API docs URL, base URL, auth info
- **Every non-trivial function:** full JSDoc with `@param`, `@returns`, `@throws`, `@example`, `@see`
- **Business logic:** inline comments explaining the "why" (formulas, caps, domain rules)
- **Component props:** JSDoc on interface fields explaining data flow and purpose

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

### Test rules

- Tests live next to files they cover: `camara.ts` → `camara.test.ts`
- **Fetchers:** test `_source` injection, cache hit, URL construction, error handling, parameter filtering
- **Utils:** test calculations, edge cases (zero, missing data), format variations
- **Components:** test rendering, links (`target="_blank"`, `rel="noopener noreferrer"`), accessibility
- **API Routes:** test happy path, rate limiting (429), validation (400), data integrity
- All external calls intercepted by MSW handlers in `packages/fetchers/mocks/handlers.ts`

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

### Page patterns (mandatory)

All new listing and detail pages MUST follow the Câmara reference implementation. See "Established patterns" section above.
- **Listings:** `camara/deputados/` — server page fetches, client component wraps `SearchableList` + `DataTable`
- **Details:** `camara/[id]/page.tsx` — server page fetches + aggregates, renders ProfileHeader → InfoPanel → StatCards → Charts → DataTable

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

Record non-obvious decisions in `DECISIONS.md` with: date, title, context, decision, consequences.

---

## What NOT to do

- ❌ Store government data (deputies, senators, civil servants, companies, judges) in the database
- ❌ Call `fetch()` directly outside of `cachedFetch()`
- ❌ Create `new Redis()` instances in fetchers — use the shared `redis` singleton from `cache.ts`
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
