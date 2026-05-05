/**
 * @file SenatorsSearchList.tsx
 * @description Client component for the senators listing with search, filters,
 * sortable columns, and pagination.
 *
 * Mirrors `DeputiesSearchList` so detail-page navigation, sort, and filter
 * behavior are identical across institutions. Sort state is persisted in
 * the URL via query parameters (?sort=party&dir=desc).
 *
 * Columns: name, party, UF, CEAPS spending, plenary attendance percentage.
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { SearchableList, DataTable, AvatarInitials } from "@/components/ui"
import type { Senator } from "@imposterio/types"

/** Senator data enriched with optional CEAPS and attendance metrics. */
export interface EnrichedSenator extends Senator {
  /** Total CEAPS spending for the current year (BRL). Undefined if bulk failed. */
  ceapsTotal?: number
  /** Plenary attendance percentage (0–100). Undefined if bulk failed. */
  attendancePct?: number
}

type SortColumn = "name" | "party" | "uf" | "ceaps" | "attendance"
type SortDir = "asc" | "desc"

interface SenatorsSearchListProps {
  senators: EnrichedSenator[]
  /** Initial sort column from URL. */
  initialSort?: string
  /** Initial sort direction from URL. */
  initialDir?: SortDir
}

const SORT_COLUMNS: ReadonlyArray<{ key: SortColumn; label: string }> = [
  { key: "name", label: "Nome" },
  { key: "party", label: "Partido" },
  { key: "uf", label: "UF" },
  { key: "ceaps", label: "CEAPS" },
  { key: "attendance", label: "Presença" },
]

/** Sort indicator arrow next to a sortable column header. */
function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-indigo-600">{dir === "asc" ? "↑" : "↓"}</span>
}

export function SenatorsSearchList({
  senators,
  initialSort,
  initialDir,
}: SenatorsSearchListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const validSort = SORT_COLUMNS.find((c) => c.key === initialSort)?.key ?? "name"
  const [sortCol, setSortCol] = useState<SortColumn>(validSort)
  const [sortDir, setSortDir] = useState<SortDir>(
    initialDir ?? (validSort === "name" ? "asc" : "desc"),
  )

  /** Toggle sort column, or reverse direction if the same column is clicked. */
  const handleSort = useCallback(
    (col: SortColumn) => {
      let newDir: SortDir = "desc"
      if (col === sortCol) {
        newDir = sortDir === "desc" ? "asc" : "desc"
      }
      setSortCol(col)
      setSortDir(newDir)

      const params = new URLSearchParams(searchParams.toString())
      params.set("sort", col)
      params.set("dir", newDir)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [sortCol, sortDir, searchParams, pathname, router],
  )

  /** Sort function passed to SearchableList. */
  const sortFn = useCallback(
    (items: EnrichedSenator[]) => {
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
          case "ceaps":
            return mul * ((a.ceapsTotal ?? 0) - (b.ceapsTotal ?? 0))
          case "attendance":
            return mul * ((a.attendancePct ?? 0) - (b.attendancePct ?? 0))
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
      v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }),
    [],
  )

  const SortableHeader = ({
    col,
    children,
    title,
  }: {
    col: SortColumn
    children: React.ReactNode
    title?: string
  }) => (
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
      header: <SortableHeader col="name">Senador(a)</SortableHeader>,
      cell: (r: EnrichedSenator) => (
        <Link
          href={`/senado/${r.id}`}
          prefetch={false}
          className="flex items-center gap-3 hover:opacity-80"
        >
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
              initials={r.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            />
          )}
          <span className="font-medium text-gray-900">{r.name}</span>
        </Link>
      ),
    },
    {
      header: <SortableHeader col="party">Partido</SortableHeader>,
      cell: (r: EnrichedSenator) => <span className="text-gray-600">{r.party}</span>,
    },
    {
      header: (
        <SortableHeader col="uf" title="Unidade Federativa (Estado)">
          UF
        </SortableHeader>
      ),
      cell: (r: EnrichedSenator) => <span className="text-gray-600">{r.uf}</span>,
    },
    {
      header: (
        <SortableHeader
          col="ceaps"
          title="Cota para Exercício da Atividade Parlamentar dos Senadores"
        >
          CEAPS
        </SortableHeader>
      ),
      cell: (r: EnrichedSenator) => (
        <span className="text-gray-600 text-sm tabular-nums">
          {r.ceapsTotal !== undefined ? formatBrl(r.ceapsTotal) : "—"}
        </span>
      ),
    },
    {
      header: (
        <SortableHeader
          col="attendance"
          title="Comparecimento em sessões deliberativas do Plenário"
        >
          Presença
        </SortableHeader>
      ),
      cell: (r: EnrichedSenator) => (
        <span className="text-gray-600 text-sm tabular-nums">
          {r.attendancePct !== undefined ? `${r.attendancePct.toFixed(1)}%` : "—"}
        </span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: EnrichedSenator) => (
        <Link
          href={`/senado/${r.id}`}
          prefetch={false}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Ver mais →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList<EnrichedSenator>
      items={senators}
      searchAccessor={(s) => s.name}
      filters={[
        { label: "Partido", accessor: (s) => s.party },
        { label: "UF", accessor: (s) => s.uf },
      ]}
      pageSize={20}
      placeholder="Buscar por nome..."
      sortFn={sortFn}
    >
      {(paged) => <DataTable columns={columns} data={paged} rowKey={(r) => r.id} />}
    </SearchableList>
  )
}
