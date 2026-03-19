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
  - [ ] Votes participated count — see voting history issue below
  - [ ] Caucuses count — from `GET /deputados/{id}/frentes` (simple, can be added now)

- [ ] **Voting history table** — The endpoint `GET /deputados/{id}/votacoes`
  returns HTTP 405 (Method Not Allowed). The Câmara API changed this endpoint.
  Individual votes must now be queried per voting session:
  - `GET /votacoes?ordem=DESC&ordenarPor=id` — list recent votes (NOT `dataHoraRegistro`, returns 400)
  - `GET /votacoes/{voteId}/votos` — get how each deputy voted
  - ⚠️ Date ranges limited to 3 months — use `splitDateRangeIntoQuarters()` helper from `camara.ts`
  - To build a deputy's voting history, we need to either:
    1. Query recent voting sessions and filter for the deputy's participation
    2. Use bulk vote data files if available
  - **Depends on:** Phase 2 (activity data — votes, bills, speeches)

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
- [x] **Voting session detail** (`camara/pautas/votacoes/[id]/`) — Stats, party orientations, individual votes

### Overview page (`camara/page.tsx`)

- [ ] **StatCard: CEAP total** — Static "R$ 48,7 mi". Needs aggregated expense data.
- [ ] **StatCard: Average attendance** — Static "82,1%". Needs bulk attendance file.
- [ ] **StatCard: Votes count** — Static "127". Needs voting session query.
- [ ] **Deputy table sort by spending** — Currently alphabetical. Needs CEAP aggregation.
- [ ] **Expense category ranking** — Static mock data. Needs aggregated CEAP by `tipoDespesa`.
- [ ] **Charts** — `CamaraCharts.tsx` still uses hardcoded data. Needs aggregated time series.

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
