/**
 * @file page.tsx
 * @description Staff overview page for the Câmara dos Deputados.
 *
 * Displays a comprehensive overview of all Chamber staff, including:
 * 1. Summary StatCards — total staff, top group counts
 * 2. Distribution charts — by group, department, position, role
 * 3. Latest records table with link to full listing
 *
 * The Câmara publishes a bulk JSON file with ~15,000 staff records covering
 * permanent civil servants (Quadro Efetivo), parliamentary secretaries,
 * special positions, and current deputies listed as "Parlamentar".
 *
 * Data source: dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json
 */

import Link from "next/link"
import { StatCard, SectionHeader, Badge, DataTable, SourcePill, ToastTrigger, DataFetchError } from "@/components/ui"
import { getStaffBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { CamaraStaffMember, StaffBulkSummary } from "@imposterio/types"
import { StaffCharts } from "./StaffCharts"

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

export default async function CamaraFuncionariosPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const staff = await collectErrors(
    () => getStaffBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Funcionários",
    failed,
  )

  const { totalStaff, byGroup, byDepartment, byPosition, byRole, members } = staff

  // Top 3 groups for the StatCards row
  const topGroups = byGroup.slice(0, 3)

  /** Returns a tooltip description for a staff group based on its name. */
  function groupTooltip(name: string): string | undefined {
    if (name.includes("Efetivo")) return "Servidores concursados do quadro permanente da Câmara (regime RJU)."
    if (name.includes("Secretário")) return "Funcionários nomeados pelos deputados para trabalhar em seus gabinetes."
    if (name.includes("Parlamentar")) return "Os próprios deputados federais em exercício na legislatura atual."
    if (name.includes("Especial")) return "Cargos de livre nomeação para funções de direção, chefia ou assessoramento."
    return undefined
  }

  // Latest 8 records sorted by history start date (newest first)
  const latest8 = [...members]
    .sort((a, b) => new Date(b.historyStartDate).getTime() - new Date(a.historyStartDate).getTime())
    .slice(0, 8)

  const columns = [
    {
      header: "Nome",
      cell: (r: CamaraStaffMember) => (
        <Link
          href={`/camara/funcionarios/${r.id}`}
          className="font-medium text-gray-900 hover:text-accent transition-colors"
        >
          {r.name}
        </Link>
      ),
    },
    {
      header: "Cargo",
      className: "max-w-[12rem]",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs">{r.position || "—"}</span>
      ),
    },
    {
      header: "Lotação",
      className: "max-w-[14rem]",
      cell: (r: CamaraStaffMember) => (
        <span className="text-gray-600 text-xs truncate block">{r.department || "—"}</span>
      ),
    },
    {
      header: "Grupo",
      cell: (r: CamaraStaffMember) => {
        const variant = r.group.includes("Parlamentar")
          ? "green"
          : r.group.includes("Efetivo")
            ? "gray"
            : r.group.includes("Secretário")
              ? "amber"
              : "gray"
        return <Badge variant={variant as "green" | "gray" | "amber"}>{r.group}</Badge>
      },
    },
    {
      header: "",
      align: "right" as const,
      cell: (r: CamaraStaffMember) => (
        <Link
          href={`/camara/funcionarios/${r.id}`}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Detalhes →
        </Link>
      ),
    },
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
                href="/camara"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar à Câmara
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Funcionários da Câmara
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Quadro completo de servidores, secretários parlamentares e cargos especiais.
              </p>
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
        <DataFetchError label="os funcionários" />
      ) : (
        <>
          {/* Summary stats */}
          <section className="mb-12">
            <SectionHeader title="Resumo geral" sourceUrl={staff._source} />
            <div className="rounded-2xl bg-gray-50/60 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total de funcionários" value={totalStaff.toLocaleString("pt-BR")} tooltip="Total de pessoas registradas no quadro funcional da Câmara, incluindo servidores efetivos, secretários parlamentares, cargos especiais e os próprios parlamentares." />
                {topGroups.map((g) => (
                  <StatCard key={g.name} label={g.name} value={g.count.toLocaleString("pt-BR")} tooltip={groupTooltip(g.name)} />
                ))}
              </div>
            </div>
          </section>

          {/* Charts */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader title="Distribuição" sourceUrl={staff._source} />
            <StaffCharts
              byGroup={byGroup}
              byDepartment={byDepartment.slice(0, 15)}
              byPosition={byPosition.slice(0, 15)}
              byRole={byRole.slice(0, 15)}
              sourceUrl={staff._source}
            />
          </section>

          {/* Latest records table */}
          <section className="mb-12 border-t border-gray-200/60 pt-10">
            <SectionHeader
              title="Últimos registros"
              sourceUrl={staff._source}
              action={{ label: "Ver todos", href: "/camara/funcionarios/lista" }}
            />
            <DataTable columns={columns} data={latest8} rowKey={(r) => r.id} />
          </section>
        </>
      )}
    </>
  )
}
