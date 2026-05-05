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

/**
 * Deriva opciones únicas (con sus valores) a partir de las variantes.
 * Conserva el orden de aparición tanto de opciones como de valores.
 */
function deriveOptionsFromVariants(
  variants: Array<{ options?: Record<string, string> }>
): Array<{ name: string; values: string[] }> {
  const optionOrder: string[] = [];
  const valuesByOption = new Map<string, string[]>();
  const seenValues = new Map<string, Set<string>>();

  for (const v of variants) {
    if (!v.options) continue;
    for (const [name, value] of Object.entries(v.options)) {
      if (!value) continue;
      if (!valuesByOption.has(name)) {
        optionOrder.push(name);
        valuesByOption.set(name, []);
        seenValues.set(name, new Set());
      }
      const set = seenValues.get(name)!;
      if (!set.has(value)) {
        set.add(value);
        valuesByOption.get(name)!.push(value);
      }
    }
  }

  return optionOrder.map((name) => ({ name, values: valuesByOption.get(name)! }));
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
  imageUrls?: string[];
  variants: Array<{
    sku: string;
    price: number;
    compareAtPrice?: number | null;
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
      const images = row.imageUrls?.length ? row.imageUrls : (row.imageUrl ? [row.imageUrl] : []);

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

      const derivedOptions = row.variants.length > 0 ? deriveOptionsFromVariants(row.variants) : [];

      if (existingSet.has(row.slug)) {
        // UPDATE
        // Nota: la categoría no se actualiza en re-imports — se mantiene la categoría original del producto
        const updated = await prisma.product.update({
          where: { slug: row.slug },
          data: productData,
          select: { id: true },
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
              data: { price: v.price, compareAtPrice: v.compareAtPrice ?? null, stock: v.stock, options: v.options ?? {} },
            });
          } else {
            await prisma.productVariant.create({
              data: {
                sku: v.sku,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? null,
                stock: v.stock,
                options: v.options ?? {},
                product: { connect: { slug: row.slug } },
              },
            });
          }
        }

        // Upsert opciones — preserva displayStyle/swatches existentes; añade opciones y valores nuevos
        if (derivedOptions.length > 0) {
          const existingOptions = await prisma.productOption.findMany({
            where: { productId: updated.id },
            include: { values: true },
          });
          const existingByName = new Map(existingOptions.map((o) => [o.name, o]));

          for (let i = 0; i < derivedOptions.length; i++) {
            const opt = derivedOptions[i];
            const existing = existingByName.get(opt.name);
            if (existing) {
              const existingValues = new Set(existing.values.map((v) => v.value));
              const newValues = opt.values.filter((v) => !existingValues.has(v));
              if (newValues.length > 0) {
                const startPos = existing.values.length;
                await prisma.productOptionValue.createMany({
                  data: newValues.map((value, j) => ({
                    optionId: existing.id,
                    value,
                    position: startPos + j,
                    swatchType: "NONE" as const,
                  })),
                });
              }
            } else {
              await prisma.productOption.create({
                data: {
                  productId: updated.id,
                  name: opt.name,
                  position: i,
                  displayStyle: "BUTTONS",
                  values: {
                    create: opt.values.map((value, j) => ({
                      value,
                      position: j,
                      swatchType: "NONE" as const,
                    })),
                  },
                },
              });
            }
          }
        }

        result.updated++;
      } else {
        // CREATE
        const created = await prisma.product.create({
          data: {
            ...productData,
            slug: row.slug,
            categories: categoryId ? { create: { categoryId } } : undefined,
            options: derivedOptions.length > 0 ? {
              create: derivedOptions.map((opt, i) => ({
                name: opt.name,
                position: i,
                displayStyle: "BUTTONS",
                values: {
                  create: opt.values.map((value, j) => ({
                    value,
                    position: j,
                    swatchType: "NONE" as const,
                  })),
                },
              })),
            } : undefined,
            variants: row.variants.length > 0 ? {
              create: row.variants.map((v) => ({
                sku: v.sku,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? null,
                stock: v.stock,
                options: v.options ?? {},
              })),
            } : undefined,
          },
          include: { variants: true },
        });

        if (row.variants.length === 0) {
          if (row.stock > 0) {
            await prisma.inventoryMovement.create({
              data: { productId: created.id, type: "PURCHASE", quantity: row.stock, reason: "Importación CSV" },
            });
          }
        } else {
          for (const createdVariant of created.variants) {
            const inputVariant = row.variants.find((v) => v.sku === createdVariant.sku);
            if (inputVariant && inputVariant.stock > 0) {
              await prisma.inventoryMovement.create({
                data: { productId: created.id, variantId: createdVariant.id, type: "PURCHASE", quantity: inputVariant.stock, reason: "Importación CSV" },
              });
            }
          }
        }

        result.created++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      result.errors.push({ slug: row.slug, message });
    }
  }

  return result;
}
