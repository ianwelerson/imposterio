/**
 * @file route.ts
 * @description API route for the full game scoreboard (all cards).
 *
 * Returns all scored cards with vote statistics and official identities,
 * fetched fresh from the API cache. Used by the full scoreboard listing page.
 *
 * @route GET /api/game/scoreboard/all
 * @returns {ScoreboardEntry[]} Array of all scoreboard entries with votes
 */

import { NextResponse } from "next/server"
import { getScoreboardCards } from "@imposterio/db/queries/game"
import { buildCardContent } from "../../card-content"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cards = await getScoreboardCards(0)

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
          type: card.type,
          module: card.module,
          refId: card.refId,
          name: content?.reveal.name ?? "\u2014",
          party: content?.reveal.party ?? "\u2014",
          state: content?.reveal.state ?? "\u2014",
          photoUrl: content?.reveal.photoUrl ?? "",
          totalVotes: card.totalVotes,
          fairPercent: card.fairPercent,
        }
      }),
    )

    return NextResponse.json(entries)
  } catch (error) {
    console.error("[GET /api/game/scoreboard/all]", error)
    return NextResponse.json([], { status: 500 })
  }
}
