/**
 * @file page.tsx
 * @description Presidential vetoes page for the Senado Federal.
 *
 * Vetoes are a distinct constitutional workflow: the President partially or
 * fully vetoes a bill, and Congress (joint session) deliberates whether to
 * overturn each veto. This page surfaces the vetoes registered for a year
 * along with their type, originating matter, and current status.
 *
 * Data source: GET /materia/vetos/{ano} (Senado dadosabertos).
 */

import Link from "next/link"
import { getSenadoVetos } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { SenadoVeto } from "@imposterio/types"
import {
  StatCard,
  SectionHeader,
  Badge,
  DataTable,
  SourcePill,
  ToastTrigger,
  DataFetchError,
} from "@/components/ui"
import { YearSelector } from "@/app/camara/[id]/YearSelector"

const CURRENT_YEAR = new Date().getFullYear()
const FIRST_YEAR = CURRENT_YEAR - 5
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
)

interface PageProps {
  searchParams: Promise<{ ano?: string }>
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export default async function SenadoVetosPage({ searchParams }: PageProps) {
  const query = await searchParams
  const requested = Number(query.ano) || CURRENT_YEAR
  const selectedYear = Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, requested))

  const errors: PageError[] = []
  const failed = new Set<string>()

  const vetos = await collectErrors(
    () => getSenadoVetos(selectedYear),
    emptySourced<SenadoVeto[]>([]),
    errors,
    "Vetos",
    failed,
  )

  const total = vetos.length
  const totals = vetos.filter((v) => v.type?.toLowerCase().startsWith("total")).length
  const partials = vetos.filter((v) => v.type?.toLowerCase().startsWith("parcial")).length
  const inDeliberation = vetos.filter((v) => (v.status ?? "").toLowerCase().includes("delib")).length

  const columns = [
    {
      header: "Veto",
      className: "whitespace-nowrap",
      cell: (row: SenadoVeto) => (
        <span className="font-semibold text-gray-900">{row.identifier}</span>
      ),
    },
    {
      header: "Matéria de origem",
      className: "whitespace-nowrap",
      cell: (row: SenadoVeto) => (
        <span className="text-gray-700 text-sm">{row.originMatter ?? "—"}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (row: SenadoVeto) => (
        <Badge variant={row.type?.toLowerCase().startsWith("total") ? "red" : "amber"}>
          {row.type ?? "—"}
        </Badge>
      ),
    },
    {
      header: "Ementa",
      className: "max-w-md",
      cell: (row: SenadoVeto) => (
        <span className="line-clamp-2 text-gray-700 text-xs">{row.summary ?? "—"}</span>
      ),
    },
    {
      header: "Publicado",
      className: "whitespace-nowrap",
      cell: (row: SenadoVeto) => (
        <span className="text-gray-600 text-xs tabular-nums">{formatDate(row.publicationDate)}</span>
      ),
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (row: SenadoVeto) => (
        <span className="text-gray-600 text-xs">{row.status ?? "—"}</span>
      ),
    },
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/senado"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar ao Senado
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vetos presidenciais</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Vetos publicados pela Presidência da República e enviados ao Congresso para deliberação em sessão conjunta.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">Ver vetos de</span>
              <YearSelector years={AVAILABLE_YEARS} selected={selectedYear} />
            </div>
          </div>
        </div>
      </header>

      {failed.has("Vetos") ? (
        <DataFetchError label="os vetos" />
      ) : (
        <>
          <section className="mb-12">
            <SectionHeader title="Resumo" sourceUrl={vetos._source} />
            <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total no ano" value={String(total)} />
                <StatCard label="Vetos totais" value={String(totals)} />
                <StatCard label="Vetos parciais" value={String(partials)} />
                <StatCard label="Em deliberação" value={String(inDeliberation)} />
              </div>
              {vetos._source && (
                <div className="mt-4">
                  <SourcePill url={vetos._source} />
                </div>
              )}
            </div>
          </section>

          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Lista completa" sourceUrl={vetos._source} />
            {total === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum veto presidencial registrado para {selectedYear} na API do Senado.
              </p>
            ) : (
              <DataTable columns={columns} data={vetos} rowKey={(r) => r.id} />
            )}
          </section>
        </>
      )}
    </>
  )
}
