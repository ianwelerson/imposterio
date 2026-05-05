/**
 * @file AttendanceList.tsx
 * @description Client component for the per-session attendance listing with
 * search, type-filter, and pagination. Each row shows the session date, type,
 * deliberative flag, and presence badge.
 */

"use client"

import { SearchableList, DataTable, Badge } from "@/components/ui"
import type { SenatorAttendanceDay } from "@imposterio/types"

interface AttendanceListProps {
  sessions: SenatorAttendanceDay[]
}

function presenceVariant(attended: boolean): "green" | "red" {
  return attended ? "green" : "red"
}

export function AttendanceList({ sessions }: AttendanceListProps) {
  const columns = [
    {
      header: "Data",
      className: "whitespace-nowrap",
      cell: (r: SenatorAttendanceDay) => (
        <span className="text-sm tabular-nums text-gray-900">
          {r.date ? new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    {
      header: "Tipo de sessão",
      cell: (r: SenatorAttendanceDay) => (
        <span className="text-gray-700 text-sm">{r.type || "—"}</span>
      ),
    },
    {
      header: "Deliberativa",
      className: "whitespace-nowrap",
      cell: (r: SenatorAttendanceDay) => (
        <Badge variant={r.isDeliberative ? "amber" : "gray"}>
          {r.isDeliberative ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      header: "Presença",
      className: "whitespace-nowrap",
      align: "right" as const,
      cell: (r: SenatorAttendanceDay) => (
        <Badge variant={presenceVariant(r.attended)}>
          {r.attended ? "Presente" : "Ausente"}
        </Badge>
      ),
    },
  ]

  return (
    <SearchableList<SenatorAttendanceDay>
      items={sessions}
      searchAccessor={(s) => `${s.date} ${s.type}`}
      filters={[
        {
          label: "Tipo",
          accessor: (s) => s.type || "—",
          allLabel: "Todos os tipos",
        },
        {
          label: "Presença",
          accessor: (s) => (s.attended ? "Presente" : "Ausente"),
          allLabel: "Todos",
        },
      ]}
      pageSize={25}
      placeholder="Buscar por tipo ou data..."
    >
      {(paged) => (
        <DataTable<SenatorAttendanceDay>
          columns={columns}
          data={paged}
          rowKey={(r) => r.sessionId}
        />
      )}
    </SearchableList>
  )
}
