/**
 * @file CompareButton.tsx
 * @description Client component that renders a "Comparar" button linking to
 * the comparison page with the current deputy pre-selected.
 * Tracks the click via Umami analytics.
 */

"use client"

import Link from "next/link"
import { track } from "@/lib/analytics"

interface CompareButtonProps {
  /** Deputy ID to pre-select in the comparison. */
  deputyId: string
  /** Selected year to carry over. */
  year: number
}

export function CompareButton({ deputyId, year }: CompareButtonProps) {
  return (
    <Link
      href={`/camara/comparar?ids=${deputyId}&ano=${year}`}
      onClick={() => track("click_compare", { deputy_id: deputyId })}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      Comparar
    </Link>
  )
}
