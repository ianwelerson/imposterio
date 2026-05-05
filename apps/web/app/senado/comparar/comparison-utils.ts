/**
 * @file comparison-utils.ts
 * @description Server-safe aggregation functions for the senator comparison page.
 *
 * Transforms per-senator CEAPS, voting, attendance, propositions, and
 * committee data into formats suitable for side-by-side comparison charts.
 * Runs server-side (no "use client").
 */

import type {
  SenatorExpense,
  SenatorVotingRecord,
  SenatorCommittee,
  SenatorAttendanceDetail,
} from "@imposterio/types"
import type { Proposition } from "@imposterio/types"
import { assertValidPercent, assertNonNegative } from "@/lib/calc"

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

/** A senator's pre-computed comparison metrics. */
export interface SenatorMetrics {
  /** Senator API code. */
  id: string
  /** Display name. */
  name: string
  /** Party abbreviation. */
  party: string
  /** State abbreviation. */
  uf: string
  /** Photo URL. */
  photoUrl?: string
  /** Source URL for the senator detail API call. */
  sourceUrl: string
  /** Total CEAPS spending in the year (BRL). */
  totalCeaps: number
  /** Total voting sessions participated in. */
  voteCount: number
  /** Votes "Sim". */
  simCount: number
  /** Votes "Não". */
  naoCount: number
  /** Votes "Abstenção". */
  abstCount: number
  /** Alignment with winning side (0–100%). */
  alignment: number
  /** Number of active committee memberships. */
  committeeCount: number
  /** Propositions authored or co-authored in the year. */
  propositionCount: number
  /** Plenary deliberative sessions attended. */
  plenaryAttended: number
  /** Plenary attendance percentage (0–100). */
  attendancePercent: number
}

/**
 * Computes comparison metrics for a single senator.
 */
export function computeSenatorMetrics(
  id: string,
  name: string,
  party: string,
  uf: string,
  photoUrl: string | undefined,
  sourceUrl: string,
  expenses: SenatorExpense[],
  votes: SenatorVotingRecord[],
  committees: SenatorCommittee[],
  propositions: Proposition[],
  attendance: SenatorAttendanceDetail,
): SenatorMetrics {
  const totalCeaps = expenses.reduce((sum, e) => sum + e.value, 0)
  const simCount = votes.filter((v) => v.vote === "Sim").length
  const naoCount = votes.filter((v) => v.vote === "Não").length
  const abstCount = votes.filter((v) => v.vote === "Abstenção").length

  const decided = votes.filter((v) => v.approved !== null)
  let alignment = 0
  if (decided.length > 0) {
    const aligned = decided.filter((v) => {
      if (v.approved === true) return v.vote === "Sim"
      if (v.approved === false) return v.vote === "Não"
      return false
    })
    alignment = Math.round((aligned.length / decided.length) * 100)
    assertValidPercent(alignment, "senator comparison alignment")
  }

  assertNonNegative([totalCeaps], "senator comparison totalCeaps")

  const activeCommittees = committees.filter((c) => !c.endDate)

  return {
    id,
    name,
    party,
    uf,
    photoUrl,
    sourceUrl,
    totalCeaps,
    voteCount: votes.length,
    simCount,
    naoCount,
    abstCount,
    alignment,
    committeeCount: activeCommittees.length,
    propositionCount: propositions.length,
    plenaryAttended: attendance.attended,
    attendancePercent: Math.round(attendance.percentage),
  }
}

/**
 * Merges monthly CEAPS expense data from multiple senators into a single
 * dataset for a multi-series LineChart.
 */
export function mergeMonthlyExpenses(
  senatorExpenses: Array<{ name: string; expenses: SenatorExpense[] }>,
): Record<string, unknown>[] {
  const allMonthly = senatorExpenses.map(({ name, expenses }) => {
    const byMonth = new Array(12).fill(0)
    for (const e of expenses) {
      const month = new Date(e.date).getMonth()
      if (month >= 0 && month < 12) byMonth[month] += e.value
    }
    return { name, byMonth }
  })

  return MONTH_LABELS.map((label, i) => {
    const row: Record<string, unknown> = { label }
    for (const { name, byMonth } of allMonthly) {
      row[name] = Math.round(byMonth[i] * 100) / 100
    }
    return row
  })
}

/**
 * Merges monthly vote counts from multiple senators into a single dataset.
 */
export function mergeMonthlyVotes(
  senatorVotes: Array<{ name: string; votes: SenatorVotingRecord[] }>,
): Record<string, unknown>[] {
  const allMonthly = senatorVotes.map(({ name, votes }) => {
    const byMonth = new Array(12).fill(0)
    for (const v of votes) {
      const month = new Date(v.date).getMonth()
      if (month >= 0 && month < 12) byMonth[month]++
    }
    return { name, byMonth }
  })

  return MONTH_LABELS.map((label, i) => {
    const row: Record<string, unknown> = { label }
    for (const { name, byMonth } of allMonthly) {
      row[name] = byMonth[i]
    }
    return row
  })
}

/** Expense category comparison item for grouped bar display. */
export interface CategoryComparison {
  /** Category name. */
  category: string
  /** Per-senator values keyed by senator name. */
  [senatorName: string]: string | number
}

/**
 * Merges expense category data from multiple senators for comparison.
 * Returns top N categories by combined total.
 */
export function mergeExpenseCategories(
  senatorExpenses: Array<{ name: string; expenses: SenatorExpense[] }>,
  topN = 8,
): CategoryComparison[] {
  const perSenator = senatorExpenses.map(({ name, expenses }) => {
    const cats = new Map<string, number>()
    for (const e of expenses) {
      cats.set(e.type, (cats.get(e.type) ?? 0) + e.value)
    }
    return { name, cats }
  })

  const combined = new Map<string, number>()
  for (const { cats } of perSenator) {
    for (const [cat, val] of cats) {
      combined.set(cat, (combined.get(cat) ?? 0) + val)
    }
  }

  const topCategories = Array.from(combined.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cat]) => cat)

  return topCategories.map((category) => {
    const row: CategoryComparison = { category }
    for (const { name, cats } of perSenator) {
      row[name] = Math.round((cats.get(category) ?? 0) * 100) / 100
    }
    return row
  })
}
