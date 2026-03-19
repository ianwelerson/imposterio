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
export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <article className="rounded-lg border border-gray-200/60 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </article>
  )
}
