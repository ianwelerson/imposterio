/**
 * @file cost-per-output.ts
 * @description Computes "cost per unit of output" metrics for a deputy —
 * how much the taxpayer spends per vote, per plenary session attended,
 * per active day, and per proposition authored.
 *
 * All calculations use the confirmed year-to-date cost only (no projections):
 *   CEAP (YTD) + Verba de Gabinete (YTD) + Salary (months elapsed × R$ 46.366,19)
 *
 * The per-deputy metrics are pure functions. The chamber average benchmark
 * uses Redis for caching (6h TTL) but makes no external API calls.
 */

import { DEPUTADO_SALARIO } from "@/lib/constants/camara"
import { redis } from "@imposterio/fetchers/lib/cache"

// ── Types ───────────────────────────────────────────────────────────

/** A single cost-per-output metric. */
export interface CostMetric {
  /** Machine-readable identifier. */
  id: string
  /** Short display label (e.g. "Por dia trabalhado"). */
  label: string
  /** Computed cost per unit (BRL). */
  value: number
  /** Numerator used in the division (confirmed cost to date). */
  numerator: number
  /** Denominator used in the division (unit count). */
  denominator: number
  /** Denominator unit label for the secondary line (e.g. "45 dias"). */
  denominatorLabel: string
  /** Tooltip explaining the calculation. */
  tooltip: string
}

/** Full result of the cost-per-output analysis. */
export interface CostPerOutputResult {
  /** Confirmed cost to date used as the common numerator. */
  confirmedCostToDate: number
  /** Individual metrics — only includes metrics with denominator > 0. */
  metrics: CostMetric[]
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Computes the confirmed cost to date for a deputy.
 *
 * @param ceapTotal - CEAP year-to-date confirmed total (BRL)
 * @param verbaGabineteTotal - Verba de Gabinete year-to-date confirmed total (BRL)
 * @param monthsElapsed - Number of salary months elapsed (typically current month number)
 * @returns Confirmed cost to date (BRL)
 */
export function computeConfirmedCostToDate(
  ceapTotal: number,
  verbaGabineteTotal: number,
  monthsElapsed: number,
): number {
  return ceapTotal + verbaGabineteTotal + (DEPUTADO_SALARIO * monthsElapsed)
}

/**
 * Computes cost-per-output metrics for a deputy's current year.
 *
 * Each metric divides the same confirmed cost to date by a different
 * output measure. Metrics with zero denominators are excluded from the
 * result — the UI should not render division-by-zero cards.
 *
 * @param confirmedCost - Confirmed year-to-date cost (from `computeConfirmedCostToDate`)
 * @param activeDays - Days with at least one recorded event (any type)
 * @param totalVotes - Total votes cast (Sim + Não + Abstenção + Obstrução)
 * @param plenaryAttended - Number of plenary sessions attended
 * @param propositionsCount - Propositions authored or co-authored in the year
 * @param year - Reference year (for labels)
 * @returns Cost metrics with only non-zero denominators included
 *
 * @example
 * ```typescript
 * const result = computeCostPerOutput(500_000, 45, 120, 20, 3, 2026)
 * console.log(result.metrics[0].value) // ~11111.11 (per active day)
 * ```
 */
export function computeCostPerOutput(
  confirmedCost: number,
  activeDays: number,
  totalVotes: number,
  plenaryAttended: number,
  propositionsCount: number,
  year: number,
): CostPerOutputResult {
  const metrics: CostMetric[] = []

  if (activeDays > 0) {
    metrics.push({
      id: "per-active-day",
      label: "Por dia trabalhado",
      value: Math.round((confirmedCost / activeDays) * 100) / 100,
      numerator: confirmedCost,
      denominator: activeDays,
      denominatorLabel: `${activeDays} dia${activeDays !== 1 ? "s" : ""}`,
      tooltip: "Calculado dividindo o custo confirmado até o momento pelo número de dias com ao menos um evento registrado no ano.",
    })
  }

  if (totalVotes > 0) {
    metrics.push({
      id: "per-vote",
      label: "Por votação",
      value: Math.round((confirmedCost / totalVotes) * 100) / 100,
      numerator: confirmedCost,
      denominator: totalVotes,
      denominatorLabel: `${totalVotes} voto${totalVotes !== 1 ? "s" : ""}`,
      tooltip: "Calculado dividindo o custo confirmado pelo total de votos registrados no plenário no ano.",
    })
  }

  if (plenaryAttended > 0) {
    metrics.push({
      id: "per-plenary",
      label: "Por sessão comparecida",
      value: Math.round((confirmedCost / plenaryAttended) * 100) / 100,
      numerator: confirmedCost,
      denominator: plenaryAttended,
      denominatorLabel: `${plenaryAttended} sessão${plenaryAttended !== 1 ? "ões" : ""}`,
      tooltip: "Calculado dividindo o custo confirmado pelo número de sessões plenárias em que o deputado esteve presente.",
    })
  }

  if (propositionsCount > 0) {
    metrics.push({
      id: "per-proposition",
      label: "Por proposição",
      value: Math.round((confirmedCost / propositionsCount) * 100) / 100,
      numerator: confirmedCost,
      denominator: propositionsCount,
      denominatorLabel: `${propositionsCount} proposição${propositionsCount !== 1 ? "ões" : ""}`,
      tooltip: "Calculado dividindo o custo confirmado pelo número de proposições das quais o deputado é autor ou coautor no ano.",
    })
  }

  return {
    confirmedCostToDate: confirmedCost,
    metrics,
  }
}

/**
 * Computes and caches the chamber-wide average cost per vote.
 *
 * Uses pre-cached bulk data (CEAP totals) to avoid N+1 calls. Result is
 * cached under `chamber-avg-cost-per-vote:{year}` with a 6h TTL.
 *
 * @param ceapDeputies - Per-deputy CEAP totals from bulk summary
 * @param totalVotingSessions - Total voting sessions held in the year
 * @param monthsElapsed - Number of salary months elapsed
 * @param year - Reference year (for cache key)
 * @returns Average cost per vote (BRL), or null if insufficient data
 */
export async function computeChamberAvgCostPerVote(
  ceapDeputies: Array<{ name: string; total: number }>,
  totalVotingSessions: number,
  monthsElapsed: number,
  year: number,
): Promise<number | null> {
  if (totalVotingSessions <= 0 || ceapDeputies.length === 0) return null

  const cacheKey = `chamber-avg-cost-per-vote:${year}`
  const TTL_6H = 60 * 60 * 6

  // Check cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached !== null && cached !== undefined) {
        const value = typeof cached === "number" ? cached : Number(cached)
        if (!isNaN(value) && value > 0) return value
        await redis.del(cacheKey).catch(() => {})
      }
    } catch {
      // Cache read failure is non-fatal
    }
  }

  // Compute from bulk data
  const ceapSum = ceapDeputies.reduce((sum, d) => sum + d.total, 0)
  const avgCeap = ceapSum / ceapDeputies.length
  const avgCost = avgCeap + (DEPUTADO_SALARIO * monthsElapsed)
  const result = Math.round((avgCost / totalVotingSessions) * 100) / 100

  // Cache the result
  if (redis && result > 0) {
    try {
      await redis.set(cacheKey, result, { ex: TTL_6H })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return result
}
