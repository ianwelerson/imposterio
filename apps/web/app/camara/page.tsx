/**
 * @file page.tsx
 * @description Chamber of Deputies (Câmara dos Deputados) overview page.
 *
 * Displays an overview of the lower house of Brazil's National Congress:
 * - Key metrics (total deputies, CEAP spending, average attendance)
 * - Charts and comparisons
 * - Table of deputies with source links
 * - Expense breakdown by category
 *
 * Data source: https://dadosabertos.camara.leg.br/api/v2
 *
 * StatCards currently use static values for CEAP total, attendance, and
 * vote count — these require expense aggregation and bulk file processing
 * (see TODO.md). The deputy count is derived from the real API.
 */

import Link from "next/link"
import Image from "next/image"
import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, AvatarInitials, RankingList,
} from "@/components/ui"
import { CamaraGameCard } from "./CamaraGameCard"
import { CamaraCharts } from "./CamaraCharts"
import { getDeputiesList } from "@imposterio/fetchers"

// TODO: Expense category ranking — needs aggregated CEAP data (see TODO.md)
const EXPENSE_RANKING = [
  { id: "1", name: "Divulgação parlamentar", percentage: 34 },
  { id: "2", name: "Passagens aéreas", percentage: 22 },
  { id: "3", name: "Locação de veículos", percentage: 16 },
  { id: "4", name: "Combustíveis", percentage: 12 },
  { id: "5", name: "Manutenção de escritório", percentage: 9 },
]

export default async function CamaraPage() {
  const deputies = await getDeputiesList()

  // Show top 8 deputies in the overview table (sorted alphabetically for now)
  // TODO: Sort by CEAP spending once expense aggregation is available
  const topDeputies = deputies.slice(0, 8)

  const columns = [
    {
      header: "Deputado(a)",
      cell: (row: (typeof deputies)[number]) => (
        <Link href={`/camara/${row.id}`} className="flex items-center gap-3 hover:opacity-80">
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
    // TODO: CEAP spending column — needs per-deputy expense aggregation
    // TODO: Attendance column — needs bulk attendance file parser (Phase 4)
    {
      header: "Fonte",
      align: "center" as const,
      cell: () => <SourcePill url={deputies._source} />,
    },
  ]

  return (
    <>
      <TopBar title="Câmara dos Deputados" defaultPeriod="30d" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores da Câmara"
      >
        <StatCard label="Deputados em exercício" value={String(deputies.length)} />
        {/* TODO: Replace static values once expense aggregation is implemented */}
        <StatCard
          label="Gasto CEAP total"
          value="R$ 48,7 mi"
          badge={{ text: "+5,3% vs mês anterior", variant: "red" }}
        />
        <StatCard
          label="Presença média plenário"
          value="82,1%"
          badge={{ text: "+1,4 p.p.", variant: "green" }}
        />
        <StatCard label="Votações no período" value="127" />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gráficos e comparativos" />
        <CamaraCharts />
      </section>

      <section className="mt-8">
        <SectionHeader title="Deputados" action={{ label: "Ver todos", href: "/camara/deputados" }} />
        <DataTable columns={columns} data={topDeputies} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gastos por categoria" />
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <RankingList items={EXPENSE_RANKING} />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/jogo" }}
        />
        <CamaraGameCard />
      </section>
    </>
  )
}
