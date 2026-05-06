// lib/cod-forms/defaults.ts
import type {
  ButtonStyle,
  CodFormBlockType,
  HeaderContent,
  FieldContent,
  CartItemsContent,
  ShippingOptionsContent,
  OrderSummaryContent,
  SubmitButtonContent,
} from "./types"

export const DEFAULT_BUTTON_STYLE: ButtonStyle = {
  textColor: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
  fontStyle: "normal",
  bgColor: "#000000",
  borderColor: "#000000",
  borderWidth: 0,
  borderRadius: 8,
  shadow: 0,
  animation: "none",
  icon: null,
  subtitle: null,
}

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  text: "Favor ingresar tus datos para realizar el pedido",
  align: "left",
  fontSize: 18,
  fontWeight: "bold",
  fontStyle: "normal",
  color: "#000000",
}

export const DEFAULT_CART_ITEMS_CONTENT: CartItemsContent = {
  showThumbnail: true,
  showVariant: true,
  showQuantitySelector: true,
}

export const DEFAULT_SHIPPING_OPTIONS_CONTENT: ShippingOptionsContent = {
  showFreeShipping: true,
}

export const DEFAULT_ORDER_SUMMARY_CONTENT: OrderSummaryContent = {
  showSubtotal: true,
  showDiscount: true,
  showShipping: true,
  showTotal: true,
}

export const DEFAULT_SUBMIT_BUTTON_CONTENT: SubmitButtonContent = {}

const FIELD_DEFAULTS: Record<string, FieldContent> = {
  FIELD_NAME: {
    label: "Nombre completo",
    placeholder: "Ej: Juan Pérez",
    errorMessage: "Ingresa tu nombre",
    hideLabel: false,
  },
  FIELD_PHONE: {
    label: "Celular con WhatsApp",
    placeholder: "Ej: 999 999 999",
    errorMessage: "Ingresa tu número",
    hideLabel: false,
  },
  FIELD_EMAIL: {
    label: "Correo electrónico",
    placeholder: "tu@correo.com",
    errorMessage: "Ingresa un correo válido",
    hideLabel: false,
  },
  FIELD_DNI: {
    label: "DNI",
    placeholder: "Ej: 12345678",
    errorMessage: "Ingresa tu DNI",
    hideLabel: false,
  },
  FIELD_ADDRESS: {
    label: "Dirección de entrega",
    placeholder: "Av. Arequipa 123, Dpto 402",
    errorMessage: "Ingresa la dirección",
    hideLabel: false,
  },
  FIELD_ADDRESS_2: {
    label: "Dirección 2",
    placeholder: "Departamento, oficina, etc.",
    errorMessage: "",
    hideLabel: false,
  },
  FIELD_PROVINCE: {
    label: "Provincia",
    placeholder: "Selecciona tu provincia",
    errorMessage: "Selecciona una provincia",
    hideLabel: false,
  },
  FIELD_CITY: {
    label: "Distrito",
    placeholder: "Selecciona tu distrito",
    errorMessage: "Selecciona un distrito",
    hideLabel: false,
  },
  FIELD_REFERENCE: {
    label: "Referencias de la dirección",
    placeholder: "Entre las calles X e Y, frente a...",
    errorMessage: "",
    hideLabel: false,
  },
  FIELD_NOTES: {
    label: "Notas adicionales",
    placeholder: "Comentarios para la entrega",
    errorMessage: "",
    hideLabel: false,
  },
}

export function getDefaultContentForType(
  type: CodFormBlockType,
): Record<string, unknown> {
  if (type === "HEADER") return { ...DEFAULT_HEADER_CONTENT }
  if (type === "CART_ITEMS") return { ...DEFAULT_CART_ITEMS_CONTENT }
  if (type === "SHIPPING_OPTIONS") return { ...DEFAULT_SHIPPING_OPTIONS_CONTENT }
  if (type === "ORDER_SUMMARY") return { ...DEFAULT_ORDER_SUMMARY_CONTENT }
  if (type === "SUBMIT_BUTTON") return { ...DEFAULT_SUBMIT_BUTTON_CONTENT }
  return { ...FIELD_DEFAULTS[type] }
}

export const DEFAULT_TEMPLATE_NAME = "Default"

// Order matters — this is what `seed-cod-form-default.ts` inserts into
// CodFormBlock when creating the Default template.
export const DEFAULT_TEMPLATE_BLOCKS: Array<{
  type: CodFormBlockType
  visible: boolean
  required: boolean
}> = [
  { type: "HEADER", visible: true, required: false },
  { type: "CART_ITEMS", visible: true, required: false },
  { type: "SHIPPING_OPTIONS", visible: true, required: false },
  { type: "ORDER_SUMMARY", visible: true, required: false },
  { type: "FIELD_NAME", visible: true, required: true },
  { type: "FIELD_PHONE", visible: true, required: true },
  { type: "FIELD_ADDRESS", visible: true, required: true },
  { type: "FIELD_REFERENCE", visible: true, required: false },
  { type: "SUBMIT_BUTTON", visible: true, required: false },
]
