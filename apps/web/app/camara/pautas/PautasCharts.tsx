/**
 * @file PautasCharts.tsx
 * @description Client charts for the Câmara legislative agenda overview.
 *
 * Renders two sets of charts:
 * 1. Propositions: type distribution (pie) + monthly activity (bar)
 * 2. Voting sessions: result distribution (pie) + monthly activity (bar)
 *
 * Receives pre-aggregated data from the server page as props.
 */

"use client"

import { ChartCard, BarChart, PieChart } from "@/components/charts"
import type { BarChartItem, PieChartItem } from "@/components/charts"

interface CountItem {
  name: string
  value: number
}

interface MonthlyCount {
  label: string
  value: number
}

interface PautasChartsProps {
  /** Proposition distribution by type code (for pie chart). */
  byType?: CountItem[]
  /** Monthly proposition count (for bar chart). */
  byMonth?: MonthlyCount[]
  /** Monthly voting session count (for bar chart). */
  votesByMonth?: MonthlyCount[]
  /** Voting sessions by result (for pie chart). */
  votesByResult?: CountItem[]
  /** Source URL for SourcePill attribution. */
  sourceUrl?: string
}

const TYPE_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#2563eb",
]

const RESULT_COLORS: Record<string, string> = {
  "Aprovada": "#10b981",
  "Rejeitada": "#ef4444",
  "Indefinida": "#9ca3af",
}

export function PautasCharts({ byType, byMonth, votesByMonth, votesByResult, sourceUrl }: PautasChartsProps) {
  // Proposition charts
  const showPropositionCharts = byType && byMonth

  // Voting charts
  const showVotingCharts = votesByMonth && votesByResult

  if (!showPropositionCharts && !showVotingCharts) return null

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {showPropositionCharts && (
        <>
          <ChartCard title="Distribuição por tipo" subtitle="Proposições por tipo legislativo" sourceUrl={sourceUrl}>
            <PieChart
              data={byType.map((t, i): PieChartItem => ({
                name: t.name,
                value: t.value,
                color: TYPE_COLORS[i % TYPE_COLORS.length],
              }))}
              height={260}
            />
          </ChartCard>

          <ChartCard title="Atividade mensal" subtitle="Proposições apresentadas por mês" sourceUrl={sourceUrl}>
            <BarChart
              data={byMonth.map((m): BarChartItem => ({
                label: m.label,
                value: m.value,
              }))}
              height={260}
            />
          </ChartCard>
        </>
      )}

      {showVotingCharts && (
        <>
          <ChartCard title="Resultado das votações" subtitle="Distribuição por resultado" sourceUrl={sourceUrl}>
            <PieChart
              data={votesByResult.map((r): PieChartItem => ({
                name: r.name,
                value: r.value,
                color: RESULT_COLORS[r.name] ?? "#6b7280",
              }))}
              height={260}
            />
          </ChartCard>

          <ChartCard title="Votações por mês" subtitle="Número de votações realizadas por mês" sourceUrl={sourceUrl}>
            <BarChart
              data={votesByMonth.map((m): BarChartItem => ({
                label: m.label,
                value: m.value,
              }))}
              height={260}
            />
          </ChartCard>
        </>
      )}
    </div>
  )
}
