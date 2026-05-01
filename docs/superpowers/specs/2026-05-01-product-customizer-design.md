# Personalizador de productos para el cliente final — Diseño

**Fecha:** 2026-05-01
**Branch:** `feature/plan-16-theme-sections` (se abrirá branch propio al implementar)
**Estado:** Diseño aprobado, pendiente plan de implementación

## 1. Resumen ejecutivo

Permitir que el cliente final personalice productos (inicialmente camisetas/polos, extensible a otros) añadiendo **capas de texto** sobre zonas de impresión predefinidas (frontal y trasera para MVP), con vista previa en tiempo real. El diseño viaja con el item del carrito (JSON + PNG por zona) y queda visible en el panel de admin cuando el dueño revisa la orden, listo para producción.

El sistema se construye desde el día 1 con un modelo de datos **genérico** (zonas N, tipos de elemento extensibles, plantillas reusables entre productos), de modo que añadir tazas, gorras o nuevos tipos de elemento (imágenes, clipart) en el futuro **no requiera migración de schema** — solo registros nuevos.

## 2. Objetivos y no-objetivos

### Objetivos (MVP)

- El cliente puede personalizar un producto marcado como personalizable, añadiendo hasta N capas de texto por zona (frontal/trasera por defecto).
- Vista previa WYSIWYG en tiempo real con `react-konva`.
- Cliente elige variante (color/talla) tanto en la página de producto como dentro del builder; la elección viaja al carrito.
- Diseño se persiste como JSON + PNG por zona (Vercel Blob), llega íntegro a la orden y al panel de admin.
- Dueño configura plantillas reusables (`/admin/personalizables/`) con zonas, mockups, fuentes/colores permitidos, sobrecargo opcional.
- Dueño puede subir mockups por color (opcional, con fallback al mockup de la plantilla).
- Re-edición del diseño desde el carrito antes de pagar (sin perder cantidad).
- RBAC nuevo: permisos `customizables.{view,create,update,delete}`.

### No-objetivos (Fase 2+)

- Subida de imágenes propias del cliente.
- Catálogo de clipart o generación de diseños con IA.
- Texto curvado siguiendo arco/path.
- Bordado como técnica alternativa.
- Edición colaborativa o compartir diseños vía link.
- Productos compuestos (set de polo + gorra con el mismo diseño).
- Cron de limpieza de PNGs huérfanos en Vercel Blob.

## 3. Arquitectura

### 3.1 Modelo de datos (Prisma)

#### Tablas nuevas

```prisma
model CustomizableTemplate {
  id                String     @id @default(cuid())
  name              String
  description       String?
  active            Boolean    @default(true)
  surcharge         Decimal?   @db.Decimal(10, 2)  // null = sin sobrecargo
  zones             Json       @default("[]")       // PrintZone[]
  allowedFonts      Json       @default("[]")       // string[] (Google Fonts keys)
  allowedColors     Json       @default("[]")       // string[] (hex values)
  allowCustomColors Boolean    @default(true)       // permite color picker libre
  sizeGuide         Json?                            // tabla de medidas
  maxLayersPerZone  Int        @default(8)
  maxCharsPerLayer  Int        @default(40)
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  products          Product[]

  @@index([active])
}
```

`PrintZone` es JSON tipado por TypeScript (sin tabla aparte para que el dueño edite todo el template en una transacción):

```ts
interface PrintZone {
  id: string;                    // "frontal" | "trasera" | UUID si añade más
  name: string;                  // "Impresión frontal"
  mockupImage: string;           // URL Vercel Blob (mockup default, ej. polo blanco)
  bounds: {                      // % del mockup, no píxeles
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  };
  printResolutionDPI: number;    // ej. 300
}
```

`SizeGuide`:

```ts
interface SizeGuide {
  unit: "cm" | "in";
  columns: { key: string; label: string }[];        // [{key:"chest", label:"Pecho"}, ...]
  rows: { size: string; values: Record<string, number> }[];
  notes?: string;
}
```

#### Cambios a tablas existentes

```prisma
model Product {
  // ... campos existentes ...
  customizableTemplateId      String?
  customizableTemplate        CustomizableTemplate? @relation(fields: [customizableTemplateId], references: [id], onDelete: SetNull)
  customizableMockupOverrides Json?                  // { axisOptionId: string, mockups: { [zoneId]: { [productOptionValueId]: mockupUrl } } }
}

model OrderItem {
  // ... campos existentes ...
  customDesign        Json?    // CustomDesign — layers por zona
  customDesignImages  Json?    // [{ zoneId: string, url: string }]
}
```

`CustomDesign` (TypeScript):

```ts
interface CustomDesign {
  templateId: string;
  templateSnapshot: {            // snapshot al "Añadir al carrito"
    allowedFonts: string[];
    allowedColors: string[];
    allowCustomColors: boolean;
    maxLayersPerZone: number;
    maxCharsPerLayer: number;
    surcharge: number | null;
    zones: Array<{
      id: string;
      name: string;
      bounds: { xPct: number; yPct: number; widthPct: number; heightPct: number };
    }>;
  };
  zones: Array<{
    zoneId: string;
    layers: TextLayer[];
  }>;
}

interface TextLayer {
  id: string;                    // UUID
  type: "TEXT";                  // enum extensible: TEXT | IMAGE (futuro) | CLIPART (futuro)
  text: string;
  font: string;                  // Google Font key, debe estar en template.allowedFonts
  size: number;                  // 8-200
  color: string;                 // hex, debe estar en template.allowedColors o custom permitido
  letterSpacing: number;         // -10 a +50
  rotation: number;              // 0-360
  x: number;                     // % del mockup
  y: number;                     // % del mockup
  width: number;                 // % del mockup (post-transform)
  height: number;                // % del mockup
  align: "left" | "center" | "right";
}
```

`CartItem` (Zustand, no DB):

```ts
interface CartItem {
  id: string;                    // ${productId|variantId} si no hay diseño;
                                 // ${productId|variantId}::${customDesignId} si hay diseño
  productId: string;
  variantId?: string;
  // ... campos existentes ...
  customDesignId?: string;       // UUID generado al añadir, parte de id (no deduplica)
  customDesign?: CustomDesign;
  customDesignImages?: { zoneId: string; url: string }[];
}
```

### 3.2 Estructura de módulos

```
lib/customizer/
├── types.ts                  // CustomDesign, TextLayer, PrintZone, SizeGuide
├── validate.ts               // Zod schemas (server-side al checkout)
├── pricing.ts                // Cálculo de surcharge
├── default-fonts.ts          // 60 Google Fonts en 5 categorías
├── default-colors.ts         // ~120 swatches
├── render.ts                 // Re-render server-side del JSON (admin viewer)
└── canvas-export.ts          // Helpers para Konva.toDataURL → Blob → /api/upload

components/customizer/         // Builder cliente final
├── CustomizerLayout.tsx       // Topbar + sidebar izq + canvas + sidebar der + bottom bar
├── CustomizerCanvas.tsx       // <Stage>, <Layer>, <Image mockup>, <Rect bounds>, <Text>
├── CustomizerTopBar.tsx       // ← Volver · Nombre plantilla · Vista preview · Undo/Redo
├── LeftSidebar/
│   ├── index.tsx              // Tabs verticales Producto/Capas/(disabled)
│   ├── ProductTab.tsx         // Variant picker, rating, talla, guía de tallas
│   └── LayersTab.tsx          // Lista de layers de la zona activa, + Texto
├── RightSidebar/              // Propiedades de la layer seleccionada
│   ├── index.tsx              // Tabs horizontales Texto/Color/Fuente/Transformar/Posición
│   ├── TextoTab.tsx
│   ├── ColorTab.tsx           // grilla de swatches + picker custom (HSL + hex + eyedropper)
│   ├── FuenteTab.tsx          // buscador + tabs Todas/Populares + "Utilizadas en el diseño"
│   ├── TransformarTab.tsx     // rotación, tamaño W/H, lock proporciones
│   └── PosicionTab.tsx        // 6 botones de alineación dentro del bounds
├── BottomBar.tsx              // Precio + "Añadir al carrito"
├── ZoneTabs.tsx               // [Frontal] [Trasera] arriba del canvas
├── MobileBottomSheet.tsx      // Sheet swipeable en mobile
└── store.ts                   // Zustand local del builder (layers, undo stack, dirty flag)

components/admin/customizer-templates/
├── TemplatesList.tsx          // Cards con thumbnail mockup frontal
├── TemplateForm.tsx           // Formulario completo (name, surcharge, fonts, colors, limits)
├── ZoneEditor.tsx             // <Stage> con mockup + rect arrastrable para definir bounds
├── FontsCatalogPicker.tsx     // Multiselect de Google Fonts agrupado por categoría
├── ColorsPaletteEditor.tsx    // Grilla editable + custom hex
└── SizeGuideEditor.tsx        // Tabla editable de medidas

components/admin/products/
└── CustomizationCard.tsx      // Card "Personalización" en form de producto
                               // (toggle, plantilla selector, mockups por color opcionales)

components/admin/orders/
└── CustomDesignViewer.tsx     // Galería de PNGs por zona + lista textual de layers
                               // + descarga PNG full resolution

components/shop/
├── StartCustomizingButton.tsx // Reemplaza "Añadir al carrito" si product.customizableTemplateId
└── cart/
    └── CustomDesignBadge.tsx  // Mini-thumbnail + "Editar diseño" link en cart drawer/page
```

### 3.3 Rutas

| Ruta | Tipo | Notas |
|---|---|---|
| `/productos/[slug]/personalizar` | Cliente, layout dedicado | Sin Header/Footer del shop. Lee `?variantId` y `?cartItemId` opcional |
| `/admin/personalizables/` | Admin, RBAC `customizables.view` | Lista de plantillas |
| `/admin/personalizables/nuevo/` | Admin, RBAC `customizables.create` | Crear plantilla |
| `/admin/personalizables/[templateId]/` | Admin, RBAC `customizables.update` | Editar plantilla existente |

No se añaden API routes públicas. La subida de PNGs reusa `/api/upload` existente.

### 3.4 Server actions (`actions/customizer.ts`)

```ts
saveCustomizableTemplate(input)     // create
updateCustomizableTemplate(id, input)
deleteCustomizableTemplate(id)
listCustomizableTemplates()         // para el selector en producto form
getCustomizableTemplate(id)         // para el builder client (load template metadata)
```

Validación de checkout (`actions/orders.ts` modificada): por cada `cartItem` con `customDesign`, validar JSON contra el snapshot de la plantilla referenciada (Zod) y abortar el checkout si hay tampering.

## 4. UX del cliente final

### 4.1 Página de producto

- Si `product.customizableTemplateId != null`, el botón "Añadir al carrito" se reemplaza por el botón rojo **"Empieza a diseñar"** (decisión binaria, no hay dos botones simultáneos).
- Si la plantilla tiene `surcharge`, debajo del precio aparece línea pequeña en gris: `S/ 39.90 + S/ 5.00 personalización`.
- Bajo el botón, sub-línea sutil: *"Diseña tu polo en 30 segundos →"*.
- El variant picker (color, talla) sigue funcionando igual que hoy. Al hacer click en "Empieza a diseñar", el `variantId` actualmente seleccionado se pasa por query param a la ruta del builder.

### 4.2 Layout del builder (`/productos/[slug]/personalizar`)

Layout dedicado sin Header/Footer. Tres regiones desktop, stacked en mobile.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Volver al producto · Polo blanco unisex · 🖥 📱 · ↶ ↷                │  topbar
├──────────┬────────────────────────────────────────┬─────────────────┤
│          │  [Frontal] [Trasera]                   │ Propiedades     │
│ ┌──────┐ │                                        │ ─────────────── │
│ │Produc│ │                                        │ [Texto][Color]  │
│ │ to ●│ │      ┌──────────────────────┐          │ [Fuente][Trans] │
│ ├──────┤ │      │   [mockup polo]      │          │ [Posición]      │
│ │Capas │ │      │   ┌─ — — — — ─┐      │          │                 │
│ ├──────┤ │      │   │  [layers]  │      │          │ (contenido del  │
│ │Texto │ │      │   └─ — — — — ─┘      │          │  tab activo)    │
│ │(disabd)│      │                      │          │                 │
│ │…     │ │      └──────────────────────┘          │                 │
│ └──────┘ │                                        │                 │
├──────────┴────────────────────────────────────────┴─────────────────┤
│                  [Añadir al carrito · S/ 44.90]                     │  bottom bar sticky
└─────────────────────────────────────────────────────────────────────┘
```

#### Sidebar izquierdo (tabs verticales)

- **Producto** (default al abrir): variant picker (color swatches según `ProductOption.swatchType`, botones de talla, tallas sin stock en gris), thumbnail + nombre + rating, link "Guía de tallas" que abre drawer/modal con `template.sizeGuide`.
- **Capas**: lista de layers de la zona activa (con mini-preview, drag para reordenar, eliminar/duplicar). Botón "+ Texto" arriba.
- Tabs deshabilitados con tooltip "Próximamente": Subidas, Texto-shortcut (redundante con +Texto en Capas), Clipart, Diseños IA, Premium, Relleno. Visibles para señalizar futura extensibilidad.

#### Canvas central

- `react-konva` con `<Stage>` redimensionable según viewport.
- Mockup de la zona activa como `<Image>` de fondo.
- Rectángulo de `bounds` visualizado en líneas punteadas cyan (visual feedback del área imprimible).
- Layers de texto draggables, handles de transformación al seleccionar.
- Doble-click o Enter entra a edición inline (Konva soporta `<Text>` editable vía overlay HTML).
- Layer fuera de bounds → toast warning *"El texto saldrá del área de impresión"* (no bloquea).
- Tabs de zona arriba: `[Frontal]` `[Trasera]`.

#### Sidebar derecho (propiedades, solo visible con layer seleccionada)

Tabs horizontales (igual que Printful):

| Tab | Contenido |
|---|---|
| **Texto** | textarea multilínea con contador `28/40`, slider letter-spacing -10 a +50 |
| **Color** | nombre + hex del color seleccionado, grilla de ~120 swatches del template, botón 🎨 Color personalizado (si `template.allowCustomColors`) que abre picker HSL + hex + eyedropper |
| **Fuente** | buscador, tabs internos `Todas` / `Tipos populares`, sub-sección "Utilizadas en el diseño", cada item renderizado en su propia fuente (preview WYSIWYG), tamaño 8-200px |
| **Transformar** | rotación slider 0-360° (snap a 0/90/180/270 con Shift), inputs W/H, toggle bloquear proporciones |
| **Posición** | 6 botones: centrar H, centrar V, alinear izq/der/arriba/abajo dentro del bounds |

Cuando no hay layer seleccionada: muestra info de la plantilla (nombre, sobrecargo) y CTA "+ Añadir texto".

#### Topbar

- "← Volver al producto" (con confirmación si hay cambios sin guardar, descarta y navega).
- Nombre de la plantilla.
- Toggle 🖥/📱 (re-escala el canvas para preview, no afecta data).
- Undo (↶) / Redo (↷). Stack en memoria local del builder, no persiste.

#### Bottom bar sticky

- Lado izquierdo: precio descompuesto (`S/ 39.90 + S/ 5.00 personalización`).
- Lado derecho: botón rojo "Añadir al carrito · S/ 44.90", ancho completo en mobile.

### 4.3 Mobile (<768px)

- Topbar reducido (solo "←" y nombre truncado).
- Sidebar izquierdo se vuelve un FAB "+" con menú radial (Producto / Capas / Texto).
- Canvas ocupa ~60vh.
- Sidebar derecho se transforma en bottom-sheet swipeable: cerrado muestra "X capas · + texto", al subir expande tabs de propiedades.
- Tabs de zona Frontal/Trasera como pildoras encima del canvas.
- Bottom bar fija con botón ancho completo.

### 4.4 Flujo "Añadir al carrito"

1. Cliente click → validar al menos 1 layer en alguna zona (si todo vacío, toast warning).
2. Por cada zona usada: `stage.toDataURL({ pixelRatio: zone.printResolutionDPI / 96 })` → `Blob`.
3. Subir cada Blob a `/api/upload` → URLs de Vercel Blob.
4. Generar `customDesignId` (UUID v4) y construir `CartItem`:
   ```ts
   {
     id: `${variantId || productId}::${customDesignId}`,
     productId,
     variantId,
     customDesignId,
     customDesign: { templateId, templateVersion, zones },
     customDesignImages: [{ zoneId, url }, ...],
     price: basePrice + (template.surcharge ?? 0),
     name: product.name + " (personalizado)",
     ...
   }
   ```
5. Push a `useCartStore`. Toast verde con CTA "Ver carrito". Por default queda en el builder (permite añadir otra unidad o navegar manualmente).

Loading state: el botón muestra "Subiendo tu diseño…" durante la subida (puede tardar 2-5s con 2 zonas a 300 DPI). Si falla, retry automático 1 vez, luego error con CTA "Reintentar".

### 4.5 Flujo "Editar diseño desde carrito"

- En cart drawer / `/carrito`, item personalizado muestra mini-thumb del PNG frontal con badge "Personalizado" + texto pequeño "Editar diseño" linkeable.
- Click → `/productos/[slug]/personalizar?cartItemId=xxx`.
- Builder detecta el query, lee `customDesign` del store y precarga el canvas con las layers existentes. También precarga la variante.
- Botón "Guardar cambios" en lugar de "Añadir al carrito": regenera PNGs, sube de nuevo, llama a `useCartStore.replaceCustomItem(cartItemId, newDesign, newImages)`. Mantiene cantidad.

## 5. UX del admin

### 5.1 Sección `/admin/personalizables/`

Patrón visual idéntico a `/admin/landing-plantillas/` para consistencia.

#### Lista (`/admin/personalizables/`)

- Cards con thumbnail del mockup frontal de cada plantilla, nombre, sobrecargo, contador de productos que la usan.
- Botón "Nueva plantilla" arriba.
- Toggle activa/inactiva inline.
- Click → editor de plantilla.

#### Editor (`/admin/personalizables/[templateId]/`)

Layout 2 columnas. Izquierda: formulario. Derecha: editor visual de zonas.

**Formulario (izquierda):**

| Campo | Tipo | Default |
|---|---|---|
| Nombre | text | requerido |
| Descripción | textarea | opcional |
| Activa | toggle | `true` |
| Sobrecargo | input numérico | vacío (= sin sobrecargo) |
| Fuentes permitidas | multiselect agrupado por categoría | las 60 |
| Colores permitidos | paleta editable (Sección 7.B) | las ~120 |
| Permitir color personalizado | toggle | `true` |
| Máx. capas por zona | número | 8 |
| Máx. caracteres por capa | número | 40 |
| Tabla de medidas | sub-editor (`SizeGuideEditor`) | opcional |

**Editor visual de zonas (derecha):**

- Lista vertical de zonas: cada zona con preview pequeño, nombre, botón eliminar.
- Click en zona → panel grande con:
  - Input nombre.
  - Drop-zone de mockup → sube a `/api/upload` → preview.
  - Sobre el mockup, un `<Stage>` con `<Rect>` arrastrable y redimensionable que define el `bounds`. Coordenadas se guardan como **% del mockup** (no px).
  - Input numérico DPI (default 300).
- Botón "+ Añadir zona" → nuevo registro vacío.

Auto-save al cambiar campos (mismo patrón que customizer y page-builder existentes).

### 5.2 Card "Personalización" en form de producto

En `/admin/productos/[productId]/` y `/nuevo/`, debajo de la card "Presentación":

```
┌─ Personalización ──────────────────────────────────────────┐
│  ☐ Permitir personalización por el cliente                 │
│                                                            │
│  Plantilla: [ Polo blanco unisex Bella+Canvas ▾ ]          │
│  ↳ 2 zonas (Frontal, Trasera) · Sobrecargo S/ 5.00         │
│                                                            │
│  Mockups por color (opcional)                              │
│  ↳ Si dejas vacío, se usará el mockup de la plantilla      │
│  ┌─────────────┬───────────┬───────────┐                   │
│  │             │ Frontal   │ Trasera   │                   │
│  ├─────────────┼───────────┼───────────┤                   │
│  │ ⚪ Blanco   │ [drop]    │ [drop]    │                   │
│  │ ⚫ Negro    │ [drop]    │ [drop]    │                   │
│  │ 🔵 Azul     │ [drop]    │ [drop]    │                   │
│  └─────────────┴───────────┴───────────┘                   │
│                                                            │
│  [ Vista previa de la experiencia →  ]                     │
└────────────────────────────────────────────────────────────┘
```

- Toggle expande la card.
- Dropdown lista plantillas activas; abajo summary (zonas + sobrecargo).
- Sub-sección de mockups por color **solo aparece si:** plantilla seleccionada y producto tiene al menos una `ProductOption`. Un dropdown adicional **"Opción que cambia el mockup"** lista las `ProductOption` del producto (ej. Color, Tamaño) — el dueño elige cuál es el eje visual (puede ser ninguna). Si elige una, aparece la grilla con una drop-zone por combinación zona × `ProductOptionValue` de esa opción. La elección se persiste en `Product.customizableMockupOverrides.axisOptionId`.
- Botón "Vista previa de la experiencia" abre `/productos/[slug]/personalizar?preview=admin` en pestaña nueva.
- Validación al guardar: si toggle on, plantilla obligatoria. Mockups por color son siempre opcionales.

### 5.3 Visualización del diseño en orden (`/admin/ordenes/[orderId]/`)

Para cada `OrderItem` con `customDesign != null`, sub-sección expandible "Diseño personalizado":

- **Galería de PNGs por zona:** una imagen grande por zona usada con título. Click → lightbox full-resolution. Botón "Descargar PNG" descarga con nombre semántico `orden-{orderId}-item-{itemId}-{zoneId}.png`.
- **Detalles textuales:** lista de layers para el equipo de impresión:
  ```
  Frontal:
    1. "Mi nombre"  ·  Inter 32px  ·  #000000  ·  centrado
    2. "Camiseta 2026"  ·  Roboto 18px  ·  #FF0000  ·  centrado
  Trasera:
    1. "10"  ·  Bebas Neue 96px  ·  #000000  ·  centrado
  ```
- **Plantilla usada:** nombre + link al admin de la plantilla.
- **Variante:** color y talla del producto (`OrderItem.variantOptions`).

### 5.4 Permisos (RBAC)

Nuevos permisos en `lib/permissions.ts`:

- `customizables:view` (Manager+, level 5)
- `customizables:create` (Manager+, level 5)
- `customizables:update` (Manager+, level 5)
- `customizables:delete` (Manager+, level 5)

Script de seed `scripts/setup-customizables-permissions.ts` siguiendo el patrón de `setup-themes-permissions.ts`.

## 6. Carrito y checkout (flujo de datos)

### 6.1 Cambios en `store/cart.ts`

```ts
interface CartItem {
  // ... campos existentes ...
  customDesignId?: string;
  customDesign?: CustomDesign;
  customDesignImages?: { zoneId: string; url: string }[];
}

interface CartStore {
  // ... métodos existentes ...
  replaceCustomItem(cartItemId: string, design: CustomDesign, images: {...}[]): void;
}
```

**Cambio crítico al `id`:** cuando hay `customDesignId`, `id = ${variantId || productId}::${customDesignId}`. Esto hace que `addItem` automáticamente NO mergee con polos sin diseño NI con otros diseños del mismo polo.

### 6.2 UI del carrito

- Item con `customDesign != null`: thumbnail muestra el PNG de la primera zona (frontal preferentemente), badge "Personalizado", texto pequeño "Editar diseño" enlazando al builder con `?cartItemId`.
- Línea de precio descompuesta: `S/ 39.90 + S/ 5.00 personalización` en gris pequeño, total a la derecha.

### 6.3 Server action de checkout (`actions/orders.ts`)

Modificar la creación de `OrderItem`:

```ts
data: {
  // ... campos existentes ...
  customDesign: cartItem.customDesign ?? null,
  customDesignImages: cartItem.customDesignImages ?? null,
}
```

Antes de persistir, validar con `lib/customizer/validate.ts` **contra `customDesign.templateSnapshot`** (no contra la plantilla viva — esto hace al carrito robusto a mutaciones del dueño después de añadir):

- Al menos una zona del `customDesign.zones` debe tener `layers.length >= 1` (no se permiten cart items personalizados completamente vacíos).
- `customDesign.zones[].zoneId` ∈ `templateSnapshot.zones[].id`.
- Cada layer: `font ∈ templateSnapshot.allowedFonts`, `color ∈ templateSnapshot.allowedColors` o (si `templateSnapshot.allowCustomColors`) hex válido, `text.length ≤ templateSnapshot.maxCharsPerLayer`, `layers.length ≤ templateSnapshot.maxLayersPerZone`.
- URLs de `customDesignImages` deben estar en el dominio configurado de Vercel Blob (regex match).
- Validación adicional: `customDesign.templateId` debe coincidir con `Product.customizableTemplateId` actual (si la plantilla fue cambiada/eliminada por el dueño después, ese cart item ya no aplica → error con CTA "Re-personalizar").

Si la validación falla → abort checkout con error claro: *"El diseño del producto X no es válido. Vuelve a personalizar antes de continuar."*

### 6.4 Sobrecargo en cálculo de totales

- `surcharge` se aplica en el momento de añadir al carrito y queda **congelado** en `cartItem.price`.
- `getTotalPrice()` actual del store no se toca.
- `OrderItem.price` se persiste con sobrecargo incluido.
- Cambios futuros del dueño al `surcharge` de la plantilla NO afectan órdenes ya creadas (precios congelados).

Helper derivado `getCartItemBreakdown(cartItem)` para mostrar desglose en UI: consulta plantilla cacheada (cliente) o recalcula desde `CartItem.customDesign.templateVersion`.

### 6.5 Manejo de PNGs huérfanos

- **MVP:** dejar huérfanos. Vercel Blob barato, carritos abandonados son fracción pequeña. Path en Blob incluye `customDesignId`, no se reusa.
- **Validación al cargar `/carrito`:** HEAD request a cada URL de `customDesignImages`. Si falla, marcar `customDesignBroken: true` y mostrar warning *"El diseño expiró, vuelve a personalizar"* con CTA al builder. No bloquea checkout de demás items.
- **Fase 2:** cron Vercel limpia `custom-designs/*` huérfanos > 30 días.

### 6.6 Confirmación de orden + emails

- Vista `/orden/[orderId]/confirmacion`: por cada item personalizado, mini-galería igual que admin (cliente confirma visualmente).
- Email de confirmación (React Email + Resend): incluir URLs de PNGs como links (no inline images, romperían en muchos clientes). Texto: *"Tu diseño ya está en producción. Vista previa: [link]"*.

## 7. Defaults curados

### 7.1 Catálogo de fuentes (`lib/customizer/default-fonts.ts`)

60 Google Fonts en 5 categorías (lista completa en el archivo de implementación):

- **Sans-serif (16):** Inter, Roboto, Open Sans, Montserrat, Poppins, Lato, Raleway, Nunito, Work Sans, Source Sans 3, Manrope, Outfit, DM Sans, Plus Jakarta Sans, Mulish, Karla.
- **Serif (12):** Playfair Display, Merriweather, Lora, EB Garamond, Crimson Pro, Cormorant Garamond, PT Serif, Source Serif 4, Bitter, Roboto Serif, Noto Serif, Libre Baskerville.
- **Display (16):** Bebas Neue, Oswald, Anton, Abril Fatface, Archivo Black, Righteous, Bungee, Permanent Marker, Black Ops One, Faster One, Monoton, Lobster, Pacifico, Fredoka One, Alfa Slab One, Russo One.
- **Handwriting (10):** Caveat, Dancing Script, Great Vibes, Sacramento, Satisfy, Kalam, Indie Flower, Shadows Into Light, Homemade Apple, Marck Script.
- **Monospace (6):** JetBrains Mono, Fira Code, Roboto Mono, Source Code Pro, Space Mono, IBM Plex Mono.

**Estrategia de carga:**

- 8 fuentes más populares precargadas con `next/font/google`, subsets `["latin", "latin-ext"]`, `display: "swap"`.
- Las 52 restantes se cargan **on-demand** vía Google Fonts CSS API cuando el cliente las selecciona (`<link>` injection con `media="print"` + `onload` swap, técnica estándar non-blocking).
- Si el dueño restringe a N fuentes en plantilla, solo se cargan esas N.
- "Tipos populares" tab estático inicial; futuro: tracking real de uso.

### 7.2 Catálogo de colores (`lib/customizer/default-colors.ts`)

~120 swatches organizados en filas tonales (cada uno con `{ hex, name }`):

- Negros / grises (12)
- Rojos / marrones (16)
- Naranjas (10)
- Amarillos (10)
- Verdes (16)
- Azules (16)
- Púrpuras / morados (12)
- Rosas (12)
- Neutros pasteles (16)

**Color picker custom:** activado por default (`template.allowCustomColors = true`). UI: HSL slider + input hex + eyedropper API (donde el navegador soporta). Color elegido se guarda como hex en el `CustomDesign`.

### 7.3 Otros límites

| Parámetro | Default | Notas |
|---|---|---|
| Tamaño de fuente | 8-200px | Hardcoded en builder |
| Letter spacing | -10 a +50 | Hardcoded |
| Rotación | 0-360° con snap a 0/90/180/270 (Shift+drag) | Hardcoded |
| `maxLayersPerZone` | 8 | Configurable por plantilla |
| `maxCharsPerLayer` | 40 | Configurable por plantilla |
| Tamaño PNG capturado | hasta 4096×4096 | A 300 DPI cubre ~13" de ancho impresión |
| Peso PNG | warn >2MB, hard cap 5MB | Vercel Blob |

## 8. Performance, seguridad e i18n

### 8.1 Performance

- `react-konva` + `Konva.js` ~150KB gz. Bundle aislado en `/productos/[slug]/personalizar` vía route-split. **No afecta storefront principal.**
- `next/dynamic` con `ssr: false` para componentes de canvas.
- Mockups servidos con `next/image`, `priority`, anchos `1024` mobile / `1600` desktop.
- Skeleton mientras carga el builder muestra mockup estático con overlay "Cargando editor…".

### 8.2 Seguridad

- **Sanitización:** texto se renderiza en canvas (no DOM) — bajo riesgo XSS. En admin viewer (HTML para lista textual), pasar texto por `isomorphic-dompurify` (ya en stack).
- **Validación server-side al checkout:** Zod contra plantilla snapshot. Bloquea tampering desde DevTools.
- **Validación PNG subido:** `/api/upload` valida MIME y tamaño. Server action verifica que URLs `customDesignImages` estén en dominio Vercel Blob (regex).
- **Rate-limiting:** `/api/upload` ya usa Upstash Redis. Si se detecta abuso (200 PNGs en 5 min), reducir límite específico para este endpoint.
- **CSP:** Konva usa `<canvas>`, seguro bajo CSP estricta. No requiere `unsafe-eval`. Verificado para react-konva v18+.

### 8.3 i18n

- Toda UI del builder y admin en español, alineado con convención del proyecto.
- Strings centralizados en `lib/customizer/i18n.ts` para futuro multi-idioma (alineado con visión multi-tenant).

## 9. Estrategia de testing

### 9.1 Unitarios (Vitest)

`lib/customizer/`:

- `validate.test.ts` — schemas Zod: válidos pasan, fuente fuera de catálogo rechaza, color fuera de allowedColors rechaza, text > maxChars rechaza, layers > maxLayersPerZone rechaza, zoneId inexistente rechaza, URL `customDesignImages` fuera de dominio Blob rechaza.
- `pricing.test.ts` — surcharge solo si `customDesignId` presente, `null surcharge` no afecta precio, precio congela en `OrderItem.price`.
- `default-fonts.test.ts` — 60 nombres válidos contra lista hardcoded, no duplicados.
- `default-colors.test.ts` — todos hex válidos `/^#[0-9A-Fa-f]{6}$/`, no duplicados.

### 9.2 Componentes (Vitest + Testing Library)

- `<TextLayerEditor>` — cambio fuente/color/tamaño actualiza state, respeta `template.allowedFonts` al filtrar.
- `<CustomizerCanvas>` — añadir layer al click "Texto" (layer aparece seleccionada por default), drag actualiza x/y, eliminar la quita.
- `<StartCustomizingButton>` — solo renderiza si `customizableTemplateId != null`, href correcto.

**Mock de `react-konva`:** proxy que renderiza `<div>` con `data-*` attributes reflejando props clave (x, y, text, font). Tests assert sobre estado intencional del canvas sin renderizar canvas real.

### 9.3 E2E (Playwright)

`e2e/customizer.spec.ts`:

1. **Happy path:** producto → "Empieza a diseñar" → builder → +Texto frontal → cambiar fuente → cambiar color → tab Trasera → +Texto → "Añadir al carrito" → carrito muestra item con thumb PNG y precio con sobrecargo.
2. **Re-edición:** carrito → "Editar diseño" → builder precarga layers → cambiar texto → "Guardar" → carrito refleja cambio sin duplicar.
3. **Validación zona vacía:** abrir builder, no añadir nada, click "Añadir al carrito" → toast warning, no se añade.
4. **Persistencia entre tabs de zona:** texto en frontal, cambiar a trasera, +texto, volver a frontal → texto frontal sigue ahí.
5. **Variant change updates mockup:** cambiar color en tab Producto → si hay override en `customizableMockupOverrides`, mockup actualiza; si no, queda el de la plantilla con disclaimer.
6. **Tampering server-side:** invocar action de checkout con `customDesign.layers[0].font = "FuentePirata"` → falla con 400 y mensaje claro.

**Mocks CI:**

- `/api/upload` mock devuelve URLs estables del Vercel Blob simulado.
- `next/font/google` mockeado para devolver clases dummy (network isolation).

### 9.4 Admin

- E2E: crear plantilla en `/admin/personalizables/nuevo`, subir 2 mockups, dibujar 2 zonas, guardar → asignar a producto → cliente flujo completo.
- Unit: `actions/customizer.ts` valida permiso `customizables:update`, rechaza zonas con bounds inválidos (`width <= 0`, `xPct + widthPct > 100`).

### 9.5 Coverage target

- ≥80% en `lib/customizer/`.
- ≥60% en `components/customizer/` (Konva limita testabilidad).
- 6 journeys E2E en CI antes de merge.

## 10. Edge cases

| Caso | Comportamiento |
|---|---|
| Cliente añade al cart, dueño desactiva la plantilla | Cart sigue mostrando item; checkout valida con plantilla congelada en JSON. Precio congelado. Si dueño **elimina** plantilla, server action falla con error claro. |
| Cliente sube cantidad a 5 en cart | Funciona normal (mismo `customDesignId`, qty=5). Admin ve "5 unidades del mismo diseño". |
| Dos polos blancos con diseños distintos | Coexisten como items separados (`customDesignId` distinto). |
| Cliente cierra navegador, vuelve días después con localStorage intacto pero PNG purgado | Validación al cargar `/carrito` (HEAD). Item con PNG roto → warning + CTA "re-personalizar". No bloquea otros items. |
| Conexión lenta al "Añadir al carrito" | Loader bloqueante en botón "Subiendo tu diseño…" (2-5s con 2 zonas a 300 DPI). Retry 1 vez en fallo, luego error con CTA "Reintentar". |
| Producto con variantes (talla M, L, XL) personalizable | Variant picker funciona en builder y página producto. `variantId` viaja al cart, diseño asociado a variante específica. |
| Dueño cambia surcharge después de compra | Órdenes existentes inmutables (precio congelado). Carritos pendientes recalculan al cargar `/carrito`. |
| Cliente cambia variante en builder y hay mockup override | Mockup actualiza visualmente. Si no hay override, queda mockup plantilla con disclaimer *"Vista previa sobre polo blanco · se imprimirá sobre Negro"*. |
| Cliente sin JS o con canvas bloqueado | Builder no carga. Página muestra fallback: *"Tu navegador no soporta el editor. Instala Chrome/Firefox/Safari actualizado."* |

## 11. Plan de fases

### MVP (este spec)

- Tipo de elemento: TEXT.
- Zonas: frontal + trasera.
- Producto piloto: 1 polo (Bella+Canvas 3001 o equivalente que el dueño elija).
- Catálogo: 60 fuentes, 120 colores, color picker custom.
- Variant picker en builder + mockups por color con fallback.
- Re-edición desde cart.
- Admin: CRUD de plantillas + visor en orden.

### Fase 2 (post-launch, según feedback)

- Subida de imágenes propias del cliente (con validación de resolución mínima para impresión).
- Catálogo de clipart curado por el dueño.
- Texto curvado (tab "Arco").
- Cron de limpieza de PNGs huérfanos.
- Tracking real de fuentes populares.

### Fase 3 (largo plazo)

- Generación de diseños con IA.
- Bordado como técnica alternativa.
- Productos compuestos (set de polo + gorra con mismo diseño).
- Visor 3D opcional sobre el diseño.
- Multi-tenant del catálogo de plantillas.

## 12. Migración y rollout

1. Migración Prisma: agregar `CustomizableTemplate`, `Product.customizableTemplateId`, `Product.customizableMockupOverrides`, `OrderItem.customDesign`, `OrderItem.customDesignImages`. Idempotente.
2. Seed: ninguna plantilla seed automática (el dueño crea la suya).
3. Permisos: ejecutar `setup-customizables-permissions.ts` en deploy.
4. Feature flag: ninguno. La feature solo se activa al crear una plantilla y asignarla a un producto. Cero impacto en productos existentes.
5. Comunicación al dueño: documento corto en español sobre cómo crear su primera plantilla (incluido en `docs/superpowers/guides/`).

## 13. Métricas de éxito post-launch

- Tasa de conversión producto personalizable vs no personalizable (> baseline).
- % de carritos con item personalizado completados en checkout.
- Tiempo promedio en builder antes de añadir al cart (objetivo: 30s-3min).
- Tasa de "Editar diseño desde carrito" (señal de re-engagement).
- Tickets de soporte relacionados con diseños mal impresos (objetivo: <1% de órdenes personalizadas).
