/**
 * @file page.tsx
 * @description Full searchable listing of Senado legislative propositions.
 *
 * Server component that fetches every proposition for the selected year via
 * `getSenadoPropositions({ ano })` and hands the result to the client-side
 * `SenadoPautasList` (search + filter + pagination + expandable rows).
 *
 * The year is URL-driven (`?ano=YYYY`) so the listing is shareable and
 * server-rendered for any year.
 */

import { getSenadoPropositions } from "@imposterio/fetchers"
import type { Proposition } from "@imposterio/types"
import {
  ToastTrigger,
  DataFetchError,
  SourcePill,
} from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { SenadoPautasList } from "./SenadoPautasList"

const CURRENT_YEAR = new Date().getFullYear()
const FIRST_YEAR = CURRENT_YEAR - 2
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
)

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function SenadoPautasListaPage({ searchParams }: PageProps) {
  const query = await searchParams
  const requested = Number(query.ano) || CURRENT_YEAR
  const selectedYear = Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, requested))

  const errors: PageError[] = []
  const failed = new Set<string>()

  const propositions = await collectErrors(
    () => getSenadoPropositions({ ano: selectedYear }),
    emptySourced<Proposition[]>([]),
    errors,
    "Proposições",
    failed,
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proposições — Senado</h1>
          <p className="mt-1 text-sm text-gray-500">
            Todas as proposições registradas em {selectedYear}
          </p>
          {propositions._source && (
            <div className="mt-1">
              <SourcePill url={propositions._source} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <YearSelector years={AVAILABLE_YEARS} selected={selectedYear} />
          <a
            href="/senado/pautas"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à Pauta
          </a>
        </div>
      </header>

      {failed.has("Proposições") ? (
        <DataFetchError label="as proposições" />
      ) : (
        <SenadoPautasList propositions={propositions} />
      )}
    </>
  )
}
