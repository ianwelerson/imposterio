# TODO — Pending Integration Items

Items commented out from pages during the real data wiring phase.
Each entry maps to a specific page, column, or section that still uses
static mock data or is temporarily removed.

---

## Câmara dos Deputados

### Listing page (`camara/deputados/page.tsx`)

- [ ] **CEAP spending column** — Requires calling `getDeputyExpenses()` for each
  of the 513 deputies and summing `valorLiquido`. This is expensive (513 API calls
  or cache lookups). Options:
  1. Batch aggregation endpoint (Câmara API doesn't offer one)
  2. Use the bulk historical CEAP file: `http://www.camara.leg.br/cotas/Ano-{year}.json.zip`
  3. Pre-aggregate in a daily worker and store totals in Redis
  - **Depends on:** Phase 4 (bulk file processing) or Phase 9 (aggregations)

- [ ] **Attendance column** — Requires parsing the yearly bulk attendance JSON:
  `http://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/json/eventosPresencaDeputados-{year}.json`
  - **Depends on:** Phase 4 (bulk file processing)

- [ ] **Staff count column** — Requires parsing the bulk staff JSON:
  `http://dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json`
  - **Depends on:** Phase 4 (bulk file processing)

### Detail page (`camara/[id]/page.tsx`)

- [x] **StatCards section** — Implemented with:
  - ✅ CEAP total for selected year (from `getDeputyExpenses`)
  - ✅ Previous year total for comparison
  - ✅ Record count
  - ✅ Year-over-year variation badge
  - [ ] Attendance % — from bulk attendance file (Phase 4)
  - [x] Votes participated count — from `getDeputyVotingHistory()`
  - [x] Abstention count — from `getDeputyVotingHistory()`
  - [x] Alignment StatCard with tooltip explanation (CSS-only hover)
  - [ ] Caucuses count — from `GET /deputados/{id}/frentes` (simple, can be added now)

- [x] **Voting history** — Implemented via composite fetcher `getDeputyVotingHistory()`
  - Fetches voting sessions, then per-session votes, filtered by deputy ID
  - Batched in groups of 10 with configurable `maxSessions` cap (default 50)
  - Detail page: StatCards (total, Sim, Não, Abstenção, alignment %), charts (by type pie, by month bar)
  - Sub-page: `/camara/{id}/votacoes/` with SearchableList + filters (vote type, result)

- [x] **InfoPanel email** — Deputy email is clickable (mailto: link via InfoPanel `href` prop)

- [x] **Error handling** — All fetcher calls wrapped in `collectErrors()` with `emptySourced()` fallback, ToastTrigger for user-visible error messages

### Expenses detail page (`camara/[id]/despesas/[docId]/page.tsx`)

- [x] **Individual expense detail pages** — Each expense links to a dedicated page
  - ✅ Expense type as page title (sentence case, not all caps)
  - ✅ Deputy name with link back to profile
  - ✅ Value StatCards (gross, net with "reembolso" badge, deducted with explanation)
  - ✅ Info panel (supplier, CPF/CNPJ, document type/number, date, reference period)
  - ✅ Internal reference panel (document code, reimbursement number, batch, installment)
  - ✅ Embedded receipt/invoice viewer (iframe, 900px tall) as last section
  - ✅ SourcePill in header next to CEAP badge
  - Note: No single-expense API endpoint exists — fetches full year and filters by `documentCode`

### Legislative agenda pages (`camara/pautas/`)

- [x] **Overview page** — Real API data with charts and StatCards
  - ✅ Propositions: type distribution (pie), monthly trend (line), latest 5 table
  - ✅ Voting sessions: result distribution (pie), monthly trend (line), latest 5 table
  - ✅ Year selector, filtered to PL,PEC,PLP,MP,PDL types
- [x] **Propositions listing** (`camara/pautas/lista/`) — SearchableList with type/status/organ filters
- [x] **Proposition detail** (`camara/pautas/[id]/`) — Info panel, authors, themes, tramitação timeline
- [x] **Voting sessions listing** (`camara/pautas/votacoes/`) — SearchableList with result filter
- [x] **Voting session detail** (`camara/pautas/votacoes/[id]/`) — Stats, party orientations, individual votes, organ, opening description, voting objects, last presentation

### Overview page (`camara/page.tsx`) — ✅ Mostly wired

- [x] **StatCard: Deputies count** — Real data from `getDeputiesList()`
- [x] **StatCard: Propositions count** — Real data from `getPropositions()` (PL,PEC,PLP,MP,PDL)
- [x] **StatCard: Votes count** — Real data from `getVotingSessions()`
- [x] **StatCard: Approval rate** — Computed from voting sessions
- [x] **Charts: Deputies by party** — Horizontal bar chart from real deputy list
- [x] **Charts: Deputies by UF** — Horizontal bar chart from real deputy list
- [x] **Charts: Propositions by type** — Pie chart from real propositions
- [x] **Charts: Voting results** — Pie chart from real voting sessions
- [x] **Latest propositions table** — 5 most recent from `getPropositions()`
- [x] **Latest votes table** — 5 most recent from `getVotingSessions()`
- [x] **Year selector** — URL-driven (?ano=YYYY), "Ver dados de" box style, contextual alignment (right-aligned in headers, inline in mid-page dividers)
- [x] **Chart action links** — "Ver todos os partidos" and "Ver todos os estados" on truncated charts
- [x] **Error handling** — All fetcher calls wrapped in `collectErrors()` with toast notifications

**Still pending (require bulk file processing or expensive aggregation):**
- [ ] **CEAP total** — Needs aggregated expense data across all 513 deputies (Phase 4/9)
- [ ] **Average attendance** — Needs bulk attendance file (Phase 4)
- [ ] **Deputy table sort by spending** — Needs per-deputy CEAP aggregation (Phase 4/9)
- [ ] **CEAP by category chart** — Needs aggregated expenses across all deputies (Phase 4/9)
- [ ] **CEAP by party chart** — Needs per-party expense aggregation (Phase 4/9)
- [ ] **Attendance vs spending chart** — Needs both bulk files (Phase 4)

---

## API Discovery Notes

### `/deputados/{id}/votacoes` — BROKEN (405)

As of March 2026, the Câmara API returns 405 for `GET /deputados/{id}/votacoes`.
This was previously a working endpoint. The correct approach is now:

```
GET /votacoes?ordem=DESC&ordenarPor=id
→ returns: { dados: [{ id, data, siglaOrgao, descricao, aprovacao }] }
⚠️ ordenarPor=dataHoraRegistro returns 400. Only "id" is supported.
⚠️ Date ranges limited to 3 months. Use splitDateRangeIntoQuarters() from camara.ts.

GET /votacoes/{id}/votos
→ returns: { dados: [{ tipoVoto, dataRegistroVoto, deputado_: { id, nome, siglaPartido, ... } }] }

GET /votacoes/{id}/orientacoes
→ returns: { dados: [{ nomeBancada, orientacaoVoto, codTipoLideranca }] }
⚠️ Field is "orientacaoVoto", not "orientacao".
```

List vs detail endpoints return different shapes:
- List: `proposicaoObjeto` (string) + `uriProposicaoObjeto` (URL)
- Detail: `proposicoesAfetadas` array + `idEvento` directly

To get a deputy's vote history: iterate voting sessions, call `/votos` for each,
filter by `deputado_.id`. This is expensive — consider caching aggressively or
building an aggregation worker.

### `/proposicoes` — Pagination volume

The `/proposicoes` endpoint can return thousands of items per year (5,784 in 2026
including REQs and amendments). Mitigated by:
1. Filtering to main types: `siglaTipo=PL,PEC,PLP,MP,PDL`
2. Capping pagination at `maxPages=5` (500 items) in `getPropositions()`

### No single-expense endpoint

There is no `GET /deputados/{id}/despesas/{docId}` endpoint. The only option is
`GET /deputados/{id}/despesas?ano={year}` and client-side filtering by `codDocumento`.
The 6h cache TTL makes this acceptable.
