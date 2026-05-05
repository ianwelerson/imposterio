/**
 * @file senado.ts
 * @description Typed constants for Senado Federal compensation and CEAPS data.
 *
 * The Senado Federal does not publish these values via a JSON API — they are
 * defined by Senate decree (Ato da Comissão Diretora) and only available as
 * PDFs on the institutional transparency portal. We hardcode them here and
 * annotate every entry with its `_source` URL so the UI can link out to the
 * official document.
 *
 * **Maintenance:** these values change annually (typically each January).
 * Verify against the live source URLs before each new fiscal year.
 *
 * All monetary values are in BRL (Brazilian Real).
 */

// ── Senator salary (subsídio) ───────────────────────────────────────

/**
 * Monthly gross salary (subsídio) of a Federal Senator, in BRL.
 *
 * Set by Resolução do Senado Federal. Constitutionally fixed at parity with
 * Federal Deputies and other Congress members. The same value applies to
 * all 81 senators regardless of UF, party, or seniority.
 *
 * @see {@link SENADOR_SALARIO_SOURCE}
 */
export const SENADOR_SALARIO = 46_366.19

/** Source URL for {@link SENADOR_SALARIO} — Senado RH transparency page. */
export const SENADOR_SALARIO_SOURCE =
  "https://www12.senado.leg.br/transparencia/rh/segp/estrutura-remuneratoria"

// ── CEAPS — monthly cap by UF ────────────────────────────────────────

/**
 * Monthly CEAPS (Cota para o Exercício da Atividade Parlamentar dos Senadores)
 * cap per senator, indexed by elected UF.
 *
 * Unlike the Câmara CEAP — which uses a single nationwide cap — the Senado
 * CEAPS varies by state to reflect travel costs from the senator's UF to
 * Brasília. Distant or remote UFs (AC, AM, RR) receive higher caps than
 * nearby ones (DF, GO).
 *
 * Values are taken from the Ato da Comissão Diretora and may change annually
 * (typically each January) to track inflation. Verify before each new
 * fiscal year.
 *
 * @see {@link SENADO_CEAPS_CAPS_SOURCE}
 */
export const SENADO_CEAPS_MONTHLY_CAPS_BY_UF: Record<string, number> = {
  AC: 44_276.39,
  AL: 31_148.34,
  AM: 44_632.46,
  AP: 41_244.12,
  BA: 32_949.41,
  CE: 33_879.36,
  DF: 25_322.27,
  ES: 28_789.51,
  GO: 27_576.16,
  MA: 35_065.79,
  MG: 28_874.69,
  MS: 32_758.85,
  MT: 32_894.50,
  PA: 38_528.76,
  PB: 32_416.28,
  PE: 32_898.78,
  PI: 33_618.08,
  PR: 30_788.66,
  RJ: 28_984.41,
  RN: 32_817.05,
  RO: 41_062.59,
  RR: 44_534.06,
  RS: 32_843.41,
  SC: 30_511.22,
  SE: 31_851.71,
  SP: 30_309.69,
  TO: 35_265.55,
} as const

/** Source URL for {@link SENADO_CEAPS_MONTHLY_CAPS_BY_UF} — Senate transparency portal. */
export const SENADO_CEAPS_CAPS_SOURCE =
  "https://www12.senado.leg.br/transparencia/sen/ceaps"
