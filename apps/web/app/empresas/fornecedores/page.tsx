/**
 * @file page.tsx
 * @description Full listing of all observed companies ranked by aggregated
 * BRL value. The empresas overview shows only the top 10; this page is the
 * "Ver lista completa" destination, with client-side search and pagination.
 *
 * The page respects the same `?ano=YYYY` filter as the overview so a user
 * who clicked through with 2024 selected stays on 2024.
 */

import {
  EmptyState,
  SectionHeader,
} from "@/components/ui"
import {
  getCompanyTransactionYears,
  getTopCompaniesByObservedValue,
  type TopCompanyRow,
} from "@imposterio/db/queries/companies"

import { YearSelector } from "../YearSelector"
import { SuppliersList } from "./SuppliersList"

interface SuppliersPageProps {
  searchParams: Promise<{ ano?: string; q?: string }>
}

const FIRST_YEAR = 2010
// 5_000 is generous — even after years of crawling we don't expect this
// table to balloon past a few thousand CNPJs. Keeping the bound here so
// a future runaway insert doesn't pull megabytes into the SSR payload.
const MAX_ROWS = 5000

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = await searchParams

  const years = await getCompanyTransactionYears().catch(() => [
    new Date().getFullYear(),
  ])
  const currentYear = new Date().getFullYear()
  const requested = params.ano ? Number(params.ano) : currentYear
  const selectedYear =
    Number.isFinite(requested) && requested >= FIRST_YEAR
      ? Math.max(FIRST_YEAR, Math.min(currentYear, requested))
      : currentYear

  const rows = await getTopCompaniesByObservedValue(
    MAX_ROWS,
    undefined,
    selectedYear,
  ).catch(() => [] as TopCompanyRow[])

  return (
    <>
      <header className="mb-10 flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Maiores fornecedores observados
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Lista completa de CNPJs com valores agregados (CEAP + contratos +
            doações observadas) no ano selecionado.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Ver dados de
          </span>
          <YearSelector years={years} selected={selectedYear} />
        </div>
      </header>

      <SectionHeader
        title={`Fornecedores em ${selectedYear}`}
        description={`${rows.length.toLocaleString("pt-BR")} CNPJ(s) com pelo menos uma transação observada no ano. Use a busca para filtrar por razão social, fantasia ou CNPJ.`}
        action={{ label: "Voltar à visão geral", href: "/empresas" }}
      />

      {rows.length === 0 ? (
        <EmptyState
          message={`Nenhum fornecedor observado em ${selectedYear}`}
          description="A plataforma indexa empresas de forma incremental. Visitar uma página de despesas CEAP, contrato federal ou doação eleitoral popula este painel automaticamente."
        />
      ) : (
        <SuppliersList rows={rows} initialQuery={params.q ?? ""} />
      )}
    </>
  )
}
