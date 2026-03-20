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
import { ToastTrigger } from "@/components/ui"
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
  const expenses = await collectErrors(() => getDeputyExpenses(id, selectedYear), emptySourced([]), errors, "Despesas CEAP")

  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Despesas — {deputy.name}
          </h1>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {expenses.length} registros em {selectedYear} — Total:{" "}
          {totalCeap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </header>

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
    </>
  )
}
