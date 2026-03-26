/**
 * @file aggregation.test.ts
 * @description Tests for generic aggregation primitives.
 *
 * Critical edge cases covered:
 * - Empty arrays
 * - Duplicate keys
 * - Null/undefined dates
 * - Floating-point sums
 * - Month boundary edge cases (Dec/Jan)
 * - Items with identical values (sort stability)
 */

import { describe, it, expect } from "vitest"
import {
  groupBySum, groupByCount, bucketByMonth, bucketByDay,
  topN, sumValues, MONTH_LABELS,
} from "./aggregation"

// ── groupBySum ──────────────────────────────────────────────────────

describe("groupBySum", () => {
  it("groups and sums by key, sorted descending", () => {
    const items = [
      { type: "A", value: 10 },
      { type: "B", value: 30 },
      { type: "A", value: 20 },
    ]
    const result = groupBySum(items, (i) => i.type, (i) => i.value)
    // Both groups sum to 30 — sort is stable, so insertion order preserved (A first)
    expect(result).toEqual([
      { name: "A", value: 30 },
      { name: "B", value: 30 },
    ])
  })

  it("returns empty array for empty input", () => {
    expect(groupBySum([], () => "x", () => 0)).toEqual([])
  })

  it("handles single item", () => {
    const result = groupBySum([{ k: "Z", v: 42 }], (i) => i.k, (i) => i.v)
    expect(result).toEqual([{ name: "Z", value: 42 }])
  })

  it("handles floating-point values without NaN", () => {
    const items = [
      { type: "X", value: 0.1 },
      { type: "X", value: 0.2 },
      { type: "X", value: 0.3 },
    ]
    const result = groupBySum(items, (i) => i.type, (i) => i.value)
    // Should be close to 0.6 (may have float drift, but must not be NaN)
    expect(result[0].value).toBeCloseTo(0.6, 10)
    expect(Number.isNaN(result[0].value)).toBe(false)
  })

  it("handles many duplicate keys correctly", () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      type: `group${i % 3}`,
      value: 1,
    }))
    const result = groupBySum(items, (i) => i.type, (i) => i.value)
    expect(result).toHaveLength(3)
    // 1000 / 3 = 333 or 334 items per group
    const total = result.reduce((s, r) => s + r.value, 0)
    expect(total).toBe(1000)
  })
})

// ── groupByCount ────────────────────────────────────────────────────

describe("groupByCount", () => {
  it("counts occurrences per key, sorted descending", () => {
    const items = [
      { vote: "Sim" },
      { vote: "Não" },
      { vote: "Sim" },
      { vote: "Sim" },
    ]
    const result = groupByCount(items, (i) => i.vote)
    expect(result).toEqual([
      { name: "Sim", value: 3 },
      { name: "Não", value: 1 },
    ])
  })

  it("returns empty for empty input", () => {
    expect(groupByCount([], () => "x")).toEqual([])
  })
})

// ── bucketByMonth ───────────────────────────────────────────────────

describe("bucketByMonth", () => {
  it("always returns 12 entries", () => {
    const result = bucketByMonth([], () => "2024-01-15", "count")
    expect(result).toHaveLength(12)
    expect(result.every((b) => b.value === 0)).toBe(true)
  })

  it("uses Portuguese month labels", () => {
    const result = bucketByMonth([], () => "", "count")
    expect(result.map((b) => b.label)).toEqual([...MONTH_LABELS])
  })

  it("counts items per month correctly", () => {
    const items = [
      { date: "2024-01-15" },
      { date: "2024-01-20" },
      { date: "2024-03-10" },
    ]
    const result = bucketByMonth(items, (i) => i.date, "count")
    expect(result[0].value).toBe(2) // Jan
    expect(result[1].value).toBe(0) // Feb
    expect(result[2].value).toBe(1) // Mar
  })

  it("sums values per month correctly", () => {
    const items = [
      { date: "2024-01-15", amount: 100 },
      { date: "2024-01-20", amount: 200 },
      { date: "2024-06-10", amount: 50 },
    ]
    const result = bucketByMonth(
      items, (i) => i.date, "sum", (i) => i.amount,
    )
    expect(result[0].value).toBe(300)  // Jan
    expect(result[5].value).toBe(50)   // Jun
  })

  it("handles December (month index 11) correctly", () => {
    const items = [{ date: "2024-12-31" }]
    const result = bucketByMonth(items, (i) => i.date, "count")
    expect(result[11].value).toBe(1) // Dec
  })

  it("skips items with empty date strings", () => {
    const items = [{ date: "" }, { date: "2024-01-01" }]
    const result = bucketByMonth(items, (i) => i.date, "count")
    const total = result.reduce((s, b) => s + b.value, 0)
    expect(total).toBe(1)
  })

  it("handles year boundary (Jan 1st local time)", () => {
    // Use a date without timezone suffix to avoid UTC→local offset issues
    const items = [{ date: "2024-01-01T12:00:00" }]
    const result = bucketByMonth(items, (i) => i.date, "count")
    expect(result[0].value).toBe(1)
  })
})

// ── bucketByDay ─────────────────────────────────────────────────────

describe("bucketByDay", () => {
  it("groups by YYYY-MM-DD and counts", () => {
    const items = [
      { date: "2024-03-15T10:00:00Z" },
      { date: "2024-03-15T14:00:00Z" },
      { date: "2024-03-16T09:00:00Z" },
    ]
    const result = bucketByDay(items, (i) => i.date, "count")
    expect(result).toEqual([
      { date: "2024-03-15", value: 2 },
      { date: "2024-03-16", value: 1 },
    ])
  })

  it("sums values per day", () => {
    const items = [
      { date: "2024-03-15", amount: 100 },
      { date: "2024-03-15", amount: 200 },
    ]
    const result = bucketByDay(
      items, (i) => i.date, "sum", (i) => i.amount,
    )
    expect(result).toEqual([{ date: "2024-03-15", value: 300 }])
  })

  it("returns empty for empty input", () => {
    expect(bucketByDay([], () => "", "count")).toEqual([])
  })

  it("sorts chronologically", () => {
    const items = [
      { date: "2024-12-01" },
      { date: "2024-01-01" },
      { date: "2024-06-15" },
    ]
    const result = bucketByDay(items, (i) => i.date, "count")
    expect(result.map((r) => r.date)).toEqual([
      "2024-01-01", "2024-06-15", "2024-12-01",
    ])
  })
})

// ── topN ────────────────────────────────────────────────────────────

describe("topN", () => {
  it("returns first N items", () => {
    expect(topN([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3])
  })

  it("returns all items when N exceeds length", () => {
    expect(topN([1, 2], 10)).toEqual([1, 2])
  })

  it("returns empty for N=0", () => {
    expect(topN([1, 2, 3], 0)).toEqual([])
  })

  it("returns empty for empty input", () => {
    expect(topN([], 5)).toEqual([])
  })
})

// ── sumValues ───────────────────────────────────────────────────────

describe("sumValues", () => {
  it("sums values with currency rounding", () => {
    const items = [{ v: 0.1 }, { v: 0.2 }]
    expect(sumValues(items, (i) => i.v)).toBe(0.3)
  })

  it("sums without rounding when round=false", () => {
    const items = [{ v: 0.1 }, { v: 0.2 }]
    const result = sumValues(items, (i) => i.v, false)
    // Raw floating-point result
    expect(result).toBeCloseTo(0.3, 15)
  })

  it("returns 0 for empty array", () => {
    expect(sumValues([], () => 0)).toBe(0)
  })

  it("handles large sums correctly", () => {
    const items = Array.from({ length: 10000 }, () => ({ v: 99.99 }))
    const result = sumValues(items, (i) => i.v)
    expect(result).toBeCloseTo(999900, 0)
  })
})
