/**
 * @file page.tsx
 * @description Full listing of all cabinet ministers (Ministros de Estado).
 *
 * Displays a table of all current ministers of the federal executive:
 * name, ministry, appointment date, declared assets, monthly compensation,
 * and a link to each minister's individual detail page.
 *
 * Data sources:
 * - Portal da Transparência: https://api.portaldatransparencia.gov.br/api-de-dados
 * - TSE asset declarations: https://divulgacandcontas.tse.jus.br
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, AvatarInitials, SectionHeader } from "@/components/ui"

interface MinisterRow {
  id: string
  initials: string
  name: string
  ministry: string
  since: string
  compensation: string
  declaredAssets: string
}

const MOCK_MINISTERS: MinisterRow[] = [
  { id: "m1", initials: "FH", name: "Fernando Haddad", ministry: "Ministério da Fazenda", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 2.100.000" },
  { id: "m2", initials: "RS", name: "Rui Costa", ministry: "Ministério da Casa Civil", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 3.450.000" },
  { id: "m3", initials: "NL", name: "Nísia Trindade", ministry: "Ministério da Saúde", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 1.850.000" },
  { id: "m4", initials: "CI", name: "Camilo Santana", ministry: "Ministério da Educação", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 4.200.000" },
  { id: "m5", initials: "JM", name: "José Múcio Monteiro", ministry: "Ministério da Defesa", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 8.900.000" },
  { id: "m6", initials: "MG", name: "Marina Silva", ministry: "Ministério do Meio Ambiente", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 320.000" },
  { id: "m7", initials: "ST", name: "Simone Tebet", ministry: "Min. Planejamento e Orçamento", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 5.600.000" },
  { id: "m8", initials: "LM", name: "Luiz Marinho", ministry: "Ministério do Trabalho", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 1.200.000" },
  { id: "m9", initials: "RF", name: "Renan Filho", ministry: "Min. Transportes", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 12.400.000" },
  { id: "m10", initials: "AJ", name: "Anielle Franco", ministry: "Min. Igualdade Racial", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 480.000" },
  { id: "m11", initials: "WV", name: "Wellington Dias", ministry: "Min. Desenvolvimento Social", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 3.100.000" },
  { id: "m12", initials: "GP", name: "Geraldo Alckmin", ministry: "Min. Indústria e Comércio (MDIC)", since: "01/01/2023", compensation: "R$ 41.650,92", declaredAssets: "R$ 7.200.000" },
]

const columns = [
  {
    header: "Ministro(a)",
    cell: (r: MinisterRow) => (
      <div className="flex items-center gap-3">
        <AvatarInitials initials={r.initials} />
        <span className="font-medium text-gray-900">{r.name}</span>
      </div>
    ),
  },
  { header: "Ministério", cell: (r: MinisterRow) => <span className="text-gray-600">{r.ministry}</span> },
  { header: "Posse", cell: (r: MinisterRow) => <span className="text-gray-500">{r.since}</span> },
  { header: "Remuneração", align: "right" as const, cell: (r: MinisterRow) => <span className="font-semibold text-gray-900">{r.compensation}</span> },
  { header: "Patrimônio", align: "right" as const, cell: (r: MinisterRow) => <span className="text-gray-600">{r.declaredAssets}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: MinisterRow) => (
      <Link href={`/executivo/ministros/${r.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function MinistrosPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Ministros de Estado</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title={`${MOCK_MINISTERS.length} ministros em exercício`}
        action={{ label: "← Voltar ao Executivo", href: "/executivo" }}
      />

      <DataTable columns={columns} data={MOCK_MINISTERS} rowKey={(r) => r.id} />
    </>
  )
}
