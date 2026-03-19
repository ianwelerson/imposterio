/**
 * @file activity-utils.ts
 * @description Pure utility functions for aggregating deputy activity data
 * (speeches, events, committees) for chart visualizations.
 * Not a client component — safe to import from server components.
 */

import type { DeputySpeech, DeputyEvent, DeputyCommittee } from "@imposterio/types"

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
  return MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
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
  return MONTH_LABELS.map((label, i) => ({
    label,
    value: byMonth.get(i) ?? 0,
  }))
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
