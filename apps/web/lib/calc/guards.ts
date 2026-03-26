/**
 * @file calc/guards.ts
 * @description Runtime sanity checks for calculated data before display.
 *
 * These guards catch computation errors that could show incorrect data to users.
 * They run after aggregation, before the data reaches React components.
 *
 * In development, violations throw errors for immediate visibility.
 * In production, violations log a warning and return a sanitized result,
 * so the page still renders but the team is alerted via monitoring.
 *
 * Usage pattern (in server components or utils):
 * ```ts
 * const byCategory = aggregateByCategory(expenses)
 * const total = sumValues(expenses, e => e.value)
 * assertSubtotalsMatch(byCategory.map(c => c.value), total, "expense categories")
 * ```
 */

const IS_DEV = process.env.NODE_ENV !== "production"

/**
 * Internal handler for guard violations.
 * Throws in dev, logs in prod.
 */
function handleViolation(message: string): void {
  const fullMessage = `[CALC GUARD] ${message}`
  if (IS_DEV) {
    throw new Error(fullMessage)
  }
  console.error(fullMessage)
}

/**
 * Asserts that an array of subtotals sums to the expected grand total,
 * within a small tolerance for floating-point rounding.
 *
 * Use after any aggregation that breaks a total into parts (by category,
 * by month, by supplier, etc.) to ensure no data was silently lost or duplicated.
 *
 * @param subtotals - Array of numeric subtotals
 * @param expectedTotal - The expected grand total
 * @param context - Description for the error message (e.g. "expense categories")
 * @param tolerance - Maximum allowed difference (default: 0.02 for currency)
 * @returns true if valid, false if violated (in prod mode)
 *
 * @example
 * assertSubtotalsMatch(
 *   byCategory.map(c => c.value),
 *   totalExpenses,
 *   "expense categories"
 * )
 */
export function assertSubtotalsMatch(
  subtotals: number[],
  expectedTotal: number,
  context: string,
  tolerance = 0.02,
): boolean {
  const sum = subtotals.reduce((a, b) => a + b, 0)
  const diff = Math.abs(sum - expectedTotal)

  if (diff > tolerance) {
    handleViolation(
      `Subtotal mismatch in "${context}": sum of parts = ${sum}, expected total = ${expectedTotal}, diff = ${diff}`,
    )
    return false
  }
  return true
}

/**
 * Asserts that no values in an array are negative.
 * Catches sign errors in calculations (e.g. negative expenses, negative vote counts).
 *
 * @param values  - Array of numeric values to check
 * @param context - Description for the error message (e.g. "monthly expenses")
 * @returns true if all non-negative, false if any violated
 */
export function assertNonNegative(
  values: number[],
  context: string,
): boolean {
  const negatives = values.filter((v) => v < 0)
  if (negatives.length > 0) {
    handleViolation(
      `Negative values found in "${context}": [${negatives.join(", ")}]`,
    )
    return false
  }
  return true
}

/**
 * Asserts that a percentage value falls within the 0–100 range.
 * Catches computation errors that would produce invalid percentages.
 *
 * @param value   - The percentage value to check
 * @param context - Description for the error message
 * @returns The clamped value (0–100), or the original if valid
 */
export function assertValidPercent(value: number, context: string): number {
  if (value < 0 || value > 100) {
    handleViolation(
      `Percentage out of range in "${context}": ${value} (expected 0–100)`,
    )
    return Math.max(0, Math.min(100, value))
  }
  return value
}

/**
 * Asserts that the count of aggregated output items is logically consistent
 * with the input count. The output should never exceed the input.
 *
 * @param inputCount  - Number of items that went into the aggregation
 * @param outputCount - Number of groups/buckets produced
 * @param context     - Description for the error message
 * @returns true if valid
 */
export function assertOutputCountValid(
  inputCount: number,
  outputCount: number,
  context: string,
): boolean {
  if (outputCount > inputCount && inputCount > 0) {
    handleViolation(
      `Output count exceeds input in "${context}": ${outputCount} groups from ${inputCount} items`,
    )
    return false
  }
  return true
}

/**
 * Asserts that monthly buckets contain exactly 12 entries (Jan–Dec).
 * Catches off-by-one errors in month bucketing.
 *
 * @param buckets - The monthly bucket array
 * @param context - Description for the error message
 * @returns true if exactly 12 entries
 */
export function assertTwelveMonths(
  buckets: Array<{ label: string; value: number }>,
  context: string,
): boolean {
  if (buckets.length !== 12) {
    handleViolation(
      `Monthly buckets in "${context}" has ${buckets.length} entries, expected 12`,
    )
    return false
  }
  return true
}

/**
 * Validates an entire aggregation result set before it reaches the UI.
 * Combines multiple guards into a single call for convenience.
 *
 * @param result - The aggregation result to validate
 * @param options - Validation options
 * @returns true if all checks pass
 */
export function validateAggregation(
  result: Array<{ name?: string; label?: string; value: number }>,
  options: {
    context: string
    expectedTotal?: number
    inputCount?: number
    noNegatives?: boolean
  },
): boolean {
  const { context, expectedTotal, inputCount, noNegatives = true } = options
  let valid = true

  const values = result.map((r) => r.value)

  if (noNegatives) {
    valid = assertNonNegative(values, context) && valid
  }

  if (expectedTotal !== undefined) {
    valid = assertSubtotalsMatch(values, expectedTotal, context) && valid
  }

  if (inputCount !== undefined) {
    valid = assertOutputCountValid(inputCount, result.length, context) && valid
  }

  return valid
}
