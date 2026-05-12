/**
 * @file companies.ts
 * @description Typed query functions for the empresas module's partner
 * graph and aggregation index.
 *
 * Authoritative company data lives in Redis (cached from OpenCNPJ); the
 * tables backing this file (`companies`, `company_partners`,
 * `company_transactions`) are a derived index that powers:
 *
 * 1. Cross-company partner lookups (CPF is masked at the source, so the
 *    cross-reference is always heuristic — see {@link findRelatedPartners}).
 * 2. Incremental aggregation of observed financial events per CNPJ
 *    (CEAP, contracts, donations, sanctions). Aggregations are computed
 *    by SQL `SUM` on read, never materialized.
 *
 * See EMPRESAS-PLAN.md §2.2 (DB-storage exception) and §3 (data model).
 */

import type { Prisma } from "@prisma/client"

import type {
  CompanyPartner,
  CompanyTransaction,
  CompanyTransactionAggregate,
  CompanyTransactionType,
} from "@imposterio/types"

import { prisma } from "../index"

// ── Input shapes ─────────────────────────────────────────────────────

/**
 * Input for {@link upsertCompany}. Only `cnpj` is required — every other
 * field is optional because the row may be created from a transaction
 * sighting (CEAP expense, contract) before OpenCNPJ has been fetched.
 */
export interface CompanyUpsertInput {
  /** 14-digit CNPJ with no punctuation. */
  cnpj: string
  legalName?: string | null
  tradeName?: string | null
  status?: string | null
  /** 7-digit CNAE code, no punctuation. */
  mainCnae?: string | null
  /** Two-letter UF code. */
  uf?: string | null
}

/**
 * Input for {@link upsertCompanyPartners} — one entry per partner row.
 * `partnerNameKey` and `cpfMid` are derived automatically from
 * `partnerName` and `maskedCpf` via {@link normalizePartnerName} and
 * {@link extractCpfMid}.
 */
export interface CompanyPartnerInput {
  partnerName: string
  /** Masked CPF (e.g. "***.456.789-**") or null for juridical-person partners. */
  maskedCpf?: string | null
  /** Partner CNPJ when the partner is itself a company. */
  partnerCnpj?: string | null
  qualification?: string | null
  /** Date partner joined the company, when reported by the source. */
  joinedAt?: Date | null
}

/**
 * Input for {@link recordCompanyTransaction}. `(cnpj, type, sourceKey)` is
 * the idempotency anchor — re-recording the same source row never
 * double-counts.
 */
export interface CompanyTransactionInput {
  cnpj: string
  type: CompanyTransactionType
  /** Stable natural key from the source API (e.g. CEAP `idDocumento`). */
  sourceKey: string
  /** Source API URL — populates `_source` on aggregated rows. */
  sourceUrl: string
  /** Absolute BRL value (positive numbers only). */
  value: number
  year: number
  month?: number | null
  /** Free-form counterparty (e.g. "deputy:204554"). */
  counterparty?: string | null
}

// ── Normalization helpers (exported for tests + downstream callers) ──

/**
 * Normalizes a partner name for cross-reference joins.
 *
 * Lowercases, removes accents/diacritics and collapses runs of whitespace
 * so that "JOSÉ DA  Silva" and "jose da silva" produce the same key.
 *
 * @param name - Raw partner display name from OpenCNPJ
 * @returns Normalized join key (never displayed to users)
 *
 * @example
 * normalizePartnerName("João da Silva")
 * // → "joao da silva"
 */
export function normalizePartnerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Extracts the 6 stable middle digits from a masked CPF.
 *
 * OpenCNPJ masks CPFs as `***.456.789-**`; the middle 6 digits are the only
 * stable identifier we have for cross-reference. Returns null when the
 * input is not a recognizable masked CPF (e.g. juridical-person partners).
 *
 * @param maskedCpf - Masked CPF such as "***.456.789-**", or null
 * @returns 6-digit string (e.g. "456789") or null
 *
 * @example
 * extractCpfMid("***.456.789-**") // → "456789"
 * extractCpfMid(null)             // → null
 */
export function extractCpfMid(maskedCpf: string | null | undefined): string | null {
  if (!maskedCpf) return null
  const digits = maskedCpf.replace(/\D/g, "")
  if (digits.length !== 6) return null
  return digits
}

/**
 * Computes a 0..1 similarity score between two normalized name keys via
 * Levenshtein distance.
 *
 * Used by {@link findRelatedPartners} to gate the "alta"/"media"
 * confidence labels. Returns 1.0 for identical strings.
 *
 * @param a - Normalized name key
 * @param b - Normalized name key
 * @returns Similarity ratio in [0, 1]
 */
export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const distance = levenshtein(a, b)
  const longest = Math.max(a.length, b.length)
  return 1 - distance / longest
}

/**
 * Iterative two-row Levenshtein implementation. O(n·m) time, O(min(n,m))
 * space. Local helper — exported via {@link nameSimilarity}.
 */
function levenshtein(a: string, b: string): number {
  // Always iterate over the shorter string in the inner loop to keep memory
  // proportional to min(|a|, |b|) regardless of argument order.
  if (a.length < b.length) [a, b] = [b, a]
  const previous = new Array<number>(b.length + 1)
  const current = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) previous[j] = j
  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j]
  }
  return previous[b.length]
}

// ── Query functions ──────────────────────────────────────────────────

/**
 * Upserts a `Company` row.
 *
 * On insert, `firstSeenAt` and `lastFetchedAt` default to now.
 * On update, `lastFetchedAt` is bumped to now and the provided columns
 * are overwritten. `firstSeenAt` is NEVER touched on update — it records
 * the first time the platform observed this CNPJ, regardless of source.
 *
 * Partial inputs are supported: the row may be created from a CEAP
 * sighting (cnpj only) before OpenCNPJ has been fetched. Subsequent
 * `ingestCompany()` calls fill in the cadastral columns.
 *
 * @param input - Company columns to upsert (cnpj is required)
 * @returns The persisted row
 */
export async function upsertCompany(input: CompanyUpsertInput) {
  const { cnpj, ...columns } = input
  const update: Prisma.CompanyUpdateInput = { lastFetchedAt: new Date() }
  if (columns.legalName !== undefined) update.legalName = columns.legalName
  if (columns.tradeName !== undefined) update.tradeName = columns.tradeName
  if (columns.status !== undefined) update.status = columns.status
  if (columns.mainCnae !== undefined) update.mainCnae = columns.mainCnae
  if (columns.uf !== undefined) update.uf = columns.uf

  return prisma.company.upsert({
    where: { cnpj },
    create: {
      cnpj,
      legalName: columns.legalName ?? null,
      tradeName: columns.tradeName ?? null,
      status: columns.status ?? null,
      mainCnae: columns.mainCnae ?? null,
      uf: columns.uf ?? null,
    },
    update,
  })
}

/**
 * Replaces the partner set for a CNPJ.
 *
 * OpenCNPJ returns the full QSA on every request, so the cleanest semantics
 * are "the latest fetch is the truth". We delete + re-insert in one
 * transaction, which:
 *
 * - guarantees idempotency without relying on `(cnpj, partnerName,
 *   maskedCpf)` uniqueness for null maskedCpf cases (juridical-person
 *   partners), even though the unique index is `NULLS NOT DISTINCT`;
 * - preserves the `Company` parent row;
 * - drops partners that vanished from the source (departures, corrections).
 *
 * The parent `Company` row must already exist — the FK CASCADE means the
 * delete is safe but the insert would fail otherwise. Call
 * {@link upsertCompany} first.
 *
 * @param cnpj - 14-digit CNPJ (must already have a Company row)
 * @param partners - Latest QSA from OpenCNPJ
 * @returns Number of partner rows inserted
 */
export async function upsertCompanyPartners(
  cnpj: string,
  partners: CompanyPartnerInput[],
): Promise<number> {
  const data = partners.map((p) => ({
    cnpj,
    partnerName: p.partnerName,
    partnerNameKey: normalizePartnerName(p.partnerName),
    maskedCpf: p.maskedCpf ?? null,
    cpfMid: extractCpfMid(p.maskedCpf),
    partnerCnpj: p.partnerCnpj ?? null,
    qualification: p.qualification ?? null,
    joinedAt: p.joinedAt ?? null,
  }))

  await prisma.$transaction([
    prisma.companyPartner.deleteMany({ where: { cnpj } }),
    prisma.companyPartner.createMany({ data, skipDuplicates: true }),
  ])
  return data.length
}

/**
 * Records a single observed financial event for a CNPJ.
 *
 * Idempotent on `(cnpj, type, sourceKey)`: re-recording the same source row
 * is a no-op for aggregation. The `Company` parent row is upserted as a
 * side effect so the FK constraint is always satisfied — callers therefore
 * do not need to pre-create the company.
 *
 * Phase E3 will additionally fire `ingestCompany(cnpj)` from this function
 * (fire-and-forget) when `legalName` is null, so that visiting a CEAP page
 * starts populating real cadastral data. That hook is intentionally absent
 * here to keep the queries package free of fetcher-layer dependencies.
 *
 * @param input - Transaction columns (see {@link CompanyTransactionInput})
 * @returns The persisted row
 */
export async function recordCompanyTransaction(
  input: CompanyTransactionInput,
) {
  await upsertCompany({ cnpj: input.cnpj })
  return prisma.companyTransaction.upsert({
    where: {
      cnpj_type_sourceKey: {
        cnpj: input.cnpj,
        type: input.type,
        sourceKey: input.sourceKey,
      },
    },
    create: {
      cnpj: input.cnpj,
      type: input.type,
      sourceKey: input.sourceKey,
      sourceUrl: input.sourceUrl,
      value: input.value,
      year: input.year,
      month: input.month ?? null,
      counterparty: input.counterparty ?? null,
    },
    update: {
      // Source URL / value / counterparty may have been corrected upstream;
      // refresh them on every sighting. observedAt is intentionally not
      // bumped — the aggregation surface uses MAX(observedAt) and bumping
      // it on every read-style write would make "atualizado em" lie.
      sourceUrl: input.sourceUrl,
      value: input.value,
      counterparty: input.counterparty ?? null,
      month: input.month ?? null,
    },
  })
}

/**
 * Returns one row per `(type, year)` pair for a CNPJ, with the running
 * `SUM(value)`, row count and most recent `observedAt`.
 *
 * Intended for the empresas detail page — each row drives a StatCard with
 * the parcial-value disclaimer and the "atualizado em" timestamp.
 *
 * @param cnpj - 14-digit CNPJ
 * @returns Aggregations sorted by (type, year DESC)
 */
export async function getCompanyAggregates(
  cnpj: string,
): Promise<CompanyTransactionAggregate[]> {
  const rows = await prisma.companyTransaction.groupBy({
    by: ["type", "year"],
    where: { cnpj },
    _sum: { value: true },
    _count: { _all: true },
    _max: { observedAt: true },
    orderBy: [{ type: "asc" }, { year: "desc" }],
  })
  return rows.map((r) => ({
    type: r.type as CompanyTransactionType,
    year: r.year,
    total: Number(r._sum.value ?? 0),
    count: r._count._all,
    // _max.observedAt is non-null whenever the group exists (every row has
    // a default observedAt), so the non-null assertion is safe.
    lastObservedAt: r._max.observedAt!,
  }))
}

/**
 * Confidence label for a heuristic partner cross-reference.
 *
 * - **alta**: same `cpfMid` AND name similarity ≥ 0.9 (very likely the
 *   same person).
 * - **media**: same `cpfMid` but name similarity below 0.9 (e.g. one row
 *   includes a married name, the other does not).
 * - **baixa**: name match alone, no `cpfMid` evidence (high false-positive
 *   risk; UI must hide these by default behind a toggle).
 *
 * The label is ALWAYS "provável" in the UI — never assert equivalence.
 */
export type PartnerConfidence = "alta" | "media" | "baixa"

/** A single cross-reference hit returned by {@link findRelatedPartners}. */
export interface RelatedCompany {
  cnpj: string
  legalName: string | null
  confidence: PartnerConfidence
}

/** A partner of the queried CNPJ together with their cross-references. */
export interface RelatedPartnerRow {
  partnerName: string
  maskedCpf: string | null
  cpfMid: string | null
  otherCompanies: RelatedCompany[]
}

/**
 * For each partner of `cnpj`, lists OTHER companies whose partner rows look
 * like the same person under the §6 heuristic.
 *
 * Algorithm:
 *
 * 1. Fetch all `CompanyPartner` rows for the queried CNPJ.
 * 2. For each partner, fetch candidate matches from other companies via an
 *    indexed lookup on `cpfMid` (when present) OR `partnerNameKey`.
 * 3. Compute a confidence label for every candidate; keep only the highest
 *    confidence per other-company.
 *
 * The query never returns the queried CNPJ in `otherCompanies` (a partner
 * appears in their own company's QSA — that is not a cross-reference).
 *
 * @param cnpj - 14-digit CNPJ
 * @returns One entry per partner, each with their cross-reference matches
 */
export async function findRelatedPartners(
  cnpj: string,
): Promise<RelatedPartnerRow[]> {
  const ownPartners = await prisma.companyPartner.findMany({
    where: { cnpj },
    orderBy: { partnerName: "asc" },
  })
  if (ownPartners.length === 0) return []

  // Pre-collect the OR clauses once and run a single query for all
  // candidates; deduping happens in memory. This avoids N round trips to
  // Postgres when a company has many partners.
  const orClauses: Prisma.CompanyPartnerWhereInput[] = []
  for (const p of ownPartners) {
    if (p.cpfMid) orClauses.push({ cpfMid: p.cpfMid })
    orClauses.push({ partnerNameKey: p.partnerNameKey })
  }
  const candidates = await prisma.companyPartner.findMany({
    where: {
      AND: [{ NOT: { cnpj } }, { OR: orClauses }],
    },
    include: { company: { select: { cnpj: true, legalName: true } } },
  })

  const result: RelatedPartnerRow[] = []
  for (const p of ownPartners) {
    const matches = new Map<string, RelatedCompany>()
    for (const c of candidates) {
      const sameCpf = !!p.cpfMid && p.cpfMid === c.cpfMid
      const similarity = nameSimilarity(p.partnerNameKey, c.partnerNameKey)
      const nameMatch = similarity >= 0.9
      let confidence: PartnerConfidence | null = null
      if (sameCpf && nameMatch) confidence = "alta"
      else if (sameCpf) confidence = "media"
      else if (nameMatch) confidence = "baixa"
      if (!confidence) continue
      const previous = matches.get(c.cnpj)
      if (!previous || rank(confidence) > rank(previous.confidence)) {
        matches.set(c.cnpj, {
          cnpj: c.cnpj,
          legalName: c.company.legalName,
          confidence,
        })
      }
    }
    result.push({
      partnerName: p.partnerName,
      maskedCpf: p.maskedCpf,
      cpfMid: p.cpfMid,
      otherCompanies: [...matches.values()].sort((a, b) =>
        rank(b.confidence) - rank(a.confidence),
      ),
    })
  }
  return result
}

/** Numeric ordering for {@link PartnerConfidence}: higher is more confident. */
function rank(c: PartnerConfidence): number {
  if (c === "alta") return 3
  if (c === "media") return 2
  return 1
}

// ── Overview-page helpers ────────────────────────────────────────────

/**
 * Aggregate metrics for the empresas overview page.
 *
 * Every counter grows incrementally as the platform observes new CNPJs
 * (via {@link recordCompanyTransaction}) or fetches OpenCNPJ details.
 * The UI must surface the parcial-value disclaimer alongside these totals
 * — see EMPRESAS-PLAN.md §5.
 */
export interface CompanyOverviewStats {
  /** `count(companies)` — every CNPJ the platform has ever observed. */
  companiesIndexed: number
  /** `SUM(value)` across `company_transactions` (all types, all years). */
  totalObservedValue: number
  /** `count(company_transactions)` — number of observed events. */
  transactionsObserved: number
}

/**
 * Returns top-line counters for the empresas overview page.
 *
 * Single round-trip composed of three independent aggregate queries — the
 * Postgres planner runs these as separate statements but Prisma batches them
 * over one connection.
 *
 * @returns Companies indexed, total observed value, transaction count
 */
export async function getCompanyOverviewStats(
  year?: number,
): Promise<CompanyOverviewStats> {
  // `companiesIndexed` is always lifetime — a CNPJ stays in the index even
  // when its observed events fall outside the selected year. Only the
  // transaction sums respect the filter.
  const [companiesIndexed, transactionsAggregate] = await Promise.all([
    prisma.company.count(),
    prisma.companyTransaction.aggregate({
      where: year ? { year } : undefined,
      _sum: { value: true },
      _count: { _all: true },
    }),
  ])
  return {
    companiesIndexed,
    totalObservedValue: Number(transactionsAggregate._sum.value ?? 0),
    transactionsObserved: transactionsAggregate._count._all,
  }
}

/** A row in the "maiores fornecedores" table on the empresas overview. */
export interface TopCompanyRow {
  cnpj: string
  legalName: string | null
  tradeName: string | null
  uf: string | null
  /** `SUM(value)` of every observed transaction for this CNPJ. */
  total: number
  /** Number of observed transactions backing the total. */
  count: number
  /** Most recent `observedAt` across the rows in the sum. */
  lastObservedAt: Date
}

/**
 * Lists the top CNPJs by total observed value (`SUM(value)`).
 *
 * The result powers the "Maiores fornecedores observados" table on the
 * empresas overview. Cadastral columns (`legalName`, `tradeName`, `uf`)
 * come from the lightweight `Company` index — they may be `null` for CNPJs
 * the platform has only seen via transaction sightings (i.e. before
 * {@link ingestCompany} has populated the OpenCNPJ payload).
 *
 * @param limit - Maximum number of rows to return (defaults to 10)
 * @param type  - Optional transaction-type filter (e.g. only contracts).
 *                When omitted, every observed type contributes to the sum.
 * @returns Top companies sorted by `total DESC`
 */
export async function getTopCompaniesByObservedValue(
  limit = 10,
  type?: CompanyTransactionType,
  year?: number,
): Promise<TopCompanyRow[]> {
  const where: Prisma.CompanyTransactionWhereInput = {}
  if (type) where.type = type
  if (year) where.year = year
  const grouped = await prisma.companyTransaction.groupBy({
    by: ["cnpj"],
    where: Object.keys(where).length > 0 ? where : undefined,
    _sum: { value: true },
    _count: { _all: true },
    _max: { observedAt: true },
    orderBy: { _sum: { value: "desc" } },
    take: limit,
  })
  if (grouped.length === 0) return []

  // Single follow-up query for cadastral columns — keyed by `cnpj IN (...)`
  // so the lookup is O(1) per row regardless of `limit`.
  const cnpjs = grouped.map((g) => g.cnpj)
  const companies = await prisma.company.findMany({
    where: { cnpj: { in: cnpjs } },
    select: { cnpj: true, legalName: true, tradeName: true, uf: true },
  })
  const byCnpj = new Map(companies.map((c) => [c.cnpj, c]))

  return grouped.map((g) => {
    const company = byCnpj.get(g.cnpj)
    return {
      cnpj: g.cnpj,
      legalName: company?.legalName ?? null,
      tradeName: company?.tradeName ?? null,
      uf: company?.uf ?? null,
      total: Number(g._sum.value ?? 0),
      count: g._count._all,
      // _max.observedAt is non-null whenever the group exists — every row
      // has a default observedAt.
      lastObservedAt: g._max.observedAt!,
    }
  })
}

/**
 * Returns the distinct years present in `company_transactions`, ordered
 * most-recent-first. Drives the year selector on the empresas overview —
 * we only show years that actually have observed data.
 *
 * Always includes the current calendar year (even when no transactions
 * exist yet for it) so the selector still has a sensible default option.
 *
 * @returns Years sorted DESC (e.g. `[2026, 2025, 2024]`)
 */
export async function getCompanyTransactionYears(): Promise<number[]> {
  const rows = await prisma.companyTransaction.findMany({
    distinct: ["year"],
    select: { year: true },
    orderBy: { year: "desc" },
  })
  const years = new Set<number>(rows.map((r) => r.year))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}

/**
 * Lists every individual `CompanyTransaction` row backing a
 * `(cnpj, type, year)` aggregate.
 *
 * Used by the event-detail page (`/empresas/{cnpj}/eventos/{type}/{year}`)
 * to break a single StatCard total into its constituent payments — each row
 * carries `value`, `month`, `counterparty`, `sourceUrl` and the original
 * `sourceKey` so the user can follow it back to the upstream record.
 *
 * @param cnpj - 14-digit CNPJ
 * @param type - Transaction type (e.g. "ceap", "contract")
 * @param year - Calendar year
 * @returns Rows ordered by value DESC
 */
export async function getCompanyTransactionsForEvent(
  cnpj: string,
  type: CompanyTransactionType,
  year: number,
): Promise<CompanyTransaction[]> {
  const rows = await prisma.companyTransaction.findMany({
    where: { cnpj, type, year },
    orderBy: [{ value: "desc" }, { month: "asc" }],
  })
  return rows.map((r) => ({
    id: r.id,
    cnpj: r.cnpj,
    type: r.type as CompanyTransactionType,
    sourceKey: r.sourceKey,
    sourceUrl: r.sourceUrl,
    value: Number(r.value),
    year: r.year,
    month: r.month,
    counterparty: r.counterparty,
    observedAt: r.observedAt,
  }))
}

// ── Partner-detail helpers ───────────────────────────────────────────

/** A single company a given partner appears in. */
export interface PartnerCompanyHit {
  cnpj: string
  legalName: string | null
  tradeName: string | null
  uf: string | null
  qualification: string | null
  joinedAt: Date | null
}

/** A consolidated partner profile for the detail page. */
export interface PartnerProfile {
  /** Display name from the most recent QSA row matched. */
  displayName: string
  /** Masked CPF when at least one matched row carried it. */
  maskedCpf: string | null
  /** 6 stable middle digits — the strongest cross-reference signal. */
  cpfMid: string | null
  /** Companies this partner appears in. Sorted by `joinedAt` DESC nulls last. */
  companies: PartnerCompanyHit[]
}

/**
 * Resolves a partner profile from a URL slug.
 *
 * Slug format produced by `partnerSlug()`: `cpf-{cpfMid}` for partners
 * with a masked CPF, otherwise `name-{normalizedNameKey}` (URL-encoded).
 * The partner's identity is heuristic — multiple QSA rows may share the
 * same `cpfMid` or `partnerNameKey`; we surface every match.
 *
 * @param slug - The partner slug from the URL (e.g. `cpf-456789`)
 * @returns The partner profile, or null when no match exists
 */
export async function getPartnerProfileBySlug(
  slug: string,
): Promise<PartnerProfile | null> {
  const where = parsePartnerSlug(slug)
  if (!where) return null

  const rows = await prisma.companyPartner.findMany({
    where,
    include: {
      company: {
        select: {
          cnpj: true,
          legalName: true,
          tradeName: true,
          uf: true,
        },
      },
    },
    orderBy: [{ observedAt: "desc" }],
  })
  if (rows.length === 0) return null

  // Pick the most recent observation as the canonical display name; the
  // raw QSA capitalization differs across CNPJs (some upstream rows are
  // ALL CAPS, others Title Case).
  const canonical = rows[0]
  const companies: PartnerCompanyHit[] = rows.map((r) => ({
    cnpj: r.cnpj,
    legalName: r.company.legalName,
    tradeName: r.company.tradeName,
    uf: r.company.uf,
    qualification: r.qualification,
    joinedAt: r.joinedAt,
  }))
  // Dedupe by CNPJ — a partner can appear twice in the same company's QSA
  // history (rare but observed), keep the most recent observation.
  const byCnpj = new Map<string, PartnerCompanyHit>()
  for (const c of companies) if (!byCnpj.has(c.cnpj)) byCnpj.set(c.cnpj, c)

  return {
    displayName: canonical.partnerName,
    maskedCpf: rows.find((r) => r.maskedCpf)?.maskedCpf ?? null,
    cpfMid: rows.find((r) => r.cpfMid)?.cpfMid ?? null,
    companies: [...byCnpj.values()].sort((a, b) => {
      if (!a.joinedAt && !b.joinedAt) return 0
      if (!a.joinedAt) return 1
      if (!b.joinedAt) return -1
      return b.joinedAt.getTime() - a.joinedAt.getTime()
    }),
  }
}

/**
 * Builds a stable URL slug for a partner.
 *
 * Prefers `cpfMid` (6 digits — strong identifier) when available; falls
 * back to `partnerNameKey` (normalized name — weak but at least stable).
 *
 * @returns A slug suitable for `/empresas/socios/{slug}`
 */
export function partnerSlug(input: {
  cpfMid?: string | null
  partnerNameKey: string
}): string {
  if (input.cpfMid) return `cpf-${input.cpfMid}`
  return `name-${encodeURIComponent(input.partnerNameKey)}`
}

/**
 * Inverse of {@link partnerSlug} — returns a `where` clause that resolves
 * the slug back to one or more `CompanyPartner` rows.
 */
function parsePartnerSlug(
  slug: string,
): Prisma.CompanyPartnerWhereInput | null {
  if (slug.startsWith("cpf-")) {
    const digits = slug.slice(4).replace(/\D/g, "")
    if (digits.length !== 6) return null
    return { cpfMid: digits }
  }
  if (slug.startsWith("name-")) {
    const key = decodeURIComponent(slug.slice(5))
    if (!key) return null
    return { partnerNameKey: key }
  }
  return null
}

// ── Re-exports for downstream consumers ──────────────────────────────

export type {
  CompanyPartner,
  CompanyTransaction,
  CompanyTransactionAggregate,
  CompanyTransactionType,
}
