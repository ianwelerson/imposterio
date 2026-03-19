/**
 * @file page.tsx
 * @description Home dashboard page for Imposterio.
 *
 * Displays a panoramic overview of Brazilian public officials — not just
 * spending, but everything about the people who live off public money:
 * expenses, attendance, salaries, voting records, wealth growth, and more.
 *
 * Sections:
 * - Key metrics across all branches (legislative, executive, judiciary)
 * - Highlights table mixing the most notable data points of the period
 * - "Acha Justo?" game ranking + sample card
 *
 * Currently renders static mock data for UI development.
 * Will be replaced with real data from `cachedFetch()` once the
 * fetcher layer is implemented.
 */

import Link from "next/link"
import {
  TopBar, StatCard, DataTable, SourcePill,
  RankingList, SectionHeader, AvatarInitials, Badge,
  TaxCounter,
} from "@/components/ui"
import { HomeGameCard } from "./HomeGameCard"
import { HomeCharts } from "./HomeCharts"

// -- Mock data: highlights table ---------------------------------------------

/** Row shape for the cross-branch highlights table. */
interface HighlightRow {
  id: string
  initials: string
  name: string
  role: string
  partyOrAgency: string
  category: string
  detail: string
  /** API source URL injected by cachedFetch() — displayed via SourcePill. */
  _source: string
}

/**
 * Realistic mock data mixing different types of notable public data.
 * Each row represents a different category (expenses, salary, attendance,
 * wealth growth, etc.) across different branches of government.
 */
const MOCK_HIGHLIGHTS: HighlightRow[] = [
  {
    id: "1",
    initials: "AB",
    name: "André Brandão",
    role: "Deputado Federal",
    partyOrAgency: "PL — SP",
    category: "Despesa",
    detail: "R$ 45.231,00 em divulgação parlamentar (Mar/2024)",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&mes=3&pagina=1",
  },
  {
    id: "2",
    initials: "CM",
    name: "Carlos Alberto Mendes",
    role: "Auditor-Fiscal",
    partyOrAgency: "Min. Fazenda",
    category: "Remuneração",
    detail: "R$ 35.462,71/mês (base + gratificações + extras)",
    _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao",
  },
  {
    id: "3",
    initials: "JP",
    name: "José Pedro Almeida",
    role: "Deputado Federal",
    partyOrAgency: "PP — BA",
    category: "Faltas",
    detail: "Faltou a 42 de 120 sessões plenárias em 2024",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/188512/votacoes",
  },
  {
    id: "4",
    initials: "RT",
    name: "Rodrigo Tavares",
    role: "Senador",
    partyOrAgency: "PSD — MG",
    category: "Patrimônio",
    detail: "+R$ 2.400.000 entre as eleições de 2018 e 2022 (+340%)",
    _source: "https://divulgacandcontas.tse.jus.br",
  },
  {
    id: "5",
    initials: "LS",
    name: "Luciana Santos Oliveira",
    role: "Deputada Federal",
    partyOrAgency: "PCdoB — PE",
    category: "Projetos",
    detail: "3 projetos de lei em 8 anos de mandato (2 legislaturas)",
    _source: "https://dadosabertos.camara.leg.br/api/v2/deputados/74646/discursos",
  },
  {
    id: "6",
    initials: "MJ",
    name: "Min. João Silva Neto",
    role: "Ministro STF",
    partyOrAgency: "STF",
    category: "Remuneração",
    detail: "R$ 46.366,19/mês (teto constitucional + penduricalhos)",
    _source: "https://portal.stf.jus.br/remuneracao/",
  },
  {
    id: "7",
    initials: "FH",
    name: "Fernando Henrique Costa",
    role: "Deputado Federal",
    partyOrAgency: "PSDB — PR",
    category: "Assessores",
    detail: "25 assessores — média da câmara: 18",
    _source: "https://dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json",
  },
  {
    id: "8",
    initials: "MC",
    name: "Maria do Carmo Lara",
    role: "Deputada Federal",
    partyOrAgency: "PT — MG",
    category: "Campanha",
    detail: "R$ 8.200.000 recebidos em doações para campanha de 2022",
    _source: "https://divulgacandcontas.tse.jus.br",
  },
]

// -- Mock data for game ranking ----------------------------------------------

const MOCK_RANKING = [
  { id: "r1", name: "Carlos Eduardo Alves", subtitle: "PL — SP", percentage: 92 },
  { id: "r2", name: "Roberto Monteiro Filho", subtitle: "MDB — RJ", percentage: 87 },
  { id: "r3", name: "Patricia Albuquerque", subtitle: "PP — BA", percentage: 81 },
  { id: "r4", name: "Marcos Aurélio Vieira", subtitle: "PSD — MG", percentage: 76 },
  { id: "r5", name: "Ana Beatriz Fonseca", subtitle: "PSDB — PR", percentage: 71 },
]

// -- Section quick links for the dashboard ------------------------------------

const SECTION_LINKS = [
  {
    title: "Câmara dos Deputados",
    description: "513 deputados — gastos CEAP, presença, votações, assessores",
    href: "/camara",
  },
  {
    title: "Senado Federal",
    description: "81 senadores — produção legislativa, presença, remuneração",
    href: "/senado",
  },
  {
    title: "Executivo Federal",
    description: "583 mil servidores — folha, contratos, viagens, cartões",
    href: "/executivo",
  },
  {
    title: "Judiciário",
    description: "18 mil magistrados — processos, remuneração, tribunais",
    href: "/judiciario",
  },
  {
    title: "Partidos Políticos",
    description: "29 partidos — fundo partidário, eleitos, bancadas",
    href: "/partidos",
  },
  {
    title: "Estados",
    description: "27 UFs — arrecadação, ICMS, IPVA, dívida, CAPAG",
    href: "/estados",
  },
]

// -- Category badge colors ---------------------------------------------------

const CATEGORY_VARIANTS: Record<string, "red" | "green" | "amber"> = {
  "Despesa": "red",
  "Remuneração": "amber",
  "Faltas": "red",
  "Patrimônio": "red",
  "Projetos": "amber",
  "Assessores": "amber",
  "Campanha": "red",
}

// -- Column definitions for the DataTable ------------------------------------

const highlightColumns = [
  {
    header: "Agente público",
    cell: (row: HighlightRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={row.initials} />
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.role}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Vínculo",
    cell: (row: HighlightRow) => (
      <span className="text-gray-600">{row.partyOrAgency}</span>
    ),
  },
  {
    header: "Categoria",
    cell: (row: HighlightRow) => (
      <Badge variant={CATEGORY_VARIANTS[row.category] ?? "amber"}>
        {row.category}
      </Badge>
    ),
  },
  {
    header: "Detalhe",
    cell: (row: HighlightRow) => (
      <span className="text-gray-700">{row.detail}</span>
    ),
  },
  {
    header: "Fonte",
    align: "center" as const,
    cell: (row: HighlightRow) => <SourcePill url={row._source} />,
  },
]

// -- Page component ----------------------------------------------------------

/**
 * Home dashboard page.
 *
 * Renders a panoramic overview of all tracked public officials: their expenses,
 * salaries, attendance, wealth, voting records, and more — across legislative,
 * executive, and judiciary branches. All data is currently static mock.
 */
export default function HomePage() {
  return (
    <>
      <TopBar title="Painel geral" defaultPeriod="30d" />

      {/* Stat cards grid — broad metrics across all branches */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores principais"
      >
        <StatCard
          label="Agentes públicos monitorados"
          value="601.925"
          badge={{ text: "3 poderes", variant: "amber" }}
        />
        <StatCard
          label="Custo mensal estimado"
          value="R$ 18,4 bi"
          badge={{ text: "Salários + despesas", variant: "red" }}
        />
        <StatCard
          label="Presença média plenário"
          value="78,3%"
          badge={{ text: "-2,1 p.p.", variant: "red" }}
        />
        <StatCard
          label="Maior remuneração (teto)"
          value="R$ 46.366,19"
          badge={{ text: "STF", variant: "amber" }}
        />
      </section>

      {/* Tax counter — interpolated estimate */}
      <section className="mt-6" aria-label="Impostômetro">
        <TaxCounter />
      </section>

      {/* Charts — cross-branch comparisons */}
      <section className="mt-8">
        <SectionHeader title="Comparativos" />
        <HomeCharts />
      </section>

      {/* Highlights table — cross-branch, cross-category */}
      <section className="mt-8" aria-label="Destaques do período">
        <SectionHeader title="Destaques do período" />
        <DataTable
          columns={highlightColumns}
          data={MOCK_HIGHLIGHTS}
          rowKey={(row) => row.id}
        />
      </section>

      {/* Section quick links — navigate to each area */}
      <section className="mt-8">
        <SectionHeader title="Explorar por área" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_LINKS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-lg border border-gray-200/60 bg-white p-5 transition-colors hover:border-accent/40"
            >
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-accent">{s.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{s.description}</p>
              <p className="mt-3 text-xs font-medium text-accent">Ver detalhes →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Acha Justo? section */}
      <section className="mt-8" aria-label="Acha Justo?">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Acha Justo?
        </h2>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Ranking */}
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">
              Mais reprovados
            </h3>
            <p className="mb-4 text-xs text-gray-400">
              Últimos 30 dias — baseado nos votos dos usuários
            </p>
            <RankingList items={MOCK_RANKING} />
          </div>

          {/* Game card sample */}
          <HomeGameCard />
        </div>
      </section>
    </>
  )
}
