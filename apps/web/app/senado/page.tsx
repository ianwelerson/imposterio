/**
 * @file page.tsx
 * @description Federal Senate (Senado Federal) overview page.
 *
 * Server component that mirrors the Câmara overview pattern:
 *
 * 1. Hero header with year selector
 * 2. Resumo geral — StatCards (senators, propositions, voting sessions, attendance)
 * 3. Charts — party/UF distribution, propositions by type, voting results,
 *    monthly production, attendance by party, approval by type
 * 4. Top senators table (CEAPS or attendance)
 * 5. Quick links to subsections
 * 6. Latest propositions and voting sessions
 * 7. Game card
 *
 * Data sources (real, cached via `cachedFetch`):
 * - GET /senador/lista/atual.json → senators list
 * - GET /processo?ano={year} → propositions
 * - GET /votacao?dataInicio=YYYY0101&dataFim=YYYY1231 → voting sessions
 * - GET /plenario/resultado/mes/{YYYYMM} ×12 → bulk attendance
 * - CEAPS admin bulk file → bulk per-senator spending
 */

import Link from "next/link"
import {
  StatCard,
  DataTable,
  SectionHeader,
  Badge,
  ToastTrigger,
  DataFetchError,
} from "@/components/ui"
import { SenadoGameCard } from "./SenadoGameCard"
import { SenadoCharts } from "./SenadoCharts"
import { TopSenatorsTable, type TopSenator } from "./TopSenatorsTable"
import {
  getSenatorsList,
  getSenadoPropositions,
  getSenadoVotingSessions,
  getSenatorAttendanceBulk,
  getCeapsBulkSummary,
  getSenadoAgendaMonth,
} from "@imposterio/fetchers"
import type {
  Proposition,
  SenadoVotingSession,
  SenatorCeapsBulkSummary,
  SenatorAttendanceBulkSummary,
  SenadoAgendaItem,
} from "@imposterio/types"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import {
  aggregateSenatorsByParty,
  aggregateSenatorsByUF,
  aggregatePropositionsByType,
  aggregateVotesByResult,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateAttendanceByParty,
  aggregateApprovalByType,
} from "./senado-utils"

/** Senado open data has reliable proposition/voting coverage from 2023 onward. */
const FIRST_YEAR = new Date().getFullYear() - 2

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function SenadoPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_YEAR + 1 },
    (_, i) => now - i,
  )

  const errors: PageError[] = []
  const failed = new Set<string>()

  // Forward-looking agenda panel: fetch the current month so visitors see
  // upcoming sessions on the home dashboard. Only shown for the current year.
  const now2 = new Date()
  const yyyymm = `${now2.getFullYear()}${String(now2.getMonth() + 1).padStart(2, "0")}`
  const showAgenda = selectedYear === now

  const [senators, propositions, votingSessions, attendance, ceapsBulk, agenda] = await Promise.all([
    collectErrors(
      () => getSenatorsList(),
      emptySourced([]),
      errors,
      "Senadores",
      failed,
    ),
    collectErrors(
      () => getSenadoPropositions({ ano: selectedYear }),
      emptySourced<Proposition[]>([]),
      errors,
      "Proposições",
      failed,
    ),
    collectErrors(
      () =>
        getSenadoVotingSessions(
          `${selectedYear}0101`,
          `${selectedYear}1231`,
        ),
      emptySourced<SenadoVotingSession[]>([]),
      errors,
      "Votações",
      failed,
    ),
    collectErrors(
      () => getSenatorAttendanceBulk(selectedYear),
      emptySourced<SenatorAttendanceBulkSummary>({
        year: selectedYear,
        totalSessions: 0,
        totalDeliberative: 0,
        senators: [],
      }),
      errors,
      "Presença em plenário",
      failed,
    ),
    collectErrors(
      () => getCeapsBulkSummary(selectedYear),
      emptySourced<SenatorCeapsBulkSummary>({
        year: selectedYear,
        totalSpending: 0,
        expenseCount: 0,
        senators: [],
      }),
      errors,
      "Gastos CEAPS",
      failed,
    ),
    showAgenda
      ? collectErrors(
          () => getSenadoAgendaMonth(yyyymm),
          emptySourced<SenadoAgendaItem[]>([]),
          errors,
          "Agenda do mês",
          failed,
        )
      : Promise.resolve(emptySourced<SenadoAgendaItem[]>([])),
  ])

  // Filter to upcoming items only and cap at 5.
  const todayKey = now2.toISOString().slice(0, 10)
  const upcomingAgenda = agenda
    .filter((a) => a.date.slice(0, 10) >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // ── Aggregations ──────────────────────────────────────────────────

  const byParty = aggregateSenatorsByParty(senators)
  const byUF = aggregateSenatorsByUF(senators)
  const propositionsByType = aggregatePropositionsByType(propositions)
  const votesByResult = aggregateVotesByResult(votingSessions)
  const propositionsByMonth = aggregatePropositionsByMonth(propositions)
  const votesByMonth = aggregateVotingSessionsByMonth(votingSessions)
  const attendanceByParty = aggregateAttendanceByParty(attendance, senators)
  const approvalByType = aggregateApprovalByType(votingSessions)

  const totalVotes = votingSessions.length
  const approvedVotes = votingSessions.filter((v) => v.approved === true).length
  const approvalRate = totalVotes > 0
    ? ((approvedVotes / totalVotes) * 100).toFixed(1)
    : "0"

  const largestParty = byParty[0]

  // Average attendance across all senators with a recorded percentage.
  const attendingPcts = attendance.senators.map((s) => s.percentage).filter((n) => n > 0)
  const avgAttendance =
    attendingPcts.length > 0
      ? Math.round(attendingPcts.reduce((a, b) => a + b, 0) / attendingPcts.length)
      : null

  // Build CEAPS and attendance lookup maps for the enriched ranking table.
  // Senado uses the senator code as a stable join key in both feeds.
  const ceapsBySenator = new Map(ceapsBulk.senators.map((s) => [s.senatorId, s.total]))
  const attendanceBySenator = new Map(attendance.senators.map((s) => [s.senatorId, s.percentage]))

  const enrichedSenators: TopSenator[] = senators.map((s) => ({
    id: s.id,
    name: s.name,
    party: s.party,
    uf: s.uf,
    photoUrl: s.photoUrl,
    ceapsTotal: ceapsBySenator.get(s.id),
    attendanceRate: attendanceBySenator.get(s.id),
  }))

  // Latest 5 propositions (by lastUpdate).
  const latestPropositions = [...propositions]
    .sort((a, b) => (b.lastUpdate || "").localeCompare(a.lastUpdate || ""))
    .slice(0, 5)

  // Latest 5 voting sessions (by date).
  const latestVotes = [...votingSessions]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5)

  // ── Column definitions ────────────────────────────────────────────

  const propColumns = [
    {
      header: "Proposição",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Link
          href={`/senado/pautas/${row.id}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.identifier}
        </Link>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: Proposition) => (
        <span className="text-gray-700 line-clamp-1 text-xs">{row.summary}</span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Link
          href={`/senado/pautas/${row.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  const voteColumns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (row: SenadoVotingSession) => (
        <span className="text-sm tabular-nums text-gray-900">
          {row.date ? new Date(row.date).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    {
      header: "Matéria",
      className: "whitespace-nowrap",
      cell: (row: SenadoVotingSession) => (
        <span className="font-medium text-gray-900">{row.matterIdentifier ?? "—"}</span>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (row: SenadoVotingSession) => (
        <span className="text-gray-700 line-clamp-1 text-xs">{row.description}</span>
      ),
    },
    {
      header: "Resultado",
      className: "whitespace-nowrap",
      cell: (row: SenadoVotingSession) =>
        row.approved === true ? (
          <Badge variant="green">Aprovada</Badge>
        ) : row.approved === false ? (
          <Badge variant="red">Rejeitada</Badge>
        ) : (
          <Badge variant="gray">Sem registro</Badge>
        ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (row: SenadoVotingSession) => (
        <Link
          href={`/senado/pautas/votacoes/${row.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Hero header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Senado Federal</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Visão geral do Senado Federal — senadores, proposições, votações e presença em plenário.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">Ver dados de</span>
              <YearSelector years={availableYears} selected={selectedYear} />
            </div>
          </div>
        </div>
      </header>

      {/* ── 1. Resumo geral ──────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Resumo geral" />
        {failed.size > 0 && (
          <div className="mb-4">
            <DataFetchError label="alguns dados do resumo" />
          </div>
        )}
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Senadores em exercício"
              value={String(senators.length)}
              badge={
                largestParty
                  ? { text: `Maior bancada: ${largestParty.name} (${largestParty.value})`, variant: "gray" }
                  : undefined
              }
            />
            <StatCard
              label="Proposições"
              value={String(propositions.length)}
              badge={{ text: String(selectedYear), variant: "gray" }}
              tooltip="Matérias legislativas registradas no /processo da API do Senado para o ano selecionado"
            />
            <StatCard label="Votações realizadas" value={String(totalVotes)} />
            <StatCard
              label="Taxa de aprovação"
              value={`${approvalRate}%`}
              badge={
                totalVotes > 0
                  ? {
                      text: `${approvedVotes} de ${totalVotes}`,
                      variant: Number(approvalRate) >= 50 ? "green" : "amber",
                    }
                  : undefined
              }
            />
          </div>
          {avgAttendance !== null && (
            <p className="mt-3 text-xs text-gray-500">
              Presença média em sessões deliberativas: <strong className="text-gray-700">{avgAttendance}%</strong>
            </p>
          )}
        </div>
      </section>

      {/* ── Próximas sessões (agenda) ─────────────────────────────── */}
      {showAgenda && upcomingAgenda.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <SectionHeader
            title="Próximas sessões"
            description="Pauta plenária prevista para os próximos dias."
            sourceUrl={agenda._source}
          />
          <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
            <ul className="divide-y divide-gray-100">
              {upcomingAgenda.map((item, i) => (
                <li key={`${item.date}-${i}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap">
                      {item.date.slice(0, 10).split("-").reverse().join("/")}
                    </span>
                    {item.sessionType && <Badge variant="gray">{item.sessionType}</Badge>}
                    {item.matterIdentifier && (
                      <span className="text-sm font-medium text-gray-900">
                        {item.matterIdentifier}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-700 line-clamp-2">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── 2. Charts ────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Gráficos e comparativos" />
        <SenadoCharts
          byParty={byParty}
          byUF={byUF}
          propositionsByType={propositionsByType}
          votesByResult={votesByResult}
          propositionsByMonth={propositionsByMonth}
          votesByMonth={votesByMonth}
          attendanceByParty={attendanceByParty}
          approvalByType={approvalByType}
          senatorsSourceUrl={senators._source}
          propositionsSourceUrl={propositions._source}
          votesSourceUrl={votingSessions._source}
          attendanceSourceUrl={attendance._source}
        />
      </section>

      {/* ── 3. Senadores ─────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Senadores"
          sourceUrl={senators._source}
          action={{ label: "Ver todos", href: "/senado/senadores" }}
        />
        {failed.has("Senadores") ? (
          <DataFetchError label="a lista de senadores" />
        ) : (
          <TopSenatorsTable senators={enrichedSenators} year={selectedYear} />
        )}
      </section>

      {/* ── 4. Quick links to subsections ────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Explorar" />
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={`/senado/pautas?ano=${selectedYear}`}
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Pauta Legislativa</span>
              <p className="mt-1 text-xs text-gray-500">Proposições e votações</p>
            </Link>
            <Link
              href={`/senado/pautas/votacoes?ano=${selectedYear}`}
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Sessões de votação</span>
              <p className="mt-1 text-xs text-gray-500">Resultados nominais e placares</p>
            </Link>
            <Link
              href="/senado/senadores"
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Senadores</span>
              <p className="mt-1 text-xs text-gray-500">Lista completa com presença e CEAPS</p>
            </Link>
            <Link
              href="/senado/blocos"
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Partidos e blocos</span>
              <p className="mt-1 text-xs text-gray-500">Bancadas, blocos e lideranças em exercício</p>
            </Link>
            <Link
              href={`/senado/vetos?ano=${selectedYear}`}
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Vetos presidenciais</span>
              <p className="mt-1 text-xs text-gray-500">Vetos em deliberação no Congresso</p>
            </Link>
            <Link
              href="/senado/contratacoes"
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Contratações</span>
              <p className="mt-1 text-xs text-gray-500">Contratos, terceirizados e empenhos</p>
            </Link>
            <Link
              href="/senado/servidores"
              className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all"
            >
              <span className="text-sm font-semibold text-gray-900">Servidores</span>
              <p className="mt-1 text-xs text-gray-500">Quadro funcional e folha de pagamento</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Pauta legislativa ──────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Últimas proposições"
          sourceUrl={propositions._source}
          action={{ label: "Ver todas", href: `/senado/pautas/lista?ano=${selectedYear}` }}
        />
        {failed.has("Proposições") ? (
          <DataFetchError label="as proposições" />
        ) : (
          <DataTable columns={propColumns} data={latestPropositions} rowKey={(r) => r.id} />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Últimas votações"
          sourceUrl={votingSessions._source}
          action={{ label: "Ver todas", href: `/senado/pautas/votacoes?ano=${selectedYear}` }}
        />
        {failed.has("Votações") ? (
          <DataFetchError label="as votações" />
        ) : (
          <DataTable columns={voteColumns} data={latestVotes} rowKey={(r) => r.id} />
        )}
      </section>

      {/* ── 6. Game ──────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <SenadoGameCard />
      </section>
    </>
  )
}
