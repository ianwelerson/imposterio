/**
 * @file real-mandate-cost.ts
 * @description Assembles the full taxpayer cost of a deputy's mandate for a
 * given year — the "Custo Real do Mandato" index.
 *
 * Two modes:
 * - **Past year:** all components are confirmed (API data covers the full year)
 * - **Current year:** confirmed months + estimated projection for remaining months
 *
 * Components:
 * 1. Deputy salary: DEPUTADO_SALARIO × 12 (always known/confirmed)
 * 2. CEAP expenses: total from the expense data
 * 3. Verba de Gabinete: total from the scraper data
 * 4. Estimated staff cost: staffCount × median staff base salary × 12
 *
 * The staff cost estimate uses the median salary from FUNCIONARIOS_CARGOS
 * because individual staff salary levels are not published per-deputy. The
 * median provides a reasonable central estimate that is neither optimistic
 * (minimum) nor pessimistic (maximum). This is documented as an assumption
 * in the return type and JSDoc.
 *
 * Pure function — operates on pre-fetched/pre-computed data.
 */

import { DEPUTADO_SALARIO, FUNCIONARIOS_CARGOS } from "@/lib/constants/camara"

// ── Constants ───────────────────────────────────────────────────────

/**
 * Computes the median base salary across all entries in FUNCIONARIOS_CARGOS.
 * Used as the best-available estimate for individual staff member cost.
 */
function computeMedianSalary(): number {
  const salaries = Object.values(FUNCIONARIOS_CARGOS)
    .map((c) => c.baseSalary)
    .sort((a, b) => a - b)

  const mid = Math.floor(salaries.length / 2)
  if (salaries.length % 2 === 0) {
    return (salaries[mid - 1] + salaries[mid]) / 2
  }
  return salaries[mid]
}

const MEDIAN_STAFF_SALARY = computeMedianSalary()

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
  /** Estimated portion of the value (BRL). 0 if fully confirmed. */
  estimatedValue: number
  /** Attribution status. */
  attribution: CostAttribution
  /** Human-readable attribution note (e.g. "✓ via API"). */
  attributionNote: string
  /** Optional source URL for SourcePill. */
  sourceUrl?: string
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
  /** Number of staff used in the estimation. */
  staffCount: number
  /** Median monthly staff salary used in the estimation (BRL). */
  medianStaffSalary: number
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Assembles the full taxpayer cost of a deputy's mandate for a given year.
 *
 * This is the "Custo Real do Mandato" index — a single number representing
 * the total estimated public cost of keeping one deputy in office.
 *
 * When `isCurrentYear` is true, confirmed data is projected for the remaining
 * months using the monthly average of available data.
 *
 * @param year - Reference year
 * @param ceapTotal - Total CEAP expenses from API data (BRL)
 * @param verbaGabineteTotal - Total Verba de Gabinete from scraper data (BRL)
 * @param staffCount - Number of parliamentary secretaries employed
 * @param isCurrentYear - Whether this is the current (incomplete) year
 * @param ceapMonthsCovered - Number of months with CEAP data (1–12). Used to
 *   project remaining months when isCurrentYear is true.
 * @param verbaMonthsCovered - Number of months with verba data (1–12).
 * @param ceapSourceUrl - Source URL for CEAP SourcePill
 * @param verbaSourceUrl - Source URL for Verba SourcePill
 * @returns Cost result with confirmed vs estimated breakdown
 *
 * @example
 * ```typescript
 * const cost = computeRealMandateCost(2026, 180_000, 500_000, 25, true, 3, 3)
 * console.log(cost.confirmedTotal) // actual data total
 * console.log(cost.estimatedTotal) // projected remainder
 * ```
 */
export function computeRealMandateCost(
  year: number,
  ceapTotal: number,
  verbaGabineteTotal: number,
  staffCount: number,
  isCurrentYear: boolean = false,
  ceapMonthsCovered: number = 12,
  verbaMonthsCovered: number = 12,
  ceapSourceUrl: string = "",
  verbaSourceUrl: string = "",
): RealMandateCostResult {
  const annualSalary = DEPUTADO_SALARIO * 12
  const estimatedStaffCost = staffCount * MEDIAN_STAFF_SALARY * 12

  const lines: CostLineItem[] = []

  // 1. Deputy salary — always fully confirmed (fixed, publicly known)
  lines.push({
    label: "Salário bruto anual",
    value: annualSalary,
    confirmedValue: annualSalary,
    estimatedValue: 0,
    attribution: "confirmed",
    attributionNote: `✓ via dado público (${formatBrlCompact(DEPUTADO_SALARIO)} × 12)`,
  })

  // 2. CEAP expenses
  if (isCurrentYear && ceapMonthsCovered < 12 && ceapMonthsCovered > 0) {
    const monthlyAvg = ceapTotal / ceapMonthsCovered
    const projectedRemaining = monthlyAvg * (12 - ceapMonthsCovered)
    const fullYearEstimate = ceapTotal + projectedRemaining
    lines.push({
      label: "Despesas CEAP",
      value: fullYearEstimate,
      confirmedValue: ceapTotal,
      estimatedValue: projectedRemaining,
      attribution: "partial",
      attributionNote: `✓ confirmado até mês ${ceapMonthsCovered} + estimado para os demais`,
      sourceUrl: ceapSourceUrl,
    })
  } else {
    lines.push({
      label: "Despesas CEAP",
      value: ceapTotal,
      confirmedValue: ceapTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ via API",
      sourceUrl: ceapSourceUrl,
    })
  }

  // 3. Verba de Gabinete
  if (isCurrentYear && verbaMonthsCovered < 12 && verbaMonthsCovered > 0) {
    const monthlyAvg = verbaGabineteTotal / verbaMonthsCovered
    const projectedRemaining = monthlyAvg * (12 - verbaMonthsCovered)
    const fullYearEstimate = verbaGabineteTotal + projectedRemaining
    lines.push({
      label: "Verba de Gabinete",
      value: fullYearEstimate,
      confirmedValue: verbaGabineteTotal,
      estimatedValue: projectedRemaining,
      attribution: "partial",
      attributionNote: `✓ confirmado até mês ${verbaMonthsCovered} + estimado para os demais`,
      sourceUrl: verbaSourceUrl,
    })
  } else {
    lines.push({
      label: "Verba de Gabinete",
      value: verbaGabineteTotal,
      confirmedValue: verbaGabineteTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ via Portal de Transparência (scraping)",
      sourceUrl: verbaSourceUrl,
    })
  }

  // 4. Staff cost — always estimated (individual salary data not available via API)
  lines.push({
    label: "Funcionários (estimado)",
    value: estimatedStaffCost,
    confirmedValue: 0,
    estimatedValue: estimatedStaffCost,
    attribution: "estimated",
    attributionNote: "~ estimado — dado real disponível apenas no Portal de Transparência",
  })

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
    staffCount,
    medianStaffSalary: MEDIAN_STAFF_SALARY,
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
