/**
 * @file AppShell.tsx
 * @description Outer layout shell providing the sidebar + main content structure.
 *
 * This component defines the responsive layout used across all pages:
 * - Desktop (lg+): fixed left sidebar (272px) always visible, content offset
 * - Mobile (< lg): sidebar hidden by default, slides in from the left when
 *   the hamburger button is tapped; a backdrop overlay covers the content
 *
 * The mobile header bar with hamburger + logo appears only on < lg screens.
 * All pages are rendered inside the `children` slot of AppShell.
 */

"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { track } from "@/lib/analytics"
import { Sidebar } from "./Sidebar"

/** Routes that are publicly visible without the "Coming soon" overlay. */
const PUBLIC_PATHS = ["/sobre", "/camara", "/senado", "/empresas", "/acha-justo"]

interface AppShellProps {
  /** Page content rendered in the main scrollable area. */
  children: React.ReactNode
}

/**
 * Renders the application shell with responsive sidebar and scrollable main area.
 *
 * On desktop (lg+): fixed sidebar on the left, main content offset by 272px.
 * On mobile (< lg): sidebar hidden, mobile header with hamburger + logo shown.
 *
 * @param children - Page content to display in the main area
 */
export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[272px]">
        {/* Mobile header — visible only on < lg */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200/60 bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <button
            onClick={() => {
              track("open_mobile_menu")
              setSidebarOpen(true)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors active:bg-gray-100"
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span>
              <span className="text-gray-900">impost</span>
              <span className="text-brasil-green">e</span>
              <span className="text-gray-900">rio</span>
            </span>
            <span className="rounded-md bg-brasil-green/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-brasil-green">
              beta
            </span>
          </span>
        </header>

        {/* Page content */}
        <main className="relative min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          {children}

          {/* "Coming soon" overlay — covers all non-public pages */}
          {!isPublic && (
            <div className="absolute inset-0 z-30 flex items-start justify-center bg-white/80 pt-24 backdrop-blur-sm sm:pt-32">
              <div className="text-center">
                <p className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  Em breve
                </p>
                <p className="mt-3 text-sm text-gray-500 sm:text-base">
                  Estamos finalizando esta seção.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
