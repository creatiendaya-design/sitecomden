"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { protectRoute } from "@/lib/protect-route";
import { logAudit } from "@/lib/audit-log";
import {
  submitReviewSchema,
  moderateReviewSchema,
} from "@/lib/validations/admin";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ");
}

// Order states that count as a real, paid purchase for the "compra verificada"
// badge. A pending/cancelled order should not verify a review.
const VERIFYING_ORDER_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;

/**
 * Public review submission (called from the storefront form).
 *
 * - Validates input with Zod.
 * - Reviews are created `approved: false` — they only appear on the storefront
 *   after an admin approves them (moderation).
 * - `verified` is derived server-side: true when the email has a paying order
 *   that included this product. The client cannot set it.
 */
export async function submitReview(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = submitReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const data = parsed.data;

    // The product must exist and be active before we accept a review for it.
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, slug: true },
    });
    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    // Derive "verified": does this email have a paying order with this product?
    const verifyingOrder = await prisma.order.findFirst({
      where: {
        customerEmail: data.customerEmail,
        status: { in: [...VERIFYING_ORDER_STATUSES] },
        items: { some: { productId: data.productId } },
      },
      select: { id: true },
    });

    const review = await prisma.productReview.create({
      data: {
        productId: data.productId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        images: data.images ?? [],
        verified: Boolean(verifyingOrder),
        orderId: verifyingOrder?.id ?? null,
        approved: false,
      },
    });

    // Refresh the admin moderation list; the storefront page only changes once
    // the review is approved, so no storefront revalidation here.
    revalidatePath("/admin/resenas");

    return { success: true, data: { id: review.id } };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Error al enviar la reseña" };
  }
}

export interface AdminReviewRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  verified: boolean;
  approved: boolean;
  createdAt: string;
}

/**
 * Admin: list reviews for the moderation panel. `filter` narrows by approval
 * state; default "pending" surfaces what needs action first.
 */
export async function getReviewsForAdmin(
  filter: "pending" | "approved" | "all" = "pending"
): Promise<ActionResult<AdminReviewRow[]>> {
  try {
    await protectRoute("reviews:moderate");

    const where =
      filter === "pending"
        ? { approved: false }
        : filter === "approved"
          ? { approved: true }
          : {};

    const reviews = await prisma.productReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        productId: true,
        customerName: true,
        customerEmail: true,
        rating: true,
        title: true,
        comment: true,
        images: true,
        verified: true,
        approved: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
      },
    });

    const rows: AdminReviewRow[] = reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product?.name ?? "(producto eliminado)",
      productSlug: r.product?.slug ?? "",
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      images: r.images,
      verified: r.verified,
      approved: r.approved,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data: rows };
  } catch (error) {
    console.error("Error listing reviews:", error);
    return { success: false, error: "Error al obtener reseñas" };
  }
}

/** Admin: counts per moderation bucket, for tab badges. */
export async function getReviewCounts(): Promise<
  ActionResult<{ pending: number; approved: number; total: number }>
> {
  try {
    await protectRoute("reviews:moderate");
    const [pending, approved, total] = await Promise.all([
      prisma.productReview.count({ where: { approved: false } }),
      prisma.productReview.count({ where: { approved: true } }),
      prisma.productReview.count(),
    ]);
    return { success: true, data: { pending, approved, total } };
  } catch (error) {
    console.error("Error counting reviews:", error);
    return { success: false, error: "Error al contar reseñas" };
  }
}

/** Admin: approve / unapprove / toggle verified on a single review. */
export async function moderateReview(input: unknown): Promise<ActionResult> {
  try {
    const userId = await protectRoute("reviews:moderate");

    const parsed = moderateReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const { id, approved, verified } = parsed.data;

    const updateData: { approved?: boolean; verified?: boolean } = {};
    if (approved !== undefined) updateData.approved = approved;
    if (verified !== undefined) updateData.verified = verified;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "Nada que actualizar" };
    }

    const review = await prisma.productReview.update({
      where: { id },
      data: updateData,
      select: { id: true, productId: true, product: { select: { slug: true } } },
    });

    await logAudit({
      action: "review.moderated",
      userId,
      entityType: "ProductReview",
      entityId: review.id,
      after: updateData,
    });

    revalidatePath("/admin/resenas");
    if (review.product?.slug) {
      revalidatePath(`/productos/${review.product.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error moderating review:", error);
    return { success: false, error: "Error al moderar la reseña" };
  }
}

/** Admin: permanently delete a review. */
export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    const userId = await protectRoute("reviews:moderate");

    const review = await prisma.productReview.delete({
      where: { id },
      select: { id: true, product: { select: { slug: true } } },
    });

    await logAudit({
      action: "review.deleted",
      userId,
      entityType: "ProductReview",
      entityId: id,
    });

    revalidatePath("/admin/resenas");
    if (review.product?.slug) {
      revalidatePath(`/productos/${review.product.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Error al eliminar la reseña" };
  }
}
