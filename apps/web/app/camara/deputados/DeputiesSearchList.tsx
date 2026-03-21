/**
 * @file DeputiesSearchList.tsx
 * @description Client component for the deputies listing with search, filters,
 * and pagination.
 *
 * Implements the standard SearchableList pattern with:
 * - Text search by name
 * - Dropdown filter by party (extracted from data)
 * - Dropdown filter by state/UF (extracted from data)
 */

"use client"

import Link from "next/link"
import Image from "next/image"
import { SearchableList, DataTable, AvatarInitials, Acronym } from "@/components/ui"
import type { Deputy } from "@imposterio/types"

interface DeputiesSearchListProps {
  deputies: Deputy[]
}

export function DeputiesSearchList({ deputies }: DeputiesSearchListProps) {
  const columns = [
    {
      header: "Deputado(a)",
      cell: (r: Deputy) => (
        <Link href={`/camara/${r.id}`} className="flex items-center gap-3 hover:opacity-80">
          {r.photoUrl ? (
            <Image
              src={r.photoUrl}
              alt={r.name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
              unoptimized
            />
          ) : (
            <AvatarInitials
              initials={r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            />
          )}
          <span className="font-medium text-gray-900">{r.name}</span>
        </Link>
      ),
    },
    {
      header: "Partido",
      cell: (r: Deputy) => <span className="text-gray-600">{r.party}</span>,
    },
    {
      header: <Acronym title="Unidade Federativa (Estado)">UF</Acronym>,
      cell: (r: Deputy) => <span className="text-gray-600">{r.uf}</span>,
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: Deputy) => (
        <Link
          href={`/camara/${r.id}`}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Ver mais →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={deputies}
      searchAccessor={(d) => d.name}
      filters={[
        { label: "Partido", accessor: (d) => d.party },
        { label: "UF", accessor: (d) => d.uf },
      ]}
      pageSize={20}
      placeholder="Buscar por nome..."
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}
