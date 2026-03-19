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
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Eventos — {deputy.name}
          </h1>
          <Link
            href={`/camara/${id}?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar para {deputy.name}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {events.length} eventos registrados em {selectedYear}
        </p>
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
