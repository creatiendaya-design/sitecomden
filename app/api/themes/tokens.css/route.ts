import { NextResponse } from "next/server"
import { getThemesCssBundle } from "@/lib/themes/get-themes-css"

/**
 * Serves the storefront's themes stylesheet (Plan 11).
 *
 * Includes one rule per installed theme keyed by `.theme-<id>`, plus a
 * `:root` fallback using the currently-active theme. The storefront sets
 * `<body class="theme-<id>">` so swapping themes is a pure className swap.
 *
 * Cache strategy:
 *   - The URL carries a `?h=<hash>` derived from MAX(theme.updatedAt) +
 *     active id; admin token edits produce a new hash → new URL.
 *   - We respond with `immutable` + 1 year max-age so browsers/CDNs hold
 *     the file until the URL changes.
 *   - When the hash is missing or stale (legacy clients hitting an old
 *     URL), we still serve the current bundle, just without immutable so
 *     they refresh on the next nav.
 */
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedHash = url.searchParams.get("h")

  const bundle = await getThemesCssBundle()
  const matchesHash = requestedHash === bundle.hash

  return new NextResponse(bundle.css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": matchesHash
        ? "public, max-age=31536000, immutable"
        : "public, max-age=60, stale-while-revalidate=300",
      "X-Themes-Hash": bundle.hash,
    },
  })
}
