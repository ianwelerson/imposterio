/**
 * @file Acronym.tsx
 * @description Inline abbreviation with a hover tooltip showing the full meaning.
 *
 * Renders the abbreviation text followed by a small "?" icon. On hover,
 * a CSS-only tooltip displays the full term. Used for legislative and
 * government acronyms (CEAP, PL, PEC, UF, etc.) so users unfamiliar
 * with Brazilian political jargon can understand the data.
 */

interface AcronymProps {
  /** The abbreviated text to display (e.g. "CEAP", "UF"). */
  children: string
  /** Full meaning shown on hover (e.g. "Cota para Exercício da Atividade Parlamentar"). */
  title: string
}

/**
 * Renders an inline abbreviation with a hover tooltip.
 *
 * @example
 * ```tsx
 * <Acronym title="Cota para Exercício da Atividade Parlamentar">CEAP</Acronym>
 * <Acronym title="Unidade Federativa">UF</Acronym>
 * ```
 */
export function Acronym({ children, title }: AcronymProps) {
  return (
    <span className="group/acr relative inline-flex items-center gap-0.5">
      <abbr className="no-underline" title={title}>{children}</abbr>
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full
                   bg-gray-200 text-[9px] font-bold leading-none text-gray-500
                   cursor-help"
        aria-hidden="true"
      >
        ?
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2
                   whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white
                   opacity-0 shadow-lg transition-opacity group-hover/acr:opacity-100"
        role="tooltip"
      >
        {title}
      </span>
    </span>
  )
}
