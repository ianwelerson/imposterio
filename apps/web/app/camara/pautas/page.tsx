/**
 * @file page.tsx
 * @description Legislative agenda overview for the Câmara dos Deputados.
 *
 * Organized into structured sections following the deputy detail page pattern:
 * 1. Header with year selector
 * 2. Resumo geral — overview StatCards
 * 3. Proposições — proposition charts + link to full listing
 * 4. Votações — voting session stats + link to full listing
 * 5. Latest propositions table
 * 6. Latest voting sessions table
 *
 * Data sources:
 * - GET /proposicoes — all propositions for the selected year
 * - GET /votacoes — all voting sessions for the selected year
 *
 * @see https://dadosabertos.camara.leg.br/swagger/api.html
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable, ToastTrigger } from "@/components/ui"
import { getPropositions, getVotingSessions } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { CamaraProposition, CamaraVotingSession } from "@imposterio/types"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { PautasCharts } from "./PautasCharts"
import {
  aggregatePropositionsByType,
  aggregatePropositionsByMonth,
  aggregateVotingSessionsByMonth,
  aggregateVotingSessionsByResult,
} from "./pautas-utils"

/** Proposition data is available from 2019 onward (57th legislature). */
const FIRST_YEAR = 2019

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function CamaraPautasPage({ searchParams }: PageProps) {
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

  // Fetch main proposition types only (PL, PEC, PLP, MP, PDL).
  // The Câmara has thousands of propositions per year including REQs and amendments.
  const errors: PageError[] = []

  const [propositions, votingSessions] = await Promise.all([
    collectErrors(() => getPropositions({ year: selectedYear, typeCode: "PL,PEC,PLP,MP,PDL" }), emptySourced([]), errors, "Proposições"),
    collectErrors(() => getVotingSessions(yearStart, yearEnd), emptySourced([]), errors, "Votações"),
  ])

  // Proposition stats
  const totalPropositions = propositions.length

  // Voting stats
  const totalVotes = votingSessions.length
  const approvedVotes = votingSessions.filter((v) => v.approved === true).length
  const rejectedVotes = votingSessions.filter((v) => v.approved === false).length
  const approvalRate = totalVotes > 0
    ? ((approvedVotes / totalVotes) * 100).toFixed(1)
    : "0"

  // Chart data
  const byType = aggregatePropositionsByType(propositions)
  const byMonth = aggregatePropositionsByMonth(propositions)
  const votesByMonth = aggregateVotingSessionsByMonth(votingSessions)
  const votesByResult = aggregateVotingSessionsByResult(votingSessions)

  // Latest 5 propositions
  const latest5 = [...propositions]
    .sort((a, b) => new Date(b.presentedDate).getTime() - new Date(a.presentedDate).getTime())
    .slice(0, 5)

  // Latest 5 voting sessions
  const latestVotes = [...votingSessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

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
      header: "Data",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {new Date(row.presentedDate).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.summary}</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
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
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.description}</span>
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
      align: "center" as const,
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

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Pauta Legislativa — Câmara</h1>
          <div className="flex items-center gap-3">
            <YearSelector years={availableYears} selected={selectedYear} />
            <Link
              href="/camara"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              ← Voltar à Câmara
            </Link>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Proposições legislativas e votações em plenário no ano de {selectedYear}
        </p>
      </header>

      {/* Resumo geral */}
      <section className="mb-10">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Resumo geral</h2>
          <p className="mt-1 text-sm text-gray-500">
            Visão geral da atividade legislativa no período selecionado
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Proposições"
            value={String(totalPropositions)}
            badge={{ text: "PL, PEC, PLP, MP, PDL", variant: "gray" }}
          />
          <StatCard label="Tipos distintos" value={String(byType.length)} />
          <StatCard label="Votações realizadas" value={String(totalVotes)} />
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

      {/* Proposições section */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Proposições</h2>
            <Link
              href={`/camara/pautas/lista?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Projetos de lei, emendas constitucionais, medidas provisórias e outras proposições
            apresentadas na Câmara dos Deputados
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {byType.slice(0, 3).map((item) => (
            <StatCard key={item.name} label={item.name} value={String(item.value)} />
          ))}
        </div>

        <PautasCharts
          byType={byType}
          byMonth={byMonth}
          sourceUrl={propositions._source}
        />

        <SectionHeader
          title={`Últimas proposições (${selectedYear})`}
          sourceUrl={propositions._source}
          action={{ label: "Ver todas", href: `/camara/pautas/lista?ano=${selectedYear}` }}
        />
        <DataTable columns={propColumns} data={latest5} rowKey={(r) => r.id} />
      </section>

      {/* Votações section */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Votações</h2>
            <Link
              href={`/camara/pautas/votacoes?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Sessões de votação nominal em plenário — inclui resultado, votos individuais
            e orientações partidárias
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Votações aprovadas" value={String(approvedVotes)} badge={{ text: `${approvalRate}%`, variant: "green" }} />
          <StatCard label="Votações rejeitadas" value={String(rejectedVotes)} />
          <StatCard label="Total de votações" value={String(totalVotes)} />
        </div>

        <PautasCharts
          votesByMonth={votesByMonth}
          votesByResult={votesByResult}
          sourceUrl={votingSessions._source}
        />

        <SectionHeader
          title={`Últimas votações (${selectedYear})`}
          sourceUrl={votingSessions._source}
          action={{ label: "Ver todas", href: `/camara/pautas/votacoes?ano=${selectedYear}` }}
        />
        <DataTable columns={voteColumns} data={latestVotes} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
