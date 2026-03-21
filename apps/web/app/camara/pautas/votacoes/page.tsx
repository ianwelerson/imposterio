/**
 * @file page.tsx
 * @description Full listing of Câmara voting sessions with search and filters.
 *
 * Shows all recorded votes (votações nominais) for the selected year,
 * with filters by result and search by description.
 *
 * Data source: GET /votacoes?dataInicio={yearStart}&dataFim={yearEnd}
 */

import Link from "next/link"
import { getVotingSessions } from "@imposterio/fetchers"
import { ToastTrigger, SourcePill } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { VotingSessionsList } from "./VotingSessionsList"

/** Voting data available from 2019 onward. */
const FIRST_YEAR = 2019

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function VotingSessionsPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_YEAR + 1 },
    (_, i) => now - i,
  )

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`

  const errors: PageError[] = []
  const sessions = await collectErrors(() => getVotingSessions(yearStart, yearEnd), emptySourced([]), errors, "Votações")

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Votações — Câmara ({selectedYear})
            </h1>
            <SourcePill url={sessions._source} />
          </div>
          <Link
            href={`/camara/pautas?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à Pauta
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Votações nominais em plenário
        </p>
      </header>

      <VotingSessionsList
        sessions={sessions}
        selectedYear={selectedYear}
        yearSelector={
          <div className="w-full sm:w-auto sm:min-w-[100px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Ano</label>
            <YearSelector years={availableYears} selected={selectedYear} inline />
          </div>
        }
      />
    </>
  )
}
