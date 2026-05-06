// lib/cod-forms/schema.ts
import { z } from "zod"

export const buttonStyleSchema = z.object({
  textColor: z.string(),
  fontSize: z.number().int().min(8).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  bgColor: z.string(),
  borderColor: z.string(),
  borderWidth: z.number().int().min(0).max(20),
  borderRadius: z.number().int().min(0).max(100),
  shadow: z.number().int().min(0).max(10),
  animation: z.enum(["none", "pulse", "shake", "bounce"]),
  icon: z.string().nullable(),
  subtitle: z.string().nullable(),
})

const headerContentSchema = z.object({
  text: z.string(),
  align: z.enum(["left", "center", "right"]),
  fontSize: z.number().int().min(8).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  color: z.string(),
})

const fieldContentSchema = z.object({
  label: z.string(),
  placeholder: z.string(),
  errorMessage: z.string(),
  hideLabel: z.boolean(),
})

const cartItemsContentSchema = z.object({
  showThumbnail: z.boolean(),
  showVariant: z.boolean(),
  showQuantitySelector: z.boolean(),
})

const shippingOptionsContentSchema = z.object({
  showFreeShipping: z.boolean(),
})

const orderSummaryContentSchema = z.object({
  showSubtotal: z.boolean(),
  showDiscount: z.boolean(),
  showShipping: z.boolean(),
  showTotal: z.boolean(),
})

export const blockTypeSchema = z.enum([
  "HEADER",
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
  "FIELD_NAME",
  "FIELD_PHONE",
  "FIELD_EMAIL",
  "FIELD_DNI",
  "FIELD_ADDRESS",
  "FIELD_ADDRESS_2",
  "FIELD_PROVINCE",
  "FIELD_CITY",
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

// Note: The discriminated union below is exported for completeness but the
// main `blockSchema` (used by templateUpdateSchema) accepts a more permissive
// `Record<string, unknown>` for content because the editor sends partial
// content during in-progress edits. Strict per-type content validation
// happens at render/serialize time.
export const blockContentByType = z.discriminatedUnion("type", [
  z.object({ type: z.literal("HEADER"), content: headerContentSchema }),
  z.object({ type: z.literal("CART_ITEMS"), content: cartItemsContentSchema }),
  z.object({ type: z.literal("SHIPPING_OPTIONS"), content: shippingOptionsContentSchema }),
  z.object({ type: z.literal("ORDER_SUMMARY"), content: orderSummaryContentSchema }),
  z.object({ type: z.literal("SUBMIT_BUTTON"), content: z.object({}) }),
  z.object({ type: z.literal("FIELD_NAME"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_PHONE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_EMAIL"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_DNI"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_ADDRESS"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_ADDRESS_2"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_PROVINCE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_CITY"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_REFERENCE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_NOTES"), content: fieldContentSchema }),
])

export const blockSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().min(0),
  type: blockTypeSchema,
  content: z.record(z.string(), z.unknown()),
  visible: z.boolean(),
  required: z.boolean(),
})

export const postSubmitActionSchema = z.enum([
  "INLINE_THANK_YOU",
  "WHATSAPP_REDIRECT",
  "THANK_YOU_PAGE",
])

export const templateUpdateSchema = z.object({
  name: z.string().min(1).max(80),
  buttonText: z.string().min(1).max(120),
  buttonStyle: buttonStyleSchema,
  postSubmitAction: postSubmitActionSchema,
  thankYouTitle: z.string().nullable(),
  thankYouMessage: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  whatsappMessage: z.string().nullable(),
  thankYouPageId: z.string().nullable(),
  blocks: z.array(blockSchema),
}).superRefine((tpl, ctx) => {
  if (tpl.postSubmitAction === "WHATSAPP_REDIRECT" && !tpl.whatsappNumber) {
    ctx.addIssue({
      code: "custom",
      path: ["whatsappNumber"],
      message: "Número de WhatsApp obligatorio cuando la acción es WHATSAPP_REDIRECT",
    })
  }
  if (tpl.postSubmitAction === "THANK_YOU_PAGE" && !tpl.thankYouPageId) {
    ctx.addIssue({
      code: "custom",
      path: ["thankYouPageId"],
      message: "Página de agradecimiento obligatoria cuando la acción es THANK_YOU_PAGE",
    })
  }
  const submitButtons = tpl.blocks.filter((b) => b.type === "SUBMIT_BUTTON")
  if (submitButtons.length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["blocks"],
      message: `La plantilla debe tener exactamente un SUBMIT_BUTTON (encontrados: ${submitButtons.length})`,
    })
  }
})

export const shippingRestrictionSchema = z.object({
  enabled: z.boolean(),
  allowedDepartmentIds: z.array(z.string()),
  allowedProvinceIds: z.array(z.string()),
  allowedDistrictCodes: z.array(z.string()),
  restrictionMessage: z.string().nullable(),
})

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>
