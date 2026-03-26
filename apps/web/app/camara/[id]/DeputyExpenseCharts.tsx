/**
 * @file DeputyExpenseCharts.tsx
 * @description Client component rendering all expense-related charts for
 * a deputy's detail page.
 *
 * Charts included:
 * - Year-over-year comparison (area chart)
 * - Monthly expense breakdown (bar chart)
 * - Calendar heatmap (daily spending intensity)
 * - Expense by category (treemap)
 * - Top suppliers (horizontal bar chart)
 * - Category × supplier breakdown (stacked bar chart)
 */

"use client"

import {
  ChartCard, LineChart, BarChart,
  TreemapChart, CalendarHeatmap, StackedBarChart,
} from "@/components/charts"
import type {
  MonthlyExpense,
  CategoryExpense,
  SupplierExpense,
  DailyExpenseAgg,
  CategorySupplierResult,
} from "./expense-utils"

interface DeputyExpenseChartsProps {
  /** Monthly totals for the selected year. */
  selectedYearMonthly: MonthlyExpense[]
  /** Monthly totals for the year before the selected one. */
  prevYearMonthly: MonthlyExpense[]
  /** The selected year number (e.g. 2024). */
  year: number
  /** Expenses aggregated by category. */
  byCategory: CategoryExpense[]
  /** Top suppliers by total value. */
  bySupplier: SupplierExpense[]
  /** Monthly bar chart data for the current year. */
  monthlyBarData: Array<{ label: string; value: number }>
  /** Daily expense totals for the calendar heatmap. */
  dailyExpenses: DailyExpenseAgg[]
  /** Category × supplier cross-tabulation for stacked bar chart. */
  categoryBySupplier: CategorySupplierResult
  /** Source URL for the expenses API call. */
  sourceUrl?: string
}

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function DeputyExpenseCharts({
  selectedYearMonthly,
  prevYearMonthly,
  year,
  byCategory,
  bySupplier,
  monthlyBarData,
  dailyExpenses,
  categoryBySupplier,
  sourceUrl,
}: DeputyExpenseChartsProps) {
  // Year-over-year comparison data — 12 months, filling gaps with 0
  const comparisonData = MONTH_LABELS.map((label, i) => {
    const month = i + 1
    const current = selectedYearMonthly.find((m) => m.month === month)
    const previous = prevYearMonthly.find((m) => m.month === month)
    return {
      label,
      atual: current?.total ?? 0,
      anterior: previous?.total ?? 0,
    }
  })

  // Only show months up to the latest with data
  const lastMonthWithData = Math.max(
    ...selectedYearMonthly.map((m) => m.month),
    ...prevYearMonthly.map((m) => m.month),
    1,
  )
  const visibleComparison = comparisonData.slice(0, lastMonthWithData)

  const comparisonSeries = [
    { dataKey: "atual", name: `${year}`, color: "#4f46e5" },
    { dataKey: "anterior", name: `${year - 1}`, color: "#f59e0b" },
  ]

  const hasComparison = selectedYearMonthly.length > 0 || prevYearMonthly.length > 0

  // Treemap data from category aggregation
  const treemapData = byCategory.map((c) => ({ name: c.name, value: c.value }))

  // Stacked bar series from the category × supplier result
  const stackedSeries = categoryBySupplier.suppliers.map((s) => ({
    dataKey: s.key,
    name: s.name,
    color: s.color,
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Row 1: Year-over-year comparison + Monthly bar */}
      {hasComparison && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Comparativo de gastos CEAP"
          subtitle={`${year} vs ${year - 1} — acumulado mensal`}
        >
          <LineChart
            data={visibleComparison}
            series={comparisonSeries}
            area
            height={280}
            formatValue={formatBRL}
          />
        </ChartCard>
      )}

      {monthlyBarData.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Despesas mensais"
          subtitle="Gasto total por mês"
        >
          <BarChart
            data={monthlyBarData}
            height={280}
            formatValue={formatBRL}
          />
        </ChartCard>
      )}

      {/* Row 2: Calendar heatmap — full width */}
      {dailyExpenses.length > 0 && (
        <div className="lg:col-span-2">
          <ChartCard
            sourceUrl={sourceUrl}
            title="Gastos diários"
            subtitle="Intensidade de gastos por dia — quanto mais escuro, maior o valor"
          >
            <CalendarHeatmap
              data={dailyExpenses}
              year={year}
              formatValue={formatBRL}
            />
          </ChartCard>
        </div>
      )}

      {/* Row 3: Category treemap + Top suppliers bar */}
      {treemapData.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Despesas por categoria"
          subtitle="Área proporcional ao valor gasto — categorias maiores são mais visíveis"
        >
          <TreemapChart
            data={treemapData}
            height={320}
            formatValue={formatBRL}
          />
        </ChartCard>
      )}

      {bySupplier.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Maiores fornecedores"
          subtitle="Top 10 fornecedores por valor total"
        >
          <BarChart
            data={bySupplier}
            horizontal
            height={320}
            formatValue={formatBRL}
          />
        </ChartCard>
      )}

      {/* Row 4: Category × Supplier stacked bar — full width */}
      {categoryBySupplier.rows.length > 0 && stackedSeries.length > 0 && (
        <div className="lg:col-span-2">
          <ChartCard
            sourceUrl={sourceUrl}
            title="Categoria × Fornecedor"
            subtitle="Quais fornecedores dominam cada categoria de gasto"
          >
            <StackedBarChart
              data={categoryBySupplier.rows}
              categoryKey="category"
              series={stackedSeries}
              height={Math.max(320, categoryBySupplier.rows.length * 36)}
              formatValue={formatBRL}
            />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
