/**
 * @file page.tsx
 * @description Full tax revenue listing for all 27 Brazilian states.
 *
 * Displays a table of all states ranked by tax revenue with fiscal indicators:
 * ICMS, IPVA, ITCMD, federal transfers, debt ratio, CAPAG rating,
 * and a link to each state's detail page.
 *
 * Data sources:
 * - SICONFI API: GET /rreo — state revenue execution (Anexo 03: ICMS, IPVA, ITCMD)
 * - IBGE API: GET /agregados/4714 — population by state
 * - Tesouro Transparente: CAPAG ratings, federal transfers
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, SectionHeader, Badge } from "@/components/ui"

interface StateRevenueRow {
  uf: string
  state: string
  region: string
  population: string
  taxRevenue: string
  icms: string
  ipva: string
  itcmd: string
  perCapita: string
  capag: string
}

const MOCK_STATES: StateRevenueRow[] = [
  { uf: "SP", state: "São Paulo", region: "SE", population: "46,6 mi", taxRevenue: "R$ 254,3 bi", icms: "R$ 198,2 bi", ipva: "R$ 28,4 bi", itcmd: "R$ 5,8 bi", perCapita: "R$ 5.458", capag: "B" },
  { uf: "MG", state: "Minas Gerais", region: "SE", population: "21,4 mi", taxRevenue: "R$ 68,1 bi", icms: "R$ 52,3 bi", ipva: "R$ 8,9 bi", itcmd: "R$ 1,4 bi", perCapita: "R$ 3.182", capag: "C" },
  { uf: "RJ", state: "Rio de Janeiro", region: "SE", population: "17,5 mi", taxRevenue: "R$ 51,4 bi", icms: "R$ 38,7 bi", ipva: "R$ 6,2 bi", itcmd: "R$ 2,1 bi", perCapita: "R$ 2.937", capag: "D" },
  { uf: "PR", state: "Paraná", region: "S", population: "11,6 mi", taxRevenue: "R$ 45,2 bi", icms: "R$ 34,8 bi", ipva: "R$ 5,7 bi", itcmd: "R$ 1,1 bi", perCapita: "R$ 3.897", capag: "A" },
  { uf: "RS", state: "Rio Grande do Sul", region: "S", population: "11,5 mi", taxRevenue: "R$ 42,8 bi", icms: "R$ 33,1 bi", ipva: "R$ 5,2 bi", itcmd: "R$ 0,9 bi", perCapita: "R$ 3.722", capag: "C" },
  { uf: "BA", state: "Bahia", region: "NE", population: "14,9 mi", taxRevenue: "R$ 32,6 bi", icms: "R$ 25,8 bi", ipva: "R$ 3,1 bi", itcmd: "R$ 0,6 bi", perCapita: "R$ 2.188", capag: "A" },
  { uf: "SC", state: "Santa Catarina", region: "S", population: "7,6 mi", taxRevenue: "R$ 31,9 bi", icms: "R$ 24,6 bi", ipva: "R$ 4,1 bi", itcmd: "R$ 0,8 bi", perCapita: "R$ 4.312", capag: "A" },
  { uf: "GO", state: "Goiás", region: "CO", population: "7,2 mi", taxRevenue: "R$ 24,7 bi", icms: "R$ 19,4 bi", ipva: "R$ 2,8 bi", itcmd: "R$ 0,5 bi", perCapita: "R$ 3.431", capag: "B" },
  { uf: "PE", state: "Pernambuco", region: "NE", population: "9,6 mi", taxRevenue: "R$ 22,3 bi", icms: "R$ 17,2 bi", ipva: "R$ 2,4 bi", itcmd: "R$ 0,4 bi", perCapita: "R$ 2.323", capag: "B" },
  { uf: "CE", state: "Ceará", region: "NE", population: "9,2 mi", taxRevenue: "R$ 18,9 bi", icms: "R$ 14,6 bi", ipva: "R$ 1,9 bi", itcmd: "R$ 0,3 bi", perCapita: "R$ 2.054", capag: "A" },
  { uf: "DF", state: "Distrito Federal", region: "CO", population: "3,1 mi", taxRevenue: "R$ 39,8 bi", icms: "R$ 11,2 bi", ipva: "R$ 2,6 bi", itcmd: "R$ 0,9 bi", perCapita: "R$ 12.840", capag: "A" },
  { uf: "PA", state: "Pará", region: "N", population: "8,8 mi", taxRevenue: "R$ 17,4 bi", icms: "R$ 13,8 bi", ipva: "R$ 1,4 bi", itcmd: "R$ 0,2 bi", perCapita: "R$ 1.977", capag: "B" },
  { uf: "ES", state: "Espírito Santo", region: "SE", population: "4,1 mi", taxRevenue: "R$ 16,2 bi", icms: "R$ 12,4 bi", ipva: "R$ 1,8 bi", itcmd: "R$ 0,3 bi", perCapita: "R$ 3.951", capag: "A" },
  { uf: "MT", state: "Mato Grosso", region: "CO", population: "3,7 mi", taxRevenue: "R$ 18,1 bi", icms: "R$ 14,2 bi", ipva: "R$ 1,6 bi", itcmd: "R$ 0,3 bi", perCapita: "R$ 4.892", capag: "A" },
  { uf: "MS", state: "Mato Grosso do Sul", region: "CO", population: "2,8 mi", taxRevenue: "R$ 12,4 bi", icms: "R$ 9,7 bi", ipva: "R$ 1,2 bi", itcmd: "R$ 0,2 bi", perCapita: "R$ 4.429", capag: "B" },
  { uf: "MA", state: "Maranhão", region: "NE", population: "7,1 mi", taxRevenue: "R$ 10,8 bi", icms: "R$ 8,6 bi", ipva: "R$ 0,9 bi", itcmd: "R$ 0,1 bi", perCapita: "R$ 1.521", capag: "B" },
  { uf: "AM", state: "Amazonas", region: "N", population: "4,2 mi", taxRevenue: "R$ 11,3 bi", icms: "R$ 8,9 bi", ipva: "R$ 0,8 bi", itcmd: "R$ 0,1 bi", perCapita: "R$ 2.690", capag: "B" },
]

const capagVariant = (c: string): "red" | "green" | "amber" => {
  if (c === "A") return "green"
  if (c === "B") return "amber"
  return "red"
}

const columns = [
  { header: "UF", cell: (r: StateRevenueRow) => <span className="font-bold text-gray-900">{r.uf}</span> },
  { header: "Estado", cell: (r: StateRevenueRow) => <span className="text-gray-600">{r.state}</span> },
  { header: "Região", align: "center" as const, cell: (r: StateRevenueRow) => <span className="text-gray-500">{r.region}</span> },
  { header: "Receita tributária", align: "right" as const, cell: (r: StateRevenueRow) => <span className="font-semibold text-gray-900">{r.taxRevenue}</span> },
  { header: "ICMS", align: "right" as const, cell: (r: StateRevenueRow) => <span className="text-gray-600">{r.icms}</span> },
  { header: "IPVA", align: "right" as const, cell: (r: StateRevenueRow) => <span className="text-gray-600">{r.ipva}</span> },
  { header: "ITCMD", align: "right" as const, cell: (r: StateRevenueRow) => <span className="text-gray-600">{r.itcmd}</span> },
  { header: "Per capita", align: "right" as const, cell: (r: StateRevenueRow) => <span className="font-medium text-gray-900">{r.perCapita}</span> },
  { header: "CAPAG", align: "center" as const, cell: (r: StateRevenueRow) => <Badge variant={capagVariant(r.capag)}>{r.capag}</Badge> },
  {
    header: "",
    align: "center" as const,
    cell: (r: StateRevenueRow) => (
      <Link href={`/estados/${r.uf.toLowerCase()}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function ArrecadacaoPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Arrecadação Estadual</h1>
        <p className="mt-1 text-sm text-gray-500">Receita tributária própria — dados do último exercício fiscal</p>
      </header>

      <SectionHeader
        title={`${MOCK_STATES.length} estados com dados disponíveis`}
        action={{ label: "← Voltar a Estados", href: "/estados" }}
      />

      <DataTable columns={columns} data={MOCK_STATES} rowKey={(r) => r.uf} />
    </>
  )
}
