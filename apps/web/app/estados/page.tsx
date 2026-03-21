/**
 * @file page.tsx
 * @description States (Estados) overview page.
 *
 * Displays a comprehensive overview of Brazilian state-level fiscal data:
 * - Key metrics (total state tax revenue, ICMS total, transfers, state debt)
 * - Charts (tax ranking, composition, per capita, transfers trend)
 * - Table of states with fiscal indicators (revenue, ICMS, IPVA, transfers, debt)
 * - Regional revenue distribution ranking
 *
 * Data sources:
 * - SICONFI API (Tesouro Nacional): GET /rreo — state revenue execution (ICMS, IPVA, ITCMD)
 * - IBGE API: GET /agregados/4714 — population by state
 * - IBGE API: GET /agregados/5938 — GDP by state
 * - Tesouro Transparente: federal transfers, CAPAG ratings, state debt
 * - Portal da Transparência: GET /convenios, GET /emendas (by UF)
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, RankingList, Badge,
} from "@/components/ui"
import { EstadosGameCard } from "./EstadosGameCard"
import { EstadosCharts } from "./EstadosCharts"

// -- Mock data ---------------------------------------------------------------

interface StateRow {
  uf: string
  state: string
  population: string
  taxRevenue: string
  icms: string
  ipva: string
  federalTransfers: string
  debtRatio: string
  capag: string
  _source: string
}

const MOCK_STATES: StateRow[] = [
  { uf: "SP", state: "São Paulo", population: "46,6 mi", taxRevenue: "R$ 254,3 bi", icms: "R$ 198,2 bi", ipva: "R$ 28,4 bi", federalTransfers: "R$ 12,1 bi", debtRatio: "148%", capag: "B", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35" },
  { uf: "MG", state: "Minas Gerais", population: "21,4 mi", taxRevenue: "R$ 68,1 bi", icms: "R$ 52,3 bi", ipva: "R$ 8,9 bi", federalTransfers: "R$ 18,4 bi", debtRatio: "186%", capag: "C", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=31" },
  { uf: "RJ", state: "Rio de Janeiro", population: "17,5 mi", taxRevenue: "R$ 51,4 bi", icms: "R$ 38,7 bi", ipva: "R$ 6,2 bi", federalTransfers: "R$ 11,8 bi", debtRatio: "261%", capag: "D", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=33" },
  { uf: "PR", state: "Paraná", population: "11,6 mi", taxRevenue: "R$ 45,2 bi", icms: "R$ 34,8 bi", ipva: "R$ 5,7 bi", federalTransfers: "R$ 8,9 bi", debtRatio: "42%", capag: "A", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=41" },
  { uf: "RS", state: "Rio Grande do Sul", population: "11,5 mi", taxRevenue: "R$ 42,8 bi", icms: "R$ 33,1 bi", ipva: "R$ 5,2 bi", federalTransfers: "R$ 9,2 bi", debtRatio: "212%", capag: "C", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=43" },
  { uf: "BA", state: "Bahia", population: "14,9 mi", taxRevenue: "R$ 32,6 bi", icms: "R$ 25,8 bi", ipva: "R$ 3,1 bi", federalTransfers: "R$ 22,3 bi", debtRatio: "58%", capag: "A", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=29" },
  { uf: "SC", state: "Santa Catarina", population: "7,6 mi", taxRevenue: "R$ 31,9 bi", icms: "R$ 24,6 bi", ipva: "R$ 4,1 bi", federalTransfers: "R$ 5,8 bi", debtRatio: "35%", capag: "A", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=42" },
  { uf: "GO", state: "Goiás", population: "7,2 mi", taxRevenue: "R$ 24,7 bi", icms: "R$ 19,4 bi", ipva: "R$ 2,8 bi", federalTransfers: "R$ 7,1 bi", debtRatio: "89%", capag: "B", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=52" },
  { uf: "PE", state: "Pernambuco", population: "9,6 mi", taxRevenue: "R$ 22,3 bi", icms: "R$ 17,2 bi", ipva: "R$ 2,4 bi", federalTransfers: "R$ 15,6 bi", debtRatio: "67%", capag: "B", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=26" },
  { uf: "CE", state: "Ceará", population: "9,2 mi", taxRevenue: "R$ 18,9 bi", icms: "R$ 14,6 bi", ipva: "R$ 1,9 bi", federalTransfers: "R$ 14,8 bi", debtRatio: "54%", capag: "A", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=23" },
]

const capagVariant = (c: string): "red" | "green" | "amber" => {
  if (c === "A") return "green"
  if (c === "B") return "amber"
  return "red"
}

const REGIONAL_REVENUE = [
  { id: "1", name: "Sudeste", percentage: 60 },
  { id: "2", name: "Sul", percentage: 18 },
  { id: "3", name: "Nordeste", percentage: 12 },
  { id: "4", name: "Centro-Oeste", percentage: 7 },
  { id: "5", name: "Norte", percentage: 3 },
]

const stateColumns = [
  { header: "UF", cell: (r: StateRow) => <span className="font-bold text-gray-900">{r.uf}</span> },
  { header: "Estado", cell: (r: StateRow) => <span className="text-gray-600">{r.state}</span> },
  { header: "Pop.", align: "right" as const, cell: (r: StateRow) => <span className="text-gray-500">{r.population}</span> },
  { header: "Receita tributária", align: "right" as const, cell: (r: StateRow) => <span className="font-semibold text-gray-900">{r.taxRevenue}</span> },
  { header: "ICMS", align: "right" as const, cell: (r: StateRow) => <span className="text-gray-600">{r.icms}</span> },
  { header: "IPVA", align: "right" as const, cell: (r: StateRow) => <span className="text-gray-600">{r.ipva}</span> },
  { header: "Transf. União", align: "right" as const, cell: (r: StateRow) => <span className="text-gray-600">{r.federalTransfers}</span> },
  { header: "Dívida/RCL", align: "right" as const, cell: (r: StateRow) => {
    const val = parseInt(r.debtRatio)
    const color = val > 200 ? "text-red-600" : val > 100 ? "text-amber-600" : "text-gray-600"
    return <span className={`font-medium ${color}`}>{r.debtRatio}</span>
  }},
  { header: "CAPAG", align: "center" as const, cell: (r: StateRow) => <Badge variant={capagVariant(r.capag)}>{r.capag}</Badge> },
  { header: "Fonte", align: "center" as const, cell: (r: StateRow) => <SourcePill url={r._source} /> },
]

export default function EstadosPage() {
  return (
    <>
      <TopBar title="Estados" defaultPeriod="1a" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores dos estados"
      >
        <StatCard label="Receita tributária total" value="R$ 812 bi" badge={{ text: "27 UFs", variant: "amber" }} />
        <StatCard label="ICMS arrecadado" value="R$ 621 bi" badge={{ text: "72% da receita", variant: "amber" }} />
        <StatCard label="Transferências da União" value="R$ 502 bi" badge={{ text: "+7,5% vs 2024", variant: "green" }} />
        <StatCard label="Dívida consolidada" value="R$ 987 bi" badge={{ text: "4 estados em D", variant: "red" }} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gráficos e comparativos" />
        <EstadosCharts />
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Estados — dados fiscais"
          action={{ label: "Ver arrecadação", href: "/estados/arrecadacao" }}
        />
        <DataTable columns={stateColumns} data={MOCK_STATES} rowKey={(r) => r.uf} />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Arrecadação por região" />
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <RankingList items={REGIONAL_REVENUE} />
          </div>
        </div>
        <div>
          <SectionHeader title="Governadores" action={{ label: "Ver todos", href: "/estados/governadores" }} />
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <p className="text-sm text-gray-500">27 governadores em exercício — remuneração, patrimônio declarado, partido.</p>
            <Link href="/estados/governadores" className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover">
              Ver governadores →
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <EstadosGameCard />
      </section>
    </>
  )
}
