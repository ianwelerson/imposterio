/**
 * @file camara.test.ts
 * @description Tests for the Câmara dos Deputados fetchers.
 *
 * All external API calls are intercepted by MSW (configured in vitest.setup.ts).
 * Redis is mocked via vi.mock so tests exercise the fetch→parse→map pipeline
 * without requiring a live cache connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { MOCK_DEPUTIES_LIST, MOCK_DEPUTY_DETAIL_204554, MOCK_EXPENSES_204554 } from "./mocks/handlers"

// Set fake Redis env vars so the cache layer is enabled in tests.
// The actual Redis client is mocked below — no real connection is made.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io"
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"

// Mock the Redis client so cachedFetch uses the mock instead of a real
// connection. This isolates the fetcher logic.
const mockRedisGet = vi.fn().mockResolvedValue(null)
const mockRedisSet = vi.fn().mockResolvedValue("OK")

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
  })),
}))

// Import after mocks are set up
const { getDeputiesList, getDeputyDetail, getDeputyExpenses } = await import("./camara")

describe("getDeputiesList", () => {
  beforeEach(() => {
    mockRedisGet.mockReset()
    mockRedisSet.mockReset()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue("OK")
  })

  it("returns all deputies from the API with normalized fields", async () => {
    const deputies = await getDeputiesList()

    expect(deputies).toHaveLength(MOCK_DEPUTIES_LIST.dados.length)
    expect(deputies[0]).toMatchObject({
      id: "204554",
      name: "Maria Silva",
      party: "PT",
      uf: "SP",
      legislature: 57,
    })
  })

  it("converts numeric API id to string", async () => {
    const deputies = await getDeputiesList()

    expect(typeof deputies[0].id).toBe("string")
    expect(deputies[0].id).toBe("204554")
  })

  it("injects _source field with the exact API URL", async () => {
    const deputies = await getDeputiesList()

    expect(deputies._source).toBe(
      "https://dadosabertos.camara.leg.br/api/v2/deputados",
    )
  })

  it("maps photoUrl and email, converting empty strings to undefined", async () => {
    const deputies = await getDeputiesList()

    // Deputy with valid email
    expect(deputies[0].photoUrl).toBe(
      "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
    )
    expect(deputies[0].email).toBe("dep.mariasilva@camara.leg.br")

    // Deputy with empty email string
    const anaOliveira = deputies.find((d) => d.id === "160623")
    expect(anaOliveira?.email).toBeUndefined()
  })

  it("caches the response in Redis with the correct TTL", async () => {
    await getDeputiesList()

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://dadosabertos.camara.leg.br/api/v2/deputados",
      expect.any(String),
      { ex: 60 * 60 * 24 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    // Simulate a cache hit: Redis returns the previously stored JSON
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(MOCK_DEPUTIES_LIST))

    const deputies = await getDeputiesList()

    // Should still return valid data from cache
    expect(deputies).toHaveLength(MOCK_DEPUTIES_LIST.dados.length)
    expect(deputies._source).toBe(
      "https://dadosabertos.camara.leg.br/api/v2/deputados",
    )
    // Redis.set should NOT be called since we got a cache hit
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getDeputyDetail", () => {
  beforeEach(() => {
    mockRedisGet.mockReset()
    mockRedisSet.mockReset()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue("OK")
  })

  it("returns a detailed deputy profile with normalized fields", async () => {
    const deputy = await getDeputyDetail("204554")

    expect(deputy).toMatchObject({
      id: "204554",
      name: "Maria Silva",
      party: "PT",
      uf: "SP",
      fullName: "MARIA DA CONCEIÇÃO SILVA",
      birthDate: "1975-03-15",
      education: "Superior",
      legislature: 57,
    })
  })

  it("injects _source field with the exact detail URL", async () => {
    const deputy = await getDeputyDetail("204554")

    expect(deputy._source).toBe(
      "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
    )
  })

  it("flattens ultimoStatus fields into the top-level object", async () => {
    const deputy = await getDeputyDetail("204554")

    // These come from ultimoStatus, not the top-level dados
    expect(deputy.party).toBe("PT")
    expect(deputy.uf).toBe("SP")
    expect(deputy.photoUrl).toBe(
      "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
    )
  })

  it("builds a readable office string from gabinete fields", async () => {
    const deputy = await getDeputyDetail("204554")

    // gabinete: { nome: "730", predio: "Anexo IV", sala: "730" }
    expect(deputy.office).toContain("Anexo IV")
    expect(deputy.office).toContain("730")
  })

  it("formats birthPlace as 'city, UF'", async () => {
    const deputy = await getDeputyDetail("204554")

    expect(deputy.birthPlace).toBe("São Paulo, SP")
  })

  it("throws a descriptive error for non-existent deputy IDs", async () => {
    await expect(getDeputyDetail("999999")).rejects.toThrow(/404/)
  })

  it("caches the response in Redis with the correct TTL", async () => {
    await getDeputyDetail("204554")

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
      expect.any(String),
      { ex: 60 * 60 * 24 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    mockRedisGet.mockResolvedValueOnce(
      JSON.stringify(MOCK_DEPUTY_DETAIL_204554),
    )

    const deputy = await getDeputyDetail("204554")

    expect(deputy.fullName).toBe("MARIA DA CONCEIÇÃO SILVA")
    expect(deputy._source).toBe(
      "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
    )
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getDeputyExpenses", () => {
  beforeEach(() => {
    mockRedisGet.mockReset()
    mockRedisSet.mockReset()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue("OK")
  })

  it("returns expenses with normalized fields", async () => {
    const expenses = await getDeputyExpenses("204554", 2024)

    expect(expenses).toHaveLength(MOCK_EXPENSES_204554.dados.length)
    // Sorted by date descending — March 15 should be first
    expect(expenses[0]).toMatchObject({
      date: "2024-03-15T00:00:00",
      type: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR",
      supplierName: "Gráfica Nacional LTDA",
      document: "NF-2024-001",
      supplierDocument: "12345678000190",
      value: 15200.0,
    })
  })

  it("sorts expenses by date descending (most recent first)", async () => {
    const expenses = await getDeputyExpenses("204554", 2024)

    const dates = expenses.map((e) => new Date(e.date).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1])
    }
  })

  it("injects _source with the exact URL including query params", async () => {
    const expenses = await getDeputyExpenses("204554", 2024)

    expect(expenses._source).toContain("deputados/204554/despesas")
    expect(expenses._source).toContain("ano=2024")
  })

  it("includes month parameter in URL when provided", async () => {
    const expenses = await getDeputyExpenses("204554", 2024, 3)

    expect(expenses._source).toContain("ano=2024")
    expect(expenses._source).toContain("mes=3")
  })

  it("uses valorLiquido (net value after deductions) as the expense value", async () => {
    const expenses = await getDeputyExpenses("204554", 2024)

    expect(expenses[0].value).toBe(MOCK_EXPENSES_204554.dados[0].valorLiquido)
  })

  it("returns empty array for deputies with no expenses", async () => {
    const expenses = await getDeputyExpenses("999999", 2024)

    expect(expenses).toHaveLength(0)
    expect(expenses._source).toContain("deputados/999999/despesas")
  })

  it("caches the response in Redis with the correct TTL", async () => {
    await getDeputyExpenses("204554", 2024)

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining("deputados/204554/despesas?ano=2024"),
      expect.any(String),
      { ex: 60 * 60 * 6 },
    )
  })
})
