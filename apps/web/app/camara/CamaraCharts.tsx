/**
 * @file CamaraCharts.tsx
 * @description Chart section for the Chamber of Deputies (Câmara) overview page.
 *
 * Receives pre-aggregated data as props (computed server-side) and renders
 * chart primitives. All data comes from real API calls.
 *
 * Charts:
 * - Deputies by party (horizontal bar) — from GET /deputados
 * - Deputies by state (horizontal bar) — from GET /deputados
 * - Monthly legislative production (area line) — from GET /proposicoes
 * - Monthly voting sessions (area line) — from GET /votacoes
 * - Attendance by party (bar) — from bulk attendance file
 * - Propositions by type (pie) — from GET /proposicoes
 * - Voting results (pie) — from GET /votacoes
 */

"use client"

import { ChartCard, BarChart, PieChart, LineChart } from "@/components/charts"
import type { CountItem, MonthlyCount, ApprovalByType } from "./camara-utils"

interface CamaraChartsProps {
  /** Deputies grouped by party (sorted by caucus size). */
  byParty: CountItem[]
  /** Deputies grouped by state (sorted by seat count). */
  byUF: CountItem[]
  /** Propositions grouped by type code. */
  propositionsByType: CountItem[]
  /** Voting sessions grouped by result (approved/rejected/inconclusive). */
  votesByResult: CountItem[]
  /** Propositions grouped by month of presentation. */
  propositionsByMonth: MonthlyCount[]
  /** Voting sessions grouped by month. */
  votesByMonth: MonthlyCount[]
  /** Average attendance rate (%) by party. */
  attendanceByParty: CountItem[]
  /** Source URL for deputy data. */
  deputiesSourceUrl: string
  /** Source URL for propositions data. */
  propositionsSourceUrl: string
  /** Source URL for voting sessions data. */
  votesSourceUrl: string
  /** Source URL for attendance data. */
  attendanceSourceUrl: string
  /** Approval rate by proposition type. */
  approvalByType?: ApprovalByType[]
}

export function CamaraCharts({
  byParty,
  byUF,
  propositionsByType,
  votesByResult,
  propositionsByMonth,
  votesByMonth,
  attendanceByParty,
  deputiesSourceUrl,
  propositionsSourceUrl,
  votesSourceUrl,
  attendanceSourceUrl,
  approvalByType,
}: CamaraChartsProps) {
  // Top 12 parties for readability
  const topParties = byParty.slice(0, 12).map((p) => ({
    label: p.name,
    value: p.value,
  }))

  // Top 15 states
  const topUFs = byUF.slice(0, 15).map((u) => ({
    label: u.name,
    value: u.value,
  }))

  // Attendance formatted for BarChart
  const attendanceBars = attendanceByParty.map((a) => ({
    label: a.name,
    value: a.value,
  }))

  // Monthly data formatted for LineChart (needs { label, proposicoes/votacoes } keys)
  const monthlyProductions = propositionsByMonth.map((m) => ({
    label: m.label,
    proposicoes: m.value,
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
        action={{ label: "Ver todas", href: "/camara/pautas/lista" }}
      >
        <LineChart
          data={monthlyProductions}
          series={[{ dataKey: "proposicoes", name: "Proposições", color: "#4f46e5" }]}
          area
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Votações por mês"
        subtitle="Sessões de votação realizadas por mês no ano"
        sourceUrl={votesSourceUrl}
        action={{ label: "Ver todas", href: "/camara/pautas/votacoes" }}
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
          title="Presença em eventos por partido"
          subtitle="Taxa média de presença dos deputados em eventos da Câmara (%)"
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
        title="Deputados por partido"
        subtitle="Tamanho das bancadas na Câmara"
        sourceUrl={deputiesSourceUrl}
        action={{ label: "Ver todos os partidos", href: "/partidos" }}
      >
        <BarChart
          data={topParties}
          horizontal
          height={320}
          formatValue={(v) => `${v} deputados`}
        />
      </ChartCard>

      <ChartCard
        title="Deputados por estado"
        subtitle="Distribuição de cadeiras por UF"
        sourceUrl={deputiesSourceUrl}
        action={{ label: "Ver todos os estados", href: "/estados" }}
      >
        <BarChart
          data={topUFs}
          horizontal
          height={320}
          formatValue={(v) => `${v} deputados`}
        />
      </ChartCard>

      <ChartCard
        title="Proposições por tipo"
        subtitle="PL, PEC, PLP, MP e PDL apresentados no ano"
        sourceUrl={propositionsSourceUrl}
      >
        <PieChart
          data={propositionsByType}
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Resultado das votações"
        subtitle="Votações nominais em plenário no ano"
        sourceUrl={votesSourceUrl}
      >
        <PieChart
          data={votesByResult}
          height={280}
        />
      </ChartCard>

      {approvalByType && approvalByType.length > 0 && (
        <ChartCard
          title="Aprovação por tipo de proposição"
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
