/**
 * @file page.tsx
 * @description Redirects the root URL to the About page.
 *
 * Temporary redirect while the platform is in pre-launch mode.
 * The About page is the only publicly visible section; all other
 * pages display a "Coming soon" overlay (controlled in AppShell).
 *
 * Once the platform is ready for public launch, this file should be
 * restored to render the full home dashboard.
 */

import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/sobre")
}
