/**
 * @file AttendanceOverviewCharts.tsx
 * @description Client component for the unified Presença section on the deputy detail page.
 *
 * Renders:
 * 1. CalendarHeatmap for ALL events + LineChart for hours per week (side by side)
 * 2. CalendarHeatmap for plenary sessions + CalendarHeatmap for non-plenary (side by side)
 * 3. PieChart (doughnut) for event type distribution + LineChart for events by month (side by side)
 *
 * All chart data is pre-aggregated server-side in attendance-utils.ts and activity-utils.ts.
 */

"use client"

import { ChartCard, CalendarHeatmap, PieChart, LineChart } from "@/components/charts"
import type { DailyAttendance, AttendanceByType, WeeklyHours } from "./presenca/attendance-utils"
import type { MonthlyCount } from "./activity-utils"

interface AttendanceOverviewChartsProps {
  /** Daily attendance counts for ALL events (plenary + non-plenary combined). */
  allByDay: DailyAttendance[]
  /** Daily attendance counts for plenary sessions only. */
  plenaryByDay: DailyAttendance[]
  /** Daily attendance counts for non-plenary events. */
  nonPlenaryByDay: DailyAttendance[]
  /** Hours of activity per week (from event start/end times). */
  hoursPerWeek: WeeklyHours[]
  /** Event type distribution for doughnut chart. */
  byType: AttendanceByType[]
  /** Events by month for line chart. */
  byMonth: MonthlyCount[]
  /** Year being displayed (for CalendarHeatmap year range). */
  year: number
  /** Source URL for attribution (attendance bulk data). */
  sourceUrl: string
  /** Source URL for events REST API data. */
  eventsSourceUrl?: string
}

export function AttendanceOverviewCharts({
  allByDay,
  plenaryByDay,
  nonPlenaryByDay,
  hoursPerWeek,
  byType,
  byMonth,
  year,
  sourceUrl,
  eventsSourceUrl,
}: AttendanceOverviewChartsProps) {
  /** Map DailyAttendance to the { date, value } shape expected by CalendarHeatmap. */
  const toHeatmapData = (days: DailyAttendance[]) =>
    days.map((d) => ({ date: d.date, value: d.count }))

  const formatHours = (v: number) => `${v}h`

  /** Map MonthlyCount to the { label, events } shape expected by LineChart. */
  const monthLineData = byMonth.map((m) => ({ label: m.label, events: m.value }))

  /** Map WeeklyHours to the { label, hours } shape expected by LineChart. */
  const hoursLineData = hoursPerWeek.map((w) => ({ label: w.label, hours: w.value }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Row 1: days with activity heatmap + hours per week line chart */}
      <ChartCard
        title="Dias com atividade"
        subtitle="Todos os eventos: sessões plenárias, comissões, audiências, seminários e outros"
        sourceUrl={sourceUrl}
      >
        <CalendarHeatmap
          data={toHeatmapData(allByDay)}
          year={year}
          emptyLabel="Sem presença registrada"
          formatValue={(v) => `${v} evento${v !== 1 ? "s" : ""}`}
        />
      </ChartCard>

      {hoursPerWeek.length > 0 ? (
        <ChartCard
          title="Horas de atividade por semana"
          subtitle="Duração dos eventos com horário de início e fim registrados"
          sourceUrl={eventsSourceUrl ?? sourceUrl}
        >
          <LineChart
            data={hoursLineData}
            series={[{ dataKey: "hours", name: "Horas", color: "#4f46e5" }]}
            height={260}
            area
            formatValue={formatHours}
          />
        </ChartCard>
      ) : (
        <ChartCard
          title="Horas de atividade por semana"
          subtitle="Não há dados de duração disponíveis para os eventos deste período"
          sourceUrl={eventsSourceUrl ?? sourceUrl}
        >
          <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
            Sem dados de duração disponíveis
          </div>
        </ChartCard>
      )}

      {/* Row 2: plenary vs non-plenary heatmaps */}
      <ChartCard
        title="Presença em sessões plenárias"
        subtitle="Sessões Deliberativas, Solenes e Preparatórias"
        sourceUrl={sourceUrl}
      >
        <CalendarHeatmap
          data={toHeatmapData(plenaryByDay)}
          year={year}
          emptyLabel="Sem presença registrada"
        />
      </ChartCard>

      <ChartCard
        title="Presença em demais eventos"
        subtitle="Comissões, audiências, seminários e demais eventos"
        sourceUrl={sourceUrl}
      >
        <CalendarHeatmap
          data={toHeatmapData(nonPlenaryByDay)}
          year={year}
          emptyLabel="Sem presença registrada"
        />
      </ChartCard>

      {/* Row 3: event type doughnut + events by month line chart */}
      <ChartCard
        title="Presença por tipo de evento"
        subtitle="Distribuição da presença entre sessões, comissões, audiências e outros"
        sourceUrl={sourceUrl}
      >
        <PieChart
          data={byType.slice(0, 12).map((t) => ({ name: t.name, value: t.count }))}
          height={280}
        />
      </ChartCard>

      {byMonth.some((m) => m.value > 0) ? (
        <ChartCard
          title="Eventos por mês"
          subtitle="Distribuição mensal de todos os eventos com presença registrada"
          sourceUrl={eventsSourceUrl ?? sourceUrl}
        >
          <LineChart
            data={monthLineData}
            series={[{ dataKey: "events", name: "Eventos", color: "#4f46e5" }]}
            height={280}
            area
          />
        </ChartCard>
      ) : null}
    </div>
  )
}
