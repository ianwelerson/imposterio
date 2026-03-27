/**
 * @file page.tsx
 * @description Individual proposition detail page for the Senado Federal.
 *
 * Shows comprehensive information about a single legislative proposition:
 * full description, status, author, timeline, committee assignments,
 * vote breakdown, related propositions, and key metadata.
 *
 * Currently renders static mock data for UI development.
 * Future integration: Senado Open Data API
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { StatCard, Badge, InfoPanel, VoteBreakdown } from "@/components/ui"
import type { PropositionStatus } from "@imposterio/types"
import { MOCK_PROPOSITIONS } from "../mock-data"

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

export default async function PropositionDetailPage({ params }: PageProps) {
  const { id } = await params
  const proposition = MOCK_PROPOSITIONS.find((p) => p.id === id)

  if (!proposition) notFound()

  const total = proposition.voteTally
    ? proposition.voteTally.yes + proposition.voteTally.no + proposition.voteTally.abstention + proposition.voteTally.absent
    : null

  const approvalRate = proposition.voteTally && total
    ? ((proposition.voteTally.yes / total) * 100).toFixed(1)
    : null

  const infoFields = [
    { label: "Tipo", value: proposition.type },
    { label: "Autor(a)", value: `${proposition.author} (${proposition.authorParty})` },
    { label: "Tema", value: proposition.theme },
    { label: "Status", value: proposition.status },
    ...(proposition.presentedDate
      ? [{ label: "Apresentação", value: new Date(proposition.presentedDate).toLocaleDateString("pt-BR") }]
      : []),
    { label: "Última atualização", value: new Date(proposition.lastUpdate).toLocaleDateString("pt-BR") },
    ...(proposition.origin ? [{ label: "Casa de origem", value: proposition.origin }] : []),
    ...(proposition.currentLocation ? [{ label: "Localização atual", value: proposition.currentLocation }] : []),
    ...(proposition.urgency ? [{ label: "Regime de tramitação", value: proposition.urgency }] : []),
  ]

  return (
    <>
      <header className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{proposition.identifier}</h1>
            <Badge variant={STATUS_VARIANT[proposition.status]}>{proposition.status}</Badge>
            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {proposition.type}
            </span>
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

      {proposition.voteTally && (
        <section className="mb-12">
          <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Resultado da votação"
            >
              <StatCard
                label="Votos a favor"
                value={String(proposition.voteTally.yes)}
                badge={{ text: `${approvalRate}%`, variant: "green" }}
              />
              <StatCard
                label="Votos contra"
                value={String(proposition.voteTally.no)}
                badge={{ text: `${(100 - Number(approvalRate)).toFixed(1)}%`, variant: "red" }}
              />
              <StatCard
                label="Abstenções"
                value={String(proposition.voteTally.abstention)}
              />
              <StatCard
                label="Ausentes"
                value={String(proposition.voteTally.absent)}
                badge={{ text: `de ${total}`, variant: "gray" }}
              />
            </div>
          </div>
        </section>
      )}

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Informações gerais</h2>
        <InfoPanel fields={infoFields} />
      </section>

      {proposition.fullDescription && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Descrição completa</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <p className="text-sm text-gray-800 leading-relaxed">{proposition.fullDescription}</p>
          </div>
        </section>
      )}

      {proposition.voteTally && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Votação</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <VoteBreakdown
              tally={proposition.voteTally}
              votes={proposition.votes}
              sourceUrl={`https://legis.senado.leg.br/dadosabertos/plenario/votacao/${proposition.id}.json`}
            />
          </div>
        </section>
      )}

      {proposition.timeline && proposition.timeline.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Tramitação</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <ol className="relative border-l border-gray-200 ml-3">
              {proposition.timeline.map((event, i) => (
                <li key={i} className="mb-6 ml-6 last:mb-0">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white shadow-xs" />
                  <div className="flex items-baseline gap-2">
                    <time className="text-xs font-medium text-gray-400 tabular-nums">
                      {new Date(event.date).toLocaleDateString("pt-BR")}
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

      {proposition.committees && proposition.committees.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Comissões</h2>
          <div className="space-y-3">
            {proposition.committees.map((c) => (
              <div
                key={c.abbreviation}
                className="rounded-lg border border-gray-200/60 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent">
                    {c.abbreviation}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                  <span>Função: <strong>{c.role}</strong></span>
                  {c.rapporteur && (
                    <span>Relator(a): <strong>{c.rapporteur}</strong> ({c.rapporteurParty})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {proposition.relatedPropositions && proposition.relatedPropositions.length > 0 && (
        <section className="mb-12 border-t border-gray-200/60 pt-10">
          <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">Proposições relacionadas</h2>
          <div className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
            {proposition.relatedPropositions.map((rel) => (
              <div key={rel.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{rel.identifier}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {rel.type}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{rel.relation}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
