/**
 * @file page.tsx
 * @description Individual magistrate detail page.
 *
 * Displays comprehensive data for a single judge/justice:
 * - Profile header (name, court, rank)
 * - Key metrics (compensation, active cases, years on bench, productivity)
 * - Biographical info panel
 * - Recent rulings / notable cases
 * - Compensation breakdown
 *
 * Data sources:
 * - CNJ DataJud: https://api-publica.datajud.cnj.jus.br
 * - Court transparency portals (compensation)
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  StatCard, DataTable, SourcePill, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"

interface CaseRow {
  id: string
  number: string
  subject: string
  class: string
  status: string
  _source: string
}

const MOCK_CASES: CaseRow[] = [
  { id: "1", number: "ADI 7.356", subject: "Constitucionalidade do marco temporal de terras indígenas", class: "Ação Direta de Inconstitucionalidade", status: "Em julgamento", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
  { id: "2", number: "RE 1.421.212", subject: "Imunidade tributária de entidades religiosas", class: "Recurso Extraordinário", status: "Aguardando pauta", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
  { id: "3", number: "ADPF 892", subject: "Limites do poder regulamentar de agências", class: "Arguição de Descumprimento", status: "Julgado", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
  { id: "4", number: "HC 231.456", subject: "Prisão preventiva — excesso de prazo", class: "Habeas Corpus", status: "Julgado", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
  { id: "5", number: "MS 38.901", subject: "Nomeação de aprovados em concurso público", class: "Mandado de Segurança", status: "Aguardando pauta", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
]

const caseColumns = [
  { header: "Processo", cell: (r: CaseRow) => <span className="font-medium text-gray-900">{r.number}</span> },
  { header: "Assunto", cell: (r: CaseRow) => <span className="text-gray-600 truncate max-w-xs block">{r.subject}</span> },
  { header: "Classe", cell: (r: CaseRow) => <span className="text-gray-500">{r.class}</span> },
  {
    header: "Situação",
    cell: (r: CaseRow) => {
      const color = r.status === "Julgado" ? "text-emerald-600" : r.status === "Em julgamento" ? "text-amber-600" : "text-gray-500"
      return <span className={`font-medium ${color}`}>{r.status}</span>
    },
  },
  { header: "Fonte", align: "center" as const, cell: (r: CaseRow) => <SourcePill url={r._source} /> },
]

export default function MagistrateDetailPage() {
  return (
    <>
      <ProfileHeader
        initials="JS"
        name="Min. João Silva Neto"
        tags={["Ministro", "STF", "Nomeado em 2012"]}
        sourceUrl="https://portal.stf.jus.br/remuneracao/"
      />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do magistrado"
          >
            <StatCard label="Remuneração mensal" value="R$ 46.366,19" badge={{ text: "Teto constitucional", variant: "amber" }} />
            <StatCard label="Processos como relator" value="384" />
            <StatCard label="Anos no tribunal" value="12" />
            <StatCard label="Processos julgados (2024)" value="127" badge={{ text: "+18% vs 2023", variant: "green" }} />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={[
          { label: "Nome completo", value: "João da Silva Neto" },
          { label: "Data de nascimento", value: "22/09/1962" },
          { label: "Formação", value: "Direito — USP / Doutorado UnB" },
          { label: "Tribunal", value: "Supremo Tribunal Federal (STF)" },
          { label: "Nomeação", value: "Decreto de 15/06/2012" },
          { label: "Cargo anterior", value: "Desembargador — TRF da 1ª Região" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Detalhamento da remuneração" />
        <InfoPanel fields={[
          { label: "Subsídio", value: "R$ 41.650,92" },
          { label: "Vantagens pessoais", value: "R$ 0,00" },
          { label: "Indenizações", value: "R$ 4.715,27" },
          { label: "Remuneração bruta", value: "R$ 46.366,19" },
          { label: "IRRF", value: "- R$ 9.245,30" },
          { label: "Previdência", value: "- R$ 4.582,10" },
          { label: "Remuneração líquida", value: "R$ 32.538,79" },
        ]} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Processos notáveis (como relator)" />
        <DataTable columns={caseColumns} data={MOCK_CASES} rowKey={(r) => r.id} />
      </section>
    </>
  )
}
