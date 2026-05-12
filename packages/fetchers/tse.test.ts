/**
 * @file tse.test.ts
 * @description Tests for the TSE campaign-donations fetcher.
 *
 * External calls are intercepted by MSW (configured in vitest.setup.ts).
 * Redis and the empresas DB queries are mocked so this suite exercises the
 * fetch → map → side-effect pipeline without booting Postgres.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { http, HttpResponse } from "msw"

import {
  MOCK_TSE_DESPESAS_2022_11222333000181,
  MOCK_TSE_RECEITAS_2022_11222333000181,
} from "./mocks/handlers"
import { server } from "./mocks/server"

// Minimum env vars required for cachedFetch to engage the cache layer.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io"
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"

// In-memory Redis fake — covers the surface used by cachedFetch.
const redisStore = new Map<string, string>()
const mockRedisGet = vi.fn(async (key: string) => redisStore.get(key) ?? null)
const mockRedisSet = vi.fn(async (key: string, value: string) => {
  redisStore.set(key, value)
  return "OK"
})
const mockRedisDel = vi.fn(async (key: string) => {
  redisStore.delete(key)
  return 1
})

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    get = mockRedisGet
    set = mockRedisSet
    del = mockRedisDel
  },
}))

// Mock the DB queries module so the side-effect path
// (recordCompanyTransaction) does not require Postgres. Asserted against
// in the dedicated "side effect" tests below.
const mockRecordCompanyTransaction = vi.fn(async () => undefined)
vi.mock("@imposterio/db/queries/companies", () => ({
  recordCompanyTransaction: mockRecordCompanyTransaction,
}))

// Mock OpenCNPJ so the backfill side-effect inside recordDonationTransactions
// does not touch the upstream API or the negative-cache Redis key.
vi.mock("./opencnpj", () => ({
  ingestCompany: vi.fn(async () => null),
  getCompanyDetail: vi.fn(async () => null),
}))

// Import after mocks are set up so module-level singletons resolve to the
// mocked clients.
const { getCompanyDonations, computeDonationRoi, DONATION_RESOURCES } =
  await import("./tse")

// DONATION_RESOURCES ships empty in production (TSE CKAN does not expose
// donations via datastore_search — see file header). The tests assert the
// fetcher pipeline against MSW-mocked CKAN responses, so we install the
// historical placeholder IDs here. Mutating the object keeps the binding
// `const` and only affects this test module.
DONATION_RESOURCES[2022] = {
  receitas: "tse-receitas-candidatos-2022",
  despesas: "tse-despesas-contratadas-candidatos-2022",
}

const SAMPLE_CNPJ = "11222333000181"
const FORMATTED_CNPJ = "11.222.333/0001-81"

const RECEITAS_URL = (cnpj: string) =>
  `https://dadosabertos.tse.jus.br/api/3/action/datastore_search?resource_id=tse-receitas-candidatos-2022` +
  `&filters=${encodeURIComponent(JSON.stringify({ NR_CPF_CNPJ_DOADOR: cnpj }))}`
const DESPESAS_URL = (cnpj: string) =>
  `https://dadosabertos.tse.jus.br/api/3/action/datastore_search?resource_id=tse-despesas-contratadas-candidatos-2022` +
  `&filters=${encodeURIComponent(JSON.stringify({ NR_CPF_CNPJ_FORNECEDOR: cnpj }))}`

describe("getCompanyDonations", () => {
  beforeEach(() => {
    redisStore.clear()
    mockRedisGet.mockClear()
    mockRedisSet.mockClear()
    mockRedisDel.mockClear()
    mockRecordCompanyTransaction.mockClear()
    mockRecordCompanyTransaction.mockResolvedValue(undefined)
  })

  it("strips punctuation from the CNPJ and returns rows from both directions", async () => {
    const rows = await getCompanyDonations(FORMATTED_CNPJ, { years: [2022] })

    const out = rows.filter((r) => r.direction === "out")
    const inn = rows.filter((r) => r.direction === "in")
    expect(out).toHaveLength(
      MOCK_TSE_RECEITAS_2022_11222333000181.result.records.length,
    )
    expect(inn).toHaveLength(
      MOCK_TSE_DESPESAS_2022_11222333000181.result.records.length,
    )
  })

  it("maps receitas rows into CampaignDonation with direction=out", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    const r1 = rows.find((r) => r.id === "R-1")
    expect(r1).toMatchObject({
      year: 2022,
      direction: "out",
      value: 10000,
      donationDate: "2022-08-15",
      donorDocument: SAMPLE_CNPJ,
      recipientName: "FULANO DE TAL",
      recipientDocument: "12345678901",
      recipientPosition: "DEPUTADO FEDERAL",
      recipientParty: "PT",
      recipientUf: "SP",
    })
  })

  it("maps despesas rows into CampaignDonation with direction=in", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    const d1 = rows.find((r) => r.id === "D-1")
    expect(d1).toMatchObject({
      year: 2022,
      direction: "in",
      value: 3500,
      donationDate: "2022-09-20",
      recipientDocument: "12345678901",
      recipientPosition: "DEPUTADO FEDERAL",
    })
  })

  it("normalizes both ISO and DD/MM/YYYY donation dates", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    expect(rows.find((r) => r.id === "R-1")?.donationDate).toBe("2022-08-15")
    expect(rows.find((r) => r.id === "R-2")?.donationDate).toBe("2022-09-10")
  })

  it("injects _source on every row pointing at the resource URL", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    expect(rows.find((r) => r.id === "R-1")?._source).toBe(
      RECEITAS_URL(SAMPLE_CNPJ),
    )
    expect(rows.find((r) => r.id === "D-1")?._source).toBe(
      DESPESAS_URL(SAMPLE_CNPJ),
    )
    // The combined `_source` matches the most recent receitas URL — used
    // by the page-level pill.
    expect(rows._source).toBe(RECEITAS_URL(SAMPLE_CNPJ))
  })

  it("returns an empty array (not an error) when the upstream has no rows", async () => {
    const rows = await getCompanyDonations("00000000000000", { years: [2022] })
    expect(rows).toHaveLength(0)
    // Even an empty result carries _source so the UI can still link to the
    // representative request.
    expect(rows._source).toContain("datastore_search")
  })

  it("returns an empty array without hitting upstream for malformed CNPJs", async () => {
    server.use(
      http.get(
        "https://dadosabertos.tse.jus.br/api/3/action/datastore_search",
        () => {
          throw new Error("upstream should not be called")
        },
      ),
    )
    const rows = await getCompanyDonations("invalid", { years: [2022] })
    expect(rows).toHaveLength(0)
  })

  it("skips years that are not in DONATION_RESOURCES", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [1998] })
    expect(rows).toHaveLength(0)
  })

  it("serves from Redis cache on the second call without hitting upstream", async () => {
    await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    expect(redisStore.has(RECEITAS_URL(SAMPLE_CNPJ))).toBe(true)
    expect(redisStore.has(DESPESAS_URL(SAMPLE_CNPJ))).toBe(true)

    server.use(
      http.get(
        "https://dadosabertos.tse.jus.br/api/3/action/datastore_search",
        () => {
          throw new Error("upstream should not be called on cache hit")
        },
      ),
    )

    const cached = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    expect(cached.length).toBe(
      MOCK_TSE_RECEITAS_2022_11222333000181.result.records.length +
        MOCK_TSE_DESPESAS_2022_11222333000181.result.records.length,
    )
  })

  // ── EMPRESAS-PLAN.md §5 Phase E8: TSE → CompanyTransaction side effect ──

  it("records each donation row as a CompanyTransaction with the right type", async () => {
    await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })

    const expected =
      MOCK_TSE_RECEITAS_2022_11222333000181.result.records.length +
      MOCK_TSE_DESPESAS_2022_11222333000181.result.records.length
    expect(mockRecordCompanyTransaction).toHaveBeenCalledTimes(expected)

    const r1Call = mockRecordCompanyTransaction.mock.calls.find(
      (c) => c[0].sourceKey === "R-1",
    )
    expect(r1Call?.[0]).toMatchObject({
      type: "donation_out",
      cnpj: SAMPLE_CNPJ,
      value: 10000,
      year: 2022,
      month: 8,
      counterparty: "candidate:12345678901",
    })

    const d1Call = mockRecordCompanyTransaction.mock.calls.find(
      (c) => c[0].sourceKey === "D-1",
    )
    expect(d1Call?.[0]).toMatchObject({
      type: "donation_in",
      cnpj: SAMPLE_CNPJ,
      value: 3500,
      year: 2022,
      month: 9,
      counterparty: "candidate:12345678901",
    })
  })

  it("does not throw when the DB layer fails — public-data page must keep rendering", async () => {
    mockRecordCompanyTransaction.mockRejectedValue(new Error("db down"))
    await expect(
      getCompanyDonations(SAMPLE_CNPJ, { years: [2022] }),
    ).resolves.toHaveProperty("length")
  })

  it("does not duplicate transactions when called twice (idempotency)", async () => {
    await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    const firstCallCount = mockRecordCompanyTransaction.mock.calls.length

    // Second call — served from Redis cache, must STILL replay the
    // recordCompanyTransaction calls so the upsert layer dedupes per row.
    // (The DB enforces idempotency on (cnpj, type, sourceKey).)
    await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    expect(mockRecordCompanyTransaction.mock.calls.length).toBe(
      firstCallCount * 2,
    )
    // Every replay carries the same sourceKey set the first call did.
    const seenKeys = new Set(
      mockRecordCompanyTransaction.mock.calls.map((c) => c[0].sourceKey),
    )
    expect(seenKeys.has("R-1")).toBe(true)
    expect(seenKeys.has("D-1")).toBe(true)
  })
})

describe("computeDonationRoi", () => {
  it("groups by counterparty and computes net ROI", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    const roi = computeDonationRoi(rows)

    // Two distinct candidates in the fixture: 12345678901 (one out + one in)
    // and 98765432109 (one out only).
    expect(roi).toHaveLength(2)

    const fulano = roi.find((r) => r.counterpartyDocument === "12345678901")
    expect(fulano).toMatchObject({
      counterpartyName: "FULANO DE TAL",
      donatedOut: 10000,
      receivedIn: 3500,
      roi: -6500,
      party: "PT",
    })

    const beltrano = roi.find((r) => r.counterpartyDocument === "98765432109")
    expect(beltrano).toMatchObject({
      counterpartyName: "BELTRANO SOUZA",
      donatedOut: 5000,
      receivedIn: 0,
      roi: -5000,
    })
  })

  it("sorts by absolute ROI magnitude descending", async () => {
    const rows = await getCompanyDonations(SAMPLE_CNPJ, { years: [2022] })
    const roi = computeDonationRoi(rows)
    expect(Math.abs(roi[0].roi)).toBeGreaterThanOrEqual(Math.abs(roi[1].roi))
  })

  it("returns an empty array for empty input", () => {
    expect(computeDonationRoi([])).toEqual([])
  })
})
