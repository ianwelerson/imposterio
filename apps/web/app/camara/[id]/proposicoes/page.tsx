/**
 * @file page.tsx
 * @description Full propositions listing for a deputy — all authored legislation
 * with search, type/status filters, and pagination.
 *
 * Data source: GET /deputados/{id}/proposicoes (via getDeputadoProposicoes).
 */

import Link from "next/link"
import { getDeputyDetail, getDeputadoProposicoes } from "@imposterio/fetchers"
import { SourcePill } from "@/components/ui"
import { PropositionsList } from "./PropositionsList"

interface ProposicoesPageProps {
  params: Promise<{ id: string }>
}

export default async function ProposicoesPage({ params }: ProposicoesPageProps) {
  const { id } = await params

  const [deputy, propositions] = await Promise.all([
    getDeputyDetail(id),
    getDeputadoProposicoes(id),
  ])

  return (
    <>
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/camara/${id}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {deputy.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proposições</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Todas as proposições legislativas de autoria deste deputado — projetos de lei,
                PECs, requerimentos e outras iniciativas.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={propositions._source} />
            </div>
          </div>
        </div>
      </header>

      <PropositionsList
        propositions={propositions}
        sourceUrl={propositions._source ?? ""}
      />
    </>
  )
}
