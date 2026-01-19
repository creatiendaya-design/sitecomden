"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ============================================================
// TIPOS (sin Zod)
// ============================================================

interface OrderInput {
  // Información del cliente
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDni?: string;

  // Dirección
  address: string;
  district: string;
  city: string;
  department: string;
  districtCode?: string;
  reference?: string;

  // Método de pago
  paymentMethod: "YAPE" | "PLIN" | "CARD" | "PAYPAL" | "MERCADOPAGO";

  // Notas y preferencias
  customerNotes?: string;
  acceptWhatsApp?: boolean;

  // Cupón
  couponCode?: string;
  couponDiscount?: number;

  // Envío
  shipping?: number;
  shippingRateId?: string;
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingEstimatedDays?: string;

  // Items del carrito
  items: Array<{
    id: string;
    productId: string;
    variantId?: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    image?: string;
    options?: Record<string, string>;
  }>;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status?: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "VERIFYING";
  fulfillmentStatus?: "UNFULFILLED" | "PARTIAL" | "FULFILLED";
  trackingNumber?: string;
  shippingCourier?: string;
  adminNotes?: string;
}

// ============================================================
// VALIDACIÓN MANUAL (sin Zod)
// ============================================================

function validateOrderInput(data: any): { valid: boolean; error?: string } {
  // Validar que data existe
  if (!data) {
    return { valid: false, error: "No se recibieron datos" };
  }

  // Validar campos requeridos
  if (!data.customerName || typeof data.customerName !== "string" || data.customerName.trim().length < 3) {
    return { valid: false, error: "Nombre debe tener al menos 3 caracteres" };
  }

  if (!data.customerEmail || typeof data.customerEmail !== "string" || !data.customerEmail.includes("@")) {
    return { valid: false, error: "Email inválido" };
  }

  if (!data.customerPhone || typeof data.customerPhone !== "string" || data.customerPhone.length < 9) {
    return { valid: false, error: "Teléfono inválido" };
  }

  if (!data.address || typeof data.address !== "string" || data.address.trim().length < 5) {
    return { valid: false, error: "Dirección muy corta" };
  }

  if (!data.district || typeof data.district !== "string") {
    return { valid: false, error: "Distrito requerido" };
  }

  if (!data.city || typeof data.city !== "string") {
    return { valid: false, error: "Ciudad requerida" };
  }

  if (!data.department || typeof data.department !== "string") {
    return { valid: false, error: "Departamento requerido" };
  }

  if (!data.paymentMethod || !["YAPE", "PLIN", "CARD", "PAYPAL", "MERCADOPAGO"].includes(data.paymentMethod)) {
    return { valid: false, error: "Método de pago inválido" };
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { valid: false, error: "El carrito está vacío" };
  }

  // Validar items
  for (const item of data.items) {
    if (!item.productId || !item.name || !item.price || !item.quantity) {
      return { valid: false, error: "Items del carrito inválidos" };
    }
    if (typeof item.price !== "number" || item.price <= 0) {
      return { valid: false, error: "Precio de item inválido" };
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      return { valid: false, error: "Cantidad de item inválida" };
    }
  }

  return { valid: true };
}

// ============================================================
// CREAR ORDEN (Sin Zod)
// ============================================================

export async function createOrder(data: OrderInput) {
  try {
    console.log("createOrder - datos recibidos:", data);

    // Validar datos manualmente
    const validation = validateOrderInput(data);
    if (!validation.valid) {
      console.error("Validación fallida:", validation.error);
      return {
        success: false,
        error: validation.error || "Datos inválidos",
      };
    }

    // Calcular totales
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = data.couponDiscount || 0;
    const shipping = data.shipping || 0;
    const total = subtotal + shipping - discount;

    console.log("Totales calculados:", { subtotal, discount, shipping, total });

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

    console.log("Stock verificado correctamente");

    // Generar token único para ver la orden sin login
    const viewToken = crypto.randomBytes(32).toString("hex");

    console.log("viewToken generado:", viewToken);

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

        // Items - ✅ CORREGIDO
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            variantName: item.variantName || undefined,
            price: item.price,
            quantity: item.quantity,
            image: item.image || undefined,
            variantOptions: item.options || undefined, // ✅ undefined en lugar de null
          })),
        },
      },
      include: {
        items: true,
      },
    });

    console.log("Orden creada exitosamente:", order.id);

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
      console.log("PendingPayment creado para", data.paymentMethod);
    }

    // Reducir stock de los productos
    for (const item of data.items) {
      if (item.variantId) {
        // Reducir stock de variante
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar movimiento de inventario
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
        // Reducir stock de producto simple
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar movimiento de inventario
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

    console.log("Stock reducido correctamente");

    // Incrementar contador de uso del cupón
    if (data.couponCode) {
      await prisma.coupon.updateMany({
        where: { code: data.couponCode },
        data: { usageCount: { increment: 1 } },
      });
      console.log("Cupón actualizado:", data.couponCode);
    }

    // Enviar email de confirmación con link para ver orden
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/email");
      await sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
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
        viewOrderLink: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/orden/verificar?token=${viewToken}&email=${order.customerEmail}`,
      });
      console.log("Email enviado correctamente");
    } catch (emailError) {
      // No fallar la orden si el email falla
      console.error("Error sending confirmation email:", emailError);
    }

    // Revalidar cache
    revalidatePath("/");
    revalidatePath("/productos");
    revalidatePath("/admin/ordenes");

    console.log("createOrder - éxito:", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      viewToken: order.viewToken,
    });

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
// ACTUALIZAR ESTADO DE ORDEN (Admin) - CON EMAILS AUTOMÁTICOS
// ============================================================

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Obtener la orden actual antes de actualizar
    const currentOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        status: true,
        paymentStatus: true,
        orderNumber: true,
        viewToken: true,
        customerName: true,
        customerEmail: true,
        total: true,
        trackingNumber: true,
        shippingCourier: true,
        estimatedDelivery: true,
        paidAt: true,
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

    if (input.trackingNumber) {
      updateData.trackingNumber = input.trackingNumber;
    }

    if (input.shippingCourier) {
      updateData.shippingCourier = input.shippingCourier;
    }

    if (input.adminNotes) {
      updateData.adminNotes = input.adminNotes;
    }

    // Actualizar la orden
    const order = await prisma.order.update({
      where: { id: input.orderId },
      data: updateData,
    });

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

      // 🎯 Pago aprobado
      if (input.paymentStatus === "PAID" && currentOrder.paymentStatus !== "PAID") {
        await sendPaymentApprovedEmail(
          currentOrder.orderNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink
        );
        console.log("✅ Email de pago aprobado enviado");
      }

      // 🎯 Pago fallido
      if (input.paymentStatus === "FAILED" && currentOrder.paymentStatus !== "FAILED") {
        await sendPaymentFailedEmail(
          currentOrder.orderNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink,
          input.adminNotes || undefined
        );
        console.log("✅ Email de pago fallido enviado");
      }

      // 🎯 Reembolso procesado
      if (input.paymentStatus === "REFUNDED" && currentOrder.paymentStatus !== "REFUNDED") {
        await sendPaymentRefundedEmail(
          currentOrder.orderNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          Number(currentOrder.total),
          viewOrderLink,
          input.adminNotes || undefined
        );
        console.log("✅ Email de reembolso enviado");
      }

      // 🎯 Orden enviada
      if (input.status === "SHIPPED" && currentOrder.status !== "SHIPPED") {
        await sendOrderShippedEmail({
          orderNumber: currentOrder.orderNumber,
          customerName: currentOrder.customerName,
          customerEmail: currentOrder.customerEmail,
          trackingNumber: input.trackingNumber || currentOrder.trackingNumber || undefined,
          shippingCourier: input.shippingCourier || currentOrder.shippingCourier || undefined,
          estimatedDelivery: currentOrder.estimatedDelivery?.toISOString() || undefined,
          viewOrderLink,
        });
        console.log("✅ Email de envío enviado");
      }

      // 🎯 Orden entregada
      if (input.status === "DELIVERED" && currentOrder.status !== "DELIVERED") {
        await sendOrderDeliveredEmail(
          currentOrder.orderNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          viewOrderLink
        );
        console.log("✅ Email de entrega enviado");
      }

      // 🎯 Orden cancelada
      if (input.status === "CANCELLED" && currentOrder.status !== "CANCELLED") {
        await sendOrderCancelledEmail(
          currentOrder.orderNumber,
          currentOrder.customerName,
          currentOrder.customerEmail,
          viewOrderLink,
          input.adminNotes || undefined
        );
        console.log("✅ Email de cancelación enviado");
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