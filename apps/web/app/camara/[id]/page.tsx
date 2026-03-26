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
 * 4. Gastos CEAP — expense charts + link to full expenses listing
 * 5. Votações — voting history charts + alignment stats
 * 6. Presença — unified attendance: events, plenary, daily activity, hours/week
 * 7. Discursos — speech charts + link to speeches listing
 * 8. Comissões — committee charts + link to committees listing
 * 9. Frentes parlamentares — caucus count + link to listing
 * 10. Carreira política — previous mandates + status history timeline
 *
 * Data sources: 10 parallel API calls to the Câmara dos Deputados API.
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
} from "@imposterio/fetchers"
import { getEntityVoteStats, ensureGameCards } from "@imposterio/db/queries/game"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import { CompareButton } from "./CompareButton"
import { DeputyExpenseCharts } from "./DeputyExpenseCharts"
import { SpeechCharts, CommitteeCharts, VotingCharts } from "./DeputyOverviewCharts"
import { AttendanceOverviewCharts } from "./AttendanceOverviewCharts"
import { YearSelector } from "./YearSelector"
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
} from "./activity-utils"
import {
  filterPlenarySessions,
  isPlenarySession,
  aggregateByDay as aggregateAttendanceByDay,
  aggregateByEventType,
  countActiveDays,
  aggregateHoursPerWeek,
} from "./presenca/attendance-utils"

/** CEAP data is available from 2008 onward. */
const FIRST_CEAP_YEAR = 2008

interface DeputyDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}

export default async function DeputyDetailPage({ params, searchParams }: DeputyDetailPageProps) {
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
  ])

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

  // ── Activity aggregations ───────────────────────────────────────────

  const speechesByType = aggregateSpeechesByType(speeches)
  const speechesByMonth = aggregateSpeechesByMonth(speeches)
  const eventsByMonth = aggregateEventsByMonth(events)

  const activeCommittees = committees.filter((c) => !c.endDate)
  const committeesByRole = aggregateCommitteesByRole(activeCommittees)
  const committeesByType = aggregateCommitteesByType(activeCommittees)

  // ── Voting history aggregations ───────────────────────────────────
  const votesByType = aggregateVotesByType(votingHistory)
  const votesByMonth = aggregateVotesByMonth(votingHistory)
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
  const eventsUpcoming = events.filter((e) => e.status !== "Encerrada").length
  const eventsPlenaryCount = events.filter((e) => isPlenarySession(e.type)).length

  // Chart data for unified Presença section
  const allByDay = aggregateAttendanceByDay(attendanceDetail)
  const plenaryByDay = aggregateAttendanceByDay(plenaryEvents)
  const nonPlenaryDetailEvents = attendanceDetail.filter((e) => !isPlenarySession(e.eventType))
  const nonPlenaryByDay = aggregateAttendanceByDay(nonPlenaryDetailEvents)
  const attendanceByType = aggregateByEventType(attendanceDetail)
  const activeDays = countActiveDays(attendanceDetail)
  const hoursPerWeek = aggregateHoursPerWeek(events, selectedYear)

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

      {/* ── 2. Dados pessoais ──────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* ── 3. Resumo geral ────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader title="Resumo geral" />
        <p className="mb-4 text-sm text-gray-500">
          Principais indicadores de atividade parlamentar no ano selecionado.
        </p>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
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
      </section>

      {/* ── 4. Gastos CEAP ─────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title={<>Gastos <Acronym title="Cota para Exercício da Atividade Parlamentar">CEAP</Acronym></>}
          action={{ label: "Ver todas as despesas", href: `/camara/${id}/despesas?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Verba mensal que cada deputado recebe para custear despesas relacionadas ao mandato — passagens, combustível, hospedagem, alimentação, impressão, entre outros.
        </p>

        {failed.has("Despesas CEAP") ? (
          <DataFetchError label="as despesas CEAP" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Total"
                value={formatCurrency(totalCeap)}
                badge={ceapVariation !== null ? {
                  text: `${ceapVariation > 0 ? "+" : ""}${ceapVariation.toFixed(1)}% vs ${selectedYear - 1}`,
                  variant: ceapVariation > 5 ? "red" : ceapVariation < -5 ? "green" : "amber",
                } : undefined}
              />
              <StatCard
                label={`Total (${selectedYear - 1})`}
                value={formatCurrency(prevYearTotal)}
              />
              <StatCard
                label="Registros"
                value={String(expenses.length)}
              />
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
          />
        )}
          </>
        )}
      </section>

      {/* ── 5. Votações ────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Votações"
          action={{ label: "Ver todas as votações", href: `/camara/${id}/votacoes?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Participação em votações nominais em plenário. Indica como o deputado votou em cada sessão e se acompanhou o resultado final.
        </p>

        {failed.has("Votações") ? (
          <DataFetchError label="as votações" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Votações"
                value={String(votingHistory.length)}
              />
              <StatCard
                label="Sim"
                value={String(simCount)}
              />
              <StatCard
                label="Não"
                value={String(naoCount)}
              />
              <StatCard
                label="Abstenção"
                value={String(abstCount)}
              />
              <StatCard
                label="Alinhamento"
                value={`${voteAlignment}%`}
                badge={{ text: "com resultado", variant: voteAlignment >= 70 ? "green" : voteAlignment >= 40 ? "amber" : "red" }}
                tooltip="Frequência com que o deputado votou no lado vencedor — 'Sim' em aprovadas e 'Não' em rejeitadas. Abstenções e obstruções não são consideradas."
              />
            </div>

            {votingHistory.length > 0 && (
              <VotingCharts
                byType={votesByType}
                byMonth={votesByMonth}
                year={selectedYear}
                sourceUrl={votingHistory._source}
              />
            )}
          </>
        )}
      </section>

      {/* ── 5b. Presença ────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Presença"
          action={{ label: "Ver lista completa", href: `/camara/${id}/presenca?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Presença do deputado em todos os tipos de evento da Câmara no ano selecionado: sessões plenárias, comissões, audiências públicas, seminários, reuniões e outros. Os dados combinam o registro oficial de frequência com a lista de eventos.
        </p>

        {failed.has("Presença detalhada") || failed.has("Eventos") ? (
          <DataFetchError label="os dados de presença" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                label="Sessões plenárias"
                value={String(eventsPlenaryCount)}
                tooltip="Sessões Deliberativas, Solenes, Não Deliberativas e Preparatórias em que o deputado participou."
              />
              <StatCard
                label="Presença plenária"
                value={plenaryRate !== null ? `${plenaryRate}%` : "—"}
                tooltip={`Presente em ${plenaryAttended} das ${totalPlenarySessions} sessões plenárias realizadas na Câmara no ano.`}
              />
              <StatCard
                label="Encerrados"
                value={String(eventsFinished)}
                tooltip="Eventos que já foram realizados e encerrados."
              />
              <StatCard
                label="Previstos/em andamento"
                value={String(eventsUpcoming)}
                tooltip="Eventos futuros para os quais o deputado está convocado ou que estão em andamento."
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
          />
        )}
          </>
        )}
      </section>

      {/* ── 6. Discursos ───────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Discursos"
          action={{ label: "Ver todos os discursos", href: `/camara/${id}/discursos?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Pronunciamentos realizados em plenário, comissões e outros eventos legislativos. Inclui discursos pela ordem, breves comunicações, grande expediente e outros tipos de manifestação.
        </p>

        {failed.has("Discursos") ? (
          <DataFetchError label="os discursos" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Total"
                value={String(speeches.length)}
              />
              <StatCard
                label="Tipo mais frequente"
                value={speechesByType[0]?.name ?? "—"}
              />
              <StatCard
                label="Mês mais ativo"
                value={getMostActiveMonth(speechesByMonth)}
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
          </>
        )}
      </section>

      {/* ── 7. Comissões ───────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Comissões"
          action={{ label: "Ver todas as comissões", href: `/camara/${id}/comissoes?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Órgãos colegiados onde proposições são analisadas antes da votação em plenário. Deputados atuam como titulares, suplentes ou em cargos de liderança (presidente, relator).
        </p>

        {failed.has("Comissões") ? (
          <DataFetchError label="as comissões" />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

            {activeCommittees.length > 0 && (
              <CommitteeCharts
                byRole={committeesByRole}
                byType={committeesByType}
                sourceUrl={committees._source}
              />
            )}
          </>
        )}
      </section>

      {/* ── 8. Frentes parlamentares ───────────────────────────────── */}
      <section className="mb-12">
        <SectionHeader
          title="Frentes parlamentares"
          action={{ label: "Ver todas as frentes", href: `/camara/${id}/frentes?ano=${selectedYear}` }}
        />
        <p className="mb-4 text-sm text-gray-500">
          Grupos suprapartidários formados em torno de interesses comuns — agropecuária, direitos humanos, tecnologia, entre outros. Não possuem poder legislativo mas coordenam esforços e eventos.
        </p>

        {failed.has("Frentes parlamentares") ? (
          <DataFetchError label="as frentes parlamentares" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Frentes"
              value={String(caucuses.length)}
              badge={{ text: `${deputy.legislature}ª Legislatura`, variant: "gray" }}
            />
          </div>
        )}
      </section>

      {/* ── 9. Carreira política ───────────────────────────────────── */}
      {(previousMandates.length > 0 || history.length > 1) && (
        <section className="mb-12">
          <SectionHeader title="Carreira política" />
          <p className="mb-4 text-sm text-gray-500">
            Histórico de mandatos eletivos anteriores (dados do TSE) e mudanças de status parlamentar na legislatura atual — trocas de partido, licenças e afastamentos.
          </p>

          {/* Previous mandates */}
          {previousMandates.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Mandatos anteriores</h3>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {previousMandates.map((m) => (
                  <div
                    key={`${m.office}-${m.startYear}`}
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
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <ol className="relative border-l border-gray-200 ml-3">
                  {history.map((entry, i) => (
                    <li key={`${entry.date}-${i}`} className="mb-6 ml-6 last:mb-0">
                      <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-accent ring-4 ring-white" />
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

/** Finds the month label with the highest count. */
function getMostActiveMonth(byMonth: Array<{ label: string; value: number }>): string {
  const max = byMonth.reduce((a, b) => (b.value > a.value ? b : a), { label: "—", value: 0 })
  return max.value > 0 ? `${max.label} (${max.value})` : "—"
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR")
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
