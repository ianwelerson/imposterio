/**
 * @file EmpresasGameCard.tsx
 * @description Client-side GameCard wrapper for the Empresas page.
 *
 * Shows a game card about campaign donations from companies to politicians,
 * bridging the company and political transparency data.
 */

"use client"

import { GameCard } from "@/components/game/GameCard"

export function EmpresasGameCard() {
  return (
    <GameCard
      category="campaign_donations"
      branch="tse"
      value="R$ 8.200.000"
      context="Total recebido em doações de campanha (2022) — 74% de empresas do mesmo setor que recebeu contratos"
      onVote={(fair) => {
        console.log("Vote cast:", fair ? "fair" : "not fair")
      }}
    />
  )
}
