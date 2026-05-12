/**
 * @file page.tsx
 * @description Empresas detail page — wired to OpenCNPJ + the local
 * partner-graph + transactions index.
 *
 * Sections (per EMPRESAS-PLAN.md §7.2):
 *
 * 1. Profile header — legal name, CNPJ, status badge, OpenCNPJ source pill
 * 2. Resumo geral — StatCards per observed transaction type with the
 *    parcial-value disclaimer (every total grows incrementally as the
 *    platform fetches more data, never a definitive figure).
 * 3. Dados cadastrais — InfoPanel from OpenCNPJ
 * 4. Quadro societário (QSA) — partner table with expandable rows that
 *    surface heuristic cross-references via {@link CompanyPartnersTable}
 * 5. Eventos observados — table of `(type, year)` aggregations with
 *    per-row source pills
 * 6. Sanções (CEIS / CNEP) — placeholder pending Phase 3D fetchers
 *    (Portal da Transparência blacklist / punished). EMPRESAS-PLAN.md §8
 *    flags this as a hard dependency before the module is feature-complete.
 *
 * Data sources in this page:
 * - OpenCNPJ → `getCompanyDetail(cnpj)` (cadastral + QSA)
 * - Imposterio DB → `getCompanyAggregates(cnpj)` (incremental totals)
 * - Imposterio DB → `findRelatedPartners(cnpj)` (heuristic graph)
 */

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  DataFetchError,
  DataTable,
  EmptyState,
  InfoPanel,
  ParcialNote,
  ProfileHeader,
  SectionHeader,
  SourcePill,
  StatCard,
} from "@/components/ui"
import {
  computeDonationRoi,
  getCompanyDonations,
  getContracts,
  ingestCompany,
} from "@imposterio/fetchers"
import type { DonationRoiRow } from "@imposterio/fetchers"
import {
  findRelatedPartners,
  getCompanyAggregates,
  normalizePartnerName,
} from "@imposterio/db/queries/companies"
import type {
  CampaignDonation,
  CompanyTransactionAggregate,
  CompanyTransactionType,
  GovernmentContract,
  WithSource,
} from "@imposterio/types"
import { formatBRL, formatBRLCompact } from "@/lib/calc/currency"

import { CompanyPartnersTable } from "./CompanyPartnersTable"

// ── Type metadata ─────────────────────────────────────────────────────

/**
 * Display metadata for each {@link CompanyTransactionType}. Drives the
 * StatCard label and the row label in the per-year aggregates table.
 *
 * Adding a new transaction type? Update EMPRESAS-PLAN.md §5 first, then
 * add an entry here so the value surfaces in the UI.
 */
const TYPE_LABELS: Record<CompanyTransactionType, string> = {
  ceap: "CEAP recebida (parlamentares)",
  contract: "Contratos com o governo",
  donation_in: "Doações eleitorais recebidas",
  donation_out: "Doações eleitorais feitas",
  bid_won: "Licitações vencidas",
  bid_lost: "Licitações perdidas",
}

/** Stable display order for StatCards so the page layout doesn't shuffle. */
const TYPE_ORDER: CompanyTransactionType[] = [
  "ceap",
  "contract",
  "donation_in",
  "donation_out",
  "bid_won",
  "bid_lost",
]

// ── Page ──────────────────────────────────────────────────────────────

interface CompanyDetailPageProps {
  params: Promise<{ cnpj: string }>
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { cnpj: rawCnpj } = await params
  const cnpj = rawCnpj.replace(/\D/g, "")

  // Bail early on malformed slugs — the OpenCNPJ fetcher would also throw
  // a 400-equivalent ApiError, but a plain notFound() avoids leaking a
  // raw error to the client and matches Next.js' route-level convention.
  if (cnpj.length !== 14) notFound()

  // All five calls are independent — fetch in parallel. `getCompanyDetail`
  // returns null on 404; the DB calls degrade to empty arrays implicitly
  // (the `Company` row may not exist yet on first visit). External fetchers
  // (`getContracts`, `getCompanyDonations`) are allowed to fail with a
  // structured marker so the UI can surface a "could not load" warning per
  // section while the rest of the page renders.
  // `ingestCompany` is `getCompanyDetail` + persistence: it returns the same
  // shape AND upserts the cadastral row + QSA into Postgres so subsequent
  // visits (and the partner cross-reference graph) have data to work with.
  // OpenCNPJ is Redis-cached for 30 days so the network call is free on
  // repeat visits — only the Postgres upsert runs each time.
  const [detail, aggregates, related, contractsResult, donationsResult] =
    await Promise.all([
      ingestCompany(cnpj),
      getCompanyAggregates(cnpj).catch(
        () => [] as CompanyTransactionAggregate[],
      ),
      findRelatedPartners(cnpj).catch(() => []),
      getContracts({ cnpj })
        .then((rows) => ({ ok: true as const, rows }))
        .catch(() => ({ ok: false as const })),
      getCompanyDonations(cnpj)
        .then((rows) => ({ ok: true as const, rows }))
        .catch(() => ({ ok: false as const })),
    ])

  if (!detail) notFound()

  const contracts: WithSource<GovernmentContract[]> | null = contractsResult.ok
    ? contractsResult.rows
    : null
  const donations: WithSource<CampaignDonation[]> | null = donationsResult.ok
    ? donationsResult.rows
    : null
  const donationsIn = donations?.filter((d) => d.direction === "in") ?? []
  const donationsOut = donations?.filter((d) => d.direction === "out") ?? []
  const roi: DonationRoiRow[] = donations ? computeDonationRoi(donations) : []

  // ── Aggregations and look-up tables ────────────────────────────────

  // Group aggregates by transaction type so we can render one StatCard per
  // type with a "valor parcial" disclaimer + a per-year breakdown table.
  const totalsByType = new Map<
    CompanyTransactionType,
    { total: number; lastObservedAt: Date; rows: CompanyTransactionAggregate[] }
  >()
  for (const row of aggregates) {
    const existing = totalsByType.get(row.type)
    if (existing) {
      existing.total += row.total
      existing.rows.push(row)
      if (row.lastObservedAt > existing.lastObservedAt) {
        existing.lastObservedAt = row.lastObservedAt
      }
    } else {
      totalsByType.set(row.type, {
        total: row.total,
        lastObservedAt: row.lastObservedAt,
        rows: [row],
      })
    }
  }

  // Cross-reference rows are keyed by normalized name so the client table
  // can map a QSA row to its match list without re-running normalization.
  const relatedByKey = new Map(
    related.map((r) => [normalizePartnerName(r.partnerName), r]),
  )

  // ── Profile header content ─────────────────────────────────────────

  const initials = (detail.tradeName || detail.legalName)
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??"

  // Surface the most useful pre-existing tags first; status appears even
  // for "BAIXADA" CNPJs because the user must know they're looking at an
  // inactive company before drawing conclusions.
  const tags = [
    detail.status || "Status desconhecido",
    `CNPJ ${formatCnpj(detail.cnpj)}`,
    detail.size,
    detail.address.uf,
  ].filter(Boolean) as string[]

  // ── Cadastral info panel ──────────────────────────────────────────

  const infoFields = [
    { label: "Razão social", value: detail.legalName || "—" },
    detail.tradeName && { label: "Nome fantasia", value: detail.tradeName },
    { label: "CNPJ", value: formatCnpj(detail.cnpj) },
    detail.openedAt && {
      label: "Data de abertura",
      value: formatDate(detail.openedAt),
    },
    detail.status && {
      label: "Situação cadastral",
      value: detail.status,
      sourceUrl: detail._source,
    },
    detail.statusDate && {
      label: "Data da situação",
      value: formatDate(detail.statusDate),
    },
    detail.mainCnae.code && {
      label: "CNAE principal",
      value: `${formatCnae(detail.mainCnae.code)} — ${detail.mainCnae.description}`,
    },
    detail.size && { label: "Porte", value: detail.size },
    formatAddress(detail.address) && {
      label: "Endereço",
      value: formatAddress(detail.address),
    },
    detail.capital > 0 && {
      label: "Capital social",
      value: formatBRL(detail.capital),
    },
    detail.legalNature && {
      label: "Natureza jurídica",
      value: detail.legalNature,
    },
  ].filter(Boolean) as Array<{
    label: string
    value: string
    href?: string
    sourceUrl?: string
  }>

  // ── Aggregates table ─────────────────────────────────────────────

  const aggregateRows = aggregates
    // Show the most recent year per type first, then alphabetize types so
    // visually adjacent groups don't visually flicker between renders.
    .slice()
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      return b.year - a.year
    })

  return (
    <>
      {/* ── 1. Profile header ─────────────────────────────────────── */}
      <ProfileHeader
        initials={initials}
        name={detail.tradeName || detail.legalName || formatCnpj(detail.cnpj)}
        tags={tags}
        sourceUrl={detail._source}
      />

      {/* ── 2. Resumo geral (incremental totals) ──────────────────── */}
      <section className="mb-12 mt-10">
        <SectionHeader
          title="Resumo geral"
          description="Totais somados a partir do que a plataforma já observou nas APIs oficiais. Crescem incrementalmente."
        />

        {totalsByType.size === 0 ? (
          <EmptyState
            message="Sem totais observados ainda"
            description="Nenhuma despesa, contrato ou doação envolvendo este CNPJ foi consultada pela plataforma até agora. Os totais aparecem aqui à medida que outras páginas (CEAP, contratos, doações) são visitadas."
          />
        ) : (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Totais observados por tipo"
          >
            {TYPE_ORDER.filter((type) => totalsByType.has(type)).map((type) => {
              // Non-null asserted: filtered above on `has`.
              const entry = totalsByType.get(type)!
              return (
                <div key={type}>
                  <StatCard
                    label={TYPE_LABELS[type]}
                    value={formatBRLCompact(entry.total)}
                    tooltip={`Soma de todas as transações observadas do tipo "${TYPE_LABELS[type].toLowerCase()}" para este CNPJ. Cresce conforme novas páginas são consultadas.`}
                  />
                  <ParcialNote lastObservedAt={entry.lastObservedAt} />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 3. Dados cadastrais ───────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Dados cadastrais"
          description="Informações da Receita Federal disponibilizadas via OpenCNPJ."
          sourceUrl={detail._source}
        />
        <InfoPanel fields={infoFields} />
      </section>

      {/* ── 4. Quadro societário (QSA) ────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Quadro societário (QSA)"
          description="Sócios cadastrados na Receita Federal. Expanda cada linha para ver vínculos prováveis com outras empresas — cruzamentos heurísticos baseados em CPF mascarado e nome."
          sourceUrl={detail._source}
        />
        {detail.partners.length === 0 ? (
          <EmptyState
            message="Sem sócios cadastrados"
            description="A Receita Federal não retornou nenhum sócio para este CNPJ. Isso é normal para empresas individuais (MEI / EIRELI)."
          />
        ) : (
          <CompanyPartnersTable
            partners={detail.partners}
            relatedByKey={relatedByKey}
            sourceUrl={detail._source}
          />
        )}
      </section>

      {/* ── 5. Contratos com o governo federal ────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Contratos com o governo federal"
          description="Contratos firmados com órgãos do Executivo federal e publicados no Portal da Transparência. Cada linha tem um link direto para o registro oficial onde é possível consultar pagamentos, aditivos e empenhos."
          sourceUrl={contracts?._source}
        />
        {contracts === null ? (
          <DataFetchError label="contratos federais" />
        ) : contracts.length === 0 ? (
          <EmptyState
            message="Nenhum contrato federal encontrado"
            description="Este CNPJ não consta como contratado em nenhum contrato federal listado pelo Portal da Transparência. Lembre-se: estaduais e municipais não estão cobertos por essa fonte."
          />
        ) : (
          <DataTable
            columns={contractColumns}
            data={contracts.slice().sort((a, b) => {
              // Most recent signature first; rows missing a signatureDate
              // are pushed to the bottom so they don't interrupt the timeline.
              if (!a.signatureDate && !b.signatureDate) return 0
              if (!a.signatureDate) return 1
              if (!b.signatureDate) return -1
              return b.signatureDate.localeCompare(a.signatureDate)
            })}
            rowKey={(c) => c.id}
          />
        )}
      </section>

      {/* ── 6. Doações eleitorais (TSE) ───────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Doações eleitorais"
          description="Movimentações financeiras envolvendo este CNPJ nas prestações de contas eleitorais publicadas pelo TSE — tanto doações feitas a candidatos (`donation_out`) quanto pagamentos recebidos de campanhas (`donation_in`). Cada linha tem fonte direta para o registro oficial."
          sourceUrl={donations?._source}
        />
        {donations === null ? (
          <DataFetchError label="doações eleitorais" />
        ) : donations.length === 0 ? (
          <EmptyState
            message="Doações eleitorais indisponíveis em tempo real"
            description="O TSE publica as prestações de contas eleitorais apenas como arquivos CSV em lote — não há endpoint público que aceite consulta por CNPJ. A integração depende de um worker que baixe e indexe esses arquivos periodicamente; enquanto não existir, esta seção fica vazia. Para uma consulta pontual, busque o CNPJ diretamente em divulgacandcontas.tse.jus.br."
          />
        ) : (
          <div className="space-y-8">
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              aria-label="Resumo de doações eleitorais"
            >
              <div>
                <StatCard
                  label="Total recebido de campanhas"
                  value={formatBRL(sumValues(donationsIn))}
                  tooltip={`${donationsIn.length} pagamento(s) registrado(s) como prestador de serviço a candidatos ou comitês.`}
                />
                <ParcialNote lastObservedAt={new Date()} />
              </div>
              <div>
                <StatCard
                  label="Total doado a campanhas"
                  value={formatBRL(sumValues(donationsOut))}
                  tooltip={`${donationsOut.length} doação(ões) registrada(s) como doador. Empresas estão proibidas de doar a candidatos desde 2015 (ADI 4650), então valores recentes são raros.`}
                />
                <ParcialNote lastObservedAt={new Date()} />
              </div>
            </div>

            <DataTable
              columns={donationColumns}
              data={donations.slice(0, 50)}
              rowKey={(d) => `${d.direction}-${d.id}`}
            />
          </div>
        )}
      </section>

      {/* ── 7. ROI político ───────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="ROI político"
          description="Para cada candidato, partido ou comitê com quem o CNPJ teve relação financeira, comparamos o que foi doado contra o que foi recebido. Negativo = empresa entregou mais do que recebeu; positivo = empresa recebeu mais do que doou."
          sourceUrl={donations?._source}
        />
        {roi.length === 0 ? (
          <EmptyState
            message="Sem cruzamentos para calcular ROI"
            description="O ROI político só aparece quando há doações eleitorais registradas com este CNPJ — feitas, recebidas ou ambas."
          />
        ) : (
          <DataTable
            columns={roiColumns}
            data={roi.slice(0, 25)}
            rowKey={(r) =>
              r.counterpartyDocument || `name:${r.counterpartyName}`
            }
          />
        )}
      </section>

      {/* ── 8. Eventos observados (per-year breakdown) ────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Eventos observados"
          description="Cada linha representa transações já capturadas pela plataforma para este CNPJ, agrupadas por tipo e ano. A fonte aponta para o registro original do evento."
        />
        {aggregateRows.length === 0 ? (
          <EmptyState
            message="Nenhum evento observado ainda"
            description="As linhas aparecem conforme a plataforma encontra este CNPJ em consultas a despesas CEAP, contratos federais, doações eleitorais e outras fontes."
          />
        ) : (
          <DataTable
            columns={buildAggregateColumns(cnpj)}
            data={aggregateRows}
            rowKey={(r) => `${r.type}-${r.year}`}
          />
        )}
      </section>

      {/* ── 9. Sanções (CEIS / CNEP) — placeholder ────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Sanções (CEIS / CNEP)"
          description="Sanções administrativas registradas no Cadastro Nacional de Empresas Inidôneas e Suspensas (CEIS) e no Cadastro Nacional de Empresas Punidas (CNEP)."
        />
        <EmptyState
          message="Verificação de sanções pendente"
          description="A integração com o Portal da Transparência (CEIS / CNEP) será habilitada na fase 3D. Enquanto isso, consulte diretamente em portaldatransparencia.gov.br."
        />
      </section>

      {/* ── Methodology footer ───────────────────────────────────── */}
      <footer className="mb-6 mt-2 rounded-lg border border-gray-200/80 bg-gray-50/80 px-4 py-3">
        <p className="text-xs leading-relaxed text-gray-600">
          Os totais desta página são <strong>incrementais</strong> — crescem
          conforme novos dados são consultados. Detalhes em{" "}
          <a
            href="/sobre/metodologia#empresas"
            className="font-medium text-accent hover:text-accent-hover transition-colors"
          >
            metodologia → empresas
          </a>
          .
        </p>
      </footer>
    </>
  )
}

// ── Contracts table column definitions ───────────────────────────────

const contractColumns = [
  {
    header: "Órgão",
    cell: (c: GovernmentContract) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {c.agency || "Órgão não publicado"}
        </span>
        {c.modality && (
          <span className="text-[11px] text-gray-400">{c.modality}</span>
        )}
      </div>
    ),
  },
  {
    header: "Objeto",
    cell: (c: GovernmentContract) => (
      <div className="flex flex-col">
        <span className="text-gray-700">
          {c.object || "Objeto não publicado"}
        </span>
        {c.number && (
          <span className="text-[11px] text-gray-400">
            Contrato {c.number}
            {c.status ? ` — ${c.status}` : ""}
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Vigência",
    cell: (c: GovernmentContract) => (
      <span className="text-xs text-gray-500">{formatPeriod(c)}</span>
    ),
  },
  {
    header: "Valor",
    align: "right" as const,
    cell: (c: GovernmentContract) => (
      <span className="font-semibold text-gray-900">
        {formatBRL(c.currentValue)}
      </span>
    ),
  },
  {
    header: "Fonte",
    align: "right" as const,
    cell: (c: GovernmentContract) =>
      c.linkPdt ? <SourcePill url={c.linkPdt} /> : null,
  },
]

/** Formats the contract period as `assinado em … · vigência …`. */
function formatPeriod(c: GovernmentContract): string {
  const signed = c.signatureDate ? `assinado ${formatDate(c.signatureDate)}` : ""
  const period =
    c.startDate || c.endDate
      ? `${c.startDate ? formatDate(c.startDate) : "?"} → ${
          c.endDate ? formatDate(c.endDate) : "?"
        }`
      : ""
  return [signed, period].filter(Boolean).join(" · ") || "—"
}

// ── Donations table column definitions ───────────────────────────────

const donationColumns = [
  {
    header: "Direção",
    cell: (d: CampaignDonation) => (
      <span
        className={
          d.direction === "in"
            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
            : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
        }
      >
        {d.direction === "in" ? "Recebido" : "Doado"}
      </span>
    ),
  },
  {
    header: "Contraparte",
    cell: (d: CampaignDonation) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {d.recipientName || "Não publicado"}
        </span>
        <span className="text-[11px] text-gray-400">
          {[d.recipientPosition, d.recipientParty, d.recipientUf]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
      </div>
    ),
  },
  {
    header: "Data",
    cell: (d: CampaignDonation) => (
      <span className="text-xs text-gray-500">
        {d.donationDate ? formatDate(d.donationDate) : `Eleição ${d.year}`}
      </span>
    ),
  },
  {
    header: "Valor",
    align: "right" as const,
    cell: (d: CampaignDonation) => (
      <span className="font-semibold text-gray-900">{formatBRL(d.value)}</span>
    ),
  },
  {
    header: "Fonte",
    align: "right" as const,
    cell: (d: CampaignDonation) =>
      d._source ? <SourcePill url={d._source} /> : null,
  },
]

// ── ROI table column definitions ─────────────────────────────────────

const roiColumns = [
  {
    header: "Contraparte",
    cell: (r: DonationRoiRow) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {r.counterpartyName || "Não publicado"}
        </span>
        <span className="text-[11px] text-gray-400">
          {[r.position, r.party, r.uf].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>
    ),
  },
  {
    header: "Doado",
    align: "right" as const,
    cell: (r: DonationRoiRow) => (
      <span className="font-mono tabular-nums text-amber-700">
        {formatBRL(r.donatedOut)}
      </span>
    ),
  },
  {
    header: "Recebido",
    align: "right" as const,
    cell: (r: DonationRoiRow) => (
      <span className="font-mono tabular-nums text-emerald-700">
        {formatBRL(r.receivedIn)}
      </span>
    ),
  },
  {
    header: "ROI",
    align: "right" as const,
    cell: (r: DonationRoiRow) => (
      <span
        className={
          r.roi > 0
            ? "font-semibold text-emerald-700"
            : r.roi < 0
              ? "font-semibold text-amber-700"
              : "font-semibold text-gray-700"
        }
      >
        {r.roi > 0 ? "+" : ""}
        {formatBRL(r.roi)}
      </span>
    ),
  },
]

/** Sums the `value` field of a list of donations, in BRL. */
function sumValues(rows: readonly CampaignDonation[]): number {
  let total = 0
  for (const r of rows) total += r.value
  return total
}

// ── Aggregates table column definitions ──────────────────────────────

function buildAggregateColumns(cnpj: string) {
  return [
    {
      header: "Tipo",
      cell: (r: CompanyTransactionAggregate) => (
        <Link
          href={`/empresas/${cnpj}/eventos/${r.type}/${r.year}`}
          className="font-medium text-accent transition-colors hover:text-accent-hover"
        >
          {TYPE_LABELS[r.type]}
        </Link>
      ),
    },
    {
      header: "Ano",
      align: "right" as const,
      cell: (r: CompanyTransactionAggregate) => (
        <span className="font-mono tabular-nums text-gray-600">{r.year}</span>
      ),
    },
    {
      header: "Total",
      align: "right" as const,
      cell: (r: CompanyTransactionAggregate) => (
        <span className="font-semibold text-gray-900">{formatBRL(r.total)}</span>
      ),
    },
    {
      header: "Registros",
      align: "right" as const,
      cell: (r: CompanyTransactionAggregate) => (
        <span className="font-mono tabular-nums text-gray-600">{r.count}</span>
      ),
    },
    {
      header: "Atualizado em",
      align: "right" as const,
      cell: (r: CompanyTransactionAggregate) => (
        <span className="text-xs text-gray-500">
          {r.lastObservedAt.toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: CompanyTransactionAggregate) => (
        <Link
          href={`/empresas/${cnpj}/eventos/${r.type}/${r.year}`}
          className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          aria-label={`Ver detalhes de ${TYPE_LABELS[r.type]} em ${r.year}`}
        >
          Ver detalhes →
        </Link>
      ),
    },
  ]
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Formats a 14-digit CNPJ as `XX.XXX.XXX/XXXX-XX`. */
function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

/** Formats a 7-digit CNAE code as `XXXX-X/XX`. */
function formatCnae(code: string): string {
  const d = code.replace(/\D/g, "").padStart(7, "0").slice(0, 7)
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`
}

/** Formats an ISO date string as a Brazilian short date. */
function formatDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleDateString("pt-BR")
}

/**
 * Formats the address block as a single-line string, suppressing missing
 * components so we don't render double commas when OpenCNPJ omits a field.
 */
function formatAddress(address: {
  street: string
  number: string
  complement: string | null
  district: string
  city: string
  uf: string
  zip: string
}): string {
  const streetPart = [address.street, address.number].filter(Boolean).join(", ")
  const head = [streetPart, address.complement].filter(Boolean).join(" — ")
  const districtCity = [address.district, address.city]
    .filter(Boolean)
    .join(", ")
  const cityUf = [districtCity, address.uf].filter(Boolean).join(" — ")
  const zip = address.zip ? formatZip(address.zip) : ""
  return [head, cityUf, zip].filter(Boolean).join(", ")
}

/** Formats a CEP as `XXXXX-XXX`. */
function formatZip(zip: string): string {
  const d = zip.replace(/\D/g, "")
  if (d.length !== 8) return zip
  return `${d.slice(0, 5)}-${d.slice(5, 8)}`
}
