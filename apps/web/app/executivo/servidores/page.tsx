/**
 * @file page.tsx
 * @description Full listing of federal civil servants (servidores federais).
 *
 * Displays a table of the highest-compensated civil servants in the
 * federal executive branch: name, role, agency, gross compensation,
 * net compensation, and a link to each servant's detail page.
 *
 * Data source: https://api.portaldatransparencia.gov.br/api-de-dados/servidores
 * Currently renders static mock data — real integration pending.
 */

import Link from "next/link"
import { DataTable, SectionHeader } from "@/components/ui"

interface ServantRow {
  id: string
  name: string
  role: string
  agency: string
  grossComp: string
  netComp: string
  startDate: string
}

const MOCK_SERVANTS: ServantRow[] = [
  { id: "s1", name: "Carlos Alberto Mendes", role: "Auditor-Fiscal da Receita Federal", agency: "Ministério da Fazenda", grossComp: "R$ 35.462,71", netComp: "R$ 27.120,30", startDate: "2004" },
  { id: "s2", name: "Renata Vieira Costa", role: "Procuradora Federal", agency: "AGU", grossComp: "R$ 33.689,00", netComp: "R$ 25.890,40", startDate: "2008" },
  { id: "s3", name: "Márcio Lopes Ferreira", role: "Diplomata — Ministro de 1ª Classe", agency: "MRE (Itamaraty)", grossComp: "R$ 30.934,52", netComp: "R$ 23.450,80", startDate: "1998" },
  { id: "s4", name: "Juliana Araújo Santos", role: "Analista de Comércio Exterior", agency: "MDIC", grossComp: "R$ 24.120,00", netComp: "R$ 18.340,50", startDate: "2012" },
  { id: "s5", name: "Roberto Farias Neto", role: "Especialista em Políticas Públicas", agency: "Min. Planejamento", grossComp: "R$ 22.847,33", netComp: "R$ 17.120,60", startDate: "2010" },
  { id: "s6", name: "Patrícia Gonçalves Lima", role: "Analista do Banco Central", agency: "BACEN", grossComp: "R$ 28.315,60", netComp: "R$ 21.540,20", startDate: "2006" },
  { id: "s7", name: "Thiago Mendes Oliveira", role: "Auditor Federal de Controle Externo", agency: "TCU", grossComp: "R$ 37.890,00", netComp: "R$ 28.920,10", startDate: "2002" },
  { id: "s8", name: "Fernanda Albuquerque", role: "Analista de Finanças e Controle", agency: "STN / Min. Fazenda", grossComp: "R$ 26.450,00", netComp: "R$ 19.870,30", startDate: "2009" },
  { id: "s9", name: "Diego Nascimento", role: "Delegado de Polícia Federal", agency: "PF / MJSP", grossComp: "R$ 31.200,00", netComp: "R$ 23.780,40", startDate: "2007" },
  { id: "s10", name: "Luciana Martins Rocha", role: "Perita Criminal Federal", agency: "PF / MJSP", grossComp: "R$ 29.450,00", netComp: "R$ 22.310,50", startDate: "2011" },
  { id: "s11", name: "Ricardo Azevedo", role: "Procurador da República", agency: "MPF", grossComp: "R$ 35.920,00", netComp: "R$ 27.540,20", startDate: "2005" },
  { id: "s12", name: "Camila Ribeiro Torres", role: "Defensora Pública Federal", agency: "DPU", grossComp: "R$ 32.100,00", netComp: "R$ 24.560,80", startDate: "2013" },
]

const columns = [
  {
    header: "Servidor(a)",
    cell: (r: ServantRow) => <span className="font-medium text-gray-900">{r.name}</span>,
  },
  { header: "Cargo", cell: (r: ServantRow) => <span className="text-gray-600">{r.role}</span> },
  { header: "Órgão", cell: (r: ServantRow) => <span className="text-gray-600">{r.agency}</span> },
  { header: "Bruta", align: "right" as const, cell: (r: ServantRow) => <span className="font-semibold text-gray-900">{r.grossComp}</span> },
  { header: "Líquida", align: "right" as const, cell: (r: ServantRow) => <span className="text-gray-600">{r.netComp}</span> },
  { header: "Ingresso", align: "center" as const, cell: (r: ServantRow) => <span className="text-gray-500">{r.startDate}</span> },
  {
    header: "",
    align: "center" as const,
    cell: (r: ServantRow) => (
      <Link href={`/executivo/servidores/${r.id}`} className="text-sm font-medium text-accent hover:text-accent-hover">
        Ver mais →
      </Link>
    ),
  },
]

export default function ServidoresPage() {
  return (
    <>
      <header className="pb-6">
        <h1 className="text-xl font-semibold text-gray-900">Servidores Federais</h1>
        <p className="mt-1 text-sm text-gray-500">Dados dos últimos 30 dias</p>
      </header>

      <SectionHeader
        title="Maiores remunerações do Executivo Federal"
        action={{ label: "← Voltar ao Executivo", href: "/executivo" }}
      />

      <DataTable columns={columns} data={MOCK_SERVANTS} rowKey={(r) => r.id} />
    </>
  )
}
