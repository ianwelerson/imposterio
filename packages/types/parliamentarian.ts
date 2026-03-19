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
  value: number
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
