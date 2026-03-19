/**
 * @file InfoPanel.tsx
 * @description Key-value information panel for displaying structured details.
 *
 * Renders labeled fields in a two-column grid layout, useful for profile
 * detail sections (e.g. deputy bio data, company registration info).
 * Each field can optionally include a SourcePill for data traceability.
 */

import { SourcePill } from "./SourcePill"

/** A single labeled field in the panel. */
interface InfoField {
  /** Field label (e.g. "Nome civil", "CNPJ", "Data de posse"). */
  label: string
  /** Field value as a string. */
  value: string
  /** Optional source URL — renders a SourcePill next to the value. */
  sourceUrl?: string
}

interface InfoPanelProps {
  /** Array of key-value fields to display. */
  fields: InfoField[]
}

/**
 * Renders a grid of labeled key-value pairs with optional source links.
 *
 * @param fields - Array of label/value/source objects
 *
 * @example
 * ```tsx
 * <InfoPanel fields={[
 *   { label: "Nome civil", value: "André da Silva Brandão" },
 *   { label: "Data de nascimento", value: "15/03/1975" },
 *   { label: "Partido", value: "PL", sourceUrl: "https://..." },
 * ]} />
 * ```
 */
export function InfoPanel({ fields }: InfoPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200/60 bg-white p-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {field.label}
            </dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900">
              {field.value}
              {field.sourceUrl && <SourcePill url={field.sourceUrl} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
