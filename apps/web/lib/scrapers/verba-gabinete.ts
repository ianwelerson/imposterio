/**
 * @file verba-gabinete.ts
 * @description Server-side scraper for the Câmara's "Verba de Gabinete" transparency page.
 *
 * The Câmara publishes per-deputy office spending data on a transparency page at:
 * https://www.camara.leg.br/transparencia/gastos-parlamentares
 *
 * Unlike CEAP expenses (available via the Open Data API), the Verba de Gabinete
 * data — covering parliamentary secretary salaries and office payroll — has **no
 * official API endpoint**. This scraper fetches the HTML page, parses the total
 * annual spending from it, and caches the result in Redis for 24 hours.
 *
 * ## HTML extraction strategy
 *
 * Inside the `#verba` section, the page renders a summary in two consecutive
 * `<p>` elements:
 *
 * 1. `p.gastos__resumo-texto` — descriptive text:
 *    "Em {year}, na legislatura {leg}, gasto d[o/a] {NAME} com verba de gabinete:"
 *
 * 2. `p.gastos__resumo-texto.gastos__resumo-texto--destaque` — the total value:
 *    "R$ 238.027,77"
 *
 * We extract the BRL value from the destaque paragraph and parse it to a float.
 *
 * **Fragility warning:** HTML scraping is inherently brittle. If the Câmara
 * redesigns this page or changes its HTML structure, this scraper will break.
 * See DECISIONS.md for the rationale behind this approach.
 *
 * @see {@link https://www.camara.leg.br/transparencia/gastos-parlamentares}
 */

import { redis } from "@imposterio/fetchers/lib/cache"

// ── Types ───────────────────────────────────────────────────────────

/**
 * Result of the Verba de Gabinete scrape for a single deputy.
 *
 * @property deputadoId - Câmara API deputy ID
 * @property year - Reference year
 * @property totalSpent - Total annual spending parsed from the destaque paragraph (BRL)
 * @property _source - Exact URL used for the scrape (with all query params)
 */
export interface VerbaGabineteData {
  deputadoId: string
  year: number
  totalSpent: number
  _source: string
}

// ── Constants ───────────────────────────────────────────────────────

const BASE_URL = "https://www.camara.leg.br/transparencia/gastos-parlamentares"

/** Cache TTL: 24 hours (data is updated monthly). */
const VERBA_GABINETE_TTL = 60 * 60 * 24

/** Current legislature number (57th, 2023–2027). */
const CURRENT_LEGISLATURE = 57

/**
 * HTTP headers for the scrape request. The Câmara's transparency page may
 * return 403 or incomplete HTML without a recognizable User-Agent and Referer.
 */
const SCRAPE_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (compatible; Imposterio/1.0; +https://imposterio.com.br)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
  Referer: "https://www.camara.leg.br/transparencia/gastos-parlamentares",
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Parses a Brazilian-formatted currency string to a JS number.
 *
 * Removes the "R$ " prefix, strips `.` (thousands separator), and replaces
 * `,` (decimal separator) with `.`.
 *
 * @example parseBrl("R$ 238.027,77") → 238027.77
 * @example parseBrl("1.234.567,89") → 1234567.89
 */
function parseBrl(raw: string): number {
  const cleaned = raw
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const value = parseFloat(cleaned)
  return isNaN(value) ? NaN : value
}

/**
 * Builds the full URL for the Verba de Gabinete transparency page.
 *
 * @param deputyId - Deputy's numeric ID in the Câmara API
 * @param year - Reference year for spending data
 * @returns Full URL with query parameters
 *
 * @example
 * ```typescript
 * buildUrl("204554", 2026)
 * // → "https://www.camara.leg.br/transparencia/gastos-parlamentares?legislatura=57&ano=2026&mes=&por=deputado&deputado=204554"
 * ```
 */
function buildUrl(deputyId: string, year: number): string {
  const params = new URLSearchParams({
    legislatura: String(CURRENT_LEGISLATURE),
    ano: String(year),
    mes: "",
    por: "deputado",
    deputado: deputyId,
  })
  return `${BASE_URL}?${params.toString()}`
}

/**
 * Generates the Redis cache key for a deputy's Verba de Gabinete data.
 */
function cacheKey(deputyId: string, year: number): string {
  return `verba-gabinete:${deputyId}:${year}`
}

// ── Parser ──────────────────────────────────────────────────────────

/**
 * Parses the HTML response from the Verba de Gabinete page and extracts
 * the total annual spending from the `gastos__resumo-texto--destaque`
 * paragraph inside the `#verba` section.
 *
 * @param html - Raw HTML string from the transparency page
 * @param deputyId - Deputy's numeric ID (for error messages)
 * @param year - Reference year (for error messages)
 * @param sourceUrl - The exact URL used to fetch the page
 * @returns Parsed spending data with source attribution
 * @throws {Error} When `#verba` section, summary paragraph, or destaque value is missing
 */
function parseVerbaGabineteHtml(
  html: string,
  deputyId: string,
  year: number,
  sourceUrl: string,
): VerbaGabineteData {
  // Step 1: Locate the #verba section. The page has multiple sections (cota,
  // verba, viagens) each with their own destaque paragraph. We slice the HTML
  // from the #verba anchor to avoid matching the cota value. We can't use a
  // simple <section>…</section> regex because the #verba section contains
  // nested <section> elements that would cause a non-greedy match to stop early.
  const verbaIdx = html.search(/id=["']verba["']/i)

  if (verbaIdx === -1) {
    throw new Error("Verba de Gabinete: #verba section not found in response")
  }

  const verbaHtml = html.slice(verbaIdx)

  // Step 2: Find the summary paragraph mentioning "verba de gabinete" and the
  // destaque paragraph immediately after it. This two-step match ensures we
  // grab the correct value even if the page has multiple destaque paragraphs.
  const destaquePattern = /com verba de gabinete:[\s\S]*?<p[^>]*class=["'][^"']*gastos__resumo-texto--destaque[^"']*["'][^>]*>([\s\S]*?)<\/p>/i
  const destaqueMatch = verbaHtml.match(destaquePattern)

  if (!destaqueMatch) {
    throw new Error(
      "Verba de Gabinete: summary paragraph not found — page structure may have changed",
    )
  }

  // Strip HTML tags from the content in case there are inner elements
  const rawText = destaqueMatch[1].replace(/<[^>]*>/g, "").trim()
  const totalSpent = parseBrl(rawText)

  if (isNaN(totalSpent)) {
    throw new Error(
      `Verba de Gabinete: could not parse total value from destaque paragraph (raw: "${rawText}")`,
    )
  }

  return {
    deputadoId: deputyId,
    year,
    totalSpent,
    _source: sourceUrl,
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Fetches and parses a deputy's Verba de Gabinete (office spending) data.
 *
 * This function scrapes the Câmara's transparency page to extract the total
 * annual parliamentary secretary payroll for a specific deputy. Results are
 * cached in Redis for 24 hours under the key `verba-gabinete:{id}:{year}`.
 *
 * **Important:** This is HTML scraping, not an API call. The data structure
 * depends on the page's HTML layout, which can change without notice.
 *
 * @param deputyId - Deputy's numeric ID in the Câmara API (e.g. "204554")
 * @param year - Reference year (e.g. 2026). Defaults to the current year.
 * @returns Total annual spending with `_source` set to the exact scraped URL
 * @throws {Error} When the page cannot be fetched or the HTML structure is unrecognizable
 *
 * @example
 * ```typescript
 * const verba = await getVerbaGabinete("204554", 2026)
 * console.log(verba.totalSpent)  // 238027.77
 * console.log(verba._source)     // full URL with all query params
 * ```
 *
 * @see {@link https://www.camara.leg.br/transparencia/gastos-parlamentares}
 */
export async function getVerbaGabinete(
  deputyId: string,
  year: number = new Date().getFullYear(),
): Promise<VerbaGabineteData> {
  const key = cacheKey(deputyId, year)
  const sourceUrl = buildUrl(deputyId, year)

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "object" ? cached : JSON.parse(cached as string)
        if (parsed && typeof parsed === "object" && "totalSpent" in parsed) {
          return { ...parsed, _source: sourceUrl } as VerbaGabineteData
        }
        // Invalid cache entry — evict
        await redis.del(key).catch(() => {})
      }
    } catch {
      await redis.del(key).catch(() => {})
    }
  }

  // Fetch the HTML page
  const response = await fetch(sourceUrl, { headers: SCRAPE_HEADERS })

  if (!response.ok) {
    throw new Error(`Verba de Gabinete fetch failed: HTTP ${response.status}`)
  }

  const html = await response.text()

  // In development, log the raw HTML for diagnosis when parsing fails
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[verba-gabinete] Fetched ${html.length} bytes for deputy ${deputyId}, year ${year}`,
    )
  }

  const result = parseVerbaGabineteHtml(html, deputyId, year, sourceUrl)

  // Only cache successful parses with a positive totalSpent
  if (redis && result.totalSpent > 0) {
    try {
      const { _source: _, ...cacheable } = result
      await redis.set(key, JSON.stringify(cacheable), { ex: VERBA_GABINETE_TTL })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return result
}
