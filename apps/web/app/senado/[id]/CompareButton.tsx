/**
 * @file CompareButton.tsx
 * @description Client component that renders a "Comparar" button linking to
 * the Senado comparison page with the current senator pre-selected.
 * Tracks the click via Umami analytics.
 */

"use client"

import Link from "next/link"
import { track } from "@/lib/analytics"

interface CompareButtonProps {
  /** Senator ID to pre-select in the comparison. */
  senatorId: string
  /** Selected year to carry over. */
  year: number
}

export function CompareButton({ senatorId, year }: CompareButtonProps) {
  return (
    <Link
      href={`/senado/comparar?ids=${senatorId}&ano=${year}`}
      onClick={() => track("click_compare", { deputy_id: senatorId })}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:shadow-card transition-all"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      Comparar
    </Link>
  )
}
