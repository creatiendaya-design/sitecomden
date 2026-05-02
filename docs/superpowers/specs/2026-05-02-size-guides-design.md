# Size Guides — Diseño

**Fecha**: 2026-05-02
**Branch**: `feature/product-customizer` (continuación) → futuro `feature/size-guides`
**Autor**: dennewsusa@gmail.com
**Estado**: Draft (pendiente de revisión)

## 1. Contexto y problema

Hoy la guía de tallas vive embebida dentro de `CustomizableTemplate.sizeGuide` (campo JSON) y solo se ve dentro del customizer de productos personalizables. La estructura actual es mínima: `{ unit, columns, rows, notes? }` — sin imagen, sin marcadores, sin pestañas.

Limitaciones reales:
- Productos no-personalizables no pueden mostrar guía de tallas en su página.
- No es reutilizable: cada plantilla tiene su propia copia.
- No soporta el formato esperado por una tienda de moda real (imagen con marcadores A/B, descripciones de cómo medir, toggle pulgadas/centímetros).

El objetivo es **extraer** la guía de tallas a una entidad propia gestionable desde admin, asignable por producto, y visible tanto en la página pública del producto como en el customizer.

## 2. Decisiones tomadas durante el brainstorming

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Alcance | Todos los productos. Eliminar `CustomizableTemplate.sizeGuide` y migrar datos. |
| 2 | Pestañas | Dinámicas: el admin agrega N tabs con título personalizado. Tabla "Encuentra tu talla" siempre visible debajo (fuera de tabs). |
| 3 | Toggle pulgadas/centímetros | Una unidad principal + override opcional por celda (admin escribe en cm; las pulgadas se autocalculan, salvo overrides como `16 ½`). |
| 4 | Marcadores en imagen | Texto plano: admin sube imagen pre-dibujada (con A, B, líneas...) y configura una lista `{key, label, description}`. |
| 5 | Botón en tienda | Junto al selector de talla, solo si la opción se llama "Talla"/"Size" y el producto tiene guía asignada. |
| 6 | Datos existentes | Migración automática: un script crea una `SizeGuide` por cada `CustomizableTemplate.sizeGuide ≠ null` y enlaza los productos correspondientes. |
| 7 | Herencia por categoría | Solo asignación por producto (más bulk-edit existente). KISS. |

## 3. Modelo de datos

### 3.1 Prisma

```prisma
enum SizeUnit {
  CM
  IN
}

model SizeGuide {
  id        String   @id @default(cuid())
  name      String                              // ej. "Camisetas Unisex"
  unit      SizeUnit @default(CM)               // unidad principal
  tabs      Json     @default("[]")             // SizeGuideTab[]
  table     Json     @default("{}")             // SizeGuideTable
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  products  Product[]

  @@index([active])
}

model Product {
  // …existentes…
  sizeGuideId String?
  sizeGuide   SizeGuide? @relation(fields: [sizeGuideId], references: [id], onDelete: SetNull)

  @@index([sizeGuideId])
}
```

`onDelete: SetNull` → si el admin borra una guía, los productos pierden la asignación pero no se rompen.

### 3.2 Tipos TypeScript (`lib/size-guides/types.ts`)

```ts
export type SizeUnit = "cm" | "in";

export interface SizeGuideMarker {
  key: string;          // "A", "B", "C"
  label: string;        // "Largo"
  description: string;  // texto largo (cómo medir)
}

export interface SizeGuideTab {
  id: string;           // crypto.randomUUID() en el cliente
  title: string;        // "Medidas de producto", "Mídete"
  imageUrl: string | null;
  intro: string | null; // párrafo opcional encima de los marcadores
  markers: SizeGuideMarker[];
}

export interface SizeGuideColumn {
  key: string;          // "largo"
  label: string;        // "Largo"
}

export interface SizeGuideRow {
  size: string;                              // "S", "M", "L"
  values: Record<string, number>;            // valores en unidad principal
  overrides?: Record<string, string>;        // valores en la otra unidad (string para "16 ½")
}

export interface SizeGuideTable {
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
}

export interface SizeGuideData {
  id: string;
  name: string;
  unit: SizeUnit;
  tabs: SizeGuideTab[];
  table: SizeGuideTable;
  active: boolean;
}
```

### 3.3 Conversión cm ↔ in (cliente)

```ts
function renderCell(
  row: SizeGuideRow,
  col: SizeGuideColumn,
  displayUnit: SizeUnit,
  primaryUnit: SizeUnit,
): string {
  const primary = row.values[col.key];
  if (displayUnit === primaryUnit) return String(primary);
  const override = row.overrides?.[col.key];
  if (override) return override;
  const factor = displayUnit === "in" ? 1 / 2.54 : 2.54;
  return (primary * factor).toFixed(1).replace(/\.0$/, "");
}
```

## 4. Admin UI

### 4.1 Sidebar admin

Nuevo ítem top-level **"Guía de Tallas"** en `app/admin/layout.tsx`, insertado en `navItems` justo después de **Personalizables** y antes de **Páginas**. Icono sugerido de `lucide-react`: `Ruler` o `Tag`.

### 4.2 Listado: `/admin/guia-tallas`

Columnas: Nombre · Unidad · # Productos asignados · Estado (activa/inactiva).
Acciones por fila: editar / duplicar / eliminar.

Eliminar muestra confirmación con conteo: *"12 productos perderán su guía. ¿Continuar?"* (texto adaptado por cantidad).

### 4.3 Crear/editar: `/admin/guia-tallas/nueva` y `/admin/guia-tallas/[id]`

Layout en dos columnas (estilo `TemplateForm` actual). La columna izquierda apila dos cards (configuración + pestañas) y la columna derecha contiene la tabla.

**Columna izquierda · Card 1 — Configuración**
- Nombre (input)
- Unidad principal (radio: cm / in)
- Activa (switch)

**Columna izquierda · Card 2 — Pestañas (`SizeGuideTabsEditor`)**
- Lista sortable de pestañas existentes (drag-handle).
- Por cada pestaña:
  - Título (input)
  - Upload de imagen (mismo flujo que `/api/upload` → Vercel Blob)
  - Intro (textarea, opcional)
  - Marcadores (`SizeGuideMarkersEditor`): filas con `key` (corto, p.ej. "A") + `label` ("Largo") + `description` (textarea).
  - Eliminar pestaña (botón con confirmación).
- Botón **+ Añadir pestaña**.

**Columna derecha — Tabla "Encuentra tu talla" (`SizeGuideTableEditor`)**
- Editor de columnas (key + label, agregables/eliminables).
- Editor de filas: cada una con `size` (string corto: XS / S / M / L) + un input numérico por columna en unidad principal.
- Toggle **"Editar overrides"**: despliega una grilla paralela con inputs de texto en la unidad alternativa. Si el override está vacío para una celda, el frontend usa la conversión automática.

Ambas columnas comparten un único botón **Guardar** abajo.

### 4.4 Asignación a producto

En `app/admin/productos/nuevo/page.tsx` y `app/admin/productos/[productId]/page.tsx`, añadir nueva tarjeta:

```
┌───────────────────────────────────────┐
│ Guía de tallas                        │
│ [ Sin guía                       ▾ ]  │
│   • Sin guía                          │
│   • Camisetas Unisex (cm)             │
│   • Polos Niños (cm)                  │
│ [+ Crear nueva guía] (link)           │
└───────────────────────────────────────┘
```

- Solo lista guías con `active = true`.
- El link "Crear nueva guía" abre la pantalla de creación en pestaña nueva.

### 4.5 Cambio en formulario de Plantilla Personalizable

En `components/admin/customizer-templates/TemplateForm.tsx`:
- **Eliminar** el `Card` "Tabla de medidas" + `<SizeGuideEditor>`.
- En su lugar, banner informativo: *"La guía de tallas ahora se asigna desde el producto. [Ir a guías de tallas →]"*.

### 4.6 Permisos RBAC

Añadir 4 permisos nuevos:

| Slug | Asignado a roles |
|---|---|
| `size-guides:view` | Editor (3) y superiores |
| `size-guides:create` | Manager (5) y superiores |
| `size-guides:update` | Manager (5) y superiores |
| `size-guides:delete` | Admin (10) y superiores |

Setup script: `scripts/setup-size-guides-permissions.ts`.

### 4.7 Server Actions (`actions/size-guides.ts`)

```ts
listSizeGuides()                              // listado con _count.products
getSizeGuide(id)                              // detalle
createSizeGuide(data)                         // requirePermission("size-guides:create")
updateSizeGuide(id, data)                     // requirePermission("size-guides:update")
deleteSizeGuide(id)                           // requirePermission("size-guides:delete")
duplicateSizeGuide(id)                        // crea copia "[name] (copia)"
toggleSizeGuideActive(id)
listActiveSizeGuides()                        // para el select del producto
```

Validación con Zod en cada acción (estructura completa de tabs, marcadores, columnas y filas).

La asignación al producto se integra en el `updateProduct` existente añadiendo `sizeGuideId` al esquema; no se crea acción nueva específica.

## 5. Storefront UI

### 5.1 Botón

Componente: `components/shop/size-guide/SizeGuideButton.tsx`.

Renderizado dentro de `components/shop/ProductOptions.tsx` al lado del label de la opción cuyo nombre coincide con `talla` o `size` (case-insensitive), solo si `product.sizeGuide ≠ null`.

### 5.2 Modal flotante

Componente: `components/shop/size-guide/SizeGuideModal.tsx`.

Layout:
- Sheet lateral derecho en desktop (Radix `Dialog` con clases de sidebar).
- Pantalla completa en mobile.
- Cabecera: título "Guía de tallas" + botón cerrar.
- Tabs de arriba (sólo si hay 2 o más). Si hay 1 tab, se omite la barra de tabs y se muestra el contenido directo.
- Contenido del tab seleccionado: imagen (si existe) + intro + lista de marcadores.
- Sección inferior fija: "Encuentra tu talla" con toggle de unidad y tabla.

### 5.3 Componentes nuevos

```
components/shop/size-guide/
├── SizeGuideButton.tsx
├── SizeGuideModal.tsx
├── SizeGuideTabContent.tsx
├── SizeGuideTable.tsx
└── format-cell.ts           // helper de conversión + override
```

### 5.4 Carga de datos

En `app/(shop)/productos/[slug]/page.tsx`, ampliar el `findUnique`:

```diff
include: {
  // …existentes…
+ sizeGuide: { where: { active: true } },
}
```

Pasar `product.sizeGuide` como prop a `<ProductOptions>`. Si es `null`, el botón no se renderiza.

## 6. Integración con customizer

### 6.1 Reemplazo del drawer

- **Borrar** `components/customizer/LeftSidebar/SizeGuideDrawer.tsx`.
- En `components/customizer/LeftSidebar/ProductTab.tsx`:
  - Reemplazar import por `SizeGuideModal` (de shop).
  - Cambiar la condición de visibilidad de `template?.sizeGuide` a `product.sizeGuide`.
  - Cambiar el render del modal a `<SizeGuideModal guide={product.sizeGuide} … />`.

### 6.2 Cambio en el tipo `BuilderProduct` y en el store del builder

En `components/customizer/CustomizerLayout.tsx`:
- Añadir `sizeGuide: SizeGuideData | null` a `BuilderProduct`.

En el store del builder (`components/customizer/store.ts` o equivalente que provee `template` a `useBuilderStore`):
- Quitar `sizeGuide` del tipo del `template` (deja de leerse del template; lo lee `product` directamente).

### 6.3 Cargador de producto en el customizer

Ampliar el `findUnique` con `include: { sizeGuide: { where: { active: true } } }` y propagar al `BuilderProduct`.

### 6.4 Limpieza

- En `actions/customizer.ts`: quitar `sizeGuide` del schema de plantilla y de la lectura.
- En `lib/customizer/types.ts`: mover `SizeGuide` y `SizeGuideRow` a `lib/size-guides/types.ts` (eliminar de `customizer/types.ts`).
- Tests `actions/__tests__/customizer.test.ts` y `components/customizer/__tests__/store.test.ts`: actualizar fixtures sin `sizeGuide` en template.

## 7. Migración de datos (expand-contract)

### 7.1 Paso 1 — Migración Prisma "expand"

Añadir `SizeGuide` model + `Product.sizeGuideId` + enum `SizeUnit`. **No** elimina `CustomizableTemplate.sizeGuide` todavía.

### 7.2 Paso 2 — Script de migración

`scripts/migrate-customizable-size-guides.ts`:

```ts
const templates = await prisma.customizableTemplate.findMany({
  where: { sizeGuide: { not: Prisma.JsonNull } },
  include: { products: { select: { id: true } } },
});

for (const tpl of templates) {
  const legacy = tpl.sizeGuide as { unit: "cm" | "in"; columns: ColumnDef[]; rows: RowDef[]; notes?: string };

  const newGuide = {
    name: `Guía de ${tpl.name}`,
    unit: legacy.unit === "in" ? "IN" : "CM",
    tabs: legacy.notes
      ? [{ id: crypto.randomUUID(), title: "Notas", imageUrl: null, intro: legacy.notes, markers: [] }]
      : [],
    table: {
      columns: legacy.columns,
      rows: legacy.rows.map(r => ({ size: r.size, values: r.values })),
    },
    active: true,
  };

  const created = await prisma.sizeGuide.create({ data: newGuide });

  await prisma.product.updateMany({
    where: { id: { in: tpl.products.map(p => p.id) }, sizeGuideId: null },
    data: { sizeGuideId: created.id },
  });
}
```

Características:
- **Idempotente**: respeta productos que ya tengan `sizeGuideId`.
- **No destructivo**: no toca `CustomizableTemplate.sizeGuide`.
- **Logging claro**: imprime conteo por plantilla migrada.

### 7.3 Paso 3 — Migración Prisma "contract"

Migración aparte: `ALTER TABLE "CustomizableTemplate" DROP COLUMN "sizeGuide";`. Solo se ejecuta tras verificar que el código nuevo está en producción y la migración de datos corrió OK.

### 7.4 Cleanup de archivos

Borrar:
- `components/admin/customizer-templates/SizeGuideEditor.tsx`
- `components/customizer/LeftSidebar/SizeGuideDrawer.tsx`

Editar:
- `components/admin/customizer-templates/TemplateForm.tsx`
- `components/customizer/LeftSidebar/ProductTab.tsx`
- `components/customizer/CustomizerLayout.tsx`
- `actions/customizer.ts`
- `lib/customizer/types.ts`
- Tests asociados.

## 8. Plan de implementación (fases)

| Fase | Descripción | Hecho cuando |
|---|---|---|
| 1 | Modelo Prisma + migración expand + tipos TS | `npm run build` pasa |
| 2 | Server actions + Zod + setup permisos | Acciones tipean, schemas validan fixtures |
| 3 | Admin: listado + form CRUD + sidebar | Admin puede crear/editar/borrar guías |
| 4 | Asignación en form de Producto | Asignación funcional con select |
| 5 | Storefront: modal + botón + carga | Modal aparece en producto público |
| 6 | Integración customizer | Customizer usa el mismo modal compartido |
| 7 | Script migración de datos | Guías legacy migradas a `SizeGuide` filas |
| 8 | Cleanup final (PR separado, post-deploy) | Drop de columna legacy + archivos borrados |

Las fases 1–7 entran en un único PR. La fase 8 entra en un PR separado, después de:
1. Confirmar que el script de migración corrió OK en producción.
2. Validar manualmente 1–2 productos personalizables migrados.
3. Tener el código nuevo desplegado y en uso al menos un día.

## 9. Smoke test al terminar

1. Crear guía con 2 tabs + tabla de 4 tallas + override en 1 celda.
2. Asignar guía a un producto desde el admin.
3. Página pública del producto: botón aparece junto a "Talla" → modal abre → tabs funcionan → toggle cm/in muestra override correcto.
4. Customizer del mismo producto: mismo modal aparece desde el link "Guía de tallas".
5. Eliminar la guía desde admin: productos pierden asignación pero no se rompen.

## 10. No incluido (out of scope)

- Herencia por categoría (sólo bulk-edit existente).
- Marcadores posicionables sobre la imagen (admin sube imagen pre-dibujada).
- Rich text en descripciones de marcadores (texto plano + saltos de línea con `whiteSpace: pre-line`).
- Soporte automático para sistemas de tallas no-tablas (calzado por número, anillos por diámetro). Se cubre con el modelo actual configurando columnas adecuadas.
- A/B testing de guías por producto.
- Versionado / historial de guías.

## 11. Riesgos

- **Migración**: si la estructura legacy de `CustomizableTemplate.sizeGuide` tiene filas con `values` faltantes o columnas inconsistentes, el script puede crear una guía rota. Mitigación: el script valida con Zod antes de escribir y reporta errores sin abortar el resto.
- **UX del editor de overrides**: doble grilla puede confundir al admin. Mitigación: arrancar con la grilla principal visible; los overrides quedan tras un toggle "Editar overrides en otra unidad" para evitar saturar la pantalla.
- **Tests del customizer**: los tests existentes usan fixtures con `sizeGuide` en el template. Hay que actualizarlos en la fase 6 para evitar regresiones.
