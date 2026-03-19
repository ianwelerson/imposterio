/**
 * @file CommitteesList.tsx
 * @description Client component for the full committees listing with search,
 * filters, pagination, and expandable detail rows.
 */

"use client"

import { useState } from "react"
import { SearchableList, DataTable, Badge, SourcePill } from "@/components/ui"
import type { DeputyCommittee } from "@imposterio/types"

interface CommitteesListProps {
  committees: DeputyCommittee[]
  sourceUrl: string
}

export function CommitteesList({ committees, sourceUrl }: CommitteesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  const columns = [
    {
      header: "Sigla",
      className: "whitespace-nowrap",
      cell: (r: DeputyCommittee) => (
        <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent">
          {r.abbreviation}
        </span>
      ),
    },
    {
      header: "Nome",
      cell: (r: DeputyCommittee) => (
        <span className="text-gray-900 text-sm">{r.name}</span>
      ),
    },
    {
      header: "Tipo",
      className: "whitespace-nowrap",
      cell: (r: DeputyCommittee) => (
        <span className="text-gray-600 text-xs">{r.type}</span>
      ),
    },
    {
      header: "Função",
      className: "whitespace-nowrap",
      cell: (r: DeputyCommittee) => (
        <Badge variant={r.role === "Titular" ? "green" : "gray"}>{r.role}</Badge>
      ),
    },
    {
      header: "Status",
      className: "whitespace-nowrap",
      cell: (r: DeputyCommittee) => (
        <Badge variant={r.endDate ? "gray" : "green"}>
          {r.endDate ? "Encerrada" : "Ativa"}
        </Badge>
      ),
    },
    {
      header: "",
      align: "center" as const,
      className: "whitespace-nowrap",
      cell: (r: DeputyCommittee) => {
        const isOpen = expandedId === r.id
        return (
          <button
            onClick={() => toggle(r.id)}
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            {isOpen ? "Fechar" : "Detalhes"}
          </button>
        )
      },
    },
  ]

  return (
    <SearchableList
      items={committees}
      searchAccessor={(c) => `${c.name} ${c.abbreviation}`}
      filters={[
        { label: "Tipo", accessor: (c) => c.type, allLabel: "Todos os tipos" },
        { label: "Função", accessor: (c) => c.role, allLabel: "Todas as funções" },
      ]}
      pageSize={20}
      placeholder="Buscar por nome ou sigla..."
    >
      {(paged) => (
        <DataTable
          columns={columns}
          data={paged}
          rowKey={(r) => r.id}
          expandedRowKey={expandedId}
          renderExpanded={(r) => (
            <CommitteeDetail committee={r} sourceUrl={sourceUrl} />
          )}
        />
      )}
    </SearchableList>
  )
}

function CommitteeDetail({
  committee,
  sourceUrl,
}: {
  committee: DeputyCommittee
  sourceUrl: string
}) {
  const fields = [
    { label: "Sigla", value: committee.abbreviation },
    { label: "Nome completo", value: committee.name },
    { label: "Tipo", value: committee.type },
    { label: "Função do deputado", value: committee.role },
    { label: "Data de início", value: formatDate(committee.startDate) },
    { label: "Data de término", value: committee.endDate ? formatDate(committee.endDate) : "Em andamento" },
  ]

  return (
    <div className="bg-gray-50 px-6 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-medium text-gray-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{f.value}</dd>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-500">Fonte oficial:</span>
        <SourcePill url={sourceUrl} />
      </div>
    </div>
  )
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR")
}
