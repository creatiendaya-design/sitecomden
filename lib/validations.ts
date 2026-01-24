/**
 * 🔐 VALIDACIÓN DE DATOS CON ZOD
 * 
 * Este archivo contiene todos los schemas de validación para:
 * - Productos
 * - Categorías
 * - Órdenes
 * - Cupones
 * - Usuarios
 * - Formularios públicos
 * 
 * Uso:
 * import { createProductSchema } from "@/lib/validations";
 * const validatedData = createProductSchema.parse(body);
 */

import { z } from "zod";

// ===================================================================
// HELPERS Y TIPOS COMUNES
// ===================================================================

/**
 * Slug válido: solo minúsculas, números y guiones
 */
export const slugSchema = z
  .string()
  .min(3, "El slug debe tener al menos 3 caracteres")
  .max(200, "El slug no puede exceder 200 caracteres")
  .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones permitidos")
  .trim();

/**
 * Email válido
 */
export const emailSchema = z
  .string()
  .email("Email inválido")
  .toLowerCase()
  .trim();

/**
 * Teléfono peruano (+51 o sin prefijo)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+?51)?[9]\d{8}$/,
    "Formato inválido. Debe ser: 987654321 o +51987654321"
  )
  .trim();

/**
 * DNI peruano (8 dígitos)
 */
export const dniSchema = z
  .string()
  .regex(/^\d{8}$/, "DNI debe tener 8 dígitos")
  .optional();

/**
 * Precio válido
 */
export const priceSchema = z
  .number()
  .positive("El precio debe ser mayor a 0")
  .max(999999, "Precio máximo: S/ 999,999");

/**
 * URL de imagen válida
 */
export const imageUrlSchema = z
  .string()
  .url("URL de imagen inválida")
  .refine(
    (url) => {
      // Verificar que sea una URL de Vercel Blob o dominio confiable
      return (
        url.includes("blob.vercel-storage.com") ||
        url.includes("vercel.app") ||
        url.startsWith("https://")
      );
    },
    { message: "URL de imagen no confiable" }
  );

// ===================================================================
// PRODUCTOS
// ===================================================================

/**
 * Schema para crear producto
 */
export const createProductSchema = z.object({
  // Información básica
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede exceder 200 caracteres")
    .trim(),

  slug: slugSchema,

  description: z
    .string()
    .max(10000, "La descripción es muy larga")
    .optional()
    .nullable(),

  shortDescription: z
    .string()
    .max(500, "La descripción corta no puede exceder 500 caracteres")
    .optional()
    .nullable(),

  // Precios
  basePrice: priceSchema,

  compareAtPrice: z
    .number()
    .positive()
    .max(999999)
    .optional()
    .nullable(),

  // Inventario (solo si no tiene variantes)
  stock: z
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .max(999999, "Stock máximo: 999,999")
    .optional()
    .default(0),

  sku: z
    .string()
    .max(100, "SKU muy largo")
    .optional()
    .nullable(),

  // Media
  images: z
    .array(imageUrlSchema)
    .min(1, "Debe tener al menos una imagen")
    .max(10, "Máximo 10 imágenes"),

  // Flags
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  hasVariants: z.boolean().optional().default(false),

  // Categoría
  categoryId: z
    .string()
    .cuid("ID de categoría inválido")
    .optional()
    .nullable(),

  // SEO
  metaTitle: z
    .string()
    .max(60, "El meta título no puede exceder 60 caracteres")
    .optional()
    .nullable(),

  metaDescription: z
    .string()
    .max(160, "La meta descripción no puede exceder 160 caracteres")
    .optional()
    .nullable(),

  // Peso (para envío)
  weight: z
    .number()
    .positive()
    .max(9999, "Peso máximo: 9,999 kg")
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Validar que compareAtPrice sea mayor que basePrice
    if (
      data.compareAtPrice !== undefined && 
      data.compareAtPrice !== null && 
      data.basePrice !== undefined && 
      data.basePrice !== null
    ) {
      return data.compareAtPrice > data.basePrice;
    }
    return true;
  },
  {
    message: "El precio de comparación debe ser mayor al precio base",
    path: ["compareAtPrice"], // Indica qué campo tiene el error
  }
);

/**
 * Schema para actualizar producto
 * ✅ FIX: Crear explícitamente sin usar .partial() después de .refine()
 */
export const updateProductSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  slug: slugSchema.optional(),
  description: z.string().max(10000).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  basePrice: z.number().positive().max(999999).optional(),
  compareAtPrice: z.number().positive().max(999999).optional().nullable(),
  stock: z.number().int().min(0).max(999999).optional(),
  sku: z.string().max(100).optional().nullable(),
  images: z.array(imageUrlSchema).min(1).max(10).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  categoryId: z.string().cuid().optional().nullable(),
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  weight: z.number().positive().max(9999).optional().nullable(),
}).refine(
  (data) => {
    // Solo validar si ambos campos están presentes y no son null
    if (
      data.compareAtPrice !== undefined && 
      data.compareAtPrice !== null && 
      data.basePrice !== undefined && 
      data.basePrice !== null
    ) {
      return data.compareAtPrice > data.basePrice;
    }
    return true;
  },
  {
    message: "El precio de comparación debe ser mayor al precio base",
    path: ["compareAtPrice"],
  }
);

/**
 * Schema para variante de producto
 */
export const productVariantSchema = z.object({
  sku: z.string().max(100),
  options: z.record(z.string(), z.string()), // { "Color": "Rojo", "Talla": "M" }
  price: priceSchema,
  compareAtPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).max(999999),
  image: imageUrlSchema.optional().nullable(),
  active: z.boolean().optional().default(true),
});

// ===================================================================
// CATEGORÍAS
// ===================================================================

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),

  slug: slugSchema,

  description: z.string().max(1000).optional().nullable(),

  image: imageUrlSchema.optional().nullable(),

  parentId: z.string().cuid().optional().nullable(),

  order: z.number().int().min(0).optional().default(0),

  active: z.boolean().optional().default(true),

  // SEO
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),

  // Tipo de colección
  collectionType: z
    .enum(["MANUAL", "SMART"])
    .optional()
    .default("MANUAL"),

  // Para colecciones manuales
  selectedProductIds: z.array(z.string().cuid()).optional(),

  // Para colecciones inteligentes
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

/**
 * Schema para actualizar categoría
 * ✅ FIX: Crear explícitamente sin usar .partial()
 */
export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  slug: slugSchema.optional(),
  description: z.string().max(1000).optional().nullable(),
  image: imageUrlSchema.optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  metaTitle: z.string().max(60).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  collectionType: z.enum(["MANUAL", "SMART"]).optional(),
  selectedProductIds: z.array(z.string().cuid()).optional(),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

// ===================================================================
// CUPONES
// ===================================================================

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "El código debe tener al menos 3 caracteres")
    .max(50, "El código no puede exceder 50 caracteres")
    .regex(/^[A-Z0-9-]+$/, "Solo mayúsculas, números y guiones")
    .trim()
    .toUpperCase(),

  description: z.string().max(200).optional().nullable(),

  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),

  value: z.number().min(0),

  minPurchase: z.number().positive().optional().nullable(),
  maxDiscount: z.number().positive().optional().nullable(),

  usageLimit: z.number().int().positive().optional().nullable(),
  usageLimitPerUser: z.number().int().positive().optional().nullable(),

  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),

  active: z.boolean().optional().default(true),
}).refine(
  (data) => {
    // Validar que si es PERCENTAGE, el valor no sea mayor a 100
    if (data.type === "PERCENTAGE" && data.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: "El porcentaje no puede ser mayor a 100",
    path: ["value"],
  }
);

/**
 * Schema para actualizar cupón
 * ✅ FIX: Crear explícitamente sin usar .partial() después de .refine()
 */
export const updateCouponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9-]+$/).trim().toUpperCase().optional(),
  description: z.string().max(200).optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]).optional(),
  value: z.number().min(0).optional(),
  minPurchase: z.number().positive().optional().nullable(),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  usageLimitPerUser: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    // Solo validar si ambos campos están presentes
    if (data.type === "PERCENTAGE" && data.value !== undefined) {
      return data.value <= 100;
    }
    return true;
  },
  {
    message: "El porcentaje no puede ser mayor a 100",
    path: ["value"],
  }
);

/**
 * Schema para validar cupón (endpoint público)
 */
export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase(),
  subtotal: z.number().positive(),
});

// ===================================================================
// ÓRDENES / CHECKOUT
// ===================================================================

export const createOrderSchema = z.object({
  // Cliente
  customerName: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200)
    .trim(),

  customerEmail: emailSchema,

  customerPhone: phoneSchema,

  customerDni: dniSchema,

  // Dirección
  address: z
    .string()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(500)
    .trim(),

  district: z.string().min(2).max(100).trim(),
  city: z.string().min(2).max(100).trim().optional().default("Lima"),
  department: z.string().min(2).max(100).trim().optional().default("Lima"),
  districtCode: z.string().min(6).max(6), // Código UBIGEO
  reference: z.string().max(500).optional(),

  // Pago
  paymentMethod: z.enum(["CARD", "YAPE", "PLIN", "PAYPAL", "MERCADOPAGO"]),

  // Items
  items: z
    .array(
      z.object({
        id: z.string(),
        productId: z.string().cuid(),
        variantId: z.string().cuid().optional(),
        name: z.string(),
        variantName: z.string().optional(),
        price: z.number().positive(),
        quantity: z.number().int().positive().max(999),
        image: imageUrlSchema.optional(),
        options: z.record(z.string(), z.any()).optional(),
      })
    )
    .min(1, "Debe tener al menos un producto"),

  // Envío
  shipping: z.number().min(0),
  shippingRateId: z.string().cuid(),
  shippingMethod: z.string(),
  shippingCarrier: z.string().optional(),
  shippingEstimatedDays: z.string().optional(),

  // Cupón
  couponCode: z.string().optional(),
  couponDiscount: z.number().min(0).optional().default(0),

  // Notas
  customerNotes: z.string().max(1000).optional(),

  // WhatsApp
  acceptWhatsApp: z.boolean().optional().default(false),
});

/**
 * Schema para actualizar estado de orden
 */
export const updateOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: z.enum([
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

/**
 * Schema para marcar orden como enviada
 */
export const markOrderShippedSchema = z.object({
  orderId: z.string().cuid(),
  trackingNumber: z.string().max(100).optional(),
  shippingCourier: z.string().max(100).optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

// ===================================================================
// USUARIOS ADMIN
// ===================================================================

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),

  email: emailSchema,

  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener mayúsculas, minúsculas y números"
    ),

  roleId: z.string().cuid(),

  active: z.boolean().optional().default(true),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .optional(),
  });

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es requerida"),
});

// ===================================================================
// FORMULARIOS PÚBLICOS
// ===================================================================

/**
 * Newsletter
 */
export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
});

/**
 * Reclamos
 */
export const complaintSchema = z.object({
  formData: z.record(z.string(), z.any()), // Datos dinámicos del formulario
});

/**
 * Contacto
 */
export const contactFormSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().min(5).max(200).trim(),
  message: z.string().min(10).max(2000).trim(),
});

// ===================================================================
// PAGOS
// ===================================================================

/**
 * Aprobar/Rechazar pago manual (Yape/Plin)
 */
export const approvePaymentSchema = z.object({
  paymentId: z.string().cuid(),
  orderId: z.string().cuid(),
});

export const rejectPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  orderId: z.string().cuid(),
  reason: z.string().max(500).optional(),
});

/**
 * Subir comprobante de pago
 */
export const uploadPaymentProofSchema = z.object({
  orderId: z.string().cuid(),
  reference: z
    .string()
    .min(5, "El número de operación debe tener al menos 5 caracteres")
    .max(100)
    .trim(),
  proofImage: z.string().url("URL de comprobante inválida"),
});

// ===================================================================
// VALIDACIÓN DE STOCK
// ===================================================================

/**
 * Schema para verificar stock antes de checkout
 */
export const checkStockSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string().cuid(),
      variantId: z.string().cuid().optional().nullable(),
      quantity: z.number().int().positive().max(999),
    })
  ),
});

// ===================================================================
// CONFIGURACIÓN DEL SITIO
// ===================================================================

export const updateSiteSettingsSchema = z.object({
  site_name: z.string().min(2).max(100).optional(),
  site_description: z.string().max(500).optional(),
  site_url: z.string().url().optional(),
  site_logo: imageUrlSchema.optional(),
  site_favicon: imageUrlSchema.optional(),

  // Contacto
  contact_email: emailSchema.optional(),
  contact_phone: phoneSchema.optional(),
  contact_address: z.string().max(500).optional(),

  // Redes sociales
  social_facebook: z.string().url().optional(),
  social_instagram: z.string().url().optional(),
  social_twitter: z.string().url().optional(),
  social_tiktok: z.string().url().optional(),

  // SEO
  seo_home_title: z.string().max(60).optional(),
  seo_home_description: z.string().max(160).optional(),
  seo_home_og_image: imageUrlSchema.optional(),
});

// ===================================================================
// EXPORTAR TODO
// ===================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;