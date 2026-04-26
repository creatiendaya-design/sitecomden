/**
 * Slugs the admin CANNOT use when creating Pages because the storefront
 * already renders them via hardcoded route files in app/(shop)/<slug>/page.tsx
 * (or other system routes that must never collide).
 *
 * Plan 5.6 migrated `nosotros` and `preguntas` to seeded Page records, so
 * those slugs were freed. The legal policies (terminos / privacidad / envios
 * / devoluciones) now live under /politicas/<slug> as Policy entities; their
 * old top-level slugs remain reserved because the route files still exist as
 * 301 redirects.
 */
export const RESERVED_PAGE_SLUGS = new Set<string>([
  // Hardcoded content routes still served from app/(shop)/<slug>/page.tsx.
  "contacto",
  "diagnostico",

  // Old policy slugs — kept reserved while the redirect routes exist.
  "terminos",
  "privacidad",
  "envios",
  "devoluciones",

  // New policies index — Pages can never claim this prefix.
  "politicas",

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
