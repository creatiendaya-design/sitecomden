import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderShippedEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { orderId, trackingNumber, shippingCourier, estimatedDelivery } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID requerido" },
        { status: 400 }
      );
    }

    // Obtener orden
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        viewToken: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el pago esté confirmado
    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "El pago debe estar confirmado antes de enviar" },
        { status: 400 }
      );
    }

    // Actualizar orden
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        fulfillmentStatus: "FULFILLED",
        trackingNumber: trackingNumber || null,
        shippingCourier: shippingCourier || null,
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery)
          : null,
        shippedAt: new Date(),
      },
    });

    // Generar link de visualización
    const viewOrderLink = order.viewToken
      ? `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/orden/verificar?token=${order.viewToken}&email=${order.customerEmail}`
      : '';

    // Enviar email de envío
    try {
      await sendOrderShippedEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        trackingNumber: trackingNumber || '',
        shippingCourier: shippingCourier || '',
        estimatedDelivery: estimatedDelivery || '',
        viewOrderLink: viewOrderLink,
      });
    } catch (emailError) {
      console.error("Error sending shipped email:", emailError);
      // No fallar la actualización si el email falla
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al marcar como enviada:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}