/**
 * Slugs the admin CANNOT use when creating Pages because the storefront
 * already renders them via hardcoded route files in app/(shop)/<slug>/page.tsx
 * (or other system routes that must never collide).
 *
 * Plan 5 keeps the hardcoded files untouched — when one of these slugs is
 * created in the DB, the storefront would still serve the hardcoded version
 * (Next.js prefers static routes over the catch-all). To avoid the
 * "I created a page but it doesn't render" confusion, we block these slugs
 * at the server-action layer with a clear error message.
 *
 * Plan 5.5 (future): migrate each hardcoded page to a seeded Page record and
 * delete the file. Then the corresponding entry can be removed from this list.
 */
export const RESERVED_PAGE_SLUGS = new Set<string>([
  // Hardcoded content pages (currently in app/(shop)/<slug>/page.tsx).
  "nosotros",
  "terminos",
  "privacidad",
  "envios",
  "preguntas",
  "contacto",
  "devoluciones",
  "diagnostico",

  // System / commerce routes that must never collide.
  "carrito",
  "checkout",
  "productos",
  "categoria",
  "orden",
  "iniciar-sesion",
  "registro",
  "cuenta",
  "libro-reclamaciones",
  "newsletter",
  "robots.txt",
  "sitemap.xml",
  "admin",
  "admin-auth",
  "api",
  "limpiar-sesion",
  "sign-out",
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.has(slug.toLowerCase().trim())
}
