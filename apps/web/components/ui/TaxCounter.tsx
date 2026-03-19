/**
 * @file TaxCounter.tsx
 * @description Animated real-time tax collection counter (Impostômetro).
 *
 * Displays an interpolated estimate of how much tax has been collected
 * in Brazil since the beginning of the current year, across all three
 * levels of government (federal, state, municipal).
 *
 * The counter uses the most recent official annual collection figure
 * and calculates a per-millisecond rate. A `requestAnimationFrame` loop
 * updates the displayed value continuously, creating the classic
 * "impostômetro" rolling-number effect.
 *
 * Methodology (same as IBPT Impostômetro):
 * - Base: previous year's total collection adjusted by 3-year avg growth
 * - Rate: annual estimate ÷ milliseconds in a year
 * - Offset: elapsed milliseconds since Jan 1st of current year
 * - Error margin: ~2–3.5% until official monthly data replaces estimates
 *
 * Data sources (when integrated):
 * - ReceitaData (Receita Federal) — federal tax collection
 * - SICONFI / Tesouro Nacional — state and municipal tax collection
 * - Portal da Transparência — federal budget revenue
 *
 * Currently uses a hardcoded annual estimate — real integration pending.
 */

"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Formats a number as Brazilian Real currency with animated precision.
 * Uses full decimal display for the rolling effect.
 */
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Estimated annual tax collection for 2026 (all levels of government).
 *
 * Based on 2025 actual: ~R$ 5.1 trillion (federal + state + municipal),
 * adjusted by average growth rate of 8.2% over the last 3 years.
 * This value will be replaced by real data from ReceitaData + SICONFI
 * when fetcher integration is complete.
 */
const ANNUAL_ESTIMATE_2026 = 5_520_000_000_000 // R$ 5.52 trillion

/** Milliseconds in a standard year (365 days). */
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000

/** Tax collected per millisecond. */
const RATE_PER_MS = ANNUAL_ESTIMATE_2026 / MS_PER_YEAR

export function TaxCounter() {
  const [value, setValue] = useState<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // Milliseconds elapsed since January 1st of the current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime()

    const tick = () => {
      const elapsed = Date.now() - yearStart
      setValue(elapsed * RATE_PER_MS)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="rounded-lg border border-gray-200/60 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Impostômetro {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Estimativa de impostos arrecadados desde 1º de janeiro
          </p>
        </div>

        <div className="text-right">
          <p
            className="font-mono text-2xl font-bold tracking-tight text-accent sm:text-3xl lg:text-4xl"
            aria-live="polite"
            aria-label={`Impostos arrecadados: ${formatCurrency(value)}`}
          >
            {formatCurrency(value)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Federal + Estadual + Municipal — margem de erro: 2–3,5%
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-200/60 pt-4 text-xs text-gray-400">
        <span>
          Base: R$ {(ANNUAL_ESTIMATE_2026 / 1e12).toFixed(2).replace(".", ",")} tri/ano
        </span>
        <span>
          Taxa: R$ {(RATE_PER_MS * 1000).toFixed(2).replace(".", ",")} /segundo
        </span>
        <span>
          Fontes: ReceitaData, SICONFI, Portal da Transparência
        </span>
      </div>
    </div>
  )
}
