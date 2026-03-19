/**
 * @file company.ts
 * @description Shared TypeScript types for companies and partner networks.
 *
 * These types model data from:
 * - CNPJá free API (`open.cnpja.com`) for real-time CNPJ lookups
 * - Federal Revenue QSA bulk import (PostgreSQL) for partner graph traversal
 * - Portal da Transparência for government contracts and sanctions
 */

// ── Company data (CNPJá + Federal Revenue QSA) ───────────────────────

/** Company basic info as returned by CNPJá GET /office/{cnpj}. */
export interface Company {
  cnpj: string
  legalName: string
  tradeName?: string
  status: string
  cnae: string
  cnaeDescription: string
  size: string
  legalNature: string
  openingDate: string
  address: CompanyAddress
  simples: boolean
  mei: boolean
}

/** Company address from CNPJá. */
export interface CompanyAddress {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zip: string
}

/** A partner/administrator from the Federal Revenue QSA table. */
export interface CompanyPartner {
  name: string
  cpfCnpj: string
  role: string
  entryDate: string
  qualificationCode: number
}

// ── Government contracts (Portal da Transparência) ───────────────────

/** A federal contract from GET /contratos. */
export interface GovernmentContract {
  agency: string
  supplier: string
  object: string
  value: number
  startDate: string
  endDate: string
}

// ── Sanctions (CEIS / CNEP) ──────────────────────────────────────────

/** A blacklisted company from GET /ceis. */
export interface BlacklistedCompany {
  cnpj: string
  name: string
  sanctionType: string
  since: string
  agency: string
}

/** A punished company from GET /cnep. */
export interface PunishedCompany {
  cnpj: string
  name: string
  sanctionType: string
  since: string
  agency: string
}

// ── State fiscal data ────────────────────────────────────────────────

/** A Brazilian state with fiscal indicators from SICONFI + IBGE. */
export interface StateFiscal {
  uf: string
  name: string
  region: string
  ibgeCode: string
  population: number
  gdp: number
  taxRevenue: number
  icms: number
  ipva: number
  itcmd: number
  federalTransfers: number
  debtToRclRatio: number
  capag: "A" | "B" | "C" | "D"
}

/** Governor info from TSE + state transparency portals. */
export interface Governor {
  name: string
  party: string
  uf: string
  termStart: string
  compensation: number
  declaredAssets?: number
}

// ── Judiciary ────────────────────────────────────────────────────────

/** A magistrate from court transparency portals + DataJud. */
export interface Magistrate {
  id: string
  name: string
  court: string
  rank: string
  compensation: number
  activeCases: number
  yearsOnBench: number
}

/** Magistrate compensation breakdown from court transparency portals. */
export interface MagistrateCompensation {
  baseSalary: number
  personalBenefits: number
  allowances: number
  grossTotal: number
  incomeTax: number
  pension: number
  netTotal: number
}
