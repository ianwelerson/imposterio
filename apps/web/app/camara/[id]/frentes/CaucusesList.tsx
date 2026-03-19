/**
 * @file CaucusesList.tsx
 * @description Client component for the full caucuses listing with search
 * and pagination.
 */

"use client"

import { SearchableList, DataTable, SourcePill } from "@/components/ui"
import type { DeputyCaucus } from "@imposterio/types"

interface CaucusesListProps {
  caucuses: DeputyCaucus[]
  sourceUrl: string
}

export function CaucusesList({ caucuses, sourceUrl }: CaucusesListProps) {
  const columns = [
    {
      header: "Nome",
      cell: (r: DeputyCaucus) => (
        <span className="text-gray-900 text-sm">{r.name}</span>
      ),
    },
    {
      header: "Legislatura",
      className: "whitespace-nowrap",
      align: "center" as const,
      cell: (r: DeputyCaucus) => (
        <span className="text-gray-500 text-xs">{r.legislature}ª</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: () => (
        <span className="text-xs text-gray-400">
          <SourcePill url={sourceUrl} />
        </span>
      ),
    },
  ]

  return (
    <SearchableList
      items={caucuses}
      searchAccessor={(c) => c.name}
      pageSize={20}
      placeholder="Buscar por nome da frente..."
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
