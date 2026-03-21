/**
 * @file ExpensesList.tsx
 * @description Client component for the full expenses listing with search,
 * filters, and pagination. Each row links to a detail page.
 *
 * Filters:
 * - Text search by supplier name
 * - Dropdown filter by expense type (extracted from data)
 */

"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { SearchableList, DataTable } from "@/components/ui"
import type { DeputyExpense } from "@imposterio/types"

interface ExpensesListProps {
  expenses: DeputyExpense[]
  sourceUrl: string
  /** Deputy ID for building detail page links. */
  deputyId: string
  /** Selected year for carrying across page links. */
  selectedYear: number
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function ExpensesList({ expenses, sourceUrl, deputyId, selectedYear, yearSelector }: ExpensesListProps) {
  const columns = [
    {
      header: "Data",
      cell: (r: DeputyExpense) => (
        <Link
          href={`/camara/${deputyId}/despesas/${r.documentCode}?ano=${selectedYear}`}
          className="text-gray-900 hover:text-accent transition-colors tabular-nums"
        >
          {formatDate(r.date)}
        </Link>
      ),
    },
    {
      header: "Tipo",
      cell: (r: DeputyExpense) => (
        <span className="text-gray-900 line-clamp-1">{r.type}</span>
      ),
    },
    {
      header: "Fornecedor",
      cell: (r: DeputyExpense) => (
        <span className="text-gray-600">{r.supplierName}</span>
      ),
    },
    {
      header: "CPF/CNPJ",
      cell: (r: DeputyExpense) => (
        <span className="text-gray-400 text-xs font-mono">
          {formatDocument(r.supplierDocument)}
        </span>
      ),
    },
    {
      header: "Valor",
      align: "right" as const,
      cell: (r: DeputyExpense) => (
        <span className="font-semibold text-red-600 tabular-nums">{formatCurrency(r.value)}</span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: DeputyExpense) => (
        <Link
          href={`/camara/${deputyId}/despesas/${r.documentCode}?ano=${selectedYear}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={expenses}
      searchAccessor={(e) => `${e.supplierName} ${e.document} ${e.type}`}
      filters={[
        { label: "Tipo de despesa", accessor: (e) => e.type, allLabel: "Todos os tipos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por fornecedor, documento ou tipo..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => `${r.documentCode}-${r.date}`}
        />
      )}
    </SearchableList>
  )
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR")
}

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
