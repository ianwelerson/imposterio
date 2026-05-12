/**
 * @file CompanyPartnersTable.tsx
 * @description Client component for the QSA partner table with expandable
 * cross-reference detail rows.
 *
 * Each partner row can be expanded to show OTHER companies whose partner
 * rows look like the same person under the §6 heuristic (masked CPF +
 * normalized name). Cross-references are ALWAYS prefixed with "Vínculo
 * provável" and tagged with a {@link ProvavelBadge} confidence variant —
 * we never assert equivalence. See EMPRESAS-PLAN.md §6.
 */

"use client"

import { useState } from "react"
import Link from "next/link"

import {
  Badge,
  DataTable,
  ProvavelBadge,
  SourcePill,
} from "@/components/ui"
import type { CompanyQsaPartner } from "@imposterio/types"
import type { RelatedPartnerRow } from "@imposterio/db/queries/companies"

interface CompanyPartnersTableProps {
  /** Raw QSA partners from OpenCNPJ — drives the visible row content. */
  partners: CompanyQsaPartner[]
  /**
   * Cross-reference matches keyed by `partnerNameKey` (normalized lowercase
   * + accent-stripped name). Missing keys imply "no related companies",
   * which still renders a row but without an expand affordance.
   */
  relatedByKey: Map<string, RelatedPartnerRow>
  /** OpenCNPJ source URL — appears as a SourcePill on each row. */
  sourceUrl: string
}

/**
 * Renders the QSA partner table for a company. Rows with related-company
 * matches expose a "Vínculos" toggle that reveals a detail panel listing
 * each cross-reference with its confidence variant.
 *
 * @param partners      - QSA list returned by OpenCNPJ
 * @param relatedByKey  - Map keyed by normalized partner name
 * @param sourceUrl     - OpenCNPJ source URL for the SourcePill column
 */
export function CompanyPartnersTable({
  partners,
  relatedByKey,
  sourceUrl,
}: CompanyPartnersTableProps) {
  // Single-row expansion state — closing happens by clicking again, by
  // toggling another row, or by re-mount. No need for a more sophisticated
  // controller while the table is small (typical QSA is < 30 partners).
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  type Row = CompanyQsaPartner & { rowKey: string; nameKey: string }

  const rows: Row[] = partners.map((p, index) => ({
    ...p,
    // Stable per-instance key — `partnerName` alone is not unique when two
    // partners share a display name (rare but observed in registered MEIs).
    rowKey: `${normalize(p.name)}-${p.maskedCpf ?? "pj"}-${index}`,
    nameKey: normalize(p.name),
  }))

  const toggle = (key: string) =>
    setExpandedKey((prev) => (prev === key ? null : key))

  const columns = [
    {
      header: "Sócio",
      cell: (r: Row) => {
        // Juridical-person partners deep-link to their company page; natural
        // persons get a partner-profile slug (CPF middle when available, name
        // key otherwise — matches `partnerSlug()` server-side).
        const href = r.partnerCnpj
          ? `/empresas/${r.partnerCnpj.replace(/\D/g, "")}`
          : `/empresas/socios/${partnerSlugClient({
              maskedCpf: r.maskedCpf,
              name: r.name,
            })}`
        return (
          <div className="flex flex-col">
            <Link
              href={href}
              className="font-medium text-accent transition-colors hover:text-accent-hover"
            >
              {r.name}
            </Link>
            {r.maskedCpf && (
              <span className="font-mono text-[11px] text-gray-400">
                {r.maskedCpf}
              </span>
            )}
            {r.partnerCnpj && (
              <span className="font-mono text-[11px] text-gray-400">
                CNPJ {formatCnpj(r.partnerCnpj)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: "Qualificação",
      cell: (r: Row) => (
        <span className="text-gray-600">{r.qualification || "—"}</span>
      ),
    },
    {
      header: "Entrada",
      className: "whitespace-nowrap",
      cell: (r: Row) => (
        <span className="text-gray-600">
          {r.joinedAt ? formatDate(r.joinedAt) : "—"}
        </span>
      ),
    },
    {
      header: "Vínculos prováveis",
      align: "center" as const,
      cell: (r: Row) => {
        const related = relatedByKey.get(r.nameKey)
        const count = related?.otherCompanies.length ?? 0
        if (count === 0) {
          return <span className="text-xs text-gray-300">—</span>
        }
        const isOpen = expandedKey === r.rowKey
        return (
          <button
            type="button"
            onClick={() => toggle(r.rowKey)}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent
                       hover:text-accent-hover transition-colors"
          >
            <span>{isOpen ? "Fechar" : "Ver"}</span>
            <Badge variant="amber">{count}</Badge>
          </button>
        )
      },
    },
    {
      header: "Fonte",
      align: "center" as const,
      cell: () => <SourcePill url={sourceUrl} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.rowKey}
      expandedRowKey={expandedKey}
      renderExpanded={(r) => (
        <RelatedCompaniesPanel related={relatedByKey.get(r.nameKey)} />
      )}
    />
  )
}

/**
 * Detail panel rendered under an expanded partner row. Lists every
 * other-company hit alongside its confidence variant. Clicking a row
 * deep-links into that company's empresas page.
 */
function RelatedCompaniesPanel({
  related,
}: {
  related: RelatedPartnerRow | undefined
}) {
  if (!related || related.otherCompanies.length === 0) {
    // Defensive — the parent only renders this panel when the toggle was
    // shown, but `related` could still be undefined if `relatedByKey` was
    // mutated between renders. Render a graceful no-op rather than crash.
    return (
      <div className="bg-gray-50 px-6 py-4 text-xs text-gray-400">
        Sem vínculos prováveis para este sócio.
      </div>
    )
  }

  return (
    <div className="bg-gray-50 px-6 py-4">
      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        Outras empresas com sócio aparentemente compatível com{" "}
        <span className="font-medium text-gray-700">{related.partnerName}</span>
        . Os cruzamentos são <span className="italic">heurísticos</span>{" "}
        (CPFs são mascarados na fonte) — confira sempre na fonte oficial antes
        de tirar conclusões.
      </p>
      <ul className="divide-y divide-gray-200/80 rounded-lg border border-gray-200 bg-white">
        {related.otherCompanies.map((other) => (
          <li
            key={other.cnpj}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Link
                href={`/empresas/${other.cnpj}`}
                className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
              >
                {other.legalName ?? formatCnpj(other.cnpj)}
              </Link>
              <p className="font-mono text-[11px] text-gray-400">
                {formatCnpj(other.cnpj)}
              </p>
            </div>
            <ProvavelBadge confidence={other.confidence} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Normalizes a partner display name to the same key used by the SQL
 * cross-reference query (`normalizePartnerName`). Re-implemented here to
 * keep this client component free of a queries-package import — the
 * function is trivial enough that drift risk is acceptable.
 */
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Mirrors `partnerSlug()` from `@imposterio/db/queries/companies` for use in
 * this client component. Drift risk is acceptable for the same reason as
 * `normalize` — the slug shape is intentionally simple.
 */
function partnerSlugClient(input: {
  maskedCpf: string | null
  name: string
}): string {
  const digits = (input.maskedCpf ?? "").replace(/\D/g, "")
  if (digits.length === 6) return `cpf-${digits}`
  return `name-${encodeURIComponent(normalize(input.name))}`
}

/** Formats a 14-digit CNPJ as `XX.XXX.XXX/XXXX-XX` for display. */
function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

/** Formats an ISO date string as a Brazilian short date. */
function formatDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString("pt-BR")
}
