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
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <a
            href="/camara"
            className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            ← Voltar à Câmara
          </a>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Deputados Federais</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Dados da legislatura atual — busque por nome, partido ou estado.
          </p>
        </div>
      </header>

      <DeputiesSearchList deputies={deputies} />
    </>
  )
}
