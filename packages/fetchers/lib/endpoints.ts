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

  /** Senado administrative API (compensation data) */
  SENADO_ADMIN: "https://adm.senado.gov.br/adm-dadosabertos",

  /** Portal da Transparencia (federal executive transparency data) */
  TRANSPARENCIA: "https://api.portaldatransparencia.gov.br/api-de-dados",

  /** CNJ DataJud (judicial system public data) */
  DATAJUD: "https://api-publica.datajud.cnj.jus.br",

  /** TSE open data portal (electoral court) */
  TSE: "https://dadosabertos.tse.jus.br",

  /** TSE candidate asset declarations and campaign finance */
  TSE_DIVULGA: "https://divulgacandcontas.tse.jus.br",

  /** CNPJa free API (real-time individual CNPJ lookups) */
  CNPJA: "https://open.cnpja.com",
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
  CAMARA_VOTE_DETAILS: (id: string) => `${BASE_URLS.CAMARA}/votacoes/${id}/votos`,
  CAMARA_BULK_ATTENDANCE: (year: number) =>
    `${BASE_URLS.CAMARA_BULK}/eventosPresencaDeputados/json/eventosPresencaDeputados-${year}.json`,
  CAMARA_BULK_STAFF: `${BASE_URLS.CAMARA_BULK}/funcionarios/json/funcionarios.json`,
  CAMARA_BULK_EXPENSES: (year: number) =>
    `http://www.camara.leg.br/cotas/Ano-${year}.json.zip`,

  // ── Senado Federal ──────────────────────────────────────────────────
  SENADO_SENATORS: `${BASE_URLS.SENADO}/senador/lista/atual.json`,
  SENADO_SENATOR: (id: string) => `${BASE_URLS.SENADO}/senador/${id}.json`,
  SENADO_SENATOR_HISTORY: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/historico.json`,
  SENADO_SENATOR_VOTES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/votacoes.json`,
  SENADO_SENATOR_BILLS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/autorias.json`,
  SENADO_SENATOR_SPEECHES: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/discursos.json`,
  SENADO_SENATOR_INTERJECTIONS: (id: string) => `${BASE_URLS.SENADO}/senador/${id}/apartes.json`,
  SENADO_PERMANENT_COMMITTEES: `${BASE_URLS.SENADO}/comissao/lista/permanente.json`,

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

  // ── CNPJa ───────────────────────────────────────────────────────────
  CNPJA_OFFICE: (cnpj: string) => `${BASE_URLS.CNPJA}/office/${cnpj}`,

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
