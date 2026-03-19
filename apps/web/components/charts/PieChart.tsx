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

/** Default color palette — indigo/blue family with enough contrast between slices. */
const PALETTE = [
  "#4f46e5", // indigo-600 (accent)
  "#6366f1", // indigo-500
  "#818cf8", // indigo-400
  "#a5b4fc", // indigo-300
  "#c7d2fe", // indigo-200
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#93c5fd", // blue-300
  "#7c3aed", // violet-600
  "#a78bfa", // violet-400
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
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
          formatter={(value) => [
            formatValue ? formatValue(Number(value)) : Number(value).toLocaleString("pt-BR"),
          ]}
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
