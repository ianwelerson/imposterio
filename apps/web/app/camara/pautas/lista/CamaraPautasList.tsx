/**
 * @file CamaraPautasList.tsx
 * @description Client component for the Câmara full legislative propositions listing.
 *
 * Wraps SearchableList + DataTable with filters for type, status, and organ.
 * Each row links to the proposition detail page.
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable } from "@/components/ui"
import type { CamaraProposition } from "@imposterio/types"

interface CamaraPautasListProps {
  propositions: CamaraProposition[]
  selectedYear: number
  yearSelector?: ReactNode
}

export function CamaraPautasList({ propositions, selectedYear, yearSelector }: CamaraPautasListProps) {
  const columns = [
    {
      header: "Proposição",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <Link
          href={`/camara/pautas/${row.id}?ano=${selectedYear}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.typeCode} {row.number}/{row.year}
        </Link>
      ),
    },
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {new Date(row.presentedDate).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.summary}</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <Link
          href={`/camara/pautas/${row.id}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={propositions}
      searchAccessor={(p) => `${p.typeCode} ${p.number}/${p.year} ${p.summary} ${p.keywords ?? ""}`}
      placeholder="Buscar por número, ementa ou palavra-chave..."
      filters={[
        { label: "Tipo", accessor: (p) => p.typeCode, allLabel: "Todos os tipos" },
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
