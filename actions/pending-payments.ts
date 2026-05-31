"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { autoEmitOnPayment } from "@/actions/sunat";
import { protectRoute } from "@/lib/protect-route";
import { checkRateLimit, uploadRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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

    if (!order.pendingPayment) {
      return {
        success: false,
        error: "Esta orden no tiene pago pendiente",
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

    // Actualizar PendingPayment con referencia e imagen
    await prisma.pendingPayment.update({
      where: { id: order.pendingPayment.id },
      data: {
        reference,
        proofImage: blob.url,
        status: "pending", // Asegurar que está en pending para revisión
      },
    });

    // Actualizar estado de pago de orden a VERIFYING
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "VERIFYING",
      },
    });

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
// APROBAR PAGO (Admin)
// ============================================================

export async function approvePayment(paymentId: string) {
  try {
    await protectRoute("orders:update_status");
    // Obtener pago pendiente con orden
    const payment = await prisma.pendingPayment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return {
        success: false,
        error: "Pago no encontrado",
      };
    }

    // Actualizar PendingPayment a verified
    await prisma.pendingPayment.update({
      where: { id: paymentId },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        // TODO: Agregar verifiedBy: userId cuando tengas auth
      },
    });

    // Actualizar estado de orden
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paidAt: new Date(),
      },
    });

    try {
      await autoEmitOnPayment(payment.orderId);
    } catch (emitError) {
      console.error("SUNAT auto-emission failed (payment still approved):", emitError);
    }

    console.log("Pago aprobado:", {
      paymentId,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
    });

    // TODO: Enviar email de confirmación al cliente

    revalidatePath("/admin/pagos-pendientes");
    revalidatePath("/admin/ordenes");
    revalidatePath(`/admin/ordenes/${payment.orderId}`);

    return {
      success: true,
      message: "Pago aprobado correctamente",
    };
  } catch (error) {
    console.error("Error approving payment:", error);
    return {
      success: false,
      error: "Error al aprobar el pago",
    };
  }
}

// ============================================================
// RECHAZAR PAGO (Admin)
// ============================================================

export async function rejectPayment(paymentId: string, reason: string) {
  try {
    await protectRoute("orders:update_status");
    // Obtener pago pendiente con orden
    const payment = await prisma.pendingPayment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return {
        success: false,
        error: "Pago no encontrado",
      };
    }

    // Actualizar PendingPayment a rejected
    await prisma.pendingPayment.update({
      where: { id: paymentId },
      data: {
        status: "rejected",
        rejectionReason: reason,
      },
    });

    // Actualizar estado de pago de orden a FAILED
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "FAILED",
      },
    });

    console.log("Pago rechazado:", {
      paymentId,
      orderId: payment.orderId,
      reason,
    });

    // TODO: Enviar email al cliente notificando el rechazo

    revalidatePath("/admin/pagos-pendientes");
    revalidatePath("/admin/ordenes");
    revalidatePath(`/admin/ordenes/${payment.orderId}`);

    return {
      success: true,
      message: "Pago rechazado",
    };
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return {
      success: false,
      error: "Error al rechazar el pago",
    };
  }
}