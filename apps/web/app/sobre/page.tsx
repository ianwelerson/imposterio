/**
 * @file page.tsx
 * @description "About" page — explains the project's mission, open-source nature,
 * data sources, infrastructure, bulk data processing, and caching methodology.
 *
 * All cache TTL values are imported directly from the fetchers package
 * to guarantee they always match the actual runtime configuration.
 */

import { TTL } from "@imposterio/fetchers"
import { GitHubLink } from "./GitHubLink"

/** GitHub repository URL. */
const GITHUB_URL = "https://github.com/ianwelerson/imposterio"

/** Formats a TTL value in seconds to a human-readable Portuguese string. */
function formatTtl(seconds: number): string {
  if (seconds >= 60 * 60 * 24 * 30) {
    const days = seconds / (60 * 60 * 24)
    return `${days} dias`
  }
  if (seconds >= 60 * 60 * 24) {
    const days = seconds / (60 * 60 * 24)
    return days === 1 ? "1 dia" : `${days} dias`
  }
  const hours = seconds / (60 * 60)
  return hours === 1 ? "1 hora" : `${hours} horas`
}

/* ─── Data definitions ────────────────────────────────────────────────── */

interface ApiSource {
  name: string
  description: string
  url: string
  auth: string
  rateLimit: string
  bulk?: boolean
}

const API_SOURCES: ApiSource[] = [
  {
    name: "Câmara dos Deputados",
    description:
      "Deputados, despesas CEAP, votações, proposições, comissões, frentes parlamentares e eventos.",
    url: "https://dadosabertos.camara.leg.br/swagger/api.html",
    auth: "Nenhuma",
    rateLimit: "Sem limite documentado",
  },
  {
    name: "Câmara dos Deputados (lote)",
    description:
      "Arquivos anuais de presença em eventos e despesas CEAP históricas.",
    url: "https://dadosabertos.camara.leg.br/",
    auth: "Nenhuma",
    rateLimit: "Download de arquivos",
    bulk: true,
  },
  {
    name: "Senado Federal",
    description:
      "Senadores, votações, autorias, discursos e comissões permanentes.",
    url: "https://legis.senado.leg.br/dadosabertos/docs/index.html",
    auth: "Nenhuma",
    rateLimit: "Sem limite documentado",
  },
  {
    name: "Portal da Transparência",
    description:
      "Servidores, remunerações, contratos, licitações, emendas, viagens, cartões e empresas sancionadas.",
    url: "https://api.portaldatransparencia.gov.br/swagger-ui/index.html",
    auth: "Chave gratuita (e-mail)",
    rateLimit: "400–700 req/min",
  },
  {
    name: "CNJ / DataJud",
    description:
      "Processos judiciais por tribunal, relator, área jurídica e tendências históricas.",
    url: "https://datajud-wiki.cnj.jus.br/api-publica/",
    auth: "Chave pública fixa",
    rateLimit: "Sem limite documentado",
  },
  {
    name: "TSE",
    description:
      "Partidos registrados, resultados eleitorais, declarações de bens e filiações partidárias.",
    url: "https://dadosabertos.tse.jus.br/",
    auth: "Nenhuma",
    rateLimit: "Arquivos em lote",
    bulk: true,
  },
  {
    name: "IBGE",
    description:
      "Estimativas populacionais e PIB por estado para cálculos per capita.",
    url: "https://servicodados.ibge.gov.br/api/docs",
    auth: "Nenhuma",
    rateLimit: "Sem limite documentado",
  },
  {
    name: "Tesouro Nacional (SICONFI)",
    description:
      "Arrecadação tributária estadual (ICMS, IPVA, ITCMD), gestão fiscal e classificações CAPAG.",
    url: "https://apidatalake.tesouro.gov.br/docs/siconfi/",
    auth: "Nenhuma",
    rateLimit: "5.000 itens/página",
  },
  {
    name: "CNPJá / OpenCNPJ",
    description:
      "Consulta individual de CNPJ — razão social, CNAE, endereço, sócios e Simples Nacional.",
    url: "https://open.cnpja.com/",
    auth: "Nenhuma (anônimo)",
    rateLimit: "5–10 req/min",
  },
  {
    name: "Receita Federal (QSA)",
    description:
      "Base completa de empresas (~85 GB) para mapeamento de redes societárias. Importação mensal.",
    url: "https://dados-abertos-rf-cnpj.casadosdados.com.br/",
    auth: "Nenhuma",
    rateLimit: "Download mensal",
    bulk: true,
  },
]

interface InfraItem {
  name: string
  role: string
  description: string
  url: string
}

const INFRA_STACK: InfraItem[] = [
  {
    name: "Vercel",
    role: "Hospedagem e deploy",
    description:
      "A aplicação web (Next.js) roda na Vercel com deploy automático a cada push na branch principal. Cada pull request gera um preview deployment para validação antes de ir para produção.",
    url: "https://vercel.com",
  },
  {
    name: "Neon",
    role: "Banco de dados PostgreSQL",
    description:
      "Banco de dados serverless utilizado exclusivamente para dados do jogo \"Acha Justo?\" (cards e votos) e para a base de sócios da Receita Federal (QSA). Nenhum dado de governo é armazenado aqui — tudo vem das APIs em tempo real.",
    url: "https://neon.tech",
  },
  {
    name: "Upstash Redis",
    role: "Cache de respostas de API",
    description:
      "Serviço de cache serverless que armazena temporariamente as respostas das APIs oficiais. Cada tipo de dado tem um tempo de vida (TTL) configurado individualmente. Detalhes completos na seção \"Metodologia de cache\".",
    url: "https://upstash.com",
  },
  {
    name: "Umami Cloud",
    role: "Analytics de tráfego e eventos",
    description:
      "Ferramenta de analytics focada em privacidade — sem cookies, sem rastreamento pessoal, compatível com LGPD. Registra page views e eventos customizados (buscas, filtros, votos no jogo, cliques em fontes oficiais) para entender como a plataforma é utilizada.",
    url: "https://umami.is",
  },
  {
    name: "Railway",
    role: "Worker de importação",
    description:
      "Executa o worker mensal que baixa e processa a base de empresas da Receita Federal (~85 GB). Roda separado da aplicação web para não impactar a performance do site.",
    url: "https://railway.app",
  },
]

interface CacheGroup {
  title: string
  items: Array<{ label: string; ttl: number }>
}

const CACHE_GROUPS: CacheGroup[] = [
  {
    title: "Câmara dos Deputados",
    items: [
      { label: "Lista de deputados", ttl: TTL.CAMARA_DEPUTIES_LIST },
      { label: "Perfil do deputado", ttl: TTL.CAMARA_DEPUTY_DETAIL },
      { label: "Despesas CEAP", ttl: TTL.CAMARA_DEPUTY_EXPENSES },
      { label: "Votações", ttl: TTL.CAMARA_DEPUTY_VOTES },
      { label: "Discursos", ttl: TTL.CAMARA_DEPUTY_SPEECHES },
      { label: "Eventos", ttl: TTL.CAMARA_DEPUTY_EVENTS },
      { label: "Proposições", ttl: TTL.CAMARA_PROPOSITIONS },
      { label: "Detalhe de proposição", ttl: TTL.CAMARA_PROPOSITION_DETAIL },
      { label: "Autores de proposição", ttl: TTL.CAMARA_PROPOSITION_AUTHORS },
      { label: "Tramitação", ttl: TTL.CAMARA_PROPOSITION_PROGRESS },
      { label: "Sessões de votação", ttl: TTL.CAMARA_VOTING_SESSIONS },
      { label: "Votos individuais", ttl: TTL.CAMARA_VOTING_SESSION_VOTES },
      { label: "Orientações partidárias", ttl: TTL.CAMARA_VOTING_SESSION_ORIENTATIONS },
      { label: "Presença (arquivo anual)", ttl: TTL.CAMARA_DEPUTY_ATTENDANCE },
      { label: "Mandatos anteriores", ttl: TTL.CAMARA_DEPUTY_MANDATES },
    ],
  },
  {
    title: "Senado Federal",
    items: [
      { label: "Lista de senadores", ttl: TTL.SENADO_SENATORS_LIST },
      { label: "Perfil do senador", ttl: TTL.SENADO_SENATOR_DETAIL },
      { label: "Votações", ttl: TTL.SENADO_SENATOR_VOTES },
      { label: "Autorias", ttl: TTL.SENADO_SENATOR_BILLS },
    ],
  },
  {
    title: "Portal da Transparência",
    items: [
      { label: "Servidores", ttl: TTL.TRANSP_CIVIL_SERVANTS },
      { label: "Remuneração individual", ttl: TTL.TRANSP_SERVANT_COMPENSATION },
      { label: "Contratos", ttl: TTL.TRANSP_CONTRACTS },
      { label: "Licitações", ttl: TTL.TRANSP_BIDS },
      { label: "Emendas", ttl: TTL.TRANSP_EARMARKS },
      { label: "Viagens oficiais", ttl: TTL.TRANSP_TRAVEL },
      { label: "Cartões de pagamento", ttl: TTL.TRANSP_PAYMENT_CARDS },
      { label: "Empresas sancionadas", ttl: TTL.TRANSP_BLACKLIST },
    ],
  },
  {
    title: "Estados e dados fiscais",
    items: [
      { label: "Visão geral fiscal", ttl: TTL.STATES_FISCAL_OVERVIEW },
      { label: "Detalhe do estado", ttl: TTL.STATE_DETAIL },
      { label: "Relatórios SICONFI", ttl: TTL.SICONFI_RREO },
      { label: "População (IBGE)", ttl: TTL.IBGE_POPULATION },
      { label: "PIB (IBGE)", ttl: TTL.IBGE_GDP },
      { label: "Classificação CAPAG", ttl: TTL.CAPAG_RATINGS },
    ],
  },
  {
    title: "Outros",
    items: [
      { label: "Partidos políticos", ttl: TTL.PARTIES_LIST },
      { label: "Fundo partidário", ttl: TTL.PARTY_FUND },
      { label: "Resultados eleitorais", ttl: TTL.PARTY_ELECTION_RESULTS },
      { label: "Consulta CNPJ", ttl: TTL.CNPJ_DETAIL },
      { label: "Judiciário (processos)", ttl: TTL.DATAJUD_CASES },
      { label: "Remuneração de magistrados", ttl: TTL.JUDGE_COMPENSATION },
      { label: "Rankings do painel", ttl: TTL.HOME_RANKINGS },
    ],
  },
]

/* ─── Page component ──────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative mb-12 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-12 sm:px-10 sm:py-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              impost
              <span className="text-emerald-400">e</span>
              rio
            </span>
            <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
              beta
            </span>
          </div>
          <p className="text-lg font-medium text-gray-200 sm:text-xl">
            O raio-x de quem vive do seu imposto.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            Plataforma de transparência pública que agrega dados em tempo real de
            dezenas de APIs oficiais do governo brasileiro. Sem cadastro, sem login.
            Abra um link e veja o panorama completo de qualquer agente público —
            com um link direto para a fonte oficial de <strong className="text-gray-300">cada número</strong>.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <GitHubLink href={GITHUB_URL} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              100% código aberto
            </span>
          </div>
        </div>
      </header>

      {/* ── Principles ───────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-gray-900">Princípios</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <PrincipleCard
            icon={<VerifyIcon />}
            title="Verificável"
            description={'Cada dado exibido tem um botão "↗ fonte" que leva à URL exata da API oficial. Qualquer pessoa pode conferir o número direto no governo.'}
          />
          <PrincipleCard
            icon={<OpenIcon />}
            title="Transparente"
            description="O código-fonte é público no GitHub. Todo o processamento de dados pode ser auditado — sem caixa preta, sem manipulação."
          />
          <PrincipleCard
            icon={<PrivacyIcon />}
            title="Respeita privacidade"
            description="Sem cookies de rastreamento, sem login, sem coleta de dados pessoais. Analytics via Umami, focado em privacidade e compatível com LGPD."
          />
        </div>
      </section>

      {/* ── Data sources ─────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Fontes de dados</h2>
        <p className="mb-4 text-sm text-gray-600">
          Todos os dados exibidos no Imposterio vêm diretamente de APIs oficiais do governo
          brasileiro. Ao lado de cada dado no site, o botão{" "}
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            ↗ fonte
          </span>{" "}
          abre a URL exata da API que gerou aquele número.
        </p>

        {/* Card-based layout on mobile, table on sm+ */}
        <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200/80 shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="py-3 px-4 text-left font-medium text-gray-600">Fonte</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Dados</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Auth</th>
                <th className="py-3 px-4 text-left font-medium text-gray-600">Limite</th>
                <th className="py-3 px-4 text-right font-medium text-gray-600">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {API_SOURCES.map((api) => (
                <tr key={api.name} className="bg-white">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{api.name}</span>
                      {api.bulk && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          LOTE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{api.description}</td>
                  <td className="py-3 px-4 text-gray-600">{api.auth}</td>
                  <td className="py-3 px-4 text-gray-600">{api.rateLimit}</td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={api.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="space-y-3 sm:hidden">
          {API_SOURCES.map((api) => (
            <div key={api.name} className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{api.name}</span>
                  {api.bulk && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                      LOTE
                    </span>
                  )}
                </div>
                <a
                  href={api.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Docs ↗
                </a>
              </div>
              <p className="mt-1 text-xs text-gray-600">{api.description}</p>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>Auth: {api.auth}</span>
                <span>Limite: {api.rateLimit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bulk data processing ─────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Processamento de dados em lote</h2>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card sm:p-6">
          <p className="text-sm leading-relaxed text-gray-700">
            Algumas fontes de dados do governo não oferecem APIs REST para consulta individual —
            os dados são disponibilizados apenas como <strong>arquivos em lote</strong> (CSV, JSON
            ou ZIP) que precisam ser baixados e processados integralmente.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Nesses casos, o Imposterio baixa os arquivos diretamente das fontes oficiais e os
            processa para extrair as informações relevantes. <strong>Nenhum dado é alterado ou
            manipulado</strong> — o processamento se limita a organizar, agregar e formatar os
            dados para exibição. Os valores finais refletem exatamente o que está nos arquivos originais.
          </p>

          <div className="mt-5 space-y-3">
            <BulkItem
              title="Presença em eventos da Câmara"
              description="Arquivo anual com todos os registros de presença. Agregamos em totais por deputado para calcular taxa de participação."
            />
            <BulkItem
              title="Base de empresas da Receita Federal (QSA)"
              description="~85 GB de dados societários. Importação mensal via worker dedicado para permitir consultas de rede de sócios em tempo real."
            />
            <BulkItem
              title="Dados eleitorais do TSE"
              description="Resultados de eleições e declarações de bens disponibilizados como arquivos CSV por ciclo eleitoral."
            />
          </div>

          <p className="mt-5 text-sm text-gray-600">
            Todo o código de processamento é público e pode ser verificado no{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:text-accent-hover transition-colors"
            >
              repositório do GitHub ↗
            </a>
          </p>
        </div>
      </section>

      {/* ── Cache methodology ────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Metodologia de cache</h2>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card sm:p-6">
          <h3 className="text-sm font-semibold text-gray-900">O que é cache?</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Cache é um armazenamento temporário que guarda uma cópia dos dados já consultados.
            Quando você acessa uma página, os dados são buscados na API oficial do governo e
            guardados. Se outra pessoa acessar a mesma página em seguida, os dados vêm dessa
            cópia — resposta mais rápida e menos carga nas APIs públicas.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Cada cópia tem um <strong>tempo de vida (TTL — Time to Live)</strong>. Após esse período,
            expira automaticamente e a próxima consulta busca dados frescos na API oficial.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CacheTier
              color="bg-emerald-500"
              label="Cache curto"
              range="3–6 horas"
              description="Votações, proposições, eventos — dados que mudam durante sessões legislativas"
            />
            <CacheTier
              color="bg-amber-500"
              label="Cache moderado"
              range="12–24 horas"
              description="Perfis de parlamentares, listas de deputados e senadores, discursos"
            />
            <CacheTier
              color="bg-indigo-500"
              label="Cache longo"
              range="7–30 dias"
              description="Dados de empresas, sanções, resultados eleitorais, estimativas do IBGE"
            />
          </div>

          <p className="mt-5 text-sm text-gray-600">
            Implementação:{" "}
            <a
              href={`${GITHUB_URL}/tree/main/packages/fetchers/lib/cache.ts`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-accent hover:text-accent-hover transition-colors"
            >
              cache.ts
            </a>{" "}
            · Intervalos:{" "}
            <a
              href={`${GITHUB_URL}/tree/main/packages/fetchers/lib/ttl.ts`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-accent hover:text-accent-hover transition-colors"
            >
              ttl.ts
            </a>
          </p>
        </div>

        {/* TTL tables */}
        <div className="mt-6 space-y-4">
          {CACHE_GROUPS.map((group) => (
            <details key={group.title} className="group rounded-xl border border-gray-200/80 bg-white shadow-card">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                {group.title}
                <svg
                  className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map((item) => (
                      <tr key={item.label}>
                        <td className="py-2 px-5 text-gray-700">{item.label}</td>
                        <td className="py-2 px-5 text-right font-mono text-xs text-gray-500">
                          {formatTtl(item.ttl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Open source ──────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Código aberto</h2>
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card sm:p-6">
          <p className="text-sm leading-relaxed text-gray-700">
            O Imposterio é um projeto de <strong>código aberto</strong>. Todo o código-fonte
            — desde as funções que buscam dados nas APIs oficiais até os componentes que
            renderizam cada tela — está disponível publicamente. Qualquer pessoa
            pode auditar, contribuir ou propor melhorias.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            A stack técnica é composta por <strong>Next.js</strong> (App Router + TypeScript),{" "}
            <strong>Tailwind CSS</strong>, <strong>Recharts</strong> para visualizações,{" "}
            <strong>Prisma</strong> como ORM, e <strong>Turborepo</strong> com{" "}
            <strong>pnpm workspaces</strong> para organização em monorepo.
          </p>
          <div className="mt-4">
            <GitHubLink href={GITHUB_URL} />
          </div>
        </div>
      </section>

      {/* ── Infrastructure ───────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Infraestrutura</h2>
        <p className="mb-4 text-sm text-gray-600">
          Serviços que mantêm a plataforma funcionando. Escolhidos por serem serverless
          (sem servidor fixo), com planos gratuitos generosos e compatíveis com a
          filosofia de custo zero para projetos cívicos.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INFRA_STACK.map((item) => (
            <div
              key={item.name}
              className="flex flex-col rounded-xl border border-gray-200/80 bg-white p-5 shadow-card"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {item.role}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                {item.url.replace("https://", "")} ↗
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function PrincipleCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  )
}

function BulkItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-gray-50 p-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      </span>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

function CacheTier({
  color,
  label,
  range,
  description,
}: {
  color: string
  label: string
  range: string
  description: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>
      <p className="mb-1 text-lg font-bold text-gray-900">{range}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────────── */

function VerifyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  )
}

function PrivacyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}
