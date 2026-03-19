/**
 * @file SpeechesList.tsx
 * @description Client component for the full speeches listing with search,
 * filters, pagination, and expandable detail rows.
 *
 * Filters:
 * - Text search by summary and keywords
 * - Dropdown filter by speech type
 *
 * Each row expands to show the full summary, keywords, and links to
 * official text, audio, and video recordings.
 */

"use client"

import { useState, type ReactNode } from "react"
import { SearchableList, DataTable, SourcePill } from "@/components/ui"
import type { DeputySpeech } from "@imposterio/types"

interface SpeechesListProps {
  speeches: DeputySpeech[]
  sourceUrl: string
  yearSelector?: ReactNode
}

export function SpeechesList({ speeches, sourceUrl, yearSelector }: SpeechesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: DeputySpeech) => (
        <span className="text-gray-600">{formatDateTime(r.startTime)}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (r: DeputySpeech) => (
        <span className="text-gray-900 text-sm">{r.type}</span>
      ),
    },
    {
      header: "Fase",
      className: "whitespace-nowrap",
      cell: (r: DeputySpeech) => (
        <span className="text-gray-600 text-xs">{r.phase}</span>
      ),
    },
    {
      header: "Resumo",
      className: "max-w-xs",
      cell: (r: DeputySpeech) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{r.summary}</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: (r: DeputySpeech) => {
        const isOpen = expandedId === r.startTime
        return (
          <button
            onClick={() => toggle(r.startTime)}
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            {isOpen ? "Fechar" : "Detalhes"}
          </button>
        )
      },
    },
  ]

  return (
    <SearchableList
      items={speeches}
      searchAccessor={(s) => `${s.summary} ${s.keywords ?? ""}`}
      filters={[
        { label: "Tipo de discurso", accessor: (s) => s.type, allLabel: "Todos os tipos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por tema ou palavra-chave..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.startTime}
          expandedRowKey={expandedId}
          renderExpanded={(r) => (
            <SpeechDetail speech={r} sourceUrl={sourceUrl} />
          )}
        />
      )}
    </SearchableList>
  )
}

/** Expanded detail panel for a single speech record. */
function SpeechDetail({
  speech,
  sourceUrl,
}: {
  speech: DeputySpeech
  sourceUrl: string
}) {
  const mediaLinks = [
    speech.textUrl && { label: "Texto oficial", url: speech.textUrl },
    speech.videoUrl && { label: "Vídeo", url: speech.videoUrl },
    speech.audioUrl && { label: "Áudio", url: speech.audioUrl },
  ].filter(Boolean) as Array<{ label: string; url: string }>

  return (
    <div className="bg-gray-50 px-6 py-4">
      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500">Resumo</dt>
          <dd className="mt-0.5 text-sm text-gray-900 leading-relaxed">{speech.summary}</dd>
        </div>

        {speech.keywords && (
          <div>
            <dt className="text-xs font-medium text-gray-500">Palavras-chave</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {speech.keywords.split(",").map((kw) => (
                <span
                  key={kw.trim()}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                >
                  {kw.trim()}
                </span>
              ))}
            </dd>
          </div>
        )}

        {mediaLinks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {mediaLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                {l.label} →
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-500">Fonte oficial:</span>
        <SourcePill url={sourceUrl} />
      </div>
    </div>
  )
}

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
