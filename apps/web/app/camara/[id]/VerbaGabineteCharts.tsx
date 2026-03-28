/**
 * @file VerbaGabineteCharts.tsx
 * @description Client chart component for the Verba de Gabinete section.
 * Displays monthly office spending as a bar chart.
 */

"use client"

import { ChartCard, BarChart } from "@/components/charts"

interface VerbaGabineteChartsProps {
  monthlyBar: Array<{ label: string; value: number }>
  sourceUrl: string
}

export function VerbaGabineteCharts({ monthlyBar, sourceUrl }: VerbaGabineteChartsProps) {
  const formatBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="grid grid-cols-1 gap-6">
      {monthlyBar.some((m) => m.value > 0) && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Gastos por mês"
          subtitle="Valor total gasto com Verba de Gabinete em cada mês"
        >
          <BarChart data={monthlyBar} height={280} formatValue={formatBrl} />
        </ChartCard>
      )}
    </div>
  )
}
