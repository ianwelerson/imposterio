/**
 * @file camara.ts
 * @description Fetchers for the Câmara dos Deputados Open Data API.
 *
 * The Câmara dos Deputados is the lower house of Brazil's National Congress,
 * with 513 seats elected proportionally by state. It shares legislative power
 * with the Federal Senate (Senado Federal).
 *
 * Official docs: https://dadosabertos.camara.leg.br/swagger/api.html
 * Base URL:      https://dadosabertos.camara.leg.br/api/v2
 * Auth:          none required
 * Rate limit:    not officially documented — use cache generously
 *
 * All fetchers in this file inject the `_source` field automatically via
 * `cachedFetch()`, enabling the frontend to display a link to the exact
 * API call that generated each data point.
 *
 * ## Câmara API response structure
 *
 * All endpoints wrap their payload in a `{ dados: T, links: [...] }` envelope.
 * - List endpoints return `dados` as an array of objects.
 * - Detail endpoints return `dados` as a single object.
 * - The `links` array contains HATEOAS-style navigation links (ignored by us).
 *
 * ## Field mapping
 *
 * The API returns Portuguese field names which we normalize to English:
 * - `id` (number) → `id` (string) — converted for consistency across sources
 * - `nome` → `name` (display name, not civil name)
 * - `siglaPartido` → `party`
 * - `siglaUf` → `uf`
 * - `urlFoto` → `photoUrl`
 * - `idLegislatura` → `legislature`
 * - Detail: `nomeCivil` → `fullName`, `dataNascimento` → `birthDate`, etc.
 */

import { cachedFetch } from "./lib/cache"
import { ENDPOINTS } from "./lib/endpoints"
import { TTL } from "./lib/ttl"
import type { Deputy, DeputyDetail, DeputyExpense } from "@imposterio/types"
import type { WithSource } from "@imposterio/types"

// ── Raw API response types (internal, not exported) ───────────────────

/** Shape of a single deputy in the Câmara list endpoint response. */
interface CamaraDeputyRaw {
  id: number
  uri: string
  nome: string
  siglaPartido: string
  siglaUf: string
  idLegislatura: number
  urlFoto: string
  email: string
}

/** Shape of the Câmara detail endpoint response for a single deputy. */
interface CamaraDeputyDetailRaw {
  id: number
  uri: string
  nomeCivil: string
  cpf: string
  sexo: string
  dataNascimento: string
  dataFalecimento: string | null
  ufNascimento: string
  municipioNascimento: string
  escolaridade: string
  ultimoStatus: {
    id: number
    uri: string
    nome: string
    siglaPartido: string
    siglaUf: string
    idLegislatura: number
    urlFoto: string
    email: string
    data: string
    nomeEleitoral: string
    gabinete: {
      nome: string
      predio: string
      sala: string
      andar: string
      telefone: string
      email: string
    }
    situacao: string
    condicaoEleitoral: string
  }
}

/** Shape of a single CEAP expense record from the Câmara expenses endpoint. */
interface CamaraExpenseRaw {
  ano: number
  mes: number
  tipoDespesa: string
  codDocumento: string
  tipoDocumento: string
  codTipoDocumento: number
  dataDocumento: string
  numDocumento: string
  valorDocumento: number
  urlDocumento: string
  nomeFornecedor: string
  cnpjCpfFornecedor: string
  valorLiquido: number
  valorGlosa: number
  numRessarcimento: string
  codLote: number
  parcela: number
}

/** Standard Câmara API envelope for list endpoints. */
interface CamaraListResponse<T> {
  dados: T[]
  links: Array<{ rel: string; href: string }>
}

/** Standard Câmara API envelope for detail endpoints. */
interface CamaraDetailResponse<T> {
  dados: T
  links: Array<{ rel: string; href: string }>
}

// ── Public fetchers ───────────────────────────────────────────────────

/**
 * Fetches the list of all deputies currently serving in the Câmara.
 *
 * The Câmara has 513 deputies, all returned in a single response (no
 * pagination needed for the current legislature). Each deputy includes
 * their display name, party abbreviation, state (UF), photo URL, and
 * legislature number.
 *
 * @returns Array of deputies with `_source` injected for traceability.
 *          The `_source` points to the exact list endpoint URL.
 *
 * @example
 * ```typescript
 * const deputies = await getDeputiesList()
 * console.log(deputies.length)    // 513
 * console.log(deputies[0].party)  // "PT"
 * console.log(deputies._source)   // "https://dadosabertos.camara.leg.br/api/v2/deputados"
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados
 */
export async function getDeputiesList(): Promise<WithSource<Deputy[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTIES

  const response = await cachedFetch<CamaraListResponse<CamaraDeputyRaw>>(
    url,
    TTL.CAMARA_DEPUTIES_LIST,
  )

  const deputies: Deputy[] = response.dados.map(mapRawToDeputy)

  return Object.assign(deputies, { _source: response._source })
}

/**
 * Fetches the detailed profile of a single deputy by their Câmara API ID.
 *
 * The detail endpoint returns the deputy's civil name, birth date and place,
 * education level, and current office (gabinete) information, in addition to
 * the fields available in the list endpoint.
 *
 * The `ultimoStatus` nested object contains the deputy's current state —
 * party, UF, photo, office details, and electoral situation. We flatten
 * this into the `DeputyDetail` type for easier consumption.
 *
 * @param id - The deputy's numeric ID in the Câmara API (e.g. "204554").
 *             This ID is stable across legislatures for the same person.
 *
 * @returns Detailed deputy profile with `_source` injected.
 *
 * @throws {Error} When the API returns a non-2xx status (e.g. 404 for
 *         an invalid or non-existent deputy ID).
 *
 * @example
 * ```typescript
 * const deputy = await getDeputyDetail("204554")
 * console.log(deputy.fullName)  // "LUIZ INÁCIO LULA DA SILVA"
 * console.log(deputy.office)    // "Anexo IV - Gab. 1234"
 * console.log(deputy._source)   // "https://dadosabertos.camara.leg.br/api/v2/deputados/204554"
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id_
 */
export async function getDeputyDetail(
  id: string,
): Promise<WithSource<DeputyDetail>> {
  const url = ENDPOINTS.CAMARA_DEPUTY(id)

  const response = await cachedFetch<CamaraDetailResponse<CamaraDeputyDetailRaw>>(
    url,
    TTL.CAMARA_DEPUTY_DETAIL,
  )

  const detail = mapRawToDeputyDetail(response.dados)

  return { ...detail, _source: response._source }
}

/**
 * Fetches a deputy's CEAP expenses for a given year and optional month.
 *
 * CEAP (Cota para Exercício da Atividade Parlamentar) is the monthly
 * parliamentary allowance each deputy receives to cover mandate-related
 * costs — airfare, fuel, accommodation, meals, printing, etc.
 * The maximum quota amount varies by state (UF), since deputies from
 * more distant states incur higher travel costs to Brasília.
 *
 * The API paginates results (default 15 items/page). This function fetches
 * page 1 only. For full pagination, the caller should iterate using the
 * `pagina` parameter (future enhancement).
 *
 * @param id    - Deputy's numeric ID in the Câmara API
 * @param year  - Reference year (e.g. 2024). Data available since 2008.
 * @param month - Optional month filter (1–12). Omit to return the full year.
 * @returns List of expense records with `_source` injected for traceability
 * @throws {Error} When the API returns a non-2xx status
 *
 * @example
 * ```typescript
 * const expenses = await getDeputyExpenses("220593", 2024, 3)
 * console.log(expenses[0].type)     // "MANUTENÇÃO DE ESCRITÓRIO..."
 * console.log(expenses[0].value)    // 67.3
 * console.log(expenses._source)
 * // → "https://dadosabertos.camara.leg.br/api/v2/deputados/220593/despesas?ano=2024&mes=3"
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__despesas
 */
export async function getDeputyExpenses(
  id: string,
  year: number,
  month?: number,
): Promise<WithSource<DeputyExpense[]>> {
  const base = ENDPOINTS.CAMARA_DEPUTY_EXPENSES(id)
  const params = new URLSearchParams({ ano: String(year), itens: "100" })
  if (month) params.set("mes", String(month))

  // Fetch page 1 to get the data and discover total pages from `links`
  const firstPageUrl = `${base}?${params.toString()}`
  const firstPage = await cachedFetch<CamaraListResponse<CamaraExpenseRaw>>(
    firstPageUrl,
    TTL.CAMARA_DEPUTY_EXPENSES,
  )

  const allRaw: CamaraExpenseRaw[] = [...firstPage.dados]

  // Extract the last page number from the HATEOAS `links` array.
  // The "last" link contains `pagina=N` — if N > 1, fetch remaining pages.
  const lastPageNum = extractLastPage(firstPage.links)

  if (lastPageNum > 1) {
    const pagePromises: Promise<CamaraListResponse<CamaraExpenseRaw> & { _source: string }>[] = []
    for (let p = 2; p <= lastPageNum; p++) {
      const pageParams = new URLSearchParams(params)
      pageParams.set("pagina", String(p))
      const pageUrl = `${base}?${pageParams.toString()}`
      pagePromises.push(
        cachedFetch<CamaraListResponse<CamaraExpenseRaw>>(pageUrl, TTL.CAMARA_DEPUTY_EXPENSES),
      )
    }
    const pages = await Promise.all(pagePromises)
    for (const page of pages) {
      allRaw.push(...page.dados)
    }
  }

  const expenses: DeputyExpense[] = allRaw
    .map(mapRawToExpense)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return Object.assign(expenses, { _source: firstPage._source })
}

// ── Pagination helpers (internal) ─────────────────────────────────────

/**
 * Extracts the last page number from the Câmara API HATEOAS `links` array.
 *
 * The API returns a `links` array with navigation hints. The link with
 * `rel: "last"` contains the URL of the final page, with a `pagina=N`
 * query parameter. This function parses that value.
 *
 * @param links - The HATEOAS links array from a Câmara API response.
 * @returns The last page number, or 1 if no "last" link is found.
 *
 * @example
 * ```typescript
 * const links = [
 *   { rel: "self", href: "...?pagina=1&itens=100" },
 *   { rel: "last", href: "...?pagina=5&itens=100" },
 * ]
 * extractLastPage(links) // → 5
 * ```
 */
function extractLastPage(links: Array<{ rel: string; href: string }>): number {
  const lastLink = links.find((l) => l.rel === "last")
  if (!lastLink) return 1

  const url = new URL(lastLink.href)
  const pagina = url.searchParams.get("pagina")
  return pagina ? parseInt(pagina, 10) : 1
}

// ── Mapping helpers (internal) ────────────────────────────────────────

/**
 * Maps a raw Câmara API deputy object to our normalized `Deputy` type.
 * Converts the numeric `id` to string for cross-source consistency.
 */
function mapRawToDeputy(raw: CamaraDeputyRaw): Deputy {
  return {
    id: String(raw.id),
    name: raw.nome,
    party: raw.siglaPartido,
    uf: raw.siglaUf,
    photoUrl: raw.urlFoto || undefined,
    email: raw.email || undefined,
    legislature: raw.idLegislatura,
  }
}

/**
 * Maps a raw Câmara API detail response to our normalized `DeputyDetail` type.
 * Flattens the `ultimoStatus` nested object and formats the office string
 * from the gabinete fields (building + room + floor).
 */
function mapRawToDeputyDetail(raw: CamaraDeputyDetailRaw): DeputyDetail {
  const status = raw.ultimoStatus
  const gabinete = status.gabinete

  // Build a human-readable office string from gabinete fields.
  // Example: "Anexo IV - Gab. 730, 7º andar"
  const officeParts = [gabinete.nome, gabinete.predio, gabinete.sala]
    .filter(Boolean)
    .join(" - ")

  return {
    id: String(raw.id),
    name: status.nome,
    party: status.siglaPartido,
    uf: status.siglaUf,
    photoUrl: status.urlFoto || undefined,
    email: status.email || undefined,
    legislature: status.idLegislatura,
    fullName: raw.nomeCivil,
    birthDate: raw.dataNascimento || undefined,
    birthPlace: raw.municipioNascimento
      ? `${raw.municipioNascimento}, ${raw.ufNascimento}`
      : raw.ufNascimento || undefined,
    education: raw.escolaridade || undefined,
    office: officeParts || undefined,
    sex: raw.sexo || undefined,
    situation: status.situacao || undefined,
    electoralName: status.nomeEleitoral || undefined,
    phone: gabinete.telefone || undefined,
  }
}

/**
 * Maps a raw Câmara API expense record to our normalized `DeputyExpense` type.
 * Uses `dataDocumento` as the date and `valorLiquido` as the final value
 * (after any deductions/glosas applied by the Câmara).
 */
function mapRawToExpense(raw: CamaraExpenseRaw): DeputyExpense {
  return {
    date: raw.dataDocumento,
    type: raw.tipoDespesa,
    supplierName: raw.nomeFornecedor,
    document: raw.numDocumento,
    supplierDocument: raw.cnpjCpfFornecedor,
    value: raw.valorLiquido,
  }
}
