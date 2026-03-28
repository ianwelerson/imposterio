/**
 * @file DeputyOverviewCharts.tsx
 * @description Client chart components for the deputy detail page non-expense
 * sections: speeches, voting, and committees.
 *
 * Chart type selection:
 * - Votações: horizontal stacked bar (proportions of Sim/Não/Abstenção/Obstrução)
 * - Comissões: grouped table (replaces two donut charts)
 * - Discursos: bar chart when < 4 types, donut when ≥ 5 types
 */

"use client"

import { useState } from "react"
import { ChartCard, PieChart, BarChart } from "@/components/charts"
import { Badge } from "@/components/ui"
import type { CountItem, MonthlyCount } from "./activity-utils"

// ── Vote type colors ────────────────────────────────────────────────

const VOTE_COLORS: Record<string, string> = {
  Sim: "#22c55e",
  "Não": "#ef4444",
  "Abstenção": "#f59e0b",
  "Obstrução": "#6b7280",
  Artigo17: "#8b5cf6",
}

// ── Speeches ──────────────────────────────────────────────────────────

interface SpeechChartsProps {
  byType: CountItem[]
  byMonth: MonthlyCount[]
  year: number
  sourceUrl?: string
}

export function SpeechCharts({ byType, byMonth, year, sourceUrl }: SpeechChartsProps) {
  const useBarForType = byType.length > 0 && byType.length < 5

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {byType.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Discursos por tipo"
          subtitle="Distribuição dos pronunciamentos por categoria"
        >
          {useBarForType ? (
            <BarChart
              data={byType.map((t) => ({ label: t.name, value: t.value }))}
              horizontal
              height={200}
            />
          ) : (
            <PieChart data={byType} height={280} />
          )}
        </ChartCard>
      )}

      {byMonth.some((m) => m.value > 0) && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Discursos por mês"
          subtitle="Volume de pronunciamentos ao longo do ano"
        >
          <BarChart data={byMonth} height={280} />
        </ChartCard>
      )}
    </div>
  )
}

// ── Voting history ───────────────────────────────────────────────────

type VotingRange = "year" | "24m"

interface VotingChartsProps {
  byType: CountItem[]
  byMonth: MonthlyCount[]
  year: number
  sourceUrl?: string
  /** Prior year month data — enables the "Últimos 24 meses" toggle. */
  priorYearByMonth?: MonthlyCount[]
  priorYear?: number
}

export function VotingCharts({
  byType,
  byMonth,
  year,
  sourceUrl,
  priorYearByMonth,
  priorYear,
}: VotingChartsProps) {
  const total = byType.reduce((s, t) => s + t.value, 0)
  const hasPriorYear = priorYearByMonth && priorYearByMonth.length > 0
  const [range, setRange] = useState<VotingRange>(hasPriorYear ? "24m" : "year")

  // Build the 24-month combined dataset
  const combinedMonths: MonthlyCount[] = hasPriorYear && range === "24m"
    ? [
        ...priorYearByMonth!.map((m) => ({ ...m, label: `${m.label}/${String(priorYear).slice(2)}` })),
        ...byMonth.map((m) => ({ ...m, label: `${m.label}/${String(year).slice(2)}` })),
      ]
    : byMonth

  const hasAnyVotes = total > 0 || byMonth.some((m) => m.value > 0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {total > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Votos por tipo"
          subtitle="Proporção de Sim, Não, Abstenção e Obstrução"
        >
          {/* Horizontal stacked bar — single row */}
          <div className="space-y-3">
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {byType.map((item) => {
                const pct = (item.value / total) * 100
                if (pct === 0) return null
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-center text-[11px] font-semibold text-white transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: VOTE_COLORS[item.name] ?? "#94a3b8",
                      minWidth: pct > 3 ? undefined : 4,
                    }}
                    title={`${item.name}: ${item.value} (${pct.toFixed(1)}%)`}
                  >
                    {pct >= 10 ? `${pct.toFixed(0)}%` : ""}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {byType.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: VOTE_COLORS[item.name] ?? "#94a3b8" }}
                  />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      )}

      <ChartCard
        sourceUrl={sourceUrl}
        title="Votações por mês"
        subtitle={range === "24m" ? `${priorYear}–${year}` : String(year)}
      >
        {hasAnyVotes ? (
          <div>
            {hasPriorYear && (
              <div className="mb-3 flex gap-1">
                <button
                  type="button"
                  onClick={() => setRange("year")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === "year"
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  Este ano
                </button>
                <button
                  type="button"
                  onClick={() => setRange("24m")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === "24m"
                      ? "bg-accent text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  Últimos 24 meses
                </button>
              </div>
            )}
            <BarChart data={combinedMonths} height={280} />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-gray-400">
              Nenhuma votação nominal registrada para este deputado no período selecionado.
            </p>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

// ── Committees ────────────────────────────────────────────────────────

interface CommitteeChartsProps {
  byRole: CountItem[]
  byType: CountItem[]
  sourceUrl?: string
  /** Full committee list for the table view. */
  committees?: Array<{
    name: string
    abbreviation: string
    role: string
    type: string
  }>
}

export function CommitteeCharts({ byRole, byType, sourceUrl, committees }: CommitteeChartsProps) {
  // Prefer the table view when committee data is available
  if (committees && committees.length > 0) {
    return (
      <ChartCard
        sourceUrl={sourceUrl}
        title="Comissões ativas"
        subtitle="Participação por função e tipo de órgão"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                <th className="pb-2 pr-4">Sigla</th>
                <th className="pb-2 pr-4">Nome</th>
                <th className="pb-2 pr-4">Função</th>
                <th className="pb-2">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {committees.map((c) => (
                <tr key={`${c.abbreviation}-${c.role}`} className="text-gray-700">
                  <td className="whitespace-nowrap py-2 pr-4 font-medium">{c.abbreviation}</td>
                  <td className="py-2 pr-4 max-w-xs truncate" title={c.name}>{c.name}</td>
                  <td className="whitespace-nowrap py-2 pr-4">
                    <Badge variant={c.role === "Titular" ? "green" : "gray"}>{c.role}</Badge>
                  </td>
                  <td className="whitespace-nowrap py-2 text-xs text-gray-500">{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    )
  }

  // Fallback to donut charts if committee detail is not available
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {byRole.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Comissões por função"
          subtitle="Titular, suplente, presidente e outras funções"
        >
          <PieChart data={byRole} height={280} />
        </ChartCard>
      )}

      {byType.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Comissões por tipo"
          subtitle="Permanentes, especiais, CPIs e outros órgãos"
        >
          <PieChart data={byType} height={280} />
        </ChartCard>
      )}
    </div>
  )
}
