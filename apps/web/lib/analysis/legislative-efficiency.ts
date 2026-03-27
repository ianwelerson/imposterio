/**
 * @file legislative-efficiency.ts
 * @description Computes a deputy's legislative efficiency based on authored
 * propositions and their outcomes.
 *
 * Efficiency score = (approved ÷ total) × 100. This is a simplified metric
 * that measures how many of a deputy's proposals have been approved vs. total
 * submitted. It does not account for the quality, scope, or impact of each
 * bill, but it provides a quick comparative indicator.
 *
 * Pure function — operates on pre-fetched proposition data.
 */

import type { CamaraProposition } from "@imposterio/types"
import { safePercent } from "@/lib/calc"

// ── Constants ───────────────────────────────────────────────────────

/**
 * Status descriptions that indicate approval (case-insensitive match).
 * The Câmara API uses varied phrasing for approved propositions.
 */
const APPROVED_STATUSES = [
  "transformado em norma jurídica",
  "transformada em norma jurídica",
  "aprovado",
  "aprovada",
  "sancionado",
  "sancionada",
  "promulgado",
  "promulgada",
]

/**
 * Status descriptions that indicate rejection or archival.
 */
const REJECTED_STATUSES = [
  "arquivado",
  "arquivada",
  "rejeitado",
  "rejeitada",
  "retirado",
  "retirada",
  "devolvido",
  "devolvida",
  "prejudicado",
  "prejudicada",
]

// ── Types ───────────────────────────────────────────────────────────

/** Legislative efficiency analysis result. */
export interface LegislativeEfficiencyResult {
  /** Total number of propositions authored. */
  totalAuthored: number
  /** Number of approved propositions. */
  approved: number
  /** Number of archived or rejected propositions. */
  archivedOrRejected: number
  /** Number of propositions still pending/in progress. */
  pending: number
  /** Efficiency score: (approved ÷ total) × 100. 0 if no propositions. */
  efficiencyScore: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Determines if a proposition's status matches any of the target patterns.
 */
function matchesStatus(status: string | undefined, patterns: string[]): boolean {
  if (!status) return false
  const lower = status.toLowerCase()
  return patterns.some((p) => lower.includes(p))
}

/**
 * Computes a deputy's legislative efficiency from their authored propositions.
 *
 * Classifies each proposition into approved, archived/rejected, or pending
 * based on its `statusDescription` field. The efficiency score is the ratio
 * of approved to total propositions.
 *
 * @param propositions - Deputy's authored propositions from `getDeputadoProposicoes`
 * @returns Efficiency breakdown with score
 *
 * @example
 * ```typescript
 * const result = analyzeLegislativeEfficiency(propositions)
 * console.log(result.efficiencyScore) // 12
 * console.log(result.approved)        // 3
 * console.log(result.totalAuthored)   // 25
 * ```
 */
export function analyzeLegislativeEfficiency(
  propositions: CamaraProposition[],
): LegislativeEfficiencyResult {
  let approved = 0
  let archivedOrRejected = 0

  for (const prop of propositions) {
    if (matchesStatus(prop.statusDescription, APPROVED_STATUSES)) {
      approved++
    } else if (matchesStatus(prop.statusDescription, REJECTED_STATUSES)) {
      archivedOrRejected++
    }
  }

  const totalAuthored = propositions.length
  const pending = totalAuthored - approved - archivedOrRejected
  const efficiencyScore = safePercent(approved, totalAuthored)

  return {
    totalAuthored,
    approved,
    archivedOrRejected,
    pending,
    efficiencyScore,
  }
}
