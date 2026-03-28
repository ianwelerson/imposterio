/**
 * @file PropositionSection.tsx
 * @description Client component for the Proposições section on the deputy
 * detail page — pie chart by type (year-filtered) and a collapsible historical
 * bar chart (full mandate). The full table lives on /camara/{id}/proposicoes.
 */

"use client"

import { useState } from "react"
import { ChartCard, PieChart, BarChart } from "@/components/charts"
import type { CountItem } from "./activity-utils"

interface PropositionSectionProps {
  byType: CountItem[]
  byYear: CountItem[]
  sourceUrl: string
}

export function PropositionSection({ byType, byYear, sourceUrl }: PropositionSectionProps) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="space-y-6">
      {/* Year-filtered type chart */}
      {byType.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            sourceUrl={sourceUrl}
            title="Proposições por tipo"
            subtitle="PL, PEC, PDL, REQ e outros tipos legislativos"
          >
            <PieChart data={byType} height={280} />
          </ChartCard>
        </div>
      )}

      {/* Collapsible historical view — full mandate */}
      {byYear.length > 1 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showHistory ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Histórico completo do mandato
          </button>

          {showHistory && (
            <div className="mt-4">
              <ChartCard
                sourceUrl={sourceUrl}
                title="Proposições por ano"
                subtitle="Volume de proposições apresentadas ao longo de todos os mandatos"
              >
                <BarChart
                  data={byYear.map((y) => ({ label: y.name, value: y.value }))}
                  height={280}
                />
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
