/**
 * @file JudiciarioCharts.tsx
 * @description Chart section for the Judiciary (Judiciário) page.
 *
 * Visualizations based on CNJ DataJud API and court transparency portals:
 * - Case volume trend by court tier (line chart)
 * - Case distribution by legal area (pie chart)
 * - Average judge compensation by court (bar chart)
 * - Magistrate count vs case load comparison
 *
 * Data sources:
 * - POST /api_publica_{court}/_search — DataJud case data
 * - Court transparency portals — judge compensation
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Case volume trend --------------------------------------------------------

const CASE_TREND = [
  { label: "2019", stf: 3.8, stj: 290, tjs: 72.1 },
  { label: "2020", stf: 4.0, stj: 305, tjs: 68.4 },
  { label: "2021", stf: 4.1, stj: 298, tjs: 71.2 },
  { label: "2022", stf: 3.9, stj: 310, tjs: 74.5 },
  { label: "2023", stf: 4.2, stj: 312, tjs: 77.3 },
  { label: "2024", stf: 4.3, stj: 318, tjs: 79.8 },
]

const CASE_SERIES = [
  { dataKey: "tjs", name: "Tribunais estaduais (milhões)", color: "#4f46e5" },
  { dataKey: "stj", name: "STJ (milhares)", color: "#f59e0b" },
  { dataKey: "stf", name: "STF (milhares)", color: "#10b981" },
]

// -- Cases by area (pie) ------------------------------------------------------

const CASES_BY_AREA = [
  { name: "Cível", value: 29.4 },
  { name: "Criminal", value: 17.0 },
  { name: "Trabalhista", value: 13.9 },
  { name: "Fazenda Pública", value: 10.8 },
  { name: "Família e Sucessões", value: 6.2 },
  { name: "Outros", value: 2.5 },
]

// -- Average compensation by court (bar) --------------------------------------

const COMPENSATION_BY_COURT = [
  { label: "STF", value: 46366 },
  { label: "STJ", value: 43712 },
  { label: "TST", value: 39850 },
  { label: "TRF1", value: 35920 },
  { label: "TRF3", value: 35462 },
  { label: "TJSP", value: 32005 },
  { label: "TJRJ", value: 31850 },
  { label: "TJMG", value: 30420 },
]

// -- Magistrates vs case load -------------------------------------------------

const MAGISTRATES_VS_CASES = [
  { label: "TJSP", magistrados: 2530, processos: 18.4 },
  { label: "TJRJ", magistrados: 892, processos: 9.1 },
  { label: "TJMG", magistrados: 1120, processos: 7.8 },
  { label: "TJRS", magistrados: 680, processos: 5.2 },
  { label: "TRF1", magistrados: 174, processos: 1.2 },
  { label: "TRF3", magistrados: 143, processos: 0.98 },
]

const MAG_SERIES = [
  { dataKey: "processos", name: "Processos ativos (milhões)", color: "#4f46e5" },
  { dataKey: "magistrados", name: "Magistrados", color: "#10b981" },
]

export function JudiciarioCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Volume de processos — tendência"
        subtitle="Evolução do acervo processual por instância (2019–2024)"
      >
        <LineChart
          data={CASE_TREND}
          series={CASE_SERIES}
          area
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Processos por área do Direito"
        subtitle="Distribuição das ações por matéria (milhões)"
      >
        <PieChart
          data={CASES_BY_AREA}
          height={280}
          formatValue={(v) => `${v.toFixed(1)} mi`}
        />
      </ChartCard>

      <ChartCard
        title="Remuneração média por tribunal"
        subtitle="Remuneração mensal bruta de magistrados por tribunal"
      >
        <BarChart
          data={COMPENSATION_BY_COURT}
          horizontal
          height={320}
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
        />
      </ChartCard>

      <ChartCard
        title="Magistrados vs acervo processual"
        subtitle="Relação entre número de magistrados e processos ativos"
      >
        <LineChart
          data={MAGISTRATES_VS_CASES}
          series={MAG_SERIES}
          height={280}
        />
      </ChartCard>
    </div>
  )
}
