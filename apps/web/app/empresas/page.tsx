/**
 * @file page.tsx
 * @description Companies and partner networks overview page.
 *
 * Displays data about companies that receive government funds:
 * - Key metrics (monitored companies, blacklisted, punished)
 * - Table of top government suppliers by total received
 * - Blacklisted and punished companies (CEIS/CNEP)
 *
 * Data sources:
 * - CNPJá: https://open.cnpja.com
 * - Portal da Transparência (CEIS/CNEP blacklists)
 * - Federal Revenue QSA bulk (partner networks)
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, Badge,
} from "@/components/ui"
import { EmpresasGameCard } from "./EmpresasGameCard"
import { EmpresasCharts } from "./EmpresasCharts"

// -- Mock data ---------------------------------------------------------------

interface CompanyRow {
  id: string
  name: string
  cnpj: string
  activity: string
  totalReceived: string
  _source: string
}

const MOCK_COMPANIES: CompanyRow[] = [
  { id: "1", name: "MedTech Soluções LTDA", cnpj: "12.345.678/0001-90", activity: "Comércio de equipamentos médicos", totalReceived: "R$ 34.200.000,00", _source: "https://open.cnpja.com/office/12345678000190" },
  { id: "2", name: "EduBrasil Tecnologia S.A.", cnpj: "23.456.789/0001-01", activity: "Desenvolvimento de software educacional", totalReceived: "R$ 28.750.000,00", _source: "https://open.cnpja.com/office/23456789000101" },
  { id: "3", name: "Construtora Andrade LTDA", cnpj: "34.567.890/0001-12", activity: "Construção de rodovias", totalReceived: "R$ 23.800.000,00", _source: "https://open.cnpja.com/office/34567890000112" },
  { id: "4", name: "LogBrasil Transportes S.A.", cnpj: "45.678.901/0001-23", activity: "Transporte rodoviário de cargas", totalReceived: "R$ 18.420.000,00", _source: "https://open.cnpja.com/office/45678901000123" },
  { id: "5", name: "AlimentaBem Indústria LTDA", cnpj: "56.789.012/0001-34", activity: "Fabricação de alimentos", totalReceived: "R$ 15.630.000,00", _source: "https://open.cnpja.com/office/56789012000134" },
]

interface BlacklistRow {
  id: string
  name: string
  cnpj: string
  sanction: string
  since: string
  _source: string
}

const MOCK_BLACKLIST: BlacklistRow[] = [
  { id: "b1", name: "XYZ Consultoria e Eventos", cnpj: "98.765.432/0001-10", sanction: "Impedimento de licitar", since: "15/08/2023", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=98765432000110" },
  { id: "b2", name: "Serviços Rápidos Norte LTDA", cnpj: "87.654.321/0001-21", sanction: "Declaração de inidoneidade", since: "03/02/2024", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=87654321000121" },
  { id: "b3", name: "Omega Engenharia EIRELI", cnpj: "76.543.210/0001-32", sanction: "Suspensão temporária", since: "20/11/2023", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=76543210000132" },
]

const companyColumns = [
  { header: "Empresa", cell: (r: CompanyRow) => <span className="font-medium text-gray-900">{r.name}</span> },
  { header: "CNPJ", cell: (r: CompanyRow) => <span className="font-mono text-sm text-gray-500">{r.cnpj}</span> },
  { header: "Atividade", cell: (r: CompanyRow) => <span className="text-gray-600">{r.activity}</span> },
  { header: "Total recebido", align: "right" as const, cell: (r: CompanyRow) => <span className="font-semibold text-gray-900">{r.totalReceived}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: CompanyRow) => <SourcePill url={r._source} /> },
]

const blacklistColumns = [
  { header: "Empresa", cell: (r: BlacklistRow) => <span className="font-medium text-gray-900">{r.name}</span> },
  { header: "CNPJ", cell: (r: BlacklistRow) => <span className="font-mono text-sm text-gray-500">{r.cnpj}</span> },
  {
    header: "Sanção",
    cell: (r: BlacklistRow) => <Badge variant="red">{r.sanction}</Badge>,
  },
  { header: "Desde", cell: (r: BlacklistRow) => <span className="text-gray-600">{r.since}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: BlacklistRow) => <SourcePill url={r._source} /> },
]

export default function EmpresasPage() {
  return (
    <>
      <TopBar title="Empresas" defaultPeriod="30d" />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores de empresas"
      >
        <StatCard label="Empresas fornecedoras" value="3.847" badge={{ text: "+142 novas", variant: "green" }} />
        <StatCard label="Total repassado" value="R$ 2,1 bi" />
        <StatCard label="Empresas inidôneas (CEIS)" value="8.432" badge={{ text: "Lista federal", variant: "red" }} />
        <StatCard label="Empresas punidas (CNEP)" value="3.215" />
      </section>

      <section className="mt-8">
        <SectionHeader title="Gráficos e comparativos" />
        <EmpresasCharts />
      </section>

      <section className="mt-8">
        <SectionHeader title="Maiores fornecedores do governo" />
        <DataTable columns={companyColumns} data={MOCK_COMPANIES} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Empresas sancionadas (CEIS)" />
        <DataTable columns={blacklistColumns} data={MOCK_BLACKLIST} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <EmpresasGameCard />
      </section>
    </>
  )
}
