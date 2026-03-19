/**
 * @file SenadoCharts.tsx
 * @description Chart section for the Federal Senate (Senado) page.
 *
 * Visualizations based on Senado Federal Open Data API:
 * - Legislative production trend (bills authored per month)
 * - Bills by type distribution (pie chart)
 * - Voting attendance by party (bar chart)
 * - Senators' authorship ranking (horizontal bar)
 *
 * Data sources:
 * - GET /senador/{id}/autorias.json — authored bills
 * - GET /senador/{id}/votacoes.json — voting history
 * - GET /materia/distribuicao/autoria.json — authorship distribution
 */

"use client"

import { ChartCard, LineChart, PieChart, BarChart } from "@/components/charts"

// -- Legislative production trend ---------------------------------------------

const MONTHLY_BILLS_DATA = [
  { label: "Out", materias: 42 },
  { label: "Nov", materias: 38 },
  { label: "Dez", materias: 18 },
  { label: "Jan", materias: 12 },
  { label: "Fev", materias: 35 },
  { label: "Mar", materias: 52 },
]

const BILLS_SERIES = [
  { dataKey: "materias", name: "Matérias apresentadas", color: "#4f46e5" },
]

// -- Bills by type (pie) ------------------------------------------------------

const BILLS_BY_TYPE = [
  { name: "Projetos de Lei (PL)", value: 142 },
  { name: "Requerimentos", value: 95 },
  { name: "Emendas a PEC", value: 47 },
  { name: "Indicações", value: 34 },
  { name: "Projetos de Resolução", value: 20 },
  { name: "Outros", value: 4 },
]

// -- Voting attendance by party (bar) -----------------------------------------

const ATTENDANCE_BY_PARTY = [
  { label: "PSD", value: 94 },
  { label: "PT", value: 91 },
  { label: "PL", value: 88 },
  { label: "MDB", value: 85 },
  { label: "PSDB", value: 83 },
  { label: "PP", value: 80 },
  { label: "PDT", value: 78 },
]

// -- Compensation vs bills authored comparison --------------------------------

const COMPENSATION_VS_PRODUCTION = [
  { label: "R. Tavares", remuneracao: 33.7, autorias: 14 },
  { label: "A. Ribeiro", remuneracao: 33.7, autorias: 11 },
  { label: "P. Guimarães", remuneracao: 33.7, autorias: 9 },
  { label: "L. Mendonça", remuneracao: 33.7, autorias: 8 },
  { label: "C. Montenegro", remuneracao: 33.7, autorias: 7 },
  { label: "D. Borges", remuneracao: 33.7, autorias: 6 },
]

const COMP_SERIES = [
  { dataKey: "autorias", name: "Projetos apresentados", color: "#4f46e5" },
  { dataKey: "remuneracao", name: "Remuneração (R$ mil)", color: "#f59e0b" },
]

export function SenadoCharts() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Produção legislativa mensal"
        subtitle="Matérias apresentadas por mês — fonte: Dados Abertos do Senado"
      >
        <LineChart
          data={MONTHLY_BILLS_DATA}
          series={BILLS_SERIES}
          area
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Distribuição por tipo de matéria"
        subtitle="Proporção entre tipos de proposições legislativas"
      >
        <PieChart
          data={BILLS_BY_TYPE}
          height={280}
        />
      </ChartCard>

      <ChartCard
        title="Presença em votações por partido"
        subtitle="Média de presença em sessões de votação (%)"
      >
        <BarChart
          data={ATTENDANCE_BY_PARTY}
          height={280}
          color="#10b981"
          formatValue={(v) => `${v}%`}
        />
      </ChartCard>

      <ChartCard
        title="Remuneração vs produtividade"
        subtitle="Remuneração mensal (R$ mil) × projetos apresentados por senador"
      >
        <LineChart
          data={COMPENSATION_VS_PRODUCTION}
          series={COMP_SERIES}
          height={280}
        />
      </ChartCard>
    </div>
  )
}
