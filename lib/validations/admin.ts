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
