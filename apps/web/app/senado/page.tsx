/**
 * @file page.tsx
 * @description Federal Senate (Senado Federal) listing page.
 *
 * Displays an overview of the upper house of Brazil's National Congress:
 * - Key metrics (total senators, authored bills, voting sessions)
 * - Table of all senators with authored bills and party info
 * - Bills distribution breakdown
 *
 * Data source: https://legis.senado.leg.br/dadosabertos
 * Currently renders static mock data — real integration pending.
 */

import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, AvatarInitials, RankingList,
} from "@/components/ui"
import { SenadoGameCard } from "./SenadoGameCard"
import { SenadoCharts } from "./SenadoCharts"

// -- Mock data ---------------------------------------------------------------

interface SenatorRow {
  id: string
  initials: string
  name: string
  party: string
  state: string
  authoredBills: string
  votes: string
  _source: string
}

const MOCK_SENATORS: SenatorRow[] = [
  { id: "5672", initials: "RT", name: "Rodrigo Tavares", party: "PSD", state: "MG", authoredBills: "14", votes: "98%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672.json" },
  { id: "5321", initials: "AF", name: "Ana Flávia Ribeiro", party: "PT", state: "SP", authoredBills: "11", votes: "95%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5321.json" },
  { id: "5890", initials: "PG", name: "Paulo Guimarães", party: "MDB", state: "RS", authoredBills: "9", votes: "87%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5890.json" },
  { id: "5104", initials: "LM", name: "Luiza Mendonça", party: "PL", state: "GO", authoredBills: "8", votes: "92%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5104.json" },
  { id: "5445", initials: "CM", name: "Caio Montenegro", party: "PSDB", state: "CE", authoredBills: "7", votes: "84%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5445.json" },
  { id: "5208", initials: "DB", name: "Daniela Borges", party: "PP", state: "BA", authoredBills: "6", votes: "91%", _source: "https://legis.senado.leg.br/dadosabertos/senador/5208.json" },
]

const BILL_TYPES = [
  { id: "1", name: "Projetos de Lei (PL)", percentage: 42 },
  { id: "2", name: "Requerimentos", percentage: 28 },
  { id: "3", name: "Emendas a PEC", percentage: 14 },
  { id: "4", name: "Indicações", percentage: 10 },
  { id: "5", name: "Projetos de Resolução", percentage: 6 },
]

const columns = [
  {
    header: "Senador(a)",
    cell: (row: SenatorRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={row.initials} />
        <span className="font-medium text-gray-900">{row.name}</span>
      </div>
    ),
  },
  { header: "Partido", cell: (row: SenatorRow) => <span className="text-gray-600">{row.party}</span> },
  { header: "UF", cell: (row: SenatorRow) => <span className="text-gray-600">{row.state}</span> },
  { header: "Autorias", align: "right" as const, cell: (row: SenatorRow) => <span className="font-semibold text-gray-900">{row.authoredBills}</span> },
  { header: "Presença votações", align: "right" as const, cell: (row: SenatorRow) => <span className="text-gray-600">{row.votes}</span> },
  { header: "Fonte", align: "center" as const, cell: (row: SenatorRow) => <SourcePill url={row._source} /> },
]

export default function SenadoPage() {
  return (
    <>
      <TopBar title="Senado Federal" defaultPeriod="30d" />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do Senado"
          >
            <StatCard label="Senadores em exercício" value="81" />
            <StatCard label="Matérias em tramitação" value="342" badge={{ text: "+18 novas", variant: "amber" }} />
            <StatCard label="Sessões de votação" value="64" />
            <StatCard label="Presença média" value="89,4%" badge={{ text: "+3,2 p.p.", variant: "green" }} />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Gráficos e comparativos" />
        <SenadoCharts />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Senadores — atividade legislativa" action={{ label: "Ver todos", href: "/senado/senadores" }} />
        <DataTable columns={columns} data={MOCK_SENATORS} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Distribuição por tipo de matéria" />
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <RankingList items={BILL_TYPES} />
        </div>
      </section>

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
