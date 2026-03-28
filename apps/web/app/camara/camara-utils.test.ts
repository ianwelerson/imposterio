/**
 * @file camara-utils.test.ts
 * @description Unit tests for Câmara overview page aggregation functions.
 *
 * Tests cover: deputies by party/UF, propositions by type/month,
 * voting sessions by month/result, and attendance by party.
 */

import { describe, it, expect } from "vitest"
import {
  aggregateDeputiesByParty,
  aggregateDeputiesByUF,
  aggregatePropositionsByType,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateAttendanceByParty,
  aggregateVotesByResult,
} from "./camara-utils"
import type { Deputy } from "@imposterio/types"
import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"
import type { AttendanceBulkSummary } from "@imposterio/fetchers"

// ── Fixtures ────────────────────────────────────────────────────────

const DEPUTIES: Deputy[] = [
  { id: "1", name: "D1", party: "PT", uf: "SP", legislature: 57 },
  { id: "2", name: "D2", party: "PT", uf: "SP", legislature: 57 },
  { id: "3", name: "D3", party: "PL", uf: "RJ", legislature: 57 },
  { id: "4", name: "D4", party: "PL", uf: "MG", legislature: 57 },
  { id: "5", name: "D5", party: "PL", uf: "SP", legislature: 57 },
  { id: "6", name: "D6", party: "PSDB", uf: "SP", legislature: 57 },
  { id: "7", name: "D7", party: "PT", uf: "RJ", legislature: 57 },
]

const PROPOSITIONS: CamaraProposition[] = [
  { id: "1", typeCode: "PL", number: 1, year: 2024, summary: "s1", presentedDate: "2024-01-15T12:00:00" },
  { id: "2", typeCode: "PL", number: 2, year: 2024, summary: "s2", presentedDate: "2024-01-20T12:00:00" },
  { id: "3", typeCode: "PEC", number: 1, year: 2024, summary: "s3", presentedDate: "2024-02-10T12:00:00" },
  { id: "4", typeCode: "PL", number: 3, year: 2024, summary: "s4", presentedDate: "2024-03-05T12:00:00" },
  { id: "5", typeCode: "MP", number: 1, year: 2024, summary: "s5", presentedDate: "2024-06-15T12:00:00" },
]

const SESSIONS: CamaraVotingSession[] = [
  { id: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, propositions: [], votingObjects: [] },
  { id: "2", date: "2024-01-20T12:00:00", description: "d2", approved: false, propositions: [], votingObjects: [] },
  { id: "3", date: "2024-02-15T12:00:00", description: "d3", approved: true, propositions: [], votingObjects: [] },
  { id: "4", date: "2024-03-10T12:00:00", description: "d4", approved: null, propositions: [], votingObjects: [] },
  { id: "5", date: "2024-03-20T12:00:00", description: "d5", approved: true, propositions: [], votingObjects: [] },
]

// ── Deputies by party ───────────────────────────────────────────────

describe("aggregateDeputiesByParty", () => {
  it("counts deputies per party, sorted descending", () => {
    const result = aggregateDeputiesByParty(DEPUTIES)
    // PT and PL both have 3 — Map preserves insertion order, PT comes first
    expect(result[0]).toEqual({ name: "PT", value: 3 })
    expect(result[1]).toEqual({ name: "PL", value: 3 })
    expect(result[2]).toEqual({ name: "PSDB", value: 1 })
  })

  it("party counts sum to total deputies", () => {
    const result = aggregateDeputiesByParty(DEPUTIES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(DEPUTIES.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregateDeputiesByParty([])).toEqual([])
  })
})

// ── Deputies by UF ──────────────────────────────────────────────────

describe("aggregateDeputiesByUF", () => {
  it("counts deputies per UF, sorted descending", () => {
    const result = aggregateDeputiesByUF(DEPUTIES)
    expect(result[0]).toEqual({ name: "SP", value: 4 })
    expect(result[1]).toEqual({ name: "RJ", value: 2 })
    expect(result[2]).toEqual({ name: "MG", value: 1 })
  })

  it("UF counts sum to total deputies", () => {
    const result = aggregateDeputiesByUF(DEPUTIES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(DEPUTIES.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregateDeputiesByUF([])).toEqual([])
  })
})

// ── Propositions by type ────────────────────────────────────────────

describe("aggregatePropositionsByType", () => {
  it("counts propositions per type, sorted descending", () => {
    const result = aggregatePropositionsByType(PROPOSITIONS)
    expect(result[0]).toEqual({ name: "PL", value: 3 })
    expect(result).toContainEqual({ name: "PEC", value: 1 })
    expect(result).toContainEqual({ name: "MP", value: 1 })
  })

  it("type counts sum to input count", () => {
    const result = aggregatePropositionsByType(PROPOSITIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(PROPOSITIONS.length)
  })
})

// ── Propositions by month ───────────────────────────────────────────

describe("aggregatePropositionsByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregatePropositionsByMonth(PROPOSITIONS)
    expect(result.length).toBe(12)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[1].value).toBe(1)  // Feb
    expect(result[2].value).toBe(1)  // Mar
    expect(result[5].value).toBe(1)  // Jun
  })

  it("monthly counts sum to input count", () => {
    const result = aggregatePropositionsByMonth(PROPOSITIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(PROPOSITIONS.length)
  })

  it("uses Portuguese month labels", () => {
    const result = aggregatePropositionsByMonth([])
    expect(result[0].label).toBe("Jan")
    expect(result[11].label).toBe("Dez")
  })
})

// ── Voting sessions by month ────────────────────────────────────────

describe("aggregateVotingSessionsByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregateVotingSessionsByMonth(SESSIONS)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[1].value).toBe(1)  // Feb
    expect(result[2].value).toBe(2)  // Mar
  })

  it("monthly counts sum to input count", () => {
    const result = aggregateVotingSessionsByMonth(SESSIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SESSIONS.length)
  })
})

// ── Attendance by party ─────────────────────────────────────────────

describe("aggregateAttendanceByParty", () => {
  it("computes average attendance rate per party", () => {
    // Build 6 deputies for party "BIG" to pass the >=5 threshold
    const bigPartyDeputies: Deputy[] = Array.from({ length: 6 }, (_, i) => ({
      id: `bp${i}`, name: `BigP ${i}`, party: "BIG", uf: "SP", legislature: 57,
    }))

    const summary: AttendanceBulkSummary = {
      totalEvents: 100,
      totalPlenarySessions: 50,
      deputies: [
        { deputyId: "bp0", eventsAttended: 80, plenaryEventsAttended: 40 },
        { deputyId: "bp1", eventsAttended: 60, plenaryEventsAttended: 30 },
        { deputyId: "bp2", eventsAttended: 70, plenaryEventsAttended: 35 },
        { deputyId: "bp3", eventsAttended: 90, plenaryEventsAttended: 45 },
        { deputyId: "bp4", eventsAttended: 50, plenaryEventsAttended: 25 },
        { deputyId: "bp5", eventsAttended: 50, plenaryEventsAttended: 25 },
      ],
    }

    const result = aggregateAttendanceByParty(summary, bigPartyDeputies)
    // Average plenary: (40+30+35+45+25+25)/6 = 200/6 = 33.33 per deputy
    // Rate: 33.33 / 50 * 100 = 66.67 → rounds to 67%
    expect(result.length).toBe(1)
    expect(result[0].name).toBe("BIG")
    expect(result[0].value).toBe(67)
  })

  it("excludes parties with fewer than 5 deputies", () => {
    const deputies: Deputy[] = [
      { id: "1", name: "D1", party: "SMALL", uf: "SP", legislature: 57 },
      { id: "2", name: "D2", party: "SMALL", uf: "SP", legislature: 57 },
    ]
    const summary: AttendanceBulkSummary = {
      totalEvents: 100,
      totalPlenarySessions: 50,
      deputies: [
        { deputyId: "1", eventsAttended: 50, plenaryEventsAttended: 25 },
        { deputyId: "2", eventsAttended: 50, plenaryEventsAttended: 25 },
      ],
    }
    expect(aggregateAttendanceByParty(summary, deputies)).toEqual([])
  })

  it("returns empty when totalEvents is 0", () => {
    const summary: AttendanceBulkSummary = {
      totalEvents: 0,
      totalPlenarySessions: 0,
      deputies: [],
    }
    expect(aggregateAttendanceByParty(summary, DEPUTIES)).toEqual([])
  })

  it("limits to top 15 parties", () => {
    // Create 16 parties each with 5 members
    const deputies: Deputy[] = []
    const summaryDeputies: { deputyId: string; eventsAttended: number; plenaryEventsAttended: number }[] = []
    for (let p = 0; p < 16; p++) {
      for (let d = 0; d < 5; d++) {
        const id = `p${p}d${d}`
        deputies.push({ id, name: id, party: `PARTY${p}`, uf: "SP", legislature: 57 })
        summaryDeputies.push({ deputyId: id, eventsAttended: 50, plenaryEventsAttended: 25 })
      }
    }
    const summary: AttendanceBulkSummary = {
      totalEvents: 100,
      totalPlenarySessions: 50,
      deputies: summaryDeputies,
    }
    const result = aggregateAttendanceByParty(summary, deputies)
    expect(result.length).toBeLessThanOrEqual(15)
  })

  it("handles deputies not in summary (0 events)", () => {
    const bigParty: Deputy[] = Array.from({ length: 5 }, (_, i) => ({
      id: `bp${i}`, name: `BigP ${i}`, party: "BIG", uf: "SP", legislature: 57,
    }))
    const summary: AttendanceBulkSummary = {
      totalEvents: 100,
      totalPlenarySessions: 50,
      deputies: [
        { deputyId: "bp0", eventsAttended: 50, plenaryEventsAttended: 25 },
        // bp1-bp4 not in summary → 0 plenary events
      ],
    }
    const result = aggregateAttendanceByParty(summary, bigParty)
    // Average plenary: (25+0+0+0+0)/5 = 5 per deputy, 5/50*100 = 10%
    expect(result[0].value).toBe(10)
  })
})

// ── Votes by result ─────────────────────────────────────────────────

describe("aggregateVotesByResult", () => {
  it("counts sessions by approval result", () => {
    const result = aggregateVotesByResult(SESSIONS)
    expect(result).toContainEqual({ name: "Aprovada", value: 3 })
    expect(result).toContainEqual({ name: "Rejeitada", value: 1 })
    expect(result).toContainEqual({ name: "Indefinida", value: 1 })
  })

  it("result counts sum to input count", () => {
    const result = aggregateVotesByResult(SESSIONS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SESSIONS.length)
  })

  it("filters out zero-count results", () => {
    const allApproved: CamaraVotingSession[] = [
      { id: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, propositions: [], votingObjects: [] },
    ]
    const result = aggregateVotesByResult(allApproved)
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({ name: "Aprovada", value: 1 })
  })

  it("returns empty for empty input", () => {
    expect(aggregateVotesByResult([])).toEqual([])
  })
})
