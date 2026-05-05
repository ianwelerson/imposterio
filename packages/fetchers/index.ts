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
  getDeputadoProposicoes,
  getDeputadoProposicoesByYear,
  getDeputadoOcupacoes,
  getDeputadoMandatos,
  getFrenteDetail,
  getCeapBulkSummary,
  type AttendanceBulkSummary,
  type CeapBulkSummary,
  type CeapBulkDeputy,
  type DeputyAttendanceSummary,
  type DeputyAttendanceEvent,
  type EventAttendee,
} from "./camara"

export {
  getSenatorsList,
  getSenatorDetail,
  getSenatorMandates,
  getSenatorAffiliations,
  getSenatorVotingHistory,
  getSenatorPropositions,
  getSenadoPropositions,
  getSenadoPropositionDetail,
  getSenadoPropositionRapporteurship,
  getSenadoPropositionDocuments,
  getSenadoPropositionAmendments,
  getSenadoVotingSessions,
  getSenadoVotingSessionDetail,
  getSenatorSpeeches,
  getSenatorCommittees,
  getSenatorPositions,
  getSenatorLeaderships,
  getSenatorExpenses,
  getCeapsBulkSummary,
  getPlenaryResultMonth,
  getSenatorAttendanceBulk,
  getSenatorAttendanceDetail,
  getSenadoContractsBulk,
  getSenadoBids,
  getSenadoContractors,
  getSenadoServantsBulk,
  getSenadoServantsRemuneration,
  ensureArray,
} from "./senado"
