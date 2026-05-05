/**
 * @file activity-utils.ts
 * @description Pure utility functions for aggregating senator activity data
 * (votes, speeches, committees, leaderships, propositions) for chart and
 * table rendering.
 *
 * Mirrors the Câmara version (`apps/web/app/camara/[id]/activity-utils.ts`)
 * to keep cross-institution components data-shape compatible. Not a client
 * component — safe to import from server components.
 */

import type {
  SenatorVotingRecord,
  SenatorSpeech,
  SenatorCommittee,
  SenatorLeadership,
  Proposition,
} from "@imposterio/types"
import { assertValidPercent, assertTwelveMonths } from "@/lib/calc"

/** A category-with-count item, used for pie/bar charts. */
export interface CountItem {
  name: string
  value: number
}

/** A monthly bucket with a label (e.g. "Jan") and a count. */
export interface MonthlyCount {
  label: string
  value: number
}

const MONTH_LABELS = [
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
] as const

// ── Voting history ───────────────────────────────────────────────────

/** Aggregate voting records by the senator's vote choice ("Sim", "Não", etc.). */
export function aggregateVotesByType(votes: SenatorVotingRecord[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const v of votes) {
    const label = v.vote || "Não votou"
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate voting records by month for a bar chart. */
export function aggregateVotesByMonth(votes: SenatorVotingRecord[]): MonthlyCount[] {
  const byMonth = new Map<number, number>()
  for (const v of votes) {
    if (!v.date) continue
    const month = new Date(v.date).getMonth()
    if (Number.isNaN(month)) continue
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
 * Computes how often the senator voted with the winning side.
 *
 * Considers only sessions with a definitive `approved` result (true/false).
 * A senator voting "Sim" on an approved bill, or "Não" on a rejected one,
 * counts as aligned. Returns a 0–100 integer percentage.
 */
export function computeVoteAlignment(votes: SenatorVotingRecord[]): number {
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

// ── Speeches ─────────────────────────────────────────────────────────

/** Aggregate speeches by type for a pie chart. */
export function aggregateSpeechesByType(speeches: SenatorSpeech[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const s of speeches) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate speeches by month for a bar chart. */
export function aggregateSpeechesByMonth(speeches: SenatorSpeech[]): MonthlyCount[] {
  const byMonth = new Map<number, number>()
  for (const s of speeches) {
    if (!s.date) continue
    const month = new Date(s.date).getMonth()
    if (Number.isNaN(month)) continue
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
  }
  const result = MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
  assertTwelveMonths(result, "speeches by month")
  return result
}

// ── Committees ───────────────────────────────────────────────────────

/** Aggregate committees by senator's role (Titular / Suplente). */
export function aggregateCommitteesByRole(
  committees: SenatorCommittee[],
): CountItem[] {
  const counts = new Map<string, number>()
  for (const c of committees) {
    counts.set(c.role, (counts.get(c.role) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate committees by type (Permanente, Especial, CPI, etc.). */
export function aggregateCommitteesByType(
  committees: SenatorCommittee[],
): CountItem[] {
  const counts = new Map<string, number>()
  for (const c of committees) {
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Returns only currently active committee memberships (no `endDate`). */
export function filterActiveCommittees(
  committees: SenatorCommittee[],
): SenatorCommittee[] {
  return committees.filter((c) => !c.endDate)
}

// ── Leaderships ──────────────────────────────────────────────────────

/** Returns only currently active leadership roles (no `endDate`). */
export function filterActiveLeaderships(
  leaderships: SenatorLeadership[],
): SenatorLeadership[] {
  return leaderships.filter((l) => !l.endDate)
}

// ── Propositions ─────────────────────────────────────────────────────

/** Aggregate propositions by their type abbreviation (PL, PEC, MP, etc.). */
export function aggregatePropositionsByType(
  propositions: Proposition[],
): CountItem[] {
  const counts = new Map<string, number>()
  for (const p of propositions) {
    counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Aggregate propositions by year (e.g. for a 5-year history bar chart). */
export function aggregatePropositionsByYear(
  propositions: Proposition[],
): CountItem[] {
  const counts = new Map<number, number>()
  for (const p of propositions) {
    if (typeof p.year !== "number") continue
    counts.set(p.year, (counts.get(p.year) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([year, value]) => ({ name: String(year), value }))
    .sort((a, b) => Number(a.name) - Number(b.name))
}
