/**
 * @file attendance-utils.ts
 * @description Server-safe aggregation functions for senator plenary attendance.
 *
 * Operates on the per-session shape produced by `getSenatorAttendanceDetail`
 * (one row per plenary session, with a boolean `attended` flag) instead of the
 * Câmara per-event shape. Two consequences:
 *
 * 1. There is no "by event type" distribution — every Senado session is the
 *    same kind of event (plenary). Câmara has committees, public hearings,
 *    seminars, etc. mixed into the bulk file; the Senate keeps those in
 *    separate `/comissao` endpoints.
 * 2. The deliberative-only filter is already applied upstream via
 *    {@link SenatorAttendanceDay.isDeliberative}; aggregations here only need
 *    to inspect the boolean.
 */

import type { SenatorAttendanceDay } from "@imposterio/types"
import { assertNonNegative } from "@/lib/calc"

/** Daily presence count for the CalendarHeatmap (1 = present, 0 = absent). */
export interface DailyAttendance {
  date: string
  count: number
}

/** Monthly presence summary for the bar chart. */
export interface MonthlyAttendance {
  /** Month index (1–12). */
  month: number
  /** Deliberative sessions held in the month. */
  total: number
  /** Deliberative sessions the senator attended in the month. */
  attended: number
}

/**
 * Filters the session list down to deliberative sessions only.
 *
 * Most charts and rate calculations should run on the deliberative subset
 * — these are the sessions where votes happen and presence is mandatory.
 * Ceremonial sessions ("Sessão Solene") are left in the raw input so a
 * full timeline can still be rendered if needed.
 */
export function filterDeliberative(
  sessions: SenatorAttendanceDay[],
): SenatorAttendanceDay[] {
  return sessions.filter((s) => s.isDeliberative)
}

/**
 * Aggregates attended sessions by day for the CalendarHeatmap.
 *
 * Every session the senator attended is counted regardless of type. Multiple
 * sessions on the same day collapse to a single date entry with a count.
 *
 * @param sessions - Per-session attendance rows
 * @returns Array of `{ date, count }` sorted ascending by date
 */
export function aggregateAttendedByDay(
  sessions: SenatorAttendanceDay[],
): DailyAttendance[] {
  const dayMap = new Map<string, number>()
  for (const s of sessions) {
    if (!s.attended || !s.date) continue
    const day = s.date.slice(0, 10)
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  return Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Builds month-by-month attended/total counts for a bar chart.
 *
 * Always returns 12 entries (Jan–Dec) so the chart renders a stable axis even
 * for the running year (where later months have zero sessions).
 *
 * @param sessions - Per-session attendance rows (deliberative-only is fine)
 * @returns Twelve-entry array indexed by calendar month
 */
export function aggregateByMonth(
  sessions: SenatorAttendanceDay[],
): MonthlyAttendance[] {
  const totals = new Map<number, number>()
  const attendedMap = new Map<number, number>()
  for (const s of sessions) {
    if (!s.date || !s.isDeliberative) continue
    const month = new Date(s.date + "T12:00:00").getMonth() + 1
    if (!Number.isFinite(month)) continue
    totals.set(month, (totals.get(month) ?? 0) + 1)
    if (s.attended) {
      attendedMap.set(month, (attendedMap.get(month) ?? 0) + 1)
    }
  }
  const result: MonthlyAttendance[] = []
  for (let m = 1; m <= 12; m++) {
    result.push({
      month: m,
      total: totals.get(m) ?? 0,
      attended: attendedMap.get(m) ?? 0,
    })
  }
  assertNonNegative(
    result.map((r) => r.attended),
    "attendance aggregateByMonth.attended",
  )
  assertNonNegative(
    result.map((r) => r.total),
    "attendance aggregateByMonth.total",
  )
  return result
}

/**
 * Renders monthly counts as `{ label, value }` pairs for the BarChart primitive.
 *
 * Two pairs are emitted per month — one for attended, one for total — so a
 * single-axis bar chart can be substituted with a stacked or grouped variant
 * later without rewriting the aggregator.
 */
export function monthlyToBarData(
  monthly: MonthlyAttendance[],
): Array<{ label: string; value: number }> {
  const labels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ]
  return monthly.map((m) => ({
    label: labels[m.month - 1],
    value: m.attended,
  }))
}

/** Counts unique dates the senator was present at any session. */
export function countActiveDays(sessions: SenatorAttendanceDay[]): number {
  const set = new Set<string>()
  for (const s of sessions) {
    if (s.attended && s.date) set.add(s.date.slice(0, 10))
  }
  return set.size
}
