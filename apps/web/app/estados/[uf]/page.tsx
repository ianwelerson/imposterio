/**
 * @file page.tsx
 * @description Individual state detail page.
 *
 * Displays comprehensive fiscal and political data for a Brazilian state:
 * - State header (name, UF, region, governor, CAPAG rating)
 * - Key metrics (tax revenue, population, GDP, debt ratio)
 * - Governor info panel
 * - Tax revenue breakdown (ICMS, IPVA, ITCMD, IRRF, taxes)
 * - Budget execution by category (education, health, security, etc.)
 * - Federal transfers received
 * - Debt and fiscal health indicators
 *
 * Data sources:
 * - SICONFI API: GET /rreo — revenue execution (Anexo 01, Anexo 03)
 * - SICONFI API: GET /rgf — fiscal management (debt, personnel limits)
 * - IBGE API: population, GDP
 * - TSE: governor asset declarations
 * - Tesouro Transparente: CAPAG, federal transfers, debt data
 * - Portal da Transparência: contracts, earmarks, agreements by UF
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel, Badge,
} from "@/components/ui"

// -- Mock data ---------------------------------------------------------------

interface TaxBreakdownRow {
  id: string
  tax: string
  collected: string
  percentOfTotal: string
  variation: string
  _source: string
}

const MOCK_TAX_BREAKDOWN: TaxBreakdownRow[] = [
  { id: "1", tax: "ICMS", collected: "R$ 198,2 bi", percentOfTotal: "77,9%", variation: "+6,2%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2003" },
  { id: "2", tax: "IPVA", collected: "R$ 28,4 bi", percentOfTotal: "11,2%", variation: "+8,1%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2003" },
  { id: "3", tax: "ITCMD", collected: "R$ 5,8 bi", percentOfTotal: "2,3%", variation: "+12,4%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2003" },
  { id: "4", tax: "IRRF (retido na fonte)", collected: "R$ 13,7 bi", percentOfTotal: "5,4%", variation: "+4,8%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2003" },
  { id: "5", tax: "Taxas diversas", collected: "R$ 8,2 bi", percentOfTotal: "3,2%", variation: "+3,1%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2003" },
]

interface BudgetRow {
  id: string
  category: string
  amount: string
  percentOfBudget: string
  constitutional: string
  _source: string
}

const MOCK_BUDGET: BudgetRow[] = [
  { id: "1", category: "Educação", amount: "R$ 62,3 bi", percentOfBudget: "19,9%", constitutional: "Mín. 25%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2008" },
  { id: "2", category: "Saúde", amount: "R$ 48,7 bi", percentOfBudget: "15,5%", constitutional: "Mín. 12%", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35&no_anexo=RREO-Anexo%2008" },
  { id: "3", category: "Segurança Pública", amount: "R$ 38,9 bi", percentOfBudget: "12,4%", constitutional: "—", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35" },
  { id: "4", category: "Pessoal e encargos", amount: "R$ 98,4 bi", percentOfBudget: "31,4%", constitutional: "Lim. 60% RCL", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf?an_exercicio=2025&id_ente=35" },
  { id: "5", category: "Serviço da dívida", amount: "R$ 22,1 bi", percentOfBudget: "7,1%", constitutional: "—", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35" },
  { id: "6", category: "Investimentos", amount: "R$ 18,6 bi", percentOfBudget: "5,9%", constitutional: "—", _source: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35" },
]

interface TransferRow {
  id: string
  type: string
  amount: string
  percentOfRevenue: string
  _source: string
}

const MOCK_TRANSFERS: TransferRow[] = [
  { id: "1", type: "FPE (Fundo de Participação dos Estados)", amount: "R$ 4,2 bi", percentOfRevenue: "1,3%", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/recursos-recebidos?uf=SP" },
  { id: "2", type: "FUNDEB (Educação)", amount: "R$ 3,8 bi", percentOfRevenue: "1,2%", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/recursos-recebidos?uf=SP" },
  { id: "3", type: "SUS (Saúde)", amount: "R$ 2,4 bi", percentOfRevenue: "0,8%", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/despesas/recursos-recebidos?uf=SP" },
  { id: "4", type: "Emendas parlamentares", amount: "R$ 1,1 bi", percentOfRevenue: "0,4%", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/emendas?uf=SP" },
  { id: "5", type: "Convênios e acordos", amount: "R$ 0,6 bi", percentOfRevenue: "0,2%", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/convenios?uf=SP" },
]

const taxColumns = [
  { header: "Tributo", cell: (r: TaxBreakdownRow) => <span className="font-medium text-gray-900">{r.tax}</span> },
  { header: "Arrecadado", align: "right" as const, cell: (r: TaxBreakdownRow) => <span className="font-semibold text-gray-900">{r.collected}</span> },
  { header: "% do total", align: "right" as const, cell: (r: TaxBreakdownRow) => <span className="text-gray-600">{r.percentOfTotal}</span> },
  { header: "Variação", align: "right" as const, cell: (r: TaxBreakdownRow) => <span className="font-medium text-emerald-600">{r.variation}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: TaxBreakdownRow) => <SourcePill url={r._source} /> },
]

const budgetColumns = [
  { header: "Categoria", cell: (r: BudgetRow) => <span className="font-medium text-gray-900">{r.category}</span> },
  { header: "Valor", align: "right" as const, cell: (r: BudgetRow) => <span className="font-semibold text-gray-900">{r.amount}</span> },
  { header: "% orçamento", align: "right" as const, cell: (r: BudgetRow) => <span className="text-gray-600">{r.percentOfBudget}</span> },
  { header: "Piso/Teto", align: "center" as const, cell: (r: BudgetRow) => <span className="text-xs text-gray-500">{r.constitutional}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: BudgetRow) => <SourcePill url={r._source} /> },
]

const transferColumns = [
  { header: "Tipo", cell: (r: TransferRow) => <span className="font-medium text-gray-900">{r.type}</span> },
  { header: "Valor", align: "right" as const, cell: (r: TransferRow) => <span className="font-semibold text-gray-900">{r.amount}</span> },
  { header: "% receita total", align: "right" as const, cell: (r: TransferRow) => <span className="text-gray-600">{r.percentOfRevenue}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: TransferRow) => <SourcePill url={r._source} /> },
]

export default function StateDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="SP"
        name="São Paulo"
        tags={["Sudeste", "Gov. Tarcísio de Freitas", "REPUBLICANOS", "CAPAG: B"]}
        sourceUrl="https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=2025&id_ente=35"
      />

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Indicadores do estado"
      >
        <StatCard label="Receita tributária" value="R$ 254,3 bi" badge={{ text: "+6,8% vs 2024", variant: "green" }} />
        <StatCard label="População" value="46,6 mi" badge={{ text: "Maior do país", variant: "amber" }} />
        <StatCard label="PIB estadual" value="R$ 2,7 tri" badge={{ text: "31% do PIB nacional", variant: "amber" }} />
        <StatCard label="Dívida / RCL" value="148%" badge={{ text: "CAPAG B", variant: "amber" }} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Governador e dados gerais" />
        <InfoPanel fields={[
          { label: "Governador", value: "Tarcísio Gomes de Freitas" },
          { label: "Partido", value: "Republicanos" },
          { label: "Posse", value: "01/01/2023" },
          { label: "Remuneração mensal", value: "R$ 34.521,84" },
          { label: "Patrimônio declarado (TSE 2022)", value: "R$ 2.800.000" },
          { label: "Capital", value: "São Paulo" },
          { label: "Região", value: "Sudeste" },
          { label: "Código IBGE", value: "35" },
          { label: "Municípios", value: "645" },
        ]} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Arrecadação tributária — composição" />
        <DataTable columns={taxColumns} data={MOCK_TAX_BREAKDOWN} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Execução orçamentária por categoria" />
        <DataTable columns={budgetColumns} data={MOCK_BUDGET} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Transferências da União recebidas" />
        <DataTable columns={transferColumns} data={MOCK_TRANSFERS} rowKey={(r) => r.id} />
      </section>

      <section className="mt-8">
        <SectionHeader title="Indicadores fiscais" />
        <InfoPanel fields={[
          { label: "Receita Corrente Líquida (RCL)", value: "R$ 171,8 bi" },
          { label: "Despesa com pessoal / RCL", value: "57,3% (limite: 60%)" },
          { label: "Dívida consolidada / RCL", value: "148% (limite: 200%)" },
          { label: "CAPAG (Capacidade de Pagamento)", value: "B — Boa, com restrições" },
          { label: "Regime de Recuperação Fiscal", value: "Não" },
          { label: "Superávit/Déficit primário", value: "Superávit de R$ 4,2 bi" },
        ]} />
      </section>
    </>
  )
}
