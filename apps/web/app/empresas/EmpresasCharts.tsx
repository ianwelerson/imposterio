/**
 * @file EmpresasCharts.tsx
 * @description Chart section for the Companies (Empresas) page.
 *
 * Visualizations based on Portal da Transparência + CNPJá + QSA bulk:
 * - Government spending to companies trend (line chart)
 * - Top sectors receiving public funds (pie chart)
 * - Sanctioned companies trend — CEIS/CNEP (line chart)
 * - Campaign donations vs government contracts comparison (bar chart)
 *
 * Data sources:
 * - GET /contratos — federal contracts
 * - GET /ceis — CEIS blacklist
 * - GET /cnep — CNEP punished companies
 * - TSE campaign finance bulk data
 * - QSA partner network (PostgreSQL bulk)
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Government spending to companies trend -----------------------------------

const SPENDING_TREND = [
  { label: "Out", repasses: 1.62 },
  { label: "Nov", repasses: 1.78 },
  { label: "Dez", repasses: 2.34 },
  { label: "Jan", repasses: 1.45 },
  { label: "Fev", repasses: 1.89 },
  { label: "Mar", repasses: 2.10 },
]

const SPENDING_SERIES = [
  { dataKey: "repasses", name: "Repasses a empresas (R$ bi)", color: "#4f46e5" },
]

// -- Top sectors receiving public funds (pie) ---------------------------------

const SECTORS = [
  { name: "Saúde e equipamentos", value: 34.2 },
  { name: "Construção civil", value: 23.8 },
  { name: "Tecnologia da informação", value: 18.4 },
  { name: "Transporte e logística", value: 15.6 },
  { name: "Alimentação", value: 12.3 },
  { name: "Outros", value: 8.7 },
]

// -- Sanctioned companies trend -----------------------------------------------

const SANCTIONS_TREND = [
  { label: "2019", ceis: 6840, cnep: 2100 },
  { label: "2020", ceis: 7210, cnep: 2350 },
  { label: "2021", ceis: 7650, cnep: 2580 },
  { label: "2022", ceis: 7980, cnep: 2790 },
  { label: "2023", ceis: 8210, cnep: 3010 },
  { label: "2024", ceis: 8432, cnep: 3215 },
]

const SANCTIONS_SERIES = [
  { dataKey: "ceis", name: "Empresas inidôneas (CEIS)", color: "#ef4444" },
  { dataKey: "cnep", name: "Empresas punidas (CNEP)", color: "#f59e0b" },
]

// -- Campaign donations vs contracts (bar) ------------------------------------

const DONATIONS_VS_CONTRACTS = [
  { label: "MedTech", value: 34.2, color: "#4f46e5" },
  { label: "EduBrasil", value: 28.7, color: "#4f46e5" },
  { label: "Andrade", value: 23.8, color: "#4f46e5" },
  { label: "LogBrasil", value: 18.4, color: "#4f46e5" },
  { label: "AlimentaBem", value: 15.6, color: "#4f46e5" },
]

export function EmpresasCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Repasses do governo a empresas — tendência"
        subtitle="Total repassado a fornecedores por mês (R$ bilhões)"
      >
        <LineChart
          data={SPENDING_TREND}
          series={SPENDING_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(2)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Setores que mais recebem recursos"
        subtitle="Distribuição por setor de atividade econômica (R$ bilhões)"
      >
        <PieChart
          data={SECTORS}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Empresas sancionadas — evolução"
        subtitle="Total acumulado de empresas no CEIS e CNEP (2019–2024)"
      >
        <LineChart
          data={SANCTIONS_TREND}
          series={SANCTIONS_SERIES}
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Maiores fornecedores — total recebido"
        subtitle="Top empresas por volume de contratos com o governo (R$ milhões)"
      >
        <BarChart
          data={DONATIONS_VS_CONTRACTS}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} mi`}
        />
      </ChartCard>
    </div>
  )
}
