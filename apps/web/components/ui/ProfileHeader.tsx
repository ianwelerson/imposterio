/**
 * @file ProfileHeader.tsx
 * @description Profile header for individual detail pages (deputy, senator, company).
 *
 * Displays the entity's avatar (photo or initials fallback), name, and
 * metadata tags (party, state, status, etc.) in a horizontal layout.
 * Used at the top of detail pages like `/camara/[id]` and `/senado/[id]`.
 */

import Image from "next/image"
import { AvatarInitials } from "./AvatarInitials"
import { SourcePill } from "./SourcePill"

interface ProfileHeaderProps {
  /** One or two letter initials for the avatar fallback. */
  initials: string
  /** Primary display name (e.g. official's full name or company name). */
  name: string
  /** Array of metadata labels displayed as subtle tags (e.g. ["PL", "SP", "Em exercício"]). */
  tags: string[]
  /**
   * API source URL for the profile data.
   * Rendered as a SourcePill next to the name.
   */
  sourceUrl: string
  /** Optional photo URL. When provided, renders an image instead of initials. */
  photoUrl?: string
}

/**
 * Renders a profile header with avatar (photo or initials), name, metadata tags,
 * and source link.
 */
export function ProfileHeader({ initials, name, tags, sourceUrl, photoUrl }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:gap-4">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-full bg-gray-100 object-cover"
          unoptimized
        />
      ) : (
        <AvatarInitials initials={initials} size="lg" />
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">{name}</h1>
          <SourcePill url={sourceUrl} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
