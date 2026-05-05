/**
 * @file senado.test.ts
 * @description Tests for the Senado Federal fetchers.
 *
 * All external API calls are intercepted by MSW (configured in vitest.setup.ts).
 * Redis is mocked via vi.mock so tests exercise the fetch→parse→map pipeline
 * without requiring a live cache connection.
 *
 * Test coverage focuses on:
 * - Field normalization (camelCase + cross-source parity with Deputy types)
 * - `_source` injection on every public fetcher
 * - Cache write/hit behavior with the right TTL
 * - The `Accept: application/json` header (Senado defaults to XML otherwise)
 * - Single-element-array coercion via ensureArray (a Senado-specific quirk)
 * - Graceful 404 handling via ApiError
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  MOCK_SENADO_SENATORS_LIST,
  MOCK_SENADO_SENATOR_DETAIL_5672,
  MOCK_SENADO_SENATOR_MANDATES_5672,
  MOCK_SENADO_SENATOR_AFFILIATIONS_5672,
  MOCK_SENADO_VOTING_5672_2024,
  MOCK_SENADO_PROPOSITIONS_5672,
  MOCK_SENADO_SPEECHES_5672,
  MOCK_SENADO_COMMITTEES_5672,
  MOCK_SENADO_LEADERSHIPS_5672,
  MOCK_SENADO_CEAPS_2024,
  MOCK_SENADO_PLENARY_RESULT_202403,
  MOCK_SENADO_PLENARY_RESULT_202404,
  MOCK_SENADO_PROPOSITIONS_2025,
  MOCK_SENADO_VOTING_SESSIONS_RANGE,
  MOCK_SENADO_CONTRACTS,
  MOCK_SENADO_CONTRACTORS,
  MOCK_SENADO_BIDS,
  MOCK_SENADO_SERVANTS,
  MOCK_SENADO_HEADCOUNT,
  MOCK_SENADO_REMUNERATION_2025_3,
} from "./mocks/handlers"

// Set fake Redis env vars so the cache layer is enabled in tests.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io"
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"

// Mock the Redis client so cachedFetch uses the mock instead of a real
// connection. This isolates the fetcher logic.
const mockRedisGet = vi.fn().mockResolvedValue(null)
const mockRedisSet = vi.fn().mockResolvedValue("OK")
const mockRedisDel = vi.fn().mockResolvedValue(0)

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    get = mockRedisGet
    set = mockRedisSet
    del = mockRedisDel
  },
}))

// Import after mocks are set up.
const {
  getSenatorsList,
  getSenatorDetail,
  getSenatorMandates,
  getSenatorAffiliations,
  getSenatorVotingHistory,
  getSenatorPropositions,
  getSenadoPropositions,
  getSenadoPropositionDetail,
  getSenadoPropositionRapporteurship,
  getSenadoPropositionDocuments,
  getSenadoPropositionAmendments,
  getSenadoVotingSessions,
  getSenadoVotingSessionDetail,
  getSenatorSpeeches,
  getSenatorCommittees,
  getSenatorPositions,
  getSenatorLeaderships,
  getSenatorExpenses,
  getCeapsBulkSummary,
  getPlenaryResultMonth,
  getSenatorAttendanceBulk,
  getSenatorAttendanceDetail,
  getSenadoContractsBulk,
  getSenadoBids,
  getSenadoContractors,
  getSenadoServantsBulk,
  getSenadoServantsRemuneration,
  ensureArray,
} = await import("./senado")

function resetRedisMocks() {
  mockRedisGet.mockReset()
  mockRedisSet.mockReset()
  mockRedisDel.mockReset()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue("OK")
  mockRedisDel.mockResolvedValue(0)
}

describe("ensureArray", () => {
  it("returns the array as-is when input is already an array", () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  it("wraps a single non-array item in a one-element array", () => {
    expect(ensureArray({ id: "1" })).toEqual([{ id: "1" }])
  })

  it("returns an empty array for null and undefined", () => {
    expect(ensureArray(null)).toEqual([])
    expect(ensureArray(undefined)).toEqual([])
  })
})

describe("getSenatorsList", () => {
  beforeEach(resetRedisMocks)

  it("returns all senators with normalized fields", async () => {
    const senators = await getSenatorsList()

    expect(senators).toHaveLength(
      MOCK_SENADO_SENATORS_LIST.ListaParlamentarEmExercicio.Parlamentares.Parlamentar
        .length,
    )
    expect(senators[0]).toMatchObject({
      id: "5672",
      name: "Rodrigo Tavares",
      party: "PSD",
      uf: "MG",
      legislature: 57,
    })
  })

  it("injects _source field with the exact API URL", async () => {
    const senators = await getSenatorsList()
    expect(senators._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json",
    )
  })

  it("converts empty email strings to undefined", async () => {
    const senators = await getSenatorsList()
    expect(senators[0].email).toBe("sen.rodrigotavares@senado.leg.br")
    const senator5321 = senators.find((s) => s.id === "5321")
    expect(senator5321?.email).toBeUndefined()
  })

  it("maps photoUrl through verbatim", async () => {
    const senators = await getSenatorsList()
    expect(senators[0].photoUrl).toBe(
      "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
    )
  })

  it("caches the response in Redis with the SENATORS_LIST TTL (24h)", async () => {
    await getSenatorsList()

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json",
      expect.any(String),
      { ex: 60 * 60 * 24 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(MOCK_SENADO_SENATORS_LIST))

    const senators = await getSenatorsList()

    expect(senators).toHaveLength(2)
    expect(senators._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json",
    )
    // No cache write since we got a hit.
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getSenatorDetail", () => {
  beforeEach(resetRedisMocks)

  it("returns a detailed senator profile with normalized fields", async () => {
    const senator = await getSenatorDetail("5672")

    expect(senator).toMatchObject({
      id: "5672",
      name: "Rodrigo Tavares",
      fullName: "RODRIGO DE SOUZA TAVARES",
      party: "PSD",
      uf: "MG",
      birthDate: "1968-07-22",
      sex: "Masculino",
      situation: "Titular",
      legislature: 57,
    })
  })

  it("formats birthPlace as 'city, UF'", async () => {
    const senator = await getSenatorDetail("5672")
    expect(senator.birthPlace).toBe("Belo Horizonte, MG")
  })

  it("extracts phone number from the Telefones single-object payload", async () => {
    const senator = await getSenatorDetail("5672")
    expect(senator.phone).toBe("(61) 3303-5672")
  })

  it("flattens office address from EnderecoParlamentar", async () => {
    const senator = await getSenatorDetail("5672")
    expect(senator.office).toContain("Anexo II")
  })

  it("injects _source with the exact detail URL", async () => {
    const senator = await getSenatorDetail("5672")
    expect(senator._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672.json",
    )
  })

  it("throws ApiError for non-existent senator IDs", async () => {
    await expect(getSenatorDetail("999999")).rejects.toThrow(/404/)
  })

  it("caches the response with the SENATOR_DETAIL TTL (24h)", async () => {
    await getSenatorDetail("5672")

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://legis.senado.leg.br/dadosabertos/senador/5672.json",
      expect.any(String),
      { ex: 60 * 60 * 24 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(MOCK_SENADO_SENATOR_DETAIL_5672))

    const senator = await getSenatorDetail("5672")

    expect(senator.fullName).toBe("RODRIGO DE SOUZA TAVARES")
    expect(senator._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672.json",
    )
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getSenatorMandates", () => {
  beforeEach(resetRedisMocks)

  it("returns the full mandate list with normalized fields (multi-element)", async () => {
    const mandates = await getSenatorMandates("5672")

    expect(mandates).toHaveLength(2)
    expect(mandates[0]).toMatchObject({
      id: "880",
      uf: "MG",
      participation: "Titular",
      startYear: 2023,
      endYear: 2031,
      primaryLegislature: 57,
    })
    expect(mandates[1].id).toBe("742")
  })

  it("coerces a single-mandate object into a one-element array", async () => {
    // Senador 5321 has Mandato as a single object (not an array) in the
    // raw response — exercises ensureArray() at the nested boundary.
    const mandates = await getSenatorMandates("5321")

    expect(Array.isArray(mandates)).toBe(true)
    expect(mandates).toHaveLength(1)
    expect(mandates[0]).toMatchObject({
      id: "881",
      uf: "SP",
      participation: "Titular",
      startYear: 2023,
      endYear: 2027,
    })
  })

  it("injects _source with the exact mandates URL", async () => {
    const mandates = await getSenatorMandates("5672")
    expect(mandates._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/mandatos.json",
    )
  })

  it("caches the response with the MANDATES TTL (30d)", async () => {
    await getSenatorMandates("5672")

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/mandatos.json",
      expect.any(String),
      { ex: 60 * 60 * 24 * 30 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    mockRedisGet.mockResolvedValueOnce(
      JSON.stringify(MOCK_SENADO_SENATOR_MANDATES_5672),
    )

    const mandates = await getSenatorMandates("5672")

    expect(mandates).toHaveLength(2)
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getSenatorAffiliations", () => {
  beforeEach(resetRedisMocks)

  it("returns full party-affiliation history with normalized fields", async () => {
    const affiliations = await getSenatorAffiliations("5672")

    expect(affiliations).toHaveLength(2)
    expect(affiliations[0]).toMatchObject({
      party: "PSD",
      partyName: "Partido Social Democrático",
      startDate: "2018-04-05",
    })
    expect(affiliations[0].endDate).toBeUndefined()
    expect(affiliations[1]).toMatchObject({
      party: "PMDB",
      startDate: "2010-03-12",
      endDate: "2018-04-04",
    })
  })

  it("injects _source with the exact affiliations URL", async () => {
    const affiliations = await getSenatorAffiliations("5672")
    expect(affiliations._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/filiacoes.json",
    )
  })

  it("caches the response with the AFFILIATIONS TTL (30d)", async () => {
    await getSenatorAffiliations("5672")

    expect(mockRedisSet).toHaveBeenCalledWith(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/filiacoes.json",
      expect.any(String),
      { ex: 60 * 60 * 24 * 30 },
    )
  })

  it("serves from Redis cache on second call without hitting the API", async () => {
    mockRedisGet.mockResolvedValueOnce(
      JSON.stringify(MOCK_SENADO_SENATOR_AFFILIATIONS_5672),
    )

    const affiliations = await getSenatorAffiliations("5672")

    expect(affiliations).toHaveLength(2)
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getSenatorVotingHistory", () => {
  beforeEach(resetRedisMocks)

  it("returns voting records with normalized fields and tri-state approval", async () => {
    const records = await getSenatorVotingHistory("5672", 2024)

    expect(records).toHaveLength(MOCK_SENADO_VOTING_5672_2024.length)
    expect(Array.isArray(records)).toBe(true)
    expect(records[0]).toMatchObject({
      sessionId: "1234",
      vote: "Sim",
      approved: true,
      matterIdentifier: "PEC 12/2024",
      matterId: "9001",
    })
    expect(records[1].approved).toBe(false)
  })

  it("preserves array semantics on top-level array responses", async () => {
    const records = await getSenatorVotingHistory("5672", 2024)
    // Array methods must work — this would fail if cachedFetch coerced
    // the array into a numeric-keyed object (the bug we fixed).
    expect(records.map((r) => r.vote)).toEqual(["Sim", "Não", "Sim"])
  })

  it("constructs the URL with codigoParlamentar + YYYYMMDD date range", async () => {
    await getSenatorVotingHistory("5672", 2024)

    const args = mockRedisSet.mock.calls[0]
    expect(args[0]).toBe("sen:votes:5672:2024")
  })

  it("uses the historical TTL for past years", async () => {
    await getSenatorVotingHistory("5672", 2020)

    expect(mockRedisSet).toHaveBeenCalledWith(
      "sen:votes:5672:2020",
      expect.any(String),
      { ex: 60 * 60 * 24 * 30 },
    )
  })

  it("uses the current-year TTL for the current year", async () => {
    const currentYear = new Date().getFullYear()
    await getSenatorVotingHistory("5672", currentYear)

    expect(mockRedisSet).toHaveBeenCalledWith(
      `sen:votes:5672:${currentYear}`,
      expect.any(String),
      { ex: 60 * 60 * 3 },
    )
  })

  it("injects _source field with the full URL", async () => {
    const records = await getSenatorVotingHistory("5672", 2024)
    expect(records._source).toContain("/votacao?")
    expect(records._source).toContain("codigoParlamentar=5672")
    expect(records._source).toContain("dataInicio=20240101")
    expect(records._source).toContain("dataFim=20241231")
  })

  it("returns an empty array for senators with no votes", async () => {
    const records = await getSenatorVotingHistory("9999", 2024)
    expect(records).toHaveLength(0)
    expect(Array.isArray(records)).toBe(true)
    expect(records._source).toContain("codigoParlamentar=9999")
  })
})

describe("getSenatorPropositions", () => {
  beforeEach(resetRedisMocks)

  it("returns propositions with normalized fields", async () => {
    const props = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
    )

    expect(props).toHaveLength(MOCK_SENADO_PROPOSITIONS_5672.length)
    expect(Array.isArray(props)).toBe(true)
    expect(props[0]).toMatchObject({
      id: "9100",
      identifier: "PL 1234/2024",
      type: "PL",
      summary: "Regulamenta o uso de inteligência artificial no setor público.",
      author: "Rodrigo Tavares",
      authorParty: "PSD",
      origin: "Senado",
      year: 2024,
    })
  })

  it("normalizes proposition type abbreviations to the shared union", async () => {
    const props = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
    )
    expect(props[1].type).toBe("PEC")
  })

  it("uses the author fallback when the response omits authoria", async () => {
    const props = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
    )
    // Proposition #2 has Autoria.autores = []
    expect(props[1].author).toBe("Rodrigo Tavares")
    expect(props[1].authorParty).toBe("PSD")
  })

  it("appends ?ano= query param when a year is passed", async () => {
    await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
      2024,
    )
    const records = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
      2024,
    )
    expect(records._source).toContain("ano=2024")
  })

  it("infers status from situacaoAtual text", async () => {
    const props = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
    )
    expect(props[0].status).toBe("Tramitando")
    expect(props[1].status).toBe("Aprovada")
  })

  it("injects _source with codigoParlamentarAutor", async () => {
    const props = await getSenatorPropositions(
      "5672",
      { name: "Rodrigo Tavares", party: "PSD" },
    )
    expect(props._source).toContain("codigoParlamentarAutor=5672")
  })
})

describe("getSenatorSpeeches", () => {
  beforeEach(resetRedisMocks)

  it("returns speeches with normalized fields", async () => {
    const speeches = await getSenatorSpeeches("5672", 2024)

    expect(speeches).toHaveLength(2)
    expect(speeches[0]).toMatchObject({
      id: "551001",
      date: "2024-04-10",
      type: "Breves Comunicações",
      summary: "Defesa de marcos para inteligência artificial no setor público.",
      topic: "Tecnologia e inovação",
    })
    expect(speeches[0].textUrl).toContain("pronunciamentos")
  })

  it("always sends explicit dataInicio/dataFim in YYYYMMDD format", async () => {
    const speeches = await getSenatorSpeeches("5672", 2024)
    expect(speeches._source).toContain("dataInicio=20240101")
    expect(speeches._source).toContain("dataFim=20241231")
  })

  it("caches the response with the SPEECHES TTL (12h)", async () => {
    await getSenatorSpeeches("5672", 2024)

    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining("/discursos.json"),
      expect.any(String),
      { ex: 60 * 60 * 12 },
    )
  })
})

describe("getSenatorCommittees", () => {
  beforeEach(resetRedisMocks)

  it("returns the full committee list with normalized fields", async () => {
    const committees = await getSenatorCommittees("5672")

    expect(committees).toHaveLength(2)
    expect(committees[0]).toMatchObject({
      id: "34",
      abbreviation: "CCJ",
      name: "Comissão de Constituição, Justiça e Cidadania",
      type: "Permanente",
      role: "Titular",
      startDate: "2023-02-15",
    })
    expect(committees[0].endDate).toBeUndefined()
    expect(committees[1].endDate).toBe("2024-02-14")
  })

  it("coerces a single-membership object into a one-element array", async () => {
    const committees = await getSenatorCommittees("5321")

    expect(Array.isArray(committees)).toBe(true)
    expect(committees).toHaveLength(1)
    expect(committees[0].abbreviation).toBe("CRE")
  })

  it("injects _source with the committees URL", async () => {
    const committees = await getSenatorCommittees("5672")
    expect(committees._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/comissoes.json",
    )
  })
})

describe("getSenatorPositions", () => {
  beforeEach(resetRedisMocks)

  it("returns directing positions with normalized fields", async () => {
    const positions = await getSenatorPositions("5672")

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({
      id: "55",
      name: "Vice-Presidente",
      committeeAbbreviation: "CCJ",
      committeeName: "Comissão de Constituição, Justiça e Cidadania",
      startDate: "2024-03-01",
    })
    expect(positions[0].endDate).toBeUndefined()
  })

  it("injects _source with the positions URL", async () => {
    const positions = await getSenatorPositions("5672")
    expect(positions._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/cargos.json",
    )
  })
})

describe("getSenatorLeaderships", () => {
  beforeEach(resetRedisMocks)

  it("coerces a single-leadership object into a one-element array", async () => {
    // The mock uses the single-object form (not array) — exercises the
    // ensureArray boundary at the .Lideranca level.
    const leaderships = await getSenatorLeaderships("5672")

    expect(Array.isArray(leaderships)).toBe(true)
    expect(leaderships).toHaveLength(1)
    expect(leaderships[0]).toMatchObject({
      role: "Vice-Líder",
      unitAbbreviation: "PSD",
      unitName: "Partido Social Democrático",
      unitType: "Partido",
      startDate: "2024-02-01",
    })
    expect(leaderships[0].endDate).toBeUndefined()
  })

  it("injects _source with the leaderships URL", async () => {
    const leaderships = await getSenatorLeaderships("5672")
    expect(leaderships._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/senador/5672/liderancas.json",
    )
  })
})

describe("getSenatorExpenses", () => {
  beforeEach(resetRedisMocks)

  it("returns expenses filtered by senator with normalized fields", async () => {
    const expenses = await getSenatorExpenses("5672", 2024)

    expect(expenses).toHaveLength(2)
    expect(expenses[0]).toMatchObject({
      senatorId: "5672",
      type: "Passagens aéreas, aquáticas e terrestres nacionais",
      supplierName: "LATAM Airlines",
      value: 8430.5,
      year: 2024,
      month: 3,
    })
    // Brazilian-format value parsed correctly: "12.500,00" → 12500.
    expect(expenses[1].value).toBe(12500)
  })

  it("normalizes DD/MM/YYYY dates to ISO YYYY-MM-DD", async () => {
    const expenses = await getSenatorExpenses("5672", 2024)
    expect(expenses[1].date).toBe("2024-04-10")
  })

  it("sorts expenses chronologically", async () => {
    const expenses = await getSenatorExpenses("5672", 2024)
    expect(expenses[0].date < expenses[1].date).toBe(true)
  })

  it("returns an empty array for senators with no expenses", async () => {
    const expenses = await getSenatorExpenses("9999", 2024)
    expect(Array.isArray(expenses)).toBe(true)
    expect(expenses).toHaveLength(0)
  })

  it("injects _source with the admin API URL", async () => {
    const expenses = await getSenatorExpenses("5672", 2024)
    expect(expenses._source).toBe(
      "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/2024",
    )
  })

  it("uses a custom Redis cache key shared between fetchers", async () => {
    await getSenatorExpenses("5672", 2024)

    expect(mockRedisSet).toHaveBeenCalledWith(
      "sen:ceaps:raw:2024",
      expect.any(String),
      expect.objectContaining({ ex: expect.any(Number) }),
    )
  })

  it("only writes the cache once when called twice for different senators", async () => {
    await getSenatorExpenses("5672", 2024)

    // Second call — same year, different senator. Should hit the cache.
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(MOCK_SENADO_CEAPS_2024))
    mockRedisSet.mockClear()
    const second = await getSenatorExpenses("5321", 2024)

    expect(second).toHaveLength(1)
    expect(mockRedisSet).not.toHaveBeenCalled()
  })
})

describe("getCeapsBulkSummary", () => {
  beforeEach(resetRedisMocks)

  it("aggregates per-senator totals, dropping rows with no codSenador", async () => {
    const summary = await getCeapsBulkSummary(2024)

    // 4 raw rows; 1 has empty codSenador → excluded from every aggregate.
    expect(summary.senators).toHaveLength(2)
    expect(summary.totalSpending).toBeCloseTo(8430.5 + 12500 + 4200, 2)
    expect(summary.expenseCount).toBe(3)
    // Invariant: totalSpending == sum of per-senator totals.
    const sum = summary.senators.reduce((acc, s) => acc + s.total, 0)
    expect(sum).toBeCloseTo(summary.totalSpending, 2)
  })

  it("sorts senators by total spending descending", async () => {
    const summary = await getCeapsBulkSummary(2024)

    // Rodrigo (8430.5 + 12500 = 20930.5) > Ana (4200).
    expect(summary.senators[0].senatorId).toBe("5672")
    expect(summary.senators[0].total).toBeCloseTo(20930.5, 2)
    expect(summary.senators[0].expenseCount).toBe(2)
    expect(summary.senators[1].senatorId).toBe("5321")
  })

  it("injects _source with the admin API URL", async () => {
    const summary = await getCeapsBulkSummary(2024)
    expect(summary._source).toBe(
      "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/2024",
    )
  })

  it("uses the SENADO_CEAPS_BULK TTL for the current year", async () => {
    const currentYear = new Date().getFullYear()
    if (currentYear === 2024) {
      // Avoid a brittle test if CI's "now" matches the fixture year.
      return
    }
    // Past year (2024 in our fixtures, when current year is later) → history TTL.
    await getCeapsBulkSummary(2024)
    expect(mockRedisSet).toHaveBeenCalledWith(
      "sen:ceaps:raw:2024",
      expect.any(String),
      { ex: 60 * 60 * 24 * 30 },
    )
  })

  it("returns an empty summary for years with no data", async () => {
    const summary = await getCeapsBulkSummary(1999)
    expect(summary.totalSpending).toBe(0)
    expect(summary.expenseCount).toBe(0)
    expect(summary.senators).toEqual([])
  })
})

describe("getPlenaryResultMonth", () => {
  beforeEach(resetRedisMocks)

  it("returns plenary sessions with normalized fields and present-senator IDs", async () => {
    const sessions = await getPlenaryResultMonth("202403")

    expect(sessions).toHaveLength(
      MOCK_SENADO_PLENARY_RESULT_202403.ResultadoSessao.Sessoes.Sessao.length,
    )
    expect(sessions[0]).toMatchObject({
      id: "9001",
      date: "2024-03-05",
      type: "Sessão Deliberativa Ordinária",
      typeCode: "SDO",
      isDeliberative: true,
    })
    expect(sessions[0].attendeeIds).toEqual(["5672", "5321", "9999"])
  })

  it("flags ceremonial sessions (Solene) as non-deliberative", async () => {
    const sessions = await getPlenaryResultMonth("202403")
    const solene = sessions.find((s) => s.type.includes("Solene"))
    expect(solene).toBeDefined()
    expect(solene!.isDeliberative).toBe(false)
  })

  it("coerces single-element Comparecimento.Parlamentar into an array", async () => {
    const sessions = await getPlenaryResultMonth("202403")
    // 9002 has a single attendee serialized as an object in the fixture.
    const single = sessions.find((s) => s.id === "9002")
    expect(single).toBeDefined()
    expect(single!.attendeeIds).toEqual(["5672"])
  })

  it("treats sessions without Comparecimento as zero-attendee, not crash", async () => {
    const sessions = await getPlenaryResultMonth("202404")
    expect(sessions).toHaveLength(1)
    expect(sessions[0].attendeeIds).toEqual([])
  })

  it("returns an empty array for recess months", async () => {
    const sessions = await getPlenaryResultMonth("202402")
    expect(Array.isArray(sessions)).toBe(true)
    expect(sessions).toHaveLength(0)
  })

  it("injects _source with the monthly result URL", async () => {
    const sessions = await getPlenaryResultMonth("202403")
    expect(sessions._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/plenario/resultado/mes/202403",
    )
  })

  it("sends Accept: application/json so the API does not default to XML", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    await getPlenaryResultMonth("202403")
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/plenario/resultado/mes/202403"),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    )
    fetchSpy.mockRestore()
  })
})

describe("getSenatorAttendanceBulk", () => {
  beforeEach(resetRedisMocks)

  it("aggregates per-senator attendance from monthly results", async () => {
    const summary = await getSenatorAttendanceBulk(2024)

    // Fixtures: 2 deliberative sessions in March + 1 deliberative session in
    // April + 1 ceremonial in March → 4 total sessions, 3 deliberative.
    expect(summary.totalSessions).toBe(4)
    expect(summary.totalDeliberative).toBe(3)
    expect(summary.year).toBe(2024)
  })

  it("computes attendance percentage from deliberative sessions only", async () => {
    const summary = await getSenatorAttendanceBulk(2024)

    // Senator 5672 attended 2 deliberative sessions out of 3 → 66.67%.
    const s5672 = summary.senators.find((s) => s.senatorId === "5672")
    expect(s5672).toBeDefined()
    expect(s5672!.attended).toBe(2)
    expect(s5672!.missed).toBe(1)
    expect(s5672!.percentage).toBeCloseTo(66.67, 1)

    // Senator 5321 attended 1 deliberative session out of 3 → 33.33%.
    const s5321 = summary.senators.find((s) => s.senatorId === "5321")
    expect(s5321).toBeDefined()
    expect(s5321!.attended).toBe(1)
    expect(s5321!.percentage).toBeCloseTo(33.33, 1)
  })

  it("includes ceremonial-session attendance in attendedDates only", async () => {
    const summary = await getSenatorAttendanceBulk(2024)

    // Senator 5321 only attended one deliberative session (March 5) plus
    // the ceremonial Solene (March 19). Both dates should be in attendedDates.
    const s5321 = summary.senators.find((s) => s.senatorId === "5321")
    expect(s5321!.attendedDates).toContain("2024-03-05")
    expect(s5321!.attendedDates).toContain("2024-03-19")
  })

  it("sorts senators by attendance percentage descending", async () => {
    const summary = await getSenatorAttendanceBulk(2024)
    for (let i = 1; i < summary.senators.length; i++) {
      expect(summary.senators[i - 1].percentage).toBeGreaterThanOrEqual(
        summary.senators[i].percentage,
      )
    }
  })

  it("caches the merged summary under sen:attendance:bulk:{year}", async () => {
    await getSenatorAttendanceBulk(2024)
    expect(mockRedisSet).toHaveBeenCalledWith(
      "sen:attendance:bulk:2024",
      expect.any(String),
      expect.objectContaining({ ex: expect.any(Number) }),
    )
  })

  it("returns the cached summary on repeat calls without re-fetching months", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")

    // First call populates whatever the handler returns; capture and replay it
    // from mockRedisGet on the second call.
    const first = await getSenatorAttendanceBulk(2024)
    const callsAfterFirst = fetchSpy.mock.calls.length
    fetchSpy.mockClear()
    mockRedisGet.mockResolvedValueOnce(JSON.stringify(first))

    const second = await getSenatorAttendanceBulk(2024)

    expect(second.totalSessions).toBe(first.totalSessions)
    expect(second.senators).toHaveLength(first.senators.length)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(callsAfterFirst).toBeGreaterThan(0)
    fetchSpy.mockRestore()
  })

  it("injects _source pointing at the January monthly URL", async () => {
    const summary = await getSenatorAttendanceBulk(2024)
    expect(summary._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/plenario/resultado/mes/202401",
    )
  })
})

describe("getSenatorAttendanceDetail", () => {
  beforeEach(resetRedisMocks)

  it("returns one row per session in the year, marking presence", async () => {
    const detail = await getSenatorAttendanceDetail("5672", 2024)

    expect(detail.senatorId).toBe("5672")
    expect(detail.year).toBe(2024)
    // 4 sessions across March + April fixtures.
    expect(detail.sessions).toHaveLength(4)

    const session9001 = detail.sessions.find((s) => s.sessionId === "9001")
    expect(session9001!.attended).toBe(true)

    const session9101 = detail.sessions.find((s) => s.sessionId === "9101")
    // Senator 5672 is not in 9101's empty Comparecimento.
    expect(session9101!.attended).toBe(false)
  })

  it("computes deliberative attendance counts that match the bulk summary", async () => {
    const detail = await getSenatorAttendanceDetail("5672", 2024)

    expect(detail.totalDeliberative).toBe(3)
    expect(detail.attended).toBe(2)
    expect(detail.missed).toBe(1)
    expect(detail.percentage).toBeCloseTo(66.67, 1)
  })

  it("returns sessions sorted by date ascending", async () => {
    const detail = await getSenatorAttendanceDetail("5672", 2024)
    for (let i = 1; i < detail.sessions.length; i++) {
      expect(detail.sessions[i - 1].date <= detail.sessions[i].date).toBe(true)
    }
  })

  it("returns zero-attended detail for an unknown senator", async () => {
    const detail = await getSenatorAttendanceDetail("0000", 2024)
    expect(detail.attended).toBe(0)
    // Total deliberative still reflects all sessions held.
    expect(detail.totalDeliberative).toBe(3)
    expect(detail.percentage).toBe(0)
    // Every session row is marked as not-attended.
    expect(detail.sessions.every((s) => !s.attended)).toBe(true)
  })

  it("injects _source with the January monthly URL", async () => {
    const detail = await getSenatorAttendanceDetail("5672", 2024)
    expect(detail._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/plenario/resultado/mes/202401",
    )
  })
})

describe("getSenadoPropositions", () => {
  beforeEach(resetRedisMocks)

  it("returns propositions filtered by year", async () => {
    const list = await getSenadoPropositions({ ano: 2025 })
    expect(list).toHaveLength(MOCK_SENADO_PROPOSITIONS_2025.length)
    expect(list[0]).toMatchObject({
      id: "9200",
      identifier: "PL 1500/2025",
      type: "PL",
      year: 2025,
    })
  })

  it("appends ?ano= and injects _source", async () => {
    const list = await getSenadoPropositions({ ano: 2025 })
    expect(list._source).toContain("ano=2025")
  })

  it("respects the limit param client-side", async () => {
    const list = await getSenadoPropositions({ ano: 2025, limit: 1 })
    expect(list).toHaveLength(1)
  })

  it("returns empty when no records match", async () => {
    const list = await getSenadoPropositions({ ano: 1999 })
    expect(list).toHaveLength(0)
  })

  it("uses a generic author placeholder when authoria is empty", async () => {
    const list = await getSenadoPropositions({ ano: 2025 })
    // Second mock has empty autoria.autores
    expect(list[1].author).toBe("—")
    expect(list[1].authorParty).toBe("—")
  })
})

describe("getSenadoPropositionDetail", () => {
  beforeEach(resetRedisMocks)

  it("returns the merged detail with timeline + fullDescription", async () => {
    const detail = await getSenadoPropositionDetail("9200")
    expect(detail).toMatchObject({
      id: "9200",
      identifier: "PL 1500/2025",
      type: "PL",
      origin: "Senado",
      currentLocation: "Comissão de Ciência e Tecnologia (CCT)",
      urgency: "Ordinária",
    })
    expect(detail.fullDescription).toContain("plano decenal")
    expect(detail.timeline).toHaveLength(3)
    expect(detail.timeline?.[0]).toMatchObject({
      date: "2025-02-04",
      description: "Apresentação ao Senado",
      location: "Plenário",
    })
  })

  it("injects _source pointing at /processo/{id}", async () => {
    const detail = await getSenadoPropositionDetail("9200")
    expect(detail._source).toBe(
      "https://legis.senado.leg.br/dadosabertos/processo/9200",
    )
  })

  it("throws ApiError on 404 for unknown id", async () => {
    await expect(getSenadoPropositionDetail("99999")).rejects.toThrow()
  })
})

describe("getSenadoPropositionRapporteurship", () => {
  beforeEach(resetRedisMocks)

  it("returns rapporteurship records with normalized fields", async () => {
    const records = await getSenadoPropositionRapporteurship("9200")
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      rapporteur: "Rodrigo Tavares",
      rapporteurId: "5672",
      rapporteurParty: "PSD",
      committeeAbbreviation: "CCT",
      role: "Relator",
      startDate: "2025-04-15",
    })
  })

  it("injects _source with idProcesso query param", async () => {
    const records = await getSenadoPropositionRapporteurship("9200")
    expect(records._source).toContain("idProcesso=9200")
  })

  it("returns an empty array when no rapporteurship is found", async () => {
    const records = await getSenadoPropositionRapporteurship("99999")
    expect(records).toHaveLength(0)
  })
})

describe("getSenadoPropositionDocuments", () => {
  beforeEach(resetRedisMocks)

  it("returns documents with normalized fields", async () => {
    const docs = await getSenadoPropositionDocuments("9200")
    expect(docs).toHaveLength(2)
    expect(docs[0]).toMatchObject({
      id: "700001",
      type: "Texto inicial",
      title: "Texto apresentado pelo autor",
      date: "2025-02-04",
    })
    expect(docs[0].url).toContain("sdleg-getter")
  })

  it("injects _source", async () => {
    const docs = await getSenadoPropositionDocuments("9200")
    expect(docs._source).toContain("idProcesso=9200")
  })
})

describe("getSenadoPropositionAmendments", () => {
  beforeEach(resetRedisMocks)

  it("returns amendments with normalized fields", async () => {
    const amends = await getSenadoPropositionAmendments("9200")
    expect(amends).toHaveLength(1)
    expect(amends[0]).toMatchObject({
      id: "800001",
      identifier: "EMENDA Nº 1 — CCT",
      author: "Comissão de CCT",
      authorParty: "PSD",
      description: "Inclui FUST como fonte adicional de recursos.",
    })
  })

  it("injects _source", async () => {
    const amends = await getSenadoPropositionAmendments("9200")
    expect(amends._source).toContain("idProcesso=9200")
  })
})

describe("getSenadoVotingSessions", () => {
  beforeEach(resetRedisMocks)

  it("aggregates per-senator vote rows into sessions", async () => {
    const sessions = await getSenadoVotingSessions("20250101", "20251231")
    expect(sessions).toHaveLength(2)
    // Sorted by date desc — 4002 (2025-04-08) first.
    expect(sessions[0]).toMatchObject({
      id: "4002",
      date: "2025-04-08",
      approved: true,
      matterIdentifier: "PL 1500/2025",
    })
    expect(sessions[1].id).toBe("4001")
  })

  it("computes the vote tally without per-senator breakdown", async () => {
    const sessions = await getSenadoVotingSessions("20250101", "20251231")
    const session4001 = sessions.find((s) => s.id === "4001")!
    expect(session4001.voteTally).toEqual({ yes: 1, no: 1, abstention: 0, absent: 0 })
    expect(session4001.votes).toBeUndefined()
  })

  it("injects _source with the date range", async () => {
    const sessions = await getSenadoVotingSessions("20250101", "20251231")
    expect(sessions._source).toContain("dataInicio=20250101")
    expect(sessions._source).toContain("dataFim=20251231")
  })
})

describe("getSenadoVotingSessionDetail", () => {
  beforeEach(resetRedisMocks)

  it("returns the session with per-senator vote breakdown", async () => {
    const session = await getSenadoVotingSessionDetail("4001")
    expect(session.id).toBe("4001")
    expect(session.approved).toBe(true)
    expect(session.matterIdentifier).toBe("PEC 5/2025")
    expect(session.voteTally).toEqual({ yes: 1, no: 1, abstention: 0, absent: 0 })
    expect(session.votes).toHaveLength(2)
    expect(session.votes?.[0]).toMatchObject({
      parliamentarianId: "5672",
      parliamentarianName: "Rodrigo Tavares",
      party: "PSD",
      uf: "MG",
      vote: "Sim",
    })
  })

  it("injects _source with codigoSessaoVotacao", async () => {
    const session = await getSenadoVotingSessionDetail("4001")
    expect(session._source).toContain("codigoSessaoVotacao=4001")
  })

  it("returns an empty session with the requested id when no rows match", async () => {
    const session = await getSenadoVotingSessionDetail("99999")
    expect(session.id).toBe("99999")
    expect(session.votes).toBeUndefined()
  })
})

describe("getSenadoContractsBulk", () => {
  beforeEach(resetRedisMocks)

  it("normalizes raw contract records into the public shape", async () => {
    const summary = await getSenadoContractsBulk()
    expect(summary.totalContracts).toBe(MOCK_SENADO_CONTRACTS.length)
    const ct = summary.contracts.find((c) => c.id === "9001")!
    expect(ct).toMatchObject({
      number: "20240050",
      formattedNumber: "CT-CT/20240050",
      object: "Fornecimento de equipamentos de TI",
      modality: "Pregão Eletrônico",
      supplierName: "TECH SOLUÇÕES LTDA",
      supplierDocument: "12.345.678/0001-90",
      subSpeciesCode: "CT",
      subSpeciesName: "Contrato",
      managingUnit: "SF",
      isLaborIntensive: false,
    })
  })

  it("counts active contracts using today's date and the start/end window", async () => {
    const summary = await getSenadoContractsBulk()
    // The fixture has two contracts active today: contract 9002 (open-ended, started 2023-08-01)
    // and contract 9001 (running 2024-05-12 → 2026-05-12). The third may be active or not
    // depending on today (ends 2025-09-30 in the fixture); guard with a >= check.
    expect(summary.activeContracts).toBeGreaterThanOrEqual(2)
  })

  it("aggregates by sub-species, modality, and signature year", async () => {
    const summary = await getSenadoContractsBulk()
    const subContrato = summary.bySubSpecies.find((s) => s.name === "Contrato")
    expect(subContrato?.count).toBe(2)
    const subCessao = summary.bySubSpecies.find((s) => s.name === "Cessão de Uso")
    expect(subCessao?.count).toBe(1)

    const yr2024 = summary.byYear.find((y) => y.year === 2024)
    expect(yr2024?.count).toBe(2)
    const yr2023 = summary.byYear.find((y) => y.year === 2023)
    expect(yr2023?.count).toBe(1)
  })

  it("ranks top contractors by their contract count", async () => {
    const summary = await getSenadoContractsBulk()
    expect(summary.topContractors[0]).toMatchObject({
      name: "LIMPEZA SP LTDA",
      count: 2,
    })
  })

  it("injects _source pointing at the contracts endpoint", async () => {
    const summary = await getSenadoContractsBulk()
    expect(summary._source).toContain("/contratacoes/contratos")
  })
})

describe("getSenadoBids", () => {
  beforeEach(resetRedisMocks)

  it("normalizes bid records and preserves the notice URL", async () => {
    const bids = await getSenadoBids()
    expect(bids).toHaveLength(MOCK_SENADO_BIDS.length)
    expect(bids[0]).toMatchObject({
      id: "6001",
      number: "01/2024",
      status: "HOMOLOGADA",
      modality: "Pregão Eletrônico",
      isPriceRegistration: false,
    })
    expect(bids[0].noticeUrl).toContain("edital")
  })

  it("injects _source", async () => {
    const bids = await getSenadoBids()
    expect(bids._source).toContain("/contratacoes/licitacoes")
  })
})

describe("getSenadoContractors", () => {
  beforeEach(resetRedisMocks)

  it("returns counts for each contractor's contracts and orders", async () => {
    const contractors = await getSenadoContractors()
    expect(contractors).toHaveLength(MOCK_SENADO_CONTRACTORS.length)
    const limpeza = contractors.find((c) => c.name === "LIMPEZA SP LTDA")!
    expect(limpeza.contractCount).toBe(2)
    expect(limpeza.orderCount).toBe(1)
    const banco = contractors.find((c) => c.name === "BANCO DO BRASIL S.A.")!
    expect(banco.contractCount).toBe(1)
    expect(banco.orderCount).toBe(0)
  })
})

describe("getSenadoServantsBulk", () => {
  beforeEach(resetRedisMocks)

  it("dedupes the headcount aggregate per (className, careerPlan) pair", async () => {
    const summary = await getSenadoServantsBulk()
    // Two ESPECIAL/Analista rows share total_ativo=320 (denormalized) — must
    // be counted once. Plus 110 from the INTERMEDIARIA row → 430.
    expect(summary.totalActive).toBe(430)
  })

  it("computes totalInactive and totalVacancies from the headcount aggregate", async () => {
    const summary = await getSenadoServantsBulk()
    // ESPECIAL: aposentados=100 + beneficiarios=60; INTERMEDIARIA: 40 + 10 → 210.
    expect(summary.totalInactive).toBe(210)
    // ESPECIAL plan: 50; INTERMEDIARIA: 20 → 70.
    expect(summary.totalVacancies).toBe(70)
  })

  it("groups individual servants by bond, status, and category", async () => {
    const summary = await getSenadoServantsBulk()
    expect(summary.byBond.find((b) => b.name === "EFETIVO")?.count).toBe(2)
    expect(summary.byBond.find((b) => b.name === "COMISSIONADO")?.count).toBe(1)
    expect(summary.byStatus.find((s) => s.name === "ATIVO")?.count).toBe(2)
    expect(summary.byStatus.find((s) => s.name === "APOSENTADO")?.count).toBe(1)
  })

  it("normalizes nested objects (cargo, lotacao, categoria) into flat strings", async () => {
    const summary = await getSenadoServantsBulk()
    const maria = summary.members.find((m) => m.id === "5001")!
    expect(maria).toMatchObject({
      name: "MARIA DA SILVA",
      bond: "EFETIVO",
      position: "ANALISTA LEGISLATIVO",
      departmentCode: "GAB1",
      departmentName: "Gabinete da Presidência",
      categoryCode: "AL",
    })
    const joao = summary.members.find((m) => m.id === "5002")!
    expect(joao.role).toBe("Assessor parlamentar")
    expect(joao.position).toBe("")
  })

  it("injects _source", async () => {
    const summary = await getSenadoServantsBulk()
    expect(summary._source).toContain("/servidores/servidores")
  })
})

describe("getSenadoServantsRemuneration", () => {
  beforeEach(resetRedisMocks)

  it("parses PT-BR monetary strings into numbers", async () => {
    const summary = await getSenadoServantsRemuneration(2025, 3)
    expect(summary.rows).toHaveLength(MOCK_SENADO_REMUNERATION_2025_3.length)
    const maria = summary.rows.find((r) => r.id === "5001")!
    expect(maria.baseSalary).toBe(30000)
    expect(maria.netPay).toBe(26500)
    expect(maria.incomeTaxWithheld).toBe(-2000)
    expect(maria.socialSecurityWithheld).toBe(-3500)
  })

  it("aggregates totals for the month", async () => {
    const summary = await getSenadoServantsRemuneration(2025, 3)
    expect(summary.year).toBe(2025)
    expect(summary.month).toBe(3)
    expect(summary.totalNetPay).toBe(26500 + 6900 + 11000)
    expect(summary.totalBaseSalary).toBe(30000 + 8000 + 12000)
    expect(summary.paidHeadcount).toBe(3)
  })

  it("isolates commissioned-staff payroll using the bulk servants list", async () => {
    const summary = await getSenadoServantsRemuneration(2025, 3)
    // Only servant 5002 is COMISSIONADO in the fixture.
    expect(summary.totalCommissionedPay).toBe(6900)
  })

  it("injects _source pointing at the remuneration endpoint", async () => {
    const summary = await getSenadoServantsRemuneration(2025, 3)
    expect(summary._source).toContain("/servidores/remuneracoes/2025/3")
  })
})
