/**
 * @file page.tsx
 * @description Individual company detail page.
 *
 * Displays comprehensive data for a single company by CNPJ:
 * - Company profile (name, CNPJ, status, activity)
 * - Registration details
 * - Partner/shareholder (QSA) list
 * - Government contracts received
 *
 * Data sources:
 * - CNPJá: https://open.cnpja.com/office/{cnpj}
 * - Portal da Transparência (contracts)
 * - Federal Revenue QSA bulk (partner network)
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

// -- Mock data ---------------------------------------------------------------

interface PartnerRow {
  id: string
  name: string
  role: string
  since: string
  _source: string
}

const MOCK_PARTNERS: PartnerRow[] = [
  { id: "p1", name: "Carlos Eduardo da Silva", role: "Sócio-administrador", since: "15/03/2018", _source: "https://open.cnpja.com/office/12345678000190" },
  { id: "p2", name: "Maria Helena Andrade", role: "Sócia", since: "15/03/2018", _source: "https://open.cnpja.com/office/12345678000190" },
  { id: "p3", name: "Roberto Farias Neto", role: "Sócio", since: "01/07/2020", _source: "https://open.cnpja.com/office/12345678000190" },
]

interface ContractRow {
  id: string
  agency: string
  object: string
  value: string
  period: string
  _source: string
}

const MOCK_CONTRACTS: ContractRow[] = [
  { id: "c1", agency: "Ministério da Saúde", object: "Fornecimento de equipamentos hospitalares", value: "R$ 12.400.000,00", period: "2024–2025", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?cnpjContratado=12345678000190" },
  { id: "c2", agency: "Sec. de Saúde — SP", object: "Manutenção de leitos UTI", value: "R$ 4.230.000,00", period: "2023–2024", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?cnpjContratado=12345678000190" },
  { id: "c3", agency: "Hospital Federal de BH", object: "Insumos médicos descartáveis", value: "R$ 1.870.000,00", period: "2024", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/contratos?cnpjContratado=12345678000190" },
]

const partnerColumns = [
  { header: "Nome", cell: (r: PartnerRow) => <span className="font-medium text-gray-900">{r.name}</span> },
  { header: "Qualificação", cell: (r: PartnerRow) => <span className="text-gray-600">{r.role}</span> },
  { header: "Entrada", cell: (r: PartnerRow) => <span className="text-gray-600">{r.since}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: PartnerRow) => <SourcePill url={r._source} /> },
]

const contractColumns = [
  { header: "Órgão contratante", cell: (r: ContractRow) => <span className="font-medium text-gray-900">{r.agency}</span> },
  { header: "Objeto", cell: (r: ContractRow) => <span className="text-gray-600">{r.object}</span> },
  { header: "Valor", align: "right" as const, cell: (r: ContractRow) => <span className="font-semibold text-red-600">{r.value}</span> },
  { header: "Vigência", cell: (r: ContractRow) => <span className="text-gray-600">{r.period}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: ContractRow) => <SourcePill url={r._source} /> },
]

export default function CompanyDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="MT"
        name="MedTech Soluções LTDA"
        tags={["Ativa", "CNPJ 12.345.678/0001-90", "Simples Nacional"]}
        sourceUrl="https://open.cnpja.com/office/12345678000190"
      />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores da empresa"
          >
            <StatCard label="Total recebido do governo" value="R$ 34,2 mi" />
            <StatCard label="Contratos ativos" value="3" />
            <StatCard label="Sócios" value="3" />
            <StatCard label="Situação CEIS" value="Regular" badge={{ text: "Sem sanção", variant: "green" }} />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Dados cadastrais" />
        <InfoPanel fields={[
          { label: "Razão social", value: "MedTech Soluções em Equipamentos Médicos LTDA" },
          { label: "CNPJ", value: "12.345.678/0001-90" },
          { label: "Data de abertura", value: "15/03/2018" },
          { label: "Situação cadastral", value: "Ativa", sourceUrl: "https://open.cnpja.com/office/12345678000190" },
          { label: "CNAE principal", value: "4664-8/00 — Comércio atacadista de máquinas e equipamentos para uso médico" },
          { label: "Porte", value: "Empresa de Pequeno Porte" },
          { label: "Endereço", value: "Av. Paulista, 1.578, Sala 402 — Bela Vista, São Paulo — SP, 01310-200" },
          { label: "Capital social", value: "R$ 500.000,00" },
          { label: "Natureza jurídica", value: "206-2 — Sociedade Empresária Limitada" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Quadro societário (QSA)" />
        <DataTable columns={partnerColumns} data={MOCK_PARTNERS} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Contratos com o governo" />
        <DataTable columns={contractColumns} data={MOCK_CONTRACTS} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
