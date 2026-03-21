/**
 * @file page.tsx
 * @description Individual voting session detail page for the Câmara.
 *
 * Shows the vote result, individual deputy votes (searchable/filterable),
 * party/bloc orientations, and affected propositions.
 *
 * Data sources:
 * - GET /votacoes/{id}             — session detail
 * - GET /votacoes/{id}/votos       — individual deputy votes
 * - GET /votacoes/{id}/orientacoes — party/bloc orientations
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { StatCard, Badge, InfoPanel, SectionHeader, SourcePill, ToastTrigger } from "@/components/ui"
import {
  getVotingSessionDetail,
  getVotingSessionVotes,
  getVotingSessionOrientations,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { VotesList } from "./VotesList"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function VotingSessionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams
  const selectedYear = Number(query.ano) || new Date().getFullYear()

  let session
  try {
    session = await getVotingSessionDetail(id)
  } catch {
    notFound()
  }

  const errors: PageError[] = []

  const [votes, orientations] = await Promise.all([
    collectErrors(() => getVotingSessionVotes(id), emptySourced([]), errors, "Votos individuais"),
    collectErrors(() => getVotingSessionOrientations(id), emptySourced([]), errors, "Orientações partidárias"),
  ])

  // Compute vote tallies from individual votes
  const yesCt = votes.filter((v) => v.vote === "Sim").length
  const noCt = votes.filter((v) => v.vote === "Não").length
  const abstCt = votes.filter((v) => v.vote === "Abstenção").length
  const obstructionCt = votes.filter((v) => v.vote === "Obstrução").length
  const totalVotes = votes.length

  const approvalRate = totalVotes > 0 ? ((yesCt / totalVotes) * 100).toFixed(1) : "0"

  // Info fields
  const infoFields = [
    {
      label: "Data",
      value: new Date(session.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      label: "Resultado",
      value: session.approved === true ? "Aprovada" : session.approved === false ? "Rejeitada" : "Indefinida",
    },
    ...(session.organ
      ? [{ label: "Órgão", value: session.organ }]
      : []),
    ...(session.eventId
      ? [{ label: "Evento", value: `#${session.eventId}` }]
      : []),
    ...(session.openingDate
      ? [{
          label: "Abertura da votação",
          value: new Date(session.openingDate).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }]
      : []),
    ...(session.propositions.length > 0
      ? [{
          label: "Proposições afetadas",
          value: session.propositions.map((p) => `${p.typeCode} ${p.number}/${p.year}`).join(", "),
        }]
      : []),
    ...(session.votingObjects.length > 0
      ? [{
          label: "Objeto da votação",
          value: session.votingObjects.map((p) => `${p.typeCode} ${p.number}/${p.year}`).join(", "),
        }]
      : []),
  ]

  // Orientation colors
  const orientationVariant = (o: string): "green" | "red" | "amber" | "gray" => {
    if (o === "Sim") return "green"
    if (o === "Não") return "red"
    if (o === "Obstrução") return "amber"
    return "gray"
  }

  // Filter out orientations with empty vote (API inconsistency)
  const validOrientations = orientations.filter((o) => o.orientation)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/pautas/votacoes?ano=${selectedYear}`}
                className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                ← Voltar à lista
              </Link>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Votação {id}</h1>
                {session.approved === true && <Badge variant="green">Aprovada</Badge>}
                {session.approved === false && <Badge variant="red">Rejeitada</Badge>}
                {session.approved === null && <Badge variant="gray">Indefinida</Badge>}
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                {session.description}
              </p>
              {session.openingDescription && session.openingDescription !== session.description && (
                <p className="mt-2 text-sm text-white/50 leading-relaxed max-w-xl">
                  {session.openingDescription}
                </p>
              )}
              {session.lastPresentation && (
                <p className="mt-2 text-xs text-white/40 leading-relaxed max-w-xl whitespace-pre-line">
                  {session.lastPresentation}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={session._source} />
            </div>
          </div>
        </div>
      </header>

      {/* Vote stats */}
      {totalVotes > 0 && (
        <section className="mb-12">
          <SectionHeader title="Resultado" />
          <p className="mb-4 text-sm text-gray-500">
            {totalVotes} votos registrados nesta sessão
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Sim"
              value={String(yesCt)}
              badge={{ text: `${approvalRate}%`, variant: "green" }}
            />
            <StatCard label="Não" value={String(noCt)} />
            <StatCard label="Abstenção" value={String(abstCt)} />
            {obstructionCt > 0 && (
              <StatCard label="Obstrução" value={String(obstructionCt)} />
            )}
          </div>
        </section>
      )}

      {/* Info panel */}
      <section className="mb-12">
        <SectionHeader title="Informações" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* Affected propositions */}
      {session.propositions.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Proposições afetadas" />
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {session.propositions.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <Link
                    href={`/camara/pautas/${p.id}?ano=${selectedYear}`}
                    className="font-semibold text-gray-900 hover:text-accent transition-colors text-sm"
                  >
                    {p.typeCode} {p.number}/{p.year}
                  </Link>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-md">{p.summary}</p>
                </div>
                <Link
                  href={`/camara/pautas/${p.id}?ano=${selectedYear}`}
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Voting objects (propositions that could be the object of this vote) */}
      {session.votingObjects.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Objeto da votação" />
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {session.votingObjects.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <Link
                    href={`/camara/pautas/${p.id}?ano=${selectedYear}`}
                    className="font-semibold text-gray-900 hover:text-accent transition-colors text-sm"
                  >
                    {p.typeCode} {p.number}/{p.year}
                  </Link>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-md">{p.summary}</p>
                </div>
                <Link
                  href={`/camara/pautas/${p.id}?ano=${selectedYear}`}
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Party orientations */}
      {validOrientations.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Orientações partidárias" sourceUrl={orientations._source} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {validOrientations.map((o) => (
              <div
                key={o.name}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-900">{o.name}</span>
                <Badge variant={orientationVariant(o.orientation)}>{o.orientation}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Individual votes */}
      {totalVotes > 0 && (
        <section className="mb-12">
          <SectionHeader title="Votos individuais" sourceUrl={votes._source} />
          <VotesList votes={votes} />
        </section>
      )}
    </>
  )
}
