/**
 * @file senado.ts
 * @description Fetchers for the Senado Federal Open Data API.
 *
 * The Senado Federal is the upper house of Brazil's National Congress, with
 * 81 senators (3 per state plus 3 for the Federal District) elected to
 * staggered 8-year terms. It shares legislative power with the Câmara dos
 * Deputados (lower house).
 *
 * Official docs: https://legis.senado.leg.br/dadosabertos/docs/index.html
 * Base URL:      https://legis.senado.leg.br/dadosabertos
 * Auth:          none required
 * Rate limit:    not officially documented — use cache generously
 *
 * All fetchers in this file inject the `_source` field automatically via
 * `cachedFetch()`, enabling the frontend to display a link to the exact
 * API call that generated each data point.
 *
 * ## Senado API response shape
 *
 * The legacy `/senador/*` family deeply nests every payload:
 * `ListaParlamentarEmExercicio.Parlamentares.Parlamentar[]`,
 * `DetalheParlamentar.Parlamentar.{IdentificacaoParlamentar, …}`,
 * `MandatoParlamentar.Parlamentar.Mandatos.Mandato[]`, etc.
 *
 * The modern `/processo` and `/votacao` family (used in later phases) return
 * flat arrays. Mappers in this file branch by endpoint family rather than
 * trying to unify the two shapes.
 *
 * ## Known quirks (see SENADO-IMPLEMENTATION.md §7)
 *
 * 1. **Single-element arrays serialize as objects.** A senator with one
 *    mandate gets `Mandato: { … }` (an object), not `Mandato: [ … ]`. We
 *    coerce with {@link ensureArray} at every nested array boundary.
 * 2. **Default content type is XML.** Without an explicit `Accept` header,
 *    the API responds in XML. We pass {@link SENADO_HEADERS} on every call.
 * 3. **Field naming.** Raw responses use `CodigoParlamentar`, `NomeParlamentar`,
 *    `SiglaPartidoParlamentar`, etc. Mappers normalize to English camelCase
 *    matching the deputy types so detail-page components can be reused.
 */

import { ApiError, cachedFetch, redis } from "./lib/cache"
import { ENDPOINTS } from "./lib/endpoints"
import { TTL } from "./lib/ttl"
import type {
  Senator,
  SenatorDetail,
  SenatorMandate,
  SenatorAffiliation,
  SenatorVotingRecord,
  SenatorSpeech,
  SenatorCommittee,
  SenatorPosition,
  SenatorLeadership,
  SenatorExpense,
  SenatorCeapsBulkEntry,
  SenatorCeapsBulkSummary,
  PlenarySession,
  SenatorAttendanceEntry,
  SenatorAttendanceBulkSummary,
  SenatorAttendanceDay,
  SenatorAttendanceDetail,
  Proposition,
  PropositionType,
  PropositionVote,
  VoteTally,
  PropositionDocument,
  PropositionAmendment,
  RapporteurshipRecord,
  SenadoVotingSession,
  SenadoContract,
  SenadoContractsSummary,
  SenadoBid,
  SenadoContractor,
  SenadoServant,
  SenadoServantsSummary,
  SenadoServantHeadcountRow,
  SenadoServantRemuneration,
  SenadoRemunerationSummary,
} from "@imposterio/types"
import type { WithSource } from "@imposterio/types"

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Senado legacy endpoints serialize single-element arrays as objects.
 *
 * Example: a senator with one mandate gets `Mandatos: { Mandato: { … } }`
 * instead of `Mandatos: { Mandato: [ … ] }`. Always wrap nested array
 * accesses in this helper.
 *
 * @param x - A value that may be an array, a single item, undefined, or null.
 * @returns A normalized array. Empty when input is null/undefined.
 */
export function ensureArray<T>(x: T | T[] | undefined | null): T[] {
  if (Array.isArray(x)) return x
  if (x == null) return []
  return [x]
}

/**
 * Default request headers for every Senado API call.
 *
 * The API responds in XML when no `Accept` header is sent. The `.json` URL
 * suffix usually triggers JSON anyway, but the explicit header is the safer
 * belt-and-suspenders approach.
 */
const SENADO_HEADERS = { Accept: "application/json" } as const

// ── Raw API response types (internal, not exported) ──────────────────

/** Identification block shared across most legacy senator endpoints. */
interface SenadoIdentificacaoParlamentarRaw {
  CodigoParlamentar: string
  NomeParlamentar: string
  NomeCompletoParlamentar?: string
  SiglaPartidoParlamentar?: string
  UfParlamentar?: string
  UrlFotoParlamentar?: string
  EmailParlamentar?: string
  SexoParlamentar?: string
  UrlPaginaParlamentar?: string
}

/** Single senator entry in the active-senators list endpoint. */
interface SenadoSenatorListEntryRaw {
  IdentificacaoParlamentar: SenadoIdentificacaoParlamentarRaw
  Mandato?: {
    CodigoMandato?: string
    UfParlamentar?: string
    PrimeiraLegislaturaDoMandato?: { NumeroLegislatura?: string }
    SegundaLegislaturaDoMandato?: { NumeroLegislatura?: string }
  }
}

/** Wrapper for `GET /senador/lista/atual.json`. */
interface SenadoSenatorsListRaw {
  ListaParlamentarEmExercicio: {
    Parlamentares?: {
      Parlamentar: SenadoSenatorListEntryRaw | SenadoSenatorListEntryRaw[]
    }
  }
}

/** Telephone entry. */
interface SenadoTelefoneRaw {
  NumeroTelefone?: string
  OrdemPublicacao?: string
  IndicadorFax?: string
}

/** Wrapper for `GET /senador/{id}.json`. */
interface SenadoSenatorDetailRaw {
  DetalheParlamentar: {
    Parlamentar?: {
      IdentificacaoParlamentar: SenadoIdentificacaoParlamentarRaw
      DadosBasicosParlamentar?: {
        DataNascimento?: string
        Naturalidade?: string
        UfNaturalidade?: string
        EnderecoParlamentar?: string
      }
      Telefones?: {
        Telefone: SenadoTelefoneRaw | SenadoTelefoneRaw[]
      }
      MandatoAtual?: {
        CodigoMandato?: string
        UfParlamentar?: string
        DescricaoParticipacao?: string
        PrimeiraLegislaturaDoMandato?: {
          NumeroLegislatura?: string
          DataInicio?: string
          DataFim?: string
        }
        SegundaLegislaturaDoMandato?: {
          NumeroLegislatura?: string
          DataInicio?: string
          DataFim?: string
        }
      }
      OutrasInformacoes?: {
        Servico?: { NomeServico?: string; UrlServico?: string }[]
      }
    }
  }
}

/** Single mandate entry. */
interface SenadoMandateRaw {
  CodigoMandato?: string
  UfParlamentar?: string
  DescricaoParticipacao?: string
  PrimeiraLegislaturaDoMandato?: {
    NumeroLegislatura?: string
    DataInicio?: string
    DataFim?: string
  }
  SegundaLegislaturaDoMandato?: {
    NumeroLegislatura?: string
    DataInicio?: string
    DataFim?: string
  }
  Suplentes?: {
    Suplente?:
      | { DescricaoParticipacao?: string; NomeParlamentar?: string }
      | Array<{ DescricaoParticipacao?: string; NomeParlamentar?: string }>
  }
  Titular?: { NomeParlamentar?: string }
}

/** Wrapper for `GET /senador/{id}/mandatos.json`. */
interface SenadoMandatesRaw {
  MandatoParlamentar: {
    Parlamentar?: {
      Mandatos?: {
        Mandato: SenadoMandateRaw | SenadoMandateRaw[]
      }
    }
  }
}

/** Single party affiliation entry. */
interface SenadoAffiliationRaw {
  Partido?: {
    SiglaPartido?: string
    NomePartido?: string
  }
  DataFiliacao?: string
  DataDesfiliacao?: string
}

/** Wrapper for `GET /senador/{id}/filiacoes.json`. */
interface SenadoAffiliationsRaw {
  FiliacaoParlamentar: {
    Parlamentar?: {
      Filiacoes?: {
        Filiacao: SenadoAffiliationRaw | SenadoAffiliationRaw[]
      }
    }
  }
}

// ── Mapper functions (private) ───────────────────────────────────────

/**
 * Concatenates municipality and UF into a single readable birth-place string.
 *
 * @example
 * formatBirthPlace("Belo Horizonte", "MG") // "Belo Horizonte, MG"
 * formatBirthPlace("Brasília", undefined)  // "Brasília"
 * formatBirthPlace(undefined, "SP")        // "SP"
 * formatBirthPlace(undefined, undefined)   // undefined
 */
function formatBirthPlace(
  city: string | undefined,
  uf: string | undefined,
): string | undefined {
  const cleanCity = city?.trim()
  const cleanUf = uf?.trim()
  if (cleanCity && cleanUf) return `${cleanCity}, ${cleanUf}`
  return cleanCity || cleanUf || undefined
}

/**
 * Picks the first defined legislature number from a mandate's two-legislature
 * span and coerces it to a number. Returns `0` when missing — the list
 * endpoint always provides at least one legislature on active senators.
 */
function pickLegislature(
  mandate: SenadoSenatorListEntryRaw["Mandato"] | SenadoMandateRaw | undefined,
): number {
  const first = mandate?.PrimeiraLegislaturaDoMandato?.NumeroLegislatura
  const second = mandate?.SegundaLegislaturaDoMandato?.NumeroLegislatura
  const value = first ?? second
  if (!value) return 0
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

/** Returns the value or `undefined` when the input is empty/whitespace. */
function nonEmpty(value: string | undefined | null): string | undefined {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  return trimmed.length === 0 ? undefined : trimmed
}

/** Maps the list-endpoint raw shape to the public `Senator` type. */
function mapRawToSenator(raw: SenadoSenatorListEntryRaw): Senator {
  const ident = raw.IdentificacaoParlamentar
  return {
    id: String(ident.CodigoParlamentar),
    name: ident.NomeParlamentar,
    party: ident.SiglaPartidoParlamentar ?? "",
    uf: ident.UfParlamentar ?? raw.Mandato?.UfParlamentar ?? "",
    photoUrl: nonEmpty(ident.UrlFotoParlamentar),
    email: nonEmpty(ident.EmailParlamentar),
    legislature: pickLegislature(raw.Mandato),
  }
}

/** Maps the detail-endpoint raw shape to the public `SenatorDetail` type. */
function mapRawToSenatorDetail(raw: SenadoSenatorDetailRaw): SenatorDetail {
  const parl = raw.DetalheParlamentar.Parlamentar
  if (!parl) {
    throw new Error("Senado API returned an empty DetalheParlamentar.Parlamentar block")
  }

  const ident = parl.IdentificacaoParlamentar
  const basicos = parl.DadosBasicosParlamentar
  const mandate = parl.MandatoAtual
  const telefones = ensureArray(parl.Telefones?.Telefone)
  const phone = nonEmpty(telefones[0]?.NumeroTelefone)

  return {
    id: String(ident.CodigoParlamentar),
    name: ident.NomeParlamentar,
    fullName: ident.NomeCompletoParlamentar ?? ident.NomeParlamentar,
    party: ident.SiglaPartidoParlamentar ?? "",
    uf: ident.UfParlamentar ?? mandate?.UfParlamentar ?? "",
    photoUrl: nonEmpty(ident.UrlFotoParlamentar),
    email: nonEmpty(ident.EmailParlamentar),
    legislature: pickLegislature(mandate),
    sex: nonEmpty(ident.SexoParlamentar),
    birthDate: nonEmpty(basicos?.DataNascimento),
    birthPlace: formatBirthPlace(basicos?.Naturalidade, basicos?.UfNaturalidade),
    office: nonEmpty(basicos?.EnderecoParlamentar),
    phone,
    situation: nonEmpty(mandate?.DescricaoParticipacao),
    websiteUrl: nonEmpty(ident.UrlPaginaParlamentar),
    termStart: nonEmpty(mandate?.PrimeiraLegislaturaDoMandato?.DataInicio),
    termEnd: nonEmpty(
      mandate?.SegundaLegislaturaDoMandato?.DataFim ??
        mandate?.PrimeiraLegislaturaDoMandato?.DataFim,
    ),
  }
}

/** Maps a raw mandate entry to the public `SenatorMandate` type. */
function mapRawToMandate(raw: SenadoMandateRaw): SenatorMandate {
  const startStr = raw.PrimeiraLegislaturaDoMandato?.DataInicio
  const endStr =
    raw.SegundaLegislaturaDoMandato?.DataFim ?? raw.PrimeiraLegislaturaDoMandato?.DataFim
  const startYear = startStr ? parseInt(startStr.slice(0, 4), 10) : 0
  const endYear = endStr ? parseInt(endStr.slice(0, 4), 10) : 0

  return {
    id: String(raw.CodigoMandato ?? ""),
    participation: raw.DescricaoParticipacao ?? "Titular",
    uf: raw.UfParlamentar ?? "",
    primaryLegislature: pickLegislature(raw) || undefined,
    startYear: Number.isFinite(startYear) ? startYear : 0,
    endYear: Number.isFinite(endYear) ? endYear : 0,
  }
}

/** Maps a raw affiliation entry to the public `SenatorAffiliation` type. */
function mapRawToAffiliation(raw: SenadoAffiliationRaw): SenatorAffiliation {
  return {
    party: raw.Partido?.SiglaPartido ?? "",
    partyName: nonEmpty(raw.Partido?.NomePartido),
    startDate: raw.DataFiliacao ?? "",
    endDate: nonEmpty(raw.DataDesfiliacao),
  }
}

// ── Public fetchers ──────────────────────────────────────────────────

/**
 * Fetches the list of all senators currently in exercise (81 entries
 * during a normal legislature, possibly fewer when seats are vacant).
 *
 * @returns Array of senators with `_source` injected for traceability.
 *
 * @throws {ApiError} When the Senado API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const senators = await getSenatorsList()
 * senators[0].name      // "Acir Gurgacz"
 * senators[0].party     // "PDT"
 * senators[0].uf        // "RO"
 * senators._source      // "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/lista/atual
 */
export async function getSenatorsList(): Promise<WithSource<Senator[]>> {
  const url = ENDPOINTS.SENADO_SENATORS

  const response = await cachedFetch<SenadoSenatorsListRaw>(
    url,
    TTL.SENADO_SENATORS_LIST,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar,
  )
  const senators: Senator[] = rawList.map(mapRawToSenator)

  return Object.assign(senators, { _source: response._source })
}

/**
 * Fetches the detailed profile of a single senator by their Senado API ID.
 *
 * The detail endpoint returns biographical data (civil name, birth place,
 * sex), current term metadata (legislature, party, UF, situation), office
 * contact info, and a personal website URL when published.
 *
 * @param id - The senator's `CodigoParlamentar` in the Senado API
 *             (e.g. `"5672"`). Stable across mandates for the same person.
 *
 * @returns Detailed senator profile with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status (e.g. 404 for
 *         an invalid or non-existent senator ID).
 *
 * @example
 * ```typescript
 * const senator = await getSenatorDetail("5672")
 * senator.fullName      // "RODRIGO DE SOUZA TAVARES"
 * senator.birthPlace    // "Belo Horizonte, MG"
 * senator._source       // "https://legis.senado.leg.br/dadosabertos/senador/5672.json"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}
 */
export async function getSenatorDetail(
  id: string,
): Promise<WithSource<SenatorDetail>> {
  const url = ENDPOINTS.SENADO_SENATOR(id)

  const response = await cachedFetch<SenadoSenatorDetailRaw>(
    url,
    TTL.SENADO_SENATOR_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const detail = mapRawToSenatorDetail(response)

  return { ...detail, _source: response._source }
}

/**
 * Fetches the full mandate (term) history of a senator.
 *
 * Each entry represents one Senate term — typically 8 years spanning two
 * legislatures. A senator may have multiple mandates across their career,
 * each tagged with a UF and a participation type ("Titular", "Suplente").
 *
 * Single-mandate senators receive an object instead of an array from the
 * raw API; {@link ensureArray} normalizes both shapes.
 *
 * @param id - The senator's `CodigoParlamentar` in the Senado API.
 * @returns Array of mandates with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const mandates = await getSenatorMandates("5672")
 * mandates[0].uf            // "MG"
 * mandates[0].startYear     // 2023
 * mandates[0].participation // "Titular"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/mandatos
 */
export async function getSenatorMandates(
  id: string,
): Promise<WithSource<SenatorMandate[]>> {
  const url = ENDPOINTS.SENADO_SENATOR_MANDATES(id)

  const response = await cachedFetch<SenadoMandatesRaw>(
    url,
    TTL.SENADO_SENATOR_MANDATES,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.MandatoParlamentar?.Parlamentar?.Mandatos?.Mandato,
  )
  const mandates = rawList.map(mapRawToMandate)

  return Object.assign(mandates, { _source: response._source })
}

/**
 * Fetches the party-affiliation history of a senator.
 *
 * Captures party-switch events with start and end dates. The current
 * affiliation has no `endDate`. Single-affiliation senators (most newly
 * elected) receive an object instead of an array from the raw API;
 * {@link ensureArray} normalizes both shapes.
 *
 * @param id - The senator's `CodigoParlamentar` in the Senado API.
 * @returns Array of party affiliations with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const affiliations = await getSenatorAffiliations("5672")
 * affiliations[0].party     // "PSD"
 * affiliations[0].startDate // "2018-04-05"
 * affiliations[0].endDate   // undefined  (current affiliation)
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/filiacoes
 */
export async function getSenatorAffiliations(
  id: string,
): Promise<WithSource<SenatorAffiliation[]>> {
  const url = ENDPOINTS.SENADO_SENATOR_AFFILIATIONS(id)

  const response = await cachedFetch<SenadoAffiliationsRaw>(
    url,
    TTL.SENADO_SENATOR_AFFILIATIONS,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.FiliacaoParlamentar?.Parlamentar?.Filiacoes?.Filiacao,
  )
  const affiliations = rawList.map(mapRawToAffiliation)

  return Object.assign(affiliations, { _source: response._source })
}

// ── Voting history (modern flat-array endpoint) ─────────────────────

/**
 * Raw voting record from `GET /votacao?codigoParlamentar={id}`.
 *
 * The modern voting endpoint returns a top-level array. Field names follow
 * the lowercase camelCase convention of the post-2024 Senado APIs.
 */
interface SenadoVotingRecordRaw {
  codigoSessaoVotacao?: string | number
  dataSessao?: string
  descricaoVotacao?: string
  /** "APROVADA" | "REJEITADA" | "PREJUDICADA" | etc. */
  siglaResultado?: string
  /** Per-senator vote ("Sim", "Não", "Abstenção", "Não votou", "P-NRV", etc.). */
  voto?: string
  /** Affected matter — sometimes flat, sometimes nested under `materia`. */
  identificacaoMateria?: string
  codigoMateriaPrincipal?: string | number
  materia?: {
    idProcesso?: string | number
    identificacao?: string
  }
}

/** Coerces an "APROVADA"/"REJEITADA" result code to a tri-state boolean. */
function resolveApproved(result: string | undefined): boolean | null {
  if (!result) return null
  const upper = result.trim().toUpperCase()
  if (upper.startsWith("APROV")) return true
  if (upper.startsWith("REJEIT")) return false
  return null
}

function mapRawToVotingRecord(raw: SenadoVotingRecordRaw): SenatorVotingRecord {
  const matterId = raw.materia?.idProcesso ?? raw.codigoMateriaPrincipal
  const matterIdentifier = raw.materia?.identificacao ?? raw.identificacaoMateria
  return {
    sessionId: String(raw.codigoSessaoVotacao ?? ""),
    date: raw.dataSessao ?? "",
    description: raw.descricaoVotacao ?? matterIdentifier ?? "",
    approved: resolveApproved(raw.siglaResultado),
    vote: raw.voto ?? "",
    matterIdentifier: nonEmpty(matterIdentifier),
    matterId: matterId != null ? String(matterId) : undefined,
  }
}

/**
 * Fetches a senator's recorded votes for a given calendar year.
 *
 * Uses the modern `/votacao` endpoint (the legacy `/senador/{id}/votacoes.json`
 * was sunset 2026-02-01). Date range is constructed as `{year}0101`–`{year}1231`
 * in YYYYMMDD format. The endpoint returns a top-level flat array.
 *
 * @param id    - The senator's `CodigoParlamentar` in the Senado API.
 * @param year  - Reference year (e.g. 2024).
 * @returns Voting records with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const votes = await getSenatorVotingHistory("5672", 2024)
 * votes[0].vote           // "Sim"
 * votes[0].approved       // true
 * votes._source           // "https://legis.senado.leg.br/dadosabertos/votacao?…"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/votacao
 */
export async function getSenatorVotingHistory(
  id: string,
  year: number,
): Promise<WithSource<SenatorVotingRecord[]>> {
  const dataInicio = `${year}0101`
  const dataFim = `${year}1231`
  const params = new URLSearchParams({
    codigoParlamentar: id,
    dataInicio,
    dataFim,
  })
  const url = `${ENDPOINTS.SENADO_VOTING}?${params.toString()}`

  const ttl =
    year < new Date().getFullYear() ? TTL.SENADO_VOTING_HISTORY : TTL.SENADO_VOTING

  const response = await cachedFetch<SenadoVotingRecordRaw[]>(
    url,
    ttl,
    { headers: SENADO_HEADERS },
    `sen:votes:${id}:${year}`,
  )

  const records = response.map(mapRawToVotingRecord)
  return Object.assign(records, { _source: response._source })
}

// ── Propositions (modern flat-array endpoint) ───────────────────────

/**
 * Raw process entry from `GET /processo?codigoParlamentarAutor={id}`.
 *
 * Field names follow the lowercase camelCase convention of the modern API.
 * Many fields are optional because the search response is a partial view —
 * full detail comes from `GET /processo/{idProcesso}`.
 */
interface SenadoProcessRaw {
  idProcesso?: string | number
  identificacao?: string
  ano?: number | string
  numero?: string | number
  siglaTipo?: string
  ementa?: string
  ementaAtual?: string
  dataApresentacao?: string
  /** Latest status code/description on the legacy and modern shapes. */
  situacaoAtual?: string
  ultimaAtualizacao?: string
  autoria?: {
    autores?: Array<{
      nome?: string
      siglaPartido?: string
      siglaUf?: string
    }>
  }
  /** Themes (assuntos) — a flat array of strings or names. */
  assuntos?: Array<{ assunto?: string }>
}

/** Maps the Senate's free-form `siglaTipo` to the shared `PropositionType` union. */
function normalizePropositionType(raw: string | undefined): PropositionType {
  const code = (raw ?? "").trim().toUpperCase()
  if (code === "PEC") return "PEC"
  if (code === "PLP") return "PLP"
  if (code === "MP" || code === "MPV") return "MP"
  if (code === "PDL" || code === "PDS" || code === "PDC") return "PDL"
  if (code === "PLS") return "PLS"
  if (code === "REQ" || code === "RQS" || code === "RQM") return "REQ"
  // PL is the catch-all for ordinary law bills (PL, PLN, etc.).
  return "PL"
}

/** Folds free-form Senate status text into the constrained UI status union. */
function normalizePropositionStatus(raw: string | undefined): Proposition["status"] {
  const text = (raw ?? "").toLowerCase()
  if (text.includes("aprovad")) return "Aprovada"
  if (text.includes("rejeitad")) return "Rejeitada"
  if (text.includes("arquiv")) return "Arquivada"
  if (text.includes("votaç") || text.includes("votacao")) return "Em votação"
  return "Tramitando"
}

function mapRawToProposition(
  raw: SenadoProcessRaw,
  authorFallback: { name: string; party: string },
): Proposition {
  const id = String(raw.idProcesso ?? "")
  const yearNum =
    typeof raw.ano === "string"
      ? parseInt(raw.ano, 10)
      : raw.ano ?? (raw.dataApresentacao ? parseInt(raw.dataApresentacao.slice(0, 4), 10) : 0)
  const identifier =
    raw.identificacao ??
    `${(raw.siglaTipo ?? "").toUpperCase()} ${raw.numero ?? "?"}/${yearNum || "?"}`
  const summary = raw.ementaAtual ?? raw.ementa ?? ""
  const firstAuthor = raw.autoria?.autores?.[0]
  const theme = nonEmpty(raw.assuntos?.[0]?.assunto) ?? "—"

  return {
    id,
    identifier: identifier.trim(),
    type: normalizePropositionType(raw.siglaTipo),
    summary,
    author: nonEmpty(firstAuthor?.nome) ?? authorFallback.name,
    authorParty: nonEmpty(firstAuthor?.siglaPartido) ?? authorFallback.party,
    theme,
    status: normalizePropositionStatus(raw.situacaoAtual),
    lastUpdate: raw.ultimaAtualizacao ?? raw.dataApresentacao ?? "",
    presentedDate: nonEmpty(raw.dataApresentacao),
    origin: "Senado",
    year: Number.isFinite(yearNum) ? yearNum : undefined,
  }
}

/**
 * Fetches all propositions authored by a senator (optionally filtered by year).
 *
 * Uses the modern `/processo` endpoint with `codigoParlamentarAutor`. The
 * legacy `/senador/{id}/autorias.json` was sunset 2026-02-01.
 *
 * Authorship metadata in the response may be absent on co-authored bills,
 * so callers must pass an `authorFallback` (name + party) to fill the
 * `author` / `authorParty` fields when missing.
 *
 * @param id              - The senator's `CodigoParlamentar`.
 * @param authorFallback  - Senator name + party used when author info is missing.
 * @param year            - Optional year filter. Falsy = full history.
 * @returns Propositions array with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo
 */
export async function getSenatorPropositions(
  id: string,
  authorFallback: { name: string; party: string },
  year?: number,
): Promise<WithSource<Proposition[]>> {
  const params = new URLSearchParams({ codigoParlamentarAutor: id })
  if (year) params.set("ano", String(year))
  const url = `${ENDPOINTS.SENADO_PROCESS_SEARCH}?${params.toString()}`

  const ttl =
    year != null && year < new Date().getFullYear()
      ? TTL.SENADO_PROCESS_AUTHORS
      : TTL.SENADO_PROCESS_SEARCH

  const response = await cachedFetch<SenadoProcessRaw[]>(
    url,
    ttl,
    { headers: SENADO_HEADERS },
  )

  const propositions = response.map((raw) => mapRawToProposition(raw, authorFallback))
  return Object.assign(propositions, { _source: response._source })
}

// ── Propositions search (general) and detail ────────────────────────

/**
 * Fetches Senate propositions matching a free-form query.
 *
 * Backed by the modern `/processo` endpoint, which accepts `ano`, `sigla`
 * (proposition type), and `termo` (free-text search). The `limit` is applied
 * client-side after the response since the upstream API has no row-cap query
 * param.
 *
 * The author fallback is intentionally generic ("—" / "—") because this
 * fetcher is not scoped to a single senator: when authorship metadata is
 * missing on a bill we surface the gap instead of pretending there is one
 * known author.
 *
 * @param params  - Filter object: `ano`, `sigla`, `termo`, `limit`.
 * @returns Propositions with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const list = await getSenadoPropositions({ ano: 2025 })
 * list.length        // ≈ 800–1500 depending on the year
 * list[0].identifier // "PL 1234/2025"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo
 */
export async function getSenadoPropositions(params: {
  ano?: number
  sigla?: string
  termo?: string
  limit?: number
}): Promise<WithSource<Proposition[]>> {
  const search = new URLSearchParams()
  if (params.ano) search.set("ano", String(params.ano))
  if (params.sigla) search.set("sigla", params.sigla)
  if (params.termo) search.set("termo", params.termo)
  const url = search.toString().length
    ? `${ENDPOINTS.SENADO_PROCESS_SEARCH}?${search.toString()}`
    : ENDPOINTS.SENADO_PROCESS_SEARCH

  const ttl =
    params.ano != null && params.ano < new Date().getFullYear()
      ? TTL.SENADO_PROCESS_AUTHORS
      : TTL.SENADO_PROCESS_SEARCH

  const response = await cachedFetch<SenadoProcessRaw[]>(
    url,
    ttl,
    { headers: SENADO_HEADERS },
  )

  const fallback = { name: "—", party: "—" }
  const mapped = response.map((raw) => mapRawToProposition(raw, fallback))
  const propositions = params.limit ? mapped.slice(0, params.limit) : mapped

  return Object.assign(propositions, { _source: response._source })
}

/**
 * Raw process-detail response from `GET /processo/{idProcesso}`.
 *
 * Extends the search shape with the additional fields the detail endpoint
 * publishes: full descriptive text, the local of the matter, urgency regime,
 * and (sometimes) a flat tramitacao timeline.
 */
interface SenadoProcessDetailRaw extends SenadoProcessRaw {
  /** Long-form descriptive text when present. */
  descricao?: string
  /** Origin chamber: "SF" (Senate) or "CD" (Câmara). */
  casaIniciadora?: string
  /** Sequential location code; we keep only the human label. */
  localAtual?: { nome?: string }
  /** Processing regime (e.g. "Urgência", "Ordinária"). */
  regime?: string
  /** Optional tramitação array. */
  tramitacao?: Array<{
    data?: string
    descricao?: string
    local?: string
    localDescricao?: string
  }>
}

/** Maps the Senate origin code to the shared `Proposition.origin` union. */
function mapOriginCode(code: string | undefined): "Senado" | "Câmara" | undefined {
  if (!code) return undefined
  const upper = code.trim().toUpperCase()
  if (upper === "SF" || upper === "SENADO") return "Senado"
  if (upper === "CD" || upper === "CAMARA" || upper === "CÂMARA") return "Câmara"
  return undefined
}

/**
 * Fetches the full detail of a single Senate proposition.
 *
 * Combines the base `Proposition` mapper with detail-only fields (full
 * description, urgency, current location, timeline). Sub-resources
 * (rapporteurship, documents, amendments) are intentionally fetched
 * separately so callers can parallelize.
 *
 * @param idProcesso - The Senado `idProcesso` value.
 * @returns Proposition with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo/{idProcesso}
 */
export async function getSenadoPropositionDetail(
  idProcesso: string,
): Promise<WithSource<Proposition>> {
  const url = ENDPOINTS.SENADO_PROCESS(idProcesso)

  const response = await cachedFetch<SenadoProcessDetailRaw>(
    url,
    TTL.SENADO_PROCESS_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const fallback = { name: "—", party: "—" }
  const base = mapRawToProposition(response, fallback)

  const timeline = (response.tramitacao ?? [])
    .filter((t) => t.data && t.descricao)
    .map((t) => ({
      date: t.data ?? "",
      description: t.descricao ?? "",
      location: t.localDescricao ?? t.local ?? undefined,
    }))

  const detail: Proposition = {
    ...base,
    fullDescription: response.descricao ?? base.summary,
    origin: mapOriginCode(response.casaIniciadora) ?? base.origin,
    currentLocation: response.localAtual?.nome ?? base.currentLocation,
    urgency: response.regime ?? base.urgency,
    timeline: timeline.length > 0 ? timeline : undefined,
  }

  return { ...detail, _source: response._source }
}

// ── Rapporteurship, documents, amendments ───────────────────────────

interface SenadoRapporteurshipRaw {
  parlamentar?: {
    nome?: string
    codigoParlamentar?: string | number
    siglaPartido?: string
    siglaUf?: string
  }
  comissao?: {
    sigla?: string
    nome?: string
  }
  /** Outer fallback fields when the upstream flattens the parlamentar entry. */
  nomeRelator?: string
  codigoParlamentar?: string | number
  siglaPartidoRelator?: string
  siglaUfRelator?: string
  siglaComissao?: string
  nomeComissao?: string
  /** Role text e.g. "Relator", "Relator Revisor", "Substituto". */
  descricaoTipoRelator?: string
  tipoRelator?: string
  dataDesignacao?: string
  dataDestituicao?: string
}

function mapRawToRapporteurship(
  raw: SenadoRapporteurshipRaw,
): RapporteurshipRecord {
  const parl = raw.parlamentar
  const id = parl?.codigoParlamentar ?? raw.codigoParlamentar
  return {
    rapporteur: nonEmpty(parl?.nome ?? raw.nomeRelator) ?? "—",
    rapporteurId: id != null ? String(id) : undefined,
    rapporteurParty: nonEmpty(parl?.siglaPartido ?? raw.siglaPartidoRelator),
    rapporteurUf: nonEmpty(parl?.siglaUf ?? raw.siglaUfRelator),
    committeeAbbreviation: nonEmpty(raw.comissao?.sigla ?? raw.siglaComissao) ?? "—",
    committeeName: nonEmpty(raw.comissao?.nome ?? raw.nomeComissao) ?? "",
    role: nonEmpty(raw.descricaoTipoRelator ?? raw.tipoRelator) ?? "Relator",
    startDate: nonEmpty(raw.dataDesignacao),
    endDate: nonEmpty(raw.dataDestituicao),
  }
}

/**
 * Fetches the rapporteurship history of a Senate proposition.
 *
 * @param idProcesso - The Senado `idProcesso`.
 * @returns Rapporteurship records with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo/relatoria
 */
export async function getSenadoPropositionRapporteurship(
  idProcesso: string,
): Promise<WithSource<RapporteurshipRecord[]>> {
  const url = `${ENDPOINTS.SENADO_PROCESS_RAPPORTEURSHIP}?idProcesso=${encodeURIComponent(idProcesso)}`

  const response = await cachedFetch<SenadoRapporteurshipRaw[]>(
    url,
    TTL.SENADO_PROCESS_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const records = response.map(mapRawToRapporteurship)
  return Object.assign(records, { _source: response._source })
}

interface SenadoDocumentRaw {
  idDocumento?: string | number
  descricaoTipoDocumento?: string
  tipoDocumento?: string
  descricao?: string
  dataDocumento?: string
  autoria?: string
  url?: string
  urlDocumento?: string
}

function mapRawToDocument(raw: SenadoDocumentRaw): PropositionDocument {
  return {
    id: String(raw.idDocumento ?? ""),
    type: nonEmpty(raw.descricaoTipoDocumento ?? raw.tipoDocumento) ?? "Documento",
    title: nonEmpty(raw.descricao),
    date: nonEmpty(raw.dataDocumento),
    author: nonEmpty(raw.autoria),
    url: nonEmpty(raw.url ?? raw.urlDocumento),
  }
}

/**
 * Fetches the documents attached to a Senate proposition.
 *
 * @param idProcesso - The Senado `idProcesso`.
 * @returns Documents with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo/documento
 */
export async function getSenadoPropositionDocuments(
  idProcesso: string,
): Promise<WithSource<PropositionDocument[]>> {
  const url = `${ENDPOINTS.SENADO_PROCESS_DOCUMENTS}?idProcesso=${encodeURIComponent(idProcesso)}`

  const response = await cachedFetch<SenadoDocumentRaw[]>(
    url,
    TTL.SENADO_PROCESS_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const documents = response.map(mapRawToDocument)
  return Object.assign(documents, { _source: response._source })
}

interface SenadoAmendmentRaw {
  idEmenda?: string | number
  identificacao?: string
  numero?: string | number
  descricao?: string
  ementa?: string
  dataEmenda?: string
  dataApresentacao?: string
  autoria?: string
  autorPrincipal?: { nome?: string; siglaPartido?: string }
  url?: string
  urlTexto?: string
}

function mapRawToAmendment(raw: SenadoAmendmentRaw): PropositionAmendment {
  const identifier = raw.identificacao ?? (raw.numero != null ? `Emenda ${raw.numero}` : "")
  return {
    id: String(raw.idEmenda ?? ""),
    identifier: identifier.trim() || "Emenda",
    date: nonEmpty(raw.dataEmenda ?? raw.dataApresentacao),
    author: nonEmpty(raw.autoria ?? raw.autorPrincipal?.nome),
    authorParty: nonEmpty(raw.autorPrincipal?.siglaPartido),
    description: nonEmpty(raw.descricao ?? raw.ementa),
    url: nonEmpty(raw.url ?? raw.urlTexto),
  }
}

/**
 * Fetches the formal amendments tabled against a Senate proposition.
 *
 * @param idProcesso - The Senado `idProcesso`.
 * @returns Amendments with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/processo/emenda
 */
export async function getSenadoPropositionAmendments(
  idProcesso: string,
): Promise<WithSource<PropositionAmendment[]>> {
  const url = `${ENDPOINTS.SENADO_PROCESS_AMENDMENTS}?idProcesso=${encodeURIComponent(idProcesso)}`

  const response = await cachedFetch<SenadoAmendmentRaw[]>(
    url,
    TTL.SENADO_PROCESS_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const amendments = response.map(mapRawToAmendment)
  return Object.assign(amendments, { _source: response._source })
}

// ── Voting sessions (aggregated from /votacao) ──────────────────────

/**
 * Coerces a single per-senator vote text into the constrained UI vote union.
 * Unknown values fall back to "Ausente" so they do not silently inflate the
 * present-count.
 */
function normalizeVoteCast(raw: string | undefined): PropositionVote["vote"] {
  const upper = (raw ?? "").trim().toUpperCase()
  if (upper === "SIM" || upper === "S") return "Sim"
  if (upper === "NÃO" || upper === "NAO" || upper === "N") return "Não"
  if (upper.startsWith("ABST")) return "Abstenção"
  return "Ausente"
}

/**
 * Aggregates a flat array of per-senator vote rows into a session-keyed map.
 *
 * The Senado `/votacao` endpoint emits one row per (session, senator). To
 * surface a session listing or a session-detail view we fold those rows by
 * `codigoSessaoVotacao` and synthesize the tally + vote breakdown.
 */
function aggregateVotingRows(
  rows: SenadoVotingRecordRaw[],
  options: { withVotes: boolean },
): SenadoVotingSession[] {
  const bySession = new Map<string, SenadoVotingSession>()
  const tallyBySession = new Map<string, VoteTally>()
  const votesBySession = new Map<string, PropositionVote[]>()

  for (const row of rows) {
    const sessionId = String(row.codigoSessaoVotacao ?? "")
    if (!sessionId) continue

    const matterId =
      row.materia?.idProcesso != null
        ? String(row.materia.idProcesso)
        : row.codigoMateriaPrincipal != null
          ? String(row.codigoMateriaPrincipal)
          : undefined
    const matterIdentifier = nonEmpty(
      row.materia?.identificacao ?? row.identificacaoMateria,
    )

    if (!bySession.has(sessionId)) {
      bySession.set(sessionId, {
        id: sessionId,
        date: row.dataSessao ?? "",
        description: row.descricaoVotacao ?? matterIdentifier ?? "",
        approved: resolveApproved(row.siglaResultado),
        matterIdentifier,
        matterId,
      })
      tallyBySession.set(sessionId, { yes: 0, no: 0, abstention: 0, absent: 0 })
      if (options.withVotes) votesBySession.set(sessionId, [])
    }

    const tally = tallyBySession.get(sessionId)!
    const cast = normalizeVoteCast(row.voto)
    if (cast === "Sim") tally.yes += 1
    else if (cast === "Não") tally.no += 1
    else if (cast === "Abstenção") tally.abstention += 1
    else tally.absent += 1

    if (options.withVotes) {
      const senator = (row as SenadoVotingRecordRawWithSenator).parlamentar
      const id = senator?.codigoParlamentar ?? (row as SenadoVotingRecordRawWithSenator).codigoParlamentar
      votesBySession.get(sessionId)!.push({
        parliamentarianId: id != null ? String(id) : "",
        parliamentarianName: nonEmpty(senator?.nome) ?? "",
        party: nonEmpty(senator?.siglaPartido) ?? "",
        uf: nonEmpty(senator?.siglaUf) ?? "",
        vote: cast,
      })
    }
  }

  for (const [id, session] of bySession) {
    session.voteTally = tallyBySession.get(id)
    if (options.withVotes) session.votes = votesBySession.get(id)
  }

  return Array.from(bySession.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  )
}

/**
 * Voting-row shape including the optional inline parlamentar object.
 *
 * The base `SenadoVotingRecordRaw` is intentionally minimal because the
 * voting-history fetcher does not need senator metadata (it filters by
 * `codigoParlamentar` and the senator is the caller). The session-detail
 * fetcher does need it, so this widened shape is used inside the aggregator.
 */
interface SenadoVotingRecordRawWithSenator extends SenadoVotingRecordRaw {
  parlamentar?: {
    codigoParlamentar?: string | number
    nome?: string
    siglaPartido?: string
    siglaUf?: string
  }
  codigoParlamentar?: string | number
}

/**
 * Fetches Senate voting sessions in a date range.
 *
 * The upstream `/votacao` endpoint emits one row per (session, senator) — a
 * busy week can return tens of thousands of rows. The aggregator folds them
 * by session and emits a tally per session without per-senator detail to
 * keep the listing payload small.
 *
 * Date strings must be `YYYYMMDD`. The result is cached under
 * `sen:votes:sessions:{ini}-{fim}` to avoid the aggregation cost on cache hits.
 *
 * @param dataInicio - Start date as `YYYYMMDD`.
 * @param dataFim    - End date as `YYYYMMDD`.
 * @returns Voting sessions with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/votacao
 */
export async function getSenadoVotingSessions(
  dataInicio: string,
  dataFim: string,
): Promise<WithSource<SenadoVotingSession[]>> {
  const params = new URLSearchParams({ dataInicio, dataFim })
  const url = `${ENDPOINTS.SENADO_VOTING}?${params.toString()}`

  const year = parseInt(dataInicio.slice(0, 4), 10)
  const ttl =
    Number.isFinite(year) && year < new Date().getFullYear()
      ? TTL.SENADO_VOTING_HISTORY
      : TTL.SENADO_VOTING

  const response = await cachedFetch<SenadoVotingRecordRaw[]>(
    url,
    ttl,
    { headers: SENADO_HEADERS },
    `sen:votes:sessions:${dataInicio}-${dataFim}`,
  )

  const sessions = aggregateVotingRows(response, { withVotes: false })
  return Object.assign(sessions, { _source: response._source })
}

/**
 * Fetches a single voting session with its full per-senator vote breakdown.
 *
 * The endpoint returns one row per senator participating in the session;
 * the aggregator collapses them into a single `SenadoVotingSession` with
 * `votes` and `voteTally` populated.
 *
 * @param idSessaoVotacao - The session ID (`codigoSessaoVotacao`).
 * @returns Voting session with `_source` injected.
 *
 * @throws {ApiError} When the session is unknown or the API returns a
 *                    non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/votacao
 */
export async function getSenadoVotingSessionDetail(
  idSessaoVotacao: string,
): Promise<WithSource<SenadoVotingSession>> {
  const params = new URLSearchParams({ codigoSessaoVotacao: idSessaoVotacao })
  const url = `${ENDPOINTS.SENADO_VOTING}?${params.toString()}`

  const response = await cachedFetch<SenadoVotingRecordRaw[]>(
    url,
    TTL.SENADO_VOTING_DETAIL,
    { headers: SENADO_HEADERS },
  )

  const sessions = aggregateVotingRows(response, { withVotes: true })
  const session: SenadoVotingSession =
    sessions[0] ?? {
      id: idSessaoVotacao,
      date: "",
      description: "",
      approved: null,
    }

  return { ...session, _source: response._source }
}

// ── Speeches (legacy nested wrapper) ────────────────────────────────

interface SenadoSpeechRaw {
  CodigoPronunciamento?: string | number
  DataPronunciamento?: string
  TextoResumo?: string
  Resumo?: string
  Indexacao?: string
  TipoUsoDaPalavra?: { Descricao?: string }
  UrlTexto?: string
  UrlTextoBinario?: string
  UrlSessao?: string
  Assunto?: string
}

interface SenadoSpeechesRaw {
  DiscursosParlamentar: {
    Parlamentar?: {
      Pronunciamentos?: {
        Pronunciamento: SenadoSpeechRaw | SenadoSpeechRaw[]
      }
    }
  }
}

function mapRawToSpeech(raw: SenadoSpeechRaw): SenatorSpeech {
  return {
    id: String(raw.CodigoPronunciamento ?? ""),
    date: raw.DataPronunciamento?.slice(0, 10) ?? "",
    type: nonEmpty(raw.TipoUsoDaPalavra?.Descricao) ?? "Pronunciamento",
    summary: nonEmpty(raw.TextoResumo ?? raw.Resumo),
    textUrl: nonEmpty(raw.UrlTexto ?? raw.UrlTextoBinario),
    sessionUrl: nonEmpty(raw.UrlSessao),
    topic: nonEmpty(raw.Assunto ?? raw.Indexacao),
  }
}

/**
 * Fetches a senator's floor speeches for a given calendar year.
 *
 * The Senado API silently defaults to **the last 30 days** when no date
 * range is sent — passing an explicit year-wide window is essential
 * (§7.5 of the implementation guide).
 *
 * @param id    - The senator's `CodigoParlamentar`.
 * @param year  - Reference year. Date range becomes `{year}0101`–`{year}1231`.
 * @returns Speeches with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/discursos
 */
export async function getSenatorSpeeches(
  id: string,
  year: number,
): Promise<WithSource<SenatorSpeech[]>> {
  const dataInicio = `${year}0101`
  const dataFim = `${year}1231`
  const params = new URLSearchParams({ dataInicio, dataFim })
  const url = `${ENDPOINTS.SENADO_SENATOR_SPEECHES(id)}?${params.toString()}`

  const response = await cachedFetch<SenadoSpeechesRaw>(
    url,
    TTL.SENADO_SENATOR_SPEECHES,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.DiscursosParlamentar?.Parlamentar?.Pronunciamentos?.Pronunciamento,
  )
  const speeches = rawList.map(mapRawToSpeech)
  return Object.assign(speeches, { _source: response._source })
}

// ── Committees (legacy nested wrapper) ──────────────────────────────

interface SenadoCommitteeIdentificationRaw {
  CodigoComissao?: string | number
  SiglaComissao?: string
  NomeComissao?: string
  /** "PERMANENTE", "ESPECIAL", "CPI", etc. */
  SiglaSubtipoComissao?: string
  DescricaoSubtipoComissao?: string
}

interface SenadoCommitteeRaw {
  IdentificacaoComissao?: SenadoCommitteeIdentificationRaw
  DescricaoParticipacao?: string
  DataInicio?: string
  DataFim?: string
}

interface SenadoCommitteesRaw {
  MembroComissaoParlamentar: {
    Parlamentar?: {
      MembroComissoes?: {
        Comissao: SenadoCommitteeRaw | SenadoCommitteeRaw[]
      }
    }
  }
}

function readCommitteeType(ident: SenadoCommitteeIdentificationRaw | undefined): string {
  return (
    nonEmpty(ident?.DescricaoSubtipoComissao) ??
    nonEmpty(ident?.SiglaSubtipoComissao) ??
    "Comissão"
  )
}

function mapRawToCommittee(raw: SenadoCommitteeRaw): SenatorCommittee {
  const ident = raw.IdentificacaoComissao
  return {
    id: String(ident?.CodigoComissao ?? ""),
    abbreviation: ident?.SiglaComissao ?? "",
    name: ident?.NomeComissao ?? "",
    type: readCommitteeType(ident),
    role: raw.DescricaoParticipacao ?? "Titular",
    startDate: raw.DataInicio ?? "",
    endDate: nonEmpty(raw.DataFim),
  }
}

/**
 * Fetches a senator's committee memberships (titular + suplente).
 *
 * Single-membership senators receive an object instead of an array;
 * {@link ensureArray} normalizes both shapes.
 *
 * @param id - The senator's `CodigoParlamentar`.
 * @returns Committee memberships with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/comissoes
 */
export async function getSenatorCommittees(
  id: string,
): Promise<WithSource<SenatorCommittee[]>> {
  const url = ENDPOINTS.SENADO_SENATOR_COMMITTEES(id)

  const response = await cachedFetch<SenadoCommitteesRaw>(
    url,
    TTL.SENADO_SENATOR_COMMITTEES,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.MembroComissaoParlamentar?.Parlamentar?.MembroComissoes?.Comissao,
  )
  const committees = rawList.map(mapRawToCommittee)
  return Object.assign(committees, { _source: response._source })
}

// ── Positions / chair roles (legacy nested wrapper) ─────────────────

interface SenadoPositionRaw {
  CodigoCargo?: string | number
  DescricaoCargo?: string
  IdentificacaoComissao?: SenadoCommitteeIdentificationRaw
  DataInicio?: string
  DataFim?: string
}

interface SenadoPositionsRaw {
  CargoParlamentar: {
    Parlamentar?: {
      Cargos?: {
        Cargo: SenadoPositionRaw | SenadoPositionRaw[]
      }
    }
  }
}

function mapRawToPosition(raw: SenadoPositionRaw): SenatorPosition {
  const ident = raw.IdentificacaoComissao
  return {
    id: String(raw.CodigoCargo ?? ""),
    name: raw.DescricaoCargo ?? "",
    committeeAbbreviation: ident?.SiglaComissao ?? "",
    committeeName: ident?.NomeComissao ?? "",
    startDate: raw.DataInicio ?? "",
    endDate: nonEmpty(raw.DataFim),
  }
}

/**
 * Fetches a senator's directing positions on committees (Presidente,
 * Vice-Presidente, etc.).
 *
 * @param id - The senator's `CodigoParlamentar`.
 * @returns Positions with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/cargos
 */
export async function getSenatorPositions(
  id: string,
): Promise<WithSource<SenatorPosition[]>> {
  const url = ENDPOINTS.SENADO_SENATOR_POSITIONS(id)

  const response = await cachedFetch<SenadoPositionsRaw>(
    url,
    TTL.SENADO_SENATOR_POSITIONS,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.CargoParlamentar?.Parlamentar?.Cargos?.Cargo,
  )
  const positions = rawList.map(mapRawToPosition)
  return Object.assign(positions, { _source: response._source })
}

// ── Leadership roles (legacy nested wrapper) ────────────────────────

interface SenadoLeadershipUnitRaw {
  SiglaUnidade?: string
  DescricaoUnidade?: string
  DescricaoTipoUnidadeLideranca?: string
}

interface SenadoLeadershipRaw {
  DescricaoLideranca?: string
  Unidade?: SenadoLeadershipUnitRaw
  /** Some payloads inline the unit fields rather than nesting. */
  SiglaUnidade?: string
  DescricaoUnidade?: string
  DescricaoTipoUnidadeLideranca?: string
  DataInicio?: string
  DataFim?: string
}

interface SenadoLeadershipsRaw {
  LiderancaParlamentar: {
    Parlamentar?: {
      Liderancas?: {
        Lideranca: SenadoLeadershipRaw | SenadoLeadershipRaw[]
      }
    }
  }
}

function mapRawToLeadership(raw: SenadoLeadershipRaw): SenatorLeadership {
  const unitAbbr = raw.Unidade?.SiglaUnidade ?? raw.SiglaUnidade ?? ""
  const unitName = nonEmpty(raw.Unidade?.DescricaoUnidade ?? raw.DescricaoUnidade)
  const unitType = nonEmpty(
    raw.Unidade?.DescricaoTipoUnidadeLideranca ?? raw.DescricaoTipoUnidadeLideranca,
  )
  return {
    role: raw.DescricaoLideranca ?? "Liderança",
    unitAbbreviation: unitAbbr,
    unitName,
    unitType,
    startDate: raw.DataInicio ?? "",
    endDate: nonEmpty(raw.DataFim),
  }
}

/**
 * Fetches a senator's leadership-role history (Líder, Vice-Líder of party,
 * bloc, government, opposition).
 *
 * Senate leadership replaces Câmara's "frentes parlamentares" on the detail
 * page (§7.9 of the implementation guide).
 *
 * @param id - The senator's `CodigoParlamentar`.
 * @returns Leadership roles with `_source` injected.
 *
 * @throws {ApiError} When the API returns a non-2xx status.
 *
 * @see https://legis.senado.leg.br/dadosabertos/senador/{codigo}/liderancas
 */
export async function getSenatorLeaderships(
  id: string,
): Promise<WithSource<SenatorLeadership[]>> {
  const url = ENDPOINTS.SENADO_SENATOR_LEADERSHIPS(id)

  const response = await cachedFetch<SenadoLeadershipsRaw>(
    url,
    TTL.SENADO_SENATOR_LEADERSHIPS,
    { headers: SENADO_HEADERS },
  )

  const rawList = ensureArray(
    response.LiderancaParlamentar?.Parlamentar?.Liderancas?.Lideranca,
  )
  const leaderships = rawList.map(mapRawToLeadership)
  return Object.assign(leaderships, { _source: response._source })
}

// ── CEAPS expenses (admin API — flat-array endpoint) ────────────────

/**
 * Raw CEAPS expense record from
 * `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}`.
 *
 * Field names follow the admin API convention. Many are optional because
 * the response is heterogeneous across years (e.g. older records lack
 * `cnpjCpf`).
 */
interface SenadoCeapsRaw {
  ano?: number | string
  mes?: number | string
  senador?: string
  codSenador?: number | string
  tipoDespesa?: string
  cnpjCpf?: string
  fornecedor?: string
  documento?: string
  dataDocumento?: string
  valorReembolsado?: number | string
  codDocumento?: number | string
  tipoDocumento?: string
  detalhamento?: string
  urlDocumento?: string
}

/** Parses a value that may arrive as either string or number into a finite number. */
function parseNumeric(value: number | string | undefined): number {
  if (value == null) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  // Handles "1.234,56" (Brazilian) and "1234.56" (English) formats.
  const cleaned = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** Normalizes the date field to YYYY-MM-DD. Accepts DD/MM/YYYY and ISO. */
function normalizeDate(value: string | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return trimmed
}

function mapRawToExpense(raw: SenadoCeapsRaw): SenatorExpense {
  const date = normalizeDate(raw.dataDocumento)
  const yearNum = typeof raw.ano === "string" ? parseInt(raw.ano, 10) : raw.ano ?? 0
  const monthNum = typeof raw.mes === "string" ? parseInt(raw.mes, 10) : raw.mes ?? 0
  return {
    date,
    year: Number.isFinite(yearNum) ? Number(yearNum) : 0,
    month: Number.isFinite(monthNum) ? Number(monthNum) : 0,
    senatorId: String(raw.codSenador ?? ""),
    senatorName: (raw.senador ?? "").trim(),
    type: (raw.tipoDespesa ?? "").trim(),
    supplierName: (raw.fornecedor ?? "").trim(),
    supplierDocument: nonEmpty(raw.cnpjCpf),
    document: nonEmpty(raw.documento),
    value: parseNumeric(raw.valorReembolsado),
    documentType: nonEmpty(raw.tipoDocumento),
    documentCode: raw.codDocumento != null ? String(raw.codDocumento) : undefined,
    documentUrl: nonEmpty(raw.urlDocumento),
    details: nonEmpty(raw.detalhamento),
  }
}

/**
 * Internal — fetches the full raw CEAPS feed for a year.
 *
 * The Senado admin API publishes an annual JSON file with every CEAPS
 * receipt (~10–20k records/year). Both {@link getCeapsBulkSummary} and
 * {@link getSenatorExpenses} read from the same cache key so we walk the
 * payload at most once per TTL window.
 *
 * @internal
 */
async function fetchCeapsRaw(year: number): Promise<WithSource<SenatorExpense[]>> {
  const url = ENDPOINTS.SENADO_CEAPS_BY_YEAR(year)
  const ttl =
    year < new Date().getFullYear() ? TTL.SENADO_CEAPS_BULK_HISTORY : TTL.SENADO_CEAPS_BULK

  const response = await cachedFetch<SenadoCeapsRaw[]>(
    url,
    ttl,
    { headers: SENADO_HEADERS },
    `sen:ceaps:raw:${year}`,
  )

  const expenses = response.map(mapRawToExpense)
  return Object.assign(expenses, { _source: response._source })
}

/**
 * Fetches a senator's CEAPS expenses for a given year.
 *
 * Reads from the cached admin-API raw feed (shared with
 * {@link getCeapsBulkSummary}) and filters by `codSenador`. Returns
 * expenses sorted by date ascending so callers can render chronological
 * tables without an extra sort pass.
 *
 * @param id    - The senator's `CodigoParlamentar` (must equal `codSenador`).
 * @param year  - Reference year.
 * @returns Per-senator expense records with `_source` injected.
 *
 * @throws {ApiError} When the bulk file is unavailable.
 *
 * @example
 * ```typescript
 * const expenses = await getSenatorExpenses("5672", 2024)
 * expenses[0].type   // "Passagens aéreas, aquáticas e terrestres nacionais"
 * expenses[0].value  // 8430.5
 * expenses._source   // "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/2024"
 * ```
 *
 * @see https://adm.senado.gov.br/adm-dadosabertos/swagger
 */
export async function getSenatorExpenses(
  id: string,
  year: number,
): Promise<WithSource<SenatorExpense[]>> {
  const all = await fetchCeapsRaw(year)
  const filtered = all
    .filter((e) => e.senatorId === String(id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return Object.assign(filtered, { _source: all._source })
}

/**
 * Fetches the pre-aggregated CEAPS summary for a given year.
 *
 * Aggregates per-senator totals from the cached admin-API raw feed.
 * Used by the senators listing page to enrich each row with a CEAPS
 * column without paying the cost of one fetch per senator.
 *
 * @param year - Reference year.
 * @returns Bulk summary with per-senator totals + expense counts.
 *
 * @throws {ApiError} When the bulk file is unavailable.
 *
 * @example
 * ```typescript
 * const summary = await getCeapsBulkSummary(2024)
 * summary.totalSpending          // 145_823_991.42
 * summary.senators[0].senatorId  // "5672" — the highest spender
 * summary.senators[0].total      // 412_988.10
 * ```
 *
 * @see https://adm.senado.gov.br/adm-dadosabertos/swagger
 */
export async function getCeapsBulkSummary(
  year: number,
): Promise<WithSource<SenatorCeapsBulkSummary>> {
  const all = await fetchCeapsRaw(year)

  // Aggregate only rows attributable to a senator. The bulk feed
  // occasionally publishes orphan rows with empty `codSenador` — we drop
  // them from every aggregate so callers can rely on the invariant
  // `totalSpending === sum(senators[].total)` and
  // `expenseCount === sum(senators[].expenseCount)`.
  const bySenator = new Map<string, SenatorCeapsBulkEntry>()
  let totalSpending = 0
  let expenseCount = 0

  for (const e of all) {
    if (!e.senatorId) continue
    totalSpending += e.value
    expenseCount += 1

    const existing = bySenator.get(e.senatorId)
    if (existing) {
      existing.total += e.value
      existing.expenseCount += 1
    } else {
      bySenator.set(e.senatorId, {
        senatorId: e.senatorId,
        senatorName: e.senatorName,
        total: e.value,
        expenseCount: 1,
      })
    }
  }

  const senators = Array.from(bySenator.values()).sort((a, b) => b.total - a.total)

  const summary: SenatorCeapsBulkSummary = {
    year,
    totalSpending,
    expenseCount,
    senators,
  }

  return { ...summary, _source: all._source }
}

// ── Plenary attendance ───────────────────────────────────────────────

/**
 * Raw shape of a single plenary session inside the monthly-result feed.
 *
 * The Senado nests the present-senators list under `Comparecimento.Parlamentar`
 * (legacy spelling) or `Comparecimento.Senador`. Single-element lists are
 * serialized as objects, so we coerce with {@link ensureArray} on every
 * nested boundary.
 */
interface SenadoPlenarySessionRaw {
  CodigoSessao?: string | number
  CodigoSessaoPlenaria?: string | number
  DataSessao?: string
  HoraSessao?: string
  TipoSessao?: string
  DescricaoTipoSessao?: string
  SiglaTipoSessao?: string
  TipoSiglaSessao?: string
  Comparecimento?: {
    Parlamentar?: SenadoPlenaryAttendeeRaw | SenadoPlenaryAttendeeRaw[]
    Senador?: SenadoPlenaryAttendeeRaw | SenadoPlenaryAttendeeRaw[]
  }
}

interface SenadoPlenaryAttendeeRaw {
  CodigoParlamentar?: string | number
  IdentificacaoParlamentar?: { CodigoParlamentar?: string | number }
}

/**
 * Wrapper variants for `/plenario/resultado/mes/{YYYYMM}`.
 *
 * The Senado has shipped at least three wrapper key spellings over time
 * (`ResultadoSessao`, `ResultadoSessoesMensal`, `ListaSessao`). The mapper
 * walks every known variant and falls back to an empty array when none
 * matches — empty months (recess) are normal.
 */
interface SenadoPlenaryMonthRaw {
  ResultadoSessao?: {
    Sessoes?: { Sessao?: SenadoPlenarySessionRaw | SenadoPlenarySessionRaw[] }
  }
  ResultadoSessoesMensal?: {
    Sessoes?: { Sessao?: SenadoPlenarySessionRaw | SenadoPlenarySessionRaw[] }
  }
  ListaSessao?: {
    Sessoes?: { Sessao?: SenadoPlenarySessionRaw | SenadoPlenarySessionRaw[] }
  }
}

/**
 * Plenary session types that count toward the deliberative attendance metric.
 *
 * Matches the Câmara filter (`Sessão Deliberativa`, `Sessão Preparatória`)
 * — these are the sessions where votes happen and presence is mandatory.
 * Ceremonial and non-deliberative sessions are still listed in `sessions`
 * for completeness but do not feed `attended` / `percentage`.
 */
const DELIBERATIVE_TYPE_PATTERNS = ["DELIBERATIVA", "PREPARATORIA", "PREPARATÓRIA"] as const

function isDeliberativeType(type: string, code?: string): boolean {
  const upper = type.toUpperCase()
  if (DELIBERATIVE_TYPE_PATTERNS.some((pattern) => upper.includes(pattern))) {
    return !upper.includes("SOLENE")
  }
  if (code) {
    const codeUpper = code.toUpperCase()
    // Common Senado type codes: SDO/SDE = Sessão Deliberativa Ordinária/Extraordinária
    if (codeUpper.startsWith("SD")) return true
    if (codeUpper.startsWith("SP")) return true
  }
  return false
}

function extractAttendeeId(raw: SenadoPlenaryAttendeeRaw): string {
  const direct = raw.CodigoParlamentar
  if (direct != null) return String(direct)
  const nested = raw.IdentificacaoParlamentar?.CodigoParlamentar
  if (nested != null) return String(nested)
  return ""
}

function mapRawToPlenarySession(raw: SenadoPlenarySessionRaw): PlenarySession {
  const id = String(raw.CodigoSessao ?? raw.CodigoSessaoPlenaria ?? "")
  const type = (raw.TipoSessao ?? raw.DescricaoTipoSessao ?? "").trim()
  const typeCode = nonEmpty(raw.SiglaTipoSessao ?? raw.TipoSiglaSessao)
  const date = normalizeDate(raw.DataSessao)
  const attendees = ensureArray(
    raw.Comparecimento?.Parlamentar ?? raw.Comparecimento?.Senador,
  )
  const attendeeIds = attendees
    .map(extractAttendeeId)
    .filter((id) => id.length > 0)
  return {
    id,
    date,
    type,
    typeCode,
    isDeliberative: isDeliberativeType(type, typeCode),
    attendeeIds,
  }
}

function unwrapPlenaryMonth(raw: SenadoPlenaryMonthRaw): SenadoPlenarySessionRaw[] {
  const variant =
    raw.ResultadoSessao ??
    raw.ResultadoSessoesMensal ??
    raw.ListaSessao
  return ensureArray(variant?.Sessoes?.Sessao)
}

/**
 * Fetches every plenary session that took place in a given month.
 *
 * Returns one entry per session with the present-senators block already
 * normalized into a flat `attendeeIds` array. Months with no sessions
 * (e.g. parliamentary recess) return an empty array — this is not an
 * error.
 *
 * @param yyyymm - Year and month concatenated (e.g. `"202408"`).
 * @returns Array of plenary sessions with `_source` injected.
 *
 * @throws {ApiError} When the Senado API returns a non-2xx status.
 *
 * @example
 * ```typescript
 * const sessions = await getPlenaryResultMonth("202408")
 * sessions[0].id              // "1234"
 * sessions[0].attendeeIds     // ["5672", "5321", ...]
 * sessions[0].isDeliberative  // true
 * sessions._source            // ".../plenario/resultado/mes/202408"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/docs/index.html
 */
export async function getPlenaryResultMonth(
  yyyymm: string,
): Promise<WithSource<PlenarySession[]>> {
  const url = ENDPOINTS.SENADO_PLENARY_RESULT_MONTH(yyyymm)
  // First four chars are the year; switch TTL once the year is in the past.
  const year = parseInt(yyyymm.slice(0, 4), 10)
  const ttl =
    Number.isFinite(year) && year < new Date().getFullYear()
      ? TTL.SENADO_PLENARY_RESULT_HISTORY
      : TTL.SENADO_PLENARY_RESULT

  const response = await cachedFetch<SenadoPlenaryMonthRaw>(url, ttl, {
    headers: SENADO_HEADERS,
  })

  const sessions = unwrapPlenaryMonth(response).map(mapRawToPlenarySession)
  return Object.assign(sessions, { _source: response._source })
}

/**
 * Internal — composes a year of attendance from twelve monthly result calls.
 *
 * Has to fire 12 (or up-to-current-month) parallel HTTP requests and walk
 * every session's `Comparecimento` block. The merged summary is cached
 * under `sen:attendance:bulk:{year}` so subsequent reads cost one Redis
 * GET instead of twelve HTTP calls. Individual months remain cached
 * under their own URL keys via {@link getPlenaryResultMonth}, so partial
 * cache misses (e.g. one month evicted) are still cheap.
 *
 * @internal
 */
async function fetchAttendanceBulk(
  year: number,
): Promise<{ summary: SenatorAttendanceBulkSummary; source: string }> {
  const cacheKey = `sen:attendance:bulk:${year}`
  const currentYear = new Date().getFullYear()
  const ttl =
    year < currentYear ? TTL.SENADO_ATTENDANCE_BULK_HISTORY : TTL.SENADO_ATTENDANCE_BULK
  // The bulk has no single endpoint; January is the canonical month used
  // for SourcePill attribution since it always exists for any past year.
  const sourceUrl = ENDPOINTS.SENADO_PLENARY_RESULT_MONTH(`${year}01`)

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as SenatorAttendanceBulkSummary).senators)
        ) {
          return { summary: parsed as SenatorAttendanceBulkSummary, source: sourceUrl }
        }
        await redis.del(cacheKey).catch(() => {})
      }
    } catch {
      await redis.del(cacheKey).catch(() => {})
    }
  }

  // Cap at the current month for the running year so we don't fire 6+ guaranteed
  // 404s in November of `currentYear`.
  const lastMonth =
    year === currentYear ? new Date().getMonth() + 1 : 12

  const monthCalls = Array.from({ length: lastMonth }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0")
    return getPlenaryResultMonth(`${year}${mm}`).catch(() => {
      // Individual month failures degrade gracefully — empty month, not fatal.
      return Object.assign([] as PlenarySession[], { _source: sourceUrl })
    })
  })
  const monthly = await Promise.all(monthCalls)

  // Aggregate across all months. Track:
  //   - total sessions and total deliberative sessions (denominators)
  //   - per-senator attended count (deliberative only)
  //   - per-senator distinct attended dates (any session, for calendar heatmap)
  let totalSessions = 0
  let totalDeliberative = 0
  const attendedBySenator = new Map<string, number>()
  const datesBySenator = new Map<string, Set<string>>()

  for (const month of monthly) {
    for (const session of month) {
      totalSessions += 1
      if (session.isDeliberative) totalDeliberative += 1
      for (const senatorId of session.attendeeIds) {
        if (!senatorId) continue
        if (session.isDeliberative) {
          attendedBySenator.set(senatorId, (attendedBySenator.get(senatorId) ?? 0) + 1)
        }
        if (session.date) {
          const set = datesBySenator.get(senatorId) ?? new Set<string>()
          set.add(session.date)
          datesBySenator.set(senatorId, set)
        }
      }
    }
  }

  const senators: SenatorAttendanceEntry[] = []
  // Iterate union of senators that attended any session OR appeared on any date,
  // so a senator who only attended ceremonial sessions still surfaces with 0 / 0.
  const allSenatorIds = new Set<string>([
    ...attendedBySenator.keys(),
    ...datesBySenator.keys(),
  ])
  for (const senatorId of allSenatorIds) {
    const attended = attendedBySenator.get(senatorId) ?? 0
    const missed = Math.max(0, totalDeliberative - attended)
    const percentage =
      totalDeliberative === 0
        ? 0
        : Math.round((attended / totalDeliberative) * 10000) / 100
    senators.push({
      senatorId,
      attended,
      missed,
      percentage,
      attendedDates: Array.from(datesBySenator.get(senatorId) ?? []).sort(),
    })
  }

  // Sort by attendance percentage desc so listing/enrichment consumers get a
  // ranked view by default.
  senators.sort((a, b) => b.percentage - a.percentage)

  const summary: SenatorAttendanceBulkSummary = {
    year,
    totalSessions,
    totalDeliberative,
    senators,
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(summary), { ex: ttl })
    } catch {
      // Cache write failure is non-fatal.
    }
  }

  return { summary, source: sourceUrl }
}

/**
 * Fetches the pre-aggregated plenary attendance summary for a given year.
 *
 * Composes twelve `/plenario/resultado/mes/{YYYYMM}` calls (or fewer for
 * the running year) and aggregates per-senator counts. The merged result
 * is cached under a stable Redis key (`sen:attendance:bulk:{year}`) so
 * subsequent requests pay one Redis GET instead of twelve HTTP round-trips.
 *
 * @param year - Reference year.
 * @returns Bulk summary with per-senator attendance entries.
 *
 * @example
 * ```typescript
 * const bulk = await getSenatorAttendanceBulk(2024)
 * bulk.totalDeliberative          // 187
 * bulk.senators[0].percentage     // 99.47 — the most-present senator
 * bulk._source                    // ".../plenario/resultado/mes/202401"
 * ```
 *
 * @see https://legis.senado.leg.br/dadosabertos/docs/index.html
 */
export async function getSenatorAttendanceBulk(
  year: number,
): Promise<WithSource<SenatorAttendanceBulkSummary>> {
  const { summary, source } = await fetchAttendanceBulk(year)
  return { ...summary, _source: source }
}

/**
 * Fetches the per-session attendance detail for a single senator.
 *
 * Walks every plenary session in the year (via the cached monthly results)
 * and emits one row per session indicating whether the senator was present.
 * No additional HTTP call beyond what {@link getPlenaryResultMonth} caches.
 *
 * @param senatorId - The senator's `CodigoParlamentar`.
 * @param year      - Reference year.
 * @returns Per-session attendance detail with `_source` injected.
 *
 * @example
 * ```typescript
 * const detail = await getSenatorAttendanceDetail("5672", 2024)
 * detail.totalDeliberative       // 187
 * detail.attended                // 172
 * detail.percentage              // 91.98
 * detail.sessions[0].attended    // false
 * ```
 */
export async function getSenatorAttendanceDetail(
  senatorId: string,
  year: number,
): Promise<WithSource<SenatorAttendanceDetail>> {
  const currentYear = new Date().getFullYear()
  const lastMonth =
    year === currentYear ? new Date().getMonth() + 1 : 12
  const sourceUrl = ENDPOINTS.SENADO_PLENARY_RESULT_MONTH(`${year}01`)

  const monthCalls = Array.from({ length: lastMonth }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0")
    return getPlenaryResultMonth(`${year}${mm}`).catch(() =>
      Object.assign([] as PlenarySession[], { _source: sourceUrl }),
    )
  })
  const monthly = await Promise.all(monthCalls)

  const target = String(senatorId)
  const sessions: SenatorAttendanceDay[] = []
  let totalDeliberative = 0
  let attended = 0

  for (const month of monthly) {
    for (const session of month) {
      const isAttended = session.attendeeIds.includes(target)
      if (session.isDeliberative) {
        totalDeliberative += 1
        if (isAttended) attended += 1
      }
      sessions.push({
        sessionId: session.id,
        date: session.date,
        type: session.type,
        isDeliberative: session.isDeliberative,
        attended: isAttended,
      })
    }
  }

  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const missed = Math.max(0, totalDeliberative - attended)
  const percentage =
    totalDeliberative === 0
      ? 0
      : Math.round((attended / totalDeliberative) * 10000) / 100

  const detail: SenatorAttendanceDetail = {
    senatorId: target,
    year,
    sessions,
    totalDeliberative,
    attended,
    missed,
    percentage,
  }

  return { ...detail, _source: sourceUrl }
}

// ── Institutional spending — Contracts (Phase 8) ─────────────────────

/**
 * Raw contract record from `/api/v1/contratacoes/contratos`.
 *
 * The endpoint returns a flat array (no envelope). Contract values are NOT
 * present on this record — they require walking to the per-contract payments
 * endpoint. The mapper preserves only the fields that the listing UI needs.
 */
interface SenadoContractRaw {
  id: number
  numero: string
  objeto: string
  numero_formatado: string
  licitacao: { numero: string | null; modalidade: string | null } | null
  empresa: { nome: string; cpf_cnpj: string } | null
  data_assinatura: string | null
  data_publicacao: string | null
  data_inicio_vigencia: string | null
  data_fim_vigencia: string | null
  fundamentacao_legal: string | null
  ind_mao_de_obra: boolean
  data_ultima_atualizacao: string | null
  sub_especie: { sigla: string; nome: string } | null
  unidade_gestora: { sigla: string; nome: string } | null
}

interface SenadoBidRaw {
  id: number
  numero: string
  objeto: string
  abertura: string | null
  situacao: string | null
  edital: string | null
  modalidade: string | null
  registro_preco: boolean
  orgao_origem: string | null
}

interface SenadoContractorRaw {
  id: number
  nome: string
  cpf_cnpj: string
  contratos?: unknown[] | null
  notas_empenho?: unknown[] | null
}

/**
 * Maps a raw contract record into the public-facing {@link SenadoContract} shape.
 *
 * Empty strings are used (rather than null) for missing date / text fields so
 * the React rendering layer can compare with `||` and skip empty cells without
 * special-casing nulls.
 */
function mapContract(r: SenadoContractRaw): SenadoContract {
  return {
    id: String(r.id),
    number: r.numero ?? "",
    formattedNumber: r.numero_formatado ?? "",
    object: r.objeto ?? "",
    modality: r.licitacao?.modalidade ?? "",
    bidNumber: r.licitacao?.numero ?? "",
    subSpeciesCode: r.sub_especie?.sigla ?? "",
    subSpeciesName: r.sub_especie?.nome ?? "",
    supplierName: r.empresa?.nome ?? "",
    supplierDocument: r.empresa?.cpf_cnpj ?? "",
    signatureDate: r.data_assinatura ?? "",
    publicationDate: r.data_publicacao ?? "",
    startDate: r.data_inicio_vigencia ?? "",
    endDate: r.data_fim_vigencia ?? "",
    lastUpdated: r.data_ultima_atualizacao ?? "",
    legalBasis: r.fundamentacao_legal ?? "",
    isLaborIntensive: r.ind_mao_de_obra === true,
    managingUnit: r.unidade_gestora?.sigla ?? "",
  }
}

/**
 * Fetches the bulk list of all Senate contracts and pre-aggregates summary stats.
 *
 * Calls the institutional contracts endpoint (`/contratacoes/contratos`) and
 * the contracting-companies endpoint in parallel. The response is normalized
 * and pre-aggregated server-side: counts per sub-species, per signature year,
 * per modality, plus a top-contractors table.
 *
 * Cached under a short Redis key (`sen:contracts:summary`) so that repeat page
 * renders perform 1 GET instead of re-fetching ~thousands of rows.
 *
 * **Why no value totals:** the Senate admin API does not include contract
 * values on the contract record — they require a separate per-contract
 * payments call. Listing pages display counts and metadata instead of totals.
 *
 * @returns Aggregated contracts summary with `_source` injected.
 * @throws {ApiError} When the contracts endpoint returns a non-2xx status.
 *
 * @see https://adm.senado.gov.br/adm-dadosabertos/v3/api-docs
 */
export async function getSenadoContractsBulk(): Promise<WithSource<SenadoContractsSummary>> {
  const url = ENDPOINTS.SENADO_CONTRACTS
  const cacheKey = "sen:contracts:summary"

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "object" ? cached : JSON.parse(cached as string)
        if (parsed?.totalContracts !== undefined) {
          return { ...parsed, _source: url } as WithSource<SenadoContractsSummary>
        }
        await redis.del(cacheKey).catch(() => {})
      }
    } catch {
      await redis.del(cacheKey).catch(() => {})
    }
  }

  const [contractsRes, companiesRes] = await Promise.all([
    fetch(url, { headers: SENADO_HEADERS, cache: "no-store" }),
    fetch(ENDPOINTS.SENADO_CONTRACTING_COMPANIES, { headers: SENADO_HEADERS, cache: "no-store" }),
  ])

  if (!contractsRes.ok) throw new ApiError(contractsRes.status, url)

  const rawContracts = (await contractsRes.json()) as SenadoContractRaw[]
  const rawCompanies = companiesRes.ok ? ((await companiesRes.json()) as SenadoContractorRaw[]) : []

  const contracts = rawContracts.map(mapContract)
  const today = new Date().toISOString().slice(0, 10)

  let activeContracts = 0
  const subSpeciesMap = new Map<string, number>()
  const yearMap = new Map<number, number>()
  const modalityMap = new Map<string, number>()

  for (const c of contracts) {
    const isActive =
      c.startDate &&
      c.startDate <= today &&
      (!c.endDate || c.endDate >= today)
    if (isActive) activeContracts += 1

    const sub = c.subSpeciesName || "Não classificado"
    subSpeciesMap.set(sub, (subSpeciesMap.get(sub) ?? 0) + 1)

    if (c.signatureDate) {
      const yr = Number(c.signatureDate.slice(0, 4))
      if (!Number.isNaN(yr)) yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1)
    }

    const mod = c.modality || "Não se aplica"
    modalityMap.set(mod, (modalityMap.get(mod) ?? 0) + 1)
  }

  const topContractors = rawCompanies
    .map((co) => ({
      name: co.nome,
      document: co.cpf_cnpj,
      count: Array.isArray(co.contratos) ? co.contratos.length : 0,
    }))
    .filter((co) => co.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const summary: SenadoContractsSummary = {
    totalContracts: contracts.length,
    activeContracts,
    bySubSpecies: Array.from(subSpeciesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byYear: Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    byModality: Array.from(modalityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    topContractors,
    contracts,
    lastUpdated: new Date().toISOString(),
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(summary), { ex: TTL.SENADO_CONTRACTS })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return Object.assign(summary, { _source: url })
}

/**
 * Fetches the list of all Senate bids (licitações).
 *
 * Returns a normalized array of bid records with status, modality, opening
 * date, and a link to the official notice (edital). No value aggregation —
 * the endpoint does not expose contracted values.
 *
 * @returns Array of bids with `_source` injected.
 * @throws {ApiError} When the API returns a non-2xx status.
 */
export async function getSenadoBids(): Promise<WithSource<SenadoBid[]>> {
  const url = ENDPOINTS.SENADO_BIDS
  const raw = await cachedFetch<SenadoBidRaw[]>(url, TTL.SENADO_BIDS, { headers: SENADO_HEADERS })

  const bids: SenadoBid[] = raw.map((r) => ({
    id: String(r.id),
    number: r.numero ?? "",
    object: r.objeto ?? "",
    openingDate: r.abertura ?? "",
    status: r.situacao ?? "",
    modality: r.modalidade ?? "",
    isPriceRegistration: r.registro_preco === true,
    originatingOrgan: r.orgao_origem ?? "",
    noticeUrl: r.edital ?? "",
  }))

  return Object.assign(bids, { _source: raw._source })
}

/**
 * Fetches the list of all Senate contracting companies.
 *
 * @returns Array of contractors with their contract / order counts.
 * @throws {ApiError} When the API returns a non-2xx status.
 */
export async function getSenadoContractors(): Promise<WithSource<SenadoContractor[]>> {
  const url = ENDPOINTS.SENADO_CONTRACTING_COMPANIES
  const raw = await cachedFetch<SenadoContractorRaw[]>(
    url,
    TTL.SENADO_CONTRACTING_COMPANIES,
    { headers: SENADO_HEADERS },
  )

  const contractors: SenadoContractor[] = raw.map((r) => ({
    id: String(r.id),
    name: r.nome ?? "",
    document: r.cpf_cnpj ?? "",
    contractCount: Array.isArray(r.contratos) ? r.contratos.length : 0,
    orderCount: Array.isArray(r.notas_empenho) ? r.notas_empenho.length : 0,
  }))

  return Object.assign(contractors, { _source: raw._source })
}

// ── Institutional spending — Civil servants (Phase 8) ────────────────

interface SenadoServantRaw {
  sequencial: number
  nome: string
  vinculo: string | null
  situacao: string | null
  cargo: { nome: string } | null
  padrao: string | null
  especialidade: string | null
  funcao: { nome: string } | null
  lotacao: { sigla: string; nome: string } | null
  categoria: { codigo: string; nome: string } | null
  ano_admissao: number | null
}

interface SenadoServantHeadcountRaw {
  classe: string | null
  grupo: string | null
  plano_carreira: string | null
  nivel_escolaridade: string | null
  padrao_nivel_referencia: string | null
  estaveis: number | null
  nao_estaveis: number | null
  subtotal: number | null
  vagos: number | null
  aposentados: number | null
  instituidores_pensao: number | null
  beneficiarios_pensao: number | null
  total_ativo: number | null
  total_inativo: number | null
}

interface SenadoRemunerationRaw {
  sequencial: number
  nome: string
  mes: number
  ano: number
  tipo_folha: string | null
  remuneracao_basica: string | null
  vantagens_pessoais: string | null
  vantagens_indenizatorias: string | null
  funcao_comissionada: string | null
  gratificacao_natalina: string | null
  horas_extras: string | null
  outras_eventuais: string | null
  abono_permanencia: string | null
  reversao_teto_constitucional: string | null
  imposto_renda: string | null
  previdencia: string | null
  auxilios: string | null
  diarias: string | null
  faltas: string | null
  remuneracao_liquida: string | null
}

/**
 * Parses a Senate-style monetary string ("1.234,56" or "-1.234,56") into a number.
 *
 * The Senate admin API serializes monetary fields as PT-BR strings with `.` as
 * the thousands separator and `,` as the decimal separator. Negative values are
 * prefixed with `-`. Empty/missing values map to 0.
 *
 * @param value - PT-BR monetary string (or null/undefined).
 * @returns Numeric value in BRL.
 */
function parsePtBrMoney(value: string | null | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/\./g, "").replace(",", ".")
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Fetches the bulk list of Senate civil servants and the headcount aggregate.
 *
 * Calls `/servidores/servidores` (full personnel list) and
 * `/servidores/quantitativos/pessoal` (career-class headcount aggregate) in
 * parallel. The result is pre-aggregated server-side with counts grouped by
 * bond, status, and category.
 *
 * Cached under `sen:servants:summary` to avoid repeated full-list fetches —
 * the personnel list is several thousand rows.
 *
 * @returns Aggregated servants summary with `_source` injected.
 * @throws {ApiError} When the personnel endpoint returns a non-2xx status.
 */
export async function getSenadoServantsBulk(): Promise<WithSource<SenadoServantsSummary>> {
  const url = ENDPOINTS.SENADO_SERVANTS_BY_OFFICE
  const cacheKey = "sen:servants:summary"

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "object" ? cached : JSON.parse(cached as string)
        if (parsed?.totalActive !== undefined) {
          return { ...parsed, _source: url } as WithSource<SenadoServantsSummary>
        }
        await redis.del(cacheKey).catch(() => {})
      }
    } catch {
      await redis.del(cacheKey).catch(() => {})
    }
  }

  const [servantsRes, headcountRes] = await Promise.all([
    fetch(url, { headers: SENADO_HEADERS, cache: "no-store" }),
    fetch(ENDPOINTS.SENADO_SERVANTS_HEADCOUNT, { headers: SENADO_HEADERS, cache: "no-store" }),
  ])

  if (!servantsRes.ok) throw new ApiError(servantsRes.status, url)

  const rawServants = (await servantsRes.json()) as SenadoServantRaw[]
  const rawHeadcount = headcountRes.ok
    ? ((await headcountRes.json()) as SenadoServantHeadcountRaw[])
    : []

  const members: SenadoServant[] = rawServants.map((r) => ({
    id: String(r.sequencial),
    name: r.nome ?? "",
    bond: r.vinculo ?? "",
    status: r.situacao ?? "",
    position: r.cargo?.nome ?? "",
    level: r.padrao ?? "",
    speciality: r.especialidade ?? "",
    role: r.funcao?.nome ?? "",
    departmentCode: r.lotacao?.sigla ?? "",
    departmentName: r.lotacao?.nome ?? "",
    categoryCode: r.categoria?.codigo ?? "",
    categoryName: r.categoria?.nome ?? "",
    admissionYear: r.ano_admissao ?? 0,
  }))

  const headcount: SenadoServantHeadcountRow[] = rawHeadcount.map((r) => ({
    className: r.classe ?? "",
    groupCode: r.grupo ?? "",
    careerPlan: r.plano_carreira ?? "",
    educationLevel: r.nivel_escolaridade ?? "",
    referenceLevel: r.padrao_nivel_referencia ?? "",
    stable: r.estaveis ?? 0,
    nonStable: r.nao_estaveis ?? 0,
    subtotal: r.subtotal ?? 0,
    vacancies: r.vagos ?? 0,
    retired: r.aposentados ?? 0,
    pensionGrantors: r.instituidores_pensao ?? 0,
    pensionBeneficiaries: r.beneficiarios_pensao ?? 0,
    totalActive: r.total_ativo ?? 0,
    totalInactive: r.total_inativo ?? 0,
  }))

  // Headcount aggregate denormalizes totalActive across rows of the same plan;
  // sum unique (className, careerPlan) pairs to get the chamber-wide totals.
  const seenPlans = new Set<string>()
  let totalActive = 0
  let totalInactive = 0
  let totalVacancies = 0
  for (const row of headcount) {
    const key = `${row.className}|${row.careerPlan}`
    if (seenPlans.has(key)) continue
    seenPlans.add(key)
    totalActive += row.totalActive
    totalInactive += row.retired + row.pensionBeneficiaries
    totalVacancies += row.vacancies
  }

  const bondMap = new Map<string, number>()
  const statusMap = new Map<string, number>()
  const categoryMap = new Map<string, number>()
  for (const m of members) {
    if (m.bond) bondMap.set(m.bond, (bondMap.get(m.bond) ?? 0) + 1)
    if (m.status) statusMap.set(m.status, (statusMap.get(m.status) ?? 0) + 1)
    if (m.categoryName) categoryMap.set(m.categoryName, (categoryMap.get(m.categoryName) ?? 0) + 1)
  }

  const toSorted = (map: Map<string, number>, limit = 30) =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

  const summary: SenadoServantsSummary = {
    totalActive,
    totalInactive,
    totalVacancies,
    byBond: toSorted(bondMap),
    byStatus: toSorted(statusMap),
    byCategory: toSorted(categoryMap),
    headcount,
    members,
    lastUpdated: new Date().toISOString(),
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(summary), { ex: TTL.SENADO_SERVANTS_BULK })
    } catch {
      // Non-fatal
    }
  }

  return Object.assign(summary, { _source: url })
}

/**
 * Fetches a single month of Senate payroll and aggregates it.
 *
 * Returns one row per servant for the requested month/year, plus chamber-wide
 * totals. Used by the institutional servants overview and by the cabinet
 * payroll row on `RealMandateCostCard`. To distinguish commissioned-staff
 * payroll, this fetcher cross-references the bulk servants list (cached) by
 * `sequencial` to attach each row's `bond` value.
 *
 * Monetary fields arrive as PT-BR strings ("1.234,56") and are parsed via
 * {@link parsePtBrMoney}.
 *
 * @param year  - Reference year (e.g. 2025).
 * @param month - Reference month (1–12).
 * @returns Pre-aggregated remuneration summary with `_source` injected.
 * @throws {ApiError} When the remuneration endpoint returns a non-2xx status.
 */
export async function getSenadoServantsRemuneration(
  year: number,
  month: number,
): Promise<WithSource<SenadoRemunerationSummary>> {
  const url = ENDPOINTS.SENADO_SERVANTS_REMUNERATION(year, month)
  const cacheKey = `sen:remuneration:${year}:${month}`

  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "object" ? cached : JSON.parse(cached as string)
        if (parsed?.totalNetPay !== undefined) {
          return { ...parsed, _source: url } as WithSource<SenadoRemunerationSummary>
        }
        await redis.del(cacheKey).catch(() => {})
      }
    } catch {
      await redis.del(cacheKey).catch(() => {})
    }
  }

  const res = await fetch(url, { headers: SENADO_HEADERS, cache: "no-store" })
  if (!res.ok) throw new ApiError(res.status, url)

  const raw = (await res.json()) as SenadoRemunerationRaw[]

  // Build a sequencial → bond map from the cached bulk servants list, so we
  // can sum commissioned payroll without paying a second remote round-trip.
  let bondById = new Map<string, string>()
  try {
    const bulk = await getSenadoServantsBulk()
    bondById = new Map(bulk.members.map((m) => [m.id, m.bond]))
  } catch {
    // If the bulk lookup fails, commissioned-pay total degrades gracefully to 0.
  }

  let totalNetPay = 0
  let totalBaseSalary = 0
  let totalCommissionedPay = 0
  const rows: SenadoServantRemuneration[] = raw.map((r) => {
    const baseSalary = parsePtBrMoney(r.remuneracao_basica)
    const netPay = parsePtBrMoney(r.remuneracao_liquida)
    totalNetPay += netPay
    totalBaseSalary += baseSalary
    if (bondById.get(String(r.sequencial)) === "COMISSIONADO") {
      totalCommissionedPay += netPay
    }
    return {
      id: String(r.sequencial),
      name: r.nome ?? "",
      month: r.mes,
      year: r.ano,
      payrollType: r.tipo_folha ?? "",
      baseSalary,
      personalAllowances: parsePtBrMoney(r.vantagens_pessoais),
      indemnificationAllowances: parsePtBrMoney(r.vantagens_indenizatorias),
      functionGratification: parsePtBrMoney(r.funcao_comissionada),
      christmasBonus: parsePtBrMoney(r.gratificacao_natalina),
      overtime: parsePtBrMoney(r.horas_extras),
      otherIncome: parsePtBrMoney(r.outras_eventuais),
      permanenceBonus: parsePtBrMoney(r.abono_permanencia),
      ceilingReversal: parsePtBrMoney(r.reversao_teto_constitucional),
      incomeTaxWithheld: parsePtBrMoney(r.imposto_renda),
      socialSecurityWithheld: parsePtBrMoney(r.previdencia),
      aids: parsePtBrMoney(r.auxilios),
      perDiem: parsePtBrMoney(r.diarias),
      absences: parsePtBrMoney(r.faltas),
      netPay,
    }
  })

  const summary: SenadoRemunerationSummary = {
    year,
    month,
    totalNetPay,
    totalBaseSalary,
    totalCommissionedPay,
    paidHeadcount: rows.length,
    rows,
    lastUpdated: new Date().toISOString(),
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(summary), {
        ex: TTL.SENADO_SERVANTS_REMUNERATION,
      })
    } catch {
      // Non-fatal
    }
  }

  return Object.assign(summary, { _source: url })
}
