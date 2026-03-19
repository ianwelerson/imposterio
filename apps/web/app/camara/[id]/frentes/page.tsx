/**
 * @file page.tsx
 * @description Full parliamentary caucuses listing for a deputy.
 *
 * Shows all frentes parlamentares (cross-party advocacy groups) a deputy
 * belongs to, with search and pagination.
 *
 * Data source: GET /deputados/{id}/frentes
 */

import Link from "next/link"
import { getDeputyDetail, getDeputyCaucuses } from "@imposterio/fetchers"
import { CaucusesList } from "./CaucusesList"

interface CaucusesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function CaucusesPage({ params, searchParams }: CaucusesPageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  const [deputy, caucuses] = await Promise.all([
    getDeputyDetail(id),
    getDeputyCaucuses(id),
  ])

  return (
    <>
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Frentes parlamentares — {deputy.name}
          </h1>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {caucuses.length} frentes parlamentares
        </p>
      </header>

      <CaucusesList
        caucuses={caucuses}
        sourceUrl={caucuses._source}
      />
    </>
  )
}
