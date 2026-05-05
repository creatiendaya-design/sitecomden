# Test Coverage Proposal — ShopGood PE
**Date:** 2026-05-05  
**Author:** Claude Code (automated audit)  
**Branch:** `chore/test-coverage-proposal-2026-05-05`

---

## 1. Current State

### Infrastructure

As of this audit the project has **no test infrastructure**. The CLAUDE.md states "There are no automated tests in this project." This proposal bootstraps Vitest (unit/integration) as the first step; Playwright (E2E) would follow in a separate PR.

Files added on this branch:
- `vitest.config.ts` — Vitest + jsdom + path alias configuration
- `vitest.setup.ts` — `@testing-library/jest-dom` import
- `devDependencies` — `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
- Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:e2e`

### Baseline Coverage (`npm run test:coverage` — 2026-05-05)

```
Statements   : 0% ( 0 / 4,165 )
Branches     : 0% ( 0 / 2,869 )
Functions    : 0% ( 0 /   691 )
Lines        : 0% ( 0 / 3,874 )
```

There are no test files; coverage is zero across 30+ `actions/` files, 25+ `lib/` files, `lib/blocks/`, `lib/themes/`, `lib/menus/`, `lib/validations/`, and `store/`.

---

## 2. Audit — `lib/blocks/`

| File | Classification | Reason |
|------|---------------|--------|
| `registry.ts` | **PURE** | Pure Map operations: `registerBlock`, `getBlockDefinition`, `getBlockDefinitionsForScope`, `getBlockDefinitionsByCategory`. No imports except types. |
| `apply-style.ts` | **PURE** | Maps `BlockStyle` → Tailwind class strings + `CSSProperties`. Entirely deterministic, no side effects. |
| `resolve.ts` | **PURE** | `resolveForDevice` / `resolveContentForDevice` — primitive value resolution with device fallback logic. No IO. |
| `resolve-product-blocks.ts` | **DB/IO** | Directly queries `prisma.product`, `prisma.templateBlock`, and calls `resolveActiveTheme()`. Skip for unit tests; candidate for Prisma integration tests. |
| `template-diff.ts` | **PURE** | `computeTemplateDiff` compares two `BlockInstance[]` arrays by id/position/content (JSON.stringify). Zero dependencies beyond types. |
| `sanitize-rich-text.ts` | **MIXED** | Wraps `isomorphic-dompurify`. Works in jsdom, so unit-testable but needs DOM environment configured. Security-critical. |
| `defaults.ts` | **MIXED** | `DEFAULT_STYLE` is pure; `DEFAULT_CONTENT_V2` calls `crypto.randomUUID()` at module-load time (FAQ, TRUST_BADGES entries). Test the style defaults; UUID fields need to be treated as opaque. |
| `schema/index.ts` | **PURE** | Re-export barrel; no runtime logic. |
| `schema/types.ts` | **PURE** | TypeScript type definitions only; no runtime. |
| `extract-preview-image.ts` | **PURE** | Iterates block list, extracts first image URL. Pure logic, no IO. |
| `feature-flag.ts` | **DB/IO** | Calls `getSetting()` which reads the `Setting` table via Prisma. Skip for unit tests. |
| `types.ts` | **PURE** | Type-only definitions; no runtime. |

### Summary

- **Pure (unit-testable without mocks):** `registry.ts`, `apply-style.ts`, `resolve.ts`, `template-diff.ts`, `extract-preview-image.ts`
- **Mixed (testable with jsdom/env):** `sanitize-rich-text.ts`, `defaults.ts`
- **DB/IO (skip unit tests):** `resolve-product-blocks.ts`, `feature-flag.ts`

---

## 3. Audit — `actions/*.ts`

All server actions use `"use server"` and import Prisma. They are Prisma-bound and require a live database for integration testing. However, several contain extractable pure logic that is worth targeting.

| File | Size | Pure Logic Candidates | Integration Priority |
|------|------|-----------------------|---------------------|
| `orders.ts` | 903 loc | Zod schemas (`createOrderSchema`, `updateOrderStatusSchema`), status validation | **HIGH** — core checkout |
| `loyalty.ts` | 874 loc | `calculateLoyaltyTier(points, settings)`, `generateReferralCode(name)` | HIGH — loyalty tier boundaries |
| `shipping-system.ts` | 838 loc | Rate calculation rules (zone × weight) | HIGH — shipping cost correctness |
| `complaints.ts` | 584 loc | Form field validation | MEDIUM |
| `landing-templates.ts` | 552 loc | Template clone/propagate logic | MEDIUM |
| `inventory.ts` | 472 loc | Summary aggregation helpers | MEDIUM |
| `shipping-edit.ts` | 465 loc | Address normalization | MEDIUM |
| `users.ts` | 457 loc | Password hashing wrapper | MEDIUM |
| `themes.ts` | 394 loc | CSS token generation (delegates to `lib/themes/get-themes-css.ts`) | MEDIUM |
| `roles.ts` | 383 loc | Permission set reconciliation | LOW-MEDIUM |
| `pages.ts` | 350 loc | Slug uniqueness checks | LOW |
| `menus.ts` | 349 loc | Tree structure serialization | LOW |
| `shipping-checkout.ts` | 316 loc | Shipping rate selection | HIGH |
| `payment-settings.ts` | 280 loc | Config key normalization | LOW |
| `locations.ts` | 270 loc | District hierarchy lookups | LOW |
| `pending-payments.ts` | 269 loc | Approval state machine | HIGH — financial |
| `stock.ts` | 260 loc | Adjustment quantity validation | MEDIUM |
| `products-import.ts` | ~182 loc | CSV row parsing, variant mapping | MEDIUM |
| `sunat.ts` | 208 loc | Invoice payload building | HIGH — financial/legal |

**Integration test candidates:** `orders.ts`, `loyalty.ts`, `pending-payments.ts`, `shipping-checkout.ts`, `sunat.ts` — these touch the most revenue-critical flows.

---

## 4. Prioritized Next Test Files (8–12)

Ordered by: **risk × business criticality × effort-to-value ratio**.

### Priority 1 — `lib/order-status-logic.test.ts` ★★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/order-status-logic.ts` |
| **Type** | Unit |
| **Why** | Pure state-machine for order/payment/fulfillment transitions. Bugs here cause illegal order state combinations (e.g. marking shipped without payment) that corrupt revenue data. 8 exported functions, all pure. |
| **Effort** | S (< 2h) — pure functions with simple boolean/string inputs |
| **Functions** | `canCancelOrder`, `canRefundPayment`, `canMarkPaymentAsFailed`, `isTerminalOrderStatus`, `isTerminalPaymentStatus`, `isTerminalFulfillmentStatus`, `validateStatusCoherence`, transition tables |

### Priority 2 — `lib/sunat-igv.test.ts` ★★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/sunat-igv.ts` |
| **Type** | Unit |
| **Why** | IGV (Peruvian VAT) calculation for electronic invoices is a legal requirement. Off-by-one in rounding or wrong IGV rate classification = invalid invoices and SUNAT penalties. Pure arithmetic, extremely high business criticality. |
| **Effort** | S (< 2h) — arithmetic tests with known inputs/outputs |
| **Functions** | `buildNubefactItem` (GRAVADO/EXONERADO/INAFECTO × include/exclude IGV), `buildTotals` |

### Priority 3 — `lib/blocks/template-diff.test.ts` ★★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/template-diff.ts` |
| **Type** | Unit |
| **Why** | Drives the "N cambios pendientes" counter and the save-and-propagate dialog. A wrong diff means admins either see false positives or miss real changes and overwrite content silently. Pure algorithm with well-defined contract. |
| **Effort** | S (< 1.5h) |
| **Functions** | `computeTemplateDiff`, `diffCount` |

### Priority 4 — `lib/blocks/apply-style.test.ts` ★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/apply-style.ts` |
| **Type** | Unit |
| **Why** | Single source of truth for how block style properties map to Tailwind classes + inline CSS across all 12 block types. Regressions silently break the visual design of every block on every page. |
| **Effort** | M (2–3h) — large mapping table, need to cover gradient/color/padding combinations |
| **Functions** | `applyBlockStyle` with every style property and its interaction with gradient overrides |

### Priority 5 — `lib/blocks/resolve.test.ts` ★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/resolve.ts` |
| **Type** | Unit |
| **Why** | Device-resolution logic (desktop/mobile fallback) is used by every block renderer. A bug causes wrong styles/images on mobile or desktop and is hard to catch without automation. |
| **Effort** | S (< 1.5h) — edge cases are null/undefined/primitive/object-without-device-keys |
| **Functions** | `resolveForDevice`, `resolveContentForDevice` |

### Priority 6 — `lib/blocks/registry.test.ts` ★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/registry.ts` |
| **Type** | Unit |
| **Why** | Block registration is a global mutable singleton; incorrect scope filtering causes blocks to appear in wrong builders (product blocks in page builder, etc.). |
| **Effort** | S (1h) |
| **Functions** | `registerBlock`, `getBlockDefinition`, `getBlockDefinitionsForScope`, `getBlockDefinitionsByCategory` |

### Priority 7 — `lib/blocks/sanitize-rich-text.test.ts` ★★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/sanitize-rich-text.ts` |
| **Type** | Unit (jsdom) |
| **Why** | Admin-authored rich text HTML is sanitized before rendering. XSS via `<script>`, `onerror`, `javascript:` href, or CSS `expression()` must be blocked. Security-critical. |
| **Effort** | S (1h) — allowlist acceptance + XSS payload rejection cases |
| **Functions** | `sanitizeRichText` |

### Priority 8 — `lib/utils.test.ts` ★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/utils.ts` |
| **Type** | Unit |
| **Why** | `formatPrice`, `formatOrderNumber`, `displayOrderNumber` appear throughout the UI. A broken number format affects every order number and price display sitewide. |
| **Effort** | XS (< 1h) |
| **Functions** | All 4 exports |

### Priority 9 — `lib/blocks/extract-preview-image.test.ts` ★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/blocks/extract-preview-image.ts` |
| **Type** | Unit |
| **Why** | Auto-populates template card thumbnails; wrong extraction breaks the admin template gallery UX. Pure traversal logic across 4 block types. |
| **Effort** | XS (< 1h) |
| **Functions** | `extractPreviewImage` |

### Priority 10 — `store/cart.test.ts` ★
| Attribute | Value |
|-----------|-------|
| **Source** | `store/cart.ts` |
| **Type** | Unit |
| **Why** | Zustand cart store drives the entire checkout flow. `addItem` stock-limit guard, `updateQuantity` bounds, `getTotalPrice` accuracy are customer-facing correctness issues. |
| **Effort** | M (2h) — need to stub Zustand localStorage |
| **Functions** | `addItem`, `removeItem`, `updateQuantity`, `getTotalItems`, `getTotalPrice`, `canAddMore` |

### Priority 11 — `lib/validations.test.ts` ★
| Attribute | Value |
|-----------|-------|
| **Source** | `lib/validations.ts`, `lib/validations/checkout.ts` |
| **Type** | Unit |
| **Why** | Zod schemas validate all public inputs (products, orders, coupons). Testing edge cases (Peru phone format, RUC format, slug regex) prevents silent data corruption. |
| **Effort** | M (2h) — many schemas, focus on Peru-specific regex validators |
| **Functions** | `slugSchema`, `phoneSchema`, `dniSchema`, `rucSchema`, `createProductSchema`, `createOrderSchema` |

### Priority 12 — `actions/loyalty.ts` (pure helpers) ★
| Attribute | Value |
|-----------|-------|
| **Source** | `actions/loyalty.ts` (extracted helpers) |
| **Type** | Unit (extract functions) or Integration |
| **Why** | `calculateLoyaltyTier` determines customer loyalty level (BRONZE→PLATINUM) and drives reward eligibility. Wrong tier boundaries misclassify customers at thresholds. Currently a private function — should be extracted to `lib/loyalty-tiers.ts` for testability. |
| **Effort** | M (2h including extraction refactor) |
| **Functions** | `calculateLoyaltyTier`, `generateReferralCode` |

---

## 5. Infrastructure Gaps

### 5.1 Prisma Integration Tests
- **Problem:** All `actions/*.ts` require a real PostgreSQL connection. There is no test database, no seed strategy, no isolation between test runs.
- **Recommendation:** Add [Testcontainers for Node.js](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/) (`@testcontainers/postgresql`) so each CI run spins up a fresh Postgres container. Pair with `prisma migrate deploy` in a `globalSetup` Vitest file and a seed script (`scripts/seed-test.ts`) for deterministic fixtures.
- **Effort:** L (1–2 days) — high one-time cost but unlocks all action integration tests.

### 5.2 Next.js Server Action Mocking
- **Problem:** Server actions import `next/cache` (`revalidatePath`), `next/headers`, and Clerk. These modules fail in Vitest's jsdom environment.
- **Recommendation:** Add a `__mocks__/next/` directory or use Vitest's `vi.mock()` to stub `next/cache`, `next/headers`, and `@clerk/nextjs`. This unblocks action testing even without a real DB.

### 5.3 E2E (Playwright) Setup
- **Problem:** No `playwright.config.ts` exists; `npm run test:e2e` will fail.
- **Recommendation:** Add `playwright.config.ts` targeting `http://localhost:3000`, with a `webServer` config that runs `npm run dev` before tests. Start with 2–3 critical path specs: add-to-cart → checkout form, admin login, product search.
- **Effort:** M (1 day for config + first 3 specs).

### 5.4 Test Data Factories
- **Problem:** No shared factories for `Product`, `Order`, `Customer`, etc. Each test file will hand-craft fixtures, leading to drift and duplication.
- **Recommendation:** Create `tests/factories/` with builder-pattern helpers (e.g. `buildProduct({ price: 100 })`). Can be plain TypeScript objects for unit tests; for integration tests, they should also write to the DB via Prisma.

### 5.5 CI Integration
- **Problem:** No CI workflow runs tests on PR.
- **Recommendation:** Add `.github/workflows/test.yml` that runs `npm run test:coverage` on every push. Fail the build if coverage drops below a threshold (suggest starting at 10% to avoid blocking while coverage ramps up).

---

## 6. Quick-Win Coverage Estimate

If the 12 test files above are implemented, estimated new coverage:

| Area | Est. new statement coverage |
|------|-----------------------------|
| `lib/order-status-logic.ts` | ~95% |
| `lib/sunat-igv.ts` | ~90% |
| `lib/blocks/template-diff.ts` | ~95% |
| `lib/blocks/apply-style.ts` | ~90% |
| `lib/blocks/resolve.ts` | ~95% |
| `lib/blocks/registry.ts` | ~85% |
| `lib/blocks/sanitize-rich-text.ts` | ~90% |
| `lib/utils.ts` | ~95% |
| `lib/blocks/extract-preview-image.ts` | ~90% |
| `store/cart.ts` | ~80% |
| `lib/validations.ts` (partial) | ~60% |
| `actions/loyalty.ts` (helpers only) | ~20% |

**Projected overall coverage after these 12 files:** ~8–12% statements (conservative, since the vast majority of lines are in DB-bound actions that remain untested).

---

*Report generated by automated audit on branch `chore/test-coverage-proposal-2026-05-05`.*  
*See scaffolded test files in:*
- `lib/order-status-logic.test.ts`
- `lib/sunat-igv.test.ts`
- `lib/blocks/template-diff.test.ts`
