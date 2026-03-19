/**
 * @file HomeGameCard.tsx
 * @description Client-side wrapper for displaying a sample GameCard on the home page.
 *
 * This component exists because the home page (`page.tsx`) is a Server Component,
 * but GameCard requires client-side interactivity for vote button clicks.
 * In the future, this will fetch a real card from the API; for now, it renders
 * static mock data showcasing one of the many card categories.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

/**
 * Renders a sample GameCard with mock data for the home dashboard.
 *
 * The `onVote` handler is a placeholder — actual vote submission will be
 * implemented when the game API routes are built.
 */
export function HomeGameCard() {
  return (
    <GameCard
      category="wealth_growth"
      branch="senado"
      value="+R$ 2.400.000"
      context="Patrimônio declarado cresceu 340% entre 2018 e 2022"
      onVote={(fair) => {
        // Placeholder — will call POST /api/game/vote when implemented
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
