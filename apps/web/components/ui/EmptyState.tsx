/**
 * @file EmptyState.tsx
 * @description Placeholder component for sections with no data or pending implementation.
 *
 * Displays a centered message inside a bordered card. Used on pages where
 * real data fetching is not yet implemented, or when API responses return
 * empty datasets.
 */

interface EmptyStateProps {
  /** Primary message (e.g. "Nenhum dado encontrado"). */
  message: string
  /** Optional secondary description with more context. */
  description?: string
}

/**
 * Renders a centered empty state card with message and optional description.
 *
 * @param message     - Primary empty state text
 * @param description - Optional explanatory text
 *
 * @example
 * ```tsx
 * <EmptyState
 *   message="Nenhuma despesa encontrada"
 *   description="Tente ajustar o período selecionado."
 * />
 * ```
 */
export function EmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border
                    border-dashed border-gray-300 bg-white px-6 py-14 text-center shadow-xs">
      <svg className="mb-3 h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm font-medium text-gray-500">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  )
}
