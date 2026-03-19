/**
 * @file CamaraGameCard.tsx
 * @description Client-side GameCard wrapper for the Câmara dos Deputados page.
 *
 * Shows a game card relevant to the Chamber of Deputies — expenses,
 * attendance, or staff count for a deputy.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function CamaraGameCard() {
  return (
    <GameCard
      category="absence"
      branch="camara"
      value="42 faltas"
      context="De 120 sessões plenárias em 2024 — deputado de 3º mandato"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
