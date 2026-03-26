/**
 * @file calc/percentage.ts
 * @description Safe percentage calculations with division-by-zero protection.
 *
 * Government data often contains zero totals (no votes cast, no expenses filed,
 * no events attended). Every percentage calculation MUST guard against division
 * by zero. These functions encapsulate that guard so callers never need to check.
 */

/**
 * Computes a rounded percentage (0–100) from a numerator and denominator.
 * Returns 0 when the denominator is zero — never throws or returns NaN/Infinity.
 *
 * @param numerator   - The "part" value
 * @param denominator - The "whole" value
 * @returns Integer percentage between 0 and 100 (inclusive)
 *
 * @example
 * safePercent(75, 100)  // 75
 * safePercent(1, 3)     // 33
 * safePercent(0, 0)     // 0
 * safePercent(5, 0)     // 0
 */
export function safePercent(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}

/**
 * Computes a percentage with one decimal place precision.
 * Used for display contexts that need finer granularity (e.g. vote breakdowns).
 *
 * @param numerator   - The "part" value
 * @param denominator - The "whole" value
 * @returns Percentage string with 1 decimal (e.g. "33.3%"), or "0.0%" if denominator is 0
 *
 * @example
 * safePercentLabel(1, 3)   // "33.3%"
 * safePercentLabel(0, 0)   // "0.0%"
 * safePercentLabel(100, 100) // "100.0%"
 */
export function safePercentLabel(numerator: number, denominator: number): string {
  if (denominator === 0) return "0.0%"
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

/**
 * Formats an already-computed percentage value as a display string.
 *
 * @param value - Percentage value (0–100)
 * @returns Formatted string (e.g. "75%")
 */
export function formatPercent(value: number): string {
  return `${value}%`
}
