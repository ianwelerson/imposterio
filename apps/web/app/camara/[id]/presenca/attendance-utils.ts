/**
 * @file attendance-utils.ts
 * @description Server-safe aggregation functions for deputy attendance data.
 *
 * Processes attendance event records to produce chart-ready data:
 * - Daily attendance for CalendarHeatmap (all events, plenary-only, non-plenary)
 * - Attendance by event type for distribution charts
 * - Hours of activity per week for workload analysis
 * - Plenary session filtering and rate computation
 *
 * "Plenary sessions" (Sessões Deliberativas) are the formal voting sessions
 * in the Chamber plenary. They are the most politically significant events,
 * as this is where deputies vote on legislation. Other event types include
 * committee hearings, public audiences, seminars, etc.
 */

import type { DeputyAttendanceEvent } from "@imposterio/fetchers"
import type { DeputyEvent } from "@imposterio/types"
import { assertNonNegative } from "@/lib/calc"

/** Daily count entry for CalendarHeatmap. */
export interface DailyAttendance {
  date: string
  count: number
}

/** Event type distribution entry for charts. */
export interface AttendanceByType {
  name: string
  count: number
}

/** Weekly hours entry for bar charts. */
export interface WeeklyHours {
  label: string
  value: number
}

/**
 * Plenary session types where deputy attendance is expected and civically
 * meaningful. Only deliberative and preparatory sessions count — these are
 * where voting happens and presence is mandatory.
 *
 * Excluded: "Sessão Não Deliberativa Solene" — ceremonial/honorary sessions
 * where attendance is optional. The previous `.includes()` matching caused
 * "Sessão Não Deliberativa" to match "Sessão Não Deliberativa Solene",
 * inflating the denominator by ~50% and producing inaccurate attendance rates.
 */
const PLENARY_TYPES = new Set([
  "Sessão Deliberativa",
  "Sessão Preparatória",
])

/**
 * Checks whether an event is a mandatory plenary session based on its type.
 * Uses exact matching to avoid false positives from ceremonial sessions.
 *
 * @param eventType - The event type string from the bulk data
 * @returns true if the event is a mandatory plenary session
 */
export function isPlenarySession(eventType: string): boolean {
  return PLENARY_TYPES.has(eventType)
}

/**
 * Filters attendance events to only plenary sessions.
 *
 * @param events - All attendance events for the deputy
 * @returns Only events that are plenary sessions
 */
export function filterPlenarySessions(
  events: DeputyAttendanceEvent[],
): DeputyAttendanceEvent[] {
  return events.filter((e) => isPlenarySession(e.eventType))
}

/**
 * Aggregates attendance events by day for CalendarHeatmap.
 * Each day gets a count of how many events the deputy attended.
 *
 * @param events - Attendance events to aggregate
 * @returns Array of { date, count } sorted by date ascending
 */
export function aggregateByDay(
  events: DeputyAttendanceEvent[],
): DailyAttendance[] {
  const dayMap = new Map<string, number>()
  for (const e of events) {
    if (!e.date) continue
    const day = e.date.slice(0, 10) // YYYY-MM-DD
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  return Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Aggregates attendance events by event type for bar/pie charts.
 *
 * @param events - Attendance events to aggregate
 * @returns Array of { name, count } sorted by count descending
 */
export function aggregateByEventType(
  events: DeputyAttendanceEvent[],
): AttendanceByType[] {
  const typeMap = new Map<string, number>()
  for (const e of events) {
    const type = e.eventType || "Não classificado"
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1)
  }
  return Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Counts unique days with at least one attendance event.
 *
 * @param events - All attendance events for the deputy
 * @returns Number of distinct days with activity
 */
export function countActiveDays(events: DeputyAttendanceEvent[]): number {
  const days = new Set<string>()
  for (const e of events) {
    if (e.date) days.add(e.date.slice(0, 10))
  }
  return days.size
}

/**
 * Aggregates hours of activity per week from event start/end times.
 *
 * Uses DeputyEvent (REST API data) because it includes both startTime and
 * endTime, allowing duration computation. Events without an endTime are
 * excluded since duration is unknown.
 *
 * ISO week numbers are used (Monday-based). Each entry shows the total
 * hours the deputy spent in events during that week.
 *
 * @param events - Events with startTime and optional endTime
 * @param year - Year being displayed (to filter and label weeks correctly)
 * @returns Array of { label, value } for each week with activity, sorted chronologically
 */
export function aggregateHoursPerWeek(
  events: DeputyEvent[],
  year: number,
): WeeklyHours[] {
  const weekMap = new Map<number, number>()

  for (const e of events) {
    if (!e.startTime || !e.endTime) continue

    const start = new Date(e.startTime)
    const end = new Date(e.endTime)

    // Skip events outside the target year
    if (start.getFullYear() !== year) continue

    const durationMs = end.getTime() - start.getTime()
    // Skip negative or zero durations and events longer than 24h (data errors)
    if (durationMs <= 0 || durationMs > 24 * 60 * 60 * 1000) continue

    const hours = durationMs / (1000 * 60 * 60)
    const weekNum = getISOWeek(start)
    weekMap.set(weekNum, (weekMap.get(weekNum) ?? 0) + hours)
  }

  const result = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, hours]) => ({
      label: `Sem. ${week}`,
      value: Math.round(hours * 10) / 10,
    }))
  assertNonNegative(result.map((r) => r.value), "weekly hours")
  return result
}

/**
 * Returns the ISO 8601 week number for a given date (Monday-based, 1–53).
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
