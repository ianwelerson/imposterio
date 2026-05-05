/**
 * @file ServantsSearchList.tsx
 * @description Client component for the Senado full servants listing.
 *
 * Wraps `SearchableList` + `DataTable`. Free-text search runs over name,
 * department code/name, position, and category. Filters surface bond
 * (vínculo) and status (situação).
 */

"use client"

import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { SenadoServant } from "@imposterio/types"

interface ServantsSearchListProps {
  servants: SenadoServant[]
}

/** Returns the badge variant matching a Senate servant status. */
function statusVariant(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "ATIVO") return "green"
  if (status === "APOSENTADO") return "amber"
  if (status === "DESLIGADO") return "red"
  return "gray"
}

export function ServantsSearchList({ servants }: ServantsSearchListProps) {
  const columns = [
    {
      header: "Nome",
      cell: (r: SenadoServant) => (
        <span className="text-sm font-medium text-gray-900">{r.name}</span>
      ),
    },
    {
      header: "Vínculo",
      className: "whitespace-nowrap",
      cell: (r: SenadoServant) => {
        const variant = r.bond === "EFETIVO" ? "gray" : r.bond === "COMISSIONADO" ? "amber" : "gray"
        return <Badge variant={variant as "gray" | "amber"}>{r.bond || "—"}</Badge>
      },
    },
    {
      header: "Situação",
      className: "whitespace-nowrap",
      cell: (r: SenadoServant) => (
        <Badge variant={statusVariant(r.status)}>{r.status || "—"}</Badge>
      ),
    },
    {
      header: "Cargo",
      className: "max-w-[14rem]",
      cell: (r: SenadoServant) => (
        <span className="text-gray-700 text-xs truncate block">{r.position || r.role || "—"}</span>
      ),
    },
    {
      header: "Lotação",
      className: "max-w-[14rem]",
      cell: (r: SenadoServant) => (
        <span className="text-gray-600 text-xs truncate block" title={r.departmentName}>
          {r.departmentName || "—"}
        </span>
      ),
    },
    {
      header: "Categoria",
      className: "whitespace-nowrap",
      cell: (r: SenadoServant) => (
        <span className="text-gray-600 text-xs">{r.categoryName || "—"}</span>
      ),
    },
    {
      header: "Admissão",
      className: "whitespace-nowrap text-center",
      cell: (r: SenadoServant) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {r.admissionYear > 0 ? r.admissionYear : "—"}
        </span>
      ),
    },
  ]

  return (
    <SearchableList
      items={servants}
      searchAccessor={(s) =>
        `${s.name} ${s.position} ${s.role} ${s.departmentCode} ${s.departmentName} ${s.categoryName}`
      }
      placeholder="Buscar por nome, cargo ou lotação..."
      filters={[
        {
          label: "Vínculo",
          accessor: (s) => s.bond || "Indefinido",
          allLabel: "Todos os vínculos",
        },
        {
          label: "Situação",
          accessor: (s) => s.status || "Indefinida",
          allLabel: "Todas as situações",
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
