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
import { DeputiesSearchList } from "./DeputiesSearchList"

export default async function DeputadosPage() {
  const deputies = await getDeputiesList()

  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deputados Federais</h1>
          <p className="mt-1 text-sm text-gray-500">Dados da legislatura atual</p>
        </div>
        <a
          href="/camara"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          ← Voltar à Câmara
        </a>
      </header>

      <DeputiesSearchList deputies={deputies} />
    </>
  )
}
