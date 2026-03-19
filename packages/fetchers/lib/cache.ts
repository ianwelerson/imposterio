/**
 * @file cache.ts
 * @description The single entry point for all external API calls in Imposterio.
 *
 * Every public government API request in the entire codebase MUST go through
 * `cachedFetch()`. This function provides two critical guarantees:
 *
 * 1. **Caching** — Responses are stored in Redis (Upstash) with a configurable
 *    TTL per data type. On cache hit, the external API is never contacted,
 *    protecting against rate limits and transient downtime.
 *
 * 2. **Source traceability** — Every response is augmented with a `_source`
 *    field containing the exact URL of the API call that produced the data.
 *    This field powers the `<SourcePill>` component in the UI, allowing users
 *    to verify any data point directly at the official government source.
 *
 * Architecture rule: calling `fetch()` directly from components or API Routes
 * is strictly forbidden. See CLAUDE.md §2.
 *
 * @see {@link https://upstash.com/docs/redis/overall/getstarted} Upstash Redis docs
 */

import { Redis } from "@upstash/redis"
import type { WithSource } from "@imposterio/types"

/**
 * Upstash Redis client, initialized from environment variables.
 *
 * Required env vars:
 * - `UPSTASH_REDIS_REST_URL` — the REST endpoint for your Upstash database
 * - `UPSTASH_REDIS_REST_TOKEN` — the authentication token
 *
 * These are set in `apps/web/.env.local` (see `.env.example` at the repo root).
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Fetches data from an external API with Redis caching and source injection.
 *
 * This is the **only** function in the codebase authorized to call external
 * government APIs. It implements a read-through cache pattern:
 *
 * 1. Check Redis for a cached response keyed by the full URL.
 * 2. On cache hit: return the cached data with `_source` injected.
 * 3. On cache miss: call the external API, store the response in Redis
 *    with the specified TTL, and return the data with `_source` injected.
 *
 * The `_source` field is always set to the requested URL, ensuring every
 * data point returned to the frontend carries its provenance. This field
 * is consumed by the `<SourcePill>` component to render a clickable link
 * to the official source.
 *
 * @typeParam T - The shape of the API response body (before `_source` injection)
 *
 * @param url     - The full URL to fetch, including query parameters.
 *                  This URL is also used as the Redis cache key.
 * @param ttl     - Time-to-live in seconds for the Redis cache entry.
 *                  Use constants from `lib/ttl.ts` to keep values consistent.
 * @param options - Optional `RequestInit` overrides (headers, method, body, etc.)
 *                  passed directly to `fetch()`. Useful for APIs that require
 *                  authentication headers (e.g., Portal da Transparência).
 *
 * @returns The API response body of type `T`, augmented with `_source: string`
 *          containing the exact URL that produced the data.
 *
 * @throws {Error} When the external API returns a non-2xx HTTP status.
 *         The error message includes the status code and URL for debugging.
 *
 * @example
 * ```typescript
 * import { cachedFetch } from "@imposterio/fetchers"
 * import { TTL } from "@imposterio/fetchers"
 *
 * const data = await cachedFetch<{ dados: Deputy[] }>(
 *   "https://dadosabertos.camara.leg.br/api/v2/deputados",
 *   TTL.CAMARA_DEPUTIES_LIST
 * )
 *
 * console.log(data._source)
 * // → "https://dadosabertos.camara.leg.br/api/v2/deputados"
 * ```
 *
 * @example
 * ```typescript
 * // With custom headers (Portal da Transparência requires an API key)
 * const data = await cachedFetch<CivilServant[]>(
 *   "https://api.portaldatransparencia.gov.br/api-de-dados/servidores",
 *   TTL.TRANSP_CIVIL_SERVANTS,
 *   { headers: { "chave-api-dados": process.env.TRANSPARENCIA_API_KEY! } }
 * )
 * ```
 */
export async function cachedFetch<T>(
  url: string,
  ttl: number,
  options?: RequestInit,
): Promise<WithSource<T>> {
  const cached = await redis.get<string>(url)
  if (cached) {
    const parsed = typeof cached === "string" ? JSON.parse(cached) : cached
    return { ...parsed, _source: url }
  }

  const res = await fetch(url, options)
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${url}`)
  }

  const data = (await res.json()) as T
  await redis.set(url, JSON.stringify(data), { ex: ttl })

  return { ...data, _source: url }
}
