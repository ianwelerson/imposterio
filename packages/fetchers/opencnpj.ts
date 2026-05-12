/**
 * @file opencnpj.ts
 * @description Fetchers for OpenCNPJ — open-source CNPJ lookup API rebuilt
 * monthly from the Brazilian Federal Revenue (Receita Federal) bulk file.
 *
 * Project page: https://opencnpj.org
 * Base URL:     https://api.opencnpj.org
 * Auth:         none required
 * Rate limit:   none documented at time of writing
 * Cadence:      monthly (sourced from the official Receita Federal bulk)
 *
 * OpenCNPJ replaces CNPJá, which previously throttled anonymous use to
 * 5 req/min. The 30-day Redis TTL (`CNPJ_DETAIL`) aligns with the upstream
 * monthly cadence — even a perfectly fresh fetch can be at most ~30 days
 * behind the official register, so longer caching is safe and dramatically
 * reduces upstream pressure.
 *
 * ## 404 handling — negative cache
 *
 * OpenCNPJ returns HTTP 404 for unknown CNPJs (typos, recently registered
 * companies that have not yet made it into the monthly bulk). To avoid
 * pounding the upstream API every time a user lands on a bad CNPJ URL we
 * cache the miss under a separate Redis key (`cnpj:404:{cnpj}`) with a
 * short TTL (`CNPJ_NOT_FOUND`, 1 hour). The short TTL gives a CNPJ that
 * was added to a later bulk a chance to surface without manual eviction,
 * while still throttling repeated misses for a typo'd URL.
 *
 * ## Reverse lookups (CPF → companies)
 *
 * The upstream API does NOT expose a reverse partner lookup. The empresas
 * module builds that index incrementally in PostgreSQL via
 * {@link ingestCompany} — see EMPRESAS-PLAN.md §6 and the `CompanyPartner`
 * model in `packages/db/schema.prisma`.
 *
 * ## Field mapping
 *
 * The API returns Portuguese field names which we normalize to English:
 * - `razao_social`              → `legalName`
 * - `nome_fantasia`             → `tradeName`
 * - `situacao_cadastral`        → `status`
 * - `data_situacao_cadastral`   → `statusDate`
 * - `cnae_principal`            → `mainCnae` (`{ code, description }`)
 * - `cnaes_secundarios`         → `secondaryCnaes`
 * - `porte`                     → `size`
 * - `natureza_juridica`         → `legalNature`
 * - `capital_social`            → `capital`
 * - `data_inicio_atividade`     → `openedAt`
 * - `endereco.{logradouro,…}`   → `address.{street,…}`
 * - `qsa[]`                     → `partners[]`
 *
 * QSA partner mapping:
 * - `nome_socio`               → `name`
 * - `cpf_cnpj_socio`           → `maskedCpf` (natural persons) OR
 *                                 `partnerCnpj` (juridical persons)
 * - `qualificacao_socio`       → `qualification`
 * - `data_entrada_sociedade`   → `joinedAt`
 *
 * The mapper distinguishes natural-person CPFs (always masked, e.g.
 * `***.456.789-**`) from juridical-person CNPJs (14 digits, sometimes
 * formatted) by digit count after stripping punctuation.
 */

import { upsertCompany, upsertCompanyPartners } from "@imposterio/db/queries/companies"
import type { Company, CompanyAddress, CompanyCnae, CompanyQsaPartner, WithSource } from "@imposterio/types"

import { ApiError, cachedFetch, redis } from "./lib/cache"
import { ENDPOINTS } from "./lib/endpoints"
import { TTL } from "./lib/ttl"

// ── Raw API response types (internal, not exported) ──────────────────
//
// Schema confirmed against the live `api.opencnpj.org/{cnpj}` endpoint
// (2026-05-11). CNAE values are bare 7-digit codes (no description);
// address fields are at the top level (no nested `endereco` block);
// the QSA list is capitalized as `QSA`; and the size field is
// `porte_empresa` (not `porte`). The earlier mapper assumed a richer
// nested shape and silently dropped these fields — see DECISIONS.md.

/** A single QSA (partner) entry as returned by OpenCNPJ. */
interface OpenCnpjQsaRaw {
  nome_socio?: string
  /**
   * Masked CPF (`***NNNNNN**`, 11 characters total, no punctuation) for
   * natural-person partners, or a 14-digit CNPJ for juridical persons.
   * The field name has the digits in CNPJ→CPF order per the upstream
   * schema — keep this typo-prone constant in sync with reality.
   */
  cnpj_cpf_socio?: string | null
  qualificacao_socio?: string
  data_entrada_sociedade?: string | null
  /** `"Pessoa Física"` or `"Pessoa Jurídica"`. */
  identificador_socio?: string
  faixa_etaria?: string | null
}

/** Full company-detail payload as returned by `GET /api.opencnpj.org/{cnpj}`. */
interface OpenCnpjCompanyRaw {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string | null
  situacao_cadastral?: string
  data_situacao_cadastral?: string | null
  matriz_filial?: string
  data_inicio_atividade?: string
  /** Bare 7-digit CNAE code — OpenCNPJ does not include a description. */
  cnae_principal?: string
  /** Array of bare 7-digit CNAE codes. */
  cnaes_secundarios?: string[]
  natureza_juridica?: string
  /** `"Microempresa (ME)" | "EPP" | "Demais" | "MEI"`. */
  porte_empresa?: string
  capital_social?: number | string
  /** Top-level address fields — there is no nested `endereco` block. */
  tipo_logradouro?: string
  logradouro?: string
  numero?: string
  complemento?: string | null
  bairro?: string
  cep?: string
  uf?: string
  municipio?: string
  /** Capitalized in the upstream payload — must match exactly. */
  QSA?: OpenCnpjQsaRaw[]
}

// ── Mapper functions (private) ───────────────────────────────────────

/**
 * Maps a bare 7-digit CNAE code to the public {@link CompanyCnae} shape.
 *
 * OpenCNPJ exposes only the numeric code — no description. We surface the
 * code as both `code` and `description` until a future CNAE-name lookup
 * lands; the empresas detail page formats the code as `XXXX-X/XX` so users
 * can copy it into the IBGE CNAE search.
 */
function mapCnae(code: string | undefined | null): CompanyCnae {
  const digits = (code ?? "").replace(/\D/g, "")
  return { code: digits, description: "" }
}

/**
 * Builds the public {@link CompanyAddress} shape from the top-level address
 * fields published by OpenCNPJ. There is no nested `endereco` block in the
 * upstream payload — every column lives on the company root.
 *
 * `complement` is preserved as null when upstream returns null/empty so the
 * UI can branch on its presence rather than on a magic empty string.
 */
function mapAddress(raw: OpenCnpjCompanyRaw): CompanyAddress {
  const complement = raw.complemento?.trim() || null
  // OpenCNPJ splits the street type (`AVENIDA`, `RUA`, etc.) from the
  // street name. Concatenate them so the rendered address reads naturally.
  const street = [raw.tipo_logradouro, raw.logradouro]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ")
  return {
    street,
    number: raw.numero ?? "",
    complement,
    district: raw.bairro ?? "",
    city: raw.municipio ?? "",
    uf: raw.uf ?? "",
    zip: (raw.cep ?? "").replace(/\D/g, ""),
  }
}

/**
 * Maps a raw QSA entry to the public {@link CompanyQsaPartner} shape.
 *
 * The single upstream field `cnpj_cpf_socio` is split by digit count:
 * natural-person CPFs arrive masked as `***NNNNNN**` (11 chars, no
 * punctuation) — 6 stable middle digits + 6 asterisks — and we keep them
 * verbatim; juridical-person CNPJs have 14 digits which we strip of
 * punctuation before exposing as `partnerCnpj`. When the value is missing
 * or unrecognizable, both fields end up null and downstream consumers can
 * still display the partner by name.
 */
function mapPartner(raw: OpenCnpjQsaRaw): CompanyQsaPartner {
  const identifier = raw.cnpj_cpf_socio?.trim() ?? ""
  const digits = identifier.replace(/\D/g, "")
  let maskedCpf: string | null = null
  let partnerCnpj: string | null = null
  if (identifier && digits.length === 14) {
    // Juridical-person partner — store the unformatted CNPJ.
    partnerCnpj = digits
  } else if (identifier) {
    // Anything else (masked CPF — 6 digits visible in `***NNNNNN**`,
    // partial mask, foreign identifier) is stored as-is on `maskedCpf`.
    // The graph helper extracts the 6-digit middle via {@link extractCpfMid}.
    maskedCpf = identifier
  }
  return {
    name: raw.nome_socio ?? "",
    maskedCpf,
    partnerCnpj,
    qualification: raw.qualificacao_socio ?? "",
    joinedAt: raw.data_entrada_sociedade ?? null,
  }
}

/**
 * Maps the raw OpenCNPJ payload to the public {@link Company} shape.
 *
 * `_source` is intentionally omitted here — it is added by `cachedFetch()`
 * in {@link getCompanyDetail} via the WithSource wrapper.
 *
 * @param raw  - Decoded JSON body returned by OpenCNPJ
 * @param cnpj - Requested CNPJ (digits only) — used as fallback when the
 *               upstream payload omits the field, which has been observed
 *               on rare 200 responses with partial data.
 */
function mapRawToCompany(raw: OpenCnpjCompanyRaw, cnpj: string): Omit<Company, "_source"> {
  // OpenCNPJ publishes `capital_social` as a Brazilian-formatted string
  // (e.g. "205431960490,52") — replace comma decimal before parsing.
  const capitalRaw = raw.capital_social
  const capital =
    typeof capitalRaw === "string"
      ? Number.parseFloat(capitalRaw.replace(/\./g, "").replace(",", ".")) || 0
      : capitalRaw ?? 0

  return {
    cnpj: (raw.cnpj ?? cnpj).replace(/\D/g, ""),
    legalName: raw.razao_social ?? "",
    tradeName: raw.nome_fantasia?.trim() || null,
    status: raw.situacao_cadastral ?? "",
    statusDate: raw.data_situacao_cadastral ?? null,
    mainCnae: mapCnae(raw.cnae_principal),
    secondaryCnaes: (raw.cnaes_secundarios ?? []).map(mapCnae),
    size: raw.porte_empresa ?? "",
    legalNature: raw.natureza_juridica ?? "",
    capital,
    openedAt: raw.data_inicio_atividade ?? "",
    address: mapAddress(raw),
    partners: (raw.QSA ?? []).map(mapPartner),
  }
}

// ── Internal helpers ─────────────────────────────────────────────────

/**
 * Validates and normalizes a CNPJ to 14 digits, no punctuation.
 *
 * Throws an `ApiError(400)` for malformed input rather than letting a
 * 404-mass go to OpenCNPJ — this short-circuits typos, keeps the negative
 * cache focused on real misses, and produces a clearer error message in
 * the UI's "fonte oficial" toast.
 */
function normalizeCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "")
  if (digits.length !== 14) {
    throw new ApiError(400, ENDPOINTS.OPENCNPJ_DETAIL(cnpj))
  }
  return digits
}

/**
 * Redis key used to remember a 404 response for a given CNPJ.
 *
 * Stored under a dedicated namespace (`cnpj:404:`) so it never collides
 * with successful detail entries cached at the URL key.
 */
function negativeCacheKey(cnpj: string): string {
  return `cnpj:404:${cnpj}`
}

// ── Public fetchers ──────────────────────────────────────────────────

/**
 * Returns full company detail by CNPJ, or `null` for unknown CNPJs.
 *
 * Pipeline:
 *
 * 1. Validate the CNPJ (14 digits, no punctuation after stripping).
 * 2. Check the negative cache (`cnpj:404:{cnpj}`). On hit, return null
 *    immediately — no upstream call, no positive cache lookup.
 * 3. Delegate the live request to {@link cachedFetch}, which handles the
 *    positive Redis layer and `_source` injection automatically.
 * 4. On 404 from upstream (surfaced as `ApiError`), write the negative
 *    cache marker and return null.
 *
 * @param cnpj - CNPJ in any format (`12.345.678/0001-99` or `12345678000199`)
 * @returns The mapped company detail with `_source`, or null on 404
 *
 * @throws {ApiError} For non-404 upstream errors (5xx, network) so callers
 *         can distinguish "company not found" from "API down".
 *
 * @example
 * ```typescript
 * const company = await getCompanyDetail("12.345.678/0001-99")
 * if (company) console.log(company.legalName, company._source)
 * else         console.log("CNPJ not found in the official register")
 * ```
 */
export async function getCompanyDetail(
  cnpj: string,
): Promise<WithSource<Company> | null> {
  const normalized = normalizeCnpj(cnpj)
  const url = ENDPOINTS.OPENCNPJ_DETAIL(normalized)

  // Negative cache short-circuit — avoids hitting upstream and the positive
  // Redis layer when we recently confirmed the CNPJ does not exist.
  if (redis) {
    try {
      const miss = await redis.get(negativeCacheKey(normalized))
      if (miss !== null && miss !== undefined) return null
    } catch {
      // Redis read failure is non-fatal — fall through to live fetch.
    }
  }

  try {
    const raw = await cachedFetch<OpenCnpjCompanyRaw>(url, TTL.CNPJ_DETAIL)
    const mapped = mapRawToCompany(raw, normalized)
    return { ...mapped, _source: raw._source }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Persist the miss so subsequent visits to the same bad CNPJ skip
      // upstream until the short TTL expires.
      if (redis) {
        try {
          await redis.set(negativeCacheKey(normalized), "1", {
            ex: TTL.CNPJ_NOT_FOUND,
          })
        } catch {
          // Cache write failure is non-fatal.
        }
      }
      return null
    }
    throw error
  }
}

/**
 * Fetches OpenCNPJ data AND persists it to the local partner-graph index.
 *
 * Side effects (in order, single Postgres round-trip pair):
 *
 * 1. `Company` row is upserted with the cadastral columns from OpenCNPJ.
 *    `firstSeenAt` is preserved on update; `lastFetchedAt` is bumped.
 * 2. `CompanyPartner` rows are replaced wholesale via
 *    {@link upsertCompanyPartners} so the QSA reflects the latest snapshot
 *    (departures vanish, joins appear).
 *
 * On 404 the function short-circuits and returns null WITHOUT touching the
 * database — we never want to insert a placeholder row from a non-existent
 * CNPJ. Use this from any code path that has just discovered a new CNPJ
 * (CEAP expense, contract, donation) so the partner graph fills in over
 * time without a separate worker.
 *
 * @param cnpj - CNPJ in any format
 * @returns Same shape as {@link getCompanyDetail}; null on 404
 *
 * @throws {ApiError} For non-404 upstream errors. Database errors propagate
 *         as well — callers are expected to wrap fire-and-forget invocations
 *         in `try/catch` per CLAUDE.md "do not block rendering on DB hiccups".
 */
export async function ingestCompany(
  cnpj: string,
): Promise<WithSource<Company> | null> {
  const detail = await getCompanyDetail(cnpj)
  if (!detail) return null

  await upsertCompany({
    cnpj: detail.cnpj,
    legalName: detail.legalName || null,
    tradeName: detail.tradeName,
    status: detail.status || null,
    mainCnae: detail.mainCnae.code || null,
    uf: detail.address.uf || null,
  })
  await upsertCompanyPartners(
    detail.cnpj,
    detail.partners.map((p) => ({
      partnerName: p.name,
      maskedCpf: p.maskedCpf,
      partnerCnpj: p.partnerCnpj,
      qualification: p.qualification,
      joinedAt: p.joinedAt ? new Date(p.joinedAt) : null,
    })),
  )

  return detail
}
