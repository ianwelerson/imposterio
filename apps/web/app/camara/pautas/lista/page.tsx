/**
 * @file page.tsx
 * @description Full searchable listing of all Câmara legislative propositions.
 *
 * Uses SearchableList + DataTable with filters for type, status, and organ.
 * Links each row to its detail page at /camara/pautas/[id].
 *
 * Data source: GET /proposicoes?ano={year}
 */

import Link from "next/link"
import { getPropositions } from "@imposterio/fetchers"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { CamaraPautasList } from "./CamaraPautasList"

/** Proposition data is available from 2019 onward (57th legislature). */
const FIRST_YEAR = 2019

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

export default async function CamaraPautasListaPage({ searchParams }: PageProps) {
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
  const propositions = await collectErrors(() => getPropositions({ year: selectedYear, typeCode: "PL,PEC,PLP,MP,PDL" }), emptySourced([]), errors, "Proposições", failed)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/pautas?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar à Pauta
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proposições</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Projetos de lei e demais proposições legislativas — {selectedYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={propositions._source} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Proposições") ? (
        <DataFetchError label="as proposições" />
      ) : (
        <CamaraPautasList
          propositions={propositions}
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
