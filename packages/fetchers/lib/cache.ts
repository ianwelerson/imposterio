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
 * Structured error thrown when an external government API returns a non-2xx status.
 * Carries the HTTP status code and original URL for downstream error handling.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`API error: ${status} ${url}`)
    this.name = "ApiError"
  }

  /** Human-readable error message in Portuguese for display in toasts. */
  get userMessage(): string {
    if (this.status === 429) return "A API atingiu o limite de requisições. Tente novamente em alguns minutos."
    if (this.status === 403) return "Acesso bloqueado pela API. Tente novamente mais tarde."
    if (this.status === 404) return "Recurso não encontrado na API oficial."
    if (this.status === 405) return "Endpoint indisponível na API oficial."
    if (this.status === 500) return "Erro interno na API oficial. Tente novamente mais tarde."
    if (this.status === 502) return "API oficial fora do ar (bad gateway). Tente novamente mais tarde."
    if (this.status === 503) return "API oficial temporariamente indisponível. Tente novamente mais tarde."
    if (this.status >= 500) return "Erro no servidor da API oficial. Tente novamente mais tarde."
    return `Erro ao consultar a API oficial (código ${this.status}).`
  }
}

/**
 * Whether Redis is available. When the Upstash env vars are missing,
 * cachedFetch() skips the cache layer entirely and calls the external
 * API directly. This allows local development without a Redis instance.
 */
const redisEnabled =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Shared Upstash Redis client singleton, initialized from environment variables.
 * `null` when env vars are missing (local dev without Redis).
 *
 * Exported so that bulk fetchers can read/write cache directly without
 * creating additional Redis instances (each instance adds connection overhead
 * and command count on Upstash's metered free tier).
 *
 * Required env vars:
 * - `UPSTASH_REDIS_REST_URL` — the REST endpoint for your Upstash database
 * - `UPSTASH_REDIS_REST_TOKEN` — the authentication token
 *
 * These are set in `apps/web/.env.local` (see `.env.example` at the repo root).
 */
export const redis = redisEnabled
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

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
 * @param url      - The full URL to fetch, including query parameters.
 *                   For GET requests, this is also used as the Redis cache key.
 * @param ttl      - Time-to-live in seconds for the Redis cache entry.
 *                   Use constants from `lib/ttl.ts` to keep values consistent.
 * @param options  - Optional `RequestInit` overrides (headers, method, body, etc.)
 *                   passed directly to `fetch()`. Useful for APIs that require
 *                   authentication headers (e.g., Portal da Transparência) or
 *                   POST requests (e.g., DataJud Elasticsearch queries).
 * @param cacheKey - Optional custom Redis cache key. When provided, this key is
 *                   used instead of the URL for cache lookups and storage. Required
 *                   for POST endpoints where different request bodies target the
 *                   same URL (e.g., DataJud `POST /api_publica_stf/_search` with
 *                   different ES query bodies). The `_source` field still uses the
 *                   original URL for traceability.
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
 *
 * @example
 * ```typescript
 * // POST request with custom cache key (DataJud Elasticsearch)
 * const esBody = { size: 0, aggs: { by_area: { terms: { field: "assunto.keyword" } } } }
 * const data = await cachedFetch<EsAggregationResponse>(
 *   "https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search",
 *   TTL.DATAJUD_CASES,
 *   {
 *     method: "POST",
 *     headers: {
 *       "Content-Type": "application/json",
 *       "Authorization": `APIKey ${process.env.DATAJUD_API_KEY}`,
 *     },
 *     body: JSON.stringify(esBody),
 *   },
 *   `datajud:stf:cases_by_area`
 * )
 * ```
 */
export async function cachedFetch<T>(
  url: string,
  ttl: number,
  options?: RequestInit,
  cacheKey?: string,
): Promise<WithSource<T>> {
  const key = cacheKey ?? url

  // Try Redis cache first (skipped when Redis is not configured)
  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached !== null && cached !== undefined) {
        // Upstash auto-deserializes JSON; handle both parsed and raw strings
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached
        // Only return if the cached value is a valid object/array — reject
        // primitives, nulls, or error markers that may have been stored by
        // a previous buggy write or a corrupt partial store.
        if (parsed && typeof parsed === "object") {
          if (process.env.NODE_ENV === "development") {
            console.log(`[cache HIT]  ${key.length > 80 ? key.slice(0, 80) + "…" : key}`)
          }
          return attachSource(parsed, url)
        }
        // Invalid entry (primitive, null, or error shape) — evict it
        await redis.del(key).catch(() => {})
      }
    } catch {
      // Corrupt or unparseable cache entry, or Redis network error.
      // Treat as a cache miss and evict the bad key so subsequent
      // requests don't hit the same error repeatedly.
      await redis.del(key).catch(() => {})
    }
  }

  // Bypass Next.js fetch cache — caching is handled by Redis. Without this,
  // Next.js may serve stale responses from its own data cache layer, causing
  // Redis cache misses to go unnoticed and TTLs to effectively be ignored.
  const fetchOptions: RequestInit = {
    ...options,
    cache: "no-store" as RequestCache,
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[cache MISS] ${key.length > 80 ? key.slice(0, 80) + "…" : key}`)
  }

  const res = await fetch(url, fetchOptions)
  if (!res.ok) {
    throw new ApiError(res.status, url)
  }

  const data = (await res.json()) as T

  // Only cache successful, non-null responses that are objects or arrays.
  // This guards against storing error-shaped 200 responses (some government
  // APIs return 200 with { "erro": "..." } bodies) or null payloads.
  if (redis && data != null && typeof data === "object") {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttl })
    } catch {
      // Cache write failure is non-fatal — data is still returned
    }
  }

  return attachSource(data, url)
}

/**
 * Attaches a `_source` URL to an API response while preserving its prototype.
 *
 * For object responses, the field is added via spread (`{ ...data, _source }`).
 * For top-level array responses, spreading would coerce the array into a
 * plain object with numeric keys; `Object.assign` on a fresh copy preserves
 * array semantics so callers can still iterate, `.map`, `.filter`, etc.
 *
 * Modern Senado endpoints (`/votacao`, `/processo`) return top-level arrays,
 * which is why this distinction matters.
 */
function attachSource<T>(data: T, url: string): WithSource<T> {
  if (Array.isArray(data)) {
    return Object.assign([...data], { _source: url }) as unknown as WithSource<T>
  }
  return { ...(data as object), _source: url } as WithSource<T>
}
