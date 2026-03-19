/**
 * @file page.tsx
 * @description Legislative agenda overview for the Senado Federal.
 *
 * Shows a year selector (URL-driven via ?ano=YYYY), StatCards filtered
 * by the selected year, year-comparison charts, and the latest 5
 * propositions of the selected year with a link to the full listing.
 *
 * Currently renders static mock data for UI development.
 * Future integration: GET /plenario/lista/votacao/{ano}.json
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable } from "@/components/ui"
import type { Proposition, PropositionStatus } from "@imposterio/types"
import { MOCK_PROPOSITIONS } from "./mock-data"
import { PautasCharts } from "./PautasCharts"
import { YearSelector } from "@/app/camara/[id]/YearSelector"

const STATUS_VARIANT: Record<PropositionStatus, "amber" | "green" | "red" | "gray"> = {
  "Em votação": "amber",
  "Aprovada": "green",
  "Rejeitada": "red",
  "Tramitando": "amber",
  "Arquivada": "gray",
}

const AVAILABLE_YEARS = [2026, 2025, 2024]

/** Aggregate yearly stats from propositions for the charts. */
function buildYearlyStats(propositions: Proposition[]) {
  const byYear = new Map<number, { total: number; approved: number; rejected: number; inProgress: number; archived: number }>()

  for (const p of propositions) {
    const year = p.year ?? new Date(p.lastUpdate).getFullYear()
    const entry = byYear.get(year) ?? { total: 0, approved: 0, rejected: 0, inProgress: 0, archived: 0 }
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

/** Aggregate theme distribution for a given year. */
function buildThemeDistribution(propositions: Proposition[], year: number) {
  const counts = new Map<string, number>()
  for (const p of propositions) {
    const pYear = p.year ?? new Date(p.lastUpdate).getFullYear()
    if (pYear !== year) continue
    counts.set(p.theme, (counts.get(p.theme) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Build monthly activity data for line chart. */
function buildMonthlyActivity(propositions: Proposition[], years: number[]) {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const data: Array<{ label: string; [year: string]: number | string }> = months.map((label) => {
    const entry: { label: string; [year: string]: number | string } = { label }
    for (const y of years) entry[String(y)] = 0
    return entry
  })

  for (const p of propositions) {
    const date = new Date(p.lastUpdate)
    const year = p.year ?? date.getFullYear()
    const month = date.getMonth()
    if (years.includes(year)) {
      ;(data[month][String(year)] as number)++
    }
  }

  return data
}

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function SenadoPautasPage({ searchParams }: PageProps) {
  const query = await searchParams
  const selectedYear = Math.max(2024, Math.min(2026, Number(query.ano) || 2026))

  const all = MOCK_PROPOSITIONS

  // Filter propositions for the selected year
  const yearFiltered = all.filter((p) => (p.year ?? new Date(p.lastUpdate).getFullYear()) === selectedYear)

  // Stats for StatCards (filtered by year)
  const voting = yearFiltered.filter((p) => p.status === "Em votação").length
  const approved = yearFiltered.filter((p) => p.status === "Aprovada").length
  const inProgress = yearFiltered.filter((p) => p.status === "Tramitando").length
  const rejected = yearFiltered.filter((p) => p.status === "Rejeitada").length

  // Chart data (uses all years for comparison)
  const chartYears = [2024, 2025, 2026]
  const yearlyStats = buildYearlyStats(all)
  const themeDistribution = buildThemeDistribution(all, selectedYear)
  const monthlyActivity = buildMonthlyActivity(all, chartYears)

  // Latest 5 propositions of the selected year
  const latest5 = [...yearFiltered]
    .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
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
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pauta Legislativa — Senado</h1>
          <p className="mt-1 text-sm text-gray-500">Proposições em tramitação e votadas</p>
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

      <section
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores da pauta"
      >
        <StatCard label="Em votação" value={String(voting)} badge={voting > 0 ? { text: "Agora", variant: "amber" } : undefined} />
        <StatCard label="Aprovadas" value={String(approved)} badge={{ text: String(selectedYear), variant: "green" }} />
        <StatCard label="Em tramitação" value={String(inProgress)} />
        <StatCard label="Rejeitadas" value={String(rejected)} badge={rejected > 0 ? { text: String(selectedYear), variant: "red" } : undefined} />
      </section>

      <PautasCharts
        yearlyStats={yearlyStats}
        themeDistribution={themeDistribution}
        monthlyActivity={monthlyActivity}
        years={chartYears}
      />

      <SectionHeader
        title={`Últimas proposições (${selectedYear})`}
        action={{ label: "Ver todas", href: "/senado/pautas/lista" }}
      />

      <DataTable
        columns={columns}
        data={latest5}
        rowKey={(r) => r.id}
      />
    </>
  )
}
