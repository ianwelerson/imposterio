/**
 * @file page.tsx
 * @description Individual civil servant detail page.
 *
 * Displays comprehensive compensation data for a federal civil servant:
 * - Profile header (name, role, agency)
 * - Key metrics (gross/net compensation, benefits, deductions)
 * - Compensation breakdown info panel
 * - Monthly compensation history
 *
 * Data source: https://api.portaldatransparencia.gov.br/api-de-dados/servidores/{id}/remuneracao
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

interface CompHistoryRow {
  id: string
  month: string
  gross: string
  deductions: string
  net: string
  _source: string
}

const MOCK_HISTORY: CompHistoryRow[] = [
  { id: "1", month: "Mar/2024", gross: "R$ 35.462,71", deductions: "R$ 8.342,41", net: "R$ 27.120,30", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202403" },
  { id: "2", month: "Fev/2024", gross: "R$ 35.462,71", deductions: "R$ 8.342,41", net: "R$ 27.120,30", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202402" },
  { id: "3", month: "Jan/2024", gross: "R$ 35.462,71", deductions: "R$ 8.342,41", net: "R$ 27.120,30", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202401" },
  { id: "4", month: "Dez/2023", gross: "R$ 68.925,42", deductions: "R$ 16.684,82", net: "R$ 52.240,60", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202312" },
  { id: "5", month: "Nov/2023", gross: "R$ 33.890,00", deductions: "R$ 7.950,30", net: "R$ 25.939,70", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202311" },
  { id: "6", month: "Out/2023", gross: "R$ 33.890,00", deductions: "R$ 7.950,30", net: "R$ 25.939,70", _source: "https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao?mesAno=202310" },
]

const historyColumns = [
  { header: "Mês", cell: (r: CompHistoryRow) => <span className="text-gray-600">{r.month}</span> },
  { header: "Bruta", align: "right" as const, cell: (r: CompHistoryRow) => <span className="font-semibold text-gray-900">{r.gross}</span> },
  { header: "Descontos", align: "right" as const, cell: (r: CompHistoryRow) => <span className="text-red-600">{r.deductions}</span> },
  { header: "Líquida", align: "right" as const, cell: (r: CompHistoryRow) => <span className="font-semibold text-emerald-600">{r.net}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: CompHistoryRow) => <SourcePill url={r._source} /> },
]

export default function ServidorDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="CA"
        name="Carlos Alberto Mendes"
        tags={["Auditor-Fiscal", "Receita Federal", "Min. Fazenda", "Desde 2004"]}
        sourceUrl="https://api.portaldatransparencia.gov.br/api-de-dados/servidores/123456/remuneracao"
      />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do servidor"
          >
            <StatCard label="Remuneração bruta" value="R$ 35.462,71" />
            <StatCard label="Remuneração líquida" value="R$ 27.120,30" />
            <StatCard label="Descontos obrigatórios" value="R$ 8.342,41" badge={{ text: "23,5%", variant: "amber" }} />
            <StatCard label="13º (Dez/2023)" value="R$ 35.462,71" badge={{ text: "Pago", variant: "green" }} />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Detalhamento da remuneração" />
        <InfoPanel fields={[
          { label: "Vencimento básico", value: "R$ 21.029,09" },
          { label: "Gratificação de desempenho (GDAFAZ)", value: "R$ 8.433,62" },
          { label: "Adicional de qualificação", value: "R$ 2.100,00" },
          { label: "Gratificação natalina (proporcional)", value: "R$ 2.960,00" },
          { label: "Auxílio-alimentação", value: "R$ 940,00" },
          { label: "Total bruto", value: "R$ 35.462,71" },
          { label: "IRRF", value: "- R$ 5.842,41" },
          { label: "PSS (previdência)", value: "- R$ 2.500,00" },
          { label: "Total líquido", value: "R$ 27.120,30" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Histórico de remuneração" />
        <DataTable columns={historyColumns} data={MOCK_HISTORY} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
