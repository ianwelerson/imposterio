/**
 * @file page.tsx
 * @description Political Parties overview page.
 *
 * Displays an overview of all Brazilian political parties:
 * - Key metrics (registered parties, total fund distributed, elected officials)
 * - Charts (fund distribution, caucus sizes, election results, trends)
 * - Table of parties with key data and links to detail pages
 *
 * Data sources:
 * - Câmara API /partidos — party list, caucus sizes, leaders
 * - Senado API /senador/partidos — parties in the Senate
 * - TSE open data — party registry, Fundo Partidário, election results
 * - CEPESP/FGV API — aggregated electoral data by party
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, RankingList,
} from "@/components/ui"
import { PartidosCharts } from "./PartidosCharts"

// -- Mock data ---------------------------------------------------------------

interface PartyRow {
  sigla: string
  name: string
  number: number
  deputies: number
  senators: number
  fundReceived: string
  electedTotal: string
  _source: string
}

const MOCK_PARTIES: PartyRow[] = [
  { sigla: "PL", name: "Partido Liberal", number: 22, deputies: 92, senators: 7, fundReceived: "R$ 89,4 mi", electedTotal: "2.214", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36898" },
  { sigla: "PT", name: "Partido dos Trabalhadores", number: 13, deputies: 68, senators: 12, fundReceived: "R$ 82,1 mi", electedTotal: "1.245", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36899" },
  { sigla: "UNIÃO", name: "União Brasil", number: 44, deputies: 51, senators: 8, fundReceived: "R$ 64,3 mi", electedTotal: "1.389", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/38009" },
  { sigla: "MDB", name: "Movimento Democrático Brasileiro", number: 15, deputies: 43, senators: 12, fundReceived: "R$ 52,7 mi", electedTotal: "1.987", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36900" },
  { sigla: "PP", name: "Progressistas", number: 11, deputies: 44, senators: 6, fundReceived: "R$ 48,9 mi", electedTotal: "1.432", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36901" },
  { sigla: "PSD", name: "Partido Social Democrático", number: 55, deputies: 42, senators: 4, fundReceived: "R$ 45,2 mi", electedTotal: "1.654", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/37906" },
  { sigla: "REPUBLICANOS", name: "Republicanos", number: 10, deputies: 37, senators: 4, fundReceived: "R$ 38,6 mi", electedTotal: "1.102", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/37905" },
  { sigla: "PSDB", name: "Partido da Social Democracia Brasileira", number: 45, deputies: 13, senators: 5, fundReceived: "R$ 24,1 mi", electedTotal: "856", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36903" },
  { sigla: "PSOL", name: "Partido Socialismo e Liberdade", number: 50, deputies: 12, senators: 2, fundReceived: "R$ 18,3 mi", electedTotal: "432", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/37904" },
  { sigla: "PDT", name: "Partido Democrático Trabalhista", number: 12, deputies: 18, senators: 3, fundReceived: "R$ 22,8 mi", electedTotal: "723", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36902" },
  { sigla: "NOVO", name: "Partido Novo", number: 30, deputies: 3, senators: 0, fundReceived: "R$ 4,2 mi", electedTotal: "87", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/37907" },
  { sigla: "PCdoB", name: "Partido Comunista do Brasil", number: 65, deputies: 8, senators: 1, fundReceived: "R$ 12,5 mi", electedTotal: "312", _source: "https://dadosabertos.camara.leg.br/api/v2/partidos/36904" },
]

const FUND_RANKING = [
  { id: "1", name: "PL", percentage: 16 },
  { id: "2", name: "PT", percentage: 15 },
  { id: "3", name: "UNIÃO", percentage: 12 },
  { id: "4", name: "MDB", percentage: 10 },
  { id: "5", name: "PP", percentage: 9 },
]

const columns = [
  {
    header: "Sigla",
    cell: (r: PartyRow) => <span className="font-bold text-gray-900">{r.sigla}</span>,
  },
  {
    header: "Nome",
    cell: (r: PartyRow) => <span className="text-gray-600">{r.name}</span>,
  },
  {
    header: "Nº",
    align: "center" as const,
    cell: (r: PartyRow) => <span className="text-gray-500">{r.number}</span>,
  },
  {
    header: "Deputados",
    align: "right" as const,
    cell: (r: PartyRow) => <span className="font-semibold text-gray-900">{r.deputies}</span>,
  },
  {
    header: "Senadores",
    align: "right" as const,
    cell: (r: PartyRow) => <span className="text-gray-600">{r.senators}</span>,
  },
  {
    header: "Fundo recebido",
    align: "right" as const,
    cell: (r: PartyRow) => <span className="font-semibold text-gray-900">{r.fundReceived}</span>,
  },
  {
    header: "Eleitos",
    align: "right" as const,
    cell: (r: PartyRow) => <span className="text-gray-600">{r.electedTotal}</span>,
  },
  {
    header: "Fonte",
    align: "center" as const,
    cell: (r: PartyRow) => <SourcePill url={r._source} />,
  },
]

export default function PartidosPage() {
  return (
    <>
      <TopBar title="Partidos Políticos" defaultPeriod="30d" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores de partidos"
      >
        <StatCard label="Partidos registrados" value="29" />
        <StatCard
          label="Fundo Partidário (2025)"
          value="R$ 573 mi"
          badge={{ text: "+8,2% vs 2024", variant: "red" }}
        />
        <StatCard label="Parlamentares no Congresso" value="594" />
        <StatCard
          label="Fundo Eleitoral (2024)"
          value="R$ 4,96 bi"
          badge={{ text: "Ano eleitoral", variant: "amber" }}
        />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gráficos e comparativos" />
        <PartidosCharts />
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Todos os partidos — bancada e financiamento"
          action={{ label: "Ver todos", href: "/partidos/lista" }}
        />
        <DataTable columns={columns} data={MOCK_PARTIES} rowKey={(r) => r.sigla} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Distribuição do Fundo Partidário" />
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <RankingList items={FUND_RANKING} />
        </div>
      </section>
    </>
  )
}
