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
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 12, fill: "#6b7280" }}
        tickLine={false}
      />
      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
      <Tooltip
        contentStyle={{
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 13,
        }}
        formatter={(value, name) => [
          formatValue ? formatValue(Number(value)) : Number(value).toLocaleString("pt-BR"),
          name,
        ]}
        labelStyle={{ fontWeight: 600, color: "#111827" }}
      />
      <Legend
        verticalAlign="top"
        align="right"
        iconType="line"
        wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
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
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
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
              activeDot={{ r: 4 }}
            />
          )
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
