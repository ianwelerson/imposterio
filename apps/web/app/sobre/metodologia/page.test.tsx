/**
 * @file page.test.tsx
 * @description Smoke tests for the metodologia page.
 *
 * The page is purely informational, but EMPRESAS-PLAN.md §7.2 requires the
 * empresas pages to deep-link into `/sobre/metodologia#empresas` — so the
 * `id="empresas"` anchor must exist for the link to resolve. These tests
 * also pin the methodology pillars (incremental aggregation, "vínculo
 * provável" labeling, parcial value disclosure) so the page can't silently
 * regress into a generic stub.
 */

import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import MetodologiaPage from "./page"

afterEach(cleanup)

describe("MetodologiaPage", () => {
  it("exposes the #empresas anchor for deep-links from the empresas pages", () => {
    const { container } = render(<MetodologiaPage />)
    const anchor = container.querySelector("#empresas")
    expect(anchor).not.toBeNull()
    expect(anchor?.tagName.toLowerCase()).toBe("section")
  })

  it("explains incremental aggregation as a non-definitive total", () => {
    render(<MetodologiaPage />)
    expect(
      screen.getByRole("heading", { name: /Agregação incremental/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/indexa sob demanda/i)).toBeInTheDocument()
    expect(screen.getByText(/não é o total real/i)).toBeInTheDocument()
  })

  it("documents the heuristic partner-graph confidence tiers", () => {
    render(<MetodologiaPage />)
    expect(
      screen.getByRole("heading", { name: /Vínculos prováveis/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/sempre heurístico/i)).toBeInTheDocument()
    expect(screen.getByText(/Confiança alta/i)).toBeInTheDocument()
    expect(screen.getByText(/Confiança média/i)).toBeInTheDocument()
    expect(screen.getByText(/Confiança baixa/i)).toBeInTheDocument()
  })

  it("calls out CEIS / CNEP as the non-incremental sanctions check", () => {
    render(<MetodologiaPage />)
    expect(
      screen.getByRole("heading", { name: /Sanções \(CEIS \/ CNEP\)/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/não usam o modelo incremental/i)).toBeInTheDocument()
  })
})
