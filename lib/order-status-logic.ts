// ============================================================
// LÓGICA DE ESTADOS Y TRANSICIONES PERMITIDAS
// ============================================================

export type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "VERIFYING";
export type FulfillmentStatus = "UNFULFILLED" | "PARTIAL" | "FULFILLED";

// ============================================================
// TRANSICIONES PERMITIDAS
// ============================================================

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID"],
  PAID: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
};

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["VERIFYING", "PAID"],
  VERIFYING: ["PAID", "FAILED"],
  PAID: [], // No se puede cambiar directamente (solo con botón de reembolso)
  FAILED: ["PENDING"], // Permitir reintentar
  REFUNDED: [], // Terminal
};

export const FULFILLMENT_STATUS_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  UNFULFILLED: ["PARTIAL", "FULFILLED"],
  PARTIAL: ["FULFILLED"],
  FULFILLED: [], // Terminal
};

// ============================================================
// LABELS PARA UI
// ============================================================

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  PROCESSING: "Procesando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  VERIFYING: "Verificando",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Sin procesar",
  PARTIAL: "Parcialmente procesado",
  FULFILLED: "Completamente procesado",
};

// ============================================================
// VALIDACIONES
// ============================================================

export function canCancelOrder(orderStatus: OrderStatus): boolean {
  // Solo se puede cancelar antes de enviar
  return ["PENDING", "PAID", "PROCESSING"].includes(orderStatus);
}

export function canRefundPayment(paymentStatus: PaymentStatus): boolean {
  // Solo se puede reembolsar si está pagado
  return paymentStatus === "PAID";
}

export function canMarkPaymentAsFailed(paymentStatus: PaymentStatus): boolean {
  // Se puede marcar como fallido desde PENDING o VERIFYING
  return ["PENDING", "VERIFYING"].includes(paymentStatus);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ["DELIVERED", "CANCELLED", "REFUNDED"].includes(status);
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return ["REFUNDED"].includes(status);
}

export function isTerminalFulfillmentStatus(status: FulfillmentStatus): boolean {
  return status === "FULFILLED";
}

// ============================================================
// VALIDACIÓN DE COHERENCIA ENTRE ESTADOS
// ============================================================

export function validateStatusCoherence(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus
): { valid: boolean; error?: string } {
  // No se puede entregar sin pagar
  if (orderStatus === "DELIVERED" && paymentStatus !== "PAID") {
    return {
      valid: false,
      error: "No se puede marcar como entregado sin confirmar el pago",
    };
  }

  // No se puede enviar sin pagar
  if (orderStatus === "SHIPPED" && paymentStatus !== "PAID") {
    return {
      valid: false,
      error: "No se puede marcar como enviado sin confirmar el pago",
    };
  }

  return { valid: true };
}