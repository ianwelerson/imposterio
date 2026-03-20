/**
 * @file Toast.tsx
 * @description Lightweight toast notification system — no external dependencies.
 *
 * Provides a `ToastProvider` (renders the toast container) and a `useToast` hook
 * for imperatively showing toasts. Also exports `ToastTrigger`, a thin client
 * component that server pages can render to trigger toasts on mount — bridging
 * server-side error detection with client-side UI feedback.
 *
 * Toast types: "error" (red), "warning" (amber), "info" (blue), "success" (green).
 * Toasts auto-dismiss after 8 seconds and can be closed manually.
 */

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

// ── Types ────────────────────────────────────────────────────────────

type ToastVariant = "error" | "warning" | "info" | "success"

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
}

// ── Context ──────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

/** Hook to imperatively show toasts from any client component. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

// ── Variant styles ───────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
}

const variantIcons: Record<ToastVariant, string> = {
  error: "!",
  warning: "!",
  info: "i",
  success: "\u2713",
}

const AUTO_DISMISS_MS = 8_000

// ── Provider ─────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, variant: ToastVariant = "error") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Individual toast ─────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right ${variantStyles[toast.variant]}`}
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
        {variantIcons[toast.variant]}
      </span>
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-current/60 hover:text-current transition-colors"
        aria-label="Fechar"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  )
}

// ── Server→Client bridge ─────────────────────────────────────────────

interface ToastTriggerProps {
  /** Error messages to display as toasts on mount. */
  errors: Array<{ message: string; variant?: ToastVariant }>
}

/**
 * Thin client component that triggers toasts on mount.
 * Server pages render this with collected errors so toasts appear client-side.
 *
 * @example
 * ```tsx
 * // In a server component:
 * const errors: Array<{ message: string }> = []
 * try { data = await fetchSomething() } catch (e) { errors.push({ message: "..." }) }
 * return (
 *   <>
 *     <ToastTrigger errors={errors} />
 *     {/* rest of the page *\/}
 *   </>
 * )
 * ```
 */
export function ToastTrigger({ errors }: ToastTriggerProps) {
  const { show } = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current || errors.length === 0) return
    firedRef.current = true
    for (const err of errors) {
      show(err.message, err.variant ?? "error")
    }
  }, [errors, show])

  return null
}
