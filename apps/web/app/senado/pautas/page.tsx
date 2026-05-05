/**
 * @file page.tsx
 * @description Legislative agenda overview for the Senado Federal.
 *
 * Server component that fetches every proposition filed in the selected year
 * (via the `/processo` endpoint) plus every voting session held in the same
 * window (via the `/votacao` endpoint), aggregates them server-side, and
 * renders a year-picker, summary StatCards, year-comparison charts, and a
 * "latest 5 propositions" table.
 *
 * Data sources:
 * - GET /processo?ano={year} → propositions
 * - GET /votacao?dataInicio={YYYY0101}&dataFim={YYYY1231} → voting sessions
 *
 * Both calls are cached via the shared `cachedFetch` Redis layer, so the
 * page rarely hits the upstream APIs after warmup.
 */

import Link from "next/link"
import { getSenadoPropositions, getSenadoVotingSessions } from "@imposterio/fetchers"
import type {
  Proposition,
  PropositionStatus,
  SenadoVotingSession,
} from "@imposterio/types"
import {
  StatCard,
  SectionHeader,
  Badge,
  DataTable,
  ToastTrigger,
  DataFetchError,
} from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { PautasCharts } from "./PautasCharts"

const STATUS_VARIANT: Record<PropositionStatus, "amber" | "green" | "red" | "gray"> = {
  "Em votação": "amber",
  "Aprovada": "green",
  "Rejeitada": "red",
  "Tramitando": "amber",
  "Arquivada": "gray",
}

const CURRENT_YEAR = new Date().getFullYear()
const FIRST_YEAR = CURRENT_YEAR - 2
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
)

/** Aggregate per-year proposition counts for the comparison chart. */
function buildYearlyStats(propositions: Proposition[]) {
  const byYear = new Map<
    number,
    { total: number; approved: number; rejected: number; inProgress: number; archived: number }
  >()

  for (const p of propositions) {
    const year = p.year ?? new Date(p.lastUpdate).getFullYear()
    if (!Number.isFinite(year) || year === 0) continue
    const entry =
      byYear.get(year) ??
      { total: 0, approved: 0, rejected: 0, inProgress: 0, archived: 0 }
    entry.total++
    if (p.status === "Aprovada") entry.approved++
    else if (p.status === "Rejeitada") entry.rejected++
    else if (p.status === "Tramitando" || p.status === "Em votação") entry.inProgress++
    else if (p.status === "Arquivada") entry.archived++
    byYear.set(year, entry)
  }

  return Array.from(byYear.entries())
    .map(([year, stats]) => ({ year, ...stats }))
    .sort((a, b) => a.year - b.year)
}

/** Aggregate top themes for the selected year. */
function buildThemeDistribution(propositions: Proposition[]) {
  const counts = new Map<string, number>()
  for (const p of propositions) {
    const theme = p.theme || "—"
    counts.set(theme, (counts.get(theme) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .filter(([name]) => name !== "—")
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

/** Build the monthly activity series for the line chart. */
function buildMonthlyActivity(
  propositions: Proposition[],
  year: number,
): Array<{ label: string; [key: string]: number | string }> {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const data = months.map((label) => ({ label, [String(year)]: 0 } as { label: string; [key: string]: number | string }))

  for (const p of propositions) {
    const ref = p.lastUpdate || p.presentedDate
    if (!ref) continue
    const date = new Date(ref)
    if (Number.isNaN(date.getTime())) continue
    if (date.getFullYear() !== year) continue
    const m = date.getMonth()
    ;(data[m][String(year)] as number)++
  }

  return data
}

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function SenadoPautasPage({ searchParams }: PageProps) {
  const query = await searchParams
  const requested = Number(query.ano) || CURRENT_YEAR
  const selectedYear = Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, requested))

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [propositions, votingSessions] = await Promise.all([
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
  ])

  const voting = propositions.filter((p) => p.status === "Em votação").length
  const approved = propositions.filter((p) => p.status === "Aprovada").length
  const inProgress = propositions.filter((p) => p.status === "Tramitando").length
  const rejected = propositions.filter((p) => p.status === "Rejeitada").length

  const yearlyStats = buildYearlyStats(propositions)
  const themeDistribution = buildThemeDistribution(propositions)
  const monthlyActivity = buildMonthlyActivity(propositions, selectedYear)

  const latest5 = [...propositions]
    .sort((a, b) =>
      (b.lastUpdate || "").localeCompare(a.lastUpdate || ""),
    )
    .slice(0, 5)

  const columns = [
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
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.summary}</span>
      ),
    },
    {
      header: "Autor(a)",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <div>
          <p className="text-gray-900 text-sm">{row.author}</p>
          <p className="text-gray-400 text-xs">{row.authorParty}</p>
        </div>
      ),
    },
    {
      header: "Tema",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <span className="text-gray-600 text-xs">{row.theme}</span>
      ),
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
      ),
    },
    {
      header: "",
      align: "center" as const,
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

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pauta Legislativa — Senado</h1>
          <p className="mt-1 text-sm text-gray-500">
            Proposições em tramitação e votadas — {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector years={AVAILABLE_YEARS} selected={selectedYear} />
          <a
            href="/senado"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar ao Senado
          </a>
        </div>
      </header>

      {failed.has("Proposições") ? (
        <DataFetchError label="as proposições" />
      ) : (
        <>
          <section
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores da pauta"
          >
            <StatCard
              label="Em votação"
              value={String(voting)}
              badge={voting > 0 ? { text: "Agora", variant: "amber" } : undefined}
            />
            <StatCard
              label="Aprovadas"
              value={String(approved)}
              badge={{ text: String(selectedYear), variant: "green" }}
            />
            <StatCard label="Em tramitação" value={String(inProgress)} />
            <StatCard
              label="Rejeitadas"
              value={String(rejected)}
              badge={
                rejected > 0
                  ? { text: String(selectedYear), variant: "red" }
                  : undefined
              }
            />
          </section>

          <PautasCharts
            yearlyStats={yearlyStats}
            themeDistribution={themeDistribution}
            monthlyActivity={monthlyActivity}
            years={[selectedYear]}
          />

          <SectionHeader
            title={`Últimas proposições (${selectedYear})`}
            sourceUrl={propositions._source}
            action={{ label: "Ver todas", href: "/senado/pautas/lista" }}
          />

          <DataTable columns={columns} data={latest5} rowKey={(r) => r.id} />

          <div className="mt-10">
            <SectionHeader
              title={`Sessões de votação (${selectedYear})`}
              sourceUrl={votingSessions._source}
              action={{ label: "Ver todas", href: "/senado/pautas/votacoes" }}
            />
            {failed.has("Votações") ? (
              <DataFetchError label="as sessões de votação" />
            ) : votingSessions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma sessão de votação registrada em {selectedYear}.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                {votingSessions.length} sessões registradas em {selectedYear}.
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}
