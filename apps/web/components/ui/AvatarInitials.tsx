/**
 * @file AvatarInitials.tsx
 * @description Circular avatar showing initials, used as a placeholder
 * for official photos in tables and profile headers.
 *
 * Supports multiple sizes for different contexts (table rows vs. profile headers).
 * Background colors can be customized but default to a neutral gray.
 */

/** Available avatar sizes. */
type AvatarSize = "sm" | "md" | "lg"

interface AvatarInitialsProps {
  /** One or two letter initials to display. */
  initials: string
  /**
   * Avatar size variant.
   * - `sm` (32px) — table rows, compact lists
   * - `md` (40px) — card headers, medium contexts
   * - `lg` (64px) — profile headers, detail pages
   * @default "sm"
   */
  size?: AvatarSize
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
}

/**
 * Renders a circular avatar with initials as a photo placeholder.
 *
 * @param initials - Letters to display (typically first + last name initials)
 * @param size     - Size variant (sm, md, lg)
 *
 * @example
 * ```tsx
 * <AvatarInitials initials="AB" size="lg" />
 * ```
 */
export function AvatarInitials({ initials, size = "sm" }: AvatarInitialsProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full
                  bg-gray-100 font-semibold text-gray-600 ${sizeStyles[size]}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
