/**
 * @file EventsList.tsx
 * @description Client component for the full events listing with search,
 * filters, and pagination. Each event links to its individual detail page.
 *
 * Filters:
 * - Text search by description
 * - Dropdown filter by event type
 * - Dropdown filter by status
 */

"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { DeputyEvent } from "@imposterio/types"

interface EventsListProps {
  events: DeputyEvent[]
  sourceUrl: string
  yearSelector?: ReactNode
}

export function EventsList({ events, sourceUrl, yearSelector }: EventsListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: DeputyEvent) => (
        <span className="text-gray-600">{formatDateTime(r.startTime)}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (r: DeputyEvent) => (
        <span className="text-gray-900 text-sm">{r.type}</span>
      ),
    },
    {
      header: "Descrição",
      className: "max-w-xs",
      cell: (r: DeputyEvent) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{r.description}</span>
      ),
    },
    {
      header: "Órgãos",
      className: "whitespace-nowrap",
      cell: (r: DeputyEvent) => (
        <div className="flex flex-wrap gap-1">
          {r.organs.slice(0, 3).map((o) => (
            <span key={o.id} className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-bold text-accent">
              {o.abbreviation}
            </span>
          ))}
          {r.organs.length > 3 && (
            <span className="text-[10px] text-gray-400">+{r.organs.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (r: DeputyEvent) => {
        const variant = r.status === "Encerrada" ? "gray"
          : r.status === "Em andamento" ? "green"
          : "amber"
        return <Badge variant={variant}>{r.status}</Badge>
      },
    },
    {
      header: "",
      className: "whitespace-nowrap",
      align: "center" as const,
      cell: (r: DeputyEvent) => (
        <Link
          href={`/camara/eventos/${r.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={events}
      searchAccessor={(e) => `${e.description} ${e.organs.map((o) => o.name).join(" ")}`}
      filters={[
        { label: "Tipo", accessor: (e) => e.type, allLabel: "Todos os tipos" },
        { label: "Status", accessor: (e) => e.status, allLabel: "Todos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por descrição ou órgão..."
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

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
