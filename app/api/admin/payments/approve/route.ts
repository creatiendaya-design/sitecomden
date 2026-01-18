import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { paymentId, orderId } = await request.json();

    if (!paymentId || !orderId) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    // Actualizar pago pendiente
    await prisma.pendingPayment.update({
      where: { id: paymentId },
      data: {
        status: "verified",
        verifiedAt: new Date(),
      },
    });

    // Actualizar orden
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al aprobar pago:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}