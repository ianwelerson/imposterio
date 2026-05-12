/**
 * @file transparencia.ts
 * @description Fetchers for the Portal da Transparência REST API
 * (`api.portaldatransparencia.gov.br/api-de-dados`).
 *
 * The Portal da Transparência is the federal executive's transparency portal,
 * publishing contracts, payments, civil-servant compensation, sanctions
 * (CEIS / CNEP), travel and payment-card spending. Imposterio integrates the
 * portal in two phases: contracts (Phase 3C / Phase E7) land first because
 * they are the highest-signal data point for the empresas module — every
 * contract directly answers "how much did the federal government pay this
 * company".
 *
 * Official docs: https://api.portaldatransparencia.gov.br/swagger-ui/index.html
 * Base URL:      https://api.portaldatransparencia.gov.br/api-de-dados
 * Auth:          free API key, sent as `chave-api-dados` header
 * Registration:  https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email
 * Rate limit:    400 req/min (business hours), 700 req/min (overnight)
 *
 * ## Side effects (empresas partner-graph index)
 *
 * Per EMPRESAS-PLAN.md §5, every contract returned by {@link getContracts}
 * is recorded as an idempotent `CompanyTransaction` row (`type = "contract"`)
 * via `recordContractTransactions()`. This grows the aggregated totals shown
 * on the empresas detail page without requiring a worker — the same contract
 * across cache hits, server restarts and repeat visits is a no-op for
 * aggregation thanks to the `(cnpj, type, sourceKey)` unique index.
 *
 * ## Field mapping
 *
 * Portal da Transparência returns Portuguese field names in nested objects;
 * we flatten them to the {@link GovernmentContract} shape:
 *
 * - `id`                                       → `id` (stringified)
 * - `numero`                                   → `number`
 * - `objeto`                                   → `object`
 * - `fornecedor.nome`                          → `supplierName`
 * - `fornecedor.cnpjFormatado` / `cpfCnpj`     → `supplierCnpj` (digits only)
 * - `unidadeGestora.orgaoVinculado.nome`       → `agency`
 * - `unidadeGestora.orgaoVinculado.codigoSIAFI`→ `agencyCode`
 * - `unidadeGestora.codigo`                    → `managingUnitCode`
 * - `modalidadeCompra`                         → `modality`
 * - `situacaoCompra`                           → `status`
 * - `dataAssinatura`                           → `signatureDate` (ISO)
 * - `dataInicioVigencia` / `dataFimVigencia`   → `startDate` / `endDate`
 * - `valorInicialCompra` / `valorFinalCompra`  → `initialValue` / `currentValue`
 * - `linkPaginaContrato`                       → `linkPdt`
 *
 * Date strings are sometimes published as `DD/MM/YYYY` and sometimes as
 * `YYYY-MM-DD`. {@link normalizeDate} reduces both to ISO form so downstream
 * formatting and aggregation can treat them uniformly.
 */

import type {
  GovernmentContract,
  WithSource,
} from "@imposterio/types"

import { ApiError, cachedFetch } from "./lib/cache"
import { ENDPOINTS } from "./lib/endpoints"
import { recordContractTransactions } from "./lib/transactions"
import { TTL } from "./lib/ttl"

// ── Auth header injection ────────────────────────────────────────────

/**
 * Builds the `chave-api-dados` header expected by every Portal da
 * Transparência endpoint.
 *
 * The function is called per-request rather than evaluated at module load so
 * Vitest tests can set `TRANSPARENCIA_API_KEY` after importing the module
 * (the env var is also resolved lazily by the dev server when reading
 * `apps/web/.env.local`).
 */
function authHeaders(): Record<string, string> {
  const key = process.env.TRANSPARENCIA_API_KEY ?? ""
  return key ? { "chave-api-dados": key } : {}
}

// ── Raw API response types (internal, not exported) ─────────────────

/** Fornecedor block as returned by the contracts endpoint. */
interface TranspContractSupplierRaw {
  cnpjFormatado?: string | null
  cpfFormatado?: string | null
  /** Some endpoints expose `cpfCnpj` (no formatting) instead of the formatted variants. */
  cpfCnpj?: string | null
  numeroDeInscricaoSocial?: string | null
  nome?: string | null
  razaoSocialReceita?: string | null
  nomeFantasiaReceita?: string | null
  tipo?: "PJ" | "PF" | null
}

/** Orgao block — both `orgaoVinculado` and `orgaoMaximo` share this shape. */
interface TranspOrgaoRaw {
  codigoSIAFI?: string | null
  cnpj?: string | null
  sigla?: string | null
  nome?: string | null
}

/** Unidade gestora block. */
interface TranspManagingUnitRaw {
  codigo?: string | null
  nome?: string | null
  nomeResumido?: string | null
  descricaoPoder?: string | null
  orgaoVinculado?: TranspOrgaoRaw | null
  orgaoMaximo?: TranspOrgaoRaw | null
}

/** Single contract row as returned by `GET /contratos`. */
interface TranspContractRaw {
  id?: number | string
  numero?: string | null
  objeto?: string | null
  fundamentoLegal?: string | null
  modalidadeCompra?: string | null
  situacaoCompra?: string | null
  dataAssinatura?: string | null
  dataPublicacaoDOU?: string | null
  dataInicioVigencia?: string | null
  dataFimVigencia?: string | null
  valorInicialCompra?: number | string | null
  valorFinalCompra?: number | string | null
  fornecedor?: TranspContractSupplierRaw | null
  unidadeGestora?: TranspManagingUnitRaw | null
  linkPaginaContrato?: string | null
}

// ── Mapper helpers ───────────────────────────────────────────────────

/**
 * Normalizes a date string published by Portal da Transparência to ISO form
 * (`YYYY-MM-DD`).
 *
 * Accepts both `DD/MM/YYYY` (the historical format) and `YYYY-MM-DD` (the
 * format used by newer responses). Returns null for missing or unrecognized
 * values so callers can branch on presence rather than parsing magic strings.
 */
function normalizeDate(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  // ISO already.
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  // DD/MM/YYYY → YYYY-MM-DD.
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return null
}

/**
 * Parses a numeric value that may arrive as a number or a string with comma
 * decimals (`"100.000,00"`). Defaults to 0 when missing.
 */
function parseValue(input: number | string | null | undefined): number {
  if (typeof input === "number" && Number.isFinite(input)) return input
  if (typeof input !== "string") return 0
  // Replace `.` thousands separator before reinterpreting `,` as the decimal mark.
  const normalized = input.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

/**
 * Extracts the vendor CNPJ from a `fornecedor` block, preferring fields that
 * already carry digits-only values. Returns an empty string when the row does
 * not carry a CNPJ — natural-person vendors (CPF) never make it to the
 * empresas index.
 */
function extractSupplierCnpj(supplier: TranspContractSupplierRaw | null | undefined): string {
  if (!supplier) return ""
  // The PJ/PF flag is the most reliable signal — when present, it tells us
  // upfront whether this row carries a CNPJ at all. A missing flag means
  // older payload versions; we still try the digit fields below.
  if (supplier.tipo === "PF") return ""
  const candidates = [
    supplier.numeroDeInscricaoSocial,
    supplier.cpfCnpj,
    supplier.cnpjFormatado,
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const digits = String(candidate).replace(/\D/g, "")
    if (digits.length === 14) return digits
  }
  return ""
}

/**
 * Maps a raw contract row to the public {@link GovernmentContract} shape.
 *
 * Defensive against partial payloads — missing nested objects degrade to
 * empty strings rather than throwing, so a single corrupt row does not break
 * the whole listing.
 */
function mapContract(raw: TranspContractRaw): GovernmentContract {
  const supplier = raw.fornecedor ?? null
  const unit = raw.unidadeGestora ?? null
  const orgao = unit?.orgaoVinculado ?? null
  const initial = parseValue(raw.valorInicialCompra)
  const current = parseValue(raw.valorFinalCompra)

  return {
    id: String(raw.id ?? ""),
    number: raw.numero?.trim() ?? "",
    object: raw.objeto?.trim() ?? "",
    supplierName:
      supplier?.razaoSocialReceita?.trim() ||
      supplier?.nome?.trim() ||
      "",
    supplierCnpj: extractSupplierCnpj(supplier),
    agency: orgao?.nome?.trim() ?? "",
    agencyCode: orgao?.codigoSIAFI?.trim() ?? "",
    managingUnitCode: unit?.codigo?.trim() ?? "",
    modality: raw.modalidadeCompra?.trim() ?? "",
    status: raw.situacaoCompra?.trim() ?? "",
    signatureDate: normalizeDate(raw.dataAssinatura),
    startDate: normalizeDate(raw.dataInicioVigencia),
    endDate: normalizeDate(raw.dataFimVigencia),
    initialValue: initial,
    // Some rows publish `valorFinalCompra: 0` even when the contract is
    // active — fall back to the initial value so aggregates do not collapse
    // to zero. Both fields are surfaced separately in the type for callers
    // that need to distinguish committed vs. signed value.
    currentValue: current > 0 ? current : initial,
    linkPdt: raw.linkPaginaContrato?.trim() ?? "",
  }
}

/**
 * Picks the year for a contract transaction. Signature year is preferred
 * because it anchors the row to the period money was committed; we fall
 * back to start year, then to the current year as a last resort.
 */
function pickContractYear(c: GovernmentContract): number {
  const candidates = [c.signatureDate, c.startDate]
  for (const iso of candidates) {
    if (!iso) continue
    const yr = Number(iso.slice(0, 4))
    if (!Number.isNaN(yr) && yr > 1900) return yr
  }
  return new Date().getFullYear()
}

/**
 * Picks the month (1–12) for a contract transaction, preferring signature
 * month and falling back to start month. Returns null when neither is
 * available.
 */
function pickContractMonth(c: GovernmentContract): number | null {
  const candidates = [c.signatureDate, c.startDate]
  for (const iso of candidates) {
    if (!iso) continue
    const m = Number(iso.slice(5, 7))
    if (!Number.isNaN(m) && m >= 1 && m <= 12) return m
  }
  return null
}

// ── Public fetchers ──────────────────────────────────────────────────

/** Filters supported by {@link getContracts}. */
export interface GetContractsFilters {
  /** Vendor CNPJ — strongly preferred filter; supports formatted or digits-only. */
  cnpj?: string
  /** SIAFI code of the buying agency (e.g. "26000"). */
  agencyCode?: string
  /** Inclusive lower bound, format `DD/MM/YYYY` (Portal da Transparência convention). */
  dataInicial?: string
  /** Inclusive upper bound, format `DD/MM/YYYY`. */
  dataFinal?: string
  /** 1-based page index. The portal caps the page size at 15 rows. */
  pagina?: number
}

/**
 * Fetches federal contracts from Portal da Transparência with optional filters.
 *
 * Pipeline:
 *
 * 1. Build the query string from `filters` (omitting empty values so the URL
 *    stays cache-friendly across permutations).
 * 2. Delegate to {@link cachedFetch} with the `chave-api-dados` header and the
 *    `TRANSP_CONTRACTS` TTL — the response is cached per URL, so repeat visits
 *    do not consume the upstream rate-limit budget.
 * 3. Map raw payload rows to the {@link GovernmentContract} shape.
 * 4. Fire-and-forget: for every CNPJ-keyed row, record an idempotent
 *    `CompanyTransaction` (`type = "contract"`) so the empresas aggregator
 *    can surface running totals. Failures here never propagate.
 *
 * The empresas detail page calls this with `{ cnpj }` to enumerate contracts
 * a specific company has signed with the federal government. Other pages
 * (e.g. `/executivo/...`) may call it with `{ agencyCode }` to enumerate
 * contracts of a single ministry.
 *
 * @param filters - Optional filters; sane request shape requires at least
 *                  one (the portal rejects unbounded full-table scans).
 * @returns Array of contracts with `_source` injected.
 *
 * @throws {ApiError} For non-2xx upstream errors. Empty result sets surface
 *         as an empty array — never as a thrown error.
 *
 * @example
 * ```typescript
 * const contracts = await getContracts({ cnpj: "11222333000181" })
 * for (const c of contracts) {
 *   console.log(c.agency, c.object, c.currentValue)
 *   console.log("Verificar:", c.linkPdt)
 * }
 * ```
 */
export async function getContracts(
  filters: GetContractsFilters = {},
): Promise<WithSource<GovernmentContract[]>> {
  const params = new URLSearchParams()
  if (filters.cnpj) {
    const digits = filters.cnpj.replace(/\D/g, "")
    if (digits) params.set("cnpjContratada", digits)
  }
  if (filters.agencyCode) params.set("codigoOrgao", filters.agencyCode)
  if (filters.dataInicial) params.set("dataInicial", filters.dataInicial)
  if (filters.dataFinal) params.set("dataFinal", filters.dataFinal)
  params.set("pagina", String(filters.pagina ?? 1))

  const url = `${ENDPOINTS.TRANSP_CONTRACTS}?${params.toString()}`

  // Short-circuit when the API key is not configured: Portal da Transparência
  // returns 401 without it, which would otherwise surface in the UI as a
  // generic "fetch error". Empty array + page-level empty state is more honest
  // and lets the rest of the page render normally.
  if (!process.env.TRANSPARENCIA_API_KEY) {
    return Object.assign([] as GovernmentContract[], { _source: url })
  }

  let raw: WithSource<TranspContractRaw[]>
  try {
    raw = await cachedFetch<TranspContractRaw[]>(
      url,
      TTL.TRANSP_CONTRACTS,
      { headers: authHeaders() },
    )
  } catch (err) {
    // 404 from the contracts endpoint means "no contracts match these
    // filters" — surface it as an empty list rather than an error so the
    // CNPJ-detail page does not light up the DataFetchError card.
    if (err instanceof ApiError && err.status === 404) {
      return Object.assign([] as GovernmentContract[], { _source: url })
    }
    throw err
  }

  const contracts = raw.map(mapContract)

  // Persist every CNPJ-keyed row as a CompanyTransaction. Idempotent on
  // (cnpj, "contract", contractId) so retries / cache misses cannot inflate
  // aggregates. Errors are intentionally swallowed by the helper.
  await recordContractTransactions(
    contracts
      .filter((c) => c.supplierCnpj && c.id)
      .map((c) => ({
        cnpj: c.supplierCnpj,
        contractId: c.id,
        value: c.currentValue,
        year: pickContractYear(c),
        month: pickContractMonth(c),
        // Tag the counterparty by SIAFI agency code so the empresas page can
        // group "who paid this company" by agency.
        counterparty: c.agencyCode ? `agency:${c.agencyCode}` : "agency:unknown",
      })),
    url,
  )

  return Object.assign(contracts, { _source: raw._source })
}
