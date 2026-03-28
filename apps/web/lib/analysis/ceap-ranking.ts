/**
 * @file ceap-ranking.ts
 * @description Computes a deputy's CEAP spending rank within their party and UF.
 *
 * Uses the bulk CEAP expense summary (per-deputy totals for the year) to
 * determine where a specific deputy stands relative to peers in the same
 * party and the same state.
 *
 * Pure function — operates on pre-fetched CeapBulkDeputy data.
 */

import type { CeapBulkDeputy } from "@imposterio/fetchers"

/** CEAP ranking result for a single deputy. */
export interface CeapRankingResult {
  /** Deputy's rank within their party (1 = highest spender). */
  partyRank: number
  /** Total deputies in the same party. */
  partyTotal: number
  /** Deputy's rank within their UF (1 = highest spender). */
  ufRank: number
  /** Total deputies in the same UF. */
  ufTotal: number
  /** Deputy's total CEAP spending from bulk data. */
  total: number
}

/**
 * Computes a deputy's CEAP spending rank within their party and UF.
 *
 * @param deputyName - Deputy display name (matched uppercase against bulk data)
 * @param deputies - All deputies with CEAP totals from bulk data
 * @returns Ranking result, or null if deputy not found in bulk data
 *
 * @example
 * ```ts
 * const ranking = computeCeapRanking("Acácio Favacho", bulkSummary.deputies)
 * // { partyRank: 3, partyTotal: 50, ufRank: 7, ufTotal: 40, total: 150000 }
 * ```
 */
export function computeCeapRanking(
  deputyName: string,
  deputies: CeapBulkDeputy[],
): CeapRankingResult | null {
  const normalizedName = deputyName.toUpperCase().trim()
  const target = deputies.find((d) => d.name === normalizedName)
  if (!target) return null

  // Rank within party
  const sameParty = deputies
    .filter((d) => d.party === target.party)
    .sort((a, b) => b.total - a.total)
  const partyRank = sameParty.findIndex((d) => d.name === normalizedName) + 1

  // Rank within UF
  const sameUf = deputies
    .filter((d) => d.uf === target.uf)
    .sort((a, b) => b.total - a.total)
  const ufRank = sameUf.findIndex((d) => d.name === normalizedName) + 1

  return {
    partyRank,
    partyTotal: sameParty.length,
    ufRank,
    ufTotal: sameUf.length,
    total: target.total,
  }
}
