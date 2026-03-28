/**
 * @file CaucusDetailSection.tsx
 * @description Card grid for parliamentary caucuses (frentes parlamentares).
 *
 * Each caucus renders as a card with name, legislature badge, member count,
 * and a one-line purpose. A collapsible section reveals the full member list
 * (name, party, UF). Layout: 2-col on desktop, 1-col on mobile.
 */

"use client"

import { useState } from "react"
import { Badge, SourcePill } from "@/components/ui"

export interface CaucusMember {
  name: string
  party?: string
  uf?: string
}

export interface CaucusCard {
  id: number
  name: string
  legislature?: number
  purpose?: string
  memberCount: number
  members?: CaucusMember[]
  sourceUrl?: string
}

interface CaucusDetailSectionProps {
  caucuses: CaucusCard[]
  sourceUrl?: string
}

function CaucusCardItem({ caucus }: { caucus: CaucusCard }) {
  const [open, setOpen] = useState(false)
  const hasMembers = caucus.members && caucus.members.length > 0

  return (
    <article className="rounded-xl border border-gray-200/80 bg-white shadow-card">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-gray-900">
            {caucus.name}
          </h3>
          {caucus.legislature && (
            <Badge variant="gray">{caucus.legislature}ª leg.</Badge>
          )}
        </div>

        {caucus.purpose && (
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500 line-clamp-2">
            {caucus.purpose}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {caucus.memberCount} {caucus.memberCount === 1 ? "membro" : "membros"}
          </span>
          {caucus.sourceUrl && <SourcePill url={caucus.sourceUrl} />}
        </div>
      </div>

      {/* Collapsible member list */}
      {hasMembers && (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex w-full items-center justify-between border-t border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
          >
            <span>{open ? "Ocultar membros" : "Ver membros"}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {open && (
            <div className="max-h-60 overflow-y-auto border-t border-gray-100 px-4 py-2">
              <ul className="space-y-1">
                {caucus.members!.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-700">{m.name}</span>
                    {m.party && (
                      <span className="text-gray-400">{m.party}</span>
                    )}
                    {m.uf && (
                      <span className="text-gray-400">· {m.uf}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export function CaucusDetailSection({ caucuses, sourceUrl }: CaucusDetailSectionProps) {
  if (caucuses.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Nenhuma frente parlamentar encontrada para este deputado.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {caucuses.map((c) => (
        <CaucusCardItem key={c.id} caucus={c} />
      ))}
    </div>
  )
}
