/**
 * @file procurement.ts
 * @description Shared TypeScript types for Câmara dos Deputados procurement data.
 *
 * These types model the data from the bulk procurement files published by the
 * Câmara at dadosabertos.camara.leg.br/arquivos/licitacoes/. Four separate files
 * are cross-referenced by procurement ID (idLicitacao):
 *
 * - licitacoes-{year}.json — main procurement processes
 * - licitacoesContratos-{year}.json — contracts awarded
 * - licitacoesItens-{year}.json — individual line items
 * - licitacoesPedidos-{year}.json — originating purchase requests
 *
 * All types that reach the frontend include `_source` via `WithSource<T>`.
 */

// ── Procurement processes ────────────────────────────────────────────

/** A single procurement process from the yearly bulk file. */
export interface CamaraProcurement {
  /** Internal procurement ID (idLicitacao). */
  id: string
  /** Process number. */
  number: number
  /** Year of the procurement. */
  year: number
  /** Administrative process number (numProcesso). */
  processNumber: number
  /** Object description — what is being procured. */
  object: string
  /** Modality: "Pregão Eletrônico", "Concorrência", "Dispensa", etc. */
  modality: string
  /** Type: "Menor Preço", "Melhor Técnica", etc. */
  type: string
  /** Current status: "Encerrada", "Homologada", "Instrumento convocatório publicado", etc. */
  status: string
  /** Estimated value in BRL. */
  estimatedValue: number
  /** Contracted value in BRL. */
  contractedValue: number
  /** Amount paid to date in BRL. */
  paidValue: number
  /** Authorization date (ISO). */
  authorizationDate: string
  /** Publication date (ISO). */
  publicationDate: string
  /** Bid opening date (ISO, may be empty). */
  openingDate: string
  /** Number of items in the bid. */
  itemCount: number
  /** Number of requesting units. */
  unitCount: number
  /** Number of proposals/bids received. */
  proposalCount: number
  /** Number of contracts awarded. */
  contractCount: number
}

// ── Contracts ────────────────────────────────────────────────────────

/** A contract resulting from a procurement process. */
export interface CamaraProcurementContract {
  /** Linked procurement ID (idLicitacao). */
  procurementId: string
  /** Procurement year. */
  procurementYear: number
  /** Contract number. */
  contractNumber: number
  /** Contract year. */
  contractYear: number
  /** Contract type: "Contrato", "Ata de Registro de Preços", etc. */
  contractType: string
  /** Status: "Vigente", "Encerrado", etc. */
  status: string
  /** Object description. */
  object: string
  /** Original contract value in BRL. */
  originalValue: number
  /** Current total value (with amendments) in BRL. */
  totalValue: number
  /** Signature date (ISO). */
  signatureDate: string
  /** Publication date (ISO). */
  publicationDate: string
  /** Validity start date (ISO). */
  startDate: string
  /** Original end date (ISO). */
  endDate: string
  /** Latest end date after extensions (ISO). */
  latestEndDate: string
  /** Supplier/contractor CNPJ or CPF. */
  supplierDocument: string
  /** Supplier name. */
  supplierName: string
  /** Supplier city. */
  supplierCity: string
  /** Supplier state abbreviation. */
  supplierUF: string
}

// ── Items ────────────────────────────────────────────────────────────

/** An individual item within a procurement. */
export interface CamaraProcurementItem {
  /** Linked procurement ID (idLicitacao). */
  procurementId: string
  /** Procurement year. */
  procurementYear: number
  /** Item number within the procurement. */
  itemNumber: number
  /** Sub-item number (for grouped items). */
  subItemNumber: number
  /** Item description. */
  description: string
  /** Technical specification (may be very long). */
  specification: string
  /** Unit of measure: "UNIDADE", "PEÇA", "SERVIÇO", etc. */
  unit: string
  /** Quantity tendered. */
  quantityBid: number
  /** Quantity contracted (0 if not yet awarded). */
  quantityContracted: number
  /** Estimated unit price in BRL. */
  estimatedPrice: number
  /** Contracted unit price in BRL (0 if not yet awarded). */
  contractedPrice: number
  /** Total contracted value in BRL. */
  totalContracted: number
  /** Winning supplier CNPJ/CPF (empty if not yet awarded). */
  supplierDocument: string
  /** Winning supplier name (empty if not yet awarded). */
  supplierName: string
  /** Item status: "Ativo", "Destacado", etc. */
  status: string
  /** Expense nature classification. */
  expenseNature: string
}

// ── Requests ─────────────────────────────────────────────────────────

/** A purchase request that originated a procurement. */
export interface CamaraProcurementRequest {
  /** Linked procurement ID (idLicitacao). */
  procurementId: string
  /** Procurement year. */
  procurementYear: number
  /** Request number. */
  requestNumber: number
  /** Request year. */
  requestYear: number
  /** Registration date/time (ISO). */
  registrationDate: string
  /** Requesting organ/department ID. */
  organId: number
  /** Requesting organ/department name. */
  organ: string
  /** Object description. */
  object: string
  /** Observations and history notes. */
  observations: string
}

// ── Aggregated summaries ─────────────────────────────────────────────

/** Pre-aggregated procurement summary cached in Redis. */
export interface ProcurementBulkSummary {
  /** Total number of procurement processes. */
  totalProcurements: number
  /** Sum of all estimated values. */
  totalEstimatedValue: number
  /** Sum of all contracted values. */
  totalContractedValue: number
  /** Sum of all paid values. */
  totalPaidValue: number
  /** Total number of contracts. */
  totalContracts: number
  /** Procurements grouped by modality with count and value. */
  byModality: Array<{ name: string; count: number; value: number }>
  /** Procurements grouped by status with count. */
  byStatus: Array<{ name: string; count: number }>
  /** Top suppliers by contracted value. */
  topSuppliers: Array<{ name: string; document: string; value: number; contractCount: number }>
  /** All procurement records. */
  procurements: CamaraProcurement[]
  /** All contract records. */
  contracts: CamaraProcurementContract[]
  /** Timestamp when this summary was computed (ISO). */
  lastUpdated: string
}

/** Full procurement detail with linked contracts, items, and requests. */
export interface ProcurementDetail {
  /** The procurement process. */
  procurement: CamaraProcurement
  /** Contracts awarded for this procurement. */
  contracts: CamaraProcurementContract[]
  /** Individual line items. */
  items: CamaraProcurementItem[]
  /** Originating purchase requests. */
  requests: CamaraProcurementRequest[]
}
