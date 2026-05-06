/**
 * @file page.tsx
 * @description Contract drill-down — Senado institutional contract detail.
 *
 * The list endpoint does not expose contract values inline. Total executed
 * value is computed by summing the contract's payment rows. Amendments
 * (aditivos) are surfaced inline to expose value increases and term
 * extensions, which are common vehicles for cost overruns.
 *
 * Data sources:
 * - getSenadoContractsBulk            → contract metadata (cached aggregate)
 * - getSenadoContractAmendments(id)   → addendums
 * - getSenadoContractPayments("contratos", id) → payment history
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import {
  getSenadoContractsBulk,
  getSenadoContractAmendments,
  getSenadoContractPayments,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type {
  SenadoContractAmendment,
  SenadoContractPayment,
} from "@imposterio/types"
import {
  StatCard,
  SectionHeader,
  Badge,
  DataTable,
  SourcePill,
  ToastTrigger,
} from "@/components/ui"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
}

export default async function SenadoContractDetailPage({ params }: PageProps) {
  const { id } = await params

  const errors: PageError[] = []
  const failed = new Set<string>()

  const summary = await getSenadoContractsBulk()
  const contract = summary.contracts.find((c) => c.id === id)
  if (!contract) notFound()

  const [amendments, payments] = await Promise.all([
    collectErrors(
      () => getSenadoContractAmendments(id),
      emptySourced<SenadoContractAmendment[]>([]),
      errors,
      "Aditivos",
      failed,
    ),
    collectErrors(
      () => getSenadoContractPayments("contratos", id),
      emptySourced<SenadoContractPayment[]>([]),
      errors,
      "Pagamentos",
      failed,
    ),
  ])

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalDeductions = payments.reduce((sum, p) => sum + p.deduction, 0)
  const totalPenalties = payments.reduce((sum, p) => sum + p.penalty, 0)
  const totalValueIncreases = amendments.reduce(
    (sum, a) => sum + (a.valueImpact ?? 0),
    0,
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-10">
        <Link
          href="/senado/contratacoes"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Voltar para contratações
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {contract.formattedNumber || contract.number}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          {contract.object}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="gray">{contract.subSpeciesName || contract.subSpeciesCode}</Badge>
          {contract.modality && <Badge variant="gray">{contract.modality}</Badge>}
          {contract.isLaborIntensive && <Badge variant="amber">Mão-de-obra intensiva</Badge>}
        </div>
      </header>

      <section className="mb-10">
        <SectionHeader title="Resumo financeiro" sourceUrl={payments._source} />
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total pago"
              value={formatBRL(totalPaid)}
              tooltip="Soma dos valores efetivamente pagos via pagamentos registrados."
            />
            <StatCard
              label="Pagamentos"
              value={String(payments.length)}
            />
            <StatCard
              label="Glosas"
              value={formatBRL(totalDeductions)}
              tooltip="Valores deduzidos por descumprimento parcial ou retenções legais."
            />
            <StatCard
              label="Multas"
              value={formatBRL(totalPenalties)}
            />
          </div>
        </div>
      </section>

      <section className="mb-10 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Vigência e fornecedor" sourceUrl={summary._source} />
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Empresa</dt>
              <dd className="text-sm text-gray-900">{contract.supplierName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">CNPJ/CPF</dt>
              <dd className="text-sm tabular-nums text-gray-900">{contract.supplierDocument || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Assinatura</dt>
              <dd className="text-sm tabular-nums text-gray-900">{formatDate(contract.signatureDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Publicação</dt>
              <dd className="text-sm tabular-nums text-gray-900">{formatDate(contract.publicationDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Início da vigência</dt>
              <dd className="text-sm tabular-nums text-gray-900">{formatDate(contract.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Fim da vigência</dt>
              <dd className="text-sm tabular-nums text-gray-900">
                {contract.endDate ? formatDate(contract.endDate) : "Em aberto"}
              </dd>
            </div>
            {contract.bidNumber && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Licitação de origem</dt>
                <dd className="text-sm text-gray-900">{contract.bidNumber}</dd>
              </div>
            )}
            {contract.legalBasis && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Fundamento legal</dt>
                <dd className="text-sm text-gray-900">{contract.legalBasis}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <section className="mb-10 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Aditivos (alterações contratuais)"
          sourceUrl={amendments._source}
        />
        {amendments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum aditivo registrado para este contrato.</p>
        ) : (
          <>
            {totalValueIncreases !== 0 && (
              <p className="mb-3 text-xs text-gray-500">
                Impacto líquido em valor através de aditivos:{" "}
                <strong className="tabular-nums text-gray-700">
                  {formatBRL(totalValueIncreases)}
                </strong>
              </p>
            )}
            <DataTable
              columns={[
                {
                  header: "Nº",
                  className: "whitespace-nowrap",
                  cell: (r: SenadoContractAmendment) => (
                    <span className="font-medium text-gray-900">{r.number}</span>
                  ),
                },
                {
                  header: "Tipo",
                  className: "whitespace-nowrap",
                  cell: (r: SenadoContractAmendment) => (
                    <Badge variant="gray">{r.type}</Badge>
                  ),
                },
                {
                  header: "Assinatura",
                  className: "whitespace-nowrap",
                  cell: (r: SenadoContractAmendment) => (
                    <span className="text-gray-600 text-xs tabular-nums">
                      {formatDate(r.signatureDate)}
                    </span>
                  ),
                },
                {
                  header: "Impacto financeiro",
                  align: "right" as const,
                  className: "whitespace-nowrap",
                  cell: (r: SenadoContractAmendment) =>
                    r.valueImpact != null ? (
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          r.valueImpact > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {r.valueImpact > 0 ? "+" : ""}
                        {formatBRL(r.valueImpact)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    ),
                },
                {
                  header: "Nova vigência",
                  align: "right" as const,
                  className: "whitespace-nowrap",
                  cell: (r: SenadoContractAmendment) => (
                    <span className="text-gray-600 text-xs tabular-nums">
                      {r.newEndDate ? formatDate(r.newEndDate) : "—"}
                    </span>
                  ),
                },
              ]}
              data={amendments}
              rowKey={(r) => r.id}
            />
          </>
        )}
      </section>

      <section className="mb-10 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Pagamentos" sourceUrl={payments._source} />
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pagamento registrado para este contrato.</p>
        ) : (
          <DataTable
            columns={[
              {
                header: "Descrição",
                cell: (r: SenadoContractPayment) => (
                  <span className="text-sm text-gray-700">{r.expenseDescription}</span>
                ),
              },
              {
                header: "Valor",
                align: "right" as const,
                className: "whitespace-nowrap",
                cell: (r: SenadoContractPayment) => (
                  <span className="text-sm font-medium tabular-nums text-gray-900">
                    {formatBRL(r.amount)}
                  </span>
                ),
              },
              {
                header: "Glosa",
                align: "right" as const,
                className: "whitespace-nowrap",
                cell: (r: SenadoContractPayment) => (
                  <span className="text-xs tabular-nums text-gray-500">
                    {r.deduction > 0 ? formatBRL(r.deduction) : "—"}
                  </span>
                ),
              },
              {
                header: "Multa",
                align: "right" as const,
                className: "whitespace-nowrap",
                cell: (r: SenadoContractPayment) => (
                  <span className="text-xs tabular-nums text-gray-500">
                    {r.penalty > 0 ? formatBRL(r.penalty) : "—"}
                  </span>
                ),
              },
            ]}
            data={payments}
            rowKey={(r) => r.id}
          />
        )}
        {payments._source && (
          <div className="mt-4">
            <SourcePill url={payments._source} />
          </div>
        )}
      </section>
    </>
  )
}
