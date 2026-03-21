/**
 * @file VoteBreakdown.tsx
 * @description Displays vote tally summary (colored bar) and optional
 * individual parliamentarian votes table.
 *
 * Used in the expandable rows of legislative agenda pages
 * (Câmara pautas, Senado pautas) to show how a proposition was voted.
 */

"use client"

import { useState } from "react"
import type { VoteTally, PropositionVote } from "@imposterio/types"
import { SourcePill } from "./SourcePill"

interface VoteBreakdownProps {
  /** Aggregated vote counts. */
  tally: VoteTally
  /** Individual parliamentarian votes. */
  votes?: PropositionVote[]
  /** API source URL for the vote data. */
  sourceUrl: string
}

const VOTE_COLORS: Record<string, string> = {
  yes: "bg-emerald-500",
  no: "bg-red-500",
  abstention: "bg-amber-400",
  absent: "bg-gray-300",
}

const VOTE_BADGE: Record<string, string> = {
  "Sim": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Não": "bg-red-50 text-red-700 border-red-200",
  "Abstenção": "bg-amber-50 text-amber-700 border-amber-200",
  "Ausente": "bg-gray-100 text-gray-600 border-gray-200",
}

export function VoteBreakdown({ tally, votes, sourceUrl }: VoteBreakdownProps) {
  const [showVotes, setShowVotes] = useState(false)
  const total = tally.yes + tally.no + tally.abstention + tally.absent

  if (total === 0) return null

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-700">
        <span className="font-semibold text-emerald-700">{tally.yes} Sim</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-red-700">{tally.no} Não</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-amber-600">{tally.abstention} Abstenção</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-gray-500">{tally.absent} Ausentes</span>
      </p>

      {/* Proportional bar */}
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Resultado da votação">
        {tally.yes > 0 && (
          <div className={`${VOTE_COLORS.yes}`} style={{ width: pct(tally.yes) }} title={`Sim: ${tally.yes}`} />
        )}
        {tally.no > 0 && (
          <div className={`${VOTE_COLORS.no}`} style={{ width: pct(tally.no) }} title={`Não: ${tally.no}`} />
        )}
        {tally.abstention > 0 && (
          <div className={`${VOTE_COLORS.abstention}`} style={{ width: pct(tally.abstention) }} title={`Abstenção: ${tally.abstention}`} />
        )}
        {tally.absent > 0 && (
          <div className={`${VOTE_COLORS.absent}`} style={{ width: pct(tally.absent) }} title={`Ausentes: ${tally.absent}`} />
        )}
      </div>

      {/* Toggle individual votes */}
      {votes && votes.length > 0 && (
        <>
          <button
            onClick={() => setShowVotes(!showVotes)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            {showVotes ? "Ocultar votos individuais" : `Ver votos individuais (${votes.length})`}
          </button>

          {showVotes && (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Parlamentar</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Partido</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">UF</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Voto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {votes.map((v) => (
                    <tr key={v.parliamentarianId} className="hover:bg-gray-50/50">
                      <td className="px-3 py-1.5 text-gray-900">{v.parliamentarianName}</td>
                      <td className="px-3 py-1.5 text-gray-600">{v.party}</td>
                      <td className="px-3 py-1.5 text-gray-600">{v.uf}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${VOTE_BADGE[v.vote] ?? ""}`}>
                          {v.vote}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="pt-1">
        <SourcePill url={sourceUrl} />
      </div>
    </div>
  )
}
