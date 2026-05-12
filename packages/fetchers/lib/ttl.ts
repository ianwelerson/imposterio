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
  /** Deputy attendance from yearly bulk file — 1h */
  CAMARA_DEPUTY_ATTENDANCE: 60 * 60 * 1,
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
  /** Deputy Câmara mandates (elected terms) — 1h (updated during legislature) */
  CAMARA_DEPUTY_CAMARA_MANDATES: 60 * 60,
  /** Parliamentary caucus (frente) detail — 24h (stable membership) */
  CAMARA_FRENTE_DETAIL: 60 * 60 * 24,
  /** Bulk CEAP expenses for current year — 6h (updated daily) */
  CAMARA_CEAP_BULK: 60 * 60 * 6,
  /** Bulk CEAP expenses for past years — 30d (historical, static) */
  CAMARA_CEAP_BULK_HISTORY: 60 * 60 * 24 * 30,

  // ── Senado Federal — Senators ──────────────────────────────────────
  /** List of all senators currently serving — 24h (81 senators, rarely changes) */
  SENADO_SENATORS_LIST: 60 * 60 * 24,
  /** List of senators currently on leave (afastados) — 6h */
  SENADO_SENATORS_ON_LEAVE: 60 * 60 * 6,
  /** Individual senator profile details — 24h */
  SENADO_SENATOR_DETAIL: 60 * 60 * 24,
  /** Senator mandates (terms) — 30d (historical, effectively static) */
  SENADO_SENATOR_MANDATES: 60 * 60 * 24 * 30,
  /** Senator party affiliations history — 30d (historical) */
  SENADO_SENATOR_AFFILIATIONS: 60 * 60 * 24 * 30,
  /** Senator leadership roles — 12h (changes occasionally) */
  SENADO_SENATOR_LEADERSHIPS: 60 * 60 * 12,
  /** Senator committee memberships — 24h */
  SENADO_SENATOR_COMMITTEES: 60 * 60 * 24,
  /** Senator chair/vice positions — 24h */
  SENADO_SENATOR_POSITIONS: 60 * 60 * 24,
  /** Senator leaves (licenças) — 6h */
  SENADO_SENATOR_LEAVES: 60 * 60 * 6,
  /** Senator academic history — 30d (static biographical) */
  SENADO_SENATOR_ACADEMIC: 60 * 60 * 24 * 30,
  /** Senator declared professions — 30d (rarely updated) */
  SENADO_SENATOR_PROFESSIONS: 60 * 60 * 24 * 30,
  /** Senator floor speeches — 12h */
  SENADO_SENATOR_SPEECHES: 60 * 60 * 12,
  /** Senator interjections (apartes) — 12h */
  SENADO_SENATOR_INTERJECTIONS: 60 * 60 * 12,

  // ── Senado Federal — Voting ────────────────────────────────────────
  /** Voting endpoint — current year — 3h */
  SENADO_VOTING: 60 * 60 * 3,
  /** Voting endpoint — past years — 30d (historical) */
  SENADO_VOTING_HISTORY: 60 * 60 * 24 * 30,
  /** Single voting session detail — 12h (final after session ends) */
  SENADO_VOTING_DETAIL: 60 * 60 * 12,
  /** Bench orientation per voting — 12h */
  SENADO_VOTING_ORIENTATION: 60 * 60 * 12,

  // ── Senado Federal — Propositions (process API) ────────────────────
  /** Process search results — 3h (updated during sessions) */
  SENADO_PROCESS_SEARCH: 60 * 60 * 3,
  /** Single process detail — 6h */
  SENADO_PROCESS_DETAIL: 60 * 60 * 6,
  /** Process authors lookup — 24h (rarely changes after submission) */
  SENADO_PROCESS_AUTHORS: 60 * 60 * 24,

  // ── Senado Federal — Plenary ───────────────────────────────────────
  /** Plenary daily/monthly agenda — 1h (intra-day updates) */
  SENADO_PLENARY_AGENDA: 60 * 60 * 1,
  /** Plenary session results — current year — 6h */
  SENADO_PLENARY_RESULT: 60 * 60 * 6,
  /** Plenary session results — past years — 30d (historical) */
  SENADO_PLENARY_RESULT_HISTORY: 60 * 60 * 24 * 30,
  /** Legislatures list — 30d (changes rarely, every 4 years) */
  SENADO_PLENARY_LEGISLATURES: 60 * 60 * 24 * 30,
  /** Single plenary session detail — 6h */
  SENADO_PLENARY_SESSION_DETAIL: 60 * 60 * 6,
  /** Plenary speeches across senators — 6h */
  SENADO_PLENARY_SPEECHES: 60 * 60 * 6,

  // ── Senado Federal — Committees, parties, blocs, leadership ───────
  /** Committee lists — 24h */
  SENADO_COMMITTEES_LIST: 60 * 60 * 24,
  /** Senado parties list — 24h */
  SENADO_PARTIES: 60 * 60 * 24,
  /** Senado parliamentary blocs — 24h */
  SENADO_BLOCS: 60 * 60 * 24,
  /** Leadership composition — 12h */
  SENADO_LEADERSHIP_COMPOSITION: 60 * 60 * 12,

  // ── Senado Federal — CEAPS (admin API) ─────────────────────────────
  /** CEAPS bulk for current year — 6h (admin API updates daily) */
  SENADO_CEAPS_BULK: 60 * 60 * 6,
  /** CEAPS bulk for past years — 30d (historical, static) */
  SENADO_CEAPS_BULK_HISTORY: 60 * 60 * 24 * 30,
  /** CEAPS LAI CSV (legacy) — 30d (CSV is static) */
  SENADO_CEAPS_LAI: 60 * 60 * 24 * 30,
  /** Senator regional offices — 24h */
  SENADO_OFFICES: 60 * 60 * 24,
  /** Senator housing aid records — 24h */
  SENADO_HOUSING_AID: 60 * 60 * 24,

  // ── Senado Federal — Servants (Phase 4) ────────────────────────────
  /** Servants list & headcount — 24h */
  SENADO_SERVANTS_BULK: 60 * 60 * 24,
  /** Servants remuneration (monthly) — 7d (published monthly) */
  SENADO_SERVANTS_REMUNERATION: 60 * 60 * 24 * 7,

  // ── Senado Federal — Contracts (Phase 8) ───────────────────────────
  /** Contracts list (institutional) — 12h */
  SENADO_CONTRACTS: 60 * 60 * 12,
  /** Single contract amendments/items/payments — 12h */
  SENADO_CONTRACT_DETAIL: 60 * 60 * 12,
  /** Bids (licitações) list — 12h */
  SENADO_BIDS: 60 * 60 * 12,
  /** Contracting companies list — 24h (rarely changes intra-day) */
  SENADO_CONTRACTING_COMPANIES: 60 * 60 * 24,
  /** Purchase orders (notas de empenho) — 6h */
  SENADO_PURCHASE_ORDERS: 60 * 60 * 6,
  /** Outsourced workers list — 24h */
  SENADO_OUTSOURCED_WORKERS: 60 * 60 * 24,

  // ── Senado Federal — Attendance (composed) ─────────────────────────
  /** Composed attendance bulk — current year — 1h (recomposed from monthly results) */
  SENADO_ATTENDANCE_BULK: 60 * 60 * 1,
  /** Composed attendance bulk — past years — 30d (historical) */
  SENADO_ATTENDANCE_BULK_HISTORY: 60 * 60 * 24 * 30,

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
  /**
   * TSE campaign donations (per CNPJ, per year) — 30d.
   *
   * The underlying datasets are immutable after election certification, so a
   * 30-day TTL is plenty: we burn one cache miss per CNPJ per month at most.
   * This also keeps pressure on the TSE CKAN endpoint low — it's a public
   * service hosted on a relatively constrained portal.
   */
  TSE_CAMPAIGN_DONATIONS: 60 * 60 * 24 * 30,

  // ── Companies (OpenCNPJ) ────────────────────────────────────────────
  /**
   * Individual CNPJ lookup — 30d.
   *
   * OpenCNPJ refreshes from the Federal Revenue monthly bulk, so a 30-day
   * TTL aligns with the upstream cadence: even a perfectly fresh fetch can
   * be at most ~30 days behind the official register.
   */
  CNPJ_DETAIL: 60 * 60 * 24 * 30,
  /**
   * Negative cache for CNPJs that returned 404 from OpenCNPJ — 1h.
   *
   * Short TTL throttles repeated misses (e.g. typo'd CNPJ in a URL) without
   * permanently hiding a CNPJ that may have been added to the bulk shortly
   * after we first asked. Stored under a separate key (`cnpj:404:{cnpj}`)
   * so it never collides with a successful detail entry.
   */
  CNPJ_NOT_FOUND: 60 * 60,

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
