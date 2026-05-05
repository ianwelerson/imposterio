/**
 * @file proposition.ts
 * @description Shared types for legislative propositions (bills, amendments, etc.).
 *
 * Used by both the Câmara dos Deputados and Senado Federal agenda pages
 * to represent bills, their status, and vote breakdowns.
 *
 * Brazilian legislative proposition types:
 * - PL  (Projeto de Lei) — ordinary law bill
 * - PEC (Proposta de Emenda à Constituição) — constitutional amendment
 * - PLP (Projeto de Lei Complementar) — complementary law bill
 * - MP  (Medida Provisória) — provisional measure (executive decree with force of law)
 * - PDL (Projeto de Decreto Legislativo) — legislative decree
 * - PLS (Projeto de Lei do Senado) — Senate bill (pre-2019 numbering)
 * - REQ (Requerimento) — formal request
 */

/** Bill status as displayed in the UI (Portuguese). */
export type PropositionStatus =
  | "Em votação"
  | "Aprovada"
  | "Rejeitada"
  | "Tramitando"
  | "Arquivada"

/** Standard Brazilian legislative proposition type abbreviations. */
export type PropositionType = "PL" | "PEC" | "PLP" | "MP" | "PDL" | "PLS" | "REQ"

/** A single vote cast by a parliamentarian on a proposition. */
export interface PropositionVote {
  parliamentarianId: string
  parliamentarianName: string
  party: string
  uf: string
  vote: "Sim" | "Não" | "Abstenção" | "Ausente"
}

/** Aggregated vote tally for a proposition. */
export interface VoteTally {
  yes: number
  no: number
  abstention: number
  absent: number
}

/** A timeline event in the proposition's legislative history. */
export interface PropositionTimelineEvent {
  /** ISO date of the event. */
  date: string
  /** Short description of what happened. */
  description: string
  /** Where the event occurred (e.g. "Plenário", "CCJ", "CAE"). */
  location?: string
}

/** A committee assignment for a proposition. */
export interface PropositionCommittee {
  /** Committee abbreviation (e.g. "CCJ", "CAE", "CCJC"). */
  abbreviation: string
  /** Full committee name. */
  name: string
  /** Role in the proposition's analysis. */
  role: "Mérito" | "Opinião" | "Relatoria"
  /** Rapporteur assigned by this committee. */
  rapporteur?: string
  /** Party of the rapporteur. */
  rapporteurParty?: string
}

/** A related proposition referenced by this one. */
export interface RelatedProposition {
  id: string
  identifier: string
  type: PropositionType
  /** Brief reason for the relation (e.g. "Apensada", "Substitutivo"). */
  relation: string
}

/** A legislative proposition (bill/matter) for agenda pages. */
export interface Proposition {
  id: string
  /** Full identifier, e.g. "PL 1234/2025". */
  identifier: string
  type: PropositionType
  /** Short title or ementa (summary of the bill's purpose). */
  summary: string
  /** Author name. */
  author: string
  /** Author's party abbreviation. */
  authorParty: string
  /** Topic/theme (e.g. "Economia", "Saúde", "Educação"). */
  theme: string
  status: PropositionStatus
  /** ISO date of last status update. */
  lastUpdate: string
  /** Vote breakdown — only present for bills that have been voted. */
  voteTally?: VoteTally
  /** Individual votes — only present for bills that have been voted. */
  votes?: PropositionVote[]

  /* ── Extended fields for detail pages ── */

  /** Full text description of the bill (beyond the short ementa). */
  fullDescription?: string
  /** ISO date when the bill was originally presented. */
  presentedDate?: string
  /** Chamber of origin: "Câmara" or "Senado". */
  origin?: "Câmara" | "Senado"
  /** Current location in the legislative process (e.g. "Plenário", "CCJ"). */
  currentLocation?: string
  /** Urgency regime (e.g. "Ordinária", "Urgente", "Urgência urgentíssima"). */
  urgency?: string
  /** Timeline of legislative events. */
  timeline?: PropositionTimelineEvent[]
  /** Committees assigned to analyze this proposition. */
  committees?: PropositionCommittee[]
  /** Related propositions (appended, substitutive, etc.). */
  relatedPropositions?: RelatedProposition[]
  /** Year the proposition belongs to (for multi-year aggregation). */
  year?: number
}

// ── Câmara real API types ─────────────────────────────────────────────

/**
 * A legislative proposition from the Câmara API (GET /proposicoes).
 *
 * Proposições are formal legislative proposals: bills (PL), constitutional
 * amendments (PEC), provisional measures (MP), etc. Each has a type code
 * (siglaTipo), sequential number, and year (e.g. "PL 1234/2025").
 */
export interface CamaraProposition {
  id: string
  /** Type abbreviation (e.g. "PL", "PEC", "PLP", "MP"). */
  typeCode: string
  /** Sequential number within the type and year. */
  number: number
  /** Reference year. */
  year: number
  /** Short summary (ementa) describing the bill's purpose. */
  summary: string
  /** Full text of the ementa when available. */
  fullSummary?: string
  /** Keywords associated with the proposition. */
  keywords?: string
  /** ISO date of presentation. */
  presentedDate: string
  /** URL to the full text of the proposition (PDF or HTML). */
  textUrl?: string
  /** Last known status description. */
  statusDescription?: string
  /** Status date (ISO). */
  statusDate?: string
  /** Current location organ abbreviation (e.g. "PLEN", "CCJC"). */
  statusOrgan?: string
  /** Current location organ name. */
  statusOrganName?: string
  /** Processing regime (e.g. "Ordinária", "Urgente", "Especial"). */
  regime?: string
}

/**
 * An author of a Câmara proposition (GET /proposicoes/{id}/autores).
 */
export interface CamaraPropositionAuthor {
  /** Author name (deputy name, committee, or "Poder Executivo"). */
  name: string
  /** Type of authorship (e.g. "Deputado", "Comissão", "Poder Executivo"). */
  type: string
  /** Party abbreviation (if deputy). */
  party?: string
  /** State abbreviation (if deputy). */
  uf?: string
  /** Order of signature (1 = first author). */
  order: number
  /** Whether this is the lead author (proponente). */
  isLead: boolean
}

/**
 * A theme/topic assigned to a proposition (GET /proposicoes/{id}/temas).
 */
export interface CamaraPropositionTheme {
  /** Theme code in the Câmara classification. */
  code: number
  /** Theme name (e.g. "Economia", "Educação", "Saúde"). */
  name: string
  /** Relevance level (higher = more relevant). */
  relevance: number
}

/**
 * A step in the legislative progress of a proposition (tramitação).
 * From GET /proposicoes/{id}/tramitacoes.
 */
export interface CamaraPropositionProgress {
  /** ISO datetime of the progress event. */
  date: string
  /** Sequential number of this step. */
  sequence: number
  /** Description of the action taken. */
  description: string
  /** Organ abbreviation where the action occurred. */
  organAbbreviation?: string
  /** Organ full name. */
  organName?: string
  /** Processing regime at this point. */
  regime?: string
  /** Situation description after this step. */
  situation?: string
  /** URL to related document. */
  documentUrl?: string
}

/**
 * A voting session from the Câmara API (GET /votacoes).
 *
 * Voting sessions occur in plenary or committees when a proposition
 * is put to a formal recorded vote. The API provides the session details
 * and, separately, individual deputy votes and party orientations.
 */
export interface CamaraVotingSession {
  id: string
  /** ISO datetime of the vote. */
  date: string
  /** Description of what was voted on. */
  description: string
  /** Whether the measure was approved (true), rejected (false), or inconclusive (null). */
  approved: boolean | null
  /** Vote counts extracted from the description string. */
  voteTally?: VoteTally
  /** Propositions affected by this vote. */
  propositions: Array<{
    id: string
    typeCode: string
    number: number
    year: number
    summary: string
  }>
  /** Event ID where this vote took place. */
  eventId?: string
  /** Organ abbreviation where the vote took place (e.g. "PLEN"). */
  organ?: string
  /** More descriptive text about what was being voted on. */
  openingDescription?: string
  /** ISO datetime when the vote was opened. */
  openingDate?: string
  /** Rapporteur's opinion or last presentation text. */
  lastPresentation?: string
  /** Propositions that could be the object of this vote (broader than propositions). */
  votingObjects: Array<{
    id: string
    typeCode: string
    number: number
    year: number
    summary: string
  }>
}

/**
 * An individual deputy's vote in a voting session (GET /votacoes/{id}/votos).
 */
export interface CamaraIndividualVote {
  /** Deputy ID. */
  deputyId: string
  /** Deputy display name. */
  deputyName: string
  /** Party abbreviation. */
  party: string
  /** State abbreviation. */
  uf: string
  /** Vote cast (Portuguese). */
  vote: string
  /** Deputy photo URL. */
  photoUrl?: string
}

/**
 * A party/bloc orientation for a voting session (GET /votacoes/{id}/orientacoes).
 *
 * Before recorded votes, party leaders and bloc coordinators announce their
 * orientation (recommendation) to their members: "Sim", "Não", "Liberado"
 * (free vote), or "Obstrução" (obstruction — leave the floor to block quorum).
 */
export interface CamaraVoteOrientation {
  /** Name of the party, bloc, or government bench. */
  name: string
  /** Orientation code: "Sim", "Não", "Liberado", "Obstrução". */
  orientation: string
  /** Type: "Partido", "Bloco", "Governo", "Minoria". */
  type: string
}

// ── Senado-specific proposition sub-resources ─────────────────────────

/**
 * A rapporteurship record from `GET /processo/relatoria?idProcesso=`.
 *
 * Senate propositions can be assigned to multiple rapporteurs in different
 * committees over their lifecycle. Each record captures one rapporteur
 * appointment with its committee, role, and date range.
 */
export interface RapporteurshipRecord {
  /** Senator's name. */
  rapporteur: string
  /** Senator's `CodigoParlamentar` for linking to their detail page. */
  rapporteurId?: string
  /** Senator's party at the time of the appointment. */
  rapporteurParty?: string
  /** Senator's state at the time of the appointment. */
  rapporteurUf?: string
  /** Committee abbreviation (e.g. "CCJ", "CAE"). */
  committeeAbbreviation: string
  /** Full committee name. */
  committeeName: string
  /** Role of the rapporteurship (e.g. "Relator", "Relator Revisor", "Substituto"). */
  role: string
  /** ISO date when the rapporteurship started. */
  startDate?: string
  /** ISO date when the rapporteurship ended (undefined if active). */
  endDate?: string
}

/**
 * A document attached to a Senate proposition from
 * `GET /processo/documento?idProcesso=`.
 *
 * Documents include the original bill text, substitute texts, opinions,
 * reports, and other formal pieces of the legislative process.
 */
export interface PropositionDocument {
  /** Senado document ID (`idDocumento`). */
  id: string
  /** Document type description (e.g. "Texto inicial", "Parecer"). */
  type: string
  /** Full document title. */
  title?: string
  /** ISO date when the document was filed. */
  date?: string
  /** Author / signatory name. */
  author?: string
  /** Direct URL to the document PDF or HTML. */
  url?: string
}

/**
 * A formal amendment to a Senate proposition from
 * `GET /processo/emenda?idProcesso=`.
 */
export interface PropositionAmendment {
  /** Senado amendment ID. */
  id: string
  /** Amendment number/identifier (e.g. "EMENDA Nº 12 - PLEN"). */
  identifier: string
  /** ISO date the amendment was filed. */
  date?: string
  /** Author name. */
  author?: string
  /** Author party. */
  authorParty?: string
  /** Free-form description / amendment summary. */
  description?: string
  /** Direct URL to the amendment text. */
  url?: string
}

/**
 * An aggregated voting session from the Senado `GET /votacao` endpoint.
 *
 * The endpoint returns one record per (session, senator) tuple, so the
 * fetcher aggregates them by `codigoSessaoVotacao` to surface session-level
 * metadata along with optional individual votes and a tally.
 */
export interface SenadoVotingSession {
  /** Session ID (`codigoSessaoVotacao`). */
  id: string
  /** ISO date of the voting session. */
  date: string
  /** Description of what was voted (`descricaoVotacao`). */
  description: string
  /** Whether the session resulted in approval (true), rejection (false), or no result. */
  approved: boolean | null
  /** Identifier of the affected matter (e.g. "PL 1234/2024"), when present. */
  matterIdentifier?: string
  /** Linkable matter ID for navigation to `/processo/{id}`. */
  matterId?: string
  /** Aggregated yes/no/abstention/absent counts. */
  voteTally?: VoteTally
  /** Per-senator votes; only populated for the per-session detail call. */
  votes?: PropositionVote[]
}
