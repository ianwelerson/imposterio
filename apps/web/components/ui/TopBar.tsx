/**
 * @file TopBar.tsx
 * @description Page-level header bar with title and period selector tabs.
 *
 * Displayed at the top of the main content area (inside the AppShell).
 * The period selector allows users to filter dashboard data by time range.
 * Currently a UI-only component — period selection will be wired to data
 * fetching when the real API integration is implemented.
 *
 * Period options follow Brazilian Portuguese abbreviations:
 * - 7d  = últimos 7 dias
 * - 30d = últimos 30 dias
 * - 6m  = últimos 6 meses
 * - 1a  = último ano
 */

"use client"

import { useState } from "react"

/** Available time period filter options. */
const PERIODS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "6m", label: "6m" },
  { key: "1a", label: "1a" },
] as const

type PeriodKey = (typeof PERIODS)[number]["key"]

interface TopBarProps {
  /** Page title displayed on the left side of the bar. */
  title: string
  /**
   * The initially selected period key.
   * @default "30d"
   */
  defaultPeriod?: PeriodKey
}

/**
 * Renders a page header with title and clickable period selector tabs.
 *
 * @param title         - Page heading text
 * @param defaultPeriod - Initially active period tab (defaults to "30d")
 *
 * @example
 * ```tsx
 * <TopBar title="Painel geral" defaultPeriod="30d" />
 * ```
 */
export function TopBar({ title, defaultPeriod = "30d" }: TopBarProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>(defaultPeriod)

  return (
    <header className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <nav aria-label="Seletor de período" className="flex gap-1">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePeriod(key)}
            aria-pressed={activePeriod === key}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              ${
                activePeriod === key
                  ? "bg-accent text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
