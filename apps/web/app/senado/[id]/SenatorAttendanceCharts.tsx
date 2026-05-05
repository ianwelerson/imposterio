/**
 * @file SenatorAttendanceCharts.tsx
 * @description Inline attendance charts for the senator detail page.
 *
 * Senate exposes only plenary sessions (no committee/event feed equivalent
 * to Câmara), so the chart set is lighter than the deputy version: a calendar
 * heatmap of present days and a monthly distribution bar chart.
 */

"use client"

import { ChartCard, CalendarHeatmap, BarChart } from "@/components/charts"
import type { MonthlyCount } from "./activity-utils"

interface SenatorAttendanceChartsProps {
  /** Daily attendance counts (1 per day a senator was present). */
  byDay: Array<{ date: string; value: number }>
  /** Monthly attended-session counts (12 buckets). */
  byMonth: MonthlyCount[]
  /** Year being displayed (for CalendarHeatmap year range). */
  year: number
  /** Source URL for attribution. */
  sourceUrl: string
  /** ISO date strings marking parliamentary recess days. */
  recessDays?: Set<string>
}

export function SenatorAttendanceCharts({
  byDay,
  byMonth,
  year,
  sourceUrl,
  recessDays,
}: SenatorAttendanceChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartCard
          title="Dias com presença em plenário"
          subtitle="Sessões deliberativas, solenes e preparatórias com presença registrada"
          sourceUrl={sourceUrl}
        >
          <CalendarHeatmap
            data={byDay}
            year={year}
            emptyLabel="Sem presença registrada"
            formatValue={(v) => `${v} sessão${v !== 1 ? "ões" : ""}`}
            recessDays={recessDays}
          />
        </ChartCard>
      </div>

      {byMonth.some((m) => m.value > 0) && (
        <div className="lg:col-span-2">
          <ChartCard
            title="Sessões com presença por mês"
            subtitle="Distribuição mensal das sessões deliberativas com comparecimento"
            sourceUrl={sourceUrl}
          >
            <BarChart data={byMonth} height={260} />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
