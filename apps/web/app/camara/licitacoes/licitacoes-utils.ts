/**
 * @file licitacoes-utils.ts
 * @description Server-safe aggregation utilities for Camara procurement data.
 *
 * These functions transform raw contract arrays into chart-ready data structures.
 * They run on the server during page rendering — never marked as "use client".
 */

import type { CamaraProcurementContract } from "@imposterio/types"

/** Monthly aggregated value for bar chart display. */
export interface MonthlyContractValue {
  /** Abbreviated month label in Portuguese (e.g. "Jan", "Fev"). */
  label: string
  /** Total contracted value for the month in BRL. */
  value: number
}

/** Portuguese month abbreviations indexed 0–11. */
const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

/**
 * Groups contracts by signature month and sums their total values.
 *
 * Returns all 12 months (Jan–Dec) with zero-filled gaps so the bar chart
 * always displays a complete year regardless of missing data.
 *
 * @param contracts - Array of procurement contracts with signatureDate
 * @returns 12-element array of monthly totals ordered Jan through Dec
 */
export function aggregateContractsByMonth(
  contracts: CamaraProcurementContract[],
): MonthlyContractValue[] {
  const buckets = new Array(12).fill(0) as number[]

  for (const c of contracts) {
    if (!c.signatureDate) continue
    const month = new Date(c.signatureDate).getMonth()
    if (month >= 0 && month < 12) {
      buckets[month] += c.totalValue
    }
  }

  return MONTH_LABELS.map((label, i) => ({
    label,
    value: buckets[i],
  }))
}

/**
 * Formats a numeric value as Brazilian Real (BRL) currency string.
 *
 * Uses the pt-BR locale for proper thousands separators and decimal commas.
 * Example: 1234567.89 → "R$ 1.234.567,89"
 *
 * @param value - Numeric value in BRL
 * @returns Formatted currency string with "R$" prefix
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
