/**
 * @file page.tsx
 * @description Per-session detail page for a Senate plenary voting session.
 *
 * Server component that calls `getSenadoVotingSessionDetail(id)`, which
 * aggregates the per-senator vote rows from the modern `/votacao` endpoint
 * into a single session entry with a tally and full vote breakdown.
 *
 * Renders header (matter ref, date, approval badge), 4 stat cards
 * (yes/no/abstention/absent counts), the `VoteBreakdown` component (bar +
 * collapsible per-senator table), and an optional link back to the
 * affected proposition's detail page.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ApiError,
  getSenadoVotingSessionDetail,
  getSenadoTaquigrafiaUrls,
} from "@imposterio/fetchers"
import {
  Badge,
  StatCard,
  VoteBreakdown,
  SourcePill,
} from "@/components/ui"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR")
}

export default async function VotingSessionDetailPage({ params }: PageProps) {
  const { id } = await params

  let session
  try {
    session = await getSenadoVotingSessionDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  // Empty stub: no rows matched the codigoSessaoVotacao filter.
  if (!session.voteTally && (!session.votes || session.votes.length === 0)) {
    notFound()
  }

  const tally = session.voteTally ?? { yes: 0, no: 0, abstention: 0, absent: 0 }
  const total = tally.yes + tally.no + tally.abstention + tally.absent

  const approvalBadge =
    session.approved === true
      ? { text: "Aprovada", variant: "green" as const }
      : session.approved === false
        ? { text: "Rejeitada", variant: "red" as const }
        : { text: "Sem registro", variant: "gray" as const }

  return (
    <>
      <header className="mb-12">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {session.matterIdentifier ?? `Sessão ${session.id}`}
            </h1>
            <Badge variant={approvalBadge.variant}>{approvalBadge.text}</Badge>
            {session.date && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {formatDate(session.date)}
              </span>
            )}
            <SourcePill url={session._source} />
          </div>
          <Link
            href="/senado/pautas/votacoes"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            ← Voltar às sessões
          </Link>
        </div>
        {session.description && (
          <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
            {session.description}
          </p>
        )}
        {session.matterId && (
          <p className="mt-2 text-xs text-gray-500">
            <Link
              href={`/senado/pautas/${session.matterId}`}
              className="font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver detalhes da proposição →
            </Link>
          </p>
        )}
      </header>

      <section className="mb-10">
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          aria-label="Placar da votação"
        >
          <StatCard
            label="Sim"
            value={String(tally.yes)}
            badge={
              total > 0
                ? { text: `${((tally.yes / total) * 100).toFixed(1)}%`, variant: "green" }
                : undefined
            }
          />
          <StatCard
            label="Não"
            value={String(tally.no)}
            badge={
              total > 0
                ? { text: `${((tally.no / total) * 100).toFixed(1)}%`, variant: "red" }
                : undefined
            }
          />
          <StatCard
            label="Abstenções"
            value={String(tally.abstention)}
          />
          <StatCard
            label="Ausentes"
            value={String(tally.absent)}
            badge={total > 0 ? { text: `de ${total}`, variant: "gray" } : undefined}
          />
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-5 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
          Resultado e votos
        </h2>
        <div className="rounded-lg border border-gray-200/60 bg-white p-5">
          <VoteBreakdown
            tally={tally}
            votes={session.votes}
            sourceUrl={session._source}
          />
        </div>
      </section>

      {/* Taquigrafia — full transcript and video for the session */}
      {(() => {
        const taquigrafia = getSenadoTaquigrafiaUrls(
          session.id,
          session.date,
          session.matterIdentifier ?? undefined,
        )
        return (
          <section className="mb-12">
            <h2 className="mb-3 text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              Taquigrafia
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              Notas taquigráficas e vídeo oficial da sessão. Disponibilidade depende da publicação pela Secretaria-Geral da Mesa.
            </p>
            <div className="flex flex-wrap gap-3">
              {taquigrafia.notesUrl && (
                <a
                  href={taquigrafia.notesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-accent/40 hover:text-accent transition-colors shadow-card"
                >
                  Ver notas taquigráficas ↗
                </a>
              )}
              {taquigrafia.videoUrl && (
                <a
                  href={taquigrafia.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-accent/40 hover:text-accent transition-colors shadow-card"
                >
                  Vídeo da sessão ↗
                </a>
              )}
            </div>
          </section>
        )
      })()}
    </>
  )
}
