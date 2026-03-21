/**
 * @file EmpresasGameCard.tsx
 * @description Client-side GameCard wrapper for the Empresas page.
 *
 * Embeds the same interactive game experience as the dedicated /jogo page,
 * but scoped to the Empresas context. Reuses JogoGameCard since the API
 * already returns random cards.
 */

"use client"

import { JogoGameCard } from "@/app/acha-justo/JogoGameCard"

export function EmpresasGameCard() {
  return <JogoGameCard />
}
