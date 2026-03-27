/**
 * @file page.tsx
 * @description Individual CEAP expense detail page for a deputy.
 *
 * Shows all available information about a single expense record:
 * type, supplier, values (gross/net/deducted), receipt document,
 * reference period, and direct links to the API source and the
 * invoice/receipt PDF or image.
 *
 * Since the Câmara API does not have a single-expense endpoint,
 * we fetch the full year's expenses and find the matching record
 * by document code (codDocumento).
 *
 * Data source: GET /deputados/{id}/despesas?ano={year}
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { InfoPanel, SourcePill, StatCard, SectionHeader, Badge } from "@/components/ui"
import { getDeputyDetail, getDeputyExpenses } from "@imposterio/fetchers"

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface PageProps {
  params: Promise<{ id: string; docId: string }>
  searchParams: Promise<{ ano?: string }>
}

/**
 * Converts an expense type string to sentence case.
 * The API returns types in all-caps (e.g. "MANUTENÇÃO DE ESCRITÓRIO").
 */
function toSentenceCase(text: string): string {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export default async function ExpenseDetailPage({ params, searchParams }: PageProps) {
  const { id, docId } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  const [deputy, expenses] = await Promise.all([
    getDeputyDetail(id),
    getDeputyExpenses(id, selectedYear),
  ])

  // Find the expense by document code
  const expense = expenses.find((e) => e.documentCode === docId)
  if (!expense) notFound()

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const formatDocument = (doc: string): string => {
    if (!doc) return "—"
    const digits = doc.replace(/\D/g, "")
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }
    if (digits.length === 14) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    }
    return doc
  }

  const infoFields = [
    { label: "Fornecedor", value: expense.supplierName },
    { label: "CPF/CNPJ do fornecedor", value: formatDocument(expense.supplierDocument) },
    { label: "Tipo de documento", value: expense.documentType || "—" },
    { label: "Número do documento", value: expense.document || "—" },
    { label: "Data do documento", value: new Date(expense.date).toLocaleDateString("pt-BR") },
    { label: "Período de referência", value: `${MONTH_NAMES[expense.month]} de ${expense.year}` },
  ]

  const internalFields = [
    { label: "Código do documento", value: expense.documentCode },
    ...(expense.reimbursementNumber
      ? [{ label: "Número do ressarcimento", value: expense.reimbursementNumber }]
      : []),
    { label: "Lote", value: String(expense.batchNumber) },
    { label: "Parcela", value: String(expense.installment) },
  ]

  return (
    <>
      {/* Header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/${id}/despesas?ano=${selectedYear}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para despesas
              </Link>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {toSentenceCase(expense.type)}
                </h1>
                <Badge variant="gray">CEAP</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <Link
                  href={`/camara/${id}?ano=${selectedYear}`}
                  className="font-medium text-white/90 hover:text-white transition-colors"
                >
                  {deputy.name}
                </Link>
                <span className="text-white/40">—</span>
                <span>{MONTH_NAMES[expense.month]} de {expense.year}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={expenses._source} />
            </div>
          </div>
        </div>
      </header>

      {/* Values */}
      <section className="mb-12">
        <SectionHeader
          title="Valores"
          description="O valor glosado é a parcela rejeitada pela Câmara durante a prestação de contas — não é reembolsada ao deputado."
        />
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Valor bruto" value={formatCurrency(expense.grossValue)} />
            <StatCard
              label="Valor líquido"
              value={formatCurrency(expense.value)}
              badge={{ text: "reembolso", variant: "red" }}
            />
            <StatCard label="Valor glosado" value={formatCurrency(expense.deductedValue)} />
          </div>
        </div>
      </section>

      {/* General info */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Informações da despesa" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* Internal reference */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Referência interna" />
        <InfoPanel fields={internalFields} />
      </section>

      {/* Receipt document — last section for maximum visibility */}
      {expense.documentUrl && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <SectionHeader title="Nota fiscal / Comprovante" />
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
              <a
                href={expense.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Abrir documento →
              </a>
              <span className="text-xs text-gray-500">
                PDF ou imagem da nota fiscal / recibo
              </span>
            </div>

            {/* Inline preview for PDF/image documents */}
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <iframe
                src={expense.documentUrl}
                title="Nota fiscal / Comprovante"
                className="w-full h-[400px] sm:h-[600px] lg:h-[900px]"
                loading="lazy"
              />
            </div>
          </div>
        </section>
      )}
    </>
  )
}
