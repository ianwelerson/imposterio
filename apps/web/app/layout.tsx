import type { Metadata } from "next"
import Script from "next/script"
import { Inter } from "next/font/google"
import { AppShell, ToastProvider } from "@/components/ui"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

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
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        {umamiId && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        )}
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  )
}
