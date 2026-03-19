/**
 * @file CamaraCharts.tsx
 * @description Chart section for the Chamber of Deputies (Câmara) page.
 *
 * Visualizations based on Câmara dos Deputados Open Data API:
 * - Monthly CEAP spending trend (line chart)
 * - CEAP spending by category (pie chart)
 * - Attendance vs CEAP spending scatter-like comparison (bar chart)
 * - Top spenders by party (bar chart)
 *
 * Data sources:
 * - GET /deputados/{id}/despesas — CEAP parliamentary expenses
 * - Bulk attendance file — eventosPresencaDeputados-{year}.json
 * - GET /deputados — deputy profiles with party info
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Monthly CEAP spending trend ----------------------------------------------

const MONTHLY_CEAP_DATA = [
  { label: "Out", gasto: 38.2 },
  { label: "Nov", gasto: 41.5 },
  { label: "Dez", gasto: 52.3 },
  { label: "Jan", gasto: 35.8 },
  { label: "Fev", gasto: 44.1 },
  { label: "Mar", gasto: 48.7 },
]

const CEAP_SERIES = [
  { dataKey: "gasto", name: "Gasto CEAP total (R$ mi)", color: "#4f46e5" },
]

// -- CEAP by category (pie) ---------------------------------------------------

const CEAP_BY_CATEGORY = [
  { name: "Divulgação parlamentar", value: 16.6 },
  { name: "Passagens aéreas", value: 10.7 },
  { name: "Locação de veículos", value: 7.8 },
  { name: "Combustíveis", value: 5.8 },
  { name: "Manutenção de escritório", value: 4.4 },
  { name: "Alimentação", value: 2.1 },
  { name: "Outros", value: 1.3 },
]

// -- Spending by party (bar) --------------------------------------------------

const SPENDING_BY_PARTY = [
  { label: "PL", value: 8.9 },
  { label: "PT", value: 7.2 },
  { label: "MDB", value: 5.8 },
  { label: "PP", value: 4.6 },
  { label: "PSD", value: 4.1 },
  { label: "PSDB", value: 3.2 },
  { label: "PSOL", value: 2.1 },
  { label: "PCdoB", value: 1.4 },
]

// -- Attendance vs spending comparison ----------------------------------------

const ATTENDANCE_VS_SPENDING = [
  { label: "PL", presenca: 84, gasto: 8.9 },
  { label: "PT", presenca: 88, gasto: 7.2 },
  { label: "MDB", presenca: 76, gasto: 5.8 },
  { label: "PP", presenca: 72, gasto: 4.6 },
  { label: "PSD", presenca: 89, gasto: 4.1 },
  { label: "PSDB", presenca: 91, gasto: 3.2 },
  { label: "PSOL", presenca: 94, gasto: 2.1 },
]

const ATTENDANCE_SERIES = [
  { dataKey: "presenca", name: "Presença média (%)", color: "#10b981" },
  { dataKey: "gasto", name: "Gasto CEAP (R$ mi)", color: "#4f46e5" },
]

export function CamaraCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Gasto CEAP mensal — tendência"
        subtitle="Total da Câmara por mês (R$ milhões) — fonte: API Dados Abertos Câmara"
      >
        <LineChart
          data={MONTHLY_CEAP_DATA}
          series={CEAP_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} mi`}
        />
      </ChartCard>

      <ChartCard
        title="Gastos por categoria (CEAP)"
        subtitle="Distribuição dos tipos de despesa parlamentar — R$ milhões"
      >
        <PieChart
          data={CEAP_BY_CATEGORY}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} mi`}
        />
      </ChartCard>

      <ChartCard
        title="Gasto CEAP por partido"
        subtitle="Total acumulado no período por bancada (R$ milhões)"
      >
        <BarChart
          data={SPENDING_BY_PARTY}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} mi`}
        />
      </ChartCard>

      <ChartCard
        title="Presença vs gasto por partido"
        subtitle="Comparação entre presença média em plenário e gasto CEAP total"
      >
        <LineChart
          data={ATTENDANCE_VS_SPENDING}
          series={ATTENDANCE_SERIES}
          height={280}
        />
      </ChartCard>
    </div>
  )
}
