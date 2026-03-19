/**
 * @file GameCard.tsx
 * @description Card component for the "Fair or not?" (Acha Justo?) game.
 *
 * Displays an anonymous data point about a public official for the user
 * to judge before the reveal. Supports all game card categories and shows
 * which branch/institution the data comes from (Câmara, Senado, Executivo,
 * Judiciário, or TSE).
 *
 * After voting, the backend reveals the full card payload (name, party,
 * photo, etc.) — that reveal UI is handled separately.
 *
 * This component is UI-only and does not perform any API calls.
 * Vote submission is handled by the parent page via the `onVote` callback.
 */

"use client"

import type { GameCardType, GameBranch } from "@imposterio/types"
import { GAME_CARD_TYPE_LABELS, GAME_BRANCH_LABELS } from "@imposterio/types"

interface GameCardProps {
  /**
   * Card category — determines the category tag label.
   * Each category corresponds to a different kind of public data
   * (expense, absence, salary, etc.).
   */
  category: GameCardType
  /**
   * Branch or institution this data comes from.
   * Displayed as a tag so users know which part of the public sector
   * is being judged (e.g. "Câmara dos Deputados", "Judiciário").
   */
  branch: GameBranch
  /**
   * Pre-formatted primary value displayed prominently.
   * Format depends on category:
   * - Monetary: "R$ 45.231,00"
   * - Count: "42 faltas"
   * - Percentage: "34%"
   * - Ratio: "3 projetos em 8 anos"
   */
  value: string
  /**
   * Contextual description shown below the value.
   * Frames the number without revealing the official's identity.
   */
  context: string
  /**
   * Callback fired when the user casts a vote.
   * @param fair - `true` if the user considers this fair/acceptable, `false` otherwise
   */
  onVote: (fair: boolean) => void
  /** Whether voting is disabled (e.g. while a vote request is in flight). */
  disabled?: boolean
}

/**
 * Renders the anonymous game card with branch tag, category tag, value,
 * context, and vote buttons.
 *
 * @param category - Card type determining the category label
 * @param branch   - Institution/branch shown as a tag
 * @param value    - Formatted primary metric
 * @param context  - Descriptive text framing the value
 * @param onVote   - Callback receiving `true` (fair) or `false` (not fair)
 * @param disabled - Disables buttons during vote submission
 *
 * @example
 * ```tsx
 * <GameCard
 *   category="absence"
 *   branch="camara"
 *   value="42 faltas"
 *   context="De 120 sessões plenárias em 2024"
 *   onVote={(fair) => submitVote(cardId, fair)}
 * />
 * ```
 */
export function GameCard({
  category,
  branch,
  value,
  context,
  onVote,
  disabled = false,
}: GameCardProps) {
  return (
    <article className="rounded-lg border border-gray-200/60 bg-white p-6">
      {/* Header: game label + tags */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Acha Justo?
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {GAME_BRANCH_LABELS[branch]}
          </span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
            {GAME_CARD_TYPE_LABELS[category]}
          </span>
        </div>
      </div>

      {/* Primary value */}
      <p className="text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </p>

      {/* Context description */}
      <p className="mt-2 text-sm text-gray-500">{context}</p>

      {/* Vote buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => onVote(true)}
          disabled={disabled}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm
                     font-semibold text-white transition-colors
                     hover:bg-emerald-700 disabled:opacity-50
                     disabled:cursor-not-allowed"
          aria-label="Acho justo"
        >
          Acho justo
        </button>
        <button
          onClick={() => onVote(false)}
          disabled={disabled}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm
                     font-semibold text-white transition-colors
                     hover:bg-red-700 disabled:opacity-50
                     disabled:cursor-not-allowed"
          aria-label="Não acho justo"
        >
          Não acho justo
        </button>
      </div>
    </article>
  )
}
