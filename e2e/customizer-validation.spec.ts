// e2e/customizer-validation.spec.ts
//
// REQUIRES SEED: see e2e/README-customizer.md.
import { test, expect } from "@playwright/test";

test.describe.skip("customizer validation (requires seed)", () => {
  test("disables add-to-cart when no layers exist", async ({ page }) => {
    await page.goto("/productos/polo-personalizable/personalizar");
    const btn = page.getByRole("button", { name: /añadir al carrito/i });
    await expect(btn).toBeDisabled();
  });

  test.skip(
    "server-side rejects tampered customDesign",
    async () => {
      // Requires an API helper or test-only endpoint to POST a tampered
      // checkout payload directly. Out of scope for client E2E.
    }
  );
});
