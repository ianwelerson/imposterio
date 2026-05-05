/**
 * @file ComparisonCharts.tsx
 * @description Client component for side-by-side senator comparison charts.
 *
 * Renders multi-series line charts (CEAPS by month, votes by month), expense
 * category stacked bars, and summary bar charts comparing senators.
 */

"use client"

import { ChartCard, LineChart, BarChart, StackedBarChart } from "@/components/charts"
import { formatBRL, formatPercent } from "@/lib/calc"
import type { SenatorMetrics, CategoryComparison } from "./comparison-utils"

const SENATOR_COLORS = ["#4f46e5", "#f59e0b", "#10b981"]

interface ComparisonChartsProps {
  metrics: SenatorMetrics[]
  monthlyExpenses: Record<string, unknown>[]
  monthlyVotes: Record<string, unknown>[]
  expenseCategories: CategoryComparison[]
  expenseSourceUrl: string
  votesSourceUrl: string
}

export function ComparisonCharts({
  metrics,
  monthlyExpenses,
  monthlyVotes,
  expenseCategories,
  expenseSourceUrl,
  votesSourceUrl,
}: ComparisonChartsProps) {
  const expenseSeries = metrics.map((m, i) => ({
    dataKey: m.name,
    name: m.name,
    color: SENATOR_COLORS[i],
  }))

  const voteSeries = metrics.map((m, i) => ({
    dataKey: m.name,
    name: m.name,
    color: SENATOR_COLORS[i],
  }))

  const ceapsBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: Math.round(m.totalCeaps),
    color: SENATOR_COLORS[i],
  }))

  const alignmentBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: m.alignment,
    color: SENATOR_COLORS[i],
  }))

  const voteCountBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: m.voteCount,
    color: SENATOR_COLORS[i],
  }))

  const attendanceBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: m.attendancePercent,
    color: SENATOR_COLORS[i],
  }))

  const categorySeries = metrics.map((m, i) => ({
    dataKey: m.name,
    name: m.name.split(" ")[0],
    color: SENATOR_COLORS[i],
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Gastos CEAPS por mês"
        subtitle="Evolução mensal dos gastos parlamentares (R$)"
        sourceUrl={expenseSourceUrl}
      >
        <LineChart
          data={monthlyExpenses}
          series={expenseSeries}
          height={300}
          formatValue={formatBRL}
        />
      </ChartCard>

      <ChartCard
        title="Votações por mês"
        subtitle="Participação em sessões de votação por mês"
        sourceUrl={votesSourceUrl}
      >
        <LineChart
          data={monthlyVotes}
          series={voteSeries}
          height={300}
        />
      </ChartCard>

      {expenseCategories.length > 0 && (
        <div className="lg:col-span-2">
          <ChartCard
            title="Despesas por categoria"
            subtitle="Top categorias de gastos CEAPS (R$)"
            sourceUrl={expenseSourceUrl}
          >
            <StackedBarChart
              data={expenseCategories}
              categoryKey="category"
              series={categorySeries}
              height={320}
              formatValue={formatBRL}
            />
          </ChartCard>
        </div>
      )}

      <ChartCard
        title="Total CEAPS no ano"
        subtitle="Comparação do gasto total (R$)"
        sourceUrl={expenseSourceUrl}
      >
        <BarChart
          data={ceapsBars}
          height={220}
          formatValue={formatBRL}
        />
      </ChartCard>

      <ChartCard
        title="Participação em votações"
        subtitle="Total de sessões com voto registrado"
        sourceUrl={votesSourceUrl}
      >
        <BarChart
          data={voteCountBars}
          height={220}
        />
      </ChartCard>

      <ChartCard
        title="Alinhamento com resultado"
        subtitle="Frequência de voto com o lado vencedor (%)"
        sourceUrl={votesSourceUrl}
      >
        <BarChart
          data={alignmentBars}
          height={220}
          color="#10b981"
          formatValue={formatPercent}
        />
      </ChartCard>

      <ChartCard
        title="Presença em plenário"
        subtitle="Comparecimento em sessões deliberativas (%)"
      >
        <BarChart
          data={attendanceBars}
          height={220}
          color="#4f46e5"
          formatValue={formatPercent}
        />
      </ChartCard>
    </div>
  )
}
