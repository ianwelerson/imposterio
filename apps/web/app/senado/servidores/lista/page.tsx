/**
 * @file page.tsx
 * @description Full searchable listing of all Senado civil servants.
 */

import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { getSenadoServantsBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { SenadoServantsSummary } from "@imposterio/types"
import { ServantsSearchList } from "./ServantsSearchList"

const EMPTY_SUMMARY: SenadoServantsSummary = {
  totalActive: 0,
  totalInactive: 0,
  totalVacancies: 0,
  byBond: [],
  byStatus: [],
  byCategory: [],
  headcount: [],
  members: [],
  lastUpdated: "",
}

export default async function SenadoServidoresListaPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const summary = await collectErrors(
    () => getSenadoServantsBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Servidores",
    failed,
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/senado/servidores"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar aos Servidores
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Listagem de Servidores</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                {summary.members.length.toLocaleString("pt-BR")} pessoas no quadro funcional do Senado, incluindo ativos, aposentados e desligados.
              </p>
            </div>
            {summary._source && (
              <div className="shrink-0">
                <SourcePill url={summary._source} />
              </div>
            )}
          </div>
        </div>
      </header>

      {failed.has("Servidores") ? (
        <DataFetchError label="os servidores" />
      ) : (
        <ServantsSearchList servants={summary.members} />
      )}
    </>
  )
}
