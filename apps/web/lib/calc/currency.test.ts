/**
 * @file currency.test.ts
 * @description Tests for BRL currency formatting and rounding utilities.
 *
 * Critical edge cases covered:
 * - Floating-point precision (0.1 + 0.2 problem)
 * - Zero, negative, and very large values
 * - Compact formatting thresholds
 * - Consistent rounding behavior
 */

import { describe, it, expect } from "vitest"
import { formatBRL, formatBRLCompact, formatNumber, roundCurrency } from "./currency"

describe("formatBRL", () => {
  it("formats a standard value with R$ prefix and 2 decimals", () => {
    const result = formatBRL(1234567.89)
    expect(result).toContain("R$")
    expect(result).toContain("1.234.567")
    expect(result).toContain("89")
  })

  it("formats zero as R$ 0,00", () => {
    const result = formatBRL(0)
    expect(result).toContain("0,00")
  })

  it("formats negative values with a minus sign", () => {
    const result = formatBRL(-500.5)
    expect(result).toContain("500,50")
    expect(result).toMatch(/-/)
  })

  it("rounds to 2 decimal places", () => {
    const result = formatBRL(99.999)
    expect(result).toContain("100,00")
  })

  it("handles very small values (centavos)", () => {
    const result = formatBRL(0.01)
    expect(result).toContain("0,01")
  })

  it("handles very large values (trillions)", () => {
    const result = formatBRL(5_520_000_000_000)
    expect(result).toContain("R$")
    // Should not throw or return NaN
    expect(result).not.toContain("NaN")
  })

  it("handles floating-point imprecision from addition", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    const result = formatBRL(0.1 + 0.2)
    expect(result).toContain("0,30")
  })
})

describe("formatBRLCompact", () => {
  it("formats trillions with 'tri' suffix", () => {
    expect(formatBRLCompact(5_520_000_000_000)).toBe("R$ 5,52 tri")
  })

  it("formats billions with 'bi' suffix", () => {
    expect(formatBRLCompact(1_234_000_000)).toBe("R$ 1,23 bi")
  })

  it("formats millions with 'mi' suffix", () => {
    expect(formatBRLCompact(2_500_000)).toBe("R$ 2,50 mi")
  })

  it("formats thousands with 'mil' suffix", () => {
    expect(formatBRLCompact(45_000)).toBe("R$ 45,00 mil")
  })

  it("falls back to formatBRL for values under 1000", () => {
    const result = formatBRLCompact(999.99)
    expect(result).toContain("R$")
    expect(result).toContain("999,99")
  })

  it("handles zero", () => {
    const result = formatBRLCompact(0)
    expect(result).toContain("0,00")
  })

  it("handles negative values with compact format", () => {
    expect(formatBRLCompact(-1_234_000_000)).toBe("-R$ 1,23 bi")
  })

  it("rounds correctly at threshold boundaries", () => {
    // Just below 1 billion
    expect(formatBRLCompact(999_999_999)).toBe("R$ 1000,00 mi")
    // Exactly 1 billion
    expect(formatBRLCompact(1_000_000_000)).toBe("R$ 1,00 bi")
  })
})

describe("formatNumber", () => {
  it("formats with pt-BR locale and default 2 decimals", () => {
    const result = formatNumber(1234567.89)
    expect(result).toBe("1.234.567,89")
  })

  it("respects custom decimal places", () => {
    const result = formatNumber(1234.5, 0)
    expect(result).toBe("1.235")
  })

  it("pads with trailing zeros", () => {
    const result = formatNumber(100, 2)
    expect(result).toBe("100,00")
  })
})

describe("roundCurrency", () => {
  it("rounds 0.1 + 0.2 to 0.3", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
  })

  it("rounds down correctly", () => {
    expect(roundCurrency(1234.564)).toBe(1234.56)
  })

  it("rounds up correctly", () => {
    expect(roundCurrency(1234.567)).toBe(1234.57)
  })

  it("handles zero", () => {
    expect(roundCurrency(0)).toBe(0)
  })

  it("handles negative values", () => {
    expect(roundCurrency(-99.999)).toBe(-100)
  })

  it("handles values with no decimal drift", () => {
    expect(roundCurrency(1234.5)).toBe(1234.5)
  })

  it("handles sum of many small values", () => {
    // Simulates accumulating 100 payments of R$ 0.33
    let sum = 0
    for (let i = 0; i < 100; i++) sum += 0.33
    // Without rounding: 32.99999999999997
    expect(roundCurrency(sum)).toBe(33)
  })
})
