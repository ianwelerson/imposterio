/**
 * @file card-content.ts
 * @description Builds card question and reveal content dynamically from fresh API data.
 *
 * Instead of storing static question text in the database, this module
 * fetches fresh data from the government APIs (via cachedFetch) every time
 * a card is displayed. This ensures values are always up-to-date.
 *
 * Each card type has its own strategy for:
 * 1. Fetching the relevant data (expenses, attendance, etc.)
 * 2. Building the anonymous question text
 * 3. Building the reveal payload (official's identity + source URL)
 */

import { getDeputyDetail, getDeputyExpenses } from "@imposterio/fetchers"
import type { ExpenseTotalMeta, ExpenseCategoryMeta } from "@imposterio/types"

/** Formats a number as Brazilian Real currency */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  })
}

/** Formats year reference: "em 2025" for past years, "até o momento em 2026" for current year. */
function yearLabel(year: number): string {
  return year === new Date().getFullYear()
    ? `até o momento em ${year}`
    : `em ${year}`
}

/** Role labels used in questions — kept generic to avoid revealing identity. */
const MODULE_ROLE_LABELS: Record<string, string> = {
  camara: "deputado federal",
  senado: "senador",
  executivo: "servidor federal",
  judiciario: "magistrado",
  tse: "autoridade eleitoral",
}

/** Content returned when building a card for display. */
export interface CardContent {
  question: string
  reveal: {
    name: string
    party: string
    state: string
    photoUrl: string
    sourceUrl: string
  }
}

/**
 * Builds card content dynamically by fetching fresh data from the API.
 *
 * @param type   - Card type (expense_total, expense_category, etc.)
 * @param module - Government branch (camara, senado, etc.)
 * @param refId  - Entity ID in the source API
 * @param meta   - Additional context (year, category, etc.)
 * @returns Card content with question and reveal, or null if data unavailable
 */
export async function buildCardContent(
  type: string,
  module: string,
  refId: string,
  meta: Record<string, unknown>,
): Promise<CardContent | null> {
  try {
    if (module === "camara") {
      return await buildCamaraContent(type, refId, meta)
    }
    // Future: senado, executivo, judiciario, tse
    return null
  } catch (error) {
    console.error(`[buildCardContent] Failed for ${type}/${module}/${refId}:`, error)
    return null
  }
}

/**
 * Builds content for Câmara dos Deputados cards.
 */
async function buildCamaraContent(
  type: string,
  refId: string,
  meta: Record<string, unknown>,
): Promise<CardContent | null> {
  const role = MODULE_ROLE_LABELS.camara

  if (type === "expense_total") {
    const { year } = meta as unknown as ExpenseTotalMeta
    const [deputy, expenses] = await Promise.all([
      getDeputyDetail(refId),
      getDeputyExpenses(refId, year),
    ])

    const total = expenses.reduce((sum, e) => sum + e.value, 0)
    if (total <= 0) return null

    const question = `Um ${role} gastou ${formatBRL(total)} em despesas parlamentares ${yearLabel(year)}. Você acha justo?`

    return {
      question,
      reveal: {
        name: deputy.name,
        party: deputy.party,
        state: deputy.uf,
        photoUrl: deputy.photoUrl ?? "",
        sourceUrl: expenses._source,
      },
    }
  }

  if (type === "expense_category") {
    const { year } = meta as unknown as ExpenseTotalMeta
    const explicitCategory = (meta as Record<string, unknown>).category as string | undefined

    const [deputy, expenses] = await Promise.all([
      getDeputyDetail(refId),
      getDeputyExpenses(refId, year),
    ])

    // Use explicit category from meta, or pick the top spending category
    let category = explicitCategory
    if (!category) {
      const byCategory: Record<string, number> = {}
      for (const e of expenses) {
        byCategory[e.type] = (byCategory[e.type] || 0) + e.value
      }
      const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
      if (!top) return null
      category = top[0]
    }

    const categoryExpenses = expenses.filter((e) => e.type === category)
    const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.value, 0)
    if (categoryTotal <= 0) return null

    // Sentence case the category name
    const categoryName = category.toLowerCase().replace(/^./, (c) => c.toUpperCase())

    const question = `Um ${role} gastou ${formatBRL(categoryTotal)} na categoria "${categoryName}" ${yearLabel(year)}. Você acha justo?`

    return {
      question,
      reveal: {
        name: deputy.name,
        party: deputy.party,
        state: deputy.uf,
        photoUrl: deputy.photoUrl ?? "",
        sourceUrl: expenses._source,
      },
    }
  }

  return null
}
