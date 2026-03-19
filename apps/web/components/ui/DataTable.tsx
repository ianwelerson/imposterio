/**
 * @file DataTable.tsx
 * @description Configurable data table for displaying tabular government data.
 *
 * Designed for high readability with generous row height, hover highlight,
 * and a subtle header background. Minimum font size of 14px (text-sm)
 * to accommodate the primary audience which includes older users.
 *
 * Columns are defined declaratively via the `columns` prop. Each column
 * specifies a header label, an accessor key (or render function), and
 * optional alignment. The table renders semantic HTML (`<table>`, `<thead>`,
 * `<tbody>`, `<th>`, `<td>`) for accessibility.
 */

import type { ReactNode } from "react"

/**
 * Definition for a single table column.
 * @typeParam T - The type of each row in the data array
 */
interface Column<T> {
  /** Column header label displayed in the `<th>`. */
  header: string
  /**
   * Render function that receives a row and returns the cell content.
   * Can return a string, number, or JSX (e.g. a SourcePill).
   */
  cell: (row: T) => ReactNode
  /**
   * Horizontal alignment for both the header and data cells.
   * @default "left"
   */
  align?: "left" | "center" | "right"
}

/**
 * Props for the DataTable component.
 * @typeParam T - The type of each row object
 */
interface DataTableProps<T> {
  /** Array of column definitions controlling what is rendered per column. */
  columns: Column<T>[]
  /** Array of row data objects. Each object is passed to column `cell` renderers. */
  data: T[]
  /**
   * Optional function to extract a unique key from each row.
   * Falls back to the array index if not provided.
   */
  rowKey?: (row: T, index: number) => string
  /**
   * Key of the currently expanded row (matches the value from `rowKey`).
   * When set, the `renderExpanded` callback is called for the matching row.
   */
  expandedRowKey?: string | null
  /**
   * Render function for the expanded detail panel below a row.
   * Only called when `expandedRowKey` matches the row's key.
   */
  renderExpanded?: (row: T) => ReactNode
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const

/**
 * Renders a data table with configurable columns, hover rows, and header styling.
 *
 * @typeParam T - Row data type
 * @param columns - Column definitions (header, cell renderer, alignment)
 * @param data    - Array of row objects
 * @param rowKey  - Optional key extractor for stable React keys
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { header: "Nome", cell: (row) => row.name },
 *     { header: "Valor", cell: (row) => formatBRL(row.value), align: "right" },
 *     { header: "Fonte", cell: (row) => <SourcePill url={row._source} /> },
 *   ]}
 *   data={expenses}
 *   rowKey={(row) => row.id}
 * />
 * ```
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  expandedRowKey,
  renderExpanded,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200/60 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200/60 bg-gray-50/70">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider
                  text-gray-500 ${alignClass[col.align ?? "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIndex) => {
            const key = rowKey ? rowKey(row, rowIndex) : String(rowIndex)
            const isExpanded = expandedRowKey === key && renderExpanded
            return (
              <>
                <tr
                  key={key}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 ${alignClass[col.align ?? "left"]}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
                {isExpanded && (
                  <tr key={`${key}-expanded`}>
                    <td colSpan={columns.length} className="p-0">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
