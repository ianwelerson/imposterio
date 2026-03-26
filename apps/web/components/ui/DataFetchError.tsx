/**
 * @file DataFetchError.tsx
 * @description Inline warning banner displayed where data would normally appear
 * when an API fetch fails.
 *
 * Unlike toasts (which auto-dismiss), this component remains visible so users
 * understand why a section shows no data. It replaces the previous behaviour of
 * showing "0" or empty charts when a fetch fails silently.
 */

interface DataFetchErrorProps {
  /** Human-readable label describing the data that failed to load. */
  label: string
}

/**
 * Renders an amber warning banner indicating that a specific data section
 * could not be loaded. Intended to be placed inline where the data (StatCards,
 * charts, tables) would normally render.
 *
 * @param label - Name of the failed data section (e.g. "Despesas CEAP")
 *
 * @example
 * ```tsx
 * {failed.has("Despesas CEAP") && (
 *   <DataFetchError label="despesas" />
 * )}
 * ```
 */
export function DataFetchError({ label }: DataFetchErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
    >
      <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div>
        <p className="text-sm font-medium text-amber-800">
          Não foi possível carregar {label}
        </p>
        <p className="mt-0.5 text-xs text-amber-600">
          Tivemos um problema ao buscar os dados. Tente recarregar a página.
        </p>
      </div>
    </div>
  )
}
