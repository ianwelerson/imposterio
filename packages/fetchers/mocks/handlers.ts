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

// ── Mock data: Senado Federal ───────────────────────────────────────

/**
 * Mock active-senators list. Two senators: one with multi-element shape
 * (single-array of 2 entries) so we exercise list mapping; both expose the
 * `Mandato` block that the list endpoint embeds inline.
 */
export const MOCK_SENADO_SENATORS_LIST = {
  ListaParlamentarEmExercicio: {
    Parlamentares: {
      Parlamentar: [
        {
          IdentificacaoParlamentar: {
            CodigoParlamentar: "5672",
            NomeParlamentar: "Rodrigo Tavares",
            NomeCompletoParlamentar: "RODRIGO DE SOUZA TAVARES",
            SiglaPartidoParlamentar: "PSD",
            UfParlamentar: "MG",
            UrlFotoParlamentar: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
            EmailParlamentar: "sen.rodrigotavares@senado.leg.br",
            SexoParlamentar: "Masculino",
            UrlPaginaParlamentar: "https://www25.senado.leg.br/web/senadores/senador/-/perfil/5672",
          },
          Mandato: {
            CodigoMandato: "880",
            UfParlamentar: "MG",
            PrimeiraLegislaturaDoMandato: { NumeroLegislatura: "57" },
            SegundaLegislaturaDoMandato: { NumeroLegislatura: "58" },
          },
        },
        {
          IdentificacaoParlamentar: {
            CodigoParlamentar: "5321",
            NomeParlamentar: "Ana Flávia Ribeiro",
            NomeCompletoParlamentar: "ANA FLÁVIA RIBEIRO COSTA",
            SiglaPartidoParlamentar: "PT",
            UfParlamentar: "SP",
            UrlFotoParlamentar: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5321.jpg",
            EmailParlamentar: "",
            SexoParlamentar: "Feminino",
          },
          Mandato: {
            CodigoMandato: "881",
            UfParlamentar: "SP",
            PrimeiraLegislaturaDoMandato: { NumeroLegislatura: "57" },
          },
        },
      ],
    },
  },
}

/** Mock detail response for senator 5672 — exercises every detail field. */
export const MOCK_SENADO_SENATOR_DETAIL_5672 = {
  DetalheParlamentar: {
    Parlamentar: {
      IdentificacaoParlamentar: {
        CodigoParlamentar: "5672",
        NomeParlamentar: "Rodrigo Tavares",
        NomeCompletoParlamentar: "RODRIGO DE SOUZA TAVARES",
        SiglaPartidoParlamentar: "PSD",
        UfParlamentar: "MG",
        UrlFotoParlamentar: "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
        EmailParlamentar: "sen.rodrigotavares@senado.leg.br",
        SexoParlamentar: "Masculino",
        UrlPaginaParlamentar: "https://www25.senado.leg.br/web/senadores/senador/-/perfil/5672",
      },
      DadosBasicosParlamentar: {
        DataNascimento: "1968-07-22",
        Naturalidade: "Belo Horizonte",
        UfNaturalidade: "MG",
        EnderecoParlamentar: "Anexo II, Ala Senador Teotônio Vilela, Gabinete 5",
      },
      Telefones: {
        Telefone: {
          NumeroTelefone: "(61) 3303-5672",
          OrdemPublicacao: "1",
          IndicadorFax: "Não",
        },
      },
      MandatoAtual: {
        CodigoMandato: "880",
        UfParlamentar: "MG",
        DescricaoParticipacao: "Titular",
        PrimeiraLegislaturaDoMandato: {
          NumeroLegislatura: "57",
          DataInicio: "2023-02-01",
          DataFim: "2027-01-31",
        },
        SegundaLegislaturaDoMandato: {
          NumeroLegislatura: "58",
          DataInicio: "2027-02-01",
          DataFim: "2031-01-31",
        },
      },
    },
  },
}

/**
 * Mock mandates response with two entries — one wrapped as a single-item
 * array, one as the underlying object. Used to exercise the array variant.
 */
export const MOCK_SENADO_SENATOR_MANDATES_5672 = {
  MandatoParlamentar: {
    Parlamentar: {
      Mandatos: {
        Mandato: [
          {
            CodigoMandato: "880",
            UfParlamentar: "MG",
            DescricaoParticipacao: "Titular",
            PrimeiraLegislaturaDoMandato: {
              NumeroLegislatura: "57",
              DataInicio: "2023-02-01",
              DataFim: "2027-01-31",
            },
            SegundaLegislaturaDoMandato: {
              NumeroLegislatura: "58",
              DataInicio: "2027-02-01",
              DataFim: "2031-01-31",
            },
          },
          {
            CodigoMandato: "742",
            UfParlamentar: "MG",
            DescricaoParticipacao: "Suplente em Exercício",
            PrimeiraLegislaturaDoMandato: {
              NumeroLegislatura: "55",
              DataInicio: "2015-02-01",
              DataFim: "2019-01-31",
            },
          },
        ],
      },
    },
  },
}

/**
 * Mock mandates response with a single mandate that the API serializes as
 * an object instead of a single-item array. Used to exercise the
 * single-element-array coercion quirk (§7.7 of the impl guide).
 */
export const MOCK_SENADO_SENATOR_MANDATES_5321 = {
  MandatoParlamentar: {
    Parlamentar: {
      Mandatos: {
        Mandato: {
          CodigoMandato: "881",
          UfParlamentar: "SP",
          DescricaoParticipacao: "Titular",
          PrimeiraLegislaturaDoMandato: {
            NumeroLegislatura: "57",
            DataInicio: "2023-02-01",
            DataFim: "2027-01-31",
          },
        },
      },
    },
  },
}

/** Mock affiliations response — multi-entry. */
export const MOCK_SENADO_SENATOR_AFFILIATIONS_5672 = {
  FiliacaoParlamentar: {
    Parlamentar: {
      Filiacoes: {
        Filiacao: [
          {
            Partido: { SiglaPartido: "PSD", NomePartido: "Partido Social Democrático" },
            DataFiliacao: "2018-04-05",
          },
          {
            Partido: { SiglaPartido: "PMDB", NomePartido: "Partido do Movimento Democrático Brasileiro" },
            DataFiliacao: "2010-03-12",
            DataDesfiliacao: "2018-04-04",
          },
        ],
      },
    },
  },
}

// Voting history (modern flat-array endpoint).
export const MOCK_SENADO_VOTING_5672_2024 = [
  {
    codigoSessaoVotacao: 1234,
    dataSessao: "2024-03-15T18:30:00",
    descricaoVotacao: "PEC 12/2024 — Reforma administrativa",
    siglaResultado: "APROVADA",
    voto: "Sim",
    materia: { idProcesso: 9001, identificacao: "PEC 12/2024" },
  },
  {
    codigoSessaoVotacao: 1235,
    dataSessao: "2024-03-21T19:00:00",
    descricaoVotacao: "MPV 1198/2024 — Programa de aceleração econômica",
    siglaResultado: "REJEITADA",
    voto: "Não",
    materia: { idProcesso: 9002, identificacao: "MPV 1198/2024" },
  },
  {
    codigoSessaoVotacao: 1236,
    dataSessao: "2024-04-02T16:00:00",
    descricaoVotacao: "PL 890/2024 — Marco legal do hidrogênio verde",
    siglaResultado: "APROVADA",
    voto: "Sim",
    materia: { idProcesso: 9003, identificacao: "PL 890/2024" },
  },
]

// Propositions (modern flat-array endpoint).
export const MOCK_SENADO_PROPOSITIONS_5672 = [
  {
    idProcesso: 9100,
    identificacao: "PL 1234/2024",
    siglaTipo: "PL",
    numero: "1234",
    ano: 2024,
    ementa: "Regulamenta o uso de inteligência artificial no setor público.",
    dataApresentacao: "2024-03-10",
    situacaoAtual: "Em tramitação",
    autoria: {
      autores: [
        { nome: "Rodrigo Tavares", siglaPartido: "PSD", siglaUf: "MG" },
      ],
    },
    assuntos: [{ assunto: "Tecnologia e inovação" }],
  },
  {
    idProcesso: 9101,
    identificacao: "PEC 30/2024",
    siglaTipo: "PEC",
    numero: "30",
    ano: 2024,
    ementa: "Amplia transparência obrigatória para fundos públicos.",
    dataApresentacao: "2024-02-22",
    situacaoAtual: "Aprovada na CCJ",
    autoria: { autores: [] },
    assuntos: [{ assunto: "Administração pública" }],
  },
]

// Speeches (legacy nested wrapper).
export const MOCK_SENADO_SPEECHES_5672 = {
  DiscursosParlamentar: {
    Parlamentar: {
      Pronunciamentos: {
        Pronunciamento: [
          {
            CodigoPronunciamento: "551001",
            DataPronunciamento: "2024-04-10T15:30:00",
            TipoUsoDaPalavra: { Descricao: "Breves Comunicações" },
            TextoResumo: "Defesa de marcos para inteligência artificial no setor público.",
            UrlTexto: "https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/551001",
            Assunto: "Tecnologia e inovação",
          },
          {
            CodigoPronunciamento: "551050",
            DataPronunciamento: "2024-05-22T18:00:00",
            TipoUsoDaPalavra: { Descricao: "Discurso" },
            TextoResumo: "Análise sobre a reforma tributária aprovada.",
            UrlTexto: "https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/551050",
            Assunto: "Reforma tributária",
          },
        ],
      },
    },
  },
}

// Committees (legacy nested wrapper) — exercises ensureArray with single-object form.
export const MOCK_SENADO_COMMITTEES_5672 = {
  MembroComissaoParlamentar: {
    Parlamentar: {
      MembroComissoes: {
        Comissao: [
          {
            IdentificacaoComissao: {
              CodigoComissao: "34",
              SiglaComissao: "CCJ",
              NomeComissao: "Comissão de Constituição, Justiça e Cidadania",
              SiglaSubtipoComissao: "PERMANENTE",
              DescricaoSubtipoComissao: "Permanente",
            },
            DescricaoParticipacao: "Titular",
            DataInicio: "2023-02-15",
          },
          {
            IdentificacaoComissao: {
              CodigoComissao: "47",
              SiglaComissao: "CAE",
              NomeComissao: "Comissão de Assuntos Econômicos",
              SiglaSubtipoComissao: "PERMANENTE",
              DescricaoSubtipoComissao: "Permanente",
            },
            DescricaoParticipacao: "Suplente",
            DataInicio: "2023-02-15",
            DataFim: "2024-02-14",
          },
        ],
      },
    },
  },
}

/** Single-element form (object instead of array) for ensureArray coverage. */
export const MOCK_SENADO_COMMITTEES_5321 = {
  MembroComissaoParlamentar: {
    Parlamentar: {
      MembroComissoes: {
        Comissao: {
          IdentificacaoComissao: {
            CodigoComissao: "12",
            SiglaComissao: "CRE",
            NomeComissao: "Comissão de Relações Exteriores",
            SiglaSubtipoComissao: "PERMANENTE",
            DescricaoSubtipoComissao: "Permanente",
          },
          DescricaoParticipacao: "Titular",
          DataInicio: "2023-02-15",
        },
      },
    },
  },
}

// Positions (legacy nested wrapper).
export const MOCK_SENADO_POSITIONS_5672 = {
  CargoParlamentar: {
    Parlamentar: {
      Cargos: {
        Cargo: [
          {
            CodigoCargo: "55",
            DescricaoCargo: "Vice-Presidente",
            IdentificacaoComissao: {
              CodigoComissao: "34",
              SiglaComissao: "CCJ",
              NomeComissao: "Comissão de Constituição, Justiça e Cidadania",
            },
            DataInicio: "2024-03-01",
          },
        ],
      },
    },
  },
}

// Leaderships (legacy nested wrapper) — single-object form.
export const MOCK_SENADO_LEADERSHIPS_5672 = {
  LiderancaParlamentar: {
    Parlamentar: {
      Liderancas: {
        Lideranca: {
          DescricaoLideranca: "Vice-Líder",
          Unidade: {
            SiglaUnidade: "PSD",
            DescricaoUnidade: "Partido Social Democrático",
            DescricaoTipoUnidadeLideranca: "Partido",
          },
          DataInicio: "2024-02-01",
        },
      },
    },
  },
}

/**
 * CEAPS bulk feed for 2024 — flat array of receipts. Includes records for
 * two senators (5672 and 5321) plus one with empty `codSenador` to verify
 * the aggregator skips invalid rows.
 *
 * Mixes Brazilian-format (`"1.234,56"`) and English-format (`8430.5`)
 * `valorReembolsado` to exercise the numeric parser.
 */
export const MOCK_SENADO_CEAPS_2024 = [
  {
    ano: 2024,
    mes: 3,
    senador: "RODRIGO TAVARES",
    codSenador: 5672,
    tipoDespesa: "Passagens aéreas, aquáticas e terrestres nacionais",
    cnpjCpf: "33.469.172/0001-40",
    fornecedor: "LATAM Airlines",
    documento: "NF-2024-001",
    dataDocumento: "2024-03-15",
    valorReembolsado: 8430.5,
    codDocumento: 7712345,
    tipoDocumento: "Nota Fiscal",
  },
  {
    ano: 2024,
    mes: 4,
    senador: "RODRIGO TAVARES",
    codSenador: 5672,
    tipoDespesa: "Locação de imóveis para escritório político",
    cnpjCpf: "12.345.678/0001-90",
    fornecedor: "Imobiliária Central",
    documento: "REC-2024-002",
    dataDocumento: "10/04/2024",
    valorReembolsado: "12.500,00",
    codDocumento: 7712400,
    tipoDocumento: "Recibo",
  },
  {
    ano: 2024,
    mes: 5,
    senador: "ANA FLÁVIA RIBEIRO",
    codSenador: 5321,
    tipoDespesa: "Passagens aéreas, aquáticas e terrestres nacionais",
    cnpjCpf: "33.469.172/0001-40",
    fornecedor: "LATAM Airlines",
    documento: "NF-2024-200",
    dataDocumento: "2024-05-22",
    valorReembolsado: 4200.0,
    codDocumento: 7712500,
    tipoDocumento: "Nota Fiscal",
  },
  // Invalid row — empty codSenador. Aggregator must skip it.
  {
    ano: 2024,
    mes: 5,
    senador: "",
    codSenador: "",
    tipoDespesa: "Material de escritório",
    fornecedor: "Papelaria X",
    documento: "NF-INV",
    dataDocumento: "2024-05-25",
    valorReembolsado: 99.0,
  },
]

/**
 * Plenary monthly result fixture covering the deliberative-attendance shape.
 *
 * Includes:
 * - One ordinary deliberative session (counts toward percentage)
 * - One ceremonial "Sessão Solene" (counted in totals but not deliberative)
 * - One single-element `Parlamentar` block serialized as an object (legacy quirk)
 */
export const MOCK_SENADO_PLENARY_RESULT_202403 = {
  ResultadoSessao: {
    Sessoes: {
      Sessao: [
        {
          CodigoSessao: "9001",
          DataSessao: "2024-03-05",
          TipoSessao: "Sessão Deliberativa Ordinária",
          SiglaTipoSessao: "SDO",
          Comparecimento: {
            Parlamentar: [
              { CodigoParlamentar: "5672" },
              { CodigoParlamentar: "5321" },
              { CodigoParlamentar: "9999" },
            ],
          },
        },
        {
          CodigoSessao: "9002",
          DataSessao: "2024-03-12",
          TipoSessao: "Sessão Deliberativa Extraordinária",
          SiglaTipoSessao: "SDE",
          Comparecimento: {
            // Single attendee serialized as an object — must coerce to array.
            Parlamentar: { CodigoParlamentar: "5672" },
          },
        },
        {
          CodigoSessao: "9003",
          DataSessao: "2024-03-19",
          TipoSessao: "Sessão Não Deliberativa Solene",
          SiglaTipoSessao: "SNS",
          Comparecimento: {
            Parlamentar: [{ CodigoParlamentar: "5321" }],
          },
        },
      ],
    },
  },
}

/** Plenary monthly result for April with one deliberative session, no comparecimento. */
export const MOCK_SENADO_PLENARY_RESULT_202404 = {
  ResultadoSessao: {
    Sessoes: {
      Sessao: {
        CodigoSessao: "9101",
        DataSessao: "2024-04-09",
        TipoSessao: "Sessão Deliberativa Ordinária",
        SiglaTipoSessao: "SDO",
        // No Comparecimento at all — must be treated as zero attendees, not crash.
      },
    },
  },
}

/** Empty month — recess. */
export const MOCK_SENADO_PLENARY_RESULT_EMPTY = {
  ResultadoSessao: {
    Sessoes: {},
  },
}

// Proposition search filtered by year (modern flat-array endpoint).
export const MOCK_SENADO_PROPOSITIONS_2025 = [
  {
    idProcesso: 9200,
    identificacao: "PL 1500/2025",
    siglaTipo: "PL",
    numero: "1500",
    ano: 2025,
    ementa: "Cria o Programa Nacional de Conectividade Rural.",
    dataApresentacao: "2025-02-04",
    situacaoAtual: "Em tramitação",
    autoria: { autores: [{ nome: "Eduardo Braga", siglaPartido: "MDB", siglaUf: "AM" }] },
    assuntos: [{ assunto: "Telecomunicações" }],
  },
  {
    idProcesso: 9201,
    identificacao: "PEC 5/2025",
    siglaTipo: "PEC",
    numero: "5",
    ano: 2025,
    ementa: "Estabelece autonomia financeira do Ministério Público da União.",
    dataApresentacao: "2025-03-18",
    situacaoAtual: "Aprovada",
    autoria: { autores: [] },
    assuntos: [{ assunto: "Administração pública" }],
  },
]

// Proposition detail (single record).
export const MOCK_SENADO_PROPOSITION_DETAIL_9200 = {
  idProcesso: 9200,
  identificacao: "PL 1500/2025",
  siglaTipo: "PL",
  numero: "1500",
  ano: 2025,
  ementa: "Cria o Programa Nacional de Conectividade Rural.",
  ementaAtual: "Cria o Programa Nacional de Conectividade Rural com metas de cobertura.",
  descricao:
    "Estabelece um plano decenal para universalizar acesso a banda larga em áreas rurais, com financiamento via FUST e contrapartidas de operadoras.",
  dataApresentacao: "2025-02-04",
  situacaoAtual: "Em tramitação",
  ultimaAtualizacao: "2025-04-15",
  casaIniciadora: "SF",
  localAtual: { nome: "Comissão de Ciência e Tecnologia (CCT)" },
  regime: "Ordinária",
  autoria: { autores: [{ nome: "Eduardo Braga", siglaPartido: "MDB", siglaUf: "AM" }] },
  assuntos: [{ assunto: "Telecomunicações" }],
  tramitacao: [
    { data: "2025-02-04", descricao: "Apresentação ao Senado", localDescricao: "Plenário" },
    { data: "2025-02-12", descricao: "Distribuído à CCT", localDescricao: "CCT" },
    { data: "2025-04-15", descricao: "Designado relator", localDescricao: "CCT" },
  ],
}

export const MOCK_SENADO_RAPPORTEURSHIP_9200 = [
  {
    parlamentar: {
      codigoParlamentar: "5672",
      nome: "Rodrigo Tavares",
      siglaPartido: "PSD",
      siglaUf: "MG",
    },
    comissao: { sigla: "CCT", nome: "Comissão de Ciência, Tecnologia e Inovação" },
    descricaoTipoRelator: "Relator",
    dataDesignacao: "2025-04-15",
  },
]

export const MOCK_SENADO_DOCUMENTS_9200 = [
  {
    idDocumento: 700001,
    descricaoTipoDocumento: "Texto inicial",
    descricao: "Texto apresentado pelo autor",
    dataDocumento: "2025-02-04",
    autoria: "Eduardo Braga (MDB/AM)",
    url: "https://legis.senado.leg.br/sdleg-getter/documento/700001",
  },
  {
    idDocumento: 700020,
    descricaoTipoDocumento: "Parecer",
    descricao: "Parecer favorável da CCT",
    dataDocumento: "2025-04-15",
    autoria: "Rodrigo Tavares",
    url: "https://legis.senado.leg.br/sdleg-getter/documento/700020",
  },
]

export const MOCK_SENADO_AMENDMENTS_9200 = [
  {
    idEmenda: 800001,
    identificacao: "EMENDA Nº 1 — CCT",
    dataEmenda: "2025-04-20",
    autoria: "Comissão de CCT",
    autorPrincipal: { nome: "Rodrigo Tavares", siglaPartido: "PSD" },
    descricao: "Inclui FUST como fonte adicional de recursos.",
    url: "https://legis.senado.leg.br/sdleg-getter/emenda/800001",
  },
]

// Voting sessions returned for date-range and per-session detail queries.
export const MOCK_SENADO_VOTING_SESSIONS_RANGE = [
  {
    codigoSessaoVotacao: 4001,
    dataSessao: "2025-03-12",
    descricaoVotacao: "PEC 5/2025 — Autonomia do MPU",
    siglaResultado: "APROVADA",
    voto: "Sim",
    parlamentar: {
      codigoParlamentar: "5672",
      nome: "Rodrigo Tavares",
      siglaPartido: "PSD",
      siglaUf: "MG",
    },
    materia: { idProcesso: 9201, identificacao: "PEC 5/2025" },
  },
  {
    codigoSessaoVotacao: 4001,
    dataSessao: "2025-03-12",
    descricaoVotacao: "PEC 5/2025 — Autonomia do MPU",
    siglaResultado: "APROVADA",
    voto: "Não",
    parlamentar: {
      codigoParlamentar: "5321",
      nome: "Sandra Mello",
      siglaPartido: "PT",
      siglaUf: "RJ",
    },
    materia: { idProcesso: 9201, identificacao: "PEC 5/2025" },
  },
  {
    codigoSessaoVotacao: 4002,
    dataSessao: "2025-04-08",
    descricaoVotacao: "PL 1500/2025 — Conectividade rural",
    siglaResultado: "APROVADA",
    voto: "Sim",
    parlamentar: {
      codigoParlamentar: "5672",
      nome: "Rodrigo Tavares",
      siglaPartido: "PSD",
      siglaUf: "MG",
    },
    materia: { idProcesso: 9200, identificacao: "PL 1500/2025" },
  },
]

export const MOCK_SENADO_VOTING_SESSION_4001 = MOCK_SENADO_VOTING_SESSIONS_RANGE.filter(
  (r) => r.codigoSessaoVotacao === 4001,
)

// ── Mock data: Senado institutional spending (Phase 8) ──────────────

/**
 * Mock contracts list — three rows covering different sub-species and years
 * so aggregations are exercised across categories.
 */
export const MOCK_SENADO_CONTRACTS = [
  {
    id: 9001,
    numero: "20240050",
    objeto: "Fornecimento de equipamentos de TI",
    licitacao: { numero: "0900012024", modalidade: "Pregão Eletrônico" },
    empresa: { nome: "TECH SOLUÇÕES LTDA", cpf_cnpj: "12.345.678/0001-90" },
    numero_formatado: "CT-CT/20240050",
    data_assinatura: "2024-05-12",
    data_publicacao: "2024-05-15",
    data_inicio_vigencia: "2024-05-12",
    data_fim_vigencia: "2026-05-12",
    fundamentacao_legal: "Lei nº 14.133/2021, art. 28, inciso I",
    processo_principal: "200012345202412",
    ind_mao_de_obra: false,
    data_ultima_atualizacao: "2024-05-15",
    sub_especie: { sigla: "CT", nome: "Contrato" },
    unidade_gestora: { sigla: "SF", nome: "Senado Federal" },
    orgaos_gestores: [],
  },
  {
    id: 9002,
    numero: "20230033",
    objeto: "Cessão de uso de espaço físico",
    licitacao: { numero: null, modalidade: "Não se Aplica" },
    empresa: { nome: "BANCO DO BRASIL S.A.", cpf_cnpj: "00.000.000/0001-91" },
    numero_formatado: "CS-CS/20230033",
    data_assinatura: "2023-08-01",
    data_publicacao: "2023-08-10",
    data_inicio_vigencia: "2023-08-01",
    data_fim_vigencia: null,
    fundamentacao_legal: null,
    processo_principal: "200005678202320",
    ind_mao_de_obra: false,
    data_ultima_atualizacao: "2023-08-10",
    sub_especie: { sigla: "CS", nome: "Cessão de Uso" },
    unidade_gestora: { sigla: "SF", nome: "Senado Federal" },
    orgaos_gestores: [],
  },
  {
    id: 9003,
    numero: "20240120",
    objeto: "Serviços de limpeza e conservação",
    licitacao: { numero: "0900022024", modalidade: "Pregão Eletrônico" },
    empresa: { nome: "LIMPEZA SP LTDA", cpf_cnpj: "98.765.432/0001-10" },
    numero_formatado: "CT-CT/20240120",
    data_assinatura: "2024-09-30",
    data_publicacao: "2024-10-02",
    data_inicio_vigencia: "2024-10-01",
    data_fim_vigencia: "2025-09-30",
    fundamentacao_legal: "Lei nº 14.133/2021",
    processo_principal: "200099999202410",
    ind_mao_de_obra: true,
    data_ultima_atualizacao: "2024-10-02",
    sub_especie: { sigla: "CT", nome: "Contrato" },
    unidade_gestora: { sigla: "SF", nome: "Senado Federal" },
    orgaos_gestores: [],
  },
]

/** Mock contracting companies — used to drive the top-contractors aggregation. */
export const MOCK_SENADO_CONTRACTORS = [
  {
    id: 7001,
    nome: "TECH SOLUÇÕES LTDA",
    cpf_cnpj: "12.345.678/0001-90",
    contratos: [{ id: 9001 }],
    notas_empenho: [{ id: 9001 }, { id: 9011 }],
  },
  {
    id: 7002,
    nome: "LIMPEZA SP LTDA",
    cpf_cnpj: "98.765.432/0001-10",
    contratos: [{ id: 9003 }, { id: 9004 }],
    notas_empenho: [{ id: 9003 }],
  },
  {
    id: 7003,
    nome: "BANCO DO BRASIL S.A.",
    cpf_cnpj: "00.000.000/0001-91",
    contratos: [{ id: 9002 }],
    notas_empenho: [],
  },
]

/** Mock bids — covers two distinct statuses and modalities. */
export const MOCK_SENADO_BIDS = [
  {
    id: 6001,
    numero: "01/2024",
    objeto: "Aquisição de equipamentos de TI",
    abertura: "2024-04-15",
    situacao: "HOMOLOGADA",
    edital: "https://www6g.senado.gov.br/transparencia/licitacoes-e-contratos/licitacoes/6001/edital",
    detalhamentos: [],
    modalidade: "Pregão Eletrônico",
    registro_preco: false,
    orgao_origem: "Senado Federal",
  },
  {
    id: 6002,
    numero: "02/2024",
    objeto: "Serviços de limpeza",
    abertura: "2024-08-01",
    situacao: "ABERTA",
    edital: "https://www6g.senado.gov.br/transparencia/licitacoes-e-contratos/licitacoes/6002/edital",
    detalhamentos: [],
    modalidade: "Pregão Eletrônico",
    registro_preco: true,
    orgao_origem: "Senado Federal",
  },
]

/** Mock servants — covers an effective civil servant and a commissioned one. */
export const MOCK_SENADO_SERVANTS = [
  {
    sequencial: 5001,
    nome: "MARIA DA SILVA",
    vinculo: "EFETIVO",
    situacao: "ATIVO",
    cargo: { nome: "ANALISTA LEGISLATIVO" },
    padrao: "S45",
    especialidade: "ANALISTA DE ADMINISTRAÇÃO",
    funcao: null,
    lotacao: { sigla: "GAB1", nome: "Gabinete da Presidência" },
    categoria: { codigo: "AL", nome: "ANALISTA LEGISLATIVO" },
    cedido: { tipo_cessao: null, orgao_origem: null, orgao_destino: null },
    ano_admissao: 2010,
  },
  {
    sequencial: 5002,
    nome: "JOÃO PEREIRA",
    vinculo: "COMISSIONADO",
    situacao: "ATIVO",
    cargo: null,
    padrao: null,
    especialidade: null,
    funcao: { nome: "Assessor parlamentar" },
    lotacao: { sigla: "GABXY", nome: "Gabinete do Senador Exemplo" },
    categoria: { codigo: "CC", nome: "CARGO EM COMISSÃO" },
    cedido: { tipo_cessao: null, orgao_origem: null, orgao_destino: null },
    ano_admissao: 2023,
  },
  {
    sequencial: 5003,
    nome: "ANA SOUZA",
    vinculo: "EFETIVO",
    situacao: "APOSENTADO",
    cargo: { nome: "TÉCNICO LEGISLATIVO" },
    padrao: "M36",
    especialidade: "TÉCNICO LEGISLATIVO",
    funcao: null,
    lotacao: { sigla: "NAPOSF", nome: "Aposentados - SF" },
    categoria: { codigo: "TL", nome: "TÉCNICO LEGISLATIVO" },
    cedido: { tipo_cessao: null, orgao_origem: null, orgao_destino: null },
    ano_admissao: 1985,
  },
]

/**
 * Mock career-class headcount aggregate — two unique career plans so the
 * deduplication rule (one row per `(className, careerPlan)` pair) is exercised.
 */
export const MOCK_SENADO_HEADCOUNT = [
  {
    classe: "ESPECIAL",
    estaveis: 200,
    subtotal: 220,
    vagos: 50,
    aposentados: 100,
    grupo: "A",
    plano_carreira: "Cargos: Analista Legislativo",
    nivel_escolaridade: "Nível III",
    padrao_nivel_referencia: "S45",
    nao_estaveis: 20,
    total_ativo: 320,
    instituidores_pensao: 40,
    total_inativo: 140,
    beneficiarios_pensao: 60,
  },
  // Same plan, different padrão — totalActive is denormalized; should NOT be
  // double-counted when summing chamber-wide totals.
  {
    classe: "ESPECIAL",
    estaveis: 100,
    subtotal: 100,
    vagos: 50,
    aposentados: 50,
    grupo: "A",
    plano_carreira: "Cargos: Analista Legislativo",
    nivel_escolaridade: "Nível III",
    padrao_nivel_referencia: "S44",
    nao_estaveis: 0,
    total_ativo: 320,
    instituidores_pensao: 0,
    total_inativo: 50,
    beneficiarios_pensao: 0,
  },
  {
    classe: "INTERMEDIARIA",
    estaveis: 80,
    subtotal: 80,
    vagos: 20,
    aposentados: 40,
    grupo: "B",
    plano_carreira: "Cargos: Técnico Legislativo",
    nivel_escolaridade: "Nível II",
    padrao_nivel_referencia: "M36",
    nao_estaveis: 0,
    total_ativo: 110,
    instituidores_pensao: 10,
    total_inativo: 50,
    beneficiarios_pensao: 10,
  },
]

/** Mock monthly remuneration roll — three rows including a commissioned servant. */
export const MOCK_SENADO_REMUNERATION_2025_3 = [
  {
    sequencial: 5001,
    nome: "MARIA DA SILVA",
    mes: 3,
    ano: 2025,
    previdencia: "-3.500,00",
    faltas: "0,00",
    diarias: "0,00",
    auxilios: "500,00",
    tipo_folha: "Normal",
    remuneracao_basica: "30.000,00",
    vantagens_pessoais: "1.500,00",
    funcao_comissionada: "0,00",
    gratificacao_natalina: "0,00",
    horas_extras: "0,00",
    outras_eventuais: "0,00",
    abono_permanencia: "0,00",
    reversao_teto_constitucional: "0,00",
    imposto_renda: "-2.000,00",
    remuneracao_liquida: "26.500,00",
    vantagens_indenizatorias: "0,00",
  },
  {
    sequencial: 5002,
    nome: "JOÃO PEREIRA",
    mes: 3,
    ano: 2025,
    previdencia: "-1.000,00",
    faltas: "0,00",
    diarias: "0,00",
    auxilios: "400,00",
    tipo_folha: "Normal",
    remuneracao_basica: "8.000,00",
    vantagens_pessoais: "0,00",
    funcao_comissionada: "0,00",
    gratificacao_natalina: "0,00",
    horas_extras: "0,00",
    outras_eventuais: "0,00",
    abono_permanencia: "0,00",
    reversao_teto_constitucional: "0,00",
    imposto_renda: "-500,00",
    remuneracao_liquida: "6.900,00",
    vantagens_indenizatorias: "0,00",
  },
  {
    sequencial: 5003,
    nome: "ANA SOUZA",
    mes: 3,
    ano: 2025,
    previdencia: "0,00",
    faltas: "0,00",
    diarias: "0,00",
    auxilios: "0,00",
    tipo_folha: "Normal",
    remuneracao_basica: "12.000,00",
    vantagens_pessoais: "0,00",
    funcao_comissionada: "0,00",
    gratificacao_natalina: "0,00",
    horas_extras: "0,00",
    outras_eventuais: "0,00",
    abono_permanencia: "0,00",
    reversao_teto_constitucional: "0,00",
    imposto_renda: "-1.000,00",
    remuneracao_liquida: "11.000,00",
    vantagens_indenizatorias: "0,00",
  },
]

// ── Mock data: Portal da Transparência (contracts) ─────────────────

/**
 * Mock contracts list for `GET /api-de-dados/contratos?cnpjContratada=...`.
 *
 * Three rows tied to CNPJ "11222333000181": two with full PJ payload
 * (signature + start/end dates, both values published) and one minimal row
 * exercising defensive mapping (missing dates, value as a comma-decimal
 * string, no `valorFinalCompra`).
 */
export const MOCK_TRANSP_CONTRACTS_11222333000181 = [
  {
    id: 9001,
    numero: "10/2024",
    objeto: "Aquisição de equipamentos de TI para o Ministério da Educação",
    fundamentoLegal: "Lei 14.133/2021",
    modalidadeCompra: "Pregão Eletrônico",
    situacaoCompra: "ATIVO",
    dataAssinatura: "2024-02-15",
    dataPublicacaoDOU: "2024-02-20",
    dataInicioVigencia: "2024-03-01",
    dataFimVigencia: "2025-03-01",
    valorInicialCompra: 250000.00,
    valorFinalCompra: 250000.00,
    fornecedor: {
      tipo: "PJ",
      nome: "ACME COMERCIO E SERVICOS LTDA",
      razaoSocialReceita: "ACME COMERCIO E SERVICOS LTDA",
      nomeFantasiaReceita: "ACME",
      cnpjFormatado: "11.222.333/0001-81",
      cpfFormatado: null,
      cpfCnpj: "11222333000181",
    },
    unidadeGestora: {
      codigo: "200999",
      nomeResumido: "COORD-GERAL TI/MEC",
      nome: "Coordenação Geral de Tecnologia da Informação",
      descricaoPoder: "EXECUTIVO",
      orgaoVinculado: {
        codigoSIAFI: "26000",
        cnpj: "00394445000131",
        sigla: "MEC",
        nome: "Ministério da Educação",
      },
      orgaoMaximo: {
        codigo: "26000",
        sigla: "MEC",
        nome: "Ministério da Educação",
      },
    },
    linkPaginaContrato:
      "https://portaldatransparencia.gov.br/contratos/numero?id=9001",
  },
  {
    id: 9002,
    numero: "42/2023",
    objeto: "Manutenção preventiva de servidores",
    fundamentoLegal: "Lei 8.666/93",
    modalidadeCompra: "Dispensa de Licitação",
    situacaoCompra: "ENCERRADO",
    dataAssinatura: "15/06/2023",
    dataInicioVigencia: "01/07/2023",
    dataFimVigencia: "30/06/2024",
    valorInicialCompra: 80000,
    valorFinalCompra: 95000,
    fornecedor: {
      tipo: "PJ",
      nome: "ACME COMERCIO E SERVICOS LTDA",
      razaoSocialReceita: "ACME COMERCIO E SERVICOS LTDA",
      cnpjFormatado: "11.222.333/0001-81",
      cpfCnpj: "11222333000181",
    },
    unidadeGestora: {
      codigo: "110001",
      orgaoVinculado: {
        codigoSIAFI: "20000",
        sigla: "PRESID",
        nome: "Presidência da República",
      },
    },
    linkPaginaContrato:
      "https://portaldatransparencia.gov.br/contratos/numero?id=9002",
  },
  {
    id: 9003,
    numero: "5/2025",
    objeto: "Licença de software",
    modalidadeCompra: "Pregão Eletrônico",
    situacaoCompra: "ATIVO",
    valorInicialCompra: "12.500,00",
    valorFinalCompra: null,
    fornecedor: {
      tipo: "PJ",
      nome: "ACME COMERCIO E SERVICOS LTDA",
      cpfCnpj: "11222333000181",
    },
    unidadeGestora: {
      codigo: "200999",
      orgaoVinculado: {
        codigoSIAFI: "26000",
        sigla: "MEC",
        nome: "Ministério da Educação",
      },
    },
    linkPaginaContrato:
      "https://portaldatransparencia.gov.br/contratos/numero?id=9003",
  },
]

// ── Mock data: TSE campaign donations ───────────────────────────────

/**
 * Mock receitas (donor-side) rows for CNPJ "11222333000181" in 2022.
 *
 * Two rows are intentionally seeded so tests can exercise the SUM
 * aggregation in the ROI helper as well as the ordering branch.
 */
export const MOCK_TSE_RECEITAS_2022_11222333000181 = {
  success: true,
  result: {
    records: [
      {
        SQ_RECEITA: "R-1",
        ANO_ELEICAO: 2022,
        NR_CPF_CNPJ_DOADOR: "11222333000181",
        NM_DOADOR: "ACME COMERCIO E SERVICOS LTDA",
        NM_DOADOR_RFB: "ACME COMERCIO E SERVICOS LTDA",
        NR_CPF_CANDIDATO: "12345678901",
        NM_CANDIDATO: "FULANO DE TAL",
        DS_CARGO: "DEPUTADO FEDERAL",
        SG_PARTIDO: "PT",
        SG_UF: "SP",
        VR_RECEITA: "10000,00",
        DT_RECEITA: "15/08/2022",
      },
      {
        SQ_RECEITA: "R-2",
        ANO_ELEICAO: 2022,
        NR_CPF_CNPJ_DOADOR: "11222333000181",
        NM_DOADOR_RFB: "ACME COMERCIO E SERVICOS LTDA",
        NR_CPF_CANDIDATO: "98765432109",
        NM_CANDIDATO: "BELTRANO SOUZA",
        DS_CARGO: "SENADOR",
        SG_PARTIDO: "PSDB",
        SG_UF: "SP",
        VR_RECEITA: 5000,
        DT_RECEITA: "2022-09-10",
      },
    ],
  },
}

/**
 * Mock despesas (vendor-side) rows for CNPJ "11222333000181" in 2022.
 *
 * Carries one row whose candidate is also in the receitas fixture
 * (`12345678901`) so the ROI helper has a counterparty with both
 * directions to net against.
 */
export const MOCK_TSE_DESPESAS_2022_11222333000181 = {
  success: true,
  result: {
    records: [
      {
        SQ_DESPESA: "D-1",
        ANO_ELEICAO: 2022,
        NR_CPF_CNPJ_FORNECEDOR: "11222333000181",
        NM_FORNECEDOR: "ACME COMERCIO E SERVICOS LTDA",
        NM_FORNECEDOR_RFB: "ACME COMERCIO E SERVICOS LTDA",
        NR_CPF_CANDIDATO: "12345678901",
        NM_CANDIDATO: "FULANO DE TAL",
        DS_CARGO: "DEPUTADO FEDERAL",
        SG_PARTIDO: "PT",
        SG_UF: "SP",
        VR_DESPESA: "3500,00",
        DT_DESPESA: "20/09/2022",
      },
    ],
  },
}

// ── Mock data: OpenCNPJ ─────────────────────────────────────────────

/**
 * Mock OpenCNPJ detail for CNPJ "11222333000181" — a fictional company with
 * a mixed QSA (one natural-person partner with masked CPF, one juridical
 * person partner with a CNPJ).
 */
export const MOCK_OPENCNPJ_11222333000181 = {
  cnpj: "11222333000181",
  razao_social: "ACME COMERCIO E SERVICOS LTDA",
  nome_fantasia: "ACME",
  situacao_cadastral: "ATIVA",
  data_situacao_cadastral: "2010-05-12",
  matriz_filial: "Matriz",
  data_inicio_atividade: "2010-05-12",
  // OpenCNPJ exposes CNAEs as bare 7-digit codes (no description).
  cnae_principal: "4751201",
  cnaes_secundarios: ["6201501"],
  natureza_juridica: "Sociedade Empresária Limitada",
  // Bracelet-style top-level address fields — there is no nested `endereco`.
  tipo_logradouro: "RUA",
  logradouro: "DAS FLORES",
  numero: "100",
  complemento: "Sala 5",
  bairro: "Centro",
  cep: "01000000",
  uf: "SP",
  municipio: "São Paulo",
  porte_empresa: "EPP",
  capital_social: "100000,00",
  // QSA list is capitalized and partner ID lives under `cnpj_cpf_socio`.
  QSA: [
    {
      nome_socio: "João da Silva",
      cnpj_cpf_socio: "***456789**",
      qualificacao_socio: "Sócio-Administrador",
      data_entrada_sociedade: "2010-05-12",
      identificador_socio: "Pessoa Física",
    },
    {
      nome_socio: "ACME HOLDING SA",
      cnpj_cpf_socio: "99888777000166",
      qualificacao_socio: "Sócio",
      data_entrada_sociedade: "2015-03-01",
      identificador_socio: "Pessoa Jurídica",
    },
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

  // ── Senado Federal ──────────────────────────────────────────────────

  /** GET /senador/lista/atual.json — active senators */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json",
    () => HttpResponse.json(MOCK_SENADO_SENATORS_LIST),
  ),

  /** GET /senador/:id/mandatos.json — senator mandates */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/mandatos.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_SENATOR_MANDATES_5672)
      if (id === "5321") return HttpResponse.json(MOCK_SENADO_SENATOR_MANDATES_5321)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/:id/filiacoes.json — senator party affiliations */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/filiacoes.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_SENATOR_AFFILIATIONS_5672)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/partidos.json — Senate parties (declared before :id.json) */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/partidos.json",
    () => HttpResponse.json(MOCK_SENADO_PARTIES),
  ),

  /** GET /senador/:id.json — senator detail */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_SENATOR_DETAIL_5672)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /votacao — modern voting endpoint with query filters */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/votacao",
    ({ request }) => {
      const url = new URL(request.url)
      const senatorId = url.searchParams.get("codigoParlamentar")
      const sessionId = url.searchParams.get("codigoSessaoVotacao")
      const dataInicio = url.searchParams.get("dataInicio")

      if (sessionId === "4001") {
        return HttpResponse.json(MOCK_SENADO_VOTING_SESSION_4001)
      }
      if (senatorId === "5672") {
        return HttpResponse.json(MOCK_SENADO_VOTING_5672_2024)
      }
      if (dataInicio && !senatorId && !sessionId) {
        return HttpResponse.json(MOCK_SENADO_VOTING_SESSIONS_RANGE)
      }
      return HttpResponse.json([])
    },
  ),

  /** GET /processo — modern process search */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/processo",
    ({ request }) => {
      const url = new URL(request.url)
      const senatorId = url.searchParams.get("codigoParlamentarAutor")
      const ano = url.searchParams.get("ano")
      if (senatorId === "5672") {
        return HttpResponse.json(MOCK_SENADO_PROPOSITIONS_5672)
      }
      if (ano === "2025") {
        return HttpResponse.json(MOCK_SENADO_PROPOSITIONS_2025)
      }
      return HttpResponse.json([])
    },
  ),

  /** GET /processo/relatoria — rapporteurship history (declared before
   *  /processo/:id so the path-param route does not swallow it). */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/processo/relatoria",
    ({ request }) => {
      const id = new URL(request.url).searchParams.get("idProcesso")
      if (id === "9200") return HttpResponse.json(MOCK_SENADO_RAPPORTEURSHIP_9200)
      return HttpResponse.json([])
    },
  ),

  /** GET /processo/documento — proposition documents */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/processo/documento",
    ({ request }) => {
      const id = new URL(request.url).searchParams.get("idProcesso")
      if (id === "9200") return HttpResponse.json(MOCK_SENADO_DOCUMENTS_9200)
      return HttpResponse.json([])
    },
  ),

  /** GET /processo/emenda — proposition amendments */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/processo/emenda",
    ({ request }) => {
      const id = new URL(request.url).searchParams.get("idProcesso")
      if (id === "9200") return HttpResponse.json(MOCK_SENADO_AMENDMENTS_9200)
      return HttpResponse.json([])
    },
  ),

  /** GET /processo/:id — proposition detail (catch-all for any other id) */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/processo/:id",
    ({ params }) => {
      const id = String(params.id ?? "")
      if (id === "9200") return HttpResponse.json(MOCK_SENADO_PROPOSITION_DETAIL_9200)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/:id/discursos.json — speeches */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/discursos.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_SPEECHES_5672)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/:id/comissoes.json — committee memberships */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/comissoes.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_COMMITTEES_5672)
      if (id === "5321") return HttpResponse.json(MOCK_SENADO_COMMITTEES_5321)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/:id/cargos.json — chair / vice-chair positions */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/cargos.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_POSITIONS_5672)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET /senador/:id/liderancas.json — leadership roles */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/liderancas.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_LEADERSHIPS_5672)
      return new HttpResponse(null, { status: 404 })
    },
  ),

  /** GET admin /senadores/despesas_ceaps/:ano — annual CEAPS bulk */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/:ano",
    ({ params }) => {
      const ano = params.ano as string
      if (ano === "2024") return HttpResponse.json(MOCK_SENADO_CEAPS_2024)
      // Past years not stocked in fixtures — return empty bulk.
      return HttpResponse.json([])
    },
  ),

  /** GET /plenario/resultado/mes/:yyyymm — sessions and comparecimento for a month */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/plenario/resultado/mes/:yyyymm",
    ({ params }) => {
      const yyyymm = params.yyyymm as string
      if (yyyymm === "202403") {
        return HttpResponse.json(MOCK_SENADO_PLENARY_RESULT_202403)
      }
      if (yyyymm === "202404") {
        return HttpResponse.json(MOCK_SENADO_PLENARY_RESULT_202404)
      }
      // Recess / empty months
      return HttpResponse.json(MOCK_SENADO_PLENARY_RESULT_EMPTY)
    },
  ),

  // ── Senado Federal — Institutional spending (Phase 8) ──────────────

  /** GET admin /contratacoes/contratos — all contracts */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/contratos",
    () => HttpResponse.json(MOCK_SENADO_CONTRACTS),
  ),

  /** GET admin /contratacoes/empresas — contracting companies */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/empresas",
    () => HttpResponse.json(MOCK_SENADO_CONTRACTORS),
  ),

  /** GET admin /contratacoes/licitacoes — bids */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/licitacoes",
    () => HttpResponse.json(MOCK_SENADO_BIDS),
  ),

  /** GET admin /servidores/servidores — full personnel list */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/servidores/servidores",
    () => HttpResponse.json(MOCK_SENADO_SERVANTS),
  ),

  /** GET admin /servidores/quantitativos/pessoal — career-class headcount aggregate */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/servidores/quantitativos/pessoal",
    () => HttpResponse.json(MOCK_SENADO_HEADCOUNT),
  ),

  /** GET admin /servidores/remuneracoes/:ano/:mes — monthly payroll */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/servidores/remuneracoes/:ano/:mes",
    ({ params }) => {
      const ano = params.ano as string
      const mes = params.mes as string
      if (ano === "2025" && mes === "3") {
        return HttpResponse.json(MOCK_SENADO_REMUNERATION_2025_3)
      }
      return HttpResponse.json([])
    },
  ),

  // ── Senado Federal — Phase 9 (parity expansion) ────────────────────

  /** GET /senador/:id/licencas.json — formal leaves */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/licencas.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_LEAVES_5672)
      return HttpResponse.json({})
    },
  ),

  /** GET /senador/:id/historicoAcademico.json — education history */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/historicoAcademico.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_ACADEMIC_5672)
      return HttpResponse.json({})
    },
  ),

  /** GET /senador/:id/profissao.json — declared professions */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/profissao.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_PROFESSIONS_5672)
      return HttpResponse.json({})
    },
  ),

  /** GET /senador/:id/apartes.json — interjections */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/:id/apartes.json",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_INTERJECTIONS_5672)
      return HttpResponse.json({})
    },
  ),

  /** GET /votacaoComissao/parlamentar/:id — committee votes */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/votacaoComissao/parlamentar/:id",
    ({ params }) => {
      const id = params.id as string
      if (id === "5672") return HttpResponse.json(MOCK_SENADO_COMMITTEE_VOTES_5672)
      return HttpResponse.json([])
    },
  ),

  /** GET /plenario/votacao/orientacaoBancada/:ini/:fim — leadership orientations */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/plenario/votacao/orientacaoBancada/:ini/:fim",
    () => HttpResponse.json(MOCK_SENADO_VOTING_ORIENTATIONS),
  ),

  /** GET admin /senadores/escritorios — regional offices */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/escritorios",
    () => HttpResponse.json(MOCK_SENADO_OFFICES),
  ),

  /** GET admin /senadores/auxilio-moradia — housing aid */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/auxilio-moradia",
    () => HttpResponse.json(MOCK_SENADO_HOUSING_AID),
  ),

  /** GET /materia/vetos/:ano — presidential vetoes */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/materia/vetos/:ano",
    ({ params }) => {
      const ano = params.ano as string
      if (ano === "2025") return HttpResponse.json(MOCK_SENADO_VETOS_2025)
      return HttpResponse.json({ ListaMaterias: { Materia: [] } })
    },
  ),

  /** GET /senador/partidos.json — Senate parties */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/senador/partidos.json",
    () => HttpResponse.json(MOCK_SENADO_PARTIES),
  ),

  /** GET /dados/ListaBlocoParlamentar.json — parliamentary blocs */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/dados/ListaBlocoParlamentar.json",
    () => HttpResponse.json(MOCK_SENADO_BLOCS),
  ),

  /** GET /composicao/lideranca — active leadership composition */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/composicao/lideranca",
    () => HttpResponse.json(MOCK_SENADO_LEADERSHIP_COMPOSITION),
  ),

  /** GET admin /contratacoes/contratos/:id/aditivos — contract amendments */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/contratos/:id/aditivos",
    ({ params }) => {
      const id = params.id as string
      if (id === "C001") return HttpResponse.json(MOCK_SENADO_CONTRACT_AMENDMENTS_C001)
      return HttpResponse.json([])
    },
  ),

  /** GET admin /contratacoes/:tipo/:id/pagamentos — contract payments */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/:tipo/:id/pagamentos",
    ({ params }) => {
      const id = params.id as string
      if (id === "C001") return HttpResponse.json(MOCK_SENADO_CONTRACT_PAYMENTS_C001)
      return HttpResponse.json([])
    },
  ),

  /** GET admin /contratacoes/terceirizados — outsourced workers */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/terceirizados",
    () => HttpResponse.json(MOCK_SENADO_OUTSOURCED),
  ),

  /** GET admin /contratacoes/notas_empenho — purchase orders */
  http.get(
    "https://adm.senado.gov.br/adm-dadosabertos/api/v1/contratacoes/notas_empenho",
    () => HttpResponse.json(MOCK_SENADO_EMPENHOS),
  ),

  /** GET /plenario/agenda/dia/:yyyymmdd — daily plenary agenda */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/plenario/agenda/dia/:yyyymmdd",
    () => HttpResponse.json(MOCK_SENADO_AGENDA_DAY),
  ),

  /** GET /plenario/agenda/mes/:yyyymm — monthly plenary agenda */
  http.get(
    "https://legis.senado.leg.br/dadosabertos/plenario/agenda/mes/:yyyymm",
    () => HttpResponse.json(MOCK_SENADO_AGENDA_DAY),
  ),

  // ── Portal da Transparência ─────────────────────────────────────────

  /**
   * GET /api-de-dados/contratos — federal contracts.
   *
   * The handler honors the most common filter (`cnpjContratada`); when no
   * filter matches the fixture, it returns an empty array so callers exercise
   * the empty-result code path. Tests that need other filters can install a
   * one-off handler via `server.use()`.
   */
  http.get(
    "https://api.portaldatransparencia.gov.br/api-de-dados/contratos",
    ({ request }) => {
      const url = new URL(request.url)
      const cnpj = url.searchParams.get("cnpjContratada")
      if (cnpj === "11222333000181") {
        return HttpResponse.json(MOCK_TRANSP_CONTRACTS_11222333000181)
      }
      return HttpResponse.json([])
    },
  ),

  // ── TSE CKAN datastore_search ───────────────────────────────────────

  /**
   * GET /api/3/action/datastore_search — donations dataset.
   *
   * The handler routes by `resource_id` and the JSON-encoded `filters`
   * query param. Resource IDs match {@link DONATION_RESOURCES} in
   * `tse.ts`; non-matching combinations return an empty `records` array
   * to exercise the empty-result code path.
   */
  http.get(
    "https://dadosabertos.tse.jus.br/api/3/action/datastore_search",
    ({ request }) => {
      const url = new URL(request.url)
      const resourceId = url.searchParams.get("resource_id") ?? ""
      const rawFilters = url.searchParams.get("filters") ?? "{}"
      let filters: Record<string, string> = {}
      try {
        filters = JSON.parse(rawFilters)
      } catch {
        filters = {}
      }
      const cnpjDoador = filters["NR_CPF_CNPJ_DOADOR"] ?? ""
      const cnpjFornecedor = filters["NR_CPF_CNPJ_FORNECEDOR"] ?? ""

      if (
        resourceId === "tse-receitas-candidatos-2022" &&
        cnpjDoador === "11222333000181"
      ) {
        return HttpResponse.json(MOCK_TSE_RECEITAS_2022_11222333000181)
      }
      if (
        resourceId === "tse-despesas-contratadas-candidatos-2022" &&
        cnpjFornecedor === "11222333000181"
      ) {
        return HttpResponse.json(MOCK_TSE_DESPESAS_2022_11222333000181)
      }
      return HttpResponse.json({ success: true, result: { records: [] } })
    },
  ),

  // ── OpenCNPJ ────────────────────────────────────────────────────────

  /** GET /:cnpj — full company detail by 14-digit CNPJ */
  http.get("https://api.opencnpj.org/:cnpj", ({ params }) => {
    const cnpj = String(params.cnpj ?? "")
    if (cnpj === "11222333000181") {
      return HttpResponse.json(MOCK_OPENCNPJ_11222333000181)
    }
    // Any other CNPJ is treated as not-in-bulk to exercise the negative
    // cache code path. Tests that need a different CNPJ should use
    // `server.use()` to install a one-off handler.
    return new HttpResponse(null, { status: 404 })
  }),
]

// ── Phase 9 mock fixtures (parity expansion) ──────────────────────────

export const MOCK_SENADO_LEAVES_5672 = {
  LicencaParlamentar: {
    Parlamentar: {
      Licencas: {
        Licenca: [
          {
            CodigoLicenca: "L1",
            TipoLicenca: { DescricaoTipoLicenca: "Saúde" },
            DataInicio: "2025-04-10",
            DataFim: "2025-04-30",
            Motivo: "Tratamento médico",
          },
          {
            CodigoLicenca: "L2",
            TipoLicenca: { DescricaoTipoLicenca: "Atividade política" },
            DataInicio: "2025-08-15",
            DataFim: "2025-08-22",
          },
        ],
      },
    },
  },
}

export const MOCK_SENADO_ACADEMIC_5672 = {
  HistoricoAcademicoParlamentar: {
    Parlamentar: {
      HistoricoAcademico: {
        Curso: [
          {
            Curso: "Bacharelado em Direito",
            Estabelecimento: "Universidade Federal de Minas Gerais",
            Grau: "Superior",
            AnoConclusao: "1992",
          },
          {
            Curso: "Mestrado em Direito Constitucional",
            Estabelecimento: "PUC-MG",
            Grau: "Pós-graduação",
            AnoConclusao: "1998",
          },
        ],
      },
    },
  },
}

export const MOCK_SENADO_PROFESSIONS_5672 = {
  ProfissaoParlamentar: {
    Parlamentar: {
      Profissoes: {
        Profissao: [
          {
            NomeProfissao: "Advogado",
            IndicadorAtividadePrincipal: "Sim",
            IndicadorExercendoAtividade: "Sim",
          },
          {
            NomeProfissao: "Empresário",
            IndicadorAtividadePrincipal: "Não",
            IndicadorExercendoAtividade: "Não",
          },
        ],
      },
    },
  },
}

export const MOCK_SENADO_INTERJECTIONS_5672 = {
  ApartesParlamentar: {
    Parlamentar: {
      Apartes: {
        Aparte: [
          {
            CodigoPronunciamento: "P1",
            DataPronunciamento: "2025-03-12T14:00:00",
            TextoResumo: "Aparte sobre reforma tributária",
            UrlTexto: "https://www.senado.leg.br/notas/p1.txt",
            Indexacao: "Reforma tributária",
            NomeAutor: "Senador X",
          },
          {
            CodigoPronunciamento: "P2",
            DataPronunciamento: "2025-04-22T10:30:00",
            TextoResumo: "Aparte sobre orçamento",
          },
        ],
      },
    },
  },
}

export const MOCK_SENADO_COMMITTEE_VOTES_5672 = [
  {
    codigoSessaoVotacao: "CV1",
    dataSessao: "2025-04-15",
    siglaComissao: "CCJ",
    nomeComissao: "Comissão de Constituição, Justiça e Cidadania",
    descricaoVotacao: "PL 100/2025 — projeto sobre LGPD",
    voto: "Sim",
    siglaResultado: "APROVADA",
    identificacaoMateria: "PL 100/2025",
    codigoMateriaPrincipal: 9100,
  },
  {
    codigoSessaoVotacao: "CV2",
    dataSessao: "2025-05-03",
    siglaComissao: "CAE",
    nomeComissao: "Comissão de Assuntos Econômicos",
    descricaoVotacao: "PL 200/2025",
    voto: "Não",
    siglaResultado: "REJEITADA",
  },
]

export const MOCK_SENADO_VOTING_ORIENTATIONS = [
  {
    codigoSessaoVotacao: "4001",
    dataSessao: "2024-03-15",
    siglaPartido: "PSD",
    orientacao: "Sim",
  },
  {
    codigoSessaoVotacao: "4002",
    dataSessao: "2024-05-10",
    siglaPartido: "PSD",
    orientacao: "Não",
  },
  {
    codigoSessaoVotacao: "4001",
    dataSessao: "2024-03-15",
    siglaPartido: "PT",
    orientacao: "Não",
  },
]

export const MOCK_SENADO_OFFICES = [
  {
    codigo: 1,
    codigoSenador: 5672,
    nomeSenador: "Marcos Pestana",
    endereco: "Av. Afonso Pena, 1500, Sala 201",
    cidade: "Belo Horizonte",
    uf: "MG",
    telefone: "(31) 3333-4444",
    email: "gabinete@example.com",
  },
]

export const MOCK_SENADO_HOUSING_AID = [
  { codigoSenador: 5672, nomeSenador: "Marcos Pestana", ano: 2025, mes: 1, valorPago: 5500 },
  { codigoSenador: 5672, nomeSenador: "Marcos Pestana", ano: 2025, mes: 2, valorPago: 5500 },
  { codigoSenador: 5672, nomeSenador: "Marcos Pestana", ano: 2025, mes: 3, valorPago: 5500 },
  { codigoSenador: 5321, nomeSenador: "Outro Senador", ano: 2025, mes: 1, valorPago: 10000 },
]

export const MOCK_SENADO_VETOS_2025 = {
  ListaMaterias: {
    Materia: [
      {
        codigoMateria: "V1",
        identificacao: "VET 1/2025",
        numero: 1,
        ano: 2025,
        data: "2025-02-10",
        ementa: "Veta dispositivos da Lei XYZ",
        tipoVeto: "Parcial",
        situacaoAtual: "Em deliberação",
        materiaOrigem: { identificacao: "PL 1234/2024" },
      },
    ],
  },
}

export const MOCK_SENADO_PARTIES = {
  ListaPartidos: {
    Partidos: {
      Partido: [
        { Sigla: "PSD", Nome: "Partido Social Democrático", NumeroSenadores: 12 },
        { Sigla: "PT", Nome: "Partido dos Trabalhadores", NumeroSenadores: 9 },
      ],
    },
  },
}

export const MOCK_SENADO_BLOCS = {
  ListaBlocoParlamentar: {
    Blocos: {
      Bloco: [
        {
          CodigoBloco: "B1",
          NomeBloco: "Bloco Parlamentar Vanguarda",
          NomeApelido: "Vanguarda",
          SiglaBloco: "VAN",
          DataCriacao: "2023-02-01",
          Membros: { Membro: [{ Sigla: "PSD" }, { Sigla: "MDB" }] },
        },
      ],
    },
  },
}

export const MOCK_SENADO_LEADERSHIP_COMPOSITION = [
  {
    codigoParlamentar: "5672",
    nomeParlamentar: "Marcos Pestana",
    siglaUnidade: "PSD",
    nomeUnidade: "Partido Social Democrático",
    tipoUnidade: "Partido",
    descricaoCargo: "Líder",
    dataInicio: "2024-02-01",
  },
]

export const MOCK_SENADO_CONTRACT_AMENDMENTS_C001 = [
  {
    codigo: "A1",
    numero: "1",
    tipoAditivo: "Aditivo de prazo",
    dataAssinatura: "2025-04-01",
    novaDataFim: "2026-04-01",
    objeto: "Prorrogação de 12 meses",
  },
  {
    codigo: "A2",
    numero: "2",
    tipoAditivo: "Aditivo de valor",
    dataAssinatura: "2025-08-15",
    valorAcrescimo: 50000,
    valorReducao: 0,
  },
]

export const MOCK_SENADO_CONTRACT_PAYMENTS_C001 = [
  { codigo: "P1", observacao: "", multa: 0, glosa: 0, descricaoDespesa: "Janeiro/2025", valor: 100000 },
  { codigo: "P2", observacao: "", multa: 0, glosa: 200, descricaoDespesa: "Fevereiro/2025", valor: 100000 },
]

export const MOCK_SENADO_OUTSOURCED = [
  {
    codigo: "T1",
    nome: "João Limpeza",
    funcao: "Auxiliar de Serviços Gerais",
    empresa: "ABC Serviços Ltda",
    unidadeLotacao: "DGER",
    situacao: "ATIVO",
  },
]

export const MOCK_SENADO_EMPENHOS = [
  {
    codigo: "E1",
    numero: "2025NE000001",
    data: "2025-01-15",
    fornecedor: "Fornecedor X Ltda",
    cnpjFornecedor: "12345678000100",
    valor: 50000,
    descricao: "Aquisição de material de escritório",
  },
]

export const MOCK_SENADO_AGENDA_DAY = [
  {
    Data: "2026-05-15",
    TipoSessao: "Sessão Deliberativa Ordinária",
    Descricao: "Votação do PL 100/2026",
    Materia: { Identificacao: "PL 100/2026", IdProcesso: 9100 },
  },
]
