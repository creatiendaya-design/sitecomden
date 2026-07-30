"use server";

import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { protectRoute } from "@/lib/protect-route";
import { checkRateLimit, uploadRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  approvePendingPayment,
  rejectPendingPayment,
} from "@/lib/payments/verify-pending-payment";
import { NON_PAYABLE_ORDER_STATUS } from "@/lib/payments/order-payable";

const log = logger.child({ module: "pending-payments" });

// Magic-byte signatures for the image formats we accept. The server must
// validate this itself — never trust the client's file.type or the form's
// client-side checks.
const IMAGE_SIGNATURES: number[][] = [
  [0xff, 0xd8, 0xff], // JPEG
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
];

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Señal interna para revertir la transacción del comprobante cuando el estado
 * del pago o del pedido cambió mientras subíamos la imagen. No es un error de
 * sistema: se traduce en un mensaje al cliente, no en un 500.
 */
class ProofStateChangedError extends Error {
  constructor() {
    super("Pending payment or order state changed during proof upload");
    this.name = "ProofStateChangedError";
  }
}

// ============================================================
// SUBIR COMPROBANTE DE PAGO (Cliente)
// ============================================================

export async function uploadPaymentProof(formData: FormData) {
  try {
    const orderId = formData.get("orderId") as string;
    const viewToken = formData.get("viewToken") as string;
    const reference = formData.get("reference") as string;
    const proofFile = formData.get("proofImage") as File;

    if (!orderId || !viewToken || !reference || !proofFile) {
      return {
        success: false,
        error: "Faltan datos requeridos",
      };
    }

    // Rate limiting por IP: previene spam de comprobantes.
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
    const rl = await checkRateLimit(uploadRateLimiter, `proof:${ip}`, {
      action: "uploadPaymentProof",
    });
    if (!rl.success) {
      return {
        success: false,
        error: "Demasiados intentos. Espera unos minutos e intenta nuevamente.",
      };
    }

    // AUTORIZACIÓN: la orden debe coincidir con su viewToken. Sin esto,
    // cualquiera con un orderId podía subir un comprobante falso a una orden
    // ajena (el token solo se conoce vía el link enviado por email al cliente).
    const order = await prisma.order.findFirst({
      where: { id: orderId, viewToken },
      include: { pendingPayment: true },
    });

    if (!order) {
      return {
        success: false,
        error: "No autorizado o orden no encontrada",
      };
    }

    const pendingPayment = order.pendingPayment;
    if (!pendingPayment) {
      return {
        success: false,
        error: "Esta orden no tiene pago pendiente",
      };
    }

    // ESTADO: un comprobante sólo puede subirse mientras el pago sigue esperando
    // verificación.
    //
    // Antes esta acción no miraba el estado y reescribía `status: "pending"` +
    // `paymentStatus: "VERIFYING"` incondicionalmente. Eso permitía al cliente
    // RESUCITAR un pago ya resuelto: subir otra imagen sobre un pago verificado
    // devolvía el `PendingPayment` a `pending`, y la siguiente aprobación del
    // admin volvía a marcar la orden PAGADA y volvía a descontar el inventario,
    // generando un segundo movimiento `SALE` por las mismas unidades. El claim
    // atómico de `approvePendingPayment` impide dos aprobaciones del MISMO
    // estado, pero no que alguien recree ese estado desde fuera.
    //
    // Tras un rechazo la orden queda CANCELADA: reabrirla no es subir un
    // comprobante, así que se dirige al cliente a la tienda.
    if (pendingPayment.status !== "pending") {
      const alreadyVerified = pendingPayment.status === "verified";
      return {
        success: false,
        error: alreadyVerified
          ? "El pago de este pedido ya fue verificado. No necesitas subir otro comprobante."
          : "El comprobante de este pedido ya fue revisado y rechazado. Escríbenos para resolverlo.",
      };
    }

    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return {
        success: false,
        error: "Este pedido está cerrado y no admite comprobantes. Escríbenos si necesitas ayuda.",
      };
    }

    if (order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") {
      return {
        success: false,
        error: "El pago de este pedido ya está resuelto. No necesitas subir un comprobante.",
      };
    }

    // Validación del archivo EN EL SERVIDOR (tamaño + tipo + magic bytes).
    if (proofFile.size > MAX_PROOF_BYTES) {
      return { success: false, error: "La imagen debe ser menor a 5MB" };
    }
    if (!proofFile.type.startsWith("image/")) {
      return { success: false, error: "El archivo debe ser una imagen" };
    }
    const bytes = new Uint8Array(await proofFile.arrayBuffer());
    const isValidImage = IMAGE_SIGNATURES.some((sig) =>
      sig.every((b, i) => bytes[i] === b)
    );
    if (!isValidImage) {
      return { success: false, error: "El archivo no es una imagen válida" };
    }

    // Subir imagen a Vercel Blob usando los bytes ya validados.
    const blob = await put(
      `payments/${orderId}-${Date.now()}.jpg`,
      new Blob([bytes], { type: proofFile.type }),
      { access: "public" }
    );

    // Las comprobaciones de estado de arriba son leer-luego-escribir: un admin
    // puede aprobar o rechazar el pago en la ventana que abre la subida del
    // archivo a Blob (cientos de ms). Por eso ambas escrituras van en UNA
    // transacción y condicionadas.
    //
    // Nótese que ya NO se escribe `status: "pending"`: el WHERE garantiza que ya
    // lo era, y escribirlo era precisamente lo que permitía revivir un pago
    // resuelto. Tampoco se fuerza `VERIFYING` sobre una orden que dejó de
    // admitirlo.
    let applied = true;
    try {
      await prisma.$transaction(async (tx) => {
        const claim = await tx.pendingPayment.updateMany({
          where: { id: pendingPayment.id, status: "pending" },
          data: { reference, proofImage: blob.url },
        });
        if (claim.count === 0) throw new ProofStateChangedError();

        const orderClaim = await tx.order.updateMany({
          where: {
            id: orderId,
            status: { notIn: [...NON_PAYABLE_ORDER_STATUS] },
            paymentStatus: { in: ["PENDING", "VERIFYING"] },
          },
          data: { paymentStatus: "VERIFYING" },
        });

        // Lanzar, no `return`: Prisma sólo revierte una transacción interactiva
        // ante una excepción. Sin esto el comprobante quedaría guardado sobre un
        // pedido que ya no lo admite, confundiendo al admin que lo revisa.
        if (orderClaim.count === 0) throw new ProofStateChangedError();
      });
    } catch (txError) {
      if (!(txError instanceof ProofStateChangedError)) throw txError;
      applied = false;
    }

    if (!applied) {
      log.warn(
        { orderId },
        "Proof upload rejected: payment or order state changed while uploading",
      );
      return {
        success: false,
        error:
          "El estado de tu pedido cambió mientras subíamos el comprobante. Revisa tu pedido o escríbenos.",
      };
    }

    // No registrar la referencia bancaria del cliente (dato financiero) en logs.
    log.info({ orderId }, "Comprobante de pago subido");

    return {
      success: true,
      message: "Comprobante subido correctamente. Lo verificaremos pronto.",
    };
  } catch (error) {
    console.error("Error uploading payment proof:", error);
    return {
      success: false,
      error: "Error al subir el comprobante. Intenta nuevamente.",
    };
  }
}

// ============================================================
// LISTAR PAGOS PENDIENTES (Admin)
// ============================================================

export async function getPendingPayments() {
  try {
    // Solo admins con permiso de ver órdenes. Expone PII (nombre/email/teléfono)
    // y montos de todos los pagos pendientes, así que debe ir protegido.
    await protectRoute("orders:view");

    const pendingPayments = await prisma.pendingPayment.findMany({
      where: {
        status: "pending",
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convertir Decimales a números
    const paymentsData = pendingPayments.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      order: {
        ...payment.order,
        total: Number(payment.order.total),
      },
    }));

    return {
      success: true,
      data: paymentsData,
    };
  } catch (error) {
    console.error("Error getting pending payments:", error);
    return {
      success: false,
      error: "Error al obtener pagos pendientes",
    };
  }
}

// ============================================================
// APROBAR / RECHAZAR PAGO (Admin)
// ============================================================
//
// Ambas delegan en lib/payments/verify-pending-payment.ts. Antes tenían su
// propia implementación, divergida de la de /api/admin/payments/*: marcaban la
// orden PAID con `update` sueltos y sin descontar inventario, y ésta es la ruta
// que usa realmente la UI del admin.

export async function approvePayment(paymentId: string) {
  const userId = await protectRoute("orders:update_status");

  const result = await approvePendingPayment(paymentId, { id: userId });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: result.alreadyProcessed
      ? "Este pago ya había sido procesado"
      : "Pago aprobado correctamente",
  };
}

export async function rejectPayment(paymentId: string, reason: string) {
  const userId = await protectRoute("orders:update_status");

  const result = await rejectPendingPayment(paymentId, reason, { id: userId });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    message: result.alreadyProcessed
      ? "Este pago ya había sido procesado"
      : "Pago rechazado",
  };
}
