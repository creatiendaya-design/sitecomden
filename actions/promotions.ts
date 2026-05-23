"use server";

import { Prisma } from "@prisma/client";
import type { Promotion, ProductPromotionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit-log";
import {
  createPromotionSchema,
  updatePromotionSchema,
  type CreatePromotionInput,
  type UpdatePromotionInput,
  type PromotionData,
  type ProductScopedPromotion,
  type PromotionTargetSummary,
} from "@/lib/promotions/types";

type PromotionWithTargets = Promotion & {
  productTargets: Array<{
    productId: string;
    product?: {
      id: string;
      name: string;
      slug: string;
      images: Prisma.JsonValue;
    };
  }>;
  categoryTargets: Array<{
    categoryId: string;
    category?: { id: string; name: string; slug: string };
  }>;
};

function extractFirstImage(images: Prisma.JsonValue): string | null {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url: unknown }).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

function serialize(p: PromotionWithTargets): PromotionData {
  const productIds = p.productTargets.map((t) => t.productId);
  const categoryIds = p.categoryTargets.map((t) => t.categoryId);

  const targets: PromotionTargetSummary = {
    products: p.productTargets
      .filter((t) => t.product)
      .map((t) => ({
        id: t.product!.id,
        name: t.product!.name,
        slug: t.product!.slug,
        image: extractFirstImage(t.product!.images),
      })),
    categories: p.categoryTargets
      .filter((t) => t.category)
      .map((t) => ({
        id: t.category!.id,
        name: t.category!.name,
        slug: t.category!.slug,
      })),
  };

  return {
    id: p.id,
    name: p.name,
    type: p.type,
    active: p.active,
    priority: p.priority,
    config: p.config as PromotionData["config"],
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    usageCount: p.usageCount,
    totalDiscountApplied: Number((p as { totalDiscountApplied?: unknown }).totalDiscountApplied ?? 0),
    productIds,
    categoryIds,
    targets,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const fullInclude = {
  productTargets: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: true } },
    },
  },
  categoryTargets: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.PromotionInclude;

/** Lists every promotion in the store. Used by the global admin route. */
export async function listAllPromotions(): Promise<PromotionData[]> {
  await protectRoute("products:view");

  const rows = await prisma.promotion.findMany({
    where: { deletedAt: null },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: fullInclude,
  });

  return rows.map(serialize);
}

export async function getPromotion(id: string): Promise<PromotionData> {
  await protectRoute("products:view");

  const row = await prisma.promotion.findUnique({
    where: { id },
    include: fullInclude,
  });
  if (!row) throw new Error("Promoción no encontrada");
  return serialize(row);
}

/** Resolves all promotions that affect a given product, whether linked
 *  directly or via one of its categories. */
export async function listPromotionsForProduct(
  productId: string
): Promise<ProductScopedPromotion[]> {
  await protectRoute("products:view");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      categories: { select: { categoryId: true, category: { select: { id: true, name: true } } } },
    },
  });
  if (!product) return [];

  const categoryIds = product.categories.map((c) => c.categoryId);
  const categoryNameMap = new Map(
    product.categories.map((c) => [c.categoryId, c.category?.name ?? ""])
  );

  const rows = await prisma.promotion.findMany({
    where: {
      deletedAt: null,
      OR: [
        { productTargets: { some: { productId } } },
        ...(categoryIds.length > 0
          ? [{ categoryTargets: { some: { categoryId: { in: categoryIds } } } }]
          : []),
      ],
    },
    include: fullInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => {
    const data = serialize(row);
    const direct = row.productTargets.some((t) => t.productId === productId);
    if (direct) {
      return { ...data, matchSource: "DIRECT" as const };
    }
    const matchedCategory = row.categoryTargets.find((t) =>
      categoryIds.includes(t.categoryId)
    );
    return {
      ...data,
      matchSource: "CATEGORY" as const,
      matchedCategoryName: matchedCategory
        ? categoryNameMap.get(matchedCategory.categoryId) ?? undefined
        : undefined,
    };
  });
}

export async function createPromotion(
  input: CreatePromotionInput
): Promise<{ success: true; promotion: PromotionData }> {
  await protectRoute("products:update");

  const data = createPromotionSchema.parse(input);

  const created = await prisma.promotion.create({
    data: {
      name: data.name,
      type: data.type,
      active: data.active,
      priority: data.priority,
      config: data.config as Prisma.InputJsonValue,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      productTargets: {
        create: data.productIds.map((productId) => ({ productId })),
      },
      categoryTargets: {
        create: data.categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
    include: fullInclude,
  });

  revalidatePath("/admin/promociones");
  for (const productId of data.productIds) {
    revalidatePath(`/admin/productos/${productId}`);
  }

  return { success: true, promotion: serialize(created) };
}

export async function updatePromotion(
  promotionId: string,
  input: UpdatePromotionInput
): Promise<{ success: true; promotion: PromotionData }> {
  await protectRoute("products:update");

  const data = updatePromotionSchema.parse(input);

  const existing = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: {
      type: true,
      productTargets: { select: { productId: true } },
      categoryTargets: { select: { categoryId: true } },
    },
  });
  if (!existing) throw new Error("Promoción no encontrada");

  if (data.type !== existing.type) {
    throw new Error("No se puede cambiar el tipo de una promoción existente");
  }

  const previousProductIds = new Set(existing.productTargets.map((t) => t.productId));
  const nextProductIds = new Set(data.productIds);
  const previousCategoryIds = new Set(existing.categoryTargets.map((t) => t.categoryId));
  const nextCategoryIds = new Set(data.categoryIds);

  const productIdsToAdd = data.productIds.filter((id) => !previousProductIds.has(id));
  const productIdsToRemove = [...previousProductIds].filter((id) => !nextProductIds.has(id));
  const categoryIdsToAdd = data.categoryIds.filter((id) => !previousCategoryIds.has(id));
  const categoryIdsToRemove = [...previousCategoryIds].filter((id) => !nextCategoryIds.has(id));

  const updated = await prisma.$transaction(async (tx) => {
    if (productIdsToRemove.length > 0) {
      await tx.promotionProduct.deleteMany({
        where: { promotionId, productId: { in: productIdsToRemove } },
      });
    }
    if (productIdsToAdd.length > 0) {
      await tx.promotionProduct.createMany({
        data: productIdsToAdd.map((productId) => ({ promotionId, productId })),
        skipDuplicates: true,
      });
    }
    if (categoryIdsToRemove.length > 0) {
      await tx.promotionCategory.deleteMany({
        where: { promotionId, categoryId: { in: categoryIdsToRemove } },
      });
    }
    if (categoryIdsToAdd.length > 0) {
      await tx.promotionCategory.createMany({
        data: categoryIdsToAdd.map((categoryId) => ({ promotionId, categoryId })),
        skipDuplicates: true,
      });
    }

    return tx.promotion.update({
      where: { id: promotionId },
      data: {
        name: data.name,
        active: data.active,
        priority: data.priority,
        config: data.config as Prisma.InputJsonValue,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: fullInclude,
    });
  });

  revalidatePath("/admin/promociones");
  revalidatePath(`/admin/promociones/${promotionId}`);
  const allAffected = new Set([
    ...previousProductIds,
    ...nextProductIds,
  ]);
  for (const productId of allAffected) {
    revalidatePath(`/admin/productos/${productId}`);
  }

  return { success: true, promotion: serialize(updated) };
}

export async function setPromotionActive(
  promotionId: string,
  active: boolean
): Promise<{ success: true; promotion: PromotionData }> {
  await protectRoute("products:update");

  const updated = await prisma.promotion.update({
    where: { id: promotionId },
    data: { active },
    include: fullInclude,
  });

  revalidatePath("/admin/promociones");
  for (const t of updated.productTargets) {
    revalidatePath(`/admin/productos/${t.productId}`);
  }

  return { success: true, promotion: serialize(updated) };
}

export async function deletePromotion(
  promotionId: string
): Promise<{ success: true }> {
  const userId = await protectRoute("products:update");

  const existing = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: {
      name: true,
      type: true,
      productTargets: { select: { productId: true } },
    },
  });
  if (!existing) throw new Error("Promoción no encontrada");

  // Soft-delete: tombstone + deactivate. Preserva analytics histórico
  // (totalDiscountApplied, usageCount) y los targets join rows.
  await prisma.promotion.update({
    where: { id: promotionId },
    data: { deletedAt: new Date(), active: false },
  });

  revalidatePath("/admin/promociones");
  for (const t of existing.productTargets) {
    revalidatePath(`/admin/productos/${t.productId}`);
  }

  await logAudit({
    action: "promotion.soft_deleted",
    userId,
    entityType: "Promotion",
    entityId: promotionId,
    before: { name: existing.name, type: existing.type },
    metadata: { productTargetCount: existing.productTargets.length },
  });

  return { success: true };
}

/** Quick action used from the product editor to attach this product as a
 *  target of an existing promotion. */
export async function linkProductToPromotion(
  promotionId: string,
  productId: string
): Promise<{ success: true }> {
  await protectRoute("products:update");

  await prisma.promotionProduct.upsert({
    where: { promotionId_productId: { promotionId, productId } },
    create: { promotionId, productId },
    update: {},
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/admin/promociones");
  return { success: true };
}

export async function unlinkProductFromPromotion(
  promotionId: string,
  productId: string
): Promise<{ success: true }> {
  await protectRoute("products:update");

  await prisma.promotionProduct.delete({
    where: { promotionId_productId: { promotionId, productId } },
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/admin/promociones");
  return { success: true };
}

/** Used by the global admin route to show available promotions when linking
 *  from a specific product editor (excludes promotions that already include
 *  the product directly). */
export async function listPromotionsForLinking(
  productId: string
): Promise<Array<{ id: string; name: string; type: ProductPromotionType; active: boolean }>> {
  await protectRoute("products:view");

  const rows = await prisma.promotion.findMany({
    where: {
      deletedAt: null,
      NOT: { productTargets: { some: { productId } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, active: true },
    take: 50,
  });

  return rows;
}

export async function searchProductsForPromotion(
  query: string,
  excludeProductIds: string[] = []
): Promise<
  Array<{ id: string; name: string; slug: string; image: string | null; basePrice: number }>
> {
  await protectRoute("products:view");

  const trimmed = query.trim();
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(excludeProductIds.length > 0 ? { NOT: { id: { in: excludeProductIds } } } : {}),
      ...(trimmed.length > 0
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { slug: { contains: trimmed, mode: "insensitive" } },
              { sku: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, slug: true, images: true, basePrice: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: extractFirstImage(p.images),
    basePrice: Number(p.basePrice),
  }));
}

export async function searchCategoriesForPromotion(
  query: string
): Promise<Array<{ id: string; name: string; slug: string; productCount: number }>> {
  await protectRoute("products:view");

  const trimmed = query.trim();
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      ...(trimmed.length > 0
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { slug: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
  }));
}
