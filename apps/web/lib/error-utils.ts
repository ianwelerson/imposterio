/**
 * @file error-utils.ts
 * @description Server-side utilities for collecting API errors in page components.
 *
 * Provides `collectErrors()` — a helper that wraps a fetcher call, captures
 * failures into an error array, and returns a fallback value. This allows
 * server pages to degrade gracefully: sections with failed data show empty
 * states while the rest of the page still renders, and all errors are surfaced
 * to the user via `<ToastTrigger>`.
 */

import { ApiError } from "@imposterio/fetchers"

/**
 * Creates an empty array with a stub `_source` field, matching the `WithSource`
 * shape returned by fetchers. Use as fallback in `collectErrors()` so the page
 * can still render empty sections when a fetcher fails.
 */
export function emptySourced<T extends object>(val: T): T & { _source: string } {
  return Object.assign(val, { _source: "" })
}

/** Shape of a collected error passed to `<ToastTrigger>`. */
export interface PageError {
  message: string
  variant?: "error" | "warning"
}

/**
 * Wraps an async fetcher call with error collection.
 * On success, returns the fetcher result. On failure, pushes a user-friendly
 * message into the `errors` array and returns the provided `fallback`.
 *
 * When a `failedLabels` set is provided, the label is added to it on failure,
 * allowing pages to show inline warnings where the data would normally appear.
 *
 * @param fn           - Async function to execute (typically a fetcher call)
 * @param fallback     - Value to return when the fetcher fails
 * @param errors       - Mutable array where error messages are collected
 * @param label        - Human-readable label for the data section (used in the toast)
 * @param failedLabels - Optional mutable set where failed labels are tracked
 *
 * @example
 * ```typescript
 * const errors: PageError[] = []
 * const failed = new Set<string>()
 * const expenses = await collectErrors(
 *   () => getDeputyExpenses(id, year),
 *   [],
 *   errors,
 *   "Despesas CEAP",
 *   failed,
 * )
 * // failed.has("Despesas CEAP") === true when the fetch failed
 * ```
 */
export async function collectErrors<T>(
  fn: () => Promise<T>,
  fallback: T,
  errors: PageError[],
  label: string,
  failedLabels?: Set<string>,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    failedLabels?.add(label)
    if (err instanceof ApiError) {
      errors.push({
        message: `${label}: ${err.userMessage}`,
        variant: err.status === 429 ? "warning" : "error",
      })
    } else {
      errors.push({
        message: `Erro ao carregar ${label}. Tente novamente mais tarde.`,
        variant: "error",
      })
    }
    return fallback
  }
}
