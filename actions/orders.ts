"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { trackConversion } from "@/lib/conversion-api";
import { headers } from "next/headers";
import { protectRoute } from "@/lib/protect-route";
import { checkRateLimit, apiRateLimiter, checkoutRateLimiter } from "@/lib/rate-limit";
import { createOrderSchema, type UpdateOrderStatusInput } from "./orders-schema";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import { validateShippingRestriction } from "@/lib/products/shipping-restriction";
import type { ShippingRestriction } from "@/lib/cod-forms/types";
import {
  decrementStockAtomic,
  StockUnavailableError,
} from "@/lib/inventory/decrement-stock";
import { grantOrderAccess } from "@/lib/orders/order-access";
import {
  resolveAppliedVolumeDiscount,
  resolveAppliedSubscriptionDiscount,
  resolveAppliedBundleDiscount,
  resolveAppliedFreeGifts,
  subscribeNewsletterFromOrder,
  incrementPromotionUsage,
  type ResolvedFreeGiftItem,
} from "@/lib/promotions/server";

// ============================================================
// SCHEMAS ZOD
// ============================================================
// NOTE: The Zod schemas live in a plain module (./orders-schema) because a
// "use server" file may only export async functions. Defining/exporting them
// here throws at module evaluation ("found object").

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

    // Rate limiting por IP: previene spam de órdenes falsas (10 / 10 min).
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
    const rl = await checkRateLimit(checkoutRateLimiter, ip, { action: "createOrder" });
    if (!rl.success) {
      return {
        success: false,
        error: "Demasiados intentos de compra. Espera unos minutos e intenta nuevamente.",
      };
    }

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
    // Costo de envío SIEMPRE resuelto desde la BD vía shippingRateId. Nunca
    // confiar en data.shipping del cliente (un payload manipulado podría enviar
    // shipping:0 para no pagar envío). Mismo patrón que el flujo COD.
    let resolvedShipping = 0;
    if (data.shippingRateId) {
      const rate = await prisma.shippingRate.findUnique({
        where: { id: data.shippingRateId },
        select: {
          active: true,
          baseCost: true,
          freeShippingMin: true,
          zone: { select: { active: true } },
        },
      });
      if (!rate || !rate.active || !rate.zone.active) {
        return {
          success: false,
          error: "La tarifa de envío seleccionada ya no está disponible.",
        };
      }
      const baseCost = Number(rate.baseCost);
      const freeMin = rate.freeShippingMin ? Number(rate.freeShippingMin) : null;
      resolvedShipping = freeMin && subtotal >= freeMin ? 0 : baseCost;
    }

    // Resolver descuentos por volumen + suscripción server-side. Nunca
    // confiamos en valores del cliente; solo en los promotionId/email que
    // pasan por validación contra la BD.
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
    for (const item of data.items) {
      const key = item.variantId ?? item.productId;
      const baseUnitPrice = serverPrices.get(key) ?? 0;

      let volumeDiscountPerUnit = 0;
      if (item.promotionId) {
        const applied = await resolveAppliedVolumeDiscount({
          promotionId: item.promotionId,
          productId: item.productId,
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
          productId: item.productId,
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
    }
    // BUNDLE pass: each unique bundlePromotionId is resolved once against
    // the full cart so we can validate partner presence. The discount is
    // distributed per-product by the resolver and we apply it × quantity.
    const uniqueBundleIds = [
      ...new Set(
        data.items
          .map((i) => i.bundlePromotionId)
          .filter((id): id is string => !!id)
      ),
    ];
    for (const bundleId of uniqueBundleIds) {
      const applied = await resolveAppliedBundleDiscount({
        promotionId: bundleId,
        cartItems: data.items.map((i) => {
          const key = i.variantId ?? i.productId;
          return {
            productId: i.productId,
            unitPrice: serverPrices.get(key) ?? 0,
            quantity: i.quantity,
          };
        }),
      });
      if (!applied) continue;
      let bundleSaved = 0;
      for (const item of data.items) {
        const perUnit = applied.perProductDiscount.get(item.productId);
        if (!perUnit) continue;
        const saved = perUnit * item.quantity;
        promotionDiscount += saved;
        bundleSaved += saved;
      }
      trackPromotionSaved(applied.promotionId, bundleSaved);
    }

    promotionDiscount = Math.round(promotionDiscount * 100) / 100;

    // Revalidar cupón SIEMPRE en el servidor. El cliente solo envía el código;
    // nunca confiamos en couponDiscount. Validamos vigencia (expiresAt/startsAt),
    // monto mínimo y LÍMITE DE USOS antes de aplicar. El incremento atómico en
    // la transacción (más abajo) es la red de seguridad final contra carreras.
    let couponDiscount = 0;
    let freeShippingApplied = false;
    let couponApplied = false;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: data.couponCode.toUpperCase(), active: true },
      });

      const now = new Date();
      const invalid =
        !coupon ||
        (coupon.expiresAt !== null && coupon.expiresAt <= now) ||
        (coupon.startsAt !== null && coupon.startsAt > now) ||
        (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) ||
        (coupon.minPurchase !== null && subtotal < Number(coupon.minPurchase));

      if (invalid) {
        return {
          success: false,
          error: "El cupón ya no es válido o no aplica a tu compra. Quítalo e inténtalo de nuevo.",
        };
      }

      if (coupon!.type === "PERCENTAGE") {
        couponDiscount = (subtotal * Number(coupon!.value)) / 100;
        if (coupon!.maxDiscount) {
          couponDiscount = Math.min(couponDiscount, Number(coupon!.maxDiscount));
        }
      } else if (coupon!.type === "FIXED_AMOUNT") {
        couponDiscount = Math.min(Number(coupon!.value), subtotal);
      } else if (coupon!.type === "FREE_SHIPPING") {
        freeShippingApplied = true;
      }
      couponApplied = couponDiscount > 0 || freeShippingApplied;
    }

    const shipping = freeShippingApplied ? 0 : resolvedShipping;
    const discount = couponDiscount + promotionDiscount;
    const total = subtotal + shipping - discount;

    // Resolve any FREE_GIFT promotions that match items in the cart and the
    // total subtotal threshold. The gifts are added as OrderItems at price 0
    // and their stock is decremented inside the transaction below.
    const freeGifts: ResolvedFreeGiftItem[] = await resolveAppliedFreeGifts({
      cartProductIds: data.items.map((i) => i.productId),
      cartSubtotal: subtotal,
    });
    for (const gift of freeGifts) {
      trackPromotionSaved(gift.promotionId, gift.basePrice);
    }

    // Pre-flight availability check (cheap reads). The authoritative TOCTOU-safe
    // decrement happens inside the transaction below via decrementStockAtomic.
    // We don't expose exact remaining stock to the client (info disclosure).
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
            error: `Stock insuficiente para ${item.name}.`,
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
            error: `Stock insuficiente para ${item.name}.`,
          };
        }
      }
    }

    // Server-side shipping-restriction validation per product. The standard
    // checkout schema only carries the district code (department/province are
    // free-text names), so we validate at the district level only — restrictions
    // defined exclusively at province/department level for a product won't fire
    // here. The COD checkout (which carries explicit IDs) is unaffected.
    const productsForRestriction = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      select: {
        id: true,
        name: true,
        shippingRestriction: true,
        checkoutMode: true,
      },
    });

    // Productos asignados a un COD form (checkoutMode != STANDARD) no pueden
    // pasar por este flujo de checkout (tarjeta / Yape / Plin / PayPal); solo
    // se venden vía CodOrderModal → createCodOrder.
    for (const item of data.items) {
      const p = productsForRestriction.find((x) => x.id === item.productId);
      if (p && p.checkoutMode !== "STANDARD") {
        return {
          success: false,
          error: `${p.name} solo está disponible para pedido contra entrega (COD).`,
        };
      }
    }

    for (const item of data.items) {
      const p = productsForRestriction.find((x) => x.id === item.productId);
      if (!p) continue;
      const err = validateShippingRestriction(
        ((p as any).shippingRestriction as ShippingRestriction | null) ?? null,
        {
          departmentId: null,
          provinceId: null,
          districtCode: data.districtCode ?? null,
        },
      );
      if (err) {
        return { success: false, error: `${p.name}: ${err}` };
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

    // Para Yape/Plin el stock se descuenta al aprobar el pago (verificación manual).
    // Para tarjeta/PayPal se reserva inmediatamente porque la pasarela cobrará el monto.
    const requiresManualVerification =
      data.paymentMethod === "YAPE" || data.paymentMethod === "PLIN";

    // Atomic checkout: create order + decrement stock + bump coupon usage
    // inside a single transaction. If any line item ran out of stock between
    // the pre-flight check and now (concurrent buyer won the race), the
    // StockUnavailableError rolls back the order and we surface a clear error.
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            viewToken,
            subtotal,
            shipping,
            discount,
            total,
            couponCode: data.couponCode,
            couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
            status: "PENDING",
            paymentStatus: "PENDING",
            fulfillmentStatus: "UNFULFILLED",
            customerName: data.customerName,
            customerEmail: data.customerEmail.toLowerCase().trim(),
            customerPhone: data.customerPhone,
            customerDni: data.customerDni,
            customerType: "person",
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
            paymentMethod: data.paymentMethod,
            shippingMethod: data.shippingMethod || "standard",
            shippingCourier: data.shippingCarrier || data.shippingMethod || "Standard",
            customerNotes: data.customerNotes,
            documentType: data.documentType ?? null,
            buyerRuc: data.buyerRuc ?? null,
            buyerRazonSocial: data.buyerRazonSocial ?? null,
            buyerFiscalAddress: data.buyerFiscalAddress ?? null,
            items: {
              create: [
                ...data.items.map((item) => ({
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
                ...freeGifts.map((gift) => ({
                  productId: gift.productId,
                  variantId: gift.variantId || undefined,
                  name: `🎁 Regalo: ${gift.name}`,
                  price: 0,
                  quantity: 1,
                  image: gift.image ?? undefined,
                })),
              ],
            },
          },
          include: { items: true },
        });

        if (data.paymentMethod === "YAPE" || data.paymentMethod === "PLIN") {
          await tx.pendingPayment.create({
            data: {
              orderId: created.id,
              method: data.paymentMethod,
              amount: total,
              status: "pending",
            },
          });
        }

        if (!requiresManualVerification) {
          for (const item of data.items) {
            const result = await decrementStockAtomic(tx, {
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              name: item.name,
            });
            if (!result.ok) {
              throw new StockUnavailableError(result.error ?? "Stock insuficiente");
            }

            await tx.inventoryMovement.create({
              data: {
                productId: item.variantId ? undefined : item.productId,
                variantId: item.variantId || undefined,
                type: "SALE",
                quantity: -item.quantity,
                reason: `Venta - Orden #${created.orderNumber}`,
                reference: created.id,
              },
            });
          }

          for (const gift of freeGifts) {
            const result = await decrementStockAtomic(tx, {
              productId: gift.productId,
              variantId: gift.variantId,
              quantity: 1,
              name: gift.name,
            });
            if (!result.ok) {
              throw new StockUnavailableError(
                `Regalo ${gift.name} sin stock disponible`
              );
            }

            await tx.inventoryMovement.create({
              data: {
                productId: gift.variantId ? undefined : gift.productId,
                variantId: gift.variantId || undefined,
                type: "SALE",
                quantity: -1,
                reason: `Regalo - Orden #${created.orderNumber}`,
                reference: created.id,
              },
            });
          }
        }

        // Incremento atómico con guarda de límite: solo incrementa si aún hay
        // cupos disponibles. Si un checkout concurrente consumió el último uso
        // entre la validación de arriba y este punto, el UPDATE afecta 0 filas
        // y abortamos la orden (red de seguridad contra la carrera de cupones).
        if (couponApplied && data.couponCode) {
          const incremented = await tx.$executeRaw`
            UPDATE "Coupon"
            SET "usageCount" = "usageCount" + 1
            WHERE "code" = ${data.couponCode.toUpperCase()}
              AND "active" = true
              AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")
          `;
          if (incremented === 0) {
            throw new StockUnavailableError(
              "El cupón ya alcanzó su límite de usos."
            );
          }
        }

        return created;
      });
    } catch (txError) {
      if (txError instanceof StockUnavailableError) {
        return { success: false, error: txError.message };
      }
      throw txError;
    }

    // Grant this browser access to the just-created order so the post-checkout
    // redirect (router.push to /orden/[orderId]/...) works without leaking the
    // order to anyone who guesses the id. See lib/orders/order-access.ts.
    await grantOrderAccess(order.id, order.viewToken);

    // Subscribe collected emails (one per unique address) to the newsletter.
    for (const email of subscriptionEmails) {
      await subscribeNewsletterFromOrder({ email, name: data.customerName });
    }

    // Bump analytics counters on each applied promotion. Best-effort, never
    // blocks the order from being considered complete.
    for (const [promotionId, savedAmount] of promotionSavedBy) {
      await incrementPromotionUsage(promotionId, savedAmount);
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
          customDesignImages: (item.customDesignImages as unknown as Array<{ zoneId: string; url: string }> | null) ?? undefined,
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