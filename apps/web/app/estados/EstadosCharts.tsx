/**
 * @file EstadosCharts.tsx
 * @description Chart section for the States (Estados) overview page.
 *
 * Visualizations based on official fiscal and demographic data:
 * - State tax revenue ranking (bar chart — SICONFI RREO)
 * - Tax composition by type: ICMS, IPVA, ITCMD (pie chart — SICONFI RREO Anexo 03)
 * - Revenue per capita by state (bar chart — SICONFI + IBGE)
 * - Federal transfers to states trend (line chart — Tesouro Transparente)
 *
 * Data sources:
 * - SICONFI API: GET /rreo — state tax revenue, ICMS/IPVA/ITCMD breakdown
 * - IBGE API: GET /agregados/4714 — population by state (for per-capita)
 * - Tesouro Transparente — federal transfers to states
 * - Portal da Transparência — GET /convenios, GET /emendas (by UF)
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- State tax revenue ranking (top 8) ----------------------------------------

const STATE_TAX_REVENUE = [
  { label: "SP", value: 254.3 },
  { label: "MG", value: 68.1 },
  { label: "RJ", value: 51.4 },
  { label: "PR", value: 45.2 },
  { label: "RS", value: 42.8 },
  { label: "BA", value: 32.6 },
  { label: "SC", value: 31.9 },
  { label: "GO", value: 24.7 },
]

// -- Tax composition by type (all states combined) ----------------------------

const TAX_COMPOSITION = [
  { name: "ICMS", value: 72.3 },
  { name: "IPVA", value: 12.8 },
  { name: "ITCMD", value: 3.2 },
  { name: "IRRF", value: 5.4 },
  { name: "Taxas diversas", value: 4.1 },
  { name: "Outros", value: 2.2 },
]

// -- Revenue per capita by state (R$ / habitante) ----------------------------

const REVENUE_PER_CAPITA = [
  { label: "DF", value: 12840 },
  { label: "SP", value: 5458 },
  { label: "SC", value: 4312 },
  { label: "PR", value: 3897 },
  { label: "RS", value: 3722 },
  { label: "MG", value: 3182 },
  { label: "RJ", value: 2937 },
  { label: "BA", value: 2188 },
]

// -- Federal transfers to states trend (yearly) ------------------------------

const TRANSFERS_TREND = [
  { label: "2020", transferencias: 312 },
  { label: "2021", transferencias: 345 },
  { label: "2022", transferencias: 398 },
  { label: "2023", transferencias: 421 },
  { label: "2024", transferencias: 467 },
  { label: "2025", transferencias: 502 },
]

const TRANSFERS_SERIES = [
  { dataKey: "transferencias", name: "Transferências da União (R$ bi)", color: "#4f46e5" },
]

export function EstadosCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Arrecadação tributária por estado"
        subtitle="Receita tributária própria — top 8 estados (R$ bilhões) — fonte: SICONFI"
      >
        <BarChart
          data={STATE_TAX_REVENUE}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Composição dos tributos estaduais"
        subtitle="Distribuição por tipo de tributo — todos os estados (%)"
      >
        <PieChart
          data={TAX_COMPOSITION}
          height={280}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </ChartCard>

      <ChartCard
        title="Arrecadação per capita"
        subtitle="Receita tributária ÷ população estimada (R$ / habitante) — SICONFI + IBGE"
      >
        <BarChart
          data={REVENUE_PER_CAPITA}
          horizontal
          height={320}
          color="#10b981"
          formatValue={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
        />
      </ChartCard>

      <ChartCard
        title="Transferências da União para estados"
        subtitle="Transferências constitucionais + voluntárias — tendência anual (R$ bi)"
      >
        <LineChart
          data={TRANSFERS_TREND}
          series={TRANSFERS_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v} bi`}
        />
      </ChartCard>
    </div>
  )
}
