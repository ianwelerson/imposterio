/**
 * @file expense-utils.ts
 * @description Pure utility functions for processing deputy expense data.
 * Not a client component — safe to import from server components.
 *
 * All numeric computations delegate to or are validated by the shared
 * calc library (@/lib/calc). Runtime guards catch regressions before
 * data reaches the UI.
 */

import { assertNonNegative, assertSubtotalsMatch, assertTwelveMonths } from "@/lib/calc"

export interface MonthlyExpense {
  month: number
  total: number
}

export interface CategoryExpense {
  name: string
  value: number
}

export interface SupplierExpense {
  label: string
  value: number
  /** Supplier's CPF or CNPJ document number (from supplierDocument). */
  document?: string
}

/**
 * Aggregates raw expense records into monthly totals for charting.
 * Groups by the month extracted from each expense's date field
 * and sums the values.
 */
export function aggregateByMonth(
  expenses: Array<{ date: string; value: number }>,
): MonthlyExpense[] {
  const byMonth = new Map<number, number>()
  for (const e of expenses) {
    const month = new Date(e.date).getMonth() + 1
    byMonth.set(month, (byMonth.get(month) ?? 0) + e.value)
  }
  const result = Array.from(byMonth.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month - b.month)
  assertNonNegative(result.map((r) => r.total), "expense aggregateByMonth")
  return result
}

/**
 * Aggregates expenses by category (type) for a pie chart.
 * Returns all categories sorted by value descending.
 */
export function aggregateByCategory(
  expenses: Array<{ type: string; value: number }>,
): CategoryExpense[] {
  const byType = new Map<string, number>()
  for (const e of expenses) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + e.value)
  }
  const result = Array.from(byType.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  assertNonNegative(result.map((r) => r.value), "expense aggregateByCategory")
  return result
}

/**
 * Aggregates expenses by supplier and returns the top N.
 * Useful for a horizontal bar chart showing biggest suppliers.
 *
 * @param expenses - Expense records with supplier and value
 * @param limit    - Maximum number of suppliers to return. @default 10
 */
export function aggregateBySupplier(
  expenses: Array<{ supplierName: string; supplierDocument?: string; value: number }>,
  limit = 10,
): SupplierExpense[] {
  const bySupplier = new Map<string, { total: number; document?: string }>()
  for (const e of expenses) {
    if (!e.supplierName) continue
    const existing = bySupplier.get(e.supplierName)
    if (existing) {
      existing.total += e.value
      // Keep the first non-empty document found for this supplier
      if (!existing.document && e.supplierDocument) {
        existing.document = e.supplierDocument
      }
    } else {
      bySupplier.set(e.supplierName, { total: e.value, document: e.supplierDocument })
    }
  }
  return Array.from(bySupplier.entries())
    .map(([label, { total, document }]) => ({ label, value: total, document }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * Builds bar chart data for monthly expense totals.
 * Uses short Portuguese month labels.
 */
export function monthlyToBarData(
  monthly: MonthlyExpense[],
): Array<{ label: string; value: number }> {
  const labels = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ]
  return monthly.map((m) => ({
    label: labels[m.month - 1],
    value: m.total,
  }))
}

export interface DailyExpenseAgg {
  date: string
  value: number
}

/**
 * Aggregates expenses by date (YYYY-MM-DD) for a calendar heatmap.
 * Multiple expenses on the same day are summed together.
 */
export function aggregateByDay(
  expenses: Array<{ date: string; value: number }>,
): DailyExpenseAgg[] {
  const byDay = new Map<string, number>()
  for (const e of expenses) {
    const day = e.date.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + e.value)
  }
  return Array.from(byDay.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface CategorySupplierRow {
  category: string
  [supplier: string]: string | number
}

export interface CategorySupplierResult {
  rows: CategorySupplierRow[]
  suppliers: Array<{ key: string; name: string; color: string }>
}

/**
 * Builds a cross-tabulation of category × supplier for a stacked bar chart.
 * Each row represents a category, with supplier keys holding numeric values.
 *
 * Only includes the top N suppliers by total value to keep the chart readable.
 * All remaining suppliers are grouped under "Outros".
 *
 * @param expenses - Raw expense records
 * @param topN    - Number of top suppliers to show individually. @default 6
 */
export function aggregateCategoryBySupplier(
  expenses: Array<{ type: string; supplierName: string; value: number }>,
  topN = 6,
): CategorySupplierResult {
  // Step 1: find top N suppliers globally
  const supplierTotals = new Map<string, number>()
  for (const e of expenses) {
    if (!e.supplierName) continue
    supplierTotals.set(e.supplierName, (supplierTotals.get(e.supplierName) ?? 0) + e.value)
  }
  const topSuppliers = Array.from(supplierTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name)

  const topSet = new Set(topSuppliers)

  // Step 2: build category × supplier matrix
  const matrix = new Map<string, Map<string, number>>()
  for (const e of expenses) {
    const cat = e.type
    if (!matrix.has(cat)) matrix.set(cat, new Map())
    const row = matrix.get(cat)!
    const key = topSet.has(e.supplierName) ? e.supplierName : "Outros"
    row.set(key, (row.get(key) ?? 0) + e.value)
  }

  // Step 3: build result
  const allKeys = [...topSuppliers]
  // Only add "Outros" if there are suppliers outside the top N
  const hasOthers = Array.from(matrix.values()).some((row) => row.has("Outros"))
  if (hasOthers) allKeys.push("Outros")

  const rows: CategorySupplierRow[] = Array.from(matrix.entries())
    .map(([category, supplierMap]) => {
      const row: CategorySupplierRow = { category }
      for (const key of allKeys) {
        row[key] = supplierMap.get(key) ?? 0
      }
      return row
    })
    .sort((a, b) => {
      const totalA = allKeys.reduce((s, k) => s + (Number(a[k]) || 0), 0)
      const totalB = allKeys.reduce((s, k) => s + (Number(b[k]) || 0), 0)
      return totalB - totalA
    })

  const COLORS = [
    "#4f46e5", "#f59e0b", "#10b981", "#ef4444",
    "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
    "#14b8a6", "#6366f1", "#84cc16", "#a855f7",
  ]

  const suppliers = allKeys.map((name, i) => ({
    key: name,
    name,
    color: COLORS[i % COLORS.length],
  }))

  return { rows, suppliers }
}
