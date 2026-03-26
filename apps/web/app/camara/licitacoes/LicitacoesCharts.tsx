/**
 * @file LicitacoesCharts.tsx
 * @description Client charts for the Camara procurement overview page.
 *
 * Renders three visualizations:
 * 1. Pie chart — procurement distribution by modality (by value)
 * 2. Horizontal bar chart — procurement count by status
 * 3. Bar chart — monthly contracted value from contracts
 *
 * Receives pre-aggregated data from the server page as props.
 */

"use client"

import { ChartCard, BarChart, PieChart } from "@/components/charts"
import type { BarChartItem, PieChartItem } from "@/components/charts"
import type { MonthlyContractValue } from "./licitacoes-utils"

interface ModalityItem {
  name: string
  count: number
  value: number
}

interface StatusItem {
  name: string
  count: number
}

interface LicitacoesChartsProps {
  /** Procurement distribution by modality with value and count. */
  byModality: ModalityItem[]
  /** Procurement count by status. */
  byStatus: StatusItem[]
  /** Monthly contracted values aggregated from contracts. */
  contractsByMonth: MonthlyContractValue[]
  /** Source URL for SourcePill attribution. */
  sourceUrl?: string
}

const MODALITY_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#0d9488", "#ea580c", "#2563eb",
]

export function LicitacoesCharts({
  byModality,
  byStatus,
  contractsByMonth,
  sourceUrl,
}: LicitacoesChartsProps) {
  const hasModality = byModality.length > 0
  const hasStatus = byStatus.length > 0
  const hasMonthly = contractsByMonth.some((m) => m.value > 0)

  if (!hasModality && !hasStatus && !hasMonthly) return null

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {hasModality && (
        <ChartCard
          title="Distribuição por modalidade"
          subtitle="Valor contratado por modalidade de licitação"
          sourceUrl={sourceUrl}
        >
          <PieChart
            data={byModality.map((m, i): PieChartItem => ({
              name: m.name,
              value: m.value,
              color: MODALITY_COLORS[i % MODALITY_COLORS.length],
            }))}
            height={260}
          />
        </ChartCard>
      )}

      {hasStatus && (
        <ChartCard
          title="Situação das licitações"
          subtitle="Quantidade de processos por situação"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={byStatus.map((s): BarChartItem => ({
              label: s.name,
              value: s.count,
            }))}
            horizontal
            height={260}
          />
        </ChartCard>
      )}

      {hasMonthly && (
        <ChartCard
          title="Valor contratado por mês"
          subtitle="Soma mensal dos contratos firmados"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={contractsByMonth.map((m): BarChartItem => ({
              label: m.label,
              value: m.value,
            }))}
            height={260}
          />
        </ChartCard>
      )}
    </div>
  )
}
