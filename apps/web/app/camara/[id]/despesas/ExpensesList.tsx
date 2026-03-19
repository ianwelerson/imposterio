/**
 * @file ExpensesList.tsx
 * @description Client component for the full expenses listing with search,
 * filters, pagination, and expandable expense detail rows.
 *
 * Filters:
 * - Text search by supplier name
 * - Dropdown filter by expense type (extracted from data)
 *
 * Each row expands on click to show full expense details including
 * the source API link (SourcePill).
 */

"use client"

import { useState, type ReactNode } from "react"
import { SearchableList, DataTable, SourcePill } from "@/components/ui"
import type { DeputyExpense } from "@imposterio/types"

interface ExpensesListProps {
  expenses: DeputyExpense[]
  sourceUrl: string
  /** Optional year selector rendered inline with the filters. */
  yearSelector?: ReactNode
}

export function ExpensesList({ expenses, sourceUrl, yearSelector }: ExpensesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  const columns = [
    {
      header: "Data",
      cell: (r: DeputyExpense) => (
        <span className="text-gray-600">{formatDate(r.date)}</span>
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
        <span className="font-semibold text-red-600">{formatCurrency(r.value)}</span>
      ),
    },
    {
      header: "",
      align: "center" as const,
      cell: (r: DeputyExpense) => {
        const id = `${r.document}-${r.date}`
        const isOpen = expandedId === id
        return (
          <button
            onClick={() => toggle(id)}
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            {isOpen ? "Fechar" : "Detalhes"}
          </button>
        )
      },
    },
  ]

  return (
    <SearchableList
      items={expenses}
      searchAccessor={(e) => e.supplierName}
      filters={[
        { label: "Tipo de despesa", accessor: (e) => e.type, allLabel: "Todos os tipos" },
      ]}
      extraControls={yearSelector}
      pageSize={20}
      placeholder="Buscar por fornecedor..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => `${r.document}-${r.date}`}
          expandedRowKey={expandedId}
          renderExpanded={(r) => (
            <ExpenseDetail expense={r} sourceUrl={sourceUrl} />
          )}
        />
      )}
    </SearchableList>
  )
}

/** Expanded detail panel for a single expense record. */
function ExpenseDetail({
  expense,
  sourceUrl,
}: {
  expense: DeputyExpense
  sourceUrl: string
}) {
  const fields = [
    { label: "Data", value: formatDate(expense.date) },
    { label: "Tipo de despesa", value: expense.type },
    { label: "Fornecedor", value: expense.supplierName },
    { label: "CPF/CNPJ do fornecedor", value: formatDocument(expense.supplierDocument) },
    { label: "Documento", value: expense.document || "—" },
    { label: "Valor líquido", value: formatCurrency(expense.value) },
  ]

  return (
    <div className="bg-gray-50 px-6 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-medium text-gray-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{f.value}</dd>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-500">Fonte oficial:</span>
        <SourcePill url={sourceUrl} />
      </div>
    </div>
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
