/**
 * @file game.ts
 * @description Shared TypeScript types for the "Fair or not?" (Acha Justo?) game.
 *
 * The game covers multiple categories of public data — not just expenses.
 * Each category presents a different kind of fact about a public official
 * for the user to judge anonymously before the reveal.
 *
 * Card types determine how the question is dynamically built from fresh API
 * data. The database stores only references (entity ID + metadata), and
 * the question text is constructed at read time so values stay up-to-date.
 *
 * Current types:
 * - `expense_total`    — total CEAP parliamentary expenses for a year
 * - `expense_category` — expenses in a specific CEAP category for a year
 *
 * Future types:
 * - `attendance`         — attendance rate in plenary sessions
 * - `total_compensation` — base salary + all extras
 * - `bills_per_tenure`   — bills authored relative to time in office
 * - `staff_count`        — number of aides/advisors employed
 * - `campaign_donations` — total donations received for campaign financing
 * - `wealth_growth`      — patrimony increase between consecutive elections
 */

/**
 * All card types supported by the game.
 * Each type maps to a specific data fetching + question building strategy.
 */
export type GameCardType =
  | "expense_total"
  | "expense_category"

/**
 * Human-readable labels for each card type (Brazilian Portuguese).
 * Used in the UI to display the category tag on game cards.
 */
export const GAME_CARD_TYPE_LABELS: Record<GameCardType, string> = {
  expense_total: "Despesa total",
  expense_category: "Despesa por categoria",
}

/**
 * Branch of government or institution type.
 * Used to tag game cards so users know which part of the public sector
 * the data point comes from.
 */
export type GameBranch =
  | "camara"
  | "senado"
  | "executivo"
  | "judiciario"
  | "tse"

/**
 * Human-readable labels for each branch (Brazilian Portuguese).
 * Used in the UI to display the branch tag on game cards.
 */
export const GAME_BRANCH_LABELS: Record<GameBranch, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
  executivo: "Executivo Federal",
  judiciario: "Judiciário",
  tse: "Justiça Eleitoral",
}

/**
 * Metadata stored in GameCard.refMeta — varies by card type.
 */
export interface ExpenseTotalMeta {
  year: number
}

export interface ExpenseCategoryMeta {
  year: number
  category: string
}

export type GameCardMeta = ExpenseTotalMeta | ExpenseCategoryMeta

/**
 * Shape of the card data returned by `GET /api/game/card`.
 * The question is built dynamically from fresh API data — not stored in DB.
 */
export interface GameCardResponse {
  /** Database ID of the card (sent back when voting). */
  id: string
  /** Card type (expense_total, expense_category, etc.). */
  type: GameCardType
  /** Government branch/module (camara, senado, etc.). */
  module: GameBranch
  /** The question text, dynamically built from fresh data. */
  question: string
}

/**
 * Shape of the reveal data returned by `POST /api/game/vote`.
 * Sent after the user votes — reveals the official's identity and vote stats.
 */
export interface GameVoteResponse {
  /** The official's name. */
  name: string
  /** Political party abbreviation. */
  party: string
  /** Brazilian state abbreviation. */
  state: string
  /** URL to the official's photo. */
  photoUrl: string
  /** URL to the official government source for this data point. */
  sourceUrl: string
  /** Total votes cast on this card. */
  totalVotes: number
  /** Number of "fair" votes. */
  fairVotes: number
  /** Whether this specific user voted "fair". */
  userVotedFair: boolean
}

/**
 * Shape of a scoreboard entry returned by `GET /api/game/scoreboard`.
 */
export interface ScoreboardEntry {
  id: string
  name: string
  party: string
  state: string
  photoUrl: string
  totalVotes: number
  fairPercent: number
}
