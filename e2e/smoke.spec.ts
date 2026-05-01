import { test, expect } from "@playwright/test"

test.describe("Storefront smoke", () => {
  test("home page renders without errors", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.ok(), "home should respond 2xx").toBeTruthy()
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("cart page renders", async ({ page }) => {
    const response = await page.goto("/carrito")
    expect(response?.ok(), "cart should respond 2xx").toBeTruthy()
    await expect(page.locator("body")).not.toBeEmpty()
  })
})
