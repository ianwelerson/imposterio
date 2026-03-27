/**
 * @file page.tsx
 * @description Full searchable listing of all Camara procurement processes.
 *
 * Uses SearchableList + DataTable with filters for modality and status.
 * Links each row to its detail page at /camara/licitacoes/[id].
 *
 * Data source: bulk procurement files via getProcurementBulk().
 */

import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { getProcurementBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { LicitacoesSearchList } from "./LicitacoesSearchList"

/** Procurement bulk files are available from 2014 onward. */
const FIRST_YEAR = 2014

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function CamaraLicitacoesListaPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_YEAR + 1 },
    (_, i) => now - i,
  )

  const errors: PageError[] = []
  const failed = new Set<string>()

  const summary = await collectErrors(
    () => getProcurementBulk(selectedYear),
    emptySourced({
      totalProcurements: 0,
      totalEstimatedValue: 0,
      totalContractedValue: 0,
      totalPaidValue: 0,
      totalContracts: 0,
      byModality: [],
      byStatus: [],
      topSuppliers: [],
      procurements: [],
      contracts: [],
      lastUpdated: "",
    }),
    errors,
    "Licitações",
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
                href={`/camara/licitacoes?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar às Licitações
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Listagem de Licitações</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                {summary.totalProcurements} processos licitatórios em {selectedYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={summary._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Licitações") ? (
        <DataFetchError label="as licitações" />
      ) : (
        <LicitacoesSearchList
          procurements={summary.procurements}
          selectedYear={selectedYear}
          yearSelector={
            <div className="w-full sm:w-auto sm:min-w-[100px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">Ano</label>
              <YearSelector years={availableYears} selected={selectedYear} inline />
            </div>
          }
        />
      )}
    </>
  )
}
