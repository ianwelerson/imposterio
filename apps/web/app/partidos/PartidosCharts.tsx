/**
 * @file PartidosCharts.tsx
 * @description Chart section for the Political Parties overview page.
 *
 * Visualizations based on data from multiple sources:
 * - Câmara API /partidos — party caucus sizes
 * - TSE open data — Fundo Partidário distribution, election results
 * - Portal da Transparência — transfers to parties
 *
 * Charts:
 * - Party fund distribution (bar chart — top recipients)
 * - Caucus size in Congress (bar chart — deputies + senators)
 * - Elected officials by party across last election (bar chart)
 * - Fund distribution over time (line chart — yearly trend)
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Party fund distribution (top recipients) ---------------------------------

const FUND_DISTRIBUTION = [
  { label: "PL", value: 89.4 },
  { label: "PT", value: 82.1 },
  { label: "UNIÃO", value: 64.3 },
  { label: "MDB", value: 52.7 },
  { label: "PP", value: 48.9 },
  { label: "PSD", value: 45.2 },
  { label: "REPUBLICANOS", value: 38.6 },
  { label: "PSDB", value: 24.1 },
]

// -- Caucus size in Congress (deputies + senators) ----------------------------

const CAUCUS_SIZE = [
  { label: "PL", value: 99 },
  { label: "PT", value: 80 },
  { label: "UNIÃO", value: 59 },
  { label: "MDB", value: 55 },
  { label: "PP", value: 50 },
  { label: "PSD", value: 46 },
  { label: "REPUBLICANOS", value: 41 },
  { label: "PSDB", value: 18 },
]

// -- Elected officials by party (last election, all positions) ----------------

const ELECTED_BY_PARTY = [
  { name: "PL", value: 2214 },
  { name: "MDB", value: 1987 },
  { name: "PSD", value: 1654 },
  { name: "PP", value: 1432 },
  { name: "UNIÃO", value: 1389 },
  { name: "PT", value: 1245 },
  { name: "REPUBLICANOS", value: 1102 },
  { name: "Outros", value: 4890 },
]

// -- Fund distribution over time (yearly) ------------------------------------

const FUND_YEARLY = [
  { label: "2020", total: 1890 },
  { label: "2021", total: 2030 },
  { label: "2022", total: 4960 },
  { label: "2023", total: 2180 },
  { label: "2024", total: 4960 },
  { label: "2025", total: 2350 },
]

const FUND_YEARLY_SERIES = [
  { dataKey: "total", name: "Fundo total distribuído (R$ mi)", color: "#4f46e5" },
]

export function PartidosCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Fundo Partidário — maiores beneficiários"
        subtitle="Distribuição anual por partido (R$ milhões) — fonte: TSE"
      >
        <BarChart
          data={FUND_DISTRIBUTION}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} mi`}
        />
      </ChartCard>

      <ChartCard
        title="Bancada no Congresso Nacional"
        subtitle="Deputados + senadores por partido — fonte: Câmara + Senado APIs"
      >
        <BarChart
          data={CAUCUS_SIZE}
          height={280}
          formatValue={(v) => `${v} parlamentares`}
        />
      </ChartCard>

      <ChartCard
        title="Eleitos por partido (última eleição)"
        subtitle="Todos os cargos — deputados, senadores, governadores, prefeitos, vereadores"
      >
        <PieChart
          data={ELECTED_BY_PARTY}
          height={280}
          formatValue={(v) => `${v.toLocaleString("pt-BR")} eleitos`}
        />
      </ChartCard>

      <ChartCard
        title="Fundos públicos distribuídos — tendência"
        subtitle="Fundo Partidário + Fundo Eleitoral por ano (R$ milhões)"
      >
        <LineChart
          data={FUND_YEARLY}
          series={FUND_YEARLY_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")} mi`}
        />
      </ChartCard>
    </div>
  )
}
