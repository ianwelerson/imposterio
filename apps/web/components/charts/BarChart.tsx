/**
 * @file BarChart.tsx
 * @description Reusable bar chart component built on Recharts.
 *
 * Renders a responsive horizontal or vertical bar chart with consistent
 * styling that matches the Imposterio design language (indigo accent,
 * subtle grid, readable labels). Supports single or grouped bars.
 */

"use client"

import {
  BarChart as RechartsBarChart,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts"

/** A single data point for the bar chart. */
export interface BarChartItem {
  /** Label displayed on the category axis. */
  label: string
  /** Numeric value for the bar height/width. */
  value: number
  /** Optional custom color override for this bar. */
  color?: string
}

interface BarChartProps {
  /** Array of data points to render as bars. */
  data: BarChartItem[]
  /**
   * Whether to render horizontal bars (category on Y axis).
   * Useful when labels are long (e.g. agency names).
   * @default false
   */
  horizontal?: boolean
  /** Height of the chart in pixels. @default 300 */
  height?: number
  /** Value axis label (e.g. "R$ milhões", "Quantidade"). */
  valueLabel?: string
  /** Bar color when no per-item color is set. @default "#4f46e5" (accent) */
  color?: string
  /** Format function for tooltip values. */
  formatValue?: (value: number) => string
}

const DEFAULT_COLOR = "#4f46e5"

/**
 * Renders a responsive bar chart with Imposterio styling.
 *
 * @param data        - Data points with label + value
 * @param horizontal  - Flip axes for horizontal bars
 * @param height      - Chart height in px
 * @param valueLabel  - Label for the value axis
 * @param color       - Default bar fill color
 * @param formatValue - Custom tooltip value formatter
 */
export function BarChart({
  data,
  horizontal = false,
  height = 300,
  color = DEFAULT_COLOR,
  formatValue,
}: BarChartProps) {
  const layout = horizontal ? "vertical" : "horizontal"

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: 12, bottom: 4, left: horizontal ? 8 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              width={120}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
          </>
        )}

        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
          formatter={(value) => [
            formatValue ? formatValue(Number(value)) : Number(value).toLocaleString("pt-BR"),
            "",
          ]}
          labelStyle={{ fontWeight: 600, color: "#111827" }}
        />

        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((item, i) => (
            <Cell key={i} fill={item.color ?? color} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
