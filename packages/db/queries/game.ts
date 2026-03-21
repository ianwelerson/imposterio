/**
 * @file game.ts
 * @description Typed query functions for the "Fair or not?" game tables
 * (game_cards and game_votes).
 *
 * The game stores only references to data points (entity ID + metadata).
 * Question text and reveal content are built dynamically at read time
 * by the card-content module, which fetches fresh data from the API cache.
 *
 * Anti-flood control is NOT in this file — it's handled via Redis in
 * the API route layer (key: `vote:{ip}:{cardId}`, TTL 30 days).
 */

import { prisma } from "../index"

/**
 * Fetches a random game card that the user has not yet voted on.
 *
 * @param excludeIds - Card IDs to exclude (already voted by this user)
 * @returns A random card reference, or null if none available
 */
export async function getRandomCard(excludeIds: string[] = []) {
  const cards = await prisma.gameCard.findMany({
    where: excludeIds.length > 0 ? { id: { notIn: excludeIds } } : undefined,
    select: {
      id: true,
      type: true,
      module: true,
      refId: true,
      refMeta: true,
    },
  })

  if (cards.length === 0) return null

  // Random selection in application layer — simpler than raw SQL
  return cards[Math.floor(Math.random() * cards.length)]
}

/**
 * Records a vote on a game card and returns vote statistics.
 *
 * The caller (API route) is responsible for:
 * 1. Redis flood control before calling this
 * 2. Building the reveal content via card-content module
 *
 * @param cardId - The ID of the card being voted on
 * @param fair   - Whether the user considers this fair (true) or not (false)
 * @returns Vote statistics for the card
 * @throws {Error} When the cardId does not exist
 */
export async function castVote(cardId: string, fair: boolean) {
  await prisma.gameVote.create({
    data: { cardId, fair },
  })

  const [totalVotes, fairVotes] = await Promise.all([
    prisma.gameVote.count({ where: { cardId } }),
    prisma.gameVote.count({ where: { cardId, fair: true } }),
  ])

  return { totalVotes, fairVotes, userVotedFair: fair }
}

/**
 * Fetches a card by ID with its reference data.
 *
 * @param id - Card UUID
 * @returns Card reference data or null
 */
export async function getCardById(id: string) {
  return prisma.gameCard.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      module: true,
      refId: true,
      refMeta: true,
    },
  })
}

/**
 * Ensures game cards exist for a given entity, creating them if missing.
 *
 * Called as fire-and-forget from profile pages so that cards are generated
 * organically as users browse the platform — no manual seeding needed.
 *
 * Cost per call:
 * - If cards already exist: one cheap `count` query, returns immediately
 * - If cards are missing: one `count` + one or two `create` calls (no external API)
 *
 * Card types created for the "camara" module:
 * - expense_total: total CEAP expenses for the current year
 * - expense_category: expenses in a random category (added variety)
 *
 * @param module - Branch identifier (e.g. "camara")
 * @param refId  - Entity ID in the source API (e.g. deputy ID "204554")
 */
export async function ensureGameCards(module: string, refId: string) {
  const existing = await prisma.gameCard.count({
    where: { module, refId },
  })

  // Cards already exist — nothing to do
  if (existing > 0) return

  const year = new Date().getFullYear()
  const types = ["expense_total", "expense_category"]

  for (const type of types) {
    try {
      await prisma.gameCard.create({
        data: {
          type,
          module,
          refId,
          refMeta: JSON.parse(JSON.stringify({ year })),
        },
      })
    } catch {
      // Unique constraint violation from a concurrent request — safe to ignore
    }
  }
}

/**
 * Fetches aggregated vote stats for a specific entity across all its cards.
 *
 * Combines votes from all card types (expense_total, expense_category, etc.)
 * for the given module + refId pair. Used on profile pages to show the
 * official's overall "Acha Justo?" score.
 *
 * @param module - Branch identifier (e.g. "camara")
 * @param refId  - Entity ID in the source API (e.g. deputy ID "204554")
 * @returns Vote stats or null if no cards exist for this entity
 */
export async function getEntityVoteStats(module: string, refId: string) {
  const cards = await prisma.gameCard.findMany({
    where: { module, refId },
    include: {
      _count: { select: { votes: true } },
      votes: { select: { fair: true } },
    },
  })

  if (cards.length === 0) return null

  let totalVotes = 0
  let fairVotes = 0
  for (const card of cards) {
    totalVotes += card._count.votes
    fairVotes += card.votes.filter((v) => v.fair).length
  }

  if (totalVotes === 0) return null

  return {
    totalVotes,
    fairVotes,
    fairPercent: Math.round((fairVotes / totalVotes) * 100),
    cardCount: cards.length,
  }
}

/**
 * Fetches aggregated vote statistics per entity for the scoreboard.
 *
 * Groups all cards by module + refId so that each official appears once
 * with their total votes across all card types (expense_total, expense_category, etc.).
 *
 * The caller is responsible for fetching reveal data (names, photos) via
 * the card-content module — the first card's reference is returned for that.
 *
 * When limit is provided, returns top N entries sorted by most disapproved.
 * When limit is 0, returns all entries with at least 1 vote (for full page).
 *
 * @param limit - Number of entries to return (default 8, 0 = all)
 * @returns Array of aggregated entity entries with vote statistics
 */
export async function getScoreboardCards(limit = 8) {
  const cards = await prisma.gameCard.findMany({
    include: {
      _count: { select: { votes: true } },
      votes: { select: { fair: true } },
    },
  })

  // Aggregate votes by entity (module + refId)
  const entityMap = new Map<string, {
    id: string
    type: string
    module: string
    refId: string
    refMeta: Record<string, unknown>
    totalVotes: number
    fairVotes: number
  }>()

  for (const card of cards) {
    const key = `${card.module}:${card.refId}`
    const existing = entityMap.get(key)
    const total = card._count.votes
    const fair = card.votes.filter((v) => v.fair).length

    if (existing) {
      existing.totalVotes += total
      existing.fairVotes += fair
    } else {
      entityMap.set(key, {
        id: card.id,
        type: card.type,
        module: card.module,
        refId: card.refId,
        refMeta: card.refMeta as Record<string, unknown>,
        totalVotes: total,
        fairVotes: fair,
      })
    }
  }

  const scored = Array.from(entityMap.values())
    .filter((e) => e.totalVotes >= 1)
    .map((e) => ({
      id: e.id,
      type: e.type,
      module: e.module,
      refId: e.refId,
      refMeta: e.refMeta,
      totalVotes: e.totalVotes,
      fairPercent: Math.round((e.fairVotes / e.totalVotes) * 100),
    }))
    .sort((a, b) => a.fairPercent - b.fairPercent)

  return limit > 0 ? scored.slice(0, limit) : scored
}
