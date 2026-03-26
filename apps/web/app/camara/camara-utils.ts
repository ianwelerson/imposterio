/**
 * @file camara-utils.ts
 * @description Server-safe aggregation functions for the Câmara overview page.
 *
 * Transforms deputy list data and legislative activity data into chart-ready
 * formats. Runs server-side (no "use client") and results are passed as props
 * to client chart components.
 */

import type { Deputy } from "@imposterio/types"
import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"
import type { AttendanceBulkSummary } from "@imposterio/fetchers"
import { assertValidPercent, assertNonNegative, assertTwelveMonths } from "@/lib/calc"

/** Simple name→value pair for chart data. */
export interface CountItem {
  name: string
  value: number
}

/** Monthly count for line/bar charts. */
export interface MonthlyCount {
  label: string
  value: number
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

/**
 * Aggregates deputies by party, returning counts sorted descending.
 * Useful for a bar chart showing party caucus sizes.
 */
export function aggregateDeputiesByParty(deputies: Deputy[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const d of deputies) {
    counts.set(d.party, (counts.get(d.party) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Aggregates deputies by state (UF), returning counts sorted descending.
 * Shows the geographic distribution of seats in the Chamber.
 */
export function aggregateDeputiesByUF(deputies: Deputy[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const d of deputies) {
    counts.set(d.uf, (counts.get(d.uf) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Aggregates propositions by type code (PL, PEC, PLP, MP, etc.).
 * Returns sorted by count descending.
 */
export function aggregatePropositionsByType(propositions: CamaraProposition[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const p of propositions) {
    counts.set(p.typeCode, (counts.get(p.typeCode) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Aggregates propositions by month of presentation.
 * Returns 12 entries (Jan–Dec) using Portuguese month abbreviations.
 */
export function aggregatePropositionsByMonth(propositions: CamaraProposition[]): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const p of propositions) {
    const month = new Date(p.presentedDate).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  const result = MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
  assertTwelveMonths(result, "propositions by month")
  return result
}

/**
 * Aggregates voting sessions by month.
 * Returns 12 entries (Jan–Dec) using Portuguese month abbreviations.
 */
export function aggregateVotingSessionsByMonth(sessions: CamaraVotingSession[]): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const s of sessions) {
    const month = new Date(s.date).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  const result = MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
  assertTwelveMonths(result, "voting sessions by month")
  return result
}

/**
 * Aggregates event attendance by party as an average attendance rate (%).
 *
 * Uses the pre-aggregated `AttendanceBulkSummary` (totalEvents + per-deputy counts)
 * instead of raw attendance records, since the raw file exceeds 5MB.
 *
 * For each party:
 * 1. Identify all deputies belonging to that party (from deputies list)
 * 2. Look up each deputy's event count from the summary
 * 3. Compute the average attendance rate: mean(events attended per member) / total events × 100
 *
 * Only includes parties with at least 5 deputies for statistical relevance.
 *
 * @param summary  - Pre-aggregated attendance summary (totalEvents + per-deputy counts)
 * @param deputies - Current deputies list (provides party mapping)
 * @returns Attendance rate per party, sorted descending, top 15
 */
export function aggregateAttendanceByParty(
  summary: AttendanceBulkSummary,
  deputies: Deputy[],
): CountItem[] {
  if (summary.totalEvents === 0) return []

  // Build a lookup: deputyId → eventsAttended
  const deputyEvents = new Map<string, number>()
  for (const d of summary.deputies) {
    deputyEvents.set(d.deputyId, d.eventsAttended)
  }

  // Group deputies by party
  const partyMembers = new Map<string, string[]>()
  for (const d of deputies) {
    const members = partyMembers.get(d.party) ?? []
    members.push(d.id)
    partyMembers.set(d.party, members)
  }

  const result: CountItem[] = []
  for (const [party, members] of partyMembers) {
    // Only include parties with at least 5 deputies
    if (members.length < 5) continue

    const totalAttended = members.reduce(
      (sum, id) => sum + (deputyEvents.get(id) ?? 0),
      0,
    )
    const avgRate = Math.round((totalAttended / members.length / summary.totalEvents) * 100)
    assertValidPercent(avgRate, `attendance rate for party ${party}`)
    result.push({ name: party, value: avgRate })
  }

  return result.sort((a, b) => b.value - a.value).slice(0, 15)
}

/**
 * Aggregates voting sessions by approval result.
 * Returns entries for Aprovada, Rejeitada, and Indefinida (filtered to non-zero).
 */
export function aggregateVotesByResult(sessions: CamaraVotingSession[]): CountItem[] {
  let approved = 0
  let rejected = 0
  let inconclusive = 0

  for (const s of sessions) {
    if (s.approved === true) approved++
    else if (s.approved === false) rejected++
    else inconclusive++
  }

  return [
    { name: "Aprovada", value: approved },
    { name: "Rejeitada", value: rejected },
    { name: "Indefinida", value: inconclusive },
  ].filter((item) => item.value > 0)
}
