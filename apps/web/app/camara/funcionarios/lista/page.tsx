/**
 * @file page.tsx
 * @description Full listing of all Câmara staff members.
 *
 * Displays a searchable, filterable, paginated table of ~15,000 staff records
 * from the Chamber's bulk staff file. Users can search by name, position,
 * department, or role, and filter by group type or department.
 *
 * Data source: dadosabertos.camara.leg.br/arquivos/funcionarios/json/funcionarios.json
 */

import Link from "next/link"
import { ToastTrigger, SourcePill, DataFetchError } from "@/components/ui"
import { getStaffBulk } from "@imposterio/fetchers"
import { collectErrors, emptySourced, type PageError } from "@/lib/error-utils"
import type { StaffBulkSummary } from "@imposterio/types"
import { StaffSearchList } from "./StaffSearchList"

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

export default async function FuncionariosListaPage() {
  const errors: PageError[] = []
  const failed = new Set<string>()

  const staff = await collectErrors(
    () => getStaffBulk(),
    emptySourced(EMPTY_SUMMARY),
    errors,
    "Funcionários",
    failed,
  )

  return (
    <>
      {errors.length > 0 && <ToastTrigger errors={errors} />}

      <header className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/camara/funcionarios"
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                ← Voltar aos Funcionários
              </Link>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Listagem de Funcionários
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                {staff.totalStaff.toLocaleString("pt-BR")} funcionários registrados no quadro da Câmara dos Deputados.
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
        <StaffSearchList members={staff.members} />
      )}
    </>
  )
}
