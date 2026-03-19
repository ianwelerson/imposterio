# Integration Checklist

Master checklist for the integration phase. Organized from simplest to most complex.
Each phase builds on the previous — complete phases in order.

**How to use:** Check this file at the start of every session. Pick the next unchecked item.

---

## Phase 0 — Infrastructure prerequisites

Before any fetcher can work, these foundations must be in place.

- [x] **0.1** Extend `cachedFetch()` to support POST with body-based cache keys
  - Current: caches by URL only. DataJud needs POST + JSON body.
  - Add optional `cacheKey` parameter for custom cache keys.
  - File: `packages/fetchers/lib/cache.ts`

- [ ] **0.2** Add environment variable handling for API keys
  - `TRANSPARENCIA_API_KEY` — Portal da Transparência (free, register via email)
  - `DATAJUD_API_KEY` — CNJ DataJud public key (from wiki, may rotate)
  - Document in `.env.example` and `CLAUDE.md`

- [x] **0.3** Create MSW test server setup
  - File: `packages/fetchers/mocks/server.ts`
  - Configure `setupServer()` with handlers from `handlers.ts`
  - Add Vitest global setup to start/stop the server

---

## Phase 1 — Simple list fetchers (personnel data)

These are the simplest integrations: GET endpoints, no auth, flat JSON responses.
Start here to establish the fetcher pattern for all other phases.

### 1A — Câmara dos Deputados (no auth, best-documented API)

- [x] **1A.1** Create `packages/fetchers/camara.ts` with JSDoc file header
- [x] **1A.2** Implement `getDeputiesList()` — `GET /deputados`
  - Returns: id, name, party, UF, photoUrl, email, legislature
  - TTL: `CAMARA_DEPUTIES_LIST` (24h)
  - Wire to: `camara/page.tsx` table, `camara/deputados/page.tsx` listing
- [x] **1A.3** Implement `getDeputyDetail(id)` — `GET /deputados/{id}`
  - Returns: full profile (name, birthDate, education, office, etc.)
  - TTL: `CAMARA_DEPUTY_DETAIL` (24h)
  - Wire to: `camara/[id]/page.tsx` ProfileHeader + InfoPanel
- [x] **1A.4** Write MSW handlers for deputies list and detail
- [x] **1A.5** Write tests for `getDeputiesList()` and `getDeputyDetail()`
- [x] **1A.6** Implement `getDeputyExpenses(id, year, month?)` — `GET /deputados/{id}/despesas`
  - Returns: date, type, supplier, document, value (valorLiquido)
  - TTL: `CAMARA_DEPUTY_EXPENSES` (6h)
  - MSW handler + 6 tests added
- [x] **1A.7** Wire `getDeputiesList()` to `camara/deputados/page.tsx` and `camara/page.tsx`
  - Replaced mock data with real API call
  - Commented out CEAP/attendance/staff columns (need bulk files — Phase 4)
- [x] **1A.8** Wire `getDeputyDetail()` + `getDeputyExpenses()` to `camara/[id]/page.tsx`
  - Profile header + info panel from real API
  - Expenses table from real API
  - StatCards and voting history commented out (see TODO.md)

### 1B — Senado Federal (no auth, append .json to URLs)

- [ ] **1B.1** Create `packages/fetchers/senado.ts` with JSDoc file header
- [ ] **1B.2** Implement `getSenatorsList()` — `GET /senador/lista/atual.json`
  - Returns: id, name, party, UF, photoUrl
  - TTL: `SENADO_SENATORS_LIST` (24h)
- [ ] **1B.3** Implement `getSenatorDetail(id)` — `GET /senador/{id}.json`
  - Returns: full profile (name, party, UF, term, profession, etc.)
  - TTL: `SENADO_SENATOR_DETAIL` (24h)
- [ ] **1B.4** Write MSW handlers + tests
- [ ] **1B.5** Wire to `senado/senadores/page.tsx` and `senado/[id]/page.tsx`

### 1C — Câmara party data (no auth, simple GET)

- [ ] **1C.1** Implement `getPartiesList()` — `GET /partidos`
  - Returns: id, sigla, name, logo, status
  - TTL: `PARTIES_LIST` (24h)
- [ ] **1C.2** Implement `getPartyDetail(id)` — `GET /partidos/{id}`
  - TTL: `PARTY_DETAIL` (24h)
- [ ] **1C.3** Implement `getPartyMembers(id)` — `GET /partidos/{id}/membros`
- [ ] **1C.4** Write MSW handlers + tests
- [ ] **1C.5** Wire to `partidos/page.tsx`, `partidos/lista/page.tsx`, `partidos/[sigla]/page.tsx`

### 1D — Senado party + committee data

- [ ] **1D.1** Implement `getSenadoParties()` — `GET /senador/partidos.json`
- [ ] **1D.2** Implement `getPermanentCommittees()` — `GET /comissao/lista/permanente.json`
- [ ] **1D.3** Write MSW handlers + tests
- [ ] **1D.4** Wire senator committee counts into listings

---

## Phase 2 — Activity data (votes, bills, speeches)

Still simple GET endpoints, but returns paginated data that needs processing.

### 2A — Deputy activity

- [ ] **2A.1** Implement deputy voting history on detail page
  - ⚠️ `GET /deputados/{id}/votacoes` returns 405 (endpoint removed by Câmara API)
  - Voting session fetchers exist (getVotingSessions, getVotingSessionVotes, etc.)
  - Still need: filter voting sessions by deputy participation on detail page
  - TTL: `CAMARA_DEPUTY_VOTES` (3h)
- [ ] **2A.2** Implement `getDeputyCaucuses(id)` — `GET /deputados/{id}/frentes`
- [ ] **2A.3** Implement `getDeputyCommittees(id)` — `GET /deputados/{id}/orgaos`
- [ ] **2A.4** Write MSW handlers + tests
- [ ] **2A.5** Wire to `camara/[id]/page.tsx` voting history table

### 2C — Câmara legislative agenda (propositions + voting sessions) ✅

- [x] **2C.1** Add 7 types to `proposition.ts` (CamaraProposition, CamaraVotingSession, etc.)
- [x] **2C.2** Add 11 endpoint constants + 10 TTL values
- [x] **2C.3** Implement 9 fetcher functions in `camara.ts`
  - getPropositions (with maxPages cap), getPropositionDetail, getPropositionAuthors,
    getPropositionThemes, getPropositionProgress, getVotingSessions (quarterly date split),
    getVotingSessionDetail, getVotingSessionVotes, getVotingSessionOrientations
- [x] **2C.4** Wire overview page `/camara/pautas/` with charts and StatCards
- [x] **2C.5** Wire proposition listing `/camara/pautas/lista/` with SearchableList
- [x] **2C.6** Wire proposition detail `/camara/pautas/[id]/` with authors, themes, tramitação
- [x] **2C.7** Wire voting sessions listing `/camara/pautas/votacoes/`
- [x] **2C.8** Wire voting session detail `/camara/pautas/votacoes/[id]/` with votes + orientations
- [ ] **2C.9** Write MSW handlers + tests for all 9 new fetcher functions

### 2B — Senator activity

- [ ] **2B.1** Implement `getSenatorBills(id)` — `GET /senador/{id}/autorias.json`
  - TTL: `SENADO_SENATOR_BILLS` (12h)
- [ ] **2B.2** Implement `getSenatorVotes(id)` — `GET /senador/{id}/votacoes.json`
  - TTL: `SENADO_SENATOR_VOTES` (3h)
- [ ] **2B.3** Implement `getSenatorSpeeches(id)` — `GET /senador/{id}/discursos.json`
- [ ] **2B.4** Write MSW handlers + tests
- [ ] **2B.5** Wire to `senado/[id]/page.tsx` bills and voting tables

---

## Phase 3 — Financial data (expenses, compensation)

### 3A — Deputy expenses (CEAP) — Câmara API, no auth ✅

- [x] **3A.1** Implement `getDeputyExpenses(id, year, month?)` — `GET /deputados/{id}/despesas`
  - TTL: `CAMARA_DEPUTY_EXPENSES` (6h)
  - Paginated via HATEOAS `links` array + `extractLastPage()` helper
  - `itens=100` per page, fetches all pages in parallel
- [x] **3A.2** Write MSW handlers + tests
- [x] **3A.3** Wire to `camara/[id]/page.tsx` expenses table + charts
  - StatCards: total CEAP, previous year total, record count, year-over-year %
  - Charts: area (YoY comparison), bar (monthly), treemap (category), heatmap (daily),
    horizontal bar (top suppliers), stacked bar (category × supplier)
  - Full expenses listing at `/camara/{id}/despesas` with search + filters + link to detail pages
- [x] **3A.4** Individual expense detail page at `/camara/{id}/despesas/{docId}`
  - Extended DeputyExpense type with all raw API fields
  - Value StatCards, info panel, internal reference, embedded receipt viewer (iframe)
  - Sentence-case expense type title, deputy name with link, SourcePill
- [ ] **3A.5** Wire aggregated CEAP totals to `camara/page.tsx` StatCards + charts

### 3B — Civil servant compensation — Portal da Transparência (requires API key)

- [ ] **3B.1** Create `packages/fetchers/transparencia.ts` with JSDoc file header
  - Include auth header injection: `chave-api-dados: {TRANSPARENCIA_API_KEY}`
- [ ] **3B.2** Implement `getCivilServants(filters?)` — `GET /servidores`
  - TTL: `TRANSP_CIVIL_SERVANTS` (24h)
  - Filterable by name, agency, role
- [ ] **3B.3** Implement `getServantCompensation(id)` — `GET /servidores/{id}/remuneracao`
  - TTL: `TRANSP_SERVANT_COMPENSATION` (24h)
- [ ] **3B.4** Write MSW handlers + tests
- [ ] **3B.5** Wire to `executivo/servidores/page.tsx` and `executivo/servidores/[id]/page.tsx`

### 3C — Contracts, travel, payment cards — Portal da Transparência

- [ ] **3C.1** Implement `getContracts(filters?)` — `GET /contratos`
  - TTL: `TRANSP_CONTRACTS` (12h)
- [ ] **3C.2** Implement `getTravel(filters?)` — `GET /viagens`
  - TTL: `TRANSP_TRAVEL` (24h)
- [ ] **3C.3** Implement `getPaymentCards(filters?)` — `GET /cartoes`
  - TTL: `TRANSP_PAYMENT_CARDS` (12h)
- [ ] **3C.4** Write MSW handlers + tests
- [ ] **3C.5** Wire to `executivo/page.tsx` tables and StatCards
- [ ] **3C.6** Wire to `executivo/ministros/[id]/page.tsx` contracts + card spending

### 3D — Sanctions (blacklists) — Portal da Transparência

- [ ] **3D.1** Implement `getBlacklistedCompanies(filters?)` — `GET /ceis`
  - TTL: `TRANSP_BLACKLIST` (7d)
- [ ] **3D.2** Implement `getPunishedCompanies(filters?)` — `GET /cnep`
  - TTL: `TRANSP_PUNISHED` (7d)
- [ ] **3D.3** Write MSW handlers + tests
- [ ] **3D.4** Wire to `empresas/page.tsx` blacklist table + StatCards

---

## Phase 4 — Bulk file processing (attendance, staff)

These endpoints return large JSON/ZIP files that need client-side parsing.

- [ ] **4.1** Implement `getDeputyAttendance(year)` — bulk JSON file
  - URL: `CAMARA_BULK_ATTENDANCE(year)`
  - TTL: `CAMARA_DEPUTY_ATTENDANCE` (6h)
  - Parse: extract per-deputy attendance counts from JSON
- [ ] **4.2** Implement `getDeputyStaff()` — bulk JSON file
  - URL: `CAMARA_BULK_STAFF`
  - TTL: `CAMARA_STAFF` (24h)
  - Parse: group staff members by deputy ID, count per deputy
- [ ] **4.3** Write MSW handlers + tests
- [ ] **4.4** Wire attendance to deputy listings and detail pages
- [ ] **4.5** Wire staff counts to `camara/deputados/page.tsx`

---

## Phase 5 — State fiscal data (SICONFI + IBGE)

REST APIs, no auth, but responses need parsing and cross-referencing.

### 5A — IBGE population and GDP

- [ ] **5A.1** Create `packages/fetchers/ibge.ts` with JSDoc file header
- [ ] **5A.2** Implement `getPopulationByState()` — IBGE aggregates API
  - TTL: `IBGE_POPULATION` (30d)
  - Parse nested IBGE response structure
- [ ] **5A.3** Implement `getGDPByState()` — IBGE aggregates API
  - TTL: `IBGE_GDP` (30d)
- [ ] **5A.4** Write MSW handlers + tests
- [ ] **5A.5** Wire to `estados/page.tsx` population column

### 5B — SICONFI tax revenue and fiscal data

- [ ] **5B.1** Create `packages/fetchers/siconfi.ts` with JSDoc file header
- [ ] **5B.2** Implement `getStateRevenue(ibgeCode, year)` — `GET /rreo` (Anexo 03)
  - Returns: ICMS, IPVA, ITCMD breakdown per state
  - TTL: `SICONFI_RREO` (7d)
  - Parse: SICONFI response has nested `items` with accounting codes
- [ ] **5B.3** Implement `getStateBudgetExecution(ibgeCode, year)` — `GET /rreo` (Anexo 08)
  - Returns: education, health, security spending by category
- [ ] **5B.4** Implement `getStateFiscalHealth(ibgeCode, year)` — `GET /rgf`
  - Returns: debt/RCL ratio, personnel limit, consolidated debt
  - TTL: `SICONFI_RGF` (7d)
- [ ] **5B.5** Write MSW handlers + tests
- [ ] **5B.6** Wire to `estados/page.tsx`, `estados/arrecadacao/page.tsx`, `estados/[uf]/page.tsx`

### 5C — CAPAG ratings

- [ ] **5C.1** Implement `getCAPAGRatings()` — Tesouro Transparente
  - TTL: `CAPAG_RATINGS` (30d)
- [ ] **5C.2** Write tests
- [ ] **5C.3** Wire CAPAG badges to estado tables and detail pages

---

## Phase 6 — Company data (CNPJá + QSA bulk)

### 6A — Real-time CNPJ lookups

- [ ] **6A.1** Create `packages/fetchers/cnpja.ts` with JSDoc file header
- [ ] **6A.2** Implement `getCompanyDetail(cnpj)` — `GET /office/{cnpj}`
  - TTL: `CNPJ_DETAIL` (7d)
  - Rate limit: 5 req/min (anonymous)
  - Returns: name, status, CNAE, address, partners (basic)
- [ ] **6A.3** Write MSW handlers + tests
- [ ] **6A.4** Wire to `empresas/[cnpj]/page.tsx`

### 6B — QSA partner graph (PostgreSQL bulk)

- [ ] **6B.1** Implement `packages/db/queries/qsa.ts`
  - `findCompaniesByPartnerCpf(cpf)` — reverse lookup
  - `getCompanyPartners(cnpjBase)` — full QSA list
- [ ] **6B.2** Write tests
- [ ] **6B.3** Wire to `empresas/[cnpj]/page.tsx` partners table

---

## Phase 7 — TSE electoral data (CKAN + file downloads)

Complex: CKAN API is non-standard, some data requires CSV file downloads.

### 7A — Party fund data

- [ ] **7A.1** Create `packages/fetchers/tse.ts` with JSDoc file header
- [ ] **7A.2** Implement `getPartyFundDistribution(year)` — TSE CKAN or cached CSV
  - TTL: `PARTY_FUND` (7d)
- [ ] **7A.3** Write MSW handlers + tests
- [ ] **7A.4** Wire to `partidos/page.tsx` fund charts and `partidos/[sigla]/page.tsx` fund history

### 7B — Election results via CEPESP/FGV

- [ ] **7B.1** Implement `getElectionResultsByParty(party, year)` — CEPESP query API
  - TTL: `PARTY_ELECTION_RESULTS` (30d)
- [ ] **7B.2** Write tests
- [ ] **7B.3** Wire to `partidos/[sigla]/page.tsx` election results table

### 7C — Asset declarations (governors, ministers)

- [ ] **7C.1** Research DivulgaCandContas API availability and rate limits
- [ ] **7C.2** Implement `getCandidateAssets(cpf, electionYear)` if API is viable
- [ ] **7C.3** Wire to minister detail pages and governor listings

---

## Phase 8 — Judiciary (DataJud Elasticsearch)

Most complex integration: POST-based, nested ES responses, requires API key.

- [ ] **8.1** Create `packages/fetchers/cnj.ts` with JSDoc file header
  - Document ES query patterns in file header
- [ ] **8.2** Implement helper `queryDataJud(court, esBody)` — POST to DataJud
  - Handles: API key auth header, POST method, ES response parsing
  - Cache key: hash of court + JSON.stringify(esBody)
- [ ] **8.3** Implement `getCaseCountsByArea(court)` — ES aggregation query
  - TTL: `DATAJUD_CASES` (6h)
- [ ] **8.4** Implement `getCasesByMagistrate(court, judgeName)` — ES match query
  - TTL: `DATAJUD_MAGISTRATE_CASES` (3h)
- [ ] **8.5** Implement `getCaseTrend(court, startYear, endYear)` — ES date histogram
  - TTL: `DATAJUD_CASE_TREND` (24h)
- [ ] **8.6** Write MSW handlers for POST endpoints + tests
- [ ] **8.7** Wire to `judiciario/page.tsx` charts and tables
- [ ] **8.8** Wire to `judiciario/[id]/page.tsx` case lists

---

## Phase 9 — Aggregations and computed metrics

These require data from multiple fetchers, combined and computed.

- [ ] **9.1** Home page StatCards — aggregate counts from all fetchers
  - "Agentes públicos monitorados" = deputies (513) + senators (81) + servants (from API)
  - "Custo mensal estimado" = sum of payrolls across branches
- [ ] **9.2** Home page highlights — algorithmic selection of notable data points
  - Top spender, most absent, highest wealth growth, etc.
- [ ] **9.3** Chart data for overview pages — aggregate from fetcher results
  - CEAP by category, spending by party, attendance vs spending
- [ ] **9.4** Empresas sector distribution — cross-reference contracts with CNAE codes
- [ ] **9.5** Per-capita calculations for estados — SICONFI revenue ÷ IBGE population

---

## Phase 10 — Game system

- [ ] **10.1** Implement `POST /api/game/vote` API route
  - Redis flood control: `vote:{ip}:{cardId}` key, 30-day TTL
  - Save vote to PostgreSQL `game_votes` table
  - Return card reveal payload (official data + source URL)
- [ ] **10.2** Implement `GET /api/game/card` API route
  - Return a random `game_cards` record for the user to vote on
- [ ] **10.3** Implement `GET /api/game/rankings` API route
  - Top N most-disapproved officials, last 30 days
- [ ] **10.4** Implement `packages/db/queries/game.ts`
  - `getRandomCard()`, `castVote(cardId, fair)`, `getRankings(limit, days)`
- [ ] **10.5** Implement card generation logic (seed `game_cards` from real API data)
  - Select notable expenses, absences, salaries from fetcher results
  - Create cards with type, sourceId, payload snapshot
- [ ] **10.6** Wire GameCard components to real API endpoints
- [ ] **10.7** Write tests for all game routes and queries

---

## Phase 11 — Tax counter (Impostômetro) real data

- [ ] **11.1** Build daily worker job: fetch ReceitaData XLSX (federal actuals)
- [ ] **11.2** Query SICONFI API for state + municipal tax collection
- [ ] **11.3** Compute annual estimate: actual × (1 + avg 3-year growth rate)
- [ ] **11.4** Store computed estimate + per-second rate in Redis (TTL: 24h)
- [ ] **11.5** Update `TaxCounter.tsx` to read rate from API instead of hardcoded value

---

## Phase 12 — Worker (QSA bulk import)

- [ ] **12.1** Implement `apps/worker/src/qsa-import.ts` ETL pipeline
  - Download monthly bulk from Receita Federal
  - Parse CSV files (companies, establishments, partners, simples)
  - Upsert into PostgreSQL with proper indexes
- [ ] **12.2** Create database migrations for QSA tables
- [ ] **12.3** Set up Railway deployment for monthly cron
- [ ] **12.4** Write tests for parser and import logic

---

## Phase 13 — Court compensation scraping

Lowest priority — requires HTML scraping, one scraper per court system.

- [ ] **13.1** Research structured data availability across court portals
- [ ] **13.2** Implement STF compensation scraper (`portal.stf.jus.br/remuneracao/`)
- [ ] **13.3** Implement scrapers for top 5 courts (STJ, TST, TJSP, TJRJ, TJMG)
- [ ] **13.4** Cache scraped data with TTL: `JUDGE_COMPENSATION` (7d)
- [ ] **13.5** Wire to magistrate compensation displays

---

## Progress tracker

| Phase | Description | Items | Done |
|-------|-------------|-------|------|
| 0 | Infrastructure | 3 | 2 |
| 1 | Personnel lists | 17 | 8 |
| 2 | Activity data | 19 | 8 |
| 3 | Financial data | 18 | 4 |
| 4 | Bulk files | 5 | 0 |
| 5 | State fiscal | 13 | 0 |
| 6 | Company data | 7 | 0 |
| 7 | TSE electoral | 8 | 0 |
| 8 | Judiciary ES | 8 | 0 |
| 9 | Aggregations | 5 | 0 |
| 10 | Game system | 7 | 0 |
| 11 | Tax counter | 5 | 0 |
| 12 | QSA worker | 4 | 0 |
| 13 | Court scraping | 5 | 0 |
| **Total** | | **124** | **22** |
