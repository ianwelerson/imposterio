/**
 * @file Sidebar.tsx
 * @description Navigation sidebar for the Imposterio application.
 *
 * On desktop (lg+): fixed left sidebar, always visible.
 * On mobile (< lg): slides in from the left with a backdrop overlay,
 * triggered by a hamburger button in the AppShell mobile header.
 *
 * Navigation items support collapsible sub-items: clicking the parent
 * navigates to its page, clicking the chevron toggles the sub-item list.
 * Sub-items auto-expand when the current route matches their prefix.
 */

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { track } from "@/lib/analytics"

/** A child navigation item shown under a parent. */
interface NavChild {
  label: string
  href: string
}

/** A single navigation item in the sidebar, optionally with children. */
interface NavItem {
  label: string
  href: string
  icon: string
  children?: NavChild[]
}

/** A labeled group of navigation items. */
interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Início",
    items: [
      {
        label: "Painel",
        href: "/",
        icon: "M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4a1 1 0 001-1v-4h2v4a1 1 0 001 1h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z",
      },
      {
        label: "Acha Justo?",
        href: "/acha-justo",
        icon: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
      },
    ],
  },
  {
    title: "Legislativo",
    items: [
      {
        label: "Câmara dos Deputados",
        href: "/camara",
        icon: "M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z",
        children: [
          { label: "Deputados", href: "/camara/deputados" },
          { label: "Pauta Legislativa", href: "/camara/pautas" },
          { label: "Licitações", href: "/camara/licitacoes" },
          { label: "Funcionários", href: "/camara/funcionarios" },
          { label: "Comparar", href: "/camara/comparar" },
        ],
      },
      {
        label: "Senado Federal",
        href: "/senado",
        icon: "M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0114 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L7.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 016 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L10 4.323V3a1 1 0 011-1z",
        children: [
          { label: "Senadores", href: "/senado/senadores" },
          { label: "Pauta Legislativa", href: "/senado/pautas" },
        ],
      },
    ],
  },
  {
    title: "Executivo",
    items: [
      {
        label: "Executivo Federal",
        href: "/executivo",
        icon: "M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z",
        children: [
          { label: "Ministros", href: "/executivo/ministros" },
          { label: "Servidores", href: "/executivo/servidores" },
        ],
      },
    ],
  },
  {
    title: "Judiciário",
    items: [
      {
        label: "Tribunais",
        href: "/judiciario",
        icon: "M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM4 16v2h16v-2H4z",
        children: [
          { label: "Magistrados", href: "/judiciario/magistrados" },
        ],
      },
    ],
  },
  {
    title: "Partidos",
    items: [
      {
        label: "Partidos Políticos",
        href: "/partidos",
        icon: "M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z",
        children: [
          { label: "Todos os Partidos", href: "/partidos/lista" },
        ],
      },
    ],
  },
  {
    title: "Estados",
    items: [
      {
        label: "Estados",
        href: "/estados",
        icon: "M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z",
        children: [
          { label: "Arrecadação", href: "/estados/arrecadacao" },
          { label: "Governadores", href: "/estados/governadores" },
        ],
      },
    ],
  },
  {
    title: "Outros",
    items: [
      {
        label: "Empresas",
        href: "/empresas",
        icon: "M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm-2 8.755V14a2 2 0 002 2h4a2 2 0 002-2v-.245A23.89 23.89 0 0110 15a23.89 23.89 0 01-4-1.245z",
      },
    ],
  },
]

/** Chevron icon that rotates when expanded. */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200
        ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  )
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Compute which parent hrefs should be initially expanded based on current route
  const getInitialExpanded = (): Set<string> => {
    const set = new Set<string>()
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some((c) => pathname.startsWith(c.href))
          const isParentActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          if (isChildActive || isParentActive) {
            set.add(item.href)
          }
        }
      }
    }
    return set
  }

  const [expanded, setExpanded] = useState<Set<string>>(getInitialExpanded)

  // Auto-expand when navigating to a child route
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const section of NAV_SECTIONS) {
        for (const item of section.items) {
          if (item.children) {
            const shouldExpand = item.children.some((c) => pathname.startsWith(c.href))
              || (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
            if (shouldExpand) next.add(item.href)
          }
        }
      }
      return next
    })
  }, [pathname])

  const toggleExpanded = (href: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  // Close the mobile drawer when the route changes
  useEffect(() => {
    onClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href === "/"
      ? pathname === "/"
      : pathname === item.href
    const isExpanded = expanded.has(item.href)
    const hasChildren = item.children && item.children.length > 0

    return (
      <li key={item.href}>
        {/* Single row: icon + label (link) + chevron toggle, all aligned */}
        <div
          className={`flex items-center rounded-md px-3 py-2 transition-colors
            ${isActive
              ? "bg-accent-light text-accent"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
          <Link
            href={item.href}
            onClick={() => track("navigate", { href: item.href, label: item.label })}
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-current={isActive ? "page" : undefined}
          >
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
            </svg>
            <span className="truncate text-sm font-medium">{item.label}</span>
          </Link>

          {/* Chevron toggle — sits inside the same row, always right-aligned */}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(item.href) }}
              className="-mr-1 ml-1 shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
              aria-label={isExpanded ? `Recolher ${item.label}` : `Expandir ${item.label}`}
              aria-expanded={isExpanded}
            >
              <ChevronIcon expanded={isExpanded} />
            </button>
          )}
        </div>

        {/* Sub-items */}
        {hasChildren && isExpanded && (
          <ul className="ml-8 mt-0.5 space-y-0.5 border-l border-gray-200/60 pl-3">
            {item.children!.map((child) => {
              const isChildActive = pathname.startsWith(child.href)
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={() => track("navigate", { href: child.href, label: child.label })}
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors
                      ${isChildActive
                        ? "font-medium text-accent"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    aria-current={isChildActive ? "page" : undefined}
                  >
                    {child.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo + close button on mobile */}
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span>
            <span className="text-gray-900">impost</span>
            <span className="text-brasil-green">e</span>
            <span className="text-gray-900">rio</span>
          </span>
          <span className="rounded bg-brasil-green/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-brasil-green">
            beta
          </span>
        </Link>

        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          aria-label="Fechar menu"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex min-h-full flex-col">
          <div className="flex-1">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
                <ul role="list" className="space-y-0.5">
                  {section.items.map(renderNavItem)}
                </ul>
              </div>
            ))}
          </div>

          {/* "Sobre o projeto" — bottom-aligned nav item */}
          <div className="mt-auto pt-3">
            <Link
              href="/sobre"
              onClick={() => track("navigate", { href: "/sobre", label: "Sobre o projeto" })}
              className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors
                ${pathname === "/sobre"
                  ? "bg-accent-light text-accent"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              aria-current={pathname === "/sobre" ? "page" : undefined}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="truncate text-sm font-medium">Sobre o projeto</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200/60 px-6 py-4">
        <a
          href="https://github.com/ianwelerson/imposterio"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Colabore no GitHub
        </a>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r
                   border-gray-200/60 bg-white lg:flex"
        aria-label="Navegação principal"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay + drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300
            ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
          aria-label="Fechar menu"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl
            transition-transform duration-300 ease-in-out
            ${open ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Navegação principal"
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
