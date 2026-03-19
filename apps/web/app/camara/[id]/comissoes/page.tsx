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
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Comissões — {deputy.name}
          </h1>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {committees.length} comissões no total — {active} ativas
        </p>
      </header>

      <CommitteesList
        committees={committees}
        sourceUrl={committees._source}
      />
    </>
  )
}
