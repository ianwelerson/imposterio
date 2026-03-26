# API Reference — Public Data Sources

This file contains the full API documentation for all government data sources used by Imposterio.
Extracted from CLAUDE.md to keep it under the performance threshold.

**For endpoint constants:** see `packages/fetchers/lib/endpoints.ts`
**For TTL values:** see `packages/fetchers/lib/ttl.ts`

---

## Câmara dos Deputados (Chamber of Deputies)
- **Base URL:** `https://dadosabertos.camara.leg.br/api/v2`
- **Swagger:** `https://dadosabertos.camara.leg.br/swagger/api.html`
- **Auth:** none
- **Key endpoints:**
  - `GET /deputados` — list of deputies currently serving
  - `GET /deputados/{id}` — full deputy profile
  - `GET /deputados/{id}/despesas` — CEAP expenses (params: `ano`, `mes`, `pagina`, `itens`)
  - ~~`GET /deputados/{id}/votacoes`~~ — **BROKEN** (returns 405 as of March 2026). Use `GET /votacoes` + `GET /votacoes/{id}/votos` instead
  - `GET /deputados/{id}/discursos` — floor speeches
  - `GET /deputados/{id}/frentes` — parliamentary caucuses
  - `GET /deputados/{id}/orgaos` — committee memberships
  - `GET /votacoes/{id}/votos` — how each deputy voted in a specific vote
  - `GET /eventos/{id}/deputados` — deputies who attended an event
- **Party endpoints:**
  - `GET /partidos` — list all parties
  - `GET /partidos/{id}` — party detail
  - `GET /partidos/{id}/membros` — deputies belonging to the party
  - `GET /partidos/{id}/lideres` — current party leader(s)
  - `GET /blocos` — parliamentary blocs
- **Bulk files (data without REST endpoints):**
  - Attendance: `http://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/json/eventosPresencaDeputados-{year}.json`
  - Events: `http://dadosabertos.camara.leg.br/arquivos/eventos/json/eventos-{year}.json`
  - Staff/aides: `http://dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json`
  - Procurement: `http://dadosabertos.camara.leg.br/arquivos/licitacoes/json/licitacoes-{year}.json`
  - Procurement contracts: `http://dadosabertos.camara.leg.br/arquivos/licitacoesContratos/json/licitacoesContratos-{year}.json`
  - Procurement items: `http://dadosabertos.camara.leg.br/arquivos/licitacoesItens/json/licitacoesItens-{year}.json`
  - Procurement requests: `http://dadosabertos.camara.leg.br/arquivos/licitacoesPedidos/json/licitacoesPedidos-{year}.json`
  - CEAP historical expenses: `http://www.camara.leg.br/cotas/Ano-{year}.json.zip`
  - Full bulk catalog: `https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile`

## Senado Federal (Federal Senate)
- **Base URL:** `https://legis.senado.leg.br/dadosabertos`
- **Swagger:** `https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html`
- **Auth:** none. Append `.json` to URL or send `Accept: application/json`
- **Key endpoints:** `/senador/lista/atual.json`, `/senador/{id}.json`, `/senador/{id}/votacoes.json`, `/senador/{id}/autorias.json`, `/senador/{id}/discursos.json`
- **Admin API (compensation):** `https://adm.senado.gov.br/adm-dadosabertos/swagger-ui/index.html`

## Portal da Transparência (Federal Transparency Portal)
- **Base URL:** `https://api.portaldatransparencia.gov.br/api-de-dados`
- **Swagger:** `https://api.portaldatransparencia.gov.br/swagger-ui/index.html`
- **Auth:** free API key via email — header `chave-api-dados: {KEY}`
- **Rate limit:** 400 req/min (business hours), 700 req/min (overnight)
- **Registration:** `https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email`
- **Key endpoints:** `/servidores`, `/servidores/{id}/remuneracao`, `/contratos`, `/licitacoes`, `/convenios`, `/emendas`, `/ceis`, `/cnep`, `/viagens`, `/cartoes`, `/orgaos-siafi`

## CNJ / DataJud
- **Base URL:** `https://api-publica.datajud.cnj.jus.br`
- **Docs:** `https://datajud-wiki.cnj.jus.br/api-publica/`
- **Auth:** fixed public key from wiki. Header: `Authorization: APIKey {PUBLIC_KEY}`
- **Method:** POST with Elasticsearch query body to per-court endpoints (e.g. `/api_publica_stf/_search`)
- **Judge compensation:** scraped from individual court transparency portals (no REST API)

## TSE (Superior Electoral Court)
- **Portal:** `https://dadosabertos.tse.jus.br/`
- **CKAN API:** `https://dadosabertos.tse.jus.br/api/3/`
- **Party data:** `https://dadosabertos.tse.jus.br/group/partidos`
- **DivulgaCandContas:** `https://divulgacandcontas.tse.jus.br` (candidate finances, community docs: `https://github.com/augusto-herrmann/divulgacandcontas-doc`)

## CEPESP/FGV
- **Base URL:** `https://cepesp.io/api/consulta/athena/query`
- **Docs:** `https://cepesp.io/documentacao`
- **Data:** candidate data by party, election results, coalitions, assets (1998–2022)

## Federal Revenue — QSA Bulk (monthly)
- **Download:** `https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`
- **Mirror:** `https://dados-abertos-rf-cnpj.casadosdados.com.br/`
- **Schema:** `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf`
- **Size:** ~85GB uncompressed. Monthly import via Railway worker.

## CNPJá
- **Free URL:** `https://open.cnpja.com/office/{cnpj}`
- **Rate limit:** 5 req/min (anonymous)

## IBGE
- **Base URL:** `https://servicodados.ibge.gov.br/api/v3/`
- **Key endpoints:** population by state/municipality, GDP by state, geographic data

## Tesouro Transparente / SICONFI
- **SICONFI API:** `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/`
- **Key endpoints:** `/rreo` (revenue execution), `/rgf` (fiscal management), `/dca` (annual accounts)
- **CAPAG ratings:** `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/capag`

## Tax Collection (Impostômetro)
- No public real-time API exists. Uses statistical interpolation from:
  - **ReceitaData:** `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/receitadata/arrecadacao`
  - **SICONFI:** state/municipal fiscal data (see above)
  - **Ipeadata:** `http://www.ipeadata.gov.br/api/odata4/`
  - **CONFAZ:** `https://www.confaz.fazenda.gov.br/boletim-de-arrecadacao-dos-tributos-estaduais`
- Strategy: monthly actuals in Redis, interpolated for real-time counter
