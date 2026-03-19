/**
 * @file page.tsx
 * @description Individual senator detail page.
 *
 * Displays comprehensive data for a single senator from the Senado Federal:
 * - Profile header (name, party, state, term)
 * - Key metrics (authored bills, votes, speeches, committees)
 * - Biographical info panel
 * - Authored bills table
 * - Voting history
 *
 * Data source: https://legis.senado.leg.br/dadosabertos/senador/{id}.json
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

// -- Mock data ---------------------------------------------------------------

interface BillRow {
  id: string
  date: string
  type: string
  summary: string
  status: string
  _source: string
}

const MOCK_BILLS: BillRow[] = [
  { id: "b1", date: "10/03/2024", type: "PL", summary: "Regulamenta o uso de inteligência artificial no setor público", status: "Em tramitação", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/autorias.json" },
  { id: "b2", date: "22/02/2024", type: "PL", summary: "Estabelece limite para gastos com publicidade institucional", status: "Em comissão", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/autorias.json" },
  { id: "b3", date: "15/01/2024", type: "Requerimento", summary: "Convocação do Ministro da Fazenda para audiência pública", status: "Aprovado", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/autorias.json" },
  { id: "b4", date: "08/12/2023", type: "PEC", summary: "Amplia transparência obrigatória para fundos de investimento público", status: "Em tramitação", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/autorias.json" },
]

interface VoteRow {
  id: string
  date: string
  proposal: string
  vote: string
  _source: string
}

const MOCK_VOTES: VoteRow[] = [
  { id: "v1", date: "14/03/2024", proposal: "PEC 12/2024 — Reforma administrativa", vote: "Sim", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/votacoes.json" },
  { id: "v2", date: "07/03/2024", proposal: "PL 890/2024 — Marco legal do hidrogênio verde", vote: "Sim", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/votacoes.json" },
  { id: "v3", date: "28/02/2024", proposal: "MPV 1198/2024 — Programa de aceleração econômica", vote: "Não", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/votacoes.json" },
  { id: "v4", date: "20/02/2024", proposal: "PL 456/2024 — Proteção de dados de menores", vote: "Sim", _source: "https://legis.senado.leg.br/dadosabertos/senador/5672/votacoes.json" },
]

const billColumns = [
  { header: "Data", cell: (r: BillRow) => <span className="text-gray-600">{r.date}</span> },
  { header: "Tipo", cell: (r: BillRow) => <span className="font-medium text-gray-900">{r.type}</span> },
  { header: "Ementa", cell: (r: BillRow) => <span className="text-gray-600">{r.summary}</span> },
  {
    header: "Situação",
    cell: (r: BillRow) => {
      const color = r.status === "Aprovado" ? "text-emerald-600" : "text-amber-600"
      return <span className={`text-sm font-medium ${color}`}>{r.status}</span>
    },
  },
  { header: "Fonte", align: "center" as const, cell: (r: BillRow) => <SourcePill url={r._source} /> },
]

const voteColumns = [
  { header: "Data", cell: (r: VoteRow) => <span className="text-gray-600">{r.date}</span> },
  { header: "Proposição", cell: (r: VoteRow) => <span className="text-gray-900">{r.proposal}</span> },
  {
    header: "Voto",
    cell: (r: VoteRow) => {
      const color = r.vote === "Sim" ? "text-emerald-600" : r.vote === "Não" ? "text-red-600" : "text-amber-600"
      return <span className={`font-medium ${color}`}>{r.vote}</span>
    },
  },
  { header: "Fonte", align: "center" as const, cell: (r: VoteRow) => <SourcePill url={r._source} /> },
]

export default function SenatorDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="RT"
        name="Rodrigo Tavares"
        tags={["PSD", "Minas Gerais", "57ª Legislatura", "Em exercício"]}
        sourceUrl="https://legis.senado.leg.br/dadosabertos/senador/5672.json"
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores do senador"
      >
        <StatCard label="Matérias de autoria" value="14" badge={{ text: "+3 em 2024", variant: "green" }} />
        <StatCard label="Presença em votações" value="98%" />
        <StatCard label="Discursos em plenário" value="23" />
        <StatCard label="Comissões" value="4" />
      </section>

      <section className="mt-8">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={[
          { label: "Nome civil", value: "Rodrigo de Souza Tavares" },
          { label: "Data de nascimento", value: "22/07/1968" },
          { label: "Naturalidade", value: "Belo Horizonte — MG" },
          { label: "Profissão", value: "Advogado" },
          { label: "E-mail", value: "sen.rodrigotavares@senado.leg.br" },
          { label: "Mandato", value: "2023–2031 (1º mandato)" },
        ]} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Matérias de autoria" />
        <DataTable columns={billColumns} data={MOCK_BILLS} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Votações recentes" />
        <DataTable columns={voteColumns} data={MOCK_VOTES} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
