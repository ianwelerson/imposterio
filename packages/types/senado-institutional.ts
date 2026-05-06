/**
 * @file senado-institutional.ts
 * @description Shared TypeScript types for Senado Federal institutional spending.
 *
 * Covers two data families published by the Senado administrative API
 * (`adm.senado.gov.br/adm-dadosabertos`):
 *
 * - Contracts (`/contratacoes/*`) — current contracts, bids (licitações),
 *   contractor companies, purchase orders, outsourced workers.
 * - Civil servants (`/servidores/*`) — staff list, headcount aggregates by
 *   career class and role group, monthly remuneration rolls.
 *
 * The Senado contract endpoints differ from Câmara's: contract values are not
 * inline on the contract record. To compute a contract's value you must walk
 * to `/contratacoes/contratos/{id}/pagamentos` and sum payments. Listing pages
 * therefore present counts and metadata, not totals.
 *
 * All types that reach the frontend include `_source` via `WithSource<T>`.
 */

// ── Contracts ────────────────────────────────────────────────────────

/** A single contract from the institutional contracts list. */
export interface SenadoContract {
  /** Internal contract ID. */
  id: string
  /** Contract number (e.g. "20260065"). */
  number: string
  /** Formatted number with sub-species prefix (e.g. "CT-CT/20260065"). */
  formattedNumber: string
  /** Object description — what is being contracted. */
  object: string
  /** Modality from the originating bid ("Pregão Eletrônico", "Não se Aplica"). */
  modality: string
  /** Bid number that originated the contract (may be empty). */
  bidNumber: string
  /** Sub-species sigla (CT, CN, CS, TC, ...). */
  subSpeciesCode: string
  /** Sub-species human name (Contrato, Convênio, Cessão de Uso, ...). */
  subSpeciesName: string
  /** Contracted company name. */
  supplierName: string
  /** Contracted company CNPJ/CPF. */
  supplierDocument: string
  /** Signature date (ISO YYYY-MM-DD). */
  signatureDate: string
  /** Publication date (ISO, may be empty). */
  publicationDate: string
  /** Validity start date (ISO). */
  startDate: string
  /** Validity end date (ISO, may be empty for open-ended contracts). */
  endDate: string
  /** Last update date (ISO). */
  lastUpdated: string
  /** Legal basis (article, law) — may be empty. */
  legalBasis: string
  /** Whether this is a labor-intensive contract (terceirização). */
  isLaborIntensive: boolean
  /** Managing unit short name (e.g. "SF" for Senado Federal). */
  managingUnit: string
}

/** A bid (licitação) record from the institutional bids list. */
export interface SenadoBid {
  /** Internal bid ID. */
  id: string
  /** Bid number (e.g. "16/2018"). */
  number: string
  /** Object description. */
  object: string
  /** Opening date (ISO). */
  openingDate: string
  /** Status (HOMOLOGADA, REVOGADA, ANULADA, FRACASSADA, ABERTA, ...). */
  status: string
  /** Modality (Pregão, Concorrência, ...). */
  modality: string
  /** Whether this bid is part of an ARP (registro de preço). */
  isPriceRegistration: boolean
  /** Originating organ. */
  originatingOrgan: string
  /** Bid notice URL (edital). */
  noticeUrl: string
}

/** A contractor company with its bound contracts. */
export interface SenadoContractor {
  /** Internal company ID. */
  id: string
  /** Legal name. */
  name: string
  /** CNPJ or CPF. */
  document: string
  /** Number of contracts on file. */
  contractCount: number
  /** Number of purchase orders on file. */
  orderCount: number
}

/** Pre-aggregated contracts overview cached in Redis. */
export interface SenadoContractsSummary {
  /** Total number of contracts on file. */
  totalContracts: number
  /** Number of contracts active today (current date inside [startDate, endDate]). */
  activeContracts: number
  /** Contracts grouped by sub-species with count. */
  bySubSpecies: Array<{ name: string; count: number }>
  /** Contracts grouped by signature year with count. */
  byYear: Array<{ year: number; count: number }>
  /** Contracts grouped by modality with count. */
  byModality: Array<{ name: string; count: number }>
  /** Top contractors by contract count. */
  topContractors: Array<{ name: string; document: string; count: number }>
  /** All contract records (for listing pages). */
  contracts: SenadoContract[]
  /** Timestamp when this summary was computed (ISO). */
  lastUpdated: string
}

/** A single payment row inside a contract's payments breakdown. */
export interface SenadoContractPayment {
  /** Internal payment ID. */
  id: string
  /** Free-text observation. */
  notes: string
  /** Penalty amount applied (R$). */
  penalty: number
  /** Glosa (deduction) applied (R$). */
  deduction: number
  /** Description of the underlying expense. */
  expenseDescription: string
  /** Charged value (R$). */
  amount: number
}

// ── Civil servants ───────────────────────────────────────────────────

/** A single career-class headcount row from `/servidores/quantitativos/pessoal`. */
export interface SenadoServantHeadcountRow {
  /** Career class name (ESPECIAL, INTERMEDIARIA, ...). */
  className: string
  /** Career group code (A, B, C, ...). */
  groupCode: string
  /** Career plan label. */
  careerPlan: string
  /** Education level required. */
  educationLevel: string
  /** Reference standard/level. */
  referenceLevel: string
  /** Stable headcount. */
  stable: number
  /** Non-stable headcount. */
  nonStable: number
  /** Sum of stable + non-stable on this row. */
  subtotal: number
  /** Vacancies (vagos) on this row. */
  vacancies: number
  /** Retired (aposentados). */
  retired: number
  /** Pension grantors (instituidores de pensão). */
  pensionGrantors: number
  /** Pension beneficiaries. */
  pensionBeneficiaries: number
  /** Total active staff in the career plan (denormalized — same value across rows). */
  totalActive: number
  /** Total inactive staff on this row. */
  totalInactive: number
}

/** A single Senate servant from `/servidores/servidores`. */
export interface SenadoServant {
  /** Internal sequencial ID. */
  id: string
  /** Full name. */
  name: string
  /** Vínculo: EFETIVO, COMISSIONADO, REQUISITADO, ... */
  bond: string
  /** Situação: ATIVO, APOSENTADO, DESLIGADO, ... */
  status: string
  /** Cargo (job title) — null when not applicable. */
  position: string
  /** Padrão / nível de carreira (e.g. "S45", "M36") — may be empty. */
  level: string
  /** Speciality/area — may be empty. */
  speciality: string
  /** Função (assigned function) — may be empty. */
  role: string
  /** Lotação (assignment) sigla. */
  departmentCode: string
  /** Lotação human-readable name. */
  departmentName: string
  /** Categoria code (AL, TL, COMISSAO, ...). */
  categoryCode: string
  /** Categoria human-readable name. */
  categoryName: string
  /** Year of admission (may be 0 when unknown). */
  admissionYear: number
}

/** Pre-aggregated servants overview cached in Redis. */
export interface SenadoServantsSummary {
  /** Total active staff on file. */
  totalActive: number
  /** Total inactive staff (retired + pension beneficiaries). */
  totalInactive: number
  /** Total vacancies (vagos). */
  totalVacancies: number
  /** Servants grouped by bond (vínculo) with count. */
  byBond: Array<{ name: string; count: number }>
  /** Servants grouped by status (situação) with count. */
  byStatus: Array<{ name: string; count: number }>
  /** Servants grouped by category with count. */
  byCategory: Array<{ name: string; count: number }>
  /** Career-class headcount rows from /quantitativos/pessoal. */
  headcount: SenadoServantHeadcountRow[]
  /** All individual servant records. */
  members: SenadoServant[]
  /** Timestamp when this summary was computed (ISO). */
  lastUpdated: string
}

/** A single remuneration record from `/servidores/remuneracoes/{ano}/{mes}`. */
export interface SenadoServantRemuneration {
  /** Servant sequencial ID. */
  id: string
  /** Servant name. */
  name: string
  /** Reference month (1–12). */
  month: number
  /** Reference year. */
  year: number
  /** Folha tipo (Normal / Suplementar / 13o ...). */
  payrollType: string
  /** Base salary (R$). */
  baseSalary: number
  /** Personal advantages (R$). */
  personalAllowances: number
  /** Indemnification advantages (R$). */
  indemnificationAllowances: number
  /** Function gratification (R$). */
  functionGratification: number
  /** Christmas bonus (R$). */
  christmasBonus: number
  /** Overtime (R$). */
  overtime: number
  /** Other eventual income (R$). */
  otherIncome: number
  /** Permanence bonus (R$). */
  permanenceBonus: number
  /** Constitutional ceiling reversal (R$, usually negative). */
  ceilingReversal: number
  /** Income tax withheld (R$, usually negative). */
  incomeTaxWithheld: number
  /** Social security withholding (R$, usually negative). */
  socialSecurityWithheld: number
  /** Aid payments (R$). */
  aids: number
  /** Per diem allowances (R$). */
  perDiem: number
  /** Absences deduction (R$). */
  absences: number
  /** Net pay (R$). */
  netPay: number
}

/** A regional senator office from `/api/v1/senadores/escritorios`. */
export interface SenadoOffice {
  /** Internal record ID. */
  id: string
  /** Senator API code (`codSenador`). */
  senatorId: string
  /** Senator display name. */
  senatorName: string
  /** Office street address. */
  address: string
  /** City. */
  city: string
  /** UF. */
  uf: string
  /** Office phone (may be empty). */
  phone?: string
  /** Email contact (may be empty). */
  email?: string
}

/** A monthly housing-aid record from `/api/v1/senadores/auxilio-moradia`. */
export interface SenadoHousingAid {
  /** Senator API code. */
  senatorId: string
  /** Senator display name. */
  senatorName: string
  /** Reference year. */
  year: number
  /** Reference month (1–12). */
  month: number
  /** Amount paid in BRL. */
  amount: number
}

/** Pre-aggregated housing-aid summary across senators for a year. */
export interface SenadoHousingAidSummary {
  /** Reference year. */
  year: number
  /** Total housing aid disbursed across all senators in BRL. */
  totalAmount: number
  /** Number of senators who received any aid in the year. */
  uniqueSenators: number
  /** Per-senator totals sorted descending by amount. */
  bySenator: Array<{
    senatorId: string
    senatorName: string
    months: number
    total: number
  }>
  /** Raw monthly rows for downstream filtering. */
  rows: SenadoHousingAid[]
}

/** A presidential veto entry from `GET /materia/vetos/{ano}`. */
export interface SenadoVeto {
  /** Veto code/ID. */
  id: string
  /** Veto formal identifier (e.g. "VET 38/2024"). */
  identifier: string
  /** Year of the veto. */
  year: number
  /** Veto number within the year. */
  number: number
  /** ISO date when published in DOU. */
  publicationDate?: string
  /** Original matter that was vetoed (e.g. "PL 1234/2024"). */
  originMatter?: string
  /** Subject summary. */
  summary?: string
  /** Veto type ("Total", "Parcial"). */
  type?: string
  /** Current legislative status text. */
  status?: string
}

/** A parliamentary party currently represented in the Senate. */
export interface SenadoPartyEntry {
  /** Party abbreviation (e.g. "PT"). */
  abbreviation: string
  /** Full party name. */
  name?: string
  /** Number of senators currently affiliated. */
  benchSize?: number
}

/** A parliamentary bloc from `GET /dados/ListaBlocoParlamentar.json`. */
export interface SenadoBloc {
  /** Bloc ID. */
  id: string
  /** Bloc name. */
  name: string
  /** Bloc abbreviation/sigla. */
  abbreviation?: string
  /** ISO date when the bloc was created. */
  creationDate?: string
  /** Member parties (abbreviations). */
  parties: string[]
  /** Total senators across member parties. */
  totalMembers?: number
}

/**
 * Active leadership composition entry from
 * `GET /composicao/lideranca`.
 */
export interface SenadoLeadershipEntry {
  /** Senator code holding the leadership role. */
  senatorId: string
  /** Senator display name. */
  senatorName: string
  /** Leadership unit abbreviation (party, bloc, "Governo", etc.). */
  unitAbbreviation: string
  /** Full unit name. */
  unitName?: string
  /** Type of leadership unit ("Partido", "Bloco", "Governo", etc.). */
  unitType?: string
  /** Role (e.g. "Líder", "Vice-Líder"). */
  role: string
  /** ISO start date. */
  startDate?: string
}

/** A contract amendment (aditivo) from `/contratos/{id}/aditivos`. */
export interface SenadoContractAmendment {
  /** Internal amendment ID. */
  id: string
  /** Amendment number. */
  number: string
  /** Amendment type (e.g. "Aditivo de prazo", "Aditivo de valor"). */
  type: string
  /** ISO date when signed. */
  signatureDate: string
  /** Optional value impact (R$). */
  valueImpact?: number
  /** Optional new end date for term-extension amendments. */
  newEndDate?: string
  /** Description of the amendment object. */
  object?: string
}

/** An outsourced worker (terceirizado) from `/contratacoes/terceirizados`. */
export interface SenadoOutsourcedWorker {
  /** Internal record ID. */
  id: string
  /** Worker name. */
  name: string
  /** Function/role description. */
  role: string
  /** Contracting company. */
  companyName: string
  /** Senate department where the worker is assigned. */
  departmentName?: string
  /** Whether the assignment is currently active. */
  isActive: boolean
}

/** A purchase order (nota de empenho) from `/contratacoes/notas_empenho`. */
export interface SenadoPurchaseOrder {
  /** Internal order ID. */
  id: string
  /** Order number (e.g. "2025NE000123"). */
  number: string
  /** ISO issue date. */
  issueDate: string
  /** Supplier name. */
  supplierName: string
  /** Supplier CNPJ/CPF. */
  supplierDocument?: string
  /** Total committed value (R$). */
  amount: number
  /** Linked contract identifier (may be empty for direct purchases). */
  contractNumber?: string
  /** Description of the underlying expense. */
  description: string
}

/** A plenary agenda item from `/plenario/agenda/dia/{...}` or `/mes/{...}`. */
export interface SenadoAgendaItem {
  /** ISO date of the planned session. */
  date: string
  /** Session type description. */
  sessionType?: string
  /** Free-form description / topic. */
  description: string
  /** Affected matter identifier when present. */
  matterIdentifier?: string
  /** Affected matter id (linkable to `/processo/{id}`). */
  matterId?: string
}

/** A taquigrafia transcript record. */
export interface SenadoTaquigrafia {
  /** Session/meeting ID. */
  sessionId: string
  /** Whether this is a session (plenary) or committee meeting. */
  kind: "sessao" | "reuniao"
  /** ISO date of the event. */
  date?: string
  /** URL to the full notes (PDF or HTML). */
  notesUrl?: string
  /** URL to the video stream. */
  videoUrl?: string
  /** Title or short description. */
  title?: string
}

/** Pre-aggregated monthly remuneration summary cached in Redis. */
export interface SenadoRemunerationSummary {
  /** Reference year. */
  year: number
  /** Reference month (1–12). */
  month: number
  /** Total payroll for the month (sum of net pay). */
  totalNetPay: number
  /** Total base salary for the month. */
  totalBaseSalary: number
  /** Total commissioned-staff payroll (servants whose bond is COMISSIONADO). */
  totalCommissionedPay: number
  /** Headcount of paid servants in this month. */
  paidHeadcount: number
  /** All individual remuneration rows. */
  rows: SenadoServantRemuneration[]
  /** Timestamp when this summary was computed (ISO). */
  lastUpdated: string
}
