// e2e/customizer-edit.spec.ts
//
// REQUIRES SEED: see e2e/README-customizer.md.
import { test, expect } from "@playwright/test";
import { mockUploadEndpoint } from "./fixtures/mock-upload";

test.describe.skip("customizer edit-from-cart (requires seed)", () => {
  test("edit design from cart preserves cart item", async ({ page }) => {
    await mockUploadEndpoint(page);

    await page.goto("/productos/polo-personalizable/personalizar");
    await page.getByRole("button", { name: /^capas$/i }).first().click();
    await page.getByRole("button", { name: /\+ texto/i }).click();
    await page.getByRole("button", { name: /añadir al carrito/i }).click();
    await expect(page.getByText(/añadido al carrito/i)).toBeVisible();

    await page.goto("/carrito");
    await page.getByRole("link", { name: /editar diseño/i }).click();
    await expect(page).toHaveURL(/cartItemId/);

    await expect(page.getByRole("button", { name: /guardar cambios/i })).toBeVisible();
  });
});
