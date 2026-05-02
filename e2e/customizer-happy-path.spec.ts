// e2e/customizer-happy-path.spec.ts
//
// REQUIRES SEED: a Product with slug "polo-personalizable" must exist
// with a CustomizableTemplate assigned. See e2e/README-customizer.md.
import { test, expect } from "@playwright/test";
import { mockUploadEndpoint } from "./fixtures/mock-upload";

test.describe.skip("customizer happy path (requires seed)", () => {
  test("producto -> personalizar -> anadir al carrito", async ({ page }) => {
    await mockUploadEndpoint(page);

    await page.goto("/productos/polo-personalizable");
    await expect(page.getByRole("link", { name: /empieza a diseñar/i })).toBeVisible();
    await page.getByRole("link", { name: /empieza a diseñar/i }).click();

    await expect(page).toHaveURL(/\/personalizar/);

    await page.getByRole("button", { name: /^capas$/i }).first().click();
    await page.getByRole("button", { name: /\+ texto/i }).click();

    // mock-konva (vitest only) doesn't run in Playwright; but the real Konva
    // renders into <canvas>. Assert via the price breakdown becoming active.
    await page.getByRole("button", { name: /añadir al carrito/i }).click();
    await expect(page.getByText(/añadido al carrito/i)).toBeVisible({ timeout: 10000 });
  });
});
