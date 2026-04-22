# Import/Export de Productos y Filtros de Órdenes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar import/export masivo de productos (formatos Shopify y genérico) con wizard de 4 pasos, y filtros avanzados + export CSV en la página de órdenes del admin.

**Architecture:** Módulo A usa un wizard Client Component para el import (papaparse client-side + Server Actions para escritura) y un API Route GET para el export de productos. Módulo B agrega un panel de filtros Client Component a la página de órdenes existente y un API Route GET para el export. Los filtros persisten en URL params. Sin cambios al schema de Prisma.

**Tech Stack:** Next.js App Router, Prisma, papaparse (CSV), shadcn/ui, Zod, `lib/districts-peru.ts` existente.

**Spec:** `docs/superpowers/specs/2026-04-22-importacion-exportacion-filtros-design.md`

---

> **Nota de scope:** Los Módulos A y B son independientes. Si se quiere implementar solo el Módulo B (filtros de órdenes) primero, se puede hacer directamente desde la Tarea 10.

---

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `lib/csv-generic.ts` | Mappers entre modelo Product y CSV genérico |
| `lib/csv-shopify.ts` | Mappers entre modelo Product y Shopify CSV |
| `actions/products-import.ts` | Server Actions: `checkExistingSlugs` + `importProducts` |
| `app/admin/productos/importar/page.tsx` | Wizard de import (4 pasos, Client Component) |
| `app/api/admin/products/export/route.ts` | API Route GET para descargar CSV de productos |
| `app/admin/productos/exportar/page.tsx` | Página de export con opciones |
| `components/admin/OrderFiltersPanel.tsx` | Panel de filtros de órdenes (Client Component) |
| `app/api/admin/orders/export/route.ts` | API Route GET para descargar CSV de órdenes |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/admin/productos/page.tsx` | Añadir botones Import / Export en header |
| `app/admin/ordenes/page.tsx` | Añadir `OrderFiltersPanel` y botón Export |
| `components/admin/NewProductForm.tsx` | Añadir campo peso (kg) |
| `components/admin/EditProductForm.tsx` | Añadir campo peso (kg) |
| `app/admin/productos/create/route.ts` | Incluir `weight` en la creación |

---

## Tarea 1: Instalar papaparse

**Archivos:** `package.json`

- [ ] **Paso 1: Instalar paquete**

```bash
npm install papaparse @types/papaparse
```

- [ ] **Paso 2: Verificar instalación**

```bash
node -e "const p = require('papaparse'); console.log('OK', typeof p.parse)"
```

Resultado esperado: `OK function`

- [ ] **Paso 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add papaparse for CSV import/export"
```

---

## Tarea 2: Añadir campo Peso a formularios de producto

**Archivos:**
- Modify: `components/admin/NewProductForm.tsx`
- Modify: `components/admin/EditProductForm.tsx`
- Modify: `app/admin/productos/create/route.ts`

### 2a — NewProductForm: añadir `weight` al estado y al UI

- [ ] **Paso 1: Añadir `weight` al formData state**

En `components/admin/NewProductForm.tsx`, buscar el `useState` de `formData` (línea ~72) y añadir `weight`:

```tsx
const [formData, setFormData] = useState({
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  basePrice: "",
  compareAtPrice: "",
  sku: "",
  stock: "",
  weight: "",          // ← AÑADIR
  categoryId: "",
  images: [] as string[],
  active: true,
  featured: false,
  hasVariants: false,
  template: "STANDARD",
  checkoutMode: "STANDARD",
  codFormSettings: DEFAULT_COD_FORM_SETTINGS as CodFormSettings,
  metaTitle: "",
  metaDescription: "",
});
```

- [ ] **Paso 2: Añadir input UI de peso**

Buscar el bloque del campo `stock` (tiene `type="number"`) en la sección "Precio e Inventario" del NewProductForm. Añadir el campo peso inmediatamente después del bloque stock, dentro del mismo grid:

```tsx
<div>
  <Label htmlFor="weight">Peso (kg)</Label>
  <Input
    id="weight"
    name="weight"
    type="number"
    step="0.01"
    min="0"
    placeholder="0.00"
    value={formData.weight}
    onChange={handleInputChange}
  />
  <p className="text-xs text-muted-foreground mt-1">
    Usado para calcular tarifas de envío por peso
  </p>
</div>
```

- [ ] **Paso 3: Incluir weight en el payload que se envía al crear**

Buscar en NewProductForm el `fetch` hacia `/admin/productos/create` (o similar). Añadir `weight` al body:

```tsx
weight: formData.weight ? parseFloat(formData.weight) : null,
```

### 2b — EditProductForm: añadir `weight` al estado y al UI

- [ ] **Paso 4: Añadir `weight` al formData state de EditProductForm**

En `components/admin/EditProductForm.tsx`, buscar el `useState` de `formData` (línea ~85) y añadir:

```tsx
weight: product.weight?.toString() || "",
```

- [ ] **Paso 5: Añadir input UI de peso en EditProductForm**

En la sección "Precio e Inventario" de EditProductForm (después del bloque de stock ~línea 535), añadir el mismo bloque:

```tsx
<div>
  <Label htmlFor="weight">Peso (kg)</Label>
  <Input
    id="weight"
    name="weight"
    type="number"
    step="0.01"
    min="0"
    placeholder="0.00"
    value={formData.weight}
    onChange={handleInputChange}
  />
  <p className="text-xs text-muted-foreground mt-1">
    Usado para calcular tarifas de envío por peso
  </p>
</div>
```

- [ ] **Paso 6: Incluir weight en el payload de actualización**

Buscar en EditProductForm el objeto que se envía al `PUT` (línea ~300). Añadir:

```tsx
weight: formData.weight ? parseFloat(formData.weight) : null,
```

### 2c — create/route.ts: incluir weight

- [ ] **Paso 7: Añadir weight al prisma.product.create**

En `app/admin/productos/create/route.ts`, dentro del bloque `prisma.product.create({ data: { ... } })`, añadir después de `featured`:

```ts
weight: data.weight ? parseFloat(data.weight) : null,
metaTitle: data.metaTitle || null,
metaDescription: data.metaDescription || null,
```

> **Nota:** `metaTitle` y `metaDescription` también faltaban en el create route — añadirlos al mismo tiempo.

- [ ] **Paso 8: Verificar manualmente**

1. `npm run build` — debe pasar sin errores TypeScript
2. Abrir `http://localhost:3000/admin/productos/nuevo` — verificar que aparece el campo "Peso (kg)" en la sección de Precio e Inventario
3. Crear un producto de prueba con peso `1.5` — verificar que se guarda correctamente en Prisma Studio (`npx prisma studio`)

- [ ] **Paso 9: Commit**

```bash
git add components/admin/NewProductForm.tsx components/admin/EditProductForm.tsx app/admin/productos/create/route.ts
git commit -m "feat: add weight field to product create and edit forms"
```

---

## Tarea 3: Crear lib/csv-generic.ts

**Archivos:**
- Create: `lib/csv-generic.ts`

Este archivo convierte entre el modelo Product de Prisma y filas CSV genéricas.

- [ ] **Paso 1: Crear el archivo**

```ts
// lib/csv-generic.ts
import Papa from "papaparse";

export interface GenericProductRow {
  slug: string;
  nombre: string;
  descripcion: string;
  descripcion_corta: string;
  precio: string;
  precio_comparacion: string;
  peso: string;
  stock: string;
  sku: string;
  destacado: string;
  categoria_slug: string;
  estado: string;
  igv_tipo: string;
  meta_titulo: string;
  meta_descripcion: string;
  sku_variante: string;
  precio_variante: string;
  stock_variante: string;
  imagen_url: string;
}

export const GENERIC_HEADERS: (keyof GenericProductRow)[] = [
  "slug", "nombre", "descripcion", "descripcion_corta",
  "precio", "precio_comparacion", "peso", "stock", "sku", "destacado",
  "categoria_slug", "estado", "igv_tipo", "meta_titulo", "meta_descripcion",
  "sku_variante", "precio_variante", "stock_variante", "imagen_url",
];

/** Convierte un producto Prisma a filas CSV genéricas (una por variante, o una si no tiene variantes) */
export function productToGenericRows(product: any): GenericProductRow[] {
  const categorySlug = product.categories?.[0]?.category?.slug ?? "";
  const images: string[] = Array.isArray(product.images) ? product.images : [];
  const firstImage = images[0] ?? "";

  const base = {
    slug: product.slug,
    nombre: product.name,
    descripcion: product.description ?? "",
    descripcion_corta: product.shortDescription ?? "",
    precio: String(product.basePrice),
    precio_comparacion: product.compareAtPrice ? String(product.compareAtPrice) : "",
    peso: product.weight ? String(product.weight) : "",
    destacado: product.featured ? "true" : "false",
    categoria_slug: categorySlug,
    estado: product.active ? "ACTIVE" : "DRAFT",
    igv_tipo: product.igvType ?? "GRAVADO",
    meta_titulo: product.metaTitle ?? "",
    meta_descripcion: product.metaDescription ?? "",
    imagen_url: firstImage,
  };

  if (!product.hasVariants || !product.variants?.length) {
    return [{
      ...base,
      stock: String(product.stock),
      sku: product.sku ?? "",
      sku_variante: "",
      precio_variante: "",
      stock_variante: "",
    }];
  }

  return product.variants.map((v: any) => ({
    ...base,
    stock: "",
    sku: product.sku ?? "",
    sku_variante: v.sku,
    precio_variante: String(v.price),
    stock_variante: String(v.stock),
  }));
}

/** Parsea filas CSV genéricas y las agrupa por slug en ProductInput */
export function genericRowsToProductInputs(rows: GenericProductRow[]): Map<string, any> {
  const bySlug = new Map<string, any>();

  for (const row of rows) {
    if (!row.slug || !row.nombre) continue;

    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, {
        slug: row.slug,
        name: row.nombre,
        description: row.descripcion || null,
        shortDescription: row.descripcion_corta || null,
        basePrice: parseFloat(row.precio) || 0,
        compareAtPrice: row.precio_comparacion ? parseFloat(row.precio_comparacion) : null,
        weight: row.peso ? parseFloat(row.peso) : null,
        stock: parseInt(row.stock) || 0,
        sku: row.sku || null,
        featured: row.destacado === "true",
        active: row.estado !== "DRAFT",
        igvType: (["GRAVADO","EXONERADO","INAFECTO"].includes(row.igv_tipo) ? row.igv_tipo : "GRAVADO") as any,
        metaTitle: row.meta_titulo || null,
        metaDescription: row.meta_descripcion || null,
        categorySlug: row.categoria_slug || null,
        imageUrl: row.imagen_url || null,
        variants: [] as any[],
      });
    }

    if (row.sku_variante) {
      bySlug.get(row.slug).variants.push({
        sku: row.sku_variante,
        price: parseFloat(row.precio_variante) || bySlug.get(row.slug).basePrice,
        stock: parseInt(row.stock_variante) || 0,
      });
    }
  }

  return bySlug;
}

/** Genera un CSV genérico en memoria y retorna el string */
export function generateGenericCsv(products: any[]): string {
  const rows: GenericProductRow[] = products.flatMap(productToGenericRows);
  return Papa.unparse(rows, { columns: GENERIC_HEADERS });
}

/** Valida una fila CSV genérica. Retorna null si es válida, o string con el error */
export function validateGenericRow(row: GenericProductRow, rowIndex: number): string | null {
  if (!row.slug) return `Fila ${rowIndex + 1}: falta 'slug'`;
  if (!row.nombre) return `Fila ${rowIndex + 1}: falta 'nombre'`;
  if (row.precio && isNaN(parseFloat(row.precio))) return `Fila ${rowIndex + 1}: 'precio' no es un número válido`;
  if (row.peso && isNaN(parseFloat(row.peso))) return `Fila ${rowIndex + 1}: 'peso' no es un número válido`;
  return null;
}
```

- [ ] **Paso 2: Commit**

```bash
git add lib/csv-generic.ts
git commit -m "feat: add generic CSV product mapper"
```

---

## Tarea 4: Crear lib/csv-shopify.ts

**Archivos:**
- Create: `lib/csv-shopify.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// lib/csv-shopify.ts
import Papa from "papaparse";

export interface ShopifyProductRow {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Tags: string;
  Published: string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Variant SKU": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Inventory Qty": string;
  "Variant Weight": string;
  "Variant Weight Unit": string;
  "Image Src": string;
  "Image Alt": string;
  "SEO Title": string;
  "SEO Description": string;
}

export const SHOPIFY_HEADERS: (keyof ShopifyProductRow)[] = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
  "Variant SKU", "Variant Price", "Variant Compare At Price",
  "Variant Inventory Qty", "Variant Weight", "Variant Weight Unit",
  "Image Src", "Image Alt", "SEO Title", "SEO Description",
];

/** Convierte un producto Prisma a filas Shopify CSV */
export function productToShopifyRows(product: any): ShopifyProductRow[] {
  const images: string[] = Array.isArray(product.images) ? product.images : [];
  const firstImage = images[0] ?? "";
  const options = product.options ?? [];

  const base: Partial<ShopifyProductRow> = {
    Handle: product.slug,
    Title: product.name,
    "Body (HTML)": product.description ?? "",
    Vendor: "",
    Tags: "",
    Published: product.active ? "TRUE" : "FALSE",
    "Image Src": firstImage,
    "Image Alt": product.name,
    "SEO Title": product.metaTitle ?? "",
    "SEO Description": product.metaDescription ?? "",
    "Variant Compare At Price": product.compareAtPrice ? String(product.compareAtPrice) : "",
    "Variant Weight": product.weight ? String(product.weight) : "",
    "Variant Weight Unit": product.weight ? "kg" : "",
  };

  if (!product.hasVariants || !product.variants?.length) {
    return [{
      ...base,
      "Option1 Name": "",
      "Option1 Value": "",
      "Option2 Name": "",
      "Option2 Value": "",
      "Variant SKU": product.sku ?? "",
      "Variant Price": String(product.basePrice),
      "Variant Inventory Qty": String(product.stock),
    } as ShopifyProductRow];
  }

  return product.variants.map((v: any) => {
    const variantOptions = v.options as Record<string, string> ?? {};
    const optionNames = options.map((o: any) => o.name);
    const optionValues = optionNames.map((name: string) => variantOptions[name] ?? "");

    return {
      ...base,
      "Option1 Name": optionNames[0] ?? "",
      "Option1 Value": optionValues[0] ?? "",
      "Option2 Name": optionNames[1] ?? "",
      "Option2 Value": optionValues[1] ?? "",
      "Variant SKU": v.sku,
      "Variant Price": String(v.price),
      "Variant Inventory Qty": String(v.stock),
    } as ShopifyProductRow;
  });
}

/** Agrupa filas Shopify por Handle y convierte a ProductInput */
export function shopifyRowsToProductInputs(rows: ShopifyProductRow[]): Map<string, any> {
  const byHandle = new Map<string, any>();

  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;

    if (!byHandle.has(handle)) {
      byHandle.set(handle, {
        slug: handle,
        name: row.Title,
        description: row["Body (HTML)"] || null,
        shortDescription: null,
        basePrice: parseFloat(row["Variant Price"]) || 0,
        compareAtPrice: row["Variant Compare At Price"] ? parseFloat(row["Variant Compare At Price"]) : null,
        weight: row["Variant Weight"] ? parseFloat(row["Variant Weight"]) : null,
        active: row.Published?.toUpperCase() === "TRUE",
        featured: false,
        igvType: "GRAVADO" as any,
        metaTitle: row["SEO Title"] || null,
        metaDescription: row["SEO Description"] || null,
        categorySlug: null,
        imageUrl: row["Image Src"] || null,
        variants: [] as any[],
        _option1Name: row["Option1 Name"],
        _option2Name: row["Option2 Name"],
      });
    }

    if (row["Variant SKU"]) {
      const product = byHandle.get(handle);
      const options: Record<string, string> = {};
      if (product._option1Name && row["Option1 Value"]) options[product._option1Name] = row["Option1 Value"];
      if (product._option2Name && row["Option2 Value"]) options[product._option2Name] = row["Option2 Value"];

      product.variants.push({
        sku: row["Variant SKU"],
        price: parseFloat(row["Variant Price"]) || product.basePrice,
        stock: parseInt(row["Variant Inventory Qty"]) || 0,
        options,
      });
    }
  }

  return byHandle;
}

/** Genera CSV Shopify en memoria */
export function generateShopifyCsv(products: any[]): string {
  const rows: ShopifyProductRow[] = products.flatMap(productToShopifyRows);
  return Papa.unparse(rows, { columns: SHOPIFY_HEADERS });
}

/** Valida una fila Shopify. Retorna null si es válida */
export function validateShopifyRow(row: ShopifyProductRow, rowIndex: number): string | null {
  if (!row.Handle) return `Fila ${rowIndex + 1}: falta 'Handle'`;
  if (!row.Title && rowIndex === 0) return `Fila ${rowIndex + 1}: falta 'Title'`;
  return null;
}
```

- [ ] **Paso 2: Commit**

```bash
git add lib/csv-shopify.ts
git commit -m "feat: add Shopify CSV product mapper"
```

---

## Tarea 5: Crear actions/products-import.ts

**Archivos:**
- Create: `actions/products-import.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// actions/products-import.ts
"use server";

import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";

/** Verifica qué slugs ya existen en la BD. Retorna un array de slugs existentes. */
export async function checkExistingSlugs(slugs: string[]): Promise<string[]> {
  await protectRoute("products:edit");

  const existing = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });

  return existing.map((p) => p.slug);
}

export interface ImportRow {
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  weight: number | null;
  stock: number;
  sku: string | null;
  featured: boolean;
  active: boolean;
  igvType: "GRAVADO" | "EXONERADO" | "INAFECTO";
  metaTitle: string | null;
  metaDescription: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  variants: Array<{
    sku: string;
    price: number;
    stock: number;
    options?: Record<string, string>;
  }>;
}

export interface ImportBatchResult {
  created: number;
  updated: number;
  errors: Array<{ slug: string; message: string }>;
}

/** Importa un lote de productos. Retorna contadores de éxito y error. */
export async function importProductsBatch(rows: ImportRow[]): Promise<ImportBatchResult> {
  await protectRoute("products:edit");

  const result: ImportBatchResult = { created: 0, updated: 0, errors: [] };

  // Buscar categorías referenciadas
  const categorySlugs = [...new Set(rows.map((r) => r.categorySlug).filter(Boolean))] as string[];
  const categories = await prisma.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Verificar cuáles ya existen
  const slugs = rows.map((r) => r.slug);
  const existing = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((p) => p.slug));

  for (const row of rows) {
    try {
      const categoryId = row.categorySlug ? categoryBySlug.get(row.categorySlug) : undefined;
      const images = row.imageUrl ? [row.imageUrl] : [];

      const productData = {
        name: row.name,
        description: row.description,
        shortDescription: row.shortDescription,
        basePrice: row.basePrice,
        compareAtPrice: row.compareAtPrice,
        weight: row.weight,
        stock: row.stock,
        sku: row.sku,
        featured: row.featured,
        active: row.active,
        igvType: row.igvType,
        metaTitle: row.metaTitle,
        metaDescription: row.metaDescription,
        images,
        hasVariants: row.variants.length > 0,
      };

      if (existingSet.has(row.slug)) {
        // UPDATE
        await prisma.product.update({
          where: { slug: row.slug },
          data: productData,
        });

        // Upsert variantes
        for (const v of row.variants) {
          await prisma.productVariant.upsert({
            where: { sku: v.sku },
            create: {
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              options: v.options ?? {},
              product: { connect: { slug: row.slug } },
            },
            update: {
              price: v.price,
              stock: v.stock,
            },
          });
        }

        result.updated++;
      } else {
        // CREATE
        await prisma.product.create({
          data: {
            ...productData,
            slug: row.slug,
            categories: categoryId ? { create: { categoryId } } : undefined,
            variants: row.variants.length > 0 ? {
              create: row.variants.map((v) => ({
                sku: v.sku,
                price: v.price,
                stock: v.stock,
                options: v.options ?? {},
              })),
            } : undefined,
          },
        });

        result.created++;
      }
    } catch (err: any) {
      result.errors.push({ slug: row.slug, message: err?.message ?? "Error desconocido" });
    }
  }

  return result;
}
```

- [ ] **Paso 2: Commit**

```bash
git add actions/products-import.ts
git commit -m "feat: add product import server actions (checkExistingSlugs + importProductsBatch)"
```

---

## Tarea 6: Crear wizard de import `/admin/productos/importar/page.tsx`

**Archivos:**
- Create: `app/admin/productos/importar/page.tsx`

- [ ] **Paso 1: Crear el archivo**

```tsx
// app/admin/productos/importar/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { checkExistingSlugs, importProductsBatch } from "@/actions/products-import";
import { genericRowsToProductInputs, validateGenericRow, type GenericProductRow } from "@/lib/csv-generic";
import { shopifyRowsToProductInputs, validateShopifyRow, type ShopifyProductRow } from "@/lib/csv-shopify";

type Step = 1 | 2 | 3 | 4;
type Format = "generic" | "shopify";

interface ParsedProduct {
  slug: string;
  name: string;
  status: "create" | "update" | "error";
  errorMessage?: string;
  input: any;
}

const BATCH_SIZE = 20;

export default function ImportProductsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [format, setFormat] = useState<Format>("generic");
  const [fileName, setFileName] = useState("");
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ created: 0, updated: 0, errors: [] as Array<{ slug: string; message: string }> });
  const [isProcessing, setIsProcessing] = useState(false);

  const toCreate = parsedProducts.filter((p) => p.status === "create");
  const toUpdate = parsedProducts.filter((p) => p.status === "update");
  const parseErrors = parsedProducts.filter((p) => p.status === "error");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  async function handlePreview() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

    let productMap: Map<string, any>;
    const rowErrors: ParsedProduct[] = [];

    if (format === "generic") {
      const rows = parsed.data as GenericProductRow[];
      rows.forEach((row, i) => {
        const err = validateGenericRow(row, i);
        if (err) rowErrors.push({ slug: row.slug || `fila-${i+1}`, name: row.nombre || "", status: "error", errorMessage: err, input: null });
      });
      const validRows = rows.filter((_, i) => !validateGenericRow(_, i));
      productMap = genericRowsToProductInputs(validRows);
    } else {
      const rows = parsed.data as ShopifyProductRow[];
      rows.forEach((row, i) => {
        const err = validateShopifyRow(row, i);
        if (err) rowErrors.push({ slug: row.Handle || `fila-${i+1}`, name: row.Title || "", status: "error", errorMessage: err, input: null });
      });
      const validRows = rows.filter((_, i) => !validateShopifyRow(_, i));
      productMap = shopifyRowsToProductInputs(validRows);
    }

    const slugs = [...productMap.keys()];
    const existingSlugs = await checkExistingSlugs(slugs);
    const existingSet = new Set(existingSlugs);

    const products: ParsedProduct[] = [...productMap.entries()].map(([slug, input]) => ({
      slug,
      name: input.name,
      status: existingSet.has(slug) ? "update" : "create",
      input,
    }));

    setParsedProducts([...products, ...rowErrors]);
    setIsProcessing(false);
    setStep(2);
  }

  async function handleImport() {
    setStep(3);
    setIsProcessing(true);

    const validProducts = parsedProducts.filter((p) => p.status !== "error");
    const inputs = validProducts.map((p) => p.input);
    const totalResult = { created: 0, updated: 0, errors: [] as any[] };

    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const batchResult = await importProductsBatch(batch);
      totalResult.created += batchResult.created;
      totalResult.updated += batchResult.updated;
      totalResult.errors.push(...batchResult.errors);
      setProgress(Math.round(((i + batch.length) / inputs.length) * 100));
    }

    setResult(totalResult);
    setIsProcessing(false);
    setStep(4);
  }

  function downloadErrorCsv() {
    const rows = result.errors.map((e) => `${e.slug},${e.message}`).join("\n");
    const blob = new Blob([`slug,error\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "errores-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-4 sm:p-0 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar Productos</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de 4</p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Seleccionar archivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Formato del archivo</p>
              <div className="flex gap-4">
                {(["generic", "shopify"] as Format[]).map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={format === f}
                      onChange={() => setFormat(f)}
                    />
                    <span className="text-sm">{f === "generic" ? "CSV Genérico" : "Shopify CSV"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {fileName ? fileName : "Haz click para seleccionar un archivo .csv"}
              </p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>

            <Button
              onClick={handlePreview}
              disabled={!fileName || isProcessing}
              className="w-full"
            >
              {isProcessing ? "Analizando..." : "Siguiente — Previsualizar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>2. Previsualización</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{toCreate.length}</p>
                <p className="text-xs text-muted-foreground">A crear</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{toUpdate.length}</p>
                <p className="text-xs text-muted-foreground">A actualizar</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{parseErrors.length}</p>
                <p className="text-xs text-muted-foreground">Con error</p>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 space-y-1">
                <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Filas con error (se saltarán)
                </p>
                {parseErrors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e.errorMessage}</p>
                ))}
                {parseErrors.length > 5 && <p className="text-xs text-red-500">...y {parseErrors.length - 5} más</p>}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button
                onClick={handleImport}
                disabled={toCreate.length + toUpdate.length === 0}
                className="flex-1"
              >
                Importar {toCreate.length + toUpdate.length} productos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Progress */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>3. Importando...</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">{progress}% completado</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>4. Resultado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-2xl font-bold">{result.created}</p>
                <p className="text-xs text-muted-foreground">Creados</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Actualizados</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <XCircle className="mx-auto h-6 w-6 text-red-500 mb-1" />
                <p className="text-2xl font-bold">{result.errors.length}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>

            <div className="flex gap-3">
              {result.errors.length > 0 && (
                <Button variant="outline" onClick={downloadErrorCsv}>
                  Descargar errores CSV
                </Button>
              )}
              <Button className="flex-1" onClick={() => router.push("/admin/productos")}>
                Ver productos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Verificar que compila**

```bash
npm run build
```

Resultado esperado: 0 errores TypeScript.

- [ ] **Paso 3: Verificar manualmente**

1. Ir a `http://localhost:3000/admin/productos/importar`
2. Verificar que los 4 pasos funcionan con un CSV pequeño de 2-3 productos

- [ ] **Paso 4: Commit**

```bash
git add app/admin/productos/importar/page.tsx
git commit -m "feat: add product import wizard (4-step CSV upload)"
```

---

## Tarea 7: Crear API Route de export de productos

**Archivos:**
- Create: `app/api/admin/products/export/route.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// app/api/admin/products/export/route.ts
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateGenericCsv } from "@/lib/csv-generic";
import { generateShopifyCsv } from "@/lib/csv-shopify";

export async function GET(request: Request) {
  const { response: authResponse } = await requirePermission("products:view");
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "generic"; // "generic" | "shopify"
  const estado = searchParams.get("estado") ?? "all"; // "all" | "active" | "draft"
  const categoryId = searchParams.get("categoryId") ?? "";

  const where: any = {};
  if (estado === "active") where.active = true;
  if (estado === "draft") where.active = false;
  if (categoryId) where.categories = { some: { categoryId } };

  const products = await prisma.product.findMany({
    where,
    include: {
      categories: { include: { category: { select: { slug: true } } } },
      variants: { where: { active: true } },
      options: { include: { values: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csvString = format === "shopify"
    ? generateShopifyCsv(products)
    : generateGenericCsv(products);

  const date = new Date().toISOString().split("T")[0];
  const filename = `productos-${date}.csv`;

  // UTF-8 BOM para compatibilidad con Excel
  const BOM = "﻿";
  return new NextResponse(BOM + csvString, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/api/admin/products/export/route.ts
git commit -m "feat: add product export API route (generic + Shopify CSV)"
```

---

## Tarea 8: Crear página de export `/admin/productos/exportar`

**Archivos:**
- Create: `app/admin/productos/exportar/page.tsx`

- [ ] **Paso 1: Crear el archivo**

```tsx
// app/admin/productos/exportar/page.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface Category {
  id: string;
  name: string;
}

export default function ExportProductsPage() {
  const [format, setFormat] = useState<"generic" | "shopify">("generic");
  const [estado, setEstado] = useState<"all" | "active" | "draft">("all");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  function handleExport() {
    setLoading(true);
    const params = new URLSearchParams({ format, estado });
    if (categoryId) params.set("categoryId", categoryId);
    const url = `/api/admin/products/export?${params.toString()}`;
    // Trigger download
    const a = document.createElement("a");
    a.href = url;
    a.click();
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div className="space-y-6 p-4 sm:p-0 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Exportar Productos</h1>
          <p className="text-sm text-muted-foreground">Descarga tu catálogo en CSV</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Opciones de exportación</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Formato</Label>
            <div className="flex gap-4">
              {(["generic", "shopify"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} />
                  <span className="text-sm">{f === "generic" ? "CSV Genérico" : "Shopify CSV"}</span>
                </label>
              ))}
            </div>
            {format === "shopify" && (
              <p className="text-xs text-muted-foreground">
                Compatible con importación directa en Shopify
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={estado}
              onChange={(e) => setEstado(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="active">Solo activos</option>
              <option value="draft">Solo borradores</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Generando..." : "Descargar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

> **Nota:** Si no existe `/api/admin/categories`, usar las categorías del servidor — convertir esta página en un Server Component que pase las categorías como props al Client Component de formulario.

- [ ] **Paso 2: Verificar si existe la API de categorías**

```bash
ls "app/api/admin/categories" 2>/dev/null || echo "NO EXISTE"
```

Si no existe, refactorizar: hacer que `exportar/page.tsx` sea un Server Component que cargue categorías con Prisma y pase las categorías a un Client Component `ExportForm`:

```tsx
// app/admin/productos/exportar/page.tsx (server)
import { prisma } from "@/lib/db";
import ExportForm from "./ExportForm";

export default async function ExportProductsPage() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <ExportForm categories={categories} />;
}
```

```tsx
// app/admin/productos/exportar/ExportForm.tsx (client)
"use client";
// Mismo contenido que ExportProductsPage pero sin el useEffect de categorías
// Recibe categories como prop y las usa directamente
```

- [ ] **Paso 3: Commit**

```bash
git add app/admin/productos/exportar/
git commit -m "feat: add product export page"
```

---

## Tarea 9: Añadir botones Import/Export a la página de productos

**Archivos:**
- Modify: `app/admin/productos/page.tsx`

- [ ] **Paso 1: Añadir imports de Download y Upload**

En `app/admin/productos/page.tsx`, actualizar el import de lucide-react:

```tsx
import { Plus, Search, Edit, Eye, Upload, Download } from "lucide-react";
```

- [ ] **Paso 2: Añadir botones al header**

Buscar el bloque del header (línea ~90) donde está el botón "Nuevo Producto". Reemplazarlo para incluir los botones Import/Export:

```tsx
<div className="flex flex-wrap gap-2">
  {canCreate && (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/productos/importar">
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/productos/exportar">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Link>
      </Button>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/admin/productos/nuevo">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Link>
      </Button>
    </>
  )}
</div>
```

- [ ] **Paso 3: Verificar manualmente**

1. `npm run build` — debe pasar
2. Abrir `http://localhost:3000/admin/productos` — verificar botones Importar y Exportar en el header

- [ ] **Paso 4: Commit**

```bash
git add app/admin/productos/page.tsx
git commit -m "feat: add import/export buttons to products admin page"
```

---

## Tarea 10: Crear API Route de export de órdenes

**Archivos:**
- Create: `app/api/admin/orders/export/route.ts`

- [ ] **Paso 1: Crear el archivo**

```ts
// app/api/admin/orders/export/route.ts
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { formatOrderNumber } from "@/lib/utils";
import Papa from "papaparse";

function fmt(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export async function GET(request: Request) {
  const { response: authResponse } = await requirePermission("orders:view");
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);

  // Build Prisma where
  const where: any = {};

  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) {
      const end = new Date(hasta);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const statuses = searchParams.getAll("status");
  if (statuses.length > 0) where.status = { in: statuses };

  const methods = searchParams.getAll("payment");
  if (methods.length > 0) where.paymentMethod = { in: methods };

  const productId = searchParams.get("productId");
  const categoryId = searchParams.get("categoryId");

  // Combinar con AND para no sobreescribir cuando ambos están presentes
  const itemsConditions: any[] = [];
  if (productId) itemsConditions.push({ productId });
  if (categoryId) itemsConditions.push({ product: { categories: { some: { categoryId } } } });
  if (itemsConditions.length === 1) where.items = { some: itemsConditions[0] };
  if (itemsConditions.length > 1) where.items = { some: { AND: itemsConditions } };

  const department = searchParams.get("department");
  const province = searchParams.get("province");
  const district = searchParams.get("district");
  const addressConditions: any[] = [];
  if (department) addressConditions.push({ shippingAddress: { path: ["department"], equals: department } });
  if (province) addressConditions.push({ shippingAddress: { path: ["province"], equals: province } });
  if (district) addressConditions.push({ shippingAddress: { path: ["district"], equals: district } });
  if (addressConditions.length === 1) Object.assign(where, addressConditions[0]);
  if (addressConditions.length > 1) where.AND = [...(where.AND ?? []), ...addressConditions];

  const q = searchParams.get("q");
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const montoMin = searchParams.get("montoMin");
  const montoMax = searchParams.get("montoMax");
  if (montoMin || montoMax) {
    where.total = {};
    if (montoMin) where.total.gte = parseFloat(montoMin);
    if (montoMax) where.total.lte = parseFloat(montoMax);
  }

  const settings = await getSiteSettings();
  const orderPrefix = settings.order_prefix ?? "PED";

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((o) => {
    const addr = (o.shippingAddress as any) ?? {};
    const itemsSummary = o.items.map((i) => `${i.name} x${i.quantity}`).join("; ");

    return {
      "Número de orden": formatOrderNumber(o.orderSeq, orderPrefix),
      Fecha: fmt(o.createdAt),
      Estado: o.status,
      "Estado de pago": o.paymentStatus,
      "Estado de envío": o.fulfillmentStatus,
      Cliente: o.customerName,
      DNI: o.customerDni ?? "",
      Email: o.customerEmail,
      Teléfono: o.customerPhone,
      "Tipo de documento": o.documentType ?? "",
      RUC: o.buyerRuc ?? "",
      "Razón social": o.buyerRazonSocial ?? "",
      "Método de pago": o.paymentMethod,
      "Método de envío": o.shippingMethod ?? "",
      Subtotal: Number(o.subtotal).toFixed(2),
      Descuento: Number(o.discount).toFixed(2),
      Cupón: o.couponCode ?? "",
      "Descuento cupón": o.couponDiscount ? Number(o.couponDiscount).toFixed(2) : "",
      IGV: Number(o.tax).toFixed(2),
      Envío: Number(o.shipping).toFixed(2),
      Total: Number(o.total).toFixed(2),
      Productos: itemsSummary,
      "Notas del cliente": o.customerNotes ?? "",
      Dirección: addr.address ?? "",
      Distrito: addr.district ?? "",
      Provincia: addr.province ?? "",
      Departamento: addr.department ?? "",
      "Número de seguimiento": o.trackingNumber ?? "",
      Courier: o.shippingCourier ?? "",
      "Entrega estimada": fmtDate(o.estimatedDelivery),
      "Fecha de pago": fmt(o.paidAt),
      "Fecha de envío": fmt(o.shippedAt),
      "Fecha de entrega": fmt(o.deliveredAt),
      "Puntos ganados": o.pointsEarned,
      "Puntos usados": o.pointsUsed,
      "Notas admin": o.adminNotes ?? "",
    };
  });

  const csv = Papa.unparse(rows);
  const date = new Date().toISOString().split("T")[0];
  const BOM = "﻿";

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ordenes-${date}.csv"`,
    },
  });
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/api/admin/orders/export/route.ts
git commit -m "feat: add orders export API route with all filter params"
```

---

## Tarea 11: Crear componente OrderFiltersPanel

**Archivos:**
- Create: `components/admin/OrderFiltersPanel.tsx`

- [ ] **Paso 1: Crear el archivo**

```tsx
// components/admin/OrderFiltersPanel.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X, Download } from "lucide-react";
import { ALL_DISTRICTS } from "@/lib/districts-peru";

interface Category { id: string; name: string; }
interface Product { id: string; name: string; }

interface OrderFiltersPanelProps {
  categories: Category[];
}

const ORDER_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PROCESSING", label: "Procesando" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const PAYMENT_METHODS = [
  { value: "CARD", label: "Tarjeta" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER", label: "Transferencia" },
];

const departments = [...new Set(ALL_DISTRICTS.map((d) => d.department))].sort();

export default function OrderFiltersPanel({ categories }: OrderFiltersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [desde, setDesde] = useState(searchParams.get("desde") ?? "");
  const [hasta, setHasta] = useState(searchParams.get("hasta") ?? "");
  const [statuses, setStatuses] = useState<string[]>(searchParams.getAll("status"));
  const [methods, setMethods] = useState<string[]>(searchParams.getAll("payment"));
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState(searchParams.get("productId") ?? "");
  const [productName, setProductName] = useState(searchParams.get("productName") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [department, setDepartment] = useState(searchParams.get("department") ?? "");
  const [province, setProvince] = useState(searchParams.get("province") ?? "");
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [montoMin, setMontoMin] = useState(searchParams.get("montoMin") ?? "");
  const [montoMax, setMontoMax] = useState(searchParams.get("montoMax") ?? "");
  const [productResults, setProductResults] = useState<Product[]>([]);

  const provinces = [...new Set(ALL_DISTRICTS.filter((d) => d.department === department).map((d) => d.province))].sort();
  const districts = ALL_DISTRICTS.filter((d) => d.department === department && d.province === province).sort((a, b) => a.name.localeCompare(b.name));

  async function searchProducts(query: string) {
    setProductSearch(query);
    if (query.length < 2) { setProductResults([]); return; }
    const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setProductResults(data.products ?? []);
  }

  function toggleCheckbox(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function buildParams() {
    const p = new URLSearchParams();
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    statuses.forEach((s) => p.append("status", s));
    methods.forEach((m) => p.append("payment", m));
    if (productId) { p.set("productId", productId); p.set("productName", productName); }
    if (categoryId) p.set("categoryId", categoryId);
    if (department) p.set("department", department);
    if (province) p.set("province", province);
    if (district) p.set("district", district);
    if (q) p.set("q", q);
    if (montoMin) p.set("montoMin", montoMin);
    if (montoMax) p.set("montoMax", montoMax);
    return p;
  }

  function handleApply() {
    router.push(`/admin/ordenes?${buildParams().toString()}`);
    setOpen(false);
  }

  function handleClear() {
    setDesde(""); setHasta("");
    setStatuses([]); setMethods([]);
    setProductId(""); setProductName(""); setProductSearch(""); setProductResults([]);
    setCategoryId("");
    setDepartment(""); setProvince(""); setDistrict("");
    setQ(""); setMontoMin(""); setMontoMax("");
    router.push("/admin/ordenes");
    setOpen(false);
  }

  function handleExport() {
    // Exportar según los filtros ya APLICADOS (URL params actuales), no el borrador del formulario
    const url = `/api/admin/orders/export?${searchParams.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  const hasFilters = searchParams.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={open ? "default" : "outline"}
          size="sm"
          onClick={() => setOpen(!open)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="ml-2 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
              {searchParams.size}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="mr-1 h-3 w-3" /> Limpiar
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            {/* Estado */}
            <div>
              <Label className="text-xs">Estado de orden</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ORDER_STATUSES.map((s) => (
                  <label key={s.value} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={statuses.includes(s.value)} onChange={() => toggleCheckbox(statuses, setStatuses, s.value)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <Label className="text-xs">Método de pago</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PAYMENT_METHODS.map((m) => (
                  <label key={m.value} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={methods.includes(m.value)} onChange={() => toggleCheckbox(methods, setMethods, m.value)} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Producto autocomplete */}
            <div>
              <Label className="text-xs">Producto</Label>
              <div className="relative">
                <Input
                  value={productId ? productName : productSearch}
                  onChange={(e) => { setProductId(""); searchProducts(e.target.value); }}
                  placeholder="Buscar producto..."
                  className="h-8 text-sm"
                />
                {productResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow mt-1 max-h-40 overflow-y-auto">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                        onClick={() => { setProductId(p.id); setProductName(p.name); setProductSearch(""); setProductResults([]); }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Categoría */}
            <div>
              <Label className="text-xs">Categoría</Label>
              <select
                className="w-full rounded-md border px-2 py-1 text-sm h-8"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Todas</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Ubicación en cascada */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Departamento</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={department}
                  onChange={(e) => { setDepartment(e.target.value); setProvince(""); setDistrict(""); }}
                >
                  <option value="">Todos</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Provincia</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={province}
                  onChange={(e) => { setProvince(e.target.value); setDistrict(""); }}
                  disabled={!department}
                >
                  <option value="">Todas</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Distrito</Label>
                <select
                  className="w-full rounded-md border px-2 py-1 text-sm h-8"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!province}
                >
                  <option value="">Todos</option>
                  {districts.map((d) => <option key={d.code} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <Label className="text-xs">Buscar cliente (nombre, email o teléfono)</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ej: juan, juan@email.com, 987654321" className="h-8 text-sm" />
            </div>

            {/* Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto mínimo (S/.)</Label>
                <Input type="number" value={montoMin} onChange={(e) => setMontoMin(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Monto máximo (S/.)</Label>
                <Input type="number" value={montoMax} onChange={(e) => setMontoMax(e.target.value)} placeholder="9999" className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleApply} className="flex-1">Aplicar filtros</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add components/admin/OrderFiltersPanel.tsx
git commit -m "feat: add OrderFiltersPanel component with all filters and export"
```

---

## Tarea 12: Actualizar página de órdenes con filtros

**Archivos:**
- Modify: `app/admin/ordenes/page.tsx`

- [ ] **Paso 1: Ampliar los searchParams y el where de Prisma**

Reemplazar la interfaz `OrdersPageProps` y la función `AdminOrdersPage` para leer todos los nuevos filtros. Reemplazar el bloque de `searchParams` y `where` actual (líneas 10-37) con:

```tsx
interface OrdersPageProps {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    status?: string | string[];
    payment?: string | string[];
    productId?: string;
    categoryId?: string;
    department?: string;
    province?: string;
    district?: string;
    q?: string;
    montoMin?: string;
    montoMax?: string;
  }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const orderPrefix = settings.order_prefix || "PED";

  // Construir where dinámico
  const where: any = {};

  if (params.desde || params.hasta) {
    where.createdAt = {};
    if (params.desde) where.createdAt.gte = new Date(params.desde);
    if (params.hasta) {
      const end = new Date(params.hasta);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const statuses = params.status ? (Array.isArray(params.status) ? params.status : [params.status]) : [];
  if (statuses.length > 0) where.status = { in: statuses };

  const methods = params.payment ? (Array.isArray(params.payment) ? params.payment : [params.payment]) : [];
  if (methods.length > 0) where.paymentMethod = { in: methods };

  if (params.productId) where.items = { some: { productId: params.productId } };
  if (params.categoryId) where.items = { some: { product: { categories: { some: { categoryId: params.categoryId } } } } };

  const addressConditions: any[] = [];
  if (params.department) addressConditions.push({ shippingAddress: { path: ["department"], equals: params.department } });
  if (params.province) addressConditions.push({ shippingAddress: { path: ["province"], equals: params.province } });
  if (params.district) addressConditions.push({ shippingAddress: { path: ["district"], equals: params.district } });
  if (addressConditions.length === 1) Object.assign(where, addressConditions[0]);
  if (addressConditions.length > 1) where.AND = addressConditions;

  if (params.q) {
    where.OR = [
      { customerName: { contains: params.q, mode: "insensitive" } },
      { customerEmail: { contains: params.q, mode: "insensitive" } },
      { customerPhone: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.montoMin || params.montoMax) {
    where.total = {};
    if (params.montoMin) where.total.gte = parseFloat(params.montoMin);
    if (params.montoMax) where.total.lte = parseFloat(params.montoMax);
  }
```

- [ ] **Paso 2: Añadir query de categorías y añadir OrderFiltersPanel**

Al final de las queries de datos (después de `paidOrders`), añadir:

```tsx
const categories = await prisma.category.findMany({
  where: { active: true },
  select: { id: true, name: true },
  orderBy: { name: "asc" },
});
```

Añadir el import de `OrderFiltersPanel` al inicio del archivo:

```tsx
import OrderFiltersPanel from "@/components/admin/OrderFiltersPanel";
```

- [ ] **Paso 3: Insertar el panel en el JSX**

En el JSX del return, después del bloque del header y antes de los Filter Tabs existentes, añadir:

```tsx
{/* Advanced Filters + Export */}
<OrderFiltersPanel categories={categories} />
```

- [ ] **Paso 4: Eliminar el `take: 50` del query de órdenes**

El query actual tiene `take: 50`. Reemplazar por `take: 200` para mostrar más resultados cuando hay filtros activos. (El export no tiene límite — usa su propio query.)

- [ ] **Paso 5: Verificar manualmente**

1. `npm run build` — debe pasar sin errores TypeScript
2. Abrir `http://localhost:3000/admin/ordenes` — verificar botón "Filtros" y "Exportar CSV"
3. Aplicar filtro de fecha — verificar que la URL cambia y las órdenes se filtran
4. Aplicar filtro de departamento — verificar que el cascading de provincia/distrito funciona
5. Click en "Exportar CSV" — debe descargar un archivo `.csv` con las órdenes filtradas
6. Abrir el CSV en Excel — verificar que las tildes se muestran correctamente

- [ ] **Paso 6: Commit**

```bash
git add app/admin/ordenes/page.tsx
git commit -m "feat: add advanced filters and CSV export to orders admin page"
```

---

## Verificación final

- [ ] `npm run build` — 0 errores TypeScript, todas las páginas generadas correctamente
- [ ] Probar flujo completo de import: subir CSV genérico → preview → ejecutar → resultado
- [ ] Probar flujo completo de import con CSV Shopify
- [ ] Probar export de productos en ambos formatos — abrir en Excel y verificar datos
- [ ] Probar filtros de órdenes: fecha + estado + método de pago + departamento + cliente
- [ ] Probar export de órdenes con filtros activos — verificar todas las columnas

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: complete product import/export and order filters implementation"
```
