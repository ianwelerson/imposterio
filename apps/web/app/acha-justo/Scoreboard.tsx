/**
 * @file Scoreboard.tsx
 * @description Live scoreboard ("Placar") for the "Acha Justo?" game.
 *
 * Fetches scoreboard data from GET /api/game/scoreboard and displays
 * each card with a split bar (green = justo, red = injusto).
 * Each row links to the official's profile page when available.
 *
 * Exposes a refresh() method via ref so the parent can trigger a
 * reload after a vote is cast.
 */

"use client"

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import Link from "next/link"

interface ScoreboardEntry {
  id: string
  module: string
  refId: string
  name: string
  party: string
  state: string
  photoUrl: string
  totalVotes: number
  fairPercent: number
}

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

export interface ScoreboardHandle {
  refresh: () => void
}

export const Scoreboard = forwardRef<ScoreboardHandle>(function Scoreboard(_, ref) {
  const [entries, setEntries] = useState<ScoreboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScoreboard = useCallback(async () => {
    try {
      const res = await fetch("/api/game/scoreboard")
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch {
      // Non-critical — keep showing stale data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScoreboard()
  }, [fetchScoreboard])

  useImperativeHandle(ref, () => ({
    refresh: fetchScoreboard,
  }))

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Placar
          </span>
        </div>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Placar
          </span>
        </div>
        <div className="p-6">
          <p className="py-8 text-center text-sm text-gray-400">
            Nenhum voto registrado ainda. Seja o primeiro!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white">
      {/* Gradient header — matches game card style */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Placar
          </span>
          <Link
            href="/acha-justo/placar"
            className="text-xs font-medium text-white/80 transition-colors hover:text-white"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {/* Entries */}
      <div className="px-5 pt-1 pb-2">
        <p className="py-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Baseado nos votos dos usuários
        </p>
        <ol className="divide-y divide-gray-50">
          {entries.map((entry, i) => {
            const unfairPercent = 100 - entry.fairPercent
            const profileUrl = getProfileUrl(entry.module, entry.refId)

            const rowContent = (
              <>
                {/* Rank */}
                <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-300">
                  {i + 1}
                </span>

                {/* Photo */}
                {entry.photoUrl ? (
                  <img
                    src={entry.photoUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-gray-100 object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">
                    {entry.name.charAt(0)}
                  </div>
                )}

                {/* Name + bar */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {entry.name}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {entry.totalVotes} voto{entry.totalVotes !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {entry.party} — {entry.state}
                  </p>

                  {/* Split bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${entry.fairPercent}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all duration-500"
                        style={{ width: `${unfairPercent}%` }}
                      />
                    </div>
                    <div className="flex shrink-0 gap-1.5 text-[10px] font-semibold">
                      <span className="text-emerald-600">{entry.fairPercent}%</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-red-600">{unfairPercent}%</span>
                    </div>
                  </div>
                </div>
              </>
            )

            return (
              <li key={entry.id}>
                {profileUrl ? (
                  <Link
                    href={profileUrl}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                  >
                    {rowContent}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-3">
                    {rowContent}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
})
