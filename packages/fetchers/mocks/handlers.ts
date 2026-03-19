/**
 * @file handlers.ts
 * @description MSW (Mock Service Worker) request handlers for all external
 * government APIs consumed by Imposterio.
 *
 * Every external API endpoint used across the fetchers package must have
 * a corresponding handler here. Tests never call real APIs — all external
 * calls are intercepted by MSW using these handlers.
 *
 * Add one handler per external endpoint. Group handlers by data source
 * (Camara, Senado, Transparencia, TSE, CNJ, CNPJ).
 */

import type { RequestHandler } from "msw"

export const handlers: RequestHandler[] = [
  // Handlers will be added here as fetchers are implemented.
  // Each fetcher file (camara.ts, senado.ts, etc.) should have
  // corresponding mock handlers registered in this array.
]
