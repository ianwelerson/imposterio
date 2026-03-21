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
  StatCard, SectionHeader, Badge, SourcePill, ToastTrigger,
} from "@/components/ui"
import {
  getDeputiesList,
  getDeputyDetail,
  getDeputyExpenses,
  getDeputyVotingHistory,
  getDeputyCaucuses,
  getDeputyCommittees,
  getDeputyEvents,
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

  // Always fetch the full deputies list for the picker autocomplete
  const allDeputies = await collectErrors(
    () => getDeputiesList(),
    emptySourced([]),
    errors,
    "Lista de deputados",
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
      const [expenses, votes, caucuses, committees, events] = await Promise.all([
        collectErrors(
          () => getDeputyExpenses(id, selectedYear),
          emptySourced([]),
          localErrors,
          `Despesas (${detail.name})`,
        ),
        collectErrors(
          () => getDeputyVotingHistory(id, yearStart, yearEnd),
          emptySourced([]),
          localErrors,
          `Votações (${detail.name})`,
        ),
        collectErrors(
          () => getDeputyCaucuses(id),
          emptySourced([]),
          localErrors,
          `Frentes (${detail.name})`,
        ),
        collectErrors(
          () => getDeputyCommittees(id),
          emptySourced([]),
          localErrors,
          `Comissões (${detail.name})`,
        ),
        collectErrors(
          () => getDeputyEvents(id, yearStart, yearEnd),
          emptySourced([]),
          localErrors,
          `Eventos (${detail.name})`,
        ),
      ])

      // Collect sub-errors into main array
      errors.push(...localErrors)

      return { detail, expenses, votes, caucuses, committees, events }
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

      {/* Comparison content — only shown with 2+ deputies */}
      {hasComparison && (
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
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votações"
                    values={metrics.map((m) => String(m.voteCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.voteCount)}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votos Sim"
                    values={metrics.map((m) => String(m.simCount))}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Votos Não"
                    values={metrics.map((m) => String(m.naoCount))}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Abstenções"
                    values={metrics.map((m) => String(m.abstCount))}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Alinhamento"
                    values={metrics.map((m) => `${m.alignment}%`)}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.alignment)}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Frentes parlamentares"
                    values={metrics.map((m) => String(m.caucusCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.caucusCount)}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Comissões ativas"
                    values={metrics.map((m) => String(m.committeeCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.committeeCount)}
                    totalSlots={3}
                  />
                  <ComparisonRow
                    label="Eventos"
                    values={metrics.map((m) => String(m.eventCount))}
                    highlight="highest"
                    rawValues={metrics.map((m) => m.eventCount)}
                    totalSlots={3}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* Charts */}
          <section className="mb-12">
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
  totalSlots = 3,
}: {
  label: string
  values: string[]
  highlight?: "highest" | "lowest"
  rawValues?: number[]
  /** Always render this many value columns to keep alignment with the picker grid. */
  totalSlots?: number
}) {
  let bestIndex = -1
  if (highlight && rawValues && rawValues.length > 0) {
    if (highlight === "highest") {
      bestIndex = rawValues.indexOf(Math.max(...rawValues))
    } else {
      bestIndex = rawValues.indexOf(Math.min(...rawValues))
    }
  }

  return (
    <tr>
      <td className="py-3 pr-4 text-sm font-medium text-gray-600">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-3 px-4 text-center text-sm font-semibold ${
            i === bestIndex ? "text-emerald-600" : "text-gray-900"
          }`}
        >
          {v}
          {i === bestIndex && (
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
