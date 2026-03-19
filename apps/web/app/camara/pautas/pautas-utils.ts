/**
 * @file pautas-utils.ts
 * @description Server-safe aggregation functions for legislative agenda charts.
 *
 * These functions transform raw proposition and voting session data into
 * chart-ready formats. They run server-side (no "use client") and their
 * results are passed as props to client chart components.
 */

import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"

/** Simple name→value pair for chart data. */
export interface CountItem {
  name: string
  value: number
}

/** Monthly count for bar/line charts. */
export interface MonthlyCount {
  label: string
  value: number
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

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
 * Returns 12 entries (Jan–Dec), using Portuguese month abbreviations.
 */
export function aggregatePropositionsByMonth(propositions: CamaraProposition[]): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const p of propositions) {
    const month = new Date(p.presentedDate).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
}

/**
 * Aggregates voting sessions by month.
 * Returns 12 entries (Jan–Dec).
 */
export function aggregateVotingSessionsByMonth(sessions: CamaraVotingSession[]): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const s of sessions) {
    const month = new Date(s.date).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
}

/**
 * Aggregates voting sessions by approval result.
 * Returns three entries: Aprovada, Rejeitada, Indefinida.
 */
export function aggregateVotingSessionsByResult(sessions: CamaraVotingSession[]): CountItem[] {
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
