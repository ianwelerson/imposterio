/**
 * @file verba-gabinete.ts
 * @description Server-side scraper for the Câmara's "Verba de Gabinete" transparency page.
 *
 * The Câmara publishes per-deputy office spending data on a transparency page at:
 * https://www.camara.leg.br/transparencia/gastos-parlamentares
 *
 * Unlike CEAP expenses (available via the Open Data API), the Verba de Gabinete
 * data — covering parliamentary secretary salaries and office payroll — has **no
 * official API endpoint**. This scraper fetches the HTML page, parses spending
 * data from it, and caches the result in Redis for 24 hours.
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
 * A single monthly spending entry from the Verba de Gabinete page.
 *
 * @property month - Month number (1–12)
 * @property year - Reference year
 * @property totalSpent - Total amount spent on staff salaries that month (BRL)
 * @property ceiling - Monthly ceiling for the deputy's office (BRL)
 * @property staffCount - Number of parliamentary secretaries employed that month
 */
export interface VerbaGabineteMonthly {
  month: number
  year: number
  totalSpent: number
  ceiling: number
  staffCount: number
}

/**
 * Full result of the Verba de Gabinete scrape for a single deputy.
 *
 * @property deputyId - Câmara API deputy ID
 * @property year - Reference year
 * @property months - Monthly spending breakdown
 * @property totalAnnual - Sum of all monthly spending for the year
 * @property _source - Exact URL used for the scrape (with all query params)
 */
export interface VerbaGabineteResult {
  deputyId: string
  year: number
  months: VerbaGabineteMonthly[]
  totalAnnual: number
  _source: string
}

// ── Constants ───────────────────────────────────────────────────────

const BASE_URL = "https://www.camara.leg.br/transparencia/gastos-parlamentares"

/** Cache TTL: 24 hours (data is updated monthly). */
const VERBA_GABINETE_TTL = 60 * 60 * 24

/** Current legislature number (57th, 2023–2027). */
const CURRENT_LEGISLATURE = 57

// ── Scraper ─────────────────────────────────────────────────────────

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
 *
 * @param deputyId - Deputy's numeric ID
 * @param year - Reference year
 * @returns Redis key string
 */
function cacheKey(deputyId: string, year: number): string {
  return `verba-gabinete:${deputyId}:${year}`
}

/**
 * Parses the HTML response from the Verba de Gabinete page and extracts
 * monthly spending data.
 *
 * The page renders a table with columns: Mês, Servidores, Remuneração,
 * Teto do Gabinete. We extract each row's values using regex patterns
 * on the HTML table structure.
 *
 * @param html - Raw HTML string from the transparency page
 * @param deputyId - Deputy's numeric ID (for the result object)
 * @param year - Reference year (for the result object)
 * @param sourceUrl - The exact URL used to fetch the page
 * @returns Parsed spending data with source attribution
 * @throws {Error} When the expected table structure is not found in the HTML
 */
function parseVerbaGabineteHtml(
  html: string,
  deputyId: string,
  year: number,
  sourceUrl: string,
): VerbaGabineteResult {
  const months: VerbaGabineteMonthly[] = []

  // The page renders spending data in a table. Each row contains:
  // - Month name (Janeiro, Fevereiro, etc.)
  // - Number of staff (servidores)
  // - Total spent (remuneração)
  // - Monthly ceiling (teto)
  //
  // We look for rows in the main spending table, matching the pattern:
  // <td>Mês</td><td>N</td><td>R$ X.XXX,XX</td><td>R$ X.XXX,XX</td>

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]

  // Match table rows containing month data.
  // Pattern: <tr> ... month name ... numbers ... </tr>
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(html)) !== null) {
    const rowHtml = match[1]

    // Check if this row contains a month name
    const monthIndex = monthNames.findIndex((m) => rowHtml.includes(m))
    if (monthIndex === -1) continue

    // Extract numeric values from <td> cells
    // Brazilian currency format: "1.234,56" or "R$ 1.234,56"
    const numberPattern = /[\d.]+,\d{2}/g
    const numbers: number[] = []
    let numMatch: RegExpExecArray | null

    while ((numMatch = numberPattern.exec(rowHtml)) !== null) {
      // Convert Brazilian number format to JS number: "1.234,56" → 1234.56
      const value = parseFloat(numMatch[0].replace(/\./g, "").replace(",", "."))
      if (!isNaN(value)) numbers.push(value)
    }

    // We expect at least: staffCount (integer), totalSpent, ceiling
    if (numbers.length >= 2) {
      // First number is usually the staff count (integer, no decimals in source)
      // but parsed as decimal due to regex — check if it looks like a count
      const staffCount = numbers.length >= 3 ? Math.round(numbers[0]) : 0
      const totalSpent = numbers.length >= 3 ? numbers[1] : numbers[0]
      const ceiling = numbers.length >= 3 ? numbers[2] : numbers[1]

      months.push({
        month: monthIndex + 1,
        year,
        totalSpent,
        ceiling,
        staffCount,
      })
    }
  }

  if (months.length === 0) {
    throw new Error(
      `Failed to parse Verba de Gabinete data for deputy ${deputyId}, year ${year}. ` +
      "The page HTML structure may have changed.",
    )
  }

  const totalAnnual = months.reduce((sum, m) => sum + m.totalSpent, 0)

  return {
    deputyId,
    year,
    months,
    totalAnnual,
    _source: sourceUrl,
  }
}

/**
 * Fetches and parses a deputy's Verba de Gabinete (office spending) data.
 *
 * This function scrapes the Câmara's transparency page to extract monthly
 * parliamentary secretary payroll data for a specific deputy. Results are
 * cached in Redis for 24 hours under the key `verba-gabinete:{id}:{year}`.
 *
 * **Important:** This is HTML scraping, not an API call. The data structure
 * depends on the page's HTML layout, which can change without notice.
 *
 * @param deputyId - Deputy's numeric ID in the Câmara API (e.g. "204554")
 * @param year - Reference year (e.g. 2026). Defaults to the current year.
 * @returns Monthly spending breakdown with `_source` set to the exact scraped URL
 * @throws {Error} When the page cannot be fetched or the HTML structure is unrecognizable
 *
 * @example
 * ```typescript
 * const verba = await getVerbaGabinete("204554", 2026)
 * console.log(verba.totalAnnual)   // 1_234_567.89
 * console.log(verba.months.length) // 12 (or fewer if mid-year)
 * console.log(verba._source)       // full URL with all query params
 * ```
 *
 * @see {@link https://www.camara.leg.br/transparencia/gastos-parlamentares}
 */
export async function getVerbaGabinete(
  deputyId: string,
  year: number = new Date().getFullYear(),
): Promise<VerbaGabineteResult> {
  const key = cacheKey(deputyId, year)
  const sourceUrl = buildUrl(deputyId, year)

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached !== null && cached !== undefined) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached
        if (parsed && typeof parsed === "object" && "months" in parsed) {
          return { ...parsed, _source: sourceUrl } as VerbaGabineteResult
        }
        // Invalid cache entry — evict
        await redis.del(key).catch(() => {})
      }
    } catch {
      await redis.del(key).catch(() => {})
    }
  }

  // Fetch the HTML page
  const response = await fetch(sourceUrl, {
    headers: {
      "Accept": "text/html",
      "User-Agent": "Imposterio/1.0 (transparency platform; +https://imposterio.com.br)",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Verba de Gabinete page: HTTP ${response.status} for ${sourceUrl}`,
    )
  }

  const html = await response.text()
  const result = parseVerbaGabineteHtml(html, deputyId, year, sourceUrl)

  // Cache in Redis (never cache errors — only successful parses reach here)
  if (redis) {
    try {
      // Store without _source (it's re-injected on cache hit)
      const { _source: _, ...cacheable } = result
      await redis.set(key, JSON.stringify(cacheable), { ex: VERBA_GABINETE_TTL })
    } catch {
      // Cache write failure is non-fatal
    }
  }

  return result
}
