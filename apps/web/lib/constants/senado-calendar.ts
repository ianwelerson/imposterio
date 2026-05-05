/**
 * @file senado-calendar.ts
 * @description Constitutional recess periods for the Senado Federal.
 *
 * Per Art. 57 of the Brazilian Constitution, the National Congress has two
 * annual recess periods. The Senado follows the same constitutional calendar
 * as the Câmara dos Deputados — these dates are reproduced separately here
 * for clarity and to allow institution-specific divergence in the future
 * (e.g., extraordinary sessions).
 *
 * Used to annotate Senate CalendarHeatmaps so users see why activity drops
 * to zero during certain periods.
 *
 * @see https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm (Art. 57)
 */

/**
 * A constitutional recess period defined by start and end month/day (inclusive).
 */
interface RecessPeriod {
  /** Start month (1-based: January = 1). */
  startMonth: number
  /** Start day of the month. */
  startDay: number
  /** End month (1-based: January = 1). */
  endMonth: number
  /** End day of the month. */
  endDay: number
  /** Human-readable label in Portuguese for UI display. */
  label: string
}

/**
 * The two constitutional recess periods per Art. 57 of the Brazilian Constitution.
 *
 * - Summer recess: December 23 to February 1
 * - Winter recess: July 18 to August 1
 *
 * Note: the summer recess technically starts Dec 23 of the previous year,
 * but for per-year annotation we only mark Jan 1–Feb 1 within the target year.
 */
export const SENADO_RECESS_PERIODS: readonly RecessPeriod[] = [
  { startMonth: 1, startDay: 1, endMonth: 2, endDay: 1, label: "Recesso de verão" },
  { startMonth: 7, startDay: 18, endMonth: 8, endDay: 1, label: "Recesso de inverno" },
] as const

/**
 * Returns a Set of ISO date strings (YYYY-MM-DD) that fall within
 * constitutional recess periods for the given year.
 *
 * @param year - The calendar year (e.g. 2024).
 * @returns A Set of date strings in "YYYY-MM-DD" format.
 *
 * @example
 * ```ts
 * const recess = getSenadoRecessDaysForYear(2024)
 * recess.has("2024-01-15") // true (summer recess)
 * recess.has("2024-03-10") // false (session period)
 * recess.has("2024-07-20") // true (winter recess)
 * ```
 */
export function getSenadoRecessDaysForYear(year: number): Set<string> {
  const days = new Set<string>()

  for (const period of SENADO_RECESS_PERIODS) {
    const start = new Date(year, period.startMonth - 1, period.startDay)
    const end = new Date(year, period.endMonth - 1, period.endDay)

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10)
      days.add(iso)
    }
  }

  return days
}
