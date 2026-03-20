/**
 * @file StatCard.tsx
 * @description Metric card for displaying a single key statistic.
 *
 * Used on the home dashboard and detail pages to highlight aggregate values
 * (total spending, attendance rate, monitored officials count, etc.).
 * Supports an optional Badge to show directional change or warnings.
 *
 * Design: white card with subtle 0.5px border, generous padding,
 * large value text for readability (primary audience includes older users).
 */

import { Badge } from "./Badge"

interface StatCardProps {
  /** Short label describing what this metric measures (e.g. "Gasto total (CEAP)"). */
  label: string
  /** The formatted metric value displayed prominently (e.g. "R$ 12,4 mi"). */
  value: string
  /**
   * Optional badge to indicate change direction or status.
   * Provide both `text` and `variant` to render a Badge next to the value.
   */
  badge?: {
    /** Badge label text (e.g. "+12,4%", "-3,2%"). */
    text: string
    /** Semantic color: "red" (bad/increase), "green" (good/decrease), "amber" (warning). */
    variant: "red" | "green" | "amber" | "gray"
  }
  /** Optional tooltip text shown on hover via a "?" icon next to the label. */
  tooltip?: string
}

/**
 * Renders a white metric card with a label, large value, and optional badge.
 *
 * @param label - Description of the metric
 * @param value - Formatted display value
 * @param badge - Optional change indicator badge
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Gasto total (CEAP)"
 *   value="R$ 12,4 mi"
 *   badge={{ text: "+8,2% vs mês anterior", variant: "red" }}
 * />
 * ```
 */
export function StatCard({ label, value, badge, tooltip }: StatCardProps) {
  return (
    <article className="rounded-lg bg-white border border-gray-200/60 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
        {label}
        {tooltip && (
          <span className="group relative">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-500 cursor-help">
              ?
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 sm:mt-2 sm:gap-2.5">
        <p className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          {value}
        </p>
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </div>
    </article>
  )
}
