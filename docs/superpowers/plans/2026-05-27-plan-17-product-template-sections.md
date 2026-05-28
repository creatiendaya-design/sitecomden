# Plan 17 — Product Template Sections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir `/productos/[slug]` de un renderer monolítico hardcoded ([components/shop/templates/ProductStandardView.tsx](../../components/shop/templates/ProductStandardView.tsx)) en un sistema editable por theme-sections (al estilo Shopify Online Store 2.0 "main-product template"). El admin define UNA plantilla de producto a nivel tema, reordena sub-bloques de PRODUCT_MAIN, agrega secciones extra debajo (FAQ, IMAGE_WITH_TEXT, etc.), aplica color schemes — todo desde el Theme Customizer existente, sin código por-producto.

**Architecture:** Reusa íntegramente el modelo de Plan 16 ([docs/superpowers/plans/2026-04-30-theme-sections.md](2026-04-30-theme-sections.md)) — `ThemeSection` + `ThemeSectionBlock` + `ThemeSectionGroup`. Solo se agrega el valor `PRODUCT` al enum y los registros del registry. La página `/productos/[slug]` deja de invocar `<ProductStandardView />`; en su lugar fetch-ea las secciones PRODUCT del tema activo y las renderiza por un `ProductSectionsRenderer` que las despacha por tipo. Un `ProductContext` (client-side React Context) provee `product`, `selectedVariant`, `inStock`, `currentPrice` a los sub-bloques que necesitan estado del lado del cliente (variant picker, buy button, price con descuento por variante). El sistema viejo (`Product.template = "LANDING"` + `LandingBlock`) sigue funcionando como fallback; deprecación queda para un plan posterior.

**Migración:** Expand-only (no contract). El enum `ThemeSectionGroup` se amplía con `PRODUCT`; ningún campo existente se renombra ni se borra. Un seed (`scripts/seed-product-template.ts`) crea para cada tema activo una sección PRODUCT_MAIN con los 7 sub-bloques en el orden actual del ProductStandardView (Gallery → Title → Price → Variants → Buy → Meta → Description), de modo que el storefront se ve idéntico al día 1 después de correrlo. Si no se corre el seed, la página cae a un fallback que renderea el `<ProductStandardView />` legacy.

**Tech Stack:** Next.js 16 App Router, Prisma 6.19 + PostgreSQL (Neon), React 19, TypeScript 5, Tailwind v4, Zustand 5, `@dnd-kit`, Zod 4. Reusa `lib/theme-sections/`, `lib/blocks/apply-style.ts`, `actions/theme-sections.ts`, `components/admin/customizer/ThemeSectionGroupEditor.tsx`, `components/shop/theme-sections/_helpers.tsx`.

**No-goals (fuera de alcance, NO implementar):**

- Override por producto (Plan C "per-product template selector"). Plan 17 sólo soporta UNA plantilla a nivel tema.
- Múltiples plantillas de producto por tema (Shopify Online Store 2.0 templates JSON). Plan 17 = una sola.
- Deprecación / borrado de `LandingTemplate` / `LandingBlock` (siguen vivos como compatibilidad).
- Plantilla editable para `/categoria/[slug]` adicional a las `CategoryBlock` (eso ya existe; ver Plan 7).
- Plantilla editable para `/productos` (índice). Sigue como ProductIndexView estático.
- Drag-and-drop entre secciones diferentes (sub-bloques sólo se reordenan dentro de su sección, igual que Plan 16).
- Modificar `ProductLandingView.tsx` (productos con `template = "LANDING"`) — esos siguen con el sistema viejo.
- Per-product visibility flags (mostrar/ocultar PRODUCT_MAIN para un producto puntual) — eso es Plan C.

**Verification convention:** Sin tests automatizados. Cada tarea verifica con `npm run build` (type-check) + smoke manual en el navegador.

**Pre-flight:**

```bash
git checkout master
git pull
git status   # working tree clean
git checkout -b feature/plan-17-product-template-sections
```

---

## Motivación

Hoy `/productos/[slug]` rendea con [components/shop/templates/ProductStandardView.tsx](../../components/shop/templates/ProductStandardView.tsx) (líneas 37-156), un JSX hardcoded con galería + título + precio + stock + acciones + descripción + caja de info. Tiene los siguientes problemas:

1. **Colores hardcoded que no respetan el color scheme** — `text-green-600`, `bg-green-50`, `bg-slate-50`, `text-slate-600` (líneas 83, 123, 130, 138). Estos no usan tokens del tema ni los color schemes de Plan 13.1.
2. **Orden fijo** — el admin no puede mover "Descripción" arriba del "Buy button" sin tocar código.
3. **Layout de galería fijo** — `<ProductImageGallery>` tiene un solo layout; no hay forma de pedir "stacked" o "carousel" desde el admin.
4. **Toggle hardcoded** — no se puede ocultar el bloque de "Información del producto" para un tema minimalista.
5. **Customizer rompe la promesa Shopify** — al elegir "Producto (ejemplo)" la zona Plantilla muestra `"Esta plantilla no admite edición de bloques en esta versión"` (ver [components/admin/customizer/ZoneList.tsx:76-79](../../components/admin/customizer/ZoneList.tsx)).
6. **No hay sección para "productos relacionados", "FAQ", "testimonios" debajo del fold** — el admin tiene `LandingTemplate` para eso pero es un sistema paralelo desconectado del customizer principal y por-producto, no por-tema.

Plan 16 ya resolvió exactamente este patrón para Header / Footer. Plan 17 lo aplica a Producto reutilizando el 90% de la infraestructura.

---

## Modelo de datos

### Enum `ThemeSectionGroup`

**Diff en [prisma/schema.prisma:1552-1555](../../prisma/schema.prisma):**

```diff
 enum ThemeSectionGroup {
   HEADER
   FOOTER
+  PRODUCT
 }
```

### `Theme.sectionCatalog`

**No requiere migración.** `sectionCatalog` es `Json @default("{}")` (línea 1476) — extendemos el tipo TypeScript `ThemeSectionCatalog` en [lib/theme-sections/types.ts:150-153](../../lib/theme-sections/types.ts) sin migración SQL.

**Diff en `lib/theme-sections/types.ts`:**

```diff
 export interface ThemeSectionCatalog {
   header?: string[]
   footer?: string[]
+  product?: string[]
 }
```

### `ThemeSection` + `ThemeSectionBlock`

**Sin cambios.** El `group` ahora puede ser `PRODUCT`. El `type` (string) y `content` (Json) absorben todos los nuevos tipos.

### Plan de migración expand-contract

| Fase | Qué | Reversible | Cuándo |
|---|---|---|---|
| **1. Expand SQL** | `ALTER TYPE "ThemeSectionGroup" ADD VALUE 'PRODUCT';` | Sí (drop value si nadie creó filas todavía) | Task A1 |
| **2. Tipos TS** | `product?: string[]` en `ThemeSectionCatalog` | Sí | Task A1 |
| **3. Seed** | `seed-product-template.ts` crea PRODUCT_MAIN + 7 sub-bloques para cada tema | Sí (borrar filas) | Task F1, después de que renderers + storefront estén listos |
| **4. Contract** | No aplica — nada se borra | — | — |

**Sobre `ALTER TYPE ADD VALUE`:** Postgres no permite revertir esto dentro de una transacción si ya hay filas usando el nuevo valor. Una vez ejecutado el seed, el rollback requiere borrar primero las filas PRODUCT. Documentar esto en el commit message.

---

## Registry — tipos de sección y sub-bloque

**Archivo principal: [lib/theme-sections/registry.ts](../../lib/theme-sections/registry.ts).** Plan 17 agrega:

### Secciones nuevas

| Tipo | Grupos | maxPerGroup | acceptedBlockTypes | Descripción |
|---|---|---|---|---|
| `PRODUCT_MAIN` | `[PRODUCT]` | **1** (obligatoria, única) | Sub-bloques abajo | Galería + info principal. Sólo una instancia, no se puede borrar (UI desactiva el botón). |

### Sub-bloques de PRODUCT_MAIN

| Sub-tipo | maxPerSection | Campos | Notas |
|---|---|---|---|
| `PRODUCT_GALLERY` | 1 | `layout` (enum: carousel/two_column/stacked/grid), `showThumbnails` (bool), `autoplay` (bool, sólo carousel), `aspectRatio` (enum: square/portrait/landscape), `style.colorSchemeId`, `style.padding` | El renderer despacha al sub-componente correcto por layout. |
| `PRODUCT_TITLE` | 1 | `showCategoryBadges` (bool), `showShortDescription` (bool), `headingTag` (enum: h1/h2), `style.colorSchemeId`, `style.typography`, `style.alignment` | h1 por defecto (SEO). |
| `PRODUCT_PRICE` | 1 | `showCompareAt` (bool), `showSavingsBadge` (bool), `currencyPosition` (enum: before/after), `style.colorSchemeId`, `style.typography` | Reacciona a `selectedVariant` vía ProductContext. |
| `PRODUCT_VARIANT_PICKER` | 1 | `swatchSize` (enum: sm/md/lg), `showLabels` (bool), `outOfStockBehavior` (enum: disable/hide/badge), `style.colorSchemeId`, `style.padding` | Stateful client-side. |
| `PRODUCT_BUY_BUTTON` | 1 | `buttonText` (text), `showQuantityPicker` (bool), `quantityMin` (number), `quantityMax` (number), `style.colorSchemeId`, `style.typography`, `style.padding`, `style.cornerRadius` | El "Comprar" CTA. |
| `PRODUCT_DESCRIPTION` | 1 | `heading` (text), `collapsible` (bool), `defaultExpanded` (bool), `style.colorSchemeId`, `style.typography` | Lee `product.description` (Tiptap HTML). |
| `PRODUCT_META` | 1 | `heading` (text), `showSku` (bool), `showWeight` (bool), `showAvailability` (bool), `showBrand` (bool), `showCategories` (bool), `style.colorSchemeId`, `style.padding` | Cada campo toggleable. Reemplaza el `<div className="rounded-lg bg-slate-50">` de [ProductStandardView.tsx:123-151](../../components/shop/templates/ProductStandardView.tsx). |
| `RICH_TEXT` | 5 | `body` (rich-text), `style.colorSchemeId`, `style.typography`, `style.alignment` | Libre. Reuse del schema field `rich-text` existente. |

### Secciones extra (debajo de PRODUCT_MAIN)

Estas YA existen en el registry para HEADER / FOOTER. Para Plan 17 se **extiende `groups`** de cada una agregando `PRODUCT`:

| Tipo | Plan donde nace | Cambio en Plan 17 |
|---|---|---|
| `RICH_TEXT_SECTION` | (nueva en Plan 17, no confundir con sub-bloque `RICH_TEXT` arriba) | Sección standalone (no anidada). `groups: ["PRODUCT", "FOOTER"]`. |
| `IMAGE_WITH_TEXT` | Plan 17 (nueva) | Imagen a un lado, texto al otro. `groups: ["PRODUCT"]`. Campos: `image`, `imagePosition` (left/right), `heading`, `body`, `ctaLabel`, `ctaHref`, style. |
| `FEATURED_COLLECTION` | Plan 17 (nueva) | "Productos relacionados". Campos: `heading`, `source` (enum: same_category/manual_picks/recently_viewed/best_sellers), `productIds` (product-picker[], sólo si source=manual_picks), `limit` (number), `layout` (grid/carousel), style. `groups: ["PRODUCT"]`. |
| `TESTIMONIALS` | Plan 17 (nueva, no confundir con `LandingBlock` TESTIMONIALS) | Bloques `TESTIMONIAL_ITEM` como sub-bloques. `groups: ["PRODUCT"]`. |
| `FAQ_SECTION` | Plan 17 (nueva) | Bloques `FAQ_ITEM` (pregunta + respuesta rich-text). `groups: ["PRODUCT"]`. |

### Diff exacto en [lib/theme-sections/registry.ts](../../lib/theme-sections/registry.ts)

```diff
 import { announcementBarDefinition } from "./schema/announcement-bar"
 import { headerMainDefinition } from "./schema/header-main"
 // ...
+import { productMainDefinition } from "./schema/product-main"
+import { richTextSectionDefinition } from "./schema/rich-text-section"
+import { imageWithTextDefinition } from "./schema/image-with-text"
+import { featuredCollectionDefinition } from "./schema/featured-collection"
+import { testimonialsDefinition } from "./schema/testimonials"
+import { faqSectionDefinition } from "./schema/faq-section"

 const ALL_DEFINITIONS: ThemeSectionDefinition[] = [
   announcementBarDefinition,
   headerMainDefinition,
   // ...
+  productMainDefinition,
+  richTextSectionDefinition,
+  imageWithTextDefinition,
+  featuredCollectionDefinition,
+  testimonialsDefinition,
+  faqSectionDefinition,
 ]
```

### `getAvailableSectionDefinitions` — sin cambios

La función ya filtra por `group` ([lib/theme-sections/registry.ts:51-59](../../lib/theme-sections/registry.ts)): cuando reciba `"PRODUCT"`, devolverá las 6 nuevas + cualquier otra cuyo `groups` incluya `"PRODUCT"`. El catálogo per-tema funciona idéntico.

---

## ProductContext — cómo los sub-bloques leen el estado del producto

### Problema

Los sub-bloques de PRODUCT_MAIN (price, variant picker, buy button) son client-side stateful: el variant picker cambia el variant seleccionado, y eso a su vez actualiza el precio mostrado y el stock disponible. Los renderers actuales reciben todo por props desde `ProductStandardView`. Con sub-bloques independientes necesitamos un canal compartido.

### Solución

Un React Context creado en el wrapper de PRODUCT_MAIN que provee `useProductContext()` a sus descendientes.

**Archivo: `components/shop/theme-sections/product/ProductContext.tsx`** (nuevo).

```ts
"use client"
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

export interface ProductContextValue {
  product: SerializedProduct
  options: ProductOption[]
  variants: SerializedVariant[]
  selectedVariant: SerializedVariant | null
  setSelectedVariant: (v: SerializedVariant | null) => void
  selectedOptions: Record<string, string>
  setSelectedOptions: (next: Record<string, string>) => void
  currentPrice: number
  currentComparePrice: number | null
  inStock: boolean
  currentStock: number
}

const Ctx = createContext<ProductContextValue | null>(null)

export function ProductProvider({ children, ... }: Props) { ... }

export function useProductContext(): ProductContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useProductContext must be used inside ProductProvider")
  return ctx
}
```

### Server-vs-client renderers

- `ProductMain` (wrapper de la sección) es **server component**. Recibe `product`, `variants`, `options` por props y los pasa al `ProductProvider` (client).
- Sub-bloques sin estado (`ProductTitle`, `ProductDescription`, `ProductMeta`, `ProductGallery` excepto carousel) pueden ser server components — leen del prop `product` que viene del wrapper, no del context.
- Sub-bloques con estado (`ProductPrice`, `ProductVariantPicker`, `ProductBuyButton`) son client components y consumen `useProductContext()`.

### Patrón de despacho

```tsx
// components/shop/theme-sections/product/ProductMain.tsx (server)
import { ProductProvider } from "./ProductContext"
import { ProductMainSubBlockDispatcher } from "./ProductMainSubBlockDispatcher"
import { SectionWrapper } from "../_helpers"

export function ProductMain({ section, product, variants, options, ...rest }) {
  return (
    <SectionWrapper section={section}>
      <ProductProvider product={product} variants={variants} options={options} {...rest}>
        <div className="product-detail-grid">
          {section.blocks.map((block) => (
            <ProductMainSubBlockDispatcher key={block.id} block={block} product={product} />
          ))}
        </div>
      </ProductProvider>
    </SectionWrapper>
  )
}
```

---

## Renderers — uno por sub-bloque

### Archivos a crear

```
components/shop/theme-sections/product/
├── ProductContext.tsx                    (client provider)
├── ProductMain.tsx                       (server wrapper)
├── ProductMainSubBlockDispatcher.tsx     (server dispatcher)
├── ProductGallery.tsx                    (server — layout dispatch)
│   ├── gallery-layouts/
│   │   ├── CarouselGallery.tsx           (client)
│   │   ├── TwoColumnGallery.tsx          (server)
│   │   ├── StackedGallery.tsx            (server)
│   │   └── GridGallery.tsx               (server)
├── ProductTitle.tsx                      (server)
├── ProductPrice.tsx                      (client — useProductContext)
├── ProductVariantPicker.tsx              (client — useProductContext)
├── ProductBuyButton.tsx                  (client — useProductContext)
├── ProductDescription.tsx                (server)
├── ProductMeta.tsx                       (server)
├── ProductRichText.tsx                   (server — RICH_TEXT sub-bloque)
│
├── (secciones extra debajo)
├── RichTextSection.tsx                   (server)
├── ImageWithText.tsx                     (server)
├── FeaturedCollection.tsx                (server — fetch productos relacionados)
├── Testimonials.tsx                      (server)
└── FaqSection.tsx                        (client — accordion state)
```

### Tabla detallada

| Renderer | server/client | Lee de | Notas |
|---|---|---|---|
| `ProductMain` | server | props | Wrapper + Provider |
| `ProductGallery` | server | `product.images`, content.layout | Despacha al layout; emite `data-preview-target="subblock:<id>"` con `SubBlockWrapper` |
| `CarouselGallery` | client | props | Carrusel con autoplay opcional |
| `TwoColumnGallery` | server | props | 2 columnas de imágenes |
| `StackedGallery` | server | props | Imágenes una debajo de la otra |
| `GridGallery` | server | props | Grid 2x2 / 3x3 según count |
| `ProductTitle` | server | `product.name`, `product.shortDescription`, `product.categories` | Tag dinámico h1/h2 según content.headingTag |
| `ProductPrice` | client | useProductContext().currentPrice | Reemplaza [components/shop/ProductPrice](../../components/shop/ProductPrice.tsx) pero suscrito al context en vez de a `initialPrice` |
| `ProductVariantPicker` | client | useProductContext() | Conserva la lógica del actual [ProductActions](../../components/shop/ProductActions.tsx) pero sólo la parte de variantes |
| `ProductBuyButton` | client | useProductContext() | Lógica del "Agregar al carrito" actual + quantity picker. Llama a `useCart()` |
| `ProductDescription` | server | `product.description` | Tiptap HTML sanitized vía [lib/blocks/sanitize-rich-text.ts](../../lib/blocks/sanitize-rich-text.ts) |
| `ProductMeta` | server | product | Sin colores hardcoded (los de [ProductStandardView.tsx:123](../../components/shop/templates/ProductStandardView.tsx) `bg-slate-50` desaparecen — se usa el color scheme del sub-bloque) |
| `FeaturedCollection` | server | Prisma fetch | Sin caché propia; se sirve via `unstable_cache` de la page |

### Helpers obligatorios

Cada renderer DEBE usar [`SectionWrapper` / `SubBlockWrapper` / `ArrayItem`](../../components/shop/theme-sections/_helpers.tsx) para que la live-preview convention funcione. Ver [docs/superpowers/guides/customizer-live-preview-conventions.md](../superpowers/guides/customizer-live-preview-conventions.md).

Para texto editable inline (título, descripción, etiqueta de botón) declarar `data-content-field="<fieldName>"` en el elemento que renderea ese texto:

```tsx
<h1 data-content-field="heading">{data.heading}</h1>
<button data-content-field="buttonText">{data.buttonText}</button>
```

### Color schemes en cada wrapper

`SectionWrapper` ya emite `data-color-scheme` automáticamente (línea 65 de [_helpers.tsx](../../components/shop/theme-sections/_helpers.tsx)). No hay que extender el helper. Para sub-bloques que tienen su propio `style.colorSchemeId`, usar `SubBlockWrapper` y dentro un `<div data-color-scheme={dataColorScheme}>` extra (o un `applyThemeSectionStyle` al nivel del sub-bloque).

---

## Página `/productos/[slug]/page.tsx` — cambios

### Antes (línea 407-416)

```tsx
{product.template === "LANDING" ? (
  <ProductLandingView {...templateProps} />
) : (
  <ProductStandardView {...templateProps} />
)}
```

### Después

```tsx
import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ProductSectionsRenderer } from "@/components/shop/theme-sections/product/ProductSectionsRenderer"

// ...dentro de ProductDetailPage:

const productSections = await getThemedSections("PRODUCT", "desktop")

// Renderer pathway:
{product.template === "LANDING" ? (
  <ProductLandingView {...templateProps} />
) : productSections.length > 0 ? (
  <ProductSectionsRenderer
    sections={productSections}
    product={serializedProductFull}
    variants={serializedVariants}
    options={product.options}
    initialPrice={initialPrice}
    initialComparePrice={initialComparePrice}
    inStock={inStock}
    totalStock={totalStock}
    sizeGuide={sizeGuideForView}
    promotions={promotions}
  />
) : (
  // Fallback al renderer hardcoded — Plan 17 backwards compat
  <ProductStandardView {...templateProps} />
)}
```

### Caché y revalidate

[app/(shop)/productos/[slug]/page.tsx:73-79](../../app/(shop)/productos/[slug]/page.tsx) ya cachea por slug con `revalidate: 60` y tags `[product:${slug}, products]`.

**Decisión:** las theme-sections son a nivel TEMA. Cuando un admin guarda secciones PRODUCT, hay que revalidar TODOS los productos. Implementación:

- En `actions/theme-sections.ts`, el `saveThemeSectionGroupVersioned` ya hace `revalidatePath("/")` (ver Task B6 de Plan 16). Extender para llamar `revalidateTag("products")` cuando `group === "PRODUCT"`.
- Esto invalida la caché de TODOS los productos en el próximo request. Es aceptable porque las ediciones de plantilla de producto son raras (vs. cambios de inventario).
- Opcional (Phase 3): cuando `group === "PRODUCT"` también hacer `revalidatePath("/productos/[slug]", "page")` — verificar que Next 16 acepte ese formato.

### JSON-LD / SEO / Tracking

**Sin cambios.** Los `<script type="application/ld+json">` y `<ProductTracking>` siguen viviendo en [page.tsx:393-405](../../app/(shop)/productos/[slug]/page.tsx). Los renderers no tocan SEO.

---

## Customizer — wiring

### page-targets.ts — sin cambios

El target `"product"` (key) sigue construyéndose igual ([components/admin/customizer/page-targets.ts:78-86](../../components/admin/customizer/page-targets.ts)). Lo que cambia es cómo `CustomizerShell` resuelve `editableSurface` y `editorKey` para ese target.

### CustomizerShell — ramificación

**Hoy:** `editableSurface` es `{ kind: "page" | "category", id, title }` (ver [CustomizerShell.tsx:62-65](../../components/admin/customizer/CustomizerShell.tsx)). Cuando el target es `"product"`, `editableSurface` es `null` → `editorKey` es `null` → `ZoneList` muestra el cartel gris.

**Plan 17:** Cuando el target es `"product"`, NO se usa `EmbeddedBlocksEditor` (que requiere un `editableSurface` para guardar `LandingBlock`). En su lugar, la zona "Plantilla" muestra un `ThemeSectionGroupEditor group="PRODUCT" catalog={sectionCatalog} />` — IDÉNTICO a las zonas Encabezado / Pie de página.

**Diff en [ZoneList.tsx:62-80](../../components/admin/customizer/ZoneList.tsx):**

```diff
-      <Zone label="Plantilla" icon={LayoutTemplate} sublabel={targetLabel}>
-        {editorKey ? (
-          <EmbeddedBlocksEditor ... />
-        ) : (
-          <div className="px-4 py-3 text-xs text-muted-foreground">
-            Esta plantilla no admite edición de bloques en esta versión.
-          </div>
-        )}
-      </Zone>
+      <Zone label="Plantilla" icon={LayoutTemplate} sublabel={targetLabel}>
+        {templateMode === "product" ? (
+          <ThemeSectionGroupEditor group="PRODUCT" catalog={sectionCatalog} />
+        ) : editorKey ? (
+          <EmbeddedBlocksEditor ... />
+        ) : (
+          <div className="px-4 py-3 text-xs text-muted-foreground">
+            Esta plantilla no admite edición de bloques en esta versión.
+          </div>
+        )}
+      </Zone>
```

Donde `templateMode` es una nueva prop derivada en `CustomizerShell` a partir de `currentTarget?.key === "product"`.

### CustomizerShell — autosave para grupo PRODUCT

Replicar el patrón de `useDebouncedSaveGroup` ([CustomizerShell.tsx:510-529](../../components/admin/customizer/CustomizerShell.tsx)) agregando una tercera invocación para `PRODUCT`. Esto requiere que el store `theme-sections-store.ts` también exponga `product: SectionDraft[]` y `productDirty: boolean`.

**Diff en [theme-sections-store.ts]:**

```diff
 interface Store {
   themeId: string | null
   header: SectionDraft[]
   footer: SectionDraft[]
+  product: SectionDraft[]
   headerDirty: boolean
   footerDirty: boolean
+  productDirty: boolean

-  hydrate: (themeId: string, header: ThemeSectionRow[], footer: ThemeSectionRow[]) => void
+  hydrate: (themeId: string, header: ThemeSectionRow[], footer: ThemeSectionRow[], product: ThemeSectionRow[]) => void
   // ...
 }
```

Todos los métodos del store (`addSection`, `removeSection`, `reorderSections`, etc.) ya reciben `group: ThemeSectionGroup`; con el enum extendido y el array `product` agregado, su lógica se generaliza con un helper interno:

```ts
function selectGroupKey(group: ThemeSectionGroup): "header" | "footer" | "product" {
  if (group === "HEADER") return "header"
  if (group === "FOOTER") return "footer"
  return "product"
}
```

Reemplazar todos los `group === "HEADER" ? "header" : "footer"` por `selectGroupKey(group)`.

### AddSectionPanel — catálogo permisivo por defecto

`AddSectionPanel` ya recibe `group: ThemeSectionGroup` y filtra por `getAvailableSectionDefinitions(group, catalog)`. Con el cambio en `ThemeSectionCatalog.product`, todo funciona. Cuando `sectionCatalog.product` está vacío/undefined, todos los tipos cuyo `groups` incluye `"PRODUCT"` aparecen.

### app/admin/personalizar/temas/[themeId]/customize/page.tsx

**Diff:**

```diff
-const [headerSections, footerSections] = await Promise.all([
-  listThemeSections(theme.id, "HEADER"),
-  listThemeSections(theme.id, "FOOTER"),
-])
+const [headerSections, footerSections, productSections] = await Promise.all([
+  listThemeSections(theme.id, "HEADER"),
+  listThemeSections(theme.id, "FOOTER"),
+  listThemeSections(theme.id, "PRODUCT"),
+])
```

Y pasar `productSections={productSections}` a `<CustomizerShell />`.

---

## Server actions — qué reusa, qué se agrega

### Reuso completo

Toda la API de [actions/theme-sections.ts](../../actions/theme-sections.ts) funciona sin cambios:

- `addThemeSection(themeId, "PRODUCT", "PRODUCT_MAIN")` → válido (asumiendo registry actualizado).
- `removeThemeSection(sectionId)` → válido.
- `reorderThemeSections(themeId, "PRODUCT", orderedIds)` → válido.
- `saveThemeSectionGroupVersioned(themeId, "PRODUCT", sections)` → válido (zod schema acepta el enum string).

### Cambios mínimos

1. **`addThemeSectionSchema` Zod** ([actions/theme-sections.ts]) acepta el enum literal. Cambiar:

   ```diff
   - group: z.enum(["HEADER", "FOOTER"]),
   + group: z.enum(["HEADER", "FOOTER", "PRODUCT"]),
   ```

   Lo mismo para `reorderSectionsSchema` y `saveGroupSchema`.

2. **Invalidación de caché en `saveThemeSectionGroupVersioned`** — agregar:

   ```ts
   if (input.group === "PRODUCT") {
     revalidateTag("products")
   }
   ```

3. **`listThemeSections(themeId, group)`** — sin cambios.

### Concurrencia (Plan 18)

Toda la API ya usa `*Versioned` con `version: Int` en `ThemeSection` / `ThemeSectionBlock` ([prisma/schema.prisma:1527-1528, 1546-1547](../../prisma/schema.prisma)). El batch save retorna `SaveResult<...>` que el `CustomizerShell` ya consume. Sin cambios.

### Live preview de PRODUCT_MAIN sub-bloques

El hook [useLivePreviewOverrides](../../components/admin/customizer/useLivePreviewOverrides.ts) ya funciona con cualquier sub-bloque que use `SubBlockWrapper`. Para que el variant picker / buy button reflejen cambios de texto inline (botón "Comprar" → "Comprar ahora"), los renderers DEBEN declarar `data-content-field="buttonText"` en el `<button>`.

---

## Orden de renderizado en la página

```
<ProductTracking />
<JSON-LD />
<JSON-LD />

<ProductSectionsRenderer sections={productSections}>
  ↓ map por position asc, filtrando enabled=true
  ├── [position 0] PRODUCT_MAIN (la sección obligatoria con todos los sub-bloques)
  ├── [position 1+] secciones extra opcionales (FEATURED_COLLECTION, FAQ, ...)
  └── ...

<LandingBlocksRenderer blocks={renderableLandingBlocks} />
  ↓ legacy — Plan 17 NO toca esto
  ↓ Los LandingBlock siguen renderizándose DESPUÉS de las theme-sections
```

**Regla:** PRODUCT_MAIN siempre aparece. La UI del customizer DESACTIVA el botón "Eliminar" en PRODUCT_MAIN (icono basurero gris). El admin tampoco la puede mover a position > 0 (drag-and-drop la bloquea con `disabled` en `useSortable`).

**Compatibilidad con LandingBlock:** los `LandingBlock` de un producto (sistema viejo, ya resueltos en [page.tsx:265-276](../../app/(shop)/productos/[slug]/page.tsx) por `resolveProductBlocksFromLoaded`) se renderean DESPUÉS de las theme-sections. Si un producto tiene 0 theme-sections (caso degenerado) pero sí LandingBlock, sólo se ven los LandingBlock — pero NO el `ProductStandardView`. Si tiene 0 theme-sections Y 0 LandingBlock, el fallback al `<ProductStandardView />` legacy se activa (ver sección "Migración / backfill").

---

## Color schemes — confirmación

`SectionWrapper` en [_helpers.tsx:65-66](../../components/shop/theme-sections/_helpers.tsx) ya emite `data-color-scheme={dataColorScheme}` automáticamente. Cada sub-bloque de PRODUCT_MAIN usará su propio `SubBlockWrapper` (que NO emite `data-color-scheme` por defecto). Para sub-bloques con scheme propio, envolverlos manualmente:

```tsx
const { className, style, dataColorScheme } = applyThemeSectionStyle(block.content.style)
return (
  <SubBlockWrapper block={block} className={className} style={style}>
    <div data-color-scheme={dataColorScheme}>
      ...
    </div>
  </SubBlockWrapper>
)
```

Alternativa más limpia: extender `SubBlockWrapper` con un opcional `colorScheme?: string` que emite el atributo. Decisión documentada: extender el helper. **Diff:**

```diff
 interface SubBlockWrapperProps {
   block: { id: string }
   as?: SectionTag
   className?: string
   style?: CSSProperties
+  colorScheme?: string
   children: ReactNode
 }

-export function SubBlockWrapper({ block, as = "div", className, style, children }: SubBlockWrapperProps) {
+export function SubBlockWrapper({ block, as = "div", className, style, colorScheme, children }: SubBlockWrapperProps) {
   const Tag = as
   return (
     <Tag
       className={className}
       style={style}
       data-preview-target={`subblock:${block.id}`}
+      data-color-scheme={colorScheme}
     >
       {children}
     </Tag>
   )
 }
```

---

## Seed inicial

**Archivo: `scripts/seed-product-template.ts`** (nuevo).

Itera todos los temas activos. Por cada uno:

1. Si ya existe un `ThemeSection` con `group="PRODUCT"`, **skip** (idempotente).
2. Crea `PRODUCT_MAIN` en `position: 0` con `defaultContent` del registry.
3. Crea los 7 sub-bloques en este orden:

   ```
   position 0 — PRODUCT_GALLERY (layout: "two_column", showThumbnails: true, autoplay: false, aspectRatio: "square")
   position 1 — PRODUCT_TITLE (showCategoryBadges: true, showShortDescription: true, headingTag: "h1")
   position 2 — PRODUCT_PRICE (showCompareAt: true, showSavingsBadge: false, currencyPosition: "before")
   position 3 — PRODUCT_VARIANT_PICKER (swatchSize: "md", showLabels: true, outOfStockBehavior: "disable")
   position 4 — PRODUCT_BUY_BUTTON (buttonText: "Agregar al carrito", showQuantityPicker: true, quantityMin: 1, quantityMax: 99)
   position 5 — PRODUCT_DESCRIPTION (heading: "Descripción", collapsible: false, defaultExpanded: true)
   position 6 — PRODUCT_META (heading: "Información del producto", showSku: true, showWeight: true, showAvailability: true, showBrand: false, showCategories: false)
   ```

4. Imprime resumen `Seeded N themes, skipped M.`

Uso: `npx tsx scripts/seed-product-template.ts`.

---

## Migración / backfill — comportamiento por defecto

### Sin correr el seed

`/productos/[slug]` cae al fallback `<ProductStandardView />`. Esto preserva el comportamiento actual byte-por-byte. Verificable porque la condición es `productSections.length > 0 ? ... : <ProductStandardView />`.

### Después del seed

Cada producto se ve idéntico al `ProductStandardView` original (excepto que los colores `slate-50` / `green-600` se reemplazan por el color scheme — esto es un cambio visual menor, intencional y deseable).

### Producto con `template = "LANDING"`

**Sin cambios**, va a `<ProductLandingView />` siempre. La condición principal en page.tsx prioriza `product.template === "LANDING"`.

---

## Permisos

El permiso `themes:update` ya existe (slug colon-format en [lib/permissions.ts](../../lib/permissions.ts), dot-format `themes.update` en la wire). Como Plan 17 sólo edita `Theme.sectionCatalog` + crea filas `ThemeSection`, **no requiere permission slug nuevo**.

Verificar que `protectRoute("themes:update")` aparezca en `addThemeSection`, `removeThemeSection`, `reorderThemeSections`, `saveThemeSectionGroupVersioned` para `PRODUCT` igual que para HEADER/FOOTER. Ya están protegidas — sin cambios.

---

## Lista de archivos a crear / modificar

### CREATE

```
lib/theme-sections/schema/product-main.ts
lib/theme-sections/schema/product-blocks/product-gallery.ts
lib/theme-sections/schema/product-blocks/product-title.ts
lib/theme-sections/schema/product-blocks/product-price.ts
lib/theme-sections/schema/product-blocks/product-variant-picker.ts
lib/theme-sections/schema/product-blocks/product-buy-button.ts
lib/theme-sections/schema/product-blocks/product-description.ts
lib/theme-sections/schema/product-blocks/product-meta.ts
lib/theme-sections/schema/product-blocks/product-rich-text.ts
lib/theme-sections/schema/rich-text-section.ts
lib/theme-sections/schema/image-with-text.ts
lib/theme-sections/schema/featured-collection.ts
lib/theme-sections/schema/testimonials.ts
lib/theme-sections/schema/faq-section.ts

components/shop/theme-sections/product/ProductContext.tsx
components/shop/theme-sections/product/ProductMain.tsx
components/shop/theme-sections/product/ProductMainSubBlockDispatcher.tsx
components/shop/theme-sections/product/ProductSectionsRenderer.tsx
components/shop/theme-sections/product/ProductGallery.tsx
components/shop/theme-sections/product/gallery-layouts/CarouselGallery.tsx
components/shop/theme-sections/product/gallery-layouts/TwoColumnGallery.tsx
components/shop/theme-sections/product/gallery-layouts/StackedGallery.tsx
components/shop/theme-sections/product/gallery-layouts/GridGallery.tsx
components/shop/theme-sections/product/ProductTitle.tsx
components/shop/theme-sections/product/ProductPrice.tsx
components/shop/theme-sections/product/ProductVariantPicker.tsx
components/shop/theme-sections/product/ProductBuyButton.tsx
components/shop/theme-sections/product/ProductDescription.tsx
components/shop/theme-sections/product/ProductMeta.tsx
components/shop/theme-sections/product/ProductRichText.tsx
components/shop/theme-sections/product/RichTextSection.tsx
components/shop/theme-sections/product/ImageWithText.tsx
components/shop/theme-sections/product/FeaturedCollection.tsx
components/shop/theme-sections/product/Testimonials.tsx
components/shop/theme-sections/product/FaqSection.tsx

scripts/seed-product-template.ts

prisma/migrations/<timestamp>_product_template_sections/migration.sql
```

### MODIFY

```
prisma/schema.prisma                                        (enum ThemeSectionGroup)
lib/theme-sections/types.ts                                 (ThemeSectionCatalog.product)
lib/theme-sections/registry.ts                              (registrar 6 nuevas definiciones)
actions/theme-sections.ts                                   (Zod enums + revalidateTag("products"))
components/shop/theme-sections/_helpers.tsx                 (SubBlockWrapper colorScheme prop)
components/admin/customizer/theme-sections-store.ts         (product array + productDirty + selectGroupKey)
components/admin/customizer/ZoneList.tsx                    (templateMode branching)
components/admin/customizer/CustomizerShell.tsx             (hydrate product, useDebouncedSaveGroup product, route templateMode)
app/admin/personalizar/temas/[themeId]/customize/page.tsx   (fetch productSections + pass to shell)
app/(shop)/productos/[slug]/page.tsx                        (getThemedSections("PRODUCT") + dispatch)
```

### DELETE

**Ninguno.** `ProductStandardView.tsx` se mantiene como fallback (sin uso directo si el seed corrió). Su deprecación queda para un plan futuro.

---

## Pasos de implementación (task list)

### Phase A — Schema + tipos + registry skeleton

#### Task A1: Enum + tipos

**Files:** `prisma/schema.prisma`, `lib/theme-sections/types.ts`.

- [ ] **Step 1: Editar `prisma/schema.prisma`** — agregar `PRODUCT` al enum `ThemeSectionGroup` (línea 1552).
- [ ] **Step 2:** `npx prisma migrate dev --name product_template_sections --create-only`.
- [ ] **Step 3:** Inspeccionar SQL — debe contener `ALTER TYPE "ThemeSectionGroup" ADD VALUE 'PRODUCT';`. No debe haber otros cambios.
- [ ] **Step 4:** `npx prisma migrate dev` (apply).
- [ ] **Step 5:** Editar `lib/theme-sections/types.ts` — agregar `product?: string[]` a `ThemeSectionCatalog`.
- [ ] **Step 6:** `npm run build` — passes.
- [ ] **Step 7:** Commit `feat(plan-17): add PRODUCT to ThemeSectionGroup enum`.

#### Task A2: Zod enum updates en actions

**Files:** `actions/theme-sections.ts`.

- [ ] **Step 1:** Reemplazar todas las apariciones de `z.enum(["HEADER", "FOOTER"])` por `z.enum(["HEADER", "FOOTER", "PRODUCT"])`. Hay 4-5 schemas (addThemeSection, reorderThemeSections, saveThemeSectionGroupVersioned, listThemeSections, etc.).
- [ ] **Step 2:** Importar `revalidateTag` de `next/cache` (si no está ya importado).
- [ ] **Step 3:** En `saveThemeSectionGroupVersioned`, después del `revalidatePath("/")`, agregar:

  ```ts
  if (input.group === "PRODUCT") {
    revalidateTag("products")
  }
  ```

- [ ] **Step 4:** `npm run build` — passes.
- [ ] **Step 5:** Commit `feat(plan-17): zod enum + cache invalidation for PRODUCT group`.

#### Task A3: SubBlockWrapper colorScheme prop

**Files:** `components/shop/theme-sections/_helpers.tsx`.

- [ ] **Step 1:** Agregar `colorScheme?: string` a `SubBlockWrapperProps`.
- [ ] **Step 2:** Pasar `data-color-scheme={colorScheme}` al `<Tag>`.
- [ ] **Step 3:** `npm run build`.
- [ ] **Step 4:** Commit `feat(plan-17): SubBlockWrapper accepts colorScheme prop`.

### Phase B — Registry definitions

#### Task B1: PRODUCT_MAIN definition

**Files:** `lib/theme-sections/schema/product-main.ts` + 8 sub-files en `lib/theme-sections/schema/product-blocks/`.

- [ ] **Step 1:** Crear `lib/theme-sections/schema/product-blocks/product-gallery.ts`:

  ```ts
  import { Image as ImageIcon } from "lucide-react"
  import type { ThemeSectionBlockDefinition } from "../../types"

  export const productGalleryDefinition: ThemeSectionBlockDefinition = {
    type: "PRODUCT_GALLERY",
    label: "Galería",
    icon: ImageIcon,
    maxPerSection: 1,
    fields: [
      {
        kind: "select",
        name: "layout",
        label: "Layout",
        options: [
          { value: "carousel", label: "Carrusel" },
          { value: "two_column", label: "Dos columnas" },
          { value: "stacked", label: "Apilado" },
          { value: "grid", label: "Cuadrícula" },
        ],
      },
      { kind: "boolean", name: "showThumbnails", label: "Mostrar miniaturas" },
      { kind: "boolean", name: "autoplay", label: "Reproducción automática (sólo carrusel)" },
      {
        kind: "select",
        name: "aspectRatio",
        label: "Relación de aspecto",
        options: [
          { value: "square", label: "Cuadrada" },
          { value: "portrait", label: "Vertical" },
          { value: "landscape", label: "Horizontal" },
        ],
      },
      { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
      { kind: "padding", name: "style.padding", label: "Espaciado" },
    ],
    defaultContent: {
      layout: "two_column",
      showThumbnails: true,
      autoplay: false,
      aspectRatio: "square",
      style: {},
    },
  }
  ```

- [ ] **Step 2:** Crear los 7 sub-bloques restantes con el mismo patrón (ver tabla "Sub-bloques de PRODUCT_MAIN").
- [ ] **Step 3:** Crear `lib/theme-sections/schema/product-main.ts`:

  ```ts
  import { LayoutGrid } from "lucide-react"
  import type { ThemeSectionDefinition } from "../types"
  import { productGalleryDefinition } from "./product-blocks/product-gallery"
  import { productTitleDefinition } from "./product-blocks/product-title"
  // ... import the other 6

  export const productMainDefinition: ThemeSectionDefinition = {
    type: "PRODUCT_MAIN",
    groups: ["PRODUCT"],
    label: "Producto principal",
    description: "Galería + título + precio + variantes + comprar. Sección obligatoria.",
    icon: LayoutGrid,
    maxPerGroup: 1,
    fields: [
      { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
      { kind: "padding", name: "style.padding", label: "Espaciado" },
    ],
    acceptedBlockTypes: [
      productGalleryDefinition,
      productTitleDefinition,
      productPriceDefinition,
      productVariantPickerDefinition,
      productBuyButtonDefinition,
      productDescriptionDefinition,
      productMetaDefinition,
      productRichTextDefinition,
    ],
    defaultContent: { style: {} },
    defaultBlocks: [
      { type: "PRODUCT_GALLERY", content: productGalleryDefinition.defaultContent },
      { type: "PRODUCT_TITLE", content: productTitleDefinition.defaultContent },
      { type: "PRODUCT_PRICE", content: productPriceDefinition.defaultContent },
      { type: "PRODUCT_VARIANT_PICKER", content: productVariantPickerDefinition.defaultContent },
      { type: "PRODUCT_BUY_BUTTON", content: productBuyButtonDefinition.defaultContent },
      { type: "PRODUCT_DESCRIPTION", content: productDescriptionDefinition.defaultContent },
      { type: "PRODUCT_META", content: productMetaDefinition.defaultContent },
    ],
  }
  ```

- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): PRODUCT_MAIN definition + 8 sub-block schemas`.

#### Task B2: Extra sections (5 archivos)

**Files:** `lib/theme-sections/schema/rich-text-section.ts`, `image-with-text.ts`, `featured-collection.ts`, `testimonials.ts`, `faq-section.ts`.

- [ ] **Step 1:** Crear `rich-text-section.ts` (sin sub-blocks, body rich-text).
- [ ] **Step 2:** Crear `image-with-text.ts` (image, imagePosition, heading, body, ctaLabel, ctaHref).
- [ ] **Step 3:** Crear `featured-collection.ts` (heading, source enum, productIds[], limit, layout). El field `productIds` usa el custom `product-picker` que ya existe en el page-builder; si no existe en `FormField`, agregarlo y registrar el renderer.
- [ ] **Step 4:** Crear `testimonials.ts` con sub-block `TESTIMONIAL_ITEM` (name, role, quote, avatar).
- [ ] **Step 5:** Crear `faq-section.ts` con sub-block `FAQ_ITEM` (question, answer rich-text).
- [ ] **Step 6:** `npm run build`.
- [ ] **Step 7:** Commit `feat(plan-17): 5 extra section definitions for PRODUCT group`.

#### Task B3: Registry assembly

**Files:** `lib/theme-sections/registry.ts`.

- [ ] **Step 1:** Importar las 6 nuevas definiciones y agregar al array `ALL_DEFINITIONS`.
- [ ] **Step 2:** `npm run build`.
- [ ] **Step 3:** Commit `feat(plan-17): register product sections in theme-sections registry`.

### Phase C — Storefront renderers (server + client)

#### Task C1: ProductContext

**Files:** `components/shop/theme-sections/product/ProductContext.tsx`.

- [ ] **Step 1:** Definir interface `ProductContextValue` con shape detallado.
- [ ] **Step 2:** Crear `ProductProvider` que usa `useState` para `selectedVariant` y `selectedOptions`, deriva `currentPrice`, `currentComparePrice`, `inStock`, `currentStock` con `useMemo`.
- [ ] **Step 3:** Exportar `useProductContext()` con guard.
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): ProductContext client provider`.

#### Task C2: PRODUCT_MAIN wrapper + dispatcher

**Files:** `ProductMain.tsx`, `ProductMainSubBlockDispatcher.tsx`.

- [ ] **Step 1:** `ProductMain` es server component. Envuelve children en `ProductProvider`. Usa `SectionWrapper` para el contenedor outer. Renderea sub-bloques mapeando `section.blocks` por `ProductMainSubBlockDispatcher`.
- [ ] **Step 2:** El dispatcher es server. Mapa `block.type → componente`. Cuando el componente es client (price / variant-picker / buy-button), se pasa como hijo dentro del Provider.
- [ ] **Step 3:** `npm run build`.
- [ ] **Step 4:** Commit `feat(plan-17): ProductMain wrapper + dispatcher`.

#### Task C3: Sub-bloques sin estado (server)

**Files:** `ProductTitle.tsx`, `ProductDescription.tsx`, `ProductMeta.tsx`, `ProductRichText.tsx`.

- [ ] **Step 1:** `ProductTitle.tsx` — leer `product.name`, `product.shortDescription`, `product.categories`. Aplicar `data-content-field="heading"` al h1/h2. Toggles `showCategoryBadges`, `showShortDescription`.
- [ ] **Step 2:** `ProductDescription.tsx` — leer `product.description`. Sanitizar con `sanitizeRichText`. Si `collapsible`, envolver en un `<details>` HTML5 (sin JS).
- [ ] **Step 3:** `ProductMeta.tsx` — replicar el bloque `<div className="rounded-lg bg-slate-50 ...">` de [ProductStandardView.tsx:123-151](../../components/shop/templates/ProductStandardView.tsx) PERO sin colores hardcoded. Toggles individuales por campo.
- [ ] **Step 4:** `ProductRichText.tsx` — body rich-text para el sub-bloque RICH_TEXT.
- [ ] **Step 5:** `npm run build`.
- [ ] **Step 6:** Commit `feat(plan-17): server renderers (Title, Description, Meta, RichText)`.

#### Task C4: Sub-bloques con estado (client)

**Files:** `ProductPrice.tsx`, `ProductVariantPicker.tsx`, `ProductBuyButton.tsx`.

- [ ] **Step 1:** `ProductPrice.tsx` — `"use client"`. Lee `useProductContext().currentPrice` y `currentComparePrice`. Reusa la lógica de formato de [components/shop/ProductPrice.tsx](../../components/shop/ProductPrice.tsx) pero suscrito al context. Si `showSavingsBadge` y `compareAtPrice > price`, muestra "-X%".
- [ ] **Step 2:** `ProductVariantPicker.tsx` — extraer la lógica de variant selection de [components/shop/ProductActions.tsx](../../components/shop/ProductActions.tsx). Mantener la UX existente (swatches o select según `swatchType`). Al cambiar variant, llamar `setSelectedVariant` del context.
- [ ] **Step 3:** `ProductBuyButton.tsx` — botón "Agregar al carrito" + quantity picker. Llama a `useCart().addToCart()` (Zustand store actual). Respeta `inStock` del context (disabled si false). `data-content-field="buttonText"` en el botón.
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Smoke local: agregar el seed corre (Phase F), abrir un producto, cambiar variant → precio se actualiza. Agregar al carrito → CartCounter del header sube.
- [ ] **Step 6:** Commit `feat(plan-17): client renderers (Price, VariantPicker, BuyButton)`.

#### Task C5: ProductGallery + 4 layouts

**Files:** `ProductGallery.tsx` + `gallery-layouts/*.tsx`.

- [ ] **Step 1:** `ProductGallery.tsx` (server) — dispatcher por `content.layout`. Devuelve el componente correcto pasando `images={product.images}` y `aspectRatio`.
- [ ] **Step 2:** `CarouselGallery.tsx` (client) — usar un component existente si hay (verificar `components/shop/ProductImageGallery.tsx`), o un slider simple con keyboard nav.
- [ ] **Step 3:** `TwoColumnGallery.tsx` (server) — grid 2x∞ de imágenes.
- [ ] **Step 4:** `StackedGallery.tsx` (server) — stack vertical, una por una.
- [ ] **Step 5:** `GridGallery.tsx` (server) — grid 2x2 si <=4 imgs, 3x3 si más.
- [ ] **Step 6:** `npm run build`.
- [ ] **Step 7:** Commit `feat(plan-17): ProductGallery dispatcher + 4 layouts`.

#### Task C6: Extra sections renderers

**Files:** `RichTextSection.tsx`, `ImageWithText.tsx`, `FeaturedCollection.tsx`, `Testimonials.tsx`, `FaqSection.tsx`.

- [ ] **Step 1:** `RichTextSection.tsx` (server) — sanitize body, render dentro de `SectionWrapper`.
- [ ] **Step 2:** `ImageWithText.tsx` (server) — flex row con image + texto, posición controlada por `imagePosition`.
- [ ] **Step 3:** `FeaturedCollection.tsx` (server) — fetch productos por `source`:
   - `same_category` → query por categorías del producto actual. Requiere prop adicional `currentProductId` para excluir.
   - `manual_picks` → `productIds` directo.
   - `recently_viewed` → cookie / localStorage; primer iteración hardcodea bestsellers.
   - `best_sellers` → query por `Order` count.
   Render con `ProductCard` existente.
- [ ] **Step 4:** `Testimonials.tsx` (server) — map `section.blocks` por `TESTIMONIAL_ITEM`, render con `ArrayItem` wrapper.
- [ ] **Step 5:** `FaqSection.tsx` (client por accordion state) — map `section.blocks`, accordion con Radix `Accordion`.
- [ ] **Step 6:** `npm run build`.
- [ ] **Step 7:** Commit `feat(plan-17): 5 extra-section renderers`.

#### Task C7: ProductSectionsRenderer

**Files:** `ProductSectionsRenderer.tsx`.

- [ ] **Step 1:** Server component. Recibe `sections: ResolvedThemeSection[]` + props del producto. Mapea por type → componente. PRODUCT_MAIN inyecta `product`, `variants`, `options`, `initialPrice`, etc. Las demás secciones solo reciben `section` (+ `currentProductId` para FEATURED_COLLECTION).
- [ ] **Step 2:** `npm run build`.
- [ ] **Step 3:** Commit `feat(plan-17): ProductSectionsRenderer dispatcher`.

### Phase D — Customizer wiring

#### Task D1: theme-sections-store extension

**Files:** `components/admin/customizer/theme-sections-store.ts`.

- [ ] **Step 1:** Agregar `product: SectionDraft[]` + `productDirty: boolean` al store.
- [ ] **Step 2:** Refactor de todos los métodos para usar `selectGroupKey(group)` helper.
- [ ] **Step 3:** `hydrate` ahora acepta `product: ThemeSectionRow[]` (compatible con `0` si Plan 17 todavía no rodó migración en algún tema).
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): extend theme-sections-store with product group`.

#### Task D2: CustomizerShell wiring

**Files:** `components/admin/customizer/CustomizerShell.tsx`, `app/admin/personalizar/temas/[themeId]/customize/page.tsx`.

- [ ] **Step 1:** En el server component `page.tsx`, fetch-ear `productSections` con `listThemeSections(theme.id, "PRODUCT")`. Pasarlo a `<CustomizerShell />`.
- [ ] **Step 2:** En `CustomizerShell`, agregar `productSections: ThemeSectionRow[]` a Props. Pasar al hydrate. Agregar tercer `useDebouncedSaveGroup(theme.id, "PRODUCT", ...)`.
- [ ] **Step 3:** Calcular `templateMode = currentTarget?.key === "product" ? "product" : "page-or-category"`. Pasar a `ZoneList`.
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): CustomizerShell wires product sections`.

#### Task D3: ZoneList branching

**Files:** `components/admin/customizer/ZoneList.tsx`.

- [ ] **Step 1:** Agregar prop `templateMode: "product" | "page-or-category"`.
- [ ] **Step 2:** Condicional: si `templateMode === "product"` renderea `<ThemeSectionGroupEditor group="PRODUCT" catalog={sectionCatalog} />` en la zona Plantilla; si no, mantiene el `EmbeddedBlocksEditor` actual.
- [ ] **Step 3:** Smoke: abrir customizer en target "product", confirmar que la zona Plantilla muestra el editor de secciones (con el PRODUCT_MAIN seeded).
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): ZoneList renders product sections editor`.

#### Task D4: PRODUCT_MAIN — gate "Eliminar" en UI

**Files:** `components/admin/customizer/ThemeSectionGroupEditor.tsx`.

- [ ] **Step 1:** En `SortableSectionRow`, deshabilitar el botón "Eliminar" cuando `section.type === "PRODUCT_MAIN"`. Tooltip: "La sección principal no se puede eliminar."
- [ ] **Step 2:** Deshabilitar drag (no permitir mover PRODUCT_MAIN de position 0). En `useSortable`, pasar `disabled: section.type === "PRODUCT_MAIN"`.
- [ ] **Step 3:** En `addSection` server action, validar que no se agregue una segunda PRODUCT_MAIN (ya cubierto por `maxPerGroup: 1`).
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): lock PRODUCT_MAIN against deletion/reorder in customizer`.

### Phase E — Storefront integration

#### Task E1: page.tsx switch

**Files:** `app/(shop)/productos/[slug]/page.tsx`.

- [ ] **Step 1:** Importar `getThemedSections` y `ProductSectionsRenderer`.
- [ ] **Step 2:** Fetch-ear `productSections = await getThemedSections("PRODUCT", "desktop")`. NOTA: este fetch puede convivir con el `unstable_cache` del producto — las sections vienen del tema activo, no del producto. Considerar otro `unstable_cache` con tag `theme-sections:PRODUCT`.
- [ ] **Step 3:** Reemplazar el ternario `template === "LANDING" ? ProductLandingView : ProductStandardView` con el ternario triple descrito en sección "Página".
- [ ] **Step 4:** Smoke con un seed corrido: producto se ve idéntico al ProductStandardView. Sin seed: cae al fallback ProductStandardView.
- [ ] **Step 5:** `npm run build`.
- [ ] **Step 6:** Commit `feat(plan-17): wire ProductSectionsRenderer into product detail page`.

### Phase F — Seed + verificación

#### Task F1: Seed script

**Files:** `scripts/seed-product-template.ts`.

- [ ] **Step 1:** Crear script idempotente que itera `prisma.theme.findMany()`, por cada uno verifica si ya hay `themeSection` con group=PRODUCT (skip), y si no crea PRODUCT_MAIN + 7 sub-bloques con `prisma.$transaction`.
- [ ] **Step 2:** `npx tsx scripts/seed-product-template.ts`. Output: `Seeded N themes, skipped 0.`.
- [ ] **Step 3:** Re-run para verificar idempotency: `Seeded 0, skipped N.`.
- [ ] **Step 4:** `npm run build`.
- [ ] **Step 5:** Commit `feat(plan-17): seed script for default product template`.

#### Task F2: Smoke E2E

- [ ] **Step 1:** `npm run dev`.
- [ ] **Step 2:** Abrir `http://localhost:3000/productos/<slug>` — render idéntico al pre-seed (con colores migrados al color scheme).
- [ ] **Step 3:** Abrir `http://localhost:3000/admin/personalizar/temas/<id>/customize?target=product`.
- [ ] **Step 4:** Zona Plantilla muestra `PRODUCT_MAIN` expandido con sus 7 sub-bloques. Click en PRODUCT_GALLERY → right sidebar muestra Layout / Mostrar miniaturas / etc.
- [ ] **Step 5:** Cambiar `layout` a "stacked" → iframe refleja el cambio (autosave + revalidate).
- [ ] **Step 6:** Drag PRODUCT_DESCRIPTION arriba de PRODUCT_VARIANT_PICKER → reordena en iframe.
- [ ] **Step 7:** Click "+ Agregar sección" → ver FAQ_SECTION, FEATURED_COLLECTION, etc. Agregar una. Aparece debajo en el iframe.
- [ ] **Step 8:** Click PRODUCT_MAIN → botón Eliminar deshabilitado. Drag bloqueado.
- [ ] **Step 9:** Toggle ojo (visibility) en PRODUCT_META → desaparece del iframe.
- [ ] **Step 10:** Recargar customizer → estado persistido.

### Phase G — PR

- [ ] **Step 1:** `git push -u origin feature/plan-17-product-template-sections`.
- [ ] **Step 2:** `gh pr create --title "Plan 17 — Product template sections" --body ...`.

---

## Riesgos y mitigaciones

### Riesgo: Caché `unstable_cache` del producto no se invalida al editar secciones

**Impacto:** Admin guarda cambio de plantilla, abre producto, ve el viejo. Espera 60s.

**Mitigación:** Task A2 agrega `revalidateTag("products")` cuando `group === "PRODUCT"`. El tag `"products"` ya existe en el `unstable_cache` de [page.tsx:77](../../app/(shop)/productos/[slug]/page.tsx). Invalida TODOS los productos al guardar — aceptable porque las ediciones de plantilla son raras.

### Riesgo: Performance — render por sub-bloque vs JSX inline

**Impacto:** Antes había 1 server component que rendea todo. Ahora 7+ con un Provider client en el medio.

**Mitigación:** Home y Cart ya hacen esto con landing-blocks y no hay quejas de perf. El Provider sólo envuelve los sub-bloques de PRODUCT_MAIN (no la página entera). Las secciones extra debajo son server-only.

**Medición sugerida (post-merge):** Web Vitals LCP en `/productos/<slug>` antes y después. Tolerancia: +50ms es aceptable.

### Riesgo: Live preview no actualiza al cambiar text inline

**Impacto:** Admin tipea "Comprar ahora" en buttonText → iframe sigue mostrando "Agregar al carrito" hasta el autosave.

**Mitigación:** Cada renderer DEBE declarar `data-content-field="<name>"` en el elemento que renderea ese texto. Ver convenciones en [docs/superpowers/guides/customizer-live-preview-conventions.md](../superpowers/guides/customizer-live-preview-conventions.md). Checklist en Task C3 / C4.

### Riesgo: Variant picker stateful — race condition con autosave

**Impacto:** Admin edita el text del buy button mientras el customizer le actualiza props porque otro admin guardó.

**Mitigación:** Plan 18 ya cubre esto con `BatchConflictDialog`. El reload-pending state en `CustomizerShell` ya congela autosaves durante recargas. No hay cambio adicional necesario para Plan 17.

### Riesgo: Productos con `template = "LANDING"` ya en producción

**Impacto:** Romper esos.

**Mitigación:** La condición en page.tsx es `product.template === "LANDING" ? <ProductLandingView /> : ...`. Plan 17 NO toca esa rama. Verificado en Task E1.

### Riesgo: `unstable_cache` del producto NO cachea `getThemedSections`

**Impacto:** Cada request a `/productos/<slug>` dispara una query extra (`SELECT * FROM ThemeSection WHERE group='PRODUCT'`).

**Mitigación:** `getThemedSections` puede envolverse en su propio `unstable_cache(..., ["theme-sections-product"], { revalidate: 60, tags: ["theme-sections", "products"] })`. Implementar en Task E1 si el build muestra latencia notable.

### Riesgo: Live preview de PRODUCT_VARIANT_PICKER no funciona

**Impacto:** El picker es interactivo en runtime. Si el admin cambia `swatchSize`, la live preview debería re-renderear el picker con el nuevo tamaño. Pero el picker es client-side, no recibe content del DOM update.

**Mitigación:** Aceptar autosave round-trip (~300-500ms) para variant picker. No declarar `data-content-field` para campos no-texto (swatchSize, layout, etc.) — esos se sincronizan via autosave. El hook `useLivePreviewOverrides` también propaga style updates inline, así que colores y padding sí son instantáneos.

---

## Testing / verificación manual

### Checklist storefront

- [ ] `/productos/<slug>` con seed corrido: idéntico visual al pre-Plan 17, excepto colores `slate-50` ahora vienen del color scheme.
- [ ] `/productos/<slug>` SIN seed: cae al `<ProductStandardView />` legacy (fallback).
- [ ] Producto con `template = "LANDING"`: sigue mostrando `<ProductLandingView />` (sin tocar).
- [ ] Mobile: galería en stacked por default; variant picker usable.
- [ ] Variant selection: cambiar SKU → precio actualiza, stock actualiza, botón "Agregar al carrito" se deshabilita si out-of-stock.
- [ ] Agregar al carrito: CartCounter del Header sube.
- [ ] JSON-LD `<script>` siguen en el `<head>` (verificar en DevTools).
- [ ] LandingBlock viejos siguen renderizándose debajo de las theme-sections.

### Checklist customizer

- [ ] Target "Producto (ejemplo)" → zona Plantilla muestra PRODUCT_MAIN + sub-bloques en árbol.
- [ ] Click en PRODUCT_MAIN → right sidebar muestra `colorSchemeId` + `padding`.
- [ ] Click PRODUCT_GALLERY → right sidebar muestra Layout, Thumbnails, etc.
- [ ] Cambiar Layout a "carousel" → iframe muestra carrusel.
- [ ] Drag PRODUCT_DESCRIPTION sobre PRODUCT_BUY_BUTTON → reordena.
- [ ] Toggle visibility (ojo) en PRODUCT_META → desaparece del iframe.
- [ ] Intentar eliminar PRODUCT_MAIN → botón deshabilitado.
- [ ] Intentar arrastrar PRODUCT_MAIN → bloqueado.
- [ ] "+ Agregar sección" → menú muestra FEATURED_COLLECTION, FAQ_SECTION, IMAGE_WITH_TEXT, TESTIMONIALS, RICH_TEXT_SECTION (no muestra HEADER_MAIN, FOOTER_COLUMNS, etc).
- [ ] Agregar FEATURED_COLLECTION → aparece debajo de PRODUCT_MAIN. Configurar source="manual_picks", elegir 4 productos → iframe los muestra.
- [ ] Recargar customizer → todos los cambios persisten.
- [ ] Color scheme: en PRODUCT_MAIN, cambiar `colorSchemeId` → iframe rebinda `--theme-*` vía CSS custom properties.
- [ ] Concurrencia: abrir el mismo tema en dos pestañas, editar PRODUCT_GALLERY en una, guardar; en la otra editar y guardar → `BatchConflictDialog` aparece con Recargar / Forzar.

### Checklist build

- [ ] `npm run build` passes sin warnings de TypeScript.
- [ ] `npm run lint` passes.
- [ ] `npx prisma generate` regenera client sin errores.

---

## Success criteria

- [ ] Admin puede reordenar sub-bloques de PRODUCT_MAIN desde el customizer.
- [ ] Admin puede agregar / eliminar secciones extra debajo de PRODUCT_MAIN.
- [ ] Admin puede aplicar color schemes a cualquier sección o sub-bloque.
- [ ] Admin puede ocultar (toggle ojo) cualquier sub-bloque o sección extra.
- [ ] `ProductStandardView.tsx` ya no se invoca cuando hay PRODUCT_MAIN seeded.
- [ ] El storefront se ve idéntico al pre-Plan 17 después del seed (sin diff visual significativo más allá de colores que ahora vienen del color scheme).
- [ ] Productos con `template = "LANDING"` siguen funcionando sin cambios.
- [ ] LandingBlock siguen renderizándose después de las theme-sections (compat layer).
- [ ] Sin colores hardcoded en los nuevos renderers (no `bg-slate-50`, `text-green-600`).
- [ ] `npm run build` passes.
- [ ] Smoke test manual del checklist completo pasa.

---

## Self-review notes

**Spec coverage:**
- ✅ Modelo de datos minimal expand-only (Task A1).
- ✅ Registry de 6+8 tipos nuevos (Tasks B1-B3).
- ✅ Renderers server+client por sub-bloque (Tasks C1-C6).
- ✅ ProductContext para sub-bloques stateful (Task C1).
- ✅ Página /productos/[slug] con fallback al legacy (Task E1).
- ✅ Customizer: ZoneList branch, store extension, autosave (Tasks D1-D4).
- ✅ Seed idempotente (Task F1).
- ✅ Live preview conventions respetadas (Tasks C3-C6).
- ✅ Color schemes via SectionWrapper / SubBlockWrapper (Task A3).
- ✅ Cache invalidation con revalidateTag (Task A2).

**Patrón Plan 16 respetado:**
- Mismo `ThemeSection` / `ThemeSectionBlock` schema.
- Mismo `ThemeSectionGroupEditor` reusado con `group="PRODUCT"`.
- Misma server action `saveThemeSectionGroupVersioned` con cambio mínimo de enum.
- Mismo `useLivePreviewOverrides` sin tocar.
- Mismo patrón `data-preview-target` / `data-content-field`.

**No-goals respetados:**
- No override por producto.
- No múltiples plantillas por tema.
- No deprecación de LandingTemplate.
- No CategoryBlocks reescritura.
- No /productos índice editable.

**Tamaño:** ~30 archivos nuevos, ~10 modificados. Fases A-G independientes; cada fase deja el storefront funcional (el seed se corre AL FINAL, antes hay fallback al legacy view).

**Plan completo, listo para guardarse en `docs/superpowers/plans/2026-05-27-plan-17-product-template-sections.md`.**
```

---

Archivos relevantes consultados (paths absolutos):

- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\docs\superpowers\plans\2026-04-30-theme-sections.md` (Plan 16 — patrón base)
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\prisma\schema.prisma` (líneas 1450-1555 — Theme, ThemeSection, ThemeSectionBlock, enum)
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\lib\theme-sections\types.ts`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\lib\theme-sections\registry.ts`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\shop\theme-sections\_helpers.tsx`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\shop\templates\ProductStandardView.tsx`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\app\(shop)\productos\[slug]\page.tsx`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\admin\customizer\ZoneList.tsx`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\admin\customizer\page-targets.ts`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\admin\customizer\CustomizerShell.tsx`
- `d:\PROYECTOS\Sistema ecommerce\shopgood-pe\components\admin\customizer\ThemeSectionGroupEditor.tsx`