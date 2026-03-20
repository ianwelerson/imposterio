/**
 * @file DeputyOverviewCharts.tsx
 * @description Client chart components for the deputy detail page non-expense
 * sections: speeches, events, and committees.
 *
 * Each export is a self-contained chart group that can be placed independently
 * inside server-rendered sections on the detail page.
 */

"use client"

import { ChartCard, PieChart, BarChart } from "@/components/charts"
import type { CountItem, MonthlyCount } from "./activity-utils"

// ── Speeches ──────────────────────────────────────────────────────────

interface SpeechChartsProps {
  byType: CountItem[]
  byMonth: MonthlyCount[]
  year: number
  sourceUrl?: string
}

export function SpeechCharts({ byType, byMonth, year, sourceUrl }: SpeechChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {byType.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Discursos por tipo"
          subtitle="Distribuição dos pronunciamentos por categoria"
        >
          <PieChart data={byType} height={280} />
        </ChartCard>
      )}

      {byMonth.some((m) => m.value > 0) && (
        <ChartCard
          sourceUrl={sourceUrl}
          title={`Discursos por mês (${year})`}
          subtitle="Volume de pronunciamentos ao longo do ano"
        >
          <BarChart data={byMonth} height={280} />
        </ChartCard>
      )}
    </div>
  )
}

// ── Events ────────────────────────────────────────────────────────────

interface EventChartsProps {
  byType: CountItem[]
  byMonth: MonthlyCount[]
  year: number
  sourceUrl?: string
}

export function EventCharts({ byType, byMonth, year, sourceUrl }: EventChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {byType.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Eventos por tipo"
          subtitle="Sessões plenárias, audiências, reuniões e outros"
        >
          <PieChart data={byType} height={280} />
        </ChartCard>
      )}

      {byMonth.some((m) => m.value > 0) && (
        <ChartCard
          sourceUrl={sourceUrl}
          title={`Eventos por mês (${year})`}
          subtitle="Participação em eventos ao longo do ano"
        >
          <BarChart data={byMonth} height={280} />
        </ChartCard>
      )}
    </div>
  )
}

// ── Voting history ───────────────────────────────────────────────────

interface VotingChartsProps {
  byType: CountItem[]
  byMonth: MonthlyCount[]
  year: number
  sourceUrl?: string
}

export function VotingCharts({ byType, byMonth, year, sourceUrl }: VotingChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {byType.length > 0 && (
        <ChartCard
          sourceUrl={sourceUrl}
          title="Votos por tipo"
          subtitle="Distribuição de Sim, Não, Abstenção e Obstrução"
        >
          <PieChart data={byType} height={280} />
        </ChartCard>
      )}

      {byMonth.some((m) => m.value > 0) && (
        <ChartCard
          sourceUrl={sourceUrl}
          title={`Votações por mês (${year})`}
          subtitle="Participação em votações nominais ao longo do ano"
        >
          <BarChart data={byMonth} height={280} />
        </ChartCard>
      )}
    </div>
  )
}

// ── Committees ────────────────────────────────────────────────────────

interface CommitteeChartsProps {
  byRole: CountItem[]
  byType: CountItem[]
  sourceUrl?: string
}

export function CommitteeCharts({ byRole, byType, sourceUrl }: CommitteeChartsProps) {
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
