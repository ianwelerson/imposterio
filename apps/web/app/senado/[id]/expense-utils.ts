/**
 * @file expense-utils.ts
 * @description Pure utility functions for processing senator CEAPS expense data.
 * Not a client component — safe to import from server components.
 *
 * Functions are structurally typed on `{ date, value, type, supplierName,
 * supplierDocument }`, so they work on both `DeputyExpense` and
 * `SenatorExpense`. The Câmara variant is duplicated rather than imported
 * to keep each institution's utils self-contained — matches the existing
 * Câmara pattern and lets the two diverge if institution-specific math is
 * later required.
 */

import { assertNonNegative, assertTwelveMonths } from "@/lib/calc"

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
  /** Supplier's CPF or CNPJ document number. */
  document?: string
}

/**
 * Aggregates raw expense records into monthly totals.
 *
 * Accepts any record with a `date` (ISO or YYYY-MM-DD) and a numeric `value`.
 */
export function aggregateByMonth(
  expenses: Array<{ date: string; value: number }>,
): MonthlyExpense[] {
  const byMonth = new Map<number, number>()
  for (const e of expenses) {
    if (!e.date) continue
    const month = new Date(e.date).getMonth() + 1
    if (Number.isNaN(month)) continue
    byMonth.set(month, (byMonth.get(month) ?? 0) + e.value)
  }
  const result = Array.from(byMonth.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month - b.month)
  assertNonNegative(
    result.map((r) => r.total),
    "expense aggregateByMonth",
  )
  return result
}

/** Aggregates expenses by category sorted by value descending. */
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
  assertNonNegative(
    result.map((r) => r.value),
    "expense aggregateByCategory",
  )
  return result
}

/** Aggregates expenses by supplier and returns the top N. */
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

/** Builds bar chart data with short Portuguese month labels (always 12 buckets). */
export function monthlyToBarData(
  monthly: MonthlyExpense[],
): Array<{ label: string; value: number }> {
  const labels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ]
  // Fill missing months with zero so charts always show a full year.
  const byMonth = new Map(monthly.map((m) => [m.month, m.total]))
  const result = labels.map((label, i) => ({
    label,
    value: byMonth.get(i + 1) ?? 0,
  }))
  assertTwelveMonths(result, "expense monthlyToBarData")
  return result
}

export interface DailyExpenseAgg {
  date: string
  value: number
}

/** Aggregates expenses by date (YYYY-MM-DD) for a calendar heatmap. */
export function aggregateByDay(
  expenses: Array<{ date: string; value: number }>,
): DailyExpenseAgg[] {
  const byDay = new Map<string, number>()
  for (const e of expenses) {
    if (!e.date) continue
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
 * Cross-tabulates category × supplier for a stacked bar chart.
 *
 * Suppliers outside the top N are grouped under "Outros".
 */
export function aggregateCategoryBySupplier(
  expenses: Array<{ type: string; supplierName: string; value: number }>,
  topN = 6,
): CategorySupplierResult {
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

  const matrix = new Map<string, Map<string, number>>()
  for (const e of expenses) {
    const cat = e.type
    if (!matrix.has(cat)) matrix.set(cat, new Map())
    const row = matrix.get(cat)!
    const key = topSet.has(e.supplierName) ? e.supplierName : "Outros"
    row.set(key, (row.get(key) ?? 0) + e.value)
  }

  const allKeys = [...topSuppliers]
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
    "#4f46e5",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
    "#84cc16",
    "#a855f7",
  ]

  const suppliers = allKeys.map((name, i) => ({
    key: name,
    name,
    color: COLORS[i % COLORS.length],
  }))

  return { rows, suppliers }
}

/** Sums all expense values. */
export function totalSpending(expenses: Array<{ value: number }>): number {
  return expenses.reduce((acc, e) => acc + e.value, 0)
}
