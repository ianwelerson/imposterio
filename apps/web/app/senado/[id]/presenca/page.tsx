/**
 * @file page.tsx
 * @description Full plenary attendance listing page for a senator.
 *
 * Shows a complete table of every plenary session in the year and whether
 * the senator was present. Charts (CalendarHeatmap, monthly bar) and
 * summary stats are on the senator detail page; this subroute focuses on
 * the session-by-session detail.
 *
 * Data sources:
 * - Composed from twelve `/plenario/resultado/mes/{YYYYMM}` calls aggregated
 *   under `sen:attendance:bulk:{year}` in Redis.
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getSenatorDetail,
  getSenatorAttendanceDetail,
  ApiError,
} from "@imposterio/fetchers"
import { DataFetchError, SourcePill, ToastTrigger, StatCard } from "@/components/ui"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { SenatorAttendanceDetail } from "@imposterio/types"
import { computeLongestAbsenceStreak } from "./absence-streaks"
import { AttendanceList } from "./AttendanceList"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDate(iso: string): string {
  if (!iso) return ""
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR")
}

export default async function SenatorAttendancePage({ params }: PageProps) {
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

  const attendance = await collectErrors(
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
    "Presença detalhada",
    failed,
  )

  const attendedDates = new Set(
    attendance.sessions.filter((s) => s.attended).map((s) => s.date),
  )
  const longestAbsence = computeLongestAbsenceStreak(attendedDates, currentYear)

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={`/senado/${id}`}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar para {detail.name}
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Presença</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Comparecimento em sessões plenárias do Senado Federal — {currentYear}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <SourcePill url={attendance._source} />
            </div>
          </div>
        </div>
      </header>

      <section className="mb-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Sessões deliberativas"
            value={String(attendance.totalDeliberative)}
            tooltip="Total de sessões deliberativas (denominador da taxa de presença)."
          />
          <StatCard
            label="Comparecimentos"
            value={String(attendance.attended)}
          />
          <StatCard
            label="Faltas"
            value={String(attendance.missed)}
          />
          <StatCard
            label="Taxa de presença"
            value={
              attendance.totalDeliberative > 0
                ? `${attendance.percentage.toFixed(1)}%`
                : "—"
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
        </div>
        {longestAbsence && (
          <p className="mt-4 text-sm text-gray-600">
            Maior sequência sem presença em dias úteis:{" "}
            <span className="font-medium text-gray-900">
              {longestAbsence.days} dias
            </span>{" "}
            (de {formatDate(longestAbsence.startDate)} a{" "}
            {formatDate(longestAbsence.endDate)})
            {longestAbsence.isExtendedWeekend && " — padrão de feriadão"}.
          </p>
        )}
      </section>

      <section className="mb-12">
        {failed.has("Presença detalhada") ? (
          <DataFetchError label="os dados de presença" />
        ) : (
          <AttendanceList sessions={attendance.sessions} />
        )}
      </section>
    </>
  )
}
