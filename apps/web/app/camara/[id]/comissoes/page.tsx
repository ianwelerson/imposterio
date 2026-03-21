/**
 * @file page.tsx
 * @description Full committee memberships listing for a deputy.
 *
 * Shows all committees (active and historical) a deputy has served in,
 * with search, filters by type and role, and expandable detail rows.
 *
 * Data source: GET /deputados/{id}/orgaos
 */

import Link from "next/link"
import { getDeputyDetail, getDeputyCommittees } from "@imposterio/fetchers"
import { SourcePill } from "@/components/ui"
import { CommitteesList } from "./CommitteesList"

interface CommitteesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function CommitteesPage({ params, searchParams }: CommitteesPageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  const [deputy, committees] = await Promise.all([
    getDeputyDetail(id),
    getDeputyCommittees(id),
  ])

  const active = committees.filter((c) => !c.endDate).length

  return (
    <>
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Comissões — {deputy.name}
            </h1>
            <SourcePill url={committees._source} />
          </div>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {active} comissões ativas de {committees.length} no total
        </p>
      </header>

      <CommitteesList
        committees={committees}
        sourceUrl={committees._source}
      />
    </>
  )
}
