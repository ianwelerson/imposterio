/**
 * @file proposition-utils.ts
 * @description Pure utility functions for aggregating deputy proposition data
 * for chart visualizations — by type (PL, PEC, PDL, etc.) and by year.
 * Not a client component — safe to import from server components.
 */

import type { CamaraProposition } from "@imposterio/types"
import type { CountItem } from "./activity-utils"

/**
 * Aggregates propositions by type code (e.g. PL, PEC, PDL, REQ) for a pie chart.
 *
 * @param propositions - Deputy's authored propositions
 * @returns Sorted array of type counts (descending by value)
 */
export function aggregatePropositionsByType(propositions: CamaraProposition[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const p of propositions) {
    const type = p.typeCode || "Outro"
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Aggregates propositions by year for a bar chart.
 *
 * @param propositions - Deputy's authored propositions
 * @returns Sorted array of year counts (ascending by year)
 */
export function aggregatePropositionsByYear(propositions: CamaraProposition[]): CountItem[] {
  const counts = new Map<number, number>()
  for (const p of propositions) {
    if (p.year > 0) {
      counts.set(p.year, (counts.get(p.year) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([year, value]) => ({ name: String(year), value }))
    .sort((a, b) => Number(a.name) - Number(b.name))
}
