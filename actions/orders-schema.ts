/**
 * Zod schemas for the orders feature.
 *
 * These live in a PLAIN module (no "use server") on purpose: a "use server"
 * file may only export async functions, so exporting Zod schemas / types from
 * `actions/orders.ts` directly throws at module evaluation
 * ("A 'use server' file can only export async functions, found object.").
 * Keeping the schemas here lets both the server action and the unit tests
 * import them safely.
 */

import { z } from "zod";
import { rucSchema } from "@/lib/validations";

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
  // Volume promotion to re-resolve server-side. Never trust the discount
  // amount from the client — only the promotionId is used as a lookup.
  promotionId: z.string().optional(),
  // Bundle promotion to re-resolve server-side. The discount applies only if
  // all required partner products are present in the same payload.
  bundlePromotionId: z.string().optional(),
  // Subscription opt-in for a SUBSCRIPTION promotion. Server validates the
  // email + applies the discount + subscribes to NewsletterSubscriber.
  subscriptionOptIn: z
    .object({
      promotionId: z.string(),
      email: z.string().email(),
    })
    .optional(),
  // Customizer (Phase 2.3) — optional, only present for customized items
  customDesign: z.unknown().optional(),
  customDesignImages: z.array(z.object({ zoneId: z.string(), url: z.string() })).optional(),
});

export const createOrderSchema = z.object({
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

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "ID de orden requerido"),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "VERIFYING"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIAL", "FULFILLED"]).optional(),
  trackingNumber: z.string().max(200).optional(),
  shippingCourier: z.string().max(200).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
