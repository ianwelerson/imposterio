/**
 * @file page.tsx
 * @description Individual political party detail page.
 *
 * Displays comprehensive data for a single political party:
 * - Party header (abbreviation, full name, number, status)
 * - Key metrics (caucus size, fund received, elected officials, affiliates)
 * - Party info panel (CNPJ, registration date, president, website)
 * - Deputies and senators belonging to the party
 * - Fund history (Fundo Partidário + Fundo Eleitoral)
 * - Election results by position
 *
 * Data sources:
 * - Câmara API /partidos/{id} — party profile, members, leaders
 * - Senado API /senador/partidos — senators per party
 * - TSE open data — registry, CNPJ, Fundo Partidário, election results
 * - CEPESP/FGV API — historical election results
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

// -- Mock data ---------------------------------------------------------------

interface MemberRow {
  id: string
  name: string
  role: string
  state: string
  since: string
  _source: string
}

const MOCK_DEPUTIES: MemberRow[] = [
  { id: "d1", name: "André Brandão", role: "Deputado Federal", state: "SP", since: "2023", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554" },
  { id: "d2", name: "Carolina Ferreira", role: "Deputada Federal", state: "RJ", since: "2023", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/220311" },
  { id: "d3", name: "Ricardo Nunes", role: "Deputado Federal", state: "MG", since: "2019", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/160635" },
  { id: "d4", name: "Fernanda Almeida", role: "Deputada Federal", state: "BA", since: "2023", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/198745" },
  { id: "d5", name: "Marcos Oliveira", role: "Deputado Federal", state: "PR", since: "2019", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/215890" },
  { id: "d6", name: "Patrícia Lima", role: "Deputada Federal", state: "PE", since: "2023", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/188512" },
]

const MOCK_SENATORS: MemberRow[] = [
  { id: "s1", name: "Roberto Farias", role: "Senador", state: "SP", since: "2023", _source: "https://legis.senado.leg.br/dadosabertos/senador/6435.json" },
  { id: "s2", name: "Juliana Santos", role: "Senadora", state: "RJ", since: "2019", _source: "https://legis.senado.leg.br/dadosabertos/senador/6132.json" },
  { id: "s3", name: "Carlos Mendes", role: "Senador", state: "MG", since: "2023", _source: "https://legis.senado.leg.br/dadosabertos/senador/6287.json" },
]

interface FundRow {
  id: string
  year: string
  fundoPartidario: string
  fundoEleitoral: string
  total: string
  _source: string
}

const MOCK_FUND_HISTORY: FundRow[] = [
  { id: "f1", year: "2025", fundoPartidario: "R$ 89.400.000", fundoEleitoral: "—", total: "R$ 89.400.000", _source: "https://www.tse.jus.br/partidos/contas-partidarias/fundo-partidario-1" },
  { id: "f2", year: "2024", fundoPartidario: "R$ 82.100.000", fundoEleitoral: "R$ 412.000.000", total: "R$ 494.100.000", _source: "https://www.tse.jus.br/partidos/contas-partidarias/fundo-partidario-1" },
  { id: "f3", year: "2023", fundoPartidario: "R$ 76.300.000", fundoEleitoral: "—", total: "R$ 76.300.000", _source: "https://www.tse.jus.br/partidos/contas-partidarias/fundo-partidario-1" },
  { id: "f4", year: "2022", fundoPartidario: "R$ 71.800.000", fundoEleitoral: "R$ 398.000.000", total: "R$ 469.800.000", _source: "https://www.tse.jus.br/partidos/contas-partidarias/fundo-partidario-1" },
]

interface ElectionRow {
  id: string
  position: string
  elected: number
  votes: string
  percentage: string
  _source: string
}

const MOCK_ELECTION_RESULTS: ElectionRow[] = [
  { id: "e1", position: "Deputados Federais", elected: 92, votes: "12.450.000", percentage: "14,2%", _source: "https://dadosabertos.tse.jus.br/dataset/resultados-2022" },
  { id: "e2", position: "Senadores", elected: 7, votes: "18.320.000", percentage: "16,8%", _source: "https://dadosabertos.tse.jus.br/dataset/resultados-2022" },
  { id: "e3", position: "Governadores", elected: 6, votes: "24.100.000", percentage: "18,1%", _source: "https://dadosabertos.tse.jus.br/dataset/resultados-2022" },
  { id: "e4", position: "Dep. Estaduais", elected: 198, votes: "9.870.000", percentage: "11,5%", _source: "https://dadosabertos.tse.jus.br/dataset/resultados-2022" },
  { id: "e5", position: "Vereadores (2024)", elected: 1.911, votes: "15.640.000", percentage: "13,9%", _source: "https://dadosabertos.tse.jus.br/dataset/resultados-2024" },
]

const memberColumns = [
  { header: "Nome", cell: (r: MemberRow) => <span className="font-medium text-gray-900">{r.name}</span> },
  { header: "Cargo", cell: (r: MemberRow) => <span className="text-gray-600">{r.role}</span> },
  { header: "UF", cell: (r: MemberRow) => <span className="text-gray-600">{r.state}</span> },
  { header: "Desde", align: "center" as const, cell: (r: MemberRow) => <span className="text-gray-500">{r.since}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: MemberRow) => <SourcePill url={r._source} /> },
]

const fundColumns = [
  { header: "Ano", cell: (r: FundRow) => <span className="font-medium text-gray-900">{r.year}</span> },
  { header: "Fundo Partidário", align: "right" as const, cell: (r: FundRow) => <span className="text-gray-600">{r.fundoPartidario}</span> },
  { header: "Fundo Eleitoral", align: "right" as const, cell: (r: FundRow) => <span className="text-gray-600">{r.fundoEleitoral}</span> },
  { header: "Total", align: "right" as const, cell: (r: FundRow) => <span className="font-semibold text-gray-900">{r.total}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: FundRow) => <SourcePill url={r._source} /> },
]

const electionColumns = [
  { header: "Cargo", cell: (r: ElectionRow) => <span className="font-medium text-gray-900">{r.position}</span> },
  { header: "Eleitos", align: "right" as const, cell: (r: ElectionRow) => <span className="font-semibold text-gray-900">{r.elected}</span> },
  { header: "Votos", align: "right" as const, cell: (r: ElectionRow) => <span className="text-gray-600">{r.votes}</span> },
  { header: "% votos", align: "right" as const, cell: (r: ElectionRow) => <span className="text-gray-600">{r.percentage}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ElectionRow) => <SourcePill url={r._source} /> },
]

export default function PartyDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="PL"
        name="Partido Liberal"
        tags={["Nº 22", "Registrado", "Brasília — DF", "Fundado em 2006"]}
        sourceUrl="https://dadosabertos.camara.leg.br/api/v2/partidos/36898"
      />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do partido"
          >
            <StatCard label="Bancada (Congresso)" value="99" badge={{ text: "Maior bancada", variant: "green" }} />
            <StatCard label="Fundo recebido (2025)" value="R$ 89,4 mi" badge={{ text: "+8,9% vs 2024", variant: "red" }} />
            <StatCard label="Eleitos (última eleição)" value="2.214" />
            <StatCard label="Filiados" value="1.842.350" />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Dados do partido" />
        <InfoPanel fields={[
          { label: "Nome completo", value: "Partido Liberal" },
          { label: "Sigla", value: "PL" },
          { label: "Número eleitoral", value: "22" },
          { label: "CNPJ", value: "07.012.384/0001-00" },
          { label: "Data de registro", value: "19/12/2006" },
          { label: "Presidente nacional", value: "Valdemar Costa Neto" },
          { label: "Líder na Câmara", value: "Altineu Côrtes" },
          { label: "Líder no Senado", value: "Carlos Portinho" },
          { label: "Bloco parlamentar", value: "Bloco PP, PL, REPUBLICANOS" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title={`Deputados federais (${MOCK_DEPUTIES.length} de 92)`} />
        <DataTable columns={memberColumns} data={MOCK_DEPUTIES} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title={`Senadores (${MOCK_SENATORS.length} de 7)`} />
        <DataTable columns={memberColumns} data={MOCK_SENATORS} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Histórico de fundos públicos recebidos" />
        <DataTable columns={fundColumns} data={MOCK_FUND_HISTORY} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Resultados eleitorais (última eleição geral)" />
        <DataTable columns={electionColumns} data={MOCK_ELECTION_RESULTS} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
