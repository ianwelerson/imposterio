/**
 * @file page.tsx
 * @description Full listing of all registered political parties in Brazil.
 *
 * Displays a table of all 29 registered parties:
 * abbreviation, full name, electoral number, caucus size (deputies + senators),
 * fund received (Fundo Partidário), total elected officials, and a link
 * to each party's detail page.
 *
 * Data sources:
 * - Câmara API /partidos — party list, caucus sizes
 * - TSE open data — party registry, Fundo Partidário, election results
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, SectionHeader } from "@/components/ui"

interface PartyRow {
  sigla: string
  name: string
  number: number
  deputies: number
  senators: number
  fundReceived: string
  electedTotal: string
}

const MOCK_PARTIES: PartyRow[] = [
  { sigla: "PL", name: "Partido Liberal", number: 22, deputies: 92, senators: 7, fundReceived: "R$ 89,4 mi", electedTotal: "2.214" },
  { sigla: "PT", name: "Partido dos Trabalhadores", number: 13, deputies: 68, senators: 12, fundReceived: "R$ 82,1 mi", electedTotal: "1.245" },
  { sigla: "UNIÃO", name: "União Brasil", number: 44, deputies: 51, senators: 8, fundReceived: "R$ 64,3 mi", electedTotal: "1.389" },
  { sigla: "MDB", name: "Movimento Democrático Brasileiro", number: 15, deputies: 43, senators: 12, fundReceived: "R$ 52,7 mi", electedTotal: "1.987" },
  { sigla: "PP", name: "Progressistas", number: 11, deputies: 44, senators: 6, fundReceived: "R$ 48,9 mi", electedTotal: "1.432" },
  { sigla: "PSD", name: "Partido Social Democrático", number: 55, deputies: 42, senators: 4, fundReceived: "R$ 45,2 mi", electedTotal: "1.654" },
  { sigla: "REPUBLICANOS", name: "Republicanos", number: 10, deputies: 37, senators: 4, fundReceived: "R$ 38,6 mi", electedTotal: "1.102" },
  { sigla: "PDT", name: "Partido Democrático Trabalhista", number: 12, deputies: 18, senators: 3, fundReceived: "R$ 22,8 mi", electedTotal: "723" },
  { sigla: "PSDB", name: "Partido da Social Democracia Brasileira", number: 45, deputies: 13, senators: 5, fundReceived: "R$ 24,1 mi", electedTotal: "856" },
  { sigla: "PSOL", name: "Partido Socialismo e Liberdade", number: 50, deputies: 12, senators: 2, fundReceived: "R$ 18,3 mi", electedTotal: "432" },
  { sigla: "PCdoB", name: "Partido Comunista do Brasil", number: 65, deputies: 8, senators: 1, fundReceived: "R$ 12,5 mi", electedTotal: "312" },
  { sigla: "PODE", name: "Podemos", number: 20, deputies: 14, senators: 5, fundReceived: "R$ 19,7 mi", electedTotal: "589" },
  { sigla: "AVANTE", name: "Avante", number: 70, deputies: 8, senators: 0, fundReceived: "R$ 10,2 mi", electedTotal: "478" },
  { sigla: "SOLIDARIEDADE", name: "Solidariedade", number: 77, deputies: 6, senators: 1, fundReceived: "R$ 9,8 mi", electedTotal: "345" },
  { sigla: "NOVO", name: "Partido Novo", number: 30, deputies: 3, senators: 0, fundReceived: "R$ 4,2 mi", electedTotal: "87" },
  { sigla: "REDE", name: "Rede Sustentabilidade", number: 18, deputies: 2, senators: 1, fundReceived: "R$ 5,1 mi", electedTotal: "64" },
  { sigla: "PV", name: "Partido Verde", number: 43, deputies: 5, senators: 0, fundReceived: "R$ 7,3 mi", electedTotal: "298" },
  { sigla: "CIDADANIA", name: "Cidadania", number: 23, deputies: 4, senators: 1, fundReceived: "R$ 8,9 mi", electedTotal: "215" },
  { sigla: "PROS", name: "Partido Republicano da Ordem Social", number: 90, deputies: 3, senators: 0, fundReceived: "R$ 3,4 mi", electedTotal: "156" },
  { sigla: "PSC", name: "Partido Social Cristão", number: 20, deputies: 2, senators: 0, fundReceived: "R$ 2,8 mi", electedTotal: "198" },
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
    header: "",
    align: "center" as const,
    cell: (r: PartyRow) => (
      <Link href={`/partidos/${r.sigla.toLowerCase()}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function PartidosListaPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Partidos Políticos</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title={`${MOCK_PARTIES.length} partidos registrados`}
        action={{ label: "← Voltar a Partidos", href: "/partidos" }}
      />

      <DataTable columns={columns} data={MOCK_PARTIES} rowKey={(r) => r.sigla} />
    </>
  )
}
