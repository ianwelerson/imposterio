/**
 * @file SenadoGameCard.tsx
 * @description Client-side GameCard wrapper for the Senado Federal page.
 *
 * Shows a game card relevant to the Federal Senate — bills per tenure,
 * campaign donations, or expenses for a senator.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function SenadoGameCard() {
  return (
    <GameCard
      category="bills_per_tenure"
      branch="senado"
      value="3 projetos"
      context="Em 8 anos de mandato no Senado (2 legislaturas completas)"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
