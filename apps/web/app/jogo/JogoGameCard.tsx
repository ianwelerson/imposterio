/**
 * @file JogoGameCard.tsx
 * @description Client-side wrapper for the GameCard on the dedicated game page.
 *
 * Isolates client-side interactivity (vote button clicks) from the
 * server-rendered game page. In the future, this will fetch a random card
 * from `GET /api/game/card` and submit votes to `POST /api/game/vote`.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

/**
 * Renders a GameCard with mock data for the game page.
 * Vote handler is a placeholder for future API integration.
 */
export function JogoGameCard() {
  return (
    <GameCard
      category="staff_count"
      branch="camara"
      value="25 assessores"
      context="Deputado federal com 1 mandato — média da casa: 18"
      onVote={(fair) => {
        // Placeholder — will call POST /api/game/vote when implemented
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
