/**
 * @file AttendanceOverviewCharts.tsx
 * @description Client component for the unified Presença section on the deputy detail page.
 *
 * Renders:
 * 1. Toggleable CalendarHeatmap (all / plenary / non-plenary) + LineChart for hours per week
 * 2. PieChart (doughnut) for event type distribution + LineChart for events by month
 *
 * All chart data is pre-aggregated server-side in attendance-utils.ts and activity-utils.ts.
 */

"use client"

import { useState } from "react"
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
  /** Set of ISO date strings marking parliamentary recess days (for heatmap annotation). */
  recessDays?: Set<string>
}

type HeatmapView = "all" | "plenary" | "nonPlenary"

const HEATMAP_VIEWS: Array<{ key: HeatmapView; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "plenary", label: "Plenárias" },
  { key: "nonPlenary", label: "Demais" },
]

const HEATMAP_SUBTITLES: Record<HeatmapView, string> = {
  all: "Todos os eventos: sessões plenárias, comissões, audiências, seminários e outros",
  plenary: "Sessões Deliberativas, Solenes e Preparatórias",
  nonPlenary: "Comissões, audiências, seminários e demais eventos",
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
  recessDays,
}: AttendanceOverviewChartsProps) {
  const [heatmapView, setHeatmapView] = useState<HeatmapView>("all")

  /** Map DailyAttendance to the { date, value } shape expected by CalendarHeatmap. */
  const toHeatmapData = (days: DailyAttendance[]) =>
    days.map((d) => ({ date: d.date, value: d.count }))

  const formatHours = (v: number) => `${v}h`

  /** Map MonthlyCount to the { label, events } shape expected by LineChart. */
  const monthLineData = byMonth.map((m) => ({ label: m.label, events: m.value }))

  /** Map WeeklyHours to the { label, hours } shape expected by LineChart. */
  const hoursLineData = hoursPerWeek.map((w) => ({ label: w.label, hours: w.value }))

  /** Active heatmap data based on current toggle selection. */
  const activeHeatmapData =
    heatmapView === "plenary"
      ? toHeatmapData(plenaryByDay)
      : heatmapView === "nonPlenary"
        ? toHeatmapData(nonPlenaryByDay)
        : toHeatmapData(allByDay)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Row 1: toggleable heatmap + hours per week line chart */}
      <ChartCard
        title="Dias com atividade"
        subtitle={HEATMAP_SUBTITLES[heatmapView]}
        sourceUrl={sourceUrl}
      >
        {/* Segmented toggle */}
        <div className="mb-3 inline-flex rounded-lg bg-gray-100 p-0.5">
          {HEATMAP_VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setHeatmapView(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                heatmapView === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <CalendarHeatmap
          data={activeHeatmapData}
          year={year}
          emptyLabel="Sem presença registrada"
          formatValue={(v) => `${v} evento${v !== 1 ? "s" : ""}`}
          recessDays={recessDays}
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

      {/* Row 2: event type doughnut + events by month line chart */}
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
