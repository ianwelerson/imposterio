/**
 * @file StaffCharts.tsx
 * @description Client component for staff distribution charts on the overview page.
 *
 * Renders four charts:
 * 1. PieChart — group distribution (Quadro Efetivo, Parlamentar, etc.)
 * 2. BarChart (horizontal) — top departments by staff count
 * 3. BarChart (horizontal) — top positions by staff count
 * 4. BarChart (horizontal) — top roles/functions by staff count
 *
 * Receives pre-aggregated data from the server page as props.
 */

"use client"

import { ChartCard, BarChart, PieChart } from "@/components/charts"
import type { BarChartItem, PieChartItem } from "@/components/charts"

interface AggregatedItem {
  name: string
  count: number
}

interface StaffChartsProps {
  /** Staff count by group type (for pie chart). */
  byGroup: AggregatedItem[]
  /** Top departments by staff count (for horizontal bar chart). */
  byDepartment: AggregatedItem[]
  /** Top positions by staff count (for horizontal bar chart). */
  byPosition: AggregatedItem[]
  /** Top roles/functions by staff count (for horizontal bar chart). */
  byRole: AggregatedItem[]
  /** Source URL for SourcePill attribution on each chart card. */
  sourceUrl: string
}

const GROUP_COLORS = [
  "#4f46e5", // indigo — Quadro Efetivo
  "#059669", // emerald — Parlamentar
  "#d97706", // amber — Secretário Parlamentar
  "#dc2626", // red — Cargo de Natureza Especial
  "#7c3aed", // violet — fallback
  "#0891b2", // cyan — fallback
]

export function StaffCharts({ byGroup, byDepartment, byPosition, byRole, sourceUrl }: StaffChartsProps) {
  const hasData = byGroup.length > 0 || byDepartment.length > 0

  if (!hasData) return null

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Group distribution pie chart */}
      {byGroup.length > 0 && (
        <ChartCard
          title="Distribuição por grupo"
          subtitle="Funcionários por tipo de vínculo"
          sourceUrl={sourceUrl}
        >
          <PieChart
            data={byGroup.map((g, i): PieChartItem => ({
              name: g.name,
              value: g.count,
              color: GROUP_COLORS[i % GROUP_COLORS.length],
            }))}
            height={280}
          />
        </ChartCard>
      )}

      {/* Top departments bar chart */}
      {byDepartment.length > 0 && (
        <ChartCard
          title="Principais lotações"
          subtitle="Departamentos com mais funcionários"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={byDepartment.map((d): BarChartItem => ({
              label: d.name,
              value: d.count,
            }))}
            horizontal
            height={280}
          />
        </ChartCard>
      )}

      {/* Top positions bar chart */}
      {byPosition.length > 0 && (
        <ChartCard
          title="Principais cargos"
          subtitle="Cargos com maior número de ocupantes"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={byPosition.map((p): BarChartItem => ({
              label: p.name,
              value: p.count,
            }))}
            horizontal
            height={280}
          />
        </ChartCard>
      )}

      {/* Top roles bar chart */}
      {byRole.length > 0 && (
        <ChartCard
          title="Principais funções"
          subtitle="Funções mais frequentes no quadro"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={byRole.map((r): BarChartItem => ({
              label: r.name,
              value: r.count,
            }))}
            horizontal
            height={280}
          />
        </ChartCard>
      )}
    </div>
  )
}
