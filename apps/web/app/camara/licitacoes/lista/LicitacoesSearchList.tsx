/**
 * @file LicitacoesSearchList.tsx
 * @description Client component for the Camara full procurement listing.
 *
 * Wraps SearchableList + DataTable with filters for modality and status.
 * Each row links to the procurement detail page at /camara/licitacoes/[id].
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { CamaraProcurement } from "@imposterio/types"
import { formatCurrency } from "../licitacoes-utils"

interface LicitacoesSearchListProps {
  /** All procurement records for the selected year. */
  procurements: CamaraProcurement[]
  /** Currently selected year, used for building detail links. */
  selectedYear: number
  /** Optional year selector rendered as extra controls in the search bar. */
  yearSelector?: ReactNode
}

export function LicitacoesSearchList({
  procurements,
  selectedYear,
  yearSelector,
}: LicitacoesSearchListProps) {
  const columns = [
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
      className: "max-w-md",
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
      header: "Valor estimado",
      className: "whitespace-nowrap",
      cell: (row: CamaraProcurement) => (
        <span className="text-sm tabular-nums text-gray-700">
          {formatCurrency(row.estimatedValue)}
        </span>
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

  return (
    <SearchableList
      items={procurements}
      searchAccessor={(p) => `${p.number}/${p.year} ${p.object} ${p.modality} ${p.status}`}
      placeholder="Buscar por número, objeto, modalidade..."
      filters={[
        { label: "Modalidade", accessor: (p) => p.modality, allLabel: "Todas as modalidades" },
        { label: "Situação", accessor: (p) => p.status, allLabel: "Todas as situações" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.id}
        />
      )}
    </SearchableList>
  )
}
