/**
 * @file endpoints.ts
 * @description All API base URLs and endpoint path constants used across Imposterio.
 *
 * Every external API URL must be constructed from constants defined here.
 * Hardcoding URLs inline in fetchers, components, or API Routes is forbidden.
 * This centralizes URL management so that endpoint changes only need to be
 * updated in one place.
 */

/** Base URLs for each government data source. */
export const BASE_URLS = {
  /** Camara dos Deputados Open Data API (lower house of Congress) */
  CAMARA: "https://dadosabertos.camara.leg.br/api/v2",

  /** Camara bulk file downloads (attendance, staff, historical expenses) */
  CAMARA_BULK: "http://dadosabertos.camara.leg.br/arquivos",

  /** Senado Federal Open Data API (upper house of Congress) */
  SENADO: "https://legis.senado.leg.br/dadosabertos",

  /** Senado administrative API (compensation, CEAPS, servants) */
  SENADO_ADMIN: "https://adm.senado.gov.br/adm-dadosabertos",

  /** Senado transparency portal (LAI CSV bulk files) */
  SENADO_TRANSPARENCY: "https://www.senado.leg.br/transparencia/LAI/verba",

  /** Portal da Transparencia (federal executive transparency data) */
  TRANSPARENCIA: "https://api.portaldatransparencia.gov.br/api-de-dados",

  /** CNJ DataJud (judicial system public data) */
  DATAJUD: "https://api-publica.datajud.cnj.jus.br",

  /** TSE open data portal (electoral court) */
  TSE: "https://dadosabertos.tse.jus.br",

  /** TSE candidate asset declarations and campaign finance */
  TSE_DIVULGA: "https://divulgacandcontas.tse.jus.br",

  /**
   * OpenCNPJ — open-source CNPJ lookup API rebuilt monthly from the Federal
   * Revenue bulk. No auth, no documented rate limit. Replaces CNPJá, which
   * imposed a 5 req/min cap on anonymous use.
   *
   * Project page: https://opencnpj.org
   */
  OPENCNPJ: "https://api.opencnpj.org",
} as const

/**
 * Full endpoint paths built from base URLs.
 * Use these constants when constructing URLs in fetcher functions.
 */
export const ENDPOINTS = {
  // ── Camara dos Deputados ────────────────────────────────────────────
  CAMARA_DEPUTIES: `${BASE_URLS.CAMARA}/deputados`,
  CAMARA_DEPUTY: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}`,
  CAMARA_DEPUTY_EXPENSES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/despesas`,
  CAMARA_DEPUTY_VOTES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/votacoes`,
  CAMARA_DEPUTY_SPEECHES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/discursos`,
  CAMARA_DEPUTY_CAUCUSES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/frentes`,
  CAMARA_DEPUTY_COMMITTEES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/orgaos`,
  CAMARA_DEPUTY_EVENTS: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/eventos`,
  CAMARA_DEPUTY_HISTORY: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/historico`,
  CAMARA_DEPUTY_MANDATES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/mandatosExternos`,
  CAMARA_DEPUTY_PROFESSIONS: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/profissoes`,
  CAMARA_DEPUTY_OCCUPATIONS: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/ocupacoes`,
  CAMARA_DEPUTY_CAMARA_MANDATES: (id: string) => `${BASE_URLS.CAMARA}/deputados/${id}/mandatos`,
  CAMARA_FRENTE: (id: string) => `${BASE_URLS.CAMARA}/frentes/${id}`,
  CAMARA_FRENTE_MEMBERS: (id: string) => `${BASE_URLS.CAMARA}/frentes/${id}/membros`,
  CAMARA_EVENT: (id: string) => `${BASE_URLS.CAMARA}/eventos/${id}`,
  CAMARA_EVENT_DEPUTIES: (id: string) => `${BASE_URLS.CAMARA}/eventos/${id}/deputados`,
  CAMARA_EVENT_AGENDA: (id: string) => `${BASE_URLS.CAMARA}/eventos/${id}/pauta`,
  CAMARA_PROPOSITIONS: `${BASE_URLS.CAMARA}/proposicoes`,
  CAMARA_PROPOSITION: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}`,
  CAMARA_PROPOSITION_AUTHORS: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}/autores`,
  CAMARA_PROPOSITION_THEMES: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}/temas`,
  CAMARA_PROPOSITION_PROGRESS: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}/tramitacoes`,
  CAMARA_PROPOSITION_VOTES: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}/votacoes`,
  CAMARA_PROPOSITION_RELATED: (id: string) => `${BASE_URLS.CAMARA}/proposicoes/${id}/relacionadas`,
  CAMARA_VOTING_SESSIONS: `${BASE_URLS.CAMARA}/votacoes`,
  CAMARA_VOTING_SESSION: (id: string) => `${BASE_URLS.CAMARA}/votacoes/${id}`,
  CAMARA_VOTING_SESSION_VOTES: (id: string) => `${BASE_URLS.CAMARA}/votacoes/${id}/votos`,
  CAMARA_VOTING_SESSION_ORIENTATIONS: (id: string) => `${BASE_URLS.CAMARA}/votacoes/${id}/orientacoes`,
  CAMARA_VOTE_DETAILS: (id: string) => `${BASE_URLS.CAMARA}/votacoes/${id}/votos`,
  CAMARA_BULK_ATTENDANCE: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/eventosPresencaDeputados/json/eventosPresencaDeputados-${year}.json`,
  CAMARA_BULK_STAFF: `${BASE_URLS.CAMARA_BULK}/funcionarios/json/funcionarios.json`,
  CAMARA_BULK_EXPENSES: (year: number) =>
    `http://www.camara.leg.br/cotas/Ano-${year}.json.zip`,
  CAMARA_BULK_EVENTS: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/eventos/json/eventos-${year}.json`,
  CAMARA_BULK_PROCUREMENT: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/licitacoes/json/licitacoes-${year}.json`,
  CAMARA_BULK_PROCUREMENT_CONTRACTS: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/licitacoesContratos/json/licitacoesContratos-${year}.json`,
  CAMARA_BULK_PROCUREMENT_ITEMS: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/licitacoesItens/json/licitacoesItens-${year}.json`,
  CAMARA_BULK_PROCUREMENT_REQUESTS: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/licitacoesPedidos/json/licitacoesPedidos-${year}.json`,

  // ── Senado Federal — Senators ──────────────────────────────────────
  SENADO_SENATORS: `${BASE_URLS.SENADO}/senador/lista/atual.json`,
  SENADO_SENATORS_ON_LEAVE: `${BASE_URLS.SENADO}/senador/afastados.json`,
  SENADO_SENATORS_BY_LEGISLATURE: (legislature: number) =>
    `${BASE_URLS.SENADO}/senador/lista/legislatura/${legislature}.json`,
  SENADO_SENATOR: (id: string) => `${BASE_URLS.SENADO}/senador/${id}.json`,
  SENADO_SENATOR_MANDATES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/mandatos.json`,
  SENADO_SENATOR_AFFILIATIONS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/filiacoes.json`,
  SENADO_SENATOR_LEADERSHIPS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/liderancas.json`,
  SENADO_SENATOR_COMMITTEES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/comissoes.json`,
  SENADO_SENATOR_POSITIONS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/cargos.json`,
  SENADO_SENATOR_LEAVES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/licencas.json`,
  SENADO_SENATOR_ACADEMIC: (id: string) =>
    `${BASE_URLS.SENADO}/senador/${id}/historicoAcademico.json`,
  SENADO_SENATOR_PROFESSIONS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/profissao.json`,
  SENADO_SENATOR_SPEECHES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/discursos.json`,
  SENADO_SENATOR_INTERJECTIONS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/apartes.json`,

  // ── Senado Federal — Voting (modern unified API) ───────────────────
  /**
   * Modern voting endpoint. Accepts query params:
   * `codigoParlamentar`, `dataInicio`, `dataFim`, `idProcesso`, `codigoSessaoVotacao`.
   * Replaces deprecated `/senador/{id}/votacoes.json` (sunset 2026-02-01).
   */
  SENADO_VOTING: `${BASE_URLS.SENADO}/votacao`,
  SENADO_VOTING_COMMITTEE_BY_PARLAMENTAR: (id: string) =>
    `${BASE_URLS.SENADO}/votacaoComissao/parlamentar/${id}`,
  SENADO_VOTING_COMMITTEE_BY_MATTER: (sigla: string, num: string, ano: string) =>
    `${BASE_URLS.SENADO}/votacaoComissao/materia/${sigla}/${num}/${ano}`,
  SENADO_VOTING_COMMITTEE_BY_COMMITTEE: (sigla: string) =>
    `${BASE_URLS.SENADO}/votacaoComissao/comissao/${sigla}`,
  SENADO_VOTING_ORIENTATION_DATE: (data: string) =>
    `${BASE_URLS.SENADO}/plenario/votacao/orientacaoBancada/${data}`,
  SENADO_VOTING_ORIENTATION_RANGE: (ini: string, fim: string) =>
    `${BASE_URLS.SENADO}/plenario/votacao/orientacaoBancada/${ini}/${fim}`,

  // ── Senado Federal — Propositions (modern process API) ─────────────
  /**
   * Modern process search. Accepts query params:
   * `sigla`, `numero`, `ano`, `idProcesso`, `codigoParlamentarAutor`, `termo`.
   * Replaces deprecated `/senador/{id}/autorias.json` and most `/materia/*`.
   */
  SENADO_PROCESS_SEARCH: `${BASE_URLS.SENADO}/processo`,
  SENADO_PROCESS: (idProcesso: string) => `${BASE_URLS.SENADO}/processo/${idProcesso}`,
  SENADO_PROCESS_RAPPORTEURSHIP: `${BASE_URLS.SENADO}/processo/relatoria`,
  SENADO_PROCESS_DOCUMENTS: `${BASE_URLS.SENADO}/processo/documento`,
  SENADO_PROCESS_AMENDMENTS: `${BASE_URLS.SENADO}/processo/emenda`,
  SENADO_PROCESS_DEADLINES: `${BASE_URLS.SENADO}/processo/prazo`,

  // ── Senado Federal — Plenary sessions & attendance ─────────────────
  SENADO_PLENARY_AGENDA_DAY: (yyyymmdd: string) =>
    `${BASE_URLS.SENADO}/plenario/agenda/dia/${yyyymmdd}`,
  SENADO_PLENARY_AGENDA_MONTH: (yyyymm: string) =>
    `${BASE_URLS.SENADO}/plenario/agenda/mes/${yyyymm}`,
  SENADO_PLENARY_RESULT_DAY: (yyyymmdd: string) =>
    `${BASE_URLS.SENADO}/plenario/resultado/${yyyymmdd}`,
  SENADO_PLENARY_RESULT_MONTH: (yyyymm: string) =>
    `${BASE_URLS.SENADO}/plenario/resultado/mes/${yyyymm}`,
  SENADO_PLENARY_LEGISLATURES: `${BASE_URLS.SENADO}/plenario/lista/legislaturas`,
  SENADO_PLENARY_SESSION_TYPES: `${BASE_URLS.SENADO}/plenario/tiposSessao`,
  SENADO_PLENARY_ATTENDANCE_TYPES: `${BASE_URLS.SENADO}/plenario/lista/tiposComparecimento`,
  SENADO_PLENARY_SPEECHES_RANGE: (ini: string, fim: string) =>
    `${BASE_URLS.SENADO}/plenario/lista/discursos/${ini}/${fim}`,
  SENADO_PLENARY_SESSION: (codigo: string) =>
    `${BASE_URLS.SENADO}/plenario/encontro/${codigo}`,
  SENADO_PLENARY_SESSION_AGENDA: (codigo: string) =>
    `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/pauta`,
  SENADO_PLENARY_SESSION_RESULT: (codigo: string) =>
    `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/resultado`,
  SENADO_PLENARY_SESSION_SUMMARY: (codigo: string) =>
    `${BASE_URLS.SENADO}/plenario/encontro/${codigo}/resumo`,

  // ── Senado Federal — Stenographic ──────────────────────────────────
  SENADO_TAQUIGRAFIA_SESSION_NOTES: (idSessao: string) =>
    `${BASE_URLS.SENADO}/taquigrafia/notas/sessao/${idSessao}`,
  SENADO_TAQUIGRAFIA_SESSION_VIDEOS: (idSessao: string) =>
    `${BASE_URLS.SENADO}/taquigrafia/videos/sessao/${idSessao}`,
  SENADO_TAQUIGRAFIA_MEETING_NOTES: (idReuniao: string) =>
    `${BASE_URLS.SENADO}/taquigrafia/notas/reuniao/${idReuniao}`,
  SENADO_TAQUIGRAFIA_MEETING_VIDEOS: (idReuniao: string) =>
    `${BASE_URLS.SENADO}/taquigrafia/videos/reuniao/${idReuniao}`,

  // ── Senado Federal — Committees ────────────────────────────────────
  SENADO_PERMANENT_COMMITTEES: `${BASE_URLS.SENADO}/comissao/lista/permanente.json`,
  SENADO_COMMITTEE_LIST: (tipo: string) =>
    `${BASE_URLS.SENADO}/comissao/lista/${tipo}.json`,
  SENADO_COMMITTEE_COLEGIADOS: `${BASE_URLS.SENADO}/comissao/lista/colegiados.json`,

  // ── Senado Federal — Leadership ────────────────────────────────────
  SENADO_LEADERSHIP_COMPOSITION: `${BASE_URLS.SENADO}/composicao/lideranca`,

  // ── Senado Federal — CEAPS (admin API — preferred) ─────────────────
  SENADO_CEAPS_BY_YEAR: (ano: number) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/despesas_ceaps/${ano}`,
  SENADO_CEAPS_BY_YEAR_CSV: (ano: number) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/despesas_ceaps/${ano}/csv`,
  SENADO_OFFICES: `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/escritorios`,
  SENADO_HOUSING_AID: `${BASE_URLS.SENADO_ADMIN}/api/v1/senadores/auxilio-moradia`,

  // ── Senado Federal — CEAPS (LAI CSV — historical fallback) ─────────
  SENADO_CEAPS_LAI_CSV: (ano: number) =>
    `${BASE_URLS.SENADO_TRANSPARENCY}/despesa_ceaps_${ano}.csv`,

  // ── Senado Federal — Civil servants (Phase 4) ──────────────────────
  SENADO_SERVANTS_BY_OFFICE: `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/servidores`,
  SENADO_SERVANTS_REMUNERATION: (ano: number, mes: number) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/remuneracoes/${ano}/${mes}`,
  SENADO_SERVANTS_HEADCOUNT: `${BASE_URLS.SENADO_ADMIN}/api/v1/servidores/quantitativos/pessoal`,

  // ── Senado Federal — Contracts (institutional, Phase 8) ────────────
  SENADO_CONTRACTS: `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/contratos`,
  SENADO_CONTRACT_AMENDMENTS: (id: string) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/contratos/${id}/aditivos`,
  SENADO_CONTRACT_OUTSOURCED: (id: string) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/contratos/terceirizados/${id}`,
  SENADO_CONTRACT_PAYMENTS: (tipo: string, id: string) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/${tipo}/${id}/pagamentos`,
  SENADO_CONTRACT_ITEMS: (tipo: string, id: string) =>
    `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/${tipo}/${id}/itens`,
  SENADO_BIDS: `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/licitacoes`,
  SENADO_CONTRACTING_COMPANIES: `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/empresas`,
  SENADO_PURCHASE_ORDERS: `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/notas_empenho`,
  SENADO_OUTSOURCED_WORKERS: `${BASE_URLS.SENADO_ADMIN}/api/v1/contratacoes/terceirizados`,

  // ── Senado Federal — Vetos ─────────────────────────────────────────
  SENADO_VETOS_BY_YEAR: (ano: number) => `${BASE_URLS.SENADO}/materia/vetos/${ano}`,

  // ── Portal da Transparencia ─────────────────────────────────────────
  TRANSP_CIVIL_SERVANTS: `${BASE_URLS.TRANSPARENCIA}/servidores`,
  TRANSP_SERVANT_COMPENSATION: (id: string) => `${BASE_URLS.TRANSPARENCIA}/servidores/${id}/remuneracao`,
  TRANSP_CONTRACTS: `${BASE_URLS.TRANSPARENCIA}/contratos`,
  TRANSP_BIDS: `${BASE_URLS.TRANSPARENCIA}/licitacoes`,
  TRANSP_AGREEMENTS: `${BASE_URLS.TRANSPARENCIA}/convenios`,
  TRANSP_EARMARKS: `${BASE_URLS.TRANSPARENCIA}/emendas`,
  TRANSP_SPENDING: `${BASE_URLS.TRANSPARENCIA}/despesas/recursos-recebidos`,
  TRANSP_BLACKLIST: `${BASE_URLS.TRANSPARENCIA}/ceis`,
  TRANSP_PUNISHED: `${BASE_URLS.TRANSPARENCIA}/cnep`,
  TRANSP_TRAVEL: `${BASE_URLS.TRANSPARENCIA}/viagens`,
  TRANSP_PAYMENT_CARDS: `${BASE_URLS.TRANSPARENCIA}/cartoes`,
  TRANSP_AGENCIES: `${BASE_URLS.TRANSPARENCIA}/orgaos-siafi`,

  // ── Camara — Partidos (parties) ─────────────────────────────────────
  CAMARA_PARTIES: `${BASE_URLS.CAMARA}/partidos`,
  CAMARA_PARTY: (id: string) => `${BASE_URLS.CAMARA}/partidos/${id}`,
  CAMARA_PARTY_MEMBERS: (id: string) => `${BASE_URLS.CAMARA}/partidos/${id}/membros`,
  CAMARA_PARTY_LEADERS: (id: string) => `${BASE_URLS.CAMARA}/partidos/${id}/lideres`,
  CAMARA_BLOCS: `${BASE_URLS.CAMARA}/blocos`,

  // ── Senado — Partidos (parties) ───────────────────────────────────
  SENADO_PARTIES: `${BASE_URLS.SENADO}/senador/partidos.json`,
  SENADO_BLOCS: `${BASE_URLS.SENADO}/dados/ListaBlocoParlamentar.json`,

  // ── TSE — Partidos (parties, CKAN portal) ─────────────────────────
  TSE_CKAN_PACKAGES: `${BASE_URLS.TSE}/api/3/action/package_list`,
  TSE_CKAN_PACKAGE: (name: string) => `${BASE_URLS.TSE}/api/3/action/package_show?id=${name}`,
  TSE_CKAN_DATASTORE: (resourceId: string) => `${BASE_URLS.TSE}/api/3/action/datastore_search?resource_id=${resourceId}`,

  // ── TSE — Campaign donations (CKAN datastore_search with filters) ──
  /**
   * Filtered query against a CKAN datastore resource.
   *
   * `filters` is a JSON object whose keys must match the resource's column
   * names verbatim (e.g. `NR_CPF_CNPJ_DOADOR` for donor CNPJ in the
   * "receitas de candidatos" dataset). The serialized JSON is URL-encoded
   * so the URL is safe to use as a Redis cache key.
   *
   * Used by Phase E8 (`tse.ts`) to query the per-year donation resources.
   */
  TSE_CKAN_DATASTORE_FILTERED: (resourceId: string, filters: Record<string, string>) =>
    `${BASE_URLS.TSE}/api/3/action/datastore_search?resource_id=${resourceId}` +
    `&filters=${encodeURIComponent(JSON.stringify(filters))}`,

  // ── CEPESP/FGV — Electoral results by party ───────────────────────
  CEPESP_QUERY: "https://cepesp.io/api/consulta/athena/query",

  // ── SICONFI / Tesouro Nacional (state + municipal fiscal data) ──────
  SICONFI_RREO: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo",
  SICONFI_RGF: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf",
  SICONFI_DCA: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca",

  // ── Ipeadata (macroeconomic fiscal series) ─────────────────────────
  IPEADATA: "http://www.ipeadata.gov.br/api/odata4/",

  // ── CNJ / DataJud ───────────────────────────────────────────────────
  /** POST endpoint — requires Elasticsearch query body + API key auth */
  DATAJUD_COURT: (court: string) => `${BASE_URLS.DATAJUD}/api_publica_${court}/_search`,

  // ── OpenCNPJ ────────────────────────────────────────────────────────
  /**
   * Full company detail (cadastral data + QSA partners) by 14-digit CNPJ.
   *
   * The exact path is documented at https://opencnpj.org/#api — adjust here
   * if upstream changes the contract.
   */
  OPENCNPJ_DETAIL: (cnpj: string) => `${BASE_URLS.OPENCNPJ}/${cnpj}`,

  // ── IBGE (population, GDP, geographic data) ────────────────────────
  /** Population estimates by state (latest period, all 27 UFs) */
  IBGE_POPULATION_STATES: "https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/-1/variaveis/93?localidades=N3[all]",
  /** GDP by state (latest period, all 27 UFs) */
  IBGE_GDP_STATES: "https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N3[all]",
  /** Population estimates by municipality (latest period, all 5.570 municipalities) */
  IBGE_POPULATION_MUNICIPALITIES: "https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/-1/variaveis/93?localidades=N6[all]",
  /** List of all 27 states with IBGE codes */
  IBGE_STATES: "https://servicodados.ibge.gov.br/api/v3/localidades/estados",
  /** Municipalities by state */
  IBGE_MUNICIPALITIES: (uf: string) => `https://servicodados.ibge.gov.br/api/v3/localidades/estados/${uf}/municipios`,

  // ── Tesouro Transparente (CAPAG, fiscal health) ────────────────────
  /** CAPAG ratings — annual A/B/C/D ratings for states and municipalities */
  CAPAG_RATINGS: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/capag",
} as const
