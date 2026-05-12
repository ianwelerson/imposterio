/**
 * @file ProvavelBadge.test.tsx
 * @description Component tests for {@link ProvavelBadge}.
 *
 * Verifies that:
 * - Every variant renders the mandatory "Vínculo provável" prefix (legal
 *   protection — we never assert equivalence).
 * - The confidence label and tooltip text reflect the variant.
 * - The tooltip is rendered with the correct ARIA role.
 */

import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ProvavelBadge } from "./ProvavelBadge"

afterEach(cleanup)

describe("ProvavelBadge", () => {
  it("always shows the 'Vínculo provável' prefix on every variant", () => {
    for (const confidence of ["alta", "media", "baixa"] as const) {
      const { unmount } = render(<ProvavelBadge confidence={confidence} />)
      expect(screen.getByText(/Vínculo provável/)).toBeInTheDocument()
      unmount()
    }
  })

  it("renders the human-readable label for each variant", () => {
    const { rerender } = render(<ProvavelBadge confidence="alta" />)
    expect(screen.getByText(/Alta/)).toBeInTheDocument()

    rerender(<ProvavelBadge confidence="media" />)
    expect(screen.getByText(/Média/)).toBeInTheDocument()

    rerender(<ProvavelBadge confidence="baixa" />)
    expect(screen.getByText(/Baixa/)).toBeInTheDocument()
  })

  it("includes a tooltip explaining the heuristic", () => {
    render(<ProvavelBadge confidence="alta" />)
    const tooltip = screen.getByRole("tooltip")
    expect(tooltip).toHaveTextContent(/CPF mascarado e nome batem/i)
  })

  it("uses distinct tooltip copy per variant", () => {
    const { rerender } = render(<ProvavelBadge confidence="media" />)
    expect(screen.getByRole("tooltip")).toHaveTextContent(/nome de casada/i)

    rerender(<ProvavelBadge confidence="baixa" />)
    expect(screen.getByRole("tooltip")).toHaveTextContent(/homonímia/i)
  })
})
