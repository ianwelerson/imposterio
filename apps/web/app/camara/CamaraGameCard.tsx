/**
 * @file CamaraGameCard.tsx
 * @description Client-side GameCard wrapper for the Câmara dos Deputados page.
 *
 * Embeds the same interactive game experience as the dedicated /jogo page,
 * but scoped to the Câmara context. Reuses JogoGameCard since the API
 * already returns random cards.
 */

"use client"

import { JogoGameCard } from "@/app/acha-justo/JogoGameCard"

export function CamaraGameCard() {
  return <JogoGameCard />
}
