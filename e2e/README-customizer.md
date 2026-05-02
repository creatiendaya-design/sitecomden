# Customizer E2E suite

Playwright specs in `e2e/customizer-*.spec.ts` cover the product customizer
end-to-end journeys. They are **skipped by default** because they depend on a
seeded product + customizable template that doesn't ship with the codebase.

## Unlocking the suite

1. Create a product with slug `polo-personalizable` in your dev database.
2. Create a `CustomizableTemplate` in `/admin/personalizables/nuevo`:
   - At least one zone (`Frontal`) with a mockup image and bounds defined.
   - Optionally a second zone (`Trasera`) for the zone-persistence test.
   - Allow Inter font and #000000 color (the test layer uses those defaults).
3. Assign the template to the product in the admin product form.
4. Edit each spec file and remove `.skip` from the `test.describe.skip(...)` call.

## Running

```bash
npx playwright test e2e/customizer-*.spec.ts
```

## Why skipped

CI cannot guarantee the seed exists. When a fixture system or a setup hook is
added, the `.skip` can be removed permanently and the suite enters CI.

## Helpful fixtures

- `e2e/fixtures/mock-upload.ts` — `mockUploadEndpoint(page)` intercepts
  `/api/upload` and returns a fake Vercel Blob URL, so tests don't actually
  upload. Required for any spec that triggers add-to-cart.
