/**
 * @file DeputiesSearchList.tsx
 * @description Client component for the deputies listing with search, filters,
 * sortable columns, and pagination.
 *
 * Columns are sortable by name, party, UF, CEAP total, and attendance rate.
 * Sort state is persisted in the URL via query parameters (?sort=ceap&dir=desc).
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { SearchableList, DataTable, AvatarInitials } from "@/components/ui"
import type { Deputy } from "@imposterio/types"

/** Deputy data enriched with optional CEAP and attendance metrics. */
export interface EnrichedDeputy extends Deputy {
  /** Total CEAP spending for the current year (BRL). Undefined if bulk data unavailable. */
  ceapTotal?: number
  /** Attendance rate as a percentage (0–100). Undefined if bulk data unavailable. */
  attendanceRate?: number
}

type SortColumn = "name" | "party" | "uf" | "ceap" | "attendance"
type SortDir = "asc" | "desc"

interface DeputiesSearchListProps {
  deputies: EnrichedDeputy[]
  /** Initial sort column from URL. */
  initialSort?: string
  /** Initial sort direction from URL. */
  initialDir?: SortDir
}

const SORT_COLUMNS: Array<{ key: SortColumn; label: string }> = [
  { key: "name", label: "Nome" },
  { key: "party", label: "Partido" },
  { key: "uf", label: "UF" },
  { key: "ceap", label: "CEAP" },
  { key: "attendance", label: "Presença" },
]

/** Sort indicator arrow. */
function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-indigo-600">{dir === "asc" ? "↑" : "↓"}</span>
}

export function DeputiesSearchList({
  deputies,
  initialSort,
  initialDir,
}: DeputiesSearchListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const validSort = SORT_COLUMNS.find((c) => c.key === initialSort)?.key ?? "name"
  const [sortCol, setSortCol] = useState<SortColumn>(validSort)
  const [sortDir, setSortDir] = useState<SortDir>(initialDir ?? (validSort === "name" ? "asc" : "desc"))

  /** Toggle sort column or reverse direction if same column. */
  const handleSort = useCallback(
    (col: SortColumn) => {
      let newDir: SortDir = "desc"
      if (col === sortCol) {
        newDir = sortDir === "desc" ? "asc" : "desc"
      }
      setSortCol(col)
      setSortDir(newDir)

      // Update URL without navigation
      const params = new URLSearchParams(searchParams.toString())
      params.set("sort", col)
      params.set("dir", newDir)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [sortCol, sortDir, searchParams, pathname, router],
  )

  /** Sort function passed to SearchableList. */
  const sortFn = useCallback(
    (items: EnrichedDeputy[]) => {
      const sorted = [...items]
      const mul = sortDir === "asc" ? 1 : -1

      sorted.sort((a, b) => {
        switch (sortCol) {
          case "name":
            return mul * a.name.localeCompare(b.name, "pt-BR")
          case "party":
            return mul * a.party.localeCompare(b.party, "pt-BR")
          case "uf":
            return mul * a.uf.localeCompare(b.uf, "pt-BR")
          case "ceap":
            return mul * ((a.ceapTotal ?? 0) - (b.ceapTotal ?? 0))
          case "attendance":
            return mul * ((a.attendanceRate ?? 0) - (b.attendanceRate ?? 0))
          default:
            return 0
        }
      })

      return sorted
    },
    [sortCol, sortDir],
  )

  const formatBrl = useMemo(
    () => (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    [],
  )

  /** Clickable column header with optional native tooltip. */
  const SortableHeader = ({ col, children, title }: { col: SortColumn; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={() => handleSort(col)}
      title={title}
      className="inline-flex items-center gap-0.5 text-left font-medium hover:text-gray-900 transition-colors"
    >
      {children}
      <SortArrow active={sortCol === col} dir={sortDir} />
    </button>
  )

  const columns = [
    {
      header: <SortableHeader col="name">Deputado(a)</SortableHeader>,
      cell: (r: EnrichedDeputy) => (
        <Link href={`/camara/${r.id}`} prefetch={false} className="flex items-center gap-3 hover:opacity-80">
          {r.photoUrl ? (
            <Image
              src={r.photoUrl}
              alt={r.name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover"
              unoptimized
            />
          ) : (
            <AvatarInitials
              initials={r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            />
          )}
          <span className="font-medium text-gray-900">{r.name}</span>
        </Link>
      ),
    },
    {
      header: <SortableHeader col="party">Partido</SortableHeader>,
      cell: (r: EnrichedDeputy) => <span className="text-gray-600">{r.party}</span>,
    },
    {
      header: <SortableHeader col="uf" title="Unidade Federativa (Estado)">UF</SortableHeader>,
      cell: (r: EnrichedDeputy) => <span className="text-gray-600">{r.uf}</span>,
    },
    {
      header: <SortableHeader col="ceap" title="Cota para Exercício da Atividade Parlamentar">CEAP</SortableHeader>,
      cell: (r: EnrichedDeputy) => (
        <span className="text-gray-600 text-sm tabular-nums">
          {r.ceapTotal !== undefined ? formatBrl(r.ceapTotal) : "—"}
        </span>
      ),
    },
    {
      header: <SortableHeader col="attendance" title="Presença em sessões plenárias">Presença</SortableHeader>,
      cell: (r: EnrichedDeputy) => (
        <span className="text-gray-600 text-sm tabular-nums">
          {r.attendanceRate !== undefined ? `${r.attendanceRate}%` : "—"}
        </span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: EnrichedDeputy) => (
        <Link
          href={`/camara/${r.id}`}
          prefetch={false}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Ver mais →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList
      items={deputies}
      searchAccessor={(d) => d.name}
      filters={[
        { label: "Partido", accessor: (d) => d.party },
        { label: "UF", accessor: (d) => d.uf },
      ]}
      pageSize={20}
      placeholder="Buscar por nome..."
      sortFn={sortFn}
    >
      {(paged) => (
        <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />
      )}
    </SearchableList>
  )
}
