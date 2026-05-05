/**
 * @file ContractsSearchList.tsx
 * @description Client component for the Senado full contracts listing.
 *
 * Wraps `SearchableList` + `DataTable`. Free-text search runs over contract
 * number, object, and supplier. Filters are provided for modality and contract
 * sub-species. Each row links to the official notice / publication metadata
 * via the formatted contract number; no per-contract drill-down page yet.
 */

"use client"

import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { SenadoContract } from "@imposterio/types"

interface ContractsSearchListProps {
  contracts: SenadoContract[]
}

/** Returns the badge variant matching a Senate contract sub-species. */
function subSpeciesVariant(code: string): "green" | "amber" | "gray" {
  if (code === "CT") return "green"
  if (code === "TC" || code === "CV") return "amber"
  return "gray"
}

export function ContractsSearchList({ contracts }: ContractsSearchListProps) {
  const columns = [
    {
      header: "Número",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <span className="font-semibold text-gray-900">{row.formattedNumber || row.number}</span>
      ),
    },
    {
      header: "Objeto",
      className: "max-w-md",
      cell: (row: SenadoContract) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">{row.object}</span>
      ),
    },
    {
      header: "Empresa",
      className: "max-w-[14rem]",
      cell: (row: SenadoContract) => (
        <span className="text-gray-700 text-xs truncate block" title={row.supplierName}>
          {row.supplierName}
        </span>
      ),
    },
    {
      header: "CNPJ/CPF",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <span className="text-gray-500 text-xs tabular-nums">{row.supplierDocument || "—"}</span>
      ),
    },
    {
      header: "Modalidade",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <span className="text-gray-600 text-xs">{row.modality || "—"}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <Badge variant={subSpeciesVariant(row.subSpeciesCode)}>
          {row.subSpeciesName || row.subSpeciesCode || "—"}
        </Badge>
      ),
    },
    {
      header: "Assinatura",
      className: "whitespace-nowrap",
      cell: (row: SenadoContract) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {row.signatureDate
            ? new Date(row.signatureDate).toLocaleDateString("pt-BR")
            : "—"}
        </span>
      ),
    },
  ]

  return (
    <SearchableList
      items={contracts}
      searchAccessor={(c) =>
        `${c.formattedNumber} ${c.number} ${c.object} ${c.supplierName} ${c.supplierDocument}`
      }
      placeholder="Buscar por número, objeto, empresa ou CNPJ..."
      filters={[
        {
          label: "Tipo",
          accessor: (c) => c.subSpeciesName || c.subSpeciesCode || "Não classificado",
          allLabel: "Todos os tipos",
        },
        {
          label: "Modalidade",
          accessor: (c) => c.modality || "Não se aplica",
          allLabel: "Todas as modalidades",
        },
      ]}
      pageSize={20}
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.id}
        />
      )}
    </SearchableList>
  )
}
