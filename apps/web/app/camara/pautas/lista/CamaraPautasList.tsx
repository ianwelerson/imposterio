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
import { SearchableList, DataTable, Badge } from "@/components/ui"
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
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.summary}</span>
      ),
    },
    {
      header: "Situação",
      className: "whitespace-nowrap max-w-[160px]",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-600 text-xs line-clamp-1">{row.statusDescription || "—"}</span>
      ),
    },
    {
      header: "Local",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        row.statusOrgan
          ? <Badge variant="gray">{row.statusOrgan}</Badge>
          : <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      header: "Regime",
      className: "whitespace-nowrap",
      cell: (row: CamaraProposition) => (
        <span className="text-gray-600 text-xs">{row.regime || "—"}</span>
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
        { label: "Situação", accessor: (p) => p.statusDescription || "Sem situação", allLabel: "Todas as situações" },
        { label: "Local", accessor: (p) => p.statusOrgan || "Não informado", allLabel: "Todos os locais" },
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
