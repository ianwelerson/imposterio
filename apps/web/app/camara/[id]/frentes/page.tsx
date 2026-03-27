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
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Frentes Parlamentares</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Grupos suprapartidários da legislatura atual
          </p>
        </div>
      </header>

      <CaucusesList
        caucuses={caucuses}
        sourceUrl={caucuses._source}
      />
    </>
  )
}
