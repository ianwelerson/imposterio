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
import { ToastTrigger, SourcePill } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { DeputiesSearchList } from "./DeputiesSearchList"

export default async function DeputadosPage() {
  const errors: PageError[] = []
  const deputies = await collectErrors(() => getDeputiesList(), emptySourced([]), errors, "Deputados")

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Deputados Federais</h1>
            <SourcePill url={deputies._source} />
          </div>
          <a
            href="/camara"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à Câmara
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500">Dados da legislatura atual</p>
      </header>

      <DeputiesSearchList deputies={deputies} />
    </>
  )
}
