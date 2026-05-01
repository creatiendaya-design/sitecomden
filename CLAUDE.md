# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build (also runs type-checking)
npm run lint      # Run ESLint
npm start         # Start production server
```

Database commands:
```bash
npx prisma studio              # Open Prisma GUI
npx prisma migrate dev         # Create + apply migration
npx prisma db push             # Push schema without migration
npx prisma generate            # Regenerate Prisma client
npx tsx scripts/<script>.ts    # Run a utility script
```

There are no automated tests in this project. Verification is done via `npm run build` (type-check) + manual smoke testing in the browser.

## Stack

- **Framework**: Next.js 16.1.1 (App Router) + React 19.2.3 + TypeScript 5
- **Database**: Prisma 6.19 + PostgreSQL (Neon)
- **Auth**: Clerk (`@clerk/nextjs` 6.36) for customers + custom cookie sessions for admins
- **Styling**: Tailwind CSS v4 + `tw-animate-css` + Radix UI primitives (shadcn/ui)
- **State**: Zustand 5 (cart only) + React Context (ColorSchemesContext, etc.)
- **Forms**: React Hook Form + `@hookform/resolvers` + Zod 4
- **Rich text**: Tiptap 3 (StarterKit + image, link, color, text-align, underline)
- **DnD**: `@dnd-kit/core` + `sortable` (page builder, menu tree, etc.)
- **Email**: Resend + React Email (`@react-email/components`)
- **Payments**: Culqi (`culqi-node`) for cards; manual flow for Yape/Plin; PayPal; COD
- **Invoicing**: SUNAT electronic documents via NubeFact
- **Storage**: Vercel Blob (`@vercel/blob`)
- **Rate limiting**: Upstash Redis
- **Image processing**: Sharp
- **Charts**: Recharts
- **Icons**: lucide-react + `@radix-ui/react-icons`
- **Toast**: Sonner
- **CSV**: PapaParse (Shopify import/export)
- **Sanitization**: isomorphic-dompurify

## Architecture Overview

Full-stack e-commerce platform for Peru (ShopGood) with a Shopify-style theme/page-builder system.

### Dual Authentication

- **Customers** — Clerk. Routes: `/iniciar-sesion`, `/registro`. Webhook at `/api/webhooks/clerk` syncs `Customer` rows.
- **Admins** — Custom cookie-based sessions (`admin_session`). Logic in [lib/auth.ts](lib/auth.ts). RBAC with granular per-user and per-role permissions in [lib/permissions.ts](lib/permissions.ts).

Both flows are enforced in [middleware.ts](middleware.ts), which also emits a per-request CSP nonce, sets HSTS and other security headers, and detects suspicious requests.

#### Admin Auth Usage

In **API Routes** — `requireAuth()` / `requirePermission()` / `requireRoleLevel()`:
```ts
const { user, response } = await requirePermission("products.create");
if (response) return response;
```

In **Server Components / Server Actions** — `protectRoute()` helpers from [lib/protect-route.ts](lib/protect-route.ts):
```ts
await protectRoute("products:view");
await protectRouteAny(["orders:view", "orders:update"]);
await protectRouteAll(["orders:view", "orders:update"]);
```

**Permission slug format**: API routes use dots (`products.create`); `lib/permissions.ts` uses colons (`products:create`). `requirePermission()` converts automatically.

**Role levels**: 1 = Staff, 3 = Editor, 5 = Manager, 10 = Admin, 100+ = Super Admin (bypasses all permission checks).

### Mutations: Server Actions vs API Routes

- **Server Actions** ([actions/*.ts](actions/)) — admin/internal mutations (orders, inventory, themes, pages, menus, loyalty, shipping, etc.). Use Prisma directly.
- **API Routes** ([app/api/](app/api/)) — public/external endpoints: product search, payment webhooks, coupon validation, newsletter, complaints, file upload, dynamic theme CSS, Clerk webhook.

### App Router Layout

```
app/
├── (shop)/              Storefront (Header, Footer, themed home/cart)
│   ├── page.tsx                  Themed or legacy home
│   ├── [slug]/                   Dynamic page resolver (Page → Policy fallback)
│   ├── productos/                Product grid + [slug]
│   ├── categoria/[slug]/         Category pages (with optional CategoryBlocks)
│   ├── carrito/                  Cart (Zustand-driven)
│   ├── cuenta/                   Customer area (perfil, ordenes, recompensas, referidos)
│   ├── politicas/[slug]/         Policy pages (Tiptap rich text)
│   └── contacto / envios / ...   Static + dynamic info pages
├── (checkout)/
│   ├── checkout/
│   └── orden/[orderId]/          confirmacion / pago-tarjeta / pago-paypal / pago-pendiente
├── admin/               Admin panel (cookie session)
│   ├── dashboard/
│   ├── productos/                productos, nuevo, importar, exportar, [productId]
│   ├── categorias/               nueva, [categoryId], builder
│   ├── ordenes/                  + [orderId]
│   ├── inventario/               nuevo, ajustar, movimientos, [productId]
│   ├── envios/                   grupos, tarifas, zonas
│   ├── pagos-pendientes/
│   ├── cupones/                  nuevo, [couponId]
│   ├── lealtad/                  configuracion, clientes, recompensas
│   ├── personalizar/             temas/[themeId]/customize  ← Theme Customizer (split-screen, auto-save)
│   ├── menus/                    [menuId]/editar
│   ├── paginas/                  [pageId]/editar  ← Page Builder
│   ├── politicas/                [policyId]
│   ├── landing-plantillas/       biblioteca, [templateId]
│   ├── libro-reclamaciones/      campos, builder, organizar, reclamaciones
│   ├── facturacion/              SUNAT electronic documents
│   ├── newsletter/
│   └── configuracion/            culqi, emails, pagos, pixeles, roles, sunat, usuarios
├── admin-auth/          login, register
├── api/                 Public API
│   ├── search/
│   ├── themes/tokens.css/        Dynamic per-theme CSS
│   ├── coupons/validate/
│   ├── newsletter/{subscribe,unsubscribe}/
│   ├── complaints/submit/
│   ├── public-key/  webhook/     Culqi
│   ├── upload/                   Vercel Blob
│   └── webhooks/clerk/
└── api/admin/           Admin API (RBAC-gated)
    ├── auth/{login,logout,register,settings}/
    ├── products/  categories/  coupons/  orders/  payments/  complaints/
    └── themes/[id]/{preview,exit-preview}/
```

### State Management

- **Cart** — Zustand with localStorage persistence, key `cart-storage` ([store/cart.ts](store/cart.ts)).
- **Customizer / Page Builder** — local Zustand store inside `components/admin/page-builder/store.ts`, plus React Context for cross-cutting concerns (e.g. `ColorSchemesContext`).
- **Everything else** — server-driven via Server Actions, `revalidatePath`, and Next.js cache.

### Components

```
components/
├── ui/                      shadcn/ui primitives (Radix)
├── shop/                    Storefront (Header, ProductCard, ProductOptions, …)
│   ├── home/                Themed home renderer
│   ├── cart/                Cart drawer + items
│   └── templates/           Product page templates (STANDARD/LANDING/MINIMAL/GALLERY)
├── checkout/                Checkout flow components
├── home/                    Legacy hardcoded home (fallback)
├── payment-icons/           Brand SVGs
├── tracking/                Pixel + Conversion API loaders
└── admin/
    ├── customizer/          Theme Customizer shell
    │   ├── CustomizerShell.tsx        Split-screen layout, zone-based, auto-save
    │   ├── CustomizerToolbar.tsx
    │   ├── CustomizerPreview.tsx      Iframe preview of /admin/themes/[id]/preview
    │   ├── CustomizerTokensPanel.tsx  Tokens editor + color scheme manager
    │   ├── EmbeddedBlocksEditor.tsx
    │   ├── ZoneList.tsx               Shopify-style zones (Home / Cart / etc.)
    │   ├── PagePicker.tsx             De-dupes home/cart entries
    │   ├── SaveStatusIndicator.tsx
    │   ├── color-schemes-context.tsx  Provides schemes to nested editors
    │   └── page-targets.ts            Page → block-target resolver
    ├── page-builder/        Reusable block editor (used by customizer + page/category builders)
    │   ├── PageBuilder.tsx  TopBar, DeviceToggle, DraftProtection, PendingChangesBadge
    │   ├── Canvas/          BlockRenderer, BlockWrapper, BlockFloatingToolbar, EmptySlot
    │   ├── LeftSidebar/     AddBlockPanel, BlockList
    │   ├── RightSidebar/    Content / Style / Advanced tabs
    │   │   └── controls/    Color, ColorScheme, Typography, Padding, Border, Shadow,
    │   │                    Gradient, CornerRadius, Alignment, Visibility, Image, …
    │   ├── forms/           SchemaForm + adapters + custom field renderers
    │   ├── store.ts         Zustand store for in-progress edits
    │   └── types.ts
    ├── landing-builder/     Per-product landing block editor (legacy v1)
    ├── landing-templates/   LandingTemplate management UI
    ├── themes/              Theme list + tokens form (most pickers superseded by customizer)
    ├── pages/               Static page CRUD + builder shell
    ├── menus/               Menu tree editor + link picker
    ├── policies/            Policy list + Tiptap editor
    ├── categorias/          CategoryBuilderShell (CategoryBlocks editor)
    ├── products/            Save-as-template / apply-template / template selector
    ├── complaints/          Form-field builder
    └── (misc)               BulkEdit, ImageUpload, role/user managers, …
```

### Theme & Page-Builder System (Plans 1–16)

The "themes" feature is the bulk of recent work. It implements a Shopify-style content authoring stack:

| Concept | Model(s) | Notes |
|---|---|---|
| Theme | `Theme` | Singleton-active. Owns `tokens`, `colorSchemes`, `homePageId`, `cartPageId`, `defaultProductLandingTemplateId`, `sectionCatalog`. |
| Design tokens | `Theme.tokens` (Json) | Colors / fonts / scale / radii. Materialized into a scoped stylesheet served at `/api/themes/tokens.css` (cached via [lib/themes/get-themes-hash.ts](lib/themes/get-themes-hash.ts)). |
| Color schemes | `Theme.colorSchemes` (Json array) | Plan 13.1 — multiple named palettes (`{id, name, colors}`); blocks pick one via `content.style.colorSchemeId`. Empty array → fallback to `tokens.colors` via [lib/themes/color-schemes.ts](lib/themes/color-schemes.ts). Storefront emits `data-color-scheme` on each block wrapper; CSS rules rebind `--theme-*` custom properties via attribute selectors. |
| Theme sections | `ThemeSection` + `ThemeSectionBlock` | Plan 16 — Shopify Online Store 2.0–style header / footer. Each theme has an ordered list of typed sections per group (HEADER / FOOTER) with optional sub-blocks (e.g. `LINK_COLUMN` inside `FOOTER_COLUMNS`, `MEGA_MENU_PANEL` inside `MEGA_MENU`). Storefront `Header.tsx` / `Footer.tsx` are thin shells that map sections to renderers in [components/shop/theme-sections/](components/shop/theme-sections/). 10 section types in [lib/theme-sections/registry.ts](lib/theme-sections/registry.ts). Per-theme catalog (`Theme.sectionCatalog` Json) curates which types each theme exposes. |
| Static pages | `Page` + `PageBlock` | User-editable pages (Nosotros, FAQ, …) at `/<slug>`. SEO metadata (title/description/og-image/noindex). |
| Cart blocks | `Page` referenced by `Theme.cartPageId` | Blocks rendered above the cart UI. |
| Home blocks | `Page` referenced by `Theme.homePageId` | Themed home; falls back to legacy hardcoded layout when null. |
| Menus | `Menu` + `MenuItem` (self-nesting) | Used inside theme sections (e.g. `HEADER_MAIN.menuId`, `HEADER_NAV.menuId`). Slug-based fallback (`main` / `footer`) only triggers in `LegacyHeader/Footer` when a theme has zero sections in a group. |
| Policies | `Policy` | Long-form Tiptap rich text at `/politicas/<slug>` (separate from page builder). |
| Product landings | `LandingTemplate` + `TemplateBlock` → `Product.landingTemplateId` → `LandingBlock` (with `sourceTemplateBlockId` + `detached` flag) | Templates with sync; per-product overrides become "detached". |
| Category landings | `CategoryBlock` + `Category.hideProductGrid` | Custom blocks above (or replacing) the auto-generated grid. `PRODUCT_GRID` block type allows reordering grid placement. |
| Block types | enum `LandingBlockType` | HERO, BENEFITS, GALLERY, TESTIMONIALS, VIDEO, COLORS, TICKER, RICH_TEXT, FAQ, IMAGE_TEXT, RELATED_PRODUCTS, TRUST_BADGES, PRODUCT_GRID. |
| Block schemas | [lib/blocks/schema/](lib/blocks/) + [lib/blocks/registry.ts](lib/blocks/registry.ts) | Schema-driven forms (`FormField` types: text, image, color, product picker, custom). |
| Style application | [lib/blocks/apply-style.ts](lib/blocks/apply-style.ts) | Maps `BlockStyle` JSON → Tailwind classes + inline CSS. Includes responsive device overrides via [lib/blocks/resolve.ts](lib/blocks/resolve.ts). |

The Theme Customizer (`/admin/personalizar/temas/[themeId]/customize`) is a split-screen Shopify-style editor with **auto-save** (no manual save button — `SaveStatusIndicator` shows status) and zone-based navigation (`ZoneList`). It embeds the page-builder canvas + tabs, and includes a tokens/color-schemes panel that swaps the right sidebar.

### Key Lib Utilities

| File | Purpose |
|---|---|
| [lib/db.ts](lib/db.ts) | Singleton Prisma client |
| [lib/auth.ts](lib/auth.ts) | Admin sessions + `requirePermission()` / `requireAuth()` |
| [lib/protect-route.ts](lib/protect-route.ts) | Server-Component permission guards |
| [lib/permissions.ts](lib/permissions.ts) | RBAC checks (colon format) |
| [lib/themes/](lib/themes/) | `tokens.ts`, `color-schemes.ts`, `resolve-active-theme.ts`, `get-active-theme-home.ts`, `get-active-theme-cart.ts`, `get-themes-css.ts`, `get-themes-hash.ts` |
| [lib/blocks/](lib/blocks/) | `registry.ts`, `apply-style.ts`, `resolve.ts`, `resolve-product-blocks.ts`, `template-diff.ts`, `extract-preview-image.ts`, `defaults.ts`, `sanitize-rich-text.ts`, `feature-flag.ts`, `schema/` |
| [lib/pages/](lib/pages/) | `fetch-page-with-blocks.ts`, `reserved-slugs.ts` |
| [lib/menus/](lib/menus/) | `resolve-menu.ts`, `get-menu-by-slug.ts`, `get-themed-menu.ts`, `resolve-link.ts` |
| [lib/culqi.ts](lib/culqi.ts) | Culqi card payments |
| [lib/sunat-*.ts](lib/) | NubeFact electronic-invoice integration (`sunat.ts`, `sunat-nubefact.ts`, `sunat-crypto.ts`, `sunat-igv.ts`, `sunat-types.ts`) |
| [lib/email.ts](lib/email.ts) + [lib/resend.ts](lib/resend.ts) | Transactional email |
| [lib/site-settings.ts](lib/site-settings.ts) | DB-backed site config (`Setting` key/value JSON) |
| [lib/smart-collections.ts](lib/smart-collections.ts) | Auto-filter collections (`CategoryCondition`) |
| [lib/rate-limit.ts](lib/rate-limit.ts) | Upstash Redis rate limiting |
| [lib/order-status-logic.ts](lib/order-status-logic.ts) | Status transitions |
| [lib/csv-shopify.ts](lib/csv-shopify.ts) + [lib/csv-generic.ts](lib/csv-generic.ts) | Product import/export |
| [lib/conversion-api.ts](lib/conversion-api.ts) | Meta Conversions API |
| [lib/csp.ts](lib/csp.ts) + [lib/sanitize.ts](lib/sanitize.ts) | Security helpers |
| [lib/districts-peru.ts](lib/districts-peru.ts) | PE address hierarchy |
| [lib/validations.ts](lib/validations.ts) + [lib/validations/checkout.ts](lib/validations/checkout.ts) | Zod schemas |

### Database Schema (≈40 models)

Highlights from [prisma/schema.prisma](prisma/schema.prisma):

- **Catalog**: `Product` ↔ `ProductCategory` ↔ `Category` (smart/manual collections, hierarchical, `hideProductGrid`); `Product` → `ProductVariant` (SKU/stock per variant) → `ProductOption` / `ProductOptionValue` (with `swatchType`).
- **Orders / payments**: `Order` → `OrderItem` (with snapshot) → `PendingPayment` (manual flow); `Order` → `ElectronicDocument` (SUNAT). Enums: `OrderStatus`, `PaymentStatus`, `FulfillmentStatus`, `PaymentMethod`, `CheckoutMode`, `IgvType`, `DocumentType`.
- **Loyalty**: `Customer` (referrals, tier, points) → `PointTransaction` / `RewardRedemption` ← `Reward`; `LoyaltyProgramSettings` singleton. Tiers: BRONZE → SILVER → GOLD → PLATINUM.
- **RBAC**: `User` → `Role` (`level` Int) → `RolePermission` → `Permission`; `UserPermission` (type GRANT/DENY) for per-user overrides.
- **Content**: `Theme`, `Page`, `PageBlock`, `Menu`, `MenuItem`, `Policy`, `LandingTemplate`, `TemplateBlock`, `LandingBlock`, `CategoryBlock`.
- **Shipping**: `ShippingZone` → `ShippingZoneDistrict` (PE district codes), `ShippingZone` → `ShippingRateGroup` → `ShippingRate`.
- **Geo**: `Department` → `Province` → `District`.
- **Misc**: `Coupon`, `Cart` / `CartItem`, `ProductReview`, `Setting`, `NewsletterSubscriber`, `TrackingPixel`, `Complaint`, `ComplaintFormField`, `InventoryMovement`.

### Checkout Flow

1. Cart at `/carrito` (Zustand store).
2. Address + shipping → creates `Order`.
3. Payment selection: Culqi (card), Yape, Plin, PayPal, COD.
4. Card → `/orden/[orderId]/pago-tarjeta` (Culqi iframe).
5. Bank transfer → `/orden/[orderId]/pago-pendiente` (proof upload → `PendingPayment`).
6. Admin verifies via `/admin/pagos-pendientes`.
7. Confirmation at `/orden/[orderId]/confirmacion`.

If COD is enabled at the product level (`Product.checkoutMode` = `COD_ONLY` / `COD_AND_CART` with `codFormSettings` JSON), a streamlined flow is available via `actions/cod-orders.ts`.

### Peru-Specific

- `Department` / `Province` / `District` models + [lib/districts-peru.ts](lib/districts-peru.ts).
- Payment methods: Culqi (card), Yape, Plin, PayPal, COD.
- Loyalty tiers BRONZE → PLATINUM with discount % per tier and free shipping for PLATINUM.
- Libro de Reclamaciones (`/libro-reclamaciones`) with admin-configurable form fields.
- IGV handling per product (`IgvType` GRAVADO / EXONERADO / INAFECTO).
- Electronic invoicing (Boleta / Factura) via NubeFact.

### Image & File Storage

Uploads → Vercel Blob via `/api/upload`. [next.config.ts](next.config.ts) whitelists allowed remote image hosts. Sharp handles server-side processing.

### Conventions

- **Language**: Spanish for routes, UI strings, and most code comments. Identifiers, commit messages, and this file are in English.
- **Mutations**: Server Actions for admin/internal; API Routes for public/external + webhooks.
- **JSON columns**: `Theme.tokens` / `Theme.colorSchemes`, `*.content` (block content), `Order.billingAddress` / `shippingAddress` / `paymentDetails`, `Setting.value`, `ComplaintFormField.options`, etc. Cast through typed helpers (e.g. `BlockContentV2`) rather than passing raw `Json`.
- **Permissions**: dot format on the wire (`products.create`), colon format internally (`products:create`).
- **Auto-save**: customizer + page-builder write through Server Actions on each change; UI shows save status, never a manual Save button.
- **Validation**: Zod at every system boundary (server actions, API routes). Prefer `unknown` + narrow over `any`.
- **Immutability**: spread for object updates; never mutate Prisma rows in place.
- **Styling**: Tailwind classes; per-block style overrides flow through `apply-style.ts` (which emits both classes and inline CSS).
- **Files**: many small files, organized by feature/domain (`lib/themes/`, `lib/blocks/`, etc.) rather than by type.
- **Secrets**: env vars only — never hardcode (Culqi keys, NubeFact tokens, Resend, Clerk, Upstash, Vercel Blob).

### Utility Scripts

`/scripts/` (run with `npx tsx scripts/<name>.ts`):

- **RBAC setup**: `setup-permissions.ts`, `setup-themes-permissions.ts`, `setup-pages-permissions.ts`, `setup-menus-permissions.ts`, `setup-landing-templates-permissions.ts`, `setup-policies-permissions.ts`.
- **Seeders**: `seed-themes.ts`, `seed-menus.ts`, `seed-home-page.ts`, `seed-cart-page.ts`, `seed-policies.ts`, `seed-static-pages.ts`, `seed-landing-templates.ts`.
- **Migrations**: `migrate-landing-blocks-to-v2.ts`, `migrate-gallery-shape.ts`, `toggle-page-builder-v2.ts`.
- **Diagnostics**: `diagnose-permission-issue.ts`, `diagnose-super-admin-issue.ts`, `diagnostico-ordenes.ts`, `check-images.ts`, `verify-apply-style.ts`, `verify-resolve-for-device.ts`, `sync-inventory-movements.ts`.
- **Init**: `init-culqi-config.ts`, `init-complaints-config.ts`, `make-admin-editable.ts`, `test-tracking.ts`.

### Plans / Specs

Implementation plans live in [docs/superpowers/plans/](docs/superpowers/plans/). Plans 1–16 are complete on `master`:

- Plans 1–3 — Page-builder foundation, styling, schema-driven forms, advanced controls, templates with sync.
- Plan 4 — Theme skeleton (`Theme` model + `defaultProductLandingTemplateId`).
- Plan 5 / 5.5 — Static pages + menu builder.
- Plan 7 — Category blocks + `hideProductGrid` + `PRODUCT_GRID` block type.
- Plan 8 — Storefront-themed header / footer.
- Plan 10 — Cart-page blocks.
- Plan 11 — Theme tokens + dynamic CSS.
- Plan 13 — Shopify-style customizer (split-screen, zone-based, auto-save).
- Plan 13.1 — Color schemes (named palettes; per-block selection; CSS attribute-selector rebinding).
- Plan 14 — Neon warm-up cron via Vercel.
- Plan 15 — Categories editable from the customizer (extends `EditableSurface` to `page | category`).
- Plan 16 — Theme sections (Shopify Online Store 2.0–style header/footer): new `ThemeSection` + `ThemeSectionBlock` models, 10-type registry, sortable customizer editors, per-theme `sectionCatalog` UI, expand-contract migration that drops legacy `Theme.headerMenuId`/`footerMenuId`.

## Pending / Open Items

1. **E2E with Playwright** — set up before any real traffic. No automated tests exist today; verification is manual + `npm run build`.
2. **Plan 10.1** — blocks rendered *below* the cart UI (Plan 10 already covers blocks above).
3. **`CONTACT_FORM` block** — last hardcoded route; turning it into a landing block would let `/contacto` be page-builder driven.
4. **Live preview UX (Plan 17 candidate)** — current customizer iframe updates after the autosave round-trip (~300-500ms warm Neon). For true Shopify-style instant preview, the iframe needs a client-side renderer that reads from Zustand and overlays the server-rendered content. Substantial refactor (~4-6 hours).

Other long-running items:

- **Theme preview/exit-preview** exists (`/api/admin/themes/[id]/preview`, `/exit-preview`) but has no scheduling or A/B-test surface.
- **Page-builder v1 vs v2** — `landing-builder/` (per-product v1) still coexists with the schema-driven `page-builder/` (v2). `toggle-page-builder-v2.ts` flips the flag; full removal of v1 is pending.
- **Multi-tenant** — long-term direction is to turn ShopGood into a multi-store SaaS; current code is single-tenant.
