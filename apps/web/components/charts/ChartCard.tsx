/**
 * @file ChartCard.tsx
 * @description Wrapper card for all chart visualizations.
 *
 * Provides consistent styling (white card, border, padding) and a title/subtitle
 * header that matches the rest of the Imposterio design language.
 * All chart components in this directory render inside a ChartCard.
 */

interface ChartCardProps {
  /** Chart title displayed in the card header. */
  title: string
  /** Optional subtitle shown below the title in lighter text. */
  subtitle?: string
  /** Optional source URL displayed as a SourcePill next to the title. */
  sourceUrl?: string
  /** Chart content (Recharts component). */
  children: React.ReactNode
}

/**
 * Renders a styled card container for chart visualizations.
 *
 * @param title    - Chart heading
 * @param subtitle - Optional description below the heading
 * @param children - The chart element itself
 */
export function ChartCard({ title, subtitle, sourceUrl, children }: ChartCardProps) {
  return (
    <article className="rounded-lg border border-gray-200/60 bg-white p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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
      {subtitle && (
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </article>
  )
}
