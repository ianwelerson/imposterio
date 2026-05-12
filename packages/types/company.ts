/**
 * @file company.ts
 * @description Shared TypeScript types for companies, partners, sanctions
 * and aggregated transactions used by the empresas module.
 *
 * Data sources:
 * - **OpenCNPJ** (`api.opencnpj.org`) — real-time CNPJ detail (replaces CNPJá)
 * - **Federal Revenue QSA bulk** (PostgreSQL) — partner-graph traversal at scale
 * - **Imposterio PostgreSQL** — `companies` / `company_partners` /
 *   `company_transactions` tables for the incremental partner graph and
 *   aggregation index (see EMPRESAS-PLAN.md §2.2 + DECISIONS.md)
 * - **Portal da Transparência** — federal contracts, sanctions (CEIS / CNEP)
 */

import type { WithSource } from "./source"

// ── Company detail (OpenCNPJ) ────────────────────────────────────────

/**
 * Full company detail as returned by `getCompanyDetail()` (OpenCNPJ).
 *
 * Wrapped with `WithSource` so the `_source` URL can be displayed via
 * `<SourcePill>` next to every data point on the empresas detail page.
 */
export type Company = WithSource<{
  /** 14-digit CNPJ with no punctuation. */
  cnpj: string
  /** Razão social. */
  legalName: string
  /** Nome fantasia, when registered. */
  tradeName: string | null
  /** Cadastral status — "ATIVA", "BAIXADA", "SUSPENSA", "INAPTA", etc. */
  status: string
  /** ISO date of the latest status change. */
  statusDate: string | null
  /** Primary CNAE (economic activity classification). */
  mainCnae: CompanyCnae
  /** Secondary CNAEs registered for the establishment. */
  secondaryCnaes: CompanyCnae[]
  /** Company size — "MEI" | "ME" | "EPP" | "DEMAIS". */
  size: string
  /** Legal nature description (e.g. "Sociedade Empresária Limitada"). */
  legalNature: string
  /** Subscribed share capital, in BRL. */
  capital: number
  /** ISO date the company was opened. */
  openedAt: string
  address: CompanyAddress
  partners: CompanyQsaPartner[]
}>

/** A CNAE entry (economic activity classification). */
export interface CompanyCnae {
  /** 7-digit CNAE code, no punctuation. */
  code: string
  description: string
}

/** Company address as returned by OpenCNPJ. */
export interface CompanyAddress {
  street: string
  number: string
  complement: string | null
  district: string
  city: string
  /** Two-letter UF code. */
  uf: string
  /** ZIP/CEP, digits only. */
  zip: string
}

/**
 * A partner (sócio) as returned by OpenCNPJ's QSA payload.
 *
 * CPFs are masked at the source (`***.456.789-**`); we never reconstruct or
 * persist the unmasked digits. When the partner is itself a juridical
 * person, `maskedCpf` is null and `partnerCnpj` carries the partner's CNPJ.
 */
export interface CompanyQsaPartner {
  name: string
  /** Masked CPF when the partner is a natural person; null otherwise. */
  maskedCpf: string | null
  /** Partner CNPJ when the partner is a juridical person; null otherwise. */
  partnerCnpj: string | null
  /** Qualification text, e.g. "Sócio-Administrador". */
  qualification: string
  /** ISO date the partner joined the company, when reported. */
  joinedAt: string | null
}

// ── Partner graph (PostgreSQL `company_partners`) ────────────────────

/**
 * A persisted partner row used by the cross-reference algorithm.
 *
 * Mirrors the Prisma `CompanyPartner` model and is the input/output shape
 * of the queries in `packages/db/queries/companies.ts`.
 */
export interface CompanyPartner {
  id: string
  /** Owning company's CNPJ. */
  cnpj: string
  /** Partner display name as returned by OpenCNPJ. */
  partnerName: string
  /**
   * Normalized lowercase + accent-stripped form of `partnerName`. Indexed
   * to make join queries cheap; never displayed.
   */
  partnerNameKey: string
  /** Masked CPF (e.g. "***.456.789-**"); null when partner is a company. */
  maskedCpf: string | null
  /** 6 stable middle digits of the masked CPF (e.g. "456789"). */
  cpfMid: string | null
  /** When the partner is itself a company, that company's CNPJ. */
  partnerCnpj: string | null
  qualification: string | null
  joinedAt: Date | null
  observedAt: Date
}

// ── Aggregated transactions (PostgreSQL `company_transactions`) ──────

/**
 * Allowed values for `CompanyTransaction.type`.
 *
 * Add new values only after updating EMPRESAS-PLAN.md §5 + the JSDoc list
 * on the Prisma model.
 */
export type CompanyTransactionType =
  | "ceap"
  | "contract"
  | "donation_in"
  | "donation_out"
  | "bid_won"
  | "bid_lost"

/**
 * A persisted observed financial event involving a CNPJ.
 *
 * Mirrors the Prisma `CompanyTransaction` model. Aggregations served to the
 * UI come from `getCompanyAggregates()`, not from materializing these rows.
 */
export interface CompanyTransaction {
  id: string
  cnpj: string
  type: CompanyTransactionType
  /** Stable natural key from the source API — idempotency anchor. */
  sourceKey: string
  /** Source API URL — populates `_source` on aggregated rows. */
  sourceUrl: string
  /** Absolute BRL value. */
  value: number
  year: number
  month: number | null
  /** Free-form counterparty (e.g. "deputy:204554"). */
  counterparty: string | null
  observedAt: Date
}

/**
 * Aggregation row returned by `getCompanyAggregates(cnpj)`.
 *
 * One row per `(type, year)` combination. `lastObservedAt` is the most
 * recent `observedAt` in the group — surfaced in the UI as the
 * "atualizado em" timestamp on the parcial-value disclaimer.
 */
export interface CompanyTransactionAggregate {
  type: CompanyTransactionType
  year: number
  /** Sum of `value` across the group, in BRL. */
  total: number
  /** Number of transactions in the group. */
  count: number
  lastObservedAt: Date
}

// ── Government contracts (Portal da Transparência) ───────────────────

/**
 * A normalized federal contract returned by `getContracts()` (Portal da
 * Transparência `GET /contratos`).
 *
 * The empresas detail page renders one of these per row in the "Contratos
 * com o governo federal" section. `linkPdt` is a deep-link back to the
 * official record so the user can drill into agency, payments and amendments
 * without us having to mirror that data — the same contract is also
 * persisted as a `CompanyTransaction` row (`type: "contract"`) for incremental
 * aggregation, see EMPRESAS-PLAN.md §5.
 */
export interface GovernmentContract {
  /** Contract id from the Portal da Transparência catalog. */
  id: string
  /** Contract number (e.g. "10/2024"); not unique across agencies. */
  number: string
  /** Free-form object/description of the contract. */
  object: string
  /** Vendor display name (razão social or nome fantasia). */
  supplierName: string
  /** Vendor CNPJ — 14 digits, no punctuation. */
  supplierCnpj: string
  /** Agency name as published (e.g. "Ministério da Educação"). */
  agency: string
  /** SIAFI code of the parent agency (e.g. "26000"). */
  agencyCode: string
  /** Managing unit code (e.g. "200999"). Empty when not published. */
  managingUnitCode: string
  /** Procurement modality (e.g. "Pregão Eletrônico"). */
  modality: string
  /** Cadastral situation as published (e.g. "ATIVO"). */
  status: string
  /** ISO date the contract was signed, or null when not published. */
  signatureDate: string | null
  /** ISO date the contract started being in force, or null. */
  startDate: string | null
  /** ISO date the contract is due to end, or null. */
  endDate: string | null
  /** Initial committed value, in BRL. */
  initialValue: number
  /** Latest contracted value, in BRL — typically equal to `initialValue`
   *  when there are no amendments yet. */
  currentValue: number
  /** Direct deep-link to the Portal da Transparência page for this contract. */
  linkPdt: string
}

// ── Campaign donations (TSE) ─────────────────────────────────────────

/**
 * A single campaign donation row returned by `getCompanyDonations*()`.
 *
 * The same shape carries both directions (company-as-donor and
 * company-as-recipient); `direction` tells the UI which side the queried
 * CNPJ is on:
 *
 * - `out` — the company donated TO a candidate / party (historical, mostly
 *   pre-2015 since corporate donations were outlawed by ADI 4650).
 * - `in`  — the company received FROM a campaign (typically a service
 *   provider invoiced by a candidate's prestação de contas).
 *
 * `_source` carries the exact CKAN URL the row was fetched from so the UI
 * can deep-link the user to the official record via `<SourcePill>`.
 */
export type CampaignDonation = WithSource<{
  /** Stable natural key from TSE — used as the idempotency anchor. */
  id: string
  /** Election year (e.g. 2022 for federal, 2024 for municipal). */
  year: number
  /** `"in"` when the queried CNPJ received the money, `"out"` when it paid. */
  direction: "in" | "out"
  /** Donation value in BRL (always positive). */
  value: number
  /** ISO date the donation was reported, or null when not published. */
  donationDate: string | null
  /** TSE-published donor name (free-form). */
  donorName: string
  /** Donor CPF or CNPJ — digits only. May be empty when masked at the source. */
  donorDocument: string
  /** Recipient candidate / party / committee name. */
  recipientName: string
  /** Recipient document (CPF for candidates, CNPJ for parties / committees). */
  recipientDocument: string
  /** Office sought (e.g. "DEPUTADO FEDERAL"). Empty for party-level rows. */
  recipientPosition: string
  /** Recipient party acronym (e.g. "PT"). Empty when not published. */
  recipientParty: string
  /** Recipient UF (state). Empty when not published or for federal-level. */
  recipientUf: string
}>

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
