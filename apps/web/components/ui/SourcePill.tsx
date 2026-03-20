/**
 * @file SourcePill.tsx
 * @description Clickable pill that links to the official government API source.
 *
 * This component is the cornerstone of Imposterio's verifiability guarantee.
 * It MUST appear next to every data point displayed in the UI, without exception.
 * Clicking it opens the exact API URL that generated the associated data,
 * allowing users to verify any number directly at the official source.
 *
 * Architecture rule: every piece of data returned to the frontend includes a
 * `_source` field (injected by `cachedFetch()`). This component consumes that
 * field. See CLAUDE.md §3 and §4.
 */

"use client"

import { track } from "@/lib/analytics"

interface SourcePillProps {
  /**
   * The exact URL of the API call that generated the associated data point.
   * Sourced from the `_source` field injected by `cachedFetch()`.
   * Clicking this pill opens the URL in a new tab so users can verify
   * the data directly at the official government source.
   */
  url: string
}

/**
 * Renders a small clickable pill linking to the official data source.
 *
 * Must be placed next to every data point in the UI. Uses `target="_blank"`
 * with `rel="noopener noreferrer"` for security, and includes an `aria-label`
 * for screen reader accessibility.
 *
 * @param url - Full API URL to the official data source
 *
 * @example
 * ```tsx
 * <span>R$ 45.231,00</span>
 * <SourcePill url="https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024" />
 * ```
 */
export function SourcePill({ url }: SourcePillProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Verificar na fonte oficial"
      onClick={() => track("click_source_link", { url })}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                 bg-indigo-50 text-indigo-600 border border-indigo-200
                 hover:bg-indigo-100 font-mono transition-colors whitespace-nowrap"
    >
      ↗ fonte
    </a>
  )
}
