/**
 * @file page.tsx
 * @description Full voting history listing for a deputy, with search and filters.
 *
 * Shows all voting sessions where the deputy participated in the selected year,
 * with their individual vote, the session result, and affected propositions.
 *
 * Data source: Composite — GET /votacoes + GET /votacoes/{id}/votos filtered by deputy
 */

import Link from "next/link"
import { getDeputyDetail, getDeputyVotingHistory } from "@imposterio/fetchers"
import { SourcePill } from "@/components/ui"
import { YearSelector } from "../YearSelector"
import { VotingHistoryList } from "./VotingHistoryList"

/** Voting data is available from 2019 onward (57th legislature). */
const FIRST_YEAR = 2019

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function DeputyVotingPage({ params, searchParams }: PageProps) {
  const { id } = await params
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

  const [deputy, votingHistory] = await Promise.all([
    getDeputyDetail(id),
    getDeputyVotingHistory(id, yearStart, yearEnd),
  ])

  return (
    <>
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              Votações — {deputy.name}
            </h1>
            <SourcePill url={votingHistory._source} />
          </div>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Votações nominais em plenário — {selectedYear}
        </p>
      </header>

      <VotingHistoryList
        votes={votingHistory}
        sourceUrl={votingHistory._source}
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
