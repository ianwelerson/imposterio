/**
 * @file page.tsx
 * @description Individual deputy detail page — structured overview.
 *
 * Organized into clearly defined sections, each with a title, subtitle,
 * key metrics (StatCards), charts, and a link to the full listing page.
 * A global year selector (URL-driven via ?ano=YYYY) filters all sections.
 *
 * Sections:
 * 1. Profile header — photo, name, party, state, status
 * 2. Dados pessoais — biographical info panel (incl. professions)
 * 3. Resumo geral — overview StatCards across all data types
 * 4. Alertas — red flags card (CEAP recess spending, supplier concentration, etc.)
 * 5. Custo Real do Mandato — total taxpayer cost index
 * 6. Gastos CEAP — expense charts + map view + link to full expenses listing
 * 7. Verba de Gabinete — office spending charts
 * 8. Proposições — authored legislation, efficiency score, charts + table
 * 9. Votações — voting history charts + alignment stats
 * 10. Presença — unified attendance: events, plenary, daily activity, hours/week
 * 11. Discursos — speech charts + link to speeches listing
 * 12. Comissões — committee charts + link to committees listing
 * 13. Frentes parlamentares — enriched caucus details with member lists
 * 14. Carreira política — mandates, occupations, leadership, status history
 *
 * Data sources: 18+ parallel API calls to the Câmara dos Deputados API.
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import {
  Acronym, StatCard, SectionHeader,
  ProfileHeader, InfoPanel, Badge, ToastTrigger, DataFetchError,
} from "@/components/ui"
import {
  getDeputyDetail, getDeputyExpenses,
  getDeputyCommittees, getDeputyCaucuses,
  getDeputySpeeches, getDeputyEvents,
  getDeputyPreviousMandates, getDeputyHistory, getDeputyProfessions,
  getDeputyVotingHistory,
  getDeputyAttendanceBulk,
  getDeputyAttendanceDetail,
  getDeputyStaffCount,
  getDeputadoProposicoes,
  getDeputadoProposicoesByYear,
  getDeputadoOcupacoes,
  getDeputadoMandatos,
  getFrenteDetail,
  getCeapBulkSummary,
} from "@imposterio/fetchers"
import { getEntityVoteStats, ensureGameCards } from "@imposterio/db/queries/game"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { getVerbaGabinete } from "@/lib/scrapers/verba-gabinete"
import { analyzeAbsenceCeap } from "@/lib/analysis/absence-ceap"
import { analyzeCeapConcentration } from "@/lib/analysis/ceap-concentration"
import { analyzeVotingAlignment } from "@/lib/analysis/voting-alignment"
import { analyzeLegislativeEfficiency } from "@/lib/analysis/legislative-efficiency"
import { computeRealMandateCost } from "@/lib/analysis/real-mandate-cost"
import { VERBA_DE_GABINETE_TOTAL } from "@/lib/constants/camara"
import { analyzeCeapUtilization } from "@/lib/analysis/ceap-utilization"
import { computeCeapRanking } from "@/lib/analysis/ceap-ranking"
import { computeCeapBenchmarks, computeAttendanceBenchmark } from "@/lib/analysis/national-benchmarks"
import { CompareButton } from "./CompareButton"
import { DeputyExpenseCharts } from "./DeputyExpenseCharts"
import { SpeechCharts, CommitteeCharts, VotingCharts } from "./DeputyOverviewCharts"
import { AttendanceOverviewCharts } from "./AttendanceOverviewCharts"
import { YearSelector } from "./YearSelector"
import { RedFlagsCard, type RedFlag } from "./RedFlagsCard"
import { RealMandateCostCard } from "./RealMandateCostCard"
import { PropositionSection } from "./PropositionSection"
import { CaucusDetailSection } from "./CaucusDetailSection"
import { SectionNav } from "./SectionNav"
import { ExpenseMapSection } from "./ExpenseMapSection"
import { KeywordTagCloud } from "./KeywordTagCloud"
import {
  aggregateByMonth,
  aggregateByCategory,
  aggregateBySupplier,
  monthlyToBarData,
  aggregateByDay,
  aggregateCategoryBySupplier,
} from "./expense-utils"
import {
  aggregateSpeechesByType,
  aggregateSpeechesByMonth,
  aggregateEventsByMonth,
  aggregateCommitteesByRole,
  aggregateCommitteesByType,
  aggregateVotesByType,
  aggregateVotesByMonth,
  computeVoteAlignment,
  aggregateSpeechKeywords,
} from "./activity-utils"
import {
  aggregatePropositionsByType,
  aggregatePropositionsByYear,
} from "./proposition-utils"
import {
  filterPlenarySessions,
  isPlenarySession,
  aggregateByDay as aggregateAttendanceByDay,
  aggregateByEventType,
  countActiveDays,
  aggregateHoursPerWeek,
} from "./presenca/attendance-utils"
import { getRecessDaysForYear } from "@/lib/constants/camara-calendar"
import { computeLongestAbsenceStreak } from "./presenca/absence-streaks"

/** CEAP data is available from 2008 onward. */
const FIRST_CEAP_YEAR = 2008

interface DeputyDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function DeputyDetailPage({ params, searchParams }: DeputyDetailPageProps) {
  console.log(`[PAGE RENDER] /camara/[id] - ${new Date().toISOString()}`)
  const { id } = await params
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
  const recessDays = getRecessDaysForYear(selectedYear)

  // Deputy detail is critical — 404 if not found
  let deputy
  try {
    deputy = await getDeputyDetail(id)
  } catch {
    notFound()
  }

  // Fire-and-forget: ensure game cards exist for this deputy.
  // Runs in background — does not block page rendering.
  void ensureGameCards("camara", id)

  // All other calls degrade gracefully — errors are collected and shown as toasts
  const errors: PageError[] = []
  const failed = new Set<string>()

  const [
    expenses, prevYearExpenses,
    committees, caucuses,
    speeches, events,
    previousMandates, history, professions,
    votingHistory,
    attendance,
    attendanceDetail,
    staffCount,
    gameStats,
    verbaGabinete,
    propositionsYearly,
    propositionsAll,
    occupations,
    camaraMandates,
    ceapBulk,
    priorYearVotingHistory,
  ] = await Promise.all([
    collectErrors(() => getDeputyExpenses(id, selectedYear), emptySourced([]), errors, "Despesas CEAP", failed),
    collectErrors(() => getDeputyExpenses(id, selectedYear - 1), emptySourced([]), errors, `Despesas CEAP (${selectedYear - 1})`, failed),
    collectErrors(() => getDeputyCommittees(id), emptySourced([]), errors, "Comissões", failed),
    collectErrors(() => getDeputyCaucuses(id), emptySourced([]), errors, "Frentes parlamentares", failed),
    collectErrors(() => getDeputySpeeches(id, yearStart, yearEnd), emptySourced([]), errors, "Discursos", failed),
    collectErrors(() => getDeputyEvents(id, yearStart, yearEnd), emptySourced([]), errors, "Eventos", failed),
    collectErrors(() => getDeputyPreviousMandates(id), emptySourced([]), errors, "Mandatos anteriores", failed),
    collectErrors(() => getDeputyHistory(id), emptySourced([]), errors, "Histórico de status", failed),
    collectErrors(() => getDeputyProfessions(id), emptySourced([]), errors, "Profissões", failed),
    collectErrors(() => getDeputyVotingHistory(id, yearStart, yearEnd), emptySourced([]), errors, "Votações", failed),
    collectErrors(() => getDeputyAttendanceBulk(selectedYear), emptySourced({ totalEvents: 0, totalPlenarySessions: 0, deputies: [] }), errors, "Presença", failed),
    collectErrors(() => getDeputyAttendanceDetail(id, selectedYear), emptySourced([]), errors, "Presença detalhada", failed),
    collectErrors(() => getDeputyStaffCount(id), emptySourced({ count: 0, members: [] }), errors, "Funcionários", failed),
    getEntityVoteStats("camara", id).catch(() => null),
    collectErrors(() => getVerbaGabinete(id, selectedYear), { deputadoId: id, year: selectedYear, totalSpent: 0, _source: "" }, errors, "Verba de Gabinete", failed),
    collectErrors(() => getDeputadoProposicoesByYear(id, selectedYear), emptySourced([]), errors, "Proposições (ano)", failed),
    collectErrors(() => getDeputadoProposicoes(id), emptySourced([]), errors, "Proposições", failed),
    collectErrors(() => getDeputadoOcupacoes(id), emptySourced([]), errors, "Ocupações", failed),
    getDeputadoMandatos(id).catch(() => null),
    collectErrors(() => getCeapBulkSummary(selectedYear), emptySourced({ deputies: [] }), errors, "CEAP Bulk", failed),
    collectErrors(() => getDeputyVotingHistory(id, `${selectedYear - 1}-01-01`, `${selectedYear - 1}-12-31`), emptySourced([]), errors, `Votações (${selectedYear - 1})`, failed),
  ])

  // ── Post-Promise.all dependent fetches ────────────────────────────
  // Voting alignment needs resolved votingHistory and deputy.party
  const votingAlignmentResult = await collectErrors(
    () => analyzeVotingAlignment(votingHistory, deputy.party, 20, id, selectedYear),
    { partyAlignmentPercent: 0, winningSidePercent: 0, governmentAlignmentPercent: 0, totalVotes: 0, votesWithPartyData: 0, votesWithGovernmentData: 0, divergentVotes: [] },
    errors, "Alinhamento partidário", failed,
  )

  // Caucus details — fetch first 5 for enriched display
  const CAUCUS_DETAIL_LIMIT = 5
  const caucusDetailResults = await Promise.all(
    caucuses.slice(0, CAUCUS_DETAIL_LIMIT).map((c) =>
      getFrenteDetail(c.id).catch(() => null),
    ),
  )
  const caucusDetails = caucusDetailResults.filter(
    (d): d is NonNullable<typeof d> => d !== null,
  )

  // ── Profile data ────────────────────────────────────────────────────

  const initials = deputy.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")

  const tags = [
    deputy.party,
    deputy.uf,
    `${deputy.legislature}ª Legislatura`,
    deputy.situation ?? "Em exercício",
  ]

  const professionStr = professions.length > 0
    ? professions.map((p) => p.title).join(", ")
    : undefined

  const infoFields = [
    { label: "Nome civil", value: deputy.fullName },
    deputy.electoralName && deputy.electoralName !== deputy.name
      && { label: "Nome eleitoral", value: deputy.electoralName },
    deputy.birthDate && { label: "Data de nascimento", value: formatDate(deputy.birthDate) },
    deputy.birthPlace && { label: "Naturalidade", value: deputy.birthPlace },
    deputy.education && { label: "Escolaridade", value: deputy.education },
    professionStr && { label: "Profissões", value: professionStr },
    deputy.email && { label: "E-mail", value: deputy.email, href: `mailto:${deputy.email}` },
    deputy.office && { label: "Gabinete", value: deputy.office },
    deputy.phone && { label: "Telefone", value: deputy.phone },
  ].filter(Boolean) as Array<{ label: string; value: string; href?: string }>

  // ── Expense aggregations ────────────────────────────────────────────

  const totalCeap = expenses.reduce((sum, e) => sum + e.value, 0)
  const prevYearTotal = prevYearExpenses.reduce((sum, e) => sum + e.value, 0)
  const ceapVariation = prevYearTotal > 0
    ? ((totalCeap - prevYearTotal) / prevYearTotal) * 100
    : null

  const currentMonthly = aggregateByMonth(expenses)
  const prevYearMonthly = aggregateByMonth(prevYearExpenses)
  const byCategory = aggregateByCategory(expenses)
  const bySupplier = aggregateBySupplier(expenses)
  const monthlyBarData = monthlyToBarData(currentMonthly)
  const dailyExpenses = aggregateByDay(expenses)
  const categoryBySupplier = aggregateCategoryBySupplier(expenses)
  const ceapUtilization = analyzeCeapUtilization(currentMonthly)
  const ceapRanking = ceapBulk.deputies.length > 0
    ? computeCeapRanking(deputy.name, ceapBulk.deputies)
    : null
  const ceapBenchmark = ceapBulk.deputies.length > 0
    ? computeCeapBenchmarks(ceapBulk.deputies, totalCeap)
    : null

  // National average plenary attendance from bulk data — uses plenary sessions only
  // because plenary is where presence is civically expected (committee/hearings
  // run in parallel, inflating total event counts)
  const bulkPlenarySessions = attendance.totalPlenarySessions ?? 0
  const attendanceBenchmark = attendance.deputies.length > 0 && bulkPlenarySessions > 0
    ? computeAttendanceBenchmark(
        attendance.deputies.map((d) => ({
          attended: d.plenaryEventsAttended,
          total: bulkPlenarySessions,
        })),
      )
    : null

  // ── Verba de Gabinete aggregations ──────────────────────────────────
  const verbaAnnualCeiling = VERBA_DE_GABINETE_TOTAL * 12
  const verbaUtilization = verbaAnnualCeiling > 0
    ? ((verbaGabinete.totalSpent / verbaAnnualCeiling) * 100).toFixed(1)
    : "0"

  // ── Proposition aggregations ──────────────────────────────────────
  // Year-filtered propositions for StatCards + type chart
  const legislativeEfficiency = analyzeLegislativeEfficiency(propositionsYearly)
  const propositionsByType = aggregatePropositionsByType(propositionsYearly)
  // Full-mandate propositions for historical bar chart
  const propositionsByYear = aggregatePropositionsByYear(propositionsAll)

  // ── Real Mandate Cost ──────────────────────────────────────────────
  const isCurrentYear = selectedYear === new Date().getFullYear()
  // Count months with actual CEAP data (months with value > 0)
  const ceapMonthsCovered = currentMonthly.filter((m) => m.total > 0).length || (isCurrentYear ? 0 : 12)
  // Verba scraper returns annual total only — no monthly breakdown available
  const verbaMonthsCovered = verbaGabinete.totalSpent > 0 ? (isCurrentYear ? new Date().getMonth() : 12) : 0

  const mandateCost = computeRealMandateCost(
    selectedYear,
    totalCeap,
    verbaGabinete.totalSpent,
    staffCount.count,
    isCurrentYear,
    ceapMonthsCovered,
    verbaMonthsCovered,
    expenses._source ?? "",
    verbaGabinete._source ?? "",
  )

  // ── Activity aggregations ───────────────────────────────────────────

  const speechesByType = aggregateSpeechesByType(speeches)
  const speechesByMonth = aggregateSpeechesByMonth(speeches)
  const keywordFrequencies = aggregateSpeechKeywords(speeches, 30)
  const eventsByMonth = aggregateEventsByMonth(events)

  const activeCommittees = committees.filter((c) => !c.endDate)
  const committeesByRole = aggregateCommitteesByRole(activeCommittees)
  const committeesByType = aggregateCommitteesByType(activeCommittees)

  // ── Voting history aggregations ───────────────────────────────────
  const votesByType = aggregateVotesByType(votingHistory)
  const votesByMonth = aggregateVotesByMonth(votingHistory)
  const priorYearVotesByMonth = priorYearVotingHistory.length > 0
    ? aggregateVotesByMonth(priorYearVotingHistory)
    : undefined
  const voteAlignment = computeVoteAlignment(votingHistory)
  const simCount = votingHistory.filter((v) => v.vote === "Sim").length
  const naoCount = votingHistory.filter((v) => v.vote === "Não").length
  const abstCount = votingHistory.filter((v) => v.vote === "Abstenção").length

  // ── Attendance aggregations (unified Presença section) ────────────
  const totalPlenarySessions = attendance.totalPlenarySessions ?? 0
  const totalNonPlenarySessions = attendance.totalEvents - totalPlenarySessions

  // Plenary sessions this deputy attended (from detailed attendance data)
  const plenaryEvents = filterPlenarySessions(attendanceDetail)
  const plenaryAttended = plenaryEvents.length
  const nonPlenaryAttended = attendanceDetail.length - plenaryAttended
  const plenaryRate = totalPlenarySessions > 0
    ? ((plenaryAttended / totalPlenarySessions) * 100).toFixed(1)
    : null
  const nonPlenaryRate = totalNonPlenarySessions > 0
    ? ((nonPlenaryAttended / totalNonPlenarySessions) * 100).toFixed(1)
    : null

  // Event counts by status and type (for stat cards)
  const eventsFinished = events.filter((e) => e.status === "Encerrada").length
  // Chart data for unified Presença section
  const allByDay = aggregateAttendanceByDay(attendanceDetail)
  const plenaryByDay = aggregateAttendanceByDay(plenaryEvents)
  const nonPlenaryDetailEvents = attendanceDetail.filter((e) => !isPlenarySession(e.eventType))
  const nonPlenaryByDay = aggregateAttendanceByDay(nonPlenaryDetailEvents)
  const attendanceByType = aggregateByEventType(attendanceDetail)
  const activeDays = countActiveDays(attendanceDetail)
  const hoursPerWeek = aggregateHoursPerWeek(events, selectedYear)

  // Absence streak — uses the set of dates with any attendance
  const attendedDateSet = new Set(attendanceDetail.map((e) => e.date.slice(0, 10)))
  const longestAbsenceStreak = computeLongestAbsenceStreak(attendedDateSet, selectedYear)

  // ── Red flags ─────────────────────────────────────────────────────
  const absenceCeap = analyzeAbsenceCeap(expenses, events, expenses._source ?? "")
  const ceapConcentration = analyzeCeapConcentration(expenses)
  const plenaryRateNum = plenaryRate !== null ? parseFloat(plenaryRate) : 100

  const redFlags: RedFlag[] = []

  if (absenceCeap.flaggedDayCount > 0) {
    redFlags.push({
      id: "CEAP_RECESS_SPENDING",
      title: "Gastos sem presença",
      description: `${absenceCeap.flaggedDayCount} dia${absenceCeap.flaggedDayCount !== 1 ? "s" : ""} com despesas de deslocamento (${formatCurrency(absenceCeap.totalFlaggedAmount)}) sem presença registrada em plenário.`,
      anchorHref: "#gastos-ceap",
      severity: "amber",
    })
  }

  if (ceapConcentration && ceapConcentration.concentrationScore > 70) {
    redFlags.push({
      id: "CEAP_SUPPLIER_CONCENTRATION",
      title: "Concentração de fornecedor",
      description: `O fornecedor "${ceapConcentration.supplierName}" recebeu ${ceapConcentration.percentage.toFixed(0)}% do total de despesas CEAP.`,
      anchorHref: "#gastos-ceap",
      severity: "red",
    })
  }

  if (votingAlignmentResult.partyAlignmentPercent < 10 && votingAlignmentResult.votesWithPartyData > 5) {
    redFlags.push({
      id: "ZERO_PARTY_ALIGNMENT",
      title: "Baixo alinhamento partidário",
      description: `Votou com o próprio partido em apenas ${votingAlignmentResult.partyAlignmentPercent.toFixed(0)}% das votações analisadas.`,
      anchorHref: "#votacoes",
      severity: "amber",
    })
  }

  if (plenaryRateNum < 50 && totalPlenarySessions > 10) {
    redFlags.push({
      id: "LOW_ATTENDANCE",
      title: "Baixa presença plenária",
      description: `Presente em apenas ${plenaryRate}% das sessões plenárias (${plenaryAttended} de ${totalPlenarySessions}).`,
      anchorHref: "#presenca",
      severity: "red",
    })
  }

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* ── 1. Profile header ──────────────────────────────────────── */}
      <ProfileHeader
        initials={initials}
        name={deputy.name}
        tags={tags}
        sourceUrl={deputy._source}
        photoUrl={deputy.photoUrl}
        actions={
          <>
            <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-600">Ver dados de</span>
              <YearSelector years={availableYears} selected={selectedYear} />
            </div>
            <CompareButton deputyId={id} year={selectedYear} />
          </>
        }
      />

      <SectionNav />

      {/* ── 2. Dados pessoais ──────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* ── 3. Resumo geral ────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="resumo">
        <SectionHeader
          title="Resumo geral"
          description="Principais indicadores de atividade parlamentar no ano selecionado."
          accent="border-indigo-400"
        />
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          aria-label="Resumo"
        >
          <StatCard
            label="Despesas CEAP"
            value={formatCurrency(totalCeap)}
            tooltip="Cota para Exercício da Atividade Parlamentar — verba mensal para custear despesas do mandato."
          />
          <StatCard
            label="Discursos"
            value={String(speeches.length)}
            tooltip="Pronunciamentos realizados em plenário, comissões e outros eventos legislativos no ano selecionado."
          />
          <StatCard
            label="Votações"
            value={String(votingHistory.length)}
            tooltip="Sessões de votação nominal em que o deputado registrou voto no ano selecionado."
          />
          <StatCard
            label="Comissões ativas"
            value={String(activeCommittees.length)}
            tooltip="Comissões em que o deputado atua como titular ou suplente atualmente."
          />
          <StatCard
            label="Frentes"
            value={String(caucuses.length)}
            tooltip="Frentes parlamentares — grupos suprapartidários em torno de interesses comuns."
          />
          <StatCard
            label="Funcionários"
            value={String(staffCount.count)}
            tooltip="Secretários parlamentares e demais funcionários vinculados ao gabinete deste deputado."
            footer={staffCount.count > 0 ? (
              <Link
                href={`/camara/funcionarios/lista?parlamentar=${encodeURIComponent(staffCount.members[0]?.department ?? "")}`}
                className="inline-flex items-center rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
              >
                Ver todos
              </Link>
            ) : undefined}
          />
          <StatCard
            label="Dias com atividade"
            value={String(activeDays)}
            tooltip={`O deputado esteve presente em eventos da Câmara em ${activeDays} dias diferentes durante o ano.`}
          />
          <StatCard
            label="Presença plenária"
            value={plenaryRate !== null ? `${plenaryRate}%` : "—"}
            tooltip={`Presente em ${plenaryAttended} das ${totalPlenarySessions} sessões plenárias realizadas na Câmara no ano.`}
          />
          {gameStats && (
            <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
                  Acha Justo?
                  <span className="group relative">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-500 cursor-help">
                      ?
                    </span>
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      No jogo &quot;Acha Justo?&quot;, usuários avaliam dados reais de agentes públicos sem saber a identidade. Este é o resultado dos votos sobre este deputado.
                    </span>
                  </span>
                </p>
                <Link
                  href="/acha-justo/placar"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Ver placar →
                </Link>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-xl font-semibold tracking-tight text-emerald-600 sm:text-2xl">
                  {gameStats.fairVotes}
                </span>
                <span className="text-xs text-gray-400">justo</span>
                <span className="text-xl font-semibold tracking-tight text-red-600 sm:text-2xl">
                  {gameStats.totalVotes - gameStats.fairVotes}
                </span>
                <span className="text-xs text-gray-400">injusto</span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${gameStats.fairPercent}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${100 - gameStats.fairPercent}%` }}
                />
              </div>
            </article>
          )}
        </div>

        {/* Alertas de transparência — inline within Resumo Geral */}
        <RedFlagsCard flags={redFlags} />

        {/* Custo Real do Mandato — inline within Resumo Geral */}
        <div className="mt-4">
          <RealMandateCostCard result={mandateCost} />
        </div>
      </section>

      {/* ── 6. Gastos CEAP ─────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="gastos-ceap">
        <SectionHeader
          title={<>Gastos <Acronym title="Cota para Exercício da Atividade Parlamentar">CEAP</Acronym></>}
          description="Verba mensal que cada deputado recebe para custear despesas relacionadas ao mandato — passagens, combustível, hospedagem, alimentação, impressão, entre outros."
          action={{ label: "Ver todas as despesas", href: `/camara/${id}/despesas?ano=${selectedYear}` }}
          accent="border-amber-400"
        />

        {failed.has("Despesas CEAP") ? (
          <DataFetchError label="as despesas CEAP" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total"
                  value={formatCurrency(totalCeap)}
                  badge={ceapBenchmark ? {
                    text: `${ceapBenchmark.vsNationalPercent > 0 ? "+" : ""}${ceapBenchmark.vsNationalPercent.toFixed(0)}% vs média`,
                    variant: ceapBenchmark.vsNationalPercent > 20 ? "red" : ceapBenchmark.vsNationalPercent < -20 ? "green" : "amber",
                  } : ceapVariation !== null ? {
                    text: `${ceapVariation > 0 ? "+" : ""}${ceapVariation.toFixed(1)}% vs ${selectedYear - 1}`,
                    variant: ceapVariation > 5 ? "red" : ceapVariation < -5 ? "green" : "amber",
                  } : undefined}
                  tooltip={ceapBenchmark
                    ? `Média nacional: ${formatCurrency(ceapBenchmark.nationalAverage)}. Este deputado gastou ${Math.abs(ceapBenchmark.vsNationalPercent).toFixed(0)}% ${ceapBenchmark.vsNationalPercent >= 0 ? "acima" : "abaixo"} da média.`
                    : "Cota para Exercício da Atividade Parlamentar — total gasto no ano."
                  }
                />
                <StatCard
                  label={`Total (${selectedYear - 1})`}
                  value={formatCurrency(prevYearTotal)}
                />
                <StatCard
                  label="Registros"
                  value={String(expenses.length)}
                />
                <StatCard
                  label="Utilização CEAP"
                  value={`${ceapUtilization.averageUtilization}%`}
                  badge={ceapUtilization.overLimitMonths.length > 0 ? {
                    text: `${ceapUtilization.overLimitMonths.length} mês${ceapUtilization.overLimitMonths.length !== 1 ? "es" : ""} acima do teto`,
                    variant: "red",
                  } : undefined}
                  tooltip="Percentual médio de utilização da cota mensal CEAP nos meses com gastos."
                />
                {ceapRanking && (
                  <StatCard
                    label={`Rank no ${deputy.party}`}
                    value={`${ceapRanking.partyRank}º de ${ceapRanking.partyTotal}`}
                    tooltip={`Posição deste deputado em gastos CEAP entre os ${ceapRanking.partyTotal} deputados do ${deputy.party} no ano.`}
                  />
                )}
                {ceapRanking && (
                  <StatCard
                    label={`Rank em ${deputy.uf}`}
                    value={`${ceapRanking.ufRank}º de ${ceapRanking.ufTotal}`}
                    tooltip={`Posição deste deputado em gastos CEAP entre os ${ceapRanking.ufTotal} deputados de ${deputy.uf} no ano.`}
                  />
                )}
              </div>
            </div>

            {(expenses.length > 0 || prevYearExpenses.length > 0) && (
              <DeputyExpenseCharts
            selectedYearMonthly={currentMonthly}
            prevYearMonthly={prevYearMonthly}
            year={selectedYear}
            byCategory={byCategory}
            bySupplier={bySupplier}
            monthlyBarData={monthlyBarData}
            dailyExpenses={dailyExpenses}
            categoryBySupplier={categoryBySupplier}
            sourceUrl={expenses._source}
            recessDays={recessDays}
          />
        )}
            {/* Map / category view */}
            {expenses.length > 0 && (
              <div className="mt-6">
                <ExpenseMapSection
                  deputyUf={deputy.uf}
                  byCategory={byCategory}
                  sourceUrl={expenses._source}
                />
              </div>
            )}

            {/* CEAP vs Verba de Gabinete contextual note */}
            <p className="mt-4 text-xs text-gray-400">
              A CEAP (Cota para Exercício da Atividade Parlamentar) é a verba mensal de reembolso
              para despesas do mandato. Não confundir com a Verba de Gabinete, que custeia salários
              de funcionários e manutenção do gabinete parlamentar.
            </p>
          </>
        )}
      </section>

      {/* ── 7. Verba de Gabinete ─────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="verba-gabinete">
        <SectionHeader
          title="Verba de Gabinete"
          description="Verba mensal destinada ao pagamento de funcionários do gabinete parlamentar (secretários parlamentares) e demais despesas administrativas do gabinete. Não confundir com a CEAP."
          sourceUrl={verbaGabinete._source || undefined}
          accent="border-orange-400"
        />

        {failed.has("Verba de Gabinete") ? (
          <DataFetchError label="a Verba de Gabinete" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total gasto"
                  value={formatCurrency(verbaGabinete.totalSpent)}
                  tooltip="Total gasto com Verba de Gabinete no ano selecionado."
                />
                <StatCard
                  label="Teto anual"
                  value={formatCurrency(verbaAnnualCeiling)}
                  tooltip={`Teto mensal de ${formatCurrency(VERBA_DE_GABINETE_TOTAL)} × 12 meses.`}
                />
                <StatCard
                  label="Utilização"
                  value={`${verbaUtilization}%`}
                  badge={{
                    text: Number(verbaUtilization) > 90 ? "alto" : Number(verbaUtilization) > 60 ? "moderado" : "baixo",
                    variant: Number(verbaUtilization) > 90 ? "red" : Number(verbaUtilization) > 60 ? "amber" : "green",
                  }}
                  tooltip="Percentual do teto anual utilizado."
                />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-gray-400">
              Dados extraídos do Portal de Transparência da Câmara. Detalhamento mensal não disponível via API.
            </p>
          </>
        )}
      </section>

      {/* ── 8. Proposições ────────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="proposicoes">
        <SectionHeader
          title="Proposições"
          description={`Projetos de lei, PECs, requerimentos e outras proposições legislativas de autoria deste deputado em ${selectedYear}.`}
          sourceUrl={propositionsYearly._source || undefined}
          action={{ label: "Ver todas as proposições", href: `/camara/${id}/proposicoes` }}
          accent="border-purple-400"
        />

        {failed.has("Proposições (ano)") ? (
          <DataFetchError label="as proposições" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Total de autoria"
                  value={String(legislativeEfficiency.totalAuthored)}
                  tooltip={`Proposições legislativas de autoria deste deputado apresentadas em ${selectedYear}.`}
                />
                <StatCard
                  label="Aprovadas"
                  value={String(legislativeEfficiency.approved)}
                  badge={legislativeEfficiency.totalAuthored > 0 ? {
                    text: `${legislativeEfficiency.efficiencyScore.toFixed(0)}% eficiência`,
                    variant: legislativeEfficiency.efficiencyScore >= 10 ? "green" : "amber",
                  } : undefined}
                  tooltip={`Eficiência legislativa: proporção de proposições aprovadas sobre o total de autoria em ${selectedYear}. A média histórica da Câmara é de aproximadamente 5%.`}
                />
                <StatCard
                  label="Arquivadas/rejeitadas"
                  value={String(legislativeEfficiency.archivedOrRejected)}
                />
                <StatCard
                  label="Em tramitação"
                  value={String(legislativeEfficiency.pending)}
                />
              </div>
            </div>

            {propositionsYearly.length > 0 && (
              <PropositionSection
                byType={propositionsByType}
                byYear={propositionsByYear}
                sourceUrl={propositionsYearly._source ?? ""}
              />
            )}
          </>
        )}
      </section>

      {/* ── 9. Votações ────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="votacoes">
        <SectionHeader
          title="Votações"
          description="Participação em votações nominais em plenário. Indica como o deputado votou em cada sessão e se acompanhou o resultado final."
          action={{ label: "Ver todas as votações", href: `/camara/${id}/votacoes?ano=${selectedYear}` }}
          accent="border-blue-400"
        />

        {failed.has("Votações") ? (
          <DataFetchError label="as votações" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard
                  label="Votações"
                  value={String(votingHistory.length)}
                />
                <StatCard
                  label="Sim / Não / Abstenção"
                  value={`${simCount} / ${naoCount} / ${abstCount}`}
                />
                <StatCard
                  label="Alinhamento c/ resultado"
                  value={`${voteAlignment}%`}
                  badge={{ text: "com resultado", variant: voteAlignment >= 70 ? "green" : voteAlignment >= 40 ? "amber" : "red" }}
                  tooltip="Frequência com que o deputado votou no lado vencedor — 'Sim' em aprovadas e 'Não' em rejeitadas."
                />
                {votingAlignmentResult.votesWithPartyData > 0 && (
                  <StatCard
                    label="Alinhamento partidário"
                    value={`${votingAlignmentResult.partyAlignmentPercent}%`}
                    badge={{
                      text: `${votingAlignmentResult.votesWithPartyData} votações`,
                      variant: votingAlignmentResult.partyAlignmentPercent >= 70 ? "green" : votingAlignmentResult.partyAlignmentPercent >= 40 ? "amber" : "red",
                    }}
                    tooltip={`Frequência com que o deputado votou de acordo com a maioria do ${deputy.party}. Analisadas ${votingAlignmentResult.votesWithPartyData} sessões com dados do partido.`}
                  />
                )}
                {votingAlignmentResult.votesWithGovernmentData > 0 && (
                  <StatCard
                    label="Alinhamento c/ Governo"
                    value={`${votingAlignmentResult.governmentAlignmentPercent}%`}
                    badge={{
                      text: `${votingAlignmentResult.votesWithGovernmentData} votações`,
                      variant: votingAlignmentResult.governmentAlignmentPercent >= 70 ? "green" : votingAlignmentResult.governmentAlignmentPercent >= 40 ? "amber" : "red",
                    }}
                    tooltip={`Frequência com que o deputado votou de acordo com a orientação do Governo. Votações com orientação "Liberado" são consideradas alinhadas.`}
                  />
                )}
              </div>
            </div>

            {votingHistory.length > 0 && (
              <VotingCharts
                byType={votesByType}
                byMonth={votesByMonth}
                year={selectedYear}
                sourceUrl={votingHistory._source}
                priorYearByMonth={priorYearVotesByMonth}
                priorYear={selectedYear - 1}
              />
            )}
          </>
        )}
      </section>

      {/* ── 10. Presença ────────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="presenca">
        <SectionHeader
          title="Presença"
          description="Presença do deputado em todos os tipos de evento da Câmara no ano selecionado: sessões plenárias, comissões, audiências públicas, seminários, reuniões e outros."
          action={{ label: "Ver lista completa", href: `/camara/${id}/presenca?ano=${selectedYear}` }}
          accent="border-emerald-400"
        />

        {failed.has("Presença detalhada") || failed.has("Eventos") ? (
          <DataFetchError label="os dados de presença" />
        ) : (
          <>
            {/* Tier 1: Hero attendance card */}
            <div className="mb-4">
              <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Presença no Plenário
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {plenaryRate !== null ? `${plenaryRate}%` : "—"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Presente em {plenaryAttended} de {totalPlenarySessions} sessões plenárias realizadas
                </p>
                {attendanceBenchmark !== null && (
                  <p className="mt-1 text-xs text-gray-400">
                    Média nacional: {attendanceBenchmark}%
                  </p>
                )}
                {longestAbsenceStreak && (
                  <p className="mt-2 text-xs text-gray-400">
                    Maior ausência: {longestAbsenceStreak.days} dias úteis
                    ({new Date(longestAbsenceStreak.startDate + "T12:00:00").toLocaleDateString("pt-BR")} — {new Date(longestAbsenceStreak.endDate + "T12:00:00").toLocaleDateString("pt-BR")})
                  </p>
                )}
              </article>
            </div>

            {/* Tier 2: Supporting cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Dias com atividade"
                value={String(activeDays)}
                tooltip={`O deputado esteve presente em eventos da Câmara em ${activeDays} dias diferentes durante o ano.`}
              />
              <StatCard
                label="Total de eventos"
                value={String(events.length)}
                tooltip="Quantidade total de eventos em que o deputado participou ou está convocado no ano selecionado."
              />
              <StatCard
                label="Eventos concluídos"
                value={String(eventsFinished)}
                tooltip="Eventos que já foram realizados e encerrados."
              />
            </div>

            {(attendanceDetail.length > 0 || events.length > 0) && (
              <AttendanceOverviewCharts
            allByDay={allByDay}
            plenaryByDay={plenaryByDay}
            nonPlenaryByDay={nonPlenaryByDay}
            hoursPerWeek={hoursPerWeek}
            byType={attendanceByType}
            byMonth={eventsByMonth}
            year={selectedYear}
            sourceUrl={attendanceDetail._source}
            eventsSourceUrl={events._source}
            recessDays={recessDays}
          />
        )}
          </>
        )}
      </section>

      {/* ── 6. Discursos ───────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="discursos">
        <SectionHeader
          title="Discursos"
          description="Pronunciamentos realizados em plenário, comissões e outros eventos legislativos. Inclui discursos pela ordem, breves comunicações, grande expediente e outros tipos de manifestação."
          action={{ label: "Ver todos os discursos", href: `/camara/${id}/discursos?ano=${selectedYear}` }}
          accent="border-cyan-400"
        />

        {failed.has("Discursos") ? (
          <DataFetchError label="os discursos" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total"
                  value={String(speeches.length)}
                />
                <StatCard
                  label="Top palavra-chave"
                  value={keywordFrequencies[0]?.keyword ?? "—"}
                  badge={keywordFrequencies[0] ? {
                    text: `${keywordFrequencies[0].count}×`,
                    variant: "gray",
                  } : undefined}
                />
                {keywordFrequencies.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-xs font-medium text-gray-500">Palavras-chave mais citadas</p>
                    <KeywordTagCloud
                      keywords={keywordFrequencies}
                      deputyId={id}
                      year={selectedYear}
                    />
                  </div>
                )}
              </div>
            </div>

            {speeches.length > 0 && (
              <SpeechCharts
                byType={speechesByType}
                byMonth={speechesByMonth}
                year={selectedYear}
                sourceUrl={speeches._source}
              />
            )}
          </>
        )}
      </section>

      {/* ── 7. Comissões ───────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="comissoes">
        <SectionHeader
          title="Comissões"
          description="Órgãos colegiados onde proposições são analisadas antes da votação em plenário. Deputados atuam como titulares, suplentes ou em cargos de liderança (presidente, relator)."
          action={{ label: "Ver todas as comissões", href: `/camara/${id}/comissoes?ano=${selectedYear}` }}
          accent="border-rose-400"
        />

        {failed.has("Comissões") ? (
          <DataFetchError label="as comissões" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Ativas"
                  value={String(activeCommittees.length)}
                  badge={{ text: `de ${committees.length} total`, variant: "gray" }}
                />
                <StatCard
                  label="Titular em"
                  value={String(activeCommittees.filter((c) => c.role === "Titular").length)}
                  badge={{ text: "comissões", variant: "green" }}
                />
                <StatCard
                  label="Suplente em"
                  value={String(activeCommittees.filter((c) => c.role === "Suplente").length)}
                  badge={{ text: "comissões", variant: "gray" }}
                />
              </div>
            </div>

            {activeCommittees.length > 0 && (
              <CommitteeCharts
                byRole={committeesByRole}
                byType={committeesByType}
                sourceUrl={committees._source}
                committees={activeCommittees.map((c) => ({
                  name: c.name,
                  abbreviation: c.abbreviation,
                  role: c.role,
                  type: c.type,
                }))}
              />
            )}
          </>
        )}
      </section>

      {/* ── 13. Frentes parlamentares ──────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="frentes">
        <SectionHeader
          title="Frentes parlamentares"
          description="Grupos suprapartidários formados em torno de interesses comuns — agropecuária, direitos humanos, tecnologia, entre outros. Não possuem poder legislativo mas coordenam esforços e eventos."
          action={{ label: "Ver todas as frentes", href: `/camara/${id}/frentes?ano=${selectedYear}` }}
          accent="border-teal-400"
        />

        {failed.has("Frentes parlamentares") ? (
          <DataFetchError label="as frentes parlamentares" />
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Frentes"
                  value={String(caucuses.length)}
                  badge={{ text: `${deputy.legislature}ª Legislatura`, variant: "gray" }}
                />
                {caucusDetails.length > 0 && (
                  <StatCard
                    label="Membros (média)"
                    value={String(Math.round(caucusDetails.reduce((sum, d) => sum + d.members.length, 0) / caucusDetails.length))}
                    tooltip="Média de membros por frente parlamentar (baseado nas frentes detalhadas abaixo)."
                  />
                )}
              </div>
            </div>

            {caucusDetails.length > 0 && (
              <CaucusDetailSection
                caucuses={caucusDetails.map((d) => ({
                  id: Number(d.id),
                  name: d.name,
                  legislature: d.legislature,
                  purpose: d.purpose,
                  memberCount: d.members.length,
                  members: d.members.map((m) => ({
                    name: m.name,
                    party: m.party,
                    uf: m.uf,
                  })),
                  sourceUrl: d._source,
                }))}
                sourceUrl={caucuses._source ?? ""}
              />
            )}
          </>
        )}
      </section>

      {/* ── 14. Carreira política ──────────────────────────────────── */}
      {(previousMandates.length > 0 || history.length > 1 || (camaraMandates?.length ?? 0) > 0 || occupations.length > 0) && (
        <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="carreira">
          <SectionHeader
            title="Carreira política"
            description="Histórico de mandatos, cargos de liderança, carreira profissional e mudanças de status parlamentar."
            accent="border-slate-400"
          />

          {/* Professional occupations */}
          {occupations.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Carreira profissional</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white shadow-card divide-y divide-gray-100">
                {occupations.map((occ, i) => (
                  <div
                    key={`occ-${occ.title}-${i}`}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{occ.title}</span>
                      {occ.entity && (
                        <span className="text-xs text-gray-500">{occ.entity}</span>
                      )}
                      {occ.uf && <Badge variant="gray">{occ.uf}</Badge>}
                    </div>
                    {((occ.startYear ?? 0) > 0 || (occ.endYear ?? 0) > 0) && (
                      <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap ml-3">
                        {(occ.startYear ?? 0) > 0 ? occ.startYear : "?"}–{(occ.endYear ?? 0) > 0 ? occ.endYear : "atual"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Câmara mandates */}
          {(camaraMandates?.length ?? 0) > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Mandatos na Câmara</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white shadow-card divide-y divide-gray-100">
                {camaraMandates!.map((m) => (
                  <div
                    key={`cam-${m.legislature}-${m.startYear}`}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{m.legislature}ª Legislatura</span>
                      {m.party && <Badge variant="gray">{m.party}</Badge>}
                      {m.uf && <span className="text-xs text-gray-500">{m.uf}</span>}
                      {m.electoralCondition && (
                        <Badge variant={m.electoralCondition === "Titular" ? "green" : "amber"}>
                          {m.electoralCondition}
                        </Badge>
                      )}
                    </div>
                    {(m.startYear > 0 || m.endYear > 0) && (
                      <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap ml-3">
                        {m.startYear > 0 ? m.startYear : "?"}–{m.endYear > 0 ? m.endYear : "atual"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous mandates (TSE) */}
          {previousMandates.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Mandatos anteriores (TSE)</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white shadow-card divide-y divide-gray-100">
                {previousMandates.map((m) => (
                  <div
                    key={`prev-${m.office}-${m.startYear}`}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{m.office || "Cargo não informado"}</span>
                      {m.party && <Badge variant="gray">{m.party}</Badge>}
                      {(m.municipality || m.uf) && (
                        <span className="text-xs text-gray-500">
                          {m.municipality ? `${m.municipality}, ${m.uf}` : m.uf}
                        </span>
                      )}
                    </div>
                    {(m.startYear > 0 || m.endYear > 0) && (
                      <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap ml-3">
                        {m.startYear > 0 ? m.startYear : "?"}–{m.endYear > 0 ? m.endYear : "?"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status history timeline */}
          {history.length > 1 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Histórico de status</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card">
                <ol className="relative border-l border-gray-200 ml-3">
                  {history.map((entry, i) => (
                    <li key={`status-${entry.date}-${i}`} className="mb-6 ml-6 last:mb-0">
                      <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white shadow-xs" />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <time className="text-xs font-medium text-gray-400 tabular-nums">
                          {formatDate(entry.date)}
                        </time>
                        {entry.party && <Badge variant="gray">{entry.party}</Badge>}
                        {entry.status && (
                          <Badge variant={entry.status === "Exercício" ? "green" : "amber"}>
                            {entry.status}
                          </Badge>
                        )}
                      </div>
                      {entry.description && (
                        <p className="mt-0.5 text-sm text-gray-800">{entry.description}</p>
                      )}
                      {(entry.electoralCondition || entry.uf) && (
                        <p className="text-xs text-gray-500">
                          {[entry.electoralCondition, entry.uf].filter(Boolean).join(" — ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR")
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
