/**
 * @file senado-utils.test.ts
 * @description Unit tests for the Senado overview aggregation helpers.
 */

import { describe, it, expect } from "vitest"
import {
  aggregateSenatorsByParty,
  aggregateSenatorsByUF,
  aggregatePropositionsByType,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateVotesByResult,
  aggregateAttendanceByParty,
  aggregateApprovalByType,
} from "./senado-utils"
import type {
  Senator,
  Proposition,
  SenadoVotingSession,
  SenatorAttendanceBulkSummary,
} from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const SENATORS: Senator[] = [
  { id: "1", name: "S1", party: "PT", uf: "SP", legislature: 57 },
  { id: "2", name: "S2", party: "PT", uf: "SP", legislature: 57 },
  { id: "3", name: "S3", party: "PT", uf: "RJ", legislature: 57 },
  { id: "4", name: "S4", party: "PL", uf: "RJ", legislature: 57 },
  { id: "5", name: "S5", party: "PL", uf: "MG", legislature: 57 },
  { id: "6", name: "S6", party: "PL", uf: "SP", legislature: 57 },
  { id: "7", name: "S7", party: "MDB", uf: "SP", legislature: 57 },
]

const PROPOSITIONS: Proposition[] = [
  { id: "1", identifier: "PL 1/2024", type: "PL", summary: "s", author: "x", authorParty: "PT", theme: "t", status: "Tramitando", lastUpdate: "2024-01-15", presentedDate: "2024-01-15" },
  { id: "2", identifier: "PL 2/2024", type: "PL", summary: "s", author: "x", authorParty: "PT", theme: "t", status: "Tramitando", lastUpdate: "2024-01-22", presentedDate: "2024-01-22" },
  { id: "3", identifier: "PEC 1/2024", type: "PEC", summary: "s", author: "x", authorParty: "PT", theme: "t", status: "Tramitando", lastUpdate: "2024-02-10", presentedDate: "2024-02-10" },
  { id: "4", identifier: "PL 3/2024", type: "PL", summary: "s", author: "x", authorParty: "PT", theme: "t", status: "Tramitando", lastUpdate: "2024-03-05", presentedDate: "2024-03-05" },
  { id: "5", identifier: "MP 1/2024", type: "MP", summary: "s", author: "x", authorParty: "PT", theme: "t", status: "Tramitando", lastUpdate: "2024-06-15", presentedDate: "2024-06-15" },
]

const SESSIONS: SenadoVotingSession[] = [
  { id: "1", date: "2024-01-10", description: "d", approved: true, matterIdentifier: "PL 10/2024" },
  { id: "2", date: "2024-01-20", description: "d", approved: false, matterIdentifier: "PL 11/2024" },
  { id: "3", date: "2024-02-15", description: "d", approved: true, matterIdentifier: "PEC 5/2024" },
  { id: "4", date: "2024-03-10", description: "d", approved: null, matterIdentifier: "PEC 6/2024" },
  { id: "5", date: "2024-03-20", description: "d", approved: true, matterIdentifier: "MP 1/2024" },
]

// ── Senators by party ───────────────────────────────────────────────

describe("aggregateSenatorsByParty", () => {
  it("counts senators per party, sorted descending", () => {
    const result = aggregateSenatorsByParty(SENATORS)
    expect(result[0]).toEqual({ name: "PT", value: 3 })
    expect(result[1]).toEqual({ name: "PL", value: 3 })
    expect(result[2]).toEqual({ name: "MDB", value: 1 })
  })

  it("party counts sum to total senators", () => {
    const result = aggregateSenatorsByParty(SENATORS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SENATORS.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregateSenatorsByParty([])).toEqual([])
  })
})

// ── Senators by UF ──────────────────────────────────────────────────

describe("aggregateSenatorsByUF", () => {
  it("counts senators per UF, sorted descending", () => {
    const result = aggregateSenatorsByUF(SENATORS)
    expect(result[0]).toEqual({ name: "SP", value: 4 })
    expect(result[1]).toEqual({ name: "RJ", value: 2 })
    expect(result[2]).toEqual({ name: "MG", value: 1 })
  })

  it("UF counts sum to total senators", () => {
    const result = aggregateSenatorsByUF(SENATORS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SENATORS.length)
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

  it("falls back to lastUpdate when presentedDate is missing", () => {
    const props: Proposition[] = [
      { id: "1", identifier: "PL", type: "PL", summary: "", author: "", authorParty: "", theme: "", status: "Tramitando", lastUpdate: "2024-04-15" },
    ]
    const result = aggregatePropositionsByMonth(props)
    expect(result[3].value).toBe(1)
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

  it("returns 12 zero-buckets for empty input", () => {
    const result = aggregateVotingSessionsByMonth([])
    expect(result.length).toBe(12)
    expect(result.every((r) => r.value === 0)).toBe(true)
  })
})

// ── Votes by result ─────────────────────────────────────────────────

describe("aggregateVotesByResult", () => {
  it("counts sessions by approval result", () => {
    const result = aggregateVotesByResult(SESSIONS)
    expect(result).toContainEqual({ name: "Aprovada", value: 3 })
    expect(result).toContainEqual({ name: "Rejeitada", value: 1 })
    expect(result).toContainEqual({ name: "Sem registro", value: 1 })
  })

  it("filters out zero-count buckets", () => {
    const allApproved: SenadoVotingSession[] = [
      { id: "1", date: "2024-01-01", description: "d", approved: true },
    ]
    const result = aggregateVotesByResult(allApproved)
    expect(result.length).toBe(1)
    expect(result[0]).toEqual({ name: "Aprovada", value: 1 })
  })
})

// ── Attendance by party ─────────────────────────────────────────────

describe("aggregateAttendanceByParty", () => {
  it("averages per-senator percentages within each party", () => {
    const senators: Senator[] = Array.from({ length: 4 }, (_, i) => ({
      id: `pt${i}`, name: `S${i}`, party: "PT", uf: "SP", legislature: 57,
    }))
    const summary: SenatorAttendanceBulkSummary = {
      year: 2024,
      totalSessions: 100,
      totalDeliberative: 80,
      senators: [
        { senatorId: "pt0", attended: 80, missed: 0, percentage: 100, attendedDates: [] },
        { senatorId: "pt1", attended: 60, missed: 20, percentage: 75, attendedDates: [] },
        { senatorId: "pt2", attended: 70, missed: 10, percentage: 88, attendedDates: [] },
        { senatorId: "pt3", attended: 50, missed: 30, percentage: 63, attendedDates: [] },
      ],
    }
    const result = aggregateAttendanceByParty(summary, senators)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe("PT")
    // (100 + 75 + 88 + 63) / 4 = 81.5 → rounds to 82
    expect(result[0].value).toBe(82)
  })

  it("excludes parties with fewer than 3 attending senators", () => {
    const senators: Senator[] = [
      { id: "1", name: "S1", party: "SMALL", uf: "SP", legislature: 57 },
      { id: "2", name: "S2", party: "SMALL", uf: "SP", legislature: 57 },
    ]
    const summary: SenatorAttendanceBulkSummary = {
      year: 2024,
      totalSessions: 100,
      totalDeliberative: 80,
      senators: [
        { senatorId: "1", attended: 40, missed: 40, percentage: 50, attendedDates: [] },
        { senatorId: "2", attended: 40, missed: 40, percentage: 50, attendedDates: [] },
      ],
    }
    expect(aggregateAttendanceByParty(summary, senators)).toEqual([])
  })

  it("returns empty when there are zero deliberative sessions", () => {
    const summary: SenatorAttendanceBulkSummary = {
      year: 2024,
      totalSessions: 0,
      totalDeliberative: 0,
      senators: [],
    }
    expect(aggregateAttendanceByParty(summary, SENATORS)).toEqual([])
  })

  it("ignores senators absent from the summary", () => {
    const senators: Senator[] = Array.from({ length: 4 }, (_, i) => ({
      id: `s${i}`, name: `S${i}`, party: "X", uf: "SP", legislature: 57,
    }))
    const summary: SenatorAttendanceBulkSummary = {
      year: 2024,
      totalSessions: 80,
      totalDeliberative: 80,
      senators: [
        { senatorId: "s0", attended: 80, missed: 0, percentage: 100, attendedDates: [] },
        { senatorId: "s1", attended: 80, missed: 0, percentage: 100, attendedDates: [] },
        { senatorId: "s2", attended: 80, missed: 0, percentage: 100, attendedDates: [] },
        // s3 missing — should be skipped, not counted as 0
      ],
    }
    const result = aggregateAttendanceByParty(summary, senators)
    expect(result[0].value).toBe(100)
  })
})

// ── Approval by type ────────────────────────────────────────────────

describe("aggregateApprovalByType", () => {
  it("groups by matter prefix and computes approval rate", () => {
    const result = aggregateApprovalByType(SESSIONS)
    const pl = result.find((r) => r.type === "PL")
    const pec = result.find((r) => r.type === "PEC")
    expect(pl).toMatchObject({ total: 2, approved: 1, rate: 50 })
    expect(pec).toMatchObject({ total: 2, approved: 1, rate: 50 })
  })

  it("excludes types with fewer than 2 sessions", () => {
    const result = aggregateApprovalByType(SESSIONS)
    expect(result.find((r) => r.type === "MP")).toBeUndefined()
  })

  it("buckets sessions without matterIdentifier under \"Outro\"", () => {
    const sessions: SenadoVotingSession[] = [
      { id: "1", date: "2024-01-01", description: "d", approved: true },
      { id: "2", date: "2024-01-02", description: "d", approved: false },
    ]
    const result = aggregateApprovalByType(sessions)
    expect(result[0]).toMatchObject({ type: "Outro", total: 2, approved: 1, rate: 50 })
  })
})
