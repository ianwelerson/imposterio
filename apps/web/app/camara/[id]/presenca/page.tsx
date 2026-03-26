/**
 * @file page.tsx
 * @description Full attendance listing page for a deputy.
 *
 * Shows a searchable, filterable table of all events the deputy attended.
 * Charts and summary stats are on the deputy detail page; this page
 * focuses on the complete event-by-event listing.
 *
 * Data sources:
 * - Bulk attendance file: eventosPresencaDeputados-{year}.json
 * - Bulk events file: eventos-{year}.json
 */

import Link from "next/link"
import {
  getDeputyDetail,
  getDeputyAttendanceDetail,
} from "@imposterio/fetchers"
import { SourcePill, ToastTrigger } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "../YearSelector"
import { AttendanceList } from "./AttendanceList"

/** Bulk attendance files are available from 2019 onward (57th legislature). */
const FIRST_YEAR = 2019

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function DeputyAttendancePage({ params, searchParams }: PageProps) {
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

  // Deputy detail is critical — let it throw (caught by error boundary)
  const deputy = await getDeputyDetail(id)

  // Attendance calls degrade gracefully
  const errors: PageError[] = []

  const attendanceEvents = await collectErrors(
    () => getDeputyAttendanceDetail(id, selectedYear),
    emptySourced([]),
    errors,
    "Presença detalhada",
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/${id}?ano=${selectedYear}`}
                className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                ← Voltar para {deputy.name}
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Presença</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Registro de presença em eventos da Câmara — {selectedYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={attendanceEvents._source} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Full listing ───────────────────────────────────────────────── */}
      <section className="mb-12">
        <AttendanceList
          events={attendanceEvents}
          sourceUrl={attendanceEvents._source}
          yearSelector={
            <div className="w-full sm:w-auto sm:min-w-[100px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Ano</label>
              <YearSelector years={availableYears} selected={selectedYear} inline />
            </div>
          }
        />
      </section>
    </>
  )
}
