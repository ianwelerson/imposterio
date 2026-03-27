/**
 * @file RankingList.tsx
 * @description Ranked list displaying items with a name, progress bar, and percentage.
 *
 * Used on the home dashboard to show the most disapproved officials in the
 * "Fair or not?" game. Each item renders a horizontal bar proportional to
 * its percentage value, providing a quick visual comparison.
 *
 * The progress bar uses the indigo accent color for consistency with the
 * overall design language.
 */

/** A single item in the ranking. */
interface RankingItem {
  /** Unique identifier for React key. */
  id: string
  /** Display name (e.g. parliamentarian name). */
  name: string
  /** Optional subtitle (e.g. party and state). */
  subtitle?: string
  /** Percentage value (0–100) for the progress bar and label. */
  percentage: number
}

interface RankingListProps {
  /** Ordered array of ranking items (first = rank 1). */
  items: RankingItem[]
}

/**
 * Renders a vertical list of ranked items with name, progress bar, and percentage.
 *
 * Items are displayed in the order provided — the caller is responsible for
 * sorting. The progress bar width is proportional to the `percentage` value.
 *
 * @param items - Array of ranking items sorted by rank (first = highest)
 *
 * @example
 * ```tsx
 * <RankingList
 *   items={[
 *     { id: "1", name: "Fulano de Tal", subtitle: "PL — SP", percentage: 89 },
 *     { id: "2", name: "Beltrano Silva", subtitle: "PT — RJ", percentage: 76 },
 *   ]}
 * />
 * ```
 */
export function RankingList({ items }: RankingListProps) {
  return (
    <ol className="space-y-3" aria-label="Ranking">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3">
          {/* Rank number */}
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
            {index + 1}
          </span>

          {/* Name, subtitle, and bar */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.name}
                </p>
                {item.subtitle && (
                  <p className="truncate text-xs text-gray-500">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-700">
                {item.percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={item.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.name}: ${item.percentage}% de reprovação`}
            >
              <div
                className="h-full rounded-full bg-accent/80 transition-all"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
