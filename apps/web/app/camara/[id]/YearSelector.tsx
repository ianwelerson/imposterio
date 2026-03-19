/**
 * @file YearSelector.tsx
 * @description Client component that renders a dropdown to select the
 * reference year for expense data. Changing the year updates the URL
 * search param `?ano=YYYY`, triggering a server-side re-render with
 * the new year's data. Shows a loading spinner during the transition.
 */

"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

interface YearSelectorProps {
  /** Available years, ordered most recent first. */
  years: number[]
  /** Currently selected year. */
  selected: number
  /**
   * When true, renders only the select + spinner without wrapper styling.
   * Use when embedding inside another filter row (e.g. SearchableList).
   * @default false
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
       text-sm text-gray-900
       focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
       disabled:cursor-wait disabled:opacity-60`
    : `rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm
       font-medium text-gray-700 shadow-sm hover:border-gray-400
       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
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
