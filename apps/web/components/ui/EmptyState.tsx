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
    <div className="flex flex-col items-center justify-center rounded-lg border
                    border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-gray-500">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  )
}
