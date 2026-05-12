/**
 * @file page.tsx
 * @description Partner-detail page — consolidates every QSA row that resolves
 * to the same person (heuristic) and lists the companies they appear in plus
 * any donation activity we can match.
 *
 * Identity is heuristic — see EMPRESAS-PLAN.md §6. The page always frames
 * matches as "vínculos prováveis" because OpenCNPJ masks CPFs and we never
 * assert identity equivalence. {@link getPartnerProfileBySlug} dedupes across
 * `cpfMid` (preferred) or `partnerNameKey` (fallback).
 *
 * URL: `/empresas/socios/{slug}`
 *
 * Slug format produced by `partnerSlug()`:
 * - `cpf-{cpfMid}`  — when at least one matching row carried a masked CPF
 * - `name-{key}`    — fallback when no CPF is available (much weaker signal)
 *
 * Doações como pessoa física: TSE does not expose a public "donations by
 * donor CPF/name" endpoint at the moment — the only public surface is the
 * `divulgacandcontas.tse.jus.br` UI, fed by per-election CSV bulks. Until we
 * stand up a TSE bulk-ingest worker, this page deep-links to the official
 * search rather than fabricating an empty section.
 */

import Link from "next/link"
import { notFound } from "next/navigation"

import {
  Badge,
  DataTable,
  EmptyState,
  ProfileHeader,
  SectionHeader,
} from "@/components/ui"
import {
  getPartnerProfileBySlug,
  type PartnerCompanyHit,
} from "@imposterio/db/queries/companies"

interface PartnerDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function PartnerDetailPage({
  params,
}: PartnerDetailPageProps) {
  const { slug } = await params
  const profile = await getPartnerProfileBySlug(slug)
  if (!profile) notFound()

  const initials = profile.displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??"

  const tags = [
    profile.maskedCpf ? `CPF ${profile.maskedCpf}` : null,
    `${profile.companies.length} empresa(s) vinculadas`,
    profile.cpfMid ? "Match por CPF" : "Match por nome",
  ].filter(Boolean) as string[]

  // The TSE consulta search accepts the partner name as a free-form input.
  // Lowercase + trim so the URL stays predictable; encode for safety.
  const tseSearchUrl =
    "https://divulgacandcontas.tse.jus.br/divulga/#/doadores?q=" +
    encodeURIComponent(profile.displayName.trim())

  return (
    <>
      <ProfileHeader
        initials={initials}
        name={profile.displayName}
        tags={tags}
      />

      <section className="mb-12 mt-10">
        <SectionHeader
          title="Empresas vinculadas a este sócio"
          description={
            profile.cpfMid
              ? "Empresas em que este sócio aparece no quadro societário, agrupadas pelos 6 dígitos centrais do CPF mascarado (forte indício de identidade)."
              : "Empresas em que aparece um sócio com nome compatível. Sem CPF mascarado para confirmar — vínculos podem ser homônimos."
          }
        />
        {profile.companies.length === 0 ? (
          <EmptyState
            message="Nenhuma empresa vinculada"
            description="Não encontramos empresas em que este sócio apareça no quadro societário."
          />
        ) : (
          <DataTable
            columns={companyColumns}
            data={profile.companies}
            rowKey={(c) => c.cnpj}
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Doações como pessoa física"
          description="O TSE não expõe um endpoint público para listar doações por CPF de doador em tempo real. Até que essa integração seja feita, consulte diretamente a busca oficial pelo nome do sócio."
        />
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-4">
          <p className="text-sm leading-relaxed text-amber-900">
            <strong>Integração pendente.</strong> A consulta a doações
            individuais será habilitada quando o worker de ingestão dos arquivos
            do TSE estiver no ar. Por enquanto, abra a busca oficial:
          </p>
          <a
            href={tseSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Buscar &ldquo;{profile.displayName}&rdquo; no TSE ↗
          </a>
        </div>
      </section>

      <footer className="mb-6 mt-2 rounded-lg border border-gray-200/80 bg-gray-50/80 px-4 py-3">
        <p className="text-xs leading-relaxed text-gray-600">
          Os vínculos exibidos são <strong>heurísticos</strong> — CPFs são
          mascarados na fonte e nomes podem ter homônimos. Sempre verifique na
          fonte oficial antes de tirar conclusões.
        </p>
      </footer>
    </>
  )
}

const companyColumns = [
  {
    header: "Empresa",
    cell: (r: PartnerCompanyHit) => {
      const display = r.tradeName || r.legalName || formatCnpj(r.cnpj)
      const subtitle =
        r.tradeName && r.legalName && r.tradeName !== r.legalName
          ? r.legalName
          : null
      return (
        <div className="flex flex-col">
          <Link
            href={`/empresas/${r.cnpj}`}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {display}
          </Link>
          {subtitle && (
            <span className="text-[11px] text-gray-400">{subtitle}</span>
          )}
        </div>
      )
    },
  },
  {
    header: "CNPJ",
    cell: (r: PartnerCompanyHit) => (
      <span className="font-mono text-sm text-gray-500">
        {formatCnpj(r.cnpj)}
      </span>
    ),
  },
  {
    header: "UF",
    align: "center" as const,
    cell: (r: PartnerCompanyHit) => (
      <span className="text-gray-600">{r.uf || "—"}</span>
    ),
  },
  {
    header: "Qualificação",
    cell: (r: PartnerCompanyHit) => (
      <span className="text-gray-600">{r.qualification || "—"}</span>
    ),
  },
  {
    header: "Entrada",
    align: "right" as const,
    cell: (r: PartnerCompanyHit) => (
      <span className="text-xs text-gray-500">
        {r.joinedAt
          ? r.joinedAt.toLocaleDateString("pt-BR")
          : <Badge variant="gray">Sem data</Badge>}
      </span>
    ),
  },
]

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}
