/**
 * @file TreemapChart.tsx
 * @description Reusable treemap chart for showing proportional data.
 *
 * Better than a pie/donut chart when there are many categories with
 * very different magnitudes — the area of each rectangle makes the
 * proportion immediately obvious.
 */

"use client"

import { Treemap, ResponsiveContainer, Tooltip } from "recharts"

export interface TreemapItem {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

interface TreemapChartProps {
  data: TreemapItem[]
  height?: number
  formatValue?: (value: number) => string
}

const PALETTE = [
  "#4f46e5", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
  "#14b8a6", "#6366f1", "#84cc16", "#a855f7",
]

/** Custom content renderer for each treemap rectangle. */
function TreemapContent(props: {
  x: number
  y: number
  width: number
  height: number
  index: number
  name: string
  value: number
  formatValue?: (v: number) => string
}) {
  const { x, y, width, height, index, name, value, formatValue } = props
  const color = PALETTE[index % PALETTE.length]
  const showLabel = width > 60 && height > 40
  const showValue = width > 80 && height > 55

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={color}
        fillOpacity={0.85}
        stroke="#fff"
        strokeWidth={2}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showValue ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize={11}
          fontWeight={600}
        >
          {name.length > width / 7 ? `${name.slice(0, Math.floor(width / 7))}...` : name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.85)"
          fontSize={10}
        >
          {formatValue ? formatValue(value) : value.toLocaleString("pt-BR")}
        </text>
      )}
    </g>
  )
}

export function TreemapChart({ data, height = 320, formatValue }: TreemapChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={data}
        dataKey="value"
        nameKey="name"
        content={<TreemapContent formatValue={formatValue} x={0} y={0} width={0} height={0} index={0} name="" value={0} />}
      >
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as TreemapItem & { value: number }
            return (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "8px 12px",
                  maxWidth: 280,
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0f172a", lineHeight: 1.4, wordWrap: "break-word" }}>
                  {item.name}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
                  {formatValue ? formatValue(item.value) : item.value.toLocaleString("pt-BR")}
                </p>
              </div>
            )
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}
