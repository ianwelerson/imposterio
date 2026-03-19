/**
 * @file CalendarHeatmap.tsx
 * @description GitHub-style calendar heatmap showing spending intensity per day.
 *
 * Reveals patterns invisible in monthly aggregates: end-of-month spikes,
 * concentrated payments, vacation periods with zero activity, and days
 * with abnormally high spending. Pure SVG — no external dependencies.
 */

"use client"

import { useState, useMemo } from "react"

export interface DailyExpense {
  date: string
  value: number
}

interface CalendarHeatmapProps {
  data: DailyExpense[]
  year: number
  height?: number
  formatValue?: (value: number) => string
}

/** 5-level color scale from gray (no spend) to deep indigo (max spend). */
const COLORS = [
  "#f3f4f6", // gray-100 — R$0
  "#c7d2fe", // indigo-200
  "#818cf8", // indigo-400
  "#6366f1", // indigo-500
  "#4338ca", // indigo-700
]

const DAY_LABELS = ["", "Seg", "", "Qua", "", "Sex", ""]
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const CELL_SIZE = 13
const CELL_GAP = 2
const CELL_STEP = CELL_SIZE + CELL_GAP
const LEFT_PADDING = 28
const TOP_PADDING = 18

function getColor(value: number, max: number): string {
  if (value === 0 || max === 0) return COLORS[0]
  const ratio = value / max
  if (ratio <= 0.25) return COLORS[1]
  if (ratio <= 0.5) return COLORS[2]
  if (ratio <= 0.75) return COLORS[3]
  return COLORS[4]
}

export function CalendarHeatmap({
  data,
  year,
  formatValue,
}: CalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    date: string
    value: number
    below: boolean
  } | null>(null)

  const { grid, maxValue, weeks, monthPositions } = useMemo(() => {
    // Build a map of date → value
    const valueMap = new Map<string, number>()
    let max = 0
    for (const d of data) {
      const key = d.date.slice(0, 10) // ISO date only
      const current = (valueMap.get(key) ?? 0) + d.value
      valueMap.set(key, current)
      if (current > max) max = current
    }

    // Build grid: iterate every day of the year
    const jan1 = new Date(year, 0, 1)
    const dec31 = new Date(year, 11, 31)
    const startDow = (jan1.getDay() + 6) % 7 // Monday = 0

    const cells: Array<{
      week: number
      dow: number
      date: string
      value: number
    }> = []

    let weekNum = 0
    const mPositions: Array<{ label: string; week: number }> = []
    let lastMonth = -1

    for (
      let d = new Date(jan1);
      d <= dec31;
      d.setDate(d.getDate() + 1)
    ) {
      const iso = d.toISOString().slice(0, 10)
      const dow = (d.getDay() + 6) % 7 // Monday = 0
      const dayOfYear = Math.floor(
        (d.getTime() - jan1.getTime()) / 86400000,
      )
      const w = Math.floor((dayOfYear + startDow) / 7)

      if (d.getMonth() !== lastMonth) {
        mPositions.push({ label: MONTH_LABELS[d.getMonth()], week: w })
        lastMonth = d.getMonth()
      }

      cells.push({
        week: w,
        dow,
        date: iso,
        value: valueMap.get(iso) ?? 0,
      })
      weekNum = Math.max(weekNum, w)
    }

    return { grid: cells, maxValue: max, weeks: weekNum + 1, monthPositions: mPositions }
  }, [data, year])

  const svgWidth = LEFT_PADDING + weeks * CELL_STEP + 4
  const svgHeight = TOP_PADDING + 7 * CELL_STEP + 4

  return (
    <div className="relative overflow-visible">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block w-full"
        style={{ maxHeight: svgHeight }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Heatmap de gastos diários em ${year}`}
      >
        {/* Month labels */}
        {monthPositions.map((m, i) => (
          <text
            key={i}
            x={LEFT_PADDING + m.week * CELL_STEP}
            y={12}
            fontSize={10}
            fill="#9ca3af"
          >
            {m.label}
          </text>
        ))}

        {/* Day-of-week labels */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={TOP_PADDING + i * CELL_STEP + CELL_SIZE / 2 + 1}
              fontSize={10}
              fill="#9ca3af"
              dominantBaseline="central"
            >
              {label}
            </text>
          ) : null,
        )}

        {/* Day cells */}
        {grid.map((cell) => (
          <rect
            key={cell.date}
            x={LEFT_PADDING + cell.week * CELL_STEP}
            y={TOP_PADDING + cell.dow * CELL_STEP}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            fill={getColor(cell.value, maxValue)}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect()
              const parent = (e.target as SVGRectElement).closest(".relative")?.getBoundingClientRect()
              if (parent) {
                const relTop = rect.top - parent.top
                // Show tooltip below when near the top to avoid clipping
                const showBelow = relTop < 50
                setTooltip({
                  x: rect.left - parent.left + rect.width / 2,
                  y: showBelow
                    ? rect.bottom - parent.top + 8
                    : rect.top - parent.top - 8,
                  date: cell.date,
                  value: cell.value,
                  below: showBelow,
                })
              }
            }}
            onMouseLeave={() => setTooltip(null)}
            className="cursor-pointer transition-opacity hover:opacity-80"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-gray-400">
        <span>Menos</span>
        {COLORS.map((c, i) => (
          <div
            key={i}
            className="h-[10px] w-[10px] rounded-sm"
            style={{ background: c }}
          />
        ))}
        <span>Mais</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2
                     rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md
                     ${tooltip.below ? "translate-y-0" : "-translate-y-full"}`}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-gray-900">
            {new Date(tooltip.date + "T12:00:00").toLocaleDateString("pt-BR")}
          </p>
          <p className="text-gray-600">
            {tooltip.value === 0
              ? "Sem gastos"
              : formatValue
                ? formatValue(tooltip.value)
                : tooltip.value.toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  )
}
