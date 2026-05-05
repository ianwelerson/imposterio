/**
 * @file CommitteesList.tsx
 * @description Client component listing all senator committee memberships
 * with search and filter, plus a separate panel for chair/director positions.
 *
 * Filters:
 * - Text search by abbreviation, name, or role
 * - Dropdown filter by status (Ativa / Encerrada)
 * - Dropdown filter by committee type (Permanente, Especial, CPI, etc.)
 */

"use client"

import { SearchableList, DataTable, Badge, SectionHeader } from "@/components/ui"
import type { SenatorCommittee, SenatorPosition } from "@imposterio/types"

interface CommitteesListProps {
  committees: SenatorCommittee[]
  positions: SenatorPosition[]
}

export function CommitteesList({ committees, positions }: CommitteesListProps) {
  const committeeColumns = [
    {
      header: "Comissão",
      cell: (r: SenatorCommittee) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{r.abbreviation}</span>
          <span className="text-xs text-gray-500 line-clamp-1">{r.name}</span>
        </div>
      ),
    },
    {
      header: "Tipo",
      cell: (r: SenatorCommittee) => <span className="text-gray-600 text-sm">{r.type}</span>,
    },
    {
      header: "Função",
      cell: (r: SenatorCommittee) => (
        <Badge variant={r.role.toLowerCase().startsWith("titular") ? "green" : "gray"}>
          {r.role}
        </Badge>
      ),
    },
    {
      header: "Início",
      cell: (r: SenatorCommittee) => (
        <span className="text-gray-600 tabular-nums text-sm">{formatDate(r.startDate)}</span>
      ),
    },
    {
      header: "Status",
      align: "right" as const,
      cell: (r: SenatorCommittee) =>
        r.endDate ? (
          <span className="text-xs text-gray-500">até {formatDate(r.endDate)}</span>
        ) : (
          <Badge variant="green">Atual</Badge>
        ),
    },
  ]

  const positionColumns = [
    {
      header: "Cargo",
      cell: (r: SenatorPosition) => (
        <span className="font-medium text-gray-900">{r.name || "—"}</span>
      ),
    },
    {
      header: "Comissão",
      cell: (r: SenatorPosition) => (
        <span className="text-gray-700 text-sm">
          {r.committeeAbbreviation || r.committeeName}
        </span>
      ),
    },
    {
      header: "Início",
      cell: (r: SenatorPosition) => (
        <span className="text-gray-600 tabular-nums text-sm">{formatDate(r.startDate)}</span>
      ),
    },
    {
      header: "Status",
      align: "right" as const,
      cell: (r: SenatorPosition) =>
        r.endDate ? (
          <span className="text-xs text-gray-500">até {formatDate(r.endDate)}</span>
        ) : (
          <Badge variant="green">Atual</Badge>
        ),
    },
  ]

  return (
    <>
      <SearchableList
        items={committees}
        searchAccessor={(c) => `${c.abbreviation} ${c.name} ${c.role}`}
        filters={[
          {
            label: "Status",
            accessor: (c) => (c.endDate ? "Encerrada" : "Ativa"),
            allLabel: "Todas",
          },
          { label: "Tipo", accessor: (c) => c.type, allLabel: "Todos os tipos" },
        ]}
        pageSize={20}
        placeholder="Buscar por sigla, nome ou função..."
      >
        {(paged) => (
          <DataTable columns={committeeColumns} data={paged} rowKey={(r) => r.id} />
        )}
      </SearchableList>

      {positions.length > 0 && (
        <section className="mt-12 border-t border-gray-200/60 pt-10">
          <SectionHeader
            title="Cargos de direção"
            description="Presidência, vice-presidência e demais cargos em comissões."
          />
          <DataTable columns={positionColumns} data={positions} rowKey={(r) => r.id} />
        </section>
      )}
    </>
  )
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return "—"
  const [y, m, d] = isoDate.slice(0, 10).split("-")
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}
