/**
 * @file ComparisonCharts.tsx
 * @description Client component for side-by-side comparison charts.
 *
 * Renders multi-series line charts (expenses by month, votes by month),
 * expense category stacked bars, and summary bar charts for comparing deputies.
 */

"use client"

import { ChartCard, LineChart, BarChart, StackedBarChart } from "@/components/charts"
import type { DeputyMetrics, CategoryComparison } from "./comparison-utils"

/** High-contrast colors for up to 3 deputies. */
const DEPUTY_COLORS = ["#4f46e5", "#f59e0b", "#10b981"]

interface ComparisonChartsProps {
  /** Pre-computed metrics for each deputy. */
  metrics: DeputyMetrics[]
  /** Monthly expense data merged for multi-series LineChart. */
  monthlyExpenses: Record<string, unknown>[]
  /** Monthly vote data merged for multi-series LineChart. */
  monthlyVotes: Record<string, unknown>[]
  /** Expense categories comparison data for grouped display. */
  expenseCategories: CategoryComparison[]
  /** Source URL for expense data. */
  expenseSourceUrl: string
  /** Source URL for voting data. */
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
    color: DEPUTY_COLORS[i],
  }))

  const voteSeries = metrics.map((m, i) => ({
    dataKey: m.name,
    name: m.name,
    color: DEPUTY_COLORS[i],
  }))

  // CEAP total comparison bar data
  const ceapBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: Math.round(m.totalCeap),
    color: DEPUTY_COLORS[i],
  }))

  // Alignment comparison bar data
  const alignmentBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: m.alignment,
    color: DEPUTY_COLORS[i],
  }))

  // Vote count comparison
  const voteCountBars = metrics.map((m, i) => ({
    label: m.name.split(" ")[0],
    value: m.voteCount,
    color: DEPUTY_COLORS[i],
  }))

  // Expense category series for stacked bar chart
  const categorySeries = metrics.map((m, i) => ({
    dataKey: m.name,
    name: m.name.split(" ")[0],
    color: DEPUTY_COLORS[i],
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Gastos CEAP por mês"
        subtitle="Evolução mensal dos gastos parlamentares (R$)"
        sourceUrl={expenseSourceUrl}
      >
        <LineChart
          data={monthlyExpenses}
          series={expenseSeries}
          height={300}
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
            subtitle="Top categorias de gastos CEAP (R$)"
            sourceUrl={expenseSourceUrl}
          >
            <StackedBarChart
              data={expenseCategories}
              categoryKey="category"
              series={categorySeries}
              height={320}
              formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
            />
          </ChartCard>
        </div>
      )}

      <ChartCard
        title="Total CEAP no ano"
        subtitle="Comparação do gasto total (R$)"
        sourceUrl={expenseSourceUrl}
      >
        <BarChart
          data={ceapBars}
          height={220}
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
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
          formatValue={(v) => `${v}%`}
        />
      </ChartCard>
    </div>
  )
}
