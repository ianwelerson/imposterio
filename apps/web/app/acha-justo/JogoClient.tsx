/**
 * @file JogoClient.tsx
 * @description Client-side layout for the "Acha Justo?" game page.
 *
 * Wires the game card and scoreboard together: after the user votes,
 * the scoreboard automatically refreshes to show updated statistics.
 *
 * Layout:
 * - Prominent gradient hero header with game description + tags
 * - Two-column grid: game card (left, 3/5) + scoreboard (right, 2/5)
 * - Scoreboard card mirrors the game card style (gradient header + white body)
 */

"use client"

import { useRef } from "react"
import Link from "next/link"
import { JogoGameCard } from "./JogoGameCard"
import { Scoreboard, type ScoreboardHandle } from "./Scoreboard"

export function JogoClient() {
  const scoreboardRef = useRef<ScoreboardHandle>(null)

  return (
    <>
      {/* Hero header */}
      <header className="mb-10">
        <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-8 text-white sm:px-8 sm:py-10">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Acha Justo?
          </h1>
          <p className="mt-2 max-w-lg text-sm text-indigo-100 sm:text-base">
            Veja um dado real sobre um agente público e vote: você acha justo?
            Depois descubra de quem se trata. Todos os dados são oficiais.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              Dados reais
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              100% verificável
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              Anônimo
            </span>
          </div>
        </div>
      </header>

      {/* Two-column: game card + scoreboard */}
      <section className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <JogoGameCard onVoted={() => scoreboardRef.current?.refresh()} />
        </div>

        <div className="lg:col-span-2">
          <Scoreboard ref={scoreboardRef} />
        </div>
      </section>
    </>
  )
}
