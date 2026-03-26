/**
 * @file attendance-utils.test.ts
 * @description Unit tests for deputy attendance aggregation functions.
 *
 * Tests cover: plenary session detection, session filtering, daily aggregation,
 * event type aggregation, active days counting, and weekly hours computation.
 */

import { describe, it, expect } from "vitest"
import {
  isPlenarySession,
  filterPlenarySessions,
  aggregateByDay,
  aggregateByEventType,
  countActiveDays,
  aggregateHoursPerWeek,
} from "./attendance-utils"
import type { DeputyAttendanceEvent } from "@imposterio/fetchers"
import type { DeputyEvent } from "@imposterio/types"

// ── Fixtures ────────────────────────────────────────────────────────

const ATTENDANCE_EVENTS: DeputyAttendanceEvent[] = [
  { eventId: "1", date: "2024-01-10T12:00:00", eventType: "Sessão Deliberativa Ordinária", description: "d1", status: "Encerrada" },
  { eventId: "2", date: "2024-01-10T14:00:00", eventType: "Audiência Pública", description: "d2", status: "Encerrada" },
  { eventId: "3", date: "2024-01-15T12:00:00", eventType: "Sessão Deliberativa Extraordinária", description: "d3", status: "Encerrada" },
  { eventId: "4", date: "2024-02-05T12:00:00", eventType: "Sessão Solene", description: "d4", status: "Encerrada" },
  { eventId: "5", date: "2024-02-10T12:00:00", eventType: "Seminário", description: "d5", status: "Encerrada" },
  { eventId: "6", date: "2024-03-01T12:00:00", eventType: "Sessão Não Deliberativa", description: "d6", status: "Encerrada" },
  { eventId: "7", date: "2024-03-01T14:00:00", eventType: "Sessão Preparatória", description: "d7", status: "Encerrada" },
]

// ── isPlenarySession ────────────────────────────────────────────────

describe("isPlenarySession", () => {
  it("returns true for Sessão Deliberativa types", () => {
    expect(isPlenarySession("Sessão Deliberativa Ordinária")).toBe(true)
    expect(isPlenarySession("Sessão Deliberativa Extraordinária")).toBe(true)
    expect(isPlenarySession("Sessão Deliberativa")).toBe(true)
  })

  it("returns true for other plenary session types", () => {
    expect(isPlenarySession("Sessão Não Deliberativa")).toBe(true)
    expect(isPlenarySession("Sessão Solene")).toBe(true)
    expect(isPlenarySession("Sessão Preparatória")).toBe(true)
  })

  it("returns false for non-plenary event types", () => {
    expect(isPlenarySession("Audiência Pública")).toBe(false)
    expect(isPlenarySession("Seminário")).toBe(false)
    expect(isPlenarySession("Reunião de Bancada")).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isPlenarySession("")).toBe(false)
  })
})

// ── filterPlenarySessions ───────────────────────────────────────────

describe("filterPlenarySessions", () => {
  it("filters to only plenary session events", () => {
    const result = filterPlenarySessions(ATTENDANCE_EVENTS)
    // Events 1, 3, 4, 6, 7 are plenary sessions
    expect(result.length).toBe(5)
    for (const e of result) {
      expect(isPlenarySession(e.eventType)).toBe(true)
    }
  })

  it("returns empty array when no plenary sessions exist", () => {
    const nonPlenary: DeputyAttendanceEvent[] = [
      { eventId: "1", date: "2024-01-10T12:00:00", eventType: "Audiência Pública", description: "d1", status: "Encerrada" },
    ]
    expect(filterPlenarySessions(nonPlenary)).toEqual([])
  })

  it("returns empty array for empty input", () => {
    expect(filterPlenarySessions([])).toEqual([])
  })
})

// ── aggregateByDay ──────────────────────────────────────────────────

describe("aggregateByDay (attendance)", () => {
  it("counts events per day", () => {
    const result = aggregateByDay(ATTENDANCE_EVENTS)
    // 2024-01-10 has 2 events, 2024-03-01 has 2 events
    const jan10 = result.find((r) => r.date === "2024-01-10")
    expect(jan10?.count).toBe(2)
    const mar01 = result.find((r) => r.date === "2024-03-01")
    expect(mar01?.count).toBe(2)
  })

  it("returns results sorted by date ascending", () => {
    const result = aggregateByDay(ATTENDANCE_EVENTS)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date > result[i - 1].date).toBe(true)
    }
  })

  it("total daily counts equal input count", () => {
    const result = aggregateByDay(ATTENDANCE_EVENTS)
    const total = result.reduce((s, d) => s + d.count, 0)
    expect(total).toBe(ATTENDANCE_EVENTS.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregateByDay([])).toEqual([])
  })

  it("skips events with missing date", () => {
    const withMissing = [
      ...ATTENDANCE_EVENTS,
      { eventId: "8", date: "", eventType: "Test", description: "d8", status: "Encerrada" },
    ]
    const result = aggregateByDay(withMissing)
    const total = result.reduce((s, d) => s + d.count, 0)
    // Missing date event should be skipped
    expect(total).toBe(ATTENDANCE_EVENTS.length)
  })
})

// ── aggregateByEventType ────────────────────────────────────────────

describe("aggregateByEventType", () => {
  it("counts events by type, sorted descending", () => {
    const result = aggregateByEventType(ATTENDANCE_EVENTS)
    expect(result.length).toBeGreaterThan(0)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count)
    }
  })

  it("type counts sum to input count", () => {
    const result = aggregateByEventType(ATTENDANCE_EVENTS)
    const total = result.reduce((s, r) => s + r.count, 0)
    expect(total).toBe(ATTENDANCE_EVENTS.length)
  })

  it("returns empty for empty input", () => {
    expect(aggregateByEventType([])).toEqual([])
  })

  it("uses 'Não classificado' for events with empty type", () => {
    const events: DeputyAttendanceEvent[] = [
      { eventId: "1", date: "2024-01-10T12:00:00", eventType: "", description: "d1", status: "Encerrada" },
    ]
    const result = aggregateByEventType(events)
    expect(result[0].name).toBe("Não classificado")
  })
})

// ── countActiveDays ─────────────────────────────────────────────────

describe("countActiveDays", () => {
  it("counts unique days with events", () => {
    const result = countActiveDays(ATTENDANCE_EVENTS)
    // Unique days: 2024-01-10, 2024-01-15, 2024-02-05, 2024-02-10, 2024-03-01
    expect(result).toBe(5)
  })

  it("returns 0 for empty input", () => {
    expect(countActiveDays([])).toBe(0)
  })

  it("counts a day with multiple events as 1", () => {
    const sameDay: DeputyAttendanceEvent[] = [
      { eventId: "1", date: "2024-01-10T10:00:00", eventType: "A", description: "d1", status: "Encerrada" },
      { eventId: "2", date: "2024-01-10T14:00:00", eventType: "B", description: "d2", status: "Encerrada" },
      { eventId: "3", date: "2024-01-10T16:00:00", eventType: "C", description: "d3", status: "Encerrada" },
    ]
    expect(countActiveDays(sameDay)).toBe(1)
  })
})

// ── aggregateHoursPerWeek ───────────────────────────────────────────

describe("aggregateHoursPerWeek", () => {
  const DEPUTY_EVENTS: DeputyEvent[] = [
    { id: "1", startTime: "2024-01-08T09:00:00", endTime: "2024-01-08T12:00:00", status: "Encerrada", type: "Sessão", description: "d1", organs: [] }, // 3h, week 2
    { id: "2", startTime: "2024-01-08T14:00:00", endTime: "2024-01-08T17:00:00", status: "Encerrada", type: "Sessão", description: "d2", organs: [] }, // 3h, week 2
    { id: "3", startTime: "2024-01-15T10:00:00", endTime: "2024-01-15T12:30:00", status: "Encerrada", type: "Sessão", description: "d3", organs: [] }, // 2.5h, week 3
    { id: "4", startTime: "2024-02-05T09:00:00", endTime: "2024-02-05T11:00:00", status: "Encerrada", type: "Sessão", description: "d4", organs: [] }, // 2h, week 6
  ]

  it("computes hours per week from event durations", () => {
    const result = aggregateHoursPerWeek(DEPUTY_EVENTS, 2024)
    expect(result.length).toBe(3) // 3 distinct weeks
    // Week 2: 3 + 3 = 6h
    const week2 = result.find((r) => r.label === "Sem. 2")
    expect(week2?.value).toBe(6)
    // Week 3: 2.5h
    const week3 = result.find((r) => r.label === "Sem. 3")
    expect(week3?.value).toBe(2.5)
  })

  it("returns results sorted by week ascending", () => {
    const result = aggregateHoursPerWeek(DEPUTY_EVENTS, 2024)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].label > result[i - 1].label).toBe(true)
    }
  })

  it("skips events without endTime", () => {
    const events: DeputyEvent[] = [
      { id: "1", startTime: "2024-01-08T09:00:00", status: "Convocada", type: "Sessão", description: "d1", organs: [] },
    ]
    expect(aggregateHoursPerWeek(events, 2024)).toEqual([])
  })

  it("skips events outside target year", () => {
    const events: DeputyEvent[] = [
      { id: "1", startTime: "2023-12-20T09:00:00", endTime: "2023-12-20T12:00:00", status: "Encerrada", type: "Sessão", description: "d1", organs: [] },
    ]
    expect(aggregateHoursPerWeek(events, 2024)).toEqual([])
  })

  it("skips events with negative or zero duration", () => {
    const events: DeputyEvent[] = [
      { id: "1", startTime: "2024-01-08T12:00:00", endTime: "2024-01-08T12:00:00", status: "Encerrada", type: "Sessão", description: "d1", organs: [] },
      { id: "2", startTime: "2024-01-08T14:00:00", endTime: "2024-01-08T10:00:00", status: "Encerrada", type: "Sessão", description: "d2", organs: [] },
    ]
    expect(aggregateHoursPerWeek(events, 2024)).toEqual([])
  })

  it("skips events longer than 24 hours (data errors)", () => {
    const events: DeputyEvent[] = [
      { id: "1", startTime: "2024-01-08T09:00:00", endTime: "2024-01-10T09:00:01", status: "Encerrada", type: "Sessão", description: "d1", organs: [] },
    ]
    expect(aggregateHoursPerWeek(events, 2024)).toEqual([])
  })

  it("returns empty for empty input", () => {
    expect(aggregateHoursPerWeek([], 2024)).toEqual([])
  })

  it("rounds hours to 1 decimal place", () => {
    const events: DeputyEvent[] = [
      { id: "1", startTime: "2024-01-08T09:00:00", endTime: "2024-01-08T09:20:00", status: "Encerrada", type: "Sessão", description: "d1", organs: [] },
    ]
    const result = aggregateHoursPerWeek(events, 2024)
    // 20 minutes = 0.333... hours → rounds to 0.3
    expect(result[0].value).toBe(0.3)
  })
})
