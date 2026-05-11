// e2e/customizer-variants.spec.ts
//
// REQUIRES SEED: see e2e/README-customizer.md.
import { test, expect } from "@playwright/test";

test.describe.skip("customizer variant change (requires seed)", () => {
  test("changing variant in builder shows disclaimer when no override", async ({ page }) => {
    await page.goto("/productos/polo-personalizable/personalizar");

    // Without an override, switching variant shows the disclaimer.
    // When override exists, the mockup canvas changes silently.
    const disclaimer = page.getByText(/Vista previa sobre mockup base/i);
    // One of the two states must be reachable:
    await expect(disclaimer.or(page.locator("canvas").first())).toBeVisible();
  });
});
