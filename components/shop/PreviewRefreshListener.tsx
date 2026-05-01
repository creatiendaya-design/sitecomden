"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Listens for `theme-preview-refresh` postMessage events from the parent
 * customizer iframe and triggers a Next.js soft refresh inside the iframe.
 *
 * Why postMessage instead of a full `location.reload()`: the customizer
 * autosaves on every edit, and a hard reload would re-download every
 * asset and run a fresh server render — including a Neon cold start in
 * the worst case — for every keystroke. `router.refresh()` only re-runs
 * the server components and re-fetches data, keeping browser cache,
 * scroll position, and React client state intact.
 *
 * Security: the listener strictly requires the message origin to match
 * the storefront's own origin, so nothing on the public web can ever
 * trigger a refresh on a real visitor's tab.
 */
export function PreviewRefreshListener() {
  const router = useRouter()

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (
        typeof e.data === "object" &&
        e.data !== null &&
        (e.data as { type?: unknown }).type === "theme-preview-refresh"
      ) {
        router.refresh()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [router])

  return null
}
