/**
 * @file tse.ts
 * @description Fetchers for the TSE (Tribunal Superior Eleitoral) public data
 * portal — `dadosabertos.tse.jus.br`.
 *
 * Phase E8 (per EMPRESAS-PLAN.md) wires the *campaign donations* slice of
 * this portal into the empresas module. Two flows feed the empresas detail
 * page's "Doações eleitorais" + "ROI político" sections:
 *
 * 1. **Receitas de candidatos / partidos** — rows where a CNPJ appears as
 *    the *donor*. From the company's perspective these are
 *    `donation_out` transactions ("Doações feitas").
 * 2. **Despesas de candidatos / partidos** — rows where a CNPJ appears as
 *    the *vendor* paid by a campaign. From the company's perspective these
 *    are `donation_in` transactions ("Doações recebidas" — the user
 *    received campaign money for goods or services).
 *
 * Base URL: https://dadosabertos.tse.jus.br
 * Auth:     none required (public CKAN portal)
 * Cadence:  per-election (annual files for federal years, biennial overall)
 *
 * ## Resource IDs and the per-year lookup
 *
 * TSE publishes one CKAN resource per dataset per election year. Resource
 * IDs are stable inside a given dataset version but change every cycle.
 * They live in {@link DONATION_RESOURCES} keyed by year + dataset; the
 * resolver returns `null` for years we have not registered yet so the
 * fetcher can degrade gracefully (empty array, no upstream call) rather
 * than guessing a path.
 *
 * Resource IDs are confirmed via the `package_show` action against the
 * `prestacao-de-contas-eleitorais-{year}` package — see TSE-CKAN-NOTES.md
 * (TODO Phase E9) for the exact `package_show` URLs and the mapping of
 * column names per cycle.
 *
 * ## Side effects (empresas partner-graph index)
 *
 * Per EMPRESAS-PLAN.md §5, every CNPJ-keyed row returned by these fetchers
 * is recorded as an idempotent `CompanyTransaction` row (`type =
 * "donation_in"` or `"donation_out"`) via `recordDonationTransactions()`.
 * The empresas detail page consumes the resulting aggregates without
 * re-fetching TSE on every visit.
 *
 * ## Field mapping (per dataset)
 *
 * Receitas (donor-side):
 * - `SQ_RECEITA`              → `id`
 * - `ANO_ELEICAO`             → `year`
 * - `NR_CPF_CNPJ_DOADOR`      → `donorDocument`
 * - `NM_DOADOR_RFB` / `NM_DOADOR` → `donorName`
 * - `NR_CPF_CANDIDATO`        → `recipientDocument`
 * - `NM_CANDIDATO`            → `recipientName`
 * - `DS_CARGO`                → `recipientPosition`
 * - `SG_PARTIDO`              → `recipientParty`
 * - `SG_UF`                   → `recipientUf`
 * - `VR_RECEITA`              → `value`
 * - `DT_RECEITA`              → `donationDate`
 *
 * Despesas (vendor-side):
 * - `SQ_DESPESA`              → `id`
 * - `ANO_ELEICAO`             → `year`
 * - `NR_CPF_CNPJ_FORNECEDOR`  → recipient-side CNPJ (the queried company)
 * - `NM_FORNECEDOR_RFB`       → `donorName` is repurposed as the vendor
 *                                name when reading vendor-side rows; for
 *                                clarity the public type still calls it
 *                                `donorName` because the TSE schema treats
 *                                "the entity originating the money" as the
 *                                donor.
 * - `NR_CPF_CANDIDATO`        → `donorDocument` (the candidate footing the bill)
 * - `NM_CANDIDATO`            → `recipientName`
 * - `DS_CARGO`                → `recipientPosition`
 * - `SG_PARTIDO`              → `recipientParty`
 * - `SG_UF`                   → `recipientUf`
 * - `VR_DESPESA`              → `value`
 * - `DT_DESPESA`              → `donationDate`
 */

import type { CampaignDonation, WithSource } from "@imposterio/types"

import { ApiError, cachedFetch } from "./lib/cache"
import { ENDPOINTS } from "./lib/endpoints"
import { recordDonationTransactions } from "./lib/transactions"
import { TTL } from "./lib/ttl"

// ── Resource ID lookup ───────────────────────────────────────────────

/**
 * Per-year CKAN resource IDs for the donation datasets.
 *
 * **Empty by design (2026-05-10).** Investigation against
 * `dadosabertos.tse.jus.br` confirmed that TSE only publishes prestação de
 * contas eleitorais as CSV/ZIP files — none of the resources under
 * `prestacao-de-contas-eleitorais-{year}` carry `datastore_active: true`,
 * so `datastore_search?resource_id=...&filters=...` returns 404 for every
 * candidate ID. Real per-CNPJ lookup requires an ETL worker that downloads
 * the CSV bulks, indexes by `NR_CPF_CNPJ_DOADOR` / `NR_CPF_CNPJ_FORNECEDOR`
 * into our PostgreSQL, and answers reads from the local index.
 *
 * Until that worker ships (tracked in `INTEGRATION.md` Phase 7C), this map
 * stays empty so {@link getCompanyDonations} short-circuits cleanly. The
 * fetcher still tolerates 404s on a per-resource basis, so re-populating
 * this map with future datastore-enabled resources requires no other
 * changes.
 *
 * @see DECISIONS.md "TSE donations require an ETL worker (CKAN does not expose datastore_search)"
 */
export const DONATION_RESOURCES: Record<
  number,
  { receitas: string; despesas: string }
> = {}

/** Returns the years we have registered resource IDs for, sorted descending. */
function knownDonationYears(): number[] {
  return Object.keys(DONATION_RESOURCES)
    .map((y) => Number(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a)
}

// ── Raw CKAN payload types (internal) ────────────────────────────────

/** A single row from the receitas (donor-side) dataset. */
interface TseReceitaRaw {
  SQ_RECEITA?: string | number
  ANO_ELEICAO?: string | number
  NR_CPF_CNPJ_DOADOR?: string | null
  NM_DOADOR?: string | null
  NM_DOADOR_RFB?: string | null
  NR_CPF_CANDIDATO?: string | null
  NM_CANDIDATO?: string | null
  DS_CARGO?: string | null
  SG_PARTIDO?: string | null
  SG_UF?: string | null
  VR_RECEITA?: string | number | null
  DT_RECEITA?: string | null
}

/** A single row from the despesas (vendor-side) dataset. */
interface TseDespesaRaw {
  SQ_DESPESA?: string | number
  ANO_ELEICAO?: string | number
  NR_CPF_CNPJ_FORNECEDOR?: string | null
  NM_FORNECEDOR?: string | null
  NM_FORNECEDOR_RFB?: string | null
  NR_CPF_CANDIDATO?: string | null
  NM_CANDIDATO?: string | null
  DS_CARGO?: string | null
  SG_PARTIDO?: string | null
  SG_UF?: string | null
  VR_DESPESA?: string | number | null
  DT_DESPESA?: string | null
}

/** Top-level CKAN datastore_search payload. */
interface CkanDatastoreEnvelope<T> {
  success?: boolean
  result?: { records?: T[] }
}

// ── Mapping helpers ──────────────────────────────────────────────────

/**
 * Parses TSE numeric fields, which arrive as either numbers or strings with
 * comma decimals (`"1.234,56"`). Returns 0 for missing or unparseable input
 * so a single corrupt row does not zero out an entire aggregate.
 */
function parseValue(input: number | string | null | undefined): number {
  if (typeof input === "number" && Number.isFinite(input)) return input
  if (typeof input !== "string") return 0
  const normalized = input.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

/**
 * Normalizes a date string published by TSE to ISO form (`YYYY-MM-DD`).
 *
 * Accepts both `DD/MM/YYYY` (the historical TSE format) and `YYYY-MM-DD`
 * (the modern CKAN format). Returns null for missing or unrecognized values.
 */
function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}

/**
 * Strips formatting characters from a TSE-published document number and
 * returns it as digits only. The same field carries CPFs (11 digits) and
 * CNPJs (14 digits); callers must check the length when they need to
 * distinguish them.
 */
function digitsOnly(input: string | null | undefined): string {
  if (!input) return ""
  return String(input).replace(/\D/g, "")
}

/** Reduces `ANO_ELEICAO` to a sane integer year, falling back to a default. */
function pickYear(raw: string | number | null | undefined, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10)
  return Number.isFinite(n) && n > 1900 ? n : fallback
}

/** Maps a receita row into the public {@link CampaignDonation} shape. */
function mapReceita(raw: TseReceitaRaw, year: number): Omit<CampaignDonation, "_source"> {
  return {
    id: String(raw.SQ_RECEITA ?? ""),
    year: pickYear(raw.ANO_ELEICAO, year),
    direction: "out",
    value: parseValue(raw.VR_RECEITA),
    donationDate: normalizeDate(raw.DT_RECEITA),
    donorName: (raw.NM_DOADOR_RFB ?? raw.NM_DOADOR ?? "").trim(),
    donorDocument: digitsOnly(raw.NR_CPF_CNPJ_DOADOR),
    recipientName: (raw.NM_CANDIDATO ?? "").trim(),
    recipientDocument: digitsOnly(raw.NR_CPF_CANDIDATO),
    recipientPosition: (raw.DS_CARGO ?? "").trim(),
    recipientParty: (raw.SG_PARTIDO ?? "").trim(),
    recipientUf: (raw.SG_UF ?? "").trim(),
  }
}

/** Maps a despesa row into the public {@link CampaignDonation} shape. */
function mapDespesa(raw: TseDespesaRaw, year: number): Omit<CampaignDonation, "_source"> {
  return {
    id: String(raw.SQ_DESPESA ?? ""),
    year: pickYear(raw.ANO_ELEICAO, year),
    direction: "in",
    value: parseValue(raw.VR_DESPESA),
    donationDate: normalizeDate(raw.DT_DESPESA),
    // From the company's perspective, the donor (sender of money) is the
    // candidate / campaign and the "recipient" of services is the company
    // itself. We surface the candidate as `recipientName` so the UI can
    // render the row as "Recebido de {recipientName}".
    donorName: (raw.NM_FORNECEDOR_RFB ?? raw.NM_FORNECEDOR ?? "").trim(),
    donorDocument: digitsOnly(raw.NR_CPF_CNPJ_FORNECEDOR),
    recipientName: (raw.NM_CANDIDATO ?? "").trim(),
    recipientDocument: digitsOnly(raw.NR_CPF_CANDIDATO),
    recipientPosition: (raw.DS_CARGO ?? "").trim(),
    recipientParty: (raw.SG_PARTIDO ?? "").trim(),
    recipientUf: (raw.SG_UF ?? "").trim(),
  }
}

// ── Public fetchers ──────────────────────────────────────────────────

/** Filters supported by {@link getCompanyDonations}. */
export interface GetCompanyDonationsFilters {
  /**
   * Election years to include. When omitted, every year registered in
   * {@link DONATION_RESOURCES} is queried — typically the most recent
   * federal + municipal cycles.
   */
  years?: number[]
}

/**
 * Fetches every campaign donation linked to a CNPJ, in either direction.
 *
 * Pipeline (per registered year):
 *
 * 1. Look up the receitas + despesas resource IDs for the year.
 * 2. Query the CKAN datastore via {@link cachedFetch} with a per-CNPJ
 *    filter. The URL — and therefore the cache key — encodes both the
 *    resource ID and the filter, so two different CNPJs against the same
 *    resource never share a cache entry.
 * 3. Map raw rows to {@link CampaignDonation} (one shape, both directions
 *    via the `direction` discriminator).
 * 4. Fire-and-forget: record every row as an idempotent
 *    `CompanyTransaction` (`donation_in` / `donation_out`) so the empresas
 *    detail page can serve aggregated totals without re-hitting TSE.
 *
 * The combined result is a single array sorted by year DESC, then date
 * DESC — newest activity first. Both `_source` URLs are surfaced via the
 * combined result's `_source` field (the receitas URL takes priority for
 * UI deep-linking; despesas have their own `_source` per row).
 *
 * @param cnpj    - CNPJ in any format (will be normalized to 14 digits)
 * @param filters - Optional year filter (defaults to every registered year)
 * @returns Array of donations with `_source` injected
 *
 * @example
 * ```typescript
 * const rows = await getCompanyDonations("11.222.333/0001-81")
 * for (const row of rows) {
 *   console.log(row.year, row.direction, row.value, row.recipientName)
 * }
 * ```
 */
export async function getCompanyDonations(
  cnpj: string,
  filters: GetCompanyDonationsFilters = {},
): Promise<WithSource<CampaignDonation[]>> {
  const normalized = digitsOnly(cnpj)
  const years = filters.years ?? knownDonationYears()

  // Skip the upstream call entirely for malformed CNPJs — the empresas
  // detail page already short-circuits the route when this happens, but
  // we double-guard so a stray invocation never burns a cache slot on a
  // bad key.
  if (normalized.length !== 14 || years.length === 0) {
    return Object.assign([] as CampaignDonation[], {
      _source: ENDPOINTS.TSE_CKAN_PACKAGES,
    })
  }

  const all: CampaignDonation[] = []
  // Capture the most recent receitas URL we hit so the page-level pill can
  // link the user to a representative request. Per-row `_source` already
  // carries the exact URL each row came from, so this is purely a UX hint.
  let representativeSource: string = ENDPOINTS.TSE_CKAN_PACKAGES

  for (const year of years) {
    const ids = DONATION_RESOURCES[year]
    if (!ids) continue

    const receitasUrl = ENDPOINTS.TSE_CKAN_DATASTORE_FILTERED(ids.receitas, {
      NR_CPF_CNPJ_DOADOR: normalized,
    })
    const despesasUrl = ENDPOINTS.TSE_CKAN_DATASTORE_FILTERED(ids.despesas, {
      NR_CPF_CNPJ_FORNECEDOR: normalized,
    })

    // Both fetches are independent — issue them in parallel. CKAN returns
    // 404 when a resource id has been retired or is still a placeholder
    // (DONATION_RESOURCES JSDoc flags this). Treat 404 as "no rows for this
    // year" rather than propagating an error: a single retired year must
    // not break the whole "Doações eleitorais" section.
    const [receitasEnvelope, despesasEnvelope] = await Promise.all([
      cachedFetch<CkanDatastoreEnvelope<TseReceitaRaw>>(
        receitasUrl,
        TTL.TSE_CAMPAIGN_DONATIONS,
      ).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          return { _source: receitasUrl, result: { records: [] } } as WithSource<
            CkanDatastoreEnvelope<TseReceitaRaw>
          >
        }
        throw err
      }),
      cachedFetch<CkanDatastoreEnvelope<TseDespesaRaw>>(
        despesasUrl,
        TTL.TSE_CAMPAIGN_DONATIONS,
      ).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          return { _source: despesasUrl, result: { records: [] } } as WithSource<
            CkanDatastoreEnvelope<TseDespesaRaw>
          >
        }
        throw err
      }),
    ])

    representativeSource = receitasEnvelope._source

    const receitas = (receitasEnvelope.result?.records ?? []).map((raw) => ({
      ...mapReceita(raw, year),
      _source: receitasEnvelope._source,
    }))
    const despesas = (despesasEnvelope.result?.records ?? []).map((raw) => ({
      ...mapDespesa(raw, year),
      _source: despesasEnvelope._source,
    }))
    all.push(...receitas, ...despesas)
  }

  // Persist every row as a CompanyTransaction. Idempotent on
  // (cnpj, "donation_*", id) so retries / cache misses cannot inflate
  // aggregates. The helper swallows DB errors so a transient Postgres
  // hiccup never breaks the empresas page.
  await recordDonationTransactions(
    all
      .filter((row) => row.id)
      .map((row) => ({
        cnpj: normalized,
        donationId: row.id,
        value: row.value,
        year: row.year,
        month: row.donationDate
          ? Number.parseInt(row.donationDate.slice(5, 7), 10) || null
          : null,
        // Tag the counterparty by the candidate / party identifier on the
        // OTHER side of the transaction. For receitas the company donated
        // TO a candidate (recipientDocument); for despesas the company
        // received FROM a candidate (also recipientDocument under the
        // mapping above). This lets the ROI-político section group "who"
        // we're netting against.
        counterparty: row.recipientDocument
          ? `candidate:${row.recipientDocument}`
          : "candidate:unknown",
        direction: row.direction,
      })),
    representativeSource,
  )

  // Newest-first ordering — year DESC then donation date DESC. Rows
  // missing a date sink to the bottom of their year so they don't break
  // the timeline.
  all.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if (!a.donationDate && !b.donationDate) return 0
    if (!a.donationDate) return 1
    if (!b.donationDate) return -1
    return b.donationDate.localeCompare(a.donationDate)
  })

  return Object.assign(all, { _source: representativeSource })
}

/**
 * Aggregated, per-counterparty view used by the "ROI político" section of
 * the empresas detail page.
 *
 * For each unique counterparty (candidate/party) the company has interacted
 * with, returns:
 *
 * - `donatedOut` — sum of `donation_out` values
 * - `receivedIn` — sum of `donation_in` values
 * - `roi`       — `receivedIn - donatedOut` (positive ⇒ company netted ahead)
 *
 * The result is sorted by absolute ROI magnitude DESC so the most
 * lopsided relationships surface first regardless of sign.
 *
 * Pure derivation from {@link getCompanyDonations}'s output — exported as
 * a separate helper so server pages can call it once and pass the table
 * straight to a client component without re-fetching.
 */
export interface DonationRoiRow {
  /** Candidate CPF / party CNPJ — empty when the source row lacked one. */
  counterpartyDocument: string
  /** Display name of the candidate / party / committee. */
  counterpartyName: string
  /** Office (e.g. "DEPUTADO FEDERAL") — empty for party-level rows. */
  position: string
  party: string
  uf: string
  /** Sum of `donation_out` rows in BRL (money the company gave). */
  donatedOut: number
  /** Sum of `donation_in` rows in BRL (money the company received). */
  receivedIn: number
  /** `receivedIn - donatedOut` — positive when the company netted ahead. */
  roi: number
}

/**
 * Reduces a list of donations into per-counterparty ROI rows.
 *
 * The reducer is intentionally tolerant of missing counterparty
 * identifiers: rows without `recipientDocument` are still grouped under
 * the recipient *name* so the UI can surface "outras doações" without a
 * synthetic group key clashing with real candidate CPFs.
 */
export function computeDonationRoi(
  donations: readonly CampaignDonation[],
): DonationRoiRow[] {
  const groups = new Map<string, DonationRoiRow>()
  for (const row of donations) {
    const key = row.recipientDocument || `name:${row.recipientName}`
    const existing = groups.get(key)
    if (existing) {
      if (row.direction === "out") existing.donatedOut += row.value
      else existing.receivedIn += row.value
      existing.roi = existing.receivedIn - existing.donatedOut
      continue
    }
    groups.set(key, {
      counterpartyDocument: row.recipientDocument,
      counterpartyName: row.recipientName,
      position: row.recipientPosition,
      party: row.recipientParty,
      uf: row.recipientUf,
      donatedOut: row.direction === "out" ? row.value : 0,
      receivedIn: row.direction === "in" ? row.value : 0,
      roi:
        (row.direction === "in" ? row.value : 0) -
        (row.direction === "out" ? row.value : 0),
    })
  }
  return [...groups.values()].sort(
    (a, b) => Math.abs(b.roi) - Math.abs(a.roi),
  )
}
