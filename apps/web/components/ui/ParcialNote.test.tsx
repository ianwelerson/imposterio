/**
 * @file ParcialNote.test.tsx
 * @description Component tests for {@link ParcialNote}.
 *
 * Verifies that the parcial-value disclaimer renders the mandatory phrase
 * and the "atualizado em" timestamp when provided. EMPRESAS-PLAN.md §5
 * requires both pieces of copy to ship next to every aggregated total.
 */

import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ParcialNote } from "./ParcialNote"

afterEach(cleanup)

describe("ParcialNote", () => {
  it("always renders the parcial-value disclaimer", () => {
    render(<ParcialNote />)
    expect(screen.getByText(/Valor parcial/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Cresce conforme novos dados são consultados/i),
    ).toBeInTheDocument()
  })

  it("renders the formatted date when lastObservedAt is provided", () => {
    render(<ParcialNote lastObservedAt={new Date("2026-05-06T12:00:00Z")} />)
    expect(screen.getByText(/06\/05\/2026/)).toBeInTheDocument()
  })

  it("omits the date phrase when lastObservedAt is null", () => {
    render(<ParcialNote lastObservedAt={null} />)
    // The trailing " até <date>" sentence is suppressed entirely so the copy
    // does not look broken when no transaction has been observed yet.
    expect(screen.queryByText(/até/i)).toBeNull()
  })
})
