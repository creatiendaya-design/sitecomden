/**
 * Maximum nesting depth allowed in a Menu, counting from 0.
 * Depth 0 = root, 1 = child, 2 = grandchild → 3 levels total.
 * Matches Shopify's main-menu cap.
 *
 * Enforced server-side in actions/menus.ts (computeDepth + cycle check)
 * and surfaced in the admin editor + storefront renderers as a UI gate.
 */
export const MAX_MENU_DEPTH = 3
