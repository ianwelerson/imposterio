/**
 * @file page.tsx
 * @description Full speeches listing for a deputy, with search and pagination.
 *
 * Displays all floor speeches (discursos) for the selected year,
 * searchable by type and keywords. Expandable rows show full summary
 * and links to official text, audio, and video recordings.
 *
 * Data source: GET /deputados/{id}/discursos
 */

import Link from "next/link"
import { getDeputyDetail, getDeputySpeeches } from "@imposterio/fetchers"
import { YearSelector } from "../YearSelector"
import { SpeechesList } from "./SpeechesList"

/** Speeches are available from 2019 onward (57th legislature). */
const FIRST_SPEECH_YEAR = 2019

interface SpeechesPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function SpeechesPage({ params, searchParams }: SpeechesPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_SPEECH_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_SPEECH_YEAR + 1 },
    (_, i) => now - i,
  )

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`

  const [deputy, speeches] = await Promise.all([
    getDeputyDetail(id),
    getDeputySpeeches(id, yearStart, yearEnd),
  ])

  return (
    <>
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Discursos — {deputy.name}
          </h1>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {speeches.length} discursos registrados em {selectedYear}
        </p>
      </header>

      <SpeechesList
        speeches={speeches}
        sourceUrl={speeches._source}
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
