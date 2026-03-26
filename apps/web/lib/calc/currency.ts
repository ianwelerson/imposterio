/**
 * @file calc/currency.ts
 * @description Centralized BRL currency formatting.
 *
 * All currency display in the platform MUST use these functions to guarantee
 * consistent rounding, locale, and decimal behavior. Having a single source
 * of truth prevents silent discrepancies between pages.
 *
 * Rounding strategy: we use the browser's `toLocaleString` which applies
 * "round half to even" (banker's rounding) via the ICU library. This is
 * appropriate for financial display where we are showing API-sourced values,
 * not performing ledger accounting.
 */

/**
 * Formats a number as Brazilian Real (BRL) with 2 decimal places.
 *
 * @param value - Numeric value in BRL (e.g. 1234567.89)
 * @returns Formatted string with "R$" prefix (e.g. "R$ 1.234.567,89")
 *
 * @example
 * formatBRL(1234567.89) // "R$ 1.234.567,89"
 * formatBRL(0)          // "R$ 0,00"
 * formatBRL(-500.5)     // "-R$ 500,50"
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formats a large BRL value in a compact form for chart labels and stat cards.
 *
 * Uses abbreviated suffixes:
 * - Values >= 1 trillion  → "X,XX tri"
 * - Values >= 1 billion   → "X,XX bi"
 * - Values >= 1 million   → "X,XX mi"
 * - Values >= 1 thousand  → "X,XX mil"
 * - Below 1000            → standard formatBRL()
 *
 * @param value - Numeric value in BRL
 * @returns Compact formatted string (e.g. "R$ 5,52 tri")
 *
 * @example
 * formatBRLCompact(5_520_000_000_000) // "R$ 5,52 tri"
 * formatBRLCompact(1_234_000_000)     // "R$ 1,23 bi"
 * formatBRLCompact(2_500_000)         // "R$ 2,50 mi"
 */
export function formatBRLCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""

  if (abs >= 1e12) {
    return `${sign}R$ ${(abs / 1e12).toFixed(2).replace(".", ",")} tri`
  }
  if (abs >= 1e9) {
    return `${sign}R$ ${(abs / 1e9).toFixed(2).replace(".", ",")} bi`
  }
  if (abs >= 1e6) {
    return `${sign}R$ ${(abs / 1e6).toFixed(2).replace(".", ",")} mi`
  }
  if (abs >= 1e3) {
    return `${sign}R$ ${(abs / 1e3).toFixed(2).replace(".", ",")} mil`
  }
  return formatBRL(value)
}

/**
 * Formats a number with pt-BR locale (thousands separator, decimal comma)
 * without currency symbol. Useful for chart tooltips showing raw values.
 *
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g. "1.234.567,89")
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Rounds a currency value to 2 decimal places using integer math
 * to avoid floating-point drift.
 *
 * This is the canonical rounding function for all currency sums.
 * Use it after any reduce/accumulation of currency values.
 *
 * @param value - Raw sum that may have floating-point imprecision
 * @returns Value rounded to 2 decimal places
 *
 * @example
 * roundCurrency(0.1 + 0.2)        // 0.3 (not 0.30000000000000004)
 * roundCurrency(1234.5678)         // 1234.57
 * roundCurrency(1234.5)            // 1234.5
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}
