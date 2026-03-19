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

/** A senator as returned by GET /senador/lista/atual.json. */
export interface Senator {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
  email?: string
}

/** Detailed senator profile from GET /senador/{id}.json. */
export interface SenatorDetail extends Senator {
  fullName: string
  birthDate?: string
  birthPlace?: string
  profession?: string
  termStart: string
  termEnd: string
  legislature: number
}

/** A bill authored by a senator from GET /senador/{id}/autorias.json. */
export interface SenatorBill {
  date: string
  type: string
  description: string
  status: string
}

/** A senator's vote from GET /senador/{id}/votacoes.json. */
export interface SenatorVote {
  date: string
  proposalId: string
  proposalDescription: string
  vote: string
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
