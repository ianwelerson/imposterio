/**
 * @file SectionHeader.tsx
 * @description Reusable section heading with optional action link and colored
 * left-border accent for visual section differentiation.
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
  /**
   * Optional Tailwind border-color class for the left accent bar
   * (e.g. "border-amber-400", "border-blue-400"). Creates a visual anchor
   * for spatial memory while scrolling.
   */
  accent?: string
}

/**
 * Renders a section heading with an optional right-aligned action link
 * and optional colored left-border accent.
 */
export function SectionHeader({ title, description, sourceUrl, action, accent }: SectionHeaderProps) {
  return (
    <div className={`mb-5 ${accent ? `border-l-[3px] pl-3 ${accent}` : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">{title}</h2>
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
