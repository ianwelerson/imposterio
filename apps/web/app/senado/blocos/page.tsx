/**
 * @file page.tsx
 * @description Parties, blocs, and leadership composition page for the Senate.
 *
 * Replaces ad-hoc party aggregation derived from the senators list with the
 * official Senate structures. Three data sources combined:
 *
 * - GET /senador/partidos.json   → parties + bench sizes
 * - GET /dados/ListaBlocoParlamentar.json → parliamentary blocs
 * - GET /composicao/lideranca    → active leadership roles
 */

import Link from "next/link"
import {
  getSenadoParties,
  getSenadoBlocs,
  getSenadoLeadershipComposition,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type {
  SenadoPartyEntry,
  SenadoBloc,
  SenadoLeadershipEntry,
} from "@imposterio/types"
import {
  StatCard,
  SectionHeader,
  Badge,
  DataTable,
  ToastTrigger,
  DataFetchError,
} from "@/components/ui"

export default async function SenadoBlocosPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const [parties, blocs, leadership] = await Promise.all([
    collectErrors(
      () => getSenadoParties(),
      emptySourced<SenadoPartyEntry[]>([]),
      errors,
      "Partidos",
      failed,
    ),
    collectErrors(
      () => getSenadoBlocs(),
      emptySourced<SenadoBloc[]>([]),
      errors,
      "Blocos",
      failed,
    ),
    collectErrors(
      () => getSenadoLeadershipComposition(),
      emptySourced<SenadoLeadershipEntry[]>([]),
      errors,
      "Lideranças",
      failed,
    ),
  ])

  const totalSenators = parties.reduce((sum, p) => sum + (p.benchSize ?? 0), 0)

  const partyColumns = [
    {
      header: "Sigla",
      className: "whitespace-nowrap",
      cell: (r: SenadoPartyEntry) => (
        <Badge variant="gray">{r.abbreviation}</Badge>
      ),
    },
    {
      header: "Nome",
      cell: (r: SenadoPartyEntry) => (
        <span className="text-sm text-gray-700">{r.name ?? "—"}</span>
      ),
    },
    {
      header: "Senadores",
      align: "right" as const,
      className: "whitespace-nowrap",
      cell: (r: SenadoPartyEntry) => (
        <span className="text-sm font-medium tabular-nums text-gray-900">
          {r.benchSize ?? "—"}
        </span>
      ),
    },
  ]

  const blocColumns = [
    {
      header: "Bloco",
      cell: (r: SenadoBloc) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.name}</p>
          {r.creationDate && (
            <p className="text-xs text-gray-500 tabular-nums">
              Desde {r.creationDate.slice(0, 10).split("-").reverse().join("/")}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Partidos",
      cell: (r: SenadoBloc) => (
        <div className="flex flex-wrap gap-1">
          {r.parties.map((p) => (
            <Badge key={p} variant="gray">{p}</Badge>
          ))}
        </div>
      ),
    },
  ]

  const leadershipColumns = [
    {
      header: "Senador(a)",
      cell: (r: SenadoLeadershipEntry) => (
        <Link
          href={`/senado/${r.senatorId}`}
          className="text-sm font-medium text-gray-900 hover:text-accent transition-colors"
        >
          {r.senatorName}
        </Link>
      ),
    },
    {
      header: "Cargo",
      cell: (r: SenadoLeadershipEntry) => (
        <span className="text-sm text-gray-700">{r.role}</span>
      ),
    },
    {
      header: "Unidade",
      cell: (r: SenadoLeadershipEntry) => (
        <div>
          <Badge variant="gray">{r.unitAbbreviation}</Badge>
          {r.unitType && (
            <span className="ml-2 text-xs text-gray-500">{r.unitType}</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/senado"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar ao Senado
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Partidos, blocos e lideranças</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Partidos com bancada no Senado, blocos parlamentares ativos e composição atual das lideranças.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-12">
        <SectionHeader title="Resumo" sourceUrl={parties._source} />
        <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Partidos com bancada"
              value={String(parties.length)}
              tooltip="Partidos com pelo menos um senador em exercício."
            />
            <StatCard
              label="Total de senadores"
              value={String(totalSenators)}
              tooltip="Soma das bancadas — pode divergir de 81 quando houver vagas em aberto."
            />
            <StatCard
              label="Blocos ativos"
              value={String(blocs.length)}
              tooltip="Blocos parlamentares formalmente constituídos no Senado."
            />
          </div>
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Partidos" sourceUrl={parties._source} />
        {failed.has("Partidos") ? (
          <DataFetchError label="os partidos" />
        ) : parties.length === 0 ? (
          <p className="text-sm text-gray-500">A API do Senado não retornou partidos no momento.</p>
        ) : (
          <DataTable columns={partyColumns} data={parties} rowKey={(r) => r.abbreviation} />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Blocos parlamentares" sourceUrl={blocs._source} />
        {failed.has("Blocos") ? (
          <DataFetchError label="os blocos" />
        ) : blocs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum bloco parlamentar registrado.</p>
        ) : (
          <DataTable columns={blocColumns} data={blocs} rowKey={(r) => r.id} />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Lideranças em exercício" sourceUrl={leadership._source} />
        {failed.has("Lideranças") ? (
          <DataFetchError label="a composição das lideranças" />
        ) : leadership.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma liderança em exercício registrada.</p>
        ) : (
          <DataTable
            columns={leadershipColumns}
            data={leadership}
            rowKey={(r, i) => `${r.senatorId}-${r.role}-${i}`}
          />
        )}
      </section>
    </>
  )
}
