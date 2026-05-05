/**
 * @file senado-utils.ts
 * @description Server-safe aggregation functions for the Senado overview page.
 *
 * Mirrors `apps/web/app/camara/camara-utils.ts` but works against the Senado
 * data shapes: `Senator`, `Proposition`, `SenadoVotingSession`, and the
 * `SenatorAttendanceBulkSummary` (which already publishes a per-senator
 * `percentage` field, so attendance aggregation just averages it within
 * each party — it does not need a denominator like the Câmara version).
 *
 * Outputs are passed as props to `SenadoCharts` (a client component) so that
 * the heavy lifting stays on the server and the chart component remains a
 * thin presentational layer.
 */

import type {
  Senator,
  Proposition,
  SenadoVotingSession,
  SenatorAttendanceBulkSummary,
} from "@imposterio/types"
import { assertValidPercent, assertTwelveMonths } from "@/lib/calc"

/** Simple `name`/`value` pair used by every count-based chart. */
export interface CountItem {
  name: string
  value: number
}

/** A single month bucket for line/bar charts. */
export interface MonthlyCount {
  label: string
  value: number
}

/** Approval-rate breakdown for a single proposition type. */
export interface ApprovalByType {
  /** Proposition type code (e.g. "PL", "PEC"). */
  type: string
  /** Total voting sessions classified under this type. */
  total: number
  /** Number of approved sessions. */
  approved: number
  /** Approval rate as a 0–100 percentage. */
  rate: number
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

/** Senators grouped by party, sorted descending by caucus size. */
export function aggregateSenatorsByParty(senators: Senator[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const s of senators) {
    counts.set(s.party, (counts.get(s.party) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Senators grouped by state (UF), sorted descending. */
export function aggregateSenatorsByUF(senators: Senator[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const s of senators) {
    counts.set(s.uf, (counts.get(s.uf) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Propositions grouped by type code (PL, PEC, MP, …), sorted descending. */
export function aggregatePropositionsByType(props: Proposition[]): CountItem[] {
  const counts = new Map<string, number>()
  for (const p of props) {
    counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Picks the most reliable date for monthly bucketing. Senado props expose
 * `presentedDate` only when the API published it; everything else falls
 * back to `lastUpdate` (which the search endpoint always emits).
 */
function propositionMonthDate(p: Proposition): string | undefined {
  return p.presentedDate || p.lastUpdate || undefined
}

/** Propositions grouped by month of presentation (12 buckets, Jan–Dez). */
export function aggregatePropositionsByMonth(props: Proposition[]): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const p of props) {
    const iso = propositionMonthDate(p)
    if (!iso) continue
    const month = new Date(iso).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  const result = MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
  assertTwelveMonths(result, "senado propositions by month")
  return result
}

/** Voting sessions grouped by month (12 buckets, Jan–Dez). */
export function aggregateVotingSessionsByMonth(
  sessions: SenadoVotingSession[],
): MonthlyCount[] {
  const counts = new Array(12).fill(0)
  for (const s of sessions) {
    if (!s.date) continue
    const month = new Date(s.date).getMonth()
    if (month >= 0 && month < 12) counts[month]++
  }
  const result = MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }))
  assertTwelveMonths(result, "senado voting sessions by month")
  return result
}

/**
 * Voting sessions grouped by approval result.
 * Returns Aprovada / Rejeitada / Sem registro, filtered to non-zero buckets.
 */
export function aggregateVotesByResult(
  sessions: SenadoVotingSession[],
): CountItem[] {
  let approved = 0
  let rejected = 0
  let noResult = 0

  for (const s of sessions) {
    if (s.approved === true) approved++
    else if (s.approved === false) rejected++
    else noResult++
  }

  return [
    { name: "Aprovada", value: approved },
    { name: "Rejeitada", value: rejected },
    { name: "Sem registro", value: noResult },
  ].filter((item) => item.value > 0)
}

/**
 * Average plenary attendance rate per party.
 *
 * The Senado bulk summary already exposes a per-senator `percentage` field
 * (deliberative attended / deliberative total), so we just average those
 * percentages within each party — no global denominator math required.
 *
 * Parties with fewer than 3 senators are excluded; with only 81 seats
 * across the whole house, a 5-senator threshold (used by the Câmara) would
 * filter out most parties. Result is sorted descending and capped at 15.
 */
export function aggregateAttendanceByParty(
  summary: SenatorAttendanceBulkSummary,
  senators: Senator[],
): CountItem[] {
  if (summary.totalDeliberative === 0 || senators.length === 0) return []

  // Build a senatorId → percentage lookup.
  const pctById = new Map<string, number>()
  for (const e of summary.senators) {
    pctById.set(e.senatorId, e.percentage)
  }

  // Group party → percentages observed across that caucus.
  const partyPcts = new Map<string, number[]>()
  for (const s of senators) {
    const pct = pctById.get(s.id)
    if (pct == null) continue
    const arr = partyPcts.get(s.party) ?? []
    arr.push(pct)
    partyPcts.set(s.party, arr)
  }

  const result: CountItem[] = []
  for (const [party, pcts] of partyPcts) {
    if (pcts.length < 3) continue
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    assertValidPercent(avg, `senado attendance rate for party ${party}`)
    result.push({ name: party, value: avg })
  }

  return result.sort((a, b) => b.value - a.value).slice(0, 15)
}

/**
 * Approval rate broken down by proposition type.
 *
 * The Senado `/votacao` endpoint surfaces the affected matter via
 * `matterIdentifier` (e.g. "PL 1234/2024"). The first whitespace-bounded
 * token is the type prefix; we group by that.
 *
 * Only types with at least 2 sessions are returned, sorted by total
 * descending, so the chart highlights statistically meaningful types.
 */
export function aggregateApprovalByType(
  sessions: SenadoVotingSession[],
): ApprovalByType[] {
  const groups = new Map<string, { total: number; approved: number }>()

  for (const s of sessions) {
    const prefix = matterTypePrefix(s.matterIdentifier)
    const entry = groups.get(prefix) ?? { total: 0, approved: 0 }
    entry.total++
    if (s.approved === true) entry.approved++
    groups.set(prefix, entry)
  }

  return Array.from(groups.entries())
    .filter(([, v]) => v.total >= 2)
    .map(([type, v]) => ({
      type,
      total: v.total,
      approved: v.approved,
      rate: v.total > 0 ? Math.round((v.approved / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Pulls the alphabetic prefix out of a matter identifier (e.g. "PL 1234/24"
 * → "PL"). Returns "Outro" for missing or non-alphabetic identifiers so the
 * grouping stays exhaustive instead of dropping rows.
 */
function matterTypePrefix(id: string | undefined): string {
  if (!id) return "Outro"
  const m = id.trim().match(/^([A-Za-zÀ-ÿ]+)/)
  return m?.[1].toUpperCase() ?? "Outro"
}
