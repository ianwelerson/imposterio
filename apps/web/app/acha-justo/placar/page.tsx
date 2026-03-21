/**
 * @file page.tsx
 * @description Full scoreboard listing page for the "Acha Justo?" game.
 *
 * Displays all cards that have received votes, with search, party/state
 * filters, and a sort selector (most disapproved, most approved, most voted).
 *
 * Follows the established listing page pattern:
 * - Server page fetches nothing (data is client-side from API)
 * - Client component handles search, filter, sort, and pagination
 *
 * @route /acha-justo/placar
 */

import { PlacarList } from "./PlacarList"

export default function PlacarPage() {
  return <PlacarList />
}
