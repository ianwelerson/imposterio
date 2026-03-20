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
import { ToastTrigger } from "@/components/ui"
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
  const propositions = await collectErrors(() => getPropositions({ year: selectedYear, typeCode: "PL,PEC,PLP,MP,PDL" }), emptySourced([]), errors, "Proposições")

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}
      <header className="pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Proposições — Câmara ({selectedYear})
          </h1>
          <Link
            href={`/camara/pautas?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à Pauta
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {propositions.length} proposições registradas em {selectedYear}
        </p>
      </header>

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
    </>
  )
}
