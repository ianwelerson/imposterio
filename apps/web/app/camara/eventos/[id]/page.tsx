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
import { Badge, InfoPanel, SectionHeader, ToastTrigger } from "@/components/ui"
import { getEventDetail, getEventAttendees } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { AttendeesList } from "./AttendeesList"

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

  // Attendees degrade gracefully — errors shown as toasts
  const errors: PageError[] = []
  const attendees = await collectErrors(
    () => getEventAttendees(id),
    emptySourced([]),
    errors,
    "Lista de presença",
  )

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
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/camara"
                className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                ← Voltar à Câmara
              </Link>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{event.type}</h1>
                <Badge variant={statusVariant}>{event.status}</Badge>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/70">
                {event.description}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-12">
        <SectionHeader title="Informações gerais" sourceUrl={event._source} />
        <InfoPanel fields={infoFields} />
      </section>

      {event.organs.length > 0 && (
        <section className="mb-12">
          <SectionHeader title="Órgãos organizadores" />
          <div className="space-y-2">
            {event.organs.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3"
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
        <section className="mb-12">
          <SectionHeader title="Gravação" />
          <div className="rounded-xl border border-gray-200 bg-white p-5">
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

      {/* ── Lista de presença ──────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Lista de presença" sourceUrl={attendees._source} />
        {attendees.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {attendees.length} {attendees.length === 1 ? "deputado presente" : "deputados presentes"}
            </p>
            <AttendeesList attendees={attendees} sourceUrl={attendees._source} />
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Nenhum registro de presença disponível para este evento.
          </p>
        )}
      </section>
    </>
  )
}

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}
