/**
 * @file LineChart.tsx
 * @description Reusable line/area chart component built on Recharts.
 *
 * Renders a responsive line chart with optional area fill, supporting
 * multiple series. Matches Imposterio design language with indigo accent
 * and subtle styling.
 */

"use client"

import {
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"

/** Definition of a single data series. */
export interface LineSeries {
  /** Key in each data object for this series' value. */
  dataKey: string
  /** Display name shown in tooltip. */
  name: string
  /** Line color. @default "#4f46e5" */
  color?: string
}

interface LineChartProps {
  /** Array of data objects. Each object must have a `label` key and values for each series. */
  data: Record<string, unknown>[]
  /** One or more data series to plot. */
  series: LineSeries[]
  /** Height of the chart in pixels. @default 300 */
  height?: number
  /** Whether to fill the area below the lines. @default false */
  area?: boolean
  /** Format function for tooltip values. */
  formatValue?: (value: number) => string
}

/**
 * Renders a responsive line chart with optional area fill.
 *
 * @param data        - Array of data points, each with a `label` and series values
 * @param series      - Series definitions (dataKey, name, color)
 * @param height      - Chart height in px
 * @param area        - Fill area below lines
 * @param formatValue - Custom tooltip formatter
 */
export function LineChart({
  data,
  series,
  height = 300,
  area = false,
  formatValue,
}: LineChartProps) {
  const sharedProps = {
    data,
    margin: { top: 4, right: 12, bottom: 4, left: 0 },
  }

  const sharedChildren = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 12, fill: "#64748b" }}
        tickLine={false}
        axisLine={{ stroke: "#e2e8f0" }}
      />
      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
      <Tooltip
        contentStyle={{
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          fontSize: 13,
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
        }}
        formatter={(value, name) => [
          formatValue ? formatValue(Number(value)) : Number(value).toLocaleString("pt-BR"),
          name,
        ]}
        labelStyle={{ fontWeight: 600, color: "#0f172a" }}
      />
      <Legend
        verticalAlign="top"
        align="right"
        iconType="line"
        wrapperStyle={{ fontSize: 12, paddingBottom: 8, color: "#64748b" }}
      />
    </>
  )

  // Recharts Area components only work inside AreaChart, not LineChart.
  // We conditionally use the correct parent chart type.
  if (area) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart {...sharedProps}>
          {sharedChildren}
          {series.map((s) => {
            const color = s.color ?? "#4f46e5"
            return (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={color}
                fill={color}
                fillOpacity={0.08}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart {...sharedProps}>
        {sharedChildren}
        {series.map((s) => {
          const color = s.color ?? "#4f46e5"
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          )
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
