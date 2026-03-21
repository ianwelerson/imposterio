/**
 * @file VotingHistoryList.tsx
 * @description Client component for the full voting history listing with search,
 * filters, and pagination. Each row links to the voting session detail page.
 *
 * Filters:
 * - Text search by description
 * - Dropdown filter by vote type (Sim, Não, Abstenção, Obstrução)
 * - Dropdown filter by result (Aprovada, Rejeitada)
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { DeputyVotingRecord } from "@imposterio/types"

interface VotingHistoryListProps {
  votes: DeputyVotingRecord[]
  sourceUrl: string
  selectedYear: number
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

/** Maps a vote string to a Badge variant color. */
function voteVariant(vote: string): "green" | "red" | "amber" | "gray" {
  if (vote === "Sim") return "green"
  if (vote === "Não") return "red"
  if (vote === "Obstrução") return "amber"
  return "gray"
}

export function VotingHistoryList({ votes, sourceUrl, selectedYear, yearSelector }: VotingHistoryListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: DeputyVotingRecord) => (
        <Link
          href={`/camara/pautas/votacoes/${r.sessionId}?ano=${selectedYear}`}
          className="text-sm tabular-nums text-gray-900 hover:text-accent transition-colors"
        >
          {new Date(r.date).toLocaleDateString("pt-BR")}
        </Link>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (r: DeputyVotingRecord) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{r.description}</span>
      ),
    },
    {
      header: "Voto",
      className: "whitespace-nowrap",
      cell: (r: DeputyVotingRecord) => (
        <Badge variant={voteVariant(r.vote)}>{r.vote}</Badge>
      ),
    },
    {
      header: "Resultado",
      className: "whitespace-nowrap",
      cell: (r: DeputyVotingRecord) => (
        r.approved === true
          ? <Badge variant="green">Aprovada</Badge>
          : r.approved === false
            ? <Badge variant="red">Rejeitada</Badge>
            : <Badge variant="gray">Indefinida</Badge>
      ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (r: DeputyVotingRecord) => (
        <Link
          href={`/camara/pautas/votacoes/${r.sessionId}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={votes}
      searchAccessor={(v) => `${v.description} ${v.vote}`}
      filters={[
        {
          label: "Voto",
          accessor: (v) => v.vote,
          allLabel: "Todos os votos",
        },
        {
          label: "Resultado",
          accessor: (v) =>
            v.approved === true ? "Aprovada" : v.approved === false ? "Rejeitada" : "Indefinida",
          allLabel: "Todos os resultados",
        },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por descrição da votação..."
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
