import type { Metadata } from "next"
import { AppShell } from "@/components/ui"
import "./globals.css"

export const metadata: Metadata = {
  title: "Imposterio — O raio-x de quem vive do seu imposto",
  description:
    "Plataforma de transparência pública brasileira. Gastos, salários, presenças, patrimônio e votações de qualquer agente público — com link direto para a fonte oficial.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
