/**
 * @file percentage.test.ts
 * @description Tests for percentage calculation utilities.
 *
 * Critical edge cases covered:
 * - Division by zero
 * - 0/0 (both numerator and denominator zero)
 * - 100% and over-100% inputs
 * - Rounding behavior
 */

import { describe, it, expect } from "vitest"
import { safePercent, safePercentLabel, formatPercent } from "./percentage"

describe("safePercent", () => {
  it("computes a basic percentage", () => {
    expect(safePercent(75, 100)).toBe(75)
  })

  it("rounds to nearest integer", () => {
    expect(safePercent(1, 3)).toBe(33)
    expect(safePercent(2, 3)).toBe(67)
  })

  it("returns 0 when denominator is zero", () => {
    expect(safePercent(5, 0)).toBe(0)
  })

  it("returns 0 when both are zero", () => {
    expect(safePercent(0, 0)).toBe(0)
  })

  it("returns 100 for equal values", () => {
    expect(safePercent(42, 42)).toBe(100)
  })

  it("returns 0 for zero numerator", () => {
    expect(safePercent(0, 100)).toBe(0)
  })

  it("handles very small denominators without overflow", () => {
    expect(safePercent(1, 0.001)).toBe(100000)
    // Note: this is mathematically correct — caller should validate range if needed
  })

  it("handles negative values", () => {
    // Mathematically valid, though unusual in this domain
    expect(safePercent(-50, 100)).toBe(-50)
  })
})

describe("safePercentLabel", () => {
  it("returns a formatted string with 1 decimal", () => {
    expect(safePercentLabel(1, 3)).toBe("33.3%")
  })

  it("returns 0.0% for zero denominator", () => {
    expect(safePercentLabel(5, 0)).toBe("0.0%")
  })

  it("returns 0.0% for 0/0", () => {
    expect(safePercentLabel(0, 0)).toBe("0.0%")
  })

  it("returns 100.0% for equal values", () => {
    expect(safePercentLabel(100, 100)).toBe("100.0%")
  })
})

describe("formatPercent", () => {
  it("appends % to a value", () => {
    expect(formatPercent(75)).toBe("75%")
  })

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0%")
  })
})
