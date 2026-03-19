/**
 * @file StackedBarChart.tsx
 * @description Stacked bar chart showing the breakdown of each category
 * by supplier. Reveals which suppliers dominate which categories —
 * a key transparency insight.
 */

"use client"

import {
  BarChart as RechartsBarChart,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"

export interface StackedBarSeries {
  dataKey: string
  name: string
  color: string
}

interface StackedBarChartProps {
  /** Each object has a `category` key and supplier keys with numeric values. */
  data: Array<Record<string, string | number>>
  /** Key for the category axis. */
  categoryKey: string
  /** Series definitions — one per supplier. */
  series: StackedBarSeries[]
  height?: number
  formatValue?: (value: number) => string
}

export function StackedBarChart({
  data,
  categoryKey,
  series,
  height = 320,
  formatValue,
}: StackedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          width={140}
          tickFormatter={(val: string) =>
            val.length > 20 ? `${val.slice(0, 18)}...` : val
          }
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 12px",
                  maxWidth: 320,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#111827", lineHeight: 1.4, wordWrap: "break-word", overflowWrap: "break-word" }}>
                  {label}
                </p>
                {payload
                  .filter((p) => Number(p.value) > 0)
                  .sort((a, b) => Number(b.value) - Number(a.value))
                  .map((p) => (
                  <p key={p.dataKey as string} style={{ margin: "4px 0 0", fontSize: 12, color: "#4b5563", lineHeight: 1.4, wordWrap: "break-word", overflowWrap: "break-word" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.color, marginRight: 6, verticalAlign: "middle" }} />
                    {p.name}: {formatValue ? formatValue(Number(p.value)) : Number(p.value).toLocaleString("pt-BR")}
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            stackId="stack"
            fill={s.color}
            radius={0}
            maxBarSize={28}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
