/**
 * @file page.tsx
 * @description Individual procurement detail page for the Camara dos Deputados.
 *
 * Shows comprehensive information about a single procurement process:
 * - Header with modality, number, year, and status badges
 * - StatCards with financial summary and savings percentage
 * - InfoPanel with key dates and process information
 * - Contracts table — awarded contracts with supplier details
 * - Items table — individual line items with pricing
 * - Requests table — originating purchase requests
 *
 * Data source: getProcurementDetail(year, id) which cross-references
 * four bulk files (licitacoes, contratos, itens, pedidos).
 *
 * @see https://dadosabertos.camara.leg.br/arquivos/licitacoes/
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge, InfoPanel, SourcePill, SectionHeader, StatCard, DataTable, ToastTrigger } from "@/components/ui"
import { getProcurementDetail } from "@imposterio/fetchers"
import type {
  CamaraProcurementContract,
  CamaraProcurementItem,
  CamaraProcurementRequest,
} from "@imposterio/types"
import { formatCurrency } from "../licitacoes-utils"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function ProcurementDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  let detail
  try {
    detail = await getProcurementDetail(selectedYear, id)
  } catch {
    notFound()
  }

  if (!detail) notFound()

  const { procurement, contracts, items, requests } = detail

  // Savings rate between estimated and contracted values
  const savingsRate = procurement.estimatedValue > 0
    ? (((procurement.estimatedValue - procurement.contractedValue) / procurement.estimatedValue) * 100).toFixed(1)
    : "0"
  const savingsPositive = Number(savingsRate) > 0

  // Status badge variant
  const statusVariant = procurement.status === "Encerrada" || procurement.status === "Homologada"
    ? "green"
    : procurement.status === "Revogada" || procurement.status === "Anulada" || procurement.status === "Deserta" || procurement.status === "Fracassada"
      ? "red"
      : "amber"

  // Info panel fields
  const infoFields = [
    ...(procurement.authorizationDate
      ? [{ label: "Data de autorização", value: new Date(procurement.authorizationDate).toLocaleDateString("pt-BR") }]
      : []),
    ...(procurement.publicationDate
      ? [{ label: "Data de publicação", value: new Date(procurement.publicationDate).toLocaleDateString("pt-BR") }]
      : []),
    ...(procurement.openingDate
      ? [{ label: "Data de abertura", value: new Date(procurement.openingDate).toLocaleDateString("pt-BR") }]
      : []),
    { label: "Tipo", value: procurement.type || "Não informado" },
    { label: "Número do processo", value: String(procurement.processNumber) },
    { label: "Modalidade", value: procurement.modality },
  ]

  // Contract table columns
  const contractColumns = [
    {
      header: "Fornecedor",
      cell: (row: CamaraProcurementContract) => (
        <span className="text-sm font-medium text-gray-900">{row.supplierName}</span>
      ),
    },
    {
      header: "CNPJ/CPF",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementContract) => (
        <span className="text-gray-600 text-xs tabular-nums">{row.supplierDocument}</span>
      ),
    },
    {
      header: "Valor total",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementContract) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {formatCurrency(row.totalValue)}
        </span>
      ),
    },
    {
      header: "Situação",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementContract) => {
        const v = row.status === "Vigente" ? "green" : row.status === "Encerrado" ? "gray" : "amber"
        return <Badge variant={v}>{row.status}</Badge>
      },
    },
    {
      header: "Vigência",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementContract) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {row.startDate ? new Date(row.startDate).toLocaleDateString("pt-BR") : "—"}
          {" — "}
          {row.latestEndDate
            ? new Date(row.latestEndDate).toLocaleDateString("pt-BR")
            : row.endDate
              ? new Date(row.endDate).toLocaleDateString("pt-BR")
              : "—"}
        </span>
      ),
    },
    {
      header: "Localidade",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementContract) => (
        <span className="text-gray-600 text-xs">
          {row.supplierCity && row.supplierUF
            ? `${row.supplierCity}/${row.supplierUF}`
            : row.supplierUF || "—"}
        </span>
      ),
    },
  ]

  // Item table columns
  const itemColumns = [
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.description}</span>
      ),
    },
    {
      header: "Unidade",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-gray-600 text-xs">{row.unit}</span>
      ),
    },
    {
      header: "Qtd. licitada",
      className: "whitespace-nowrap text-right",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-sm tabular-nums text-gray-700">{row.quantityBid.toLocaleString("pt-BR")}</span>
      ),
    },
    {
      header: "Preço estimado",
      className: "whitespace-nowrap text-right",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-sm tabular-nums text-gray-700">{formatCurrency(row.estimatedPrice)}</span>
      ),
    },
    {
      header: "Preço contratado",
      className: "whitespace-nowrap text-right",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {row.contractedPrice > 0 ? formatCurrency(row.contractedPrice) : "—"}
        </span>
      ),
    },
    {
      header: "Fornecedor",
      cell: (row: CamaraProcurementItem) => (
        <span className="text-gray-600 text-xs">{row.supplierName || "—"}</span>
      ),
    },
    {
      header: "Situação",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementItem) => (
        <Badge variant="gray">{row.status}</Badge>
      ),
    },
  ]

  // Request table columns
  const requestColumns = [
    {
      header: "Órgão",
      cell: (row: CamaraProcurementRequest) => (
        <span className="text-sm font-medium text-gray-900">{row.organ}</span>
      ),
    },
    {
      header: "Objeto",
      className: "max-w-md",
      cell: (row: CamaraProcurementRequest) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.object}</span>
      ),
    },
    {
      header: "Número",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementRequest) => (
        <span className="text-sm tabular-nums text-gray-700">
          {row.requestNumber}/{row.requestYear}
        </span>
      ),
    },
    {
      header: "Data de registro",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurementRequest) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {row.registrationDate
            ? new Date(row.registrationDate).toLocaleDateString("pt-BR")
            : "—"}
        </span>
      ),
    },
  ]

  return (
    <>
      {/* Header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/licitacoes/lista?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar à lista
              </Link>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {procurement.modality} #{procurement.number}/{procurement.year}
                </h1>
                <Badge variant="gray">{procurement.modality}</Badge>
                <Badge variant={statusVariant}>{procurement.status}</Badge>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                {procurement.object}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={detail._source} />
            </div>
          </div>
        </div>
      </header>

      {/* StatCards */}
      <section className="mb-12">
        <SectionHeader title="Resumo financeiro" />
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Valor estimado"
              value={formatCurrency(procurement.estimatedValue)}
            />
            <StatCard
              label="Valor contratado"
              value={formatCurrency(procurement.contractedValue)}
            />
            <StatCard
              label="Valor pago"
              value={formatCurrency(procurement.paidValue)}
            />
            <StatCard
              label="Economia"
              value={`${savingsRate}%`}
              badge={savingsPositive
                ? { text: "economia", variant: "green" as const }
                : Number(savingsRate) < 0
                  ? { text: "acima do estimado", variant: "red" as const }
                  : undefined
              }
            />
            <StatCard
              label="Propostas recebidas"
              value={String(procurement.proposalCount)}
            />
            <StatCard
              label="Itens licitados"
              value={String(procurement.itemCount)}
            />
          </div>
        </div>
      </section>

      {/* Info panel */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Informações gerais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* Contracts */}
      {contracts.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <SectionHeader
            title="Contratos"
            sourceUrl={detail._source}
          />
          <DataTable
            columns={contractColumns}
            data={contracts}
            rowKey={(r) => `${r.contractNumber}-${r.contractYear}`}
          />
        </section>
      )}

      {/* Items */}
      {items.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <SectionHeader
            title="Itens"
            sourceUrl={detail._source}
          />
          <DataTable
            columns={itemColumns}
            data={items}
            rowKey={(r) => `${r.itemNumber}-${r.subItemNumber}`}
          />
        </section>
      )}

      {/* Requests */}
      {requests.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <SectionHeader
            title="Pedidos"
            sourceUrl={detail._source}
          />
          <DataTable
            columns={requestColumns}
            data={requests}
            rowKey={(r) => `${r.requestNumber}-${r.requestYear}`}
          />
        </section>
      )}
    </>
  )
}
