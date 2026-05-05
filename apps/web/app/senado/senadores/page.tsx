/**
 * @file page.tsx
 * @description Full listing of all federal senators (Senado Federal).
 *
 * Displays a searchable, sortable, paginated table of every senator currently
 * in exercise (typically 81). Built on real data from
 * `https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json`.
 *
 * Each row is enriched with CEAPS spending (from the admin bulk file) and
 * plenary attendance percentage (composed from twelve `/plenario/resultado/mes`
 * calls and cached under `sen:attendance:bulk:{year}`).
 */

import {
  getSenatorsList,
  getCeapsBulkSummary,
  getSenatorAttendanceBulk,
} from "@imposterio/fetchers"
import type {
  SenatorCeapsBulkSummary,
  SenatorAttendanceBulkSummary,
} from "@imposterio/types"
import { ToastTrigger, DataFetchError } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { SenatorsSearchList, type EnrichedSenator } from "./SenatorsSearchList"

interface SenadoresPageProps {
  searchParams: Promise<{ sort?: string; dir?: string }>
}

export default async function SenadoresPage({ searchParams }: SenadoresPageProps) {
  const query = await searchParams
  const currentYear = new Date().getFullYear()

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [senators, ceapsBulk, attendanceBulk] = await Promise.all([
    collectErrors(
      () => getSenatorsList(),
      emptySourced([]),
      errors,
      "Senadores",
      failed,
    ),
    collectErrors(
      () => getCeapsBulkSummary(currentYear),
      emptySourced<SenatorCeapsBulkSummary>({
        year: currentYear,
        totalSpending: 0,
        expenseCount: 0,
        senators: [],
      }),
      errors,
      "Gastos CEAPS",
      failed,
    ),
    collectErrors(
      () => getSenatorAttendanceBulk(currentYear),
      emptySourced<SenatorAttendanceBulkSummary>({
        year: currentYear,
        totalSessions: 0,
        totalDeliberative: 0,
        senators: [],
      }),
      errors,
      "Presença",
      failed,
    ),
  ])

  const ceapsBySenator = new Map(
    ceapsBulk.senators.map((s) => [s.senatorId, s.total]),
  )
  const attendanceBySenator = new Map(
    attendanceBulk.senators.map((s) => [s.senatorId, s.percentage]),
  )

  const enriched: EnrichedSenator[] = senators.map((s) => ({
    ...s,
    ceapsTotal: ceapsBySenator.get(s.id),
    attendancePct: attendanceBySenator.get(s.id),
  }))

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <a
            href="/senado"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            ← Voltar ao Senado
          </a>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Senadores Federais
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Senadores em exercício na legislatura atual — busque por nome, partido ou estado.
          </p>
        </div>
      </header>

      {failed.has("Senadores") ? (
        <DataFetchError label="a lista de senadores" />
      ) : (
        <SenatorsSearchList
          senators={enriched}
          initialSort={query.sort}
          initialDir={query.dir as "asc" | "desc" | undefined}
        />
      )}
    </>
  )
}
