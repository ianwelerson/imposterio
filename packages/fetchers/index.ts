/**
 * @file index.ts
 * @description Public API for the fetchers package.
 *
 * Re-exports all fetcher functions and the cachedFetch utility.
 * Individual fetcher modules (camara.ts, senado.ts, etc.) will be
 * re-exported here as they are implemented.
 */

export { cachedFetch, ApiError, redis } from "./lib/cache"
export { ENDPOINTS } from "./lib/endpoints"
export { TTL } from "./lib/ttl"

// ── Fetchers ─────────────────────────────────────────────────────────
export {
  getDeputiesList, getDeputyDetail, getDeputyExpenses,
  getDeputyCommittees, getDeputyCaucuses,
  getDeputySpeeches, getDeputyEvents, getEventDetail,
  getDeputyPreviousMandates, getDeputyHistory, getDeputyProfessions,
  getPropositions, getPropositionDetail, getPropositionAuthors,
  getPropositionThemes, getPropositionProgress,
  getVotingSessions, getVotingSessionDetail,
  getVotingSessionVotes, getVotingSessionOrientations,
  getDeputyVotingHistory,
  getDeputyAttendanceBulk,
  getDeputyAttendanceDetail,
  getStaffBulk,
  getDeputyStaffCount,
  getProcurementBulk,
  getProcurementDetail,
  getEventAttendees,
  type AttendanceBulkSummary,
  type DeputyAttendanceSummary,
  type DeputyAttendanceEvent,
  type EventAttendee,
} from "./camara"
