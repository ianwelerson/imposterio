/**
 * @file page.tsx
 * @description Methodology reference page — explains how each module
 * ingests, aggregates and labels data.
 *
 * Currently anchors:
 * - `#empresas` — empresas module: incremental aggregation, partner-graph
 *   heuristic, sanctions integration. Linked from the empresas overview
 *   and detail pages as their disclaimer footer.
 *
 * Future modules can append sibling sections with their own anchors. Keep
 * the document deep-linkable: every `<section>` exposes a stable `id` and
 * uses `scroll-mt-*` so the anchor is not hidden by sticky chrome.
 */

import Link from "next/link"

import { SectionHeader } from "@/components/ui"

export const metadata = {
  title: "Metodologia — Imposterio",
  description:
    "Como o Imposterio ingere e agrega dados públicos. Inclui a metodologia incremental usada na seção de Empresas.",
}

export default function MetodologiaPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Documentação
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Metodologia
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
          Cada módulo do Imposterio segue uma metodologia diferente para ingerir,
          agregar e rotular dados públicos. Esta página detalha como interpretar
          os números exibidos em cada seção, especialmente onde o cálculo não é
          definitivo. Para a lista de fontes oficiais e TTLs de cache, veja{" "}
          <Link
            href="/sobre"
            className="font-medium text-accent hover:text-accent-hover transition-colors"
          >
            /sobre
          </Link>
          .
        </p>
      </header>

      {/* ── Empresas ─────────────────────────────────────────────────── */}
      <section
        id="empresas"
        className="mb-12 scroll-mt-24 border-t border-gray-200/60 pt-10"
        aria-labelledby="empresas-heading"
      >
        <div className="mb-6">
          <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-gray-400">
            #empresas
          </p>
          <h2
            id="empresas-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-gray-900"
          >
            Empresas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
            Os totais exibidos nas páginas de empresas são <strong>parciais por
            construção</strong>. Esta seção explica por que isso acontece, como
            os números crescem ao longo do tempo e como interpretar os rótulos
            de confiança no quadro societário.
          </p>
        </div>

        {/* ── Incremental aggregation ──────────────────────────────── */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeader
            title="Agregação incremental"
            description="Por que o total cresce conforme o site é usado."
            accent="border-emerald-400"
          />
          <p className="text-sm leading-relaxed text-gray-700">
            O Imposterio não baixa antecipadamente todos os contratos, despesas
            CEAP e doações eleitorais que mencionam um CNPJ — esses conjuntos
            somam dezenas de gigabytes. Em vez disso, a plataforma <strong>indexa
            sob demanda</strong>: cada vez que alguém visita uma página que retorna
            CNPJs (despesas de um deputado, contratos de um órgão, prestação de
            contas de um candidato), as transações observadas são registradas
            no índice local.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Isso significa que o "Total observado" de uma empresa <strong>não é
            o total real</strong> — é o total já visto pela plataforma até agora.
            Conforme novos usuários consultam novas páginas, mais transações
            envolvendo o CNPJ entram no índice e o total cresce. O rótulo{" "}
            <em className="not-italic font-medium text-gray-900">
              "Valor parcial — atualizado em DD/MM/AAAA"
            </em>{" "}
            ao lado de cada número indica quando foi a última observação.
          </p>

          <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            O que evitamos
          </h4>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-gray-700">
            <BulletItem>
              <strong>Contagem dupla:</strong> cada transação tem uma chave
              estável da fonte (ex.: <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">idDocumento</code>{" "}
              de uma despesa CEAP). Visitar a mesma página duas vezes não
              duplica linhas — o índice usa <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">UPSERT</code>{" "}
              por <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">(cnpj, tipo, sourceKey)</code>.
            </BulletItem>
            <BulletItem>
              <strong>Cache que perde dados:</strong> as agregações não vivem
              no Redis. Mesmo que o cache expire, as somas continuam corretas
              porque vêm de uma query <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">SUM</code>{" "}
              no Postgres.
            </BulletItem>
            <BulletItem>
              <strong>Totais inventados:</strong> nunca somamos estimativas. Se
              um valor não foi observado, ele não aparece — preferimos omitir
              a transparência incompleta a fabricar precisão.
            </BulletItem>
          </ul>
        </div>

        {/* ── Partner graph heuristic ──────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeader
            title="Vínculos prováveis no quadro societário"
            description="Como reconhecemos que dois sócios podem ser a mesma pessoa, sem nunca afirmar."
            accent="border-amber-400"
          />
          <p className="text-sm leading-relaxed text-gray-700">
            A Receita Federal mascara o CPF nos dados públicos do quadro
            societário ({" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
              ***.456.789-**
            </code>
            ). Para sugerir que um mesmo sócio aparece em duas empresas
            diferentes, cruzamos os 6 dígitos do meio do CPF com a similaridade
            do nome normalizado (sem acentos, em minúsculas). Esse cruzamento
            é <strong>sempre heurístico</strong> — por isso os rótulos da
            interface usam o termo <em className="not-italic font-medium text-gray-900">"vínculo provável"</em>,
            nunca "confirmado".
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ConfidenceTier
              level="alta"
              color="bg-emerald-500"
              description="6 dígitos do CPF coincidem E os nomes normalizados são iguais. Quase certeza estatística."
            />
            <ConfidenceTier
              level="média"
              color="bg-amber-500"
              description="6 dígitos coincidem, mas os nomes diferem em apêndices (ex.: um inclui sobrenome de família)."
            />
            <ConfidenceTier
              level="baixa"
              color="bg-rose-500"
              description="Apenas os nomes batem, sem CPF coincidente. Desabilitado por padrão — só aparece sob demanda."
            />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            <strong className="text-gray-700">Por que importa:</strong> nomes
            comuns (José da Silva, Maria Santos) geram falsos positivos
            facilmente. Insistir no CPF coincidente reduz drasticamente o ruído
            sem precisar reconstruir o documento real. O Imposterio nunca
            armazena ou exibe CPFs sem máscara, em respeito à LGPD.
          </p>
        </div>

        {/* ── Sanctions ─────────────────────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeader
            title="Sanções (CEIS / CNEP)"
            description="Diferente das transações, sanções são checadas em tempo real."
            accent="border-rose-400"
          />
          <p className="text-sm leading-relaxed text-gray-700">
            As consultas ao Cadastro Nacional de Empresas Inidôneas e Suspensas
            (CEIS) e ao Cadastro Nacional de Empresas Punidas (CNEP) não usam o
            modelo incremental — elas são consultadas diretamente no Portal da
            Transparência sempre que uma página de empresa é aberta, com TTL
            curto no Redis. Uma empresa entrar ou sair de uma dessas listas é
            evento que não pode atrasar.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Enquanto a integração com o Portal da Transparência (fase 3D) não
            estiver concluída, a seção de sanções aparece como um espaço
            reservado nas páginas de empresa, com link direto para consulta
            manual em{" "}
            <a
              href="https://portaldatransparencia.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:text-accent-hover transition-colors"
            >
              portaldatransparencia.gov.br ↗
            </a>
            .
          </p>
        </div>

        {/* ── Sources ──────────────────────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeader
            title="Fontes que alimentam o índice"
            description="Cada interação de usuário em outras seções pode contribuir."
            accent="border-indigo-400"
          />
          <ul className="space-y-3 text-sm leading-relaxed text-gray-700">
            <SourceItem
              type="ceap"
              label="CEAP — Câmara e Senado"
              description="Cada despesa parlamentar que tem CNPJ de fornecedor é registrada como transação tipo ceap, com o parlamentar como contraparte."
            />
            <SourceItem
              type="contract"
              label="Contratos federais — Portal da Transparência"
              description="Ao abrir a ficha de um contrato, o CNPJ contratado é indexado e o valor compõe o total observado."
            />
            <SourceItem
              type="donation_in"
              label="Doações eleitorais — TSE"
              description="Receitas e despesas registradas pelo TSE alimentam donation_in (CNPJ recebeu de campanha) e donation_out (CNPJ doou para campanha)."
            />
            <SourceItem
              type="bid"
              label="Licitações (em construção)"
              description="Quando a fase 3C do Portal da Transparência for concluída, vitórias e derrotas em licitações entrarão como bid_won / bid_lost."
            />
          </ul>
          <p className="mt-4 text-xs italic leading-relaxed text-gray-500">
            Todo registro mantém o link da API original — o pill "↗ fonte" ao
            lado de cada linha do índice abre o registro oficial.
          </p>
        </div>
      </section>
    </>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span>{children}</span>
    </li>
  )
}

function ConfidenceTier({
  level,
  color,
  description,
}: {
  level: string
  color: string
  description: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold capitalize text-gray-900">
          Confiança {level}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{description}</p>
    </div>
  )
}

function SourceItem({
  type,
  label,
  description,
}: {
  type: string
  label: string
  description: string
}) {
  return (
    <li className="flex gap-3">
      <code className="mt-0.5 h-fit shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
        {type}
      </code>
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </li>
  )
}
