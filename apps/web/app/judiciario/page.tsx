/**
 * @file page.tsx
 * @description Judiciary (Judiciário) overview page.
 *
 * Displays data about Brazilian courts: case volumes, judge compensation,
 * and productivity across different court systems (STF, STJ, TRFs, TJs).
 *
 * Data sources:
 * - CNJ DataJud: https://api-publica.datajud.cnj.jus.br
 * - Court transparency portals (judge compensation)
 *
 * Currently renders static mock data — real integration pending.
 */

import {
  TopBar, StatCard, DataTable, SourcePill,
  SectionHeader, RankingList,
} from "@/components/ui"
import { JudiciarioGameCard } from "./JudiciarioGameCard"
import { JudiciarioCharts } from "./JudiciarioCharts"

// -- Mock data ---------------------------------------------------------------

interface CourtRow {
  id: string
  court: string
  activeCases: string
  judgesCount: string
  avgCompensation: string
  _source: string
}

const MOCK_COURTS: CourtRow[] = [
  { id: "stf", court: "STF — Supremo Tribunal Federal", activeCases: "4.231", judgesCount: "11", avgCompensation: "R$ 46.366,19", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search" },
  { id: "stj", court: "STJ — Superior Tribunal de Justiça", activeCases: "312.450", judgesCount: "33", avgCompensation: "R$ 43.712,00", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search" },
  { id: "trf1", court: "TRF1 — Tribunal Regional Federal 1ª Região", activeCases: "1.245.320", judgesCount: "174", avgCompensation: "R$ 35.919,85", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search" },
  { id: "trf3", court: "TRF3 — 3ª Região (SP/MS)", activeCases: "982.100", judgesCount: "143", avgCompensation: "R$ 35.462,30", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_trf3/_search" },
  { id: "tjsp", court: "TJSP — Tribunal de Justiça de São Paulo", activeCases: "18.432.500", judgesCount: "2.530", avgCompensation: "R$ 32.004,77", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search" },
  { id: "tjrj", court: "TJRJ — Tribunal de Justiça do Rio de Janeiro", activeCases: "9.120.340", judgesCount: "892", avgCompensation: "R$ 31.850,00", _source: "https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search" },
]

const CASE_TYPES = [
  { id: "1", name: "Cível", percentage: 37 },
  { id: "2", name: "Criminal", percentage: 21 },
  { id: "3", name: "Trabalhista", percentage: 17 },
  { id: "4", name: "Fazenda Pública", percentage: 14 },
  { id: "5", name: "Família e Sucessões", percentage: 8 },
  { id: "6", name: "Outros", percentage: 3 },
]

const courtColumns = [
  { header: "Tribunal", cell: (r: CourtRow) => <span className="font-medium text-gray-900">{r.court}</span> },
  { header: "Processos ativos", align: "right" as const, cell: (r: CourtRow) => <span className="text-gray-600">{r.activeCases}</span> },
  { header: "Magistrados", align: "right" as const, cell: (r: CourtRow) => <span className="text-gray-600">{r.judgesCount}</span> },
  { header: "Remuneração média", align: "right" as const, cell: (r: CourtRow) => <span className="font-semibold text-gray-900">{r.avgCompensation}</span> },
  { header: "Fonte", align: "center" as const, cell: (r: CourtRow) => <SourcePill url={r._source} /> },
]

export default function JudiciarioPage() {
  return (
    <>
      <TopBar title="Judiciário" defaultPeriod="30d" />

      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores do Judiciário"
          >
            <StatCard label="Tribunais monitorados" value="91" />
            <StatCard label="Processos ativos (total)" value="79,8 mi" badge={{ text: "+3,2% vs ano anterior", variant: "red" }} />
            <StatCard label="Magistrados" value="18.091" />
            <StatCard label="Maior remuneração" value="R$ 46.366,19" badge={{ text: "Teto constitucional", variant: "amber" }} />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Gráficos e comparativos" />
        <JudiciarioCharts />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Tribunais — visão geral" action={{ label: "Ver magistrados", href: "/judiciario/magistrados" }} />
        <DataTable columns={courtColumns} data={MOCK_COURTS} rowKey={(r) => r.id} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Processos por área" />
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <RankingList items={CASE_TYPES} />
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <JudiciarioGameCard />
      </section>
    </>
  )
}
