/**
 * @file SectionNav.tsx
 * @description Sticky section navigation bar for the senator detail page.
 *
 * Mirrors the Câmara SectionNav with a Senate-specific section list:
 * Verba de Gabinete and Frentes are dropped (no Senate equivalent), and
 * Lideranças + Carreira política are added.
 *
 * Uses IntersectionObserver to highlight the currently visible section.
 * On mobile renders as a horizontally scrollable pill list.
 * Appears only after the user scrolls past the profile header.
 */

"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface NavSection {
  id: string
  label: string
}

const SECTIONS: NavSection[] = [
  { id: "resumo", label: "Resumo" },
  { id: "gastos-ceaps", label: "CEAPS" },
  { id: "proposicoes", label: "Proposições" },
  { id: "votacoes", label: "Votações" },
  { id: "presenca", label: "Presença" },
  { id: "discursos", label: "Discursos" },
  { id: "comissoes", label: "Comissões" },
  { id: "liderancas", label: "Lideranças" },
  { id: "carreira", label: "Carreira" },
]

const HEADER_HEIGHT = 64
const NAV_HEIGHT = 44

export function SectionNav() {
  const [visible, setVisible] = useState(false)
  const [activeId, setActiveId] = useState<string>("")
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scrollContainerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const visibleSections = new Map<string, boolean>()

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id)
      if (!el) continue

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibleSections.set(section.id, entry.isIntersecting)
          for (const s of SECTIONS) {
            if (visibleSections.get(s.id)) {
              setActiveId(s.id)
              return
            }
          }
        },
        {
          rootMargin: `-${HEADER_HEIGHT + NAV_HEIGHT + 16}px 0px -40% 0px`,
          threshold: 0,
        },
      )
      observer.observe(el)
      observers.push(observer)
    }

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  useEffect(() => {
    if (!activeId) return
    const pill = pillRefs.current.get(activeId)
    const container = scrollContainerRef.current
    if (pill && container) {
      const pillLeft = pill.offsetLeft
      const pillWidth = pill.offsetWidth
      const containerWidth = container.offsetWidth
      const scrollLeft = pillLeft - containerWidth / 2 + pillWidth / 2
      container.scrollTo({ left: scrollLeft, behavior: "smooth" })
    }
  }, [activeId])

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - NAV_HEIGHT - 12
    window.scrollTo({ top, behavior: "smooth" })
  }, [])

  return (
    <nav
      className={`sticky z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
      style={{ top: HEADER_HEIGHT }}
      aria-label="Navegação por seção"
    >
      <div
        ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
        className="flex gap-1 overflow-x-auto px-3 py-1.5 scrollbar-hide sm:justify-center sm:gap-0.5"
      >
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            ref={(el) => {
              if (el) pillRefs.current.set(section.id, el)
            }}
            type="button"
            onClick={() => handleClick(section.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeId === section.id
                ? "bg-accent text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
