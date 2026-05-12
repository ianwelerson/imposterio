# Empresas Module — Implementation Plan

> Master plan for the Empresas (Companies) module. Read this **and** `CLAUDE.md`
> before touching any file in `apps/web/app/empresas/`, `packages/fetchers/`, or
> `packages/db/`. Implementation is broken into ordered phases — work one phase
> at a time, in the order listed, and check items off as they land.

---

## 1. Goals

Per CNPJ, the page must show — every value with a `_source` pill:

1. **Total received from federal government** (contracts, payments, transfers)
2. **Total received via CEAP** from federal parliamentarians (Câmara + Senado)
3. **Donations received from political campaigns** (TSE — donor side)
4. **Donations made to political campaigns** (TSE — donee side)
5. **Political ROI** — donated vs. received, color-coded
6. **Partner network** — for each partner CPF, the other companies linked to
   that CPF (always labeled "vínculo provável" — see §6)
7. **Bidding history** — wins and losses (Portal da Transparência)
8. **Sanction alerts** — CEIS / CNEP membership

All values are **incremental snapshots, not totals**: they grow as users navigate
the platform and trigger new fetches. The UI must communicate this honestly — see §7.

---

## 2. Architectural decisions

### 2.1 OpenCNPJ replaces CNPJá

We will **not** use CNPJá. We use **OpenCNPJ** (`https://opencnpj.org`):

- **Endpoint shape:** `GET https://api.opencnpj.org/{cnpj}` (verify exact path
  from `https://opencnpj.org/#api` on first implementation; adjust constants
  if the path differs)
- **No auth.** No request quota documented at time of writing.
- **Update cadence:** monthly at minimum, per the project's official source.
- **Cache TTL:** **30 days** (`CNPJ_DETAIL`). Aggressive caching is safe given
  the update cadence. Add `CNPJ_NOT_FOUND` short-TTL (1h) to throttle 404s.

Files to update when this decision lands:

- `packages/fetchers/lib/endpoints.ts` — replace `BASE_URLS.CNPJA` with
  `BASE_URLS.OPENCNPJ`; add `OPENCNPJ_DETAIL(cnpj)` endpoint helper.
- `packages/fetchers/lib/ttl.ts` — add `CNPJ_DETAIL` (30d) and `CNPJ_NOT_FOUND` (1h).
- `CLAUDE.md` — Public APIs section: swap CNPJá entry for OpenCNPJ.
- `API-REFERENCE.md` — replace the "CNPJá" section with "OpenCNPJ" including
  exact base URL, response shape, and rate-limit notes.
- `INTEGRATION.md` — Phase 6 header and item 6A.1 (and `cnpja.ts` filename
  → `opencnpj.ts`). All checked items in Phase 6 are still 0 done.
- `apps/web/app/empresas/page.tsx` and `[cnpj]/page.tsx` — mock URLs reference
  `open.cnpja.com`; will be removed when wiring real data.

### 2.2 Database storage exception (third one)

`CLAUDE.md` §1 forbids storing government data in our DB. The only exceptions
today are `game_*` tables and the QSA bulk. We add a **third documented
exception** for the partner graph index:

- **Why it's an exception:** OpenCNPJ does not expose a reverse lookup
  (CPF → companies). The whole "rede de sócios" feature is impossible without
  building a local index. This is the same justification used for the QSA
  bulk, but built **incrementally on demand** instead of monthly bulk loads.
- **Why it's not a violation in spirit:** we still treat OpenCNPJ as the
  source of truth — the DB is a derived index, not a substitute for the API.
  Detail pages still display data fetched fresh (cached) from OpenCNPJ; the
  DB only powers the cross-reference graph.
- **Add to `DECISIONS.md`** as a new entry: title "Incremental partner graph
  in PostgreSQL", with date, context, decision, consequences.

### 2.3 Caching layers

| Layer | Holds | TTL |
|---|---|---|
| Redis (`cnpj:{cnpj}`) | Full OpenCNPJ response | 30 days |
| Redis (`cnpj:404:{cnpj}`) | Negative cache for 404s | 1 hour |
| Postgres `Company` | CNPJ + last-fetched timestamp | persistent |
| Postgres `CompanyPartner` | Partner rows extracted from QSA | persistent |
| Postgres `CompanyTransaction` | Observed financial events (see §5) | persistent |

`Company.lastFetchedAt` controls when we re-hit OpenCNPJ even if Redis evicted.
We never serve stale-from-DB company details to the frontend; we always go via
`getCompanyDetail()` which re-fetches if the Redis key is missing.

---

## 3. Data model (Prisma)

Add to `packages/db/schema.prisma`. Migration name: `add_company_partner_graph`.

```prisma
/// Lightweight CNPJ index. The authoritative company data lives in Redis
/// (cached from OpenCNPJ). This row exists only to support partner graph
/// queries and incremental aggregation.
model Company {
  cnpj           String   @id // 14 digits, no punctuation
  legalName      String?  // razao social — nullable until first OpenCNPJ fetch
  tradeName      String?  // nome fantasia
  status         String?  // "ATIVA" | "BAIXADA" | etc.
  mainCnae       String?  // 7 digits, no punctuation
  uf             String?  // 2 letters
  firstSeenAt    DateTime @default(now())
  lastFetchedAt  DateTime @default(now())
  partners       CompanyPartner[]
  transactions   CompanyTransaction[]

  @@index([uf])
  @@map("companies")
}

/// A single partner (sócio) extracted from OpenCNPJ QSA.
/// CPF is masked at the source (***.456.789-**); we store it verbatim.
/// Cross-references against this row are always heuristic — see §6.
model CompanyPartner {
  id              String   @id @default(uuid())
  cnpj            String
  company         Company  @relation(fields: [cnpj], references: [cnpj], onDelete: Cascade)
  partnerName     String   // as returned by OpenCNPJ
  /// Normalized lowercase + accent-stripped form of `partnerName`, for joins.
  partnerNameKey  String
  maskedCpf       String?  // e.g. "***.456.789-**"; null when partner is a juridical person
  /// 6 digits in the middle of CPF (e.g. "456789" from "***.456.789-**").
  /// Indexed so reverse lookups by partial CPF + name are O(log n).
  cpfMid          String?
  partnerCnpj     String?  // when the partner is itself a company
  qualification   String?  // "Sócio-Administrador", etc.
  joinedAt        DateTime?
  observedAt      DateTime @default(now())

  @@unique([cnpj, partnerName, maskedCpf])
  @@index([cpfMid, partnerNameKey])
  @@index([partnerNameKey])
  @@map("company_partners")
}

/// A single observed financial event involving a CNPJ. Inserted whenever
/// the platform encounters new data (CEAP expense viewed, contract listed,
/// donation seen, etc.). Aggregations are computed by SQL SUM on read.
///
/// `sourceKey` is unique per (cnpj, sourceKey) and carries the natural ID
/// from the source API (e.g. CEAP expense `idDocumento`, contract number).
/// This guarantees the same record cannot be double-counted across sessions.
model CompanyTransaction {
  id           String   @id @default(uuid())
  cnpj         String
  company      Company  @relation(fields: [cnpj], references: [cnpj], onDelete: Cascade)
  /// "ceap" | "contract" | "donation_in" | "donation_out" | "bid_won" | "bid_lost"
  type         String
  /// Stable natural key from the source API. Two writes with the same
  /// (cnpj, type, sourceKey) are no-ops (UPSERT).
  sourceKey    String
  /// Source API URL — used to populate `_source` on aggregated rows.
  sourceUrl    String
  value        Decimal  @db.Decimal(14, 2)
  year         Int
  month        Int?
  /// Free-form counterparty identity (e.g. "deputy:204554", "candidate:1234").
  /// Lets us answer "who paid this CNPJ" / "whom did this CNPJ pay".
  counterparty String?
  observedAt   DateTime @default(now())

  @@unique([cnpj, type, sourceKey])
  @@index([cnpj, type, year])
  @@index([counterparty])
  @@map("company_transactions")
}
```

Notes:

- `partnerNameKey` and `cpfMid` are denormalized to make the
  `findCompaniesByPartner(cpfMid, nameKey)` query a simple index lookup
  instead of a full scan with normalization at query time.
- `CompanyTransaction.sourceKey` is the **idempotency anchor**: re-visiting
  the same CEAP expense never double-counts.
- We don't store agency / object / dates of the underlying transaction — only
  enough to aggregate. Detail comes from the source page (linked via `_source`).

---

## 4. OpenCNPJ fetcher

New file: `packages/fetchers/opencnpj.ts`. Follows the Câmara reference pattern.

Public functions:

```ts
/** Returns full company detail. 404 → returns null (cached as negative). */
getCompanyDetail(cnpj: string): Promise<WithSource<Company> | null>

/** Convenience wrapper: fetches OpenCNPJ data AND upserts Company +
 *  CompanyPartner rows in one call. Use this from any code path that
 *  encounters a new CNPJ. */
ingestCompany(cnpj: string): Promise<WithSource<Company> | null>
```

`Company` shape (in `packages/types/company.ts`):

```ts
interface Company extends WithSource {
  cnpj: string
  legalName: string
  tradeName: string | null
  status: string
  statusDate: string | null
  mainCnae: { code: string; description: string }
  secondaryCnaes: Array<{ code: string; description: string }>
  size: string             // "MEI" | "ME" | "EPP" | "DEMAIS"
  legalNature: string
  capital: number
  openedAt: string         // ISO
  address: { street, number, complement, district, city, uf, zip }
  partners: Array<{
    name: string
    maskedCpf: string | null
    qualification: string
    joinedAt: string | null
    partnerCnpj: string | null
  }>
}
```

Map raw OpenCNPJ JSON → this shape with a private `mapRawToCompany()`. Keep
raw response types internal; do not export them.

Tests (`opencnpj.test.ts`):

- `_source` injection
- 404 → returns null AND writes negative cache key
- Cache hit avoids HTTP
- Mapping: raw QSA → `partners[]` with masked CPFs preserved
- `ingestCompany()` upserts both `Company` and `CompanyPartner` rows
- Re-running `ingestCompany()` does not duplicate partners (unique constraint)

MSW handler in `packages/fetchers/mocks/handlers.ts`.

---

## 5. Aggregation strategy

This is the open question the user flagged. Recommended approach:

**Each fetcher that already returns CNPJs records a `CompanyTransaction` row
as a side effect**, in the same request lifecycle. Aggregation = SQL `SUM`.

Touchpoints (do not over-engineer — only wire what already exists):

| Source data | Trigger | `type` | `counterparty` | `sourceKey` |
|---|---|---|---|---|
| `getDeputyExpenses(id, year)` | per row | `ceap` | `deputy:{id}` | expense `idDocumento` |
| `getSenatorExpenses(id, year)` (Phase 9 parity) | per row | `ceap` | `senator:{id}` | expense ID |
| `getContracts(...)` (Phase 3C) | per row | `contract` | `agency:{code}` | contract number |
| TSE donations (Phase 7) | per row | `donation_out` / `donation_in` | `candidate:{id}` | TSE record ID |
| CEIS / CNEP (Phase 3D) | not a transaction — a flag (see §8) | — | — | — |

Implementation:

1. Add a tiny helper `recordCompanyTransaction(input)` in `packages/db/queries/companies.ts`.
   It does:
   - `Company.upsert` with `cnpj` and bumps `firstSeenAt` only on insert
   - `CompanyTransaction.upsert` keyed on `(cnpj, type, sourceKey)`
   - Optionally fires `ingestCompany(cnpj)` *async, fire-and-forget* if
     `Company.legalName` is null (first time we see this CNPJ)
2. Each fetcher that touches CNPJs calls `recordCompanyTransaction()` for
   every row it returns. Wrapped in `try/catch` — DB hiccups must not break
   the public-data page.
3. The empresas detail page reads aggregates with raw Prisma SQL:

```ts
SELECT type, year, SUM(value) AS total, COUNT(*) AS rows,
       MAX(observedAt) AS last_observed
FROM company_transactions WHERE cnpj = $1 GROUP BY type, year;
```

**Honesty disclosure (mandatory in UI):** the empresas detail page must
show a disclaimer near every "Total recebido" / "Total doado" StatCard:

> "Valor parcial. Soma o que já foi observado nas APIs oficiais até
> {última atualização}. Cresce conforme novos dados são consultados."

Also surface `last_observed` per category as a small "atualizado em" line.

**Why this strategy:**

- ✅ Idempotent — same expense viewed twice doesn't double-count
- ✅ Cheap on writes (one upsert per row, batched per request)
- ✅ Cheap on reads (a single GROUP BY query)
- ✅ Truthful — we only show what we've actually observed
- ✅ No worker / cron required for v1

Rejected alternatives:

- *Redis counters incremented on every view* → not idempotent; values double-count; can't survive eviction.
- *Recompute on every page view by re-fetching N expenses APIs* → unworkable at the platform's scale.
- *Wait for monthly bulk imports* → contradicts the "real-time" core value.

---

## 6. Partner cross-reference algorithm

OpenCNPJ masks CPFs as `***.456.789-**` (6 stable middle digits). Two
partners likely match when **both** are true:

1. `cpfMid` matches AND
2. Normalized name similarity is high (Levenshtein on `partnerNameKey`,
   threshold ≥ 0.9 — same first-name + last-name)

Confidence labels (always "provável", never "confirmado"):

- **Alta**: cpfMid match + name match
- **Média**: cpfMid match + partial name match (e.g. one matches "JOSÉ DA SILVA",
  other matches "JOSÉ DA SILVA SANTOS")
- **Baixa**: name match without cpfMid (much less reliable; off by default,
  surfaceable behind a UI toggle "Incluir vínculos só por nome")

Query helper in `packages/db/queries/companies.ts`:

```ts
findRelatedPartners(cnpj: string): Promise<Array<{
  partnerName: string
  maskedCpf: string | null
  cpfMid: string | null
  otherCompanies: Array<{
    cnpj: string
    legalName: string | null
    confidence: "alta" | "media" | "baixa"
  }>
}>>
```

Render rule: ALWAYS prefix the cross-reference UI with "Vínculo provável" +
the confidence badge. Never assert equivalence. This protects us from
defamation risk.

---

## 7. UI pages

### 7.1 `apps/web/app/empresas/page.tsx` (overview)

- Top cards: total CNPJs indexed (= `count(Company)`), CEIS count, CNEP count,
  total observed value (= `SUM(value)` across transactions).
- Top-spenders table: CNPJs with highest aggregated `type='contract'` total.
- CEIS / CNEP tables (Phase 3D fetchers).
- Search-by-CNPJ box → routes to `/empresas/{cnpj}`.

### 7.2 `apps/web/app/empresas/[cnpj]/page.tsx` (detail)

Sections in order:

1. `ProfileHeader` — name, CNPJ, status badge, OpenCNPJ source pill
2. StatCards row — totals per category, each with "valor parcial" disclaimer
3. `InfoPanel` — dados cadastrais (from OpenCNPJ)
4. **Quadro societário (QSA)** — partner table, each row expandable to show
   `findRelatedPartners()` result for that partner
5. **Recebimentos do governo** — group by `type`, expandable per year
6. **Doações eleitorais** — donations in/out
7. **ROI político** — chart: donated to candidate X vs. received (CEAP) from candidate X
8. **Licitações** — table of bid wins/losses (Phase 7 dependency)
9. **Sanções** — CEIS/CNEP cards, red-bordered when active

Disclaimers footer: link to `/sobre/metodologia#empresas` explaining incremental aggregation.

### 7.3 Shared components

- `ProvavelBadge` (new, `components/ui/`) — small badge "Vínculo provável" with
  tooltip explaining masked-CPF heuristic. Variants: `alta` / `media` / `baixa`.
- `ParcialNote` — inline italic note "Valor parcial — atualizado em {date}".

---

## 8. Sanctions (CEIS / CNEP)

Reuse Phase 3D fetchers (Portal da Transparência). Per CNPJ detail page:

- Probe `getBlacklistedCompanies({ cnpj })` and `getPunishedCompanies({ cnpj })`.
- TTL: `TRANSP_BLACKLIST` 7d, `TRANSP_PUNISHED` 7d.
- Result is **not** a `CompanyTransaction` — it's a flag rendered as a red
  StatCard + a section listing each sanction with date + sanctioning body.

This means Phase 3D must land before this module is feature-complete. Items
3D.1–3D.3 are unblocked and can be done in parallel.

---

## 9. Phased implementation

Each phase is a separate PR with its own tests. Stop after each phase to verify.

### Phase E1 — Foundation (no UI changes)

- [ ] Add `CNPJ_DETAIL` (30d) and `CNPJ_NOT_FOUND` (1h) to `packages/fetchers/lib/ttl.ts`
- [ ] Add `BASE_URLS.OPENCNPJ` and `OPENCNPJ_DETAIL()` to `packages/fetchers/lib/endpoints.ts`; remove `BASE_URLS.CNPJA`
- [ ] Update `CLAUDE.md` Public APIs section: replace CNPJá → OpenCNPJ
- [ ] Update `API-REFERENCE.md`: replace CNPJá section with full OpenCNPJ documentation
- [ ] Update `INTEGRATION.md` Phase 6 to reference OpenCNPJ + new file names
- [ ] Add `DECISIONS.md` entry: "Incremental partner graph in PostgreSQL (third DB-storage exception)"

### Phase E2 — Database schema

- [ ] Add `Company`, `CompanyPartner`, `CompanyTransaction` models to `schema.prisma`
- [ ] Generate migration `add_company_partner_graph`
- [ ] Implement `packages/db/queries/companies.ts`:
  - `upsertCompany(input)` — upsert Company row, returns it
  - `upsertCompanyPartners(cnpj, partners)` — bulk upsert
  - `recordCompanyTransaction(input)` — atomic upsert keyed by `(cnpj, type, sourceKey)`
  - `getCompanyAggregates(cnpj)` — GROUP BY query
  - `findRelatedPartners(cnpj)` — heuristic cross-reference (§6)
- [ ] Unit tests for each query, against a real Postgres test DB (no mocks per CLAUDE.md test rules)
- [ ] `Company` and `CompanyPartner` types exported from `packages/types/company.ts`

### Phase E3 — OpenCNPJ fetcher

- [x] Create `packages/fetchers/opencnpj.ts` with file-level JSDoc header
- [x] Implement `getCompanyDetail(cnpj)` with negative-cache for 404
- [x] Implement `ingestCompany(cnpj)` (fetcher + DB upsert in one call)
- [x] MSW handlers for OpenCNPJ
- [x] Tests: `_source`, cache hit, 404 negative cache, mapping correctness, idempotency

### Phase E4 — Wire CEAP transactions (smallest end-to-end loop)

- [x] In `getDeputyExpenses()`, after the response is built, call
      `recordCompanyTransaction()` per row (fire-and-forget; never throw to caller)
- [x] Same for senado expenses fetcher
- [x] Tests verify: visiting a deputy expenses page populates `CompanyTransaction`
- [x] Tests verify: visiting twice does not duplicate rows

### Phase E5 — Empresas detail page (real data)

- [x] Replace mocks in `apps/web/app/empresas/[cnpj]/page.tsx`
- [x] Server component fetches: `getCompanyDetail`, `getCompanyAggregates`,
      `findRelatedPartners`
      (sanctions probe deferred — `getBlacklistedCompanies({cnpj})` /
      `getPunishedCompanies({cnpj})` ship with Phase 3D; the page renders a
      labeled placeholder so the layout slot is reserved)
- [x] Render: ProfileHeader → StatCards (with `ParcialNote`) → InfoPanel →
      QSA (with expandable cross-references) → Aggregates → Sanctions placeholder
- [x] `ProvavelBadge` component + tests
- [x] `ParcialNote` component + tests

### Phase E6 — Empresas overview page

- [x] Replace mocks in `apps/web/app/empresas/page.tsx`
- [x] Server fetches: top CNPJs by `SUM(value)`, CEIS/CNEP totals
      (CEIS / CNEP slots reserved as labeled placeholders pending Phase 3D —
      Portal da Transparência fetcher; the StatCards display "—" with an
      explanatory tooltip and a dedicated section uses an `EmptyState`)
- [x] Search-by-CNPJ form → redirect to `/empresas/{cnpj}`
- [x] Empty state: when no `Company` rows yet, show explainer about incremental indexing

### Phase E7 — Contracts integration

- [x] Phase 3C contracts fetcher (Portal da Transparência) records `type='contract'` transactions
      (`getContracts({ cnpj, agencyCode?, dataInicial?, dataFinal?, pagina? })` —
      `packages/fetchers/transparencia.ts`. Each row is mapped to
      `GovernmentContract` and persisted via `recordContractTransactions()`
      with `(cnpj, "contract", contractId)` as the idempotency anchor and
      `agency:{SIAFI}` as the counterparty tag.)
- [x] Empresas detail page renders contracts section with deep-links to PdT
      (new "Contratos com o governo federal" section between QSA and the
      aggregates table; rows sort by signature date desc and surface the
      Portal da Transparência page via `<SourcePill url={c.linkPdt} />`.
      Section degrades to `<DataFetchError>` when the API key is missing
      or upstream returns 5xx so the rest of the page still renders.)

### Phase E8 — Donations integration (depends on Phase 7 TSE)

- [x] TSE donation fetcher records `donation_in` / `donation_out` transactions
      (`getCompanyDonations(cnpj, { years? })` — `packages/fetchers/tse.ts`.
      Combines receitas (donor side) and despesas (vendor side) per
      registered election year via the CKAN datastore_search endpoint, and
      persists every row through `recordDonationTransactions()` with
      `(cnpj, "donation_*", id)` as the idempotency anchor and
      `candidate:{cpf}` as the counterparty tag.)
- [x] Render "Doações eleitorais" + "ROI político" sections
      (new sections between contracts and the aggregates table on
      `empresas/[cnpj]/page.tsx`. "Doações eleitorais" renders two
      StatCards — `donation_in` and `donation_out` — plus a per-row
      `DataTable` with direction badges and `<SourcePill>` per row. "ROI
      político" runs `computeDonationRoi()` to produce a per-counterparty
      net table colored by sign. Both degrade to `<DataFetchError>` if
      TSE fails so the rest of the page still renders.)

### Phase E9 — Polish

- [x] `/sobre/metodologia#empresas` page section explaining incremental aggregation
      (new route `apps/web/app/sobre/metodologia/page.tsx` covers
      incremental aggregation, the masked-CPF partner-graph heuristic with
      its three confidence tiers, the in-flight CEIS / CNEP integration
      and the upstream sources that populate the index. Both empresas
      pages — overview and `[cnpj]` detail — now carry a footer
      disclaimer linking to `#empresas` so the parcial-value language is
      always one click from the methodology page.)
- [ ] Recompute job (optional, later) to refresh stale `Company.lastFetchedAt`
- [x] Add empresas indicators to home dashboard (Phase 9 aggregations item 9.4)
      (added empresas indicators to the commented-out home dashboard in
      `apps/web/app/(home)/page.tsx` so they ship live the moment the
      dashboard is uncommented: a stat row for CNPJs indexados / total
      observado / eventos observados — with the canonical `ParcialNote`
      next to the BRL total — plus a top-5 fornecedores preview wired to
      `getCompanyOverviewStats` and `getTopCompaniesByObservedValue`. The
      "Explorar por área" grid also gained an Empresas tile.)

---

## 10. Open questions (resolve as we hit them, not now)

1. Does OpenCNPJ rate-limit anonymous use? If yes, add token bucket in `cachedFetch` — but
   only if we hit it. Default to assuming generous limits given the 30-day TTL.
2. Should we track `Company.lastFetchedAt` skew and re-fetch in the background after 30
   days, or just lazy-refresh on next user visit? **Default: lazy.** Revisit only if
   stale-data complaints appear.
3. Cross-reference UI: paginate when a partner is in many companies? Cap at 50 with a
   "ver todos" link to a dedicated page. Decide during E5.
4. Do we expose `CompanyTransaction` as a raw "atividade observada" feed on the detail
   page (audit trail)? Probably yes, as a collapsible section — decide during E5.

---

## 11. What NOT to do

- ❌ Use CNPJá. We replaced it with OpenCNPJ — including in mock URLs.
- ❌ Store `Company` rows from a non-OpenCNPJ source (e.g. fabricate a row
  from a CEAP expense's supplier name). Always go through `ingestCompany()`.
- ❌ Display partner cross-references without the "Vínculo provável" prefix
  and confidence badge.
- ❌ Display aggregated totals without the "valor parcial" disclaimer.
- ❌ Persist real (unmasked) CPFs anywhere. OpenCNPJ already masks them; we
  must never reconstruct them by joining with anything.
- ❌ Add new transaction types without updating the `type` enum string list
  in this document and in the `CompanyTransaction.type` JSDoc.
- ❌ Block the rendering of an unrelated page (e.g. deputy expenses) on a DB
  failure during `recordCompanyTransaction()`. That call is fire-and-forget
  with `try/catch`.
