/**
 * @file page.tsx
 * @description Senator comparison page — compare up to 3 senators side by side.
 *
 * URL structure: /senado/comparar?ids=4981,5012,945&ano=2025
 * - `ids`: comma-separated senator IDs (2-3 required for comparison)
 * - `ano`: reference year for CEAPS, voting, and attendance data
 *
 * The URL is shareable — opening the link loads the same comparison.
 *
 * Data sources:
 * - getSenatorsList                  — full list for picker autocomplete
 * - getSenatorDetail                 — detail per selected senator
 * - getSenatorExpenses               — CEAPS reimbursements per year
 * - getSenatorVotingHistory          — recorded votes per year
 * - getSenatorCommittees             — committee memberships
 * - getSenatorPropositions           — authored matters per year
 * - getSenatorAttendanceDetail       — plenary attendance per year
 */

import Link from "next/link"
import Image from "next/image"
import {
  SectionHeader, ToastTrigger, DataFetchError,
} from "@/components/ui"
import {
  getSenatorsList,
  getSenatorDetail,
  getSenatorExpenses,
  getSenatorVotingHistory,
  getSenatorCommittees,
  getSenatorPropositions,
  getSenatorAttendanceDetail,
} from "@imposterio/fetchers"
import type {
  SenatorExpense,
  SenatorVotingRecord,
  SenatorCommittee,
  SenatorAttendanceDetail,
  Proposition,
} from "@imposterio/types"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { ComparisonControls } from "./ComparisonControls"
import { ComparisonCharts } from "./ComparisonCharts"
import {
  computeSenatorMetrics,
  mergeMonthlyExpenses,
  mergeMonthlyVotes,
  mergeExpenseCategories,
  type SenatorMetrics,
} from "./comparison-utils"

/** Senate CEAPS data has reliable per-senator coverage from 2009 onward. */
const FIRST_CEAPS_YEAR = 2009

interface PageProps {
  searchParams: Promise<{ ids?: string; ano?: string }>
}

export default async function ComparisonPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_CEAPS_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAPS_YEAR + 1 },
    (_, i) => now - i,
  )

  const requestedIds = (query.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  const errors: PageError[] = []
  const failed = new Set<string>()

  const allSenators = await collectErrors(
    () => getSenatorsList(),
    emptySourced([]),
    errors,
    "Lista de senadores",
    failed,
  )

  const senatorOptions = allSenators.map((s) => ({
    id: s.id,
    name: s.name,
    party: s.party,
    uf: s.uf,
    photoUrl: s.photoUrl,
  }))

  const senatorResults = await Promise.all(
    requestedIds.map(async (id) => {
      let detail
      try {
        detail = await getSenatorDetail(id)
      } catch {
        return null
      }

      const localErrors: PageError[] = []
      const localFailed = new Set<string>()
      const authorFallback = { name: detail.name, party: detail.party }
      const [expenses, votes, committees, propositions, attendance] = await Promise.all([
        collectErrors(
          () => getSenatorExpenses(id, selectedYear),
          emptySourced<SenatorExpense[]>([]),
          localErrors,
          `CEAPS (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getSenatorVotingHistory(id, selectedYear),
          emptySourced<SenatorVotingRecord[]>([]),
          localErrors,
          `Votações (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getSenatorCommittees(id),
          emptySourced<SenatorCommittee[]>([]),
          localErrors,
          `Comissões (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getSenatorPropositions(id, authorFallback, selectedYear),
          emptySourced<Proposition[]>([]),
          localErrors,
          `Proposições (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getSenatorAttendanceDetail(id, selectedYear),
          emptySourced<SenatorAttendanceDetail>({
            senatorId: id,
            year: selectedYear,
            sessions: [],
            totalDeliberative: 0,
            attended: 0,
            missed: 0,
            percentage: 0,
          }),
          localErrors,
          `Presença (${detail.name})`,
          localFailed,
        ),
      ])

      errors.push(...localErrors)
      for (const l of localFailed) failed.add(l)

      return { detail, expenses, votes, committees, propositions, attendance }
    }),
  )

  const validSenators = senatorResults.filter(Boolean) as Array<{
    detail: Awaited<ReturnType<typeof getSenatorDetail>>
    expenses: Awaited<ReturnType<typeof getSenatorExpenses>>
    votes: Awaited<ReturnType<typeof getSenatorVotingHistory>>
    committees: Awaited<ReturnType<typeof getSenatorCommittees>>
    propositions: Awaited<ReturnType<typeof getSenatorPropositions>>
    attendance: Awaited<ReturnType<typeof getSenatorAttendanceDetail>>
  }>

  const validIds = validSenators.map((s) => s.detail.id)

  const metrics: SenatorMetrics[] = validSenators.map((s) =>
    computeSenatorMetrics(
      s.detail.id,
      s.detail.name,
      s.detail.party,
      s.detail.uf,
      s.detail.photoUrl,
      s.detail._source,
      s.expenses,
      s.votes,
      s.committees,
      s.propositions,
      s.attendance,
    ),
  )

  const monthlyExpenseData = mergeMonthlyExpenses(
    validSenators.map((s) => ({ name: s.detail.name, expenses: s.expenses })),
  )
  const monthlyVoteData = mergeMonthlyVotes(
    validSenators.map((s) => ({ name: s.detail.name, votes: s.votes })),
  )
  const expenseCategoryData = mergeExpenseCategories(
    validSenators.map((s) => ({ name: s.detail.name, expenses: s.expenses })),
  )

  const hasComparison = validSenators.length >= 2
  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <ComparisonControls
        allSenators={senatorOptions}
        selectedIds={validIds}
        years={availableYears}
        selectedYear={selectedYear}
      />

      {failed.has("Lista de senadores") && (
        <DataFetchError label="a lista de senadores" />
      )}

      {!failed.has("Lista de senadores") && failed.size > 0 && (
        <DataFetchError label="os dados de um ou mais senadores selecionados" />
      )}

      {hasComparison && !failed.has("Lista de senadores") && (
        <>
          <section className="mb-12">
            <SectionHeader title="Resumo comparativo" />
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[480px] border-collapse sm:table-fixed">
                <colgroup>
                  <col className="w-[120px] sm:w-[160px]" />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Métrica
                    </th>
                    {metrics.map((m) => (
                      <th key={m.id} className="py-3 px-4 text-center">
                        <Link
                          href={`/senado/${m.id}?ano=${selectedYear}`}
                          prefetch={false}
                          className="group inline-flex flex-col items-center gap-2"
                        >
                          {m.photoUrl ? (
                            <Image
                              src={m.photoUrl}
                              alt={m.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-full bg-gray-100 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                              {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-accent transition-colors">
                              {m.name}
                            </p>
                            <p className="text-xs text-gray-500">{m.party} · {m.uf}</p>
                          </div>
                        </Link>
                      </th>
                    ))}
                    {Array.from({ length: 3 - metrics.length }, (_, i) => (
                      <th key={`empty-${i}`} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <ComparisonRow
                    label="Total CEAPS"
                    values={metrics.map((m) => fmt(m.totalCeaps))}
                    highlight="lowest"
                    rawValues={metrics.map((m) => m.totalCeaps)}
                    tooltip="Cota para o Exercício da Atividade Parlamentar dos Senadores — total reembolsado no ano. Menor valor é destacado."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votações"
                    values={metrics.map((m) => String(m.voteCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.voteCount)}
                    tooltip="Sessões de votação nominal em que o senador registrou voto no ano."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votos Sim"
                    values={metrics.map((m) => String(m.simCount))}
                    tooltip="Quantidade de votos favoráveis registrados nas votações nominais."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votos Não"
                    values={metrics.map((m) => String(m.naoCount))}
                    tooltip="Quantidade de votos contrários registrados nas votações nominais."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Abstenções"
                    values={metrics.map((m) => String(m.abstCount))}
                    tooltip="Quantidade de abstenções registradas nas votações nominais."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Alinhamento"
                    values={metrics.map((m) => `${m.alignment}%`)}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.alignment)}
                    tooltip="Frequência com que o senador votou no lado vencedor — 'Sim' em aprovadas e 'Não' em rejeitadas."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Comissões ativas"
                    values={metrics.map((m) => String(m.committeeCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.committeeCount)}
                    tooltip="Comissões em que o senador atua como titular ou suplente atualmente."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Proposições"
                    values={metrics.map((m) => String(m.propositionCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.propositionCount)}
                    tooltip="Matérias das quais o senador é autor ou coautor no ano."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Sessões plenárias"
                    values={metrics.map((m) => String(m.plenaryAttended))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.plenaryAttended)}
                    tooltip="Sessões plenárias deliberativas em que o senador registrou presença."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Presença plenária"
                    values={metrics.map((m) => `${m.attendancePercent}%`)}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.attendancePercent)}
                    tooltip="Comparecimentos em sessões deliberativas dividido pelo total de sessões deliberativas no ano."
                    totalSlots={3}
                  />
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Visualizações comparativas" />
            <ComparisonCharts
              metrics={metrics}
              monthlyExpenses={monthlyExpenseData}
              monthlyVotes={monthlyVoteData}
              expenseCategories={expenseCategoryData}
              expenseSourceUrl={validSenators[0].expenses._source}
              votesSourceUrl={validSenators[0].votes._source}
            />
          </section>
        </>
      )}
    </>
  )
}

function ComparisonRow({
  label,
  values,
  highlight,
  rawValues,
  tooltip,
  totalSlots = 3,
}: {
  label: string
  values: string[]
  highlight?: "highest" | "lowest"
  rawValues?: number[]
  tooltip?: string
  totalSlots?: number
}) {
  const bestIndices = new Set<number>()
  if (highlight && rawValues && rawValues.length > 0) {
    const bestValue = highlight === "highest"
      ? Math.max(...rawValues)
      : Math.min(...rawValues)
    for (let i = 0; i < rawValues.length; i++) {
      if (rawValues[i] === bestValue) bestIndices.add(i)
    }
  }

  return (
    <tr>
      <td className="py-3 pr-4 text-sm font-medium text-gray-600">
        {tooltip ? (
          <span className="group relative inline-flex items-center gap-1">
            {label}
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500 cursor-help">?</span>
            <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        ) : label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-3 px-4 text-center text-sm font-semibold ${
            bestIndices.has(i) ? "text-emerald-600" : "text-gray-900"
          }`}
        >
          {v}
          {bestIndices.has(i) && (
            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </td>
      ))}
      {Array.from({ length: totalSlots - values.length }, (_, i) => (
        <td key={`pad-${i}`} />
      ))}
    </tr>
  )
}
