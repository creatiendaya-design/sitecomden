"use server";

import { prisma } from "@/lib/db";
import { createCodOrderSchema } from "@/lib/validations";

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
      const img = variant.image ?? (Array.isArray(variant.product.images) ? (variant.product.images as string[])[0] : undefined);
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
      const img = Array.isArray(product.images) ? (product.images as string[])[0] : undefined;
      resolvedItems.push({ productId: item.productId, quantity: item.quantity, price, name: product.name, image: img });
    }
  }

  const locationJson = {
    address: data.address,
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

  return { success: true, orderId: order.id };
}
