/**
 * @file staff.ts
 * @description Shared TypeScript types for Câmara dos Deputados staff data.
 *
 * These types model the bulk staff file published at:
 * dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json
 *
 * The file contains ~15,000 records covering all Chamber staff: permanent
 * civil servants (Quadro Efetivo), parliamentary secretaries (Secretário
 * Parlamentar), special positions (Cargo de Natureza Especial), and
 * current deputies listed as "Parlamentar".
 *
 * All types that reach the frontend include `_source` via `WithSource<T>`.
 */

// ── Staff members ────────────────────────────────────────────────────

/** A single staff member from the bulk staff file. */
export interface CamaraStaffMember {
  /** Staff ID code (ponto). */
  id: string
  /** Full name. */
  name: string
  /** Group code (1–4). */
  groupCode: number
  /** Group name: "Quadro Efetivo - RJU", "Parlamentar", "Secretário Parlamentar", "Cargo de Natureza Especial". */
  group: string
  /** Job title/position (cargo). */
  position: string
  /** Department/office assignment (lotação). */
  department: string
  /** Current function/role, e.g. "FC-2 - SUPERVISOR II (C2100135)". */
  role: string
  /** Appointment act reference (may be empty). */
  appointmentAct: string
  /** Appointment date ISO (may be empty). */
  appointmentDate: string
  /** History start date ISO. */
  historyStartDate: string
  /** Publication date of appointment (may be empty). */
  appointmentPublicationDate: string
  /** URI to the department API resource (may be empty). */
  departmentUri: string
}

// ── Aggregated summaries ─────────────────────────────────────────────

/** Pre-aggregated staff summary cached in Redis. */
export interface StaffBulkSummary {
  /** Total number of staff members. */
  totalStaff: number
  /** Staff grouped by group type with count. */
  byGroup: Array<{ name: string; count: number }>
  /** Staff grouped by department (top departments). */
  byDepartment: Array<{ name: string; count: number }>
  /** Staff grouped by position (top positions). */
  byPosition: Array<{ name: string; count: number }>
  /** Staff grouped by role/function (top roles). */
  byRole: Array<{ name: string; count: number }>
  /** All individual staff records. */
  members: CamaraStaffMember[]
  /** Timestamp when this summary was computed (ISO). */
  lastUpdated: string
}
