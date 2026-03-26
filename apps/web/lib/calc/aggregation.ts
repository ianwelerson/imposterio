/**
 * @file calc/aggregation.ts
 * @description Generic aggregation primitives used by all domain-specific utils.
 *
 * These functions encapsulate the core group-by, sum, count, and top-N patterns
 * that appear throughout the codebase. Domain-specific util files (expense-utils,
 * activity-utils, etc.) should delegate to these primitives where applicable.
 *
 * Having these in one place ensures:
 * 1. Consistent handling of empty arrays and missing keys
 * 2. A single implementation of floating-point-safe summing
 * 3. Uniform sorting behavior (descending by value)
 */

import { roundCurrency } from "./currency"

/** Standard name→value pair returned by most aggregation functions. */
export interface CountItem {
  name: string
  value: number
}

/** Monthly bucket with Portuguese label, used by all monthly charts. */
export interface MonthlyBucket {
  label: string
  value: number
}

/** Portuguese month abbreviations, 0-indexed (Jan=0). */
export const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const

/**
 * Groups items by a string key and sums a numeric value per group.
 * Returns all groups sorted by total value descending.
 *
 * This is the fundamental building block for category/type/party aggregations.
 *
 * @param items   - Array of items to group
 * @param keyFn   - Function extracting the group key from each item
 * @param valueFn - Function extracting the numeric value from each item
 * @returns Sorted array of { name, value } pairs
 *
 * @example
 * groupBySum(expenses, e => e.type, e => e.value)
 * // [{ name: "PASSAGENS", value: 50000 }, { name: "COMBUSTÍVEL", value: 30000 }]
 */
export function groupBySum<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number,
): CountItem[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + valueFn(item))
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Groups items by a string key and counts occurrences per group.
 * Returns all groups sorted by count descending.
 *
 * @param items - Array of items to group
 * @param keyFn - Function extracting the group key from each item
 * @returns Sorted array of { name, value } pairs where value is the count
 *
 * @example
 * groupByCount(votes, v => v.vote)
 * // [{ name: "Sim", value: 120 }, { name: "Não", value: 80 }]
 */
export function groupByCount<T>(
  items: T[],
  keyFn: (item: T) => string,
): CountItem[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Buckets items into 12 monthly slots (Jan–Dec) by extracting a date string.
 * Empty months get a value of 0 so charts always show a complete year.
 *
 * @param items   - Array of items to bucket
 * @param dateFn  - Function extracting a parseable date string from each item
 * @param mode    - "count" to count items per month, "sum" to sum values
 * @param valueFn - Function extracting the numeric value (required when mode="sum")
 * @returns 12-element array of { label, value } ordered Jan through Dec
 */
export function bucketByMonth<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "count",
): MonthlyBucket[]
export function bucketByMonth<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "sum",
  valueFn: (item: T) => number,
): MonthlyBucket[]
export function bucketByMonth<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "count" | "sum",
  valueFn?: (item: T) => number,
): MonthlyBucket[] {
  const buckets = new Array(12).fill(0) as number[]

  for (const item of items) {
    const dateStr = dateFn(item)
    if (!dateStr) continue
    const month = new Date(dateStr).getMonth()
    if (month < 0 || month > 11) continue

    if (mode === "sum" && valueFn) {
      buckets[month] += valueFn(item)
    } else {
      buckets[month]++
    }
  }

  return MONTH_LABELS.map((label, i) => ({ label, value: buckets[i] }))
}

/**
 * Buckets items by day (YYYY-MM-DD) and sums or counts per day.
 * Returns only days with data, sorted chronologically.
 *
 * @param items   - Array of items to bucket
 * @param dateFn  - Function extracting a date string (at least 10 chars: YYYY-MM-DD)
 * @param mode    - "count" for occurrence counting, "sum" for value aggregation
 * @param valueFn - Function extracting the numeric value (required for mode="sum")
 * @returns Array of { date, value } sorted by date ascending
 */
export function bucketByDay<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "count",
): Array<{ date: string; value: number }>
export function bucketByDay<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "sum",
  valueFn: (item: T) => number,
): Array<{ date: string; value: number }>
export function bucketByDay<T>(
  items: T[],
  dateFn: (item: T) => string,
  mode: "count" | "sum",
  valueFn?: (item: T) => number,
): Array<{ date: string; value: number }> {
  const map = new Map<string, number>()

  for (const item of items) {
    const dateStr = dateFn(item)
    if (!dateStr) continue
    const day = dateStr.slice(0, 10)

    if (mode === "sum" && valueFn) {
      map.set(day, (map.get(day) ?? 0) + valueFn(item))
    } else {
      map.set(day, (map.get(day) ?? 0) + 1)
    }
  }

  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Takes the first N items from a pre-sorted array.
 * A named function to make the "top N" intent clear in aggregation pipelines.
 *
 * @param items - Pre-sorted array (typically by value descending)
 * @param n     - Maximum number of items to return
 * @returns Sliced array of at most n items
 */
export function topN<T>(items: T[], n: number): T[] {
  return items.slice(0, n)
}

/**
 * Sums numeric values from an array of items, using floating-point-safe rounding.
 * This is the canonical way to compute monetary totals.
 *
 * @param items   - Array of items
 * @param valueFn - Function extracting the numeric value from each item
 * @param round   - Whether to apply currency rounding (default: true)
 * @returns The total sum, optionally rounded to 2 decimal places
 *
 * @example
 * sumValues(expenses, e => e.value) // 123456.78
 */
export function sumValues<T>(
  items: T[],
  valueFn: (item: T) => number,
  round = true,
): number {
  const raw = items.reduce((sum, item) => sum + valueFn(item), 0)
  return round ? roundCurrency(raw) : raw
}
