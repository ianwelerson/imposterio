/**
 * @file SectionHeader.tsx
 * @description Reusable section heading with optional action link.
 *
 * Used to introduce content sections on dashboard and detail pages.
 * Renders a heading with an optional "see all" or action link aligned
 * to the right, following a consistent pattern across all pages.
 */

import Link from "next/link"
import type { ReactNode } from "react"

interface SectionHeaderProps {
  /** Section title — plain text or inline elements (e.g. Acronym). */
  title: ReactNode
  /** Optional source URL displayed as a small pill next to the title. */
  sourceUrl?: string
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
export function SectionHeader({ title, sourceUrl, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Verificar na fonte oficial"
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full
                       bg-indigo-50 text-indigo-600 border border-indigo-200
                       hover:bg-indigo-100 font-mono transition-colors whitespace-nowrap"
          >
            ↗ fonte
          </a>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {action.label}{!action.label.startsWith("←") && " →"}
        </Link>
      )}
    </div>
  )
}
