/**
 * @file page.tsx
 * @description Individual proposition detail page for the Câmara dos Deputados.
 *
 * Shows comprehensive information about a single legislative proposition:
 * summary, status, authors, themes, legislative progress (tramitações),
 * voting history, and related propositions.
 *
 * Data sources:
 * - GET /proposicoes/{id}          — proposition detail
 * - GET /proposicoes/{id}/autores  — authors
 * - GET /proposicoes/{id}/temas    — themes
 * - GET /proposicoes/{id}/tramitacoes — legislative progress
 * - GET /proposicoes/{id}/votacoes — voting sessions for this proposition
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge, InfoPanel, SourcePill, SectionHeader } from "@/components/ui"
import {
  getPropositionDetail,
  getPropositionAuthors,
  getPropositionThemes,
  getPropositionProgress,
} from "@imposterio/fetchers"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function PropositionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  let proposition
  try {
    proposition = await getPropositionDetail(id)
  } catch {
    notFound()
  }

  const [authors, themes, progress] = await Promise.all([
    getPropositionAuthors(id),
    getPropositionThemes(id),
    getPropositionProgress(id),
  ])

  const leadAuthor = authors.find((a) => a.isLead) ?? authors[0]

  // Build InfoPanel fields
  const infoFields = [
    { label: "Tipo", value: proposition.typeCode },
    { label: "Número", value: `${proposition.number}/${proposition.year}` },
    {
      label: "Autor(a) principal",
      value: leadAuthor
        ? `${leadAuthor.name}${leadAuthor.party ? ` (${leadAuthor.party})` : ""}`
        : "Não informado",
    },
    ...(themes.length > 0
      ? [{ label: "Temas", value: themes.map((t) => t.name).join(", ") }]
      : []),
    {
      label: "Apresentação",
      value: new Date(proposition.presentedDate).toLocaleDateString("pt-BR"),
    },
    ...(proposition.statusDescription
      ? [{ label: "Situação", value: proposition.statusDescription }]
      : []),
    ...(proposition.statusOrgan
      ? [{ label: "Local atual", value: `${proposition.statusOrgan}${proposition.statusOrganName ? ` — ${proposition.statusOrganName}` : ""}` }]
      : []),
    ...(proposition.regime
      ? [{ label: "Regime de tramitação", value: proposition.regime }]
      : []),
    ...(proposition.statusDate
      ? [{ label: "Última atualização", value: new Date(proposition.statusDate).toLocaleDateString("pt-BR") }]
      : []),
  ]

  return (
    <>
      {/* Header */}
      <header className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">
              {proposition.typeCode} {proposition.number}/{proposition.year}
            </h1>
            <Badge variant="gray">{proposition.typeCode}</Badge>
            {proposition.statusDescription && (
              <Badge variant="amber">{proposition.statusDescription}</Badge>
            )}
          </div>
          <Link
            href={`/camara/pautas/lista?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à lista
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          {proposition.summary}
        </p>
        <div className="mt-2">
          <SourcePill url={proposition._source} />
        </div>
      </header>

      {/* Info panel */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Informações gerais</h2>
        <InfoPanel fields={infoFields} />
      </section>

      {/* Full summary */}
      {proposition.fullSummary && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Ementa detalhada</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <p className="text-sm text-gray-800 leading-relaxed">{proposition.fullSummary}</p>
          </div>
        </section>
      )}

      {/* Text URL */}
      {proposition.textUrl && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Inteiro teor</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-4">
            <a
              href={proposition.textUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Acessar documento completo →
            </a>
          </div>
        </section>
      )}

      {/* Authors */}
      {authors.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Autores" sourceUrl={authors._source} />
          <div className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
            {authors.map((author, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{author.name}</span>
                  <Badge variant="gray">{author.type}</Badge>
                  {author.isLead && <Badge variant="green">Proponente</Badge>}
                </div>
                <span className="text-xs text-gray-500">
                  Assinatura #{author.order}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Temas" sourceUrl={themes._source} />
          <div className="flex flex-wrap gap-2">
            {themes
              .sort((a, b) => b.relevance - a.relevance)
              .map((theme) => (
                <span
                  key={theme.code}
                  className="inline-flex rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent"
                >
                  {theme.name}
                </span>
              ))}
          </div>
        </section>
      )}

      {/* Legislative progress (tramitações) */}
      {progress.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Tramitação" sourceUrl={progress._source} />
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <ol className="relative border-l border-gray-200 ml-3">
              {progress.map((step, i) => (
                <li key={i} className="mb-6 ml-6 last:mb-0">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white" />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <time className="text-xs font-medium text-gray-400 tabular-nums">
                      {new Date(step.date).toLocaleDateString("pt-BR")}
                    </time>
                    {step.organAbbreviation && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {step.organAbbreviation}
                      </span>
                    )}
                    {step.situation && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        {step.situation}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-800">{step.description}</p>
                  {step.documentUrl && (
                    <a
                      href={step.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      Ver documento →
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  )
}
