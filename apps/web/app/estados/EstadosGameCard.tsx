/**
 * @file EstadosGameCard.tsx
 * @description Client-side GameCard wrapper for the Estados page.
 *
 * Shows a game card about state-level data — governor compensation,
 * wealth growth, or state assembly expenses.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function EstadosGameCard() {
  return (
    <GameCard
      category="wealth_growth"
      branch="executivo"
      value="+R$ 5.100.000"
      context="Patrimônio de governador cresceu 420% durante o mandato (2019–2022)"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
