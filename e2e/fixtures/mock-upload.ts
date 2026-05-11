// e2e/fixtures/mock-upload.ts
import type { Page } from "@playwright/test";

export async function mockUploadEndpoint(page: Page) {
  await page.route("**/api/upload", async (route) => {
    const url = `https://test.public.blob.vercel-storage.com/mock-${Date.now()}.png`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url }),
    });
  });
}
