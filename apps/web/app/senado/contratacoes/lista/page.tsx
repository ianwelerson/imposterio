/**
 * @file page.tsx
 * @description Full searchable listing of all Senado contracts.
 *
 * Server component fetches the bulk contracts summary and hands the contracts
 * array to a client `SearchableList` + `DataTable` for filtering by modality
 * and sub-species, with a free-text search across number, object, supplier.
 */

import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { getSenadoContractsBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { SenadoContractsSummary } from "@imposterio/types"
import { ContractsSearchList } from "./ContractsSearchList"

const EMPTY_SUMMARY: SenadoContractsSummary = {
  totalContracts: 0,
  activeContracts: 0,
  bySubSpecies: [],
  byYear: [],
  byModality: [],
  topContractors: [],
  contracts: [],
  lastUpdated: "",
}

export default async function SenadoContratacoesListaPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const summary = await collectErrors(
    () => getSenadoContractsBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Contratações",
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
                href="/senado/contratacoes"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar às Contratações
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Listagem de Contratos</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                {summary.totalContracts.toLocaleString("pt-BR")} contratos institucionais na base administrativa do Senado.
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

      {failed.has("Contratações") ? (
        <DataFetchError label="os contratos" />
      ) : (
        <ContractsSearchList contracts={summary.contracts} />
      )}
    </>
  )
}
