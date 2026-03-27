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
  /** Optional subtitle shown below the title in lighter text. */
  description?: string
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
export function SectionHeader({ title, description, sourceUrl, action }: SectionHeaderProps) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">{title}</h2>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Verificar na fonte oficial"
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md
                         bg-accent/[0.06] text-accent/80
                         hover:bg-accent/10 font-mono transition-colors whitespace-nowrap"
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
      {description && (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">{description}</p>
      )}
    </div>
  )
}
