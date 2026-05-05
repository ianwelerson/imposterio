/**
 * @file page.tsx
 * @description Listing of every recorded plenary voting session in a year.
 *
 * Server component that calls `getSenadoVotingSessions(YYYY0101, YYYY1231)`,
 * aggregates the per-senator vote rows into per-session entries server-side
 * (inside the fetcher), and hands the result to a client-side
 * `VotingSessionsList` for filtering, search, and pagination.
 */

import { getSenadoVotingSessions } from "@imposterio/fetchers"
import type { SenadoVotingSession } from "@imposterio/types"
import {
  ToastTrigger,
  DataFetchError,
  SourcePill,
  StatCard,
} from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { VotingSessionsList } from "./VotingSessionsList"

const CURRENT_YEAR = new Date().getFullYear()
const FIRST_YEAR = CURRENT_YEAR - 2
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
)

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function VotingSessionsPage({ searchParams }: PageProps) {
  const query = await searchParams
  const requested = Number(query.ano) || CURRENT_YEAR
  const selectedYear = Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, requested))

  const errors: PageError[] = []
  const failed = new Set<string>()

  const sessions = await collectErrors(
    () =>
      getSenadoVotingSessions(`${selectedYear}0101`, `${selectedYear}1231`),
    emptySourced<SenadoVotingSession[]>([]),
    errors,
    "Sessões de votação",
    failed,
  )

  const approved = sessions.filter((s) => s.approved === true).length
  const rejected = sessions.filter((s) => s.approved === false).length
  const noResult = sessions.filter((s) => s.approved === null).length

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Sessões de votação — Senado
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Resultados das votações nominais em {selectedYear}
          </p>
          {sessions._source && (
            <div className="mt-1">
              <SourcePill url={sessions._source} />
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

      {failed.has("Sessões de votação") ? (
        <DataFetchError label="as sessões de votação" />
      ) : (
        <>
          <section
            className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Indicadores das sessões"
          >
            <StatCard label="Total de sessões" value={String(sessions.length)} />
            <StatCard
              label="Aprovadas"
              value={String(approved)}
              badge={approved > 0 ? { text: "Sim", variant: "green" } : undefined}
            />
            <StatCard
              label="Rejeitadas"
              value={String(rejected)}
              badge={rejected > 0 ? { text: "Não", variant: "red" } : undefined}
            />
            <StatCard
              label="Sem resultado"
              value={String(noResult)}
              tooltip="Sessões sem registro formal de aprovação ou rejeição."
            />
          </section>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma sessão de votação registrada em {selectedYear}.
            </p>
          ) : (
            <VotingSessionsList sessions={sessions} />
          )}
        </>
      )}
    </>
  )
}
