/**
 * @file RealMandateCostCard.tsx
 * @description "Custo Real do Mandato" card — the estimated total annual cost
 * of a deputy's mandate to the taxpayer.
 *
 * Two modes:
 * - Current year: shows confirmed amounts + projections for remaining months
 * - Past year: shows all amounts as confirmed (with staff always estimated)
 *
 * Confirmed values render in solid text; estimated values render muted with ~.
 */

"use client"

import { SourcePill } from "@/components/ui"
import type { RealMandateCostResult } from "@/lib/analysis/real-mandate-cost"

interface RealMandateCostCardProps {
  result: RealMandateCostResult
}

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function RealMandateCostCard({ result }: RealMandateCostCardProps) {
  const { lines, grandTotal, confirmedTotal, estimatedTotal, monthlyAverage } = result

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {result.title}
      </h3>

      {/* Hero total */}
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {formatBrl(confirmedTotal)}
        </span>
        {estimatedTotal > 0 && (
          <span className="text-2xl font-semibold tracking-tight text-gray-400 sm:text-3xl">
            + ~ {formatBrl(estimatedTotal)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {estimatedTotal > 0 ? "Confirmado + estimativa" : "Custo total no ano"}
        {" · "}
        <span className="font-semibold text-gray-700">{formatBrl(monthlyAverage)}</span>/mês
      </p>

      {/* Breakdown rows */}
      <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {lines.map((line) => (
          <div
            key={line.label}
            className="px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-600">{line.label}</span>
                {line.sourceUrl && <SourcePill url={line.sourceUrl} />}
              </div>
              <div className="shrink-0 text-right">
                {line.attribution === "partial" ? (
                  <span className="text-sm tabular-nums">
                    <span className="font-semibold text-gray-900">{formatBrl(line.confirmedValue)}</span>
                    <span className="text-gray-400"> + ~ {formatBrl(line.estimatedValue)}</span>
                  </span>
                ) : line.attribution === "estimated" ? (
                  <span className="text-sm font-semibold tabular-nums text-gray-400">
                    ~ {formatBrl(line.value)}
                  </span>
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-gray-900">
                    {formatBrl(line.value)}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {line.attributionNote}
            </p>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        {result.isCurrentYear ? (
          <>
            Os valores marcados como estimativa são calculados com base nos dados
            disponíveis até o momento. Gastos reais podem variar.
          </>
        ) : (
          <>
            Funcionários: valor estimado com base no salário mediano dos cargos.
            O dado real é público mas não está disponível via API.
          </>
        )}
      </p>
    </div>
  )
}
