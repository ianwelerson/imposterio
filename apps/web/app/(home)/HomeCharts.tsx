/**
 * @file HomeCharts.tsx
 * @description Chart section for the home dashboard.
 *
 * Displays cross-branch comparative visualizations:
 * - Monthly public cost trend (salaries + expenses across all branches)
 * - Cost breakdown by branch (pie chart)
 * - Top 10 highest-paid public officials (bar chart)
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Monthly cost trend (all branches combined) --------------------------------

const MONTHLY_COST_DATA = [
  { label: "Out", salarios: 16.8, despesas: 1.2 },
  { label: "Nov", salarios: 16.9, despesas: 1.4 },
  { label: "Dez", salarios: 17.3, despesas: 1.8 },
  { label: "Jan", salarios: 17.1, despesas: 1.1 },
  { label: "Fev", salarios: 17.5, despesas: 1.3 },
  { label: "Mar", salarios: 18.2, despesas: 1.5 },
]

const COST_SERIES = [
  { dataKey: "salarios", name: "Salários (R$ bi)", color: "#4f46e5" },
  { dataKey: "despesas", name: "Despesas operacionais (R$ bi)", color: "#f59e0b" },
]

// -- Cost distribution by branch (pie) ----------------------------------------

const BRANCH_COST_DATA = [
  { name: "Executivo Federal", value: 14.2 },
  { name: "Judiciário", value: 2.8 },
  { name: "Câmara dos Deputados", value: 0.7 },
  { name: "Senado Federal", value: 0.4 },
  { name: "Estados e Municípios", value: 0.3 },
]

// -- Top officials by compensation (bar) --------------------------------------

const TOP_COMPENSATION_DATA = [
  { label: "Min. STF", value: 46366 },
  { label: "Min. STJ", value: 43712 },
  { label: "Desemb. TJSP", value: 35920 },
  { label: "Auditor-Fiscal", value: 35463 },
  { label: "Senador", value: 33763 },
  { label: "Procurador Fed.", value: 33689 },
  { label: "Diplomata 1ª Cl.", value: 30935 },
  { label: "Analista BACEN", value: 28316 },
]

// -- State tax revenue by region (bar) ----------------------------------------

const STATE_REVENUE_BY_REGION = [
  { label: "Sudeste", value: 390.0 },
  { label: "Sul", value: 119.9 },
  { label: "Nordeste", value: 103.5 },
  { label: "Centro-Oeste", value: 94.8 },
  { label: "Norte", value: 28.7 },
]

export function HomeCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Custo mensal — tendência"
        subtitle="Salários + despesas operacionais de todos os poderes (R$ bilhões)"
      >
        <LineChart
          data={MONTHLY_COST_DATA}
          series={COST_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Distribuição de custo por poder"
        subtitle="Folha mensal estimada — proporção entre poderes e esferas"
      >
        <PieChart
          data={BRANCH_COST_DATA}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Maiores remunerações por cargo"
        subtitle="Teto remuneratório e maiores salários-base entre cargos públicos"
      >
        <BarChart
          data={TOP_COMPENSATION_DATA}
          horizontal
          height={320}
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
        />
      </ChartCard>

      <ChartCard
        title="Arrecadação estadual por região"
        subtitle="Receita tributária própria dos 27 estados (R$ bilhões) — SICONFI"
      >
        <BarChart
          data={STATE_REVENUE_BY_REGION}
          height={280}
          color="#10b981"
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>
    </div>
  )
}
