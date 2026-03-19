/**
 * @file page.tsx
 * @description Chamber of Deputies (Câmara dos Deputados) listing page.
 *
 * Displays an overview of the lower house of Brazil's National Congress:
 * - Key metrics (total deputies, CEAP spending, average attendance)
 * - Searchable table of all deputies with spending and attendance data
 * - Expense breakdown by category
 *
 * Data source: https://dadosabertos.camara.leg.br/api/v2
 * Currently renders static mock data — real integration pending.
 */

import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, AvatarInitials, RankingList,
} from "@/components/ui"
import { CamaraGameCard } from "./CamaraGameCard"
import { CamaraCharts } from "./CamaraCharts"

// -- Mock data ---------------------------------------------------------------

interface DeputyRow {
  id: string
  initials: string
  name: string
  party: string
  state: string
  totalExpenses: string
  attendance: string
  _source: string
}

const MOCK_DEPUTIES: DeputyRow[] = [
  { id: "204554", initials: "AB", name: "André Brandão", party: "PL", state: "SP", totalExpenses: "R$ 187.420,00", attendance: "92%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554" },
  { id: "178957", initials: "MC", name: "Maria do Carmo Lara", party: "PT", state: "MG", totalExpenses: "R$ 164.830,50", attendance: "88%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/178957" },
  { id: "160635", initials: "RN", name: "Ricardo Nunes de Souza", party: "MDB", state: "RJ", totalExpenses: "R$ 152.300,00", attendance: "74%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/160635" },
  { id: "198745", initials: "FH", name: "Fernando Henrique Costa", party: "PSDB", state: "PR", totalExpenses: "R$ 143.650,00", attendance: "96%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/198745" },
  { id: "74646", initials: "LS", name: "Luciana Santos Oliveira", party: "PCdoB", state: "PE", totalExpenses: "R$ 138.270,80", attendance: "81%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/74646" },
  { id: "188512", initials: "JP", name: "José Pedro Almeida", party: "PP", state: "BA", totalExpenses: "R$ 129.950,30", attendance: "69%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/188512" },
  { id: "220311", initials: "CF", name: "Carolina Ferreira", party: "PSOL", state: "RJ", totalExpenses: "R$ 98.420,00", attendance: "95%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/220311" },
  { id: "215890", initials: "MT", name: "Marcos Tavares", party: "PSD", state: "RS", totalExpenses: "R$ 91.150,60", attendance: "87%", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/215890" },
]

const EXPENSE_RANKING = [
  { id: "1", name: "Divulgação parlamentar", percentage: 34 },
  { id: "2", name: "Passagens aéreas", percentage: 22 },
  { id: "3", name: "Locação de veículos", percentage: 16 },
  { id: "4", name: "Combustíveis", percentage: 12 },
  { id: "5", name: "Manutenção de escritório", percentage: 9 },
]

const columns = [
  {
    header: "Deputado(a)",
    cell: (row: DeputyRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={row.initials} />
        <span className="font-medium text-gray-900">{row.name}</span>
      </div>
    ),
  },
  {
    header: "Partido",
    cell: (row: DeputyRow) => <span className="text-gray-600">{row.party}</span>,
  },
  {
    header: "UF",
    cell: (row: DeputyRow) => <span className="text-gray-600">{row.state}</span>,
  },
  {
    header: "Gastos (CEAP)",
    align: "right" as const,
    cell: (row: DeputyRow) => <span className="font-semibold text-gray-900">{row.totalExpenses}</span>,
  },
  {
    header: "Presença",
    align: "right" as const,
    cell: (row: DeputyRow) => <span className="text-gray-600">{row.attendance}</span>,
  },
  {
    header: "Fonte",
    align: "center" as const,
    cell: (row: DeputyRow) => <SourcePill url={row._source} />,
  },
]

export default function CamaraPage() {
  return (
    <>
      <TopBar title="Câmara dos Deputados" defaultPeriod="30d" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores da Câmara"
      >
        <StatCard label="Deputados em exercício" value="513" />
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
        <SectionHeader title="Deputados — maiores gastos" action={{ label: "Ver todos", href: "/camara/deputados" }} />
        <DataTable columns={columns} data={MOCK_DEPUTIES} rowKey={(r) => r.id} />
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
