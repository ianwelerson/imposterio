/**
 * @file page.tsx
 * @description Contracts overview page for the Senado Federal.
 *
 * The Senado administrative API publishes contracts at
 * `adm-dadosabertos/api/v1/contratacoes/contratos`. Unlike Câmara's
 * licitação files, contract values are not inline on the contract record —
 * they require walking to the per-contract `/pagamentos` endpoint. This page
 * therefore presents counts and metadata (modality, sub-species, year,
 * top contractors) instead of total values.
 *
 * Sections:
 * 1. Hero header with chamber identity + source pill
 * 2. StatCards — total contracts, active contracts, distinct contractors
 * 3. Charts — contracts by year + by sub-species
 * 4. Latest contracts table with link to full listing
 * 5. Top contractors table
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable, SourcePill, ToastTrigger, DataFetchError } from "@/components/ui"
import { ChartCard, BarChart } from "@/components/charts"
import type { BarChartItem } from "@/components/charts"
import {
  getSenadoContractsBulk,
  getSenadoOutsourcedWorkers,
  getSenadoPurchaseOrders,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type {
  SenadoContract,
  SenadoContractsSummary,
  SenadoOutsourcedWorker,
  SenadoPurchaseOrder,
} from "@imposterio/types"

const EMPTY_SUMMARY: SenadoContractsSummary = {
  totalContracts: 0,
  activeContracts: 0,
  bySubSpecies: [],
  byYear: [],
  byModality: [],
  topContractors: [],
  contracts: [],
  lastUpdated: "",
}

export default async function SenadoContratacoesPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const [summary, outsourced, empenhos] = await Promise.all([
    collectErrors(
      () => getSenadoContractsBulk(),
      emptySourced(EMPTY_SUMMARY),
      errors,
      "Contratações",
      failed,
    ),
    collectErrors(
      () => getSenadoOutsourcedWorkers(),
      emptySourced<SenadoOutsourcedWorker[]>([]),
      errors,
      "Terceirizados",
      failed,
    ),
    collectErrors(
      () => getSenadoPurchaseOrders(),
      emptySourced<SenadoPurchaseOrder[]>([]),
      errors,
      "Empenhos",
      failed,
    ),
  ])

  const activeOutsourced = outsourced.filter((w) => w.isActive).length
  const totalEmpenhoValue = empenhos.reduce((sum, e) => sum + e.amount, 0)
  const top10Empenhos = [...empenhos]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Latest 5 contracts by signature date (newest first).
  const latest5 = [...summary.contracts]
    .sort((a, b) => (a.signatureDate < b.signatureDate ? 1 : a.signatureDate > b.signatureDate ? -1 : 0))
    .slice(0, 5)

  const top5Contractors = summary.topContractors.slice(0, 5)
  const distinctContractors = new Set(summary.contracts.map((c) => c.supplierDocument || c.supplierName)).size

  // Bar chart series: contracts per signature year (last 10 years).
  const yearBars: BarChartItem[] = summary.byYear
    .slice(-10)
    .map((y) => ({ label: String(y.year), value: y.count }))

  // Bar chart series: contracts per sub-species (top 8).
  const subSpeciesBars: BarChartItem[] = summary.bySubSpecies
    .slice(0, 8)
    .map((s) => ({ label: s.name, value: s.count }))

  const contractColumns = [
    {
      header: "Número",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <Link
          href={`/senado/contratacoes/${row.id}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.formattedNumber || row.number}
        </Link>
      ),
    },
    {
      header: "Objeto",
      className: "max-w-md",
      cell: (row: SenadoContract) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.object}</span>
      ),
    },
    {
      header: "Empresa",
      className: "max-w-[14rem]",
      cell: (row: SenadoContract) => (
        <span className="text-gray-700 text-xs truncate block" title={row.supplierName}>
          {row.supplierName}
        </span>
      ),
    },
    {
      header: "Modalidade",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <span className="text-gray-600 text-xs">{row.modality || "—"}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <Badge variant="gray">{row.subSpeciesName || row.subSpeciesCode || "—"}</Badge>
      ),
    },
  ]

  const contractorColumns = [
    {
      header: "Empresa",
      cell: (row: (typeof top5Contractors)[number]) => (
        <span className="text-sm font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      header: "CNPJ/CPF",
      className: "whitespace-nowrap",
      cell: (row: (typeof top5Contractors)[number]) => (
        <span className="text-gray-600 text-xs tabular-nums">{row.document}</span>
      ),
    },
    {
      header: "Contratos",
      className: "whitespace-nowrap text-center",
      cell: (row: (typeof top5Contractors)[number]) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">{row.count}</span>
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
                href="/senado"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar ao Senado
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contratações</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Contratos institucionais, licitações e empresas fornecedoras do Senado Federal.
              </p>
            </div>
            {summary._source && (
              <div className="shrink-0">
                <SourcePill url={summary._source} />
              </div>
            )}
          </div>
        </div>
      </header>

      {failed.has("Contratações") ? (
        <DataFetchError label="as contratações" />
      ) : (
        <>
          {/* Resumo geral */}
          <section className="mb-12">
            <SectionHeader title="Resumo geral" sourceUrl={summary._source} />
            <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Total de contratos"
                  value={summary.totalContracts.toLocaleString("pt-BR")}
                  tooltip="Total histórico de contratos na base administrativa do Senado, incluindo encerrados, vigentes e pendentes."
                />
                <StatCard
                  label="Contratos vigentes hoje"
                  value={summary.activeContracts.toLocaleString("pt-BR")}
                  tooltip="Contratos cuja data de início já ocorreu e cuja data de fim ainda não passou (ou está em aberto)."
                />
                <StatCard
                  label="Empresas distintas"
                  value={distinctContractors.toLocaleString("pt-BR")}
                  tooltip="Número de fornecedores diferentes (por CNPJ/CPF) que possuem contratos com o Senado."
                />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                Valores totais por contrato não são divulgados no endpoint de listagem. Clique em um contrato para ver pagamentos executados, aditivos e impacto financeiro.
              </p>
            </div>
          </section>

          {/* Charts */}
          {(yearBars.length > 0 || subSpeciesBars.length > 0) && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader title="Distribuição" sourceUrl={summary._source} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {yearBars.length > 0 && (
                  <ChartCard
                    title="Contratos por ano de assinatura"
                    subtitle="Últimos 10 anos com contratos registrados"
                    sourceUrl={summary._source}
                  >
                    <BarChart data={yearBars} color="#4f46e5" />
                  </ChartCard>
                )}
                {subSpeciesBars.length > 0 && (
                  <ChartCard
                    title="Por tipo de instrumento"
                    subtitle="Contratos, convênios, cessões de uso e outros"
                    sourceUrl={summary._source}
                  >
                    <BarChart data={subSpeciesBars} color="#0891b2" horizontal />
                  </ChartCard>
                )}
              </div>
            </section>
          )}

          {/* Latest contracts */}
          {latest5.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader
                title="Últimos contratos"
                sourceUrl={summary._source}
                action={{ label: "Ver todos", href: "/senado/contratacoes/lista" }}
              />
              <DataTable columns={contractColumns} data={latest5} rowKey={(r) => r.id} />
            </section>
          )}

          {/* Top contractors */}
          {top5Contractors.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader title="Maiores fornecedores por número de contratos" sourceUrl={summary._source} />
              <DataTable columns={contractorColumns} data={top5Contractors} rowKey={(r) => r.document} />
            </section>
          )}

          {/* Outsourced workers (terceirizados) */}
          {outsourced.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader
                title="Terceirizados"
                sourceUrl={outsourced._source}
              />
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total cadastrados" value={String(outsourced.length)} />
                <StatCard label="Atualmente ativos" value={String(activeOutsourced)} />
                <StatCard
                  label="Empresas distintas"
                  value={String(new Set(outsourced.map((o) => o.companyName)).size)}
                />
              </div>
              <DataTable
                columns={[
                  {
                    header: "Nome",
                    cell: (r: SenadoOutsourcedWorker) => (
                      <span className="text-sm font-medium text-gray-900">{r.name}</span>
                    ),
                  },
                  {
                    header: "Função",
                    cell: (r: SenadoOutsourcedWorker) => (
                      <span className="text-sm text-gray-700">{r.role}</span>
                    ),
                  },
                  {
                    header: "Empresa",
                    cell: (r: SenadoOutsourcedWorker) => (
                      <span className="text-xs text-gray-600">{r.companyName}</span>
                    ),
                  },
                  {
                    header: "Lotação",
                    cell: (r: SenadoOutsourcedWorker) => (
                      <span className="text-xs text-gray-600">{r.departmentName ?? "—"}</span>
                    ),
                  },
                  {
                    header: "Status",
                    align: "right" as const,
                    cell: (r: SenadoOutsourcedWorker) => (
                      <Badge variant={r.isActive ? "green" : "gray"}>
                        {r.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    ),
                  },
                ]}
                data={outsourced.slice(0, 20)}
                rowKey={(r) => r.id}
              />
            </section>
          )}

          {/* Purchase orders (empenhos) */}
          {empenhos.length > 0 && (
            <section className="mb-12 border-t border-gray-200/60 pt-10">
              <SectionHeader
                title="Notas de empenho"
                sourceUrl={empenhos._source}
              />
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  label="Total de empenhos"
                  value={empenhos.length.toLocaleString("pt-BR")}
                  tooltip="Notas de empenho são reservas orçamentárias — valores comprometidos antes do pagamento."
                />
                <StatCard
                  label="Valor total empenhado"
                  value={totalEmpenhoValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                />
              </div>
              <DataTable
                columns={[
                  {
                    header: "Nº",
                    className: "whitespace-nowrap",
                    cell: (r: SenadoPurchaseOrder) => (
                      <span className="font-medium text-gray-900 tabular-nums">{r.number}</span>
                    ),
                  },
                  {
                    header: "Descrição",
                    className: "max-w-md",
                    cell: (r: SenadoPurchaseOrder) => (
                      <span className="text-xs text-gray-700 line-clamp-2">{r.description}</span>
                    ),
                  },
                  {
                    header: "Fornecedor",
                    cell: (r: SenadoPurchaseOrder) => (
                      <span className="text-xs text-gray-700">{r.supplierName}</span>
                    ),
                  },
                  {
                    header: "Valor",
                    align: "right" as const,
                    className: "whitespace-nowrap",
                    cell: (r: SenadoPurchaseOrder) => (
                      <span className="text-sm font-medium tabular-nums text-gray-900">
                        {r.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </span>
                    ),
                  },
                ]}
                data={top10Empenhos}
                rowKey={(r) => r.id}
              />
            </section>
          )}
        </>
      )}
    </>
  )
}
