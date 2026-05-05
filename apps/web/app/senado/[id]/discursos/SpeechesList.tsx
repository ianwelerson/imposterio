/**
 * @file SpeechesList.tsx
 * @description Client component for the senator full speeches listing.
 *
 * Filters:
 * - Text search by topic and summary
 * - Dropdown filter by speech type
 * - Year selector via the `extraControls` slot
 */

"use client"

import type { ReactNode } from "react"
import { SearchableList, DataTable } from "@/components/ui"
import type { SenatorSpeech } from "@imposterio/types"

interface SpeechesListProps {
  speeches: SenatorSpeech[]
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function SpeechesList({ speeches, yearSelector }: SpeechesListProps) {
  const columns = [
    {
      header: "Data",
      cell: (r: SenatorSpeech) => (
        <span className="text-gray-900 tabular-nums">{formatDate(r.date)}</span>
      ),
    },
    {
      header: "Tipo",
      cell: (r: SenatorSpeech) => (
        <span className="text-gray-700 text-sm">{r.type || "—"}</span>
      ),
    },
    {
      header: "Tema",
      cell: (r: SenatorSpeech) => (
        <span className="text-gray-600 text-xs line-clamp-1">{r.topic || "—"}</span>
      ),
    },
    {
      header: "Resumo",
      cell: (r: SenatorSpeech) => (
        <span className="text-gray-700 line-clamp-2 text-sm">{r.summary || "—"}</span>
      ),
    },
    {
      header: "Texto",
      align: "right" as const,
      cell: (r: SenatorSpeech) =>
        r.textUrl ? (
          <a
            href={r.textUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            Abrir ↗
          </a>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ]

  return (
    <SearchableList
      items={speeches}
      searchAccessor={(s) => `${s.topic ?? ""} ${s.summary ?? ""} ${s.type}`}
      filters={[
        { label: "Tipo de discurso", accessor: (s) => s.type, allLabel: "Todos os tipos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por tema ou resumo..."
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "—"
  return new Date(isoDate).toLocaleDateString("pt-BR")
}
