/**
 * @file expense-utils.test.ts
 * @description Unit tests for deputy expense aggregation functions.
 *
 * Tests cover: monthly aggregation, category breakdown, supplier ranking,
 * bar data conversion, daily aggregation, and category×supplier cross-tabulation.
 * All date fixtures use T12:00:00 to avoid UTC/BRT timezone boundary issues.
 */

import { describe, it, expect } from "vitest"
import {
  aggregateByMonth,
  aggregateByCategory,
  aggregateBySupplier,
  monthlyToBarData,
  aggregateByDay,
  aggregateCategoryBySupplier,
} from "./expense-utils"

// ── Shared fixtures ─────────────────────────────────────────────────

const EXPENSES = [
  { date: "2024-01-15T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto Alpha", value: 500 },
  { date: "2024-01-20T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto Beta", value: 300 },
  { date: "2024-02-10T12:00:00", type: "PASSAGENS AÉREAS", supplierName: "Airline Corp", value: 2000 },
  { date: "2024-02-15T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto Alpha", value: 450 },
  { date: "2024-03-05T12:00:00", type: "ALIMENTAÇÃO", supplierName: "Restaurant X", value: 150 },
  { date: "2024-03-20T12:00:00", type: "PASSAGENS AÉREAS", supplierName: "Airline Corp", value: 1800 },
  { date: "2024-03-25T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto Alpha", value: 600 },
]

// ── aggregateByMonth ────────────────────────────────────────────────

describe("aggregateByMonth", () => {
  it("groups expenses by month and sums values", () => {
    const result = aggregateByMonth(EXPENSES)
    expect(result).toEqual([
      { month: 1, total: 800 },
      { month: 2, total: 2450 },
      { month: 3, total: 2550 },
    ])
  })

  it("returns results sorted by month ascending", () => {
    const reversed = [...EXPENSES].reverse()
    const result = aggregateByMonth(reversed)
    expect(result[0].month).toBe(1)
    expect(result[result.length - 1].month).toBe(3)
  })

  it("returns empty array for no expenses", () => {
    expect(aggregateByMonth([])).toEqual([])
  })

  it("handles single expense", () => {
    const result = aggregateByMonth([EXPENSES[0]])
    expect(result).toEqual([{ month: 1, total: 500 }])
  })

  it("sums multiple expenses on same month correctly", () => {
    const result = aggregateByMonth(EXPENSES)
    // Jan: 500 + 300 = 800
    expect(result.find((r) => r.month === 1)?.total).toBe(800)
  })

  it("subtotals sum to grand total", () => {
    const result = aggregateByMonth(EXPENSES)
    const monthSum = result.reduce((s, m) => s + m.total, 0)
    const grandTotal = EXPENSES.reduce((s, e) => s + e.value, 0)
    expect(Math.abs(monthSum - grandTotal)).toBeLessThan(0.02)
  })
})

// ── aggregateByCategory ─────────────────────────────────────────────

describe("aggregateByCategory", () => {
  it("groups expenses by type and sums values", () => {
    const result = aggregateByCategory(EXPENSES)
    expect(result).toContainEqual({ name: "PASSAGENS AÉREAS", value: 3800 })
    expect(result).toContainEqual({ name: "COMBUSTÍVEIS", value: 1850 })
    expect(result).toContainEqual({ name: "ALIMENTAÇÃO", value: 150 })
  })

  it("returns results sorted by value descending", () => {
    const result = aggregateByCategory(EXPENSES)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].value).toBeGreaterThanOrEqual(result[i].value)
    }
  })

  it("returns empty array for no expenses", () => {
    expect(aggregateByCategory([])).toEqual([])
  })

  it("category subtotals sum to grand total", () => {
    const result = aggregateByCategory(EXPENSES)
    const categorySum = result.reduce((s, c) => s + c.value, 0)
    const grandTotal = EXPENSES.reduce((s, e) => s + e.value, 0)
    expect(Math.abs(categorySum - grandTotal)).toBeLessThan(0.02)
  })

  it("preserves item count across categories", () => {
    // Each expense maps to exactly one category, so the total count of
    // category sums should equal the input count of distinct types
    const result = aggregateByCategory(EXPENSES)
    const types = new Set(EXPENSES.map((e) => e.type))
    expect(result.length).toBe(types.size)
  })
})

// ── aggregateBySupplier ─────────────────────────────────────────────

describe("aggregateBySupplier", () => {
  it("groups expenses by supplier and returns top N", () => {
    const result = aggregateBySupplier(EXPENSES, 10)
    expect(result[0]).toEqual({ label: "Airline Corp", value: 3800 })
    expect(result[1]).toEqual({ label: "Posto Alpha", value: 1550 })
  })

  it("respects limit parameter", () => {
    const result = aggregateBySupplier(EXPENSES, 2)
    expect(result.length).toBe(2)
  })

  it("returns results sorted by value descending", () => {
    const result = aggregateBySupplier(EXPENSES, 10)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].value).toBeGreaterThanOrEqual(result[i].value)
    }
  })

  it("skips expenses with empty supplierName", () => {
    const withEmpty = [
      ...EXPENSES,
      { date: "2024-04-01T12:00:00", type: "OUTROS", supplierName: "", value: 100 },
    ]
    const result = aggregateBySupplier(withEmpty, 20)
    expect(result.find((r) => r.label === "")).toBeUndefined()
  })

  it("returns empty array for no expenses", () => {
    expect(aggregateBySupplier([], 10)).toEqual([])
  })

  it("defaults limit to 10", () => {
    // Create 12 unique suppliers
    const many = Array.from({ length: 12 }, (_, i) => ({
      date: "2024-01-15T12:00:00",
      type: "TEST",
      supplierName: `Supplier ${i}`,
      value: 100 + i,
    }))
    const result = aggregateBySupplier(many)
    expect(result.length).toBe(10)
  })
})

// ── monthlyToBarData ────────────────────────────────────────────────

describe("monthlyToBarData", () => {
  it("maps month numbers to Portuguese labels", () => {
    const monthly = [
      { month: 1, total: 800 },
      { month: 2, total: 2450 },
      { month: 3, total: 2550 },
    ]
    const result = monthlyToBarData(monthly)
    expect(result).toEqual([
      { label: "Jan", value: 800 },
      { label: "Fev", value: 2450 },
      { label: "Mar", value: 2550 },
    ])
  })

  it("handles all 12 months", () => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: (i + 1) * 100,
    }))
    const result = monthlyToBarData(monthly)
    expect(result.length).toBe(12)
    expect(result[0].label).toBe("Jan")
    expect(result[11].label).toBe("Dez")
  })

  it("returns empty array for empty input", () => {
    expect(monthlyToBarData([])).toEqual([])
  })
})

// ── aggregateByDay ──────────────────────────────────────────────────

describe("aggregateByDay", () => {
  it("groups expenses by date (YYYY-MM-DD) and sums values", () => {
    const expenses = [
      { date: "2024-01-15T10:00:00", value: 200 },
      { date: "2024-01-15T14:00:00", value: 300 },
      { date: "2024-01-16T12:00:00", value: 100 },
    ]
    const result = aggregateByDay(expenses)
    expect(result).toEqual([
      { date: "2024-01-15", value: 500 },
      { date: "2024-01-16", value: 100 },
    ])
  })

  it("returns results sorted by date ascending", () => {
    const expenses = [
      { date: "2024-03-01T12:00:00", value: 100 },
      { date: "2024-01-01T12:00:00", value: 200 },
      { date: "2024-02-01T12:00:00", value: 300 },
    ]
    const result = aggregateByDay(expenses)
    expect(result[0].date).toBe("2024-01-01")
    expect(result[2].date).toBe("2024-03-01")
  })

  it("returns empty array for no expenses", () => {
    expect(aggregateByDay([])).toEqual([])
  })

  it("daily sums equal grand total", () => {
    const result = aggregateByDay(EXPENSES)
    const daySum = result.reduce((s, d) => s + d.value, 0)
    const grandTotal = EXPENSES.reduce((s, e) => s + e.value, 0)
    expect(Math.abs(daySum - grandTotal)).toBeLessThan(0.02)
  })
})

// ── aggregateCategoryBySupplier ─────────────────────────────────────

describe("aggregateCategoryBySupplier", () => {
  it("produces category rows with supplier columns", () => {
    const result = aggregateCategoryBySupplier(EXPENSES, 3)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.suppliers.length).toBeGreaterThan(0)
    // Every row should have a category field
    for (const row of result.rows) {
      expect(row.category).toBeDefined()
      expect(typeof row.category).toBe("string")
    }
  })

  it("limits to topN suppliers and groups rest as Outros", () => {
    // Use topN=1 to force grouping
    const result = aggregateCategoryBySupplier(EXPENSES, 1)
    const supplierNames = result.suppliers.map((s) => s.name)
    // Should have the top supplier + Outros
    expect(supplierNames.length).toBe(2)
    expect(supplierNames).toContain("Outros")
  })

  it("assigns colors to all suppliers", () => {
    const result = aggregateCategoryBySupplier(EXPENSES, 6)
    for (const s of result.suppliers) {
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it("rows are sorted by total value descending", () => {
    const result = aggregateCategoryBySupplier(EXPENSES, 6)
    const keys = result.suppliers.map((s) => s.key)
    for (let i = 1; i < result.rows.length; i++) {
      const totalPrev = keys.reduce((s, k) => s + (Number(result.rows[i - 1][k]) || 0), 0)
      const totalCurr = keys.reduce((s, k) => s + (Number(result.rows[i][k]) || 0), 0)
      expect(totalPrev).toBeGreaterThanOrEqual(totalCurr)
    }
  })

  it("does not include Outros when all suppliers fit in topN", () => {
    // Only 4 unique suppliers in EXPENSES, use topN=10
    const result = aggregateCategoryBySupplier(EXPENSES, 10)
    const supplierNames = result.suppliers.map((s) => s.name)
    expect(supplierNames).not.toContain("Outros")
  })

  it("returns empty rows for no expenses", () => {
    const result = aggregateCategoryBySupplier([], 6)
    expect(result.rows).toEqual([])
    expect(result.suppliers).toEqual([])
  })

  it("cell values sum to grand total across all rows and suppliers", () => {
    const result = aggregateCategoryBySupplier(EXPENSES, 10)
    const keys = result.suppliers.map((s) => s.key)
    let total = 0
    for (const row of result.rows) {
      for (const k of keys) {
        total += Number(row[k]) || 0
      }
    }
    const grandTotal = EXPENSES.reduce((s, e) => s + e.value, 0)
    expect(Math.abs(total - grandTotal)).toBeLessThan(0.02)
  })
})
