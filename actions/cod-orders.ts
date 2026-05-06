"use server";

import { prisma } from "@/lib/db";
import { createCodOrderSchema } from "@/lib/validations";
import { getProductImageUrl } from "@/lib/image-utils";
import { trackConversion } from "@/lib/conversion-api";
import { headers } from "next/headers";
import { getSiteSettings } from "@/lib/site-settings";
import { formatOrderNumber } from "@/lib/utils";
import { validateShippingRestriction } from "@/lib/products/shipping-restriction";
import { templateToLegacySettings } from "@/lib/cod-forms/template-to-settings";
import type { ShippingRestriction } from "@/lib/cod-forms/types";

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
  const resolvedItems: {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    name: string;
    image?: string;
  }[] = [];

  for (const item of itemList) {
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
      const price = Number(variant.price);
      subtotal += price * item.quantity;
      const img = variant.image ?? getProductImageUrl(variant.product.images) ?? undefined;
      resolvedItems.push({ productId: variant.product.id, variantId: item.variantId, quantity: item.quantity, price, name: variant.product.name, image: img });
    } else {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { basePrice: true, stock: true, name: true, images: true },
      });
      if (!product) return { success: false, error: "Producto no encontrado" };
      if (product.stock < item.quantity) return { success: false, error: "Stock insuficiente" };
      const price = Number(product.basePrice);
      subtotal += price * item.quantity;
      const img = getProductImageUrl(product.images) ?? undefined;
      resolvedItems.push({ productId: item.productId, quantity: item.quantity, price, name: product.name, image: img });
    }
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
      shipping: 0,
      discount: 0,
      tax: 0,
      total: subtotal,
      paymentMethod: "COD",
      shippingMethod: "standard",
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
      value: subtotal,
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

export async function getCartCodData(productIds: string[]): Promise<{
  hasCod: boolean;
  settings: import("@/lib/types/cod-form").CodFormSettings | null;
}> {
  if (!productIds.length) return { hasCod: false, settings: null };

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      checkoutMode: true,
      name: true,
      codFormTemplate: {
        include: {
          blocks: { orderBy: { position: "asc" } },
          thankYouPage: { select: { slug: true } },
        },
      },
    },
  });

  const codProduct = products.find(
    (p) => p.checkoutMode === "COD_ONLY" || p.checkoutMode === "COD_AND_CART"
  );

  if (!codProduct?.codFormTemplate) {
    return { hasCod: !!codProduct, settings: null };
  }

  const template = codProduct.codFormTemplate;
  const templateData = {
    id: template.id,
    name: template.name,
    isDefault: template.isDefault,
    buttonText: template.buttonText,
    buttonStyle: template.buttonStyle as any,
    postSubmitAction: template.postSubmitAction,
    thankYouTitle: template.thankYouTitle,
    thankYouMessage: template.thankYouMessage,
    whatsappNumber: template.whatsappNumber,
    whatsappMessage: template.whatsappMessage,
    thankYouPageId: template.thankYouPageId,
    thankYouPageSlug: (template as any).thankYouPage?.slug ?? null,
    blocks: (template.blocks ?? []).map((b: any) => ({
      id: b.id,
      position: b.position,
      type: b.type,
      content: (b.content ?? {}) as Record<string, unknown>,
      visible: b.visible,
      required: b.required,
    })),
  };

  return {
    hasCod: true,
    settings: templateToLegacySettings(templateData),
  };
}
