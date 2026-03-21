/**
 * @file page.tsx
 * @description "Fair or not?" (Acha Justo?) game page.
 *
 * The full game experience where users judge anonymous data points about
 * public officials. After voting, the official's identity is revealed
 * along with how other users voted.
 *
 * Layout:
 * - Top: hero header with game description
 * - Left column: the interactive game card
 * - Right column: live scoreboard with split vote bars
 *
 * The scoreboard refreshes automatically after each vote via the
 * onVoted callback → scoreboardRef.refresh() pattern.
 */

import { JogoClient } from "./JogoClient"

export default function JogoPage() {
  return <JogoClient />
}
