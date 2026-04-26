import { permanentRedirect } from "next/navigation"

// Plan 5.6: legal policies live under /politicas/<slug>. This file remains
// only to 301-redirect old links/bookmarks to the canonical URL.
export default function DevolucionesRedirect(): never {
  permanentRedirect("/politicas/devoluciones")
}
