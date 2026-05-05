/**
 * @file page.tsx
 * @description Individual senator detail page — Phase 2 (basic profile + activity).
 *
 * Renders biographical info, mandate history, party-affiliation history, and
 * legislative activity (proposições, votações, discursos, comissões,
 * lideranças) pulled in real time from the Senado Federal Open Data API.
 *
 * Sections:
 * 1. Profile header — photo, name, party, UF, situation
 * 2. Dados pessoais — biographical info panel
 * 3. Mandatos — full term history
 * 4. Filiações partidárias — party-switch history
 * 5. Proposições — authored bills (current year)
 * 6. Votações — recorded votes (current year) + alignment with winning side
 * 7. Discursos — floor speeches (current year)
 * 8. Comissões — committee memberships + chair positions
 * 9. Lideranças — current leadership roles
 *
 * Year is hardcoded to the current calendar year for activity sections.
 * URL-driven year selection is deferred to a later phase.
 */

import { notFound } from "next/navigation"
import {
  DataTable,
  ProfileHeader,
  InfoPanel,
  SectionHeader,
  StatCard,
  ToastTrigger,
  EmptyState,
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
import { computeSenadoRealMandateCost } from "@/lib/analysis/senado-real-mandate-cost"
import {
  computeSenadoConfirmedCostToDate,
  computeSenadoCostPerOutput,
  computeSenadoAvgCostPerVote,
} from "@/lib/analysis/senado-cost-per-output"
import {
  aggregateVotesByType,
  aggregatePropositionsByType,
  computeVoteAlignment,
  filterActiveCommittees,
  filterActiveLeaderships,
} from "./activity-utils"
import {
  aggregateByCategory,
  aggregateBySupplier,
  aggregateByMonth as aggregateExpenseByMonth,
  totalSpending as sumExpenses,
} from "./expense-utils"
import { computeLongestAbsenceStreak } from "./presenca/absence-streaks"
import { CompareButton } from "./CompareButton"
import { RedFlagsCard, type RedFlag } from "./RedFlagsCard"
import { RealMandateCostCard } from "./RealMandateCostCard"
import { CostPerOutputSection } from "./CostPerOutputSection"

interface SenatorPageProps {
  params: Promise<{ id: string }>
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

const mandateColumns = [
  {
    header: "Mandato",
    cell: (r: SenatorMandate) => (
      <span className="font-medium text-gray-900">{r.uf || "—"}</span>
    ),
  },
  {
    header: "Tipo",
    cell: (r: SenatorMandate) => <span className="text-gray-600">{r.participation}</span>,
  },
  {
    header: "Início",
    cell: (r: SenatorMandate) => (
      <span className="text-gray-600 tabular-nums">{r.startYear || "—"}</span>
    ),
  },
  {
    header: "Fim",
    cell: (r: SenatorMandate) => (
      <span className="text-gray-600 tabular-nums">{r.endYear || "—"}</span>
    ),
  },
  {
    header: "Legislatura",
    align: "right" as const,
    cell: (r: SenatorMandate) => (
      <span className="text-gray-600 tabular-nums">{r.primaryLegislature ?? "—"}</span>
    ),
  },
]

const affiliationColumns = [
  {
    header: "Partido",
    cell: (r: SenatorAffiliation) => (
      <span className="font-medium text-gray-900">{r.party}</span>
    ),
  },
  {
    header: "Nome do partido",
    cell: (r: SenatorAffiliation) => (
      <span className="text-gray-600">{r.partyName ?? "—"}</span>
    ),
  },
  {
    header: "Filiação",
    cell: (r: SenatorAffiliation) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.startDate)}</span>
    ),
  },
  {
    header: "Desfiliação",
    align: "right" as const,
    cell: (r: SenatorAffiliation) =>
      r.endDate ? (
        <span className="text-gray-600 tabular-nums">{formatDate(r.endDate)}</span>
      ) : (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Atual
        </span>
      ),
  },
]

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

const committeeColumns = [
  {
    header: "Comissão",
    cell: (r: SenatorCommittee) => (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{r.abbreviation}</span>
        <span className="text-xs text-gray-500">{r.name}</span>
      </div>
    ),
  },
  {
    header: "Tipo",
    cell: (r: SenatorCommittee) => <span className="text-gray-600">{r.type}</span>,
  },
  {
    header: "Função",
    cell: (r: SenatorCommittee) => <span className="text-gray-600">{r.role}</span>,
  },
  {
    header: "Início",
    cell: (r: SenatorCommittee) => (
      <span className="text-gray-600 tabular-nums">{formatDate(r.startDate)}</span>
    ),
  },
  {
    header: "Status",
    align: "right" as const,
    cell: (r: SenatorCommittee) =>
      r.endDate ? (
        <span className="text-xs text-gray-500">
          até {formatDate(r.endDate)}
        </span>
      ) : (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Atual
        </span>
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

export default async function SenatorDetailPage({ params }: SenatorPageProps) {
  const { id } = await params
  const currentYear = new Date().getFullYear()

  let detail
  try {
    detail = await getSenatorDetail(id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const errors: PageError[] = []
  const failed = new Set<string>()

  const authorFallback = { name: detail.name, party: detail.party }

  const [
    mandates,
    affiliations,
    votes,
    propositions,
    speeches,
    committees,
    positions,
    leaderships,
    expenses,
    attendance,
    attendanceBulk,
    ceapsBulk,
    yearVotingSessions,
    cabinetPayroll,
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
      () => getSenatorVotingHistory(id, currentYear),
      emptySourced<SenatorVotingRecord[]>([]),
      errors,
      "Votações",
      failed,
    ),
    collectErrors(
      () => getSenatorPropositions(id, authorFallback, currentYear),
      emptySourced<Proposition[]>([]),
      errors,
      "Proposições",
      failed,
    ),
    collectErrors(
      () => getSenatorSpeeches(id, currentYear),
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
      () => getSenatorExpenses(id, currentYear),
      emptySourced<SenatorExpense[]>([]),
      errors,
      "Gastos CEAPS",
      failed,
    ),
    collectErrors(
      () => getSenatorAttendanceDetail(id, currentYear),
      emptySourced<SenatorAttendanceDetail>({
        senatorId: id,
        year: currentYear,
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
      () => getSenatorAttendanceBulk(currentYear),
      emptySourced<SenatorAttendanceBulkSummary>({
        year: currentYear,
        totalSessions: 0,
        totalDeliberative: 0,
        senators: [],
      }),
      errors,
      "Benchmark de presença",
      failed,
    ),
    collectErrors(
      () => getCeapsBulkSummary(currentYear),
      emptySourced<SenatorCeapsBulkSummary>({
        year: currentYear,
        totalSpending: 0,
        expenseCount: 0,
        senators: [],
      }),
      errors,
      "Benchmark de CEAPS",
      failed,
    ),
    collectErrors(
      () => getSenadoVotingSessions(`${currentYear}0101`, `${currentYear}1231`),
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
  ])

  // Personal info fields.
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

  // Activity-section derived stats.
  const propTypeBreakdown = aggregatePropositionsByType(propositions)
  const propApproved = propositions.filter((p) => p.status === "Aprovada").length

  const voteTypes = aggregateVotesByType(votes)
  const yesCount = voteTypes.find((v) => v.name === "Sim")?.value ?? 0
  const noCount = voteTypes.find((v) => v.name === "Não")?.value ?? 0
  const alignment = computeVoteAlignment(votes)

  const activeCommittees = filterActiveCommittees(committees)
  const titularCount = activeCommittees.filter((c) => c.role.toLowerCase().startsWith("titular")).length
  const suplenteCount = activeCommittees.filter((c) => c.role.toLowerCase().startsWith("suplente")).length

  const activeLeaderships = filterActiveLeaderships(leaderships)
  const recentVotes = votes.slice(0, 8)
  const recentSpeeches = speeches.slice(0, 8)

  // CEAPS aggregations.
  const ceapsTotal = sumExpenses(expenses)
  const ceapsByCategory = aggregateByCategory(expenses)
  const ceapsBySupplier = aggregateBySupplier(expenses, 8)
  const ceapsMonthlyCap = SENADO_CEAPS_MONTHLY_CAPS_BY_UF[detail.uf] ?? 0
  const monthsElapsed = currentYear === new Date().getFullYear()
    ? new Date().getMonth() + 1
    : 12
  const ceapsAnnualCap = ceapsMonthlyCap * monthsElapsed
  const ceapsCapUsage = ceapsAnnualCap > 0
    ? Math.round(safePercent(ceapsTotal, ceapsAnnualCap))
    : 0
  const monthlyAverage = monthsElapsed > 0 ? ceapsTotal / monthsElapsed : 0

  // Plenary attendance derived stats.
  const attendedDates = new Set(
    attendance.sessions.filter((s) => s.attended).map((s) => s.date),
  )
  const longestAbsence = computeLongestAbsenceStreak(attendedDates, currentYear)

  // ── National benchmarks (Senado-wide averages) ─────────────────────
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
  const isCurrentYear = currentYear === new Date().getFullYear()
  const expenseMonthly = aggregateExpenseByMonth(expenses)
  const ceapsMonthNumbers = expenseMonthly
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
    currentYear,
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

  // ── Cost per output metrics ─────────────────────────────────────────
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
    currentYear,
  )
  const senateAvgCostPerVote = ceapsBulk.senators.length > 0 && yearVotingSessions.length > 0
    ? await computeSenadoAvgCostPerVote(
        ceapsBulk.senators,
        yearVotingSessions.length,
        salaryMonthsElapsed,
        currentYear,
      )
    : null

  // ── Red flags ─────────────────────────────────────────────────────
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

  // Supplier concentration: largest supplier > 70% of total
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
        actions={<CompareButton senatorId={id} year={currentYear} />}
      />

      <section className="mb-12 mt-10">
        <SectionHeader title="Dados pessoais" sourceUrl={detail._source} />
        <InfoPanel fields={personalFields} />
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10" id="resumo">
        <SectionHeader
          title="Resumo geral"
          description={`Custo do mandato e principais alertas para ${currentYear}.`}
        />
        <RedFlagsCard flags={redFlags} />
        <div className={redFlags.length > 0 ? "mt-4" : ""}>
          <RealMandateCostCard result={mandateCost} />
          <CostPerOutputSection
            metrics={costPerOutput.metrics}
            year={currentYear}
            propositionsCount={propositions.length}
            senateAvgCostPerVote={senateAvgCostPerVote}
            expenseSourceUrl={expenses._source}
          />
        </div>
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Mandatos"
          description="Histórico completo de mandatos no Senado Federal."
          sourceUrl={ENDPOINTS.SENADO_SENATOR_MANDATES(id)}
        />
        {mandates.length > 0 ? (
          <DataTable columns={mandateColumns} data={mandates} rowKey={(r) => r.id} />
        ) : (
          <EmptyState
            message="Nenhum mandato registrado"
            description="A API do Senado não retornou mandatos para este(a) senador(a)."
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Filiações partidárias"
          description="Histórico de filiações registrado pelo Senado Federal."
          sourceUrl={ENDPOINTS.SENADO_SENATOR_AFFILIATIONS(id)}
        />
        {affiliations.length > 0 ? (
          <DataTable
            columns={affiliationColumns}
            data={affiliations}
            rowKey={(r, i) => `${r.party}-${r.startDate}-${i}`}
          />
        ) : (
          <EmptyState
            message="Nenhuma filiação registrada"
            description="A API do Senado não retornou histórico de filiações partidárias."
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Proposições"
          description={`Matérias de autoria registradas em ${currentYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_PROCESS_SEARCH}?codigoParlamentarAutor=${id}&ano=${currentYear}`}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total apresentadas" value={String(propositions.length)} />
          <StatCard
            label="Aprovadas"
            value={String(propApproved)}
            badge={
              propApproved > 0
                ? { text: "no período", variant: "green" }
                : undefined
            }
          />
          <StatCard
            label="Tipo principal"
            value={propTypeBreakdown[0]?.name ?? "—"}
          />
          <StatCard
            label="Tipos diferentes"
            value={String(propTypeBreakdown.length)}
          />
        </div>
        {propositions.length > 0 ? (
          <DataTable
            columns={propositionColumns}
            data={propositions.slice(0, 8)}
            rowKey={(r) => r.id}
          />
        ) : (
          <EmptyState
            message="Nenhuma proposição em autoria"
            description={`Nenhuma matéria registrada como de autoria em ${currentYear}.`}
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10" id="votacoes">
        <SectionHeader
          title="Votações"
          description={`Votos nominais registrados em ${currentYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_VOTING}?codigoParlamentar=${id}&dataInicio=${currentYear}0101&dataFim=${currentYear}1231`}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total de votos"
            value={String(votes.length)}
            tooltip={
              yearVotingSessions.length > 0
                ? `Senado realizou ${yearVotingSessions.length} sessões de votação nominal em ${currentYear}.`
                : undefined
            }
          />
          <StatCard label="Votos 'Sim'" value={String(yesCount)} />
          <StatCard label="Votos 'Não'" value={String(noCount)} />
          <StatCard
            label="Alinhamento com vencedor"
            value={`${alignment}%`}
            tooltip="Percentual de vezes em que o senador votou no mesmo sentido do resultado final."
          />
        </div>
        {recentVotes.length > 0 ? (
          <DataTable columns={votingColumns} data={recentVotes} rowKey={(r) => r.sessionId} />
        ) : (
          <EmptyState
            message="Nenhum voto registrado"
            description={`A API do Senado não retornou votos para ${currentYear}.`}
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Discursos"
          description={`Pronunciamentos em ${currentYear}.`}
          sourceUrl={`${ENDPOINTS.SENADO_SENATOR_SPEECHES(id)}?dataInicio=${currentYear}0101&dataFim=${currentYear}1231`}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total de discursos" value={String(speeches.length)} />
          <StatCard
            label="Tipo principal"
            value={speeches[0]?.type ?? "—"}
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
        {recentSpeeches.length > 0 ? (
          <DataTable columns={speechColumns} data={recentSpeeches} rowKey={(r) => r.id} />
        ) : (
          <EmptyState
            message="Nenhum discurso registrado"
            description={`A API do Senado não retornou pronunciamentos para ${currentYear}.`}
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10" id="gastos-ceaps">
        <SectionHeader
          title="Gastos CEAPS"
          description={`Cota para o Exercício da Atividade Parlamentar dos Senadores em ${currentYear}.`}
          sourceUrl={ENDPOINTS.SENADO_CEAPS_BY_YEAR(currentYear)}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label={`Total reembolsado em ${currentYear}`}
            value={formatBRL(ceapsTotal)}
            tooltip={
              senateAvgCeaps !== null
                ? `Média do Senado em ${currentYear}: ${formatBRLCompact(senateAvgCeaps)}.`
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

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {ceapsByCategory.length > 0 && (
            <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card sm:p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Maiores categorias
              </h3>
              <ol className="space-y-2.5">
                {ceapsByCategory.slice(0, 6).map((c) => (
                  <li key={c.name} className="flex items-baseline justify-between gap-3">
                    <span className="line-clamp-2 text-sm text-gray-700">
                      {c.name || "—"}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-gray-900 tabular-nums">
                      {formatBRLCompact(c.value)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {ceapsBySupplier.length > 0 && (
            <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card sm:p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Maiores fornecedores
              </h3>
              <ol className="space-y-2.5">
                {ceapsBySupplier.map((s) => (
                  <li key={s.label} className="flex items-baseline justify-between gap-3">
                    <span className="line-clamp-2 text-sm text-gray-700">
                      {s.label || "—"}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-gray-900 tabular-nums">
                      {formatBRLCompact(s.value)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {expenses.length === 0 && (
          <EmptyState
            message="Nenhum gasto CEAPS registrado"
            description={`A API administrativa do Senado não retornou despesas para ${currentYear}.`}
          />
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10" id="presenca">
        <SectionHeader
          title="Presença em sessões plenárias"
          description={`Comparecimento em sessões deliberativas do Plenário em ${currentYear}.`}
          sourceUrl={attendance._source}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Sessões deliberativas"
            value={String(attendance.totalDeliberative)}
            tooltip="Total de sessões deliberativas realizadas no ano (denominador da taxa)."
          />
          <StatCard
            label="Comparecimentos"
            value={String(attendance.attended)}
          />
          <StatCard
            label="Taxa de presença"
            value={
              attendance.totalDeliberative > 0
                ? `${attendance.percentage.toFixed(1)}%`
                : "—"
            }
            tooltip={
              senateAvgAttendance !== null
                ? `Média do Senado em ${currentYear}: ${senateAvgAttendance}%.`
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
            description={`A API do Senado não retornou sessões plenárias deliberativas para ${currentYear}.`}
          />
        ) : (
          <div className="mt-5 text-right">
            <a
              href={`/senado/${id}/presenca`}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Ver detalhamento de presença →
            </a>
          </div>
        )}
      </section>

      <section className="mb-12 border-t border-gray-200/60 pt-10">
        <SectionHeader
          title="Comissões"
          description="Memberships ativas e cargos de direção."
          sourceUrl={ENDPOINTS.SENADO_SENATOR_COMMITTEES(id)}
        />
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Comissões ativas" value={String(activeCommittees.length)} />
          <StatCard label="Como Titular" value={String(titularCount)} />
          <StatCard label="Como Suplente" value={String(suplenteCount)} />
          <StatCard label="Cargos de direção" value={String(positions.length)} />
        </div>
        {activeCommittees.length > 0 ? (
          <DataTable
            columns={committeeColumns}
            data={activeCommittees}
            rowKey={(r) => r.id}
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

      <section className="mb-12 border-t border-gray-200/60 pt-10">
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
    </>
  )
}
