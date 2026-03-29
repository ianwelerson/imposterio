/**
 * @file presence-pay-ratio.ts
 * @description Computes the ratio of travel/accommodation CEAP spending to
 * plenary attendance days — i.e. how much a deputy spent per attended session.
 *
 * This metric answers: "How much taxpayer money was spent on travel for each
 * day the deputy actually showed up to work?"
 *
 * Pure function — operates on pre-fetched expense and event data.
 */

import type { DeputyExpense } from "@imposterio/types"
import type { DeputyAttendanceEvent } from "@imposterio/fetchers"

// ── Constants ───────────────────────────────────────────────────────

/** CEAP categories considered travel/accommodation related. */
const TRAVEL_CATEGORIES = new Set([
  "PASSAGENS AÉREAS",
  "HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL",
  "COMBUSTÍVEIS E LUBRIFICANTES",
  "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
])

// ── Types ───────────────────────────────────────────────────────────

/** Result of the presence-to-pay ratio analysis. */
export interface PresencePayRatioResult {
  /** Total travel/accommodation spending (BRL). */
  totalTravelSpend: number
  /** Number of unique plenary attendance days. */
  attendanceDays: number
  /** Cost per attended session (BRL/day). 0 if no attendance. */
  costPerSession: number
  /**
   * Plain-language interpretation in Brazilian Portuguese for the UI.
   * E.g. "Este deputado gastou R$ 1.234,56 em deslocamento para cada dia
   * em que compareceu ao plenário."
   */
  interpretation: string
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Formats a number as Brazilian Real currency string.
 */
function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/**
 * Computes the travel cost per attended plenary session day.
 *
 * Filters expenses to travel/accommodation CEAP categories, counts unique
 * attendance dates from events, and divides total travel spend by attendance
 * count.
 *
 * @param expenses - Deputy's full expense list for a given year
 * @param plenaryEvents - Deputy's plenary attendance events (already filtered to
 *   mandatory plenary types: Sessão Deliberativa, Sessão Preparatória)
 * @returns Ratio analysis with BRL/day cost and PT-BR interpretation
 *
 * @example
 * ```typescript
 * const result = analyzePresencePayRatio(expenses, plenaryEvents)
 * console.log(result.costPerSession) // 2345.67
 * console.log(result.interpretation) // "Este deputado gastou R$ 2.345,67..."
 * ```
 */
export function analyzePresencePayRatio(
  expenses: DeputyExpense[],
  plenaryEvents: DeputyAttendanceEvent[],
): PresencePayRatioResult {
  // Sum travel/accommodation expenses
  let totalTravelSpend = 0
  for (const expense of expenses) {
    if (TRAVEL_CATEGORIES.has(expense.type)) {
      totalTravelSpend += expense.value
    }
  }

  // Count unique plenary attendance days
  const attendedDates = new Set<string>()
  for (const event of plenaryEvents) {
    if (event.date) {
      attendedDates.add(event.date.slice(0, 10))
    }
  }

  const attendanceDays = attendedDates.size
  const costPerSession = attendanceDays > 0
    ? Math.round((totalTravelSpend / attendanceDays) * 100) / 100
    : 0

  let interpretation: string
  if (attendanceDays === 0 && totalTravelSpend === 0) {
    interpretation = "Sem dados de deslocamento ou presença para o período."
  } else if (attendanceDays === 0) {
    interpretation =
      `Este deputado gastou ${formatBrl(totalTravelSpend)} em deslocamento ` +
      "mas não teve presença registrada no período."
  } else {
    interpretation =
      `Este deputado gastou ${formatBrl(costPerSession)} em deslocamento ` +
      `para cada dia em que compareceu ao plenário (${attendanceDays} dias).`
  }

  return {
    totalTravelSpend,
    attendanceDays,
    costPerSession,
    interpretation,
  }
}
