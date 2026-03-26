/**
 * @file DataDisclaimer.tsx
 * @description Disclaimer component that informs users about data sourcing.
 *
 * Displays a subtle notice that all data comes from official government APIs,
 * reinforcing the platform's transparency commitment. Should appear on pages
 * that aggregate or compute values from multiple API sources.
 */

interface DataDisclaimerProps {
  /** Optional additional context about the data (e.g. "Dados referentes a 2024"). */
  context?: string
  /** When the cache was last refreshed, if available. */
  lastUpdated?: Date | string | null
}

export function DataDisclaimer({ context, lastUpdated }: DataDisclaimerProps) {
  const updatedLabel = lastUpdated
    ? `Atualizado em ${new Date(lastUpdated).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null

  return (
    <div className="rounded-lg border border-gray-200/60 bg-gray-50/50 px-4 py-3 text-xs text-gray-400">
      <p>
        Dados obtidos diretamente das APIs oficiais do governo.
        Verifique cada valor na fonte clicando no ícone{" "}
        <span className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          ↗ fonte
        </span>
        {" "}ao lado de cada informação.
      </p>
      {(context || updatedLabel) && (
        <p className="mt-1.5 flex flex-wrap gap-x-3">
          {context && <span>{context}</span>}
          {updatedLabel && <span>{updatedLabel}</span>}
        </p>
      )}
    </div>
  )
}
