/**
 * @file YearSelector.tsx
 * @description Year filter for the empresas overview, mirroring the
 * `camara/[id]/YearSelector` pattern (URL-driven `?ano=YYYY`,
 * useTransition for loading state).
 *
 * Co-located here rather than in a shared location because each section's
 * header layout is slightly different — `inline` styling toggles between
 * the standalone (page header) and embedded (filter row) variants.
 */

"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { track } from "@/lib/analytics"

interface YearSelectorProps {
  /** Years to choose from, ordered most recent first. */
  years: number[]
  /** Currently selected year. */
  selected: number
  /**
   * When true, drops the wrapper styling so the select fits inside another
   * filter row. Default = standalone pill styling.
   */
  inline?: boolean
}

export function YearSelector({ years, selected, inline = false }: YearSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      track("change_year", { year: e.target.value, page: pathname })
      const params = new URLSearchParams(searchParams.toString())
      params.set("ano", e.target.value)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams],
  )

  const selectClasses = inline
    ? `w-full rounded-lg border border-gray-200 bg-white px-3 py-2
       text-sm text-gray-900 shadow-xs
       focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10
       disabled:cursor-wait disabled:opacity-60`
    : `rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm
       font-medium text-gray-700 shadow-xs hover:border-gray-300
       focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10
       disabled:cursor-wait disabled:opacity-60`

  return (
    <div className="flex items-center gap-2">
      {isPending && (
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"
          role="status"
          aria-label="Carregando..."
        />
      )}
      <select
        value={selected}
        onChange={handleChange}
        disabled={isPending}
        className={selectClasses}
        aria-label="Selecionar ano de referência"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
