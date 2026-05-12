/**
 * @file page.tsx
 * @description Empresas overview page — wired to the local company graph and
 * incremental aggregation index, scoped by an URL-driven year filter.
 *
 * Sections (per EMPRESAS-PLAN.md §7.1):
 *
 * 1. Top-line StatCards — companies indexed (lifetime), total observed value
 *    and transaction count for the selected year; CEIS / CNEP slots are
 *    reserved as labeled placeholders pending the Phase 3D Portal da
 *    Transparência fetcher.
 * 2. Search-by-CNPJ form — primary entry point when the visitor already has
 *    a CNPJ in hand. Routes to `/empresas/{cnpj}`.
 * 3. Maiores fornecedores observados — top CNPJs by `SUM(value)` across all
 *    observed transaction types, scoped to the selected year, each linking
 *    to its detail page. The "Ver lista completa" action drops to the full
 *    listing at `/empresas/fornecedores`.
 * 4. Empty state — when the platform has not yet indexed any CNPJ, show an
 *    explainer about incremental indexing instead of an empty table.
 *
 * Year selection follows the camara reference pattern: URL param `?ano=YYYY`
 * with a {@link YearSelector} client component using `useTransition` for
 * loading state. The previous 7d/30d rolling-window pill (`<TopBar>`) was
 * removed because the empresas data is yearly by nature (CEAP, contracts,
 * donations are all reported per calendar year).
 */

import Link from "next/link"

import {
  DataTable,
  EmptyState,
  ParcialNote,
  SectionHeader,
  StatCard,
} from "@/components/ui"
import {
  getCompanyOverviewStats,
  getCompanyTransactionYears,
  getTopCompaniesByObservedValue,
  type TopCompanyRow,
} from "@imposterio/db/queries/companies"
import { formatBRLCompact } from "@/lib/calc/currency"

import { CompanySearchForm } from "./CompanySearchForm"
import { EmpresasGameCard } from "./EmpresasGameCard"
import { YearSelector } from "./YearSelector"

interface EmpresasPageProps {
  searchParams: Promise<{ ano?: string }>
}

const FIRST_YEAR = 2010

export default async function EmpresasPage({ searchParams }: EmpresasPageProps) {
  const params = await searchParams

  // Resolve the available years up front so we can clamp the selection
  // against real data — never offer a year for which we have nothing.
  const years = await getCompanyTransactionYears().catch(() => [
    new Date().getFullYear(),
  ])
  const currentYear = new Date().getFullYear()
  const requested = params.ano ? Number(params.ano) : currentYear
  const selectedYear =
    Number.isFinite(requested) && requested >= FIRST_YEAR
      ? Math.max(FIRST_YEAR, Math.min(currentYear, requested))
      : currentYear

  // Both calls hit independent tables — fetch in parallel. DB hiccups must
  // not white-screen the page (this is a public landing surface), so the
  // catch fallbacks degrade to empty defaults.
  const [stats, topCompanies] = await Promise.all([
    getCompanyOverviewStats(selectedYear).catch(() => ({
      companiesIndexed: 0,
      totalObservedValue: 0,
      transactionsObserved: 0,
    })),
    getTopCompaniesByObservedValue(10, undefined, selectedYear).catch(
      () => [] as TopCompanyRow[],
    ),
  ])

  // Most recent observation across the top-companies set. Drives the
  // ParcialNote next to the "Total observado" StatCard so the timestamp
  // reflects real activity rather than the page-render moment.
  const lastObservedAt = topCompanies.reduce<Date | null>((latest, row) => {
    if (!latest) return row.lastObservedAt
    return row.lastObservedAt > latest ? row.lastObservedAt : latest
  }, null)

  return (
    <>
      {/* ── Page header with year selector ─────────────────────────── */}
      <header className="mb-10 flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Totais e fornecedores observados pela plataforma para o ano selecionado.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Ver dados de
          </span>
          <YearSelector years={years} selected={selectedYear} />
        </div>
      </header>

      {/* ── 1. Top-line counters ───────────────────────────────────── */}
      <section className="mb-12">
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Indicadores de empresas"
          >
            <StatCard
              label="CNPJs indexados"
              value={stats.companiesIndexed.toLocaleString("pt-BR")}
              tooltip="Empresas que a plataforma já observou ao menos uma vez via OpenCNPJ ou em uma transação federal (CEAP, contrato, doação). Total acumulado — não filtra por ano."
            />
            <StatCard
              label={`Total observado em ${selectedYear}`}
              value={formatBRLCompact(stats.totalObservedValue)}
              tooltip="Soma dos valores observados em despesas CEAP, contratos e doações eleitorais para CNPJs já indexados, no ano selecionado. Cresce conforme novas páginas são consultadas."
              note={<ParcialNote lastObservedAt={lastObservedAt} />}
            />
            <StatCard
              label="Empresas inidôneas (CEIS)"
              value="—"
              tooltip="Será habilitado na fase 3D, com a integração ao Portal da Transparência (CEIS)."
            />
            <StatCard
              label="Empresas punidas (CNEP)"
              value="—"
              tooltip="Será habilitado na fase 3D, com a integração ao Portal da Transparência (CNEP)."
            />
          </div>
        </div>
      </section>

      {/* ── 2. Search-by-CNPJ ─────────────────────────────────────── */}
      <section id="consulta" className="mb-12 border-t border-gray-200/60 pt-10 scroll-mt-20">
        <SectionHeader
          title="Consultar uma empresa"
          description="Cole um CNPJ (com ou sem pontuação) para abrir a ficha completa: dados cadastrais via OpenCNPJ, quadro societário com vínculos prováveis e totais observados."
        />
        <CompanySearchForm />
      </section>

      {/* ── 3. Top spenders ───────────────────────────────────────── */}
      <section id="fornecedores" className="mb-12 border-t border-gray-200/60 pt-10 scroll-mt-20">
        <SectionHeader
          title={`Maiores fornecedores observados em ${selectedYear}`}
          description="CNPJs com maiores totais agregados (CEAP + contratos + doações observadas até agora) no ano selecionado. Os valores crescem conforme a plataforma consulta mais páginas — não são totais definitivos."
          action={{ label: "Ver lista completa", href: `/empresas/fornecedores?ano=${selectedYear}` }}
        />
        {topCompanies.length === 0 ? (
          <EmptyState
            message={`Nenhum fornecedor observado em ${selectedYear}`}
            description="A plataforma indexa empresas de forma incremental. Visitar uma página de despesas CEAP, contrato federal ou doação eleitoral popula este painel automaticamente."
          />
        ) : (
          <DataTable
            columns={topCompanyColumns}
            data={topCompanies}
            rowKey={(r) => r.cnpj}
          />
        )}
      </section>

      {/* ── 4. Sanctions placeholder ─────────────────────────────── */}
      <section id="sancoes" className="mb-12 border-t border-gray-200/60 pt-10 scroll-mt-20">
        <SectionHeader
          title="Empresas sancionadas (CEIS / CNEP)"
          description="Cadastro Nacional de Empresas Inidôneas e Suspensas (CEIS) e Cadastro Nacional de Empresas Punidas (CNEP) — Portal da Transparência."
        />
        <EmptyState
          message="Integração com CEIS / CNEP pendente"
          description="A consulta às listas oficiais de sanções será habilitada na fase 3D (Portal da Transparência). Enquanto isso, consulte diretamente em portaldatransparencia.gov.br."
        />
      </section>

      {/* ── 5. Game card ──────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Acha Justo?"
          action={{ label: "Jogar mais", href: "/acha-justo" }}
        />
        <EmpresasGameCard />
      </section>

      {/* ── Methodology footer ───────────────────────────────────── */}
      <footer className="mb-6 mt-2 rounded-lg border border-gray-200/80 bg-gray-50/80 px-4 py-3">
        <p className="text-xs leading-relaxed text-gray-600">
          Os totais desta página são <strong>incrementais</strong> — crescem
          conforme novos dados são consultados. Detalhes em{" "}
          <a
            href="/sobre/metodologia#empresas"
            className="font-medium text-accent hover:text-accent-hover transition-colors"
          >
            metodologia → empresas
          </a>
          .
        </p>
      </footer>
    </>
  )
}

// ── Top-companies table column definitions ──────────────────────────

const topCompanyColumns = [
  {
    header: "Empresa",
    cell: (r: TopCompanyRow) => {
      const display = r.tradeName || r.legalName || formatCnpj(r.cnpj)
      const subtitle =
        r.tradeName && r.legalName && r.tradeName !== r.legalName
          ? r.legalName
          : null
      return (
        <div className="flex flex-col">
          <Link
            href={`/empresas/${r.cnpj}`}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {display}
          </Link>
          {subtitle && (
            <span className="text-[11px] text-gray-400">{subtitle}</span>
          )}
        </div>
      )
    },
  },
  {
    header: "CNPJ",
    cell: (r: TopCompanyRow) => (
      <span className="font-mono text-sm text-gray-500">
        {formatCnpj(r.cnpj)}
      </span>
    ),
  },
  {
    header: "UF",
    align: "center" as const,
    cell: (r: TopCompanyRow) => (
      <span className="text-gray-600">{r.uf || "—"}</span>
    ),
  },
  {
    header: "Total observado",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="font-semibold text-gray-900">
        {formatBRLCompact(r.total)}
      </span>
    ),
  },
  {
    header: "Registros",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="font-mono tabular-nums text-gray-600">{r.count}</span>
    ),
  },
  {
    header: "Atualizado em",
    align: "right" as const,
    cell: (r: TopCompanyRow) => (
      <span className="text-xs text-gray-500">
        {r.lastObservedAt.toLocaleDateString("pt-BR")}
      </span>
    ),
  },
]

// ── Helpers ──────────────────────────────────────────────────────────

/** Formats a 14-digit CNPJ as `XX.XXX.XXX/XXXX-XX`. */
function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}
