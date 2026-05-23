import { test, expect } from "@playwright/test";
import { SAMPLE_ITEM, clearCart, readCart, seedCart } from "./fixtures/cart";

/**
 * Cart persistence E2E.
 *
 * We don't try to seed a real product into Postgres — that would couple
 * every E2E run to a working DB + admin auth flow. Instead we manipulate
 * the Zustand-persist localStorage key directly and verify the UI
 * reflects the cart state correctly. This catches:
 *   - the persist envelope shape drifting (rename of `cart-storage`)
 *   - the empty-cart view appearing when items disappear
 *   - the totals summary updating with quantities
 */

test.describe("Cart persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Need an origin established before we can poke localStorage.
    await page.goto("/");
    await clearCart(page);
  });

  test("empty cart shows the 'carrito vacío' state", async ({ page }) => {
    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: /tu carrito está vacío/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /ver productos/i })).toBeVisible();
  });

  test("seeded cart renders the item and order summary", async ({ page }) => {
    await seedCart(page);
    await page.goto("/carrito");

    // The item name and the cart page header confirm the non-empty view.
    await expect(page.getByText(SAMPLE_ITEM.name).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /carrito de compras/i }),
    ).toBeVisible();

    // The subtotal summary text appears for non-empty carts regardless of
    // whether the stock-check API approves the item (the dev server may
    // not have this test-product id seeded; we still want to verify the
    // cart layout rendered correctly).
    await expect(page.getByText(/subtotal/i).first()).toBeVisible();
  });

  test("cart state survives a page reload", async ({ page }) => {
    await seedCart(page);

    await page.goto("/carrito");
    await expect(page.getByText(SAMPLE_ITEM.name).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(SAMPLE_ITEM.name).first()).toBeVisible();

    // Persisted state still readable.
    const persisted = await readCart(page);
    expect(persisted?.items).toHaveLength(1);
    expect(persisted?.items[0].id).toBe(SAMPLE_ITEM.id);
    expect(persisted?.items[0].quantity).toBe(SAMPLE_ITEM.quantity);
  });

  test("clearing the cart returns to the empty state", async ({ page }) => {
    await seedCart(page);
    await page.goto("/carrito");
    await expect(page.getByText(SAMPLE_ITEM.name).first()).toBeVisible();

    await clearCart(page);
    await page.reload();

    await expect(
      page.getByRole("heading", { name: /tu carrito está vacío/i }),
    ).toBeVisible();
  });

  test("multiple items are reflected in the cart count", async ({ page }) => {
    await seedCart(page, [
      { ...SAMPLE_ITEM, id: "a", productId: "a", name: "Item A", quantity: 1 },
      { ...SAMPLE_ITEM, id: "b", productId: "b", name: "Item B", quantity: 3 },
    ]);
    await page.goto("/carrito");

    await expect(page.getByText("Item A").first()).toBeVisible();
    await expect(page.getByText("Item B").first()).toBeVisible();

    // Subtotal text mentions the total quantity (4 productos).
    await expect(page.getByText(/4\s+productos/i)).toBeVisible();
  });
});
