/**
 * @file page.tsx
 * @description Full committees listing for a senator — all memberships
 * (active and historical) plus chair positions.
 *
 * Data sources:
 * - GET /senador/{id}/comissoes.json — committee memberships
 * - GET /senador/{id}/cargos.json — leadership positions in committees
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import {
  getSenatorDetail,
  getSenatorCommittees,
  getSenatorPositions,
  ApiError,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { CommitteesList } from "./CommitteesList"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SenatorCommitteesPage({ params }: PageProps) {
  const { id } = await params

  let senator
  try {
    senator = await getSenatorDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [committees, positions] = await Promise.all([
    collectErrors(
      () => getSenatorCommittees(id),
      emptySourced([]),
      errors,
      "Comissões",
      failed,
    ),
    collectErrors(
      () => getSenatorPositions(id),
      emptySourced([]),
      errors,
      "Cargos",
      failed,
    ),
  ])

  const activeCount = committees.filter((c) => !c.endDate).length

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/senado/${id}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {senator.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Comissões</h1>
              {!failed.has("Comissões") && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  {activeCount} {activeCount === 1 ? "comissão ativa" : "comissões ativas"} — {committees.length} no histórico
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={committees._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Comissões") ? (
        <DataFetchError label="as comissões" />
      ) : (
        <CommitteesList committees={committees} positions={positions} />
      )}
    </>
  )
}
