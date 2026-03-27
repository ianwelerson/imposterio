/**
 * @file real-mandate-cost.ts
 * @description Assembles the full taxpayer cost of a deputy's mandate for a
 * given year — the "Custo Real do Mandato" index.
 *
 * Components:
 * 1. Deputy salary: DEPUTADO_SALARIO × 12
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

/** Individual cost components of the Custo Real do Mandato. */
export interface MandateCostComponents {
  /** Annual deputy salary: DEPUTADO_SALARIO × 12 (BRL). */
  annualSalary: number
  /** Total CEAP expenses for the year (BRL). */
  ceapTotal: number
  /** Total Verba de Gabinete spent for the year (BRL). */
  verbaGabineteTotal: number
  /**
   * Estimated annual staff cost (BRL).
   *
   * Calculated as: staffCount × median base salary × 12 months.
   * The median salary from FUNCIONARIOS_CARGOS is used because individual
   * staff salary levels are not publicly disclosed per-deputy.
   */
  estimatedStaffCost: number
  /** Number of staff used in the estimation. */
  staffCount: number
  /** Median monthly staff salary used in the estimation (BRL). */
  medianStaffSalary: number
}

/** Full Custo Real do Mandato result. */
export interface RealMandateCostResult {
  /** Year of the analysis. */
  year: number
  /** Individual cost components. */
  components: MandateCostComponents
  /** Grand total: sum of all components (BRL). */
  grandTotal: number
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
 * @param year - Reference year
 * @param ceapTotal - Total CEAP expenses for the year (from expense data)
 * @param verbaGabineteTotal - Total Verba de Gabinete spent (from scraper data)
 * @param staffCount - Number of parliamentary secretaries employed (average for the year)
 * @returns Custo Real do Mandato with all components and grand total
 *
 * @example
 * ```typescript
 * const cost = computeRealMandateCost(2026, 180_000, 1_500_000, 25)
 * console.log(cost.grandTotal)      // ~2_700_000
 * console.log(cost.monthlyAverage)  // ~225_000
 * ```
 */
export function computeRealMandateCost(
  year: number,
  ceapTotal: number,
  verbaGabineteTotal: number,
  staffCount: number,
): RealMandateCostResult {
  const annualSalary = DEPUTADO_SALARIO * 12
  const estimatedStaffCost = staffCount * MEDIAN_STAFF_SALARY * 12

  const components: MandateCostComponents = {
    annualSalary,
    ceapTotal,
    verbaGabineteTotal,
    estimatedStaffCost,
    staffCount,
    medianStaffSalary: MEDIAN_STAFF_SALARY,
  }

  const grandTotal = annualSalary + ceapTotal + verbaGabineteTotal + estimatedStaffCost
  const monthlyAverage = Math.round((grandTotal / 12) * 100) / 100

  return {
    year,
    components,
    grandTotal,
    monthlyAverage,
  }
}
