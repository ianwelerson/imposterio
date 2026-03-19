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
  - `GET /votacoes?ordem=DESC&ordenarPor=dataHoraRegistro` — list recent votes
  - `GET /votacoes/{voteId}/votos` — get how each deputy voted
  - To build a deputy's voting history, we need to either:
    1. Query recent voting sessions and filter for the deputy's participation
    2. Use bulk vote data files if available
  - **Depends on:** Phase 2 (activity data — votes, bills, speeches)

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
GET /votacoes?ordem=DESC&ordenarPor=dataHoraRegistro
→ returns: { dados: [{ id, data, siglaOrgao, descricao, aprovacao }] }

GET /votacoes/{id}/votos
→ returns: { dados: [{ tipoVoto, dataRegistroVoto, deputado_: { id, nome, siglaPartido, ... } }] }
```

To get a deputy's vote history: iterate voting sessions, call `/votos` for each,
filter by `deputado_.id`. This is expensive — consider caching aggressively or
building an aggregation worker.
