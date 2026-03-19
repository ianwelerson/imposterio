/**
 * @file VotingSessionsList.tsx
 * @description Client component for the Câmara voting sessions listing.
 *
 * Wraps SearchableList + DataTable with filters for result type.
 * Each row links to the voting session detail page.
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { CamaraVotingSession } from "@imposterio/types"

interface VotingSessionsListProps {
  sessions: CamaraVotingSession[]
  selectedYear: number
  yearSelector?: ReactNode
}

/**
 * Maps the approval field to a Portuguese label for filtering.
 */
function resultLabel(approved: boolean | null): string {
  if (approved === true) return "Aprovada"
  if (approved === false) return "Rejeitada"
  return "Indefinida"
}

export function VotingSessionsList({ sessions, selectedYear, yearSelector }: VotingSessionsListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        <Link
          href={`/camara/pautas/votacoes/${row.id}?ano=${selectedYear}`}
          className="text-sm tabular-nums font-medium text-gray-900 hover:text-accent transition-colors"
        >
          {new Date(row.date).toLocaleDateString("pt-BR")}
        </Link>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (row: CamaraVotingSession) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.description}</span>
      ),
    },
    {
      header: "Proposições",
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        row.propositions.length > 0
          ? (
            <div className="flex flex-wrap gap-1">
              {row.propositions.slice(0, 2).map((p) => (
                <Badge key={p.id} variant="gray">{p.typeCode} {p.number}/{p.year}</Badge>
              ))}
              {row.propositions.length > 2 && (
                <Badge variant="gray">+{row.propositions.length - 2}</Badge>
              )}
            </div>
          )
          : <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      header: "Resultado",
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => {
        const label = resultLabel(row.approved)
        const variant = row.approved === true ? "green" : row.approved === false ? "red" : "gray"
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      header: "Votos",
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        row.voteTally
          ? (
            <span className="text-xs text-gray-600 tabular-nums">
              {row.voteTally.yes} × {row.voteTally.no}
            </span>
          )
          : <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: (row: CamaraVotingSession) => (
        <Link
          href={`/camara/pautas/votacoes/${row.id}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={sessions}
      searchAccessor={(s) => `${s.description} ${s.propositions.map((p) => `${p.typeCode} ${p.number}/${p.year} ${p.summary}`).join(" ")}`}
      placeholder="Buscar por descrição ou proposição..."
      filters={[
        {
          label: "Resultado",
          accessor: (s) => resultLabel(s.approved),
          allLabel: "Todos os resultados",
        },
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
