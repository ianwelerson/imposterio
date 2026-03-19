/**
 * @file page.tsx
 * @description "Fair or not?" (Acha Justo?) game page.
 *
 * The full game experience where users judge anonymous data points about
 * public officials. The game covers multiple categories: expenses, absences,
 * attendance, bills authored, total compensation, staff count, campaign
 * donations, and wealth growth between elections.
 *
 * After voting, the official's identity is revealed along with how other
 * users voted.
 *
 * Layout:
 * - Left column: the game card for voting
 * - Right column: leaderboard of most disapproved officials
 * - Bottom: recent community votes feed across all categories
 *
 * Game flow is documented in CLAUDE.md § "Jogo Acha Justo? — fluxo completo".
 * Currently renders static mock data — real API integration pending.
 */

import { StatCard, RankingList, SectionHeader, DataTable, SourcePill, Badge } from "@/components/ui"
import { GAME_CARD_TYPE_LABELS } from "@imposterio/types"
import type { GameCardType } from "@imposterio/types"
import { JogoGameCard } from "./JogoGameCard"

// -- Mock data ---------------------------------------------------------------

const MOCK_RANKING = [
  { id: "r1", name: "Carlos Eduardo Alves", subtitle: "PL — SP", percentage: 92 },
  { id: "r2", name: "Roberto Monteiro Filho", subtitle: "MDB — RJ", percentage: 87 },
  { id: "r3", name: "Patricia Albuquerque", subtitle: "PP — BA", percentage: 81 },
  { id: "r4", name: "Marcos Aurélio Vieira", subtitle: "PSD — MG", percentage: 76 },
  { id: "r5", name: "Ana Beatriz Fonseca", subtitle: "PSDB — PR", percentage: 71 },
  { id: "r6", name: "Thiago Nascimento", subtitle: "PT — CE", percentage: 68 },
  { id: "r7", name: "Fernanda Lacerda", subtitle: "PL — GO", percentage: 64 },
  { id: "r8", name: "Diego Cavalcanti", subtitle: "MDB — PE", percentage: 61 },
]

interface RecentVoteRow {
  id: string
  category: GameCardType
  value: string
  context: string
  fairPercent: string
  totalVotes: string
  _source: string
}

const MOCK_RECENT: RecentVoteRow[] = [
  {
    id: "rv1",
    category: "expense",
    value: "R$ 45.231,00",
    context: "Divulgação parlamentar — Mar/2024",
    fairPercent: "12%",
    totalVotes: "1.342",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=3",
  },
  {
    id: "rv2",
    category: "total_compensation",
    value: "R$ 46.366,19",
    context: "Salário base + gratificações + auxílios — Ministro STF",
    fairPercent: "31%",
    totalVotes: "2.890",
    _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao",
  },
  {
    id: "rv3",
    category: "absence",
    value: "42 faltas",
    context: "De 120 sessões plenárias em 2024",
    fairPercent: "8%",
    totalVotes: "987",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/178957/votacoes",
  },
  {
    id: "rv4",
    category: "wealth_growth",
    value: "+R$ 2.400.000",
    context: "Patrimônio declarado cresceu 340% entre 2018 e 2022",
    fairPercent: "15%",
    totalVotes: "1.105",
    _source: "https://divulgacandcontas.tse.jus.br",
  },
  {
    id: "rv5",
    category: "bills_per_tenure",
    value: "3 projetos",
    context: "Em 8 anos como deputado federal (2 mandatos)",
    fairPercent: "6%",
    totalVotes: "2.341",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/198745/discursos",
  },
  {
    id: "rv6",
    category: "staff_count",
    value: "25 assessores",
    context: "Deputado federal com 1 mandato — média da casa: 18",
    fairPercent: "22%",
    totalVotes: "756",
    _source: "https://dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json",
  },
  {
    id: "rv7",
    category: "campaign_donations",
    value: "R$ 8.200.000",
    context: "Total recebido para campanha de 2022 — doações de empresas e partidos",
    fairPercent: "38%",
    totalVotes: "1.580",
    _source: "https://divulgacandcontas.tse.jus.br",
  },
  {
    id: "rv8",
    category: "attendance",
    value: "34%",
    context: "Frequência em sessões plenárias no 1º semestre de 2024",
    fairPercent: "4%",
    totalVotes: "3.120",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/160635/votacoes",
  },
]

const recentColumns = [
  {
    header: "Categoria",
    cell: (r: RecentVoteRow) => (
      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
        {GAME_CARD_TYPE_LABELS[r.category]}
      </span>
    ),
  },
  {
    header: "Valor",
    cell: (r: RecentVoteRow) => <span className="font-semibold text-gray-900">{r.value}</span>,
  },
  {
    header: "Contexto",
    cell: (r: RecentVoteRow) => <span className="text-gray-600">{r.context}</span>,
  },
  {
    header: "Acham justo",
    align: "right" as const,
    cell: (r: RecentVoteRow) => {
      const pct = parseInt(r.fairPercent)
      const variant = pct < 20 ? "red" as const : pct < 40 ? "amber" as const : "green" as const
      return <Badge variant={variant}>{r.fairPercent}</Badge>
    },
  },
  {
    header: "Votos",
    align: "right" as const,
    cell: (r: RecentVoteRow) => <span className="text-gray-600">{r.totalVotes}</span>,
  },
  {
    header: "Fonte",
    align: "center" as const,
    cell: (r: RecentVoteRow) => <SourcePill url={r._source} />,
  },
]

export default function JogoPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Acha Justo?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Veja um dado real sobre um agente público e vote: você acha justo?
          Depois descubra de quem é. Gastos, faltas, salários, patrimônio e mais.
        </p>
      </header>

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores do jogo"
      >
        <StatCard label="Votos totais" value="48.732" badge={{ text: "+1.204 hoje", variant: "green" }} />
        <StatCard label="Cards ativos" value="2.341" badge={{ text: "8 categorias", variant: "amber" }} />
        <StatCard label="Média de reprovação" value="67%" badge={{ text: "Últimos 30 dias", variant: "red" }} />
        <StatCard label="Jogadores únicos (30d)" value="12.450" />
      </section>

      {/* Main game area: card + ranking side by side */}
      <section className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Próximo card" />
          <JogoGameCard />
        </div>

        <div>
          <SectionHeader title="Mais reprovados" />
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <p className="mb-4 text-xs text-gray-400">
              Últimos 30 dias — baseado nos votos dos usuários (todas as categorias)
            </p>
            <RankingList items={MOCK_RANKING} />
          </div>
        </div>
      </section>

      {/* Recent votes feed */}
      <section className="mt-8">
        <SectionHeader title="Votos recentes da comunidade" />
        <DataTable columns={recentColumns} data={MOCK_RECENT} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
