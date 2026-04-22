# Design Spec: Import/Export de Productos y Filtros de Órdenes
**Date:** 2026-04-22
**Status:** Approved
**Scope:** Dos módulos para shopgood-pe: (A) importación/exportación masiva de productos con soporte Shopify CSV, (B) filtros avanzados y export de órdenes.

---

## Overview

Dos módulos independientes que mejoran las operaciones administrativas:

1. **Import/Export de Productos** — wizard de 4 pasos para importar catálogos desde Shopify CSV o CSV genérico (upsert: crea si no existe, actualiza si existe). Export en ambos formatos con filtros opcionales.
2. **Filtros + Export de Órdenes** — panel de filtros avanzados integrado en la página de órdenes existente, más exportación CSV de los resultados filtrados.

---

## Módulo A: Import/Export de Productos

### Entrypoint

Botones **"Importar"** y **"Exportar"** añadidos al header de `/admin/productos`. Redirigen a:
- `/admin/productos/importar` — wizard de import
- `/admin/productos/exportar` — página de export

### A1: Wizard de Import (`/admin/productos/importar`)

#### Paso 1 — Subir archivo
- Radio buttons: "Shopify CSV" | "CSV Genérico"
- File input que acepta `.csv`
- Botón "Siguiente" deshabilitado hasta que haya archivo seleccionado

#### Paso 2 — Preview y validación
- El CSV se parsea en el **cliente** usando `papaparse`
- Validación client-side: campos requeridos vacíos, precios inválidos, SKUs duplicados dentro del CSV — filas con error se marcan en rojo con descripción del motivo
- Una vez parseado, se envían solo los slugs/handles a Server Action `checkExistingSlugs(slugs[])` que hace una sola query de lectura (`SELECT slug WHERE slug IN [...]`) y retorna cuáles ya existen en la BD
- Tabla resumen final con:
  - Total de filas detectadas
  - X productos a **crear** (slug no existe en BD)
  - Y productos a **actualizar** (slug ya existe en BD)
  - Z filas con **errores** (se saltarán durante el import)
- El usuario puede continuar aunque haya errores

#### Paso 3 — Ejecutar import
- El CSV válido se envía al servidor en lotes de 20 filas
- Progress bar con contador en tiempo real: "Creados: X / Actualizados: Y / Errores: Z"
- Procesado por Server Action `importProducts(rows, format)` en `actions/products-import.ts`
- Upsert usando `prisma.product.upsert()` con `where: { slug }` como clave de matching
- Variantes se manejan con `upsert` por SKU dentro de cada producto

#### Paso 4 — Resultado
- Resumen final: ✅ X creados, 🔄 Y actualizados, ❌ Z errores
- Si hay errores: botón **"Descargar filas con error"** genera CSV con solo esas filas + columna `error_motivo`
- Botón **"Ver productos"** navega a `/admin/productos`

### A2: Lógica de matching para upsert

| Formato | Clave de matching | Campo en BD |
|---------|-------------------|-------------|
| Shopify CSV | Columna `Handle` | `Product.slug` |
| CSV Genérico | Columna `slug` | `Product.slug` |

### A3: Formato CSV Genérico

Columnas soportadas en import y export:

```
slug, nombre, descripcion, descripcion_corta, precio, precio_comparacion, peso,
stock, sku, destacado, categoria_slug, estado, igv_tipo, meta_titulo, meta_descripcion,
sku_variante, precio_variante, stock_variante, imagen_url
```

- Un producto sin variantes ocupa una sola fila
- Un producto con N variantes ocupa N filas (mismo `slug`, distinto `sku_variante`)
- `categoria_slug` hace lookup de la categoría por slug; si no existe se deja sin categoría
- `estado`: `ACTIVE` | `DRAFT` → mapea a `Product.active` (true/false)
- `igv_tipo`: `GRAVADO` | `EXONERADO` | `INAFECTO`
- `destacado`: `true` | `false` → mapea a `Product.featured`
- `peso`: número decimal en kg → mapea a `Product.weight`
- `sku`: SKU a nivel producto (para productos sin variantes) → mapea a `Product.sku`
- `meta_titulo` / `meta_descripcion`: si vienen vacíos en un update, no se sobreescriben

### A4: Formato Shopify CSV (export)

Los campos del sistema se mapean a las columnas estándar de Shopify para que el archivo pueda subirse directamente a Shopify sin modificaciones:

| Campo Shopify | Fuente en sistema |
|---------------|-------------------|
| `Handle` | `Product.slug` |
| `Title` | `Product.name` |
| `Body (HTML)` | `Product.description` |
| `Vendor` | vacío (no aplica) |
| `Tags` | vacío |
| `Published` | `true` si `ACTIVE`, `false` si `DRAFT` |
| `Option1 Name` | `ProductOption[0].name` |
| `Option1 Value` | `ProductOptionValue` de la variante |
| `Option2 Name` | `ProductOption[1].name` |
| `Option2 Value` | `ProductOptionValue` de la variante |
| `Variant SKU` | `ProductVariant.sku` |
| `Variant Price` | `ProductVariant.price` |
| `Variant Compare At Price` | `Product.compareAtPrice` |
| `Variant Inventory Qty` | `ProductVariant.stock` |
| `Image Src` | primera imagen del producto |
| `Image Alt` | `Product.name` |
| `SEO Title` | `Product.metaTitle` |
| `SEO Description` | `Product.metaDescription` |
| `Variant Weight` | `Product.weight` |
| `Variant Weight Unit` | `kg` (fijo) |

### A5: Página de Export (`/admin/productos/exportar`)

Página simple con:
- **Formato:** radio — "Shopify CSV" | "CSV Genérico"
- **Estado:** select — Todos / Solo activos / Solo borradores
- **Categoría:** select — Todas / [lista de categorías]
- Botón **"Descargar CSV"**

Implementación: Server Action `exportProducts(format, filters)` en `actions/products-export.ts`. Genera CSV en memoria con `papaparse`, retorna `Response` con header `Content-Disposition: attachment; filename="productos-YYYY-MM-DD.csv"`. Encoding UTF-8 con BOM para compatibilidad con Excel.

---

## Módulo B: Filtros + Export de Órdenes

### Entrypoint

Panel de filtros colapsable añadido encima de la tabla existente en `/admin/ordenes`. Los filtros persisten como **URL search params** para que sean shareables y sobrevivan recarga.

### B1: Filtros disponibles

| Filtro | Control | Campo Prisma |
|--------|---------|--------------|
| Fecha desde / hasta | Date pickers | `createdAt >= desde AND createdAt <= hasta` |
| Estado de orden | Checkboxes múltiples | `status: { in: [...] }` |
| Método de pago | Checkboxes múltiples | `paymentMethod: { in: [...] }` |
| Producto | Búsqueda con autocomplete | Join a `OrderItem.productId` |
| Categoría | Select | Join a `OrderItem.product.categoryId` |
| Departamento | Select | `shippingAddress.department` |
| Provincia | Select (cascada) | `shippingAddress.province` |
| Distrito | Select (cascada) | `shippingAddress.district` |
| Cliente | Campo de texto libre | `OR: [{ customer.firstName contains }, { customer.email contains }, { customer.phone contains }]` |
| Monto total mínimo / máximo | Inputs numéricos | `total >= min AND total <= max` |

**Estados de orden disponibles:** PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

**Métodos de pago disponibles:** Tarjeta (CULQI), Yape, Plin, PayPal, COD, Transferencia

**Comportamiento del panel:**
- Botón **"Aplicar filtros"** ejecuta la búsqueda (no en tiempo real)
- Botón **"Limpiar"** resetea todos los params de URL
- Paginación existente se resetea al cambiar filtros
- Contador de resultados: "X órdenes encontradas"

### B2: Export de Órdenes

Botón **"Exportar CSV"** en el header de `/admin/ordenes`, junto al panel de filtros. Exporta **todas** las órdenes que cumplen los filtros activos (sin límite de paginación).

**Columnas del CSV exportado:**

| Columna | Fuente |
|---------|--------|
| Número de orden | `orderSeq` formateado (ej: PED-0001) |
| Fecha | `createdAt` (formato DD/MM/YYYY HH:mm) |
| Estado | `status` |
| Estado de pago | `paymentStatus` |
| Estado de envío | `fulfillmentStatus` |
| Cliente | `customerName` |
| DNI | `customerDni` |
| Email | `customerEmail` |
| Teléfono | `customerPhone` |
| Tipo de documento | `documentType` (boleta/factura) |
| RUC | `buyerRuc` |
| Razón social | `buyerRazonSocial` |
| Método de pago | `paymentMethod` |
| Método de envío | `shippingMethod` |
| Subtotal | `subtotal` |
| Descuento | `discount` |
| Cupón | `couponCode` |
| Descuento cupón | `couponDiscount` |
| IGV | `tax` |
| Envío | `shipping` |
| Total | `total` |
| Productos | `"Nombre x cantidad; Nombre x cantidad"` |
| Notas del cliente | `customerNotes` |
| Dirección | calle completa |
| Distrito | `shippingAddress.district` |
| Provincia | `shippingAddress.province` |
| Departamento | `shippingAddress.department` |
| Número de seguimiento | `trackingNumber` |
| Courier | `shippingCourier` |
| Entrega estimada | `estimatedDelivery` (DD/MM/YYYY) |
| Fecha de pago | `paidAt` (DD/MM/YYYY HH:mm) |
| Fecha de envío | `shippedAt` (DD/MM/YYYY HH:mm) |
| Fecha de entrega | `deliveredAt` (DD/MM/YYYY HH:mm) |
| Puntos ganados | `pointsEarned` |
| Puntos usados | `pointsUsed` |
| Notas admin | `adminNotes` |

Implementación: Server Action `exportOrders(filters)` en `actions/orders-export.ts`. Recibe los mismos params de filtro que la página. CSV con encoding UTF-8 + BOM para Excel.

---

## Dependencias técnicas

- **`papaparse`** — parseo y generación de CSV (añadir a `package.json`)
- **No se requieren cambios al schema de Prisma** — todo el procesamiento es en memoria
- Los selects de Departamento/Provincia/Distrito reutilizan `lib/districts-peru.ts` existente

## Archivos nuevos / modificados

### Nuevos
| Archivo | Propósito |
|---------|-----------|
| `app/admin/productos/importar/page.tsx` | Wizard de import (4 pasos) |
| `app/admin/productos/exportar/page.tsx` | Página de export con opciones |
| `actions/products-import.ts` | Server Actions: `checkExistingSlugs()` (lectura) + `importProducts()` (escritura en lotes) |
| `actions/products-export.ts` | Server Action: generar CSV de productos |
| `actions/orders-export.ts` | Server Action: generar CSV de órdenes |
| `lib/csv-shopify.ts` | Mapeo entre formato Shopify y modelo interno |
| `lib/csv-generic.ts` | Mapeo entre CSV genérico y modelo interno |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `app/admin/productos/page.tsx` | Añadir botones Import / Export en header |
| `app/admin/ordenes/page.tsx` | Añadir panel de filtros y botón Export |
| `components/admin/NewProductForm.tsx` | Añadir campo "Peso (kg)" — el campo existe en schema y estado pero falta el input UI |
| `app/admin/productos/[productId]/page.tsx` | Añadir campo "Peso (kg)" — mismo caso que el formulario de creación |
