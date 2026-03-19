/**
 * @file source.ts
 * @description Core traceability type used throughout Imposterio.
 *
 * Every piece of data fetched from a government API is wrapped with
 * `WithSource<T>`, which adds a `_source` field containing the exact
 * API URL that produced the data. This field powers the `<SourcePill>`
 * component and is the foundation of Imposterio's verifiability guarantee.
 */

/**
 * Augments any type `T` with a `_source` field for data provenance.
 *
 * The `_source` string contains the full URL (including query parameters)
 * of the API call that generated the data. It is injected automatically
 * by `cachedFetch()` in `packages/fetchers/lib/cache.ts`.
 *
 * @typeParam T - The original data type returned by the API
 *
 * @example
 * ```typescript
 * type DeputyExpenses = WithSource<{ dados: Expense[] }>
 * // Equivalent to: { dados: Expense[]; _source: string }
 * ```
 */
export type WithSource<T> = T & { _source: string }
