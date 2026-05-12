/**
 * @file opencnpj.test.ts
 * @description Tests for the OpenCNPJ fetchers.
 *
 * External calls are intercepted by MSW (configured in vitest.setup.ts).
 * The Upstash Redis client and the `@imposterio/db` queries module are
 * mocked so this suite exercises the fetch → parse → map pipeline plus the
 * negative-cache and ingest pathways without booting a Postgres instance.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "./mocks/server"
import { http, HttpResponse } from "msw"
import { MOCK_OPENCNPJ_11222333000181 } from "./mocks/handlers"

// Set fake Redis env vars so the cache layer is enabled in tests.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io"
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"

// In-memory Redis fake — covers the surface used by the fetcher: get/set/del.
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

// Mock the DB queries module so `ingestCompany` does not require Postgres.
interface UpsertPartnerCall {
  partnerName: string
  maskedCpf: string | null
  partnerCnpj: string | null
  qualification: string | null
  joinedAt: Date | null
}
const mockUpsertCompany = vi.fn<(input: unknown) => Promise<unknown>>(
  async (input) => input,
)
const mockUpsertCompanyPartners = vi.fn<
  (cnpj: string, partners: UpsertPartnerCall[]) => Promise<number>
>(async () => 0)

vi.mock("@imposterio/db/queries/companies", () => ({
  upsertCompany: mockUpsertCompany,
  upsertCompanyPartners: mockUpsertCompanyPartners,
}))

// Import after mocks are set up so the module-level `redis` singleton uses
// the mocked client.
const { getCompanyDetail, ingestCompany } = await import("./opencnpj")

const SAMPLE_CNPJ = "11222333000181"
const UNKNOWN_CNPJ = "99999999000199"

describe("getCompanyDetail", () => {
  beforeEach(() => {
    redisStore.clear()
    mockRedisGet.mockClear()
    mockRedisSet.mockClear()
    mockRedisDel.mockClear()
    mockUpsertCompany.mockClear()
    mockUpsertCompanyPartners.mockClear()
  })

  it("maps the OpenCNPJ payload to the public Company shape", async () => {
    const company = await getCompanyDetail(SAMPLE_CNPJ)
    expect(company).not.toBeNull()
    expect(company).toMatchObject({
      cnpj: SAMPLE_CNPJ,
      legalName: "ACME COMERCIO E SERVICOS LTDA",
      tradeName: "ACME",
      status: "ATIVA",
      size: "EPP",
      capital: 100000,
      mainCnae: { code: "4751201", description: "" },
    })
  })

  it("strips punctuation from the request CNPJ before hitting the API", async () => {
    const company = await getCompanyDetail("11.222.333/0001-81")
    expect(company?.cnpj).toBe(SAMPLE_CNPJ)
    expect(company?._source).toBe(`https://api.opencnpj.org/${SAMPLE_CNPJ}`)
  })

  it("injects _source field with the exact API URL", async () => {
    const company = await getCompanyDetail(SAMPLE_CNPJ)
    expect(company?._source).toBe(`https://api.opencnpj.org/${SAMPLE_CNPJ}`)
  })

  it("classifies natural-person partners (masked CPF) and juridical-person partners (CNPJ) correctly", async () => {
    const company = await getCompanyDetail(SAMPLE_CNPJ)
    expect(company?.partners).toHaveLength(2)
    const joao = company?.partners.find((p) => p.name === "João da Silva")
    expect(joao?.maskedCpf).toBe("***456789**")
    expect(joao?.partnerCnpj).toBeNull()
    const holding = company?.partners.find((p) => p.name === "ACME HOLDING SA")
    expect(holding?.maskedCpf).toBeNull()
    // CNPJ is normalized to 14 digits with no punctuation.
    expect(holding?.partnerCnpj).toBe("99888777000166")
  })

  it("normalizes CEP to digits only and preserves complement", async () => {
    const company = await getCompanyDetail(SAMPLE_CNPJ)
    expect(company?.address.zip).toBe("01000000")
    expect(company?.address.complement).toBe("Sala 5")
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    await getCompanyDetail(SAMPLE_CNPJ)
    // First call should have populated the positive cache under the URL key.
    expect(redisStore.has(`https://api.opencnpj.org/${SAMPLE_CNPJ}`)).toBe(true)

    // Reset Set so we can prove the second call did not write again.
    mockRedisSet.mockClear()

    // Block any further upstream calls — if the second invocation tries the
    // network, MSW will throw (handlers list still allows it, so we use a
    // throwing handler instead).
    server.use(
      http.get("https://api.opencnpj.org/:cnpj", () => {
        throw new Error("upstream should not be called on cache hit")
      }),
    )

    const cached = await getCompanyDetail(SAMPLE_CNPJ)
    expect(cached?.legalName).toBe("ACME COMERCIO E SERVICOS LTDA")
    expect(mockRedisSet).not.toHaveBeenCalled()
  })

  it("returns null on 404 and writes the negative cache key", async () => {
    const result = await getCompanyDetail(UNKNOWN_CNPJ)
    expect(result).toBeNull()
    expect(redisStore.get(`cnpj:404:${UNKNOWN_CNPJ}`)).toBeDefined()
    // The negative-cache write must use the short TTL constant.
    expect(mockRedisSet).toHaveBeenCalledWith(
      `cnpj:404:${UNKNOWN_CNPJ}`,
      "1",
      { ex: 60 * 60 },
    )
  })

  it("short-circuits on negative-cache hit without calling the API", async () => {
    redisStore.set(`cnpj:404:${UNKNOWN_CNPJ}`, "1")
    server.use(
      http.get("https://api.opencnpj.org/:cnpj", () => {
        throw new Error("upstream should not be called on negative-cache hit")
      }),
    )
    const result = await getCompanyDetail(UNKNOWN_CNPJ)
    expect(result).toBeNull()
  })

  it("rejects malformed CNPJs without contacting the API", async () => {
    server.use(
      http.get("https://api.opencnpj.org/:cnpj", () => {
        throw new Error("malformed CNPJ should never reach the network")
      }),
    )
    await expect(getCompanyDetail("123")).rejects.toMatchObject({ status: 400 })
  })
})

describe("ingestCompany", () => {
  beforeEach(() => {
    redisStore.clear()
    mockRedisGet.mockClear()
    mockRedisSet.mockClear()
    mockUpsertCompany.mockClear()
    mockUpsertCompanyPartners.mockClear()
  })

  it("upserts the Company row with cadastral columns extracted from OpenCNPJ", async () => {
    await ingestCompany(SAMPLE_CNPJ)
    expect(mockUpsertCompany).toHaveBeenCalledWith({
      cnpj: SAMPLE_CNPJ,
      legalName: "ACME COMERCIO E SERVICOS LTDA",
      tradeName: "ACME",
      status: "ATIVA",
      mainCnae: "4751201",
      uf: "SP",
    })
  })

  it("forwards the QSA to upsertCompanyPartners with mapped fields", async () => {
    await ingestCompany(SAMPLE_CNPJ)
    expect(mockUpsertCompanyPartners).toHaveBeenCalledTimes(1)
    const [cnpj, partners] = mockUpsertCompanyPartners.mock.calls[0]
    expect(cnpj).toBe(SAMPLE_CNPJ)
    expect(partners).toHaveLength(MOCK_OPENCNPJ_11222333000181.QSA.length)
    const joao = partners.find((p) => p.partnerName === "João da Silva")
    expect(joao).toMatchObject({
      maskedCpf: "***456789**",
      partnerCnpj: null,
      qualification: "Sócio-Administrador",
    })
    expect(joao?.joinedAt).toBeInstanceOf(Date)
  })

  it("returns null and skips DB writes for unknown CNPJs", async () => {
    const result = await ingestCompany(UNKNOWN_CNPJ)
    expect(result).toBeNull()
    expect(mockUpsertCompany).not.toHaveBeenCalled()
    expect(mockUpsertCompanyPartners).not.toHaveBeenCalled()
  })

  it("re-running ingest does not duplicate work upstream when the cache is warm", async () => {
    await ingestCompany(SAMPLE_CNPJ)
    server.use(
      http.get("https://api.opencnpj.org/:cnpj", () => {
        throw new Error("upstream should not be called on cache hit")
      }),
    )
    const second = await ingestCompany(SAMPLE_CNPJ)
    expect(second?.legalName).toBe("ACME COMERCIO E SERVICOS LTDA")
    // DB upserts are still invoked on every ingest — that is intentional, as
    // the caller is asking us to refresh the partner snapshot.
    expect(mockUpsertCompany).toHaveBeenCalledTimes(2)
    expect(mockUpsertCompanyPartners).toHaveBeenCalledTimes(2)
  })
})
