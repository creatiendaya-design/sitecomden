// e2e/customizer-zones.spec.ts
//
// REQUIRES SEED: see e2e/README-customizer.md.
import { test, expect } from "@playwright/test";

test.describe.skip("customizer zones (requires seed)", () => {
  test("layers persist when switching between zones", async ({ page }) => {
    await page.goto("/productos/polo-personalizable/personalizar");

    await page.getByRole("button", { name: /^capas$/i }).first().click();
    await page.getByRole("button", { name: /\+ texto/i }).click();

    // Switch to Trasera
    await page.getByRole("button", { name: /trasera/i }).click();
    // Layer count for trasera should be 0 - observable via "0 capas" hint
    await expect(page.getByText(/0 capas|toca \+ texto para empezar/i)).toBeVisible();

    // Back to Frontal
    await page.getByRole("button", { name: /frontal/i }).click();
    // Frontal should still have 1 layer
    await expect(page.getByText(/1 cap[as]/i).first()).toBeVisible();
  });
});
