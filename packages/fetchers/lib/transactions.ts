/**
 * @file transactions.ts
 * @description Side-effect helpers that persist observed financial events to
 * the empresas partner-graph index.
 *
 * Per EMPRESAS-PLAN.md §5, fetchers that surface CNPJ-keyed data (CEAP
 * receipts, contracts, donations, bids) must record an idempotent
 * `CompanyTransaction` row for every row they return. Aggregation is then
 * served by a single SQL `GROUP BY` from the empresas detail page.
 *
 * The helpers in this module enforce two invariants on top of the raw
 * `recordCompanyTransaction()` query:
 *
 * 1. **CNPJ filter.** CEAP rows include both supplier CNPJs (juridical
 *    persons) and supplier CPFs (natural persons). We only record CNPJ
 *    counterparties — the empresas module is about companies, and we never
 *    want to insert an unmasked CPF anywhere in the index.
 * 2. **Fire-and-forget error containment.** A failure inside the DB layer
 *    must NEVER break the public-data page that triggered the recording.
 *    Every call here is wrapped in `try/catch`; unexpected exceptions are
 *    swallowed silently (errors are surfaced via observability, not by
 *    throwing back into the request lifecycle).
 *
 * These helpers are imported by `camara.ts` and `senado.ts` (Phase E4) and
 * will be reused by Phase E7 (contracts) and Phase E8 (donations).
 */

import { recordCompanyTransaction } from "@imposterio/db/queries/companies"
import type { CompanyTransactionType } from "@imposterio/types"

import { ingestCompany } from "../opencnpj"

/**
 * Fires {@link ingestCompany} once per unique CNPJ in the input set.
 *
 * Called as a fire-and-forget side-effect from the batch helpers below so
 * that whenever the platform observes a new CNPJ via CEAP / contract /
 * donation data, the partner-graph index (cadastral row + QSA) is
 * back-filled from OpenCNPJ in the same request lifecycle.
 *
 * Cost considerations:
 *
 * - `ingestCompany` delegates to `getCompanyDetail`, which is Redis-cached
 *   for 30 days. So the network call is paid at most once per CNPJ per
 *   month regardless of how many CEAP rows reference it.
 * - Postgres upserts are idempotent, so re-running on cache hits is cheap
 *   (one INSERT…ON CONFLICT and a delete-and-insert of the QSA).
 * - Errors are swallowed: a single 404 / 5xx / DB hiccup must not break
 *   the public-data page that triggered the recording.
 *
 * @param cnpjs - 14-digit CNPJs to back-fill. Duplicates are de-duplicated
 *                via the `Set` before fanning out.
 */
async function backfillCompanies(cnpjs: Iterable<string>): Promise<void> {
  const unique = new Set<string>()
  for (const c of cnpjs) if (c) unique.add(c)
  if (unique.size === 0) return

  await Promise.allSettled(
    [...unique].map(async (cnpj) => {
      try {
        await ingestCompany(cnpj)
      } catch {
        // Intentionally silent — same fire-and-forget contract as the
        // transaction recorders.
      }
    }),
  )
}

/**
 * Returns the input as a 14-digit CNPJ (no punctuation) when it parses as
 * one, or `null` otherwise.
 *
 * CEAP supplier-document fields can hold either a CNPJ (14 digits, juridical
 * person) or a CPF (11 digits, natural person). The empresas module only
 * indexes companies, so we discard non-CNPJ inputs entirely. Whitespace and
 * formatting characters are stripped before the length check.
 *
 * @param value - Raw supplier document, possibly null/undefined/formatted
 * @returns 14-digit CNPJ string, or null
 *
 * @example
 * extractCnpj("12.345.678/0001-90") // → "12345678000190"
 * extractCnpj("12345678000190")     // → "12345678000190"
 * extractCnpj("12345678901")        // → null (CPF, 11 digits)
 * extractCnpj(undefined)            // → null
 */
export function extractCnpj(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = String(value).replace(/\D/g, "")
  return digits.length === 14 ? digits : null
}

/** Input shape for {@link recordCeapTransaction}. */
export interface CeapTransactionInput {
  /** 14-digit CNPJ (callers must pre-filter via {@link extractCnpj}). */
  cnpj: string
  /** Stable natural key from the source — typically `codDocumento`. */
  sourceKey: string
  /** Source API URL the row came from — populates `_source` on aggregates. */
  sourceUrl: string
  /** Net reimbursed value in BRL. */
  value: number
  year: number
  /** Reference month (1–12) when published, otherwise null. */
  month?: number | null
  /** Counterparty tag (e.g. `"deputy:204554"`, `"senator:5672"`). */
  counterparty: string
}

/**
 * Persists a single CEAP receipt as an idempotent `CompanyTransaction`.
 *
 * Idempotent on `(cnpj, type, sourceKey)` — re-recording the same receipt
 * across cache misses, server restarts or repeat user visits is a no-op for
 * aggregation. The DB upsert never throws back to the caller; transient
 * failures are intentionally silent so a hiccup never blocks rendering.
 *
 * @param input - Pre-validated transaction columns (see {@link CeapTransactionInput})
 */
export async function recordCeapTransaction(
  input: CeapTransactionInput,
): Promise<void> {
  try {
    await recordCompanyTransaction({
      type: "ceap" satisfies CompanyTransactionType,
      cnpj: input.cnpj,
      sourceKey: input.sourceKey,
      sourceUrl: input.sourceUrl,
      value: input.value,
      year: input.year,
      month: input.month ?? null,
      counterparty: input.counterparty,
    })
  } catch {
    // Intentionally silent — DB hiccups must not break the public-data page.
    // Phase E9 will add observability for this branch.
  }
}

/** A minimal view of a CEAP row — both Câmara and Senado map to this shape. */
export interface CeapExpenseRow {
  /** Supplier CPF or CNPJ (formatted or unformatted). */
  supplierDocument?: string | null
  /** `codDocumento` from the source API (cast to string). */
  documentCode?: string | null
  /** Net reimbursed value in BRL. */
  value: number
  year: number
  month: number
}

/**
 * Records every CNPJ-keyed CEAP receipt in `expenses` as a side effect.
 *
 * Drops rows with a CPF supplier or a missing `documentCode` (no idempotency
 * anchor → would risk duplicates). All writes proceed concurrently via
 * `Promise.allSettled` so a single failure cannot reject the batch and the
 * caller never sees a thrown error.
 *
 * @param expenses     - Mapped CEAP rows from a fetcher
 * @param sourceUrl    - The `_source` URL associated with the listing
 * @param counterparty - Tag identifying the parliamentarian (e.g. `"deputy:204554"`)
 */
export async function recordCeapTransactions(
  expenses: readonly CeapExpenseRow[],
  sourceUrl: string,
  counterparty: string,
): Promise<void> {
  const cnpjs: string[] = []
  const writes = expenses.map(async (row) => {
    const cnpj = extractCnpj(row.supplierDocument ?? null)
    if (!cnpj) return
    if (!row.documentCode) return
    cnpjs.push(cnpj)
    await recordCeapTransaction({
      cnpj,
      sourceKey: String(row.documentCode),
      sourceUrl,
      value: row.value,
      year: row.year,
      month: row.month,
      counterparty,
    })
  })
  await Promise.allSettled(writes)
  await backfillCompanies(cnpjs)
}

/** A minimal view of a federal contract row (Portal da Transparência). */
export interface ContractTransactionRow {
  /** Vendor CNPJ — already normalized to 14 digits, no punctuation. */
  cnpj: string
  /** Stable contract id from the upstream catalog (idempotency anchor). */
  contractId: string
  /** Contracted value in BRL — `currentValue` is preferred, falling back to `initialValue`. */
  value: number
  /** Contract signature year (or start year when signature is missing). */
  year: number
  /** Reference month (1–12) when published, otherwise null. */
  month?: number | null
  /** Free-form counterparty tag (e.g. SIAFI code: `"agency:26000"`). */
  counterparty: string
}

/**
 * Persists a single federal contract as an idempotent `CompanyTransaction`
 * with `type = "contract"`.
 *
 * Idempotent on `(cnpj, "contract", contractId)` — re-running across cache
 * misses, server restarts and repeated visits is a no-op for aggregation.
 * Errors never surface to the caller; transient DB hiccups are intentionally
 * silent so a contract listing page keeps rendering.
 *
 * @param input     - Pre-validated contract columns
 * @param sourceUrl - Source API URL the row was returned by — populates the
 *                    `_source` URL on the aggregated row
 */
export async function recordContractTransaction(
  input: ContractTransactionRow,
  sourceUrl: string,
): Promise<void> {
  try {
    await recordCompanyTransaction({
      type: "contract" satisfies CompanyTransactionType,
      cnpj: input.cnpj,
      sourceKey: input.contractId,
      sourceUrl,
      value: input.value,
      year: input.year,
      month: input.month ?? null,
      counterparty: input.counterparty,
    })
  } catch {
    // Intentionally silent — DB hiccups must not break the public-data page.
  }
}

/**
 * Records every CNPJ-keyed row in `contracts` as a `type = "contract"`
 * transaction.
 *
 * Drops rows missing a vendor CNPJ or a stable contract id (no idempotency
 * anchor → would risk duplicates). All writes proceed concurrently via
 * `Promise.allSettled` so a single failure cannot reject the batch.
 *
 * @param contracts  - Pre-mapped contract rows (CNPJ-only, contract-id present)
 * @param sourceUrl  - The `_source` URL associated with the listing
 */
export async function recordContractTransactions(
  contracts: readonly ContractTransactionRow[],
  sourceUrl: string,
): Promise<void> {
  const cnpjs: string[] = []
  const writes = contracts.map(async (row) => {
    if (!row.cnpj || !row.contractId) return
    cnpjs.push(row.cnpj)
    await recordContractTransaction(row, sourceUrl)
  })
  await Promise.allSettled(writes)
  await backfillCompanies(cnpjs)
}

/** A minimal view of a TSE campaign donation row — both directions. */
export interface DonationTransactionRow {
  /** Vendor / donor CNPJ — already normalized to 14 digits. */
  cnpj: string
  /** Stable TSE row id (idempotency anchor). */
  donationId: string
  /** Donation value in BRL (positive). */
  value: number
  /** Election year. */
  year: number
  /** Reference month (1–12) when reported, otherwise null. */
  month?: number | null
  /** Free-form counterparty (typically `"candidate:{cpf}"` or `"party:{cnpj}"`). */
  counterparty: string
  /** `"in"` when the company received, `"out"` when the company donated. */
  direction: "in" | "out"
}

/**
 * Persists a single TSE campaign donation as an idempotent
 * `CompanyTransaction` (`type = "donation_in" | "donation_out"`).
 *
 * Idempotent on `(cnpj, type, donationId)` so re-running across cache
 * misses, server restarts and repeat visits is a no-op for aggregation.
 * Errors never surface to the caller — same fire-and-forget contract used
 * by every other helper in this file.
 *
 * @param input     - Pre-validated donation columns
 * @param sourceUrl - Source API URL the row was returned by — populates the
 *                    `_source` URL on the aggregated row
 */
export async function recordDonationTransaction(
  input: DonationTransactionRow,
  sourceUrl: string,
): Promise<void> {
  const type: CompanyTransactionType =
    input.direction === "in" ? "donation_in" : "donation_out"
  try {
    await recordCompanyTransaction({
      type,
      cnpj: input.cnpj,
      sourceKey: input.donationId,
      sourceUrl,
      value: input.value,
      year: input.year,
      month: input.month ?? null,
      counterparty: input.counterparty,
    })
  } catch {
    // Intentionally silent — DB hiccups must not break the public-data page.
  }
}

/**
 * Records every donation row as a `donation_in` / `donation_out`
 * transaction depending on its `direction` field.
 *
 * Drops rows missing a CNPJ or a stable donation id (no idempotency
 * anchor → would risk duplicates). All writes proceed concurrently via
 * `Promise.allSettled` so a single failure cannot reject the batch.
 *
 * @param donations - Pre-mapped donation rows (each tagged with `direction`)
 * @param sourceUrl - The `_source` URL associated with the listing
 */
export async function recordDonationTransactions(
  donations: readonly DonationTransactionRow[],
  sourceUrl: string,
): Promise<void> {
  const cnpjs: string[] = []
  const writes = donations.map(async (row) => {
    if (!row.cnpj || !row.donationId) return
    cnpjs.push(row.cnpj)
    await recordDonationTransaction(row, sourceUrl)
  })
  await Promise.allSettled(writes)
  await backfillCompanies(cnpjs)
}
