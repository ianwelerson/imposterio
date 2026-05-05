/**
 * @file VotingSessionsList.tsx
 * @description Client component for the Senate voting-session listing.
 *
 * Wraps SearchableList + DataTable with filters by approval result and
 * proposition type, and links each row to the per-session detail subroute.
 */

"use client"

import Link from "next/link"
import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { SenadoVotingSession } from "@imposterio/types"

interface VotingSessionsListProps {
  sessions: SenadoVotingSession[]
}

function approvalLabel(approved: boolean | null): { text: string; variant: "green" | "red" | "gray" } {
  if (approved === true) return { text: "Aprovada", variant: "green" }
  if (approved === false) return { text: "Rejeitada", variant: "red" }
  return { text: "Sem registro", variant: "gray" }
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("pt-BR")
}

/** Extracts the "PL" / "PEC" prefix from a matter identifier for filtering. */
function matterTypePrefix(id: string | undefined): string {
  if (!id) return "—"
  const m = id.trim().match(/^([A-Za-zÀ-ÿ]+)/)
  return m?.[1].toUpperCase() ?? "—"
}

export function VotingSessionsList({ sessions }: VotingSessionsListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: SenadoVotingSession) => (
        <span className="text-sm tabular-nums text-gray-900">{formatDate(r.date)}</span>
      ),
    },
    {
      header: "Matéria",
      className: "whitespace-nowrap",
      cell: (r: SenadoVotingSession) =>
        r.matterIdentifier ? (
          <span className="font-semibold text-gray-900">{r.matterIdentifier}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      header: "Descrição",
      className: "max-w-md",
      cell: (r: SenadoVotingSession) => (
        <span className="text-gray-700 line-clamp-2 text-xs leading-relaxed">
          {r.description || "—"}
        </span>
      ),
    },
    {
      header: "Resultado",
      className: "whitespace-nowrap",
      cell: (r: SenadoVotingSession) => {
        const lbl = approvalLabel(r.approved)
        return <Badge variant={lbl.variant}>{lbl.text}</Badge>
      },
    },
    {
      header: "Placar",
      className: "whitespace-nowrap",
      cell: (r: SenadoVotingSession) =>
        r.voteTally ? (
          <span className="text-xs tabular-nums text-gray-600">
            {r.voteTally.yes} × {r.voteTally.no}
            {r.voteTally.abstention > 0 ? ` · ${r.voteTally.abstention} abst.` : ""}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      header: "",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (r: SenadoVotingSession) => (
        <Link
          href={`/senado/pautas/votacoes/${r.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
  ]

  return (
    <SearchableList<SenadoVotingSession>
      items={sessions}
      searchAccessor={(s) => `${s.matterIdentifier ?? ""} ${s.description}`}
      placeholder="Buscar por matéria ou descrição..."
      filters={[
        {
          label: "Resultado",
          accessor: (s) => approvalLabel(s.approved).text,
          allLabel: "Todos os resultados",
        },
        {
          label: "Tipo",
          accessor: (s) => matterTypePrefix(s.matterIdentifier),
          allLabel: "Todos os tipos",
        },
      ]}
      pageSize={20}
    >
      {(paged) => (
        <DataTable<SenadoVotingSession>
          columns={columns}
          data={paged}
          rowKey={(r) => r.id}
        />
      )}
    </SearchableList>
  )
}
