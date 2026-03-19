/**
 * @file page.tsx
 * @description Full listing of all federal senators (Senado Federal).
 *
 * Displays a table of all 81 senators with key metrics:
 * name, party, state, authored bills, voting attendance, committee count,
 * and a link to each senator's individual detail page.
 *
 * Data source: https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, AvatarInitials, SectionHeader } from "@/components/ui"

interface SenatorRow {
  id: string
  initials: string
  name: string
  party: string
  state: string
  authoredBills: number
  votingAttendance: string
  committees: number
}

const MOCK_SENATORS: SenatorRow[] = [
  { id: "5672", initials: "RT", name: "Rodrigo Tavares", party: "PSD", state: "MG", authoredBills: 14, votingAttendance: "98%", committees: 4 },
  { id: "5321", initials: "AF", name: "Ana Flávia Ribeiro", party: "PT", state: "SP", authoredBills: 11, votingAttendance: "95%", committees: 3 },
  { id: "5890", initials: "PG", name: "Paulo Guimarães", party: "MDB", state: "RS", authoredBills: 9, votingAttendance: "87%", committees: 5 },
  { id: "5104", initials: "LM", name: "Luiza Mendonça", party: "PL", state: "GO", authoredBills: 8, votingAttendance: "92%", committees: 2 },
  { id: "5445", initials: "CM", name: "Caio Montenegro", party: "PSDB", state: "CE", authoredBills: 7, votingAttendance: "84%", committees: 3 },
  { id: "5208", initials: "DB", name: "Daniela Borges", party: "PP", state: "BA", authoredBills: 6, votingAttendance: "91%", committees: 4 },
  { id: "5733", initials: "EM", name: "Eduardo Martins", party: "UNIÃO", state: "PR", authoredBills: 12, votingAttendance: "93%", committees: 3 },
  { id: "5156", initials: "RS", name: "Renata Silva", party: "PDT", state: "RJ", authoredBills: 5, votingAttendance: "79%", committees: 2 },
  { id: "5489", initials: "MA", name: "Marcos Antônio Pereira", party: "REPUBLICANOS", state: "PA", authoredBills: 3, votingAttendance: "72%", committees: 1 },
  { id: "5612", initials: "CV", name: "Carla Vasconcelos", party: "PSOL", state: "PE", authoredBills: 10, votingAttendance: "96%", committees: 3 },
  { id: "5278", initials: "JB", name: "Jorge Batista Neto", party: "MDB", state: "AM", authoredBills: 4, votingAttendance: "68%", committees: 2 },
  { id: "5834", initials: "FL", name: "Fernanda Lacerda", party: "PSD", state: "SC", authoredBills: 13, votingAttendance: "97%", committees: 5 },
]

const columns = [
  {
    header: "Senador(a)",
    cell: (r: SenatorRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={r.initials} />
        <span className="font-medium text-gray-900">{r.name}</span>
      </div>
    ),
  },
  { header: "Partido", cell: (r: SenatorRow) => <span className="text-gray-600">{r.party}</span> },
  { header: "UF", cell: (r: SenatorRow) => <span className="text-gray-600">{r.state}</span> },
  { header: "Autorias", align: "right" as const, cell: (r: SenatorRow) => <span className="font-semibold text-gray-900">{r.authoredBills}</span> },
  { header: "Presença", align: "right" as const, cell: (r: SenatorRow) => <span className="text-gray-600">{r.votingAttendance}</span> },
  { header: "Comissões", align: "right" as const, cell: (r: SenatorRow) => <span className="text-gray-600">{r.committees}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: SenatorRow) => (
      <Link href={`/senado/${r.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function SenadoresPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Senadores</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title={`${MOCK_SENATORS.length} senadores em exercício`}
        action={{ label: "← Voltar ao Senado", href: "/senado" }}
      />

      <DataTable columns={columns} data={MOCK_SENATORS} rowKey={(r) => r.id} />
    </>
  )
}
