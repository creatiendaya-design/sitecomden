/**
 * Construye el input de la preferencia de MercadoPago a partir de una orden.
 *
 * Vive aparte porque lo usan dos entradas distintas (el Server Action
 * `startGatewayCheckout` y la página puente `/orden/[id]/pago-mercadopago`) y
 * antes cada una armaba el objeto a mano — lo que hizo que ambas olvidaran
 * enviar teléfono, DNI y dirección del comprador.
 */

import type { Order } from "@prisma/client";
import type { CreatePreferenceInput } from "./client";

/** Forma de `Order.shippingAddress` tal como la escribe `createOrder`. */
interface StoredAddress {
  address?: unknown;
  district?: unknown;
  city?: unknown;
  department?: unknown;
  reference?: unknown;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Extrae calle y distrito del JSON de dirección. Es una columna `Json`, así que
 * se valida en vez de castear a ciegas.
 */
function parseAddress(raw: unknown): { address: string | null; district: string | null } {
  if (typeof raw !== "object" || raw === null) {
    return { address: null, district: null };
  }
  const addr = raw as StoredAddress;
  return {
    address: readString(addr.address),
    district: readString(addr.district),
  };
}

export function buildPreferenceInput(
  order: Order,
  orderDisplayNumber: string,
  baseUrl: string
): CreatePreferenceInput {
  const { address, district } = parseAddress(order.shippingAddress);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDisplayNumber,
    total: Number(order.total),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    viewToken: order.viewToken,
    baseUrl,
    customerPhone: order.customerPhone,
    customerDni: order.customerDni,
    customerAddress: address,
    customerDistrict: district,
  };
}
