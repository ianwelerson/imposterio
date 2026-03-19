/**
 * @file PautasCharts.tsx
 * @description Client charts for the Senado legislative agenda overview.
 *
 * Shows year-over-year comparison of propositions: total count per year,
 * breakdown by theme, and monthly activity.
 */

"use client"

import { ChartCard, BarChart, LineChart, PieChart } from "@/components/charts"
import type { BarChartItem, PieChartItem, LineSeries } from "@/components/charts"

interface YearlyStats {
  year: number
  total: number
  approved: number
  rejected: number
  inProgress: number
  archived: number
}

interface ThemeCount {
  name: string
  value: number
}

interface MonthlyActivity {
  label: string
  [year: string]: number | string
}

interface PautasChartsProps {
  yearlyStats: YearlyStats[]
  themeDistribution: ThemeCount[]
  monthlyActivity: MonthlyActivity[]
  years: number[]
}

const THEME_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#2563eb",
]

const YEAR_COLORS = ["#4f46e5", "#0891b2", "#d97706", "#10b981"]

export function PautasCharts({ yearlyStats, themeDistribution, monthlyActivity, years }: PautasChartsProps) {
  const statusByYear: BarChartItem[] = yearlyStats.map((y) => ({
    label: String(y.year),
    value: y.total,
  }))

  const themeData: PieChartItem[] = themeDistribution.map((t, i) => ({
    name: t.name,
    value: t.value,
    color: THEME_COLORS[i % THEME_COLORS.length],
  }))

  const lineSeries: LineSeries[] = years.map((y, i) => ({
    dataKey: String(y),
    name: String(y),
    color: YEAR_COLORS[i % YEAR_COLORS.length],
  }))

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Proposições por ano" subtitle="Total de proposições registradas">
        <BarChart data={statusByYear} height={260} />
      </ChartCard>

      <ChartCard title="Distribuição por tema" subtitle="Proposições do ano corrente">
        <PieChart data={themeData} height={260} />
      </ChartCard>

      <div className="lg:col-span-2">
        <ChartCard title="Atividade mensal" subtitle="Atualizações de proposições por mês">
          <LineChart data={monthlyActivity} series={lineSeries} height={280} area />
        </ChartCard>
      </div>
    </div>
  )
}
