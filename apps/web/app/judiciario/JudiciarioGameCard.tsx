/**
 * @file JudiciarioGameCard.tsx
 * @description Client-side GameCard wrapper for the Judiciario page.
 *
 * Embeds the same interactive game experience as the dedicated /jogo page,
 * but scoped to the Judiciario context. Reuses JogoGameCard since the API
 * already returns random cards.
 */

"use client"

import { JogoGameCard } from "@/app/acha-justo/JogoGameCard"

export function JudiciarioGameCard() {
  return <JogoGameCard />
}
