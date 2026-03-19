/**
 * @file ExecutivoGameCard.tsx
 * @description Client-side GameCard wrapper for the Executivo Federal page.
 *
 * Shows a game card relevant to the federal executive — compensation,
 * staff count, or travel expenses for a civil servant.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function ExecutivoGameCard() {
  return (
    <GameCard
      category="total_compensation"
      branch="executivo"
      value="R$ 35.462,71/mês"
      context="Salário base + gratificações + auxílios — servidor de carreira"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
