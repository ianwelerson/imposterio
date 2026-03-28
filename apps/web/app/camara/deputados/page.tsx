/**
 * @file page.tsx
 * @description Full listing of all federal deputies (Câmara dos Deputados).
 *
 * Displays a searchable, sortable, paginated table of all 513 deputies with:
 * - Photo, name, party, state
 * - CEAP spending total (from bulk expenses file)
 * - Attendance rate (from bulk attendance file)
 * - Sortable columns with URL-persisted sort state
 * - Search by name, party abbreviation, or state (UF)
 * - Pagination (20 per page)
 *
 * Data sources:
 * - Deputies list: GET /deputados
 * - CEAP bulk: Ano-{year}.json
 * - Attendance bulk: eventosPresencaDeputados-{year}.json
 */

import { getDeputiesList, getCeapBulkSummary, getDeputyAttendanceBulk } from "@imposterio/fetchers"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { DeputiesSearchList, type EnrichedDeputy } from "./DeputiesSearchList"

interface DeputadosPageProps {
  searchParams: Promise<{ sort?: string; dir?: string }>
}

export default async function DeputadosPage({ searchParams }: DeputadosPageProps) {
  const query = await searchParams
  const currentYear = new Date().getFullYear()

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [deputies, ceapBulk, attendanceBulk] = await Promise.all([
    collectErrors(() => getDeputiesList(), emptySourced([]), errors, "Deputados", failed),
    collectErrors(
      () => getCeapBulkSummary(currentYear),
      emptySourced({ deputies: [] }),
      errors, "CEAP Bulk", failed,
    ),
    collectErrors(
      () => getDeputyAttendanceBulk(currentYear),
      emptySourced({ totalEvents: 0, totalPlenarySessions: 0, deputies: [] }),
      errors, "Presença Bulk", failed,
    ),
  ])

  // Build lookup maps for enrichment
  const ceapMap = new Map(ceapBulk.deputies.map((d) => [d.name, d.total]))
  const plenaryMap = new Map(attendanceBulk.deputies.map((d) => [d.deputyId, d.plenaryEventsAttended]))
  const totalPlenarySessions = attendanceBulk.totalPlenarySessions

  // Enrich deputies with CEAP and plenary attendance data
  // Attendance % uses plenary sessions only — these are the events where
  // presence is civically expected. Other events (committees, hearings) run
  // in parallel, making total-event attendance misleading.
  const enriched: EnrichedDeputy[] = deputies.map((d) => ({
    ...d,
    ceapTotal: ceapMap.get(d.name.toUpperCase().trim()) ?? undefined,
    attendanceRate: totalPlenarySessions > 0 && plenaryMap.has(d.id)
      ? Math.round(((plenaryMap.get(d.id) ?? 0) / totalPlenarySessions) * 100)
      : undefined,
  }))

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <a
            href="/camara"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            ← Voltar à Câmara
          </a>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Deputados Federais</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Dados da legislatura atual — busque por nome, partido ou estado.
          </p>
        </div>
      </header>

      {failed.has("Deputados") ? (
        <DataFetchError label="a lista de deputados" />
      ) : (
        <DeputiesSearchList
          deputies={enriched}
          initialSort={query.sort}
          initialDir={query.dir as "asc" | "desc" | undefined}
        />
      )}
    </>
  )
}
