/**
 * @file AttendanceCharts.tsx
 * @description Client component for attendance data visualizations.
 *
 * Renders two CalendarHeatmap charts:
 * 1. Plenary sessions — attendance at formal voting sessions (Sessões Deliberativas)
 * 2. All events — attendance across all event types (hearings, committees, etc.)
 *
 * Also renders a bar chart showing the distribution by event type.
 *
 * All chart data is pre-aggregated server-side in attendance-utils.ts.
 */

"use client"

import { ChartCard, CalendarHeatmap, BarChart } from "@/components/charts"
import type { DailyAttendance, AttendanceByType } from "./attendance-utils"

interface AttendanceChartsProps {
  /** Daily attendance counts for plenary sessions only. */
  plenaryByDay: DailyAttendance[]
  /** Daily attendance counts across all event types. */
  allByDay: DailyAttendance[]
  /** Event type distribution for bar chart. */
  byType: AttendanceByType[]
  /** Year being displayed (for CalendarHeatmap year range). */
  year: number
  /** Source URL for attribution. */
  sourceUrl: string
}

export function AttendanceCharts({
  plenaryByDay,
  allByDay,
  byType,
  year,
  sourceUrl,
}: AttendanceChartsProps) {
  /** Map DailyAttendance to DailyExpense shape expected by CalendarHeatmap. */
  const toHeatmapData = (days: DailyAttendance[]) =>
    days.map((d) => ({ date: d.date, value: d.count }))

  /** Map AttendanceByType to BarChartItem shape expected by BarChart. */
  const toBarData = (items: AttendanceByType[]) =>
    items.map((t) => ({ label: t.name, value: t.count }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartCard
          title="Presença em sessões plenárias"
          subtitle="Sessões Deliberativas, Solenes e Preparatórias"
          sourceUrl={sourceUrl}
        >
          <CalendarHeatmap
            data={toHeatmapData(plenaryByDay)}
            year={year}
          />
        </ChartCard>
      </div>

      <div className="lg:col-span-2">
        <ChartCard
          title="Presença em todos os eventos"
          subtitle="Comissões, audiências, seminários e demais eventos"
          sourceUrl={sourceUrl}
        >
          <CalendarHeatmap
            data={toHeatmapData(allByDay)}
            year={year}
          />
        </ChartCard>
      </div>

      <div className="lg:col-span-2">
        <ChartCard
          title="Distribuição por tipo de evento"
          sourceUrl={sourceUrl}
        >
          <BarChart
            data={toBarData(byType.slice(0, 12))}
            horizontal
          />
        </ChartCard>
      </div>
    </div>
  )
}
