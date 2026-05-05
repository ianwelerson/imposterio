/**
 * @file comparison-utils.test.ts
 * @description Unit tests for senator comparison aggregation functions.
 *
 * Tests cover: computeSenatorMetrics, mergeMonthlyExpenses, mergeMonthlyVotes,
 * and mergeExpenseCategories.
 */

import { describe, it, expect } from "vitest"
import {
  computeSenatorMetrics,
  mergeMonthlyExpenses,
  mergeMonthlyVotes,
  mergeExpenseCategories,
} from "./comparison-utils"
import type {
  SenatorExpense,
  SenatorVotingRecord,
  SenatorCommittee,
  SenatorAttendanceDetail,
} from "@imposterio/types"
import type { Proposition } from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const EXPENSES: SenatorExpense[] = [
  { date: "2024-01-15", year: 2024, month: 1, senatorId: "1", senatorName: "Test", type: "PASSAGENS", supplierName: "Airline", value: 2000 },
  { date: "2024-02-10", year: 2024, month: 2, senatorId: "1", senatorName: "Test", type: "COMBUSTÍVEL", supplierName: "Posto A", value: 500 },
  { date: "2024-03-05", year: 2024, month: 3, senatorId: "1", senatorName: "Test", type: "COMBUSTÍVEL", supplierName: "Posto B", value: 300 },
]

const VOTES: SenatorVotingRecord[] = [
  { sessionId: "1", date: "2024-01-10", description: "d1", approved: true, vote: "Sim" },
  { sessionId: "2", date: "2024-01-20", description: "d2", approved: true, vote: "Não" },
  { sessionId: "3", date: "2024-02-15", description: "d3", approved: false, vote: "Não" },
  { sessionId: "4", date: "2024-03-10", description: "d4", approved: null, vote: "Abstenção" },
]

const COMMITTEES: SenatorCommittee[] = [
  { id: "1", abbreviation: "CCJ", name: "C1", type: "Permanente", role: "Titular", startDate: "2024-01-01" },
  { id: "2", abbreviation: "CAE", name: "C2", type: "Permanente", role: "Suplente", startDate: "2024-01-01", endDate: "2024-06-01" },
  { id: "3", abbreviation: "CE", name: "C3", type: "Especial", role: "Titular", startDate: "2024-02-01" },
]

const PROPOSITIONS: Proposition[] = [
  { id: "1", identifier: "PL 1/2024", type: "PL", summary: "s1", lastUpdate: "2024-01-15" },
  { id: "2", identifier: "PEC 2/2024", type: "PEC", summary: "s2", lastUpdate: "2024-02-10" },
] as Proposition[]

const ATTENDANCE: SenatorAttendanceDetail = {
  senatorId: "1",
  year: 2024,
  sessions: [],
  totalDeliberative: 50,
  attended: 42,
  missed: 8,
  percentage: 84.0,
}

// ── computeSenatorMetrics ───────────────────────────────────────────

describe("computeSenatorMetrics", () => {
  it("computes all metrics correctly", () => {
    const result = computeSenatorMetrics(
      "1", "Maria Silva", "PT", "SP", "photo.jpg", "/api/source",
      EXPENSES, VOTES, COMMITTEES, PROPOSITIONS, ATTENDANCE,
    )

    expect(result.id).toBe("1")
    expect(result.name).toBe("Maria Silva")
    expect(result.party).toBe("PT")
    expect(result.uf).toBe("SP")
    expect(result.totalCeaps).toBe(2800)
    expect(result.voteCount).toBe(4)
    expect(result.simCount).toBe(1)
    expect(result.naoCount).toBe(2)
    expect(result.abstCount).toBe(1)
    expect(result.propositionCount).toBe(2)
    expect(result.plenaryAttended).toBe(42)
    expect(result.attendancePercent).toBe(84)
  })

  it("counts only active committees (no endDate)", () => {
    const result = computeSenatorMetrics(
      "1", "T", "PT", "SP", undefined, "/api/source",
      [], [], COMMITTEES, [], ATTENDANCE,
    )
    expect(result.committeeCount).toBe(2)
  })

  it("computes alignment correctly", () => {
    const result = computeSenatorMetrics(
      "1", "T", "PT", "SP", undefined, "/api/source",
      [], VOTES, [], [], ATTENDANCE,
    )
    // Decided: 1,2,3. Aligned: 1 (true,Sim), 3 (false,Não) → 2/3 = 67%
    expect(result.alignment).toBe(67)
  })

  it("returns 0 alignment when all undecided", () => {
    const undecided: SenatorVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10", description: "d1", approved: null, vote: "Sim" },
    ]
    const result = computeSenatorMetrics(
      "1", "T", "PT", "SP", undefined, "/api/source",
      [], undecided, [], [], ATTENDANCE,
    )
    expect(result.alignment).toBe(0)
  })

  it("returns 0 totalCeaps for no expenses", () => {
    const result = computeSenatorMetrics(
      "1", "T", "PT", "SP", undefined, "/api/source",
      [], [], [], [], ATTENDANCE,
    )
    expect(result.totalCeaps).toBe(0)
  })
})

// ── mergeMonthlyExpenses ────────────────────────────────────────────

describe("mergeMonthlyExpenses", () => {
  it("merges multiple senators into 12-month rows", () => {
    const result = mergeMonthlyExpenses([
      { name: "Senator A", expenses: EXPENSES },
      { name: "Senator B", expenses: [] },
    ])
    expect(result.length).toBe(12)
    expect(result[0]).toHaveProperty("label", "Jan")
    expect(result[0]).toHaveProperty("Senator A", 2000)
    expect(result[0]).toHaveProperty("Senator B", 0)
  })

  it("sums multiple expenses in the same month", () => {
    const twoInJan: SenatorExpense[] = [
      { ...EXPENSES[0], value: 100 },
      { ...EXPENSES[0], value: 200 },
    ]
    const result = mergeMonthlyExpenses([{ name: "S", expenses: twoInJan }])
    expect(result[0]["S"]).toBe(300)
  })

  it("rounds values to 2 decimal places", () => {
    const fractional: SenatorExpense[] = [
      { ...EXPENSES[0], value: 100.555 },
    ]
    const result = mergeMonthlyExpenses([{ name: "S", expenses: fractional }])
    expect(result[0]["S"]).toBe(100.56)
  })

  it("returns 12 rows even for empty input", () => {
    expect(mergeMonthlyExpenses([]).length).toBe(12)
  })
})

// ── mergeMonthlyVotes ───────────────────────────────────────────────

describe("mergeMonthlyVotes", () => {
  it("merges multiple senators into 12-month rows", () => {
    const result = mergeMonthlyVotes([
      { name: "Senator A", votes: VOTES },
      { name: "Senator B", votes: [] },
    ])
    expect(result.length).toBe(12)
    expect(result[0]["Senator A"]).toBe(2)
    expect(result[1]["Senator A"]).toBe(1)
    expect(result[2]["Senator A"]).toBe(1)
    expect(result[0]["Senator B"]).toBe(0)
  })

  it("monthly counts sum to total", () => {
    const result = mergeMonthlyVotes([{ name: "S", votes: VOTES }])
    const total = result.reduce((s, r) => s + (r["S"] as number), 0)
    expect(total).toBe(VOTES.length)
  })

  it("returns 12 rows even for empty input", () => {
    expect(mergeMonthlyVotes([]).length).toBe(12)
  })
})

// ── mergeExpenseCategories ──────────────────────────────────────────

describe("mergeExpenseCategories", () => {
  it("returns top N categories with per-senator values", () => {
    const result = mergeExpenseCategories([
      { name: "Senator A", expenses: EXPENSES },
    ], 5)
    expect(result.length).toBe(2)
    expect(result[0].category).toBe("PASSAGENS")
    expect(result[0]["Senator A"]).toBe(2000)
    expect(result[1].category).toBe("COMBUSTÍVEL")
    expect(result[1]["Senator A"]).toBe(800)
  })

  it("handles multiple senators with overlapping categories", () => {
    const expensesB: SenatorExpense[] = [
      { ...EXPENSES[1], value: 1000 },
    ]
    const result = mergeExpenseCategories([
      { name: "A", expenses: EXPENSES },
      { name: "B", expenses: expensesB },
    ], 5)
    const combustivel = result.find((r) => r.category === "COMBUSTÍVEL")
    expect(combustivel?.["A"]).toBe(800)
    expect(combustivel?.["B"]).toBe(1000)
  })

  it("limits to topN categories", () => {
    const result = mergeExpenseCategories([{ name: "S", expenses: EXPENSES }], 1)
    expect(result.length).toBe(1)
    expect(result[0].category).toBe("PASSAGENS")
  })

  it("returns empty array when no expenses", () => {
    expect(mergeExpenseCategories([], 8)).toEqual([])
  })

  it("rounds values to 2 decimal places", () => {
    const fractional: SenatorExpense[] = [
      { ...EXPENSES[0], value: 100.555 },
    ]
    const result = mergeExpenseCategories([{ name: "S", expenses: fractional }], 5)
    expect(result[0]["S"]).toBe(100.56)
  })
})
