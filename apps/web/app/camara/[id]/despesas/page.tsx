/**
 * @file page.tsx
 * @description Full expenses listing for a deputy, with search and pagination.
 *
 * Displays all CEAP expense records for the current year, searchable by
 * expense type, supplier name, and document number. Paginated at 20 items.
 *
 * Data source: GET /deputados/{id}/despesas?ano={year}
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { getDeputyDetail, getDeputyExpenses } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "../YearSelector"
import { ExpensesList } from "./ExpensesList"

/** CEAP data is available from 2008 onward. */
const FIRST_CEAP_YEAR = 2008

interface ExpensesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function ExpensesPage({ params, searchParams }: ExpensesPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_CEAP_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAP_YEAR + 1 },
    (_, i) => now - i,
  )

  let deputy
  try {
    deputy = await getDeputyDetail(id)
  } catch {
    notFound()
  }

  const errors: PageError[] = []
  const failed = new Set<string>()
  const expenses = await collectErrors(() => getDeputyExpenses(id, selectedYear), emptySourced([]), errors, "Despesas CEAP", failed)

  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/${id}?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {deputy.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Despesas CEAP</h1>
              {!failed.has("Despesas CEAP") && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  Total em {selectedYear}:{" "}
                  {totalCeap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={expenses._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Despesas CEAP") ? (
        <DataFetchError label="as despesas" />
      ) : (
        <ExpensesList
          expenses={expenses}
          sourceUrl={expenses._source}
          deputyId={id}
          selectedYear={selectedYear}
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
