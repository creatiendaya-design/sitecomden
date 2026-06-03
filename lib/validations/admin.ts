/**
 * 🔐 Zod schemas for admin server actions.
 *
 * Conventions:
 * - One named schema per server-action input.
 * - Schemas live here, not next to the action, so the same shape can be
 *   reused by API routes or client-side form resolvers.
 * - When a value is sensitive (password, points adjustment, role level),
 *   prefer narrow primitives (z.string().min(...).max(...), z.number().int())
 *   over z.any().
 * - Schemas accept the raw payload as `unknown` at the call site:
 *   `const parsed = schema.parse(input)`. Server actions then operate on
 *   `parsed`, not on the original argument.
 */

import { z } from "zod";

const NAME = z.string().trim().min(1, "Nombre requerido").max(120);
const EMAIL = z.email("Email inválido").max(255).trim().toLowerCase();
const PASSWORD = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200);
const CUID = z.string().min(1).max(64);
const OPTIONAL_CUID = CUID.nullable().optional();

// ===================================================================
// USERS
// ===================================================================

export const createUserSchema = z.object({
  name: NAME,
  email: EMAIL,
  password: PASSWORD,
  roleId: OPTIONAL_CUID,
  active: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: NAME,
  email: EMAIL,
  roleId: OPTIONAL_CUID,
  active: z.boolean(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  userId: CUID,
  newPassword: PASSWORD,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const assignCustomPermissionSchema = z.object({
  userId: CUID,
  permissionId: CUID,
  type: z.enum(["GRANT", "DENY"]),
});
export type AssignCustomPermissionInput = z.infer<
  typeof assignCustomPermissionSchema
>;

// ===================================================================
// ROLES
// ===================================================================

export const roleFormSchema = z.object({
  name: NAME,
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/, "Slug debe contener solo minúsculas, números, _ o -"),
  description: z.string().max(500).optional().nullable(),
  level: z.number().int().min(0).max(1000),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color debe ser un hex #RRGGBB")
    .optional(),
  active: z.boolean().default(true),
  permissionIds: z.array(CUID).default([]),
});
export type RoleFormInput = z.infer<typeof roleFormSchema>;

// ===================================================================
// LOYALTY
// ===================================================================

export const adjustCustomerPointsSchema = z.object({
  customerId: CUID,
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "El ajuste no puede ser cero"),
  reason: z.string().trim().min(3).max(500),
});
export type AdjustCustomerPointsInput = z.infer<
  typeof adjustCustomerPointsSchema
>;

export const loyaltySettingsSchema = z.looseObject({
  enabled: z.boolean().optional(),
  pointsPerSol: z.number().min(0).max(10000).optional(),
  minRedemptionPoints: z.number().int().min(0).max(1000000).optional(),
  referralRewardPoints: z.number().int().min(0).max(1000000).optional(),
  welcomePoints: z.number().int().min(0).max(1000000).optional(),
});
export type LoyaltySettingsInput = z.infer<typeof loyaltySettingsSchema>;

export const createRewardSchema = z.object({
  name: NAME,
  description: z.string().max(500).nullable().optional(),
  pointsCost: z.number().int().min(1).max(10000000),
  type: z.enum(["DISCOUNT_PERCENT", "DISCOUNT_FIXED", "FREE_SHIPPING", "PRODUCT"]),
  value: z.number().min(0).max(1000000).nullable().optional(),
  productId: OPTIONAL_CUID,
  active: z.boolean().default(true),
});
export type CreateRewardInput = z.infer<typeof createRewardSchema>;

// ===================================================================
// INVENTORY
// ===================================================================

export const adjustStockSchema = z
  .object({
    productId: OPTIONAL_CUID,
    variantId: OPTIONAL_CUID,
    newStock: z.number().int().min(0).max(10_000_000),
    reason: z.string().trim().min(3).max(500),
  })
  .refine((d) => Boolean(d.productId) || Boolean(d.variantId), {
    message: "Debe proporcionar productId o variantId",
  });
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const createInventoryMovementSchema = z
  .object({
    productId: OPTIONAL_CUID,
    variantId: OPTIONAL_CUID,
    type: z.enum(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "DAMAGE"]),
    quantity: z
      .number()
      .int()
      .refine((n) => n !== 0, "La cantidad no puede ser 0"),
    reason: z.string().trim().max(500).optional(),
    reference: z.string().max(200).optional(),
  })
  .refine((d) => Boolean(d.productId) || Boolean(d.variantId), {
    message: "Debe proporcionar productId o variantId",
  });
export type CreateInventoryMovementInput = z.infer<
  typeof createInventoryMovementSchema
>;

// ===================================================================
// THEMES / PAGES (minimal — only the hot mutation paths)
// ===================================================================

export const createThemeSchema = z.object({
  name: NAME,
  description: z.string().max(500).nullable().optional(),
});
export type CreateThemeInput = z.infer<typeof createThemeSchema>;

export const createPageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug solo puede tener minúsculas, números y guiones"),
  description: z.string().max(500).nullable().optional(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

// ===================================================================
// COMPLAINTS (Libro de Reclamaciones)
// ===================================================================

export const complaintFormFieldSchema = z.object({
  label: z.string().trim().min(1).max(200),
  fieldType: z.string().min(1).max(40),
  section: z.string().max(80).optional(),
  width: z.enum(["full", "half", "third", "quarter"]).optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(200)).max(50).optional(),
  otherLabel: z.string().max(200).optional(),
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(0).max(10000).optional(),
  pattern: z.string().max(500).optional(),
});
export type ComplaintFormFieldInput = z.infer<typeof complaintFormFieldSchema>;

export const updateComplaintFormFieldSchema = complaintFormFieldSchema
  .partial()
  .extend({ active: z.boolean().optional() });
export type UpdateComplaintFormFieldInput = z.infer<
  typeof updateComplaintFormFieldSchema
>;

export const submitComplaintSchema = z.object({
  formData: z.record(z.string(), z.unknown()).refine(
    (d) => Object.keys(d).length > 0,
    { message: "El formulario está vacío" },
  ),
  ipAddress: z.string().max(64).optional(),
  userAgent: z.string().max(500).optional(),
});
export type SubmitComplaintInput = z.infer<typeof submitComplaintSchema>;

// ===================================================================
// PRODUCT REVIEWS (Reseñas de producto)
// ===================================================================

/**
 * Public review submission. The customer can only set rating + text + photos;
 * `verified` / `approved` / `productId` resolution happens server-side.
 */
export const submitReviewSchema = z.object({
  productId: CUID,
  customerName: z.string().trim().min(2, "Nombre requerido").max(120),
  customerEmail: z.email("Email inválido").max(255).trim().toLowerCase(),
  rating: z.number().int().min(1, "Elige una puntuación").max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(2000).optional(),
  images: z.array(z.string().url().max(2048)).max(5).optional(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

/** Admin moderation: flip approval / verified flags on a review. */
export const moderateReviewSchema = z.object({
  id: CUID,
  approved: z.boolean().optional(),
  verified: z.boolean().optional(),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

/** Admin: public store reply to a review (empty string clears it). */
export const replyToReviewSchema = z.object({
  id: CUID,
  reply: z.string().trim().max(2000),
});
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;

// ===================================================================
// MENUS
// ===================================================================

export const menuFormSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug debe contener minúsculas, números y guiones"),
  description: z.string().max(500).nullable().optional(),
});
export type MenuFormInput = z.infer<typeof menuFormSchema>;

export const menuItemInputSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1).max(200),
  link: z.looseObject({
    type: z.string(),
    slug: z.string().nullable().optional(),
    url: z.string().max(2048).nullable().optional(),
    productId: CUID.nullable().optional(),
    categoryId: CUID.nullable().optional(),
    pageId: CUID.nullable().optional(),
    policyId: CUID.nullable().optional(),
  }),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).max(1000),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

// ===================================================================
// SUNAT
// ===================================================================

export const sunatConfigSchema = z.object({
  enabled: z.boolean(),
  emissionMode: z.enum(["auto", "manual", "mixed"]),
  apiKey: z.string().max(500).optional(),
  apiUrl: z
    .url("URL inválida")
    .max(500)
    .refine((u) => u.startsWith("https://"), "Debe ser HTTPS"),
  ruc: z
    .string()
    .regex(/^\d{11}$/, "El RUC debe tener exactamente 11 dígitos"),
  razonSocial: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  boletaSeries: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,4}$/, "Series inválido (máx 4 alfanuméricos)"),
  facturaSeries: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,4}$/, "Series inválido (máx 4 alfanuméricos)"),
  pricesIncludeIgv: z.boolean(),
});
export type SunatConfigInput = z.infer<typeof sunatConfigSchema>;

export const cancelDocumentSchema = z.object({
  documentId: CUID,
  reason: z.string().trim().min(3).max(500),
});
export type CancelDocumentInput = z.infer<typeof cancelDocumentSchema>;
