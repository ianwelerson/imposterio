/**
 * @file page.tsx
 * @description Chamber of Deputies (Câmara dos Deputados) overview page.
 *
 * Displays a comprehensive overview of the lower house of Brazil's National
 * Congress, structured into sections following the established detail page pattern:
 *
 * 1. Header with year selector
 * 2. Resumo geral — key StatCards (deputies, propositions, voting sessions)
 * 3. Charts — party/UF distribution, proposition types, voting results
 * 4. Deputados — top deputies table with link to full listing
 * 5. Pauta legislativa — latest propositions + latest votes
 * 6. Acha Justo? — game card
 *
 * Data sources:
 * - GET /deputados — real API, full list
 * - GET /proposicoes — real API, filtered to PL,PEC,PLP,MP,PDL
 * - GET /votacoes — real API, quarterly date splitting
 *
 * Note: CEAP total and attendance are NOT available at the overview level
 * without 513 individual API calls or bulk file processing (see TODO.md).
 */

import Link from "next/link"
import Image from "next/image"
import {
  Acronym, StatCard, DataTable,
  SectionHeader, AvatarInitials, Badge, ToastTrigger,
} from "@/components/ui"
import { CamaraGameCard } from "./CamaraGameCard"
import { CamaraCharts } from "./CamaraCharts"
import {
  getDeputiesList,
  getPropositions,
  getVotingSessions,
  getDeputyAttendanceBulk,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import {
  aggregateDeputiesByParty,
  aggregateDeputiesByUF,
  aggregatePropositionsByType,
  aggregateVotesByResult,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateAttendanceByParty,
} from "./camara-utils"

/** Proposition/voting data is available from 2019 onward (57th legislature). */
const FIRST_YEAR = 2019

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function CamaraPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_YEAR + 1 },
    (_, i) => now - i,
  )

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`

  const errors: PageError[] = []

  const [deputies, propositions, votingSessions, attendance] = await Promise.all([
    collectErrors(() => getDeputiesList(), emptySourced([]), errors, "Deputados"),
    collectErrors(() => getPropositions({ year: selectedYear, typeCode: "PL,PEC,PLP,MP,PDL" }), emptySourced([]), errors, "Proposições"),
    collectErrors(() => getVotingSessions(yearStart, yearEnd), emptySourced([]), errors, "Votações"),
    collectErrors(() => getDeputyAttendanceBulk(selectedYear), emptySourced({ totalEvents: 0, totalPlenarySessions: 0, deputies: [] }), errors, "Presença em eventos"),
  ])

  // ── Aggregations ──────────────────────────────────────────────────

  const byParty = aggregateDeputiesByParty(deputies)
  const byUF = aggregateDeputiesByUF(deputies)
  const propositionsByType = aggregatePropositionsByType(propositions)
  const votesByResult = aggregateVotesByResult(votingSessions)
  const propositionsByMonth = aggregatePropositionsByMonth(propositions)
  const votesByMonth = aggregateVotingSessionsByMonth(votingSessions)
  const attendanceByParty = aggregateAttendanceByParty(attendance, deputies)

  const totalVotes = votingSessions.length
  const approvedVotes = votingSessions.filter((v) => v.approved === true).length
  const approvalRate = totalVotes > 0
    ? ((approvedVotes / totalVotes) * 100).toFixed(1)
    : "0"

  const largestParty = byParty[0]

  // Top 8 deputies (alphabetical — CEAP sorting needs bulk data)
  const topDeputies = deputies.slice(0, 8)

  // Latest 5 propositions
  const latestPropositions = [...propositions]
    .sort((a, b) => new Date(b.presentedDate).getTime() - new Date(a.presentedDate).getTime())
    .slice(0, 5)

  // Latest 5 voting sessions
  const latestVotes = [...votingSessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // ── Column definitions ────────────────────────────────────────────

  const deputyColumns = [
    {
      header: "Deputado(a)",
      cell: (row: (typeof deputies)[number]) => (
        <Link href={`/camara/${row.id}?ano=${selectedYear}`} className="flex items-center gap-3 hover:opacity-80">
          {row.photoUrl ? (
            <Image
              src={row.photoUrl}
              alt={row.name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
              unoptimized
            />
          ) : (
            <AvatarInitials initials={row.name.split(" ").map((w) => w[0]).slice(0, 2).join("")} />
          )}
          <span className="font-medium text-gray-900">{row.name}</span>
        </Link>
      ),
    },
    {
      header: "Partido",
      cell: (row: (typeof deputies)[number]) => <span className="text-gray-600">{row.party}</span>,
    },
    {
      header: "UF",
      cell: (row: (typeof deputies)[number]) => <span className="text-gray-600">{row.uf}</span>,
    },
    {
      header: "",
      align: "right" as const,
      cell: (row: (typeof deputies)[number]) => (
        <Link
          href={`/camara/${row.id}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Ver perfil →
        </Link>
      ),
    },
  ]

  const propColumns = [
    {
      header: "Proposição",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <Link
          href={`/camara/pautas/${row.id}?ano=${selectedYear}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.typeCode} {row.number}/{row.year}
        </Link>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-700 line-clamp-1 text-xs">{row.summary}</span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <Link
          href={`/camara/pautas/${row.id}?ano=${selectedYear}`}
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
      cell: (row: CamaraVotingSession) => (
        <span className="text-sm tabular-nums text-gray-900">
          {new Date(row.date).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (row: CamaraVotingSession) => (
        <span className="text-gray-700 line-clamp-1 text-xs">{row.description}</span>
      ),
    },
    {
      header: "Resultado",
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        row.approved === true
          ? <Badge variant="green">Aprovada</Badge>
          : row.approved === false
            ? <Badge variant="red">Rejeitada</Badge>
            : <Badge variant="gray">Indefinida</Badge>
      ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        <Link
          href={`/camara/pautas/votacoes/${row.id}?ano=${selectedYear}`}
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
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Câmara dos Deputados</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Visão geral da Câmara dos Deputados — despesas, votações, proposições e presença parlamentar.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">Ver dados de</span>
              <YearSelector years={availableYears} selected={selectedYear} />
            </div>
          </div>
        </div>
      </header>

      {/* ── 1. Resumo geral ──────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Resumo geral" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Deputados em exercício"
            value={String(deputies.length)}
            badge={largestParty ? { text: `Maior bancada: ${largestParty.name} (${largestParty.value})`, variant: "gray" } : undefined}
          />
          <StatCard
            label="Proposições"
            value={String(propositions.length)}
            badge={{ text: "PL, PEC, PLP, MP, PDL", variant: "gray" }}
            tooltip="Projeto de Lei, Proposta de Emenda à Constituição, Projeto de Lei Complementar, Medida Provisória, Projeto de Decreto Legislativo"
          />
          <StatCard
            label="Votações realizadas"
            value={String(totalVotes)}
          />
          <StatCard
            label="Taxa de aprovação"
            value={`${approvalRate}%`}
            badge={totalVotes > 0 ? {
              text: `${approvedVotes} de ${totalVotes}`,
              variant: Number(approvalRate) >= 50 ? "green" : "amber",
            } : undefined}
          />
        </div>
      </section>

      {/* ── 2. Charts ────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Gráficos e comparativos" />
        <CamaraCharts
          byParty={byParty}
          byUF={byUF}
          propositionsByType={propositionsByType}
          votesByResult={votesByResult}
          propositionsByMonth={propositionsByMonth}
          votesByMonth={votesByMonth}
          attendanceByParty={attendanceByParty}
          deputiesSourceUrl={deputies._source}
          propositionsSourceUrl={propositions._source}
          votesSourceUrl={votingSessions._source}
          attendanceSourceUrl={attendance._source}
        />
      </section>

      {/* ── 3. Deputados ─────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Deputados"
          sourceUrl={deputies._source}
          action={{ label: "Ver todos", href: "/camara/deputados" }}
        />
        <DataTable columns={deputyColumns} data={topDeputies} rowKey={(r) => r.id} />
      </section>

      {/* ── 4. Quick links to subsections ──────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Explorar" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/camara/pautas?ano=${selectedYear}`}
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-accent/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">Pauta Legislativa</span>
            <p className="mt-1 text-xs text-gray-500">Proposições e votações</p>
          </Link>
          <Link
            href={`/camara/licitacoes?ano=${selectedYear}`}
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-accent/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">Licitações</span>
            <p className="mt-1 text-xs text-gray-500">Compras, contratos e fornecedores</p>
          </Link>
          <Link
            href="/camara/funcionarios"
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-accent/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">Funcionários</span>
            <p className="mt-1 text-xs text-gray-500">Servidores e secretários parlamentares</p>
          </Link>
          <Link
            href="/camara/comparar"
            className="rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-accent/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">Comparar Deputados</span>
            <p className="mt-1 text-xs text-gray-500">Até 3 deputados lado a lado</p>
          </Link>
        </div>
      </section>

      {/* ── 5. Pauta legislativa ──────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Últimas proposições"
          sourceUrl={propositions._source}
          action={{ label: "Ver todas", href: `/camara/pautas/lista?ano=${selectedYear}` }}
        />
        <DataTable columns={propColumns} data={latestPropositions} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12">
        <SectionHeader
          title="Últimas votações"
          sourceUrl={votingSessions._source}
          action={{ label: "Ver todas", href: `/camara/pautas/votacoes?ano=${selectedYear}` }}
        />
        <DataTable columns={voteColumns} data={latestVotes} rowKey={(r) => r.id} />
      </section>

      {/* ── 5. Game ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <CamaraGameCard />
      </section>
    </>
  )
}
