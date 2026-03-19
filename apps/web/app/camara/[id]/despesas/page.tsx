/**
 * @file page.tsx
 * @description Full expenses listing for a deputy, with search and pagination.
 *
 * Displays all CEAP expense records for the current year, searchable by
 * expense type, supplier name, and document number. Paginated at 20 items.
 *
 * Data source: GET /deputados/{id}/despesas?ano={year}
 */

import Link from "next/link"
import { getDeputyDetail, getDeputyExpenses } from "@imposterio/fetchers"
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

  const [deputy, expenses] = await Promise.all([
    getDeputyDetail(id),
    getDeputyExpenses(id, selectedYear),
  ])

  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)

  return (
    <>
      <header className="pb-6">
        <Link
          href={`/camara/${id}?ano=${selectedYear}`}
          className="mb-2 inline-block text-sm text-accent hover:text-accent-hover"
        >
          ← Voltar para {deputy.name}
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          Despesas — {deputy.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {expenses.length} registros em {selectedYear} — Total:{" "}
          {totalCeap.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </header>

      <ExpensesList
        expenses={expenses}
        sourceUrl={expenses._source}
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
