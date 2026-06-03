// lib/csv-generic.ts
import Papa from "papaparse";
import type { IgvType } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

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

interface ProductVariantInput {
  sku: string;
  price: number;
  stock: number;
}

interface ProductInput {
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
  igvType: IgvType;
  metaTitle: string | null;
  metaDescription: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  variants: ProductVariantInput[];
}

// Minimal shape of a Prisma Product row as returned by the import queries
interface PrismaProductForCsv {
  slug: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  basePrice: number | Decimal;
  compareAtPrice?: number | Decimal | null;
  weight?: number | Decimal | null;
  stock: number;
  sku?: string | null;
  featured?: boolean;
  active?: boolean;
  igvType?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  images?: unknown;
  hasVariants?: boolean;
  categories?: Array<{ category: { slug: string } }>;
  variants?: Array<{ sku: string; price: number | Decimal; stock: number }>;
}

/** Convierte un producto Prisma a filas CSV genéricas (una por variante, o una si no tiene variantes) */
export function productToGenericRows(product: PrismaProductForCsv): GenericProductRow[] {
  const categorySlug = product.categories?.[0]?.category?.slug ?? "";
  const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : [];
  const firstImage = images[0] ?? "";

  const base = {
    slug: product.slug,
    nombre: product.name,
    descripcion: product.description ?? "",
    descripcion_corta: product.shortDescription ?? "",
    precio: String(Number(product.basePrice)),
    precio_comparacion: product.compareAtPrice ? String(Number(product.compareAtPrice)) : "",
    peso: product.weight ? String(Number(product.weight)) : "",
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

  return product.variants.map((v) => ({
    ...base,
    stock: "",
    sku: product.sku ?? "",
    sku_variante: v.sku,
    precio_variante: String(Number(v.price)),
    stock_variante: String(v.stock),
  }));
}

/** Parsea filas CSV genéricas y las agrupa por slug en ProductInput */
export function genericRowsToProductInputs(rows: GenericProductRow[]): Map<string, ProductInput> {
  const bySlug = new Map<string, ProductInput>();

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
        igvType: (["GRAVADO","EXONERADO","INAFECTO"].includes(row.igv_tipo) ? row.igv_tipo : "GRAVADO") as IgvType,
        metaTitle: row.meta_titulo || null,
        metaDescription: row.meta_descripcion || null,
        categorySlug: row.categoria_slug || null,
        imageUrl: row.imagen_url || null,
        variants: [],
      });
    }

    if (row.sku_variante) {
      const entry = bySlug.get(row.slug)!;
      entry.variants.push({
        sku: row.sku_variante,
        price: parseFloat(row.precio_variante) || entry.basePrice,
        stock: parseInt(row.stock_variante) || 0,
      });
    }
  }

  return bySlug;
}

/** Genera un CSV genérico en memoria y retorna el string */
export function generateGenericCsv(products: PrismaProductForCsv[]): string {
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
