/**
 * @file AttendeesList.tsx
 * @description Client component for the event attendees listing with search,
 * filters, and pagination. Each row links to the deputy detail page.
 *
 * Filters:
 * - Text search by name, party, and state
 * - Dropdown filter by party
 * - Dropdown filter by state (UF)
 */

"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { EventAttendee } from "@imposterio/fetchers"

interface AttendeesListProps {
  attendees: EventAttendee[]
  sourceUrl: string
}

/**
 * Small deputy photo with initials fallback.
 * Uses next/image for optimization with onError fallback to initials.
 */
function DeputyPhoto({ name, photoUrl }: { name: string; photoUrl: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  if (failed || !photoUrl) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
        {initials}
      </span>
    )
  }

  return (
    <Image
      src={photoUrl}
      alt={name}
      width={32}
      height={32}
      className="h-8 w-8 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export function AttendeesList({ attendees, sourceUrl }: AttendeesListProps) {
  const columns = [
    {
      header: "Deputado(a)",
      cell: (r: EventAttendee) => (
        <Link
          href={`/camara/${r.deputyId}`}
          prefetch={false}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <DeputyPhoto name={r.name} photoUrl={r.photoUrl} />
          <span className="text-sm font-medium text-gray-900 hover:text-accent transition-colors">
            {r.name}
          </span>
        </Link>
      ),
    },
    {
      header: "Partido",
      className: "whitespace-nowrap",
      cell: (r: EventAttendee) => (
        <Badge variant="gray">{r.party}</Badge>
      ),
    },
    {
      header: "UF",
      className: "whitespace-nowrap",
      cell: (r: EventAttendee) => (
        <Badge variant="gray">{r.uf}</Badge>
      ),
    },
  ]

  return (
    <SearchableList
      items={attendees}
      searchAccessor={(a) => `${a.name} ${a.party} ${a.uf}`}
      filters={[
        {
          label: "Partido",
          accessor: (a) => a.party,
          allLabel: "Todos os partidos",
        },
        {
          label: "UF",
          accessor: (a) => a.uf,
          allLabel: "Todos os estados",
        },
      ]}
      pageSize={20}
      placeholder="Buscar por nome, partido ou estado..."
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
