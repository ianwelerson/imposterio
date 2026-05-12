/**
 * @file CompanySearchForm.tsx
 * @description Client-side CNPJ search form for the empresas overview page.
 *
 * Accepts a free-form CNPJ (with or without punctuation), strips it down to
 * the canonical 14-digit form and routes to `/empresas/{cnpj}`. Validation is
 * intentionally generous on input (paste-friendly) and strict on submit:
 * non-14-digit values surface an inline error instead of pushing a 404.
 *
 * EMPRESAS-PLAN.md §7.1 lists this form as the primary entry point into the
 * detail page when the visitor already has a CNPJ in hand.
 */

"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

/**
 * Renders a single-input form that redirects to the empresas detail page
 * for the typed CNPJ. Punctuation is stripped before navigation so the URL
 * stays canonical (digits only).
 */
export function CompanySearchForm() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const digits = value.replace(/\D/g, "")
    if (digits.length !== 14) {
      setError("Informe um CNPJ válido com 14 dígitos.")
      return
    }
    setError(null)
    router.push(`/empresas/${digits}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
      aria-label="Buscar empresa por CNPJ"
    >
      <div className="flex w-full flex-col gap-1 sm:max-w-sm">
        <label htmlFor="cnpj-search" className="sr-only">
          CNPJ
        </label>
        <input
          id="cnpj-search"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "cnpj-search-error" : undefined}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono
                     text-sm text-gray-900 shadow-xs placeholder:text-gray-400
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        {error && (
          <p
            id="cnpj-search-error"
            role="alert"
            className="text-xs font-medium text-red-600"
          >
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg
                   bg-accent px-4 py-2 text-sm font-medium text-white shadow-xs
                   transition-colors hover:bg-accent-hover focus:outline-none
                   focus:ring-2 focus:ring-accent/30"
      >
        Ver empresa
      </button>
    </form>
  )
}
