/**
 * @file SearchableList.tsx
 * @description Client-side searchable, filterable, paginated list wrapper.
 *
 * Wraps any array of items with a text search bar, optional dropdown filters,
 * and pagination controls. Designed to be the default pattern for all listing
 * pages in Imposterio (deputies, senators, parties, states, expenses, etc.).
 *
 * Usage pattern for new listing pages:
 * 1. Fetch all items server-side
 * 2. Pass items + filters config + children render to SearchableList
 * 3. The component handles search, filtering, pagination, and empty states
 */

"use client"

import { useState, useMemo, type ReactNode } from "react"

/** Configuration for a dropdown filter. */
interface FilterConfig<T> {
  /** Label shown above the dropdown. */
  label: string
  /** Function that extracts the filterable value from each item. */
  accessor: (item: T) => string
  /** Placeholder for the "all" option. @default "Todos" */
  allLabel?: string
}

interface SearchableListProps<T> {
  /** All items to search and paginate through. */
  items: T[]
  /**
   * Function that extracts the text-searchable string from each item.
   * The search query is matched against this value.
   */
  searchAccessor: (item: T) => string
  /** Placeholder text for the search input. @default "Buscar por nome..." */
  placeholder?: string
  /**
   * Optional dropdown filters. Each filter creates a `<select>` with
   * unique values extracted from the items via the accessor function.
   * Options are sorted alphabetically and deduplicated automatically.
   */
  filters?: FilterConfig<T>[]
  /**
   * Optional extra controls rendered inline with the filters row.
   * Useful for server-driven controls (e.g. year selector) that need
   * to sit alongside client-side filters.
   */
  extraControls?: ReactNode
  /** Render function for the full filtered + paginated list. */
  children: (filteredItems: T[]) => ReactNode
  /** Number of items per page. @default 20 */
  pageSize?: number
}

/**
 * Renders a search bar + dropdown filters + pagination controls around any list.
 */
export function SearchableList<T>({
  items,
  searchAccessor,
  placeholder = "Buscar por nome...",
  filters = [],
  extraControls,
  children,
  pageSize = 20,
}: SearchableListProps<T>) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const resetPage = () => setPage(1)

  const handleSearch = (value: string) => {
    setQuery(value)
    resetPage()
  }

  const handleFilter = (label: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [label]: value }))
    resetPage()
  }

  // Extract unique options for each filter from the data
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const f of filters) {
      const values = [...new Set(items.map(f.accessor))].filter(Boolean).sort()
      opts[f.label] = values
    }
    return opts
  }, [items, filters])

  const filtered = useMemo(() => {
    let result = items

    // Apply text search
    if (query.trim()) {
      const lower = query.toLowerCase().trim()
      result = result.filter((item) =>
        searchAccessor(item).toLowerCase().includes(lower),
      )
    }

    // Apply dropdown filters
    for (const f of filters) {
      const selected = activeFilters[f.label]
      if (selected) {
        result = result.filter((item) => f.accessor(item) === selected)
      }
    }

    return result
  }, [items, query, searchAccessor, filters, activeFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      {/* Search bar + filters row */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1 sm:max-w-xs">
          <label className="mb-1 block text-xs font-medium text-gray-500">Buscar</label>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2
                       text-sm text-gray-900 placeholder-gray-400
                       focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Buscar na lista"
          />
        </div>

        {filters.map((f) => (
          <div key={f.label} className="min-w-[140px] sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-gray-500">{f.label}</label>
            <select
              value={activeFilters[f.label] ?? ""}
              onChange={(e) => handleFilter(f.label, e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2
                         text-sm text-gray-900
                         focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{f.allLabel ?? "Todos"}</option>
              {filterOptions[f.label]?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}

        {extraControls}
      </div>

      {/* Results count */}
      <p className="mb-3 text-xs text-gray-400">
        {filtered.length === items.length
          ? `${items.length} resultados`
          : `${filtered.length} de ${items.length} resultados`}
      </p>

      {/* Content */}
      {filtered.length > 0 ? (
        children(paged)
      ) : (
        <div className="rounded-lg border border-gray-200/60 bg-white p-8 text-center text-sm text-gray-500">
          Nenhum resultado encontrado.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between"
          aria-label="Paginação"
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm
                       text-gray-600 transition-colors hover:bg-gray-50
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>

          <span className="text-sm text-gray-500">
            Página {safePage} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm
                       text-gray-600 transition-colors hover:bg-gray-50
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima →
          </button>
        </nav>
      )}
    </div>
  )
}
