/**
 * @file page.tsx
 * @description Detail page for a single `(cnpj, type, year)` aggregate row.
 *
 * The empresas detail page summarises observed events into one StatCard per
 * (type, year). This page breaks that summary into the individual
 * `CompanyTransaction` rows that compose it — value, month, counterparty,
 * source URL — so the visitor can verify any cent of the total against the
 * upstream API record (`<SourcePill>` per row).
 *
 * URL: `/empresas/{cnpj}/eventos/{type}/{year}`
 *
 * Linked from the "Eventos observados" table on the empresas detail page —
 * the type label cell is now a Link into here.
 */

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  DataTable,
  EmptyState,
  SectionHeader,
  SourcePill,
  StatCard,
} from "@/components/ui"
import {
  getCompanyTransactionsForEvent,
} from "@imposterio/db/queries/companies"
import { getCompanyDetail } from "@imposterio/fetchers"
import type { CompanyTransaction, CompanyTransactionType } from "@imposterio/types"
import { formatBRL, formatBRLCompact } from "@/lib/calc/currency"

const ALLOWED_TYPES: CompanyTransactionType[] = [
  "ceap",
  "contract",
  "donation_in",
  "donation_out",
  "bid_won",
  "bid_lost",
]

const TYPE_LABELS: Record<CompanyTransactionType, string> = {
  ceap: "CEAP recebida (parlamentares)",
  contract: "Contratos com o governo",
  donation_in: "Doações eleitorais recebidas",
  donation_out: "Doações eleitorais feitas",
  bid_won: "Licitações vencidas",
  bid_lost: "Licitações perdidas",
}

const MONTH_LABELS = [
  "—",
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
]

interface EventDetailPageProps {
  params: Promise<{ cnpj: string; type: string; year: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { cnpj: rawCnpj, type: rawType, year: rawYear } = await params
  const cnpj = rawCnpj.replace(/\D/g, "")
  if (cnpj.length !== 14) notFound()
  if (!ALLOWED_TYPES.includes(rawType as CompanyTransactionType)) notFound()
  const type = rawType as CompanyTransactionType
  const year = Number(rawYear)
  if (!Number.isFinite(year) || year < 1990 || year > 2100) notFound()

  // Detail is best-effort — the page can render with just the CNPJ, but the
  // razão social makes the breadcrumb + heading much more useful.
  const [rows, detail] = await Promise.all([
    getCompanyTransactionsForEvent(cnpj, type, year),
    getCompanyDetail(cnpj).catch(() => null),
  ])

  const total = rows.reduce((acc, r) => acc + r.value, 0)
  const companyName =
    detail?.tradeName || detail?.legalName || formatCnpj(cnpj)

  return (
    <>
      <header className="mb-10">
        <nav className="mb-3 text-xs text-gray-500" aria-label="Breadcrumb">
          <Link href="/empresas" className="hover:text-accent">
            Empresas
          </Link>
          <span className="mx-1.5 text-gray-300">/</span>
          <Link href={`/empresas/${cnpj}`} className="hover:text-accent">
            {companyName}
          </Link>
          <span className="mx-1.5 text-gray-300">/</span>
          <span className="text-gray-700">Eventos</span>
        </nav>
        <h1 className="text-xl font-semibold text-gray-900">
          {TYPE_LABELS[type]} — {year}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {rows.length.toLocaleString("pt-BR")} transação(ões) observada(s) para
          este CNPJ no ano selecionado. A fonte aponta para o registro original
          de cada movimentação.
        </p>
      </header>

      <section className="mb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={formatBRLCompact(total)}
            tooltip="Soma dos valores de todas as transações observadas neste tipo e ano."
          />
          <StatCard
            label="Transações"
            value={rows.length.toLocaleString("pt-BR")}
            tooltip="Número de movimentações registradas até agora."
          />
          <StatCard
            label="Maior valor"
            value={
              rows.length > 0
                ? formatBRLCompact(rows[0].value)
                : "—"
            }
            tooltip="Maior valor único registrado nesta listagem."
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Movimentações"
          description="Cada linha é um evento individual capturado pela plataforma. Use a coluna de fonte para abrir o registro oficial."
        />
        {rows.length === 0 ? (
          <EmptyState
            message="Sem movimentações para este recorte"
            description="Nenhuma transação foi observada para este CNPJ neste tipo e ano."
          />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
          />
        )}
      </section>
    </>
  )
}

const columns = [
  {
    header: "Mês",
    align: "center" as const,
    cell: (r: CompanyTransaction) => (
      <span className="text-xs text-gray-500">
        {r.month && r.month >= 1 && r.month <= 12 ? MONTH_LABELS[r.month] : "—"}
      </span>
    ),
  },
  {
    header: "Quem pagou / contraparte",
    cell: (r: CompanyTransaction) => (
      <span className="text-gray-700">
        {formatCounterparty(r.counterparty)}
      </span>
    ),
  },
  {
    header: "Identificador",
    cell: (r: CompanyTransaction) => (
      <span className="font-mono text-[11px] text-gray-400">
        {r.sourceKey}
      </span>
    ),
  },
  {
    header: "Valor",
    align: "right" as const,
    cell: (r: CompanyTransaction) => (
      <span className="font-semibold text-gray-900">{formatBRL(r.value)}</span>
    ),
  },
  {
    header: "Observado em",
    align: "right" as const,
    cell: (r: CompanyTransaction) => (
      <span className="text-xs text-gray-500">
        {r.observedAt.toLocaleDateString("pt-BR")}
      </span>
    ),
  },
  {
    header: "Fonte",
    align: "center" as const,
    cell: (r: CompanyTransaction) =>
      r.sourceUrl ? <SourcePill url={r.sourceUrl} /> : null,
  },
]

/**
 * Renders the free-form `counterparty` column.
 *
 * Counterparties arrive as `kind:id` strings (e.g. `deputy:204554`,
 * `senator:1234`, `candidate:abcd`). We deep-link the known kinds to their
 * profile pages so the user can click through; unknown kinds and bare
 * strings render verbatim.
 */
function formatCounterparty(raw: string | null): React.ReactNode {
  if (!raw) return "—"
  const [kind, id] = raw.split(":", 2)
  if (kind === "deputy" && id) {
    return (
      <Link
        href={`/camara/${id}`}
        className="font-medium text-accent transition-colors hover:text-accent-hover"
      >
        Deputado #{id}
      </Link>
    )
  }
  if (kind === "senator" && id) {
    return (
      <Link
        href={`/senado/${id}`}
        className="font-medium text-accent transition-colors hover:text-accent-hover"
      >
        Senador #{id}
      </Link>
    )
  }
  return raw
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}
