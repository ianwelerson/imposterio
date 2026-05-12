/**
 * @file ParcialNote.tsx
 * @description Inline disclaimer for incrementally-aggregated values.
 *
 * Empresas detail aggregates ("Total recebido do governo", "Total doado") are
 * snapshots of what the platform has observed so far via API calls — they
 * grow as users navigate and trigger new fetches. EMPRESAS-PLAN.md §5
 * mandates a visible disclaimer so visitors do not mistake a parcial
 * aggregate for a definitive total.
 *
 * Renders as italic helper text. Pair it with a StatCard or a section
 * heading so the "atualizado em" timestamp lives next to the value it
 * qualifies.
 */

interface ParcialNoteProps {
  /**
   * Most recent observation timestamp (`MAX(observedAt)` from the
   * aggregation row). When omitted, only the first sentence renders —
   * useful for sections where no transaction has been observed yet.
   */
  lastObservedAt?: Date | null
}

/**
 * Formats a Date as a Brazilian short date (e.g. "06/05/2026"). Pulled out
 * of the component so the formatter stays trivially testable and the
 * component can stay free of locale plumbing.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR")
}

/**
 * Renders the parcial-aggregation disclaimer inline.
 *
 * @param lastObservedAt - Date of the last observed transaction, or null
 *
 * @example
 * ```tsx
 * <StatCard label="Total recebido" value={formatBRL(total)} />
 * <ParcialNote lastObservedAt={lastObservedAt} />
 * ```
 */
export function ParcialNote({ lastObservedAt }: ParcialNoteProps) {
  return (
    <p className="mt-1 text-[11px] italic leading-relaxed text-gray-400">
      Valor parcial — soma o que já foi observado nas APIs oficiais
      {lastObservedAt ? ` até ${formatDate(lastObservedAt)}` : ""}.
      Cresce conforme novos dados são consultados.
    </p>
  )
}
