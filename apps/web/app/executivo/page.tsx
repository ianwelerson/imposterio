/**
 * @file page.tsx
 * @description Federal Executive branch overview page.
 *
 * Displays data about the federal executive: civil servants, compensation,
 * contracts, travel, and government payment card spending.
 *
 * Data sources:
 * - Portal da Transparência: https://api.portaldatransparencia.gov.br/api-de-dados
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, RankingList,
} from "@/components/ui"
import { ExecutivoGameCard } from "./ExecutivoGameCard"
import { ExecutivoCharts } from "./ExecutivoCharts"

// -- Mock data ---------------------------------------------------------------

interface ServantRow {
  id: string
  name: string
  role: string
  agency: string
  compensation: string
  _source: string
}

const MOCK_SERVANTS: ServantRow[] = [
  { id: "s1", name: "Carlos Alberto Mendes", role: "Auditor-Fiscal da Receita Federal", agency: "Ministério da Fazenda", compensation: "R$ 35.462,71", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao" },
  { id: "s2", name: "Renata Vieira Costa", role: "Procuradora Federal", agency: "AGU", compensation: "R$ 33.689,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/234567/remuneracao" },
  { id: "s3", name: "Márcio Lopes Ferreira", role: "Diplomata — Ministro de 1ª Classe", agency: "MRE (Itamaraty)", compensation: "R$ 30.934,52", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/345678/remuneracao" },
  { id: "s4", name: "Juliana Araújo Santos", role: "Analista de Comércio Exterior", agency: "MDIC", compensation: "R$ 24.120,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/456789/remuneracao" },
  { id: "s5", name: "Roberto Farias Neto", role: "Especialista em Políticas Públicas", agency: "Ministério do Planejamento", compensation: "R$ 22.847,33", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/567890/remuneracao" },
  { id: "s6", name: "Patrícia Gonçalves Lima", role: "Analista do Banco Central", agency: "BACEN", compensation: "R$ 28.315,60", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/678901/remuneracao" },
]

interface ContractRow {
  id: string
  agency: string
  supplier: string
  object: string
  value: string
  _source: string
}

const MOCK_CONTRACTS: ContractRow[] = [
  { id: "c1", agency: "Ministério da Saúde", supplier: "MedTech Soluções LTDA", object: "Fornecimento de equipamentos hospitalares", value: "R$ 12.400.000,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=36000" },
  { id: "c2", agency: "Ministério da Educação", supplier: "EduBrasil Tecnologia S.A.", object: "Plataforma digital para escolas públicas", value: "R$ 8.750.000,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=26000" },
  { id: "c3", agency: "Ministério da Defesa", supplier: "Embraer Defesa & Segurança", object: "Manutenção de aeronaves KC-390", value: "R$ 45.200.000,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=52000" },
  { id: "c4", agency: "Min. Infraestrutura", supplier: "Construtora Andrade LTDA", object: "Recuperação de rodovias federais — BR-101/NE", value: "R$ 23.800.000,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=39000" },
]

const TOP_AGENCIES = [
  { id: "1", name: "Ministério da Saúde", percentage: 22 },
  { id: "2", name: "Ministério da Educação", percentage: 18 },
  { id: "3", name: "Ministério da Defesa", percentage: 15 },
  { id: "4", name: "Min. Infraestrutura", percentage: 12 },
  { id: "5", name: "Min. Ciência e Tecnologia", percentage: 8 },
]

const servantColumns = [
  { header: "Servidor", cell: (r: ServantRow) => <span className="font-medium text-gray-900">{r.name}</span> },
  { header: "Cargo", cell: (r: ServantRow) => <span className="text-gray-600">{r.role}</span> },
  { header: "Órgão", cell: (r: ServantRow) => <span className="text-gray-600">{r.agency}</span> },
  { header: "Remuneração", align: "right" as const, cell: (r: ServantRow) => <span className="font-semibold text-gray-900">{r.compensation}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ServantRow) => <SourcePill url={r._source} /> },
]

const contractColumns = [
  { header: "Órgão", cell: (r: ContractRow) => <span className="font-medium text-gray-900">{r.agency}</span> },
  { header: "Fornecedor", cell: (r: ContractRow) => <span className="text-gray-600">{r.supplier}</span> },
  { header: "Objeto", cell: (r: ContractRow) => <span className="text-gray-600 truncate max-w-xs block">{r.object}</span> },
  { header: "Valor", align: "right" as const, cell: (r: ContractRow) => <span className="font-semibold text-red-600">{r.value}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ContractRow) => <SourcePill url={r._source} /> },
]

export default function ExecutivoPage() {
  return (
    <>
      <TopBar title="Executivo Federal" defaultPeriod="30d" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores do Executivo"
      >
        <StatCard label="Servidores ativos" value="583.241" />
        <StatCard label="Folha mensal" value="R$ 18,2 bi" badge={{ text: "+2,1% vs mês anterior", variant: "red" }} />
        <StatCard label="Contratos vigentes" value="12.847" />
        <StatCard label="Viagens no período" value="3.214" badge={{ text: "-8% vs período anterior", variant: "green" }} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gráficos e comparativos" />
        <ExecutivoCharts />
      </section>

      <section className="mt-8">
        <SectionHeader title="Maiores remunerações" action={{ label: "Ver servidores", href: "/executivo/servidores" }} />
        <DataTable columns={servantColumns} data={MOCK_SERVANTS} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Contratos recentes" action={{ label: "Ver ministros", href: "/executivo/ministros" }} />
        <DataTable columns={contractColumns} data={MOCK_CONTRACTS} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gastos por órgão" />
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <RankingList items={TOP_AGENCIES} />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <ExecutivoGameCard />
      </section>
    </>
  )
}
