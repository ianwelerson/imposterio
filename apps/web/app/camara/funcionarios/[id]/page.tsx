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
import { SectionHeader, InfoPanel, Badge, SourcePill, ToastTrigger } from "@/components/ui"
import { getStaffBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { StaffBulkSummary } from "@imposterio/types"

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
  const staff = await collectErrors(
    () => getStaffBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Funcionários",
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
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/camara/funcionarios/lista"
                className="mb-3 inline-block text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                ← Voltar aos Funcionários
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
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

      {/* Deputy link — shown when staff member is associated with a deputy */}
      {deputyId && (
        <section className="mb-12">
          <SectionHeader title="Vínculo parlamentar" sourceUrl={staff._source} />
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Gabinete: {member.department}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Este funcionário está lotado no gabinete de um(a) deputado(a) federal.
                </p>
              </div>
              <Link
                href={`/camara/${deputyId}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                Ver perfil do deputado →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Staff details */}
      <section className="mb-12">
        <SectionHeader title="Dados do funcionário" sourceUrl={staff._source} />
        <InfoPanel fields={infoFields} />
      </section>
    </>
  )
}
