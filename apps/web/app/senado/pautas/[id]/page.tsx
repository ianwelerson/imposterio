/**
 * @file page.tsx
 * @description Detail page for a single Senate proposition.
 *
 * Server component that fetches the proposition's full record, its
 * rapporteurship history, attached documents, and tabled amendments
 * in parallel from the modern `/processo` endpoint family. Renders:
 *
 *   - Header with identifier, status badge, type pill, and back link
 *   - InfoPanel with general metadata
 *   - Optional full description block
 *   - Tramitação timeline
 *   - Rapporteurship list (committee + role + dates)
 *   - Documents list (linkable PDFs)
 *   - Amendments list
 *
 * Vote tallies live on the per-session voting subroute
 * (`/senado/pautas/votacoes/[id]`) — the proposition itself surfaces a
 * link to the session list for that bill rather than synthesizing votes.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ApiError,
  getSenadoPropositionDetail,
  getSenadoPropositionRapporteurship,
  getSenadoPropositionDocuments,
  getSenadoPropositionAmendments,
} from "@imposterio/fetchers"
import type {
  PropositionStatus,
  RapporteurshipRecord,
  PropositionDocument,
  PropositionAmendment,
} from "@imposterio/types"
import {
  Badge,
  InfoPanel,
  SectionHeader,
  SourcePill,
  ToastTrigger,
  DataFetchError,
} from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"

const STATUS_VARIANT: Record<PropositionStatus, "amber" | "green" | "red" | "gray"> = {
  "Em votação": "amber",
  "Aprovada": "green",
  "Rejeitada": "red",
  "Tramitando": "amber",
  "Arquivada": "gray",
}

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR")
}

export default async function PropositionDetailPage({ params }: PageProps) {
  const { id } = await params

  let proposition
  try {
    proposition = await getSenadoPropositionDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const errors: PageError[] = []
  const failed = new Set<string>()

  const [rapporteurship, documents, amendments] = await Promise.all([
    collectErrors(
      () => getSenadoPropositionRapporteurship(id),
      emptySourced<RapporteurshipRecord[]>([]),
      errors,
      "Relatoria",
      failed,
    ),
    collectErrors(
      () => getSenadoPropositionDocuments(id),
      emptySourced<PropositionDocument[]>([]),
      errors,
      "Documentos",
      failed,
    ),
    collectErrors(
      () => getSenadoPropositionAmendments(id),
      emptySourced<PropositionAmendment[]>([]),
      errors,
      "Emendas",
      failed,
    ),
  ])

  const infoFields = [
    { label: "Tipo", value: proposition.type },
    { label: "Autor(a)", value: `${proposition.author} (${proposition.authorParty})` },
    { label: "Tema", value: proposition.theme },
    { label: "Status", value: proposition.status },
    ...(proposition.presentedDate
      ? [{ label: "Apresentação", value: formatDate(proposition.presentedDate) }]
      : []),
    ...(proposition.lastUpdate
      ? [{ label: "Última atualização", value: formatDate(proposition.lastUpdate) }]
      : []),
    ...(proposition.origin ? [{ label: "Casa de origem", value: proposition.origin }] : []),
    ...(proposition.currentLocation
      ? [{ label: "Localização atual", value: proposition.currentLocation }]
      : []),
    ...(proposition.urgency
      ? [{ label: "Regime de tramitação", value: proposition.urgency }]
      : []),
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {proposition.identifier}
            </h1>
            <Badge variant={STATUS_VARIANT[proposition.status]}>{proposition.status}</Badge>
            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {proposition.type}
            </span>
            <SourcePill url={proposition._source} />
          </div>
          <Link
            href="/senado/pautas/lista"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à lista
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          {proposition.summary}
        </p>
      </header>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
          Informações gerais
        </h2>
        <InfoPanel fields={infoFields} />
      </section>

      {proposition.fullDescription &&
        proposition.fullDescription !== proposition.summary && (
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              Descrição completa
            </h2>
            <div className="rounded-lg border border-gray-200/60 bg-white p-5">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {proposition.fullDescription}
              </p>
            </div>
          </section>
        )}

      {proposition.timeline && proposition.timeline.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
            Tramitação
          </h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <ol className="relative border-l border-gray-200 ml-3">
              {proposition.timeline.map((event, i) => (
                <li key={`${event.date}-${i}`} className="mb-6 ml-6 last:mb-0">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white shadow-xs" />
                  <div className="flex items-baseline gap-2">
                    <time className="text-xs font-medium text-gray-400 tabular-nums">
                      {formatDate(event.date)}
                    </time>
                    {event.location && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {event.location}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-800">{event.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Relatoria" sourceUrl={rapporteurship._source} />
        {failed.has("Relatoria") ? (
          <DataFetchError label="a relatoria" />
        ) : rapporteurship.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum relator designado.</p>
        ) : (
          <div className="space-y-3">
            {rapporteurship.map((r, i) => (
              <div
                key={`${r.committeeAbbreviation}-${r.rapporteurId ?? i}`}
                className="rounded-lg border border-gray-200/60 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent">
                    {r.committeeAbbreviation}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {r.committeeName || "—"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                  <span>
                    Relator(a):{" "}
                    {r.rapporteurId ? (
                      <Link
                        href={`/senado/${r.rapporteurId}`}
                        className="font-medium text-gray-900 hover:text-accent transition-colors"
                      >
                        {r.rapporteur}
                      </Link>
                    ) : (
                      <strong className="text-gray-900">{r.rapporteur}</strong>
                    )}
                    {r.rapporteurParty && ` (${r.rapporteurParty}${r.rapporteurUf ? `/${r.rapporteurUf}` : ""})`}
                  </span>
                  <span>
                    Função: <strong>{r.role}</strong>
                  </span>
                  {r.startDate && (
                    <span>
                      Designação: <strong>{formatDate(r.startDate)}</strong>
                    </span>
                  )}
                  {r.endDate && (
                    <span>
                      Destituição: <strong>{formatDate(r.endDate)}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Documentos" sourceUrl={documents._source} />
        {failed.has("Documentos") ? (
          <DataFetchError label="os documentos" />
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum documento publicado.</p>
        ) : (
          <ul className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {d.title || d.type}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{d.type}</span>
                    {d.date && <span>{formatDate(d.date)}</span>}
                    {d.author && <span>{d.author}</span>}
                  </div>
                </div>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 shrink-0 text-xs font-medium text-accent hover:text-accent-hover"
                  >
                    Abrir →
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Emendas" sourceUrl={amendments._source} />
        {failed.has("Emendas") ? (
          <DataFetchError label="as emendas" />
        ) : amendments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma emenda apresentada.</p>
        ) : (
          <ul className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
            {amendments.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-900">{a.identifier}</p>
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-accent hover:text-accent-hover"
                    >
                      Abrir →
                    </a>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
                  {a.date && <span>{formatDate(a.date)}</span>}
                  {a.author && (
                    <span>
                      {a.author}
                      {a.authorParty ? ` (${a.authorParty})` : ""}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="mt-1 text-xs text-gray-700 leading-relaxed">
                    {a.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
