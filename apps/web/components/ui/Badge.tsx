/**
 * @file Badge.tsx
 * @description Pill-shaped status badge with semantic color variants.
 *
 * Used alongside data points to indicate directional change (increase/decrease)
 * or warning states. Each variant maps to an intuitive color:
 * - `red`   — increase or negative indicator (e.g. spending went up)
 * - `green` — decrease or positive indicator (e.g. spending went down)
 * - `amber` — warning or attention needed (e.g. data may be incomplete)
 *
 * Accessibility: text color meets WCAG AA contrast ratio against its
 * background in all three variants.
 */

/** Semantic color variants for the Badge component. */
type BadgeVariant = "red" | "green" | "amber"

interface BadgeProps {
  /** The text content displayed inside the badge. */
  children: React.ReactNode
  /**
   * Semantic color variant:
   * - `red`   — negative/increase (bg-red-50, text-red-700)
   * - `green` — positive/decrease (bg-emerald-50, text-emerald-700)
   * - `amber` — warning/attention (bg-amber-50, text-amber-700)
   */
  variant: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
}

/**
 * Renders a compact pill badge with a semantic color variant.
 *
 * @param children - Badge label text
 * @param variant  - Color variant indicating the nature of the value
 *
 * @example
 * ```tsx
 * <Badge variant="red">+12,4%</Badge>
 * <Badge variant="green">-3,2%</Badge>
 * <Badge variant="amber">Dados parciais</Badge>
 * ```
 */
export function Badge({ children, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5
                  rounded-full border ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}
