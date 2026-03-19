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
import type {
  Deputy, DeputyDetail, DeputyExpense, DeputyCommittee, DeputyCaucus,
  DeputySpeech, DeputyEvent, DeputyPreviousMandate, DeputyStatusHistory, DeputyProfession,
  CamaraProposition, CamaraPropositionAuthor, CamaraPropositionTheme,
  CamaraPropositionProgress, CamaraVotingSession, CamaraIndividualVote,
  CamaraVoteOrientation, VoteTally,
} from "@imposterio/types"
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

/** Shape of a committee membership from GET /deputados/{id}/orgaos. */
interface CamaraCommitteeRaw {
  idOrgao: number
  uriOrgao: string
  siglaOrgao: string
  nomeOrgao: string
  nomePublicacao: string
  codTipoOrgao: number
  tipoOrgao: string
  dataInicio: string
  dataFim: string | null
  titulo: string
}

/** Shape of a parliamentary caucus from GET /deputados/{id}/frentes. */
interface CamaraCaucusRaw {
  id: number
  uri: string
  titulo: string
  idLegislatura: number
}

/** Shape of a speech record from GET /deputados/{id}/discursos. */
interface CamaraSpeechRaw {
  dataHoraInicio: string
  dataHoraFim: string | null
  uriEvento: string
  faseEvento: {
    titulo: string
    dataHoraInicio: string | null
    dataHoraFim: string | null
  }
  tipoDiscurso: string
  urlTexto: string | null
  urlAudio: string | null
  urlVideo: string | null
  keywords: string
  sumario: string
  transcricao: string | null
}

/** Shape of an event record from GET /deputados/{id}/eventos or GET /eventos/{id}. */
interface CamaraEventRaw {
  id: number
  uri: string
  dataHoraInicio: string
  dataHoraFim: string | null
  situacao: string
  descricaoTipo: string
  descricao: string
  localExterno: string | null
  orgaos: Array<{
    id: number
    uri: string
    sigla: string
    nome: string
    apelido: string
    codTipoOrgao: number
    tipoOrgao: string
    nomePublicacao: string
  }>
  localCamara: {
    nome: string | null
    predio: string | null
    sala: string | null
    andar: string | null
  } | null
  urlRegistro: string | null
}

/** Shape of a previous mandate from GET /deputados/{id}/mandatosExternos. */
interface CamaraMandateRaw {
  cargo: string
  siglaUf: string
  municipio: string | null
  anoInicio: string
  anoFim: string
  siglaPartidoEleicao: string
  uriPartidoEleicao: string
}

/** Shape of a status history entry from GET /deputados/{id}/historico. */
interface CamaraHistoryRaw {
  id: number
  uri: string
  nome: string
  nomeEleitoral: string
  siglaPartido: string
  uriPartido: string
  siglaUf: string
  idLegislatura: number
  email: string | null
  urlFoto: string
  dataHora: string
  situacao: string
  condicaoEleitoral: string
  descricaoStatus: string | null
}

/** Shape of a profession entry from GET /deputados/{id}/profissoes. */
interface CamaraProfessionRaw {
  dataHora: string
  codTipoProfissao: number
  titulo: string
}

/** Shape of a proposition from GET /proposicoes. */
interface CamaraPropositionRaw {
  id: number
  uri: string
  siglaTipo: string
  codTipo: number
  numero: number
  ano: number
  ementa: string
  ementaDetalhada?: string
  keywords?: string
  dataApresentacao: string
  urlInteiroTeor?: string
  statusProposicao?: {
    dataHora: string
    sequencia: number
    siglaOrgao: string
    nomeOrgao?: string
    regime: string
    descricaoTramitacao: string
    descricaoSituacao: string
    despacho: string
    url?: string
  }
}

/** Shape of a proposition author from GET /proposicoes/{id}/autores. */
interface CamaraAuthorRaw {
  uri: string
  nome: string
  codTipo: number
  tipo: string
  ordemAssinatura: number
  proponente: number
}

/** Shape of a theme from GET /proposicoes/{id}/temas. */
interface CamaraThemeRaw {
  codTema: number
  tema: string
  relevancia: number
}

/** Shape of a progress step from GET /proposicoes/{id}/tramitacoes. */
interface CamaraProgressRaw {
  dataHora: string
  sequencia: number
  siglaOrgao: string
  nomeOrgao?: string
  regime: string
  descricaoTramitacao: string
  descricaoSituacao: string
  despacho: string
  url?: string
}

/**
 * Shape of a voting session from GET /votacoes.
 * Note: vote counts are NOT structured fields — they are embedded in the
 * `descricao` string (e.g. "Sim: 278; Não: 114; Abstenção: 12; Total: 404").
 */
/**
 * Shape of a voting session from the list endpoint GET /votacoes.
 *
 * The list endpoint returns a flat structure with `proposicaoObjeto` as
 * a description string and `uriProposicaoObjeto` as a link, NOT the
 * `proposicoesAfetadas` array (which is only on the detail endpoint).
 */
interface CamaraVotingSessionRaw {
  id: string
  uri: string
  data: string
  dataHoraRegistro: string
  siglaOrgao: string
  uriOrgao: string
  uriEvento: string | null
  proposicaoObjeto: string | null
  uriProposicaoObjeto: string | null
  descricao: string
  aprovacao: number | null
}

/**
 * Shape of a voting session from the detail endpoint GET /votacoes/{id}.
 * Extends the list shape with `proposicoesAfetadas` array and `idEvento`.
 */
interface CamaraVotingSessionDetailRaw extends CamaraVotingSessionRaw {
  idEvento?: number
  proposicoesAfetadas?: Array<{
    id: number
    uri: string
    siglaTipo: string
    codTipo: number
    numero: number
    ano: number
    ementa: string
    dataApresentacao?: string
  }>
}

/** Shape of an individual vote from GET /votacoes/{id}/votos. */
interface CamaraIndividualVoteRaw {
  tipoVoto: string
  deputado_: {
    id: number
    uri: string
    nome: string
    siglaPartido: string
    siglaUf: string
    urlFoto: string
    idLegislatura: number
  }
}

/** Shape of a party orientation from GET /votacoes/{id}/orientacoes. */
interface CamaraOrientationRaw {
  orientacaoVoto: string
  codTipoLideranca: string
  siglaPartidoBloco: string
  codPartidoBloco: number | null
  uriPartidoBloco: string | null
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

/**
 * Fetches the committee memberships for a deputy.
 *
 * Brazilian congressional committees (comissões) are standing or special bodies
 * where proposed legislation is analyzed before reaching the full house vote.
 * Deputies serve as "Titular" (full member) or "Suplente" (alternate). Some
 * also hold leadership positions: Presidente, Vice-Presidente, or Relator.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @returns List of committee memberships with `_source` injected
 * @throws {Error} When the API returns a non-2xx status
 *
 * @example
 * ```typescript
 * const committees = await getDeputyCommittees("220593")
 * console.log(committees[0].abbreviation) // "CCJC"
 * console.log(committees[0].role)         // "Titular"
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__orgaos
 */
export async function getDeputyCommittees(
  id: string,
): Promise<WithSource<DeputyCommittee[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTY_COMMITTEES(id)

  const response = await cachedFetch<CamaraListResponse<CamaraCommitteeRaw>>(
    url,
    TTL.CAMARA_DEPUTY_DETAIL,
  )

  const committees: DeputyCommittee[] = response.dados.map(mapRawToCommittee)

  return Object.assign(committees, { _source: response._source })
}

/**
 * Fetches the parliamentary caucuses (frentes parlamentares) a deputy belongs to.
 *
 * Frentes parlamentares are cross-party advocacy groups formed around shared
 * interests (e.g. Agropecuária, Direitos Humanos, Tecnologia). They have no
 * legislative power but coordinate efforts and events. A deputy can belong to
 * dozens of frentes simultaneously.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @returns List of caucuses with `_source` injected
 * @throws {Error} When the API returns a non-2xx status
 *
 * @example
 * ```typescript
 * const caucuses = await getDeputyCaucuses("220593")
 * console.log(caucuses[0].name) // "Frente Parlamentar da Agropecuária"
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__frentes
 */
export async function getDeputyCaucuses(
  id: string,
): Promise<WithSource<DeputyCaucus[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTY_CAUCUSES(id)

  const response = await cachedFetch<CamaraListResponse<CamaraCaucusRaw>>(
    url,
    TTL.CAMARA_DEPUTY_DETAIL,
  )

  const caucuses: DeputyCaucus[] = response.dados.map(mapRawToCaucus)

  return Object.assign(caucuses, { _source: response._source })
}

/**
 * Fetches a deputy's floor speeches for the current legislature.
 *
 * Discursos are official statements made during plenary sessions, committee
 * meetings, and other legislative events. Each speech includes a summary,
 * optional full transcript, and links to audio/video recordings when available.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @param startDate - Optional ISO date for range start (defaults to current legislature)
 * @param endDate - Optional ISO date for range end
 * @returns List of speeches sorted by date (newest first), with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__discursos
 */
export async function getDeputySpeeches(
  id: string,
  startDate?: string,
  endDate?: string,
): Promise<WithSource<DeputySpeech[]>> {
  const base = ENDPOINTS.CAMARA_DEPUTY_SPEECHES(id)
  const params = new URLSearchParams({ itens: "100", ordem: "DESC", ordenarPor: "dataHoraInicio" })
  if (startDate) params.set("dataInicio", startDate)
  if (endDate) params.set("dataFim", endDate)

  const url = `${base}?${params.toString()}`
  const response = await cachedFetch<CamaraListResponse<CamaraSpeechRaw>>(url, TTL.CAMARA_DEPUTY_SPEECHES)

  const speeches: DeputySpeech[] = response.dados.map(mapRawToSpeech)

  return Object.assign(speeches, { _source: response._source })
}

/**
 * Fetches events (sessions, hearings, committee meetings) a deputy participated in.
 *
 * By default the API returns events within a 5-day window around today.
 * Use startDate/endDate to expand the range. Events include their status,
 * organizing committees, and optional recording URLs.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @param startDate - Optional ISO date for range start
 * @param endDate - Optional ISO date for range end
 * @returns List of events sorted by date (newest first), with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__eventos
 */
export async function getDeputyEvents(
  id: string,
  startDate?: string,
  endDate?: string,
): Promise<WithSource<DeputyEvent[]>> {
  const base = ENDPOINTS.CAMARA_DEPUTY_EVENTS(id)
  const params = new URLSearchParams({ itens: "100", ordem: "DESC", ordenarPor: "dataHoraInicio" })
  if (startDate) params.set("dataInicio", startDate)
  if (endDate) params.set("dataFim", endDate)

  const url = `${base}?${params.toString()}`
  const response = await cachedFetch<CamaraListResponse<CamaraEventRaw>>(url, TTL.CAMARA_DEPUTY_EVENTS)

  const events: DeputyEvent[] = response.dados.map(mapRawToEvent)

  return Object.assign(events, { _source: response._source })
}

/**
 * Fetches a single event detail by ID from GET /eventos/{id}.
 *
 * @param eventId - Event ID in the Câmara API
 * @returns Event detail with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Eventos/get_eventos__id_
 */
export async function getEventDetail(
  eventId: string,
): Promise<WithSource<DeputyEvent>> {
  const url = ENDPOINTS.CAMARA_EVENT(eventId)
  const response = await cachedFetch<CamaraDetailResponse<CamaraEventRaw>>(url, TTL.CAMARA_EVENT_DETAIL)

  const event = mapRawToEvent(response.dados)

  return { ...event, _source: response._source }
}

/**
 * Fetches a deputy's previous elected mandates outside the Câmara (TSE data).
 *
 * These are positions like city council (vereador), mayor (prefeito),
 * state legislator (deputado estadual), etc., providing a full picture
 * of the deputy's political career trajectory.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @returns List of previous mandates with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__mandatosExternos
 */
export async function getDeputyPreviousMandates(
  id: string,
): Promise<WithSource<DeputyPreviousMandate[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTY_MANDATES(id)
  const response = await cachedFetch<CamaraListResponse<CamaraMandateRaw>>(url, TTL.CAMARA_DEPUTY_MANDATES)

  const mandates: DeputyPreviousMandate[] = response.dados
    .map(mapRawToMandate)
    .sort((a, b) => b.startYear - a.startYear)

  return Object.assign(mandates, { _source: response._source })
}

/**
 * Fetches the parliamentary status history of a deputy.
 *
 * Tracks party switches, leaves of absence, resignations, and electoral
 * condition changes throughout the legislature. Essential for understanding
 * a deputy's political trajectory and current standing.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @returns List of status changes sorted by date (newest first), with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__historico
 */
export async function getDeputyHistory(
  id: string,
): Promise<WithSource<DeputyStatusHistory[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTY_HISTORY(id)
  const response = await cachedFetch<CamaraListResponse<CamaraHistoryRaw>>(url, TTL.CAMARA_DEPUTY_HISTORY)

  const history: DeputyStatusHistory[] = response.dados
    .map(mapRawToHistory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return Object.assign(history, { _source: response._source })
}

/**
 * Fetches the declared professions of a deputy.
 *
 * @param id - Deputy's numeric ID in the Câmara API
 * @returns List of professions with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Deputados/get_deputados__id__profissoes
 */
export async function getDeputyProfessions(
  id: string,
): Promise<WithSource<DeputyProfession[]>> {
  const url = ENDPOINTS.CAMARA_DEPUTY_PROFESSIONS(id)
  const response = await cachedFetch<CamaraListResponse<CamaraProfessionRaw>>(url, TTL.CAMARA_DEPUTY_PROFESSIONS)

  const professions: DeputyProfession[] = response.dados.map(mapRawToProfession)

  return Object.assign(professions, { _source: response._source })
}

// ── Proposition & Voting session fetchers ──────────────────────────────

/**
 * Fetches a paginated list of propositions from the Câmara API.
 *
 * Proposições are the core legislative instrument in Brazil. They include
 * bills (PL), constitutional amendments (PEC), complementary law bills (PLP),
 * provisional measures (MP), legislative decrees (PDL), and formal requests (REQ).
 *
 * The API supports extensive filtering: by type, year, author, theme, status,
 * keywords, and date range. This function fetches all pages automatically using
 * the HATEOAS pagination links.
 *
 * @param params.year - Filter by reference year (e.g. 2026)
 * @param params.typeCode - Filter by type abbreviation (e.g. "PL", "PEC")
 * @param params.startDate - ISO date for range start (dataInicio)
 * @param params.endDate - ISO date for range end (dataFim)
 * @param params.keywords - Keyword search
 * @param params.topic - Topic/theme code filter
 * @param params.orderBy - Field to order by (default "id")
 * @param params.order - "ASC" or "DESC" (default "DESC")
 * @returns List of propositions with `_source` injected
 *
 * @example
 * ```typescript
 * const props = await getPropositions({ year: 2026, typeCode: "PL" })
 * console.log(props[0].typeCode) // "PL"
 * console.log(props._source)
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Proposições/get_proposicoes
 */
export async function getPropositions(params: {
  year?: number
  typeCode?: string
  startDate?: string
  endDate?: string
  keywords?: string
  topic?: number
  orderBy?: string
  order?: "ASC" | "DESC"
  /** Maximum number of pages to fetch (default 5 = 500 items). */
  maxPages?: number
} = {}): Promise<WithSource<CamaraProposition[]>> {
  const base = ENDPOINTS.CAMARA_PROPOSITIONS
  const qs = new URLSearchParams({ itens: "100", ordem: params.order ?? "DESC", ordenarPor: params.orderBy ?? "id" })
  if (params.year) qs.set("ano", String(params.year))
  if (params.typeCode) qs.set("siglaTipo", params.typeCode)
  if (params.startDate) qs.set("dataInicio", params.startDate)
  if (params.endDate) qs.set("dataFim", params.endDate)
  if (params.keywords) qs.set("keywords", params.keywords)
  if (params.topic) qs.set("codTema", String(params.topic))

  // Cap pagination to avoid excessive API calls.
  // The Câmara has thousands of propositions per year (incl. REQs, amendments).
  const maxPages = params.maxPages ?? 5

  const firstPageUrl = `${base}?${qs.toString()}`
  const firstPage = await cachedFetch<CamaraListResponse<CamaraPropositionRaw>>(firstPageUrl, TTL.CAMARA_PROPOSITIONS)
  const allRaw: CamaraPropositionRaw[] = [...firstPage.dados]

  const lastPageNum = Math.min(extractLastPage(firstPage.links), maxPages)
  if (lastPageNum > 1) {
    const pagePromises = []
    for (let p = 2; p <= lastPageNum; p++) {
      const pageQs = new URLSearchParams(qs)
      pageQs.set("pagina", String(p))
      pagePromises.push(cachedFetch<CamaraListResponse<CamaraPropositionRaw>>(`${base}?${pageQs.toString()}`, TTL.CAMARA_PROPOSITIONS))
    }
    const pages = await Promise.all(pagePromises)
    for (const page of pages) allRaw.push(...page.dados)
  }

  const propositions: CamaraProposition[] = allRaw.map(mapRawToProposition)
  return Object.assign(propositions, { _source: firstPage._source })
}

/**
 * Fetches a single proposition detail by its Câmara API ID.
 *
 * @param id - Proposition ID
 * @returns Proposition detail with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Proposições/get_proposicoes__id_
 */
export async function getPropositionDetail(id: string): Promise<WithSource<CamaraProposition>> {
  const url = ENDPOINTS.CAMARA_PROPOSITION(id)
  const response = await cachedFetch<CamaraDetailResponse<CamaraPropositionRaw>>(url, TTL.CAMARA_PROPOSITION_DETAIL)
  const proposition = mapRawToProposition(response.dados)
  return { ...proposition, _source: response._source }
}

/**
 * Fetches the authors of a proposition.
 *
 * A proposition can have multiple authors (deputies, committees, or the Executive).
 * The first author (ordemAssinatura=1) is typically the lead proponent.
 *
 * @param id - Proposition ID
 * @returns List of authors with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Proposições/get_proposicoes__id__autores
 */
export async function getPropositionAuthors(id: string): Promise<WithSource<CamaraPropositionAuthor[]>> {
  const url = ENDPOINTS.CAMARA_PROPOSITION_AUTHORS(id)
  const response = await cachedFetch<CamaraListResponse<CamaraAuthorRaw>>(url, TTL.CAMARA_PROPOSITION_AUTHORS)

  const authors: CamaraPropositionAuthor[] = response.dados.map((raw) => ({
    name: raw.nome,
    type: raw.tipo,
    order: raw.ordemAssinatura,
    isLead: raw.proponente === 1,
  }))

  return Object.assign(authors, { _source: response._source })
}

/**
 * Fetches the themes/topics assigned to a proposition.
 *
 * The Câmara classifies propositions under one or more themes (e.g.
 * "Economia", "Educação") with a relevance score.
 *
 * @param id - Proposition ID
 * @returns List of themes with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Proposições/get_proposicoes__id__temas
 */
export async function getPropositionThemes(id: string): Promise<WithSource<CamaraPropositionTheme[]>> {
  const url = ENDPOINTS.CAMARA_PROPOSITION_THEMES(id)
  const response = await cachedFetch<CamaraListResponse<CamaraThemeRaw>>(url, TTL.CAMARA_PROPOSITION_THEMES)

  const themes: CamaraPropositionTheme[] = response.dados.map((raw) => ({
    code: raw.codTema,
    name: raw.tema,
    relevance: raw.relevancia,
  }))

  return Object.assign(themes, { _source: response._source })
}

/**
 * Fetches the legislative progress history (tramitações) of a proposition.
 *
 * Each step records a movement in the legislative process: referral to a
 * committee, a favorable opinion, a vote, archival, etc.
 *
 * @param id - Proposition ID
 * @returns List of progress steps sorted by date (newest first), with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Proposições/get_proposicoes__id__tramitacoes
 */
export async function getPropositionProgress(id: string): Promise<WithSource<CamaraPropositionProgress[]>> {
  const url = ENDPOINTS.CAMARA_PROPOSITION_PROGRESS(id)
  const response = await cachedFetch<CamaraListResponse<CamaraProgressRaw>>(url, TTL.CAMARA_PROPOSITION_PROGRESS)

  const progress: CamaraPropositionProgress[] = response.dados
    .map((raw) => ({
      date: raw.dataHora,
      sequence: raw.sequencia,
      description: raw.descricaoTramitacao,
      organAbbreviation: raw.siglaOrgao || undefined,
      organName: raw.nomeOrgao || undefined,
      regime: raw.regime || undefined,
      situation: raw.descricaoSituacao || undefined,
      documentUrl: raw.url || undefined,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return Object.assign(progress, { _source: response._source })
}

/**
 * Fetches voting sessions from the Câmara within a date range.
 *
 * Voting sessions are formal recorded votes in plenary or committees.
 * The `descricao` field contains vote counts as a human-readable string
 * (e.g. "Sim: 278; Não: 114") which we parse into a structured `VoteTally`.
 *
 * @param startDate - ISO date for range start
 * @param endDate - ISO date for range end
 * @returns List of voting sessions with `_source` injected
 *
 * @example
 * ```typescript
 * const sessions = await getVotingSessions("2026-01-01", "2026-12-31")
 * console.log(sessions[0].approved) // true
 * ```
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Votações/get_votacoes
 */
export async function getVotingSessions(
  startDate: string,
  endDate: string,
): Promise<WithSource<CamaraVotingSession[]>> {
  const base = ENDPOINTS.CAMARA_VOTING_SESSIONS

  // The Câmara API limits date ranges to 3 months max.
  // Split the full range into quarterly chunks and fetch all in parallel.
  const chunks = splitDateRangeIntoQuarters(startDate, endDate)

  const allRaw: CamaraVotingSessionRaw[] = []
  let sourceUrl = ""

  for (const chunk of chunks) {
    const qs = new URLSearchParams({
      dataInicio: chunk.start,
      dataFim: chunk.end,
      itens: "100",
      ordem: "DESC",
      ordenarPor: "id",
    })

    const firstPageUrl = `${base}?${qs.toString()}`
    const firstPage = await cachedFetch<CamaraListResponse<CamaraVotingSessionRaw>>(firstPageUrl, TTL.CAMARA_VOTING_SESSIONS)
    if (!sourceUrl) sourceUrl = firstPage._source
    allRaw.push(...firstPage.dados)

    const lastPageNum = extractLastPage(firstPage.links)
    if (lastPageNum > 1) {
      const pagePromises = []
      for (let p = 2; p <= lastPageNum; p++) {
        const pageQs = new URLSearchParams(qs)
        pageQs.set("pagina", String(p))
        pagePromises.push(cachedFetch<CamaraListResponse<CamaraVotingSessionRaw>>(`${base}?${pageQs.toString()}`, TTL.CAMARA_VOTING_SESSIONS))
      }
      const pages = await Promise.all(pagePromises)
      for (const page of pages) allRaw.push(...page.dados)
    }
  }

  const sessions: CamaraVotingSession[] = allRaw.map(mapRawToVotingSession)
  return Object.assign(sessions, { _source: sourceUrl })
}

/**
 * Fetches a single voting session detail.
 *
 * @param id - Voting session ID
 * @returns Voting session detail with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Votações/get_votacoes__id_
 */
export async function getVotingSessionDetail(id: string): Promise<WithSource<CamaraVotingSession>> {
  const url = ENDPOINTS.CAMARA_VOTING_SESSION(id)
  const response = await cachedFetch<CamaraDetailResponse<CamaraVotingSessionDetailRaw>>(url, TTL.CAMARA_VOTING_SESSION_DETAIL)
  const session = mapRawToVotingSessionDetail(response.dados)
  return { ...session, _source: response._source }
}

/**
 * Fetches individual deputy votes for a voting session.
 *
 * Returns all votes at once (no pagination). Each vote includes
 * the deputy's name, party, UF, and how they voted.
 *
 * @param id - Voting session ID
 * @returns List of individual votes with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Votações/get_votacoes__id__votos
 */
export async function getVotingSessionVotes(id: string): Promise<WithSource<CamaraIndividualVote[]>> {
  const url = ENDPOINTS.CAMARA_VOTING_SESSION_VOTES(id)
  const response = await cachedFetch<CamaraListResponse<CamaraIndividualVoteRaw>>(url, TTL.CAMARA_VOTING_SESSION_VOTES)

  const votes: CamaraIndividualVote[] = response.dados.map((raw) => ({
    deputyId: String(raw.deputado_.id),
    deputyName: raw.deputado_.nome,
    party: raw.deputado_.siglaPartido,
    uf: raw.deputado_.siglaUf,
    vote: raw.tipoVoto,
    photoUrl: raw.deputado_.urlFoto || undefined,
  }))

  return Object.assign(votes, { _source: response._source })
}

/**
 * Fetches party/bloc voting orientations for a voting session.
 *
 * Before recorded votes, party leaders announce their recommendation:
 * "Sim" (yes), "Não" (no), "Liberado" (free vote), or "Obstrução"
 * (leave floor to block quorum).
 *
 * @param id - Voting session ID
 * @returns List of orientations with `_source` injected
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html#/Votações/get_votacoes__id__orientacoes
 */
export async function getVotingSessionOrientations(id: string): Promise<WithSource<CamaraVoteOrientation[]>> {
  const url = ENDPOINTS.CAMARA_VOTING_SESSION_ORIENTATIONS(id)
  const response = await cachedFetch<CamaraListResponse<CamaraOrientationRaw>>(url, TTL.CAMARA_VOTING_SESSION_ORIENTATIONS)

  const orientations: CamaraVoteOrientation[] = response.dados.map((raw) => ({
    name: raw.siglaPartidoBloco,
    orientation: raw.orientacaoVoto,
    type: raw.codTipoLideranca,
  }))

  return Object.assign(orientations, { _source: response._source })
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

/**
 * Splits a date range into chunks of at most 3 months each.
 *
 * The Câmara `/votacoes` endpoint rejects date ranges longer than 3 months.
 * This helper breaks a full-year range into quarterly chunks that the API accepts.
 *
 * @param startDate - ISO date string (e.g. "2026-01-01")
 * @param endDate - ISO date string (e.g. "2026-12-31")
 * @returns Array of { start, end } date string pairs, each spanning ≤ 3 months
 */
function splitDateRangeIntoQuarters(startDate: string, endDate: string): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  let cursor = new Date(start)

  while (cursor < end) {
    const chunkEnd = new Date(cursor)
    chunkEnd.setMonth(chunkEnd.getMonth() + 3)
    chunkEnd.setDate(chunkEnd.getDate() - 1)

    const actualEnd = chunkEnd > end ? end : chunkEnd

    chunks.push({
      start: cursor.toISOString().slice(0, 10),
      end: actualEnd.toISOString().slice(0, 10),
    })

    cursor = new Date(actualEnd)
    cursor.setDate(cursor.getDate() + 1)
  }

  return chunks
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
    grossValue: raw.valorDocumento,
    deductedValue: raw.valorGlosa,
    documentUrl: raw.urlDocumento || undefined,
    documentType: raw.tipoDocumento,
    documentCode: raw.codDocumento,
    reimbursementNumber: raw.numRessarcimento || undefined,
    batchNumber: raw.codLote,
    installment: raw.parcela,
    year: raw.ano,
    month: raw.mes,
  }
}

/**
 * Maps a raw Câmara API committee membership to our normalized `DeputyCommittee` type.
 * The `titulo` field contains the deputy's role in the committee (e.g. "Titular", "Suplente").
 */
function mapRawToCommittee(raw: CamaraCommitteeRaw): DeputyCommittee {
  return {
    id: String(raw.idOrgao),
    abbreviation: raw.siglaOrgao,
    name: raw.nomeOrgao,
    type: raw.tipoOrgao,
    role: raw.titulo,
    startDate: raw.dataInicio,
    endDate: raw.dataFim || undefined,
  }
}

/**
 * Maps a raw Câmara API caucus to our normalized `DeputyCaucus` type.
 * The `titulo` field is the full name of the frente parlamentar.
 */
function mapRawToCaucus(raw: CamaraCaucusRaw): DeputyCaucus {
  return {
    id: String(raw.id),
    name: raw.titulo,
    legislature: raw.idLegislatura,
  }
}

/** Maps a raw speech to our normalized `DeputySpeech` type. */
function mapRawToSpeech(raw: CamaraSpeechRaw): DeputySpeech {
  return {
    startTime: raw.dataHoraInicio,
    endTime: raw.dataHoraFim || undefined,
    type: raw.tipoDiscurso,
    phase: raw.faseEvento?.titulo || "",
    summary: raw.sumario,
    transcript: raw.transcricao || undefined,
    keywords: raw.keywords || undefined,
    textUrl: raw.urlTexto || undefined,
    audioUrl: raw.urlAudio || undefined,
    videoUrl: raw.urlVideo || undefined,
  }
}

/**
 * Maps a raw event to our normalized `DeputyEvent` type.
 * Builds a human-readable location string from the localCamara fields.
 */
function mapRawToEvent(raw: CamaraEventRaw): DeputyEvent {
  const loc = raw.localCamara
  const locationParts = loc
    ? [loc.nome, loc.predio, loc.sala].filter(Boolean).join(" — ")
    : raw.localExterno

  return {
    id: String(raw.id),
    startTime: raw.dataHoraInicio,
    endTime: raw.dataHoraFim || undefined,
    status: raw.situacao,
    type: raw.descricaoTipo,
    description: raw.descricao,
    organs: raw.orgaos.map((o) => ({
      id: String(o.id),
      abbreviation: o.sigla,
      name: o.nome,
    })),
    location: locationParts || undefined,
    recordingUrl: raw.urlRegistro || undefined,
  }
}

/** Maps a raw previous mandate to our normalized `DeputyPreviousMandate` type. */
function mapRawToMandate(raw: CamaraMandateRaw): DeputyPreviousMandate {
  return {
    office: raw.cargo || "",
    uf: raw.siglaUf || "",
    municipality: raw.municipio || undefined,
    startYear: Number(raw.anoInicio) || 0,
    endYear: Number(raw.anoFim) || 0,
    party: raw.siglaPartidoEleicao || "",
  }
}

/** Maps a raw status history entry to our normalized `DeputyStatusHistory` type. */
function mapRawToHistory(raw: CamaraHistoryRaw): DeputyStatusHistory {
  return {
    date: raw.dataHora || "",
    status: raw.situacao || "",
    electoralCondition: raw.condicaoEleitoral || "",
    description: raw.descricaoStatus || undefined,
    party: raw.siglaPartido || "",
    uf: raw.siglaUf || "",
  }
}

/** Maps a raw profession to our normalized `DeputyProfession` type. */
function mapRawToProfession(raw: CamaraProfessionRaw): DeputyProfession {
  return {
    title: raw.titulo,
    date: raw.dataHora,
  }
}

/** Maps a raw proposition to our normalized `CamaraProposition` type. */
function mapRawToProposition(raw: CamaraPropositionRaw): CamaraProposition {
  const status = raw.statusProposicao
  return {
    id: String(raw.id),
    typeCode: raw.siglaTipo,
    number: raw.numero,
    year: raw.ano,
    summary: raw.ementa,
    fullSummary: raw.ementaDetalhada || undefined,
    keywords: raw.keywords || undefined,
    presentedDate: raw.dataApresentacao,
    textUrl: raw.urlInteiroTeor || undefined,
    statusDescription: status?.descricaoSituacao || undefined,
    statusDate: status?.dataHora || undefined,
    statusOrgan: status?.siglaOrgao || undefined,
    statusOrganName: status?.nomeOrgao || undefined,
    regime: status?.regime || undefined,
  }
}

/**
 * Maps a raw voting session to our normalized `CamaraVotingSession` type.
 *
 * Vote counts are embedded in the `descricao` string in various formats:
 * - "Sim: 278; Não: 114; Abstenção: 12; Total: 404"
 * - "Sim - 278, Não - 114"
 * We attempt to parse these into a structured VoteTally.
 */
/**
 * Maps a list-endpoint voting session to our normalized type.
 * The list endpoint has `proposicaoObjeto` as a description string,
 * not the full `proposicoesAfetadas` array.
 */
function mapRawToVotingSession(raw: CamaraVotingSessionRaw): CamaraVotingSession {
  // Extract event ID from uriEvento URL (e.g. ".../eventos/81118" → "81118")
  const eventId = raw.uriEvento?.match(/eventos\/(\d+)/)?.[1]

  return {
    id: raw.id,
    date: raw.data || raw.dataHoraRegistro,
    description: raw.descricao,
    approved: raw.aprovacao === 1 ? true : raw.aprovacao === 0 ? false : null,
    voteTally: parseVoteTally(raw.descricao),
    propositions: [],
    eventId,
  }
}

/**
 * Maps a detail-endpoint voting session (with proposicoesAfetadas and idEvento).
 */
function mapRawToVotingSessionDetail(raw: CamaraVotingSessionDetailRaw): CamaraVotingSession {
  const eventId = raw.idEvento
    ? String(raw.idEvento)
    : raw.uriEvento?.match(/eventos\/(\d+)/)?.[1]

  return {
    id: raw.id,
    date: raw.data || raw.dataHoraRegistro,
    description: raw.descricao,
    approved: raw.aprovacao === 1 ? true : raw.aprovacao === 0 ? false : null,
    voteTally: parseVoteTally(raw.descricao),
    propositions: (raw.proposicoesAfetadas ?? []).map((p) => ({
      id: String(p.id),
      typeCode: p.siglaTipo,
      number: p.numero,
      year: p.ano,
      summary: p.ementa,
    })),
    eventId,
  }
}

/**
 * Attempts to parse vote counts from a voting session description string.
 *
 * The Câmara API does not provide structured vote count fields. Instead,
 * vote totals are embedded in the description text. Common patterns:
 * - "Sim: 278; Não: 114; Abstenção: 12"
 * - "Sim - 278, Não - 114"
 * - Numeric values after "Sim", "Não", "Abstenção"/"Abst"
 *
 * @returns Parsed VoteTally or undefined if parsing fails
 */
function parseVoteTally(description: string): VoteTally | undefined {
  if (!description) return undefined

  const yesMatch = description.match(/Sim[:\s-]+(\d+)/i)
  const noMatch = description.match(/N[aã]o[:\s-]+(\d+)/i)
  const abstMatch = description.match(/Abst(?:en[çc][aã]o)?[:\s-]+(\d+)/i)

  if (!yesMatch && !noMatch) return undefined

  return {
    yes: yesMatch ? parseInt(yesMatch[1], 10) : 0,
    no: noMatch ? parseInt(noMatch[1], 10) : 0,
    abstention: abstMatch ? parseInt(abstMatch[1], 10) : 0,
    absent: 0,
  }
}
