/**
 * @file JudiciarioGameCard.tsx
 * @description Client-side GameCard wrapper for the Judiciário page.
 *
 * Shows a game card relevant to the judiciary — judge compensation,
 * productivity, or benefits.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function JudiciarioGameCard() {
  return (
    <GameCard
      category="total_compensation"
      branch="judiciario"
      value="R$ 46.366,19/mês"
      context="Teto constitucional + auxílio-moradia + auxílio-alimentação + gratificações"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
