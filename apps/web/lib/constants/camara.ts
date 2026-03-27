/**
 * @file camara.ts
 * @description Typed constants for Câmara dos Deputados compensation data.
 *
 * These values are sourced from official Câmara documents and legislation:
 * - Deputy salary: fixed by law for all 513 federal deputies
 * - Verba de Gabinete: office allowance set by Ato da Mesa 243/2026
 * - Staff salary tables: Lei 15.349/2026 (PL 179/2026, Redação Final)
 * - Bonus cap: 100% of base salary for parliamentary secretaries
 *
 * All monetary values are in BRL (Brazilian Real).
 */

// ── Deputy salary ───────────────────────────────────────────────────

/**
 * Monthly gross salary of a Federal Deputy (Deputado Federal), in BRL.
 *
 * This value is the same for all 513 deputies regardless of UF, party,
 * or seniority. It is updated periodically by Congressional resolution.
 *
 * @see {@link https://www.camara.leg.br/transparencia/recursos-humanos/remuneracao/deputados}
 */
export const DEPUTADO_SALARIO = 46_366.19

// ── Verba de Gabinete ───────────────────────────────────────────────

/**
 * Total monthly office allowance (Verba de Gabinete) per deputy, in BRL.
 *
 * This is the ceiling for paying parliamentary secretaries (staff) per
 * deputy office. Set by Ato da Mesa 243/2026. The same value applies to
 * all deputies regardless of UF.
 *
 * @see {@link https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/verba-de-gabinete}
 */
export const VERBA_DE_GABINETE_TOTAL = 165_806.07

// ── Parliamentary secretary bonus cap ───────────────────────────────

/**
 * Maximum "gratificação de representação de gabinete" (office representation
 * bonus) for parliamentary secretaries, as a fraction of base salary.
 *
 * Deputies may add a bonus of up to 100% (1.0) of the secretary's base
 * salary, as long as the total office payroll stays within the
 * {@link VERBA_DE_GABINETE_TOTAL} ceiling.
 *
 * @see {@link https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/verba-de-gabinete}
 */
export const SECRETARIO_PARLAMENTAR_BONUS_MAX = 1.0

// ── Staff salary tables ─────────────────────────────────────────────

/**
 * Anexo type identifier for the salary tables from Lei 15.349/2026.
 *
 * The law contains a single "Anexo Único" with four tables:
 * - Tabela I: Legislative Career (Analista Legislativo, Técnico Legislativo)
 * - Tabela II: Special-Nature Positions (CNE-07 through CNE-15)
 * - Tabela III: Parliamentary Secretary re-classification mapping (no salaries)
 * - Tabela IV: Parliamentary Secretary salary levels (SP-01 through SP-25)
 */
type TabelaId = "I" | "II" | "IV"

/**
 * A single position entry in the staff salary map.
 *
 * @property tabela - Which table in the Anexo Único of Lei 15.349/2026
 * @property baseSalary - Monthly base salary (vencimento básico) in BRL
 */
interface FuncionarioCargo {
  tabela: TabelaId
  baseSalary: number
}

/**
 * Complete map of Câmara staff positions to base salaries, extracted from
 * all salary tables in Lei 15.349/2026 (PL 179/2026, Redação Final).
 *
 * **Tabela I** — Legislative Career (Carreira Legislativa):
 *   Analista Legislativo (classes A/B/Especial, padrões 1–10) and
 *   Técnico Legislativo (classes A/B/Especial, padrões 1–10).
 *
 * **Tabela II** — Special-Nature Positions (Cargos de Natureza Especial):
 *   CNE-07 through CNE-15 (note: CNE-08 does not exist).
 *   Values shown are the vencimento column only; each level also has a
 *   separate "representação mensal" allowance not included here.
 *
 * **Tabela IV** — Parliamentary Secretary levels (SP-01 through SP-25):
 *   Base salaries range from R$ 1,710.83 to R$ 12,979.45.
 *   (Tabela III is a re-classification mapping with no salary data.)
 *
 * Note: Actual total compensation is higher than base salary due to
 * GDAE (40–100%), GAL (0.74× base), and other allowances defined in
 * the same law.
 *
 * @see {@link https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3081387&filename=REDACAO+FINAL+PL+179%2F2026}
 */
export const FUNCIONARIOS_CARGOS: Record<string, FuncionarioCargo> = {
  // ── Tabela I — Analista Legislativo ─────────────────────────────
  "Analista Legislativo A-1": { tabela: "I", baseSalary: 14_008.22 },
  "Analista Legislativo A-2": { tabela: "I", baseSalary: 14_498.51 },
  "Analista Legislativo A-3": { tabela: "I", baseSalary: 15_005.96 },
  "Analista Legislativo A-4": { tabela: "I", baseSalary: 15_531.16 },
  "Analista Legislativo B-5": { tabela: "I", baseSalary: 16_074.75 },
  "Analista Legislativo B-6": { tabela: "I", baseSalary: 16_637.37 },
  "Analista Legislativo B-7": { tabela: "I", baseSalary: 17_219.68 },
  "Analista Legislativo B-8": { tabela: "I", baseSalary: 17_822.37 },
  "Analista Legislativo Especial-9": { tabela: "I", baseSalary: 18_446.15 },
  "Analista Legislativo Especial-10": { tabela: "I", baseSalary: 19_091.77 },

  // ── Tabela I — Técnico Legislativo ──────────────────────────────
  "Técnico Legislativo A-1": { tabela: "I", baseSalary: 8_825.18 },
  "Técnico Legislativo A-2": { tabela: "I", baseSalary: 9_279.04 },
  "Técnico Legislativo A-3": { tabela: "I", baseSalary: 9_753.87 },
  "Técnico Legislativo A-4": { tabela: "I", baseSalary: 10_405.88 },
  "Técnico Legislativo B-5": { tabela: "I", baseSalary: 11_091.58 },
  "Técnico Legislativo B-6": { tabela: "I", baseSalary: 11_812.53 },
  "Técnico Legislativo B-7": { tabela: "I", baseSalary: 12_570.37 },
  "Técnico Legislativo B-8": { tabela: "I", baseSalary: 13_366.78 },
  "Técnico Legislativo Especial-9": { tabela: "I", baseSalary: 14_388.00 },
  "Técnico Legislativo Especial-10": { tabela: "I", baseSalary: 15_464.33 },

  // ── Tabela II — Cargos de Natureza Especial ─────────────────────
  "CNE-07": { tabela: "II", baseSalary: 13_875.17 },
  "CNE-09": { tabela: "II", baseSalary: 6_501.15 },
  "CNE-10": { tabela: "II", baseSalary: 4_202.43 },
  "CNE-11": { tabela: "II", baseSalary: 3_861.68 },
  "CNE-12": { tabela: "II", baseSalary: 3_360.48 },
  "CNE-13": { tabela: "II", baseSalary: 2_849.39 },
  "CNE-14": { tabela: "II", baseSalary: 2_377.55 },
  "CNE-15": { tabela: "II", baseSalary: 1_929.27 },

  // ── Tabela IV — Secretário Parlamentar ──────────────────────────
  "SP-01": { tabela: "IV", baseSalary: 1_710.83 },
  "SP-02": { tabela: "IV", baseSalary: 1_906.12 },
  "SP-03": { tabela: "IV", baseSalary: 2_101.45 },
  "SP-04": { tabela: "IV", baseSalary: 2_296.72 },
  "SP-05": { tabela: "IV", baseSalary: 2_492.06 },
  "SP-06": { tabela: "IV", baseSalary: 2_687.34 },
  "SP-07": { tabela: "IV", baseSalary: 2_882.65 },
  "SP-08": { tabela: "IV", baseSalary: 3_077.95 },
  "SP-09": { tabela: "IV", baseSalary: 3_273.26 },
  "SP-10": { tabela: "IV", baseSalary: 3_468.54 },
  "SP-11": { tabela: "IV", baseSalary: 3_663.85 },
  "SP-12": { tabela: "IV", baseSalary: 4_054.45 },
  "SP-13": { tabela: "IV", baseSalary: 4_445.03 },
  "SP-14": { tabela: "IV", baseSalary: 4_835.65 },
  "SP-15": { tabela: "IV", baseSalary: 5_226.24 },
  "SP-16": { tabela: "IV", baseSalary: 5_616.84 },
  "SP-17": { tabela: "IV", baseSalary: 6_202.74 },
  "SP-18": { tabela: "IV", baseSalary: 6_788.64 },
  "SP-19": { tabela: "IV", baseSalary: 7_374.54 },
  "SP-20": { tabela: "IV", baseSalary: 7_960.44 },
  "SP-21": { tabela: "IV", baseSalary: 8_546.34 },
  "SP-22": { tabela: "IV", baseSalary: 9_327.56 },
  "SP-23": { tabela: "IV", baseSalary: 10_108.74 },
  "SP-24": { tabela: "IV", baseSalary: 11_544.10 },
  "SP-25": { tabela: "IV", baseSalary: 12_979.45 },
} as const satisfies Record<string, FuncionarioCargo>

/**
 * Monthly "representação mensal" allowance for special-nature positions (CNE).
 * This is paid on top of the base salary in {@link FUNCIONARIOS_CARGOS}.
 *
 * @see {@link https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3081387&filename=REDACAO+FINAL+PL+179%2F2026}
 */
export const CNE_REPRESENTACAO_MENSAL: Record<string, number> = {
  "CNE-07": 12_083.73,
  "CNE-09": 11_198.10,
  "CNE-10": 6_889.10,
  "CNE-11": 5_577.92,
  "CNE-12": 4_899.17,
  "CNE-13": 4_230.31,
  "CNE-14": 3_522.20,
  "CNE-15": 2_790.53,
} as const
