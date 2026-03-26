/**
 * @file calc/variation.ts
 * @description Year-over-year and period comparison calculations.
 *
 * Used by comparison pages and detail pages to show how values changed
 * between periods. All functions guard against zero/missing baselines.
 */

import { MONTH_LABELS } from "./aggregation"

/**
 * Computes the year-over-year variation as a percentage.
 * Positive = increase, negative = decrease, 0 = no change.
 *
 * Returns null when the baseline (previous) value is 0, because
 * a percentage change from zero is mathematically undefined and
 * would be misleading to users.
 *
 * @param current  - Value for the current period
 * @param previous - Value for the previous period (baseline)
 * @returns Percentage change (e.g. 15.3 for +15.3%), or null if undefined
 *
 * @example
 * yearOverYearChange(115, 100)  // 15
 * yearOverYearChange(80, 100)   // -20
 * yearOverYearChange(100, 0)    // null
 * yearOverYearChange(0, 0)      // null
 */
export function yearOverYearChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Builds a 12-month comparison dataset for year-over-year charts.
 * Each entry has a month label plus values for the current and previous year.
 *
 * Only includes months up to the latest month with data in either year,
 * so future months don't appear as misleading zeroes.
 *
 * @param currentYear  - Monthly values for the selected year (month: 1-indexed)
 * @param previousYear - Monthly values for the year before
 * @returns Chart-ready array with { label, current, previous } per month
 */
export function buildYearComparison(
  currentYear: Array<{ month: number; total: number }>,
  previousYear: Array<{ month: number; total: number }>,
): Array<{ label: string; current: number; previous: number }> {
  const data = MONTH_LABELS.map((label, i) => {
    const month = i + 1
    const cur = currentYear.find((m) => m.month === month)
    const prev = previousYear.find((m) => m.month === month)
    return {
      label,
      current: cur?.total ?? 0,
      previous: prev?.total ?? 0,
    }
  })

  // Find the last month with data in either year
  const lastMonth = Math.max(
    ...currentYear.map((m) => m.month),
    ...previousYear.map((m) => m.month),
    1,
  )

  return data.slice(0, lastMonth)
}

/**
 * Merges multiple named series of monthly data into a single dataset
 * suitable for multi-series line charts.
 *
 * Each item in the result has a `label` (month abbreviation) plus one key
 * per series containing that series' value for the month.
 *
 * @param seriesData - Array of { name, values } where values maps month (0-indexed) to a number
 * @returns 12-element array with one row per month
 */
export function mergeMonthlySeriesFromBuckets(
  seriesData: Array<{ name: string; byMonth: number[] }>,
): Record<string, unknown>[] {
  return MONTH_LABELS.map((label, i) => {
    const row: Record<string, unknown> = { label }
    for (const { name, byMonth } of seriesData) {
      row[name] = Math.round((byMonth[i] ?? 0) * 100) / 100
    }
    return row
  })
}
