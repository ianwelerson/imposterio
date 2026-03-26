/**
 * @file variation.test.ts
 * @description Tests for year-over-year and period comparison utilities.
 *
 * Critical edge cases covered:
 * - Zero baseline (undefined % change)
 * - Both values zero
 * - Negative changes
 * - Month trimming to latest data
 */

import { describe, it, expect } from "vitest"
import { yearOverYearChange, buildYearComparison, mergeMonthlySeriesFromBuckets } from "./variation"

describe("yearOverYearChange", () => {
  it("computes positive change", () => {
    expect(yearOverYearChange(115, 100)).toBe(15)
  })

  it("computes negative change", () => {
    expect(yearOverYearChange(80, 100)).toBe(-20)
  })

  it("returns 0 for no change", () => {
    expect(yearOverYearChange(100, 100)).toBe(0)
  })

  it("returns null when previous is zero", () => {
    expect(yearOverYearChange(100, 0)).toBeNull()
  })

  it("returns null when both are zero", () => {
    expect(yearOverYearChange(0, 0)).toBeNull()
  })

  it("handles large percentage increases", () => {
    expect(yearOverYearChange(1000, 1)).toBe(99900)
  })

  it("handles decrease to zero", () => {
    expect(yearOverYearChange(0, 100)).toBe(-100)
  })
})

describe("buildYearComparison", () => {
  it("returns entries up to the last month with data", () => {
    const current = [{ month: 1, total: 100 }, { month: 3, total: 200 }]
    const previous = [{ month: 1, total: 80 }]
    const result = buildYearComparison(current, previous)
    // Last month with data is March (3)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ label: "Jan", current: 100, previous: 80 })
    expect(result[1]).toEqual({ label: "Fev", current: 0, previous: 0 })
    expect(result[2]).toEqual({ label: "Mar", current: 200, previous: 0 })
  })

  it("returns at least 1 month even with empty data", () => {
    const result = buildYearComparison([], [])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ label: "Jan", current: 0, previous: 0 })
  })

  it("fills gaps with zeros", () => {
    const current = [{ month: 6, total: 500 }]
    const result = buildYearComparison(current, [])
    expect(result).toHaveLength(6)
    expect(result[4]).toEqual({ label: "Mai", current: 0, previous: 0 })
    expect(result[5]).toEqual({ label: "Jun", current: 500, previous: 0 })
  })

  it("uses the later month from either year", () => {
    const current = [{ month: 2, total: 100 }]
    const previous = [{ month: 5, total: 200 }]
    const result = buildYearComparison(current, previous)
    // May is month 5, so we get 5 months
    expect(result).toHaveLength(5)
  })
})

describe("mergeMonthlySeriesFromBuckets", () => {
  it("produces 12 entries with all series keys", () => {
    const series = [
      { name: "Alice", byMonth: [100, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { name: "Bob", byMonth: [50, 0, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]
    const result = mergeMonthlySeriesFromBuckets(series)
    expect(result).toHaveLength(12)
    expect(result[0]).toEqual({ label: "Jan", Alice: 100, Bob: 50 })
    expect(result[1]).toEqual({ label: "Fev", Alice: 200, Bob: 0 })
    expect(result[2]).toEqual({ label: "Mar", Alice: 0, Bob: 300 })
  })

  it("rounds values to 2 decimal places", () => {
    const series = [
      { name: "X", byMonth: [0.1 + 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ]
    const result = mergeMonthlySeriesFromBuckets(series)
    expect(result[0].X).toBe(0.3)
  })

  it("handles empty series array", () => {
    const result = mergeMonthlySeriesFromBuckets([])
    expect(result).toHaveLength(12)
    expect(result[0]).toEqual({ label: "Jan" })
  })
})
