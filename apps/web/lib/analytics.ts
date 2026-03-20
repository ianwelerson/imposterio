/**
 * @file analytics.ts
 * @description Typed wrapper around the Umami Cloud analytics SDK.
 *
 * Umami is loaded via a `<Script>` tag in `app/layout.tsx` and exposes
 * `window.umami.track()` globally. This module provides a type-safe
 * `track()` function that silently no-ops when Umami is not loaded
 * (e.g. during SSR, in dev without the env var, or when blocked by
 * ad-blockers).
 *
 * Event naming convention: snake_case, verb-first (e.g. `click_source_link`).
 */

/** All custom event names and their expected payloads. */
export interface AnalyticsEvents {
  /** User clicked a SourcePill to verify data at the official government API. */
  click_source_link: { url: string }

  /** User typed a search query in a listing page. */
  search: { query: string; results: number }

  /** User applied a dropdown filter in a listing page. */
  filter: { name: string; value: string }

  /** User changed the reference year via the YearSelector. */
  change_year: { year: string; page: string }

  /** User voted on a game card in "Acha Justo?". */
  game_vote: { fair: boolean; category: string; branch: string }

  /** User added a deputy to the comparison page. */
  comparison_add: { deputy_id: string }

  /** User removed a deputy from the comparison page. */
  comparison_remove: { deputy_id: string }

  /** User changed the year on the comparison page. */
  comparison_year: { year: string }

  /** User clicked a deputy profile link from the comparison table. */
  comparison_view_profile: { deputy_id: string }

  /** User opened the mobile sidebar menu. */
  open_mobile_menu: Record<string, never>

  /** User clicked a navigation item in the sidebar. */
  navigate: { href: string; label: string }

  /** User clicked the "Comparar" button on a deputy detail page. */
  click_compare: { deputy_id: string }

  /** User expanded a table row to see more details. */
  expand_row: { id: string; table: string }

  /** User clicked the GitHub repository link on the about page. */
  click_github: Record<string, never>
}

/** Umami global object shape (subset used by this module). */
interface UmamiGlobal {
  track: (event: string, data?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    umami?: UmamiGlobal
  }
}

/**
 * Sends a custom analytics event to Umami.
 *
 * Silently no-ops when Umami is not available (SSR, missing env var,
 * ad-blocker). Safe to call anywhere — never throws.
 *
 * @param event - Event name (snake_case)
 * @param data  - Optional payload (flat key-value pairs)
 */
export function track<E extends keyof AnalyticsEvents>(
  event: E,
  ...args: AnalyticsEvents[E] extends Record<string, never>
    ? []
    : [data: AnalyticsEvents[E]]
): void {
  try {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(event, args[0] as Record<string, unknown> | undefined)
    }
  } catch {
    // Silently ignore — analytics should never break the app
  }
}
