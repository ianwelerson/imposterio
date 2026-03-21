/**
 * @file route.ts
 * @description API route for the game scoreboard.
 *
 * Returns the scoreboard with vote statistics and official identities,
 * fetched fresh from the API cache. Called client-side to refresh the
 * scoreboard after each vote.
 *
 * @route GET /api/game/scoreboard
 * @returns {ScoreboardEntry[]} Array of scoreboard entries sorted by disapproval
 */

import { NextResponse } from "next/server"
import { getScoreboardCards } from "@imposterio/db/queries/game"
import { buildCardContent } from "../card-content"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cards = await getScoreboardCards(8)

    // Build reveal data for each card in parallel
    const entries = await Promise.all(
      cards.map(async (card) => {
        const content = await buildCardContent(
          card.type,
          card.module,
          card.refId,
          card.refMeta,
        )

        return {
          id: card.id,
          module: card.module,
          refId: card.refId,
          name: content?.reveal.name ?? "—",
          party: content?.reveal.party ?? "—",
          state: content?.reveal.state ?? "—",
          photoUrl: content?.reveal.photoUrl ?? "",
          totalVotes: card.totalVotes,
          fairPercent: card.fairPercent,
        }
      }),
    )

    return NextResponse.json(entries)
  } catch (error) {
    console.error("[GET /api/game/scoreboard]", error)
    return NextResponse.json([], { status: 500 })
  }
}
