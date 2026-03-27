/**
 * @file page.tsx
 * @description Full listing of all federal deputies (Câmara dos Deputados).
 *
 * Displays a searchable, paginated table of all 513 deputies with:
 * - Photo, name, party, state
 * - Search by name, party abbreviation, or state (UF)
 * - Pagination (20 per page)
 *
 * Data source: https://dadosabertos.camara.leg.br/api/v2/deputados
 *
 * Columns pending integration (see TODO.md):
 * - CEAP spending: requires per-deputy expense aggregation
 * - Attendance: requires bulk attendance file parser (Phase 4)
 * - Staff count: requires bulk staff file parser (Phase 4)
 */

import { getDeputiesList } from "@imposterio/fetchers"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { DeputiesSearchList } from "./DeputiesSearchList"

export default async function DeputadosPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()
  const deputies = await collectErrors(() => getDeputiesList(), emptySourced([]), errors, "Deputados", failed)

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
        <DeputiesSearchList deputies={deputies} />
      )}
    </>
  )
}
