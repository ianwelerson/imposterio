/**
 * @file SuppliersList.tsx
 * @description Client wrapper for the full suppliers listing.
 *
 * Wraps the server-fetched rows in a {@link SearchableList} so the user can
 * filter by name / CNPJ and paginate through hundreds of entries without a
 * round trip. Keeps the heavy `DataTable` columns identical to the overview
 * "top 10" panel so visitors don't see a layout jump when they click "Ver
 * lista completa".
 */

"use client"

import Link from "next/link"

import { DataTable, SearchableList } from "@/components/ui"
import type { TopCompanyRow } from "@imposterio/db/queries/companies"
import { formatBRLCompact } from "@/lib/calc/currency"

interface SuppliersListProps {
  rows: TopCompanyRow[]
  initialQuery?: string
}

export function SuppliersList({ rows, initialQuery = "" }: SuppliersListProps) {
  return (
    <SearchableList
      items={rows}
      initialQuery={initialQuery}
      placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
      pageSize={25}
      searchAccessor={(r) =>
        [r.legalName, r.tradeName, r.cnpj, formatCnpj(r.cnpj), r.uf]
          .filter(Boolean)
          .join(" ")
      }
    >
      {(filtered) => (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.cnpj}
        />
      )}
    </SearchableList>
  )
}

const columns = [
  {
    header: "Empresa",
    cell: (r: TopCompanyRow) => {
      const display = r.tradeName || r.legalName || formatCnpj(r.cnpj)
      const subtitle =
        r.tradeName && r.legalName && r.tradeName !== r.legalName
          ? r.legalName
          : null
      return (
        <div className="flex flex-col">
          <Link
            href={`/empresas/${r.cnpj}`}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {display}
          </Link>
          {subtitle && (
            <span className="text-[11px] text-gray-400">{subtitle}</span>
          )}
        </div>
      )
    },
  },
  {
    header: "CNPJ",
    cell: (r: TopCompanyRow) => (
      <span className="font-mono text-sm text-gray-500">
        {formatCnpj(r.cnpj)}
      </span>
    ),
  },
  {
    header: "UF",
    align: "center" as const,
    cell: (r: TopCompanyRow) => (
      <span className="text-gray-600">{r.uf || "—"}</span>
    ),
  },
  {
    header: "Total observado",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="font-semibold text-gray-900">
        {formatBRLCompact(r.total)}
      </span>
    ),
  },
  {
    header: "Registros",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="font-mono tabular-nums text-gray-600">{r.count}</span>
    ),
  },
  {
    header: "Atualizado em",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="text-xs text-gray-500">
        {r.lastObservedAt.toLocaleDateString("pt-BR")}
      </span>
    ),
  },
]

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}
