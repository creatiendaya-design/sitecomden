"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { trackConversion } from "@/lib/conversion-api";
import { headers } from "next/headers";
import { z } from "zod";
import { protectRoute } from "@/lib/protect-route";
import { checkRateLimit, apiRateLimiter } from "@/lib/rate-limit";
import { rucSchema } from "@/lib/validations";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";

// ============================================================
// SCHEMAS ZOD
// ============================================================

const orderItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  name: z.string().min(1).max(500),
  variantName: z.string().optional(),
  price: z.number().positive("Precio de item inválido"),
  quantity: z.number().int().positive("Cantidad de item inválida").max(9999),
  image: z.string().optional(),
  options: z.record(z.string(), z.string()).optional(),
  // Customizer (Phase 2.3) — optional, only present for customized items
  customDesign: z.unknown().optional(),
  customDesignImages: z.array(z.object({ zoneId: z.string(), url: z.string() })).optional(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(3, "Nombre debe tener al menos 3 caracteres").max(200),
  customerEmail: z.string().check(z.email("Email inválido")),
  customerPhone: z.string().min(9, "Teléfono inválido").max(20),
  customerDni: z.string().max(20).optional(),
  address: z.string().min(5, "Dirección muy corta").max(500),
  district: z.string().min(1, "Distrito requerido").max(200),
  city: z.string().min(1, "Ciudad requerida").max(200),
  department: z.string().min(1, "Departamento requerido").max(200),
  districtCode: z.string().optional(),
  reference: z.string().max(500).optional(),
  paymentMethod: z.enum(["YAPE", "PLIN", "CARD", "PAYPAL", "MERCADOPAGO"]),
  customerNotes: z.string().max(1000).optional(),
  acceptWhatsApp: z.boolean().optional(),
  couponCode: z.string().max(100).optional(),
  couponDiscount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  shippingRateId: z.string().optional(),
  shippingMethod: z.string().optional(),
  shippingCarrier: z.string().optional(),
  shippingEstimatedDays: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "El carrito está vacío"),
  documentType: z.enum(["BOLETA", "FACTURA"]).optional(),
  buyerRuc: rucSchema.optional(),
  buyerRazonSocial: z.string().max(200).optional(),
  buyerFiscalAddress: z.string().max(500).optional(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "ID de orden requerido"),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "VERIFYING"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIAL", "FULFILLED"]).optional(),
  trackingNumber: z.string().max(200).optional(),
  shippingCourier: z.string().max(200).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ============================================================
// CREAR ORDEN
// ============================================================

export async function createOrder(rawData: unknown) {
  try {
    const parsed = createOrderSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }
    const data = parsed.data;

    // Obtener precios autoritativos del servidor — nunca confiar en los del cliente
    const serverPrices = new Map<string, number>();
    for (const item of data.items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { price: true },
        });
        if (variant) serverPrices.set(item.variantId, Number(variant.price));
      } else {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { basePrice: true },
        });
        if (product) serverPrices.set(item.productId, Number(product.basePrice));
      }
    }

    // Calcular totales con precios del servidor
    const subtotal = data.items.reduce((sum, item) => {
      const key = item.variantId ?? item.productId;
      const price = serverPrices.get(key) ?? 0;
      return sum + price * item.quantity;
    }, 0);
    const shipping = data.shipping || 0;

    // Revalidar cupón en el servidor si se aplicó uno
    let discount = 0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode.toUpperCase(), active: true },
      });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (coupon.type === "PERCENTAGE") {
          discount = (subtotal * Number(coupon.value)) / 100;
          if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
        } else if (coupon.type === "FIXED_AMOUNT") {
          discount = Math.min(Number(coupon.value), subtotal);
        }
      }
    }

    const total = subtotal + shipping - discount;

    // Verificar stock disponible
    for (const item of data.items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true, active: true },
        });

        if (!variant || !variant.active) {
          return {
            success: false,
            error: `El producto ${item.name} ya no está disponible`,
          };
        }

        if (variant.stock < item.quantity) {
          return {
            success: false,
            error: `Stock insuficiente para ${item.name}. Disponible: ${variant.stock}`,
          };
        }
      } else {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, active: true },
        });

        if (!product || !product.active) {
          return {
            success: false,
            error: `El producto ${item.name} ya no está disponible`,
          };
        }

        if (product.stock < item.quantity) {
          return {
            success: false,
            error: `Stock insuficiente para ${item.name}. Disponible: ${product.stock}`,
          };
        }
      }
    }

    // Customizer (Phase 2.3): validate any item that carries a customDesign
    // against the snapshot baked into it AND against the product's current
    // customizableTemplateId.
    const { validateCartItemDesign } = await import("./customizer-checkout");
    for (const item of data.items) {
      if (item.customDesign) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { customizableTemplateId: true },
        });
        const validationResult = validateCartItemDesign(
          {
            productId: item.productId,
            customDesign: item.customDesign as never,
            customDesignImages: item.customDesignImages,
          },
          product?.customizableTemplateId ?? null
        );
        if (!validationResult.success) {
          return {
            success: false,
            error: `Producto "${item.name}": ${validationResult.error}`,
          };
        }
      }
    }

    // Generar token único para ver la orden sin login
    const viewToken = crypto.randomBytes(32).toString("hex");

    // Crear la orden
    const order = await prisma.order.create({
      data: {
        // Token para ver orden sin login
        viewToken,

        // Totales
        subtotal,
        shipping,
        discount,
        total,

        // Cupón
        couponCode: data.couponCode,
        couponDiscount: discount > 0 ? discount : undefined,

        // Estados
        status: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",

        // Información del cliente
        customerName: data.customerName,
        customerEmail: data.customerEmail.toLowerCase().trim(),
        customerPhone: data.customerPhone,
        customerDni: data.customerDni,
        customerType: "person",

        // Direcciones
        billingAddress: {
          address: data.address,
          district: data.district,
          city: data.city,
          department: data.department,
        },
        shippingAddress: {
          address: data.address,
          district: data.district,
          city: data.city,
          department: data.department,
          reference: data.reference || "",
        },

        // Método de pago
        paymentMethod: data.paymentMethod,
        shippingMethod: data.shippingMethod || "standard",
        shippingCourier: data.shippingCarrier || data.shippingMethod || "Standard",

        // Notas
        customerNotes: data.customerNotes,

        // Comprobante SUNAT
        documentType: data.documentType ?? null,
        buyerRuc: data.buyerRuc ?? null,
        buyerRazonSocial: data.buyerRazonSocial ?? null,
        buyerFiscalAddress: data.buyerFiscalAddress ?? null,

        // Items
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            variantName: item.variantName || undefined,
            price: serverPrices.get(item.variantId ?? item.productId) ?? 0,
            quantity: item.quantity,
            image: item.image || undefined,
            variantOptions: (item.options ?? null) as Prisma.InputJsonValue,
            customDesign: item.customDesign === undefined || item.customDesign === null
              ? Prisma.JsonNull
              : (item.customDesign as Prisma.InputJsonValue),
            customDesignImages: item.customDesignImages === undefined || item.customDesignImages === null
              ? Prisma.JsonNull
              : (item.customDesignImages as unknown as Prisma.InputJsonValue),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Si el pago es Yape o Plin, crear registro de pago pendiente
    if (data.paymentMethod === "YAPE" || data.paymentMethod === "PLIN") {
      await prisma.pendingPayment.create({
        data: {
          orderId: order.id,
          method: data.paymentMethod,
          amount: total,
          status: "pending",
        },
      });
    }

    // Para Yape/Plin el stock se descuenta al aprobar el pago (verificación manual).
    // Para tarjeta/PayPal se descuenta inmediatamente porque el pago ya fue confirmado.
    const requiresManualVerification =
      data.paymentMethod === "YAPE" || data.paymentMethod === "PLIN";

    if (!requiresManualVerification) {
      for (const item of data.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
          await prisma.inventoryMovement.create({
            data: {
              variantId: item.variantId,
              type: "SALE",
              quantity: -item.quantity,
              reason: `Venta - Orden #${order.orderNumber}`,
              reference: order.id,
            },
          });
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await prisma.inventoryMovement.create({
            data: {
              productId: item.productId,
              type: "SALE",
              quantity: -item.quantity,
              reason: `Venta - Orden #${order.orderNumber}`,
              reference: order.id,
            },
          });
        }
      }
    }

    // Incrementar contador de uso del cupón
    if (data.couponCode) {
      await prisma.coupon.updateMany({
        where: { code: data.couponCode },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Enviar email de confirmación con link para ver orden
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/email");
      const emailSettings = await getSiteSettings();
      const orderDisplayNumber = displayOrderNumber(order, emailSettings.order_prefix || "PED");
      await sendOrderConfirmationEmail({
        orderNumber: orderDisplayNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: Number(order.total),
        items: order.items.map((item) => ({
          name: item.name,
          variantName: item.variantName || undefined,
          quantity: item.quantity,
          price: Number(item.price) * item.quantity,
        })),
        shippingAddress: order.shippingAddress as any,
        paymentMethod: order.paymentMethod,
        // Link para ver orden sin login
        viewOrderLink: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/orden/verificar?token=${viewToken}&email=${encodeURIComponent(order.customerEmail)}`,
      });
    } catch (emailError) {
      // No fallar la orden si el email falla
      console.error("Error sending confirmation email:", emailError);
    }

    // Revalidar cache
    revalidatePath("/");
    revalidatePath("/productos");
    revalidatePath("/admin/ordenes");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      viewToken: order.viewToken,
      customerEmail: order.customerEmail,
    };
  } catch (error) {
    console.error("Error en createOrder:", error);
    
    return {
      success: false,
      error: "Error al crear la orden. Por favor intenta nuevamente.",
    };
  }
}

// ============================================================
// OBTENER ORDEN (Cliente - con token)
// ============================================================

export async function getOrderByToken(token: string, email: string) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "anonymous";
    const { success } = await checkRateLimit(apiRateLimiter, `order_token:${ip}`, { action: "order_by_token" });
    if (!success) {
      return { success: false, error: "Demasiadas solicitudes. Intenta más tarde." };
    }

    const order = await prisma.order.findFirst({
      where: {
        viewToken: token,
        customerEmail: email.toLowerCase().trim(),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                options: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada. Verifica el link y tu email.",
      };
    }

    // Convertir Decimales a números para Client Components
    const orderData = {
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      couponDiscount: order.couponDiscount ? Number(order.couponDiscount) : null,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    };

    return {
      success: true,
      data: orderData,
    };
  } catch (error) {
    console.error("Error getting order:", error);
    return {
      success: false,
      error: "Error al obtener la orden.",
    };
  }
}

// ============================================================
// LISTAR ÓRDENES (Admin)
// ============================================================

export async function getOrders(filters?: {
  status?: string;
  paymentStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    await protectRoute("orders:view");
    const where: any = {};

    // Filtros
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
        { customerEmail: { contains: filters.search, mode: "insensitive" } },
        { customerPhone: { contains: filters.search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.order.count({ where }),
    ]);

    // Convertir Decimales a números
    const ordersData = orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      couponDiscount: order.couponDiscount ? Number(order.couponDiscount) : null,
    }));

    return {
      success: true,
      data: {
        orders: ordersData,
        total,
        hasMore: total > (filters?.offset || 0) + (filters?.limit || 50),
      },
    };
  } catch (error) {
    console.error("Error getting orders:", error);
    return {
      success: false,
      error: "Error al obtener las órdenes.",
    };
  }
}

// ============================================================
// OBTENER ORDEN POR ID (Admin)
// ============================================================

export async function getOrderById(orderId: string) {
  try {
    await protectRoute("orders:view");
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                options: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada.",
      };
    }

    // Convertir Decimales a números para Client Components
    const orderData = {
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      couponDiscount: order.couponDiscount ? Number(order.couponDiscount) : null,
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    };

    return {
      success: true,
      data: orderData,
    };
  } catch (error) {
    console.error("Error getting order:", error);
    return {
      success: false,
      error: "Error al obtener la orden.",
    };
  }
}

// ============================================================
// ACTUALIZAR ESTADO DE ORDEN (Admin) - CON EMAILS Y TRACKING
// ============================================================

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  try {
    await protectRoute("orders:update_status");
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Obtener la orden actual antes de actualizar
    const currentOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: true, // ✅ Incluir items para tracking
      },
    });

    if (!currentOrder) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // ✅ VALIDAR TRANSICIONES DE ESTADO DE ORDEN
    if (input.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ["PAID", "CANCELLED"],
        PAID: ["PROCESSING", "CANCELLED"],
        PROCESSING: ["SHIPPED", "CANCELLED"],
        SHIPPED: ["DELIVERED"],
        DELIVERED: [],
        CANCELLED: [],
        REFUNDED: [],
      };

      const allowed = allowedTransitions[currentOrder.status] || [];
      
      if (!allowed.includes(input.status) && input.status !== currentOrder.status) {
        return {
          success: false,
          error: `No se puede cambiar de ${currentOrder.status} a ${input.status}`,
        };
      }

      updateData.status = input.status;

      // Timestamps automáticos
      if (input.status === "PAID") {
        updateData.paidAt = new Date();
      } else if (input.status === "SHIPPED") {
        updateData.shippedAt = new Date();
      } else if (input.status === "DELIVERED") {
        updateData.deliveredAt = new Date();
      } else if (input.status === "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
    }

    // ✅ VALIDAR TRANSICIONES DE ESTADO DE PAGO
    if (input.paymentStatus) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ["VERIFYING", "PAID", "FAILED"],
        VERIFYING: ["PAID", "FAILED"],
        PAID: ["REFUNDED"],
        FAILED: ["PENDING"],
        REFUNDED: [],
      };

      const allowed = allowedTransitions[currentOrder.paymentStatus] || [];
      
      if (!allowed.includes(input.paymentStatus) && input.paymentStatus !== currentOrder.paymentStatus) {
        return {
          success: false,
          error: `No se puede cambiar el estado de pago de ${currentOrder.paymentStatus} a ${input.paymentStatus}`,
        };
      }

      updateData.paymentStatus = input.paymentStatus;
      
      // Si se marca como PAID, también actualizar timestamp
      if (input.paymentStatus === "PAID" && !currentOrder.paidAt) {
        updateData.paidAt = new Date();
      }
    }

    // ✅ VALIDAR COHERENCIA ENTRE ESTADOS
    const newOrderStatus = input.status || currentOrder.status;
    const newPaymentStatus = input.paymentStatus || currentOrder.paymentStatus;

    if (newOrderStatus === "DELIVERED" && newPaymentStatus !== "PAID") {
      return {
        success: false,
        error: "No se puede marcar como entregado sin confirmar el pago",
      };
    }

    if (newOrderStatus === "SHIPPED" && newPaymentStatus !== "PAID") {
      return {
        success: false,
        error: "No se puede marcar como enviado sin confirmar el pago",
      };
    }

    if (input.fulfillmentStatus) {
      updateData.fulfillmentStatus = input.fulfillmentStatus;
    }

    if (input.trackingNumber !== undefined) {
      updateData.trackingNumber = input.trackingNumber;
    }

    if (input.shippingCourier !== undefined) {
      updateData.shippingCourier = input.shippingCourier;
    }

    if (input.adminNotes !== undefined) {
      updateData.adminNotes = input.adminNotes;
    }

    // Actualizar la orden
    const order = await prisma.order.update({
      where: { id: input.orderId },
      data: updateData,
    });

    // ============================================================
    // ✅ TRACKING DE CONVERSIONES - SERVER SIDE
    // ============================================================
    if (input.paymentStatus === "PAID" && currentOrder.paymentStatus !== "PAID") {
      try {
        // ✅ Obtener headers para IP y User Agent (con await)
        const headersList = await headers();
        const clientIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
        const clientUserAgent = headersList.get("user-agent");

        // Preparar items para tracking
        const trackingItems = currentOrder.items.map((item) => ({
          id: item.sku || item.productId || "",
          quantity: item.quantity,
          item_price: Number(item.price),
        }));

        // Dividir nombre en firstName y lastName
        const nameParts = currentOrder.customerName.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");

        // Enviar conversión a todas las plataformas (Facebook, TikTok, Google, GA4)
        await trackConversion("Purchase", {
          email: currentOrder.customerEmail,
          phone: currentOrder.customerPhone,
          firstName: firstName,
          lastName: lastName || firstName, // Fallback si solo tiene un nombre
          value: Number(currentOrder.total),
          currency: "PEN",
          transactionId: currentOrder.orderNumber,
          items: trackingItems,
          sourceUrl: `${process.env.NEXT_PUBLIC_URL || "https://nuejoy.online"}/orden/${currentOrder.id}/confirmacion`,
          clientIp: clientIp || undefined,
          clientUserAgent: clientUserAgent || undefined,
        });
      } catch (trackingError) {
        // No fallar la actualización si el tracking falla
        console.error("❌ Error enviando conversión (no crítico):", trackingError);
      }
    }

    // ✅ ENVIAR EMAILS AUTOMÁTICOS según el cambio de estado
    const viewOrderLink = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/orden/verificar?token=${currentOrder.viewToken}&email=${encodeURIComponent(currentOrder.customerEmail)}`;

    try {
      const {
        sendPaymentApprovedEmail,
        sendOrderShippedEmail,
        sendOrderDeliveredEmail,
        sendOrderCancelledEmail,
        sendPaymentFailedEmail,
        sendPaymentRefundedEmail,
      } = await import("@/lib/email");

      const emailSettings = await getSiteSettings();
      const orderDisplayNumber = displayOrderNumber(currentOrder, emailSettings.order_prefix || "PED");

      // 🎯 Pago aprobado
      if (input.paymentStatus === "PAID" && currentOrder.paymentStatus !== "PAID") {
        await sendPaymentApprovedEmail(
          orderDisplayNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink
        );
      }

      // 🎯 Pago fallido
      if (input.paymentStatus === "FAILED" && currentOrder.paymentStatus !== "FAILED") {
        await sendPaymentFailedEmail(
          orderDisplayNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink,
          input.adminNotes || undefined
        );
      }

      // 🎯 Reembolso procesado
      if (input.paymentStatus === "REFUNDED" && currentOrder.paymentStatus !== "REFUNDED") {
        await sendPaymentRefundedEmail(
          orderDisplayNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink,
          input.adminNotes || undefined
        );
      }

      // 🎯 Orden enviada
      if (input.status === "SHIPPED" && currentOrder.status !== "SHIPPED") {
        await sendOrderShippedEmail({
          orderNumber: orderDisplayNumber,
          customerName: currentOrder.customerName,
          customerEmail: currentOrder.customerEmail,
          trackingNumber: input.trackingNumber || currentOrder.trackingNumber || undefined,
          shippingCourier: input.shippingCourier || currentOrder.shippingCourier || undefined,
          estimatedDelivery: currentOrder.estimatedDelivery?.toISOString() || undefined,
          viewOrderLink,
        });
      }

      // 🎯 Orden entregada
      if (input.status === "DELIVERED" && currentOrder.status !== "DELIVERED") {
        await sendOrderDeliveredEmail(
          orderDisplayNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          viewOrderLink
        );
      }

      // 🎯 Orden cancelada
      if (input.status === "CANCELLED" && currentOrder.status !== "CANCELLED") {
        await sendOrderCancelledEmail(
          orderDisplayNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          viewOrderLink,
          input.adminNotes || undefined
        );
      }
    } catch (emailError) {
      // No fallar la actualización si el email falla
      console.error("Error enviando email de notificación:", emailError);
    }

    // Revalidar páginas
    revalidatePath("/admin/ordenes");
    revalidatePath(`/admin/ordenes/${input.orderId}`);

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      error: "Error al actualizar la orden.",
    };
  }
}

// ============================================================
// ESTADÍSTICAS (Admin Dashboard)
// ============================================================

export async function getOrderStats() {
  try {
    await protectRoute("orders:view");
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "SHIPPED" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { total: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        paidOrders,
        shippedOrders,
        deliveredOrders,
        totalRevenue: totalRevenue._sum.total ? Number(totalRevenue._sum.total) : 0,
      },
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      success: false,
      error: "Error al obtener estadísticas.",
    };
  }
}