/**
 * @file licitacoes-utils.test.ts
 * @description Unit tests for procurement contract aggregation functions.
 *
 * Tests cover: aggregateContractsByMonth with various edge cases.
 */

import { describe, it, expect } from "vitest"
import { aggregateContractsByMonth } from "./licitacoes-utils"
import type { CamaraProcurementContract } from "@imposterio/types"

// ── Helper to create minimal contract fixtures ──────────────────────

function makeContract(overrides: Partial<CamaraProcurementContract>): CamaraProcurementContract {
  return {
    procurementId: "1",
    procurementYear: 2024,
    contractNumber: 1,
    contractYear: 2024,
    contractType: "Contrato",
    status: "Vigente",
    object: "Test object",
    originalValue: 10000,
    totalValue: 10000,
    signatureDate: "2024-01-15T12:00:00",
    publicationDate: "2024-01-20T12:00:00",
    startDate: "2024-02-01T12:00:00",
    endDate: "2024-12-31T12:00:00",
    latestEndDate: "2024-12-31T12:00:00",
    supplierDocument: "12345678000100",
    supplierName: "Test Supplier",
    supplierCity: "Brasília",
    supplierUF: "DF",
    ...overrides,
  }
}

// ── Fixtures ────────────────────────────────────────────────────────

const CONTRACTS: CamaraProcurementContract[] = [
  makeContract({ signatureDate: "2024-01-10T12:00:00", totalValue: 50000 }),
  makeContract({ signatureDate: "2024-01-20T12:00:00", totalValue: 30000 }),
  makeContract({ signatureDate: "2024-03-05T12:00:00", totalValue: 100000 }),
  makeContract({ signatureDate: "2024-06-15T12:00:00", totalValue: 75000 }),
]

// ── aggregateContractsByMonth ───────────────────────────────────────

describe("aggregateContractsByMonth", () => {
  it("returns 12 months with correct totals", () => {
    const result = aggregateContractsByMonth(CONTRACTS)
    expect(result.length).toBe(12)
    expect(result[0]).toEqual({ label: "Jan", value: 80000 })  // 50k + 30k
    expect(result[2]).toEqual({ label: "Mar", value: 100000 })
    expect(result[5]).toEqual({ label: "Jun", value: 75000 })
  })

  it("fills months without contracts with 0", () => {
    const result = aggregateContractsByMonth(CONTRACTS)
    expect(result[1].value).toBe(0)  // Feb
    expect(result[3].value).toBe(0)  // Apr
    expect(result[11].value).toBe(0) // Dec
  })

  it("monthly totals sum to grand total", () => {
    const result = aggregateContractsByMonth(CONTRACTS)
    const monthSum = result.reduce((s, m) => s + m.value, 0)
    const grandTotal = CONTRACTS.reduce((s, c) => s + c.totalValue, 0)
    expect(monthSum).toBe(grandTotal)
  })

  it("uses Portuguese month labels", () => {
    const result = aggregateContractsByMonth([])
    expect(result[0].label).toBe("Jan")
    expect(result[4].label).toBe("Mai")
    expect(result[11].label).toBe("Dez")
  })

  it("returns 12 zero-filled months for empty input", () => {
    const result = aggregateContractsByMonth([])
    expect(result.length).toBe(12)
    expect(result.every((m) => m.value === 0)).toBe(true)
  })

  it("skips contracts with missing signatureDate", () => {
    const withMissing = [
      ...CONTRACTS,
      makeContract({ signatureDate: "", totalValue: 99999 }),
    ]
    const result = aggregateContractsByMonth(withMissing)
    const monthSum = result.reduce((s, m) => s + m.value, 0)
    // The missing-date contract should not be included
    // Note: empty string creates an invalid date, getMonth() returns NaN, fails the >= 0 check
    const grandTotal = CONTRACTS.reduce((s, c) => s + c.totalValue, 0)
    expect(monthSum).toBe(grandTotal)
  })

  it("handles single contract", () => {
    const result = aggregateContractsByMonth([CONTRACTS[0]])
    expect(result[0].value).toBe(50000)
    const nonZero = result.filter((m) => m.value > 0)
    expect(nonZero.length).toBe(1)
  })
})
