/**
 * @file page.tsx
 * @description Full events listing for a deputy, with search and pagination.
 *
 * Displays all events (sessions, hearings, committee meetings) a deputy
 * participated in during the selected year. Each event links to its
 * individual detail page.
 *
 * Data source: GET /deputados/{id}/eventos
 */

import Link from "next/link"
import { getDeputyDetail, getDeputyEvents } from "@imposterio/fetchers"
import { SourcePill } from "@/components/ui"
import { YearSelector } from "../YearSelector"
import { EventsList } from "./EventsList"

/** Events data is available from 2019 onward (57th legislature). */
const FIRST_EVENT_YEAR = 2019

interface EventsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function EventsPage({ params, searchParams }: EventsPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_EVENT_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_EVENT_YEAR + 1 },
    (_, i) => now - i,
  )

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`

  const [deputy, events] = await Promise.all([
    getDeputyDetail(id),
    getDeputyEvents(id, yearStart, yearEnd),
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
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Eventos</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Sessões plenárias, audiências públicas e reuniões — {selectedYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={events._source} />
            </div>
          </div>
        </div>
      </header>

      <EventsList
        events={events}
        sourceUrl={events._source}
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
