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
    variant: "red" | "green" | "amber"
  }
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
export function StatCard({ label, value, badge }: StatCardProps) {
  return (
    <article className="rounded-lg bg-white border border-gray-200/60 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2.5">
        <p className="text-2xl font-semibold tracking-tight text-gray-900">
          {value}
        </p>
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </div>
    </article>
  )
}
