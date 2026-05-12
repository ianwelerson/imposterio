/**
 * @file ProvavelBadge.tsx
 * @description Confidence badge for heuristic partner cross-references.
 *
 * Renders a "Vínculo provável" pill with a confidence variant and a hover
 * tooltip explaining the heuristic. The label is ALWAYS prefixed with
 * "Vínculo provável" — the cross-reference is built on masked CPFs and
 * normalized names (see EMPRESAS-PLAN.md §6) and we must never assert
 * equivalence to protect against defamation risk.
 *
 * Variants:
 * - **alta**:  cpfMid match + name similarity ≥ 0.9
 * - **media**: cpfMid match + partial name match
 * - **baixa**: name match alone, no cpfMid evidence
 */

import type { PartnerConfidence } from "@imposterio/db/queries/companies"

interface ProvavelBadgeProps {
  /** Heuristic confidence label — drives the color variant and tooltip text. */
  confidence: PartnerConfidence
}

/**
 * Per-variant Tailwind color classes. Confidence rises from baixa → alta;
 * the palette goes gray → amber → emerald to mirror that progression
 * without ever using red (which would imply a confirmed wrongdoing).
 */
const variantStyles: Record<PartnerConfidence, string> = {
  alta: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  media: "bg-amber-50 text-amber-700 ring-amber-600/10",
  baixa: "bg-gray-50 text-gray-600 ring-gray-500/10",
}

const variantLabels: Record<PartnerConfidence, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

const variantTooltips: Record<PartnerConfidence, string> = {
  alta: "CPF mascarado e nome batem com alta similaridade — provavelmente a mesma pessoa.",
  media: "CPF mascarado bate, mas o nome diverge em parte (ex.: nome de casada). Pode ser a mesma pessoa.",
  baixa: "Apenas o nome bate, sem confirmação por CPF. Risco maior de homonímia.",
}

/**
 * Renders a "Vínculo provável" pill with confidence variant and tooltip.
 *
 * @param confidence - Heuristic confidence label
 *
 * @example
 * ```tsx
 * <ProvavelBadge confidence="alta" />
 * ```
 */
export function ProvavelBadge({ confidence }: ProvavelBadgeProps) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs
                    font-medium ring-1 ring-inset ${variantStyles[confidence]}`}
      >
        Vínculo provável
        <span className="font-semibold">· {variantLabels[confidence]}</span>
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64
                   -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed
                   text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
      >
        {variantTooltips[confidence]}
      </span>
    </span>
  )
}
