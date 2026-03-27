/**
 * @file voting-alignment.ts
 * @description Computes a deputy's voting alignment with their own party and
 * with the winning side of each vote.
 *
 * For party alignment: fetches individual votes per session to determine the
 * party's majority position, then checks if the deputy voted with or against it.
 *
 * For winning-side alignment: uses the session's `approved` field.
 *
 * This module performs API calls via the cached fetcher to retrieve per-session
 * votes. All fetched data includes `_source`.
 */

import { getVotingSessionVotes } from "@imposterio/fetchers/camara"
import type { DeputyVotingRecord } from "@imposterio/types"
import { safePercent } from "@/lib/calc"

// ── Types ───────────────────────────────────────────────────────────

/** A vote where the deputy diverged from the party majority position. */
export interface DivergentVote {
  /** Voting session ID. */
  sessionId: string
  /** ISO date of the session. */
  date: string
  /** Description of the vote. */
  description: string
  /** How the deputy voted. */
  deputyVote: string
  /** The party majority position for this session. */
  partyMajority: string
  /** Source URL for the session votes. */
  _source: string
}

/** Full voting alignment analysis result. */
export interface VotingAlignmentResult {
  /** Percentage of votes aligned with the deputy's party majority (0–100). */
  partyAlignmentPercent: number
  /** Percentage of votes aligned with the winning side (0–100). */
  winningSidePercent: number
  /** Total number of votes analyzed. */
  totalVotes: number
  /** Votes where the party majority could be determined. */
  votesWithPartyData: number
  /** Votes where the deputy diverged from their party. */
  divergentVotes: DivergentVote[]
}

// ── Analysis ────────────────────────────────────────────────────────

/**
 * Determines the majority vote position for a given party from individual votes.
 *
 * Counts "Sim" and "Não" votes from deputies in the same party. If one side
 * has more votes, that is the majority. "Abstenção" and "Obstrução" are not
 * counted toward the majority — they are treated as non-positioned.
 *
 * @param votes - All individual votes for the session
 * @param party - Party abbreviation to filter by
 * @returns The majority vote ("Sim" or "Não"), or null if tied/insufficient data
 */
function getPartyMajority(
  votes: Array<{ party: string; vote: string }>,
  party: string,
): string | null {
  let sim = 0
  let nao = 0

  for (const v of votes) {
    if (v.party !== party) continue
    if (v.vote === "Sim") sim++
    else if (v.vote === "Não") nao++
  }

  if (sim === 0 && nao === 0) return null
  if (sim > nao) return "Sim"
  if (nao > sim) return "Não"
  return null // tied
}

/**
 * Analyzes a deputy's voting alignment with their party and the winning side.
 *
 * For each voting session in the deputy's record, fetches the full vote list
 * (cached, 1h TTL) and determines the party's majority position. Then computes:
 * - Party alignment: % of votes matching the party majority
 * - Winning-side alignment: % of votes matching the session outcome
 * - Divergent votes: specific instances where the deputy broke from the party
 *
 * @param votes - Deputy's voting record (from `getDeputyVotingHistory`)
 * @param party - Deputy's current party abbreviation
 * @param maxSessions - Maximum sessions to analyze (default 50, to limit API calls)
 * @returns Alignment analysis with divergent vote details
 *
 * @example
 * ```typescript
 * const alignment = await analyzeVotingAlignment(votes, "PT")
 * console.log(alignment.partyAlignmentPercent) // 87
 * console.log(alignment.divergentVotes.length) // 5
 * ```
 */
export async function analyzeVotingAlignment(
  votes: DeputyVotingRecord[],
  party: string,
  maxSessions = 50,
): Promise<VotingAlignmentResult> {
  const cappedVotes = votes.slice(0, maxSessions)

  let partyAligned = 0
  let winningSideAligned = 0
  let votesWithPartyData = 0
  const divergentVotes: DivergentVote[] = []

  // Fetch session votes in batches of 10 to avoid overwhelming the API
  const BATCH_SIZE = 10

  for (let i = 0; i < cappedVotes.length; i += BATCH_SIZE) {
    const batch = cappedVotes.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map((v) =>
        getVotingSessionVotes(v.sessionId).catch(() => []),
      ),
    )

    for (let j = 0; j < batch.length; j++) {
      const record = batch[j]
      const sessionVotes = batchResults[j]

      // Winning-side alignment
      if (record.approved !== null) {
        const votedYes = record.vote === "Sim"
        if ((record.approved && votedYes) || (!record.approved && !votedYes)) {
          winningSideAligned++
        }
      }

      // Party alignment
      if (Array.isArray(sessionVotes) && sessionVotes.length > 0) {
        const majority = getPartyMajority(sessionVotes, party)
        if (majority !== null) {
          votesWithPartyData++
          if (record.vote === majority) {
            partyAligned++
          } else {
            const source = "_source" in sessionVotes
              ? (sessionVotes as unknown as { _source: string })._source
              : ""

            divergentVotes.push({
              sessionId: record.sessionId,
              date: record.date,
              description: record.description,
              deputyVote: record.vote,
              partyMajority: majority,
              _source: source,
            })
          }
        }
      }
    }
  }

  const votesWithOutcome = cappedVotes.filter((v) => v.approved !== null).length

  return {
    partyAlignmentPercent: safePercent(partyAligned, votesWithPartyData),
    winningSidePercent: safePercent(winningSideAligned, votesWithOutcome),
    totalVotes: cappedVotes.length,
    votesWithPartyData,
    divergentVotes,
  }
}
