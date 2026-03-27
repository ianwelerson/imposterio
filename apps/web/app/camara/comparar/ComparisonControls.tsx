/**
 * @file ComparisonControls.tsx
 * @description Client component that wraps the year selector and deputy picker
 * in a shared useTransition, so that ANY navigation (year change or deputy
 * add/remove) shows a loading state on the picker slots.
 */

"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { track } from "@/lib/analytics"
import { DeputyPicker } from "./DeputyPicker"

interface DeputyOption {
  id: string
  name: string
  party: string
  uf: string
  photoUrl?: string
}

interface ComparisonControlsProps {
  /** Full list of deputies for search autocomplete. */
  allDeputies: DeputyOption[]
  /** Currently selected deputy IDs (from URL). */
  selectedIds: string[]
  /** Available years for the dropdown. */
  years: number[]
  /** Currently selected year. */
  selectedYear: number
}

export function ComparisonControls({
  allDeputies,
  selectedIds,
  years,
  selectedYear,
}: ComparisonControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  /** Navigates with shared transition so ALL controls show loading. */
  const navigate = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams],
  )

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      track("comparison_year", { year: e.target.value })
      navigate((params) => params.set("ano", e.target.value))
    },
    [navigate],
  )

  return (
    <>
      {/* Header with year selector */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Comparar deputados</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Compare até 3 deputados lado a lado — despesas, votações e atividade parlamentar.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 backdrop-blur-sm">
          <span className="text-sm font-medium text-white/80">Ver dados de</span>
          {isPending && (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"
              role="status"
              aria-label="Carregando..."
            />
          )}
          <select
            value={selectedYear}
            onChange={handleYearChange}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm
                       font-medium text-gray-700 shadow-sm hover:border-gray-400
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                       disabled:cursor-wait disabled:opacity-60"
            aria-label="Selecionar ano de referência"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
            </div>
          </div>
        </div>
      </header>

      {/* Deputy picker — receives shared loading + navigate */}
      <section className="mb-12">
        <DeputyPicker
          allDeputies={allDeputies}
          selectedIds={selectedIds}
          loading={isPending}
          navigate={navigate}
        />
        {selectedIds.length < 2 && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Selecione pelo menos 2 deputados para comparar
          </p>
        )}
      </section>
    </>
  )
}
