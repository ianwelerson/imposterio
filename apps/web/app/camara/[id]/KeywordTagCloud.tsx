/**
 * @file KeywordTagCloud.tsx
 * @description Client component that renders speech keywords as proportionally-sized
 * tags in a flex-wrap container. Font size scales linearly from 12px to 24px based
 * on keyword frequency relative to the most common keyword.
 *
 * Each tag links to the speeches listing filtered by that keyword.
 */

"use client"

import Link from "next/link"
import type { KeywordCount } from "./activity-utils"

interface KeywordTagCloudProps {
  /** Keywords with their occurrence counts, pre-sorted by frequency. */
  keywords: KeywordCount[]
  /** Deputy ID for building links to the filtered speeches page. */
  deputyId: string
  /** Year for the speeches page URL query parameter. */
  year: number
}

/** Minimum font size in pixels for the least frequent keyword. */
const MIN_FONT_SIZE = 12
/** Maximum font size in pixels for the most frequent keyword. */
const MAX_FONT_SIZE = 24

/**
 * Renders keywords as a tag cloud with proportionally-scaled font sizes.
 * Each keyword links to the speeches listing page filtered by that keyword.
 */
export function KeywordTagCloud({ keywords, deputyId, year }: KeywordTagCloudProps) {
  if (keywords.length === 0) return null

  const maxCount = keywords[0].count

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map(({ keyword, count }) => {
        const fontSize =
          maxCount > 1
            ? MIN_FONT_SIZE + ((count - 1) / (maxCount - 1)) * (MAX_FONT_SIZE - MIN_FONT_SIZE)
            : MIN_FONT_SIZE

        return (
          <Link
            key={keyword}
            href={`/camara/${deputyId}/discursos?ano=${year}&keyword=${encodeURIComponent(keyword)}`}
            className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 hover:bg-indigo-100 transition-colors"
            style={{ fontSize: `${Math.round(fontSize)}px` }}
          >
            {keyword}
          </Link>
        )
      })}
    </div>
  )
}
