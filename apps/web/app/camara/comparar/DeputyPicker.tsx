/**
 * @file DeputyPicker.tsx
 * @description Client component for selecting deputies to compare.
 *
 * Renders exactly 3 slots in a fixed grid — filled slots show a mini profile card,
 * empty slots show a search input with a filtered dropdown.
 * Navigation is delegated to the parent (ComparisonControls) so that all
 * controls share a single useTransition and loading state.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { track } from "@/lib/analytics"

interface DeputyOption {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
}

interface DeputyPickerProps {
  /** Full list of deputies for search autocomplete. */
  allDeputies: DeputyOption[]
  /** Currently selected deputy IDs (from URL). */
  selectedIds: string[]
  /** Shared loading state from the parent transition. */
  loading: boolean
  /** Shared navigation function — updates URL params inside the parent's startTransition. */
  navigate: (updater: (params: URLSearchParams) => void) => void
}

/** Fixed height for all picker slots to keep them aligned. */
const SLOT_HEIGHT = "h-[72px]"

export function DeputyPicker({ allDeputies, selectedIds, loading, navigate }: DeputyPickerProps) {
  const addDeputy = (id: string) => {
    if (selectedIds.length >= 3 || selectedIds.includes(id)) return
    track("comparison_add", { deputy_id: id })
    const newIds = [...selectedIds, id]
    navigate((params) => params.set("ids", newIds.join(",")))
  }

  const removeDeputy = (id: string) => {
    track("comparison_remove", { deputy_id: id })
    const newIds = selectedIds.filter((sid) => sid !== id)
    navigate((params) => {
      if (newIds.length > 0) {
        params.set("ids", newIds.join(","))
      } else {
        params.delete("ids")
      }
    })
  }

  // Find selected deputies' info
  const selectedDeputies = selectedIds
    .map((id) => allDeputies.find((d) => d.id === id))
    .filter(Boolean) as DeputyOption[]

  // Always render exactly 3 slots
  const slots: Array<{ type: "filled"; deputy: DeputyOption } | { type: "search" } | { type: "empty" }> = []

  for (let i = 0; i < 3; i++) {
    if (i < selectedDeputies.length) {
      slots.push({ type: "filled", deputy: selectedDeputies[i] })
    } else if (i === selectedDeputies.length && selectedDeputies.length < 3) {
      slots.push({ type: "search" })
    } else {
      slots.push({ type: "empty" })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {slots.map((slot, i) => {
        if (slot.type === "filled") {
          return (
            <FilledSlot
              key={slot.deputy.id}
              deputy={slot.deputy}
              onRemove={() => removeDeputy(slot.deputy.id)}
              loading={loading}
            />
          )
        }
        if (slot.type === "search") {
          return (
            <EmptySlot
              key={`search-${i}`}
              allDeputies={allDeputies}
              excludeIds={selectedIds}
              onSelect={addDeputy}
              loading={loading}
            />
          )
        }
        return (
          <div
            key={`empty-${i}`}
            className={`flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 ${SLOT_HEIGHT}`}
          >
            <span className="text-xs text-gray-400">Selecione um deputado</span>
          </div>
        )
      })}
    </div>
  )
}

/** Slot showing a selected deputy with a remove button. Shows loading overlay during transitions. */
function FilledSlot({
  deputy,
  onRemove,
  loading,
}: {
  deputy: DeputyOption
  onRemove: () => void
  loading: boolean
}) {
  return (
    <div className={`relative flex items-center gap-3 rounded-lg border border-gray-200/60 bg-white px-4 ${SLOT_HEIGHT}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        </div>
      )}
      {deputy.photoUrl ? (
        <Image
          src={deputy.photoUrl}
          alt={deputy.name}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full bg-gray-100 object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
          {deputy.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{deputy.name}</p>
        <p className="text-xs text-gray-500">{deputy.party} · {deputy.uf}</p>
      </div>
      <button
        onClick={onRemove}
        disabled={loading}
        className="ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
        aria-label={`Remover ${deputy.name}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/** Slot with a search input and dropdown for selecting a deputy. Shows loading when transitioning. */
function EmptySlot({
  allDeputies,
  excludeIds,
  onSelect,
  loading,
}: {
  allDeputies: DeputyOption[]
  excludeIds: string[]
  onSelect: (id: string) => void
  loading: boolean
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const excludeSet = new Set(excludeIds)
  const filtered = query.length >= 2
    ? allDeputies
        .filter((d) => !excludeSet.has(d.id))
        .filter((d) => {
          const q = query.toLowerCase()
          return (
            d.name.toLowerCase().includes(q) ||
            d.party.toLowerCase().includes(q) ||
            d.uf.toLowerCase().includes(q)
          )
        })
        .slice(0, 8)
    : []

  return (
    <div ref={containerRef} className="relative">
      <div className={`relative ${SLOT_HEIGHT}`}>
        {loading ? (
          <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 ${SLOT_HEIGHT}`}>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <span className="text-xs text-indigo-500">Carregando dados...</span>
            </div>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder="Buscar deputado..."
            className={`w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 px-4
                       text-sm text-gray-900 placeholder:text-gray-400
                       focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors ${SLOT_HEIGHT}`}
          />
        )}
      </div>

      {isOpen && !loading && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
          {filtered.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => {
                  onSelect(d.id)
                  setQuery("")
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                {d.photoUrl ? (
                  <Image
                    src={d.photoUrl}
                    alt={d.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full bg-gray-100 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    {d.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.party} · {d.uf}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm text-gray-500">Nenhum deputado encontrado</p>
        </div>
      )}
    </div>
  )
}
