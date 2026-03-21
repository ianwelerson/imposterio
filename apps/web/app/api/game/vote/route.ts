/**
 * @file route.ts
 * @description API route for casting a vote on a game card.
 *
 * Accepts a card ID and a boolean "fair" value. Checks Redis for flood
 * control, records the vote, then builds the reveal by fetching fresh
 * data from the API cache.
 *
 * IP addresses are NEVER stored in PostgreSQL — only in Redis with TTL.
 *
 * @route POST /api/game/vote
 * @body {{ cardId: string, fair: boolean }}
 * @returns {GameVoteResponse} Reveal payload with identity and vote stats
 */

import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Redis } from "@upstash/redis"
import { castVote, getCardById } from "@imposterio/db/queries/game"
import { buildCardContent } from "../card-content"

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/** 30 days in seconds — flood control TTL */
const VOTE_TTL = 60 * 60 * 24 * 30

function getClientIp(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardId, fair } = body

    if (!cardId || typeof fair !== "boolean") {
      return NextResponse.json(
        { error: "Campos obrigatórios: cardId (string) e fair (boolean)." },
        { status: 400 },
      )
    }

    const headersList = await headers()
    const ip = getClientIp(headersList)

    // Flood control: check if this IP already voted on this card
    const redisKey = `vote:${ip}:${cardId}`
    if (redis) {
      const alreadyVoted = await redis.exists(redisKey)
      if (alreadyVoted) {
        return NextResponse.json(
          { error: "Você já votou neste card." },
          { status: 429 },
        )
      }
    }

    // Fetch the card to build reveal content
    const card = await getCardById(cardId)
    if (!card) {
      return NextResponse.json(
        { error: "Card não encontrado." },
        { status: 400 },
      )
    }

    // Record the vote
    const voteStats = await castVote(cardId, fair)

    // Mark as voted in Redis
    if (redis) {
      await redis.set(redisKey, "1", { ex: VOTE_TTL })
    }

    // Build reveal content from fresh API data
    const meta = card.refMeta as Record<string, unknown>
    const content = await buildCardContent(card.type, card.module, card.refId, meta)

    if (!content) {
      return NextResponse.json({
        name: "Dados indisponíveis",
        party: "—",
        state: "—",
        photoUrl: "",
        sourceUrl: "",
        ...voteStats,
      })
    }

    return NextResponse.json({
      ...content.reveal,
      ...voteStats,
    })
  } catch (error) {
    console.error("[POST /api/game/vote]", error)
    return NextResponse.json(
      { error: "Erro ao registrar voto." },
      { status: 500 },
    )
  }
}
