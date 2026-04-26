import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Plan 13 — /admin/personalizar redirects to the themes list. Like
 * Shopify's /admin/themes, that's where admins land to pick which theme
 * to edit. The legacy section-list editor (modals) was replaced by the
 * Customizer (split-screen) reachable via "Editar tema" on each card.
 */
export default function PersonalizarPage() {
  redirect("/admin/personalizar/temas")
}
