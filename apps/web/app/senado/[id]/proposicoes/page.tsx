/**
 * @file page.tsx
 * @description Full propositions listing for a senator — every authored
 * matter in the selected year. Year is URL-driven via `?ano=YYYY`.
 *
 * Data source: GET /processo?codigoParlamentarAutor={id}&ano={year}
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import {
  getSenatorDetail,
  getSenatorPropositions,
  ApiError,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { Proposition } from "@imposterio/types"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { PropositionsList } from "./PropositionsList"

const FIRST_PROPOSITION_YEAR = 2009

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function SenatorPropositionsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_PROPOSITION_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_PROPOSITION_YEAR + 1 },
    (_, i) => now - i,
  )

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

  const authorFallback = { name: senator.name, party: senator.party }

  const propositions = await collectErrors(
    () => getSenatorPropositions(id, authorFallback, selectedYear),
    emptySourced<Proposition[]>([]),
    errors,
    "Proposições",
    failed,
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/senado/${id}?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {senator.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proposições</h1>
              {!failed.has("Proposições") && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  {propositions.length} {propositions.length === 1 ? "matéria" : "matérias"} em {selectedYear}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={propositions._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Proposições") ? (
        <DataFetchError label="as proposições" />
      ) : (
        <PropositionsList
          propositions={propositions}
          yearSelector={
            <div className="w-full sm:w-auto sm:min-w-[100px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Ano</label>
              <YearSelector years={availableYears} selected={selectedYear} inline />
            </div>
          }
        />
      )}
    </>
  )
}
