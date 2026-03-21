/**
 * @file HomeGameCard.tsx
 * @description Client-side GameCard wrapper for the home dashboard.
 *
 * Embeds the same interactive game experience as the dedicated /jogo page.
 * Reuses JogoGameCard since the API already returns random cards.
 */

"use client"

import { JogoGameCard } from "@/app/acha-justo/JogoGameCard"

export function HomeGameCard() {
  return <JogoGameCard />
}
