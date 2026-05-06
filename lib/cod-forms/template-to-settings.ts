// lib/cod-forms/template-to-settings.ts
//
// V1 shim: convert the new CodFormTemplateData (block-based, 15 typed blocks)
// into the legacy CodFormSettings shape (8 fixed field IDs) that the existing
// CodOrderModal renders. This keeps the original modal UX intact (notably the
// LocationSelector for FIELD_PROVINCE / FIELD_CITY) while letting us drive the
// data from reusable templates.
//
// In V2, replace this shim by switching the modal to CodFormBlockRenderer.
import type {
  CodFormTemplateData,
  FieldContent,
  HeaderContent,
} from "./types"
import type { CodFormSettings, CodFormField } from "@/lib/types/cod-form"

// Map from new block types to legacy field IDs. FIELD_PROVINCE and
// FIELD_CITY both collapse onto the legacy "location" combo selector.
const BLOCK_TO_LEGACY_ID: Record<string, CodFormField["id"] | null> = {
  FIELD_NAME: "name",
  FIELD_PHONE: "phone",
  FIELD_EMAIL: "email",
  FIELD_DNI: "dni",
  FIELD_ADDRESS: "address",
  FIELD_ADDRESS_2: null, // legacy modal has no equivalent; skip
  FIELD_PROVINCE: "location",
  FIELD_CITY: "location",
  FIELD_REFERENCE: "reference",
  FIELD_NOTES: "notes",
}

const DEFAULT_LEGACY_LABEL: Record<CodFormField["id"], string> = {
  name: "Nombre completo",
  phone: "Teléfono / WhatsApp",
  email: "Correo electrónico",
  dni: "DNI",
  location: "Departamento / Provincia / Distrito",
  address: "Dirección de entrega",
  reference: "Referencia",
  notes: "Notas adicionales",
}

export function templateToLegacySettings(
  template: CodFormTemplateData,
): CodFormSettings {
  const headerBlock = template.blocks.find((b) => b.type === "HEADER")
  const formTitle = headerBlock
    ? ((headerBlock.content as HeaderContent).text ?? "Completa tu pedido")
    : "Completa tu pedido"

  // Build the legacy fields[] array, preserving template block ordering
  // and skipping duplicates (FIELD_PROVINCE + FIELD_CITY collapse to one
  // "location" entry — keep the first appearance).
  const seenIds = new Set<CodFormField["id"]>()
  const fields: CodFormField[] = []
  for (const b of template.blocks) {
    const legacyId = BLOCK_TO_LEGACY_ID[b.type]
    if (!legacyId) continue
    if (seenIds.has(legacyId)) {
      // For FIELD_CITY arriving after FIELD_PROVINCE, keep the existing
      // "location" entry — but if either child is required, mark required.
      const existing = fields.find((f) => f.id === legacyId)
      if (existing && b.required) existing.required = true
      if (existing && !b.visible) existing.visible = false
      continue
    }
    seenIds.add(legacyId)
    const c = b.content as FieldContent | undefined
    fields.push({
      id: legacyId,
      label: c?.label || DEFAULT_LEGACY_LABEL[legacyId],
      required: b.required,
      visible: b.visible,
    })
  }

  // Ensure all 8 legacy ids exist (so the modal does not break) — append
  // any missing ones as hidden, optional, with default labels.
  for (const id of Object.keys(DEFAULT_LEGACY_LABEL) as CodFormField["id"][]) {
    if (!seenIds.has(id)) {
      fields.push({
        id,
        label: DEFAULT_LEGACY_LABEL[id],
        required: false,
        visible: false,
      })
    }
  }

  return {
    formTitle,
    formSubtitle: undefined,
    buttonText: template.buttonText,
    paymentBadge: undefined,
    thankYouTitle: template.thankYouTitle ?? "¡Gracias por tu pedido!",
    thankYouMessage:
      template.thankYouMessage ??
      "Nos comunicaremos contigo en breve para coordinar la entrega.",
    whatsappEnabled: template.postSubmitAction === "WHATSAPP_REDIRECT",
    whatsappNumber: template.whatsappNumber ?? "",
    whatsappMessage: template.whatsappMessage ?? "",
    fields,
    // shippingRestriction now lives on Product, NOT on the template.
    // The page component is responsible for attaching Product.shippingRestriction
    // before passing settings to <CodOrderModal>.
    shippingRestriction: undefined,
  }
}

// Convenience helper: build the full settings object the modal expects,
// merging the per-product shippingRestriction.
export function buildModalSettings(
  template: CodFormTemplateData,
  shippingRestriction: CodFormSettings["shippingRestriction"] | null,
): CodFormSettings {
  const settings = templateToLegacySettings(template)
  if (shippingRestriction) settings.shippingRestriction = shippingRestriction
  return settings
}
