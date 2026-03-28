/**
 * @file ExpenseMapSection.tsx
 * @description Client component for the CEAP geographic context section.
 *
 * Full-width Brazil map highlighting the deputy's UF, followed by a
 * ranked top-5 category bar chart below. Responsive with minimum heights.
 */

"use client"

import { ChartCard, BarChart } from "@/components/charts"
import { BrazilMap } from "@/components/charts/BrazilMap"

interface CategoryExpense {
  name: string
  value: number
}

interface ExpenseMapSectionProps {
  deputyUf: string
  byCategory: CategoryExpense[]
  sourceUrl: string
}

export function ExpenseMapSection({ deputyUf, byCategory, sourceUrl }: ExpenseMapSectionProps) {
  const formatBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const top5 = byCategory.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Full-width Brazil map */}
      <ChartCard
        sourceUrl={sourceUrl}
        title="Estado do deputado"
        subtitle={`Base eleitoral: ${deputyUf}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-full" style={{ minHeight: 240 }}>
            <BrazilMap highlightUf={deputyUf} height={360} />
          </div>
          <p className="text-xs text-gray-400 text-center max-w-md">
            A API da Câmara não disponibiliza o estado do fornecedor nas despesas CEAP,
            impossibilitando a atribuição geográfica dos gastos.
          </p>
        </div>
      </ChartCard>

      {/* Top 5 categories below the map */}
      {top5.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Top 5 categorias CEAP"
          subtitle="Maiores categorias de despesa no ano"
        >
          <BarChart
            data={top5.map((c) => ({ label: c.name, value: c.value }))}
            horizontal
            height={260}
            formatValue={formatBrl}
          />
        </ChartCard>
      )}
    </div>
  )
}
