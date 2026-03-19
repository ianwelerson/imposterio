/**
 * @file page.tsx
 * @description Full searchable listing of all Senado legislative propositions.
 *
 * Uses SearchableList + DataTable with expandable rows for vote breakdowns.
 * Links each row to its detail page at /senado/pautas/[id].
 */

import { MOCK_PROPOSITIONS } from "../mock-data"
import { SenadoPautasList } from "./SenadoPautasList"

export default function SenadoPautasListaPage() {
  return (
    <>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proposições — Senado</h1>
          <p className="mt-1 text-sm text-gray-500">Todas as proposições registradas</p>
        </div>
        <a
          href="/senado/pautas"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          ← Voltar à Pauta
        </a>
      </header>

      <SenadoPautasList propositions={MOCK_PROPOSITIONS} />
    </>
  )
}
