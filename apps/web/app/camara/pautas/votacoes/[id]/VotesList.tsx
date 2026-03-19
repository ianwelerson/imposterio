/**
 * @file VotesList.tsx
 * @description Client component for searching and filtering individual votes
 * in a Câmara voting session.
 *
 * Uses SearchableList + DataTable with filters by party, UF, and vote type.
 */

"use client"

import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { CamaraIndividualVote } from "@imposterio/types"

interface VotesListProps {
  votes: CamaraIndividualVote[]
}

const VOTE_VARIANT: Record<string, "green" | "red" | "amber" | "gray"> = {
  "Sim": "green",
  "Não": "red",
  "Abstenção": "amber",
  "Obstrução": "amber",
  "Artigo 17": "gray",
}

export function VotesList({ votes }: VotesListProps) {
  const columns = [
    {
      header: "Deputado(a)",
      className: "whitespace-nowrap",
      cell: (row: CamaraIndividualVote) => (
        <Link
          href={`/camara/${row.deputyId}`}
          className="flex items-center gap-2"
        >
          {row.photoUrl && (
            <img
              src={row.photoUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
              loading="lazy"
            />
          )}
          <span className="text-sm font-medium text-gray-900 hover:text-accent transition-colors">
            {row.deputyName}
          </span>
        </Link>
      ),
    },
    {
      header: "Partido",
      className: "whitespace-nowrap",
      cell: (row: CamaraIndividualVote) => (
        <Badge variant="gray">{row.party}</Badge>
      ),
    },
    {
      header: "UF",
      className: "whitespace-nowrap",
      cell: (row: CamaraIndividualVote) => (
        <span className="text-sm text-gray-600">{row.uf}</span>
      ),
    },
    {
      header: "Voto",
      className: "whitespace-nowrap",
      cell: (row: CamaraIndividualVote) => (
        <Badge variant={VOTE_VARIANT[row.vote] ?? "gray"}>{row.vote}</Badge>
      ),
    },
  ]

  return (
    <SearchableList
      items={votes}
      searchAccessor={(v) => `${v.deputyName} ${v.party} ${v.uf}`}
      placeholder="Buscar por nome, partido ou estado..."
      filters={[
        { label: "Voto", accessor: (v) => v.vote, allLabel: "Todos os votos" },
        { label: "Partido", accessor: (v) => v.party, allLabel: "Todos os partidos" },
        { label: "UF", accessor: (v) => v.uf, allLabel: "Todos os estados" },
      ]}
      pageSize={30}
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.deputyId}
        />
      )}
    </SearchableList>
  )
}
