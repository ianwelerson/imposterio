/**
 * @file page.tsx
 * @description Procurement overview page for the Camara dos Deputados.
 *
 * Displays a summary of procurement processes (licitacoes) for a given year:
 * 1. Hero header with year selector
 * 2. StatCards — totals for procurements, contracted/paid values, savings rate
 * 3. Charts — modality distribution, status breakdown, monthly contracted value
 * 4. Latest procurements table with link to full listing
 * 5. Top suppliers table
 *
 * Data source: bulk procurement files from dadosabertos.camara.leg.br
 * fetched and pre-aggregated via getProcurementBulk().
 *
 * @see https://dadosabertos.camara.leg.br/arquivos/licitacoes/
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable, ToastTrigger, DataFetchError } from "@/components/ui"
import { getProcurementBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { CamaraProcurement } from "@imposterio/types"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { LicitacoesCharts } from "./LicitacoesCharts"
import { aggregateContractsByMonth, formatCurrency } from "./licitacoes-utils"

/** Procurement bulk files are available from 2014 onward. */
const FIRST_YEAR = 2014

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function CamaraLicitacoesPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_YEAR + 1 },
    (_, i) => now - i,
  )

  const errors: PageError[] = []
  const failed = new Set<string>()

  const summary = await collectErrors(
    () => getProcurementBulk(selectedYear),
    emptySourced({
      totalProcurements: 0,
      totalEstimatedValue: 0,
      totalContractedValue: 0,
      totalPaidValue: 0,
      totalContracts: 0,
      byModality: [],
      byStatus: [],
      topSuppliers: [],
      procurements: [],
      contracts: [],
      lastUpdated: "",
    }),
    errors,
    "Licitações",
    failed,
  )

  // Savings rate: how much was saved between estimated and contracted values
  const savingsRate = summary.totalEstimatedValue > 0
    ? (((summary.totalEstimatedValue - summary.totalContractedValue) / summary.totalEstimatedValue) * 100).toFixed(1)
    : "0"

  // Chart data: monthly contracted value from contracts
  const contractsByMonth = aggregateContractsByMonth(summary.contracts)

  // Latest 5 procurements sorted by publication date (most recent first)
  const latest5 = [...summary.procurements]
    .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
    .slice(0, 5)

  // Top 5 suppliers by contracted value
  const top5Suppliers = summary.topSuppliers.slice(0, 5)

  const procurementColumns = [
    {
      header: "ID",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => (
        <Link
          href={`/camara/licitacoes/${row.id}?ano=${selectedYear}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.number}/{row.year}
        </Link>
      ),
    },
    {
      header: "Objeto",
      className: "max-w-xs",
      cell: (row: CamaraProcurement) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.object}</span>
      ),
    },
    {
      header: "Modalidade",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => (
        <span className="text-gray-600 text-xs">{row.modality}</span>
      ),
    },
    {
      header: "Valor contratado",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {formatCurrency(row.contractedValue)}
        </span>
      ),
    },
    {
      header: "Situação",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => {
        const variant = row.status === "Encerrada" || row.status === "Homologada"
          ? "green"
          : row.status === "Revogada" || row.status === "Anulada" || row.status === "Deserta" || row.status === "Fracassada"
            ? "red"
            : "amber"
        return <Badge variant={variant}>{row.status}</Badge>
      },
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => (
        <Link
          href={`/camara/licitacoes/${row.id}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  const supplierColumns = [
    {
      header: "Fornecedor",
      cell: (row: (typeof top5Suppliers)[number]) => (
        <span className="text-sm font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      header: "CNPJ",
      className: "whitespace-nowrap",
      cell: (row: (typeof top5Suppliers)[number]) => (
        <span className="text-gray-600 text-xs tabular-nums">{row.document}</span>
      ),
    },
    {
      header: "Valor total",
      className: "whitespace-nowrap",
      cell: (row: (typeof top5Suppliers)[number]) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {formatCurrency(row.value)}
        </span>
      ),
    },
    {
      header: "Contratos",
      className: "whitespace-nowrap text-center",
      cell: (row: (typeof top5Suppliers)[number]) => (
        <span className="text-sm tabular-nums text-gray-700">{row.contractCount}</span>
      ),
    },
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Hero header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/camara"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar à Câmara
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Licitações</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Processos licitatórios, contratos, itens e pedidos de compra da Câmara dos Deputados.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">Ver dados de</span>
              <YearSelector years={availableYears} selected={selectedYear} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Licitações") ? (
        <DataFetchError label="as licitações" />
      ) : (
        <>
          {/* Resumo geral */}
          <section className="mb-12">
            <SectionHeader title="Resumo geral" sourceUrl={summary._source} />
            <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Licitações"
                  value={String(summary.totalProcurements)}
                  tooltip="Quantidade de processos licitatórios registrados no período selecionado."
                />
                <StatCard
                  label="Valor contratado"
                  value={formatCurrency(summary.totalContractedValue)}
                  tooltip="Soma dos valores acordados em contratos firmados nas licitações. Representa o compromisso financeiro total assumido pela Câmara."
                />
                <StatCard
                  label="Valor pago"
                  value={formatCurrency(summary.totalPaidValue)}
                  tooltip="Soma dos valores efetivamente desembolsados até o momento. Contratos podem ter vigência de anos, por isso o valor pago costuma ser menor que o contratado no mesmo período."
                />
                <StatCard
                  label="Economia estimada"
                  value={`${savingsRate}%`}
                  badge={Number(savingsRate) > 0
                    ? { text: "economia", variant: "green" as const }
                    : Number(savingsRate) < 0
                      ? { text: "acima do estimado", variant: "red" as const }
                      : undefined
                  }
                  tooltip="Percentual de economia entre o valor estimado e o valor efetivamente contratado"
                />
              </div>
            </div>
          </section>

          {/* Charts */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Visualizações" sourceUrl={summary._source} />
            <LicitacoesCharts
              byModality={summary.byModality}
              byStatus={summary.byStatus}
              contractsByMonth={contractsByMonth}
              sourceUrl={summary._source}
            />
          </section>

          {/* Latest procurements */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader
              title={`Últimas licitações (${selectedYear})`}
              sourceUrl={summary._source}
              action={{ label: "Ver todas", href: `/camara/licitacoes/lista?ano=${selectedYear}` }}
            />
            <DataTable columns={procurementColumns} data={latest5} rowKey={(r) => r.id} />
          </section>

          {/* Top suppliers */}
          {top5Suppliers.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader title="Maiores fornecedores" sourceUrl={summary._source} />
              <DataTable
                columns={supplierColumns}
                data={top5Suppliers}
                rowKey={(r) => r.document}
              />
            </section>
          )}
        </>
      )}
    </>
  )
}
