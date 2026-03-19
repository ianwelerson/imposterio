/**
 * @file page.tsx
 * @description Individual deputy detail page.
 *
 * Displays comprehensive data for a single deputy from the Câmara dos Deputados:
 * - Profile header (name, party, state, status)
 * - Key metrics (total CEAP, attendance, votes, caucuses)
 * - Biographical info panel
 * - Expenses table by month
 * - Voting history
 *
 * Data source: https://dadosabertos.camara.leg.br/api/v2/deputados/{id}
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

// -- Mock data ---------------------------------------------------------------

interface ExpenseRow {
  id: string
  month: string
  type: string
  supplier: string
  value: string
  _source: string
}

const MOCK_EXPENSES: ExpenseRow[] = [
  { id: "1", month: "Mar/2024", type: "Divulgação parlamentar", supplier: "Gráfica Nacional LTDA", value: "R$ 15.200,00", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=3&pagina=1" },
  { id: "2", month: "Mar/2024", type: "Passagens aéreas", supplier: "LATAM Airlines", value: "R$ 8.430,50", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=3&pagina=1" },
  { id: "3", month: "Fev/2024", type: "Locação de veículos", supplier: "Localiza Rent a Car", value: "R$ 6.800,00", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=2&pagina=1" },
  { id: "4", month: "Fev/2024", type: "Combustíveis", supplier: "Posto Shell Centro", value: "R$ 3.210,30", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=2&pagina=1" },
  { id: "5", month: "Jan/2024", type: "Manutenção de escritório", supplier: "Office Clean Serviços", value: "R$ 4.590,00", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=1&pagina=1" },
  { id: "6", month: "Jan/2024", type: "Serviços postais", supplier: "Correios", value: "R$ 1.200,20", _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=1&pagina=1" },
]

interface VoteRow {
  id: string
  date: string
  proposal: string
  vote: string
  _source: string
}

const MOCK_VOTES: VoteRow[] = [
  { id: "v1", date: "15/03/2024", proposal: "PL 1234/2024 — Reforma tributária (destaques)", vote: "Sim", _source: "https://dadosabertos.camara.leg.br/api/v2/votacoes/2356789/votos" },
  { id: "v2", date: "12/03/2024", proposal: "PEC 45/2024 — Limite de gastos públicos", vote: "Não", _source: "https://dadosabertos.camara.leg.br/api/v2/votacoes/2356701/votos" },
  { id: "v3", date: "08/03/2024", proposal: "PL 987/2024 — Marco regulatório da IA", vote: "Sim", _source: "https://dadosabertos.camara.leg.br/api/v2/votacoes/2356650/votos" },
  { id: "v4", date: "01/03/2024", proposal: "MPV 1203/2024 — Desoneração da folha", vote: "Abstenção", _source: "https://dadosabertos.camara.leg.br/api/v2/votacoes/2356598/votos" },
]

const expenseColumns = [
  { header: "Mês", cell: (r: ExpenseRow) => <span className="text-gray-600">{r.month}</span> },
  { header: "Tipo", cell: (r: ExpenseRow) => <span className="text-gray-900">{r.type}</span> },
  { header: "Fornecedor", cell: (r: ExpenseRow) => <span className="text-gray-600">{r.supplier}</span> },
  { header: "Valor", align: "right" as const, cell: (r: ExpenseRow) => <span className="font-semibold text-red-600">{r.value}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ExpenseRow) => <SourcePill url={r._source} /> },
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

export default function DeputyDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="AB"
        name="André Brandão"
        tags={["PL", "São Paulo", "57ª Legislatura", "Em exercício"]}
        sourceUrl="https://dadosabertos.camara.leg.br/api/v2/deputados/204554"
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores do deputado"
      >
        <StatCard label="Gasto CEAP (2024)" value="R$ 187.420,00" badge={{ text: "+12% vs 2023", variant: "red" }} />
        <StatCard label="Presença plenário" value="92%" badge={{ text: "Acima da média", variant: "green" }} />
        <StatCard label="Votações participadas" value="118" />
        <StatCard label="Frentes parlamentares" value="7" />
      </section>

      <section className="mt-8">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={[
          { label: "Nome civil", value: "André da Silva Brandão" },
          { label: "Data de nascimento", value: "15/03/1975" },
          { label: "Naturalidade", value: "São Paulo — SP" },
          { label: "Escolaridade", value: "Superior completo" },
          { label: "E-mail", value: "dep.andrebrandao@camara.leg.br" },
          { label: "Gabinete", value: "Anexo IV, Sala 422" },
        ]} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Despesas (CEAP)" />
        <DataTable columns={expenseColumns} data={MOCK_EXPENSES} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Votações recentes" />
        <DataTable columns={voteColumns} data={MOCK_VOTES} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
