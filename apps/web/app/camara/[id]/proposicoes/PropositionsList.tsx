/**
 * @file PropositionsList.tsx
 * @description Client component for the full propositions listing with search,
 * type/status filters, and pagination via SearchableList + DataTable.
 *
 * Columns: Number, Type, Year, Ementa, Status, Link to official page.
 */

"use client"

import Link from "next/link"
import { SearchableList, SourcePill } from "@/components/ui"
import type { CamaraProposition } from "@imposterio/types"

interface PropositionsListProps {
  propositions: CamaraProposition[]
  sourceUrl: string
}

/** Extracts searchable text from a proposition row. */
function searchAccessor(p: CamaraProposition): string {
  return [
    p.typeCode,
    String(p.number),
    String(p.year),
    p.summary,
    p.fullSummary,
    p.statusDescription,
  ]
    .filter(Boolean)
    .join(" ")
}

export function PropositionsList({ propositions, sourceUrl }: PropositionsListProps) {
  return (
    <SearchableList
      items={propositions}
      searchAccessor={searchAccessor}
      placeholder="Buscar por número, tipo, ementa ou status…"
      filters={[
        {
          label: "Tipo",
          accessor: (p: CamaraProposition) => p.typeCode,
        },
        {
          label: "Status",
          accessor: (p: CamaraProposition) => p.statusDescription ?? "",
        },
      ]}
      pageSize={30}
    >
      {(filtered) => (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Ano</th>
                  <th className="px-4 py-3">Ementa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 tabular-nums">
                      {p.number > 0 ? p.number : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {p.typeCode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 tabular-nums">
                      {p.year}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-700" title={p.summary || p.fullSummary || ""}>
                      {(p.summary || p.fullSummary || "").length > 100
                        ? `${(p.summary || p.fullSummary || "").slice(0, 100)}…`
                        : p.summary || p.fullSummary || "—"}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-xs text-gray-500" title={p.statusDescription ?? ""}>
                      {p.statusDescription || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {p.textUrl && (
                        <Link
                          href={p.textUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                        >
                          Ver na Câmara ↗
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-4 py-2 text-right">
              <SourcePill url={sourceUrl} />
            </div>
          </div>
        </>
      )}
    </SearchableList>
  )
}
