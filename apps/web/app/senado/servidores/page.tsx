/**
 * @file page.tsx
 * @description Civil servants overview page for the Senado Federal.
 *
 * Aggregates two endpoints from the Senado administrative API:
 * - `/servidores/servidores` — full personnel list (effective + commissioned)
 * - `/servidores/quantitativos/pessoal` — career-class headcount totals
 *
 * Sections:
 * 1. Hero header with chamber identity + source pill
 * 2. StatCards — total active, total inactive, total vacancies, payroll
 *    headcount in the latest available month
 * 3. Charts — distribution by bond type and category
 * 4. Latest payroll month — total net pay, base salary, commissioned-staff pay
 * 5. Latest records table with link to the full listing
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable, SourcePill, ToastTrigger, DataFetchError } from "@/components/ui"
import { ChartCard, BarChart } from "@/components/charts"
import type { BarChartItem } from "@/components/charts"
import {
  getSenadoServantsBulk,
  getSenadoServantsRemuneration,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type {
  SenadoServant,
  SenadoServantsSummary,
  SenadoRemunerationSummary,
} from "@imposterio/types"

const EMPTY_SERVANTS: SenadoServantsSummary = {
  totalActive: 0,
  totalInactive: 0,
  totalVacancies: 0,
  byBond: [],
  byStatus: [],
  byCategory: [],
  headcount: [],
  members: [],
  lastUpdated: "",
}

const EMPTY_REMUNERATION: SenadoRemunerationSummary = {
  year: 0,
  month: 0,
  totalNetPay: 0,
  totalBaseSalary: 0,
  totalCommissionedPay: 0,
  paidHeadcount: 0,
  rows: [],
  lastUpdated: "",
}

/** Formats a BRL value as a localized currency string. */
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}

/**
 * Picks the most recent past month for which payroll is likely published.
 *
 * The Senate publishes payroll on a delay; we fall back two months to maximize
 * the chance of hitting a populated dataset. If the picked month yields zero
 * rows the page just shows the headcount data without payroll figures.
 */
function pickPayrollMonth(): { year: number; month: number } {
  const now = new Date()
  // Step back ~2 months to land on a published roll.
  now.setMonth(now.getMonth() - 2)
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default async function SenadoServidoresPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const { year: payrollYear, month: payrollMonth } = pickPayrollMonth()

  const [servants, payroll] = await Promise.all([
    collectErrors(
      () => getSenadoServantsBulk(),
      emptySourced(EMPTY_SERVANTS),
      errors,
      "Servidores",
      failed,
    ),
    collectErrors(
      () => getSenadoServantsRemuneration(payrollYear, payrollMonth),
      emptySourced(EMPTY_REMUNERATION),
      errors,
      "Folha de pagamento",
      failed,
    ),
  ])

  const bondBars: BarChartItem[] = servants.byBond
    .slice(0, 8)
    .map((b) => ({ label: b.name, value: b.count }))

  const categoryBars: BarChartItem[] = servants.byCategory
    .slice(0, 8)
    .map((c) => ({ label: c.name, value: c.count }))

  // Latest 8 active records sorted by admission year (newest first) — gives
  // a sample of recent hires without requiring a separate detail page.
  const latest8 = [...servants.members]
    .filter((m) => m.status === "ATIVO")
    .sort((a, b) => b.admissionYear - a.admissionYear)
    .slice(0, 8)

  const memberColumns = [
    {
      header: "Nome",
      cell: (r: SenadoServant) => (
        <span className="text-sm font-medium text-gray-900">{r.name}</span>
      ),
    },
    {
      header: "Vínculo",
      className: "whitespace-nowrap",
      cell: (r: SenadoServant) => {
        const variant = r.bond === "EFETIVO" ? "gray" : r.bond === "COMISSIONADO" ? "amber" : "gray"
        return <Badge variant={variant as "gray" | "amber"}>{r.bond || "—"}</Badge>
      },
    },
    {
      header: "Cargo",
      className: "max-w-[14rem]",
      cell: (r: SenadoServant) => (
        <span className="text-gray-700 text-xs truncate block">{r.position || r.role || "—"}</span>
      ),
    },
    {
      header: "Lotação",
      className: "max-w-[14rem]",
      cell: (r: SenadoServant) => (
        <span className="text-gray-600 text-xs truncate block">{r.departmentName || "—"}</span>
      ),
    },
    {
      header: "Admissão",
      className: "whitespace-nowrap",
      cell: (r: SenadoServant) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {r.admissionYear > 0 ? r.admissionYear : "—"}
        </span>
      ),
    },
  ]

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" })
    .format(new Date(payroll.year || payrollYear, (payroll.month || payrollMonth) - 1, 1))

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Hero header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/senado"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar ao Senado
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Servidores do Senado</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Quadro funcional permanente, comissionados e folha mensal de remuneração.
              </p>
            </div>
            {servants._source && (
              <div className="shrink-0">
                <SourcePill url={servants._source} />
              </div>
            )}
          </div>
        </div>
      </header>

      {failed.has("Servidores") ? (
        <DataFetchError label="os servidores" />
      ) : (
        <>
          {/* Resumo geral — headcount */}
          <section className="mb-12">
            <SectionHeader title="Quadro de pessoal" sourceUrl={servants._source} />
            <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Servidores ativos"
                  value={servants.totalActive.toLocaleString("pt-BR")}
                  tooltip="Total ativo de servidores agregado pelo endpoint de quantitativos. Inclui efetivos e cargos em comissão."
                />
                <StatCard
                  label="Inativos"
                  value={servants.totalInactive.toLocaleString("pt-BR")}
                  tooltip="Soma de aposentados e beneficiários de pensão."
                />
                <StatCard
                  label="Vagas em aberto"
                  value={servants.totalVacancies.toLocaleString("pt-BR")}
                  tooltip="Posições previstas no quadro que não estão ocupadas hoje."
                />
                <StatCard
                  label="Folha publicada"
                  value={
                    payroll.paidHeadcount > 0
                      ? `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${payroll.year}`
                      : "Indisponível"
                  }
                  tooltip="Mês de referência da folha de pagamento mais recente disponível na API administrativa."
                />
              </div>
            </div>
          </section>

          {/* Payroll KPIs */}
          {payroll.paidHeadcount > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader
                title={`Folha — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${payroll.year}`}
                sourceUrl={payroll._source}
              />
              <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="Servidores pagos"
                    value={payroll.paidHeadcount.toLocaleString("pt-BR")}
                    tooltip="Quantidade de pessoas com pagamento registrado na folha do mês — incluindo aposentados e pensionistas."
                  />
                  <StatCard
                    label="Líquido total"
                    value={formatCurrency(payroll.totalNetPay)}
                    tooltip="Soma das remunerações líquidas (após descontos legais) pagas no mês."
                  />
                  <StatCard
                    label="Salário-base total"
                    value={formatCurrency(payroll.totalBaseSalary)}
                    tooltip="Soma das remunerações básicas antes de vantagens, descontos e gratificações."
                  />
                  <StatCard
                    label="Comissionados"
                    value={formatCurrency(payroll.totalCommissionedPay)}
                    tooltip="Parcela líquida da folha destinada apenas a servidores em cargo de comissão (gabinetes parlamentares e cargos de chefia)."
                  />
                </div>
              </div>
            </section>
          )}

          {/* Distribution charts */}
          {(bondBars.length > 0 || categoryBars.length > 0) && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader title="Distribuição" sourceUrl={servants._source} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bondBars.length > 0 && (
                  <ChartCard
                    title="Por vínculo"
                    subtitle="Efetivos, comissionados, requisitados e demais"
                    sourceUrl={servants._source}
                  >
                    <BarChart data={bondBars} color="#4f46e5" horizontal />
                  </ChartCard>
                )}
                {categoryBars.length > 0 && (
                  <ChartCard
                    title="Por categoria"
                    subtitle="Carreiras e cargos previstos no quadro funcional"
                    sourceUrl={servants._source}
                  >
                    <BarChart data={categoryBars} color="#0891b2" horizontal />
                  </ChartCard>
                )}
              </div>
            </section>
          )}

          {/* Latest hires */}
          {latest8.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader
                title="Servidores ativos recentes"
                sourceUrl={servants._source}
                action={{ label: "Ver todos", href: "/senado/servidores/lista" }}
              />
              <DataTable columns={memberColumns} data={latest8} rowKey={(r) => r.id} />
            </section>
          )}
        </>
      )}
    </>
  )
}
