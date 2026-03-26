/**
 * @file guards.test.ts
 * @description Tests for runtime calculation sanity checks.
 *
 * Guards are the last line of defense before data reaches the UI.
 * These tests verify that violations are caught in dev mode (throws)
 * and that valid data passes without issue.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  assertSubtotalsMatch,
  assertNonNegative,
  assertValidPercent,
  assertOutputCountValid,
  assertTwelveMonths,
  validateAggregation,
} from "./guards"

// Guards throw in development (NODE_ENV=development is default in vitest)

describe("assertSubtotalsMatch", () => {
  it("passes when subtotals match the total", () => {
    expect(assertSubtotalsMatch([30, 50, 20], 100, "test")).toBe(true)
  })

  it("passes within tolerance", () => {
    // 0.01 diff, within default tolerance of 0.02
    expect(assertSubtotalsMatch([33.33, 33.33, 33.33], 99.99, "test")).toBe(true)
  })

  it("throws when subtotals diverge beyond tolerance", () => {
    expect(() => {
      assertSubtotalsMatch([50, 50], 200, "expense categories")
    }).toThrow("[CALC GUARD]")
  })

  it("passes for empty subtotals against zero total", () => {
    expect(assertSubtotalsMatch([], 0, "test")).toBe(true)
  })

  it("throws for empty subtotals against non-zero total", () => {
    expect(() => {
      assertSubtotalsMatch([], 100, "test")
    }).toThrow()
  })

  it("accepts custom tolerance", () => {
    // 1.0 diff, within tolerance of 2.0
    expect(assertSubtotalsMatch([49, 50], 100, "test", 2.0)).toBe(true)
  })
})

describe("assertNonNegative", () => {
  it("passes for all non-negative values", () => {
    expect(assertNonNegative([0, 1, 100, 0.5], "test")).toBe(true)
  })

  it("passes for empty array", () => {
    expect(assertNonNegative([], "test")).toBe(true)
  })

  it("throws when negative values are found", () => {
    expect(() => {
      assertNonNegative([10, -5, 20], "monthly expenses")
    }).toThrow("[CALC GUARD]")
  })
})

describe("assertValidPercent", () => {
  it("returns the value when within 0–100", () => {
    expect(assertValidPercent(75, "test")).toBe(75)
    expect(assertValidPercent(0, "test")).toBe(0)
    expect(assertValidPercent(100, "test")).toBe(100)
  })

  it("throws for negative percentage", () => {
    expect(() => {
      assertValidPercent(-5, "alignment")
    }).toThrow("[CALC GUARD]")
  })

  it("throws for over-100 percentage", () => {
    expect(() => {
      assertValidPercent(105, "attendance rate")
    }).toThrow("[CALC GUARD]")
  })
})

describe("assertOutputCountValid", () => {
  it("passes when output <= input", () => {
    expect(assertOutputCountValid(100, 10, "test")).toBe(true)
  })

  it("passes when counts are equal", () => {
    expect(assertOutputCountValid(5, 5, "test")).toBe(true)
  })

  it("passes when input is 0", () => {
    // Edge case: 0 input with 0 output is valid
    expect(assertOutputCountValid(0, 0, "test")).toBe(true)
  })

  it("throws when output exceeds input", () => {
    expect(() => {
      assertOutputCountValid(3, 5, "category groups")
    }).toThrow("[CALC GUARD]")
  })
})

describe("assertTwelveMonths", () => {
  it("passes for exactly 12 entries", () => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      label: `M${i}`,
      value: 0,
    }))
    expect(assertTwelveMonths(buckets, "test")).toBe(true)
  })

  it("throws for 11 entries", () => {
    const buckets = Array.from({ length: 11 }, (_, i) => ({
      label: `M${i}`,
      value: 0,
    }))
    expect(() => {
      assertTwelveMonths(buckets, "test")
    }).toThrow("[CALC GUARD]")
  })
})

describe("validateAggregation", () => {
  it("passes for valid aggregation result", () => {
    const result = [
      { name: "A", value: 30 },
      { name: "B", value: 70 },
    ]
    expect(validateAggregation(result, {
      context: "test",
      expectedTotal: 100,
      inputCount: 10,
    })).toBe(true)
  })

  it("catches negative values", () => {
    const result = [
      { name: "A", value: 30 },
      { name: "B", value: -5 },
    ]
    expect(() => {
      validateAggregation(result, { context: "test" })
    }).toThrow("[CALC GUARD]")
  })

  it("skips negative check when noNegatives=false", () => {
    const result = [
      { name: "A", value: 30 },
      { name: "B", value: -5 },
    ]
    expect(validateAggregation(result, {
      context: "test",
      noNegatives: false,
    })).toBe(true)
  })
})
