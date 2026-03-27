/**
 * @file ceap-utilization.ts
 * @description Computes CEAP budget utilization against the Verba de Gabinete
 * monthly ceiling.
 *
 * Each deputy has a fixed monthly CEAP ceiling. This module compares actual
 * spending per month against that limit and identifies over-utilization months.
 *
 * Pure function — operates on pre-aggregated monthly expense totals.
 */

import { VERBA_DE_GABINETE_TOTAL } from "@/lib/constants/camara"
import { safePercent } from "@/lib/calc"

// ── Types ───────────────────────────────────────────────────────────

/** Per-month utilization breakdown. */
export interface MonthUtilization {
  /** Month number (1–12). */
  month: number
  /** Amount spent that month (BRL). */
  amountSpent: number
  /** Monthly budget limit (BRL). */
  budgetLimit: number
  /** Utilization percentage (0–100+; can exceed 100 if over-limit). */
  utilizationPercent: number
}

/** Full CEAP utilization result. */
export interface CeapUtilizationResult {
  /** Per-month utilization breakdown. */
  months: MonthUtilization[]
  /** Average utilization % across months with spending. */
  averageUtilization: number
  /** Month with the highest utilization percentage. Null if no spending. */
  highestMonth: MonthUtilization | null
  /** Months where spending exceeded the monthly limit. */
  overLimitMonths: MonthUtilization[]
  /** Monthly budget limit used for the calculation (BRL). */
  budgetLimit: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Computes per-month CEAP budget utilization against the Verba de Gabinete
 * monthly ceiling.
 *
 * Uses {@link VERBA_DE_GABINETE_TOTAL} as the reference budget per month.
 *
 * @param monthlyTotals - Array of `{ month, total }` with monthly expense sums.
 *   Months with zero spending may be omitted.
 * @returns Utilization analysis with per-month breakdown and summary stats
 *
 * @example
 * ```typescript
 * const monthly = aggregateByMonth(expenses)
 * const result = analyzeCeapUtilization(monthly)
 * console.log(result.averageUtilization) // 45
 * console.log(result.overLimitMonths.length) // 0
 * ```
 */
export function analyzeCeapUtilization(
  monthlyTotals: Array<{ month: number; total: number }>,
): CeapUtilizationResult {
  const budgetLimit = VERBA_DE_GABINETE_TOTAL

  const months: MonthUtilization[] = monthlyTotals.map(({ month, total }) => {
    // Use raw division instead of safePercent to allow > 100
    const utilizationPercent = budgetLimit > 0
      ? Math.round((total / budgetLimit) * 100)
      : 0

    return {
      month,
      amountSpent: total,
      budgetLimit,
      utilizationPercent,
    }
  })

  // Sort by month for consistent output
  months.sort((a, b) => a.month - b.month)

  const overLimitMonths = months.filter((m) => m.amountSpent > budgetLimit)

  const monthsWithSpending = months.filter((m) => m.amountSpent > 0)
  const averageUtilization = monthsWithSpending.length > 0
    ? safePercent(
        monthsWithSpending.reduce((sum, m) => sum + m.amountSpent, 0),
        monthsWithSpending.length * budgetLimit,
      )
    : 0

  let highestMonth: MonthUtilization | null = null
  for (const m of months) {
    if (!highestMonth || m.utilizationPercent > highestMonth.utilizationPercent) {
      highestMonth = m
    }
  }

  return {
    months,
    averageUtilization,
    highestMonth,
    overLimitMonths,
    budgetLimit,
  }
}
