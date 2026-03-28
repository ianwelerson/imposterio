/**
 * @file TopDeputiesTable.tsx
 * @description Client component showing top deputies ranked by a selectable metric.
 *
 * Supports two metrics: CEAP spending total and attendance rate.
 * Renders a dropdown selector and a compact table of the top 8 deputies.
 */

"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { AvatarInitials } from "@/components/ui"

/** Deputy data enriched with metric values. */
export interface TopDeputy {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
  ceapTotal?: number
  attendanceRate?: number
}

type Metric = "ceap" | "attendance"

interface TopDeputiesTableProps {
  /** All deputies with enriched data. */
  deputies: TopDeputy[]
  /** Year for building links to deputy detail pages. */
  year: number
}

const METRICS: Array<{ key: Metric; label: string; format: (v: number) => string; sortDir: "desc" | "asc" }> = [
  {
    key: "ceap",
    label: "Maior gasto CEAP",
    format: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    sortDir: "desc",
  },
  {
    key: "attendance",
    label: "Maior presença",
    format: (v) => `${v}%`,
    sortDir: "desc",
  },
]

export function TopDeputiesTable({ deputies, year }: TopDeputiesTableProps) {
  const [metric, setMetric] = useState<Metric>("ceap")

  const metricConfig = METRICS.find((m) => m.key === metric)!

  const ranked = useMemo(() => {
    const withValue = deputies
      .map((d) => ({
        ...d,
        metricValue: metric === "ceap" ? (d.ceapTotal ?? 0) : (d.attendanceRate ?? 0),
      }))
      .filter((d) => d.metricValue > 0)

    withValue.sort((a, b) =>
      metricConfig.sortDir === "desc"
        ? b.metricValue - a.metricValue
        : a.metricValue - b.metricValue,
    )

    return withValue.slice(0, 8)
  }, [deputies, metric, metricConfig.sortDir])

  return (
    <div>
      {/* Metric selector */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Ordenar por:</label>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-xs focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Compact ranked table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Deputado(a)</th>
              <th className="px-4 py-2.5 font-medium">Partido</th>
              <th className="px-4 py-2.5 font-medium text-right">{metricConfig.label}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((d, i) => (
              <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                <td className="px-4 py-2 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link href={`/camara/${d.id}?ano=${year}`} prefetch={false} className="flex items-center gap-2 hover:opacity-80">
                    {d.photoUrl ? (
                      <Image
                        src={d.photoUrl}
                        alt={d.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 shrink-0 rounded-full bg-gray-100 object-cover"
                        unoptimized
                      />
                    ) : (
                      <AvatarInitials
                        initials={d.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        size="sm"
                      />
                    )}
                    <span className="font-medium text-gray-900">{d.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{d.party}-{d.uf}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-900 font-medium">
                  {metricConfig.format(d.metricValue)}
                </td>
              </tr>
            ))}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Dados não disponíveis para esta métrica.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
