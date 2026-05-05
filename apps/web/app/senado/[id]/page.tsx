/**
 * @file page.tsx
 * @description Individual senator detail page — full chart parity with Câmara.
 *
 * Renders biographical info, mandate history, party-affiliation history, and
 * legislative activity (proposições, votações, discursos, comissões,
 * lideranças) pulled in real time from the Senado Federal Open Data API.
 *
 * URL-driven year selection via `?ano=YYYY` filters all year-scoped sections.
 *
 * Sections (in render order):
 * 1. ProfileHeader (photo, name, tags, year selector, compare button)
 * 2. SectionNav — sticky pill nav appears after scroll
 * 3. Dados pessoais — biographical info panel
 * 4. Resumo geral — StatCards + RedFlags + RealMandateCost + CostPerOutput
 * 5. Gastos CEAPS — StatCards + DeputyExpenseCharts (year-over-year, monthly,
 *    calendar heatmap, treemap, top suppliers, stacked bar)
 * 6. Proposições — StatCards + PropositionSection (by-type pie, by-year bar) + recent table
 * 7. Votações — StatCards + VotingCharts (vote-types bar, monthly YoY) + recent table
 * 8. Presença — StatCards + SenatorAttendanceCharts (heatmap + monthly) + link to detail
 * 9. Discursos — StatCards + SpeechCharts (by type, by month) + recent table
 * 10. Comissões — StatCards + CommitteeCharts (table view) + cargos
 * 11. Lideranças — current leadership roles
 * 12. Carreira política — mandates + filiações timeline
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import {
  DataTable,
  ProfileHeader,
  InfoPanel,
  SectionHeader,
  StatCard,
  ToastTrigger,
  EmptyState,
  Badge,
} from "@/components/ui"
import {
  getSenatorDetail,
  getSenatorMandates,
  getSenatorAffiliations,
  getSenatorVotingHistory,
  getSenatorPropositions,
  getSenatorSpeeches,
  getSenatorCommittees,
  getSenatorPositions,
  getSenatorLeaderships,
  getSenatorExpenses,
  getSenatorAttendanceDetail,
  getSenatorAttendanceBulk,
  getCeapsBulkSummary,
  getSenadoVotingSessions,
  getSenadoServantsRemuneration,
  ApiError,
  ENDPOINTS,
} from "@imposterio/fetchers"
import { getEntityVoteStats, ensureGameCards } from "@imposterio/db/queries/game"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type {
  SenatorMandate,
  SenatorAffiliation,
  SenatorVotingRecord,
  SenatorSpeech,
  SenatorCommittee,
  SenatorPosition,
  SenatorLeadership,
  SenatorExpense,
  SenatorAttendanceDetail,
  SenatorAttendanceBulkSummary,
  SenatorCeapsBulkSummary,
  SenadoVotingSession,
  Proposition,
  SenadoRemunerationSummary,
} from "@imposterio/types"
import { formatBRL, formatBRLCompact, safePercent } from "@/lib/calc"
import { SENADO_CEAPS_MONTHLY_CAPS_BY_UF, SENADOR_SALARIO_SOURCE } from "@/lib/constants/senado"
import { getSenadoRecessDaysForYear } from "@/lib/constants/senado-calendar"
import { computeSenadoRealMandateCost } from "@/lib/analysis/senado-real-mandate-cost"
import {
  computeSenadoConfirmedCostToDate,
  computeSenadoCostPerOutput,
  computeSenadoAvgCostPerVote,
} from "@/lib/analysis/senado-cost-per-output"
import {
  aggregateVotesByType,
  aggregateVotesByMonth,
  aggregatePropositionsByType,
  aggregatePropositionsByYear,
  aggregateSpeechesByType,
  aggregateSpeechesByMonth,
  aggregateCommitteesByRole,
  aggregateCommitteesByType,
  computeVoteAlignment,
  filterActiveCommittees,
  filterActiveLeaderships,
} from "./activity-utils"
import {
  aggregateByCategory,
  aggregateBySupplier,
  aggregateByMonth as aggregateExpenseByMonth,
  aggregateByDay as aggregateExpenseByDay,
  aggregateCategoryBySupplier,
  monthlyToBarData,
  totalSpending as sumExpenses,
} from "./expense-utils"
import { computeLongestAbsenceStreak } from "./presenca/absence-streaks"
import { CompareButton } from "./CompareButton"
import { RedFlagsCard, type RedFlag } from "./RedFlagsCard"
import { RealMandateCostCard } from "./RealMandateCostCard"
import { CostPerOutputSection } from "./CostPerOutputSection"
import { SectionNav } from "./SectionNav"
import { SenatorAttendanceCharts } from "./SenatorAttendanceCharts"
import { YearSelector } from "@/app/camara/[id]/YearSelector"
import { DeputyExpenseCharts } from "@/app/camara/[id]/DeputyExpenseCharts"
import {
  SpeechCharts,
  CommitteeCharts,
  VotingCharts,
} from "@/app/camara/[id]/DeputyOverviewCharts"
import { PropositionSection } from "@/app/camara/[id]/PropositionSection"

/** Senate CEAPS data has reliable per-senator coverage from 2009 onward. */
const FIRST_CEAPS_YEAR = 2009

interface SenatorPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

/** Builds two-letter initials from a senator's display name. */
function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function buildTags(detail: { party: string; uf: string; legislature: number; situation?: string }): string[] {
  const tags: string[] = []
  if (detail.party) tags.push(detail.party)
  if (detail.uf) tags.push(detail.uf)
  if (detail.legislature) tags.push(`${detail.legislature}ª Legislatura`)
  if (detail.situation) tags.push(detail.situation)
  return tags
}

/** Formats an ISO date as DD/MM/YYYY. Returns "—" for missing values. */
function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Maps API sex values to UI labels. */
function formatSex(value: string | undefined): string | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  if (lower.startsWith("m")) return "Masculino"
  if (lower.startsWith("f")) return "Feminino"
  return value
}

const propositionColumns = [
  {
    header: "Identificação",
    cell: (r: Proposition) => (
      <span className="font-medium text-gray-900">{r.identifier}</span>
    ),
  },
  {
    header: "Tipo",
    cell: (r: Proposition) => <span className="text-gray-600">{r.type}</span>,
  },
  {
    header: "Ementa",
    cell: (r: Proposition) => (
      <span className="line-clamp-2 text-gray-600">{r.summary}</span>
    ),
  },
  {
    header: "Apresentada em",
    align: "right" as const,
    cell: (r: Proposition) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.presentedDate)}</span>
    ),
  },
]

const votingColumns = [
  {
    header: "Data",
    cell: (r: SenatorVotingRecord) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.date)}</span>
    ),
  },
  {
    header: "Sessão",
    cell: (r: SenatorVotingRecord) => (
      <span className="line-clamp-2 text-gray-700">{r.description || "—"}</span>
    ),
  },
  {
    header: "Voto",
    cell: (r: SenatorVotingRecord) => {
      const v = r.vote
      const color =
        v === "Sim"
          ? "text-emerald-600"
          : v === "Não"
            ? "text-red-600"
            : "text-amber-600"
      return <span className={`font-medium ${color}`}>{v || "—"}</span>
    },
  },
  {
    header: "Resultado",
    align: "right" as const,
    cell: (r: SenatorVotingRecord) =>
      r.approved === true ? (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Aprovada
        </span>
      ) : r.approved === false ? (
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Rejeitada
        </span>
      ) : (
        <span className="text-xs text-gray-500">—</span>
      ),
  },
]

const speechColumns = [
  {
    header: "Data",
    cell: (r: SenatorSpeech) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.date)}</span>
    ),
  },
  {
    header: "Tipo",
    cell: (r: SenatorSpeech) => <span className="text-gray-600">{r.type}</span>,
  },
  {
    header: "Resumo",
    cell: (r: SenatorSpeech) => (
      <span className="line-clamp-2 text-gray-700">{r.summary || r.topic || "—"}</span>
    ),
  },
  {
    header: "Texto",
    align: "right" as const,
    cell: (r: SenatorSpeech) =>
      r.textUrl ? (
        <a
          href={r.textUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Abrir ↗
        </a>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      ),
  },
]

const leadershipColumns = [
  {
    header: "Função",
    cell: (r: SenatorLeadership) => (
      <span className="font-medium text-gray-900">{r.role}</span>
    ),
  },
  {
    header: "Unidade",
    cell: (r: SenatorLeadership) => (
      <div className="flex flex-col">
        <span className="text-gray-700">{r.unitAbbreviation}</span>
        {r.unitName && r.unitName !== r.unitAbbreviation && (
          <span className="text-xs text-gray-500">{r.unitName}</span>
        )}
      </div>
    ),
  },
  {
    header: "Tipo",
    cell: (r: SenatorLeadership) => (
      <span className="text-gray-600">{r.unitType ?? "—"}</span>
    ),
  },
  {
    header: "Início",
    align: "right" as const,
    cell: (r: SenatorLeadership) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.startDate)}</span>
    ),
  },
]

const positionColumns = [
  {
    header: "Cargo",
    cell: (r: SenatorPosition) => (
      <span className="font-medium text-gray-900">{r.name || "—"}</span>
    ),
  },
  {
    header: "Comissão",
    cell: (r: SenatorPosition) => (
      <span className="text-gray-600">
        {r.committeeAbbreviation || r.committeeName}
      </span>
    ),
  },
  {
    header: "Início",
    cell: (r: SenatorPosition) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.startDate)}</span>
    ),
  },
  {
    header: "Status",
    align: "right" as const,
    cell: (r: SenatorPosition) =>
      r.endDate ? (
        <span className="text-xs text-gray-500">até {formatDate(r.endDate)}</span>
      ) : (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Atual
        </span>
      ),
  },
]

export default async function SenatorDetailPage({ params, searchParams }: SenatorPageProps) {
  const { id } = await params
  const query = await searchParams
  const now = new Date().getFullYear()

  const selectedYear = query.ano
    ? Math.max(FIRST_CEAPS_YEAR, Math.min(now, Number(query.ano) || now))
    : now

  const availableYears = Array.from(
    { length: now - FIRST_CEAPS_YEAR + 1 },
    (_, i) => now - i,
  )

  const isCurrentYear = selectedYear === now
  const recessDays = getSenadoRecessDaysForYear(selectedYear)

  let detail
  try {
    detail = await getSenatorDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  // Fire-and-forget: ensure game cards exist for this senator.
  void ensureGameCards("senado", id)

  const errors: PageError[] = []
  const failed = new Set<string>()

  const authorFallback = { name: detail.name, party: detail.party }

  const [
    mandates,
    affiliations,
    votes,
    prevYearVotes,
    propositions,
    propositionsAll,
    speeches,
    committees,
    positions,
    leaderships,
    expenses,
    prevYearExpenses,
    attendance,
    attendanceBulk,
    ceapsBulk,
    yearVotingSessions,
    cabinetPayroll,
    gameStats,
  ] = await Promise.all([
    collectErrors(
      () => getSenatorMandates(id),
      emptySourced<SenatorMandate[]>([]),
      errors,
      "Mandatos",
      failed,
    ),
    collectErrors(
      () => getSenatorAffiliations(id),
      emptySourced<SenatorAffiliation[]>([]),
      errors,
      "Filiações partidárias",
      failed,
    ),
    collectErrors(
      () => getSenatorVotingHistory(id, selectedYear),
      emptySourced<SenatorVotingRecord[]>([]),
      errors,
      "Votações",
      failed,
    ),
    collectErrors(
      () => getSenatorVotingHistory(id, selectedYear - 1),
      emptySourced<SenatorVotingRecord[]>([]),
      errors,
      `Votações (${selectedYear - 1})`,
      failed,
    ),
    collectErrors(
      () => getSenatorPropositions(id, authorFallback, selectedYear),
      emptySourced<Proposition[]>([]),
      errors,
      "Proposições",
      failed,
    ),
    collectErrors(
      () => getSenatorPropositions(id, authorFallback),
      emptySourced<Proposition[]>([]),
      errors,
      "Proposições (mandato)",
      failed,
    ),
    collectErrors(
      () => getSenatorSpeeches(id, selectedYear),
      emptySourced<SenatorSpeech[]>([]),
      errors,
      "Discursos",
      failed,
    ),
    collectErrors(
      () => getSenatorCommittees(id),
      emptySourced<SenatorCommittee[]>([]),
      errors,
      "Comissões",
      failed,
    ),
    collectErrors(
      () => getSenatorPositions(id),
      emptySourced<SenatorPosition[]>([]),
      errors,
      "Cargos",
      failed,
    ),
    collectErrors(
      () => getSenatorLeaderships(id),
      emptySourced<SenatorLeadership[]>([]),
      errors,
      "Lideranças",
      failed,
    ),
    collectErrors(
      () => getSenatorExpenses(id, selectedYear),
      emptySourced<SenatorExpense[]>([]),
      errors,
      "Gastos CEAPS",
      failed,
    ),
    collectErrors(
      () => getSenatorExpenses(id, selectedYear - 1),
      emptySourced<SenatorExpense[]>([]),
      errors,
      `Gastos CEAPS (${selectedYear - 1})`,
      failed,
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
      errors,
      "Presença",
      failed,
    ),
    collectErrors(
      () => getSenatorAttendanceBulk(selectedYear),
      emptySourced<SenatorAttendanceBulkSummary>({
        year: selectedYear,
        totalSessions: 0,
        totalDeliberative: 0,
        senators: [],
      }),
      errors,
      "Benchmark de presença",
      failed,
    ),
    collectErrors(
      () => getCeapsBulkSummary(selectedYear),
      emptySourced<SenatorCeapsBulkSummary>({
        year: selectedYear,
        totalSpending: 0,
        expenseCount: 0,
        senators: [],
      }),
      errors,
      "Benchmark de CEAPS",
      failed,
    ),
    collectErrors(
      () => getSenadoVotingSessions(`${selectedYear}0101`, `${selectedYear}1231`),
      emptySourced<SenadoVotingSession[]>([]),
      errors,
      "Sessões de votação do Senado",
      failed,
    ),
    // Senate publishes payroll on a delay; step back two months to maximize
    // the chance of hitting a populated dataset for the cabinet-payroll line.
    (() => {
      const ref = new Date()
      ref.setMonth(ref.getMonth() - 2)
      const refYear = ref.getFullYear()
      const refMonth = ref.getMonth() + 1
      return collectErrors(
        () => getSenadoServantsRemuneration(refYear, refMonth),
        emptySourced<SenadoRemunerationSummary>({
          year: refYear,
          month: refMonth,
          totalNetPay: 0,
          totalBaseSalary: 0,
          totalCommissionedPay: 0,
          paidHeadcount: 0,
          rows: [],
          lastUpdated: "",
        }),
        errors,
        "Folha de gabinete",
        failed,
      )
    })(),
    getEntityVoteStats("senado", id).catch(() => null),
  ])

  // ── Personal info ──────────────────────────────────────────────────
  const personalFields: Array<{ label: string; value: string; href?: string; sourceUrl?: string }> = [
    { label: "Nome civil", value: detail.fullName },
  ]
  const sex = formatSex(detail.sex)
  if (sex) personalFields.push({ label: "Sexo", value: sex })
  if (detail.birthDate) personalFields.push({ label: "Data de nascimento", value: formatDate(detail.birthDate) })
  if (detail.birthPlace) personalFields.push({ label: "Naturalidade", value: detail.birthPlace })
  if (detail.profession) personalFields.push({ label: "Profissão", value: detail.profession })
  if (detail.email) {
    personalFields.push({ label: "E-mail", value: detail.email, href: `mailto:${detail.email}` })
  }
  if (detail.phone) personalFields.push({ label: "Telefone do gabinete", value: detail.phone })
  if (detail.office) personalFields.push({ label: "Gabinete", value: detail.office })
  if (detail.websiteUrl) {
    personalFields.push({ label: "Página oficial", value: "Acessar perfil", href: detail.websiteUrl })
  }

  // ── Activity-section derived stats ─────────────────────────────────
  const propTypeBreakdown = aggregatePropositionsByType(propositions)
  const propByYear = aggregatePropositionsByYear(propositionsAll)
  const propApproved = propositions.filter((p) => p.status === "Aprovada").length
  const propArchived = propositions.filter((p) => p.status === "Arquivada" || p.status === "Rejeitada").length
  const propPending = propositions.filter((p) => p.status === "Tramitando" || p.status === "Em votação").length

  const voteTypes = aggregateVotesByType(votes)
  const votesByMonth = aggregateVotesByMonth(votes)
  const prevYearVotesByMonth = prevYearVotes.length > 0 ? aggregateVotesByMonth(prevYearVotes) : undefined
  const yesCount = voteTypes.find((v) => v.name === "Sim")?.value ?? 0
  const noCount = voteTypes.find((v) => v.name === "Não")?.value ?? 0
  const alignment = computeVoteAlignment(votes)

  const speechesByType = aggregateSpeechesByType(speeches)
  const speechesByMonth = aggregateSpeechesByMonth(speeches)

  const activeCommittees = filterActiveCommittees(committees)
  const committeesByRole = aggregateCommitteesByRole(activeCommittees)
  const committeesByType = aggregateCommitteesByType(activeCommittees)
  const titularCount = activeCommittees.filter((c) => c.role.toLowerCase().startsWith("titular")).length
  const suplenteCount = activeCommittees.filter((c) => c.role.toLowerCase().startsWith("suplente")).length

  const activeLeaderships = filterActiveLeaderships(leaderships)
  const recentVotes = votes.slice(0, 8)
  const recentSpeeches = speeches.slice(0, 8)

  // ── CEAPS aggregations ─────────────────────────────────────────────
  const ceapsTotal = sumExpenses(expenses)
  const prevYearCeapsTotal = sumExpenses(prevYearExpenses)
  const ceapsVariation = prevYearCeapsTotal > 0
    ? ((ceapsTotal - prevYearCeapsTotal) / prevYearCeapsTotal) * 100
    : null
  const ceapsByCategory = aggregateByCategory(expenses)
  const ceapsBySupplier = aggregateBySupplier(expenses, 10)
  const ceapsByCategorySupplier = aggregateCategoryBySupplier(expenses)
  const ceapsByDay = aggregateExpenseByDay(expenses)
  const ceapsMonthly = aggregateExpenseByMonth(expenses)
  const ceapsPrevMonthly = aggregateExpenseByMonth(prevYearExpenses)
  const ceapsMonthlyBar = monthlyToBarData(ceapsMonthly)
  const ceapsMonthlyCap = SENADO_CEAPS_MONTHLY_CAPS_BY_UF[detail.uf] ?? 0
  const monthsElapsed = isCurrentYear ? new Date().getMonth() + 1 : 12
  const ceapsAnnualCap = ceapsMonthlyCap * monthsElapsed
  const ceapsCapUsage = ceapsAnnualCap > 0
    ? Math.round(safePercent(ceapsTotal, ceapsAnnualCap))
    : 0
  const monthlyAverage = monthsElapsed > 0 ? ceapsTotal / monthsElapsed : 0

  // ── Plenary attendance derived stats ───────────────────────────────
  const attendedSessions = attendance.sessions.filter((s) => s.attended)
  const attendedDates = new Set(attendedSessions.map((s) => s.date))
  const longestAbsence = computeLongestAbsenceStreak(attendedDates, selectedYear)

  const attendanceByDay = Array.from(attendedDates).map((date) => ({ date, value: 1 }))
  const attendanceByMonth = (() => {
    const buckets = new Map<number, number>()
    for (const date of attendedDates) {
      const m = new Date(date + "T12:00:00").getMonth()
      if (Number.isNaN(m)) continue
      buckets.set(m, (buckets.get(m) ?? 0) + 1)
    }
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    return labels.map((label, i) => ({ label, value: buckets.get(i) ?? 0 }))
  })()

  // ── National benchmarks ────────────────────────────────────────────
  const benchmarkAttendancePercents = attendanceBulk.senators
    .map((s) => s.percentage)
    .filter((p) => p > 0)
  const senateAvgAttendance = benchmarkAttendancePercents.length > 0
    ? Math.round(
        benchmarkAttendancePercents.reduce((a, b) => a + b, 0)
        / benchmarkAttendancePercents.length,
      )
    : null
  const benchmarkCeapsTotals = ceapsBulk.senators.map((s) => s.total).filter((v) => v > 0)
  const senateAvgCeaps = benchmarkCeapsTotals.length > 0
    ? benchmarkCeapsTotals.reduce((a, b) => a + b, 0) / benchmarkCeapsTotals.length
    : null

  // ── Real Mandate Cost ──────────────────────────────────────────────
  const ceapsMonthNumbers = ceapsMonthly
    .filter((m) => m.total > 0)
    .map((m) => m.month)
  const ceapsFirstMonth = ceapsMonthNumbers.length > 0 ? Math.min(...ceapsMonthNumbers) : 1
  const ceapsLastMonth = ceapsMonthNumbers.length > 0 ? Math.max(...ceapsMonthNumbers) : 12

  // Cabinet payroll line: chamber-wide commissioned-staff payroll spread
  // across the 81 senators × 12 months. Approximation — see analysis doc.
  const cabinetPayrollAnnualPerSenator =
    cabinetPayroll.totalCommissionedPay > 0
      ? Math.round((cabinetPayroll.totalCommissionedPay * 12) / 81)
      : 0
  const cabinetPayrollMonthLabel = cabinetPayroll.month > 0
    ? `${[
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
      ][cabinetPayroll.month - 1]}/${cabinetPayroll.year}`
    : ""

  const mandateCost = computeSenadoRealMandateCost(
    selectedYear,
    ceapsTotal,
    isCurrentYear,
    ceapsFirstMonth,
    ceapsLastMonth,
    expenses._source ?? "",
    SENADOR_SALARIO_SOURCE,
    cabinetPayrollAnnualPerSenator > 0
      ? {
          annualEstimate: cabinetPayrollAnnualPerSenator,
          sourceUrl: cabinetPayroll._source ?? "",
          referenceLabel: cabinetPayrollMonthLabel,
        }
      : undefined,
  )

  // ── Cost per output metrics ────────────────────────────────────────
  const salaryMonthsElapsed = isCurrentYear ? new Date().getMonth() + 1 : 12
  const confirmedCostToDate = computeSenadoConfirmedCostToDate(
    ceapsTotal,
    salaryMonthsElapsed,
  )
  const activeDays = attendedDates.size
  const costPerOutput = computeSenadoCostPerOutput(
    confirmedCostToDate,
    activeDays,
    votes.length,
    attendance.attended,
    propositions.length,
    selectedYear,
  )
  const senateAvgCostPerVote = ceapsBulk.senators.length > 0 && yearVotingSessions.length > 0
    ? await computeSenadoAvgCostPerVote(
        ceapsBulk.senators,
        yearVotingSessions.length,
        salaryMonthsElapsed,
        selectedYear,
      )
    : null

  // ── Red flags ──────────────────────────────────────────────────────
  const redFlags: RedFlag[] = []

  if (ceapsCapUsage >= 90 && ceapsAnnualCap > 0) {
    redFlags.push({
      id: "CEAPS_NEAR_CAP",
      title: "CEAPS próximo ao teto",
      description: `Já utilizou ${ceapsCapUsage}% do teto de CEAPS acumulado para os ${monthsElapsed} meses do ano.`,
      anchorHref: "#gastos-ceaps",
      severity: "amber",
    })
  }

  if (ceapsTotal > 0 && ceapsBySupplier.length > 0) {
    const topSupplier = ceapsBySupplier[0]
    const topShare = (topSupplier.value / ceapsTotal) * 100
    if (topShare > 70) {
      redFlags.push({
        id: "CEAPS_SUPPLIER_CONCENTRATION",
        title: "Concentração de fornecedor",
        description: `O fornecedor "${topSupplier.label}" recebeu ${topShare.toFixed(0)}% do total de CEAPS.`,
        anchorHref: "#gastos-ceaps",
        severity: "red",
      })
    }
  }

  if (alignment < 10 && votes.length > 5) {
    redFlags.push({
      id: "LOW_ALIGNMENT",
      title: "Baixo alinhamento com vencedor",
      description: `Votou no lado vencedor em apenas ${alignment}% das votações analisadas.`,
      anchorHref: "#votacoes",
      severity: "amber",
    })
  }

  if (
    attendance.totalDeliberative >= 10
    && attendance.percentage < 50
  ) {
    redFlags.push({
      id: "LOW_ATTENDANCE",
      title: "Baixa presença plenária",
      description: `Presente em apenas ${attendance.percentage.toFixed(0)}% das sessões deliberativas (${attendance.attended} de ${attendance.totalDeliberative}).`,
      anchorHref: "#presenca",
      severity: "red",
    })
  }

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <ProfileHeader
        initials={initialsFromName(detail.name)}
        name={detail.name}
        photoUrl={detail.photoUrl}
        tags={buildTags(detail)}
        sourceUrl={detail._source}
        actions={
          <>
            <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5">
              <span className="text-sm font-medium text-gray-600">Ver dados de</span>
              <YearSelector years={availableYears} selected={selectedYear} />
            </div>
            <CompareButton senatorId={id} year={selectedYear} />
          </>
        }
      />

      <SectionNav />

      {/* ── Dados pessoais ─────────────────────────────────────────── */}
      <section className="mb-12 mt-10">
        <SectionHeader title="Dados pessoais" sourceUrl={detail._source} />
        <InfoPanel fields={personalFields} />
      </section>

      {/* ── Resumo geral ──────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="resumo">
        <SectionHeader
          title="Resumo geral"
          description={`Principais indicadores de atividade parlamentar em ${selectedYear}.`}
          accent="border-indigo-400"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Gastos CEAPS"
            value={formatBRL(ceapsTotal)}
            tooltip="Cota para o Exercício da Atividade Parlamentar dos Senadores — verba para custear despesas do mandato."
          />
          <StatCard
            label="Discursos"
            value={String(speeches.length)}
            tooltip="Pronunciamentos registrados em plenário e demais eventos legislativos no ano selecionado."
          />
          <StatCard
            label="Votações"
            value={String(votes.length)}
            tooltip="Sessões de votação nominal em que o senador registrou voto no ano selecionado."
          />
          <StatCard
            label="Comissões ativas"
            value={String(activeCommittees.length)}
            tooltip="Comissões em que o senador atua como titular ou suplente atualmente."
          />
          <StatCard
            label="Lideranças ativas"
            value={String(activeLeaderships.length)}
            tooltip="Funções de liderança partidária, de bloco ou de governo em exercício."
          />
          <StatCard
            label="Proposições"
            value={String(propositions.length)}
            tooltip="Matérias legislativas de autoria registradas no ano selecionado."
          />
          <StatCard
            label="Dias com presença"
            value={String(activeDays)}
            tooltip={`O senador esteve presente em sessões deliberativas em ${activeDays} dias no ano.`}
          />
          <StatCard
            label="Presença plenária"
            value={
              attendance.totalDeliberative > 0
                ? `${attendance.percentage.toFixed(1)}%`
                : "—"
            }
            tooltip={
              senateAvgAttendance !== null
                ? `Presente em ${attendance.attended} de ${attendance.totalDeliberative} sessões. Média do Senado: ${senateAvgAttendance}%.`
                : `Presente em ${attendance.attended} de ${attendance.totalDeliberative} sessões deliberativas no ano.`
            }
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
                      No jogo &quot;Acha Justo?&quot;, usuários avaliam dados reais de agentes públicos sem saber a identidade. Este é o resultado dos votos sobre este senador.
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

        <RedFlagsCard flags={redFlags} />

        <div className="mt-4">
          <RealMandateCostCard result={mandateCost} />
          <CostPerOutputSection
            metrics={costPerOutput.metrics}
            year={selectedYear}
            propositionsCount={propositions.length}
            senateAvgCostPerVote={senateAvgCostPerVote}
            expenseSourceUrl={expenses._source}
          />
        </div>
      </section>

      {/* ── Gastos CEAPS ──────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="gastos-ceaps">
        <SectionHeader
          title="Gastos CEAPS"
          description={`Cota para o Exercício da Atividade Parlamentar dos Senadores em ${selectedYear}.`}
          accent="border-amber-400"
          action={{ label: "Ver todas as despesas", href: `/senado/${id}/despesas?ano=${selectedYear}` }}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label={`Total reembolsado em ${selectedYear}`}
            value={formatBRL(ceapsTotal)}
            badge={ceapsVariation !== null ? {
              text: `${ceapsVariation > 0 ? "+" : ""}${ceapsVariation.toFixed(1)}% vs ${selectedYear - 1}`,
              variant: ceapsVariation > 5 ? "red" : ceapsVariation < -5 ? "green" : "amber",
            } : undefined}
            tooltip={
              senateAvgCeaps !== null
                ? `Média do Senado em ${selectedYear}: ${formatBRLCompact(senateAvgCeaps)}.`
                : undefined
            }
          />
          <StatCard
            label="Média mensal"
            value={formatBRL(monthlyAverage)}
            tooltip={`Total reembolsado dividido por ${monthsElapsed} meses.`}
          />
          <StatCard
            label="Teto mensal por UF"
            value={
              ceapsMonthlyCap > 0
                ? formatBRL(ceapsMonthlyCap)
                : "—"
            }
            tooltip={
              detail.uf
                ? `Limite mensal de CEAPS para senadores eleitos por ${detail.uf}, definido por Ato da Comissão Diretora.`
                : "Limite por UF não disponível para este(a) senador(a)."
            }
          />
          <StatCard
            label="Uso do teto acumulado"
            value={ceapsAnnualCap > 0 ? `${ceapsCapUsage}%` : "—"}
            badge={
              ceapsCapUsage >= 90
                ? { text: "Próximo ao teto", variant: "red" }
                : ceapsCapUsage >= 70
                  ? { text: "Alto", variant: "amber" }
                  : ceapsCapUsage > 0
                    ? { text: "Dentro do teto", variant: "green" }
                    : undefined
            }
            tooltip={`Percentual gasto em relação ao teto acumulado para os ${monthsElapsed} meses do ano.`}
          />
        </div>

        {(expenses.length > 0 || prevYearExpenses.length > 0) && (
          <DeputyExpenseCharts
            selectedYearMonthly={ceapsMonthly}
            prevYearMonthly={ceapsPrevMonthly}
            year={selectedYear}
            byCategory={ceapsByCategory}
            bySupplier={ceapsBySupplier}
            monthlyBarData={ceapsMonthlyBar}
            dailyExpenses={ceapsByDay}
            categoryBySupplier={ceapsByCategorySupplier}
            sourceUrl={expenses._source}
            recessDays={recessDays}
          />
        )}

        {expenses.length === 0 && prevYearExpenses.length === 0 && (
          <EmptyState
            message="Nenhum gasto CEAPS registrado"
            description={`A API administrativa do Senado não retornou despesas para ${selectedYear}.`}
          />
        )}
      </section>

      {/* ── Proposições ───────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="proposicoes">
        <SectionHeader
          title="Proposições"
          description={`Matérias legislativas de autoria registradas em ${selectedYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_PROCESS_SEARCH}?codigoParlamentarAutor=${id}&ano=${selectedYear}`}
          action={{ label: "Ver todas as proposições", href: `/senado/${id}/proposicoes?ano=${selectedYear}` }}
          accent="border-purple-400"
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total de autoria" value={String(propositions.length)} />
          <StatCard
            label="Aprovadas"
            value={String(propApproved)}
            badge={propApproved > 0 ? { text: "no período", variant: "green" } : undefined}
          />
          <StatCard
            label="Arquivadas/rejeitadas"
            value={String(propArchived)}
          />
          <StatCard
            label="Em tramitação"
            value={String(propPending)}
          />
        </div>

        {propositions.length > 0 && (
          <PropositionSection
            byType={propTypeBreakdown}
            byYear={propByYear}
            sourceUrl={propositions._source ?? ""}
          />
        )}

        {propositions.length > 0 ? (
          <div className="mt-6">
            <DataTable
              columns={propositionColumns}
              data={propositions.slice(0, 8)}
              rowKey={(r) => r.id}
            />
          </div>
        ) : (
          <EmptyState
            message="Nenhuma proposição em autoria"
            description={`Nenhuma matéria registrada como de autoria em ${selectedYear}.`}
          />
        )}
      </section>

      {/* ── Votações ──────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="votacoes">
        <SectionHeader
          title="Votações"
          description={`Votos nominais registrados em ${selectedYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_VOTING}?codigoParlamentar=${id}&dataInicio=${selectedYear}0101&dataFim=${selectedYear}1231`}
          action={{ label: "Ver todas as votações", href: `/senado/${id}/votacoes?ano=${selectedYear}` }}
          accent="border-blue-400"
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total de votos"
            value={String(votes.length)}
            tooltip={
              yearVotingSessions.length > 0
                ? `Senado realizou ${yearVotingSessions.length} sessões de votação nominal em ${selectedYear}.`
                : undefined
            }
          />
          <StatCard label="Votos 'Sim'" value={String(yesCount)} />
          <StatCard label="Votos 'Não'" value={String(noCount)} />
          <StatCard
            label="Alinhamento com vencedor"
            value={`${alignment}%`}
            badge={{
              text: "com resultado",
              variant: alignment >= 70 ? "green" : alignment >= 40 ? "amber" : "red",
            }}
            tooltip="Percentual de vezes em que o senador votou no mesmo sentido do resultado final."
          />
        </div>

        {votes.length > 0 && (
          <VotingCharts
            byType={voteTypes}
            byMonth={votesByMonth}
            year={selectedYear}
            sourceUrl={votes._source}
            priorYearByMonth={prevYearVotesByMonth}
            priorYear={selectedYear - 1}
          />
        )}

        {recentVotes.length > 0 ? (
          <div className="mt-6">
            <DataTable columns={votingColumns} data={recentVotes} rowKey={(r) => r.sessionId} />
          </div>
        ) : (
          <EmptyState
            message="Nenhum voto registrado"
            description={`A API do Senado não retornou votos para ${selectedYear}.`}
          />
        )}
      </section>

      {/* ── Presença ──────────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="presenca">
        <SectionHeader
          title="Presença"
          description={`Comparecimento em sessões deliberativas do Plenário em ${selectedYear}.`}
          sourceUrl={attendance._source}
          action={{ label: "Ver detalhamento de presença", href: `/senado/${id}/presenca` }}
          accent="border-emerald-400"
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Sessões deliberativas"
            value={String(attendance.totalDeliberative)}
            tooltip="Total de sessões deliberativas realizadas no ano (denominador da taxa)."
          />
          <StatCard label="Comparecimentos" value={String(attendance.attended)} />
          <StatCard
            label="Taxa de presença"
            value={
              attendance.totalDeliberative > 0
                ? `${attendance.percentage.toFixed(1)}%`
                : "—"
            }
            tooltip={
              senateAvgAttendance !== null
                ? `Média do Senado em ${selectedYear}: ${senateAvgAttendance}%.`
                : undefined
            }
            badge={
              attendance.totalDeliberative === 0
                ? undefined
                : attendance.percentage >= 90
                  ? { text: "Alta", variant: "green" }
                  : attendance.percentage >= 70
                    ? { text: "Média", variant: "amber" }
                    : { text: "Baixa", variant: "red" }
            }
          />
          <StatCard
            label="Maior ausência"
            value={
              longestAbsence
                ? `${longestAbsence.days} dias úteis`
                : "—"
            }
            tooltip={
              longestAbsence
                ? `De ${formatDate(longestAbsence.startDate)} a ${formatDate(longestAbsence.endDate)}.`
                : "Nenhuma sequência de 3 ou mais dias úteis sem registro de presença."
            }
            badge={
              longestAbsence?.isExtendedWeekend
                ? { text: "Feriadão", variant: "amber" }
                : undefined
            }
          />
        </div>
        {attendance.totalDeliberative === 0 ? (
          <EmptyState
            message="Nenhuma sessão deliberativa registrada"
            description={`A API do Senado não retornou sessões plenárias deliberativas para ${selectedYear}.`}
          />
        ) : (
          <SenatorAttendanceCharts
            byDay={attendanceByDay}
            byMonth={attendanceByMonth}
            year={selectedYear}
            sourceUrl={attendance._source}
            recessDays={recessDays}
          />
        )}
      </section>

      {/* ── Discursos ─────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="discursos">
        <SectionHeader
          title="Discursos"
          description={`Pronunciamentos em ${selectedYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_SENATOR_SPEECHES(id)}?dataInicio=${selectedYear}0101&dataFim=${selectedYear}1231`}
          action={{ label: "Ver todos os discursos", href: `/senado/${id}/discursos?ano=${selectedYear}` }}
          accent="border-cyan-400"
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total de discursos" value={String(speeches.length)} />
          <StatCard
            label="Tipo principal"
            value={speechesByType[0]?.name ?? "—"}
          />
          <StatCard
            label="Com texto disponível"
            value={String(speeches.filter((s) => s.textUrl).length)}
          />
          <StatCard
            label="Com tema indexado"
            value={String(speeches.filter((s) => s.topic).length)}
          />
        </div>

        {speeches.length > 0 && (
          <SpeechCharts
            byType={speechesByType}
            byMonth={speechesByMonth}
            year={selectedYear}
            sourceUrl={speeches._source}
          />
        )}

        {recentSpeeches.length > 0 ? (
          <div className="mt-6">
            <DataTable columns={speechColumns} data={recentSpeeches} rowKey={(r) => r.id} />
          </div>
        ) : (
          <EmptyState
            message="Nenhum discurso registrado"
            description={`A API do Senado não retornou pronunciamentos para ${selectedYear}.`}
          />
        )}
      </section>

      {/* ── Comissões ─────────────────────────────────────────────── */}
      <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="comissoes">
        <SectionHeader
          title="Comissões"
          description="Memberships ativas e cargos de direção."
          sourceUrl={ENDPOINTS.SENADO_SENATOR_COMMITTEES(id)}
          action={{ label: "Ver todas as comissões", href: `/senado/${id}/comissoes` }}
          accent="border-rose-400"
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Comissões ativas" value={String(activeCommittees.length)} />
          <StatCard label="Como Titular" value={String(titularCount)} />
          <StatCard label="Como Suplente" value={String(suplenteCount)} />
          <StatCard label="Cargos de direção" value={String(positions.length)} />
        </div>

        {activeCommittees.length > 0 ? (
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
        ) : (
          <EmptyState
            message="Nenhuma comissão ativa"
            description="A API do Senado não retornou comissões ativas no momento."
          />
        )}

        {positions.length > 0 && (
          <div className="mt-8">
            <SectionHeader
              title="Cargos de direção"
              description="Presidência e vice-presidência em comissões."
              sourceUrl={ENDPOINTS.SENADO_SENATOR_POSITIONS(id)}
            />
            <DataTable columns={positionColumns} data={positions} rowKey={(r) => r.id} />
          </div>
        )}
      </section>

      {/* ── Lideranças ────────────────────────────────────────────── */}
      <section className="mb-12 border-t border-gray-200/60 pt-10" id="liderancas">
        <SectionHeader
          title="Lideranças"
          description="Funções de liderança partidária, de bloco ou de governo."
          sourceUrl={ENDPOINTS.SENADO_SENATOR_LEADERSHIPS(id)}
        />
        {activeLeaderships.length > 0 ? (
          <DataTable
            columns={leadershipColumns}
            data={activeLeaderships}
            rowKey={(r, i) => `${r.role}-${r.unitAbbreviation}-${i}`}
          />
        ) : (
          <EmptyState
            message="Nenhuma liderança ativa"
            description="A API do Senado não retornou funções de liderança em exercício."
          />
        )}
      </section>

      {/* ── Carreira política ─────────────────────────────────────── */}
      {(mandates.length > 0 || affiliations.length > 0) && (
        <section className="mb-12 rounded-2xl bg-gray-50/40 pt-10" id="carreira">
          <SectionHeader
            title="Carreira política"
            description="Histórico de mandatos no Senado e mudanças de filiação partidária."
            accent="border-slate-400"
          />

          {mandates.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Mandatos no Senado</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white shadow-card divide-y divide-gray-100">
                {mandates.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      {m.primaryLegislature != null && (
                        <span className="text-sm font-medium text-gray-900">
                          {m.primaryLegislature}ª Legislatura
                        </span>
                      )}
                      {m.uf && <Badge variant="gray">{m.uf}</Badge>}
                      <Badge variant={m.participation?.toLowerCase().includes("titular") ? "green" : "amber"}>
                        {m.participation || "—"}
                      </Badge>
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

          {affiliations.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Filiações partidárias</h3>
              <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card">
                <ol className="relative border-l border-gray-200 ml-3">
                  {affiliations.map((a, i) => (
                    <li key={`affil-${a.party}-${a.startDate}-${i}`} className="mb-6 ml-6 last:mb-0">
                      <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white shadow-xs" />
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <time className="text-xs font-medium text-gray-400 tabular-nums">
                          {formatDate(a.startDate)} {a.endDate ? `– ${formatDate(a.endDate)}` : "– atual"}
                        </time>
                        <Badge variant={a.endDate ? "gray" : "green"}>
                          {a.party}
                        </Badge>
                        {a.partyName && a.partyName !== a.party && (
                          <span className="text-xs text-gray-500">{a.partyName}</span>
                        )}
                      </div>
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
