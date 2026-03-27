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
import { SourcePill } from "@/components/ui"
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
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/${id}?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {deputy.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Discursos</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Pronunciamentos em plenário e comissões — {selectedYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={speeches._source} />
            </div>
          </div>
        </div>
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
