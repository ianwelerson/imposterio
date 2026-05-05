/**
 * @file RedFlagsCard.tsx
 * @description Inline transparency alerts — renders inside the Resumo Geral
 * section directly below the overview StatCards. Only shown when at least one
 * flag is triggered. Each alert row has its description on the left and a
 * "Ver detalhes" link flush-right on the same row.
 *
 * Same UI as the Câmara version, but lives next to the Senado page so the
 * thresholds and triggers can evolve independently.
 */

"use client"

import { Badge } from "@/components/ui"

export interface RedFlag {
  id: string
  title: string
  description: string
  anchorHref: string
  severity: "red" | "amber"
}

interface RedFlagsCardProps {
  flags: RedFlag[]
}

export function RedFlagsCard({ flags }: RedFlagsCardProps) {
  if (flags.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4" id="alertas">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-amber-900">
          Alertas de transparência
        </h3>
        <span className="text-[11px] text-amber-600">
          {flags.length} {flags.length === 1 ? "alerta" : "alertas"}
        </span>
      </div>

      <ul className="space-y-2">
        {flags.map((flag) => (
          <li
            key={flag.id}
            className="flex items-center gap-3 rounded-lg border border-amber-100/80 bg-white/60 px-3 py-2"
          >
            <Badge variant={flag.severity}>{flag.title}</Badge>
            <p className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={flag.description}>
              {flag.description}
            </p>
            <a
              href={flag.anchorHref}
              className="shrink-0 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver detalhes →
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-amber-700/60">
        Alertas gerados automaticamente com base em dados públicos oficiais. Não representam acusação.
      </p>
    </div>
  )
}
