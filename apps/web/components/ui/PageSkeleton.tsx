/**
 * @file PageSkeleton.tsx
 * @description Animated skeleton placeholders shown during page transitions.
 *
 * Three variants match the main page patterns:
 * - **overview**: section header + stat cards grid + chart placeholders
 * - **listing**: header + search bar + table rows
 * - **detail**: profile header + info panel + stat cards + charts
 *
 * Used by Next.js `loading.tsx` files to provide instant visual feedback
 * while async server components fetch data.
 */

/** Pulsing block used as a building primitive for all skeleton variants. */
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200/60 ${className}`}
      aria-hidden="true"
    />
  )
}

/** Skeleton stat card matching the StatCard component dimensions. */
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-white p-5 shadow-card">
      <Bone className="mb-3 h-3 w-24" />
      <Bone className="mb-2 h-7 w-20" />
      <Bone className="h-3 w-16" />
    </div>
  )
}

/** Skeleton table row matching DataTable row dimensions. */
function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-gray-100/80 px-4 py-3.5">
      <Bone className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-48" />
        <Bone className="h-3 w-32" />
      </div>
      <Bone className="h-3 w-16 shrink-0" />
    </div>
  )
}

/** Skeleton chart card matching ChartCard dimensions. */
function ChartSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200/60 bg-white p-5 shadow-card ${wide ? "lg:col-span-2" : ""}`}>
      <Bone className="mb-4 h-4 w-36" />
      <Bone className="h-48 w-full rounded-lg" />
    </div>
  )
}

/** Overview page skeleton: header + stats + charts. */
function OverviewSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <Bone className="mb-3 h-8 w-64" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton wide />
      </div>
    </div>
  )
}

/** Listing page skeleton: header + search + table. */
function ListingSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 px-6 py-10 sm:px-10 sm:py-12">
          <Bone className="mb-3 h-3.5 w-32 !bg-gray-300/60" />
          <Bone className="mb-2 h-7 w-56 !bg-gray-300/60" />
          <Bone className="h-4 w-72 max-w-full !bg-gray-300/60" />
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <Bone className="h-10 w-full max-w-md rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200/60 bg-white shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Detail page skeleton: profile + info + stats + charts. */
function DetailSkeleton() {
  return (
    <div>
      {/* Profile header */}
      <div className="mb-10 flex items-center gap-5 rounded-xl border border-gray-200/60 bg-white p-5 shadow-card">
        <Bone className="h-[72px] w-[72px] shrink-0 rounded-full" />
        <div className="space-y-2.5">
          <Bone className="h-7 w-52" />
          <div className="flex gap-2">
            <Bone className="h-5 w-16 rounded-md" />
            <Bone className="h-5 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="mb-8 rounded-xl border border-gray-200/60 bg-white p-5 shadow-card">
        <Bone className="mb-4 h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bone className="h-3 w-20" />
              <Bone className="h-3.5 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}

type SkeletonVariant = "overview" | "listing" | "detail"

interface PageSkeletonProps {
  /** Which page layout to mimic. Defaults to "overview". */
  variant?: SkeletonVariant
}

/**
 * Full-page skeleton shown during Next.js page transitions.
 *
 * @param variant - Layout variant: "overview", "listing", or "detail"
 */
export function PageSkeleton({ variant = "overview" }: PageSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando página…">
      <span className="sr-only">Carregando…</span>
      {variant === "overview" && <OverviewSkeleton />}
      {variant === "listing" && <ListingSkeleton />}
      {variant === "detail" && <DetailSkeleton />}
    </div>
  )
}
