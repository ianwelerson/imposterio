/**
 * @file SenadoPautasList.tsx
 * @description Client component for the Senado full legislative agenda listing.
 *
 * Wraps SearchableList + DataTable with direct links to detail pages.
 */

"use client"

import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { Proposition, PropositionStatus } from "@imposterio/types"

const STATUS_VARIANT: Record<PropositionStatus, "amber" | "green" | "red" | "gray"> = {
  "Em votação": "amber",
  "Aprovada": "green",
  "Rejeitada": "red",
  "Tramitando": "amber",
  "Arquivada": "gray",
}

interface SenadoPautasListProps {
  propositions: Proposition[]
}

export function SenadoPautasList({ propositions }: SenadoPautasListProps) {
  const columns = [
    {
      header: "Proposição",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Link
          href={`/senado/pautas/${row.id}`}
          className="font-semibold text-gray-900 hover:text-accent transition-colors"
        >
          {row.identifier}
        </Link>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-xs",
      cell: (row: Proposition) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.summary}</span>
      ),
    },
    {
      header: "Autor(a)",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <div>
          <p className="text-gray-900 text-sm">{row.author}</p>
          <p className="text-gray-400 text-xs">{row.authorParty}</p>
        </div>
      ),
    },
    {
      header: "Tema",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <span className="text-gray-600 text-xs">{row.theme}</span>
      ),
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: (row: Proposition) => (
        <Link
          href={`/senado/pautas/${row.id}`}
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
      searchAccessor={(p) => `${p.identifier} ${p.summary} ${p.author}`}
      placeholder="Buscar por número, ementa ou autor..."
      filters={[
        { label: "Status", accessor: (p) => p.status, allLabel: "Todos os status" },
        { label: "Tema", accessor: (p) => p.theme, allLabel: "Todos os temas" },
        { label: "Partido", accessor: (p) => p.authorParty, allLabel: "Todos os partidos" },
        { label: "Ano", accessor: (p) => String(p.year ?? new Date(p.lastUpdate).getFullYear()), allLabel: "Todos os anos" },
      ]}
      pageSize={15}
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
