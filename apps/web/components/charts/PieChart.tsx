/**
 * @file PieChart.tsx
 * @description Reusable donut/pie chart component built on Recharts.
 *
 * Renders a responsive donut chart (or full pie) with labels and tooltips.
 * Color palette is derived from the Imposterio accent color with
 * varying saturation/lightness for each slice.
 */

"use client"

import {
  PieChart as RechartsPieChart,
  Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

/** A single slice in the pie chart. */
export interface PieChartItem {
  /** Slice label. */
  name: string
  /** Numeric value determining slice size. */
  value: number
  /** Optional custom color for this slice. */
  color?: string
}

interface PieChartProps {
  /** Array of slices to render. */
  data: PieChartItem[]
  /** Height of the chart in pixels. @default 300 */
  height?: number
  /**
   * Inner radius as a percentage string to create a donut chart.
   * Set to "0%" for a full pie.
   * @default "55%"
   */
  innerRadius?: string
  /** Format function for tooltip values. */
  formatValue?: (value: number) => string
}

/** Color palette with high contrast between adjacent slices. */
const PALETTE = [
  "#4f46e5", // indigo-600
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#84cc16", // lime-500
  "#a855f7", // purple-500
]

/**
 * Renders a responsive donut chart with legend and tooltips.
 *
 * @param data        - Slices with name + value
 * @param height      - Chart height in px
 * @param innerRadius - Donut hole size (percentage string)
 * @param formatValue - Custom tooltip formatter
 */
export function PieChart({
  data,
  height = 300,
  innerRadius = "55%",
  formatValue,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((item, i) => (
            <Cell key={i} fill={item.color ?? PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const entry = payload[0]
            const val = Number(entry.value)
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 12px",
                  maxWidth: 280,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#111827",
                  wordWrap: "break-word",
                  lineHeight: 1.4,
                }}>
                  {entry.name}
                </p>
                <p style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#4b5563",
                }}>
                  {formatValue ? formatValue(val) : val.toLocaleString("pt-BR")}
                </p>
              </div>
            )
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#6b7280" }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
