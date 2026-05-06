/**
 * @file parliamentarian.ts
 * @description Shared TypeScript types for parliamentarians (deputies and senators).
 *
 * These types model the data returned by the Câmara dos Deputados API
 * (`dadosabertos.camara.leg.br/api/v2`) and the Senado Federal API
 * (`legis.senado.leg.br/dadosabertos`), as well as Portal da Transparência
 * for compensation data.
 *
 * All types that reach the frontend include `_source` via `WithSource<T>`.
 */

// ── Deputies (Câmara dos Deputados) ──────────────────────────────────

/** A deputy as returned by GET /deputados (list endpoint). */
export interface Deputy {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
  email?: string
  legislature: number
}

/** Detailed deputy profile from GET /deputados/{id}. */
export interface DeputyDetail extends Deputy {
  fullName: string
  birthDate?: string
  birthPlace?: string
  education?: string
  office?: string
  /** "M" or "F" from the API sexo field. */
  sex?: string
  /** Current situation — e.g. "Exercício", "Fim de Mandato", "Licença". */
  situation?: string
  /** Electoral name used during campaigns. */
  electoralName?: string
  /** Office phone number from the gabinete data. */
  phone?: string
}

/** A single CEAP expense record from GET /deputados/{id}/despesas. */
export interface DeputyExpense {
  date: string
  type: string
  /** Supplier name (nomeFornecedor from the API). */
  supplierName: string
  /** Internal document number (numDocumento from the API). */
  document: string
  /** Supplier's CPF or CNPJ (cnpjCpfFornecedor from the API). */
  supplierDocument: string
  /** Net value after deductions (valorLiquido). */
  value: number
  /** Gross value before deductions (valorDocumento). */
  grossValue: number
  /** Amount deducted/rejected by the Câmara (valorGlosa). */
  deductedValue: number
  /** URL to the receipt/invoice document (PDF or image). */
  documentUrl?: string
  /** Document type (e.g. "Nota Fiscal", "Recibo"). */
  documentType: string
  /** Internal document code (codDocumento). */
  documentCode: string
  /** Reimbursement number (numRessarcimento). */
  reimbursementNumber?: string
  /** Batch number (codLote). */
  batchNumber: number
  /** Installment number (parcela). */
  installment: number
  /** Reference year (ano). */
  year: number
  /** Reference month (mes). */
  month: number
}

/** A committee membership for a deputy from GET /deputados/{id}/orgaos. */
export interface DeputyCommittee {
  /** Committee ID in the Câmara API. */
  id: string
  /** Committee abbreviation (e.g. "CCJC", "CFT"). */
  abbreviation: string
  /** Full committee name. */
  name: string
  /** Type of body: "Comissão Permanente", "Comissão Especial", "CPI", etc. */
  type: string
  /** Deputy's role in the committee: "Titular", "Suplente", "Presidente", etc. */
  role: string
  /** ISO date when membership started. */
  startDate: string
  /** ISO date when membership ended (null if still active). */
  endDate?: string
}

/** A parliamentary caucus (frente parlamentar) from GET /deputados/{id}/frentes. */
export interface DeputyCaucus {
  /** Caucus ID in the Câmara API. */
  id: string
  /** Full caucus name (e.g. "Frente Parlamentar da Agropecuária"). */
  name: string
  /** Legislature number the caucus belongs to. */
  legislature: number
}

/** A floor speech from GET /deputados/{id}/discursos. */
export interface DeputySpeech {
  /** ISO datetime when the speech started. */
  startTime: string
  /** ISO datetime when the speech ended (may be null). */
  endTime?: string
  /** Type of speech: "PELA ORDEM", "GRANDE EXPEDIENTE", "BREVES COMUNICAÇÕES", etc. */
  type: string
  /** Phase of the event (e.g. "Comunicações Parlamentares", "Ordem do Dia"). */
  phase: string
  /** Brief summary of the speech content. */
  summary: string
  /** Full transcript text (may be long). */
  transcript?: string
  /** Comma-separated keywords. */
  keywords?: string
  /** URL to the official text record on the Câmara website. */
  textUrl?: string
  /** URL to the audio recording (if available). */
  audioUrl?: string
  /** URL to the video recording (if available). */
  videoUrl?: string
}

/**
 * An event (session, hearing, committee meeting) from GET /deputados/{id}/eventos.
 * Also used for GET /eventos/{id} detail.
 */
export interface DeputyEvent {
  /** Event ID in the Câmara API. */
  id: string
  /** ISO datetime when the event started. */
  startTime: string
  /** ISO datetime when the event ended (null if ongoing/future). */
  endTime?: string
  /** Event status: "Encerrada", "Em andamento", "Convocada", etc. */
  status: string
  /** Type description: "Sessão Deliberativa", "Audiência Pública", etc. */
  type: string
  /** Event description/title. */
  description: string
  /** Organizing bodies (committees, plenary, etc.). */
  organs: Array<{ id: string; abbreviation: string; name: string }>
  /** Physical location within the Câmara (building, room). */
  location?: string
  /** URL for watching/recording (usually YouTube). */
  recordingUrl?: string
}

/** A previous elected mandate from GET /deputados/{id}/mandatosExternos (TSE data). */
export interface DeputyPreviousMandate {
  /** Office held: "Vereador(a)", "Prefeito(a)", "Deputado(a) Estadual", etc. */
  office: string
  /** State abbreviation. */
  uf: string
  /** Municipality (for local offices). */
  municipality?: string
  /** Year the mandate started. */
  startYear: number
  /** Year the mandate ended. */
  endYear: number
  /** Party at the time of election. */
  party: string
}

/** A status change entry from GET /deputados/{id}/historico. */
export interface DeputyStatusHistory {
  /** ISO datetime of the status change. */
  date: string
  /** Status at this point: "Exercício", "Vacância", "Licença", etc. */
  status: string
  /** Electoral condition: "Titular", "Suplente". */
  electoralCondition: string
  /** Human-readable description of the change. */
  description?: string
  /** Party at this point (may differ from current due to party switches). */
  party: string
  /** State at this point. */
  uf: string
}

/** A declared profession from GET /deputados/{id}/profissoes. */
export interface DeputyProfession {
  /** Profession title (e.g. "Arquiteto", "Advogado"). */
  title: string
  /** ISO datetime when declared. */
  date: string
}

/** A deputy's vote on a specific proposal. */
export interface DeputyVote {
  date: string
  proposalId: string
  proposalDescription: string
  vote: "Sim" | "Não" | "Abstenção" | "Obstrução"
}

/**
 * A record of how a deputy voted in a specific voting session.
 *
 * Built by cross-referencing `getVotingSessions()` with per-session
 * `getVotingSessionVotes()`, filtering for the target deputy. This type
 * combines session metadata with the individual vote.
 */
export interface DeputyVotingRecord {
  /** Voting session ID in the Câmara API. */
  sessionId: string
  /** ISO datetime of the voting session. */
  date: string
  /** Description of what was voted. */
  description: string
  /** Whether the measure was approved overall. */
  approved: boolean | null
  /** How the deputy voted: "Sim", "Não", "Abstenção", "Obstrução", etc. */
  vote: string
  /** Affected propositions from the session. */
  propositions: Array<{ id: string; typeCode: string; number: number; year: number; summary: string }>
}

/** A professional occupation declared by a deputy from GET /deputados/{id}/ocupacoes. */
export interface DeputyOccupation {
  /** Occupation title (e.g. "Advogado", "Empresário"). */
  title: string
  /** Entity/organization where the occupation was exercised. */
  entity?: string
  /** State abbreviation (if applicable). */
  uf?: string
  /** Year the occupation started. */
  startYear?: number
  /** Year the occupation ended (null if current). */
  endYear?: number
}

/** A Câmara mandate (elected term) from GET /deputados/{id}/mandatos. */
export interface DeputyMandate {
  /** Legislature number (e.g. 57 for 2023–2027). */
  legislature: number
  /** Electoral condition: "Titular", "Suplente". */
  electoralCondition: string
  /** State elected from. */
  uf: string
  /** Party at the time of election. */
  party: string
  /** Year the mandate started. */
  startYear: number
  /** Year the mandate ended. */
  endYear: number
}

/**
 * Detail of a parliamentary caucus (frente parlamentar) from GET /frentes/{id}.
 * Extends the basic DeputyCaucus with purpose, creation date, and member list.
 */
export interface CaucusDetail {
  /** Caucus ID in the Câmara API. */
  id: string
  /** Full caucus name. */
  name: string
  /** Legislature number the caucus belongs to. */
  legislature: number
  /** Official purpose statement of the caucus. */
  purpose?: string
  /** ISO date when the caucus was registered. */
  creationDate?: string
  /** Coordinator deputy name. */
  coordinatorName?: string
  /** Coordinator deputy ID. */
  coordinatorId?: string
  /** Full list of caucus members. */
  members: CaucusMember[]
}

/** A member of a parliamentary caucus. */
export interface CaucusMember {
  /** Deputy ID in the Câmara API. */
  id: string
  /** Deputy display name. */
  name: string
  /** Party abbreviation. */
  party: string
  /** State abbreviation. */
  uf: string
  /** Photo URL. */
  photoUrl?: string
  /** Role in the caucus (e.g. "Coordenador", "Membro"). */
  role: string
}

/** Deputy attendance summary computed from the yearly bulk file. */
export interface DeputyAttendance {
  totalSessions: number
  present: number
  absent: number
  percentage: number
}

/** A staff member (assessor) from the bulk staff file. */
export interface StaffMember {
  name: string
  role: string
  deputyId: string
  salary: number
}

// ── Senators (Senado Federal) ────────────────────────────────────────

/**
 * A senator as returned by GET /senador/lista/atual.json.
 *
 * Mirrors the field shape of `Deputy` for cross-institution UI reuse.
 * The Senado API exposes 81 senators per legislature.
 */
export interface Senator {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
  email?: string
  legislature: number
}

/**
 * Detailed senator profile from GET /senador/{id}.json.
 *
 * Mirrors `DeputyDetail` field-for-field where the Senado API exposes equivalents,
 * so detail-page components can be parameterized over a discriminated union of
 * deputy/senator without per-institution branching.
 */
export interface SenatorDetail extends Senator {
  fullName: string
  birthDate?: string
  birthPlace?: string
  /** "M" or "F" from the API `Sexo` field. */
  sex?: string
  /** Current situation — e.g. "Em exercício", "Afastado", "Suplente em exercício". */
  situation?: string
  /** Office description (e.g. "Anexo I — Bloco A — 17º andar"). */
  office?: string
  /** Office phone number from the gabinete data. */
  phone?: string
  /** Declared profession (e.g. "Advogado"). */
  profession?: string
  /** ISO date the current term started. */
  termStart?: string
  /** ISO date the current term ends. */
  termEnd?: string
  /** Personal website URL (`UrlPaginaParlamentar`). */
  websiteUrl?: string
}

/**
 * A senate mandate (term) from GET /senador/{id}/mandatos.json.
 *
 * Senate terms run 8 years and overlap legislatures. A senator may have
 * multiple mandates across their career, each tagged with a UF and party.
 */
export interface SenatorMandate {
  /** Mandate ID in the Senado API (`CodigoMandato`). */
  id: string
  /** Type of participation: "Titular", "Suplente", etc. */
  participation: string
  /** State the senator was elected from. */
  uf: string
  /** Primary legislature number associated with this mandate. */
  primaryLegislature?: number
  /** Year the mandate started. */
  startYear: number
  /** Year the mandate ends (or ended). */
  endYear: number
  /** Party at time of election (if available in the response). */
  party?: string
}

/**
 * A party affiliation entry from GET /senador/{id}/filiacoes.json.
 *
 * Captures party-switch history. Active affiliation has `endDate` undefined.
 */
export interface SenatorAffiliation {
  /** Party abbreviation (e.g. "PT", "PL"). */
  party: string
  /** Full party name. */
  partyName?: string
  /** ISO date when affiliation started. */
  startDate: string
  /** ISO date when affiliation ended (undefined for the current affiliation). */
  endDate?: string
}

/**
 * A senator's vote on a specific session, from `GET /votacao` filtered by
 * `codigoParlamentar`. Mirrors `DeputyVotingRecord` so cross-institution
 * components (vote tables, alignment charts) work without per-source forks.
 */
export interface SenatorVotingRecord {
  /** Session ID in the Senado API (`CodigoSessaoVotacao`). */
  sessionId: string
  /** ISO datetime of the voting session. */
  date: string
  /** Description of what was voted. */
  description: string
  /**
   * Whether the measure was approved overall (true), rejected (false),
   * or has no recorded result (null).
   */
  approved: boolean | null
  /** How the senator voted ("Sim", "Não", "Abstenção", "Obstrução", etc.). */
  vote: string
  /** Identifier of the affected matter (e.g. "PL 1234/2024"), when present. */
  matterIdentifier?: string
  /** ID of the affected matter (linkable to `GET /processo/{id}`). */
  matterId?: string
}

/**
 * A floor speech from `GET /senador/{id}/discursos.json`.
 *
 * Maps closely to `DeputySpeech` but the Senado API exposes fewer fields
 * (no audio/video URLs, no transcript) on the listing endpoint — those
 * require a per-pronunciamento detail call we do not make in Phase 2.
 */
export interface SenatorSpeech {
  /** Pronunciamento ID (`CodigoPronunciamento`). */
  id: string
  /** ISO date of the speech (we collapse `DataPronunciamento` to date-only). */
  date: string
  /** Type of speech (e.g. "BREVES COMUNICAÇÕES", "DISCURSO"). */
  type: string
  /** Brief summary of the speech content. */
  summary?: string
  /** URL to the official text record. */
  textUrl?: string
  /** URL to the published session record. */
  sessionUrl?: string
  /** Topic/matter discussed (assunto). */
  topic?: string
}

/**
 * A committee membership from `GET /senador/{id}/comissoes.json`.
 *
 * Mirrors `DeputyCommittee` so committee tables/charts can be reused.
 */
export interface SenatorCommittee {
  /** Committee ID in the Senado API. */
  id: string
  /** Committee abbreviation (e.g. "CCJ", "CAE", "CRE"). */
  abbreviation: string
  /** Full committee name. */
  name: string
  /** Type: "PERMANENTE", "ESPECIAL", "CPI", etc. */
  type: string
  /** Senator's role: "Titular", "Suplente". */
  role: string
  /** ISO date when membership started. */
  startDate: string
  /** ISO date when membership ended (undefined if active). */
  endDate?: string
}

/**
 * A committee chair / vice-chair role from `GET /senador/{id}/cargos.json`.
 *
 * The Senado distinguishes "membership" (cargo de membro) from "directing
 * positions" (presidente, vice-presidente). This type captures the latter.
 */
export interface SenatorPosition {
  /** Position ID in the Senado API. */
  id: string
  /** Position name (e.g. "Presidente", "Vice-Presidente", "Suplente"). */
  name: string
  /** Committee abbreviation where the position is held. */
  committeeAbbreviation: string
  /** Full committee name. */
  committeeName: string
  /** ISO date when the position started. */
  startDate: string
  /** ISO date when the position ended (undefined if active). */
  endDate?: string
}

/**
 * A leadership role from `GET /senador/{id}/liderancas.json`.
 *
 * Senate leadership has no Câmara analog — Câmara uses "frentes parlamentares"
 * for issue-area caucuses, while Senate uses formal leadership roles tied to
 * party, bloc, government, or opposition.
 */
export interface SenatorLeadership {
  /** Description of the leadership role (e.g. "Líder", "Vice-Líder"). */
  role: string
  /** Unit being led — party abbreviation, bloc name, "Governo", etc. */
  unitAbbreviation: string
  /** Full unit name. */
  unitName?: string
  /** Type of unit: "Partido", "Bloco", "Governo", "Maioria", "Minoria", etc. */
  unitType?: string
  /** ISO date when the leadership role started. */
  startDate: string
  /** ISO date when the leadership role ended (undefined if active). */
  endDate?: string
}

/**
 * A single CEAPS (Cota para o Exercício da Atividade Parlamentar dos
 * Senadores) expense record from the Senado administrative API.
 *
 * Mirrors `DeputyExpense` field-for-field where the Senado source provides
 * an equivalent. Fields the Senado feed does not expose (e.g. `valorGlosa`,
 * `parcela`) are omitted rather than left as `0` to avoid suggesting a
 * meaningful zero where the data simply does not exist.
 */
export interface SenatorExpense {
  /** ISO date of the receipt (YYYY-MM-DD). */
  date: string
  /** Reference year. */
  year: number
  /** Reference month (1–12). */
  month: number
  /** The senator's API code (`codSenador`). */
  senatorId: string
  /** Senator display name (uppercased by the API). */
  senatorName: string
  /** Expense category (e.g. "Passagens aéreas, aquáticas e terrestres nacionais"). */
  type: string
  /** Supplier name. */
  supplierName: string
  /** Supplier CPF or CNPJ. */
  supplierDocument?: string
  /** Document number from the receipt. */
  document?: string
  /** Net value reimbursed, in BRL. */
  value: number
  /** Document type description (e.g. "Nota Fiscal", "Recibo"). */
  documentType?: string
  /** Internal document code (`codDocumento`). */
  documentCode?: string
  /** URL to the receipt/invoice scan when the API publishes one. */
  documentUrl?: string
  /** Free-form detail text. */
  details?: string
}

/** A pre-aggregated per-senator entry for the CEAPS bulk summary. */
export interface SenatorCeapsBulkEntry {
  /** Senator API code. */
  senatorId: string
  /** Senator display name. */
  senatorName: string
  /** Total reimbursed for this senator in the given year (BRL). */
  total: number
  /** Number of expense records for this senator. */
  expenseCount: number
}

/**
 * Pre-aggregated CEAPS summary for a single year.
 *
 * Computed server-side after fetching the raw CEAPS bulk file from the
 * admin API. Cached separately under a stable key so listing pages and
 * benchmark calculations can reuse the same aggregation without
 * re-walking the raw data on every request.
 */
export interface SenatorCeapsBulkSummary {
  /** Reference year. */
  year: number
  /** Total CEAPS spending across all senators in the year (BRL). */
  totalSpending: number
  /** Total number of expense records in the year. */
  expenseCount: number
  /** Per-senator entries sorted by total spending descending. */
  senators: SenatorCeapsBulkEntry[]
}

// ── Senate plenary attendance ────────────────────────────────────────

/**
 * A single Senate plenary session as returned by the monthly results endpoint.
 *
 * The Senado does not publish a per-senator attendance feed. Attendance is
 * derived by walking each session's `Comparecimento` block and crediting the
 * listed senators. Sessions without `Comparecimento` are still counted as
 * sessions but carry an empty attendees list.
 */
export interface PlenarySession {
  /** Senate session code (`CodigoSessao`). */
  id: string
  /** Session date in ISO format (YYYY-MM-DD). */
  date: string
  /** Session type abbreviation (e.g. "DON" — Deliberativa Ordinária Não). */
  typeCode?: string
  /** Full session type description (e.g. "Sessão Deliberativa Ordinária"). */
  type: string
  /** Whether this session is a deliberative one (where votes happen). */
  isDeliberative: boolean
  /** Senator IDs (`CodigoParlamentar`) credited as present at the session. */
  attendeeIds: string[]
}

/**
 * Per-senator attendance entry inside the bulk year summary.
 *
 * Computed by aggregating every plenary session in the year. `attended`
 * counts deliberative sessions only; `percentage` is `attended /
 * totalDeliberative`. Days are unique calendar days a senator was present
 * on, regardless of how many sessions occurred that day.
 */
export interface SenatorAttendanceEntry {
  /** Senator API code (`CodigoParlamentar`). */
  senatorId: string
  /** Number of deliberative sessions attended in the year. */
  attended: number
  /** Number of deliberative sessions missed in the year. */
  missed: number
  /** Attendance percentage (0–100), rounded to 2 decimals. */
  percentage: number
  /** Distinct ISO dates (YYYY-MM-DD) the senator was present at any session. */
  attendedDates: string[]
}

/**
 * Pre-aggregated attendance summary for a single year.
 *
 * Composed from twelve `/plenario/resultado/mes/{YYYYMM}` calls. Cached as
 * a single Redis entry under `sen:attendance:{year}` so the listing page
 * pays one Redis GET instead of twelve HTTP calls per request.
 */
export interface SenatorAttendanceBulkSummary {
  /** Reference year. */
  year: number
  /** Total number of plenary sessions held in the year (all types). */
  totalSessions: number
  /** Total number of deliberative sessions in the year (denominator for percentage). */
  totalDeliberative: number
  /** Per-senator attendance entries. */
  senators: SenatorAttendanceEntry[]
}

/**
 * Per-session attendance record for a single senator.
 *
 * Used by the `/senado/[id]/presenca` route to render a chronological
 * list of every plenary session in the year along with the senator's
 * presence status.
 */
export interface SenatorAttendanceDay {
  /** Session ID (`CodigoSessao`). */
  sessionId: string
  /** Session date in ISO format. */
  date: string
  /** Full session type description. */
  type: string
  /** Whether this session counts toward the deliberative attendance metric. */
  isDeliberative: boolean
  /** Whether the senator was credited as present. */
  attended: boolean
}

/**
 * Year-level attendance detail for a single senator.
 *
 * Includes every plenary session in the year (attended or not) plus the
 * aggregated counts. Drives the per-senator attendance subroute and the
 * Presença section on the detail page.
 */
export interface SenatorAttendanceDetail {
  /** Senator API code. */
  senatorId: string
  /** Reference year. */
  year: number
  /** Per-session records sorted chronologically. */
  sessions: SenatorAttendanceDay[]
  /** Total deliberative sessions in the year (denominator). */
  totalDeliberative: number
  /** Deliberative sessions the senator attended. */
  attended: number
  /** Deliberative sessions the senator missed. */
  missed: number
  /** Attendance percentage (0–100), rounded to 2 decimals. */
  percentage: number
}

// ── Senator extras (Phase 9: parity expansion) ───────────────────────

/**
 * A senator's leave record from `GET /senador/{id}/licencas.json`.
 *
 * The Senado registers formal leaves (medical, parental, political mission,
 * etc.) that legally exempt a senator from plenary attendance. This is the
 * authoritative signal needed to suppress false-positive low-attendance
 * red flags.
 */
export interface SenatorLeave {
  /** Internal leave code (`CodigoLicenca`). */
  id: string
  /** Type description (e.g. "Saúde", "Atividade política", "Maternidade"). */
  type: string
  /** ISO start date (YYYY-MM-DD). */
  startDate: string
  /** ISO end date (YYYY-MM-DD), undefined for open-ended leaves. */
  endDate?: string
  /** Free-form motive text. */
  motive?: string
}

/** A formal-education entry from `GET /senador/{id}/historicoAcademico.json`. */
export interface SenatorAcademic {
  /** Course or degree (e.g. "Bacharelado em Direito"). */
  course: string
  /** Institution name. */
  institution: string
  /** Education level ("Superior", "Pós-graduação", etc.). */
  level?: string
  /** Year the course was concluded. */
  conclusionYear?: number
}

/**
 * A declared profession from `GET /senador/{id}/profissao.json`.
 *
 * The detail endpoint exposes only the primary profession; this fetcher
 * surfaces the full multi-entry list (e.g. "Advogado", "Empresário").
 */
export interface SenatorProfessionEntry {
  /** Profession title (e.g. "Empresário"). */
  title: string
  /** Whether this is the principal declared profession. */
  isPrincipal: boolean
  /** Whether actively exercised at the time of declaration. */
  isActive: boolean
}

/**
 * A floor interjection (aparte) from `GET /senador/{id}/apartes.json`.
 *
 * Apartes are short interventions interrupting another senator's speech.
 * They are a meaningful proxy for floor engagement beyond the formal
 * `discursos` list.
 */
export interface SenatorInterjection {
  /** Pronunciamento ID where the interjection happened. */
  id: string
  /** ISO date of the speech where the interjection happened. */
  date: string
  /** Brief summary or topic. */
  summary?: string
  /** URL to the official text record. */
  textUrl?: string
  /** Topic (assunto) tag if classified. */
  topic?: string
  /** Speaker who was interjected. */
  interruptedSpeaker?: string
}

/**
 * A vote cast by a senator inside a committee from
 * `GET /votacaoComissao/parlamentar/{id}`.
 *
 * Committee votes are not surfaced by `/votacao` (which is plenary-only).
 * This is critical context — most policy work happens in committees.
 */
export interface SenatorCommitteeVote {
  /** Committee voting session ID. */
  sessionId: string
  /** ISO date of the committee session. */
  date: string
  /** Committee abbreviation (e.g. "CCJ"). */
  committeeAbbreviation: string
  /** Full committee name. */
  committeeName: string
  /** Description of the matter voted. */
  description: string
  /** How the senator voted ("Sim", "Não", "Abstenção", "Não votou", etc.). */
  vote: string
  /** Whether the measure was approved overall. */
  approved: boolean | null
  /** Identifier of the affected matter (e.g. "PL 1234/2024"). */
  matterIdentifier?: string
  /** ID of the affected matter (linkable to `/processo/{id}`). */
  matterId?: string
}

/**
 * A party-leadership voting orientation from
 * `GET /plenario/votacao/orientacaoBancada/{ini}/{fim}`.
 *
 * The Senate's party leaders publish recommendations ("Sim", "Não",
 * "Liberada") for each plenary vote. Cross-referencing senator votes against
 * orientations identifies "rebel votes" against own-party guidance.
 */
export interface SenadoVotingOrientation {
  /** Voting session ID (`CodigoSessaoVotacao`). */
  sessionId: string
  /** ISO date of the session. */
  date: string
  /** Party / bloc / leadership unit issuing the orientation. */
  unitAbbreviation: string
  /** Recommendation ("Sim", "Não", "Liberada", "Obstrução"). */
  orientation: string
}

// ── Shared types ─────────────────────────────────────────────────────

/** Compensation breakdown used for both deputies, senators, and servants. */
export interface CompensationBreakdown {
  baseSalary: number
  benefits: number
  allowances: number
  grossTotal: number
  incomeTax: number
  pension: number
  netTotal: number
}
