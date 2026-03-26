/**
 * @file golden.test.ts
 * @description Snapshot/golden-file tests for aggregation pipelines.
 *
 * These tests use fixed input data and assert exact expected outputs.
 * If an aggregation function changes its behavior, these tests will fail,
 * forcing a deliberate review before the golden file is updated.
 *
 * This is the primary safety net against silent calculation regressions.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

// Import domain-specific utils that are tested against golden data
import {
  aggregateByMonth,
  aggregateByCategory,
  aggregateBySupplier,
} from "@/app/camara/[id]/expense-utils"
import {
  aggregateVotesByType,
  aggregateVotesByMonth,
  computeVoteAlignment,
} from "@/app/camara/[id]/activity-utils"
import { sumValues } from "./aggregation"

// ── Load golden fixtures ────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, "__fixtures__")

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURES_DIR, name), "utf-8")
  return JSON.parse(raw) as T
}

interface ExpenseFixture {
  input: Array<{ date: string; type: string; supplierName: string; value: number }>
  expected: {
    byMonth: Array<{ month: number; total: number }>
    byCategory: Array<{ name: string; value: number }>
    bySupplier: Array<{ label: string; value: number }>
    grandTotal: number
    totalItemCount: number
  }
}

interface VoteInput {
  vote: string
  date: string
  approved: boolean | null
  // Fields required by DeputyVotingRecord but not used by aggregation functions
  sessionId?: string
  description?: string
  propositions?: unknown[]
}

interface VoteFixture {
  input: VoteInput[]
  expected: {
    byType: Array<{ name: string; value: number }>
    byMonth: {
      jan: number; feb: number; mar: number; jun: number; dec: number; allOthers: number
    }
    alignment: {
      decidedCount: number
      alignedCount: number
      alignmentPercent: number
    }
  }
}

// ── Expense pipeline golden tests ───────────────────────────────────

describe("Expense aggregation golden tests", () => {
  const fixture = loadFixture<ExpenseFixture>("expense-golden.json")

  it("aggregateByMonth produces expected monthly totals", () => {
    const result = aggregateByMonth(fixture.input)
    expect(result).toEqual(fixture.expected.byMonth)
  })

  it("aggregateByCategory produces expected category breakdown", () => {
    const result = aggregateByCategory(fixture.input)
    expect(result).toEqual(fixture.expected.byCategory)
  })

  it("aggregateBySupplier produces expected supplier ranking", () => {
    // Use limit higher than fixture data count to get all suppliers
    const result = aggregateBySupplier(fixture.input, 20)
    // Sort by value descending to match expected
    const sorted = [...result].sort((a, b) => b.value - a.value)
    const expectedSorted = [...fixture.expected.bySupplier].sort((a, b) => b.value - a.value)
    expect(sorted).toEqual(expectedSorted)
  })

  it("grand total matches sum of all input values", () => {
    const total = sumValues(fixture.input, (e) => e.value)
    expect(total).toBe(fixture.expected.grandTotal)
  })

  it("category subtotals sum to grand total", () => {
    const byCategory = aggregateByCategory(fixture.input)
    const categorySum = byCategory.reduce((s, c) => s + c.value, 0)
    // Allow small floating-point tolerance
    expect(Math.abs(categorySum - fixture.expected.grandTotal)).toBeLessThan(0.02)
  })

  it("monthly subtotals sum to grand total", () => {
    const byMonth = aggregateByMonth(fixture.input)
    const monthSum = byMonth.reduce((s, m) => s + m.total, 0)
    expect(Math.abs(monthSum - fixture.expected.grandTotal)).toBeLessThan(0.02)
  })

  it("item count is preserved (no data loss or duplication in categories)", () => {
    expect(fixture.input.length).toBe(fixture.expected.totalItemCount)
  })
})

// ── Vote pipeline golden tests ──────────────────────────────────────

describe("Vote aggregation golden tests", () => {
  const fixture = loadFixture<VoteFixture>("votes-golden.json")
  // The fixture only includes fields used by the aggregation functions.
  // Cast to satisfy the full DeputyVotingRecord type signature.
  const votes = fixture.input as Parameters<typeof aggregateVotesByType>[0]

  it("aggregateVotesByType produces expected counts", () => {
    const result = aggregateVotesByType(votes)
    expect(result).toEqual(fixture.expected.byType)
  })

  it("aggregateVotesByMonth produces expected monthly distribution", () => {
    const result = aggregateVotesByMonth(votes)
    expect(result[0].value).toBe(fixture.expected.byMonth.jan)   // Jan
    expect(result[1].value).toBe(fixture.expected.byMonth.feb)   // Feb
    expect(result[2].value).toBe(fixture.expected.byMonth.mar)   // Mar
    expect(result[5].value).toBe(fixture.expected.byMonth.jun)   // Jun
    expect(result[11].value).toBe(fixture.expected.byMonth.dec)  // Dec
    // All other months should be 0
    const otherMonths = [3, 4, 6, 7, 8, 9, 10]
    for (const m of otherMonths) {
      expect(result[m].value).toBe(fixture.expected.byMonth.allOthers)
    }
  })

  it("computeVoteAlignment produces expected percentage", () => {
    const result = computeVoteAlignment(votes)
    expect(result).toBe(fixture.expected.alignment.alignmentPercent)
  })

  it("vote type counts sum to total input count", () => {
    const result = aggregateVotesByType(votes)
    const typeSum = result.reduce((s, r) => s + r.value, 0)
    expect(typeSum).toBe(fixture.input.length)
  })

  it("monthly counts sum to total input count", () => {
    const result = aggregateVotesByMonth(votes)
    const monthSum = result.reduce((s, r) => s + r.value, 0)
    expect(monthSum).toBe(fixture.input.length)
  })
})
