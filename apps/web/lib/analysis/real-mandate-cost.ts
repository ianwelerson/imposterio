/**
 * @file real-mandate-cost.ts
 * @description Assembles the full taxpayer cost of a deputy's mandate for a
 * given year — the "Custo Real do Mandato" index.
 *
 * Two modes:
 * - **Past year:** all components are confirmed (API data covers the full year)
 * - **Current year:** CEAP is year-to-date confirmed only (no projection);
 *   Verba de Gabinete uses confirmed data + monthly-average projection for
 *   remaining months; salary is prorated (confirmed + estimated).
 *
 * Components:
 * 1. Deputy salary: DEPUTADO_SALARIO × months
 * 2. CEAP expenses: confirmed year-to-date total from API (no projection)
 * 3. Verba de Gabinete: confirmed + monthly-average projection. This envelope
 *    covers staff salaries and office costs — no separate staff line needed.
 *
 * Pure function — operates on pre-fetched/pre-computed data.
 */

import { DEPUTADO_SALARIO } from "@/lib/constants/camara"

// ── Constants ───────────────────────────────────────────────────────

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

// ── Types ───────────────────────────────────────────────────────────

/** Attribution status for a cost component. */
export type CostAttribution =
  | "confirmed"    // Full-year data from API
  | "estimated"    // No API data — fully estimated
  | "partial"      // Partial API data + projection for remaining months

/** A single cost line in the breakdown. */
export interface CostLineItem {
  /** Display label (e.g. "Salário bruto anual"). */
  label: string
  /** Total value for the year (BRL) — confirmed + estimated. */
  value: number
  /** Confirmed portion of the value (BRL). 0 if fully estimated. */
  confirmedValue: number
  /** Estimated portion of the value (BRL). 0 if fully estimated. */
  estimatedValue: number
  /** Attribution status. */
  attribution: CostAttribution
  /** Human-readable attribution note (e.g. "✓ via API"). */
  attributionNote: string
  /** Optional source URL for SourcePill. */
  sourceUrl?: string
  /** Optional tooltip text for the UI. */
  tooltip?: string
}

/** Full Custo Real do Mandato result. */
export interface RealMandateCostResult {
  /** Year of the analysis. */
  year: number
  /** Whether the year is the current (incomplete) year. */
  isCurrentYear: boolean
  /** Title for the card header. */
  title: string
  /** Cost breakdown lines. */
  lines: CostLineItem[]
  /** Grand total: sum of all lines (BRL). */
  grandTotal: number
  /** Confirmed portion of the grand total (BRL). */
  confirmedTotal: number
  /** Estimated portion of the grand total (BRL). */
  estimatedTotal: number
  /** Monthly average: grandTotal ÷ 12 (BRL). */
  monthlyAverage: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Assembles the full taxpayer cost of a deputy's mandate for a given year.
 *
 * This is the "Custo Real do Mandato" index — a single number representing
 * the total estimated public cost of keeping one deputy in office.
 *
 * For the current year:
 * - CEAP: confirmed year-to-date only, no projection
 * - Verba de Gabinete: confirmed + monthly-average projection for remaining
 *   months. This envelope already covers staff salaries.
 * - Salary: prorated by elapsed months (confirmed) + remaining (estimated)
 *
 * @param year - Reference year
 * @param ceapTotal - Total CEAP expenses from API data (BRL)
 * @param verbaGabineteTotal - Total Verba de Gabinete from scraper data (BRL)
 * @param isCurrentYear - Whether this is the current (incomplete) year
 * @param ceapFirstMonth - First month (1-12) with CEAP data
 * @param ceapLastMonth - Last month (1-12) with CEAP data
 * @param verbaMonthsCovered - Number of months with verba data (1–12)
 * @param ceapSourceUrl - Source URL for CEAP SourcePill
 * @param verbaSourceUrl - Source URL for Verba SourcePill
 * @returns Cost result with confirmed vs estimated breakdown
 */
export function computeRealMandateCost(
  year: number,
  ceapTotal: number,
  verbaGabineteTotal: number,
  isCurrentYear: boolean = false,
  ceapFirstMonth: number = 1,
  ceapLastMonth: number = 12,
  verbaMonthsCovered: number = 12,
  ceapSourceUrl: string = "",
  verbaSourceUrl: string = "",
): RealMandateCostResult {
  const annualSalary = DEPUTADO_SALARIO * 12
  const lines: CostLineItem[] = []

  if (isCurrentYear) {
    // ── Current year: split confirmed vs estimated ──────────────────

    // Elapsed months for salary proration (use current month)
    const elapsedMonths = new Date().getMonth() // 0-based: Jan=0, so March→2 but we want 3
    const salaryElapsed = elapsedMonths // months fully completed (e.g. March 28 → Jan + Feb = 2? No, getMonth() in March = 2)
    // Actually: new Date().getMonth() returns 0-based month. In March it returns 2.
    // Months fully elapsed = current month number (getMonth() + 1 gives current month, minus 1 for incomplete = getMonth())
    // But salary is paid monthly, so by March 28 you've received Jan, Feb, Mar = 3 months
    const salaryMonthsPaid = new Date().getMonth() + 1
    const salaryRemaining = 12 - salaryMonthsPaid
    const salaryConfirmed = DEPUTADO_SALARIO * salaryMonthsPaid
    const salaryEstimated = DEPUTADO_SALARIO * salaryRemaining

    // 1. Salary — confirmed for months paid, estimated for remaining
    if (salaryRemaining > 0) {
      lines.push({
        label: "Salário bruto",
        value: annualSalary,
        confirmedValue: salaryConfirmed,
        estimatedValue: salaryEstimated,
        attribution: "partial",
        attributionNote: `✓ ${formatBrlCompact(DEPUTADO_SALARIO)} × ${salaryMonthsPaid} meses + estimado × ${salaryRemaining} meses`,
      })
    } else {
      lines.push({
        label: "Salário bruto anual",
        value: annualSalary,
        confirmedValue: annualSalary,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: `✓ confirmado (${formatBrlCompact(DEPUTADO_SALARIO)} × 12)`,
      })
    }

    // 2. CEAP — confirmed year-to-date only, no projection
    const ceapFirstName = MONTH_NAMES[ceapFirstMonth - 1] ?? "janeiro"
    const ceapLastName = MONTH_NAMES[ceapLastMonth - 1] ?? "dezembro"
    lines.push({
      label: `CEAP (${ceapFirstName}–${ceapLastName})`,
      value: ceapTotal,
      confirmedValue: ceapTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ valor confirmado via API",
      sourceUrl: ceapSourceUrl,
    })

    // 3. Verba de Gabinete — confirmed + projection for remaining months
    if (verbaMonthsCovered > 0 && verbaMonthsCovered < 12) {
      const monthlyAvg = verbaGabineteTotal / verbaMonthsCovered
      const remainingMonths = 12 - verbaMonthsCovered
      const projectedRemaining = monthlyAvg * remainingMonths

      lines.push({
        label: `Verba de Gabinete confirmada (${verbaMonthsCovered} meses)`,
        value: verbaGabineteTotal,
        confirmedValue: verbaGabineteTotal,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: "✓ via Portal de Transparência",
        sourceUrl: verbaSourceUrl,
        tooltip: "A Verba de Gabinete cobre os salários dos secretários parlamentares e outros gastos do gabinete. O valor estimado é baseado na média mensal dos dados disponíveis.",
      })

      lines.push({
        label: `Verba de Gabinete estimada (${remainingMonths} meses)`,
        value: projectedRemaining,
        confirmedValue: 0,
        estimatedValue: projectedRemaining,
        attribution: "estimated",
        attributionNote: `~ projeção: ${formatBrlCompact(monthlyAvg)}/mês × ${remainingMonths} meses`,
        tooltip: "A Verba de Gabinete cobre os salários dos secretários parlamentares e outros gastos do gabinete. O valor estimado é baseado na média mensal dos dados disponíveis.",
      })
    } else if (verbaMonthsCovered >= 12) {
      lines.push({
        label: "Verba de Gabinete",
        value: verbaGabineteTotal,
        confirmedValue: verbaGabineteTotal,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: "✓ via Portal de Transparência",
        sourceUrl: verbaSourceUrl,
      })
    } else if (verbaGabineteTotal > 0) {
      // Has data but monthsCovered = 0 — treat as confirmed year-to-date
      lines.push({
        label: "Verba de Gabinete",
        value: verbaGabineteTotal,
        confirmedValue: verbaGabineteTotal,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: "✓ via Portal de Transparência",
        sourceUrl: verbaSourceUrl,
      })
    }
  } else {
    // ── Past year: everything confirmed ───────────────────────────────

    // 1. Salary — fully confirmed
    lines.push({
      label: "Salário bruto anual",
      value: annualSalary,
      confirmedValue: annualSalary,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: `✓ via dado público (${formatBrlCompact(DEPUTADO_SALARIO)} × 12)`,
    })

    // 2. CEAP — full year confirmed
    lines.push({
      label: "Despesas CEAP",
      value: ceapTotal,
      confirmedValue: ceapTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ via API",
      sourceUrl: ceapSourceUrl,
    })

    // 3. Verba de Gabinete — full year confirmed
    if (verbaGabineteTotal > 0) {
      lines.push({
        label: "Verba de Gabinete",
        value: verbaGabineteTotal,
        confirmedValue: verbaGabineteTotal,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: "✓ via Portal de Transparência",
        sourceUrl: verbaSourceUrl,
      })
    }
  }

  const grandTotal = lines.reduce((sum, l) => sum + l.value, 0)
  const confirmedTotal = lines.reduce((sum, l) => sum + l.confirmedValue, 0)
  const estimatedTotal = lines.reduce((sum, l) => sum + l.estimatedValue, 0)
  const monthlyAverage = Math.round((grandTotal / 12) * 100) / 100

  const title = isCurrentYear
    ? `Estimativa de custo em ${year}`
    : `Custo em ${year}`

  return {
    year,
    isCurrentYear,
    title,
    lines,
    grandTotal,
    confirmedTotal,
    estimatedTotal,
    monthlyAverage,
  }
}

/** Compact BRL format for attribution notes (no decimals). */
function formatBrlCompact(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}
