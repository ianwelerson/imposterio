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

import { useState, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { SearchableList, DataTable, SourcePill } from "@/components/ui"
import type { DeputySpeech } from "@imposterio/types"

interface SpeechesListProps {
  speeches: DeputySpeech[]
  sourceUrl: string
  yearSelector?: ReactNode
  /** Pre-set keyword filter from URL (e.g. from tag cloud click). */
  initialKeyword?: string
  /** Deputy ID for building keyword filter links. */
  deputyId?: string
  /** Selected year for building keyword filter links. */
  selectedYear?: number
}

export function SpeechesList({
  speeches,
  sourceUrl,
  yearSelector,
  initialKeyword,
  deputyId,
  selectedYear,
}: SpeechesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState<string | null>(initialKeyword ?? null)

  /** Speeches filtered by keyword when a keyword filter is active. */
  const filteredSpeeches = useMemo(() => {
    if (!keywordFilter) return speeches
    const kw = keywordFilter.toLowerCase()
    return speeches.filter((s) =>
      s.keywords?.toLowerCase().includes(kw),
    )
  }, [speeches, keywordFilter])

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
    <>
      {/* Active keyword filter badge */}
      {keywordFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-gray-500">Filtrando por:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {keywordFilter}
            <button
              type="button"
              onClick={() => setKeywordFilter(null)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-100 transition-colors"
              aria-label="Remover filtro"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
          <span className="text-xs text-gray-400">
            ({filteredSpeeches.length} de {speeches.length})
          </span>
        </div>
      )}

      <SearchableList
        items={filteredSpeeches}
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
              <SpeechDetail
                speech={r}
                sourceUrl={sourceUrl}
                deputyId={deputyId}
                selectedYear={selectedYear}
                onKeywordClick={setKeywordFilter}
              />
            )}
          />
        )}
      </SearchableList>
    </>
  )
}

/** Expanded detail panel for a single speech record. */
function SpeechDetail({
  speech,
  sourceUrl,
  deputyId,
  selectedYear,
  onKeywordClick,
}: {
  speech: DeputySpeech
  sourceUrl: string
  deputyId?: string
  selectedYear?: number
  onKeywordClick?: (keyword: string) => void
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
              {speech.keywords.split(",").map((kw) => {
                const trimmed = kw.trim()
                if (!trimmed) return null
                return onKeywordClick ? (
                  <button
                    key={trimmed}
                    type="button"
                    onClick={() => onKeywordClick(trimmed.toLowerCase())}
                    className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    {trimmed}
                  </button>
                ) : (
                  <span
                    key={trimmed}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                  >
                    {trimmed}
                  </span>
                )
              })}
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
