/**
 * @file pautas-utils.test.ts
 * @description Unit tests for legislative agenda aggregation functions.
 *
 * Tests cover: propositions by type/month, voting sessions by month/result.
 */

import { describe, it, expect } from "vitest"
import {
  aggregatePropositionsByType,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateVotingSessionsByResult,
} from "./pautas-utils"
import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const PROPOSITIONS: CamaraProposition[] = [
  { id: "1", typeCode: "PL", number: 1, year: 2024, summary: "s1", presentedDate: "2024-01-15T12:00:00" },
  { id: "2", typeCode: "PL", number: 2, year: 2024, summary: "s2", presentedDate: "2024-01-25T12:00:00" },
  { id: "3", typeCode: "PEC", number: 1, year: 2024, summary: "s3", presentedDate: "2024-03-10T12:00:00" },
  { id: "4", typeCode: "PLP", number: 1, year: 2024, summary: "s4", presentedDate: "2024-06-20T12:00:00" },
]

const SESSIONS: CamaraVotingSession[] = [
  { id: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, propositions: [], votingObjects: [] },
  { id: "2", date: "2024-01-20T12:00:00", description: "d2", approved: true, propositions: [], votingObjects: [] },
  { id: "3", date: "2024-02-15T12:00:00", description: "d3", approved: false, propositions: [], votingObjects: [] },
  { id: "4", date: "2024-03-10T12:00:00", description: "d4", approved: null, propositions: [], votingObjects: [] },
]

// ── Propositions by type ────────────────────────────────────────────

describe("aggregatePropositionsByType", () => {
  it("counts propositions by type, sorted descending", () => {
    const result = aggregatePropositionsByType(PROPOSITIONS)
    expect(result[0]).toEqual({ name: "PL", value: 2 })
    expect(result).toContainEqual({ name: "PEC", value: 1 })
    expect(result).toContainEqual({ name: "PLP", value: 1 })
  })

  it("type counts sum to input count", () => {
    const result = aggregatePropositionsByType(PROPOSITIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(PROPOSITIONS.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregatePropositionsByType([])).toEqual([])
  })
})

// ── Propositions by month ───────────────────────────────────────────

describe("aggregatePropositionsByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregatePropositionsByMonth(PROPOSITIONS)
    expect(result.length).toBe(12)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[2].value).toBe(1)  // Mar
    expect(result[5].value).toBe(1)  // Jun
    expect(result[11].value).toBe(0) // Dec
  })

  it("monthly counts sum to input count", () => {
    const result = aggregatePropositionsByMonth(PROPOSITIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(PROPOSITIONS.length)
  })

  it("uses Portuguese month labels", () => {
    const result = aggregatePropositionsByMonth([])
    expect(result[0].label).toBe("Jan")
    expect(result[3].label).toBe("Abr")
    expect(result[11].label).toBe("Dez")
  })
})

// ── Voting sessions by month ────────────────────────────────────────

describe("aggregateVotingSessionsByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregateVotingSessionsByMonth(SESSIONS)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[1].value).toBe(1)  // Feb
    expect(result[2].value).toBe(1)  // Mar
  })

  it("monthly counts sum to input count", () => {
    const result = aggregateVotingSessionsByMonth(SESSIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SESSIONS.length)
  })
})

// ── Voting sessions by result ───────────────────────────────────────

describe("aggregateVotingSessionsByResult", () => {
  it("counts sessions by approval result", () => {
    const result = aggregateVotingSessionsByResult(SESSIONS)
    expect(result).toContainEqual({ name: "Aprovada", value: 2 })
    expect(result).toContainEqual({ name: "Rejeitada", value: 1 })
    expect(result).toContainEqual({ name: "Indefinida", value: 1 })
  })

  it("result counts sum to input count", () => {
    const result = aggregateVotingSessionsByResult(SESSIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SESSIONS.length)
  })

  it("filters out zero-count results", () => {
    const onlyApproved: CamaraVotingSession[] = [
      { id: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, propositions: [], votingObjects: [] },
    ]
    const result = aggregateVotingSessionsByResult(onlyApproved)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe("Aprovada")
  })

  it("returns empty for empty input", () => {
    expect(aggregateVotingSessionsByResult([])).toEqual([])
  })
})
