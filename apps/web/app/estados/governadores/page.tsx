/**
 * @file page.tsx
 * @description Full listing of all state governors (Governadores).
 *
 * Displays a table of all 27 state governors (26 states + DF):
 * name, state, party, monthly compensation, declared assets,
 * term start, and a link to each governor's detail page.
 *
 * Data sources:
 * - TSE asset declarations: https://divulgacandcontas.tse.jus.br
 * - State transparency portals (compensation data)
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, AvatarInitials, SectionHeader } from "@/components/ui"

interface GovernorRow {
  id: string
  uf: string
  initials: string
  name: string
  party: string
  compensation: string
  declaredAssets: string
  termStart: string
}

const MOCK_GOVERNORS: GovernorRow[] = [
  { id: "sp", uf: "SP", initials: "TF", name: "Tarcísio de Freitas", party: "REPUBLICANOS", compensation: "R$ 34.521,84", declaredAssets: "R$ 2.800.000", termStart: "01/01/2023" },
  { id: "rj", uf: "RJ", initials: "CC", name: "Cláudio Castro", party: "PL", compensation: "R$ 32.189,00", declaredAssets: "R$ 1.450.000", termStart: "01/05/2021" },
  { id: "mg", uf: "MG", initials: "RZ", name: "Romeu Zema", party: "NOVO", compensation: "R$ 33.764,00", declaredAssets: "R$ 145.000.000", termStart: "01/01/2023" },
  { id: "ba", uf: "BA", initials: "JC", name: "Jerônimo Rodrigues", party: "PT", compensation: "R$ 28.934,00", declaredAssets: "R$ 890.000", termStart: "01/01/2023" },
  { id: "rs", uf: "RS", initials: "EL", name: "Eduardo Leite", party: "PSDB", compensation: "R$ 31.450,00", declaredAssets: "R$ 620.000", termStart: "01/01/2023" },
  { id: "pr", uf: "PR", initials: "RR", name: "Ratinho Junior", party: "PSD", compensation: "R$ 33.120,00", declaredAssets: "R$ 8.400.000", termStart: "01/01/2023" },
  { id: "pe", uf: "PE", initials: "RM", name: "Raquel Lyra", party: "PSDB", compensation: "R$ 27.850,00", declaredAssets: "R$ 3.200.000", termStart: "01/01/2023" },
  { id: "ce", uf: "CE", initials: "EG", name: "Elmano de Freitas", party: "PT", compensation: "R$ 27.200,00", declaredAssets: "R$ 1.100.000", termStart: "01/01/2023" },
  { id: "pa", uf: "PA", initials: "HB", name: "Helder Barbalho", party: "MDB", compensation: "R$ 29.430,00", declaredAssets: "R$ 5.600.000", termStart: "01/01/2023" },
  { id: "go", uf: "GO", initials: "RC", name: "Ronaldo Caiado", party: "UNIÃO", compensation: "R$ 30.120,00", declaredAssets: "R$ 42.000.000", termStart: "01/01/2023" },
  { id: "sc", uf: "SC", initials: "JM", name: "Jorginho Mello", party: "PL", compensation: "R$ 31.890,00", declaredAssets: "R$ 18.500.000", termStart: "01/01/2023" },
  { id: "df", uf: "DF", initials: "IG", name: "Ibaneis Rocha", party: "MDB", compensation: "R$ 33.764,00", declaredAssets: "R$ 9.200.000", termStart: "01/01/2023" },
]

const columns = [
  { header: "UF", cell: (r: GovernorRow) => <span className="font-semibold text-gray-900">{r.uf}</span> },
  {
    header: "Governador(a)",
    cell: (r: GovernorRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={r.initials} />
        <span className="font-medium text-gray-900">{r.name}</span>
      </div>
    ),
  },
  { header: "Partido", cell: (r: GovernorRow) => <span className="text-gray-600">{r.party}</span> },
  { header: "Remuneração", align: "right" as const, cell: (r: GovernorRow) => <span className="font-semibold text-gray-900">{r.compensation}</span> },
  { header: "Patrimônio", align: "right" as const, cell: (r: GovernorRow) => <span className="text-gray-600">{r.declaredAssets}</span> },
  { header: "Posse", cell: (r: GovernorRow) => <span className="text-gray-500">{r.termStart}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: GovernorRow) => (
      <Link href={`/estados/${r.uf.toLowerCase()}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function GovernadoresPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Governadores</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title={`${MOCK_GOVERNORS.length} governadores em exercício`}
        action={{ label: "← Voltar a Estados", href: "/estados" }}
      />

      <DataTable columns={columns} data={MOCK_GOVERNORS} rowKey={(r) => r.id} />
    </>
  )
}
