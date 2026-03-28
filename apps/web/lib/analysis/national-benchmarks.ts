/**
 * @file national-benchmarks.ts
 * @description Computes national benchmark averages from already-cached bulk data.
 *
 * All inputs come from data already fetched and cached (ceapBulk, attendance).
 * No additional API calls are made — this is a pure computation module.
 */

import type { CeapBulkDeputy } from "@imposterio/fetchers"

/** Benchmark averages for contextualizing individual deputy metrics. */
export interface NationalBenchmarks {
  /** National average CEAP spending per deputy (BRL). */
  ceapNationalAverage: number
  /** Percentage above/below national average (positive = above). */
  ceapVsNationalPercent: number
  /** National average plenary attendance percentage. */
  plenaryAttendanceNationalAverage: number | null
  /** Average legislative efficiency score across all deputies. */
  legislativeEfficiencyAverage: number | null
}

/**
 * Computes national CEAP average from bulk deputy data.
 *
 * @param deputies - All deputies from the bulk CEAP summary
 * @param deputyTotal - This deputy's total CEAP spending
 * @returns Object with national average and vs-average percentage
 */
export function computeCeapBenchmarks(
  deputies: CeapBulkDeputy[],
  deputyTotal: number,
): { nationalAverage: number; vsNationalPercent: number } {
  if (deputies.length === 0) {
    return { nationalAverage: 0, vsNationalPercent: 0 }
  }

  const totalAll = deputies.reduce((sum, d) => sum + d.total, 0)
  const nationalAverage = totalAll / deputies.length

  const vsNationalPercent = nationalAverage > 0
    ? ((deputyTotal - nationalAverage) / nationalAverage) * 100
    : 0

  return { nationalAverage, vsNationalPercent }
}

/**
 * Computes national average plenary attendance from bulk attendance data.
 *
 * @param deputyAttendances - Array of { attended, total } per deputy
 * @returns Average attendance percentage, or null if no data
 */
export function computeAttendanceBenchmark(
  deputyAttendances: Array<{ attended: number; total: number }>,
): number | null {
  const valid = deputyAttendances.filter((d) => d.total > 0)
  if (valid.length === 0) return null

  const totalPercent = valid.reduce(
    (sum, d) => sum + (d.attended / d.total) * 100,
    0,
  )
  return Math.round((totalPercent / valid.length) * 10) / 10
}
