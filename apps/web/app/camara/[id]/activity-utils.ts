/**
 * @file activity-utils.ts
 * @description Pure utility functions for aggregating deputy activity data
 * (speeches, events, committees, voting history) for chart visualizations.
 * Not a client component — safe to import from server components.
 */

import type { DeputySpeech, DeputyEvent, DeputyCommittee, DeputyVotingRecord } from "@imposterio/types"
import { assertValidPercent, assertTwelveMonths } from "@/lib/calc"

/** A keyword with its occurrence count, used for tag cloud rendering. */
export interface KeywordCount {
  keyword: string
  count: number
}

export interface CountItem {
  name: string
  value: number
}

export interface MonthlyCount {
  label: string
  value: number
}

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

/** Aggregate speeches by type (e.g. "PELA ORDEM", "GRANDE EXPEDIENTE") for a pie chart. */
export function aggregateSpeechesByType(speeches: DeputySpeech[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const s of speeches) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate speeches by month for a bar chart. */
export function aggregateSpeechesByMonth(speeches: DeputySpeech[]): MonthlyCount[] {
  const byMonth = new Map<number, number>()
  for (const s of speeches) {
    const month = new Date(s.startTime).getMonth()
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  const result = MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
  assertTwelveMonths(result, "speeches by month")
  return result
}

/** Aggregate events by type (e.g. "Sessão Deliberativa", "Audiência Pública") for a pie chart. */
export function aggregateEventsByType(events: DeputyEvent[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const e of events) {
    counts.set(e.type, (counts.get(e.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate events by month for a bar chart. */
export function aggregateEventsByMonth(events: DeputyEvent[]): MonthlyCount[] {
  const byMonth = new Map<number, number>()
  for (const e of events) {
    const month = new Date(e.startTime).getMonth()
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  const result = MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
  assertTwelveMonths(result, "events by month")
  return result
}

/** Aggregate committees by deputy's role (Titular, Suplente, etc.) for a pie chart. */
export function aggregateCommitteesByRole(committees: DeputyCommittee[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const c of committees) {
    counts.set(c.role, (counts.get(c.role) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate committees by type (Comissão Permanente, Especial, CPI, etc.) for a pie chart. */
export function aggregateCommitteesByType(committees: DeputyCommittee[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const c of committees) {
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ── Voting history ───────────────────────────────────────────────────

/** Aggregate voting records by the deputy's vote type (Sim, Não, Abstenção, etc.) for a pie chart. */
export function aggregateVotesByType(votes: DeputyVotingRecord[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const v of votes) {
    counts.set(v.vote, (counts.get(v.vote) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate voting records by month for a bar chart. */
export function aggregateVotesByMonth(votes: DeputyVotingRecord[]): MonthlyCount[] {
  const byMonth = new Map<number, number>()
  for (const v of votes) {
    const month = new Date(v.date).getMonth()
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  const result = MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
  assertTwelveMonths(result, "votes by month")
  return result
}

/**
 * Computes how often the deputy voted with the winning side.
 * Only considers sessions with a definitive result (approved or rejected).
 * Returns percentage as a number (0–100).
 */
export function computeVoteAlignment(votes: DeputyVotingRecord[]): number {
  const decided = votes.filter((v) => v.approved !== null)
  if (decided.length === 0) return 0

  const aligned = decided.filter((v) => {
    if (v.approved === true) return v.vote === "Sim"
    if (v.approved === false) return v.vote === "Não"
    return false
  })

  const result = Math.round((aligned.length / decided.length) * 100)
  return assertValidPercent(result, "vote alignment")
}

// ── Keyword aggregation ─────────────────────────────────────────────

/**
 * Aggregates keywords from speech records into a frequency-sorted list.
 *
 * Each speech's `keywords` field is a comma-separated string. This function
 * splits, trims, lowercases, and counts occurrences across all speeches,
 * returning the top `limit` keywords sorted by count descending.
 *
 * @param speeches - Array of deputy speech records
 * @param limit - Maximum number of keywords to return (default 30)
 * @returns Top keywords sorted by frequency descending
 */
export function aggregateSpeechKeywords(speeches: DeputySpeech[], limit = 30): KeywordCount[] {
  const counts = new Map<string, number>()

  for (const s of speeches) {
    if (!s.keywords) continue
    const parts = s.keywords.split(",")
    for (const raw of parts) {
      const keyword = raw.trim().toLowerCase()
      if (keyword.length === 0) continue
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
