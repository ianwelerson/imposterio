/**
 * @file page.tsx
 * @description Full listing of all federal deputies (Câmara dos Deputados).
 *
 * Displays a searchable table of all 513 deputies with key metrics:
 * name, party, state, CEAP spending, plenary attendance, staff count,
 * and a link to each deputy's individual detail page.
 *
 * Data source: https://dadosabertos.camara.leg.br/api/v2/deputados
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, AvatarInitials, SectionHeader } from "@/components/ui"

interface DeputyRow {
  id: string
  initials: string
  name: string
  party: string
  state: string
  totalExpenses: string
  attendance: string
  staffCount: number
}

const MOCK_DEPUTIES: DeputyRow[] = [
  { id: "204554", initials: "AB", name: "André Brandão", party: "PL", state: "SP", totalExpenses: "R$ 187.420,00", attendance: "92%", staffCount: 22 },
  { id: "178957", initials: "MC", name: "Maria do Carmo Lara", party: "PT", state: "MG", totalExpenses: "R$ 164.830,50", attendance: "88%", staffCount: 19 },
  { id: "160635", initials: "RN", name: "Ricardo Nunes de Souza", party: "MDB", state: "RJ", totalExpenses: "R$ 152.300,00", attendance: "74%", staffCount: 25 },
  { id: "198745", initials: "FH", name: "Fernando Henrique Costa", party: "PSDB", state: "PR", totalExpenses: "R$ 143.650,00", attendance: "96%", staffCount: 15 },
  { id: "74646", initials: "LS", name: "Luciana Santos Oliveira", party: "PCdoB", state: "PE", totalExpenses: "R$ 138.270,80", attendance: "81%", staffCount: 18 },
  { id: "188512", initials: "JP", name: "José Pedro Almeida", party: "PP", state: "BA", totalExpenses: "R$ 129.950,30", attendance: "69%", staffCount: 21 },
  { id: "220311", initials: "CF", name: "Carolina Ferreira", party: "PSOL", state: "RJ", totalExpenses: "R$ 98.420,00", attendance: "95%", staffCount: 12 },
  { id: "215890", initials: "MT", name: "Marcos Tavares", party: "PSD", state: "RS", totalExpenses: "R$ 91.150,60", attendance: "87%", staffCount: 17 },
  { id: "192034", initials: "AG", name: "Ana Gabriela Pinto", party: "PDT", state: "CE", totalExpenses: "R$ 112.890,00", attendance: "91%", staffCount: 16 },
  { id: "205678", initials: "RL", name: "Roberto Lima Filho", party: "UNIÃO", state: "GO", totalExpenses: "R$ 176.340,20", attendance: "72%", staffCount: 23 },
  { id: "211456", initials: "PV", name: "Patrícia Vieira", party: "PV", state: "SC", totalExpenses: "R$ 67.210,00", attendance: "94%", staffCount: 11 },
  { id: "183290", initials: "DM", name: "Daniel Machado", party: "REPUBLICANOS", state: "AM", totalExpenses: "R$ 198.540,70", attendance: "66%", staffCount: 20 },
  { id: "196712", initials: "IS", name: "Isabela Souza Costa", party: "REDE", state: "DF", totalExpenses: "R$ 54.890,00", attendance: "97%", staffCount: 10 },
  { id: "207845", initials: "GR", name: "Gustavo Rezende", party: "PL", state: "MG", totalExpenses: "R$ 162.770,40", attendance: "78%", staffCount: 24 },
  { id: "174523", initials: "TN", name: "Tereza Nogueira", party: "PT", state: "RS", totalExpenses: "R$ 121.440,00", attendance: "89%", staffCount: 14 },
]

const columns = [
  {
    header: "Deputado(a)",
    cell: (r: DeputyRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={r.initials} />
        <span className="font-medium text-gray-900">{r.name}</span>
      </div>
    ),
  },
  { header: "Partido", cell: (r: DeputyRow) => <span className="text-gray-600">{r.party}</span> },
  { header: "UF", cell: (r: DeputyRow) => <span className="text-gray-600">{r.state}</span> },
  { header: "Gastos (CEAP)", align: "right" as const, cell: (r: DeputyRow) => <span className="font-semibold text-gray-900">{r.totalExpenses}</span> },
  { header: "Presença", align: "right" as const, cell: (r: DeputyRow) => <span className="text-gray-600">{r.attendance}</span> },
  { header: "Assessores", align: "right" as const, cell: (r: DeputyRow) => <span className="text-gray-600">{r.staffCount}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: DeputyRow) => (
      <Link href={`/camara/${r.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function DeputadosPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Deputados Federais</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title={`${MOCK_DEPUTIES.length} deputados em exercício`}
        action={{ label: "← Voltar à Câmara", href: "/camara" }}
      />

      <DataTable columns={columns} data={MOCK_DEPUTIES} rowKey={(r) => r.id} />
    </>
  )
}
