/**
 * @file senado-real-mandate-cost.ts
 * @description Assembles the full taxpayer cost of a senator's mandate for a
 * given year — the Senado-specific version of "Custo Real do Mandato".
 *
 * Differs from the Câmara version in two ways:
 * - No "Verba de Gabinete" envelope (the Senado funds staff differently;
 *   institutional payroll lands in Phase 8 once `getCabinetPayroll()` exists).
 * - CEAPS uses a per-UF monthly cap (see `SENADO_CEAPS_MONTHLY_CAPS_BY_UF`).
 *
 * Two modes:
 * - **Past year:** salary + CEAPS are confirmed (full year covered)
 * - **Current year:** salary is prorated by elapsed months; CEAPS is
 *   confirmed year-to-date only (no projection — matches Câmara behavior)
 *
 * Pure function — operates on pre-fetched data only.
 */

import { SENADOR_SALARIO } from "@/lib/constants/senado"

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

/** Attribution status for a cost component. */
export type CostAttribution =
  | "confirmed"
  | "estimated"
  | "partial"

/** A single cost line in the breakdown. */
export interface CostLineItem {
  label: string
  value: number
  confirmedValue: number
  estimatedValue: number
  attribution: CostAttribution
  attributionNote: string
  sourceUrl?: string
  tooltip?: string
}

/** Full Custo Real do Mandato result for a senator. */
export interface RealMandateCostResult {
  year: number
  isCurrentYear: boolean
  title: string
  lines: CostLineItem[]
  grandTotal: number
  confirmedTotal: number
  estimatedTotal: number
  monthlyAverage: number
}

/**
 * Optional cabinet-payroll input for the cost breakdown.
 *
 * When the institutional servants pipeline is wired (Phase 8), the detail
 * page passes a chamber-wide average for commissioned-staff payroll per
 * senator. The value is an *estimate*: the Senate publishes payroll for the
 * full institution (effectives + commissioned + retirees + pensioners), and
 * the per-senator slice is approximated by `commissionedPay × 12 / 81`.
 */
export interface CabinetPayrollInput {
  /** Estimated annual cabinet-payroll cost per senator (BRL). */
  annualEstimate: number
  /** Source URL pointing at the underlying remuneration endpoint. */
  sourceUrl: string
  /** Reference month label (e.g. "março/2025") for the attribution note. */
  referenceLabel: string
}

/**
 * Assembles the full taxpayer cost of a senator's mandate for a given year.
 *
 * @param year - Reference year
 * @param ceapsTotal - Total CEAPS expenses from API (BRL)
 * @param isCurrentYear - Whether this is the current (incomplete) year
 * @param ceapsFirstMonth - First month (1-12) with CEAPS data
 * @param ceapsLastMonth - Last month (1-12) with CEAPS data
 * @param ceapsSourceUrl - Source URL for the CEAPS SourcePill
 * @param salarySourceUrl - Source URL for the salary SourcePill (Senado RH)
 * @param cabinetPayroll - Optional cabinet-payroll estimate (Phase 8). When
 *   provided, adds a line for the chamber-wide average of commissioned-staff
 *   payroll per senator. Marked as `estimated`.
 * @returns Cost result with confirmed vs estimated breakdown
 */
export function computeSenadoRealMandateCost(
  year: number,
  ceapsTotal: number,
  isCurrentYear: boolean = false,
  ceapsFirstMonth: number = 1,
  ceapsLastMonth: number = 12,
  ceapsSourceUrl: string = "",
  salarySourceUrl: string = "",
  cabinetPayroll?: CabinetPayrollInput,
): RealMandateCostResult {
  const annualSalary = SENADOR_SALARIO * 12
  const lines: CostLineItem[] = []

  if (isCurrentYear) {
    // Salary is paid monthly: by Mar 28, you've received Jan, Feb, Mar = 3 months.
    const salaryMonthsPaid = new Date().getMonth() + 1
    const salaryRemaining = 12 - salaryMonthsPaid
    const salaryConfirmed = SENADOR_SALARIO * salaryMonthsPaid
    const salaryEstimated = SENADOR_SALARIO * salaryRemaining

    if (salaryRemaining > 0) {
      lines.push({
        label: "Subsídio bruto",
        value: annualSalary,
        confirmedValue: salaryConfirmed,
        estimatedValue: salaryEstimated,
        attribution: "partial",
        attributionNote: `✓ ${formatBrlCompact(SENADOR_SALARIO)} × ${salaryMonthsPaid} meses + estimado × ${salaryRemaining} meses`,
        sourceUrl: salarySourceUrl,
      })
    } else {
      lines.push({
        label: "Subsídio bruto anual",
        value: annualSalary,
        confirmedValue: annualSalary,
        estimatedValue: 0,
        attribution: "confirmed",
        attributionNote: `✓ confirmado (${formatBrlCompact(SENADOR_SALARIO)} × 12)`,
        sourceUrl: salarySourceUrl,
      })
    }

    const ceapsFirstName = MONTH_NAMES[ceapsFirstMonth - 1] ?? "janeiro"
    const ceapsLastName = MONTH_NAMES[ceapsLastMonth - 1] ?? "dezembro"
    lines.push({
      label: `CEAPS (${ceapsFirstName}–${ceapsLastName})`,
      value: ceapsTotal,
      confirmedValue: ceapsTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ valor confirmado via API",
      sourceUrl: ceapsSourceUrl,
    })
  } else {
    lines.push({
      label: "Subsídio bruto anual",
      value: annualSalary,
      confirmedValue: annualSalary,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: `✓ via dado público (${formatBrlCompact(SENADOR_SALARIO)} × 12)`,
      sourceUrl: salarySourceUrl,
    })

    lines.push({
      label: "Despesas CEAPS",
      value: ceapsTotal,
      confirmedValue: ceapsTotal,
      estimatedValue: 0,
      attribution: "confirmed",
      attributionNote: "✓ via API",
      sourceUrl: ceapsSourceUrl,
    })
  }

  if (cabinetPayroll && cabinetPayroll.annualEstimate > 0) {
    lines.push({
      label: "Folha de gabinete (média do Senado)",
      value: cabinetPayroll.annualEstimate,
      confirmedValue: 0,
      estimatedValue: cabinetPayroll.annualEstimate,
      attribution: "estimated",
      attributionNote: `~ média estimada (folha comissionada de ${cabinetPayroll.referenceLabel} × 12 ÷ 81 senadores)`,
      sourceUrl: cabinetPayroll.sourceUrl,
      tooltip:
        "A API administrativa do Senado publica a folha completa, mas não desagrega por gabinete. Este valor é a média da folha comissionada distribuída entre os 81 senadores e serve apenas como ordem de grandeza.",
    })
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

function formatBrlCompact(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}
