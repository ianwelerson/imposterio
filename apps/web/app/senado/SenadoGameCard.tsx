/**
 * @file SenadoGameCard.tsx
 * @description Client-side GameCard wrapper for the Senado Federal page.
 *
 * Embeds the same interactive game experience as the dedicated /jogo page,
 * but scoped to the Senado context. Reuses JogoGameCard since the API
 * already returns random cards.
 */

"use client"

import { JogoGameCard } from "@/app/acha-justo/JogoGameCard"

export function SenadoGameCard() {
  return <JogoGameCard />
}
