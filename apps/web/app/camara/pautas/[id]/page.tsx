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
import { Badge, InfoPanel, SourcePill, SectionHeader, ToastTrigger, DataFetchError } from "@/components/ui"
import {
  getPropositionDetail,
  getPropositionAuthors,
  getPropositionThemes,
  getPropositionProgress,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"

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

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [authors, themes, progress] = await Promise.all([
    collectErrors(() => getPropositionAuthors(id), emptySourced([]), errors, "Autores", failed),
    collectErrors(() => getPropositionThemes(id), emptySourced([]), errors, "Temas", failed),
    collectErrors(() => getPropositionProgress(id), emptySourced([]), errors, "Tramitação", failed),
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
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/pautas/lista?ano=${selectedYear}`}
                className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                ← Voltar à lista
              </Link>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {proposition.typeCode} {proposition.number}/{proposition.year}
                </h1>
                <Badge variant="gray">{proposition.typeCode}</Badge>
                {proposition.statusDescription && (
                  <Badge variant="amber">{proposition.statusDescription}</Badge>
                )}
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                {proposition.summary}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={proposition._source} />
            </div>
          </div>
        </div>
      </header>

      {/* Info panel */}
      <section className="mb-12">
        <SectionHeader title="Informações gerais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* Full summary */}
      {proposition.fullSummary && (
        <section className="mb-12">
          <SectionHeader title="Ementa detalhada" />
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-800 leading-relaxed">{proposition.fullSummary}</p>
          </div>
        </section>
      )}

      {/* Text URL */}
      {proposition.textUrl && (
        <section className="mb-12">
          <SectionHeader title="Inteiro teor" />
          <div className="rounded-xl border border-gray-200 bg-white p-4">
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
      {failed.has("Autores") ? (
        <section className="mb-12">
          <SectionHeader title="Autores" />
          <DataFetchError label="os autores" />
        </section>
      ) : authors.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Autores" sourceUrl={authors._source} />
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {authors.map((author, i) => (
              <div key={i} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
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
      {failed.has("Temas") ? (
        <section className="mb-12">
          <SectionHeader title="Temas" />
          <DataFetchError label="os temas" />
        </section>
      ) : themes.length > 0 && (
        <section className="mb-12">
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
      {failed.has("Tramitação") ? (
        <section className="mb-12">
          <SectionHeader title="Tramitação" />
          <DataFetchError label="a tramitação" />
        </section>
      ) : progress.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Tramitação" sourceUrl={progress._source} />
          <div className="rounded-xl border border-gray-200 bg-white p-5">
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
