/**
 * @file AttendanceList.tsx
 * @description Client component for the full attendance listing with search,
 * filters, and pagination. Each row links to the event detail page.
 *
 * Filters:
 * - Text search by event type and description
 * - Dropdown filter by event type (Sessão Deliberativa, Audiência Pública, etc.)
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { DeputyAttendanceEvent } from "@imposterio/fetchers"

interface AttendanceListProps {
  events: DeputyAttendanceEvent[]
  sourceUrl: string
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

/** Maps an event status to a Badge variant color. */
function statusVariant(status: string): "green" | "red" | "amber" | "gray" {
  if (status === "Encerrada") return "gray"
  if (status === "Cancelada") return "red"
  if (status === "Em andamento") return "green"
  return "amber"
}

export function AttendanceList({ events, sourceUrl, yearSelector }: AttendanceListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: DeputyAttendanceEvent) => (
        <span className="text-sm tabular-nums text-gray-900">
          {new Date(r.date).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (r: DeputyAttendanceEvent) => (
        <Badge variant={statusVariant(r.status)}>{r.eventType}</Badge>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (r: DeputyAttendanceEvent) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">
          {r.description}
        </span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (r: DeputyAttendanceEvent) => (
        <Link
          href={`/camara/eventos/${r.eventId}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Ver evento →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={events}
      searchAccessor={(e) => `${e.eventType} ${e.description}`}
      filters={[
        {
          label: "Tipo de evento",
          accessor: (e) => e.eventType,
          allLabel: "Todos os tipos",
        },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por tipo ou descrição do evento..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.eventId}
        />
      )}
    </SearchableList>
  )
}
