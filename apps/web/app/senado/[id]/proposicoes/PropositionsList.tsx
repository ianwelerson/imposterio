/**
 * @file PropositionsList.tsx
 * @description Client component for the senator full propositions listing.
 *
 * Filters:
 * - Text search by identifier, summary, theme
 * - Dropdown filter by status (Tramitando, Aprovada, Rejeitada, Arquivada)
 * - Dropdown filter by type (PL, PEC, etc.)
 * - Year selector via the `extraControls` slot
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { Proposition, PropositionStatus } from "@imposterio/types"

const STATUS_VARIANT: Record<PropositionStatus, "amber" | "green" | "red" | "gray"> = {
  "Em votação": "amber",
  "Aprovada": "green",
  "Rejeitada": "red",
  "Tramitando": "amber",
  "Arquivada": "gray",
}

interface PropositionsListProps {
  propositions: Proposition[]
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function PropositionsList({ propositions, yearSelector }: PropositionsListProps) {
  const columns = [
    {
      header: "Proposição",
      cell: (r: Proposition) => (
        <Link
          href={`/senado/pautas/${r.id}`}
          className="font-medium text-gray-900 hover:text-accent transition-colors"
        >
          {r.identifier}
        </Link>
      ),
    },
    {
      header: "Tipo",
      cell: (r: Proposition) => <span className="text-gray-600 text-sm">{r.type}</span>,
    },
    {
      header: "Ementa",
      cell: (r: Proposition) => (
        <span className="text-gray-700 line-clamp-2 text-sm">{r.summary}</span>
      ),
    },
    {
      header: "Tema",
      cell: (r: Proposition) => (
        <span className="text-gray-600 text-xs">{r.theme || "—"}</span>
      ),
    },
    {
      header: "Status",
      cell: (r: Proposition) => (
        <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: Proposition) => (
        <Link
          href={`/senado/pautas/${r.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={propositions}
      searchAccessor={(p) => `${p.identifier} ${p.summary} ${p.theme ?? ""}`}
      filters={[
        { label: "Status", accessor: (p) => p.status, allLabel: "Todos os status" },
        { label: "Tipo", accessor: (p) => p.type, allLabel: "Todos os tipos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por número, ementa ou tema..."
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}
