/**
 * @file senado-cost-per-output.ts
 * @description Senado-specific "cost per unit of output" metrics — how much
 * the taxpayer spends per attended plenary session, per vote cast, per
 * proposition authored, per active day.
 *
 * Mirrors the Câmara `cost-per-output` analysis but uses Senado constants:
 *   - SENADOR_SALARIO instead of DEPUTADO_SALARIO
 *   - No Verba de Gabinete component (Senado funds staff differently)
 *
 * The per-senator metrics are pure functions. The Senado average benchmark
 * uses Redis for caching (6h TTL) but makes no external API calls.
 */

import { SENADOR_SALARIO } from "@/lib/constants/senado"
import { redis } from "@imposterio/fetchers/lib/cache"

/** A single cost-per-output metric. */
export interface CostMetric {
  id: string
  label: string
  value: number
  numerator: number
  denominator: number
  denominatorLabel: string
  tooltip: string
}

/** Full result of the cost-per-output analysis. */
export interface CostPerOutputResult {
  confirmedCostToDate: number
  metrics: CostMetric[]
}

/**
 * Computes the confirmed cost to date for a senator (CEAPS + salary).
 *
 * @param ceapsTotal - CEAPS year-to-date confirmed total (BRL)
 * @param monthsElapsed - Number of salary months elapsed
 * @returns Confirmed cost to date (BRL)
 */
export function computeSenadoConfirmedCostToDate(
  ceapsTotal: number,
  monthsElapsed: number,
): number {
  return ceapsTotal + (SENADOR_SALARIO * monthsElapsed)
}

/**
 * Computes cost-per-output metrics for a senator's current year.
 *
 * Each metric divides the same confirmed cost to date by a different output
 * measure. Metrics with zero denominators are excluded.
 *
 * @param confirmedCost - Confirmed year-to-date cost
 * @param activeDays - Days with at least one recorded event
 * @param totalVotes - Total votes cast (Sim/Não/Abstenção/Obstrução)
 * @param plenaryAttended - Plenary sessions attended
 * @param propositionsCount - Propositions authored or co-authored
 * @param year - Reference year (unused but kept for parity)
 */
export function computeSenadoCostPerOutput(
  confirmedCost: number,
  activeDays: number,
  totalVotes: number,
  plenaryAttended: number,
  propositionsCount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _year: number,
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
      tooltip: "Calculado dividindo o custo confirmado pelo total de votos registrados em plenário no ano.",
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
      tooltip: "Calculado dividindo o custo confirmado pelo número de sessões plenárias deliberativas em que o senador esteve presente.",
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
      tooltip: "Calculado dividindo o custo confirmado pelo número de matérias das quais o senador é autor ou coautor no ano.",
    })
  }

  return {
    confirmedCostToDate: confirmedCost,
    metrics,
  }
}

/**
 * Computes and caches the Senado-wide average cost per voting session for the year.
 *
 * Uses pre-cached bulk data (CEAPS totals) to avoid N+1 calls. Result is
 * cached under `senado-avg-cost-per-vote:{year}` with a 6h TTL.
 *
 * @param ceapsSenators - Per-senator CEAPS totals from bulk summary
 * @param totalVotingSessions - Total voting sessions held in the year
 * @param monthsElapsed - Number of salary months elapsed
 * @param year - Reference year (for cache key)
 * @returns Average cost per voting session (BRL), or null if insufficient data
 */
export async function computeSenadoAvgCostPerVote(
  ceapsSenators: Array<{ senatorId?: string | null; total: number }>,
  totalVotingSessions: number,
  monthsElapsed: number,
  year: number,
): Promise<number | null> {
  if (totalVotingSessions <= 0 || ceapsSenators.length === 0) return null

  const cacheKey = `senado-avg-cost-per-vote:${year}`
  const TTL_6H = 60 * 60 * 6

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

  const ceapsSum = ceapsSenators.reduce((sum, s) => sum + s.total, 0)
  const avgCeaps = ceapsSum / ceapsSenators.length
  const avgCost = avgCeaps + (SENADOR_SALARIO * monthsElapsed)
  const result = Math.round((avgCost / totalVotingSessions) * 100) / 100

  if (redis && result > 0) {
    try {
      await redis.set(cacheKey, result, { ex: TTL_6H })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return result
}
