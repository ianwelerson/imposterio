/**
 * @file ttl.ts
 * @description Cache TTL (time-to-live) values for each data type in Redis.
 *
 * All values are in seconds. These constants are passed as the `ttl` parameter
 * to `cachedFetch()` in `lib/cache.ts`.
 *
 * TTL values are calibrated per data source based on how frequently the
 * underlying data changes:
 * - Lists of officials (deputies, senators): 24h — membership rarely changes mid-term
 * - Expenses and votes: 3–6h — updated throughout legislative sessions
 * - Company data: 7d — corporate registrations change infrequently
 * - Blacklists: 7d — updated infrequently by oversight bodies
 * - Home rankings: 2h — aggregated from game votes, which update continuously
 */

export const TTL = {
  // ── Camara dos Deputados ────────────────────────────────────────────
  /** List of all deputies currently serving — 24h */
  CAMARA_DEPUTIES_LIST: 60 * 60 * 24,
  /** Individual deputy profile details — 24h */
  CAMARA_DEPUTY_DETAIL: 60 * 60 * 24,
  /** Deputy CEAP expenses — 6h (updated during sessions) */
  CAMARA_DEPUTY_EXPENSES: 60 * 60 * 6,
  /** Deputy voting history — 3h (updated during sessions) */
  CAMARA_DEPUTY_VOTES: 60 * 60 * 3,
  /** Deputy speeches — 12h (occasional floor speeches) */
  CAMARA_DEPUTY_SPEECHES: 60 * 60 * 12,
  /** Deputy events (sessions, hearings) — 3h (changes during session days) */
  CAMARA_DEPUTY_EVENTS: 60 * 60 * 3,
  /** Deputy status history — 24h (rare changes) */
  CAMARA_DEPUTY_HISTORY: 60 * 60 * 24,
  /** Deputy previous mandates — 30d (sourced from TSE, static) */
  CAMARA_DEPUTY_MANDATES: 60 * 60 * 24 * 30,
  /** Deputy professions — 30d (rarely updated) */
  CAMARA_DEPUTY_PROFESSIONS: 60 * 60 * 24 * 30,
  /** Individual event detail — 6h */
  CAMARA_EVENT_DETAIL: 60 * 60 * 6,
  /** Deputy attendance from yearly bulk file — 6h */
  CAMARA_DEPUTY_ATTENDANCE: 60 * 60 * 6,
  /** Chamber staff/aides list — 24h */
  CAMARA_STAFF: 60 * 60 * 24,
  /** Bulk attendance for past years — 30d (historical, effectively static) */
  CAMARA_ATTENDANCE_HISTORY: 60 * 60 * 24 * 30,
  /** Procurement bulk data for current year — 24h (updated daily) */
  CAMARA_PROCUREMENT_BULK: 60 * 60 * 24,
  /** Procurement bulk data for past years — 30d (historical, static) */
  CAMARA_PROCUREMENT_BULK_HISTORY: 60 * 60 * 24 * 30,
  /** Bulk events file — 6h for current year */
  CAMARA_EVENTS_BULK: 60 * 60 * 6,
  /** Bulk events for past years — 30d (historical) */
  CAMARA_EVENTS_BULK_HISTORY: 60 * 60 * 24 * 30,
  /** Propositions list (filtered by year/type) — 3h (updated during sessions) */
  CAMARA_PROPOSITIONS: 60 * 60 * 3,
  /** Individual proposition detail — 6h */
  CAMARA_PROPOSITION_DETAIL: 60 * 60 * 6,
  /** Proposition authors — 24h (rarely changes after submission) */
  CAMARA_PROPOSITION_AUTHORS: 60 * 60 * 24,
  /** Proposition themes — 24h (rarely changes) */
  CAMARA_PROPOSITION_THEMES: 60 * 60 * 24,
  /** Proposition legislative progress (tramitações) — 3h */
  CAMARA_PROPOSITION_PROGRESS: 60 * 60 * 3,
  /** Voting sessions list — 3h (updated during sessions) */
  CAMARA_VOTING_SESSIONS: 60 * 60 * 3,
  /** Individual voting session detail — 6h */
  CAMARA_VOTING_SESSION_DETAIL: 60 * 60 * 6,
  /** Individual votes in a session — 12h (final after session ends) */
  CAMARA_VOTING_SESSION_VOTES: 60 * 60 * 12,
  /** Party orientations for a vote — 12h (final after session ends) */
  CAMARA_VOTING_SESSION_ORIENTATIONS: 60 * 60 * 12,
  /** Deputy propositions (authored bills) — 1h (updated during sessions) */
  CAMARA_DEPUTY_PROPOSITIONS: 60 * 60,
  /** Deputy occupations (professional background) — 24h (rarely changes) */
  CAMARA_DEPUTY_OCCUPATIONS: 60 * 60 * 24,
  /** Deputy leadership history — 24h (changes infrequently) */
  CAMARA_DEPUTY_LEADER_HISTORY: 60 * 60 * 24,
  /** Deputy Câmara mandates (elected terms) — 1h (updated during legislature) */
  CAMARA_DEPUTY_CAMARA_MANDATES: 60 * 60,
  /** Parliamentary caucus (frente) detail — 24h (stable membership) */
  CAMARA_FRENTE_DETAIL: 60 * 60 * 24,

  // ── Senado Federal ──────────────────────────────────────────────────
  /** List of all senators currently serving — 24h */
  SENADO_SENATORS_LIST: 60 * 60 * 24,
  /** Individual senator profile details — 24h */
  SENADO_SENATOR_DETAIL: 60 * 60 * 24,
  /** Senator voting history — 3h (updated during sessions) */
  SENADO_SENATOR_VOTES: 60 * 60 * 3,
  /** Senator authored bills — 12h */
  SENADO_SENATOR_BILLS: 60 * 60 * 12,

  // ── Portal da Transparencia ─────────────────────────────────────────
  /** Federal executive civil servants — 24h */
  TRANSP_CIVIL_SERVANTS: 60 * 60 * 24,
  /** Federal contracts — 12h */
  TRANSP_CONTRACTS: 60 * 60 * 12,
  /** Public procurement bids — 12h */
  TRANSP_BIDS: 60 * 60 * 12,
  /** Parliamentary earmarks — 24h */
  TRANSP_EARMARKS: 60 * 60 * 24,
  /** Blacklisted companies (CEIS) — 7d (rarely changes) */
  TRANSP_BLACKLIST: 60 * 60 * 24 * 7,
  /** Sanctioned companies (CNEP) — 7d (rarely changes) */
  TRANSP_PUNISHED: 60 * 60 * 24 * 7,
  /** Individual servant compensation detail — 24h */
  TRANSP_SERVANT_COMPENSATION: 60 * 60 * 24,
  /** Official government travel — 24h */
  TRANSP_TRAVEL: 60 * 60 * 24,
  /** Government payment card spending — 12h */
  TRANSP_PAYMENT_CARDS: 60 * 60 * 12,
  /** Inter-governmental agreements (convênios) — 24h */
  TRANSP_AGREEMENTS: 60 * 60 * 24,

  // ── Political parties ───────────────────────────────────────────────
  /** List of all parties from Camara API — 24h */
  PARTIES_LIST: 60 * 60 * 24,
  /** Individual party detail + members — 24h */
  PARTY_DETAIL: 60 * 60 * 24,
  /** Party fund distribution (Fundo Partidario) — 7d (monthly updates) */
  PARTY_FUND: 60 * 60 * 24 * 7,
  /** Electoral results by party — 30d (changes only after elections) */
  PARTY_ELECTION_RESULTS: 60 * 60 * 24 * 30,

  // ── Companies ───────────────────────────────────────────────────────
  /** Individual CNPJ lookup — 7d (corporate data changes infrequently) */
  CNPJ_DETAIL: 60 * 60 * 24 * 7,

  // ── States (fiscal data) ────────────────────────────────────────────
  /** State fiscal overview (all 27 UFs) — 24h */
  STATES_FISCAL_OVERVIEW: 60 * 60 * 24,
  /** Individual state detail (fiscal + governor) — 24h */
  STATE_DETAIL: 60 * 60 * 24,
  /** SICONFI RREO (revenue execution reports) — 7d (bimestral source) */
  SICONFI_RREO: 60 * 60 * 24 * 7,
  /** SICONFI RGF (fiscal management reports) — 7d (quadrimestral source) */
  SICONFI_RGF: 60 * 60 * 24 * 7,
  /** IBGE population estimates — 30d (annual source) */
  IBGE_POPULATION: 60 * 60 * 24 * 30,
  /** IBGE GDP by state — 30d (annual with ~2yr lag) */
  IBGE_GDP: 60 * 60 * 24 * 30,
  /** CAPAG capacity-to-pay ratings — 30d (annual ratings) */
  CAPAG_RATINGS: 60 * 60 * 24 * 30,

  // ── Judiciary (CNJ / DataJud) ─────────────────────────────────────
  /** DataJud case counts by type/court — 6h (cases update continuously) */
  DATAJUD_CASES: 60 * 60 * 6,
  /** DataJud cases per magistrate — 3h (active workload) */
  DATAJUD_MAGISTRATE_CASES: 60 * 60 * 3,
  /** DataJud historical case trends — 24h (stable historical data) */
  DATAJUD_CASE_TREND: 60 * 60 * 24,
  /** Judge compensation from court portals — 7d (monthly publication) */
  JUDGE_COMPENSATION: 60 * 60 * 24 * 7,

  // ── Tax counter (Impostômetro) ──────────────────────────────────────
  /** Interpolated annual tax estimate — 24h (recalculated daily) */
  TAX_COUNTER_ESTIMATE: 60 * 60 * 24,
  /** SICONFI state/municipal fiscal data — 7d (bimestral source) */
  SICONFI_REVENUE: 60 * 60 * 24 * 7,

  // ── Home dashboard ──────────────────────────────────────────────────
  /** Aggregated game rankings for the homepage — 2h */
  HOME_RANKINGS: 60 * 60 * 2,
} as const
