/**
 * @file page.tsx
 * @description Individual cabinet minister detail page.
 *
 * Displays comprehensive data for a single minister:
 * - Profile header (name, ministry, party)
 * - Key metrics (compensation, declared assets, ministry budget, staff)
 * - Biographical info panel
 * - Ministry contracts table
 * - Government card spending
 *
 * Data sources:
 * - Portal da Transparência: https://api.portaldatransparencia.gov.br/api-de-dados
 * - TSE asset declarations: https://divulgacandcontas.tse.jus.br
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

interface ContractRow {
  id: string
  supplier: string
  object: string
  value: string
  date: string
  _source: string
}

const MOCK_CONTRACTS: ContractRow[] = [
  { id: "1", supplier: "MedTech Soluções LTDA", object: "Equipamentos hospitalares — UBS Região Norte", value: "R$ 12.400.000,00", date: "15/02/2024", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=36000&pagina=1" },
  { id: "2", supplier: "VaxBrasil Logística", object: "Transporte e armazenamento de vacinas", value: "R$ 8.200.000,00", date: "08/01/2024", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=36000&pagina=1" },
  { id: "3", supplier: "InfoSaúde Sistemas", object: "Manutenção do e-SUS Atenção Básica", value: "R$ 3.450.000,00", date: "20/12/2023", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=36000&pagina=1" },
  { id: "4", supplier: "Clean Hospital Serviços", object: "Limpeza e manutenção predial — sede Brasília", value: "R$ 1.890.000,00", date: "05/11/2023", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?codigoOrgao=36000&pagina=1" },
]

interface CardSpendRow {
  id: string
  date: string
  description: string
  value: string
  _source: string
}

const MOCK_CARD_SPENDING: CardSpendRow[] = [
  { id: "c1", date: "12/03/2024", description: "Passagem aérea — Brasília/SP (reunião interministerial)", value: "R$ 2.340,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/cartoes?codigoOrgao=36000" },
  { id: "c2", date: "28/02/2024", description: "Hospedagem — São Paulo (visita a hospital federal)", value: "R$ 1.890,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/cartoes?codigoOrgao=36000" },
  { id: "c3", date: "15/02/2024", description: "Refeição institucional — jantar com delegação OMS", value: "R$ 4.520,00", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/cartoes?codigoOrgao=36000" },
]

const contractColumns = [
  { header: "Fornecedor", cell: (r: ContractRow) => <span className="font-medium text-gray-900">{r.supplier}</span> },
  { header: "Objeto", cell: (r: ContractRow) => <span className="text-gray-600 truncate max-w-xs block">{r.object}</span> },
  { header: "Valor", align: "right" as const, cell: (r: ContractRow) => <span className="font-semibold text-red-600">{r.value}</span> },
  { header: "Data", cell: (r: ContractRow) => <span className="text-gray-500">{r.date}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ContractRow) => <SourcePill url={r._source} /> },
]

const cardColumns = [
  { header: "Data", cell: (r: CardSpendRow) => <span className="text-gray-600">{r.date}</span> },
  { header: "Descrição", cell: (r: CardSpendRow) => <span className="text-gray-900">{r.description}</span> },
  { header: "Valor", align: "right" as const, cell: (r: CardSpendRow) => <span className="font-semibold text-red-600">{r.value}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: CardSpendRow) => <SourcePill url={r._source} /> },
]

export default function MinistroDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="NT"
        name="Nísia Trindade"
        tags={["Ministra da Saúde", "Sem partido", "Desde 01/01/2023"]}
        sourceUrl="https://api.portaldatransparencia.gov.br/api-de-dados/servidores?nome=Nisia+Trindade"
      />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do ministro"
          >
            <StatCard label="Remuneração mensal" value="R$ 41.650,92" />
            <StatCard label="Patrimônio declarado" value="R$ 1.850.000" badge={{ text: "TSE 2022", variant: "amber" }} />
            <StatCard label="Orçamento do ministério" value="R$ 232,4 bi" badge={{ text: "LOA 2024", variant: "amber" }} />
            <StatCard label="Servidores no ministério" value="82.430" />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={[
          { label: "Nome completo", value: "Nísia Verônica Trindade Lima" },
          { label: "Data de nascimento", value: "24/07/1958" },
          { label: "Formação", value: "Ciências Sociais — UFRJ / Doutorado IUPERJ" },
          { label: "Cargo anterior", value: "Presidente da Fiocruz (2017–2022)" },
          { label: "Filiação partidária", value: "Sem partido" },
          { label: "Posse", value: "01/01/2023" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Contratos do ministério" />
        <DataTable columns={contractColumns} data={MOCK_CONTRACTS} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Cartão corporativo" />
        <DataTable columns={cardColumns} data={MOCK_CARD_SPENDING} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
