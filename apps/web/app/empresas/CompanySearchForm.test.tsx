/**
 * @file CompanySearchForm.test.tsx
 * @description Component tests for {@link CompanySearchForm}.
 *
 * Verifies the contract between the form and the empresas detail route:
 *
 * - Submitting a valid CNPJ (with or without punctuation) navigates to
 *   `/empresas/{14-digit-cnpj}`.
 * - Submitting fewer than 14 digits surfaces an inline error and does NOT
 *   navigate — we never want a malformed slug to land on the detail page.
 * - The error clears as soon as the visitor edits the field, so we don't
 *   leave a stale "invalid" message under a now-correct value.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

const pushMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { CompanySearchForm } from "./CompanySearchForm"

afterEach(() => {
  cleanup()
  pushMock.mockReset()
})

describe("CompanySearchForm", () => {
  it("navigates to /empresas/{cnpj} stripped of punctuation on submit", () => {
    render(<CompanySearchForm />)
    const input = screen.getByLabelText("CNPJ")
    fireEvent.change(input, { target: { value: "11.222.333/0001-81" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver empresa/i }))
    expect(pushMock).toHaveBeenCalledWith("/empresas/11222333000181")
  })

  it("accepts a digits-only CNPJ", () => {
    render(<CompanySearchForm />)
    const input = screen.getByLabelText("CNPJ")
    fireEvent.change(input, { target: { value: "11222333000181" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver empresa/i }))
    expect(pushMock).toHaveBeenCalledWith("/empresas/11222333000181")
  })

  it("surfaces an inline error and does not navigate when the CNPJ is incomplete", () => {
    render(<CompanySearchForm />)
    const input = screen.getByLabelText("CNPJ")
    fireEvent.change(input, { target: { value: "1234" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver empresa/i }))
    expect(pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/14 dígitos/i)
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("clears the error once the visitor edits the field", () => {
    render(<CompanySearchForm />)
    const input = screen.getByLabelText("CNPJ")
    fireEvent.change(input, { target: { value: "1234" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver empresa/i }))
    expect(screen.getByRole("alert")).toBeInTheDocument()
    fireEvent.change(input, { target: { value: "12345" } })
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
