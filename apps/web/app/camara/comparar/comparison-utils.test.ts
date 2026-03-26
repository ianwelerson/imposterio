/**
 * @file comparison-utils.test.ts
 * @description Unit tests for deputy comparison aggregation functions.
 *
 * Tests cover: computeDeputyMetrics, mergeMonthlyExpenses,
 * mergeMonthlyVotes, and mergeExpenseCategories.
 */

import { describe, it, expect } from "vitest"
import {
  computeDeputyMetrics,
  mergeMonthlyExpenses,
  mergeMonthlyVotes,
  mergeExpenseCategories,
} from "./comparison-utils"
import type {
  DeputyExpense,
  DeputyVotingRecord,
  DeputyCaucus,
  DeputyCommittee,
  DeputyEvent,
} from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const EXPENSES: DeputyExpense[] = [
  { date: "2024-01-15T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto A", value: 500, document: "1", supplierDocument: "1", grossValue: 500, deductedValue: 0, documentType: "NF", documentCode: "1", batchNumber: 1, installment: 0, year: 2024, month: 1 },
  { date: "2024-02-10T12:00:00", type: "PASSAGENS AÉREAS", supplierName: "Airline", value: 2000, document: "2", supplierDocument: "2", grossValue: 2000, deductedValue: 0, documentType: "NF", documentCode: "2", batchNumber: 1, installment: 0, year: 2024, month: 2 },
  { date: "2024-03-05T12:00:00", type: "COMBUSTÍVEIS", supplierName: "Posto B", value: 300, document: "3", supplierDocument: "3", grossValue: 300, deductedValue: 0, documentType: "NF", documentCode: "3", batchNumber: 1, installment: 0, year: 2024, month: 3 },
]

const VOTES: DeputyVotingRecord[] = [
  { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Sim", propositions: [] },
  { sessionId: "2", date: "2024-01-20T12:00:00", description: "d2", approved: true, vote: "Não", propositions: [] },
  { sessionId: "3", date: "2024-02-15T12:00:00", description: "d3", approved: false, vote: "Não", propositions: [] },
  { sessionId: "4", date: "2024-03-10T12:00:00", description: "d4", approved: null, vote: "Abstenção", propositions: [] },
]

const CAUCUSES: DeputyCaucus[] = [
  { id: "1", name: "Frente A", legislature: 57 },
  { id: "2", name: "Frente B", legislature: 57 },
]

const COMMITTEES: DeputyCommittee[] = [
  { id: "1", abbreviation: "CCJC", name: "Comissão C1", type: "Comissão Permanente", role: "Titular", startDate: "2024-01-01" },
  { id: "2", abbreviation: "CFT", name: "Comissão C2", type: "Comissão Permanente", role: "Suplente", startDate: "2024-01-01", endDate: "2024-06-01" },
  { id: "3", abbreviation: "CE", name: "Comissão C3", type: "Comissão Especial", role: "Titular", startDate: "2024-02-01" },
]

const EVENTS: DeputyEvent[] = [
  { id: "1", startTime: "2024-01-10T12:00:00", status: "Encerrada", type: "Sessão Deliberativa", description: "e1", organs: [] },
  { id: "2", startTime: "2024-02-10T12:00:00", status: "Encerrada", type: "Audiência Pública", description: "e2", organs: [] },
]

// ── computeDeputyMetrics ────────────────────────────────────────────

describe("computeDeputyMetrics", () => {
  it("computes all metrics correctly", () => {
    const result = computeDeputyMetrics(
      "123", "João Silva", "PT", "SP", "photo.jpg", "/api/source",
      EXPENSES, VOTES, CAUCUSES, COMMITTEES, EVENTS, 15, 10,
    )

    expect(result.id).toBe("123")
    expect(result.name).toBe("João Silva")
    expect(result.party).toBe("PT")
    expect(result.uf).toBe("SP")
    expect(result.totalCeap).toBe(2800) // 500 + 2000 + 300
    expect(result.voteCount).toBe(4)
    expect(result.simCount).toBe(1)
    expect(result.naoCount).toBe(2)
    expect(result.abstCount).toBe(1)
    expect(result.caucusCount).toBe(2)
    expect(result.eventCount).toBe(2)
    expect(result.staffCount).toBe(15)
    expect(result.plenaryCount).toBe(10)
  })

  it("counts only active committees (no endDate)", () => {
    const result = computeDeputyMetrics(
      "123", "Test", "PT", "SP", undefined, "/api/source",
      [], [], [], COMMITTEES, [], 0, 0,
    )
    // Committee 2 has endDate, so only 2 active
    expect(result.committeeCount).toBe(2)
  })

  it("computes alignment correctly", () => {
    const result = computeDeputyMetrics(
      "123", "Test", "PT", "SP", undefined, "/api/source",
      [], VOTES, [], [], [], 0, 0,
    )
    // Decided: sessions 1,2,3 (approved !== null)
    // Aligned: session 1 (approved=true, Sim), session 3 (approved=false, Não) = 2/3 = 67%
    expect(result.alignment).toBe(67)
  })

  it("returns 0 alignment when all votes undecided", () => {
    const undecided: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: null, vote: "Sim", propositions: [] },
    ]
    const result = computeDeputyMetrics(
      "123", "Test", "PT", "SP", undefined, "/api/source",
      [], undecided, [], [], [], 0, 0,
    )
    expect(result.alignment).toBe(0)
  })

  it("returns 0 totalCeap for no expenses", () => {
    const result = computeDeputyMetrics(
      "123", "Test", "PT", "SP", undefined, "/api/source",
      [], [], [], [], [], 0, 0,
    )
    expect(result.totalCeap).toBe(0)
  })
})

// ── mergeMonthlyExpenses ────────────────────────────────────────────

describe("mergeMonthlyExpenses", () => {
  it("merges multiple deputies into 12-month rows", () => {
    const result = mergeMonthlyExpenses([
      { name: "Deputy A", expenses: EXPENSES },
      { name: "Deputy B", expenses: [] },
    ])
    expect(result.length).toBe(12)
    expect(result[0]).toHaveProperty("label", "Jan")
    expect(result[0]).toHaveProperty("Deputy A", 500)
    expect(result[0]).toHaveProperty("Deputy B", 0)
  })

  it("sums multiple expenses in the same month", () => {
    const twoInJan: DeputyExpense[] = [
      { ...EXPENSES[0], value: 100 },
      { ...EXPENSES[0], value: 200 },
    ]
    const result = mergeMonthlyExpenses([{ name: "D", expenses: twoInJan }])
    expect(result[0]["D"]).toBe(300)
  })

  it("rounds values to 2 decimal places", () => {
    const fractional: DeputyExpense[] = [
      { ...EXPENSES[0], value: 100.555 },
    ]
    const result = mergeMonthlyExpenses([{ name: "D", expenses: fractional }])
    expect(result[0]["D"]).toBe(100.56)
  })

  it("returns 12 rows even for empty input", () => {
    const result = mergeMonthlyExpenses([])
    expect(result.length).toBe(12)
  })
})

// ── mergeMonthlyVotes ───────────────────────────────────────────────

describe("mergeMonthlyVotes", () => {
  it("merges multiple deputies into 12-month rows", () => {
    const result = mergeMonthlyVotes([
      { name: "Deputy A", votes: VOTES },
      { name: "Deputy B", votes: [] },
    ])
    expect(result.length).toBe(12)
    expect(result[0]["Deputy A"]).toBe(2) // Jan: 2 votes
    expect(result[0]["Deputy B"]).toBe(0)
    expect(result[1]["Deputy A"]).toBe(1) // Feb: 1 vote
    expect(result[2]["Deputy A"]).toBe(1) // Mar: 1 vote
  })

  it("monthly per-deputy counts sum to their total votes", () => {
    const result = mergeMonthlyVotes([{ name: "D", votes: VOTES }])
    const total = result.reduce((s, r) => s + (r["D"] as number), 0)
    expect(total).toBe(VOTES.length)
  })

  it("returns 12 rows even for empty input", () => {
    const result = mergeMonthlyVotes([])
    expect(result.length).toBe(12)
  })
})

// ── mergeExpenseCategories ──────────────────────────────────────────

describe("mergeExpenseCategories", () => {
  it("returns top N categories with per-deputy values", () => {
    const result = mergeExpenseCategories([
      { name: "Deputy A", expenses: EXPENSES },
    ], 5)
    expect(result.length).toBe(2) // COMBUSTÍVEIS and PASSAGENS AÉREAS
    // Sorted by combined total descending
    expect(result[0].category).toBe("PASSAGENS AÉREAS")
    expect(result[0]["Deputy A"]).toBe(2000)
    expect(result[1].category).toBe("COMBUSTÍVEIS")
    expect(result[1]["Deputy A"]).toBe(800)
  })

  it("handles multiple deputies with overlapping categories", () => {
    const expensesB: DeputyExpense[] = [
      { ...EXPENSES[0], value: 1000 }, // COMBUSTÍVEIS
    ]
    const result = mergeExpenseCategories([
      { name: "A", expenses: EXPENSES },
      { name: "B", expenses: expensesB },
    ], 5)
    const combustiveis = result.find((r) => r.category === "COMBUSTÍVEIS")
    expect(combustiveis?.["A"]).toBe(800)
    expect(combustiveis?.["B"]).toBe(1000)
  })

  it("limits to topN categories", () => {
    const result = mergeExpenseCategories([{ name: "D", expenses: EXPENSES }], 1)
    expect(result.length).toBe(1)
    expect(result[0].category).toBe("PASSAGENS AÉREAS")
  })

  it("returns empty for no expenses", () => {
    expect(mergeExpenseCategories([], 8)).toEqual([])
  })

  it("rounds values to 2 decimal places", () => {
    const fractional: DeputyExpense[] = [
      { ...EXPENSES[0], value: 100.555 },
    ]
    const result = mergeExpenseCategories([{ name: "D", expenses: fractional }], 5)
    expect(result[0]["D"]).toBe(100.56)
  })
})
