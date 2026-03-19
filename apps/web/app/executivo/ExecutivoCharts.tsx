/**
 * @file ExecutivoCharts.tsx
 * @description Chart section for the Federal Executive page.
 *
 * Visualizations based on Portal da Transparência API:
 * - Monthly payroll trend (line chart)
 * - Compensation distribution by range (bar chart)
 * - Spending by agency (pie chart)
 * - Contracts vs government card spending trend
 *
 * Data sources:
 * - GET /servidores — civil servants
 * - GET /servidores/{id}/remuneracao — compensation breakdown
 * - GET /contratos — federal contracts
 * - GET /cartoes — government payment card spending
 * - GET /viagens — official government travel
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Monthly payroll trend ----------------------------------------------------

const MONTHLY_PAYROLL = [
  { label: "Out", folha: 17.4, cartoes: 0.32 },
  { label: "Nov", folha: 17.6, cartoes: 0.28 },
  { label: "Dez", folha: 18.1, cartoes: 0.45 },
  { label: "Jan", folha: 17.8, cartoes: 0.22 },
  { label: "Fev", folha: 17.9, cartoes: 0.31 },
  { label: "Mar", folha: 18.2, cartoes: 0.38 },
]

const PAYROLL_SERIES = [
  { dataKey: "folha", name: "Folha de pagamento (R$ bi)", color: "#4f46e5" },
  { dataKey: "cartoes", name: "Cartão corporativo (R$ bi)", color: "#ef4444" },
]

// -- Compensation ranges (bar) ------------------------------------------------

const COMP_RANGES = [
  { label: "Até R$ 5 mil", value: 142000 },
  { label: "R$ 5–10 mil", value: 186000 },
  { label: "R$ 10–20 mil", value: 134000 },
  { label: "R$ 20–30 mil", value: 78000 },
  { label: "R$ 30–40 mil", value: 32000 },
  { label: "Acima R$ 40 mil", value: 11241 },
]

// -- Spending by agency (pie) -------------------------------------------------

const SPENDING_BY_AGENCY = [
  { name: "Min. Saúde", value: 42.3 },
  { name: "Min. Educação", value: 34.6 },
  { name: "Min. Defesa", value: 28.9 },
  { name: "Min. Infraestrutura", value: 23.1 },
  { name: "Min. Ciência e Tecnologia", value: 15.4 },
  { name: "Outros", value: 48.2 },
]

// -- Contracts trend ----------------------------------------------------------

const CONTRACTS_TREND = [
  { label: "Out", contratos: 1820, viagens: 480 },
  { label: "Nov", contratos: 2150, viagens: 520 },
  { label: "Dez", contratos: 1340, viagens: 310 },
  { label: "Jan", contratos: 1680, viagens: 390 },
  { label: "Fev", contratos: 2310, viagens: 540 },
  { label: "Mar", contratos: 2480, viagens: 620 },
]

const CONTRACTS_SERIES = [
  { dataKey: "contratos", name: "Novos contratos", color: "#4f46e5" },
  { dataKey: "viagens", name: "Viagens oficiais", color: "#f59e0b" },
]

export function ExecutivoCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Folha + cartão corporativo — tendência"
        subtitle="Folha de pagamento e gastos com cartão corporativo por mês (R$ bilhões)"
      >
        <LineChart
          data={MONTHLY_PAYROLL}
          series={PAYROLL_SERIES}
          area
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(2)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Distribuição por faixa salarial"
        subtitle="Servidores ativos agrupados por faixa de remuneração bruta"
      >
        <BarChart
          data={COMP_RANGES}
          height={280}
          formatValue={(v) => `${(v / 1000).toFixed(0)} mil servidores`}
        />
      </ChartCard>

      <ChartCard
        title="Gastos por órgão"
        subtitle="Contratos + despesas operacionais por ministério (R$ bilhões)"
      >
        <PieChart
          data={SPENDING_BY_AGENCY}
          height={280}
          formatValue={(v) => `R$ ${v.toFixed(1)} bi`}
        />
      </ChartCard>

      <ChartCard
        title="Contratos e viagens — tendência"
        subtitle="Novos contratos firmados e viagens oficiais por mês"
      >
        <LineChart
          data={CONTRACTS_TREND}
          series={CONTRACTS_SERIES}
          height={280}
        />
      </ChartCard>
    </div>
  )
}
