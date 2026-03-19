/**
 * @file page.tsx
 * @description Individual deputy detail page.
 *
 * Displays comprehensive data for a single deputy from the Câmara dos Deputados:
 * - Profile header with photo (name, party, state, status)
 * - Key metrics (CEAP total for current year)
 * - Biographical info panel
 * - Expense comparison chart (current year vs last year)
 * - Recent expenses table (last 10, with link to full listing)
 *
 * Data sources:
 * - Profile: GET /deputados/{id}
 * - Expenses: GET /deputados/{id}/despesas
 */

import {
  StatCard, DataTable, SectionHeader,
  ProfileHeader, InfoPanel,
} from "@/components/ui"
import { getDeputyDetail, getDeputyExpenses } from "@imposterio/fetchers"
import { DeputyExpenseCharts } from "./DeputyExpenseCharts"
import { YearSelector } from "./YearSelector"
import {
  aggregateByMonth,
  aggregateByCategory,
  aggregateBySupplier,
  monthlyToBarData,
  aggregateByDay,
  aggregateCategoryBySupplier,
} from "./expense-utils"

/** CEAP data is available from 2008 onward. */
const FIRST_CEAP_YEAR = 2008

interface DeputyDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function DeputyDetailPage({ params, searchParams }: DeputyDetailPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  // Selected year from URL, clamped to valid range, defaults to current year
  const selectedYear = query.ano
    ? Math.max(FIRST_CEAP_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAP_YEAR + 1 },
    (_, i) => now - i,
  )

  const [deputy, expenses, prevYearExpenses] = await Promise.all([
    getDeputyDetail(id),
    getDeputyExpenses(id, selectedYear),
    getDeputyExpenses(id, selectedYear - 1),
  ])

  const initials = deputy.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")

  const tags = [
    deputy.party,
    deputy.uf,
    `${deputy.legislature}ª Legislatura`,
    deputy.situation ?? "Em exercício",
  ]

  const infoFields = [
    { label: "Nome civil", value: deputy.fullName },
    deputy.electoralName && deputy.electoralName !== deputy.name
      && { label: "Nome eleitoral", value: deputy.electoralName },
    deputy.birthDate && { label: "Data de nascimento", value: formatDate(deputy.birthDate) },
    deputy.birthPlace && { label: "Naturalidade", value: deputy.birthPlace },
    deputy.education && { label: "Escolaridade", value: deputy.education },
    deputy.email && { label: "E-mail", value: deputy.email },
    deputy.office && { label: "Gabinete", value: deputy.office },
    deputy.phone && { label: "Telefone", value: deputy.phone },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  // Compute totals for stat cards
  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)
  const prevYearTotal = prevYearExpenses.reduce((sum, e) => sum + e.value, 0)
  const ceapVariation = prevYearTotal > 0
    ? ((totalCeap - prevYearTotal) / prevYearTotal) * 100
    : null

  // Chart data: aggregate expenses for different visualizations
  const currentMonthly = aggregateByMonth(expenses)
  const prevYearMonthly = aggregateByMonth(prevYearExpenses)
  const byCategory = aggregateByCategory(expenses)
  const bySupplier = aggregateBySupplier(expenses)
  const monthlyBarData = monthlyToBarData(currentMonthly)
  const dailyExpenses = aggregateByDay(expenses)
  const categoryBySupplier = aggregateCategoryBySupplier(expenses)

  // Show only last 10 expenses on the detail page
  const recentExpenses = expenses.slice(0, 10)

  const expenseColumns = [
    {
      header: "Data",
      cell: (r: (typeof expenses)[number]) => (
        <span className="text-gray-600">{formatDate(r.date)}</span>
      ),
    },
    {
      header: "Tipo",
      cell: (r: (typeof expenses)[number]) => (
        <span className="text-gray-900 line-clamp-1">{r.type}</span>
      ),
    },
    {
      header: "Fornecedor",
      cell: (r: (typeof expenses)[number]) => (
        <span className="text-gray-600 line-clamp-1">{r.supplierName}</span>
      ),
    },
    {
      header: "CPF/CNPJ",
      cell: (r: (typeof expenses)[number]) => (
        <span className="text-gray-400 text-xs font-mono">
          {formatDocument(r.supplierDocument)}
        </span>
      ),
    },
    {
      header: "Valor",
      align: "right" as const,
      cell: (r: (typeof expenses)[number]) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(r.value)}
        </span>
      ),
    },
  ]

  return (
    <>
      <ProfileHeader
        initials={initials}
        name={deputy.name}
        tags={tags}
        sourceUrl={deputy._source}
        photoUrl={deputy.photoUrl}
      />

      {/* ── Dados pessoais ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* ── Gastos CEAP ────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader title="Gastos CEAP" />
          <YearSelector years={availableYears} selected={selectedYear} />
        </div>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Indicadores de gastos"
        >
          <StatCard
            label={`Total (${selectedYear})`}
            value={formatCurrency(totalCeap)}
            badge={ceapVariation !== null ? {
              text: `${ceapVariation > 0 ? "+" : ""}${ceapVariation.toFixed(1)}% vs ${selectedYear - 1}`,
              variant: ceapVariation > 5 ? "red" : ceapVariation < -5 ? "green" : "amber",
            } : undefined}
          />
          <StatCard
            label={`Total (${selectedYear - 1})`}
            value={formatCurrency(prevYearTotal)}
          />
          <StatCard
            label={`Registros (${selectedYear})`}
            value={`${expenses.length}`}
          />
        </div>

        {/* TODO: Add attendance, votes, and caucuses StatCards once bulk data and
            voting API integration are complete (see TODO.md) */}
      </section>

      {/* ── Visualizações ──────────────────────────────────────────── */}
      {(expenses.length > 0 || prevYearExpenses.length > 0) && (
        <section className="mt-10">
          <SectionHeader title="Visualizações" />
          <DeputyExpenseCharts
            selectedYearMonthly={currentMonthly}
            prevYearMonthly={prevYearMonthly}
            year={selectedYear}
            byCategory={byCategory}
            bySupplier={bySupplier}
            monthlyBarData={monthlyBarData}
            dailyExpenses={dailyExpenses}
            categoryBySupplier={categoryBySupplier}
            sourceUrl={expenses._source}
          />
        </section>
      )}

      {/* ── Despesas recentes ──────────────────────────────────────── */}
      <section className="mt-10">
        <SectionHeader
          title={`Despesas recentes — ${selectedYear}`}
          sourceUrl={expenses._source}
          action={expenses.length > 10
            ? { label: "Ver todas", href: `/camara/${id}/despesas?ano=${selectedYear}` }
            : undefined}
        />
        {recentExpenses.length > 0 ? (
          <DataTable columns={expenseColumns} data={recentExpenses} rowKey={(r) => r.document} />
        ) : (
          <p className="rounded-lg border border-gray-200/60 bg-white p-5 text-sm text-gray-500">
            Nenhuma despesa registrada para {selectedYear}.
          </p>
        )}
      </section>
    </>
  )
}

/** Formats an ISO date string to DD/MM/YYYY. */
function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR")
}

/** Formats a number as BRL currency. */
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Formats a CPF or CNPJ string with the standard Brazilian mask.
 * CPF (11 digits): 123.456.789-00
 * CNPJ (14 digits): 12.345.678/0001-90
 */
function formatDocument(doc: string): string {
  if (!doc) return "—"
  const digits = doc.replace(/\D/g, "")
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
  return doc
}
