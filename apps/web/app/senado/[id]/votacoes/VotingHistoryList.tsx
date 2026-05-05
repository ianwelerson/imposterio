/**
 * @file VotingHistoryList.tsx
 * @description Client component for the senator full voting history listing.
 *
 * Filters:
 * - Text search by session description / matter
 * - Dropdown filter by vote type ("Sim", "Não", "Abstenção", etc.)
 * - Year selector via the `extraControls` slot
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable } from "@/components/ui"
import type { SenatorVotingRecord } from "@imposterio/types"

interface VotingHistoryListProps {
  votes: SenatorVotingRecord[]
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function VotingHistoryList({ votes, yearSelector }: VotingHistoryListProps) {
  const columns = [
    {
      header: "Data",
      cell: (r: SenatorVotingRecord) => (
        <span className="text-gray-900 tabular-nums">{formatDate(r.date)}</span>
      ),
    },
    {
      header: "Matéria",
      cell: (r: SenatorVotingRecord) => (
        <span className="text-gray-700 line-clamp-2 text-sm">{r.description || "—"}</span>
      ),
    },
    {
      header: "Voto",
      cell: (r: SenatorVotingRecord) => {
        const v = r.vote
        const color =
          v === "Sim"
            ? "text-emerald-600"
            : v === "Não"
              ? "text-red-600"
              : "text-amber-600"
        return <span className={`font-medium ${color}`}>{v || "—"}</span>
      },
    },
    {
      header: "Resultado",
      align: "right" as const,
      cell: (r: SenatorVotingRecord) =>
        r.approved === true ? (
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Aprovada
          </span>
        ) : r.approved === false ? (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Rejeitada
          </span>
        ) : (
          <span className="text-xs text-gray-500">—</span>
        ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: SenatorVotingRecord) => (
        <Link
          href={`/senado/pautas/votacoes/${r.sessionId}`}
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={votes}
      searchAccessor={(v) => `${v.description ?? ""} ${v.matterIdentifier ?? ""}`}
      filters={[
        { label: "Voto", accessor: (v) => v.vote || "—", allLabel: "Todos os votos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por matéria ou descrição..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.sessionId}
        />
      )}
    </SearchableList>
  )
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—"
  return new Date(isoDate).toLocaleDateString("pt-BR")
}
