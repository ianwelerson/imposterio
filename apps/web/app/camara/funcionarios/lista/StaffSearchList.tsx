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

import { useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { CamaraStaffMember } from "@imposterio/types"

interface StaffSearchListProps {
  /** All staff member records. */
  members: CamaraStaffMember[]
  /** Initial search query from URL. */
  initialQuery?: string
  /** Initial filter values from URL, keyed by filter label. */
  initialFilters?: Record<string, string>
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
 * "Parlamentar" group members with a deputy URI link to the deputy profile;
 * "Secretário Parlamentar" group members link to their own funcionário page;
 * all others link to the staff detail page.
 */
function getStaffHref(member: CamaraStaffMember): string {
  if (member.group.includes("Secretário")) {
    return `/camara/funcionarios/${member.id}`
  }
  const deputyId = extractDeputyId(member.departmentUri)
  if (deputyId && member.group === "Parlamentar") {
    return `/camara/${deputyId}`
  }
  return `/camara/funcionarios/${member.id}`
}

/** URL param keys for each filter label. */
const FILTER_PARAM_MAP: Record<string, string> = {
  Grupo: "grupo",
  Lotação: "lotacao",
  Parlamentar: "parlamentar",
}

export function StaffSearchList({ members, initialQuery, initialFilters }: StaffSearchListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  /** Sync filter state to URL query params (debounced for search). */
  const handleStateChange = useCallback(
    ({ query, filters }: { query: string; filters: Record<string, string> }) => {
      clearTimeout(debounceRef.current)

      const update = () => {
        const params = new URLSearchParams()
        if (query.trim()) params.set("q", query.trim())
        for (const [label, value] of Object.entries(filters)) {
          const param = FILTER_PARAM_MAP[label]
          if (param && value) params.set(param, value)
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }

      // Debounce search query updates by 300ms to avoid excessive URL changes
      debounceRef.current = setTimeout(update, 300)
    },
    [router, pathname],
  )
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
        const isDeputyLink = deputyId && r.group === "Parlamentar"
        return (
          <Link
            href={getStaffHref(r)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            {isDeputyLink ? "Ver deputado →" : "Ver funcionário →"}
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
      initialQuery={initialQuery}
      initialFilters={initialFilters}
      onStateChange={handleStateChange}
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}
