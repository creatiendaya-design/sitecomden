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
    // Validate critical fields before DB operations
    if (!row.slug || row.basePrice < 0 || !Number.isFinite(row.basePrice)) {
      result.errors.push({ slug: row.slug || "(sin slug)", message: "slug requerido y basePrice debe ser >= 0" });
      continue;
    }

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
        // Nota: la categoría no se actualiza en re-imports — se mantiene la categoría original del producto
        await prisma.product.update({
          where: { slug: row.slug },
          data: productData,
        });

        // Upsert variantes con seguridad de producto
        for (const v of row.variants) {
          const existingVariant = await prisma.productVariant.findFirst({
            where: { sku: v.sku, product: { slug: row.slug } },
            select: { id: true },
          });
          if (existingVariant) {
            await prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: { price: v.price, stock: v.stock, options: v.options ?? {} },
            });
          } else {
            await prisma.productVariant.create({
              data: {
                sku: v.sku,
                price: v.price,
                stock: v.stock,
                options: v.options ?? {},
                product: { connect: { slug: row.slug } },
              },
            });
          }
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      result.errors.push({ slug: row.slug, message });
    }
  }

  return result;
}
