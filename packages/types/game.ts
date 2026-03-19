/**
 * @file game.ts
 * @description Shared TypeScript types for the "Fair or not?" (Acha Justo?) game.
 *
 * The game covers multiple categories of public data — not just expenses.
 * Each category presents a different kind of fact about a public official
 * for the user to judge anonymously before the reveal.
 *
 * Categories:
 * - `expense`            — CEAP parliamentary expenses (airfare, office, ads, etc.)
 * - `absence`            — number of absences from plenary sessions
 * - `attendance`         — attendance rate in plenary sessions
 * - `bills_per_tenure`   — bills authored relative to time in office
 * - `total_compensation` — base salary + all extras (all branches, incl. judiciary)
 * - `staff_count`        — number of aides/advisors employed
 * - `campaign_donations` — total donations received for campaign financing
 * - `wealth_growth`      — patrimony increase between consecutive elections
 */

/**
 * All card categories supported by the game.
 *
 * Each category maps to a different data source and display format.
 * The GameCard component adapts its question framing based on this type.
 */
export type GameCardType =
  | "expense"
  | "absence"
  | "attendance"
  | "bills_per_tenure"
  | "total_compensation"
  | "staff_count"
  | "campaign_donations"
  | "wealth_growth"

/**
 * Human-readable labels for each card category (Brazilian Portuguese).
 * Used in the UI to display the category tag on game cards.
 */
export const GAME_CARD_TYPE_LABELS: Record<GameCardType, string> = {
  expense: "Despesa",
  absence: "Faltas",
  attendance: "Presença",
  bills_per_tenure: "Projetos de lei",
  total_compensation: "Remuneração total",
  staff_count: "Assessores",
  campaign_donations: "Doações de campanha",
  wealth_growth: "Evolução patrimonial",
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
 * Minimal snapshot stored in GameCard.payload for display and rankings.
 *
 * This type is intentionally generic to support all card categories.
 * The `value` field holds the primary metric (monetary amount, count,
 * percentage, etc.), and `context` provides the framing text that
 * makes the number meaningful without revealing the official's identity.
 */
export interface GameCardPayload {
  /** Name of the public official (revealed only after voting). */
  name: string
  /** Political party abbreviation (e.g., "PT", "PL", "PSDB"). */
  party: string
  /** Brazilian state abbreviation (e.g., "SP", "RJ", "MG"). */
  state: string
  /** Branch/institution this data point comes from. */
  branch: GameBranch
  /** The primary numeric value for this card (raw, unformatted). */
  value: number
  /**
   * Contextual description that frames the value without revealing identity.
   * Examples:
   * - "Passagens aéreas — Mar/2024"
   * - "Faltou a 42 de 120 sessões em 2024"
   * - "3 projetos em 8 anos de mandato"
   * - "Salário base + gratificações + extras"
   * - "Patrimônio declarado cresceu 340% entre 2018 e 2022"
   */
  context: string
  /** URL to the official's photo (revealed only after voting). */
  photoUrl: string
  /** URL to the official government source for this data point. */
  sourceUrl: string
}
