/**
 * @file ceap-concentration.ts
 * @description Computes supplier concentration in a deputy's CEAP expenses.
 *
 * A high concentration score indicates that a disproportionate share of a
 * deputy's expense budget flows to a single supplier. This can be a red flag
 * for favoritism, vendor lock-in, or potential fraud — a score above 70
 * means that more than 70% of all CEAP spending goes to one supplier, which
 * is considered anomalous because public spending should generally be
 * distributed across multiple vendors to promote competition and transparency.
 *
 * Pure function — operates on pre-fetched expense data only.
 */

import type { DeputyExpense } from "@imposterio/types"
import { safePercent } from "@/lib/calc"

// ── Types ───────────────────────────────────────────────────────────

/**
 * Result of the CEAP supplier concentration analysis.
 *
 * @property supplierName - Name of the top supplier by total value
 * @property supplierDocument - CNPJ or CPF of the top supplier
 * @property amount - Total amount paid to the top supplier (BRL)
 * @property percentage - Share of total CEAP going to the top supplier (0–100)
 * @property concentrationScore - Score from 0 to 100. A score above 70 is
 *   considered anomalous — it means over 70% of all CEAP spending is directed
 *   to a single supplier, which in practice suggests either a very narrow set
 *   of services being used or potential favoritism. Normal deputies typically
 *   score below 30, indicating healthy supplier diversification.
 * @property totalExpenses - Grand total of all CEAP expenses (BRL)
 */
export interface CeapConcentrationResult {
  supplierName: string
  supplierDocument: string
  amount: number
  percentage: number
  concentrationScore: number
  totalExpenses: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Computes what percentage of a deputy's total CEAP spending went to their
 * top supplier, returning a concentration score (0–100).
 *
 * @param expenses - Deputy's full expense list for analysis
 * @returns Concentration analysis result, or `null` if no expenses exist
 *
 * @example
 * ```typescript
 * const result = analyzeCeapConcentration(expenses)
 * if (result && result.concentrationScore > 70) {
 *   console.warn(`Anomalous concentration: ${result.supplierName}`)
 * }
 * ```
 */
export function analyzeCeapConcentration(
  expenses: DeputyExpense[],
): CeapConcentrationResult | null {
  if (expenses.length === 0) return null

  // Aggregate by supplier (using supplier document as key for uniqueness)
  const bySupplier = new Map<string, {
    name: string
    document: string
    total: number
  }>()

  let totalExpenses = 0

  for (const expense of expenses) {
    totalExpenses += expense.value

    const key = expense.supplierDocument || expense.supplierName
    const existing = bySupplier.get(key)

    if (existing) {
      existing.total += expense.value
    } else {
      bySupplier.set(key, {
        name: expense.supplierName,
        document: expense.supplierDocument,
        total: expense.value,
      })
    }
  }

  if (totalExpenses === 0) return null

  // Find the top supplier
  let topSupplier = { name: "", document: "", total: 0 }

  for (const supplier of bySupplier.values()) {
    if (supplier.total > topSupplier.total) {
      topSupplier = supplier
    }
  }

  const percentage = safePercent(topSupplier.total, totalExpenses)

  return {
    supplierName: topSupplier.name,
    supplierDocument: topSupplier.document,
    amount: topSupplier.total,
    percentage,
    concentrationScore: percentage,
    totalExpenses,
  }
}
