/**
 * @file PlacarList.tsx
 * @description Client component for the full scoreboard listing page.
 *
 * Fetches all scored cards from GET /api/game/scoreboard/all and displays
 * them in a DataTable with search, filters (party, state), and sort options
 * (most disapproved, most approved, most voted).
 *
 * Each row links to the official's profile page when available.
 */

"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { SearchableList, DataTable, SectionHeader, AvatarInitials } from "@/components/ui"

interface ScoreboardEntry {
  id: string
  type: string
  module: string
  refId: string
  name: string
  party: string
  state: string
  photoUrl: string
  totalVotes: number
  fairPercent: number
}

type SortKey = "most_disapproved" | "most_approved" | "most_voted"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "most_disapproved", label: "Mais reprovados" },
  { key: "most_approved", label: "Mais aprovados" },
  { key: "most_voted", label: "Mais votados" },
]

/**
 * Maps a module + refId to the corresponding profile page URL.
 * Returns null if no profile page exists for the given module.
 */
function getProfileUrl(module: string, refId: string): string | null {
  switch (module) {
    case "camara":
      return `/camara/${refId}`
    case "senado":
      return `/senado/${refId}`
    case "executivo":
      return `/executivo/servidores/${refId}`
    case "judiciario":
      return `/judiciario/magistrados/${refId}`
    default:
      return null
  }
}

export function PlacarList() {
  const [entries, setEntries] = useState<ScoreboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>("most_disapproved")

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch("/api/game/scoreboard/all")
        if (res.ok) {
          setEntries(await res.json())
        }
      } catch {
        // Non-critical — show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const sorted = useMemo(() => {
    const list = [...entries]
    switch (sort) {
      case "most_disapproved":
        return list.sort((a, b) => a.fairPercent - b.fairPercent)
      case "most_approved":
        return list.sort((a, b) => b.fairPercent - a.fairPercent)
      case "most_voted":
        return list.sort((a, b) => b.totalVotes - a.totalVotes)
      default:
        return list
    }
  }, [entries, sort])

  const columns = [
    {
      header: "Nome",
      cell: (row: ScoreboardEntry) => {
        const profileUrl = getProfileUrl(row.module, row.refId)
        const content = (
          <div className="flex items-center gap-3">
            {row.photoUrl ? (
              <Image
                src={row.photoUrl}
                alt={row.name}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
                unoptimized
              />
            ) : (
              <AvatarInitials
                initials={row.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              />
            )}
            <span className="font-medium text-gray-900">{row.name}</span>
          </div>
        )
        if (profileUrl) {
          return (
            <Link href={profileUrl} className="hover:opacity-80">
              {content}
            </Link>
          )
        }
        return content
      },
    },
    {
      header: "Partido",
      cell: (row: ScoreboardEntry) => (
        <span className="text-gray-600">{row.party}</span>
      ),
    },
    {
      header: "UF",
      cell: (row: ScoreboardEntry) => (
        <span className="text-gray-600">{row.state}</span>
      ),
    },
    {
      header: "Votos",
      align: "right" as const,
      cell: (row: ScoreboardEntry) => (
        <span className="tabular-nums text-gray-600">{row.totalVotes}</span>
      ),
    },
    {
      header: "Aprovação",
      align: "right" as const,
      className: "min-w-[180px]",
      cell: (row: ScoreboardEntry) => {
        const unfairPercent = 100 - row.fairPercent
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${row.fairPercent}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${unfairPercent}%` }}
              />
            </div>
            <div className="flex shrink-0 gap-1 text-xs font-semibold tabular-nums">
              <span className="text-emerald-600">{row.fairPercent}%</span>
              <span className="text-gray-300">/</span>
              <span className="text-red-600">{unfairPercent}%</span>
            </div>
          </div>
        )
      },
    },
    {
      header: "",
      align: "right" as const,
      cell: (row: ScoreboardEntry) => {
        const profileUrl = getProfileUrl(row.module, row.refId)
        if (!profileUrl) return null
        return (
          <Link
            href={profileUrl}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Ver perfil →
          </Link>
        )
      },
    },
  ]

  if (loading) {
    return (
      <>
        <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Placar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ranking completo dos agentes públicos avaliados pelos usuários
            </p>
          </div>
          <Link
            href="/acha-justo"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Acha Justo?
          </Link>
        </header>
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200/80 bg-white shadow-card">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
        </div>
      </>
    )
  }

  const sortSelector = (
    <div className="min-w-[160px] sm:w-auto">
      <label className="mb-1 block text-xs font-medium text-gray-500">Ordenar por</label>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortKey)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2
                   text-sm text-gray-900
                   focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Placar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ranking completo dos agentes públicos avaliados pelos usuários
          </p>
        </div>
        <Link
          href="/acha-justo"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          ← Acha Justo?
        </Link>
      </header>

      <section className="mb-12">
        <SearchableList
          items={sorted}
          searchAccessor={(e) => `${e.name} ${e.party} ${e.state}`}
          placeholder="Buscar por nome, partido ou estado..."
          filters={[
            { label: "Partido", accessor: (e) => e.party },
            { label: "UF", accessor: (e) => e.state },
          ]}
          extraControls={sortSelector}
          pageSize={20}
        >
          {(paged) => (
            <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
          )}
        </SearchableList>
      </section>
    </>
  )
}
