/**
 * @file activity-utils.test.ts
 * @description Unit tests for deputy activity aggregation functions.
 *
 * Tests cover: speeches by type/month, events by type/month, committees
 * by role/type, votes by type/month, and vote alignment computation.
 * All date fixtures use T12:00:00 to avoid UTC/BRT timezone boundary issues.
 */

import { describe, it, expect } from "vitest"
import {
  aggregateSpeechesByType,
  aggregateSpeechesByMonth,
  aggregateEventsByType,
  aggregateEventsByMonth,
  aggregateCommitteesByRole,
  aggregateCommitteesByType,
  aggregateVotesByType,
  aggregateVotesByMonth,
  computeVoteAlignment,
} from "./activity-utils"
import type { DeputySpeech, DeputyEvent, DeputyCommittee, DeputyVotingRecord } from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const SPEECHES: DeputySpeech[] = [
  { startTime: "2024-01-10T12:00:00", type: "PELA ORDEM", phase: "Ordem do Dia", summary: "s1" },
  { startTime: "2024-01-20T12:00:00", type: "PELA ORDEM", phase: "Ordem do Dia", summary: "s2" },
  { startTime: "2024-02-15T12:00:00", type: "GRANDE EXPEDIENTE", phase: "Expediente", summary: "s3" },
  { startTime: "2024-03-10T12:00:00", type: "BREVES COMUNICAÇÕES", phase: "Comunicações", summary: "s4" },
  { startTime: "2024-03-20T12:00:00", type: "PELA ORDEM", phase: "Ordem do Dia", summary: "s5" },
]

const EVENTS: DeputyEvent[] = [
  { id: "1", startTime: "2024-01-10T12:00:00", status: "Encerrada", type: "Sessão Deliberativa", description: "d1", organs: [] },
  { id: "2", startTime: "2024-01-15T12:00:00", status: "Encerrada", type: "Audiência Pública", description: "d2", organs: [] },
  { id: "3", startTime: "2024-02-10T12:00:00", status: "Encerrada", type: "Sessão Deliberativa", description: "d3", organs: [] },
  { id: "4", startTime: "2024-06-05T12:00:00", status: "Encerrada", type: "Seminário", description: "d4", organs: [] },
]

const COMMITTEES: DeputyCommittee[] = [
  { id: "1", abbreviation: "CCJC", name: "Comissão de Constituição e Justiça", type: "Comissão Permanente", role: "Titular", startDate: "2024-01-01" },
  { id: "2", abbreviation: "CFT", name: "Comissão de Finanças e Tributação", type: "Comissão Permanente", role: "Suplente", startDate: "2024-01-01" },
  { id: "3", abbreviation: "CPI", name: "CPI dos Jogos", type: "CPI", role: "Titular", startDate: "2024-02-01" },
  { id: "4", abbreviation: "CE", name: "Comissão Especial PEC 123", type: "Comissão Especial", role: "Titular", startDate: "2024-03-01" },
]

const VOTES: DeputyVotingRecord[] = [
  { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Sim", propositions: [] },
  { sessionId: "2", date: "2024-01-15T12:00:00", description: "d2", approved: true, vote: "Não", propositions: [] },
  { sessionId: "3", date: "2024-02-10T12:00:00", description: "d3", approved: false, vote: "Não", propositions: [] },
  { sessionId: "4", date: "2024-02-20T12:00:00", description: "d4", approved: false, vote: "Sim", propositions: [] },
  { sessionId: "5", date: "2024-03-05T12:00:00", description: "d5", approved: true, vote: "Sim", propositions: [] },
  { sessionId: "6", date: "2024-03-15T12:00:00", description: "d6", approved: null, vote: "Abstenção", propositions: [] },
  { sessionId: "7", date: "2024-06-10T12:00:00", description: "d7", approved: true, vote: "Obstrução", propositions: [] },
]

// ── Speeches by type ────────────────────────────────────────────────

describe("aggregateSpeechesByType", () => {
  it("counts speeches by type, sorted descending", () => {
    const result = aggregateSpeechesByType(SPEECHES)
    expect(result[0]).toEqual({ name: "PELA ORDEM", value: 3 })
    expect(result).toContainEqual({ name: "GRANDE EXPEDIENTE", value: 1 })
    expect(result).toContainEqual({ name: "BREVES COMUNICAÇÕES", value: 1 })
  })

  it("type counts sum to input count", () => {
    const result = aggregateSpeechesByType(SPEECHES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SPEECHES.length)
  })

  it("returns empty for no speeches", () => {
    expect(aggregateSpeechesByType([])).toEqual([])
  })
})

// ── Speeches by month ───────────────────────────────────────────────

describe("aggregateSpeechesByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregateSpeechesByMonth(SPEECHES)
    expect(result.length).toBe(12)
    expect(result[0]).toEqual({ label: "Jan", value: 2 })  // Jan
    expect(result[1]).toEqual({ label: "Fev", value: 1 })  // Feb
    expect(result[2]).toEqual({ label: "Mar", value: 2 })  // Mar
    expect(result[3].value).toBe(0)  // Apr
  })

  it("monthly counts sum to input count", () => {
    const result = aggregateSpeechesByMonth(SPEECHES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(SPEECHES.length)
  })

  it("uses Portuguese month labels", () => {
    const result = aggregateSpeechesByMonth([])
    expect(result[0].label).toBe("Jan")
    expect(result[11].label).toBe("Dez")
  })
})

// ── Events by type ──────────────────────────────────────────────────

describe("aggregateEventsByType", () => {
  it("counts events by type, sorted descending", () => {
    const result = aggregateEventsByType(EVENTS)
    expect(result[0]).toEqual({ name: "Sessão Deliberativa", value: 2 })
  })

  it("type counts sum to input count", () => {
    const result = aggregateEventsByType(EVENTS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(EVENTS.length)
  })

  it("returns empty for no events", () => {
    expect(aggregateEventsByType([])).toEqual([])
  })
})

// ── Events by month ─────────────────────────────────────────────────

describe("aggregateEventsByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregateEventsByMonth(EVENTS)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[1].value).toBe(1)  // Feb
    expect(result[5].value).toBe(1)  // Jun
  })

  it("monthly counts sum to input count", () => {
    const result = aggregateEventsByMonth(EVENTS)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(EVENTS.length)
  })
})

// ── Committees by role ──────────────────────────────────────────────

describe("aggregateCommitteesByRole", () => {
  it("counts committees by role, sorted descending", () => {
    const result = aggregateCommitteesByRole(COMMITTEES)
    expect(result[0]).toEqual({ name: "Titular", value: 3 })
    expect(result[1]).toEqual({ name: "Suplente", value: 1 })
  })

  it("role counts sum to input count", () => {
    const result = aggregateCommitteesByRole(COMMITTEES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(COMMITTEES.length)
  })

  it("returns empty for no committees", () => {
    expect(aggregateCommitteesByRole([])).toEqual([])
  })
})

// ── Committees by type ──────────────────────────────────────────────

describe("aggregateCommitteesByType", () => {
  it("counts committees by type, sorted descending", () => {
    const result = aggregateCommitteesByType(COMMITTEES)
    expect(result[0]).toEqual({ name: "Comissão Permanente", value: 2 })
  })

  it("type counts sum to input count", () => {
    const result = aggregateCommitteesByType(COMMITTEES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(COMMITTEES.length)
  })
})

// ── Votes by type ───────────────────────────────────────────────────

describe("aggregateVotesByType", () => {
  it("counts votes by vote type, sorted descending", () => {
    const result = aggregateVotesByType(VOTES)
    expect(result[0]).toEqual({ name: "Sim", value: 3 })
    expect(result).toContainEqual({ name: "Não", value: 2 })
    expect(result).toContainEqual({ name: "Abstenção", value: 1 })
    expect(result).toContainEqual({ name: "Obstrução", value: 1 })
  })

  it("type counts sum to input count", () => {
    const result = aggregateVotesByType(VOTES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(VOTES.length)
  })

  it("returns empty for no votes", () => {
    expect(aggregateVotesByType([])).toEqual([])
  })
})

// ── Votes by month ──────────────────────────────────────────────────

describe("aggregateVotesByMonth", () => {
  it("returns 12 months with correct counts", () => {
    const result = aggregateVotesByMonth(VOTES)
    expect(result[0].value).toBe(2)  // Jan
    expect(result[1].value).toBe(2)  // Feb
    expect(result[2].value).toBe(2)  // Mar
    expect(result[5].value).toBe(1)  // Jun
  })

  it("monthly counts sum to input count", () => {
    const result = aggregateVotesByMonth(VOTES)
    expect(result.reduce((s, r) => s + r.value, 0)).toBe(VOTES.length)
  })
})

// ── computeVoteAlignment ────────────────────────────────────────────

describe("computeVoteAlignment", () => {
  it("computes percentage of votes aligned with the winning side", () => {
    // Decided votes (approved !== null): sessions 1-5, 7
    // Session 1: approved=true, vote=Sim → aligned
    // Session 2: approved=true, vote=Não → NOT aligned
    // Session 3: approved=false, vote=Não → aligned
    // Session 4: approved=false, vote=Sim → NOT aligned
    // Session 5: approved=true, vote=Sim → aligned
    // Session 7: approved=true, vote=Obstrução → NOT aligned
    // Aligned: 3 out of 6 = 50%
    expect(computeVoteAlignment(VOTES)).toBe(50)
  })

  it("returns 0 for no votes", () => {
    expect(computeVoteAlignment([])).toBe(0)
  })

  it("returns 0 when all votes are undecided (approved=null)", () => {
    const undecided: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: null, vote: "Sim", propositions: [] },
    ]
    expect(computeVoteAlignment(undecided)).toBe(0)
  })

  it("returns 100 when all decided votes are aligned", () => {
    const allAligned: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Sim", propositions: [] },
      { sessionId: "2", date: "2024-01-15T12:00:00", description: "d2", approved: false, vote: "Não", propositions: [] },
    ]
    expect(computeVoteAlignment(allAligned)).toBe(100)
  })

  it("returns 0 when no decided votes are aligned", () => {
    const noneAligned: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Não", propositions: [] },
      { sessionId: "2", date: "2024-01-15T12:00:00", description: "d2", approved: false, vote: "Sim", propositions: [] },
    ]
    expect(computeVoteAlignment(noneAligned)).toBe(0)
  })

  it("excludes undecided sessions from alignment calculation", () => {
    const mixed: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Sim", propositions: [] },
      { sessionId: "2", date: "2024-01-15T12:00:00", description: "d2", approved: null, vote: "Sim", propositions: [] },
    ]
    // 1 aligned out of 1 decided = 100%
    expect(computeVoteAlignment(mixed)).toBe(100)
  })

  it("rounds to nearest integer", () => {
    const threeDecided: DeputyVotingRecord[] = [
      { sessionId: "1", date: "2024-01-10T12:00:00", description: "d1", approved: true, vote: "Sim", propositions: [] },
      { sessionId: "2", date: "2024-01-15T12:00:00", description: "d2", approved: true, vote: "Não", propositions: [] },
      { sessionId: "3", date: "2024-01-20T12:00:00", description: "d3", approved: true, vote: "Não", propositions: [] },
    ]
    // 1 out of 3 = 33.33... → rounds to 33
    expect(computeVoteAlignment(threeDecided)).toBe(33)
  })
})
