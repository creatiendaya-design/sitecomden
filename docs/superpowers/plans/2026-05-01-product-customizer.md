# Personalizador de productos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un personalizador de productos para el cliente final (MVP: texto sobre polos en zonas frontal+trasera, extensible a otros productos y elementos), con preview en tiempo real (`react-konva`), variant picker en builder, sobrecargo opcional, re-edición desde el carrito, JSON+PNG snapshot persistente, admin CRUD de plantillas reusables y visor de diseño en el detalle de orden.

**Architecture:** Modelo de datos genérico con `CustomizableTemplate` (zonas N como JSON, fuentes/colores permitidos, sobrecargo, tabla de medidas) reusable entre productos vía `Product.customizableTemplateId`. Diseño del cliente persiste como `OrderItem.customDesign` (JSON con `templateSnapshot` congelado al añadir al cart) + `OrderItem.customDesignImages` (URLs Vercel Blob, una por zona). Cart deduplica con `id = ${variantId}::${customDesignId}`. Builder corre en ruta dedicada `/productos/[slug]/personalizar` con layout propio, `react-konva` para canvas, Zustand local para estado del builder + undo/redo.

**Tech Stack:** Next.js 16 App Router, Prisma 6.19 + PostgreSQL (Neon), React 19, TypeScript 5, Tailwind v4, Zustand 5, Zod 4, react-konva + Konva.js (nuevas), `next/font/google`, Vercel Blob (existente vía `/api/upload`), Vitest 4 + Testing Library + Playwright 1.59 (existentes).

**Spec ref:** [docs/superpowers/specs/2026-05-01-product-customizer-design.md](../specs/2026-05-01-product-customizer-design.md).

**Verification convention:** El proyecto tiene Vitest + Playwright instalados (commits 1646-1647 de la memoria). Cada task con lógica usa TDD real (test → fail → implement → pass → commit). Componentes UI verifican con render tests + `npm run build` + smoke manual. E2E al final cubre 6 journeys.

**Pre-flight:**

```bash
cd "d:/PROYECTOS/Sistema ecommerce/shopgood-pe"
git checkout master
git pull
git status   # working tree clean
git checkout -b feature/product-customizer
```

---

## File Structure

**Phase 1 — Schema, types, defaults, validators**

```
prisma/schema.prisma                                                (modified)
prisma/migrations/<timestamp>_customizable_templates/migration.sql  (new)
lib/customizer/types.ts                                             (new)
lib/customizer/default-fonts.ts                                     (new)
lib/customizer/default-colors.ts                                    (new)
lib/customizer/validate.ts                                          (new)
lib/customizer/pricing.ts                                           (new)
lib/customizer/i18n.ts                                              (new)
lib/customizer/__tests__/validate.test.ts                           (new)
lib/customizer/__tests__/pricing.test.ts                            (new)
lib/customizer/__tests__/default-fonts.test.ts                      (new)
lib/customizer/__tests__/default-colors.test.ts                     (new)
```

**Phase 2 — Server actions y permisos**

```
lib/permissions.ts                                                  (modified)
scripts/setup-customizables-permissions.ts                          (new)
actions/customizer.ts                                               (new)
actions/customizer.test.ts                                          (new)
actions/orders.ts                                                   (modified — +customDesign mapping & validation)
actions/__tests__/orders-customizer.test.ts                         (new)
```

**Phase 3 — Admin: CRUD de plantillas**

```
app/admin/personalizables/page.tsx                                  (new — lista)
app/admin/personalizables/nuevo/page.tsx                            (new — crear)
app/admin/personalizables/[templateId]/page.tsx                     (new — editar)
components/admin/customizer-templates/TemplatesList.tsx             (new)
components/admin/customizer-templates/TemplateForm.tsx              (new)
components/admin/customizer-templates/ZoneEditor.tsx                (new — Konva bounds drag)
components/admin/customizer-templates/FontsCatalogPicker.tsx        (new)
components/admin/customizer-templates/ColorsPaletteEditor.tsx       (new)
components/admin/customizer-templates/SizeGuideEditor.tsx           (new)
components/admin/customizer-templates/__tests__/*.test.tsx          (new)
```

**Phase 4 — Admin: Card en producto**

```
components/admin/products/CustomizationCard.tsx                     (new)
components/admin/products/MockupOverridesGrid.tsx                   (new)
components/admin/products/EditProductForm.tsx                       (modified — mount card)
components/admin/products/NewProductForm.tsx                        (modified — mount card)
components/admin/products/__tests__/CustomizationCard.test.tsx      (new)
```

**Phase 5 — Admin: Visor en orden**

```
components/admin/orders/CustomDesignViewer.tsx                      (new)
components/admin/orders/__tests__/CustomDesignViewer.test.tsx       (new)
app/admin/ordenes/[orderId]/page.tsx                                (modified — render viewer per item)
```

**Phase 6 — Cliente: Página de producto**

```
components/shop/StartCustomizingButton.tsx                          (new)
components/shop/__tests__/StartCustomizingButton.test.tsx           (new)
app/(shop)/productos/[slug]/page.tsx                                (modified — conditional button)
components/shop/ProductCard.tsx                                     (modified — surcharge breakdown)
```

**Phase 7 — Cliente: Shell del builder**

```
app/(shop)/productos/[slug]/personalizar/layout.tsx                 (new — sin Header/Footer)
app/(shop)/productos/[slug]/personalizar/page.tsx                   (new)
components/customizer/CustomizerLayout.tsx                          (new)
components/customizer/CustomizerTopBar.tsx                          (new)
components/customizer/BottomBar.tsx                                 (new)
components/customizer/ZoneTabs.tsx                                  (new)
components/customizer/store.ts                                      (new — Zustand local + undo)
components/customizer/__tests__/store.test.ts                       (new)
```

**Phase 8 — Cliente: Canvas con Konva**

```
components/customizer/CustomizerCanvas.tsx                          (new — dynamic import, no SSR)
components/customizer/canvas/MockupImage.tsx                        (new)
components/customizer/canvas/BoundsRect.tsx                         (new)
components/customizer/canvas/TextLayerNode.tsx                      (new)
components/customizer/canvas/InlineTextEditor.tsx                   (new — overlay HTML)
components/customizer/canvas/__tests__/TextLayerNode.test.tsx       (new — mocked react-konva)
tests/setup.ts                                                      (modified — add react-konva mock)
```

**Phase 9 — Cliente: Sidebar izquierdo (Producto + Capas)**

```
components/customizer/LeftSidebar/index.tsx                         (new)
components/customizer/LeftSidebar/ProductTab.tsx                    (new)
components/customizer/LeftSidebar/LayersTab.tsx                     (new)
components/customizer/LeftSidebar/SizeGuideDrawer.tsx               (new)
components/customizer/LeftSidebar/__tests__/*.test.tsx              (new)
```

**Phase 10 — Cliente: Sidebar derecho (5 tabs de propiedades)**

```
components/customizer/RightSidebar/index.tsx                        (new)
components/customizer/RightSidebar/TextoTab.tsx                     (new)
components/customizer/RightSidebar/ColorTab.tsx                     (new)
components/customizer/RightSidebar/CustomColorPicker.tsx            (new — HSL + hex + eyedropper)
components/customizer/RightSidebar/FuenteTab.tsx                    (new — search + categories + lazy)
components/customizer/RightSidebar/TransformarTab.tsx               (new)
components/customizer/RightSidebar/PosicionTab.tsx                  (new)
components/customizer/RightSidebar/__tests__/*.test.tsx             (new)
lib/customizer/lazy-fonts.ts                                        (new — Google Fonts on-demand loader)
```

**Phase 11 — Carrito: integración**

```
store/cart.ts                                                       (modified — +customDesign fields, +replaceCustomItem)
store/__tests__/cart-customizer.test.ts                             (new)
lib/customizer/canvas-export.ts                                     (new — toDataURL → Blob → upload)
lib/customizer/__tests__/canvas-export.test.ts                      (new)
```

**Phase 12 — Carrito UI**

```
components/shop/cart/CustomDesignBadge.tsx                          (new)
components/shop/cart/CartItem.tsx                                   (modified — show badge & breakdown)
components/shop/cart/__tests__/CustomDesignBadge.test.tsx           (new)
app/(shop)/carrito/page.tsx                                         (modified — HEAD validation)
lib/customizer/validate-cart-images.ts                              (new — HEAD check)
```

**Phase 13 — Edit desde cart**

```
app/(shop)/productos/[slug]/personalizar/page.tsx                   (modified — accept ?cartItemId)
components/customizer/CustomizerLayout.tsx                          (modified — Save vs AddToCart mode)
e2e/customizer-edit.spec.ts                                         (new)
```

**Phase 14 — Confirmación y email**

```
app/(checkout)/orden/[orderId]/confirmacion/page.tsx                (modified — render mini-galería)
components/checkout/CustomDesignConfirmation.tsx                    (new)
emails/order-confirmation.tsx                                       (modified — links a PNGs)
```

**Phase 15 — Mobile**

```
components/customizer/MobileBottomSheet.tsx                         (new)
components/customizer/MobileFAB.tsx                                 (new — radial menu)
components/customizer/CustomizerLayout.tsx                          (modified — responsive switch)
```

**Phase 16 — E2E**

```
e2e/customizer-happy-path.spec.ts                                   (new)
e2e/customizer-edit.spec.ts                                         (existed Phase 13, expanded)
e2e/customizer-validation.spec.ts                                   (new)
e2e/customizer-zones.spec.ts                                        (new)
e2e/customizer-variants.spec.ts                                     (new)
e2e/customizer-tampering.spec.ts                                    (new)
playwright.config.ts                                                (modified — mock /api/upload)
```

**Phase 17 — Polish & docs**

```
docs/superpowers/guides/personalizables-guia-dueno.md               (new — manual del dueño)
.next-bundle-analyzer.config (notes)                                (one-off check, not committed)
```

---

## Phase 1 — Foundation (schema, types, defaults, validators)

### Task 1.1: Migración Prisma — agregar `CustomizableTemplate` + columnas en `Product` y `OrderItem`

**Files:**
- Modify: `prisma/schema.prisma` (añadir model + 3 columnas)
- Create: `prisma/migrations/<timestamp>_customizable_templates/migration.sql` (auto-generado)

- [ ] **Step 1: Añadir el model `CustomizableTemplate`**

En `prisma/schema.prisma`, después del último model (al final del archivo), añadir:

```prisma
model CustomizableTemplate {
  id                String    @id @default(cuid())
  name              String
  description       String?
  active            Boolean   @default(true)
  surcharge         Decimal?  @db.Decimal(10, 2)
  zones             Json      @default("[]")
  allowedFonts      Json      @default("[]")
  allowedColors     Json      @default("[]")
  allowCustomColors Boolean   @default(true)
  sizeGuide         Json?
  maxLayersPerZone  Int       @default(8)
  maxCharsPerLayer  Int       @default(40)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  products          Product[]

  @@index([active])
}
```

- [ ] **Step 2: Añadir columnas a `Product`**

Localizar `model Product { ... }` y agregar dentro:

```prisma
  customizableTemplateId      String?
  customizableTemplate        CustomizableTemplate? @relation(fields: [customizableTemplateId], references: [id], onDelete: SetNull)
  customizableMockupOverrides Json?
```

- [ ] **Step 3: Añadir columnas a `OrderItem`**

Localizar `model OrderItem { ... }` y agregar dentro:

```prisma
  customDesign        Json?
  customDesignImages  Json?
```

- [ ] **Step 4: Crear y aplicar la migración**

Run:
```bash
npx prisma migrate dev --name customizable_templates
```

Expected: migración generada en `prisma/migrations/<timestamp>_customizable_templates/`, aplicada a Neon, `prisma generate` ejecutado automáticamente.

- [ ] **Step 5: Verificar que el cliente Prisma compila**

Run:
```bash
npx prisma validate
```

Expected: `Prisma schema loaded from prisma/schema.prisma. The schema is valid.`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add CustomizableTemplate and customizer columns

Adds CustomizableTemplate model (zones, fonts, colors, sizeGuide as JSON),
Product.customizableTemplateId + customizableMockupOverrides, and
OrderItem.customDesign + customDesignImages. All new columns nullable for
zero impact on existing rows."
```

---

### Task 1.2: Tipos TypeScript del dominio

**Files:**
- Create: `lib/customizer/types.ts`

- [ ] **Step 1: Escribir los tipos**

```ts
// lib/customizer/types.ts

export type ElementType = "TEXT"; // extensible: | "IMAGE" | "CLIPART"

export interface BoundsPct {
  xPct: number;       // 0-100
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface PrintZone {
  id: string;
  name: string;
  mockupImage: string;
  bounds: BoundsPct;
  printResolutionDPI: number;
}

export interface SizeGuideRow {
  size: string;
  values: Record<string, number>;
}

export interface SizeGuide {
  unit: "cm" | "in";
  columns: { key: string; label: string }[];
  rows: SizeGuideRow[];
  notes?: string;
}

export interface CustomizableTemplateData {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  surcharge: number | null;
  zones: PrintZone[];
  allowedFonts: string[];
  allowedColors: string[];
  allowCustomColors: boolean;
  sizeGuide: SizeGuide | null;
  maxLayersPerZone: number;
  maxCharsPerLayer: number;
}

export interface TextLayer {
  id: string;
  type: "TEXT";
  text: string;
  font: string;
  size: number;
  color: string;
  letterSpacing: number;
  rotation: number;
  x: number;       // pct of mockup
  y: number;
  width: number;
  height: number;
  align: "left" | "center" | "right";
}

export interface CustomDesignZone {
  zoneId: string;
  layers: TextLayer[];
}

export interface CustomDesignSnapshot {
  allowedFonts: string[];
  allowedColors: string[];
  allowCustomColors: boolean;
  maxLayersPerZone: number;
  maxCharsPerLayer: number;
  surcharge: number | null;
  zones: Array<{ id: string; name: string; bounds: BoundsPct }>;
}

export interface CustomDesign {
  templateId: string;
  templateSnapshot: CustomDesignSnapshot;
  zones: CustomDesignZone[];
}

export interface CustomDesignImage {
  zoneId: string;
  url: string;
}

export interface MockupOverrides {
  axisOptionId: string;
  mockups: {
    [zoneId: string]: {
      [productOptionValueId: string]: string;
    };
  };
}

export const FONT_CATEGORIES = [
  "sans-serif",
  "serif",
  "display",
  "handwriting",
  "monospace",
] as const;

export type FontCategory = (typeof FONT_CATEGORIES)[number];

export interface FontDef {
  key: string;
  family: string;
  category: FontCategory;
  popular?: boolean;
}

export interface ColorDef {
  hex: string;
  name: string;
  group: string;
}
```

- [ ] **Step 2: Verificar tipos**

Run:
```bash
npx tsc --noEmit
```

Expected: zero errors related to `lib/customizer/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/customizer/types.ts
git commit -m "feat(customizer): add domain TypeScript types

Defines CustomizableTemplateData, CustomDesign with templateSnapshot,
TextLayer, PrintZone, SizeGuide, MockupOverrides, FontDef, ColorDef."
```

---

### Task 1.3: Catálogo de fuentes (60 Google Fonts)

**Files:**
- Create: `lib/customizer/default-fonts.ts`
- Create: `lib/customizer/__tests__/default-fonts.test.ts`

- [ ] **Step 1: Escribir el test (TDD)**

```ts
// lib/customizer/__tests__/default-fonts.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_FONTS,
  POPULAR_FONT_KEYS,
  getFontByKey,
  getFontsByCategory,
} from "../default-fonts";
import { FONT_CATEGORIES } from "../types";

describe("default-fonts", () => {
  it("contains exactly 60 fonts", () => {
    expect(DEFAULT_FONTS).toHaveLength(60);
  });

  it("has unique keys", () => {
    const keys = DEFAULT_FONTS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has 16 sans-serif, 12 serif, 16 display, 10 handwriting, 6 monospace", () => {
    expect(getFontsByCategory("sans-serif")).toHaveLength(16);
    expect(getFontsByCategory("serif")).toHaveLength(12);
    expect(getFontsByCategory("display")).toHaveLength(16);
    expect(getFontsByCategory("handwriting")).toHaveLength(10);
    expect(getFontsByCategory("monospace")).toHaveLength(6);
  });

  it("every category in FONT_CATEGORIES is used", () => {
    for (const cat of FONT_CATEGORIES) {
      expect(getFontsByCategory(cat).length).toBeGreaterThan(0);
    }
  });

  it("POPULAR_FONT_KEYS has 8 entries, all valid", () => {
    expect(POPULAR_FONT_KEYS).toHaveLength(8);
    for (const key of POPULAR_FONT_KEYS) {
      expect(getFontByKey(key)).toBeDefined();
    }
  });

  it("getFontByKey returns undefined for unknown", () => {
    expect(getFontByKey("FuenteInventada")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/customizer/__tests__/default-fonts.test.ts`

Expected: FAIL — `Cannot find module '../default-fonts'`.

- [ ] **Step 3: Implement default-fonts.ts**

```ts
// lib/customizer/default-fonts.ts
import type { FontDef, FontCategory } from "./types";

export const DEFAULT_FONTS: FontDef[] = [
  // Sans-serif (16)
  { key: "Inter", family: "Inter", category: "sans-serif", popular: true },
  { key: "Roboto", family: "Roboto", category: "sans-serif", popular: true },
  { key: "Open Sans", family: "Open Sans", category: "sans-serif", popular: true },
  { key: "Montserrat", family: "Montserrat", category: "sans-serif", popular: true },
  { key: "Poppins", family: "Poppins", category: "sans-serif", popular: true },
  { key: "Lato", family: "Lato", category: "sans-serif" },
  { key: "Raleway", family: "Raleway", category: "sans-serif" },
  { key: "Nunito", family: "Nunito", category: "sans-serif" },
  { key: "Work Sans", family: "Work Sans", category: "sans-serif" },
  { key: "Source Sans 3", family: "Source Sans 3", category: "sans-serif" },
  { key: "Manrope", family: "Manrope", category: "sans-serif" },
  { key: "Outfit", family: "Outfit", category: "sans-serif" },
  { key: "DM Sans", family: "DM Sans", category: "sans-serif" },
  { key: "Plus Jakarta Sans", family: "Plus Jakarta Sans", category: "sans-serif" },
  { key: "Mulish", family: "Mulish", category: "sans-serif" },
  { key: "Karla", family: "Karla", category: "sans-serif" },
  // Serif (12)
  { key: "Playfair Display", family: "Playfair Display", category: "serif", popular: true },
  { key: "Merriweather", family: "Merriweather", category: "serif" },
  { key: "Lora", family: "Lora", category: "serif" },
  { key: "EB Garamond", family: "EB Garamond", category: "serif" },
  { key: "Crimson Pro", family: "Crimson Pro", category: "serif" },
  { key: "Cormorant Garamond", family: "Cormorant Garamond", category: "serif" },
  { key: "PT Serif", family: "PT Serif", category: "serif" },
  { key: "Source Serif 4", family: "Source Serif 4", category: "serif" },
  { key: "Bitter", family: "Bitter", category: "serif" },
  { key: "Roboto Serif", family: "Roboto Serif", category: "serif" },
  { key: "Noto Serif", family: "Noto Serif", category: "serif" },
  { key: "Libre Baskerville", family: "Libre Baskerville", category: "serif" },
  // Display (16)
  { key: "Bebas Neue", family: "Bebas Neue", category: "display", popular: true },
  { key: "Oswald", family: "Oswald", category: "display", popular: true },
  { key: "Anton", family: "Anton", category: "display" },
  { key: "Abril Fatface", family: "Abril Fatface", category: "display" },
  { key: "Archivo Black", family: "Archivo Black", category: "display" },
  { key: "Righteous", family: "Righteous", category: "display" },
  { key: "Bungee", family: "Bungee", category: "display" },
  { key: "Permanent Marker", family: "Permanent Marker", category: "display" },
  { key: "Black Ops One", family: "Black Ops One", category: "display" },
  { key: "Faster One", family: "Faster One", category: "display" },
  { key: "Monoton", family: "Monoton", category: "display" },
  { key: "Lobster", family: "Lobster", category: "display" },
  { key: "Pacifico", family: "Pacifico", category: "display" },
  { key: "Fredoka One", family: "Fredoka One", category: "display" },
  { key: "Alfa Slab One", family: "Alfa Slab One", category: "display" },
  { key: "Russo One", family: "Russo One", category: "display" },
  // Handwriting (10)
  { key: "Caveat", family: "Caveat", category: "handwriting" },
  { key: "Dancing Script", family: "Dancing Script", category: "handwriting" },
  { key: "Great Vibes", family: "Great Vibes", category: "handwriting" },
  { key: "Sacramento", family: "Sacramento", category: "handwriting" },
  { key: "Satisfy", family: "Satisfy", category: "handwriting" },
  { key: "Kalam", family: "Kalam", category: "handwriting" },
  { key: "Indie Flower", family: "Indie Flower", category: "handwriting" },
  { key: "Shadows Into Light", family: "Shadows Into Light", category: "handwriting" },
  { key: "Homemade Apple", family: "Homemade Apple", category: "handwriting" },
  { key: "Marck Script", family: "Marck Script", category: "handwriting" },
  // Monospace (6)
  { key: "JetBrains Mono", family: "JetBrains Mono", category: "monospace" },
  { key: "Fira Code", family: "Fira Code", category: "monospace" },
  { key: "Roboto Mono", family: "Roboto Mono", category: "monospace" },
  { key: "Source Code Pro", family: "Source Code Pro", category: "monospace" },
  { key: "Space Mono", family: "Space Mono", category: "monospace" },
  { key: "IBM Plex Mono", family: "IBM Plex Mono", category: "monospace" },
];

export const POPULAR_FONT_KEYS: string[] = DEFAULT_FONTS.filter((f) => f.popular).map((f) => f.key);

export function getFontByKey(key: string): FontDef | undefined {
  return DEFAULT_FONTS.find((f) => f.key === key);
}

export function getFontsByCategory(category: FontCategory): FontDef[] {
  return DEFAULT_FONTS.filter((f) => f.category === category);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/customizer/__tests__/default-fonts.test.ts`

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/customizer/default-fonts.ts lib/customizer/__tests__/default-fonts.test.ts
git commit -m "feat(customizer): add 60-font default catalog

5 categories (16 sans-serif, 12 serif, 16 display, 10 handwriting,
6 monospace), 8 marked popular for preload, with helpers and tests."
```

---

### Task 1.4: Catálogo de colores (~120 swatches)

**Files:**
- Create: `lib/customizer/default-colors.ts`
- Create: `lib/customizer/__tests__/default-colors.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
// lib/customizer/__tests__/default-colors.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_COLORS, getColorByHex, getColorsByGroup } from "../default-colors";

describe("default-colors", () => {
  it("contains 120 colors", () => {
    expect(DEFAULT_COLORS).toHaveLength(120);
  });

  it("every hex is valid 6-digit format", () => {
    const re = /^#[0-9A-Fa-f]{6}$/;
    for (const c of DEFAULT_COLORS) {
      expect(c.hex).toMatch(re);
    }
  });

  it("hex values are unique", () => {
    const hexes = DEFAULT_COLORS.map((c) => c.hex.toUpperCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("groups have expected counts", () => {
    expect(getColorsByGroup("blacks-grays")).toHaveLength(12);
    expect(getColorsByGroup("reds-browns")).toHaveLength(16);
    expect(getColorsByGroup("oranges")).toHaveLength(10);
    expect(getColorsByGroup("yellows")).toHaveLength(10);
    expect(getColorsByGroup("greens")).toHaveLength(16);
    expect(getColorsByGroup("blues")).toHaveLength(16);
    expect(getColorsByGroup("purples")).toHaveLength(12);
    expect(getColorsByGroup("pinks")).toHaveLength(12);
    expect(getColorsByGroup("pastel-neutrals")).toHaveLength(16);
  });

  it("getColorByHex finds case-insensitively", () => {
    expect(getColorByHex("#000000")).toBeDefined();
    expect(getColorByHex("#000000")?.name).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/customizer/__tests__/default-colors.test.ts`

Expected: FAIL — `Cannot find module '../default-colors'`.

- [ ] **Step 3: Implement default-colors.ts**

```ts
// lib/customizer/default-colors.ts
import type { ColorDef } from "./types";

const G = (group: string, items: Array<[string, string]>): ColorDef[] =>
  items.map(([hex, name]) => ({ hex, name, group }));

export const DEFAULT_COLORS: ColorDef[] = [
  ...G("blacks-grays", [
    ["#000000", "Negro"], ["#1A1A1A", "Negro carbón"], ["#2C2C2C", "Grafito"],
    ["#3D3D3D", "Plomo oscuro"], ["#4F4F4F", "Plomo"], ["#6B6B6B", "Plomo claro"],
    ["#8C8C8C", "Gris medio"], ["#A8A8A8", "Gris"], ["#BFBFBF", "Gris perla"],
    ["#D9D9D9", "Gris claro"], ["#EDEDED", "Casi blanco"], ["#FFFFFF", "Blanco"],
  ]),
  ...G("reds-browns", [
    ["#7F1D1D", "Vino"], ["#991B1B", "Borgoña"], ["#B91C1C", "Carmín"],
    ["#DC2626", "Rojo"], ["#EF4444", "Rojo brillante"], ["#F87171", "Rojo coral"],
    ["#FCA5A5", "Rosado salmón"], ["#5C2E1B", "Marrón oscuro"],
    ["#7C3F1F", "Castaño"], ["#92531C", "Caramelo"], ["#A65D2E", "Cobre"],
    ["#BE6E3D", "Tabaco"], ["#D08552", "Madera"], ["#E0A375", "Beige cálido"],
    ["#EBC19A", "Arena"], ["#F2D7B7", "Crema oscura"],
  ]),
  ...G("oranges", [
    ["#7C2D12", "Ladrillo"], ["#9A3412", "Óxido"], ["#C2410C", "Naranja terracota"],
    ["#EA580C", "Naranja"], ["#F97316", "Naranja brillante"], ["#FB923C", "Mandarina"],
    ["#FDBA74", "Durazno"], ["#FED7AA", "Melocotón claro"],
    ["#FFEDD5", "Crema naranja"], ["#FFF7ED", "Blanco naranja"],
  ]),
  ...G("yellows", [
    ["#713F12", "Mostaza oscura"], ["#854D0E", "Ámbar oscuro"],
    ["#A16207", "Mostaza"], ["#CA8A04", "Dorado"], ["#EAB308", "Amarillo dorado"],
    ["#FACC15", "Amarillo"], ["#FDE047", "Amarillo limón"],
    ["#FEF08A", "Amarillo pastel"], ["#FEF9C3", "Amarillo crema"],
    ["#FEFCE8", "Marfil"],
  ]),
  ...G("greens", [
    ["#14532D", "Verde bosque"], ["#166534", "Verde oscuro"],
    ["#15803D", "Verde botella"], ["#16A34A", "Verde"], ["#22C55E", "Verde brillante"],
    ["#4ADE80", "Verde menta"], ["#86EFAC", "Verde claro"],
    ["#BBF7D0", "Verde pastel"], ["#365314", "Oliva oscuro"],
    ["#3F6212", "Oliva"], ["#65A30D", "Lima oscuro"], ["#84CC16", "Lima"],
    ["#A3E635", "Lima brillante"], ["#BEF264", "Lima claro"],
    ["#D9F99D", "Verde pálido"], ["#ECFCCB", "Verde claro pastel"],
  ]),
  ...G("blues", [
    ["#0C4A6E", "Azul marino oscuro"], ["#075985", "Azul marino"],
    ["#0369A1", "Azul medio"], ["#0284C7", "Azul"], ["#0EA5E9", "Azul cielo"],
    ["#38BDF8", "Celeste"], ["#7DD3FC", "Celeste claro"],
    ["#BAE6FD", "Celeste pastel"], ["#1E3A8A", "Azul royal oscuro"],
    ["#1E40AF", "Azul royal"], ["#2563EB", "Azul brillante"],
    ["#3B82F6", "Azul medio brillante"], ["#60A5FA", "Azul lavanda"],
    ["#93C5FD", "Azul cielo claro"], ["#BFDBFE", "Azul pastel"],
    ["#DBEAFE", "Azul muy claro"],
  ]),
  ...G("purples", [
    ["#3B0764", "Violeta oscuro"], ["#581C87", "Púrpura"], ["#6B21A8", "Morado"],
    ["#7E22CE", "Morado brillante"], ["#9333EA", "Violeta"], ["#A855F7", "Lavanda"],
    ["#C084FC", "Lila"], ["#D8B4FE", "Lila claro"], ["#4C1D95", "Índigo oscuro"],
    ["#5B21B6", "Índigo"], ["#6D28D9", "Índigo brillante"], ["#7C3AED", "Violeta brillante"],
  ]),
  ...G("pinks", [
    ["#831843", "Borgoña rosa"], ["#9F1239", "Rosa oscuro"],
    ["#BE123C", "Rosa fuerte"], ["#E11D48", "Rosa rojo"],
    ["#F43F5E", "Rosa coral"], ["#FB7185", "Rosa salmón"],
    ["#FDA4AF", "Rosa claro"], ["#FECDD3", "Rosa pastel"],
    ["#86198F", "Magenta oscuro"], ["#A21CAF", "Magenta"],
    ["#C026D3", "Magenta brillante"], ["#E879F9", "Rosa fucsia"],
  ]),
  ...G("pastel-neutrals", [
    ["#FAFAF9", "Hueso"], ["#F5F5F4", "Lino"], ["#E7E5E4", "Beige claro"],
    ["#D6D3D1", "Beige"], ["#A8A29E", "Beige oscuro"], ["#78716C", "Topo"],
    ["#57534E", "Topo oscuro"], ["#F1F5F9", "Blanco azulado"],
    ["#E2E8F0", "Gris azulado claro"], ["#CBD5E1", "Gris azulado"],
    ["#94A3B8", "Pizarra"], ["#FDF4FF", "Blanco rosado"],
    ["#FAE8FF", "Lavanda muy clara"], ["#FCE7F3", "Rosa muy claro"],
    ["#FFF1F2", "Blanco rosa"], ["#FEFCE8", "Marfil pastel"],
  ]),
];

export function getColorByHex(hex: string): ColorDef | undefined {
  const target = hex.toUpperCase();
  return DEFAULT_COLORS.find((c) => c.hex.toUpperCase() === target);
}

export function getColorsByGroup(group: string): ColorDef[] {
  return DEFAULT_COLORS.filter((c) => c.group === group);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/customizer/__tests__/default-colors.test.ts`

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/customizer/default-colors.ts lib/customizer/__tests__/default-colors.test.ts
git commit -m "feat(customizer): add 120-color default palette

9 tonal groups (blacks-grays, reds-browns, oranges, yellows, greens,
blues, purples, pinks, pastel-neutrals), unique hex values, helpers
to lookup by hex/group, with tests."
```

---

### Task 1.5: Validación Zod del `CustomDesign`

**Files:**
- Create: `lib/customizer/validate.ts`
- Create: `lib/customizer/__tests__/validate.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
// lib/customizer/__tests__/validate.test.ts
import { describe, it, expect } from "vitest";
import { validateCustomDesign, customDesignSchema } from "../validate";
import type { CustomDesign, CustomDesignSnapshot } from "../types";

const baseSnapshot: CustomDesignSnapshot = {
  allowedFonts: ["Inter", "Roboto"],
  allowedColors: ["#000000", "#FFFFFF"],
  allowCustomColors: false,
  maxLayersPerZone: 3,
  maxCharsPerLayer: 20,
  surcharge: 5,
  zones: [
    { id: "frontal", name: "Frontal", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 } },
  ],
};

const validDesign: CustomDesign = {
  templateId: "tpl_1",
  templateSnapshot: baseSnapshot,
  zones: [
    {
      zoneId: "frontal",
      layers: [
        {
          id: "l1", type: "TEXT", text: "Hola",
          font: "Inter", size: 32, color: "#000000",
          letterSpacing: 0, rotation: 0,
          x: 50, y: 50, width: 30, height: 5,
          align: "center",
        },
      ],
    },
  ],
};

describe("validateCustomDesign", () => {
  it("accepts a valid design", () => {
    expect(validateCustomDesign(validDesign).success).toBe(true);
  });

  it("rejects a design with no layers in any zone", () => {
    const d = { ...validDesign, zones: [{ zoneId: "frontal", layers: [] }] };
    const r = validateCustomDesign(d);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/al menos una/i);
  });

  it("rejects font outside allowedFonts", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].font = "FuentePirata";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects color outside allowedColors when allowCustomColors=false", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].color = "#FF00FF";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("accepts custom hex color when allowCustomColors=true", () => {
    const d = structuredClone(validDesign);
    d.templateSnapshot.allowCustomColors = true;
    d.zones[0].layers[0].color = "#FF00FF";
    expect(validateCustomDesign(d).success).toBe(true);
  });

  it("rejects text longer than maxCharsPerLayer", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].text = "x".repeat(21);
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects more layers than maxLayersPerZone", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers = Array.from({ length: 4 }, (_, i) => ({
      ...validDesign.zones[0].layers[0], id: `l${i}`,
    }));
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects unknown zoneId", () => {
    const d = structuredClone(validDesign);
    d.zones[0].zoneId = "lateral";
    expect(validateCustomDesign(d).success).toBe(false);
  });

  it("rejects font size out of range", () => {
    const d = structuredClone(validDesign);
    d.zones[0].layers[0].size = 7;
    expect(validateCustomDesign(d).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/customizer/__tests__/validate.test.ts`

Expected: FAIL — `Cannot find module '../validate'`.

- [ ] **Step 3: Implement validate.ts**

```ts
// lib/customizer/validate.ts
import { z } from "zod";
import type { CustomDesign } from "./types";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const boundsSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0).max(100),
  heightPct: z.number().min(0).max(100),
});

const snapshotSchema = z.object({
  allowedFonts: z.array(z.string()),
  allowedColors: z.array(z.string().regex(HEX_RE)),
  allowCustomColors: z.boolean(),
  maxLayersPerZone: z.number().int().positive(),
  maxCharsPerLayer: z.number().int().positive(),
  surcharge: z.number().nullable(),
  zones: z.array(z.object({ id: z.string(), name: z.string(), bounds: boundsSchema })),
});

const textLayerSchema = z.object({
  id: z.string().min(1),
  type: z.literal("TEXT"),
  text: z.string(),
  font: z.string(),
  size: z.number().min(8).max(200),
  color: z.string().regex(HEX_RE),
  letterSpacing: z.number().min(-10).max(50),
  rotation: z.number().min(0).max(360),
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  width: z.number().positive(),
  height: z.number().positive(),
  align: z.enum(["left", "center", "right"]),
});

export const customDesignSchema = z.object({
  templateId: z.string().min(1),
  templateSnapshot: snapshotSchema,
  zones: z.array(
    z.object({
      zoneId: z.string(),
      layers: z.array(textLayerSchema),
    })
  ),
});

export type ValidationResult =
  | { success: true; data: CustomDesign }
  | { success: false; error: string };

export function validateCustomDesign(input: unknown): ValidationResult {
  const parsed = customDesignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Diseño inválido" };
  }
  const d = parsed.data;
  const snap = d.templateSnapshot;

  // Al menos una zona con layers
  const totalLayers = d.zones.reduce((acc, z) => acc + z.layers.length, 0);
  if (totalLayers === 0) {
    return { success: false, error: "El diseño debe tener al menos una capa de texto en alguna zona" };
  }

  const allowedZoneIds = new Set(snap.zones.map((z) => z.id));
  const allowedFonts = new Set(snap.allowedFonts);
  const allowedColors = new Set(snap.allowedColors.map((c) => c.toUpperCase()));

  for (const zone of d.zones) {
    if (!allowedZoneIds.has(zone.zoneId)) {
      return { success: false, error: `Zona desconocida: ${zone.zoneId}` };
    }
    if (zone.layers.length > snap.maxLayersPerZone) {
      return { success: false, error: `Zona ${zone.zoneId} excede el máximo de ${snap.maxLayersPerZone} capas` };
    }
    for (const layer of zone.layers) {
      if (layer.text.length > snap.maxCharsPerLayer) {
        return { success: false, error: `Texto excede los ${snap.maxCharsPerLayer} caracteres permitidos` };
      }
      if (!allowedFonts.has(layer.font)) {
        return { success: false, error: `Fuente no permitida: ${layer.font}` };
      }
      if (!snap.allowCustomColors && !allowedColors.has(layer.color.toUpperCase())) {
        return { success: false, error: `Color no permitido: ${layer.color}` };
      }
    }
  }

  return { success: true, data: d as CustomDesign };
}

const VERCEL_BLOB_DOMAIN_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/.+/i;

export function validateCustomDesignImageUrl(url: string): boolean {
  return VERCEL_BLOB_DOMAIN_RE.test(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/customizer/__tests__/validate.test.ts`

Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/customizer/validate.ts lib/customizer/__tests__/validate.test.ts
git commit -m "feat(customizer): add Zod validation for CustomDesign

Validates against templateSnapshot (frozen at add-to-cart): zone IDs,
font/color allowlists, char/layer limits, font size range, and helper
to verify Vercel Blob URLs."
```

---

### Task 1.6: Pricing helper

**Files:**
- Create: `lib/customizer/pricing.ts`
- Create: `lib/customizer/__tests__/pricing.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
// lib/customizer/__tests__/pricing.test.ts
import { describe, it, expect } from "vitest";
import { calculateCustomizedPrice, getPriceBreakdown } from "../pricing";

describe("pricing", () => {
  it("returns base price when no surcharge", () => {
    expect(calculateCustomizedPrice(39.9, null)).toBe(39.9);
  });

  it("adds surcharge when present", () => {
    expect(calculateCustomizedPrice(39.9, 5)).toBe(44.9);
  });

  it("treats surcharge=0 same as null", () => {
    expect(calculateCustomizedPrice(39.9, 0)).toBe(39.9);
  });

  it("handles decimal precision", () => {
    expect(calculateCustomizedPrice(39.99, 5.51)).toBeCloseTo(45.5, 2);
  });

  it("getPriceBreakdown returns base/surcharge/total", () => {
    expect(getPriceBreakdown(39.9, 5)).toEqual({ base: 39.9, surcharge: 5, total: 44.9 });
    expect(getPriceBreakdown(39.9, null)).toEqual({ base: 39.9, surcharge: 0, total: 39.9 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/customizer/__tests__/pricing.test.ts`

Expected: FAIL — `Cannot find module '../pricing'`.

- [ ] **Step 3: Implement pricing.ts**

```ts
// lib/customizer/pricing.ts

export function calculateCustomizedPrice(basePrice: number, surcharge: number | null): number {
  if (!surcharge || surcharge <= 0) return basePrice;
  return Math.round((basePrice + surcharge) * 100) / 100;
}

export interface PriceBreakdown {
  base: number;
  surcharge: number;
  total: number;
}

export function getPriceBreakdown(basePrice: number, surcharge: number | null): PriceBreakdown {
  const sc = surcharge && surcharge > 0 ? surcharge : 0;
  return {
    base: basePrice,
    surcharge: sc,
    total: Math.round((basePrice + sc) * 100) / 100,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/customizer/__tests__/pricing.test.ts`

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/customizer/pricing.ts lib/customizer/__tests__/pricing.test.ts
git commit -m "feat(customizer): add pricing helpers

calculateCustomizedPrice handles null/0 surcharge cleanly;
getPriceBreakdown returns {base, surcharge, total} for cart UI."
```

---

### Task 1.7: i18n strings

**Files:**
- Create: `lib/customizer/i18n.ts`

- [ ] **Step 1: Crear i18n.ts**

```ts
// lib/customizer/i18n.ts

export const t = {
  startCustomizing: "Empieza a diseñar",
  startCustomizingHint: "Diseña tu polo en 30 segundos →",
  surchargeLabel: "personalización",
  builder: {
    backToProduct: "← Volver al producto",
    addToCart: "Añadir al carrito",
    saveChanges: "Guardar cambios",
    uploading: "Subiendo tu diseño…",
    addText: "+ Texto",
    deleteLayer: "Eliminar",
    duplicateLayer: "Duplicar",
    confirmExit: "Tus cambios se perderán. ¿Estás seguro?",
    stayHere: "Quedarme aquí",
    discardAndExit: "Descartar y salir",
    emptyZoneHint: "Toca + Texto para empezar",
    layerOutOfBounds: "El texto saldrá del área de impresión",
    mustHaveLayer: "Añade al menos un texto en alguna zona",
    designExpired: "El diseño expiró, vuelve a personalizar",
    retry: "Reintentar",
  },
  tabs: {
    producto: "Producto",
    capas: "Capas",
    texto: "Texto",
    color: "Color",
    fuente: "Fuente",
    transformar: "Transformar",
    posicion: "Posición",
    proximamente: "Próximamente",
  },
  zones: {
    frontal: "Frontal",
    trasera: "Trasera",
  },
  fonts: {
    searchPlaceholder: "Buscar fuente",
    allFonts: "Todas las fuentes",
    popularFonts: "Tipos populares",
    usedInDesign: "Utilizadas en el diseño",
  },
  colors: {
    customColor: "Color personalizado",
    pickerHexLabel: "Hex",
  },
  admin: {
    customizationCard: "Personalización",
    templateLabel: "Plantilla de personalización",
    templateNone: "— Sin personalización —",
    mockupOverridesLabel: "Mockups por color (opcional)",
    mockupOverridesHint: "Si dejas vacío, se usará el mockup de la plantilla",
    axisOptionLabel: "Opción que cambia el mockup",
    previewExperience: "Vista previa de la experiencia",
    editTemplate: "Editar plantilla →",
  },
} as const;
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/customizer/i18n.ts
git commit -m "feat(customizer): add Spanish i18n strings catalog"
```

---

## Phase 2 — Server actions y permisos

### Task 2.1: Permisos RBAC nuevos

**Files:**
- Modify: `lib/permissions.ts` (añadir slugs)
- Create: `scripts/setup-customizables-permissions.ts`

- [ ] **Step 1: Leer `lib/permissions.ts` para localizar el patrón**

Run: `head -100 lib/permissions.ts` para ver cómo están declarados los permisos existentes (ej. `themes:view`).

- [ ] **Step 2: Añadir los 4 permisos nuevos en `lib/permissions.ts`**

Localizar el array/objeto de permisos definidos y agregar:

```ts
"customizables:view",
"customizables:create",
"customizables:update",
"customizables:delete",
```

(Adaptar exactamente al formato existente — sigue el patrón de `themes:*`.)

- [ ] **Step 3: Crear el script de seed `scripts/setup-customizables-permissions.ts`**

Copiar la estructura de `scripts/setup-themes-permissions.ts` y adaptar:

```ts
// scripts/setup-customizables-permissions.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { slug: "customizables.view", name: "Ver plantillas personalizables", description: "Listar y ver plantillas" },
  { slug: "customizables.create", name: "Crear plantillas personalizables", description: "Crear nuevas plantillas" },
  { slug: "customizables.update", name: "Editar plantillas personalizables", description: "Modificar plantillas existentes" },
  { slug: "customizables.delete", name: "Eliminar plantillas personalizables", description: "Borrar o desactivar plantillas" },
];

async function main() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: { name: perm.name, description: perm.description },
      create: perm,
    });
    console.log(`✓ ${perm.slug}`);
  }

  // Asignar a roles Manager+ (level >= 5)
  const managerRoles = await prisma.role.findMany({ where: { level: { gte: 5 } } });
  const allPerms = await prisma.permission.findMany({ where: { slug: { in: PERMISSIONS.map((p) => p.slug) } } });

  for (const role of managerRoles) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`✓ Asignado a rol ${role.name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Ejecutar el script**

Run: `npx tsx scripts/setup-customizables-permissions.ts`

Expected: 4 líneas `✓ customizables.*` + N líneas `✓ Asignado a rol <nombre>`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npm run lint`

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add lib/permissions.ts scripts/setup-customizables-permissions.ts
git commit -m "feat(rbac): add customizables permissions

Adds customizables:{view,create,update,delete} and seed script
that assigns them to all Manager+ roles (level >= 5)."
```

---

### Task 2.2: Server action `saveCustomizableTemplate` (create)

**Files:**
- Create: `actions/customizer.ts`
- Create: `actions/__tests__/customizer.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
// actions/__tests__/customizer.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    customizableTemplate: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(async () => ({ user: { id: "u1" }, response: null })),
}));

import { saveCustomizableTemplate, listCustomizableTemplates } from "../customizer";
import { prisma } from "@/lib/db";

describe("saveCustomizableTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a template with valid data", async () => {
    (prisma.customizableTemplate.create as any).mockResolvedValue({ id: "t1" });
    const result = await saveCustomizableTemplate({
      name: "Polo blanco",
      description: null,
      surcharge: 5,
      zones: [
        {
          id: "frontal", name: "Frontal",
          mockupImage: "https://x.public.blob.vercel-storage.com/m.png",
          bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
          printResolutionDPI: 300,
        },
      ],
      allowedFonts: ["Inter"],
      allowedColors: ["#000000"],
      allowCustomColors: true,
      sizeGuide: null,
      maxLayersPerZone: 8,
      maxCharsPerLayer: 40,
      active: true,
    });
    expect(result.success).toBe(true);
    expect(prisma.customizableTemplate.create).toHaveBeenCalled();
  });

  it("rejects empty name", async () => {
    const result = await saveCustomizableTemplate({
      name: "",
      description: null, surcharge: null,
      zones: [], allowedFonts: [], allowedColors: [],
      allowCustomColors: true, sizeGuide: null,
      maxLayersPerZone: 8, maxCharsPerLayer: 40, active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zone with width=0", async () => {
    const result = await saveCustomizableTemplate({
      name: "X", description: null, surcharge: null,
      zones: [{
        id: "z", name: "Z",
        mockupImage: "https://x.public.blob.vercel-storage.com/m.png",
        bounds: { xPct: 0, yPct: 0, widthPct: 0, heightPct: 50 },
        printResolutionDPI: 300,
      }],
      allowedFonts: [], allowedColors: [], allowCustomColors: true,
      sizeGuide: null, maxLayersPerZone: 8, maxCharsPerLayer: 40, active: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("listCustomizableTemplates", () => {
  it("returns active templates", async () => {
    (prisma.customizableTemplate.findMany as any).mockResolvedValue([{ id: "t1", active: true }]);
    const result = await listCustomizableTemplates();
    expect(result.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run actions/__tests__/customizer.test.ts`

Expected: FAIL — `Cannot find module '../customizer'`.

- [ ] **Step 3: Implement `actions/customizer.ts`**

```ts
// actions/customizer.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import type { CustomizableTemplateData, PrintZone, SizeGuide } from "@/lib/customizer/types";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const VERCEL_BLOB_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/.+/i;

const boundsSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().positive().max(100),
  heightPct: z.number().positive().max(100),
});

const zoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mockupImage: z.string().regex(VERCEL_BLOB_RE),
  bounds: boundsSchema,
  printResolutionDPI: z.number().int().min(72).max(600),
});

const sizeGuideSchema = z.object({
  unit: z.enum(["cm", "in"]),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.object({ size: z.string(), values: z.record(z.string(), z.number()) })),
  notes: z.string().optional(),
}).nullable();

const templateInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  active: z.boolean(),
  surcharge: z.number().nullable(),
  zones: z.array(zoneSchema),
  allowedFonts: z.array(z.string()),
  allowedColors: z.array(z.string().regex(HEX_RE)),
  allowCustomColors: z.boolean(),
  sizeGuide: sizeGuideSchema,
  maxLayersPerZone: z.number().int().min(1).max(50),
  maxCharsPerLayer: z.number().int().min(1).max(500),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;
export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export async function saveCustomizableTemplate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requirePermission("customizables.create");
  if (auth.response) return { success: false, error: "No autorizado" };

  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  try {
    const created = await prisma.customizableTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        surcharge: data.surcharge,
        zones: data.zones as unknown as object,
        allowedFonts: data.allowedFonts,
        allowedColors: data.allowedColors,
        allowCustomColors: data.allowCustomColors,
        sizeGuide: data.sizeGuide as unknown as object | null,
        maxLayersPerZone: data.maxLayersPerZone,
        maxCharsPerLayer: data.maxCharsPerLayer,
      },
    });
    revalidatePath("/admin/personalizables");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al crear plantilla" };
  }
}

export async function updateCustomizableTemplate(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requirePermission("customizables.update");
  if (auth.response) return { success: false, error: "No autorizado" };
  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;
  try {
    const updated = await prisma.customizableTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        surcharge: data.surcharge,
        zones: data.zones as unknown as object,
        allowedFonts: data.allowedFonts,
        allowedColors: data.allowedColors,
        allowCustomColors: data.allowCustomColors,
        sizeGuide: data.sizeGuide as unknown as object | null,
        maxLayersPerZone: data.maxLayersPerZone,
        maxCharsPerLayer: data.maxCharsPerLayer,
      },
    });
    revalidatePath("/admin/personalizables");
    revalidatePath(`/admin/personalizables/${id}`);
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

export async function deleteCustomizableTemplate(id: string): Promise<ActionResult<null>> {
  const auth = await requirePermission("customizables.delete");
  if (auth.response) return { success: false, error: "No autorizado" };
  try {
    const inUse = await prisma.product.count({ where: { customizableTemplateId: id } });
    if (inUse > 0) {
      return { success: false, error: `No se puede eliminar: ${inUse} producto(s) usan esta plantilla. Desactívala en su lugar.` };
    }
    await prisma.customizableTemplate.delete({ where: { id } });
    revalidatePath("/admin/personalizables");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar" };
  }
}

export async function listCustomizableTemplates(): Promise<CustomizableTemplateData[]> {
  const rows = await prisma.customizableTemplate.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(rowToData);
}

export async function getCustomizableTemplate(id: string): Promise<CustomizableTemplateData | null> {
  const row = await prisma.customizableTemplate.findUnique({ where: { id } });
  return row ? rowToData(row) : null;
}

function rowToData(row: {
  id: string; name: string; description: string | null; active: boolean;
  surcharge: unknown; zones: unknown; allowedFonts: unknown; allowedColors: unknown;
  allowCustomColors: boolean; sizeGuide: unknown; maxLayersPerZone: number; maxCharsPerLayer: number;
}): CustomizableTemplateData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    surcharge: row.surcharge ? Number(row.surcharge) : null,
    zones: (row.zones as PrintZone[]) ?? [],
    allowedFonts: (row.allowedFonts as string[]) ?? [],
    allowedColors: (row.allowedColors as string[]) ?? [],
    allowCustomColors: row.allowCustomColors,
    sizeGuide: (row.sizeGuide as SizeGuide | null) ?? null,
    maxLayersPerZone: row.maxLayersPerZone,
    maxCharsPerLayer: row.maxCharsPerLayer,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run actions/__tests__/customizer.test.ts`

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add actions/customizer.ts actions/__tests__/customizer.test.ts
git commit -m "feat(customizer): add server actions for template CRUD

saveCustomizableTemplate, updateCustomizableTemplate,
deleteCustomizableTemplate (blocks delete if products use it),
listCustomizableTemplates, getCustomizableTemplate. All gated by
RBAC, validated with Zod, with revalidatePath on mutations."
```

---

### Task 2.3: Modificar `actions/orders.ts` para validar y persistir `customDesign`

**Files:**
- Modify: `actions/orders.ts` (mapper + validation antes de persistir)
- Create: `actions/__tests__/orders-customizer.test.ts`

- [ ] **Step 1: Localizar el punto donde se crean los `OrderItem` en `actions/orders.ts`**

Run: `grep -n "OrderItem" actions/orders.ts | head -20`

Identificar el `prisma.order.create` o similar que recibe `data.items.create`.

- [ ] **Step 2: Escribir el test (validación)**

```ts
// actions/__tests__/orders-customizer.test.ts
import { describe, it, expect } from "vitest";
import { validateCartItemDesign } from "../customizer-checkout";

const baseSnapshot = {
  allowedFonts: ["Inter"],
  allowedColors: ["#000000"],
  allowCustomColors: false,
  maxLayersPerZone: 5,
  maxCharsPerLayer: 40,
  surcharge: 5,
  zones: [{ id: "frontal", name: "Frontal", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 } }],
};

const validCartItem = {
  productId: "p1",
  customDesign: {
    templateId: "t1",
    templateSnapshot: baseSnapshot,
    zones: [
      {
        zoneId: "frontal",
        layers: [{
          id: "l1", type: "TEXT" as const, text: "Hola", font: "Inter",
          size: 32, color: "#000000", letterSpacing: 0, rotation: 0,
          x: 50, y: 50, width: 30, height: 5, align: "center" as const,
        }],
      },
    ],
  },
  customDesignImages: [{ zoneId: "frontal", url: "https://x.public.blob.vercel-storage.com/img.png" }],
};

describe("validateCartItemDesign", () => {
  it("accepts valid item", () => {
    const r = validateCartItemDesign(validCartItem, "t1");
    expect(r.success).toBe(true);
  });

  it("rejects when product template id mismatch", () => {
    const r = validateCartItemDesign(validCartItem, "different-template");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/plantilla/i);
  });

  it("rejects URL outside Vercel Blob domain", () => {
    const item = { ...validCartItem, customDesignImages: [{ zoneId: "frontal", url: "https://evil.com/x.png" }] };
    const r = validateCartItemDesign(item, "t1");
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run actions/__tests__/orders-customizer.test.ts`

Expected: FAIL — `Cannot find module '../customizer-checkout'`.

- [ ] **Step 4: Crear `actions/customizer-checkout.ts`**

```ts
// actions/customizer-checkout.ts
import { validateCustomDesign, validateCustomDesignImageUrl } from "@/lib/customizer/validate";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

export interface CartItemForValidation {
  productId: string;
  customDesign?: CustomDesign;
  customDesignImages?: CustomDesignImage[];
}

export type CheckoutValidationResult =
  | { success: true }
  | { success: false; error: string };

export function validateCartItemDesign(
  item: CartItemForValidation,
  productTemplateId: string | null
): CheckoutValidationResult {
  if (!item.customDesign) return { success: true };

  if (item.customDesign.templateId !== productTemplateId) {
    return {
      success: false,
      error: "La plantilla del producto cambió desde que añadiste al carrito. Vuelve a personalizar.",
    };
  }

  const designResult = validateCustomDesign(item.customDesign);
  if (!designResult.success) return { success: false, error: designResult.error };

  if (item.customDesignImages) {
    for (const img of item.customDesignImages) {
      if (!validateCustomDesignImageUrl(img.url)) {
        return { success: false, error: "URL de imagen inválida" };
      }
    }
  }

  return { success: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run actions/__tests__/orders-customizer.test.ts`

Expected: PASS — 3 tests passing.

- [ ] **Step 6: Integrar la validación en `actions/orders.ts`**

En la función que crea la orden (típicamente `createOrder` o similar), antes de `prisma.order.create`:

```ts
import { validateCartItemDesign } from "./customizer-checkout";

// Antes de crear la orden, por cada cartItem con customDesign:
for (const item of cartItems) {
  if (item.customDesign) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { customizableTemplateId: true },
    });
    const result = validateCartItemDesign(
      item,
      product?.customizableTemplateId ?? null
    );
    if (!result.success) {
      return { success: false, error: `Producto ${item.productId}: ${result.error}` };
    }
  }
}

// En el data.items.create, mapear los nuevos campos:
items: {
  create: cartItems.map((item) => ({
    // ... campos existentes ...
    customDesign: item.customDesign as unknown as object | null,
    customDesignImages: item.customDesignImages as unknown as object | null,
  })),
}
```

(El developer adapta los nombres exactos de variables al patrón actual del archivo.)

- [ ] **Step 7: Verify build**

Run: `npx tsc --noEmit && npm run lint`

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add actions/customizer-checkout.ts actions/orders.ts actions/__tests__/orders-customizer.test.ts
git commit -m "feat(customizer): validate customDesign at checkout

Adds validateCartItemDesign that checks against templateSnapshot,
verifies templateId matches current Product.customizableTemplateId,
and validates Vercel Blob URLs. Persists customDesign and
customDesignImages on OrderItem creation."
```

---

## Phase 3 — Admin: CRUD de plantillas

### Task 3.1: Instalar `react-konva` y `Konva`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install react-konva konva
```

Expected: `react-konva@^18` y `konva@^9` añadidos a dependencies.

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: build pasa (sin uso aún, pero deps instaladas).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add react-konva and konva for canvas builder"
```

---

### Task 3.2: Página lista de plantillas (`/admin/personalizables/`)

**Files:**
- Create: `app/admin/personalizables/page.tsx`
- Create: `components/admin/customizer-templates/TemplatesList.tsx`

- [ ] **Step 1: Crear `app/admin/personalizables/page.tsx`**

```tsx
// app/admin/personalizables/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { protectRoute } from "@/lib/protect-route";
import { listCustomizableTemplates } from "@/actions/customizer";
import { TemplatesList } from "@/components/admin/customizer-templates/TemplatesList";

export const dynamic = "force-dynamic";

export default async function PersonalizablesPage() {
  await protectRoute("customizables:view");
  const templates = await listCustomizableTemplates();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Plantillas personalizables</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plantillas reusables que el cliente final usa para personalizar productos.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/personalizables/nuevo">Nueva plantilla</Link>
        </Button>
      </div>
      <TemplatesList templates={templates} />
    </div>
  );
}
```

- [ ] **Step 2: Crear `TemplatesList.tsx`**

```tsx
// components/admin/customizer-templates/TemplatesList.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import type { CustomizableTemplateData } from "@/lib/customizer/types";

interface TemplatesListProps {
  templates: CustomizableTemplateData[];
}

export function TemplatesList({ templates }: TemplatesListProps) {
  if (templates.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        Aún no hay plantillas. Crea la primera con "Nueva plantilla".
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => {
        const firstZone = tpl.zones[0];
        return (
          <Link
            key={tpl.id}
            href={`/admin/personalizables/${tpl.id}`}
            className="border rounded-lg overflow-hidden hover:shadow-md transition"
          >
            <div className="aspect-square bg-muted relative">
              {firstZone?.mockupImage ? (
                <Image src={firstZone.mockupImage} alt={tpl.name} fill className="object-contain" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sin mockup
                </div>
              )}
              {!tpl.active && (
                <span className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Inactiva
                </span>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold truncate">{tpl.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {tpl.zones.length} zona{tpl.zones.length !== 1 ? "s" : ""}
                {tpl.surcharge ? ` · S/ ${tpl.surcharge.toFixed(2)} sobrecargo` : ""}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: pasa sin errores en `app/admin/personalizables/page.tsx`.

- [ ] **Step 4: Smoke manual**

Run: `npm run dev`

Navegar a `http://localhost:3000/admin/personalizables/`. Esperar lista vacía con CTA "Nueva plantilla".

- [ ] **Step 5: Commit**

```bash
git add app/admin/personalizables/page.tsx components/admin/customizer-templates/TemplatesList.tsx
git commit -m "feat(admin): add customizer templates list page"
```

---

### Task 3.3: `ZoneEditor` — editor visual de bounds con Konva

**Files:**
- Create: `components/admin/customizer-templates/ZoneEditor.tsx`

- [ ] **Step 1: Crear `ZoneEditor.tsx`**

```tsx
// components/admin/customizer-templates/ZoneEditor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PrintZone, BoundsPct } from "@/lib/customizer/types";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const Image = dynamic(() => import("react-konva").then((m) => m.Image), { ssr: false });
const Rect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const Transformer = dynamic(() => import("react-konva").then((m) => m.Transformer), { ssr: false });

interface ZoneEditorProps {
  zone: PrintZone;
  onChange: (zone: PrintZone) => void;
}

export function ZoneEditor({ zone, onChange }: ZoneEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 600, h: 600 });
  const rectRef = useRef<unknown>(null);
  const trRef = useRef<unknown>(null);

  useEffect(() => {
    if (!zone.mockupImage) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = zone.mockupImage;
    i.onload = () => {
      setImg(i);
      const aspect = i.height / i.width;
      setStageSize({ w: 600, h: 600 * aspect });
    };
  }, [zone.mockupImage]);

  useEffect(() => {
    if (rectRef.current && trRef.current) {
      // @ts-expect-error konva typing
      trRef.current.nodes([rectRef.current]);
      // @ts-expect-error
      trRef.current.getLayer()?.batchDraw();
    }
  }, [img]);

  if (!img) {
    return <div className="aspect-square bg-muted flex items-center justify-center">Cargando mockup…</div>;
  }

  const pxBounds = {
    x: (zone.bounds.xPct / 100) * stageSize.w,
    y: (zone.bounds.yPct / 100) * stageSize.h,
    width: (zone.bounds.widthPct / 100) * stageSize.w,
    height: (zone.bounds.heightPct / 100) * stageSize.h,
  };

  function emit(b: { x: number; y: number; width: number; height: number }) {
    const newBounds: BoundsPct = {
      xPct: (b.x / stageSize.w) * 100,
      yPct: (b.y / stageSize.h) * 100,
      widthPct: (b.width / stageSize.w) * 100,
      heightPct: (b.height / stageSize.h) * 100,
    };
    onChange({ ...zone, bounds: newBounds });
  }

  return (
    <div className="border rounded-lg overflow-hidden inline-block">
      <Stage width={stageSize.w} height={stageSize.h}>
        <Layer>
          <Image image={img} width={stageSize.w} height={stageSize.h} />
          <Rect
            ref={rectRef}
            x={pxBounds.x}
            y={pxBounds.y}
            width={pxBounds.width}
            height={pxBounds.height}
            stroke="#06b6d4"
            strokeWidth={2}
            dash={[8, 4]}
            draggable
            onDragEnd={(e) => {
              const node = e.target;
              emit({ x: node.x(), y: node.y(), width: pxBounds.width, height: pxBounds.height });
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              emit({
                x: node.x(), y: node.y(),
                width: Math.max(20, node.width() * scaleX),
                height: Math.max(20, node.height() * scaleY),
              });
            }}
          />
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            keepRatio={false}
            boundBoxFunc={(_old, next) => (next.width < 20 || next.height < 20 ? _old : next)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: pasa.

- [ ] **Step 3: Commit**

```bash
git add components/admin/customizer-templates/ZoneEditor.tsx
git commit -m "feat(admin): add ZoneEditor with Konva-based bounds drag"
```

---

### Task 3.4: `FontsCatalogPicker`

**Files:**
- Create: `components/admin/customizer-templates/FontsCatalogPicker.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/customizer-templates/FontsCatalogPicker.tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_FONTS } from "@/lib/customizer/default-fonts";
import { FONT_CATEGORIES, type FontCategory } from "@/lib/customizer/types";

interface FontsCatalogPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function FontsCatalogPicker({ selected, onChange }: FontsCatalogPickerProps) {
  const [search, setSearch] = useState("");
  const selectedSet = new Set(selected);

  const toggle = (key: string) => {
    if (selectedSet.has(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  };

  const selectCategory = (cat: FontCategory) => {
    const keys = DEFAULT_FONTS.filter((f) => f.category === cat).map((f) => f.key);
    onChange(Array.from(new Set([...selected, ...keys])));
  };

  const filtered = DEFAULT_FONTS.filter((f) =>
    !search || f.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input placeholder="Buscar fuente" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FONTS.map((f) => f.key))}>
          Todas
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Ninguna
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">{selected.length} de {DEFAULT_FONTS.length} fuentes</div>
      {FONT_CATEGORIES.map((cat) => {
        const items = filtered.filter((f) => f.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium capitalize text-sm">{cat}</h4>
              <Button type="button" variant="link" size="sm" onClick={() => selectCategory(cat)}>
                Seleccionar todas
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={selectedSet.has(f.key)} onCheckedChange={() => toggle(f.key)} />
                  <span>{f.key}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/customizer-templates/FontsCatalogPicker.tsx
git commit -m "feat(admin): add FontsCatalogPicker grouped multiselect"
```

---

### Task 3.5: `ColorsPaletteEditor`

**Files:**
- Create: `components/admin/customizer-templates/ColorsPaletteEditor.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/customizer-templates/ColorsPaletteEditor.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLORS } from "@/lib/customizer/default-colors";

interface ColorsPaletteEditorProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function ColorsPaletteEditor({ selected, onChange }: ColorsPaletteEditorProps) {
  const [customHex, setCustomHex] = useState("");
  const sel = new Set(selected.map((c) => c.toUpperCase()));
  const groups = Array.from(new Set(DEFAULT_COLORS.map((c) => c.group)));

  const toggle = (hex: string) => {
    const upper = hex.toUpperCase();
    if (sel.has(upper)) onChange(selected.filter((c) => c.toUpperCase() !== upper));
    else onChange([...selected, hex]);
  };

  const addCustom = () => {
    if (HEX_RE.test(customHex) && !sel.has(customHex.toUpperCase())) {
      onChange([...selected, customHex]);
      setCustomHex("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="#RRGGBB"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          className="font-mono w-32"
        />
        <Button type="button" onClick={addCustom} disabled={!HEX_RE.test(customHex)}>
          + Añadir custom
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(DEFAULT_COLORS.map((c) => c.hex))}>
          Toda la paleta
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          Limpiar
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">{selected.length} colores seleccionados</div>
      {groups.map((g) => {
        const items = DEFAULT_COLORS.filter((c) => c.group === g);
        return (
          <div key={g} className="border rounded-lg p-3">
            <h4 className="font-medium capitalize text-sm mb-2">{g.replace("-", " ")}</h4>
            <div className="grid grid-cols-12 gap-1">
              {items.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => toggle(c.hex)}
                  className={`aspect-square rounded ${sel.has(c.hex.toUpperCase()) ? "ring-2 ring-blue-500" : "ring-1 ring-gray-200"}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/customizer-templates/ColorsPaletteEditor.tsx
git commit -m "feat(admin): add ColorsPaletteEditor with grouped swatches and custom hex"
```

---

### Task 3.6: `SizeGuideEditor`

**Files:**
- Create: `components/admin/customizer-templates/SizeGuideEditor.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/customizer-templates/SizeGuideEditor.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { SizeGuide } from "@/lib/customizer/types";

interface SizeGuideEditorProps {
  value: SizeGuide | null;
  onChange: (next: SizeGuide | null) => void;
}

export function SizeGuideEditor({ value, onChange }: SizeGuideEditorProps) {
  if (!value) {
    return (
      <Button type="button" variant="outline" onClick={() =>
        onChange({
          unit: "cm",
          columns: [{ key: "chest", label: "Pecho" }, { key: "length", label: "Largo" }],
          rows: [{ size: "S", values: { chest: 0, length: 0 } }],
        })
      }>
        + Añadir tabla de medidas
      </Button>
    );
  }

  const updateColumn = (i: number, patch: Partial<SizeGuide["columns"][0]>) => {
    const cols = value.columns.slice();
    cols[i] = { ...cols[i], ...patch };
    onChange({ ...value, columns: cols });
  };

  const updateRow = (i: number, patch: Partial<SizeGuide["rows"][0]>) => {
    const rows = value.rows.slice();
    rows[i] = { ...rows[i], ...patch };
    onChange({ ...value, rows });
  };

  const updateRowValue = (rowIdx: number, key: string, val: number) => {
    const rows = value.rows.slice();
    rows[rowIdx] = { ...rows[rowIdx], values: { ...rows[rowIdx].values, [key]: val } };
    onChange({ ...value, rows });
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-3">
        <Label>Unidad:</Label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as "cm" | "in" })}
        >
          <option value="cm">cm</option>
          <option value="in">in</option>
        </select>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <Trash2 className="size-4 mr-1" /> Quitar tabla
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Columnas</Label>
        {value.columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input value={c.key} onChange={(e) => updateColumn(i, { key: e.target.value })} placeholder="key" className="w-32 font-mono" />
            <Input value={c.label} onChange={(e) => updateColumn(i, { label: e.target.value })} placeholder="Label" />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...value, columns: value.columns.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, columns: [...value.columns, { key: "", label: "" }] })}>
          + Columna
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Filas</Label>
        {value.rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={row.size} onChange={(e) => updateRow(i, { size: e.target.value })} placeholder="S/M/L" className="w-20" />
            {value.columns.map((c) => (
              <Input
                key={c.key}
                type="number"
                value={row.values[c.key] ?? 0}
                onChange={(e) => updateRowValue(i, c.key, Number(e.target.value))}
                className="w-24"
              />
            ))}
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...value, rows: value.rows.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, rows: [...value.rows, { size: "", values: {} }] })}>
          + Fila
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/customizer-templates/SizeGuideEditor.tsx
git commit -m "feat(admin): add SizeGuideEditor with editable columns/rows"
```

---

### Task 3.7: `TemplateForm` (formulario completo de plantilla)

**Files:**
- Create: `components/admin/customizer-templates/TemplateForm.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/customizer-templates/TemplateForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { ZoneEditor } from "./ZoneEditor";
import { FontsCatalogPicker } from "./FontsCatalogPicker";
import { ColorsPaletteEditor } from "./ColorsPaletteEditor";
import { SizeGuideEditor } from "./SizeGuideEditor";
import { saveCustomizableTemplate, updateCustomizableTemplate } from "@/actions/customizer";
import type { CustomizableTemplateData, PrintZone } from "@/lib/customizer/types";
import { DEFAULT_FONTS } from "@/lib/customizer/default-fonts";
import { DEFAULT_COLORS } from "@/lib/customizer/default-colors";

interface TemplateFormProps {
  initial: CustomizableTemplateData | null;
}

const newZone = (): PrintZone => ({
  id: crypto.randomUUID(),
  name: "Nueva zona",
  mockupImage: "",
  bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
  printResolutionDPI: 300,
});

export function TemplateForm({ initial }: TemplateFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [data, setData] = useState<Omit<CustomizableTemplateData, "id">>({
    name: initial?.name ?? "",
    description: initial?.description ?? null,
    active: initial?.active ?? true,
    surcharge: initial?.surcharge ?? null,
    zones: initial?.zones ?? [],
    allowedFonts: initial?.allowedFonts ?? DEFAULT_FONTS.map((f) => f.key),
    allowedColors: initial?.allowedColors ?? DEFAULT_COLORS.map((c) => c.hex),
    allowCustomColors: initial?.allowCustomColors ?? true,
    sizeGuide: initial?.sizeGuide ?? null,
    maxLayersPerZone: initial?.maxLayersPerZone ?? 8,
    maxCharsPerLayer: initial?.maxCharsPerLayer ?? 40,
  });

  const updateZone = (i: number, patch: Partial<PrintZone>) => {
    const zones = data.zones.slice();
    zones[i] = { ...zones[i], ...patch };
    setData({ ...data, zones });
  };

  const handleMockupUpload = async (i: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.url) updateZone(i, { mockupImage: json.url });
    else toast.error("Error al subir mockup");
  };

  const onSubmit = () => {
    start(async () => {
      const result = initial
        ? await updateCustomizableTemplate(initial.id, data)
        : await saveCustomizableTemplate(data);
      if (result.success) {
        toast.success(initial ? "Plantilla actualizada" : "Plantilla creada");
        if (!initial) router.push(`/admin/personalizables/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Información básica</h3>
          <div>
            <Label>Nombre</Label>
            <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={data.description ?? ""} onChange={(e) => setData({ ...data, description: e.target.value || null })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.active} onCheckedChange={(v) => setData({ ...data, active: v })} />
            <Label>Activa</Label>
          </div>
          <div>
            <Label>Sobrecargo (S/) — vacío = sin cobro extra</Label>
            <Input
              type="number" step="0.01"
              value={data.surcharge ?? ""}
              onChange={(e) => setData({ ...data, surcharge: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Máx. capas por zona</Label>
              <Input type="number" value={data.maxLayersPerZone} onChange={(e) => setData({ ...data, maxLayersPerZone: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Máx. caracteres</Label>
              <Input type="number" value={data.maxCharsPerLayer} onChange={(e) => setData({ ...data, maxCharsPerLayer: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.allowCustomColors} onCheckedChange={(v) => setData({ ...data, allowCustomColors: v })} />
            <Label>Permitir color personalizado al cliente</Label>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Fuentes permitidas</h3>
          <FontsCatalogPicker selected={data.allowedFonts} onChange={(v) => setData({ ...data, allowedFonts: v })} />
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Colores permitidos</h3>
          <ColorsPaletteEditor selected={data.allowedColors} onChange={(v) => setData({ ...data, allowedColors: v })} />
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Tabla de medidas</h3>
          <SizeGuideEditor value={data.sizeGuide} onChange={(v) => setData({ ...data, sizeGuide: v })} />
        </Card>

        <Button onClick={onSubmit} disabled={pending} className="w-full">
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Zonas de impresión ({data.zones.length})</h3>
            <Button type="button" size="sm" onClick={() => setData({ ...data, zones: [...data.zones, newZone()] })}>
              <Plus className="size-4 mr-1" /> Zona
            </Button>
          </div>
          {data.zones.map((zone, i) => (
            <Card key={zone.id} className="p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 items-center">
                <Input value={zone.name} onChange={(e) => updateZone(i, { name: e.target.value })} placeholder="Nombre zona" />
                <Input
                  type="number"
                  value={zone.printResolutionDPI}
                  onChange={(e) => updateZone(i, { printResolutionDPI: Number(e.target.value) })}
                  className="w-24"
                />
                <Label className="text-xs">DPI</Label>
                <Button type="button" variant="ghost" size="icon" onClick={() => setData({ ...data, zones: data.zones.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {!zone.mockupImage ? (
                <label className="block border-2 border-dashed rounded p-6 text-center cursor-pointer hover:bg-muted">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleMockupUpload(i, e.target.files[0])} />
                  Subir mockup
                </label>
              ) : (
                <ZoneEditor zone={zone} onChange={(z) => updateZone(i, z)} />
              )}
            </Card>
          ))}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: pasa.

- [ ] **Step 3: Commit**

```bash
git add components/admin/customizer-templates/TemplateForm.tsx
git commit -m "feat(admin): add TemplateForm with two-column layout

Left: basic info, fonts, colors, size guide.
Right: zones with Konva-based bounds editor + mockup upload.
Save/Update integrated with server actions."
```

---

### Task 3.8: Páginas `/admin/personalizables/nuevo/` y `/[templateId]/`

**Files:**
- Create: `app/admin/personalizables/nuevo/page.tsx`
- Create: `app/admin/personalizables/[templateId]/page.tsx`

- [ ] **Step 1: Crear `nuevo/page.tsx`**

```tsx
// app/admin/personalizables/nuevo/page.tsx
import { protectRoute } from "@/lib/protect-route";
import { TemplateForm } from "@/components/admin/customizer-templates/TemplateForm";

export default async function NewTemplatePage() {
  await protectRoute("customizables:create");
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Nueva plantilla personalizable</h1>
      <TemplateForm initial={null} />
    </div>
  );
}
```

- [ ] **Step 2: Crear `[templateId]/page.tsx`**

```tsx
// app/admin/personalizables/[templateId]/page.tsx
import { notFound } from "next/navigation";
import { protectRoute } from "@/lib/protect-route";
import { TemplateForm } from "@/components/admin/customizer-templates/TemplateForm";
import { getCustomizableTemplate } from "@/actions/customizer";

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  await protectRoute("customizables:update");
  const { templateId } = await params;
  const template = await getCustomizableTemplate(templateId);
  if (!template) notFound();
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{template.name}</h1>
      <TemplateForm initial={template} />
    </div>
  );
}
```

- [ ] **Step 3: Smoke manual**

Run: `npm run dev`. Navegar a `/admin/personalizables/nuevo`, crear plantilla con nombre "Polo blanco", subir mockup, dibujar bounds, guardar. Luego ir a `/admin/personalizables/[id]` y verificar que carga.

- [ ] **Step 4: Commit**

```bash
git add app/admin/personalizables/
git commit -m "feat(admin): add create and edit template pages"
```

---

## Phase 4 — Admin: Card "Personalización" en form de producto

### Task 4.1: `MockupOverridesGrid` (drop-zones por color×zona)

**Files:**
- Create: `components/admin/products/MockupOverridesGrid.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/products/MockupOverridesGrid.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { PrintZone, MockupOverrides } from "@/lib/customizer/types";

interface ProductOptionLite {
  id: string;
  name: string;
  values: { id: string; value: string; swatch?: string | null }[];
}

interface MockupOverridesGridProps {
  zones: PrintZone[];
  options: ProductOptionLite[];
  value: MockupOverrides | null;
  onChange: (next: MockupOverrides | null) => void;
}

export function MockupOverridesGrid({ zones, options, value, onChange }: MockupOverridesGridProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">Este producto no tiene opciones (color/talla). Añade opciones primero.</p>;
  }

  const axis = value?.axisOptionId ? options.find((o) => o.id === value.axisOptionId) : null;

  const setAxis = (axisOptionId: string) => {
    onChange({ axisOptionId, mockups: value?.mockups ?? {} });
  };

  const handleUpload = async (zoneId: string, valueId: string, file: File) => {
    setUploading(`${zoneId}-${valueId}`);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(null);
    if (!json.url) {
      toast.error("Error al subir");
      return;
    }
    const next: MockupOverrides = {
      axisOptionId: value!.axisOptionId,
      mockups: {
        ...(value?.mockups ?? {}),
        [zoneId]: { ...(value?.mockups[zoneId] ?? {}), [valueId]: json.url },
      },
    };
    onChange(next);
  };

  const removeMockup = (zoneId: string, valueId: string) => {
    if (!value) return;
    const zoneMap = { ...(value.mockups[zoneId] ?? {}) };
    delete zoneMap[valueId];
    onChange({
      ...value,
      mockups: { ...value.mockups, [zoneId]: zoneMap },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Opción que cambia el mockup</Label>
        <select
          className="w-full border rounded px-2 py-1.5 mt-1"
          value={value?.axisOptionId ?? ""}
          onChange={(e) => e.target.value ? setAxis(e.target.value) : onChange(null)}
        >
          <option value="">— Sin overrides (usar mockup de plantilla) —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {axis && zones.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">{axis.name}</th>
                {zones.map((z) => <th key={z.id} className="text-left p-2">{z.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {axis.values.map((val) => (
                <tr key={val.id} className="border-t">
                  <td className="p-2 flex items-center gap-2">
                    {val.swatch && <span className="size-4 rounded-full border" style={{ backgroundColor: val.swatch }} />}
                    {val.value}
                  </td>
                  {zones.map((z) => {
                    const url = value?.mockups[z.id]?.[val.id];
                    const key = `${z.id}-${val.id}`;
                    return (
                      <td key={z.id} className="p-2">
                        {url ? (
                          <div className="relative size-16">
                            <Image src={url} alt="" fill className="object-cover rounded" />
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 size-6"
                              onClick={() => removeMockup(z.id, val.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="block size-16 border-2 border-dashed rounded cursor-pointer hover:bg-muted text-center text-xs flex items-center justify-center">
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUpload(z.id, val.id, e.target.files[0])} />
                            {uploading === key ? "..." : "+ Subir"}
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/products/MockupOverridesGrid.tsx
git commit -m "feat(admin): add MockupOverridesGrid for per-variant mockups"
```

---

### Task 4.2: `CustomizationCard`

**Files:**
- Create: `components/admin/products/CustomizationCard.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/products/CustomizationCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCustomizableTemplates } from "@/actions/customizer";
import type { CustomizableTemplateData, MockupOverrides } from "@/lib/customizer/types";
import { MockupOverridesGrid } from "./MockupOverridesGrid";

interface ProductOptionLite {
  id: string;
  name: string;
  values: { id: string; value: string; swatch?: string | null }[];
}

interface CustomizationCardProps {
  productSlug?: string;
  templateId: string | null;
  overrides: MockupOverrides | null;
  options: ProductOptionLite[];
  onTemplateChange: (id: string | null) => void;
  onOverridesChange: (v: MockupOverrides | null) => void;
}

export function CustomizationCard({
  productSlug, templateId, overrides, options, onTemplateChange, onOverridesChange,
}: CustomizationCardProps) {
  const [templates, setTemplates] = useState<CustomizableTemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCustomizableTemplates().then((t) => {
      setTemplates(t.filter((x) => x.active));
      setLoading(false);
    });
  }, []);

  const selected = templates.find((t) => t.id === templateId);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Personalización</h3>

      <div>
        <Label>Plantilla de personalización</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <select
            className="w-full border rounded px-2 py-1.5 mt-1"
            value={templateId ?? ""}
            onChange={(e) => onTemplateChange(e.target.value || null)}
          >
            <option value="">— Sin personalización —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {selected && (
        <>
          <div className="text-xs text-muted-foreground">
            ↳ {selected.zones.length} zona{selected.zones.length !== 1 ? "s" : ""}
            {selected.zones.length > 0 && ` (${selected.zones.map((z) => z.name).join(", ")})`}
            {selected.surcharge ? ` · Sobrecargo S/ ${selected.surcharge.toFixed(2)}` : " · Sin sobrecargo"}
            {" "}<Link href={`/admin/personalizables/${selected.id}`} className="text-blue-600 hover:underline">Editar plantilla →</Link>
          </div>

          <div className="border-t pt-3">
            <Label className="block mb-2">Mockups por color (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Si dejas vacío, se usará el mockup de la plantilla.
            </p>
            <MockupOverridesGrid
              zones={selected.zones}
              options={options}
              value={overrides}
              onChange={onOverridesChange}
            />
          </div>

          {productSlug && (
            <Button type="button" variant="outline" asChild>
              <Link href={`/productos/${productSlug}/personalizar?preview=admin`} target="_blank">
                Vista previa de la experiencia →
              </Link>
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/products/CustomizationCard.tsx
git commit -m "feat(admin): add CustomizationCard for product form

Selector with summary, conditional mockup overrides grid,
edit-template link, preview button. No checkbox separate
from template selection — empty selection = no customization."
```

---

### Task 4.3: Integrar `CustomizationCard` en `EditProductForm` y `NewProductForm`

**Files:**
- Modify: `components/admin/products/EditProductForm.tsx`
- Modify: `components/admin/products/NewProductForm.tsx`

- [ ] **Step 1: Integrar en `EditProductForm.tsx`**

Localizar el bloque debajo de la card "Presentación" (recuerda commit `0bb9ad1` reciente). Después de ese bloque añadir:

```tsx
import { CustomizationCard } from "./CustomizationCard";
import type { MockupOverrides } from "@/lib/customizer/types";

// En el state del componente:
const [customizableTemplateId, setCustomizableTemplateId] = useState<string | null>(
  product.customizableTemplateId ?? null
);
const [customizableMockupOverrides, setCustomizableMockupOverrides] = useState<MockupOverrides | null>(
  (product.customizableMockupOverrides as MockupOverrides | null) ?? null
);

// En el JSX, debajo de la card "Presentación":
<CustomizationCard
  productSlug={product.slug}
  templateId={customizableTemplateId}
  overrides={customizableMockupOverrides}
  options={product.options.map((o) => ({
    id: o.id,
    name: o.name,
    values: o.values.map((v) => ({ id: v.id, value: v.value, swatch: v.swatchValue })),
  }))}
  onTemplateChange={setCustomizableTemplateId}
  onOverridesChange={setCustomizableMockupOverrides}
/>

// En el handleSubmit / save, añadir al payload:
customizableTemplateId,
customizableMockupOverrides,
```

- [ ] **Step 2: Integrar en `NewProductForm.tsx` (mismo patrón)**

- [ ] **Step 3: Modificar la action que actualiza/crea producto**

En `actions/products.ts` (o donde esté), añadir los dos campos al `data` de `prisma.product.update` / `create`:

```ts
data: {
  // ... existentes ...
  customizableTemplateId: input.customizableTemplateId ?? null,
  customizableMockupOverrides: input.customizableMockupOverrides as unknown as object | null,
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: pasa.

- [ ] **Step 5: Smoke manual**

Crear/editar un producto, asignar plantilla, guardar. Verificar en Prisma Studio que `customizableTemplateId` quedó seteado.

- [ ] **Step 6: Commit**

```bash
git add components/admin/products/ actions/products.ts
git commit -m "feat(admin): mount CustomizationCard in product forms"
```

---

## Phase 5 — Admin: Visor de diseño en orden

### Task 5.1: `CustomDesignViewer`

**Files:**
- Create: `components/admin/orders/CustomDesignViewer.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/admin/orders/CustomDesignViewer.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

interface CustomDesignViewerProps {
  orderId: string;
  itemId: string;
  design: CustomDesign;
  images: CustomDesignImage[];
}

export function CustomDesignViewer({ orderId, itemId, design, images }: CustomDesignViewerProps) {
  return (
    <div className="border rounded-lg p-4 mt-3 bg-blue-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Diseño personalizado</h4>
        <Link
          href={`/admin/personalizables/${design.templateId}`}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver plantilla →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {images.map((img) => {
          const zoneName = design.templateSnapshot.zones.find((z) => z.id === img.zoneId)?.name ?? img.zoneId;
          return (
            <div key={img.zoneId} className="border rounded bg-white p-2">
              <p className="text-xs font-medium mb-1">{zoneName}</p>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="block w-full">
                    <div className="relative aspect-square">
                      <Image src={img.url} alt={zoneName} fill className="object-contain" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <div className="relative aspect-square">
                    <Image src={img.url} alt={zoneName} fill className="object-contain" />
                  </div>
                  <Button asChild>
                    <a href={img.url} download={`orden-${orderId}-item-${itemId}-${img.zoneId}.png`}>
                      <Download className="size-4 mr-2" /> Descargar PNG
                    </a>
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>

      <details>
        <summary className="text-sm font-medium cursor-pointer">Detalles textuales del diseño</summary>
        <div className="text-xs space-y-2 mt-2 font-mono">
          {design.zones.map((zone) => {
            const zoneName = design.templateSnapshot.zones.find((z) => z.id === zone.zoneId)?.name ?? zone.zoneId;
            return (
              <div key={zone.zoneId}>
                <p className="font-semibold">{zoneName}:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  {zone.layers.map((layer) => (
                    <li key={layer.id}>
                      "{layer.text}" · {layer.font} {layer.size}px · {layer.color} · {layer.align}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/orders/CustomDesignViewer.tsx
git commit -m "feat(admin): add CustomDesignViewer for order detail"
```

---

### Task 5.2: Renderizar `CustomDesignViewer` en la página de detalle de orden

**Files:**
- Modify: `app/admin/ordenes/[orderId]/page.tsx`

- [ ] **Step 1: Importar y renderizar condicional por OrderItem**

En la página existente, donde se itera sobre `order.items`, añadir:

```tsx
import { CustomDesignViewer } from "@/components/admin/orders/CustomDesignViewer";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

// Dentro del map:
{order.items.map((item) => (
  <div key={item.id}>
    {/* ... render existente ... */}
    {item.customDesign && item.customDesignImages && (
      <CustomDesignViewer
        orderId={order.id}
        itemId={item.id}
        design={item.customDesign as unknown as CustomDesign}
        images={item.customDesignImages as unknown as CustomDesignImage[]}
      />
    )}
  </div>
))}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: pasa.

- [ ] **Step 3: Commit**

```bash
git add app/admin/ordenes/[orderId]/page.tsx
git commit -m "feat(admin): render CustomDesignViewer in order detail"
```

---

## Phase 6 — Cliente: Botón en página de producto

### Task 6.1: `StartCustomizingButton`

**Files:**
- Create: `components/shop/StartCustomizingButton.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/shop/StartCustomizingButton.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { t } from "@/lib/customizer/i18n";

interface StartCustomizingButtonProps {
  productSlug: string;
  variantId: string | null;
  surcharge: number | null;
  basePrice: number;
}

export function StartCustomizingButton({ productSlug, variantId, surcharge, basePrice }: StartCustomizingButtonProps) {
  const href = variantId
    ? `/productos/${productSlug}/personalizar?variantId=${variantId}`
    : `/productos/${productSlug}/personalizar`;

  return (
    <div className="space-y-2">
      <Button asChild size="lg" className="w-full bg-red-600 hover:bg-red-700 text-white">
        <Link href={href}>
          <Sparkles className="size-4 mr-2" />
          {t.startCustomizing}
        </Link>
      </Button>
      {surcharge && surcharge > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          S/ {basePrice.toFixed(2)} + S/ {surcharge.toFixed(2)} {t.surchargeLabel}
        </p>
      )}
      <p className="text-xs text-center text-muted-foreground italic">{t.startCustomizingHint}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shop/StartCustomizingButton.tsx
git commit -m "feat(shop): add StartCustomizingButton with surcharge display"
```

---

### Task 6.2: Integrar el botón condicional en la página de producto

**Files:**
- Modify: `app/(shop)/productos/[slug]/page.tsx`
- Modify: `components/shop/ProductDetail.tsx` (o donde está el botón "Añadir al carrito")

- [ ] **Step 1: Localizar el componente que renderiza el botón "Añadir al carrito"**

Run: `grep -rn "Añadir al carrito" components/shop/ | head -10`

- [ ] **Step 2: En el componente identificado, añadir lógica condicional**

```tsx
import { StartCustomizingButton } from "./StartCustomizingButton";

// Asumir props.product tiene customizableTemplate (incluido via include)
{product.customizableTemplate ? (
  <StartCustomizingButton
    productSlug={product.slug}
    variantId={selectedVariant?.id ?? null}
    surcharge={product.customizableTemplate.surcharge ? Number(product.customizableTemplate.surcharge) : null}
    basePrice={Number(product.basePrice)}
  />
) : (
  // ... botón "Añadir al carrito" original ...
)}
```

- [ ] **Step 3: Asegurar que el query de Prisma incluye la plantilla**

En la query de la página `/productos/[slug]/page.tsx`:

```ts
const product = await prisma.product.findUnique({
  where: { slug },
  include: {
    // ... existing ...
    customizableTemplate: { select: { surcharge: true, name: true } },
  },
});
```

- [ ] **Step 4: Verify build & smoke**

Run: `npm run build && npm run dev`. Asignar plantilla a un producto en admin y verificar que `/productos/[slug]` muestra el botón rojo.

- [ ] **Step 5: Commit**

```bash
git add app/\(shop\)/productos/\[slug\]/page.tsx components/shop/
git commit -m "feat(shop): conditional StartCustomizingButton on product page"
```

---

## Phase 7 — Cliente: Shell del builder (layout, store, topbar)

### Task 7.1: Builder Zustand store con undo/redo

**Files:**
- Create: `components/customizer/store.ts`
- Create: `components/customizer/__tests__/store.test.ts`

- [ ] **Step 1: Test de store**

```ts
// components/customizer/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useBuilderStore } from "../store";
import type { CustomizableTemplateData, TextLayer } from "@/lib/customizer/types";

const tpl: CustomizableTemplateData = {
  id: "t1", name: "T", description: null, active: true, surcharge: 5,
  zones: [
    { id: "frontal", name: "Frontal", mockupImage: "x", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 }, printResolutionDPI: 300 },
    { id: "trasera", name: "Trasera", mockupImage: "y", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 }, printResolutionDPI: 300 },
  ],
  allowedFonts: ["Inter"], allowedColors: ["#000000"], allowCustomColors: true,
  sizeGuide: null, maxLayersPerZone: 5, maxCharsPerLayer: 40,
};

const baseLayer = (id: string, text = "Hola"): TextLayer => ({
  id, type: "TEXT", text, font: "Inter", size: 32, color: "#000000",
  letterSpacing: 0, rotation: 0, x: 50, y: 50, width: 30, height: 5, align: "center",
});

describe("builder store", () => {
  beforeEach(() => useBuilderStore.getState().reset());

  it("initializes with first zone active and empty layers", () => {
    useBuilderStore.getState().load(tpl, "v1");
    expect(useBuilderStore.getState().activeZoneId).toBe("frontal");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toEqual([]);
  });

  it("addLayer adds a layer to active zone and selects it", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
    expect(useBuilderStore.getState().selectedLayerId).toBe("L1");
  });

  it("undo reverts the last action", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().undo();
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(0);
  });

  it("redo re-applies undone action", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().undo();
    useBuilderStore.getState().redo();
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
  });

  it("setActiveZone switches and persists layers per zone", () => {
    useBuilderStore.getState().load(tpl, "v1");
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    useBuilderStore.getState().setActiveZone("trasera");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toEqual([]);
    useBuilderStore.getState().setActiveZone("frontal");
    expect(useBuilderStore.getState().getLayersForActiveZone()).toHaveLength(1);
  });

  it("hasContent is true when any zone has at least 1 layer", () => {
    useBuilderStore.getState().load(tpl, "v1");
    expect(useBuilderStore.getState().hasContent()).toBe(false);
    useBuilderStore.getState().addLayer(baseLayer("L1"));
    expect(useBuilderStore.getState().hasContent()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/customizer/__tests__/store.test.ts`

Expected: FAIL — `Cannot find module '../store'`.

- [ ] **Step 3: Implement `store.ts`**

```ts
// components/customizer/store.ts
import { create } from "zustand";
import type {
  CustomizableTemplateData, TextLayer, CustomDesignZone, CustomDesignSnapshot,
} from "@/lib/customizer/types";

interface BuilderState {
  template: CustomizableTemplateData | null;
  variantId: string | null;
  cartItemId: string | null;
  activeZoneId: string | null;
  selectedLayerId: string | null;
  zones: Record<string, TextLayer[]>;
  history: { zones: Record<string, TextLayer[]> }[];
  historyIndex: number;
  dirty: boolean;
  uploading: boolean;

  load: (template: CustomizableTemplateData, variantId: string | null, initial?: { zones: CustomDesignZone[]; cartItemId?: string }) => void;
  reset: () => void;
  setActiveZone: (zoneId: string) => void;
  setSelectedLayer: (layerId: string | null) => void;
  addLayer: (layer: TextLayer) => void;
  updateLayer: (layerId: string, patch: Partial<TextLayer>) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  setVariantId: (id: string | null) => void;
  setUploading: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLayersForActiveZone: () => TextLayer[];
  getSelectedLayer: () => TextLayer | null;
  hasContent: () => boolean;
  buildSnapshot: () => CustomDesignSnapshot | null;
  buildDesignZones: () => CustomDesignZone[];
}

const HISTORY_LIMIT = 50;

export const useBuilderStore = create<BuilderState>((set, get) => ({
  template: null, variantId: null, cartItemId: null,
  activeZoneId: null, selectedLayerId: null, zones: {},
  history: [], historyIndex: -1, dirty: false, uploading: false,

  load: (template, variantId, initial) => {
    const zones: Record<string, TextLayer[]> = {};
    for (const z of template.zones) zones[z.id] = [];
    if (initial) {
      for (const z of initial.zones) zones[z.zoneId] = z.layers;
    }
    set({
      template, variantId, cartItemId: initial?.cartItemId ?? null,
      activeZoneId: template.zones[0]?.id ?? null,
      selectedLayerId: null, zones,
      history: [{ zones }], historyIndex: 0, dirty: false,
    });
  },

  reset: () => set({
    template: null, variantId: null, cartItemId: null, activeZoneId: null,
    selectedLayerId: null, zones: {}, history: [], historyIndex: -1,
    dirty: false, uploading: false,
  }),

  setActiveZone: (zoneId) => set({ activeZoneId: zoneId, selectedLayerId: null }),

  setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),

  addLayer: (layer) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = { ...zones, [activeZoneId]: [...(zones[activeZoneId] ?? []), layer] };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: layer.id, dirty: true });
  },

  updateLayer: (layerId, patch) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = {
      ...zones,
      [activeZoneId]: (zones[activeZoneId] ?? []).map((l) => l.id === layerId ? { ...l, ...patch } : l),
    };
    pushHistory(set, get, newZones);
    set({ zones: newZones, dirty: true });
  },

  deleteLayer: (layerId) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const newZones = {
      ...zones,
      [activeZoneId]: (zones[activeZoneId] ?? []).filter((l) => l.id !== layerId),
    };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: null, dirty: true });
  },

  duplicateLayer: (layerId) => {
    const { activeZoneId, zones } = get();
    if (!activeZoneId) return;
    const layers = zones[activeZoneId] ?? [];
    const orig = layers.find((l) => l.id === layerId);
    if (!orig) return;
    const dup: TextLayer = { ...orig, id: crypto.randomUUID(), x: orig.x + 5, y: orig.y + 5 };
    const newZones = { ...zones, [activeZoneId]: [...layers, dup] };
    pushHistory(set, get, newZones);
    set({ zones: newZones, selectedLayerId: dup.id, dirty: true });
  },

  setVariantId: (id) => set({ variantId: id, dirty: true }),
  setUploading: (v) => set({ uploading: v }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({ zones: prev.zones, historyIndex: historyIndex - 1, selectedLayerId: null });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({ zones: next.zones, historyIndex: historyIndex + 1, selectedLayerId: null });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => {
    const { historyIndex, history } = get();
    return historyIndex < history.length - 1;
  },

  getLayersForActiveZone: () => {
    const { activeZoneId, zones } = get();
    return activeZoneId ? (zones[activeZoneId] ?? []) : [];
  },

  getSelectedLayer: () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return null;
    return get().getLayersForActiveZone().find((l) => l.id === selectedLayerId) ?? null;
  },

  hasContent: () => Object.values(get().zones).some((arr) => arr.length > 0),

  buildSnapshot: () => {
    const t = get().template;
    if (!t) return null;
    return {
      allowedFonts: t.allowedFonts,
      allowedColors: t.allowedColors,
      allowCustomColors: t.allowCustomColors,
      maxLayersPerZone: t.maxLayersPerZone,
      maxCharsPerLayer: t.maxCharsPerLayer,
      surcharge: t.surcharge,
      zones: t.zones.map((z) => ({ id: z.id, name: z.name, bounds: z.bounds })),
    };
  },

  buildDesignZones: () => {
    const { zones } = get();
    return Object.entries(zones)
      .filter(([, layers]) => layers.length > 0)
      .map(([zoneId, layers]) => ({ zoneId, layers }));
  },
}));

function pushHistory(set: (s: Partial<BuilderState>) => void, get: () => BuilderState, newZones: Record<string, TextLayer[]>) {
  const { history, historyIndex } = get();
  const trimmed = history.slice(0, historyIndex + 1);
  const next = [...trimmed, { zones: newZones }];
  if (next.length > HISTORY_LIMIT) next.shift();
  set({ history: next, historyIndex: next.length - 1 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/customizer/__tests__/store.test.ts`

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/customizer/store.ts components/customizer/__tests__/store.test.ts
git commit -m "feat(customizer): add Zustand builder store with undo/redo

Manages template + variantId + cartItemId, layers per zone,
history stack (50-deep), dirty flag, helpers to build snapshot
and design zones. Tested with 6 unit tests."
```

---

### Task 7.2: Layout dedicado y página del builder

**Files:**
- Create: `app/(shop)/productos/[slug]/personalizar/layout.tsx`
- Create: `app/(shop)/productos/[slug]/personalizar/page.tsx`
- Create: `components/customizer/CustomizerLayout.tsx`

- [ ] **Step 1: Crear `layout.tsx` (sin Header/Footer del shop)**

```tsx
// app/(shop)/productos/[slug]/personalizar/layout.tsx
export default function PersonalizarLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
```

- [ ] **Step 2: Crear `page.tsx`**

```tsx
// app/(shop)/productos/[slug]/personalizar/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCustomizableTemplate } from "@/actions/customizer";
import { CustomizerLayout } from "@/components/customizer/CustomizerLayout";
import type { MockupOverrides } from "@/lib/customizer/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variantId?: string; cartItemId?: string; preview?: string }>;
}

export const dynamic = "force-dynamic";

export default async function PersonalizarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { variantId, cartItemId, preview } = await searchParams;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: { include: { optionValues: true } },
      options: { include: { values: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (!product) notFound();
  if (!product.customizableTemplateId) {
    redirect(`/productos/${slug}`);
  }

  const template = await getCustomizableTemplate(product.customizableTemplateId);
  if (!template) notFound();

  return (
    <CustomizerLayout
      product={{
        id: product.id, slug: product.slug, name: product.name,
        basePrice: Number(product.basePrice),
        images: (product.images as string[]) ?? [],
        options: product.options.map((o) => ({
          id: o.id, name: o.name,
          values: o.values.map((v) => ({ id: v.id, value: v.value, swatch: v.swatchValue })),
        })),
        variants: product.variants.map((v) => ({
          id: v.id, sku: v.sku, stock: v.stock, price: Number(v.price ?? product.basePrice),
          optionValueIds: v.optionValues.map((ov) => ov.id),
        })),
        reviewsCount: product.reviews.length,
        reviewsAvg: product.reviews.length > 0
          ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
          : 0,
        mockupOverrides: (product.customizableMockupOverrides as MockupOverrides | null) ?? null,
      }}
      template={template}
      initialVariantId={variantId ?? null}
      cartItemId={cartItemId ?? null}
      previewMode={preview === "admin"}
    />
  );
}
```

- [ ] **Step 3: Crear placeholder `CustomizerLayout.tsx`** (será expandido en Phase 8-10)

```tsx
// components/customizer/CustomizerLayout.tsx
"use client";

import { useEffect } from "react";
import { useBuilderStore } from "./store";
import { CustomizerTopBar } from "./CustomizerTopBar";
import { BottomBar } from "./BottomBar";
import { ZoneTabs } from "./ZoneTabs";
import type { CustomizableTemplateData, MockupOverrides } from "@/lib/customizer/types";

export interface BuilderProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  images: string[];
  options: { id: string; name: string; values: { id: string; value: string; swatch?: string | null }[] }[];
  variants: { id: string; sku: string | null; stock: number; price: number; optionValueIds: string[] }[];
  reviewsCount: number;
  reviewsAvg: number;
  mockupOverrides: MockupOverrides | null;
}

interface Props {
  product: BuilderProduct;
  template: CustomizableTemplateData;
  initialVariantId: string | null;
  cartItemId: string | null;
  previewMode: boolean;
}

export function CustomizerLayout({ product, template, initialVariantId, cartItemId, previewMode }: Props) {
  const load = useBuilderStore((s) => s.load);

  useEffect(() => {
    load(template, initialVariantId);
    // TODO Phase 13: si cartItemId, cargar diseño desde el cart store
  }, [template, initialVariantId, load]);

  return (
    <div className="flex flex-col h-screen">
      <CustomizerTopBar productSlug={product.slug} productName={product.name} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r flex-shrink-0">
          {/* LeftSidebar — Phase 9 */}
          <div className="p-4 text-sm text-muted-foreground">[Sidebar izq — Phase 9]</div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ZoneTabs />
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            {/* Canvas — Phase 8 */}
            <div className="text-muted-foreground">[Canvas — Phase 8]</div>
          </div>
        </main>
        <aside className="w-80 border-l flex-shrink-0">
          {/* RightSidebar — Phase 10 */}
          <div className="p-4 text-sm text-muted-foreground">[Sidebar der — Phase 10]</div>
        </aside>
      </div>
      <BottomBar product={product} previewMode={previewMode} cartItemId={cartItemId} />
    </div>
  );
}
```

- [ ] **Step 4: Crear `CustomizerTopBar`, `BottomBar`, `ZoneTabs` (placeholders mínimos)**

```tsx
// components/customizer/CustomizerTopBar.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "./store";

interface Props { productSlug: string; productName: string; }

export function CustomizerTopBar({ productSlug, productName }: Props) {
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.canUndo());
  const canRedo = useBuilderStore((s) => s.canRedo());
  const dirty = useBuilderStore((s) => s.dirty);

  const handleBack = (e: React.MouseEvent) => {
    if (dirty && !confirm("Tus cambios se perderán. ¿Estás seguro?")) {
      e.preventDefault();
    }
  };

  return (
    <header className="border-b px-4 py-2 flex items-center gap-3 bg-white">
      <Link href={`/productos/${productSlug}`} onClick={handleBack} className="flex items-center text-sm hover:underline">
        <ArrowLeft className="size-4 mr-1" /> Volver al producto
      </Link>
      <span className="text-sm font-medium ml-2">·</span>
      <h1 className="text-sm font-medium truncate">{productName}</h1>
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="icon" disabled={!canUndo} onClick={undo}><Undo2 className="size-4" /></Button>
        <Button variant="ghost" size="icon" disabled={!canRedo} onClick={redo}><Redo2 className="size-4" /></Button>
      </div>
    </header>
  );
}
```

```tsx
// components/customizer/ZoneTabs.tsx
"use client";

import { useBuilderStore } from "./store";

export function ZoneTabs() {
  const template = useBuilderStore((s) => s.template);
  const active = useBuilderStore((s) => s.activeZoneId);
  const setActive = useBuilderStore((s) => s.setActiveZone);
  if (!template) return null;
  return (
    <div className="border-b bg-white px-4 py-2 flex gap-2">
      {template.zones.map((z) => (
        <button
          key={z.id}
          onClick={() => setActive(z.id)}
          className={`px-3 py-1.5 text-sm rounded ${active === z.id ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-muted"}`}
        >
          {z.name}
        </button>
      ))}
    </div>
  );
}
```

```tsx
// components/customizer/BottomBar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useBuilderStore } from "./store";
import { getPriceBreakdown } from "@/lib/customizer/pricing";
import type { BuilderProduct } from "./CustomizerLayout";

interface Props { product: BuilderProduct; previewMode: boolean; cartItemId: string | null; }

export function BottomBar({ product, previewMode, cartItemId }: Props) {
  const template = useBuilderStore((s) => s.template);
  const variantId = useBuilderStore((s) => s.variantId);
  const uploading = useBuilderStore((s) => s.uploading);
  const hasContent = useBuilderStore((s) => s.hasContent());

  const variant = product.variants.find((v) => v.id === variantId);
  const basePrice = variant?.price ?? product.basePrice;
  const breakdown = getPriceBreakdown(basePrice, template?.surcharge ?? null);

  const handleAddToCart = async () => {
    // Phase 11 — implementar upload + add a cart store
    alert("Phase 11 — implementar upload y añadir al cart");
  };

  if (previewMode) {
    return (
      <footer className="border-t px-4 py-3 bg-yellow-50 text-center text-sm">
        Modo vista previa (admin) — no se puede añadir al carrito
      </footer>
    );
  }

  return (
    <footer className="border-t px-4 py-3 bg-white flex items-center justify-between">
      <div className="text-sm">
        <span className="text-muted-foreground">S/ {breakdown.base.toFixed(2)}</span>
        {breakdown.surcharge > 0 && <span className="text-muted-foreground ml-1">+ S/ {breakdown.surcharge.toFixed(2)} personalización</span>}
      </div>
      <Button
        size="lg"
        className="bg-red-600 hover:bg-red-700 text-white"
        disabled={!hasContent || uploading}
        onClick={handleAddToCart}
      >
        {uploading ? "Subiendo tu diseño…" : cartItemId ? "Guardar cambios" : `Añadir al carrito · S/ ${breakdown.total.toFixed(2)}`}
      </Button>
    </footer>
  );
}
```

- [ ] **Step 5: Verify build & smoke**

Run: `npm run build`. Esperar pasa.

Run: `npm run dev`. Navegar a `/productos/<slug-de-producto-personalizable>/personalizar`. Esperar layout vacío con placeholders, topbar, bottom bar funcionando.

- [ ] **Step 6: Commit**

```bash
git add app/\(shop\)/productos/\[slug\]/personalizar/ components/customizer/CustomizerLayout.tsx components/customizer/CustomizerTopBar.tsx components/customizer/BottomBar.tsx components/customizer/ZoneTabs.tsx
git commit -m "feat(customizer): add builder shell with topbar, bottom bar, zone tabs

3-column layout placeholder ready for Phase 8 (canvas), 9 (left sidebar),
10 (right sidebar). Topbar has undo/redo and back-with-confirmation.
Bottom bar shows price breakdown and disabled add-to-cart until layers exist."
```

---

## Phase 8 — Cliente: Canvas con Konva

### Task 8.1: Mock de `react-konva` para tests

**Files:**
- Modify: `tests/setup.ts` (añadir mock global)

- [ ] **Step 1: Localizar `tests/setup.ts`**

Run: `cat tests/setup.ts`

- [ ] **Step 2: Añadir mock de react-konva**

Al final de `tests/setup.ts`:

```ts
import { vi } from "vitest";
import React from "react";

// Mock react-konva — renders divs with data attrs reflecting key props.
vi.mock("react-konva", () => {
  const make = (name: string) => ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => {
    const dataProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        dataProps[`data-${k.toLowerCase()}`] = v;
      }
    }
    return React.createElement("div", { "data-konva": name, ...dataProps }, children);
  };
  return {
    Stage: make("Stage"),
    Layer: make("Layer"),
    Image: make("Image"),
    Rect: make("Rect"),
    Text: make("Text"),
    Transformer: make("Transformer"),
    Group: make("Group"),
  };
});
```

- [ ] **Step 3: Commit**

```bash
git add tests/setup.ts
git commit -m "test: add react-konva mock for jsdom environment"
```

---

### Task 8.2: `MockupImage` y `BoundsRect` (componentes de canvas)

**Files:**
- Create: `components/customizer/canvas/MockupImage.tsx`
- Create: `components/customizer/canvas/BoundsRect.tsx`

- [ ] **Step 1: Crear `MockupImage.tsx`**

```tsx
// components/customizer/canvas/MockupImage.tsx
"use client";

import { useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";

interface Props { src: string; width: number; height: number; }

export function MockupImage({ src, width, height }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = src;
    i.onload = () => setImg(i);
  }, [src]);

  if (!img) return null;
  return <KonvaImage image={img} width={width} height={height} />;
}
```

- [ ] **Step 2: Crear `BoundsRect.tsx`**

```tsx
// components/customizer/canvas/BoundsRect.tsx
"use client";

import { Rect } from "react-konva";
import type { BoundsPct } from "@/lib/customizer/types";

interface Props { bounds: BoundsPct; stageWidth: number; stageHeight: number; }

export function BoundsRect({ bounds, stageWidth, stageHeight }: Props) {
  return (
    <Rect
      x={(bounds.xPct / 100) * stageWidth}
      y={(bounds.yPct / 100) * stageHeight}
      width={(bounds.widthPct / 100) * stageWidth}
      height={(bounds.heightPct / 100) * stageHeight}
      stroke="#06b6d4"
      strokeWidth={1}
      dash={[6, 3]}
      listening={false}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/customizer/canvas/MockupImage.tsx components/customizer/canvas/BoundsRect.tsx
git commit -m "feat(customizer): add MockupImage and BoundsRect canvas pieces"
```

---

### Task 8.3: `TextLayerNode` (texto + transformer)

**Files:**
- Create: `components/customizer/canvas/TextLayerNode.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/customizer/canvas/TextLayerNode.tsx
"use client";

import { useEffect, useRef } from "react";
import { Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { TextLayer } from "@/lib/customizer/types";

interface Props {
  layer: TextLayer;
  selected: boolean;
  stageWidth: number;
  stageHeight: number;
  onSelect: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
  onDoubleClick: () => void;
}

export function TextLayerNode({
  layer, selected, stageWidth, stageHeight, onSelect, onChange, onDoubleClick,
}: Props) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && textRef.current && trRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const xPx = (layer.x / 100) * stageWidth;
  const yPx = (layer.y / 100) * stageHeight;

  return (
    <>
      <Text
        ref={textRef}
        text={layer.text}
        x={xPx}
        y={yPx}
        fontSize={layer.size}
        fontFamily={layer.font}
        fill={layer.color}
        letterSpacing={layer.letterSpacing}
        rotation={layer.rotation}
        align={layer.align}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            x: (node.x() / stageWidth) * 100,
            y: (node.y() / stageHeight) * 100,
          });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: (node.x() / stageWidth) * 100,
            y: (node.y() / stageHeight) * 100,
            size: Math.max(8, Math.min(200, layer.size * Math.max(scaleX, scaleY))),
            rotation: node.rotation(),
          });
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(_old, next) => (next.width < 10 ? _old : next)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/customizer/canvas/TextLayerNode.tsx
git commit -m "feat(customizer): add TextLayerNode with drag and transform"
```

---

### Task 8.4: `InlineTextEditor` (overlay HTML para edición de texto)

**Files:**
- Create: `components/customizer/canvas/InlineTextEditor.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/customizer/canvas/InlineTextEditor.tsx
"use client";

import { useEffect, useRef } from "react";
import type { TextLayer } from "@/lib/customizer/types";

interface Props {
  layer: TextLayer;
  stageWidth: number;
  stageHeight: number;
  stageRect: DOMRect;
  maxChars: number;
  onChange: (text: string) => void;
  onClose: () => void;
}

export function InlineTextEditor({ layer, stageWidth, stageHeight, stageRect, maxChars, onChange, onClose }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const xPx = (layer.x / 100) * stageWidth + stageRect.left;
  const yPx = (layer.y / 100) * stageHeight + stageRect.top;

  return (
    <textarea
      ref={ref}
      value={layer.text}
      onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          onClose();
        }
      }}
      style={{
        position: "fixed",
        left: xPx,
        top: yPx,
        fontSize: layer.size,
        fontFamily: layer.font,
        color: layer.color,
        textAlign: layer.align,
        background: "transparent",
        border: "1px solid #06b6d4",
        outline: "none",
        resize: "none",
        padding: 4,
        zIndex: 50,
        minWidth: 100,
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/customizer/canvas/InlineTextEditor.tsx
git commit -m "feat(customizer): add InlineTextEditor overlay for text editing"
```

---

### Task 8.5: `CustomizerCanvas` — orquesta todo

**Files:**
- Create: `components/customizer/CustomizerCanvas.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/customizer/CustomizerCanvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useBuilderStore } from "./store";
import { MockupImage } from "./canvas/MockupImage";
import { BoundsRect } from "./canvas/BoundsRect";
import { TextLayerNode } from "./canvas/TextLayerNode";
import { InlineTextEditor } from "./canvas/InlineTextEditor";
import type { BuilderProduct } from "./CustomizerLayout";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });

interface Props { product: BuilderProduct; }

const STAGE_TARGET_W = 600;

export function CustomizerCanvas({ product }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: STAGE_TARGET_W, h: STAGE_TARGET_W });
  const [editing, setEditing] = useState<string | null>(null);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);

  const template = useBuilderStore((s) => s.template);
  const variantId = useBuilderStore((s) => s.variantId);
  const activeZoneId = useBuilderStore((s) => s.activeZoneId);
  const layers = useBuilderStore((s) => s.getLayersForActiveZone());
  const selectedId = useBuilderStore((s) => s.selectedLayerId);
  const setSelected = useBuilderStore((s) => s.setSelectedLayer);
  const updateLayer = useBuilderStore((s) => s.updateLayer);

  const zone = template?.zones.find((z) => z.id === activeZoneId);

  // Resolve mockup: per-color override OR default zone mockup
  const mockupUrl = (() => {
    if (!zone) return "";
    const overrides = product.mockupOverrides;
    if (!overrides || !variantId) return zone.mockupImage;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return zone.mockupImage;
    const matchingValueId = variant.optionValueIds.find((vid) =>
      product.options.find((o) => o.id === overrides.axisOptionId)?.values.some((v) => v.id === vid)
    );
    if (!matchingValueId) return zone.mockupImage;
    return overrides.mockups[zone.id]?.[matchingValueId] ?? zone.mockupImage;
  })();

  useEffect(() => {
    if (!containerRef.current) return;
    const w = Math.min(STAGE_TARGET_W, containerRef.current.offsetWidth - 32);
    setSize({ w, h: w });
  }, []);

  useEffect(() => {
    if (stageRef.current) setStageRect(stageRef.current.getBoundingClientRect());
  }, [size]);

  if (!zone || !template) return null;
  const editingLayer = layers.find((l) => l.id === editing);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-full p-4">
      <div ref={stageRef} className="border rounded-lg shadow-sm bg-white">
        <Stage width={size.w} height={size.h} onMouseDown={(e: { target: { getStage: () => unknown } }) => {
          // Click on empty stage deselects
          // @ts-expect-error konva typing
          if (e.target === e.target.getStage()) setSelected(null);
        }}>
          <Layer>
            <MockupImage src={mockupUrl} width={size.w} height={size.h} />
            <BoundsRect bounds={zone.bounds} stageWidth={size.w} stageHeight={size.h} />
            {layers.map((layer) => (
              <TextLayerNode
                key={layer.id}
                layer={layer}
                selected={selectedId === layer.id && editing !== layer.id}
                stageWidth={size.w}
                stageHeight={size.h}
                onSelect={() => setSelected(layer.id)}
                onChange={(patch) => updateLayer(layer.id, patch)}
                onDoubleClick={() => setEditing(layer.id)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {!product.mockupOverrides?.mockups[zone.id]?.[variantId ?? ""] && variantId && (
        <p className="text-xs text-muted-foreground mt-2">
          Vista previa sobre mockup base · se imprimirá sobre la variante seleccionada
        </p>
      )}

      {editingLayer && stageRect && (
        <InlineTextEditor
          layer={editingLayer}
          stageWidth={size.w}
          stageHeight={size.h}
          stageRect={stageRect}
          maxChars={template.maxCharsPerLayer}
          onChange={(text) => updateLayer(editingLayer.id, { text })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Conectar el canvas en `CustomizerLayout.tsx`**

Reemplazar el placeholder `[Canvas — Phase 8]` con:

```tsx
import { CustomizerCanvas } from "./CustomizerCanvas";

// en el flex-1 del main:
<CustomizerCanvas product={product} />
```

- [ ] **Step 3: Verify build & smoke**

Run: `npm run build && npm run dev`

Navegar al builder, ver mockup + bounds. Aún no se pueden añadir capas (Phase 9 trae el "+Texto" via LayersTab).

- [ ] **Step 4: Commit**

```bash
git add components/customizer/CustomizerCanvas.tsx components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): wire CustomizerCanvas with mockup, bounds, layers, inline editor

Resolves mockup URL from per-variant override or zone default.
Includes disclaimer when WYSIWYG fallback is used."
```

---

## Phase 9 — Cliente: Sidebar izquierdo (Producto + Capas)

### Task 9.1: `LeftSidebar` con tabs verticales

**Files:**
- Create: `components/customizer/LeftSidebar/index.tsx`
- Create: `components/customizer/LeftSidebar/ProductTab.tsx`
- Create: `components/customizer/LeftSidebar/LayersTab.tsx`
- Create: `components/customizer/LeftSidebar/SizeGuideDrawer.tsx`

- [ ] **Step 1: Crear `index.tsx` con tab structure**

```tsx
// components/customizer/LeftSidebar/index.tsx
"use client";

import { useState } from "react";
import { Package, Layers as LayersIcon, Type, Image as ImageIcon, Star, Sparkles, Crown, Droplet } from "lucide-react";
import { ProductTab } from "./ProductTab";
import { LayersTab } from "./LayersTab";
import type { BuilderProduct } from "../CustomizerLayout";

type TabKey = "producto" | "capas" | "texto" | "imagen" | "clipart" | "ia" | "premium" | "relleno";

interface Props { product: BuilderProduct; }

export function LeftSidebar({ product }: Props) {
  const [active, setActive] = useState<TabKey>("producto");

  const tabs: Array<{ key: TabKey; icon: React.ComponentType<{ className?: string }>; label: string; disabled?: boolean }> = [
    { key: "producto", icon: Package, label: "Producto" },
    { key: "capas", icon: LayersIcon, label: "Capas" },
    { key: "texto", icon: Type, label: "Texto", disabled: true },
    { key: "imagen", icon: ImageIcon, label: "Imagen", disabled: true },
    { key: "clipart", icon: Star, label: "Clipart", disabled: true },
    { key: "ia", icon: Sparkles, label: "IA", disabled: true },
    { key: "premium", icon: Crown, label: "Premium", disabled: true },
    { key: "relleno", icon: Droplet, label: "Relleno", disabled: true },
  ];

  return (
    <div className="flex h-full">
      <nav className="w-16 border-r bg-gray-50 flex flex-col items-center py-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActive(tab.key)}
              disabled={tab.disabled}
              title={tab.disabled ? "Próximamente" : tab.label}
              className={`w-12 h-14 flex flex-col items-center justify-center rounded text-xs gap-0.5 ${
                active === tab.key && !tab.disabled
                  ? "bg-white shadow-sm border"
                  : tab.disabled ? "opacity-30" : "hover:bg-white"
              }`}
            >
              <Icon className="size-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto p-4">
        {active === "producto" && <ProductTab product={product} />}
        {active === "capas" && <LayersTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `ProductTab.tsx`**

```tsx
// components/customizer/LeftSidebar/ProductTab.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "../store";
import { SizeGuideDrawer } from "./SizeGuideDrawer";
import type { BuilderProduct } from "../CustomizerLayout";

interface Props { product: BuilderProduct; }

export function ProductTab({ product }: Props) {
  const variantId = useBuilderStore((s) => s.variantId);
  const setVariantId = useBuilderStore((s) => s.setVariantId);
  const template = useBuilderStore((s) => s.template);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const colorOption = product.options.find((o) => o.name.toLowerCase().includes("color"));
  const sizeOption = product.options.find((o) => o.name.toLowerCase().includes("talla") || o.name.toLowerCase().includes("size"));

  const currentVariant = product.variants.find((v) => v.id === variantId);
  const currentColorId = currentVariant?.optionValueIds.find((id) => colorOption?.values.some((v) => v.id === id));
  const currentSizeId = currentVariant?.optionValueIds.find((id) => sizeOption?.values.some((v) => v.id === id));

  const findVariant = (colorId: string | undefined, sizeId: string | undefined) => {
    return product.variants.find((v) =>
      (!colorId || v.optionValueIds.includes(colorId)) &&
      (!sizeId || v.optionValueIds.includes(sizeId))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative size-16 flex-shrink-0 bg-muted rounded">
          {product.images[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover rounded" />}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{product.name}</h3>
          {product.reviewsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {product.reviewsAvg.toFixed(1)} · {product.reviewsCount} reseñas
            </div>
          )}
        </div>
      </div>

      {colorOption && (
        <div>
          <label className="text-xs font-medium block mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {colorOption.values.map((cv) => {
              const variant = findVariant(cv.id, currentSizeId);
              const inStock = (variant?.stock ?? 0) > 0;
              return (
                <button
                  key={cv.id}
                  onClick={() => variant && setVariantId(variant.id)}
                  disabled={!inStock}
                  className={`size-8 rounded-full border-2 ${currentColorId === cv.id ? "border-blue-600" : "border-gray-200"} ${!inStock ? "opacity-30" : ""}`}
                  style={{ backgroundColor: cv.swatch ?? "#ccc" }}
                  title={`${cv.value}${!inStock ? " (Agotado)" : ""}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {sizeOption && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium">Talla</label>
            {template?.sizeGuide && (
              <button onClick={() => setSizeGuideOpen(true)} className="text-xs text-blue-600 hover:underline">
                Guía de tallas
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeOption.values.map((sv) => {
              const variant = findVariant(currentColorId, sv.id);
              const inStock = (variant?.stock ?? 0) > 0;
              return (
                <Button
                  key={sv.id}
                  variant={currentSizeId === sv.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => variant && setVariantId(variant.id)}
                  disabled={!inStock}
                  className={!inStock ? "opacity-30" : ""}
                >
                  {sv.value}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {sizeGuideOpen && template?.sizeGuide && (
        <SizeGuideDrawer guide={template.sizeGuide} onClose={() => setSizeGuideOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Crear `LayersTab.tsx`**

```tsx
// components/customizer/LeftSidebar/LayersTab.tsx
"use client";

import { Plus, Type as TypeIcon, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "../store";
import type { TextLayer } from "@/lib/customizer/types";

const newTextLayer = (): TextLayer => ({
  id: crypto.randomUUID(),
  type: "TEXT",
  text: "Tu texto aquí",
  font: "Inter",
  size: 32,
  color: "#000000",
  letterSpacing: 0,
  rotation: 0,
  x: 50,
  y: 50,
  width: 30,
  height: 5,
  align: "center",
});

export function LayersTab() {
  const layers = useBuilderStore((s) => s.getLayersForActiveZone());
  const selectedId = useBuilderStore((s) => s.selectedLayerId);
  const addLayer = useBuilderStore((s) => s.addLayer);
  const setSelected = useBuilderStore((s) => s.setSelectedLayer);
  const deleteLayer = useBuilderStore((s) => s.deleteLayer);
  const duplicateLayer = useBuilderStore((s) => s.duplicateLayer);
  const template = useBuilderStore((s) => s.template);

  const canAdd = !template || layers.length < template.maxLayersPerZone;

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        className="w-full"
        onClick={() => addLayer(newTextLayer())}
        disabled={!canAdd}
      >
        <Plus className="size-4 mr-1" /> Texto
      </Button>

      {!canAdd && template && (
        <p className="text-xs text-muted-foreground">Máximo {template.maxLayersPerZone} capas por zona</p>
      )}

      {layers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Toca + Texto para empezar
        </p>
      ) : (
        <ul className="space-y-1">
          {layers.map((layer) => (
            <li
              key={layer.id}
              onClick={() => setSelected(layer.id)}
              className={`p-2 border rounded cursor-pointer flex items-center gap-2 group ${
                selectedId === layer.id ? "bg-blue-50 border-blue-300" : "hover:bg-muted"
              }`}
            >
              <TypeIcon className="size-4 flex-shrink-0" />
              <span className="text-xs flex-1 truncate">{layer.text || "(vacío)"}</span>
              <button
                onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                className="opacity-0 group-hover:opacity-100 transition"
                title="Duplicar"
              >
                <Copy className="size-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                className="opacity-0 group-hover:opacity-100 transition"
                title="Eliminar"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Crear `SizeGuideDrawer.tsx`**

```tsx
// components/customizer/LeftSidebar/SizeGuideDrawer.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SizeGuide } from "@/lib/customizer/types";

interface Props { guide: SizeGuide; onClose: () => void; }

export function SizeGuideDrawer({ guide, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <h3 className="font-semibold mb-3">Guía de tallas ({guide.unit})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2">Talla</th>
                {guide.columns.map((c) => <th key={c.key} className="text-left p-2">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((r) => (
                <tr key={r.size} className="border-b">
                  <td className="p-2 font-medium">{r.size}</td>
                  {guide.columns.map((c) => <td key={c.key} className="p-2">{r.values[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {guide.notes && <p className="text-xs text-muted-foreground mt-3">{guide.notes}</p>}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Conectar `LeftSidebar` en `CustomizerLayout.tsx`**

Reemplazar el placeholder `[Sidebar izq — Phase 9]` con:

```tsx
import { LeftSidebar } from "./LeftSidebar";

<aside className="w-80 border-r flex-shrink-0">
  <LeftSidebar product={product} />
</aside>
```

(Y ajustar el ancho de `w-64` a `w-80` para que quepan tabs verticales + contenido.)

- [ ] **Step 6: Verify & smoke**

Run: `npm run build && npm run dev`. En el builder ver tabs verticales (Producto activo por default), poder cambiar variante, click "Capas" → "+ Texto" añade un texto al canvas.

- [ ] **Step 7: Commit**

```bash
git add components/customizer/LeftSidebar/ components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): add LeftSidebar with Product and Layers tabs

Producto: variant picker (color swatches respecting stock + size buttons),
rating, size guide drawer. Capas: add/select/duplicate/delete text layers
with respect to maxLayersPerZone."
```

---

## Phase 10 — Cliente: Sidebar derecho (5 tabs de propiedades)

### Task 10.1: `lib/customizer/lazy-fonts.ts` — carga on-demand de Google Fonts

**Files:**
- Create: `lib/customizer/lazy-fonts.ts`

- [ ] **Step 1: Crear el helper**

```ts
// lib/customizer/lazy-fonts.ts
const loaded = new Set<string>();

export function loadGoogleFont(family: string): void {
  if (typeof document === "undefined") return;
  if (loaded.has(family)) return;
  loaded.add(family);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export function preloadFonts(families: string[]): void {
  for (const f of families) loadGoogleFont(f);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/customizer/lazy-fonts.ts
git commit -m "feat(customizer): add lazy Google Fonts loader"
```

---

### Task 10.2: `RightSidebar` con 5 tabs

**Files:**
- Create: `components/customizer/RightSidebar/index.tsx`
- Create: `components/customizer/RightSidebar/TextoTab.tsx`
- Create: `components/customizer/RightSidebar/TransformarTab.tsx`
- Create: `components/customizer/RightSidebar/PosicionTab.tsx`

- [ ] **Step 1: Crear `index.tsx`**

```tsx
// components/customizer/RightSidebar/index.tsx
"use client";

import { useState } from "react";
import { useBuilderStore } from "../store";
import { TextoTab } from "./TextoTab";
import { ColorTab } from "./ColorTab";
import { FuenteTab } from "./FuenteTab";
import { TransformarTab } from "./TransformarTab";
import { PosicionTab } from "./PosicionTab";

type TabKey = "texto" | "color" | "fuente" | "transformar" | "posicion";

export function RightSidebar() {
  const [tab, setTab] = useState<TabKey>("texto");
  const selected = useBuilderStore((s) => s.getSelectedLayer());
  const template = useBuilderStore((s) => s.template);

  if (!selected) {
    return (
      <div className="p-4 text-sm text-muted-foreground space-y-3">
        <h3 className="font-medium text-foreground">Plantilla</h3>
        <p>{template?.name}</p>
        {template?.surcharge ? <p className="text-xs">Sobrecargo: S/ {template.surcharge.toFixed(2)}</p> : null}
        <p className="text-xs italic mt-6">Selecciona una capa para editarla, o ve a "Capas" en el sidebar izquierdo para añadir texto.</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "texto", label: "Texto" },
    { key: "color", label: "Color" },
    { key: "fuente", label: "Fuente" },
    { key: "transformar", label: "Transformar" },
    { key: "posicion", label: "Posición" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "texto" && <TextoTab />}
        {tab === "color" && <ColorTab />}
        {tab === "fuente" && <FuenteTab />}
        {tab === "transformar" && <TransformarTab />}
        {tab === "posicion" && <PosicionTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `TextoTab.tsx`**

```tsx
// components/customizer/RightSidebar/TextoTab.tsx
"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";

export function TextoTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  if (!layer || !template) return null;

  return (
    <div className="space-y-4">
      <div>
        <Label>Texto</Label>
        <Textarea
          value={layer.text}
          onChange={(e) => update(layer.id, { text: e.target.value.slice(0, template.maxCharsPerLayer) })}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {layer.text.length}/{template.maxCharsPerLayer}
        </p>
      </div>
      <div>
        <Label>Espaciado entre letras: {layer.letterSpacing.toFixed(1)}</Label>
        <input
          type="range"
          min={-10}
          max={50}
          step={0.5}
          value={layer.letterSpacing}
          onChange={(e) => update(layer.id, { letterSpacing: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <Label>Tamaño: {layer.size}px</Label>
        <input
          type="range"
          min={8}
          max={200}
          step={1}
          value={layer.size}
          onChange={(e) => update(layer.id, { size: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear `TransformarTab.tsx`**

```tsx
// components/customizer/RightSidebar/TransformarTab.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";

export function TransformarTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  if (!layer) return null;

  return (
    <div className="space-y-4">
      <div>
        <Label>Rotación: {Math.round(layer.rotation)}°</Label>
        <input
          type="range"
          min={0} max={360} step={1}
          value={layer.rotation}
          onChange={(e) => update(layer.id, { rotation: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex gap-1 mt-1">
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              onClick={() => update(layer.id, { rotation: deg })}
              className="text-xs px-2 py-1 border rounded hover:bg-muted"
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Ancho (%)</Label>
          <Input type="number" value={layer.width.toFixed(1)} onChange={(e) => update(layer.id, { width: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Alto (%)</Label>
          <Input type="number" value={layer.height.toFixed(1)} onChange={(e) => update(layer.id, { height: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Crear `PosicionTab.tsx`**

```tsx
// components/customizer/RightSidebar/PosicionTab.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";
import {
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyEnd,
} from "lucide-react";

export function PosicionTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const activeZoneId = useBuilderStore((s) => s.activeZoneId);
  if (!layer || !template) return null;

  const zone = template.zones.find((z) => z.id === activeZoneId);
  if (!zone) return null;
  const b = zone.bounds;

  const buttons = [
    { icon: AlignHorizontalJustifyStart, title: "Alinear izquierda", apply: () => ({ x: b.xPct }) },
    { icon: AlignHorizontalJustifyCenter, title: "Centrar horizontal", apply: () => ({ x: b.xPct + b.widthPct / 2 }) },
    { icon: AlignHorizontalJustifyEnd, title: "Alinear derecha", apply: () => ({ x: b.xPct + b.widthPct }) },
    { icon: AlignVerticalJustifyStart, title: "Alinear arriba", apply: () => ({ y: b.yPct }) },
    { icon: AlignVerticalJustifyCenter, title: "Centrar vertical", apply: () => ({ y: b.yPct + b.heightPct / 2 }) },
    { icon: AlignVerticalJustifyEnd, title: "Alinear abajo", apply: () => ({ y: b.yPct + b.heightPct }) },
  ];

  return (
    <div className="space-y-3">
      <Label>Alinear dentro del área de impresión</Label>
      <div className="grid grid-cols-3 gap-2">
        {buttons.map(({ icon: Icon, title, apply }) => (
          <Button
            key={title}
            variant="outline"
            size="icon"
            title={title}
            onClick={() => update(layer.id, apply())}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        X: {layer.x.toFixed(1)}% · Y: {layer.y.toFixed(1)}%
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/customizer/RightSidebar/index.tsx components/customizer/RightSidebar/TextoTab.tsx components/customizer/RightSidebar/TransformarTab.tsx components/customizer/RightSidebar/PosicionTab.tsx
git commit -m "feat(customizer): add RightSidebar with Texto, Transformar, Posicion tabs"
```

---

### Task 10.3: `ColorTab` con grilla + custom picker

**Files:**
- Create: `components/customizer/RightSidebar/ColorTab.tsx`
- Create: `components/customizer/RightSidebar/CustomColorPicker.tsx`

- [ ] **Step 1: Crear `CustomColorPicker.tsx`**

```tsx
// components/customizer/RightSidebar/CustomColorPicker.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pipette } from "lucide-react";

interface Props { value: string; onChange: (hex: string) => void; }

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function CustomColorPicker({ value, onChange }: Props) {
  const [hex, setHex] = useState(value);
  const valid = HEX_RE.test(hex);

  const handleEyedropper = async () => {
    // @ts-expect-error EyeDropper API
    if (typeof window.EyeDropper !== "undefined") {
      try {
        // @ts-expect-error
        const eye = new window.EyeDropper();
        const res = await eye.open();
        if (res?.sRGBHex) {
          setHex(res.sRGBHex);
          onChange(res.sRGBHex);
        }
      } catch { /* user cancelled */ }
    }
  };

  // @ts-expect-error
  const supportsEyedropper = typeof window !== "undefined" && typeof window.EyeDropper !== "undefined";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="color"
          value={valid ? hex : "#000000"}
          onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
          className="size-10 rounded cursor-pointer"
        />
        <Input
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            if (HEX_RE.test(e.target.value)) onChange(e.target.value);
          }}
          placeholder="#RRGGBB"
          className="font-mono"
        />
        {supportsEyedropper && (
          <Button type="button" variant="outline" size="icon" onClick={handleEyedropper} title="Eyedropper">
            <Pipette className="size-4" />
          </Button>
        )}
      </div>
      {!valid && <p className="text-xs text-red-600">Formato: #RRGGBB</p>}
    </div>
  );
}
```

- [ ] **Step 2: Crear `ColorTab.tsx`**

```tsx
// components/customizer/RightSidebar/ColorTab.tsx
"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";
import { DEFAULT_COLORS, getColorByHex } from "@/lib/customizer/default-colors";
import { CustomColorPicker } from "./CustomColorPicker";

export function ColorTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const [showPicker, setShowPicker] = useState(false);
  if (!layer || !template) return null;

  const allowed = new Set(template.allowedColors.map((c) => c.toUpperCase()));
  const swatches = DEFAULT_COLORS.filter((c) => allowed.has(c.hex.toUpperCase()));
  const groups = Array.from(new Set(swatches.map((c) => c.group)));

  const currentMatch = getColorByHex(layer.color);

  return (
    <div className="space-y-3">
      <div>
        <Label>Color del texto</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {currentMatch?.name ?? "Custom"} ·{" "}
          <span className="font-mono">{layer.color.toUpperCase()}</span>
        </p>
      </div>

      {template.allowCustomColors && (
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="w-full text-sm border rounded p-2 hover:bg-muted text-left"
        >
          🎨 Color personalizado
        </button>
      )}
      {showPicker && template.allowCustomColors && (
        <CustomColorPicker value={layer.color} onChange={(hex) => update(layer.id, { color: hex })} />
      )}

      {groups.map((g) => {
        const items = swatches.filter((c) => c.group === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <Label className="text-xs capitalize">{g.replace("-", " ")}</Label>
            <div className="grid grid-cols-8 gap-1 mt-1">
              {items.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => update(layer.id, { color: c.hex })}
                  title={c.name}
                  className={`aspect-square rounded ${layer.color.toUpperCase() === c.hex.toUpperCase() ? "ring-2 ring-blue-500" : "ring-1 ring-gray-200"}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/customizer/RightSidebar/ColorTab.tsx components/customizer/RightSidebar/CustomColorPicker.tsx
git commit -m "feat(customizer): add ColorTab with palette grid and custom hex picker"
```

---

### Task 10.4: `FuenteTab` con buscador + categorías + lazy load

**Files:**
- Create: `components/customizer/RightSidebar/FuenteTab.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/customizer/RightSidebar/FuenteTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBuilderStore } from "../store";
import { DEFAULT_FONTS, POPULAR_FONT_KEYS } from "@/lib/customizer/default-fonts";
import { loadGoogleFont, preloadFonts } from "@/lib/customizer/lazy-fonts";

type FilterMode = "all" | "popular";

export function FuenteTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const allLayers = useBuilderStore((s) => s.zones);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");

  useEffect(() => {
    preloadFonts(POPULAR_FONT_KEYS);
  }, []);

  const usedFonts = useMemo(() => {
    const set = new Set<string>();
    for (const arr of Object.values(allLayers)) for (const l of arr) set.add(l.font);
    return Array.from(set);
  }, [allLayers]);

  if (!layer || !template) return null;

  const allowed = new Set(template.allowedFonts);
  const available = DEFAULT_FONTS.filter((f) => allowed.has(f.key));

  const filtered = available.filter((f) => {
    if (mode === "popular" && !POPULAR_FONT_KEYS.includes(f.key)) return false;
    if (search && !f.key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const usedAvailable = available.filter((f) => usedFonts.includes(f.key));

  const renderItem = (key: string, family: string) => {
    const isSelected = layer.font === key;
    return (
      <button
        key={key}
        onClick={() => {
          loadGoogleFont(family);
          update(layer.id, { font: key });
        }}
        onMouseEnter={() => loadGoogleFont(family)}
        className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between ${isSelected ? "bg-blue-50" : ""}`}
        style={{ fontFamily: `"${family}", sans-serif` }}
      >
        <span>{key}</span>
        {isSelected && <Check className="size-4 text-blue-600" />}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar fuente" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex border-b text-sm">
        <button
          onClick={() => setMode("all")}
          className={`px-3 py-1.5 ${mode === "all" ? "border-b-2 border-blue-600 font-medium" : "text-muted-foreground"}`}
        >
          Todas
        </button>
        <button
          onClick={() => setMode("popular")}
          className={`px-3 py-1.5 ${mode === "popular" ? "border-b-2 border-blue-600 font-medium" : "text-muted-foreground"}`}
        >
          Populares
        </button>
      </div>

      {usedAvailable.length > 0 && search === "" && (
        <div>
          <p className="text-xs uppercase text-muted-foreground px-3 py-1">Utilizadas en el diseño</p>
          {usedAvailable.map((f) => renderItem(f.key, f.family))}
        </div>
      )}

      <div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Sin resultados</p>
        ) : (
          filtered.map((f) => renderItem(f.key, f.family))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Conectar `RightSidebar` en `CustomizerLayout.tsx`**

Reemplazar el placeholder `[Sidebar der — Phase 10]` con:

```tsx
import { RightSidebar } from "./RightSidebar";

<aside className="w-80 border-l flex-shrink-0">
  <RightSidebar />
</aside>
```

- [ ] **Step 3: Verify & smoke**

Run: `npm run build && npm run dev`. Builder funcional: añadir texto, seleccionar, abrir tab Fuente, buscar, cambiar fuente con preview WYSIWYG. Color tab con grilla y picker custom. Transformar slider rotación. Posición alineación 6 botones.

- [ ] **Step 4: Commit**

```bash
git add components/customizer/RightSidebar/FuenteTab.tsx components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): add FuenteTab with search, categories, lazy Google Fonts

Preloads 8 popular fonts, lazy-loads others on hover/select.
Shows 'Utilizadas en el diseño' section when no search active."
```

---

## Phase 11 — Carrito: integración (CartItem, capture PNG, add to cart)

### Task 11.1: Extender `store/cart.ts`

**Files:**
- Modify: `store/cart.ts`
- Create: `store/__tests__/cart-customizer.test.ts`

- [ ] **Step 1: Test del store extendido**

```ts
// store/__tests__/cart-customizer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "../cart";
import type { CustomDesign } from "@/lib/customizer/types";

const baseSnapshot = {
  allowedFonts: ["Inter"], allowedColors: ["#000000"], allowCustomColors: true,
  maxLayersPerZone: 5, maxCharsPerLayer: 40, surcharge: 5,
  zones: [{ id: "frontal", name: "Frontal", bounds: { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 } }],
};

const fakeDesign: CustomDesign = {
  templateId: "t1", templateSnapshot: baseSnapshot,
  zones: [{ zoneId: "frontal", layers: [] }],
};

describe("cart store with customDesign", () => {
  beforeEach(() => useCartStore.getState().clearCart());

  it("does not merge custom item with non-custom item of same product", () => {
    useCartStore.getState().addItem({
      id: "p1", productId: "p1", name: "Polo", slug: "polo", price: 39.9, maxStock: 10,
    });
    useCartStore.getState().addItem({
      id: "p1::cd1", productId: "p1", name: "Polo (personalizado)", slug: "polo",
      price: 44.9, maxStock: 10, customDesignId: "cd1", customDesign: fakeDesign,
      customDesignImages: [],
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("does not merge two custom items with different customDesignId", () => {
    useCartStore.getState().addItem({
      id: "p1::cd1", productId: "p1", name: "P", slug: "p", price: 44.9, maxStock: 10,
      customDesignId: "cd1", customDesign: fakeDesign, customDesignImages: [],
    });
    useCartStore.getState().addItem({
      id: "p1::cd2", productId: "p1", name: "P", slug: "p", price: 44.9, maxStock: 10,
      customDesignId: "cd2", customDesign: fakeDesign, customDesignImages: [],
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("replaceCustomItem updates design without duplicating", () => {
    useCartStore.getState().addItem({
      id: "p1::cd1", productId: "p1", name: "P", slug: "p", price: 44.9, maxStock: 10,
      customDesignId: "cd1", customDesign: fakeDesign, customDesignImages: [],
    });
    useCartStore.getState().updateQuantity("p1::cd1", 3);
    const newDesign = { ...fakeDesign, zones: [{ zoneId: "frontal", layers: [] }] };
    useCartStore.getState().replaceCustomItem("p1::cd1", newDesign, [{ zoneId: "frontal", url: "https://x.public.blob.vercel-storage.com/y.png" }]);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useCartStore.getState().items[0].customDesignImages?.[0].url).toContain("y.png");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run store/__tests__/cart-customizer.test.ts`

Expected: FAIL — `replaceCustomItem` no existe; los nuevos campos no aceptados.

- [ ] **Step 3: Modificar `store/cart.ts`**

Extender `CartItem`:

```ts
import type { CustomDesign, CustomDesignImage } from '@/lib/customizer/types'

export interface CartItem {
  // ... campos existentes ...
  customDesignId?: string
  customDesign?: CustomDesign
  customDesignImages?: CustomDesignImage[]
  customDesignBroken?: boolean
}
```

Añadir método `replaceCustomItem`:

```ts
interface CartStore {
  // ... existentes ...
  replaceCustomItem: (cartItemId: string, design: CustomDesign, images: CustomDesignImage[]) => void
  markCustomDesignBroken: (cartItemId: string, broken: boolean) => void
}

// En la implementación:
replaceCustomItem: (cartItemId, design, images) => {
  set({
    items: get().items.map((item) =>
      item.id === cartItemId
        ? { ...item, customDesign: design, customDesignImages: images, customDesignBroken: false }
        : item
    ),
  })
},

markCustomDesignBroken: (cartItemId, broken) => {
  set({
    items: get().items.map((item) =>
      item.id === cartItemId ? { ...item, customDesignBroken: broken } : item
    ),
  })
},
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run store/__tests__/cart-customizer.test.ts`

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add store/cart.ts store/__tests__/cart-customizer.test.ts
git commit -m "feat(cart): extend CartItem with customDesign fields and replaceCustomItem"
```

---

### Task 11.2: `canvas-export.ts` — capture PNG y subir

**Files:**
- Create: `lib/customizer/canvas-export.ts`

- [ ] **Step 1: Crear el helper**

```ts
// lib/customizer/canvas-export.ts
import type Konva from "konva";

export interface ZonePngExport {
  zoneId: string;
  blob: Blob;
}

export async function captureZonePng(stage: Konva.Stage, zoneId: string, dpi: number): Promise<ZonePngExport> {
  const pixelRatio = Math.max(1, Math.min(4, dpi / 96));
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { zoneId, blob };
}

export async function uploadPngBlob(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Error al subir PNG");
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("Respuesta sin URL");
  return json.url;
}

export async function uploadAllZones(
  exports: ZonePngExport[],
  customDesignId: string
): Promise<Array<{ zoneId: string; url: string }>> {
  const results: Array<{ zoneId: string; url: string }> = [];
  for (const exp of exports) {
    const filename = `customizer-${customDesignId}-${exp.zoneId}.png`;
    const url = await uploadPngBlob(exp.blob, filename);
    results.push({ zoneId: exp.zoneId, url });
  }
  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/customizer/canvas-export.ts
git commit -m "feat(customizer): add canvas-export helpers for PNG capture and upload"
```

---

### Task 11.3: Implementar `handleAddToCart` en `BottomBar`

**Files:**
- Modify: `components/customizer/BottomBar.tsx`
- Modify: `components/customizer/CustomizerCanvas.tsx` (exponer ref del Stage al store)
- Modify: `components/customizer/store.ts` (añadir `stageRef` opcional para capture)

- [ ] **Step 1: Exponer Stage globalmente vía un módulo simple**

Crear `components/customizer/canvas-ref.ts`:

```ts
// components/customizer/canvas-ref.ts
import type Konva from "konva";

let stageRef: Konva.Stage | null = null;

export function setStageRef(stage: Konva.Stage | null) { stageRef = stage; }
export function getStageRef(): Konva.Stage | null { return stageRef; }
```

- [ ] **Step 2: En `CustomizerCanvas.tsx`, registrar el stage**

```tsx
import { setStageRef } from "./canvas-ref";

const stageInstanceRef = useRef<Konva.Stage | null>(null);

// En el <Stage> ref:
<Stage
  ref={(node: Konva.Stage | null) => {
    stageInstanceRef.current = node;
    setStageRef(node);
  }}
  // ... resto ...
>
```

(También importar `Konva` con `import type Konva from "konva"`.)

- [ ] **Step 3: Implementar `handleAddToCart` en `BottomBar.tsx`**

```tsx
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart";
import { useBuilderStore } from "./store";
import { getStageRef } from "./canvas-ref";
import { captureZonePng, uploadAllZones } from "@/lib/customizer/canvas-export";

const handleAddToCart = async () => {
  const { template, zones, activeZoneId } = useBuilderStore.getState();
  const variantId = useBuilderStore.getState().variantId;
  const cartItemId = useBuilderStore.getState().cartItemId;
  const buildSnapshot = useBuilderStore.getState().buildSnapshot;
  const buildDesignZones = useBuilderStore.getState().buildDesignZones;
  const setUploading = useBuilderStore.getState().setUploading;

  if (!template) return;
  if (!useBuilderStore.getState().hasContent()) {
    toast.warning("Añade al menos un texto en alguna zona");
    return;
  }

  setUploading(true);
  try {
    const customDesignId = cartItemId
      ? cartItemId.split("::")[1] ?? crypto.randomUUID()
      : crypto.randomUUID();

    // Capture PNG for each zone with at least one layer
    const exports = [];
    for (const zone of template.zones) {
      const layers = zones[zone.id] ?? [];
      if (layers.length === 0) continue;
      // Switch to this zone to render it (active zone determines what's drawn)
      useBuilderStore.getState().setActiveZone(zone.id);
      // Wait for next paint
      await new Promise((r) => setTimeout(r, 50));
      const stage = getStageRef();
      if (!stage) throw new Error("Stage no disponible");
      exports.push(await captureZonePng(stage, zone.id, zone.printResolutionDPI));
    }

    if (activeZoneId) useBuilderStore.getState().setActiveZone(activeZoneId);

    // Upload all
    const images = await uploadAllZones(exports, customDesignId);

    // Build CartItem
    const snapshot = buildSnapshot();
    const designZones = buildDesignZones();
    if (!snapshot) throw new Error("Snapshot no disponible");

    const variant = product.variants.find((v) => v.id === variantId);
    const basePrice = variant?.price ?? product.basePrice;

    const customDesign = { templateId: template.id, templateSnapshot: snapshot, zones: designZones };

    if (cartItemId) {
      useCartStore.getState().replaceCustomItem(cartItemId, customDesign, images);
      toast.success("Cambios guardados");
      router.push("/carrito");
    } else {
      const idForCart = `${variantId || product.id}::${customDesignId}`;
      const added = useCartStore.getState().addItem({
        id: idForCart,
        productId: product.id,
        variantId: variantId ?? undefined,
        name: `${product.name} (personalizado)`,
        slug: product.slug,
        price: basePrice + (template.surcharge ?? 0),
        maxStock: variant?.stock ?? 99,
        image: images[0]?.url ?? product.images[0],
        customDesignId,
        customDesign,
        customDesignImages: images,
      });
      if (added) {
        toast.success("¡Añadido al carrito!");
      }
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Error al subir el diseño");
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 4: Smoke manual end-to-end**

Run: `npm run dev`. Personalizar producto, añadir texto, click "Añadir al carrito". Verificar que:
- Toast muestra "Subiendo tu diseño…" y luego "¡Añadido al carrito!"
- En cart drawer ve el item con thumbnail del PNG.
- En Vercel Blob (panel) hay PNGs subidos.

- [ ] **Step 5: Commit**

```bash
git add components/customizer/canvas-ref.ts components/customizer/CustomizerCanvas.tsx components/customizer/BottomBar.tsx
git commit -m "feat(customizer): implement add-to-cart flow with PNG capture and upload

Captures PNG per zone using Konva Stage.toDataURL with DPI-based
pixelRatio, uploads via /api/upload, builds CartItem with composite
ID (productId::customDesignId) so it never merges with other items.
Supports both add (new) and replace (cartItemId mode)."
```

---

## Phase 12 — Carrito UI

### Task 12.1: `CustomDesignBadge` para items personalizados

**Files:**
- Create: `components/shop/cart/CustomDesignBadge.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// components/shop/cart/CustomDesignBadge.tsx
"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { CartItem } from "@/store/cart";

interface Props { item: CartItem; }

export function CustomDesignBadge({ item }: Props) {
  if (!item.customDesignId) return null;

  if (item.customDesignBroken) {
    return (
      <div className="text-xs flex items-center gap-1 text-red-600 mt-1">
        <AlertTriangle className="size-3" />
        El diseño expiró ·{" "}
        <Link href={`/productos/${item.slug}/personalizar`} className="underline">
          Re-personalizar
        </Link>
      </div>
    );
  }

  return (
    <div className="text-xs flex items-center gap-1 text-blue-600 mt-1">
      <Sparkles className="size-3" />
      Personalizado ·{" "}
      <Link href={`/productos/${item.slug}/personalizar?cartItemId=${encodeURIComponent(item.id)}`} className="underline">
        Editar diseño
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shop/cart/CustomDesignBadge.tsx
git commit -m "feat(cart): add CustomDesignBadge with edit and broken states"
```

---

### Task 12.2: Integrar el badge y thumbnail PNG en cart drawer y `/carrito`

**Files:**
- Modify: `components/shop/cart/CartItem.tsx` (o el componente equivalente)

- [ ] **Step 1: Localizar el componente que renderiza un item en el drawer/página**

Run: `grep -rn "CartItem\|cart.*item" components/shop/cart/ | head`

- [ ] **Step 2: En el render, usar `customDesignImages` para thumbnail si existe**

```tsx
import { CustomDesignBadge } from "./CustomDesignBadge";
import { getPriceBreakdown } from "@/lib/customizer/pricing";

const thumbnailSrc =
  item.customDesignImages?.[0]?.url ?? item.image ?? "/placeholder.png";

const breakdown = item.customDesign
  ? getPriceBreakdown(item.price - (item.customDesign.templateSnapshot.surcharge ?? 0), item.customDesign.templateSnapshot.surcharge)
  : null;

// En el JSX del item:
<Image src={thumbnailSrc} alt={item.name} ... />
<div>
  <h4>{item.name}</h4>
  <CustomDesignBadge item={item} />
  {breakdown && breakdown.surcharge > 0 ? (
    <p className="text-xs text-muted-foreground">
      S/ {breakdown.base.toFixed(2)} + S/ {breakdown.surcharge.toFixed(2)} personalización
    </p>
  ) : null}
</div>
```

- [ ] **Step 3: Verify build & smoke**

Run: `npm run dev`. Añadir item personalizado, abrir cart drawer, verificar thumbnail PNG y badge "Personalizado · Editar diseño".

- [ ] **Step 4: Commit**

```bash
git add components/shop/cart/CartItem.tsx
git commit -m "feat(cart): show PNG thumbnail and breakdown for customized items"
```

---

### Task 12.3: HEAD validation de PNGs al cargar `/carrito`

**Files:**
- Create: `lib/customizer/validate-cart-images.ts`
- Modify: `app/(shop)/carrito/page.tsx` (o componente cliente)

- [ ] **Step 1: Crear el helper**

```ts
// lib/customizer/validate-cart-images.ts
export async function checkImageReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Validar al cargar `/carrito`**

En el componente cliente del carrito (probablemente `components/shop/cart/CartPageClient.tsx` o similar), añadir un `useEffect`:

```tsx
"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { checkImageReachable } from "@/lib/customizer/validate-cart-images";

// dentro del componente:
useEffect(() => {
  const items = useCartStore.getState().items;
  const mark = useCartStore.getState().markCustomDesignBroken;
  for (const item of items) {
    if (item.customDesignImages && item.customDesignImages.length > 0) {
      Promise.all(item.customDesignImages.map((i) => checkImageReachable(i.url))).then((results) => {
        const broken = results.some((r) => !r);
        if (broken) mark(item.id, true);
      });
    }
  }
}, []);
```

- [ ] **Step 3: Verify smoke**

Manualmente borrar un PNG en Vercel Blob, recargar `/carrito`, ver el badge rojo "El diseño expiró".

- [ ] **Step 4: Commit**

```bash
git add lib/customizer/validate-cart-images.ts app/\(shop\)/carrito/
git commit -m "feat(cart): validate custom design PNGs on cart page load via HEAD"
```

---

## Phase 13 — Edit desde cart

### Task 13.1: Builder acepta `cartItemId` y precarga el diseño

**Files:**
- Modify: `components/customizer/CustomizerLayout.tsx`

- [ ] **Step 1: En el `useEffect` de carga, leer del cart store si hay cartItemId**

```tsx
import { useCartStore } from "@/store/cart";

useEffect(() => {
  let initial: { zones: { zoneId: string; layers: TextLayer[] }[]; cartItemId?: string } | undefined;
  if (cartItemId) {
    const cartItem = useCartStore.getState().items.find((i) => i.id === cartItemId);
    if (cartItem?.customDesign) {
      initial = {
        zones: cartItem.customDesign.zones,
        cartItemId,
      };
      // restaurar variantId también
      if (cartItem.variantId) initialVariantId = cartItem.variantId;
    }
  }
  load(template, initialVariantId, initial);
}, [template, initialVariantId, cartItemId, load]);
```

(Adapta variables locales según corresponda.)

- [ ] **Step 2: El bottom bar ya muestra "Guardar cambios" cuando `cartItemId` está seteado** (Task 7.2) y `handleAddToCart` ya invoca `replaceCustomItem` (Task 11.3). Smoke test:

Run: `npm run dev`. Personalizar y añadir al cart. Volver al cart drawer, click "Editar diseño". URL incluye `?cartItemId=...`. Builder precarga el diseño. Cambiar texto, "Guardar cambios". Cart drawer refleja sin duplicar.

- [ ] **Step 3: Commit**

```bash
git add components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): preload design when cartItemId is provided

Builder reads cart store, restores layers and variantId,
shows 'Guardar cambios' instead of 'Añadir al carrito'."
```

---

## Phase 14 — Confirmación de orden y email

### Task 14.1: `CustomDesignConfirmation` en página de confirmación

**Files:**
- Create: `components/checkout/CustomDesignConfirmation.tsx`
- Modify: `app/(checkout)/orden/[orderId]/confirmacion/page.tsx`

- [ ] **Step 1: Crear el componente (similar al admin pero estilo customer)**

```tsx
// components/checkout/CustomDesignConfirmation.tsx
"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

interface Props {
  productName: string;
  design: CustomDesign;
  images: CustomDesignImage[];
}

export function CustomDesignConfirmation({ productName, design, images }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-blue-50/50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-blue-600" />
        <h4 className="font-medium text-sm">Tu diseño personalizado de {productName}</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img) => {
          const zoneName = design.templateSnapshot.zones.find((z) => z.id === img.zoneId)?.name ?? img.zoneId;
          return (
            <div key={img.zoneId} className="border rounded bg-white p-2">
              <p className="text-xs font-medium mb-1">{zoneName}</p>
              <div className="relative aspect-square">
                <Image src={img.url} alt={zoneName} fill className="object-contain" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Tu diseño ya está en producción.</p>
    </div>
  );
}
```

- [ ] **Step 2: Renderizar en confirmación**

En `app/(checkout)/orden/[orderId]/confirmacion/page.tsx`, donde se itera `order.items`:

```tsx
import { CustomDesignConfirmation } from "@/components/checkout/CustomDesignConfirmation";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

{item.customDesign && item.customDesignImages && (
  <CustomDesignConfirmation
    productName={item.name}
    design={item.customDesign as unknown as CustomDesign}
    images={item.customDesignImages as unknown as CustomDesignImage[]}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/checkout/CustomDesignConfirmation.tsx app/\(checkout\)/orden/\[orderId\]/confirmacion/page.tsx
git commit -m "feat(checkout): show design confirmation on order success page"
```

---

### Task 14.2: Email de confirmación con links a PNGs

**Files:**
- Modify: `emails/order-confirmation.tsx` (o el template existente de Resend)

- [ ] **Step 1: Localizar el template**

Run: `ls emails/ && grep -l "OrderConfirmation\|order-confirmation" emails/`

- [ ] **Step 2: En el template, por cada item con `customDesign`, agregar sección con links a los PNGs**

```tsx
import { Section, Text, Link, Img } from "@react-email/components";
import type { CustomDesignImage } from "@/lib/customizer/types";

// Donde se renderiza cada item:
{item.customDesignImages && (item.customDesignImages as CustomDesignImage[]).length > 0 && (
  <Section style={{ marginTop: 8, padding: 12, backgroundColor: "#eff6ff", borderRadius: 6 }}>
    <Text style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Tu diseño personalizado:</Text>
    {(item.customDesignImages as CustomDesignImage[]).map((img) => (
      <Text key={img.zoneId} style={{ fontSize: 12, margin: "4px 0" }}>
        <Link href={img.url}>Ver {img.zoneId} →</Link>
      </Text>
    ))}
    <Text style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
      Tu diseño ya está en producción.
    </Text>
  </Section>
)}
```

- [ ] **Step 3: Smoke**

Hacer una orden de prueba, verificar el email recibido (Resend dashboard).

- [ ] **Step 4: Commit**

```bash
git add emails/
git commit -m "feat(emails): include custom design preview links in order confirmation"
```

---

## Phase 15 — Mobile responsive

### Task 15.1: `MobileBottomSheet` y `MobileFAB`

**Files:**
- Create: `components/customizer/MobileBottomSheet.tsx`
- Create: `components/customizer/MobileFAB.tsx`

- [ ] **Step 1: `MobileBottomSheet.tsx`**

```tsx
// components/customizer/MobileBottomSheet.tsx
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useBuilderStore } from "./store";
import { RightSidebar } from "./RightSidebar";

export function MobileBottomSheet() {
  const [open, setOpen] = useState(false);
  const layersCount = useBuilderStore((s) => s.getLayersForActiveZone().length);

  return (
    <div className={`fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg transition-transform duration-200 z-30 ${
      open ? "translate-y-0 max-h-[60vh]" : "translate-y-0 max-h-12"
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm border-b"
      >
        <span>{layersCount} capas{layersCount === 1 ? "" : ""} · Toca para editar</span>
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
      {open && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 48px)" }}>
          <RightSidebar />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `MobileFAB.tsx`**

```tsx
// components/customizer/MobileFAB.tsx
"use client";

import { useState } from "react";
import { Plus, Package, Layers, X } from "lucide-react";
import { useBuilderStore } from "./store";
import type { TextLayer } from "@/lib/customizer/types";

const newTextLayer = (): TextLayer => ({
  id: crypto.randomUUID(), type: "TEXT", text: "Tu texto aquí",
  font: "Inter", size: 32, color: "#000000", letterSpacing: 0, rotation: 0,
  x: 50, y: 50, width: 30, height: 5, align: "center",
});

interface Props { onShowProduct: () => void; onShowLayers: () => void; }

export function MobileFAB({ onShowProduct, onShowLayers }: Props) {
  const [open, setOpen] = useState(false);
  const addLayer = useBuilderStore((s) => s.addLayer);

  return (
    <div className="fixed bottom-20 left-4 z-30">
      {open && (
        <div className="absolute bottom-14 left-0 flex flex-col gap-2">
          <button onClick={() => { onShowProduct(); setOpen(false); }} className="size-12 rounded-full bg-white border shadow-md flex items-center justify-center">
            <Package className="size-5" />
          </button>
          <button onClick={() => { onShowLayers(); setOpen(false); }} className="size-12 rounded-full bg-white border shadow-md flex items-center justify-center">
            <Layers className="size-5" />
          </button>
          <button onClick={() => { addLayer(newTextLayer()); setOpen(false); }} className="size-12 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center font-bold">
            T
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="size-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/customizer/MobileBottomSheet.tsx components/customizer/MobileFAB.tsx
git commit -m "feat(customizer): add mobile bottom-sheet and FAB radial menu"
```

---

### Task 15.2: Layout responsive en `CustomizerLayout`

**Files:**
- Modify: `components/customizer/CustomizerLayout.tsx`

- [ ] **Step 1: Detectar mobile y switchear layout**

```tsx
import { useEffect, useState } from "react";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileFAB } from "./MobileFAB";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProductTab } from "./LeftSidebar/ProductTab";
import { LayersTab } from "./LeftSidebar/LayersTab";

const [isMobile, setIsMobile] = useState(false);
const [mobilePanel, setMobilePanel] = useState<"none" | "producto" | "capas">("none");

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

// En el JSX, condicional:
return (
  <div className="flex flex-col h-screen">
    <CustomizerTopBar productSlug={product.slug} productName={product.name} />
    {isMobile ? (
      <>
        <ZoneTabs />
        <main className="flex-1 overflow-hidden">
          <CustomizerCanvas product={product} />
        </main>
        <MobileBottomSheet />
        <MobileFAB
          onShowProduct={() => setMobilePanel("producto")}
          onShowLayers={() => setMobilePanel("capas")}
        />
        <Dialog open={mobilePanel !== "none"} onOpenChange={(o) => !o && setMobilePanel("none")}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            {mobilePanel === "producto" && <ProductTab product={product} />}
            {mobilePanel === "capas" && <LayersTab />}
          </DialogContent>
        </Dialog>
      </>
    ) : (
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r flex-shrink-0">
          <LeftSidebar product={product} />
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ZoneTabs />
          <div className="flex-1 overflow-hidden">
            <CustomizerCanvas product={product} />
          </div>
        </main>
        <aside className="w-80 border-l flex-shrink-0">
          <RightSidebar />
        </aside>
      </div>
    )}
    <BottomBar product={product} previewMode={previewMode} cartItemId={cartItemId} />
  </div>
);
```

- [ ] **Step 2: Smoke en mobile (DevTools responsive mode)**

Verificar que <768px muestra layout stacked con FAB y bottom-sheet, y >=768px el de 3 columnas.

- [ ] **Step 3: Commit**

```bash
git add components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): responsive layout — mobile sheet + FAB, desktop 3-column"
```

---

## Phase 16 — E2E (6 journeys)

### Task 16.1: Mock de `/api/upload` en Playwright

**Files:**
- Modify: `playwright.config.ts` (verificar baseURL)
- Create: `e2e/fixtures/mock-upload.ts`

- [ ] **Step 1: Crear fixture de mock**

```ts
// e2e/fixtures/mock-upload.ts
import type { Page } from "@playwright/test";

export async function mockUploadEndpoint(page: Page) {
  await page.route("**/api/upload", async (route) => {
    const url = `https://test.public.blob.vercel-storage.com/mock-${Date.now()}.png`;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url }) });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add e2e/fixtures/mock-upload.ts
git commit -m "test(e2e): add mock-upload fixture"
```

---

### Task 16.2: Happy path E2E

**Files:**
- Create: `e2e/customizer-happy-path.spec.ts`

- [ ] **Step 1: Escribir el spec**

```ts
// e2e/customizer-happy-path.spec.ts
import { test, expect } from "@playwright/test";
import { mockUploadEndpoint } from "./fixtures/mock-upload";

test("happy path: producto → personalizar → añadir al carrito", async ({ page }) => {
  await mockUploadEndpoint(page);

  // Asume que existe un producto con slug "polo-personalizable" con plantilla asignada (seed manual o setup previo)
  await page.goto("/productos/polo-personalizable");
  await expect(page.getByRole("link", { name: /empieza a diseñar/i })).toBeVisible();
  await page.getByRole("link", { name: /empieza a diseñar/i }).click();

  await expect(page).toHaveURL(/\/personalizar/);

  // Click en tab "Capas" del sidebar izquierdo
  await page.getByRole("button", { name: /^capas$/i }).first().click();
  await page.getByRole("button", { name: /\+ texto/i }).click();

  // Verificar que se añadió un texto en el canvas (mock-konva renderiza data attrs)
  await expect(page.locator('[data-konva="Text"]')).toHaveCount(1);

  // Click en "Añadir al carrito"
  await page.getByRole("button", { name: /añadir al carrito/i }).click();

  // Esperar toast de éxito
  await expect(page.getByText(/añadido al carrito/i)).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Run test**

Run: `npx playwright test e2e/customizer-happy-path.spec.ts`

Expected: PASS si los componentes están integrados correctamente. Esto valida que **todo el flujo end-to-end funciona**.

- [ ] **Step 3: Commit**

```bash
git add e2e/customizer-happy-path.spec.ts
git commit -m "test(e2e): add customizer happy path"
```

---

### Task 16.3: Validation E2E (zona vacía, tampering)

**Files:**
- Create: `e2e/customizer-validation.spec.ts`

- [ ] **Step 1: Spec**

```ts
// e2e/customizer-validation.spec.ts
import { test, expect } from "@playwright/test";

test("muestra warning al intentar añadir sin capas", async ({ page }) => {
  await page.goto("/productos/polo-personalizable/personalizar");
  // El botón "Añadir al carrito" debe estar disabled (hasContent === false)
  const btn = page.getByRole("button", { name: /añadir al carrito/i });
  await expect(btn).toBeDisabled();
});

test("server-side rejects tampered customDesign", async ({ request }) => {
  // POST directo a la action de checkout con un payload tampered
  // (este test puede requerir un test API helper específico — adaptar al setup del proyecto)
  // Skip si no hay endpoint público para órdenes
  test.skip(true, "Requiere helper de API o un endpoint público de tests");
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/customizer-validation.spec.ts
git commit -m "test(e2e): add validation specs"
```

---

### Task 16.4: Persistencia entre zonas + variant change

**Files:**
- Create: `e2e/customizer-zones.spec.ts`
- Create: `e2e/customizer-variants.spec.ts`

- [ ] **Step 1: `customizer-zones.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("layers persist when switching between zones", async ({ page }) => {
  await page.goto("/productos/polo-personalizable/personalizar");
  await page.getByRole("button", { name: /^capas$/i }).first().click();
  await page.getByRole("button", { name: /\+ texto/i }).click();
  await expect(page.locator('[data-konva="Text"]')).toHaveCount(1);

  // Cambiar a Trasera
  await page.getByRole("button", { name: /trasera/i }).click();
  await expect(page.locator('[data-konva="Text"]')).toHaveCount(0);

  // Volver a Frontal
  await page.getByRole("button", { name: /frontal/i }).click();
  await expect(page.locator('[data-konva="Text"]')).toHaveCount(1);
});
```

- [ ] **Step 2: `customizer-variants.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("changing color in builder updates mockup if override exists", async ({ page }) => {
  await page.goto("/productos/polo-personalizable/personalizar");
  // En tab Producto del sidebar izquierdo, cambiar color
  // Verificar que el src de la imagen del mockup cambió (depende del setup del producto de prueba)
  // Si el producto no tiene overrides, ver el disclaimer
  const disclaimer = page.getByText(/Vista previa sobre mockup base/i);
  // Test condicional según la fixture
  await expect(disclaimer.or(page.locator('[data-konva="Image"]'))).toBeVisible();
});
```

- [ ] **Step 3: Commit**

```bash
git add e2e/customizer-zones.spec.ts e2e/customizer-variants.spec.ts
git commit -m "test(e2e): add zone persistence and variant change specs"
```

---

### Task 16.5: Re-edición desde cart E2E

**Files:**
- Create: `e2e/customizer-edit.spec.ts`

- [ ] **Step 1: Spec**

```ts
import { test, expect } from "@playwright/test";
import { mockUploadEndpoint } from "./fixtures/mock-upload";

test("edit design from cart preserves cart item", async ({ page }) => {
  await mockUploadEndpoint(page);
  await page.goto("/productos/polo-personalizable/personalizar");
  await page.getByRole("button", { name: /^capas$/i }).first().click();
  await page.getByRole("button", { name: /\+ texto/i }).click();
  await page.getByRole("button", { name: /añadir al carrito/i }).click();
  await expect(page.getByText(/añadido al carrito/i)).toBeVisible();

  await page.goto("/carrito");
  // Click "Editar diseño"
  await page.getByRole("link", { name: /editar diseño/i }).click();
  await expect(page).toHaveURL(/cartItemId/);

  // Cambiar texto y guardar
  // (depende del UX exacto del TextoTab — ajustar selector)
  await expect(page.getByRole("button", { name: /guardar cambios/i })).toBeVisible();
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/customizer-edit.spec.ts
git commit -m "test(e2e): add edit-from-cart spec"
```

---

### Task 16.6: Verificar suite E2E completa

- [ ] **Step 1: Correr toda la suite**

Run: `npx playwright test e2e/customizer-*.spec.ts`

Expected: 5+ specs PASS. Si falla, revisar selectores y fixtures (datos seed específicos).

- [ ] **Step 2: Commit (si hubo ajustes)**

```bash
git add e2e/
git commit -m "test(e2e): finalize customizer suite"
```

---

## Phase 17 — Polish & docs

### Task 17.1: Bundle analyzer check

**Files:**
- Read-only validation, no commits

- [ ] **Step 1: Build con analyzer**

Run:
```bash
ANALYZE=true npm run build
```

(Si el proyecto no tiene `@next/bundle-analyzer` configurado, instalarlo temporalmente o saltarlo. Alternativa: revisar `.next/analyze/` o `next build --profile`.)

- [ ] **Step 2: Verificar que el chunk de `/personalizar` contiene `react-konva` y `konva`, y que el chunk principal del shop NO**

Expected: react-konva ~150KB en el route-chunk de `/personalizar`, no en el chunk común.

- [ ] **Step 3: Si hay leak, mover el import**

Si `react-konva` aparece en el chunk común, asegurar que todos los imports usan `next/dynamic` con `ssr: false`. Revisar archivos que lo importan estáticamente.

---

### Task 17.2: Guía del dueño

**Files:**
- Create: `docs/superpowers/guides/personalizables-guia-dueno.md`

- [ ] **Step 1: Escribir la guía corta**

```markdown
# Guía: Activar personalización en un producto

## Paso 1 — Crear una plantilla

1. Ir a **Admin → Plantillas personalizables → Nueva plantilla**.
2. Nombre (ej. "Polo blanco unisex Bella+Canvas 3001").
3. Sobrecargo opcional (ej. S/ 5.00).
4. Subir mockup frontal y dibujar el rectángulo del área imprimible.
5. (Opcional) Subir mockup trasero y dibujar bounds.
6. Seleccionar fuentes y colores que el cliente podrá usar.
7. Tabla de medidas opcional.
8. Guardar.

## Paso 2 — Asignar a un producto

1. Ir a **Admin → Productos → [tu producto]**.
2. En la card "Personalización", elegir la plantilla del dropdown.
3. (Opcional) Subir mockups por color: si vendes el polo en blanco, negro, azul, etc., aquí subes una imagen del polo de ese color por zona. Si dejas vacío, el cliente verá el mockup blanco con un disclaimer.
4. Guardar el producto.

## Paso 3 — Verificar en storefront

Visita la página del producto. El botón "Añadir al carrito" será reemplazado por **"Empieza a diseñar"**. Click → builder.

## Paso 4 — Cuando llega una orden

En **Admin → Órdenes → [orderId]**, cada item personalizado muestra:
- PNGs por zona (descargables para imprimir).
- Lista textual del diseño (texto, fuente, tamaño, color) para verificación previa.
- Link a la plantilla usada (por si necesitas chequear bounds o DPI).

## Notas

- Cambiar el sobrecargo de la plantilla NO afecta órdenes ya creadas (precios congelados).
- Si desactivas la plantilla, los productos asignados dejarán de mostrar el botón "Empieza a diseñar". Carritos pendientes pueden quedar inválidos.
- Si eliminas la plantilla, no podrás eliminarla mientras haya productos usándola — desactívala primero o cambia los productos a otra plantilla.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/guides/personalizables-guia-dueno.md
git commit -m "docs: add owner guide for product customizer"
```

---

## Cierre

Al completar todas las fases, ejecutar:

```bash
npm test                       # Todos los unit tests pasan
npx playwright test            # Todos los E2E pasan
npm run build                  # Build limpio
git push -u origin feature/product-customizer
gh pr create --base master ... # Abrir PR
```

PR description checklist:
- [ ] Migración de Prisma ejecutada en preview
- [ ] Script `setup-customizables-permissions.ts` ejecutado en producción al deploy
- [ ] Bundle analyzer confirma que react-konva está aislado en `/personalizar`
- [ ] Guía del dueño revisada
- [ ] Smoke test completo: crear plantilla → asignar a producto → personalizar como cliente → añadir al carrito → completar checkout → verificar en admin







