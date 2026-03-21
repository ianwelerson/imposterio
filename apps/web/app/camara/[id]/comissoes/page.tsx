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
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Comissões</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            {active} comissões ativas de {committees.length} no total
          </p>
        </div>
      </header>

      <CommitteesList
        committees={committees}
        sourceUrl={committees._source}
      />
    </>
  )
}
