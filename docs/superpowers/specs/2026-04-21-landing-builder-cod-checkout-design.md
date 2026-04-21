# Design Spec: Landing Page Builder + COD Quick Order
**Date:** 2026-04-21
**Status:** Approved
**Scope:** Two features for the shopgood-pe e-commerce platform

---

## Overview

Two independent but related features:

1. **Landing Page Builder** — per-product page builder that lets admins compose custom landing pages using reorderable content blocks (hero, benefits, gallery, testimonials, video, ticker/countdown, colors).
2. **COD Quick Order Form** — a floating order form on the product page and cart page that lets customers place cash-on-delivery orders without going through the standard checkout. Configurable per product.

---

## Feature 1: Landing Page Builder

### Data Model

**New Prisma enum and relation on `Product`:**

```prisma
enum LandingBlockType {
  HERO
  BENEFITS
  GALLERY
  TESTIMONIALS
  VIDEO
  COLORS
  TICKER
}

model Product {
  // ... existing fields ...
  landingBlocks  LandingBlock[]
}

model LandingBlock {
  id        String           @id @default(cuid())
  productId String
  product   Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  type      LandingBlockType
  position  Int
  content   Json
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@index([productId, position])
}
```

**`content` JSON structure per block type:**

| Type | Content shape |
|------|--------------|
| `HERO` | `{ title, subtitle, bgImage, overlayColor, ctaText }` |
| `BENEFITS` | `{ cards: [{ icon, title, description }] }` |
| `GALLERY` | `{ displayType: "slider"\|"stacked", images: [url], showBuyButton: boolean }` |
| `TESTIMONIALS` | `{ items: [{ name, photo, text, rating }] }` |
| `VIDEO` | `{ displayType: "slider"\|"stacked", videos: [{ url, title, provider: "youtube"\|"vimeo"\|"upload" }], showBuyButton: boolean }` |
| `COLORS` | `{ primary, background, cta, text }` |
| `TICKER` | `{ mode: "scrolling"\|"countdown"\|"both", sticky: boolean, scrollingText: string, speed: number, endsAt: string (ISO), countdownLabel: string, bgColor, textColor }` |

### Admin UI

Located inside the existing product edit/create forms, in the "Presentación" card — visible only when `template === "LANDING"`.

**Block list panel:**
- Each block shown as a row with: drag handle (⠿), color-coded type icon, type name, content summary, edit (✏️), delete (🗑)
- Drag & drop reordering updates `position` field
- Up/down arrow fallback for mobile
- "+ Agregar sección" button opens a dropdown to pick block type
- No limit on number of blocks; multiple instances of the same type allowed

**Block edit panel** (inline expand or slide-over):
- Each block type has its own form fields matching its `content` schema
- BENEFITS and TESTIMONIALS: add/remove/reorder sub-items inline
- GALLERY: upload images to Vercel Blob, toggle `displayType` (slider/stacked), toggle `showBuyButton`
- TICKER: toggle `sticky`, select `mode`, datetime picker for `endsAt`
- COLORS: color pickers for each field

**Responsive:** Admin panel must work on mobile — blocks stack vertically, drag handle replaced with up/down arrows on small screens.

### Frontend Rendering

**File:** `app/(shop)/productos/[slug]/page.tsx`

When `product.template === "LANDING"`, fetch `landingBlocks` ordered by `position` and render each block using a `<LandingBlockRenderer>` component that switches on `type`.

**TICKER with `sticky: true`:** Rendered outside the normal block flow, fixed to top of viewport (below the site nav). Multiple sticky tickers stack vertically.

**GALLERY — Slider type:**
- Main image with left/right arrows and swipe support on mobile
- Thumbnails centered below the main image, active thumbnail highlighted
- Click on main image opens a **lightbox**: fullscreen dark overlay, zoom in/out (scroll on desktop, pinch on mobile), navigate between images, close button

**GALLERY — Stacked type:**
- Images stacked vertically
- Each image has a "Comprar ahora" button below it that opens the COD form (if product has COD enabled) or adds to cart (if STANDARD)

**VIDEO — Slider type:**
- Shows 3 videos per slide with left/right arrow navigation only (no dot indicators)
- Each video rendered as a custom player: no native controls, click anywhere on the video to play/pause
- Sound icon overlay (top-right corner of each video) — muted by default, click to toggle audio
- Autoplay is off; videos only play on click
- "Comprar ahora" button below the entire slider section (one button for the block, not per video)

**VIDEO — Stacked type:**
- Videos stacked vertically, same custom player behavior (click to play, sound icon overlay)
- "Comprar ahora" button below each video (if `showBuyButton: true`)

**GALLERY — Slider type:**
- Main image with left/right arrows and swipe support on mobile
- Thumbnails centered below the main image, active thumbnail highlighted
- Click on main image opens a **lightbox**: fullscreen dark overlay, zoom in/out (scroll on desktop, pinch on mobile), navigate between images, close button

**GALLERY — Stacked type:**
- Images stacked vertically
- Each image has a "Comprar ahora" button below it that opens the COD form (if product has COD enabled) or adds to cart (if STANDARD)

**COLORS block:** When present, its values are injected as CSS custom properties scoped to that product's landing page, overriding the global theme.

---

## Feature 2: COD Quick Order Form

### Data Model

**New enum and fields on `Product`:**

```prisma
enum CheckoutMode {
  STANDARD      // normal checkout flow
  COD_ONLY      // only COD form, no cart
  COD_AND_CART  // COD form (primary) + cart (secondary)
}

model Product {
  // ... existing fields ...
  checkoutMode    CheckoutMode  @default(STANDARD)
  codFormSettings Json?         // null when checkoutMode = STANDARD
}
```

**`codFormSettings` JSON structure:**

```json
{
  "formTitle": "🛒 Completa tu pedido",
  "formSubtitle": "Envío a todo el Perú",
  "buttonText": "Confirmar pedido →",
  "paymentBadge": "✅ Pagas cuando recibes el producto",
  "thankYouTitle": "¡Gracias por tu pedido! 🎉",
  "thankYouMessage": "Nos comunicaremos contigo en breve para coordinar la entrega.",
  "whatsappEnabled": true,
  "whatsappNumber": "+51999999999",
  "whatsappMessage": "Hola, hice un pedido:\nNombre: {nombre}\nTel: {telefono}\nDirección: {direccion}\nTotal: S/ {total}",
  "fields": [
    { "id": "name",     "label": "Nombre completo",            "required": true,  "visible": true },
    { "id": "phone",    "label": "Teléfono / WhatsApp",        "required": true,  "visible": true },
    { "id": "email",    "label": "Correo electrónico",         "required": false, "visible": true },
    { "id": "dni",      "label": "DNI",                        "required": false, "visible": false },
    { "id": "location", "label": "Departamento/Provincia/Distrito", "required": true, "visible": true },
    { "id": "address",  "label": "Dirección",                  "required": true,  "visible": true },
    { "id": "notes",    "label": "Notas adicionales",          "required": false, "visible": false }
  ]
}
```

WhatsApp message variables: `{nombre}`, `{telefono}`, `{email}`, `{direccion}`, `{distrito}`, `{total}`, `{producto}`, `{cantidad}`.

### Admin UI

A new "Modo de Compra" card in the product edit/create form (below "Presentación"):

- Three radio options: STANDARD / COD_AND_CART / COD_ONLY
- When COD_AND_CART or COD_ONLY is selected, a configuration panel expands with:
  - **Textos:** formTitle, formSubtitle, buttonText, paymentBadge, thankYouTitle, thankYouMessage
  - **Campos:** draggable field list — each row shows field name, required toggle, visible toggle
  - **WhatsApp:** toggle on/off, phone number input, message template textarea with variable hints

### Frontend — Product Page

**`components/shop/AddToCartButton.tsx`** becomes `components/shop/ProductActions.tsx` (or extended):

| `checkoutMode` | Rendered buttons |
|----------------|-----------------|
| `STANDARD` | "Agregar al carrito" (existing behavior) |
| `COD_AND_CART` | Primary: "Comprar ahora" (opens COD modal) + Secondary: "Agregar al carrito" (smaller, outlined) |
| `COD_ONLY` | Only "Comprar ahora" (opens COD modal). Cart button hidden. |

**COD Modal (`components/shop/CodOrderModal.tsx`):**
- Floating modal (centered overlay) with backdrop blur
- Shows product image, name, quantity selector, price
- Renders only the visible fields from `codFormSettings.fields` in their configured order
- Uses existing `lib/districts-peru.ts` for location selector
- On submit: calls a new server action `createCodOrder()` that creates an `Order` with `paymentMethod: "COD"` and `status: "PENDING"`
- After success: shows thank you screen (title + message from config)
- If `whatsappEnabled`: opens `https://wa.me/{number}?text={encoded_message}` in new tab

### Frontend — Cart Page

When the cart contains at least one item whose product has `checkoutMode !== STANDARD`:

- Standard "Ir al checkout →" button remains
- Additional "Pedir con pago contra entrega" button (outlined red) appears below
- This button opens the COD modal pre-filled with all cart items (not just one product)
- The COD order from cart captures all items as a single `Order`

### Order Creation — `createCodOrder()` server action

```
1. Validate input with Zod (fields matching codFormSettings.fields)
2. Fetch authoritative prices from DB (same as existing createOrder)
3. Verify stock for all items
4. Create Order record:
   - paymentMethod: "COD"
   - status: "PENDING"
   - customerName, customerPhone, address, districtCode from form
5. Create OrderItems
6. Return { orderId, success: true }
```

No payment gateway involved. Admin manages COD orders from the existing orders panel.

---

## Architecture Summary

```
Prisma Schema
├── Product           +checkoutMode +codFormSettings +landingBlocks[]
└── LandingBlock      type, position, content(JSON)

Admin UI (product form)
├── "Presentación" card    → page builder (visible when template=LANDING)
└── "Modo de Compra" card  → checkout mode + COD form config

Frontend
├── app/(shop)/productos/[slug]/page.tsx
│   ├── LandingBlockRenderer   (iterates landingBlocks by position)
│   ├── ProductActions         (replaces AddToCartButton, checkout-mode-aware)
│   └── CodOrderModal          (floating form, field-configurable)
├── components/shop/templates/
│   ├── blocks/HeroBlock.tsx
│   ├── blocks/BenefitsBlock.tsx
│   ├── blocks/GalleryBlock.tsx       (slider+lightbox | stacked+buy)
│   ├── blocks/TestimonialsBlock.tsx
│   ├── blocks/VideoBlock.tsx
│   ├── blocks/ColorsBlock.tsx
│   └── blocks/TickerBlock.tsx        (scrolling | countdown | both | sticky)
└── app/(checkout)/carrito/page.tsx   +COD button when applicable

API / Server Actions
├── actions/landing-blocks.ts         CRUD for LandingBlock
└── actions/cod-orders.ts             createCodOrder()
```

---

## Constraints & Notes

- `COD_ONLY` products cannot be added to the cart — `addItem()` in `store/cart.ts` must guard against this.
- Multiple sticky TICKERs stack top-to-bottom; the site nav adjusts its top offset accordingly.
- The lightbox uses a portal (`createPortal`) to render outside the product page DOM.
- WhatsApp redirect opens in a new tab to avoid losing the thank-you screen.
- `codFormSettings` is validated with Zod on save in the admin form before persisting.
- All new admin mutations go through Server Actions (consistent with existing pattern).
- New API routes are not needed — landing block CRUD and COD order creation are server actions.
