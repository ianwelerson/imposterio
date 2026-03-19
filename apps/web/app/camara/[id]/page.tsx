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
 * 5. Discursos — speech charts + link to speeches listing
 * 6. Eventos — event charts + link to events listing
 * 7. Comissões — committee charts + link to committees listing
 * 8. Frentes parlamentares — caucus count + link to listing
 * 9. Carreira política — previous mandates + status history timeline
 *
 * Data sources: 10 parallel API calls to the Câmara dos Deputados API.
 */

import Link from "next/link"
import {
  StatCard, SectionHeader,
  ProfileHeader, InfoPanel, Badge,
} from "@/components/ui"
import {
  getDeputyDetail, getDeputyExpenses,
  getDeputyCommittees, getDeputyCaucuses,
  getDeputySpeeches, getDeputyEvents,
  getDeputyPreviousMandates, getDeputyHistory, getDeputyProfessions,
} from "@imposterio/fetchers"
import { DeputyExpenseCharts } from "./DeputyExpenseCharts"
import { SpeechCharts, EventCharts, CommitteeCharts } from "./DeputyOverviewCharts"
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
  aggregateEventsByType,
  aggregateEventsByMonth,
  aggregateCommitteesByRole,
  aggregateCommitteesByType,
} from "./activity-utils"

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

  const [
    deputy, expenses, prevYearExpenses,
    committees, caucuses,
    speeches, events,
    previousMandates, history, professions,
  ] = await Promise.all([
    getDeputyDetail(id),
    getDeputyExpenses(id, selectedYear),
    getDeputyExpenses(id, selectedYear - 1),
    getDeputyCommittees(id),
    getDeputyCaucuses(id),
    getDeputySpeeches(id, yearStart, yearEnd),
    getDeputyEvents(id, yearStart, yearEnd),
    getDeputyPreviousMandates(id),
    getDeputyHistory(id),
    getDeputyProfessions(id),
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
    deputy.email && { label: "E-mail", value: deputy.email },
    deputy.office && { label: "Gabinete", value: deputy.office },
    deputy.phone && { label: "Telefone", value: deputy.phone },
  ].filter(Boolean) as Array<{ label: string; value: string }>

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
  const eventsByType = aggregateEventsByType(events)
  const eventsByMonth = aggregateEventsByMonth(events)

  const activeCommittees = committees.filter((c) => !c.endDate)
  const committeesByRole = aggregateCommitteesByRole(activeCommittees)
  const committeesByType = aggregateCommitteesByType(activeCommittees)

  // Count events by status
  const eventsFinished = events.filter((e) => e.status === "Encerrada").length
  const eventsUpcoming = events.filter((e) => e.status !== "Encerrada").length

  return (
    <>
      {/* ── 1. Profile header ──────────────────────────────────────── */}
      <ProfileHeader
        initials={initials}
        name={deputy.name}
        tags={tags}
        sourceUrl={deputy._source}
        photoUrl={deputy.photoUrl}
      />

      {/* ── 2. Dados pessoais ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Dados pessoais" />
        <InfoPanel fields={infoFields} />
      </section>

      {/* ── Global year selector ───────────────────────────────────── */}
      <div className="mt-10 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Atividade parlamentar</h2>
          <p className="text-sm text-gray-500">
            Dados filtrados por ano. Selecione o período para visualizar.
          </p>
        </div>
        <YearSelector years={availableYears} selected={selectedYear} />
      </div>

      {/* ── 3. Resumo geral ────────────────────────────────────────── */}
      <section className="mb-10">
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
          aria-label="Resumo geral"
        >
          <StatCard
            label="Despesas CEAP"
            value={formatCurrency(totalCeap)}
          />
          <StatCard
            label="Discursos"
            value={String(speeches.length)}
          />
          <StatCard
            label="Eventos"
            value={String(events.length)}
          />
          <StatCard
            label="Comissões ativas"
            value={String(activeCommittees.length)}
          />
          <StatCard
            label="Frentes"
            value={String(caucuses.length)}
          />
          <StatCard
            label="Registros CEAP"
            value={String(expenses.length)}
          />
        </div>
      </section>

      {/* ── 4. Gastos CEAP ─────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Gastos CEAP</h2>
            <Link
              href={`/camara/${id}/despesas?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todas as despesas →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            A Cota para Exercício da Atividade Parlamentar (CEAP) é a verba mensal que cada deputado recebe para custear despesas relacionadas ao mandato — passagens, combustível, hospedagem, alimentação, impressão, entre outros.
          </p>
        </div>

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
      </section>

      {/* ── 5. Discursos ───────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Discursos</h2>
            <Link
              href={`/camara/${id}/discursos?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todos os discursos →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Pronunciamentos realizados em plenário, comissões e outros eventos legislativos. Inclui discursos pela ordem, breves comunicações, grande expediente e outros tipos de manifestação.
          </p>
        </div>

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
      </section>

      {/* ── 6. Eventos ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Eventos</h2>
            <Link
              href={`/camara/${id}/eventos?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todos os eventos →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Sessões plenárias, audiências públicas e reuniões de comissões em que o deputado participou ou está convocado. Cada evento inclui os órgãos organizadores e o link para a gravação quando disponível.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={String(events.length)}
          />
          <StatCard
            label="Encerrados"
            value={String(eventsFinished)}
          />
          <StatCard
            label="Previstos/em andamento"
            value={String(eventsUpcoming)}
          />
        </div>

        {events.length > 0 && (
          <EventCharts
            byType={eventsByType}
            byMonth={eventsByMonth}
            year={selectedYear}
            sourceUrl={events._source}
          />
        )}
      </section>

      {/* ── 7. Comissões ───────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Comissões</h2>
            <Link
              href={`/camara/${id}/comissoes?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todas as comissões →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Órgãos colegiados onde proposições são analisadas antes da votação em plenário. Deputados atuam como titulares, suplentes ou em cargos de liderança (presidente, relator).
          </p>
        </div>

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
      </section>

      {/* ── 8. Frentes parlamentares ───────────────────────────────── */}
      <section className="mb-10">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Frentes parlamentares</h2>
            <Link
              href={`/camara/${id}/frentes?ano=${selectedYear}`}
              className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Ver todas as frentes →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Grupos suprapartidários formados em torno de interesses comuns — agropecuária, direitos humanos, tecnologia, entre outros. Não possuem poder legislativo mas coordenam esforços e eventos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Frentes"
            value={String(caucuses.length)}
            badge={{ text: `${deputy.legislature}ª Legislatura`, variant: "gray" }}
          />
        </div>
      </section>

      {/* ── 9. Carreira política ───────────────────────────────────── */}
      {(previousMandates.length > 0 || history.length > 1) && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Carreira política</h2>
            <p className="mt-1 text-sm text-gray-500">
              Histórico de mandatos eletivos anteriores (dados do TSE) e mudanças de status parlamentar na legislatura atual — trocas de partido, licenças e afastamentos.
            </p>
          </div>

          {/* Previous mandates */}
          {previousMandates.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Mandatos anteriores</h3>
              <div className="rounded-lg border border-gray-200/60 bg-white divide-y divide-gray-100">
                {previousMandates.map((m) => (
                  <div
                    key={`${m.office}-${m.startYear}`}
                    className="flex items-center justify-between px-5 py-3"
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
              <div className="rounded-lg border border-gray-200/60 bg-white p-5">
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
