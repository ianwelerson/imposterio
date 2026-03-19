/**
 * @file page.tsx
 * @description Full listing of magistrates across Brazilian courts.
 *
 * Displays a table of judges and justices from different courts:
 * name, court, rank, monthly compensation, active cases, years on bench,
 * and a link to each magistrate's detail page.
 *
 * Data sources:
 * - CNJ DataJud: https://api-publica.datajud.cnj.jus.br
 * - Court transparency portals (compensation data)
 *
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, SectionHeader, Badge } from "@/components/ui"

interface MagistrateRow {
  id: string
  name: string
  court: string
  rank: string
  compensation: string
  activeCases: string
  yearsSince: number
}

const MOCK_MAGISTRATES: MagistrateRow[] = [
  { id: "j1", name: "Min. João Silva Neto", court: "STF", rank: "Ministro", compensation: "R$ 46.366,19", activeCases: "384", yearsSince: 12 },
  { id: "j2", name: "Min. Cláudia Marques", court: "STF", rank: "Ministra", compensation: "R$ 46.366,19", activeCases: "412", yearsSince: 8 },
  { id: "j3", name: "Min. Ricardo Lewandowski", court: "STJ", rank: "Ministro", compensation: "R$ 43.712,00", activeCases: "9.450", yearsSince: 15 },
  { id: "j4", name: "Min. Laura Salgado", court: "STJ", rank: "Ministra", compensation: "R$ 43.712,00", activeCases: "8.230", yearsSince: 6 },
  { id: "j5", name: "Min. Paulo Teixeira", court: "TST", rank: "Ministro", compensation: "R$ 39.850,00", activeCases: "5.120", yearsSince: 10 },
  { id: "j6", name: "Des. Fernanda Oliveira", court: "TRF1", rank: "Desembargadora", compensation: "R$ 35.919,85", activeCases: "7.180", yearsSince: 14 },
  { id: "j7", name: "Des. Marcos Aurélio Lima", court: "TRF3", rank: "Desembargador", compensation: "R$ 35.462,30", activeCases: "6.870", yearsSince: 18 },
  { id: "j8", name: "Des. Ana Cristina Pereira", court: "TJSP", rank: "Desembargadora", compensation: "R$ 32.004,77", activeCases: "7.290", yearsSince: 20 },
  { id: "j9", name: "Des. Roberto Carvalho", court: "TJSP", rank: "Desembargador", compensation: "R$ 32.004,77", activeCases: "6.540", yearsSince: 16 },
  { id: "j10", name: "Des. Juliana Matos", court: "TJRJ", rank: "Desembargadora", compensation: "R$ 31.850,00", activeCases: "10.230", yearsSince: 13 },
  { id: "j11", name: "Juiz Thiago Neves", court: "TJMG", rank: "Juiz de Direito", compensation: "R$ 28.420,00", activeCases: "4.560", yearsSince: 9 },
  { id: "j12", name: "Juíza Letícia Borges", court: "TJRS", rank: "Juíza de Direito", compensation: "R$ 27.890,00", activeCases: "3.870", yearsSince: 7 },
]

const courtBadgeVariant = (court: string): "red" | "green" | "amber" => {
  if (court === "STF") return "red"
  if (court === "STJ" || court === "TST") return "amber"
  return "green"
}

const columns = [
  {
    header: "Magistrado(a)",
    cell: (r: MagistrateRow) => <span className="font-medium text-gray-900">{r.name}</span>,
  },
  {
    header: "Tribunal",
    cell: (r: MagistrateRow) => <Badge variant={courtBadgeVariant(r.court)}>{r.court}</Badge>,
  },
  { header: "Cargo", cell: (r: MagistrateRow) => <span className="text-gray-600">{r.rank}</span> },
  { header: "Remuneração", align: "right" as const, cell: (r: MagistrateRow) => <span className="font-semibold text-gray-900">{r.compensation}</span> },
  { header: "Processos", align: "right" as const, cell: (r: MagistrateRow) => <span className="text-gray-600">{r.activeCases}</span> },
  { header: "Anos", align: "right" as const, cell: (r: MagistrateRow) => <span className="text-gray-500">{r.yearsSince}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: MagistrateRow) => (
      <Link href={`/judiciario/${r.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function MagistradosPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Magistrados</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title="Juízes e desembargadores — todos os tribunais"
        action={{ label: "← Voltar ao Judiciário", href: "/judiciario" }}
      />

      <DataTable columns={columns} data={MOCK_MAGISTRATES} rowKey={(r) => r.id} />
    </>
  )
}
