"use server";

import { prisma } from "@/lib/db";
import { createCodOrderSchema } from "@/lib/validations";
import { getProductImageUrl } from "@/lib/image-utils";
import { trackConversion } from "@/lib/conversion-api";
import { headers } from "next/headers";
import { getSiteSettings } from "@/lib/site-settings";
import { formatOrderNumber } from "@/lib/utils";
import { validateShippingRestriction } from "@/lib/products/shipping-restriction";
import type { ShippingRestriction } from "@/lib/cod-forms/types";
import {
  resolveAppliedVolumeDiscount,
  resolveAppliedSubscriptionDiscount,
  resolveAppliedFreeGifts,
  subscribeNewsletterFromOrder,
  incrementPromotionUsage,
} from "@/lib/promotions/server";

export async function createCodOrder(rawData: unknown) {
  const parsed = createCodOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Datos del formulario inválidos" };
  }

  const data = parsed.data;

  const itemList = data.items ?? [
    { productId: data.productId!, variantId: data.variantId, quantity: data.quantity ?? 1 },
  ];

  if (!itemList.length) {
    return { success: false, error: "No hay productos en el pedido" };
  }

  let subtotal = 0;
  let promotionDiscount = 0;
  const subscriptionEmails = new Set<string>();
  const promotionSavedBy = new Map<string, number>();
  const trackPromotionSaved = (promotionId: string, amount: number) => {
    if (amount <= 0) return;
    promotionSavedBy.set(
      promotionId,
      (promotionSavedBy.get(promotionId) ?? 0) + amount
    );
  };
  const resolvedItems: {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    name: string;
    image?: string;
  }[] = [];

  for (const item of itemList) {
    let baseUnitPrice = 0;
    let resolvedProductId = "";
    let resolvedName = "";
    let resolvedImage: string | undefined;

    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: {
          price: true,
          stock: true,
          image: true,
          product: { select: { name: true, id: true, images: true } },
        },
      });
      if (!variant) return { success: false, error: "Variante no encontrada" };
      if (variant.stock < item.quantity) return { success: false, error: "Stock insuficiente" };
      baseUnitPrice = Number(variant.price);
      resolvedProductId = variant.product.id;
      resolvedName = variant.product.name;
      resolvedImage = variant.image ?? getProductImageUrl(variant.product.images) ?? undefined;
    } else {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { basePrice: true, stock: true, name: true, images: true },
      });
      if (!product) return { success: false, error: "Producto no encontrado" };
      if (product.stock < item.quantity) return { success: false, error: "Stock insuficiente" };
      baseUnitPrice = Number(product.basePrice);
      resolvedProductId = item.productId!;
      resolvedName = product.name;
      resolvedImage = getProductImageUrl(product.images) ?? undefined;
    }

    let volumeDiscountPerUnit = 0;
    if (item.promotionId) {
      const applied = await resolveAppliedVolumeDiscount({
        promotionId: item.promotionId,
        productId: resolvedProductId,
        quantity: item.quantity,
        unitPrice: baseUnitPrice,
      });
      if (applied) {
        volumeDiscountPerUnit = applied.discountPerUnit;
        const saved = applied.discountPerUnit * item.quantity;
        promotionDiscount += saved;
        trackPromotionSaved(applied.promotionId, saved);
      }
    }

    if (item.subscriptionOptIn) {
      const netUnit = baseUnitPrice - volumeDiscountPerUnit;
      const applied = await resolveAppliedSubscriptionDiscount({
        promotionId: item.subscriptionOptIn.promotionId,
        productId: resolvedProductId,
        unitPrice: netUnit,
        email: item.subscriptionOptIn.email,
      });
      if (applied) {
        const saved = applied.discountPerUnit * item.quantity;
        promotionDiscount += saved;
        trackPromotionSaved(applied.promotionId, saved);
        subscriptionEmails.add(item.subscriptionOptIn.email.trim().toLowerCase());
      }
    }

    // Convention: subtotal is the gross (sum of base prices × qty), and
    // promotionDiscount is subtracted in the final total. OrderItem.price
    // stores the original unit price; the savings live in Order.discount.
    subtotal += baseUnitPrice * item.quantity;
    resolvedItems.push({
      productId: resolvedProductId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: baseUnitPrice,
      name: resolvedName,
      image: resolvedImage,
    });
  }

  // Apply free-gift promotions once the cart is resolved. Each gift gets
  // appended as an additional OrderItem priced at 0; subtotal stays
  // unchanged because the gift doesn't add to what the buyer pays.
  const cartProductIds = resolvedItems.map((i) => i.productId);
  const freeGifts = await resolveAppliedFreeGifts({
    cartProductIds,
    cartSubtotal: subtotal,
  });
  for (const gift of freeGifts) {
    resolvedItems.push({
      productId: gift.productId,
      variantId: gift.variantId,
      quantity: 1,
      price: 0,
      name: `🎁 Regalo: ${gift.name}`,
      image: gift.image ?? undefined,
    });
    trackPromotionSaved(gift.promotionId, gift.basePrice);
  }

  // Server-side shipping restriction validation — read from
  // Product.shippingRestriction (new column), not the legacy codFormSettings.
  const primaryProductId = itemList[0].productId;
  const primaryProduct = await prisma.product.findUnique({
    where: { id: primaryProductId },
    select: { shippingRestriction: true },
  });
  const restrictionRaw = (primaryProduct as any)?.shippingRestriction;
  const restrictionErr = validateShippingRestriction(
    (restrictionRaw as ShippingRestriction | null) ?? null,
    {
      departmentId: data.departmentId ?? null,
      provinceId: data.provinceId ?? null,
      districtCode: data.districtCode ?? null,
    },
  );
  if (restrictionErr) {
    return { success: false, error: restrictionErr };
  }

  const locationJson = {
    address: data.address,
    reference: data.reference ?? "",
    district: data.districtName ?? "",
    city: data.provinceName ?? "",
    department: data.departmentName ?? "",
  };

  // Server-side shipping cost resolution. The client never sets the price —
  // we always re-resolve from the rate id in /admin/envios so a tampered
  // payload cannot under-charge the customer. We also enforce that the
  // chosen rate is actually allowed for this product's COD form template:
  // either it's whitelisted on the template (Shopify-style profile), or
  // the template has no profile and the rate is a regular (non-excluded)
  // one available in fallback mode.
  let shippingCost = 0;
  let shippingMethodLabel = "standard";
  if (data.shippingRateId) {
    const rate = await prisma.shippingRate.findUnique({
      where: { id: data.shippingRateId },
      select: {
        id: true,
        name: true,
        active: true,
        baseCost: true,
        freeShippingMin: true,
        excludeFromRegularCheckout: true,
        zone: { select: { active: true } },
      },
    });
    if (!rate || !rate.active || !rate.zone.active) {
      return { success: false, error: "La tarifa de envío seleccionada ya no está disponible" };
    }

    const productWithTemplate = await prisma.product.findUnique({
      where: { id: primaryProductId },
      select: {
        codFormTemplateId: true,
        codFormTemplate: {
          select: { shippingRates: { select: { id: true } } },
        },
      },
    });
    const assignedIds =
      productWithTemplate?.codFormTemplate?.shippingRates.map((r) => r.id) ?? [];
    const useTemplateProfile = assignedIds.length > 0;
    const allowed = useTemplateProfile
      ? assignedIds.includes(rate.id)
      : !rate.excludeFromRegularCheckout;
    if (!allowed) {
      return {
        success: false,
        error: "La tarifa de envío seleccionada no aplica a este producto",
      };
    }

    const baseCost = Number(rate.baseCost);
    const freeMin = rate.freeShippingMin ? Number(rate.freeShippingMin) : null;
    shippingCost = freeMin && subtotal >= freeMin ? 0 : baseCost;
    shippingMethodLabel = rate.name;
  }

  const roundedDiscount = Math.round(promotionDiscount * 100) / 100;
  const total = subtotal + shippingCost - roundedDiscount;

  const order = await prisma.order.create({
    data: {
      customerName: data.name,
      customerEmail: data.email || `cod-${Date.now()}@shopgood.pe`,
      customerPhone: data.phone,
      customerDni: data.dni,
      customerNotes: data.notes,
      billingAddress: locationJson,
      shippingAddress: locationJson,
      subtotal,
      shipping: shippingCost,
      discount: roundedDiscount,
      tax: 0,
      total,
      paymentMethod: "COD",
      shippingMethod: shippingMethodLabel,
      items: {
        create: resolvedItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
      },
    },
  });

  // Subscribe collected emails (one per unique address) to the newsletter.
  // Failures are swallowed inside the helper so they cannot block the order.
  for (const email of subscriptionEmails) {
    await subscribeNewsletterFromOrder({ email, name: data.name });
  }

  // Bump analytics counters on each applied promotion. These are best-effort
  // and never block; if they fail the order still exists with correct totals.
  for (const [promotionId, savedAmount] of promotionSavedBy) {
    await incrementPromotionUsage(promotionId, savedAmount);
  }

  // Server-side conversion tracking (Conversions API)
  try {
    const headersList = await headers();
    const clientIp = headersList.get("x-forwarded-for")?.split(",")[0] ?? headersList.get("x-real-ip") ?? undefined;
    const clientUserAgent = headersList.get("user-agent") ?? undefined;

    const nameParts = data.name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    await trackConversion("Purchase", {
      email: data.email,
      phone: data.phone,
      firstName,
      lastName: lastName || firstName,
      value: total,
      currency: "PEN",
      transactionId: order.id,
      items: resolvedItems.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        item_price: item.price,
      })),
      clientIp,
      clientUserAgent,
    });
  } catch {
    // Tracking failures must never block the order
  }

  const siteSettings = await getSiteSettings();
  const orderPrefix = siteSettings.order_prefix || "PED";
  const formattedNumber = (order as any).orderSeq
    ? formatOrderNumber((order as any).orderSeq, orderPrefix)
    : `#${order.id.slice(-8).toUpperCase()}`;

  return { success: true, orderId: order.id, formattedNumber };
}
