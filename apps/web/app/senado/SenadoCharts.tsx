/**
 * @file SenadoCharts.tsx
 * @description Chart section for the Federal Senate (Senado) overview page.
 *
 * Receives pre-aggregated data as props (computed server-side in
 * `senado-utils.ts`) and renders chart primitives. All input is derived
 * from real Senado API calls — no mock data.
 *
 * Charts:
 * - Monthly legislative production (area line) — propositions presented
 * - Monthly voting sessions (area line) — `/votacao` aggregated
 * - Attendance by party (bar) — `senado-utils.aggregateAttendanceByParty`
 * - Senators by party (horizontal bar)
 * - Senators by state (horizontal bar)
 * - Propositions by type (pie)
 * - Voting results (pie)
 * - Approval rate by proposition type (horizontal bar)
 */

"use client"

import { ChartCard, BarChart, PieChart, LineChart } from "@/components/charts"
import type { CountItem, MonthlyCount, ApprovalByType } from "./senado-utils"

interface SenadoChartsProps {
  /** Senators grouped by party (sorted by caucus size). */
  byParty: CountItem[]
  /** Senators grouped by state (sorted by seat count). */
  byUF: CountItem[]
  /** Propositions grouped by type code. */
  propositionsByType: CountItem[]
  /** Voting sessions grouped by approval result. */
  votesByResult: CountItem[]
  /** Propositions grouped by month of presentation (12 buckets). */
  propositionsByMonth: MonthlyCount[]
  /** Voting sessions grouped by month (12 buckets). */
  votesByMonth: MonthlyCount[]
  /** Average attendance rate (%) by party. */
  attendanceByParty: CountItem[]
  /** Approval rate by proposition type. */
  approvalByType?: ApprovalByType[]
  /** Source URL for the senators list. */
  senatorsSourceUrl: string
  /** Source URL for the propositions search. */
  propositionsSourceUrl: string
  /** Source URL for the voting sessions endpoint. */
  votesSourceUrl: string
  /** Source URL for the attendance bulk summary. */
  attendanceSourceUrl: string
}

export function SenadoCharts({
  byParty,
  byUF,
  propositionsByType,
  votesByResult,
  propositionsByMonth,
  votesByMonth,
  attendanceByParty,
  approvalByType,
  senatorsSourceUrl,
  propositionsSourceUrl,
  votesSourceUrl,
  attendanceSourceUrl,
}: SenadoChartsProps) {
  // Top 12 parties for chart readability.
  const topParties = byParty.slice(0, 12).map((p) => ({ label: p.name, value: p.value }))
  // Top 15 states.
  const topUFs = byUF.slice(0, 15).map((u) => ({ label: u.name, value: u.value }))

  const attendanceBars = attendanceByParty.map((a) => ({ label: a.name, value: a.value }))

  const monthlyProductions = propositionsByMonth.map((m) => ({
    label: m.label,
    materias: m.value,
  }))

  const monthlyVotes = votesByMonth.map((m) => ({
    label: m.label,
    votacoes: m.value,
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Produção legislativa mensal"
        subtitle="Proposições apresentadas por mês no ano"
        sourceUrl={propositionsSourceUrl}
        action={{ label: "Ver todas", href: "/senado/pautas/lista" }}
      >
        <LineChart
          data={monthlyProductions}
          series={[{ dataKey: "materias", name: "Matérias", color: "#4f46e5" }]}
          area
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Votações por mês"
        subtitle="Sessões de votação realizadas por mês no ano"
        sourceUrl={votesSourceUrl}
        action={{ label: "Ver todas", href: "/senado/pautas/votacoes" }}
      >
        <LineChart
          data={monthlyVotes}
          series={[{ dataKey: "votacoes", name: "Votações", color: "#10b981" }]}
          area
          height={280}
        />
      </ChartCard>

      {attendanceBars.length > 0 && (
        <ChartCard
          title="Presença em plenário por partido"
          subtitle="Taxa média de presença dos senadores em sessões deliberativas (%)"
          sourceUrl={attendanceSourceUrl}
        >
          <BarChart
            data={attendanceBars}
            height={320}
            color="#10b981"
            formatValue={(v) => `${v}%`}
          />
        </ChartCard>
      )}

      <ChartCard
        title="Senadores por partido"
        subtitle="Tamanho das bancadas no Senado"
        sourceUrl={senatorsSourceUrl}
        action={{ label: "Ver todos os partidos", href: "/partidos" }}
      >
        <BarChart
          data={topParties}
          horizontal
          height={320}
          formatValue={(v) => `${v} senadores`}
        />
      </ChartCard>

      <ChartCard
        title="Senadores por estado"
        subtitle="Distribuição de cadeiras por UF (3 por estado)"
        sourceUrl={senatorsSourceUrl}
        action={{ label: "Ver todos os estados", href: "/estados" }}
      >
        <BarChart
          data={topUFs}
          horizontal
          height={320}
          formatValue={(v) => `${v} senadores`}
        />
      </ChartCard>

      <ChartCard
        title="Proposições por tipo"
        subtitle="PL, PEC, MP e demais matérias apresentadas no ano"
        sourceUrl={propositionsSourceUrl}
      >
        <PieChart
          data={propositionsByType}
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Resultado das votações"
        subtitle="Sessões de votação nominal no ano"
        sourceUrl={votesSourceUrl}
      >
        <PieChart
          data={votesByResult}
          height={280}
        />
      </ChartCard>

      {approvalByType && approvalByType.length > 0 && (
        <ChartCard
          title="Aprovação por tipo de matéria"
          subtitle="Taxa de aprovação nas votações nominais por tipo"
          sourceUrl={votesSourceUrl}
        >
          <BarChart
            data={approvalByType.map((a) => ({
              label: `${a.type} (${a.total})`,
              value: a.rate,
            }))}
            horizontal
            height={Math.max(200, approvalByType.length * 40)}
            color="#10b981"
            formatValue={(v) => `${v}%`}
          />
        </ChartCard>
      )}
    </div>
  )
}
