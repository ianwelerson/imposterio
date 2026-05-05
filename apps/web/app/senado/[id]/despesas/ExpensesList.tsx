/**
 * @file ExpensesList.tsx
 * @description Client component for the full senator CEAPS expenses listing.
 *
 * Filters:
 * - Text search by supplier name, document, or expense type
 * - Dropdown filter by expense type
 * - Year selector via the `extraControls` slot
 */

"use client"

import type { ReactNode } from "react"
import { SearchableList, DataTable } from "@/components/ui"
import type { SenatorExpense } from "@imposterio/types"

interface ExpensesListProps {
  expenses: SenatorExpense[]
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function ExpensesList({ expenses, yearSelector }: ExpensesListProps) {
  const columns = [
    {
      header: "Data",
      cell: (r: SenatorExpense) => (
        <span className="text-gray-900 tabular-nums">{formatDate(r.date)}</span>
      ),
    },
    {
      header: "Tipo",
      cell: (r: SenatorExpense) => (
        <span className="text-gray-900 line-clamp-1">{r.type}</span>
      ),
    },
    {
      header: "Fornecedor",
      cell: (r: SenatorExpense) => (
        <span className="text-gray-600">{r.supplierName || "—"}</span>
      ),
    },
    {
      header: "CPF/CNPJ",
      cell: (r: SenatorExpense) => (
        <span className="text-gray-400 text-xs font-mono">
          {formatDocument(r.supplierDocument)}
        </span>
      ),
    },
    {
      header: "Documento",
      cell: (r: SenatorExpense) =>
        r.documentUrl ? (
          <a
            href={r.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            Ver ↗
          </a>
        ) : (
          <span className="text-xs text-gray-400">{r.document || "—"}</span>
        ),
    },
    {
      header: "Valor",
      align: "right" as const,
      cell: (r: SenatorExpense) => (
        <span className="font-semibold text-red-600 tabular-nums">{formatCurrency(r.value)}</span>
      ),
    },
  ]

  return (
    <SearchableList
      items={expenses}
      searchAccessor={(e) => `${e.supplierName} ${e.supplierDocument ?? ""} ${e.type}`}
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
          rowKey={(r, i) => `${r.documentCode ?? r.document ?? "exp"}-${r.date}-${i}`}
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

function formatDocument(doc: string | undefined): string {
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
