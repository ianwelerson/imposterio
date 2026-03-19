/**
 * @file SectionHeader.tsx
 * @description Reusable section heading with optional action link.
 *
 * Used to introduce content sections on dashboard and detail pages.
 * Renders a heading with an optional "see all" or action link aligned
 * to the right, following a consistent pattern across all pages.
 */

import Link from "next/link"

interface SectionHeaderProps {
  /** Section title text. */
  title: string
  /** Optional action link displayed on the right side. */
  action?: {
    /** Link label text (e.g. "Ver todos"). */
    label: string
    /** Route path for the Next.js Link. */
    href: string
  }
}

/**
 * Renders a section heading with an optional right-aligned action link.
 *
 * @param title  - Section heading text
 * @param action - Optional link with label and href
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Maiores gastos"
 *   action={{ label: "Ver todos", href: "/camara" }}
 * />
 * ```
 */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
