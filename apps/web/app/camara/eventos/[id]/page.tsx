/**
 * @file page.tsx
 * @description Individual event detail page.
 *
 * Shows comprehensive information about a single legislative event:
 * type, status, description, organizing committees, location,
 * time range, and recording link.
 *
 * Data source: GET /eventos/{id}
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge, InfoPanel, SectionHeader } from "@/components/ui"
import { getEventDetail } from "@imposterio/fetchers"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params

  let event
  try {
    event = await getEventDetail(id)
  } catch {
    notFound()
  }

  const statusVariant = event.status === "Encerrada" ? "gray"
    : event.status === "Em andamento" ? "green"
    : "amber"

  const infoFields = [
    { label: "Tipo", value: event.type },
    { label: "Status", value: event.status },
    { label: "Início", value: formatDateTime(event.startTime) },
    ...(event.endTime ? [{ label: "Fim", value: formatDateTime(event.endTime) }] : []),
    ...(event.location ? [{ label: "Local", value: event.location }] : []),
  ]

  return (
    <>
      <header className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{event.type}</h1>
            <Badge variant={statusVariant}>{event.status}</Badge>
          </div>
          <Link
            href="/camara"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar à Câmara
          </Link>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
          {event.description}
        </p>
      </header>

      <section className="mb-6">
        <SectionHeader title="Informações gerais" sourceUrl={event._source} />
        <InfoPanel fields={infoFields} />
      </section>

      {event.organs.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Órgãos organizadores" />
          <div className="space-y-2">
            {event.organs.map((o) => (
              <div
                key={o.id}
                className="rounded-lg border border-gray-200/60 bg-white p-4 flex items-center gap-3"
              >
                <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent">
                  {o.abbreviation}
                </span>
                <span className="text-sm text-gray-900">{o.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {event.recordingUrl && (
        <section className="mb-6">
          <SectionHeader title="Gravação" />
          <div className="rounded-lg border border-gray-200/60 bg-white p-5">
            <a
              href={event.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Assistir gravação →
            </a>
          </div>
        </section>
      )}
    </>
  )
}

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
