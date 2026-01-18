"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

// ============================================================
// SUBIR COMPROBANTE DE PAGO (Cliente)
// ============================================================

export async function uploadPaymentProof(formData: FormData) {
  try {
    const orderId = formData.get("orderId") as string;
    const reference = formData.get("reference") as string;
    const proofFile = formData.get("proofImage") as File;

    if (!orderId || !reference || !proofFile) {
      return {
        success: false,
        error: "Faltan datos requeridos",
      };
    }

    // Verificar que la orden existe y tiene pago pendiente
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { pendingPayment: true },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    if (!order.pendingPayment) {
      return {
        success: false,
        error: "Esta orden no tiene pago pendiente",
      };
    }

    // Subir imagen a Vercel Blob
    const blob = await put(`payments/${orderId}-${Date.now()}.jpg`, proofFile, {
      access: "public",
    });

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

    console.log("Comprobante subido exitosamente:", {
      orderId,
      reference,
      imageUrl: blob.url,
    });

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

    console.log("Pago aprobado:", {
      paymentId,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
    });

    // TODO: Enviar email de confirmación al cliente

    revalidatePath("/admin/pagos-pendientes");
    revalidatePath("/admin/ordenes");

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