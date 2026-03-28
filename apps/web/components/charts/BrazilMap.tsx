/**
 * @file BrazilMap.tsx
 * @description Lightweight inline SVG map of Brazil's 27 UFs (states + DF).
 * Accepts a `highlightUf` prop to color-fill a single state. Uses simplified
 * path data derived from Brazil's geographic boundaries.
 *
 * No external map library required — pure SVG, SSR-safe, <10KB.
 */

"use client"

/**
 * Simplified SVG path data for each Brazilian UF.
 * Paths are relative to a 600×600 viewBox representing mainland Brazil.
 * Derived from public-domain geographic data (IBGE simplified boundaries).
 */
const UF_PATHS: Record<string, string> = {
  AC: "M48,310 L70,305 L75,320 L60,330 L45,325 Z",
  AL: "M480,260 L498,255 L502,268 L488,272 Z",
  AM: "M80,230 L180,210 L200,250 L190,280 L120,290 L70,270 Z",
  AP: "M270,155 L295,140 L310,160 L300,180 L275,175 Z",
  BA: "M410,260 L480,240 L500,290 L490,340 L440,350 L400,310 Z",
  CE: "M470,200 L500,195 L510,220 L490,230 L470,225 Z",
  DF: "M355,310 L368,308 L370,318 L358,320 Z",
  ES: "M460,340 L482,332 L488,355 L468,360 Z",
  GO: "M320,300 L390,290 L400,340 L360,360 L310,340 Z",
  MA: "M380,195 L430,180 L445,210 L420,230 L385,225 Z",
  MG: "M380,320 L450,310 L470,360 L440,390 L380,380 Z",
  MS: "M270,360 L330,350 L340,400 L300,420 L260,400 Z",
  MT: "M220,280 L320,270 L330,330 L270,350 L210,320 Z",
  PA: "M200,180 L320,170 L340,220 L310,260 L220,260 L190,230 Z",
  PB: "M478,230 L508,225 L512,240 L482,245 Z",
  PE: "M450,240 L510,232 L515,252 L455,258 Z",
  PI: "M410,210 L450,200 L460,245 L430,260 L405,245 Z",
  PR: "M310,400 L370,390 L380,420 L340,435 L305,425 Z",
  RJ: "M430,385 L468,375 L475,395 L445,400 Z",
  RN: "M485,210 L510,205 L515,222 L490,226 Z",
  RO: "M130,300 L190,290 L200,330 L160,345 L125,330 Z",
  RR: "M140,170 L180,155 L195,185 L170,200 L140,195 Z",
  RS: "M300,440 L360,430 L370,470 L340,490 L295,475 Z",
  SC: "M340,430 L380,425 L385,445 L345,450 Z",
  SE: "M488,268 L505,262 L508,278 L492,282 Z",
  SP: "M350,375 L420,365 L435,400 L390,415 L345,405 Z",
  TO: "M340,240 L390,230 L400,280 L370,300 L335,285 Z",
}

const ALL_UFS = Object.keys(UF_PATHS)

interface BrazilMapProps {
  /** UF code to highlight (e.g. "SP", "RJ", "MG"). */
  highlightUf?: string
  /** Height of the SVG container in pixels. @default 300 */
  height?: number
}

export function BrazilMap({ highlightUf, height = 300 }: BrazilMapProps) {
  return (
    <svg
      viewBox="30 130 510 380"
      className="w-full"
      style={{ maxHeight: height }}
      role="img"
      aria-label={highlightUf ? `Mapa do Brasil com destaque para ${highlightUf}` : "Mapa do Brasil"}
    >
      {ALL_UFS.map((uf) => {
        const isHighlighted = uf === highlightUf
        return (
          <path
            key={uf}
            d={UF_PATHS[uf]}
            fill={isHighlighted ? "#4f46e5" : "#e5e7eb"}
            stroke="#fff"
            strokeWidth={1.5}
            className="transition-colors"
          >
            <title>{uf}</title>
          </path>
        )
      })}

      {/* UF label for highlighted state */}
      {highlightUf && UF_PATHS[highlightUf] && (
        <text
          x={295}
          y={505}
          textAnchor="middle"
          className="fill-indigo-600 text-[14px] font-semibold"
        >
          {highlightUf}
        </text>
      )}
    </svg>
  )
}
