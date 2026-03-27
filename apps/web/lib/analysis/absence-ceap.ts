/**
 * @file absence-ceap.ts
 * @description Cross-references CEAP travel/accommodation expenses against
 * plenary attendance to flag days where a deputy claimed reimbursement but
 * had zero recorded presence.
 *
 * Pure function — operates exclusively on pre-fetched data. Does not make
 * API calls or access Redis.
 *
 * Business logic: a "flagged day" is one where the deputy filed at least one
 * expense in a travel-related CEAP category AND has no attendance record for
 * any plenary event on that date.
 */

import type { DeputyExpense, DeputyEvent } from "@imposterio/types"

// ── Constants ───────────────────────────────────────────────────────

/**
 * CEAP expense types that are travel or accommodation related.
 * These are the categories where absence cross-referencing is meaningful —
 * if a deputy is paying for flights or hotels, they should be present.
 */
const TRAVEL_CATEGORIES = new Set([
  "PASSAGENS AÉREAS",
  "HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL",
  "COMBUSTÍVEIS E LUBRIFICANTES",
  "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
])

// ── Types ───────────────────────────────────────────────────────────

/** A single day flagged for absence despite travel/accommodation expenses. */
export interface FlaggedAbsenceDay {
  /** ISO date (YYYY-MM-DD) of the flagged day. */
  date: string
  /** Total expense amount for travel categories on this day (BRL). */
  amount: number
  /** CEAP category of the expenses. */
  types: string[]
  /** Supplier names associated with the expenses. */
  suppliers: string[]
  /** Source URL(s) for the expense data. */
  _source: string
}

/** Summary of the absence × CEAP cross-reference analysis. */
export interface AbsenceCeapResult {
  /** Days where travel expenses were claimed but no attendance was recorded. */
  flaggedDays: FlaggedAbsenceDay[]
  /** Total BRL amount across all flagged days. */
  totalFlaggedAmount: number
  /** Number of unique flagged days. */
  flaggedDayCount: number
  /** Total travel/accommodation expense days (flagged + attended). */
  totalTravelDays: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Identifies days where a deputy claimed travel/accommodation CEAP expenses
 * but had zero recorded plenary attendance events.
 *
 * The function groups expenses by date, filters to travel-related CEAP
 * categories, builds a set of attended dates from events, then flags any
 * travel-expense date not found in the attendance set.
 *
 * @param expenses - Deputy's full expense list for a given year
 * @param events - Deputy's plenary events for the same year
 * @param expenseSource - The `_source` URL from the expense data
 * @returns Cross-reference result with flagged days and summary
 *
 * @example
 * ```typescript
 * const result = analyzeAbsenceCeap(expenses, events, expenses._source)
 * console.log(result.flaggedDayCount) // 12
 * console.log(result.totalFlaggedAmount) // 45_678.90
 * ```
 */
export function analyzeAbsenceCeap(
  expenses: DeputyExpense[],
  events: DeputyEvent[],
  expenseSource: string,
): AbsenceCeapResult {
  // Build a set of dates where the deputy attended any event
  const attendedDates = new Set<string>()
  for (const event of events) {
    if (event.startTime) {
      attendedDates.add(event.startTime.slice(0, 10))
    }
  }

  // Group travel expenses by date
  const travelByDate = new Map<string, {
    amount: number
    types: Set<string>
    suppliers: Set<string>
  }>()

  for (const expense of expenses) {
    if (!TRAVEL_CATEGORIES.has(expense.type)) continue

    const date = expense.date.slice(0, 10)
    const existing = travelByDate.get(date)

    if (existing) {
      existing.amount += expense.value
      existing.types.add(expense.type)
      existing.suppliers.add(expense.supplierName)
    } else {
      travelByDate.set(date, {
        amount: expense.value,
        types: new Set([expense.type]),
        suppliers: new Set([expense.supplierName]),
      })
    }
  }

  // Flag days with travel expenses but no attendance
  const flaggedDays: FlaggedAbsenceDay[] = []

  for (const [date, data] of travelByDate) {
    if (!attendedDates.has(date)) {
      flaggedDays.push({
        date,
        amount: data.amount,
        types: Array.from(data.types),
        suppliers: Array.from(data.suppliers),
        _source: expenseSource,
      })
    }
  }

  // Sort by date ascending
  flaggedDays.sort((a, b) => a.date.localeCompare(b.date))

  const totalFlaggedAmount = flaggedDays.reduce((sum, d) => sum + d.amount, 0)

  return {
    flaggedDays,
    totalFlaggedAmount,
    flaggedDayCount: flaggedDays.length,
    totalTravelDays: travelByDate.size,
  }
}
