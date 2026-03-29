/**
 * @file CostPerOutputSection.tsx
 * @description "Custo por entrega" metrics grid — shows cost per unit of
 * measurable output (per active day, per vote, per plenary session, per
 * proposition). Rendered directly below the Custo Real do Mandato card.
 *
 * Only metrics with non-zero denominators are shown. Each card displays
 * the BRL value, the division inputs, and an info tooltip.
 */

"use client"

import { SourcePill } from "@/components/ui"
import type { CostMetric } from "@/lib/analysis/cost-per-output"

interface CostPerOutputSectionProps {
  /** Metrics to display (already filtered to non-zero denominators). */
  metrics: CostMetric[]
  /** Confirmed cost to date for attribution. */
  confirmedCost: number
  /** Reference year. */
  year: number
  /** Number of propositions in the year (to show "none" message). */
  propositionsCount: number
  /** Chamber average cost per vote, or null if unavailable. */
  chamberAvgCostPerVote: number | null
  /** Source URL for the expense data. */
  expenseSourceUrl?: string
}

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatBrlCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)} mil`
  }
  return formatBrl(value)
}

export function CostPerOutputSection({
  metrics,
  confirmedCost,
  year,
  propositionsCount,
  chamberAvgCostPerVote,
  expenseSourceUrl,
}: CostPerOutputSectionProps) {
  if (metrics.length === 0 && propositionsCount > 0) return null

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Custo por entrega
        </h4>
        {expenseSourceUrl && <SourcePill url={expenseSourceUrl} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500">{metric.label}</span>
              <span className="group relative">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-500 cursor-help">
                  i
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {metric.tooltip}
                </span>
              </span>
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight text-gray-900">
              {formatBrl(metric.value)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {formatBrlCompact(metric.numerator)} ÷ {metric.denominatorLabel}
            </p>
          </article>
        ))}

        {/* Show "no propositions" card when deputy has zero */}
        {propositionsCount === 0 && (
          <article className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500">Por proposição</span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Nenhuma proposição apresentada em {year}
            </p>
          </article>
        )}
      </div>

      {/* Chamber average benchmark */}
      {chamberAvgCostPerVote !== null && (
        <p className="mt-3 text-[11px] text-gray-400">
          A média da Câmara em {year} é {formatBrl(chamberAvgCostPerVote)} por votação.
        </p>
      )}
    </div>
  )
}
