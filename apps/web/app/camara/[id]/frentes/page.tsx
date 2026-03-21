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
import { SourcePill } from "@/components/ui"
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
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Frentes parlamentares — {deputy.name}
            </h1>
            <SourcePill url={caucuses._source} />
          </div>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Grupos suprapartidários da legislatura atual
        </p>
      </header>

      <CaucusesList
        caucuses={caucuses}
        sourceUrl={caucuses._source}
      />
    </>
  )
}
