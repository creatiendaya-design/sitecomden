import type { Page } from "@playwright/test";

/**
 * Cart helpers for E2E tests.
 *
 * The storefront persists the cart in localStorage under the key
 * `cart-storage` via Zustand's `persist` middleware. Manipulating that
 * key lets tests skip the entire "browse products → click add to cart"
 * dance and jump straight into checkout flows, which is the only way to
 * write deterministic E2E tests without a seeded product catalog.
 *
 * The persisted shape is the standard Zustand-persist envelope:
 *   { state: { items: CartItem[] }, version: 0 }
 */

export interface SeedCartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  slug: string;
  price: number;
  originalUnitPrice?: number;
  quantity: number;
  image?: string;
  maxStock: number;
  options?: Record<string, string>;
}

export const SAMPLE_ITEM: SeedCartItem = {
  id: "test-product-1",
  productId: "test-product-1",
  name: "Camiseta de prueba",
  slug: "camiseta-de-prueba",
  price: 50,
  originalUnitPrice: 50,
  quantity: 2,
  maxStock: 99,
};

/**
 * Pre-populate the cart in localStorage *before* the page mounts.
 * Call this AFTER an initial navigation so the origin exists in the
 * browser context — Playwright forbids writing localStorage cross-origin.
 */
export async function seedCart(
  page: Page,
  items: SeedCartItem[] = [SAMPLE_ITEM],
): Promise<void> {
  await page.evaluate((seed) => {
    localStorage.setItem(
      "cart-storage",
      JSON.stringify({
        state: { items: seed },
        version: 0,
      }),
    );
  }, items);
}

/** Drop everything from the cart. */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("cart-storage");
  });
}

/** Read the current cart state straight from localStorage (debug-friendly). */
export async function readCart(
  page: Page,
): Promise<{ items: SeedCartItem[] } | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("cart-storage");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { state?: { items?: SeedCartItem[] } };
      return { items: parsed.state?.items ?? [] };
    } catch {
      return null;
    }
  });
}
