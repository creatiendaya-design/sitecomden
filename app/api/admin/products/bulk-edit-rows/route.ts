import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { invalidateProduct } from "@/lib/cache/invalidate";

const productRowSchema = z.object({
  kind: z.literal("product"),
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  sku: z.string().max(120).nullable().optional(),
  basePrice: z.number().nonnegative().finite().optional(),
  compareAtPrice: z.number().nonnegative().finite().nullable().optional(),
  stock: z.number().int().nonnegative().finite().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  landingTemplateId: z.string().nullable().optional(),
  sizeGuideId: z.string().nullable().optional(),
  customizableTemplateId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

const variantRowSchema = z.object({
  kind: z.literal("variant"),
  id: z.string().min(1),
  sku: z.string().max(120).nullable().optional(),
  price: z.number().positive().finite().optional(),
  compareAtPrice: z.number().nonnegative().finite().nullable().optional(),
  stock: z.number().int().nonnegative().finite().optional(),
});

const rowSchema = z.discriminatedUnion("kind", [productRowSchema, variantRowSchema]);

const payloadSchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(request: Request) {
  const { response: authResponse } = await requirePermission("products:update");
  if (authResponse) return authResponse;

  try {
    const json = await request.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rows } = parsed.data;
    const productRows = rows.filter((r) => r.kind === "product");
    const variantRows = rows.filter((r) => r.kind === "variant");

    const productIds = productRows.map((r) => r.id);
    const variantIds = variantRows.map((r) => r.id);

    const [products, variants] = await Promise.all([
      productIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, slug: true, hasVariants: true },
          })
        : Promise.resolve([]),
      variantIds.length > 0
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, productId: true, product: { select: { slug: true } } },
          })
        : Promise.resolve([]),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const variantById = new Map(variants.map((v) => [v.id, v]));

    if (productIds.length > 0 && products.length === 0 && variants.length === 0) {
      return NextResponse.json({ error: "Filas no encontradas" }, { status: 404 });
    }

    // Validar referencias
    const referencedCategoryIds = Array.from(
      new Set(
        productRows
          .map((r) => r.categoryId)
          .filter((c): c is string => typeof c === "string" && c.length > 0)
      )
    );
    if (referencedCategoryIds.length > 0) {
      const found = await prisma.category.findMany({
        where: { id: { in: referencedCategoryIds } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((c) => c.id));
      const missing = referencedCategoryIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Categoría(s) no encontradas: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const referencedLandingTemplateIds = Array.from(
      new Set(
        productRows
          .map((r) => r.landingTemplateId)
          .filter((t): t is string => typeof t === "string" && t.length > 0)
      )
    );
    if (referencedLandingTemplateIds.length > 0) {
      const found = await prisma.landingTemplate.findMany({
        where: { id: { in: referencedLandingTemplateIds } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((t) => t.id));
      const missing = referencedLandingTemplateIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Plantilla(s) de landing no encontradas: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const referencedSizeGuideIds = Array.from(
      new Set(
        productRows
          .map((r) => r.sizeGuideId)
          .filter((g): g is string => typeof g === "string" && g.length > 0)
      )
    );
    if (referencedSizeGuideIds.length > 0) {
      const found = await prisma.sizeGuide.findMany({
        where: { id: { in: referencedSizeGuideIds } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((g) => g.id));
      const missing = referencedSizeGuideIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Guía(s) de tallas no encontradas: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const referencedCustomizableTemplateIds = Array.from(
      new Set(
        productRows
          .map((r) => r.customizableTemplateId)
          .filter((t): t is string => typeof t === "string" && t.length > 0)
      )
    );
    if (referencedCustomizableTemplateIds.length > 0) {
      const found = await prisma.customizableTemplate.findMany({
        where: { id: { in: referencedCustomizableTemplateIds } },
        select: { id: true },
      });
      const foundSet = new Set(found.map((t) => t.id));
      const missing = referencedCustomizableTemplateIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Plantilla(s) de personalización no encontradas: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }

    let updatedProducts = 0;
    let updatedVariants = 0;
    const slugsToRevalidate = new Set<string>();

    await prisma.$transaction(async (tx) => {
      // Productos
      for (const row of productRows) {
        const product = productById.get(row.id);
        if (!product) continue;

        const data: Record<string, unknown> = {};

        if (row.name !== undefined) data.name = row.name;
        if (row.active !== undefined) data.active = row.active;
        if (row.featured !== undefined) data.featured = row.featured;
        if (row.landingTemplateId !== undefined) data.landingTemplateId = row.landingTemplateId;
        if (row.sizeGuideId !== undefined) data.sizeGuideId = row.sizeGuideId;
        if (row.customizableTemplateId !== undefined) {
          data.customizableTemplateId = row.customizableTemplateId;
        }

        // Campos no aplicables a productos con variantes
        if (!product.hasVariants) {
          if (row.basePrice !== undefined) data.basePrice = row.basePrice;
          if (row.compareAtPrice !== undefined) data.compareAtPrice = row.compareAtPrice;
          if (row.stock !== undefined) data.stock = row.stock;
          if (row.sku !== undefined) data.sku = row.sku ?? null;
        }

        if (Object.keys(data).length > 0) {
          await tx.product.update({ where: { id: row.id }, data });
        }

        if (row.categoryId !== undefined) {
          await tx.productCategory.deleteMany({ where: { productId: row.id } });
          if (row.categoryId) {
            await tx.productCategory.create({
              data: { productId: row.id, categoryId: row.categoryId },
            });
          }
        }

        if (Object.keys(data).length > 0 || row.categoryId !== undefined) {
          updatedProducts++;
          slugsToRevalidate.add(product.slug);
        }
      }

      // Variantes
      for (const row of variantRows) {
        const variant = variantById.get(row.id);
        if (!variant) continue;

        const data: Record<string, unknown> = {};
        if (row.sku !== undefined) data.sku = row.sku;
        if (row.price !== undefined) data.price = row.price;
        if (row.compareAtPrice !== undefined) data.compareAtPrice = row.compareAtPrice;
        if (row.stock !== undefined) data.stock = row.stock;

        if (Object.keys(data).length > 0) {
          await tx.productVariant.update({ where: { id: row.id }, data });
          updatedVariants++;
          slugsToRevalidate.add(variant.product.slug);
        }
      }
    });

    revalidatePath("/admin/productos");
    slugsToRevalidate.forEach((slug) => {
      revalidatePath(`/productos/${slug}`);
      invalidateProduct(slug);
    });

    return NextResponse.json({ success: true, updatedProducts, updatedVariants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
