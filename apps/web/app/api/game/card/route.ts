/**
 * @file route.ts
 * @description API route for fetching a random game card.
 *
 * Picks a random card the user hasn't voted on, then builds the question
 * dynamically by fetching fresh data from the government API cache.
 * The official's identity is NOT included — revealed only after voting.
 *
 * @route GET /api/game/card
 * @returns {GameCardResponse} A random card with question, or 404 if none available
 */

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { getRandomCard } from "@imposterio/db/queries/game"
import { prisma } from "@imposterio/db"
import { buildCardContent } from "../card-content"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

function getClientIp(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  )
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)

    // Find card IDs this user has already voted on via Redis pipeline
    const excludeIds: string[] = []
    if (redis) {
      const allCardIds = await prisma.gameCard.findMany({
        select: { id: true },
      })
      if (allCardIds.length > 0) {
        const pipeline = redis.pipeline()
        for (const card of allCardIds) {
          pipeline.exists(`vote:${ip}:${card.id}`)
        }
        const results = await pipeline.exec()
        for (let i = 0; i < allCardIds.length; i++) {
          if (results[i] === 1) {
            excludeIds.push(allCardIds[i].id)
          }
        }
      }
    }

    // Try up to 3 random cards in case one fails to build content
    for (let attempt = 0; attempt < 3; attempt++) {
      const card = await getRandomCard([...excludeIds])
      if (!card) break

      const meta = card.refMeta as Record<string, unknown>
      const content = await buildCardContent(card.type, card.module, card.refId, meta)

      if (content) {
        return NextResponse.json({
          id: card.id,
          type: card.type,
          module: card.module,
          question: content.question,
        })
      }

      // This card's data is unavailable — skip it
      excludeIds.push(card.id)
    }

    return NextResponse.json(
      { error: "Não há mais cards disponíveis. Volte mais tarde!" },
      { status: 404 },
    )
  } catch (error) {
    console.error("[GET /api/game/card]", error)
    return NextResponse.json(
      { error: "Erro ao buscar card do jogo." },
      { status: 500 },
    )
  }
}
