/**
 * @file calc/index.ts
 * @description Central barrel export for all calculation and formatting utilities.
 *
 * This module consolidates every numeric computation used across the platform
 * into auditable, testable categories:
 *
 * - **currency** — BRL formatting with consistent rounding
 * - **percentage** — safe percentage calculations with division-by-zero guards
 * - **aggregation** — group-by-sum, group-by-count, top-N, monthly/daily bucketing
 * - **variation** — year-over-year, period comparisons
 * - **guards** — runtime sanity checks that validate computation results
 *
 * Every function that performs a numeric calculation in the platform should live
 * here or delegate to a function here. This makes it possible to:
 * 1. Audit all calculations in one place
 * 2. Test edge cases (floating-point, empty data, duplicates) centrally
 * 3. Add runtime assertions without modifying scattered business logic
 *
 * @see {@link apps/web/lib/calc/guards.ts} for runtime validation
 */

export * from "./currency"
export * from "./percentage"
export * from "./aggregation"
export * from "./variation"
export * from "./guards"
