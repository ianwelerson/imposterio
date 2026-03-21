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
      <header className="mb-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Votação {id}</h1>
            {session.approved === true && <Badge variant="green">Aprovada</Badge>}
            {session.approved === false && <Badge variant="red">Rejeitada</Badge>}
            {session.approved === null && <Badge variant="gray">Indefinida</Badge>}
            <SourcePill url={session._source} />
          </div>
          <Link
            href={`/camara/pautas/votacoes?ano=${selectedYear}`}
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors whitespace-nowrap"
          >
            ← Voltar à lista
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          {session.description}
        </p>
        {session.openingDescription && session.openingDescription !== session.description && (
          <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-3xl">
            {session.openingDescription}
          </p>
        )}
        {session.lastPresentation && (
          <p className="mt-2 text-xs text-gray-400 leading-relaxed max-w-3xl whitespace-pre-line">
            {session.lastPresentation}
          </p>
        )}
      </header>

      {/* Vote stats */}
      {totalVotes > 0 && (
        <section className="mb-8">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Resultado</h2>
            <p className="mt-1 text-sm text-gray-500">
              {totalVotes} votos registrados nesta sessão
            </p>
          </div>
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
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Informações</h2>
        <InfoPanel fields={infoFields} />
      </section>

      {/* Affected propositions */}
      {session.propositions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Proposições afetadas</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
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
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Objeto da votação</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
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
        <section className="mb-8">
          <SectionHeader title="Orientações partidárias" sourceUrl={orientations._source} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {validOrientations.map((o) => (
              <div
                key={o.name}
                className="flex items-center justify-between rounded-lg border border-gray-200/60 bg-white px-3 py-2"
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
        <section className="mb-8">
          <SectionHeader title="Votos individuais" sourceUrl={votes._source} />
          <VotesList votes={votes} />
        </section>
      )}
    </>
  )
}
