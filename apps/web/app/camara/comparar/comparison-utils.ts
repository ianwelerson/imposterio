/**
 * @file comparison-utils.ts
 * @description Server-safe aggregation functions for the deputy comparison page.
 *
 * Transforms per-deputy expense, voting, and activity data into formats
 * suitable for side-by-side comparison charts. Runs server-side (no "use client").
 */

import type {
  DeputyExpense, DeputyVotingRecord,
  DeputyCaucus, DeputyCommittee, DeputyEvent,
} from "@imposterio/types"

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

/** A deputy's pre-computed comparison metrics. */
export interface DeputyMetrics {
  /** Deputy ID. */
  id: string
  /** Display name. */
  name: string
  /** Party abbreviation. */
  party: string
  /** State abbreviation. */
  uf: string
  /** Photo URL. */
  photoUrl?: string
  /** Source URL for the deputy detail API call. */
  sourceUrl: string
  /** Total CEAP spending for the year. */
  totalCeap: number
  /** Total voting sessions participated. */
  voteCount: number
  /** Votes "Sim". */
  simCount: number
  /** Votes "Não". */
  naoCount: number
  /** Votes "Abstenção". */
  abstCount: number
  /** Alignment with winning side (0–100%). */
  alignment: number
  /** Number of parliamentary caucuses (frentes). */
  caucusCount: number
  /** Number of active committee memberships. */
  committeeCount: number
  /** Number of events attended in the year. */
  eventCount: number
}

/**
 * Computes comparison metrics for a single deputy.
 */
export function computeDeputyMetrics(
  id: string,
  name: string,
  party: string,
  uf: string,
  photoUrl: string | undefined,
  sourceUrl: string,
  expenses: DeputyExpense[],
  votes: DeputyVotingRecord[],
  caucuses: DeputyCaucus[],
  committees: DeputyCommittee[],
  events: DeputyEvent[],
): DeputyMetrics {
  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)
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
  }

  const activeCommittees = committees.filter((c) => !c.endDate)

  return {
    id,
    name,
    party,
    uf,
    photoUrl,
    sourceUrl,
    totalCeap,
    voteCount: votes.length,
    simCount,
    naoCount,
    abstCount,
    alignment,
    caucusCount: caucuses.length,
    committeeCount: activeCommittees.length,
    eventCount: events.length,
  }
}

/**
 * Merges monthly expense data from multiple deputies into a single dataset
 * for a multi-series LineChart.
 *
 * @param deputyExpenses - Array of { name, expenses } per deputy
 * @returns Chart-ready data with one key per deputy
 */
export function mergeMonthlyExpenses(
  deputyExpenses: Array<{ name: string; expenses: DeputyExpense[] }>,
): Record<string, unknown>[] {
  const allMonthly = deputyExpenses.map(({ name, expenses }) => {
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
 * Merges monthly vote counts from multiple deputies into a single dataset.
 *
 * @param deputyVotes - Array of { name, votes } per deputy
 * @returns Chart-ready data with one key per deputy
 */
export function mergeMonthlyVotes(
  deputyVotes: Array<{ name: string; votes: DeputyVotingRecord[] }>,
): Record<string, unknown>[] {
  const allMonthly = deputyVotes.map(({ name, votes }) => {
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
  /** Per-deputy values keyed by deputy name. */
  [deputyName: string]: string | number
}

/**
 * Merges expense category data from multiple deputies for comparison.
 * Returns top N categories by combined total, with per-deputy values.
 *
 * @param deputyExpenses - Array of { name, expenses } per deputy
 * @param topN - Number of top categories to include. @default 8
 */
export function mergeExpenseCategories(
  deputyExpenses: Array<{ name: string; expenses: DeputyExpense[] }>,
  topN = 8,
): CategoryComparison[] {
  // Aggregate by category per deputy
  const perDeputy = deputyExpenses.map(({ name, expenses }) => {
    const cats = new Map<string, number>()
    for (const e of expenses) {
      cats.set(e.type, (cats.get(e.type) ?? 0) + e.value)
    }
    return { name, cats }
  })

  // Find top categories by combined total
  const combined = new Map<string, number>()
  for (const { cats } of perDeputy) {
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
    for (const { name, cats } of perDeputy) {
      row[name] = Math.round((cats.get(category) ?? 0) * 100) / 100
    }
    return row
  })
}
