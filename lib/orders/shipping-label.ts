/**
 * Modelo de datos de la etiqueta de envío (packing label) que el admin imprime
 * y pega en el paquete.
 *
 * OJO: no es una guía de courier. Olva/Shalom/Urbano emiten sus propias guías
 * con su tracking; esto es la etiqueta interna de la tienda (remitente,
 * destinatario, número de pedido y, cuando aplica, el monto a cobrar contra
 * entrega).
 */

import { formatPrice, displayOrderNumber } from "@/lib/utils";

/** Formatos soportados por la hoja de impresión. */
export const LABEL_FORMATS = {
  THERMAL: { id: "thermal", label: "Térmica 10 × 15 cm", css: "100mm 150mm" },
  A4_HALF: { id: "a4-half", label: "A4 (media hoja)", css: "A4" },
} as const;

export type LabelFormatId = (typeof LABEL_FORMATS)[keyof typeof LABEL_FORMATS]["id"];

export function isLabelFormatId(value: unknown): value is LabelFormatId {
  return value === LABEL_FORMATS.THERMAL.id || value === LABEL_FORMATS.A4_HALF.id;
}

export interface ShippingLabelParty {
  name: string;
  phone: string;
  addressLines: string[];
  reference?: string;
  documentId?: string;
}

export interface ShippingLabelItem {
  name: string;
  variantName?: string;
  sku?: string;
  quantity: number;
}

export interface ShippingLabelData {
  orderNumber: string;
  createdAtLabel: string;
  sender: ShippingLabelParty;
  recipient: ShippingLabelParty;
  items: ShippingLabelItem[];
  totalUnits: number;
  courier?: string;
  trackingNumber?: string;
  /** Monto a cobrar al entregar. `null` cuando la orden ya está pagada. */
  amountToCollect: string | null;
  notes?: string;
}

interface ShippingAddressJson {
  address?: string;
  district?: string;
  city?: string;
  department?: string;
  reference?: string;
}

interface OrderForLabel {
  orderSeq: number | null;
  orderNumber: string;
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  customerDni: string | null;
  customerNotes: string | null;
  shippingAddress: unknown;
  paymentMethod: string;
  paymentStatus: string;
  shippingCourier: string | null;
  trackingNumber: string | null;
  total: unknown;
  items: ReadonlyArray<{
    name: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
  }>;
}

interface StoreForLabel {
  name: string;
  phone: string;
  address: string;
}

function parseShippingAddress(value: unknown): ShippingAddressJson {
  if (!value || typeof value !== "object") return {};
  return value as ShippingAddressJson;
}

function compact(values: Array<string | undefined | null>): string[] {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function buildShippingLabelData(
  order: OrderForLabel,
  store: StoreForLabel,
  orderPrefix: string,
  createdAtLabel: string
): ShippingLabelData {
  const address = parseShippingAddress(order.shippingAddress);

  // Contra entrega: el repartidor necesita ver el monto exacto a cobrar.
  const isCashOnDelivery =
    order.paymentMethod === "COD" && order.paymentStatus !== "PAID";

  return {
    orderNumber: displayOrderNumber(order, orderPrefix),
    createdAtLabel,
    sender: {
      name: store.name,
      phone: store.phone,
      addressLines: compact([store.address]),
    },
    recipient: {
      name: order.customerName,
      phone: order.customerPhone,
      documentId: order.customerDni ?? undefined,
      addressLines: compact([
        address.address,
        compact([address.district, address.city]).join(", "),
        address.department,
      ]),
      reference: address.reference?.trim() || undefined,
    },
    items: order.items.map((item) => ({
      name: item.name,
      variantName: item.variantName ?? undefined,
      sku: item.sku ?? undefined,
      quantity: item.quantity,
    })),
    totalUnits: order.items.reduce((sum, item) => sum + item.quantity, 0),
    courier: order.shippingCourier?.trim() || undefined,
    trackingNumber: order.trackingNumber?.trim() || undefined,
    amountToCollect: isCashOnDelivery ? formatPrice(Number(order.total)) : null,
    notes: order.customerNotes?.trim() || undefined,
  };
}
