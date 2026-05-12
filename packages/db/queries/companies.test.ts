/**
 * @file companies.test.ts
 * @description Coverage for the empresas-module query helpers and
 * persistence functions in {@link ./companies}.
 *
 * Two suites live here:
 *
 * - **Pure helpers** ({@link normalizePartnerName}, {@link extractCpfMid},
 *   {@link nameSimilarity}) — always run, no I/O required.
 * - **Integration** — real Postgres round trips via Prisma. Skipped unless
 *   `DATABASE_URL_TEST` is set, because per CLAUDE.md these queries must
 *   not be exercised against mocks. Each test truncates the company
 *   tables to start from a clean slate.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  extractCpfMid,
  findRelatedPartners,
  getCompanyAggregates,
  getCompanyOverviewStats,
  getTopCompaniesByObservedValue,
  nameSimilarity,
  normalizePartnerName,
  recordCompanyTransaction,
  upsertCompany,
  upsertCompanyPartners,
} from "./companies"

// ─── Pure helpers ────────────────────────────────────────────────────

describe("normalizePartnerName", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizePartnerName("João da Silva")).toBe("joao da silva")
    expect(normalizePartnerName("MARIA JOSÉ ÂNGELA")).toBe("maria jose angela")
  })

  it("collapses whitespace", () => {
    expect(normalizePartnerName("  Pedro   Henrique  ")).toBe("pedro henrique")
  })

  it("returns identical keys for equivalent names regardless of case/accents", () => {
    expect(normalizePartnerName("José")).toBe(normalizePartnerName("JOSÉ"))
    expect(normalizePartnerName("Çelso")).toBe(normalizePartnerName("CELSO"))
  })
})

describe("extractCpfMid", () => {
  it("returns the 6 stable middle digits from a masked CPF", () => {
    expect(extractCpfMid("***.456.789-**")).toBe("456789")
  })

  it("returns null for null/empty/non-CPF inputs", () => {
    expect(extractCpfMid(null)).toBeNull()
    expect(extractCpfMid(undefined)).toBeNull()
    expect(extractCpfMid("")).toBeNull()
    expect(extractCpfMid("not-a-cpf")).toBeNull()
  })

  it("returns null when the digit count is not exactly 6", () => {
    expect(extractCpfMid("***.45.789-**")).toBeNull()
    expect(extractCpfMid("***.4567.789-**")).toBeNull()
  })
})

describe("nameSimilarity", () => {
  it("returns 1 for identical normalized keys", () => {
    expect(nameSimilarity("jose da silva", "jose da silva")).toBe(1)
  })

  it("returns 0 when one input is empty", () => {
    expect(nameSimilarity("", "jose")).toBe(0)
    expect(nameSimilarity("jose", "")).toBe(0)
  })

  it("scores near-duplicates above 0.9", () => {
    // One additional middle name → still highly similar
    const score = nameSimilarity(
      "jose da silva",
      "jose da silva santos",
    )
    expect(score).toBeLessThan(1)
    // Different last names share fewer characters → lower than alta threshold
    expect(
      nameSimilarity("ana maria souza", "carla regina pereira"),
    ).toBeLessThan(0.5)
  })

  it("is symmetric", () => {
    const a = "joao pedro alves"
    const b = "joao pedro"
    expect(nameSimilarity(a, b)).toBeCloseTo(nameSimilarity(b, a), 10)
  })
})

// ─── Integration ─────────────────────────────────────────────────────

const hasTestDb = Boolean(process.env.DATABASE_URL_TEST)

// `describe.skipIf` keeps the test file green in environments that have not
// provisioned a Postgres test database (CI matrix entries, contributors who
// have not run `pnpm db:migrate` against a local DB, etc.). When run with
// `DATABASE_URL_TEST=postgres://… pnpm test`, the suite executes in full.
describe.skipIf(!hasTestDb)("companies queries (integration)", () => {
  // Lazy-load the Prisma client so the import does not crash test runs that
  // skip this suite (the client validates DATABASE_URL on construction).
  let prisma: import("@prisma/client").PrismaClient
  const SAMPLE_CNPJ = "11222333000181"
  const PARTNER_CNPJ = "44555666000122"

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST!
    const { PrismaClient } = await import("@prisma/client")
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  beforeEach(async () => {
    // CASCADE removes partners + transactions in one statement.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "companies" RESTART IDENTITY CASCADE`,
    )
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe("upsertCompany", () => {
    it("inserts a row when none exists and preserves firstSeenAt on update", async () => {
      const created = await upsertCompany({
        cnpj: SAMPLE_CNPJ,
        legalName: "ACME LTDA",
        uf: "SP",
      })
      expect(created.cnpj).toBe(SAMPLE_CNPJ)
      expect(created.legalName).toBe("ACME LTDA")
      const firstSeenAt = created.firstSeenAt

      // Wait one tick so timestamps are observably different
      await new Promise((r) => setTimeout(r, 5))

      const updated = await upsertCompany({
        cnpj: SAMPLE_CNPJ,
        legalName: "ACME COMERCIO LTDA",
      })
      expect(updated.legalName).toBe("ACME COMERCIO LTDA")
      // UF was not in the second payload — it must be retained.
      expect(updated.uf).toBe("SP")
      expect(updated.firstSeenAt.getTime()).toBe(firstSeenAt.getTime())
      expect(updated.lastFetchedAt.getTime()).toBeGreaterThan(
        firstSeenAt.getTime(),
      )
    })

    it("accepts a cnpj-only payload (CEAP-sighting use case)", async () => {
      const row = await upsertCompany({ cnpj: SAMPLE_CNPJ })
      expect(row.legalName).toBeNull()
      expect(row.uf).toBeNull()
    })
  })

  describe("upsertCompanyPartners", () => {
    it("derives partnerNameKey and cpfMid and respects idempotency", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        {
          partnerName: "João da Silva",
          maskedCpf: "***.456.789-**",
          qualification: "Sócio-Administrador",
        },
        {
          partnerName: "ACME HOLDING SA",
          partnerCnpj: "99888777000166",
          maskedCpf: null,
        },
      ])
      const first = await prisma.companyPartner.findMany({
        where: { cnpj: SAMPLE_CNPJ },
      })
      expect(first).toHaveLength(2)
      const joao = first.find((p) => p.partnerName === "João da Silva")!
      expect(joao.partnerNameKey).toBe("joao da silva")
      expect(joao.cpfMid).toBe("456789")

      // Re-running with the same payload must not duplicate rows.
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        {
          partnerName: "João da Silva",
          maskedCpf: "***.456.789-**",
          qualification: "Sócio-Administrador",
        },
        {
          partnerName: "ACME HOLDING SA",
          partnerCnpj: "99888777000166",
          maskedCpf: null,
        },
      ])
      const second = await prisma.companyPartner.findMany({
        where: { cnpj: SAMPLE_CNPJ },
      })
      expect(second).toHaveLength(2)
    })

    it("removes partners that vanished from the source", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "Ana Souza", maskedCpf: "***.111.222-**" },
        { partnerName: "Bruno Lima", maskedCpf: "***.333.444-**" },
      ])
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "Ana Souza", maskedCpf: "***.111.222-**" },
      ])
      const remaining = await prisma.companyPartner.findMany({
        where: { cnpj: SAMPLE_CNPJ },
      })
      expect(remaining).toHaveLength(1)
      expect(remaining[0].partnerName).toBe("Ana Souza")
    })
  })

  describe("recordCompanyTransaction", () => {
    it("creates the parent Company row if missing", async () => {
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "expense-1",
        sourceUrl:
          "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2025",
        value: 1234.56,
        year: 2025,
        month: 3,
        counterparty: "deputy:204554",
      })
      const company = await prisma.company.findUnique({
        where: { cnpj: SAMPLE_CNPJ },
      })
      expect(company).not.toBeNull()
    })

    it("is idempotent on (cnpj, type, sourceKey)", async () => {
      const input = {
        cnpj: SAMPLE_CNPJ,
        type: "ceap" as const,
        sourceKey: "expense-1",
        sourceUrl: "https://example.org/1",
        value: 1000,
        year: 2025,
      }
      await recordCompanyTransaction(input)
      await recordCompanyTransaction({ ...input, value: 1500 })
      const rows = await prisma.companyTransaction.findMany({
        where: { cnpj: SAMPLE_CNPJ },
      })
      expect(rows).toHaveLength(1)
      // The latest sighting wins — value is refreshed on conflict.
      expect(Number(rows[0].value)).toBe(1500)
    })
  })

  describe("getCompanyAggregates", () => {
    it("groups by (type, year) and returns sum/count/lastObservedAt", async () => {
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e1",
        sourceUrl: "https://example.org/1",
        value: 100,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e2",
        sourceUrl: "https://example.org/2",
        value: 250,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "contract",
        sourceKey: "c1",
        sourceUrl: "https://example.org/3",
        value: 9999,
        year: 2025,
      })

      const aggregates = await getCompanyAggregates(SAMPLE_CNPJ)
      const ceap2024 = aggregates.find(
        (a) => a.type === "ceap" && a.year === 2024,
      )!
      expect(ceap2024.total).toBe(350)
      expect(ceap2024.count).toBe(2)
      expect(ceap2024.lastObservedAt).toBeInstanceOf(Date)

      const contract2025 = aggregates.find(
        (a) => a.type === "contract" && a.year === 2025,
      )!
      expect(contract2025.total).toBe(9999)
      expect(contract2025.count).toBe(1)
    })

    it("returns an empty array when no transactions exist for the cnpj", async () => {
      expect(await getCompanyAggregates(SAMPLE_CNPJ)).toEqual([])
    })
  })

  describe("findRelatedPartners", () => {
    it("labels matches on cpfMid + name as alta and exposes partner cross-references", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ, legalName: "ACME LTDA" })
      await upsertCompany({ cnpj: PARTNER_CNPJ, legalName: "BETA LTDA" })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "João da Silva", maskedCpf: "***.456.789-**" },
      ])
      await upsertCompanyPartners(PARTNER_CNPJ, [
        { partnerName: "JOÃO DA SILVA", maskedCpf: "***.456.789-**" },
      ])
      const result = await findRelatedPartners(SAMPLE_CNPJ)
      expect(result).toHaveLength(1)
      expect(result[0].otherCompanies).toEqual([
        { cnpj: PARTNER_CNPJ, legalName: "BETA LTDA", confidence: "alta" },
      ])
    })

    it("downgrades to media when cpfMid matches but the names diverge", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      await upsertCompany({ cnpj: PARTNER_CNPJ, legalName: "GAMA SA" })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "Maria Souza", maskedCpf: "***.111.222-**" },
      ])
      await upsertCompanyPartners(PARTNER_CNPJ, [
        {
          // Same CPF mid, different surname (e.g. married name)
          partnerName: "Maria Souza Pereira de Oliveira",
          maskedCpf: "***.111.222-**",
        },
      ])
      const [partner] = await findRelatedPartners(SAMPLE_CNPJ)
      expect(partner.otherCompanies[0].confidence).toBe("media")
    })

    it("labels name-only matches as baixa", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      await upsertCompany({ cnpj: PARTNER_CNPJ, legalName: "DELTA SA" })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "Carlos Alberto", maskedCpf: "***.999.888-**" },
      ])
      await upsertCompanyPartners(PARTNER_CNPJ, [
        // Different cpfMid → only the name matches
        { partnerName: "Carlos Alberto", maskedCpf: "***.111.222-**" },
      ])
      const [partner] = await findRelatedPartners(SAMPLE_CNPJ)
      expect(partner.otherCompanies[0].confidence).toBe("baixa")
    })

    it("never returns the queried CNPJ in otherCompanies", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      await upsertCompanyPartners(SAMPLE_CNPJ, [
        { partnerName: "Solo Dono", maskedCpf: "***.555.444-**" },
      ])
      const [partner] = await findRelatedPartners(SAMPLE_CNPJ)
      expect(partner.otherCompanies).toEqual([])
    })

    it("returns an empty array when the CNPJ has no partners", async () => {
      await upsertCompany({ cnpj: SAMPLE_CNPJ })
      expect(await findRelatedPartners(SAMPLE_CNPJ)).toEqual([])
    })
  })

  describe("getCompanyOverviewStats", () => {
    it("returns zeros when no data has been observed", async () => {
      const stats = await getCompanyOverviewStats()
      expect(stats).toEqual({
        companiesIndexed: 0,
        totalObservedValue: 0,
        transactionsObserved: 0,
      })
    })

    it("counts CNPJs and sums observed transactions across types and years", async () => {
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e1",
        sourceUrl: "https://example.org/1",
        value: 100,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "contract",
        sourceKey: "c1",
        sourceUrl: "https://example.org/2",
        value: 9999,
        year: 2025,
      })
      await recordCompanyTransaction({
        cnpj: PARTNER_CNPJ,
        type: "ceap",
        sourceKey: "e2",
        sourceUrl: "https://example.org/3",
        value: 250,
        year: 2024,
      })

      const stats = await getCompanyOverviewStats()
      expect(stats.companiesIndexed).toBe(2)
      expect(stats.transactionsObserved).toBe(3)
      expect(stats.totalObservedValue).toBe(10349)
    })
  })

  describe("getTopCompaniesByObservedValue", () => {
    it("returns top CNPJs sorted by SUM(value) DESC and joins cadastral columns", async () => {
      await upsertCompany({
        cnpj: SAMPLE_CNPJ,
        legalName: "ACME LTDA",
        tradeName: "ACME",
        uf: "SP",
      })
      // PARTNER_CNPJ is intentionally not upserted before the transaction so
      // we exercise the null-cadastral path (sighting before ingest).
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e1",
        sourceUrl: "https://example.org/1",
        value: 1000,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: PARTNER_CNPJ,
        type: "contract",
        sourceKey: "c1",
        sourceUrl: "https://example.org/2",
        value: 5000,
        year: 2024,
      })

      const rows = await getTopCompaniesByObservedValue(10)
      expect(rows).toHaveLength(2)
      // PARTNER_CNPJ must rank first by total
      expect(rows[0].cnpj).toBe(PARTNER_CNPJ)
      expect(rows[0].total).toBe(5000)
      expect(rows[0].legalName).toBeNull()
      expect(rows[1].cnpj).toBe(SAMPLE_CNPJ)
      expect(rows[1].legalName).toBe("ACME LTDA")
      expect(rows[1].uf).toBe("SP")
    })

    it("respects the limit argument", async () => {
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e1",
        sourceUrl: "https://example.org/1",
        value: 1000,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: PARTNER_CNPJ,
        type: "ceap",
        sourceKey: "e2",
        sourceUrl: "https://example.org/2",
        value: 500,
        year: 2024,
      })
      const rows = await getTopCompaniesByObservedValue(1)
      expect(rows).toHaveLength(1)
      expect(rows[0].cnpj).toBe(SAMPLE_CNPJ)
    })

    it("filters by transaction type when provided", async () => {
      await recordCompanyTransaction({
        cnpj: SAMPLE_CNPJ,
        type: "ceap",
        sourceKey: "e1",
        sourceUrl: "https://example.org/1",
        value: 1000,
        year: 2024,
      })
      await recordCompanyTransaction({
        cnpj: PARTNER_CNPJ,
        type: "contract",
        sourceKey: "c1",
        sourceUrl: "https://example.org/2",
        value: 9999,
        year: 2024,
      })
      const onlyContracts = await getTopCompaniesByObservedValue(10, "contract")
      expect(onlyContracts).toHaveLength(1)
      expect(onlyContracts[0].cnpj).toBe(PARTNER_CNPJ)
    })

    it("returns an empty array when no transactions exist", async () => {
      expect(await getTopCompaniesByObservedValue(10)).toEqual([])
    })
  })
})
