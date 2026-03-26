/**
 * @file StaffSearchList.tsx
 * @description Client component for the staff listing with search, filters, and pagination.
 *
 * Implements the standard SearchableList pattern with:
 * - Text search by name, position, department, or role
 * - Dropdown filter by group type (Quadro Efetivo, Parlamentar, etc.)
 * - Dropdown filter by department (top departments extracted from data)
 * - Pagination (20 per page)
 *
 * Staff members in the "Parlamentar" group whose departmentUri contains
 * `/deputados/` link directly to the deputy's profile page instead of
 * the staff detail page.
 */

"use client"

import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { CamaraStaffMember } from "@imposterio/types"

interface StaffSearchListProps {
  /** All staff member records. */
  members: CamaraStaffMember[]
}

/**
 * Extracts the deputy ID from a departmentUri containing `/deputados/{id}`.
 * Returns null if the URI does not match the pattern.
 */
function extractDeputyId(departmentUri: string): string | null {
  const match = departmentUri.match(/\/deputados\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Returns the parliamentarian name associated with a staff member.
 * Members whose departmentUri contains `/deputados/` are linked to a deputy,
 * and their department field typically contains the gabinete name.
 * All other members return "Sem vínculo parlamentar".
 */
function getParliamentarianName(m: CamaraStaffMember): string {
  if (m.departmentUri.includes("/deputados/")) {
    return m.department || "Gabinete parlamentar"
  }
  return "Sem vínculo parlamentar"
}

/**
 * Returns the link target for a staff member row.
 * Parliamentary group members with a deputy URI link to the deputy profile;
 * all others link to the staff detail page.
 */
function getStaffHref(member: CamaraStaffMember): string {
  const deputyId = extractDeputyId(member.departmentUri)
  if (deputyId) {
    return `/camara/${deputyId}`
  }
  return `/camara/funcionarios/${member.id}`
}

export function StaffSearchList({ members }: StaffSearchListProps) {
  const columns = [
    {
      header: "Nome",
      cell: (r: CamaraStaffMember) => (
        <Link
          href={getStaffHref(r)}
          className="font-medium text-gray-900 hover:text-accent transition-colors"
        >
          {r.name}
        </Link>
      ),
    },
    {
      header: "Grupo",
      cell: (r: CamaraStaffMember) => {
        const variant = r.group.includes("Parlamentar")
          ? "green"
          : r.group.includes("Efetivo")
            ? "gray"
            : r.group.includes("Secretário")
              ? "amber"
              : "gray"
        return <Badge variant={variant as "green" | "gray" | "amber"}>{r.group}</Badge>
      },
    },
    {
      header: "Cargo",
      className: "max-w-[10rem]",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs">{r.position || "—"}</span>
      ),
    },
    {
      header: "Lotação",
      className: "max-w-[14rem]",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs truncate block" title={r.department}>
          {r.department || "—"}
        </span>
      ),
    },
    {
      header: "Função",
      className: "max-w-[10rem]",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs truncate block" title={r.role}>
          {r.role || "—"}
        </span>
      ),
    },
    {
      header: "Início",
      className: "whitespace-nowrap",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs tabular-nums">
          {r.historyStartDate
            ? new Date(r.historyStartDate).toLocaleDateString("pt-BR")
            : "—"}
        </span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: CamaraStaffMember) => {
        const deputyId = extractDeputyId(r.departmentUri)
        return (
          <Link
            href={getStaffHref(r)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            {deputyId ? "Ver deputado →" : "Detalhes →"}
          </Link>
        )
      },
    },
  ]

  return (
    <SearchableList
      items={members}
      searchAccessor={(m) => `${m.name} ${m.position} ${m.department} ${m.role}`}
      filters={[
        { label: "Grupo", accessor: (m) => m.group },
        { label: "Lotação", accessor: (m) => m.department },
        { label: "Parlamentar", accessor: getParliamentarianName, allLabel: "Todos" },
      ]}
      pageSize={20}
      placeholder="Buscar por nome, cargo, lotação ou função..."
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}
