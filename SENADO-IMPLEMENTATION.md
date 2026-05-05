# Senado Federal — Implementation Guide

> **Audience:** AI coding agents (Claude Code, Cursor, etc.) tasked with building the Senado Federal section of Imposterio.
>
> **Mandate:** Reach feature parity with the Câmara dos Deputados section, adapted to what Senado APIs actually expose. The Câmara module is the reference implementation — when in doubt, mirror it.
>
> **Before you start:** read `CLAUDE.md`, `API-REFERENCE.md`, `DECISIONS.md`, and `INTEGRATION.md`. Then read `packages/fetchers/camara.ts` and `apps/web/app/camara/[id]/page.tsx` end-to-end. This document assumes you have done so.

---

## 0. State of the world (as of this document)

### What already exists for Senado
- **Endpoint constants** — 8 entries in `packages/fetchers/lib/endpoints.ts` (lines 93–101). Several are deprecated (sunset 2026-02-01, see §10).
- **TTL constants** — 4 entries in `packages/fetchers/lib/ttl.ts` (lines 84–92). Insufficient — needs ~25 more.
- **Types** — `Senator`, `SenatorDetail`, `SenatorBill`, `SenatorVote` in `packages/types/parliamentarian.ts`. Insufficient — needs expansion to match `Deputy*` parity.
- **Pages** — Full UI scaffold under `apps/web/app/senado/**` (14 files, ~1,400 lines) but powered by **mock data only**. Pages exist for: `/senado`, `/senado/senadores`, `/senado/[id]`, `/senado/pautas`, `/senado/pautas/lista`, `/senado/pautas/[id]`.
- **Game integration** — `SenadoGameCard` wired; `GAME_MODULE_LABELS.senado = "Senado Federal"`.

### What does NOT exist
- `packages/fetchers/senado.ts` — does not exist
- `packages/fetchers/senado.test.ts` — does not exist
- Senado MSW handlers in `packages/fetchers/mocks/handlers.ts`
- Any Senado-specific aggregation utils (no `senado-utils.ts`, no `[id]/expense-utils.ts`, etc.)
- Senado constants files (no `lib/constants/senado.ts`, no `senado-calendar.ts`)
- Detail page subroutes: `/senado/[id]/despesas`, `/votacoes`, `/presenca`, `/discursos`, `/comissoes`, `/frentes`, `/proposicoes`
- API routes under `apps/web/app/api/senado/**`
- DECISIONS.md entries for Senado-specific architectural choices

### What pages exist as mock-only and must be rewritten
| Route | File | Mock source to remove |
|---|---|---|
| `/senado` | `app/senado/page.tsx` | hardcoded numbers in JSX |
| `/senado/senadores` | `app/senado/senadores/page.tsx` | inline `MOCK_SENATORS` array |
| `/senado/[id]` | `app/senado/[id]/page.tsx` | hardcoded "Rodrigo Tavares" object |
| `/senado/pautas` | `app/senado/pautas/page.tsx` + `pautas/mock-data.ts` | `MOCK_PROPOSITIONS` |
| `/senado/pautas/lista` | `app/senado/pautas/lista/page.tsx` | same |
| `/senado/pautas/[id]` | `app/senado/pautas/[id]/page.tsx` | same |

The mock UI is high quality and demonstrates the desired final layout — keep the JSX skeletons, swap data sources.

---

## 1. Architectural ground rules (NEVER violate)

These come from `CLAUDE.md` and apply to all new code:

1. **No government data persisted in PostgreSQL.** Senate data flows API → `cachedFetch()` → Redis → UI. Period.
2. **Every external call goes through `cachedFetch()`** in `packages/fetchers/lib/cache.ts`. Never `fetch()` direct.
3. **Every data point returned to the frontend MUST carry `_source`.** This is the core value proposition.
4. **Every visible data point MUST render `<SourcePill url={_source} />` next to it.**
5. **Use the shared `redis` singleton** from `cache.ts` for any direct Redis ops. Never `new Redis()`.
6. **All code, comments, JSDoc, test descriptions in English.** UI strings in Brazilian Portuguese.
7. **Tests are mandatory in the same commit.** No PR without tests. MSW only — no real API calls in tests.

---

## 2. Câmara module → Senado module: feature mapping

Use this table as the master scope checklist. Each row tells you what Câmara has, whether/how it maps to Senado, and the Senado data source. **All checkboxes are unchecked — track progress here as you build.**

### 2.1 Section-level features (top-level routes)

| # | Câmara route | Senado route | Status | Senado data source |
|---|---|---|---|---|
| 1 | `/camara` overview | `/senado` overview | rebuild | aggregate of senators + processos + votacao + ceaps |
| 2 | `/camara/deputados` listing | `/senado/senadores` listing | rebuild | `getSenatorsList()` + CEAPS bulk + attendance bulk |
| 3 | `/camara/[id]` detail | `/senado/[id]` detail | rebuild | 14+ parallel fetchers (see §6) |
| 4 | `/camara/[id]/despesas` | `/senado/[id]/despesas` | new | CEAPS detail filtered by senator |
| 5 | `/camara/[id]/votacoes` | `/senado/[id]/votacoes` | new | `GET /votacao?codigoParlamentar=...` |
| 6 | `/camara/[id]/presenca` | `/senado/[id]/presenca` | new | aggregated `/plenario/resultado/mes/{YYYYMM}` |
| 7 | `/camara/[id]/discursos` | `/senado/[id]/discursos` | new | `getSenatorSpeeches(id)` |
| 8 | `/camara/[id]/comissoes` | `/senado/[id]/comissoes` | new | `getSenatorCommittees(id)` |
| 9 | `/camara/[id]/frentes` | ❌ N/A | skip | Senado has no "frentes parlamentares" equivalent — skip the route |
| 10 | `/camara/[id]/proposicoes` | `/senado/[id]/proposicoes` | new | `GET /processo?codigoParlamentarAutor={id}` |
| 11 | `/camara/comparar` | `/senado/comparar` | new | reuse comparison patterns with senator data |
| 12 | `/camara/pautas` overview | `/senado/pautas` (exists) | rewire | `getPropositions()` (Senado) + voting sessions |
| 13 | `/camara/pautas/lista` | `/senado/pautas/lista` (exists) | rewire | same |
| 14 | `/camara/pautas/[id]` | `/senado/pautas/[id]` (exists) | rewire | `getPropositionDetail(id)` (Senado) |
| 15 | `/camara/pautas/votacoes` | `/senado/pautas/votacoes` | new | `GET /votacao?dataInicio=&dataFim=` |
| 16 | `/camara/pautas/votacoes/[id]` | `/senado/pautas/votacoes/[id]` | new | single voting session detail |
| 17 | `/camara/licitacoes` + sub | `/senado/contratacoes` (institutional, optional Phase 4) | optional | `adm-dadosabertos/api/v1/contratacoes/*` |
| 18 | `/camara/funcionarios` + sub | `/senado/servidores` (institutional, optional Phase 4) | optional | `adm-dadosabertos/api/v1/servidores/*` |
| 19 | `/camara/eventos/[id]` | `/senado/sessoes/[id]` | new | `/plenario/encontro/{codigo}` |

### 2.2 Detail page sections (in render order on `/senado/[id]`)

This mirrors `apps/web/app/camara/[id]/page.tsx` section-by-section. Each row = a section in the page. Items marked **Skip** are not feasible on Senado APIs and should not be built.

| # | Câmara section | Senado equivalent | Build? | Notes / data source |
|---|---|---|---|---|
| 1 | ProfileHeader (photo, tags, year selector) | same | ✅ | `getSenatorDetail(id)` |
| 2 | InfoPanel (Dados pessoais) | same | ✅ | civil name, birth date, naturalidade, education (`historicoAcademico`), professions, email, address, phones — same fields, different source paths |
| 3 | Resumo geral (StatCards + RedFlags + RealMandateCost + CostPerOutput) | same with adapted denominators | ✅ (adapted) | see §7 for mandate cost adjustments |
| 4 | Gastos CEAP (StatCards + DeputyExpenseCharts + ExpenseMapSection) | Gastos CEAPS | ✅ | use admin JSON API §3.2; full chart parity (year-over-year, monthly bar, calendar heatmap, treemap, top suppliers, stacked bar, Brazil map) |
| 5 | Verba de Gabinete | ❌ Skip | skip | Senado has no equivalent — CEAPS is consolidated. Replace with **Auxílio-moradia + housing benefit** if the senator receives it (see §3.4 of API research) |
| 6 | Proposições (StatCards + PropositionSection) | same | ✅ | `GET /processo?codigoParlamentarAutor={id}` for current year + full mandate |
| 7 | Votações (StatCards + VotingCharts) | same | ✅ | `GET /votacao?codigoParlamentar={id}&dataInicio=&dataFim=` |
| 8 | Presença (Attendance hero + AttendanceOverviewCharts) | same (constructed) | ✅ (custom) | aggregate from `/plenario/resultado/mes/{YYYYMM}` × 12; no shortcut endpoint exists |
| 9 | Discursos (StatCards + KeywordTagCloud + SpeechCharts) | same | ✅ | `getSenatorSpeeches(id, dataInicio, dataFim)` |
| 10 | Comissões (StatCards + CommitteeCharts) | same | ✅ | `getSenatorCommittees(id)` + `getSenatorPositions(id)` |
| 11 | Frentes Parlamentares (CaucusDetailSection) | ❌ Skip | skip | No frentes in Senado. Replace with **Lideranças** (leadership roles) using `getSenatorLeaderships(id)` |
| 12 | Carreira política (Mandates + History + Occupations + Professions) | same | ✅ | `getSenatorMandates(id)` + `getSenatorAffiliations(id)` + `getSenatorAcademic(id)` + `getSenatorProfessions(id)` |

### 2.3 Charts (full parity)

All chart components in `apps/web/components/charts/` are reusable as-is. Senado pages must consume the same primitives:

- `BarChart` (with `horizontal=true` for long labels)
- `LineChart` (with `area=true` for filled YoY)
- `PieChart` (donut by default)
- `TreemapChart` (for category proportions)
- `CalendarHeatmap` (for daily intensity, with `recessDays` annotation)
- `StackedBarChart` (for category × supplier)
- `BrazilMap` (for senator's UF highlight)
- `ChartCard` wrapper with `sourceUrl` prop for `SourcePill`

### 2.4 Analysis modules (the "7 transparency modules")

All of these live in `apps/web/lib/analysis/*.ts` for Câmara. **All must be ported to work with Senado data**, with adapted denominators and data sources. Some have direct equivalents; others need adaptation.

| Module | Câmara source | Senado adaptation |
|---|---|---|
| `ceap-concentration` | top supplier % of total CEAP | port as-is, swap CEAP→CEAPS |
| `ceap-utilization` | % of monthly cap consumed | **see §7.1** — Senado quota varies by UF; build a UF-keyed cap table |
| `ceap-ranking` | rank within party + UF | port as-is, swap data source |
| `voting-alignment` | party + winning side + government | port as-is using new `/votacao` endpoint |
| `legislative-efficiency` | approved / authored | port as-is using `/processo` |
| `real-mandate-cost` | CEAP + verba gabinete + salary | **adapt** — drop verba gabinete, keep CEAPS + subsídio + cabinet payroll (sum of comissionados in senator's `lotacao`) |
| `cost-per-output` | confirmed cost / outputs | port as-is using adapted real-mandate-cost |
| `national-benchmarks` | percentile + vs-average | port as-is, recompute against 81-senator universe |
| `absence-ceap` | CEAP spending on no-attendance days | port as-is |

### 2.5 UI components (all reusable as-is)

These live under `apps/web/components/ui/` and `apps/web/components/charts/` and require **no changes** for Senado. Just import and use:

`AppShell`, `Sidebar`, `StatCard`, `DataTable`, `SearchableList`, `SectionHeader`, `SourcePill`, `Badge`, `Acronym`, `ProfileHeader`, `InfoPanel`, `Toast`, `ToastTrigger`, `DataFetchError`, `EmptyState`, `AvatarInitials`, `YearSelector` (move from `app/camara/[id]/YearSelector.tsx` to a shared location if not already shared).

If `YearSelector` is currently nested under `app/camara/`, **promote it** to `apps/web/components/ui/YearSelector.tsx` so Senado can reuse it cleanly. Do this in a small refactor commit before starting Senado page work.

---

## 3. Endpoints to add (`packages/fetchers/lib/endpoints.ts`)

Replace the existing 8 Senado constants and add new ones. Critical: **migrate deprecated endpoints** to their replacements (sunset was 2026-02-01).

### 3.1 Base URLs (already present, verify)

```ts
SENADO: "https://legis.senado.leg.br/dadosabertos"
SENADO_ADMIN: "https://adm.senado.gov.br/adm-dadosabertos"
SENADO_TRANSPARENCY: "https://www.senado.leg.br/transparencia/LAI/verba"
```

### 3.2 Constants to add

```ts
// ─── Senators ───
SENADO_SENATORS: `${BASE_URLS.SENADO}/senador/lista/atual.json`
SENADO_SENATORS_ON_LEAVE: `${BASE_URLS.SENADO}/senador/afastados.json`
SENADO_SENATORS_BY_LEGISLATURE(leg): `${BASE_URLS.SENADO}/senador/lista/legislatura/${leg}.json`
SENADO_SENATOR(id): `${BASE_URLS.SENADO}/senador/${id}.json`
SENADO_SENATOR_MANDATES(id): `${BASE_URLS.SENADO}/senador/${id}/mandatos.json`
SENADO_SENATOR_AFFILIATIONS(id): `${BASE_URLS.SENADO}/senador/${id}/filiacoes.json`
SENADO_SENATOR_LEADERSHIPS(id): `${BASE_URLS.SENADO}/senador/${id}/liderancas.json`
SENADO_SENATOR_COMMITTEES(id): `${BASE_URLS.SENADO}/senador/${id}/comissoes.json`
SENADO_SENATOR_POSITIONS(id): `${BASE_URLS.SENADO}/senador/${id}/cargos.json`
SENADO_SENATOR_LEAVES(id): `${BASE_URLS.SENADO}/senador/${id}/licencas.json`
SENADO_SENATOR_ACADEMIC(id): `${BASE_URLS.SENADO}/senador/${id}/historicoAcademico.json`
SENADO_SENATOR_PROFESSIONS(id): `${BASE_URLS.SENADO}/senador/${id}/profissao.json`
SENADO_SENATOR_SPEECHES(id): `${BASE_URLS.SENADO}/senador/${id}/discursos.json`
SENADO_SENATOR_INTERJECTIONS(id): `${BASE_URLS.SENADO}/senador/${id}/apartes.json`

// ─── DEPRECATED (keep as fallback only, log deprecation warning) ───
// SENADO_SENATOR_VOTES — replaced by SENADO_VOTING with codigoParlamentar query param
// SENADO_SENATOR_BILLS — replaced by SENADO_PROCESS_SEARCH with codigoParlamentarAutor

// ─── Voting (NEW unified API) ───
SENADO_VOTING: `${BASE_URLS.SENADO}/votacao` // accepts: codigoParlamentar, dataInicio, dataFim, idProcesso, codigoSessao
SENADO_VOTING_COMMITTEE_BY_PARLAMENTAR(id): `${BASE_URLS.SENADO}/votacaoComissao/parlamentar/${id}`
SENADO_VOTING_COMMITTEE_BY_MATTER(sigla, num, ano): `${BASE_URLS.SENADO}/votacaoComissao/materia/${sigla}/${num}/${ano}`
SENADO_VOTING_COMMITTEE_BY_COMMITTEE(sigla): `${BASE_URLS.SENADO}/votacaoComissao/comissao/${sigla}`
SENADO_VOTING_ORIENTATION_DATE(data): `${BASE_URLS.SENADO}/plenario/votacao/orientacaoBancada/${data}`
SENADO_VOTING_ORIENTATION_RANGE(ini, fim): `${BASE_URLS.SENADO}/plenario/votacao/orientacaoBancada/${ini}/${fim}`

// ─── Propositions (NEW process API) ───
SENADO_PROCESS_SEARCH: `${BASE_URLS.SENADO}/processo` // accepts: sigla, numero, ano, idProcesso, codigoParlamentarAutor, termo
SENADO_PROCESS(id): `${BASE_URLS.SENADO}/processo/${id}`
SENADO_PROCESS_RAPPORTEURSHIP: `${BASE_URLS.SENADO}/processo/relatoria`
SENADO_PROCESS_DOCUMENTS: `${BASE_URLS.SENADO}/processo/documento`
SENADO_PROCESS_AMENDMENTS: `${BASE_URLS.SENADO}/processo/emenda`
SENADO_PROCESS_DEADLINES: `${BASE_URLS.SENADO}/processo/prazo`

// ─── Plenary sessions & attendance ───
SENADO_PLENARY_AGENDA_DAY(yyyymmdd): `${BASE_URLS.SENADO}/plenario/agenda/dia/${yyyymmdd}`
SENADO_PLENARY_AGENDA_MONTH(yyyymm): `${BASE_URLS.SENADO}/plenario/agenda/mes/${yyyymm}`
SENADO_PLENARY_RESULT_DAY(yyyymmdd): `${BASE_URLS.SENADO}/plenario/resultado/${yyyymmdd}`
SENADO_PLENARY_RESULT_MONTH(yyyymm): `${BASE_URLS.SENADO}/plenario/resultado/mes/${yyyymm}`
SENADO_PLENARY_LEGISLATURES: `${BASE_URLS.SENADO}/plenario/lista/legislaturas`
SENADO_PLENARY_SESSION_TYPES: `${BASE_URLS.SENADO}/plenario/tiposSessao`
SENADO_PLENARY_ATTENDANCE_TYPES: `${BASE_URLS.SENADO}/plenario/lista/tiposComparecimento`
SENADO_PLENARY_SPEECHES_RANGE(ini, fim): `${BASE_URLS.SENADO}/plenario/lista/discursos/${ini}/${fim}`
SENADO_PLENARY_SESSION(codigo): `${BASE_URLS.SENADO}/plenario/encontro/${codigo}`
SENADO_PLENARY_SESSION_AGENDA(codigo): `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/pauta`
SENADO_PLENARY_SESSION_RESULT(codigo): `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/resultado`
SENADO_PLENARY_SESSION_SUMMARY(codigo): `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/resumo`

// ─── Stenographic ───
SENADO_TAQUIGRAFIA_SESSION_NOTES(idSessao): `${BASE_URLS.SENADO}/taquigrafia/notas/sessao/${idSessao}`
SENADO_TAQUIGRAFIA_SESSION_VIDEOS(idSessao): `${BASE_URLS.SENADO}/taquigrafia/videos/sessao/${idSessao}`
SENADO_TAQUIGRAFIA_MEETING_NOTES(idReuniao): `${BASE_URLS.SENADO}/taquigrafia/notas/reuniao/${idReuniao}`
SENADO_TAQUIGRAFIA_MEETING_VIDEOS(idReuniao): `${BASE_URLS.SENADO}/taquigrafia/videos/reuniao/${idReuniao}`

// ─── Committees ───
SENADO_PERMANENT_COMMITTEES: `${BASE_URLS.SENADO}/comissao/lista/permanente.json`
SENADO_COMMITTEE_LIST(tipo): `${BASE_URLS.SENADO}/comissao/lista/${tipo}.json` // tipo: permanente | CPI | mistas
SENADO_COMMITTEE_COLEGIADOS: `${BASE_URLS.SENADO}/comissao/lista/colegiados.json`

// ─── Parties & blocs ───
SENADO_PARTIES: `${BASE_URLS.SENADO}/senador/partidos.json`
SENADO_BLOCS: `${BASE_URLS.SENADO}/dados/ListaBlocoParlamentar.json`

// ─── Leadership ───
SENADO_LEADERSHIP_COMPOSITION: `${BASE_URLS.SENADO}/composicao/lideranca`

// ─── CEAPS (admin API — preferred) ───
SENADO_CEAPS_BY_YEAR(ano): `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/despesas_ceaps/${ano}`
SENADO_CEAPS_BY_YEAR_CSV(ano): `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/despesas_ceaps/${ano}/csv`
SENADO_OFFICES: `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/escritorios`
SENADO_HOUSING_AID: `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/auxilio-moradia`

// ─── CEAPS (LAI CSV — historical fallback) ───
SENADO_CEAPS_LAI_CSV(ano): `${BASE_URLS.SENADO_TRANSPARENCY}/despesa_ceaps_${ano}.csv`

// ─── Civil servants (institutional, Phase 4) ───
SENADO_SERVANTS_BY_OFFICE: `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/servidores`
SENADO_SERVANTS_REMUNERATION(ano, mes): `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/remuneracoes/${ano}/${mes}`
SENADO_SERVANTS_HEADCOUNT: `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/quantitativos/pessoal`

// ─── Vetos ───
SENADO_VETOS_BY_YEAR(ano): `${BASE_URLS.SENADO}/materia/vetos/${ano}`
```

### 3.3 Migration table — what each existing constant becomes

| Old constant | New treatment |
|---|---|
| `SENADO_SENATORS` | unchanged |
| `SENADO_SENATOR(id)` | unchanged |
| `SENADO_SENATOR_HISTORY(id)` | **delete** — alias of `SENADO_SENATOR(id)`; not needed |
| `SENADO_SENATOR_VOTES(id)` | **delete** — replaced by `SENADO_VOTING` with `codigoParlamentar` query param |
| `SENADO_SENATOR_BILLS(id)` | **delete** — replaced by `SENADO_PROCESS_SEARCH` with `codigoParlamentarAutor` |
| `SENADO_SENATOR_SPEECHES(id)` | unchanged |
| `SENADO_SENATOR_INTERJECTIONS(id)` | unchanged |
| `SENADO_PERMANENT_COMMITTEES` | unchanged |
| `SENADO_PARTIES` | unchanged |
| `SENADO_BLOCS` | unchanged |

---

## 4. TTLs to add (`packages/fetchers/lib/ttl.ts`)

Apply the same strategy as Câmara: short for current-year live data, 30 days for historical/static.

```ts
SENADO_SENATORS_LIST: 60 * 60 * 24,             // 24h — list of 81 senators
SENADO_SENATORS_ON_LEAVE: 60 * 60 * 6,          // 6h — afastados changes occasionally
SENADO_SENATOR_DETAIL: 60 * 60 * 24,            // 24h
SENADO_SENATOR_MANDATES: 60 * 60 * 24 * 30,     // 30d — historical
SENADO_SENATOR_AFFILIATIONS: 60 * 60 * 24 * 30, // 30d — historical
SENADO_SENATOR_LEADERSHIPS: 60 * 60 * 12,       // 12h
SENADO_SENATOR_COMMITTEES: 60 * 60 * 24,        // 24h
SENADO_SENATOR_POSITIONS: 60 * 60 * 24,         // 24h
SENADO_SENATOR_LEAVES: 60 * 60 * 6,             // 6h
SENADO_SENATOR_ACADEMIC: 60 * 60 * 24 * 30,     // 30d — static
SENADO_SENATOR_PROFESSIONS: 60 * 60 * 24 * 30,  // 30d — static

SENADO_VOTING: 60 * 60 * 3,                     // 3h — current year
SENADO_VOTING_HISTORY: 60 * 60 * 24 * 30,       // 30d — past years
SENADO_VOTING_DETAIL: 60 * 60 * 12,             // 12h — finalized after session
SENADO_VOTING_ORIENTATION: 60 * 60 * 12,        // 12h

SENADO_PROCESS_SEARCH: 60 * 60 * 3,             // 3h
SENADO_PROCESS_DETAIL: 60 * 60 * 6,             // 6h
SENADO_PROCESS_AUTHORS: 60 * 60 * 24,           // 24h

SENADO_PLENARY_AGENDA: 60 * 60 * 1,             // 1h — agenda updates intra-day
SENADO_PLENARY_RESULT: 60 * 60 * 6,             // 6h — current-year session results
SENADO_PLENARY_RESULT_HISTORY: 60 * 60 * 24 * 30, // 30d — past-year results
SENADO_PLENARY_LEGISLATURES: 60 * 60 * 24 * 30, // 30d — static
SENADO_PLENARY_SESSION_DETAIL: 60 * 60 * 6,     // 6h

SENADO_SENATOR_SPEECHES: 60 * 60 * 12,          // 12h
SENADO_SENATOR_INTERJECTIONS: 60 * 60 * 12,     // 12h
SENADO_PLENARY_SPEECHES: 60 * 60 * 6,           // 6h

SENADO_COMMITTEES_LIST: 60 * 60 * 24,           // 24h
SENADO_PARTIES: 60 * 60 * 24,                   // 24h
SENADO_BLOCS: 60 * 60 * 24,                     // 24h
SENADO_LEADERSHIP_COMPOSITION: 60 * 60 * 12,    // 12h

SENADO_CEAPS_BULK: 60 * 60 * 6,                 // 6h — current year (admin API updates daily)
SENADO_CEAPS_BULK_HISTORY: 60 * 60 * 24 * 30,   // 30d — past years
SENADO_CEAPS_LAI: 60 * 60 * 24 * 30,            // 30d — CSV is static
SENADO_OFFICES: 60 * 60 * 24,                   // 24h
SENADO_HOUSING_AID: 60 * 60 * 24,               // 24h

SENADO_SERVANTS_BULK: 60 * 60 * 24,             // 24h
SENADO_SERVANTS_REMUNERATION: 60 * 60 * 24 * 7, // 7d — published monthly

SENADO_ATTENDANCE_BULK: 60 * 60 * 1,            // 1h — composed from /plenario/resultado/mes
SENADO_ATTENDANCE_BULK_HISTORY: 60 * 60 * 24 * 30, // 30d — past years
```

---

## 5. Types to add (`packages/types/parliamentarian.ts`)

Existing `Senator`, `SenatorDetail`, `SenatorBill`, `SenatorVote` are insufficient. Expand to mirror the `Deputy*` family.

### 5.1 Audit existing types and update

- `Senator` — verify fields match `getSenatorsList()` return shape (id, name, party, uf, photoUrl, email, legislature). Keep.
- `SenatorDetail` — extend to match `DeputyDetail`: add fullName, birthDate, birthPlace, education, office, situation, electoralName, phones, address, services (URLs).

### 5.2 New types to add

Create one type per Câmara analog. Mirror the field naming exactly (English camelCase) to maximize component reuse.

```ts
SenatorMandate          // mirrors DeputyMandate
SenatorAffiliation      // party history (Filiação)
SenatorLeadership       // mirrors leadership roles (Liderança)
SenatorCommittee        // mirrors DeputyCommittee
SenatorPosition         // committee chair/vice roles (Cargo)
SenatorLeave            // licenças (LeaveType, dates)
SenatorAcademicCourse   // mirrors DeputyProfession w/ institution
SenatorProfession       // mirrors DeputyProfession
SenatorSpeech           // mirrors DeputySpeech
SenatorInterjection     // aparte (very similar to speech)
SenatorExpense          // mirrors DeputyExpense (CEAPS row)
SenatorVotingRecord     // mirrors DeputyVotingRecord (one record per vote in /votacao)
SenatorAttendanceDay    // synthesized: one row per (senator, session) from /plenario/resultado
SenatorAttendanceDetail // aggregate: total sessions, attended, percentage
SenatorOffice           // regional escritório (from admin API)
SenatorHousingAid       // boolean flags from admin API
```

### 5.3 Shared types (already in `proposition.ts`)

`Proposition`, `PropositionVote`, `PropositionTimelineEvent`, `PropositionCommittee`, `RelatedProposition`, `VoteTally` — these are already designed to be Câmara/Senado agnostic. Reuse as-is.

You will need a Senado-specific raw-to-clean mapper that handles the `/processo` flat array shape and emits these shared types.

### 5.4 Field mapping conventions

When mapping raw Senado API responses, normalize like Câmara does:

| Raw (Senado) | Clean | Notes |
|---|---|---|
| `CodigoParlamentar` | `id` | always coerce to string |
| `NomeParlamentar` | `name` | |
| `NomeCompletoParlamentar` | `fullName` | |
| `SiglaPartidoParlamentar` | `party` | |
| `UfParlamentar` | `uf` | |
| `UrlFotoParlamentar` | `photoUrl` | |
| `EmailParlamentar` | `email` | |
| `DataNascimento` | `birthDate` | ISO format, normalize from `YYYY-MM-DD` |
| `Naturalidade` + `UfNaturalidade` | `birthPlace` | concat as `"City - UF"` |
| `idProcesso` | `id` (proposition) | already lowercase in flat-array endpoints |
| `identificacao` | `identifier` | e.g. "PL 602/2025" |
| `ementa` | `summary` | |

---

## 6. The `senado.ts` fetcher file — function-by-function spec

**File:** `packages/fetchers/senado.ts`

Follow the structure of `camara.ts`:
1. File header JSDoc (institutional context, API URL, base URL, auth, format note about `Accept: application/json`)
2. Internal raw types (one per endpoint, NOT exported)
3. Public fetcher functions (alphabetical or by feature group)
4. Private mapping functions at the bottom

### 6.1 Helpers to add

```ts
/**
 * Senado legacy endpoints serialize single-element arrays as objects.
 * Always coerce: a senator with one mandate gets Mandato: {...} not [...].
 */
function ensureArray<T>(x: T | T[] | undefined | null): T[] {
  if (Array.isArray(x)) return x
  if (x == null) return []
  return [x]
}

/**
 * Some Senado endpoints default to XML when no Accept header is sent.
 * Always pass Accept: application/json for safety.
 */
const SENADO_HEADERS = { Accept: "application/json" } as const
```

Pass `SENADO_HEADERS` as `options.headers` to every `cachedFetch()` call.

### 6.2 Function specifications

For each function below:
- Signature shows what the agent should implement
- Endpoint shows the URL (use the constants from §3.2)
- Wrapper shows the path inside the response to extract data
- TTL shows which constant to use

```ts
// ─── Senators ───

getSenatorsList(): Promise<WithSource<Senator[]>>
  // GET SENADO_SENATORS
  // Wrapper: ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]
  // TTL: SENADO_SENATORS_LIST

getSenatorsOnLeave(): Promise<WithSource<Senator[]>>
  // GET SENADO_SENATORS_ON_LEAVE
  // Wrapper: AfastamentoAtual.Parlamentares.Parlamentar[]
  // TTL: SENADO_SENATORS_ON_LEAVE

getSenatorDetail(id: string): Promise<WithSource<SenatorDetail>>
  // GET SENADO_SENATOR(id)
  // Wrapper: DetalheParlamentar.Parlamentar.{IdentificacaoParlamentar, DadosBasicosParlamentar, Telefones, OutrasInformacoes}
  // TTL: SENADO_SENATOR_DETAIL

getSenatorMandates(id: string): Promise<WithSource<SenatorMandate[]>>
  // GET SENADO_SENATOR_MANDATES(id)
  // Wrapper: MandatoParlamentar.Parlamentar.Mandatos.Mandato[] (use ensureArray)
  // TTL: SENADO_SENATOR_MANDATES

getSenatorAffiliations(id: string): Promise<WithSource<SenatorAffiliation[]>>
  // GET SENADO_SENATOR_AFFILIATIONS(id)
  // Wrapper: FiliacaoParlamentar.Parlamentar.Filiacoes.Filiacao[]
  // TTL: SENADO_SENATOR_AFFILIATIONS

getSenatorLeaderships(id: string): Promise<WithSource<SenatorLeadership[]>>
  // GET SENADO_SENATOR_LEADERSHIPS(id)
  // Wrapper: LiderancaParlamentar.Parlamentar.Liderancas.Lideranca[]
  // TTL: SENADO_SENATOR_LEADERSHIPS

getSenatorCommittees(id: string): Promise<WithSource<SenatorCommittee[]>>
  // GET SENADO_SENATOR_COMMITTEES(id)
  // Wrapper: MembroComissaoParlamentar.Parlamentar.MembroComissoes.Comissao[]
  // TTL: SENADO_SENATOR_COMMITTEES

getSenatorPositions(id: string): Promise<WithSource<SenatorPosition[]>>
  // GET SENADO_SENATOR_POSITIONS(id)
  // Wrapper: CargoParlamentar.Parlamentar.Cargos.Cargo[]
  // TTL: SENADO_SENATOR_POSITIONS

getSenatorLeaves(id: string, dataInicio?: string, dataFim?: string): Promise<WithSource<SenatorLeave[]>>
  // GET SENADO_SENATOR_LEAVES(id) ?dataInicio=&dataFim=
  // Wrapper: LicencaParlamentar.Parlamentar.Licencas.Licenca[]
  // TTL: SENADO_SENATOR_LEAVES

getSenatorAcademic(id: string): Promise<WithSource<SenatorAcademicCourse[]>>
  // GET SENADO_SENATOR_ACADEMIC(id)
  // Wrapper: HistoricoAcademicoParlamentar.Parlamentar.HistoricoAcademico.Curso[]
  // TTL: SENADO_SENATOR_ACADEMIC

getSenatorProfessions(id: string): Promise<WithSource<SenatorProfession[]>>
  // GET SENADO_SENATOR_PROFESSIONS(id)
  // ⚠ wrapper outer key is also "HistoricoAcademicoParlamentar" but inner path is .Parlamentar.Profissoes.Profissao[]
  // TTL: SENADO_SENATOR_PROFESSIONS

getSenatorSpeeches(id: string, dataInicio?: string, dataFim?: string): Promise<WithSource<SenatorSpeech[]>>
  // GET SENADO_SENATOR_SPEECHES(id) ?dataInicio=&dataFim=  (YYYYMMDD format)
  // ⚠ DEFAULT WINDOW IS LAST 30 DAYS — always pass dates explicitly for full year
  // Wrapper: DiscursosParlamentar.Parlamentar.Pronunciamentos.Pronunciamento[]
  // TTL: SENADO_SENATOR_SPEECHES

getSenatorInterjections(id: string, dataInicio?: string, dataFim?: string): Promise<WithSource<SenatorInterjection[]>>
  // GET SENADO_SENATOR_INTERJECTIONS(id)
  // Wrapper: ApartesParlamentar.Parlamentar.Apartes.Aparte[]
  // TTL: SENADO_SENATOR_INTERJECTIONS

// ─── Voting (use NEW unified endpoint, not deprecated /senador/{id}/votacoes) ───

getSenatorVotingHistory(id: string, dataInicio: string, dataFim: string): Promise<WithSource<SenatorVotingRecord[]>>
  // GET SENADO_VOTING ?codigoParlamentar=${id}&dataInicio=${...}&dataFim=${...}
  // ⚠ NO WRAPPER — flat array
  // TTL: SENADO_VOTING (current year) or SENADO_VOTING_HISTORY (past)
  // Apply combined-result caching: key = `sen:votes:${id}:${year}`

getVotingSessions(dataInicio: string, dataFim: string): Promise<WithSource<SenadoVotingSession[]>>
  // GET SENADO_VOTING ?dataInicio=&dataFim=
  // Flat array; aggregate to session shape (one entry per codigoSessaoVotacao)
  // TTL: SENADO_VOTING / SENADO_VOTING_HISTORY
  // Combined-result caching: `sen:votes:sessions:${year}`

getVotingSessionDetail(idSessaoVotacao: string): Promise<WithSource<SenadoVotingSession>>
  // GET SENADO_VOTING ?codigoSessaoVotacao=${id}
  // Flat array; pick the single matching record
  // TTL: SENADO_VOTING_DETAIL

// ─── Propositions (use NEW /processo, not deprecated /senador/{id}/autorias) ───

getPropositions(params: { ano?: number; sigla?: string; termo?: string; limit?: number }): Promise<WithSource<Proposition[]>>
  // GET SENADO_PROCESS_SEARCH with query params
  // Flat array
  // TTL: SENADO_PROCESS_SEARCH

getSenatorPropositions(id: string, ano?: number): Promise<WithSource<Proposition[]>>
  // GET SENADO_PROCESS_SEARCH ?codigoParlamentarAutor=${id}&ano=${ano}
  // Flat array
  // TTL: SENADO_PROCESS_SEARCH (current) / SENADO_PROCESS_AUTHORS (past)

getPropositionDetail(idProcesso: string): Promise<WithSource<Proposition>>
  // GET SENADO_PROCESS(idProcesso)
  // TTL: SENADO_PROCESS_DETAIL

getPropositionRapporteurship(idProcesso: string): Promise<WithSource<RapporteurshipRecord[]>>
  // GET SENADO_PROCESS_RAPPORTEURSHIP ?idProcesso=
  // Flat array
  // TTL: SENADO_PROCESS_DETAIL

getPropositionDocuments(idProcesso: string): Promise<WithSource<PropositionDocument[]>>
  // GET SENADO_PROCESS_DOCUMENTS ?idProcesso=
  // TTL: SENADO_PROCESS_DETAIL

getPropositionAmendments(idProcesso: string): Promise<WithSource<PropositionAmendment[]>>
  // GET SENADO_PROCESS_AMENDMENTS ?idProcesso=
  // TTL: SENADO_PROCESS_DETAIL

// ─── Plenary, attendance ───

getPlenaryResultMonth(yyyymm: string): Promise<WithSource<PlenarySessionResult[]>>
  // GET SENADO_PLENARY_RESULT_MONTH(yyyymm)
  // Each session has a Comparecimento block → list of senators present
  // TTL: SENADO_PLENARY_RESULT (current year) / SENADO_PLENARY_RESULT_HISTORY (past)

getSenatorAttendanceBulk(year: number): Promise<WithSource<SenatorAttendanceBulkSummary>>
  // No native endpoint. Construct by:
  //   1. For months 1..12 (or 1..currentMonth for current year):
  //      → fetch getPlenaryResultMonth(YYYYMM) in parallel
  //   2. Flatten sessions, extract Comparecimento per senator
  //   3. Aggregate: per-senator { totalSessions, attended, missed, percentage, byMonth }
  // Cache merged result under `sen:attendance:${year}` with SENADO_ATTENDANCE_BULK ttl
  // TTL: SENADO_ATTENDANCE_BULK (current) / SENADO_ATTENDANCE_BULK_HISTORY (past)
  // ⚠ This is the most expensive fetcher. Long Redis-key combined caching is critical.

getSenatorAttendanceDetail(senatorId: string, year: number): Promise<WithSource<SenatorAttendanceDetail>>
  // Filter getSenatorAttendanceBulk(year) by senator id
  // No additional API call

// ─── Committees, parties, blocs ───

getPermanentCommittees(): Promise<WithSource<Committee[]>>
  // GET SENADO_PERMANENT_COMMITTEES
  // Wrapper: ListaBasicaComissoes.colegiado.colegiados.colegiado[] (note lowercase nesting!)
  // TTL: SENADO_COMMITTEES_LIST

getCommitteesByType(tipo: "permanente" | "CPI" | "mistas"): Promise<WithSource<Committee[]>>
  // GET SENADO_COMMITTEE_LIST(tipo)
  // Same wrapper

getColegiados(): Promise<WithSource<Committee[]>>
  // GET SENADO_COMMITTEE_COLEGIADOS
  // Wrapper: ListaColegiados.Colegiados.Colegiado[]

getParties(): Promise<WithSource<Party[]>>
  // GET SENADO_PARTIES
  // Wrapper: ListaPartidos.Partidos.Partido[]
  // TTL: SENADO_PARTIES

getBlocs(): Promise<WithSource<Bloc[]>>
  // GET SENADO_BLOCS
  // Wrapper: ListaBlocoParlamentar.Blocos.Bloco[]
  // TTL: SENADO_BLOCS

getLeadershipComposition(): Promise<WithSource<Leadership[]>>
  // GET SENADO_LEADERSHIP_COMPOSITION
  // ⚠ NO WRAPPER — flat array
  // TTL: SENADO_LEADERSHIP_COMPOSITION

// ─── CEAPS (admin API — preferred over CSV) ───

getCeapsBulkSummary(year: number): Promise<WithSource<CeapsBulkSummary>>
  // GET SENADO_CEAPS_BY_YEAR(year)
  // ⚠ NO WRAPPER — flat array
  // Aggregate server-side: byCategory[], bySupplier[], byMonth[], byDay[], byCategorySupplier (cross-tab), bySenator[]
  // Cache merged summary under `sen:ceaps:${year}` with SENADO_CEAPS_BULK ttl
  // TTL: SENADO_CEAPS_BULK / SENADO_CEAPS_BULK_HISTORY

getSenatorExpenses(id: string, year: number): Promise<WithSource<SenatorExpense[]>>
  // Filter getCeapsBulkSummary(year) by codSenador
  // Returns the per-senator expense list

getSenatorOffices(): Promise<WithSource<SenatorOffice[]>>
  // GET SENADO_OFFICES
  // Flat array, 81 entries (one per senator)
  // TTL: SENADO_OFFICES

getHousingAid(): Promise<WithSource<HousingAidRecord[]>>
  // GET SENADO_HOUSING_AID
  // Flat array
  // TTL: SENADO_HOUSING_AID

// ─── Vetos ───

getVetosByYear(year: number): Promise<WithSource<Veto[]>>
  // GET SENADO_VETOS_BY_YEAR(year)
  // TTL: SENADO_PROCESS_SEARCH

// ─── (Phase 4 / institutional) ───

getServantsHeadcount(): Promise<WithSource<ServantHeadcount[]>>
getServantsRemuneration(year: number, month: number): Promise<WithSource<ServantRemuneration[]>>
```

### 6.3 Implementation patterns to copy from `camara.ts`

- **HATEOAS pagination via `extractLastPage`** — Senado endpoints don't use this (they return everything in one shot). You can drop this helper for Senado.
- **Combined-result caching** — exactly the same pattern. Use prefix `sen:` instead of `cam:`. Apply to: `getCeapsBulkSummary`, `getSenatorAttendanceBulk`, `getSenatorVotingHistory`, `getVotingSessions`.
- **Bulk fetcher pattern** — apply to CEAPS bulk and attendance bulk (the latter is the only one without a single endpoint — it must be composed from 12 monthly `/plenario/resultado/mes` calls).
- **Mapper functions** — one per public fetcher, named `mapRawTo*`, kept private (not exported).
- **Error handling** — reuse `ApiError`. For 404 on individual sub-resources (e.g., a senator without committees), catch and return empty array — don't crash the whole detail page.
- **Validation in `cachedFetch`** — already in place; works for Senado without changes.

---

## 7. Critical adaptations: where Senado differs from Câmara

These deviations from the Câmara pattern require deliberate decisions. Each one belongs in `DECISIONS.md` once you build it.

### 7.1 CEAPS quota cap (per-senator monthly limit)

Câmara uses a fixed `VERBA_DE_GABINETE_TOTAL` constant. **Senado's CEAPS cap varies by elected UF** (it covers Brasília travel from the senator's state). There is **no public JSON endpoint** with these values.

**Required action:**
1. Create `apps/web/lib/constants/senado.ts`.
2. Manually transcribe the `Tabela de tetos do CEAPS` from the Senado `Ato da Comissão Diretora` (currently published at `https://www12.senado.leg.br/transparencia/sen/ceaps`). Hardcode as a `Record<UF, number>`.
3. Annotate every UF entry with a `_source` URL pointing to the Senate decree PDF.
4. Add a JSDoc comment at the top of the constant explaining: this changes annually; check the source URL each January.
5. Schedule (proactively offer the user `/schedule`) a yearly agent to verify the table against the live source.

```ts
export const SENADO_CEAPS_MONTHLY_CAPS_BY_UF: Record<string, number> = {
  AC: 44_276.39,  // 2025 values — verify against Ato da Comissão Diretora
  AL: 31_148.34,
  // ... all 27 UFs
}
export const SENADO_CEAPS_CAPS_SOURCE = "https://www12.senado.leg.br/transparencia/sen/ceaps"
```

### 7.2 Subsídio (senator salary) — no API

The senator subsídio is constitutionally fixed. **No API exposes it.** Hardcode it the same way Câmara does for `DEPUTADO_SALARIO`:

```ts
export const SENADOR_SALARIO = 46_366.19  // R$/month, Resolução SF — verify against PDF
export const SENADOR_SALARIO_SOURCE = "https://www12.senado.leg.br/transparencia/rh/segp/estrutura-remuneratoria"
```

### 7.3 No "verba de gabinete" — replaced by cabinet payroll computation

Câmara exposes `VerbaDeGabinete` as a discrete spending category. **Senado does not.** Cabinet office costs in Senate are paid through:
- CEAPS (already covered)
- `comissionados` payroll (filed under each senator's `lotacao` code)

**Required action for the "Custo Real do Mandato" card:**
1. The `RealMandateCostCard` for Senado should NOT have a "verba gabinete" row.
2. Replace it with **"Folha do gabinete"** (cabinet payroll), computed from `getServantsRemuneration(year, month)` filtered by the senator's `lotacao`.
3. The senator's `lotacao` code is in their detail response under `OutrasInformacoes` or can be derived from the office address (see `getSenatorOffices()`).

If Phase 4 (servants) is not yet built, **omit** the cabinet-payroll row and label the total as a **partial** confirmed cost. Make this explicit in the UI ("Folha de gabinete: pendente").

### 7.4 No per-senator attendance endpoint — must be composed

Câmara has `/cotas/Ano-{year}.json.zip` for CEAP and a bulk attendance endpoint. **Senado has neither for attendance.**

`getSenatorAttendanceBulk(year)` must compose monthly results:
- Fire 12 (or up to current month) parallel calls to `/plenario/resultado/mes/{YYYYMM}`
- Walk each session's `Comparecimento` block
- Aggregate per `CodigoParlamentar`
- Cache the merged result under `sen:attendance:${year}` so subsequent requests are 1 Redis GET

This is essential — without aggregation caching, every detail page load fires 12+ HTTP calls.

### 7.5 Speeches default window is 30 days

`/senador/{id}/discursos.json` returns the **last 30 days** if no date params are passed. The deputy version returns more. **Always pass `dataInicio`/`dataFim`** (in `YYYYMMDD` format) for any historical query.

### 7.6 Wrapper inconsistency — legacy vs modern endpoints

- **Legacy** (`/senador/*`, `/comissao/*`, `/dados/*`, `/materia/*`, `/plenario/*`): deeply nested wrapper objects (`Lista*`, `Detalhe*`, etc.).
- **Modern** (`/processo/*`, `/votacao*`, `/composicao/lideranca`, all `adm-dadosabertos/api/v1/*`): flat JSON arrays, no wrapper.

Mappers must handle both. Don't try to unify into a single helper — branch by path family in the fetcher itself.

### 7.7 Single-element arrays serialize as objects

A senator with one mandate gets `Mandato: { ... }` (an object), not `Mandato: [ ... ]` (an array). **Always coerce** with `ensureArray()` at every nested array boundary.

### 7.8 `Accept: application/json` is required

Without it, Senado defaults to XML. Apply `SENADO_HEADERS` to every Senado `cachedFetch` call. The `.json` URL suffix usually works too, but the header is the safer belt-and-suspenders approach.

### 7.9 Frentes parlamentares don't exist in Senado

Câmara's `/camara/[id]/frentes` and `CaucusDetailSection` have no Senado analog. **Skip the route.** On the detail page, replace the "Frentes" section with a **"Lideranças"** section using `getSenatorLeaderships(id)` data. Reuse `CaucusDetailSection` if its props match cleanly; otherwise create a `SenatorLeadershipSection.tsx` with the same visual pattern.

### 7.10 CEAPS CSV vs JSON: prefer JSON

The LAI CSV (`despesa_ceaps_{ano}.csv`) is available 2008–2025 but **lacks `codSenador`** — joining to senators requires fragile name normalization. The admin JSON API includes `codSenador` directly. **Always prefer the JSON API.** Use the CSV only as a fallback for years the JSON doesn't cover (none, currently).

### 7.11 Deprecated endpoints — keep as fallback only

These have sunset dates of 2026-02-01 (already past as of this document):
- `/senador/{id}/votacoes.json`
- `/senador/{id}/autorias.json`
- `/senador/{id}/relatorias.json`
- most `/materia/*` paths
- `/plenario/votacao/nominal/{ano}`
- `/plenario/lista/votacao/*`

**Do not implement against them.** Implement against `/votacao` and `/processo`. If a replacement endpoint goes down, you can add a fallback later — but don't build coupling to a deprecated endpoint.

---

## 8. Server-side aggregation utilities

Mirror Câmara's `*-utils.ts` files exactly. These are pure (no `"use client"`), used by server components, and use `@/lib/calc` assertions.

### 8.1 Files to create

```
apps/web/app/senado/senado-utils.ts                  → overview aggregations
apps/web/app/senado/[id]/expense-utils.ts            → CEAPS aggregation (mirrors camara/[id]/expense-utils.ts exactly)
apps/web/app/senado/[id]/activity-utils.ts           → speeches/events/votes/committees aggregation
apps/web/app/senado/[id]/proposition-utils.ts        → propositions by year/type
apps/web/app/senado/[id]/presenca/attendance-utils.ts → attendance aggregation (different logic — composed from monthly results)
apps/web/app/senado/[id]/presenca/absence-streaks.ts → longest-absence streak (port directly)
apps/web/app/senado/comparar/comparison-utils.ts     → multi-senator comparison
apps/web/app/senado/pautas/pautas-utils.ts           → propositions overview aggregations
```

### 8.2 Files to copy / mostly copy

For the most part, you should **copy `apps/web/app/camara/[id]/expense-utils.ts` verbatim** and rename to point at `SenatorExpense`. The aggregation functions (by month, by category, by supplier, by day, category × supplier, monthly bar data) work identically.

Same for `activity-utils.ts` — port the speech/vote/committee aggregations, replacing `Deputy*` types with `Senator*`.

### 8.3 New aggregation functions specific to Senado

Add these to `senado-utils.ts`:

```ts
aggregateSenatorsByParty(senators: Senator[]): CountItem[]
aggregateSenatorsByUF(senators: Senator[]): CountItem[]
aggregateSenatorsByBloc(senators: Senator[], blocs: Bloc[]): CountItem[]
aggregatePropositionsByType(propositions: Proposition[]): CountItem[]
aggregatePropositionsByMonth(propositions: Proposition[]): MonthlyCount[]
aggregateVotingSessionsByMonth(sessions: SenadoVotingSession[]): MonthlyCount[]
aggregateAttendanceByParty(bulk: SenatorAttendanceBulkSummary, senators: Senator[]): CountItem[]
aggregateApprovalByType(sessions: SenadoVotingSession[]): ApprovalByType[]
```

### 8.4 Analysis modules to port (`apps/web/lib/analysis/`)

Each Câmara analysis module has a Senado counterpart. Most ports are 1:1 type renaming + data source swap.

| Câmara file | Senado equivalent | Key adaptation |
|---|---|---|
| `ceap-concentration.ts` | `ceaps-concentration.ts` | port as-is |
| `ceap-utilization.ts` | `ceaps-utilization.ts` | use UF-keyed cap from §7.1 |
| `ceap-ranking.ts` | `ceaps-ranking.ts` | port as-is |
| `voting-alignment.ts` | reuse | switch to new `/votacao` data source |
| `legislative-efficiency.ts` | reuse | switch to `/processo` data source |
| `real-mandate-cost.ts` | `real-mandate-cost-senate.ts` | drop verba gabinete row; add cabinet payroll row (or omit if Phase 4 pending) |
| `cost-per-output.ts` | reuse | denominators: active days, votes, plenary sessions, propositions (no committee meetings count for Senado per-session, but committee participation can substitute) |
| `national-benchmarks.ts` | reuse | recompute against 81-senator universe |
| `absence-ceap.ts` | reuse | swap CEAP→CEAPS |

**Rule:** if the function is generic enough (e.g. `voting-alignment`), don't duplicate — refactor to take a `WithSource<VotingRecord[]>` parameter and reuse for both. If it has institutional-specific math (e.g. `real-mandate-cost`), keep them separate.

---

## 9. Page-by-page implementation roadmap

Build in this order. Each phase is independently shippable.

### Phase 0 — Prerequisites (one commit)
- [ ] Promote `YearSelector` to `apps/web/components/ui/YearSelector.tsx` if not already shared.
- [ ] Add all new endpoint constants from §3.
- [ ] Add all new TTL constants from §4.
- [ ] Add all new types from §5.
- [ ] Create `apps/web/lib/constants/senado.ts` with `SENADOR_SALARIO`, `SENADO_CEAPS_MONTHLY_CAPS_BY_UF`, source URLs.
- [ ] Create `apps/web/lib/constants/senado-calendar.ts` (Senate recess dates — same constitutional dates as Câmara: Jan 1–Feb 1, Jul 18–Aug 1).

### Phase 1 — Senator profiles (basic)
- [ ] Implement `getSenatorsList`, `getSenatorDetail`, `getSenatorMandates`, `getSenatorAffiliations`.
- [ ] Add MSW handlers + tests.
- [ ] Rewire `/senado/senadores/page.tsx`: replace `MOCK_SENATORS` with `getSenatorsList()`.
- [ ] Rewire `/senado/[id]/page.tsx`:
  - Profile header from `getSenatorDetail`.
  - InfoPanel from detail + academic + professions.
  - "Carreira política" section from mandates + affiliations.
  - Leave the other sections as placeholders ("em construção") or hide them entirely.

**Definition of done:** any senator's profile page loads with real biographical data, photo, party history, and mandate history. Every data point has a `<SourcePill>`.

### Phase 2 — Activity (votes, propositions, speeches, committees)
- [ ] Implement `getSenatorVotingHistory`, `getSenatorPropositions`, `getSenatorSpeeches`, `getSenatorCommittees`, `getSenatorPositions`, `getSenatorLeaderships`.
- [ ] Add aggregation utilities (`activity-utils.ts`, `proposition-utils.ts`).
- [ ] Build detail-page sections: Proposições, Votações, Discursos, Comissões, Lideranças.
- [ ] Build sub-routes: `/senado/[id]/votacoes`, `/proposicoes`, `/discursos`, `/comissoes`.
- [ ] Wire voting-alignment analysis (party + winning side + government).

**Definition of done:** detail page shows accurate vote counts, alignment percentages, proposition counts with type breakdown, speech list with keyword cloud, committee table.

### Phase 3 — CEAPS expenses
- [ ] Implement `getCeapsBulkSummary`, `getSenatorExpenses`.
- [ ] Build `[id]/expense-utils.ts` (port from Câmara).
- [ ] Port analysis: `ceaps-concentration`, `ceaps-utilization`, `ceaps-ranking`, `national-benchmarks`.
- [ ] Build `DeputyExpenseCharts` analog → `SenatorExpenseCharts` (or rename to `SenatorCeapsCharts`).
- [ ] Build detail-page Gastos CEAPS section: StatCards + 6 charts + ExpenseMapSection.
- [ ] Build sub-routes: `/senado/[id]/despesas`, `/senado/[id]/despesas/[docId]`.
- [ ] Add to listing page: enrich `/senado/senadores` with per-senator CEAPS totals.

**Definition of done:** every senator detail shows CEAPS spending with full chart parity (year-over-year, monthly, calendar heatmap, treemap, top suppliers, stacked bar).

### Phase 4 — Attendance
- [ ] Implement `getPlenaryResultMonth`, `getSenatorAttendanceBulk`, `getSenatorAttendanceDetail`.
- [ ] Build `[id]/presenca/attendance-utils.ts` and `absence-streaks.ts`.
- [ ] Build detail-page Presença section + sub-route `/senado/[id]/presenca`.
- [ ] Add attendance enrichment to `/senado/senadores` listing.
- [ ] Wire `attendanceByParty` aggregation into `/senado` overview.

**Definition of done:** every senator shows plenary attendance %, longest absence streak, calendar heatmap with recess annotations.

### Phase 5 — Pautas (propositions overview & voting sessions)
- [x] Rewire `/senado/pautas`: replace `MOCK_PROPOSITIONS` with `getPropositions({ ano })` + `getVotingSessions(ini, fim)`.
- [x] Rewire `/senado/pautas/lista`: same.
- [x] Rewire `/senado/pautas/[id]`: use `getPropositionDetail` + rapporteurship + documents + amendments.
- [x] Build `/senado/pautas/votacoes` (list of voting sessions).
- [x] Build `/senado/pautas/votacoes/[id]` (session detail with `VotesList` from `getVotingSessionDetail`).
- [x] Delete `apps/web/app/senado/pautas/mock-data.ts`.

**Definition of done:** all `/senado/pautas/*` routes serve real Senate process data. Mock data file is deleted.

### Phase 6 — Senado overview
- [x] Build `/senado/page.tsx`:
  - StatCards: senators in exercise, propositions, voting sessions, avg attendance.
  - Charts (`SenadoCharts`): senators by party, by UF, propositions by type, voting results, monthly production, attendance by party, approval by type.
  - Top senators table (with CEAPS + attendance enrichment).
  - Recent propositions and voting sessions tables.
  - Game card.
- [x] Build `senado-utils.ts` aggregations.

**Definition of done:** `/senado` is a fully wired overview matching `/camara`.

### Phase 7 — Comparison & polish
- [x] Build `/senado/comparar` (multi-senator side-by-side).
- [x] Add `RedFlagsCard` for senators (port flags from Câmara, adapt thresholds).
- [x] Add `RealMandateCostCard` for senators (drop verba gabinete; add cabinet payroll if Phase 8 done).
- [x] Add `CostPerOutputSection` for senators.
- [x] Add national benchmarks to all relevant StatCards.

**Definition of done:** detail page reaches full Câmara feature parity (minus skipped sections).

### Phase 8 — Optional: institutional spending
- [x] Build `/senado/contratacoes` (admin contracts API).
- [x] Build `/senado/servidores` (servants headcount + remuneration).
- [x] Add cabinet payroll row to `RealMandateCostCard`.

---

## 10. Testing requirements

Replicate the Câmara testing approach exactly. Each new fetcher requires:

1. **`packages/fetchers/senado.test.ts`** — colocated test file.
2. **MSW handlers in `packages/fetchers/mocks/handlers.ts`** for every Senado endpoint used in tests.
3. **Coverage targets** (per `CLAUDE.md`):
   - Fetchers: `_source` injection, cache hit, URL construction, error handling, parameter filtering, single-element-array coercion (the Senado-specific quirk).
   - Utils: calculations, edge cases (zero, missing), 12-month assertion.
   - Components: rendering, link attributes, accessibility.
   - API routes: happy path, 429, 400, data integrity.
4. **No real API calls** — every external request goes through MSW.
5. **80% coverage threshold** (CI-enforced).

### Senado-specific test cases to NOT skip

- **Single-element array coercion** — write a test where a senator has `Mandato: { ... }` (object) and verify `getSenatorMandates` returns a single-item array. Same for committees, leaderships, etc.
- **Wrapper unwrapping** — tests for both legacy (deeply nested) and modern (flat) shapes.
- **Default 30-day window on speeches** — verify your implementation always sends `dataInicio`/`dataFim` even when caller doesn't.
- **CEAPS aggregation correctness** — given a fixture of 100 expense rows, verify monthly/category/supplier sums match.
- **Attendance composition** — given 12 monthly fixtures, verify the bulk aggregator returns correct totals per senator.

---

## 11. Documentation updates

After each phase ships, update:

- **`CLAUDE.md`** — add Senado-specific patterns to the "Established patterns" section if you introduce any new ones (e.g. UF-keyed cap lookup, attendance composition pattern).
- **`API-REFERENCE.md`** — append every new endpoint added in §3.2 with full URL, params, response shape.
- **`INTEGRATION.md`** — check off each Senado item as it's completed.
- **`DECISIONS.md`** — record at minimum:
  - Decision to use `/processo` and `/votacao` over deprecated endpoints.
  - Decision to compose attendance from monthly results (cost: 12 calls, mitigated by aggregation cache).
  - Decision to hardcode CEAPS UF caps (no JSON source).
  - Decision to omit verba gabinete row from RealMandateCost for Senate.
  - Decision to skip frentes route (no equivalent).

---

## 12. Common pitfalls — do not repeat

1. **Don't paste `cam:` cache keys for Senado.** Always use `sen:` prefix to avoid collisions.
2. **Don't trust cached deprecated-endpoint responses.** If you accidentally hit `/senador/{id}/votacoes`, your cache will fill with potentially-empty results post-sunset. Use the new endpoints exclusively.
3. **Don't forget `Accept: application/json`.** XML responses will silently fail JSON parsing and produce confusing 500s.
4. **Don't iterate `/plenario/resultado/dia/{YYYYMMDD}` × 365 for attendance.** Use `/plenario/resultado/mes/{YYYYMM}` × 12 — same data, 30× fewer calls.
5. **Don't store IP addresses in PostgreSQL** (game flood control rule, applies to Senado game flows too).
6. **Don't display a CEAPS value without `<SourcePill>`.** This is the platform's core promise.
7. **Don't refactor Câmara files while building Senado.** Keep them stable. If you find a shared improvement, extract to a third location and adopt in both atomically — but do this in a separate, isolated commit, not bundled with Senado feature work.
8. **Don't hard-code "513 deputies" patterns.** Senate has 81 senators. Magic numbers in aggregations (top-N suppliers, etc.) should be props or constants, not literals.
9. **Don't omit JSDoc.** This codebase doubles as a study in AI-assisted civic tech. Every fetcher and non-trivial function gets full JSDoc with `@param`, `@returns`, `@throws`, `@example`, `@see`.
10. **Don't write Portuguese in code.** Variable names, function names, comments, test descriptions: English only. UI strings: Portuguese only.

---

## 13. Quick-start checklist for the next agent

If you're picking this up cold, here's the smallest first commit that proves the pipeline works:

1. Add `SENADO_SENATORS` constant (already present) + `SENADO_SENATORS_LIST` TTL (already present).
2. Implement `getSenatorsList()` in a new `packages/fetchers/senado.ts` with full JSDoc, raw type, mapper, `cachedFetch` call.
3. Add MSW handler for `/senador/lista/atual.json` returning a 2-senator fixture.
4. Add `senado.test.ts` with 4 tests: returns array of 2 senators / `_source` injected / cache hit on second call / error throws `ApiError`.
5. Update `apps/web/app/senado/senadores/page.tsx`: delete `MOCK_SENATORS`, call `getSenatorsList()`, pass to existing JSX.
6. Verify in browser: `/senado/senadores` loads with 81 real senators, each linking to a (still mock) detail page.

Once that loop closes, expand outward following Phase 1 → 8.

---

**End of guide.**

If anything in this document conflicts with `CLAUDE.md`, `CLAUDE.md` wins. If you discover an endpoint or behavior that contradicts §3 or §6, update this file in the same PR that introduces the discovery.
