/**
 * @file handlers.ts
 * @description MSW (Mock Service Worker) request handlers for all external
 * government APIs consumed by Imposterio.
 *
 * Every external API endpoint used across the fetchers package must have
 * a corresponding handler here. Tests never call real APIs — all external
 * calls are intercepted by MSW using these handlers.
 *
 * Add one handler per external endpoint. Group handlers by data source
 * (Camara, Senado, Transparencia, TSE, CNJ, CNPJ).
 */

import { http, HttpResponse } from "msw"
import type { RequestHandler } from "msw"

// ── Mock data: Câmara dos Deputados ─────────────────────────────────

/** Mock deputy list — minimal realistic subset for testing. */
export const MOCK_DEPUTIES_LIST = {
  dados: [
    {
      id: 204554,
      uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
      nome: "Maria Silva",
      siglaPartido: "PT",
      siglaUf: "SP",
      idLegislatura: 57,
      urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
      email: "dep.mariasilva@camara.leg.br",
    },
    {
      id: 178957,
      uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/178957",
      nome: "João Santos",
      siglaPartido: "PL",
      siglaUf: "RJ",
      idLegislatura: 57,
      urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/178957.jpg",
      email: "dep.joaosantos@camara.leg.br",
    },
    {
      id: 160623,
      uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/160623",
      nome: "Ana Oliveira",
      siglaPartido: "MDB",
      siglaUf: "MG",
      idLegislatura: 57,
      urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/160623.jpg",
      email: "",
    },
  ],
  links: [
    { rel: "self", href: "https://dadosabertos.camara.leg.br/api/v2/deputados" },
  ],
}

/** Mock deputy detail response for deputy 204554. */
export const MOCK_DEPUTY_DETAIL_204554 = {
  dados: {
    id: 204554,
    uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
    nomeCivil: "MARIA DA CONCEIÇÃO SILVA",
    cpf: "123.456.789-00",
    sexo: "F",
    dataNascimento: "1975-03-15",
    dataFalecimento: null,
    ufNascimento: "SP",
    municipioNascimento: "São Paulo",
    escolaridade: "Superior",
    ultimoStatus: {
      id: 204554,
      uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554",
      nome: "Maria Silva",
      siglaPartido: "PT",
      siglaUf: "SP",
      idLegislatura: 57,
      urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/204554.jpg",
      email: "dep.mariasilva@camara.leg.br",
      data: "2023-02-01T00:00",
      nomeEleitoral: "MARIA SILVA",
      gabinete: {
        nome: "730",
        predio: "Anexo IV",
        sala: "730",
        andar: "7",
        telefone: "3215-5730",
        email: "dep.mariasilva@camara.leg.br",
      },
      situacao: "Exercício",
      condicaoEleitoral: "Titular",
    },
  },
  links: [
    { rel: "self", href: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554" },
  ],
}

/** Mock expenses for deputy 204554, year 2024. */
export const MOCK_EXPENSES_204554 = {
  dados: [
    {
      ano: 2024,
      mes: 3,
      tipoDespesa: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR",
      codDocumento: "7712345",
      tipoDocumento: "Nota Fiscal",
      codTipoDocumento: 0,
      dataDocumento: "2024-03-15T00:00:00",
      numDocumento: "NF-2024-001",
      valorDocumento: 15200.0,
      urlDocumento: "https://www.camara.leg.br/cota-parlamentar/documentos/publ/204554/2024/7712345.pdf",
      nomeFornecedor: "Gráfica Nacional LTDA",
      cnpjCpfFornecedor: "12345678000190",
      valorLiquido: 15200.0,
      valorGlosa: 0.0,
      numRessarcimento: "",
      codLote: 2020001,
      parcela: 0,
    },
    {
      ano: 2024,
      mes: 3,
      tipoDespesa: "PASSAGENS AÉREAS",
      codDocumento: "7712346",
      tipoDocumento: "Nota Fiscal",
      codTipoDocumento: 0,
      dataDocumento: "2024-03-10T00:00:00",
      numDocumento: "NF-2024-002",
      valorDocumento: 8430.5,
      urlDocumento: "https://www.camara.leg.br/cota-parlamentar/documentos/publ/204554/2024/7712346.pdf",
      nomeFornecedor: "LATAM Airlines",
      cnpjCpfFornecedor: "33469172000140",
      valorLiquido: 8430.5,
      valorGlosa: 0.0,
      numRessarcimento: "",
      codLote: 2020002,
      parcela: 0,
    },
    {
      ano: 2024,
      mes: 2,
      tipoDespesa: "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES",
      codDocumento: "7698001",
      tipoDocumento: "Nota Fiscal",
      codTipoDocumento: 0,
      dataDocumento: "2024-02-20T00:00:00",
      numDocumento: "NF-2024-003",
      valorDocumento: 6800.0,
      urlDocumento: "https://www.camara.leg.br/cota-parlamentar/documentos/publ/204554/2024/7698001.pdf",
      nomeFornecedor: "Localiza Rent a Car",
      cnpjCpfFornecedor: "16670085000155",
      valorLiquido: 6800.0,
      valorGlosa: 0.0,
      numRessarcimento: "",
      codLote: 2020003,
      parcela: 0,
    },
  ],
  links: [
    { rel: "self", href: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&itens=100&pagina=1" },
    { rel: "first", href: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&itens=100&pagina=1" },
    { rel: "last", href: "https://dadosabertos.camara.leg.br/api/v2/deputados/204554/despesas?ano=2024&itens=100&pagina=1" },
  ],
}

// ── Handlers ─────────────────────────────────────────────────────────

export const handlers: RequestHandler[] = [
  // ── Câmara dos Deputados ────────────────────────────────────────────

  /** GET /deputados — list of all deputies currently serving */
  http.get(
    "https://dadosabertos.camara.leg.br/api/v2/deputados",
    () => HttpResponse.json(MOCK_DEPUTIES_LIST),
  ),

  /** GET /deputados/:id/despesas — CEAP expenses for a deputy */
  http.get(
    "https://dadosabertos.camara.leg.br/api/v2/deputados/:id/despesas",
    ({ params }) => {
      const id = params.id as string
      if (id === "204554") {
        return HttpResponse.json(MOCK_EXPENSES_204554)
      }
      return HttpResponse.json({
        dados: [],
        links: [
          { rel: "self", href: `https://dadosabertos.camara.leg.br/api/v2/deputados/${id}/despesas?ano=2024&itens=100&pagina=1` },
          { rel: "last", href: `https://dadosabertos.camara.leg.br/api/v2/deputados/${id}/despesas?ano=2024&itens=100&pagina=1` },
        ],
      })
    },
  ),

  /** GET /deputados/:id — detailed deputy profile */
  http.get(
    "https://dadosabertos.camara.leg.br/api/v2/deputados/:id",
    ({ params }) => {
      const id = params.id as string
      if (id === "204554") {
        return HttpResponse.json(MOCK_DEPUTY_DETAIL_204554)
      }
      // Return 404 for unknown IDs
      return new HttpResponse(null, { status: 404 })
    },
  ),
]
