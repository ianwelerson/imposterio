/**
 * @file page.tsx
 * @description Individual staff member detail page for the Câmara dos Deputados.
 *
 * Displays all available information about a single staff member, including
 * group, position, department, role, appointment details, and history dates.
 *
 * For staff members in the "Parlamentar" group whose departmentUri contains
 * a deputy reference, a direct link to the deputy's profile page is shown.
 *
 * Data is fetched from the bulk staff file and the matching member is found
 * by their staff ID (ponto code).
 *
 * Data source: dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json
 */

import { notFound } from "next/navigation"
import Link from "next/link"
import { SectionHeader, InfoPanel, Badge, SourcePill, ToastTrigger, DataFetchError } from "@/components/ui"
import { getStaffBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { StaffBulkSummary } from "@imposterio/types"
import {
  lookupCargoSalary,
  CNE_REPRESENTACAO_MENSAL,
  VERBA_DE_GABINETE_TOTAL,
  SECRETARIO_PARLAMENTAR_BONUS_MAX,
} from "@/lib/constants/camara"

/** Empty summary fallback when the fetcher fails. */
const EMPTY_SUMMARY: StaffBulkSummary = {
  totalStaff: 0,
  byGroup: [],
  byDepartment: [],
  byPosition: [],
  byRole: [],
  members: [],
  lastUpdated: "",
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Extracts the deputy ID from a departmentUri containing `/deputados/{id}`.
 * Returns null if the URI does not match the pattern.
 */
function extractDeputyId(departmentUri: string): string | null {
  const match = departmentUri.match(/\/deputados\/(\d+)/)
  return match ? match[1] : null
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params

  const errors: PageError[] = []
  const failed = new Set<string>()
  const staff = await collectErrors(
    () => getStaffBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Funcionários",
    failed,
  )

  // Find the member by their ID (ponto code)
  const member = staff.members.find((m) => m.id === id)

  if (!member) {
    notFound()
  }

  const deputyId = extractDeputyId(member.departmentUri)

  // Badge variant based on group type
  const groupVariant = member.group.includes("Parlamentar")
    ? "green"
    : member.group.includes("Efetivo")
      ? "gray"
      : member.group.includes("Secretário")
        ? "amber"
        : "gray"

  // Build info panel fields — only include non-empty values
  const infoFields = [
    { label: "Grupo", value: member.group },
    { label: "Cargo", value: member.position || "Não informado" },
    { label: "Lotação", value: member.department || "Não informado" },
    { label: "Função", value: member.role || "Não informado" },
    ...(member.appointmentDate
      ? [{ label: "Data de nomeação", value: new Date(member.appointmentDate).toLocaleDateString("pt-BR") }]
      : []),
    ...(member.appointmentAct
      ? [{ label: "Ato de nomeação", value: member.appointmentAct }]
      : []),
    ...(member.appointmentPublicationDate
      ? [{ label: "Publicação da nomeação", value: new Date(member.appointmentPublicationDate).toLocaleDateString("pt-BR") }]
      : []),
    { label: "Início do histórico", value: new Date(member.historyStartDate).toLocaleDateString("pt-BR") },
  ]

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      {/* Hero header */}
      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/camara/funcionarios/lista"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar aos Funcionários
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {member.name}
                </h1>
                <Badge variant={groupVariant as "green" | "gray" | "amber"}>{member.group}</Badge>
              </div>
              {member.position && (
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {member.position}
                </p>
              )}
            </div>
            {staff._source && (
              <div className="shrink-0">
                <SourcePill url={staff._source} />
              </div>
            )}
          </div>
        </div>
      </header>

      {failed.has("Funcionários") ? (
        <DataFetchError label="os dados do funcionário" />
      ) : (
        <>
          {/* Deputy link — shown when staff member is associated with a deputy */}
          {deputyId && (
            <section className="mb-12">
              <SectionHeader
                title="Vínculo parlamentar"
                description="Este funcionário está lotado no gabinete de um(a) deputado(a) federal."
                sourceUrl={staff._source}
              />
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-900">
                    Gabinete: {member.department}
                  </p>
                  <Link
                    href={`/camara/${deputyId}`}
                    prefetch={false}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                  >
                    Ver perfil do deputado →
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Staff details */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Dados do funcionário" sourceUrl={staff._source} />
            <InfoPanel fields={infoFields} />
          </section>

          {/* Salary context */}
          <SalarySection position={member.position} group={member.group} />
        </>
      )}
    </>
  )
}

// ── Salary context section ─────────────────────────────────────────

const PL_179_URL =
  "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3081387&filename=REDACAO+FINAL+PL+179%2F2026"
const VERBA_GABINETE_URL =
  "https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/verba-de-gabinete"
const TRANSPARENCIA_RH_URL =
  "https://www.camara.leg.br/transparencia/recursos-humanos/funcionarios"

const formatBrl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/**
 * Displays salary context for the staff member based on their cargo code.
 * Shows base salary from Lei 15.349/2026, plus group-specific notes.
 */
function SalarySection({ position, group }: { position: string; group: string }) {
  const salary = lookupCargoSalary(position)
  if (!salary) return null

  const isSecretario = group.includes("Secretário")
  const isCne = salary.tabela === "II"
  const cneAllowance = isCne ? CNE_REPRESENTACAO_MENSAL[salary.key] : undefined

  return (
    <section className="mb-12 border-t border-gray-200/60 pt-10">
      <SectionHeader title="Remuneração base" />

      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-card space-y-4">
        {/* Base salary */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold tracking-tight text-gray-900">
            {salary.range
              ? `${formatBrl(salary.range.min)} – ${formatBrl(salary.range.max)}`
              : formatBrl(salary.baseSalary)}
          </span>
          <span className="text-sm text-gray-500">/ mês</span>
          <SourcePill url={PL_179_URL} />
        </div>

        {salary.range && (
          <p className="text-xs text-gray-500">
            Faixa salarial para {salary.key} (classes A/B/Especial, padrões 1–10).
            O nível exato não consta nos dados abertos.
          </p>
        )}

        {/* CNE additional allowance */}
        {isCne && cneAllowance && (
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Representação mensal:</span>{" "}
              {formatBrl(cneAllowance)}
              <span className="text-gray-500"> (paga além do vencimento básico)</span>
            </p>
          </div>
        )}

        {/* General disclaimer */}
        <p className="text-xs leading-relaxed text-gray-500">
          Este é o salário base (vencimento básico). O salário final pode ser até 100% maior
          dependendo do cargo e tempo de serviço.
        </p>

        {/* Secretário Parlamentar specific notes */}
        {isSecretario && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Gratificação de gabinete:</span>{" "}
              deputados podem adicionar uma gratificação de até{" "}
              {Math.round(SECRETARIO_PARLAMENTAR_BONUS_MAX * 100)}% do salário base.
            </p>
            <p className="text-sm text-gray-700">
              O valor máximo mensal para este cargo está limitado ao teto da Verba de Gabinete
              do deputado:{" "}
              <span className="font-semibold">{formatBrl(VERBA_DE_GABINETE_TOTAL)}</span>
              <span className="ml-1.5 inline-flex"><SourcePill url={VERBA_GABINETE_URL} /></span>
            </p>
            <p className="text-xs text-gray-500">
              O salário real deste funcionário é público, mas está disponível apenas
              no Portal de Transparência da Câmara, não nas APIs de dados abertos.{" "}
              <a
                href={TRANSPARENCIA_RH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover underline underline-offset-2"
              >
                Ver no Portal de Transparência →
              </a>
              <span className="ml-1.5 inline-flex"><SourcePill url={TRANSPARENCIA_RH_URL} /></span>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
