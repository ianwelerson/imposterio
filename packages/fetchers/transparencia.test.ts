/**
 * @file transparencia.test.ts
 * @description Tests for the Portal da Transparência fetchers.
 *
 * External calls are intercepted by MSW (configured in vitest.setup.ts).
 * Redis and the empresas DB queries are mocked so this suite exercises the
 * fetch → map → side-effect pipeline without booting Postgres.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { http, HttpResponse } from "msw"

import { MOCK_TRANSP_CONTRACTS_11222333000181 } from "./mocks/handlers"
import { server } from "./mocks/server"

// Set fake env vars so the cache + auth-header layers are exercised in tests.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io"
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"
process.env.TRANSPARENCIA_API_KEY = "fake-portal-key"

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

// Mock the DB queries module so the side-effect path (recordCompanyTransaction)
// does not require Postgres. The mock is asserted against in the dedicated
// "side effect" tests below.
const mockRecordCompanyTransaction = vi.fn(async () => undefined)
vi.mock("@imposterio/db/queries/companies", () => ({
  recordCompanyTransaction: mockRecordCompanyTransaction,
}))

// Mock OpenCNPJ so the backfill side-effect inside recordContractTransactions
// does not touch the upstream API or the negative-cache Redis key.
vi.mock("./opencnpj", () => ({
  ingestCompany: vi.fn(async () => null),
  getCompanyDetail: vi.fn(async () => null),
}))

// Import after mocks are set up so the module-level singletons resolve to
// the mocked clients.
const { getContracts } = await import("./transparencia")

const SAMPLE_CNPJ = "11222333000181"
const FORMATTED_CNPJ = "11.222.333/0001-81"

const CONTRACTS_URL = (qs: string) =>
  `https://api.portaldatransparencia.gov.br/api-de-dados/contratos?${qs}`

describe("getContracts", () => {
  beforeEach(() => {
    redisStore.clear()
    mockRedisGet.mockClear()
    mockRedisSet.mockClear()
    mockRedisDel.mockClear()
    mockRecordCompanyTransaction.mockClear()
    mockRecordCompanyTransaction.mockResolvedValue(undefined)
  })

  it("strips punctuation from the cnpj filter and includes pagina=1 by default", async () => {
    let observedUrl = ""
    server.use(
      http.get(
        "https://api.portaldatransparencia.gov.br/api-de-dados/contratos",
        ({ request }) => {
          observedUrl = request.url
          return HttpResponse.json(MOCK_TRANSP_CONTRACTS_11222333000181)
        },
      ),
    )

    await getContracts({ cnpj: FORMATTED_CNPJ })

    const params = new URL(observedUrl).searchParams
    expect(params.get("cnpjContratada")).toBe(SAMPLE_CNPJ)
    expect(params.get("pagina")).toBe("1")
  })

  it("sends the chave-api-dados header from the env", async () => {
    let observedHeader: string | null = null
    server.use(
      http.get(
        "https://api.portaldatransparencia.gov.br/api-de-dados/contratos",
        ({ request }) => {
          observedHeader = request.headers.get("chave-api-dados")
          return HttpResponse.json(MOCK_TRANSP_CONTRACTS_11222333000181)
        },
      ),
    )

    await getContracts({ cnpj: SAMPLE_CNPJ })

    expect(observedHeader).toBe("fake-portal-key")
  })

  it("maps the raw payload into the GovernmentContract shape", async () => {
    const contracts = await getContracts({ cnpj: SAMPLE_CNPJ })

    expect(contracts).toHaveLength(MOCK_TRANSP_CONTRACTS_11222333000181.length)

    const first = contracts.find((c) => c.id === "9001")
    expect(first).toMatchObject({
      number: "10/2024",
      supplierName: "ACME COMERCIO E SERVICOS LTDA",
      supplierCnpj: SAMPLE_CNPJ,
      agency: "Ministério da Educação",
      agencyCode: "26000",
      managingUnitCode: "200999",
      modality: "Pregão Eletrônico",
      status: "ATIVO",
      signatureDate: "2024-02-15",
      startDate: "2024-03-01",
      endDate: "2025-03-01",
      initialValue: 250000,
      currentValue: 250000,
      linkPdt: "https://portaldatransparencia.gov.br/contratos/numero?id=9001",
    })
  })

  it("normalizes DD/MM/YYYY dates to ISO YYYY-MM-DD", async () => {
    const contracts = await getContracts({ cnpj: SAMPLE_CNPJ })
    const second = contracts.find((c) => c.id === "9002")
    expect(second?.signatureDate).toBe("2023-06-15")
    expect(second?.startDate).toBe("2023-07-01")
    expect(second?.endDate).toBe("2024-06-30")
  })

  it("falls back to initialValue when valorFinalCompra is missing or zero", async () => {
    const contracts = await getContracts({ cnpj: SAMPLE_CNPJ })
    const fallback = contracts.find((c) => c.id === "9003")
    // valorInicialCompra arrives as "12.500,00" — comma decimals.
    expect(fallback?.initialValue).toBeCloseTo(12500)
    expect(fallback?.currentValue).toBeCloseTo(12500)
  })

  it("injects _source field with the exact request URL", async () => {
    const contracts = await getContracts({ cnpj: SAMPLE_CNPJ })
    expect(contracts._source).toBe(
      CONTRACTS_URL(`cnpjContratada=${SAMPLE_CNPJ}&pagina=1`),
    )
  })

  it("returns an empty array (not an error) when the upstream has no rows", async () => {
    const contracts = await getContracts({ cnpj: "00000000000000" })
    expect(contracts).toHaveLength(0)
    // Even an empty-array response carries the source URL so the UI can
    // still link out to the official query.
    expect(contracts._source).toContain("cnpjContratada=00000000000000")
  })

  it("serves from Redis cache on the second call without hitting upstream", async () => {
    await getContracts({ cnpj: SAMPLE_CNPJ })
    const cacheKey = CONTRACTS_URL(
      `cnpjContratada=${SAMPLE_CNPJ}&pagina=1`,
    )
    expect(redisStore.has(cacheKey)).toBe(true)

    server.use(
      http.get(
        "https://api.portaldatransparencia.gov.br/api-de-dados/contratos",
        () => {
          throw new Error("upstream should not be called on cache hit")
        },
      ),
    )

    const cached = await getContracts({ cnpj: SAMPLE_CNPJ })
    expect(cached).toHaveLength(MOCK_TRANSP_CONTRACTS_11222333000181.length)
  })

  // ── EMPRESAS-PLAN.md §5 Phase E7: contracts → CompanyTransaction side effect ──

  it("records each contract row as a CompanyTransaction with type=contract", async () => {
    await getContracts({ cnpj: SAMPLE_CNPJ })

    expect(mockRecordCompanyTransaction).toHaveBeenCalledTimes(
      MOCK_TRANSP_CONTRACTS_11222333000181.length,
    )

    for (const call of mockRecordCompanyTransaction.mock.calls) {
      expect(call[0]).toMatchObject({
        type: "contract",
        cnpj: SAMPLE_CNPJ,
        sourceUrl: expect.stringContaining(`cnpjContratada=${SAMPLE_CNPJ}`),
      })
    }

    const first = mockRecordCompanyTransaction.mock.calls.find(
      (c) => c[0].sourceKey === "9001",
    )
    expect(first?.[0]).toMatchObject({
      cnpj: SAMPLE_CNPJ,
      value: 250000,
      year: 2024,
      month: 2,
      counterparty: "agency:26000",
    })
  })

  it("does not throw when the DB layer fails — public-data page must keep rendering", async () => {
    mockRecordCompanyTransaction.mockRejectedValue(new Error("db down"))
    await expect(
      getContracts({ cnpj: SAMPLE_CNPJ }),
    ).resolves.toHaveLength(MOCK_TRANSP_CONTRACTS_11222333000181.length)
  })
})
