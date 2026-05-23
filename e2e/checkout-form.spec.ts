import { test, expect } from "@playwright/test";
import { clearCart, seedCart } from "./fixtures/cart";

/**
 * Checkout form structural E2E.
 *
 * Asserts the checkout page renders all required customer fields and
 * surfaces validation errors when invalid input is provided. We do NOT
 * submit the form — that would require a seeded product, shipping zones,
 * and either a Culqi mock or a configured payment provider (out of
 * scope for this slice).
 *
 * Catches regressions like:
 *   - a refactor accidentally removing the email/phone field
 *   - validation regex drifting (DNI must be 8 digits, phone 9 digits)
 *   - the customer info card disappearing entirely
 *
 * Selector strategy: the checkout uses shadcn CardTitle (a <div>, not a
 * heading) and a Zustand-hydrated client cart, so we:
 *   - assert text/locator presence rather than getByRole('heading')
 *   - wait for the contact form to mount (proves the cart hydrated)
 *     before driving the inputs
 */

async function gotoCheckoutWithCart(page: import("@playwright/test").Page) {
  await page.goto("/checkout");
  // Cart hydrates client-side from localStorage. The contact info field
  // doesn't appear until then; wait for it as our hydration signal.
  await page.waitForSelector('input[name="customerName"]', { timeout: 10_000 });
}

test.describe("Checkout form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearCart(page);
    await seedCart(page);
  });

  test("renders all required customer fields", async ({ page }) => {
    await gotoCheckoutWithCart(page);

    await expect(page.locator('input[name="customerName"]')).toBeVisible();
    await expect(page.locator('input[name="customerEmail"]')).toBeVisible();
    await expect(page.locator('input[name="customerPhone"]')).toBeVisible();
    await expect(page.locator('input[name="customerDni"]')).toBeVisible();
    await expect(page.locator('input[name="address"]')).toBeVisible();
  });

  test("renders the contact info and shipping address sections", async ({
    page,
  }) => {
    await gotoCheckoutWithCart(page);

    await expect(page.getByText(/información de contacto/i)).toBeVisible();
    await expect(page.getByText(/dirección de envío/i)).toBeVisible();
  });

  test("DNI field caps at 8 chars", async ({ page }) => {
    await gotoCheckoutWithCart(page);

    const dni = page.locator('input[name="customerDni"]');
    await dni.fill("");
    await dni.pressSequentially("123456789012", { delay: 5 });
    const value = await dni.inputValue();
    expect(value.length).toBeLessThanOrEqual(8);
  });

  test("phone field caps at 9 chars", async ({ page }) => {
    await gotoCheckoutWithCart(page);

    const phone = page.locator('input[name="customerPhone"]');
    await phone.fill("");
    await phone.pressSequentially("9876543210999", { delay: 5 });
    const value = await phone.inputValue();
    expect(value.length).toBeLessThanOrEqual(9);
  });

  test("email field surfaces a validation error on invalid input + blur", async ({
    page,
  }) => {
    await gotoCheckoutWithCart(page);

    const email = page.locator('input[name="customerEmail"]');
    await email.fill("not-an-email");
    await email.blur();

    // Either the inline error text appears OR the input is marked invalid.
    // We assert the destructive border class as a robust signal.
    await expect(email).toHaveClass(/border-destructive/, { timeout: 2000 });
  });

  test("WhatsApp opt-in checkbox is present and toggleable", async ({
    page,
  }) => {
    await gotoCheckoutWithCart(page);

    const checkbox = page.getByRole("checkbox", {
      name: /acepto recibir actualizaciones.*whatsapp/i,
    });
    await expect(checkbox).toBeVisible();

    const initial = await checkbox.isChecked();
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(!initial);
  });
});
