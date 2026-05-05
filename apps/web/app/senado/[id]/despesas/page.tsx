/**
 * @file page.tsx
 * @description Full CEAPS expenses listing for a senator.
 *
 * Displays all CEAPS expense records for the selected year, searchable by
 * expense type and supplier. Year is URL-driven via `?ano=YYYY`.
 *
 * Data source: GET admin CEAPS bulk file filtered by senator.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import {
  getSenatorDetail,
  getSenatorExpenses,
  ApiError,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { ExpensesList } from "./ExpensesList"

const FIRST_CEAPS_YEAR = 2009

interface ExpensesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function SenatorExpensesPage({ params, searchParams }: ExpensesPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_CEAPS_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAPS_YEAR + 1 },
    (_, i) => now - i,
  )

  let senator
  try {
    senator = await getSenatorDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const errors: PageError[] = []
  const failed = new Set<string>()
  const expenses = await collectErrors(
    () => getSenatorExpenses(id, selectedYear),
    emptySourced([]),
    errors,
    "Gastos CEAPS",
    failed,
  )

  const totalCeaps = expenses.reduce((sum, e) => sum + e.value, 0)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/senado/${id}?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {senator.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gastos CEAPS</h1>
              {!failed.has("Gastos CEAPS") && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  Total em {selectedYear}:{" "}
                  {totalCeaps.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={expenses._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Gastos CEAPS") ? (
        <DataFetchError label="as despesas" />
      ) : (
        <ExpensesList
          expenses={expenses}
          yearSelector={
            <div className="w-full sm:w-auto sm:min-w-[100px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Ano</label>
              <YearSelector years={availableYears} selected={selectedYear} inline />
            </div>
          }
        />
      )}
    </>
  )
}
