/**
 * @file seed-game.ts
 * @description Seeds the game_cards table with initial card references.
 *
 * Cards store only references (deputy ID + year + category). The question
 * text is built dynamically at read time by fetching fresh expense data.
 *
 * Creates two types of cards per deputy:
 * - expense_total: total CEAP expenses for the year
 * - expense_category: expenses in the top spending category
 *
 * Run: DATABASE_URL="..." npx tsx packages/db/seed-game.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface CamaraDeputyRaw {
  id: number
  nome: string
  siglaPartido: string
  siglaUf: string
}

interface CamaraExpenseRaw {
  tipoDespesa: string
  valorLiquido: number
}

async function main() {
  console.log("Seeding game cards...")

  // Clear existing cards
  const existing = await prisma.gameCard.count()
  if (existing > 0) {
    console.log(`Deleting ${existing} existing cards...`)
    await prisma.gameVote.deleteMany()
    await prisma.gameCard.deleteMany()
  }

  // Fetch current deputies
  const depRes = await fetch(
    "https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome",
  )
  if (!depRes.ok) throw new Error(`Failed to fetch deputies: ${depRes.status}`)
  const depData = await depRes.json()
  const deputies: CamaraDeputyRaw[] = depData.dados

  console.log(`Found ${deputies.length} deputies.`)

  const shuffled = deputies.sort(() => Math.random() - 0.5)
  const year = 2025
  let totalCreated = 0
  let deputiesProcessed = 0

  for (const deputy of shuffled) {
    if (deputiesProcessed >= 5) break

    const expUrl = `https://dadosabertos.camara.leg.br/api/v2/deputados/${deputy.id}/despesas?ano=${year}&itens=100&ordem=DESC&ordenarPor=ano`
    try {
      const expRes = await fetch(expUrl)
      if (!expRes.ok) continue
      const expData = await expRes.json()
      const expenses: CamaraExpenseRaw[] = expData.dados

      if (!expenses || expenses.length === 0) continue

      const total = expenses.reduce((sum, e) => sum + e.valorLiquido, 0)
      if (total <= 0) continue

      // Find top expense category
      const byCategory: Record<string, number> = {}
      for (const e of expenses) {
        byCategory[e.tipoDespesa] = (byCategory[e.tipoDespesa] || 0) + e.valorLiquido
      }
      const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

      // Card 1: expense_total
      await prisma.gameCard.create({
        data: {
          type: "expense_total",
          module: "camara",
          refId: String(deputy.id),
          refMeta: { year },
        },
      })
      totalCreated++
      console.log(
        `  ✓ expense_total: ${deputy.nome} (${deputy.siglaPartido}-${deputy.siglaUf})`,
      )

      // Card 2: expense_category (top category)
      if (topCategory[1] > 0) {
        await prisma.gameCard.create({
          data: {
            type: "expense_category",
            module: "camara",
            refId: String(deputy.id),
            refMeta: { year, category: topCategory[0] },
          },
        })
        totalCreated++
        console.log(
          `  ✓ expense_category: ${deputy.nome} — ${topCategory[0]}`,
        )
      }

      deputiesProcessed++
    } catch {
      continue
    }
  }

  console.log(`\n✓ Created ${totalCreated} game cards for ${deputiesProcessed} deputies!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
