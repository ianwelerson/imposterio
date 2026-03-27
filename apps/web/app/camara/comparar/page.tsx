/**
 * @file page.tsx
 * @description Deputy comparison page — compare up to 3 deputies side by side.
 *
 * URL structure: /camara/comparar?ids=204554,178957,220593&ano=2025
 * - `ids`: comma-separated deputy IDs (2-3 required for comparison)
 * - `ano`: reference year for expense and voting data
 *
 * The URL is shareable — opening the link loads the same comparison.
 *
 * Data sources:
 * - GET /deputados           — full list for search autocomplete
 * - GET /deputados/{id}      — detail for each selected deputy
 * - GET /deputados/{id}/despesas — CEAP expenses per deputy per year
 * - GET /votacoes + /votos   — voting history via composite fetcher
 * - GET /deputados/{id}/frentes — parliamentary caucuses
 * - GET /deputados/{id}/orgaos  — committee memberships
 * - GET /deputados/{id}/eventos — events attended
 */

import Link from "next/link"
import Image from "next/image"
import {
  StatCard, SectionHeader, Badge, SourcePill, ToastTrigger, DataFetchError,
} from "@/components/ui"
import {
  getDeputiesList,
  getDeputyDetail,
  getDeputyExpenses,
  getDeputyVotingHistory,
  getDeputyCaucuses,
  getDeputyCommittees,
  getDeputyEvents,
  getDeputyStaffCount,
  getDeputyAttendanceDetail,
} from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { ComparisonControls } from "./ComparisonControls"
import { ComparisonCharts } from "./ComparisonCharts"
import {
  computeDeputyMetrics,
  mergeMonthlyExpenses,
  mergeMonthlyVotes,
  mergeExpenseCategories,
  type DeputyMetrics,
} from "./comparison-utils"
import { filterPlenarySessions } from "@/app/camara/[id]/presenca/attendance-utils"

/** CEAP data is available from 2008 onward. */
const FIRST_CEAP_YEAR = 2008

interface PageProps {
  searchParams: Promise<{ ids?: string; ano?: string }>
}

export default async function ComparisonPage({ searchParams }: PageProps) {
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_CEAP_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAP_YEAR + 1 },
    (_, i) => now - i,
  )

  const yearStart = `${selectedYear}-01-01`
  const yearEnd = `${selectedYear}-12-31`

  // Parse IDs from URL, cap at 3
  const requestedIds = (query.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  const errors: PageError[] = []
  const failed = new Set<string>()

  // Always fetch the full deputies list for the picker autocomplete
  const allDeputies = await collectErrors(
    () => getDeputiesList(),
    emptySourced([]),
    errors,
    "Lista de deputados",
    failed,
  )

  // Picker-friendly list (minimal fields)
  const deputyOptions = allDeputies.map((d) => ({
    id: d.id,
    name: d.name,
    party: d.party,
    uf: d.uf,
    photoUrl: d.photoUrl,
  }))

  // Fetch data for each selected deputy
  const deputyResults = await Promise.all(
    requestedIds.map(async (id) => {
      let detail
      try {
        detail = await getDeputyDetail(id)
      } catch {
        // Invalid ID — skip this deputy silently
        return null
      }

      const localErrors: PageError[] = []
      const localFailed = new Set<string>()
      const [expenses, votes, caucuses, committees, events, staffCount, attendanceDetail] = await Promise.all([
        collectErrors(
          () => getDeputyExpenses(id, selectedYear),
          emptySourced([]),
          localErrors,
          `Despesas (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyVotingHistory(id, yearStart, yearEnd),
          emptySourced([]),
          localErrors,
          `Votações (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyCaucuses(id),
          emptySourced([]),
          localErrors,
          `Frentes (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyCommittees(id),
          emptySourced([]),
          localErrors,
          `Comissões (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyEvents(id, yearStart, yearEnd),
          emptySourced([]),
          localErrors,
          `Eventos (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyStaffCount(id),
          emptySourced({ count: 0, members: [] }),
          localErrors,
          `Funcionários (${detail.name})`,
          localFailed,
        ),
        collectErrors(
          () => getDeputyAttendanceDetail(id, selectedYear),
          emptySourced([]),
          localErrors,
          `Presença (${detail.name})`,
          localFailed,
        ),
      ])

      // Collect sub-errors and failed labels into main sets
      errors.push(...localErrors)
      for (const l of localFailed) failed.add(l)

      return { detail, expenses, votes, caucuses, committees, events, staffCount, attendanceDetail }
    }),
  )

  // Filter out failed deputies (null results from invalid IDs)
  const validDeputies = deputyResults.filter(Boolean) as Array<{
    detail: Awaited<ReturnType<typeof getDeputyDetail>>
    expenses: Awaited<ReturnType<typeof getDeputyExpenses>>
    votes: Awaited<ReturnType<typeof getDeputyVotingHistory>>
    caucuses: Awaited<ReturnType<typeof getDeputyCaucuses>>
    committees: Awaited<ReturnType<typeof getDeputyCommittees>>
    events: Awaited<ReturnType<typeof getDeputyEvents>>
    staffCount: Awaited<ReturnType<typeof getDeputyStaffCount>>
    attendanceDetail: Awaited<ReturnType<typeof getDeputyAttendanceDetail>>
  }>

  const validIds = validDeputies.map((d) => d.detail.id)

  // Compute metrics for each deputy
  const metrics: DeputyMetrics[] = validDeputies.map((d) =>
    computeDeputyMetrics(
      d.detail.id,
      d.detail.name,
      d.detail.party,
      d.detail.uf,
      d.detail.photoUrl,
      d.detail._source,
      d.expenses,
      d.votes,
      d.caucuses,
      d.committees,
      d.events,
      d.staffCount.count,
      filterPlenarySessions(d.attendanceDetail).length,
    ),
  )

  // Merge monthly data for multi-series charts
  const monthlyExpenseData = mergeMonthlyExpenses(
    validDeputies.map((d) => ({ name: d.detail.name, expenses: d.expenses })),
  )
  const monthlyVoteData = mergeMonthlyVotes(
    validDeputies.map((d) => ({ name: d.detail.name, votes: d.votes })),
  )

  // Merge expense categories for grouped bar comparison
  const expenseCategoryData = mergeExpenseCategories(
    validDeputies.map((d) => ({ name: d.detail.name, expenses: d.expenses })),
  )

  const hasComparison = validDeputies.length >= 2

  // Format currency helper
  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Column count for proper table alignment (label column + deputy columns)
  const deputyCount = metrics.length

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Header + year selector + deputy picker — shared loading state */}
      <ComparisonControls
        allDeputies={deputyOptions}
        selectedIds={validIds}
        years={availableYears}
        selectedYear={selectedYear}
      />

      {/* Inline error when the deputies list failed to load */}
      {failed.has("Lista de deputados") && (
        <DataFetchError label="a lista de deputados" />
      )}

      {/* Inline error when any per-deputy fetch failed */}
      {!failed.has("Lista de deputados") && failed.size > 0 && (
        <DataFetchError label="os dados de um ou mais deputados selecionados" />
      )}

      {/* Comparison content — only shown with 2+ deputies */}
      {hasComparison && !failed.has("Lista de deputados") && (
        <>
          {/* Summary comparison table */}
          <section className="mb-12">
            <SectionHeader title="Resumo comparativo" />
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              {/* Always 4 columns: 1 label + 3 deputy slots, matching the picker grid */}
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
                          href={`/camara/${m.id}?ano=${selectedYear}`}
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
                    {/* Pad empty header cells to always fill 3 deputy columns */}
                    {Array.from({ length: 3 - metrics.length }, (_, i) => (
                      <th key={`empty-${i}`} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <ComparisonRow
                    label="Total CEAP"
                    values={metrics.map((m) => fmt(m.totalCeap))}
                    highlight="lowest"
                    rawValues={metrics.map((m) => m.totalCeap)}
                    tooltip="Cota para Exercício da Atividade Parlamentar — total gasto no ano. Menor valor é destacado."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votações"
                    values={metrics.map((m) => String(m.voteCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.voteCount)}
                    tooltip="Sessões de votação nominal em que o deputado registrou voto no ano."
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
                    tooltip="Frequência com que o deputado votou no lado vencedor — 'Sim' em aprovadas e 'Não' em rejeitadas."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Frentes parlamentares"
                    values={metrics.map((m) => String(m.caucusCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.caucusCount)}
                    tooltip="Grupos suprapartidários em torno de interesses comuns (agropecuária, direitos humanos, etc)."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Comissões ativas"
                    values={metrics.map((m) => String(m.committeeCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.committeeCount)}
                    tooltip="Comissões em que o deputado atua como titular ou suplente atualmente."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Eventos"
                    values={metrics.map((m) => String(m.eventCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.eventCount)}
                    tooltip="Sessões, audiências e reuniões em que o deputado participou ou está convocado no ano."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Sessões plenárias"
                    values={metrics.map((m) => String(m.plenaryCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.plenaryCount)}
                    tooltip="Sessões Deliberativas, Solenes e Preparatórias em que o deputado registrou presença."
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Funcionários"
                    values={metrics.map((m) => String(m.staffCount))}
                    tooltip="Secretários parlamentares e demais funcionários vinculados ao gabinete."
                    totalSlots={3}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* Charts */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Visualizações comparativas" />
            <ComparisonCharts
              metrics={metrics}
              monthlyExpenses={monthlyExpenseData}
              monthlyVotes={monthlyVoteData}
              expenseCategories={expenseCategoryData}
              expenseSourceUrl={validDeputies[0].expenses._source}
              votesSourceUrl={validDeputies[0].votes._source}
            />
          </section>
        </>
      )}
    </>
  )
}

/**
 * A single row in the comparison table.
 * Optionally highlights the best value (lowest for spending, highest for activity).
 */
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
  /** Tooltip explaining the metric. */
  tooltip?: string
  /** Always render this many value columns to keep alignment with the picker grid. */
  totalSlots?: number
}) {
  // Determine which indices have the best value (supports ties)
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
      {/* Pad empty cells so the table always has the same number of columns */}
      {Array.from({ length: totalSlots - values.length }, (_, i) => (
        <td key={`pad-${i}`} />
      ))}
    </tr>
  )
}
