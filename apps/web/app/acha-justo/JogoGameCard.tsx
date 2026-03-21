/**
 * @file JogoGameCard.tsx
 * @description Interactive game card for the "Acha Justo?" game.
 *
 * Manages the full game flow:
 * 1. Fetch a random card from GET /api/game/card
 * 2. Display the question anonymously (no identity, no source)
 * 3. User votes "Acho justo" or "Não acho justo"
 * 4. POST /api/game/vote returns the reveal (name, party, photo, stats)
 * 5. Show reveal UI with vote bar and source link
 * 6. "Próximo card" button to continue
 *
 * After each vote, fires onVoted() so the parent page can refresh the scoreboard.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { track } from "@/lib/analytics"
import { SourcePill } from "@/components/ui"
import type { GameCardType, GameBranch } from "@imposterio/types"
import { GAME_CARD_TYPE_LABELS, GAME_BRANCH_LABELS } from "@imposterio/types"

interface CardData {
  id: string
  type: GameCardType
  module: GameBranch
  question: string
}

interface RevealData {
  name: string
  party: string
  state: string
  photoUrl: string
  sourceUrl: string
  totalVotes: number
  fairVotes: number
  userVotedFair: boolean
}

type GameState = "loading" | "question" | "voting" | "reveal" | "empty" | "error"

interface JogoGameCardProps {
  /** Called after a vote is successfully cast — used to refresh the scoreboard. */
  onVoted?: () => void
}

export function JogoGameCard({ onVoted }: JogoGameCardProps) {
  const [state, setState] = useState<GameState>("loading")
  const [card, setCard] = useState<CardData | null>(null)
  const [reveal, setReveal] = useState<RevealData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCard = useCallback(async () => {
    setState("loading")
    setReveal(null)
    setError(null)
    try {
      const res = await fetch("/api/game/card")
      if (res.status === 404) {
        setState("empty")
        return
      }
      if (!res.ok) throw new Error("Failed to fetch card")
      const data = await res.json()
      setCard(data)
      setState("question")
    } catch {
      setError("Erro ao carregar o card. Tente novamente.")
      setState("error")
    }
  }, [])

  useEffect(() => {
    fetchCard()
  }, [fetchCard])

  const handleVote = async (fair: boolean) => {
    if (!card) return
    setState("voting")
    try {
      track("game_vote", { fair, category: card.type, branch: card.module })
      const res = await fetch("/api/game/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, fair }),
      })
      if (res.status === 429) {
        setError("Você já votou neste card.")
        setState("error")
        return
      }
      if (!res.ok) throw new Error("Failed to submit vote")
      const data = await res.json()
      setReveal(data)
      setState("reveal")
      onVoted?.()
    } catch {
      setError("Erro ao registrar o voto. Tente novamente.")
      setState("error")
    }
  }

  // Loading
  if (state === "loading") {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200/60 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-indigo-600" />
      </div>
    )
  }

  // Empty
  if (state === "empty") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-gray-200/60 bg-white p-8 text-center">
        <div className="mb-4 text-4xl">🎉</div>
        <p className="text-lg font-bold text-gray-900">Você votou em todos os cards!</p>
        <p className="mt-2 text-sm text-gray-500">Volte mais tarde para novos cards.</p>
      </div>
    )
  }

  // Error
  if (state === "error") {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-red-100 bg-red-50/50 p-8 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          onClick={fetchCard}
          className="mt-4 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // Reveal
  if (state === "reveal" && reveal && card) {
    const fairPercent =
      reveal.totalVotes > 0
        ? Math.round((reveal.fairVotes / reveal.totalVotes) * 100)
        : 0
    const unfairPercent = 100 - fairPercent

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white">
        {/* Reveal header — colored based on majority vote */}
        <div
          className={`px-6 py-4 ${
            fairPercent >= 50
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Resultado
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                {GAME_BRANCH_LABELS[card.module]}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                {GAME_CARD_TYPE_LABELS[card.type as GameCardType]}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Official's identity */}
          <div className="flex items-center gap-4">
            {reveal.photoUrl && (
              <img
                src={reveal.photoUrl}
                alt={reveal.name}
                className="h-16 w-16 rounded-full border-2 border-gray-100 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-gray-900">{reveal.name}</p>
              <p className="text-sm text-gray-500">
                {reveal.party} — {reveal.state}
              </p>
            </div>
          </div>

          {/* Vote bar */}
          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-emerald-600">{fairPercent}%</span>
                <span className="ml-1.5 text-sm text-gray-400">justo</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-red-600">{unfairPercent}%</span>
                <span className="ml-1.5 text-sm text-gray-400">injusto</span>
              </div>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className="bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${fairPercent}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-700 ease-out"
                style={{ width: `${unfairPercent}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              {reveal.totalVotes} voto{reveal.totalVotes !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Your vote */}
          <div
            className={`mt-4 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
              reveal.userVotedFair
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            Você votou: {reveal.userVotedFair ? "Acho justo" : "Não acho justo"}
          </div>

          {/* Source + next */}
          <div className="mt-5 flex items-center justify-between">
            {reveal.sourceUrl && <SourcePill url={reveal.sourceUrl} />}
            <button
              onClick={fetchCard}
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Próximo card →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Question
  if (card) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200/60 bg-white">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              Acha Justo?
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                {GAME_BRANCH_LABELS[card.module]}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                {GAME_CARD_TYPE_LABELS[card.type as GameCardType]}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Question */}
          <p className="text-xl font-bold leading-relaxed text-gray-900 sm:text-2xl">
            {card.question}
          </p>

          {/* Hint */}
          <p className="mt-4 text-xs text-gray-400">
            Vote e descubra de quem se trata — dados reais da API oficial.
          </p>

          {/* Vote buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote(true)}
              disabled={state === "voting"}
              className="group relative overflow-hidden rounded-xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 disabled:cursor-not-allowed sm:py-5 sm:text-base"
              aria-label="Acho justo"
            >
              <span className="block text-2xl sm:text-3xl">👍</span>
              <span className="mt-1 block">Acho justo</span>
              {state === "voting" && (
                <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/90">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </span>
              )}
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={state === "voting"}
              className="group relative overflow-hidden rounded-xl bg-red-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-200 disabled:cursor-not-allowed sm:py-5 sm:text-base"
              aria-label="Não acho justo"
            >
              <span className="block text-2xl sm:text-3xl">👎</span>
              <span className="mt-1 block">Não acho justo</span>
              {state === "voting" && (
                <span className="absolute inset-0 flex items-center justify-center bg-red-600/90">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
